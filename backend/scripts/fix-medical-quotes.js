const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/medical-dashboard-professional.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Fijando comillas anidadas en medical-dashboard-professional.js...');

// Fix 1: openDiagnosisModal calls
content = content.replace(
    /onclick="openDiagnosisModal\('(\$\{c\.id\})', '(\$\{c\.employee_name \|\| 'N\/A'\})'\)"/g,
    `onclick="openDiagnosisModal('$1', '$2'.replace(/'/g, ''))"`.replace(`'N/A'`, `&quot;N/A&quot;`)
);

// Mejor approach: escapar las comillas dentro del template literal
content = content.replace(
    /'(\$\{c\.employee_name \|\| 'N\/A'\})'/g,
    (match, group) => {
        // Cambiar 'N/A' a "N/A" para evitar conflicto de comillas
        return `'\${c.employee_name || "N/A"}'`;
    }
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Archivo corregido exitosamente!');
