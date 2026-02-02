const fetch = require('node-fetch');

async function testCreateStaff() {
    try {
        const loginRes = await fetch('http://localhost:9998/api/aponnt/staff/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aponnt.com', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        if (!loginData.success) { console.log('❌ Login failed'); return; }
        console.log('✅ Login OK');

        const rolesRes = await fetch('http://localhost:9998/api/aponnt/staff-data/roles', {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        const rolesData = await rolesRes.json();
        const vendRole = rolesData.data.find(r => r.role_code === 'VEND');
        console.log('📌 Using role:', vendRole?.role_code, vendRole?.role_id);

        const staffData = {
            first_name: 'API_Test',
            last_name: 'Final_' + Date.now(),
            email: 'api.final.' + Date.now() + '@aponnt.com',
            role_id: vendRole?.role_id,
            country: 'AR'
        };
        console.log('📝 Creating staff:', staffData);

        const createRes = await fetch('http://localhost:9998/api/aponnt/staff-data/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${loginData.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(staffData)
        });

        const createData = await createRes.json();
        console.log(createData.success ? '✅ CREATE SUCCESS' : '❌ CREATE FAILED');
        console.log('Result:', JSON.stringify(createData, null, 2).substring(0, 800));

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}
testCreateStaff();
