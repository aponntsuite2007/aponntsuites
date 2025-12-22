/**
 * ============================================================================
 * BUSINESS CIRCUITS REGISTRY
 * ============================================================================
 *
 * Registro completo de todos los circuitos de negocio del ecosistema.
 * Cada circuito define un flujo end-to-end de un proceso de negocio.
 *
 * CIRCUITOS PRINCIPALES:
 * 1. ATTENDANCE_CIRCUIT - Desde fichaje hasta reportes de asistencia
 * 2. PAYROLL_CIRCUIT - Desde asistencia hasta recibo de sueldo
 * 3. LEGAL_CIRCUIT - Desde incidente hasta resolución legal
 * 4. COMMERCIAL_CIRCUIT - Desde lead hasta cierre de venta
 * 5. HR_CIRCUIT - Desde onboarding hasta offboarding
 *
 * Created: 2025-12-20
 * Phase: 8 - Business Circuits
 */

const {
    BusinessCircuit,
    CircuitStage,
    CircuitTransition,
    CircuitType,
    TransitionType
} = require('../schemas/BusinessCircuit');

// =============================================================================
// 1. CIRCUITO DE ASISTENCIA (ATTENDANCE)
// =============================================================================
const ATTENDANCE_CIRCUIT = new BusinessCircuit({
    key: 'attendance',
    name: 'Circuito de Control de Asistencia',
    type: CircuitType.OPERATIONAL,
    version: '2.0.0',
    description: 'Flujo completo desde el fichaje biométrico hasta la generación de reportes de asistencia',
    businessPurpose: 'Registrar y controlar la presencia de empleados para cumplimiento laboral y cálculo de nómina',
    icon: 'fa-fingerprint',
    color: '#10b981',

    startPoint: 'biometric_capture',
    endPoints: ['reports_generated', 'attendance_rejected'],

    stages: [
        // STAGE 1: Captura Biométrica
        new CircuitStage({
            key: 'biometric_capture',
            name: 'Captura Biométrica',
            order: 1,
            description: 'El empleado se presenta ante el kiosco o app para registrar su asistencia',
            modules: ['biometric-enterprise', 'attendance'],
            services: ['BiometricService', 'FaceDetectionService'],
            endpoints: [
                '/api/v2/biometric/capture',
                '/api/v2/kiosk-enterprise/detect-employee'
            ],
            apks: ['employee', 'kiosk'],
            inputs: ['company_id', 'device_id', 'photo_base64'],
            outputs: ['face_detected', 'face_embedding'],
            events: ['biometric.capture.started'],
            estimatedTime: 1,
            isCritical: true,
            tour: {
                explanation: 'El empleado se posiciona frente a la cámara del kiosco o usa su celular para capturar su rostro.',
                businessValue: 'Garantiza que solo el empleado real pueda fichar, evitando fraudes.',
                commonIssues: [
                    'Mala iluminación',
                    'Empleado con gafas de sol',
                    'Cámara sucia'
                ],
                tips: [
                    'Asegurarse de que hay buena iluminación',
                    'Retirar gafas de sol o gorras'
                ]
            }
        }),

        // STAGE 2: Detección de Vida (Liveness)
        new CircuitStage({
            key: 'liveness_check',
            name: 'Verificación Anti-Spoofing',
            order: 2,
            description: 'Verificar que es una persona real y no una foto o video',
            modules: ['biometric-enterprise'],
            services: ['LivenessDetectionService'],
            endpoints: ['/api/v2/biometric-attendance/verify-real'],
            apks: ['employee', 'kiosk'],
            inputs: ['face_embedding', 'additional_frames'],
            outputs: ['is_real', 'confidence_score'],
            events: ['biometric.liveness.checked'],
            estimatedTime: 1,
            isCritical: true,
            tour: {
                explanation: 'El sistema analiza múltiples frames para detectar si es una persona real o un intento de fraude con foto/video.',
                businessValue: 'Previene fichajes fraudulentos con fotos impresas o videos.',
                commonIssues: ['Movimiento excesivo', 'Persona estática como estatua'],
                tips: ['Parpadear naturalmente', 'Moverse ligeramente']
            }
        }),

        // STAGE 3: Identificación del Empleado
        new CircuitStage({
            key: 'employee_identification',
            name: 'Identificación del Empleado',
            order: 3,
            description: 'Buscar coincidencia del rostro capturado con la base de datos biométrica',
            modules: ['biometric-enterprise', 'users'],
            services: ['FaceMatchingService', 'UserService'],
            endpoints: ['/api/v2/kiosk-enterprise/detect-employee'],
            apks: ['employee', 'kiosk'],
            inputs: ['face_embedding', 'company_id'],
            outputs: ['user_id', 'employee_name', 'match_confidence'],
            events: ['employee.identified'],
            estimatedTime: 2,
            isCritical: true,
            tour: {
                explanation: 'El sistema compara el rostro capturado contra todas las plantillas biométricas registradas de la empresa.',
                businessValue: 'Identifica automáticamente al empleado sin necesidad de tarjetas o códigos.',
                commonIssues: ['Empleado no registrado', 'Plantilla biométrica desactualizada'],
                tips: ['Verificar que el empleado tiene consentimiento biométrico activo']
            }
        }),

        // STAGE 4: Validación de Turno
        new CircuitStage({
            key: 'shift_validation',
            name: 'Validación de Turno Asignado',
            order: 4,
            description: 'Verificar si el empleado tiene turno asignado y está dentro del horario permitido',
            modules: ['shifts', 'attendance'],
            services: ['ShiftService', 'ShiftCalculatorService'],
            endpoints: ['/api/v1/shifts/user/:id', '/api/v1/attendance/validate'],
            apks: ['employee', 'kiosk'],
            inputs: ['user_id', 'current_timestamp'],
            outputs: ['shift_id', 'is_within_shift', 'tolerance_minutes'],
            events: ['shift.validated'],
            estimatedTime: 1,
            isCritical: false,
            tour: {
                explanation: 'El sistema verifica que el empleado tenga turno asignado y que esté fichando dentro del horario con tolerancia.',
                businessValue: 'Permite detectar fichajes fuera de horario o empleados sin turno.',
                commonIssues: ['Sin turno asignado', 'Fuera de tolerancia'],
                tips: ['Los administradores pueden configurar tolerancias por turno']
            }
        }),

        // STAGE 5: Registro de Asistencia
        new CircuitStage({
            key: 'attendance_record',
            name: 'Registro de Check-in/Check-out',
            order: 5,
            description: 'Guardar el registro de asistencia en la base de datos',
            modules: ['attendance'],
            services: ['AttendanceService', 'AttendanceWorkflowService'],
            endpoints: [
                '/api/v2/biometric-attendance/clock-in',
                '/api/v2/biometric-attendance/clock-out',
                '/api/v1/attendance/checkin',
                '/api/v1/attendance/checkout'
            ],
            apks: ['employee', 'kiosk'],
            inputs: ['user_id', 'shift_id', 'timestamp', 'location', 'device_type'],
            outputs: ['attendance_id', 'status', 'is_late', 'overtime_detected'],
            events: ['attendance.created', 'attendance.checkin', 'attendance.checkout'],
            estimatedTime: 1,
            isCritical: true,
            tour: {
                explanation: 'Se crea el registro de asistencia con todos los datos: hora, ubicación, tipo de fichaje (entrada/salida).',
                businessValue: 'Es el dato base para cálculo de horas trabajadas y nómina.',
                commonIssues: ['Doble fichaje en el mismo minuto', 'Falla de conexión'],
                tips: ['El sistema tiene cola offline para fichajes sin conexión']
            }
        }),

        // STAGE 6: Cálculo de Horas
        new CircuitStage({
            key: 'hours_calculation',
            name: 'Cálculo de Horas Trabajadas',
            order: 6,
            description: 'Calcular horas normales, extras, nocturnas basado en el turno',
            modules: ['attendance', 'hours-cube-dashboard', 'shifts'],
            services: ['AttendanceAnalyticsService', 'OvertimeCalculatorService', 'ShiftCalculatorService'],
            endpoints: ['/api/hours-cube/calculate', '/api/attendance-analytics/hours'],
            apks: [],
            inputs: ['attendance_id', 'shift_id', 'calendar_events'],
            outputs: ['hours_normal', 'hours_overtime', 'hours_night', 'hours_holiday'],
            events: ['hours.calculated'],
            estimatedTime: 2,
            isCritical: true,
            tour: {
                explanation: 'El sistema calcula automáticamente cuántas horas normales, extras (50% o 100%), y nocturnas trabajó el empleado.',
                businessValue: 'Automatiza el cálculo complejo de horas para liquidación de sueldos.',
                commonIssues: ['Turno mal configurado', 'Feriados no cargados'],
                tips: ['Verificar que el calendario de feriados esté actualizado']
            }
        }),

        // STAGE 7: Detección de Anomalías
        new CircuitStage({
            key: 'anomaly_detection',
            name: 'Detección de Anomalías',
            order: 7,
            description: 'Identificar tardanzas, ausencias, fichajes irregulares',
            modules: ['attendance', 'attendance-scoring'],
            services: ['AttendanceScoringEngine', 'AttendanceAnalyticsService'],
            endpoints: ['/api/attendance-analytics/anomalies'],
            apks: [],
            inputs: ['attendance_id', 'shift_id', 'historical_data'],
            outputs: ['anomalies', 'attendance_score', 'alerts'],
            events: ['attendance.anomaly.detected'],
            estimatedTime: 2,
            isCritical: false,
            tour: {
                explanation: 'El sistema detecta patrones irregulares: llegadas tarde frecuentes, ausencias sin justificar, fichajes en ubicaciones sospechosas.',
                businessValue: 'Permite tomar acciones preventivas antes de que se conviertan en problemas graves.',
                commonIssues: ['Falsos positivos', 'Empleado con justificación no cargada'],
                tips: ['Revisar justificaciones pendientes antes de aplicar sanciones']
            }
        }),

        // STAGE 8: Notificación a Supervisor
        new CircuitStage({
            key: 'supervisor_notification',
            name: 'Notificación al Supervisor',
            order: 8,
            description: 'Alertar al supervisor sobre anomalías detectadas',
            modules: ['notifications-enterprise', 'organizational-structure'],
            services: ['NotificationUnifiedService', 'OrganizationalStructureService'],
            endpoints: ['/api/notifications/send'],
            apks: [],
            inputs: ['anomalies', 'user_id', 'supervisor_id'],
            outputs: ['notification_sent', 'escalation_level'],
            events: ['notification.sent'],
            estimatedTime: 1,
            isCritical: false,
            tour: {
                explanation: 'Si se detectan anomalías significativas, el sistema notifica automáticamente al supervisor directo.',
                businessValue: 'Mantiene informados a los supervisores sin que tengan que revisar constantemente.',
                commonIssues: ['Supervisor sin email configurado', 'Notificaciones deshabilitadas'],
                tips: ['Configurar preferencias de notificación por supervisor']
            }
        }),

        // STAGE 9: Generación de Reportes
        new CircuitStage({
            key: 'reports_generated',
            name: 'Generación de Reportes',
            order: 9,
            description: 'Generar reportes diarios, semanales, mensuales de asistencia',
            modules: ['attendance', 'hours-cube-dashboard', 'reports'],
            services: ['AttendanceReportService', 'AttendanceAnalyticsService'],
            endpoints: [
                '/api/attendance-analytics/reports',
                '/api/hours-cube/reports'
            ],
            apks: [],
            inputs: ['company_id', 'date_range', 'department_id'],
            outputs: ['report_pdf', 'report_excel', 'dashboard_data'],
            events: ['report.generated'],
            estimatedTime: 5,
            isCritical: false,
            tour: {
                explanation: 'El sistema genera reportes consolidados de asistencia: por empleado, departamento, período.',
                businessValue: 'Proporciona visibilidad a gerencia y datos para auditorías.',
                commonIssues: ['Período sin datos', 'Filtros mal aplicados'],
                tips: ['Exportar a Excel para análisis adicional']
            }
        }),

        // STAGE FINAL: Rechazo
        new CircuitStage({
            key: 'attendance_rejected',
            name: 'Asistencia Rechazada',
            order: 99,
            description: 'Fichaje rechazado por fallo de validación',
            modules: ['attendance'],
            services: ['AttendanceService'],
            endpoints: [],
            apks: ['employee', 'kiosk'],
            inputs: ['rejection_reason'],
            outputs: ['rejection_logged'],
            events: ['attendance.rejected'],
            estimatedTime: 0,
            isCritical: false,
            tour: {
                explanation: 'Si el fichaje falla validación (rostro no reconocido, sin turno, etc.), se registra el intento y se muestra mensaje al empleado.',
                businessValue: 'Mantiene auditoría de intentos fallidos para análisis de seguridad.',
                commonIssues: [],
                tips: ['Revisar logs de rechazos para detectar problemas sistémicos']
            }
        })
    ],

    transitions: [
        { from: 'biometric_capture', to: 'liveness_check', type: TransitionType.SEQUENTIAL },
        { from: 'liveness_check', to: 'employee_identification', type: TransitionType.CONDITIONAL, condition: 'is_real === true', onFalse: 'attendance_rejected' },
        { from: 'employee_identification', to: 'shift_validation', type: TransitionType.CONDITIONAL, condition: 'match_confidence >= 0.85', onFalse: 'attendance_rejected' },
        { from: 'shift_validation', to: 'attendance_record', type: TransitionType.SEQUENTIAL },
        { from: 'attendance_record', to: 'hours_calculation', type: TransitionType.SEQUENTIAL },
        { from: 'hours_calculation', to: 'anomaly_detection', type: TransitionType.SEQUENTIAL },
        { from: 'anomaly_detection', to: ['supervisor_notification', 'reports_generated'], type: TransitionType.PARALLEL },
        { from: 'supervisor_notification', to: 'reports_generated', type: TransitionType.OPTIONAL }
    ],

    roles: ['employee', 'supervisor', 'hr_admin'],
    departments: ['all'],

    dependsOn: [],
    provides: ['attendance_data', 'hours_worked', 'attendance_score'],

    tour: {
        introduction: 'El Circuito de Asistencia es el proceso central que registra y controla la presencia de empleados. Desde el momento en que un empleado ficha hasta la generación de reportes consolidados.',
        stepsOverview: 'El proceso inicia con la captura biométrica, pasa por validaciones de seguridad (liveness, matching), registro del fichaje, cálculo de horas, detección de anomalías, y finaliza con reportes.',
        businessImpact: 'Este circuito impacta directamente en: 1) Cumplimiento laboral, 2) Cálculo de nómina, 3) Gestión de personal, 4) Detección de fraudes.',
        relatedCircuits: ['payroll', 'hr'],
        faqs: [
            {
                question: '¿Qué pasa si el empleado no tiene turno asignado?',
                answer: 'El fichaje se registra con flag "sin_turno" y se notifica al supervisor para que asigne turno o justifique.'
            },
            {
                question: '¿Cómo se calculan las horas extras?',
                answer: 'Se comparan las horas fichadas vs el turno asignado. Lo que exceda se clasifica como extra (50% o 100% según configuración).'
            }
        ]
    },

    example: {
        scenario: 'Juan Pérez llega a trabajar a las 8:05 AM (su turno es de 8:00 AM)',
        inputData: {
            employee: 'Juan Pérez',
            shift: '08:00 - 17:00',
            arrival_time: '08:05',
            tolerance: '10 min'
        },
        expectedOutput: {
            status: 'ON_TIME (dentro de tolerancia)',
            hours_normal: 9,
            hours_overtime: 0,
            anomalies: []
        },
        walkthrough: [
            'Juan se presenta ante el kiosco',
            'El kiosco captura su rostro',
            'El sistema verifica que es persona real (liveness)',
            'Busca coincidencia en base biométrica → Match 94%',
            'Valida turno → Turno 08:00-17:00, tolerancia 10 min → OK',
            'Registra check-in a las 08:05',
            'Calcula: llegó 5 min tarde pero dentro de tolerancia',
            'No detecta anomalías',
            'Fin del circuito'
        ]
    }
});

