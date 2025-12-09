/**
 * TEST EMPLOYEE DMS FLOW
 * ======================
 * Simula el circuito de documentos para empleados:
 * 1. Obtener mis documentos
 * 2. Descargar un documento
 * 3. Subir nuevo documento (DNI)
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
    company_id: TEST_EMPLOYEE.company_id, // Algunos middlewares usan company_id
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

// Multipart form data para uploads
function httpMultipartRequest(path, fileBuffer, fileName, mimeType, additionalFields, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now();

    let body = '';

    // Agregar campos adicionales
    for (const [key, value] of Object.entries(additionalFields)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }

    // Agregar archivo
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: ${mimeType}\r\n\r\n`;

    const bodyStart = Buffer.from(body, 'utf8');
    const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const fullBody = Buffer.concat([bodyStart, fileBuffer, bodyEnd]);

    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
        'x-company-id': TEST_EMPLOYEE.company_id.toString(),
        'Authorization': `Bearer ${token}`
      }
    };

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
    req.write(fullBody);
    req.end();
  });
}

// ========== TESTS ==========

async function testDMSEndpoints(token) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST: ENDPOINTS DMS PARA EMPLEADOS');
  console.log('='.repeat(70));

  const endpoints = [
    // Rutas de empleado (requieren workflowService)
    { method: 'GET', path: '/api/dms/employee/pending', desc: 'DMS: Documentos pendientes' },
    { method: 'GET', path: '/api/dms/employee/my-documents', desc: 'DMS: Mis documentos' },
    { method: 'GET', path: '/api/dms/employee/expiring', desc: 'DMS: Docs por vencer' },

    // Rutas generales
    { method: 'GET', path: '/api/dms/documents', desc: 'DMS: Listar todos docs' },
    { method: 'GET', path: '/api/dms/health', desc: 'DMS: Health check' },
    { method: 'GET', path: '/api/dms/catalogs/categories', desc: 'DMS: Categorias' },
    { method: 'GET', path: '/api/dms/catalogs/types', desc: 'DMS: Tipos de documento' },
    { method: 'GET', path: '/api/dms/statistics', desc: 'DMS: Estadisticas' },
    { method: 'GET', path: '/api/dms/expiring?days=90', desc: 'DMS: Expirando en 90 dias' },
  ];

  const results = { working: [], notFound: [], errors: [] };

  for (const ep of endpoints) {
    const response = await httpRequest(ep.method, ep.path, null, token);
    const status = response.status;

    let icon;
    if (status === 200 || status === 201) {
      icon = 'OK';
      results.working.push({ ...ep, response: response.data });
    } else if (status === 404) {
      icon = '404';
      results.notFound.push(ep.desc);
    } else {
      icon = `ERR(${status})`;
      results.errors.push(`${ep.desc} (${status})`);
    }

    console.log(`[${icon}] ${ep.desc}`);
    console.log(`    ${ep.method} ${ep.path}`);

    if (status === 200 || status === 201) {
      const preview = JSON.stringify(response.data).substring(0, 150);
      console.log(`    ${preview}...`);
    } else if (response.data) {
      const preview = JSON.stringify(response.data).substring(0, 100);
      console.log(`    ${preview}`);
    }
    console.log('');
  }

  return results;
}

async function testGetMyDocuments(token) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST: OBTENER MIS DOCUMENTOS');
  console.log('='.repeat(70));

  // Probar multiples endpoints
  const endpoints = [
    '/api/dms/employee/my-documents',
    '/api/dms/documents?owner_id=' + TEST_EMPLOYEE.user_id,
    '/api/dms/documents'
  ];

  for (const path of endpoints) {
    console.log(`\nProbando: GET ${path}`);
    const response = await httpRequest('GET', path, null, token);
    console.log(`  Status: ${response.status}`);

    if (response.status === 200) {
      const docs = response.data.data || response.data.documents || [];
      console.log(`  Documentos encontrados: ${Array.isArray(docs) ? docs.length : 'N/A'}`);

      if (Array.isArray(docs) && docs.length > 0) {
        console.log('\n  Primeros documentos:');
        docs.slice(0, 3).forEach((doc, i) => {
          console.log(`    ${i + 1}. ID: ${doc.id}`);
          console.log(`       Titulo: ${doc.title || doc.name || 'Sin titulo'}`);
          console.log(`       Tipo: ${doc.document_type_id || doc.type || 'N/A'}`);
        });
        return { success: true, documents: docs };
      }
    } else {
      console.log(`  Error: ${JSON.stringify(response.data).substring(0, 200)}`);
    }
  }

  return { success: false, documents: [] };
}

async function testDownloadDocument(token, documentId) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST: DESCARGAR DOCUMENTO');
  console.log('='.repeat(70));

  if (!documentId) {
    console.log('  No hay documento para descargar (no se encontraron documentos)');
    return false;
  }

  console.log(`\n  Descargando documento ID: ${documentId}`);
  const response = await httpRequest('GET', `/api/dms/documents/${documentId}/download`, null, token);
  console.log(`  Status: ${response.status}`);

  if (response.status === 200) {
    console.log('  DESCARGA EXITOSA');
    console.log(`  Tamano respuesta: ${JSON.stringify(response.data).length} bytes`);
    return true;
  } else {
    console.log(`  Error: ${JSON.stringify(response.data).substring(0, 200)}`);
    return false;
  }
}

async function testUploadDocument(token) {
  console.log('\n' + '='.repeat(70));
  console.log('TEST: SUBIR NUEVO DOCUMENTO (DNI)');
  console.log('='.repeat(70));

  // Crear un PNG fake de 1x1 pixel
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // RGB, etc
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
    0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
    0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  const additionalFields = {
    title: `DNI Frente - ${TEST_EMPLOYEE.firstName} ${TEST_EMPLOYEE.lastName}`,
    description: 'Documento Nacional de Identidad - Frente - Subido desde APK Empleado',
    // Campos requeridos por BD dms_documents
    category_code: 'RRHH',
    type_code: 'RRHH_DNI',
    owner_type: 'employee',
    owner_id: TEST_EMPLOYEE.user_id,
    access_level: 'private',
    tags: JSON.stringify(['dni', 'personal', 'empleado']),
    metadata: JSON.stringify({
      uploaded_from: 'employee_app',
      employee_legajo: TEST_EMPLOYEE.legajo,
      upload_date: new Date().toISOString()
    })
  };

  console.log('\n  Subiendo DNI via multipart form...');
  console.log(`  Archivo: dni_frente_${TEST_EMPLOYEE.legajo}.png`);
  console.log(`  Tamano: ${pngBuffer.length} bytes`);

  try {
    const response = await httpMultipartRequest(
      '/api/dms/documents',
      pngBuffer,
      `dni_frente_${TEST_EMPLOYEE.legajo}.png`,
      'image/png',
      additionalFields,
      token
    );

    console.log(`\n  Status: ${response.status}`);

    if (response.status === 201 || response.status === 200) {
      console.log('  DOCUMENTO SUBIDO EXITOSAMENTE');
      console.log(`  Response: ${JSON.stringify(response.data).substring(0, 300)}`);
      return true;
    } else {
      console.log(`  Error: ${JSON.stringify(response.data).substring(0, 300)}`);
      return false;
    }
  } catch (error) {
    console.log(`  Error de conexion: ${error.message}`);
    return false;
  }
}

async function testMedicalCaseVerify(token) {
  console.log('\n' + '='.repeat(70));
  console.log('VERIFICACION: CASO MEDICO CREADO ANTERIORMENTE');
  console.log('='.repeat(70));

  const response = await httpRequest('GET', `/api/medical-cases/employee/${TEST_EMPLOYEE.user_id}`, null, token);
  console.log(`\n  GET /api/medical-cases/employee/${TEST_EMPLOYEE.user_id}`);
  console.log(`  Status: ${response.status}`);

  if (response.status === 200) {
    const cases = response.data.data || response.data || [];
    console.log(`  Casos encontrados: ${Array.isArray(cases) ? cases.length : 'N/A'}`);

    if (Array.isArray(cases) && cases.length > 0) {
      const lastCase = cases[0];
      console.log('\n  Ultimo caso medico:');
      console.log(`    ID: ${lastCase.id}`);
      console.log(`    Tipo: ${lastCase.absence_type}`);
      console.log(`    Fecha inicio: ${lastCase.start_date}`);
      console.log(`    Dias solicitados: ${lastCase.requested_days}`);
      console.log(`    Estado: ${lastCase.status}`);
      console.log(`    Razon: ${lastCase.reason?.substring(0, 50)}...`);
      return true;
    }
  }
  return false;
}

// ========== MAIN ==========

async function main() {
  console.log('TEST EMPLOYEE DMS FLOW');
  console.log('======================');
  console.log(`Servidor: ${SERVER_HOST}:${SERVER_PORT}`);
  console.log(`Empleado: ${TEST_EMPLOYEE.firstName} ${TEST_EMPLOYEE.lastName} (${TEST_EMPLOYEE.legajo})`);
  console.log(`Empresa: ISI (company_id: ${TEST_EMPLOYEE.company_id})`);

  // Generar token
  const token = generateEmployeeToken();
  console.log(`\nToken JWT generado correctamente`);

  try {
    // 1. Verificar caso medico anterior
    await testMedicalCaseVerify(token);

    // 2. Explorar endpoints DMS
    const dmsResults = await testDMSEndpoints(token);

    // 3. Obtener mis documentos
    const docsResult = await testGetMyDocuments(token);

    // 4. Descargar documento (si hay)
    let downloadOk = false;
    if (docsResult.success && docsResult.documents.length > 0) {
      downloadOk = await testDownloadDocument(token, docsResult.documents[0].id);
    }

    // 5. Subir nuevo documento
    const uploadOk = await testUploadDocument(token);

    // Resumen
    console.log('\n' + '='.repeat(70));
    console.log('RESUMEN FINAL');
    console.log('='.repeat(70));
    console.log(`\nEndpoints DMS funcionando: ${dmsResults.working.length}`);
    dmsResults.working.forEach(e => console.log(`   - ${e.desc}`));

    if (dmsResults.notFound.length > 0) {
      console.log(`\nEndpoints no encontrados: ${dmsResults.notFound.length}`);
      dmsResults.notFound.forEach(e => console.log(`   - ${e}`));
    }

    if (dmsResults.errors.length > 0) {
      console.log(`\nEndpoints con error: ${dmsResults.errors.length}`);
      dmsResults.errors.forEach(e => console.log(`   - ${e}`));
    }

    console.log('\n' + '-'.repeat(70));
    console.log(`Mis Documentos: ${docsResult.success ? 'OK (' + docsResult.documents.length + ' docs)' : 'Sin documentos'}`);
    console.log(`Descarga: ${downloadOk ? 'OK' : 'No probado (sin docs disponibles)'}`);
    console.log(`Subida DNI: ${uploadOk ? 'OK' : 'Pendiente configuracion'}`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\nError durante los tests:', error.message);
  }
}

main().catch(console.error);
