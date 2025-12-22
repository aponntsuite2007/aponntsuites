/**
 * ============================================================================
 * MOBILE APPS REGISTRY
 * ============================================================================
 *
 * Registro completo de las aplicaciones móviles (APKs) del ecosistema.
 * El Brain utiliza este registro para:
 *
 * 1. Conocer qué endpoints consume cada APK
 * 2. Saber qué módulos backend dependen de cada app
 * 3. Responder preguntas sobre qué app usar para cada tarea
 * 4. Generar documentación de APIs
 *
 * APKs del ecosistema:
 * - Employee (com.aponnt.attendance.employee)
 * - Kiosk (com.aponnt.attendance.kiosk)
 * - Medical (com.aponnt.attendance.medical)
 * - Admin (com.aponnt.attendance.admin)
 *
 * Created: 2025-12-20
 * Phase: 8 - Business Circuits
 */

/**
 * Estado de una APK
 */
const AppStatus = {
    PRODUCTION: 'production',
    BETA: 'beta',
    DEVELOPMENT: 'development',
    DEPRECATED: 'deprecated'
};

/**
 * Clase MobileApp - Definición de una aplicación móvil
 */
class MobileApp {
    constructor(config) {
        this.key = config.key;
        this.name = config.name;
        this.packageId = config.packageId;
        this.version = config.version;
        this.status = config.status || AppStatus.PRODUCTION;
        this.description = config.description;

        // Visual
        this.icon = config.icon;
        this.color = config.color;
        this.orientation = config.orientation || 'portrait';

        // Targets
        this.targetUsers = config.targetUsers || [];  // ['employee', 'supervisor', 'hr_admin']

        // Backend consumption
        this.endpoints = config.endpoints || [];
        this.modules = config.modules || [];
        this.services = config.services || [];

        // Features
        this.features = config.features || [];
        this.offlineCapable = config.offlineCapable || false;
        this.biometricCapable = config.biometricCapable || false;

        // Screens
        this.screens = config.screens || [];

        // Local storage
        this.localStorage = config.localStorage || [];

        // Build info
        this.buildPath = config.buildPath;
        this.size = config.size;
        this.minSdk = config.minSdk || 21;
        this.targetSdk = config.targetSdk || 33;

        // Circuits this app participates in
        this.circuits = config.circuits || [];

        // Documentation
        this.documentation = config.documentation || {};
    }

    /**
     * Verificar si la app consume un endpoint
     */
    usesEndpoint(endpoint) {
        return this.endpoints.some(e =>
            endpoint.includes(e.path) || e.path.includes(endpoint)
        );
    }

    /**
     * Verificar si la app usa un módulo
     */
    usesModule(moduleName) {
        return this.modules.includes(moduleName);
    }

    /**
     * Obtener endpoints agrupados por categoría
     */
    getEndpointsByCategory() {
        const grouped = {};
        for (const ep of this.endpoints) {
            const category = ep.category || 'general';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(ep);
        }
        return grouped;
    }

    toJSON() {
        return {
            key: this.key,
            name: this.name,
            packageId: this.packageId,
            version: this.version,
            status: this.status,
            description: this.description,
            icon: this.icon,
            color: this.color,
            targetUsers: this.targetUsers,
            endpoints: this.endpoints.length,
            modules: this.modules,
            features: this.features,
            offlineCapable: this.offlineCapable,
            biometricCapable: this.biometricCapable,
            circuits: this.circuits,
            buildPath: this.buildPath,
            size: this.size
        };
    }
}

