/**
 * Test directo del API de Finance Dashboard
 * Para debugging de errores 500
 */

const axios = require('axios');

async function testFinanceAPI() {
    console.log('🧪 Testing Finance Dashboard API directamente...\n');

    // Login real para obtener token válido
    console.log('🔐 Haciendo login con usuario real...');
    const loginRes = await axios.post('http://localhost:9998/api/v1/auth/login', {
        identifier: 'rrhh2@isi.test',
        password: 'test123',
        companySlug: 'isi'
    });

    const token = loginRes.data.token;
    console.log('✅ Token obtenido via login - User:', {
        email: loginRes.data.user?.email,
        role: loginRes.data.user?.role,
        company_id: loginRes.data.user?.company_id
    });
    console.log();

    // Test API endpoint
    try {
        const response = await axios.get('http://localhost:9998/api/finance/dashboard?fiscal_year=2026', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('✅ API RESPONSE SUCCESS:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (err) {
        console.log('❌ API ERROR:');
        console.log('Status:', err.response?.status);
        console.log('Data:', JSON.stringify(err.response?.data, null, 2));
        console.log('\n📋 Full Error Message:', err.message);

        if (err.response?.data?.error) {
            console.log('\n🔍 Error Detail:', err.response.data.error);
        }

        // Si hay stack trace en la respuesta
        if (err.response?.data?.stack) {
            console.log('\n📚 Stack Trace:');
            console.log(err.response.data.stack);
        }

        process.exit(1);
    }
}

testFinanceAPI();
