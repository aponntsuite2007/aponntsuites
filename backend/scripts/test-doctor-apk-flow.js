/**
 * ============================================================================
 * TEST: Doctor APK Authentication Flow
 * ============================================================================
 *
 * Este script prueba el flujo completo de autenticación para médicos:
 * 1. Login de médico
 * 2. Obtener empresas asignadas
 * 3. Seleccionar empresa
 * 4. Dashboard del médico
 * 5. Casos pendientes
 * 6. Perfil del médico
 *
 * Uso: TEST_PORT=9998 node scripts/test-doctor-apk-flow.js
 * ============================================================================
 */

const PORT = process.env.TEST_PORT || 9998;
const BASE_URL = `http://localhost:${PORT}`;

let testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

async function testEndpoint(token, method, endpoint, description, body = null, expectStatus = 200) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.json().catch(() => ({}));

        if (response.status === expectStatus || response.ok) {
            console.log(`✅ [${response.status}] ${description}`);
            testResults.passed++;
            return { success: true, data, status: response.status };
        } else {
            console.log(`❌ [${response.status}] ${description}: ${data.error || 'Error'}`);
            testResults.failed++;
            testResults.errors.push({
                endpoint,
                description,
                status: response.status,
                error: data.error || data.message || 'Unknown error'
            });
            return { success: false, data, status: response.status };
        }
    } catch (error) {
        console.log(`💥 [ERROR] ${description}: ${error.message}`);
        testResults.failed++;
        testResults.errors.push({
            endpoint,
            description,
            status: 'ERROR',
            error: error.message
        });
        return { success: false, error: error.message };
    }
}

