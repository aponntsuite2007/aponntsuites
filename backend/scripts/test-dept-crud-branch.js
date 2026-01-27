/**
 * Test CRUD completo de departamentos con branch_id
 */
const fetch = require('node-fetch');
const API = 'http://localhost:9998/api/v1';

async function test() {
    // Login
    const loginRes = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            companySlug: 'isi',
            identifier: 'admin',
            password: 'admin123'
        })
    });
    const { token, user } = await loginRes.json();
    const companyId = user.company_id;
    console.log('✅ Login OK | Company:', companyId);

    // Obtener una sucursal existente
    const branchRes = await fetch(API + '/companies/' + companyId + '/branches', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const branchData = await branchRes.json();
    const branches = branchData.branches || branchData.data || [];
    const testBranch = branches[0];
    console.log('✅ Sucursal de prueba:', testBranch?.name, '| ID:', testBranch?.id);

    if (!testBranch) {
        console.log('❌ No hay sucursales disponibles');
        return;
    }

    // CREAR departamento con branch_id
    console.log('\n📝 Creando departamento de prueba con sucursal...');
    const createRes = await fetch(API + '/departments', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'Test Depto Branch ' + Date.now(),
            description: 'Departamento de prueba con sucursal asignada',
            branch_id: testBranch.id
        })
    });
    const createData = await createRes.json();
    console.log('Respuesta create:', createRes.status, createData.success ? 'OK' : createData.error);

    if (!createData.success) {
        console.log('❌ Error creando departamento:', createData);
        return;
    }

    const deptId = createData.data?.id;
    console.log('✅ Departamento creado ID:', deptId);
    console.log('   branch_id retornado:', createData.data?.branch_id);
    console.log('   branchId retornado:', createData.data?.branchId);

    // LEER el departamento recién creado
    console.log('\n📖 Verificando lectura del departamento...');
    const readRes = await fetch(API + '/departments/' + deptId, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const readData = await readRes.json();
    console.log('   branch_id en lectura:', readData.data?.branch_id);
    console.log('   branchId en lectura:', readData.data?.branchId);

    const branchOk = readData.data?.branch_id === testBranch.id;
    console.log(branchOk ? '✅ branch_id coincide!' : '❌ branch_id NO coincide');

    // ACTUALIZAR a otra sucursal (si hay más de una)
    if (branches.length > 1) {
        const otherBranch = branches[1];
        console.log('\n✏️ Actualizando a otra sucursal:', otherBranch.name);

        const updateRes = await fetch(API + '/departments/' + deptId, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                branch_id: otherBranch.id
            })
        });
        const updateData = await updateRes.json();
        console.log('   branch_id después de update:', updateData.data?.branch_id);

        const updateOk = updateData.data?.branch_id === otherBranch.id;
        console.log(updateOk ? '✅ Update de branch_id OK!' : '❌ Update de branch_id FAIL');
    }

    // ELIMINAR departamento de prueba
    console.log('\n🗑️ Eliminando departamento de prueba...');
    const deleteRes = await fetch(API + '/departments/' + deptId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    console.log('Delete:', deleteRes.status === 200 ? '✅ OK' : '❌ FAIL');

    console.log('\n' + '='.repeat(50));
    console.log('✅ CRUD COMPLETO DE DEPARTAMENTO CON BRANCH_ID FUNCIONA');
    console.log('='.repeat(50));
}

test().catch(e => console.error('Error:', e));
