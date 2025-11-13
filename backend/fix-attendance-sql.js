const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/attendanceRoutes.js');

console.log('📝 Leyendo attendanceRoutes.js...');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Change a.company_id to u.company_id in WHERE clause (line 414)
console.log('🔧 Fix 1: Cambiando a.company_id → u.company_id');
const fix1Before = content.match(/AND a\.company_id = :companyId/g);
content = content.replace(/AND a\.company_id = :companyId/g, 'AND u.company_id = :companyId');
const fix1After = content.match(/AND u\.company_id = :companyId/g);
console.log(`   ✅ ${fix1Before ? fix1Before.length : 0} ocurrencias cambiadas`);

// Fix 2: Add INNER JOIN before WHERE clause in stats query
console.log('🔧 Fix 2: Agregando INNER JOIN en /stats/summary');
const originalQuery = `      FROM attendances a
      WHERE 1=1 \${sqlWhere}`;

const fixedQuery = `      FROM attendances a
      INNER JOIN users u ON a.user_id = u.user_id
      WHERE 1=1 \${sqlWhere}`;

if (content.includes(originalQuery)) {
  content = content.replace(originalQuery, fixedQuery);
  console.log('   ✅ INNER JOIN agregado correctamente');
} else {
  console.log('   ⚠️  Patrón no encontrado, buscando variaciones...');
  // Try with different whitespace
  const pattern = /FROM attendances a\s+WHERE 1=1 \$\{sqlWhere\}/;
  if (pattern.test(content)) {
    content = content.replace(pattern, `FROM attendances a
      INNER JOIN users u ON a.user_id = u.user_id
      WHERE 1=1 \${sqlWhere}`);
    console.log('   ✅ INNER JOIN agregado (con variación de espacios)');
  }
}

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ Archivo actualizado exitosamente');
console.log('📋 Resumen de cambios:');
console.log('   1. a.company_id → u.company_id');
console.log('   2. Agregado INNER JOIN con users en /stats/summary');