// =============================================================================
// 2. CIRCUITO DE NÓMINA (PAYROLL)
// =============================================================================
const PAYROLL_CIRCUIT = new BusinessCircuit({
    key: 'payroll',
    name: 'Circuito de Liquidación de Sueldos',
    type: CircuitType.FINANCIAL,
    version: '2.0.0',
    description: 'Flujo completo desde recolección de datos de asistencia hasta el recibo de sueldo en manos del empleado',
    businessPurpose: 'Calcular y pagar correctamente los sueldos de los empleados según datos de asistencia, ausencias y conceptos configurados',
    icon: 'fa-money-bill-wave',
    color: '#f59e0b',

    startPoint: 'period_setup',
    endPoints: ['payslip_delivered', 'liquidation_error'],

    stages: [
        // STAGE 1: Apertura de Período
        new CircuitStage({
            key: 'period_setup',
            name: 'Apertura del Período de Liquidación',
            order: 1,
            description: 'Abrir el período de nómina (quincenal o mensual)',
            modules: ['payroll'],
            services: ['PayrollService'],
            endpoints: ['/api/payroll/periods', '/api/payroll/periods/:id/open'],
            apks: [],
            inputs: ['company_id', 'period_type', 'start_date', 'end_date'],
            outputs: ['period_id', 'status'],
            events: ['payroll.period.opened'],
            estimatedTime: 2,
            isCritical: true,
            tour: {
                explanation: 'El administrador de nómina abre un nuevo período de liquidación definiendo las fechas que abarca.',
                businessValue: 'Define el marco temporal para todos los cálculos de nómina.',
                commonIssues: ['Período anterior sin cerrar', 'Fechas superpuestas'],
                tips: ['Cerrar el período anterior antes de abrir uno nuevo']
            }
        }),

        // STAGE 2: Recolección de Asistencia
        new CircuitStage({
            key: 'attendance_collection',
            name: 'Recolección de Datos de Asistencia',
            order: 2,
            description: 'Obtener todos los registros de asistencia del período',
            modules: ['attendance', 'hours-cube-dashboard'],
            services: ['AttendanceService', 'AttendanceAnalyticsService'],
            endpoints: ['/api/attendance/period/:periodId', '/api/hours-cube/summary'],
            apks: [],
            inputs: ['period_id', 'company_id'],
            outputs: ['attendance_records', 'hours_summary', 'employees_count'],
            events: ['payroll.attendance.collected'],
            estimatedTime: 5,
            isCritical: true,
            tour: {
                explanation: 'El sistema recopila automáticamente todos los fichajes del período para cada empleado.',
                businessValue: 'Base de datos para calcular horas trabajadas y pagos.',
                commonIssues: ['Fichajes pendientes de aprobación', 'Empleados sin fichajes'],
                tips: ['Verificar fichajes pendientes antes de iniciar liquidación']
            }
        }),

        // STAGE 3: Recolección de Ausencias
        new CircuitStage({
            key: 'absence_collection',
            name: 'Recolección de Ausencias y Licencias',
            order: 3,
            description: 'Obtener vacaciones, licencias médicas, permisos del período',
            modules: ['vacation-management', 'medical-cases', 'absences'],
            services: ['VacationService', 'MedicalService', 'AbsenceService'],
            endpoints: [
                '/api/vacations/period/:periodId',
                '/api/medical-cases/period/:periodId',
                '/api/absences/period/:periodId'
            ],
            apks: [],
            inputs: ['period_id', 'company_id'],
            outputs: ['vacation_days', 'medical_days', 'absence_days', 'total_justified'],
            events: ['payroll.absences.collected'],
            estimatedTime: 3,
            isCritical: true,
            tour: {
                explanation: 'Se recopilan todas las ausencias justificadas: vacaciones aprobadas, licencias médicas con certificado, permisos autorizados.',
                businessValue: 'Las ausencias justificadas se pagan según configuración (100% vacaciones, % licencia según tipo).',
                commonIssues: ['Licencia sin certificado', 'Vacación no aprobada'],
                tips: ['Verificar que todas las ausencias tengan justificación']
            }
        }),

        // STAGE 4: Aplicar Descuentos y Sanciones
        new CircuitStage({
            key: 'deductions_collection',
            name: 'Aplicación de Descuentos y Sanciones',
            order: 4,
            description: 'Obtener sanciones disciplinarias y otros descuentos',
            modules: ['sanctions', 'salary-advanced'],
            services: ['SanctionsService', 'SalaryAdvancedService'],
            endpoints: [
                '/api/sanctions/period/:periodId',
                '/api/salary-advanced/pending/:periodId'
            ],
            apks: [],
            inputs: ['period_id', 'company_id'],
            outputs: ['sanction_deductions', 'advance_deductions', 'other_deductions'],
            events: ['payroll.deductions.collected'],
            estimatedTime: 2,
            isCritical: false,
            tour: {
                explanation: 'Se aplican descuentos por: sanciones (días de suspensión), anticipos de sueldo pendientes, préstamos, etc.',
                businessValue: 'Garantiza que los descuentos se apliquen correctamente en la liquidación.',
                commonIssues: ['Sanción sin aprobación de RRHH', 'Anticipo ya descontado'],
                tips: ['Revisar lista de descuentos antes de confirmar']
            }
        }),

        // STAGE 5: Obtener Plantilla Remunerativa
        new CircuitStage({
            key: 'template_fetch',
            name: 'Obtención de Plantilla Remunerativa',
            order: 5,
            description: 'Obtener plantilla de liquidación asignada a cada empleado',
            modules: ['payroll'],
            services: ['PayrollTemplateService'],
            endpoints: ['/api/payroll/templates', '/api/payroll/user-assignments'],
            apks: [],
            inputs: ['user_ids', 'company_id'],
            outputs: ['template_assignments', 'concepts_per_user'],
            events: ['payroll.templates.loaded'],
            estimatedTime: 2,
            isCritical: true,
            tour: {
                explanation: 'Cada empleado tiene una plantilla asignada que define qué conceptos (básico, bonos, deducciones) le corresponden.',
                businessValue: 'Permite manejar diferentes estructuras salariales en la misma empresa.',
                commonIssues: ['Empleado sin plantilla', 'Plantilla desactualizada'],
                tips: ['Verificar asignaciones antes de cada liquidación']
            }
        }),

        // STAGE 6: Cálculo de Conceptos
        new CircuitStage({
            key: 'calculation',
            name: 'Cálculo de Conceptos Remunerativos',
            order: 6,
            description: 'Calcular cada concepto de la liquidación según fórmulas',
            modules: ['payroll'],
            services: ['PayrollCalculatorService', 'ConceptDependencyService'],
            endpoints: ['/api/payroll/calculate', '/api/payroll/concepts/evaluate'],
            apks: [],
            inputs: ['template_assignments', 'hours_data', 'absences', 'deductions'],
            outputs: ['calculated_concepts', 'gross_salary', 'net_salary'],
            events: ['payroll.calculated'],
            estimatedTime: 10,
            isCritical: true,
            tour: {
                explanation: 'El motor de cálculo evalúa cada concepto (salario base, horas extras 50%, horas extras 100%, bonos, deducciones, aportes) según las fórmulas configuradas.',
                businessValue: 'Automatiza el cálculo complejo de liquidación, respetando dependencias entre conceptos.',
                commonIssues: ['Fórmula con error', 'Concepto dependiente sin valor'],
                tips: ['Las fórmulas pueden usar: horasTrabajadas, salarioBase, diasFeriado, etc.']
            }
        }),

        // STAGE 7: Validación de Liquidación
        new CircuitStage({
            key: 'validation',
            name: 'Validación de Liquidación',
            order: 7,
            description: 'Validar que los cálculos sean correctos y coherentes',
            modules: ['payroll'],
            services: ['PayrollValidationService'],
            endpoints: ['/api/payroll/validate', '/api/payroll/runs/:id/preview'],
            apks: [],
            inputs: ['calculated_data', 'company_rules'],
            outputs: ['validation_result', 'warnings', 'errors'],
            events: ['payroll.validated'],
            estimatedTime: 3,
            isCritical: true,
            tour: {
                explanation: 'El sistema valida: salarios dentro de rangos, deducciones no superan límites legales, todos los empleados procesados.',
                businessValue: 'Previene errores costosos antes de pagar.',
                commonIssues: ['Sueldo negativo', 'Deducción mayor al bruto'],
                tips: ['Revisar detalladamente cualquier warning']
            }
        }),

        // STAGE 8: Aprobación
        new CircuitStage({
            key: 'approval',
            name: 'Aprobación de Liquidación',
            order: 8,
            description: 'Aprobación por parte de RRHH y/o Gerencia',
            modules: ['payroll', 'workflows'],
            services: ['PayrollService', 'ApprovalWorkflowService'],
            endpoints: ['/api/payroll/runs/:id/approve', '/api/payroll/runs/:id/reject'],
            apks: [],
            inputs: ['run_id', 'approver_id'],
            outputs: ['approval_status', 'approved_at', 'approver_comments'],
            events: ['payroll.approved', 'payroll.rejected'],
            estimatedTime: 30,
            isCritical: true,
            tour: {
                explanation: 'La liquidación debe ser aprobada por el responsable de RRHH antes de proceder al pago.',
                businessValue: 'Control humano final antes de comprometer fondos.',
                commonIssues: ['Aprobador ausente', 'Sin permisos para aprobar'],
                tips: ['Configurar aprobadores suplentes para vacaciones']
            }
        }),

        // STAGE 9: Generación de Recibos
        new CircuitStage({
            key: 'payslip_generation',
            name: 'Generación de Recibos de Sueldo',
            order: 9,
            description: 'Generar PDF de recibos para cada empleado',
            modules: ['payroll'],
            services: ['PayslipService', 'PDFGeneratorService'],
            endpoints: ['/api/payroll/runs/:id/payslips', '/api/payroll/liquidations/:id/pdf'],
            apks: ['employee'],
            inputs: ['run_id', 'template_pdf'],
            outputs: ['payslip_pdfs', 'batch_id'],
            events: ['payslip.generated'],
            estimatedTime: 5,
            isCritical: true,
            tour: {
                explanation: 'Se genera un PDF de recibo de sueldo para cada empleado con el detalle de conceptos.',
                businessValue: 'Documento legal que comprueba el pago al empleado.',
                commonIssues: ['Template de recibo corrupto', 'Datos faltantes'],
                tips: ['Verificar que el template tenga todos los campos requeridos por ley']
            }
        }),

        // STAGE 10: Distribución de Recibos
        new CircuitStage({
            key: 'payslip_delivered',
            name: 'Entrega de Recibos al Empleado',
            order: 10,
            description: 'Enviar recibo por email y/o disponibilizar en app',
            modules: ['payroll', 'notifications-enterprise'],
            services: ['PayslipService', 'NotificationUnifiedService', 'EmailService'],
            endpoints: ['/api/payroll/payslips/:id/send', '/api/payroll/liquidations/employee/:userId'],
            apks: ['employee'],
            inputs: ['payslip_id', 'delivery_method'],
            outputs: ['delivered', 'viewed_by_employee'],
            events: ['payslip.delivered', 'payslip.viewed'],
            estimatedTime: 2,
            isCritical: false,
            tour: {
                explanation: 'El recibo se envía por email al empleado y queda disponible en su app móvil para descargar.',
                businessValue: 'El empleado tiene acceso inmediato a su recibo sin necesidad de pedirlo.',
                commonIssues: ['Email no configurado', 'Filtro de spam'],
                tips: ['Verificar que empleados tengan email válido configurado']
            }
        }),

        // STAGE ERROR
        new CircuitStage({
            key: 'liquidation_error',
            name: 'Error en Liquidación',
            order: 99,
            description: 'La liquidación falló por algún motivo',
            modules: ['payroll'],
            services: ['PayrollService'],
            endpoints: [],
            apks: [],
            inputs: ['error_reason', 'error_details'],
            outputs: ['error_logged'],
            events: ['payroll.error'],
            estimatedTime: 0,
            isCritical: false,
            tour: {
                explanation: 'Si algún paso crítico falla, el proceso se detiene y se registra el error para corrección.',
                businessValue: 'Previene pagos incorrectos.',
                commonIssues: [],
                tips: ['Revisar logs de error y corregir antes de reintentar']
            }
        })
    ],

    transitions: [
        { from: 'period_setup', to: 'attendance_collection', type: TransitionType.SEQUENTIAL },
        { from: 'attendance_collection', to: 'absence_collection', type: TransitionType.SEQUENTIAL },
        { from: 'absence_collection', to: 'deductions_collection', type: TransitionType.SEQUENTIAL },
        { from: 'deductions_collection', to: 'template_fetch', type: TransitionType.SEQUENTIAL },
        { from: 'template_fetch', to: 'calculation', type: TransitionType.SEQUENTIAL },
        { from: 'calculation', to: 'validation', type: TransitionType.SEQUENTIAL },
        { from: 'validation', to: 'approval', type: TransitionType.CONDITIONAL, condition: 'errors.length === 0', onFalse: 'liquidation_error' },
        { from: 'approval', to: 'payslip_generation', type: TransitionType.CONDITIONAL, condition: 'approved === true', onFalse: 'liquidation_error' },
        { from: 'payslip_generation', to: 'payslip_delivered', type: TransitionType.SEQUENTIAL }
    ],

    roles: ['hr_admin', 'payroll_admin', 'manager', 'employee'],
    departments: ['rrhh', 'finance'],

    dependsOn: ['attendance'],
    provides: ['payslips', 'salary_data', 'tax_data'],

    tour: {
        introduction: 'El Circuito de Nómina es el proceso que transforma los datos de asistencia en el recibo de sueldo que recibe cada empleado. Es uno de los procesos más críticos del sistema.',
        stepsOverview: 'Inicia con la apertura del período, recolecta asistencia y ausencias, aplica la plantilla de cada empleado, calcula conceptos, valida, aprueba, genera y distribuye recibos.',
        businessImpact: 'Errores en este proceso pueden generar: 1) Demandas laborales, 2) Multas de entes reguladores, 3) Insatisfacción de empleados, 4) Problemas contables.',
        relatedCircuits: ['attendance', 'hr'],
        faqs: [
            {
                question: '¿Cómo se calculan las horas extras?',
                answer: 'Se toman las horas del circuito de asistencia que excedan el turno. Al 50% si son primeras 2 horas, al 100% las siguientes.'
            },
            {
                question: '¿Qué pasa si un empleado no tiene plantilla?',
                answer: 'El sistema lo marca con error y no lo procesa. Debe asignarse plantilla antes de liquidar.'
            }
        ]
    },

    example: {
        scenario: 'Liquidación mensual de María García - Diciembre 2025',
        inputData: {
            employee: 'María García',
            period: '01/12/2025 - 31/12/2025',
            hours_normal: 176,
            hours_overtime_50: 8,
            vacation_days: 5,
            salary_base: 150000
        },
        expectedOutput: {
            gross_salary: 163500,
            deductions: 32700,
            net_salary: 130800,
            concepts: [
                { name: 'Salario Base', value: 150000 },
                { name: 'Horas Extras 50%', value: 6818 },
                { name: 'Vacaciones (5 días)', value: 6682 },
                { name: 'Jubilación (-11%)', value: -17985 },
                { name: 'Obra Social (-3%)', value: -4905 },
                { name: 'Otros aportes', value: -9810 }
            ]
        },
        walkthrough: [
            'RRHH abre período de Diciembre',
            'Sistema recolecta 176 horas normales + 8 extras de María',
            'Sistema detecta 5 días de vacaciones tomadas',
            'No hay sanciones ni anticipos pendientes',
            'Se carga plantilla "Administrativo Nivel 2"',
            'Se calculan todos los conceptos según fórmulas',
            'Validación: OK, sin errores ni warnings',
            'Gerente de RRHH aprueba liquidación',
            'Se genera PDF del recibo',
            'Se envía por email a María',
            'María descarga desde app Employee'
        ]
    }
});

