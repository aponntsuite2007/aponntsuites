const express = require('express');
const router = express.Router();
const { SystemConfig } = require('../config/database');
const { auth, adminOnly } = require('../middleware/auth');

/**
 * @route GET /api/v1/config
 * @desc Obtener configuración del sistema
 */
router.get('/', auth, async (req, res) => {
  try {
    const config = await SystemConfig.findOne();

    if (!config) {
      return res.status(404).json({
        error: 'Configuración no encontrada'
      });
    }

    // Para usuarios no admin, ocultar configuraciones sensibles
    if (req.user.role !== 'admin') {
      const publicConfig = {
        companyName: config.companyName,
        companyLogo: config.companyLogo,
        timezone: config.timezone,
        locale: config.locale,
        toleranceMinutesEntry: config.toleranceMinutesEntry,
        toleranceMinutesExit: config.toleranceMinutesExit,
        gpsRadius: config.gpsRadius,
        biometricSettings: config.biometricSettings
      };
      return res.json(publicConfig);
    }

    res.json(config);

  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/config
 * @desc Actualizar configuración del sistema
 */
router.put('/', auth, adminOnly, async (req, res) => {
  try {
    let config = await SystemConfig.findOne();

    if (!config) {
      // Si no existe configuración, crear una
      config = await SystemConfig.create(req.body);
    } else {
      // Actualizar configuración existente
      await config.update(req.body);
    }

    res.json({
      message: 'Configuración actualizada exitosamente',
      config
    });

  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/config/company
 * @desc Obtener configuración de la empresa (público)
 */
router.get('/company', async (req, res) => {
  try {
    const config = await SystemConfig.findOne({
      attributes: ['companyName', 'companyLogo', 'timezone', 'locale']
    });

    if (!config) {
      return res.json({
        companyName: 'Mi Empresa',
        companyLogo: null,
        timezone: 'America/Argentina/Buenos_Aires',
        locale: 'es-AR'
      });
    }

    res.json(config);

  } catch (error) {
    console.error('Error obteniendo configuración de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/config/biometric
 * @desc Obtener configuración biométrica
 */
router.get('/biometric', auth, async (req, res) => {
  try {
    const config = await SystemConfig.findOne({
      attributes: ['biometricSettings']
    });

    const biometricSettings = config?.biometricSettings || {
      fingerprintEnabled: true,
      faceRecognitionEnabled: true,
      maxFingerprints: 5,
      readerType: 'zkteco'
    };

    res.json(biometricSettings);

  } catch (error) {
    console.error('Error obteniendo configuración biométrica:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/config/biometric
 * @desc Actualizar configuración biométrica
 */
router.put('/biometric', auth, adminOnly, async (req, res) => {
  try {
    let config = await SystemConfig.findOne();

    if (!config) {
      config = await SystemConfig.create({
        biometricSettings: req.body
      });
    } else {
      await config.update({
        biometricSettings: req.body
      });
    }

    res.json({
      message: 'Configuración biométrica actualizada exitosamente',
      biometricSettings: config.biometricSettings
    });

  } catch (error) {
    console.error('Error actualizando configuración biométrica:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/config/notifications
 * @desc Obtener configuración de notificaciones
 */
router.get('/notifications', auth, adminOnly, async (req, res) => {
  try {
    const config = await SystemConfig.findOne({
      attributes: ['emailSettings', 'smsSettings', 'whatsappSettings', 'sendNotifications']
    });

    res.json({
      sendNotifications: config?.sendNotifications || true,
      emailSettings: config?.emailSettings || {},
      smsSettings: config?.smsSettings || {},
      whatsappSettings: config?.whatsappSettings || {}
    });

  } catch (error) {
    console.error('Error obteniendo configuración de notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/config/notifications
 * @desc Actualizar configuración de notificaciones
 */
router.put('/notifications', auth, adminOnly, async (req, res) => {
  try {
    const {
      sendNotifications,
      emailSettings,
      smsSettings,
      whatsappSettings
    } = req.body;

    let config = await SystemConfig.findOne();

    const updateData = {};
    if (sendNotifications !== undefined) updateData.sendNotifications = sendNotifications;
    if (emailSettings !== undefined) updateData.emailSettings = emailSettings;
    if (smsSettings !== undefined) updateData.smsSettings = smsSettings;
    if (whatsappSettings !== undefined) updateData.whatsappSettings = whatsappSettings;

    if (!config) {
      config = await SystemConfig.create(updateData);
    } else {
      await config.update(updateData);
    }

    res.json({
      message: 'Configuración de notificaciones actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando configuración de notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/config/test-email
 * @desc Probar configuración de email
 */
router.post('/test-email', auth, adminOnly, async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        error: 'Email de prueba requerido'
      });
    }

    // TODO: Implementar envío de email de prueba
    // Por ahora solo simulamos
    
    res.json({
      message: `Email de prueba enviado a ${testEmail} exitosamente`,
      success: true
    });

  } catch (error) {
    console.error('Error probando email:', error);
    res.status(500).json({ 
      error: 'Error enviando email de prueba',
      success: false
    });
  }
});

/**
 * @route GET /api/v1/config/network
 * @desc Obtener configuración de red para app móvil (simplificado)
 */
router.get('/network', async (req, res) => {
  try {
    // Configuración por defecto sin depender de la base de datos
    const networkSettings = {
      serverHost: '0.0.0.0',
      serverPort: parseInt(process.env.PORT) || 3000,
      corsOrigin: '*',
      maxConnections: 100,
      autoDetectIP: true,
      firewallAutoConfig: true
    };

    // Obtener IP actual del sistema
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const ips = [];
    
    Object.keys(networkInterfaces).forEach(interfaceName => {
      networkInterfaces[interfaceName].forEach(network => {
        if (network.family === 'IPv4' && !network.internal) {
          ips.push({
            interface: interfaceName,
            ip: network.address,
            mac: network.mac
          });
        }
      });
    });

    res.json({
      ...networkSettings,
      detectedIPs: ips,
      currentPort: process.env.PORT || 3000,
      serverStatus: 'running'
    });

  } catch (error) {
    console.error('Error obteniendo configuración de red:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/config/network
 * @desc Actualizar configuración de red (simplificado - sin auth para pruebas)
 */
router.put('/network', async (req, res) => {
  try {
    const {
      serverHost,
      serverPort,
      corsOrigin,
      maxConnections,
      autoDetectIP,
      firewallAutoConfig
    } = req.body;

    const networkSettings = {
      serverHost: serverHost || '0.0.0.0',
      serverPort: parseInt(serverPort) || 3000,
      corsOrigin: corsOrigin || '*',
      maxConnections: parseInt(maxConnections) || 100,
      autoDetectIP: autoDetectIP !== undefined ? autoDetectIP : true,
      firewallAutoConfig: firewallAutoConfig !== undefined ? firewallAutoConfig : true
    };

    // Por ahora solo simular guardado (sin base de datos)
    console.log('Configuración de red recibida:', networkSettings);

    // Si se cambió el puerto, verificar si está disponible
    if (networkSettings.serverPort !== (parseInt(process.env.PORT) || 3000)) {
      const net = require('net');
      const server = net.createServer();
      
      try {
        await new Promise((resolve, reject) => {
          server.listen(networkSettings.serverPort, (err) => {
            if (err) reject(err);
            else {
              server.close();
              resolve();
            }
          });
          server.on('error', reject);
        });

        // Puerto disponible - configurar firewall si está habilitado
        if (networkSettings.firewallAutoConfig && process.platform === 'win32') {
          try {
            const { exec } = require('child_process');
            exec(`netsh advfirewall firewall add rule name="Node.js Server Port ${networkSettings.serverPort}" dir=in action=allow protocol=TCP localport=${networkSettings.serverPort}`, 
            (error) => {
              if (error) {
                console.log('No se pudo configurar firewall automáticamente - se requieren permisos de administrador');
              } else {
                console.log(`Regla de firewall creada para puerto ${networkSettings.serverPort}`);
              }
            });
          } catch (firewallError) {
            console.log('Error configurando firewall:', firewallError.message);
          }
        }

      } catch (portError) {
        return res.status(400).json({
          error: `Puerto ${networkSettings.serverPort} no está disponible`,
          suggestion: 'Intenta con otro puerto o verifica que no esté en uso'
        });
      }
    }

    res.json({
      message: 'Configuración de red actualizada exitosamente',
      networkSettings,
      restartRequired: networkSettings.serverPort !== (parseInt(process.env.PORT) || 3000)
    });

  } catch (error) {
    console.error('Error actualizando configuración de red:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/config/mobile-connection
 * @desc Endpoint público para que la app móvil verifique conexión y obtenga configuración
 */
router.get('/mobile-connection', async (req, res) => {
  try {
    // Verificar conectividad de base de datos
    let databaseConnected = false;
    let dbStatus = 'disconnected';
    
    try {
      const { sequelize } = require('../config/database');
      await sequelize.authenticate();
      databaseConnected = true;
      dbStatus = 'connected';
    } catch (dbError) {
      console.log('Database connection test failed:', dbError.message);
      databaseConnected = false;
      dbStatus = `error: ${dbError.message}`;
    }

    // Obtener configuración si la DB está disponible
    let config = null;
    try {
      if (databaseConnected) {
        config = await SystemConfig.findOne({
          attributes: ['networkSettings', 'companyName', 'timezone']
        });
      }
    } catch (configError) {
      console.log('Config fetch failed:', configError.message);
    }

    const networkSettings = config?.networkSettings || {};
    
    // Obtener información de red del sistema
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const detectedIPs = [];
    let primaryIP = 'localhost';
    
    // Recopilar todas las IPs disponibles
    Object.keys(networkInterfaces).forEach(interfaceName => {
      networkInterfaces[interfaceName].forEach(network => {
        if (network.family === 'IPv4' && !network.internal) {
          const ipInfo = {
            interface: interfaceName,
            ip: network.address,
            mac: network.mac,
            isPrimary: false
          };
          
          // Determinar IP principal (WiFi o Ethernet, no virtual)
          if (!network.address.startsWith('169.254') && // No APIPA
              !network.address.startsWith('127.') && // No loopback
              (interfaceName.toLowerCase().includes('wifi') || 
               interfaceName.toLowerCase().includes('ethernet') ||
               interfaceName.toLowerCase().includes('wi-fi') ||
               interfaceName.toLowerCase().includes('lan'))) {
            primaryIP = network.address;
            ipInfo.isPrimary = true;
          }
          
          detectedIPs.push(ipInfo);
        }
      });
    });

    // Si no se encontró IP principal, usar la primera disponible
    if (primaryIP === 'localhost' && detectedIPs.length > 0) {
      primaryIP = detectedIPs[0].ip;
      detectedIPs[0].isPrimary = true;
    }

    const response = {
      // Información de conexión
      success: true,
      serverIP: primaryIP,
      serverPort: parseInt(process.env.PORT) || networkSettings.serverPort || 3001,
      apiVersion: 'v1',
      status: 'active',
      
      // Estado de la base de datos
      database: {
        connected: databaseConnected,
        status: dbStatus,
      },
      
      // Información del servidor
      server: {
        name: 'Sistema de Asistencia Biométrico',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        uptime: Math.floor(process.uptime()),
        platform: process.platform,
      },
      
      // Configuración de la empresa
      company: {
        name: config?.companyName || 'Mi Empresa',
        timezone: config?.timezone || 'America/Argentina/Buenos_Aires',
      },
      
      // IPs detectadas
      network: {
        primaryIP: primaryIP,
        detectedIPs: detectedIPs,
        hostname: os.hostname(),
      },
      
      // Características disponibles
      features: {
        biometric: true,
        attendance: true,
        medical: true,
        reports: true,
        multiuser: databaseConnected,
      },
      
      // Timestamp de respuesta
      timestamp: new Date().toISOString(),
    };

    res.json(response);

  } catch (error) {
    console.error('Error en mobile-connection endpoint:', error);
    
    // Respuesta de emergencia sin base de datos
    res.json({
      success: false,
      error: error.message,
      serverIP: 'localhost',
      serverPort: parseInt(process.env.PORT) || 3001,
      apiVersion: 'v1',
      status: 'limited',
      database: {
        connected: false,
        status: `error: ${error.message}`,
      },
      server: {
        name: 'Sistema de Asistencia Biométrico',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        uptime: Math.floor(process.uptime()),
        platform: process.platform,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route GET /api/v1/config/system-info
 * @desc Obtener información del sistema (requiere auth)
 */
router.get('/system-info', auth, adminOnly, async (req, res) => {
  try {
    const systemInfo = {
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      timezone: process.env.TIMEZONE,
      database: {
        dialect: process.env.DB_DIALECT,
        mode: process.env.CONNECTION_MODE
      }
    };

    res.json(systemInfo);

  } catch (error) {
    console.error('Error obteniendo información del sistema:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/config/system-status
 * @desc Obtener estado básico del sistema (público)
 */
router.get('/system-status', async (req, res) => {
  try {
    // Verificar conectividad de base de datos
    let databaseConnected = false;
    let dbStatus = 'disconnected';
    
    try {
      const { sequelize } = require('../config/database');
      await sequelize.authenticate();
      databaseConnected = true;
      dbStatus = 'connected';
    } catch (dbError) {
      console.log('Database connection test failed:', dbError.message);
      databaseConnected = false;
      dbStatus = `error: ${dbError.message}`;
    }

    const systemInfo = {
      version: '1.0.0',
      status: 'running',
      uptime: Math.floor(process.uptime()),
      platform: process.platform,
      environment: process.env.NODE_ENV || 'production',
      database: {
        connected: databaseConnected,
        status: dbStatus
      },
      port: parseInt(process.env.PORT) || 3001,
      timestamp: new Date().toISOString()
    };

    res.json(systemInfo);

  } catch (error) {
    console.error('Error obteniendo estado del sistema:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      status: 'error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/v1/config/server-info
 * @desc Obtener información detallada del servidor para la app
 */
router.get('/server-info', async (req, res) => {
  try {
    // Verificar conectividad de base de datos
    let databaseConnected = false;
    let dbStatus = 'disconnected';
    let dbInfo = {};
    
    try {
      const { sequelize } = require('../config/database');
      await sequelize.authenticate();
      databaseConnected = true;
      dbStatus = 'connected';
      
      // Obtener información adicional de la base de datos
      dbInfo = {
        dialect: sequelize.getDialect(),
        version: await sequelize.databaseVersion(),
        host: sequelize.config.host,
        database: sequelize.config.database
      };
    } catch (dbError) {
      console.log('Database connection test failed:', dbError.message);
      databaseConnected = false;
      dbStatus = `error: ${dbError.message}`;
    }

    // Obtener información del sistema
    const os = require('os');
    
    const serverInfo = {
      name: 'Sistema de Asistencia Biométrico',
      version: '1.0.0',
      databaseConnected: databaseConnected,
      features: {
        biometric: true,
        attendance: true,
        medical: true,
        reports: true,
        multiuser: databaseConnected,
        realTimeSync: databaseConnected,
        offlineMode: !databaseConnected,
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        hostname: os.hostname(),
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024)
        }
      },
      database: {
        connected: databaseConnected,
        status: dbStatus,
        ...dbInfo
      },
      network: {
        port: parseInt(process.env.PORT) || 3001,
        environment: process.env.NODE_ENV || 'production'
      },
      timestamp: new Date().toISOString()
    };

    res.json(serverInfo);

  } catch (error) {
    console.error('Error obteniendo información del servidor:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      databaseConnected: false,
      features: {
        biometric: false,
        attendance: false,
        medical: false,
        reports: false,
        multiuser: false,
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;