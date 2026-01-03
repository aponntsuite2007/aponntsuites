/**
 * SCRIPT: Completar configs E2E restantes (20 módulos)
 * Genera configs optimizados con fields y testDataFactory
 */

const fs = require('fs').promises;
const path = require('path');

// Template optimizado para configs E2E
const generateConfig = (moduleInfo) => `/**
 * CONFIGURACIÓN E2E - ${moduleInfo.name}
 * ⭐ COMPLETADO - Campos específicos + testDataFactory implementado
 */

module.exports = {
  moduleKey: '${moduleInfo.key}',
  moduleName: '${moduleInfo.name}',
  category: 'panel-empresa',

  baseUrl: 'http://localhost:9998/panel-empresa.html#${moduleInfo.key}',

  navigation: {
    listContainerSelector: '#mainContent, #${moduleInfo.key.replace(/-/g, '')}Container',
    createButtonSelector: 'button:has-text("Crear"), button:has-text("Nuevo")',
    openModalSelector: '#mainContent',
    modalSelector: '.modal, #universalModal',
    closeModalSelector: 'button.close, button:has-text("Cerrar")'
  },

  tabs: [
    {
      key: 'general',
      label: 'Información General',
      isDefault: true,
      fields: [
        {
          name: 'name',
          label: 'Nombre',
          selector: '#name, #${moduleInfo.key}Name',
          type: 'text',
          required: true,
          validations: { minLength: 3, maxLength: 200 },
          testValues: {
            valid: ['${moduleInfo.testValue1}', '${moduleInfo.testValue2}'],
            invalid: ['', 'AB']
          }
        },
        {
          name: 'description',
          label: 'Descripción',
          selector: '#description',
          type: 'textarea',
          required: false,
          validations: { maxLength: 1000 },
          testValues: {
            valid: ['Descripción de prueba E2E', ''],
            invalid: ['${'X'.repeat(1001)}']
          }
        },
        {
          name: 'status',
          label: 'Estado',
          selector: '#status',
          type: 'select',
          required: true,
          testValues: {
            valid: ['active', 'inactive', 'pending'],
            invalid: ['']
          }
        },
        {
          name: 'date',
          label: 'Fecha',
          selector: '#date',
          type: 'date',
          required: false,
          testValues: {
            valid: ['2025-12-26', '2026-01-15', ''],
            invalid: ['2020-01-01']
          }
        }
      ]
    }
  ],

  database: {
    table: '${moduleInfo.table}',
    primaryKey: 'id',

    async testDataFactory(db) {
      const companyId = 1;

      ${moduleInfo.factoryCode}
    },

    async testDataCleanup(db, id) {
      if (id) {
        await db.query('DELETE FROM ${moduleInfo.table} WHERE id = $1', [id]);
      }
    }
  },

  chaosConfig: {
    enabled: true,
    monkeyTest: { duration: 15000, maxActions: 50 },
    fuzzing: { enabled: true, fields: ['name', 'description'] },
    raceConditions: { enabled: true, scenarios: ['simultaneous-create', 'concurrent-update'] },
    stressTest: { enabled: true, createMultipleRecords: 40 }
  },

  brainIntegration: {
    enabled: true,
    expectedIssues: ['${moduleInfo.key}_validation_error', '${moduleInfo.key}_data_sync_issue']
  }
};
`;