// =============================================================================
// APK 1: EMPLOYEE
// =============================================================================
const EMPLOYEE_APP = new MobileApp({
    key: 'employee',
    name: 'Aponnt Employee',
    packageId: 'com.aponnt.attendance.employee',
    version: '2.0.0',
    status: AppStatus.PRODUCTION,
    description: 'Aplicación para empleados: fichar asistencia, ver recibos, solicitar vacaciones, gestionar datos personales',
    icon: 'fa-user',
    color: '#1976D2',
    orientation: 'portrait',

    targetUsers: ['employee'],

    modules: [
        'users', 'biometric-enterprise', 'attendance', 'payroll',
        'vacation-management', 'sanctions', 'training', 'tasks',
        'mobile-requests', 'medical-cases', 'family-members',
        'education', 'work-history', 'shifts', 'calendar',
        'notifications-enterprise', 'procedures', 'hse-enterprise', 'legal'
    ],

    services: [
        'EmployeeApiService', 'BiometricCaptureService', 'LivenessService',
        'NotificationService', 'WebSocketService', 'OfflineQueueService'
    ],

    endpoints: [
        // Auth
        { path: '/api/v1/auth/login', method: 'POST', category: 'auth' },
        { path: '/api/v1/auth/pin-login', method: 'POST', category: 'auth' },
        { path: '/api/v1/auth/biometric-login', method: 'POST', category: 'auth' },
        { path: '/api/v1/auth/me', method: 'GET', category: 'auth' },

        // User Profile
        { path: '/api/v1/users/:id', method: 'GET', category: 'user' },
        { path: '/api/v1/users/:id', method: 'PUT', category: 'user' },
        { path: '/api/v1/users/:id/documents', method: 'GET', category: 'user' },

        // Biometric
        { path: '/api/v2/biometric/status', method: 'GET', category: 'biometric' },
        { path: '/api/v2/biometric/consent', method: 'GET', category: 'biometric' },
        { path: '/api/v2/biometric/consent', method: 'POST', category: 'biometric' },
        { path: '/api/v2/biometric/capture', method: 'POST', category: 'biometric' },
        { path: '/api/v2/biometric-attendance/clock-in', method: 'POST', category: 'biometric' },
        { path: '/api/v2/biometric-attendance/clock-out', method: 'POST', category: 'biometric' },
        { path: '/api/v2/biometric-attendance/verify-real', method: 'POST', category: 'biometric' },

        // Attendance
        { path: '/api/v1/attendance', method: 'GET', category: 'attendance' },
        { path: '/api/v1/attendance/today', method: 'GET', category: 'attendance' },
        { path: '/api/v1/attendance/checkin', method: 'POST', category: 'attendance' },
        { path: '/api/v1/attendance/checkout', method: 'POST', category: 'attendance' },
        { path: '/api/attendance-analytics/employee/:userId', method: 'GET', category: 'attendance' },

        // Payroll
        { path: '/api/v1/payroll/liquidations/employee/:id', method: 'GET', category: 'payroll' },
        { path: '/api/v1/payroll/liquidations/:id/pdf', method: 'GET', category: 'payroll' },

        // Vacation
        { path: '/api/v1/vacation/config', method: 'GET', category: 'vacation' },
        { path: '/api/v1/vacation/requests', method: 'GET', category: 'vacation' },
        { path: '/api/v1/vacation/balance/:userId', method: 'GET', category: 'vacation' },
        { path: '/api/v1/vacation/requests', method: 'POST', category: 'vacation' },
        { path: '/api/v1/vacation/requests/:id', method: 'DELETE', category: 'vacation' },

        // Training
        { path: '/api/v1/mobile/training/assigned', method: 'GET', category: 'training' },
        { path: '/api/v1/trainings/:id', method: 'GET', category: 'training' },
        { path: '/api/v1/trainings/:id/progress', method: 'GET', category: 'training' },
        { path: '/api/v1/trainings/:id/progress', method: 'POST', category: 'training' },
        { path: '/api/v1/mobile/training/:id/complete', method: 'POST', category: 'training' },

        // Medical
        { path: '/api/v1/users/:id/allergies', method: 'GET', category: 'medical' },
        { path: '/api/v1/users/:id/allergies', method: 'POST', category: 'medical' },
        { path: '/api/v1/users/:id/medications', method: 'GET', category: 'medical' },
        { path: '/api/v1/users/:id/medications', method: 'POST', category: 'medical' },
        { path: '/api/v1/users/:id/chronic-conditions', method: 'GET', category: 'medical' },
        { path: '/api/v1/users/:id/vaccinations', method: 'GET', category: 'medical' },
        { path: '/api/v1/users/:id/medical-exams', method: 'GET', category: 'medical' },

        // Sanctions
        { path: '/api/v1/sanctions', method: 'GET', category: 'sanctions' },

        // Tasks
        { path: '/api/v1/users/:id/assigned-tasks', method: 'GET', category: 'tasks' },
        { path: '/api/v1/tasks/:id/status', method: 'PUT', category: 'tasks' },

        // Shifts
        { path: '/api/v1/shifts/user/:id', method: 'GET', category: 'shifts' },

        // Calendar
        { path: '/api/v1/calendar/user/:id', method: 'GET', category: 'calendar' },

        // Notifications
        { path: '/api/v1/mobile/notifications', method: 'GET', category: 'notifications' },

        // Procedures
        { path: '/api/procedures/employee/my-procedures', method: 'GET', category: 'procedures' },
        { path: '/api/procedures/employee/my-pending', method: 'GET', category: 'procedures' },
        { path: '/api/procedures/:id/acknowledge', method: 'POST', category: 'procedures' },

        // HSE
        { path: '/api/v1/hse/compliance/:userId', method: 'GET', category: 'hse' },
        { path: '/api/v1/hse/deliveries/employee/:userId', method: 'GET', category: 'hse' },
        { path: '/api/v1/hse/deliveries/:id/sign', method: 'POST', category: 'hse' },
        { path: '/api/v1/hse/categories', method: 'GET', category: 'hse' },

        // Legal
        { path: '/api/v1/legal/communications', method: 'GET', category: 'legal' },
        { path: '/api/v1/legal/employee/:userId/legal-360', method: 'GET', category: 'legal' },
        { path: '/api/v1/legal/jurisdiction', method: 'GET', category: 'legal' },

        // Mobile Requests
        { path: '/api/v1/mobile/requests', method: 'GET', category: 'requests' },
        { path: '/api/v1/mobile/requests', method: 'POST', category: 'requests' },

        // Family
        { path: '/api/v1/users/:id/family-members', method: 'GET', category: 'family' },
        { path: '/api/v1/users/:id/family-members', method: 'POST', category: 'family' },

        // Education
        { path: '/api/v1/users/:id/education', method: 'GET', category: 'education' },

        // Work History
        { path: '/api/v1/users/:id/work-history', method: 'GET', category: 'work-history' }
    ],

    features: [
        'Fichaje biométrico (reconocimiento facial)',
        'Ver y descargar recibos de sueldo',
        'Solicitar y ver estado de vacaciones',
        'Ver sanciones disciplinarias',
        'Completar capacitaciones asignadas',
        'Ver y actualizar datos personales',
        'Gestionar datos médicos (alergias, medicamentos)',
        'Ver turnos asignados',
        'Recibir notificaciones push',
        'Firma de procedimientos y documentos',
        'Cumplimiento de HSE',
        'Comunicaciones legales'
    ],

    offlineCapable: true,
    biometricCapable: true,

    screens: [
        { name: 'ConfigScreen', description: 'Configuración inicial del servidor' },
        { name: 'LoginScreen', description: 'Autenticación del empleado' },
        { name: 'BiometricConsentScreen', description: 'Consentimiento para uso biométrico' },
        { name: 'EmployeeMainNavigation', description: 'Navegación principal' },
        { name: 'AttendanceScreen', description: 'Fichaje de entrada/salida' },
        { name: 'PayrollScreen', description: 'Ver recibos de sueldo' },
        { name: 'VacationScreen', description: 'Solicitar vacaciones' },
        { name: 'TrainingScreen', description: 'Capacitaciones asignadas' },
        { name: 'ProfileScreen', description: 'Datos personales' },
        { name: 'MedicalScreen', description: 'Información médica' },
        { name: 'NotificationsScreen', description: 'Centro de notificaciones' }
    ],

    localStorage: [
        { key: 'auth_token', description: 'Token JWT de autenticación' },
        { key: 'config_company_id', description: 'ID de la empresa' },
        { key: 'employee_id', description: 'ID del empleado' },
        { key: 'employee_name', description: 'Nombre del empleado' },
        { key: 'user_id', description: 'ID del usuario en sistema' },
        { key: 'server_url', description: 'URL del servidor backend' },
        { key: 'offline_queue', description: 'Cola de fichajes pendientes (SQLite)' }
    ],

    buildPath: 'frontend_flutter/dist/aponnt-employee.apk',
    size: '81 MB',

    circuits: ['attendance', 'payroll', 'hr'],

    documentation: {
        quickStart: [
            'Instalar APK en dispositivo Android',
            'Abrir app y configurar URL del servidor',
            'Ingresar empresa, usuario y contraseña',
            'Aceptar consentimiento biométrico',
            'Listo para fichar'
        ],
        requirements: [
            'Android 5.0 (API 21) o superior',
            'Cámara frontal para biometría',
            'Conexión a internet (offline mode disponible)'
        ]
    }
});

