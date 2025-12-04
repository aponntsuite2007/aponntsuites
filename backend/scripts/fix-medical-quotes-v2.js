const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 [FIX] Corrigiendo comillas anidadas...');

// Replace all instances of the problematic pattern
// Change: ${c.employee_name || 'N/A'}
// To: ${c.employee_name || "N/A"}

content = content.split("${c.employee_name || 'N/A'}").join('${c.employee_name || "N/A"}');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ [FIX] Archivo corregido - comillas simples reemplazadas por dobles en fallback');
