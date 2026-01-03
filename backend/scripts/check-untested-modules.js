const fs = require('fs');

// Leer configs
const configs = fs.readdirSync('./tests/e2e/configs')
  .filter(f => f.endsWith('.config.js'))
  .map(f => f.replace('.config.js', ''));

console.log('📊 Total configs:', configs.length);

// Leer resultados del batch
const testedJson = JSON.parse(fs.readFileSync('./tests/e2e/results/batch-test-results.json'));
const tested = testedJson.modules.map(m => m.moduleKey);

console.log('✅ Testeados:', tested.length);
console.log('📉 Porcentaje:', Math.round(tested.length / configs.length * 100) + '%\n');

// Encontrar no testeados
const notTested = configs.filter(c => !tested.includes(c));

console.log('🔴 NO TESTEADOS (' + notTested.length + '):\n');
notTested.forEach((m, i) => {
  console.log('  ' + (i+1) + '. ' + m);
});

console.log('\n📋 SIGUIENTE MÓDULO A TESTEAR: ' + notTested[0]);
