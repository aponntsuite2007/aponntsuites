/**
 * ============================================================================
 * COMPANY ONBOARDING WORKFLOW - AUTO-GENERATED
 * ============================================================================
 *
 * ⚠️ ARCHIVO AUTO-GENERADO - NO EDITAR MANUALMENTE
 *
 * Este archivo es regenerado automáticamente por UniversalWorkflowGenerator
 * cuando cambia el código de los servicios relacionados.
 *
 * FUENTES:
 * * - OnboardingService.js
 * * - AltaEmpresaNotificationService.js
 * * - BudgetService.js
 * * - ContractService.js
 * * - InvoicingService.js
 * * - CommissionService.js
 *
 * Brain detecta este archivo via LIVE_CODE_SCAN y extrae los STAGES.
 * Cualquier cambio en los servicios fuente regenerará este archivo.
 *
 * Generado: 2025-12-18T15:40:28.879Z
 * Versión: 2.0.20251218-auto
 * Módulo: onboarding
 *
 * ESTADÍSTICAS:
 * - Total stages: 89
 * - Core: 31
 * - Existentes: 0
 * - Auto-generados: 55
 * - Estados finales: 3
 *
 * ============================================================================
 */

class OnboardingWorkflowGenerated {
    /**
     * STAGES - Detectados automáticamente por Brain via LIVE_CODE_SCAN
     */
    static STAGES = {
        VENDOR_INITIATES: {
            name: 'Vendedor Inicia',
            order: 1,
            category: 'intake',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        PRICING_CALCULATED: {
            name: 'Pricing Calculado',
            order: 2,
            category: 'calculation',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        BUDGET_GENERATED: {
            name: 'Presupuesto Generado',
            order: 3,
            category: 'document',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        BUDGET_SENT: {
            name: 'Presupuesto Enviado',
            order: 4,
            category: 'notification',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        BUDGET_NEGOTIATING: {
            name: 'En Negociación',
            order: 5,
            category: 'negotiation',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        BUDGET_ACCEPTED: {
            name: 'Presupuesto Aceptado',
            order: 6,
            category: 'decision',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        BUDGET_REJECTED: {
            name: 'Presupuesto Rechazado',
            order: 7,
            category: 'rejection',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        CONTRACT_GENERATING: {
            name: 'Generando Contrato',
            order: 8,
            category: 'document',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        CONTRACT_SENT: {
            name: 'Contrato Enviado',
            order: 9,
            category: 'notification',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        CONTRACT_SIGNED: {
            name: 'Contrato Firmado',
            order: 10,
            category: 'completion',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        INVOICE_GENERATING: {
            name: 'Generando Factura',
            order: 11,
            category: 'document',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        INVOICE_SENT: {
            name: 'Factura Enviada',
            order: 12,
            category: 'notification',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        SUPERVISION_PENDING: {
            name: 'Supervisión Pendiente',
            order: 13,
            category: 'review',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        ESCALATED_SUPERVISOR: {
            name: 'Escalado a Supervisor',
            order: 14,
            category: 'escalation',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        ESCALATED_MANAGER: {
            name: 'Escalado a Gerente',
            order: 15,
            category: 'escalation',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        PAYMENT_PENDING: {
            name: 'Pendiente de Pago',
            order: 16,
            category: 'waiting',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        PAYMENT_CONFIRMED: {
            name: 'Pago Confirmado',
            order: 17,
            category: 'completion',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        COMPANY_CREATING: {
            name: 'Creando Empresa',
            order: 18,
            category: 'creation',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        ADMIN_USER_CREATING: {
            name: 'Creando Admin',
            order: 19,
            category: 'creation',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        COMPANY_ACTIVATED: {
            name: 'Empresa Activada',
            order: 20,
            category: 'completion',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        SEND_BUDGET_NOTIFICATIONS: {
            name: 'Send Budget Notifications',
            order: 21,
            category: 'notification',
            description: 'Auto-detectado desde OnboardingService.sendBudgetNotifications()',
            source: {
                file: 'OnboardingService.js',
                function: 'sendBudgetNotifications',
                line: 90
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        HANDLE_BUDGET_RESPONSE: {
            name: 'Handle Budget Response',
            order: 22,
            category: 'lookup',
            description: 'Auto-detectado desde OnboardingService.handleBudgetResponse()',
            source: {
                file: 'OnboardingService.js',
                function: 'handleBudgetResponse',
                line: 144
            },
            validations: ["budget"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        GENERATE_CONTRACT: {
            name: 'Generate Contract',
            order: 23,
            category: 'process',
            description: 'Auto-detectado desde OnboardingService.generateContract()',
            source: {
                file: 'OnboardingService.js',
                function: 'generateContract',
                line: 209
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        SEND_CONTRACT_FOR_SIGNATURE: {
            name: 'Send Contract For Signature',
            order: 24,
            category: 'notification',
            description: 'Auto-detectado desde OnboardingService.sendContractForSignature()',
            source: {
                file: 'OnboardingService.js',
                function: 'sendContractForSignature',
                line: 247
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        HANDLE_CONTRACT_SIGNATURE: {
            name: 'Handle Contract Signature',
            order: 25,
            category: 'process',
            description: 'Auto-detectado desde OnboardingService.handleContractSignature()',
            source: {
                file: 'OnboardingService.js',
                function: 'handleContractSignature',
                line: 281
            },
            validations: ["contract"],
            transitions_to: ["FAILED"],
            isAutoGenerated: true,
        },

        GENERATE_INITIAL_INVOICE: {
            name: 'Generate Initial Invoice',
            order: 26,
            category: 'process',
            description: 'Auto-detectado desde OnboardingService.generateInitialInvoice()',
            source: {
                file: 'OnboardingService.js',
                function: 'generateInitialInvoice',
                line: 346
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        SEND_INVOICE_TO_CLIENT: {
            name: 'Send Invoice To Client',
            order: 27,
            category: 'notification',
            description: 'Auto-detectado desde OnboardingService.sendInvoiceToClient()',
            source: {
                file: 'OnboardingService.js',
                function: 'sendInvoiceToClient',
                line: 404
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_CORE_ADMIN_USER: {
            name: 'Create Core Admin User',
            order: 28,
            category: 'persistence',
            description: 'Auto-detectado desde OnboardingService.createCoreAdminUser()',
            source: {
                file: 'OnboardingService.js',
                function: 'createCoreAdminUser',
                line: 537
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        COMMISSION_CALCULATING: {
            name: 'Calculando Comisión',
            order: 29,
            category: 'calculation',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        SEND_WELCOME_EMAIL: {
            name: 'Send Welcome Email',
            order: 30,
            category: 'notification',
            description: 'Auto-detectado desde OnboardingService.sendWelcomeEmail()',
            source: {
                file: 'OnboardingService.js',
                function: 'sendWelcomeEmail',
                line: 597
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        SETTLEMENT_CREATED: {
            name: 'Liquidación Creada',
            order: 31,
            category: 'document',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        GENERATE_CONTRACT_BY_TRACE: {
            name: 'Generate Contract By Trace',
            order: 32,
            category: 'process',
            description: 'Auto-detectado desde OnboardingService.generateContractByTrace()',
            source: {
                file: 'OnboardingService.js',
                function: 'generateContractByTrace',
                line: 633
            },
            validations: ["budget"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        VENDOR_NOTIFIED: {
            name: 'Vendedor Notificado',
            order: 33,
            category: 'notification',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        HANDLE_CONTRACT_SIGNATURE_BY_TRACE: {
            name: 'Handle Contract Signature By Trace',
            order: 34,
            category: 'process',
            description: 'Auto-detectado desde OnboardingService.handleContractSignatureByTrace()',
            source: {
                file: 'OnboardingService.js',
                function: 'handleContractSignatureByTrace',
                line: 642
            },
            validations: ["budget","contract"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        FINANCE_NOTIFIED: {
            name: 'Finanzas Notificado',
            order: 35,
            category: 'notification',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        GENERATE_INVOICE_BY_TRACE: {
            name: 'Generate Invoice By Trace',
            order: 36,
            category: 'process',
            description: 'Auto-detectado desde OnboardingService.generateInvoiceByTrace()',
            source: {
                file: 'OnboardingService.js',
                function: 'generateInvoiceByTrace',
                line: 655
            },
            validations: ["budget","contract"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        COMMISSION_APPROVED: {
            name: 'Comisión Aprobada',
            order: 37,
            category: 'approval',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        SEND_WELCOME_EMAIL_BY_TRACE: {
            name: 'Send Welcome Email By Trace',
            order: 38,
            category: 'notification',
            description: 'Auto-detectado desde OnboardingService.sendWelcomeEmailByTrace()',
            source: {
                file: 'OnboardingService.js',
                function: 'sendWelcomeEmailByTrace',
                line: 698
            },
            validations: ["budget"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        COMMISSION_PAID: {
            name: 'Comisión Pagada',
            order: 39,
            category: 'completion',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        GET_ONBOARDING_STATUS: {
            name: 'Get Onboarding Status',
            order: 40,
            category: 'lookup',
            description: 'Auto-detectado desde OnboardingService.getOnboardingStatus()',
            source: {
                file: 'OnboardingService.js',
                function: 'getOnboardingStatus',
                line: 721
            },
            validations: ["budget"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_ONBOARDING_STATS: {
            name: 'Get Onboarding Stats',
            order: 41,
            category: 'lookup',
            description: 'Auto-detectado desde OnboardingService.getOnboardingStats()',
            source: {
                file: 'OnboardingService.js',
                function: 'getOnboardingStats',
                line: 857
            },
            transitions_to: ["FAILED"],
            isAutoGenerated: true,
        },

        CREATE_ADMINISTRATIVE_TASK: {
            name: 'Create Administrative Task',
            order: 42,
            category: 'persistence',
            description: 'Auto-detectado desde OnboardingService.createAdministrativeTask()',
            source: {
                file: 'OnboardingService.js',
                function: 'createAdministrativeTask',
                line: 901
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_BUDGET_CREATED: {
            name: 'Notify Budget Created',
            order: 43,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyBudgetCreated()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyBudgetCreated',
                line: 21
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_BUDGET_ACCEPTED: {
            name: 'Notify Budget Accepted',
            order: 44,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyBudgetAccepted()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyBudgetAccepted',
                line: 70
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        WELCOME_EMAIL: {
            name: 'Email de Bienvenida',
            order: 45,
            category: 'notification',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        NOTIFY_CONTRACT_GENERATED: {
            name: 'Notify Contract Generated',
            order: 46,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyContractGenerated()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyContractGenerated',
                line: 148
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        QUICKSTART_SENT: {
            name: 'Guía Enviada',
            order: 47,
            category: 'notification',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        NOTIFY_CONTRACT_SIGNED: {
            name: 'Notify Contract Signed',
            order: 48,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyContractSigned()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyContractSigned',
                line: 196
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        FOLLOWUP_SCHEDULED: {
            name: 'Seguimiento Programado',
            order: 49,
            category: 'scheduling',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        NOTIFY_INVOICE_SUPERVISION: {
            name: 'Notify Invoice Supervision',
            order: 50,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyInvoiceSupervision()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyInvoiceSupervision',
                line: 270
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_INVOICE_APPROVED: {
            name: 'Notify Invoice Approved',
            order: 51,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyInvoiceApproved()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyInvoiceApproved',
                line: 326
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_PAYMENT_CONFIRMED: {
            name: 'Notify Payment Confirmed',
            order: 52,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyPaymentConfirmed()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyPaymentConfirmed',
                line: 364
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_COMPANY_ACTIVATED: {
            name: 'Notify Company Activated',
            order: 53,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyCompanyActivated()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyCompanyActivated',
                line: 431
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_COMPANY_ACTIVATED_VENDOR: {
            name: 'Notify Company Activated Vendor',
            order: 54,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyCompanyActivatedVendor()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyCompanyActivatedVendor',
                line: 473
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_COMMISSION_LIQUIDATED: {
            name: 'Notify Commission Liquidated',
            order: 55,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyCommissionLiquidated()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyCommissionLiquidated',
                line: 512
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_COMMISSION_PYRAMIDAL: {
            name: 'Notify Commission Pyramidal',
            order: 56,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyCommissionPyramidal()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyCommissionPyramidal',
                line: 552
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_COMMISSION_PAID: {
            name: 'Notify Commission Paid',
            order: 57,
            category: 'notification',
            description: 'Auto-detectado desde AltaEmpresaNotificationService.notifyCommissionPaid()',
            source: {
                file: 'AltaEmpresaNotificationService.js',
                function: 'notifyCommissionPaid',
                line: 591
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE: {
            name: 'Create',
            order: 58,
            category: 'persistence',
            description: 'Auto-detectado desde BudgetService.create()',
            source: {
                file: 'BudgetService.js',
                function: 'create',
                line: 34
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        REJECT: {
            name: 'Reject',
            order: 59,
            category: 'decision',
            description: 'Auto-detectado desde BudgetService.reject()',
            source: {
                file: 'BudgetService.js',
                function: 'reject',
                line: 184
            },
            validations: ["budget"],
            transitions_to: ["FAILED"],
            isAutoGenerated: true,
        },

        EXPIRE_OLD_BUDGETS: {
            name: 'Expire Old Budgets',
            order: 60,
            category: 'lookup',
            description: 'Auto-detectado desde BudgetService.expireOldBudgets()',
            source: {
                file: 'BudgetService.js',
                function: 'expireOldBudgets',
                line: 261
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        FIND_BY_ID: {
            name: 'Find By Id',
            order: 61,
            category: 'lookup',
            description: 'Auto-detectado desde BudgetService.findById()',
            source: {
                file: 'BudgetService.js',
                function: 'findById',
                line: 293
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        FIND_BY_TRACE_ID: {
            name: 'Find By Trace Id',
            order: 62,
            category: 'lookup',
            description: 'Auto-detectado desde BudgetService.findByTraceId()',
            source: {
                file: 'BudgetService.js',
                function: 'findByTraceId',
                line: 316
            },
            validations: ["budget"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        FIND_BY_COMPANY: {
            name: 'Find By Company',
            order: 63,
            category: 'lookup',
            description: 'Auto-detectado desde BudgetService.findByCompany()',
            source: {
                file: 'BudgetService.js',
                function: 'findByCompany',
                line: 339
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_STATS: {
            name: 'Get Stats',
            order: 64,
            category: 'lookup',
            description: 'Auto-detectado desde BudgetService.getStats()',
            source: {
                file: 'BudgetService.js',
                function: 'getStats',
                line: 397
            },
            transitions_to: ["FAILED"],
            isAutoGenerated: true,
        },

        GENERATE_BUDGET_CODE: {
            name: 'Generate Budget Code',
            order: 65,
            category: 'lookup',
            description: 'Auto-detectado desde BudgetService.generateBudgetCode()',
            source: {
                file: 'BudgetService.js',
                function: 'generateBudgetCode',
                line: 437
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GENERATE_P_D_F: {
            name: 'Generate P D F',
            order: 66,
            category: 'process',
            description: 'Auto-detectado desde BudgetService.generatePDF()',
            source: {
                file: 'BudgetService.js',
                function: 'generatePDF',
                line: 511
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GENERATE: {
            name: 'Generate',
            order: 67,
            category: 'process',
            description: 'Auto-detectado desde ContractService.generate()',
            source: {
                file: 'ContractService.js',
                function: 'generate',
                line: 42
            },
            validations: ["budget","budget.status !== 'ACCEPTED'","company","existingContract"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        UPDATE_MODULES: {
            name: 'Update Modules',
            order: 68,
            category: 'process',
            description: 'Auto-detectado desde ContractService.updateModules()',
            source: {
                file: 'ContractService.js',
                function: 'updateModules',
                line: 174
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_ACTIVE_CONTRACT: {
            name: 'Get Active Contract',
            order: 69,
            category: 'lookup',
            description: 'Auto-detectado desde ContractService.getActiveContract()',
            source: {
                file: 'ContractService.js',
                function: 'getActiveContract',
                line: 367
            },
            validations: ["contract"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECK_EXPIRING_CONTRACTS: {
            name: 'Check Expiring Contracts',
            order: 70,
            category: 'validation',
            description: 'Auto-detectado desde ContractService.checkExpiringContracts()',
            source: {
                file: 'ContractService.js',
                function: 'checkExpiringContracts',
                line: 389
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECK_OVERDUE_CONTRACTS: {
            name: 'Check Overdue Contracts',
            order: 71,
            category: 'validation',
            description: 'Auto-detectado desde ContractService.checkOverdueContracts()',
            source: {
                file: 'ContractService.js',
                function: 'checkOverdueContracts',
                line: 414
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_SELLER_STATS: {
            name: 'Get Seller Stats',
            order: 72,
            category: 'lookup',
            description: 'Auto-detectado desde ContractService.getSellerStats()',
            source: {
                file: 'ContractService.js',
                function: 'getSellerStats',
                line: 454
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GENERATE_MONTHLY_INVOICES: {
            name: 'Generate Monthly Invoices',
            order: 73,
            category: 'process',
            description: 'Auto-detectado desde InvoicingService.generateMonthlyInvoices()',
            source: {
                file: 'InvoicingService.js',
                function: 'generateMonthlyInvoices',
                line: 142
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        APPROVE: {
            name: 'Approve',
            order: 74,
            category: 'decision',
            description: 'Auto-detectado desde InvoicingService.approve()',
            source: {
                file: 'InvoicingService.js',
                function: 'approve',
                line: 210
            },
            validations: ["invoice","invoice.status !== 'pending_approval'"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        SEND: {
            name: 'Send',
            order: 75,
            category: 'notification',
            description: 'Auto-detectado desde InvoicingService.send()',
            source: {
                file: 'InvoicingService.js',
                function: 'send',
                line: 250
            },
            validations: ["invoice"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECK_OVERDUE_INVOICES: {
            name: 'Check Overdue Invoices',
            order: 76,
            category: 'validation',
            description: 'Auto-detectado desde InvoicingService.checkOverdueInvoices()',
            source: {
                file: 'InvoicingService.js',
                function: 'checkOverdueInvoices',
                line: 371
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GENERATE_INVOICE_NUMBER: {
            name: 'Generate Invoice Number',
            order: 77,
            category: 'process',
            description: 'Auto-detectado desde InvoicingService.generateInvoiceNumber()',
            source: {
                file: 'InvoicingService.js',
                function: 'generateInvoiceNumber',
                line: 540
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CALCULATE_COMMISSION_BREAKDOWN: {
            name: 'Calculate Commission Breakdown',
            order: 78,
            category: 'process',
            description: 'Auto-detectado desde CommissionService.calculateCommissionBreakdown()',
            source: {
                file: 'CommissionService.js',
                function: 'calculateCommissionBreakdown',
                line: 147
            },
            validations: ["vendor"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_PAYMENTS: {
            name: 'Create Payments',
            order: 79,
            category: 'persistence',
            description: 'Auto-detectado desde CommissionService.createPayments()',
            source: {
                file: 'CommissionService.js',
                function: 'createPayments',
                line: 289
            },
            validations: ["liquidation","liquidation.status !== 'APPROVED'"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_SINGLE_PAYMENT: {
            name: 'Create Single Payment',
            order: 80,
            category: 'persistence',
            description: 'Auto-detectado desde CommissionService.createSinglePayment()',
            source: {
                file: 'CommissionService.js',
                function: 'createSinglePayment',
                line: 355
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        EXECUTE_PAYMENT: {
            name: 'Execute Payment',
            order: 81,
            category: 'process',
            description: 'Auto-detectado desde CommissionService.executePayment()',
            source: {
                file: 'CommissionService.js',
                function: 'executePayment',
                line: 396
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_VENDOR_STATS: {
            name: 'Get Vendor Stats',
            order: 82,
            category: 'lookup',
            description: 'Auto-detectado desde CommissionService.getVendorStats()',
            source: {
                file: 'CommissionService.js',
                function: 'getVendorStats',
                line: 475
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GENERATE_LIQUIDATION_CODE: {
            name: 'Generate Liquidation Code',
            order: 83,
            category: 'process',
            description: 'Auto-detectado desde CommissionService.generateLiquidationCode()',
            source: {
                file: 'CommissionService.js',
                function: 'generateLiquidationCode',
                line: 581
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GENERATE_PAYMENT_CODE: {
            name: 'Generate Payment Code',
            order: 84,
            category: 'process',
            description: 'Auto-detectado desde CommissionService.generatePaymentCode()',
            source: {
                file: 'CommissionService.js',
                function: 'generatePaymentCode',
                line: 617
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        ONBOARDING_COMPLETED: {
            name: 'Onboarding Completado',
            order: 85,
            category: 'final',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        ONBOARDING_CANCELLED: {
            name: 'Onboarding Cancelado',
            order: 86,
            category: 'final',
            description: 'Stage core de Company Onboarding Workflow',
            transitions_to: [],
            isCore: true,
        },

        COMPLETED: {
            name: 'Completado',
            order: 87,
            category: 'success',
            description: 'Estado final',
            transitions_to: [],
            is_final: true,
            is_success: true,
        },

        FAILED: {
            name: 'Fallido',
            order: 88,
            category: 'rejection',
            description: 'Estado final',
            transitions_to: [],
            is_final: true,
            is_rejection: true,
        },

        CANCELLED: {
            name: 'Cancelado',
            order: 89,
            category: 'final',
            description: 'Estado final',
            transitions_to: [],
            is_final: true,
        },

    };

    /**
     * WORKFLOW METADATA
     */
    static WORKFLOW_METADATA = {
        name: 'Company Onboarding Workflow',
        module: 'onboarding',
        version: '2.0.20251218-auto',
        isAutoGenerated: true,
        generatedAt: '2025-12-18T15:40:28.879Z',
        sourceFiles: ["OnboardingService.js","AltaEmpresaNotificationService.js","BudgetService.js","ContractService.js","InvoicingService.js","CommissionService.js"],
        entry_point: 'VENDOR_INITIATES',
        final_states: {
            success: ["COMPLETED"],
            rejection: ["FAILED"]
        },
        stats: {"total":89,"core":31,"existing":0,"autoGenerated":55,"outcomes":3}
    };

    /**
     * Obtener stages en orden
     */
    static getStagesInOrder() {
        return Object.entries(this.STAGES)
            .map(([key, stage]) => ({ key, ...stage }))
            .sort((a, b) => (a.order || 999) - (b.order || 999));
    }

    /**
     * Obtener stages finales
     */
    static getFinalStages() {
        return Object.entries(this.STAGES)
            .filter(([_, stage]) => stage.is_final)
            .map(([key, stage]) => ({ key, ...stage }));
    }

    /**
     * Validar transición
     */
    static isValidTransition(fromStage, toStage) {
        const from = this.STAGES[fromStage];
        if (!from || !from.transitions_to) return false;
        return from.transitions_to.includes(toStage);
    }

    /**
     * Obtener siguiente stage sugerido
     */
    static getNextSuggestedStage(currentStage) {
        const current = this.STAGES[currentStage];
        if (!current || !current.transitions_to || current.transitions_to.length === 0) return null;
        return current.transitions_to[0];
    }

    /**
     * Obtener tutorial steps para este workflow
     */
    static getTutorialSteps() {
        return this.getStagesInOrder()
            .filter(s => !s.is_final)
            .map((stage, index) => ({
                step: index + 1,
                stageId: stage.key,
                title: stage.name,
                description: stage.description || '',
                category: stage.category,
                validations: stage.validations || [],
                nextStages: stage.transitions_to || []
            }));
    }
}

module.exports = OnboardingWorkflowGenerated;
