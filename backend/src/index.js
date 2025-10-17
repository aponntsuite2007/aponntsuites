/**
 * Sistema de Asistencia Biométrico v1.0
 * Servidor Principal
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Importar configuraciones y utilidades
const database = require('./config/database');
const websocket = require('./config/websocket');
const cronJobs = require('./utils/cronJobs');
const vendorAutomationService = require('./services/vendorAutomationService');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const faceAuthRoutes = require('./routes/faceAuthRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const kioskRoutes = require('./routes/kioskRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const branchRoutes = require('./routes/branchRoutes');
const reportRoutes = require('./routes/reportRoutes');
const configRoutes = require('./routes/configRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { medicalRouter: medicalRoutes, adminRouter: adminRoutes } = require('./routes/medicalRoutes-simple');
const aponntDashboardRoutes = require('./routes/aponntDashboard');
const vendorAutomationRoutes = require('./routes/vendorAutomationRoutes');

// Rutas del Sistema de Notificaciones Avanzado V2.0
const complianceRoutes = require('./routes/compliance');
const slaRoutes = require('./routes/sla');
const resourceCenterRoutes = require('./routes/resourceCenter');
const proactiveRoutes = require('./routes/proactive');
const auditReportsRoutes = require('./routes/auditReports');
const inboxRoutes = require('./routes/inbox');

// Crear aplicación Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Configurar middlewares globales
// app.use(helmet()); // Desactivado temporalmente para permitir JavaScript inline
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV === 'production') {
  const logStream = fs.createWriteStream(
    path.join(__dirname, '../logs/access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: logStream }));
} else {
  app.use(morgan('dev'));
}

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/docs', express.static(path.join(__dirname, '../../docs')));
app.use(express.static(path.join(__dirname, '../public')));

// Configurar WebSocket
websocket.initialize(io);
app.set('io', io);

// Rutas de la API
const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/face-auth`, faceAuthRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/departments`, departmentRoutes);
app.use(`${apiPrefix}/kiosks`, kioskRoutes);
app.use(`${apiPrefix}/attendance`, attendanceRoutes);
app.use(`${apiPrefix}/shifts`, shiftRoutes);
app.use(`${apiPrefix}/branches`, branchRoutes);
app.use(`${apiPrefix}/reports`, reportRoutes);
app.use(`${apiPrefix}/config`, configRoutes);
app.use(`${apiPrefix}/messages`, messageRoutes);
app.use(`${apiPrefix}/medical`, medicalRoutes);
app.use(`${apiPrefix}/admin`, adminRoutes);
app.use('/api/aponnt', aponntDashboardRoutes);
app.use(`${apiPrefix}/vendor-automation`, vendorAutomationRoutes);

// Rutas del Sistema de Notificaciones Avanzado V2.0
app.use('/api/compliance', complianceRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/resources', resourceCenterRoutes);
app.use('/api/proactive', proactiveRoutes);
app.use('/api/audit-reports', auditReportsRoutes);
app.use('/api/inbox', inboxRoutes);

// Ruta de estado del sistema
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    database: database.isConnected() ? 'Connected' : 'Disconnected',
    websocket: io.engine.clientsCount || 0
  });
});

// Ruta de health para API (compatibilidad con frontend)
app.get(`${apiPrefix}/health`, (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    database: database.isConnected() ? 'Connected' : 'Disconnected',
    websocket: io.engine.clientsCount || 0,
    message: 'Servidor funcionando correctamente'
  });
});

// Ruta principal - Redirigir al launcher
app.get('/', (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  
  // Si es un navegador, mostrar el launcher
  if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
    res.redirect('/launcher-working.html');
  } else {
    // Si es una API call, devolver JSON
    res.json({
      company: 'APONNT',
      name: 'Sistema de Asistencia Biométrico',
      version: '1.0.0',
      status: 'Running',
      documentation: '/docs',
      api: apiPrefix,
      admin: '/admin-working.html',
      launcher: '/launcher-working.html',
      contact: {
        owner: 'Valentino Rivas Jordan',
        phone: '+11-2657-673741',
        email: 'contacto@aponnt.com',
        whatsapp: '+11-2657-673741',
        website: 'https://aponnt.com'
      },
      features: {
        biometric: true,
        gps: true,
        realtime: true,
        excel: true,
        multiShift: true,
        multiBranch: true,
        notifications: true,
        whatsapp: true
      },
      timestamp: new Date()
    });
  }
});

// Ruta específica para admin
app.get('/admin', (req, res) => {
  res.redirect('/panel-empresa.html');
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Log del error
  const errorLog = `${new Date().toISOString()} - ${err.stack}\n`;
  fs.appendFileSync(
    path.join(__dirname, '../logs/error.log'),
    errorLog
  );
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Inicializar base de datos y servidor
async function startServer() {
  try {
    // Conectar base de datos
    await database.connect();
    console.log('✅ Base de datos conectada');
    
    // Sincronizar modelos
    await database.sync();
    console.log('✅ Modelos sincronizados');
    
    // Endpoint básico para test de BD que necesita el admin panel
    app.get('/api/v1/test-db', async (req, res) => {
      try {
        const { sequelize } = require('./config/database');
        await sequelize.authenticate();
        
        const [results] = await sequelize.query('SHOW TABLES');
        
        res.json({
          success: true,
          message: 'Conexión PostgreSQL exitosa',
          tablesCount: results.length,
          timestamp: new Date()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date()
        });
      }
    });
    
    // Iniciar trabajos programados
    cronJobs.start();
    console.log('✅ Trabajos programados iniciados');

    // Iniciar sistema de automatización de vendedores
    await vendorAutomationService.startAutomationSystem();
    console.log('🤖 Sistema de automatización de vendedores iniciado');
    
    // Iniciar servidor
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';
    
    server.listen(PORT, HOST, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     SISTEMA DE ASISTENCIA BIOMÉTRICO v1.0                ║
║     Servidor iniciado exitosamente                       ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║     🌐 URL: http://${HOST}:${PORT}                       ║
║     📁 Modo: ${process.env.CONNECTION_MODE}              ║
║     💾 Base de datos: ${process.env.DB_DIALECT}          ║
║     🔌 WebSocket: Activo                                 ║
║     ⏰ Zona horaria: ${process.env.TIMEZONE}             ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║     📊 Panel Admin: http://${HOST}:${PORT}/admin         ║
║     📖 Documentación: http://${HOST}:${PORT}/docs        ║
║     🔍 Estado: http://${HOST}:${PORT}/health             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  console.log('⏹️ Señal SIGTERM recibida, cerrando servidor...');
  await database.close();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n⏹️ Señal SIGINT recibida, cerrando servidor...');
  await database.close();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

// Iniciar servidor
startServer();
