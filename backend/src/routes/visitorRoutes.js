const express = require('express');
const router = express.Router();
const { Visitor, VisitorGpsTracking, AccessNotification, User, Department, Kiosk, Company } = require('../config/database');
const { auth, adminOnly } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter para GPS tracking (max 60 requests por minuto por IP)
const gpsTrackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto
  message: {
    success: false,
    error: 'Demasiadas solicitudes de GPS tracking. Intente nuevamente en 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper: Calcular distancia entre dos coordenadas GPS (fórmula de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

// Helper: Transformar visitante al formato del frontend
function formatVisitor(visitor) {
  const visitorData = visitor.toJSON ? visitor.toJSON() : visitor;
  const fullName = visitor.getFullName ? visitor.getFullName() : `${visitorData.first_name} ${visitorData.last_name}`;
  return {
    id: visitorData.id,
    dni: visitorData.dni,
    firstName: visitorData.first_name,
    lastName: visitorData.last_name,
    fullName: fullName,
    // Alias para compatibilidad con tests
    name: fullName,
    document_number: visitorData.dni,
    document_type: 'DNI', // Default
    email: visitorData.email,
    phone: visitorData.phone,
    visitReason: visitorData.visit_reason,
    reason: visitorData.visit_reason, // Alias
    visitingDepartmentId: visitorData.visiting_department_id,
    responsibleEmployeeId: visitorData.responsible_employee_id,
    contact_person: visitorData.responsible_employee_id, // Alias
    authorizationStatus: visitorData.authorization_status,
    status: visitorData.authorization_status, // Alias
    authorizedBy: visitorData.authorized_by,
    authorizedAt: visitorData.authorized_at,
    rejectionReason: visitorData.rejection_reason,
    gpsTrackingEnabled: visitorData.gps_tracking_enabled,
    keyringId: visitorData.keyring_id,
    badge_number: visitorData.keyring_id, // Alias
    photoUrl: visitorData.photo_url,
    checkIn: visitorData.check_in,
    check_in: visitorData.check_in, // Alias snake_case
    checkOut: visitorData.check_out,
    check_out: visitorData.check_out, // Alias snake_case
    kioskId: visitorData.kiosk_id,
    scheduledVisitDate: visitorData.scheduled_visit_date,
    expectedDurationMinutes: visitorData.expected_duration_minutes,
    isActive: visitorData.is_active,
    notes: visitorData.notes,
    createdAt: visitorData.created_at,
    updatedAt: visitorData.updated_at,
    companyId: visitorData.company_id,
    company_id: visitorData.company_id, // Alias snake_case
    company_from: visitorData.company_from || visitorData.notes || null, // Campo para empresa de origen del visitante
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
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        },
        {
          model: Department,
          as: 'visitingDepartment',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'authorizedBy',
          attributes: ['user_id', 'firstName', 'lastName'],
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

    // ENTERPRISE VALIDATION: Validar fecha programada no sea en el pasado
    const scheduledDate = new Date(scheduledVisitDate);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutos de tolerancia

    if (scheduledDate < fiveMinutesAgo) {
      return res.status(400).json({
        error: 'La fecha de visita no puede ser en el pasado',
        success: false
      });
    }

    // ENTERPRISE VALIDATION: Validar duración esperada (entre 5 minutos y 24 horas)
    if (expectedDurationMinutes) {
      const durationNum = parseInt(expectedDurationMinutes);
      if (isNaN(durationNum) || durationNum < 5 || durationNum > 1440) {
        return res.status(400).json({
          error: 'La duración esperada debe estar entre 5 y 1440 minutos (24 horas)',
          success: false
        });
      }
    }

    // Verificar que el empleado responsable existe y pertenece a la empresa
    const responsibleEmployee = await User.findOne({
      where: {
        user_id: responsibleEmployeeId,
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
 * @access Admin OR responsable del visitante
 * @security ENTERPRISE: Solo admin o empleado responsable puede autorizar
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

    // ENTERPRISE SECURITY: Validar permisos de autorización
    const isAdmin = req.user?.role === 'admin';
    const isResponsible = visitor.responsible_employee_id === userId;

    if (!isAdmin && !isResponsible) {
      return res.status(403).json({
        error: 'No tiene permisos para autorizar esta visita. Solo el administrador o el empleado responsable pueden hacerlo.',
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
 * @security Rate limited: 60 requests/minute
 */
router.post('/:id/gps-tracking', auth, gpsTrackingLimiter, async (req, res) => {
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

    // GEOFENCING: Calcular si está dentro del perímetro de la empresa
    const company = await Company.findByPk(companyId);

    let isInsideFacility = true;
    let distanceFromFacility = 0;

    if (company && company.latitude && company.longitude) {
      // Calcular distancia real usando fórmula de Haversine
      distanceFromFacility = calculateDistance(
        parseFloat(gpsLat),
        parseFloat(gpsLng),
        parseFloat(company.latitude),
        parseFloat(company.longitude)
      );

      // Radio de seguridad (default 500 metros si no está configurado)
      const securityRadiusMeters = company.security_radius_meters || 500;

      // Determinar si está dentro del perímetro
      isInsideFacility = distanceFromFacility <= securityRadiusMeters;

      console.log(`🌍 [GPS] Visitante ${visitor.id}: ${distanceFromFacility.toFixed(2)}m de la empresa (límite: ${securityRadiusMeters}m) - ${isInsideFacility ? 'DENTRO' : 'FUERA'}`);
    } else {
      console.warn(`⚠️ [GPS] Empresa ${companyId} sin coordenadas GPS configuradas. Geofencing deshabilitado.`);
    }

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
 * @route PUT /api/v1/visitors/:id
 * @desc Actualizar datos de visitante
 * @access Admin o empleado responsable
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.user_id || req.user?.id;

    console.log('✏️ [VISITORS] Actualizando visitante:', req.params.id);

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

    // Validar permisos: solo admin o empleado responsable puede editar
    const isAdmin = req.user?.role === 'admin';
    const isResponsible = visitor.responsible_employee_id === userId;

    if (!isAdmin && !isResponsible) {
      return res.status(403).json({
        error: 'No tiene permisos para editar esta visita',
        success: false
      });
    }

    // Campos permitidos para actualización
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'dni',
      'visitReason', 'notes', 'scheduledVisitDate',
      'responsibleEmployeeId', 'vehiclePlate', 'vehicleModel'
    ];

    // Mapear camelCase a snake_case
    const fieldMapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      visitReason: 'visit_reason',
      scheduledVisitDate: 'scheduled_visit_date',
      responsibleEmployeeId: 'responsible_employee_id',
      vehiclePlate: 'vehicle_plate',
      vehicleModel: 'vehicle_model'
    };

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const dbField = fieldMapping[field] || field;
        updateData[dbField] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No se proporcionaron campos para actualizar',
        success: false
      });
    }

    await visitor.update(updateData);

    const updatedVisitor = await Visitor.findByPk(req.params.id);

    console.log('✅ [VISITORS] Visitante actualizado:', req.params.id);

    res.json({
      success: true,
      message: 'Visitante actualizado exitosamente',
      visitor: updatedVisitor
    });

  } catch (error) {
    console.error('❌ [VISITORS] Error actualizando visitante:', error);
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
