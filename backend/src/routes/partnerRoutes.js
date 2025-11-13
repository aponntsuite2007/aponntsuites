/**
 * partnerRoutes.js
 *
 * API REST para Sistema de Partners Marketplace
 *
 * Endpoints principales:
 * - POST /api/partners/register - Registro público de partners
 * - POST /api/partners/login - Login de partners
 * - GET /api/partners - Listar partners (admin/marketplace)
 * - GET /api/partners/:id - Obtener partner específico
 * - PUT /api/partners/:id - Actualizar perfil de partner
 * - POST /api/partners/:id/documents - Subir documentos
 * - POST /api/partners/:id/approve - Aprobar partner (admin)
 * - POST /api/partners/:id/reject - Rechazar partner (admin)
 * - POST /api/partners/service-requests - Crear solicitud de servicio
 * - POST /api/partners/reviews - Crear review
 * - POST /api/partners/mediation - Crear caso de mediación
 *
 * @technology Express + Sequelize + JWT + bcrypt
 * @version 1.0.0
 * @created 2025-01-24
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  Partner,
  PartnerRole,
  PartnerDocument,
  PartnerNotification,
  PartnerAvailability,
  PartnerServiceRequest,
  PartnerReview,
  PartnerServiceConversation,
  PartnerMediationCase,
  PartnerLegalConsent,
  PartnerCommissionLog,
  Company,
  User
} = require('../config/database');
const PartnerNotificationService = require('../services/PartnerNotificationService');
const EmailVerificationService = require('../services/EmailVerificationService');

// ============================================================================
// MIDDLEWARE: Autenticación
// ============================================================================

/**
 * Middleware: Autenticación básica
 * Extrae userId, companyId, role de headers
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // Mock validation (en producción usar jwt.verify())
    req.user = {
      userId: parseInt(req.headers['x-user-id']) || null,
      companyId: parseInt(req.headers['x-company-id']) || null,
      role: req.headers['x-user-role'] || 'employee',
      partnerId: parseInt(req.headers['x-partner-id']) || null
    };

    next();
  } catch (error) {
    console.error('❌ Error en autenticación:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
};

/**
 * Middleware: Solo administradores
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superuser') {
    return res.status(403).json({ error: 'Acceso denegado: requiere rol de administrador' });
  }
  next();
};

/**
 * Middleware: Solo administradores o gerentes
 */
const adminOrManager = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superuser' && req.user.role !== 'gerente') {
    return res.status(403).json({ error: 'Acceso denegado: requiere rol de administrador o gerente' });
  }
  next();
};

/**
 * Middleware: Solo el mismo partner o admin
 */
