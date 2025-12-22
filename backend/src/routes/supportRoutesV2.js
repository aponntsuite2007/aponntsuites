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

    const company_id = req.user.companyId;
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

        // Integrar con AssistantService
        const AssistantService = require('../services/AssistantService');
        try {
          const aiResult = await AssistantService.chat({
            companyId: company_id,
            userId: created_by_user_id,
            userRole: req.user.role || 'employee',
            question: user_question,
            context: {
              module: module_name,
              submodule: module_display_name,
              screen: 'support_ticket',
              action: 'create_ticket'
            }
          });

          assistant_response = aiResult.answer;
          const confidence = aiResult.confidence || 0;

          // Auto-resolve si confidence > 0.7
          if (confidence > 0.7) {
            assistant_resolved = true;

            // No crear ticket, solo guardar en knowledge base (ya se guardó en AssistantService)
            return res.json({
              success: true,
              resolved_by_ai: true,
              response: assistant_response,
              confidence: confidence,
              source: aiResult.source || 'ai_generation',
              suggestions: aiResult.suggestions || []
            });
          } else {
            // Confidence baja - crear ticket y escalar a humanos
            assistant_resolved = false;
            // Continuar con creación del ticket...
          }
        } catch (aiError) {
          console.error('❌ [SUPPORT-AI] Error en AssistantService:', aiError.message);
          // Fallback: continuar con creación normal del ticket
          assistant_type = 'fallback';
          assistant_response = 'El asistente IA no está disponible temporalmente. Se ha creado un ticket de soporte.';
        }
      } else {
        // Fallback: búsqueda en knowledge base simple
        assistant_type = 'knowledge_base';
        try {
          const { sequelize } = require('../config/database');
          const [similarAnswers] = await sequelize.query(`
            SELECT answer, confidence_score
            FROM assistant_knowledge_base
            WHERE question ILIKE '%' || :question || '%'
            AND is_verified = true
            ORDER BY confidence_score DESC
            LIMIT 1
          `, {
            replacements: { question: user_question },
            type: sequelize.QueryTypes.SELECT
          });

          if (similarAnswers && similarAnswers.confidence_score > 0.7) {
            assistant_response = similarAnswers.answer;
            assistant_resolved = true;

            return res.json({
              success: true,
              resolved_by_knowledge_base: true,
              response: assistant_response,
              confidence: similarAnswers.confidence_score,
              source: 'knowledge_base'
            });
          } else {
            assistant_response = 'No se encontró una respuesta automática. Se ha creado un ticket de soporte.';
          }
        } catch (kbError) {
          console.error('❌ [SUPPORT-KB] Error buscando en knowledge base:', kbError.message);
          assistant_response = 'Se ha creado un ticket de soporte para atender tu consulta.';
        }
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
    const company_id = req.user.companyId;
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
    const company_id = req.user.companyId;

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

// =========================================================================
// ADMIN ENDPOINTS - Para Staff de APONNT (panel-administrativo)
// =========================================================================

/**
 * Middleware de autenticación para Staff de APONNT
 */
const authenticateStaff = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '').trim();

    // Validaciones más robustas
    if (!token || token === 'null' || token === 'undefined' || token.length < 10) {
      console.log('[SUPPORT-ADMIN] Token inválido o vacío:', {
        hasAuthHeader: !!authHeader,
        tokenValue: token ? `${token.substring(0, 20)}...` : 'empty',
        tokenLength: token?.length
      });
      return res.status(401).json({ error: 'Token requerido o inválido' });
    }

    // Verificar formato básico JWT (3 partes separadas por punto)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('[SUPPORT-ADMIN] Token no tiene formato JWT válido:', parts.length, 'partes');
      return res.status(401).json({ error: 'Token con formato inválido' });
    }

    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret);

    // Verificar que es staff de APONNT
    if (!decoded.staffId && !decoded.staff_id) {
      return res.status(403).json({ error: 'Acceso solo para staff de APONNT' });
    }

    req.staffId = decoded.staffId || decoded.staff_id;
    req.staffRole = decoded.role || decoded.role_code || decoded.roleCode;
    req.staffArea = decoded.area;
    req.staffLevel = decoded.level;
    req.staffCountry = decoded.country;

    console.log('[SUPPORT-ADMIN] Staff autenticado:', {
      staffId: req.staffId,
      role: req.staffRole,
      area: req.staffArea,
      level: req.staffLevel,
      country: req.staffCountry
    });

    next();
  } catch (error) {
    console.error('[SUPPORT-ADMIN] Error de auth:', error.message);
    return res.status(401).json({ error: 'Token inválido', detail: error.message });
  }
};

