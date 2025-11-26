/**
 * ============================================================================
 * MODULES API - Gestión Completa de Módulos del Sistema
 * ============================================================================
 *
 * API REST para configurar módulos, pricing, bundling y dependencias.
 * Integrado con sistema de auto-conocimiento y testing.
 *
 * @version 1.0.0
 * @date 2025-10-30
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Middleware para solo admins
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Solo administradores pueden gestionar módulos'
    });
  }
  next();
};

module.exports = (database) => {
  const { SystemModule, CompanyModule, Company, sequelize } = database;

  // ═══════════════════════════════════════════════════════════
  // GET /api/modules - Listar todos los módulos (público)
  // ═══════════════════════════════════════════════════════════
  router.get('/', async (req, res) => {
    try {
      const { available_in, is_core, category } = req.query;

      const where = { is_active: true };

      if (available_in) {
        where.available_in = [available_in, 'both'];
      }
      if (is_core !== undefined) {
        where.is_core = is_core === 'true';
      }
      if (category) {
        where.category = category;
      }

      const modules = await SystemModule.findAll({
        where,
        order: [['display_order', 'ASC'], ['name', 'ASC']]
      });

      res.json({
        success: true,
        count: modules.length,
        modules
      });
    } catch (error) {
      console.error('❌ Error al listar módulos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/modules/active - Módulos activos para una empresa
  // NUEVO: Sistema de carga dinámica basado en UnifiedKnowledgeService
  // ═══════════════════════════════════════════════════════════
  router.get('/active', async (req, res) => {
    try {
      console.log('🧩 [DYNAMIC-MODULES] GET /api/modules/active llamado');
      let { company_id, panel = 'both', role = 'employee' } = req.query;

      // ⚠️ FIX: Normalizar "empresa" → "company" para match con metadata
      if (panel === 'empresa') {
        panel = 'company';
      } else if (panel === 'administrativo') {
        panel = 'admin';
      }

      console.log('🧩 [DYNAMIC-MODULES] Params (normalized):', { company_id, panel, role });

      if (!company_id) {
        console.warn('⚠️  [DYNAMIC-MODULES] company_id faltante');
        return res.status(400).json({
          success: false,
          error: 'company_id es requerido'
        });
      }

      // Obtener knowledgeService desde app.locals (req.app no disponible aquí)
      // Usamos global.knowledgeService como fallback
      const knowledgeService = global.knowledgeService;
      console.log('🧩 [DYNAMIC-MODULES] knowledgeService disponible?', !!knowledgeService);

      if (!knowledgeService || !knowledgeService.initialized) {
        console.warn('⚠️  [DYNAMIC-MODULES] UnifiedKnowledgeService no inicializado, usando BD');
        // Fallback: usar SystemModule directo
        const modules = await SystemModule.findAll({
          where: { isActive: true },
          order: [['displayOrder', 'ASC']]
        });
        console.log(`✅ [DYNAMIC-MODULES] Fallback BD retornó ${modules.length} módulos`);
        return res.json({
          success: true,
          company_id,
          panel,
          role,
          total_modules: modules.length,
          modules: modules.map(m => ({
            module_key: m.moduleKey,
            name: m.name,
            icon: m.icon,
            color: m.color,
            category: m.category,
            is_core: m.isCore,
            version: m.version,
            description: m.description,
            frontend_file: `/js/modules/${m.moduleKey}.js`,
            init_function: `show${capitalize(m.moduleKey)}Content`,
            available_in: m.availableIn
          })),
          source: 'fallback_system_module'
        });
      }

      // Obtener active_modules de la empresa
      const companies = await sequelize.query(
        'SELECT company_id, name, active_modules FROM companies WHERE company_id = ?',
        {
          replacements: [company_id],
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (!companies || companies.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Empresa no encontrada'
        });
      }

      const company = companies[0];

      // ⚠️ IMPORTANTE: active_modules puede venir como string JSON o como array JSONB
      let activeModulesKeys = [];
      if (company.active_modules) {
        if (typeof company.active_modules === 'string') {
          try {
            activeModulesKeys = JSON.parse(company.active_modules);
          } catch (parseError) {
            console.error('❌ [DYNAMIC-MODULES] Error parseando active_modules:', parseError);
            activeModulesKeys = [];
          }
        } else if (Array.isArray(company.active_modules)) {
          activeModulesKeys = company.active_modules;
        }
      }

      // Filtrar módulos desde UnifiedKnowledgeService
      const availableModules = [];

      for (const [moduleKey, metadata] of knowledgeService.metadata.entries()) {
        // Filtro 1: Si es CORE → incluir siempre
        const isCore = metadata.commercial?.isCore || metadata.is_core || false;

        // Filtro 2: Si NO es core, verificar que esté contratado
        if (!isCore && !activeModulesKeys.includes(moduleKey)) {
          continue; // Skip - no contratado
        }

        // Filtro 3: Panel (empresa vs administrativo)
        const availableIn = metadata.commercial?.availableIn || metadata.available_in || 'both';
        if (panel !== 'both') {
          if (availableIn !== 'both' && availableIn !== panel) {
            continue; // Skip - no disponible en este panel
          }
        }

        // Filtro 4: Rol (admin ve TODO)
        // Por ahora simple: admin pasa todos los filtros

        // Construir objeto de módulo para frontend
        // Prioridad: campos directos > objeto frontend > fallback generado
        availableModules.push({
          module_key: moduleKey,
          name: metadata.name || moduleKey,
          icon: metadata.icon || '📦',
          color: metadata.color || '#666',
          category: metadata.category || 'general',
          is_core: isCore,
          version: metadata.version || '1.0.0',
          description: metadata.description?.short || '',
          frontend_file: metadata.frontend_file || metadata.frontend?.file || `/js/modules/${moduleKey}.js`,
          init_function: metadata.init_function || metadata.frontend?.init_function || `show${capitalize(moduleKey)}Content`,
          submódulos: metadata.submódulos || [],
          available_in: availableIn
        });
      }

      // Ordenar por categoría y nombre
      availableModules.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });

      console.log(`✅ [DYNAMIC-MODULES] Retornando ${availableModules.length} módulos para empresa ${company.name}`);

      res.json({
        success: true,
        company_id: company.company_id,
        company_name: company.name,
        panel,
        role,
        total_modules: availableModules.length,
        modules: availableModules,
        source: 'unified_knowledge_service'
      });

    } catch (error) {
      console.error('❌ [DYNAMIC-MODULES] Error:', error);
      console.error('❌ [DYNAMIC-MODULES] Stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo módulos activos',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  /**
   * Helper: Capitalizar primera letra
   */
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ═══════════════════════════════════════════════════════════
  // GET /api/modules/:id - Obtener módulo específico
  // ═══════════════════════════════════════════════════════════
  router.get('/:id', auth, async (req, res) => {
    try {
      const module = await SystemModule.findByPk(req.params.id);

      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Módulo no encontrado'
        });
      }

      res.json({
        success: true,
        module
      });
    } catch (error) {
      console.error('❌ Error al obtener módulo:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/modules - Crear nuevo módulo (solo admin)
  // ═══════════════════════════════════════════════════════════
  router.post('/', auth, requireAdmin, async (req, res) => {
    try {
      const {
        module_key,
        name,
        description,
        icon,
        category,
        base_price,
        is_core,
        available_in,
        requirements,
        bundled_modules,
        provides_to,
        integrates_with,
        display_order
      } = req.body;

      // Validar module_key único
      const existing = await SystemModule.findOne({
        where: { moduleKey: module_key }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Ya existe un módulo con module_key: ${module_key}`
        });
      }

      const module = await SystemModule.create({
        moduleKey: module_key,
        name,
        description,
        icon,
        category,
        basePrice: base_price,
        isCore: is_core,
        availableIn: available_in || 'both',
        requirements: requirements || [],
        bundledModules: bundled_modules || [],
        providesTo: provides_to || [],
        integratesWith: integrates_with || [],
        displayOrder: display_order || 999,
        isActive: true
      });

      console.log(`✅ Módulo creado: ${module_key}`);

      res.status(201).json({
        success: true,
        message: 'Módulo creado exitosamente',
        module
      });
    } catch (error) {
      console.error('❌ Error al crear módulo:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // PUT /api/modules/:id - Actualizar módulo (solo admin)
  // ═══════════════════════════════════════════════════════════
  router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
      const module = await SystemModule.findByPk(req.params.id);

      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Módulo no encontrado'
        });
      }

      const {
        name,
        description,
        icon,
        category,
        base_price,
        is_core,
        available_in,
        requirements,
        bundled_modules,
        provides_to,
        integrates_with,
        display_order,
        is_active
      } = req.body;

      await module.update({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(category !== undefined && { category }),
        ...(base_price !== undefined && { basePrice: base_price }),
        ...(is_core !== undefined && { isCore: is_core }),
        ...(available_in !== undefined && { availableIn: available_in }),
        ...(requirements !== undefined && { requirements }),
        ...(bundled_modules !== undefined && { bundledModules: bundled_modules }),
        ...(provides_to !== undefined && { providesTo: provides_to }),
        ...(integrates_with !== undefined && { integratesWith: integrates_with }),
        ...(display_order !== undefined && { displayOrder: display_order }),
        ...(is_active !== undefined && { isActive: is_active })
      });

      console.log(`✅ Módulo actualizado: ${module.moduleKey}`);

      res.json({
        success: true,
        message: 'Módulo actualizado exitosamente',
        module
      });
    } catch (error) {
      console.error('❌ Error al actualizar módulo:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/modules/validate - Validar dependencias
  // ═══════════════════════════════════════════════════════════
  router.post('/validate', auth, async (req, res) => {
    try {
      const { module_key, company_id } = req.body;

      if (!module_key || !company_id) {
        return res.status(400).json({
          success: false,
          error: 'Faltan parámetros: module_key y company_id'
        });
      }

      // Usar función SQL validate_module_dependencies
      const [result] = await sequelize.query(
        'SELECT validate_module_dependencies(:company_id, :module_key) as validation',
        {
          replacements: { company_id, module_key },
          type: sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        validation: result.validation
      });
    } catch (error) {
      console.error('❌ Error al validar dependencias:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/modules/analyze-impact - Analizar impacto de desactivar
  // ═══════════════════════════════════════════════════════════
  router.post('/analyze-impact', auth, async (req, res) => {
    try {
      const { module_key, company_id } = req.body;

      if (!module_key || !company_id) {
        return res.status(400).json({
          success: false,
          error: 'Faltan parámetros: module_key y company_id'
        });
      }

      // Usar función SQL analyze_deactivation_impact
      const [result] = await sequelize.query(
        'SELECT analyze_deactivation_impact(:company_id, :module_key) as impact',
        {
          replacements: { company_id, module_key },
          type: sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        impact: result.impact
      });
    } catch (error) {
      console.error('❌ Error al analizar impacto:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/modules/available/:panel - Módulos por panel
  // ═══════════════════════════════════════════════════════════
  router.get('/available/:panel', auth, async (req, res) => {
    try {
      const { panel } = req.params; // 'admin' o 'company'

      if (!['admin', 'company'].includes(panel)) {
        return res.status(400).json({
          success: false,
          error: 'Panel debe ser "admin" o "company"'
        });
      }

      // Usar función SQL get_available_modules
      const modules = await sequelize.query(
        'SELECT * FROM get_available_modules(:panel)',
        {
          replacements: { panel },
          type: sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        success: true,
        panel,
        count: modules.length,
        modules
      });
    } catch (error) {
      console.error('❌ Error al obtener módulos por panel:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/modules/company/:company_id - Módulos de empresa
  // ═══════════════════════════════════════════════════════════
  router.get('/company/:company_id', auth, async (req, res) => {
    try {
      const { company_id } = req.params;

      // Obtener módulos activos con pricing
      const modules = await sequelize.query(
        `SELECT * FROM v_company_modules_pricing WHERE company_id = :company_id`,
        {
          replacements: { company_id },
          type: sequelize.QueryTypes.SELECT
        }
      );

      // Calcular total mensual
      const monthlyTotal = modules.reduce((sum, m) => sum + parseFloat(m.monthly_cost || 0), 0);

      res.json({
        success: true,
        company_id,
        count: modules.length,
        monthly_total: monthlyTotal.toFixed(2),
        modules
      });
    } catch (error) {
      console.error('❌ Error al obtener módulos de empresa:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/modules/company/:company_id/activate - Activar módulo
  // ═══════════════════════════════════════════════════════════
  router.post('/company/:company_id/activate', auth, async (req, res) => {
    try {
      const { company_id } = req.params;
      const { module_key, price_per_employee } = req.body;

      if (!module_key) {
        return res.status(400).json({
          success: false,
          error: 'Falta parámetro: module_key'
        });
      }

      // Buscar módulo
      const module = await SystemModule.findOne({
        where: { moduleKey: module_key }
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          error: `Módulo no encontrado: ${module_key}`
        });
      }

      // Validar dependencias
      const [validation] = await sequelize.query(
        'SELECT validate_module_dependencies(:company_id, :module_key) as validation',
        {
          replacements: { company_id, module_key },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (!validation.validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Dependencias faltantes',
          validation: validation.validation
        });
      }

      // Activar módulo
      await CompanyModule.upsert({
        company_id,
        system_module_id: module.id,
        is_active: true,
        price_per_employee: price_per_employee !== undefined ? price_per_employee : module.basePrice,
        is_bundled: false,
        bundled_with: null
      });

      // Trigger auto_activate_bundled_modules se encargará de activar bundled

      console.log(`✅ Módulo ${module_key} activado para empresa ${company_id}`);

      res.json({
        success: true,
        message: `Módulo ${module.name} activado exitosamente`,
        bundled_activated: module.bundledModules || []
      });
    } catch (error) {
      console.error('❌ Error al activar módulo:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/modules/company/:company_id/deactivate - Desactivar módulo
  // ═══════════════════════════════════════════════════════════
  router.delete('/company/:company_id/deactivate', auth, async (req, res) => {
    try {
      const { company_id } = req.params;
      const { module_key } = req.body;

      if (!module_key) {
        return res.status(400).json({
          success: false,
          error: 'Falta parámetro: module_key'
        });
      }

      // Analizar impacto
      const [impact] = await sequelize.query(
        'SELECT analyze_deactivation_impact(:company_id, :module_key) as impact',
        {
          replacements: { company_id, module_key },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (!impact.impact.safe) {
        return res.status(400).json({
          success: false,
          error: 'No se puede desactivar: hay módulos dependientes',
          impact: impact.impact
        });
      }

      // Buscar módulo
      const module = await SystemModule.findOne({
        where: { moduleKey: module_key }
      });

      if (!module) {
        return res.status(404).json({
          success: false,
          error: `Módulo no encontrado: ${module_key}`
        });
      }

      // Desactivar
      await CompanyModule.update(
        { is_active: false },
        {
          where: {
            company_id,
            system_module_id: module.id
          }
        }
      );

      console.log(`✅ Módulo ${module_key} desactivado para empresa ${company_id}`);

      res.json({
        success: true,
        message: `Módulo ${module.name} desactivado exitosamente`
      });
    } catch (error) {
      console.error('❌ Error al desactivar módulo:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/modules/stats - Estadísticas generales (público)
  // ═══════════════════════════════════════════════════════════
  router.get('/stats/general', async (req, res) => {
    try {
      const total = await SystemModule.count({ where: { is_active: true } });
      const core = await SystemModule.count({ where: { is_core: true, is_active: true } });
      const withBundling = await SystemModule.count({
        where: {
          is_active: true,
          bundled_modules: { [sequelize.Op.ne]: '[]' }
        }
      });

      const byCategory = await SystemModule.findAll({
        attributes: [
          'category',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: { is_active: true },
        group: ['category']
      });

      const byPanel = await SystemModule.findAll({
        attributes: [
          'available_in',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: { is_active: true },
        group: ['available_in']
      });

      res.json({
        success: true,
        stats: {
          total,
          core,
          with_bundling: withBundling,
          by_category: byCategory,
          by_panel: byPanel
        }
      });
    } catch (error) {
      console.error('❌ Error al obtener stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};
