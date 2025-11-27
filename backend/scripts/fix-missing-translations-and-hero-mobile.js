const fs = require('fs');
const path = require('path');

console.log('\n🔧 Arreglando traducciones faltantes + Hero mobile...\n');

// 1. AGREGAR TRADUCCIONES FALTANTES
console.log('📝 Paso 1: Agregando traducciones faltantes...');

const translationsToAdd = {
  "modelo_de_negocio": "Modelo de Negocio",
  "arquitectura_modular": "Arquitectura Modular",
  "sistema_plug_play": "Sistema Plug & Play"
};

const translations = {
  es: translationsToAdd,
  en: {
    "modelo_de_negocio": "Business Model",
    "arquitectura_modular": "Modular Architecture",
    "sistema_plug_play": "Plug & Play System"
  },
  pt: {
    "modelo_de_negocio": "Modelo de Negócios",
    "arquitectura_modular": "Arquitetura Modular",
    "sistema_plug_play": "Sistema Plug & Play"
  },
  de: {
    "modelo_de_negocio": "Geschäftsmodell",
    "arquitectura_modular": "Modulare Architektur",
    "sistema_plug_play": "Plug & Play System"
  },
  it: {
    "modelo_de_negocio": "Modello di Business",
    "arquitectura_modular": "Architettura Modulare",
    "sistema_plug_play": "Sistema Plug & Play"
  },
  fr: {
    "modelo_de_negocio": "Modèle d'Affaires",
    "arquitectura_modular": "Architecture Modulaire",
    "sistema_plug_play": "Système Plug & Play"
  }
};

const localesDir = path.join(__dirname, '../public/locales');
const languages = ['es', 'en', 'pt', 'de', 'it', 'fr'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Agregar las nuevas traducciones
  Object.keys(translations[lang]).forEach(key => {
    content[key] = translations[lang][key];
  });

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  console.log(`   ✅ ${lang}.json actualizado (${Object.keys(translations[lang]).length} traducciones)`);
});

// 2. ARREGLAR HERO MOBILE CSS
console.log('\n📝 Paso 2: Arreglando Hero responsive para mobile...');

const indexPath = path.join(__dirname, '../public/index.html');
let htmlContent = fs.readFileSync(indexPath, 'utf8');

// Buscar el media query de 768px y agregar reglas para hero
const heroMobileCSS = `
            /* Hero section mobile fixes */
            .hero {
                padding: 5rem 0 3rem !important;
                min-height: auto !important;
            }
            .hero-container {
                grid-template-columns: 1fr !important;
                gap: 2rem !important;
            }
            .hero-content {
                max-width: 100% !important;
            }
            .hero-visual {
                max-width: 100% !important;
                overflow: hidden !important;
            }
            .hero-dashboard {
                transform: scale(0.85) !important;
                margin: 0 auto !important;
            }
            .dashboard-content {
                padding: 1rem !important;
            }
            .dashboard-chart {
                height: 120px !important;
                gap: 4px !important;
            }
            .chart-bar {
                width: 100% !important;
                min-width: 8px !important;
            }
            .dashboard-metrics {
                grid-template-columns: 1fr !important;
                gap: 0.75rem !important;
            }
            .metric-card {
                padding: 0.75rem !important;
            }
            .floating-card {
                display: none !important;
            }`;

// Buscar el bloque @media (max-width: 768px) y agregar las reglas
const mediaQuery768Pattern = /(@media \(max-width: 768px\) \{[^}]*?)(\.saas-features-grid)/s;

if (mediaQuery768Pattern.test(htmlContent)) {
  htmlContent = htmlContent.replace(mediaQuery768Pattern, `$1${heroMobileCSS}\n            $2`);
  console.log('   ✅ CSS Hero mobile agregado al media query 768px');
} else {
  console.log('   ⚠️  No se encontró el media query 768px esperado');
}

// Guardar
fs.writeFileSync(indexPath, htmlContent, 'utf8');

console.log('\n✅ COMPLETADO:');
console.log('   1. Traducciones agregadas: modelo_de_negocio, arquitectura_modular, sistema_plug_play');
console.log('   2. Hero section ahora responsive en mobile (dashboard escalado 0.85, barras visibles)');
console.log('   3. Floating cards ocultas en mobile para no interferir\n');