// =============================================================================
// 3. CIRCUITO LEGAL
// =============================================================================
const LEGAL_CIRCUIT = new BusinessCircuit({
    key: 'legal',
    name: 'Circuito de Gestión Legal Laboral',
    type: CircuitType.LEGAL,
    version: '1.0.0',
    description: 'Flujo de gestión de casos legales laborales desde el incidente hasta la resolución',
    businessPurpose: 'Gestionar y documentar adecuadamente situaciones legales para proteger a la empresa y cumplir normativas',
    icon: 'fa-gavel',
    color: '#dc2626',

    startPoint: 'incident_report',
    endPoints: ['case_closed', 'case_escalated'],

    stages: [
        new CircuitStage({
            key: 'incident_report',
            name: 'Reporte de Incidente',
            order: 1,
            description: 'Se reporta un incidente que puede tener implicaciones legales',
            modules: ['legal', 'sanctions'],
            services: ['LegalCaseService', 'IncidentService'],
            endpoints: ['/api/v1/legal/cases', '/api/v1/legal/incidents'],
            apks: [],
            inputs: ['incident_type', 'parties_involved', 'description', 'evidence'],
            outputs: ['case_id', 'case_number'],
            events: ['legal.case.created'],
            estimatedTime: 30,
            isCritical: true,
            tour: {
                explanation: 'Se documenta el incidente con todos los detalles: qué pasó, quiénes están involucrados, evidencia disponible.',
                businessValue: 'La documentación temprana es crítica para cualquier proceso legal posterior.',
                commonIssues: ['Falta de evidencia', 'Demora en reportar'],
                tips: ['Documentar inmediatamente con fechas y testigos']
            }
        }),

        new CircuitStage({
            key: 'evidence_collection',
            name: 'Recolección de Evidencia',
            order: 2,
            description: 'Recopilar documentación, registros y testimonios',
            modules: ['legal', 'documents', 'attendance'],
            services: ['LegalCase360Service', 'DocumentService'],
            endpoints: ['/api/v1/legal/cases/:id/documents', '/api/v1/legal/cases/:id/evidence'],
            apks: [],
            inputs: ['case_id'],
            outputs: ['evidence_list', 'documents_attached'],
            events: ['legal.evidence.collected'],
            estimatedTime: 120,
            isCritical: true,
            tour: {
                explanation: 'Se reúne toda la documentación relevante: contrato, registros de asistencia, emails, testimonios de testigos.',
                businessValue: 'Evidencia sólida determina el resultado del caso.',
                commonIssues: ['Evidencia borrada', 'Testigos no disponibles'],
                tips: ['Preservar comunicaciones originales sin modificar']
            }
        }),

        new CircuitStage({
            key: 'legal_analysis',
            name: 'Análisis Legal',
            order: 3,
            description: 'Abogado analiza el caso y determina estrategia',
            modules: ['legal'],
            services: ['LegalWorkflowService', 'LegalJurisdictionService'],
            endpoints: ['/api/v1/legal/cases/:id/analysis'],
            apks: [],
            inputs: ['case_id', 'evidence', 'jurisdiction'],
            outputs: ['legal_opinion', 'recommended_action', 'risk_assessment'],
            events: ['legal.analysis.completed'],
            estimatedTime: 240,
            isCritical: true,
            tour: {
                explanation: 'El equipo legal analiza hechos, evidencia y normativa aplicable para determinar la mejor estrategia.',
                businessValue: 'Análisis experto minimiza riesgos legales y costos.',
                commonIssues: ['Normativa ambigua', 'Jurisprudencia contradictoria'],
                tips: ['Consultar casos similares previos']
            }
        }),

        new CircuitStage({
            key: 'mediation',
            name: 'Intento de Mediación',
            order: 4,
            description: 'Intentar resolver el conflicto sin llegar a juicio',
            modules: ['legal'],
            services: ['LegalWorkflowService'],
            endpoints: ['/api/v1/legal/cases/:id/mediation'],
            apks: [],
            inputs: ['case_id', 'parties', 'mediator'],
            outputs: ['mediation_result', 'agreement'],
            events: ['legal.mediation.started', 'legal.mediation.completed'],
            estimatedTime: 180,
            isCritical: false,
            tour: {
                explanation: 'Se intenta llegar a un acuerdo con la otra parte mediante mediación antes de ir a juicio.',
                businessValue: 'La mediación es más rápida y económica que un juicio.',
                commonIssues: ['Parte no cooperativa', 'Posiciones irreconciliables'],
                tips: ['Preparar propuesta de acuerdo razonable']
            }
        }),

        new CircuitStage({
            key: 'case_closed',
            name: 'Caso Cerrado',
            order: 5,
            description: 'El caso se resuelve satisfactoriamente',
            modules: ['legal'],
            services: ['LegalCaseService'],
            endpoints: ['/api/v1/legal/cases/:id/close'],
            apks: [],
            inputs: ['case_id', 'resolution', 'final_documents'],
            outputs: ['closure_record', 'lessons_learned'],
            events: ['legal.case.closed'],
            estimatedTime: 30,
            isCritical: false,
            tour: {
                explanation: 'El caso se cierra con documentación de la resolución y lecciones aprendidas.',
                businessValue: 'El cierre formal previene reaperturas y documenta precedentes.',
                commonIssues: [],
                tips: ['Documentar lecciones para prevenir casos similares']
            }
        }),

        new CircuitStage({
            key: 'case_escalated',
            name: 'Caso Escalado a Juicio',
            order: 6,
            description: 'El caso no se resolvió y va a instancia judicial',
            modules: ['legal'],
            services: ['LegalWorkflowService'],
            endpoints: ['/api/v1/legal/cases/:id/escalate'],
            apks: [],
            inputs: ['case_id', 'court', 'attorney'],
            outputs: ['lawsuit_filed', 'hearing_dates'],
            events: ['legal.case.escalated'],
            estimatedTime: 60,
            isCritical: true,
            tour: {
                explanation: 'Si la mediación falla, el caso se escala a la instancia judicial correspondiente.',
                businessValue: 'Preparación adecuada aumenta probabilidades de éxito en juicio.',
                commonIssues: ['Plazos vencidos', 'Documentación incompleta'],
                tips: ['Mantener calendario de audiencias actualizado']
            }
        })
    ],

    transitions: [
        { from: 'incident_report', to: 'evidence_collection', type: TransitionType.SEQUENTIAL },
        { from: 'evidence_collection', to: 'legal_analysis', type: TransitionType.SEQUENTIAL },
        { from: 'legal_analysis', to: 'mediation', type: TransitionType.SEQUENTIAL },
        { from: 'mediation', to: 'case_closed', type: TransitionType.CONDITIONAL, condition: 'agreement_reached === true' },
        { from: 'mediation', to: 'case_escalated', type: TransitionType.CONDITIONAL, condition: 'agreement_reached === false' }
    ],

    roles: ['legal_admin', 'hr_admin', 'manager', 'attorney'],
    departments: ['legal', 'rrhh'],

    dependsOn: [],
    provides: ['legal_records', 'case_outcomes'],

    tour: {
        introduction: 'El Circuito Legal gestiona todos los casos legales laborales de la empresa, desde incidentes menores hasta juicios. Una gestión adecuada protege a la empresa y sus empleados.',
        stepsOverview: 'El proceso comienza con el reporte del incidente, continúa con recolección de evidencia, análisis legal, intento de mediación, y termina con cierre o escalamiento a juicio.',
        businessImpact: 'Una mala gestión legal puede resultar en: multas, indemnizaciones, daño reputacional, precedentes negativos.',
        relatedCircuits: ['hr', 'attendance'],
        faqs: []
    }
});

