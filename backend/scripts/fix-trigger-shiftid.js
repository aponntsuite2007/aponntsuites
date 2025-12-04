const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'migrations', '20250129_create_medical_system_complete.sql');

console.log('🔧 [FIX] Arreglando trigger assign_doctor_to_case()...');

let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar u."shiftId" por u.shift_id en el trigger
const oldPattern = 'LEFT JOIN shifts s ON u."shiftId" = s.id';
const newPattern = 'LEFT JOIN shifts s ON u.shift_id = s.id';

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ [FIX] Trigger actualizado correctamente');
    console.log(`   Cambio: ${oldPattern} → ${newPattern}`);
} else if (content.includes(newPattern)) {
    console.log('✅ [SKIP] Trigger ya está corregido');
} else {
    console.log('❌ [ERROR] No se encontró el patrón a reemplazar');
    process.exit(1);
}
