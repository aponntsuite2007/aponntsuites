const fs = require('fs');
const path = require('path');
const https = require('https');

// Partes individuales de texto que faltan en los párrafos
const missingTexts = {
  // Línea 2323
  analisis_predictivo_tiempo_real: "ANALISIS PREDICTIVO EN TIEMPO REAL",

  // Línea 2329 - 3 partes
  la_unica_herramienta_rrhh_que: "La unica herramienta de RRHH que ",
  y_genera: " y genera ",

  // Línea 4065 - 2 partes
  sistema_texto: "Sistema ",
  define_conceptos_aportes: ". Define tus propios conceptos, aportes y deducciones segun la ",

  // Línea 5157-5158 - 2 partes
  cada_kiosko_tiene: "Cada kiosko tiene un ",
  por_depto_validacion: " por departamento. El sistema valida automaticamente que el empleado este dentro del radio autorizado antes de permitir el fichaje."
};

async function googleTranslate(text, targetLang) {
  return new Promise((resolve) => {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${targetLang}&dt=t&q=${encodedText}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed[0] && parsed[0][0] && parsed[0][0][0]) {
            resolve(parsed[0][0][0]);
          } else {
            resolve(text);
          }
        } catch (err) {
          resolve(text);
        }
      });
    }).on('error', () => resolve(text));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n📝 Agregando partes individuales de párrafos...\n');

  const localesPath = path.join(__dirname, '../public/locales');

  // 1. Agregar a es.json
  const esPath = path.join(localesPath, 'es.json');
  const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

  let added = 0;
  for (const [key, value] of Object.entries(missingTexts)) {
    if (!es.index[key]) {
      es.index[key] = value;
      added++;
    }
  }

  fs.writeFileSync(esPath, JSON.stringify(es, null, 2), 'utf8');
  console.log(`✅ es.json: ${added} textos agregados\n`);

  // 2. Traducir a los demás idiomas
  const languages = { en: 'English', pt: 'Portuguese', de: 'German', it: 'Italian', fr: 'French' };

  for (const [langCode, langName] of Object.entries(languages)) {
    console.log(`🔄 Traduciendo a ${langName}...`);

    const langPath = path.join(localesPath, `${langCode}.json`);
    const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));

    for (const [key, value] of Object.entries(missingTexts)) {
      const translated = await googleTranslate(value, langCode);
      langData.index[key] = translated;
      console.log(`  • ${key}`);
      await sleep(300);
    }

    fs.writeFileSync(langPath, JSON.stringify(langData, null, 2), 'utf8');
    console.log(`  ✅ Completado\n`);
  }

  console.log('✨ Partes individuales agregadas y traducidas\n');
  console.log('Total: ' + Object.keys(missingTexts).length + ' textos × 5 idiomas = ' + (Object.keys(missingTexts).length * 5) + ' traducciones\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
