/**
 * ============================================================================
 * COMMERCIAL NOTIFICATIONS WORKFLOW
 * ============================================================================
 *
 * Documentación del flujo completo de notificaciones en el circuito comercial
 * de alta de empresa: Presupuesto → Contrato → Firma → Renovación
 *
 * Este archivo sirve como referencia para el Brain del sistema.
 *
 * Generado: 2025-12-17
 * Versión: 1.0.0
 * Autor: Sistema de Auto-Documentación
 *
 * ============================================================================
 */

class CommercialNotificationsWorkflow {

    /**
     * Destinatario central de notificaciones comerciales
     */
    static APONNT_COMMERCIAL_EMAIL = 'aponntcomercial@gmail.com';

    /**
     * FLUJO COMPLETO DE ALTA DE EMPRESA
     *
     * ┌─────────────────────────────────────────────────────────────────────────┐
     * │ FASE 1: PRESUPUESTO                                                     │
     * ├─────────────────────────────────────────────────────────────────────────┤
     * │                                                                         │
     * │  1. Vendedor crea presupuesto (BudgetService.create())                 │
     * │     ↓                                                                   │
     * │  2. Cliente ACEPTA presupuesto (PUT /api/budgets/:id/accept)           │
     * │     ├→ 📧 aponntcomercial@gmail.com ← "✅ PRESUPUESTO ACEPTADO"        │
     * │     ├→ 📧 vendedor@email.com ← "🎉 ¡Presupuesto Aceptado!"             │
     * │     ├→ 📥 Inbox vendedor ← Notificación interna                        │
     * │     ├→ 📋 Sistema genera CONTRATO automáticamente                      │
     * │     └→ 📧 cliente@empresa.com ← "📋 Contrato Pendiente de Firma"       │
     * │                                                                         │
     * │  2b. Cliente RECHAZA presupuesto (PUT /api/budgets/:id/reject)         │
     * │     ├→ 📧 aponntcomercial@gmail.com ← "❌ PRESUPUESTO RECHAZADO"       │
     * │     ├→ 📧 vendedor@email.com ← "⚠️ Presupuesto Rechazado"              │
     * │     └→ 📥 Inbox vendedor ← Notificación con motivo                     │
     * │                                                                         │
     * └─────────────────────────────────────────────────────────────────────────┘
     *
     * ┌─────────────────────────────────────────────────────────────────────────┐
     * │ FASE 2: CONTRATO                                                        │
     * ├─────────────────────────────────────────────────────────────────────────┤
     * │                                                                         │
     * │  3. Cliente FIRMA contrato (PUT /api/contracts/:id/sign)               │
     * │     ├→ 📧 aponntcomercial@gmail.com ← "✅ CONTRATO FIRMADO"            │
     * │     ├→ 📧 vendedor@email.com ← "🎉 ¡Contrato Firmado! Comisión OK"     │
     * │     ├→ 📥 Inbox vendedor ← Notificación con link al contrato           │
     * │     └→ 📧 cliente@empresa.com ← "✅ Contrato Confirmado"               │
     * │                                                                         │
     * └─────────────────────────────────────────────────────────────────────────┘
     *
     * ┌─────────────────────────────────────────────────────────────────────────┐
     * │ FASE 3: RENOVACIÓN AUTOMÁTICA                                           │
     * ├─────────────────────────────────────────────────────────────────────────┤
     * │                                                                         │
     * │  Cron diario 6:00 AM (ContractRenewalService.runRenewalCycle())        │
     * │                                                                         │
     * │  4a. T-30 días: Alerta de renovación                                   │
     * │     ├→ 📧 aponntcomercial@gmail.com                                    │
     * │     ├→ 📧 vendedor@email.com                                           │
     * │     └→ 📧 sucursal_central@empresa.com                                 │
     * │                                                                         │
     * │  4b. T-0: Auto-extensión (60 días de gracia)                           │
     * │     ├→ 📧 aponntcomercial@gmail.com                                    │
     * │     ├→ 📧 vendedor@email.com                                           │
     * │     └→ 📧 empresa@email.com                                            │
     * │                                                                         │
     * │  4c. T+60: Suspensión por falta de renovación                          │
     * │     ├→ 📧 aponntcomercial@gmail.com                                    │
     * │     ├→ 📧 vendedor@email.com                                           │
     * │     └→ 📧 empresa@email.com                                            │
     * │                                                                         │
     * └─────────────────────────────────────────────────────────────────────────┘
     */
    static FLOW_DIAGRAM = 'See ASCII art above';

