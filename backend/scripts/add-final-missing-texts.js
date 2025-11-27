const fs = require('fs');
const path = require('path');
const https = require('https');

// TODOS los textos que faltan
const missingTexts = {
  saas_definition: "(Software as a Service) es un modelo de distribucion de software donde la aplicacion se aloja en la nube y se accede a traves de internet. No requiere instalacion local.",

  b2b_definition: "(Business to Business) significa que nuestros clientes son empresas, no consumidores finales. Ofrecemos soluciones enterprise con soporte dedicado, SLAs garantizados y funcionalidades disenadas para equipos de RRHH profesionales.",

  compara_empleados: "Compara hasta 10 empleados simultaneamente",

  arquitectura_modular_desc: "Arquitectura modular que permite activar solo los modulos necesarios. Cada empresa configura su solucion a medida.",

  arquitectura_moderna_desc: "Arquitectura moderna construida con las mejores practicas de la industria. Escalable, segura y mantenible.",

  unete_empresas: "Únete a las empresas que ya utilizan inteligencia artificial para gestionar sus recursos humanos de manera eficiente."
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
  console.log('\n📝 Agregando TODOS los textos faltantes finales...\n');

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

  console.log('✨ TODOS los textos faltantes agregados y traducidos\n');
  console.log('Total: ' + Object.keys(missingTexts).length + ' textos × 5 idiomas = ' + (Object.keys(missingTexts).length * 5) + ' traducciones\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
