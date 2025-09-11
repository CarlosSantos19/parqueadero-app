import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, Toolbar, Typography, Button, Box, useMediaQuery } from '@mui/material';
import AccessControl from './AccessControl';
import VisitorControl from './VisitorControl';
import EmployeeRegistration from './EmployeeRegistration';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#764ba2',
      dark: '#4c63d2',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f093fb',
      light: '#f5a2ff',
      dark: '#e67ce6',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont', 
      'Segoe UI',
      'Roboto',
      'Inter',
      'sans-serif'
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    ...Array(19).fill('0 25px 50px -12px rgb(0 0 0 / 0.25)')
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiContainer: {
      defaultProps: {
        maxWidth: 'lg',
      },
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          '@media (max-width:600px)': {
            paddingLeft: 12,
            paddingRight: 12,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          fontSize: '1rem',
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 8px 0 rgb(0 0 0 / 0.12)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            background: 'rgba(102, 126, 234, 0.04)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            fontSize: '16px',
            padding: '14px 16px',
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#ffffff',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 8px 0 rgb(0 0 0 / 0.08)',
            },
            '&.Mui-focused': {
              boxShadow: '0 4px 12px 0 rgb(102 126 234 / 0.15)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 20,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          color: '#1e293b',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid',
          '&.MuiAlert-standardSuccess': {
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            color: '#059669',
          },
          '&.MuiAlert-standardWarning': {
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderColor: 'rgba(245, 158, 11, 0.3)',
            color: '#d97706',
          },
          '&.MuiAlert-standardError': {
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#dc2626',
          },
        },
      },
    },
  },
});

function App() {
  const [currentView, setCurrentView] = useState('access');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 70, sm: 80 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
              }}
            >
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                P
              </Typography>
            </Box>
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              component="div"
              sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {isMobile ? 'Parqueadero' : 'Sistema Parqueadero'}
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            backgroundColor: 'rgba(102, 126, 234, 0.08)',
            borderRadius: '16px',
            p: 0.5,
          }}>
            <Button
              variant={currentView === 'access' ? 'contained' : 'text'}
              onClick={() => setCurrentView('access')}
              size="small"
              sx={{
                minWidth: isMobile ? 60 : 80,
                borderRadius: '12px',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: 600,
                color: currentView === 'access' ? 'white' : '#667eea',
                ...(currentView === 'access' && {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 8px 0 rgb(102 126 234 / 0.3)',
                }),
              }}
            >
              {isMobile ? 'Acceso' : 'Acceso'}
            </Button>
            <Button
              variant={currentView === 'visitor' ? 'contained' : 'text'}
              onClick={() => setCurrentView('visitor')}
              size="small"
              sx={{
                minWidth: isMobile ? 60 : 80,
                borderRadius: '12px',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: 600,
                color: currentView === 'visitor' ? 'white' : '#667eea',
                ...(currentView === 'visitor' && {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 8px 0 rgb(102 126 234 / 0.3)',
                }),
              }}
            >
              Visitas
            </Button>
            <Button
              variant={currentView === 'registration' ? 'contained' : 'text'}
              onClick={() => setCurrentView('registration')}
              size="small"
              sx={{
                minWidth: isMobile ? 60 : 80,
                borderRadius: '12px',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: 600,
                color: currentView === 'registration' ? 'white' : '#667eea',
                ...(currentView === 'registration' && {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 8px 0 rgb(102 126 234 / 0.3)',
                }),
              }}
            >
              Registro
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      
      {currentView === 'access' && <AccessControl />}
      {currentView === 'visitor' && <VisitorControl />}
      {currentView === 'registration' && <EmployeeRegistration />}
    </ThemeProvider>
  );
}

export default App;