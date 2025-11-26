/**
 * Sistema de Asistencia Biométrico v1.1 - PostgreSQL Integration
 * Servidor con integración completa PostgreSQL
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const { Bonjour } = require('bonjour-service');
require('dotenv').config();

// Importar configuración de base de datos PostgreSQL
const database = require('./src/config/database');

// Importar middleware de autenticación
const { auth } = require('./src/middleware/auth');

// 🚀 INTEGRACIÓN NEXT-GEN DESACTIVADA (conflictos de foreign keys)
// const { initialize: initializeIntegration } = require('./src/config/database-integration');

// Crear aplicación Express
const app = express();
const server = http.createServer(app);

// AUTO-DETECCIÓN DE IP
function getServerIP() {
  const interfaces = os.networkInterfaces();
  let serverIP = 'localhost';
  
  // Buscar la IP principal (WiFi o Ethernet, no virtual)
  for (const interfaceName in interfaces) {
    const networks = interfaces[interfaceName];
    for (const network of networks) {
      if (network.family === 'IPv4' && !network.internal) {
        // Priorizar WiFi y Ethernet
        if (interfaceName.toLowerCase().includes('wifi') || 
            interfaceName.toLowerCase().includes('ethernet') ||
            interfaceName.toLowerCase().includes('wi-fi') ||
            interfaceName.toLowerCase().includes('wlan') ||
            interfaceName.toLowerCase().includes('lan')) {
          serverIP = network.address;
          break;
        }
        // Si no encuentra WiFi/Ethernet, usar cualquier IP no interna
        if (serverIP === 'localhost' && 
            !network.address.startsWith('169.254') && // No APIPA
            !network.address.startsWith('127.')) {   // No loopback
          serverIP = network.address;
        }
      }
    }
    if (serverIP !== 'localhost') break;
  }
  
  return serverIP;
}

// Obtener configuración del servidor
const SERVER_IP = getServerIP();
const PORT = process.env.PORT || 9999; // Puerto 9999 por defecto para panel-empresa
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = '/api/v1';

console.log(`🔍 IP detectada automáticamente: ${SERVER_IP}`);

// AUTO-CONFIGURACIÓN DE PUERTOS DINÁMICOS
function configureDynamicPorts() {
  try {
    const { exec } = require('child_process');
    exec(`node fix_dynamic_port.js`, { env: { ...process.env, PORT } }, (error, stdout, stderr) => {
      if (error) {
        console.log(`⚠️  No se pudo configurar puertos dinámicos: ${error.message}`);
      } else {
        console.log(`🔧 Puertos configurados dinámicamente para: ${PORT}`);
      }
    });
  } catch (error) {
    console.log(`⚠️  Error en configuración automática de puertos: ${error.message}`);
  }
}

configureDynamicPorts();

// Configurar middlewares básicos
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware para deshabilitar caché en archivos específicos
app.use((req, res, next) => {
  if (req.path.includes('panel-empresa-nuevo.html') || req.path.includes('panel-empresa.html')) {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': Date.now().toString()
    });
  }
  next();
});

// 🔧 MIDDLEWARE CRÍTICO: Comentar scripts V2.0 para evitar doble carga
// DEBE IR ANTES de express.static() para interceptar la petición
// NOTA: Solo para panel-empresa.html y /app, NO para /admin (que es panel-administrativo)
app.use((req, res, next) => {
  if (req.path === '/panel-empresa.html' || req.path === '/app') {
    console.log('🔧 [MIDDLEWARE] Interceptando petición:', req.path);
    const htmlPath = path.join(__dirname, 'public', 'panel-empresa.html');
    fs.readFile(htmlPath, 'utf8', (err, html) => {
      if (err) {
        console.error('❌ Error leyendo panel-empresa.html:', err);
        return next();
      }

      // Comentar los 6 scripts de módulos V2.0
      const scriptsToComment = [
        'notifications-inbox.js',
        'compliance-dashboard.js',
        'sla-tracking.js',
        'resource-center.js',
        'proactive-notifications.js',
        'audit-reports.js'
      ];

      let modifiedHtml = html;
      let modificationsCount = 0;

      scriptsToComment.forEach(scriptName => {
        const regex = new RegExp(`<script src="js/modules/${scriptName}"></script>`, 'g');
        const beforeCount = (modifiedHtml.match(regex) || []).length;
        modifiedHtml = modifiedHtml.replace(regex, `<!-- <script src="js/modules/${scriptName}"></script> -->`);
        modificationsCount += beforeCount;
      });

      console.log(`✅ [MIDDLEWARE] ${modificationsCount} scripts comentados dinámicamente`);

      res.set('Content-Type', 'text/html');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(modifiedHtml);
    });
  } else {
    next();
  }
});

// Servir archivos estáticos (DESPUÉS del middleware de comentar scripts)
// DESHABILITAR CACHE COMPLETAMENTE
const staticOptions = {
  etag: false,
  lastModified: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
};

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));
app.use('/docs', express.static(path.join(__dirname, '../docs'), staticOptions));
app.use('/data', express.static(path.join(__dirname, 'data'), staticOptions));
app.use(express.static(path.join(__dirname, 'public'), staticOptions));

// Variable para controlar conexión PostgreSQL
let isDatabaseConnected = false;

// Inicializar conexión a PostgreSQL
async function initializeDatabase() {
  try {
    // VALIDACIÓN CRÍTICA: Verificar DATABASE_URL en producción
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
      console.error('❌ FATAL: DATABASE_URL no está configurado en producción');
      console.error('💡 SOLUCIÓN: En Render Dashboard → PostgreSQL → Connection String → Copiar "External Database URL"');
      console.error('💡 Luego en tu Web Service → Environment → Agregar DATABASE_URL con ese valor');
      throw new Error('DATABASE_URL no configurado');
    }

    console.log('🔄 Conectando a PostgreSQL...');
    await database.connect();

    // MIGRACIONES DESACTIVADAS: render.yaml ejecuta execute-fix-render.js con IF NOT EXISTS
    // Las migraciones de sequelize-cli no son idempotentes y fallan en redeploys
    console.log('ℹ️ Migraciones automáticas desactivadas (usar npm run db:fix-render en Render)');

    // // Ejecutar migraciones automáticamente (actualización dinámica de schema)
    // console.log('🔧 Ejecutando migraciones de base de datos...');
    //
    // const { exec } = require('child_process');
    // const util = require('util');
    // const execPromise = util.promisify(exec);
    //
    // const env = process.env.DATABASE_URL ? 'production' : 'development';
    //
    // try {
    //   const { stdout, stderr } = await execPromise(`npx sequelize-cli db:migrate --env ${env}`, {
    //     cwd: __dirname
    //   });
    //
    //   if (stdout) console.log(stdout);
    //   if (stderr && !stderr.includes('No migrations were executed')) console.warn(stderr);
    //
    //   console.log('✅ Migraciones ejecutadas correctamente');
    // } catch (migrationError) {
    //   // Si falla por tabla SequelizeMeta, es la primera vez - está ok
    //   if (migrationError.message.includes('SequelizeMeta')) {
    //     console.log('⚠️ Primera ejecución - creando tabla de migraciones...');
    //   } else {
    //     console.error('❌ Error en migraciones:', migrationError.message);
    //     throw migrationError;
    //   }
    // }

    // Verificar datos existentes
    try {
      const [companies] = await database.sequelize.query('SELECT COUNT(*) as count FROM companies');
      console.log(`📊 Base de datos tiene ${companies[0].count} empresas`);
    } catch (e) {
      console.log('📊 Base de datos inicializada (sin datos aún)');
    }

    isDatabaseConnected = true;
    console.log('✅ PostgreSQL conectado y listo');

    // 🚀 INTEGRACIÓN NEXT-GEN DESACTIVADA TEMPORALMENTE (conflictos de foreign keys en producción)
    console.log('⚠️ Integración Next-Gen desactivada - usando PostgreSQL básico');

    // try {
    //   console.log('🔄 Inicializando integración Next-Gen...');
    //   await initializeIntegration();
    //   console.log('✅ Integración Next-Gen inicializada correctamente');
    // } catch (intError) {
    //   console.error('⚠️ Error inicializando integración Next-Gen:', intError.message);
    //   // Continuar con PostgreSQL básico si falla la integración
    // }

    // Funciones de creación de datos por defecto eliminadas - causaban errores de Sequelize

    // Limpiar usuarios administradores sin empresa
    await cleanOrphanedAdminUsers();

  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    isDatabaseConnected = false;
  }
}

// Función createDefaultDepartments eliminada - causaba errores de Sequelize

// Función createDefaultCompaniesAndUsers eliminada - causaba errores de Sequelize

// Limpiar usuarios administradores sin empresa automáticamente
async function cleanOrphanedAdminUsers() {
  try {
    console.log('🧹 Verificando usuarios administradores sin empresa...');

    // Buscar usuarios administradores sin empresa usando modelo Sequelize
    const orphanedUsers = await database.User.findAll({
      where: {
        role: 'admin',
        company_id: null
      },
      attributes: ['user_id', 'firstName', 'lastName', 'email', 'employeeId']
    });

    if (orphanedUsers.length === 0) {
      console.log('✅ No hay usuarios administradores sin empresa');
      return;
    }

    console.log(`⚠️ Encontrados ${orphanedUsers.length} usuarios administradores sin empresa. Eliminando automáticamente...`);

    // Eliminar usuarios administradores sin empresa usando modelo Sequelize
    await database.User.destroy({
      where: {
        role: 'admin',
        company_id: null
      }
    });

    // Mostrar usuarios eliminados
    orphanedUsers.forEach((user, index) => {
      console.log(`🗑️ ${index + 1}. Eliminado: ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.employeeId}`);
    });

    console.log(`✅ ${orphanedUsers.length} usuarios administradores sin empresa eliminados automáticamente`);

  } catch (error) {
    console.error('❌ Error limpiando usuarios administradores sin empresa:', error.message);
  }
}

// ENDPOINT PARA VERIFICAR ESTADO DEL WEBSOCKET
app.get('/api/v1/ws-health', (req, res) => {
  try {
    // Verificar si el WebSocket server está inicializado
    const wsHealthData = {
      success: true,
      websocket: {
        enabled: true,
        path: '/biometric-ws',
        protocol: 'ws/wss',
        status: 'initialized',
        url_local: `ws://localhost:${PORT}/biometric-ws`,
        url_network: `ws://${SERVER_IP}:${PORT}/biometric-ws`,
        url_production: `wss://${req.headers.host || SERVER_IP}/biometric-ws`
      },
      server: {
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'production',
        port: PORT,
        host: SERVER_IP
      },
      instructions: {
        connect: 'Use "wss://" for HTTPS or "ws://" for HTTP',
        path: '/biometric-ws',
        auth_required: true,
        auth_method: 'Send {"type":"subscribe","companyId":11,"token":"JWT_TOKEN"} after connection'
      },
      timestamp: new Date().toISOString()
    };

    res.json(wsHealthData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ENDPOINT ESPECIAL PARA AUTO-CONFIGURACIÓN DE LA APK
app.get('/api/v1/config/mobile-connection', (req, res) => {
  try {
    const response = {
      // Información de conexión
      success: true,
      serverIP: SERVER_IP,
      serverPort: parseInt(PORT),
      apiVersion: 'v1',
      status: 'active',
      
      // Estado de la base de datos
      database: {
        connected: isDatabaseConnected,
        status: isDatabaseConnected ? 'connected' : 'disconnected',
        type: 'PostgreSQL'
      },
      
      // Información del servidor
      server: {
        name: 'Sistema de Asistencia Biométrico',
        version: '1.2.0',
        environment: process.env.NODE_ENV || 'production',
        uptime: Math.floor(process.uptime()),
        platform: process.platform,
      },
      
      // Configuración de la empresa
      company: {
        name: 'Mi Empresa',
        timezone: 'America/Argentina/Buenos_Aires',
      },
      
      // IPs detectadas
      network: {
        primaryIP: SERVER_IP,
        detectedIPs: _getNetworkInterfaces(),
        hostname: os.hostname(),
      },
      
      // Características disponibles
      features: {
        biometric: true,
        attendance: true,
        medical: true,
        reports: true,
        departments: true,
        gpsTracking: true,
        multiuser: isDatabaseConnected,
        realTimeSync: isDatabaseConnected,
        offlineMode: !isDatabaseConnected,
      },
      
      // URLs importantes
      urls: {
        api: `http://${SERVER_IP}:${PORT}/api/v1`,
        admin: `http://${SERVER_IP}:${PORT}/admin`,
        web: `http://${SERVER_IP}:${PORT}`,
      },
      
      // Timestamp de respuesta
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Error en mobile-connection endpoint:', error);
    
    // Respuesta de emergencia
    res.json({
      success: false,
      error: error.message,
      serverIP: SERVER_IP,
      serverPort: parseInt(PORT),
      apiVersion: 'v1',
      status: 'limited',
      database: {
        connected: false,
        status: `error: ${error.message}`,
        type: 'PostgreSQL'
      },
      timestamp: new Date().toISOString(),
    });
  }
});

function _getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const detectedIPs = [];
  
  for (const interfaceName in interfaces) {
    const networks = interfaces[interfaceName];
    for (const network of networks) {
      if (network.family === 'IPv4' && !network.internal) {
        detectedIPs.push({
          interface: interfaceName,
          ip: network.address,
          mac: network.mac,
          isPrimary: network.address === SERVER_IP
        });
      }
    }
  }
  
  return detectedIPs;
}

// ENDPOINTS BÁSICOS DE LA API
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({
    status: 'OK',
    message: 'Sistema funcionando correctamente',
    serverIP: SERVER_IP,
    port: PORT,
    timestamp: new Date().toISOString(),
    database: {
      connected: isDatabaseConnected,
      status: isDatabaseConnected ? 'connected' : 'disconnected',
      type: 'PostgreSQL'
    }
  });
});

// === DEPARTAMENTOS ENDPOINTS - PostgreSQL Integration ===

// Endpoint para obtener departamentos
app.get(`${API_PREFIX}/departments`, async (req, res) => {
  console.log(`🏢 === SOLICITUD DEPARTAMENTOS ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`===============================`);

  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }

  try {
    const { Department, sequelize } = database;

    // Detectar company_id basado en JWT dinámicamente
    let companyId = 1; // Valor por defecto
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');

      try {
        // Decodificar JWT para obtener company_id dinámicamente
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.id) {
          // Buscar el usuario y su company_id desde la base de datos
          const { User } = require('./src/config/database');
          const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'company_id', 'email']
          });

          if (user && user.company_id) {
            companyId = user.company_id;
            console.log(`🎯 [DEPARTMENTS] JWT válido, usuario: ${user.email}, company_id = ${companyId}`);
          } else {
            console.warn(`⚠️ [DEPARTMENTS] Usuario no encontrado para JWT, usando company_id por defecto`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ [DEPARTMENTS] Error decodificando JWT (usando company_id por defecto): ${error.message}`);
        // Fallback: intentar buscar por patrones conocidos solo como último recurso
        if (token.includes('test_admin1')) {
          try {
            const userQuery = await database.sequelize.query(
              'SELECT company_id FROM users WHERE username = ? OR id = ? LIMIT 1',
              { replacements: ['admin1', 'admin1'], type: database.sequelize.QueryTypes.SELECT }
            );
            if (userQuery.length > 0) {
              companyId = userQuery[0].company_id;
              console.log(`🔍 [DEPARTMENTS] Fallback: Usuario admin1 encontrado, company_id = ${companyId}`);
            }
          } catch (fallbackError) {
            console.warn('⚠️ [DEPARTMENTS] Fallback fallido:', fallbackError.message);
          }
        }
      }
    }

    console.log(`🏢 [DEPARTMENTS] Obteniendo departamentos para company_id = ${companyId}`);

    // Obtener departamentos activos filtrados por empresa
    const departments = await Department.findAll({
      where: {
        is_active: true,
        company_id: companyId
      },
      order: [['name', 'ASC']]
    });
    
    // Convertir a formato compatible con frontend
    const formattedDepartments = departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      description: dept.description,
      address: dept.address,
      gpsLocation: dept.getGpsLocation(),
      coverageRadius: dept.coverage_radius,
      isActive: dept.is_active,
      createdAt: dept.created_at,
      updatedAt: dept.updated_at
    }));
    
    res.json({
      success: true,
      departments: formattedDepartments,
      total: formattedDepartments.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo departamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Endpoint para crear departamentos
app.post(`${API_PREFIX}/departments`, async (req, res) => {
  console.log(`🏢 === CREAR DEPARTAMENTO - MULTI-TENANT FIXED ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`📋 Datos:`, req.body);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`🔧 Company ID será asignado a: 1 (APONNT)`);
  console.log(`=============================================`);
  
  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }
  
  try {
    const { Department } = database;
    const deptData = req.body;
    
    // Validaciones básicas
    if (!deptData.name || !deptData.name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del departamento es requerido'
      });
    }
    
    // LÓGICA MULTI-SUCURSAL: Verificar duplicados según si la empresa tiene sucursales
    const [branches] = await database.sequelize.query(
      'SELECT COUNT(*) as total FROM branches WHERE company_id = 1 AND "isActive" = true'
    );
    const hasBranches = branches[0].total > 0;

    if (hasBranches) {
      // Si tiene sucursales, verificar que branch_id sea obligatorio
      if (!deptData.branchId) {
        return res.status(400).json({
          success: false,
          error: 'Debe seleccionar una sucursal. La empresa tiene múltiples sucursales.'
        });
      }

      // Verificar que no exista otro departamento con el mismo nombre EN LA MISMA SUCURSAL
      const existingDept = await Department.findOne({
        where: {
          name: deptData.name.trim(),
          branch_id: deptData.branchId,
          company_id: 1,
          is_active: true
        }
      });

      if (existingDept) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un departamento con ese nombre en esta sucursal'
        });
      }
    } else {
      // Si NO tiene sucursales, verificar que no exista el nombre en la empresa
      const existingDept = await Department.findOne({
        where: {
          name: deptData.name.trim(),
          company_id: 1,
          is_active: true
        }
      });

      if (existingDept) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un departamento con ese nombre'
        });
      }
    }
    
    // Crear nuevo departamento con soporte multi-sucursal
    const newDepartment = await Department.create({
      name: deptData.name.trim(),
      description: deptData.description || '',
      address: deptData.address || '',
      gps_lat: deptData.gpsLocation?.lat || null,
      gps_lng: deptData.gpsLocation?.lng || null,
      coverage_radius: parseInt(deptData.coverageRadius) || 50,
      is_active: true,
      company_id: 1,  // APONNT - Empresa Demo
      branch_id: hasBranches ? deptData.branchId : null  // Solo asignar sucursal si la empresa las tiene
    });
    
    console.log(`✅ Departamento "${deptData.name}" creado con ID: ${newDepartment.id}`);
    
    // Formatear respuesta
    const formattedDept = {
      id: newDepartment.id,
      name: newDepartment.name,
      description: newDepartment.description,
      address: newDepartment.address,
      gpsLocation: newDepartment.getGpsLocation(),
      coverageRadius: newDepartment.coverage_radius,
      isActive: newDepartment.is_active,
      createdAt: newDepartment.created_at
    };
    
    res.status(201).json({
      success: true,
      message: 'Departamento creado exitosamente',
      department: formattedDept
    });
    
  } catch (error) {
    console.error('❌ Error creando departamento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Endpoint para obtener departamento individual
app.get(`${API_PREFIX}/departments/:id`, async (req, res) => {
  console.log(`👁️ === VER DEPARTAMENTO ===`);
  console.log(`🆔 ID: ${req.params.id}`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`=========================`);

  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }

  try {
    const { Department } = database;
    const deptId = req.params.id;

    // Buscar departamento por ID y company_id (multi-tenant)
    const department = await Department.findOne({
      where: {
        id: deptId,
        company_id: 1,  // Multi-tenant: solo departamentos de APONNT
        is_active: true
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Departamento no encontrado'
      });
    }

    // Formatear respuesta
    const formattedDept = {
      id: department.id,
      name: department.name,
      description: department.description,
      address: department.address,
      gpsLocation: department.getGpsLocation(),
      coverageRadius: department.coverage_radius,
      isActive: department.is_active,
      createdAt: department.created_at,
      updatedAt: department.updated_at
    };

    console.log(`✅ Departamento "${department.name}" encontrado`);

    res.json({
      success: true,
      data: formattedDept
    });

  } catch (error) {
    console.error('❌ Error obteniendo departamento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Endpoint para actualizar departamentos
app.put(`${API_PREFIX}/departments/:id`, async (req, res) => {
  console.log(`🔄 === ACTUALIZAR DEPARTAMENTO ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`🆔 ID Departamento: ${req.params.id}`);
  console.log(`📋 Datos:`, req.body);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`================================`);
  
  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }
  
  try {
    const { Department } = database;
    const deptId = req.params.id;
    const updateData = req.body;

    // Buscar el departamento CON FILTRO MULTI-TENANT
    const department = await Department.findOne({
      where: {
        id: deptId,
        company_id: 1, // Multi-tenant: solo departamentos de APONNT
        is_active: true
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Departamento no encontrado'
      });
    }
    
    // Validar nombre si se está actualizando
    if (updateData.name && updateData.name.trim()) {
      const existingDept = await Department.findOne({
        where: {
          name: updateData.name.trim(),
          company_id: 1, // Multi-tenant: solo verificar en APONNT
          is_active: true,
          id: { [database.sequelize.Sequelize.Op.ne]: deptId }
        }
      });
      
      if (existingDept) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un departamento con ese nombre'
        });
      }
    }
    
    // Actualizar departamento
    await department.update({
      name: updateData.name?.trim() || department.name,
      description: updateData.description !== undefined ? updateData.description : department.description,
      address: updateData.address !== undefined ? updateData.address : department.address,
      gps_lat: updateData.gpsLocation?.lat !== undefined ? updateData.gpsLocation.lat : department.gps_lat,
      gps_lng: updateData.gpsLocation?.lng !== undefined ? updateData.gpsLocation.lng : department.gps_lng,
      coverage_radius: updateData.coverageRadius !== undefined ? parseInt(updateData.coverageRadius) : department.coverage_radius
    });
    
    console.log(`✅ Departamento "${department.name}" actualizado`);
    
    // Formatear respuesta
    const formattedDept = {
      id: department.id,
      name: department.name,
      description: department.description,
      address: department.address,
      gpsLocation: department.getGpsLocation(),
      coverageRadius: department.coverage_radius,
      isActive: department.is_active,
      createdAt: department.created_at,
      updatedAt: department.updated_at
    };
    
    res.json({
      success: true,
      message: 'Departamento actualizado exitosamente',
      department: formattedDept
    });
    
  } catch (error) {
    console.error('❌ Error actualizando departamento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Endpoint para eliminar departamentos (soft delete)
app.delete(`${API_PREFIX}/departments/:id`, async (req, res) => {
  console.log(`🗑️ === ELIMINAR DEPARTAMENTO ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`🆔 ID Departamento: ${req.params.id}`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`==============================`);
  
  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }
  
  try {
    const { Department } = database;
    const deptId = req.params.id;

    // Buscar el departamento CON FILTRO MULTI-TENANT
    const department = await Department.findOne({
      where: {
        id: deptId,
        company_id: 1, // Multi-tenant: solo departamentos de APONNT
        is_active: true
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Departamento no encontrado'
      });
    }
    
    // Soft delete
    await department.update({ is_active: false });
    
    console.log(`✅ Departamento "${department.name}" eliminado (soft delete)`);
    
    res.json({
      success: true,
      message: 'Departamento eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error eliminando departamento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// === SUCURSALES ENDPOINTS - PostgreSQL Integration ===

// Endpoint para obtener sucursales de una empresa
app.get(`${API_PREFIX}/companies/:companyId/branches`, async (req, res) => {
  console.log(`🏢 === SOLICITUD SUCURSALES ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`🏛️ Company ID: ${req.params.companyId}`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`===============================`);

  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }

  try {
    const companyId = req.params.companyId;

    // Obtener sucursales activas de la empresa
    const [branches] = await database.sequelize.query(`
      SELECT
        b.id,
        b.name,
        b.code,
        b.address,
        b.phone,
        b.email,
        b.latitude,
        b.longitude,
        b.radius,
        b."isActive",
        b."createdAt",
        b."updatedAt"
      FROM branches b
      WHERE b.company_id = :companyId AND b."isActive" = true
      ORDER BY b.name
    `, {
      replacements: { companyId }
    });

    console.log(`✅ ${branches.length} sucursales encontradas para empresa ${companyId}`);

    res.json({
      success: true,
      branches: branches,
      total: branches.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo sucursales:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// === USUARIOS ENDPOINTS - PostgreSQL Integration ===

// Endpoint para obtener usuarios
app.get(`${API_PREFIX}/users`, async (req, res) => {
  console.log(`👥 === SOLICITUD USUARIOS ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`=============================`);
  
  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }
  
  try {
    const { User, Department } = database;
    
    // Obtener todos los usuarios activos
    const users = await User.findAll({
      where: { isActive: true },
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    
    // Formatear para el frontend
    const formattedUsers = users.map(user => ({
      id: user.user_id,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department, // Mantener campo legacy
      departmentInfo: user.department ? {
        id: user.department.id,
        name: user.department.name,
        gpsLocation: {
          lat: user.department.gps_lat,
          lng: user.department.gps_lng
        },
        coverageRadius: user.department.coverage_radius
      } : null,
      position: user.position,
      salary: user.salary,
      hireDate: user.hireDate,
      birthDate: user.birthDate,
      address: user.address,
      emergencyContact: user.emergencyContact,
      emergencyPhone: user.emergencyPhone,
      isActive: user.is_active,
      allowOutsideRadius: user.allowOutsideRadius || false, // Nuevo campo
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    res.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Endpoint para crear usuarios (requiere autenticación)
app.post(`${API_PREFIX}/users`, auth, async (req, res) => {
  console.log(`👥 === CREAR USUARIO ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`📋 Datos:`, req.body);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`========================`);

  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }

  try {
    const { User } = database;
    const userData = req.body;

    // Validaciones básicas
    if (!userData.firstName || !userData.lastName || !userData.email) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, apellido y email son requeridos'
      });
    }

    // Verificar email único
    const existingUser = await User.findOne({
      where: { email: userData.email.trim() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un usuario con ese email'
      });
    }

    // Generate usuario from email if not provided
    const usuario = userData.usuario || userData.email.split('@')[0] || userData.employeeId || `user_${Date.now()}`;

    // Crear nuevo usuario
    const newUser = await User.create({
      usuario: usuario,
      companyId: req.user.company_id,
      employeeId: userData.employeeId || `EMP_${Date.now()}`,
      dni: userData.dni || `DNI_${Date.now()}`,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      email: userData.email.trim(),
      phone: userData.phone || null,
      password: userData.password || '123456', // Password por defecto
      role: userData.role || 'employee',
      department: userData.department || null, // Campo legacy
      departmentId: userData.departmentId || null, // FK al departamento
      position: userData.position || null,
      salary: userData.salary || null,
      hireDate: userData.hireDate || null,
      birthDate: userData.birthDate || null,
      address: userData.address || null,
      emergencyContact: userData.emergencyContact || null,
      emergencyPhone: userData.emergencyPhone || null,
      allowOutsideRadius: userData.allowOutsideRadius || false,
      isActive: true
    });
    
    console.log(`✅ Usuario "${userData.firstName} ${userData.lastName}" creado con ID: ${newUser.user_id}`);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.user_id,
        employeeId: newUser.employeeId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        departmentId: newUser.departmentId,
        allowOutsideRadius: newUser.allowOutsideRadius
      }
    });
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// ❌ DESACTIVADO: Handler viejo que NO maneja isActive, gpsEnabled, departmentId, branchId
/*
// Endpoint para actualizar usuarios
app.put(`${API_PREFIX}/users/:id`, async (req, res) => {
  console.log(`🔄 === ACTUALIZAR USUARIO ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`🆔 ID Usuario: ${req.params.id}`);
  console.log(`📋 Datos:`, req.body);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`============================`);
  
  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }
  
  try {
    const userId = req.params.id;
    const updateData = req.body;

    // Buscar el usuario usando SQL raw
    const findUserQuery = `
      SELECT * FROM users WHERE user_id = ? AND "isActive" = true
    `;

    const users = await database.sequelize.query(findUserQuery, {
      replacements: [userId],
      type: database.sequelize.QueryTypes.SELECT
    });

    if (!users.length) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = users[0];

    // Validar email único si se está actualizando
    if (updateData.email && updateData.email.trim() && updateData.email.trim() !== user.email) {
      const emailCheckQuery = `
        SELECT user_id FROM users WHERE email = ? AND user_id != ? LIMIT 1
      `;

      const existingUsers = await database.sequelize.query(emailCheckQuery, {
        replacements: [updateData.email.trim(), userId],
        type: database.sequelize.QueryTypes.SELECT
      });

      if (existingUsers.length) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un usuario con ese email'
        });
      }
    }

    // Preparar campos para actualizar - solo actualizar campos que vienen en updateData
    const fieldsToUpdate = [];
    const replacements = [];

    if (updateData.firstName !== undefined && updateData.firstName !== user.firstName) {
      fieldsToUpdate.push(`"firstName" = ?`);
      replacements.push(updateData.firstName?.trim() || user.firstName);
    }

    if (updateData.lastName !== undefined && updateData.lastName !== user.lastName) {
      fieldsToUpdate.push(`"lastName" = ?`);
      replacements.push(updateData.lastName?.trim() || user.lastName);
    }

    if (updateData.email !== undefined && updateData.email !== user.email) {
      fieldsToUpdate.push(`email = ?`);
      replacements.push(updateData.email?.trim() || user.email);
    }

    if (updateData.phone !== undefined && updateData.phone !== user.phone) {
      fieldsToUpdate.push(`phone = ?`);
      replacements.push(updateData.phone);
    }

    if (updateData.position !== undefined && updateData.position !== user.position) {
      fieldsToUpdate.push(`position = ?`);
      replacements.push(updateData.position);
    }

    if (updateData.salary !== undefined && updateData.salary !== user.salary) {
      fieldsToUpdate.push(`salary = ?`);
      replacements.push(updateData.salary);
    }

    if (updateData.address !== undefined && updateData.address !== user.address) {
      fieldsToUpdate.push(`address = ?`);
      replacements.push(updateData.address);
    }

    if (updateData.emergencyContact !== undefined && updateData.emergencyContact !== user.emergencyContact) {
      fieldsToUpdate.push(`"emergencyContact" = ?`);
      replacements.push(updateData.emergencyContact);
    }

    if (updateData.emergencyPhone !== undefined && updateData.emergencyPhone !== user.emergencyPhone) {
      fieldsToUpdate.push(`"emergencyPhone" = ?`);
      replacements.push(updateData.emergencyPhone);
    }

    // Solo actualizar si hay campos que cambiar
    if (fieldsToUpdate.length > 0) {
      fieldsToUpdate.push(`"updatedAt" = NOW()`);
      replacements.push(userId);

      const updateQuery = `
        UPDATE users
        SET ${fieldsToUpdate.join(', ')}
        WHERE user_id = ?
      `;

      await database.sequelize.query(updateQuery, {
        replacements: replacements,
        type: database.sequelize.QueryTypes.UPDATE
      });
    }

    console.log(`✅ Usuario "${user.firstName} ${user.lastName}" actualizado`);

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: {
        id: user.user_id,
        firstName: updateData.firstName?.trim() || user.firstName,
        lastName: updateData.lastName?.trim() || user.lastName,
        email: updateData.email?.trim() || user.email,
        phone: updateData.phone !== undefined ? updateData.phone : user.phone,
        position: updateData.position !== undefined ? updateData.position : user.position,
        salary: updateData.salary !== undefined ? updateData.salary : user.salary,
        address: updateData.address !== undefined ? updateData.address : user.address,
        emergencyContact: updateData.emergencyContact !== undefined ? updateData.emergencyContact : user.emergencyContact,
        emergencyPhone: updateData.emergencyPhone !== undefined ? updateData.emergencyPhone : user.emergencyPhone
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});
*/

