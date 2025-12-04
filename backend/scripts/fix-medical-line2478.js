const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Corrigiendo línea 2478...');

// Fix específico para línea 2478
content = content.replace(
    /openCloseCaseModal\('\$\{c\.id\}', '\$\{c\.employee_name \|\| 'N\/A'\}'\)/g,
    `openCloseCaseModal('\${c.id}', '\${c.employee_name || "N/A"}')`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ [FIX] Línea 2478 corregida');
