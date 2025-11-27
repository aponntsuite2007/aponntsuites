#!/usr/bin/env node

/**
 * TRADUCCIÓN AUTOMÁTICA con LibreTranslate API (GRATIS)
 *
 * Este script traduce automáticamente TODAS las keys faltantes
 * desde español a los 5 idiomas usando LibreTranslate API.
 *
 * API: https://libretranslate.com/
 * Gratis, sin límites (servicio público)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const LIBRETRANSLATE_API = 'https://libretranslate.com/translate';

// Idiomas target
const LANGUAGES = {
  en: 'English',
  pt: 'Portuguese',
  de: 'German',
  it: 'Italian',
  fr: 'French'
};

// Función para traducir texto
async function translate(text, targetLang) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      q: text,
      source: 'es',
      target: targetLang,
      format: 'text'
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(LIBRETRANSLATE_API, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.translatedText) {
            resolve(result.translatedText);
          } else {
            reject(new Error('No translation returned'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Función para esperar (rate limiting)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🌐 TRADUCCIÓN AUTOMÁTICA con LibreTranslate API\n');

  // Cargar traducciones españolas
  const esPath = path.join(__dirname, '../public/locales/es.json');
  const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

  const totalKeys = Object.keys(es.index).length;
  console.log(`📊 Encontradas ${totalKeys} traducciones en español\n`);

  // Procesar cada idioma
  for (const [langCode, langName] of Object.entries(LANGUAGES)) {
    console.log(`\n🔄 Traduciendo a ${langName} (${langCode})...\n`);

    const langPath = path.join(__dirname, `../public/locales/${langCode}.json`);
    const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));

    let translated = 0;
    let skipped = 0;
    let errors = 0;

    // Traducir cada key
    for (const [key, value] of Object.entries(es.index)) {
      // Si es un objeto (como placeholder), copiar directo
      if (typeof value !== 'string') {
        if (!langData.index[key]) {
          langData.index[key] = value;
        }
        skipped++;
        continue;
      }

      // Si ya existe, saltar
      if (langData.index[key] && langData.index[key] !== value) {
        skipped++;
        continue;
      }

      try {
        // Traducir
        const translatedText = await translate(value, langCode);
        langData.index[key] = translatedText;
        translated++;

        // Progress
        if (translated % 10 === 0) {
          console.log(`  ✅ ${translated}/${totalKeys} traducciones completadas...`);
        }

        // Rate limiting (1 req/segundo para no saturar API pública)
        await sleep(1000);

      } catch (err) {
        console.error(`  ❌ Error traduciendo "${key}": ${err.message}`);
        // Fallback: copiar en español
        langData.index[key] = value;
        errors++;
      }
    }

    // Guardar archivo traducido
    fs.writeFileSync(langPath, JSON.stringify(langData, null, 2), 'utf8');

    console.log(`\n  📊 ${langName} (${langCode}):`);
    console.log(`     ✅ Traducidas: ${translated}`);
    console.log(`     ⏭️  Saltadas: ${skipped}`);
    console.log(`     ❌ Errores: ${errors}`);
  }

  console.log('\n✨ TRADUCCIÓN AUTOMÁTICA COMPLETADA\n');
  console.log('📄 Archivos actualizados:');
  console.log('   - public/locales/en.json');
  console.log('   - public/locales/pt.json');
  console.log('   - public/locales/de.json');
  console.log('   - public/locales/it.json');
  console.log('   - public/locales/fr.json\n');
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err);
  process.exit(1);
});
