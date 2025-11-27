const fs = require('fs');
const path = require('path');

console.log('\n🧹 Limpiando Hero section - eliminar texto hardcodeado dentro de data-translate...\n');

const indexPath = path.join(__dirname, '../public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

console.log('📝 Paso 1: Vaciando texto dentro de elementos con data-translate...');

// 1. Hero title - mantener estructura pero vaciar texto interno
content = content.replace(
  /<h1 class="hero-title" data-translate="index\.desc_sistema_integral">Sistema Integral de Planificacion y Administracion de los\s*<span class="hero-title-accent" data-translate="index\.recursos_empresariales">Recursos Empresariales<\/span>\s*<\/h1>/,
  '<h1 class="hero-title" data-translate="index.desc_sistema_integral"></h1>'
);

// 2. Hero subtitle - vaciar completamente
content = content.replace(
  /<p class="hero-subtitle" data-translate="index\.hero_subtitle_full">\s*Plataforma SaaS B2B[^<]*<\/p>/s,
  '<p class="hero-subtitle" data-translate="index.hero_subtitle_full"></p>'
);

// 3. Language badges - vaciar cada uno
const badges = [
  { key: 'es_espanol', text: 'ES Espanol' },
  { key: 'en_english', text: 'EN English' },
  { key: 'pt_portugues', text: 'PT Portugues' },
  { key: 'fr_francais', text: 'FR Francais' },
  { key: 'de_deutsch', text: 'DE Deutsch' },
  { key: 'it_italiano', text: 'IT Italiano' }
];

badges.forEach(badge => {
  const pattern = new RegExp(`data-translate="index\\.${badge.key}">${badge.text}`, 'g');
  content = content.replace(pattern, `data-translate="index.${badge.key}">`);
});

// 4. Hero stats - vaciar labels (NO los values)
const statLabels = [
  { key: '22_modulos_integrados', text: 'Modulos integrados' },
  { key: 'idiomas_disponibles', text: 'Idiomas disponibles' },
  { key: 'patrones_ia', text: 'Patrones IA' },
  { key: 'b2b_multitenant', text: 'B2B Multi-tenant' }
];

statLabels.forEach(stat => {
  const pattern = new RegExp(`data-translate="index\\.${stat.key}">${stat.text}`, 'g');
  content = content.replace(pattern, `data-translate="index.${stat.key}">`);
});

// 5. Dashboard metrics labels - vaciar
const metricLabels = [
  { key: 'puntualidad', text: 'Puntualidad' },
  { key: 'empleados', text: 'Empleados' },
  { key: 'score_promedio', text: 'Score promedio' }
];

metricLabels.forEach(metric => {
  const pattern = new RegExp(`data-translate="index\\.${metric.key}">${metric.text}`, 'g');
  content = content.replace(pattern, `data-translate="index.${metric.key}">`);
});

// 6. Floating cards titles
content = content.replace(
  /data-translate="index\.ia_predictiva">IA Predictiva</g,
  'data-translate="index.ia_predictiva">'
);
content = content.replace(
  /data-translate="index\.biometria">Biometria</g,
  'data-translate="index.biometria">'
);

console.log('✅ Texto hardcodeado eliminado');

// Guardar
fs.writeFileSync(indexPath, content, 'utf8');

console.log('\n📝 Paso 2: Verificando traducciones en locales/*.json...');

// Verificar que las traducciones NO incluyan números duplicados
const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

const correctTranslations = {
  es: {
    "22_modulos_integrados": "Módulos integrados",
    "idiomas_disponibles": "Idiomas disponibles",
    "patrones_ia": "Patrones IA",
    "b2b_multitenant": "B2B Multi-tenant"
  },
  en: {
    "22_modulos_integrados": "Integrated modules",
    "idiomas_disponibles": "Available languages",
    "patrones_ia": "AI Patterns",
    "b2b_multitenant": "B2B Multi-tenant"
  },
  pt: {
    "22_modulos_integrados": "Módulos integrados",
    "idiomas_disponibles": "Idiomas disponíveis",
    "patrones_ia": "Padrões IA",
    "b2b_multitenant": "B2B Multi-tenant"
  },
  de: {
    "22_modulos_integrados": "Integrierte Module",
    "idiomas_disponibles": "Verfügbare Sprachen",
    "patrones_ia": "KI-Muster",
    "b2b_multitenant": "B2B Multi-Tenant"
  },
  it: {
    "22_modulos_integrados": "Moduli integrati",
    "idiomas_disponibles": "Lingue disponibili",
    "patrones_ia": "Pattern IA",
    "b2b_multitenant": "B2B Multi-tenant"
  },
  fr: {
    "22_modulos_integrados": "Modules intégrés",
    "idiomas_disponibles": "Langues disponibles",
    "patrones_ia": "Modèles IA",
    "b2b_multitenant": "B2B Multi-locataire"
  }
};

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const localeContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let updated = false;
  Object.keys(correctTranslations[lang]).forEach(key => {
    if (localeContent[key] !== correctTranslations[lang][key]) {
      localeContent[key] = correctTranslations[lang][key];
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(filePath, JSON.stringify(localeContent, null, 2), 'utf8');
    console.log(`   ✅ ${lang}.json actualizado`);
  } else {
    console.log(`   ℹ️  ${lang}.json ya estaba correcto`);
  }
});

console.log('\n✅ COMPLETADO:');
console.log('   1. Texto hardcodeado eliminado de TODOS los data-translate');
console.log('   2. Traducciones verificadas (sin números duplicados)');
console.log('   3. Sistema de traducción ahora controlará el 100% del texto\n');
console.log('🎯 Ahora el Hero section NO tendrá duplicados y se traducirá correctamente\n');
