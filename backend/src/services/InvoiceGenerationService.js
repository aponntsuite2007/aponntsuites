/**
 * SERVICE: InvoiceGenerationService
 *
 * Servicio para generación automática mensual de facturas.
 * Ejecutado por CRON job el día 1 de cada mes.
 *
 * FLUJO:
 * 1. Buscar todas las empresas activas
 * 2. Por cada empresa, calcular módulos activos
 * 3. Obtener pricing de cada módulo
 * 4. Generar factura con invoice_items
 * 5. Enviar notificación al manager
 * 6. Enviar email a empresa con factura adjunta
 */

const { sequelize } = require('../config/database');
const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const ModuleTrial = require('../models/ModuleTrial');

class InvoiceGenerationService {
  /**
   * Genera facturas para todas las empresas activas
   * @param {number} year - Año de facturación
   * @param {number} month - Mes de facturación (1-12)
   * @returns {Promise<Object>} Resultado de generación
   */
  async generateMonthlyInvoices(year, month) {
    const transaction = await sequelize.transaction();

    try {
      console.log(`\n📄 [INVOICE GEN] Generando facturas para ${year}-${month}`);

      // 1. Obtener todas las empresas activas
      const companies = await sequelize.query(
        `SELECT * FROM companies WHERE status = 'active' AND is_trial = false ORDER BY company_id`,
        {
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log(`   📊 ${companies.length} empresas activas encontradas`);

      const results = {
        success: true,
        year,
        month,
        total_companies: companies.length,
        invoices_created: 0,
        errors: [],
        invoices: []
      };

      // 2. Por cada empresa, generar factura
      for (const company of companies) {
        try {
          const invoice = await this.generateInvoiceForCompany(company, year, month, transaction);

          if (invoice) {
            results.invoices_created++;
            results.invoices.push({
              invoice_id: invoice.id,
              invoice_number: invoice.invoice_number,
              company_id: company.company_id,
              company_name: company.name,
              total_amount: invoice.total_amount
            });
            console.log(`   ✅ Factura generada para ${company.name}: ${invoice.invoice_number}`);
          }
        } catch (error) {
          console.error(`   ❌ Error generando factura para ${company.name}:`, error.message);
          results.errors.push({
            company_id: company.company_id,
            company_name: company.name,
            error: error.message
          });
        }
      }

      await transaction.commit();

      console.log(`\n✅ [INVOICE GEN] Proceso completado:`);
      console.log(`   📄 Facturas creadas: ${results.invoices_created}`);
      console.log(`   ❌ Errores: ${results.errors.length}`);

      return results;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [INVOICE GEN] Error en generación masiva:', error);
      throw error;
    }
  }

  /**
   * Genera factura para una empresa específica
   * @param {Object} company - Datos de la empresa
   * @param {number} year - Año
   * @param {number} month - Mes
   * @param {Object} transaction - Transacción de Sequelize
   * @returns {Promise<Object>} Factura creada
   */
  async generateInvoiceForCompany(company, year, month, transaction) {
    try {
      console.log(`\n   🏢 Procesando empresa: ${company.name} (ID: ${company.company_id})`);

      // 1. Verificar si ya existe factura para este período
      const [existingInvoice] = await sequelize.query(
        `SELECT id FROM invoices
         WHERE company_id = :companyId
         AND billing_period_year = :year
         AND billing_period_month = :month`,
        {
          replacements: { companyId: company.company_id, year, month },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (existingInvoice) {
        console.log(`      ⚠️  Ya existe factura para este período, saltando...`);
        return null;
      }

      // 2. Obtener módulos activos
      let activeModules = [];
      try {
        activeModules = company.active_modules ? JSON.parse(company.active_modules) : [];
      } catch (e) {
        console.warn(`      ⚠️  Error parseando active_modules, usando array vacío`);
        activeModules = [];
      }

      if (activeModules.length === 0) {
        console.log(`      ⚠️  Empresa sin módulos activos, saltando...`);
        return null;
      }

      console.log(`      📦 Módulos activos: ${activeModules.join(', ')}`);

      // 3. Obtener pricing de módulos
      let pricing = {};
      try {
        pricing = company.pricing ? JSON.parse(company.pricing) : {};
      } catch (e) {
        console.warn(`      ⚠️  Error parseando pricing, usando objeto vacío`);
        pricing = {};
      }

      // 3.5. Obtener trials con facturación proporcional para este período
      const proportionalTrials = await this.getProportionalTrialsForPeriod(
        company.company_id,
        year,
        month,
        transaction
      );

      console.log(`      🔬 Trials con facturación proporcional: ${proportionalTrials.length}`);

      // 4. Calcular total
      let totalAmount = 0;
      const items = [];

      for (const moduleKey of activeModules) {
        const modulePrice = pricing[moduleKey] || 0;
        let finalPrice = modulePrice;
        let description = `Módulo ${moduleKey}`;
        let metadata = {
          module_key: moduleKey,
          billing_period: `${year}-${String(month).padStart(2, '0')}`
        };

        // Verificar si este módulo tiene facturación proporcional
        const proportionalTrial = proportionalTrials.find(t => t.module_key === moduleKey);

        if (proportionalTrial && modulePrice > 0) {
          // FACTURACIÓN PROPORCIONAL - Primer mes post-trial
          finalPrice = proportionalTrial.proportional_amount;
          description = `Módulo ${moduleKey} (Proporcional: ${proportionalTrial.proportional_days} días de ${proportionalTrial.total_days_month})`;

          metadata.is_proportional = true;
          metadata.trial_id = proportionalTrial.trial_id;
          metadata.proportional_days = proportionalTrial.proportional_days;
          metadata.proportional_percentage = proportionalTrial.proportional_percentage;
          metadata.full_price = modulePrice;
          metadata.discount_amount = modulePrice - finalPrice;

          console.log(`      💰 ${moduleKey}: $${finalPrice.toFixed(2)} (${proportionalTrial.proportional_percentage}% del mes - Trial aceptado)`);
        }

        if (finalPrice > 0) {
          items.push({
            module_key: moduleKey,
            description,
            quantity: 1,
            unit_price: finalPrice,
            total_price: finalPrice,
            metadata
          });

          totalAmount += parseFloat(finalPrice);
        }
      }

      if (totalAmount === 0) {
        console.log(`      ⚠️  Total $0, saltando generación de factura...`);
        return null;
      }

      console.log(`      💵 Total calculado: $${totalAmount.toFixed(2)}`);

      // 5. Generar número de factura
      const invoiceNumber = await this.generateInvoiceNumber(year, month, company.company_id);

      // 6. Crear factura
      const invoice = await Invoice.create({
        company_id: company.company_id,
        invoice_number: invoiceNumber,
        billing_period_month: month,
        billing_period_year: year,
        issue_date: new Date(),
        due_date: this.calculateDueDate(new Date()),
        subtotal: totalAmount,
        tax_rate: company.tax_rate || 0,
        tax_amount: (totalAmount * (company.tax_rate || 0)) / 100,
        total_amount: totalAmount + (totalAmount * (company.tax_rate || 0)) / 100,
        currency: company.currency || 'USD',
        status: 'pending_approval',
        notes: `Factura mensual generada automáticamente para ${year}-${String(month).padStart(2, '0')}`
      }, { transaction });

      console.log(`      ✅ Factura creada: ${invoiceNumber}`);

      // 7. Crear items de factura
      for (const item of items) {
        await InvoiceItem.create({
          invoice_id: invoice.id,
          item_type: 'module',
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          metadata: item.metadata
        }, { transaction });
      }

      console.log(`      ✅ ${items.length} items creados`);

      // 8. Crear notificación para manager
      await this.createInvoiceNotification(company, invoice, transaction);

      return invoice;

    } catch (error) {
      console.error(`❌ Error generando factura para empresa ${company.company_id}:`, error);
      throw error;
    }
  }

  /**
   * Genera número único de factura
   * Formato: INV-YYYYMM-COMPANYID-SEQUENCE
   */
  async generateInvoiceNumber(year, month, companyId) {
    const prefix = `INV-${year}${String(month).padStart(2, '0')}`;

    // Contar facturas del mismo período y empresa
    const [result] = await sequelize.query(
      `SELECT COUNT(*) as count FROM invoices
       WHERE company_id = :companyId
       AND billing_period_year = :year
       AND billing_period_month = :month`,
      {
        replacements: { companyId, year, month },
        type: sequelize.QueryTypes.SELECT
      }
    );

    const sequence = (parseInt(result.count) || 0) + 1;
    return `${prefix}-${companyId}-${String(sequence).padStart(3, '0')}`;
  }

  /**
   * Calcula fecha de vencimiento (30 días desde emisión)
   */
  calculateDueDate(issueDate) {
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate;
  }

  /**
   * Crea notificación de nueva factura
   */
  async createInvoiceNotification(company, invoice, transaction) {
    try {
      await sequelize.query(
        `INSERT INTO notifications (
          company_id,
          recipient_role,
          type,
          title,
          message,
          priority,
          data,
          created_at,
          is_read
        ) VALUES (
          :companyId,
          'admin',
          'invoice_generated',
          'Nueva Factura Generada',
          :message,
          'medium',
          :data,
          CURRENT_TIMESTAMP,
          false
        )`,
        {
          replacements: {
            companyId: company.company_id,
            message: `Se ha generado la factura ${invoice.invoice_number} por $${invoice.total_amount} ${invoice.currency}. Vencimiento: ${invoice.due_date.toISOString().split('T')[0]}`,
            data: JSON.stringify({
              invoice_id: invoice.id,
              invoice_number: invoice.invoice_number,
              total_amount: invoice.total_amount,
              currency: invoice.currency,
              due_date: invoice.due_date
            })
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
    } catch (error) {
      console.error('❌ Error creando notificación de factura:', error);
      // No lanzar error, solo log
    }
  }

  /**
   * Obtiene resumen de facturas por período
   */
  async getInvoicesSummary(year, month) {
    try {
      const summary = await sequelize.query(
        `SELECT
          status,
          COUNT(*) as count,
          SUM(total_amount) as total,
          currency
        FROM invoices
        WHERE billing_period_year = :year
        AND billing_period_month = :month
        GROUP BY status, currency
        ORDER BY status`,
        {
          replacements: { year, month },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return summary;
    } catch (error) {
      console.error('❌ Error obteniendo resumen de facturas:', error);
      throw error;
    }
  }

  /**
   * Obtiene facturas vencidas (overdue)
   */
  async getOverdueInvoices() {
    try {
      const overdueInvoices = await sequelize.query(
        `SELECT
          i.*,
          c.name as company_name,
          c.contact_email
        FROM invoices i
        INNER JOIN companies c ON c.company_id = i.company_id
        WHERE i.status IN ('sent', 'pending_approval')
        AND i.due_date < CURRENT_DATE
        ORDER BY i.due_date ASC`,
        {
          type: sequelize.QueryTypes.SELECT
        }
      );

      return overdueInvoices;
    } catch (error) {
      console.error('❌ Error obteniendo facturas vencidas:', error);
      throw error;
    }
  }

  /**
   * Marca facturas vencidas automáticamente
   */
  async markOverdueInvoices() {
    try {
      const [result] = await sequelize.query(
        `UPDATE invoices
        SET status = 'overdue'
        WHERE status IN ('sent', 'pending_approval')
        AND due_date < CURRENT_DATE
        RETURNING id`,
        {
          type: sequelize.QueryTypes.UPDATE
        }
      );

      console.log(`✅ ${result.length} facturas marcadas como vencidas`);
      return result.length;
    } catch (error) {
      console.error('❌ Error marcando facturas vencidas:', error);
      throw error;
    }
  }

  /**
   * Obtiene trials con facturación proporcional para el período de facturación
   * Solo retorna trials que fueron aceptados en el mes de facturación
   *
   * @param {number} companyId - ID de la empresa
   * @param {number} year - Año de facturación
   * @param {number} month - Mes de facturación (1-12)
   * @param {Object} transaction - Transacción de Sequelize
   * @returns {Promise<Array>} Trials con facturación proporcional
   */
  async getProportionalTrialsForPeriod(companyId, year, month, transaction) {
    try {
      // Buscar trials que fueron aceptados en este período de facturación
      // y que tienen datos de facturación proporcional
      const trials = await ModuleTrial.findAll({
        where: {
          company_id: companyId,
          status: 'accepted'
        },
        transaction
      });

      // Filtrar solo los trials que fueron aceptados en el mes de facturación
      const proportionalTrials = [];

      for (const trial of trials) {
        // Verificar si tiene datos proporcionales
        if (!trial.proportional_amount || trial.proportional_amount === 0) {
          continue;
        }

        // Verificar si la fecha de activación está en el mes de facturación
        const activationDate = new Date(trial.activated_at);
        const activationYear = activationDate.getFullYear();
        const activationMonth = activationDate.getMonth() + 1; // 0-11 -> 1-12

        if (activationYear === year && activationMonth === month) {
          // Este trial fue activado en el mes de facturación
          proportionalTrials.push({
            trial_id: trial.id,
            module_key: trial.module_key,
            module_name: trial.module_name,
            proportional_amount: parseFloat(trial.proportional_amount),
            proportional_days: trial.proportional_days,
            proportional_percentage: parseFloat(trial.proportional_percentage),
            total_days_month: trial.total_days_month,
            activated_at: trial.activated_at
          });
        }
      }

      return proportionalTrials;
    } catch (error) {
      console.error('❌ Error obteniendo trials proporcionales:', error);
      throw error;
    }
  }
}

module.exports = new InvoiceGenerationService();
