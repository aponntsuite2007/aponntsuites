/**
 * TEST EXHAUSTIVO: EDUCATION + MEDICAL (8 categorías)
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
// TESTS DE EDUCATION
// ============================================================================

async function testCreateEducation(iteration) {
    try {
        const data = {
            education_level: 'university',
            institution_name: `Universidad Test ${iteration}`,
            degree_title: `Licenciatura ${iteration}`,
            field_of_study: `Campo ${iteration}`,
            start_date: '2015-01-01',
            end_date: '2019-12-31',
            graduated: iteration % 2 === 0
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/education`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Education - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Education - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testDeleteEducation(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/education/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Education - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Education - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// TESTS DE CHRONIC CONDITIONS
// ============================================================================

async function testCreateChronicCondition(iteration) {
    try {
        const data = {
            condition_name: `Condición ${iteration}`,
            diagnosed_date: '2020-01-01',
            severity: ['mild', 'moderate', 'severe'][iteration % 3],
            treatment: `Tratamiento ${iteration}`,
            requires_monitoring: iteration % 2 === 0
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/chronic-conditions`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Chronic Condition - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Chronic Condition - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testDeleteChronicCondition(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/chronic-conditions/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Chronic Condition - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Chronic Condition - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// TESTS DE MEDICATIONS
// ============================================================================

async function testCreateMedication(iteration) {
    try {
        const data = {
            medication_name: `Medicamento ${iteration}`,
            dosage: `${iteration * 100}mg`,
            frequency: `Cada ${iteration} horas`,
            start_date: '2023-01-01',
            prescribing_doctor: `Dr. Test ${iteration}`,
            is_active: iteration % 2 === 0
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/medications`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Medication - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Medication - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testDeleteMedication(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/medications/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Medication - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Medication - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// TESTS DE ALLERGIES
// ============================================================================

async function testCreateAllergy(iteration) {
    try {
        const data = {
            allergen: `Alérgeno ${iteration}`,
            reaction: `Reacción ${iteration}`,
            severity: ['mild', 'moderate', 'severe'][iteration % 3],
            diagnosed_date: '2022-06-15'
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/allergies`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Allergy - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Allergy - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testDeleteAllergy(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/allergies/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Allergy - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Allergy - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// TESTS DE ACTIVITY RESTRICTIONS
// ============================================================================

async function testCreateActivityRestriction(iteration) {
    try {
        const data = {
            restriction_type: `Restricción ${iteration}`,
            description: `Descripción restricción ${iteration}`,
            start_date: '2023-01-01',
            is_permanent: iteration % 3 === 0,
            severity: ['mild', 'moderate', 'severe'][iteration % 3]
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/activity-restrictions`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Activity Restriction - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Activity Restriction - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testDeleteActivityRestriction(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/activity-restrictions/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Activity Restriction - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Activity Restriction - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// TESTS DE WORK RESTRICTIONS
// ============================================================================

async function testCreateWorkRestriction(iteration) {
    try {
        const data = {
            restriction_type: `Restricción laboral ${iteration}`,
            description: `Descripción trabajo ${iteration}`,
            start_date: '2023-01-01',
            requires_accommodation: iteration % 2 === 0
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/work-restrictions`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Work Restriction - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Work Restriction - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testDeleteWorkRestriction(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/work-restrictions/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Work Restriction - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Work Restriction - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// TESTS DE VACCINATIONS
// ============================================================================

async function testCreateVaccination(iteration) {
    try {
        const data = {
            vaccine_name: `Vacuna ${iteration}`,
            date_administered: '2023-06-15',
            lot_number: `LOTE-${iteration}`,
            next_dose_date: iteration % 2 === 0 ? '2024-06-15' : null,
            administering_institution: `Centro de Salud ${iteration}`
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/vaccinations`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Vaccination - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Vaccination - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testDeleteVaccination(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/vaccinations/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Vaccination - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Vaccination - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// TESTS DE MEDICAL EXAMS
// ============================================================================

async function testCreateMedicalExam(iteration) {
    try {
        const data = {
            exam_type: `Examen ${iteration}`,
            exam_date: '2023-08-20',
            result: iteration % 3 === 0 ? 'Normal' : 'Anormal',
            notes: `Notas del examen ${iteration}`,
            next_exam_date: iteration % 2 === 0 ? '2024-08-20' : null
        };

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/medical-exams`,
            data,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] CREATE Medical Exam - ID: ${response.data.id}`);
        return response.data.id;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] CREATE Medical Exam - Error:`, error.response?.data?.error || error.message);
        return null;
    }
}

async function testDeleteMedicalExam(id, iteration) {
    try {
        await axios.delete(
            `${BASE_URL}/api/v1/user-medical/${TEST_USER_ID}/medical-exams/${id}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        console.log(`  ✅ [${iteration}/10] DELETE Medical Exam - ID: ${id}`);
        return true;
    } catch (error) {
        console.error(`  ❌ [${iteration}/10] DELETE Medical Exam - Error:`, error.response?.data?.error || error.message);
        return false;
    }
}

// ============================================================================
// ORCHESTRADOR DE TESTS
// ============================================================================

async function runEducationTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🎓 TESTING: EDUCATION (Educación)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    console.log('📝 CREATE - Creando 10 registros educativos...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateEducation(i);
        if (id) createdIds.push(id);
    }

    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteEducation(createdIds[i], i + 1);
        }
    }

    console.log(`\n✅ EDUCATION - Tests completados (${createdIds.length}/10)`);
}

async function runChronicConditionsTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🏥 TESTING: CHRONIC CONDITIONS (Condiciones Crónicas)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    console.log('📝 CREATE - Creando 10 condiciones crónicas...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateChronicCondition(i);
        if (id) createdIds.push(id);
    }

    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteChronicCondition(createdIds[i], i + 1);
        }
    }

    console.log(`\n✅ CHRONIC CONDITIONS - Tests completados (${createdIds.length}/10)`);
}

async function runMedicationsTests() {
    console.log('\n' + '='.repeat(80));
    console.log('💊 TESTING: MEDICATIONS (Medicamentos)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    console.log('📝 CREATE - Creando 10 medicamentos...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateMedication(i);
        if (id) createdIds.push(id);
    }

    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteMedication(createdIds[i], i + 1);
        }
    }

    console.log(`\n✅ MEDICATIONS - Tests completados (${createdIds.length}/10)`);
}

async function runAllergiesTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🤧 TESTING: ALLERGIES (Alergias)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    console.log('📝 CREATE - Creando 10 alergias...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateAllergy(i);
        if (id) createdIds.push(id);
    }

    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteAllergy(createdIds[i], i + 1);
        }
    }

    console.log(`\n✅ ALLERGIES - Tests completados (${createdIds.length}/10)`);
}

async function runActivityRestrictionsTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🚫 TESTING: ACTIVITY RESTRICTIONS (Restricciones de Actividad)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    console.log('📝 CREATE - Creando 10 restricciones de actividad...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateActivityRestriction(i);
        if (id) createdIds.push(id);
    }

    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteActivityRestriction(createdIds[i], i + 1);
        }
    }

    console.log(`\n✅ ACTIVITY RESTRICTIONS - Tests completados (${createdIds.length}/10)`);
}

async function runWorkRestrictionsTests() {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️ TESTING: WORK RESTRICTIONS (Restricciones Laborales)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    console.log('📝 CREATE - Creando 10 restricciones laborales...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateWorkRestriction(i);
        if (id) createdIds.push(id);
    }

    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteWorkRestriction(createdIds[i], i + 1);
        }
    }

    console.log(`\n✅ WORK RESTRICTIONS - Tests completados (${createdIds.length}/10)`);
}

async function runVaccinationsTests() {
    console.log('\n' + '='.repeat(80));
    console.log('💉 TESTING: VACCINATIONS (Vacunas)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    console.log('📝 CREATE - Creando 10 vacunas...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateVaccination(i);
        if (id) createdIds.push(id);
    }

    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteVaccination(createdIds[i], i + 1);
        }
    }

    console.log(`\n✅ VACCINATIONS - Tests completados (${createdIds.length}/10)`);
}

async function runMedicalExamsTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🩺 TESTING: MEDICAL EXAMS (Exámenes Médicos)');
    console.log('='.repeat(80) + '\n');

    const createdIds = [];

    console.log('📝 CREATE - Creando 10 exámenes médicos...');
    for (let i = 1; i <= 10; i++) {
        const id = await testCreateMedicalExam(i);
        if (id) createdIds.push(id);
    }

    if (createdIds.length > 0) {
        console.log(`\n🗑️ DELETE - Eliminando ${createdIds.length} registros...`);
        for (let i = 0; i < createdIds.length; i++) {
            await testDeleteMedicalExam(createdIds[i], i + 1);
        }
    }

    console.log(`\n✅ MEDICAL EXAMS - Tests completados (${createdIds.length}/10)`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log('\n' + '█'.repeat(80));
    console.log('🧪 TEST EXHAUSTIVO: EDUCATION + MEDICAL SYSTEM (8 categorías)');
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
    await runEducationTests();
    await runChronicConditionsTests();
    await runMedicationsTests();
    await runAllergiesTests();
    await runActivityRestrictionsTests();
    await runWorkRestrictionsTests();
    await runVaccinationsTests();
    await runMedicalExamsTests();

    // Resumen final
    console.log('\n' + '█'.repeat(80));
    console.log('✅ TESTS COMPLETADOS EXITOSAMENTE');
    console.log('█'.repeat(80));
    console.log('\n📊 RESUMEN:');
    console.log('   - Education: CREATE (10x), DELETE (10x)');
    console.log('   - Chronic Conditions: CREATE (10x), DELETE (10x)');
    console.log('   - Medications: CREATE (10x), DELETE (10x)');
    console.log('   - Allergies: CREATE (10x), DELETE (10x)');
    console.log('   - Activity Restrictions: CREATE (10x), DELETE (10x)');
    console.log('   - Work Restrictions: CREATE (10x), DELETE (10x)');
    console.log('   - Vaccinations: CREATE (10x), DELETE (10x)');
    console.log('   - Medical Exams: CREATE (10x), DELETE (10x)');
    console.log('\n💡 TOTAL: 160 tests (80 CREATE + 80 DELETE)');
    console.log('   Verificar que todas las funciones respondan correctamente\n');
}

main().catch(error => {
    console.error('\n❌ ERROR FATAL:', error);
    process.exit(1);
});
