const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

console.log('\n🔍 EXTRACCIÓN COMPLETA de TODO el texto visible en index.html\n');

// Leer index.html
const indexPath = path.join(__dirname, '../public/index.html');
const html = fs.readFileSync(indexPath, 'utf8');

// Cargar con cheerio (jQuery para Node.js) para parsear correctamente
const $ = cheerio.load(html);

const textsFound = new Map(); // text -> { element, context }
let textCounter = 0;

// Selectores de elementos que contienen texto visible
const textElements = [
  'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'div', 'label', 'button', 'a', 'th', 'td', 'li',
  'strong', 'em', 'b', 'i'
];

// Recorrer TODOS los elementos de texto
textElements.forEach(selector => {
  $(selector).each((index, element) => {
    const $el = $(element);

    // Saltar si ya tiene data-translate o data-no-translate
    if ($el.attr('data-translate') || $el.attr('data-no-translate')) {
      return;
    }

    // Obtener texto directo (sin hijos)
    let text = '';
    $el.contents().each((i, node) => {
      if (node.type === 'text') {
        text += $(node).text();
      }
    });

    text = text.trim();

    // Filtrar textos inválidos
    if (!text ||
        text.length < 3 ||
        /^[\d\s\W]+$/.test(text) || // Solo números/símbolos
        text.includes('{{') || // Variables
        text.includes('<%') || // Templates
        text.includes('function') || // Código JS
        text.includes('const ') || // Código JS
        text.startsWith('http') || // URLs
        text.startsWith('www.') // URLs
    ) {
      return;
    }

    // Guardar
    if (!textsFound.has(text)) {
      textsFound.set(text, {
        selector: selector,
        class: $el.attr('class') || '',
        id: $el.attr('id') || '',
        parent: $el.parent().prop('tagName')?.toLowerCase() || '',
        count: 1
      });
      textCounter++;
    } else {
      textsFound.get(text).count++;
    }
  });
});

console.log(`✅ Encontrados ${textsFound.size} textos únicos en ${textCounter} ubicaciones\n`);

// Generar keys y traducciones
const translations = {};
const keyMap = new Map(); // text -> key

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

    // Agregar sufijo si existe
    let finalKey = key;
    let counter = 1;
    while (translations[finalKey]) {
      finalKey = `${key}_${counter}`;
      counter++;
    }

    translations[finalKey] = text;
    keyMap.set(text, finalKey);

    // Mostrar progreso cada 20 items
    if (index % 20 === 0) {
      console.log(`  [${index + 1}/${textsFound.size}] "${finalKey}": "${text.substring(0, 60)}..."`);
    }
  });

// Guardar en archivo temporal
const outputPath = path.join(__dirname, '../temp-all-translations.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify({ index: translations }, null, 2),
  'utf8'
);

console.log(`\n📄 Archivo generado: ${outputPath}`);
console.log(`📊 Total de traducciones extraídas: ${Object.keys(translations).length}`);

// Guardar también el mapeo para usarlo después
const mappingPath = path.join(__dirname, '../temp-text-to-key-mapping.json');
fs.writeFileSync(
  mappingPath,
  JSON.stringify(Object.fromEntries(keyMap), null, 2),
  'utf8'
);

console.log(`🗺️  Mapeo guardado: ${mappingPath}`);

console.log('\n✨ Extracción completada\n');
console.log('📝 Próximo paso:');
console.log('   1. Revisar temp-all-translations.json');
console.log('   2. Traducir manualmente a los otros idiomas (o usar script de traducción)');
console.log('   3. Ejecutar script para agregar data-translate a TODOS los elementos\n');
