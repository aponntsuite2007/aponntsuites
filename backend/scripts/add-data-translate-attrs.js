#!/usr/bin/env node

/**
 * Script para agregar atributos data-translate a index.html
 * basándose en las traducciones disponibles en es.json
 */

const fs = require('fs');
const path = require('path');

// Cargar traducciones del español
const esPath = path.join(__dirname, '../public/locales/es.json');
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const indexTranslations = es.index || {};

// Leer index.html
const indexPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('\n🔧 Agregando atributos data-translate a index.html...\n');

let changes = 0;

// Función para normalizar texto (quitar acentos, espacios extra, etc.)
function normalizeText(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/\s+/g, ' '); // Normalizar espacios
}

// Función para escapar regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Mapeo de textos a keys
const textToKey = {};
for (const [key, value] of Object.entries(indexTranslations)) {
  if (typeof value === 'string') {
    textToKey[normalizeText(value)] = `index.${key}`;
  }
}

// Buscar y reemplazar textos en HTML
for (const [normalizedText, dataKey] of Object.entries(textToKey)) {
  // Obtener el texto original (con acentos)
  const originalText = indexTranslations[dataKey.replace('index.', '')];

  // Patrones para diferentes contextos HTML
  const patterns = [
    // <h2>Texto</h2> (sin data-translate)
    new RegExp(`<(h[1-6]|p|span|div|button|a|label|th|td)([^>]*?)>\\s*${escapeRegex(originalText)}\\s*</\\1>`, 'gi'),
    // <span class="...">Texto</span> (sin data-translate)
    new RegExp(`<(span|div)\\s+class="([^"]*)"\\s*>\\s*${escapeRegex(originalText)}\\s*</\\1>`, 'gi'),
  ];

  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Solo agregar data-translate si NO existe ya
        if (!match.includes('data-translate') && !match.includes('data-no-translate')) {
          const replacement = match.replace(
            /^<(\w+)([^>]*?)>/,
            `<$1$2 data-translate="${dataKey}">`
          );
          html = html.replace(match, replacement);
          changes++;
          console.log(`✅ Agregado: ${dataKey} -> "${originalText.substring(0, 40)}..."`);
        }
      }
    }
  }
}

// Casos especiales - textos en atributos placeholder
const placeholders = indexTranslations.placeholder || {};
for (const [key, value] of Object.entries(placeholders)) {
  const pattern = new RegExp(`placeholder="\\s*${escapeRegex(value)}\\s*"`, 'gi');
  const matches = html.match(pattern);
  if (matches) {
    for (const match of matches) {
      if (!html.includes(`data-translate-placeholder="index.placeholder.${key}"`)) {
        const replacement = match.replace('placeholder=', `data-translate-placeholder="index.placeholder.${key}" placeholder=`);
        html = html.replace(match, replacement);
        changes++;
        console.log(`✅ Placeholder: index.placeholder.${key} -> "${value}"`);
      }
    }
  }
}

if (changes > 0) {
  // Guardar backup
  const backupPath = indexPath + '.backup-' + Date.now();
  fs.writeFileSync(backupPath, fs.readFileSync(indexPath));
  console.log(`\n📦 Backup guardado en: ${backupPath}`);

  // Guardar archivo modificado
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`\n✅ Archivo actualizado: ${changes} atributos data-translate agregados`);
} else {
  console.log('\n⚠️  No se encontraron cambios necesarios');
}

console.log('\n✨ Proceso completado\n');
