/**
 * ============================================================================
 * BILLING CRON JOBS - FACTURACIÓN AUTOMÁTICA
 * ============================================================================
 *
 * Cron jobs para facturación automática de:
 * 1. Presupuestos RECURRENTES (diario a las 2am)
 * 2. Contratos Aponnt (día 1 de cada mes a las 3am)
 *
 * Usa node-cron con sintaxis estándar:
 * * * * * * *
 * | | | | | |
 * | | | | | day of week (0-7) (0 or 7 is Sun)
 * | | | | month (1-12)
 * | | | day of month (1-31)
 * | | hour (0-23)
 * | minute (0-59)
 * second (0-59, optional)
 *
 * Created: 2025-01-20
 */

const cron = require('node-cron');
const RecurringQuoteBillingService = require('../services/billing/RecurringQuoteBillingService');
const ContractBillingService = require('../services/billing/ContractBillingService');

// Variable para almacenar las tareas cron
let cronTasks = [];

/**
 * Inicializar todos los cron jobs de facturación
 */
function initBillingCronJobs() {
    console.log('⏰ [BILLING CRON] Inicializando cron jobs de facturación...');

    // CRON 1: Procesar presupuestos RECURRENTES listos para facturar
    // Ejecutar diariamente a las 2:00 AM
    const recurringBillingJob = cron.schedule('0 2 * * *', async () => {
        console.log('\n🔄 [BILLING CRON] Iniciando procesamiento de facturación RECURRENTE...');
        console.log(`   Hora: ${new Date().toLocaleString()}`);

        try {
            const results = await RecurringQuoteBillingService.processRecurringBilling();

            console.log('\n✅ [BILLING CRON] Facturación RECURRENTE completada:');
            console.log(`   ✅ Exitosas: ${results.success.length}`);
            console.log(`   ❌ Fallidas: ${results.failed.length}`);

            // Log detalles de facturas exitosas
            if (results.success.length > 0) {
                console.log('\n   📝 Facturas generadas:');
                results.success.forEach(r => {
                    console.log(`      - Presupuesto ${r.presupuesto_id} → Factura ${r.invoice_number}`);
                });
            }

            // Log errores
            if (results.failed.length > 0) {
                console.log('\n   ⚠️ Errores:');
                results.failed.forEach(r => {
                    console.log(`      - Presupuesto ${r.presupuesto_id}: ${r.error}`);
                });
            }

        } catch (error) {
            console.error('❌ [BILLING CRON] Error en procesamiento de facturación RECURRENTE:', error);
        }

        console.log('🏁 [BILLING CRON] Fin de procesamiento RECURRENTE\n');
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires" // Argentina timezone
    });

    console.log('   ✅ Cron job 1: Facturación RECURRENTE (diario 2:00 AM)');

    // CRON 2: Procesar facturación mensual de contratos Aponnt
    // Ejecutar el día 1 de cada mes a las 3:00 AM
    const contractBillingJob = cron.schedule('0 3 1 * *', async () => {
        console.log('\n🧾 [BILLING CRON] Iniciando facturación mensual de contratos Aponnt...');
        console.log(`   Hora: ${new Date().toLocaleString()}`);

        // Calcular el mes anterior (el que se factura)
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const billingMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

        console.log(`   📅 Facturando período: ${billingMonth}`);

        try {
            const results = await ContractBillingService.processMonthlyBilling(billingMonth);

            console.log('\n✅ [BILLING CRON] Facturación de contratos completada:');
            console.log(`   ✅ Exitosas: ${results.success.length}`);
            console.log(`   ❌ Fallidas: ${results.failed.length}`);

            // Log detalles de facturas exitosas
            if (results.success.length > 0) {
                console.log('\n   📝 Facturas de contratos generadas:');
                results.success.forEach(r => {
                    console.log(`      - Contrato ${r.contract_id} → Factura ${r.invoice_number}`);
                });
            }

            // Log errores
            if (results.failed.length > 0) {
                console.log('\n   ⚠️ Errores:');
                results.failed.forEach(r => {
                    console.log(`      - Contrato ${r.contract_id}: ${r.error}`);
                });
            }

        } catch (error) {
            console.error('❌ [BILLING CRON] Error en facturación de contratos Aponnt:', error);
        }

        console.log('🏁 [BILLING CRON] Fin de facturación de contratos\n');
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('   ✅ Cron job 2: Facturación contratos Aponnt (día 1 de mes, 3:00 AM)');

    // Guardar referencias a las tareas
    cronTasks.push({
        name: 'Facturación RECURRENTE',
        schedule: 'Diario 2:00 AM',
        task: recurringBillingJob
    });

    cronTasks.push({
        name: 'Facturación contratos Aponnt',
        schedule: 'Día 1 de mes, 3:00 AM',
        task: contractBillingJob
    });

    console.log('✅ [BILLING CRON] Todos los cron jobs iniciados exitosamente\n');
}

/**
 * Detener todos los cron jobs (para shutdown graceful)
 */
function stopBillingCronJobs() {
    console.log('⏰ [BILLING CRON] Deteniendo cron jobs...');

    cronTasks.forEach(job => {
        job.task.stop();
        console.log(`   ⏹️ Detenido: ${job.name}`);
    });

    cronTasks = [];
    console.log('✅ [BILLING CRON] Todos los cron jobs detenidos');
}

/**
 * Obtener estado de cron jobs (para API o debug)
 */
function getBillingCronStatus() {
    return cronTasks.map(job => ({
        name: job.name,
        schedule: job.schedule,
        running: job.task.running
    }));
}

/**
 * Ejecutar manualmente un cron job (para testing)
 * @param {string} jobName - 'recurring' o 'contracts'
 * @param {string} billingMonth - Solo para 'contracts' (formato: YYYY-MM)
 */
async function runJobManually(jobName, billingMonth = null) {
    console.log(`\n🔧 [BILLING CRON] Ejecutando job manualmente: ${jobName}`);

    try {
        if (jobName === 'recurring') {
            const results = await RecurringQuoteBillingService.processRecurringBilling();
            console.log(`✅ Facturación RECURRENTE completada: ${results.success.length} exitosas, ${results.failed.length} fallidas`);
            return results;
        } else if (jobName === 'contracts') {
            if (!billingMonth) {
                throw new Error('billingMonth es requerido para contratos (formato: YYYY-MM)');
            }
            const results = await ContractBillingService.processMonthlyBilling(billingMonth);
            console.log(`✅ Facturación contratos completada: ${results.success.length} exitosas, ${results.failed.length} fallidas`);
            return results;
        } else {
            throw new Error(`Job desconocido: ${jobName}. Use 'recurring' o 'contracts'`);
        }
    } catch (error) {
        console.error(`❌ Error ejecutando job ${jobName}:`, error);
        throw error;
    }
}

module.exports = {
    initBillingCronJobs,
    stopBillingCronJobs,
    getBillingCronStatus,
    runJobManually
};