// =============================================================================
// APK 2: KIOSK
// =============================================================================
const KIOSK_APP = new MobileApp({
    key: 'kiosk',
    name: 'Aponnt Kiosk',
    packageId: 'com.aponnt.attendance.kiosk',
    version: '2.0.0',
    status: AppStatus.PRODUCTION,
    description: 'Aplicación para kioscos de fichaje: múltiples empleados fichan desde un único dispositivo',
    icon: 'fa-desktop',
    color: '#1976D2',
    orientation: 'portrait',

    targetUsers: ['kiosk_device', 'supervisor'],

    modules: [
        'kiosk-enterprise', 'biometric-enterprise', 'attendance', 'authorization'
    ],

    services: [
        'BiometricService', 'OfflineQueueService', 'HardwareProfileService',
        'AuthorizationPollingService', 'WebSocketService'
    ],

    endpoints: [
        // Auth
        { path: '/api/v1/auth/kiosk-login', method: 'POST', category: 'auth' },

        // Kiosk Enterprise
        { path: '/api/v2/kiosk-enterprise/detect-employee', method: 'POST', category: 'kiosk' },
        { path: '/api/v2/kiosk-enterprise/register-attendance', method: 'POST', category: 'kiosk' },
        { path: '/api/v2/kiosk-enterprise/stats/:companyId', method: 'GET', category: 'kiosk' },
        { path: '/api/v2/kiosk-enterprise/configure', method: 'POST', category: 'kiosk' },

        // Biometric
        { path: '/api/v2/biometric/detect', method: 'POST', category: 'biometric' },
        { path: '/api/v2/biometric/match', method: 'POST', category: 'biometric' },

        // Authorization
        { path: '/api/v1/authorization/request', method: 'POST', category: 'authorization' },
        { path: '/api/v1/authorization/pending', method: 'GET', category: 'authorization' },

        // Geofencing
        { path: '/api/v1/kiosks/:id/geofence-zones', method: 'GET', category: 'geofencing' }
    ],

    features: [
        'Detección facial ultrarrápida (Google ML Kit)',
        'Identificación de empleados en base biométrica',
        'Registro de entrada/salida',
        'Cola offline para fichajes sin conexión',
        'Sincronización automática',
        'Audio feedback (TTS)',
        'Estadísticas en tiempo real',
        'Soporte para múltiples dispositivos',
        'Auto-detección de hardware'
    ],

    offlineCapable: true,
    biometricCapable: true,

    screens: [
        { name: 'ConfigScreen', description: 'Configuración inicial' },
        { name: 'LoginScreen', description: 'Autenticación del kiosco' },
        { name: 'BiometricSelectorScreen', description: 'Captura facial' },
        { name: 'KioskScreen', description: 'Pantalla principal de fichaje' },
        { name: 'StatsScreen', description: 'Estadísticas de fichaje' }
    ],

    localStorage: [
        { key: 'config_company_id', description: 'ID de la empresa' },
        { key: 'kiosk_id', description: 'ID del kiosco' },
        { key: 'auth_token', description: 'Token de autenticación' },
        { key: 'hardware_profile_id', description: 'Perfil del dispositivo' },
        { key: 'hardware_performance_score', description: 'Score de desempeño (0-100)' },
        { key: 'offline_queue', description: 'Cola de fichajes pendientes (SQLite)' }
    ],

    buildPath: 'frontend_flutter/dist/aponnt-kiosk.apk',
    size: '76 MB',

    circuits: ['attendance'],

    documentation: {
        quickStart: [
            'Instalar APK en tablet/kiosco',
            'Configurar URL del servidor',
            'Autenticar con credenciales de kiosco',
            'Colocar en punto de fichaje',
            'Empleados pueden fichar presentando rostro'
        ],
        requirements: [
            'Android 5.0 (API 21) o superior',
            'Cámara frontal de buena calidad',
            'Conexión a internet (WiFi recomendado)',
            'Pantalla táctil (opcional)'
        ]
    }
});

