/**
 * SERVICIO: AltaEmpresaNotificationService
 *
 * Disparador de notificaciones para el workflow Alta de Empresa
 * Integrado con NotificationWorkflowService (notifications-enterprise V3.0)
 */

const NotificationWorkflowService = require('./NotificationWorkflowService');
const templates = require('../config/notificationTemplates-altaEmpresa');
const { sequelize } = require('../config/database');

class AltaEmpresaNotificationService {

  constructor() {
    this.workflowService = new NotificationWorkflowService();
  }

  /**
   * FASE 1: Presupuesto creado
   */
  async notifyBudgetCreated(budgetData, clientEmail) {
    const template = templates.budget.budgetCreated;

    return await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'budget_created',
      companyId: budgetData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, budgetData),
      message: this.renderTemplate(template.message, budgetData),
      shortMessage: this.renderTemplate(template.short_message, budgetData),

      // Template rendering
      templateKey: template.key,
      variables: budgetData,

      // Relaciones
      relatedEntityType: 'budget',
      relatedEntityId: budgetData.id,

      // Destinatario: email del cliente (externo)
      recipient: {
        email: clientEmail,
        name: budgetData.client_name,
        isExternal: true
      },

      // Canales
      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,
      sendSms: template.channels.sms,

      // Metadata
      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_1_PRESUPUESTO',
        trace_id: budgetData.trace_id,
        budget_code: budgetData.budget_code
      },

      createdBy: budgetData.vendor_id
    });
  }

  /**
   * FASE 1: Presupuesto aceptado
   */
  async notifyBudgetAccepted(budgetData) {
    const template = templates.budget.budgetAccepted;

    // Notificar al vendor
    const vendorNotif = await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'budget_accepted',
      companyId: budgetData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, budgetData),
      message: this.renderTemplate(template.message, budgetData),
      shortMessage: this.renderTemplate(template.short_message, budgetData),

      templateKey: template.key,
      variables: budgetData,

      relatedEntityType: 'budget',
      relatedEntityId: budgetData.id,

      // Destinatario: vendor que cerró la venta
      recipient: {
        userId: budgetData.vendor_id,
        role: 'vendor'
      },

      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_1_PRESUPUESTO',
        trace_id: budgetData.trace_id,
        budget_code: budgetData.budget_code
      }
    });

    // Notificar a admin Aponnt (broadcast a todos los admins)
    const adminNotif = await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'budget_accepted',
      companyId: budgetData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, budgetData),
      message: this.renderTemplate(template.message, budgetData),
      shortMessage: this.renderTemplate(template.short_message, budgetData),

      templateKey: template.key,
      variables: budgetData,

      relatedEntityType: 'budget',
      relatedEntityId: budgetData.id,

      // Destinatario: admins Aponnt (broadcast)
      recipient: {
        role: 'admin',
        isBroadcast: true
      },

      sendEmail: true,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_1_PRESUPUESTO',
        trace_id: budgetData.trace_id,
        budget_code: budgetData.budget_code
      }
    });

    return { vendorNotif, adminNotif };
  }

  /**
   * FASE 2: Contrato generado
   */
  async notifyContractGenerated(contractData, clientEmail) {
    const template = templates.contract.contractGenerated;

    return await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'contract_generated',
      companyId: contractData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, contractData),
      message: this.renderTemplate(template.message, contractData),
      shortMessage: this.renderTemplate(template.short_message, contractData),

      templateKey: template.key,
      variables: contractData,

      relatedEntityType: 'contract',
      relatedEntityId: contractData.id,

      // Destinatario: cliente (externo)
      recipient: {
        email: clientEmail,
        name: contractData.client_name,
        isExternal: true
      },

      // Requiere acción: Firmar contrato
      actionType: template.action_type,
      actionOptions: template.action_options,

      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_2_CONTRATO',
        trace_id: contractData.trace_id,
        contract_code: contractData.contract_code
      },

      createdBy: contractData.vendor_id
    });
  }

  /**
   * FASE 2: Contrato firmado
   */
  async notifyContractSigned(contractData) {
    const template = templates.contract.contractSigned;

    // Notificar al vendor
    const vendorNotif = await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'contract_signed',
      companyId: contractData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, contractData),
      message: this.renderTemplate(template.message, {
        ...contractData,
        signature_hash_preview: contractData.signature_hash?.substring(0, 16) + '...'
      }),
      shortMessage: this.renderTemplate(template.short_message, contractData),

      templateKey: template.key,
      variables: contractData,

      relatedEntityType: 'contract',
      relatedEntityId: contractData.id,

      recipient: {
        userId: contractData.vendor_id,
        role: 'vendor'
      },

      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_2_CONTRATO',
        trace_id: contractData.trace_id,
        contract_code: contractData.contract_code
      }
    });

    // Notificar a admins
    const adminNotif = await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'contract_signed',
      companyId: contractData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, contractData),
      message: this.renderTemplate(template.message, {
        ...contractData,
        signature_hash_preview: contractData.signature_hash?.substring(0, 16) + '...'
      }),

      recipient: {
        role: 'admin',
        isBroadcast: true
      },

      sendEmail: true,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_2_CONTRATO',
        trace_id: contractData.trace_id
      }
    });

    return { vendorNotif, adminNotif };
  }

  /**
   * FASE 3: Factura requiere supervisión
   */
  async notifyInvoiceSupervision(invoiceData, supervisionReason) {
    const template = templates.invoice.invoiceRequiresSupervision;

    return await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'invoice_supervision',
      companyId: invoiceData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, invoiceData),
      message: this.renderTemplate(template.message, {
        ...invoiceData,
        supervision_reason: supervisionReason
      }),
      shortMessage: this.renderTemplate(template.short_message, invoiceData),

      templateKey: template.key,
      variables: { ...invoiceData, supervision_reason: supervisionReason },

      relatedEntityType: 'invoice',
      relatedEntityId: invoiceData.id,

      // REQUIERE APROBACIÓN ADMIN
      actionType: template.action_type,
      actionOptions: template.action_options,

      recipient: {
        role: 'admin_aponnt', // Rol específico para admins de Aponnt
        isBroadcast: true
      },

      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_3_FACTURACION',
        trace_id: invoiceData.trace_id,
        invoice_code: invoiceData.invoice_code,
        requires_action: true,
        supervision_reason: supervisionReason
      },

      // Escalamiento automático si no se aprueba en 24h
      escalation: {
        enabled: template.escalation.enabled,
        hours: template.escalation.hours,
        escalate_to: template.escalation.escalate_to
      }
    });
  }

  /**
   * FASE 3: Factura aprobada
   */
  async notifyInvoiceApproved(invoiceData) {
    const template = templates.invoice.invoiceApproved;

    return await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'invoice_approved',
      companyId: invoiceData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, invoiceData),
      message: this.renderTemplate(template.message, invoiceData),
      shortMessage: this.renderTemplate(template.short_message, invoiceData),

      templateKey: template.key,
      variables: invoiceData,

      relatedEntityType: 'invoice',
      relatedEntityId: invoiceData.id,

      recipient: {
        userId: invoiceData.vendor_id,
        role: 'vendor'
      },

      sendEmail: template.channels.email,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_3_FACTURACION',
        trace_id: invoiceData.trace_id
      }
    });
  }

  /**
   * FASE 3: Pago confirmado
   */
  async notifyPaymentConfirmed(paymentData) {
    const template = templates.invoice.paymentConfirmed;

    // Notificar al vendor
    const vendorNotif = await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'payment_confirmed',
      companyId: paymentData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, paymentData),
      message: this.renderTemplate(template.message, paymentData),
      shortMessage: this.renderTemplate(template.short_message, paymentData),

      templateKey: template.key,
      variables: paymentData,

      relatedEntityType: 'invoice',
      relatedEntityId: paymentData.invoice_id,

      recipient: {
        userId: paymentData.vendor_id,
        role: 'vendor'
      },

      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_3_FACTURACION',
        trace_id: paymentData.trace_id
      }
    });

    // Notificar a admins
    const adminNotif = await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'payment_confirmed',
      companyId: paymentData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, paymentData),
      message: this.renderTemplate(template.message, paymentData),

      recipient: {
        role: 'admin',
        isBroadcast: true
      },

      sendEmail: true,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_3_FACTURACION',
        trace_id: paymentData.trace_id
      }
    });

    return { vendorNotif, adminNotif };
  }

  /**
   * FASE 4: Empresa activada - Notificar al cliente
   */
  async notifyCompanyActivated(activationData, clientEmail) {
    const template = templates.activation.companyActivated;

    return await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'company_activated',
      companyId: activationData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, activationData),
      message: this.renderTemplate(template.message, activationData),
      shortMessage: this.renderTemplate(template.short_message, activationData),

      templateKey: template.key,
      variables: activationData,

      relatedEntityType: 'company',
      relatedEntityId: activationData.company_id,

      recipient: {
        email: clientEmail,
        name: activationData.client_name,
        isExternal: true
      },

      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,
      sendSms: template.channels.sms, // Enviar SMS con credenciales

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_4_ACTIVACION',
        trace_id: activationData.trace_id,
        credentials_sent: true
      }
    });
  }

  /**
   * FASE 4: Empresa activada - Notificar al vendor
   */
  async notifyCompanyActivatedVendor(activationData) {
    const template = templates.activation.companyActivatedVendor;

    return await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'company_activated_vendor',
      companyId: activationData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, activationData),
      message: this.renderTemplate(template.message, activationData),
      shortMessage: this.renderTemplate(template.short_message, activationData),

      templateKey: template.key,
      variables: activationData,

      relatedEntityType: 'company',
      relatedEntityId: activationData.company_id,

      recipient: {
        userId: activationData.vendor_id,
        role: 'vendor'
      },

      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_4_ACTIVACION',
        trace_id: activationData.trace_id
      }
    });
  }

  /**
   * FASE 5: Comisión liquidada (directo)
   */
  async notifyCommissionLiquidated(commissionData) {
    const template = templates.commission.commissionLiquidated;

    return await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'commission_liquidated',
      companyId: commissionData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, commissionData),
      message: this.renderTemplate(template.message, commissionData),
      shortMessage: this.renderTemplate(template.short_message, commissionData),

      templateKey: template.key,
      variables: commissionData,

      relatedEntityType: 'commission_payment',
      relatedEntityId: commissionData.payment_id,

      recipient: {
        userId: commissionData.vendor_id,
        role: 'vendor'
      },

      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_5_COMISIONES',
        trace_id: commissionData.trace_id,
        liquidation_code: commissionData.liquidation_code
      }
    });
  }

  /**
   * FASE 5: Comisión piramidal (upline)
   */
  async notifyCommissionPyramidal(commissionData) {
    const template = templates.commission.commissionPyramidal;

    return await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'commission_pyramidal',
      companyId: commissionData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, commissionData),
      message: this.renderTemplate(template.message, commissionData),
      shortMessage: this.renderTemplate(template.short_message, commissionData),

      templateKey: template.key,
      variables: commissionData,

      relatedEntityType: 'commission_payment',
      relatedEntityId: commissionData.payment_id,

      recipient: {
        userId: commissionData.vendor_upline_id,
        role: 'vendor'
      },

      sendEmail: template.channels.email,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_5_COMISIONES',
        trace_id: commissionData.trace_id,
        pyramid_level: commissionData.pyramid_level
      }
    });
  }

  /**
   * FASE 5: Comisión pagada
   */
  async notifyCommissionPaid(paymentData) {
    const template = templates.commission.commissionPaid;

    return await this.workflowService.createNotification({
      module: template.module,
      notificationType: 'commission_paid',
      companyId: paymentData.company_id,
      category: template.category,
      priority: template.priority,

      title: this.renderTemplate(template.title, paymentData),
      message: this.renderTemplate(template.message, paymentData),
      shortMessage: this.renderTemplate(template.short_message, paymentData),

      templateKey: template.key,
      variables: paymentData,

      relatedEntityType: 'commission_payment',
      relatedEntityId: paymentData.payment_id,

      recipient: {
        userId: paymentData.vendor_id,
        role: 'vendor'
      },

      sendEmail: template.channels.email,
      sendWhatsApp: template.channels.whatsapp,
      sendSms: template.channels.sms,

      metadata: {
        workflow: 'altaEmpresa',
        phase: 'FASE_5_COMISIONES',
        trace_id: paymentData.trace_id,
        transaction_id: paymentData.transaction_id
      }
    });
  }

  /**
   * Helper: Renderizar template con variables
   */
  renderTemplate(template, variables) {
    let rendered = template;

    // Reemplazar {{variable}} con su valor
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, variables[key] || '');
    });

    return rendered;
  }
}

module.exports = new AltaEmpresaNotificationService();
