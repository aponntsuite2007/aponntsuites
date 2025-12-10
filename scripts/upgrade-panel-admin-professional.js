/**
 * Script para mejorar panel-administrativo a un diseño PROFESIONAL LIGHT
 * Cambios sutiles y seguros - NO dark theme
 * Ejecutar: node scripts/upgrade-panel-admin-professional.js
 */

const fs = require('fs');
const path = require('path');

console.log('Mejorando Panel Administrativo a estilo PROFESIONAL...\n');

const filePath = path.join(__dirname, '../backend/public/panel-administrativo.html');
let content = fs.readFileSync(filePath, 'utf8');

// ============================================================================
// 1. PALETA DE COLORES MÁS PROFESIONAL (Indigo/Slate moderna)
// ============================================================================

// Primary color: de púrpura a Indigo corporativo
content = content.replace(
    /--primary-color:\s*#667eea;/g,
    '--primary-color: #4f46e5;'
);

// Secondary: Violeta más elegante
content = content.replace(
    /--secondary-color:\s*#764ba2;/g,
    '--secondary-color: #7c3aed;'
);

// Dark text: Más profundo
content = content.replace(
    /--dark-text:\s*#2c3e50;/g,
    '--dark-text: #1e293b;'
);

console.log('Paleta de colores mejorada');

// ============================================================================
// 2. BODY BACKGROUND - Más sutil y profesional
// ============================================================================

content = content.replace(
    /background:\s*linear-gradient\(135deg,\s*#f5f7fa\s*0%,\s*#c3cfe2\s*100%\);/g,
    'background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);'
);

console.log('Fondo del body mejorado');

// ============================================================================
// 3. HEADER - Gradiente más sofisticado
// ============================================================================

// Header con gradiente slate profesional
content = content.replace(
    /\.dashboard-header\s*\{[^}]*background:\s*linear-gradient\(135deg,\s*#f8f9fa\s*0%,\s*#e9ecef\s*100%\);/g,
    '.dashboard-header {\n            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);'
);

// Color del header a blanco
content = content.replace(
    /\.dashboard-header\s*\{[^}]*color:\s*#1e293b;/g,
    '.dashboard-header {\n            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);\n            color: #f8fafc;'
);

console.log('Header con gradiente oscuro profesional');

// ============================================================================
// 4. STAT CARDS - Sombras más elegantes
// ============================================================================

content = content.replace(
    /\.stat-card\s*\{[^}]*box-shadow:\s*0\s*4px\s*15px\s*rgba\(0,0,0,0\.1\);/g,
    '.stat-card {\n            background: white;\n            padding: 1.5rem;\n            border-radius: 15px;\n            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);'
);

console.log('Stat cards con sombras mejoradas');

// ============================================================================
// 5. TABS - Borde inferior más visible
// ============================================================================

content = content.replace(
    /border-bottom:\s*3px\s*solid\s*#60a5fa;/g,
    'border-bottom: 3px solid #4f46e5;'
);

console.log('Tabs con acento de color actualizado');

// ============================================================================
// 6. BOTONES DE NAVEGACIÓN - Color consistente
// ============================================================================

content = content.replace(
    /background:\s*rgba\(0,\s*123,\s*255,\s*0\.9\);/g,
    'background: rgba(79, 70, 229, 0.95);'
);

content = content.replace(
    /background:\s*rgba\(0,\s*123,\s*255,\s*1\);/g,
    'background: rgba(79, 70, 229, 1);'
);

// Scrollbar color
content = content.replace(
    /scrollbar-color:\s*#007bff\s*#f8f9fa;/g,
    'scrollbar-color: #4f46e5 #f1f5f9;'
);

content = content.replace(
    /scrollbar-thumb\s*\{[^}]*background:\s*#007bff;/g,
    'scrollbar-thumb {\n            background: #4f46e5;'
);

console.log('Botones y scrollbar actualizados');

// ============================================================================
// GUARDAR ARCHIVO
// ============================================================================

fs.writeFileSync(filePath, content, 'utf8');

console.log('\n' + '='.repeat(60));
console.log('PANEL ADMINISTRATIVO MEJORADO - ESTILO PROFESIONAL');
console.log('='.repeat(60));
console.log('\nCambios realizados:');
console.log('   - Paleta de colores Indigo/Slate moderna');
console.log('   - Header con gradiente oscuro elegante');
console.log('   - Fondo body más sutil');
console.log('   - Sombras más refinadas');
console.log('   - Acentos de color consistentes');
console.log('\nRecarga http://localhost:9998/panel-administrativo.html con CTRL+F5');