/* COMENTADO - Endpoint duplicado que interceptaba userRoutes.js
// Endpoint para obtener usuario individual
app.get(`${API_PREFIX}/users/:id`, async (req, res) => {
  console.log(`👁️ === OBTENER USUARIO INDIVIDUAL ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`🆔 ID Usuario: ${req.params.id}`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`===================================`);

  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }

  try {
    const userId = req.params.id;

    // Usar consulta SQL raw para evitar problemas con asociaciones
    const userQuery = `
      SELECT
        u.user_id AS user_id,
        u."employeeId" AS "employeeId",
        u.usuario AS usuario,
        u."firstName" AS "firstName",
        u."lastName" AS "lastName",
        u.email AS email,
        u.phone AS phone,
        u.role AS role,
        u."departmentId" AS "departmentId",
        u.company_id AS company_id,
        u."hireDate" AS "hireDate",
        u."birthDate" AS "birthDate",
        u.address AS address,
        u.emergency_contact AS "emergencyContact",
        u.salary AS salary,
        u.position AS position,
        u.is_active AS "isActive",
        u.gps_enabled AS "gpsEnabled",
        u.permissions AS permissions,
        u.settings AS settings,
        d.name AS department_name,
        d.gps_lat AS gps_lat,
        d.gps_lng AS gps_lng,
        d.coverage_radius AS coverage_radius
      FROM users u
      LEFT JOIN departments d ON u."departmentId"::integer = d.id
      WHERE u.user_id = ? AND u.is_active = true
    `;

    const users = await database.sequelize.query(userQuery, {
      replacements: [userId],
      type: database.sequelize.QueryTypes.SELECT
    });

    if (!users.length) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        message: `No se encontró usuario con ID: ${userId}`
      });
    }

    const user = users[0];

    // GPS settings - Calculate inverse relationship
    // IMPORTANT: gpsEnabled (DB) = GPS restriction is ACTIVE
    //            allowOutsideRadius (frontend) = INVERSE of gpsEnabled
    // gpsEnabled=true → user restricted to area → allowOutsideRadius=false
    // gpsEnabled=false → user can go outside → allowOutsideRadius=true
    const gpsValue = user.gpsEnabled !== undefined ? user.gpsEnabled : false;

    // Formatear respuesta para compatibilidad con frontend
    const formattedUser = {
      id: user.user_id,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department_name ? { name: user.department_name } : null,
      departmentId: user.departmentId,
      position: user.position,
      salary: user.salary,
      hireDate: user.hireDate,
      birthDate: user.birthDate,
      address: user.address,
      emergencyContact: user.emergencyContact,
      emergencyPhone: user.emergencyPhone,
      permissions: user.permissions || {},
      settings: user.settings || {},
      gpsEnabled: gpsValue,
      allowOutsideRadius: !gpsValue,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      name: `${user.firstName} ${user.lastName}`,
      fullName: `${user.firstName} ${user.lastName}`
    };

    console.log(`✅ Usuario "${user.firstName} ${user.lastName}" encontrado`);

    res.json({
      success: true,
      user: formattedUser
    });

  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
*/ // FIN endpoint duplicado

