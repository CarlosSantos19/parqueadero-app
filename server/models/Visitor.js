const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  // Personal Information
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  documentNumber: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Visit Information
  licensePlate: {
    type: String,
    required: true,
    uppercase: true,
    match: /^[A-Z0-9]{6}$/
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  destinationArea: {
    type: String,
    required: true,
    trim: true
  },
  companions: [{
    type: String,
    trim: true
  }],
  
  // Visit Control
  visitDate: {
    type: Date,
    default: Date.now
  },
  expectedDuration: {
    type: Number, // Duration in hours
    default: 4
  },
  qrCode: {
    type: String,
    unique: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'expired'],
    default: 'pending'
  },
  
  // Entry/Exit tracking
  entryTime: Date,
  exitTime: Date,
  
  // Authorization
  authorizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  
  // Additional fields
  notes: String,
  photo: String, // File path for visitor photo
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }
}, {
  timestamps: true
});

// Indexes
visitorSchema.index({ documentNumber: 1, visitDate: 1 });
visitorSchema.index({ licensePlate: 1 });
visitorSchema.index({ qrCode: 1 });
visitorSchema.index({ visitDate: 1, status: 1 });

// Virtual for visit duration
visitorSchema.virtual('actualDuration').get(function() {
  if (this.entryTime && this.exitTime) {
    return Math.round((this.exitTime - this.entryTime) / (1000 * 60 * 60)); // Hours
  }
  return null;
});

// Virtual for visit expiry
visitorSchema.virtual('expiryTime').get(function() {
  if (this.visitDate && this.expectedDuration) {
    return new Date(this.visitDate.getTime() + (this.expectedDuration * 60 * 60 * 1000));
  }
  return null;
});

// Methods
visitorSchema.methods.isExpired = function() {
  const expiry = this.expiryTime;
  return expiry && new Date() > expiry;
};

visitorSchema.methods.canEnter = function() {
  return this.status === 'approved' && !this.isExpired() && !this.entryTime;
};

visitorSchema.methods.isInside = function() {
  return this.entryTime && !this.exitTime && this.status === 'in_progress';
};

visitorSchema.methods.generateQRCode = function() {
  const data = {
    visitorId: this._id,
    documentNumber: this.documentNumber,
    licensePlate: this.licensePlate,
    visitDate: this.visitDate,
    expiryTime: this.expiryTime
  };
  this.qrCode = Buffer.from(JSON.stringify(data)).toString('base64');
  return this.qrCode;
};

// Middleware
visitorSchema.pre('save', function(next) {
  if (this.isNew && !this.qrCode) {
    this.generateQRCode();
  }
  
  // Auto-expire if past expiry time
  if (this.isExpired() && this.status !== 'completed' && this.status !== 'expired') {
    this.status = 'expired';
  }
  
  next();
});

// Static methods
visitorSchema.statics.findByPlate = function(licensePlate) {
  return this.findOne({
    licensePlate: licensePlate.toUpperCase(),
    status: { $in: ['approved', 'in_progress'] },
    visitDate: {
      $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    }
  });
};

visitorSchema.statics.findByQRCode = function(qrCode) {
  return this.findOne({
    qrCode: qrCode,
    status: { $in: ['approved', 'in_progress'] }
  });
};

visitorSchema.statics.getTodaysVisitors = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    visitDate: { $gte: today, $lt: tomorrow }
  }).populate('authorizedBy approvedBy', 'fullName position');
};

module.exports = mongoose.model('Visitor', visitorSchema);