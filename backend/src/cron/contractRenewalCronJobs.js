/**
 * ============================================================================
 * CONTRACT RENEWAL CRON JOBS - RENOVACIÓN AUTOMÁTICA DE CONTRATOS
 * ============================================================================
 *
 * Cron jobs para gestión automática del ciclo de vida de contratos:
 * 1. Alertas de renovación T-30 días (diario a las 6am)
 * 2. Extensiones automáticas T-0 (diario a las 6:30am)
 * 3. Suspensiones por grace period expirado (diario a las 7am)
 *
 * Destinatarios de alertas:
 * - Vendedor asignado al contrato
 * - aponntcomercial@gmail.com
 * - Email de sucursal central de la empresa
 *
 * Created: 2025-12-16
 */

const cron = require('node-cron');
const ContractRenewalService = require('../services/ContractRenewalService');

// Variable para almacenar las tareas cron
let cronTasks = [];

/**
 * Inicializar todos los cron jobs de renovación de contratos
 */
function initContractRenewalCronJobs() {
    console.log('⏰ [CONTRACT CRON] Inicializando cron jobs de renovación de contratos...');

    // CRON 1: Ciclo completo de renovación (alertas + extensiones + suspensiones)
    // Ejecutar diariamente a las 6:00 AM
    const renewalCycleJob = cron.schedule('0 6 * * *', async () => {
        console.log('\n📋 [CONTRACT CRON] Iniciando ciclo de renovación de contratos...');
        console.log(`   Hora: ${new Date().toLocaleString()}`);

        try {
            const results = await ContractRenewalService.runRenewalCycle();

            console.log('\n✅ [CONTRACT CRON] Ciclo de renovación completado:');
            console.log(`   📧 Alertas enviadas: ${results.alerts_sent}`);
            console.log(`   🔄 Extensiones aplicadas: ${results.extensions_applied}`);
            console.log(`   ⏹️ Contratos suspendidos: ${results.contracts_suspended}`);

            if (results.errors.length > 0) {
                console.log('\n   ⚠️ Errores:');
                results.errors.forEach(error => {
                    console.log(`      - ${error}`);
                });
            }

        } catch (error) {
            console.error('❌ [CONTRACT CRON] Error en ciclo de renovación:', error);
        }

        console.log('🏁 [CONTRACT CRON] Fin de ciclo de renovación\n');
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('   ✅ Cron job: Ciclo de renovación de contratos (diario 6:00 AM)');

    // CRON 2: Estadísticas de contratos (para monitoreo)
    // Ejecutar cada lunes a las 8:00 AM
    const statsJob = cron.schedule('0 8 * * 1', async () => {
        console.log('\n📊 [CONTRACT CRON] Generando estadísticas de contratos...');

        try {
            const stats = await ContractRenewalService.getRenewalStats();

            console.log('\n📊 [CONTRACT CRON] Estadísticas de contratos:');
            console.log(`   ✅ Contratos activos: ${stats.active_contracts || 0}`);
            console.log(`   ⏳ Pendientes de renovación: ${stats.renewal_pending || 0}`);
            console.log(`   ⚠️ En período de gracia: ${stats.in_grace_period || 0}`);
            console.log(`   🛑 Suspendidos: ${stats.suspended || 0}`);
            console.log(`   📅 Por vencer pronto: ${stats.expiring_soon || 0}`);
            console.log(`   🚨 Grace period por terminar: ${stats.grace_ending_soon || 0}`);

        } catch (error) {
            console.error('❌ [CONTRACT CRON] Error generando estadísticas:', error);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('   ✅ Cron job: Estadísticas de contratos (lunes 8:00 AM)');

    // Guardar referencias a las tareas
    cronTasks.push({
        name: 'Ciclo de renovación de contratos',
        schedule: 'Diario 6:00 AM',
        task: renewalCycleJob
    });

    cronTasks.push({
        name: 'Estadísticas de contratos',
        schedule: 'Lunes 8:00 AM',
        task: statsJob
    });

    console.log('✅ [CONTRACT CRON] Todos los cron jobs de renovación iniciados\n');
}

/**
 * Detener todos los cron jobs (para shutdown graceful)
 */
function stopContractRenewalCronJobs() {
    console.log('⏰ [CONTRACT CRON] Deteniendo cron jobs de renovación...');

    cronTasks.forEach(job => {
        job.task.stop();
        console.log(`   ⏹️ Detenido: ${job.name}`);
    });

    cronTasks = [];
    console.log('✅ [CONTRACT CRON] Todos los cron jobs de renovación detenidos');
}

/**
 * Obtener estado de cron jobs (para API o debug)
 */
function getContractRenewalCronStatus() {
    return cronTasks.map(job => ({
        name: job.name,
        schedule: job.schedule,
        running: job.task.running
    }));
}

/**
 * Ejecutar ciclo de renovación manualmente (para testing)
 */
async function runRenewalCycleManually() {
    console.log('\n🔧 [CONTRACT CRON] Ejecutando ciclo de renovación manualmente...');

    try {
        const results = await ContractRenewalService.runRenewalCycle();
        console.log(`✅ Ciclo completado: ${results.alerts_sent} alertas, ${results.extensions_applied} extensiones, ${results.contracts_suspended} suspensiones`);
        return results;
    } catch (error) {
        console.error('❌ Error ejecutando ciclo de renovación:', error);
        throw error;
    }
}

/**
 * Ejecutar solo alertas de renovación manualmente
 */
async function runRenewalAlertsManually() {
    console.log('\n🔧 [CONTRACT CRON] Ejecutando alertas de renovación manualmente...');

    try {
        const results = await ContractRenewalService.sendRenewalAlerts();
        console.log(`✅ Alertas enviadas: ${results.count} de ${results.total}`);
        return results;
    } catch (error) {
        console.error('❌ Error ejecutando alertas:', error);
        throw error;
    }
}

/**
 * Ejecutar solo extensiones automáticas manualmente
 */
async function runAutoExtensionsManually() {
    console.log('\n🔧 [CONTRACT CRON] Ejecutando extensiones automáticas manualmente...');

    try {
        const results = await ContractRenewalService.applyAutoExtensions();
        console.log(`✅ Extensiones aplicadas: ${results.count}`);
        return results;
    } catch (error) {
        console.error('❌ Error ejecutando extensiones:', error);
        throw error;
    }
}

/**
 * Ejecutar solo suspensiones manualmente
 */
async function runSuspensionsManually() {
    console.log('\n🔧 [CONTRACT CRON] Ejecutando suspensiones manualmente...');

    try {
        const results = await ContractRenewalService.suspendExpiredContracts();
        console.log(`✅ Contratos suspendidos: ${results.count}`);
        return results;
    } catch (error) {
        console.error('❌ Error ejecutando suspensiones:', error);
        throw error;
    }
}

module.exports = {
    initContractRenewalCronJobs,
    stopContractRenewalCronJobs,
    getContractRenewalCronStatus,
    runRenewalCycleManually,
    runRenewalAlertsManually,
    runAutoExtensionsManually,
    runSuspensionsManually
};
