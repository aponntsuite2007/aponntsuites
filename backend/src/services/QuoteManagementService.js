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

const { Quote, ModuleTrial, Contract, Company, Partner, Invoice, Branch } = require('../config/database');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const NCE = require('./NotificationCentralExchange');

/**
 * Envía notificación NCE al vendedor asignado de un presupuesto
 */
async function notifySellerAboutQuote(quote, event, extraMeta = {}) {
  try {
    const seller = await Partner.findByPk(quote.seller_id);
    if (!seller) return;

    const sellerName = `${seller.first_name || ''} ${seller.last_name || ''}`.trim();
    const amount = parseFloat(quote.total_amount || 0).toLocaleString('es-AR');
    const qn = quote.quote_number || `#${quote.id}`;

    const templates = {
      sent: {
        title: `📧 Presupuesto ${qn} enviado`,
        message: `El presupuesto ${qn} por $${amount}/mes fue enviado al cliente.`,
        priority: 'normal'
      },
      accepted: {
        title: `✅ Presupuesto ${qn} aceptado`,
        message: `¡El cliente aceptó el presupuesto ${qn} por $${amount}/mes!${quote.has_trial ? ' Trial de 30 días iniciado.' : ' Contrato generado.'}`,
        priority: 'high'
      },
      rejected: {
        title: `❌ Presupuesto ${qn} rechazado`,
        message: `El cliente rechazó el presupuesto ${qn}.${extraMeta.reason ? ' Motivo: ' + extraMeta.reason : ''}`,
        priority: 'high'
      },
      reverted: {
        title: `↩️ Presupuesto ${qn} revertido a enviado`,
        message: `El presupuesto ${qn} fue revertido a estado "enviado".${extraMeta.reason ? ' Motivo: ' + extraMeta.reason : ''}`,
        priority: 'normal'
      },
      activated: {
        title: `🚀 Presupuesto ${qn} activado`,
        message: `El presupuesto ${qn} por $${amount}/mes fue activado. Contrato generado.`,
        priority: 'high'
      }
    };

    const tmpl = templates[event];
    if (!tmpl) return;

    // Buscar user_id del seller por email en aponnt_staff
    let recipientId = null;
    try {
      const [staffRow] = await sequelize.query(
        `SELECT user_id FROM aponnt_staff WHERE email = :email LIMIT 1`,
        { replacements: { email: seller.email }, type: QueryTypes.SELECT }
      );
      recipientId = staffRow?.user_id;
    } catch (e) { /* no staff match, use email only */ }

    await NCE.send({
      companyId: null,
      module: 'quotes',
      workflowKey: `quotes.${event}`,
      originType: 'quote',
      originId: String(quote.id),
      recipientType: recipientId ? 'user' : 'external',
      recipientId: recipientId || seller.email,
      recipientEmail: seller.email,
      title: tmpl.title,
      message: tmpl.message,
      priority: tmpl.priority,
      requiresAction: event === 'accepted',
      actionType: event === 'accepted' ? 'acknowledgement' : undefined,
      channels: ['inbox', 'email'],
      metadata: {
        quote_id: quote.id,
        quote_number: qn,
        company_id: quote.company_id,
        company_name: quote.company?.name || extraMeta.company_name || '',
        seller_name: sellerName,
        total_amount: quote.total_amount,
        event,
        ...extraMeta
      }
    });

    console.log(`📨 [QUOTE NCE] Notificación "${event}" enviada a ${sellerName} (${seller.email})`);
  } catch (err) {
    console.warn(`⚠️ [QUOTE NCE] Error enviando notificación "${event}":`, err.message);
  }
}

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

      // Permitir reenvío si ya fue enviado
      if (!['draft', 'sent'].includes(quote.status)) {
        throw new Error(`Presupuesto ${quote.quote_number} no puede enviarse (status: ${quote.status})`);
      }

      if (quote.status === 'draft') {
        await quote.markAsSent();
      } else {
        // Reenvío: actualizar sent_date
        quote.sent_date = new Date();
      }
      if (userId) {
        quote.updated_by = userId;
        await quote.save({ transaction });
      }

      await transaction.commit();

      // Notificar al vendedor
      notifySellerAboutQuote(quote, 'sent').catch(() => {});

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

      // ═══════════════════════════════════════════════════════════
      // VALIDAR/ASIGNAR seller_id (OBLIGATORIO para crear contrato)
      // ═══════════════════════════════════════════════════════════
      if (!quote.seller_id) {
        // Si viene seller_id en options, usarlo
        if (options.seller_id) {
          const seller = await Partner.findByPk(options.seller_id, { transaction });
          if (!seller) {
            throw new Error(`Vendedor con ID ${options.seller_id} no encontrado`);
          }
          quote.seller_id = options.seller_id;
          await quote.save({ transaction });
          console.log(`📝 [QUOTE SERVICE] Asignado seller_id ${options.seller_id} al quote ${quote.id}`);
        } else {
          // Intentar buscar un partner por defecto (el primero activo)
          const defaultSeller = await Partner.findOne({
            where: { is_active: true },
            order: [['id', 'ASC']],
            transaction
          });

          if (defaultSeller) {
            quote.seller_id = defaultSeller.id;
            await quote.save({ transaction });
            console.log(`📝 [QUOTE SERVICE] Asignado seller_id por defecto ${defaultSeller.id} al quote ${quote.id}`);
          } else {
            throw new Error(`El presupuesto ${quote.quote_number} no tiene vendedor asignado (seller_id) y no hay vendedores activos en el sistema. Cree un partner/vendedor primero.`);
          }
        }
      }

      // 1. Aceptar el presupuesto (cambia a 'in_trial' o 'accepted' según has_trial)
      await quote.accept({ transaction });

      // 2. Si tiene trial, crear registros de ModuleTrial
      const createdTrials = [];
      if (quote.has_trial && quote.trial_modules) {
        const trialModuleKeys = typeof quote.trial_modules === 'string' ? JSON.parse(quote.trial_modules) : quote.trial_modules;
        const modulesData = quote.modules_data || [];

        for (const moduleKey of trialModuleKeys) {
          const moduleInfo = modulesData.find(m => m.module_key === moduleKey);

          if (moduleInfo) {
            const trialStart = quote.trial_start_date || new Date();
            const trialEnd = quote.trial_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            // El hook beforeCreate del modelo calcula automáticamente:
            // first_billing_month, proportional_days, total_days_month,
            // proportional_percentage, proportional_amount, full_month_amount
            const trial = await ModuleTrial.create({
              company_id: quote.company_id,
              quote_id: quote.id,
              module_key: moduleInfo.module_key,
              module_name: moduleInfo.module_name,
              module_price: parseFloat(moduleInfo.price || 0),
              start_date: trialStart,
              end_date: trialEnd,
              days_duration: 30
            }, { transaction });

            createdTrials.push(trial);
          }
        }
      }

      // 3. CREAR CONTRATO SIEMPRE (trial o no trial)
      // El contrato es un deslinde de responsabilidades y especifica los montos.
      // Durante el trial, los módulos están bonificados pero el contrato ya existe.
      await this._createContractFromQuote(quote, transaction);
      console.log(`📄 [QUOTE SERVICE] Contrato creado para quote ${quote.quote_number} (has_trial: ${quote.has_trial})`);

      // 4. Si NO tiene trial, activar inmediatamente
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
      }

      // Aplicar datos de onboarding si vienen del formulario público
      if (options.onboardingData) {
        await this._applyOnboardingData(quote, options.onboardingData, transaction);
      }

      await transaction.commit();

      // Si se activó directamente (sin trial), disparar onboarding
      if (!quote.has_trial) {
        try {
          await require('./OnboardingService').initiateFromQuote(quote);
        } catch (onboardingErr) {
          console.warn(`⚠️ [QUOTE SERVICE] Onboarding post-aceptación falló (no bloqueante): ${onboardingErr.message}`);
        }
      }

      // Notificar al vendedor
      notifySellerAboutQuote(quote, 'accepted').catch(() => {});

      return {
        success: true,
        quote,
        trials: createdTrials,
        message: quote.has_trial
          ? `Presupuesto aceptado. Contrato generado. Trial de ${quote.trial_days || 30} días iniciado para ${createdTrials.length} módulo(s) con ${quote.trial_bonification_percentage || 100}% de bonificación.`
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

      // Notificar al vendedor
      notifySellerAboutQuote(quote, 'rejected', { reason }).catch(() => {});

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

      // Disparar onboarding fases 2-6 (async, no bloquea)
      try {
        await require('./OnboardingService').initiateFromQuote(quote);
      } catch (onboardingErr) {
        console.warn(`⚠️ [QUOTE SERVICE] Onboarding post-activacion fallo (no bloqueante): ${onboardingErr.message}`);
      }

      // Notificar al vendedor
      notifySellerAboutQuote(quote, 'activated').catch(() => {});

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
    // ═══════════════════════════════════════════════════════════
    // VALIDAR seller_id OBLIGATORIO
    // ═══════════════════════════════════════════════════════════
    if (!quote.seller_id) {
      console.error(`❌ [QUOTE SERVICE] Quote ${quote.id} no tiene seller_id asignado`);
      throw new Error(`El presupuesto ${quote.quote_number || quote.id} no tiene un vendedor asignado (seller_id). Asigne un vendedor antes de activar.`);
    }

    // ═══════════════════════════════════════════════════════════
    // GENERAR contract_number MANUALMENTE
    // (El hook beforeCreate no funciona porque la validación de Sequelize es primero)
    // ═══════════════════════════════════════════════════════════
    const year = new Date().getFullYear();
    const lastContract = await Contract.findOne({
      where: sequelize.where(
        sequelize.fn('EXTRACT', sequelize.literal('YEAR FROM created_at')),
        year
      ),
      order: [['id', 'DESC']],
      transaction
    });

    let nextNumber = 1;
    if (lastContract && lastContract.contract_number) {
      const match = lastContract.contract_number.match(/CONT-\d{4}-(\d{4})/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const contractNumber = `CONT-${year}-${String(nextNumber).padStart(4, '0')}`;

    console.log(`📄 [QUOTE SERVICE] Generando contrato ${contractNumber} desde quote ${quote.quote_number}`);

    // ═══════════════════════════════════════════════════════════
    // CREAR CONTRATO
    // ═══════════════════════════════════════════════════════════
    const contract = await Contract.create({
      contract_number: contractNumber,
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
   * Revierte un presupuesto a estado "sent" (para reenvío)
   * Solo permitido si NO hay contrato activo/firmado asociado
   * @param {Number} quoteId - ID del presupuesto
   * @param {Number} userId - ID del usuario que revierte
   * @param {String} reason - Razón de la reversión
   */
  async revertToSent(quoteId, userId, reason) {
    const transaction = await sequelize.transaction();

    try {
      const quote = await Quote.findByPk(quoteId, { transaction });

      if (!quote) {
        throw new Error(`Presupuesto ${quoteId} no encontrado`);
      }

      // Validar status permitidos para revertir
      if (!['in_trial', 'accepted', 'rejected'].includes(quote.status)) {
        throw new Error(`No se puede revertir un presupuesto con estado "${quote.status}". Solo in_trial, accepted o rejected.`);
      }

      // Verificar que NO haya contrato activo/firmado
      const activeContract = await Contract.findOne({
        where: {
          quote_id: quoteId,
          status: ['active', 'signed']
        },
        transaction
      });

      if (activeContract) {
        throw new Error(`No se puede revertir: existe un contrato ${activeContract.status} (ID: ${activeContract.id}) asociado a este presupuesto.`);
      }

      // Eliminar module_trials asociados
      const deletedTrials = await ModuleTrial.destroy({
        where: { quote_id: quoteId },
        transaction
      });

      // Limpiar campos de trial en el quote
      quote.trial_start_date = null;
      quote.trial_end_date = null;
      quote.accepted_date = null;
      quote.rejected_date = null;

      // Cambiar status con audit trail
      await quote.changeStatus('sent', userId, reason || 'Revertido a enviado por gerente/admin', { transaction });

      // Re-establecer validez (30 días desde ahora)
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 30);
      quote.expiration_date = expiration;
      quote.valid_until = expiration;
      quote.sent_date = new Date();
      await quote.save({ transaction });

      await transaction.commit();

      // Notificar al vendedor
      notifySellerAboutQuote(quote, 'reverted', { reason }).catch(() => {});

      return {
        success: true,
        quote,
        deleted_trials: deletedTrials,
        message: `Presupuesto ${quote.quote_number} revertido a "enviado". ${deletedTrials} trials eliminados.`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [QUOTE SERVICE] Error revirtiendo presupuesto:', error);
      throw error;
    }
  }

  /**
   * Genera una factura inicial desde un quote activo
   * @param {Number} quoteId - ID del presupuesto
   * @param {Number} userId - ID del usuario que genera
   * @returns {Promise<Object>} - Factura creada
   */
  async generateInvoiceFromQuote(quoteId, userId = null) {
    const transaction = await sequelize.transaction();

    try {
      const quote = await Quote.findByPk(quoteId, { transaction });

      if (!quote) {
        throw new Error(`Presupuesto ${quoteId} no encontrado`);
      }

      if (quote.status !== 'active') {
        throw new Error(`Solo se puede generar factura de presupuestos activos (status actual: ${quote.status})`);
      }

      // Check if invoice already exists for this quote
      if (quote.invoice_id) {
        const existing = await Invoice.findByPk(quote.invoice_id, { transaction });
        if (existing) {
          await transaction.commit();
          return {
            success: true,
            already_existed: true,
            invoice_id: existing.id,
            invoice_number: existing.invoice_number,
            message: `Ya existe factura ${existing.invoice_number} para este presupuesto`
          };
        }
      }

      // Generate invoice number
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const lastInvoice = await sequelize.query(
        `SELECT invoice_number FROM invoices WHERE invoice_number LIKE :prefix ORDER BY id DESC LIMIT 1`,
        { replacements: { prefix: `FAC-${year}-%` }, type: QueryTypes.SELECT, transaction }
      );

      let nextNum = 1;
      if (lastInvoice.length > 0) {
        const match = lastInvoice[0].invoice_number.match(/FAC-\d{4}-(\d{5})/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }

      const invoiceNumber = `FAC-${year}-${String(nextNum).padStart(5, '0')}`;

      // Create invoice
      const invoice = await Invoice.create({
        company_id: quote.company_id,
        invoice_number: invoiceNumber,
        billing_period_month: month,
        billing_period_year: year,
        subtotal: quote.total_amount,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: quote.total_amount,
        currency: 'USD',
        status: 'draft',
        issue_date: now,
        due_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // +10 days
        notes: `Factura inicial generada desde presupuesto ${quote.quote_number}`,
        internal_notes: `quote_id:${quote.id}`,
        created_by: null
      }, { transaction });

      // Create invoice items from modules_data
      const modules = quote.modules_data || [];
      for (const mod of modules) {
        const qty = parseInt(mod.quantity || 1);
        const price = parseFloat(mod.price || 0);
        await sequelize.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, subtotal, item_type, metadata, created_at)
           VALUES (:invoice_id, :description, :quantity, :unit_price, :subtotal, :item_type, :metadata, NOW())`,
          {
            replacements: {
              invoice_id: invoice.id,
              description: mod.module_name || mod.module_key,
              quantity: qty,
              unit_price: price,
              subtotal: price * qty,
              item_type: 'module',
              metadata: JSON.stringify({ module_key: mod.module_key })
            },
            transaction
          }
        );
      }

      // Link quote to invoice
      quote.invoice_id = invoice.id;
      await quote.save({ transaction });

      await transaction.commit();

      return {
        success: true,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: parseFloat(invoice.total_amount),
        message: `Factura ${invoiceNumber} generada desde presupuesto ${quote.quote_number}`
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [QUOTE SERVICE] Error generando factura:', error);
      throw error;
    }
  }

  /**
   * Confirma pago para un quote, delegando a PaymentService
   * @param {Number} quoteId - ID del presupuesto
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} - Resultado del pago
   */
  async confirmPaymentForQuote(quoteId, paymentData) {
    const quote = await Quote.findByPk(quoteId);

    if (!quote) {
      throw new Error(`Presupuesto ${quoteId} no encontrado`);
    }

    if (!quote.invoice_id) {
      throw new Error('Este presupuesto no tiene factura generada. Genere la factura primero.');
    }

    const invoice = await Invoice.findByPk(quote.invoice_id);
    if (!invoice) {
      throw new Error(`Factura ID ${quote.invoice_id} no encontrada`);
    }

    if (invoice.status === 'paid') {
      return {
        success: true,
        already_paid: true,
        message: `La factura ${invoice.invoice_number} ya está pagada`
      };
    }

    const PaymentService = require('./PaymentService');
    const result = await PaymentService.registerPayment({
      invoice_id: invoice.id,
      company_id: quote.company_id,
      amount: parseFloat(paymentData.amount || invoice.total_amount),
      currency: paymentData.currency || 'USD',
      payment_method: paymentData.payment_method || 'transfer',
      payment_reference: paymentData.payment_reference || '',
      payment_date: paymentData.payment_date || new Date().toISOString(),
      notes: paymentData.notes || `Pago desde circuito Quote ${quote.quote_number}`,
      registered_by: paymentData.registered_by || '00000000-0000-0000-0000-000000000000',
      receipt_file_path: paymentData.receipt_file_path || null,
      receipt_file_name: paymentData.receipt_file_name || null
    });

    return result;
  }

  /**
   * Obtiene la factura asociada a un quote
   * @param {Number} quoteId - ID del presupuesto
   * @returns {Promise<Object|null>} - Factura o null
   */
  async getQuoteInvoice(quoteId) {
    const quote = await Quote.findByPk(quoteId);
    if (!quote || !quote.invoice_id) return null;

    const invoice = await Invoice.findByPk(quote.invoice_id);
    return invoice;
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
  /**
   * Aplica datos de onboarding (ficha de alta) a la empresa del presupuesto
   * @param {Object} quote - Presupuesto con company cargada
   * @param {Object} onboardingData - { company, admin, branches }
   * @param {Object} transaction - Transacción Sequelize
   */
  async _applyOnboardingData(quote, onboardingData, transaction) {
    const { company: companyData, admin: adminData, branches: branchesData } = onboardingData;

    if (!quote.company_id) return;

    // 1. Actualizar datos de la empresa
    if (companyData) {
      const updateFields = {};
      const fieldMap = {
        legal_name: 'legal_name',
        tax_id: 'tax_id',
        industry: 'industry',
        address: 'address',
        city: 'city',
        state_province: 'state_province',
        country: 'country',
        postal_code: 'postal_code',
        phone: 'phone',
        billing_email: 'billing_email'
      };

      for (const [key, col] of Object.entries(fieldMap)) {
        if (companyData[key] !== undefined && companyData[key] !== '') {
          updateFields[col] = companyData[key];
        }
      }

      if (Object.keys(updateFields).length > 0) {
        await Company.update(updateFields, {
          where: { company_id: quote.company_id },
          transaction
        });
        console.log(`🏢 [QUOTE SERVICE] Empresa ${quote.company_id} actualizada con datos de onboarding`);
      }
    }

    // 2. Crear sucursales
    if (branchesData && Array.isArray(branchesData) && branchesData.length > 0) {
      // Eliminar branches existentes (los auto-creados por OnboardingService)
      await Branch.destroy({
        where: { company_id: quote.company_id },
        transaction
      });

      for (let i = 0; i < branchesData.length; i++) {
        const b = branchesData[i];
        await Branch.create({
          name: b.name || `Sucursal ${i + 1}`,
          code: `${(b.name || 'SUC-' + (i + 1)).toUpperCase().replace(/\s+/g, '-')}-${quote.company_id}`,
          company_id: quote.company_id,
          is_main: i === 0 || b.is_main === true,
          isActive: false, // Inactiva hasta activación
          address: b.address || '',
          city: b.city || '',
          country: b.country || '',
          timezone: b.timezone || 'America/Argentina/Buenos_Aires'
        }, { transaction });
      }

      // Setear multi_branch_enabled si hay más de 1 sucursal
      if (branchesData.length > 1) {
        await Company.update(
          { multi_branch_enabled: true },
          { where: { company_id: quote.company_id }, transaction }
        );
      }

      console.log(`🏢 [QUOTE SERVICE] ${branchesData.length} sucursal(es) creada(s) para empresa ${quote.company_id}`);
    }

    // 3. Guardar datos del admin en metadata de la empresa
    if (adminData) {
      const company = await Company.findByPk(quote.company_id, { transaction });
      if (company) {
        const metadata = company.metadata || {};
        metadata.onboarding_admin = {
          full_name: adminData.full_name,
          email: adminData.email,
          phone: adminData.phone,
          submitted_at: new Date().toISOString()
        };
        await Company.update(
          { metadata },
          { where: { company_id: quote.company_id }, transaction }
        );
      }
    }
  }
}

module.exports = new QuoteManagementService();