// =============================================================================
// APK 3: MEDICAL
// =============================================================================
const MEDICAL_APP = new MobileApp({
    key: 'medical',
    name: 'Aponnt Medical',
    packageId: 'com.aponnt.attendance.medical',
    version: '2.0.0',
    status: AppStatus.PRODUCTION,
    description: 'Aplicación para personal médico: gestión de casos de salud ocupacional, autorizaciones médicas',
    icon: 'fa-heartbeat',
    color: '#00796B',
    orientation: 'both',

    targetUsers: ['doctor', 'nurse', 'medical_admin'],

    modules: [
        'medical-cases', 'medical-advanced', 'users', 'procedures', 'authorization'
    ],

    services: [
        'MedicalApiService', 'AuthorizationService'
    ],

    endpoints: [
        // Auth
        { path: '/api/v1/auth/login', method: 'POST', category: 'auth' },
        { path: '/api/v1/auth/me', method: 'GET', category: 'auth' },

        // Medical
        { path: '/api/v1/medical/cases', method: 'GET', category: 'medical' },
        { path: '/api/v1/medical/cases', method: 'POST', category: 'medical' },
        { path: '/api/v1/medical/cases/:id', method: 'GET', category: 'medical' },
        { path: '/api/v1/medical/cases/:id', method: 'PUT', category: 'medical' },

        // User Medical Data
        { path: '/api/v1/users/:id/medical', method: 'GET', category: 'user-medical' },
        { path: '/api/v1/users/:id/allergies', method: 'GET', category: 'user-medical' },
        { path: '/api/v1/users/:id/allergies', method: 'POST', category: 'user-medical' },
        { path: '/api/v1/users/:id/medications', method: 'GET', category: 'user-medical' },
        { path: '/api/v1/users/:id/medications', method: 'POST', category: 'user-medical' },
        { path: '/api/v1/users/:id/chronic-conditions', method: 'GET', category: 'user-medical' },
        { path: '/api/v1/users/:id/vaccinations', method: 'GET', category: 'user-medical' },
        { path: '/api/v1/users/:id/medical-exams', method: 'GET', category: 'user-medical' },

        // Medical Authorizations
        { path: '/api/medical/authorizations', method: 'GET', category: 'authorization' },
        { path: '/api/medical/authorizations', method: 'POST', category: 'authorization' },
        { path: '/api/medical/authorizations/:id', method: 'PUT', category: 'authorization' },

        // Procedures
        { path: '/api/procedures/medical', method: 'GET', category: 'procedures' }
    ],

    features: [
        'Gestión de casos médicos',
        'Vista de historial médico de empleados',
        'Registro de alergias y medicamentos',
        'Autorizaciones médicas',
        'Seguimiento de vacunaciones',
        'Exámenes médicos ocupacionales',
        'Procedimientos médicos',
        'Soporte landscape para tablets'
    ],

    offlineCapable: false,
    biometricCapable: false,

    screens: [
        { name: 'ConfigScreen', description: 'Configuración inicial' },
        { name: 'LoginScreen', description: 'Autenticación médico' },
        { name: 'MedicalPanelScreen', description: 'Panel médico principal' },
        { name: 'CaseListScreen', description: 'Lista de casos' },
        { name: 'CaseDetailScreen', description: 'Detalle de caso' },
        { name: 'PatientHistoryScreen', description: 'Historial del paciente' },
        { name: 'AuthorizationsScreen', description: 'Autorizaciones pendientes' }
    ],

    localStorage: [
        { key: 'auth_token', description: 'Token JWT' },
        { key: 'config_company_id', description: 'ID de la empresa' },
        { key: 'doctor_id', description: 'ID del profesional médico' },
        { key: 'doctor_name', description: 'Nombre' },
        { key: 'doctor_specialty', description: 'Especialidad médica' }
    ],

    buildPath: 'frontend_flutter/dist/aponnt-medical.apk',
    size: '77 MB',

    circuits: ['hr'],

    documentation: {
        quickStart: [
            'Instalar APK',
            'Configurar URL del servidor',
            'Autenticar con credenciales de médico',
            'Acceder a casos y autorizaciones'
        ],
        requirements: [
            'Android 5.0 (API 21) o superior',
            'Conexión a internet requerida'
        ]
    }
});

