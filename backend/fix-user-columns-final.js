const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.js');

console.log('📝 Leyendo server.js...');
let content = fs.readFileSync(filePath, 'utf8');

// FIX 1: emergencyContact (camelCase doesn't exist, snake_case does)
const fix1Search = 'u."emergencyContact" AS "emergencyContact"';
const fix1Replace = 'u.emergency_contact AS "emergencyContact"';

// FIX 2: Remove emergencyPhone line (column doesn't exist)
const fix2Search = ',\n        u."emergencyPhone" AS "emergencyPhone"';
const fix2Replace = '';

// FIX 3: createdAt → created_at
const fix3Search = 'u."createdAt" AS "createdAt"';
const fix3Replace = 'u.created_at AS "createdAt"';

// FIX 4: updatedAt → updated_at
const fix4Search = 'u."updatedAt" AS "updatedAt"';
const fix4Replace = 'u.updated_at AS "updatedAt"';

let fixed = false;

if (content.includes(fix1Search)) {
    console.log('✅ Aplicando FIX 1: emergency_contact');
    content = content.replace(fix1Search, fix1Replace);
    fixed = true;
}

if (content.includes(fix2Search)) {
    console.log('✅ Aplicando FIX 2: Eliminando emergencyPhone (no existe)');
    content = content.replace(fix2Search, fix2Replace);
    fixed = true;
}

if (content.includes(fix3Search)) {
    console.log('✅ Aplicando FIX 3: created_at');
    content = content.replace(fix3Search, fix3Replace);
    fixed = true;
}

if (content.includes(fix4Search)) {
    console.log('✅ Aplicando FIX 4: updated_at');
    content = content.replace(fix4Search, fix4Replace);
    fixed = true;
}

if (fixed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('\n✅ Todos los fixes aplicados exitosamente!');
    console.log('\n📋 Resumen de cambios:');
    console.log('   1. u."emergencyContact" → u.emergency_contact');
    console.log('   2. Removida línea u."emergencyPhone" (no existe en BD)');
    console.log('   3. u."createdAt" → u.created_at');
    console.log('   4. u."updatedAt" → u.updated_at');
    console.log('\n🔄 Ahora reinicia el servidor para que tome efecto');
} else {
    console.log('⚠️  Los fixes ya están aplicados o los strings no coinciden');
}
