const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/attendanceRoutes.js');

console.log('📝 Leyendo attendanceRoutes.js...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔄 Reemplazando campos incorrectos en endpoint POST /...');

// Buscar y reemplazar el bloque de creación de asistencia
const oldCode = `    // Combinar fecha y hora
    const attendance_date = new Date(date);

    // Crear asistencia
    const attendance = await Attendance.create({
      user_id,
      company_id: req.user.company_id,
      attendance_date,
      check_in_time: time_in ? \`\${date}T\${time_in}\` : null,
      check_out_time: time_out ? \`\${date}T\${time_out}\` : null,
      status,
      method: 'manual',
      created_by: req.user.user_id
    });`;

const newCode = `    // Combinar fecha y hora - usar Date objects
    const check_in_datetime = time_in ? new Date(\`\${date}T\${time_in}\`) : new Date();
    const check_out_datetime = time_out ? new Date(\`\${date}T\${time_out}\`) : null;

    // Crear asistencia
    const attendance = await Attendance.create({
      user_id,
      company_id: req.user.company_id,
      date: date, // Fecha en formato YYYY-MM-DD
      check_in: check_in_datetime, // Date object (NOT NULL)
      check_out: check_out_datetime, // Date object (nullable)
      isManualEntry: true,
      checkInMethod: 'manual',
      notes: \`Creado por \${req.user.usuario || req.user.user_id}\`
    });`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  console.log('✅ Código reemplazado');
} else {
  console.log('⚠️ Código original no encontrado (puede que ya esté modificado)');
  console.log('\n🔍 Buscando patrón alternativo...\n');

  // Patrón alternativo más flexible
  const altPattern = /const attendance_date = new Date\(date\);[\s\S]*?await Attendance\.create\(\{[\s\S]*?attendance_date,[\s\S]*?check_in_time:[\s\S]*?check_out_time:[\s\S]*?method: 'manual',[\s\S]*?created_by: req\.user\.user_id[\s\S]*?\}\);/;

  if (altPattern.test(content)) {
    console.log('✅ Patrón encontrado con regex');
    content = content.replace(altPattern, newCode);
  } else {
    console.log('❌ No se pudo encontrar el código a reemplazar');
    process.exit(1);
  }
}

console.log('💾 Guardando cambios...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Cambio completado!');
console.log('   Ahora el endpoint usa:');
console.log('   - date (YYYY-MM-DD)');
console.log('   - check_in (Date object, NOT NULL)');
console.log('   - check_out (Date object, nullable)');
