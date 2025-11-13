const fs = require('fs');
const file = 'src/auditor/core/Phase4TestOrchestrator.js';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

console.log('Línea 656 antes:', lines[655]);

// Reemplazar en la línea 656 (índice 655)
lines[655] = lines[655].replace('this.page.$(', 'this.page.$$(');

console.log('Línea 656 después:', lines[655]);

const newContent = lines.join('\n');
fs.writeFileSync(file, newContent, 'utf8');

console.log('✅ Archivo guardado');
