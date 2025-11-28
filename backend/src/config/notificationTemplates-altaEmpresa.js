/**
 * TEMPLATES Y CONFIGURACIÓN DE NOTIFICACIONES: Workflow Alta de Empresa
 *
 * Integración con sistema notifications-enterprise V3.0
 * Templates reutilizables para las 5 fases del onboarding B2B
 */

module.exports = {

  /**
   * FASE 1: PRESUPUESTO - Templates de notificaciones
   */
  budget: {

    // Template: Presupuesto creado (notificar al cliente)
    budgetCreated: {
      key: 'alta_empresa_budget_created',
      module: 'budgets',
      category: 'info',
      priority: 'medium',
      title: '💼 Presupuesto {{budget_code}} Generado',
      message: `Hola {{client_name}},

Hemos generado su presupuesto personalizado para el alta de su empresa en nuestro sistema.

📋 **Detalles del Presupuesto:**
- Código: {{budget_code}}
- Empresa: {{company_name}}
- Módulos seleccionados: {{modules_count}}
- Empleados contratados: {{contracted_employees}}
- Total mensual: USD {{monthly_total}}

El presupuesto es válido hasta: {{valid_until}}

👉 **Próximo Paso:** Revise el presupuesto adjunto y acéptelo para continuar con el proceso de alta.`,

      short_message: 'Presupuesto {{budget_code}} generado. Válido hasta {{valid_until}}',

      email_subject: 'Presupuesto {{budget_code}} - {{company_name}}',

      action_type: 'view_accept',
      action_options: ['view', 'accept'],

      channels: {
        app: true,
        email: true,
        whatsapp: false,
        sms: false
      }
    },

    // Template: Presupuesto aceptado (notificar a vendor + admin)
    budgetAccepted: {
      key: 'alta_empresa_budget_accepted',
      module: 'budgets',
      category: 'success',
      priority: 'high',
      title: '✅ Presupuesto {{budget_code}} Aceptado',
      message: `El cliente {{client_name}} ha aceptado el presupuesto {{budget_code}}.

📋 **Información:**
- Empresa: {{company_name}}
- Valor mensual: USD {{monthly_total}}
- Vendedor: {{vendor_name}}
- Fecha de aceptación: {{accepted_at}}

🚀 **Próximo Paso Automático:** El sistema generará el contrato EULA automáticamente.`,

      short_message: '{{company_name}} aceptó presupuesto {{budget_code}}',

      action_type: null, // Notificación informativa

      channels: {
        app: true,
        email: true,
        whatsapp: true,
        sms: false
      },

      recipients: ['vendor', 'admin_aponnt']
    },

    // Template: Presupuesto vencido (notificar al vendor)
    budgetExpired: {
      key: 'alta_empresa_budget_expired',
      module: 'budgets',
      category: 'alert',
      priority: 'medium',
      title: '⏱️ Presupuesto {{budget_code}} Vencido',
      message: `El presupuesto {{budget_code}} para {{company_name}} ha vencido sin respuesta del cliente.

📋 **Acción requerida:**
- Contactar al cliente para renovar el presupuesto
- Generar nuevo presupuesto si es necesario`,

      short_message: 'Presupuesto {{budget_code}} vencido',

      action_type: 'contact_renew',
      action_options: ['contact_client', 'renew_budget'],

      channels: {
        app: true,
        email: true,
        whatsapp: false,
        sms: false
      },

      recipients: ['vendor']
    }
  },

  /**
   * FASE 2: CONTRATO EULA - Templates
   */
  contract: {

    // Template: Contrato generado (notificar al cliente)
    contractGenerated: {
      key: 'alta_empresa_contract_generated',
      module: 'contracts',
      category: 'info',
      priority: 'high',
      title: '📄 Contrato EULA {{contract_code}} Generado',
      message: `Hola {{client_name}},

Su contrato EULA ha sido generado exitosamente.

📋 **Detalles del Contrato:**
- Código: {{contract_code}}
- Empresa: {{company_name}}
- Tipo: {{contract_type}}
- Versión EULA: {{eula_version}}
- Vigencia desde: {{effective_date}}
- Vigencia hasta: {{expiration_date}}
- Renovación automática: {{auto_renew}}

👉 **Próximo Paso:** Revise y firme digitalmente el contrato para activar su cuenta.

🔒 **Firma Digital Segura:** SHA-256 + IP tracking + Timestamp`,

      short_message: 'Contrato {{contract_code}} listo para firma',

      email_subject: 'Contrato EULA {{contract_code}} - {{company_name}}',

      action_type: 'view_sign',
      action_options: ['view', 'sign'],

      channels: {
        app: true,
        email: true,
        whatsapp: false,
        sms: false
      }
    },

    // Template: Contrato firmado (notificar a vendor + admin)
    contractSigned: {
      key: 'alta_empresa_contract_signed',
      module: 'contracts',
      category: 'success',
      priority: 'high',
      title: '✍️ Contrato {{contract_code}} Firmado',
      message: `El cliente {{client_name}} ha firmado digitalmente el contrato {{contract_code}}.

📋 **Detalles de la Firma:**
- Empresa: {{company_name}}
- Firmado por: {{signed_by_name}} ({{signed_by_email}})
- Fecha y hora: {{signed_at}}
- IP de firma: {{signature_ip}}
- Hash SHA-256: {{signature_hash_preview}}

🚀 **Próximo Paso Automático:** El sistema generará la factura inicial.`,

      short_message: '{{company_name}} firmó contrato {{contract_code}}',

      action_type: null, // Informativa

      channels: {
        app: true,
        email: true,
        whatsapp: true,
        sms: false
      },

      recipients: ['vendor', 'admin_aponnt']
    }
  },

  /**
   * FASE 3: FACTURACIÓN + SUPERVISIÓN ADMIN - Templates
   */
  invoice: {

    // Template: Factura requiere supervisión (notificar a admin Aponnt)
    invoiceRequiresSupervision: {
      key: 'alta_empresa_invoice_supervision',
      module: 'invoices',
      category: 'approval_request',
      priority: 'high',
      title: '🔍 Supervisión Requerida: Factura {{invoice_code}}',
      message: `La factura {{invoice_code}} para {{company_name}} requiere supervisión administrativa.

📋 **Detalles:**
- Empresa: {{company_name}}
- Monto: USD {{invoice_amount}}
- Vendedor: {{vendor_name}}
- Motivo supervisión: {{supervision_reason}}

⚠️ **Acción Requerida:**
- Revisar factura adjunta
- Validar datos comerciales
- Aprobar o rechazar`,

      short_message: 'Factura {{invoice_code}} requiere aprobación',

      action_type: 'approve_reject',
      action_options: ['approve', 'reject', 'request_info'],
      action_deadline_hours: 24,

      channels: {
        app: true,
        email: true,
        whatsapp: true,
        sms: false
      },

      recipients: ['admin_aponnt'],
      escalation: {
        enabled: true,
        hours: 24,
        escalate_to: 'super_admin'
      }
    },

    // Template: Factura aprobada (notificar a vendor)
    invoiceApproved: {
      key: 'alta_empresa_invoice_approved',
      module: 'invoices',
      category: 'success',
      priority: 'medium',
      title: '✅ Factura {{invoice_code}} Aprobada',
      message: `La factura {{invoice_code}} para {{company_name}} ha sido aprobada.

📋 **Próximos Pasos:**
- Enviar factura al cliente
- Confirmar pago recibido
- Activar empresa definitivamente`,

      short_message: 'Factura {{invoice_code}} aprobada',

      action_type: null,

      channels: {
        app: true,
        email: true,
        whatsapp: false,
        sms: false
      },

      recipients: ['vendor']
    },

    // Template: Pago confirmado (notificar a admin + vendor)
    paymentConfirmed: {
      key: 'alta_empresa_payment_confirmed',
      module: 'invoices',
      category: 'success',
      priority: 'high',
      title: '💰 Pago Confirmado: {{company_name}}',
      message: `El pago de {{company_name}} ha sido confirmado.

📋 **Detalles:**
- Factura: {{invoice_code}}
- Monto: USD {{payment_amount}}
- Método: {{payment_method}}
- Fecha: {{payment_date}}

🚀 **Próximo Paso Automático:** Alta definitiva de la empresa.`,

      short_message: 'Pago confirmado para {{company_name}}',

      action_type: null,

      channels: {
        app: true,
        email: true,
        whatsapp: true,
        sms: false
      },

      recipients: ['vendor', 'admin_aponnt']
    }
  },

  /**
   * FASE 4: ALTA DEFINITIVA - Templates
   */
  activation: {

    // Template: Empresa activada (notificar a cliente)
    companyActivated: {
      key: 'alta_empresa_activated',
      module: 'companies',
      category: 'success',
      priority: 'urgent',
      title: '🎉 ¡Bienvenido a Aponnt! Cuenta Activada',
      message: `¡Felicitaciones {{client_name}}!

Su empresa {{company_name}} ha sido activada exitosamente en el sistema Aponnt.

🔑 **Credenciales de Acceso Administrativo:**
- Usuario: **administrador**
- Contraseña temporal: **{{temp_password}}**
- URL de acceso: {{login_url}}

⚠️ **IMPORTANTE:**
- Cambie su contraseña en el primer login
- Este usuario es INMUTABLE y no puede ser eliminado

📚 **Próximos Pasos:**
1. Acceda al sistema con las credenciales proporcionadas
2. Configure su perfil y empresa
3. Agregue usuarios y empleados
4. Explore los {{modules_count}} módulos contratados

🎓 **Recursos:**
- Centro de Ayuda: {{help_center_url}}
- Asistente IA disponible en el panel
- Soporte técnico: {{support_email}}

¡Gracias por confiar en Aponnt!`,

      short_message: 'Empresa activada. Usuario: administrador',

      email_subject: '🎉 ¡Bienvenido a Aponnt! - Credenciales de Acceso',

      action_type: 'login',
      action_options: ['login', 'view_guide'],

      channels: {
        app: false, // No puede acceder aún
        email: true,
        whatsapp: true,
        sms: true // Enviar SMS con credenciales
      }
    },

    // Template: Empresa activada (notificar a vendor)
    companyActivatedVendor: {
      key: 'alta_empresa_activated_vendor',
      module: 'companies',
      category: 'success',
      priority: 'high',
      title: '🎊 Empresa {{company_name}} Activada',
      message: `¡Excelente trabajo {{vendor_name}}!

La empresa {{company_name}} ha sido activada exitosamente.

📊 **Resumen del Alta:**
- Empresa: {{company_name}}
- Módulos contratados: {{modules_count}}
- Empleados: {{contracted_employees}}
- Valor mensual: USD {{monthly_total}}
- Trace ID: {{trace_id}}

💰 **Comisiones:**
- Se ha generado la liquidación de comisiones
- Revisa el detalle en el módulo de Comisiones

🎓 **Próximos Pasos:**
- Acompañar al cliente en su onboarding
- Asegurar correcta configuración inicial
- Capacitar al administrador`,

      short_message: '{{company_name}} activada exitosamente',

      action_type: 'view_details',
      action_options: ['view_company', 'view_commissions'],

      channels: {
        app: true,
        email: true,
        whatsapp: true,
        sms: false
      },

      recipients: ['vendor']
    }
  },

  /**
   * FASE 5: LIQUIDACIÓN DE COMISIONES - Templates
   */
  commission: {

    // Template: Comisiones liquidadas (notificar a vendor directo)
    commissionLiquidated: {
      key: 'alta_empresa_commission_liquidated',
      module: 'commissions',
      category: 'info',
      priority: 'high',
      title: '💰 Comisión Liquidada: {{company_name}}',
      message: `Se ha liquidado su comisión por el alta de {{company_name}}.

📋 **Detalles de Comisión:**
- Empresa: {{company_name}}
- Tipo: {{commission_type}}
- Porcentaje: {{commission_percentage}}%
- Base: USD {{base_amount}}
- **Monto comisión: USD {{commission_amount}}**

🏦 **Datos de Pago:**
- Banco: {{bank_name}}
- CBU: {{cbu}}
- Alias: {{alias}}

📅 **Fecha de pago estimada:** {{payment_date}}

🔍 **Código de liquidación:** {{liquidation_code}}`,

      short_message: 'Comisión USD {{commission_amount}} liquidada',

      action_type: 'view_details',
      action_options: ['view_liquidation', 'view_bank_details'],

      channels: {
        app: true,
        email: true,
        whatsapp: true,
        sms: false
      },

      recipients: ['vendor']
    },

    // Template: Comisión piramidal (notificar a vendedores upline)
    commissionPyramidal: {
      key: 'alta_empresa_commission_pyramidal',
      module: 'commissions',
      category: 'info',
      priority: 'medium',
      title: '💎 Comisión Piramidal: {{company_name}}',
      message: `Ha recibido una comisión piramidal por la venta realizada por {{direct_vendor_name}}.

📋 **Detalles:**
- Empresa vendida: {{company_name}}
- Nivel piramidal: {{pyramid_level}}
- Porcentaje: {{commission_percentage}}%
- **Monto: USD {{commission_amount}}**

👥 **Su Red:**
- Vendedor directo: {{direct_vendor_name}}
- Total vendedores en su red: {{network_size}}

🏦 **Pago a:** {{bank_name}} - {{cbu}}`,

      short_message: 'Comisión piramidal USD {{commission_amount}}',

      action_type: 'view_details',
      action_options: ['view_network', 'view_liquidation'],

      channels: {
        app: true,
        email: true,
        whatsapp: false,
        sms: false
      },

      recipients: ['vendor_upline']
    },

    // Template: Pago de comisión completado
    commissionPaid: {
      key: 'alta_empresa_commission_paid',
      module: 'commissions',
      category: 'success',
      priority: 'high',
      title: '✅ Comisión Pagada: {{company_name}}',
      message: `Su comisión por {{company_name}} ha sido pagada.

📋 **Detalles del Pago:**
- Monto: USD {{commission_amount}}
- Banco: {{bank_name}}
- CBU: {{cbu}}
- Fecha de pago: {{payment_date}}
- Código de transacción: {{transaction_id}}

📄 **Comprobante:** Adjunto en el email`,

      short_message: 'Comisión USD {{commission_amount}} pagada',

      action_type: 'download_receipt',
      action_options: ['download_receipt', 'view_details'],

      channels: {
        app: true,
        email: true,
        whatsapp: true,
        sms: true
      },

      recipients: ['vendor']
    }
  },

  /**
   * Configuración de Workflows para Alta de Empresa
   */
  workflows: [
    {
      name: 'Alta de Empresa - Supervisión Factura',
      module: 'invoices',
      notification_type: 'invoice_supervision',
      is_active: true,
      steps: [
        {
          step_number: 1,
          step_name: 'Revisión Administrador Aponnt',
          role: 'admin_aponnt',
          action_type: 'approve_reject',
          deadline_hours: 24,
          auto_escalate: true
        },
        {
          step_number: 2,
          step_name: 'Escalamiento a Super Admin',
          role: 'super_admin',
          action_type: 'approve_reject',
          deadline_hours: 12,
          auto_escalate: false
        }
      ]
    }
  ],

  /**
   * Helper: Generar notificación según evento
   */
  getTemplateByEvent(event, data = {}) {
    const templates = {
      'budget.created': this.budget.budgetCreated,
      'budget.accepted': this.budget.budgetAccepted,
      'budget.expired': this.budget.budgetExpired,
      'contract.generated': this.contract.contractGenerated,
      'contract.signed': this.contract.contractSigned,
      'invoice.requires_supervision': this.invoice.invoiceRequiresSupervision,
      'invoice.approved': this.invoice.invoiceApproved,
      'invoice.payment_confirmed': this.invoice.paymentConfirmed,
      'company.activated': this.activation.companyActivated,
      'company.activated.vendor': this.activation.companyActivatedVendor,
      'commission.liquidated': this.commission.commissionLiquidated,
      'commission.pyramidal': this.commission.commissionPyramidal,
      'commission.paid': this.commission.commissionPaid
    };

    return templates[event] || null;
  }
};
