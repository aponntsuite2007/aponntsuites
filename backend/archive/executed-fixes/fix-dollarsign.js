const fs = require('fs');
const file = 'src/auditor/core/Phase4TestOrchestrator.js';
let content = fs.readFileSync(file, 'utf8');

// Cambiar this.page.$(  por  this.page.$$(
const before = content;
content = content.replace('this.page.$(\'input[type="text"]\')', 'this.page.$$(\'input[type="text"]\')');

if (content !== before) {
  fs.writeFileSync(file, content);
  console.log('✅ Fix aplicado: this.page.$() → this.page.$$()');
} else {
  console.log('⚠️ No se encontró el patrón para cambiar');
}