/**
 * Determina el tipo de rol basado en role_code, area y level
 */
function getStaffRoleType(roleCode, area, level) {
  // SUPERADMIN tiene prioridad
  if (roleCode === 'SUPERADMIN' || level === -1) return 'SUPERADMIN';
  // Gerente General (nivel 0, máximo poder)
  if (level === 0 || roleCode === 'GG') return 'GERENTE_GENERAL';
  // Gerente Regional (nivel 1, casi todo excepto módulos)
  if (level === 1 && (area === 'direccion' || roleCode === 'GR')) return 'GERENCIA';
  // Supervisor de Soporte (area soporte)
  if (area === 'soporte') return 'SUPERVISOR_SOPORTE';
  // Vendedor por defecto si es area ventas
  if (area === 'ventas') return 'VENDEDOR';
  // Otros
  return 'OTHER';
}

/**
 * GET /api/support/v2/admin/tickets
 * Listar tickets para staff de APONNT según su rol
 *
 * Reglas de visibilidad:
 * - Vendedor: Solo tickets de SUS empresas asignadas (aponnt_staff_companies)
 * - Supervisor Soporte: TODOS los tickets
 * - Gerente Regional (GR): Tickets de empresas de SU país/región
 * - Gerente General (GG) / Superadmin: TODO
 */
