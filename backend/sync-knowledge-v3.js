#!/usr/bin/env node
/**
 * Script de Sincronización - Metadata v3.0.0
 *
 * Sincroniza el changelog del sistema con AssistantKnowledgeBase
 * para que el Asistente IA conozca los cambios arquitectónicos.
 */

const { Pool } = require('pg');
const database = require('./src/config/database');
const UnifiedKnowledgeService = require('./src/services/UnifiedKnowledgeService');

async function syncKnowledge() {
    console.log('🧠 [SYNC] Iniciando sincronización de Knowledge Base v3.0.0...\n');

    try {
        // Inicializar UnifiedKnowledgeService
        const knowledgeService = new UnifiedKnowledgeService(database);
        await knowledgeService.initialize();

        console.log('✅ [SYNC] UnifiedKnowledgeService inicializado');
        console.log(`   • Módulos cargados: ${knowledgeService.metadata.size}`);

        // Registrar cambio arquitectónico global
        const changeData = {
            version: '3.0.0',
            date: '2025-02-11',
            type: 'architecture',
            summary: 'Refactorización COMPLETA: Sistema de Carga Dinámica Unificado',
            changes: [
                'UnifiedKnowledgeService inicializado en server.js',
                'Endpoint /api/modules/active creado',
                'Eliminado SWITCH hardcodeado de 40+ casos',
                'Implementada carga dinámica en panel-empresa.html',
                'Añadida carga de activeModules en handleLogin',
                'Estandarizada exportación de 6 módulos CORE',
                'Convención unificada window.Modules[moduleKey]'
            ],
            files_modified: [
                'server.js',
                'src/routes/modulesRoutes.js',
                'public/panel-empresa.html',
                'public/js/modules/users.js',
                'public/js/modules/departments.js',
                'public/js/modules/attendance.js',
                'public/js/modules/notifications-enterprise.js',
                'public/js/modules/shifts.js',
                'public/js/modules/inbox.js',
                'src/config/modules-metadata-extended.json'
            ]
        };

        console.log('\n📝 [SYNC] Registrando cambios en metadata...');

        // Actualizar metadata para módulos afectados
        const affectedModules = ['users', 'departments', 'attendance', 'notifications-enterprise', 'shifts', 'inbox'];

        for (const moduleKey of affectedModules) {
            console.log(`\n🔄 [SYNC] Procesando módulo: ${moduleKey}`);

            // Actualizar metadata y sincronizar con AssistantKnowledgeBase
            await knowledgeService.updateMetadataAfterChange(moduleKey, {
                ...changeData,
                module_affected: moduleKey,
                change_type: 'export_convention_unified'
            });

            console.log(`✅ [SYNC] Módulo ${moduleKey} actualizado y sincronizado`);
        }

        console.log('\n🎯 [SYNC] Sincronización global del sistema...');

        // Sincronizar todos los módulos con AssistantKnowledgeBase
        await knowledgeService.syncWithAssistant();

        console.log('\n✅ [SYNC] Sincronización completada exitosamente');
        console.log('\n📊 [SYNC] Estado final:');
        console.log(`   • Módulos en metadata: ${knowledgeService.metadata.size}`);
        console.log(`   • Business rules: ${knowledgeService.businessRules.size}`);
        console.log(`   • Health indicators: ${knowledgeService.healthIndicators.size}`);
        console.log(`   • Módulos sincronizados con AssistantKnowledgeBase: ${affectedModules.length}`);

        console.log('\n🧠 El Asistente IA ahora conoce todos los cambios arquitectónicos v3.0.0');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ [SYNC] Error en sincronización:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar
syncKnowledge();