// =============================================================================
// 4. CIRCUITO COMERCIAL
// =============================================================================
const COMMERCIAL_CIRCUIT = new BusinessCircuit({
    key: 'commercial',
    name: 'Circuito de Ventas y Comercialización',
    type: CircuitType.COMMERCIAL,
    version: '1.0.0',
    description: 'Flujo completo desde generación de lead hasta cierre de venta y comisiones',
    businessPurpose: 'Gestionar el pipeline de ventas de manera eficiente para maximizar conversiones',
    icon: 'fa-handshake',
    color: '#8b5cf6',

    startPoint: 'lead_generation',
    endPoints: ['deal_closed_won', 'deal_closed_lost'],

    stages: [
        new CircuitStage({
            key: 'lead_generation',
            name: 'Generación de Lead',
            order: 1,
            description: 'Nuevo prospecto ingresa al sistema',
            modules: ['leads', 'marketing'],
            services: ['LeadService', 'MarketingService'],
            endpoints: ['/api/leads', '/api/marketing/campaigns/:id/leads'],
            apks: [],
            inputs: ['contact_info', 'source', 'campaign_id'],
            outputs: ['lead_id', 'initial_score'],
            events: ['lead.created'],
            estimatedTime: 5,
            isCritical: true,
            tour: {
                explanation: 'Un nuevo prospecto entra al sistema, ya sea por formulario web, referido, campaña de marketing, etc.',
                businessValue: 'La captura correcta de datos iniciales determina la calidad del lead.',
                commonIssues: ['Datos incompletos', 'Duplicados'],
                tips: ['Validar email y teléfono al ingreso']
            }
        }),

        new CircuitStage({
            key: 'lead_scoring',
            name: 'Scoring Automático',
            order: 2,
            description: 'Calificación automática del lead según criterios BANT',
            modules: ['leads'],
            services: ['LeadScoringService'],
            endpoints: ['/api/leads/:id/score', '/api/leads/scoring/calculate'],
            apks: [],
            inputs: ['lead_id', 'company_size', 'budget', 'timeline'],
            outputs: ['bant_score', 'temperature', 'priority'],
            events: ['lead.scored'],
            estimatedTime: 1,
            isCritical: false,
            tour: {
                explanation: 'El sistema califica al lead según Budget (presupuesto), Authority (autoridad), Need (necesidad), Timeline (urgencia).',
                businessValue: 'Permite priorizar leads con mayor probabilidad de conversión.',
                commonIssues: ['Datos insuficientes para scoring'],
                tips: ['Completar información BANT en primera llamada']
            }
        }),

        new CircuitStage({
            key: 'sales_assignment',
            name: 'Asignación a Vendedor',
            order: 3,
            description: 'Asignar el lead a un vendedor según territorio/especialización',
            modules: ['leads', 'aponnt-staff'],
            services: ['LeadService', 'SalesAssignmentService'],
            endpoints: ['/api/leads/:id/assign'],
            apks: [],
            inputs: ['lead_id', 'territory', 'product_interest'],
            outputs: ['assigned_to', 'assignment_reason'],
            events: ['lead.assigned'],
            estimatedTime: 2,
            isCritical: true,
            tour: {
                explanation: 'El lead se asigna al vendedor apropiado según territorio geográfico o especialización en producto.',
                businessValue: 'Asignación correcta aumenta tasa de conversión.',
                commonIssues: ['Vendedor sobrecargado', 'Sin vendedor en territorio'],
                tips: ['Balancear carga entre vendedores']
            }
        }),

        new CircuitStage({
            key: 'meeting_scheduled',
            name: 'Reunión Agendada',
            order: 4,
            description: 'Se agenda reunión de presentación/demo',
            modules: ['leads', 'calendar'],
            services: ['SalesOrchestrationService', 'CalendarService'],
            endpoints: ['/api/sales-meetings', '/api/leads/:id/meetings'],
            apks: [],
            inputs: ['lead_id', 'meeting_type', 'datetime'],
            outputs: ['meeting_id', 'calendar_event'],
            events: ['meeting.scheduled'],
            estimatedTime: 10,
            isCritical: true,
            tour: {
                explanation: 'Se coordina una reunión (presencial o virtual) para presentar el producto al prospecto.',
                businessValue: 'La reunión es el momento clave de la venta consultiva.',
                commonIssues: ['Cancelaciones', 'No-shows'],
                tips: ['Enviar recordatorio 24h antes']
            }
        }),

        new CircuitStage({
            key: 'pitch_delivery',
            name: 'Presentación de Pitch',
            order: 5,
            description: 'El vendedor realiza la presentación comercial',
            modules: ['leads', 'brain'],
            services: ['SalesOrchestrationService', 'PitchGeneratorService'],
            endpoints: ['/api/sales/pitch/generate', '/api/leads/:id/pitch'],
            apks: [],
            inputs: ['lead_id', 'meeting_id', 'needs_assessment'],
            outputs: ['pitch_delivered', 'prospect_feedback', 'objections'],
            events: ['pitch.delivered'],
            estimatedTime: 60,
            isCritical: true,
            tour: {
                explanation: 'El vendedor presenta la solución personalizada al prospecto, utilizando pitch generado por IA según sus necesidades.',
                businessValue: 'Un pitch personalizado tiene mayor impacto que uno genérico.',
                commonIssues: ['Objeciones no manejadas', 'Falta de preparación'],
                tips: ['El Brain genera pitches personalizados automáticamente']
            }
        }),

        new CircuitStage({
            key: 'proposal_sent',
            name: 'Propuesta Enviada',
            order: 6,
            description: 'Se envía propuesta comercial formal',
            modules: ['leads', 'documents'],
            services: ['ProposalService', 'DocumentService'],
            endpoints: ['/api/leads/:id/proposal', '/api/proposals'],
            apks: [],
            inputs: ['lead_id', 'products', 'pricing', 'terms'],
            outputs: ['proposal_id', 'proposal_pdf'],
            events: ['proposal.sent'],
            estimatedTime: 30,
            isCritical: true,
            tour: {
                explanation: 'Se genera y envía la propuesta comercial con precios, términos y condiciones.',
                businessValue: 'La propuesta formaliza la oferta y permite al cliente tomar decisión.',
                commonIssues: ['Precios desactualizados', 'Términos no claros'],
                tips: ['Validar precios vigentes antes de enviar']
            }
        }),

        new CircuitStage({
            key: 'negotiation',
            name: 'Negociación',
            order: 7,
            description: 'Proceso de negociación de términos',
            modules: ['leads'],
            services: ['LeadService'],
            endpoints: ['/api/leads/:id/negotiate'],
            apks: [],
            inputs: ['proposal_id', 'counter_offer'],
            outputs: ['final_terms', 'discount_applied'],
            events: ['negotiation.updated'],
            estimatedTime: 120,
            isCritical: false,
            tour: {
                explanation: 'Se negocian los términos finales: precio, plazos, condiciones especiales.',
                businessValue: 'Flexibilidad en negociación puede cerrar ventas que de otro modo se perderían.',
                commonIssues: ['Descuentos excesivos', 'Compromisos no autorizados'],
                tips: ['Tener matriz de descuentos pre-aprobados']
            }
        }),

        new CircuitStage({
            key: 'deal_closed_won',
            name: 'Venta Cerrada - Ganada',
            order: 8,
            description: 'El cliente acepta y se cierra la venta',
            modules: ['leads', 'contracts', 'billing'],
            services: ['LeadService', 'ContractService', 'CommissionService'],
            endpoints: ['/api/leads/:id/close-won', '/api/contracts'],
            apks: [],
            inputs: ['lead_id', 'final_proposal'],
            outputs: ['contract_id', 'commission_calculated'],
            events: ['deal.won', 'commission.generated'],
            estimatedTime: 30,
            isCritical: true,
            tour: {
                explanation: 'El cliente acepta la propuesta, se genera contrato y se calculan comisiones del vendedor.',
                businessValue: 'Cierre exitoso genera ingresos y comisiones.',
                commonIssues: [],
                tips: ['Iniciar onboarding del cliente inmediatamente']
            }
        }),

        new CircuitStage({
            key: 'deal_closed_lost',
            name: 'Venta Cerrada - Perdida',
            order: 9,
            description: 'El prospecto decide no comprar',
            modules: ['leads'],
            services: ['LeadService'],
            endpoints: ['/api/leads/:id/close-lost'],
            apks: [],
            inputs: ['lead_id', 'lost_reason'],
            outputs: ['loss_recorded', 'recontact_date'],
            events: ['deal.lost'],
            estimatedTime: 10,
            isCritical: false,
            tour: {
                explanation: 'Si el prospecto decide no comprar, se registra el motivo para análisis y posible recontacto futuro.',
                businessValue: 'Entender por qué se pierden ventas permite mejorar el proceso.',
                commonIssues: [],
                tips: ['Siempre registrar motivo real de pérdida']
            }
        })
    ],

    transitions: [
        { from: 'lead_generation', to: 'lead_scoring', type: TransitionType.SEQUENTIAL },
        { from: 'lead_scoring', to: 'sales_assignment', type: TransitionType.SEQUENTIAL },
        { from: 'sales_assignment', to: 'meeting_scheduled', type: TransitionType.SEQUENTIAL },
        { from: 'meeting_scheduled', to: 'pitch_delivery', type: TransitionType.SEQUENTIAL },
        { from: 'pitch_delivery', to: 'proposal_sent', type: TransitionType.CONDITIONAL, condition: 'interested === true', onFalse: 'deal_closed_lost' },
        { from: 'proposal_sent', to: 'negotiation', type: TransitionType.SEQUENTIAL },
        { from: 'negotiation', to: 'deal_closed_won', type: TransitionType.CONDITIONAL, condition: 'accepted === true' },
        { from: 'negotiation', to: 'deal_closed_lost', type: TransitionType.CONDITIONAL, condition: 'accepted === false' }
    ],

    roles: ['sales_rep', 'sales_manager', 'marketing'],
    departments: ['commercial', 'marketing'],

    dependsOn: [],
    provides: ['contracts', 'revenue', 'commissions'],

    tour: {
        introduction: 'El Circuito Comercial gestiona todo el pipeline de ventas desde que un lead entra al sistema hasta el cierre de la venta.',
        stepsOverview: 'Inicia con la generación de lead, pasa por scoring, asignación, reunión, pitch, propuesta, negociación, y termina en cierre (ganado o perdido).',
        businessImpact: 'Un pipeline bien gestionado maximiza la tasa de conversión y reduce el tiempo de cierre.',
        relatedCircuits: [],
        faqs: []
    }
});

