const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const { authenticateToken } = require('../middleware/auth');
const { upload, processImages } = require('../middleware/upload');

// Generate visitor pass
router.post('/generate-pass', 
  authenticateToken,
  upload.single('visitorPhoto'),
  processImages,
  async (req, res) => {
    try {
      const {
        name,
        documentNumber,
        licensePlate,
        purpose,
        destinationArea,
        companions,
        phone,
        email,
        expectedDuration
      } = req.body;

      // Validate required fields
      if (!name || !documentNumber || !licensePlate || !purpose || !destinationArea) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: name, documentNumber, licensePlate, purpose, destinationArea'
        });
      }

      // Check for existing active visitor with same plate today
      const existingVisitor = await Visitor.findOne({
        licensePlate: licensePlate.toUpperCase(),
        visitDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        },
        status: { $in: ['pending', 'approved', 'in_progress'] }
      });

      if (existingVisitor) {
        return res.status(400).json({
          success: false,
          message: 'An active visitor pass already exists for this license plate today'
        });
      }

      // Create visitor record
      const visitorData = {
        name,
        documentNumber,
        licensePlate: licensePlate.toUpperCase(),
        purpose,
        destinationArea,
        companions: companions ? companions.split(',').map(c => c.trim()).filter(c => c) : [],
        phone,
        email,
        expectedDuration: parseInt(expectedDuration) || 4,
        photo: req.file ? req.file.path : null,
        createdBy: req.user._id,
        status: 'approved' // Auto-approve for now, could require manual approval
      };

      const visitor = new Visitor(visitorData);
      const qrCode = visitor.generateQRCode();
      await visitor.save();

      res.status(201).json({
        success: true,
        message: 'Visitor pass generated successfully',
        qrCode: qrCode,
        data: {
          id: visitor._id,
          name: visitor.name,
          licensePlate: visitor.licensePlate,
          purpose: visitor.purpose,
          destinationArea: visitor.destinationArea,
          expiryTime: visitor.expiryTime,
          status: visitor.status
        }
      });

    } catch (error) {
      console.error('Visitor pass generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate visitor pass',
        error: error.message
      });
    }
  }
);

// Get all visitors
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      startDate, 
      endDate,
      search 
    } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.visitDate = {};
      if (startDate) query.visitDate.$gte = new Date(startDate);
      if (endDate) query.visitDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { documentNumber: new RegExp(search, 'i') },
        { licensePlate: new RegExp(search, 'i') },
        { purpose: new RegExp(search, 'i') }
      ];
    }

    const visitors = await Visitor.find(query)
      .populate('createdBy', 'fullName position')
      .populate('authorizedBy', 'fullName position')
      .populate('approvedBy', 'fullName position')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Visitor.countDocuments(query);

    res.json({
      success: true,
      data: visitors,
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
      message: 'Failed to retrieve visitors',
      error: error.message
    });
  }
});

// Get today's visitors
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const visitors = await Visitor.getTodaysVisitors();
    
    const summary = {
      total: visitors.length,
      pending: visitors.filter(v => v.status === 'pending').length,
      approved: visitors.filter(v => v.status === 'approved').length,
      inProgress: visitors.filter(v => v.status === 'in_progress').length,
      completed: visitors.filter(v => v.status === 'completed').length,
      expired: visitors.filter(v => v.status === 'expired').length,
      visitors: visitors
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve today\'s visitors',
      error: error.message
    });
  }
});

// Get visitor by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id)
      .populate('createdBy', 'fullName position workArea')
      .populate('authorizedBy', 'fullName position')
      .populate('approvedBy', 'fullName position');

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    res.json({
      success: true,
      data: visitor
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve visitor',
      error: error.message
    });
  }
});

// Validate QR code
router.post('/validate-qr', async (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: 'QR code is required'
      });
    }

    const visitor = await Visitor.findByQRCode(qrCode);

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired QR code'
      });
    }

    if (!visitor.canEnter()) {
      return res.status(400).json({
        success: false,
        message: visitor.isExpired() ? 'Visitor pass has expired' : 'Visitor cannot enter at this time'
      });
    }

    res.json({
      success: true,
      data: {
        visitor: {
          id: visitor._id,
          name: visitor.name,
          documentNumber: visitor.documentNumber,
          licensePlate: visitor.licensePlate,
          purpose: visitor.purpose,
          destinationArea: visitor.destinationArea,
          companions: visitor.companions,
          expiryTime: visitor.expiryTime
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'QR validation failed',
      error: error.message
    });
  }
});

// Update visitor status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const validStatuses = ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    visitor.status = status;
    if (notes) visitor.notes = notes;

    // Set appropriate user reference based on status
    if (status === 'approved') {
      visitor.approvedBy = req.user._id;
    } else if (status === 'rejected') {
      visitor.authorizedBy = req.user._id;
    }

    await visitor.save();

    res.json({
      success: true,
      message: `Visitor status updated to ${status}`,
      data: visitor
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update visitor status',
      error: error.message
    });
  }
});

// Extend visitor pass
router.patch('/:id/extend', authenticateToken, async (req, res) => {
  try {
    const { additionalHours } = req.body;

    if (!additionalHours || additionalHours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Additional hours must be a positive number'
      });
    }

    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    if (visitor.status !== 'approved' && visitor.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Can only extend active visitor passes'
      });
    }

    visitor.expectedDuration += parseInt(additionalHours);
    visitor.authorizedBy = req.user._id;
    await visitor.save();

    res.json({
      success: true,
      message: `Visitor pass extended by ${additionalHours} hours`,
      data: {
        newExpiryTime: visitor.expiryTime,
        totalDuration: visitor.expectedDuration
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to extend visitor pass',
      error: error.message
    });
  }
});

module.exports = router;