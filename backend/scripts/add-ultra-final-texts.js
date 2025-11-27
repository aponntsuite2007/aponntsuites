const fs = require('fs');
const path = require('path');
const https = require('https');

// ÚLTIMOS 4 textos que faltaban (párrafos completos)
const missingTexts = {
  analisis_predictivo_tiempo_real: "ANALISIS PREDICTIVO EN TIEMPO REAL",

  unica_herramienta_rrhh_ia: "La unica herramienta de RRHH que predice comportamientos, detecta riesgos de fuga y genera evaluaciones automaticas con IA",

  sistema_multipais_configurable: "Sistema multi-pais totalmente configurable. Define tus propios conceptos, aportes y deducciones segun la legislacion de tu pais",

  kiosko_gps_validacion: "Cada kiosko tiene un area de cobertura GPS configurable por departamento. El sistema valida automaticamente que el empleado este dentro del radio autorizado antes de permitir el fichaje."
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
  console.log('\n📝 Agregando ÚLTIMOS 4 textos faltantes (párrafos completos)...\n');

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

  console.log('✨ ÚLTIMOS 4 textos agregados y traducidos\n');
  console.log('Total: ' + Object.keys(missingTexts).length + ' textos × 5 idiomas = ' + (Object.keys(missingTexts).length * 5) + ' traducciones\n');

  console.log('📋 Ahora ejecutar comandos para agregar data-translate al HTML:\n');
  console.log('Línea 2323:');
  console.log('  sed -i "2323s|<span class=\\"e360-pulse-dot\\"></span> ANALISIS|<span class=\\"e360-pulse-dot\\"></span> <span data-translate=\\"index.analisis_predictivo_tiempo_real\\">ANALISIS|" public/index.html\n');

  console.log('Línea 2328 (párrafo completo):');
  console.log('  sed -i "2328s|<p class=\\"section-subtitle\\"|<p class=\\"section-subtitle\\" data-translate=\\"index.unica_herramienta_rrhh_ia\\"|" public/index.html\n');

  console.log('Línea 4064 (párrafo completo):');
  console.log('  sed -i "4064s|<p class=\\"section-subtitle\\"|<p class=\\"section-subtitle\\" data-translate=\\"index.sistema_multipais_configurable\\"|" public/index.html\n');

  console.log('Línea 5157 (párrafo completo):');
  console.log('  sed -i "5157s|<p>Cada kiosko|<p data-translate=\\"index.kiosko_gps_validacion\\">Cada kiosko|" public/index.html\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