router.get('/admin/tickets', authenticateStaff, async (req, res) => {
  try {
    const { status, priority, limit = 50, offset = 0 } = req.query;
    const staffId = req.staffId;
    const roleCode = req.staffRole;
    const area = req.staffArea;
    const level = req.staffLevel;

    // Determinar tipo de rol
    const roleType = getStaffRoleType(roleCode, area, level);
    console.log('[SUPPORT-ADMIN] roleType determinado:', roleType);

    // Obtener país del staff para GR (si no viene en el token, buscarlo en BD)
    let staffCountry = req.staffCountry;
    if (roleType === 'GERENCIA' && !staffCountry) {
      const [staffData] = await database.sequelize.query(`
        SELECT country FROM aponnt_staff WHERE staff_id = :staffId
      `, {
        replacements: { staffId },
        type: database.sequelize.QueryTypes.SELECT
      });
      staffCountry = staffData?.country;
    }

    // Construir query según rol
    let baseQuery = `
      SELECT
        t.ticket_id,
        t.ticket_number,
        t.company_id,
        c.name as company_name,
        c.country as company_country,
        t.module_name,
        t.module_display_name,
        t.subject,
        t.priority,
        t.status,
        t.created_at,
        t.first_response_at,
        t.closed_at,
        t.rating,
        t.assistant_attempted,
        t.assistant_resolved,
        u.\"firstName\" || ' ' || u.\"lastName\" as created_by_name,
        u.email as created_by_email
      FROM support_tickets t
      LEFT JOIN companies c ON t.company_id = c.company_id
      LEFT JOIN users u ON t.created_by_user_id = u.user_id
      WHERE 1=1
    `;

    const params = {};

    // Filtros según rol
    switch (roleType) {
      case 'VENDEDOR':
        // Solo empresas asignadas en aponnt_staff_companies
        baseQuery += ` AND t.company_id IN (
          SELECT company_id FROM aponnt_staff_companies
          WHERE staff_id = :staffId AND is_active = true
        )`;
        params.staffId = staffId;
        console.log('[SUPPORT-ADMIN] Filtro VENDEDOR: empresas asignadas de staff', staffId);
        break;

      case 'SUPERVISOR_SOPORTE':
        // Ve TODOS los tickets - sin filtro adicional
        console.log('[SUPPORT-ADMIN] Filtro SUPERVISOR_SOPORTE: ve TODO');
        break;

      case 'GERENCIA':
        // Solo empresas de su país/región
        if (staffCountry) {
          baseQuery += ` AND c.country = :staffCountry`;
          params.staffCountry = staffCountry;
          console.log('[SUPPORT-ADMIN] Filtro GERENCIA: empresas de país', staffCountry);
        } else {
          console.warn('[SUPPORT-ADMIN] GR sin país definido, mostrando todos');
        }
        break;

      case 'GERENTE_GENERAL':
      case 'SUPERADMIN':
        // Ve TODO - sin filtro
        console.log('[SUPPORT-ADMIN] Filtro GG/SUPERADMIN: ve TODO');
        break;

      default:
        // Otros roles: solo sus propias empresas si tienen asignadas
        baseQuery += ` AND t.company_id IN (
          SELECT company_id FROM aponnt_staff_companies
          WHERE staff_id = :staffId AND is_active = true
        )`;
        params.staffId = staffId;
        console.log('[SUPPORT-ADMIN] Filtro DEFAULT: empresas asignadas');
    }

    // Filtros opcionales
    if (status) {
      baseQuery += ` AND t.status = :status`;
      params.status = status;
    }
    if (priority) {
      baseQuery += ` AND t.priority = :priority`;
      params.priority = priority;
    }

    // Ordenar y paginar
    baseQuery += ` ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset`;
    params.limit = parseInt(limit);
    params.offset = parseInt(offset);

    // Ejecutar query
    const tickets = await database.sequelize.query(baseQuery, {
      replacements: params,
      type: database.sequelize.QueryTypes.SELECT
    });

    // Query para contar total
    let countQuery = baseQuery.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    countQuery = countQuery.replace(/ORDER BY[\s\S]*$/, '');
    const [countResult] = await database.sequelize.query(countQuery, {
      replacements: params,
      type: database.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      tickets,
      total: parseInt(countResult?.total || 0),
      limit: parseInt(limit),
      offset: parseInt(offset),
      roleType,
      staffCountry: roleType === 'GERENCIA' ? staffCountry : undefined
    });

  } catch (error) {
    console.error('[SUPPORT-ADMIN] Error listing tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/support/v2/admin/tickets/stats
 * Estadísticas de tickets para staff de APONNT (respeta mismos filtros de rol)
 */
router.get('/admin/tickets/stats', authenticateStaff, async (req, res) => {
  try {
    const staffId = req.staffId;
    const roleCode = req.staffRole;
    const area = req.staffArea;
    const level = req.staffLevel;

    const roleType = getStaffRoleType(roleCode, area, level);

    // Obtener país del staff para GR
    let staffCountry = req.staffCountry;
    if (roleType === 'GERENCIA' && !staffCountry) {
      const [staffData] = await database.sequelize.query(`
        SELECT country FROM aponnt_staff WHERE staff_id = :staffId
      `, {
        replacements: { staffId },
        type: database.sequelize.QueryTypes.SELECT
      });
      staffCountry = staffData?.country;
    }

    // Construir WHERE según rol
    let whereClause = '1=1';
    const params = {};

    switch (roleType) {
      case 'VENDEDOR':
        whereClause = `t.company_id IN (
          SELECT company_id FROM aponnt_staff_companies
          WHERE staff_id = :staffId AND is_active = true
        )`;
        params.staffId = staffId;
        break;
      case 'GERENCIA':
        if (staffCountry) {
          whereClause = `c.country = :staffCountry`;
          params.staffCountry = staffCountry;
        }
        break;
      // SUPERVISOR_SOPORTE, GERENTE_GENERAL, SUPERADMIN: sin filtro
    }

    const statsQuery = `
      SELECT
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE t.status = 'open') as open_tickets,
        COUNT(*) FILTER (WHERE t.status = 'in_progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE t.status = 'waiting_customer') as waiting_tickets,
        COUNT(*) FILTER (WHERE t.status = 'resolved') as resolved_tickets,
        COUNT(*) FILTER (WHERE t.status = 'closed') as closed_tickets,
        COUNT(*) FILTER (WHERE t.priority = 'critical') as critical_tickets,
        COUNT(*) FILTER (WHERE t.priority = 'high') as high_priority_tickets,
        COUNT(*) FILTER (WHERE t.assistant_resolved = true) as resolved_by_ai,
        ROUND(AVG(t.rating)::numeric, 2) as avg_rating
      FROM support_tickets t
      LEFT JOIN companies c ON t.company_id = c.company_id
      WHERE ${whereClause}
    `;

    const [stats] = await database.sequelize.query(statsQuery, {
      replacements: params,
      type: database.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      stats,
      roleType
    });

  } catch (error) {
    console.error('[SUPPORT-ADMIN] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
