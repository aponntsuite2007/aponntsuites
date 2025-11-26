/**
 * Script de testing completo para TABs 2, 3 y 8
 * Testea los 35 endpoints implementados y la persistencia de datos
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:9998';
let authToken = '';
let testUserId = '';
let companyId = 11; // ISI

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper para logs con color
const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}━━━ ${msg} ━━━${colors.reset}\n`)
};

// Estadísticas
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Helper para hacer requests con auth
 */
async function apiRequest(method, endpoint, data = null, isFormData = false) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    };

    if (data) {
      if (isFormData) {
        config.data = data;
        config.headers = {
          ...config.headers,
          ...data.getHeaders()
        };
      } else {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

/**
 * Test runner
 */
async function runTest(name, testFn) {
  stats.total++;
  try {
    log.info(`Testing: ${name}`);
    await testFn();
    stats.passed++;
    log.success(`PASSED: ${name}`);
    return true;
  } catch (error) {
    stats.failed++;
    stats.errors.push({ test: name, error: error.message });
    log.error(`FAILED: ${name} - ${error.message}`);
    return false;
  }
}

/**
 * Paso 1: Autenticación
 */
async function authenticate() {
  log.section('PASO 1: AUTENTICACIÓN');

  try {
    const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      identifier: 'admin',
      password: 'admin123',
      companyId: 11 // ISI
    });

    if (response.data.token) {
      authToken = response.data.token;
      testUserId = response.data.user.id; // FIXED: use 'id' not 'user_id'
      companyId = response.data.user.company_id;
      log.success(`Autenticado como: ${response.data.user.username || response.data.user.usuario}`);
      log.info(`User ID: ${testUserId}`);
      log.info(`Company ID: ${companyId}`);
      return true;
    } else {
      throw new Error('No se recibió token');
    }
  } catch (error) {
    log.error(`Error en autenticación: ${error.message}`);
    if (error.response) {
      log.error(`Response data: ${JSON.stringify(error.response.data)}`);
      log.error(`Status: ${error.response.status}`);
    }
    return false;
  }
}

/**
 * Paso 2: Test TAB 2 - Datos Personales (Licencias)
 */
