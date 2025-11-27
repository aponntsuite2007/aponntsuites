const fs = require('fs');
const path = require('path');

// Cargar traducciones actuales
const es = JSON.parse(fs.readFileSync('public/locales/es.json', 'utf8'));
const currentTranslations = Object.values(es.index || {}).filter(v => typeof v === 'string');

// Cargar traducciones extraídas
const extracted = JSON.parse(fs.readFileSync('temp-all-translations.json', 'utf8'));
const extractedTranslations = Object.values(extracted.index || {});

console.log('\n📊 Comparación de traducciones:\n');
console.log('  ✅ Traducciones actuales en es.json: ' + currentTranslations.length);
console.log('  📄 Textos extraídos de index.html: ' + extractedTranslations.length);

// Normalizar para comparar
const normalize = (text) => text.toLowerCase().trim().replace(/\s+/g, ' ');

const currentNormalized = new Set(currentTranslations.map(normalize));

// Encontrar los que faltan
const missing = [];
const extractedKeys = Object.entries(extracted.index);

extractedKeys.forEach(([key, text]) => {
  if (!currentNormalized.has(normalize(text))) {
    missing.push({ key, text });
  }
});

console.log('  ❌ Faltan traducir: ' + missing.length + ' textos\n');

if (missing.length > 0) {
  console.log('📝 Primeros 30 textos que necesitan traducción:\n');
  missing.slice(0, 30).forEach((item, i) => {
    const preview = item.text.substring(0, 70) + (item.text.length > 70 ? '...' : '');
    console.log(`  ${i+1}. [${item.key}]`);
    console.log(`     "${preview}"\n`);
  });

  if (missing.length > 30) {
    console.log(`  ... y ${missing.length - 30} más\n`);
  }

  // Guardar los que faltan en un archivo
  const missingObj = {};
  missing.forEach(item => {
    missingObj[item.key] = item.text;
  });

  fs.writeFileSync(
    'temp-missing-translations.json',
    JSON.stringify({ index: missingObj }, null, 2),
    'utf8'
  );

  console.log('💾 Guardados en: temp-missing-translations.json');
  console.log(`📊 Total a traducir: ${missing.length} textos`);
} else {
  console.log('✨ ¡Todas las traducciones están completas!');
}

console.log('\n');
