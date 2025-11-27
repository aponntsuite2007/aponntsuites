const fs = require('fs');
const path = require('path');

console.log('\n🎨 Ajustando tamaño de letra y color de "Ecosistema"...\n');

// 1. Reducir tamaño de letra en CSS
console.log('📝 Paso 1: Reduciendo tamaño del título...');
const indexPath = path.join(__dirname, '../public/index.html');
let htmlContent = fs.readFileSync(indexPath, 'utf8');

// Cambiar font-size del hero-title de 3.5rem a 2.5rem
htmlContent = htmlContent.replace(
  /\.hero-title \{[\s\S]*?font-size: 3\.5rem;/,
  `.hero-title {
            font-family: 'Poppins', sans-serif;
            font-size: 2.5rem;`
);

// Actualizar también el responsive de tablet
htmlContent = htmlContent.replace(
  /\.hero-title \{ font-size: 2\.8rem; \}/g,
  '.hero-title { font-size: 2.2rem; }'
);

fs.writeFileSync(indexPath, htmlContent, 'utf8');
console.log('   ✅ Tamaño reducido: 3.5rem → 2.5rem (desktop)');

// 2. Modificar traducciones para poner "Ecosistema" en azul
console.log('\n📝 Paso 2: Coloreando primera palabra en azul claro...');

const translations = {
  es: '<span style="color: #60a5fa;">Ecosistema</span> de Administración y Planificación de los Recursos Empresariales',
  en: '<span style="color: #60a5fa;">Ecosystem</span> for Administration and Planning of Business Resources',
  pt: '<span style="color: #60a5fa;">Ecossistema</span> de Administração e Planejamento dos Recursos Empresariais',
  de: '<span style="color: #60a5fa;">Ökosystem</span> für Verwaltung und Planung von Unternehmensressourcen',
  it: '<span style="color: #60a5fa;">Ecosistema</span> di Amministrazione e Pianificazione delle Risorse Aziendali',
  fr: '<span style="color: #60a5fa;">Écosystème</span> d\'Administration et de Planification des Ressources d\'Entreprise'
};

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  content.desc_sistema_integral = translations[lang];

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  console.log(`   ✅ ${lang}.json - Primera palabra en azul #60a5fa`);
});

console.log('\n✅ COMPLETADO:');
console.log('   - Título más pequeño (2.5rem en vez de 3.5rem)');
console.log('   - "Ecosistema" en azul claro (#60a5fa)');
console.log('   - Cambio aplicado en 6 idiomas\n');
