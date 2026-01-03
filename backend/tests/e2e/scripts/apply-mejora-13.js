/**
 * Script para aplicar MEJORA #13
 * Completar fix de schema en attendance.config.js
 *
 * MEJORA #10 fue parcial, falta corregir más campos
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../configs/attendance.config.js');

console.log('📝 Aplicando MEJORA #13 (Completar fix schema attendance)...');
console.log(`📂 Archivo: ${filePath}`);

// Leer archivo
let content = fs.readFileSync(filePath, 'utf8');
let changesCount = 0;

// FIX 1: Corregir INSERT statement completo (líneas 290-296)
// El problema es que tiene user_id, check_in_time, check_out_time, source, attendance_id
// Debe ser "UserId", "checkInTime", "checkOutTime", origin_type, id

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
          $1::uuid, $2, $3, $4::timestamp, $5::timestamp, $6, $7, NOW(), NOW()
        ) RETURNING id`;

if (content.includes('user_id, company_id, date, check_in_time, check_out_time')) {
  content = content.replace(oldInsert, newInsert);
  changesCount++;
  console.log('✅ FIX 1: INSERT statement corregido completamente');
  console.log('   - user_id → "UserId" (uuid)');
  console.log('   - check_in_time → "checkInTime" (timestamp)');
  console.log('   - check_out_time → "checkOutTime" (timestamp)');
  console.log('   - source → origin_type');
  console.log('   - attendance_id → id');
}

// FIX 2: Corregir el cleanup statement si existe
const oldCleanup = `      await db.query(\`
        DELETE FROM attendances WHERE attendance_id = $1`;

const newCleanup = `      await db.query(\`
        DELETE FROM attendances WHERE id = $1`;

if (content.includes('attendance_id = $1')) {
  content = content.replace(oldCleanup, newCleanup);
  changesCount++;
  console.log('✅ FIX 2: Cleanup statement corregido (attendance_id → id)');
}

// FIX 3: Actualizar return statement
const oldReturn = `      return result.rows[0].attendance_id;`;
const newReturn = `      return result.rows[0].id;`;

if (content.includes('attendance_id;')) {
  content = content.replace(oldReturn, newReturn);
  changesCount++;
  console.log('✅ FIX 3: Return statement corregido');
}

// Guardar archivo
if (changesCount > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`💾 Archivo guardado con ${changesCount} cambios`);
  console.log('\n🎯 MEJORA #13 aplicada:');
  console.log('   ✅ Schema completamente alineado con BD real');
  console.log('   ✅ Todos los nombres de columnas corregidos');
  console.log('   ✅ Tipos de datos explícitos (uuid, timestamp)');
} else {
  console.log('ℹ️  No se encontraron cambios para aplicar (ya están aplicados?)');
}
