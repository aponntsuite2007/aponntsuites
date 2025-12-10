/**
 * Script para convertir CSS externos a Dark Theme
 * Ejecutar: node scripts/convert-css-to-dark-theme.js
 */

const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, '../backend/public/css');

const cssFiles = [
    'responsive-modals.css',
    'admin-modern.css',
    'engineering-dashboard.css',
    'modal-enterprise-styles.css',
    'modal-company-edit-tabs.css'
];

console.log('🌙 Convirtiendo archivos CSS a Dark Theme...\n');

function convertToDark(content) {
    let modified = content;

    // Fondos claros a oscuros
    modified = modified.replace(/#f8f9fa/g, '#21262d');
    modified = modified.replace(/#e9ecef/g, '#30363d');
    modified = modified.replace(/#f5f5f5/g, '#21262d');
    modified = modified.replace(/#f0f0f0/g, '#30363d');
    modified = modified.replace(/#dee2e6/g, '#30363d');
    modified = modified.replace(/#e1e1e1/g, '#30363d');
    modified = modified.replace(/#ddd/g, '#30363d');
    modified = modified.replace(/#ccc/g, '#30363d');

    // Backgrounds white
    modified = modified.replace(/background:\s*white/g, 'background: #161b22');
    modified = modified.replace(/background:\s*#fff([^f]|$)/gi, 'background: #161b22$1');
    modified = modified.replace(/background:\s*#ffffff/gi, 'background: #161b22');
    modified = modified.replace(/background-color:\s*white/g, 'background-color: #161b22');
    modified = modified.replace(/background-color:\s*#fff([^f]|$)/gi, 'background-color: #161b22$1');
    modified = modified.replace(/background-color:\s*#ffffff/gi, 'background-color: #161b22');

    // Textos oscuros a claros
    modified = modified.replace(/color:\s*#333([^0-9a-f]|$)/gi, 'color: #e6edf3$1');
    modified = modified.replace(/color:\s*#666([^0-9a-f]|$)/gi, 'color: #8b949e$1');
    modified = modified.replace(/color:\s*#495057/g, 'color: #e6edf3');
    modified = modified.replace(/color:\s*#343a40/g, 'color: #e6edf3');
    modified = modified.replace(/color:\s*#212529/g, 'color: #e6edf3');
    modified = modified.replace(/color:\s*#6c757d/g, 'color: #8b949e');

    // Bordes
    modified = modified.replace(/border:\s*1px\s+solid\s+#ddd/g, 'border: 1px solid #30363d');
    modified = modified.replace(/border:\s*1px\s+solid\s+#ccc/g, 'border: 1px solid #30363d');
    modified = modified.replace(/border:\s*1px\s+solid\s+#e9ecef/g, 'border: 1px solid #30363d');
    modified = modified.replace(/border-color:\s*#ddd/g, 'border-color: #30363d');
    modified = modified.replace(/border-color:\s*#ccc/g, 'border-color: #30363d');
    modified = modified.replace(/border-color:\s*#e9ecef/g, 'border-color: #30363d');

    // Status colors
    modified = modified.replace(/#e8f5e8/g, '#1a2e1a');
    modified = modified.replace(/#2e7d32/g, '#3fb950');
    modified = modified.replace(/#ffebee/g, '#3d1f1f');
    modified = modified.replace(/#d32f2f/g, '#f85149');
    modified = modified.replace(/#fff5f5/g, '#2d1f1f');
    modified = modified.replace(/#fff3cd/g, '#3d2e0f');

    // Gradientes claros a oscuros
    modified = modified.replace(/linear-gradient\(135deg,\s*#f5f7fa\s*0%,\s*#c3cfe2\s*100%\)/g,
        'linear-gradient(135deg, #0d1117 0%, #161b22 100%)');
    modified = modified.replace(/linear-gradient\(135deg,\s*#667eea\s*0%,\s*#764ba2\s*100%\)/g,
        'linear-gradient(135deg, #58a6ff 0%, #7c3aed 100%)');

    // Sombras más fuertes para dark mode
    modified = modified.replace(/rgba\(0,\s*0,\s*0,\s*0\.05\)/g, 'rgba(0,0,0,0.2)');
    modified = modified.replace(/rgba\(0,\s*0,\s*0,\s*0\.08\)/g, 'rgba(0,0,0,0.3)');
    modified = modified.replace(/rgba\(0,\s*0,\s*0,\s*0\.1\)/g, 'rgba(0,0,0,0.3)');
    modified = modified.replace(/rgba\(0,\s*0,\s*0,\s*0\.15\)/g, 'rgba(0,0,0,0.4)');

    return modified;
}

let totalChanges = 0;

for (const fileName of cssFiles) {
    const filePath = path.join(cssDir, fileName);

    if (fs.existsSync(filePath)) {
        const originalContent = fs.readFileSync(filePath, 'utf8');
        const modifiedContent = convertToDark(originalContent);

        if (originalContent !== modifiedContent) {
            fs.writeFileSync(filePath, modifiedContent, 'utf8');
            console.log(`✅ ${fileName} - Actualizado`);
            totalChanges++;
        } else {
            console.log(`⏩ ${fileName} - Sin cambios necesarios`);
        }
    } else {
        console.log(`⚠️ ${fileName} - No existe`);
    }
}

console.log(`\n✅ ${totalChanges} archivos CSS actualizados`);
console.log('\n🔄 Recarga la página con CTRL+F5 para ver los cambios');
