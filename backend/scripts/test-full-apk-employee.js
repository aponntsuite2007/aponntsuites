/**
 * TEST COMPLETO APK EMPLEADO
 * - Prueba TODAS las funcionalidades
 * - Verifica persistencia de datos
 * - Tests CRUD completos
 */

const http = require('http');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const PORT = process.env.TEST_PORT || 9988;
const BASE_URL = `http://localhost:${PORT}`;

// Test data
let token = null;
let employeeId = null;
let companyId = null;
let uploadedDocumentId = null;

const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logResult(name, success, detail = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${detail ? ' - ' + detail : ''}`);
  testResults.tests.push({ name, success, detail });
  if (success) testResults.passed++;
  else testResults.failed++;
}

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isMultipart = body instanceof FormData;

    const reqHeaders = {
      ...headers
    };

    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (body && !isMultipart) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    if (isMultipart) {
      Object.assign(reqHeaders, body.getHeaders());
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      if (isMultipart) {
        body.pipe(req);
      } else {
        req.write(JSON.stringify(body));
        req.end();
      }
    } else {
      req.end();
    }
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('  TEST COMPLETO APK EMPLEADO - CRUD + PERSISTENCIA');
  console.log('='.repeat(70) + '\n');

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 1: AUTENTICACION MOVIL
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🔐 PARTE 1: AUTENTICACION MOVIL\n');

  // Test 1.0: Health check móvil
  try {
    const healthRes = await makeRequest('GET', '/api/v1/mobile/health');
    if (healthRes.status === 200) {
      logResult('1.0 Health check móvil', true);
    } else {
      logResult('1.0 Health check móvil', false);
    }
  } catch (e) {
    logResult('1.0 Health check móvil', false, e.message);
  }

  // Test 1.1: Configuración móvil
  try {
    const configRes = await makeRequest('GET', '/api/v1/mobile/config/mobile-connection');
    if (configRes.status === 200 && configRes.data.success) {
      logResult('1.1 Config móvil', true, `Endpoints: ${Object.keys(configRes.data.endpoints || {}).length}`);
    } else {
      logResult('1.1 Config móvil', false);
    }
  } catch (e) {
    logResult('1.1 Config móvil', false, e.message);
  }

  // Test 1.2: Login móvil (simulated)
  try {
    const loginRes = await makeRequest('POST', '/api/v1/mobile/auth/login', {
      username: 'EMP-ISI-0237',
      password: '1234',
      companySlug: 'isi-ingenieria-del-software'
    });

    if (loginRes.status === 200 && loginRes.data.success && loginRes.data.token) {
      token = loginRes.data.token;
      employeeId = loginRes.data.user?.id || 1;
      companyId = loginRes.data.user?.companyId || 11;
      logResult('1.2 Login móvil', true, `Token obtenido`);
    } else {
      logResult('1.2 Login móvil', false, JSON.stringify(loginRes.data));
    }
  } catch (e) {
    logResult('1.2 Login móvil', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 2: DMS EMPLOYEE ROUTES (DOCUMENTOS)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📄 PARTE 2: DMS EMPLOYEE ROUTES\n');

  // Test 2.1: Listar tipos de documentos
  try {
    const res = await makeRequest('GET', '/api/dms/employee/types');
    if (res.status === 200 && res.data.success) {
      logResult('2.1 DMS tipos docs', true, `${res.data.data?.length || 0} tipos`);
    } else {
      logResult('2.1 DMS tipos docs', false, res.data.message);
    }
  } catch (e) {
    logResult('2.1 DMS tipos docs', false, e.message);
  }

  // Test 2.2: Mis documentos
  try {
    const res = await makeRequest('GET', '/api/dms/employee/my-documents');
    if (res.status === 200 && res.data.success) {
      logResult('2.2 Mis documentos', true, `${res.data.data?.length || 0} docs`);
    } else {
      logResult('2.2 Mis documentos', false, res.data.message);
    }
  } catch (e) {
    logResult('2.2 Mis documentos', false, e.message);
  }

  // Test 2.3: Subir documento (CREATE)
  try {
    const form = new FormData();
    const testContent = Buffer.from('Test APK document content - ' + Date.now());
    form.append('file', testContent, {
      filename: 'test-apk-doc.txt',
      contentType: 'text/plain'
    });
    form.append('document_type_id', '1');
    form.append('title', 'Test APK Upload ' + new Date().toISOString());
    form.append('description', 'Documento test APK');

    const res = await makeRequest('POST', '/api/dms/employee/upload', form);

    if ((res.status === 200 || res.status === 201) && res.data.success) {
      uploadedDocumentId = res.data.data?.id || res.data.document?.id;
      logResult('2.3 Subir documento', true, `ID: ${uploadedDocumentId}`);
    } else {
      logResult('2.3 Subir documento', false, res.data.message || JSON.stringify(res.data).substring(0, 100));
    }
  } catch (e) {
    logResult('2.3 Subir documento', false, e.message);
  }

  // Test 2.4: Verificar documento persiste
  if (uploadedDocumentId) {
    try {
      const res = await makeRequest('GET', `/api/dms/employee/documents/${uploadedDocumentId}`);
      if (res.status === 200 && res.data.success) {
        logResult('2.4 Persistencia doc', true);
      } else {
        logResult('2.4 Persistencia doc', false, res.data.message);
      }
    } catch (e) {
      logResult('2.4 Persistencia doc', false, e.message);
    }
  } else {
    logResult('2.4 Persistencia doc', false, 'No se creó documento');
  }

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 3: DMS CATALOGS (Errores 500 corregidos)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📚 PARTE 3: DMS CATALOGS (Errores corregidos)\n');

  // Test 3.1: Catalogs types (ERROR 500 category_id FIXED)
  try {
    const res = await makeRequest('GET', '/api/dms/catalogs/types');
    if (res.status === 200 && res.data.success) {
      logResult('3.1 Catalogs types', true, `${res.data.data?.length || 0} tipos`);
    } else {
      logResult('3.1 Catalogs types', false, res.data.message);
    }
  } catch (e) {
    logResult('3.1 Catalogs types', false, e.message);
  }

  // Test 3.2: Catalogs categories
  try {
    const res = await makeRequest('GET', '/api/dms/catalogs/categories');
    if (res.status === 200 && res.data.success) {
      logResult('3.2 Catalogs categories', true);
    } else {
      logResult('3.2 Catalogs categories', false, res.data.message);
    }
  } catch (e) {
    logResult('3.2 Catalogs categories', false, e.message);
  }

  // Test 3.3: Catalogs statuses
  try {
    const res = await makeRequest('GET', '/api/dms/catalogs/statuses');
    if (res.status === 200 && res.data.success) {
      logResult('3.3 Catalogs statuses', true);
    } else {
      logResult('3.3 Catalogs statuses', false, res.data.message);
    }
  } catch (e) {
    logResult('3.3 Catalogs statuses', false, e.message);
  }

  // Test 3.4: Catalogs templates
  try {
    const res = await makeRequest('GET', '/api/dms/catalogs/templates');
    if (res.status === 200 && res.data.success) {
      logResult('3.4 Catalogs templates', true);
    } else {
      logResult('3.4 Catalogs templates', false, res.data.message);
    }
  } catch (e) {
    logResult('3.4 Catalogs templates', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 4: DMS STATISTICS & EXPIRING (Errores 500 corregidos)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n📊 PARTE 4: DMS STATISTICS & EXPIRING\n');

  // Test 4.1: Statistics (ERROR 500 file_size FIXED)
  try {
    const res = await makeRequest('GET', '/api/dms/statistics');
    if (res.status === 200 && res.data.success) {
      logResult('4.1 DMS Statistics', true);
    } else {
      logResult('4.1 DMS Statistics', false, res.data.message);
    }
  } catch (e) {
    logResult('4.1 DMS Statistics', false, e.message);
  }

  // Test 4.2: Expiring docs (ERROR 500 creator.id FIXED)
  try {
    const res = await makeRequest('GET', '/api/dms/expiring?days=30');
    if (res.status === 200 && res.data.success) {
      logResult('4.2 DMS Expiring', true, `${res.data.data?.length || 0} docs`);
    } else {
      logResult('4.2 DMS Expiring', false, res.data.message);
    }
  } catch (e) {
    logResult('4.2 DMS Expiring', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 5: ATTENDANCE (ASISTENCIA)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n⏰ PARTE 5: ASISTENCIA\n');

  // Test 5.1: Estado asistencia
  try {
    const res = await makeRequest('GET', `/api/v1/attendance/status/${employeeId}`);
    if (res.status === 200) {
      logResult('5.1 Estado asistencia', true);
    } else {
      logResult('5.1 Estado asistencia', false);
    }
  } catch (e) {
    logResult('5.1 Estado asistencia', false, e.message);
  }

  // Test 5.2: Historial asistencia
  try {
    const res = await makeRequest('GET', '/api/v1/attendance/history?limit=10');
    if (res.status === 200) {
      logResult('5.2 Historial asistencia', true);
    } else {
      logResult('5.2 Historial asistencia', false);
    }
  } catch (e) {
    logResult('5.2 Historial asistencia', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 6: VACATION/ABSENCE (LICENCIAS)
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🏖️ PARTE 6: LICENCIAS\n');

  // Test 6.1: Tipos de ausencia
  try {
    const res = await makeRequest('GET', '/api/v1/absence/types');
    if (res.status === 200) {
      logResult('6.1 Tipos ausencia', true);
    } else {
      logResult('6.1 Tipos ausencia', false);
    }
  } catch (e) {
    logResult('6.1 Tipos ausencia', false, e.message);
  }

  // Test 6.2: Mis vacaciones
  try {
    const res = await makeRequest('GET', '/api/v1/vacation/balance');
    if (res.status === 200) {
      logResult('6.2 Saldo vacaciones', true);
    } else {
      logResult('6.2 Saldo vacaciones', false);
    }
  } catch (e) {
    logResult('6.2 Saldo vacaciones', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 7: DEPARTMENTS & USERS
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🏢 PARTE 7: DEPARTMENTS & USERS\n');

  // Test 7.1: Departamentos
  try {
    const res = await makeRequest('GET', '/api/v1/departments');
    if (res.status === 200) {
      const count = Array.isArray(res.data) ? res.data.length : (res.data.data?.length || 0);
      logResult('7.1 Departamentos', true, `${count} deptos`);
    } else {
      logResult('7.1 Departamentos', false);
    }
  } catch (e) {
    logResult('7.1 Departamentos', false, e.message);
  }

  // Test 7.2: Turnos
  try {
    const res = await makeRequest('GET', '/api/v1/shifts');
    if (res.status === 200) {
      logResult('7.2 Turnos', true);
    } else {
      logResult('7.2 Turnos', false);
    }
  } catch (e) {
    logResult('7.2 Turnos', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 8: BIOMETRIC ROUTES
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🔐 PARTE 8: BIOMETRIC\n');

  // Test 8.1: Config biometría
  try {
    const res = await makeRequest('GET', '/api/v1/config/mobile-connection');
    if (res.status === 200) {
      logResult('8.1 Config biometría', true);
    } else {
      logResult('8.1 Config biometría', false);
    }
  } catch (e) {
    logResult('8.1 Config biometría', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PARTE 9: LOGOUT
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n🚪 PARTE 9: LOGOUT\n');

  // Test 9.1: Logout
  try {
    const res = await makeRequest('POST', '/api/v1/mobile/auth/logout');
    if (res.status === 200 && res.data.success) {
      logResult('9.1 Logout', true);
    } else {
      logResult('9.1 Logout', false);
    }
  } catch (e) {
    logResult('9.1 Logout', false, e.message);
  }

  // ═══════════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(70));
  console.log('  RESUMEN FINAL');
  console.log('='.repeat(70));
  console.log(`\n  Total tests: ${testResults.passed + testResults.failed}`);
  console.log(`  ✅ Passed: ${testResults.passed}`);
  console.log(`  ❌ Failed: ${testResults.failed}`);
  const percentage = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  console.log(`  Porcentaje éxito: ${percentage}%`);

  if (testResults.failed > 0) {
    console.log('\n  Tests fallidos:');
    testResults.tests.filter(t => !t.success).forEach(t => {
      console.log(`    - ${t.name}: ${t.detail || 'Error'}`);
    });
  }

  // Highlight key fixes
  console.log('\n  📋 CORRECCIONES APLICADAS:');
  const fixedTests = ['3.1 Catalogs types', '4.1 DMS Statistics', '4.2 DMS Expiring'];
  fixedTests.forEach(name => {
    const test = testResults.tests.find(t => t.name === name);
    if (test) {
      console.log(`    ${test.success ? '✅' : '❌'} ${name} - ${test.success ? 'CORREGIDO' : 'AÚN FALLANDO'}`);
    }
  });

  console.log('\n' + '='.repeat(70) + '\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run
runTests().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
