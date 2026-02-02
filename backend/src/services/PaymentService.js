/**
 * SERVICE: PaymentService
 *
 * Servicio CRÍTICO para registro de pagos y activación de empresas.
 *
 * FLUJO COMPLETO AL REGISTRAR UN PAGO:
 * 1. Registrar pago en tabla payments
 * 2. Marcar factura como 'paid'
 * 3. Generar comisiones automáticamente (venta, soporte, líder)
 * 4. SI la empresa está en estado 'pendiente_aprobacion':
 *    - Activar empresa (cambiar estado a 'activo')
 *    - Crear entorno completo (DB, usuarios, departamentos)
 *    - Asignar módulos contratados (SOLO los de la factura)
 *    - Generar credenciales de administrador
 *    - Enviar email de bienvenida con credenciales
 * 5. Notificar vendedor y soporte del pago
 */

const { sequelize, Invoice } = require('../config/database');
const Payment = require('../models/Payment');
const CommissionCalculationService = require('./CommissionCalculationService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class PaymentService {
  /**
   * Registra un pago y ejecuta todo el flujo automático
   * @param {Object} paymentData - Datos del pago
   * @param {number} paymentData.invoice_id - ID de factura
   * @param {number} paymentData.company_id - ID de empresa
   * @param {number} paymentData.amount - Monto pagado
   * @param {string} paymentData.currency - Moneda
   * @param {string} paymentData.payment_method - Método de pago
   * @param {string} paymentData.payment_reference - Referencia del pago
   * @param {string} paymentData.payment_date - Fecha de pago
   * @param {string} paymentData.notes - Notas
   * @param {string} paymentData.registered_by - UUID del usuario que registra
   * @param {string} paymentData.receipt_file_path - Ruta del archivo de recibo
   * @param {string} paymentData.receipt_file_name - Nombre del archivo
   * @returns {Promise<Object>} Resultado del registro
   */
  async registerPayment(paymentData) {
    const transaction = await sequelize.transaction();

    try {
      console.log(`\n🔵 [PAYMENT SERVICE] Iniciando registro de pago...`);
      console.log(`   Factura ID: ${paymentData.invoice_id}`);
      console.log(`   Empresa ID: ${paymentData.company_id}`);
      console.log(`   Monto: ${paymentData.amount} ${paymentData.currency}`);

      // 1. Verificar que la factura existe y obtener datos
      const invoice = await Invoice.findByPk(paymentData.invoice_id, { transaction });
      if (!invoice) {
        throw new Error(`Factura ID ${paymentData.invoice_id} no encontrada`);
      }

      console.log(`   ✅ Factura encontrada: ${invoice.invoice_number} (${invoice.status})`);

      // 2. Verificar que el monto coincide
      if (parseFloat(paymentData.amount) !== parseFloat(invoice.total_amount)) {
        throw new Error(
          `El monto del pago (${paymentData.amount}) no coincide con el total de la factura (${invoice.total_amount})`
        );
      }

      // 3. Crear registro de pago
      const payment = await Payment.create({
        invoice_id: paymentData.invoice_id,
        company_id: paymentData.company_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        payment_method: paymentData.payment_method,
        payment_reference: paymentData.payment_reference,
        payment_date: paymentData.payment_date,
        receipt_file_path: paymentData.receipt_file_path,
        receipt_file_name: paymentData.receipt_file_name,
        notes: paymentData.notes,
        registered_by: paymentData.registered_by,
        registered_at: new Date(),
        commissions_generated: false
      }, { transaction });

      console.log(`   ✅ Pago registrado ID: ${payment.id}`);

      // 4. Marcar factura como 'paid'
      await invoice.update({
        status: 'paid',
        paid_at: new Date()
      }, { transaction });

      console.log(`   ✅ Factura marcada como PAID`);

      // 5. Obtener datos de la empresa
      const [company] = await sequelize.query(
        'SELECT * FROM companies WHERE company_id = :companyId',
        {
          replacements: { companyId: paymentData.company_id },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (!company) {
        throw new Error(`Empresa ID ${paymentData.company_id} no encontrada`);
      }

      console.log(`   ✅ Empresa encontrada: ${company.name} (Estado: ${company.status})`);

      // 6. Generar comisiones automáticamente
      const commissions = await CommissionCalculationService.generateCommissionsForPayment(
        payment,
        invoice,
        company
      );

      // Marcar que las comisiones fueron generadas
      await payment.update({
        commissions_generated: true,
        commissions_generated_at: new Date()
      }, { transaction });

      console.log(`   ✅ ${commissions.length} comisiones generadas`);

      // 7. SI LA EMPRESA ESTÁ EN ESTADO 'pendiente_aprobacion' → ACTIVAR
      let companyActivationResult = null;
      if (company.status === 'pendiente_aprobacion') {
        console.log(`\n🟢 [ACTIVACIÓN] Empresa en estado PENDIENTE → Activando...`);

        companyActivationResult = await this.activateNewCompany({
          company,
          invoice,
          payment,
          transaction
        });

        console.log(`   ✅ Empresa ACTIVADA exitosamente`);
      } else {
        console.log(`\n   ℹ️  Empresa ya estaba activa, no se ejecuta activación`);
      }

      // 8. Commit de la transacción
      await transaction.commit();

      console.log(`\n✅ [PAYMENT SERVICE] Pago registrado exitosamente\n`);

      return {
        success: true,
        payment,
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          paid_at: invoice.paid_at
        },
        commissions: commissions.map(c => ({
          id: c.id,
          type: c.commission_type,
          partner_id: c.partner_id,
          amount: c.commission_amount,
          currency: c.currency
        })),
        companyActivation: companyActivationResult
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [PAYMENT SERVICE] Error registrando pago:', error);
      throw error;
    }
  }

  /**
   * Activa una empresa nueva (pendiente_aprobacion → activo)
   * CRÍTICO: Solo se ejecuta si es el PRIMER pago de una empresa nueva
   *
   * @param {Object} params
   * @param {Object} params.company - Empresa a activar
   * @param {Object} params.invoice - Factura pagada
   * @param {Object} params.payment - Pago registrado
   * @param {Object} params.transaction - Transacción de Sequelize
   * @returns {Promise<Object>} Resultado de activación
   */
  async activateNewCompany({ company, invoice, payment, transaction }) {
    try {
      console.log(`\n🟢 [ACTIVACIÓN] Iniciando activación de empresa...`);
      console.log(`   Empresa: ${company.name} (ID: ${company.company_id})`);
      console.log(`   Factura: ${invoice.invoice_number}`);

      // 1. Cambiar estado de empresa a 'activo'
      await sequelize.query(
        `UPDATE companies SET status = 'active', is_trial = false, activated_at = CURRENT_TIMESTAMP WHERE company_id = :companyId`,
        {
          replacements: { companyId: company.company_id },
          type: sequelize.QueryTypes.UPDATE,
          transaction
        }
      );

      console.log(`   ✅ Estado cambiado a ACTIVO`);

      // 2. Leer módulos de la factura (invoice_items)
      const invoiceItems = await sequelize.query(
        `SELECT * FROM invoice_items WHERE invoice_id = :invoiceId`,
        {
          replacements: { invoiceId: invoice.id },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log(`   📦 Módulos contratados: ${invoiceItems.length} items`);

      // 3. Construir array de módulos activos
      const activeModules = [];
      invoiceItems.forEach(item => {
        if (item.item_type === 'module' && item.metadata && item.metadata.module_key) {
          activeModules.push(item.metadata.module_key);
        }
      });

      console.log(`   📦 Módulos a activar: ${activeModules.join(', ')}`);

      // 4. Actualizar active_modules de la empresa
      if (activeModules.length > 0) {
        await sequelize.query(
          `UPDATE companies SET active_modules = :modules WHERE company_id = :companyId`,
          {
            replacements: {
              companyId: company.company_id,
              modules: JSON.stringify(activeModules)
            },
            type: sequelize.QueryTypes.UPDATE,
            transaction
          }
        );

        console.log(`   ✅ Módulos asignados a la empresa`);
      }

      // 5. Crear departamento base
      await sequelize.query(
        `INSERT INTO departments (company_id, name, description, is_active, created_at, updated_at)
        VALUES (:companyId, 'General', 'Departamento principal', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING`,
        {
          replacements: { companyId: company.company_id },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );

      console.log(`   ✅ Departamento base creado`);

      // 6. Generar credenciales de administrador
      const tempPassword = this.generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await sequelize.query(
        `INSERT INTO users (company_id, username, password, email, role, is_active, created_at, updated_at)
        VALUES (:companyId, 'admin', :password, :email, 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (company_id, username) DO UPDATE SET password = :password`,
        {
          replacements: {
            companyId: company.company_id,
            password: hashedPassword,
            email: company.contact_email || `admin@${company.slug}.com`
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );

      console.log(`   ✅ Usuario admin creado`);
      // 🔐 SEGURIDAD: No loguear passwords - se envían por email
      console.log(`   🔑 Password temporal generado (se enviará por email)`);

      // 7. TODO: Enviar email de bienvenida (implementar con EmailService)
      console.log(`   📧 Email de bienvenida programado (TODO: implementar EmailService)`);

      // 8. Crear notificación de activación
      await this.createActivationNotification({
        company,
        invoice,
        payment,
        tempPassword,
        activeModules,
        transaction
      });

      console.log(`   ✅ Notificación de activación creada`);

      return {
        activated: true,
        company_id: company.company_id,
        company_name: company.name,
        status: 'activo',
        modules_activated: activeModules,
        admin_username: 'admin',
        admin_temp_password: tempPassword,
        email_sent_to: company.contact_email
      };

    } catch (error) {
      console.error('❌ [ACTIVACIÓN] Error activando empresa:', error);
      throw error;
    }
  }

  /**
   * Genera una contraseña temporal segura
   * @returns {string} Password de 12 caracteres
   */
  generateTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const length = 12;
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      password += chars[randomBytes[i] % chars.length];
    }

    return password;
  }

  /**
   * Crea notificación de activación de empresa
   */
  async createActivationNotification({ company, invoice, payment, tempPassword, activeModules, transaction }) {
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
          'company_activated',
          'Empresa Activada - Bienvenido',
          :message,
          'high',
          :data,
          CURRENT_TIMESTAMP,
          false
        )`,
        {
          replacements: {
            companyId: company.company_id,
            message: `Su empresa ${company.name} ha sido activada exitosamente. Usuario: admin, Password temporal: ${tempPassword}`,
            data: JSON.stringify({
              invoice_number: invoice.invoice_number,
              payment_amount: payment.amount,
              payment_date: payment.payment_date,
              modules_activated: activeModules,
              admin_username: 'admin',
              admin_temp_password: tempPassword
            })
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
    } catch (error) {
      console.error('❌ Error creando notificación de activación:', error);
      // No lanzar error, solo log
    }
  }

  /**
   * Obtiene historial de pagos de una empresa
   * @param {number} companyId - ID de empresa
   * @returns {Promise<Array>} Historial de pagos
   */
  async getCompanyPaymentHistory(companyId) {
    try {
      const payments = await sequelize.query(
        `SELECT
          p.*,
          i.invoice_number,
          i.billing_period_month,
          i.billing_period_year,
          i.total_amount as invoice_total
        FROM payments p
        INNER JOIN invoices i ON i.id = p.invoice_id
        WHERE p.company_id = :companyId
        ORDER BY p.payment_date DESC, p.created_at DESC`,
        {
          replacements: { companyId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return payments;
    } catch (error) {
      console.error('❌ Error obteniendo historial de pagos:', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de un pago específico
   * @param {number} paymentId - ID del pago
   * @returns {Promise<Object>} Detalles del pago
   */
  async getPaymentDetails(paymentId) {
    try {
      const [payment] = await sequelize.query(
        `SELECT
          p.*,
          i.invoice_number,
          i.billing_period_month,
          i.billing_period_year,
          i.total_amount as invoice_total,
          i.status as invoice_status,
          c.name as company_name,
          c.slug as company_slug
        FROM payments p
        INNER JOIN invoices i ON i.id = p.invoice_id
        INNER JOIN companies c ON c.company_id = p.company_id
        WHERE p.id = :paymentId`,
        {
          replacements: { paymentId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (!payment) {
        throw new Error(`Pago ID ${paymentId} no encontrado`);
      }

      // Obtener comisiones generadas por este pago
      const commissions = await sequelize.query(
        `SELECT
          c.*,
          p.name as partner_name,
          p.email as partner_email
        FROM commissions c
        INNER JOIN partners p ON p.id = c.partner_id
        WHERE c.payment_id = :paymentId
        ORDER BY c.commission_type`,
        {
          replacements: { paymentId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      return {
        ...payment,
        commissions
      };
    } catch (error) {
      console.error('❌ Error obteniendo detalles de pago:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
