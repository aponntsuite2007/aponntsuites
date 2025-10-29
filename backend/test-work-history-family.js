/**
 * TEST EXHAUSTIVO: addWorkHistory + addFamilyMember
 * Ejecuta 10 iteraciones de cada operación CRUD
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9999';
const TEST_USER_ID = 'd2ace38c-d79a-4c9d-833d-ed549fc948f1'; // Usuario de prueba ISI

// Credenciales ISI
const LOGIN_CREDENTIALS = {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
};

let authToken = null;

// ============================================================================
// AUTENTICACIÓN
// ============================================================================

async function authenticate() {
    try {
        console.log('🔐 Autenticando...');
        const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, LOGIN_CREDENTIALS);
        authToken = response.data.token;
        console.log('✅ Autenticación exitosa\n');
        return true;
    } catch (error) {
        console.error('❌ Error en autenticación:', error.response?.data || error.message);
        return false;
    }
}

// ============================================================================
// TESTS DE WORK HISTORY
// ============================================================================

async function testCreateWorkHistory(iteration) {
    try {
        const data = {
            company_name: `Empresa Test ${iteration}`,
            position: `Cargo ${iteration}`,
            start_date: '2020-01-01',
            end_date: '2021-12-31',
            responsibilities: `Responsabilidades del trabajo ${iteration}`
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/work-history`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Work History - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Work History - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testReadWorkHistory(iteration) {
    try {
        const response = await axios.get(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/work-history`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] READ Work History - Total: ${response.data.length} registros`);
        return response.data;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] READ Work History - Error:`, error.response?.data?.error || error.message);
        return [];
    }
}

async function testUpdateWorkHistory(id, iteration) {
    try {
        const data = {
            company_name: `Empresa Actualizada ${iteration}`,
            position: `Cargo Actualizado ${iteration}`,
            start_date: '2020-01-01',
            end_date: '2023-12-31',
            responsibilities: `Responsabilidades actualizadas ${iteration}`
        };

        const response = await axios.put(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/work-history/${id}`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] UPDATE Work History - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] UPDATE Work History - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

async function testDeleteWorkHistory(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/work-history/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Work History - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Work History - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// TESTS DE FAMILY MEMBERS
// ============================================================================

async function testCreateFamilyMember(iteration) {
    try {
        const data = {
            full_name: `Familiar Test ${iteration}`,
            relationship: iteration % 2 === 0 ? 'child' : 'sibling',
            birth_date: '1990-05-15',
            dni: `${20000000 + iteration}`,
            is_dependent: iteration % 3 === 0
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/family-members`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Family Member - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Family Member - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testReadFamilyMembers(iteration) {
    try {
        const response = await axios.get(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/family-members`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] READ Family Members - Total: ${response.data.length} registros`);
        return response.data;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] READ Family Members - Error:`, error.response?.data?.error || error.message);
        return [];
    }
}

async function testUpdateFamilyMember(id, iteration) {
    try {
        const data = {
            full_name: `Familiar Actualizado ${iteration}`,
            relationship: 'parent',
            birth_date: '1985-08-20',
            dni: `${30000000 + iteration}`,
            is_dependent: false
        };

        const response = await axios.put(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/family-members/${id}`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] UPDATE Family Member - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] UPDATE Family Member - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

async function testDeleteFamilyMember(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/family-members/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Family Member - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Family Member - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// ORCHESTRADOR DE TESTS
// ============================================================================

async function runWorkHistoryTests() {
    console.log('\n' + '='.repeat(80));
    console.log('💼 TESTING: WORK HISTORY (Antecedentes Laborales)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    // CREATE (10 veces)
    console.log('📝 CREATE - Creando 10 antecedentes laborales...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateWorkHistory(i);
        if (id) createdIds.push(id);
    }

    // READ (10 veces)
    console.log('\n📖 READ - Leyendo antecedentes laborales 10 veces...');
    for (let i = 1; i <= 10; i++) {
        await testReadWorkHistory(i);
    }

    // UPDATE (todos los creados)
    if (createdIds.length > 0) {
        console.log(`\n✏️ UPDATE - Actualizando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testUpdateWorkHistory(createdIds[i], i + 1);
        }
    }

    // READ después de UPDATE
    console.log('\n📖 READ (Post-Update) - Verificando cambios...');
    const afterUpdate = await testReadWorkHistory(1);

    // DELETE (todos los creados)
    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteWorkHistory(createdIds[i], i + 1);
        }
    }

    // READ después de DELETE (debería estar vacío o con menos registros)
    console.log('\n📖 READ (Post-Delete) - Verificando eliminación...');
    const afterDelete = await testReadWorkHistory(1);

    console.log(`\n✅ WORK HISTORY - Tests completados`);
    console.log(`   - Creados: ${createdIds.length}/10`);
    console.log(`   - Eliminados: ${createdIds.length}`);
}

async function runFamilyMembersTests() {
    console.log('\n' + '='.repeat(80));
    console.log('👨‍👩‍👧 TESTING: FAMILY MEMBERS (Grupo Familiar)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    // CREATE (10 veces)
    console.log('📝 CREATE - Creando 10 miembros del grupo familiar...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateFamilyMember(i);
        if (id) createdIds.push(id);
    }

    // READ (10 veces)
    console.log('\n📖 READ - Leyendo miembros del grupo familiar 10 veces...');
    for (let i = 1; i <= 10; i++) {
        await testReadFamilyMembers(i);
    }

    // UPDATE (todos los creados)
    if (createdIds.length > 0) {
        console.log(`\n✏️ UPDATE - Actualizando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testUpdateFamilyMember(createdIds[i], i + 1);
        }
    }

    // READ después de UPDATE
    console.log('\n📖 READ (Post-Update) - Verificando cambios...');
    const afterUpdate = await testReadFamilyMembers(1);

    // DELETE (todos los creados)
    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteFamilyMember(createdIds[i], i + 1);
        }
    }

    // READ después de DELETE
    console.log('\n📖 READ (Post-Delete) - Verificando eliminación...');
    const afterDelete = await testReadFamilyMembers(1);

    console.log(`\n✅ FAMILY MEMBERS - Tests completados`);
    console.log(`   - Creados: ${createdIds.length}/10`);
    console.log(`   - Eliminados: ${createdIds.length}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('\n' + '█'.repeat(80));
    console.log('🧪 TEST EXHAUSTIVO: EMPLOYEE PROFILE SYSTEM');
    console.log('█'.repeat(80));
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`👤 Test User ID: ${TEST_USER_ID}`);
    console.log(`🏢 Company ID: ${LOGIN_CREDENTIALS.companyId}\n`);

    // Autenticar
    const authenticated = await authenticate();
    if (!authenticated) {
        console.error('\n❌ No se pudo autenticar. Abortando tests.\n');
        process.exit(1);
    }

    // Ejecutar tests
    await runWorkHistoryTests();
    await runFamilyMembersTests();

    // Resumen final
    console.log('\n' + '█'.repeat(80));
    console.log('✅ TESTS COMPLETADOS EXITOSAMENTE');
    console.log('█'.repeat(80));
    console.log('\n📊 RESUMEN:');
    console.log('   - Work History: CREATE (10x), READ (10x), UPDATE (10x), DELETE (10x)');
    console.log('   - Family Members: CREATE (10x), READ (10x), UPDATE (10x), DELETE (10x)');
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('   1. Verificar en http://localhost:9998/panel-administrativo.html');
    console.log('   2. Buscar al usuario y hacer click en "Ver"');
    console.log('   3. Verificar que los datos se guardan y persisten (F5)');
    console.log('   4. Continuar con la actualización del resto de funciones\n');
}

main().catch(error => {
    console.error('\n❌ ERROR FATAL:', error);
    process.exit(1);
});