async function testTab2() {
  log.section('PASO 2: TESTING TAB 2 - DATOS PERSONALES');

  const createdIds = {
    driverLicense: null,
    professionalLicense: null
  };

  // ==========================================
  // LICENCIAS DE CONDUCIR
  // ==========================================
  log.info('Testing Licencias de Conducir...');

  // CREATE Driver License
  await runTest('POST /users/:userId/driver-licenses', async () => {
    const result = await apiRequest('POST', `/api/v1/users/${testUserId}/driver-licenses`, {
      licenseNumber: 'B-12345678',
      licenseType: 'nacional', // FIXED: Backend espera licenseType, no type
      licenseClass: 'B',
      issueDate: '2020-01-15',
      expiryDate: '2025-01-15', // FIXED: Backend usa expiryDate, no expirationDate
      issuingAuthority: 'Municipalidad de Buenos Aires',
      restrictions: 'Uso de lentes correctores',
      observations: 'Licencia para conducir automóviles'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.data.id) throw new Error('No se recibió ID de licencia creada');

    createdIds.driverLicense = result.data.data.id;
    log.info(`Licencia de conducir creada con ID: ${createdIds.driverLicense}`);
  });

  // GET Driver Licenses (List)
  await runTest('GET /users/:userId/driver-licenses', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/driver-licenses`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!Array.isArray(result.data.data)) throw new Error('No se recibió array de licencias');
    if (result.data.data.length === 0) throw new Error('No se encontraron licencias');

    log.info(`Se encontraron ${result.data.data.length} licencia(s) de conducir`);
  });

  // GET Driver License (Single)
  await runTest('GET /users/:userId/driver-licenses/:licenseId', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/driver-licenses/${createdIds.driverLicense}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (result.data.data.licenseNumber !== 'B-12345678') throw new Error('Número de licencia no coincide');
  });

  // UPDATE Driver License
  await runTest('PUT /users/:userId/driver-licenses/:licenseId', async () => {
    const result = await apiRequest('PUT', `/api/v1/users/${testUserId}/driver-licenses/${createdIds.driverLicense}`, {
      licenseClass: 'A',
      observations: 'Actualizado a clase A - Motocicletas'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (result.data.data.licenseClass !== 'A') throw new Error('Clase de licencia no se actualizó');
  });

  // DELETE Driver License
  await runTest('DELETE /users/:userId/driver-licenses/:licenseId', async () => {
    const result = await apiRequest('DELETE', `/api/v1/users/${testUserId}/driver-licenses/${createdIds.driverLicense}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });

  // ==========================================
  // LICENCIAS PROFESIONALES
  // ==========================================
  log.info('Testing Licencias Profesionales...');

  // CREATE Professional License
  await runTest('POST /users/:userId/professional-licenses', async () => {
    const result = await apiRequest('POST', `/api/v1/users/${testUserId}/professional-licenses`, {
      licenseName: 'Matrícula Profesional de Ingeniería', // FIXED: Backend espera licenseName
      profession: 'Ingeniero en Sistemas', // FIXED: Backend espera profession
      licenseNumber: 'ING-54321',
      issuingBody: 'Consejo Profesional de Ingeniería',
      issueDate: '2018-03-10',
      expiryDate: '2028-03-10',
      specializations: 'Ingeniería en Sistemas, Desarrollo de Software',
      observations: 'Matrícula habilitante'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.data.id) throw new Error('No se recibió ID de licencia profesional creada');

    createdIds.professionalLicense = result.data.data.id;
    log.info(`Licencia profesional creada con ID: ${createdIds.professionalLicense}`);
  });

  // GET Professional Licenses (List)
  await runTest('GET /users/:userId/professional-licenses', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/professional-licenses`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!Array.isArray(result.data.data)) throw new Error('No se recibió array de licencias profesionales');
  });

  // GET Professional License (Single)
  await runTest('GET /users/:userId/professional-licenses/:licenseId', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/professional-licenses/${createdIds.professionalLicense}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (result.data.data.licenseNumber !== 'ING-54321') throw new Error('Número de matrícula no coincide');
  });

  // UPDATE Professional License
  await runTest('PUT /users/:userId/professional-licenses/:licenseId', async () => {
    const result = await apiRequest('PUT', `/api/v1/users/${testUserId}/professional-licenses/${createdIds.professionalLicense}`, {
      specialty: 'Ingeniería en Software',
      observations: 'Especialización actualizada'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });

  // DELETE Professional License
  await runTest('DELETE /users/:userId/professional-licenses/:licenseId', async () => {
    const result = await apiRequest('DELETE', `/api/v1/users/${testUserId}/professional-licenses/${createdIds.professionalLicense}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });
}

/**
 * Paso 3: Test TAB 3 - Antecedentes Laborales
 */
