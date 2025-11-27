const fs = require('fs');
const path = require('path');

console.log('\n🎨 Aumentando tamaño de "e" un 10% más (1.15em → 1.25em)...\n');

// Traducciones con la primera letra "e" 25% más grande (antes era 15%)
const translations = {
  es: '<span style="color: #60a5fa;"><span style="font-size: 1.25em;">e</span>cosistema Inteligente</span> de Administración y Planificación de los Recursos Empresariales',
  en: '<span style="color: #60a5fa;"><span style="font-size: 1.25em;">i</span>ntelligent <span style="font-size: 1.25em;">e</span>cosystem</span> for Administration and Planning of Business Resources',
  pt: '<span style="color: #60a5fa;"><span style="font-size: 1.25em;">e</span>cossistema Inteligente</span> de Administração e Planejamento dos Recursos Empresariais',
  de: '<span style="color: #60a5fa;"><span style="font-size: 1.25em;">i</span>ntelligentes <span style="font-size: 1.25em;">Ö</span>kosystem</span> für Verwaltung und Planung von Unternehmensressourcen',
  it: '<span style="color: #60a5fa;"><span style="font-size: 1.25em;">e</span>cosistema Intelligente</span> di Amministrazione e Pianificazione delle Risorse Aziendali',
  fr: '<span style="color: #60a5fa;"><span style="font-size: 1.25em;">é</span>cosystème Intelligent</span> d\'Administration et de Planification des Ressources d\'Entreprise'
};

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  content.desc_sistema_integral = translations[lang];

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  console.log(`   ✅ ${lang}.json - "e" aumentada a 1.25em`);
});

console.log('\n✅ COMPLETADO: "e" ahora es 25% más grande que el resto\n');
