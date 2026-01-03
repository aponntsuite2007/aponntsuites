const fs = require('fs');
const path = require('path');

// Read batch results
const data = require('./tests/e2e/results/batch-test-results.json');

// Get modules with 80% pass rate (4/5 passing)
const quickWins = data.modules.filter(m =>
  m.status === 'FAILED' &&
  m.total === 5 &&
  m.passing === 4
);

console.log(`\n🎯 QUICK WINS (12 módulos al 80%):\n`);
console.log(`Analizando qué test específico falla...\n`);

quickWins.forEach(m => {
  console.log(`📦 ${m.moduleKey}`);
  console.log(`   Duration: ${m.durationMin}`);
  console.log(`   Exit code: ${m.exitCode}`);

  // Try to find the test output file
  const testOutputPath = path.join(__dirname, 'tests', 'e2e', 'results', `${m.moduleKey}-output.txt`);
  if (fs.existsSync(testOutputPath)) {
    const output = fs.readFileSync(testOutputPath, 'utf8');
    const failedLines = output.split('\n').filter(line =>
      line.includes('✗') ||
      line.includes('FAIL') ||
      line.includes('Error:') ||
      line.includes('failing')
    );
    if (failedLines.length > 0) {
      console.log(`   Failed: ${failedLines[0].substring(0, 100)}`);
    }
  }
  console.log('');
});

console.log(`\n📋 RESUMEN:`);
console.log(`Si todos tienen el mismo test fallando, podemos hacer un fix batch.`);
console.log(`Si no, necesitamos investigar uno por uno.\n`);
