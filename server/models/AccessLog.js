const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  // Who accessed
  userType: {
    type: String,
    enum: ['employee', 'visitor'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    required: true,
    enum: ['Employee', 'Visitor']
  },
  
  // What vehicle
  licensePlate: {
    type: String,
    required: true,
    uppercase: true
  },
  vehicleType: {
    type: String,
    enum: ['car', 'motorcycle'],
    required: true
  },
  
  // When and where
  accessTime: {
    type: Date,
    default: Date.now
  },
  exitTime: Date,
  
  // Access details
  accessType: {
    type: String,
    enum: ['entry', 'exit', 'denied'],
    required: true
  },
  accessPoint: {
    type: String,
    default: 'main_gate'
  },
  
  // Status and validation
  status: {
    type: String,
    enum: ['successful', 'denied', 'suspicious'],
    required: true
  },
  
  // Denial reasons
  denialReason: {
    type: String,
    enum: [
      'expired_license',
      'inactive_employee',
      'first_thursday_restriction',
      'invalid_plate',
      'visitor_not_approved',
      'visitor_expired',
      'unauthorized_vehicle',
      'system_error'
    ]
  },
  
  // Additional context
  isFirstThursday: {
    type: Boolean,
    default: false
  },
  hasSpecialPermit: {
    type: Boolean,
    default: false
  },
  
  // Detection method
  detectionMethod: {
    type: String,
    enum: ['manual', 'camera_scan', 'qr_scan', 'rfid'],
    default: 'manual'
  },
  
  // System info
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  ipAddress: String,
  userAgent: String,
  
  // Metadata
  notes: String,
  photos: [String] // File paths for evidence photos
}, {
  timestamps: true
});

// Indexes for performance
accessLogSchema.index({ accessTime: -1 });
accessLogSchema.index({ licensePlate: 1, accessTime: -1 });
accessLogSchema.index({ userId: 1, userModel: 1, accessTime: -1 });
accessLogSchema.index({ status: 1, accessTime: -1 });
accessLogSchema.index({ accessType: 1, accessTime: -1 });

// Virtual for duration (if has exit time)
accessLogSchema.virtual('duration').get(function() {
  if (this.exitTime && this.accessTime) {
    return Math.round((this.exitTime - this.accessTime) / (1000 * 60)); // Minutes
  }
  return null;
});

// Virtual to check if still inside
accessLogSchema.virtual('isInside').get(function() {
  return this.accessType === 'entry' && this.status === 'successful' && !this.exitTime;
});

// Methods
accessLogSchema.methods.markExit = function() {
  this.exitTime = new Date();
  return this.save();
};

// Static methods
accessLogSchema.statics.findCurrentlyInside = function() {
  return this.find({
    accessType: 'entry',
    status: 'successful',
    exitTime: { $exists: false }
  }).populate('userId');
};

accessLogSchema.statics.findByPlateToday = function(licensePlate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    licensePlate: licensePlate.toUpperCase(),
    accessTime: { $gte: today, $lt: tomorrow }
  }).sort({ accessTime: -1 });
};

accessLogSchema.statics.getAccessStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        accessTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$accessTime" } },
          userType: "$userType",
          status: "$status"
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.date": 1 }
    }
  ]);
};

accessLogSchema.statics.getDenialReasons = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'denied',
        accessTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$denialReason",
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

module.exports = mongoose.model('AccessLog', accessLogSchema);