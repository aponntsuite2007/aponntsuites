const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/attendanceRoutes.js');

console.log('📝 Leyendo attendanceRoutes.js...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔄 Arreglando código corrupto del script anterior...');

// Buscar y reemplazar el bloque corrupto
const corruptedCode = `    // Combinar fecha y hora - usar Date objects\\r\\n    const check_in_datetime = time_in ? new Date() : new Date();\\r\\n    const check_out_datetime = time_out ? new Date() : null;\\r\\n\\r\\n    // Crear asistencia\\r\\n    const attendance = await Attendance.create({\\r\\n      user_id,\\r\\n      company_id: req.user.company_id,\\r\\n      date: date, // Fecha en formato YYYY-MM-DD\\r\\n      check_in: check_in_datetime, // Date object (NOT NULL)\\r\\n      check_out: check_out_datetime, // Date object (nullable)\\r\\n      isManualEntry: true,\\r\\n      checkInMethod: 'manual',\\r\\n      notes: \\r\\n    });`;

const fixedCode = `    // Combinar fecha y hora - usar Date objects
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

if (content.includes(corruptedCode)) {
  content = content.replace(corruptedCode, fixedCode);
  console.log('✅ Código corrupto reparado');
} else {
  console.log('⚠️ Patrón exacto no encontrado, intentando con regex...');

  // Intentar con patrón flexible
  const pattern = /\/\/ Combinar fecha y hora - usar Date objects[^]*?notes:\s*\r?\n\s*\}\);/;

  if (pattern.test(content)) {
    content = content.replace(pattern, fixedCode);
    console.log('✅ Código reparado con regex');
  } else {
    console.log('❌ No se pudo encontrar el código corrupto');
    console.log('\n📄 Mostrando líneas 58-70:');
    const lines = content.split('\n');
    for (let i = 57; i < 71; i++) {
      console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
    }
    process.exit(1);
  }
}

console.log('💾 Guardando cambios...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Archivo reparado exitosamente!');
console.log('   ✓ Eliminados \\r\\n literales');
console.log('   ✓ Arreglado check_in_datetime con fecha+hora');
console.log('   ✓ Arreglado check_out_datetime con fecha+hora');
console.log('   ✓ Agregado campo notes con template string');
