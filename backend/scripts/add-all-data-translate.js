const fs = require('fs');
const path = require('path');

console.log('\n🔧 Agregando data-translate a TODOS los elementos de index.html\n');

// Cargar mapeo texto -> key
const mappingPath = path.join(__dirname, '../temp-text-to-key-mapping.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

// Cargar index.html
const indexPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

let changes = 0;
const backup = html;

// Función para escapar regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Para cada texto en el mapeo, buscar en HTML y agregar data-translate
for (const [text, key] of Object.entries(mapping)) {
  // Buscar el texto en cualquier tag
  const escapedText = escapeRegex(text);

  // Patrón: <tag ...>TEXTO</tag> o <tag ...>TEXTO con más contenido
  const pattern = new RegExp(
    `(<(?:p|span|h[1-6]|div|label|button|a|th|td|li|strong|em|b|i)\\s+[^>]*?)>([^<]*${escapedText}[^<]*)`,
    'gi'
  );

  html = html.replace(pattern, (match, openTag, content) => {
    // Si ya tiene data-translate o data-no-translate, no modificar
    if (openTag.includes('data-translate') || openTag.includes('data-no-translate')) {
      return match;
    }

    // Si el contenido coincide exactamente o empieza con el texto buscado
    if (content.trim() === text || content.trim().startsWith(text)) {
      changes++;
      return `${openTag} data-translate="index.${key}">${content}`;
    }

    return match;
  });

  // También buscar tags simples sin atributos
  const simplePattern = new RegExp(
    `(<(?:p|span|h[1-6]|div|label|button|a|th|td|li|strong|em|b|i)>)(${escapedText})`,
    'gi'
  );

  html = html.replace(simplePattern, (match, openTag, content) => {
    if (!match.includes('data-translate')) {
      changes++;
      const tagName = openTag.match(/<(\w+)/)[1];
      return `<${tagName} data-translate="index.${key}">${content}`;
    }
    return match;
  });
}

if (changes > 0) {
  // Guardar backup
  fs.writeFileSync(indexPath + '.backup-full-' + Date.now(), backup);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`✅ ${changes} atributos data-translate agregados`);
  console.log('📦 Backup guardado\n');
} else {
  console.log('⚠️  No se agregaron nuevos atributos\n');
}

console.log('✨ Proceso completado\n');
