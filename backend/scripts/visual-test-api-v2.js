/**
 * Test API V2 - Con rutas correctas /api/v1/
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:9998';

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     API TEST V2 - Rutas /api/v1/                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // Login
        console.log('🔐 Login...');
        const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
            identifier: 'admin',
            password: 'admin123',
            companySlug: 'isi'
        });

        const token = loginRes.data.token;
        console.log(`   ✅ Token obtenido\n`);

        const headers = { Authorization: `Bearer ${token}` };

        // Endpoints con rutas correctas
        const endpoints = [
            { path: '/api/v1/users', name: 'Users' },
            { path: '/api/v1/departments', name: 'Departments' },
            { path: '/api/v1/shifts', name: 'Shifts' },
            { path: '/api/v1/vacation/requests', name: 'Vacations' },
            { path: '/api/v1/attendance', name: 'Attendance' },
            { path: '/api/v1/legal', name: 'Legal' },
            { path: '/api/v1/branches', name: 'Branches' },
            { path: '/api/kiosks', name: 'Kiosks' },
            { path: '/api/company-panel/vacations', name: 'VacationsPanel' },
            { path: '/api/company-panel/sanctions', name: 'SanctionsPanel' },
            { path: '/api/company-panel/trainings', name: 'TrainingsPanel' },
        ];

        console.log('📊 Verificando endpoints...\n');

        const results = { ok: 0, fail: 0 };

        for (const ep of endpoints) {
            try {
                const res = await axios.get(`${BASE_URL}${ep.path}`, { headers, timeout: 5000 });
                const data = res.data;
                let count = '?';

                if (Array.isArray(data)) count = data.length;
                else if (data.data) count = data.data.length || Object.keys(data.data).length;
                else if (data.users) count = data.users.length;
                else if (data.departments) count = data.departments.length;
                else if (data.requests) count = data.requests.length;
                else if (data.shifts) count = data.shifts.length;
                else if (data.records) count = data.records.length;
                else if (data.success !== undefined) count = 'OK';

                console.log(`   ✅ ${ep.name.padEnd(18)} ${ep.path.padEnd(35)} → ${count}`);
                results.ok++;
            } catch (err) {
                const status = err.response?.status || 'ERR';
                const msg = err.response?.data?.message || '';
                console.log(`   ❌ ${ep.name.padEnd(18)} ${ep.path.padEnd(35)} → ${status} ${msg.substring(0, 20)}`);
                results.fail++;
            }
        }

        // Resumen
        console.log('\n\n╔════════════════════════════════════════════════════════════╗');
        console.log(`║   ✅ Exitosos: ${results.ok}                                            ║`);
        console.log(`║   ❌ Fallidos: ${results.fail}                                            ║`);
        console.log(`║   📊 Total:    ${results.ok + results.fail}                                           ║`);
        console.log('╚════════════════════════════════════════════════════════════╝');

    } catch (err) {
        console.error('❌ Error:', err.response?.data?.message || err.message);
    }
}

main();
