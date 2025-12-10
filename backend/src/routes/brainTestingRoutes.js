/**
 * ============================================================================
 * BRAIN INTELLIGENT TESTING ROUTES - API de Testing Inteligente
 * ============================================================================
 *
 * Endpoints que exponen el BrainIntelligentTestService:
 * - Escaneo de formularios frontend
 * - Generación de planes de test
 * - Ejecución de tests inteligentes
 * - Capacidades de testing por módulo
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const BrainIntelligentTestService = require('../services/BrainIntelligentTestService');

let testService = null;

/**
 * Middleware para inicializar el servicio
 */
router.use((req, res, next) => {
  if (!testService) {
    const brainService = req.app.get('brainService');
    const database = req.app.get('database');

    if (!brainService) {
      console.warn('⚠️ [BRAIN-TEST-API] BrainService no disponible');
    }

    testService = new BrainIntelligentTestService(brainService, database);
    console.log('🧪 [BRAIN-TEST-API] BrainIntelligentTestService inicializado');
  }
  next();
});

// ============================================================================
// STATUS / HEALTH
// ============================================================================

/**
 * GET /api/brain-testing/status
 * Estado del servicio de testing inteligente
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      initialized: !!testService,
      brainConnected: !!testService?.brainService,
      features: [
        'form-scanning',
        'test-plan-generation',
        'intelligent-test-execution',
        'validation-testing',
        'crud-testing'
      ],
      version: '1.0.0'
    }
  });
});

// ============================================================================
// ESCANEO DE FORMULARIOS
// ============================================================================

/**
 * GET /api/brain-testing/forms
 * Escanea todos los formularios del frontend
 */
