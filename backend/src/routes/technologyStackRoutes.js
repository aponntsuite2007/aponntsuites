/**
 * ============================================================================
 * API: TECHNOLOGY STACK - Para index.html landing page
 * ============================================================================
 *
 * PROPÓSITO:
 * - Servir stack tecnológico completo del sistema
 * - Agregar tecnologías únicas (no duplicadas)
 * - Generar descripciones marketing profesionales
 * - Auto-actualizable cuando se agregan nuevas tecnologías
 *
 * ENDPOINTS:
 * GET /api/technology-stack/all        - Stack completo del sistema
 * GET /api/technology-stack/by-module  - Stack por módulo
 * GET /api/technology-stack/summary    - Resumen con stats
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const metadataPath = path.join(__dirname, '../../engineering-metadata.js');

/**
 * GET /api/technology-stack/all
 * Retorna TODAS las tecnologías únicas detectadas en el sistema
 */
router.get('/all', async (req, res) => {
  try {
    // Leer metadata
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    const systemStack = metadata.systemInfo?.technologyStack || {};

    // Agregar tech items con marketing descriptions
    const techItems = [
      // AI
      { icon: '🧠', name: 'Ollama AI', tooltip: 'Asistente IA 100% privado', category: 'ai' },
      { icon: '🤖', name: 'Azure Face API', tooltip: 'Reconocimiento facial empresarial', category: 'ai' },
      { icon: '📚', name: 'RAG System', tooltip: 'IA contextual con Knowledge Base', category: 'ai' },

      // Database
      { icon: '🐘', name: 'PostgreSQL 14+', tooltip: 'Base de datos empresarial confiable', category: 'database' },
      { icon: '🔗', name: 'Sequelize ORM', tooltip: 'ORM profesional enterprise', category: 'database' },
      { icon: '⚡', name: 'Redis', tooltip: 'Velocidad extrema en procesamiento', category: 'database' },

      // Backend
      { icon: '⚡', name: 'Node.js', tooltip: 'Backend de alto rendimiento', category: 'infrastructure' },
      { icon: '🚀', name: 'Express.js', tooltip: 'API REST robusta y escalable', category: 'infrastructure' },

      // Frontend
      { icon: '📊', name: 'Chart.js', tooltip: 'Visualización de datos profesional', category: 'infrastructure' },
      { icon: '🎨', name: 'Three.js', tooltip: 'Dashboards 3D interactivos', category: 'infrastructure' },
      { icon: '📅', name: 'FullCalendar', tooltip: 'Calendarios intuitivos y profesionales', category: 'infrastructure' },

      // Security
      { icon: '🔒', name: 'bcrypt', tooltip: 'Seguridad bancaria para contraseñas', category: 'security' },
      { icon: '🔐', name: 'JWT', tooltip: 'Autenticación segura sin comprometer velocidad', category: 'security' },
      { icon: '👤', name: 'Biometría', tooltip: 'Control biométrico profesional', category: 'security' },

      // Realtime
      { icon: '🔌', name: 'Socket.IO', tooltip: 'Actualizaciones en tiempo real', category: 'realtime' },
      { icon: '⚡', name: 'WebSocket', tooltip: 'Comunicación bidireccional instantánea', category: 'realtime' },

      // Testing
      { icon: '🎭', name: 'Playwright', tooltip: 'Testing E2E automatizado', category: 'testing' },
      { icon: '✅', name: 'Jest', tooltip: 'Calidad garantizada con tests automáticos', category: 'testing' },

      // DevOps
      { icon: '🐳', name: 'Docker', tooltip: 'Deploy rápido en cualquier servidor', category: 'infrastructure' },
      { icon: '⚙️', name: 'PM2', tooltip: '99.9% uptime garantizado', category: 'infrastructure' },

      // Misc
      { icon: '🏢', name: 'Multi-Tenant', tooltip: 'Arquitectura multi-empresa', category: 'infrastructure' },
      { icon: '🔧', name: 'Auto-Repair', tooltip: 'Motor de auto-reparación con IA', category: 'infrastructure' },
      { icon: '📝', name: 'Logging Pro', tooltip: 'Trazabilidad completa del sistema', category: 'infrastructure' },
      { icon: '📅', name: 'ISO 8601', tooltip: 'Timestamps internacionales estándar', category: 'standards' }
    ];

    res.json({
      success: true,
      techItems,
      systemStack,
      lastUpdated: metadata.systemInfo?.technologiesLastUpdated || new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error al obtener stack tecnológico:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cargar stack tecnológico',
      message: error.message
    });
  }
});

/**
 * GET /api/technology-stack/by-module
 * Retorna tecnologías agrupadas por módulo
 */
router.get('/by-module', async (req, res) => {
  try {
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    const modulesTech = {};

    for (const [moduleKey, moduleData] of Object.entries(metadata.modules || {})) {
      if (moduleData.technologies) {
        modulesTech[moduleKey] = {
          name: moduleData.name,
          technical: moduleData.technologies.technical,
          marketing: moduleData.technologies.marketing,
          detectedCount: moduleData.technologies.detectedCount,
          detectedAt: moduleData.technologies.detectedAt
        };
      }
    }

    res.json({
      success: true,
      modules: modulesTech,
      totalModules: Object.keys(modulesTech).length
    });

  } catch (error) {
    console.error('❌ Error al obtener tecnologías por módulo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cargar tecnologías',
      message: error.message
    });
  }
});

/**
 * GET /api/technology-stack/summary
 * Resumen con estadísticas
 */
router.get('/summary', async (req, res) => {
  try {
    delete require.cache[require.resolve(metadataPath)];
    const metadata = require(metadataPath);

    let totalTechnologies = 0;
    let modulesWithTech = 0;

    for (const [moduleKey, moduleData] of Object.entries(metadata.modules || {})) {
      if (moduleData.technologies) {
        totalTechnologies += moduleData.technologies.detectedCount || 0;
        modulesWithTech++;
      }
    }

    res.json({
      success: true,
      summary: {
        totalTechnologies: metadata.systemInfo?.totalTechnologiesDetected || totalTechnologies,
        modulesWithTech,
        totalModules: Object.keys(metadata.modules || {}).length,
        lastUpdated: metadata.systemInfo?.technologiesLastUpdated || new Date().toISOString(),
        averagePerModule: modulesWithTech > 0 ? (totalTechnologies / modulesWithTech).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener resumen:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cargar resumen',
      message: error.message
    });
  }
});

module.exports = router;
