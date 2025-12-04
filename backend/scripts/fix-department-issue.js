const { Sequelize } = require('sequelize');
const seq = new Sequelize('postgresql://postgres:Aedr15150302@localhost:5432/attendance_system', { logging: false });

async function fixDepartmentIssue() {
  try {
    // Ver departamentos existentes para company 11
    const [depts] = await seq.query('SELECT id, name FROM departments WHERE company_id = 11 ORDER BY id');
    console.log('=== DEPARTAMENTOS EXISTENTES (company 11) ===');
    depts.forEach(d => console.log('ID:', d.id, '| Nombre:', d.name));

    // Ver el usuario problemático
    const [users] = await seq.query(`SELECT user_id, "employeeId", department_id, biometric_photo_url FROM users WHERE "employeeId" = 'EMP-ISI-001'`);
    console.log('\n=== USUARIO EMP-ISI-001 ===');
    if (users[0]) {
      console.log('UUID:', users[0].user_id);
      console.log('Department ID actual:', users[0].department_id);
      console.log('Photo URL:', users[0].biometric_photo_url || 'NULL');

      // Si department_id es 13 y no existe, buscar uno válido
      const currentDeptId = parseInt(users[0].department_id);
      const validDeptIds = depts.map(d => d.id);
      if (!validDeptIds.includes(currentDeptId)) {
        console.log('\n⚠️ Department 13 NO EXISTE - Buscando departamento válido...');

        if (depts.length > 0) {
          const validDeptId = depts[0].id;
          console.log('✅ Usando departamento:', validDeptId, '-', depts[0].name);

          // Actualizar usuario con departamento válido
          await seq.query(`UPDATE users SET department_id = $1 WHERE user_id = $2`, {
            bind: [validDeptId, users[0].user_id]
          });
          console.log('✅ Usuario actualizado con department_id:', validDeptId);

          // Ahora actualizar la foto biométrica
          const photoUrl = '/uploads/biometric-photos/11_EMP-ISI-001_1764549655638.jpg';
          await seq.query(`UPDATE users SET biometric_photo_url = $1, biometric_photo_date = NOW() WHERE user_id = $2`, {
            bind: [photoUrl, users[0].user_id]
          });
          console.log('✅ biometric_photo_url actualizado:', photoUrl);

          // Verificar
          const [verify] = await seq.query(`SELECT biometric_photo_url, department_id FROM users WHERE user_id = $1`, {
            bind: [users[0].user_id]
          });
          console.log('\n=== VERIFICACIÓN FINAL ===');
          console.log('Photo URL:', verify[0].biometric_photo_url);
          console.log('Department ID:', verify[0].department_id);
        } else {
          console.log('❌ No hay departamentos válidos para company 11');
        }
      }
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
  await seq.close();
}

fixDepartmentIssue();
