/**
 * Script para migrar VendorMemory → AponntStaff en aponntDashboard.js
 * Ejecutar: node migrate-vendormemory-to-aponntstaff.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/aponntDashboard.js');

console.log('📝 Migrando VendorMemory → Aponnt Staff en aponntDashboard.js...');

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');

// 1. Comentar import de VendorMemory
content = content.replace(
  /^const VendorMemory = require\('\.\.\/models\/VendorMemory'\);$/gm,
  "// const VendorMemory = require('../models/VendorMemory'); // REMOVIDO - Ahora usa AponntStaff (Enero 2025)"
);

// 2. Reemplazar GET /vendors (findAll)
content = content.replace(
  /const vendors = await VendorMemory\.findAll\(\{ order: \[\['name', 'ASC'\]\] \}\);/g,
  `const vendors = await db.AponntStaff.findAll({
      where: { is_active: true },
      order: [['first_name', 'ASC'], ['last_name', 'ASC']]
    });`
);

// 3. Reemplazar GET /vendors/active (findActive)
content = content.replace(
  /const vendors = await VendorMemory\.VendorMemory\.findActive\(\);/g,
  `const vendors = await db.AponntStaff.findAll({
      where: { is_active: true },
      attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'phone'],
      order: [['first_name', 'ASC'], ['last_name', 'ASC']]
    });`
);

// 4. Reemplazar GET /vendors/:id (findByPk)
content = content.replace(
  /const vendor = await VendorMemory\.findByPk\(id\);/g,
  `const vendor = await db.AponntStaff.findByPk(id);`
);

// 5. Reemplazar POST /vendors (createVendor)
content = content.replace(
  /const vendor = await VendorMemory\.VendorMemory\.createVendor\(req\.body\);/g,
  `const vendor = await db.AponntStaff.create(req.body);`
);

// 6. Reemplazar PUT /vendors/:id (updateVendor)
content = content.replace(
  /const vendor = await VendorMemory\.VendorMemory\.updateVendor\(id, req\.body\);/g,
  `const [updated] = await db.AponntStaff.update(req.body, { where: { id } });
    if (!updated) throw new Error('Vendedor no encontrado');
    const vendor = await db.AponntStaff.findByPk(id);`
);

// 7. Reemplazar DELETE /vendors/:id (destroy)
content = content.replace(
  /const deleted = await VendorMemory\.destroy\(id\);/g,
  `const deleted = await db.AponntStaff.destroy({ where: { id } });`
);

// 8. Actualizar mensajes de consola
content = content.replace(
  /console\.log\('📋 Obteniendo vendedores'\);/g,
  "console.log('📋 Obteniendo vendedores (AponntStaff)');"
);

content = content.replace(
  /console\.log\('📋 Obteniendo vendedores activos'\);/g,
  "console.log('📋 Obteniendo vendedores activos (AponntStaff)');"
);

content = content.replace(
  /console\.log\(`📋 Obteniendo vendedor \$\{id\}`\);/g,
  "console.log(`📋 Obteniendo vendedor \\${id} (AponntStaff)`);"
);

content = content.replace(
  /console\.log\('➕ Creando nuevo vendedor:', req\.body\);/g,
  "console.log('➕ Creando nuevo vendedor (AponntStaff):', req.body);"
);

content = content.replace(
  /console\.log\(`✏️ Actualizando vendedor \$\{id\}:`, req\.body\);/g,
  "console.log(`✏️ Actualizando vendedor \\${id} (AponntStaff):`, req.body);"
);

content = content.replace(
  /console\.log\(`🗑️ Eliminando vendedor \$\{id\}`\);/g,
  "console.log(`🗑️ Eliminando vendedor \\${id} (AponntStaff)`);"
);

// Escribir archivo modificado
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Migración completada exitosamente!');
console.log('');
console.log('Cambios aplicados:');
console.log('  - VendorMemory import comentado');
console.log('  - 6 rutas migradas a db.AponntStaff');
console.log('  - Mensajes de log actualizados');
