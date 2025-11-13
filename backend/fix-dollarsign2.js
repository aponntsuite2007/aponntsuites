const fs = require('fs');
const file = 'src/auditor/core/Phase4TestOrchestrator.js';
let content = fs.readFileSync(file, 'utf8');

console.log('Buscando línea 656...');
const lines = content.split('\n');
console.log(`Línea 656: ${lines[655]}`);

const before = content;

// Usar regex para buscar this.page.$ seguido de paréntesis de apertura
content = content.replace(/this\.page\.\$\(/g, 'this.page.$$(');

if (content !== before) {
  fs.writeFileSync(file, content);
  const linesAfter = content.split('\n');
  console.log(`✅ Fix aplicado!`);
  console.log(`Línea 656 ahora: ${linesAfter[655]}`);
} else {
  console.log('⚠️ No se encontró ningún this.page.$(  para cambiar');
  console.log('Buscando variantes...');
  if (content.includes('this.page.$$(')) {
    console.log('✅ Ya tiene $$()');
  }
}
