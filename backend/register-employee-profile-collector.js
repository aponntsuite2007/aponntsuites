/**
 * SCRIPT: Registrar EmployeeProfileCollector en auditorRoutes.js
 *
 * Este script agrega el import y el registro del EmployeeProfileCollector
 * en el archivo auditorRoutes.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'auditorRoutes.js');

console.log('📝 Registrando EmployeeProfileCollector en auditorRoutes.js...\n');

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// 1. Agregar import
const importLine = `      const EmployeeProfileCollector = require('../auditor/collectors/EmployeeProfileCollector');`;
const importPattern = /const AdvancedUserSimulationCollector = require\('\.\.\/auditor\/collectors\/AdvancedUserSimulationCollector'\);/;

if (content.includes('EmployeeProfileCollector')) {
    console.log('✅ EmployeeProfileCollector ya está importado');
} else {
    content = content.replace(
        importPattern,
        `const AdvancedUserSimulationCollector = require('../auditor/collectors/AdvancedUserSimulationCollector');\n${importLine}`
    );
    console.log('✅ Import agregado');
}

// 2. Agregar registro
const registerLine = `      // ✅ HABILITADO: EmployeeProfileCollector - Tests de perfil de empleado desde frontend\n      auditorEngine.registerCollector('employee-profile', new EmployeeProfileCollector(database, systemRegistry));`;

const registerPattern = /\/\/ ✅ HABILITADO: AndroidKioskCollector para auditar APK\s+auditorEngine\.registerCollector\('android-kiosk', new AndroidKioskCollector\(database, systemRegistry\)\);/;

if (content.includes("'employee-profile'")) {
    console.log('✅ EmployeeProfileCollector ya está registrado');
} else {
    content = content.replace(
        registerPattern,
        `// ✅ HABILITADO: AndroidKioskCollector para auditar APK\n      auditorEngine.registerCollector('android-kiosk', new AndroidKioskCollector(database, systemRegistry));\n\n${registerLine}`
    );
    console.log('✅ Registro agregado');
}

// Guardar archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ COMPLETADO: EmployeeProfileCollector registrado en auditorRoutes.js\n');
console.log('📋 Ahora el collector se ejecutará automáticamente cuando se lance una auditoría.\n');
