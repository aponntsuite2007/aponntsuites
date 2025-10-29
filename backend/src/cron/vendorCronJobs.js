/**
 * CRON JOBS: Vendor & Invoicing System
 *
 * Tareas automatizadas para el sistema de vendedores y facturación:
 * 1. Generación mensual de facturas (día 1 de cada mes, 00:05 AM)
 * 2. Cálculo diario de scoring de partners (todos los días, 02:00 AM)
 * 3. Marcado de facturas vencidas (todos los días, 03:00 AM)
 * 4. Envío de reminders de trials (todos los días, 09:00 AM)
 * 5. Procesamiento de trials expirados (todos los días, 10:00 AM)
 */

const cron = require('node-cron');
const InvoiceGenerationService = require('../services/InvoiceGenerationService');
const ScoringCalculationService = require('../services/ScoringCalculationService');
const ModuleTrialService = require('../services/ModuleTrialService');

class VendorCronJobs {
  constructor() {
    this.jobs = [];
    this.isInitialized = false;
  }

  /**
   * Inicializa todos los CRON jobs
   */
  init() {
    if (this.isInitialized) {
      console.log('⚠️  [CRON] Vendor CRON jobs ya están inicializados');
      return;
    }

    console.log('\n⏰ [CRON] Inicializando Vendor & Invoicing CRON jobs...');

    // 1. Generación mensual de facturas - Día 1 de cada mes a las 00:05 AM
    this.scheduleMonthlyInvoiceGeneration();

    // 2. Cálculo diario de scoring - Todos los días a las 02:00 AM
    this.scheduleDailyScoring();

    // 3. Marcado de facturas vencidas - Todos los días a las 03:00 AM
    this.scheduleOverdueInvoicesCheck();

    // 4. Envío de reminders de trials - Todos los días a las 09:00 AM
    this.scheduleTrialReminders();

    // 5. Procesamiento de trials expirados - Todos los días a las 10:00 AM
    this.scheduleExpiredTrialsProcessing();

    this.isInitialized = true;
    console.log('✅ [CRON] Vendor CRON jobs inicializados exitosamente\n');
  }

  /**
   * JOB 1: Generación mensual de facturas
   * Ejecuta: Día 1 de cada mes a las 00:05 AM
   * Formato cron: '5 0 1 * *' (minuto hora día mes día-semana)
   */
  scheduleMonthlyInvoiceGeneration() {
    const job = cron.schedule('5 0 1 * *', async () => {
      try {
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('📄 [CRON JOB] GENERACIÓN MENSUAL DE FACTURAS');
        console.log(`   Fecha: ${new Date().toISOString()}`);
        console.log('═══════════════════════════════════════════════════════\n');

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-12

        console.log(`   Período: ${year}-${String(month).padStart(2, '0')}`);

        const result = await InvoiceGenerationService.generateMonthlyInvoices(year, month);

        console.log('\n📊 [RESULTADO]');
        console.log(`   Total empresas procesadas: ${result.total_companies}`);
        console.log(`   Facturas creadas: ${result.invoices_created}`);
        console.log(`   Errores: ${result.errors.length}`);

        if (result.errors.length > 0) {
          console.log('\n❌ [ERRORES]');
          result.errors.forEach(err => {
            console.log(`   - ${err.company_name}: ${err.error}`);
          });
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ [CRON JOB] Generación mensual de facturas COMPLETADA');
        console.log('═══════════════════════════════════════════════════════\n\n');

      } catch (error) {
        console.error('\n\n═══════════════════════════════════════════════════════');
        console.error('❌ [CRON JOB] ERROR en generación de facturas');
        console.error(error);
        console.error('═══════════════════════════════════════════════════════\n\n');
      }
    }, {
      scheduled: true,
      timezone: "America/Buenos_Aires"
    });

    this.jobs.push({ name: 'monthly_invoice_generation', job });
    console.log('   ✅ CRON Job configurado: Generación mensual de facturas (día 1, 00:05 AM)');
  }

  /**
   * JOB 2: Cálculo diario de scoring de partners
   * Ejecuta: Todos los días a las 02:00 AM
   * Formato cron: '0 2 * * *'
   */
  scheduleDailyScoring() {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('⭐ [CRON JOB] CÁLCULO DIARIO DE SCORING');
        console.log(`   Fecha: ${new Date().toISOString()}`);
        console.log('═══════════════════════════════════════════════════════\n');

        const result = await ScoringCalculationService.calculateAllScores();

        console.log('\n📊 [RESULTADO]');
        console.log(`   Total partners procesados: ${result.total_partners}`);
        console.log(`   Scores actualizados: ${result.scores_updated}`);
        console.log(`   Subastas creadas: ${result.auctions_created}`);
        console.log(`   Suspensiones: ${result.suspensions}`);
        console.log(`   Bonificaciones: ${result.bonuses}`);

        // Mostrar cambios significativos (> 0.5 puntos)
        const significantChanges = result.details.filter(d => Math.abs(parseFloat(d.change)) > 0.5);
        if (significantChanges.length > 0) {
          console.log('\n📈 [CAMBIOS SIGNIFICATIVOS]');
          significantChanges.forEach(detail => {
            console.log(`   - ${detail.partner_name}: ${detail.new_score} ⭐ (${detail.change > 0 ? '+' : ''}${detail.change})`);
          });
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ [CRON JOB] Cálculo diario de scoring COMPLETADO');
        console.log('═══════════════════════════════════════════════════════\n\n');

      } catch (error) {
        console.error('\n\n═══════════════════════════════════════════════════════');
        console.error('❌ [CRON JOB] ERROR en cálculo de scoring');
        console.error(error);
        console.error('═══════════════════════════════════════════════════════\n\n');
      }
    }, {
      scheduled: true,
      timezone: "America/Buenos_Aires"
    });

