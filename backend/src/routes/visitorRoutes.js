const express = require('express');
const router = express.Router();
const { Visitor, VisitorGpsTracking, AccessNotification, User, Department, Kiosk } = require('../config/database');
const { auth } = require('../middleware/auth');

// Helper: Transformar visitante al formato del frontend
function formatVisitor(visitor) {
  const visitorData = visitor.toJSON ? visitor.toJSON() : visitor;
  return {
    id: visitorData.id,
    dni: visitorData.dni,
    firstName: visitorData.first_name,
    lastName: visitorData.last_name,
    fullName: visitor.getFullName ? visitor.getFullName() : `${visitorData.first_name} ${visitorData.last_name}`,
    email: visitorData.email,
    phone: visitorData.phone,
    visitReason: visitorData.visit_reason,
    visitingDepartmentId: visitorData.visiting_department_id,
    responsibleEmployeeId: visitorData.responsible_employee_id,
    authorizationStatus: visitorData.authorization_status,
    authorizedBy: visitorData.authorized_by,
    authorizedAt: visitorData.authorized_at,
    rejectionReason: visitorData.rejection_reason,
    gpsTrackingEnabled: visitorData.gps_tracking_enabled,
    keyringId: visitorData.keyring_id,
    photoUrl: visitorData.photo_url,
    checkIn: visitorData.check_in,
    checkOut: visitorData.check_out,
    kioskId: visitorData.kiosk_id,
    scheduledVisitDate: visitorData.scheduled_visit_date,
    expectedDurationMinutes: visitorData.expected_duration_minutes,
    isActive: visitorData.is_active,
    notes: visitorData.notes,
    createdAt: visitorData.created_at,
    updatedAt: visitorData.updated_at,
    companyId: visitorData.company_id,
    // Datos incluidos si existen
    responsibleEmployee: visitorData.responsibleEmployee,
    visitingDepartment: visitorData.visitingDepartment,
    authorizedByUser: visitorData.authorizedByUser,
    kiosk: visitorData.kiosk
  };
}

/**
 * @route GET /api/v1/visitors
 * @desc Listar visitas de la empresa
 */
