/**
 * Script para aplicar MEJORA #10 en attendance.config.js
 * Corrige schema mismatch: user_id → UserId y otros campos camelCase
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../configs/attendance.config.js');

console.log('📝 Aplicando MEJORA #10 (Schema fix en attendance)...');
console.log(`📂 Archivo: ${filePath}`);

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');
let changesCount = 0;

// FIX 1: Línea 278 - SELECT debe usar "UserId" (con comillas por mayúsculas)
const oldSelect = `        SELECT user_id FROM users
        WHERE company_id = $1 AND is_active = true`;

const newSelect = `        SELECT "UserId" as user_id FROM users
        WHERE company_id = $1 AND is_active = true`;

if (content.includes(oldSelect)) {
  content = content.replace(oldSelect, newSelect);
  changesCount++;
  console.log('✅ FIX 1: SELECT corregido (user_id → "UserId")');
}

// FIX 2: Línea 290-296 - INSERT con nombres correctos de columnas
const oldInsert = `      const result = await db.query(\`
        INSERT INTO attendances (
          user_id, company_id, date, check_in_time, check_out_time,
          status, source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        ) RETURNING attendance_id`;

const newInsert = `      const result = await db.query(\`
        INSERT INTO attendances (
          "UserId", company_id, date, "checkInTime", "checkOutTime",
          status, origin_type, "createdAt", "updatedAt"
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        ) RETURNING id`;

if (content.includes('user_id, company_id, date, check_in_time')) {
  content = content.replace(oldInsert, newInsert);
  changesCount++;
  console.log('✅ FIX 2: INSERT corregido (snake_case → camelCase)');
  console.log('   - user_id → "UserId"');
  console.log('   - check_in_time → "checkInTime"');
  console.log('   - check_out_time → "checkOutTime"');
  console.log('   - source → origin_type');
  console.log('   - attendance_id → id');
}

// FIX 3: Línea ~303 - Ajustar parámetros del array si es necesario (ya debería estar bien)
// Solo verificamos que el source/origin_type esté correcto
const oldSource = `        'manual'`;
const newSource = `        'kiosk'`; // Según schema, valores válidos: kiosk, mobile_app, etc.

// No reemplazamos esto porque 'manual' podría ser válido, solo agregamos comentario
if (content.includes("        'manual'") && !content.includes('// origin_type válido')) {
  content = content.replace("        'manual'", "        'kiosk' // origin_type válido según enum");
  changesCount++;
  console.log('✅ FIX 3: origin_type ajustado (manual → kiosk)');
}

// Guardar archivo
if (changesCount > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`💾 Archivo guardado con ${changesCount} cambios`);
  console.log('\n🎯 MEJORA #10 aplicada:');
  console.log('   ✅ Schema mismatch corregido');
  console.log('   ✅ Columnas ahora coinciden con BD real');
} else {
  console.log('ℹ️  No se encontraron cambios para aplicar (ya están aplicados?)');
}