// =============================================================================
// APK 4: ADMIN
// =============================================================================
const ADMIN_APP = new MobileApp({
    key: 'admin',
    name: 'Aponnt Admin',
    packageId: 'com.aponnt.attendance.admin',
    version: '2.0.0',
    status: AppStatus.DEVELOPMENT,
    description: 'Aplicación para administradores: gestión general del sistema (en desarrollo)',
    icon: 'fa-cog',
    color: '#1976D2',
    orientation: 'both',

    targetUsers: ['admin', 'superadmin'],

    modules: [
        'users', 'companies', 'modules', 'reports', 'audit'
    ],

    services: [
        'AdminApiService'
    ],

    endpoints: [
        // Auth
        { path: '/api/v1/auth/login', method: 'POST', category: 'auth' },
        { path: '/api/v1/auth/me', method: 'GET', category: 'auth' },

        // Users
        { path: '/api/v1/users', method: 'GET', category: 'users' },
        { path: '/api/v1/users', method: 'POST', category: 'users' },
        { path: '/api/v1/users/:id', method: 'GET', category: 'users' },
        { path: '/api/v1/users/:id', method: 'PUT', category: 'users' },

        // Companies (Aponnt level)
        { path: '/api/aponnt/dashboard/companies', method: 'GET', category: 'companies' },

        // Reports
        { path: '/api/reports/generate', method: 'POST', category: 'reports' }
    ],

    features: [
        'Dashboard administrativo (en desarrollo)',
        'Gestión de usuarios',
        'Reportes generales',
        'Configuración del sistema'
    ],

    offlineCapable: false,
    biometricCapable: false,

    screens: [
        { name: 'ConfigScreen', description: 'Configuración inicial' },
        { name: 'LoginScreen', description: 'Autenticación admin' },
        { name: 'AdminDashboardPlaceholder', description: 'Dashboard (en construcción)' }
    ],

    localStorage: [
        { key: 'auth_token', description: 'Token JWT' },
        { key: 'config_company_id', description: 'ID de la empresa' },
        { key: 'admin_id', description: 'ID del administrador' }
    ],

    buildPath: 'frontend_flutter/dist/aponnt-admin.apk',
    size: '76 MB',

    circuits: [],

    documentation: {
        quickStart: [
            'APK en desarrollo - funcionalidad limitada'
        ],
        requirements: [
            'Android 5.0 (API 21) o superior'
        ],
        note: 'Esta APK está en desarrollo activo. Solo tiene estructura base.'
    }
});

