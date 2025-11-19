const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/userRoutes.js');
let content = fs.readFileSync(filePath, 'utf8');

// Paso 1: Agregar variable departmentName
const pattern1 = `    let shifts = [];
    let shiftIds = [];
    let shiftNames = [];
    try {`;

const replacement1 = `    let shifts = [];
    let shiftIds = [];
    let shiftNames = [];
    let departmentName = null;
    try {`;

if (content.includes(pattern1)) {
  content = content.replace(pattern1, replacement1);
  console.log('✅ Paso 1: Agregada variable departmentName');
} else {
  console.log('❌ No se encontró el patrón para paso 1');
  console.log('Buscando:', pattern1);
  process.exit(1);
}

// Paso 2: Agregar query de department antes de pool.end()
const pattern2 = `      console.log(\`✅ [TURNOS] Usuario tiene \${shiftIds.length} turno(s) asignado(s):\`, shiftNames.join(', '));
      await pool.end();`;

const replacement2 = `      console.log(\`✅ [TURNOS] Usuario tiene \${shiftIds.length} turno(s) asignado(s):\`, shiftNames.join(', '));

      // ⚠️ FIX: Obtener nombre del departamento
      if (user.department_id) {
        const deptResult = await pool.query(\`
          SELECT name FROM departments WHERE id = $1
        \`, [user.department_id]);

        if (deptResult.rows.length > 0) {
          departmentName = deptResult.rows[0].name;
          console.log(\`✅ [DEPARTAMENTO] Usuario asignado a: \${departmentName} (ID: \${user.department_id})\`);
        } else {
          console.log(\`⚠️ [DEPARTAMENTO] ID \${user.department_id} no encontrado\`);
        }
      }

      await pool.end();`;

if (content.includes(pattern2)) {
  content = content.replace(pattern2, replacement2);
  console.log('✅ Paso 2: Agregada consulta de departmentName');
} else {
  console.log('❌ No se encontró el patrón para paso 2');
  console.log('Buscando:', pattern2);
  process.exit(1);
}

// Paso 3: Agregar departmentName al formattedUser
const pattern3 = `    // Agregar turnos completos, IDs y nombres al usuario formateado
    formattedUser.shifts = shifts;
    formattedUser.shiftIds = shiftIds;
    formattedUser.shiftNames = shiftNames;`;

const replacement3 = `    // Agregar turnos completos, IDs y nombres al usuario formateado
    formattedUser.shifts = shifts;
    formattedUser.shiftIds = shiftIds;
    formattedUser.shiftNames = shiftNames;
    formattedUser.departmentName = departmentName;`;

if (content.includes(pattern3)) {
  content = content.replace(pattern3, replacement3);
  console.log('✅ Paso 3: Agregado departmentName al formattedUser');
} else {
  console.log('❌ No se encontró el patrón para paso 3');
  console.log('Buscando:', pattern3);
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅✅✅ FIX COMPLETO APLICADO ✅✅✅');
console.log('📝 Ahora el endpoint GET /api/v1/users/:id retornará departmentName');
