/**
 * ============================================================================
 * UNIVERSAL WORKFLOW GENERATOR
 * ============================================================================
 *
 * Sistema genérico de auto-generación de workflows para TODOS los módulos.
 * Escanea servicios, detecta funciones, genera stages automáticamente.
 *
 * A diferencia de WorkflowAutoGenerator (solo attendance), este es UNIVERSAL:
 * - Escanea TODOS los servicios en src/services/
 * - Detecta patrones de workflow automáticamente
 * - Genera archivos *WorkflowService.js para cada módulo
 * - Se integra con Brain para tutoriales
 *
 * INTEGRACIÓN CON BRAIN:
 * - Brain llama regenerateAllWorkflows() periódicamente
 * - Cuando detecta cambios, regenera y notifica
 * - Los workflows generados alimentan tutoriales automáticos
 *
 * @version 2.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

class UniversalWorkflowGenerator extends EventEmitter {
    constructor(options = {}) {
        super();

        this.servicesDir = options.servicesDir || path.join(__dirname);
        this.outputDir = options.outputDir || path.join(__dirname, '../workflows/generated');
        this.registryPath = options.registryPath || path.join(__dirname, '../auditor/registry/modules-registry.json');

        // Cache de hashes para detectar cambios
        this.fileHashes = new Map();

        // Configuración de módulos conocidos con sus servicios fuente
        this.moduleConfigs = {
            // ATTENDANCE - Workflow completo de Fichaje Biométrico
            attendance: {
                name: 'Attendance Workflow',
                sourceFiles: [
                    'LateArrivalAuthorizationService.js',
                    'CalendarioLaboralService.js',
                    'ShiftCalculatorService.js',
                    'OrganizationalHierarchyService.js',
                    'AttendanceAnalyticsService.js',
                    'AttendanceScoringEngine.js',
                    'AttendanceWorkflowService.js',
                    'HourBankService.js'  // Integración con banco de horas
                ],
                outputFile: 'AttendanceWorkflowService.js',
                entryPoint: 'BIOMETRIC_CAPTURE',
                coreStages: [
                    // === FLUJO DE ENTRADA (CHECK-IN) ===
                    { id: 'BIOMETRIC_CAPTURE', name: 'Captura Biométrica', order: 1, category: 'identification', description: 'Kiosko captura foto/huella del empleado' },
                    { id: 'FACE_DETECTION', name: 'Detección Facial', order: 2, category: 'identification', description: 'Azure Face API detecta rostro en imagen' },
                    { id: 'LIVENESS_CHECK', name: 'Verificación de Vida', order: 3, category: 'security', description: 'Valida que es persona real, no foto' },
                    { id: 'FACE_MATCHING', name: 'Matching Facial', order: 4, category: 'identification', description: 'Compara con fotos registradas del empleado' },
                    { id: 'USER_IDENTIFICATION', name: 'Identificación de Usuario', order: 5, category: 'identification', description: 'Determina qué empleado es (por company_id)' },
                    { id: 'COMPANY_ISOLATION', name: 'Aislamiento de Empresa', order: 6, category: 'security', description: 'Valida que empleado pertenece a la empresa del kiosko' },
                    { id: 'USER_VALIDATION', name: 'Validación de Usuario', order: 7, category: 'validation', description: 'Verifica que empleado esté activo y habilitado' },

                    // === FLUJO DE TURNO ===
                    { id: 'SHIFT_LOOKUP', name: 'Búsqueda de Turno', order: 10, category: 'scheduling', description: 'Busca turno asignado para hoy' },
                    { id: 'SHIFT_VALIDATION', name: 'Validación de Turno', order: 11, category: 'scheduling', description: 'Verifica si está dentro del horario permitido' },
                    { id: 'HOLIDAY_CHECK', name: 'Verificación de Feriado', order: 12, category: 'calendar', description: 'Consulta calendario laboral para feriados' },
                    { id: 'TOLERANCE_CHECK', name: 'Verificación de Tolerancia', order: 13, category: 'validation', description: 'Aplica tolerancia de entrada/salida' },

                    // === FLUJO DE TARDANZA ===
                    { id: 'LATE_DETECTION', name: 'Detección de Tardanza', order: 20, category: 'detection', description: 'Detecta si llegó tarde vs hora de entrada' },
                    { id: 'LATE_MINUTES_CALC', name: 'Cálculo de Minutos Tarde', order: 21, category: 'calculation', description: 'Calcula minutos de retraso' },
                    { id: 'LATE_AUTHORIZATION_CHECK', name: 'Verificación de Autorización', order: 22, category: 'authorization', description: 'Verifica si tiene autorización previa de llegada tarde' },
                    { id: 'SUPERVISOR_PRESENT_CHECK', name: 'Supervisor Presente', order: 23, category: 'authorization', description: 'Verifica si hay supervisor en turno para autorizar' },
                    { id: 'LATE_JUSTIFICATION', name: 'Justificación de Tardanza', order: 24, category: 'authorization', description: 'Empleado puede justificar tardanza' },
                    { id: 'LATE_APPROVAL_WORKFLOW', name: 'Workflow de Aprobación', order: 25, category: 'workflow', description: 'Envía a supervisor para aprobar/rechazar' },

                    // === FLUJO DE SALIDA (CHECK-OUT) ===
                    { id: 'CHECKOUT_CAPTURE', name: 'Captura de Salida', order: 30, category: 'identification', description: 'Empleado ficha su salida' },
                    { id: 'CHECKOUT_VALIDATION', name: 'Validación de Salida', order: 31, category: 'validation', description: 'Verifica que tenga entrada registrada' },
                    { id: 'HOURS_CALCULATION', name: 'Cálculo de Horas', order: 32, category: 'calculation', description: 'Calcula horas trabajadas del día' },
                    { id: 'OVERTIME_DETECTION', name: 'Detección de Horas Extra', order: 33, category: 'detection', description: 'Detecta si trabajó más de lo establecido' },
                    { id: 'EARLY_DEPARTURE_CHECK', name: 'Verificación Salida Anticipada', order: 34, category: 'validation', description: 'Detecta si salió antes de hora' },

                    // === INTEGRACIÓN BANCO DE HORAS ===
                    { id: 'HOUR_BANK_CHECK', name: 'Verificación Banco de Horas', order: 40, category: 'integration', description: 'Verifica si tiene canje programado para hoy' },
                    { id: 'REDEMPTION_VALIDATION', name: 'Validación de Canje', order: 41, category: 'integration', description: 'Valida hora de salida vs canje aprobado' },
                    { id: 'OVERTIME_TO_BANK', name: 'Horas Extra a Banco', order: 42, category: 'integration', description: 'Envía horas extra al banco si aplica' },
                    { id: 'LOAN_REPAYMENT_TRIGGER', name: 'Trigger Pago Préstamo', order: 43, category: 'integration', description: 'Si tiene deuda, dispara pago automático' },

                    // === SCORING Y ANALYTICS ===
                    { id: 'ATTENDANCE_SCORING', name: 'Scoring de Asistencia', order: 50, category: 'analytics', description: 'Calcula puntaje de asistencia del empleado' },
                    { id: 'PATTERN_ANALYSIS', name: 'Análisis de Patrones', order: 51, category: 'analytics', description: 'Detecta patrones de tardanza/ausencia' },
                    { id: 'ANOMALY_DETECTION', name: 'Detección de Anomalías', order: 52, category: 'analytics', description: 'Detecta comportamientos inusuales' },

                    // === NOTIFICACIONES ===
                    { id: 'NOTIFY_LATE_ARRIVAL', name: 'Notificar Tardanza', order: 60, category: 'notification', description: 'Notifica a supervisor sobre tardanza' },
                    { id: 'NOTIFY_ABSENCE', name: 'Notificar Ausencia', order: 61, category: 'notification', description: 'Notifica si no fichó entrada' },
                    { id: 'NOTIFY_OVERTIME', name: 'Notificar Horas Extra', order: 62, category: 'notification', description: 'Notifica sobre horas extra trabajadas' },

                    // === ESTADOS FINALES ===
                    { id: 'CHECKIN_COMPLETED', name: 'Entrada Registrada', order: 90, category: 'final', description: 'Fichaje de entrada exitoso' },
                    { id: 'CHECKOUT_COMPLETED', name: 'Salida Registrada', order: 91, category: 'final', description: 'Fichaje de salida exitoso' },
                    { id: 'LATE_RECORDED', name: 'Tardanza Registrada', order: 92, category: 'final', description: 'Tardanza registrada (con o sin justificación)' },
                    { id: 'IDENTIFICATION_FAILED', name: 'Identificación Fallida', order: 93, category: 'final', description: 'No se pudo identificar al empleado' },
                    { id: 'UNAUTHORIZED_ACCESS', name: 'Acceso No Autorizado', order: 94, category: 'final', description: 'Empleado no autorizado para este kiosko' }
                ],
                // Tutoriales detallados para cada flujo
                tutorials: {
                    checkin: {
                        title: 'Fichaje de Entrada (Check-in)',
                        steps: [
                            'Empleado se presenta en kiosko biométrico',
                            'Sistema captura imagen facial via cámara',
                            'Azure Face API detecta rostro y verifica liveness',
                            'Sistema compara con fotos registradas (matching)',
                            'Valida aislamiento de empresa (company_id)',
                            'Busca turno asignado para el día',
                            'Verifica si está dentro de tolerancia',
                            'Si llegó tarde: dispara flujo de tardanza',
                            'Registra entrada en tabla attendances',
                            'Notifica si hay anomalías'
                        ]
                    },
                    checkout: {
                        title: 'Fichaje de Salida (Check-out)',
                        steps: [
                            'Empleado ficha salida en kiosko',
                            'Sistema valida que tenga entrada registrada',
                            'Calcula horas trabajadas del día',
                            'Detecta horas extra si trabajó de más',
                            'Verifica si tiene canje de banco de horas',
                            'Si tiene canje: valida hora de salida vs aprobado',
                            'Si hizo horas extra: envía a banco de horas',
                            'Si tiene préstamo: paga deuda automáticamente',
                            'Registra salida en tabla attendances',
                            'Actualiza scoring de asistencia'
                        ]
                    },
                    lateArrival: {
                        title: 'Gestión de Tardanzas',
                        steps: [
                            'Sistema detecta llegada fuera de tolerancia',
                            'Calcula minutos de retraso',
                            'Verifica si tiene autorización previa',
                            'Busca supervisor disponible en turno',
                            'Muestra pantalla de justificación (opcional)',
                            'Envía solicitud de aprobación a supervisor',
                            'Supervisor aprueba/rechaza desde app/web',
                            'Registra tardanza con estado de justificación',
                            'Impacta en scoring de asistencia',
                            'Si acumula tardanzas: puede generar sanción'
                        ]
                    },
                    hourBankIntegration: {
                        title: 'Integración con Banco de Horas',
                        steps: [
                            'Al checkout, verifica si tiene canje programado',
                            'Si tiene canje: valida que salga a la hora correcta',
                            'Si hizo horas extra: consulta plantilla de banco',
                            'Aplica multiplicador según tipo de hora',
                            'Si employee_choice_enabled: pregunta cobrar/acumular',
                            'Si tiene préstamo: paga deuda primero',
                            'Acredita horas restantes al banco',
                            'Actualiza balance disponible'
                        ]
                    }
                }
            },

            // LEGAL - Workflow de casos legales
            legal: {
                name: 'Legal Case Workflow',
                sourceFiles: [
                    'LegalWorkflowService.js',
                    'LegalCase360Service.js',
                    'EmployeeLegal360Service.js'
                ],
                outputFile: 'LegalCaseWorkflowGenerated.js',
                entryPoint: 'CASE_RECEIVED',
                coreStages: [
                    { id: 'CASE_RECEIVED', name: 'Caso Recibido', order: 1, category: 'intake' },
                    { id: 'ANALYSIS', name: 'Análisis', order: 2, category: 'process' },
                    { id: 'RESOLUTION', name: 'Resolución', order: 3, category: 'outcome' }
                ]
            },

            // MEDICAL - Workflow de licencias médicas
            medical: {
                name: 'Medical Leave Workflow',
                sourceFiles: [
                    'MedicalLeaveService.js',
                    'MedicalCertificateService.js'
                ],
                outputFile: 'MedicalWorkflowGenerated.js',
                entryPoint: 'CERTIFICATE_UPLOADED',
                coreStages: [
                    { id: 'CERTIFICATE_UPLOADED', name: 'Certificado Cargado', order: 1, category: 'intake' },
                    { id: 'VALIDATION', name: 'Validación', order: 2, category: 'validation' },
                    { id: 'APPROVED', name: 'Aprobado', order: 3, category: 'outcome' }
                ]
            },

            // VACATION - Workflow de vacaciones
            vacation: {
                name: 'Vacation Request Workflow',
                sourceFiles: [
                    'VacationService.js',
                    'VacationRequestService.js'
                ],
                outputFile: 'VacationWorkflowGenerated.js',
                entryPoint: 'REQUEST_CREATED',
                coreStages: [
                    { id: 'REQUEST_CREATED', name: 'Solicitud Creada', order: 1, category: 'intake' },
                    { id: 'SUPERVISOR_REVIEW', name: 'Revisión Supervisor', order: 2, category: 'approval' },
                    { id: 'HR_REVIEW', name: 'Revisión RRHH', order: 3, category: 'approval' }
                ]
            },

            // SANCTIONS - Workflow de sanciones
            sanctions: {
                name: 'Sanctions Workflow',
                sourceFiles: [
                    'SanctionsService.js',
                    'SanctionWorkflowService.js'
                ],
                outputFile: 'SanctionsWorkflowGenerated.js',
                entryPoint: 'INCIDENT_REPORTED',
                coreStages: [
                    { id: 'INCIDENT_REPORTED', name: 'Incidente Reportado', order: 1, category: 'intake' },
                    { id: 'INVESTIGATION', name: 'Investigación', order: 2, category: 'process' },
                    { id: 'DECISION', name: 'Decisión', order: 3, category: 'outcome' }
                ]
            },

            // PROCEDURES - Workflow de procedimientos
            procedures: {
                name: 'Procedures Workflow',
                sourceFiles: [
                    'ProceduresService.js'
                ],
                outputFile: 'ProceduresWorkflowGenerated.js',
                entryPoint: 'PROCEDURE_INITIATED',
                coreStages: [
                    { id: 'PROCEDURE_INITIATED', name: 'Procedimiento Iniciado', order: 1, category: 'intake' },
                    { id: 'EXECUTION', name: 'Ejecución', order: 2, category: 'process' },
                    { id: 'COMPLETION', name: 'Completado', order: 3, category: 'outcome' }
                ]
            },

            // RECRUITMENT - Workflow de reclutamiento
            recruitment: {
                name: 'Recruitment Workflow',
                sourceFiles: [
                    'RecruitmentService.js',
                    'JobPostingService.js',
                    'CandidateService.js'
                ],
                outputFile: 'RecruitmentWorkflowGenerated.js',
                entryPoint: 'JOB_POSTED',
                coreStages: [
                    { id: 'JOB_POSTED', name: 'Puesto Publicado', order: 1, category: 'intake' },
                    { id: 'APPLICATIONS_RECEIVED', name: 'Postulaciones Recibidas', order: 2, category: 'process' },
                    { id: 'INTERVIEWS', name: 'Entrevistas', order: 3, category: 'evaluation' },
                    { id: 'HIRING_DECISION', name: 'Decisión de Contratación', order: 4, category: 'outcome' }
                ]
            },

            // PAYROLL - Workflow de liquidación
            payroll: {
                name: 'Payroll Workflow',
                sourceFiles: [
                    'PayrollService.js',
                    'PayrollLiquidationService.js'
                ],
                outputFile: 'PayrollWorkflowGenerated.js',
                entryPoint: 'PERIOD_OPENED',
                coreStages: [
                    { id: 'PERIOD_OPENED', name: 'Período Abierto', order: 1, category: 'intake' },
                    { id: 'DATA_COLLECTION', name: 'Recolección de Datos', order: 2, category: 'process' },
                    { id: 'CALCULATION', name: 'Cálculo', order: 3, category: 'process' },
                    { id: 'REVIEW', name: 'Revisión', order: 4, category: 'validation' },
                    { id: 'PAYMENT', name: 'Pago', order: 5, category: 'outcome' }
                ]
            },

            // NOTIFICATIONS - Workflow de notificaciones
            notifications: {
                name: 'Notification Workflow',
                sourceFiles: [
                    'NotificationUnifiedService.js',
                    'ProactiveNotificationService.js'
                ],
                outputFile: 'NotificationWorkflowGenerated.js',
                entryPoint: 'NOTIFICATION_CREATED',
                coreStages: [
                    { id: 'NOTIFICATION_CREATED', name: 'Notificación Creada', order: 1, category: 'intake' },
                    { id: 'CHANNEL_SELECTION', name: 'Selección de Canal', order: 2, category: 'routing' },
                    { id: 'DELIVERY', name: 'Entrega', order: 3, category: 'delivery' },
                    { id: 'ACKNOWLEDGMENT', name: 'Confirmación', order: 4, category: 'outcome' }
                ]
            },

            // HOUR BANK - Workflow completo de Banco de Horas
            hourbank: {
                name: 'Hour Bank Workflow',
                sourceFiles: [
                    'HourBankService.js'
                ],
                outputFile: 'HourBankWorkflowGenerated.js',
                entryPoint: 'OVERTIME_DETECTED',
                coreStages: [
                    // === FLUJO DE ACUMULACIÓN ===
                    { id: 'OVERTIME_DETECTED', name: 'Horas Extra Detectadas', order: 1, category: 'detection', description: 'Sistema detecta que empleado trabajó horas extra' },
                    { id: 'TEMPLATE_LOOKUP', name: 'Búsqueda de Plantilla', order: 2, category: 'configuration', description: 'Busca plantilla aplicable (por sucursal o empresa)' },
                    { id: 'RATE_CALCULATION', name: 'Cálculo de Tasas', order: 3, category: 'calculation', description: 'Aplica multiplicador según tipo: normal/nocturno/feriado/fin de semana' },
                    { id: 'EMPLOYEE_CHOICE', name: 'Elección del Empleado', order: 4, category: 'decision', description: 'Empleado elige: cobrar vs acumular (si está habilitado)' },
                    { id: 'LOAN_REPAYMENT_CHECK', name: 'Verificación de Préstamos', order: 5, category: 'validation', description: 'Si tiene deudas, paga primero según política (mandatory/partial/flexible)' },
                    { id: 'CREDIT_HOURS', name: 'Acreditación de Horas', order: 6, category: 'transaction', description: 'Registra transacción de acumulación en hour_bank_transactions' },
                    { id: 'BALANCE_UPDATE', name: 'Actualización de Saldo', order: 7, category: 'update', description: 'Actualiza saldo disponible del empleado' },

                    // === FLUJO DE CANJE/REDENCIÓN ===
                    { id: 'REDEMPTION_REQUEST', name: 'Solicitud de Canje', order: 10, category: 'request', description: 'Empleado solicita usar horas del banco' },
                    { id: 'VALIDATION_REDEMPTION', name: 'Validación de Solicitud', order: 11, category: 'validation', description: 'Valida balance, límites, fecha, máximo por evento' },
                    { id: 'LOAN_DETECTION', name: 'Detección de Préstamo', order: 12, category: 'loan', description: 'Si solicita más de lo disponible, detecta como préstamo' },
                    { id: 'SUPERVISOR_APPROVAL', name: 'Aprobación Supervisor', order: 13, category: 'approval', description: 'Supervisor revisa y aprueba/rechaza' },
                    { id: 'HR_APPROVAL', name: 'Aprobación RRHH', order: 14, category: 'approval', description: 'RRHH revisa (si está configurado) y aprueba/rechaza' },
                    { id: 'REDEMPTION_SCHEDULED', name: 'Canje Programado', order: 15, category: 'scheduling', description: 'Se programa la salida anticipada/entrada tardía' },
                    { id: 'CHECKOUT_VALIDATION', name: 'Validación de Checkout', order: 16, category: 'execution', description: 'Valida que la hora de salida coincida con lo aprobado' },
                    { id: 'REDEMPTION_EXECUTED', name: 'Canje Ejecutado', order: 17, category: 'completion', description: 'Se descuentan las horas del balance' },

                    // === FLUJO DE PRÉSTAMOS ===
                    { id: 'LOAN_CREATION', name: 'Creación de Préstamo', order: 20, category: 'loan', description: 'Se crea registro en hour_bank_loans con deuda' },
                    { id: 'INTEREST_CALCULATION', name: 'Cálculo de Interés', order: 21, category: 'loan', description: 'Aplica tasa de interés si está configurada' },
                    { id: 'LOAN_TRACKING', name: 'Seguimiento de Préstamo', order: 22, category: 'loan', description: 'Monitorea estado del préstamo (active/partial/repaid)' },
                    { id: 'LOAN_REPAYMENT', name: 'Pago de Préstamo', order: 23, category: 'loan', description: 'Descuenta automáticamente de horas extra futuras' },
                    { id: 'LOAN_COMPLETED', name: 'Préstamo Saldado', order: 24, category: 'completion', description: 'Préstamo completamente pagado' },

                    // === FLUJO DE VENCIMIENTOS ===
                    { id: 'EXPIRATION_CHECK', name: 'Verificación de Vencimiento', order: 30, category: 'expiration', description: 'Verifica horas próximas a vencer' },
                    { id: 'EXPIRATION_WARNING', name: 'Alerta de Vencimiento', order: 31, category: 'notification', description: 'Notifica al empleado sobre horas por vencer' },
                    { id: 'EXPIRED_HOURS_ACTION', name: 'Acción de Vencimiento', order: 32, category: 'expiration', description: 'Ejecuta acción: lose/payout/carry_limited' },

                    // === ESTADOS FINALES ===
                    { id: 'HOURS_ACCUMULATED', name: 'Horas Acumuladas', order: 90, category: 'final', description: 'Horas exitosamente acumuladas en el banco' },
                    { id: 'REDEMPTION_COMPLETED', name: 'Canje Completado', order: 91, category: 'final', description: 'Canje exitosamente ejecutado' },
                    { id: 'REDEMPTION_REJECTED', name: 'Canje Rechazado', order: 92, category: 'final', description: 'Solicitud rechazada por supervisor o RRHH' },
                    { id: 'LOAN_FULLY_REPAID', name: 'Préstamo Saldado', order: 93, category: 'final', description: 'Deuda completamente pagada' },
                    { id: 'HOURS_EXPIRED', name: 'Horas Vencidas', order: 94, category: 'final', description: 'Horas perdidas por vencimiento' }
                ],
                // Tutoriales detallados para cada flujo
                tutorials: {
                    accrual: {
                        title: 'Acumulación de Horas Extra',
                        steps: [
                            'Sistema detecta horas extra via fichaje biométrico',
                            'Busca plantilla de banco de horas para la sucursal/empresa',
                            'Calcula multiplicador según tipo de hora (normal 1x, nocturno 1.5x, feriado 2x)',
                            'Si employee_choice_enabled: muestra opciones al empleado',
                            'Si tiene préstamos pendientes: paga deuda primero según política',
                            'Registra transacción en hour_bank_transactions',
                            'Actualiza balance disponible'
                        ]
                    },
                    redemption: {
                        title: 'Solicitud de Canje',
                        steps: [
                            'Empleado accede a Mi Espacio > Banco de Horas',
                            'Solicita canjear horas para salida anticipada/entrada tardía',
                            'Sistema valida: balance, máximo por evento, fecha futura',
                            'Si solicita más de lo disponible: detecta como PRÉSTAMO',
                            'Solicitud pasa a supervisor para aprobación',
                            'Si requiere HR: pasa a RRHH para aprobación final',
                            'Se programa la salida anticipada en el sistema de fichajes',
                            'El día del canje, sistema valida checkout real vs esperado'
                        ]
                    },
                    loan: {
                        title: 'Sistema de Préstamos',
                        steps: [
                            'Empleado solicita más horas de las que tiene',
                            'Sistema verifica si préstamos están habilitados (allow_hour_loans)',
                            'Verifica límite de préstamo (max_loan_hours) y deuda máxima (max_negative_balance)',
                            'Requiere justificación si require_loan_justification=true',
                            'Crea registro en hour_bank_loans con deuda + interés',
                            'Cuando hace horas extra: automáticamente paga deuda primero',
                            'Política de pago: mandatory=100%, partial=50%, flexible=25%'
                        ]
                    }
                }
            }
        };

        // Mapeo universal de funciones a tipos de stage
        this.universalFunctionPatterns = {
            // Patrones de validación
            'validate': 'VALIDATION',
            'check': 'CHECK',
            'verify': 'VERIFICATION',

            // Patrones de proceso
            'process': 'PROCESS',
            'handle': 'HANDLE',
            'execute': 'EXECUTE',
            'calculate': 'CALCULATE',

            // Patrones de búsqueda
            'find': 'FIND',
            'get': 'GET',
            'search': 'SEARCH',
            'lookup': 'LOOKUP',

            // Patrones de notificación
            'notify': 'NOTIFY',
            'send': 'SEND',
            'alert': 'ALERT',

            // Patrones de aprobación
            'approve': 'APPROVE',
            'reject': 'REJECT',
            'authorize': 'AUTHORIZE',

            // Patrones de creación
            'create': 'CREATE',
            'generate': 'GENERATE',
            'build': 'BUILD',

            // Patrones de actualización
            'update': 'UPDATE',
            'modify': 'MODIFY',
            'change': 'CHANGE',

            // Patrones de escalamiento
            'escalate': 'ESCALATE',
            'delegate': 'DELEGATE',
            'assign': 'ASSIGN'
        };

        // Asegurar que existe el directorio de salida
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        console.log('🔧 [UNIVERSAL-WORKFLOW-GEN] Inicializado');
        console.log(`   Módulos configurados: ${Object.keys(this.moduleConfigs).length}`);
        console.log(`   Directorio de salida: ${this.outputDir}`);
    }

    /**
     * ========================================================================
     * MÉTODO PRINCIPAL: Regenerar TODOS los workflows
     * ========================================================================
     */
    async regenerateAllWorkflows() {
        console.log('🔄 [UNIVERSAL-WORKFLOW-GEN] Regenerando TODOS los workflows...');

        const results = {
            scannedAt: new Date().toISOString(),
            modules: [],
            totalStages: 0,
            regenerated: 0,
            unchanged: 0,
            errors: []
        };

        for (const [moduleKey, config] of Object.entries(this.moduleConfigs)) {
            try {
                const result = await this.regenerateModuleWorkflow(moduleKey, config);
                results.modules.push({
                    module: moduleKey,
                    ...result
                });

                results.totalStages += result.stagesCount || 0;
                if (result.regenerated) {
                    results.regenerated++;
                } else {
                    results.unchanged++;
                }
            } catch (error) {
                console.error(`❌ [UNIVERSAL-WORKFLOW-GEN] Error en ${moduleKey}:`, error.message);
                results.errors.push({ module: moduleKey, error: error.message });
            }
        }

        // Emitir evento de workflows actualizados
        this.emit('workflows-updated', results);

        console.log(`✅ [UNIVERSAL-WORKFLOW-GEN] Completado:`);
        console.log(`   Regenerados: ${results.regenerated}`);
        console.log(`   Sin cambios: ${results.unchanged}`);
        console.log(`   Errores: ${results.errors.length}`);
        console.log(`   Total stages: ${results.totalStages}`);

        return results;
    }

    /**
     * ========================================================================
     * Regenerar SOLO workflows que cambiaron
     * Más eficiente que regenerateAllWorkflows() para uso frecuente
     * ========================================================================
     */
    async regenerateChangedWorkflows() {
        console.log('🔍 [UNIVERSAL-WORKFLOW-GEN] Buscando workflows con cambios...');

        const results = {
            scannedAt: new Date().toISOString(),
            regenerated: [],
            unchanged: [],
            errors: []
        };

        for (const [moduleKey, config] of Object.entries(this.moduleConfigs)) {
            try {
                // Verificar si hay cambios en los archivos fuente
                let hasChanges = false;

                for (const sourceFile of config.sourceFiles) {
                    const filePath = path.join(this.servicesDir, sourceFile);

                    if (!fs.existsSync(filePath)) continue;

                    const content = fs.readFileSync(filePath, 'utf8');
                    const currentHash = this.hashContent(content);
                    const cacheKey = `${moduleKey}:${sourceFile}`;
                    const previousHash = this.fileHashes.get(cacheKey);

                    if (currentHash !== previousHash) {
                        hasChanges = true;
                        this.fileHashes.set(cacheKey, currentHash);
                        break;
                    }
                }

                if (hasChanges) {
                    // Solo regenerar si hay cambios
                    const result = await this.regenerateModuleWorkflow(moduleKey, config);
                    results.regenerated.push(moduleKey);
                } else {
                    results.unchanged.push(moduleKey);
                }

            } catch (error) {
                console.error(`❌ Error verificando ${moduleKey}:`, error.message);
                results.errors.push({ module: moduleKey, error: error.message });
            }
        }

        if (results.regenerated.length > 0) {
            console.log(`✅ Workflows regenerados: ${results.regenerated.join(', ')}`);
        } else {
            console.log(`✅ No hay cambios en workflows`);
        }

        return results;
    }

    /**
     * ========================================================================
     * Regenerar workflow de un módulo específico
     * ========================================================================
     */
    async regenerateModuleWorkflow(moduleKey, config) {
        console.log(`📦 [UNIVERSAL-WORKFLOW-GEN] Procesando módulo: ${moduleKey}`);

        let hasChanges = false;
        const analysisResults = [];

        // Analizar cada archivo fuente
        for (const sourceFile of config.sourceFiles) {
            const filePath = path.join(this.servicesDir, sourceFile);

            if (!fs.existsSync(filePath)) {
                console.log(`   ⚠️ ${sourceFile} no existe, saltando...`);
                continue;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const currentHash = this.hashContent(content);
            const cacheKey = `${moduleKey}:${sourceFile}`;
            const previousHash = this.fileHashes.get(cacheKey);

            if (currentHash !== previousHash) {
                console.log(`   📝 Cambio detectado en: ${sourceFile}`);
                hasChanges = true;
                this.fileHashes.set(cacheKey, currentHash);
            }

            // Analizar el archivo
            const analysis = this.analyzeSourceFile(content, sourceFile, moduleKey);
            analysisResults.push(analysis);
        }

        // Verificar si ya existe el archivo de salida
        const outputPath = path.join(this.outputDir, config.outputFile);
        const outputExists = fs.existsSync(outputPath);

        if (!hasChanges && outputExists) {
            console.log(`   ✅ Sin cambios en ${moduleKey}`);
            return { regenerated: false, reason: 'No changes detected' };
        }

        // Generar nuevo workflow
        console.log(`   🔧 Generando workflow para ${moduleKey}...`);
        const workflow = this.generateWorkflow(analysisResults, config, moduleKey);
        const fileContent = this.generateFileContent(workflow, moduleKey, config);

        // Escribir archivo
        fs.writeFileSync(outputPath, fileContent);
        console.log(`   ✅ Archivo generado: ${config.outputFile}`);

        // Actualizar registry si existe
        await this.updateRegistry(moduleKey, workflow);

        return {
            regenerated: true,
            stagesCount: workflow.stages.length,
            outputFile: config.outputFile,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * ========================================================================
     * Analizar archivo fuente
     * ========================================================================
     */
    analyzeSourceFile(content, fileName, moduleKey) {
        const analysis = {
            file: fileName,
            module: moduleKey,
            service: fileName.replace('.js', ''),
            functions: [],
            existingStages: [],
            validations: [],
            serviceCalls: [],
            transitions: []
        };

        // 1. Detectar STAGES existentes (static STAGES = {...})
        const existingStages = this.extractExistingStages(content);
        if (existingStages.length > 0) {
            analysis.existingStages = existingStages;
            console.log(`      → Encontrados ${existingStages.length} stages existentes`);
        }

        // 2. Extraer funciones async
        const asyncFuncRegex = /async\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
        let match;

        while ((match = asyncFuncRegex.exec(content)) !== null) {
            const funcName = match[1];
            const params = match[2];
            const startPos = match.index;

            // Ignorar funciones privadas muy internas
            if (funcName.startsWith('__')) continue;

            // Extraer cuerpo de la función
            const funcBody = this.extractFunctionBody(content, startPos);

            // Analizar contenido
            const funcAnalysis = {
                name: funcName,
                params: params.split(',').map(p => p.trim()).filter(p => p),
                line: this.getLineNumber(content, startPos),
                isPrivate: funcName.startsWith('_'),
                validations: this.extractValidations(funcBody),
                serviceCalls: this.extractServiceCalls(funcBody),
                transitions: this.extractTransitions(funcBody),
                errorHandling: this.hasErrorHandling(funcBody),
                stageType: this.inferStageType(funcName)
            };

            analysis.functions.push(funcAnalysis);
        }

        return analysis;
    }

    /**
     * ========================================================================
     * Extraer STAGES existentes del código
     * ========================================================================
     */
    extractExistingStages(content) {
        const stages = [];

        // Buscar patrón: static STAGES = { ... }
        const stagesMatch = content.match(/static\s+STAGES\s*=\s*\{([\s\S]*?)\n\s*\};/);
        if (!stagesMatch) return stages;

        const stagesBlock = stagesMatch[1];

        // Extraer cada stage
        const stageRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
        let match;

        while ((match = stageRegex.exec(stagesBlock)) !== null) {
            const stageId = match[1];
            const stageContent = match[2];

            // Extraer propiedades
            const nameMatch = stageContent.match(/name\s*:\s*['"]([^'"]+)['"]/);
            const orderMatch = stageContent.match(/order\s*:\s*(\d+)/);
            const categoryMatch = stageContent.match(/category\s*:\s*['"]([^'"]+)['"]/);

            stages.push({
                id: stageId,
                name: nameMatch ? nameMatch[1] : stageId,
                order: orderMatch ? parseInt(orderMatch[1]) : 999,
                category: categoryMatch ? categoryMatch[1] : 'process',
                source: 'existing_code'
            });
        }

        return stages;
    }

    /**
     * ========================================================================
     * Generar workflow desde análisis
     * ========================================================================
     */
    generateWorkflow(analysisResults, config, moduleKey) {
        const stages = [];
        const processedFunctions = new Set();

        // 1. Agregar stages core del módulo
        for (const coreStage of config.coreStages) {
            stages.push({
                ...coreStage,
                isCore: true,
                transitions_to: [],
                description: `Stage core de ${config.name}`
            });
        }

        // 2. Agregar stages existentes encontrados en código
        for (const analysis of analysisResults) {
            for (const existingStage of analysis.existingStages) {
                if (!stages.find(s => s.id === existingStage.id)) {
                    stages.push({
                        ...existingStage,
                        isExisting: true,
                        transitions_to: []
                    });
                }
            }
        }

        // 3. Agregar stages derivados de funciones
        for (const analysis of analysisResults) {
            for (const func of analysis.functions) {
                // Generar ID de stage para la función
                const stageId = this.generateStageId(func.name, func.stageType);

                if (stageId && !processedFunctions.has(func.name) && !stages.find(s => s.id === stageId)) {
                    processedFunctions.add(func.name);

                    const stage = {
                        id: stageId,
                        name: this.formatStageName(stageId),
                        order: stages.length + 1,
                        category: this.inferCategory(func.name),
                        description: `Auto-detectado desde ${analysis.service}.${func.name}()`,
                        source: {
                            file: analysis.file,
                            function: func.name,
                            line: func.line
                        },
                        validations: func.validations.slice(0, 5),
                        transitions_to: this.inferTransitions(func),
                        serviceCalls: func.serviceCalls,
                        isAutoGenerated: true
                    };

                    stages.push(stage);
                }
            }
        }

        // 4. Agregar stages de resultado estándar
        const outcomeStages = this.generateOutcomeStages(moduleKey);
        for (const outcome of outcomeStages) {
            if (!stages.find(s => s.id === outcome.id)) {
                stages.push(outcome);
            }
        }

        // 5. Ordenar por order
        stages.sort((a, b) => (a.order || 999) - (b.order || 999));

        // 6. Recalcular orders
        stages.forEach((s, i) => s.order = i + 1);

        return {
            name: config.name,
            module: moduleKey,
            version: this.generateVersion(),
            generatedAt: new Date().toISOString(),
            isAutoGenerated: true,
            entryPoint: config.entryPoint,
            stages: stages,
            sourceFiles: config.sourceFiles,
            stats: {
                total: stages.length,
                core: stages.filter(s => s.isCore).length,
                existing: stages.filter(s => s.isExisting).length,
                autoGenerated: stages.filter(s => s.isAutoGenerated).length,
                outcomes: stages.filter(s => s.is_final).length
            }
        };
    }

    /**
     * ========================================================================
     * Generar stages de resultado (éxito/rechazo)
     * ========================================================================
     */
    generateOutcomeStages(moduleKey) {
        const baseOrder = 100;

        const commonOutcomes = {
            attendance: [
                { id: 'REGISTERED', name: 'Fichaje Registrado', category: 'success', is_success: true },
                { id: 'REJECTED_QUALITY', name: 'Rechazado - Calidad', category: 'rejection', is_rejection: true },
                { id: 'REJECTED_NO_MATCH', name: 'Rechazado - No Match', category: 'rejection', is_rejection: true },
                { id: 'REJECTED_SUSPENDED', name: 'Rechazado - Suspendido', category: 'rejection', is_rejection: true },
                { id: 'REJECTED_NO_SHIFT', name: 'Rechazado - Sin Turno', category: 'rejection', is_rejection: true },
                { id: 'REJECTED_LATE_NO_AUTH', name: 'Rechazado - Sin Autorización', category: 'rejection', is_rejection: true }
            ],
            legal: [
                { id: 'CASE_CLOSED_SUCCESS', name: 'Caso Cerrado - Éxito', category: 'success', is_success: true },
                { id: 'CASE_CLOSED_FAILURE', name: 'Caso Cerrado - Sin Resolución', category: 'rejection', is_rejection: true },
                { id: 'CASE_ARCHIVED', name: 'Caso Archivado', category: 'final', is_final: true }
            ],
            medical: [
                { id: 'LEAVE_APPROVED', name: 'Licencia Aprobada', category: 'success', is_success: true },
                { id: 'LEAVE_REJECTED', name: 'Licencia Rechazada', category: 'rejection', is_rejection: true },
                { id: 'LEAVE_EXTENDED', name: 'Licencia Extendida', category: 'process' }
            ],
            vacation: [
                { id: 'VACATION_APPROVED', name: 'Vacaciones Aprobadas', category: 'success', is_success: true },
                { id: 'VACATION_REJECTED', name: 'Vacaciones Rechazadas', category: 'rejection', is_rejection: true },
                { id: 'VACATION_CANCELLED', name: 'Vacaciones Canceladas', category: 'final', is_final: true }
            ],
            sanctions: [
                { id: 'SANCTION_APPLIED', name: 'Sanción Aplicada', category: 'success', is_success: true },
                { id: 'SANCTION_DISMISSED', name: 'Sanción Desestimada', category: 'rejection', is_rejection: true },
                { id: 'APPEAL_PENDING', name: 'Apelación Pendiente', category: 'process' }
            ],
            procedures: [
                { id: 'PROCEDURE_COMPLETED', name: 'Procedimiento Completado', category: 'success', is_success: true },
                { id: 'PROCEDURE_CANCELLED', name: 'Procedimiento Cancelado', category: 'rejection', is_rejection: true }
            ],
            recruitment: [
                { id: 'CANDIDATE_HIRED', name: 'Candidato Contratado', category: 'success', is_success: true },
                { id: 'CANDIDATE_REJECTED', name: 'Candidato Rechazado', category: 'rejection', is_rejection: true },
                { id: 'POSITION_CLOSED', name: 'Posición Cerrada', category: 'final', is_final: true }
            ],
            payroll: [
                { id: 'PAYROLL_COMPLETED', name: 'Liquidación Completada', category: 'success', is_success: true },
                { id: 'PAYROLL_ERROR', name: 'Error en Liquidación', category: 'rejection', is_rejection: true },
                { id: 'PERIOD_CLOSED', name: 'Período Cerrado', category: 'final', is_final: true }
            ],
            notifications: [
                { id: 'DELIVERED', name: 'Entregada', category: 'success', is_success: true },
                { id: 'FAILED', name: 'Fallida', category: 'rejection', is_rejection: true },
                { id: 'EXPIRED', name: 'Expirada', category: 'final', is_final: true }
            ]
        };

        const outcomes = commonOutcomes[moduleKey] || [
            { id: 'COMPLETED', name: 'Completado', category: 'success', is_success: true },
            { id: 'FAILED', name: 'Fallido', category: 'rejection', is_rejection: true },
            { id: 'CANCELLED', name: 'Cancelado', category: 'final', is_final: true }
        ];

        return outcomes.map((outcome, i) => ({
            ...outcome,
            order: baseOrder + i,
            is_final: outcome.is_final || outcome.is_success || outcome.is_rejection,
            transitions_to: [],
            description: 'Estado final'
        }));
    }

    /**
     * ========================================================================
     * Generar contenido del archivo
     * ========================================================================
     */
    generateFileContent(workflow, moduleKey, config) {
        const className = this.generateClassName(moduleKey);
        const stagesCode = this.generateStagesCode(workflow.stages);

        return `/**
 * ============================================================================
 * ${workflow.name.toUpperCase()} - AUTO-GENERATED
 * ============================================================================
 *
 * ⚠️ ARCHIVO AUTO-GENERADO - NO EDITAR MANUALMENTE
 *
 * Este archivo es regenerado automáticamente por UniversalWorkflowGenerator
 * cuando cambia el código de los servicios relacionados.
 *
 * FUENTES:
 * ${workflow.sourceFiles.map(f => `* - ${f}`).join('\n * ')}
 *
 * Brain detecta este archivo via LIVE_CODE_SCAN y extrae los STAGES.
 * Cualquier cambio en los servicios fuente regenerará este archivo.
 *
 * Generado: ${workflow.generatedAt}
 * Versión: ${workflow.version}
 * Módulo: ${moduleKey}
 *
 * ESTADÍSTICAS:
 * - Total stages: ${workflow.stats.total}
 * - Core: ${workflow.stats.core}
 * - Existentes: ${workflow.stats.existing}
 * - Auto-generados: ${workflow.stats.autoGenerated}
 * - Estados finales: ${workflow.stats.outcomes}
 *
 * ============================================================================
 */

class ${className} {
    /**
     * STAGES - Detectados automáticamente por Brain via LIVE_CODE_SCAN
     */
    static STAGES = {
${stagesCode}
    };

    /**
     * WORKFLOW METADATA
     */
    static WORKFLOW_METADATA = {
        name: '${workflow.name}',
        module: '${moduleKey}',
        version: '${workflow.version}',
        isAutoGenerated: true,
        generatedAt: '${workflow.generatedAt}',
        sourceFiles: ${JSON.stringify(workflow.sourceFiles)},
        entry_point: '${workflow.entryPoint}',
        final_states: {
            success: ${JSON.stringify(workflow.stages.filter(s => s.is_success).map(s => s.id))},
            rejection: ${JSON.stringify(workflow.stages.filter(s => s.is_rejection).map(s => s.id))}
        },
        stats: ${JSON.stringify(workflow.stats)}
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

module.exports = ${className};
`;
    }

    /**
     * ========================================================================
     * Generar código de STAGES
     * ========================================================================
     */
    generateStagesCode(stages) {
        const lines = [];

        for (const stage of stages) {
            lines.push(`        ${stage.id}: {`);
            lines.push(`            name: '${this.escapeString(stage.name)}',`);
            lines.push(`            order: ${stage.order},`);
            lines.push(`            category: '${stage.category || 'process'}',`);

            if (stage.description) {
                lines.push(`            description: '${this.escapeString(stage.description)}',`);
            }

            if (stage.source) {
                lines.push(`            source: {`);
                lines.push(`                file: '${stage.source.file}',`);
                lines.push(`                function: '${stage.source.function}',`);
                lines.push(`                line: ${stage.source.line}`);
                lines.push(`            },`);
            }

            if (stage.validations && stage.validations.length > 0) {
                lines.push(`            validations: ${JSON.stringify(stage.validations)},`);
            }

            lines.push(`            transitions_to: ${JSON.stringify(stage.transitions_to || [])},`);

            if (stage.is_final) lines.push(`            is_final: true,`);
            if (stage.is_rejection) lines.push(`            is_rejection: true,`);
            if (stage.is_success) lines.push(`            is_success: true,`);
            if (stage.isAutoGenerated) lines.push(`            isAutoGenerated: true,`);
            if (stage.isCore) lines.push(`            isCore: true,`);
            if (stage.isExisting) lines.push(`            isExisting: true,`);

            lines.push(`        },\n`);
        }

        return lines.join('\n');
    }

    /**
     * ========================================================================
     * Actualizar registry de Brain
     * ========================================================================
     */
    async updateRegistry(moduleKey, workflow) {
        try {
            if (!fs.existsSync(this.registryPath)) {
                console.log(`   ⚠️ Registry no encontrado: ${this.registryPath}`);
                return;
            }

            const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));

            // Buscar el módulo en el registry
            const moduleIndex = registry.modules.findIndex(m =>
                m.id === moduleKey ||
                m.key === moduleKey ||
                (m.name && m.name.toLowerCase().includes(moduleKey))
            );

            if (moduleIndex >= 0) {
                // Actualizar workflows del módulo
                if (!registry.modules[moduleIndex].workflows) {
                    registry.modules[moduleIndex].workflows = {};
                }

                registry.modules[moduleIndex].workflows[`${moduleKey}_workflow`] = {
                    service: workflow.name,
                    file: `src/workflows/generated/${workflow.sourceFiles[0]?.replace('.js', 'Generated.js') || 'Unknown.js'}`,
                    stages_count: workflow.stages.length,
                    entry_point: workflow.entryPoint,
                    final_states: workflow.stages.filter(s => s.is_final).map(s => s.id),
                    auto_generated: true,
                    generated_at: workflow.generatedAt,
                    stats: workflow.stats
                };

                registry.modules[moduleIndex].lastBrainUpdate = new Date().toISOString();

                fs.writeFileSync(this.registryPath, JSON.stringify(registry, null, 2));
                console.log(`   📝 Registry actualizado para ${moduleKey}`);
            }
        } catch (error) {
            console.error(`   ⚠️ Error actualizando registry:`, error.message);
        }
    }

    /**
     * ========================================================================
     * HELPERS
     * ========================================================================
     */

    hashContent(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    generateVersion() {
        const now = new Date();
        return `2.0.${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-auto`;
    }

    getLineNumber(content, position) {
        return content.substring(0, position).split('\n').length;
    }

    extractFunctionBody(content, startPos) {
        let braceCount = 0;
        let started = false;
        let endPos = startPos;

        for (let i = startPos; i < content.length && i < startPos + 10000; i++) {
            if (content[i] === '{') {
                braceCount++;
                started = true;
            } else if (content[i] === '}') {
                braceCount--;
            }

            if (started && braceCount === 0) {
                endPos = i + 1;
                break;
            }
        }

        return content.substring(startPos, endPos);
    }

    extractValidations(funcBody) {
        const validations = [];
        const regex = /if\s*\(!?\s*([^)]{1,100})\)\s*\{?\s*(?:throw|return)/g;
        let match;

        while ((match = regex.exec(funcBody)) !== null) {
            validations.push(match[1].trim().substring(0, 80));
        }

        return validations.slice(0, 5);
    }

    extractServiceCalls(funcBody) {
        const calls = [];
        const regex = /await\s+(?:this\.)?(\w+(?:Service)?)\s*\.\s*(\w+)/g;
        let match;

        while ((match = regex.exec(funcBody)) !== null) {
            calls.push(`${match[1]}.${match[2]}`);
        }

        return [...new Set(calls)];
    }

    extractTransitions(funcBody) {
        const transitions = [];
        const regex = /(?:status|state|reason(?:Code)?)\s*[=:]\s*['"](\w+)['"]/g;
        let match;

        while ((match = regex.exec(funcBody)) !== null) {
            transitions.push(match[1]);
        }

        return [...new Set(transitions)];
    }

    hasErrorHandling(funcBody) {
        return /try\s*\{/.test(funcBody) && /catch\s*\(/.test(funcBody);
    }

    inferStageType(funcName) {
        const nameLower = funcName.toLowerCase();

        for (const [pattern, stageType] of Object.entries(this.universalFunctionPatterns)) {
            if (nameLower.includes(pattern)) {
                return stageType;
            }
        }

        return null;
    }

    generateStageId(funcName, stageType) {
        if (!stageType) return null;

        // Convertir camelCase a UPPER_SNAKE_CASE
        const snakeCase = funcName
            .replace(/([A-Z])/g, '_$1')
            .toUpperCase()
            .replace(/^_/, '');

        return snakeCase;
    }

    inferTransitions(func) {
        const transitions = [];

        for (const t of func.transitions) {
            if (t.toUpperCase().includes('SUCCESS') || t.toUpperCase().includes('APPROVED')) {
                transitions.push('COMPLETED');
            } else if (t.toUpperCase().includes('REJECT') || t.toUpperCase().includes('ERROR')) {
                transitions.push('FAILED');
            }
        }

        return [...new Set(transitions)];
    }

    inferCategory(funcName) {
        const name = funcName.toLowerCase();

        if (name.includes('valid') || name.includes('check')) return 'validation';
        if (name.includes('auth')) return 'authorization';
        if (name.includes('notify') || name.includes('send')) return 'notification';
        if (name.includes('find') || name.includes('get')) return 'lookup';
        if (name.includes('create') || name.includes('save')) return 'persistence';
        if (name.includes('approve') || name.includes('reject')) return 'decision';
        if (name.includes('escalate')) return 'escalation';

        return 'process';
    }

    formatStageName(stageId) {
        return stageId
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    generateClassName(moduleKey) {
        return moduleKey.charAt(0).toUpperCase() +
               moduleKey.slice(1) +
               'WorkflowGenerated';
    }

    escapeString(str) {
        return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
    }

    /**
     * ========================================================================
     * API para Brain
     * ========================================================================
     */

    /**
     * Obtener todos los workflows generados
     */
    async getAllGeneratedWorkflows() {
        const workflows = [];

        if (!fs.existsSync(this.outputDir)) {
            return workflows;
        }

        const files = fs.readdirSync(this.outputDir);

        for (const file of files) {
            if (!file.endsWith('.js')) continue;

            try {
                const WorkflowClass = require(path.join(this.outputDir, file));
                if (WorkflowClass.WORKFLOW_METADATA) {
                    workflows.push({
                        file,
                        ...WorkflowClass.WORKFLOW_METADATA,
                        stages: WorkflowClass.getStagesInOrder(),
                        tutorialSteps: WorkflowClass.getTutorialSteps()
                    });
                }
            } catch (e) {
                console.error(`Error loading ${file}:`, e.message);
            }
        }

        return workflows;
    }

    /**
     * Obtener workflow específico
     */
    async getWorkflow(moduleKey) {
        const config = this.moduleConfigs[moduleKey];
        if (!config) return null;

        const filePath = path.join(this.outputDir, config.outputFile);
        if (!fs.existsSync(filePath)) {
            // Generar si no existe
            await this.regenerateModuleWorkflow(moduleKey, config);
        }

        try {
            // Limpiar cache de require
            delete require.cache[require.resolve(filePath)];
            const WorkflowClass = require(filePath);

            return {
                module: moduleKey,
                ...WorkflowClass.WORKFLOW_METADATA,
                stages: WorkflowClass.getStagesInOrder(),
                tutorialSteps: WorkflowClass.getTutorialSteps()
            };
        } catch (e) {
            console.error(`Error loading workflow ${moduleKey}:`, e.message);
            return null;
        }
    }

    /**
     * Agregar nuevo módulo dinámicamente
     */
    addModuleConfig(moduleKey, config) {
        this.moduleConfigs[moduleKey] = config;
        console.log(`📦 [UNIVERSAL-WORKFLOW-GEN] Módulo agregado: ${moduleKey}`);
    }

    /**
     * Obtener módulos configurados
     */
    getConfiguredModules() {
        return Object.keys(this.moduleConfigs);
    }
}

module.exports = UniversalWorkflowGenerator;
