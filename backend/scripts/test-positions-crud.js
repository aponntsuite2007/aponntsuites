/**
 * Script de prueba para APIs del CRUD de Cargos
 */
const fetch = require('node-fetch');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc2NmRlNDk1LWU0ZjMtNGU5MS1hNTA5LTFhNDk1YzUyZTE1YyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlSWQiOiJFTVAtSVNJLTAwMSIsImNvbXBhbnlfaWQiOjExLCJpYXQiOjE3NjQ2ODQ1ODEsImV4cCI6MTc2NDc3MDk4MX0.rmg9pKwPGpU82U3Si8-mGsAZOPRVlFuTCL4M9oJ1YDY';
const BASE_URL = 'http://localhost:9998';

async function testAPI(endpoint, name) {
    try {
        const res = await fetch(BASE_URL + endpoint, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        const data = await res.json();

        if (data.success === false) {
            console.log(`❌ ${name}: ERROR - ${data.error}`);
        } else {
            const items = data.data || data || [];
            console.log(`✅ ${name}: OK (${Array.isArray(items) ? items.length : 1} items)`);
        }
        return data;
    } catch(e) {
        console.log(`❌ ${name}: ERROR - ${e.message}`);
        return null;
    }
}

async function main() {
    console.log('=== TEST APIs CRUD CARGOS ===\n');

    // 1. Positions
    await testAPI('/api/payroll/positions', 'GET /api/payroll/positions');

    // 2. Departments
    await testAPI('/api/v1/departments', 'GET /api/v1/departments');

    // 3. Categories
    await testAPI('/api/payroll/categories', 'GET /api/payroll/categories');

    // 4. Payslip Templates
    await testAPI('/api/payroll/payslip-templates', 'GET /api/payroll/payslip-templates');

    // 5. Payroll Templates
    await testAPI('/api/payroll/templates', 'GET /api/payroll/templates');

    // 6. Branches
    await testAPI('/api/payroll/branches', 'GET /api/payroll/branches');

    console.log('\n=== FIN TEST ===');
}

main();
