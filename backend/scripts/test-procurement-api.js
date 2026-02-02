const fetch = require('node-fetch');

async function testProcurementAPI() {
    try {
        // 1. Login con empresa
        console.log('📋 Test 1: Login...');
        const loginRes = await fetch('http://localhost:9998/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: 'administrador',
                password: 'admin123',
                companySlug: 'aponnt-empresa-demo'
            })
        });
        const loginData = await loginRes.json();

        if (!loginData.token) {
            console.log('❌ Login failed:', loginData.error || loginData);
            return;
        }
        console.log('✅ Login OK - User:', loginData.user?.username || loginData.user?.email);

        const token = loginData.token;

        // 2. Test dashboard
        console.log('\n📋 Test 2: Dashboard Stats...');
        const dashRes = await fetch('http://localhost:9998/api/procurement/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dashData = await dashRes.json();

        if (!dashData.success) {
            console.log('❌ Dashboard failed:', dashData.error);
        } else {
            console.log('✅ Dashboard OK');
            console.log('   Stats:', JSON.stringify(dashData.data).substring(0, 200));
        }

        // 3. Test pending
        console.log('\n📋 Test 3: Pending Items...');
        const pendRes = await fetch('http://localhost:9998/api/procurement/dashboard/pending', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const pendData = await pendRes.json();

        if (!pendData.success) {
            console.log('❌ Pending failed:', pendData.error);
        } else {
            console.log('✅ Pending OK');
            console.log('   Data:', JSON.stringify(pendData.data));
        }

        // 4. Test requisitions list
        console.log('\n📋 Test 4: Requisitions List...');
        const reqRes = await fetch('http://localhost:9998/api/procurement/requisitions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const reqData = await reqRes.json();

        if (!reqData.success) {
            console.log('❌ Requisitions failed:', reqData.error);
        } else {
            console.log('✅ Requisitions OK');
            console.log('   Total:', reqData.count || reqData.data?.length || 0);
        }

        // 5. Test suppliers list
        console.log('\n📋 Test 5: Suppliers List...');
        const suppRes = await fetch('http://localhost:9998/api/procurement/suppliers', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const suppData = await suppRes.json();

        if (!suppData.success) {
            console.log('❌ Suppliers failed:', suppData.error);
        } else {
            console.log('✅ Suppliers OK');
            console.log('   Total:', suppData.count || suppData.data?.length || 0);
        }

        console.log('\n🎉 Test completado!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

testProcurementAPI();
