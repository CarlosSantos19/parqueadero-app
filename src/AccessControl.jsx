import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  Box,
  Card,
  CardContent,
  Chip,
  Avatar
} from '@mui/material';
import { 
  DirectionsCar, 
  TwoWheeler, 
  CheckCircle, 
  Error,
  CameraAlt
} from '@mui/icons-material';
import PlateScanner from './PlateScanner';

const AccessControl = () => {
  const [currentMode, setCurrentMode] = useState('employee'); // employee, visitor
  const [licensePlate, setLicensePlate] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFirstThursday, setIsFirstThursday] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    checkFirstThursday();
  }, []);

  const checkFirstThursday = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstThursday = new Date(firstDay);
    
    // Encontrar primer jueves
    while (firstThursday.getDay() !== 4) {
      firstThursday.setDate(firstThursday.getDate() + 1);
    }
    
    setIsFirstThursday(
      today.toDateString() === firstThursday.toDateString()
    );
  };

  const handlePlateDetected = async (detectedPlate) => {
    setLicensePlate(detectedPlate);
    await validateAccess(detectedPlate);
  };

  const validateAccess = async (plate) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/access/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          licensePlate: plate,
          accessType: currentMode 
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setScanResult({
          ...result.data,
          status: 'success',
          timestamp: new Date()
        });
      } else {
        setScanResult({
          status: 'error',
          message: result.message,
          requiresSpecialPermit: result.requiresSpecialPermit,
          timestamp: new Date()
        });
      }
    } catch (err) {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const registerEntry = async () => {
    if (!scanResult || scanResult.status !== 'success') return;
    
    try {
      const response = await fetch('/api/access/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          licensePlate: licensePlate,
          entryType: 'manual_confirmation'
        })
      });

      if (response.ok) {
        setScanResult(prev => ({ ...prev, registered: true }));
      }
    } catch (err) {
      setError('Error registrando entrada');
    }
  };

  const clearScan = () => {
    setScanResult(null);
    setLicensePlate('');
    setError(null);
  };

  return (
    <Box sx={{ 
      minHeight: 'calc(100vh - 80px)',
      background: 'transparent',
      py: { xs: 2, sm: 3 }
    }}>
      <Container maxWidth="md">
        {/* Hero Section */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 4,
          px: { xs: 1, sm: 2 }
        }}>
          <Box
            sx={{
              width: { xs: 80, sm: 100 },
              height: { xs: 80, sm: 100 },
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              boxShadow: '0 20px 40px -12px rgba(102, 126, 234, 0.4)',
            }}
          >
            <DirectionsCar sx={{ fontSize: { xs: 40, sm: 50 }, color: 'white' }} />
          </Box>
          
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              mb: 1
            }}
          >
            Control de Acceso
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: { xs: '0.9rem', sm: '1rem' },
              maxWidth: 400,
              mx: 'auto'
            }}
          >
            Validación rápida y segura para funcionarios y visitantes
          </Typography>
          
          {isFirstThursday && (
            <Alert 
              severity="warning" 
              sx={{ 
                mt: 3, 
                borderRadius: 3,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                fontWeight: 500,
              }}
            >
              <strong>Restricción Activa:</strong> Primer jueves del mes - Solo acceso con permiso especial
            </Alert>
          )}
        </Box>

        {/* Selector de modo */}
        <Paper sx={{ 
          p: 3, 
          mb: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <Typography 
            variant="h6" 
            align="center" 
            gutterBottom
            sx={{ 
              fontWeight: 600,
              color: '#1e293b',
              mb: 3
            }}
          >
            Tipo de Usuario
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            justifyContent: 'center',
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <Button
              variant={currentMode === 'employee' ? 'contained' : 'outlined'}
              onClick={() => setCurrentMode('employee')}
              startIcon={<DirectionsCar />}
              size="large"
              sx={{
                py: 2,
                px: 4,
                borderRadius: 3,
                fontWeight: 600,
                fontSize: '1rem',
                minHeight: 60,
                background: currentMode === 'employee' ? 
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                  'transparent',
                borderColor: '#10b981',
                color: currentMode === 'employee' ? 'white' : '#10b981',
                '&:hover': {
                  background: currentMode === 'employee' ? 
                    'linear-gradient(135deg, #059669 0%, #047857 100%)' :
                    'rgba(16, 185, 129, 0.1)',
                  borderColor: '#10b981',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
                },
              }}
            >
              Funcionarios
            </Button>
            <Button
              variant={currentMode === 'visitor' ? 'contained' : 'outlined'}
              onClick={() => setCurrentMode('visitor')}
              startIcon={<TwoWheeler />}
              size="large"
              sx={{
                py: 2,
                px: 4,
                borderRadius: 3,
                fontWeight: 600,
                fontSize: '1rem',
                minHeight: 60,
                background: currentMode === 'visitor' ? 
                  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 
                  'transparent',
                borderColor: '#f59e0b',
                color: currentMode === 'visitor' ? 'white' : '#f59e0b',
                '&:hover': {
                  background: currentMode === 'visitor' ? 
                    'linear-gradient(135deg, #d97706 0%, #b45309 100%)' :
                    'rgba(245, 158, 11, 0.1)',
                  borderColor: '#f59e0b',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 16px rgba(245, 158, 11, 0.3)',
                },
              }}
            >
              Visitantes
            </Button>
          </Box>
        </Paper>

      {/* Scanner de placas */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Detección de Placa
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center" mb={2}>
          <TextField
            label="Placa del vehículo"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
            placeholder="ABC123"
            inputProps={{ maxLength: 6 }}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={() => setShowCamera(!showCamera)}
            startIcon={<CameraAlt />}
          >
            Scanner
          </Button>
        </Box>

        {showCamera && (
          <Box mb={2}>
            <PlateScanner onPlateDetected={handlePlateDetected} />
          </Box>
        )}

        <Button
          variant="contained"
          onClick={() => validateAccess(licensePlate)}
          disabled={!licensePlate || loading}
          fullWidth
        >
          {loading ? 'Validando...' : 'Validar Acceso'}
        </Button>
      </Paper>

      {/* Resultado del escaneo */}
      {scanResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {scanResult.status === 'success' ? (
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              ) : (
                <Error color="error" sx={{ fontSize: 40 }} />
              )}
              
              <Box flex={1}>
                <Typography variant="h6">
                  {scanResult.status === 'success' ? 'Acceso Autorizado' : 'Acceso Denegado'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {scanResult.timestamp?.toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {scanResult.status === 'success' ? (
              <Box>
                <Box display="flex" gap={2} mb={2}>
                  <Avatar sx={{ width: 60, height: 60 }}>
                    {scanResult.driverName?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{scanResult.driverName}</Typography>
                    <Typography variant="body2">
                      {scanResult.vehicleType === 'car' ? 'Automóvil' : 'Motocicleta'}
                    </Typography>
                    <Chip 
                      label={scanResult.licensePlate} 
                      size="small" 
                      color="primary" 
                    />
                  </Box>
                </Box>

                {!scanResult.registered && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={registerEntry}
                    fullWidth
                  >
                    Confirmar Entrada
                  </Button>
                )}

                {scanResult.registered && (
                  <Alert severity="success">
                    Entrada registrada exitosamente
                  </Alert>
                )}
              </Box>
            ) : (
              <Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {scanResult.message}
                </Alert>
                
                {scanResult.requiresSpecialPermit && (
                  <Button variant="outlined" fullWidth>
                    Solicitar Permiso Especial
                  </Button>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error general */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Botón para limpiar */}
      {(scanResult || error) && (
        <Button variant="outlined" onClick={clearScan} fullWidth>
          Nueva Validación
        </Button>
      )}
    </Container>
    </Box>
  );
};

export default AccessControl;