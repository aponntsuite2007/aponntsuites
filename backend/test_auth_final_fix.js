const axios = require('axios');

async function testAuthenticationFinalFix() {
    const baseUrl = 'http://localhost:8001';

    console.log('🎯 TESTING FINAL AUTHENTICATION FIX');
    console.log('=====================================\n');

    // 1. Verificar que los endpoints falsos ya NO existen
    console.log('=== TESTING FAKE ENDPOINTS REMOVAL ===');

    try {
        const response = await axios.get(`${baseUrl}/api/v1/company-modules/my-modules`, {
            headers: {
                'Authorization': 'Bearer token_test_admin1',
                'Content-Type': 'application/json'
            }
        });
        console.log('❌ FAIL: Hardcoded token was still accepted!');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('✅ SUCCESS: Hardcoded tokens are properly rejected');
        } else {
            console.log(`❌ Unexpected error: ${error.message}`);
            return false;
        }
    }

    console.log('');

    // 2. Probar el flujo de autenticación REAL
    console.log('=== TESTING REAL AUTHENTICATION FLOW ===');

    const testCredentials = [
        { identifier: 'adminisi', password: '123', companyId: 11 },
        { identifier: 'admin1', password: '123', companyId: 1 },
        { identifier: 'admin4', password: '123', companyId: 4 },
    ];

    let authWorking = false;

    for (const creds of testCredentials) {
        try {
            console.log(`🔐 Testing: ${creds.identifier}/${creds.password} @ Company:${creds.companyId}`);

            // Step 1: Real login
            const loginResponse = await axios.post(`${baseUrl}/api/v1/auth/login`, creds, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (loginResponse.data && loginResponse.data.token) {
                const token = loginResponse.data.token;
                console.log(`   ✅ LOGIN SUCCESS! Token: ${token.substring(0, 40)}... (Length: ${token.length})`);
                console.log(`   👤 User: ${loginResponse.data.user.firstName} ${loginResponse.data.user.lastName}`);
                console.log(`   🏢 Company: ${loginResponse.data.user.companyName} (ID: ${creds.companyId})`);

                // Step 2: Use real JWT with modules
                const modulesResponse = await axios.get(`${baseUrl}/api/v1/company-modules/my-modules?company_id=${creds.companyId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`   ✅ JWT ACCESS SUCCESS! Modules: ${modulesResponse.data.totalModules}, Contracted: ${modulesResponse.data.contractedModules}`);
                console.log('');

                authWorking = true;
                break;

            } else {
                console.log(`   ❌ No token received`);
            }

        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            console.log(`   ❌ FAILED: ${errorMsg}`);
        }
        console.log('');
    }

    // 3. Probar credenciales incorrectas (debe mostrar error apropiado)
    console.log('=== TESTING INVALID CREDENTIALS ERROR HANDLING ===');

    try {
        const response = await axios.post(`${baseUrl}/api/v1/auth/login`, {
            identifier: 'admin1',
            password: 'wrong_password',
            companyId: 1
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('❌ FAIL: Invalid credentials were accepted!');
        return false;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log(`✅ SUCCESS: Invalid credentials properly rejected - ${error.response.data.error}`);
        } else {
            console.log(`❌ Unexpected error for invalid credentials: ${error.message}`);
            return false;
        }
    }

    console.log('');

    // 4. Final verdict
    if (authWorking) {
        console.log('🎉 ========================================');
        console.log('🎉 AUTHENTICATION FIX IS WORKING!');
        console.log('🎉 ========================================');
        console.log('✅ Fake endpoints removed successfully');
        console.log('✅ Real login generates valid JWTs');
        console.log('✅ JWT tokens work with protected endpoints');
        console.log('✅ Invalid credentials are properly rejected');
        console.log('✅ System requires proper company selection + credentials');
        return true;
    } else {
        console.log('❌ Authentication fix is NOT working properly');
        return false;
    }
}

testAuthenticationFinalFix();