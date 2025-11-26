#!/usr/bin/env node
/**
 * Script para reparar sintaxis del archivo biometric.js
 * Elimina else/if huérfanos y balancea llaves
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'js', 'modules', 'biometric.js');
const backupPath = path.join(__dirname, 'public', 'js', 'modules', 'biometric.js.backup_syntax_' + Date.now());

console.log('🔧 [FIX] Reparando sintaxis de biometric.js');

// Leer archivo
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log(`📊 Total líneas: ${lines.length}`);

// Crear backup
fs.writeFileSync(backupPath, content, 'utf-8');
console.log(`💾 Backup creado: ${backupPath}`);

// Contador de fixes
let fixCount = 0;

// Procesar línea por línea buscando else/if huérfanos
const newLines = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detectar else huérfano (else sin if previo)
    if (trimmed === '} else {' || trimmed === '} else if' || trimmed.startsWith('} else')) {
        // Verificar si hay un if válido antes
        let hasValidIf = false;
        for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
            const prevLine = lines[j].trim();
            if (prevLine.includes('if (') || prevLine.includes('if(')) {
                hasValidIf = true;
                break;
            }
        }

        if (!hasValidIf) {
            console.log(`🔧 [FIX] Línea ${i + 1}: Eliminando else huérfano: ${trimmed}`);
            fixCount++;
            // Saltar esta línea y buscar el cierre del bloque
            let braceCount = 1;
            i++; // Saltar el else
            while (i < lines.length && braceCount > 0) {
                const nextLine = lines[i];
                if (nextLine.includes('{')) braceCount++;
                if (nextLine.includes('}')) braceCount--;
                if (braceCount > 0) {
                    i++;
                } else {
                    break;
                }
            }
            continue;
        }
    }

    // Detectar llave de cierre huérfana sola en una línea
    if (trimmed === '}' && i > 0) {
        const prevLine = lines[i - 1].trim();
        // Si la línea anterior también es }, puede ser código válido
        // Solo eliminar si parece estar fuera de contexto
        if (prevLine === '}' && i > 1 && lines[i - 2].trim() === '}') {
            console.log(`🔧 [FIX] Línea ${i + 1}: Eliminando llave extra: ${trimmed}`);
            fixCount++;
            continue;
        }
    }

    newLines.push(line);
}

console.log(`✂️ Fixes aplicados: ${fixCount}`);
console.log(`📊 Líneas finales: ${newLines.length}`);

// Guardar archivo reparado
const newContent = newLines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf-8');

console.log('✅ [FIX] Archivo reparado exitosamente');
console.log(`💾 Backup en: ${backupPath}`);

// Verificar sintaxis
console.log('\n🔍 Verificando sintaxis...');
const { execSync } = require('child_process');
try {
    execSync(`node -c "${filePath}"`, { stdio: 'inherit' });
    console.log('✅ Sintaxis JavaScript válida');
} catch (error) {
    console.error('❌ Aún hay errores de sintaxis');
    process.exit(1);
}
