const data = require('fs').readFileSync(0, 'utf8');
const json = JSON.parse(data);

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  🧠 ANÁLISIS GENERADOS POR OLLAMA                        ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');
console.log(`Total de conversaciones: ${json.conversations.length}`);
console.log('');

if (json.conversations.length > 0) {
  console.log('Primeras 3 conversaciones:');
  console.log('');

  json.conversations.slice(0, 3).forEach((c, i) => {
    console.log(`${i+1}. PREGUNTA (primeros 200 chars):`);
    console.log(`   ${c.question.substring(0, 200).replace(/\n/g, ' ')}...`);
    console.log('');
    console.log(`   RESPUESTA (primeros 300 chars):`);
    console.log(`   ${c.answer ? c.answer.substring(0, 300).replace(/\n/g, ' ') : 'N/A'}...`);
    console.log('');
    console.log('   ---');
    console.log('');
  });
} else {
  console.log('⚠️  No hay conversaciones registradas.');
}