// =============================================================================
// REGISTRY PRINCIPAL
// =============================================================================
const MOBILE_APPS_REGISTRY = {
    employee: EMPLOYEE_APP,
    kiosk: KIOSK_APP,
    medical: MEDICAL_APP,
    admin: ADMIN_APP
};

/**
 * Obtener todas las apps
 */
function getAllApps() {
    return Object.values(MOBILE_APPS_REGISTRY);
}

/**
 * Obtener app por key
 */
function getApp(key) {
    return MOBILE_APPS_REGISTRY[key] || null;
}

/**
 * Obtener apps por estado
 */
function getAppsByStatus(status) {
    return Object.values(MOBILE_APPS_REGISTRY).filter(a => a.status === status);
}

/**
 * Encontrar apps que usen un módulo
 */
function findAppsUsingModule(moduleName) {
    return Object.values(MOBILE_APPS_REGISTRY).filter(a =>
        a.modules.includes(moduleName)
    );
}

/**
 * Encontrar apps que consuman un endpoint
 */
function findAppsUsingEndpoint(endpoint) {
    return Object.values(MOBILE_APPS_REGISTRY).filter(a =>
        a.usesEndpoint(endpoint)
    );
}

/**
 * Obtener resumen de todas las apps
 */
function getAppsSummary() {
    return Object.values(MOBILE_APPS_REGISTRY).map(a => a.toJSON());
}

