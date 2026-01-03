/**
 * A MI ME PASO - Rutas de Búsqueda Inteligente
 *
 * Endpoints:
 * - POST /api/a-mi-me-paso/search - Búsqueda multi-fuente
 * - GET /api/a-mi-me-paso/popular-searches - Búsquedas populares
 * - GET /api/a-mi-me-paso/knowledge-gaps - Gaps de conocimiento
 * - POST /api/a-mi-me-paso/feedback - Registrar feedback de búsqueda
 */

const express = require('express');
const router = express.Router();
const aMiMePasoService = require('../services/AMiMePasoService');
const { auth } = require('../middleware/auth');

/**
 * POST /api/a-mi-me-paso/search
 * Buscar en todas las fuentes de conocimiento
 */
router.post('/search', auth, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'La búsqueda debe tener al menos 3 caracteres'
      });
    }

    const user = {
      id: req.user.id,
      company_id: req.user.company_id,
      department_id: req.user.department_id || null
    };

    const results = await aMiMePasoService.search(query, user);

    res.json(results);

  } catch (error) {
    console.error('[A-MI-ME-PASO] Error en búsqueda:', error);
    res.status(500).json({
      success: false,
      error: 'Error al realizar la búsqueda'
    });
  }
});


/**
 * GET /api/a-mi-me-paso/popular-searches
 * Obtener búsquedas más populares
 */
router.get('/popular-searches', auth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const companyId = req.user.company_id;

    const popularSearches = await aMiMePasoService.getPopularSearches(
      companyId,
      parseInt(days)
    );

    res.json({
      success: true,
      searches: popularSearches,
      period: `${days} días`
    });

  } catch (error) {
    console.error('[A-MI-ME-PASO] Error obteniendo búsquedas populares:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener búsquedas populares'
    });
  }
});


/**
 * GET /api/a-mi-me-paso/knowledge-gaps
 * Detectar gaps de conocimiento (búsquedas frecuentes sin resultados)
 * Solo para admins
 */
router.get('/knowledge-gaps', auth, async (req, res) => {
  try {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo admins pueden ver knowledge gaps'
      });
    }

    const companyId = req.user.company_id;
    const gaps = await aMiMePasoService.detectKnowledgeGaps(companyId);

    res.json({
      success: true,
      gaps,
      recommendation: gaps.length > 0
        ? 'Hay temas con búsquedas frecuentes y pocos resultados. Considera crear contenido sobre estos temas.'
        : 'No se detectaron gaps significativos de conocimiento.'
    });

  } catch (error) {
    console.error('[A-MI-ME-PASO] Error detectando knowledge gaps:', error);
    res.status(500).json({
      success: false,
      error: 'Error al detectar knowledge gaps'
    });
  }
});


/**
 * POST /api/a-mi-me-paso/feedback
 * Registrar feedback de búsqueda (thumbs up/down)
 */
router.post('/feedback', auth, async (req, res) => {
  try {
    const { searchId, wasHelpful, feedbackComment } = req.body;

    if (!searchId || typeof wasHelpful !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'searchId y wasHelpful son requeridos'
      });
    }

    await aMiMePasoService.registerFeedback(
      searchId,
      wasHelpful,
      feedbackComment
    );

    res.json({
      success: true,
      message: 'Gracias por tu feedback!'
    });

  } catch (error) {
    console.error('[A-MI-ME-PASO] Error registrando feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar feedback'
    });
  }
});


/**
 * POST /api/a-mi-me-paso/autocomplete
 * Sugerencias de autocompletado (futuro)
 */
router.post('/autocomplete', auth, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const companyId = req.user.company_id;

    // Buscar búsquedas populares que empiecen con el query
    const suggestions = await aMiMePasoService.getPopularSearches(companyId, 30);

    const filtered = suggestions
      .filter(s => s.query.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 5)
      .map(s => ({
        text: s.query,
        count: parseInt(s.search_count)
      }));

    res.json({
      success: true,
      suggestions: filtered
    });

  } catch (error) {
    console.error('[A-MI-ME-PASO] Error en autocomplete:', error);
    res.json({ success: true, suggestions: [] });
  }
});


module.exports = router;
