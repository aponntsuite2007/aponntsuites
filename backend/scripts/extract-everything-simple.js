const fs = require('fs');
const path = require('path');

console.log('\n🔍 EXTRACCIÓN COMPLETA de TODO el texto visible en index.html\n');

// Leer index.html
const indexPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Remover scripts, styles, comentarios
html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
html = html.replace(/<!--[\s\S]*?-->/g, '');

const textsFound = new Map(); // text -> info

// Patrones para extraer contenido de tags
const patterns = [
  // <tag>Texto directo</tag>
  /<(p|h[1-6]|span|div|label|button|a|th|td|li|strong|em|b|i)(?:\s+[^>]*?)?>(.*?)<\/\1>/gi,
];

// Extraer textos
for (const pattern of patterns) {
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const tag = match[1];
    let content = match[2];

    // Limpiar contenido (quitar tags internos)
    const cleanText = content
      .replace(/<[^>]+>/g, '') // Quitar tags HTML
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();

    // Filtrar textos inválidos
    if (!cleanText ||
        cleanText.length < 3 ||
        /^[\d\s\W]+$/.test(cleanText) || // Solo números/símbolos
        cleanText.includes('{{') ||
        cleanText.includes('<%') ||
        cleanText.includes('function') ||
        cleanText.includes('const ') ||
        cleanText.includes('var ') ||
        cleanText.includes('let ') ||
        cleanText.startsWith('http') ||
        cleanText.startsWith('www.') ||
        cleanText.startsWith('//') ||
        cleanText.includes('  ') && cleanText.split(' ').length > 30 // Probablemente código
    ) {
      continue;
    }

    if (!textsFound.has(cleanText)) {
      textsFound.set(cleanText, {
        tag: tag,
        occurrences: 1,
        sample: match[0].substring(0, 100)
      });
    } else {
      textsFound.get(cleanText).occurrences++;
    }
  }
}

console.log(`✅ Encontrados ${textsFound.size} textos únicos\n`);

// Generar keys y traducciones
const translations = {};
const keyMap = {};

Array.from(textsFound.entries())
  .sort((a, b) => b[0].length - a[0].length) // Más largos primero
  .forEach(([text, info], index) => {
    // Generar key automática
    let key = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^\w\s]/g, '') // Quitar símbolos
      .replace(/\s+/g, '_') // Espacios a _
      .substring(0, 50); // Max 50 caracteres

    // Evitar colisiones
    let finalKey = key;
    let counter = 1;
    while (translations[finalKey]) {
      finalKey = `${key}_${counter}`;
      counter++;
    }

    translations[finalKey] = text;
    keyMap[text] = finalKey;

    // Mostrar primeros 30
    if (index < 30) {
      console.log(`  "${finalKey}": "${text.substring(0, 70)}${text.length > 70 ? '...' : ''}"`);
    }
  });

console.log(`  ... y ${textsFound.size - 30} más\n`);

// Guardar traducciones
const outputPath = path.join(__dirname, '../temp-all-translations.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify({ index: translations }, null, 2),
  'utf8'
);

// Guardar mapeo
const mappingPath = path.join(__dirname, '../temp-text-to-key-mapping.json');
fs.writeFileSync(
  mappingPath,
  JSON.stringify(keyMap, null, 2),
  'utf8'
);

console.log(`📄 Traducciones extraídas: ${outputPath}`);
console.log(`🗺️  Mapeo texto->key: ${mappingPath}`);
console.log(`📊 Total: ${Object.keys(translations).length} textos únicos\n`);

// Estadísticas
const byTag = {};
textsFound.forEach((info, text) => {
  byTag[info.tag] = (byTag[info.tag] || 0) + 1;
});

console.log('📈 Distribución por tipo de elemento:');
Object.entries(byTag)
  .sort((a, b) => b[1] - a[1])
  .forEach(([tag, count]) => {
    console.log(`   <${tag}>: ${count} textos`);
  });

console.log('\n✨ Extracción completada\n');
