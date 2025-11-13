const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/attendanceRoutes.js');

console.log('📝 Corrigiendo kiosk_id...');
let content = fs.readFileSync(filePath, 'utf8');

// Revertir a."kioskId" → a.kiosk_id (la columna real es snake_case)
content = content.replace(/a\."kioskId"/g, 'a.kiosk_id');

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ kiosk_id corregido');