/**
 * Obtener matriz de endpoints por app
 */
function getEndpointsMatrix() {
    const matrix = {};

    for (const [key, app] of Object.entries(MOBILE_APPS_REGISTRY)) {
        matrix[key] = {
            name: app.name,
            endpointCount: app.endpoints.length,
            byCategory: app.getEndpointsByCategory()
        };
    }

    return matrix;
}

/**
 * Recomendar app para una tarea
 */
function recommendAppForTask(taskDescription) {
    const task = taskDescription.toLowerCase();

    const recommendations = [];

    // Employee app keywords
    const employeeKeywords = [
        'fichar', 'fichaje', 'recibo', 'sueldo', 'vacaciones',
        'mi perfil', 'mis datos', 'capacitación', 'training',
        'solicitar permiso', 'empleado'
    ];
    if (employeeKeywords.some(kw => task.includes(kw))) {
        recommendations.push({
            app: EMPLOYEE_APP,
            confidence: 'high',
            reason: 'Funcionalidad disponible para empleados'
        });
    }

    // Kiosk app keywords
    const kioskKeywords = [
        'kiosco', 'kiosko', 'punto de fichaje', 'múltiples empleados',
        'entrada principal', 'fichaje masivo'
    ];
    if (kioskKeywords.some(kw => task.includes(kw))) {
        recommendations.push({
            app: KIOSK_APP,
            confidence: 'high',
            reason: 'Diseñada para puntos de fichaje'
        });
    }

    // Medical app keywords
    const medicalKeywords = [
        'médico', 'salud', 'caso médico', 'licencia médica',
        'certificado', 'vacuna', 'examen médico'
    ];
    if (medicalKeywords.some(kw => task.includes(kw))) {
        recommendations.push({
            app: MEDICAL_APP,
            confidence: 'high',
            reason: 'Gestión de salud ocupacional'
        });
    }

    // Admin app keywords
    const adminKeywords = [
        'administrar', 'configurar sistema', 'gestionar empresa',
        'reportes generales'
    ];
    if (adminKeywords.some(kw => task.includes(kw))) {
        recommendations.push({
            app: ADMIN_APP,
            confidence: 'medium',
            reason: 'Nota: en desarrollo'
        });
    }

    if (recommendations.length === 0) {
        return {
            found: false,
            message: 'No pude determinar la app adecuada.',
            allApps: getAppsSummary()
        };
    }

    return {
        found: true,
        recommendations: recommendations.map(r => ({
            key: r.app.key,
            name: r.app.name,
            description: r.app.description,
            confidence: r.confidence,
            reason: r.reason,
            downloadPath: r.app.buildPath
        }))
    };
}

module.exports = {
    MobileApp,
    AppStatus,

    // Apps individuales
    EMPLOYEE_APP,
    KIOSK_APP,
    MEDICAL_APP,
    ADMIN_APP,

    // Registry
    MOBILE_APPS_REGISTRY,

    // Funciones de consulta
    getAllApps,
    getApp,
    getAppsByStatus,
    findAppsUsingModule,
    findAppsUsingEndpoint,
    getAppsSummary,
    getEndpointsMatrix,
    recommendAppForTask
};
