const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vehicleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['car', 'motorcycle'],
    required: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    match: /^[A-Z0-9]{6}$/
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  line: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  ownershipDocument: {
    type: String, // File path
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const licenseSchema = new mongoose.Schema({
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  expiryDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'License must not be expired'
    }
  },
  categories: [{
    type: String,
    enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    required: true
  }],
  licensePhoto: {
    type: String, // File path
    required: false
  },
  isValid: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const employeeSchema = new mongoose.Schema({
  // Personal Information
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  documentType: {
    type: String,
    enum: ['cedula', 'extranjeria'],
    required: true
  },
  documentNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  workArea: {
    type: String,
    required: true,
    trim: true
  },
  photo: {
    type: String, // File path for facial recognition
    required: false
  },
  
  // Contact Information
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Vehicle Information
  vehicles: [vehicleSchema],
  
  // License Information
  license: licenseSchema,
  
  // Access Control
  accessLevel: {
    type: String,
    enum: ['basic', 'supervisor', 'admin'],
    default: 'basic'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Authentication (optional for employees who can access the system)
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    minlength: 6
  },
  
  // Metadata
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  lastAccess: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Indexes for better performance
employeeSchema.index({ documentNumber: 1 });
employeeSchema.index({ 'vehicles.licensePlate': 1 });
employeeSchema.index({ 'license.licenseNumber': 1 });
employeeSchema.index({ fullName: 'text', position: 'text', workArea: 'text' });

// Middleware
employeeSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Methods
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

employeeSchema.methods.hasValidLicense = function() {
  return this.license && 
         this.license.isValid && 
         this.license.expiryDate > new Date();
};

employeeSchema.methods.canDriveVehicleType = function(vehicleType) {
  if (!this.hasValidLicense()) return false;
  
  const requiredCategories = {
    motorcycle: ['A1', 'A2'],
    car: ['B1', 'B2']
  };
  
  const userCategories = this.license.categories;
  const needed = requiredCategories[vehicleType] || [];
  
  return needed.some(category => userCategories.includes(category));
};

employeeSchema.methods.getVehicleByPlate = function(licensePlate) {
  return this.vehicles.find(vehicle => 
    vehicle.licensePlate === licensePlate.toUpperCase() && vehicle.isActive
  );
};

// Static methods
employeeSchema.statics.findByPlate = function(licensePlate) {
  return this.findOne({
    'vehicles.licensePlate': licensePlate.toUpperCase(),
    'vehicles.isActive': true,
    isActive: true
  });
};

employeeSchema.statics.findByDocument = function(documentNumber) {
  return this.findOne({
    documentNumber: documentNumber,
    isActive: true
  });
};

module.exports = mongoose.model('Employee', employeeSchema);