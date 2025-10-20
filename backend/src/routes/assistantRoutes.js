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

// Instancia del servicio
const assistantService = new AssistantService();

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
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = router;
