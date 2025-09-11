const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware básico
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mock data storage (en memoria para desarrollo)
let employees = [];
let visitors = [];
let accessLogs = [];

// Helper para generar IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'development',
    database: 'in-memory'
  });
});

// Auth endpoints (mock)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: 'dev-token-123',
        employee: {
          id: '1',
          fullName: 'Administrador Sistema',
          username: 'admin',
          accessLevel: 'admin'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Visitor endpoints
app.post('/api/visitors/generate-pass', (req, res) => {
  try {
    const {
      name,
      documentNumber,
      licensePlate,
      purpose,
      destinationArea,
      companions
    } = req.body;

    if (!name || !documentNumber || !licensePlate || !purpose || !destinationArea) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: name, documentNumber, licensePlate, purpose, destinationArea'
      });
    }

    const visitor = {
      id: generateId(),
      name,
      documentNumber,
      licensePlate: licensePlate.toUpperCase(),
      purpose,
      destinationArea,
      companions: companions ? companions.split(',').map(c => c.trim()).filter(c => c) : [],
      visitDate: new Date(),
      status: 'approved',
      createdAt: new Date()
    };

    // Generate QR Code (simple base64 encoding for development)
    const qrData = {
      visitorId: visitor.id,
      documentNumber: visitor.documentNumber,
      licensePlate: visitor.licensePlate,
      visitDate: visitor.visitDate
    };
    const qrCode = Buffer.from(JSON.stringify(qrData)).toString('base64');

    visitor.qrCode = qrCode;
    visitors.push(visitor);

    console.log('✅ Visitor pass generated:', visitor.name, visitor.licensePlate);

    res.status(201).json({
      success: true,
      message: 'Visitor pass generated successfully',
      qrCode: qrCode,
      data: {
        id: visitor.id,
        name: visitor.name,
        licensePlate: visitor.licensePlate,
        purpose: visitor.purpose,
        destinationArea: visitor.destinationArea,
        status: visitor.status
      }
    });

  } catch (error) {
    console.error('Error generating visitor pass:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate visitor pass',
      error: error.message
    });
  }
});

// Employee registration
app.post('/api/employees/register', (req, res) => {
  try {
    console.log('Employee registration request received');
    
    const employee = {
      id: generateId(),
      ...req.body,
      createdAt: new Date()
    };
    
    employees.push(employee);
    
    console.log('✅ Employee registered:', employee.fullName || 'Unknown');
    
    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      data: {
        id: employee.id
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
});

// Access validation
app.post('/api/access/validate', (req, res) => {
  try {
    const { licensePlate, accessType = 'employee' } = req.body;
    
    if (!licensePlate) {
      return res.status(400).json({
        success: false,
        message: 'License plate is required'
      });
    }
    
    const plate = licensePlate.toUpperCase();
    
    // Check if visitor
    if (accessType === 'visitor') {
      const visitor = visitors.find(v => 
        v.licensePlate === plate && 
        v.status === 'approved'
      );
      
      if (visitor) {
        return res.json({
          success: true,
          data: {
            userType: 'visitor',
            driverName: visitor.name,
            licensePlate: plate,
            purpose: visitor.purpose,
            destinationArea: visitor.destinationArea
          }
        });
      }
    }
    
    // Mock employee validation
    return res.json({
      success: true,
      data: {
        userType: 'employee',
        driverName: 'Funcionario Test',
        licensePlate: plate,
        vehicleType: 'car',
        position: 'Desarrollador',
        workArea: 'IT'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Validation failed',
      error: error.message
    });
  }
});

// Access entry
app.post('/api/access/entry', (req, res) => {
  try {
    const { licensePlate } = req.body;
    
    const accessLog = {
      id: generateId(),
      licensePlate: licensePlate.toUpperCase(),
      accessTime: new Date(),
      status: 'successful'
    };
    
    accessLogs.push(accessLog);
    
    console.log('✅ Entry registered:', licensePlate);
    
    res.json({
      success: true,
      message: 'Entry registered successfully',
      data: {
        accessLogId: accessLog.id,
        entryTime: accessLog.accessTime
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Entry registration failed',
      error: error.message
    });
  }
});

// OCR plate recognition (mock)
app.post('/api/ocr/plate', (req, res) => {
  try {
    // Mock OCR response
    const mockPlates = ['ABC123', 'XYZ789', 'DEF456', 'GHI321'];
    const randomPlate = mockPlates[Math.floor(Math.random() * mockPlates.length)];
    
    console.log('✅ Mock OCR recognition:', randomPlate);
    
    res.json({
      success: true,
      plate: randomPlate,
      confidence: 85,
      processingTime: Date.now()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OCR processing failed',
      error: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Development server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}/api`);
  console.log(`📝 Using in-memory storage for development`);
  console.log(`🔑 Login: admin / admin123`);
});