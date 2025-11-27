/**
 * Debug específico de endpoints que fallan
 */
require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302',
    { host: 'localhost', port: 5432, dialect: 'postgres', logging: false });

function request(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const body = data ? JSON.stringify(data) : null;
        const options = {
            hostname: 'localhost', port: 9998,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : undefined
            }
        };
        if (body) options.headers['Content-Length'] = Buffer.byteLength(body);

        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', c => responseBody += c);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseBody });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function main() {
    console.log('\n🔍 DEBUG DE ENDPOINTS CRUD\n');

    // Obtener datos necesarios
    const [admins] = await sequelize.query(`
        SELECT user_id, email, role, company_id FROM users
        WHERE company_id = 11 AND role = 'admin' AND is_active = true LIMIT 1
    `);

    const [branches] = await sequelize.query(`SELECT id FROM company_branches WHERE company_id = 11 LIMIT 1`);
    const [depts] = await sequelize.query(`SELECT id FROM departments WHERE company_id = 11 LIMIT 1`);

    console.log('Admin:', admins[0]?.email);
    console.log('Branch ID:', branches[0]?.id || 'No hay');
    console.log('Dept ID:', depts[0]?.id || 'No hay');

    const token = jwt.sign(
        { id: admins[0].user_id, email: admins[0].email, role: 'admin', companyId: 11 },
        process.env.JWT_SECRET || 'tu_secreto_jwt_super_seguro_2024',
        { expiresIn: '1h' }
    );

    // Test 1: Users CREATE
    console.log('\n📦 TEST: Users CREATE');
    const userRes = await request('POST', '/api/v1/users', {
        firstName: 'Test',
        lastName: 'User',
        email: `test-${Date.now()}@test.com`,
        password: 'Test123456!',
        role: 'employee',
        dni: String(Date.now()).substring(5),
        departmentId: depts[0]?.id,
        branch_id: branches[0]?.id
    }, token);
    console.log('   Status:', userRes.status);
    console.log('   Response:', JSON.stringify(userRes.data).substring(0, 200));

    // Test 2: Attendance READ
    console.log('\n📦 TEST: Attendance READ');
    const attRes = await request('GET', '/api/v1/attendance', null, token);
    console.log('   Status:', attRes.status);
    console.log('   Response:', JSON.stringify(attRes.data).substring(0, 200));

    // Test 3: Payroll countries
    console.log('\n📦 TEST: Payroll countries');
    const payRes = await request('GET', '/api/payroll/countries', null, token);
    console.log('   Status:', payRes.status);
    console.log('   Response:', JSON.stringify(payRes.data).substring(0, 200));

    // Test 4: Shifts READ
    console.log('\n📦 TEST: Shifts READ');
    const shiftRes = await request('GET', '/api/v1/shifts', null, token);
    console.log('   Status:', shiftRes.status);
    console.log('   Response:', JSON.stringify(shiftRes.data).substring(0, 300));

    await sequelize.close();
}

main().catch(console.error);