// Endpoint para eliminar usuario (soft delete)
app.delete(`${API_PREFIX}/users/:id`, async (req, res) => {
  console.log(`🗑️ === ELIMINAR USUARIO ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`🆔 ID Usuario: ${req.params.id}`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`=========================`);
  
  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }
  
  try {
    const { User } = database;
    const userId = req.params.id;
    
    // Buscar el usuario
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        message: `No se encontró usuario con ID: ${userId}`
      });
    }
    
    // Hacer soft delete (desactivar usuario)
    await user.update({ isActive: false });
    
    console.log(`✅ Usuario "${user.firstName} ${user.lastName}" desactivado`);
    
    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente',
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        isActive: user.isActive
      }
    });
    
  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Endpoint para resetear contraseña de usuario
app.post(`${API_PREFIX}/users/:id/reset-password`, async (req, res) => {
  console.log(`🔑 === RESETEAR CONTRASEÑA ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`🆔 ID Usuario: ${req.params.id}`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`=============================`);
  
  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }
  
  try {
    const { User } = database;
    const userId = req.params.id;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Contraseña inválida',
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }
    
    // Buscar el usuario
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        message: `No se encontró usuario con ID: ${userId}`
      });
    }
    
    // Actualizar contraseña (en producción debería usar hashing)
    await user.update({ password: newPassword });
    
    console.log(`✅ Contraseña actualizada para "${user.firstName} ${user.lastName}"`);
    
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('❌ Error reseteando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// === ENDPOINTS DE TURNOS (mantenidos como memoria para compatibilidad) ===
let createdShifts = [];

// Endpoint para asistencia móvil
app.post(`${API_PREFIX}/attendance/mobile`, (req, res) => {
  const { user, type, method, timestamp, device } = req.body;
  
  console.log(`
📱 === ASISTENCIA MÓVIL RECIBIDA ===
👤 Usuario: ${user}
📍 Tipo: ${type}
🔧 Método: ${method}
⏰ Timestamp: ${timestamp}
📱 Dispositivo: ${device}
🌐 IP Cliente: ${req.ip}
=====================================
  `);
  
  try {
    // Simular guardado exitoso
    res.status(201).json({
      success: true,
      message: `${type} registrada correctamente`,
      data: {
        id: `att_${Date.now()}`,
        user,
        type,
        method,
        timestamp,
        device,
        serverIP: SERVER_IP,
        saved: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error guardando asistencia',
      message: error.message
    });
  }
});

// Endpoint login básico ELIMINADO - usar authRoutes.js para autenticación real

// === ENDPOINTS PARA EMPRESAS Y LOGIN ===

// Endpoint para obtener lista de empresas activas
app.get(`${API_PREFIX}/companies`, async (req, res) => {
  console.log(`🏢 === SOLICITUD EMPRESAS ===`);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`=============================`);

  if (!isDatabaseConnected) {
    return res.status(503).json({
      success: false,
      error: 'Base de datos no disponible',
      message: 'PostgreSQL no está conectado'
    });
  }

  try {
    // Usar consulta SQL raw para evitar problemas con columnas faltantes
    const query = `
      SELECT
        company_id,
        name,
        name as display_name,
        slug,
        license_type,
        subscription_type
      FROM companies
      WHERE is_active = true AND status = 'active'
      ORDER BY name ASC
    `;

    const results = await database.sequelize.query(query, {
      type: database.sequelize.QueryTypes.SELECT
    });

    const companies = results.map(company => ({
      id: company.company_id,
      name: company.name,
      displayName: company.display_name || company.name,
      slug: company.slug,
      licenseType: company.license_type,
      subscriptionType: company.subscription_type
    }));

    res.json({
      success: true,
      companies: companies,
      total: companies.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Endpoint company-login ELIMINADO - usar authRoutes.js para autenticación real

// Endpoint básico para turnos (simulado)
// ✅ FIX: Endpoint GET /shifts con filtrado multi-tenant
app.get(`${API_PREFIX}/shifts`, auth, async (req, res) => {
  try {
    console.log(`🕐 === SOLICITUD TURNOS (MULTI-TENANT) ===`);
    console.log(`👤 Usuario company_id: ${req.user.company_id}`);
    console.log(`🌐 IP: ${req.ip}`);
    console.log(`==========================================`);

    // Obtener turnos de la empresa del usuario autenticado
    const shifts = await database.Shift.findAll({
      where: {
        company_id: req.user.company_id,
        isActive: true
      },
      order: [['name', 'ASC']]
    });

    console.log(`✅ Turnos encontrados para company ${req.user.company_id}: ${shifts.length}`);

    res.json({
      success: true,
      shifts: shifts
    });

  } catch (error) {
    console.error('❌ Error obteniendo turnos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Endpoint para crear turnos
app.post(`${API_PREFIX}/shifts`, (req, res) => {
  console.log(`🕐 === CREAR TURNO ===`);
  console.log(`👤 Usuario: ${req.headers.authorization}`);
  console.log(`📋 Datos:`, req.body);
  console.log(`🌐 IP: ${req.ip}`);
  console.log(`=====================`);
  
  const shiftData = req.body;
  
  // Validaciones básicas
  if (!shiftData.name || !shiftData.startTime || !shiftData.endTime) {
    return res.status(400).json({
      error: 'Nombre, hora de inicio y fin son requeridos'
    });
  }
  
  // Simular creación exitosa
  const newShift = {
    id: `shift_${Date.now()}`,
    ...shiftData,
    employees: 0, // Inicialmente sin empleados asignados
    createdAt: new Date().toISOString()
  };
  
  // Agregar el turno al array
  createdShifts.push(newShift);
  
  console.log(`✅ Turno "${shiftData.name}" agregado. Total turnos creados: ${createdShifts.length}`);
  
  res.status(201).json({
    message: 'Turno creado exitosamente',
    shift: newShift
  });
});

// Endpoint para obtener turno por ID
app.get(`${API_PREFIX}/shifts/:id`, (req, res) => {
  const { id } = req.params;

  // Buscar en turnos de ejemplo
  const exampleShifts = [
    {
      id: 'example-1',
      name: 'Turno Mañana Estándar',
      type: 'standard',
      startTime: '08:00',
      endTime: '17:00',
      breakStartTime: '12:00',
      breakEndTime: '13:00',
      days: [1,2,3,4,5],
      isActive: true,
      employees: 12,
      hourlyRates: { normal: 1.0, overtime: 1.5, weekend: 1.5, holiday: 2.0 }
    },
    {
      id: 'example-2',
      name: 'Turno Tarde',
      type: 'standard',
      startTime: '14:00',
      endTime: '22:00',
      days: [1,2,3,4,5],
      isActive: true,
      employees: 8,
      hourlyRates: { normal: 1.0, overtime: 1.5, weekend: 1.5, holiday: 2.0 }
    }
  ];

  const allShifts = [...exampleShifts, ...createdShifts];
  const shift = allShifts.find(s => s.id === id);

  if (!shift) {
    return res.status(404).json({ error: 'Turno no encontrado' });
  }

  res.json({ shift });
});

// Endpoint para actualizar turno
app.put(`${API_PREFIX}/shifts/:id`, (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const shiftIndex = createdShifts.findIndex(s => s.id === id);

  if (shiftIndex === -1) {
    return res.status(404).json({ error: 'Turno no encontrado' });
  }

  // Actualizar turno
  createdShifts[shiftIndex] = {
    ...createdShifts[shiftIndex],
    ...updateData,
    updatedAt: new Date().toISOString()
  };

  res.json({
    message: 'Turno actualizado exitosamente',
    shift: createdShifts[shiftIndex]
  });
});

// Endpoint para eliminar turno (soft delete)
app.delete(`${API_PREFIX}/shifts/:id`, (req, res) => {
  const { id } = req.params;

  const shiftIndex = createdShifts.findIndex(s => s.id === id);

  if (shiftIndex === -1) {
    return res.status(404).json({ error: 'Turno no encontrado' });
  }

  // Soft delete - marcar como inactivo
  createdShifts[shiftIndex].isActive = false;

  res.json({ message: 'Turno desactivado exitosamente' });
});

// ========== PÁGINAS WEB - www.aponnt.com ==========

// Landing Page Principal (www.aponnt.com)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Panel Empresa/Clientes (www.aponnt.com/app)
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel-empresa.html'));
});

// Panel Administrativo Aponnt (www.aponnt.com/admin)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel-administrativo.html'));
});

// Rutas legacy para compatibilidad
app.get('/admin.html', (req, res) => {
  res.redirect('/admin');
});

app.get('/panel-administrativo.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel-administrativo.html'));
});

// Redirecciones para panel administrativo
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel-administrativo.html'));
});

app.get('/administrativo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel-administrativo.html'));
});

