/**
 * ============================================================================
 * HOUR BANK WORKFLOW - AUTO-GENERATED
 * ============================================================================
 *
 * ⚠️ ARCHIVO AUTO-GENERADO - NO EDITAR MANUALMENTE
 *
 * Este archivo es regenerado automáticamente por UniversalWorkflowGenerator
 * cuando cambia el código de los servicios relacionados.
 *
 * FUENTES:
 * * - HourBankService.js
 *
 * Brain detecta este archivo via LIVE_CODE_SCAN y extrae los STAGES.
 * Cualquier cambio en los servicios fuente regenerará este archivo.
 *
 * Generado: 2025-12-15T17:52:18.005Z
 * Versión: 2.0.20251215-auto
 * Módulo: hourbank
 *
 * ESTADÍSTICAS:
 * - Total stages: 70
 * - Core: 28
 * - Existentes: 0
 * - Auto-generados: 39
 * - Estados finales: 3
 *
 * ============================================================================
 */

class HourbankWorkflowGenerated {
    /**
     * STAGES - Detectados automáticamente por Brain via LIVE_CODE_SCAN
     */
    static STAGES = {
        OVERTIME_DETECTED: {
            name: 'Horas Extra Detectadas',
            order: 1,
            category: 'detection',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        TEMPLATE_LOOKUP: {
            name: 'Búsqueda de Plantilla',
            order: 2,
            category: 'configuration',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        RATE_CALCULATION: {
            name: 'Cálculo de Tasas',
            order: 3,
            category: 'calculation',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        EMPLOYEE_CHOICE: {
            name: 'Elección del Empleado',
            order: 4,
            category: 'decision',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        LOAN_REPAYMENT_CHECK: {
            name: 'Verificación de Préstamos',
            order: 5,
            category: 'validation',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        CREDIT_HOURS: {
            name: 'Acreditación de Horas',
            order: 6,
            category: 'transaction',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        BALANCE_UPDATE: {
            name: 'Actualización de Saldo',
            order: 7,
            category: 'update',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        REDEMPTION_REQUEST: {
            name: 'Solicitud de Canje',
            order: 8,
            category: 'request',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        VALIDATION_REDEMPTION: {
            name: 'Validación de Solicitud',
            order: 9,
            category: 'validation',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        LOAN_DETECTION: {
            name: 'Detección de Préstamo',
            order: 10,
            category: 'loan',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        SUPERVISOR_APPROVAL: {
            name: 'Aprobación Supervisor',
            order: 11,
            category: 'approval',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        HR_APPROVAL: {
            name: 'Aprobación RRHH',
            order: 12,
            category: 'approval',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        REDEMPTION_SCHEDULED: {
            name: 'Canje Programado',
            order: 13,
            category: 'scheduling',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        CHECKOUT_VALIDATION: {
            name: 'Validación de Checkout',
            order: 14,
            category: 'execution',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        REDEMPTION_EXECUTED: {
            name: 'Canje Ejecutado',
            order: 15,
            category: 'completion',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        LOAN_CREATION: {
            name: 'Creación de Préstamo',
            order: 16,
            category: 'loan',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        INTEREST_CALCULATION: {
            name: 'Cálculo de Interés',
            order: 17,
            category: 'loan',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        LOAN_TRACKING: {
            name: 'Seguimiento de Préstamo',
            order: 18,
            category: 'loan',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        LOAN_REPAYMENT: {
            name: 'Pago de Préstamo',
            order: 19,
            category: 'loan',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        LOAN_COMPLETED: {
            name: 'Préstamo Saldado',
            order: 20,
            category: 'completion',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        GET_APPLICABLE_TEMPLATE: {
            name: 'Get Applicable Template',
            order: 21,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getApplicableTemplate()',
            source: {
                file: 'HourBankService.js',
                function: 'getApplicableTemplate',
                line: 38
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        EXPIRATION_CHECK: {
            name: 'Verificación de Vencimiento',
            order: 22,
            category: 'expiration',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        GET_COMPANY_TEMPLATES: {
            name: 'Get Company Templates',
            order: 23,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getCompanyTemplates()',
            source: {
                file: 'HourBankService.js',
                function: 'getCompanyTemplates',
                line: 76
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        EXPIRATION_WARNING: {
            name: 'Alerta de Vencimiento',
            order: 24,
            category: 'notification',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        GET_BALANCE: {
            name: 'Get Balance',
            order: 25,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getBalance()',
            source: {
                file: 'HourBankService.js',
                function: 'getBalance',
                line: 306
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        EXPIRED_HOURS_ACTION: {
            name: 'Acción de Vencimiento',
            order: 26,
            category: 'expiration',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        RECALCULATE_BALANCE: {
            name: 'Recalculate Balance',
            order: 27,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.recalculateBalance()',
            source: {
                file: 'HourBankService.js',
                function: 'recalculateBalance',
                line: 383
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        PROCESS_OVERTIME_HOUR: {
            name: 'Process Overtime Hour',
            order: 28,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processOvertimeHour()',
            source: {
                file: 'HourBankService.js',
                function: 'processOvertimeHour',
                line: 443
            },
            validations: ["template || !template.is_enabled","template.default_action === 'bank'"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        PROCESS_EMPLOYEE_DECISION: {
            name: 'Process Employee Decision',
            order: 29,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processEmployeeDecision()',
            source: {
                file: 'HourBankService.js',
                function: 'processEmployeeDecision',
                line: 594
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_USAGE_REQUEST: {
            name: 'Create Usage Request',
            order: 30,
            category: 'persistence',
            description: 'Auto-detectado desde HourBankService.createUsageRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'createUsageRequest',
                line: 815
            },
            validations: ["template || !template.is_enabled","requestType === 'early_departure' && !template.allow_early_departure","requestType === 'late_arrival' && !template.allow_late_arrival_compensation","requestType === 'full_day' && !template.allow_full_day_usage","hoursRequested < template.min_usage_hours"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        PROCESS_REQUEST_APPROVAL: {
            name: 'Process Request Approval',
            order: 31,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processRequestApproval()',
            source: {
                file: 'HourBankService.js',
                function: 'processRequestApproval',
                line: 944
            },
            transitions_to: ["COMPLETED","FAILED"],
            isAutoGenerated: true,
        },

        PROCESS_APPROVED_REQUEST: {
            name: 'Process Approved Request',
            order: 32,
            category: 'decision',
            description: 'Auto-detectado desde HourBankService.processApprovedRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'processApprovedRequest',
                line: 1023
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        VALIDATE_EARLY_DEPARTURE: {
            name: 'Validate Early Departure',
            order: 33,
            category: 'validation',
            description: 'Auto-detectado desde HourBankService.validateEarlyDeparture()',
            source: {
                file: 'HourBankService.js',
                function: 'validateEarlyDeparture',
                line: 1096
            },
            validations: ["template?.is_enabled || !template?.allow_early_departure","balanceResult.success","balanceResult.balance.current >= hoursEarly"],
            transitions_to: ["FAILED"],
            isAutoGenerated: true,
        },

        PROCESS_EARLY_DEPARTURE: {
            name: 'Process Early Departure',
            order: 34,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processEarlyDeparture()',
            source: {
                file: 'HourBankService.js',
                function: 'processEarlyDeparture',
                line: 1141
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_TRANSACTION_HISTORY: {
            name: 'Get Transaction History',
            order: 35,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getTransactionHistory()',
            source: {
                file: 'HourBankService.js',
                function: 'getTransactionHistory',
                line: 1165
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_PENDING_REQUESTS: {
            name: 'Get Pending Requests',
            order: 36,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getPendingRequests()',
            source: {
                file: 'HourBankService.js',
                function: 'getPendingRequests',
                line: 1229
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_COMPANY_STATS: {
            name: 'Get Company Stats',
            order: 37,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getCompanyStats()',
            source: {
                file: 'HourBankService.js',
                function: 'getCompanyStats',
                line: 1268
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_TEMPLATE_BY_ID: {
            name: 'Get Template By Id',
            order: 38,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getTemplateById()',
            source: {
                file: 'HourBankService.js',
                function: 'getTemplateById',
                line: 1342
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        UPDATE_BALANCE_CACHE: {
            name: 'Update Balance Cache',
            order: 39,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.updateBalanceCache()',
            source: {
                file: 'HourBankService.js',
                function: 'updateBalanceCache',
                line: 1363
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_EMPLOYEE_FOR_DECISION: {
            name: 'Notify Employee For Decision',
            order: 40,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyEmployeeForDecision()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyEmployeeForDecision',
                line: 1385
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_ACCRUAL: {
            name: 'Notify Accrual',
            order: 41,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyAccrual()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyAccrual',
                line: 1404
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_USAGE_REQUEST: {
            name: 'Notify Usage Request',
            order: 42,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyUsageRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyUsageRequest',
                line: 1421
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_REQUEST_REJECTION: {
            name: 'Notify Request Rejection',
            order: 43,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyRequestRejection()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyRequestRejection',
                line: 1425
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECK_BUDGET_AVAILABILITY: {
            name: 'Check Budget Availability',
            order: 44,
            category: 'validation',
            description: 'Auto-detectado desde HourBankService.checkBudgetAvailability()',
            source: {
                file: 'HourBankService.js',
                function: 'checkBudgetAvailability',
                line: 1510
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_OR_UPDATE_BUDGET: {
            name: 'Create Or Update Budget',
            order: 45,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.createOrUpdateBudget()',
            source: {
                file: 'HourBankService.js',
                function: 'createOrUpdateBudget',
                line: 1543
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_DRILL_DOWN_METRICS: {
            name: 'Get Drill Down Metrics',
            order: 46,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getDrillDownMetrics()',
            source: {
                file: 'HourBankService.js',
                function: 'getDrillDownMetrics',
                line: 1601
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_EMPLOYEE_SUMMARY: {
            name: 'Get Employee Summary',
            order: 47,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getEmployeeSummary()',
            source: {
                file: 'HourBankService.js',
                function: 'getEmployeeSummary',
                line: 1705
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_EMPLOYEES_AT_RISK: {
            name: 'Get Employees At Risk',
            order: 48,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getEmployeesAtRisk()',
            source: {
                file: 'HourBankService.js',
                function: 'getEmployeesAtRisk',
                line: 1816
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_PENDING_DECISIONS: {
            name: 'Get Pending Decisions',
            order: 49,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getPendingDecisions()',
            source: {
                file: 'HourBankService.js',
                function: 'getPendingDecisions',
                line: 1884
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_REDEMPTION_REQUEST: {
            name: 'Create Redemption Request',
            order: 50,
            category: 'persistence',
            description: 'Auto-detectado desde HourBankService.createRedemptionRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'createRedemptionRequest',
                line: 1920
            },
            validations: ["validation.is_valid","template?.require_loan_justification && !loanJustification"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_REDEMPTION_REQUESTS: {
            name: 'Get Redemption Requests',
            order: 51,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getRedemptionRequests()',
            source: {
                file: 'HourBankService.js',
                function: 'getRedemptionRequests',
                line: 2084
            },
            transitions_to: ["COMPLETED"],
            isAutoGenerated: true,
        },

        PROCESS_REDEMPTION_APPROVAL: {
            name: 'Process Redemption Approval',
            order: 52,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processRedemptionApproval()',
            source: {
                file: 'HourBankService.js',
                function: 'processRedemptionApproval',
                line: 2154
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_SCHEDULED_REDEMPTIONS: {
            name: 'Get Scheduled Redemptions',
            order: 53,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getScheduledRedemptions()',
            source: {
                file: 'HourBankService.js',
                function: 'getScheduledRedemptions',
                line: 2315
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        PROCESS_REDEMPTION_CHECKOUT: {
            name: 'Process Redemption Checkout',
            order: 54,
            category: 'validation',
            description: 'Auto-detectado desde HourBankService.processRedemptionCheckout()',
            source: {
                file: 'HourBankService.js',
                function: 'processRedemptionCheckout',
                line: 2353
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_ACCOUNT_STATEMENT: {
            name: 'Get Account Statement',
            order: 55,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getAccountStatement()',
            source: {
                file: 'HourBankService.js',
                function: 'getAccountStatement',
                line: 2387
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_REDEMPTION_SUMMARY: {
            name: 'Get Redemption Summary',
            order: 56,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getRedemptionSummary()',
            source: {
                file: 'HourBankService.js',
                function: 'getRedemptionSummary',
                line: 2434
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_REDEMPTION_REQUEST: {
            name: 'Notify Redemption Request',
            order: 57,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyRedemptionRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyRedemptionRequest',
                line: 2523
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_REDEMPTION_STATUS_CHANGE: {
            name: 'Notify Redemption Status Change',
            order: 58,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyRedemptionStatusChange()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyRedemptionStatusChange',
                line: 2546
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_H_R_FOR_REDEMPTION_APPROVAL: {
            name: 'Notify H R For Redemption Approval',
            order: 59,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyHRForRedemptionApproval()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyHRForRedemptionApproval',
                line: 2571
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_LOAN_RECORD: {
            name: 'Create Loan Record',
            order: 60,
            category: 'persistence',
            description: 'Auto-detectado desde HourBankService.createLoanRecord()',
            source: {
                file: 'HourBankService.js',
                function: 'createLoanRecord',
                line: 2606
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_USER_LOAN_STATUS: {
            name: 'Get User Loan Status',
            order: 61,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getUserLoanStatus()',
            source: {
                file: 'HourBankService.js',
                function: 'getUserLoanStatus',
                line: 2703
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        EXECUTE_REDEMPTION_WITH_LOAN: {
            name: 'Execute Redemption With Loan',
            order: 62,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.executeRedemptionWithLoan()',
            source: {
                file: 'HourBankService.js',
                function: 'executeRedemptionWithLoan',
                line: 2793
            },
            validations: ["checkoutResult.success || !checkoutResult.hasRedemption"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        HOURS_ACCUMULATED: {
            name: 'Horas Acumuladas',
            order: 63,
            category: 'final',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        REDEMPTION_COMPLETED: {
            name: 'Canje Completado',
            order: 64,
            category: 'final',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        REDEMPTION_REJECTED: {
            name: 'Canje Rechazado',
            order: 65,
            category: 'final',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        LOAN_FULLY_REPAID: {
            name: 'Préstamo Saldado',
            order: 66,
            category: 'final',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        HOURS_EXPIRED: {
            name: 'Horas Vencidas',
            order: 67,
            category: 'final',
            description: 'Stage core de Hour Bank Workflow',
            transitions_to: [],
            isCore: true,
        },

        COMPLETED: {
            name: 'Completado',
            order: 68,
            category: 'success',
            description: 'Estado final',
            transitions_to: [],
            is_final: true,
            is_success: true,
        },

        FAILED: {
            name: 'Fallido',
            order: 69,
            category: 'rejection',
            description: 'Estado final',
            transitions_to: [],
            is_final: true,
            is_rejection: true,
        },

        CANCELLED: {
            name: 'Cancelado',
            order: 70,
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
        name: 'Hour Bank Workflow',
        module: 'hourbank',
        version: '2.0.20251215-auto',
        isAutoGenerated: true,
        generatedAt: '2025-12-15T17:52:18.005Z',
        sourceFiles: ["HourBankService.js"],
        entry_point: 'OVERTIME_DETECTED',
        final_states: {
            success: ["COMPLETED"],
            rejection: ["FAILED"]
        },
        stats: {"total":70,"core":28,"existing":0,"autoGenerated":39,"outcomes":3}
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

module.exports = HourbankWorkflowGenerated;
