const express = require('express');
const router = express.Router();
const { Kiosk } = require('../config/database');
const { auth } = require('../middleware/auth');

// Helper: Transformar kiosko al formato del frontend
function formatKiosk(kiosk) {
  const kioskData = kiosk.toJSON ? kiosk.toJSON() : kiosk;
  return {
    id: kioskData.id,
    name: kioskData.name,
    description: kioskData.description,
    location: kioskData.location,
    deviceId: kioskData.device_id,
    gpsLocation: {
      lat: kioskData.gps_lat,
      lng: kioskData.gps_lng
    },
    isConfigured: kioskData.is_configured,
    isActive: kioskData.is_active,
    createdAt: kioskData.created_at,
    updatedAt: kioskData.updated_at,
    companyId: kioskData.company_id
  };
}

/**
 * @route GET /api/v1/kiosks
 * @desc Obtener todos los kioscos de la empresa del usuario
 */
router.get('/', auth, async (req, res) => {
  try {
    // Obtener company_id del usuario autenticado
    const companyId = req.user?.company_id || 1;

    console.log(`📟 [KIOSKS] Obteniendo kioscos para empresa ${companyId}`);

    const kiosks = await Kiosk.findAll({
      where: {
        is_active: true,
        company_id: companyId
      },
      order: [['name', 'ASC']]
    });

    console.log(`✅ [KIOSKS] Encontrados ${kiosks.length} kioscos`);

    // Transformar datos al formato que espera el frontend
    const formattedKiosks = kiosks.map(formatKiosk);

    res.json({
      success: true,
      kiosks: formattedKiosks,
      count: formattedKiosks.length
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error obteniendo kioscos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/kiosks/:id
 * @desc Obtener kiosko específico
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    const kiosk = await Kiosk.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!kiosk) {
      return res.status(404).json({
        error: 'Kiosko no encontrado',
        success: false
      });
    }

    res.json({
      success: true,
      data: formatKiosk(kiosk)
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error obteniendo kiosko:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route POST /api/v1/kiosks
 * @desc Crear nuevo kiosko
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      deviceId,
      device_id,
      gps_lat,
      gps_lng,
      gpsLocation
    } = req.body;

    const companyId = req.user?.company_id || 1;

    console.log('📝 [KIOSKS] Creando kiosko:', {
      name,
      location,
      companyId,
      bodyData: req.body,
      userFromAuth: req.user ? {
        id: req.user.user_id || req.user.id,
        email: req.user.email,
        company_id: req.user.company_id
      } : 'NO USER'
    });

    if (!name) {
      return res.status(400).json({
        error: 'El nombre del kiosko es requerido',
        success: false
      });
    }

    // GPS es opcional - se autocompleta cuando el kiosko físico se conecta
    const lat = gpsLocation?.lat || gps_lat || null;
    const lng = gpsLocation?.lng || gps_lng || null;

    // Mapear datos del frontend al formato de la base de datos
    const kioskData = {
      name: name.trim(),
      description: description || '',
      location: location || null,
      device_id: deviceId || device_id || null,
      gps_lat: lat,
      gps_lng: lng,
      is_configured: !!(name && location), // Configurado si tiene nombre y ubicación descriptiva
      is_active: true,
      company_id: companyId
    };

    console.log('📝 [KIOSKS] Datos procesados:', kioskData);

    const kiosk = await Kiosk.create(kioskData);

    console.log('✅ [KIOSKS] Kiosko creado exitosamente:', kiosk.id);

    res.status(201).json({
      success: true,
      data: formatKiosk(kiosk),
      message: 'Kiosko creado exitosamente'
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error creando kiosko:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Ya existe un kiosko con ese nombre o coordenadas GPS en esta empresa',
        success: false
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Datos de kiosko inválidos: ' + error.message,
        success: false
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route PUT /api/v1/kiosks/:id
 * @desc Actualizar kiosko
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      location,
      deviceId,
      device_id,
      gps_lat,
      gps_lng,
      gpsLocation,
      isActive
    } = req.body;

    const companyId = req.user?.company_id || 1;

    console.log('✏️ [KIOSKS] Actualizando kiosko:', req.params.id, {
      bodyData: req.body,
      companyId
    });

    const kiosk = await Kiosk.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!kiosk) {
      return res.status(404).json({
        error: 'Kiosko no encontrado',
        success: false
      });
    }

    // Preparar datos de actualización (solo actualizar campos enviados)
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (deviceId !== undefined || device_id !== undefined) {
      updateData.device_id = deviceId || device_id || null;
    }

    // Actualizar GPS si viene en cualquier formato
    if (gpsLocation?.lat !== undefined || gps_lat !== undefined) {
      updateData.gps_lat = gpsLocation?.lat || gps_lat || null;
    }
    if (gpsLocation?.lng !== undefined || gps_lng !== undefined) {
      updateData.gps_lng = gpsLocation?.lng || gps_lng || null;
    }

    // Actualizar estado activo
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    console.log('✏️ [KIOSKS] Datos a actualizar:', updateData);

    await kiosk.update(updateData);

    console.log('✅ [KIOSKS] Kiosko actualizado exitosamente');

    res.json({
      success: true,
      data: formatKiosk(kiosk),
      message: 'Kiosko actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error actualizando kiosko:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Ya existe un kiosko con ese nombre o coordenadas GPS en esta empresa',
        success: false
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Datos de kiosko inválidos: ' + error.message,
        success: false
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/kiosks/:id
 * @desc Eliminar kiosko (soft delete)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    const kiosk = await Kiosk.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!kiosk) {
      return res.status(404).json({
        error: 'Kiosko no encontrado',
        success: false
      });
    }

    await kiosk.update({ is_active: false });

    console.log(`✅ [KIOSKS] Kiosko ${kiosk.id} marcado como inactivo`);

    res.json({
      success: true,
      message: 'Kiosko eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error eliminando kiosko:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/kiosks/:id/validate-gps
 * @desc Validar GPS de un empleado contra ubicación del kiosko
 */
router.post('/:id/validate-gps', auth, async (req, res) => {
  try {
    const { userLat, userLng, maxDistance = 100 } = req.body;
    const companyId = req.user?.company_id || 1;

    const kiosk = await Kiosk.findOne({
      where: {
        id: req.params.id,
        company_id: companyId,
        is_active: true
      }
    });

    if (!kiosk) {
      return res.status(404).json({
        error: 'Kiosko no encontrado',
        success: false
      });
    }

    if (!kiosk.gps_lat || !kiosk.gps_lng) {
      return res.status(400).json({
        error: 'Kiosko no tiene coordenadas GPS configuradas',
        success: false
      });
    }

    if (!userLat || !userLng) {
      return res.status(400).json({
        error: 'Se requieren coordenadas GPS del usuario',
        success: false
      });
    }

    // Calcular distancia usando el método del modelo
    const distance = kiosk.getDistanceToLocation(userLat, userLng);

    const isValid = distance !== null && distance <= maxDistance;

    console.log(`📍 [KIOSKS] Validación GPS - Kiosko: ${kiosk.name}, Distancia: ${distance}m, Válido: ${isValid}`);

    res.json({
      success: true,
      valid: isValid,
      distance: distance,
      maxDistance: maxDistance,
      kioskName: kiosk.name,
      kioskLocation: {
        lat: parseFloat(kiosk.gps_lat),
        lng: parseFloat(kiosk.gps_lng)
      }
    });

  } catch (error) {
    console.error('❌ [KIOSKS] Error validando GPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
