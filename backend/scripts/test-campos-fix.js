/**
 * Verifica que los campos agregados se devuelvan correctamente
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
    const { token } = await loginRes.json();

    console.log('📊 VERIFICACIÓN CAMPOS POST-FIX\n');

    // 1. USERS - Verificar city, country, branch_id
    const usersRes = await fetch(API + '/users', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const usersData = await usersRes.json();
    const user = (usersData.users || usersData.data || [])[0];
    if (user) {
        console.log('👥 USERS');
        console.log('   city:', user.city !== undefined ? '✅' : '❌', user.city || '(null)');
        console.log('   country:', user.country !== undefined ? '✅' : '❌', user.country || '(null)');
        console.log('   branch_id:', user.branch_id !== undefined ? '✅' : '❌', user.branch_id || '(null)');
        console.log('   province:', user.province !== undefined ? '✅' : '❌', user.province || '(null)');
        console.log('   postalCode:', user.postalCode !== undefined ? '✅' : '❌', user.postalCode || '(null)');
        console.log('   healthInsuranceProvider:', user.healthInsuranceProvider !== undefined ? '✅' : '❌');
    }

    // 2. ATTENDANCE - Verificar campos nuevos
    const attRes = await fetch(API + '/attendance?start_date=2026-01-01&end_date=2026-01-31', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const attData = await attRes.json();
    const records = attData.data || attData.records || [];
    if (records.length > 0) {
        const att = records[0];
        console.log('\n⏰ ATTENDANCE');
        console.log('   company_id:', att.company_id !== undefined ? '✅' : '❌', att.company_id || '(null)');
        console.log('   check_in_method:', att.check_in_method !== undefined ? '✅' : '❌', att.check_in_method || '(null)');
        console.log('   check_in_latitude:', att.check_in_latitude !== undefined ? '✅' : '❌', att.check_in_latitude || '(null)');
        console.log('   working_hours:', att.working_hours !== undefined ? '✅' : '❌', att.working_hours || '(null)');
        console.log('   minutes_late:', att.minutes_late !== undefined ? '✅' : '❌', att.minutes_late);
        console.log('   shift_id:', att.shift_id !== undefined ? '✅' : '❌', att.shift_id || '(null)');
        console.log('   notes:', att.notes !== undefined ? '✅' : '❌', att.notes || '(null)');
    } else {
        console.log('\n⏰ ATTENDANCE - Sin registros para verificar');
    }

    console.log('\n✅ Verificación completada');
}

test().catch(e => console.error('Error:', e));
