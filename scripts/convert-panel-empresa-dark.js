/**
 * Script para convertir panel-empresa a Dark Theme PROFESIONAL
 * SIN ROMPER NADA - Solo cambia colores
 * Ejecutar: node scripts/convert-panel-empresa-dark.js
 */

const fs = require('fs');
const path = require('path');

console.log('🌙 Convirtiendo Panel Empresa a Dark Theme PROFESIONAL...\n');

// ============================================================================
// 1. CONVERTIR admin-complete.css
// ============================================================================

const adminCompletePath = path.join(__dirname, '../backend/public/css/admin-complete.css');
let adminCSS = fs.readFileSync(adminCompletePath, 'utf8');

console.log('📄 Procesando admin-complete.css...');

// Body background
adminCSS = adminCSS.replace(
    /background-color:\s*#f5f5f5;/g,
    'background-color: #0d1117;'
);

// Header - de azul claro a azul oscuro profesional
adminCSS = adminCSS.replace(
    /linear-gradient\(135deg,\s*#a8d4f0\s*0%,\s*#b8c6f0\s*100%\)/g,
    'linear-gradient(135deg, #161b22 0%, #21262d 100%)'
);

// Cards y tabs de white a oscuro
adminCSS = adminCSS.replace(/background:\s*white;/g, 'background: #161b22;');
adminCSS = adminCSS.replace(/background-color:\s*white;/g, 'background-color: #161b22;');

// Tabs específicos
adminCSS = adminCSS.replace(
    /\.tabs\s*\{([^}]*?)background:\s*#161b22;/g,
    '.tabs {\n    display: flex;\n    background: #161b22;'
);

// Tab hover
adminCSS = adminCSS.replace(/#f8f9fa/g, '#21262d');

// Tab active - de celeste a azul oscuro brillante
adminCSS = adminCSS.replace(
    /linear-gradient\(135deg,\s*#87CEEB\s*0%,\s*#B0E0E6\s*100%\)/g,
    'linear-gradient(135deg, #1f6feb 0%, #58a6ff 100%)'
);

// Data table headers
adminCSS = adminCSS.replace(
    /\.data-table\s+th\s*\{([^}]*?)background:\s*linear-gradient\(135deg,\s*#1f6feb\s*0%,\s*#58a6ff\s*100%\)/g,
    '.data-table th {\n    background: linear-gradient(135deg, #1f6feb 0%, #238636 100%)'
);

// Stat items
adminCSS = adminCSS.replace(
    /\.stat-item\s*\{([^}]*?)background:\s*linear-gradient\(135deg,\s*#1f6feb\s*0%,\s*#58a6ff\s*100%\)/g,
    '.stat-item {\n    background: linear-gradient(135deg, #238636 0%, #2ea043 100%)'
);

// Textos oscuros a claros
adminCSS = adminCSS.replace(/color:\s*#2c3e50;/g, 'color: #e6edf3;');
adminCSS = adminCSS.replace(/color:\s*#333;/g, 'color: #e6edf3;');
adminCSS = adminCSS.replace(/color:\s*#555;/g, 'color: #c9d1d9;');
adminCSS = adminCSS.replace(/color:\s*#6c757d;/g, 'color: #8b949e;');

// Bordes
adminCSS = adminCSS.replace(/#e1e5e9/g, '#30363d');
adminCSS = adminCSS.replace(/#e9ecef/g, '#30363d');
adminCSS = adminCSS.replace(/#e0e0e0/g, '#30363d');
adminCSS = adminCSS.replace(/#eee/g, '#30363d');

// Server info background
adminCSS = adminCSS.replace(
    /\.server-info\s*\{([^}]*?)background:\s*#21262d;/g,
    '.server-info {\n    background: #21262d;'
);

// Stat card
adminCSS = adminCSS.replace(
    /\.stat-card\s*\{([^}]*?)background:\s*#161b22;/g,
    '.stat-card {\n    background: #161b22;\n    border: 1px solid #30363d;'
);

// Stat number color
adminCSS = adminCSS.replace(/color:\s*#4682B4;/g, 'color: #58a6ff;');

// Status badges - dark versions
adminCSS = adminCSS.replace(/#d4edda/g, '#1a2e1a');
adminCSS = adminCSS.replace(/#155724/g, '#3fb950');
adminCSS = adminCSS.replace(/#fff3cd/g, '#3d2e0f');
adminCSS = adminCSS.replace(/#856404/g, '#d29922');
adminCSS = adminCSS.replace(/#f8d7da/g, '#3d1f1f');
adminCSS = adminCSS.replace(/#721c24/g, '#f85149');

// Table hover
adminCSS = adminCSS.replace(
    /\.data-table\s+tbody\s+tr:hover\s*\{([^}]*?)background-color:\s*#21262d;/g,
    '.data-table tbody tr:hover {\n    background-color: #21262d;'
);

// Sombras más sutiles para dark
adminCSS = adminCSS.replace(/rgba\(0,\s*0,\s*0,\s*0\.1\)/g, 'rgba(0,0,0,0.3)');
adminCSS = adminCSS.replace(/rgba\(0,\s*0,\s*0,\s*0\.2\)/g, 'rgba(0,0,0,0.4)');

fs.writeFileSync(adminCompletePath, adminCSS, 'utf8');
console.log('✅ admin-complete.css actualizado');

// ============================================================================
// 2. CONVERTIR tech-badges.css
// ============================================================================

const techBadgesPath = path.join(__dirname, '../backend/public/css/tech-badges.css');
if (fs.existsSync(techBadgesPath)) {
    let techCSS = fs.readFileSync(techBadgesPath, 'utf8');

    techCSS = techCSS.replace(/#f8f9fa/g, '#21262d');
    techCSS = techCSS.replace(/background:\s*white/g, 'background: #161b22');
    techCSS = techCSS.replace(/color:\s*#333/g, 'color: #e6edf3');
    techCSS = techCSS.replace(/color:\s*#666/g, 'color: #8b949e');

    fs.writeFileSync(techBadgesPath, techCSS, 'utf8');
    console.log('✅ tech-badges.css actualizado');
}

// ============================================================================
// 3. CONVERTIR modal-fullscreen-responsive.css
// ============================================================================

const modalFullscreenPath = path.join(__dirname, '../backend/public/css/modal-fullscreen-responsive.css');
if (fs.existsSync(modalFullscreenPath)) {
    let modalCSS = fs.readFileSync(modalFullscreenPath, 'utf8');

    modalCSS = modalCSS.replace(/#f8f9fa/g, '#21262d');
    modalCSS = modalCSS.replace(/background:\s*white/g, 'background: #161b22');
    modalCSS = modalCSS.replace(/background-color:\s*white/g, 'background-color: #161b22');
    modalCSS = modalCSS.replace(/background:\s*#fff([^f]|$)/gi, 'background: #161b22$1');
    modalCSS = modalCSS.replace(/color:\s*#333/g, 'color: #e6edf3');
    modalCSS = modalCSS.replace(/color:\s*#666/g, 'color: #8b949e');
    modalCSS = modalCSS.replace(/#e9ecef/g, '#30363d');
    modalCSS = modalCSS.replace(/#ddd/g, '#30363d');

    fs.writeFileSync(modalFullscreenPath, modalCSS, 'utf8');
    console.log('✅ modal-fullscreen-responsive.css actualizado');
}

// ============================================================================
// 4. AGREGAR VARIABLES CSS DARK AL INICIO DE admin-complete.css
// ============================================================================

const darkRootVars = `/* ============================================
   DARK THEME - Panel Empresa Profesional
   Palette: GitHub Dark Style
   ============================================ */

:root {
    --bg-primary: #0d1117;
    --bg-secondary: #161b22;
    --bg-tertiary: #21262d;
    --text-primary: #e6edf3;
    --text-secondary: #8b949e;
    --border-color: #30363d;
    --accent-blue: #58a6ff;
    --accent-green: #3fb950;
    --accent-purple: #a371f7;
    --accent-orange: #f0883e;
    --accent-red: #f85149;
}

`;

// Leer de nuevo y agregar variables al inicio
let finalCSS = fs.readFileSync(adminCompletePath, 'utf8');
if (!finalCSS.includes('--bg-primary:')) {
    finalCSS = darkRootVars + finalCSS;
    fs.writeFileSync(adminCompletePath, finalCSS, 'utf8');
    console.log('✅ Variables CSS dark agregadas');
}

console.log('\n' + '='.repeat(60));
console.log('🌙 DARK THEME PROFESIONAL APLICADO A PANEL-EMPRESA');
console.log('='.repeat(60));
console.log('\n📌 Archivos modificados:');
console.log('   - css/admin-complete.css');
console.log('   - css/tech-badges.css');
console.log('   - css/modal-fullscreen-responsive.css');
console.log('\n🔄 Recarga http://localhost:9998/panel-empresa.html con CTRL+F5');
