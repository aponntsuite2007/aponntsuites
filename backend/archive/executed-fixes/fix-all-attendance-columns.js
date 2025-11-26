const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/attendanceRoutes.js');

console.log('📝 Leyendo attendanceRoutes.js...');
let content = fs.readFileSync(filePath, 'utf8');

// Mapeo de columnas snake_case → camelCase (con comillas para PostgreSQL)
const columnMapping = {
  'a\\.check_in': 'a."checkInTime"',
  'a\\.check_out': 'a."checkOutTime"',
  'a\\.kiosk_id': 'a."kioskId"',
  'DATE\\(a\\.check_in\\)': 'DATE(a."checkInTime")',
  'a\\.status': 'a.status', // Este está bien
  'a\\.id': 'a.id' // Este está bien
};

let totalChanges = 0;

Object.entries(columnMapping).forEach(([oldPattern, newValue]) => {
  const regex = new RegExp(oldPattern, 'g');
  const matches = content.match(regex);
  if (matches && matches.length > 0) {
    content = content.replace(regex, newValue);
    console.log(`✅ ${oldPattern} → ${newValue}: ${matches.length} cambios`);
    totalChanges += matches.length;
  }
});

fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ Archivo actualizado exitosamente`);
console.log(`📊 Total de cambios: ${totalChanges}`);