    /**
     * STAGES del workflow de notificaciones comerciales
     */
    static STAGES = {

        // =====================================================================
        // PRESUPUESTO
        // =====================================================================
        BUDGET_CREATED: {
            name: 'Presupuesto Creado',
            order: 1,
            category: 'budget',
            service: 'BudgetService.create()',
            notifications: [],
            transitions_to: ['BUDGET_SENT']
        },

        BUDGET_SENT: {
            name: 'Presupuesto Enviado',
            order: 2,
            category: 'budget',
            service: 'BudgetService.markAsSent()',
            notifications: ['client_email'],
            transitions_to: ['BUDGET_ACCEPTED', 'BUDGET_REJECTED', 'BUDGET_EXPIRED']
        },

        BUDGET_ACCEPTED: {
            name: 'Presupuesto Aceptado',
            order: 3,
            category: 'budget',
            service: 'BudgetService.accept()',
            notificationMethod: '_notifyBudgetAccepted()',
            notifications: [
                {
                    recipient: 'aponntcomercial@gmail.com',
                    channel: 'email',
                    template: 'commercial',
                    subject: '✅ PRESUPUESTO ACEPTADO: {company_name} - {budget_code}'
                },
                {
                    recipient: 'vendor_email',
                    channel: 'email',
                    template: 'vendor',
                    subject: '🎉 ¡Presupuesto Aceptado! {company_name}'
                },
                {
                    recipient: 'vendor_inbox',
                    channel: 'inbox',
                    priority: 'high',
                    type: 'budget_accepted'
                },
                {
                    recipient: 'client_email',
                    channel: 'email',
                    template: 'client',
                    subject: '📋 Contrato {contract_code} - Pendiente de Firma'
                }
            ],
            autoActions: ['CONTRACT_GENERATED'],
            transitions_to: ['CONTRACT_PENDING_SIGNATURE']
        },

        BUDGET_REJECTED: {
            name: 'Presupuesto Rechazado',
            order: 3,
            category: 'budget',
            service: 'BudgetService.reject()',
            notificationMethod: '_notifyBudgetRejected()',
            notifications: [
                {
                    recipient: 'aponntcomercial@gmail.com',
                    channel: 'email',
                    template: 'commercial',
                    subject: '❌ PRESUPUESTO RECHAZADO: {company_name} - {budget_code}'
                },
                {
                    recipient: 'vendor_email',
                    channel: 'email',
                    template: 'vendor',
                    subject: '⚠️ Presupuesto Rechazado: {company_name}'
                },
                {
                    recipient: 'vendor_inbox',
                    channel: 'inbox',
                    priority: 'medium',
                    type: 'budget_rejected',
                    includesReason: true
                }
            ],
            transitions_to: ['END_REJECTED']
        },

        // =====================================================================
        // CONTRATO
        // =====================================================================
        CONTRACT_GENERATED: {
            name: 'Contrato Generado',
            order: 4,
            category: 'contract',
            service: 'ContractService.generate()',
            triggeredBy: 'BUDGET_ACCEPTED',
            notifications: [],
            transitions_to: ['CONTRACT_PENDING_SIGNATURE']
        },

        CONTRACT_PENDING_SIGNATURE: {
            name: 'Contrato Pendiente de Firma',
            order: 5,
            category: 'contract',
            service: null,
            notifications: [],
            transitions_to: ['CONTRACT_SIGNED']
        },

        CONTRACT_SIGNED: {
            name: 'Contrato Firmado',
            order: 6,
            category: 'contract',
            service: 'ContractService.sign()',
            notificationMethod: '_notifyContractSigned()',
            notifications: [
                {
                    recipient: 'aponntcomercial@gmail.com',
                    channel: 'email',
                    template: 'commercial',
                    subject: '✅ CONTRATO FIRMADO: {company_name} - {contract_number}'
                },
                {
                    recipient: 'vendor_email',
                    channel: 'email',
                    template: 'vendor',
                    subject: '🎉 ¡Contrato Firmado! {company_name} - Comisión Confirmada'
                },
                {
                    recipient: 'vendor_inbox',
                    channel: 'inbox',
                    priority: 'high',
                    type: 'contract_signed'
                },
                {
                    recipient: 'client_email',
                    channel: 'email',
                    template: 'client',
                    subject: '✅ Contrato {contract_number} - Firma Confirmada'
                }
            ],
            capturesMetadata: ['signed_ip', 'signed_user_agent', 'signed_at'],
            transitions_to: ['COMPANY_ACTIVE']
        },

        // =====================================================================
        // RENOVACIÓN
        // =====================================================================
        CONTRACT_RENEWAL_ALERT: {
            name: 'Alerta de Renovación T-30',
            order: 10,
            category: 'renewal',
            service: 'ContractRenewalService.sendRenewalAlerts()',
            cronJob: 'contractRenewalCronJobs.js',
            timing: 'T-30 días antes de expiración',
            notifications: [
                {
                    recipient: 'aponntcomercial@gmail.com',
                    channel: 'email',
                    template: 'renewal_alert'
                },
                {
                    recipient: 'vendor_email',
                    channel: 'email',
                    template: 'renewal_alert_vendor'
                },
                {
                    recipient: 'company_central_branch_email',
                    channel: 'email',
                    template: 'renewal_alert_client'
                }
            ],
            transitions_to: ['CONTRACT_AUTO_EXTENDED', 'CONTRACT_RENEWED']
        },

        CONTRACT_AUTO_EXTENDED: {
            name: 'Auto-Extensión (Grace Period)',
            order: 11,
            category: 'renewal',
            service: 'ContractRenewalService.applyAutoExtensions()',
            timing: 'T-0 (día de expiración)',
            gracePeriod: '60 días',
            notifications: [
                {
                    recipient: 'aponntcomercial@gmail.com',
                    channel: 'email',
                    template: 'auto_extension'
                },
                {
                    recipient: 'vendor_email',
                    channel: 'email',
                    template: 'auto_extension_vendor'
                },
                {
                    recipient: 'company_email',
                    channel: 'email',
                    template: 'auto_extension_client'
                }
            ],
            transitions_to: ['CONTRACT_RENEWED', 'CONTRACT_SUSPENDED']
        },

        CONTRACT_SUSPENDED: {
            name: 'Contrato Suspendido',
            order: 12,
            category: 'renewal',
            service: 'ContractRenewalService.suspendExpiredContracts()',
            timing: 'T+60 (después de grace period)',
            notifications: [
                {
                    recipient: 'aponntcomercial@gmail.com',
                    channel: 'email',
                    template: 'suspension'
                },
                {
                    recipient: 'vendor_email',
                    channel: 'email',
                    template: 'suspension_vendor'
                },
                {
                    recipient: 'company_email',
                    channel: 'email',
                    template: 'suspension_client'
                }
            ],
            transitions_to: ['CONTRACT_REACTIVATED', 'END_SUSPENDED']
        },

        // =====================================================================
        // ESTADOS FINALES
        // =====================================================================
        COMPANY_ACTIVE: {
            name: 'Empresa Activa',
            order: 100,
            category: 'final',
            isFinal: true
        },

        END_REJECTED: {
            name: 'Presupuesto Rechazado (Fin)',
            order: 101,
            category: 'final',
            isFinal: true
        },

        END_SUSPENDED: {
            name: 'Contrato Suspendido (Fin)',
            order: 102,
            category: 'final',
            isFinal: true
        }
    };

