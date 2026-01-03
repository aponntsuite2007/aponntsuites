const data = require('./tests/e2e/results/batch-test-results.json');

// Modules at 40% (2/5 passing)
const at40 = data.modules.filter(m => m.status === 'FAILED' && m.total === 5 && m.passing === 2);

// Modules at 60% (3/5 passing)
const at60 = data.modules.filter(m => m.status === 'FAILED' && m.total === 5 && m.passing === 3);

console.log('\n📊 MÓDULOS AL 40% (2/5 passing):');
at40.forEach(m => {
  console.log(`   ${m.moduleKey.padEnd(35)} ${m.failing} tests failing`);
});

console.log('\n📊 MÓDULOS AL 60% (3/5 passing):');
at60.forEach(m => {
  console.log(`   ${m.moduleKey.padEnd(35)} ${m.failing} tests failing`);
});

console.log(`\n📋 TOTAL: ${at40.length + at60.length} módulos parciales\n`);
