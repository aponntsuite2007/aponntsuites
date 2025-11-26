#!/usr/bin/env node
/**
 * Script v3 - Limpieza PROFUNDA de todas las referencias restantes a iris/voice
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'modules', 'biometric.js');
const backupPath = path.join(__dirname, 'public', 'js', 'modules', 'biometric.js.backup_v3_' + Date.now());

console.log('🔥 [CLEAN-V3] Limpieza PROFUNDA de iris/voice');

// Leer archivo
let content = fs.readFileSync(filePath, 'utf-8');
let lines = content.split('\n');

console.log(`📊 Líneas originales: ${lines.length}`);

// Crear backup
fs.writeFileSync(backupPath, content, 'utf-8');
console.log(`💾 Backup: ${backupPath}`);

let removedLines = 0;
let cleanedLines = [];

// Procesar línea por línea
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Saltar líneas que contengan referencias a iris/voice
    if (
        lower.includes('iris') ||
        lower.includes('voice') ||
        lower.includes(' voz') ||
        lower.includes('voz:') ||
        lower.includes('voz,')
    ) {
        // EXCEPCIONES: No eliminar si es parte de algo importante
        if (
            lower.includes('device') ||  // deviceIris podría ser legítimo
            lower.includes('supervisor')  // supervisor tiene "vis" que matchea
        ) {
            cleanedLines.push(line);
            continue;
        }

        console.log(`🗑️ Línea ${i + 1}: ${line.trim().substring(0, 80)}`);
        removedLines++;
        continue;
    }

    cleanedLines.push(line);
}

content = cleanedLines.join('\n');

// Limpiezas adicionales con regex
console.log('\n🧹 Limpieza adicional con regex...');

// Eliminar bloques HTML específicos que quedaron
content = content.replace(/<div[^>]*>\s*<div[^>]*>\s*<div[^>]*>Iris<\/div>[\s\S]*?<\/div>\s*<\/div>/gi, '');
content = content.replace(/<div[^>]*>\s*<div[^>]*>\s*<div[^>]*>Voz<\/div>[\s\S]*?<\/div>\s*<\/div>/gi, '');

// Eliminar referencias en arrays de modalidades
content = content.replace(/,\s*'iris'/g, '');
content = content.replace(/,\s*'voice'/g, '');
content = content.replace(/'iris'\s*,/g, '');
content = content.replace(/'voice'\s*,/g, '');

// Limpiar objetos con propiedades iris/voice (más agresivo)
content = content.replace(/iris:\s*[^,}]+,?\s*/g, '');
content = content.replace(/voice:\s*[^,}]+,?\s*/g, '');

// Limpiar comentarios de sección
content = content.replace(/\/\/ 🗣️.*$/gm, '');
content = content.replace(/\* 🎯.*iris.*$/gmi, '');

// Reemplazar textos descriptivos restantes
content = content.replace(/Facial,\s*Iris,\s*Voz,\s*Huella/g, 'Facial, Huella');
content = content.replace(/Modalidades disponibles:.*Iris.*Huella/g, 'Modalidades disponibles: Facial, Huella');

// Limpiar líneas vacías múltiples
content = content.replace(/\n\n\n+/g, '\n\n');

// Guardar
fs.writeFileSync(filePath, content, 'utf-8');

console.log(`\n✅ Limpieza completada`);
console.log(`📊 Líneas eliminadas: ${removedLines}`);
console.log(`📊 Líneas finales: ${content.split('\n').length}`);

// Verificar sintaxis
console.log('\n🔍 Verificando sintaxis...');
const { execSync } = require('child_process');
try {
    execSync(`node -c "${filePath}"`, { stdio: 'inherit' });
    console.log('✅ Sintaxis JavaScript válida');
} catch (error) {
    console.error('❌ Error de sintaxis');
    fs.copyFileSync(backupPath, filePath);
    console.error('⚠️ Backup restaurado');
    process.exit(1);
}

// Contar referencias restantes
const { execSync: exec2 } = require('child_process');
try {
    const result = exec2('grep -i "iris\\|voice\\|voz" "' + filePath + '" | wc -l', { encoding: 'utf-8' });
    console.log(`\n📊 Referencias restantes: ${result.trim()}`);
} catch (e) {
    console.log('\n📊 No se pudo contar referencias restantes (comando grep no disponible en Windows)');
}
