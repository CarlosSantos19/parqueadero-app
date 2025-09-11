# 🚗 Sistema de Control de Parqueadero

Aplicación web móvil profesional para gestión y control de acceso vehicular con registro de funcionarios y visitantes.

## 🚀 Características Principales

### ✅ **Registro Completo de Personas y Vehículos**
- **Información Personal**: Nombre, documento (cédula/extranjería), cargo, área de trabajo
- **Reconocimiento Facial**: Captura en tiempo real para identificación
- **Información Vehicular**: Tipo, placa, marca, modelo, línea, color
- **Validación de Licencia**: Número, vigencia, categorías (A1, A2, B1, B2, C1, C2)
- **Soporte Multi-vehículo**: Un funcionario puede registrar múltiples vehículos

### 🔐 **Control de Acceso Inteligente**
- **Scanner de Placas**: OCR automático con cámara
- **Validación en Tiempo Real**: Verificación de funcionarios y visitantes
- **Restricción Primer Jueves**: Acceso especial primer jueves del mes
- **Registro de Entradas/Salidas**: Log completo de accesos
- **Control de Visitantes**: QR codes temporales

### 📱 **Optimizado para Móvil**
- **PWA (Progressive Web App)**: Instalable como app nativa
- **Responsive Design**: Funciona perfectamente en móviles y tablets
- **Offline Capability**: Service worker para funcionalidad offline
- **Touch Optimized**: Interfaz táctil profesional

## 🏗️ Arquitectura

### **Frontend**
- **React 18** con hooks modernos
- **Material-UI (MUI)** para componentes profesionales
- **Responsive Design** mobile-first
- **PWA capabilities** con service worker
- **Camera Integration** para escáner de placas y reconocimiento facial

### **Backend**
- **Node.js + Express** servidor robusto
- **MongoDB** base de datos escalable
- **JWT Authentication** seguridad de tokens
- **Tesseract.js** OCR para reconocimiento de placas
- **Multer + Sharp** procesamiento de imágenes
- **Rate Limiting + Helmet** seguridad avanzada

## 📂 Estructura del Proyecto

```
parqueadero/
├── src/                          # Frontend React
│   ├── AccessControl.jsx         # Control de acceso principal
│   ├── EmployeeRegistration.jsx  # Registro de funcionarios
│   ├── PlateScanner.jsx         # Scanner de placas OCR
│   ├── VisitorControl.jsx       # Control de visitantes
│   └── App.js                   # App principal con PWA
├── server/                      # Backend API
│   ├── models/                  # Modelos MongoDB
│   │   ├── Employee.js          # Modelo de funcionarios
│   │   ├── Visitor.js           # Modelo de visitantes
│   │   └── AccessLog.js         # Log de accesos
│   ├── routes/                  # Rutas API
│   │   ├── auth.js              # Autenticación
│   │   ├── employees.js         # CRUD funcionarios
│   │   ├── access.js            # Control de acceso
│   │   ├── visitors.js          # Gestión visitantes
│   │   ├── ocr.js               # Reconocimiento OCR
│   │   └── vehicles.js          # Gestión vehículos
│   ├── middleware/              # Middleware
│   │   ├── auth.js              # Autenticación JWT
│   │   └── upload.js            # Subida de archivos
│   └── server.js                # Servidor principal
├── public/
│   ├── manifest.json            # PWA manifest
│   └── sw.js                    # Service worker
└── package.json
```

## 🛠️ Instalación y Configuración

### **Requisitos Previos**
- Node.js 16+
- MongoDB 5+
- Cámara web/móvil para funcionalidades de escaneo

### **1. Clonar e Instalar Dependencias**

```bash
# Frontend
npm install

# Backend
cd server
npm install
```

### **2. Configurar Variables de Entorno**

Copia `server/.env.example` a `server/.env` y configura:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/parqueadero

# JWT
JWT_SECRET=tu-clave-secreta-super-segura
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# OCR
TESSERACT_LANG=spa
TESSERACT_PSM=8

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

### **3. Inicializar Base de Datos**

