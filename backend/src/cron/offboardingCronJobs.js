/**
 * OFFBOARDING CRON JOBS
 * Jobs programados para el proceso automático de baja de empresas:
 * - Detección de facturas vencidas > 30 días (diario 8 AM)
 * - Verificación de grace periods vencidos (diario 8:30 AM)
 * - Limpieza de exports antiguos (semanal, domingos 3 AM)
 *
 * @version 1.0.0
 * @date 2026-01-24
 */

const cron = require('node-cron');

const jobs = {};
let initialized = false;

/**
 * Inicializa todos los cron jobs de offboarding
 */
function initOffboardingCronJobs() {
  if (initialized) {
    console.log('⚠️ [Offboarding Cron] Ya inicializado');
    return;
  }

  const timezone = process.env.TIMEZONE || 'America/Argentina/Buenos_Aires';

  // ═══════════════════════════════════════════════════════════════════
  // JOB 1: Detectar facturas vencidas > 30 días (Diario 8:00 AM)
  // ═══════════════════════════════════════════════════════════════════
  jobs.overdueDetection = cron.schedule('0 8 * * *', async () => {
    console.log('🔍 [Offboarding Cron] Ejecutando detección de facturas vencidas > 30 días...');

    try {
      const CompanyOffboardingService = require('../services/CompanyOffboardingService');
      const companiesAtRisk = await CompanyOffboardingService.getCompaniesAtRisk();

      let warningsSent = 0;

      for (const company of companiesAtRisk) {
        // Solo procesar empresas que NO tienen ya un proceso de baja activo
        if (!company.offboarding_status) {
          try {
            await CompanyOffboardingService.initiateWarning(
              company.company_id,
              company.invoice_id,
              null // automated
            );
            warningsSent++;
            console.log(`  ⚠️ Warning enviado: ${company.company_name} (factura ${company.invoice_number}, ${company.days_overdue} días vencida)`);
          } catch (err) {
            console.error(`  ❌ Error al enviar warning a ${company.company_name}:`, err.message);
          }
        }
      }

      console.log(`✅ [Offboarding Cron] Detección completada. ${companiesAtRisk.length} empresas en riesgo, ${warningsSent} warnings enviados.`);
    } catch (error) {
      console.error('❌ [Offboarding Cron] Error en detección de vencidas:', error);
    }
  }, { timezone, scheduled: true });

  // ═══════════════════════════════════════════════════════════════════
  // JOB 2: Verificar grace periods vencidos (Diario 8:30 AM)
  // ═══════════════════════════════════════════════════════════════════
  jobs.graceCheck = cron.schedule('30 8 * * *', async () => {
    console.log('🔍 [Offboarding Cron] Verificando grace periods vencidos...');

    try {
      const { sequelize } = require('../config/database');
      const { QueryTypes } = require('sequelize');
      const CompanyOffboardingService = require('../services/CompanyOffboardingService');

      // Buscar empresas con grace period vencido
      const expiredGrace = await sequelize.query(`
        SELECT company_id, name, offboarding_grace_deadline, offboarding_status
        FROM companies
        WHERE offboarding_status IN ('warning_sent', 'grace_period')
          AND offboarding_grace_deadline IS NOT NULL
          AND offboarding_grace_deadline < CURRENT_DATE
          AND is_active = true
      `, { type: QueryTypes.SELECT });

      let exportsStarted = 0;

      for (const company of expiredGrace) {
        try {
          await CompanyOffboardingService.initiateExport(company.company_id, null);
          exportsStarted++;
          console.log(`  📦 Export iniciado: ${company.name} (grace deadline: ${company.offboarding_grace_deadline})`);
        } catch (err) {
          console.error(`  ❌ Error al exportar ${company.name}:`, err.message);
        }
      }

      console.log(`✅ [Offboarding Cron] Grace check completado. ${expiredGrace.length} vencidos, ${exportsStarted} exports iniciados.`);
    } catch (error) {
      console.error('❌ [Offboarding Cron] Error en grace check:', error);
    }
  }, { timezone, scheduled: true });

  // ═══════════════════════════════════════════════════════════════════
  // JOB 3: Limpieza de exports antiguos (Domingos 3:00 AM)
  // ═══════════════════════════════════════════════════════════════════
  jobs.exportCleanup = cron.schedule('0 3 * * 0', async () => {
    console.log('🗑️ [Offboarding Cron] Limpiando exports antiguos...');

    try {
      const CompanyDataExportService = require('../services/CompanyDataExportService');
      const deleted = CompanyDataExportService.cleanupOldExports(30);
      console.log(`✅ [Offboarding Cron] Cleanup completado. ${deleted} archivos eliminados.`);
    } catch (error) {
      console.error('❌ [Offboarding Cron] Error en cleanup:', error);
    }
  }, { timezone, scheduled: true });

  initialized = true;
  console.log('✅ [Offboarding Cron] Jobs inicializados:');
  console.log('   - Detección facturas vencidas: Diario 8:00 AM');
  console.log('   - Grace period check: Diario 8:30 AM');
  console.log('   - Cleanup exports: Domingos 3:00 AM');
}

