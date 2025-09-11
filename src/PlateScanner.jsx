import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';

const PlateScanner = ({ onPlateDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Cámara trasera en móviles
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Convertir a blob para enviar al servidor
    canvas.toBlob(async (blob) => {
      try {
        const formData = new FormData();
        formData.append('image', blob, 'plate.jpg');

        const response = await fetch('/api/ocr/plate', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const result = await response.json();
        if (result.success && result.plate) {
          onPlateDetected(result.plate);
        }
      } catch (err) {
        console.error('Error processing image:', err);
      } finally {
        setIsScanning(false);
      }
    }, 'image/jpeg', 0.8);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Scanner de Placas
      </Typography>
      
      <Box position="relative" mb={2}>
        <video
          ref={videoRef}
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
        
        {/* Overlay de guía para posicionar la placa */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          width="60%"
          height="20%"
          border="2px solid #fff"
          borderRadius="4px"
          sx={{
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }}
        />
      </Box>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <Button
        variant="contained"
        onClick={captureFrame}
        disabled={isScanning}
        fullWidth
      >
        {isScanning ? 'Procesando...' : 'Capturar Placa'}
      </Button>

      <Typography variant="caption" display="block" textAlign="center" mt={1}>
        Posicione la placa dentro del recuadro blanco
      </Typography>
    </Box>
  );
};

export default PlateScanner;