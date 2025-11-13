/**
 * ============================================================================
 * SCRIPT DE LIMPIEZA DE ARCHIVOS INNECESARIOS
 * ============================================================================
 *
 * Identifica y opcionalmente elimina archivos innecesarios para liberar espacio.
 *
 * Archivos a limpiar:
 * - Instaladores (.exe, .msi)
 * - Backups duplicados (.bak, .backup, .old)
 * - Logs antiguos (>30 días)
 * - Archivos temporales (.tmp)
 *
 * IMPORTANTE: Este script NO borra nada automáticamente.
 * Solo muestra un reporte de lo que se PUEDE borrar.
 *
 * @version 1.0.0
 * @created 2025-11-01
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Rutas base
const BASE_DIR = path.resolve('C:/Bio');

// Patrones de archivos a limpiar
const CLEANUP_PATTERNS = {
    installers: {
        extensions: ['.exe', '.msi'],
        exclude: ['node_modules'], // No tocar .exe dentro de node_modules
        description: 'Instaladores'
    },
    backups: {
        extensions: ['.bak', '.backup', '.old'],
        exclude: [],
        description: 'Archivos de backup'
    },
    temp: {
        extensions: ['.tmp', '.temp'],
        exclude: [],
        description: 'Archivos temporales'
    },
    logs: {
        extensions: ['.log'],
        exclude: ['node_modules'],
        description: 'Logs antiguos (>30 días)',
        ageInDays: 30
    }
};

// Carpetas completas que se pueden borrar (OPCIONALES)
const OPTIONAL_FOLDERS = [
    {
        path: 'C:/Bio/aponntsuites-clean',
        description: 'Copia antigua del proyecto (parece duplicado)',
        reason: 'Proyecto duplicado - verificar si es necesario'
    },
    {
        path: 'C:/Bio/sistema_asistencia_biometrico/venv',
        description: 'Virtual environment de Python',
        reason: 'El sistema usa Node.js, no Python. Verificar si es necesario.'
    }
];

/**
 * Buscar archivos que coincidan con los patrones
 */
function findFilesToCleanup(baseDir, pattern) {
    const results = [];

    function scanDirectory(dir) {
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dir, item.name);

                // Saltar carpetas excluidas
                if (item.isDirectory()) {
                    if (pattern.exclude.includes(item.name)) {
                        continue;
                    }
                    scanDirectory(fullPath);
                } else if (item.isFile()) {
                    const ext = path.extname(item.name).toLowerCase();

                    if (pattern.extensions.includes(ext)) {
                        const stats = fs.statSync(fullPath);
                        const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

                        // Para logs, solo incluir si son viejos
                        if (pattern.ageInDays && ageInDays < pattern.ageInDays) {
                            continue;
                        }

                        results.push({
                            path: fullPath,
                            size: stats.size,
                            age: Math.floor(ageInDays),
                            modified: stats.mtime
                        });
                    }
                }
            }
        } catch (error) {
            // Ignorar errores de permisos
            if (error.code !== 'EACCES' && error.code !== 'EPERM') {
                console.warn(`⚠️ Error escaneando ${dir}:`, error.message);
            }
        }
    }

    scanDirectory(baseDir);
    return results;
}

/**
 * Formatear tamaño de archivo
 */
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * Calcular tamaño de carpeta
 */
function getFolderSize(folderPath) {
    let totalSize = 0;

    function scanFolder(dir) {
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true });

            for (const item of items) {
                const fullPath = path.join(dir, item.name);

                if (item.isDirectory()) {
                    scanFolder(fullPath);
                } else {
                    const stats = fs.statSync(fullPath);
                    totalSize += stats.size;
                }
            }
        } catch (error) {
            // Ignorar errores
        }
    }

    if (fs.existsSync(folderPath)) {
        scanFolder(folderPath);
    }

    return totalSize;
}

/**
 * Main function
 */
async function main() {
    console.log('=' .repeat(80));
    console.log('🧹 SCRIPT DE LIMPIEZA DE ARCHIVOS INNECESARIOS');
    console.log('=' .repeat(80));
    console.log(`📂 Base directory: ${BASE_DIR}\n`);

    let totalSizeToFree = 0;

    // 1. BUSCAR ARCHIVOS POR PATRÓN
    console.log('📋 ARCHIVOS INDIVIDUALES A LIMPIAR:\n');

    for (const [key, pattern] of Object.entries(CLEANUP_PATTERNS)) {
        console.log(`\n🔍 Buscando ${pattern.description}...`);
        const files = findFilesToCleanup(BASE_DIR, pattern);

        if (files.length === 0) {
            console.log(`   ✅ No se encontraron archivos de este tipo.`);
            continue;
        }

        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        totalSizeToFree += totalSize;

        console.log(`   📊 Encontrados: ${files.length} archivos (${formatSize(totalSize)})`);
        console.log(`   📁 Archivos:`);

        files.forEach(file => {
            console.log(`      - ${file.path.replace(BASE_DIR, '.')}`);
            console.log(`        Tamaño: ${formatSize(file.size)}, Edad: ${file.age} días`);
        });
    }

    // 2. CARPETAS OPCIONALES
    console.log('\n\n📂 CARPETAS OPCIONALES (verificar antes de borrar):\n');

    for (const folder of OPTIONAL_FOLDERS) {
        if (fs.existsSync(folder.path)) {
            const size = getFolderSize(folder.path);
            totalSizeToFree += size;

            console.log(`\n📁 ${folder.path}`);
            console.log(`   📝 Descripción: ${folder.description}`);
            console.log(`   💾 Tamaño: ${formatSize(size)}`);
            console.log(`   ⚠️  Razón: ${folder.reason}`);
        }
    }

    // 3. RESUMEN
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE LIMPIEZA');
    console.log('='.repeat(80));
    console.log(`💾 Espacio total que se puede liberar: ${formatSize(totalSizeToFree)}`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   - Este script NO borra nada automáticamente');
    console.log('   - Revise manualmente los archivos listados');
    console.log('   - Haga backup antes de borrar carpetas grandes');
    console.log('   - Consulte ARCHIVOS-EXTERNOS-IMPRESCINDIBLES.md para más info');
    console.log('\n📌 ARCHIVOS SEGUROS DE BORRAR:');
    console.log('   ✅ Instaladores (.exe, .msi) - ya no son necesarios después de instalar');
    console.log('   ✅ Backups antiguos (.bak, .backup) - si hay backups más recientes');
    console.log('   ✅ Logs antiguos (>30 días) - si no se necesitan para auditoría');
    console.log('\n❌ NUNCA BORRAR:');
    console.log('   - node_modules/ (el sistema NO funcionará)');
    console.log('   - backend/src/ (código fuente)');
    console.log('   - backend/public/ (UI del sistema)');
    console.log('   - backend/migrations/ (estructura de BD)');
    console.log('   - .env (configuración crítica)');

    console.log('\n' + '='.repeat(80));
    console.log('✅ Análisis completado');
    console.log('='.repeat(80) + '\n');
}

// Ejecutar
main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
