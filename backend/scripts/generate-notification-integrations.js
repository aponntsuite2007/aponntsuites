/**
 * Generador Automático de Integraciones de Notificaciones
 *
 * Lee workflows de la BD y genera código de integración NCE
 * para todos los módulos pendientes
 */

const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Mapeo de módulos a servicios
const MODULE_TO_SERVICE = {
    vacation: 'VacationOptimizer',
    staff: 'StaffManagementService',
    attendance: 'AttendanceService',
    payroll: 'PayrollService',
    suppliers: 'SupplierService',
    training: 'TrainingService',
    performance: 'PerformanceService',
    documents: 'DocumentService',
    procedures: 'ProcedureService',
    commercial: 'CommercialService',
    onboarding: 'OnboardingService',
    engineering: 'EngineeringService',
    security: 'SecurityService',
    platform: 'PlatformService',
    alerts: 'AlertService'
};

// Eventos comunes que disparan notificaciones por tipo de workflow
const WORKFLOW_TRIGGERS = {
    'created': 'create',
    'approved': 'approve',
    'rejected': 'reject',
    'scheduled': 'schedule',
    'requested': 'request',
    'assigned': 'assign',
    'completed': 'complete',
    'expired': 'checkExpiration',
    'reminder': 'sendReminder'
};

async function generateIntegrations() {
    await sequelize.authenticate();

    console.log('🔧 GENERADOR AUTOMÁTICO DE INTEGRACIONES NCE\n');
    console.log('Analizando módulos pendientes...\n');

    // Módulos pendientes (ya integrados: billing, biometric, legal, medical, support)
    const pendingModules = Object.keys(MODULE_TO_SERVICE);

    let totalIntegrations = 0;

    for (const module of pendingModules) {
        console.log(`\n📦 Procesando módulo: ${module.toUpperCase()}`);
        console.log('─'.repeat(60));

        // Obtener workflows del módulo
        const workflows = await sequelize.query(`
            SELECT process_key, process_name, description
            FROM notification_workflows
            WHERE module = :module AND is_active = true
            ORDER BY process_key
        `, {
            replacements: { module },
            type: QueryTypes.SELECT
        });

        if (workflows.length === 0) {
            console.log(`  ⚠️  No hay workflows para ${module}`);
            continue;
        }

        console.log(`  ✅ ${workflows.length} workflows encontrados`);

        // Generar código de integración
        const integrationCode = generateModuleIntegration(module, workflows);

        // Guardar en archivo
        const outputPath = path.join(__dirname, '..', 'src', 'services', 'integrations', `${module}-notifications.js`);

        // Crear directorio si no existe
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, integrationCode);
        console.log(`  📝 Generado: ${outputPath}`);

        totalIntegrations += workflows.length;
    }

    console.log(`\n\n✅ GENERACIÓN COMPLETADA`);
    console.log(`   Total módulos procesados: ${pendingModules.length}`);
    console.log(`   Total integraciones generadas: ${totalIntegrations}`);
    console.log(`\n📁 Archivos generados en: src/services/integrations/`);
    console.log(`\n⚠️  SIGUIENTE PASO: Importar e integrar estos archivos en cada servicio`);

    process.exit(0);
}

function generateModuleIntegration(module, workflows) {
    const serviceName = MODULE_TO_SERVICE[module];

    let code = `/**
 * ${module.toUpperCase()} - Integraciones de Notificaciones
 * Generado automáticamente
 *
 * @module ${module}-notifications
 */

const NotificationCentralExchange = require('../NotificationCentralExchange');

class ${capitalize(module)}Notifications {

`;

    // Generar método para cada workflow
    workflows.forEach(workflow => {
        const methodName = workflowToMethodName(workflow.process_key);
        const priority = inferPriority(workflow.process_key);
        const channels = inferChannels(workflow.process_key);

        code += `    /**
     * ${workflow.process_name}
     * Workflow: ${workflow.process_key}
     */
    static async ${methodName}({ companyId, recipientId, data = {} }) {
        try {
            await NotificationCentralExchange.send({
                companyId,
                module: '${module}',
                workflowKey: '${workflow.process_key}',
                recipientType: 'user',
                recipientId,
                title: '${workflow.process_name}',
                message: data.message || '${workflow.description || workflow.process_name}',
                priority: '${priority}',
                channels: ${JSON.stringify(channels)},
                originType: '${module}_${workflow.process_key.split('_')[0]}',
                originId: data.originId || data.id?.toString() || 'unknown',
                requiresAction: ${workflow.process_key.includes('request') || workflow.process_key.includes('approval')},
                metadata: data
            });
            console.log(\`✅ [${module.toUpperCase()}] Notificación enviada: ${workflow.process_key}\`);
        } catch (error) {
            console.error(\`❌ [${module.toUpperCase()}] Error en ${methodName}:\`, error);
        }
    }

`;
    });

    code += `}

module.exports = ${capitalize(module)}Notifications;
`;

    return code;
}

function workflowToMethodName(processKey) {
    // Convertir vacation_request_created → notifyVacationRequestCreated
    const parts = processKey.split('_').slice(1); // Quitar prefijo del módulo si existe
    const camelCase = parts.map((p, i) => i === 0 ? p : capitalize(p)).join('');
    return `notify${capitalize(camelCase)}`;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function inferPriority(processKey) {
    if (processKey.includes('urgent') || processKey.includes('critical')) return 'urgent';
    if (processKey.includes('approval') || processKey.includes('request')) return 'high';
    if (processKey.includes('reminder') || processKey.includes('expired')) return 'high';
    if (processKey.includes('rejected') || processKey.includes('non_conformity')) return 'high';
    return 'normal';
}

function inferChannels(processKey) {
    if (processKey.includes('urgent') || processKey.includes('critical')) {
        return ['email', 'sms', 'push', 'inbox', 'websocket'];
    }
    if (processKey.includes('approval') || processKey.includes('request')) {
        return ['email', 'push', 'inbox', 'websocket'];
    }
    if (processKey.includes('reminder')) {
        return ['email', 'push', 'inbox'];
    }
    return ['email', 'inbox', 'websocket'];
}

generateIntegrations().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
