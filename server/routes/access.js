const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Visitor = require('../models/Visitor');
const AccessLog = require('../models/AccessLog');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Helper function to check if today is first Thursday
const isFirstThursday = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstThursday = new Date(firstDay);
  
  // Find first Thursday
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  
  return today.toDateString() === firstThursday.toDateString();
};

// Validate access for license plate
router.post('/validate', optionalAuth, async (req, res) => {
  try {
    const { licensePlate, accessType = 'employee' } = req.body;
    
    if (!licensePlate) {
      return res.status(400).json({
        success: false,
        message: 'License plate is required'
      });
    }
    
    const plate = licensePlate.toUpperCase();
    const firstThursday = isFirstThursday();
    
    // Check if employee
    if (accessType === 'employee') {
      const employee = await Employee.findByPlate(plate);
      
      if (!employee) {
        await AccessLog.create({
          userType: 'employee',
          licensePlate: plate,
          vehicleType: 'unknown',
          accessType: 'denied',
          status: 'denied',
          denialReason: 'invalid_plate',
          isFirstThursday: firstThursday,
          processedBy: req.user?._id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.json({
          success: false,
          message: 'License plate not found in employee records',
          requiresSpecialPermit: firstThursday
        });
      }
      
      if (!employee.isActive) {
        await AccessLog.create({
          userType: 'employee',
          userId: employee._id,
          userModel: 'Employee',
          licensePlate: plate,
          vehicleType: employee.getVehicleByPlate(plate)?.type || 'unknown',
          accessType: 'denied',
          status: 'denied',
          denialReason: 'inactive_employee',
          isFirstThursday: firstThursday,
          processedBy: req.user?._id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.json({
          success: false,
          message: 'Employee account is inactive'
        });
      }
      
      const vehicle = employee.getVehicleByPlate(plate);
      if (!vehicle) {
        await AccessLog.create({
          userType: 'employee',
          userId: employee._id,
          userModel: 'Employee',
          licensePlate: plate,
          vehicleType: 'unknown',
          accessType: 'denied',
          status: 'denied',
          denialReason: 'unauthorized_vehicle',
          isFirstThursday: firstThursday,
          processedBy: req.user?._id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.json({
          success: false,
          message: 'Vehicle not authorized for this employee'
        });
      }
      
      // Check license validity
      if (!employee.hasValidLicense()) {
        await AccessLog.create({
          userType: 'employee',
          userId: employee._id,
          userModel: 'Employee',
          licensePlate: plate,
          vehicleType: vehicle.type,
          accessType: 'denied',
          status: 'denied',
          denialReason: 'expired_license',
          isFirstThursday: firstThursday,
          processedBy: req.user?._id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.json({
          success: false,
          message: 'Driver license is expired or invalid'
        });
      }
      
      // Check if can drive this vehicle type
      if (!employee.canDriveVehicleType(vehicle.type)) {
        await AccessLog.create({
          userType: 'employee',
          userId: employee._id,
          userModel: 'Employee',
          licensePlate: plate,
          vehicleType: vehicle.type,
          accessType: 'denied',
          status: 'denied',
          denialReason: 'expired_license',
          isFirstThursday: firstThursday,
          processedBy: req.user?._id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.json({
          success: false,
          message: `License doesn't cover ${vehicle.type} category`
        });
      }
      
      // First Thursday restriction
      if (firstThursday && employee.accessLevel === 'basic') {
        await AccessLog.create({
          userType: 'employee',
          userId: employee._id,
          userModel: 'Employee',
          licensePlate: plate,
          vehicleType: vehicle.type,
          accessType: 'denied',
          status: 'denied',
          denialReason: 'first_thursday_restriction',
          isFirstThursday: firstThursday,
          processedBy: req.user?._id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.json({
          success: false,
          message: 'First Thursday restriction - Special permit required',
          requiresSpecialPermit: true
        });
      }
      
      // Success - access granted
      return res.json({
        success: true,
        data: {
          userType: 'employee',
          driverName: employee.fullName,
          licensePlate: plate,
          vehicleType: vehicle.type,
          position: employee.position,
          workArea: employee.workArea,
          photo: employee.photo,
          isFirstThursday: firstThursday,
          hasSpecialPermit: employee.accessLevel !== 'basic'
        }
      });
    }
    
    // Check if visitor
    if (accessType === 'visitor') {
      const visitor = await Visitor.findByPlate(plate);
      
      if (!visitor) {
        await AccessLog.create({
          userType: 'visitor',
          licensePlate: plate,
          vehicleType: 'unknown',
          accessType: 'denied',
          status: 'denied',
          denialReason: 'invalid_plate',
          isFirstThursday: firstThursday,
          processedBy: req.user?._id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.json({
          success: false,
          message: 'No visitor registration found for this plate'
        });
      }
      
      if (!visitor.canEnter()) {
        const reason = visitor.isExpired() ? 'visitor_expired' : 'visitor_not_approved';
        
        await AccessLog.create({
          userType: 'visitor',
          userId: visitor._id,
          userModel: 'Visitor',
          licensePlate: plate,
          vehicleType: 'unknown',
          accessType: 'denied',
          status: 'denied',
          denialReason: reason,
          isFirstThursday: firstThursday,
          processedBy: req.user?._id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.json({
          success: false,
          message: visitor.isExpired() ? 
            'Visitor pass has expired' : 
            'Visitor not approved or already inside'
        });
      }
      
      // Success - visitor access granted
      return res.json({
        success: true,
        data: {
          userType: 'visitor',
          driverName: visitor.name,
          licensePlate: plate,
          vehicleType: 'unknown',
          purpose: visitor.purpose,
          destinationArea: visitor.destinationArea,
          expiryTime: visitor.expiryTime,
          qrCode: visitor.qrCode
        }
      });
    }
    
  } catch (error) {
    console.error('Access validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation failed',
      error: error.message
    });
  }
});

// Register entry
router.post('/entry', authenticateToken, async (req, res) => {
  try {
    const { licensePlate, entryType = 'manual_confirmation' } = req.body;
    const plate = licensePlate.toUpperCase();
    
    // Check if employee
    let employee = await Employee.findByPlate(plate);
    let visitor = null;
    
    if (!employee) {
      visitor = await Visitor.findByPlate(plate);
    }
    
    if (!employee && !visitor) {
      return res.status(404).json({
        success: false,
        message: 'No valid registration found'
      });
    }
    
    const isEmployee = !!employee;
    const user = employee || visitor;
    const vehicle = employee ? employee.getVehicleByPlate(plate) : null;
    
    // Create access log entry
    const accessLog = await AccessLog.create({
      userType: isEmployee ? 'employee' : 'visitor',
      userId: user._id,
      userModel: isEmployee ? 'Employee' : 'Visitor',
      licensePlate: plate,
      vehicleType: vehicle?.type || 'unknown',
      accessType: 'entry',
      status: 'successful',
      isFirstThursday: isFirstThursday(),
      detectionMethod: entryType,
      processedBy: req.user._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Update visitor status if applicable
    if (visitor) {
      visitor.status = 'in_progress';
      visitor.entryTime = new Date();
      await visitor.save();
    }
    
    // Update employee last access
    if (employee) {
      employee.lastAccess = new Date();
      await employee.save();
    }
    
    res.json({
      success: true,
      message: 'Entry registered successfully',
      data: {
        accessLogId: accessLog._id,
        entryTime: accessLog.accessTime,
        user: {
          name: isEmployee ? employee.fullName : visitor.name,
          type: isEmployee ? 'employee' : 'visitor'
        }
      }
    });
    
  } catch (error) {
    console.error('Entry registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Entry registration failed',
      error: error.message
    });
  }
});

// Register exit
router.post('/exit', authenticateToken, async (req, res) => {
  try {
    const { licensePlate } = req.body;
    const plate = licensePlate.toUpperCase();
    
    // Find the most recent entry without exit
    const entryLog = await AccessLog.findOne({
      licensePlate: plate,
      accessType: 'entry',
      status: 'successful',
      exitTime: { $exists: false }
    }).sort({ accessTime: -1 });
    
    if (!entryLog) {
      return res.status(404).json({
        success: false,
        message: 'No active entry found for this vehicle'
      });
    }
    
    // Mark exit time
    entryLog.exitTime = new Date();
    await entryLog.save();
    
    // Update visitor status if applicable
    if (entryLog.userType === 'visitor') {
      const visitor = await Visitor.findById(entryLog.userId);
      if (visitor) {
        visitor.status = 'completed';
        visitor.exitTime = new Date();
        await visitor.save();
      }
    }
    
    res.json({
      success: true,
      message: 'Exit registered successfully',
      data: {
        entryTime: entryLog.accessTime,
        exitTime: entryLog.exitTime,
        duration: Math.round((entryLog.exitTime - entryLog.accessTime) / (1000 * 60)) // minutes
      }
    });
    
  } catch (error) {
    console.error('Exit registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Exit registration failed',
      error: error.message
    });
  }
});

// Get current occupancy
router.get('/occupancy', authenticateToken, async (req, res) => {
  try {
    const currentlyInside = await AccessLog.findCurrentlyInside();
    
    const occupancy = {
      total: currentlyInside.length,
      employees: currentlyInside.filter(log => log.userType === 'employee').length,
      visitors: currentlyInside.filter(log => log.userType === 'visitor').length,
      vehicles: currentlyInside.map(log => ({
        licensePlate: log.licensePlate,
        userType: log.userType,
        entryTime: log.accessTime,
        userName: log.userId?.fullName || log.userId?.name
      }))
    };
    
    res.json({
      success: true,
      data: occupancy
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get occupancy data',
      error: error.message
    });
  }
});

// Get access logs
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      startDate, 
      endDate, 
      status, 
      userType,
      licensePlate 
    } = req.query;
    
    let query = {};
    
    if (startDate || endDate) {
      query.accessTime = {};
      if (startDate) query.accessTime.$gte = new Date(startDate);
      if (endDate) query.accessTime.$lte = new Date(endDate);
    }
    
    if (status) query.status = status;
    if (userType) query.userType = userType;
    if (licensePlate) query.licensePlate = licensePlate.toUpperCase();
    
    const logs = await AccessLog.find(query)
      .populate('userId', 'fullName name position workArea')
      .populate('processedBy', 'fullName')
      .sort({ accessTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await AccessLog.countDocuments(query);
    
    res.json({
      success: true,
      data: logs,
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
      message: 'Failed to retrieve access logs',
      error: error.message
    });
  }
});

module.exports = router;