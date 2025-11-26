const axios = require('axios');
const { Pool } = require('pg');

(async () => {
  console.log('\n🧪 TEST: Verificar que usuario tiene turnos\n');

  // 1. Login
  const loginResp = await axios.post('http://localhost:9998/api/v1/auth/login', {
    identifier: 'admin',
    password: 'admin123',
    companyId: 11
  });
  const token = loginResp.data.token;
  console.log('✅ Login OK');

  // 2. GET usuario desde API
  const userId = '0393c9cd-5ae4-410d-a9d9-9446b7f15bd2';
  const userResp = await axios.get(`http://localhost:9998/api/v1/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('\n📋 RESPUESTA DEL API:');
  console.log('   shifts:', userResp.data.shifts);
  console.log('   shiftNames:', userResp.data.shiftNames);
  console.log('   shiftIds:', userResp.data.shiftIds);

  // 3. Verificar directo en BD
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
  });

  const dbResult = await pool.query(`
    SELECT us.shift_id, s.name, s."startTime", s."endTime"
    FROM user_shifts us
    JOIN shifts s ON s.id = us.shift_id
    WHERE us.user_id = $1
  `, [userId]);

  console.log('\n📋 DIRECTO DESDE BD:');
  console.log(JSON.stringify(dbResult.rows, null, 2));

  await pool.end();

  // 4. Comparar
  if (!userResp.data.shifts || userResp.data.shifts.length === 0) {
    console.log('\n❌ ERROR: API no retorna shifts pero BD SÍ tiene:', dbResult.rows.length);
    console.log('   CAUSA: Servidor está cacheado o código viejo');
  } else {
    console.log('\n✅ API retorna shifts correctamente');
  }
})();
