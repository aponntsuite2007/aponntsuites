/**
 * ============================================================================
 * UNIFIED KNOWLEDGE SERVICE - Sistema Unificado de Auto-Conocimiento
 * ============================================================================
 *
 * CEREBRO CENTRAL del sistema que unifica:
 * - Metadata NIVEL DIOS de módulos (JSON files)
 * - SystemModule (BD comercial)
 * - AssistantKnowledgeBase (BD RAG para IA)
 * - AuditorKnowledgeBase (aprendizaje de tests)
 * - AuditLogs (historial de ejecuciones)
 *
 * CICLO VIRTUOSO:
 * 1. Test detecta error → AuditorEngine
 * 2. Ollama analiza → OllamaAnalyzer
 * 3. Genera ticket → TicketGenerator
 * 4. Claude Code repara → WebSocket Bridge
 * 5. Re-test valida → AuditorEngine
 * 6. Actualiza knowledge → THIS SERVICE ⭐
 * 7. Metadata quirúrgica → Auto-actualización
 *
 * @version 2.0.0
 * @date 2025-10-31
 * @author Claude Code - Maximum Potential Deployment
 * ============================================================================
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class UnifiedKnowledgeService extends EventEmitter {
    constructor(database) {
        super();

        this.database = database;
        // ✅ Soporte para database directo o database.models
        this.SystemModule = database.SystemModule || (database.models && database.models.SystemModule);
        this.AssistantKnowledgeBase = database.AssistantKnowledgeBase || (database.models && database.models.AssistantKnowledgeBase);
        this.AuditLog = database.AuditLog || (database.models && database.models.AuditLog);

        // Metadata completa en memoria
        this.metadata = new Map(); // moduleKey → metadata completa
        this.businessRules = new Map(); // ruleId → rule
        this.integrations = new Map(); // moduleKey → integrations[]
        this.healthIndicators = new Map(); // moduleKey → health status

        // Configuración
        this.config = {
            metadataDir: path.join(__dirname, '../config'),
            metadataFile: 'modules-metadata-extended.json',
            autoUpdate: true,
            cacheEnabled: true,
            syncInterval: 60000 // 1 minuto
        };

        this.initialized = false;
        this.lastSyncAt = null;

        console.log('🧠 [UNIFIED-KB] Servicio de Conocimiento Unificado inicializando...');
    }

    /**
     * ========================================================================
     * INICIALIZACIÓN Y CARGA
     * ========================================================================
     */

    async initialize() {
        if (this.initialized) {
            console.log('⚠️  [UNIFIED-KB] Ya inicializado');
            return;
        }

        console.log('🚀 [UNIFIED-KB] Iniciando carga de conocimiento...\n');

        try {
            // 1. Cargar metadata extendida desde JSON
            await this.loadExtendedMetadata();

            // 2. Cargar datos comerciales desde BD (SystemModule)
            await this.loadCommercialData();

            // 3. Sincronizar con AssistantKnowledgeBase
            await this.syncWithAssistant();

            // 4. Cargar health status desde AuditLogs
            await this.loadHealthStatus();

            // 5. Construir índices de business rules
            await this.buildBusinessRulesIndex();

            // 6. Construir mapa de integraciones
            await this.buildIntegrationsMap();

            this.initialized = true;
            this.lastSyncAt = new Date();

            console.log('\n✅ [UNIFIED-KB] Inicialización completada');
            console.log(`   📦 Módulos cargados: ${this.metadata.size}`);
            console.log(`   📋 Business Rules: ${this.businessRules.size}`);
            console.log(`   🔗 Integraciones: ${this.integrations.size}`);
            console.log(`   📊 Health Indicators: ${this.healthIndicators.size}\n`);

            // Iniciar sincronización automática si está habilitada
            if (this.config.autoUpdate) {
                this.startAutoSync();
            }

        } catch (error) {
            console.error('❌ [UNIFIED-KB] Error en inicialización:', error);
            throw error;
        }
    }

    /**
     * Cargar metadata extendida desde JSON
     */
    async loadExtendedMetadata() {
        console.log('📄 [UNIFIED-KB] Cargando metadata extendida...');

        const metadataPath = path.join(this.config.metadataDir, this.config.metadataFile);

        try {
            const content = await fs.readFile(metadataPath, 'utf8');
            const data = JSON.parse(content);

            console.log(`   Versión metadata: ${data.metadata_version}`);
            console.log(`   Generado: ${data.generated_at}`);
            console.log(`   Total módulos en archivo: ${data.total_modules}`);

            // Cargar cada módulo
            for (const [moduleKey, metadata] of Object.entries(data.modules)) {
                this.metadata.set(moduleKey, {
                    ...metadata,
                    _source: 'extended_json',
                    _loaded_at: new Date()
                });

                console.log(`   ✓ ${moduleKey} v${metadata.version}`);
            }

        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn('   ⚠️  Archivo de metadata extendida no encontrado');
                console.warn('   Continuando con metadata básica...');
            } else {
                throw error;
            }
        }
    }

    /**
     * Cargar datos comerciales desde SystemModule
     */
    async loadCommercialData() {
        console.log('\n💰 [UNIFIED-KB] Cargando datos comerciales...');

        try {
            const modules = await this.SystemModule.findAll({
                where: { isActive: true },
                order: [['displayOrder', 'ASC']]
            });

            console.log(`   Módulos comerciales en BD: ${modules.length}`);

            for (const mod of modules) {
                const existing = this.metadata.get(mod.moduleKey) || {};

                // Merge con datos comerciales
                this.metadata.set(mod.moduleKey, {
                    ...existing,
                    commercial: {
                        basePrice: parseFloat(mod.basePrice),
                        isCore: mod.isCore,
                        isActive: mod.isActive,
                        minEmployees: mod.minEmployees,
                        maxEmployees: mod.maxEmployees,
                        displayOrder: mod.displayOrder,
                        rubro: mod.rubro,
                        availableIn: mod.availableIn
                    },
                    features: mod.features || existing.features || [],
                    requirements: mod.requirements || existing.requirements || [],
                    bundledModules: mod.bundledModules || existing.bundledModules || [],
                    integratesWith: mod.integratesWith || existing.integratesWith || [],
                    providesTo: mod.providesTo || existing.providesTo || [],
                    _db_synced_at: new Date()
                });
            }

        } catch (error) {
            console.error('   ❌ Error cargando datos comerciales:', error.message);
        }
    }

    /**
     * Sincronizar con AssistantKnowledgeBase (RAG para IA)
     */
    async syncWithAssistant() {
        console.log('\n🤖 [UNIFIED-KB] Sincronizando con Assistant KB...');

        try {
            // Para cada módulo con metadata, crear/actualizar entry en AssistantKnowledgeBase
            for (const [moduleKey, metadata] of this.metadata.entries()) {
                const question = `¿Qué hace el módulo ${metadata.name || moduleKey}?`;
                const answer = this._generateModuleDescription(metadata);

                // Buscar si ya existe
                const existing = await this.AssistantKnowledgeBase.findOne({
                    where: { question }
                });

                if (existing) {
                    // Actualizar si cambió
                    if (existing.answer !== answer) {
                        await existing.update({
                            answer,
                            source: 'unified_knowledge_service',
                            context: moduleKey,
                            updated_at: new Date()
                        });
                        console.log(`   ↻ Actualizado: ${moduleKey}`);
                    }
                } else {
                    // Crear nuevo
                    await this.AssistantKnowledgeBase.create({
                        question,
                        answer,
                        source: 'unified_knowledge_service',
                        context: moduleKey,
                        helpful_count: 0,
                        not_helpful_count: 0
                    });
                    console.log(`   ✓ Creado: ${moduleKey}`);
                }
            }

        } catch (error) {
            console.error('   ❌ Error sincronizando con Assistant:', error.message);
        }
    }

    /**
     * Generar descripción completa del módulo para el asistente
     */
    _generateModuleDescription(metadata) {
        const parts = [];

        if (metadata.description?.short) {
            parts.push(metadata.description.short);
        }

        if (metadata.description?.long) {
            parts.push(`\n\nDescripción detallada: ${metadata.description.long}`);
        }

        if (metadata.description?.business_value) {
            parts.push(`\n\nValor de negocio: ${metadata.description.business_value}`);
        }

        if (metadata.submódulos && metadata.submódulos.length > 0) {
            parts.push(`\n\nSubmódulos disponibles: ${metadata.submódulos.map(s => s.name).join(', ')}`);
        }

        if (metadata.endpoints?.routes && metadata.endpoints.routes.length > 0) {
            parts.push(`\n\nEndpoints API: ${metadata.endpoints.routes.length} rutas disponibles`);
        }

        if (metadata.integrations && metadata.integrations.length > 0) {
            const required = metadata.integrations.filter(i => i.type === 'REQUIRED').map(i => i.module);
            if (required.length > 0) {
                parts.push(`\n\nRequiere módulos: ${required.join(', ')}`);
            }
        }

        if (metadata.notifications?.enabled) {
            parts.push(`\n\nNotificaciones: Sistema de notificaciones automáticas habilitado`);
        }

        return parts.join('');
    }

    /**
     * Cargar health status desde AuditLogs
     */
    async loadHealthStatus() {
        console.log('\n📊 [UNIFIED-KB] Cargando health status...');

        try {
            const { sequelize } = this.database;

            // Query para obtener health de últimos 7 días desde audit_test_logs (tabla del auditor)
            const [results] = await sequelize.query(`
                SELECT
                    module_name,
                    COUNT(*) as total_tests,
                    SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
                    SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failed,
                    AVG(duration_ms) as avg_duration_ms,
                    MAX(completed_at) as last_test_at
                FROM audit_test_logs
                WHERE completed_at > NOW() - INTERVAL '7 days'
                    AND module_name IS NOT NULL
                GROUP BY module_name
                ORDER BY module_name
            `);

            for (const row of results) {
                const successRate = row.total_tests > 0
                    ? (parseInt(row.passed) / parseInt(row.total_tests)) * 100
                    : null;

                let healthStatus = 'unknown';
                if (successRate !== null) {
                    if (successRate >= 95) healthStatus = 'excellent';
                    else if (successRate >= 80) healthStatus = 'good';
                    else if (successRate >= 60) healthStatus = 'fair';
                    else healthStatus = 'poor';
                }

                this.healthIndicators.set(row.module_name, {
                    status: healthStatus,
                    success_rate: successRate,
                    total_tests: parseInt(row.total_tests),
                    passed: parseInt(row.passed),
                    failed: parseInt(row.failed),
                    avg_duration_ms: parseFloat(row.avg_duration_ms),
                    last_test_at: row.last_test_at
                });
            }

            console.log(`   Health status cargado para ${results.length} módulos`);

        } catch (error) {
            console.error('   ❌ Error cargando health status:', error.message);
        }
    }

    /**
     * Construir índice de business rules
     */
    async buildBusinessRulesIndex() {
        console.log('\n📋 [UNIFIED-KB] Construyendo índice de business rules...');

        let totalRules = 0;

        for (const [moduleKey, metadata] of this.metadata.entries()) {
            if (!metadata.submódulos) continue;

            for (const submodulo of metadata.submódulos) {
                if (!submodulo.campos) continue;

                for (const campo of submodulo.campos) {
                    if (!campo.business_rules) continue;

                    for (const rule of campo.business_rules) {
                        this.businessRules.set(rule.id, {
                            ...rule,
                            module: moduleKey,
                            submodulo: submodulo.key,
                            campo: campo.key
                        });
                        totalRules++;
                    }
                }
            }
        }

        console.log(`   ✓ ${totalRules} business rules indexadas`);
    }

    /**
     * Construir mapa de integraciones
     */
    async buildIntegrationsMap() {
        console.log('\n🔗 [UNIFIED-KB] Construyendo mapa de integraciones...');

        for (const [moduleKey, metadata] of this.metadata.entries()) {
            if (!metadata.integrations) continue;

            this.integrations.set(moduleKey, metadata.integrations);
        }

        console.log(`   ✓ ${this.integrations.size} módulos con integraciones`);
    }

    /**
     * ========================================================================
     * CONSULTAS Y BÚSQUEDAS
     * ========================================================================
     */

    /**
     * Obtener metadata completa de un módulo
     */
    getModuleMetadata(moduleKey) {
        return this.metadata.get(moduleKey) || null;
    }

    /**
     * Buscar business rules por módulo
     */
    getBusinessRulesByModule(moduleKey) {
        const rules = [];
        for (const [ruleId, rule] of this.businessRules.entries()) {
            if (rule.module === moduleKey) {
                rules.push(rule);
            }
        }
        return rules;
    }

    /**
     * Verificar si un módulo está activo en la empresa
     */
    async isModuleActive(moduleKey, companyId) {
        // TODO: Implementar lógica de verificación en company_modules
        // Por ahora, asumimos que si está en SystemModule con isActive=true, está disponible
        const metadata = this.metadata.get(moduleKey);
        return metadata?.commercial?.isActive || false;
    }

    /**
     * Detectar si módulo de notificaciones está activo
     */
    async isNotificationsModuleActive(companyId) {
        return await this.isModuleActive('notifications-enterprise', companyId);
    }

    /**
     * Obtener health status de un módulo
     */
    getModuleHealth(moduleKey) {
        return this.healthIndicators.get(moduleKey) || {
            status: 'unknown',
            success_rate: null,
            message: 'Sin datos de testing disponibles'
        };
    }

    /**
     * ========================================================================
     * AUTO-ACTUALIZACIÓN QUIRÚRGICA
     * ========================================================================
     */

    /**
     * Actualizar metadata después de un cambio
     */
    async updateMetadataAfterChange(moduleKey, changeData) {
        console.log(`\n🔧 [UNIFIED-KB] Actualizando metadata de ${moduleKey}...`);

        const metadata = this.metadata.get(moduleKey);
        if (!metadata) {
            console.error(`   ❌ Módulo ${moduleKey} no encontrado`);
            return false;
        }

        // Agregar a changelog
        if (!metadata.changelog) {
            metadata.changelog = [];
        }

        const newVersion = this._incrementVersion(metadata.version || '1.0.0', changeData.type);

        const changelogEntry = {
            version: newVersion,
            date: new Date().toISOString().split('T')[0],
            author: changeData.author || 'System Auto-Update',
            type: changeData.type || 'fix',
            summary: changeData.summary,
            changes: changeData.changes || [],
            files_modified: changeData.files_modified || [],
            migrations: changeData.migrations || [],
            database_impact: changeData.database_impact || {}
        };

        metadata.changelog.unshift(changelogEntry);
        metadata.version = newVersion;

        // Actualizar en memoria
        this.metadata.set(moduleKey, metadata);

        // Guardar a disco
        await this.persistMetadata();

        // Sincronizar con AssistantKB
        await this.syncWithAssistant();

        console.log(`   ✅ Metadata actualizada a v${newVersion}`);

        // Emitir evento
        this.emit('metadata_updated', { moduleKey, newVersion, changeData });

        return true;
    }

    /**
     * Incrementar versión semántica
     */
    _incrementVersion(version, changeType) {
        const [major, minor, patch] = version.split('.').map(Number);

        switch (changeType) {
            case 'breaking':
            case 'major':
                return `${major + 1}.0.0`;
            case 'feature':
            case 'minor':
                return `${major}.${minor + 1}.0`;
            case 'fix':
            case 'patch':
            default:
                return `${major}.${minor}.${patch + 1}`;
        }
    }

    /**
     * Persistir metadata a disco
     */
    async persistMetadata() {
        const metadataPath = path.join(this.config.metadataDir, this.config.metadataFile);

        const data = {
            metadata_version: "2.0.0",
            generated_at: new Date().toISOString(),
            generated_by: "Unified Knowledge Service - Auto-Update",
            total_modules: this.metadata.size,
            modules: Object.fromEntries(this.metadata)
        };

        await fs.writeFile(metadataPath, JSON.stringify(data, null, 2), 'utf8');
    }

    /**
     * Iniciar sincronización automática
     */
    startAutoSync() {
        console.log(`🔄 [UNIFIED-KB] Auto-sync habilitado (cada ${this.config.syncInterval / 1000}s)`);

        this.syncIntervalId = setInterval(async () => {
            try {
                await this.loadHealthStatus();
                this.lastSyncAt = new Date();
            } catch (error) {
                console.error('❌ [UNIFIED-KB] Error en auto-sync:', error.message);
            }
        }, this.config.syncInterval);
    }

    /**
     * Detener sincronización automática
     */
    stopAutoSync() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
            console.log('⏸️  [UNIFIED-KB] Auto-sync detenido');
        }
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            initialized: this.initialized,
            last_sync_at: this.lastSyncAt,
            modules_count: this.metadata.size,
            business_rules_count: this.businessRules.size,
            integrations_count: this.integrations.size,
            health_indicators_count: this.healthIndicators.size,
            auto_update_enabled: this.config.autoUpdate
        };
    }
}

module.exports = UnifiedKnowledgeService;
