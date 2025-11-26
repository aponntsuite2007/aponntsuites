/**
 * Fix rápido: Agregar AponntStaff a imports y reemplazar db.AponntStaff → AponntStaff
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/aponntDashboard.js');

console.log('🔧 Arreglando imports de AponntStaff...');

let content = fs.readFileSync(filePath, 'utf8');

// 1. Agregar AponntStaff al import de database.js
content = content.replace(
  /const \{ sequelize, Company, User, Branch \} = require\('\.\.\/config\/database'\);/,
  "const { sequelize, Company, User, Branch, AponntStaff } = require('../config/database');"
);

// 2. Reemplazar todas las referencias de db.AponntStaff por AponntStaff
content = content.replace(/db\.AponntStaff/g, 'AponntStaff');

// Escribir archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fix aplicado correctamente!');
console.log('');
console.log('Cambios:');
console.log('  - AponntStaff agregado a imports (línea 13)');
console.log('  - db.AponntStaff → AponntStaff (todas las referencias)');
