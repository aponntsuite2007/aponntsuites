/**
 * INVOICING SERVICE
 *
 * Gestión completa de facturación mensual automática.
 * Implementa FASE 3: FACTURACIÓN Y PAGO del circuito comercial.
 *
 * RESPONSABILIDADES:
 * - Generación de facturas mensuales automáticas (cron job)
 * - Generación de factura inicial en onboarding
 * - Aprobación administrativa (si requiere_supervision_factura)
 * - Envío de facturas al cliente
 * - Registro de pagos
 * - Gestión de facturas vencidas (overdue)
 * - Cálculo de recargos por mora
 * - Cancelación de facturas
 * - Generación de PDF
 *
 * TRACE ID: ONBOARDING-{UUID} (para factura inicial)
 *
 * INTEGRACIÓN:
 * - Usado por: OnboardingService, Cron Jobs
 * - Usa: Invoice model, Contract model, Company model
 * - Notifica: NotificationExternalService
 *
 * WORKFLOW FACTURACIÓN:
 * 1. Cron job (día 1 del mes) → generateMonthlyInvoices()
 * 2. Si requiere_supervision_factura → status: pending_approval
 * 3. Admin aprueba → status: sent
 * 4. Cliente recibe factura → email con PDF
 * 5. Cliente paga → markAsPaid() → status: paid
 * 6. Si vence sin pagar → status: overdue
 * 7. Suspender servicio si > X días overdue
 */

const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Invoice, Contract, Company, InvoiceItem, sequelize } = require('../config/database');
const DocumentHeaderService = require('./DocumentHeaderService');

class InvoicingService {

