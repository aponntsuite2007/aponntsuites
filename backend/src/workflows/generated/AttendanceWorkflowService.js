/**
 * ============================================================================
 * ATTENDANCE WORKFLOW - AUTO-GENERATED
 * ============================================================================
 *
 * ⚠️ ARCHIVO AUTO-GENERADO - NO EDITAR MANUALMENTE
 *
 * Este archivo es regenerado automáticamente por UniversalWorkflowGenerator
 * cuando cambia el código de los servicios relacionados.
 *
 * FUENTES:
 * * - LateArrivalAuthorizationService.js
 * * - CalendarioLaboralService.js
 * * - ShiftCalculatorService.js
 * * - OrganizationalHierarchyService.js
 * * - AttendanceAnalyticsService.js
 * * - AttendanceScoringEngine.js
 * * - AttendanceWorkflowService.js
 * * - HourBankService.js
 *
 * Brain detecta este archivo via LIVE_CODE_SCAN y extrae los STAGES.
 * Cualquier cambio en los servicios fuente regenerará este archivo.
 *
 * Generado: 2026-01-26T02:02:14.671Z
 * Versión: 2.0.20260125-auto
 * Módulo: attendance
 *
 * ESTADÍSTICAS:
 * - Total stages: 152
 * - Core: 37
 * - Existentes: 21
 * - Auto-generados: 94
 * - Estados finales: 0
 *
 * ============================================================================
 */

