const fs = require('fs');
const path = require('path');
const https = require('https');

// Textos largos que faltan (multi-línea)
const missingTexts = {
  hero_subtitle_full: "Plataforma SaaS B2B de gestion de asistencias, biometria y recursos humanos. Analisis predictivo con IA para anticipar patrones y optimizar la gestion de personal. Disponible en 6 idiomas para empresas globales.",

  plugplay_subtitle: "Selecciona solo los modulos que necesitas. Cada componente se integra automaticamente al nucleo central, adaptandose a tu flujo de trabajo sin configuraciones complejas.",

  ia_subtitle: "Sistema de IA que analiza patrones de comportamiento, detecta anomalias y genera predicciones para optimizar la gestion de recursos humanos.",

  notifications_subtitle: "Sistema de alertas automaticas con escalamiento inteligente basado en SLA. Garantiza timestamps inmutables, auditoría completa y cumplimiento de deadlines."
};

// Función para traducir con Google Translate
async function googleTranslate(text, targetLang) {
  return new Promise((resolve, reject) => {
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
  console.log('\n📝 Agregando textos largos faltantes...\n');

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
  console.log(`✅ es.json: ${added} textos largos agregados\n`);

  // 2. Traducir a los demás idiomas
  const languages = { en: 'English', pt: 'Portuguese', de: 'German', it: 'Italian', fr: 'French' };

  for (const [langCode, langName] of Object.entries(languages)) {
    console.log(`🔄 Traduciendo a ${langName}...`);

    const langPath = path.join(localesPath, `${langCode}.json`);
    const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));

    for (const [key, value] of Object.entries(missingTexts)) {
      const translated = await googleTranslate(value, langCode);
      langData.index[key] = translated;
      await sleep(500);
    }

    fs.writeFileSync(langPath, JSON.stringify(langData, null, 2), 'utf8');
    console.log(`  ✅ ${Object.keys(missingTexts).length} traducciones completadas\n`);
  }

  console.log('✨ Todos los textos largos agregados y traducidos\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
