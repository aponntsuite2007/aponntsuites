const fs = require('fs');
const path = require('path');

console.log('\n🔧 Corrigiendo ortografía de "inteligente" en español...\n');

const localesDir = path.join(__dirname, '../public/locales');
const esPath = path.join(localesDir, 'es.json');

// Leer archivo español
let content = fs.readFileSync(esPath, 'utf8');

// Contar cuántas veces aparece mal escrito
const beforeCount = (content.match(/[Ii]ntelligente/g) || []).length;

// Corregir: intelligente → inteligente
content = content.replace(/intelligente/g, 'inteligente');
content = content.replace(/Intelligente/g, 'Inteligente');

// Contar después
const afterCount = (content.match(/[Ii]ntelligente/g) || []).length;

// Guardar
fs.writeFileSync(esPath, content, 'utf8');

console.log(`   ✅ Corregidas ${beforeCount - afterCount} instancias de "intelligente" → "inteligente"`);
console.log('   ✅ es.json actualizado\n');
