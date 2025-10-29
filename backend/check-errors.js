const data = require('fs').readFileSync(0, 'utf8');
const json = JSON.parse(data);
const failedLogs = json.logs.filter(l => l.status === 'fail');

console.log('Total de tests fallidos:', failedLogs.length);
console.log('');
console.log('Primeros 5 errores:');
console.log('');

failedLogs.slice(0, 5).forEach((log, i) => {
  console.log(`${i+1}. Módulo: ${log.module_name}`);
  console.log(`   Test: ${log.test_name}`);
  console.log(`   Error: ${log.error_message ? log.error_message.substring(0, 150) : 'N/A'}`);
  console.log('');
});