    this.jobs.push({ name: 'daily_scoring_calculation', job });
    console.log('   ✅ CRON Job configurado: Cálculo diario de scoring (02:00 AM)');
  }

  /**
   * JOB 3: Marcado de facturas vencidas
   * Ejecuta: Todos los días a las 03:00 AM
   * Formato cron: '0 3 * * *'
   */
  scheduleOverdueInvoicesCheck() {
    const job = cron.schedule('0 3 * * *', async () => {
      try {
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('📅 [CRON JOB] VERIFICACIÓN DE FACTURAS VENCIDAS');
        console.log(`   Fecha: ${new Date().toISOString()}`);
        console.log('═══════════════════════════════════════════════════════\n');

        const count = await InvoiceGenerationService.markOverdueInvoices();

        console.log(`   ✅ ${count} facturas marcadas como vencidas`);

        // Obtener lista de facturas vencidas
        const overdueInvoices = await InvoiceGenerationService.getOverdueInvoices();

        if (overdueInvoices.length > 0) {
          console.log('\n📋 [FACTURAS VENCIDAS ACTUALES]');
          overdueInvoices.slice(0, 10).forEach(inv => {
            console.log(`   - ${inv.invoice_number} | ${inv.company_name} | $${inv.total_amount} | Vencida: ${inv.due_date.toISOString().split('T')[0]}`);
          });

          if (overdueInvoices.length > 10) {
            console.log(`   ... y ${overdueInvoices.length - 10} más`);
          }
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ [CRON JOB] Verificación de facturas vencidas COMPLETADA');
        console.log('═══════════════════════════════════════════════════════\n\n');

      } catch (error) {
        console.error('\n\n═══════════════════════════════════════════════════════');
        console.error('❌ [CRON JOB] ERROR en verificación de facturas vencidas');
        console.error(error);
        console.error('═══════════════════════════════════════════════════════\n\n');
      }
    }, {
      scheduled: true,
      timezone: "America/Buenos_Aires"
    });

    this.jobs.push({ name: 'overdue_invoices_check', job });
    console.log('   ✅ CRON Job configurado: Verificación de facturas vencidas (03:00 AM)');
  }

  /**
   * JOB 4: Envío de reminders de trials
   * Ejecuta: Todos los días a las 09:00 AM
   * Formato cron: '0 9 * * *'
   */
  scheduleTrialReminders() {
    const job = cron.schedule('0 9 * * *', async () => {
      try {
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('🔬 [CRON JOB] ENVÍO DE REMINDERS DE TRIALS');
        console.log(`   Fecha: ${new Date().toISOString()}`);
        console.log('═══════════════════════════════════════════════════════\n');

        const reminderTypes = ['7days', '3days', '1day', 'final'];
        let totalSent = 0;
        let totalFailed = 0;

        for (const reminderType of reminderTypes) {
          console.log(`\n📧 [${reminderType.toUpperCase()}] Enviando reminders...`);

          const result = await ModuleTrialService.sendTrialReminders(reminderType);

          totalSent += result.sent;
          totalFailed += result.failed;

          console.log(`   ✅ Enviados: ${result.sent}`);
          console.log(`   ❌ Fallidos: ${result.failed}`);

          if (result.trials.length > 0) {
            result.trials.forEach(t => {
              console.log(`      - ${t.company_name}: ${t.module_name} (${t.days_remaining} días restantes)`);
            });
          }
        }

        console.log('\n📊 [RESULTADO TOTAL]');
        console.log(`   Total reminders enviados: ${totalSent}`);
        console.log(`   Total fallidos: ${totalFailed}`);

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ [CRON JOB] Envío de reminders de trials COMPLETADO');
        console.log('═══════════════════════════════════════════════════════\n\n');

      } catch (error) {
        console.error('\n\n═══════════════════════════════════════════════════════');
        console.error('❌ [CRON JOB] ERROR en envío de reminders de trials');
        console.error(error);
        console.error('═══════════════════════════════════════════════════════\n\n');
      }
    }, {
      scheduled: true,
      timezone: "America/Buenos_Aires"
    });

    this.jobs.push({ name: 'trial_reminders', job });
    console.log('   ✅ CRON Job configurado: Envío de reminders de trials (09:00 AM)');
  }

  /**
   * JOB 5: Procesamiento de trials expirados
   * Ejecuta: Todos los días a las 10:00 AM
   * Formato cron: '0 10 * * *'
   */
  scheduleExpiredTrialsProcessing() {
    const job = cron.schedule('0 10 * * *', async () => {
      try {
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('⏰ [CRON JOB] PROCESAMIENTO DE TRIALS EXPIRADOS');
        console.log(`   Fecha: ${new Date().toISOString()}`);
        console.log('═══════════════════════════════════════════════════════\n');

        const result = await ModuleTrialService.processExpiredTrials();

        console.log('\n📊 [RESULTADO]');
        console.log(`   Trials expirados: ${result.expired}`);
        console.log(`   Quotes rechazados: ${result.quotes_rejected}`);

        if (result.trials.length > 0) {
          console.log('\n📋 [TRIALS PROCESADOS]');
          result.trials.forEach(trial => {
            console.log(`   - Trial ID ${trial.trial_id}: ${trial.module_name} (empresa ${trial.company_id})`);
          });
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ [CRON JOB] Procesamiento de trials expirados COMPLETADO');
        console.log('═══════════════════════════════════════════════════════\n\n');

      } catch (error) {
        console.error('\n\n═══════════════════════════════════════════════════════');
        console.error('❌ [CRON JOB] ERROR en procesamiento de trials expirados');
        console.error(error);
        console.error('═══════════════════════════════════════════════════════\n\n');
      }
    }, {
      scheduled: true,
      timezone: "America/Buenos_Aires"
    });

    this.jobs.push({ name: 'expired_trials_processing', job });
    console.log('   ✅ CRON Job configurado: Procesamiento de trials expirados (10:00 AM)');
  }

  /**
   * Detiene todos los CRON jobs
   */
  stopAll() {
    console.log('\n⏸️  [CRON] Deteniendo todos los CRON jobs...');

    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`   ⏸️  Detenido: ${name}`);
    });

    this.isInitialized = false;
    console.log('✅ [CRON] Todos los CRON jobs detenidos\n');
  }

  /**
   * Obtiene estado de todos los CRON jobs
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      total_jobs: this.jobs.length,
      jobs: this.jobs.map(({ name, job }) => ({
        name,
        running: job.running || false
      }))
    };
  }

  /**
   * Ejecuta manualmente un job específico (para testing)
   */
  async runJobManually(jobName) {
    console.log(`\n🔧 [CRON] Ejecutando manualmente job: ${jobName}...`);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      switch (jobName) {
        case 'monthly_invoice_generation':
          return await InvoiceGenerationService.generateMonthlyInvoices(year, month);

        case 'daily_scoring_calculation':
          return await ScoringCalculationService.calculateAllScores();

        case 'overdue_invoices_check':
          const count = await InvoiceGenerationService.markOverdueInvoices();
          return { success: true, count };

        case 'trial_reminders':
          const reminderTypes = ['7days', '3days', '1day', 'final'];
          const results = [];
          for (const type of reminderTypes) {
            const result = await ModuleTrialService.sendTrialReminders(type);
            results.push(result);
          }
          return { success: true, results };

        case 'expired_trials_processing':
          return await ModuleTrialService.processExpiredTrials();

        default:
          throw new Error(`Job desconocido: ${jobName}`);
      }
    } catch (error) {
      console.error(`❌ [CRON] Error ejecutando job ${jobName}:`, error);
      throw error;
    }
  }
}

module.exports = new VendorCronJobs();
