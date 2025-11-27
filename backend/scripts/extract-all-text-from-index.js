#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../public/index.html');
const html = fs.readFileSync(indexPath, 'utf8');

console.log('\n🔍 Extrayendo TODO el texto traducible de index.html...\n');

const texts = [];

// Regex para extraer contenido de elementos HTML (sin tags internos)
const patterns = [
  // <p>Texto</p>
  /<p[^>]*>([^<]+)<\/p>/gi,
  // <span>Texto</span> (que no tenga data-no-translate)
  /<span(?![^>]*data-no-translate)[^>]*>([^<]+)<\/span>/gi,
  // <h1-h6>Texto</h1-h6>
  /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi,
  // <div>Texto</div> (solo si es texto directo, no tiene más tags dentro)
  /<div[^>]*>([^<]+)<\/div>/gi,
  // <label>Texto</label>
  /<label[^>]*>([^<]+)<\/label>/gi,
  // <button>Texto</button>
  /<button[^>]*>([^<]+)<\/button>/gi,
  // <a>Texto</a>
  /<a[^>]*>([^<]+)<\/a>/gi,
  // <th>Texto</th>
  /<th[^>]*>([^<]+)<\/th>/gi,
  // <td>Texto</td>
  /<td[^>]*>([^<]+)<\/td>/gi,
];

const seenTexts = new Set();

for (const pattern of patterns) {
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const text = match[1].trim();

    // Filtrar textos inválidos
    if (!text ||
        text.length < 3 ||
        /^\d+$/.test(text) || // Solo números
        /^[\W_]+$/.test(text) || // Solo símbolos
        text.includes('{{') || // Variables
        text.includes('<%') || // Templates
        seenTexts.has(text.toLowerCase())
    ) {
      continue;
    }

    seenTexts.add(text.toLowerCase());
    texts.push(text);
  }
}

// Ordenar por longitud (más largos primero)
texts.sort((a, b) => b.length - a.length);

console.log(`✅ Encontrados ${texts.length} textos únicos traducibles\n`);

// Generar keys automáticas
const translations = {};
texts.forEach((text, index) => {
  // Generar key a partir del texto
  let key = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^\w\s]/g, '') // Quitar símbolos
    .replace(/\s+/g, '_') // Espacios a guiones bajos
    .substring(0, 60); // Max 60 caracteres

  // Si la key ya existe, agregar número
  let finalKey = key;
  let counter = 1;
  while (translations[finalKey]) {
    finalKey = `${key}_${counter}`;
    counter++;
  }

  translations[finalKey] = text;
});

// Guardar resultado
const outputPath = path.join(__dirname, '../public/locales/all-translations-extracted.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify({ index: translations }, null, 2),
  'utf8'
);

console.log(`📄 Archivo generado: ${outputPath}`);
console.log(`📊 Total de traducciones: ${Object.keys(translations).length}`);

// Mostrar las primeras 20
console.log('\n📝 Primeras 20 traducciones:\n');
Object.entries(translations).slice(0, 20).forEach(([key, value]) => {
  console.log(`  "${key}": "${value.substring(0, 60)}${value.length > 60 ? '...' : ''}"`);
});

console.log('\n✨ Extracción completada\n');
