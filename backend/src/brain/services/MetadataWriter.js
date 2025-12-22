/**
 * ============================================================================
 * METADATA WRITER - Escritor Automático de Engineering Metadata
 * ============================================================================
 *
 * Este servicio mantiene actualizado el archivo engineering-metadata.js:
 * - Auto-actualiza cada 5 minutos
 * - Genera metadata desde EcosystemBrainService
 * - Crea backups antes de sobrescribir
 * - Cleanup de backups antiguos (mantiene últimos 10)
 *
 * PRINCIPIO: engineering-metadata.js SIEMPRE debe estar sincronizado con el código real.
 *
 * @version 1.0.0
 * @date 2025-12-21
 * ============================================================================
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class MetadataWriter {
    constructor(ecosystemBrainService) {
        this.ecosystemBrain = ecosystemBrainService;
        this.updateInterval = 300000; // 5 minutos
        this.timer = null;
        this.isRunning = false;
        this.lastUpdate = null;
        this.updateCount = 0;
        this.pendingUpdate = false;

        this.metadataPath = path.resolve(__dirname, '../../../engineering-metadata.js');
        this.backupDir = path.resolve(__dirname, '../../../.metadata-backups');

        console.log('📝 [METADATA-WRITER] MetadataWriter inicializado');
        console.log(`   Archivo: ${this.metadataPath}`);
        console.log(`   Update interval: ${this.updateInterval / 1000}s`);
    }

    /**
     * ========================================================================
     * INICIO Y CONTROL
     * ========================================================================
     */

    /**
     * Iniciar auto-actualización periódica
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ [METADATA-WRITER] Ya está corriendo');
            return;
        }

        console.log('\n📝 [METADATA-WRITER] Iniciando auto-actualización...');

        // Primer update inmediato (después de 10 segundos para dar tiempo al sistema)
        setTimeout(() => this.updateNow(), 10000);

        // Updates periódicos
        this.timer = setInterval(() => {
            this.updateNow();
        }, this.updateInterval);

        this.isRunning = true;
        console.log('✅ [METADATA-WRITER] Auto-actualización activa');
    }

    /**
     * Detener auto-actualización
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        console.log('🛑 [METADATA-WRITER] Auto-actualización detenida');
    }

    /**
     * Programar update inmediato (debounced)
     */
    scheduleUpdate() {
        if (this.pendingUpdate) return;

        this.pendingUpdate = true;
        setTimeout(() => {
            this.updateNow();
            this.pendingUpdate = false;
        }, 5000); // 5 segundos de debounce
    }

    /**
     * ========================================================================
     * ACTUALIZACIÓN DE METADATA
     * ========================================================================
     */

    /**
     * Actualizar metadata AHORA
     */
    async updateNow() {
        console.log('\n📝 [METADATA-WRITER] Actualizando engineering-metadata.js...');

        try {
            // 1. Generar metadata desde EcosystemBrain
            const metadata = await this.ecosystemBrain.generateFullEngineeringMetadata();

            if (!metadata || !metadata.modules) {
                console.log('⚠️ [METADATA-WRITER] No hay metadata para escribir');
                return false;
            }

            // 2. Crear backup del archivo actual
            await this.createBackup();

            // 3. Generar contenido del archivo
            const fileContent = this.generateFileContent(metadata);

            // 4. Escribir archivo
            await fs.writeFile(this.metadataPath, fileContent, 'utf8');

            // 5. Cleanup backups antiguos
            await this.cleanupOldBackups();

            this.lastUpdate = new Date();
            this.updateCount++;

            console.log('✅ [METADATA-WRITER] engineering-metadata.js actualizado');
            console.log(`   Módulos: ${Object.keys(metadata.modules).length}`);
            console.log(`   Total updates: ${this.updateCount}`);

            return true;

        } catch (error) {
            console.error('❌ [METADATA-WRITER] Error actualizando metadata:', error.message);
            return false;
        }
    }

    /**
     * Generar contenido del archivo engineering-metadata.js
     */
    generateFileContent(metadata) {
        const timestamp = new Date().toISOString();

        return `/**
 * ============================================================================
 * ENGINEERING METADATA - Auto-generado por MetadataWriter
 * ============================================================================
 *
 * Este archivo se auto-actualiza cada 5 minutos con metadata EN VIVO del sistema.
 * NO editar manualmente - los cambios se sobrescribirán.
 *
 * Generado: ${timestamp}
 * Módulos: ${Object.keys(metadata.modules || {}).length}
 * Última actualización: ${this.updateCount + 1}
 *
 * ============================================================================
 */

const engineeringMetadata = ${JSON.stringify(metadata, null, 2)};

// Agregar timestamp de generación
engineeringMetadata.generated_at = '${timestamp}';
engineeringMetadata.auto_generated = true;
engineeringMetadata.update_count = ${this.updateCount + 1};

module.exports = engineeringMetadata;
`;
    }

    /**
     * ========================================================================
     * BACKUPS
     * ========================================================================
     */

    /**
     * Crear backup del archivo actual
     */
    async createBackup() {
        try {
            // Verificar que el archivo existe
            if (!fsSync.existsSync(this.metadataPath)) {
                console.log('   ℹ️ No hay archivo previo para backup');
                return;
            }

            // Crear directorio de backups si no existe
            if (!fsSync.existsSync(this.backupDir)) {
                await fs.mkdir(this.backupDir, { recursive: true });
            }

            // Leer archivo actual
            const content = await fs.readFile(this.metadataPath, 'utf8');

            // Nombre del backup con timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `engineering-metadata.${timestamp}.js`);

            // Escribir backup
            await fs.writeFile(backupPath, content, 'utf8');

            console.log(`   💾 Backup creado: ${path.basename(backupPath)}`);

        } catch (error) {
            console.error('   ⚠️ Error creando backup:', error.message);
        }
    }

    /**
     * Limpiar backups antiguos (mantener solo últimos 10)
     */
    async cleanupOldBackups() {
        try {
            if (!fsSync.existsSync(this.backupDir)) return;

            // Listar todos los backups
            const files = await fs.readdir(this.backupDir);
            const backups = files
                .filter(f => f.startsWith('engineering-metadata.') && f.endsWith('.js'))
                .map(f => ({
                    name: f,
                    path: path.join(this.backupDir, f),
                    stat: fsSync.statSync(path.join(this.backupDir, f))
                }))
                .sort((a, b) => b.stat.mtime - a.stat.mtime); // Más reciente primero

            // Eliminar todos excepto los últimos 10
            const toDelete = backups.slice(10);

            for (const backup of toDelete) {
                await fs.unlink(backup.path);
                console.log(`   🗑️ Backup eliminado: ${backup.name}`);
            }

            if (toDelete.length > 0) {
                console.log(`   ✅ Cleanup: ${toDelete.length} backups antiguos eliminados`);
            }

        } catch (error) {
            console.error('   ⚠️ Error en cleanup de backups:', error.message);
        }
    }

    /**
     * Obtener lista de backups disponibles
     */
    async getBackups() {
        try {
            if (!fsSync.existsSync(this.backupDir)) {
                return [];
            }

            const files = await fs.readdir(this.backupDir);
            return files
                .filter(f => f.startsWith('engineering-metadata.') && f.endsWith('.js'))
                .map(f => {
                    const stat = fsSync.statSync(path.join(this.backupDir, f));
                    return {
                        name: f,
                        path: path.join(this.backupDir, f),
                        size: stat.size,
                        created: stat.mtime
                    };
                })
                .sort((a, b) => b.created - a.created);

        } catch (error) {
            console.error('Error obteniendo backups:', error.message);
            return [];
        }
    }

    /**
     * Restaurar desde backup
     */
    async restoreFromBackup(backupName) {
        try {
            const backupPath = path.join(this.backupDir, backupName);

            if (!fsSync.existsSync(backupPath)) {
                throw new Error('Backup no existe');
            }

            // Leer backup
            const content = await fs.readFile(backupPath, 'utf8');

            // Crear backup del actual antes de restaurar
            await this.createBackup();

            // Restaurar
            await fs.writeFile(this.metadataPath, content, 'utf8');

            console.log(`✅ [METADATA-WRITER] Restaurado desde: ${backupName}`);
            return true;

        } catch (error) {
            console.error('❌ [METADATA-WRITER] Error restaurando backup:', error.message);
            return false;
        }
    }

    /**
     * ========================================================================
     * ESTADÍSTICAS
     * ========================================================================
     */

    /**
     * Obtener stats del writer
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            lastUpdate: this.lastUpdate,
            updateCount: this.updateCount,
            updateInterval: this.updateInterval,
            metadataPath: this.metadataPath,
            backupDir: this.backupDir
        };
    }
}

module.exports = MetadataWriter;