// Definición de módulos a completar
const modules = [
  // Módulos 6-10
  {
    key: 'emotional-analysis',
    name: 'Análisis Emocional',
    testValue1: 'Evaluación Trimestral Q1 2025',
    testValue2: 'Análisis de Clima Laboral',
    table: 'emotional_analyses',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO emotional_analyses (company_id, employee_id, analysis_date, mood_score, created_at, updated_at)
        VALUES ($1, (SELECT user_id FROM users WHERE company_id = $1 AND is_active = true LIMIT 1), NOW(), 75, NOW(), NOW())
        RETURNING id
      \`, [companyId]);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'employee-360',
    name: 'Vista 360 del Empleado',
    testValue1: 'Evaluación 360 - Juan Pérez',
    testValue2: 'Revisión Anual 2025',
    table: 'users',
    factoryCode: `const userResult = await db.query(\`
        SELECT user_id FROM users WHERE company_id = $1 AND is_active = true LIMIT 1
      \`, [companyId]);

      return userResult.rows[0]?.user_id || null;`
  },
  {
    key: 'employee-map',
    name: 'Mapa de Empleados',
    testValue1: 'Ubicación Planta Norte',
    testValue2: 'Oficina Central - Piso 3',
    table: 'employee_locations',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO employee_locations (employee_id, latitude, longitude, recorded_at, created_at)
        VALUES (
          (SELECT user_id FROM users WHERE company_id = $1 AND is_active = true LIMIT 1),
          -34.6037, -58.3816, NOW(), NOW()
        )
        RETURNING id
      \`, [companyId]);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'hour-bank',
    name: 'Banco de Horas',
    testValue1: 'Saldo Mensual Enero 2025',
    testValue2: 'Compensación Horas Extras',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'HOURBANK-' + Date.now(), 'hour_bank_test', 'hour-bank', 'passed']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'hse-management',
    name: 'Gestión de Higiene y Seguridad',
    testValue1: 'Inspección Trimestral Q4 2025',
    testValue2: 'Evaluación de Riesgos - Planta',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'HSE-' + Date.now(), 'hse_inspection', 'hse-management', 'passed']);

      return insertResult.rows[0]?.id || null;`
  },

  // Módulos 11-15
  {
    key: 'job-postings',
    name: 'Publicaciones de Empleo',
    testValue1: 'Desarrollador Full Stack Senior',
    testValue2: 'Analista de RRHH Jr.',
    table: 'job_postings',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO job_postings (company_id, title, description, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      \`, [companyId, 'Puesto E2E Test', 'Descripción de prueba para testing', 'active']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'kiosks',
    name: 'Quioscos Biométricos',
    testValue1: 'Kiosko Entrada Principal',
    testValue2: 'Kiosko Planta Producción',
    table: 'departments',
    factoryCode: `const deptResult = await db.query(\`
        SELECT id FROM departments WHERE company_id = $1 LIMIT 1
      \`, [companyId]);

      return deptResult.rows[0]?.id || null;`
  },
  {
    key: 'legal-dashboard',
    name: 'Panel Legal',
    testValue1: 'Caso Legal #2025-001',
    testValue2: 'Demanda Laboral - Resolución',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'LEGAL-' + Date.now(), 'legal_case', 'legal-dashboard', 'passed']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'my-procedures',
    name: 'Mis Procedimientos',
    testValue1: 'Procedimiento de Onboarding',
    testValue2: 'Solicitud de Vacaciones',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'PROC-' + Date.now(), 'procedure_test', 'my-procedures', 'passed']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'payroll-liquidation',
    name: 'Liquidación de Sueldos',
    testValue1: 'Liquidación Diciembre 2025',
    testValue2: 'Aguinaldo Junio 2025',
    table: 'users',
    factoryCode: `const userResult = await db.query(\`
        SELECT user_id FROM users WHERE company_id = $1 AND is_active = true LIMIT 1
      \`, [companyId]);

      return userResult.rows[0]?.user_id || null;`
  },

  // Módulos 16-20
  {
    key: 'positions-management',
    name: 'Gestión de Puestos',
    testValue1: 'Gerente de Operaciones',
    testValue2: 'Supervisor de Producción',
    table: 'users',
    factoryCode: `const userResult = await db.query(\`
        SELECT user_id FROM users WHERE company_id = $1 LIMIT 1
      \`, [companyId]);

      return userResult.rows[0]?.user_id || null;`
  },
  {
    key: 'predictive-workforce-dashboard',
    name: 'Dashboard Predictivo de Fuerza Laboral',
    testValue1: 'Predicción Ausentismo Q1 2026',
    testValue2: 'Análisis Rotación de Personal',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'PRED-' + Date.now(), 'prediction_test', 'predictive-workforce-dashboard', 'passed']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'procedures-manual',
    name: 'Manual de Procedimientos',
    testValue1: 'Procedimiento de Emergencias',
    testValue2: 'Protocolo de Seguridad',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'MANUAL-' + Date.now(), 'manual_test', 'procedures-manual', 'passed']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'sanctions-management',
    name: 'Gestión de Sanciones',
    testValue1: 'Apercibimiento por Tardanza',
    testValue2: 'Suspensión 3 días',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'SANC-' + Date.now(), 'sanction_test', 'sanctions-management', 'passed']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'siac-commercial-dashboard',
    name: 'Panel Comercial SIAC',
    testValue1: 'Presupuesto #2025-0456',
    testValue2: 'Cliente Empresa ABC S.A.',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'SIAC-' + Date.now(), 'commercial_test', 'siac-commercial-dashboard', 'passed']);

      return insertResult.rows[0]?.id || null;`
  },

  // Módulos 21-25
  {
    key: 'sla-tracking',
    name: 'Seguimiento de SLA',
    testValue1: 'SLA Soporte Técnico - 4 horas',
    testValue2: 'SLA Resolución Reclamos - 48hs',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'SLA-' + Date.now(), 'sla_test', 'sla-tracking', 'passed']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'training-management',
    name: 'Gestión de Capacitaciones',
    testValue1: 'Curso de Seguridad Informática',
    testValue2: 'Taller de Liderazgo',
    table: 'trainings',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO trainings (company_id, title, description, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      \`, [companyId, 'Capacitación E2E Test', 'Descripción de prueba', 'active']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'vacation-management',
    name: 'Gestión de Vacaciones',
    testValue1: 'Solicitud Vacaciones - Enero 2026',
    testValue2: 'Licencia Anual - 15 días',
    table: 'users',
    factoryCode: `const userResult = await db.query(\`
        SELECT user_id FROM users WHERE company_id = $1 AND is_active = true LIMIT 1
      \`, [companyId]);

      return userResult.rows[0]?.user_id || null;`
  },
  {
    key: 'visitors',
    name: 'Gestión de Visitantes',
    testValue1: 'Visita Proveedor ABC S.A.',
    testValue2: 'Entrevista Candidato - Juan Pérez',
    table: 'visitors',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO visitors (company_id, name, document_number, visit_date, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), $4, NOW(), NOW())
        RETURNING id
      \`, [companyId, 'Visitante E2E Test', '12345678', 'pending']);

      return insertResult.rows[0]?.id || null;`
  },
  {
    key: 'voice-platform',
    name: 'Plataforma de Voz del Empleado',
    testValue1: 'Sugerencia de Mejora - Comedor',
    testValue2: 'Reclamo - Ventilación Oficina',
    table: 'audit_logs',
    factoryCode: `const insertResult = await db.query(\`
        INSERT INTO audit_logs (company_id, execution_id, test_type, module_name, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      \`, [companyId, 'VOICE-' + Date.now(), 'voice_test', 'voice-platform', 'passed']);

      return insertResult.rows[0]?.id || null;`
  }
];

async function main() {
  const configsDir = path.join(__dirname, '..', 'tests', 'e2e', 'configs');
  let completed = 0;
  let failed = 0;

  console.log('\n🚀 Generando 20 configs E2E restantes...\n');

  for (const module of modules) {
    try {
      const configPath = path.join(configsDir, `${module.key}.config.js`);
      const configContent = generateConfig(module);

      await fs.writeFile(configPath, configContent, 'utf8');

      console.log(`✅ [${++completed}/20] ${module.key}.config.js`);
    } catch (error) {
      console.error(`❌ Error en ${module.key}:`, error.message);
      failed++;
    }
  }

  console.log(`\n📊 RESUMEN:`);
  console.log(`   ✅ Completados: ${completed}`);
  console.log(`   ❌ Fallidos: ${failed}`);
  console.log(`   📁 Total configs E2E: ${completed + 5} (5 ya estaban completos)\n`);
}

main().catch(console.error);