// =============================================================================
// 5. CIRCUITO DE RRHH (HR)
// =============================================================================
const HR_CIRCUIT = new BusinessCircuit({
    key: 'hr',
    name: 'Circuito de Gestión de Recursos Humanos',
    type: CircuitType.HR,
    version: '1.0.0',
    description: 'Flujo completo del ciclo de vida del empleado: desde onboarding hasta offboarding',
    businessPurpose: 'Gestionar el ciclo de vida completo del empleado de manera eficiente y cumpliendo normativas',
    icon: 'fa-users',
    color: '#06b6d4',

    startPoint: 'hiring_decision',
    endPoints: ['active_employee', 'offboarding_complete'],

    stages: [
        new CircuitStage({
            key: 'hiring_decision',
            name: 'Decisión de Contratación',
            order: 1,
            description: 'Se decide contratar a un candidato',
            modules: ['recruitment', 'psychological-assessment'],
            services: ['RecruitmentService'],
            endpoints: ['/api/recruitment/candidates/:id/hire'],
            apks: [],
            inputs: ['candidate_id', 'position_id', 'salary_offered'],
            outputs: ['hire_approved', 'start_date'],
            events: ['hiring.approved'],
            estimatedTime: 30,
            isCritical: true,
            tour: {
                explanation: 'Después del proceso de selección, se toma la decisión formal de contratar al candidato.',
                businessValue: 'Una buena decisión de contratación impacta toda la relación laboral.',
                commonIssues: ['Referencias no verificadas', 'Posición no aprobada'],
                tips: ['Verificar disponibilidad de posición en organigrama']
            }
        }),

        new CircuitStage({
            key: 'contract_creation',
            name: 'Generación de Contrato',
            order: 2,
            description: 'Crear contrato laboral con términos acordados',
            modules: ['contracts', 'legal'],
            services: ['ContractService', 'LegalDocumentService'],
            endpoints: ['/api/contracts/employee', '/api/contracts/generate'],
            apks: [],
            inputs: ['candidate_info', 'position', 'salary', 'benefits'],
            outputs: ['contract_id', 'contract_pdf'],
            events: ['contract.created'],
            estimatedTime: 60,
            isCritical: true,
            tour: {
                explanation: 'Se genera el contrato laboral con todos los términos: puesto, salario, beneficios, cláusulas.',
                businessValue: 'El contrato es el documento legal que rige la relación laboral.',
                commonIssues: ['Template desactualizado', 'Cláusulas faltantes'],
                tips: ['Usar templates validados por Legal']
            }
        }),

        new CircuitStage({
            key: 'contract_signature',
            name: 'Firma de Contrato',
            order: 3,
            description: 'El empleado firma el contrato',
            modules: ['contracts', 'documents'],
            services: ['ContractService', 'SignatureService'],
            endpoints: ['/api/contracts/:id/sign'],
            apks: ['employee'],
            inputs: ['contract_id', 'signature'],
            outputs: ['signed_contract', 'signed_at'],
            events: ['contract.signed'],
            estimatedTime: 15,
            isCritical: true,
            tour: {
                explanation: 'El empleado revisa y firma el contrato (puede ser digital o físico).',
                businessValue: 'Sin firma no hay relación laboral válida.',
                commonIssues: ['Demora en firmar', 'Dudas sobre cláusulas'],
                tips: ['Explicar cláusulas importantes antes de pedir firma']
            }
        }),

        new CircuitStage({
            key: 'user_creation',
            name: 'Creación de Usuario',
            order: 4,
            description: 'Crear usuario en el sistema con accesos',
            modules: ['users', 'role-permissions'],
            services: ['UserService', 'PermissionService'],
            endpoints: ['/api/v1/users', '/api/role-permissions/assign'],
            apks: [],
            inputs: ['employee_data', 'position', 'department'],
            outputs: ['user_id', 'credentials'],
            events: ['user.created'],
            estimatedTime: 15,
            isCritical: true,
            tour: {
                explanation: 'Se crea el usuario en el sistema con los permisos correspondientes a su puesto.',
                businessValue: 'Sin usuario no puede usar el sistema ni fichar asistencia.',
                commonIssues: ['Email duplicado', 'Rol no existe'],
                tips: ['Verificar que el email sea único']
            }
        }),

        new CircuitStage({
            key: 'biometric_enrollment',
            name: 'Enrolamiento Biométrico',
            order: 5,
            description: 'Registrar plantilla biométrica del empleado',
            modules: ['biometric-enterprise'],
            services: ['BiometricEnrollmentService'],
            endpoints: ['/api/v2/biometric/enroll', '/api/v2/biometric/consent'],
            apks: ['employee', 'kiosk'],
            inputs: ['user_id', 'photos', 'consent'],
            outputs: ['biometric_template_id', 'enrollment_status'],
            events: ['biometric.enrolled'],
            estimatedTime: 10,
            isCritical: true,
            tour: {
                explanation: 'Se captura el rostro del empleado para crear su plantilla biométrica y se obtiene su consentimiento.',
                businessValue: 'Sin plantilla biométrica no podrá usar los kioscos de fichaje.',
                commonIssues: ['Consentimiento no dado', 'Foto de mala calidad'],
                tips: ['Explicar uso y protección de datos biométricos']
            }
        }),

        new CircuitStage({
            key: 'shift_assignment',
            name: 'Asignación de Turno',
            order: 6,
            description: 'Asignar turno de trabajo al empleado',
            modules: ['shifts'],
            services: ['ShiftService'],
            endpoints: ['/api/v1/shifts/assignments', '/api/v1/shifts/user/:id'],
            apks: [],
            inputs: ['user_id', 'shift_id', 'effective_date'],
            outputs: ['assignment_id'],
            events: ['shift.assigned'],
            estimatedTime: 5,
            isCritical: true,
            tour: {
                explanation: 'Se asigna el turno de trabajo que corresponde al puesto del empleado.',
                businessValue: 'El turno define horarios y permite calcular horas extras.',
                commonIssues: ['Turno no compatible con posición', 'Sin turnos disponibles'],
                tips: ['Verificar compatibilidad con horarios de otros empleados']
            }
        }),

        new CircuitStage({
            key: 'payroll_template_assignment',
            name: 'Asignación de Plantilla de Liquidación',
            order: 7,
            description: 'Asignar plantilla remunerativa al empleado',
            modules: ['payroll'],
            services: ['PayrollTemplateService'],
            endpoints: ['/api/payroll/user-assignments'],
            apks: [],
            inputs: ['user_id', 'template_id', 'salary_category'],
            outputs: ['assignment_id'],
            events: ['payroll.template.assigned'],
            estimatedTime: 5,
            isCritical: true,
            tour: {
                explanation: 'Se asigna la plantilla de liquidación que define los conceptos salariales del empleado.',
                businessValue: 'Sin plantilla no se puede liquidar el sueldo.',
                commonIssues: ['Plantilla incorrecta para el puesto'],
                tips: ['Verificar que la plantilla corresponda a la categoría salarial']
            }
        }),

        new CircuitStage({
            key: 'training_assignment',
            name: 'Asignación de Capacitaciones',
            order: 8,
            description: 'Asignar capacitaciones obligatorias de inducción',
            modules: ['training', 'hse-enterprise'],
            services: ['TrainingService', 'HSEService'],
            endpoints: ['/api/trainings/assign', '/api/v1/hse/induction'],
            apks: ['employee'],
            inputs: ['user_id', 'position_id', 'department_id'],
            outputs: ['training_ids', 'due_dates'],
            events: ['training.assigned'],
            estimatedTime: 10,
            isCritical: false,
            tour: {
                explanation: 'Se asignan las capacitaciones de inducción obligatorias según el puesto.',
                businessValue: 'Cumplimiento de normativas de capacitación y seguridad.',
                commonIssues: ['Trainings no actualizados'],
                tips: ['Incluir HSE obligatorio para todos']
            }
        }),

        new CircuitStage({
            key: 'active_employee',
            name: 'Empleado Activo',
            order: 9,
            description: 'El empleado está completamente configurado y activo',
            modules: ['users'],
            services: ['UserService'],
            endpoints: ['/api/v1/users/:id/activate'],
            apks: ['employee'],
            inputs: ['user_id'],
            outputs: ['employee_active', 'welcome_sent'],
            events: ['employee.activated'],
            estimatedTime: 1,
            isCritical: true,
            tour: {
                explanation: 'El empleado está completamente configurado y puede comenzar a trabajar.',
                businessValue: 'El proceso de onboarding completo asegura productividad desde el día 1.',
                commonIssues: [],
                tips: ['Verificar que todos los pasos anteriores estén completos']
            }
        }),

        new CircuitStage({
            key: 'offboarding_start',
            name: 'Inicio de Offboarding',
            order: 10,
            description: 'Se inicia proceso de desvinculación',
            modules: ['users', 'legal'],
            services: ['OffboardingService', 'LegalService'],
            endpoints: ['/api/v1/users/:id/offboarding'],
            apks: [],
            inputs: ['user_id', 'termination_type', 'reason'],
            outputs: ['offboarding_id', 'checklist'],
            events: ['offboarding.started'],
            estimatedTime: 30,
            isCritical: true,
            tour: {
                explanation: 'Se inicia el proceso formal de desvinculación, ya sea por renuncia, despido o fin de contrato.',
                businessValue: 'Un offboarding ordenado previene problemas legales y de seguridad.',
                commonIssues: ['Documentación faltante', 'Assets no devueltos'],
                tips: ['Iniciar checklist de entrega de equipos']
            }
        }),

        new CircuitStage({
            key: 'offboarding_complete',
            name: 'Offboarding Completado',
            order: 11,
            description: 'El empleado ha sido desvinculado completamente',
            modules: ['users', 'payroll'],
            services: ['OffboardingService', 'PayrollService'],
            endpoints: ['/api/v1/users/:id/terminate'],
            apks: [],
            inputs: ['offboarding_id', 'final_settlement'],
            outputs: ['user_deactivated', 'final_payslip'],
            events: ['offboarding.completed'],
            estimatedTime: 60,
            isCritical: true,
            tour: {
                explanation: 'Se completa la desvinculación: liquidación final, baja de accesos, devolución de equipos.',
                businessValue: 'Cierre formal de la relación laboral cumpliendo todas las obligaciones.',
                commonIssues: ['Liquidación pendiente', 'Accesos no revocados'],
                tips: ['Revocar TODOS los accesos inmediatamente']
            }
        })
    ],

    transitions: [
        { from: 'hiring_decision', to: 'contract_creation', type: TransitionType.SEQUENTIAL },
        { from: 'contract_creation', to: 'contract_signature', type: TransitionType.SEQUENTIAL },
        { from: 'contract_signature', to: 'user_creation', type: TransitionType.SEQUENTIAL },
        { from: 'user_creation', to: ['biometric_enrollment', 'shift_assignment', 'payroll_template_assignment'], type: TransitionType.PARALLEL },
        { from: 'biometric_enrollment', to: 'training_assignment', type: TransitionType.SEQUENTIAL },
        { from: 'shift_assignment', to: 'training_assignment', type: TransitionType.OPTIONAL },
        { from: 'payroll_template_assignment', to: 'training_assignment', type: TransitionType.OPTIONAL },
        { from: 'training_assignment', to: 'active_employee', type: TransitionType.SEQUENTIAL },
        { from: 'active_employee', to: 'offboarding_start', type: TransitionType.CONDITIONAL, condition: 'termination_requested === true' },
        { from: 'offboarding_start', to: 'offboarding_complete', type: TransitionType.SEQUENTIAL }
    ],

    roles: ['hr_admin', 'manager', 'employee'],
    departments: ['rrhh'],

    dependsOn: [],
    provides: ['employees', 'organizational_data'],

    tour: {
        introduction: 'El Circuito de RRHH gestiona todo el ciclo de vida del empleado en la empresa, desde que se decide contratarlo hasta que se desvincula.',
        stepsOverview: 'El proceso incluye: contratación, generación de contrato, firma, creación de usuario, enrolamiento biométrico, asignación de turno y plantilla, capacitaciones, y eventualmente offboarding.',
        businessImpact: 'Un ciclo de vida de empleado bien gestionado impacta en: productividad, cumplimiento legal, retención, y cultura organizacional.',
        relatedCircuits: ['attendance', 'payroll', 'legal'],
        faqs: []
    }
});

