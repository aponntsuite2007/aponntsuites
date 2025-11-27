const fs = require('fs');
const path = require('path');

console.log('\n📝 Reescribiendo JSONs para eliminar duplicados físicos...\n');

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);

  // JSON.parse() automáticamente toma la última ocurrencia si hay keys duplicadas
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Reescribir limpio
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`✅ ${lang}.json reescrito sin duplicados`);
});

console.log('\n✅ Todos los archivos JSON limpios\n');
