#!/usr/bin/env node
/**
 * Script v2 para limpiar referencias a iris y voice del archivo biometric.js
 * Enfoque más cuidadoso que mantiene la integridad del código
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'modules', 'biometric.js');
const backupPath = path.join(__dirname, 'public', 'js', 'modules', 'biometric.js.backup_v2_' + Date.now());

console.log('🧹 [CLEAN-V2] Limpieza inteligente de iris/voice en biometric.js');
console.log(`📄 Archivo: ${filePath}`);

// Leer archivo
let content = fs.readFileSync(filePath, 'utf-8');

console.log(`📊 Tamaño original: ${content.length} bytes`);

// Crear backup
fs.writeFileSync(backupPath, content, 'utf-8');
console.log(`💾 Backup creado: ${backupPath}`);

let changesMade = [];

// ===== PASO 1: Eliminar bloques HTML grandes de iris/voice =====
console.log('\n📝 PASO 1: Eliminando bloques HTML...');

// Eliminar tab completo de Iris Verification
const irisTabRegex = /<!--\s*Iris Verification Tab\s*-->[\s\S]*?<div id="iris-content"[\s\S]*?<\/div>\s*<\/div>/g;
if (content.match(irisTabRegex)) {
    content = content.replace(irisTabRegex, '');
    changesMade.push('Eliminado: Tab completo de Iris Verification');
}

// Eliminar sección de captura de Iris
const irisCaptureRegex = /<!--\s*Captura de Iris[\s\S]*?-->[\s\S]*?<div[^>]*>[\s\S]*?Reconocimiento por Iris[\s\S]*?<\/div>[\s\S]*?<\/div>/g;
if (content.match(irisCaptureRegex)) {
    content = content.replace(irisCaptureRegex, '');
    changesMade.push('Eliminado: Sección de captura de Iris');
}

// Eliminar sección de captura de Voz
const voiceCaptureRegex = /<!--\s*Captura de Voz[\s\S]*?-->[\s\S]*?<div[^>]*>[\s\S]*?Reconocimiento por Voz[\s\S]*?<\/div>[\s\S]*?<\/div>/g;
if (content.match(voiceCaptureRegex)) {
    content = content.replace(voiceCaptureRegex, '');
    changesMade.push('Eliminado: Sección de captura de Voz');
}

// Eliminar botones individuales de iris/voice
content = content.replace(/<button[^>]*onclick="[^"]*[Ii]ris[^"]*"[^>]*>[\s\S]*?<\/button>/g, '');
content = content.replace(/<button[^>]*onclick="[^"]*[Vv]oice[^"]*"[^>]*>[\s\S]*?<\/button>/g, '');
changesMade.push('Eliminados: Botones de iris/voice');

// ===== PASO 2: Eliminar funciones completas =====
console.log('\n🔧 PASO 2: Eliminando funciones...');

// Lista de funciones a eliminar
const functionsToRemove = [
    'simulateIrisVerification',
    'startIrisVerification',
    'startVoiceVerification',
    'simulateVoiceVerificationResult',
    'startIrisVerificationWithEmployee',
    'startVoiceVerificationWithEmployee',
    'startIrisCapture',
    'startVoiceCapture',
    'startAdvancedIrisCapture',
    'startRealIrisCapture',
    'startRealVoiceCapture',
    'drawIrisCross',
    'analyzeIrisPosition',
    'analyzeVoiceQuality',
    'generateIrisRecommendations',
    'generateVoiceRecommendations',
    'drawVoiceVisualization'
];

functionsToRemove.forEach(funcName => {
    // Regex para función completa (incluyendo async)
    const funcRegex = new RegExp(
        `(?:async\\s+)?function\\s+${funcName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}(?=\\s*\\n)`,
        'g'
    );

    if (content.match(funcRegex)) {
        content = content.replace(funcRegex, '');
        changesMade.push(`Eliminada función: ${funcName}`);
    }
});

// ===== PASO 3: Limpiar arrays y objetos =====
console.log('\n🎨 PASO 3: Limpiando arrays y objetos...');

// Limpiar arrays de modalidades
content = content.replace(/\['face',\s*'fingerprint',\s*'iris',\s*'voice'\]/g, "['face', 'fingerprint']");
content = content.replace(/\['face',\s*'fingerprint',\s*'iris'\]/g, "['face', 'fingerprint']");
content = content.replace(/\['facial',\s*'iris',\s*'voice',\s*'fingerprint'\]/g, "['facial', 'fingerprint']");
content = content.replace(/\['facial',\s*'fingerprint',\s*'iris',\s*'voice'\]/g, "['facial', 'fingerprint']");
changesMade.push('Actualizados: Arrays de modalidades');

// Limpiar propiedades de objetos
content = content.replace(/,?\s*iris:\s*[^,}\n]+/g, '');
content = content.replace(/,?\s*voice:\s*[^,}\n]+/g, '');
content = content.replace(/,?\s*hasIris:\s*[^,}\n]+/g, '');
content = content.replace(/,?\s*hasVoice:\s*[^,}\n]+/g, '');
changesMade.push('Eliminadas: Propiedades iris/voice de objetos');

// ===== PASO 4: Actualizar textos descriptivos =====
console.log('\n📝 PASO 4: Actualizando textos...');

content = content.replace(/Facial \+ Iris \+ Voz \+ Huella/g, 'Facial + Huella');
content = content.replace(/\(Facial \+ Iris \+ Voz\)/g, '(Facial + Huella)');
content = content.replace(/4 modalidades/gi, '2 modalidades');
content = content.replace(/Stanford FaceNet \+ Daugman Iris \+ MFCC-DNN Voice \+ Minutiae Fingerprint/g,
                          'Stanford FaceNet + Minutiae Fingerprint');
changesMade.push('Actualizados: Textos descriptivos');

// ===== PASO 5: Eliminar comentarios y logs =====
console.log('\n🗑️ PASO 5: Limpiando comentarios y logs...');

// Eliminar comentarios que mencionen iris/voice
content = content.replace(/\/\/.*?[Ii]ris.*/g, '');
content = content.replace(/\/\/.*?[Vv]o[zi]ce.*/g, '');
changesMade.push('Eliminados: Comentarios de iris/voice');