  /**
   * ============================================
   * GENERATE - Generar factura (onboarding o mensual)
   * ============================================
   */
  async generate(invoiceData) {
    const transaction = await sequelize.transaction();

    try {
      // 1. Validar empresa
      const company = await Company.findByPk(invoiceData.company_id, { transaction });
      if (!company) {
        throw new Error(`Company ID ${invoiceData.company_id} no encontrada`);
      }

      // 1.5. VALIDACIÓN TRIAL - No generar facturas para empresas en período de prueba
      if (company.status === 'trial' || company.is_trial === true) {
        console.log(`⚠️ [INVOICE] Empresa ${company.name} está en período TRIAL - No se genera factura`);
        throw new Error(`Empresa ${company.name} está en período de prueba (trial). No se puede generar factura hasta que finalice el trial.`);
      }

      // 2. Obtener contrato activo
      const contract = await Contract.getActiveContract(invoiceData.company_id, transaction);
      if (!contract) {
        throw new Error(`No hay contrato activo para ${company.name}`);
      }

      // 3. Determinar período de facturación
      const now = new Date();
      const billingPeriodMonth = invoiceData.billing_period_month || now.getMonth() + 1;
      const billingPeriodYear = invoiceData.billing_period_year || now.getFullYear();

      // 4. Verificar si ya existe factura para este período
      const existingInvoice = await Invoice.findOne({
        where: {
          company_id: invoiceData.company_id,
          billing_period_month: billingPeriodMonth,
          billing_period_year: billingPeriodYear
        },
        transaction
      });

      if (existingInvoice) {
        console.log(`⚠️ [INVOICE] Ya existe factura para ${company.name} - ${billingPeriodMonth}/${billingPeriodYear}`);
        return existingInvoice;
      }

      // 5. Calcular montos
      const subtotal = parseFloat(invoiceData.amount_usd || contract.monthly_total);
      const taxRate = parseFloat(company.tax_rate || 0.00);
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      // 6. Determinar fechas
      const issueDate = invoiceData.issue_date || new Date();
      const dueDate = this.calculateDueDate(issueDate, contract.payment_terms_days || 10);

      // 7. Generar invoice_number
      const invoiceNumber = await this.generateInvoiceNumber(billingPeriodYear);

      // 8. Determinar estado inicial
      let status = 'draft';
      if (company.requiere_supervision_factura) {
        status = 'pending_approval';
      } else {
        status = 'sent'; // Auto-enviado
      }

      // 9. Crear factura
      const invoice = await Invoice.create({
        company_id: invoiceData.company_id,
        invoice_number: invoiceNumber,
        billing_period_month: billingPeriodMonth,
        billing_period_year: billingPeriodYear,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: invoiceData.currency || 'USD',
        status: status,
        issue_date: issueDate,
        due_date: dueDate,
        notes: invoiceData.notes || this.generateInvoiceNotes(contract, billingPeriodMonth, billingPeriodYear),
        internal_notes: invoiceData.trace_id ? `Trace: ${invoiceData.trace_id}` : null,
        created_by: invoiceData.created_by || null
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [INVOICE] Factura generada: ${invoiceNumber} - ${company.name} - ${billingPeriodMonth}/${billingPeriodYear}`);
      console.log(`   - Subtotal: ${subtotal} | Tax: ${taxAmount} | Total: ${totalAmount}`);
      console.log(`   - Estado: ${status} | Vence: ${dueDate}`);

      return invoice;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [INVOICE] Error al generar factura:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GENERATE MONTHLY INVOICES - Cron job mensual
   * ============================================
   * Se ejecuta el día 1 de cada mes para TODOS los contratos activos
   */
  async generateMonthlyInvoices() {
    const transaction = await sequelize.transaction();

    try {
      console.log(`🔄 [INVOICE] Generando facturas mensuales...`);

      // 1. Obtener todos los contratos activos (excluyendo empresas en trial)
      const activeContracts = await Contract.findAll({
        where: { status: 'active' },
        include: [{
          model: Company,
          as: 'company',
          where: {
            status: 'active',    // Solo empresas activas (no trial, no pending)
            is_trial: false      // Excluir empresas en período de prueba
          },
          required: true
        }],
        transaction
      });

      console.log(`   - Contratos activos (sin trial): ${activeContracts.length}`);

      // 2. Generar factura para cada contrato
      const results = {
        generated: 0,
        skipped: 0,
        errors: 0,
        invoices: []
      };

      for (const contract of activeContracts) {
        try {
          const invoice = await this.generate({
            company_id: contract.company_id,
            billing_period_month: new Date().getMonth() + 1,
            billing_period_year: new Date().getFullYear()
          });

          results.generated++;
          results.invoices.push({
            invoice_number: invoice.invoice_number,
            company_id: contract.company_id,
            total_amount: invoice.total_amount
          });

        } catch (error) {
          if (error.message.includes('Ya existe factura')) {
            results.skipped++;
          } else {
            results.errors++;
            console.error(`❌ [INVOICE] Error al generar factura para company ${contract.company_id}:`, error.message);
          }
        }
      }

      await transaction.commit();

      console.log(`✅ [INVOICE] Facturación mensual completada:`);
      console.log(`   - Generadas: ${results.generated}`);
      console.log(`   - Saltadas (duplicadas): ${results.skipped}`);
      console.log(`   - Errores: ${results.errors}`);

      return results;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [INVOICE] Error en generación mensual de facturas:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * APPROVE - Aprobación administrativa
   * ============================================
   */
  async approve(invoiceId, approvedByUserId) {
    const transaction = await sequelize.transaction();

    try {
      const invoice = await Invoice.findByPk(invoiceId, { transaction });
      if (!invoice) {
        throw new Error(`Invoice ID ${invoiceId} no encontrada`);
      }

      if (invoice.status !== 'pending_approval') {
        throw new Error(`Solo se pueden aprobar facturas en estado pending_approval. Estado actual: ${invoice.status}`);
      }

      await invoice.update({
        status: 'sent',
        approved_by: approvedByUserId,
        approved_at: new Date(),
        sent_at: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [INVOICE] Factura APROBADA y ENVIADA: ${invoice.invoice_number}`);

      // TODO: Enviar notificación al cliente con NotificationExternalService

      return invoice;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [INVOICE] Error al aprobar factura:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * SEND - Enviar factura al cliente
   * ============================================
   */
  async send(invoiceId) {
    const transaction = await sequelize.transaction();

    try {
      const invoice = await Invoice.findByPk(invoiceId, { transaction });
      if (!invoice) {
        throw new Error(`Invoice ID ${invoiceId} no encontrada`);
      }

      if (!['draft', 'pending_approval'].includes(invoice.status)) {
        throw new Error(`No se puede enviar factura en estado: ${invoice.status}`);
      }

      await invoice.update({
        status: 'sent',
        sent_at: new Date()
      }, { transaction });

      await transaction.commit();

      console.log(`📤 [INVOICE] Factura ENVIADA: ${invoice.invoice_number}`);

      // TODO: Enviar notificación al cliente con PDF adjunto

      return invoice;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [INVOICE] Error al enviar factura:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * MARK AS PAID - Registrar pago
   * ============================================
   */
  async markAsPaid(invoiceId, paymentData = {}) {
    const transaction = await sequelize.transaction();

    try {
      const invoice = await Invoice.findByPk(invoiceId, { transaction });
      if (!invoice) {
        throw new Error(`Invoice ID ${invoiceId} no encontrada`);
      }

      if (invoice.status === 'paid') {
        throw new Error(`Factura ${invoice.invoice_number} ya está pagada`);
      }

      if (invoice.status === 'cancelled') {
        throw new Error(`No se puede marcar como pagada una factura cancelada`);
      }

      await invoice.update({
        status: 'paid',
        paid_at: paymentData.paid_at || new Date(),
        internal_notes: (invoice.internal_notes || '') +
          `\n💰 Pago registrado: ${JSON.stringify(paymentData, null, 2)}`
      }, { transaction });

      await transaction.commit();

      console.log(`✅ [INVOICE] Factura PAGADA: ${invoice.invoice_number}`);

      // TODO: Reactivar contrato si estaba suspendido
      // TODO: Liquidar comisiones con CommissionService

      return invoice;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [INVOICE] Error al marcar como pagada:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CANCEL - Cancelar factura
   * ============================================
   */
  async cancel(invoiceId, cancellationReason = 'Cancelado por administrador') {
    const transaction = await sequelize.transaction();

    try {
      const invoice = await Invoice.findByPk(invoiceId, { transaction });
      if (!invoice) {
        throw new Error(`Invoice ID ${invoiceId} no encontrada`);
      }

      if (invoice.status === 'paid') {
        throw new Error(`No se puede cancelar una factura ya pagada`);
      }

      await invoice.update({
        status: 'cancelled',
        internal_notes: (invoice.internal_notes || '') +
          `\n❌ Cancelado: ${cancellationReason} (${new Date().toISOString()})`
      }, { transaction });

      await transaction.commit();

      console.log(`❌ [INVOICE] Factura CANCELADA: ${invoice.invoice_number} - Razón: ${cancellationReason}`);

      return invoice;

    } catch (error) {
      await transaction.rollback();
      console.error('❌ [INVOICE] Error al cancelar factura:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CHECK OVERDUE INVOICES - Marcar vencidas (cron job)
   * ============================================
   * Se ejecuta diariamente para marcar facturas vencidas
   */
  async checkOverdueInvoices() {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const result = await Invoice.update(
        { status: 'overdue' },
        {
          where: {
            status: 'sent',
            due_date: {
              [sequelize.Sequelize.Op.lt]: todayStr
            }
          }
        }
      );

      const overdueCount = result[0];
      console.log(`⏰ [INVOICE] Facturas marcadas como OVERDUE: ${overdueCount}`);

      // TODO: Enviar notificaciones de mora
      // TODO: Suspender contratos si > X días overdue

      return { overdueCount };

    } catch (error) {
      console.error('❌ [INVOICE] Error al verificar facturas vencidas:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * CALCULATE LATE PAYMENT SURCHARGE
   * ============================================
   * Calcula recargo por pago fuera de término
   */
  calculateLatePaymentSurcharge(invoice, contract) {
    try {
      const today = new Date();
      const dueDate = new Date(invoice.due_date);

      if (today <= dueDate) {
        return 0.00; // No hay recargo
      }

      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      const surchargePercentage = parseFloat(contract.late_payment_surcharge_percentage || 10.00);
      const surchargeAmount = (parseFloat(invoice.total_amount) * surchargePercentage) / 100;

      return {
        days_overdue: daysOverdue,
        surcharge_percentage: surchargePercentage,
        surcharge_amount: surchargeAmount.toFixed(2),
        new_total: (parseFloat(invoice.total_amount) + surchargeAmount).toFixed(2)
      };

    } catch (error) {
      console.error('❌ [INVOICE] Error al calcular recargo:', error);
      return { days_overdue: 0, surcharge_amount: 0.00 };
    }
  }

  /**
   * ============================================
   * FIND BY ID
   * ============================================
   */
  async findById(invoiceId) {
    try {
      const invoice = await Invoice.findByPk(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice ID ${invoiceId} no encontrada`);
      }
      return invoice;
    } catch (error) {
      console.error('❌ [INVOICE] Error al buscar factura:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * FIND BY COMPANY
   * ============================================
   */
  async findByCompany(companyId, options = {}) {
    try {
      const invoices = await Invoice.findAll({
        where: { company_id: companyId },
        order: [['issue_date', 'DESC']],
        limit: options.limit || 50
      });
      return invoices;
    } catch (error) {
      console.error('❌ [INVOICE] Error al buscar facturas por empresa:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * GET STATS - Estadísticas de facturación
   * ============================================
   */
  async getStats(filters = {}) {
    try {
      const where = {};

      if (filters.company_id) {
        where.company_id = filters.company_id;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.billing_period_year) {
        where.billing_period_year = filters.billing_period_year;
      }

      const [total, draft, pendingApproval, sent, paid, overdue, cancelled] = await Promise.all([
        Invoice.count({ where }),
        Invoice.count({ where: { ...where, status: 'draft' } }),
        Invoice.count({ where: { ...where, status: 'pending_approval' } }),
        Invoice.count({ where: { ...where, status: 'sent' } }),
        Invoice.count({ where: { ...where, status: 'paid' } }),
        Invoice.count({ where: { ...where, status: 'overdue' } }),
        Invoice.count({ where: { ...where, status: 'cancelled' } })
      ]);

      // Calcular montos totales
      const allInvoices = await Invoice.findAll({ where });
      const totalRevenue = allInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);

      const pendingRevenue = allInvoices
        .filter(inv => ['sent', 'overdue'].includes(inv.status))
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);

      return {
        total,
        draft,
        pending_approval: pendingApproval,
        sent,
        paid,
        overdue,
        cancelled,
        total_revenue: totalRevenue.toFixed(2),
        pending_revenue: pendingRevenue.toFixed(2),
        collection_rate: total > 0 ? ((paid / total) * 100).toFixed(2) : 0
      };

    } catch (error) {
      console.error('❌ [INVOICE] Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * ============================================
   * HELPERS
   * ============================================
   */

  /**
   * Generar invoice_number: FACT-YYYY-NNNN
   */
  async generateInvoiceNumber(year) {
    try {
      const prefix = `FACT-${year}-`;

      const lastInvoice = await Invoice.findOne({
        where: {
          invoice_number: {
            [sequelize.Sequelize.Op.like]: `${prefix}%`
          }
        },
        order: [['id', 'DESC']]
      });

      let nextNumber = 1;
      if (lastInvoice) {
        const match = lastInvoice.invoice_number.match(/FACT-\d{4}-(\d{4})/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      return `${prefix}${String(nextNumber).padStart(4, '0')}`;

    } catch (error) {
      console.error('❌ [INVOICE] Error al generar invoice_number:', error);
      throw error;
    }
  }

  /**
   * Calcular due_date a partir de issue_date + payment_terms_days
   */
  calculateDueDate(issueDate, paymentTermsDays) {
    const due = new Date(issueDate);
    due.setDate(due.getDate() + paymentTermsDays);
    return due.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Generar notas automáticas de la factura
   */
  generateInvoiceNotes(contract, month, year) {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return `Factura mensual - ${monthNames[month - 1]} ${year}
Contrato: ${contract.contract_number}
Módulos contratados: ${contract.modules_data?.length || 0}
Ciclo de facturación: ${contract.billing_cycle}
    `.trim();
  }

  /**
   * ============================================
   * GENERATE PDF - Generar PDF de factura
   * ============================================
   * Genera PDF profesional con encabezado de empresa
   */
  async generatePDF(invoiceId, options = {}) {
    try {
      // 1. Obtener factura con items y empresa
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          { model: Company, as: 'company' }
        ]
      });

      if (!invoice) {
        throw new Error(`Invoice ID ${invoiceId} no encontrada`);
      }

      // Obtener items de la factura
      const items = await InvoiceItem.findAll({
        where: { invoice_id: invoiceId },
        order: [['id', 'ASC']]
      });

      // 2. Configurar directorio de salida
      const outputDir = path.join(__dirname, '../../storage/invoices');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filename = `${invoice.invoice_number.replace(/\//g, '-')}.pdf`;
      const filepath = path.join(outputDir, filename);

      // 3. Crear documento PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Factura ${invoice.invoice_number}`,
          Author: invoice.company?.name || 'Sistema',
          Subject: `Factura período ${invoice.billing_period_month}/${invoice.billing_period_year}`
        }
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // 4. Agregar encabezado con datos de empresa
      let currentY = await DocumentHeaderService.addPDFHeader(doc, {
        companyId: invoice.company_id,
        documentType: 'FACTURA',
        documentNumber: invoice.invoice_number,
        documentDate: invoice.issue_date,
        recipient: invoice.company ? {
          name: invoice.company.legal_name || invoice.company.name,
          taxId: invoice.company.tax_id,
          address: invoice.company.address
        } : null
      });

      // 5. Información del período
      currentY += 10;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333');
      doc.text('Período de Facturación:', 50, currentY);
      doc.font('Helvetica').text(
        `${this.getMonthName(invoice.billing_period_month)} ${invoice.billing_period_year}`,
        200, currentY
      );

      currentY += 20;
      doc.text('Fecha de Vencimiento:', 50, currentY);
      doc.text(DocumentHeaderService.formatDateShort(invoice.due_date), 200, currentY);

      // 6. Tabla de items
      currentY += 40;
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Detalle de Servicios', 50, currentY);

      currentY += 20;

      // Header de tabla
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
      doc.rect(50, currentY, 510, 20).fill('#333');
      doc.text('Descripción', 55, currentY + 6);
      doc.text('Cant.', 320, currentY + 6, { width: 50, align: 'center' });
      doc.text('Precio Unit.', 370, currentY + 6, { width: 80, align: 'right' });
      doc.text('Subtotal', 460, currentY + 6, { width: 95, align: 'right' });

      currentY += 20;

      // Filas de items
      doc.font('Helvetica').fillColor('#333');
      if (items && items.length > 0) {
        items.forEach((item, idx) => {
          const bgColor = idx % 2 === 0 ? '#f9f9f9' : '#fff';
          doc.rect(50, currentY, 510, 20).fill(bgColor);
          doc.fillColor('#333');
          doc.text(item.description, 55, currentY + 6, { width: 260 });
          doc.text(item.quantity.toString(), 320, currentY + 6, { width: 50, align: 'center' });
          doc.text(this.formatCurrency(item.unit_price, invoice.currency), 370, currentY + 6, { width: 80, align: 'right' });
          doc.text(this.formatCurrency(item.subtotal, invoice.currency), 460, currentY + 6, { width: 95, align: 'right' });
          currentY += 20;
        });
      } else {
        // Si no hay items, mostrar el total como un solo concepto
        doc.rect(50, currentY, 510, 20).fill('#f9f9f9');
        doc.fillColor('#333');
        doc.text('Servicios del período', 55, currentY + 6, { width: 260 });
        doc.text('1', 320, currentY + 6, { width: 50, align: 'center' });
        doc.text(this.formatCurrency(invoice.subtotal, invoice.currency), 370, currentY + 6, { width: 80, align: 'right' });
        doc.text(this.formatCurrency(invoice.subtotal, invoice.currency), 460, currentY + 6, { width: 95, align: 'right' });
        currentY += 20;
      }

      // 7. Totales
      currentY += 10;
      doc.strokeColor('#333').lineWidth(0.5);
      doc.moveTo(350, currentY).lineTo(560, currentY).stroke();

      currentY += 10;
      doc.fontSize(10).font('Helvetica');
      doc.text('Subtotal:', 350, currentY);
      doc.text(this.formatCurrency(invoice.subtotal, invoice.currency), 460, currentY, { width: 95, align: 'right' });

      if (parseFloat(invoice.tax_amount) > 0) {
        currentY += 18;
        doc.text(`IVA (${invoice.tax_rate || 21}%):`, 350, currentY);
        doc.text(this.formatCurrency(invoice.tax_amount, invoice.currency), 460, currentY, { width: 95, align: 'right' });
      }

      currentY += 25;
      doc.fontSize(14).font('Helvetica-Bold');
      doc.rect(340, currentY - 5, 220, 30).fill('#f0f0f0');
      doc.fillColor('#333');
      doc.text('TOTAL:', 350, currentY + 3);
      doc.fillColor('#0066cc');
      doc.text(this.formatCurrency(invoice.total_amount, invoice.currency), 460, currentY + 3, { width: 95, align: 'right' });

      // 8. Notas
      if (invoice.notes) {
        currentY += 50;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#333');
        doc.text('Notas:', 50, currentY);
        currentY += 15;
        doc.font('Helvetica').fontSize(9);
        doc.text(invoice.notes, 50, currentY, { width: 510 });
      }

      // 9. Pie de página
      await DocumentHeaderService.addPDFFooter(doc, {
        companyId: invoice.company_id
      });

      // 10. Finalizar documento
      doc.end();

      // Esperar a que termine de escribir
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`📄 [INVOICE] PDF generado: ${filepath}`);

      return {
        success: true,
        message: 'PDF generado correctamente',
        invoice_number: invoice.invoice_number,
        filepath: filepath,
        filename: filename
      };

    } catch (error) {
      console.error('❌ [INVOICE] Error al generar PDF:', error);
      throw error;
    }
  }

  /**
   * Formatea moneda
   */
  formatCurrency(amount, currency = 'USD') {
    const num = parseFloat(amount) || 0;
    const symbols = { USD: '$', ARS: '$', EUR: '€', CLP: '$', BRL: 'R$', MXN: '$' };
    const symbol = symbols[currency] || '$';
    return `${symbol} ${num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Obtiene nombre del mes
   */
  getMonthName(month) {
    const months = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month] || '';
  }

}

module.exports = new InvoicingService();
