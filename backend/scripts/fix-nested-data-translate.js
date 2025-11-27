const fs = require('fs');
const path = require('path');

console.log('\n🔧 Limpiando data-translate="index.xxx" en valores JSON...\n');

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let changesCount = 0;

  // Iterar sobre todas las keys
  for (let key in data) {
    if (typeof data[key] === 'string') {
      // Si el valor contiene data-translate="index.xxx"
      if (data[key].includes('data-translate="index.')) {
        // Reemplazar
        const before = data[key];
        data[key] = data[key].replace(/data-translate="index\./g, 'data-translate="');

        if (before !== data[key]) {
          changesCount++;
          console.log(`   📝 ${lang}.${key}: ${(before.match(/data-translate="index\./g) || []).length} referencias limpiadas`);
        }
      }
    } else if (typeof data[key] === 'object') {
      // Si es un objeto anidado, iterar recursivamente
      for (let subkey in data[key]) {
        if (typeof data[key][subkey] === 'string' && data[key][subkey].includes('data-translate="index.')) {
          const before = data[key][subkey];
          data[key][subkey] = data[key][subkey].replace(/data-translate="index\./g, 'data-translate="');

          if (before !== data[key][subkey]) {
            changesCount++;
            console.log(`   📝 ${lang}.${key}.${subkey}: ${(before.match(/data-translate="index\./g) || []).length} referencias limpiadas`);
          }
        }
      }
    }
  }

  // Guardar
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`   ✅ ${lang}.json - ${changesCount} valores actualizados\n`);
});

console.log('✅ COMPLETADO: Todos los data-translate anidados limpiados\n');
