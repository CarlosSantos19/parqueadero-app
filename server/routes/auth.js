const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');
const { authenticateToken } = require('../middleware/auth');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId }, 
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find employee by username
    const employee = await Employee.findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    });

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await employee.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last access
    employee.lastAccess = new Date();
    await employee.save();

    // Generate token
    const token = generateToken(employee._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        employee: {
          id: employee._id,
          fullName: employee.fullName,
          username: employee.username,
          position: employee.position,
          workArea: employee.workArea,
          accessLevel: employee.accessLevel,
          photo: employee.photo
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Create admin user (should be run once)
router.post('/setup-admin', async (req, res) => {
  try {
    // Check if any admin exists
    const existingAdmin = await Employee.findOne({ accessLevel: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    const { 
      fullName, 
      documentNumber, 
      username, 
      password,
      position = 'System Administrator',
      workArea = 'IT'
    } = req.body;

    if (!fullName || !documentNumber || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Create admin employee
    const admin = new Employee({
      fullName,
      documentType: 'cedula',
      documentNumber,
      position,
      workArea,
      username: username.toLowerCase(),
      password,
      accessLevel: 'admin',
      vehicles: [],
      license: {
        licenseNumber: 'ADMIN-LICENSE',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        categories: ['B1', 'B2'],
        isValid: true
      }
    });

    await admin.save();

    // Generate token
    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        token,
        admin: {
          id: admin._id,
          fullName: admin.fullName,
          username: admin.username,
          accessLevel: admin.accessLevel
        }
      }
    });

  } catch (error) {
    console.error('Admin setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin setup failed',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user._id,
        fullName: req.user.fullName,
        username: req.user.username,
        documentNumber: req.user.documentNumber,
        position: req.user.position,
        workArea: req.user.workArea,
        accessLevel: req.user.accessLevel,
        photo: req.user.photo,
        vehicles: req.user.vehicles,
        license: req.user.license,
        lastAccess: req.user.lastAccess,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Verify current password
    const isValidPassword = await req.user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
});

// Logout (optional - mainly for logging)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Could implement token blacklist here if needed
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    
    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
});

module.exports = router;