    /**
     * SERVICIOS INVOLUCRADOS
     */
    static SERVICES = {
        BudgetService: {
            file: 'src/services/BudgetService.js',
            methods: ['create', 'accept', 'reject', '_notifyBudgetAccepted', '_notifyBudgetRejected']
        },
        ContractService: {
            file: 'src/services/ContractService.js',
            methods: ['generate', 'sign', '_notifyContractSigned']
        },
        ContractRenewalService: {
            file: 'src/services/ContractRenewalService.js',
            methods: ['runRenewalCycle', 'sendRenewalAlerts', 'applyAutoExtensions', 'suspendExpiredContracts']
        },
        EmailService: {
            file: 'src/services/EmailService.js',
            methods: ['sendFromAponnt', 'sendFromCompany']
        }
    };

    /**
     * CRON JOBS
     */
    static CRON_JOBS = {
        contractRenewal: {
            file: 'src/cron/contractRenewalCronJobs.js',
            schedule: '0 6 * * *',
            description: 'Ciclo de renovación diario 6:00 AM',
            timezone: 'America/Argentina/Buenos_Aires'
        },
        contractStats: {
            file: 'src/cron/contractRenewalCronJobs.js',
            schedule: '0 8 * * 1',
            description: 'Estadísticas de contratos Lunes 8:00 AM',
            timezone: 'America/Argentina/Buenos_Aires'
        }
    };

    /**
     * TABLAS DE BASE DE DATOS
     */
    static DATABASE_TABLES = {
        budgets: 'Presupuestos comerciales',
        contracts: 'Contratos digitales (EULA)',
        contract_templates: 'Templates de contratos por país',
        aponnt_notifications: 'Notificaciones internas del staff',
        email_logs: 'Log de emails enviados'
    };

    /**
     * APIs RELACIONADAS
     */
    static API_ENDPOINTS = {
        budgets: {
            base: '/api/budgets',
            accept: 'PUT /:id/accept',
            reject: 'PUT /:id/reject'
        },
        contracts: {
            base: '/api/contracts',
            sign: 'PUT /:id/sign',
            renewalStats: 'GET /renewal/stats',
            renewalPending: 'GET /renewal/pending'
        }
    };
}

module.exports = CommercialNotificationsWorkflow;
