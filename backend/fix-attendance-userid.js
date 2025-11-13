const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/attendanceRoutes.js');

console.log('📝 Leyendo attendanceRoutes.js...');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: a.user_id → a."UserId" en queries SQL
console.log('🔧 Fix 1: Cambiando a.user_id → a."UserId"');
const fix1Before = content.match(/a\.user_id/g);
content = content.replace(/a\.user_id/g, 'a."UserId"');
const fix1After = content.match(/a\."UserId"/g);
console.log(`   ✅ ${fix1Before ? fix1Before.length : 0} ocurrencias cambiadas`);

// Fix 2: INNER JOIN users u ON a.user_id → ON a."UserId" = u.user_id
console.log('🔧 Fix 2: Cambiando INNER JOIN ... ON a.user_id → ON a."UserId"');
const joinPattern = /ON a\.user_id = u\.user_id/g;
const fix2Before = content.match(joinPattern);
content = content.replace(joinPattern, 'ON a."UserId" = u.user_id');
const fix2After = content.match(/ON a\."UserId" = u\.user_id/g);
console.log(`   ✅ ${fix2Before ? fix2Before.length : 0} JOINs cambiados`);

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ Archivo actualizado exitosamente');
console.log('📋 Resumen de cambios:');
console.log('   1. a.user_id → a."UserId" en WHERE clauses');
console.log('   2. ON a.user_id → ON a."UserId" en JOINs');