/**
 * Detiene todos los cron jobs
 */
function stopOffboardingCronJobs() {
  Object.values(jobs).forEach(job => {
    if (job && job.stop) job.stop();
  });
  initialized = false;
  console.log('⏹️ [Offboarding Cron] Jobs detenidos');
}

/**
 * Obtiene el estado de los cron jobs
 */
function getOffboardingCronStatus() {
  return {
    initialized,
    jobs: {
      overdueDetection: { active: !!jobs.overdueDetection, schedule: '0 8 * * *', description: 'Detectar facturas vencidas > 30 días' },
      graceCheck: { active: !!jobs.graceCheck, schedule: '30 8 * * *', description: 'Verificar grace periods vencidos' },
      exportCleanup: { active: !!jobs.exportCleanup, schedule: '0 3 * * 0', description: 'Limpiar exports antiguos' }
    }
  };
}

/**
 * Ejecuta un job manualmente (para testing o forzado desde panel)
 * @param {string} jobName - 'overdueDetection', 'graceCheck', 'exportCleanup'
 */
async function runOffboardingJobManually(jobName) {
  console.log(`🔧 [Offboarding Cron] Ejecutando ${jobName} manualmente...`);

  switch (jobName) {
    case 'overdueDetection': {
      const CompanyOffboardingService = require('../services/CompanyOffboardingService');
      const companies = await CompanyOffboardingService.getCompaniesAtRisk();
      let sent = 0;
      for (const c of companies) {
        if (!c.offboarding_status) {
          try {
            await CompanyOffboardingService.initiateWarning(c.company_id, c.invoice_id, null);
            sent++;
          } catch (e) { /* continue */ }
        }
      }
      return { companiesAtRisk: companies.length, warningsSent: sent };
    }

    case 'graceCheck': {
      const { sequelize } = require('../config/database');
      const { QueryTypes } = require('sequelize');
      const CompanyOffboardingService = require('../services/CompanyOffboardingService');

      const expired = await sequelize.query(`
        SELECT id FROM companies
        WHERE offboarding_status IN ('warning_sent', 'grace_period')
          AND offboarding_grace_deadline < CURRENT_DATE
          AND is_active = true
      `, { type: QueryTypes.SELECT });

      let exported = 0;
      for (const c of expired) {
        try {
          await CompanyOffboardingService.initiateExport(c.id, null);
          exported++;
        } catch (e) { /* continue */ }
      }
      return { expiredGracePeriods: expired.length, exportsStarted: exported };
    }

    case 'exportCleanup': {
      const CompanyDataExportService = require('../services/CompanyDataExportService');
      const deleted = CompanyDataExportService.cleanupOldExports(30);
      return { filesDeleted: deleted };
    }

    default:
      throw new Error(`Job desconocido: ${jobName}. Opciones: overdueDetection, graceCheck, exportCleanup`);
  }
}

module.exports = {
  initOffboardingCronJobs,
  stopOffboardingCronJobs,
  getOffboardingCronStatus,
  runOffboardingJobManually
};