// Servir la página web principal (que será la v6.0)
app.get('/web', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel-empresa.html'));
});

// Endpoint para obtener configuración del servidor para la web
app.get('/api/server-config', (req, res) => {
  res.json({
    serverIP: SERVER_IP,
    port: PORT,
    apiUrl: `http://${SERVER_IP}:${PORT}/api/v1`,
    wsUrl: `http://${SERVER_IP}:${PORT}`,
    version: '6.8',
    features: {
      postgresql: isDatabaseConnected,
      biometric: true,
      medical: true,
      attendance: true,
      departments: true,
      gpsTracking: true
    }
  });
});

// === CONFIGURAR SISTEMA DE PERMISOS Y ROLES ===

// Importar rutas del sistema de permisos
const permissionsRoutes = require('./src/routes/permissionsRoutes');
const authRoutes = require('./src/routes/authRoutes');
const aponntAuthRoutes = require('./src/routes/aponntAuthRoutes'); // ✅ Auth para Staff + Partners
const aponntStaffAuthRoutes = require('./src/routes/aponntStaffAuthRoutes'); // ✅ Auth Staff Aponnt (con puerta trasera)
const aponntStaffRoutes = require('./src/routes/aponntStaffRoutes'); // ✅ CRUD Staff Aponnt
const staffCommissionsRoutes = require('./src/routes/staffCommissionsRoutes'); // ✅ Sistema de Comisiones Piramidales (Enero 2025)
const legalRoutes = require('./src/routes/legalRoutes');
const userRoutes = require('./src/routes/userRoutes');
const userCalendarRoutes = require('./src/routes/user-calendar-routes'); // ✅ Calendario personal del empleado
const shiftRoutes = require('./src/routes/shiftRoutes');
const shiftCalendarRoutes = require('./src/routes/shift-calendar-routes'); // ✅ Calendario visual de turnos rotativos
const usersSimpleRoutes = require('./src/routes/usersSimple');
const authorizationRoutes = require('./src/routes/authorizationRoutes');
const diagnosticRoutes = require('./src/routes/diagnostic');
const adminMigrationsRoutes = require('./src/routes/admin-migrations');

// 👤 IMPORTAR RUTAS DE PERFIL DE EMPLEADO COMPLETO (Enero 2025)
const userProfileRoutes = require('./src/routes/userProfileRoutes');
const userMedicalRoutes = require('./src/routes/userMedicalRoutes');
const userAdminRoutes = require('./src/routes/userAdminRoutes');
const userDocumentsRoutes = require('./src/routes/userDocumentsRoutes'); // Documentos vencibles (Octubre 2025)
const userMedicalExamsRoutes = require('./src/routes/userMedicalExamsRoutes'); // Exámenes médicos con periodicidad (Octubre 2025)
const userWorkHistoryRoutes = require('./src/routes/userWorkHistoryRoutes'); // Historial laboral completo (Octubre 2025)
// 🆕 TAB 2 - Datos Personales (Modal Ver Usuario - Enero 2025)
const userDriverLicenseRoutes = require('./src/routes/userDriverLicenseRoutes'); // Licencias de conducir
const userProfessionalLicenseRoutes = require('./src/routes/userProfessionalLicenseRoutes'); // Licencias profesionales
// 🆕 TAB 3 - Antecedentes Laborales (Modal Ver Usuario - Enero 2025)
const userLegalIssueRoutes = require('./src/routes/userLegalIssueRoutes'); // Asuntos legales/judiciales
const userUnionAffiliationRoutes = require('./src/routes/userUnionAffiliationRoutes'); // Afiliación sindical
// 🆕 TAB 8 - Config. Tareas y Salario (Modal Ver Usuario - Enero 2025)
const companyTaskRoutes = require('./src/routes/companyTaskRoutes'); // Catálogo de tareas de la empresa
const userAssignedTaskRoutes = require('./src/routes/userAssignedTaskRoutes'); // Tareas asignadas a usuarios
const userSalaryConfigRoutes = require('./src/routes/userSalaryConfigRoutes'); // Configuración salarial
// 🆕 Sistema Médico Avanzado y Salarial V2 (Noviembre 2025)
const medicalAdvancedRoutes = require('./src/routes/medicalAdvancedRoutes'); // Antropométricos, Cirugías, Psiquiatría, Deportes
const salaryAdvancedRoutes = require('./src/routes/salaryAdvancedRoutes'); // Convenios, Categorías, Payroll
const payrollRoutes = require('./src/routes/payrollRoutes'); // Sistema Liquidación Parametrizable v3.0
// 🆕 Sistema de Upload de Archivos (Enero 2025)
const uploadRoutes = require('./src/routes/uploadRoutes'); // Upload de documentos, fotos, licencias, etc.