router.get('/forms', async (req, res) => {
  try {
    console.log('\n📋 [BRAIN-TEST-API] Escaneando formularios...');

    const formsAnalysis = await testService.scanFrontendForms();

    res.json({
      success: true,
      data: formsAnalysis
    });
  } catch (error) {
    console.error('❌ [BRAIN-TEST-API] Error escaneando formularios:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/brain-testing/forms/:moduleKey
 * Formularios de un módulo específico
 */
router.get('/forms/:moduleKey', async (req, res) => {
  try {
    const { moduleKey } = req.params;
    console.log(`\n📋 [BRAIN-TEST-API] Formularios del módulo: ${moduleKey}`);

    const formsAnalysis = await testService.scanFrontendForms();
    const moduleForms = formsAnalysis.byModule[moduleKey];

    if (!moduleForms) {
      return res.json({
        success: true,
        data: {
          moduleKey,
          found: false,
          forms: [],
          modals: [],
          availableModules: Object.keys(formsAnalysis.byModule)
        }
      });
    }

    res.json({
      success: true,
      data: {
        moduleKey,
        found: true,
        forms: moduleForms.forms || [],
        modals: moduleForms.modals || [],
        totalFields: [...(moduleForms.forms || []), ...(moduleForms.modals || [])]
          .reduce((sum, f) => sum + (f.fields?.length || 0), 0)
      }
    });
  } catch (error) {
    console.error('❌ [BRAIN-TEST-API] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GENERACIÓN DE PLANES DE TEST
// ============================================================================

/**
 * GET /api/brain-testing/plan/:moduleKey
 * Genera plan de tests inteligente para un módulo
 */
router.get('/plan/:moduleKey', async (req, res) => {
  try {
    const { moduleKey } = req.params;
    console.log(`\n📋 [BRAIN-TEST-API] Generando plan para: ${moduleKey}`);

    const testPlan = await testService.generateModuleTestPlan(moduleKey);

    res.json({
      success: true,
      data: testPlan
    });
  } catch (error) {
    console.error('❌ [BRAIN-TEST-API] Error generando plan:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/brain-testing/plan
 * Genera plan de tests para múltiples módulos
 */
router.post('/plan', async (req, res) => {
  try {
    const { modules } = req.body;

    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere array de módulos en body.modules'
      });
    }

    console.log(`\n📋 [BRAIN-TEST-API] Generando planes para ${modules.length} módulos...`);

    const plans = {};
    for (const moduleKey of modules) {
      try {
        plans[moduleKey] = await testService.generateModuleTestPlan(moduleKey);
      } catch (e) {
        plans[moduleKey] = { error: e.message };
      }
    }

    res.json({
      success: true,
      data: {
        modulesRequested: modules.length,
        plans
      }
    });
  } catch (error) {
    console.error('❌ [BRAIN-TEST-API] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CAPACIDADES DE TESTING
// ============================================================================

/**
 * GET /api/brain-testing/capabilities
 * Resumen de capacidades de testing por módulo
 */
router.get('/capabilities', async (req, res) => {
  try {
    console.log('\n📊 [BRAIN-TEST-API] Obteniendo capacidades de testing...');

    const capabilities = await testService.getTestingCapabilities();

    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    console.error('❌ [BRAIN-TEST-API] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// EJECUCIÓN DE TESTS
// ============================================================================

/**
 * POST /api/brain-testing/execute/:moduleKey
 * Ejecuta tests inteligentes para un módulo
 */
router.post('/execute/:moduleKey', async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const options = req.body || {};

    console.log(`\n🚀 [BRAIN-TEST-API] Ejecutando tests para: ${moduleKey}`);

    // Generar el plan primero
    const testPlan = await testService.generateModuleTestPlan(moduleKey);

    // Si se piden solo instrucciones
    if (options.dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        data: {
          moduleKey,
          testPlan,
          message: 'Plan generado. Use dryRun: false para ejecutar.'
        }
      });
    }

    // Ejecutar tests
    const execution = await testService.executeModuleTests(moduleKey, {
      ...options,
      baseUrl: `http://localhost:${process.env.PORT || 9998}`
    });

    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    console.error('❌ [BRAIN-TEST-API] Error ejecutando tests:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/brain-testing/execute-all
 * Ejecuta tests para todos los módulos con forms detectados
 */
router.post('/execute-all', async (req, res) => {
  try {
    const options = req.body || {};
    console.log('\n🚀 [BRAIN-TEST-API] Ejecutando tests para TODOS los módulos...');

    const capabilities = await testService.getTestingCapabilities();
    const moduleKeys = Object.keys(capabilities.modules).filter(k =>
      capabilities.modules[k].canTest
    );

    // Ejecución en background
    const executionId = `all-${Date.now()}`;

    // Respuesta inmediata
    res.json({
      success: true,
      data: {
        executionId,
        status: 'started',
        modulesToTest: moduleKeys.length,
        modules: moduleKeys,
        message: 'Ejecución iniciada. Consultar progreso en /api/brain-testing/executions'
      }
    });

    // Ejecutar en background (no bloqueante)
    setImmediate(async () => {
      for (const moduleKey of moduleKeys) {
        try {
          await testService.executeModuleTests(moduleKey, options);
        } catch (e) {
          console.error(`   ❌ Error en ${moduleKey}:`, e.message);
        }
      }
      console.log(`✅ [BRAIN-TEST-API] Ejecución completa: ${executionId}`);
    });

  } catch (error) {
    console.error('❌ [BRAIN-TEST-API] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ANÁLISIS DETALLADO DE CAMPOS
// ============================================================================

/**
 * GET /api/brain-testing/fields/:moduleKey
 * Obtiene análisis detallado de campos para un módulo
 */
router.get('/fields/:moduleKey', async (req, res) => {
  try {
    const { moduleKey } = req.params;
    console.log(`\n🔍 [BRAIN-TEST-API] Analizando campos de: ${moduleKey}`);

    const formsAnalysis = await testService.scanFrontendForms();
    const moduleForms = formsAnalysis.byModule[moduleKey];

    if (!moduleForms) {
      return res.json({
        success: true,
        data: {
          moduleKey,
          found: false,
          fields: []
        }
      });
    }

    // Extraer todos los campos únicos
    const allForms = [...(moduleForms.forms || []), ...(moduleForms.modals || [])];
    const fieldsMap = new Map();

    for (const form of allForms) {
      for (const field of (form.fields || [])) {
        const key = field.name || field.id;
        if (key && !fieldsMap.has(key)) {
          fieldsMap.set(key, {
            ...field,
            foundInForms: [form.id],
            testValue: testService._generateTestValue(field)
          });
        } else if (key) {
          fieldsMap.get(key).foundInForms.push(form.id);
        }
      }
    }

    res.json({
      success: true,
      data: {
        moduleKey,
        found: true,
        totalUniqueFields: fieldsMap.size,
        fields: Array.from(fieldsMap.values()),
        fieldsByType: {
          required: Array.from(fieldsMap.values()).filter(f => f.required).length,
          text: Array.from(fieldsMap.values()).filter(f => f.type === 'text').length,
          select: Array.from(fieldsMap.values()).filter(f => f.elementType === 'select').length,
          email: Array.from(fieldsMap.values()).filter(f => f.dataType === 'email').length,
          date: Array.from(fieldsMap.values()).filter(f => f.dataType === 'date').length
        }
      }
    });
  } catch (error) {
    console.error('❌ [BRAIN-TEST-API] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GENERACIÓN DE DATOS DE PRUEBA
// ============================================================================

/**
 * POST /api/brain-testing/generate-data/:moduleKey
 * Genera datos de prueba inteligentes para un módulo
 */
router.post('/generate-data/:moduleKey', async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const { count = 1 } = req.body;

    console.log(`\n🎲 [BRAIN-TEST-API] Generando ${count} registros para: ${moduleKey}`);

    const testPlan = await testService.generateModuleTestPlan(moduleKey);

    // Extraer campos de formularios
    const formTests = testPlan.tests.filter(t => t.type === 'e2e' && t.fields?.length > 0);

    if (formTests.length === 0) {
      return res.json({
        success: false,
        error: 'No se encontraron formularios con campos para este módulo'
      });
    }

    // Generar datos basados en campos
    const generatedData = [];
    for (let i = 0; i < count; i++) {
      const record = {};
      for (const field of formTests[0].fields || []) {
        record[field.name] = testService._generateTestValue(field);
      }
      generatedData.push(record);
    }

    res.json({
      success: true,
      data: {
        moduleKey,
        count: generatedData.length,
        basedOnForm: formTests[0].config?.formId,
        records: generatedData
      }
    });
  } catch (error) {
    console.error('❌ [BRAIN-TEST-API] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    service: 'BrainIntelligentTestService',
    timestamp: new Date().toISOString(),
    brainConnected: !!testService?.brainService
  });
});

module.exports = router;
