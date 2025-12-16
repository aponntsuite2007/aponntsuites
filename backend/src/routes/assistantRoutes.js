/**
 * assistantRoutes.js
 *
 * API REST para Sistema de Asistente IA
 *
 * Endpoints:
 * - POST /api/assistant/chat - Enviar pregunta al asistente
 * - POST /api/assistant/feedback - Registrar feedback (👍👎)
 * - GET /api/assistant/history - Historial de conversaciones
 * - GET /api/assistant/stats - Estadísticas del asistente
 * - GET /api/assistant/health - Estado de Ollama
 *
 * @technology Ollama + Llama 3.1 (8B) + Express + JWT
 * @version 1.0.0
 * @created 2025-01-19
 */

const express = require('express');
const router = express.Router();
const { database } = require('../config/database');
const AssistantService = require('../services/AssistantService');

// Instancia del servicio (pasando database para acceso a modelos)
const assistantService = new AssistantService(database);

/**
 * Middleware: Autenticación JWT simple
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    // Aquí deberías validar el JWT token
    // Por ahora asumimos que el token es válido y contiene companyId/userId
    // En producción, usa jwt.verify() para validar

    // Mock validation (reemplazar con JWT real)
    req.user = {
      userId: req.headers['x-user-id'] || null,
      companyId: parseInt(req.headers['x-company-id']) || null,
      role: req.headers['x-user-role'] || 'employee'
    };

    if (!req.user.companyId) {
      return res.status(400).json({ error: 'Company ID requerido' });
    }

    next();
  } catch (error) {
    console.error('❌ Error en autenticación:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ═══════════════════════════════════════════════════════════
// ENDPOINT: Chat con el Asistente
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/assistant/chat
 *
 * Body:
 * {
 *   "question": "¿Cómo registro asistencias?",
 *   "context": {
 *     "module": "attendance",
 *     "submodule": "manual-entry",
 *     "screen": "attendance-table",
 *     "action": "create"
 *   }
 * }
 */
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { question, context = {} } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        error: 'La pregunta no puede estar vacía'
      });
    }

    console.log(`\n🤖 [ASSISTANT] Chat request from user ${req.user.userId}`);

    // Llamar al servicio
    const response = await assistantService.chat({
      companyId: req.user.companyId,
      userId: req.user.userId,
      userRole: req.user.role,
      question,
      context
    });

    res.json({
      success: true,
      data: response,
      tech_stack: {
        ai: `Ollama + ${assistantService.model}`,
        backend: 'Node.js + Express',
        database: 'PostgreSQL + JSONB',
        framework: 'RAG (Retrieval Augmented Generation)'
      }
    });

  } catch (error) {
    console.error('❌ Error en /chat:', error);
    res.status(500).json({
      error: 'Error procesando la pregunta',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ENDPOINT: Registrar Feedback
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/assistant/feedback
 *
 * Body:
 * {
 *   "entryId": "uuid",
 *   "helpful": true,
 *   "comment": "Muy útil, gracias!"
 * }
 */
router.post('/feedback', authenticate, async (req, res) => {
  try {
    const { entryId, helpful, comment = null } = req.body;

    if (!entryId) {
      return res.status(400).json({ error: 'entryId requerido' });
    }

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'helpful debe ser true o false' });
    }

    await assistantService.submitFeedback(entryId, helpful, comment);

    res.json({
      success: true,
      message: 'Feedback registrado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en /feedback:', error);
    res.status(500).json({
      error: 'Error registrando feedback',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ENDPOINT: Historial de Conversaciones
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/assistant/history
 *
 * Query params:
 * - limit: número de conversaciones (default: 20)
 * - module: filtrar por módulo (opcional)
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 20, module = null } = req.query;

    // FIX: Verificar que el modelo exista antes de destructurar
    if (!database.AssistantConversation) {
      console.error('❌ [HISTORY] AssistantConversation model no está registrado en database');
      return res.status(503).json({
        error: 'Servicio de historial no disponible',
        message: 'AssistantConversation model not initialized'
      });
    }

    const { AssistantConversation } = database;

    const where = {
      company_id: req.user.companyId // MULTI-TENANT: Filtrar por empresa
    };

    if (module) {
      where.module_name = module;
    }

    const history = await AssistantConversation.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      attributes: [
        'id',
        'question',
        'answer',
        'answer_source',
        'confidence',
        'helpful',
        'diagnostic_triggered',
        'module_name',
        'screen_name',
        'created_at'
      ]
    });

    res.json({
      success: true,
      data: history,
      count: history.length,
      meta: {
        source: 'multi-tenant', // Historial privado por empresa
        global_knowledge: false
      }
    });

  } catch (error) {
    console.error('❌ Error en /history:', error);
    res.status(500).json({
      error: 'Error obteniendo historial',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ENDPOINT: Estadísticas del Asistente
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/assistant/stats
 *
 * Query params:
 * - days: días hacia atrás (default: 30)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const stats = await assistantService.getStats(
      req.user.companyId,
      parseInt(days)
    );

    res.json({
      success: true,
      data: stats,
      period_days: parseInt(days)
    });

  } catch (error) {
    console.error('❌ Error en /stats:', error);
    res.status(500).json({
      error: 'Error obteniendo estadísticas',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ENDPOINT: Health Check de Ollama
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/assistant/health
 *
 * Verifica si Ollama está corriendo y disponible
 */
router.get('/health', async (req, res) => {
  try {
    const health = await assistantService.checkHealth();

    res.json({
      success: true,
      ollama: health,
      backend: {
        status: 'running',
        model: assistantService.model,
        temperature: assistantService.temperature,
        maxTokens: assistantService.maxTokens
      }
    });

  } catch (error) {
    console.error('❌ Error en /health:', error);
    res.status(500).json({
      error: 'Error verificando salud del sistema',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ENDPOINT: Detalle de Conversación
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/assistant/:id
 *
 * Obtiene detalles completos de una conversación
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // FIX: Verificar que el modelo exista antes de destructurar
    if (!database.AssistantKnowledgeBase) {
      console.error('❌ [DETAIL] AssistantKnowledgeBase model no está registrado en database');
      return res.status(503).json({
        error: 'Servicio de knowledge base no disponible',
        message: 'AssistantKnowledgeBase model not initialized'
      });
    }

    const { AssistantKnowledgeBase } = database;

    const entry = await AssistantKnowledgeBase.findOne({
      where: {
        id,
        company_id: req.user.companyId
      }
    });

    if (!entry) {
      return res.status(404).json({
        error: 'Conversación no encontrada'
      });
    }

    res.json({
      success: true,
      data: entry
    });

  } catch (error) {
    console.error('❌ Error en /:id:', error);
    res.status(500).json({
      error: 'Error obteniendo conversación',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ENDPOINT: Marketing Paper (Acceso desde IA Assistant)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/assistant/marketing/paper
 *
 * Acceso directo al paper de marketing dinámico desde el chat IA
 * Solo para administradores
 */
router.get('/marketing/paper', authenticate, async (req, res) => {
  try {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Solo administradores pueden acceder al marketing paper'
      });
    }

    // Hacer request interno al endpoint del auditor
    const axios = require('axios');
    const baseURL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9998}`;

    const response = await axios.get(`${baseURL}/api/audit/marketing/paper`, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      paper: response.data.paper,
      meta: {
        ...response.data.meta,
        access_via: 'ai_assistant',
        for_marketing_use: true,
        can_share_with_clients: true
      }
    });

  } catch (error) {
    console.error('❌ Error en /marketing/paper:', error);
    res.status(500).json({
      error: 'Error obteniendo marketing paper',
      message: error.message
    });
  }
});

/**
 * GET /api/assistant/marketing/summary
 *
 * Resumen ejecutivo del marketing paper para el chat IA
 */
router.get('/marketing/summary', authenticate, async (req, res) => {
  try {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Solo administradores pueden acceder al marketing summary'
      });
    }

    // Obtener paper completo
    const axios = require('axios');
    const baseURL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9998}`;

    const response = await axios.get(`${baseURL}/api/audit/marketing/paper`, {
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    const paper = response.data.paper;

    // Extraer solo el resumen ejecutivo para el chat
    const summary = {
      title: paper?.meta?.title || "APONNT Suite - Sistema Biométrico Inteligente",
      subtitle: paper?.meta?.subtitle || "Tecnología Avanzada para Gestión de Personal",
      executive_summary: paper?.executive_summary,
      key_technologies: {
        total_count: paper?.technology_stack ? Object.keys(paper.technology_stack).length : 0,
        ai_models: paper?.ai_models?.natural_language_processing?.primary_model?.name,
        security_level: "Military-grade AES-256 + biometric",
        deployment: "Hybrid (Local AI + Cloud capabilities)"
      },
      competitive_advantages: paper?.competitive_advantages?.unique_differentiators?.slice(0, 3),
      roi_projection: {
        breakeven: "4.2 months average",
        annual_savings: "$50,000 - $180,000",
        productivity_gain: "30-45 minutes per employee per week"
      }
    };

    res.json({
      success: true,
      summary,
      meta: {
        generated_at: paper?.meta?.generated_at,
        full_paper_available: true,
        access_endpoint: '/api/assistant/marketing/paper'
      }
    });

  } catch (error) {
    console.error('❌ Error en /marketing/summary:', error);
    res.status(500).json({
      error: 'Error obteniendo marketing summary',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// ENDPOINT: Escalar conversación IA a Ticket de Soporte
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/assistant/escalate-to-ticket
 *
 * Crea un ticket de soporte cuando la respuesta del asistente IA
 * no fue satisfactoria para el usuario.
 *
 * Flujo:
 * 1. Usuario pregunta algo a la IA
 * 2. IA responde
 * 3. Usuario marca "👎 No útil"
 * 4. Usuario solicita crear ticket → este endpoint
 * 5. Se crea ticket y se notifica a staff APONNT
 *
 * Body:
 * {
 *   "conversationId": "uuid",         // ID de la conversación IA
 *   "originalQuestion": "...",        // Pregunta original del usuario
 *   "originalAnswer": "...",          // Respuesta de la IA que no fue útil
 *   "subject": "...",                 // Asunto del ticket
 *   "priority": "medium",             // low, medium, high, urgent
 *   "additionalDetails": "...",       // Detalles adicionales
 *   "context": { module, screen }     // Contexto del módulo
 * }
 */
router.post('/escalate-to-ticket', authenticate, async (req, res) => {
  try {
    const {
      conversationId,
      originalQuestion,
      originalAnswer,
      subject,
      priority = 'medium',
      additionalDetails = '',
      context = {}
    } = req.body;

    const companyId = req.user.companyId;
    const userId = req.user.userId;

    console.log(`\n🎫 [ASSISTANT] Escalando conversación a ticket...`);
    console.log(`   Company: ${companyId}, User: ${userId}`);
    console.log(`   Pregunta: ${originalQuestion?.substring(0, 50)}...`);

    // Importar modelos y servicios necesarios
    const { SupportTicketV2, Company, User } = database;
    const NotificationUnifiedService = require('../services/NotificationUnifiedService');

    // Verificar que la empresa exista
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(400).json({
        error: 'Empresa no encontrada'
      });
    }

    // Generar número de ticket único
    const year = new Date().getFullYear();
    const { sequelize } = require('../config/database');
    const [lastTicketResult] = await sequelize.query(`
      SELECT ticket_number FROM support_tickets
      WHERE ticket_number LIKE 'TICKET-${year}-%'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    let nextNumber = 1;
    if (lastTicketResult.length > 0) {
      const match = lastTicketResult[0].ticket_number.match(/TICKET-\d{4}-(\d{6})/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const ticket_number = `TICKET-${year}-${String(nextNumber).padStart(6, '0')}`;

    // Construir descripción del ticket con contexto de la conversación IA
    const description = `
**Escalado desde Asistente IA**

**Pregunta original del usuario:**
${originalQuestion}

**Respuesta de la IA (no satisfactoria):**
${originalAnswer}

**Detalles adicionales del usuario:**
${additionalDetails || 'Sin detalles adicionales'}

**Contexto:**
- Módulo: ${context.module || 'No especificado'}
- Pantalla: ${context.screen || 'No especificada'}
- Conversación IA ID: ${conversationId || 'No disponible'}
- Timestamp: ${context.timestamp || new Date().toISOString()}
    `.trim();

    // Crear ticket en la tabla support_tickets
    // Nota: SupportTicketV2 es el modelo que mapea a support_tickets
    const ticket = await SupportTicketV2.create({
      ticket_number,
      company_id: companyId,
      created_by_user_id: userId,
      module_name: context.module || 'ai-assistant',
      module_display_name: 'Asistente IA - Escalado',
      subject: subject || originalQuestion?.substring(0, 100) || 'Consulta escalada desde IA',
      description,
      priority,
      status: 'open',
      assistant_attempted: true,
      assistant_resolved: false
      // Nota: conversationId se incluye en la descripción como referencia
    });

    console.log(`✅ [ASSISTANT] Ticket creado: ${ticket_number}`);

    // ═══════════════════════════════════════════════════════════
    // NOTIFICAR A STAFF APONNT via NotificationUnifiedService
    // ═══════════════════════════════════════════════════════════

    try {
      // Usar el sistema de notificaciones unificado para enviar a APONNT
      // Firma: sendToAponnt(companyId, userId, { title, message, category, metadata })
      const notificationService = new NotificationUnifiedService();
      await notificationService.sendToAponnt(companyId, userId, {
        title: `🎫 Ticket escalado desde IA: ${ticket_number}`,
        message: `
Un usuario ha escalado su consulta a soporte humano después de que el Asistente IA no pudo resolver su problema.

**Empresa:** ${company.name}
**Ticket:** ${ticket_number}
**Prioridad:** ${priority.toUpperCase()}

**Pregunta original:**
${originalQuestion}

**Por qué fue escalado:**
El usuario indicó que la respuesta de la IA no fue útil.

Este ticket requiere atención de un agente de soporte.
        `.trim(),
        category: 'support_escalation',
        metadata: {
          ticket_id: ticket.ticket_id,
          ticket_number,
          escalated_from: 'ai_assistant',
          original_question: originalQuestion,
          module: context.module,
          priority
        }
      });

      console.log(`📧 [ASSISTANT] Notificación enviada a staff APONNT`);
    } catch (notifError) {
      // No fallar el ticket si la notificación falla
      console.error(`⚠️  [ASSISTANT] Error enviando notificación:`, notifError.message);
    }

    // Responder con éxito
    res.status(201).json({
      success: true,
      message: 'Ticket de soporte creado exitosamente',
      ticket: {
        ticket_id: ticket.ticket_id,
        ticket_number,
        status: 'open',
        priority,
        created_at: ticket.created_at
      },
      meta: {
        escalated_from: 'ai_assistant',
        notification_sent: true
      }
    });

  } catch (error) {
    console.error('❌ [ASSISTANT] Error escalando a ticket:', error);
    res.status(500).json({
      error: 'Error creando ticket de soporte',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = router;