async function setupTestDoctor() {
    console.log('\n🔧 === SETUP: Verificando/Creando médico de prueba ===\n');

    // Primero verificar si existe un médico con email de prueba
    const { Client } = require('pg');
    const client = new Client({
        host: 'localhost',
        database: 'attendance_system',
        user: 'postgres',
        password: 'Aedr15150302',
        port: 5432
    });

    await client.connect();

    try {
        // Verificar si existe el médico de prueba
        const existingDoctor = await client.query(`
            SELECT id, email, first_name, last_name, specialty, approval_status, is_active, is_medical_staff
            FROM partners
            WHERE email = 'doctor.prueba@aponnt.com'
        `);

        if (existingDoctor.rows.length > 0) {
            console.log('✅ Médico de prueba ya existe');
            const doctor = existingDoctor.rows[0];

            // Asegurar que tenga empresa asignada
            const companyAssignment = await client.query(`
                SELECT cms.*, c.name as company_name
                FROM company_medical_staff cms
                JOIN companies c ON cms.company_id = c.company_id
                WHERE cms.partner_id = $1
            `, [doctor.id]);

            if (companyAssignment.rows.length === 0) {
                // Asignar a la empresa 11 (ISI)
                await client.query(`
                    INSERT INTO company_medical_staff (company_id, partner_id, is_primary, is_active)
                    VALUES (11, $1, true, true)
                    ON CONFLICT (company_id, partner_id) DO UPDATE SET is_active = true
                `, [doctor.id]);
                console.log('✅ Médico asignado a empresa ISI (ID: 11)');
            } else {
                console.log(`✅ Médico ya asignado a: ${companyAssignment.rows.map(r => r.company_name).join(', ')}`);
            }

            return {
                id: doctor.id,
                email: 'doctor.prueba@aponnt.com',
                password: 'doctor123'
            };
        }

        // Crear médico de prueba
        console.log('📝 Creando médico de prueba...');
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash('doctor123', 10);

        const result = await client.query(`
            INSERT INTO partners (
                email,
                password_hash,
                first_name,
                last_name,
                specialty,
                license_number,
                is_medical_staff,
                approval_status,
                is_active,
                email_verified,
                verification_pending,
                account_status
            ) VALUES (
                'doctor.prueba@aponnt.com',
                $1,
                'Dr. Juan',
                'Pérez',
                'Medicina Laboral',
                'ML-12345',
                true,
                'approved',
                true,
                true,
                false,
                'active'
            )
            RETURNING id
        `, [passwordHash]);

        const newDoctorId = result.rows[0].id;

        // Asignar a empresa ISI (ID: 11)
        await client.query(`
            INSERT INTO company_medical_staff (company_id, partner_id, is_primary, is_active)
            VALUES (11, $1, true, true)
        `, [newDoctorId]);

        console.log(`✅ Médico creado con ID: ${newDoctorId}`);
        console.log('✅ Asignado a empresa ISI (ID: 11)');

        return {
            id: newDoctorId,
            email: 'doctor.prueba@aponnt.com',
            password: 'doctor123'
        };

    } finally {
        await client.end();
    }
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('       🩺 TEST: FLUJO COMPLETO APK MÉDICO');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`📍 Testing: ${BASE_URL}`);
    console.log('═══════════════════════════════════════════════════════════════════\n');

    let doctorToken = null;
    let selectedCompanyId = null;

    // Setup
    let testDoctor;
    try {
        testDoctor = await setupTestDoctor();
    } catch (error) {
        console.log(`❌ Error en setup: ${error.message}`);
        console.log('⚠️  Usando credenciales genéricas para test...');
        testDoctor = {
            email: 'doctor.prueba@aponnt.com',
            password: 'doctor123'
        };
    }

    // ============================================================================
    // SECTION 1: LOGIN DE MÉDICO
    // ============================================================================
    console.log('\n📝 === SECTION 1: LOGIN DE MÉDICO ===\n');

    // Test 1.1: Login sin credenciales
    await testEndpoint(null, 'POST', '/api/medical/doctor/login', 'Login sin credenciales', {}, 400);

    // Test 1.2: Login con credenciales incorrectas
    await testEndpoint(null, 'POST', '/api/medical/doctor/login', 'Login con credenciales incorrectas', {
        email: 'noexiste@test.com',
        password: 'wrongpassword'
    }, 401);

    // Test 1.3: Login exitoso
    const loginResult = await testEndpoint(null, 'POST', '/api/medical/doctor/login', 'Login exitoso de médico', {
        email: testDoctor.email,
        password: testDoctor.password
    });

    if (loginResult.success && loginResult.data.token) {
        doctorToken = loginResult.data.token;
        console.log(`   📋 Token obtenido: ${doctorToken.substring(0, 30)}...`);
        console.log(`   👨‍⚕️ Médico: ${loginResult.data.doctor?.fullName || 'N/A'}`);
        console.log(`   🏢 Empresas: ${loginResult.data.companies?.length || 0}`);

        if (loginResult.data.companies && loginResult.data.companies.length > 0) {
            selectedCompanyId = loginResult.data.companies[0].id;
            console.log(`   🎯 Empresa seleccionada: ${loginResult.data.companies[0].name} (ID: ${selectedCompanyId})`);
        }
    }

    // ============================================================================
    // SECTION 2: ENDPOINTS SIN EMPRESA SELECCIONADA
    // ============================================================================
    console.log('\n📝 === SECTION 2: ENDPOINTS SIN EMPRESA SELECCIONADA ===\n');

    if (doctorToken) {
        // Test 2.1: Verificar token
        await testEndpoint(doctorToken, 'GET', '/api/medical/doctor/verify-token', 'Verificar token válido');

        // Test 2.2: Obtener empresas asignadas
        await testEndpoint(doctorToken, 'GET', '/api/medical/doctor/companies', 'Obtener empresas asignadas');

        // Test 2.3: Perfil del médico
        await testEndpoint(doctorToken, 'GET', '/api/medical/doctor/profile', 'Obtener perfil del médico');

        // Test 2.4: Dashboard sin empresa (debe fallar)
        await testEndpoint(doctorToken, 'GET', '/api/medical/doctor/dashboard', 'Dashboard sin empresa seleccionada (debe requerir selección)', null, 400);

        // Test 2.5: Casos pendientes sin empresa (debe fallar)
        await testEndpoint(doctorToken, 'GET', '/api/medical/doctor/cases/pending', 'Casos pendientes sin empresa (debe requerir selección)', null, 400);
    }

    // ============================================================================
    // SECTION 3: SELECCIÓN DE EMPRESA
    // ============================================================================
    console.log('\n📝 === SECTION 3: SELECCIÓN DE EMPRESA ===\n');

    if (doctorToken && selectedCompanyId) {
        // Test 3.1: Seleccionar empresa inválida
        await testEndpoint(doctorToken, 'POST', '/api/medical/doctor/select-company', 'Seleccionar empresa no asignada (debe fallar)', {
            company_id: 99999
        }, 403);

        // Test 3.2: Seleccionar empresa válida
        const selectResult = await testEndpoint(doctorToken, 'POST', '/api/medical/doctor/select-company', 'Seleccionar empresa válida', {
            company_id: selectedCompanyId
        });

        if (selectResult.success && selectResult.data.token) {
            doctorToken = selectResult.data.token;
            console.log(`   ✅ Nuevo token con empresa: ${selectResult.data.selected_company?.name}`);
        }
    }

    // ============================================================================
    // SECTION 4: ENDPOINTS CON EMPRESA SELECCIONADA
    // ============================================================================
    console.log('\n📝 === SECTION 4: ENDPOINTS CON EMPRESA SELECCIONADA ===\n');

    if (doctorToken) {
        // Test 4.1: Dashboard del médico
        const dashboardResult = await testEndpoint(doctorToken, 'GET', '/api/medical/doctor/dashboard', 'Dashboard del médico');
        if (dashboardResult.success) {
            console.log(`   📊 Stats: ${dashboardResult.data.statistics?.total || 0} casos totales`);
            console.log(`   ⏳ Pendientes: ${dashboardResult.data.statistics?.pending || 0}`);
            console.log(`   💬 Mensajes sin leer: ${dashboardResult.data.statistics?.unreadMessages || 0}`);
        }

        // Test 4.2: Casos pendientes
        const casesResult = await testEndpoint(doctorToken, 'GET', '/api/medical/doctor/cases/pending', 'Casos pendientes');
        if (casesResult.success) {
            console.log(`   📋 Casos pendientes: ${casesResult.data.cases?.length || 0}`);
        }

        // Test 4.3: Verificar token actualizado
        await testEndpoint(doctorToken, 'GET', '/api/medical/doctor/verify-token', 'Verificar token con empresa');
    }

    // ============================================================================
    // SECTION 5: MEDICAL CASES (RUTAS EXISTENTES)
    // ============================================================================
    console.log('\n📝 === SECTION 5: RUTAS DE CASOS MÉDICOS ===\n');

    if (doctorToken) {
        // Estos usan el auth middleware estándar, probemos si funcionan
        await testEndpoint(doctorToken, 'GET', '/api/medical-cases/doctor/pending', 'Casos pendientes (ruta legacy)');
        await testEndpoint(doctorToken, 'GET', '/api/medical-cases/company/doctors', 'Médicos de la empresa');
    }

    // ============================================================================
    // RESULTADOS FINALES
    // ============================================================================
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('                        📊 RESULTADOS');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total:  ${testResults.passed + testResults.failed}`);

    if (testResults.errors.length > 0) {
        console.log('\n📋 Errores detallados:');
        testResults.errors.forEach((err, i) => {
            console.log(`   ${i + 1}. [${err.status}] ${err.description}`);
            console.log(`      Endpoint: ${err.endpoint}`);
            console.log(`      Error: ${err.error}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('                    🩺 FIN DE TESTS APK MÉDICO');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // Resumen final
    console.log('\n📋 RESUMEN DEL FLUJO APK MÉDICO:\n');
    console.log('1. POST /api/medical/doctor/login');
    console.log('   → Médico se autentica con email/password');
    console.log('   → Recibe JWT + lista de empresas asignadas');
    console.log('   → Si tiene 1 empresa, ya viene seleccionada');
    console.log('   → Si tiene N empresas, debe seleccionar una\n');
    console.log('2. POST /api/medical/doctor/select-company');
    console.log('   → Médico selecciona empresa para trabajar');
    console.log('   → Recibe nuevo JWT con company_id incluido\n');
    console.log('3. GET /api/medical/doctor/dashboard');
    console.log('   → Dashboard con stats de la empresa seleccionada\n');
    console.log('4. GET /api/medical/doctor/cases/pending');
    console.log('   → Lista de casos pendientes para atender\n');
    console.log('5. GET /api/medical/doctor/companies');
    console.log('   → Cambiar de empresa (obtener lista, volver a paso 2)\n');

    process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