async function testTab3() {
  log.section('PASO 3: TESTING TAB 3 - ANTECEDENTES LABORALES');

  const createdIds = {
    legalIssue: null,
    unionAffiliation: null
  };

  // ==========================================
  // ASUNTOS LEGALES/JUDICIALES
  // ==========================================
  log.info('Testing Asuntos Legales...');

  // CREATE Legal Issue
  await runTest('POST /users/:userId/legal-issues', async () => {
    const result = await apiRequest('POST', `/api/v1/users/${testUserId}/legal-issues`, {
      issueType: 'civil',
      caseNumber: 'CIV-2023-001',
      court: 'Juzgado Civil N°5',
      filingDate: '2023-05-10',
      status: 'en_tramite', // FIXED: Backend acepta 'en_tramite', no 'en_proceso'
      description: 'Demanda civil por incumplimiento contractual',
      resolution: null,
      resolutionDate: null
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.data.id) throw new Error('No se recibió ID de asunto legal creado');

    createdIds.legalIssue = result.data.data.id;
    log.info(`Asunto legal creado con ID: ${createdIds.legalIssue}`);
  });

  // GET Legal Issues (List)
  await runTest('GET /users/:userId/legal-issues', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/legal-issues`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!Array.isArray(result.data.data)) throw new Error('No se recibió array de asuntos legales');
  });

  // GET Legal Issue (Single)
  await runTest('GET /users/:userId/legal-issues/:issueId', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/legal-issues/${createdIds.legalIssue}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (result.data.data.caseNumber !== 'CIV-2023-001') throw new Error('Número de caso no coincide');
  });

  // UPDATE Legal Issue
  await runTest('PUT /users/:userId/legal-issues/:issueId', async () => {
    const result = await apiRequest('PUT', `/api/v1/users/${testUserId}/legal-issues/${createdIds.legalIssue}`, {
      status: 'resuelto',
      resolution: 'Acuerdo amistoso entre partes',
      resolutionDate: '2023-12-15'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (result.data.data.status !== 'resuelto') throw new Error('Estado no se actualizó');
  });

  // DELETE Legal Issue (Hard delete)
  await runTest('DELETE /users/:userId/legal-issues/:issueId', async () => {
    const result = await apiRequest('DELETE', `/api/v1/users/${testUserId}/legal-issues/${createdIds.legalIssue}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });

  // ==========================================
  // AFILIACIÓN SINDICAL
  // ==========================================
  log.info('Testing Afiliación Sindical...');

  // CREATE Union Affiliation
  await runTest('POST /users/:userId/union-affiliation', async () => {
    const result = await apiRequest('POST', `/api/v1/users/${testUserId}/union-affiliation`, {
      unionName: 'Sindicato de Trabajadores de la Industria',
      affiliationNumber: 'STI-2024-1234',
      affiliationDate: '2024-01-10',
      monthlyFee: 5000,
      hasFueroSindical: true,
      fueroSindicaStartDate: '2024-06-01',
      unionRole: 'Delegado de Base',
      observations: 'Delegado gremial con fuero sindical'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.data.id) throw new Error('No se recibió ID de afiliación sindical creada');

    createdIds.unionAffiliation = result.data.data.id;
    log.info(`Afiliación sindical creada con ID: ${createdIds.unionAffiliation}`);
  });

  // GET Union Affiliation
  await runTest('GET /users/:userId/union-affiliation', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/union-affiliation`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.data) throw new Error('No se recibió afiliación sindical');
  });

  // GET Union Affiliation (by ID)
  await runTest('GET /users/:userId/union-affiliation/:affiliationId', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/union-affiliation/${createdIds.unionAffiliation}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (result.data.data.unionName !== 'Sindicato de Trabajadores de la Industria') throw new Error('Nombre de sindicato no coincide');
  });

  // UPDATE Union Affiliation
  await runTest('PUT /users/:userId/union-affiliation/:affiliationId', async () => {
    const result = await apiRequest('PUT', `/api/v1/users/${testUserId}/union-affiliation/${createdIds.unionAffiliation}`, {
      unionRole: 'Secretario General',
      monthlyFee: 7500
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });

  // DELETE Union Affiliation (Soft delete)
  await runTest('DELETE /users/:userId/union-affiliation/:affiliationId', async () => {
    const result = await apiRequest('DELETE', `/api/v1/users/${testUserId}/union-affiliation/${createdIds.unionAffiliation}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });
}

/**
 * Paso 4: Test TAB 8 - Config. Tareas y Salario
 */