// =============================================================================
// REGISTRY PRINCIPAL
// =============================================================================
const CIRCUITS_REGISTRY = {
    attendance: ATTENDANCE_CIRCUIT,
    payroll: PAYROLL_CIRCUIT,
    legal: LEGAL_CIRCUIT,
    commercial: COMMERCIAL_CIRCUIT,
    hr: HR_CIRCUIT
};

/**
 * Obtener todos los circuitos
 */
function getAllCircuits() {
    return Object.values(CIRCUITS_REGISTRY);
}

/**
 * Obtener circuito por key
 */
function getCircuit(key) {
    return CIRCUITS_REGISTRY[key] || null;
}

/**
 * Buscar circuitos por tipo
 */
function getCircuitsByType(type) {
    return Object.values(CIRCUITS_REGISTRY).filter(c => c.type === type);
}

/**
 * Buscar circuitos que usen un módulo específico
 */
function findCircuitsUsingModule(moduleKey) {
    return Object.values(CIRCUITS_REGISTRY).filter(c =>
        c.getAllModules().includes(moduleKey)
    );
}

/**
 * Buscar circuitos que usen una APK específica
 */
function findCircuitsUsingApk(apkKey) {
    return Object.values(CIRCUITS_REGISTRY).filter(c =>
        c.getAllApks().includes(apkKey)
    );
}

/**
 * Obtener resumen de todos los circuitos
 */
function getCircuitsSummary() {
    return Object.values(CIRCUITS_REGISTRY).map(c => ({
        key: c.key,
        name: c.name,
        type: c.type,
        stagesCount: c.stages.length,
        modulesCount: c.getAllModules().length,
        apksInvolved: c.getAllApks(),
        estimatedDuration: `${c.getEstimatedDuration()} min`,
        criticalStages: c.getCriticalPath().length
    }));
}

module.exports = {
    // Circuitos individuales
    ATTENDANCE_CIRCUIT,
    PAYROLL_CIRCUIT,
    LEGAL_CIRCUIT,
    COMMERCIAL_CIRCUIT,
    HR_CIRCUIT,

    // Registry
    CIRCUITS_REGISTRY,

    // Funciones de consulta
    getAllCircuits,
    getCircuit,
    getCircuitsByType,
    findCircuitsUsingModule,
    findCircuitsUsingApk,
    getCircuitsSummary
};
