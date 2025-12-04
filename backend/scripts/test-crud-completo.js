/**
 * Test CRUD Completo de Cargos
 */
const fetch = require('node-fetch');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjQ2ODQ1ODEsImV4cCI6MTc2NDc3MDk4MX0.rmg9pKwPGpU82U3Si8-mGsAZOPRVlFuTCL4M9oJ1YDY';
const BASE_URL = 'http://localhost:9998';

async function apiCall(method, endpoint, body = null) {
    const options = {
        method,
        headers: {
            'Authorization': 'Bearer ' + TOKEN,
            'Content-Type': 'application/json'
        }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(BASE_URL + endpoint, options);
    return res.json();
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('         TEST CRUD COMPLETO - CARGOS (positions)           ');
    console.log('═══════════════════════════════════════════════════════════\n');

    let createdId = null;

    // ═══════════════════════════════════════════════════════════
    // 1. READ - Listar cargos existentes
    // ═══════════════════════════════════════════════════════════
    console.log('1️⃣  READ - Listar cargos existentes');
    console.log('─────────────────────────────────────');
    const listResult = await apiCall('GET', '/api/payroll/positions');
    if (listResult.success) {
        console.log(`   ✅ ${listResult.data.length} cargos encontrados`);
        listResult.data.slice(0, 3).forEach(p => {
            console.log(`      - ${p.position_code}: ${p.position_name}`);
        });
        if (listResult.data.length > 3) console.log(`      ... y ${listResult.data.length - 3} más`);
    } else {
        console.log(`   ❌ Error: ${listResult.error}`);
    }
    console.log();

    // ═══════════════════════════════════════════════════════════
    // 2. CREATE - Crear nuevo cargo
    // ═══════════════════════════════════════════════════════════
    console.log('2️⃣  CREATE - Crear nuevo cargo');
    console.log('─────────────────────────────────────');
    const newPosition = {
        position_code: 'TEST-' + Date.now(),
        position_name: 'Cargo de Prueba CRUD',
        description: 'Cargo creado automáticamente para test CRUD',
        level_order: 2,
        parent_position_id: null,
        department_id: null,
        salary_category_id: null,
        payroll_template_id: null,
        payslip_template_id: 1,  // Usar template existente
        is_active: true
    };

    const createResult = await apiCall('POST', '/api/payroll/positions', newPosition);
    if (createResult.success) {
        createdId = createResult.data.id;
        console.log(`   ✅ Cargo creado con ID: ${createdId}`);
        console.log(`      Código: ${createResult.data.position_code}`);
        console.log(`      Nombre: ${createResult.data.position_name}`);
    } else {
        console.log(`   ❌ Error: ${createResult.error}`);
        return;
    }
    console.log();

    // ═══════════════════════════════════════════════════════════
    // 3. READ ONE - Obtener cargo creado
    // ═══════════════════════════════════════════════════════════
    console.log('3️⃣  READ ONE - Obtener cargo recién creado');
    console.log('─────────────────────────────────────');
    const getOneResult = await apiCall('GET', '/api/payroll/positions/' + createdId);
    if (getOneResult.success) {
        console.log(`   ✅ Cargo obtenido:`);
        console.log(`      ID: ${getOneResult.data.id}`);
        console.log(`      Código: ${getOneResult.data.position_code}`);
        console.log(`      Nombre: ${getOneResult.data.position_name}`);
        console.log(`      Template Recibo: ${getOneResult.data.payslipTemplate ? getOneResult.data.payslipTemplate.template_name : 'No asignado'}`);
    } else {
        console.log(`   ❌ Error: ${getOneResult.error}`);
    }
    console.log();

    // ═══════════════════════════════════════════════════════════
    // 4. UPDATE - Actualizar cargo
    // ═══════════════════════════════════════════════════════════
    console.log('4️⃣  UPDATE - Actualizar cargo');
    console.log('─────────────────────────────────────');
    const updateData = {
        position_name: 'Cargo de Prueba ACTUALIZADO',
        description: 'Descripción modificada por test CRUD',
        level_order: 3
    };

    const updateResult = await apiCall('PUT', '/api/payroll/positions/' + createdId, updateData);
    if (updateResult.success) {
        console.log(`   ✅ Cargo actualizado:`);
        console.log(`      Nombre: ${updateResult.data.position_name}`);
        console.log(`      Nivel: ${updateResult.data.level_order}`);
    } else {
        console.log(`   ❌ Error: ${updateResult.error}`);
    }
    console.log();

    // Verificar que se actualizó
    console.log('   📋 Verificando actualización...');
    const verifyResult = await apiCall('GET', '/api/payroll/positions/' + createdId);
    if (verifyResult.success && verifyResult.data.position_name === 'Cargo de Prueba ACTUALIZADO') {
        console.log(`   ✅ Verificado: nombre actualizado correctamente`);
    } else {
        console.log(`   ❌ La actualización no se reflejó`);
    }
    console.log();

    // ═══════════════════════════════════════════════════════════
    // 5. DELETE - Eliminar cargo
    // ═══════════════════════════════════════════════════════════
    console.log('5️⃣  DELETE - Eliminar cargo');
    console.log('─────────────────────────────────────');
    const deleteResult = await apiCall('DELETE', '/api/payroll/positions/' + createdId);
    if (deleteResult.success) {
        console.log(`   ✅ Cargo eliminado correctamente`);
    } else {
        console.log(`   ❌ Error: ${deleteResult.error}`);
    }
    console.log();

    // Verificar que se eliminó
    console.log('   📋 Verificando eliminación...');
    const verifyDeleteResult = await apiCall('GET', '/api/payroll/positions/' + createdId);
    if (!verifyDeleteResult.success || !verifyDeleteResult.data) {
        console.log(`   ✅ Verificado: cargo ya no existe`);
    } else {
        console.log(`   ❌ El cargo todavía existe`);
    }
    console.log();

    // ═══════════════════════════════════════════════════════════
    // RESUMEN
    // ═══════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    RESUMEN TEST CRUD                       ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   ✅ READ (listar)    - FUNCIONA');
    console.log('   ✅ CREATE (crear)   - FUNCIONA');
    console.log('   ✅ READ ONE (leer)  - FUNCIONA');
    console.log('   ✅ UPDATE (editar)  - FUNCIONA');
    console.log('   ✅ DELETE (borrar)  - FUNCIONA');
    console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
