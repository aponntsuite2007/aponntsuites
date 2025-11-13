const fs = require('fs');
const file = 'src/auditor/core/Phase4TestOrchestrator.js';
let content = fs.readFileSync(file, 'utf8');

console.log('Buscando pattern....');

const before = content;

// Más simple: reemplazar .$(  por  .$$(
content = content.replace('.$(', '.$$(');

if (content !== before) {
  fs.writeFileSync(file, content);
  console.log('✅ Fix aplicado: .$( → .$$(');
  console.log('Reemplazos: ' + (content.length - before.length));
} else {
  console.log('⚠️ No se encontró .$( para cambiar');
}
