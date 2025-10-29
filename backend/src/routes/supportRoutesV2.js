/**
 * MÓDULO DE SOPORTE V2.0 - API REST
 *
 * Sistema completo de tickets con:
 * - Intento de asistente IA antes de escalar
 * - SLA deadlines automáticos
 * - Escalamiento a supervisores
 * - Acceso temporal de soporte
 * - Evaluación de soporte
 *
 * @version 2.0.0
 * @date 2025-01-23
 */

const express = require('express');
const router = express.Router();
const { auth: authenticate } = require('../middleware/auth');
const database = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const SupportNotificationService = require('../services/SupportNotificationService');
const SupportSLAMonitor = require('../jobs/support-sla-monitor');

const {
  SupportTicketV2,
  SupportTicketMessage,
  SupportActivityLog,
  CompanySupportAssignment,
  SupportVendorStats,
  SupportSLAPlan,
  SupportVendorSupervisor,
  SupportEscalation,
  SupportAssistantAttempt,
  Company,
  User
} = database;

// =========================================================================
// TICKETS - CRUD y operaciones principales
// =========================================================================

/**
 * POST /api/support/v2/tickets
 * Crear nuevo ticket (primero intenta resolverlo con asistente)
 */
router.post('/tickets', authenticate, async (req, res) => {
  try {
    const {
      module_name,
      module_display_name,
      subject,
      description,
      priority = 'medium',
      allow_support_access = false,
      user_question // Para intento del asistente
    } = req.body;

    const company_id = req.user.company_id;
    const created_by_user_id = req.user.user_id;

    // 1. Intentar resolver con asistente IA
    let assistant_resolved = false;
    let assistant_response = null;
    let assistant_type = 'fallback';

    if (user_question) {
      // Obtener tipo de asistente según plan SLA de la empresa
      const company = await Company.findByPk(company_id, {
        include: [{
          model: SupportSLAPlan,
          as: 'supportSLAPlan'
        }]
      });

      if (company?.supportSLAPlan?.has_ai_assistant) {
        assistant_type = 'ai_powered';
        // TODO: Integrar con AssistantService.chat() aquí
        // const aiResult = await AssistantService.chat(user_question, company_id);
        // assistant_response = aiResult.response;
        // if (aiResult.confidence > 0.7) assistant_resolved = true;
      } else {
        // Fallback: búsqueda en knowledge base
        // TODO: Buscar en AssistantKnowledgeBase
        assistant_response = 'Respuesta automática del sistema...';
      }
    }

    // 2. Generar número de ticket único
    const year = new Date().getFullYear();
    const lastTicket = await SupportTicketV2.findOne({
      where: {
        ticket_number: { [database.sequelize.Sequelize.Op.like]: `TICKET-${year}-%` }
      },
      order: [['created_at', 'DESC']]
    });

    let nextNumber = 1;
    if (lastTicket) {
      const match = lastTicket.ticket_number.match(/TICKET-\d{4}-(\d{6})/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const ticket_number = `TICKET-${year}-${String(nextNumber).padStart(6, '0')}`;

    // 3. Obtener vendor asignado a la empresa
    const supportAssignment = await CompanySupportAssignment.findOne({
      where: {
        company_id,
        is_active: true
      },
      order: [['assigned_at', 'DESC']]
    });

    const assigned_to_vendor_id = supportAssignment?.support_type === 'aponnt_support'
      ? null // Aponnt maneja directamente
      : (supportAssignment?.assigned_vendor_id || supportAssignment?.original_vendor_id);

    // 4. Crear ticket
    const ticket = await SupportTicketV2.create({
      ticket_number,
      company_id,
      created_by_user_id,
      module_name,
      module_display_name,
      subject,
      description,
      priority,
      allow_support_access,
      assigned_to_vendor_id,
      assigned_at: assigned_to_vendor_id ? new Date() : null,
      status: assistant_resolved ? 'resolved' : 'open',
      assistant_attempted: !!user_question,
      assistant_resolved
    });

    // 5. Registrar intento del asistente
    if (user_question && assistant_response) {
      await SupportAssistantAttempt.create({
        ticket_id: ticket.ticket_id,
        assistant_type,
        user_question,
        assistant_response,
        confidence_score: assistant_type === 'ai_powered' ? 0.5 : null,
        user_satisfied: assistant_resolved ? true : null
      });
    }

    // 6. Crear mensaje inicial con el problema
    await SupportTicketMessage.create({
      ticket_id: ticket.ticket_id,
      user_id: created_by_user_id,
      user_role: 'customer',
      message: description
    });

    // 7. Generar acceso temporal si se autorizó
    if (allow_support_access && !assistant_resolved) {
      const temp_password = Math.random().toString(36).substring(2, 10);
      const temp_password_hash = await bcrypt.hash(temp_password, 10);

      // Crear usuario temporal de soporte
      const temp_user = await User.create({
        company_id,
        email: `support-${ticket.ticket_id}@temp.aponnt.com`,
        password: temp_password_hash,
        firstName: 'Soporte',
        lastName: 'Temporal',
        role: 'support_temp',
        is_active: true,
        phone: '000000000'
      });

      await ticket.update({
        temp_support_user_id: temp_user.user_id,
        temp_password_hash,
        temp_password_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        temp_access_granted_at: new Date()
      });

      // 8. Enviar notificación al vendor asignado
      if (assigned_to_vendor_id) {
        await SupportNotificationService.notifyNewTicket(ticket.ticket_id);
      }

      // Incluir contraseña temporal en respuesta (solo esta vez)
      return res.status(201).json({
        success: true,
        ticket,
        assistant_response,
        temp_access: {
          email: temp_user.email,
          password: temp_password,
          expires_at: ticket.temp_password_expires_at
        }
      });
    }

    // 8. Enviar notificación al vendor asignado
    if (assigned_to_vendor_id && !assistant_resolved) {
      await SupportNotificationService.notifyNewTicket(ticket.ticket_id);
    }

    res.status(201).json({
      success: true,
      ticket,
      assistant_response,
      assistant_resolved
    });

  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/support/v2/tickets
 * Listar tickets del usuario actual
 */
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const user_id = req.user.user_id;
    const company_id = req.user.company_id;
    const role = req.user.role;

    const where = {};

    // Filtrar por rol
    if (role === 'admin' || role === 'company_admin') {
      // Ver todos los tickets de la empresa
      where.company_id = company_id;
    } else if (role === 'vendor' || role === 'support') {
      // Ver tickets asignados
      where.assigned_to_vendor_id = user_id;
    } else {
      // Usuario normal: solo sus tickets
      where.created_by_user_id = user_id;
    }

    if (status) {
      where.status = status;
    }

    const tickets = await SupportTicketV2.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedVendor',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      success: true,
      tickets: tickets.rows,
      total: tickets.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error listing tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/support/v2/tickets/:ticket_id
 * Ver detalles de un ticket específico
 */
router.get('/tickets/:ticket_id', authenticate, async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const user_id = req.user.user_id;
    const role = req.user.role;

    const ticket = await SupportTicketV2.findByPk(ticket_id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedVendor',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        },
        {
          model: SupportTicketMessage,
          as: 'messages',
          order: [['created_at', 'ASC']],
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['user_id', 'firstName', 'lastName', 'email']
            }
          ]
        },
        {
          model: SupportActivityLog,
          as: 'activityLogs',
          order: [['created_at', 'DESC']],
          limit: 50
        },
        {
          model: SupportAssistantAttempt,
          as: 'assistantAttempts',
          order: [['attempted_at', 'DESC']]
        },
        {
          model: SupportEscalation,
          as: 'escalations',
          order: [['escalated_at', 'DESC']]
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Verificar permisos
    const hasAccess =
      role === 'admin' ||
      role === 'company_admin' ||
      ticket.created_by_user_id === user_id ||
      ticket.assigned_to_vendor_id === user_id ||
      ticket.escalated_to_supervisor_id === user_id;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      ticket
    });

  } catch (error) {
    console.error('Error getting ticket details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/support/v2/tickets/:ticket_id/messages
 * Agregar mensaje a un ticket
 */
router.post('/tickets/:ticket_id/messages', authenticate, async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const { message, attachments = [], is_internal = false } = req.body;
    const user_id = req.user.user_id;
    const role = req.user.role;

    const ticket = await SupportTicketV2.findByPk(ticket_id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Determinar rol del usuario en el contexto del ticket
    let user_role = 'customer';
    if (role === 'admin' || role === 'company_admin') {
      user_role = 'admin';
    } else if (role === 'vendor' || role === 'support' || ticket.assigned_to_vendor_id === user_id) {
      user_role = 'support';
    }

    const newMessage = await SupportTicketMessage.create({
      ticket_id,
      user_id,
      user_role,
      message,
      attachments,
      is_internal
    });

    // Actualizar estado del ticket si es la primera respuesta
    if (user_role === 'support' && !ticket.first_response_at) {
      await ticket.update({
        first_response_at: new Date(),
        status: 'in_progress'
      });
    }

    // Enviar notificación al destinatario (quien NO envió el mensaje)
    if (!is_internal) {
      await SupportNotificationService.notifyNewMessage(ticket_id, newMessage.message_id, user_id);
    }

    res.status(201).json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/support/v2/tickets/:ticket_id/status
 * Actualizar estado del ticket
 */
router.patch('/tickets/:ticket_id/status', authenticate, async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const { status } = req.body;
    const user_id = req.user.user_id;

    const ticket = await SupportTicketV2.findByPk(ticket_id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Solo el soporte puede cambiar a in_progress, waiting_customer, resolved
    // Solo el cliente o admin pueden cerrar
    if (status === 'closed') {
      if (ticket.created_by_user_id !== user_id && req.user.role !== 'admin' && req.user.role !== 'company_admin') {
        return res.status(403).json({
          success: false,
          error: 'Only ticket creator or admin can close tickets'
        });
      }

      await ticket.update({
        status: 'closed',
        closed_by_user_id: user_id,
        closed_at: new Date()
      });

      // Expirar contraseña temporal
      if (ticket.temp_support_user_id) {
        await User.update(
          { is_active: false },
          { where: { user_id: ticket.temp_support_user_id } }
        );
      }

      // Enviar notificaciones de cierre
      await SupportNotificationService.notifyTicketClosed(ticket_id);
      await SupportNotificationService.notifyRatingRequest(ticket_id);
    } else {
      await ticket.update({ status });
    }

    res.json({
      success: true,
      ticket
    });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/support/v2/tickets/:ticket_id/rate
 * Evaluar el soporte recibido (1-5 estrellas)
 */
router.post('/tickets/:ticket_id/rate', authenticate, async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const { rating, rating_comment } = req.body;
    const user_id = req.user.user_id;

    const ticket = await SupportTicketV2.findByPk(ticket_id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Solo el creador puede evaluar
    if (ticket.created_by_user_id !== user_id) {
      return res.status(403).json({
        success: false,
        error: 'Only ticket creator can rate support'
      });
    }

    // Solo se puede evaluar si está cerrado
    if (ticket.status !== 'closed') {
      return res.status(400).json({
        success: false,
        error: 'Can only rate closed tickets'
      });
    }

    await ticket.update({
      rating,
      rating_comment,
      rated_at: new Date()
    });

    res.json({
      success: true,
      ticket
    });

  } catch (error) {
    console.error('Error rating ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/support/v2/tickets/:ticket_id/escalate
 * Escalar ticket al supervisor del vendedor
 */
router.post('/tickets/:ticket_id/escalate', authenticate, async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const { escalation_notes, escalation_reason = 'manual_escalation' } = req.body;
    const user_id = req.user.user_id;

    const ticket = await SupportTicketV2.findByPk(ticket_id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Solo el vendor asignado puede escalar
    if (ticket.assigned_to_vendor_id !== user_id) {
      return res.status(403).json({
        success: false,
        error: 'Only assigned vendor can escalate'
      });
    }

    // Obtener supervisor del vendor
    const supervisorAssignment = await SupportVendorSupervisor.findOne({
      where: {
        vendor_id: user_id,
        is_active: true
      },
      order: [['assigned_at', 'DESC']]
    });

    if (!supervisorAssignment) {
      return res.status(400).json({
        success: false,
        error: 'No supervisor assigned to this vendor'
      });
    }

    // Crear registro de escalamiento
    const escalation = await SupportEscalation.create({
      ticket_id,
      escalated_from_user_id: user_id,
      escalated_to_user_id: supervisorAssignment.supervisor_id,
      escalation_reason,
      escalation_notes
    });

    // Actualizar ticket
    await ticket.update({
      escalated_to_supervisor_id: supervisorAssignment.supervisor_id,
      status: 'in_progress'
    });

    // Enviar notificaciones de escalamiento
    await SupportNotificationService.notifyEscalation(ticket_id, escalation.escalation_id);
    await SupportNotificationService.notifyAponntAdmin(ticket_id, 'escalation', {
      reason: escalation_reason,
      notes: escalation_notes
    });

    res.json({
      success: true,
      escalation,
      ticket
    });

  } catch (error) {
    console.error('Error escalating ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================================================
// SLA PLANS - Administración
// =========================================================================

/**
 * GET /api/support/v2/sla-plans
 * Listar planes de SLA disponibles
 */
router.get('/sla-plans', async (req, res) => {
  try {
    const plans = await SupportSLAPlan.findAll({
      where: { is_active: true },
      order: [['price_monthly', 'ASC']]
    });

    res.json({
      success: true,
      plans
    });

  } catch (error) {
    console.error('Error listing SLA plans:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/support/v2/companies/:company_id/sla-plan
 * Actualizar plan SLA de una empresa (solo admin)
 */
router.patch('/companies/:company_id/sla-plan', authenticate, async (req, res) => {
  try {
    const { company_id } = req.params;
    const { plan_id } = req.body;

    // Solo admins de Aponnt pueden cambiar planes
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only Aponnt admins can change SLA plans'
      });
    }

    const company = await Company.findByPk(company_id);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    await company.update({
      support_sla_plan_id: plan_id
    });

    res.json({
      success: true,
      company
    });

  } catch (error) {
    console.error('Error updating company SLA plan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================================================
// VENDOR/SUPERVISOR MANAGEMENT - Administración
// =========================================================================

/**
 * POST /api/support/v2/vendors/:vendor_id/assign-supervisor
 * Asignar supervisor a un vendedor (solo admin)
 */
router.post('/vendors/:vendor_id/assign-supervisor', authenticate, async (req, res) => {
  try {
    const { vendor_id } = req.params;
    const { supervisor_id, notes } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only Aponnt admins can assign supervisors'
      });
    }

    // Desactivar asignaciones anteriores
    await SupportVendorSupervisor.update(
      { is_active: false },
      { where: { vendor_id } }
    );

    // Crear nueva asignación
    const assignment = await SupportVendorSupervisor.create({
      vendor_id,
      supervisor_id,
      notes,
      assigned_by_user_id: req.user.user_id
    });

    res.status(201).json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error assigning supervisor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================================================
// ACTIVITY LOG - Solo lectura
// =========================================================================

/**
 * GET /api/support/v2/tickets/:ticket_id/activity
 * Ver log de actividad de soporte en un ticket
 */
router.get('/tickets/:ticket_id/activity', authenticate, async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const company_id = req.user.company_id;

    const ticket = await SupportTicketV2.findByPk(ticket_id);

    if (!ticket || ticket.company_id !== company_id) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    const activities = await SupportActivityLog.findAll({
      where: { ticket_id },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'supportUser',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      success: true,
      activities
    });

  } catch (error) {
    console.error('Error getting activity log:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================================================
// SLA MONITORING - Sistema de monitoreo automático
// =========================================================================

// Variable para almacenar el interval del cron job
let slaMonitorInterval = null;

/**
 * POST /api/support/v2/monitor/start
 * Iniciar monitoreo automático de SLA (solo admin)
 */
router.post('/monitor/start', authenticate, async (req, res) => {
  try {
    const { interval = 300000 } = req.body; // Default: 5 minutos

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only Aponnt admins can manage SLA monitoring'
      });
    }

    // Si ya está corriendo, detener el anterior
    if (slaMonitorInterval) {
      clearInterval(slaMonitorInterval);
    }

    // Ejecutar inmediatamente
    await SupportSLAMonitor.runMonitoring();

    // Iniciar intervalo
    slaMonitorInterval = setInterval(async () => {
      await SupportSLAMonitor.runMonitoring();
    }, interval);

    res.json({
      success: true,
      message: 'SLA monitoring started',
      interval_ms: interval,
      interval_minutes: interval / 1000 / 60
    });

  } catch (error) {
    console.error('Error starting SLA monitor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/support/v2/monitor/stop
 * Detener monitoreo automático de SLA (solo admin)
 */
router.post('/monitor/stop', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only Aponnt admins can manage SLA monitoring'
      });
    }

    if (slaMonitorInterval) {
      clearInterval(slaMonitorInterval);
      slaMonitorInterval = null;

      res.json({
        success: true,
        message: 'SLA monitoring stopped'
      });
    } else {
      res.json({
        success: false,
        message: 'SLA monitoring was not running'
      });
    }

  } catch (error) {
    console.error('Error stopping SLA monitor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/support/v2/monitor/status
 * Ver estado del monitoreo de SLA
 */
router.get('/monitor/status', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      is_running: slaMonitorInterval !== null,
      status: slaMonitorInterval ? 'active' : 'stopped'
    });

  } catch (error) {
    console.error('Error getting monitor status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/support/v2/monitor/run-now
 * Ejecutar monitoreo manual (solo admin)
 */
router.post('/monitor/run-now', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only Aponnt admins can run manual monitoring'
      });
    }

    await SupportSLAMonitor.runMonitoring();

    res.json({
      success: true,
      message: 'SLA monitoring executed manually'
    });

  } catch (error) {
    console.error('Error running manual SLA monitor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