```bash
# Asegurar que MongoDB esté corriendo
mongod

# El servidor creará las colecciones automáticamente
```

### **4. Ejecutar la Aplicación**

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
npm start
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 📋 Uso de la Aplicación

### **1. Configuración Inicial**
```bash
# Crear usuario administrador (ejecutar una vez)
POST http://localhost:5000/api/auth/setup-admin
Content-Type: application/json

{
  "fullName": "Administrador Sistema",
  "documentNumber": "12345678",
  "username": "admin",
  "password": "admin123"
}
```

### **2. Flujo de Registro de Funcionarios**
1. **Navegar a "Registro"**
2. **Completar 5 pasos**:
   - ℹ️ Información Personal
   - 📷 Reconocimiento Facial  
   - 🚗 Información del Vehículo
   - 🆔 Licencia de Conducción
   - ✅ Confirmación
3. **Guardar registro**

### **3. Flujo de Control de Acceso**
1. **Navegar a "Control de Acceso"**
2. **Seleccionar modo** (Funcionario/Visitante)
3. **Escanear placa** o ingresar manualmente
4. **Validar acceso** automáticamente
5. **Confirmar entrada** si es autorizada

### **4. Gestión de Visitantes**
1. **Navegar a "Visitantes"**
2. **Completar formulario** de registro
3. **Generar QR code** temporal
4. **Validar en control de acceso**

## 🔧 API Endpoints

### **Autenticación**
```
POST /api/auth/login           # Login
POST /api/auth/setup-admin     # Crear admin inicial
GET  /api/auth/me              # Perfil usuario
```

### **Funcionarios**
```
POST /api/employees/register   # Registrar funcionario
GET  /api/employees           # Listar funcionarios
GET  /api/employees/:id       # Obtener funcionario
PUT  /api/employees/:id       # Actualizar funcionario
```

### **Control de Acceso**
```
POST /api/access/validate     # Validar acceso por placa
POST /api/access/entry        # Registrar entrada
POST /api/access/exit         # Registrar salida
GET  /api/access/occupancy    # Ocupación actual
GET  /api/access/logs         # Historial de accesos
```

### **OCR**
```
POST /api/ocr/plate           # Reconocer placa
POST /api/ocr/batch           # Procesar múltiples imágenes
GET  /api/ocr/health          # Estado del servicio OCR
```

### **Visitantes**
```
POST /api/visitors/generate-pass  # Generar pase
GET  /api/visitors/today          # Visitantes de hoy
POST /api/visitors/validate-qr    # Validar QR
```

## 🔒 Seguridad

- **JWT Authentication** con expiración configurable
- **Rate Limiting** para prevenir ataques
- **Helmet.js** para headers de seguridad
- **Validación de archivos** con tipos permitidos
- **Hashing de contraseñas** con bcrypt
- **CORS** configurado para orígenes específicos

## 📊 Características Técnicas

### **Performance**
- **Compresión** de respuestas HTTP
- **Optimización de imágenes** con Sharp
- **Caching** con service worker
- **Lazy loading** de componentes

### **Mobile Features**
- **Instalable** como PWA
- **Offline support** básico
- **Touch gestures** optimizados
- **Responsive breakpoints** móvil-first

### **OCR Avanzado**
- **Tesseract.js** para reconocimiento
- **Patrones colombianos** de placas
- **Preprocesamiento** de imágenes
- **Múltiples formatos** soportados

## 🚀 Despliegue en Producción

### **Variables de Entorno Producción**
```env
NODE_ENV=production
MONGODB_URI=mongodb://tu-cluster-mongodb
JWT_SECRET=clave-super-secura-produccion
ALLOWED_ORIGINS=https://tu-dominio.com
```

### **Docker (Opcional)**
```dockerfile
# Dockerfile disponible para containerización
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- **Issues**: Crear issue en GitHub
- **Documentación**: Ver carpeta `/docs`
- **API Docs**: http://localhost:5000/api/health

---

**Desarrollado con ❤️ para gestión profesional de parqueaderos**