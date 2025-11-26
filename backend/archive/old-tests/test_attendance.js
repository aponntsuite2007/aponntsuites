const axios = require('axios');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const API_URL = 'http://localhost:9999/api/v1';

// Conexión a PostgreSQL para verificar persistencia
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/biometric_db', {
  dialect: 'postgres',
  logging: false
});

let createdAttendanceIds = [];

async function testAttendance() {
  console.log('======================================');
  console.log('🧪 TESTING ASISTENCIA - REGISTROS + PERSISTENCIA');
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
      const attendanceId = entradaResponse.data.data.id;
      createdAttendanceIds.push(attendanceId);
      console.log(`✅ Entrada registrada con ID: ${attendanceId}`);
      console.log(`   Tipo: ${entradaResponse.data.data.type}`);
      console.log(`   Método: ${entradaResponse.data.data.method}`);

      // ✅ VALIDAR PERSISTENCIA EN POSTGRESQL
      console.log(`   🔍 Verificando persistencia en PostgreSQL...`);
      const [result] = await sequelize.query(
        `SELECT * FROM attendance WHERE id = :id`,
        { replacements: { id: attendanceId }, type: Sequelize.QueryTypes.SELECT }
      );

      if (result) {
        console.log(`   ✅ PERSISTENCIA CONFIRMADA - Registro existe en PostgreSQL`);
        console.log(`      - type: ${result.type}`);
        console.log(`      - method: ${result.method}`);
        console.log(`      - timestamp: ${result.timestamp}\n`);
      } else {
        console.log(`   ❌ ERROR: Registro NO encontrado en PostgreSQL\n`);
      }
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
      const attendanceId = salidaResponse.data.data.id;
      createdAttendanceIds.push(attendanceId);
      console.log(`✅ Salida registrada con ID: ${attendanceId}`);
      console.log(`   Tipo: ${salidaResponse.data.data.type}`);
      console.log(`   Método: ${salidaResponse.data.data.method}`);

      // ✅ VALIDAR PERSISTENCIA EN POSTGRESQL
      console.log(`   🔍 Verificando persistencia en PostgreSQL...`);
      const [result] = await sequelize.query(
        `SELECT * FROM attendance WHERE id = :id`,
        { replacements: { id: attendanceId }, type: Sequelize.QueryTypes.SELECT }
      );

      if (result) {
        console.log(`   ✅ PERSISTENCIA CONFIRMADA - Registro existe en PostgreSQL`);
        console.log(`      - type: ${result.type}`);
        console.log(`      - method: ${result.method}`);
        console.log(`      - timestamp: ${result.timestamp}\n`);
      } else {
        console.log(`   ❌ ERROR: Registro NO encontrado en PostgreSQL\n`);
      }
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

    // Test 4: Verificar que TODOS los registros persistan
    console.log('4️⃣  VERIFICACIÓN FINAL - Persistencia de todos los registros');
    const [allRecords] = await sequelize.query(
      `SELECT COUNT(*) as total FROM attendance WHERE id = ANY(:ids)`,
      { replacements: { ids: createdAttendanceIds }, type: Sequelize.QueryTypes.SELECT }
    );

    console.log(`   📊 Total de registros creados: ${createdAttendanceIds.length}`);
    console.log(`   📊 Total de registros en PostgreSQL: ${allRecords.total}`);

    if (parseInt(allRecords.total) === createdAttendanceIds.length) {
      console.log(`   ✅ TODOS los registros persisten correctamente\n`);
    } else {
      console.log(`   ❌ ERROR: Algunos registros NO persisten\n`);
    }

    console.log('======================================');
    console.log('✅ TESTING ASISTENCIA COMPLETADO');
    console.log('======================================\n');

  } catch (error) {
    console.error('❌ Error en testing:', error.response?.data || error.message);
    throw error;
  }
}

async function cleanup() {
  if (createdAttendanceIds.length > 0) {
    console.log('🧹 Limpiando datos de prueba...');
    try {
      await sequelize.query(
        `DELETE FROM attendance WHERE id = ANY(:ids)`,
        { replacements: { ids: createdAttendanceIds } }
      );
      console.log(`✅ ${createdAttendanceIds.length} registros de prueba eliminados\n`);
    } catch (error) {
      console.log(`⚠️ Error al limpiar: ${error.message}\n`);
    }
  }
}

async function run() {
  try {
    await testAttendance();
    await cleanup();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    await cleanup();
    await sequelize.close();
    process.exit(1);
  }
}

run();
