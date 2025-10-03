/**
 * Rutas para configuración múltiple de proveedores ART
 */

const express = require('express');
const router = express.Router();
const { MultipleARTConfiguration } = require('../config/database');

// Obtener todos los proveedores ART
router.get('/', async (req, res) => {
  try {
    const artProviders = await MultipleARTConfiguration.findAll({
      where: { isActive: true },
      order: [
        ['priority', 'ASC'],
        ['name', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: artProviders,
      message: 'Proveedores ART obtenidos exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo proveedores ART:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo proveedores ART',
      error: error.message
    });
  }
});

// Obtener un proveedor ART específico
router.get('/:id', async (req, res) => {
  try {
    const artProvider = await MultipleARTConfiguration.findOne({
      where: { id: req.params.id, isActive: true }
    });

    if (!artProvider) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor ART no encontrado'
      });
    }

    res.json({
      success: true,
      data: artProvider,
      message: 'Proveedor ART obtenido exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo proveedor ART:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo proveedor ART',
      error: error.message
    });
  }
});

// Crear nuevo proveedor ART
router.post('/', async (req, res) => {
  try {
    const {
      name,
      clientCode,
      email,
      phone,
      emergencyContact,
      preferredChannel,
      priority,
      schedule,
      notificationSettings,
      address,
      website,
      notes
    } = req.body;

    // Validaciones básicas
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y email son requeridos'
      });
    }

    // Verificar que no exista otro proveedor con el mismo email
    const existingProvider = await MultipleARTConfiguration.findOne({
      where: { email, isActive: true }
    });

    if (existingProvider) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un proveedor ART con este email'
      });
    }

    const newProvider = await MultipleARTConfiguration.create({
      name,
      clientCode,
      email,
      phone,
      emergencyContact,
      preferredChannel: preferredChannel || 'email',
      priority: priority || 'secondary',
      schedule,
      notificationSettings: notificationSettings || {
        enableEmergency: true,
        enableRoutine: true,
        responseTimeout: 24,
        escalationEnabled: true
      },
      address,
      website,
      notes
    });

    res.status(201).json({
      success: true,
      data: newProvider,
      message: 'Proveedor ART creado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando proveedor ART:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando proveedor ART',
      error: error.message
    });
  }
});

// Actualizar proveedor ART
router.put('/:id', async (req, res) => {
  try {
    const artProvider = await MultipleARTConfiguration.findOne({
      where: { id: req.params.id, isActive: true }
    });

    if (!artProvider) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor ART no encontrado'
      });
    }

    // Verificar email único si se está cambiando
    if (req.body.email && req.body.email !== artProvider.email) {
      const existingProvider = await MultipleARTConfiguration.findOne({
        where: { 
          email: req.body.email, 
          isActive: true,
          id: { [require('sequelize').Op.ne]: req.params.id }
        }
      });

      if (existingProvider) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro proveedor ART con este email'
        });
      }
    }

    await artProvider.update(req.body);

    res.json({
      success: true,
      data: artProvider,
      message: 'Proveedor ART actualizado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando proveedor ART:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando proveedor ART',
      error: error.message
    });
  }
});

// Eliminar proveedor ART (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const artProvider = await MultipleARTConfiguration.findOne({
      where: { id: req.params.id, isActive: true }
    });

    if (!artProvider) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor ART no encontrado'
      });
    }

    await artProvider.update({ isActive: false });

    res.json({
      success: true,
      message: 'Proveedor ART eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando proveedor ART:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando proveedor ART',
      error: error.message
    });
  }
});

// Probar notificación a un proveedor específico
router.post('/:id/test-notification', async (req, res) => {
  try {
    const artProvider = await MultipleARTConfiguration.findOne({
      where: { id: req.params.id, isActive: true }
    });

    if (!artProvider) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor ART no encontrado'
      });
    }

    // Aquí iría la lógica para enviar notificación de prueba
    console.log(`🚨 Enviando notificación de prueba a ${artProvider.name} (${artProvider.email})`);
    
    // Simular envío exitoso
    setTimeout(() => {
      console.log(`✅ Notificación de prueba enviada a ${artProvider.name}`);
    }, 1000);

    res.json({
      success: true,
      message: `Notificación de prueba enviada a ${artProvider.name}`
    });
  } catch (error) {
    console.error('❌ Error enviando notificación de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error enviando notificación de prueba',
      error: error.message
    });
  }
});

// Probar notificación a todos los proveedores
router.post('/test-all-notifications', async (req, res) => {
  try {
    const artProviders = await MultipleARTConfiguration.findAll({
      where: { isActive: true },
      order: [['priority', 'ASC']]
    });

    if (artProviders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay proveedores ART configurados'
      });
    }

    // Enviar notificaciones a todos
    console.log(`🚨 Enviando notificación de prueba a ${artProviders.length} proveedores ART`);
    
    const results = [];
    for (const provider of artProviders) {
      try {
        // Aquí iría la lógica específica de envío por canal
        console.log(`📧 Notificación a ${provider.name} via ${provider.preferredChannel}`);
        results.push({
          providerId: provider.id,
          providerName: provider.name,
          status: 'sent',
          channel: provider.preferredChannel
        });
      } catch (error) {
        results.push({
          providerId: provider.id,
          providerName: provider.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Notificaciones enviadas a ${artProviders.length} proveedores`,
      data: {
        totalProviders: artProviders.length,
        results
      }
    });
  } catch (error) {
    console.error('❌ Error enviando notificaciones masivas:', error);
    res.status(500).json({
      success: false,
      message: 'Error enviando notificaciones masivas',
      error: error.message
    });
  }
});

// Obtener configuración global
router.get('/config/global', async (req, res) => {
  try {
    // Aquí se obtendría la configuración global de ART
    // Por ahora devolvemos una configuración por defecto
    const globalConfig = {
      enabled: true,
      globalChannel: 'email',
      totalProviders: await MultipleARTConfiguration.count({ where: { isActive: true } }),
      priorityDistribution: await MultipleARTConfiguration.findAll({
        attributes: [
          'priority',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: { isActive: true },
        group: ['priority']
      })
    };

    res.json({
      success: true,
      data: globalConfig,
      message: 'Configuración global obtenida exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo configuración global:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo configuración global',
      error: error.message
    });
  }
});

module.exports = router;