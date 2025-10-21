/**
 * Display audit results in a clear format
 */

const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const s = data.summary;

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║  📊 RESULTADOS DE AUDITORÍA COMPLETA                   ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log(`Total tests: ${s.total}`);
console.log(`✅ Passed: ${s.passed}`);
console.log(`❌ Failed: ${s.failed}`);
console.log(`⚠️  Warnings: ${s.warnings}`);
console.log(`\nMódulos testeados: ${s.modules_tested.length}`);
console.log(`Duración: ${(s.total_duration/1000).toFixed(2)}s\n`);

const passRate = ((s.passed / s.total) * 100).toFixed(1);
console.log(`📊 TASA DE ÉXITO: ${passRate}%`);
console.log(`🎯 OBJETIVO: 100%\n`);

if(s.failed > 0) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('❌ TESTS QUE FALLAN:\n');
  data.logs.filter(log=>log.status==='fail').slice(0,5).forEach((log,i)=>{
    console.log(`${i+1}. ${log.test_name} (${log.module_name})`);
    if(log.error_message) console.log(`   Error: ${log.error_message}`);
    if(log.suggestions) {
      console.log(`   Sugerencias:`);
      log.suggestions.slice(0,2).forEach(s => {
        console.log(`   - ${s.solution}`);
      });
    }
    console.log('');
  });
} else {
  console.log('════════════════════════════════════════════════════════════');
  console.log('🎉🎉🎉 ¡ÉXITO TOTAL AL 100%! 🎉🎉🎉');
  console.log('════════════════════════════════════════════════════════════\n');
}
