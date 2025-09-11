const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all vehicles
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, active, search } = req.query;
    
    let matchStage = {};
    
    if (type) {
      matchStage['vehicles.type'] = type;
    }
    
    if (active !== undefined) {
      matchStage['vehicles.isActive'] = active === 'true';
    }
    
    let aggregation = [
      { $unwind: '$vehicles' },
      { $match: { isActive: true, ...matchStage } },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'owner'
        }
      },
      { $unwind: '$owner' },
      {
        $project: {
          _id: '$vehicles._id',
          licensePlate: '$vehicles.licensePlate',
          type: '$vehicles.type',
          brand: '$vehicles.brand',
          model: '$vehicles.model',
          line: '$vehicles.line',
          color: '$vehicles.color',
          isActive: '$vehicles.isActive',
          createdAt: '$vehicles.createdAt',
          owner: {
            id: '$owner._id',
            fullName: '$owner.fullName',
            documentNumber: '$owner.documentNumber',
            position: '$owner.position',
            workArea: '$owner.workArea'
          }
        }
      }
    ];
    
    if (search) {
      aggregation.push({
        $match: {
          $or: [
            { licensePlate: new RegExp(search, 'i') },
            { brand: new RegExp(search, 'i') },
            { model: new RegExp(search, 'i') },
            { 'owner.fullName': new RegExp(search, 'i') }
          ]
        }
      });
    }
    
    aggregation.push(
      { $sort: { licensePlate: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );
    
    const vehicles = await Employee.aggregate(aggregation);
    
    // Count total documents
    const countAggregation = [...aggregation];
    countAggregation.splice(-2, 2); // Remove skip and limit
    countAggregation.push({ $count: 'total' });
    
    const countResult = await Employee.aggregate(countAggregation);
    const total = countResult[0]?.total || 0;
    
    res.json({
      success: true,
      data: vehicles,
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
      message: 'Failed to retrieve vehicles',
      error: error.message
    });
  }
});

// Search vehicle by license plate
router.get('/search/:licensePlate', authenticateToken, async (req, res) => {
  try {
    const licensePlate = req.params.licensePlate.toUpperCase();
    
    const employee = await Employee.findOne({
      'vehicles.licensePlate': licensePlate,
      'vehicles.isActive': true,
      isActive: true
    }).select('fullName documentNumber position workArea vehicles.$');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    const vehicle = employee.vehicles[0];
    
    res.json({
      success: true,
      data: {
        vehicle: {
          licensePlate: vehicle.licensePlate,
          type: vehicle.type,
          brand: vehicle.brand,
          model: vehicle.model,
          line: vehicle.line,
          color: vehicle.color,
          isActive: vehicle.isActive
        },
        owner: {
          id: employee._id,
          fullName: employee.fullName,
          documentNumber: employee.documentNumber,
          position: employee.position,
          workArea: employee.workArea
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Vehicle search failed',
      error: error.message
    });
  }
});

// Update vehicle information
router.put('/:employeeId/vehicles/:vehicleId', 
  authenticateToken, 
  requireRole('admin', 'supervisor'),
  async (req, res) => {
    try {
      const { employeeId, vehicleId } = req.params;
      const updates = req.body;
      
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      const vehicleIndex = employee.vehicles.findIndex(
        v => v._id.toString() === vehicleId
      );
      
      if (vehicleIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }
      
      // Update vehicle fields
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          employee.vehicles[vehicleIndex][key] = updates[key];
        }
      });
      
      await employee.save();
      
      res.json({
        success: true,
        message: 'Vehicle updated successfully',
        data: employee.vehicles[vehicleIndex]
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update vehicle',
        error: error.message
      });
    }
  }
);

// Deactivate vehicle
router.patch('/:employeeId/vehicles/:vehicleId/deactivate',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  async (req, res) => {
    try {
      const { employeeId, vehicleId } = req.params;
      
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      const vehicle = employee.vehicles.id(vehicleId);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
      }
      
      vehicle.isActive = false;
      await employee.save();
      
      res.json({
        success: true,
        message: 'Vehicle deactivated successfully',
        data: vehicle
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate vehicle',
        error: error.message
      });
    }
  }
);

// Add vehicle to employee
router.post('/:employeeId/vehicles',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  async (req, res) => {
    try {
      const { employeeId } = req.params;
      const vehicleData = req.body;
      
      // Check if license plate already exists
      const existingVehicle = await Employee.findOne({
        'vehicles.licensePlate': vehicleData.licensePlate.toUpperCase(),
        'vehicles.isActive': true
      });
      
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'License plate already registered'
        });
      }
      
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      // Add vehicle
      employee.vehicles.push({
        ...vehicleData,
        licensePlate: vehicleData.licensePlate.toUpperCase()
      });
      
      await employee.save();
      
      const newVehicle = employee.vehicles[employee.vehicles.length - 1];
      
      res.status(201).json({
        success: true,
        message: 'Vehicle added successfully',
        data: newVehicle
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to add vehicle',
        error: error.message
      });
    }
  }
);

// Get vehicle statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await Employee.aggregate([
      { $unwind: '$vehicles' },
      { $match: { isActive: true, 'vehicles.isActive': true } },
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          cars: { $sum: { $cond: [{ $eq: ['$vehicles.type', 'car'] }, 1, 0] } },
          motorcycles: { $sum: { $cond: [{ $eq: ['$vehicles.type', 'motorcycle'] }, 1, 0] } },
          brands: { $addToSet: '$vehicles.brand' },
          colors: { $addToSet: '$vehicles.color' }
        }
      },
      {
        $project: {
          _id: 0,
          totalVehicles: 1,
          cars: 1,
          motorcycles: 1,
          uniqueBrands: { $size: '$brands' },
          uniqueColors: { $size: '$colors' },
          brands: 1,
          colors: 1
        }
      }
    ]);
    
    const result = stats[0] || {
      totalVehicles: 0,
      cars: 0,
      motorcycles: 0,
      uniqueBrands: 0,
      uniqueColors: 0,
      brands: [],
      colors: []
    };
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vehicle statistics',
      error: error.message
    });
  }
});

module.exports = router;