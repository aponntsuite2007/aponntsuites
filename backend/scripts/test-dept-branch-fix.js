/**
 * Test: Verificar que departamentos devuelven branch_id
 */
const fetch = require('node-fetch');
const API = 'http://localhost:9998/api/v1';

async function test() {
    // 1. Login
    console.log('🔐 Login...');
    const loginRes = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            companySlug: 'isi',
            identifier: 'admin',
            password: 'admin123'
        })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Token:', token ? 'OK' : 'FAIL');

    // 2. Obtener departamentos
    console.log('\n📦 Obteniendo departamentos...');
    const deptRes = await fetch(API + '/departments', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const deptData = await deptRes.json();
    const departments = deptData.departments || deptData.data || [];

    console.log(`Total departamentos: ${departments.length}`);

    // 3. Verificar campos en cada departamento
    console.log('\n📋 Verificando campos de departamentos:');
    const fields = ['id', 'name', 'branch_id', 'branchId', 'default_kiosk_id', 'manager_user_id'];

    departments.slice(0, 3).forEach((dept, i) => {
        console.log(`\nDepartamento ${i + 1}: ${dept.name}`);
        fields.forEach(f => {
            const val = dept[f];
            const status = val !== undefined ? '✅' : '❌';
            console.log(`  ${status} ${f}: ${val}`);
        });
    });

    // 4. Verificar fix
    const firstDept = departments[0];
    if (firstDept) {
        const hasBranchId = firstDept.branch_id !== undefined || firstDept.branchId !== undefined;
        console.log('\n' + '='.repeat(50));
        if (hasBranchId) {
            console.log('✅ FIX FUNCIONA: branch_id se devuelve en GET /departments');
        } else {
            console.log('❌ ERROR: branch_id NO se devuelve');
        }
        console.log('='.repeat(50));
    }
}

test().catch(e => console.error('Error:', e));
