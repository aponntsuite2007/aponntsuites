/**
 * GET ADMIN TOKEN - Obtiene token JWT mediante login API
 */

const API_BASE = 'http://localhost:9998/api';

async function getAdminToken() {
  try {
    console.log('🔐 Obteniendo token de staff Aponnt...\n');

    // Paso 1: Login como staff de Aponnt (necesario para operaciones comerciales)
    const loginResponse = await fetch(`${API_BASE}/aponnt/staff/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@aponnt.com',  // Usuario staff de Aponnt
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      throw new Error(`Error en login: ${JSON.stringify(error)}`);
    }

    const loginResult = await loginResponse.json();
    const token = loginResult.token;

    console.log('✅ Token obtenido exitosamente!\n');
    console.log('📋 INSTRUCCIONES:');
    console.log('   1. Copia el token de abajo');
    console.log('   2. Exporta la variable TEST_TOKEN:');
    console.log('      Windows CMD:   set TEST_TOKEN=<token>');
    console.log('      Windows PS:    $env:TEST_TOKEN = "<token>"');
    console.log('      Linux/Mac:     export TEST_TOKEN="<token>"\n');
    console.log('🔑 TOKEN:\n');
    console.log(token);
    console.log('\n');

    return token;

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getAdminToken()
  .then(token => process.exit(0))
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