// Limpiar console.log con iris/voice
content = content.replace(/console\.log\([^)]*[Ii]ris[^)]*\);?\n?/g, '');
content = content.replace(/console\.log\([^)]*[Vv]o[zi]ce[^)]*\);?\n?/g, '');

// ===== PASO 6: Limpiar event handlers huérfanos =====
console.log('\n🔌 PASO 6: Limpiando event handlers...');

content = content.replace(/onclick="start[Ii]ris[^"]*"/g, 'onclick=""');
content = content.replace(/onclick="start[Vv]oice[^"]*"/g, 'onclick=""');
content = content.replace(/onclick="simulate[Ii]ris[^"]*"/g, 'onclick=""');
changesMade.push('Limpiados: Event handlers de iris/voice');

// ===== PASO 7: Limpiar status indicators =====
console.log('\n📊 PASO 7: Limpiando status indicators...');

// Eliminar divs de status de iris/voice
content = content.replace(/<div[^>]*id="iris-status"[^>]*>[\s\S]*?<\/div>/g, '');
content = content.replace(/<div[^>]*id="voice-status"[^>]*>[\s\S]*?<\/div>/g, '');
changesMade.push('Eliminados: Status indicators de iris/voice');

// ===== PASO 8: Limpiar líneas vacías múltiples =====
console.log('\n🧹 PASO 8: Limpiando formato...');

content = content.replace(/\n\n\n+/g, '\n\n');

// Guardar archivo limpio
fs.writeFileSync(filePath, content, 'utf-8');

console.log('\n✅ [CLEAN-V2] Limpieza completada exitosamente');
console.log(`\n📋 Cambios realizados (${changesMade.length}):`);
changesMade.forEach(change => console.log(`   ✓ ${change}`));

console.log(`\n📊 Tamaño final: ${content.length} bytes`);
console.log(`💾 Backup: ${backupPath}`);

// Verificar sintaxis
console.log('\n🔍 Verificando sintaxis...');
const { execSync } = require('child_process');
try {
    execSync(`node -c "${filePath}"`, { stdio: 'inherit' });
    console.log('✅ Sintaxis JavaScript válida');
} catch (error) {
    console.error('❌ Error de sintaxis detectado');
    console.error('   Restaurando backup...');
    fs.copyFileSync(backupPath, filePath);
    console.error('   Backup restaurado. Revisar script de limpieza.');
    process.exit(1);
}
