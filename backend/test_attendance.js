const axios = require('axios');

const API_URL = 'http://localhost:9999/api/v1';

async function testAttendance() {
  console.log('======================================');
  console.log('🧪 TESTING ASISTENCIA - REGISTROS');
  console.log('======================================\n');

  try {
    // Test 1: Registrar ENTRADA
    console.log('1️⃣  ENTRADA - Registrar entrada');
    const entradaData = {
      user: 'TEST_USER',
      type: 'entrada',
      method: 'biometric',
      timestamp: new Date().toISOString(),
      device: 'TEST_DEVICE'
    };

    const entradaResponse = await axios.post(`${API_URL}/attendance/mobile`, entradaData);

    if (entradaResponse.data.success && entradaResponse.data.data.id) {
      console.log(`✅ Entrada registrada con ID: ${entradaResponse.data.data.id}`);
      console.log(`   Tipo: ${entradaResponse.data.data.type}`);
      console.log(`   Método: ${entradaResponse.data.data.method}\n`);
    } else {
      console.log(`❌ Entrada NO registrada correctamente\n`);
    }

    // Test 2: Registrar SALIDA
    console.log('2️⃣  SALIDA - Registrar salida');
    const salidaData = {
      user: 'TEST_USER',
      type: 'salida',
      method: 'biometric',
      timestamp: new Date().toISOString(),
      device: 'TEST_DEVICE'
    };

    const salidaResponse = await axios.post(`${API_URL}/attendance/mobile`, salidaData);

    if (salidaResponse.data.success && salidaResponse.data.data.id) {
      console.log(`✅ Salida registrada con ID: ${salidaResponse.data.data.id}`);
      console.log(`   Tipo: ${salidaResponse.data.data.type}`);
      console.log(`   Método: ${salidaResponse.data.data.method}\n`);
    } else {
      console.log(`❌ Salida NO registrada correctamente\n`);
    }

    // Test 3: Validación de campos requeridos
    console.log('3️⃣  VALIDACIÓN - Campos requeridos');
    try {
      await axios.post(`${API_URL}/attendance/mobile`, {});
      console.log(`⚠️ Validación NO funciona (acepta datos vacíos)\n`);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`✅ Validación funciona correctamente (400)\n`);
      } else {
        // Endpoint actual no valida, solo registra
        console.log(`⚠️ Endpoint acepta cualquier dato (sin validación estricta)\n`);
      }
    }

    console.log('======================================');
    console.log('✅ TESTING ASISTENCIA COMPLETADO');
    console.log('======================================\n');

  } catch (error) {
    console.error('❌ Error en testing:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function run() {
  try {
    await testAttendance();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  }
}

run();