async function testTab8() {
  log.section('PASO 4: TESTING TAB 8 - CONFIG. TAREAS Y SALARIO');

  const createdIds = {
    companyTask: null,
    assignedTask: null,
    salaryConfig: null
  };

  // ==========================================
  // CATÁLOGO DE TAREAS DE LA EMPRESA
  // ==========================================
  log.info('Testing Catálogo de Tareas...');

  // CREATE Company Task
  await runTest('POST /companies/:companyId/tasks', async () => {
    const result = await apiRequest('POST', `/api/v1/companies/${companyId}/tasks`, {
      taskCode: 'TSK-001',
      taskName: 'Revisión de Documentación',
      taskCategory: 'administrativa',
      taskType: 'recurrente',
      taskDescription: 'Revisión mensual de documentación del personal',
      estimatedHours: 4,
      priorityDefault: 'media',
      requiresApproval: true,
      isTemplate: true
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.data.id) throw new Error('No se recibió ID de tarea creada');

    createdIds.companyTask = result.data.data.id;
    log.info(`Tarea de empresa creada con ID: ${createdIds.companyTask}`);
  });

  // GET Company Tasks (List)
  await runTest('GET /companies/:companyId/tasks', async () => {
    const result = await apiRequest('GET', `/api/v1/companies/${companyId}/tasks`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!Array.isArray(result.data.data)) throw new Error('No se recibió array de tareas');
  });

  // GET Company Task (Single)
  await runTest('GET /companies/:companyId/tasks/:taskId', async () => {
    const result = await apiRequest('GET', `/api/v1/companies/${companyId}/tasks/${createdIds.companyTask}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (result.data.data.taskCode !== 'TSK-001') throw new Error('Código de tarea no coincide');
  });

  // UPDATE Company Task
  await runTest('PUT /companies/:companyId/tasks/:taskId', async () => {
    const result = await apiRequest('PUT', `/api/v1/companies/${companyId}/tasks/${createdIds.companyTask}`, {
      estimatedHours: 6,
      priorityDefault: 'alta'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });

  // ==========================================
  // TAREAS ASIGNADAS A USUARIOS
  // ==========================================
  log.info('Testing Tareas Asignadas...');

  // CREATE Assigned Task
  await runTest('POST /users/:userId/assigned-tasks', async () => {
    const result = await apiRequest('POST', `/api/v1/users/${testUserId}/assigned-tasks`, {
      taskId: createdIds.companyTask,
      dueDate: '2025-02-28',
      priority: 'alta',
      status: 'pendiente',
      requiresApproval: true,
      notes: 'Tarea asignada para febrero'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.data.id) throw new Error('No se recibió ID de tarea asignada');

    createdIds.assignedTask = result.data.data.id;
    log.info(`Tarea asignada creada con ID: ${createdIds.assignedTask}`);
  });

  // GET Assigned Tasks (List)
  await runTest('GET /users/:userId/assigned-tasks', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/assigned-tasks`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!Array.isArray(result.data.data)) throw new Error('No se recibió array de tareas asignadas');
  });

  // GET Assigned Task (Single)
  await runTest('GET /users/:userId/assigned-tasks/:taskId', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/assigned-tasks/${createdIds.assignedTask}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });

  // UPDATE Assigned Task
  await runTest('PUT /users/:userId/assigned-tasks/:taskId', async () => {
    const result = await apiRequest('PUT', `/api/v1/users/${testUserId}/assigned-tasks/${createdIds.assignedTask}`, {
      status: 'en_progreso',
      progressPercentage: 50,
      notes: 'Avanzando con la tarea'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });

  // ==========================================
  // CONFIGURACIÓN SALARIAL
  // ==========================================
  log.info('Testing Configuración Salarial...');

  // Cleanup: Eliminar configuración existente si la hay
  try {
    const deleteResult = await apiRequest('DELETE', `/api/v1/users/${testUserId}/salary-config`);
    if (deleteResult.success) {
      log.info('✅ Config salarial previa eliminada para limpieza');
      // Esperar un momento para que se complete la transacción
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    log.info('No hay config salarial previa (esperado en primera ejecución)');
  }

  // CREATE Salary Config
  await runTest('POST /users/:userId/salary-config', async () => {
    const result = await apiRequest('POST', `/api/v1/users/${testUserId}/salary-config`, {
      baseSalary: 500000,
      salaryCurrency: 'ARS',
      salaryType: 'mensual',
      paymentFrequency: 'mensual',
      paymentDay: 5,
      bankName: 'Banco Galicia',
      bankAccountNumber: '1234567890',
      bankAccountType: 'caja_ahorro',
      cbu: '0070999930000012345678',
      paymentMethod: 'transferencia',
      hasObraSocial: true,
      obraSocialDeduction: 3,
      overtimeEnabled: true,
      vacationDaysPerYear: 14,
      sacEnabled: true
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.data.id) throw new Error('No se recibió ID de config salarial creada');

    createdIds.salaryConfig = result.data.data.id;
    log.info(`Config salarial creada con ID: ${createdIds.salaryConfig}`);
  });

  // GET Salary Config
  await runTest('GET /users/:userId/salary-config', async () => {
    const result = await apiRequest('GET', `/api/v1/users/${testUserId}/salary-config`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.data) throw new Error('No se recibió configuración salarial');
    // DECIMAL columns return strings, convert to number for comparison
    if (parseFloat(result.data.data.baseSalary) !== 500000) throw new Error('Salario base no coincide');
  });

  // UPDATE Salary Config
  await runTest('PUT /users/:userId/salary-config', async () => {
    const result = await apiRequest('PUT', `/api/v1/users/${testUserId}/salary-config`, {
      baseSalary: 550000,
      salaryIncreaseNotes: 'Aumento del 10% por revisión anual'
    });

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (result.data.data.baseSalary !== 550000) throw new Error('Salario no se actualizó');
  });

  // DELETE Salary Config
  await runTest('DELETE /users/:userId/salary-config', async () => {
    const result = await apiRequest('DELETE', `/api/v1/users/${testUserId}/salary-config`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });

  // Cleanup: DELETE Company Task
  await runTest('DELETE /companies/:companyId/tasks/:taskId', async () => {
    const result = await apiRequest('DELETE', `/api/v1/companies/${companyId}/tasks/${createdIds.companyTask}`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });
}

/**
 * Paso 5: Test Sistema de Upload
 */
async function testUploadSystem() {
  log.section('PASO 5: TESTING SISTEMA DE UPLOAD');

  let uploadedFilename = '';

  // Test upload de imagen de ejemplo
  await runTest('POST /upload/single', async () => {
    const sampleImagePath = path.join(__dirname, 'test-assets', 'sample-images', 'licencia-conducir-ejemplo.jpg');

    if (!fs.existsSync(sampleImagePath)) {
      throw new Error('Archivo de ejemplo no encontrado. Ejecuta generate-sample-images.js primero');
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(sampleImagePath));

    const result = await apiRequest('POST', '/api/v1/upload/single', form, true);

    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (!result.data.file) throw new Error('No se recibió información del archivo subido');

    uploadedFilename = result.data.file.filename;
    log.info(`Archivo subido: ${uploadedFilename}`);
  });

  // Test get file info
  await runTest('GET /upload/info/:filename', async () => {
    const result = await apiRequest('GET', `/api/v1/upload/info/${uploadedFilename}?directory=general`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });

  // Test delete file
  await runTest('DELETE /upload/:filename', async () => {
    const result = await apiRequest('DELETE', `/api/v1/upload/${uploadedFilename}?directory=general`);

    if (!result.success) throw new Error(JSON.stringify(result.error));
  });
}

/**
 * Main: Ejecutar todos los tests
 */
async function main() {
  console.log(`\n${colors.bright}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}║  TESTING BACKEND TABs 2, 3, 8 - Sistema Asistencia Biométrico ║${colors.reset}`);
  console.log(`${colors.bright}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const startTime = Date.now();

  // Autenticar
  const authenticated = await authenticate();
  if (!authenticated) {
    log.error('No se pudo autenticar. Abortando tests.');
    return;
  }

  // Ejecutar tests
  await testTab2();
  await testTab3();
  await testTab8();
  await testUploadSystem();

  // Resumen final
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  log.section('RESUMEN FINAL');
  console.log(`${colors.bright}Total de tests:${colors.reset} ${stats.total}`);
  console.log(`${colors.green}✅ Pasados:${colors.reset} ${stats.passed}`);
  console.log(`${colors.red}❌ Fallidos:${colors.reset} ${stats.failed}`);
  console.log(`${colors.blue}⏱️  Duración:${colors.reset} ${duration}s`);

  if (stats.failed > 0) {
    log.warn('\nErrores encontrados:');
    stats.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${colors.red}${err.test}${colors.reset}: ${err.error}`);
    });
  }

  const successRate = ((stats.passed / stats.total) * 100).toFixed(2);
  console.log(`\n${colors.bright}Tasa de éxito: ${successRate}%${colors.reset}\n`);

  if (stats.failed === 0) {
    log.success('🎉 TODOS LOS TESTS PASARON CORRECTAMENTE');
  } else {
    log.error(`⚠️  ${stats.failed} test(s) fallaron. Revisar logs arriba.`);
  }
}

// Ejecutar
main().catch(error => {
  log.error(`Error crítico: ${error.message}`);
  process.exit(1);
});
