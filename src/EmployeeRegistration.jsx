import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  IconButton,
  Avatar
} from '@mui/material';
import {
  Person,
  DirectionsCar,
  CameraAlt,
  PhotoCamera,
  Save,
  NavigateNext,
  NavigateBefore,
  CheckCircle
} from '@mui/icons-material';
import PlateScanner from './PlateScanner';

const EmployeeRegistration = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Información Personal
  const [personalData, setPersonalData] = useState({
    fullName: '',
    documentType: 'cedula',
    documentNumber: '',
    position: '',
    workArea: '',
    photo: null
  });

  // Información del Vehículo
  const [vehicleData, setVehicleData] = useState({
    hasVehicle: true,
    vehicles: [{
      type: 'car',
      licensePlate: '',
      brand: '',
      model: '',
      line: '',
      color: '',
      ownershipDocument: null
    }]
  });

  // Licencia de Conducción
  const [licenseData, setLicenseData] = useState({
    licenseNumber: '',
    expiryDate: '',
    categories: [],
    licensePhoto: null
  });

  // Refs para cámaras
  const faceVideoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const [faceStream, setFaceStream] = useState(null);
  const [showFaceCamera, setShowFaceCamera] = useState(false);

  const steps = [
    'Información Personal',
    'Reconocimiento Facial',
    'Información del Vehículo',
    'Licencia de Conducción',
    'Confirmación'
  ];

  useEffect(() => {
    return () => {
      if (faceStream) {
        faceStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [faceStream]);

  const startFaceCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      setFaceStream(stream);
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
      }
      setShowFaceCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const captureFacePhoto = () => {
    if (!faceVideoRef.current || !faceCanvasRef.current) return;

    const canvas = faceCanvasRef.current;
    const video = faceVideoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      setPersonalData(prev => ({
        ...prev,
        photo: blob
      }));
      setShowFaceCamera(false);
      if (faceStream) {
        faceStream.getTracks().forEach(track => track.stop());
        setFaceStream(null);
      }
    }, 'image/jpeg', 0.8);
  };

  const handlePersonalDataChange = (field, value) => {
    setPersonalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVehicleDataChange = (index, field, value) => {
    const updatedVehicles = [...vehicleData.vehicles];
    updatedVehicles[index] = {
      ...updatedVehicles[index],
      [field]: value
    };
    setVehicleData(prev => ({
      ...prev,
      vehicles: updatedVehicles
    }));
  };

  const addVehicle = () => {
    setVehicleData(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, {
        type: 'car',
        licensePlate: '',
        brand: '',
        model: '',
        line: '',
        color: '',
        ownershipDocument: null
      }]
    }));
  };

  const removeVehicle = (index) => {
    setVehicleData(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index)
    }));
  };

  const handlePlateDetected = (plate, vehicleIndex) => {
    handleVehicleDataChange(vehicleIndex, 'licensePlate', plate);
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      
      // Agregar datos personales
      formData.append('personalData', JSON.stringify(personalData));
      if (personalData.photo) {
        formData.append('photo', personalData.photo, 'employee_photo.jpg');
      }
      
      // Agregar datos del vehículo
      formData.append('vehicleData', JSON.stringify(vehicleData));
      
      // Agregar datos de licencia
      formData.append('licenseData', JSON.stringify(licenseData));
      if (licenseData.licensePhoto) {
        formData.append('licensePhoto', licenseData.licensePhoto, 'license_photo.jpg');
      }

      const response = await fetch('/api/employees/register', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Error registering employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderPersonalInfo = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Nombre Completo"
          value={personalData.fullName}
          onChange={(e) => handlePersonalDataChange('fullName', e.target.value)}
          required
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Tipo de Documento</InputLabel>
          <Select
            value={personalData.documentType}
            onChange={(e) => handlePersonalDataChange('documentType', e.target.value)}
          >
            <MenuItem value="cedula">Cédula de Ciudadanía</MenuItem>
            <MenuItem value="extranjeria">Documento de Extranjería</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Número de Documento"
          value={personalData.documentNumber}
          onChange={(e) => handlePersonalDataChange('documentNumber', e.target.value)}
          required
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Cargo"
          value={personalData.position}
          onChange={(e) => handlePersonalDataChange('position', e.target.value)}
          required
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Área de Trabajo"
          value={personalData.workArea}
          onChange={(e) => handlePersonalDataChange('workArea', e.target.value)}
          required
        />
      </Grid>
    </Grid>
  );

  const renderFacialRecognition = () => (
    <Box textAlign="center">
      <Typography variant="h6" gutterBottom>
        Reconocimiento Facial
      </Typography>
      
      {personalData.photo ? (
        <Box>
          <Avatar
            sx={{ width: 200, height: 200, margin: '0 auto', mb: 2 }}
            src={URL.createObjectURL(personalData.photo)}
          />
          <Typography variant="body2" color="success.main" gutterBottom>
            ✓ Foto capturada exitosamente
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setPersonalData(prev => ({ ...prev, photo: null }));
              startFaceCamera();
            }}
          >
            Tomar Nueva Foto
          </Button>
        </Box>
      ) : (
        <Box>
          {!showFaceCamera ? (
            <Button
              variant="contained"
              onClick={startFaceCamera}
              startIcon={<CameraAlt />}
              size="large"
            >
              Iniciar Captura Facial
            </Button>
          ) : (
            <Box>
              <video
                ref={faceVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  height: 'auto',
                  border: '2px solid #1976d2',
                  borderRadius: '8px'
                }}
              />
              <Box mt={2}>
                <Button
                  variant="contained"
                  onClick={captureFacePhoto}
                  startIcon={<PhotoCamera />}
                >
                  Capturar Foto
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
      
      <canvas ref={faceCanvasRef} style={{ display: 'none' }} />
    </Box>
  );

  const renderVehicleInfo = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Información del Vehículo
      </Typography>
      
      {vehicleData.vehicles.map((vehicle, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Vehículo {index + 1}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Vehículo</InputLabel>
                  <Select
                    value={vehicle.type}
                    onChange={(e) => handleVehicleDataChange(index, 'type', e.target.value)}
                  >
                    <MenuItem value="car">Carro</MenuItem>
                    <MenuItem value="motorcycle">Moto</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    label="Placa"
                    value={vehicle.licensePlate}
                    onChange={(e) => handleVehicleDataChange(index, 'licensePlate', e.target.value.toUpperCase())}
                    inputProps={{ maxLength: 6 }}
                    required
                  />
                  <PlateScanner onPlateDetected={(plate) => handlePlateDetected(plate, index)} />
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Marca"
                  value={vehicle.brand}
                  onChange={(e) => handleVehicleDataChange(index, 'brand', e.target.value)}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Modelo"
                  value={vehicle.model}
                  onChange={(e) => handleVehicleDataChange(index, 'model', e.target.value)}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Línea"
                  value={vehicle.line}
                  onChange={(e) => handleVehicleDataChange(index, 'line', e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Color"
                  value={vehicle.color}
                  onChange={(e) => handleVehicleDataChange(index, 'color', e.target.value)}
                  required
                />
              </Grid>
            </Grid>
            
            {vehicleData.vehicles.length > 1 && (
              <Button
                color="error"
                onClick={() => removeVehicle(index)}
                sx={{ mt: 1 }}
              >
                Eliminar Vehículo
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
      
      <Button
        variant="outlined"
        onClick={addVehicle}
        startIcon={<DirectionsCar />}
      >
        Agregar Otro Vehículo
      </Button>
    </Box>
  );

  const renderLicenseInfo = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Licencia de Conducción
        </Typography>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Número de Licencia"
          value={licenseData.licenseNumber}
          onChange={(e) => setLicenseData(prev => ({ ...prev, licenseNumber: e.target.value }))}
          required
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="date"
          label="Fecha de Vencimiento"
          value={licenseData.expiryDate}
          onChange={(e) => setLicenseData(prev => ({ ...prev, expiryDate: e.target.value }))}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="body2" gutterBottom>
          Categorías (seleccione las que apliquen):
        </Typography>
        {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((category) => (
          <Button
            key={category}
            variant={licenseData.categories.includes(category) ? 'contained' : 'outlined'}
            size="small"
            sx={{ mr: 1, mb: 1 }}
            onClick={() => {
              const categories = licenseData.categories.includes(category)
                ? licenseData.categories.filter(c => c !== category)
                : [...licenseData.categories, category];
              setLicenseData(prev => ({ ...prev, categories }));
            }}
          >
            {category}
          </Button>
        ))}
      </Grid>
    </Grid>
  );

  const renderConfirmation = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Confirmación de Datos
      </Typography>
      
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="h6">¡Registro Exitoso!</Typography>
          El funcionario ha sido registrado correctamente en el sistema.
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Información Personal:
            </Typography>
            <Typography>Nombre: {personalData.fullName}</Typography>
            <Typography>Documento: {personalData.documentNumber}</Typography>
            <Typography>Cargo: {personalData.position}</Typography>
            <Typography>Área: {personalData.workArea}</Typography>
            
            <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
              Vehículos:
            </Typography>
            {vehicleData.vehicles.map((vehicle, index) => (
              <Box key={index} sx={{ ml: 2 }}>
                <Typography>
                  {index + 1}. {vehicle.type === 'car' ? 'Carro' : 'Moto'} - 
                  Placa: {vehicle.licensePlate} - 
                  {vehicle.brand} {vehicle.model}
                </Typography>
              </Box>
            ))}
            
            <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
              Licencia:
            </Typography>
            <Typography>Número: {licenseData.licenseNumber}</Typography>
            <Typography>Vencimiento: {licenseData.expiryDate}</Typography>
            <Typography>Categorías: {licenseData.categories.join(', ')}</Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderFacialRecognition();
      case 2:
        return renderVehicleInfo();
      case 3:
        return renderLicenseInfo();
      case 4:
        return renderConfirmation();
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Registro de Funcionarios
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {renderStepContent()}
        
        {!success && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              startIcon={<NavigateBefore />}
            >
              Anterior
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={<Save />}
              >
                {loading ? 'Registrando...' : 'Registrar Funcionario'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<NavigateNext />}
              >
                Siguiente
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default EmployeeRegistration;