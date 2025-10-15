#!/usr/bin/env node
/**
 * Script para limpiar referencias a iris y voice del archivo biometric.js
 * Mantiene intacta la funcionalidad de face y fingerprint
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'modules', 'biometric.js');
const backupPath = path.join(__dirname, 'public', 'js', 'modules', 'biometric.js.backup_' + Date.now());

console.log('🧹 [CLEAN] Iniciando limpieza de iris/voice en biometric.js');
console.log(`📄 Archivo: ${filePath}`);

// Leer archivo
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log(`📊 Total líneas originales: ${lines.length}`);

// Crear backup
fs.writeFileSync(backupPath, content, 'utf-8');
console.log(`💾 Backup creado: ${backupPath}`);

// Contador de líneas eliminadas
let linesRemoved = 0;
let sectionsRemoved = [];

// Procesar línea por línea
const newLines = [];
let inIrisSection = false;
let inVoiceSection = false;
let skipLinesCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Si estamos saltando líneas, decrementar contador
    if (skipLinesCount > 0) {
        skipLinesCount--;
        linesRemoved++;
        continue;
    }

    // Detectar inicio de secciones grandes de iris/voice
    if (line.includes('<!-- Iris Verification Tab -->')) {
        inIrisSection = true;
        sectionsRemoved.push(`Línea ${i + 1}: Iris Verification Tab`);
        linesRemoved++;
        continue;
    }

    if (line.includes('<!-- Captura de Iris')) {
        inIrisSection = true;
        sectionsRemoved.push(`Línea ${i + 1}: Captura de Iris section`);
        linesRemoved++;
        continue;
    }

    if (line.includes('<!-- Captura de Voz')) {
        inVoiceSection = true;
        sectionsRemoved.push(`Línea ${i + 1}: Captura de Voz section`);
        linesRemoved++;
        continue;
    }

    // Detectar fin de secciones
    if (inIrisSection && (line.includes('</div>') && line.trim() === '</div>')) {
        inIrisSection = false;
        linesRemoved++;
        continue;
    }

    if (inVoiceSection && (line.includes('</div>') && line.trim() === '</div>')) {
        inVoiceSection = false;
        linesRemoved++;
        continue;
    }

    // Si estamos dentro de sección iris/voice, saltar línea
    if (inIrisSection || inVoiceSection) {
        linesRemoved++;
        continue;
    }

    // Detectar funciones completas de iris/voice
    if (lowerLine.includes('function') && (lowerLine.includes('iris') || lowerLine.includes('voice'))) {
        // Contar líneas hasta el final de la función
        let braceCount = 0;
        let functionStarted = false;
        let j = i;

        for (; j < lines.length; j++) {
            const funcLine = lines[j];
            if (funcLine.includes('{')) {
                braceCount++;
                functionStarted = true;
            }
            if (funcLine.includes('}')) {
                braceCount--;
            }
            if (functionStarted && braceCount === 0) {
                break;
            }
        }

        const funcLines = j - i + 1;
        sectionsRemoved.push(`Línea ${i + 1}: Función ${line.trim()} (${funcLines} líneas)`);
        skipLinesCount = funcLines - 1;
        linesRemoved++;
        continue;
    }

    // Detectar líneas individuales con referencias a iris/voice
    if (
        lowerLine.includes('iris') ||
        lowerLine.includes('voice') ||
        lowerLine.includes('voz') ||
        lowerLine.match(/['"]iris['"]/) ||
        lowerLine.match(/['"]voice['"]/)
    ) {
        // Verificar que no sea parte de comentarios de código crítico
        if (!lowerLine.includes('face') && !lowerLine.includes('fingerprint')) {
            linesRemoved++;
            continue;
        }
    }

    // Línea válida - mantener
    newLines.push(line);
}

console.log(`✂️ Líneas eliminadas: ${linesRemoved}`);
console.log(`📊 Líneas finales: ${newLines.length}`);

// Ahora procesar el contenido para limpiar referencias en arrays y objetos
let newContent = newLines.join('\n');

// Limpiar arrays de modalidades
newContent = newContent.replace(/\['face',\s*'fingerprint',\s*'iris',\s*'voice'\]/g, "['face', 'fingerprint']");
newContent = newContent.replace(/\['face',\s*'fingerprint',\s*'iris'\]/g, "['face', 'fingerprint']");
newContent = newContent.replace(/\['facial',\s*'iris',\s*'voice',\s*'fingerprint'\]/g, "['facial', 'fingerprint']");
newContent = newContent.replace(/\['facial',\s*'fingerprint',\s*'iris',\s*'voice'\]/g, "['facial', 'fingerprint']");

// Limpiar objetos con propiedades iris/voice
newContent = newContent.replace(/iris:\s*[^,}]+,?\s*/g, '');
newContent = newContent.replace(/voice:\s*[^,}]+,?\s*/g, '');
newContent = newContent.replace(/hasIris:\s*[^,}]+,?\s*/g, '');
newContent = newContent.replace(/hasVoice:\s*[^,}]+,?\s*/g, '');

// Limpiar textos descriptivos
newContent = newContent.replace(/Facial \+ Iris \+ Voz \+ Huella/g, 'Facial + Huella');
newContent = newContent.replace(/4 modalidades/g, '2 modalidades');
newContent = newContent.replace(/Multi-Modales \(Facial \+ Iris \+ Voz\)/g, 'Multi-Modales (Facial + Huella)');

// Limpiar tabs de verificación
newContent = newContent.replace(/<button onclick="showVerificationTab\('iris'\)"[^>]*>[\s\S]*?<\/button>/g, '');
newContent = newContent.replace(/<button onclick="showVerificationTab\('voice'\)"[^>]*>[\s\S]*?<\/button>/g, '');

// Limpiar event listeners
newContent = newContent.replace(/onclick="startIris[^"]*"/g, '');
newContent = newContent.replace(/onclick="startVoice[^"]*"/g, '');
newContent = newContent.replace(/onclick="simulateIris[^"]*"/g, '');
newContent = newContent.replace(/onclick="simulateVoice[^"]*"/g, '');

// Guardar archivo limpio
fs.writeFileSync(filePath, newContent, 'utf-8');

console.log('✅ [CLEAN] Archivo limpiado exitosamente');
console.log('\n📋 Secciones eliminadas:');
sectionsRemoved.forEach(section => console.log(`   - ${section}`));

console.log('\n📄 Resumen:');
console.log(`   - Líneas originales: ${lines.length}`);
console.log(`   - Líneas eliminadas: ${linesRemoved}`);
console.log(`   - Líneas finales: ${newLines.length}`);
console.log(`   - Backup: ${backupPath}`);
