const data = require('./tests/e2e/results/batch-test-results.json');
const failed = data.modules.filter(m => m.status === 'FAILED' && m.total > 0);
console.log(`\n📊 MÓDULOS CON TESTS FALLIDOS (${failed.length} total):\n`);
failed.forEach(m => {
  const percent = Math.round((m.passing / m.total) * 100);
  console.log(`${m.moduleKey.padEnd(30)} ${m.passing}/${m.total} (${percent}%) - ${m.failing} failing`);
});

console.log('\n\n📋 DETALLES POR CATEGORÍA:\n');

// Group by pass rate
const critical = failed.filter(m => m.passing === 0);
const partial = failed.filter(m => m.passing > 0 && m.passing < m.total);

if (critical.length > 0) {
  console.log(`🔴 CRÍTICOS (0% passing): ${critical.length}`);
  critical.forEach(m => console.log(`   - ${m.moduleKey}`));
}

if (partial.length > 0) {
  console.log(`\n🟡 PARCIALES (>0% passing): ${partial.length}`);
  partial.forEach(m => {
    const percent = Math.round((m.passing / m.total) * 100);
    console.log(`   - ${m.moduleKey}: ${percent}%`);
  });
}