router.get('/', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;
    const { status, date, departmentId } = req.query;

    console.log(`👥 [VISITORS] Obteniendo visitas para empresa ${companyId}`);

    const where = {
      company_id: companyId,
      is_active: true
    };

    // Filtros opcionales
    if (status) {
      where.authorization_status = status;
    }

    if (departmentId) {
      where.visiting_department_id = departmentId;
    }

    if (date) {
      // Buscar visitas del día específico
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      where.scheduled_visit_date = {
        [require('sequelize').Op.between]: [startDate, endDate]
      };
    }

    const visitors = await Visitor.findAll({
      where: where,
      include: [
        {
          model: User,
          as: 'responsibleEmployee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Department,
          as: 'visitingDepartment',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'authorizedBy',
          attributes: ['id', 'first_name', 'last_name'],
          required: false
        },
        {
          model: Kiosk,
          as: 'kiosk',
          attributes: ['id', 'name', 'location'],
          required: false
        }
      ],
      order: [['scheduled_visit_date', 'DESC']]
    });

    console.log(`✅ [VISITORS] Encontrados ${visitors.length} visitantes`);

    const formattedVisitors = visitors.map(formatVisitor);

    res.json({
      success: true,
      visitors: formattedVisitors,
      count: formattedVisitors.length
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error obteniendo visitantes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/visitors/:id
 * @desc Obtener visitante específico
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    const visitor = await Visitor.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      },
      include: [
        {
          model: User,
          as: 'responsibleEmployee',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
        },
        {
          model: Department,
          as: 'visitingDepartment',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'authorizedBy',
          attributes: ['id', 'first_name', 'last_name'],
          required: false
        },
        {
          model: Kiosk,
          as: 'kiosk',
          attributes: ['id', 'name', 'location'],
          required: false
        }
      ]
    });

    if (!visitor) {
      return res.status(404).json({
        error: 'Visitante no encontrado',
        success: false
      });
    }

    res.json({
      success: true,
      data: formatVisitor(visitor)
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error obteniendo visitante:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route POST /api/v1/visitors
 * @desc Crear solicitud de visita
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      dni,
      firstName,
      lastName,
      email,
      phone,
      visitReason,
      visitingDepartmentId,
      responsibleEmployeeId,
      scheduledVisitDate,
      expectedDurationMinutes,
      gpsTrackingEnabled,
      notes
    } = req.body;

    const companyId = req.user?.company_id || 1;

    console.log('👥 [VISITORS] Creando nueva solicitud de visita:', {
      dni,
      firstName,
      lastName,
      companyId
    });

    // Validaciones
    if (!dni || !firstName || !lastName || !visitReason || !responsibleEmployeeId || !scheduledVisitDate) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: dni, firstName, lastName, visitReason, responsibleEmployeeId, scheduledVisitDate',
        success: false
      });
    }

    // Verificar que el empleado responsable existe y pertenece a la empresa
    const responsibleEmployee = await User.findOne({
      where: {
        id: responsibleEmployeeId,
        company_id: companyId
      }
    });

    if (!responsibleEmployee) {
      return res.status(404).json({
        error: 'Empleado responsable no encontrado en esta empresa',
        success: false
      });
    }

    // Verificar departamento si se proporciona
    if (visitingDepartmentId) {
      const department = await Department.findOne({
        where: {
          id: visitingDepartmentId,
          company_id: companyId
        }
      });

      if (!department) {
        return res.status(404).json({
          error: 'Departamento no encontrado en esta empresa',
          success: false
        });
      }
    }

    const visitorData = {
      dni: dni.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email || null,
      phone: phone || null,
      visit_reason: visitReason,
      visiting_department_id: visitingDepartmentId || null,
      responsible_employee_id: responsibleEmployeeId,
      scheduled_visit_date: scheduledVisitDate,
      expected_duration_minutes: expectedDurationMinutes || 60,
      gps_tracking_enabled: gpsTrackingEnabled || false,
      authorization_status: 'pending',
      notes: notes || null,
      company_id: companyId
    };

    const visitor = await Visitor.create(visitorData);

    console.log('✅ [VISITORS] Visita creada exitosamente:', visitor.id);

    // Crear notificación para el empleado responsable
    await AccessNotification.createVisitorNotification({
      companyId: companyId,
      visitorId: visitor.id,
      notificationType: 'visitor_authorization',
      title: 'Nueva solicitud de visita',
      message: `${visitor.getFullName()} solicita visitar ${visitingDepartmentId ? 'departamento' : 'la empresa'}. Motivo: ${visitReason}`,
      priority: 'medium',
      recipientUserId: responsibleEmployeeId,
      metadata: {
        dni: dni,
        scheduledDate: scheduledVisitDate
      }
    });

    res.status(201).json({
      success: true,
      data: formatVisitor(visitor),
      message: 'Solicitud de visita creada exitosamente'
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error creando visita:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Datos de visita inválidos: ' + error.message,
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
 * @route PUT /api/v1/visitors/:id/authorize
 * @desc Autorizar o rechazar visita
 */
router.put('/:id/authorize', auth, async (req, res) => {
  try {
    const { action, rejectionReason, keyringId } = req.body; // action: 'authorize' | 'reject'
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.user_id || req.user?.id;

    console.log('✏️ [VISITORS] Autorizando visita:', req.params.id, { action, userId });

    if (!['authorize', 'reject'].includes(action)) {
      return res.status(400).json({
        error: 'Acción inválida. Debe ser "authorize" o "reject"',
        success: false
      });
    }

    const visitor = await Visitor.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!visitor) {
      return res.status(404).json({
        error: 'Visitante no encontrado',
        success: false
      });
    }

    if (visitor.authorization_status !== 'pending') {
      return res.status(400).json({
        error: `Esta visita ya fue ${visitor.authorization_status === 'authorized' ? 'autorizada' : 'rechazada'}`,
        success: false
      });
    }

    const updateData = {
      authorization_status: action === 'authorize' ? 'authorized' : 'rejected',
      authorized_by: userId,
      authorized_at: new Date()
    };

    if (action === 'reject') {
      updateData.rejection_reason = rejectionReason || 'Sin motivo especificado';
    }

    if (action === 'authorize' && keyringId) {
      updateData.keyring_id = keyringId;
      updateData.gps_tracking_enabled = true;
    }

    await visitor.update(updateData);

    console.log(`✅ [VISITORS] Visita ${action === 'authorize' ? 'autorizada' : 'rechazada'}`);

    // Crear notificación para el empleado responsable
    await AccessNotification.createVisitorNotification({
      companyId: companyId,
      visitorId: visitor.id,
      notificationType: action === 'authorize' ? 'visitor_arrival' : 'visitor_authorization',
      title: action === 'authorize' ? 'Visita autorizada' : 'Visita rechazada',
      message: action === 'authorize'
        ? `La visita de ${visitor.getFullName()} ha sido autorizada`
        : `La visita de ${visitor.getFullName()} ha sido rechazada. Motivo: ${rejectionReason || 'No especificado'}`,
      priority: 'medium',
      recipientUserId: visitor.responsible_employee_id,
      metadata: {
        action: action,
        authorizedBy: userId
      }
    });

    res.json({
      success: true,
      data: formatVisitor(visitor),
      message: `Visita ${action === 'authorize' ? 'autorizada' : 'rechazada'} exitosamente`
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error autorizando visita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/visitors/:id/check-in
 * @desc Registrar ingreso de visitante
 */
router.post('/:id/check-in', auth, async (req, res) => {
  try {
    const { kioskId, facialTemplate } = req.body;
    const companyId = req.user?.company_id || 1;

    console.log('📥 [VISITORS] Registrando check-in de visita:', req.params.id);

    const visitor = await Visitor.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!visitor) {
      return res.status(404).json({
        error: 'Visitante no encontrado',
        success: false
      });
    }

    if (!visitor.canCheckIn()) {
      return res.status(400).json({
        error: 'No se puede registrar el ingreso en este momento. Verifique el estado de autorización y la fecha/hora planificada',
        success: false
      });
    }

    if (visitor.check_in) {
      return res.status(400).json({
        error: 'El visitante ya registró su ingreso',
        success: false
      });
    }

    const updateData = {
      check_in: new Date(),
      kiosk_id: kioskId || null
    };

    if (facialTemplate) {
      updateData.facial_template = facialTemplate;
    }

    await visitor.update(updateData);

    console.log('✅ [VISITORS] Check-in registrado exitosamente');

    // Crear notificación de llegada
    await AccessNotification.createVisitorNotification({
      companyId: companyId,
      visitorId: visitor.id,
      notificationType: 'visitor_arrival',
      title: 'Visitante ingresó a las instalaciones',
      message: `${visitor.getFullName()} ha ingresado a las instalaciones`,
      priority: 'low',
      recipientUserId: visitor.responsible_employee_id,
      kioskId: kioskId,
      metadata: {
        checkInTime: updateData.check_in
      }
    });

    res.json({
      success: true,
      data: formatVisitor(visitor),
      message: 'Ingreso registrado exitosamente'
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error registrando check-in:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route POST /api/v1/visitors/:id/check-out
 * @desc Registrar salida de visitante
 */
router.post('/:id/check-out', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    console.log('📤 [VISITORS] Registrando check-out de visita:', req.params.id);

    const visitor = await Visitor.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!visitor) {
      return res.status(404).json({
        error: 'Visitante no encontrado',
        success: false
      });
    }

    if (!visitor.check_in) {
      return res.status(400).json({
        error: 'El visitante no ha registrado su ingreso',
        success: false
      });
    }

    if (visitor.check_out) {
      return res.status(400).json({
        error: 'El visitante ya registró su salida',
        success: false
      });
    }

    await visitor.update({
      check_out: new Date()
    });

    console.log('✅ [VISITORS] Check-out registrado exitosamente');

    // Crear notificación de salida
    await AccessNotification.createVisitorNotification({
      companyId: companyId,
      visitorId: visitor.id,
      notificationType: 'visitor_checkout',
      title: 'Visitante salió de las instalaciones',
      message: `${visitor.getFullName()} ha salido de las instalaciones. Duración de visita: ${visitor.getVisitDurationMinutes()} minutos`,
      priority: 'low',
      recipientUserId: visitor.responsible_employee_id,
      metadata: {
        checkOutTime: new Date(),
        durationMinutes: visitor.getVisitDurationMinutes()
      }
    });

    res.json({
      success: true,
      data: formatVisitor(visitor),
      message: 'Salida registrada exitosamente'
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error registrando check-out:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/visitors/:id/gps-history
 * @desc Obtener historial de tracking GPS de visitante
 */
router.get('/:id/gps-history', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;
    const { limit = 100 } = req.query;

    const visitor = await Visitor.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!visitor) {
      return res.status(404).json({
        error: 'Visitante no encontrado',
        success: false
      });
    }

    const history = await VisitorGpsTracking.findAll({
      where: {
        visitor_id: visitor.id,
        company_id: companyId
      },
      order: [['tracked_at', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      history: history.map(h => h.toJSON()),
      count: history.length
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error obteniendo historial GPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route POST /api/v1/visitors/:id/gps-tracking
 * @desc Enviar lectura GPS de visitante (desde llavero GPS)
 */
router.post('/:id/gps-tracking', auth, async (req, res) => {
  try {
    const {
      gpsLat,
      gpsLng,
      accuracy,
      altitude,
      speed,
      batteryLevel,
      signalStrength,
      deviceId
    } = req.body;

    const companyId = req.user?.company_id || 1;

    const visitor = await Visitor.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!visitor) {
      return res.status(404).json({
        error: 'Visitante no encontrado',
        success: false
      });
    }

    if (!visitor.gps_tracking_enabled) {
      return res.status(400).json({
        error: 'El tracking GPS no está habilitado para este visitante',
        success: false
      });
    }

    if (!gpsLat || !gpsLng) {
      return res.status(400).json({
        error: 'Se requieren coordenadas GPS (gpsLat, gpsLng)',
        success: false
      });
    }

    // TODO: Calcular si está dentro del perímetro de la empresa
    // Por ahora asumimos que sí
    const isInsideFacility = true;
    const distanceFromFacility = 0;

    const trackingData = {
      visitor_id: visitor.id,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      accuracy: accuracy || null,
      altitude: altitude || null,
      speed: speed || null,
      battery_level: batteryLevel || null,
      signal_strength: signalStrength || null,
      is_inside_facility: isInsideFacility,
      distance_from_facility: distanceFromFacility,
      device_id: deviceId || visitor.keyring_id,
      tracked_at: new Date(),
      company_id: companyId
    };

    const tracking = await VisitorGpsTracking.create(trackingData);

    // Si se generó alerta, enviar notificación
    if (tracking.alert_generated) {
      await AccessNotification.createVisitorNotification({
        companyId: companyId,
        visitorId: visitor.id,
        notificationType: tracking.alert_type === 'outside_facility' ? 'visitor_outside_facility' : 'system_alert',
        title: 'Alerta GPS de visitante',
        message: tracking.alert_message,
        priority: 'high',
        recipientUserId: visitor.responsible_employee_id,
        metadata: {
          gpsLat: gpsLat,
          gpsLng: gpsLng,
          alertType: tracking.alert_type
        }
      });
    }

    res.json({
      success: true,
      data: tracking.toJSON(),
      message: 'Lectura GPS registrada exitosamente'
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error registrando GPS:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/visitors/:id
 * @desc Cancelar visita (soft delete)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;

    const visitor = await Visitor.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!visitor) {
      return res.status(404).json({
        error: 'Visitante no encontrado',
        success: false
      });
    }

    if (visitor.check_in && !visitor.check_out) {
      return res.status(400).json({
        error: 'No se puede cancelar una visita en curso. Debe registrar la salida primero.',
        success: false
      });
    }

    await visitor.update({ is_active: false });

    console.log(`✅ [VISITORS] Visita ${visitor.id} cancelada`);

    res.json({
      success: true,
      message: 'Visita cancelada exitosamente'
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error cancelando visita:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
