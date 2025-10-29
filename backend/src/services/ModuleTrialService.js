/**
 * SERVICIO: ModuleTrialService
 *
 * Gestión de trials de módulos:
 * - Control de trials activos
 * - Envío de reminders (7, 3, 1 días antes, final)
 * - Aceptación/rechazo de módulos en trial
 * - Activación post-trial (crea contratos)
 * - Terminación automática de trials expirados
 * - Facturación proporcional del primer mes
 */

const { ModuleTrial, Quote, Company, Partner, Contract } = require('../config/database');
const { sequelize } = require('../config/database');
const QuoteManagementService = require('./QuoteManagementService');

class ModuleTrialService {
  /**
   * Obtiene trials que necesitan reminder
   * @param {String} reminderType - Tipo de reminder ('7days', '3days', '1day', 'final')
   * @returns {Promise<Array>} - Trials que necesitan reminder
   */
  async getTrialsNeedingReminder(reminderType = '7days') {
    try {
      const trials = await ModuleTrial.getTrialsNeedingReminder(reminderType);

      return trials.map(trial => ({
        trial,
        company: trial.company,
        quote: trial.quote,
        days_remaining: trial.getDaysRemaining(),
        message: this._getReminderMessage(trial, reminderType)
      }));

    } catch (error) {
      console.error('❌ [TRIAL SERVICE] Error obteniendo trials para reminder:', error);
      throw error;
    }
  }

