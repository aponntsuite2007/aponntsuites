const axios = require('axios');

async function testRealLogin() {
    const baseUrl = 'http://localhost:9997';

    // Credenciales para probar
    const testCredentials = [
        { identifier: 'adminisi', password: '123', companyId: 11 },
        { identifier: 'admin4', password: '123', companyId: 4 },
        { identifier: 'admin1', password: '123', companyId: 1 },
        { identifier: 'adminisi', password: 'admin123', companyId: 11 },
    ];

    console.log('🔐 Testing login credentials with 9997...\n');

    for (const creds of testCredentials) {
        try {
            console.log(`Testing: ${creds.identifier} / ${creds.password} / Company:${creds.companyId}`);

            const response = await axios.post(`${baseUrl}/api/v1/auth/login`, creds, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data && response.data.token) {
                console.log(`✅ SUCCESS! Token: ${response.data.token.substring(0, 30)}...`);
                console.log(`   User: ${response.data.user.firstName} ${response.data.user.lastName}`);
                console.log(`   Role: ${response.data.user.role}`);

                // Probar que el JWT funciona con los módulos
                try {
                    const modulesResponse = await axios.get(`${baseUrl}/api/v1/company-modules/my-modules?company_id=${creds.companyId}`, {
                        headers: {
                            'Authorization': `Bearer ${response.data.token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    console.log(`✅ JWT works! Found ${modulesResponse.data.totalModules} modules`);
                    console.log(`   Company: ${creds.companyId}, Total contracted: ${modulesResponse.data.contractedModules}`);

                } catch (moduleError) {
                    console.log(`❌ JWT failed for modules: ${moduleError.response?.data?.error || moduleError.message}`);
                }

                console.log('---\n');
                break; // Found working credentials

            } else {
                console.log(`❌ No token received`);
            }

        } catch (error) {
            console.log(`❌ FAILED: ${error.response?.data?.error || error.message}`);
        }
        console.log('');
    }
}

testRealLogin();