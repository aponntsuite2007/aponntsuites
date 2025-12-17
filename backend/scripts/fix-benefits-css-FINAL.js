const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/modules/benefits-management.js');

console.log('🔧 Fixing CSS rendering issue in benefits-management.js...\n');

// Read and normalize line endings
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Find <style> tags
const styleStart = content.indexOf('        <style>');
const styleEnd = content.indexOf('        </style>');

if (styleStart === -1 || styleEnd === -1) {
    console.error('❌ ERROR: No se encontraron tags <style>');
    console.error('styleStart:', styleStart, 'styleEnd:', styleEnd);
    process.exit(1);
}

console.log('✅ Encontrado bloque <style> en posiciones:', styleStart, '-', styleEnd);

// Extract CSS (without <style> tags)
const cssContent = content.substring(styleStart + '        <style>\n'.length, styleEnd);

console.log('✅ CSS extraído:', cssContent.length, 'caracteres');

// Build inject function
const injectFunc = `// ============================================================================
// INYECCIÓN DE ESTILOS EN HEAD (PATRÓN CORRECTO)
// ============================================================================
function injectBenefitsStyles() {
    // Evitar duplicados
    if (document.getElementById('benefits-management-styles')) return;

    const style = document.createElement('style');
    style.id = 'benefits-management-styles';
    style.textContent = \`${cssContent}\`;

    document.head.appendChild(style);
    console.log('🎨 [BENEFITS] Estilos dark theme inyectados en <head>');
}

`;

// Find insertion points
const marker = 'window.BenefitsEngine = true;\n\n';
const markerPos = content.indexOf(marker);

if (markerPos === -1) {
    console.error('❌ ERROR: No se encontró marker window.BenefitsEngine');
    process.exit(1);
}

const divContainer = content.indexOf('        <div class="benefits-container">', styleStart);
if (divContainer === -1) {
    console.error('❌ ERROR: No se encontró <div class="benefits-container">');
    process.exit(1);
}

console.log('✅ Puntos de inserción encontrados');

// Build new content
let newContent = '';

// Part 1: Everything up to and including marker
newContent += content.substring(0, markerPos + marker.length);

// Part 2: Inject function
newContent += injectFunc;

// Part 3: Function header
newContent += '// ============================================================================\n';
newContent += '// FUNCIÓN PRINCIPAL\n';
newContent += '// ============================================================================\n';
newContent += 'function showBenefitsManagementContent() {\n';
newContent += '    // Inyectar estilos ANTES de renderizar contenido\n';
newContent += '    injectBenefitsStyles();\n\n';
newContent += '    const content = document.getElementById(\'mainContent\');\n';
newContent += '    if (!content) return;\n\n';
newContent += '    content.innerHTML = `\n';

// Part 4: Everything from <div class="benefits-container"> onwards (skip <style> block)
newContent += content.substring(divContainer);

// Write file with Windows line endings
const finalContent = newContent.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, finalContent, 'utf8');

console.log('\n✅ ¡COMPLETADO EXITOSAMENTE!');
console.log('📝 Cambios realizados:');
console.log('   1. CSS extraído del template literal (innerHTML)');
console.log('   2. Función injectBenefitsStyles() creada');
console.log('   3. Estilos ahora se inyectan en document.head');
console.log('   4. El módulo YA NO mostrará CSS como texto');
console.log('\n🚀 Reinicia el servidor y prueba el módulo');
console.log('📂 Archivo modificado:', filePath);
