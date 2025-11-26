/**
 * DEBUG: Verificar por qué falla el endpoint de Education
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:9999';
const TEST_USER_ID = 'd2ace38c-d79a-4c9d-833d-ed549fc948f1';

const LOGIN_CREDENTIALS = {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
};

async function debugEducation() {
    try {
        // 1. Autenticar
        console.log('🔐 Autenticando...');
        const authResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, LOGIN_CREDENTIALS);
        const authToken = authResponse.data.token;
        console.log('✅ Token obtenido\n');

        // 2. Intentar crear educación
        console.log('📝 Intentando crear registro educativo...');
        const data = {
            education_level: 'university',
            institution_name: 'Universidad Test',
            degree_title: 'Licenciatura Test',
            field_of_study: 'Campo Test',
            start_date: '2015-01-01',
            end_date: '2019-12-31',
            graduated: true
        };

        console.log('📤 Datos a enviar:', JSON.stringify(data, null, 2));
        console.log('📍 URL:', `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/education`);
        console.log('');

        const response = await axios.post(
            `${BASE_URL}/api/v1/user-profile/${TEST_USER_ID}/education`,
            data,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ SUCCESS!');
        console.log('📥 Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ ERROR:', error.response?.data || error.message);
        console.error('🔍 Status:', error.response?.status);
        console.error('🔍 Full error:', error.response?.data);
    }
}

debugEducation();
