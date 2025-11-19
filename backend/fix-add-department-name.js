const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/userRoutes.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the section where we need to add department name lookup
const searchPattern = `    let shifts = [];
    let shiftIds = [];
    let shiftNames = [];
    try {`;

const replacement = `    let shifts = [];
    let shiftIds = [];
    let shiftNames = [];
    let departmentName = null;

    try {`;

// Replace the pattern
if (content.includes(searchPattern)) {
  content = content.replace(searchPattern, replacement);
  console.log('✅ Paso 1: Agregada variable departmentName');
} else {
  console.log('❌ No se encontró el patrón para paso 1');
  process.exit(1);
}

// Now find where to add the department query (after shifts query, before pool.end())
const searchPattern2 = `      console.log(\`✅ [TURNOS] Usuario tiene \${shiftIds.length} turno(s) asignado(s):\`, shiftNames.join(', '));
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
          console.log(\`⚠️ [DEPARTAMENTO] ID \${user.department_id} no encontrado en tabla departments\`);
        }
      }

      await pool.end();`;

if (content.includes(searchPattern2)) {
  content = content.replace(searchPattern2, replacement2);
  console.log('✅ Paso 2: Agregada consulta de nombre de departamento');
} else {
  console.log('❌ No se encontró el patrón para paso 2');
  process.exit(1);
}

// Now add departmentName to the formattedUser object
const searchPattern3 = `    // Agregar turnos completos, IDs y nombres al usuario formateado
    formattedUser.shifts = shifts;
    formattedUser.shiftIds = shiftIds;
    formattedUser.shiftNames = shiftNames;`;

const replacement3 = `    // Agregar turnos completos, IDs y nombres al usuario formateado
    formattedUser.shifts = shifts;
    formattedUser.shiftIds = shiftIds;
    formattedUser.shiftNames = shiftNames;
    formattedUser.departmentName = departmentName;`;

if (content.includes(searchPattern3)) {
  content = content.replace(searchPattern3, replacement3);
  console.log('✅ Paso 3: Agregado departmentName al usuario formateado');
} else {
  console.log('❌ No se encontró el patrón para paso 3');
  process.exit(1);
}

// Write the modified content back
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ ARCHIVO MODIFICADO EXITOSAMENTE');
console.log('📝 Ahora el endpoint GET /api/v1/users/:id retornará departmentName');
