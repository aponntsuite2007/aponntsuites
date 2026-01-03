// =====================================================
// MÓDULOS ROUTES - VERSIÓN SIMPLIFICADA (SSOT)
// =====================================================
// ANTES: 300+ líneas de filtros manuales complejos
// AHORA: ~50 líneas usando vista SQL v_dashboard_modules
// =====================================================

const express = require('express');
const router = express.Router();
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;
const { auth } = require('../middleware/auth');

// =====================================================
// GET /api/modules/active
// RETORNA: Módulos activos para una empresa
// =====================================================

router.get('/active', auth, async (req, res) => {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'company_id es requerido'
      });
    }

    console.log(`📊 [MODULES-ACTIVE] Obteniendo módulos para empresa ${company_id}`);

    // ✅ SSOT - Single Source of Truth
    // La vista v_dashboard_modules YA tiene TODAS las reglas:
    // - is_active = true
    // - parent_module_key IS NULL
    // - module_type NOT IN ('android-apk', 'ios-apk', ...)
    // - metadata->>'hideFromDashboard' != 'true'
    // - module_key != 'dashboard'

    const modules = await sequelize.query(
      'SELECT * FROM get_company_dashboard_modules(:companyId)',
      {
        replacements: { companyId: parseInt(company_id) },
        type: QueryTypes.SELECT
      }
    );

    console.log(`✅ [MODULES-ACTIVE] Retornando ${modules.length} módulos`);

    // Mapear a formato esperado por frontend
    const mappedModules = modules.map(m => ({
      module_key: m.module_key,
      name: m.name,
      description: m.description || '',
      icon: m.icon || '📦',
      color: m.color || '#666',
      category: m.category || 'general',
      is_core: m.is_core,
      isActive: m.is_active, // Si empresa lo tiene activo
      isContracted: m.is_active,
      isOperational: true,
      activo: m.is_active,
      features: m.features || [],
      metadata: m.metadata || {},
      frontend_file: m.metadata?.frontend_file || `/js/modules/${m.module_key}.js`,
      init_function: m.metadata?.init_function || `show${capitalize(m.module_key)}Content`
    }));

    res.json({
      success: true,
      modules: mappedModules
    });

  } catch (error) {
    console.error('❌ [MODULES-ACTIVE] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// HELPER: Capitalize
// =====================================================
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-./g, x => x[1].toUpperCase());
}

// =====================================================
// COMPARACIÓN DE COMPLEJIDAD
// =====================================================
/*
❌ ANTES (modulesRoutes.js original):
- 300+ líneas de código
- 5+ filtros manuales duplicados
- Lógica en 3 lugares (registry, BD, filtros)
- Difícil de mantener
- Propenso a bugs (como kiosks-apk apareciendo)

✅ AHORA (esta versión):
- ~50 líneas de código
- 1 consulta SQL (vista v_dashboard_modules)
- Lógica en 1 solo lugar (base de datos)
- Fácil de mantener
- A prueba de errores

PARA AGREGAR/QUITAR MÓDULO:
❌ ANTES: Editar múltiples archivos, reiniciar servidor, debugging
✅ AHORA: 1 comando SQL, refrescar navegador

Ejemplo:
-- Ocultar módulo del dashboard (sin desactivarlo)
UPDATE system_modules
SET metadata = metadata || '{"hideFromDashboard": true}'::jsonb
WHERE module_key = 'mi-modulo';

-- Activar módulo (aparece en dashboard)
UPDATE system_modules
SET is_active = true
WHERE module_key = 'mi-modulo';

NO necesitas tocar código, filtros, ni reiniciar servidor.
*/

module.exports = router;
