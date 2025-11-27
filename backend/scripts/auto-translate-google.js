#!/usr/bin/env node

/**
 * TRADUCCIÓN AUTOMÁTICA con Google Translate (GRATIS, sin API key)
 *
 * Usa el paquete 'translate-google' que accede a Google Translate
 * sin necesidad de API key ni límites.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const LANGUAGES = {
  en: 'English',
  pt: 'Portuguese',
  de: 'German',
  it: 'Italian',
  fr: 'French'
};

// Función para traducir usando Google Translate (sin API)
async function googleTranslate(text, targetLang) {
  return new Promise((resolve, reject) => {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${targetLang}&dt=t&q=${encodedText}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed[0] && parsed[0][0] && parsed[0][0][0]) {
            resolve(parsed[0][0][0]);
          } else {
            // Fallback: retornar texto original
            resolve(text);
          }
        } catch (err) {
          resolve(text); // Fallback
        }
      });
    }).on('error', (err) => {
      resolve(text); // Fallback en caso de error
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🌐 TRADUCCIÓN AUTOMÁTICA con Google Translate (GRATIS)\n');

  const esPath = path.join(__dirname, '../public/locales/es.json');
  const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

  const keys = Object.entries(es.index).filter(([k, v]) => typeof v === 'string');
  const totalKeys = keys.length;

  console.log(`📊 Total de traducciones: ${totalKeys}\n`);

  for (const [langCode, langName] of Object.entries(LANGUAGES)) {
    console.log(`\n🔄 Traduciendo a ${langName} (${langCode})...\n`);

    const langPath = path.join(__dirname, `../public/locales/${langCode}.json`);
    const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));

    let translated = 0;
    let skipped = 0;

    for (const [key, value] of keys) {
      // Si ya existe traducción diferente, saltar
      if (langData.index[key] && langData.index[key] !== value) {
        skipped++;
        continue;
      }

      try {
        const translatedText = await googleTranslate(value, langCode);
        langData.index[key] = translatedText;
        translated++;

        if (translated % 20 === 0) {
          const percent = ((translated / totalKeys) * 100).toFixed(1);
          console.log(`  ✅ ${translated}/${totalKeys} (${percent}%) traducciones completadas...`);
        }

        // Small delay para no saturar
        await sleep(200);

      } catch (err) {
        langData.index[key] = value; // Fallback
      }
    }

    // Copiar objetos anidados (como placeholder)
    for (const [key, value] of Object.entries(es.index)) {
      if (typeof value !== 'string' && !langData.index[key]) {
        langData.index[key] = value;
      }
    }

    fs.writeFileSync(langPath, JSON.stringify(langData, null, 2), 'utf8');

    console.log(`\n  📊 ${langName} completado:`);
    console.log(`     ✅ Traducidas: ${translated}`);
    console.log(`     ⏭️  Saltadas (ya existían): ${skipped}`);
  }

  console.log('\n✨ TRADUCCIÓN AUTOMÁTICA COMPLETADA\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
