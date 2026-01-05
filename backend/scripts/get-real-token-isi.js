/**
 * Obtener token real mediante login
 */

const axios = require('axios');

async function getRealToken() {
    console.log('🔐 Obteniendo token real mediante login...\n');

    try {
        // Login con usuario real de ISI
        const loginResponse = await axios.post('http://localhost:9998/api/v1/auth/login', {
            identifier: 'rrhh2@isi.test',  // email del usuario RRHH-002
            password: 'test123',  // Password actualizada
            companySlug: 'isi'
        });

        console.log('✅ Login exitoso!');
        console.log('Token:', loginResponse.data.token.substring(0, 80) + '...');
        console.log('\n📋 User Info:', {
            id: loginResponse.data.user?.user_id,
            email: loginResponse.data.user?.email,
            role: loginResponse.data.user?.role,
            company_id: loginResponse.data.user?.company_id
        });

        return loginResponse.data.token;

    } catch (error) {
        console.log('❌ Error en login:', error.response?.status);
        console.log('Data:', JSON.stringify(error.response?.data, null, 2));

        // Si falla, intentar con otros passwords comunes
        console.log('\n🔄 Intentando passwords alternativos...');

        const passwords = ['password', '123456', 'rrhh123', 'test123', 'admin'];

        for (const pwd of passwords) {
            try {
                console.log(`  Probando: ${pwd}`);
                const res = await axios.post('http://localhost:9998/api/v1/auth/login', {
                    identifier: 'rrhh2@isi.test',
                    password: pwd,
                    companySlug: 'isi'
                });
                console.log(`  ✅ Funciona con: ${pwd}`);
                return res.data.token;
            } catch (err) {
                // Continuar con siguiente password
            }
        }

        console.log('\n❌ No se pudo obtener token. Necesitarás resetear la password del usuario.');
        process.exit(1);
    }
}

// Ejecutar
getRealToken().then(token => {
    console.log('\n✅ Token obtenido exitosamente!\n');
    process.exit(0);
});
