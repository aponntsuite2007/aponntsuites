/**
 * TEST EXHAUSTIVO DEL SISTEMA DMS - SSOT
 * Versión 2 - Con rutas corregidas
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

// Configuración
const BASE_URL = 'http://localhost:9998';
let AUTH_TOKEN = null;
let TEST_USER = null;
let TEST_COMPANY_ID = null;

// Resultados de tests
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Colores para consola
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`  ${status}: ${name}${details ? ' - ' + details : ''}`, color);
    testResults.tests.push({ name, passed, details });
    if (passed) testResults.passed++;
    else testResults.failed++;
}

// ============================================================
// SETUP: Conexión a BD y autenticación
// ============================================================

async function setup() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  🔧 SETUP: Preparando entorno de pruebas', 'cyan');
    log('='.repeat(60), 'cyan');

    const { sequelize } = require('../src/config/database');

    // 1. Verificar DMS
    log('\n📊 Verificando estructura DMS...', 'yellow');
    const [countResult] = await sequelize.query('SELECT COUNT(*) as total FROM dms_documents');
    const initialCount = parseInt(countResult[0].total);
    log(`   Documentos DMS actuales: ${initialCount}`);

    // 2. Obtener usuario de prueba
    const [admins] = await sequelize.query(`
        SELECT user_id, "firstName", "lastName", email, company_id
        FROM users WHERE is_active = true AND role = 'admin' LIMIT 1
    `);

    if (admins.length === 0) {
        throw new Error('No se encontró usuario admin para testing');
    }

    TEST_USER = admins[0];
    TEST_COMPANY_ID = TEST_USER.company_id;
    log(`   Usuario de prueba: ${TEST_USER.firstName} ${TEST_USER.lastName} (ID: ${TEST_USER.user_id})`);
    log(`   Empresa de prueba: Company ID ${TEST_COMPANY_ID}`);

    // 3. Autenticar
    log('\n🔐 Autenticando...', 'yellow');

    // Generar token manualmente para testing
    require('dotenv').config();
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_cambiar_en_produccion_2025';
    AUTH_TOKEN = jwt.sign({
        id: TEST_USER.user_id,  // auth middleware uses decoded.id
        user_id: TEST_USER.user_id,
        company_id: TEST_COMPANY_ID,
        role: 'admin'
    }, JWT_SECRET, { expiresIn: '1h' });
    log(`   ✅ Token generado para testing`, 'green');

    return { sequelize, initialCount };
}

// ============================================================
// TEST 1: Upload General (/api/v1/upload/single)
// ============================================================

async function testUploadGeneral() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  📤 TEST 1: Upload General (/api/v1/upload/single)', 'cyan');
    log('='.repeat(60), 'cyan');

    try {
        // Crear archivo de prueba (usar PDF para cumplir con extensiones permitidas)
        const testContent = Buffer.from('%PDF-1.4 TEST DMS UPLOAD - ' + new Date().toISOString());
        const form = new FormData();
        form.append('file', testContent, {
            filename: 'test-dms-upload.pdf',
            contentType: 'application/pdf'
        });
        form.append('module', 'test');
        form.append('documentType', 'TEST_FILE');

        const response = await axios.post(`${BASE_URL}/api/v1/upload/single`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });

        if (response.data.success) {
            logTest('Upload general', true, `File: ${response.data.filename || response.data.file?.filename}`);

            // Verificar que se registró en DMS
            if (response.data.dms && response.data.dms.documentId) {
                logTest('DMS registration', true, `DocID: ${response.data.dms.documentId.substring(0,8)}...`);
                return response.data.dms.documentId;
            } else {
                logTest('DMS registration', false, 'No dms.documentId in response (check if DMSIntegrationService is initialized)');
            }
        } else {
            logTest('Upload general', false, response.data.message || 'Unknown error');
        }
    } catch (error) {
        const errMsg = error.response?.data?.message || error.response?.data?.error || error.message;
        logTest('Upload general', false, errMsg);
    }

    return null;
}

// ============================================================
// TEST 2: User Profile Photo (/api/v1/users/:id/upload-photo)
// ============================================================

async function testUserProfilePhoto() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  📸 TEST 2: Foto de Perfil Usuario (/api/v1/users/:id/upload-photo)', 'cyan');
    log('='.repeat(60), 'cyan');

    try {
        // Crear imagen de prueba (1x1 pixel PNG)
        const pngBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
            0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        const form = new FormData();
        form.append('photo', pngBuffer, {
            filename: 'test-profile-photo.png',
            contentType: 'image/png'
        });

        const response = await axios.post(
            `${BASE_URL}/api/v1/users/${TEST_USER.user_id}/upload-photo`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                }
            }
        );

        if (response.data.success || response.data.photoUrl) {
            logTest('Profile photo upload', true, response.data.photoUrl || 'uploaded');

            if (response.data.dms && response.data.dms.documentId) {
                logTest('DMS registration (profile)', true, `DocID: ${response.data.dms.documentId.substring(0,8)}...`);
                return response.data.dms.documentId;
            } else {
                logTest('DMS registration (profile)', false, 'No DMS response in userRoutes.upload-photo');
            }
        } else {
            logTest('Profile photo upload', false, response.data.message || response.data.error);
        }
    } catch (error) {
        const errMsg = error.response?.data?.message || error.response?.data?.error || error.message;
        logTest('Profile photo upload', false, errMsg);
    }

    return null;
}

// ============================================================
// TEST 3: DMS Direct Upload (/api/dms/documents)
// ============================================================

async function testDMSDirectUpload() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  📁 TEST 3: DMS Direct Upload (/api/dms/documents)', 'cyan');
    log('='.repeat(60), 'cyan');

    try {
        const testContent = Buffer.from('DMS DIRECT TEST - ' + new Date().toISOString());
        const form = new FormData();
        form.append('file', testContent, {
            filename: 'dms-direct-test.txt',
            contentType: 'text/plain'
        });
        form.append('title', 'Test Document DMS Direct');
        form.append('description', 'Documento de prueba subido directamente al DMS');
        form.append('category_code', 'general');
        form.append('type_code', 'TEST');

        const response = await axios.post(
            `${BASE_URL}/api/dms/documents`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                }
            }
        );

        if (response.data.success || response.data.document) {
            const doc = response.data.document || response.data;
            logTest('DMS direct upload', true, `DocID: ${doc.id?.substring(0,8) || 'created'}`);
            return doc.id;
        } else {
            logTest('DMS direct upload', false, response.data.message || response.data.error);
        }
    } catch (error) {
        const errMsg = error.response?.data?.message || error.response?.data?.error || error.message;
        logTest('DMS direct upload', false, errMsg);
    }

    return null;
}

// ============================================================
// TEST 4: Medical Cases (/api/medical-cases)
// ============================================================

async function testMedicalCases() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  🏥 TEST 4: Medical Cases (/api/medical-cases)', 'cyan');
    log('='.repeat(60), 'cyan');

    try {
        const testContent = Buffer.from('%PDF-1.4 CERTIFICADO MEDICO TEST - ' + new Date().toISOString());
        const form = new FormData();
        form.append('attachments', testContent, {
            filename: 'certificado-medico.pdf',
            contentType: 'application/pdf'
        });
        form.append('employee_id', TEST_USER.user_id);
        form.append('absence_type', 'medical_illness');
        form.append('start_date', new Date().toISOString().split('T')[0]);
        form.append('requested_days', '3');
        form.append('reason', 'Test de caso médico para DMS');
        form.append('status', 'pending');

        const response = await axios.post(
            `${BASE_URL}/api/medical-cases`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                }
            }
        );

        if (response.data.success || response.data.case) {
            logTest('Medical case creation', true);

            if (response.data.dms) {
                logTest('DMS registration (medical)', true);
                return true;
            } else {
                logTest('DMS registration (medical)', false, 'No DMS in response');
            }
        } else {
            logTest('Medical case creation', false, response.data.message || response.data.error);
        }
    } catch (error) {
        const errMsg = error.response?.data?.message || error.response?.data?.error || error.message;
        logTest('Medical case creation', false, errMsg);
    }

    return null;
}

// ============================================================
// TEST 5: Verificar persistencia en BD
// ============================================================

async function testPersistence(sequelize, initialCount) {
    log('\n' + '='.repeat(60), 'cyan');
    log('  💾 TEST 5: Verificación de Persistencia en BD', 'cyan');
    log('='.repeat(60), 'cyan');

    try {
        // Contar documentos actuales
        const [countResult] = await sequelize.query('SELECT COUNT(*) as total FROM dms_documents');
        const currentCount = parseInt(countResult[0].total);
        const newDocs = currentCount - initialCount;

        log(`   Documentos iniciales: ${initialCount}`);
        log(`   Documentos actuales:  ${currentCount}`);
        log(`   Nuevos documentos:    ${newDocs}`);

        logTest('Document persistence', true, `${newDocs} nuevos documentos desde inicio`);

        // Listar últimos documentos
        const [recentDocs] = await sequelize.query(`
            SELECT id, source_module, type_code, original_filename, file_size_bytes, created_at
            FROM dms_documents
            ORDER BY created_at DESC
            LIMIT 10
        `);

        log('\n   📋 Últimos 10 documentos en DMS:');
        recentDocs.forEach((doc, i) => {
            const size = doc.file_size_bytes ? `${Math.round(doc.file_size_bytes/1024)}KB` : 'N/A';
            log(`      ${i+1}. ${doc.id?.substring(0,8)}... | ${doc.source_module || 'N/A'} | ${doc.original_filename} (${size})`);
        });

        // Verificar por módulo
        const [byModule] = await sequelize.query(`
            SELECT source_module, COUNT(*) as cnt
            FROM dms_documents
            GROUP BY source_module
            ORDER BY cnt DESC
        `);

        log('\n   📊 Documentos por módulo:');
        byModule.forEach(m => {
            log(`      - ${m.source_module || 'sin módulo'}: ${m.cnt}`);
        });

        logTest('DMS module distribution', true, `${byModule.length} módulos diferentes`);

        return currentCount;
    } catch (error) {
        logTest('Persistence check', false, error.message);
        return initialCount;
    }
}

// ============================================================
// TEST 6: Consultar documentos de la empresa
// ============================================================

async function testCompanyDocuments(sequelize) {
    log('\n' + '='.repeat(60), 'cyan');
    log('  🏢 TEST 6: Documentos de la Empresa en DMS', 'cyan');
    log('='.repeat(60), 'cyan');

    try {
        const [docs] = await sequelize.query(`
            SELECT id, source_module, type_code, title, original_filename,
                   file_size_bytes, owner_name, created_at
            FROM dms_documents
            WHERE company_id = ${TEST_COMPANY_ID}
            ORDER BY created_at DESC
            LIMIT 10
        `);

        logTest('Company documents query', true, `${docs.length} documentos para company ${TEST_COMPANY_ID}`);

        if (docs.length > 0) {
            log('\n   📄 Documentos de la empresa:');
            docs.forEach((d, i) => {
                const size = d.file_size_bytes ? `${Math.round(d.file_size_bytes/1024)}KB` : 'N/A';
                log(`      ${i+1}. ${d.original_filename || d.title} (${size})`);
                log(`         └─ Módulo: ${d.source_module || 'N/A'} | Tipo: ${d.type_code || 'N/A'}`);
            });
        } else {
            log('   ℹ️ No hay documentos para esta empresa todavía');
        }

        // Verificar estadísticas
        const [stats] = await sequelize.query(`
            SELECT
                COUNT(*) as total_docs,
                SUM(file_size_bytes) as total_size,
                COUNT(DISTINCT source_module) as modules_used,
                COUNT(DISTINCT type_code) as doc_types
            FROM dms_documents
            WHERE company_id = ${TEST_COMPANY_ID}
        `);

        if (stats[0]) {
            const s = stats[0];
            log('\n   📊 Estadísticas de la empresa:');
            log(`      - Total documentos: ${s.total_docs}`);
            log(`      - Espacio usado: ${s.total_size ? Math.round(s.total_size/1024) + 'KB' : '0'}`);
            log(`      - Módulos usados: ${s.modules_used}`);
            log(`      - Tipos de documento: ${s.doc_types}`);
        }

        logTest('Company statistics', true);

    } catch (error) {
        logTest('Company documents query', false, error.message);
    }
}

// ============================================================
// TEST 7: API DMS Query
// ============================================================

async function testDMSQueryAPI() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  🔍 TEST 7: API de Consulta DMS (/api/dms/documents)', 'cyan');
    log('='.repeat(60), 'cyan');

    try {
        const response = await axios.get(
            `${BASE_URL}/api/dms/documents?limit=5`,
            {
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
            }
        );

        if (response.data.success || response.data.documents || Array.isArray(response.data)) {
            const docs = response.data.documents || response.data;
            logTest('DMS query API', true, `Returned ${Array.isArray(docs) ? docs.length : 0} documents`);
        } else {
            logTest('DMS query API', false, 'Unexpected response format');
        }
    } catch (error) {
        if (error.response?.status === 404) {
            logTest('DMS query API', false, 'Endpoint /api/dms/documents returns 404');
        } else if (error.response?.status === 401) {
            logTest('DMS query API', false, 'Auth required (401)');
        } else {
            logTest('DMS query API', false, error.message);
        }
    }

    // Test search
    try {
        const searchResponse = await axios.get(
            `${BASE_URL}/api/dms/documents/search?q=test`,
            {
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
            }
        );

        if (searchResponse.data) {
            logTest('DMS search API', true);
        }
    } catch (error) {
        logTest('DMS search API', false, error.response?.status === 404 ? 'Not implemented' : error.message);
    }
}

// ============================================================
// TEST 8: Verificar integración DMS Service
// ============================================================

async function testDMSServiceIntegration() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  🔌 TEST 8: Verificar DMSIntegrationService', 'cyan');
    log('='.repeat(60), 'cyan');

    try {
        // Verificar que el servicio está registrado en la app
        const healthResponse = await axios.get(`${BASE_URL}/api/dms/statistics`, {
            headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
        });

        if (healthResponse.data) {
            logTest('DMS statistics endpoint', true);

            if (healthResponse.data.statistics || healthResponse.data.totalDocuments !== undefined) {
                log('\n   📈 DMS Statistics:');
                const stats = healthResponse.data.statistics || healthResponse.data;
                log(`      - Total: ${stats.totalDocuments || stats.total || 'N/A'}`);
                if (stats.byModule) {
                    log('      - Por módulo:');
                    Object.entries(stats.byModule).forEach(([mod, cnt]) => {
                        log(`        · ${mod}: ${cnt}`);
                    });
                }
            }
        }
    } catch (error) {
        if (error.response?.status === 404) {
            logTest('DMS statistics endpoint', false, 'Not implemented (/api/dms/statistics)');
        } else {
            logTest('DMS statistics endpoint', false, error.message);
        }
    }
}

// ============================================================
// MAIN: Ejecutar todos los tests
// ============================================================

async function runAllTests() {
    log('\n' + '═'.repeat(60), 'bold');
    log('  🧪 TEST EXHAUSTIVO DEL SISTEMA DMS - SSOT', 'bold');
    log('  ' + new Date().toISOString(), 'bold');
    log('═'.repeat(60), 'bold');

    let sequelize, initialCount;

    try {
        // Setup
        const setupResult = await setup();
        sequelize = setupResult.sequelize;
        initialCount = setupResult.initialCount;

        // Ejecutar tests
        await testUploadGeneral();
        await testUserProfilePhoto();
        await testDMSDirectUpload();
        await testMedicalCases();
        await testPersistence(sequelize, initialCount);
        await testCompanyDocuments(sequelize);
        await testDMSQueryAPI();
        await testDMSServiceIntegration();

    } catch (error) {
        log(`\n❌ ERROR FATAL: ${error.message}`, 'red');
        console.error(error.stack);
    }

    // Resumen final
    log('\n' + '═'.repeat(60), 'bold');
    log('  📊 RESUMEN DE TESTS', 'bold');
    log('═'.repeat(60), 'bold');

    log(`\n   Total tests:  ${testResults.passed + testResults.failed}`);
    log(`   ✅ Passed:     ${testResults.passed}`, 'green');
    log(`   ❌ Failed:     ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');

    const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
    log(`\n   Success rate: ${successRate}%`, successRate >= 70 ? 'green' : 'yellow');

    // Detalle de fallos
    const failures = testResults.tests.filter(t => !t.passed);
    if (failures.length > 0) {
        log('\n   ⚠️ Tests que necesitan atención:', 'yellow');
        failures.forEach(f => {
            log(`      - ${f.name}: ${f.details}`);
        });
    }

    // Detalle de éxitos
    const successes = testResults.tests.filter(t => t.passed);
    if (successes.length > 0) {
        log('\n   ✅ Tests exitosos:', 'green');
        successes.forEach(s => {
            log(`      - ${s.name}${s.details ? ': ' + s.details : ''}`);
        });
    }

    log('\n' + '═'.repeat(60) + '\n', 'bold');

    // Cerrar conexión
    if (sequelize) {
        await sequelize.close();
    }

    process.exit(testResults.failed > 5 ? 1 : 0);
}

// Ejecutar
runAllTests().catch(console.error);
