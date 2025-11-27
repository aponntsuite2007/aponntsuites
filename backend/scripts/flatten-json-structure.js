const fs = require('fs');
const path = require('path');

console.log('\n🔧 Aplanando estructura JSON (moviendo "index" a raíz)...\n');

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Si existe el objeto "index", mover todas sus keys al nivel raíz
  if (data.index && typeof data.index === 'object') {
    console.log(`📝 ${lang}.json - Moviendo keys de "index" a raíz...`);

    // Extraer todas las keys de "index"
    const indexKeys = Object.keys(data.index);
    console.log(`   Encontradas ${indexKeys.length} keys en "index"`);

    // Mover cada key al nivel raíz
    indexKeys.forEach(key => {
      data[key] = data.index[key];
    });

    // Eliminar el objeto "index"
    delete data.index;

    // Guardar
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`   ✅ ${indexKeys.length} keys movidas a raíz\n`);
  } else {
    console.log(`   ℹ️ ${lang}.json - No tiene objeto "index", omitiendo\n`);
  }
});

console.log('✅ COMPLETADO: Estructura JSON aplanada en todos los idiomas\n');
