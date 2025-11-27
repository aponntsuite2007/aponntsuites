const fs = require('fs');
const path = require('path');

console.log('\n📝 Cambiando "Sistema Integral" → "Ecosistema"...\n');

const localesDir = path.join(__dirname, '../public/locales');

// Traducciones correctas en 6 idiomas
const newTranslations = {
  es: {
    "desc_sistema_integral": "Ecosistema de Administración y Planificación de los Recursos Empresariales"
  },
  en: {
    "desc_sistema_integral": "Ecosystem for Administration and Planning of Business Resources"
  },
  pt: {
    "desc_sistema_integral": "Ecossistema de Administração e Planejamento dos Recursos Empresariais"
  },
  de: {
    "desc_sistema_integral": "Ökosystem für Verwaltung und Planung von Unternehmensressourcen"
  },
  it: {
    "desc_sistema_integral": "Ecosistema di Amministrazione e Pianificazione delle Risorse Aziendali"
  },
  fr: {
    "desc_sistema_integral": "Écosystème d'Administration et de Planification des Ressources d'Entreprise"
  }
};

const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Actualizar la traducción
  content.desc_sistema_integral = newTranslations[lang].desc_sistema_integral;

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  console.log(`✅ ${lang}.json actualizado:`);
  console.log(`   "${newTranslations[lang].desc_sistema_integral}"`);
});

console.log('\n✅ COMPLETADO - Título actualizado en 6 idiomas\n');
console.log('📋 Cambio realizado:');
console.log('   ANTES: "Sistema Integral de Planificación..."');
console.log('   AHORA: "Ecosistema de Administración y Planificación..."\n');