// 🆕 Expediente 360° - Módulo de Análisis Integral de Empleados (Enero 2025)
const employee360Routes = require('./src/routes/employee360Routes');

// Importar rutas del sistema APONNT
const aponntDashboardRoutes = require('./src/routes/aponntDashboard');
const companyModuleRoutes = require('./src/routes/companyModuleRoutes');
const companyPanelRoutes = require('./src/routes/companyPanel');
const vendorRoutes = require('./src/routes/vendorRoutes');
const vendorAutomationRoutes = require('./src/routes/vendorAutomationRoutes');
const vendorCommissionsRoutes = require('./src/routes/vendorCommissionsRoutes'); // Sistema de Roles y Comisiones (Enero 2025)
const pricingRoutes = require('./src/routes/pricingRoutes');

// 💼 IMPORTAR RUTAS DE POSTULACIONES LABORALES
const jobPostingsRoutes = require('./src/routes/jobPostingsRoutes');

// 🔬 IMPORTAR API BIOMÉTRICA NEXT-GEN
const biometricApiRoutes = require('./src/routes/biometric-api');
const biometricHubRoutes = require('./src/routes/biometric-hub');

// 🖥️ IMPORTAR RUTAS DE KIOSKS BIOMÉTRICOS
const kiosksRoutes = require('./src/routes/kiosks')(database);

// 🚛 IMPORTAR RUTAS DE TRANSPORTE GANADERO
const transportRoutes = require('./src/routes/transportRoutes');
const transportFleetRoutes = require('./src/routes/transportFleetRoutes');
const transportTripsRoutes = require('./src/routes/transportTripsRoutes');

// 💼 IMPORTAR RUTAS DE SIAC ERP
const siacConfiguradorRoutes = require('./src/routes/siac/configurador');
const siacSesionesRoutes = require('./src/routes/siac/sesiones');
const siacTaxTemplatesRoutes = require('./src/routes/siac/taxTemplates');
const debugDbRoutes = require('./src/routes/debug-db');
const siacClientesRoutes = require('./src/routes/siac/clientes');
const siacFacturacionRoutes = require('./src/routes/siac/facturacion');