class AttendanceWorkflowGenerated {
    /**
     * STAGES - Detectados automáticamente por Brain via LIVE_CODE_SCAN
     */
    static STAGES = {
        BIOMETRIC_CAPTURE: {
            name: 'Captura Biométrica',
            order: 1,
            category: 'identification',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        FACE_DETECTION: {
            name: 'Detección Facial',
            order: 2,
            category: 'identification',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        IDENTIFICATION: {
            name: 'Identificación',
            order: 3,
            category: 'identification',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        LIVENESS_CHECK: {
            name: 'Verificación de Vida',
            order: 4,
            category: 'security',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        FACE_MATCHING: {
            name: 'Matching Facial',
            order: 5,
            category: 'identification',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        FIND_AUTHORIZER: {
            name: 'Find Authorizer',
            order: 6,
            category: 'authorization',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        USER_IDENTIFICATION: {
            name: 'Identificación de Usuario',
            order: 7,
            category: 'identification',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        VERIFY_SAME_SHIFT: {
            name: 'Verify Same Shift',
            order: 8,
            category: 'validation',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        COMPANY_ISOLATION: {
            name: 'Aislamiento de Empresa',
            order: 9,
            category: 'security',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        CHECK_AVAILABILITY: {
            name: 'Check Availability',
            order: 10,
            category: 'validation',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        USER_VALIDATION: {
            name: 'Validación de Usuario',
            order: 11,
            category: 'validation',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        ESCALATE_SAME_SHIFT: {
            name: 'Escalate Same Shift',
            order: 12,
            category: 'lookup',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        SEND_AUTHORIZATION_REQUEST: {
            name: 'Send Authorization Request',
            order: 13,
            category: 'authorization',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        SEND_UNIFIED_NOTIFICATION: {
            name: 'Send Unified Notification',
            order: 14,
            category: 'notification',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        SHIFT_LOOKUP: {
            name: 'Búsqueda de Turno',
            order: 15,
            category: 'scheduling',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        NOTIFY_EMPLOYEE_WAITING: {
            name: 'Notify Employee Waiting',
            order: 16,
            category: 'notification',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        SHIFT_VALIDATION: {
            name: 'Validación de Turno',
            order: 17,
            category: 'scheduling',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        NOTIFY_AUTHORIZATION_RESULT: {
            name: 'Notify Authorization Result',
            order: 18,
            category: 'authorization',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        HOLIDAY_CHECK: {
            name: 'Verificación de Feriado',
            order: 19,
            category: 'calendar',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        CHECK_WORKING_DAY: {
            name: 'Check Working Day',
            order: 20,
            category: 'process',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        TOLERANCE_CHECK: {
            name: 'Verificación de Tolerancia',
            order: 21,
            category: 'validation',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        CHECK_HOLIDAY: {
            name: 'Check Holiday',
            order: 22,
            category: 'validation',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        CHECK_COMPANY_DAY: {
            name: 'Check Company Day',
            order: 23,
            category: 'validation',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        CALCULATE_SHIFT: {
            name: 'Calculate Shift',
            order: 24,
            category: 'process',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        GET_ESCALATION_CHAIN: {
            name: 'Get Escalation Chain',
            order: 25,
            category: 'lookup',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        GET_SUPERVISOR: {
            name: 'Get Supervisor',
            order: 26,
            category: 'lookup',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        LATE_DETECTION: {
            name: 'Detección de Tardanza',
            order: 27,
            category: 'detection',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        LATE_MINUTES_CALC: {
            name: 'Cálculo de Minutos Tarde',
            order: 28,
            category: 'calculation',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        LATE_AUTHORIZATION_CHECK: {
            name: 'Verificación de Autorización',
            order: 29,
            category: 'authorization',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        SUPERVISOR_PRESENT_CHECK: {
            name: 'Supervisor Presente',
            order: 30,
            category: 'authorization',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        LATE_JUSTIFICATION: {
            name: 'Justificación de Tardanza',
            order: 31,
            category: 'authorization',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        LATE_APPROVAL_WORKFLOW: {
            name: 'Workflow de Aprobación',
            order: 32,
            category: 'workflow',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        CHECKOUT_CAPTURE: {
            name: 'Captura de Salida',
            order: 33,
            category: 'identification',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        CHECKOUT_VALIDATION: {
            name: 'Validación de Salida',
            order: 34,
            category: 'validation',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        HOURS_CALCULATION: {
            name: 'Cálculo de Horas',
            order: 35,
            category: 'calculation',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        OVERTIME_DETECTION: {
            name: 'Detección de Horas Extra',
            order: 36,
            category: 'detection',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        EARLY_DEPARTURE_CHECK: {
            name: 'Verificación Salida Anticipada',
            order: 37,
            category: 'validation',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        HOUR_BANK_CHECK: {
            name: 'Verificación Banco de Horas',
            order: 38,
            category: 'integration',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        REDEMPTION_VALIDATION: {
            name: 'Validación de Canje',
            order: 39,
            category: 'integration',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        OVERTIME_TO_BANK: {
            name: 'Horas Extra a Banco',
            order: 40,
            category: 'integration',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        LOAN_REPAYMENT_TRIGGER: {
            name: 'Trigger Pago Préstamo',
            order: 41,
            category: 'integration',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        ATTENDANCE_SCORING: {
            name: 'Scoring de Asistencia',
            order: 42,
            category: 'analytics',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        PATTERN_ANALYSIS: {
            name: 'Análisis de Patrones',
            order: 43,
            category: 'analytics',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        ANOMALY_DETECTION: {
            name: 'Detección de Anomalías',
            order: 44,
            category: 'analytics',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        FIND_AUTHORIZERS_FOR_DEPARTMENT: {
            name: 'Find Authorizers For Department',
            order: 45,
            category: 'authorization',
            description: 'Auto-detectado desde LateArrivalAuthorizationService.findAuthorizersForDepartment()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: 'findAuthorizersForDepartment',
                line: 47
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_LATE_ARRIVAL: {
            name: 'Notificar Tardanza',
            order: 46,
            category: 'notification',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        FIND_AUTHORIZERS_HIERARCHICAL: {
            name: 'Find Authorizers Hierarchical',
            order: 47,
            category: 'authorization',
            description: 'Auto-detectado desde LateArrivalAuthorizationService.findAuthorizersHierarchical()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: 'findAuthorizersHierarchical',
                line: 70
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_ABSENCE: {
            name: 'Notificar Ausencia',
            order: 48,
            category: 'notification',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        FIND_AUTHORIZERS_SIMPLE_FALLBACK: {
            name: 'Find Authorizers Simple Fallback',
            order: 49,
            category: 'authorization',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._findAuthorizersSimpleFallback()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_findAuthorizersSimpleFallback',
                line: 225
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_OVERTIME: {
            name: 'Notificar Horas Extra',
            order: 50,
            category: 'notification',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        FIND_AUTHORIZERS_BY_HIERARCHY: {
            name: 'Find Authorizers By Hierarchy',
            order: 51,
            category: 'authorization',
            description: 'Auto-detectado desde LateArrivalAuthorizationService.findAuthorizersByHierarchy()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: 'findAuthorizersByHierarchy',
                line: 290
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECK_SUPERVISOR_SAME_SHIFT: {
            name: 'Check Supervisor Same Shift',
            order: 52,
            category: 'validation',
            description: 'Auto-detectado desde LateArrivalAuthorizationService.checkSupervisorSameShift()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: 'checkSupervisorSameShift',
                line: 517
            },
            transitions_to: ["FAILED"],
            isAutoGenerated: true,
        },

        CHECK_SUPERVISOR_AVAILABILITY: {
            name: 'Check Supervisor Availability',
            order: 53,
            category: 'validation',
            description: 'Auto-detectado desde LateArrivalAuthorizationService.checkSupervisorAvailability()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: 'checkSupervisorAvailability',
                line: 591
            },
            validations: ["result"],
            transitions_to: ["COMPLETED","FAILED"],
            isAutoGenerated: true,
        },

        FIND_R_R_H_H_BY_POSITION: {
            name: 'Find R R H H By Position',
            order: 54,
            category: 'lookup',
            description: 'Auto-detectado desde LateArrivalAuthorizationService.findRRHHByPosition()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: 'findRRHHByPosition',
                line: 690
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        FIND_SUPERVISOR_WITH_SAME_SHIFT: {
            name: 'Find Supervisor With Same Shift',
            order: 55,
            category: 'lookup',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._findSupervisorWithSameShift()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_findSupervisorWithSameShift',
                line: 734
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_EMPLOYEE_HIERARCHY_CONTEXT: {
            name: 'Get Employee Hierarchy Context',
            order: 56,
            category: 'lookup',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._getEmployeeHierarchyContext()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_getEmployeeHierarchyContext',
                line: 819
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        SEND_EMAIL_NOTIFICATION: {
            name: 'Send Email Notification',
            order: 57,
            category: 'notification',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._sendEmailNotification()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_sendEmailNotification',
                line: 1047
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        SEND_WHATS_APP_NOTIFICATION: {
            name: 'Send Whats App Notification',
            order: 58,
            category: 'notification',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._sendWhatsAppNotification()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_sendWhatsAppNotification',
                line: 1130
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        SEND_WEB_SOCKET_NOTIFICATION: {
            name: 'Send Web Socket Notification',
            order: 59,
            category: 'notification',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._sendWebSocketNotification()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_sendWebSocketNotification',
                line: 1191
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        SEND_FALLBACK_NOTIFICATION: {
            name: 'Send Fallback Notification',
            order: 60,
            category: 'notification',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._sendFallbackNotification()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_sendFallbackNotification',
                line: 1229
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        SEND_VIA_UNIFIED_NOTIFICATION_SYSTEM: {
            name: 'Send Via Unified Notification System',
            order: 61,
            category: 'notification',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._sendViaUnifiedNotificationSystem()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_sendViaUnifiedNotificationSystem',
                line: 1331
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_EMPLOYEE_REQUEST_SENT: {
            name: 'Notify Employee Request Sent',
            order: 62,
            category: 'notification',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._notifyEmployeeRequestSent()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_notifyEmployeeRequestSent',
                line: 1487
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        UPDATE_NOTIFIED_AUTHORIZERS: {
            name: 'Update Notified Authorizers',
            order: 63,
            category: 'authorization',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._updateNotifiedAuthorizers()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_updateNotifiedAuthorizers',
                line: 1546
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECK_ACTIVE_AUTHORIZATION_WINDOW: {
            name: 'Check Active Authorization Window',
            order: 64,
            category: 'validation',
            description: 'Auto-detectado desde LateArrivalAuthorizationService.checkActiveAuthorizationWindow()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: 'checkActiveAuthorizationWindow',
                line: 2003
            },
            transitions_to: ["COMPLETED"],
            isAutoGenerated: true,
        },

        SEND_EMPLOYEE_NOTIFICATION_EMAIL: {
            name: 'Send Employee Notification Email',
            order: 65,
            category: 'notification',
            description: 'Auto-detectado desde LateArrivalAuthorizationService.sendEmployeeNotificationEmail()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: 'sendEmployeeNotificationEmail',
                line: 2054
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        SEND_EMPLOYEE_RESULT_EMAIL: {
            name: 'Send Employee Result Email',
            order: 66,
            category: 'notification',
            description: 'Auto-detectado desde LateArrivalAuthorizationService._sendEmployeeResultEmail()',
            source: {
                file: 'LateArrivalAuthorizationService.js',
                function: '_sendEmployeeResultEmail',
                line: 2184
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GENERATE_CALENDAR: {
            name: 'Generate Calendar',
            order: 67,
            category: 'process',
            description: 'Auto-detectado desde CalendarioLaboralService.generateCalendar()',
            source: {
                file: 'CalendarioLaboralService.js',
                function: 'generateCalendar',
                line: 197
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_EMPLOYEES_EXPECTED_TO_WORK: {
            name: 'Get Employees Expected To Work',
            order: 68,
            category: 'lookup',
            description: 'Auto-detectado desde CalendarioLaboralService.getEmployeesExpectedToWork()',
            source: {
                file: 'CalendarioLaboralService.js',
                function: 'getEmployeesExpectedToWork',
                line: 235
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECK_HOLIDAY_EXCEPTION: {
            name: 'Check Holiday Exception',
            order: 69,
            category: 'validation',
            description: 'Auto-detectado desde CalendarioLaboralService.checkHolidayException()',
            source: {
                file: 'CalendarioLaboralService.js',
                function: 'checkHolidayException',
                line: 366
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECK_COMPANY_NON_WORKING_DAY: {
            name: 'Check Company Non Working Day',
            order: 70,
            category: 'validation',
            description: 'Auto-detectado desde CalendarioLaboralService.checkCompanyNonWorkingDay()',
            source: {
                file: 'CalendarioLaboralService.js',
                function: 'checkCompanyNonWorkingDay',
                line: 397
            },
            validations: ["nonWorking.length > 0"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_USER_CONTEXT: {
            name: 'Get User Context',
            order: 71,
            category: 'lookup',
            description: 'Auto-detectado desde CalendarioLaboralService.getUserContext()',
            source: {
                file: 'CalendarioLaboralService.js',
                function: 'getUserContext',
                line: 439
            },
            validations: ["user","user.is_active","department","branch"],
            transitions_to: ["FAILED"],
            isAutoGenerated: true,
        },

        CREATE_NON_WORKING_DAY: {
            name: 'Create Non Working Day',
            order: 72,
            category: 'persistence',
            description: 'Auto-detectado desde CalendarioLaboralService.createNonWorkingDay()',
            source: {
                file: 'CalendarioLaboralService.js',
                function: 'createNonWorkingDay',
                line: 513
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_UPCOMING_HOLIDAYS: {
            name: 'Get Upcoming Holidays',
            order: 73,
            category: 'lookup',
            description: 'Auto-detectado desde CalendarioLaboralService.getUpcomingHolidays()',
            source: {
                file: 'CalendarioLaboralService.js',
                function: 'getUpcomingHolidays',
                line: 576
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_MONTH_STATISTICS: {
            name: 'Get Month Statistics',
            order: 74,
            category: 'lookup',
            description: 'Auto-detectado desde CalendarioLaboralService.getMonthStatistics()',
            source: {
                file: 'CalendarioLaboralService.js',
                function: 'getMonthStatistics',
                line: 598
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CALCULATE_USER_SHIFT_FOR_DATE: {
            name: 'Calculate User Shift For Date',
            order: 75,
            category: 'process',
            description: 'Auto-detectado desde ShiftCalculatorService.calculateUserShiftForDate()',
            source: {
                file: 'ShiftCalculatorService.js',
                function: 'calculateUserShiftForDate',
                line: 34
            },
            validations: ["shift.shiftType !== 'rotative'"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_USERS_EXPECTED_TO_WORK: {
            name: 'Get Users Expected To Work',
            order: 76,
            category: 'lookup',
            description: 'Auto-detectado desde ShiftCalculatorService.getUsersExpectedToWork()',
            source: {
                file: 'ShiftCalculatorService.js',
                function: 'getUsersExpectedToWork',
                line: 327
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GENERATE_USER_CALENDAR: {
            name: 'Generate User Calendar',
            order: 77,
            category: 'process',
            description: 'Auto-detectado desde ShiftCalculatorService.generateUserCalendar()',
            source: {
                file: 'ShiftCalculatorService.js',
                function: 'generateUserCalendar',
                line: 398
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_ORGANIZATION_TREE: {
            name: 'Get Organization Tree',
            order: 78,
            category: 'lookup',
            description: 'Auto-detectado desde OrganizationalHierarchyService.getOrganizationTree()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'getOrganizationTree',
                line: 27
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECKIN_COMPLETED: {
            name: 'Entrada Registrada',
            order: 79,
            category: 'final',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        GET_ORGANIZATION_FLAT: {
            name: 'Get Organization Flat',
            order: 80,
            category: 'lookup',
            description: 'Auto-detectado desde OrganizationalHierarchyService.getOrganizationFlat()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'getOrganizationFlat',
                line: 48
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECKOUT_COMPLETED: {
            name: 'Salida Registrada',
            order: 81,
            category: 'final',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        GET_IMMEDIATE_SUPERVISOR: {
            name: 'Get Immediate Supervisor',
            order: 82,
            category: 'lookup',
            description: 'Auto-detectado desde OrganizationalHierarchyService.getImmediateSupervisor()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'getImmediateSupervisor',
                line: 125
            },
            validations: ["userQuery.length || !userQuery[0].parent_position_id","supervisorQuery.length"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        LATE_RECORDED: {
            name: 'Tardanza Registrada',
            order: 83,
            category: 'final',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        GET_POSITION_ANCESTORS: {
            name: 'Get Position Ancestors',
            order: 84,
            category: 'lookup',
            description: 'Auto-detectado desde OrganizationalHierarchyService.getPositionAncestors()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'getPositionAncestors',
                line: 184
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        IDENTIFICATION_FAILED: {
            name: 'Identificación Fallida',
            order: 85,
            category: 'final',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        GET_POSITION_DESCENDANTS: {
            name: 'Get Position Descendants',
            order: 86,
            category: 'lookup',
            description: 'Auto-detectado desde OrganizationalHierarchyService.getPositionDescendants()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'getPositionDescendants',
                line: 204
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        UNAUTHORIZED_ACCESS: {
            name: 'Acceso No Autorizado',
            order: 87,
            category: 'final',
            description: 'Stage core de Attendance Workflow',
            transitions_to: [],
            isCore: true,
        },

        CAN_APPROVE_REQUEST: {
            name: 'Can Approve Request',
            order: 88,
            category: 'decision',
            description: 'Auto-detectado desde OrganizationalHierarchyService.canApproveRequest()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'canApproveRequest',
                line: 226
            },
            validations: ["approver.length || !requester.length","approverData.can_approve_permissions","approverData.hierarchy_level >= requesterData.hierarchy_level","approverData.max_approval_days > 0 && daysRequested > approverData.max_approval_"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        UPDATE_COMPANY_PATHS: {
            name: 'Update Company Paths',
            order: 89,
            category: 'process',
            description: 'Auto-detectado desde OrganizationalHierarchyService.updateCompanyPaths()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'updateCompanyPaths',
                line: 334
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_ORG_STATS: {
            name: 'Get Org Stats',
            order: 90,
            category: 'lookup',
            description: 'Auto-detectado desde OrganizationalHierarchyService.getOrgStats()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'getOrgStats',
                line: 352
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_FLOWCHART_DATA: {
            name: 'Get Flowchart Data',
            order: 91,
            category: 'lookup',
            description: 'Auto-detectado desde OrganizationalHierarchyService.getFlowchartData()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'getFlowchartData',
                line: 397
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_NEXT_APPROVER: {
            name: 'Get Next Approver',
            order: 92,
            category: 'lookup',
            description: 'Auto-detectado desde OrganizationalHierarchyService.getNextApprover()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'getNextApprover',
                line: 499
            },
            validations: ["currentApprover.length || !currentApprover[0].parent_position_id","parentUser.length"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_DIRECT_REPORTS: {
            name: 'Get Direct Reports',
            order: 93,
            category: 'lookup',
            description: 'Auto-detectado desde OrganizationalHierarchyService.getDirectReports()',
            source: {
                file: 'OrganizationalHierarchyService.js',
                function: 'getDirectReports',
                line: 569
            },
            validations: ["userPos.length || !userPos[0].organizational_position_id"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        REJECTED_QUALITY: {
            name: 'Rechazado - Calidad',
            order: 94,
            category: 'rejection',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        GENERATE_O_L_A_P_CUBE: {
            name: 'Generate O L A P Cube',
            order: 95,
            category: 'process',
            description: 'Auto-detectado desde AttendanceAnalyticsService.generateOLAPCube()',
            source: {
                file: 'AttendanceAnalyticsService.js',
                function: 'generateOLAPCube',
                line: 259
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        REJECTED_NO_MATCH: {
            name: 'Rechazado - No Match',
            order: 96,
            category: 'rejection',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        GENERATE_WEEKLY_SNAPSHOT: {
            name: 'Generate Weekly Snapshot',
            order: 97,
            category: 'process',
            description: 'Auto-detectado desde AttendanceAnalyticsService.generateWeeklySnapshot()',
            source: {
                file: 'AttendanceAnalyticsService.js',
                function: 'generateWeeklySnapshot',
                line: 365
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        REJECTED_SUSPENDED: {
            name: 'Rechazado - Suspendido',
            order: 98,
            category: 'rejection',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        GET_RANKINGS: {
            name: 'Get Rankings',
            order: 99,
            category: 'lookup',
            description: 'Auto-detectado desde AttendanceAnalyticsService.getRankings()',
            source: {
                file: 'AttendanceAnalyticsService.js',
                function: 'getRankings',
                line: 451
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        REJECTED_NO_SHIFT: {
            name: 'Rechazado - Sin Turno',
            order: 100,
            category: 'rejection',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        INVALIDATE_CACHE: {
            name: 'Invalidate Cache',
            order: 101,
            category: 'validation',
            description: 'Auto-detectado desde AttendanceAnalyticsService.invalidateCache()',
            source: {
                file: 'AttendanceAnalyticsService.js',
                function: 'invalidateCache',
                line: 523
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        REJECTED_LATE_NO_AUTH: {
            name: 'Rechazado - Sin Autorización',
            order: 102,
            category: 'rejection',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        GENERATE_DEPARTMENT_STATS: {
            name: 'Generate Department Stats',
            order: 103,
            category: 'process',
            description: 'Auto-detectado desde AttendanceAnalyticsService._generateDepartmentStats()',
            source: {
                file: 'AttendanceAnalyticsService.js',
                function: '_generateDepartmentStats',
                line: 546
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        REGISTERED: {
            name: 'Fichaje Registrado',
            order: 104,
            category: 'success',
            source: {
                file: 'undefined',
                function: 'undefined',
                line: undefined
            },
            transitions_to: [],
            isExisting: true,
        },

        GENERATE_SHIFT_STATS: {
            name: 'Generate Shift Stats',
            order: 105,
            category: 'process',
            description: 'Auto-detectado desde AttendanceAnalyticsService._generateShiftStats()',
            source: {
                file: 'AttendanceAnalyticsService.js',
                function: '_generateShiftStats',
                line: 576
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CALCULATE_USER_SCORING: {
            name: 'Calculate User Scoring',
            order: 106,
            category: 'process',
            description: 'Auto-detectado desde AttendanceScoringEngine.calculateUserScoring()',
            source: {
                file: 'AttendanceScoringEngine.js',
                function: 'calculateUserScoring',
                line: 24
            },
            validations: ["user"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        CALCULATE_BASE_METRICS: {
            name: 'Calculate Base Metrics',
            order: 107,
            category: 'process',
            description: 'Auto-detectado desde AttendanceScoringEngine._calculateBaseMetrics()',
            source: {
                file: 'AttendanceScoringEngine.js',
                function: '_calculateBaseMetrics',
                line: 166
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        RECALCULATE_COMPANY_SCORING: {
            name: 'Recalculate Company Scoring',
            order: 108,
            category: 'process',
            description: 'Auto-detectado desde AttendanceScoringEngine.recalculateCompanyScoring()',
            source: {
                file: 'AttendanceScoringEngine.js',
                function: 'recalculateCompanyScoring',
                line: 373
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_COMPANY_SCORING_STATS: {
            name: 'Get Company Scoring Stats',
            order: 109,
            category: 'lookup',
            description: 'Auto-detectado desde AttendanceScoringEngine.getCompanyScoringStats()',
            source: {
                file: 'AttendanceScoringEngine.js',
                function: 'getCompanyScoringStats',
                line: 426
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_APPLICABLE_TEMPLATE: {
            name: 'Get Applicable Template',
            order: 110,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getApplicableTemplate()',
            source: {
                file: 'HourBankService.js',
                function: 'getApplicableTemplate',
                line: 63
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_COMPANY_TEMPLATES: {
            name: 'Get Company Templates',
            order: 111,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getCompanyTemplates()',
            source: {
                file: 'HourBankService.js',
                function: 'getCompanyTemplates',
                line: 101
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_BALANCE: {
            name: 'Get Balance',
            order: 112,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getBalance()',
            source: {
                file: 'HourBankService.js',
                function: 'getBalance',
                line: 331
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        RECALCULATE_BALANCE: {
            name: 'Recalculate Balance',
            order: 113,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.recalculateBalance()',
            source: {
                file: 'HourBankService.js',
                function: 'recalculateBalance',
                line: 420
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        PROCESS_OVERTIME_HOUR: {
            name: 'Process Overtime Hour',
            order: 114,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processOvertimeHour()',
            source: {
                file: 'HourBankService.js',
                function: 'processOvertimeHour',
                line: 480
            },
            validations: ["template || !template.is_enabled","template.default_action === 'bank'"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        PROCESS_EMPLOYEE_DECISION: {
            name: 'Process Employee Decision',
            order: 115,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processEmployeeDecision()',
            source: {
                file: 'HourBankService.js',
                function: 'processEmployeeDecision',
                line: 631
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_USAGE_REQUEST: {
            name: 'Create Usage Request',
            order: 116,
            category: 'persistence',
            description: 'Auto-detectado desde HourBankService.createUsageRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'createUsageRequest',
                line: 852
            },
            validations: ["template || !template.is_enabled","requestType === 'early_departure' && !template.allow_early_departure","requestType === 'late_arrival' && !template.allow_late_arrival_compensation","requestType === 'full_day' && !template.allow_full_day_usage","hoursRequested < template.min_usage_hours"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        PROCESS_REQUEST_APPROVAL: {
            name: 'Process Request Approval',
            order: 117,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processRequestApproval()',
            source: {
                file: 'HourBankService.js',
                function: 'processRequestApproval',
                line: 981
            },
            transitions_to: ["COMPLETED","FAILED"],
            isAutoGenerated: true,
        },

        PROCESS_APPROVED_REQUEST: {
            name: 'Process Approved Request',
            order: 118,
            category: 'decision',
            description: 'Auto-detectado desde HourBankService.processApprovedRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'processApprovedRequest',
                line: 1060
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        VALIDATE_EARLY_DEPARTURE: {
            name: 'Validate Early Departure',
            order: 119,
            category: 'validation',
            description: 'Auto-detectado desde HourBankService.validateEarlyDeparture()',
            source: {
                file: 'HourBankService.js',
                function: 'validateEarlyDeparture',
                line: 1133
            },
            validations: ["template?.is_enabled || !template?.allow_early_departure","balanceResult.success","balanceResult.balance.current >= hoursEarly"],
            transitions_to: ["FAILED"],
            isAutoGenerated: true,
        },

        PROCESS_EARLY_DEPARTURE: {
            name: 'Process Early Departure',
            order: 120,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processEarlyDeparture()',
            source: {
                file: 'HourBankService.js',
                function: 'processEarlyDeparture',
                line: 1178
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_TRANSACTION_HISTORY: {
            name: 'Get Transaction History',
            order: 121,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getTransactionHistory()',
            source: {
                file: 'HourBankService.js',
                function: 'getTransactionHistory',
                line: 1202
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_PENDING_REQUESTS: {
            name: 'Get Pending Requests',
            order: 122,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getPendingRequests()',
            source: {
                file: 'HourBankService.js',
                function: 'getPendingRequests',
                line: 1266
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_COMPANY_STATS: {
            name: 'Get Company Stats',
            order: 123,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getCompanyStats()',
            source: {
                file: 'HourBankService.js',
                function: 'getCompanyStats',
                line: 1305
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_TEMPLATE_BY_ID: {
            name: 'Get Template By Id',
            order: 124,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getTemplateById()',
            source: {
                file: 'HourBankService.js',
                function: 'getTemplateById',
                line: 1379
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        UPDATE_BALANCE_CACHE: {
            name: 'Update Balance Cache',
            order: 125,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.updateBalanceCache()',
            source: {
                file: 'HourBankService.js',
                function: 'updateBalanceCache',
                line: 1400
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_EMPLOYEE_FOR_DECISION: {
            name: 'Notify Employee For Decision',
            order: 126,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyEmployeeForDecision()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyEmployeeForDecision',
                line: 1422
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_ACCRUAL: {
            name: 'Notify Accrual',
            order: 127,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyAccrual()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyAccrual',
                line: 1442
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_USAGE_REQUEST: {
            name: 'Notify Usage Request',
            order: 128,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyUsageRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyUsageRequest',
                line: 1460
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_REQUEST_REJECTION: {
            name: 'Notify Request Rejection',
            order: 129,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyRequestRejection()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyRequestRejection',
                line: 1464
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CHECK_BUDGET_AVAILABILITY: {
            name: 'Check Budget Availability',
            order: 130,
            category: 'validation',
            description: 'Auto-detectado desde HourBankService.checkBudgetAvailability()',
            source: {
                file: 'HourBankService.js',
                function: 'checkBudgetAvailability',
                line: 1575
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_OR_UPDATE_BUDGET: {
            name: 'Create Or Update Budget',
            order: 131,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.createOrUpdateBudget()',
            source: {
                file: 'HourBankService.js',
                function: 'createOrUpdateBudget',
                line: 1608
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_DRILL_DOWN_METRICS: {
            name: 'Get Drill Down Metrics',
            order: 132,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getDrillDownMetrics()',
            source: {
                file: 'HourBankService.js',
                function: 'getDrillDownMetrics',
                line: 1666
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_EMPLOYEE_SUMMARY: {
            name: 'Get Employee Summary',
            order: 133,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getEmployeeSummary()',
            source: {
                file: 'HourBankService.js',
                function: 'getEmployeeSummary',
                line: 1770
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_EMPLOYEES_AT_RISK: {
            name: 'Get Employees At Risk',
            order: 134,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getEmployeesAtRisk()',
            source: {
                file: 'HourBankService.js',
                function: 'getEmployeesAtRisk',
                line: 1881
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_PENDING_DECISIONS: {
            name: 'Get Pending Decisions',
            order: 135,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getPendingDecisions()',
            source: {
                file: 'HourBankService.js',
                function: 'getPendingDecisions',
                line: 1949
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_REDEMPTION_REQUEST: {
            name: 'Create Redemption Request',
            order: 136,
            category: 'persistence',
            description: 'Auto-detectado desde HourBankService.createRedemptionRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'createRedemptionRequest',
                line: 1985
            },
            validations: ["validation.is_valid","template?.require_loan_justification && !loanJustification"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_REDEMPTION_REQUESTS: {
            name: 'Get Redemption Requests',
            order: 137,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getRedemptionRequests()',
            source: {
                file: 'HourBankService.js',
                function: 'getRedemptionRequests',
                line: 2149
            },
            transitions_to: ["COMPLETED"],
            isAutoGenerated: true,
        },

        PROCESS_REDEMPTION_APPROVAL: {
            name: 'Process Redemption Approval',
            order: 138,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.processRedemptionApproval()',
            source: {
                file: 'HourBankService.js',
                function: 'processRedemptionApproval',
                line: 2219
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_SCHEDULED_REDEMPTIONS: {
            name: 'Get Scheduled Redemptions',
            order: 139,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getScheduledRedemptions()',
            source: {
                file: 'HourBankService.js',
                function: 'getScheduledRedemptions',
                line: 2380
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        PROCESS_REDEMPTION_CHECKOUT: {
            name: 'Process Redemption Checkout',
            order: 140,
            category: 'validation',
            description: 'Auto-detectado desde HourBankService.processRedemptionCheckout()',
            source: {
                file: 'HourBankService.js',
                function: 'processRedemptionCheckout',
                line: 2418
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_ACCOUNT_STATEMENT: {
            name: 'Get Account Statement',
            order: 141,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getAccountStatement()',
            source: {
                file: 'HourBankService.js',
                function: 'getAccountStatement',
                line: 2452
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_REDEMPTION_SUMMARY: {
            name: 'Get Redemption Summary',
            order: 142,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getRedemptionSummary()',
            source: {
                file: 'HourBankService.js',
                function: 'getRedemptionSummary',
                line: 2499
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_REDEMPTION_REQUEST: {
            name: 'Notify Redemption Request',
            order: 143,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyRedemptionRequest()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyRedemptionRequest',
                line: 2588
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_REDEMPTION_STATUS_CHANGE: {
            name: 'Notify Redemption Status Change',
            order: 144,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyRedemptionStatusChange()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyRedemptionStatusChange',
                line: 2612
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        NOTIFY_H_R_FOR_REDEMPTION_APPROVAL: {
            name: 'Notify H R For Redemption Approval',
            order: 145,
            category: 'notification',
            description: 'Auto-detectado desde HourBankService.notifyHRForRedemptionApproval()',
            source: {
                file: 'HourBankService.js',
                function: 'notifyHRForRedemptionApproval',
                line: 2643
            },
            validations: ["NotificationWorkflowService"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        CREATE_LOAN_RECORD: {
            name: 'Create Loan Record',
            order: 146,
            category: 'persistence',
            description: 'Auto-detectado desde HourBankService.createLoanRecord()',
            source: {
                file: 'HourBankService.js',
                function: 'createLoanRecord',
                line: 2688
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_USER_LOAN_STATUS: {
            name: 'Get User Loan Status',
            order: 147,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getUserLoanStatus()',
            source: {
                file: 'HourBankService.js',
                function: 'getUserLoanStatus',
                line: 2785
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        EXECUTE_REDEMPTION_WITH_LOAN: {
            name: 'Execute Redemption With Loan',
            order: 148,
            category: 'process',
            description: 'Auto-detectado desde HourBankService.executeRedemptionWithLoan()',
            source: {
                file: 'HourBankService.js',
                function: 'executeRedemptionWithLoan',
                line: 2875
            },
            validations: ["checkoutResult.success || !checkoutResult.hasRedemption"],
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_COMPANY_DASHBOARD_METRICS: {
            name: 'Get Company Dashboard Metrics',
            order: 149,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getCompanyDashboardMetrics()',
            source: {
                file: 'HourBankService.js',
                function: 'getCompanyDashboardMetrics',
                line: 2985
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_BRANCH_METRICS: {
            name: 'Get Branch Metrics',
            order: 150,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getBranchMetrics()',
            source: {
                file: 'HourBankService.js',
                function: 'getBranchMetrics',
                line: 3084
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_DEPARTMENT_METRICS: {
            name: 'Get Department Metrics',
            order: 151,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getDepartmentMetrics()',
            source: {
                file: 'HourBankService.js',
                function: 'getDepartmentMetrics',
                line: 3142
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

        GET_EMPLOYEE_BALANCES_LIST: {
            name: 'Get Employee Balances List',
            order: 152,
            category: 'lookup',
            description: 'Auto-detectado desde HourBankService.getEmployeeBalancesList()',
            source: {
                file: 'HourBankService.js',
                function: 'getEmployeeBalancesList',
                line: 3202
            },
            transitions_to: [],
            isAutoGenerated: true,
        },

    };

    /**
     * WORKFLOW METADATA
     */
    static WORKFLOW_METADATA = {
        name: 'Attendance Workflow',
        module: 'attendance',
        version: '2.0.20260125-auto',
        isAutoGenerated: true,
        generatedAt: '2026-01-26T02:02:14.671Z',
        sourceFiles: ["LateArrivalAuthorizationService.js","CalendarioLaboralService.js","ShiftCalculatorService.js","OrganizationalHierarchyService.js","AttendanceAnalyticsService.js","AttendanceScoringEngine.js","AttendanceWorkflowService.js","HourBankService.js"],
        entry_point: 'BIOMETRIC_CAPTURE',
        final_states: {
            success: [],
            rejection: []
        },
        stats: {"total":152,"core":37,"existing":21,"autoGenerated":94,"outcomes":0}
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

module.exports = AttendanceWorkflowGenerated;
