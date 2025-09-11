const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { upload, processImages } = require('../middleware/upload');

// Register new employee
router.post('/register', 
  authenticateToken,
  requireRole('admin', 'supervisor'),
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'licensePhoto', maxCount: 1 },
    { name: 'ownershipDocument', maxCount: 5 }
  ]),
  processImages,
  async (req, res) => {
    try {
      const { personalData, vehicleData, licenseData } = req.body;
      
      // Parse JSON strings
      const personal = JSON.parse(personalData);
      const vehicles = JSON.parse(vehicleData);
      const license = JSON.parse(licenseData);
      
      // Handle file uploads
      const files = req.files || {};
      
      // Check if employee already exists
      const existingEmployee = await Employee.findByDocument(personal.documentNumber);
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: 'Employee with this document already exists'
        });
      }
      
      // Check for duplicate license plates
      for (const vehicle of vehicles.vehicles) {
        const existingVehicle = await Employee.findByPlate(vehicle.licensePlate);
        if (existingVehicle) {
          return res.status(400).json({
            success: false,
            message: `License plate ${vehicle.licensePlate} is already registered`
          });
        }
      }
      
      // Create employee object
      const employeeData = {
        ...personal,
        vehicles: vehicles.vehicles.map(vehicle => ({
          ...vehicle,
          ownershipDocument: files.ownershipDocument?.[0]?.path
        })),
        license: {
          ...license,
          licensePhoto: files.licensePhoto?.[0]?.path
        },
        photo: files.photo?.[0]?.path,
        registeredBy: req.user._id
      };
      
      const employee = new Employee(employeeData);
      await employee.save();
      
      res.status(201).json({
        success: true,
        message: 'Employee registered successfully',
        data: {
          id: employee._id,
          fullName: employee.fullName,
          documentNumber: employee.documentNumber,
          vehicles: employee.vehicles.map(v => v.licensePlate)
        }
      });
      
    } catch (error) {
      console.error('Employee registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }
);

// Get all employees
router.get('/',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search, area, status } = req.query;
      
      let query = {};
      
      if (search) {
        query.$text = { $search: search };
      }
      
      if (area) {
        query.workArea = new RegExp(area, 'i');
      }
      
      if (status !== undefined) {
        query.isActive = status === 'active';
      }
      
      const employees = await Employee.find(query)
        .select('-password')
        .populate('registeredBy', 'fullName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
        
      const total = await Employee.countDocuments(query);
      
      res.json({
        success: true,
        data: employees,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employees',
        error: error.message
      });
    }
  }
);

// Get employee by ID
router.get('/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id)
        .select('-password')
        .populate('registeredBy', 'fullName position');
        
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.json({
        success: true,
        data: employee
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee',
        error: error.message
      });
    }
  }
);

// Update employee
router.put('/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'licensePhoto', maxCount: 1 },
    { name: 'ownershipDocument', maxCount: 5 }
  ]),
  processImages,
  async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      const updates = JSON.parse(req.body.updates || '{}');
      const files = req.files || {};
      
      // Update file paths if new files uploaded
      if (files.photo) {
        updates.photo = files.photo[0].path;
      }
      
      if (files.licensePhoto) {
        updates['license.licensePhoto'] = files.licensePhoto[0].path;
      }
      
      const updatedEmployee = await Employee.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');
      
      res.json({
        success: true,
        message: 'Employee updated successfully',
        data: updatedEmployee
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update employee',
        error: error.message
      });
    }
  }
);

// Deactivate employee
router.patch('/:id/deactivate',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  async (req, res) => {
    try {
      const employee = await Employee.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      ).select('-password');
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Employee deactivated successfully',
        data: employee
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate employee',
        error: error.message
      });
    }
  }
);

// Search employee by plate
router.get('/search/plate/:plate',
  authenticateToken,
  async (req, res) => {
    try {
      const employee = await Employee.findByPlate(req.params.plate);
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'No employee found with this license plate'
        });
      }
      
      const vehicle = employee.getVehicleByPlate(req.params.plate);
      
      res.json({
        success: true,
        data: {
          employee: {
            id: employee._id,
            fullName: employee.fullName,
            position: employee.position,
            workArea: employee.workArea,
            photo: employee.photo
          },
          vehicle: {
            type: vehicle.type,
            licensePlate: vehicle.licensePlate,
            brand: vehicle.brand,
            model: vehicle.model,
            color: vehicle.color
          },
          license: {
            isValid: employee.hasValidLicense(),
            canDrive: employee.canDriveVehicleType(vehicle.type),
            expiryDate: employee.license?.expiryDate
          }
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  }
);

module.exports = router;