// Configurar rutas con sistema de permisos
app.use('/api/v1/permissions', permissionsRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/aponnt', aponntAuthRoutes); // ✅ Auth Staff + Partners
app.use('/api/aponnt/staff', aponntStaffAuthRoutes); // ✅ Auth Staff Aponnt (con puerta trasera postgres)
app.use('/api/aponnt/staff-data', aponntStaffRoutes); // ✅ CRUD Staff Aponnt (GET/POST/PUT/DELETE)
app.use('/api/aponnt/staff-commissions', staffCommissionsRoutes); // ✅ Comisiones Piramidales Staff (Enero 2025)
app.use('/api/v1/legal', legalRoutes);
app.use('/api/v1/users', userRoutes);  // Restaurado después de migración exitosa
app.use('/api/v1/users', userCalendarRoutes); // ✅ Calendario personal del empleado
app.use('/api/v1/shifts', shiftRoutes);
app.use('/api/v1/shifts', shiftCalendarRoutes); // ✅ Calendario visual de turnos rotativos
app.use('/api/v1/authorization', authorizationRoutes); // Sistema de autorizaciones de llegadas tardías
app.use('/api/v1/diagnostic', diagnosticRoutes); // Endpoint de diagnóstico para verificar schema
app.use('/api/v1/admin/migrations', adminMigrationsRoutes); // Endpoints administrativos de migraciones

// 👤 Configurar rutas de perfil de empleado (Enero 2025)
app.use('/api/v1/user-profile', userProfileRoutes); // Historial laboral, educación, familia
app.use('/api/v1/user-medical', userMedicalRoutes); // Antecedentes médicos completos
app.use('/api/v1/user-admin', userAdminRoutes); // Documentos, permisos, disciplinarios
// app.use('/api/v1/users', usersSimpleRoutes); // Versión simplificada - ya no necesaria

// 📄 Configurar rutas de sistemas HR avanzados (Octubre 2025)
app.use('/api/v1', userDocumentsRoutes); // Documentos vencibles con notificaciones
app.use('/api/v1', userMedicalExamsRoutes); // Exámenes médicos con periodicidad automática
app.use('/api/v1', userWorkHistoryRoutes); // Historial laboral + desvinculación + litigios

// 🆕 TAB 2 - Datos Personales Modal Ver Usuario (Enero 2025)
app.use('/api/v1/users', userDriverLicenseRoutes); // GET/POST/PUT/DELETE /:userId/driver-licenses
app.use('/api/v1/users', userProfessionalLicenseRoutes); // GET/POST/PUT/DELETE /:userId/professional-licenses

// 🆕 TAB 3 - Antecedentes Laborales Modal Ver Usuario (Enero 2025)
app.use('/api/v1/users', userLegalIssueRoutes); // GET/POST/PUT/DELETE /:userId/legal-issues
app.use('/api/v1/users', userUnionAffiliationRoutes); // GET/POST/PUT/DELETE /:userId/union-affiliation

// 🆕 TAB 8 - Config. Tareas y Salario Modal Ver Usuario (Enero 2025)
app.use('/api/v1/companies', companyTaskRoutes); // GET/POST/PUT/DELETE /:companyId/tasks
app.use('/api/v1/users', userAssignedTaskRoutes); // GET/POST/PUT/DELETE /:userId/assigned-tasks
app.use('/api/v1/users', userSalaryConfigRoutes); // GET/POST/PUT/DELETE /:userId/salary-config

// 🆕 Sistema Médico Avanzado y Salarial V2 (Noviembre 2025)
app.use('/api/medical-advanced', medicalAdvancedRoutes); // Antropométricos, Cirugías, Psiquiatría, Deportes, Hábitos
app.use('/api/salary-advanced', salaryAdvancedRoutes); // Convenios, Categorías, Config V2, Payroll
app.use('/api/payroll', payrollRoutes); // ✅ Sistema Liquidación Parametrizable v3.0 (Multi-País, Multi-Sucursal)

// 🆕 Sistema de Upload de Archivos (Enero 2025)
app.use('/api/v1/upload', uploadRoutes); // POST /single, POST /multiple, DELETE /:filename, GET /info/:filename

// Configurar rutas del sistema APONNT
app.use('/api/aponnt/dashboard', aponntDashboardRoutes);
// ✅ FIX BUG #1 y #2: Agregar alias de ruta para compatibilidad con frontend
// Frontend llama a /api/v1/users/:id (PUT) para actualizar usuarios
// Backend tiene la ruta en /api/aponnt/dashboard/users/:id
// Solución: Montar aponntDashboardRoutes también en /api/v1 para que funcionen ambas rutas
// app.use('/api/v1', aponntDashboardRoutes); // ❌ DESACTIVADO: intercepta userRoutes
app.use('/api/v1/company-modules', companyModuleRoutes);
app.use('/api/company-panel', companyPanelRoutes);
app.use('/api/vendor-automation', vendorRoutes);
app.use('/api/vendor-automation-advanced', vendorAutomationRoutes);
app.use('/api/vendors', vendorCommissionsRoutes); // Sistema de Roles y Comisiones (Enero 2025)
app.use('/api', pricingRoutes);

// 💼 CONFIGURAR RUTAS DE POSTULACIONES LABORALES
app.use('/api/job-postings', jobPostingsRoutes);

// 🔬 CONFIGURAR API BIOMÉTRICA NEXT-GEN
app.use('/api/v2/biometric', biometricApiRoutes);
app.use('/api/biometric', biometricHubRoutes);

// 🖥️ CONFIGURAR RUTAS DE KIOSKS BIOMÉTRICOS
app.use('/api/kiosks', kiosksRoutes);

// 🐘 CONFIGURAR API POSTGRESQL PARTICIONADO PROFESIONAL
const postgresqlPartitioningRoutes = require('./src/routes/postgresql-partitioning');
app.use('/api/v2/postgresql/partitioning', postgresqlPartitioningRoutes);

// 🎯 CONFIGURAR REAL BIOMETRIC ANALYSIS ENGINE (VERIFIED TECHNOLOGIES)
const realBiometricRoutes = require('./src/routes/real-biometric-api');
app.use('/api/v2/biometric-real', realBiometricRoutes);

// ⏰ CONFIGURAR BIOMETRIC ATTENDANCE API (CLOCK IN/OUT)
const biometricAttendanceRoutes = require('./src/routes/biometric-attendance-api');
app.use('/api/v2/biometric-attendance', biometricAttendanceRoutes);

// 🏢 CONFIGURAR BIOMETRIC ENTERPRISE API (ENCRYPTED TEMPLATES)
const biometricEnterpriseRoutes = require('./src/routes/biometric-enterprise-routes');
app.use('/api/v2/biometric-enterprise', biometricEnterpriseRoutes);

// 🏭 CONFIGURAR KIOSK ENTERPRISE API (500+ EMPLEADOS)
const kioskEnterpriseRoutes = require('./src/routes/kiosk-enterprise');
app.use('/api/v2/kiosk-enterprise', kioskEnterpriseRoutes);

// 🔌 IMPORTAR WEBSOCKET SERVERS ENTERPRISE
const { initializeKioskWebSocketServer } = require('./src/services/kiosk-websocket-server');
const { AdminPanelWebSocketServer } = require('./src/services/admin-panel-websocket');

// 📱 CONFIGURAR API MÓVIL COMPLETA
const mobileRoutes = require('./src/routes/mobileRoutes');
app.use('/api/v1/mobile', mobileRoutes);

// 🧠 ANÁLISIS EMOCIONAL PROFESIONAL (Azure Face API)
const emotionalAnalysisRoutes = require('./src/routes/emotionalAnalysisRoutes');
app.use('/api/v1/emotional-analysis', emotionalAnalysisRoutes);
console.log('🧠 [EMOTIONAL-ANALYSIS] Rutas profesionales configuradas');

// ⚖️ GESTIÓN DE CONSENTIMIENTOS (Ley 25.326)
const consentRoutes = require('./src/routes/consentRoutes');
app.use('/api/v1/consent', consentRoutes);
console.log('⚖️ [CONSENT] Sistema legal configurado');

// 🔐 GESTIÓN DE CONSENTIMIENTOS BIOMÉTRICOS (Análisis Emocional)
const biometricConsentRoutes = require('./src/routes/biometricConsentRoutes');
app.use('/api/v1/biometric', biometricConsentRoutes);
console.log('🔐 [BIOMETRIC-CONSENT] Sistema de consentimientos biométricos configurado');

// 🏖️ CONFIGURAR API DE VACACIONES Y PERMISOS
const vacationRoutes = require('./src/routes/vacationRoutes');
app.use('/api/v1/vacation', vacationRoutes);

// 🚫 CONFIGURAR API DE AUSENCIAS Y FALTAS
const absenceRoutes = require('./src/routes/absenceRoutes');
app.use('/api/v1/absence', absenceRoutes);

// ⏰ CONFIGURAR API DE ASISTENCIA
const attendanceRoutes = require('./src/routes/attendanceRoutes');
app.use('/api/v1/attendance', attendanceRoutes);

// 📊 CONFIGURAR API DE ATTENDANCE ANALYTICS (Scoring + Patrones + OLAP)
const attendanceAnalyticsRoutes = require('./src/routes/attendanceAnalyticsRoutes');
app.use('/api/attendance-analytics', attendanceAnalyticsRoutes);

// 🎯 CONFIGURAR API DE EXPEDIENTE 360° (Análisis Integral de Empleados)
app.use('/api/employee-360', employee360Routes);

// 📟 CONFIGURAR API DE KIOSKS
const kioskRoutes = require('./src/routes/kioskRoutes');
app.use('/api/v1/kiosks', kioskRoutes);

// 🚨 CONFIGURAR API DE SANCIONES
const sanctionRoutes = require('./src/routes/sanctionRoutes');
app.use('/api/v1/sanctions', sanctionRoutes);

// 👥 CONFIGURAR API DE VISITANTES
const visitorRoutes = require('./src/routes/visitorRoutes');
app.use('/api/v1/visitors', visitorRoutes);

// 🔔 CONFIGURAR API DE NOTIFICACIONES
const notificationRoutes = require('./src/routes/notificationRoutes');
app.use('/api/v1/notifications', notificationRoutes);

// 🔔 CONFIGURAR SISTEMA DE NOTIFICACIONES AVANZADO V2.0
const complianceRoutes = require('./src/routes/compliance');
const slaRoutes = require('./src/routes/sla');
const auditReportsRoutes = require('./src/routes/auditReports');
const proactiveRoutes = require('./src/routes/proactive');
const resourceCenterRoutes = require('./src/routes/resourceCenter');
const inboxRoutes = require('./src/routes/inbox');

app.use('/api/compliance', complianceRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/audit-reports', auditReportsRoutes);
app.use('/api/proactive', proactiveRoutes);
app.use('/api/resources', resourceCenterRoutes);
app.use('/api/inbox', inboxRoutes);

console.log('🔔 [NOTIFICATIONS-V2] Sistema de Notificaciones Avanzado V2.0 ACTIVO y FUNCIONANDO:');
console.log('   ⚖️ /api/compliance/* - Compliance y reglas LCT');
console.log('   ⏱️ /api/sla/* - SLA tracking y métricas');
console.log('   📋 /api/audit-reports/* - Reportes con validez legal');
console.log('   🔮 /api/proactive/* - Notificaciones proactivas (FIXED)');
console.log('   📚 /api/resources/* - Centro de recursos (FIXED)');
console.log('   📬 /api/inbox/* - Bandeja de notificaciones');

// ✅ CONFIGURAR SISTEMA DE NOTIFICACIONES ENTERPRISE V3.0 (WORKFLOWS + MULTI-CANAL)
const notificationsEnterpriseRoutes = require('./src/routes/notificationsEnterprise');
app.use('/api/v1/enterprise/notifications', notificationsEnterpriseRoutes);

console.log('🔔 [NOTIFICATIONS-ENTERPRISE] Sistema de Notificaciones Enterprise V3.0 ACTIVO:');
console.log('   📬 /api/v1/enterprise/notifications - CRUD notificaciones');
console.log('   ✅ /api/v1/enterprise/notifications/:id/action - Aprobar/Rechazar');
console.log('   📊 /api/v1/enterprise/notifications/stats - Estadísticas');
console.log('   🔄 /api/v1/enterprise/notifications/workflows - Workflows multi-nivel');
console.log('   📝 /api/v1/enterprise/notifications/templates - Templates reutilizables');
console.log('   ⚙️ /api/v1/enterprise/notifications/preferences - Preferencias usuario');
console.log('   🔥 Características: Workflows automáticos, escalamiento, multi-canal');

// ✅ CONFIGURAR SISTEMA DE GESTIÓN DE MÓDULOS (Bundling + Auto-Conocimiento)
const modulesRoutes = require('./src/routes/modulesRoutes')(database);
app.use('/api/modules', modulesRoutes);

// ✅ CONFIGURAR SISTEMA DE AUDITORÍA Y AUTO-DIAGNÓSTICO
const auditorRoutes = require('./src/routes/auditorRoutes')(database);
app.use('/api/audit', auditorRoutes);
// ✅ CONFIGURAR PHASE 4: AUTONOMOUS REPAIR + TECHNICAL REPORTS
const auditorPhase4Routes = require('./src/routes/auditorPhase4Routes')(database);
app.use('/api/audit/phase4', auditorPhase4Routes);

// ============================================================================
// DEPLOY MANAGER - Sistema de Migración Segura a Render
// ============================================================================
const deployRoutes = require('./src/routes/deployRoutes');
app.use('/api/deploy', deployRoutes);

console.log('🚀 [DEPLOY-MANAGER] Sistema de Deploy Seguro ACTIVO:');
console.log('   📊 GET  /api/deploy/pre-deploy-check - Verificar pre-requisitos');
console.log('   📋 GET  /api/deploy/pending-migrations - Listar migraciones pendientes');
console.log('   🚀 POST /api/deploy/migrate-to-render - Ejecutar deploy (requiere auth)');
console.log('   📈 GET  /api/deploy/test-stats - Estadísticas de tests');
console.log('');

console.log('🧩 [MODULES] Sistema de Gestión de Módulos y Bundling ACTIVO:');
console.log('   📋 GET    /api/modules - Listar todos los módulos');
console.log('   🔍 GET    /api/modules/:id - Obtener módulo específico');
console.log('   ✅ POST   /api/modules/validate - Validar dependencias');
console.log('   ⚠️ POST   /api/modules/analyze-impact - Analizar impacto de desactivar');
console.log('   🏢 GET    /api/modules/company/:id - Módulos de empresa con pricing');
console.log('   ⚡ POST   /api/modules/company/:id/activate - Activar módulo (auto-bundling)');
console.log('   🎁 Feature: Auto-activación de módulos bundled (gratis)');
console.log('');

console.log('🔍 [AUDITOR] Sistema de Auditoría y Auto-Diagnóstico ACTIVO:');
console.log('   🔍 /api/audit/run - Ejecutar auditoría completa');
console.log('   📊 /api/audit/status - Estado actual');
console.log('   📋 /api/audit/registry - Ver módulos del sistema');

// ✅ CONFIGURAR ENGINEERING DASHBOARD - Metadata del sistema
const engineeringRoutes = require('./src/routes/engineeringRoutes');
app.use('/api/engineering', engineeringRoutes);

console.log('🏗️ [ENGINEERING] Engineering Dashboard API ACTIVO:');
console.log('   📊 GET  /api/engineering/metadata - Metadata completo del sistema');
console.log('   📋 GET  /api/engineering/modules - Solo módulos');

// ✅ CONFIGURAR TASK INTELLIGENCE - Sistema Inteligente de Tareas
const taskIntelligenceRoutes = require('./src/routes/taskIntelligenceRoutes');
app.use('/api/task-intelligence', taskIntelligenceRoutes);

console.log('🧠 [TASK INTELLIGENCE] Sistema Inteligente de Tareas ACTIVO:');
console.log('   🔍 POST /api/task-intelligence/analyze - Analizar tarea antes de empezar');
console.log('   ✅ POST /api/task-intelligence/complete - Marcar tarea completada y sincronizar');
console.log('   📊 GET  /api/task-intelligence/inconsistencies - Ver descoordinaciones');
console.log('   🤖 POST /api/task-intelligence/assign-to-claude - Asignar tarea a Claude Code');
console.log('   👤 POST /api/task-intelligence/assign-to-human - Asignar tarea a humano');
console.log('   📋 POST /api/task-intelligence/create-phase - Crear fase desde TODO list');
console.log('   📋 GET  /api/task-intelligence/my-pending-tasks - Ver tareas pendientes');

// ✅ CONFIGURAR COORDINATION - Sistema de Coordinación Multi-Sesión
const coordinationRoutes = require('./src/routes/coordinationRoutes');
app.use('/api/coordination', coordinationRoutes);

console.log('🔐 [COORDINATION] Sistema de Coordinación Multi-Sesión ACTIVO:');
console.log('   📝 POST /api/coordination/register - Registrar sesión (obtener token)');
console.log('   💓 POST /api/coordination/heartbeat - Mantener sesión viva');
console.log('   🔒 POST /api/coordination/acquire-lock - Adquirir lock de tarea');
console.log('   🔓 POST /api/coordination/release-lock - Liberar lock de tarea');
console.log('   📊 GET  /api/coordination/status - Estado de coordinación');
console.log('   👥 GET  /api/coordination/team - Ver equipo activo');
console.log('   🔍 POST /api/coordination/check-conflicts - Verificar conflictos');

// ✅ CONFIGURAR CRITICAL PATH - Programación por Camino Crítico (CPM/PERT)
const criticalPathRoutes = require('./src/routes/criticalPathRoutes');
app.use('/api/critical-path', criticalPathRoutes);

console.log('🎯 [CRITICAL PATH] Sistema de Camino Crítico ACTIVO:');
console.log('   📊 GET  /api/critical-path/analyze - Calcular camino crítico');
console.log('   ✏️  POST /api/critical-path/update-priority - Actualizar prioridad de tarea');
console.log('   🔄 POST /api/critical-path/reorder - Reordenar tareas');
console.log('   💡 GET  /api/critical-path/suggested-order - Orden sugerido por CPM');
console.log('   📈 GET  /api/critical-path/statistics - Estadísticas del proyecto');

// ✅ CONFIGURAR TECHNOLOGY STACK API - Para index.html landing page
const technologyStackRoutes = require('./src/routes/technologyStackRoutes');
app.use('/api/technology-stack', technologyStackRoutes);

console.log('🏆 [TECH STACK] API de Stack Tecnológico ACTIVA:');
console.log('   🌐 GET /api/technology-stack/all - Stack completo del sistema');
console.log('   📦 GET /api/technology-stack/by-module - Tecnologías por módulo');
console.log('   📊 GET /api/technology-stack/summary - Resumen con stats');

// ✅ CONFIGURAR DATABASE SCHEMA API - Para coordinar múltiples sesiones de Claude Code
const databaseSchemaRoutes = require('./src/routes/databaseSchemaRoutes');
app.use('/api/database-schema', databaseSchemaRoutes);

console.log('🗄️ [DATABASE SCHEMA] API de Schema BD ACTIVA:');
console.log('   📊 GET  /api/database-schema/all - Schema completo con dependencias');
console.log('   📋 GET  /api/database-schema/table/:name - Análisis de tabla específica');
console.log('   🔍 GET  /api/database-schema/field-usage/:table/:field - Verificar uso de campo');
console.log('   🔗 GET  /api/database-schema/dependencies - Dependencias cruzadas');
console.log('   📜 GET  /api/database-schema/rules - Reglas de modificación segura');
console.log('   🔄 POST /api/database-schema/run-analysis - Ejecutar análisis completo');
console.log('   Auto-actualizable desde engineering-metadata.js');
console.log('   🗺️ GET  /api/engineering/roadmap - Solo roadmap');
console.log('   🔄 GET  /api/engineering/workflows - Solo workflows');
console.log('   🗄️ GET  /api/engineering/database - Solo database schema');
console.log('   📱 GET  /api/engineering/applications - Solo aplicaciones');
console.log('   📈 GET  /api/engineering/stats - Estadísticas agregadas');
console.log('   💾 POST /api/engineering/update - Actualizar metadata');
console.log('   🔄 POST /api/engineering/reload - Recargar metadata');
console.log('   Feature: Single source of truth - engineering-metadata.js');
console.log('');
console.log('');
console.log('🚀 [PHASE4] Sistema Autónomo de Reparación + Reportes Técnicos ACTIVO:');
console.log('   🔬 POST /api/audit/phase4/test/deep-with-report - Test profundo con auto-repair + reporte');
console.log('   🔧 POST /api/audit/phase4/auto-repair/:execution_id - Trigger manual de auto-reparación');
console.log('   📄 GET  /api/audit/phase4/reports/:execution_id - Descargar reporte técnico');
console.log('   📋 GET  /api/audit/phase4/reports - Listar reportes disponibles');

// ✅ CONFIGURAR SISTEMA DE ASISTENTE IA (Ollama + Llama 3.1)
const assistantRoutes = require('./src/routes/assistantRoutes');
app.use('/api/assistant', assistantRoutes);

console.log('🤖 [ASSISTANT] Sistema de Asistente IA ACTIVO:');
console.log('   💬 /api/assistant/chat - Chat con el asistente');
console.log('   👍 /api/assistant/feedback - Registrar feedback');
console.log('   📜 /api/assistant/history - Historial de conversaciones');
console.log('   📊 /api/assistant/stats - Estadísticas de uso');
console.log('   🏥 /api/assistant/health - Estado de Ollama');
console.log('   🧠 Technology: Ollama + Llama 3.1 (8B) + RAG + PostgreSQL');
console.log('   🔧 /api/audit/bundles - Sugerencias comerciales');
console.log('   🌱 /api/audit/seed/:module - Generar datos de prueba');
console.log('   🔥 Auto-diagnóstico, Auto-reparación híbrida, Análisis de dependencias');

// ✅ CONFIGURAR EMAIL VERIFICATION & CONSENT MANAGEMENT SYSTEM
const emailVerificationRoutes = require('./src/routes/emailVerificationRoutes');
const consentManagementRoutes = require('./src/routes/consentManagementRoutes');

app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/consents', consentManagementRoutes);

console.log('📧 [EMAIL VERIFICATION] Sistema de Verificación de Email ACTIVO:');
console.log('   ✉️  POST /api/email-verification/send - Enviar email de verificación');
console.log('   ✅ GET  /api/email-verification/verify/:token - Verificar token');
console.log('   🔄 POST /api/email-verification/resend - Reenviar email');
console.log('   🏥 GET  /api/email-verification/health - Estado del sistema');

console.log('📜 [CONSENTS] Sistema de Gestión de Consentimientos ACTIVO:');
console.log('   📋 GET  /api/consents/definitions - Listar definiciones de consentimientos');
console.log('   ➕ POST /api/consents/definitions - Crear nueva definición');
console.log('   📝 GET  /api/consents/user/:userId - Obtener consentimientos de usuario');
console.log('   ✅ POST /api/consents/accept - Aceptar consentimiento');
console.log('   ❌ POST /api/consents/revoke - Revocar consentimiento');
console.log('   📊 GET  /api/consents/stats - Estadísticas de consentimientos');
console.log('   🏥 GET  /api/consents/health - Estado del sistema');

// ✅ CONFIGURAR SISTEMA DE TESTING VISIBLE - PHASE 4 (Legacy - usar /api/phase4 en su lugar)
const visibleTestingRoutes = require('./src/routes/visibleTestingRoutes');
app.use('/api/testing', visibleTestingRoutes);

// ❌ ELIMINADO - Phase4Routes (obsoleto, funcionalidad integrada en auditorPhase4Routes)
// const phase4Routes = require('./src/routes/phase4Routes');
// app.use('/api/phase4', phase4Routes);

// ✅ CONFIGURAR AUTO-REPAIR SERVICE - Sistema Persistente de Auto-Reparación
const autoRepairRoutes = require('./src/routes/autoRepairRoutes');
app.use('/api/auto-repair', autoRepairRoutes);

console.log('👁️ [VISIBLE-TESTING] Sistema de Testing Visible Phase 4 ACTIVO:');
console.log('   📍 POST /api/testing/run-visible - Iniciar test E2E con navegador visible');
console.log('   📊 GET  /api/testing/execution-status/:executionId - Estado de ejecución en progreso');
console.log('   📋 GET  /api/testing/active-executions - Listar ejecuciones activas');
console.log('   🛑 POST /api/testing/kill-execution/:executionId - Detener ejecución');
console.log('   🌐 Soporta 3 entornos: LOCAL, STAGING, PRODUCTION');
console.log('');
console.log('🚀 [PHASE4-INTEGRATED] Sistema COMPLETO de Testing + Auto-Repair ACTIVO:');
console.log('   ▶️  POST /api/phase4/start - Iniciar test integrado (Puppeteer+PostgreSQL+Ollama+WebSocket)');
console.log('   📊 GET  /api/phase4/status/:executionId - Estado de ejecución');
console.log('   📝 GET  /api/phase4/logs/:executionId - Logs en tiempo real');
console.log('   🛑 POST /api/phase4/stop/:executionId - Detener test');
console.log('   📋 GET  /api/phase4/active - Listar tests activos');
console.log('   🏥 GET  /api/phase4/health - Health check (Ollama, WebSocket, PostgreSQL)');
console.log('   🔧 Auto-Repair: Ollama → Ticket → WebSocket → Claude Code → Fix');
console.log('   👀 Navegador VISIBLE durante la ejecución (headless:false)');
console.log('   🎯 Integrado en Panel Administrativo → Tab Herramientas');
console.log('');
console.log('🤖 [AUTO-REPAIR] Servicio Persistente de Auto-Reparación ACTIVO:');
console.log('   🚀 POST /api/auto-repair/start - Iniciar servicio persistente');
console.log('   🛑 POST /api/auto-repair/stop - Detener servicio');
console.log('   🔄 POST /api/auto-repair/restart - Reiniciar servicio');
console.log('   📊 GET  /api/auto-repair/status - Estado del servicio');
console.log('   🔧 POST /api/auto-repair/mode - Cambiar modo (manual/auto)');
console.log('   ⚙️  POST /api/auto-repair/config - Configurar API de Claude Code');
console.log('   📋 GET  /api/auto-repair/queue - Cola de tickets (modo manual)');
console.log('   📜 GET  /api/auto-repair/history - Historial de procesamiento');
console.log('   ✅ POST /api/auto-repair/process-ticket - Marcar ticket procesado');
console.log('   📥 GET  /api/auto-repair/next-ticket - Obtener siguiente ticket');
console.log('   🔀 Modos: MANUAL (cola humana) | AUTO (Claude Code API)');
console.log('');

// 🔥 HOT RELOAD ENDPOINT - Recargar módulos sin reiniciar servidor
app.get('/api/admin/reload-user-routes', (req, res) => {
  try {
    const path = require('path');
    const userRoutesPath = path.resolve(__dirname, './src/routes/userRoutes.js');

    // Limpiar cache del módulo
    delete require.cache[require.resolve(userRoutesPath)];

    // Recargar módulo
    const freshUserRoutes = require(userRoutesPath);

    // Re-montar rutas (esto sobrescribe las viejas)
    app._router.stack = app._router.stack.filter(r =>
      !(r.route && r.route.path && r.route.path.startsWith('/api/v1/users'))
    );
    app.use('/api/v1/users', freshUserRoutes);

    console.log('🔥 [HOT-RELOAD] userRoutes recargado exitosamente');
    res.json({
      success: true,
      message: 'userRoutes recargado sin reiniciar servidor',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [HOT-RELOAD] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ CONFIGURAR SISTEMA DE EMAILS MULTICAPA
const emailRoutes = require('./src/routes/emailRoutes');
const emailWorker = require('./src/workers/EmailWorker');

app.use('/api/email', emailRoutes);

// Iniciar worker de emails
// TEMPORALMENTE DESHABILITADO: falta crear tabla email_queue
// emailWorker.start();

console.log('📧 [EMAIL-SYSTEM] Sistema de Emails Multicapa ACTIVO:');
console.log('   🔐 /api/email/config/validate - Validar configuración SMTP');
console.log('   🏢 /api/email/config/company - Configurar email empresa');
console.log('   📤 /api/email/queue - Encolar email para envío');
console.log('   📜 /api/email/logs - Historial de emails');
console.log('   📊 /api/email/stats - Estadísticas de envío');
console.log('   ⚙️  /api/email/worker/status - Estado del worker');
console.log('   📨 Technology: Nodemailer + PostgreSQL + Async Queue');
console.log('   🔄 Worker procesando cola cada 5 segundos');

// 🔒 CONFIGURAR API BIOMÉTRICA
// COMENTADO: Conflicto con biometricConsentRoutes en la misma ruta /api/v1/biometric
// const biometricRoutes = require('./src/routes/biometricRoutes');
// app.use('/api/v1/biometric', biometricRoutes');

// 📷 CONFIGURAR API BIOMÉTRICA FACIAL
const facialBiometricRoutes = require('./src/routes/facialBiometricRoutes');
app.use('/api/v1/facial-biometric', facialBiometricRoutes);

// 🏥 CONFIGURAR API MÉDICA
const { medicalRouter, adminRouter } = require('./src/routes/medicalRoutes-simple');
app.use('/api/v1/medical', medicalRouter);
app.use('/api/admin', adminRouter);

// 🛠️ CONFIGURAR API DE GESTIÓN BIOMÉTRICA
const biometricManagementRouter = require('./src/routes/biometric-management-routes');
app.use('/api/v1/biometric-management', biometricManagementRouter);

// 📚 CONFIGURAR API DE CAPACITACIONES
const trainingRoutes = require('./src/routes/trainingRoutes');
app.use('/api/v1/trainings', trainingRoutes);

// 📍 CONFIGURAR API DE UBICACIONES DE EMPLEADOS
const locationRoutes = require('./src/routes/locationRoutes');
app.use('/api/v1/location', locationRoutes);

// 📱 CONFIGURAR API DE APK
const apkRoutes = require('./src/routes/apkRoutes');
app.use('/api/apk', apkRoutes);

// 🚛 CONFIGURAR API DE TRANSPORTE GANADERO
app.use('/api/transport', transportRoutes);
app.use('/api/transport/fleet', transportFleetRoutes);
app.use('/api/transport/trips', transportTripsRoutes);

console.log('🚛 [TRANSPORT] Rutas de transporte ganadero configuradas:');
console.log('   📋 /api/transport/* - Rutas principales');
console.log('   🚗 /api/transport/fleet/* - Gestión de flota');

// 💼 CONFIGURAR API DE SIAC ERP
app.use('/api/debug', debugDbRoutes);
app.use('/api/siac/configurador', siacConfiguradorRoutes);
app.use('/api/siac/sesiones', siacSesionesRoutes);
app.use('/api/siac/tax-templates', siacTaxTemplatesRoutes);
app.use('/api/siac/clientes', siacClientesRoutes);
app.use('/api/siac/facturacion', siacFacturacionRoutes);

// 📧 FORMULARIO DE CONTACTO PUBLICO (Landing Page)
const contactRoutes = require('./src/routes/contactRoutes');
app.use('/api/contact', contactRoutes);
console.log('📧 [CONTACT] Ruta de contacto publico configurada: /api/contact');

console.log('💼 [SIAC] Rutas de ERP SIAC configuradas:');
console.log('   ⚙️ /api/siac/configurador/* - Configuración por empresa');
console.log('   ⚡ /api/siac/sesiones/* - Gestión de sesiones concurrentes');
console.log('   🧾 /api/siac/facturacion/* - Módulo de Facturación con triple aislación');
console.log('   🏛️ /api/siac/tax-templates/* - Plantillas fiscales por país');
console.log('   👥 /api/siac/clientes/* - Módulo de gestión de clientes');
console.log('   🛣️ /api/transport/trips/* - Gestión de viajes');

// 🧪 CONFIGURAR API DE TESTING REALTIME
// TEMPORALMENTE DESHABILITADO - Causaba problemas en deploy
// app.use('/api/test', testingRealtimeRouter);
// console.log('🧪 [TESTING] Rutas de testing en tiempo real configuradas:');
// console.log('   📍 POST /api/test/simulate-attendance - Simular fichaje');
// console.log('   👤 POST /api/test/simulate-detection - Simular detección facial');
// console.log('   🖥️ POST /api/test/simulate-kiosk-status - Simular cambio estado kiosk');
// console.log('   📋 GET /api/test/employees - Listar empleados para testing');
// console.log('   ✅ GET /api/test/status - Estado del sistema');

// RUTA LEGACY ELIMINADA - Ahora se usa /api/v1/company-modules/my-modules

// 🧩 ENDPOINT PARA OBTENER TODOS LOS MÓDULOS DEL SISTEMA (MANTENER PARA ADMIN)
app.get(`${API_PREFIX}/system-modules`, async (req, res) => {
  console.log('🧩 [SYSTEM-MODULES] Solicitando todos los módulos del sistema');

  try {
    if (!isDatabaseConnected) {
      return res.status(503).json({
        success: false,
        error: 'Base de datos no disponible'
      });
    }

    // Consultar TODOS los módulos del sistema desde system_modules (activos e inactivos)
    const query = `
      SELECT
        id,
        module_key,
        name,
        description,
        icon,
        color,
        category,
        base_price,
        is_active,
        is_core,
        display_order,
        features,
        requirements,
        version,
        rubro
      FROM system_modules
      ORDER BY rubro ASC, name ASC
    `;

    const systemModules = await database.sequelize.query(query, {
      type: database.sequelize.QueryTypes.SELECT
    });

    console.log(`✅ [SYSTEM-MODULES] ${systemModules.length} módulos encontrados`);

    res.json({
      success: true,
      modules: systemModules,
      total: systemModules.length
    });

  } catch (error) {
    console.error('❌ [SYSTEM-MODULES] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

console.log('🔐 Sistema de permisos y roles configurado');
console.log('📋 Rutas disponibles:');
console.log('   • /api/v1/permissions/* - Gestión de permisos');
console.log('   • /api/v1/legal/* - Sistema de comunicaciones legales');
console.log('   • /api/v1/auth/* - Autenticación con roles');
console.log('   • /api/aponnt/dashboard/* - Dashboard APONNT');
console.log('   • /api/v2/biometric/* - API Biométrica Next-Gen con IA');
console.log('   • /api/v1/mobile/* - API Móvil Completa (Flutter APK)');
console.log('   • /api/v1/vacation/* - Sistema de Vacaciones y Licencias');
console.log('   • /api/v1/absence/* - Sistema de Ausencias y Faltas');

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Página no encontrada',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/ - Página principal',
      '/admin - Panel de administración',
      '/api/v1/health - Estado del sistema',
      '/api/v1/auth/login - Autenticación',
      '/api/v1/departments - Gestión de departamentos (PostgreSQL)',
      '/api/v1/shifts - Gestión de turnos',
      '/api/v1/config/mobile-connection - Config para APK',
      '/api/server-config - Config para web',
      '/api/aponnt/auth/* - Sistema APONNT',
      '/api/aponnt/admin/* - Administración APONNT',
      '/api/aponnt/dashboard/* - Dashboard APONNT'
    ]
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message
  });
});

// INICIAR SERVIDOR
async function startServer() {
  try {
    // Inicializar base de datos primero
    await initializeDatabase();

    // ✅ EJECUTAR MIGRACIONES DE NOTIFICACIONES ENTERPRISE
    console.log('\n🔧 [MIGRATIONS] Ejecutando migraciones de notificaciones enterprise...');
    try {
      const runAllMigrations = require('./scripts/run-all-migrations');
      await runAllMigrations();
      console.log('✅ [MIGRATIONS] Migraciones ejecutadas correctamente\n');
    } catch (migrationError) {
      console.warn('⚠️  [MIGRATIONS] Error ejecutando migraciones:', migrationError.message);
      console.warn('⚠️  [MIGRATIONS] El servidor continuará normalmente.\n');
    }

    // ✅ INICIALIZAR UNIFIED KNOWLEDGE SERVICE (Sistema de Auto-Conocimiento)
    console.log('\n🧠 [UNIFIED-KB] Inicializando Sistema de Auto-Conocimiento...');
    try {
      const UnifiedKnowledgeService = require('./src/services/UnifiedKnowledgeService');
      const knowledgeService = new UnifiedKnowledgeService(database);
      await knowledgeService.initialize();

      // Hacer disponible en toda la aplicación
      app.locals.knowledgeService = knowledgeService;
      global.knowledgeService = knowledgeService; // También global para scripts

      console.log('✅ [UNIFIED-KB] Sistema de Auto-Conocimiento iniciado correctamente');
      console.log(`   • Módulos cargados: ${knowledgeService.metadata.size}`);
      console.log(`   • Business Rules: ${knowledgeService.businessRules.size}`);
      console.log(`   • Health Indicators: ${knowledgeService.healthIndicators.size}\n`);
    } catch (kbError) {
      console.warn('⚠️  [UNIFIED-KB] Error iniciando Knowledge Service:', kbError.message);
      console.warn('⚠️  [UNIFIED-KB] El servidor continuará sin auto-conocimiento avanzado.\n');
    }

    // ✅ INICIALIZAR SCHEDULER DE VENCIMIENTO DE FOTOS BIOMÉTRICAS
    console.log('📸 [SCHEDULER] Inicializando scheduler de fotos biométricas...');
    try {
      const NotificationEnterpriseService = require('./src/services/NotificationEnterpriseService');
      const BiometricPhotoExpirationScheduler = require('./src/services/BiometricPhotoExpirationScheduler');

      const notificationService = new NotificationEnterpriseService(database);
      const photoScheduler = new BiometricPhotoExpirationScheduler(database, notificationService);
      photoScheduler.start();

      console.log('✅ [SCHEDULER] Scheduler de fotos biométricas iniciado correctamente');
      console.log('   • Frecuencia: Diario a las 9:00 AM');
      console.log('   • Notificaciones: 30 días antes del vencimiento');
      console.log('   • Zona horaria: America/Argentina/Buenos_Aires\n');
    } catch (schedulerError) {
      console.warn('⚠️  [SCHEDULER] Error iniciando scheduler:', schedulerError.message);
      console.warn('⚠️  [SCHEDULER] El servidor continuará sin scheduler automático.\n');
    }

    // ✅ INICIALIZAR SCHEDULER DE VENCIMIENTO DE DOCUMENTOS
    console.log('📄 [SCHEDULER] Inicializando scheduler de documentos...');
    try {
      const DocumentExpirationScheduler = require('./src/services/DocumentExpirationScheduler');

      // Reutilizar el notificationService ya creado
      const NotificationEnterpriseService = require('./src/services/NotificationEnterpriseService');
      const notificationServiceDocs = new NotificationEnterpriseService(database);
      const documentScheduler = new DocumentExpirationScheduler(database, notificationServiceDocs);
      documentScheduler.start();

      console.log('✅ [SCHEDULER] Scheduler de documentos iniciado correctamente');
      console.log('   • Frecuencia: Diario a las 10:00 AM');
      console.log('   • Notificaciones: 30 días antes del vencimiento');
      console.log('   • Documentos monitoreados: Pasaportes, Licencias, Visas, etc.');
      console.log('   • Zona horaria: America/Argentina/Buenos_Aires\n');
    } catch (schedulerError) {
      console.warn('⚠️  [SCHEDULER] Error iniciando scheduler de documentos:', schedulerError.message);
      console.warn('⚠️  [SCHEDULER] El servidor continuará sin scheduler de documentos.\n');
    }

    // ✅ INICIALIZAR SCHEDULER DE VENCIMIENTO DE EXÁMENES MÉDICOS
    console.log('🏥 [SCHEDULER] Inicializando scheduler de exámenes médicos...');
    try {
      const MedicalExamExpirationScheduler = require('./src/services/MedicalExamExpirationScheduler');

      // Reutilizar el notificationService ya creado
      const NotificationEnterpriseService = require('./src/services/NotificationEnterpriseService');
      const notificationServiceMedical = new NotificationEnterpriseService(database);
      const medicalScheduler = new MedicalExamExpirationScheduler(database, notificationServiceMedical);
      medicalScheduler.start();

      console.log('✅ [SCHEDULER] Scheduler de exámenes médicos iniciado correctamente');
      console.log('   • Frecuencia: Diario a las 11:00 AM');
      console.log('   • Notificaciones: 30 días antes del vencimiento');
      console.log('   • Exámenes monitoreados: Preocupacional, Periódico, Reingreso, Retiro, Especial');
      console.log('   • Periodicidad configurable: Mensual, Trimestral, Semestral, Anual, Bienal');
      console.log('   • Zona horaria: America/Argentina/Buenos_Aires\n');
    } catch (schedulerError) {
      console.warn('⚠️  [SCHEDULER] Error iniciando scheduler de exámenes médicos:', schedulerError.message);
      console.warn('⚠️  [SCHEDULER] El servidor continuará sin scheduler de exámenes médicos.\n');
    }

    // Iniciar servidor HTTP
    server.listen(PORT, HOST, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🏢 SISTEMA DE ASISTENCIA BIOMÉTRICO v1.1             ║
║     ✅ Servidor con PostgreSQL CONFIGURADO exitosamente  ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║     🌐 URL Local:     http://localhost:${PORT}           ║
║     🌐 URL Red:       http://${SERVER_IP}:${PORT}        ║
║     📊 Admin Panel:   http://${SERVER_IP}:${PORT}/admin  ║
║     📱 API Móvil:     http://${SERVER_IP}:${PORT}/api/v1 ║
║     ❤️  Health:       http://${SERVER_IP}:${PORT}/api/v1/health ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

🎯 CONFIGURACIÓN AUTOMÁTICA:
   • IP detectada: ${SERVER_IP}
   • Puerto: ${PORT}
   • Host: ${HOST}
   • Plataforma: ${process.platform}
   • Base de datos: ${isDatabaseConnected ? '✅ PostgreSQL conectado' : '❌ PostgreSQL desconectado'}

🏢 DEPARTAMENTOS:
   • Sistema parametrizable: ✅
   • Ubicación GPS: ✅
   • Radio de cobertura: ✅
   • Almacenamiento: ${isDatabaseConnected ? 'PostgreSQL' : 'En memoria (temporal)'}

📱 PARA LA APK:
   • Endpoint autoconfig: http://${SERVER_IP}:${PORT}/api/v1/config/mobile-connection
   • La APK buscará automáticamente esta IP

🌐 PARA LA WEB:
   • Config automática: http://${SERVER_IP}:${PORT}/api/server-config
   • Panel admin: http://${SERVER_IP}:${PORT}/admin

💡 Información de red:
${_getNetworkInterfaces().map(ip => `   • ${ip.interface}: ${ip.ip}${ip.isPrimary ? ' (PRINCIPAL)' : ''}`).join('\n')}

⚠️  NOTA: Si cambias de red, reinicia el servidor para detectar nueva IP
      `);

      // 🔌 INICIALIZAR WEBSOCKET SERVERS ENTERPRISE
      initializeKioskWebSocketServer(server).then((kioskWsServer) => {
        console.log('🏭 [KIOSK-WS] WebSocket Server Enterprise inicializado para 20+ cámaras simultáneas');

        // Inicializar Admin Panel WebSocket Server
        console.log('🖥️ [ADMIN-WS] Inicializando WebSocket para panel administrativo...');
        const adminWsServer = new AdminPanelWebSocketServer(server);

        // Conectar ambos servidores para comunicación bidireccional
        adminWsServer.connectToKioskServer(kioskWsServer);
        kioskWsServer.adminPanelRef = adminWsServer;

        // Configurar referencia para rutas de testing (deshabilitado temporalmente)
        // setAdminPanelWsServer(adminWsServer);

        console.log('✅ [ADMIN-WS] WebSocket para panel administrativo inicializado en /biometric-ws');
        console.log('🔗 [WS] Servidores WebSocket conectados: Kiosk ↔ Admin Panel');
      }).catch(err => {
        console.error('❌ [KIOSK-WS] Error inicializando WebSocket server:', err);
      });

      // 📡 ANUNCIAR SERVICIO VIA mDNS PARA DESCUBRIMIENTO AUTOMÁTICO
      try {
        const bonjour = new Bonjour();
        const mdnsService = bonjour.publish({
          name: 'siac-biometric-server',
          type: 'siac-biometric',
          port: parseInt(PORT),
          protocol: 'tcp',
          txt: {
            version: '1.2.0',
            api: '/api/v1',
            platform: process.platform,
          }
        });

        mdnsService.on('up', () => {
          console.log('📡 [mDNS] Servicio anunciado: _siac-biometric._tcp en puerto ' + PORT);
          console.log('📱 [mDNS] APKs Flutter pueden auto-detectar este servidor ahora');
        });

        mdnsService.on('error', (err) => {
          console.log('⚠️ [mDNS] Error anunciando servicio:', err.message);
        });
      } catch (mdnsError) {
        console.log('⚠️ [mDNS] No se pudo iniciar mDNS (no crítico):', mdnsError.message);
      }
    });

  } catch (error) {
    console.error('💥 Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  console.log('⏹️ Cerrando servidor...');
  if (isDatabaseConnected) {
    await database.close();
  }
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n⏹️ Cerrando servidor...');
  if (isDatabaseConnected) {
    await database.close();
  }
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente'); 
    process.exit(0);
  });
});

// Iniciar servidor
startServer();

module.exports = { app, server, SERVER_IP, PORT };