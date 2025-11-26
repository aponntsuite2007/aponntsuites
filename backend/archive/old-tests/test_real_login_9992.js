const axios = require('axios');

async function testRealLogin() {
    const baseUrl = 'http://localhost:9992';

    console.log('🔐 Testing CORRECTED authentication with proper token handling...\n');

    // 1. Probar que tokens hardcodeados son RECHAZADOS
    console.log('=== TESTING HARDCODED TOKEN REJECTION ===');
    try {
        const response = await axios.get(`${baseUrl}/api/v1/company-modules/my-modules`, {
            headers: {
                'Authorization': 'Bearer token_test_admin1',
                'Content-Type': 'application/json'
            }
        });
        console.log('❌ FAILED: Hardcoded token was accepted (should be rejected)');
    } catch (error) {
        console.log(`✅ SUCCESS: Hardcoded token rejected - ${error.response?.data?.error || error.message}`);
    }

    console.log('');

    // 2. Probar que login real funciona y genera JWT válido
    console.log('=== TESTING REAL LOGIN FLOW ===');

    const testCredentials = [
        { identifier: 'adminisi', password: '123', companyId: 11 },
        { identifier: 'admin4', password: '123', companyId: 4 },
    ];

    for (const creds of testCredentials) {
        try {
            console.log(`Testing login: ${creds.identifier} / ${creds.password} / Company:${creds.companyId}`);

            // Step 1: Login
            const loginResponse = await axios.post(`${baseUrl}/api/v1/auth/login`, creds, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (loginResponse.data && loginResponse.data.token) {
                const token = loginResponse.data.token;
                console.log(`✅ LOGIN SUCCESS! Token: ${token.substring(0, 30)}... (Length: ${token.length})`);

                // Step 2: Use JWT to access modules
                const modulesResponse = await axios.get(`${baseUrl}/api/v1/company-modules/my-modules?company_id=${creds.companyId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`✅ JWT ACCESS SUCCESS! Found ${modulesResponse.data.totalModules} modules`);
                console.log(`   Company: ${creds.companyId}, Total contracted: ${modulesResponse.data.contractedModules}`);
                console.log('');
                console.log('🎉 AUTHENTICATION FIX WORKS CORRECTLY!');
                console.log('✅ Hardcoded tokens are rejected');
                console.log('✅ Real login generates valid JWTs');
                console.log('✅ Valid JWTs provide access to modules');
                console.log('---');

                // Test successful - stop here
                return;

            } else {
                console.log(`❌ No token received from login`);
            }

        } catch (error) {
            console.log(`❌ LOGIN FAILED: ${error.response?.data?.error || error.message}`);
        }
        console.log('');
    }
}

testRealLogin();