/**
 * ============================================================================
 * GENERADOR DE LLM-CONTEXT RICO - Brain Auto-Knowledge Generator
 * ============================================================================
 *
 * Script que genera llm-context.json rico y actualizado analizando el código
 * real del sistema. Brain puede ejecutar este script para auto-actualizarse.
 *
 * CAPACIDADES:
 * - Lee modules-registry.json (48 módulos)
 * - Analiza servicios, rutas, migraciones
 * - Extrae métodos, fórmulas, algoritmos, integraciones
 * - Genera fullCapabilities para cada módulo
 * - Crea backup del JSON anterior
 * - Valida el nuevo JSON antes de reemplazar
 *
 * USO:
 *   node scripts/generate-rich-llm-context.js
 *   node scripts/generate-rich-llm-context.js --module=hour-bank  # Solo un módulo
 *   node scripts/generate-rich-llm-context.js --dry-run           # No guardar
 *
 * @version 1.0.0
 * @date 2025-12-19
 * ============================================================================
 */

const fs = require('fs').promises;
const path = require('path');
const DeepModuleAnalyzer = require('../src/brain/core/DeepModuleAnalyzer');

class RichLLMContextGenerator {

    constructor() {
        this.projectRoot = path.join(__dirname, '../');
        this.llmContextPath = path.join(this.projectRoot, 'public/llm-context.json');
        this.modulesRegistryPath = path.join(this.projectRoot, 'src/auditor/registry/modules-registry.json');
        this.backupDir = path.join(this.projectRoot, 'backups/llm-context');

        this.analyzer = new DeepModuleAnalyzer();

        // Argumentos CLI
        this.args = this._parseArgs();
    }

    _parseArgs() {
        const args = process.argv.slice(2);
        return {
            dryRun: args.includes('--dry-run'),
            module: args.find(a => a.startsWith('--module='))?.split('=')[1],
            help: args.includes('--help') || args.includes('-h')
        };
    }

    // ========================================================================
    // MAIN - GENERACIÓN COMPLETA
    // ========================================================================

