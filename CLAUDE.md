# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sistema de Control de Parqueadero - A web application for parking access control with employee and visitor management. The system uses OCR for license plate scanning, facial recognition, and QR codes for visitor access.

**Tech Stack:**
- Frontend: React 18 + Material-UI (PWA-enabled)
- Backend: Node.js + Express + MongoDB
- OCR: Tesseract.js for license plate recognition
- Image Processing: Sharp + Multer

## Development Commands

### Frontend
```bash
npm install          # Install dependencies
npm start           # Start dev server (http://localhost:3000)
npm run build       # Production build
npm test            # Run tests
```

### Backend
```bash
cd server
npm install         # Install dependencies
npm run dev         # Start dev server with nodemon (http://localhost:5000)
npm start           # Start production server
npm test            # Run tests with Jest
```

### Environment Setup
1. Copy `.env.example` to `server/.env`
2. Configure MongoDB URI, JWT secret, and CORS origins
3. Ensure MongoDB is running locally or provide MongoDB Atlas URI

### Running the Full Application
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
npm start
```

## Architecture

### Monorepo Structure
- **Root**: React frontend application
- **server/**: Backend API with its own package.json and node_modules

### Backend Architecture

**Models** (server/models/):
- `Employee.js`: Main employee model with embedded vehicle and license schemas
  - Supports multiple vehicles per employee
  - License validation with expiry dates and categories (A1, A2, B1, B2, C1, C2)
  - Password hashing with bcrypt for admin employees
  - Indexes on documentNumber, vehicles.licensePlate, and license.licenseNumber
- `Visitor.js`: Temporary visitor passes with QR codes
- `AccessLog.js`: Entry/exit logging system

**Routes** (server/routes/):
- `auth.js`: JWT authentication and admin setup
- `employees.js`: Employee CRUD operations
- `vehicles.js`: Vehicle management (add/remove/update)
- `access.js`: Access validation and entry/exit logging
- `visitors.js`: Visitor pass generation and QR validation
- `ocr.js`: License plate OCR processing

**Middleware** (server/middleware/):
- `auth.js`: JWT token verification
- `upload.js`: Multer file upload with Sharp image processing

### Frontend Architecture

**Components** (src/):
- `App.js`: Main app with MUI theme configuration and navigation
- `AccessControl.jsx`: Entry/exit control with plate scanner
- `EmployeeRegistration.jsx`: 5-step employee registration wizard
- `VisitorControl.jsx`: Visitor pass generation with QR codes
- `PlateScanner.jsx`: Camera-based OCR for license plates

**Theme**: Custom Material-UI theme with gradient design (#667eea to #764ba2), mobile-first responsive breakpoints

### Key Business Logic

**Access Control Rules:**
- First Thursday restriction: Special access rules apply on the first Thursday of each month
- Employee validation by license plate lookup (`Employee.findByPlate()`)
- Visitor validation via QR code
- Entry/exit logging in AccessLog collection

**Employee-Vehicle Relationship:**
- One employee can have multiple vehicles (vehicles array in Employee model)
- License plate format: Exactly 6 alphanumeric characters, uppercase
- Vehicle types: 'car' or 'motorcycle'
- License categories validation against vehicle type

**License Validation:**
- `hasValidLicense()`: Checks expiry date and isValid flag
- `canDriveVehicleType()`: Validates license categories match vehicle type
  - Motorcycle requires A1 or A2
  - Car requires B1 or B2

## Deployment

**Railway Configuration:**
- Deployment is configured for Railway platform
- `railway.json`: Uses NIXPACKS builder, runs from server/ directory
- `Procfile`: Heroku-style process file (backup)
- `nixpacks.toml`: Nixpacks configuration

**Deployment Command:**
```bash
cd server && npm start
```

**Environment Variables Required:**
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT token signing
- `JWT_EXPIRES_IN`: Token expiration (default: 7d)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: 'development' or 'production'
- `ALLOWED_ORIGINS`: Comma-separated CORS origins
- `TESSERACT_LANG`: OCR language (default: 'spa')
- `TESSERACT_PSM`: Tesseract page segmentation mode (default: 8)

## Important Patterns

**Security:**
- All passwords hashed with bcrypt (12 rounds)
- JWT authentication required for most endpoints
- Rate limiting: 100 requests per 15 minutes per IP
- Helmet.js for HTTP security headers
- File upload size limit: 10MB

**Error Handling:**
- Mongoose ValidationError returns 400 with field details
- MongoDB duplicate key (code 11000) returns 400 with field name
- Global error handler in server.js with development stack traces

**Database Patterns:**
- Embedded documents for vehicles and license (one-to-one/one-to-many)
- Text search index on fullName, position, workArea
- toJSON transform removes password field from responses
- Soft delete with isActive flags

**Testing:**
- Jest for backend tests
- Supertest for API integration tests
- MongoDB Memory Server for test database

## API Health Check

```bash
GET http://localhost:5000/api/health
```

Returns server status, timestamp, environment, and database connection state.
