/**
 * ============================================================================
 * COMPANY EMAIL POLLER CRON JOBS
 * ============================================================================
 *
 * Cron jobs para polling periódico de inboxes IMAP de empresas.
 *
 * @version 1.0
 * @date 2025-12-17
 */

const cron = require('node-cron');
const CompanyEmailPollerService = require('../services/CompanyEmailPollerService');

let pollerCronJob = null;
let healthCheckJob = null;

/**
 * Inicializa los cron jobs de email polling
 */
function initializeCompanyEmailPollerCron() {
    console.log('📬 [CRON] Inicializando Company Email Poller Cron Jobs...');

    // =========================================================================
    // JOB 1: Polling de emails cada 2 minutos
    // =========================================================================
    // Más frecuente que el intervalo del servicio para capturar empresas
    // cuyo poll_interval_seconds haya pasado
    pollerCronJob = cron.schedule('*/2 * * * *', async () => {
        console.log('📬 [CRON] Ejecutando ciclo de polling IMAP...');
        try {
            await CompanyEmailPollerService.pollAllCompanies();
        } catch (error) {
            console.error('❌ [CRON] Error en polling IMAP:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    // =========================================================================
    // JOB 2: Health check diario a las 7:00 AM
    // =========================================================================
    // Verifica conexiones IMAP y reporta problemas
    healthCheckJob = cron.schedule('0 7 * * *', async () => {
        console.log('🏥 [CRON] Ejecutando health check de IMAP...');
        try {
            const stats = await CompanyEmailPollerService.getPollingStats();

            // Detectar empresas con errores
            const withErrors = stats.filter(s => s.error_count > 0);
            const stale = stats.filter(s => {
                if (!s.imap_last_poll) return true;
                const lastPoll = new Date(s.imap_last_poll);
                const hoursSince = (Date.now() - lastPoll.getTime()) / (1000 * 60 * 60);
                return hoursSince > 24;
            });

            if (withErrors.length > 0) {
                console.warn(`⚠️ [CRON] ${withErrors.length} empresas con errores IMAP:`);
                withErrors.forEach(e => {
                    console.warn(`   - ${e.company_name}: ${e.last_error} (${e.error_count} errores)`);
                });
            }

            if (stale.length > 0) {
                console.warn(`⚠️ [CRON] ${stale.length} empresas sin polling en 24h:`);
                stale.forEach(e => {
                    console.warn(`   - ${e.company_name}`);
                });
            }

            console.log(`📊 [CRON] Health check completo: ${stats.length} empresas con IMAP activo`);

        } catch (error) {
            console.error('❌ [CRON] Error en health check:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('✅ [CRON] Company Email Poller Cron Jobs inicializados');
    console.log('   📬 Polling: cada 2 minutos');
    console.log('   🏥 Health check: diario 7:00 AM');

    return { pollerCronJob, healthCheckJob };
}

/**
 * Detiene los cron jobs
 */
function stopCompanyEmailPollerCron() {
    if (pollerCronJob) {
        pollerCronJob.stop();
        pollerCronJob = null;
    }
    if (healthCheckJob) {
        healthCheckJob.stop();
        healthCheckJob = null;
    }
    console.log('🛑 [CRON] Company Email Poller Cron Jobs detenidos');
}

module.exports = {
    initializeCompanyEmailPollerCron,
    stopCompanyEmailPollerCron
};