    async generate() {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🧠 BRAIN AUTO-KNOWLEDGE GENERATOR');
        console.log('   Generando llm-context.json rico con análisis de código real');
        console.log('═══════════════════════════════════════════════════════════════\n');

        try {
            // 1. Cargar archivos base
            console.log('📋 PASO 1: Cargando archivos base...\n');
            const [currentContext, modulesRegistry] = await Promise.all([
                this._loadCurrentContext(),
                this._loadModulesRegistry()
            ]);

            console.log(`   ✅ llm-context.json actual: ${JSON.stringify(currentContext).length} caracteres`);
            console.log(`   ✅ modules-registry.json: ${modulesRegistry.modules.length} módulos\n`);

            // 2. Seleccionar módulos a analizar
            const modulesToAnalyze = this.args.module
                ? modulesRegistry.modules.filter(m => m.id === this.args.module)
                : modulesRegistry.modules;

            if (modulesToAnalyze.length === 0) {
                throw new Error(`Módulo "${this.args.module}" no encontrado en registry`);
            }

            console.log(`📊 PASO 2: Analizando ${modulesToAnalyze.length} módulos...\n`);

            // 3. Analizar módulos
            const analysisResults = [];
            for (const module of modulesToAnalyze) {
                const result = await this.analyzer.analyzeModule(module.id, module);
                analysisResults.push(result);
            }

            console.log(`\n   ✅ ${analysisResults.length} módulos analizados`);
            console.log(`   ✅ ${analysisResults.filter(r => !r.fallback).length} con código encontrado`);
            console.log(`   ✅ ${analysisResults.filter(r => r.fallback).length} con fallback\n`);

            // 4. Generar nuevo contexto
            console.log('🔨 PASO 3: Generando nuevo llm-context.json...\n');
            const newContext = this._buildNewContext(currentContext, modulesRegistry, analysisResults);

            console.log(`   ✅ Nuevo JSON generado: ${JSON.stringify(newContext).length} caracteres`);
            console.log(`   ✅ Incremento: +${JSON.stringify(newContext).length - JSON.stringify(currentContext).length} caracteres\n`);

            // 5. Validar
            console.log('✔️  PASO 4: Validando nuevo JSON...\n');
            const validation = this._validateContext(newContext);
            if (!validation.valid) {
                throw new Error(`Validación falló: ${validation.errors.join(', ')}`);
            }
            console.log(`   ✅ Validación OK: ${validation.checks.join(', ')}\n`);

            // 6. Crear backup
            if (!this.args.dryRun) {
                console.log('💾 PASO 5: Creando backup del anterior...\n');
                const backupPath = await this._createBackup(currentContext);
                console.log(`   ✅ Backup guardado: ${backupPath}\n`);
            }

            // 7. Guardar nuevo
            if (!this.args.dryRun) {
                console.log('💾 PASO 6: Guardando nuevo llm-context.json...\n');
                await this._saveContext(newContext);
                console.log(`   ✅ Guardado: ${this.llmContextPath}\n`);
            } else {
                console.log('⚠️  MODO DRY-RUN: No se guardó el archivo\n');
            }

            // 8. Reporte final
            this._printSummary(currentContext, newContext, analysisResults);

            console.log('\n✅ ¡GENERACIÓN COMPLETADA EXITOSAMENTE!\n');

            return { success: true, newContext, analysisResults };

        } catch (error) {
            console.error('\n❌ ERROR EN LA GENERACIÓN:', error.message);
            console.error(error.stack);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // CARGAR ARCHIVOS BASE
    // ========================================================================

    async _loadCurrentContext() {
        try {
            const content = await fs.readFile(this.llmContextPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.warn(`   ⚠️  No se pudo cargar llm-context.json actual: ${error.message}`);
            return this._getDefaultContext();
        }
    }

    async _loadModulesRegistry() {
        try {
            const content = await fs.readFile(this.modulesRegistryPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`No se pudo cargar modules-registry.json: ${error.message}`);
        }
    }

    _getDefaultContext() {
        return {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "@id": "https://aponnt.com",
            "_llm_instructions": "Este archivo contiene información estructurada sobre APONNT 360°",
            "name": "APONNT 360°",
            "modules": {}
        };
    }

    // ========================================================================
    // BUILD NUEVO CONTEXTO
    // ========================================================================

    _buildNewContext(currentContext, modulesRegistry, analysisResults) {
        // Mantener la estructura base del contexto actual
        const newContext = {
            ...currentContext,
            _metadata: {
                generated_at: new Date().toISOString(),
                generator: 'Brain Auto-Knowledge Generator',
                version: '1.0.0',
                total_modules_analyzed: analysisResults.length,
                modules_with_code: analysisResults.filter(r => !r.fallback).length,
                modules_fallback: analysisResults.filter(r => r.fallback).length
            }
        };

        // Actualizar módulos con fullCapabilities
        if (!newContext.modules) {
            newContext.modules = {};
        }

        for (const analysis of analysisResults) {
            const moduleData = this._buildModuleData(analysis, modulesRegistry);

            // Encontrar el módulo en la estructura actual
            const existingModule = this._findModuleInContext(currentContext, analysis.moduleKey);

            // Mergear con datos existentes
            const mergedModule = {
                ...existingModule,
                ...moduleData,
                fullCapabilities: moduleData.fullCapabilities
            };

            // Guardar en la estructura correcta
            if (!newContext.modules.core_modules) {
                newContext.modules.core_modules = [];
            }
            if (!newContext.modules.commercial_modules) {
                newContext.modules.commercial_modules = [];
            }

            // Determinar si es core o commercial
            const registryModule = modulesRegistry.modules.find(m => m.id === analysis.moduleKey);
            const isCore = registryModule?.commercial?.is_core === true;

            const targetArray = isCore ? newContext.modules.core_modules : newContext.modules.commercial_modules;

            // Eliminar si ya existe
            const existingIndex = targetArray.findIndex(m => m.id === analysis.moduleKey);
            if (existingIndex >= 0) {
                targetArray[existingIndex] = mergedModule;
            } else {
                targetArray.push(mergedModule);
            }
        }

        return newContext;
    }

    _findModuleInContext(context, moduleKey) {
        if (!context.modules) return {};

        // Buscar en core_modules y commercial_modules
        const allModules = [
            ...(context.modules.core_modules || []),
            ...(context.modules.commercial_modules || [])
        ];

        return allModules.find(m => m.id === moduleKey) || {};
    }

    _buildModuleData(analysis, modulesRegistry) {
        const registryModule = modulesRegistry.modules.find(m => m.id === analysis.moduleKey);

        return {
            id: analysis.moduleKey,
            name: analysis.moduleName,
            description: analysis.description,
            category: analysis.category,
            version: analysis.version,

            fullCapabilities: {
                // Métodos principales
                coreMethods: analysis.methods.slice(0, 10).map(m => ({
                    name: m.name,
                    description: m.description || `Método ${m.name}`,
                    params: m.params,
                    returns: m.returns
                })),

                // Integraciones
                integrations: analysis.integrations.map(int => ({
                    name: int,
                    type: int.includes('Service') ? 'service' : int.includes('Workflow') ? 'workflow' : 'module'
                })),

                // Fórmulas y algoritmos
                scientificFoundation: analysis.formulas.length > 0 || analysis.algorithms.length > 0 ? {
                    formulas: analysis.formulas,
                    algorithms: analysis.algorithms,
                    standards: analysis.standards
                } : undefined,

                // Flujos de negocio
                businessFlows: analysis.businessFlows.length > 0 ? analysis.businessFlows : undefined,

                // Features extraídas
                keyFeatures: analysis.features.slice(0, 10),

                // Endpoints API
                apiEndpoints: analysis.endpoints.length > 0 ? analysis.endpoints.map(e => ({
                    method: e.method,
                    path: e.path
                })) : undefined,

                // Tablas de base de datos
                databaseTables: analysis.tables.length > 0 ? analysis.tables : undefined,

                // Dependencies de otros módulos
                moduleDependencies: registryModule?.dependencies || {},

                // Stats
                codeAnalysis: {
                    totalMethods: analysis.stats.totalMethods,
                    totalIntegrations: analysis.stats.totalIntegrations,
                    totalFormulas: analysis.stats.totalFormulas,
                    totalEndpoints: analysis.stats.totalEndpoints,
                    filesAnalyzed: analysis.stats.filesAnalyzed,
                    linesAnalyzed: analysis.stats.linesAnalyzed,
                    lastAnalyzed: analysis.analysisDate
                }
            }
        };
    }

    // ========================================================================
    // VALIDACIÓN
    // ========================================================================

    _validateContext(context) {
        const errors = [];
        const checks = [];

        // Check 1: Estructura básica
        if (!context['@context']) errors.push('Falta @context');
        else checks.push('@context OK');

        if (!context.name) errors.push('Falta name');
        else checks.push('name OK');

        if (!context.modules) errors.push('Falta modules');
        else checks.push('modules OK');

        // Check 2: Metadata
        if (!context._metadata) errors.push('Falta _metadata');
        else checks.push('_metadata OK');

        // Check 3: JSON válido
        try {
            JSON.stringify(context);
            checks.push('JSON válido');
        } catch (e) {
            errors.push('JSON inválido: ' + e.message);
        }

        // Check 4: Tamaño razonable
        const size = JSON.stringify(context).length;
        if (size < 1000) errors.push('JSON muy pequeño (< 1KB)');
        else if (size > 10000000) errors.push('JSON muy grande (> 10MB)');
        else checks.push(`Tamaño OK (${Math.round(size / 1024)} KB)`);

        return {
            valid: errors.length === 0,
            errors,
            checks
        };
    }

    // ========================================================================
    // BACKUP Y SAVE
    // ========================================================================

    async _createBackup(currentContext) {
        // Crear directorio de backups si no existe
        await fs.mkdir(this.backupDir, { recursive: true });

        // Nombre con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                         new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('Z')[0];
        const backupPath = path.join(this.backupDir, `llm-context_${timestamp}.json`);

        // Guardar backup
        await fs.writeFile(backupPath, JSON.stringify(currentContext, null, 2), 'utf8');

        return backupPath;
    }

    async _saveContext(newContext) {
        await fs.writeFile(this.llmContextPath, JSON.stringify(newContext, null, 2), 'utf8');
    }

    // ========================================================================
    // REPORTE FINAL
    // ========================================================================

    _printSummary(oldContext, newContext, analysisResults) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN DE GENERACIÓN');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const oldSize = JSON.stringify(oldContext).length;
        const newSize = JSON.stringify(newContext).length;
        const increment = newSize - oldSize;
        const percentChange = ((increment / oldSize) * 100).toFixed(1);

        console.log(`📏 TAMAÑO:`);
        console.log(`   Anterior:  ${Math.round(oldSize / 1024)} KB`);
        console.log(`   Nuevo:     ${Math.round(newSize / 1024)} KB`);
        console.log(`   Incremento: ${increment > 0 ? '+' : ''}${Math.round(increment / 1024)} KB (${percentChange}%)\n`);

        console.log(`🔍 MÓDULOS ANALIZADOS: ${analysisResults.length}`);
        console.log(`   Con código encontrado: ${analysisResults.filter(r => !r.fallback).length}`);
        console.log(`   Fallback (sin código):  ${analysisResults.filter(r => r.fallback).length}\n`);

        const totalMethods = analysisResults.reduce((sum, r) => sum + (r.stats?.totalMethods || 0), 0);
        const totalFormulas = analysisResults.reduce((sum, r) => sum + (r.formulas?.length || 0), 0);
        const totalEndpoints = analysisResults.reduce((sum, r) => sum + (r.stats?.totalEndpoints || 0), 0);

        console.log(`📊 CAPACIDADES EXTRAÍDAS:`);
        console.log(`   Métodos:      ${totalMethods}`);
        console.log(`   Fórmulas:     ${totalFormulas}`);
        console.log(`   Endpoints:    ${totalEndpoints}`);
        console.log(`   Integraciones: ${analysisResults.reduce((sum, r) => sum + (r.integrations?.length || 0), 0)}\n`);

        // Top 5 módulos más ricos
        const top5 = analysisResults
            .filter(r => !r.fallback)
            .sort((a, b) => (b.stats?.totalMethods || 0) - (a.stats?.totalMethods || 0))
            .slice(0, 5);

        console.log(`🏆 TOP 5 MÓDULOS MÁS RICOS:`);
        top5.forEach((mod, i) => {
            console.log(`   ${i + 1}. ${mod.moduleName}: ${mod.stats.totalMethods} métodos, ${mod.stats.totalEndpoints} endpoints`);
        });
        console.log('');
    }
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

async function main() {
    const generator = new RichLLMContextGenerator();

    // Help
    if (generator.args.help) {
        console.log(`
USO:
  node scripts/generate-rich-llm-context.js [opciones]

OPCIONES:
  --module=MODULE_KEY   Generar solo para un módulo específico
  --dry-run             No guardar, solo mostrar resultado
  -h, --help            Mostrar esta ayuda

EJEMPLOS:
  node scripts/generate-rich-llm-context.js
  node scripts/generate-rich-llm-context.js --module=hour-bank
  node scripts/generate-rich-llm-context.js --dry-run
        `);
        process.exit(0);
    }

    const result = await generator.generate();
    process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
    main();
}

module.exports = RichLLMContextGenerator;
