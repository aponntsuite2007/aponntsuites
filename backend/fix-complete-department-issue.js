const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

(async () => {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'attendance_system',
    user: 'postgres',
    password: 'Aedr15150302'
  });

  console.log('\n🔧 FIX COMPLETO: Departamento\n');

  // 1. Actualizar department_id inválido (1) a uno válido (9)
  const userId = '0393c9cd-5ae4-410d-a9d9-9446b7f15bd2';

  console.log('📝 Paso 1: Actualizando department_id de 1 → 9 (Administración Central)');
  await pool.query(`
    UPDATE users SET department_id = 9 WHERE user_id = $1
  `, [userId]);
  console.log('✅ Department_id actualizado\n');

  await pool.end();

  // 2. Agregar lookup de department name en userRoutes.js
  console.log('📝 Paso 2: Modificando userRoutes.js para retornar department name');

  const filePath = path.join(__dirname, 'src/routes/userRoutes.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Agregar variable departmentName
  content = content.replace(
    'let shifts = [];\n    let shiftIds = [];\n    let shiftNames = [];',
    'let shifts = [];\n    let shiftIds = [];\n    let shiftNames = [];\n    let departmentName = null;'
  );

  // Agregar query de department antes de pool.end()
  content = content.replace(
    "console.log(`✅ [TURNOS] Usuario tiene \\${shiftIds.length} turno(s) asignado(s):`, shiftNames.join(', '));\n      await pool.end();",
    `console.log(\`✅ [TURNOS] Usuario tiene \\\${shiftIds.length} turno(s) asignado(s):\`, shiftNames.join(', '));

      // ⚠️ FIX: Obtener nombre del departamento
      if (user.department_id) {
        const deptResult = await pool.query(\`
          SELECT name FROM departments WHERE id = $1
        \`, [user.department_id]);

        if (deptResult.rows.length > 0) {
          departmentName = deptResult.rows[0].name;
          console.log(\`✅ [DEPARTAMENTO] Usuario asignado a: \\\${departmentName} (ID: \\\${user.department_id})\`);
        } else {
          console.log(\`⚠️ [DEPARTAMENTO] ID \\\${user.department_id} no encontrado\`);
        }
      }

      await pool.end();`
  );

  // Agregar departmentName al formattedUser
  content = content.replace(
    'formattedUser.shifts = shifts;\n    formattedUser.shiftIds = shiftIds;\n    formattedUser.shiftNames = shiftNames;',
    'formattedUser.shifts = shifts;\n    formattedUser.shiftIds = shiftIds;\n    formattedUser.shiftNames = shiftNames;\n    formattedUser.departmentName = departmentName;'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ userRoutes.js modificado\n');

  // 3. Actualizar frontend para mostrar department name
  console.log('📝 Paso 3: Modificando users.js frontend');

  const frontendPath = path.join(__dirname, 'public/js/modules/users.js');
  let frontendContent = fs.readFileSync(frontendPath, 'utf8');

  // Reemplazar "Asignado" hardcoded por el nombre real
  frontendContent = frontendContent.replace(
    '<div class="info-value" id="admin-department">${user.departmentId ? \'Asignado\' : \'Sin departamento\'}</div>',
    '<div class="info-value" id="admin-department">${user.departmentName || user.departmentId || \'Sin departamento\'}</div>'
  );

  fs.writeFileSync(frontendPath, frontendContent, 'utf8');
  console.log('✅ users.js frontend modificado\n');

  console.log('✅✅✅ FIX COMPLETO APLICADO ✅✅✅\n');
  console.log('🔄 Ahora reinicia el servidor (PORT=9999 npm start)');
  console.log('📋 Y verifica que el departamento se muestre correctamente');
})();
