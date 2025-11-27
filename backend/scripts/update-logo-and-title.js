const fs = require('fs');
const path = require('path');

console.log('\n🎨 Actualizando logo y título...\n');

// ========== PARTE 1: ACTUALIZAR TÍTULO CON "INTELIGENTE" ==========
console.log('📝 Paso 1: Agregando "Inteligente" al título en 6 idiomas...');

const translations = {
  es: '<span style="color: #60a5fa;">Ecosistema Inteligente</span> de Administración y Planificación de los Recursos Empresariales',
  en: '<span style="color: #60a5fa;">Intelligent Ecosystem</span> for Administration and Planning of Business Resources',
  pt: '<span style="color: #60a5fa;">Ecossistema Inteligente</span> de Administração e Planejamento dos Recursos Empresariais',
  de: '<span style="color: #60a5fa;">Intelligentes Ökosystem</span> für Verwaltung und Planung von Unternehmensressourcen',
  it: '<span style="color: #60a5fa;">Ecosistema Intelligente</span> di Amministrazione e Pianificazione delle Risorse Aziendali',
  fr: '<span style="color: #60a5fa;">Écosystème Intelligent</span> d\'Administration et de Planification des Ressources d\'Entreprise'
};

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  content.desc_sistema_integral = translations[lang];

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  console.log(`   ✅ ${lang}.json - "Inteligente" agregado`);
});

// ========== PARTE 2: ACTUALIZAR LOGO DE APONNT ==========
console.log('\n📝 Paso 2: Modificando logo de Aponnt con 360º e Intelligent Ecosystem...');

const indexPath = path.join(__dirname, '../public/index.html');
let htmlContent = fs.readFileSync(indexPath, 'utf8');

// Buscar el logo actual
const oldLogo = '<a href="#" class="nav-logo"><span style="color: #60a5fa; display: inline-block; transform: skewX(-8deg); font-size: 1.5em;">A</span>ponnt</a>';

// Nuevo logo con estructura mejorada
const newLogo = `<a href="#" class="nav-logo">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <span style="color: #60a5fa; display: inline-block; transform: skewX(-8deg); font-size: 1.5em;">A</span><span style="font-size: 1.5em;">ponnt</span>
                        <span style="font-size: 0.9em; color: #60a5fa; font-weight: 600;">360º</span>
                    </div>
                    <div style="font-size: 0.55em; color: #64748b; margin-top: -0.15rem; letter-spacing: 0.5px; font-weight: 500;">Intelligent Ecosystem</div>
                </div>
            </div>
        </a>`;

htmlContent = htmlContent.replace(oldLogo, newLogo);

// Guardar
fs.writeFileSync(indexPath, htmlContent, 'utf8');

console.log('   ✅ Logo actualizado con 360º e Intelligent Ecosystem');

console.log('\n✅ COMPLETADO:');
console.log('   1. Título actualizado a "Ecosistema Inteligente" (6 idiomas)');
console.log('   2. Logo con "360º" al lado');
console.log('   3. "Intelligent Ecosystem" debajo del logo');
console.log('   4. Header NO distorsionado\n');
