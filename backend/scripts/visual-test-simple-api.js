/**
 * Test API Simple - Login directo y verificación
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:9998';

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     API TEST - Verificación de Endpoints                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // 1. Login directo via API
        console.log('🔐 Login via API...');
        const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
            identifier: 'admin',
            password: 'admin123',
            companySlug: 'isi'
        });

        const token = loginRes.data.token;
        console.log(`   ✅ Login exitoso`);
        console.log(`   👤 Usuario: ${loginRes.data.user?.name || loginRes.data.user?.email || 'Admin'}`);
        console.log(`   🏢 Empresa: ${loginRes.data.company?.name || 'ISI'}`);
        console.log(`   🔑 Token: ${token ? token.substring(0, 30) + '...' : 'NO'}\n`);

        if (!token) {
            throw new Error('No se recibió token');
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Test endpoints
        const endpoints = [
            { path: '/api/users', name: 'Users' },
            { path: '/api/departments', name: 'Departments' },
            { path: '/api/vacation-requests', name: 'Vacations' },
            { path: '/api/attendance', name: 'Attendance' },
            { path: '/api/sanctions', name: 'Sanctions' },
            { path: '/api/trainings', name: 'Trainings' },
            { path: '/api/visitors', name: 'Visitors' },
            { path: '/api/kiosks', name: 'Kiosks' },
        ];

        console.log('📊 Verificando endpoints...\n');

        for (const ep of endpoints) {
            try {
                const res = await axios.get(`${BASE_URL}${ep.path}`, { headers, timeout: 5000 });
                const data = res.data;
                let count = 0;

                if (Array.isArray(data)) {
                    count = data.length;
                } else if (data.data && Array.isArray(data.data)) {
                    count = data.data.length;
                } else if (data.users) {
                    count = data.users.length;
                } else if (data.departments) {
                    count = data.departments.length;
                } else if (data.requests) {
                    count = data.requests.length;
                } else if (data.records) {
                    count = data.records.length;
                } else if (typeof data === 'object') {
                    count = Object.keys(data).length;
                }

                console.log(`   ✅ ${ep.name.padEnd(15)} GET ${ep.path.padEnd(25)} → ${count} items`);
            } catch (err) {
                const status = err.response?.status || 'ERR';
                console.log(`   ❌ ${ep.name.padEnd(15)} GET ${ep.path.padEnd(25)} → ${status}`);
            }
        }

        // 3. Resumen
        console.log('\n\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                    API VERIFICADA                            ║');
        console.log('╚════════════════════════════════════════════════════════════╝');

    } catch (err) {
        console.error('❌ Error:', err.response?.data?.message || err.message);

        // Intentar login alternativo
        console.log('\n🔄 Intentando login alternativo...');
        try {
            const loginRes2 = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'admin@isi.com',
                password: 'admin123'
            });
            console.log('   ✅ Login alternativo exitoso:', loginRes2.data);
        } catch (err2) {
            console.log('   ❌ Login alternativo falló:', err2.response?.status || err2.message);
        }
    }
}

main();