const partnerOrAdmin = (req, res, next) => {
  const partnerId = parseInt(req.params.id);
  if (req.user.partnerId !== partnerId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// ============================================================================
// ENDPOINT: Registro Público de Partners
// ============================================================================

/**
 * POST /api/partners/register
 *
 * Registro público de partners (sin autenticación)
 *
 * Body:
 * {
 *   "email": "partner@example.com",
 *   "password": "password123",
 *   "firstName": "Juan",
 *   "lastName": "Pérez",
 *   "phone": "+541112345678",
 *   "partnerRoleId": 1,
 *   "city": "Buenos Aires",
 *   "consentText": "Acepto términos y condiciones...",
 *   "consentVersion": "1.0"
 * }
 */
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      partnerRoleId,
      city,
      province,
      country,
      bio,
      experienceYears,
      consentText,
      consentVersion
    } = req.body;

    // Validaciones básicas
    if (!email || !password || !firstName || !lastName || !partnerRoleId) {
      return res.status(400).json({
        error: 'Campos requeridos: email, password, firstName, lastName, partnerRoleId'
      });
    }

    // Verificar si email ya existe
    const existing = await Partner.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hash de contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Crear partner (INACTIVO hasta verificar email)
    const partner = await Partner.create({
      email,
      password_hash,
      partner_role_id: partnerRoleId,
      first_name: firstName,
      last_name: lastName,
      phone,
      city,
      province,
      country,
      bio,
      experience_years: experienceYears,
      status: 'pending', // Requiere aprobación de admin
      // EMAIL VERIFICATION OBLIGATORIO
      email_verified: false,
      verification_pending: true,
      account_status: 'pending_verification',
      is_active: false  // NO ACTIVO hasta verificar email
    });

    // Crear firma digital SHA256 para consentimiento legal
    if (consentText && consentVersion) {
      const signatureData = {
        partnerId: partner.id,
        email: partner.email,
        timestamp: new Date().toISOString(),
        consentVersion
      };

      const signatureHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(signatureData))
        .digest('hex');

      await PartnerLegalConsent.create({
        partner_id: partner.id,
        consent_type: 'registration',
        consent_version: consentVersion,
        consent_text: consentText,
        signature_hash: signatureHash,
        signature_data: signatureData,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    }

    console.log(`✅ [PARTNERS] Nuevo registro: ${email} (ID: ${partner.id})`);

    // ENVIAR EMAIL DE VERIFICACIÓN INMEDIATAMENTE
    try {
      // Determinar tipo de partner basado en partner_role_id
      const partnerTypeMap = {
        1: 'vendor',
        2: 'leader',
        3: 'supervisor',
        4: 'partner'
      };
      const partnerType = partnerTypeMap[partnerRoleId] || 'partner';

      // Enviar email de verificación
      await EmailVerificationService.sendVerificationEmail(
        partner.id,
        partnerType,
        partner.email,
        [] // No hay consentimientos pendientes en registro público
      );

      console.log(`✅ [PARTNERS] Email de verificación enviado a: ${email}`);
    } catch (emailError) {
      console.error(`❌ [PARTNERS] Error enviando email de verificación:`, emailError.message);
      // NO FALLAR la creación del partner, solo loguear el error
    }

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. DEBE verificar su email para activar la cuenta.',
      partnerId: partner.id,
      verification_sent: true,
      verification_email: email,
      status: 'pending_verification'
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar partner', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Login de Partners
// ============================================================================

/**
 * POST /api/partners/login
 *
 * Body:
 * {
 *   "email": "partner@example.com",
 *   "password": "password123"
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password requeridos' });
    }

    const partner = await Partner.findOne({
      where: { email },
      include: [{ model: PartnerRole, as: 'role' }]
    });

    if (!partner) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Validar password
    const isValid = await partner.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar estado
    if (partner.status === 'pending') {
      return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación' });
    }

    if (partner.status === 'rejected' || partner.status === 'suspended') {
      return res.status(403).json({ error: 'Tu cuenta no está activa' });
    }

    console.log(`✅ [PARTNERS] Login exitoso: ${email}`);

    res.json({
      success: true,
      partner: {
        id: partner.id,
        email: partner.email,
        firstName: partner.first_name,
        lastName: partner.last_name,
        role: partner.role,
        status: partner.status,
        rating: partner.rating,
        totalReviews: partner.total_reviews
      }
      // En producción, generar y retornar JWT token aquí
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Listar Partners (Marketplace / Admin)
// ============================================================================

/**
 * GET /api/partners
 *
 * Query params:
 * - status: pending|approved|rejected|suspended
 * - roleId: ID del rol de partner
 * - city: filtrar por ciudad
 * - minRating: rating mínimo
 * - search: búsqueda por nombre/email
 * - page: número de página (default: 1)
 * - limit: resultados por página (default: 20)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      roleId,
      city,
      minRating,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    // Filtros
    if (status) where.status = status;
    if (roleId) where.partner_role_id = roleId;
    if (city) where.city = city;
    if (minRating) where.rating = { [require('sequelize').Op.gte]: parseFloat(minRating) };

    // Búsqueda por nombre/email
    if (search) {
      where[require('sequelize').Op.or] = [
        { first_name: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { last_name: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { email: { [require('sequelize').Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: partners } = await Partner.findAndCountAll({
      where,
      include: [
        { model: PartnerRole, as: 'role' }
      ],
      order: [['rating', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: partners.map(p => ({
        id: p.id,
        email: p.email,
        firstName: p.first_name,
        lastName: p.last_name,
        phone: p.phone,
        city: p.city,
        province: p.province,
        role: p.role,
        rating: p.rating,
        totalReviews: p.total_reviews,
        totalServices: p.total_services,
        status: p.status,
        experienceYears: p.experience_years,
        specialties: p.specialties,
        profilePhoto: p.profile_photo_url
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error listando partners:', error);
    res.status(500).json({ error: 'Error al listar partners', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Obtener Partner por ID
// ============================================================================

/**
 * GET /api/partners/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const partner = await Partner.findByPk(req.params.id, {
      include: [
        { model: PartnerRole, as: 'role' },
        { model: PartnerDocument, as: 'documents' },
        { model: PartnerAvailability, as: 'availability' }
      ]
    });

    if (!partner) {
      return res.status(404).json({ error: 'Partner no encontrado' });
    }

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error obteniendo partner:', error);
    res.status(500).json({ error: 'Error al obtener partner', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Actualizar Perfil de Partner
// ============================================================================

/**
 * PUT /api/partners/:id
 *
 * Solo el mismo partner o admin puede actualizar
 */
router.put('/:id', authenticate, partnerOrAdmin, async (req, res) => {
  try {
    const partner = await Partner.findByPk(req.params.id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner no encontrado' });
    }

    const {
      firstName,
      lastName,
      phone,
      mobile,
      bio,
      city,
      province,
      country,
      profilePhotoUrl,
      languages,
      specialties,
      education,
      certifications,
      experienceYears
    } = req.body;

    await partner.update({
      first_name: firstName || partner.first_name,
      last_name: lastName || partner.last_name,
      phone: phone || partner.phone,
      mobile: mobile || partner.mobile,
      bio: bio || partner.bio,
      city: city || partner.city,
      province: province || partner.province,
      country: country || partner.country,
      profile_photo_url: profilePhotoUrl || partner.profile_photo_url,
      languages: languages || partner.languages,
      specialties: specialties || partner.specialties,
      education: education || partner.education,
      certifications: certifications || partner.certifications,
      experience_years: experienceYears || partner.experience_years
    });

    console.log(`✅ [PARTNERS] Perfil actualizado: ID ${partner.id}`);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: partner
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Aprobar Partner (Admin)
// ============================================================================

/**
 * POST /api/partners/:id/approve
 *
 * Solo admin puede aprobar
 */
router.post('/:id/approve', authenticate, adminOnly, async (req, res) => {
  try {
    const partner = await Partner.findByPk(req.params.id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner no encontrado' });
    }

    if (partner.status !== 'pending') {
      return res.status(400).json({ error: 'El partner no está en estado pendiente' });
    }

    await partner.update({
      status: 'approved',
      approved_at: new Date(),
      approved_by: req.user.userId
    });

    // Crear notificación
    await PartnerNotification.create({
      partner_id: partner.id,
      notification_type: 'account_approved',
      title: 'Cuenta aprobada',
      message: 'Tu cuenta ha sido aprobada. Ya puedes comenzar a recibir solicitudes de servicio.'
    });

    console.log(`✅ [PARTNERS] Partner aprobado: ID ${partner.id} por user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Partner aprobado exitosamente'
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error aprobando partner:', error);
    res.status(500).json({ error: 'Error al aprobar partner', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Rechazar Partner (Admin)
// ============================================================================

/**
 * POST /api/partners/:id/reject
 *
 * Body:
 * {
 *   "reason": "Documentación incompleta"
 * }
 */
router.post('/:id/reject', authenticate, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const partner = await Partner.findByPk(req.params.id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner no encontrado' });
    }

    await partner.update({
      status: 'rejected'
    });

    // Crear notificación
    await PartnerNotification.create({
      partner_id: partner.id,
      notification_type: 'account_rejected',
      title: 'Cuenta rechazada',
      message: reason || 'Tu cuenta ha sido rechazada. Por favor contacta al administrador para más información.'
    });

    console.log(`✅ [PARTNERS] Partner rechazado: ID ${partner.id}`);

    res.json({
      success: true,
      message: 'Partner rechazado'
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error rechazando partner:', error);
    res.status(500).json({ error: 'Error al rechazar partner', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Cambiar Estado de Partner (Admin/Gerente) - NUEVO CON NOTIFICACIONES
// ============================================================================

/**
 * PUT /api/partners/:id/status
 *
 * Cambiar estado de un partner con notificaciones automáticas
 *
 * Solo admin o gerente pueden cambiar el estado
 *
 * Body:
 * {
 *   "newStatus": "pendiente_aprobacion"|"activo"|"suspendido"|"baja"|"renuncia",
 *   "changeReason": "Motivo del cambio (obligatorio para baja/suspendido/renuncia)",
 *   "changeNotes": "Notas internas adicionales (opcional)"
 * }
 *
 * @returns {object} Resultado con datos de notificaciones enviadas
 */
router.put('/:id/status', authenticate, adminOrManager, async (req, res) => {
  try {
    const { newStatus, changeReason, changeNotes } = req.body;
    const partnerId = parseInt(req.params.id);

    // Validar newStatus
    const validStatuses = ['pendiente_aprobacion', 'activo', 'suspendido', 'baja', 'renuncia'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      return res.status(400).json({
        error: 'newStatus inválido. Valores permitidos: ' + validStatuses.join(', ')
      });
    }

    // Validar que changeReason sea obligatorio para ciertos estados
    if (['baja', 'suspendido', 'renuncia'].includes(newStatus) && !changeReason) {
      return res.status(400).json({
        error: `changeReason es obligatorio para el estado: ${newStatus}`
      });
    }

    // Obtener partner actual
    const partner = await Partner.findByPk(partnerId);

    if (!partner) {
      return res.status(404).json({ error: 'Partner no encontrado' });
    }

    const oldStatus = partner.status;

    // Si el status no cambió, retornar sin hacer nada
    if (oldStatus === newStatus) {
      return res.status(400).json({
        error: 'El partner ya tiene el estado especificado',
        currentStatus: oldStatus
      });
    }

    // Actualizar status en la tabla partners
    await partner.update({ status: newStatus });

    console.log(`📝 [PARTNERS] Cambio de estado: Partner ${partnerId}: ${oldStatus} → ${newStatus} por user ${req.user.userId}`);

    // Obtener nombre del usuario que hace el cambio (simulado - en producción buscar en BD)
    const changedByName = req.user.name || 'Administrador';

    // Enviar notificaciones usando PartnerNotificationService
    const notificationResult = await PartnerNotificationService.notifyPartnerStatusChange({
      partnerId,
      oldStatus,
      newStatus,
      changedByUserId: req.user.userId,
      changedByRole: req.user.role,
      changedByName,
      changeReason,
      changeNotes,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    console.log(`✅ [PARTNERS] Notificaciones enviadas:`, {
      partnerId,
      emailSentToPartner: notificationResult.emailSentToPartner,
      clientsNotified: notificationResult.clientsNotified
    });

    res.json({
      success: true,
      message: `Estado del partner actualizado exitosamente: ${oldStatus} → ${newStatus}`,
      data: {
        partnerId,
        oldStatus,
        newStatus,
        changeReason,
        historyId: notificationResult.historyId,
        notifications: {
          partnerNotificationId: notificationResult.partnerNotificationId,
          emailSentToPartner: notificationResult.emailSentToPartner,
          clientsNotified: notificationResult.clientsNotified,
          clientNotifications: notificationResult.clientNotifications
        }
      }
    });

  } catch (error) {
    console.error('❌ [PARTNERS] Error cambiando estado de partner:', error);
    res.status(500).json({
      error: 'Error al cambiar estado del partner',
      details: error.message
    });
  }
});

// ============================================================================
// ENDPOINT: Obtener Historial de Cambios de Estado
// ============================================================================

/**
 * GET /api/partners/:id/status-history
 *
 * Obtener timeline de cambios de estado de un partner
 *
 * @returns {array} Lista de cambios de estado ordenados por fecha descendente
 */
router.get('/:id/status-history', authenticate, async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id);

    const timeline = await PartnerNotificationService.getPartnerStatusTimeline(partnerId);

    res.json({
      success: true,
      data: timeline
    });

  } catch (error) {
    console.error('❌ [PARTNERS] Error obteniendo historial de estado:', error);
    res.status(500).json({
      error: 'Error al obtener historial',
      details: error.message
    });
  }
});

// ============================================================================
// ENDPOINT: Obtener Contratos Activos de un Partner
// ============================================================================

/**
 * GET /api/partners/:id/active-contracts
 *
 * Obtener contratos activos de un partner
 *
 * @returns {array} Lista de contratos activos
 */
router.get('/:id/active-contracts', authenticate, async (req, res) => {
  try {
    const partnerId = parseInt(req.params.id);

    const contracts = await PartnerNotificationService.getPartnerActiveContracts(partnerId);

    res.json({
      success: true,
      data: contracts,
      count: contracts.length
    });

  } catch (error) {
    console.error('❌ [PARTNERS] Error obteniendo contratos activos:', error);
    res.status(500).json({
      error: 'Error al obtener contratos activos',
      details: error.message
    });
  }
});

// ============================================================================
// ENDPOINT: Crear Solicitud de Servicio
// ============================================================================

/**
 * POST /api/partners/service-requests
 *
 * Body:
 * {
 *   "partnerId": 1,
 *   "serviceType": "instalacion",
 *   "serviceDescription": "Instalación de sistema biométrico",
 *   "scheduledDate": "2025-02-15",
 *   "scheduledTime": "10:00",
 *   "location": "Av. Corrientes 1234",
 *   "priority": "normal"
 * }
 */
router.post('/service-requests', authenticate, async (req, res) => {
  try {
    const {
      partnerId,
      serviceType,
      serviceDescription,
      scheduledDate,
      scheduledTime,
      location,
      priority
    } = req.body;

    if (!partnerId || !serviceType || !serviceDescription) {
      return res.status(400).json({
        error: 'Campos requeridos: partnerId, serviceType, serviceDescription'
      });
    }

    // Verificar que el partner existe y está aprobado
    const partner = await Partner.findByPk(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner no encontrado' });
    }

    if (partner.status !== 'approved') {
      return res.status(400).json({ error: 'El partner no está disponible' });
    }

    // Calcular SLA deadline (48 horas por defecto)
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + 48);

    const serviceRequest = await PartnerServiceRequest.create({
      company_id: req.user.companyId,
      partner_id: partnerId,
      user_id: req.user.userId,
      service_type: serviceType,
      service_description: serviceDescription,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      location,
      priority: priority || 'normal',
      status: 'pending',
      sla_deadline: slaDeadline
    });

    // Notificar al partner (trigger automático en DB)

    console.log(`✅ [PARTNERS] Nueva solicitud de servicio: ID ${serviceRequest.id}`);

    res.status(201).json({
      success: true,
      message: 'Solicitud de servicio creada exitosamente',
      data: serviceRequest
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error creando solicitud:', error);
    res.status(500).json({ error: 'Error al crear solicitud', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Crear Review de Partner
// ============================================================================

/**
 * POST /api/partners/reviews
 *
 * Body:
 * {
 *   "partnerId": 1,
 *   "serviceRequestId": 5,
 *   "rating": 5,
 *   "professionalismRating": 5,
 *   "qualityRating": 4,
 *   "timelinessRating": 5,
 *   "comment": "Excelente servicio"
 * }
 */
router.post('/reviews', authenticate, async (req, res) => {
  try {
    const {
      partnerId,
      serviceRequestId,
      rating,
      professionalismRating,
      qualityRating,
      timelinessRating,
      comment
    } = req.body;

    if (!partnerId || !rating) {
      return res.status(400).json({ error: 'Campos requeridos: partnerId, rating' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating debe estar entre 1 y 5' });
    }

    // Verificar que el service request existe y pertenece al usuario/empresa
    if (serviceRequestId) {
      const serviceRequest = await PartnerServiceRequest.findByPk(serviceRequestId);
      if (!serviceRequest) {
        return res.status(404).json({ error: 'Solicitud de servicio no encontrada' });
      }

      if (serviceRequest.company_id !== req.user.companyId) {
        return res.status(403).json({ error: 'No puedes revisar esta solicitud' });
      }

      if (serviceRequest.status !== 'completed') {
        return res.status(400).json({ error: 'Solo puedes revisar servicios completados' });
      }
    }

    const review = await PartnerReview.create({
      partner_id: partnerId,
      reviewer_id: req.user.userId,
      service_request_id: serviceRequestId,
      company_id: req.user.companyId,
      rating,
      professionalism_rating: professionalismRating,
      quality_rating: qualityRating,
      timeliness_rating: timelinessRating,
      comment,
      is_public: true,
      is_verified: true
    });

    // Actualización automática de rating del partner (trigger en DB)

    console.log(`✅ [PARTNERS] Nueva review: Partner ${partnerId}, Rating ${rating}`);

    res.status(201).json({
      success: true,
      message: 'Review creada exitosamente',
      data: review
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error creando review:', error);
    res.status(500).json({ error: 'Error al crear review', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Crear Caso de Mediación
// ============================================================================

/**
 * POST /api/partners/mediation
 *
 * Body:
 * {
 *   "serviceRequestId": 5,
 *   "complainantType": "company",
 *   "complaintReason": "El servicio no se completó según lo acordado"
 * }
 */
router.post('/mediation', authenticate, async (req, res) => {
  try {
    const { serviceRequestId, complainantType, complaintReason } = req.body;

    if (!serviceRequestId || !complainantType || !complaintReason) {
      return res.status(400).json({
        error: 'Campos requeridos: serviceRequestId, complainantType, complaintReason'
      });
    }

    const serviceRequest = await PartnerServiceRequest.findByPk(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ error: 'Solicitud de servicio no encontrada' });
    }

    // Verificar autorización
    if (complainantType === 'company' && serviceRequest.company_id !== req.user.companyId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (complainantType === 'partner' && req.user.partnerId !== serviceRequest.partner_id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const mediationCase = await PartnerMediationCase.create({
      service_request_id: serviceRequestId,
      partner_id: serviceRequest.partner_id,
      company_id: serviceRequest.company_id,
      complainant_type: complainantType,
      complaint_reason: complaintReason,
      status: 'pending'
    });

    console.log(`✅ [PARTNERS] Nuevo caso de mediación: ID ${mediationCase.id}`);

    res.status(201).json({
      success: true,
      message: 'Caso de mediación creado. Un mediador será asignado pronto.',
      data: mediationCase
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error creando mediación:', error);
    res.status(500).json({ error: 'Error al crear mediación', details: error.message });
  }
});

// ============================================================================
// ENDPOINT: Obtener Estadísticas de Comisiones
// ============================================================================

/**
 * GET /api/partners/:id/commissions
 *
 * Query params:
 * - startDate: fecha inicio (ISO 8601)
 * - endDate: fecha fin (ISO 8601)
 * - status: pending|paid|cancelled
 */
router.get('/:id/commissions', authenticate, partnerOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const where = { partner_id: req.params.id };

    if (startDate && endDate) {
      where.period_start = { [require('sequelize').Op.gte]: new Date(startDate) };
      where.period_end = { [require('sequelize').Op.lte]: new Date(endDate) };
    }

    if (status) where.payment_status = status;

    const commissions = await PartnerCommissionLog.findAll({
      where,
      include: [
        { model: PartnerServiceRequest, as: 'serviceRequest' },
        { model: Company, as: 'company' }
      ],
      order: [['created_at', 'DESC']]
    });

    // Calcular totales
    const total = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);
    const pending = commissions.filter(c => c.payment_status === 'pending')
      .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);
    const paid = commissions.filter(c => c.payment_status === 'paid')
      .reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);

    res.json({
      success: true,
      data: commissions,
      summary: {
        total,
        pending,
        paid,
        count: commissions.length
      }
    });
  } catch (error) {
    console.error('❌ [PARTNERS] Error obteniendo comisiones:', error);
    res.status(500).json({ error: 'Error al obtener comisiones', details: error.message });
  }
});

module.exports = router;
