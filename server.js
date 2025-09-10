  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const mysql = require('mysql2/promise');
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const helmet = require('helmet');
  const compression = require('compression');
  const rateLimit = require('express-rate-limit');
  require('dotenv').config();

  const app = express();
  const PORT = process.env.PORT || 3000;

  // Configurar trust proxy para Railway
  app.set('trust proxy', 1);

  // Seguridad y middlewares
  app.use(helmet());
  app.use(compression());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Rate limiting (configurado para Railway)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    trustProxy: true
  });
  app.use(limiter);

// Debug: mostrar variables de entorno
  console.log('🔍 Database config debug:');
  console.log('MYSQL_HOST:', process.env.MYSQL_HOST);
  console.log('MYSQL_USER:', process.env.MYSQL_USER);
  console.log('MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? 'SET' : 'UNDEFINED');
  console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE);

  const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'railway',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    ssl: false,
    connectTimeout: 10000
  };

  console.log('📋 Final dbConfig:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port
  });

// Configuración temporal hardcodeada para Railway
  const dbConfig = {
    host: 'mysql.railway.internal',
    user: 'root',
    password: 'FEWWeVRNSWJuPwnFECjhwWNrKFbZeQBf',  // <-- PON TU PASSWORD AQUÍ
    database: 'railway',
    port: 3306,
    ssl: false,
    connectTimeout: 30000,
    timeout: 30000
  };

  // Crear conexión a base de datos
  let db;
  mysql.createConnection(dbConfig).then(connection => {
    db = connection;
    console.log('✅ Connected to MySQL database');
  }).catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

  // Página principal
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <title>AponntSuites - Sistema RRHH</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { font-size: 3em; margin-bottom: 10px; }
          .subtitle { font-size: 1.2em; opacity: 0.9; margin-bottom: 40px; }
          .status {
            background: rgba(255,255,255,0.2);
            padding: 30px;
            border-radius: 15px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
          }
          .btn {
            display: inline-block;
            margin: 10px;
            padding: 15px 30px;
            background: rgba(255,255,255,0.2);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.3s;
            border: 1px solid rgba(255,255,255,0.3);
          }
          .btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
          }
          .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
          }
          .feature {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎉 AponntSuites</h1>
          <p class="subtitle">Sistema Integral de Administración de Recursos Humanos</p>

          <div class="status">
            <h2>✅ Sistema funcionando correctamente</h2>
            <p>🌐 Servidor: Puerto ${PORT}</p>
            <p>🕐 Timestamp: ${new Date().toLocaleString('es-AR')}</p>
            <p>🔒 Base de datos: ${db ? 'Conectada' : 'Desconectada'}</p>
          </div>

          <div style="margin: 30px 0;">
            <a href="/admin" class="btn">📊 Panel Administrativo</a>
            <a href="/api/health" class="btn">🔧 Estado del Sistema</a>
          </div>

          <div class="features">
            <div class="feature">
              <h3>👥 Gestión de Personal</h3>
              <p>Control completo de empleados, departamentos y roles</p>
            </div>
            <div class="feature">
              <h3>📝 Control de Asistencia</h3>
              <p>Registro biométrico y manual de entrada/salida</p>
            </div>
            <div class="feature">
              <h3>📊 Reportes Avanzados</h3>
              <p>Analytics detallados y exportación de datos</p>
            </div>
            <div class="feature">
              <h3>🔐 Seguridad Integral</h3>
              <p>Autenticación segura y control de accesos</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: db ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  });

  // API básico para testing
  app.get('/api/status', (req, res) => {
    res.json({
      success: true,
      message: 'AponntSuites API funcionando',
      services: {
        web: 'online',
        database: db ? 'connected' : 'disconnected',
        auth: 'ready'
      }
    });
  });

  // Ruta para panel admin (placeholder)
  app.get('/admin', (req, res) => {
    res.send(`
      <h1>Panel Administrativo - AponntSuites</h1>
      <p>🚧 Panel de administración en desarrollo</p>
      <a href="/">← Volver al inicio</a>
    `);
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Ruta no encontrada',
      available_routes: ['/', '/api/health', '/api/status', '/admin']
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  // Iniciar servidor
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AponntSuites running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
// Force redeploy with MYSQL vars - timestamp: 2025-09-09
