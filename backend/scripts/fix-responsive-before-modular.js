const fs = require('fs');
const path = require('path');

console.log('\n📱 Arreglando responsive para secciones antes de Arquitectura Modular...\n');

const indexPath = path.join(__dirname, '../public/index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Agregar clases a los grids inline que no tienen responsive
console.log('📝 Paso 1: Agregando clases CSS a grids inline...');

// SaaS B2B section - 4 columnas
content = content.replace(
  /<div style="display: grid; grid-template-columns: repeat\(4, 1fr\); gap: 2rem;">/g,
  '<div class="saas-features-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem;">'
);

// SaaS definition section - 2 columnas
content = content.replace(
  /<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;">/g,
  '<div class="saas-definition-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;">'
);

// Stats grid - 2 columnas
content = content.replace(
  /<div style="display: grid; grid-template-columns: repeat\(2, 1fr\); gap: 1rem;">\s*<div style="padding: 1.25rem; background: var\(--bg-light\)/,
  '<div class="saas-stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">\n                        <div style="padding: 1.25rem; background: var(--bg-light)'
);

console.log('✅ Clases agregadas');

// 2. Buscar el final de los media queries existentes y agregar los nuevos
console.log('📝 Paso 2: Agregando media queries para responsive...');

const responsiveRules = `
        /* ========== RESPONSIVE FIXES - Secciones antes de Arquitectura Modular ========== */
        @media (max-width: 1024px) {
            .saas-features-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 1.5rem !important;
            }
            .hero-stats {
                grid-template-columns: repeat(2, 1fr) !important;
            }
        }

        @media (max-width: 768px) {
            .saas-features-grid {
                grid-template-columns: 1fr !important;
                gap: 1rem !important;
            }
            .saas-definition-grid {
                grid-template-columns: 1fr !important;
                gap: 2rem !important;
            }
            .saas-stats-grid {
                grid-template-columns: 1fr !important;
                gap: 0.75rem !important;
            }
            .hero-stats {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 0.75rem !important;
            }
            .hero-stat {
                padding: 0.75rem !important;
            }
            .hero-stat-value {
                font-size: 1.5rem !important;
            }
            .hero-stat-label {
                font-size: 0.7rem !important;
            }
        }

        @media (max-width: 480px) {
            .saas-features-grid {
                grid-template-columns: 1fr !important;
            }
            .hero-stats {
                grid-template-columns: 1fr !important;
            }
        }`;

// Buscar el último media query (antes del </style>)
const styleClosePattern = /(\s*)<\/style>/;
content = content.replace(styleClosePattern, `${responsiveRules}\n$1</style>`);

console.log('✅ Media queries agregados');

// 3. Guardar
fs.writeFileSync(indexPath, content, 'utf8');

console.log('\n✅ COMPLETADO - Responsive arreglado para:');
console.log('   - SaaS B2B features grid (4 → 2 → 1 columnas)');
console.log('   - SaaS definition grid (2 → 1 columnas)');
console.log('   - SaaS stats grid (2 → 1 columnas)');
console.log('   - Hero stats (4 → 2 → 1 columnas)');
console.log('\n📱 Ahora la página se verá bien en mobile/tablet antes de "Arquitectura Modular"\n');