  /**
   * Envía reminders a trials próximos a vencer
   * @param {String} reminderType - Tipo de reminder
   * @returns {Promise<Object>} - Resumen de reminders enviados
   */
  async sendTrialReminders(reminderType = '7days') {
    const transaction = await sequelize.transaction();

    try {
      const trialsData = await this.getTrialsNeedingReminder(reminderType);

      const results = {
        sent: 0,
        failed: 0,
        trials: []
      };

      for (const { trial, company, message } of trialsData) {
        try {
          // TODO: Integrar con sistema de notificaciones (email, WhatsApp, etc.)
          console.log(`📧 [TRIAL REMINDER] ${reminderType} - ${company.name}:`, message);

          // Marcar reminder como enviado
          await trial.markReminderSent(reminderType, transaction);

          results.sent++;
          results.trials.push({
            trial_id: trial.id,
            company_name: company.name,
            module_name: trial.module_name,
            days_remaining: trial.getDaysRemaining()
          });

        } catch (error) {
          console.error(`❌ [TRIAL REMINDER] Error enviando reminder a empresa ${company.id}:`, error);
          results.failed++;
        }
      }

      await transaction.commit();

      console.log(`✅ [TRIAL REMINDERS] ${reminderType}: ${results.sent} enviados, ${results.failed} fallidos`);

      return {
        success: true,
        reminder_type: reminderType,
        ...results
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [TRIAL SERVICE] Error enviando reminders:', error);
      throw error;
    }
  }

  /**
   * Cliente acepta el módulo en trial (activación inmediata)
   * @param {Number} trialId - ID del trial
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Trial aceptado + quote activado + contrato creado
   */
  async acceptTrial(trialId, options = {}) {
    const transaction = await sequelize.transaction();

    try {
      const trial = await ModuleTrial.findByPk(trialId, {
        include: [
          { model: Company, as: 'company' },
          { model: Quote, as: 'quote' }
        ],
        transaction
      });

      if (!trial) {
        throw new Error(`Trial ${trialId} no encontrado`);
      }

      if (trial.status !== 'active') {
        throw new Error(`Trial ${trial.id} no está activo (status: ${trial.status})`);
      }

      // 1. Aceptar el trial
      await trial.accept(transaction);

      // 2. Activar el presupuesto asociado (si no está activo)
      const quote = trial.quote;
      if (quote && quote.status !== 'active') {
        const activationResult = await QuoteManagementService.activateQuote(quote.id);

        await transaction.commit();

        return {
          success: true,
          trial,
          quote: activationResult.quote,
          contract: activationResult.contract,
          message: `Módulo ${trial.module_name} aceptado. Presupuesto activado y contrato generado.`
        };
      }

      await transaction.commit();

      return {
        success: true,
        trial,
        quote,
        message: `Módulo ${trial.module_name} aceptado.`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [TRIAL SERVICE] Error aceptando trial:', error);
      throw error;
    }
  }

  /**
   * Cliente rechaza el módulo en trial
   * @param {Number} trialId - ID del trial
   * @param {String} reason - Motivo del rechazo
   * @returns {Promise<Object>} - Trial rechazado
   */
  async rejectTrial(trialId, reason = null) {
    const transaction = await sequelize.transaction();

    try {
      const trial = await ModuleTrial.findByPk(trialId, {
        include: [
          { model: Company, as: 'company' },
          { model: Quote, as: 'quote' }
        ],
        transaction
      });

      if (!trial) {
        throw new Error(`Trial ${trialId} no encontrado`);
      }

      if (trial.status !== 'active') {
        throw new Error(`Trial ${trial.id} no está activo (status: ${trial.status})`);
      }

      // 1. Rechazar el trial
      await trial.reject(reason, transaction);

      // 2. Si es el último trial del quote, rechazar todo el quote
      const quote = trial.quote;
      if (quote) {
        const allTrialsOfQuote = await ModuleTrial.findAll({
          where: { quote_id: quote.id },
          transaction
        });

        const allRejected = allTrialsOfQuote.every(t =>
          t.id === trial.id || t.status === 'rejected' || t.status === 'expired'
        );

        if (allRejected && quote.status === 'in_trial') {
          await QuoteManagementService.rejectQuote(quote.id,
            `Todos los trials fueron rechazados. ${reason || ''}`
          );
        }
      }

      await transaction.commit();

      return {
        success: true,
        trial,
        message: `Módulo ${trial.module_name} rechazado.`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [TRIAL SERVICE] Error rechazando trial:', error);
      throw error;
    }
  }

  /**
   * Procesa trials expirados sin decisión (auto-terminación)
   * @returns {Promise<Object>} - Resumen de trials procesados
   */
  async processExpiredTrials() {
    const transaction = await sequelize.transaction();

    try {
      const expiredTrials = await ModuleTrial.getExpiredTrialsWithoutDecision();

      const results = {
        expired: 0,
        activated: 0,
        quotes_rejected: 0,
        trials: []
      };

      for (const trial of expiredTrials) {
        try {
          console.log(`⏰ [TRIAL EXPIRED] Trial ${trial.id} - ${trial.module_name} (empresa ${trial.company_id})`);

          // Marcar trial como expirado
          trial.status = 'expired';
          await trial.save({ transaction });

          results.expired++;
          results.trials.push({
            trial_id: trial.id,
            company_id: trial.company_id,
            module_name: trial.module_name,
            end_date: trial.end_date
          });

          // Si hay quote asociado, rechazarlo si todos los trials expiraron
          if (trial.quote_id) {
            const quote = await Quote.findByPk(trial.quote_id, { transaction });

            if (quote && quote.status === 'in_trial') {
              const allTrialsOfQuote = await ModuleTrial.findAll({
                where: { quote_id: quote.id },
                transaction
              });

              const allExpiredOrRejected = allTrialsOfQuote.every(t =>
                t.status === 'expired' || t.status === 'rejected'
              );

              if (allExpiredOrRejected) {
                await QuoteManagementService.rejectQuote(quote.id,
                  'Trial expirado sin decisión del cliente'
                );
                results.quotes_rejected++;
              }
            }
          }

        } catch (error) {
          console.error(`❌ [TRIAL EXPIRED] Error procesando trial ${trial.id}:`, error);
        }
      }

      await transaction.commit();

      console.log(`✅ [TRIALS EXPIRED] ${results.expired} expirados, ${results.quotes_rejected} quotes rechazados`);

      return {
        success: true,
        ...results
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [TRIAL SERVICE] Error procesando trials expirados:', error);
      throw error;
    }
  }

  /**
   * Obtiene trials activos de una empresa
   * @param {Number} companyId - ID de la empresa
   * @returns {Promise<Array>} - Trials activos
   */
  async getActiveTrials(companyId) {
    try {
      const trials = await ModuleTrial.findAll({
        where: {
          company_id: companyId,
          status: 'active'
        },
        include: [
          { model: Quote, as: 'quote', include: [{ model: Partner, as: 'seller' }] }
        ],
        order: [['end_date', 'ASC']]
      });

      return trials.map(trial => ({
        ...trial.toJSON(),
        days_remaining: trial.getDaysRemaining(),
        is_active: trial.isActive(),
        proportional_billing: {
          first_billing_month: trial.first_billing_month,
          proportional_days: trial.proportional_days,
          proportional_percentage: trial.proportional_percentage,
          proportional_amount: trial.proportional_amount
        }
      }));

    } catch (error) {
      console.error('❌ [TRIAL SERVICE] Error obteniendo trials activos:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de trials
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Object>} - Estadísticas
   */
  async getStats(filters = {}) {
    try {
      const stats = await ModuleTrial.getStats(filters);

      return {
        success: true,
        stats
      };

    } catch (error) {
      console.error('❌ [TRIAL SERVICE] Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * HELPER PRIVADO: Genera mensaje de reminder según tipo
   * @private
   */
  _getReminderMessage(trial, reminderType) {
    const daysRemaining = trial.getDaysRemaining();
    const company = trial.company;
    const moduleName = trial.module_name;

    const messages = {
      '7days': `Hola ${company.name}! Tu período de prueba del módulo "${moduleName}" termina en ${daysRemaining} días. ¿Te está gustando? Si decides quedártelo, se activará automáticamente.`,

      '3days': `Recordatorio: El módulo "${moduleName}" termina su prueba en ${daysRemaining} días. Si no deseas continuar, puedes rechazarlo desde tu panel de control.`,

      '1day': `¡Último día! El módulo "${moduleName}" termina su prueba mañana. Si lo aceptas hoy, evitas que se desactive automáticamente.`,

      'final': `El período de prueba del módulo "${moduleName}" ha finalizado. El módulo será desactivado en las próximas 24 horas a menos que lo aceptes.`
    };

    return messages[reminderType] || `Reminder para trial ${trial.id}`;
  }

  /**
   * Acepta múltiples trials de una empresa (bulk operation)
   * @param {Number} companyId - ID de la empresa
   * @param {Array} trialIds - IDs de trials a aceptar
   * @returns {Promise<Object>} - Resultados de la operación
   */
  async bulkAcceptTrials(companyId, trialIds) {
    const transaction = await sequelize.transaction();

    try {
      const results = {
        accepted: 0,
        failed: 0,
        trials: []
      };

      for (const trialId of trialIds) {
        try {
          const trial = await ModuleTrial.findOne({
            where: {
              id: trialId,
              company_id: companyId,
              status: 'active'
            },
            transaction
          });

          if (trial) {
            await trial.accept(transaction);
            results.accepted++;
            results.trials.push({
              trial_id: trial.id,
              module_name: trial.module_name,
              status: 'accepted'
            });
          } else {
            results.failed++;
          }

        } catch (error) {
          console.error(`❌ [BULK ACCEPT] Error aceptando trial ${trialId}:`, error);
          results.failed++;
        }
      }

      // Si se aceptaron todos los trials de un quote, activar el quote
      const acceptedTrials = await ModuleTrial.findAll({
        where: {
          id: trialIds,
          company_id: companyId
        },
        include: [{ model: Quote, as: 'quote' }],
        transaction
      });

      const quotesToActivate = new Set();
      for (const trial of acceptedTrials) {
        if (trial.quote_id) {
          quotesToActivate.add(trial.quote_id);
        }
      }

      for (const quoteId of quotesToActivate) {
        const allTrialsOfQuote = await ModuleTrial.findAll({
          where: { quote_id: quoteId },
          transaction
        });

        const allAccepted = allTrialsOfQuote.every(t =>
          t.status === 'accepted' || t.status === 'completed'
        );

        if (allAccepted) {
          await QuoteManagementService.activateQuote(quoteId);
        }
      }

      await transaction.commit();

      return {
        success: true,
        ...results,
        message: `${results.accepted} módulos aceptados, ${results.failed} fallidos`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [TRIAL SERVICE] Error en bulk accept:', error);
      throw error;
    }
  }
}

module.exports = new ModuleTrialService();
