/**
 * SERVICIO: QuoteManagementService
 *
 * Gestión completa de presupuestos (quotes):
 * - Creación de presupuestos (nuevos, upgrade, downgrade)
 * - Validación de lógica de negocio
 * - Detección automática de cambios de módulos
 * - Gestión de trials (30 días con 100% bonificación)
 * - Superseding de presupuestos anteriores
 * - Generación de contratos desde presupuestos aceptados
 */

const { Quote, ModuleTrial, Contract, Company, Partner } = require('../config/database');
const { sequelize } = require('../config/database');

class QuoteManagementService {
  /**
   * Crea un nuevo presupuesto
   * @param {Object} data - Datos del presupuesto
   * @returns {Promise<Object>} - Presupuesto creado con trials si aplica
   */
  async createQuote(data) {
    const transaction = await sequelize.transaction();

    try {
      const {
        company_id,
        seller_id,
        modules_data, // Array de módulos: [{module_key, module_name, price, quantity}]
        notes,
        terms_and_conditions,
        created_by
      } = data;

      // 1. Validar que la empresa existe
      const company = await Company.findByPk(company_id, { transaction });
      if (!company) {
        throw new Error(`Empresa con ID ${company_id} no encontrada`);
      }

      // 2. Validar que el vendedor existe
      const seller = await Partner.findByPk(seller_id, { transaction });
      if (!seller) {
        throw new Error(`Vendedor con ID ${seller_id} no encontrado`);
      }

      // 3. Obtener presupuesto activo actual (si existe)
      const currentActiveQuote = await Quote.findOne({
        where: {
          company_id,
          status: 'active'
        },
        transaction
      });

      // 4. Detectar tipo de cambio (nuevo/upgrade/downgrade/modification)
      let changeType = 'new';
      let addedModules = [];
      let removedModules = [];
      let trialModules = [];

      if (currentActiveQuote) {
        const currentModules = currentActiveQuote.modules_data || [];
        const newModules = modules_data || [];

        const currentKeys = currentModules.map(m => m.module_key);
        const newKeys = newModules.map(m => m.module_key);

        // Módulos agregados (nuevos)
        addedModules = newKeys.filter(key => !currentKeys.includes(key));

        // Módulos removidos
        removedModules = currentKeys.filter(key => !newKeys.includes(key));

        // Determinar tipo de cambio
        if (addedModules.length > 0 && removedModules.length === 0) {
          changeType = 'upgrade';
          trialModules = addedModules; // Solo módulos nuevos tienen trial
        } else if (removedModules.length > 0 && addedModules.length === 0) {
          changeType = 'downgrade';
          trialModules = []; // Downgrades NO tienen trial
        } else if (addedModules.length > 0 && removedModules.length > 0) {
          changeType = 'modification';
          trialModules = addedModules; // Solo módulos nuevos tienen trial
        } else {
          changeType = 'modification'; // Cambios en cantidad/precio
          trialModules = [];
        }
      }

      // 5. Calcular total del presupuesto
      const total_amount = modules_data.reduce((sum, module) => {
        const subtotal = parseFloat(module.price || 0) * parseInt(module.quantity || 1);
        return sum + subtotal;
      }, 0);

      // 6. Crear el presupuesto
      const quote = await Quote.create({
        company_id,
        seller_id,
        modules_data,
        total_amount,
        notes,
        terms_and_conditions,
        created_by,
        previous_quote_id: currentActiveQuote ? currentActiveQuote.id : null,
        replaces_quote_id: null, // Se establecerá al aceptar
        is_upgrade: changeType === 'upgrade',
        is_downgrade: changeType === 'downgrade',
        is_modification: changeType === 'modification',
        added_modules: addedModules.length > 0 ? JSON.stringify(addedModules) : null,
        removed_modules: removedModules.length > 0 ? JSON.stringify(removedModules) : null,
        has_trial: trialModules.length > 0,
        trial_modules: trialModules.length > 0 ? JSON.stringify(trialModules) : null,
        status: 'draft'
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        quote,
        change_type: changeType,
        has_trial: trialModules.length > 0,
        trial_modules: trialModules,
        message: `Presupuesto ${quote.quote_number} creado exitosamente (${changeType})`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [QUOTE SERVICE] Error creando presupuesto:', error);
      throw error;
    }
  }

  /**
   * Envía un presupuesto al cliente
   * @param {Number} quoteId - ID del presupuesto
   * @param {Number} userId - ID del usuario que envía
   * @returns {Promise<Object>} - Presupuesto actualizado
   */
  async sendQuote(quoteId, userId = null) {
    const transaction = await sequelize.transaction();

    try {
      const quote = await Quote.findByPk(quoteId, { transaction });

      if (!quote) {
        throw new Error(`Presupuesto ${quoteId} no encontrado`);
      }

      if (quote.status !== 'draft') {
        throw new Error(`Presupuesto ${quote.quote_number} ya fue enviado (status: ${quote.status})`);
      }

      await quote.markAsSent();
      if (userId) {
        quote.updated_by = userId;
        await quote.save({ transaction });
      }

      await transaction.commit();

      return {
        success: true,
        quote,
        message: `Presupuesto ${quote.quote_number} enviado exitosamente`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [QUOTE SERVICE] Error enviando presupuesto:', error);
      throw error;
    }
  }

  /**
   * Cliente acepta el presupuesto (inicia trial si aplica)
   * @param {Number} quoteId - ID del presupuesto
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Presupuesto aceptado + trials creados
   */
  async acceptQuote(quoteId, options = {}) {
    const transaction = await sequelize.transaction();

    try {
      const quote = await Quote.findByPk(quoteId, {
        include: [
          { model: Company, as: 'company' },
          { model: Partner, as: 'seller' }
        ],
        transaction
      });

      if (!quote) {
        throw new Error(`Presupuesto ${quoteId} no encontrado`);
      }

      if (quote.status !== 'sent' && quote.status !== 'draft') {
        throw new Error(`Presupuesto ${quote.quote_number} no puede ser aceptado (status: ${quote.status})`);
      }

      // 1. Aceptar el presupuesto (cambia a 'in_trial' o 'accepted' según has_trial)
      await quote.accept({ transaction });

      // 2. Si tiene trial, crear registros de ModuleTrial
      const createdTrials = [];
      if (quote.has_trial && quote.trial_modules) {
        const trialModuleKeys = JSON.parse(quote.trial_modules);
        const modulesData = quote.modules_data || [];

        for (const moduleKey of trialModuleKeys) {
          const moduleInfo = modulesData.find(m => m.module_key === moduleKey);

          if (moduleInfo) {
            const trial = await ModuleTrial.create({
              company_id: quote.company_id,
              quote_id: quote.id,
              module_key: moduleInfo.module_key,
              module_name: moduleInfo.module_name,
              module_price: moduleInfo.price,
              start_date: quote.trial_start_date,
              end_date: quote.trial_end_date,
              days_duration: 30
            }, { transaction });

            createdTrials.push(trial);
          }
        }
      }

      // 3. Si NO tiene trial, activar inmediatamente
      if (!quote.has_trial) {
        // Superseder presupuesto anterior si existe
        if (quote.previous_quote_id) {
          const oldQuote = await Quote.findByPk(quote.previous_quote_id, { transaction });
          if (oldQuote && oldQuote.status === 'active') {
            oldQuote.status = 'superseded';
            oldQuote.replaced_by_quote_id = quote.id;
            await oldQuote.save({ transaction });
          }
        }

        quote.status = 'active';
        quote.replaces_quote_id = quote.previous_quote_id;
        await quote.save({ transaction });

        // Crear contrato inmediatamente
        await this._createContractFromQuote(quote, transaction);
      }

      await transaction.commit();

      return {
        success: true,
        quote,
        trials: createdTrials,
        message: quote.has_trial
          ? `Presupuesto aceptado. Trial de 30 días iniciado para ${createdTrials.length} módulos.`
          : `Presupuesto aceptado y activado. Contrato generado.`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [QUOTE SERVICE] Error aceptando presupuesto:', error);
      throw error;
    }
  }

  /**
   * Cliente rechaza el presupuesto
   * @param {Number} quoteId - ID del presupuesto
   * @param {String} reason - Motivo del rechazo
   * @returns {Promise<Object>} - Presupuesto rechazado
   */
  async rejectQuote(quoteId, reason = null) {
    const transaction = await sequelize.transaction();

    try {
      const quote = await Quote.findByPk(quoteId, { transaction });

      if (!quote) {
        throw new Error(`Presupuesto ${quoteId} no encontrado`);
      }

      await quote.reject(reason);

      await transaction.commit();

      return {
        success: true,
        quote,
        message: `Presupuesto ${quote.quote_number} rechazado`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [QUOTE SERVICE] Error rechazando presupuesto:', error);
      throw error;
    }
  }

  /**
   * Activa un presupuesto (después de que termine el trial exitosamente)
   * @param {Number} quoteId - ID del presupuesto
   * @returns {Promise<Object>} - Presupuesto activado + contrato creado
   */
  async activateQuote(quoteId) {
    const transaction = await sequelize.transaction();

    try {
      const quote = await Quote.findByPk(quoteId, { transaction });

      if (!quote) {
        throw new Error(`Presupuesto ${quoteId} no encontrado`);
      }

      if (quote.status !== 'accepted' && quote.status !== 'in_trial') {
        throw new Error(`Presupuesto ${quote.quote_number} no puede ser activado (status: ${quote.status})`);
      }

      // Activar presupuesto (supersede el anterior si existe)
      await quote.activate(transaction);

      // Crear contrato
      const contract = await this._createContractFromQuote(quote, transaction);

      await transaction.commit();

      return {
        success: true,
        quote,
        contract,
        message: `Presupuesto ${quote.quote_number} activado. Contrato ${contract.contract_number} generado.`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [QUOTE SERVICE] Error activando presupuesto:', error);
      throw error;
    }
  }

  /**
   * Obtiene presupuestos de una empresa
   * @param {Number} companyId - ID de la empresa
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} - Lista de presupuestos
   */
  async getCompanyQuotes(companyId, filters = {}) {
    try {
      const where = { company_id: companyId };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.seller_id) {
        where.seller_id = filters.seller_id;
      }

      const quotes = await Quote.findAll({
        where,
        include: [
          { model: Partner, as: 'seller', attributes: ['id', 'name', 'email'] },
          { model: ModuleTrial, as: 'moduleTrials' }
        ],
        order: [['created_at', 'DESC']]
      });

      return quotes;

    } catch (error) {
      console.error('❌ [QUOTE SERVICE] Error obteniendo presupuestos:', error);
      throw error;
    }
  }

  /**
   * Obtiene presupuesto activo de una empresa
   * @param {Number} companyId - ID de la empresa
   * @returns {Promise<Object|null>} - Presupuesto activo o null
   */
  async getActiveQuote(companyId) {
    try {
      const quote = await Quote.findOne({
        where: {
          company_id: companyId,
          status: 'active'
        },
        include: [
          { model: Partner, as: 'seller', attributes: ['id', 'name', 'email'] },
          { model: Contract, as: 'contract' }
        ]
      });

      return quote;

    } catch (error) {
      console.error('❌ [QUOTE SERVICE] Error obteniendo presupuesto activo:', error);
      throw error;
    }
  }

  /**
   * HELPER PRIVADO: Crea un contrato desde un presupuesto aceptado
   * @private
   */
  async _createContractFromQuote(quote, transaction) {
    const contract = await Contract.create({
      company_id: quote.company_id,
      quote_id: quote.id,
      seller_id: quote.seller_id,
      modules_data: quote.modules_data,
      monthly_total: quote.total_amount,
      start_date: new Date(),
      status: 'active',
      billing_cycle: 'monthly',
      payment_day: 10,
      payment_terms_days: 10,
      late_payment_surcharge_percentage: 10.00,
      suspension_days_threshold: 20,
      termination_days_threshold: 30,
      terms_and_conditions: quote.terms_and_conditions
    }, { transaction });

    return contract;
  }

  /**
   * Obtiene estadísticas de presupuestos por vendedor
   * @param {Number} sellerId - ID del vendedor
   * @param {Object} dateRange - Rango de fechas
   * @returns {Promise<Object>} - Estadísticas
   */
  async getSellerStats(sellerId, dateRange = {}) {
    try {
      const stats = await Quote.getSellerStats(sellerId, dateRange);
      return stats;

    } catch (error) {
      console.error('❌ [QUOTE SERVICE] Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

module.exports = new QuoteManagementService();
