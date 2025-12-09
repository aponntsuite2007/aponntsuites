/**
 * TEST EMPLOYEE APP FLOW v2
 * =========================
 * Simula el circuito completo de la APK Empleado usando rutas correctas:
 * 1. Aviso de inasistencia por enfermedad (medical/cases)
 * 2. Descarga de documentacion (DMS)
 * 3. Subida de DNI nuevo (DMS)
 *
 * Fecha: 2025-12-08
 */

const http = require('http');
const jwt = require('jsonwebtoken');

// Configuracion
const SERVER_HOST = 'localhost';
const SERVER_PORT = process.env.PORT || 9998;
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_cambiar_en_produccion_2025';

// Empleado de prueba: Conchita Cruz Llamas de ISI
const TEST_EMPLOYEE = {
  user_id: '3cf6babe-5f90-489e-ae31-402feaa32390',
  email: 'conchita_cruzllamas48@isi.com.ar',
  firstName: 'Conchita',
  lastName: 'Cruz Llamas',
  legajo: 'EMP-ISI-0237',
  company_id: 11,
  role: 'employee'
};

// Generar token JWT para el empleado
function generateEmployeeToken() {
  const payload = {
    id: TEST_EMPLOYEE.user_id,
    email: TEST_EMPLOYEE.email,
    role: TEST_EMPLOYEE.role,
    companyId: TEST_EMPLOYEE.company_id,
    firstName: TEST_EMPLOYEE.firstName,
    lastName: TEST_EMPLOYEE.lastName
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Helper para hacer requests HTTP
function httpRequest(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': TEST_EMPLOYEE.company_id.toString(),
        'X-Employee-Mode': 'true'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// ========== TESTS ==========

async function testAllEndpoints(token) {
  console.log('\n' + '='.repeat(70));
  console.log('EXPLORANDO ENDPOINTS DISPONIBLES PARA EMPLEADO');
  console.log('='.repeat(70));

  const userId = TEST_EMPLOYEE.user_id;

  const endpoints = [
    // DMS - Sistema de Gestion Documental
    { method: 'GET', path: `/api/dms/employee/${userId}`, desc: 'DMS: Docs del empleado' },
    { method: 'GET', path: `/api/dms/employee/${userId}/dashboard`, desc: 'DMS: Dashboard del empleado' },
    { method: 'GET', path: `/api/dms/documents`, desc: 'DMS: Todos los docs' },

    // Procedimientos
    { method: 'GET', path: `/api/procedures/employee/my-procedures`, desc: 'Procedures: Mis procedimientos' },
    { method: 'GET', path: `/api/procedures/employee/my-pending`, desc: 'Procedures: Mis pendientes' },
    { method: 'GET', path: `/api/procedures/employee/my-summary`, desc: 'Procedures: Mi resumen' },

    // Medical
    { method: 'GET', path: `/api/medical-cases/employee/${userId}`, desc: 'Medical: Casos del empleado' },
    { method: 'GET', path: `/api/medical-cases/employee/${userId}/medical-history`, desc: 'Medical: Historial medico' },
    { method: 'GET', path: `/api/medical-cases/employee/${userId}/360`, desc: 'Medical: Vista 360' },
    { method: 'GET', path: `/api/medical-records/employee/${userId}`, desc: 'Medical Records: Del empleado' },

    // HSE
    { method: 'GET', path: `/api/v1/hse/deliveries/employee/${userId}`, desc: 'HSE: Entregas EPP' },
    { method: 'GET', path: `/api/v1/hse/compliance/${userId}`, desc: 'HSE: Compliance' },

    // Legal
    { method: 'GET', path: `/api/v1/legal/employee/${userId}/legal-360`, desc: 'Legal: 360' },
    { method: 'GET', path: `/api/v1/legal/communications`, desc: 'Legal: Comunicaciones' },

    // Sanciones
    { method: 'GET', path: `/api/sanctions/employee/${userId}/disciplinary-history`, desc: 'Sanctions: Historial' },

    // Attendance
    { method: 'GET', path: `/api/attendance-analytics/employee/${userId}`, desc: 'Attendance: Analytics' },
    { method: 'GET', path: `/api/attendance-analytics/employee/${userId}/history`, desc: 'Attendance: Historial' },

    // Inbox/Notificaciones
    { method: 'GET', path: `/api/inbox/employee/${userId}`, desc: 'Inbox: Mensajes' },

    // Vacaciones
    { method: 'GET', path: `/api/vacations/employee/${userId}/balance`, desc: 'Vacaciones: Saldo' },
    { method: 'GET', path: `/api/vacations/requests`, desc: 'Vacaciones: Solicitudes' },

    // Permisos
    { method: 'GET', path: `/api/permissions`, desc: 'Permisos: Listar' },
    { method: 'GET', path: `/api/permissions/employee/${userId}`, desc: 'Permisos: Del empleado' },
  ];

  const results = {
    working: [],
    notFound: [],
    errors: []
  };

  for (const ep of endpoints) {
    const response = await httpRequest(ep.method, ep.path, null, token);
    const status = response.status;

    let icon;
    if (status === 200 || status === 201) {
      icon = '✅';
      results.working.push(ep.desc);
    } else if (status === 404) {
      icon = '❌';
      results.notFound.push(ep.desc);
    } else {
      icon = '⚠️';
      results.errors.push(`${ep.desc} (${status})`);
    }

    console.log(`${icon} ${ep.desc}`);
    console.log(`   ${ep.method} ${ep.path} -> ${status}`);

    if (status === 200 || status === 201) {
      const preview = JSON.stringify(response.data).substring(0, 150);
      console.log(`   ${preview}...`);
    } else if (status !== 404) {
      console.log(`   ${JSON.stringify(response.data).substring(0, 100)}`);
    }
    console.log('');
  }

  return results;
}

async function testAvisoEnfermedad(token) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST: CREAR AVISO DE INASISTENCIA POR ENFERMEDAD');
  console.log('='.repeat(70));

  // Probar crear un caso medico (licencia por enfermedad)
  // Valores validos de absence_type: 'medical_illness', 'work_accident', 'non_work_accident',
  // 'occupational_disease', 'maternity', 'family_care', 'authorized_leave', 'unauthorized'
  const endpoints = [
    { method: 'POST', path: '/api/medical-cases', data: {
      employee_id: TEST_EMPLOYEE.user_id,
      absence_type: 'medical_illness',  // <-- valor valido del constraint
      start_date: new Date().toISOString().split('T')[0],
      requested_days: 1,
      reason: 'Gripe - fiebre 38.5, dolor de cabeza, congestion nasal. Aviso desde app empleado.',
      notes: 'Me encuentro con sintomas de gripe. No podre asistir al trabajo. Adjuntare certificado medico.',
      source: 'employee_app',
      status: 'pending'
    }},
    { method: 'POST', path: '/api/inbox/employee-notification', data: {
      employee_id: TEST_EMPLOYEE.user_id,
      category: 'attendance',  // categoria valida para inbox
      date: new Date().toISOString().split('T')[0],
      type: 'absence_notification',
      title: 'Aviso de Inasistencia por Enfermedad',
      message: 'Me encuentro enfermo/a con gripe. No podre asistir al trabajo el dia de hoy. Adjuntare certificado medico cuando lo tenga.',
      priority: 'high'
    }}
  ];

  let success = false;
  for (const ep of endpoints) {
    console.log(`\nProbando: POST ${ep.path}`);
    const response = await httpRequest(ep.method, ep.path, ep.data, token);
    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(response.data).substring(0, 300)}`);

    if (response.status >= 200 && response.status < 300) {
      console.log('\n  ✅ AVISO ENVIADO EXITOSAMENTE');
      success = true;
      break;
    }
  }

  return success;
}

async function testDMS(token) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST: SISTEMA DMS - DOCUMENTOS');
  console.log('='.repeat(70));

  const userId = TEST_EMPLOYEE.user_id;

  // 1. Ver documentos del empleado
  console.log('\n1. Obteniendo documentos del empleado...');
  const docsResponse = await httpRequest('GET', `/api/dms/employee/${userId}`, null, token);
  console.log(`   GET /api/dms/employee/${userId}: ${docsResponse.status}`);

  if (docsResponse.status === 200) {
    console.log(`   Documentos: ${JSON.stringify(docsResponse.data).substring(0, 300)}`);

    // Si hay docs, intentar descargar uno
    const docs = docsResponse.data.documents || docsResponse.data.data || docsResponse.data || [];
    if (Array.isArray(docs) && docs.length > 0) {
      console.log(`\n2. Intentando descargar documento: ${docs[0].name || docs[0].id}`);
      const downloadResp = await httpRequest('GET', `/api/dms/documents/${docs[0].id}/download`, null, token);
      console.log(`   Status: ${downloadResp.status}`);
    }
  }

  // 2. Subir documento
  console.log('\n3. Subiendo nuevo documento (DNI)...');

  const uploadEndpoints = [
    `/api/dms/employee/${userId}/upload`,
    `/api/dms/documents`,
    `/api/dms/upload`
  ];

  const fakeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  for (const endpoint of uploadEndpoints) {
    console.log(`   POST ${endpoint}`);
    const uploadResp = await httpRequest('POST', endpoint, {
      // Campos requeridos por DMS: category_code, type_code, title
      category_code: 'PERSONAL',
      type_code: 'DNI',
      title: 'DNI Frente - Conchita Cruz Llamas',
      description: 'Documento Nacional de Identidad - Frente - Actualizado',
      file_data: fakeBase64,
      file_name: 'dni_frente.png',
      mime_type: 'image/png',
      employee_id: userId,
      entity_type: 'employee',
      entity_id: userId,
      expiration_date: '2030-12-31'
    }, token);
    console.log(`   Status: ${uploadResp.status}`);

    if (uploadResp.status !== 404) {
      console.log(`   Response: ${JSON.stringify(uploadResp.data).substring(0, 200)}`);
      if (uploadResp.status >= 200 && uploadResp.status < 300) {
        console.log('\n   ✅ DOCUMENTO SUBIDO EXITOSAMENTE');
        return true;
      }
      break;
    }
  }

  return false;
}

// ========== MAIN ==========

async function main() {
  console.log('🚀 TEST EMPLOYEE APP FLOW v2');
  console.log('============================');
  console.log(`Servidor: ${SERVER_HOST}:${SERVER_PORT}`);
  console.log(`Empleado: ${TEST_EMPLOYEE.firstName} ${TEST_EMPLOYEE.lastName} (${TEST_EMPLOYEE.legajo})`);
  console.log(`Empresa: ISI (company_id: ${TEST_EMPLOYEE.company_id})`);

  // Generar token
  const token = generateEmployeeToken();
  console.log(`\n🔑 Token JWT generado correctamente`);

  try {
    // Explorar todos los endpoints
    const results = await testAllEndpoints(token);

    // Test aviso enfermedad
    const avisoOk = await testAvisoEnfermedad(token);

    // Test DMS
    const dmsOk = await testDMS(token);

    // Resumen
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(70));
    console.log(`\n✅ ENDPOINTS FUNCIONANDO: ${results.working.length}`);
    results.working.forEach(e => console.log(`   - ${e}`));

    console.log(`\n❌ ENDPOINTS NO ENCONTRADOS: ${results.notFound.length}`);
    results.notFound.slice(0, 5).forEach(e => console.log(`   - ${e}`));

    console.log(`\n⚠️ ENDPOINTS CON ERROR: ${results.errors.length}`);
    results.errors.forEach(e => console.log(`   - ${e}`));

    console.log('\n' + '-'.repeat(70));
    console.log(`Aviso Enfermedad: ${avisoOk ? '✅ OK' : '⚠️ Pendiente implementacion'}`);
    console.log(`DMS Documentos: ${dmsOk ? '✅ OK' : '⚠️ Pendiente implementacion'}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Error durante los tests:', error.message);
  }
}

main().catch(console.error);
