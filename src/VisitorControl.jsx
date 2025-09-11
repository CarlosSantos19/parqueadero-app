import React, { useState } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Box,
  Typography,
  Alert
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

const VisitorControl = () => {
  const [visitorData, setVisitorData] = useState({
    name: '',
    documentNumber: '',
    licensePlate: '',
    purpose: '',
    destinationArea: '',
    companions: ''
  });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateVisitorPass = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/visitors/generate-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(visitorData)
      });

      const result = await response.json();
      if (result.success) {
        setQrCode(result.qrCode);
      }
    } catch (err) {
      console.error('Error generating visitor pass:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setVisitorData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Control de Visitantes
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Nombre completo del visitante"
            value={visitorData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
          />
          
          <TextField
            label="Número de documento"
            value={visitorData.documentNumber}
            onChange={(e) => handleInputChange('documentNumber', e.target.value)}
            required
          />
          
          <TextField
            label="Placa del vehículo"
            value={visitorData.licensePlate}
            onChange={(e) => handleInputChange('licensePlate', e.target.value.toUpperCase())}
            required
          />
          
          <TextField
            label="Motivo de la visita"
            value={visitorData.purpose}
            onChange={(e) => handleInputChange('purpose', e.target.value)}
            multiline
            rows={2}
            required
          />
          
          <TextField
            label="Área de destino"
            value={visitorData.destinationArea}
            onChange={(e) => handleInputChange('destinationArea', e.target.value)}
            required
          />
          
          <TextField
            label="Acompañantes (separados por coma)"
            value={visitorData.companions}
            onChange={(e) => handleInputChange('companions', e.target.value)}
            placeholder="Juan Pérez, María García"
          />

          <Button
            variant="contained"
            onClick={generateVisitorPass}
            disabled={loading || !visitorData.name || !visitorData.licensePlate}
            size="large"
          >
            {loading ? 'Generando...' : 'Generar Pase de Visitante'}
          </Button>
        </Box>

        {qrCode && (
          <Box mt={4} textAlign="center">
            <Alert severity="success" sx={{ mb: 2 }}>
              Pase de visitante generado exitosamente
            </Alert>
            
            <Paper sx={{ p: 3, display: 'inline-block' }}>
              <QRCodeSVG 
                value={qrCode} 
                size={200}
                level="M"
                includeMargin={true}
              />
              <Typography variant="h6" mt={2}>
                Código QR del Visitante
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Válido por hoy - {visitorData.name}
              </Typography>
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default VisitorControl;