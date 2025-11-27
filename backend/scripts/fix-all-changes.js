const fs = require('fs');
const path = require('path');

console.log('\n🎨 Aplicando todos los cambios...\n');

// ========== PARTE 1: LIMPIAR DATA-TRANSLATE ANIDADOS ==========
console.log('📝 Paso 1: Limpiando data-translate="index.xxx" en traducciones HTML...');

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  let content = fs.readFileSync(filePath, 'utf8');

  // Reemplazar todos los data-translate="index.xxx" por data-translate="xxx"
  const before = (content.match(/data-translate="index\./g) || []).length;
  content = content.replace(/data-translate="index\./g, 'data-translate="');
  const after = (content.match(/data-translate="index\./g) || []).length;

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`   ✅ ${lang}.json - ${before - after} data-translate limpiados`);
});

// ========== PARTE 2: ACTUALIZAR LOGO APONNT ==========
console.log('\n📝 Paso 2: Actualizando logo Aponnt...');

const indexPath = path.join(__dirname, '../public/index.html');
let htmlContent = fs.readFileSync(indexPath, 'utf8');

// Buscar logo actual
const oldLogo = `<a href="#" class="nav-logo">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <span style="color: #60a5fa; display: inline-block; transform: skewX(-8deg); font-size: 1.5em;">A</span><span style="font-size: 1.35em; color: #1a1a2e; font-weight: 400;">ponnt</span>
                        <span style="font-size: 0.72em; color: #60a5fa; font-weight: 600;">360º</span>
                    </div>
                    <div style="font-size: 0.55em; color: #64748b; margin-top: -0.15rem; letter-spacing: 0.5px; font-weight: 500;">Intelligent Ecosystem</div>
                </div>
            </div>
        </a>`;

// Nuevo logo con "A" 10% más grande y más inclinada
const newLogo = `<a href="#" class="nav-logo">
            <div style="display: flex; align-items: center; gap: 0.4rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <span style="color: #60a5fa; display: inline-block; transform: skewX(-12deg); font-size: 1.65em;">A</span><span style="font-size: 1.35em; color: #1a1a2e; font-weight: 400;">ponnt</span>
                        <span style="font-size: 0.72em; color: #60a5fa; font-weight: 600;">360º</span>
                    </div>
                    <div style="font-size: 0.55em; color: #60a5fa; margin-top: -0.15rem; letter-spacing: 0.5px; font-weight: 500;">Intelligent Ecosystem</div>
                </div>
            </div>
        </a>`;

htmlContent = htmlContent.replace(oldLogo, newLogo);
console.log('   ✅ Logo actualizado:');
console.log('      - "A" 10% más grande (1.5em → 1.65em)');
console.log('      - "A" más inclinada (skewX -8deg → -12deg)');
console.log('      - "Intelligent Ecosystem" en azul claro (#60a5fa)');

fs.writeFileSync(indexPath, htmlContent, 'utf8');

// ========== PARTE 3: ACTUALIZAR TÍTULO ECOSISTEMA ==========
console.log('\n📝 Paso 3: Actualizando título "ecosistema Inteligente"...');

const translations = {
  es: '<span style="font-size: 1.30em; color: #60a5fa;">e</span><span style="color: #1a1a2e;">cosistema</span> <span style="font-size: 1.30em; color: #60a5fa;">I</span><span style="color: #60a5fa;">ntelligente</span> de Administración y Planificación de los Recursos Empresariales',
  en: '<span style="font-size: 1.30em; color: #60a5fa;">i</span><span style="color: #60a5fa;">ntelligent</span> <span style="font-size: 1.30em; color: #60a5fa;">e</span><span style="color: #1a1a2e;">cosystem</span> for Administration and Planning of Business Resources',
  pt: '<span style="font-size: 1.30em; color: #60a5fa;">e</span><span style="color: #1a1a2e;">cossistema</span> <span style="font-size: 1.30em; color: #60a5fa;">I</span><span style="color: #60a5fa;">nteligente</span> de Administração e Planejamento dos Recursos Empresariais',
  de: '<span style="font-size: 1.30em; color: #60a5fa;">i</span><span style="color: #60a5fa;">ntelligentes</span> <span style="font-size: 1.30em; color: #60a5fa;">Ö</span><span style="color: #1a1a2e;">kosystem</span> für Verwaltung und Planung von Unternehmensressourcen',
  it: '<span style="font-size: 1.30em; color: #60a5fa;">e</span><span style="color: #1a1a2e;">cosistema</span> <span style="font-size: 1.30em; color: #60a5fa;">I</span><span style="color: #60a5fa;">ntelligente</span> di Amministrazione e Pianificazione delle Risorse Aziendali',
  fr: '<span style="font-size: 1.30em; color: #60a5fa;">é</span><span style="color: #1a1a2e;">cosystème</span> <span style="font-size: 1.30em; color: #60a5fa;">I</span><span style="color: #60a5fa;">ntelligent</span> d\'Administration et de Planification des Ressources d\'Entreprise'
};

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  content.desc_sistema_integral = translations[lang];

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  console.log(`   ✅ ${lang}.json actualizado`);
});

console.log('\n✅ COMPLETADO:');
console.log('   1. Data-translate anidados limpiados');
console.log('   2. Logo Aponnt actualizado (A más grande y más inclinada)');
console.log('   3. "Intelligent Ecosystem" en azul claro');
console.log('   4. Título: "e" azul + "cosistema" negro + "I" azul + "ntelligente" azul\n');
