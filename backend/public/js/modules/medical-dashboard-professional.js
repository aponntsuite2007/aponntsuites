// Medical Dashboard Module - v4.0 PROGRESSIVE
// Protección contra doble carga usando window object para evitar redeclaración
(function() {
    'use strict';

    if (window._MEDICAL_DASHBOARD_LOADED) {
        console.log('⚠️ [MEDICAL-DASHBOARD] Ya cargado, saltando...');
        return; // Early exit si ya está cargado
    }
    window._MEDICAL_DASHBOARD_LOADED = true;
    console.log('👩‍⚕️ [MEDICAL-DASHBOARD] Módulo medical-dashboard cargado');

// ============================================================================
// MEDICAL API SERVICE - Conexión con backend real
// ============================================================================
const MedicalAPI = {
    baseUrl: '/api/medical-cases',

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API Error');
            return data;
        } catch (error) {
            console.error(`[MedicalAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    // GET /api/medical-cases/doctor/pending - Casos pendientes del médico
    getPendingCases: () => MedicalAPI.request('/doctor/pending'),

    // GET /api/medical-cases/employee/:employeeId - Casos de un empleado
    getEmployeeCases: (employeeId) => MedicalAPI.request(`/employee/${employeeId}`),

    // GET /api/medical-cases/:caseId - Detalles de un caso
    getCaseDetails: (caseId) => MedicalAPI.request(`/${caseId}`),

    // GET /api/medical-cases/:caseId/messages - Mensajes de un caso
    getCaseMessages: (caseId) => MedicalAPI.request(`/${caseId}/messages`),

    // POST /api/medical-cases/:caseId/messages - Enviar mensaje
    sendMessage: (caseId, formData) => MedicalAPI.request(`/${caseId}/messages`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set multipart headers
    }),

    // POST /api/medical-cases/:caseId/diagnosis - Enviar diagnóstico
    sendDiagnosis: (caseId, data) => MedicalAPI.request(`/${caseId}/diagnosis`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // POST /api/medical-cases/:caseId/close - Cerrar expediente
    closeCase: (caseId, data) => MedicalAPI.request(`/${caseId}/close`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // POST /api/medical-cases - Crear nuevo caso
    createCase: (formData) => MedicalAPI.request('/', {
        method: 'POST',
        body: formData,
        headers: {}
    }),

    // GET /api/medical-cases/employee/:employeeId/360 - Vista Medical 360 completa
    getEmployee360: (employeeId) => MedicalAPI.request(`/employee/${employeeId}/360`),

    // GET /api/medical-cases/employee/:employeeId/fitness-status - Estado de aptitud
    getFitnessStatus: (employeeId) => MedicalAPI.request(`/employee/${employeeId}/fitness-status`),

    // GET /api/medical-cases/employees/with-medical-records - Lista empleados con resumen médico
    getEmployeesWithMedicalRecords: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return MedicalAPI.request(`/employees/with-medical-records${queryString ? '?' + queryString : ''}`);
    }
};

// ============================================================================
// JOB POSTINGS API - Candidatos pendientes de examen preocupacional
// ============================================================================
const JobPostingsAPI = {
    baseUrl: '/api/job-postings',

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API Error');
            return data;
        } catch (error) {
            console.error(`[JobPostingsAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    // GET /api/job-postings/pending-medical - Candidatos pendientes de examen preocupacional
    getPendingMedicalExam: () => JobPostingsAPI.request('/pending-medical'),

    // POST /api/job-postings/applications/:id/medical-result - Registrar resultado médico
    setMedicalResult: (applicationId, data) => JobPostingsAPI.request(`/applications/${applicationId}/medical-result`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // GET /api/job-postings/applications/:id - Obtener detalle de postulación
    getApplication: (applicationId) => JobPostingsAPI.request(`/applications/${applicationId}`)
};


// ============================================================================
// MOCK DATA FALLBACKS (para evitar errores cuando API no responde)
// ============================================================================
const mockEmployees = [];
const mockMedicalDocuments = {};
const mockConversations = {};

// Cache de datos reales de la API
let cachedEmployeesFromAPI = [];
let cachedDocumentsFromAPI = {};
let cachedConversationsFromAPI = {};

// ✅ HELPER: Buscar empleado en cache o mock
function findEmployeeById(employeeId) {
    // Primero buscar en cache de API
    let emp = cachedEmployeesFromAPI.find(e => e.id == employeeId || e.user_id == employeeId);
    if (emp) return emp;

    // Fallback a mock (vacío)
    emp = mockEmployees.find(e => e.id == employeeId);
    if (emp) return emp;

    // Si no existe, crear objeto básico
    return {
        id: employeeId,
        user_id: employeeId,
        name: `Empleado ${employeeId}`,
        legajo: `EMP00${employeeId}`,
        department: 'Sin especificar'
    };
}

// ✅ HELPER: Obtener documentos de empleado
function getEmployeeDocuments(employeeId) {
    return cachedDocumentsFromAPI[employeeId] || mockMedicalDocuments[employeeId] || {
        certificates: [], studies: [], photos: [], prescriptions: []
    };
}

// ✅ HELPER: Obtener conversaciones de empleado
function getEmployeeConversations(employeeId) {
    return cachedConversationsFromAPI[employeeId] || mockConversations[employeeId] || [];
}

// ============================================================================
// GLOBAL MODE TOGGLE (Demo vs Real API)
// ============================================================================
let medicalDashboardMode = 'real'; // 'demo' o 'real'

function toggleMedicalDashboardMode() {
    medicalDashboardMode = medicalDashboardMode === 'demo' ? 'real' : 'demo';
    console.log(`🔄 [MEDICAL-DASHBOARD] Cambiando a modo ${medicalDashboardMode.toUpperCase()}`);

    // Actualizar UI del toggle
    const toggleBtn = document.getElementById('medicalModeToggle');
    if (toggleBtn) {
        if (medicalDashboardMode === 'real') {
            toggleBtn.innerHTML = '🔴 MODO: REAL API';
            toggleBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        } else {
            toggleBtn.innerHTML = '🟠 MODO: DEMO';
            toggleBtn.style.background = 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)';
        }
    }

    // Mostrar/ocultar secciones según modo
    const pendingCasesSection = document.getElementById('pending-cases-section');
    const employeesSection = document.getElementById('employees-medical-list');

    if (medicalDashboardMode === 'real') {
        if (pendingCasesSection) pendingCasesSection.style.display = 'block';
        // Auto-cargar casos pendientes reales
        loadPendingCases_real();
    } else {
        if (pendingCasesSection) pendingCasesSection.style.display = 'none';
    }

    showMedicalMessage(`✅ Modo cambiado a: ${medicalDashboardMode.toUpperCase()}`, 'success');
}

// Medical Dashboard functions - IMPORTANTE: nombre correcto sin mayúscula en 'dashboard'
function showMedicaldashboardContent() {
    const content = document.getElementById('mainContent') ||
                   document.getElementById('module-content') ||
                   document.getElementById('medical-dashboard-container');
    if (!content) {
        console.error('[MEDICAL] No se encontro container (mainContent/module-content/medical-dashboard-container)');
        return;
    }

    // Inyectar estilos enterprise dark theme
    injectMedicalEnterpriseStyles();

    content.innerHTML = `
        <div id="medical-enterprise" class="medical-enterprise">
            <!-- ══════════════════════════════════════════════════════════════════════════════
                 HEADER PROFESIONAL - MEDICAL ENGINE v4.0
                 ══════════════════════════════════════════════════════════════════════════════ -->
            <header class="me-header" style="flex-wrap: wrap; gap: 15px;">
                <div class="me-header-left">
                    <div class="me-logo" style="background: linear-gradient(135deg, #1e88e5, #0d47a1);">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                    </div>
                    <div class="me-title-block">
                        <h1 class="me-title" style="font-size: 20px; letter-spacing: 2px;">MEDICAL ENGINE</h1>
                        <span class="me-subtitle">Sistema de Gestión Médica Ocupacional v4.0</span>
                    </div>
                </div>
                <div class="me-header-center" style="flex: 1; justify-content: center;">
                    <div class="me-tech-badges" style="flex-wrap: wrap; justify-content: center;">
                        <span class="me-badge" style="background: rgba(30, 136, 229, 0.15); color: #42a5f5; border: 1px solid rgba(30, 136, 229, 0.3);" title="API REST conectada a PostgreSQL">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                            REST API
                        </span>
                        <span class="me-badge" style="background: rgba(0, 150, 136, 0.15); color: #26a69a; border: 1px solid rgba(0, 150, 136, 0.3);" title="Base de datos PostgreSQL con ACID compliance">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4z"/></svg>
                            PostgreSQL
                        </span>
                        <span class="me-badge" style="background: rgba(156, 39, 176, 0.15); color: #ba68c8; border: 1px solid rgba(156, 39, 176, 0.3);" title="Cumplimiento SRT y normativas argentinas">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                            SRT Compliance
                        </span>
                        <span class="me-badge" style="background: rgba(255, 152, 0, 0.15); color: #ffb74d; border: 1px solid rgba(255, 152, 0, 0.3);" title="Ley 19.587 y Decreto 351/79">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/></svg>
                            Ley 19.587
                        </span>
                        <span class="me-badge" style="background: rgba(76, 175, 80, 0.15); color: #81c784; border: 1px solid rgba(76, 175, 80, 0.3);" title="Auditoría completa de acciones">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            Audit Trail
                        </span>
                    </div>
                </div>
                <div class="me-header-right">
                    <button onclick="loadPendingCases_real(); loadEmployeesWithMedicalRecords();" class="me-btn me-btn-primary" style="gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/></svg>
                        Actualizar
                    </button>
                </div>
            </header>

            <!-- ══════════════════════════════════════════════════════════════════════════════
                 BARRA DE INFORMACIÓN PARA MÉDICOS / RRHH
                 ══════════════════════════════════════════════════════════════════════════════ -->
            <div style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); padding: 20px 24px; border-bottom: 1px solid var(--me-border);">
                <div style="max-width: 1400px; margin: 0 auto;">
                    <div style="display: flex; align-items: flex-start; gap: 20px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 300px;">
                            <h2 style="margin: 0 0 8px 0; font-size: 16px; color: #90caf9; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Centro de Control Médico Ocupacional</h2>
                            <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 13px; line-height: 1.6;">
                                Sistema integral para la gestión del legajo médico de cada empleado. Permite el seguimiento completo del ciclo de vida ocupacional:
                                desde el examen <strong>pre-ocupacional</strong> de ingreso, los controles <strong>periódicos</strong> durante la relación laboral,
                                hasta el examen de <strong>egreso</strong>. Incluye gestión de ausencias, certificados, accidentes laborales y enfermedades profesionales.
                            </p>
                        </div>
                        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                            <div style="background: rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 8px; text-align: center; min-width: 100px;">
                                <div style="font-size: 24px; font-weight: 700; color: white;" id="kpi-total-employees">-</div>
                                <div style="font-size: 11px; color: #90caf9; text-transform: uppercase;">Empleados</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 8px; text-align: center; min-width: 100px;">
                                <div style="font-size: 24px; font-weight: 700; color: #4caf50;" id="kpi-exams-ok">-</div>
                                <div style="font-size: 11px; color: #90caf9; text-transform: uppercase;">Aptos</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 8px; text-align: center; min-width: 100px;">
                                <div style="font-size: 24px; font-weight: 700; color: #ff9800;" id="kpi-pending-cases">-</div>
                                <div style="font-size: 11px; color: #90caf9; text-transform: uppercase;">Pendientes</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 8px; text-align: center; min-width: 100px;">
                                <div style="font-size: 24px; font-weight: 700; color: #f44336;" id="kpi-alerts">-</div>
                                <div style="font-size: 11px; color: #90caf9; text-transform: uppercase;">Alertas</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ══════════════════════════════════════════════════════════════════════════════
                 NAVEGACIÓN POR CAPÍTULOS OCUPACIONALES
                 ══════════════════════════════════════════════════════════════════════════════ -->
            <nav class="me-nav" style="background: var(--me-bg-tertiary); padding: 12px 24px; justify-content: center; gap: 8px;">
                <button class="me-nav-item active" data-view="overview" onclick="MedicalEngine.showView('overview')" style="padding: 12px 20px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Vista General
                </button>
                <button class="me-nav-item" data-view="candidates" onclick="MedicalEngine.showView('candidates')" style="padding: 12px 20px; border-left: 3px solid #ff6b35;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
                    <span id="candidates-badge-container">Candidatos RRHH</span>
                </button>
                <button class="me-nav-item" data-view="pre" onclick="MedicalEngine.showView('pre')" style="padding: 12px 20px; border-left: 3px solid #1e88e5;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    PRE-Ocupacional
                </button>
                <button class="me-nav-item" data-view="ocup" onclick="MedicalEngine.showView('ocup')" style="padding: 12px 20px; border-left: 3px solid #4caf50;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    Ocupacional
                </button>
                <button class="me-nav-item" data-view="post" onclick="MedicalEngine.showView('post')" style="padding: 12px 20px; border-left: 3px solid #f44336;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>
                    POST-Ocupacional
                </button>
                <button class="me-nav-item" data-view="employees" onclick="MedicalEngine.showView('employees')" style="padding: 12px 20px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                    Legajos 360°
                </button>
                <button class="me-nav-item" data-view="notifications" onclick="MedicalEngine.showView('notifications')" style="padding: 12px 20px; border-left: 3px solid #9b59b6;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                    <span id="medical-notifications-badge-container">Notificaciones</span>
                </button>
            </nav>

            <!-- Main Content Area -->
            <main class="me-main" id="me-content">
                <!-- KPI Cards -->
                <div class="me-kpi-grid">
                    <div class="me-kpi-card">
                        <div class="me-kpi-icon" style="background: linear-gradient(135deg, #00d4ff, #0099cc);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        </div>
                        <div class="me-kpi-info">
                            <span class="me-kpi-value" id="employeesWithRecords">-</span>
                            <span class="me-kpi-label">Empleados con Carpeta</span>
                        </div>
                    </div>
                    <div class="me-kpi-card">
                        <div class="me-kpi-icon" style="background: linear-gradient(135deg, #00e676, #00c853);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <div class="me-kpi-info">
                            <span class="me-kpi-value" id="activeCertificates">-</span>
                            <span class="me-kpi-label">Certificados Activos</span>
                        </div>
                    </div>
                    <div class="me-kpi-card">
                        <div class="me-kpi-icon" style="background: linear-gradient(135deg, #b388ff, #7c4dff);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <div class="me-kpi-info">
                            <span class="me-kpi-value" id="withStudies">-</span>
                            <span class="me-kpi-label">Con Estudios</span>
                        </div>
                    </div>
                    <div class="me-kpi-card">
                        <div class="me-kpi-icon" style="background: linear-gradient(135deg, #ff5252, #d32f2f);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div class="me-kpi-info">
                            <span class="me-kpi-value" id="requiresAudit">-</span>
                            <span class="me-kpi-label">Requieren Auditoría</span>
                        </div>
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="me-search-bar">
                    <div class="me-search-input-wrapper">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input type="text" id="medicalSearchInput" class="me-search-input" placeholder="Buscar empleado por nombre o legajo...">
                    </div>
                    <button onclick="loadEmployeesWithMedicalRecords()" class="me-btn me-btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        Buscar
                    </button>
                </div>

                <!-- Two Column Layout -->
                <div class="me-two-columns">
                    <!-- Left Column: Pending Cases -->
                    <div class="me-column">
                        <div class="me-card">
                            <div class="me-card-header">
                                <h3 class="me-card-title">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                                    Casos Médicos Pendientes
                                </h3>
                                <button onclick="loadPendingCases_real()" class="me-btn me-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/></svg>
                                    Actualizar
                                </button>
                            </div>
                            <div class="me-card-body" id="pending-cases-container">
                                <div class="me-loading">
                                    <div class="me-spinner"></div>
                                    <span>Cargando casos...</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Quick Actions -->
                    <div class="me-column">
                        <div class="me-card">
                            <div class="me-card-header">
                                <h3 class="me-card-title">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                    Acciones Rápidas
                                </h3>
                            </div>
                            <div class="me-card-body">
                                <div class="me-quick-actions">
                                    <button onclick="showAllEmployeesPhotoRequests()" class="me-action-btn me-action-photos">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                        <span>Fotos Solicitadas</span>
                                    </button>
                                    <button onclick="showAllEmployeesStudies()" class="me-action-btn me-action-studies">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                                        <span>Ver Estudios</span>
                                    </button>
                                    <button onclick="showPendingAudits()" class="me-action-btn me-action-audits">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                                        <span>Auditorías Pendientes</span>
                                    </button>
                                    <button onclick="generateGlobalMedicalReport()" class="me-action-btn me-action-report">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                                        <span>Reporte General</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Alerts Card -->
                        <div class="me-card me-card-alerts">
                            <div class="me-card-header">
                                <h3 class="me-card-title">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                                    Alertas Médicas
                                </h3>
                            </div>
                            <div class="me-card-body" id="medical-alerts">
                                <div class="me-alert me-alert-warning">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                                    <span><strong>Certificados por Vencer:</strong> 3 certificados vencen en 7 días</span>
                                </div>
                                <div class="me-alert me-alert-info">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                                    <span><strong>Estudios Pendientes:</strong> 5 empleados con estudios pendientes</span>
                                </div>
                                <div class="me-alert me-alert-danger">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                    <span><strong>Auditorías Urgentes:</strong> 2 casos requieren atención inmediata</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Employees List -->
                <div class="me-card me-card-full">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                            Empleados con Carpeta Médica
                        </h3>
                        <span class="me-badge me-badge-count" id="employees-count">0 empleados</span>
                    </div>
                    <div class="me-card-body" id="employees-medical-list">
                        <div class="me-empty-state">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                            <h4>Buscar Empleados</h4>
                            <p>Utiliza el buscador para encontrar empleados con carpeta médica</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;

    // Initialize dates to current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const dateStartEl = document.getElementById('medicalDateStart');
    const dateEndEl = document.getElementById('medicalDateEnd');
    if (dateStartEl) dateStartEl.value = firstDay.toISOString().split('T')[0];
    if (dateEndEl) dateEndEl.value = lastDay.toISOString().split('T')[0];

    // Initialize MedicalEngine navigation
    initMedicalEngineNav();

    // Auto load medical statistics
    setTimeout(loadMedicalStatistics, 300);
}

// Initialize MedicalEngine navigation
function initMedicalEngineNav() {
    window.MedicalEngine = {
        currentView: 'overview',
        showView: function(view) {
            this.currentView = view;
            document.querySelectorAll('.me-nav-item').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === view);
            });
            console.log(`[MEDICAL-ENGINE] Cambiando a vista: ${view.toUpperCase()}`);

            // Renderizar la vista correspondiente
            const contentArea = document.getElementById('me-content');
            if (!contentArea) return;

            switch(view) {
                case 'overview':
                    this.renderOverviewView(contentArea);
                    break;
                case 'candidates':
                    this.renderCandidatesView(contentArea);
                    break;
                case 'pre':
                    this.renderPreOcupacionalView(contentArea);
                    break;
                case 'ocup':
                    this.renderOcupacionalView(contentArea);
                    break;
                case 'post':
                    this.renderPostOcupacionalView(contentArea);
                    break;
                case 'employees':
                    this.renderEmployeesView(contentArea);
                    break;
                case 'notifications':
                    this.renderNotificationsView(contentArea);
                    break;
            }
        },

        // ═══════════════════════════════════════════════════════════════════════════
        // VISTA GENERAL (OVERVIEW) - Dashboard principal con KPIs
        // ═══════════════════════════════════════════════════════════════════════════
        renderOverviewView: function(container) {
            container.innerHTML = `
                <!-- KPI Cards -->
                <div class="me-kpi-grid">
                    <div class="me-kpi-card">
                        <div class="me-kpi-icon" style="background: linear-gradient(135deg, #00d4ff, #0099cc);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        </div>
                        <div class="me-kpi-info">
                            <span class="me-kpi-value" id="employeesWithRecords">-</span>
                            <span class="me-kpi-label">Empleados con Carpeta</span>
                        </div>
                    </div>
                    <div class="me-kpi-card">
                        <div class="me-kpi-icon" style="background: linear-gradient(135deg, #00e676, #00c853);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <div class="me-kpi-info">
                            <span class="me-kpi-value" id="activeCertificates">-</span>
                            <span class="me-kpi-label">Certificados Activos</span>
                        </div>
                    </div>
                    <div class="me-kpi-card">
                        <div class="me-kpi-icon" style="background: linear-gradient(135deg, #b388ff, #7c4dff);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <div class="me-kpi-info">
                            <span class="me-kpi-value" id="withStudies">-</span>
                            <span class="me-kpi-label">Con Estudios</span>
                        </div>
                    </div>
                    <div class="me-kpi-card">
                        <div class="me-kpi-icon" style="background: linear-gradient(135deg, #ff5252, #d32f2f);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div class="me-kpi-info">
                            <span class="me-kpi-value" id="requiresAudit">-</span>
                            <span class="me-kpi-label">Requieren Auditoria</span>
                        </div>
                    </div>
                </div>

                <!-- Search Bar -->
                <div class="me-search-bar">
                    <div class="me-search-input-wrapper">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input type="text" id="medicalSearchInput" class="me-search-input" placeholder="Buscar empleado por nombre o legajo...">
                    </div>
                    <button onclick="loadEmployeesWithMedicalRecords()" class="me-btn me-btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        Buscar
                    </button>
                </div>

                <!-- Two Column Layout -->
                <div class="me-two-columns">
                    <!-- Left Column: Pending Cases -->
                    <div class="me-column">
                        <div class="me-card">
                            <div class="me-card-header">
                                <h3 class="me-card-title">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                                    Casos Medicos Pendientes
                                </h3>
                                <button onclick="loadPendingCases_real()" class="me-btn me-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/></svg>
                                    Actualizar
                                </button>
                            </div>
                            <div class="me-card-body" id="pending-cases-container">
                                <div class="me-loading">
                                    <div class="me-spinner"></div>
                                    <span>Cargando casos...</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Quick Actions -->
                    <div class="me-column">
                        <div class="me-card">
                            <div class="me-card-header">
                                <h3 class="me-card-title">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                    Acciones Rapidas
                                </h3>
                            </div>
                            <div class="me-card-body">
                                <div class="me-quick-actions">
                                    <button onclick="showAllEmployeesPhotoRequests()" class="me-action-btn me-action-photos">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                        <span>Fotos Solicitadas</span>
                                    </button>
                                    <button onclick="showAllEmployeesStudies()" class="me-action-btn me-action-studies">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                                        <span>Ver Estudios</span>
                                    </button>
                                    <button onclick="showPendingAudits()" class="me-action-btn me-action-audits">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                                        <span>Auditorias Pendientes</span>
                                    </button>
                                    <button onclick="generateGlobalMedicalReport()" class="me-action-btn me-action-report">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                                        <span>Reporte General</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Employees List -->
                <div class="me-card">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                            Empleados con Carpeta Medica
                        </h3>
                        <span id="employees-count" class="me-badge" style="background: rgba(30, 136, 229, 0.2); color: #42a5f5;">0 empleados</span>
                    </div>
                    <div class="me-card-body" id="employees-medical-list">
                        <div class="me-empty-state">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            <p>Haga clic en <strong>Buscar</strong> para cargar empleados</p>
                        </div>
                    </div>
                </div>
            `;

            // Recargar datos
            setTimeout(() => {
                loadMedicalStatistics();
                loadPendingCases_real();
            }, 100);
        },

        // ═══════════════════════════════════════════════════════════════════════════
        // VISTA: CANDIDATOS RRHH (Pendientes de Examen Preocupacional)
        // Candidatos aprobados por RRHH que requieren examen medico antes de contratacion
        // ═══════════════════════════════════════════════════════════════════════════
        renderCandidatesView: function(container) {
            container.innerHTML = `
                <!-- Header del Modulo -->
                <div style="background: linear-gradient(135deg, #ff6b35 0%, #f4511e 100%); padding: 30px; border-radius: 12px; margin-bottom: 24px; color: white;">
                    <div style="display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap;">
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="8.5" cy="7" r="4"/>
                                <path d="M20 8v6M23 11h-6"/>
                            </svg>
                        </div>
                        <div style="flex: 1; min-width: 300px;">
                            <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">Candidatos Pendientes de Examen</h2>
                            <p style="margin: 0; opacity: 0.9; font-size: 15px;">
                                Candidatos aprobados por RRHH que requieren examen preocupacional antes de su contratacion.
                                Registre el resultado del examen medico para continuar con el proceso de alta.
                            </p>
                        </div>
                        <div style="text-align: center; padding: 15px 25px; background: rgba(255,255,255,0.15); border-radius: 10px;">
                            <div id="candidates-pending-count" style="font-size: 32px; font-weight: 700;">-</div>
                            <div style="font-size: 13px; opacity: 0.9;">Pendientes</div>
                        </div>
                    </div>
                </div>

                <!-- Lista de Candidatos -->
                <div class="me-card">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <path d="M14 2v6h6"/>
                                <path d="M16 13H8M16 17H8M10 9H8"/>
                            </svg>
                            Candidatos Aprobados por RRHH
                        </h3>
                        <button onclick="MedicalEngine.loadCandidates()" class="me-btn me-btn-primary">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 4v6h-6M1 20v-6h6"/>
                            </svg>
                            Actualizar
                        </button>
                    </div>
                    <div class="me-card-body" id="candidates-list-container">
                        <div class="me-loading">
                            <div class="me-spinner"></div>
                            <span>Cargando candidatos...</span>
                        </div>
                    </div>
                </div>

                <!-- Modal para Registrar Resultado Medico -->
                <div id="modal-medical-result" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; align-items: center; justify-content: center;">
                    <div style="background: #1a1f2e; border-radius: 16px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
                        <div style="background: linear-gradient(135deg, #ff6b35, #f4511e); padding: 20px 24px; border-radius: 16px 16px 0 0;">
                            <h3 style="margin: 0; color: white; font-size: 18px;">Registrar Resultado Medico</h3>
                            <p id="modal-candidate-name" style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Candidato</p>
                        </div>
                        <div style="padding: 24px;">
                            <input type="hidden" id="modal-application-id">

                            <!-- Resultado del Examen -->
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; color: #a0aec0; font-size: 13px; margin-bottom: 8px;">Resultado del Examen *</label>
                                <select id="modal-result" style="width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: white; font-size: 14px;">
                                    <option value="">Seleccione resultado...</option>
                                    <option value="apto">APTO - Sin restricciones</option>
                                    <option value="apto_con_observaciones">APTO CON OBSERVACIONES - Restricciones menores</option>
                                    <option value="no_apto">NO APTO - No puede ser contratado</option>
                                </select>
                            </div>

                            <!-- Observaciones -->
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; color: #a0aec0; font-size: 13px; margin-bottom: 8px;">Observaciones Medicas</label>
                                <textarea id="modal-observations" rows="4" placeholder="Ingrese observaciones clinicas relevantes..." style="width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: white; font-size: 14px; resize: vertical;"></textarea>
                            </div>

                            <!-- Restricciones (para apto_con_observaciones) -->
                            <div id="restrictions-section" style="margin-bottom: 20px; display: none;">
                                <label style="display: block; color: #a0aec0; font-size: 13px; margin-bottom: 8px;">Restricciones Laborales</label>
                                <textarea id="modal-restrictions" rows="3" placeholder="Ej: No puede realizar esfuerzos fisicos intensos, requiere pausas cada 2 horas..." style="width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: white; font-size: 14px; resize: vertical;"></textarea>
                            </div>

                            <!-- Fecha del Examen -->
                            <div style="margin-bottom: 20px;">
                                <label style="display: block; color: #a0aec0; font-size: 13px; margin-bottom: 8px;">Fecha del Examen</label>
                                <input type="date" id="modal-exam-date" style="width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: white; font-size: 14px;">
                            </div>

                            <!-- Botones -->
                            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                                <button onclick="MedicalEngine.closeMedicalResultModal()" style="padding: 12px 24px; background: #30363d; border: none; border-radius: 8px; color: white; cursor: pointer;">
                                    Cancelar
                                </button>
                                <button onclick="MedicalEngine.submitMedicalResult()" style="padding: 12px 24px; background: linear-gradient(135deg, #00e676, #00c853); border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">
                                    Guardar Resultado
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Mostrar/ocultar restricciones segun resultado
            const resultSelect = document.getElementById('modal-result');
            if (resultSelect) {
                resultSelect.addEventListener('change', function() {
                    const restrictionsSection = document.getElementById('restrictions-section');
                    if (restrictionsSection) {
                        restrictionsSection.style.display = this.value === 'apto_con_observaciones' ? 'block' : 'none';
                    }
                });
            }

            // Cargar candidatos
            this.loadCandidates();
        },

        // Cargar candidatos pendientes de examen
        loadCandidates: async function() {
            const container = document.getElementById('candidates-list-container');
            const countEl = document.getElementById('candidates-pending-count');

            if (!container) return;

            container.innerHTML = `
                <div class="me-loading">
                    <div class="me-spinner"></div>
                    <span>Cargando candidatos...</span>
                </div>
            `;

            try {
                const response = await JobPostingsAPI.getPendingMedicalExam();
                const candidates = response.data || response.applications || [];

                if (countEl) countEl.textContent = candidates.length;

                if (candidates.length === 0) {
                    container.innerHTML = `
                        <div class="me-empty-state">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity: 0.5;">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="8.5" cy="7" r="4"/>
                                <path d="M20 8v6M23 11h-6"/>
                            </svg>
                            <h3 style="margin: 16px 0 8px 0; color: #a0aec0;">No hay candidatos pendientes</h3>
                            <p style="color: #6b7280; font-size: 14px;">Todos los candidatos han sido evaluados o no hay aprobaciones de RRHH pendientes.</p>
                        </div>
                    `;
                    return;
                }

                // Renderizar tabla de candidatos
                let html = `
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: rgba(255,107,53,0.1); border-bottom: 2px solid #ff6b35;">
                                    <th style="padding: 14px; text-align: left; color: #ff6b35; font-weight: 600;">Candidato</th>
                                    <th style="padding: 14px; text-align: left; color: #ff6b35; font-weight: 600;">Puesto</th>
                                    <th style="padding: 14px; text-align: center; color: #ff6b35; font-weight: 600;">DNI</th>
                                    <th style="padding: 14px; text-align: center; color: #ff6b35; font-weight: 600;">Aprobado RRHH</th>
                                    <th style="padding: 14px; text-align: center; color: #ff6b35; font-weight: 600;">Dias Espera</th>
                                    <th style="padding: 14px; text-align: center; color: #ff6b35; font-weight: 600;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                candidates.forEach(candidate => {
                    const fullName = candidate.candidate_full_name || `${candidate.candidate_first_name} ${candidate.candidate_last_name}`;
                    const jobTitle = candidate.job_title || candidate.jobPosting?.title || 'No especificado';
                    const dni = candidate.candidate_dni || '-';
                    const approvedAt = candidate.admin_approved_at ? new Date(candidate.admin_approved_at).toLocaleDateString('es-AR') : '-';
                    const daysWaiting = candidate.days_since_approval || Math.floor((Date.now() - new Date(candidate.admin_approved_at)) / (1000 * 60 * 60 * 24));
                    const appId = candidate.application_id || candidate.id;

                    // Color segun dias de espera
                    let waitingClass = 'color: #00e676;'; // Verde - menos de 3 dias
                    if (daysWaiting >= 7) {
                        waitingClass = 'color: #ff5252;'; // Rojo - mas de 7 dias
                    } else if (daysWaiting >= 3) {
                        waitingClass = 'color: #ffab00;'; // Amarillo - 3-7 dias
                    }

                    html += `
                        <tr style="border-bottom: 1px solid #30363d;" onmouseover="this.style.background='rgba(255,107,53,0.05)'" onmouseout="this.style.background='transparent'">
                            <td style="padding: 14px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #ff6b35, #f4511e); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                                        ${fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style="color: white; font-weight: 500;">${fullName}</div>
                                        <div style="color: #6b7280; font-size: 12px;">${candidate.candidate_email || ''}</div>
                                    </div>
                                </div>
                            </td>
                            <td style="padding: 14px; color: #a0aec0;">${jobTitle}</td>
                            <td style="padding: 14px; text-align: center; color: #a0aec0; font-family: monospace;">${dni}</td>
                            <td style="padding: 14px; text-align: center; color: #a0aec0;">${approvedAt}</td>
                            <td style="padding: 14px; text-align: center; ${waitingClass} font-weight: 600;">${daysWaiting} dias</td>
                            <td style="padding: 14px; text-align: center;">
                                <button onclick="MedicalEngine.openMedicalResultModal(${appId}, '${fullName.replace(/'/g, "\\'")}', '${dni}')"
                                        style="padding: 8px 16px; background: linear-gradient(135deg, #00e676, #00c853); border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 13px; font-weight: 500;">
                                    Registrar Examen
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += `
                            </tbody>
                        </table>
                    </div>
                `;

                container.innerHTML = html;

            } catch (error) {
                console.error('[MEDICAL] Error cargando candidatos:', error);
                container.innerHTML = `
                    <div class="me-empty-state" style="color: #ff5252;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        <h3 style="margin: 16px 0 8px 0;">Error al cargar candidatos</h3>
                        <p style="font-size: 14px;">${error.message}</p>
                        <button onclick="MedicalEngine.loadCandidates()" style="margin-top: 16px; padding: 10px 20px; background: #ff6b35; border: none; border-radius: 6px; color: white; cursor: pointer;">
                            Reintentar
                        </button>
                    </div>
                `;
            }
        },

        // Abrir modal para registrar resultado
        openMedicalResultModal: function(applicationId, candidateName, dni) {
            document.getElementById('modal-application-id').value = applicationId;
            document.getElementById('modal-candidate-name').textContent = `${candidateName} - DNI: ${dni}`;
            document.getElementById('modal-result').value = '';
            document.getElementById('modal-observations').value = '';
            document.getElementById('modal-restrictions').value = '';
            document.getElementById('modal-exam-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('restrictions-section').style.display = 'none';
            document.getElementById('modal-medical-result').style.display = 'flex';
        },

        // Cerrar modal
        closeMedicalResultModal: function() {
            document.getElementById('modal-medical-result').style.display = 'none';
        },

        // Enviar resultado medico
        submitMedicalResult: async function() {
            const applicationId = document.getElementById('modal-application-id').value;
            const result = document.getElementById('modal-result').value;
            const observations = document.getElementById('modal-observations').value;
            const restrictions = document.getElementById('modal-restrictions').value;
            const examDate = document.getElementById('modal-exam-date').value;

            if (!result) {
                alert('Debe seleccionar un resultado del examen');
                return;
            }

            try {
                const response = await JobPostingsAPI.setMedicalResult(applicationId, {
                    result: result,
                    observations: observations,
                    restrictions: result === 'apto_con_observaciones' ? restrictions.split('\n').filter(r => r.trim()) : [],
                    exam_date: examDate
                });

                this.closeMedicalResultModal();

                // Mostrar mensaje de exito
                const resultText = result === 'apto' ? 'APTO' : (result === 'apto_con_observaciones' ? 'APTO CON OBSERVACIONES' : 'NO APTO');
                alert(`Resultado registrado exitosamente: ${resultText}`);

                // Recargar lista
                this.loadCandidates();

            } catch (error) {
                console.error('[MEDICAL] Error registrando resultado:', error);
                this.closeMedicalResultModal();
                alert('Error al registrar resultado: ' + error.message);
            }
        },

        // ═══════════════════════════════════════════════════════════════════════════
        // CAPITULO 1: PRE-OCUPACIONAL
        // Ingreso laboral: examen preocupacional, antecedentes, declaracion jurada
        // ═══════════════════════════════════════════════════════════════════════════
        renderPreOcupacionalView: function(container) {
            container.innerHTML = `
                <!-- Header del Capitulo -->
                <div style="background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); padding: 30px; border-radius: 12px; margin-bottom: 24px; color: white;">
                    <div style="display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap;">
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="8.5" cy="7" r="4"/>
                                <line x1="20" y1="8" x2="20" y2="14"/>
                                <line x1="23" y1="11" x2="17" y2="11"/>
                            </svg>
                        </div>
                        <div style="flex: 1; min-width: 300px;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <h2 style="margin: 0; font-size: 28px; font-weight: 700;">CAPITULO 1: PRE-OCUPACIONAL</h2>
                                <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px;">INGRESO LABORAL</span>
                            </div>
                            <p style="margin: 0; opacity: 0.9; font-size: 15px; line-height: 1.6;">
                                Gestion completa del proceso de ingreso: examen preocupacional obligatorio,
                                declaracion jurada de salud, antecedentes medicos previos y determinacion de aptitud para el puesto.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Marco Normativo y Tecnologias -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                    <!-- Compliance -->
                    <div class="me-card" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border: 1px solid #90caf9;">
                        <div class="me-card-header" style="border-bottom: 1px solid #90caf9;">
                            <h3 class="me-card-title" style="color: #1565c0;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1565c0" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                Marco Normativo
                            </h3>
                        </div>
                        <div class="me-card-body" style="color: #0d47a1;">
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Ley 19.587</span>
                                    <span style="font-size: 13px;">Higiene y Seguridad en el Trabajo</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Decreto 351/79</span>
                                    <span style="font-size: 13px;">Reglamentacion - Examenes obligatorios</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Res. SRT 37/10</span>
                                    <span style="font-size: 13px;">Examenes medicos en salud</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Res. SRT 905/15</span>
                                    <span style="font-size: 13px;">Protocolo de examenes preocupacionales</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Stack Tecnologico -->
                    <div class="me-card" style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 1px solid #81c784;">
                        <div class="me-card-header" style="border-bottom: 1px solid #81c784;">
                            <h3 class="me-card-title" style="color: #2e7d32;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                                Stack Tecnologico
                            </h3>
                        </div>
                        <div class="me-card-body" style="color: #1b5e20;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Base de Datos</div>
                                    <div style="font-weight: 600;">PostgreSQL 16</div>
                                </div>
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">API</div>
                                    <div style="font-weight: 600;">REST + JWT</div>
                                </div>
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Almacenamiento</div>
                                    <div style="font-weight: 600;">Encriptado AES-256</div>
                                </div>
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Auditoria</div>
                                    <div style="font-weight: 600;">Full Audit Trail</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Funcionalidades del Capitulo -->
                <div class="me-card" style="margin-bottom: 24px;">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                            Funcionalidades Disponibles
                        </h3>
                    </div>
                    <div class="me-card-body">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #1e88e5;">
                                <h4 style="margin: 0 0 8px 0; color: #1e88e5; font-size: 14px;">Examen Preocupacional</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Registro del examen de ingreso: fecha, centro medico, medico actuante, resultado (APTO/NO APTO/APTO CON RESTRICCIONES), observaciones.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #7c4dff;">
                                <h4 style="margin: 0 0 8px 0; color: #7c4dff; font-size: 14px;">Declaracion Jurada de Salud</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Formulario digital firmado por el empleado declarando antecedentes, enfermedades previas, medicacion actual y cirugia previas.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #00bcd4;">
                                <h4 style="margin: 0 0 8px 0; color: #00bcd4; font-size: 14px;">Antecedentes Medicos</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Historial de alergias, condiciones cronicas, cirugias previas, medicacion permanente anterior al ingreso.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #ff9800;">
                                <h4 style="margin: 0 0 8px 0; color: #ff9800; font-size: 14px;">Obra Social / Prepaga</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Registro del proveedor de salud, numero de afiliado, plan contratado y fecha de vencimiento de credencial.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #4caf50;">
                                <h4 style="margin: 0 0 8px 0; color: #4caf50; font-size: 14px;">Estudios Complementarios</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Adjuntar estudios: laboratorio, Rx torax, ECG, audiometria, espirometria segun puesto de trabajo.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #e91e63;">
                                <h4 style="margin: 0 0 8px 0; color: #e91e63; font-size: 14px;">Aptitud para el Puesto</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Determinacion de aptitud segun requerimientos del puesto: esfuerzo fisico, trabajo en altura, exposicion a agentes, etc.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Lista de Empleados en etapa PRE -->
                <div class="me-card">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                            Empleados - Examen Preocupacional
                        </h3>
                        <button onclick="MedicalEngine.loadPreOcupacionalEmployees()" class="me-btn me-btn-sm me-btn-primary">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/></svg>
                            Cargar Empleados
                        </button>
                    </div>
                    <div class="me-card-body" id="pre-ocupacional-employees-list">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
                            <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 20px; border-radius: 10px; text-align: center;">
                                <div style="font-size: 32px; font-weight: 700; color: #2e7d32;" id="pre-aptos-count">-</div>
                                <div style="font-size: 13px; color: #388e3c;">APTOS</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); padding: 20px; border-radius: 10px; text-align: center;">
                                <div style="font-size: 32px; font-weight: 700; color: #e65100;" id="pre-pendientes-count">-</div>
                                <div style="font-size: 13px; color: #ef6c00;">PENDIENTES</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); padding: 20px; border-radius: 10px; text-align: center;">
                                <div style="font-size: 32px; font-weight: 700; color: #c62828;" id="pre-restricciones-count">-</div>
                                <div style="font-size: 13px; color: #d32f2f;">CON RESTRICCIONES</div>
                            </div>
                        </div>
                        <p style="text-align: center; color: var(--me-text-secondary);">
                            Haga clic en <strong>Cargar Empleados</strong> para ver la lista de empleados con estado preocupacional.
                        </p>
                    </div>
                </div>
            `;
        },

        // ═══════════════════════════════════════════════════════════════════════════
        // CAPITULO 2: OCUPACIONAL
        // Durante la relacion laboral: periodicos, ausencias, accidentes, certificados
        // ═══════════════════════════════════════════════════════════════════════════
        renderOcupacionalView: function(container) {
            container.innerHTML = `
                <!-- Header del Capitulo -->
                <div style="background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); padding: 30px; border-radius: 12px; margin-bottom: 24px; color: white;">
                    <div style="display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap;">
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>
                        </div>
                        <div style="flex: 1; min-width: 300px;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <h2 style="margin: 0; font-size: 28px; font-weight: 700;">CAPITULO 2: OCUPACIONAL</h2>
                                <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px;">DURANTE EL EMPLEO</span>
                            </div>
                            <p style="margin: 0; opacity: 0.9; font-size: 15px; line-height: 1.6;">
                                Seguimiento medico durante la relacion laboral: examenes periodicos, ausencias por enfermedad,
                                accidentes laborales y no laborales, enfermedades profesionales, restricciones, medicacion y certificados.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Marco Normativo y Tecnologias -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                    <!-- Compliance -->
                    <div class="me-card" style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 1px solid #81c784;">
                        <div class="me-card-header" style="border-bottom: 1px solid #81c784;">
                            <h3 class="me-card-title" style="color: #2e7d32;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                Marco Normativo
                            </h3>
                        </div>
                        <div class="me-card-body" style="color: #1b5e20;">
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Res. SRT 43/97</span>
                                    <span style="font-size: 13px;">Examenes periodicos obligatorios</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Ley 24.557</span>
                                    <span style="font-size: 13px;">Ley de Riesgos del Trabajo (LRT)</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Decreto 658/96</span>
                                    <span style="font-size: 13px;">Listado de Enfermedades Profesionales</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Res. SRT 463/09</span>
                                    <span style="font-size: 13px;">Registro de accidentes y ausentismo</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Integraciones -->
                    <div class="me-card" style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border: 1px solid #ffb74d;">
                        <div class="me-card-header" style="border-bottom: 1px solid #ffb74d;">
                            <h3 class="me-card-title" style="color: #e65100;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e65100" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                Integraciones
                            </h3>
                        </div>
                        <div class="me-card-body" style="color: #bf360c;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Control Asistencia</div>
                                    <div style="font-weight: 600;">Biometrico</div>
                                </div>
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Notificaciones</div>
                                    <div style="font-weight: 600;">Push + Email</div>
                                </div>
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Reportes ART</div>
                                    <div style="font-weight: 600;">SIPA Compatible</div>
                                </div>
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Liquidacion</div>
                                    <div style="font-weight: 600;">Payroll Link</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Funcionalidades del Capitulo -->
                <div class="me-card" style="margin-bottom: 24px;">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                            Funcionalidades Disponibles
                        </h3>
                    </div>
                    <div class="me-card-body">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #4caf50;">
                                <h4 style="margin: 0 0 8px 0; color: #4caf50; font-size: 14px;">Examenes Periodicos</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Programacion y seguimiento de examenes periodicos segun riesgo del puesto. Alertas automaticas de vencimiento.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #f44336;">
                                <h4 style="margin: 0 0 8px 0; color: #f44336; font-size: 14px;">Accidentes Laborales</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Registro completo del accidente: fecha, hora, lugar, descripcion, testigos, atencion recibida, dias de baja, seguimiento ART.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #ff9800;">
                                <h4 style="margin: 0 0 8px 0; color: #ff9800; font-size: 14px;">Enfermedades Comunes</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Gestion de ausencias por enfermedad: certificados, diagnostico CIE-10, dias solicitados, auditoria medica.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #9c27b0;">
                                <h4 style="margin: 0 0 8px 0; color: #9c27b0; font-size: 14px;">Enfermedades Profesionales</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Deteccion y seguimiento segun Decreto 658/96. Notificacion a ART, seguimiento de tratamiento y rehabilitacion.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #00bcd4;">
                                <h4 style="margin: 0 0 8px 0; color: #00bcd4; font-size: 14px;">Restricciones Laborales</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Gestion de restricciones temporales o permanentes: tipo, duracion, afectacion al rol, seguimiento de evolucion.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #607d8b;">
                                <h4 style="margin: 0 0 8px 0; color: #607d8b; font-size: 14px;">Medicacion Actual</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Registro de medicacion: nombre, dosis, frecuencia, prescriptor, si es cronica, incompatibilidades laborales.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #e91e63;">
                                <h4 style="margin: 0 0 8px 0; color: #e91e63; font-size: 14px;">Maternidad/Paternidad</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Licencias por maternidad, excedencia, lactancia, paternidad. Control de fechas y extension de licencias.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #3f51b5;">
                                <h4 style="margin: 0 0 8px 0; color: #3f51b5; font-size: 14px;">Certificados Medicos</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Digitalizacion, validacion y auditoria de certificados. Workflow de aprobacion con niveles de autorizacion.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- KPIs Ocupacionales -->
                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 24px;">
                    <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 28px; font-weight: 700; color: #4caf50;" id="ocup-aptos">-</div>
                        <div style="font-size: 11px; color: var(--me-text-secondary);">Aptos Actuales</div>
                    </div>
                    <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 28px; font-weight: 700; color: #2196f3;" id="ocup-ausentes">-</div>
                        <div style="font-size: 11px; color: var(--me-text-secondary);">Ausentes Hoy</div>
                    </div>
                    <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 28px; font-weight: 700; color: #f44336;" id="ocup-accidentes">-</div>
                        <div style="font-size: 11px; color: var(--me-text-secondary);">Acc. Laborales (Ano)</div>
                    </div>
                    <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 28px; font-weight: 700; color: #9c27b0;" id="ocup-enf-prof">-</div>
                        <div style="font-size: 11px; color: var(--me-text-secondary);">Enf. Profesionales</div>
                    </div>
                    <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 28px; font-weight: 700; color: #ff9800;" id="ocup-restricciones">-</div>
                        <div style="font-size: 11px; color: var(--me-text-secondary);">Con Restricciones</div>
                    </div>
                    <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 28px; font-weight: 700; color: #e91e63;" id="ocup-vencimientos">-</div>
                        <div style="font-size: 11px; color: var(--me-text-secondary);">Venc. Proximo Mes</div>
                    </div>
                </div>

                <!-- Lista de Empleados con eventos ocupacionales -->
                <div class="me-card">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            Empleados con Eventos Activos
                        </h3>
                        <button onclick="MedicalEngine.loadOcupacionalEmployees()" class="me-btn me-btn-sm me-btn-primary">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/></svg>
                            Cargar Empleados
                        </button>
                    </div>
                    <div class="me-card-body" id="ocupacional-employees-list">
                        <p style="text-align: center; color: var(--me-text-secondary);">
                            Haga clic en <strong>Cargar Empleados</strong> para ver empleados con ausencias activas, restricciones o examenes proximos a vencer.
                        </p>
                    </div>
                </div>
            `;
        },

        // ═══════════════════════════════════════════════════════════════════════════
        // CAPITULO 3: POST-OCUPACIONAL
        // Finalizacion de la relacion laboral: examen de egreso, condiciones permanentes
        // ═══════════════════════════════════════════════════════════════════════════
        renderPostOcupacionalView: function(container) {
            container.innerHTML = `
                <!-- Header del Capitulo -->
                <div style="background: linear-gradient(135deg, #c62828 0%, #b71c1c 100%); padding: 30px; border-radius: 12px; margin-bottom: 24px; color: white;">
                    <div style="display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap;">
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="8.5" cy="7" r="4"/>
                                <line x1="18" y1="8" x2="23" y2="13"/>
                                <line x1="23" y1="8" x2="18" y2="13"/>
                            </svg>
                        </div>
                        <div style="flex: 1; min-width: 300px;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <h2 style="margin: 0; font-size: 28px; font-weight: 700;">CAPITULO 3: POST-OCUPACIONAL</h2>
                                <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px;">EGRESO LABORAL</span>
                            </div>
                            <p style="margin: 0; opacity: 0.9; font-size: 15px; line-height: 1.6;">
                                Cierre del legajo medico: examen de egreso obligatorio, documentacion de condiciones permanentes adquiridas,
                                resumen de eventos ocupacionales y archivo definitivo para consultas futuras.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Marco Normativo y Retenciones -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                    <!-- Compliance -->
                    <div class="me-card" style="background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border: 1px solid #ef9a9a;">
                        <div class="me-card-header" style="border-bottom: 1px solid #ef9a9a;">
                            <h3 class="me-card-title" style="color: #c62828;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c62828" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                Marco Normativo
                            </h3>
                        </div>
                        <div class="me-card-body" style="color: #b71c1c;">
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Res. SRT 37/10</span>
                                    <span style="font-size: 13px;">Examen de egreso obligatorio</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Art. 11 Ley 24.557</span>
                                    <span style="font-size: 13px;">Responsabilidad post-contractual</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Res. MTySS 37/10</span>
                                    <span style="font-size: 13px;">Conservacion de legajos 10 anos</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                                    <span style="font-weight: 600; min-width: 120px;">Ley 25.326</span>
                                    <span style="font-size: 13px;">Proteccion de Datos Personales</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Retencion de Datos -->
                    <div class="me-card" style="background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%); border: 1px solid #f48fb1;">
                        <div class="me-card-header" style="border-bottom: 1px solid #f48fb1;">
                            <h3 class="me-card-title" style="color: #ad1457;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ad1457" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                                Politica de Retencion
                            </h3>
                        </div>
                        <div class="me-card-body" style="color: #880e4f;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Legajo Medico</div>
                                    <div style="font-weight: 600;">10 anos</div>
                                </div>
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Accidentes LRT</div>
                                    <div style="font-weight: 600;">20 anos</div>
                                </div>
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Enf. Profesional</div>
                                    <div style="font-weight: 600;">Permanente</div>
                                </div>
                                <div style="padding: 10px; background: rgba(255,255,255,0.6); border-radius: 6px; text-align: center;">
                                    <div style="font-size: 11px; opacity: 0.8;">Formato</div>
                                    <div style="font-weight: 600;">Digital firmado</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Funcionalidades del Capitulo -->
                <div class="me-card" style="margin-bottom: 24px;">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                            Funcionalidades Disponibles
                        </h3>
                    </div>
                    <div class="me-card-body">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #c62828;">
                                <h4 style="margin: 0 0 8px 0; color: #c62828; font-size: 14px;">Examen de Egreso</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Examen medico de retiro: evaluacion completa del estado de salud al momento de la desvinculacion.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #ff5722;">
                                <h4 style="margin: 0 0 8px 0; color: #ff5722; font-size: 14px;">Condiciones Permanentes</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Documentacion de secuelas, condiciones cronicas adquiridas y restricciones permanentes durante el empleo.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #ff9800;">
                                <h4 style="margin: 0 0 8px 0; color: #ff9800; font-size: 14px;">Resumen Ocupacional</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Informe ejecutivo: total de ausencias, accidentes, enfermedades profesionales y evolucion durante el empleo.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #795548;">
                                <h4 style="margin: 0 0 8px 0; color: #795548; font-size: 14px;">Archivo Definitivo</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Cierre y archivo del legajo medico con firma digital. Disponible para consultas legales futuras.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #607d8b;">
                                <h4 style="margin: 0 0 8px 0; color: #607d8b; font-size: 14px;">Certificado Final</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Emision de constancia de salud al egreso. Copia para empleador, empleado y archivo interno.
                                </p>
                            </div>
                            <div style="background: var(--me-bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid #9e9e9e;">
                                <h4 style="margin: 0 0 8px 0; color: #9e9e9e; font-size: 14px;">Trazabilidad Legal</h4>
                                <p style="margin: 0; font-size: 13px; color: var(--me-text-secondary);">
                                    Registro inmutable de todas las acciones. Hash de integridad para documentos. Audit trail completo.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- KPIs Post-Ocupacionales -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
                    <div style="background: var(--me-bg-secondary); padding: 20px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 32px; font-weight: 700; color: #4caf50;" id="post-con-examen">-</div>
                        <div style="font-size: 12px; color: var(--me-text-secondary);">Con Examen de Egreso</div>
                    </div>
                    <div style="background: var(--me-bg-secondary); padding: 20px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 32px; font-weight: 700; color: #ff9800;" id="post-pendientes">-</div>
                        <div style="font-size: 12px; color: var(--me-text-secondary);">Pendiente de Examen</div>
                    </div>
                    <div style="background: var(--me-bg-secondary); padding: 20px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 32px; font-weight: 700; color: #f44336;" id="post-con-secuelas">-</div>
                        <div style="font-size: 12px; color: var(--me-text-secondary);">Con Condiciones Permanentes</div>
                    </div>
                    <div style="background: var(--me-bg-secondary); padding: 20px; border-radius: 10px; text-align: center; border: 1px solid var(--me-border);">
                        <div style="font-size: 32px; font-weight: 700; color: #607d8b;" id="post-archivados">-</div>
                        <div style="font-size: 12px; color: var(--me-text-secondary);">Legajos Archivados</div>
                    </div>
                </div>

                <!-- Lista de Empleados egresados -->
                <div class="me-card">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            Empleados Egresados (Ultimos 12 meses)
                        </h3>
                        <button onclick="MedicalEngine.loadPostOcupacionalEmployees()" class="me-btn me-btn-sm me-btn-primary">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/></svg>
                            Cargar Empleados
                        </button>
                    </div>
                    <div class="me-card-body" id="post-ocupacional-employees-list">
                        <p style="text-align: center; color: var(--me-text-secondary);">
                            Haga clic en <strong>Cargar Empleados</strong> para ver empleados desvinculados y estado de su examen de egreso.
                        </p>
                    </div>
                </div>
            `;
        },

        // ═══════════════════════════════════════════════════════════════════════════
        // VISTA LEGAJOS 360 - Lista completa de empleados
        // ═══════════════════════════════════════════════════════════════════════════
        renderEmployeesView: function(container) {
            container.innerHTML = `
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #512da8 0%, #311b92 100%); padding: 30px; border-radius: 12px; margin-bottom: 24px; color: white;">
                    <div style="display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap;">
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                            </svg>
                        </div>
                        <div style="flex: 1; min-width: 300px;">
                            <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">LEGAJOS MEDICOS 360</h2>
                            <p style="margin: 0; opacity: 0.9; font-size: 15px; line-height: 1.6;">
                                Vista completa de todos los empleados con acceso a su carpeta medica integral.
                                Haga clic en cualquier empleado para abrir su legajo con los 3 capitulos ocupacionales.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Search and Filters -->
                <div class="me-search-bar" style="margin-bottom: 24px;">
                    <div class="me-search-input-wrapper" style="flex: 1;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input type="text" id="medicalSearchInput" class="me-search-input" placeholder="Buscar empleado por nombre, legajo o documento...">
                    </div>
                    <select id="medicalFilterStatus" style="padding: 12px 16px; border-radius: 8px; border: 1px solid var(--me-border); background: var(--me-bg-secondary); color: var(--me-text-primary);">
                        <option value="">Todos los estados</option>
                        <option value="apto">Aptos</option>
                        <option value="apto_con_observaciones">Apto con observaciones</option>
                        <option value="no_apto">No aptos</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="vencido">Vencido</option>
                        <option value="suspendido">Suspendido</option>
                    </select>
                    <button onclick="loadEmployeesWithMedicalRecords()" class="me-btn me-btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        Buscar
                    </button>
                </div>

                <!-- Employees Grid -->
                <div class="me-card">
                    <div class="me-card-header">
                        <h3 class="me-card-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            Directorio de Empleados
                        </h3>
                        <span id="employees-count" class="me-badge" style="background: rgba(103, 58, 183, 0.2); color: #b388ff;">0 empleados</span>
                    </div>
                    <div class="me-card-body" id="employees-medical-list">
                        <div class="me-empty-state">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            <p>Haga clic en <strong>Buscar</strong> para cargar los legajos medicos</p>
                        </div>
                    </div>
                </div>
            `;
        },

        // ═══════════════════════════════════════════════════════════════════════════
        // VISTA NOTIFICACIONES MÉDICAS - Integración con sistema central
        // ═══════════════════════════════════════════════════════════════════════════
        renderNotificationsView: function(container) {
            console.log('[MEDICAL-ENGINE] Cargando vista de Notificaciones Médicas...');

            // Limpiar container y crear estructura para inbox
            container.innerHTML = `
                <div style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 30px; border-radius: 12px; margin-bottom: 24px; color: white;">
                    <div style="display: flex; align-items: flex-start; gap: 24px; flex-wrap: wrap;">
                        <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px;">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 01-3.46 0"/>
                            </svg>
                        </div>
                        <div style="flex: 1; min-width: 300px;">
                            <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">NOTIFICACIONES MÉDICAS</h2>
                            <p style="margin: 0; opacity: 0.9; font-size: 15px; line-height: 1.6;">
                                Centro de notificaciones médicas integrado. Visualiza todos los avisos, alertas y comunicados
                                relacionados con salud ocupacional, exámenes, certificados y casos médicos.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Contenedor para el módulo Inbox -->
                <div id="medical-inbox-container" style="min-height: 400px;">
                    <div style="text-align: center; padding: 40px; color: var(--me-text-secondary);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px; opacity: 0.5;">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        <p>Cargando notificaciones médicas...</p>
                    </div>
                </div>
            `;

            // Cargar el módulo inbox con contexto médico
            setTimeout(() => {
                this.loadMedicalNotifications();
            }, 100);
        },

        // Cargar módulo inbox con filtro de contexto médico
        loadMedicalNotifications: function() {
            console.log('[MEDICAL-ENGINE] Integrando módulo Inbox con contexto médico...');

            const inboxContainer = document.getElementById('medical-inbox-container');
            if (!inboxContainer) {
                console.error('[MEDICAL-ENGINE] Container no encontrado');
                return;
            }

            // Establecer flags de contexto médico para que inbox filtre las notificaciones
            window.medicalDashboardContext = true;
            window.notificationModuleFilter = 'medical'; // Filtro por módulo médico

            // Cargar el módulo inbox usando ModuleLoader si está disponible
            if (window.ModuleLoader && typeof window.ModuleLoader.loadModule === 'function') {
                console.log('[MEDICAL-ENGINE] Cargando inbox via ModuleLoader...');

                // Preparar container para inbox
                inboxContainer.innerHTML = '<div id="inbox-module-target"></div>';

                // Cargar módulo inbox
                window.ModuleLoader.loadModule('inbox')
                    .then(() => {
                        console.log('✅ [MEDICAL-ENGINE] Módulo Inbox cargado correctamente');

                        // Si el módulo inbox tiene método init, llamarlo con opciones
                        if (window.InboxModule && typeof window.InboxModule.init === 'function') {
                            window.InboxModule.init({
                                container: '#medical-inbox-container',
                                moduleFilter: 'medical',
                                contextType: 'medical_dashboard'
                            });
                        }
                    })
                    .catch(error => {
                        console.error('[MEDICAL-ENGINE] Error cargando Inbox:', error);
                        inboxContainer.innerHTML = `
                            <div style="text-align: center; padding: 40px;">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" style="margin-bottom: 16px;">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="15" y1="9" x2="9" y2="15"/>
                                    <line x1="9" y1="9" x2="15" y2="15"/>
                                </svg>
                                <p style="color: var(--me-text-secondary);">Error al cargar el módulo de notificaciones</p>
                                <button onclick="MedicalEngine.loadMedicalNotifications()" class="me-btn me-btn-secondary" style="margin-top: 16px;">
                                    Reintentar
                                </button>
                            </div>
                        `;
                    });
            } else {
                // Fallback: mostrar mensaje indicando que se necesita el módulo inbox
                console.warn('[MEDICAL-ENGINE] ModuleLoader no disponible');
                inboxContainer.innerHTML = `
                    <div class="me-card">
                        <div class="me-card-body" style="text-align: center; padding: 40px;">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px; opacity: 0.5;">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 01-3.46 0"/>
                            </svg>
                            <h3 style="color: var(--me-text-primary); margin-bottom: 8px;">Sistema de Notificaciones</h3>
                            <p style="color: var(--me-text-secondary); max-width: 500px; margin: 0 auto 24px;">
                                Las notificaciones médicas se integran con el sistema central de notificaciones.
                                Para acceder, utilice el módulo <strong>Inbox</strong> desde el menú principal.
                            </p>
                            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                                <button onclick="MedicalEngine.showView('overview')" class="me-btn me-btn-secondary">
                                    Volver al Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        },

        // Funciones auxiliares para cargar datos de cada capitulo
        loadPreOcupacionalEmployees: async function() {
            console.log('[MEDICAL-ENGINE] Cargando empleados PRE-ocupacionales...');
            const container = document.getElementById('pre-ocupacional-employees-list');
            if (!container) return;

            // Por ahora mostrar datos de ejemplo - se integrara con API
            document.getElementById('pre-aptos-count').textContent = '12';
            document.getElementById('pre-pendientes-count').textContent = '3';
            document.getElementById('pre-restricciones-count').textContent = '2';

            // Cargar empleados reales usando la API existente
            try {
                const response = await MedicalAPI.getEmployeesWithMedicalRecords({ filter: 'preocupacional' });
                if (response.success && response.employees) {
                    const html = response.employees.slice(0, 10).map(emp => `
                        <div onclick="openMedical360Modal(${emp.user_id || emp.id})" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--me-bg-secondary); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;">
                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1e88e5, #1565c0); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">${(emp.full_name || emp.name || 'E')[0]}</div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: var(--me-text-primary);">${emp.full_name || emp.name}</div>
                                <div style="font-size: 12px; color: var(--me-text-secondary);">Legajo: ${emp.employee_id || emp.legajo || '-'} | ${emp.department || '-'}</div>
                            </div>
                            <span style="padding: 4px 10px; border-radius: 12px; font-size: 12px; background: ${emp.fitness_status === 'apto' ? '#dcfce7' : '#fef3c7'}; color: ${emp.fitness_status === 'apto' ? '#166534' : '#92400e'};">${(emp.fitness_status || 'PENDIENTE').toUpperCase()}</span>
                        </div>
                    `).join('');
                    container.innerHTML = container.innerHTML.split('</div>')[0] + '</div>' + html;
                }
            } catch (error) {
                console.log('[MEDICAL-ENGINE] Usando datos de ejemplo para PRE-ocupacional');
            }
        },

        loadOcupacionalEmployees: async function() {
            console.log('[MEDICAL-ENGINE] Cargando empleados OCUPACIONALES...');
            // Similar a loadPreOcupacionalEmployees pero con filtro ocupacional
        },

        loadPostOcupacionalEmployees: async function() {
            console.log('[MEDICAL-ENGINE] Cargando empleados POST-ocupacionales...');
            // Similar pero para empleados egresados
        }
    };
}

// Load medical statistics
function loadMedicalStatistics() {
    console.log('👩‍⚕️ [MEDICAL-DASHBOARD] Cargando estadísticas médicas...');

    // Simulate loading stats - con verificación de elementos
    setTimeout(() => {
        const el1 = document.getElementById('employeesWithRecords');
        const el2 = document.getElementById('activeCertificates');
        const el3 = document.getElementById('withStudios');
        const el4 = document.getElementById('requiresAudit');

        if (el1) el1.textContent = '18';
        if (el2) el2.textContent = '12';
        if (el3) el3.textContent = '8';
        if (el4) el4.textContent = '2';

        console.log('📊 [MEDICAL] Estadísticas cargadas (elementos existentes)');
    }, 800);
}

// Load employees with medical records - REAL API
async function loadEmployeesWithMedicalRecords() {
    console.log('👩‍⚕️ [MEDICAL-DASHBOARD] Cargando empleados con carpeta médica (API REAL)...');

    const container = document.getElementById('employees-medical-list');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 40px;">🔄 Cargando empleados desde API real...</div>';

    try {
        const dateStart = document.getElementById('medicalDateStart')?.value;
        const dateEnd = document.getElementById('medicalDateEnd')?.value;
        const searchInput = document.getElementById('medicalSearchInput')?.value;

        // Llamar API real
        const params = {};
        if (dateStart) params.dateStart = dateStart;
        if (dateEnd) params.dateEnd = dateEnd;
        if (searchInput) params.search = searchInput;

        const response = await MedicalAPI.getEmployeesWithMedicalRecords(params);

        if (response.success) {
            console.log(`✅ [MEDICAL-DASHBOARD] ${response.total} empleados cargados`);
            displayMedicalEmployees(response.employees);
        } else {
            throw new Error(response.error || 'Error en respuesta');
        }

    } catch (error) {
        console.error('❌ [MEDICAL-DASHBOARD] Error cargando empleados:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <div style="font-size: 3rem; margin-bottom: 15px;">❌</div>
                <h3>Error cargando empleados</h3>
                <p>${error.message}</p>
                <button onclick="loadEmployeesWithMedicalRecords()" class="btn btn-primary" style="margin-top: 15px;">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

// Display medical employees - FUNCIONALIDAD ORIGINAL COMPLETA - ESTILO ENTERPRISE
function displayMedicalEmployees(employees) {
    const container = document.getElementById('employees-medical-list');
    if (!container) return;

    // ✅ GUARDAR EN CACHE GLOBAL para que otras funciones puedan acceder
    cachedEmployeesFromAPI = employees || [];

    // Actualizar contador
    const countEl = document.getElementById('employees-count');
    if (countEl) countEl.textContent = `${employees?.length || 0} empleados`;

    if (!employees || employees.length === 0) {
        container.innerHTML = `
            <div class="me-empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <h4>Sin empleados con carpeta médica</h4>
                <p>No se encontraron empleados con registros médicos en el rango seleccionado</p>
            </div>
        `;
        return;
    }

    // Función auxiliar para obtener clase de estado
    function getStatusClass(emp) {
        if (emp.requiresAudit) return 'me-status-alert';
        if (emp.certificates?.expiringSoon > 0) return 'me-status-leave';
        return 'me-status-active';
    }

    function getStatusText(emp) {
        if (emp.requiresAudit) return 'Auditoría';
        if (emp.certificates?.expiringSoon > 0) return 'Alerta';
        return 'Activo';
    }

    function getInitials(name) {
        return (name || 'NN').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    container.innerHTML = employees.map(emp => `
        <div class="me-employee-card" onclick="openMedicalEmployee360('${emp.id || emp.user_id}')">
            <div class="me-employee-avatar">${getInitials(emp.name)}</div>
            <div class="me-employee-info">
                <div class="me-employee-name">${emp.name || 'Sin nombre'}</div>
                <div class="me-employee-meta">
                    Legajo: ${emp.legajo || 'N/A'} • ${emp.department || 'Sin depto.'} •
                    <span style="color: var(--me-accent-teal);">${emp.certificates?.active || 0} cert.</span> •
                    <span style="color: var(--me-accent-purple);">${emp.cases?.completed || 0} casos</span>
                </div>
            </div>
            <span class="me-employee-status ${getStatusClass(emp)}">${getStatusText(emp)}</span>
        </div>
    `).join('');

    console.log(`✅ [MEDICAL] ${employees.length} empleados cargados con estilo enterprise`);
}

// Función para abrir documentos por tipo (MODAL DIRECTO SIN TABS)
function openEmployeeDocuments(employeeId, documentType) {
    console.log(`📁 [MEDICAL-DASHBOARD] Abriendo documentos tipo ${documentType} para empleado ${employeeId}`);
    
    const employee = findEmployeeById(employeeId);
    
    // Mapear tipos de documento
    const typeMapping = {
        'certificates': 'certificates',
        'studies': 'studies', 
        'photos': 'photos',
        'recipes': 'prescriptions'
    };
    
    const mappedType = typeMapping[documentType] || documentType;
    
    // Datos del tipo de documento
    const typeData = {
        certificates: { icon: '🏥', title: 'Certificados Médicos', action: 'requestEmployeeCertificate' },
        studies: { icon: '🩺', title: 'Estudios Médicos', action: 'requestEmployeeStudy' },
        photos: { icon: '📷', title: 'Fotos Médicas', action: 'requestEmployeePhoto' },
        prescriptions: { icon: '💊', title: 'Recetas Médicas', action: 'requestEmployeePrescription' }
    };
    
    const data = typeData[mappedType];
    
    // Crear modal directo SIN tabs duplicados
    const modalContent = `
        <div class="modal employee-direct-modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 0; border-radius: 10px; max-width: 95%; max-height: 90vh; overflow: hidden;">
                <div style="padding: 20px; border-bottom: 2px solid #e9ecef; background: linear-gradient(135deg, #FFB88C 0%, #FFDAB9 100%); color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; color: white;">${data.icon} ${data.title} - ${employee.name}</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Legajo: ${employee.legajo || `EMP00${employeeId}`} • ${employee.department || 'Sin especificar'}</p>
                        </div>
                        <button onclick="closeDirectModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 30px; max-height: 70vh; overflow-y: auto;">
                    <!-- Panel izquierdo: SOLO documentos del tipo seleccionado -->
                    <div class="documents-panel">
                        <h3 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                            ${data.icon} ${data.title}
                        </h3>
                        
                        <div id="direct-document-content-${employeeId}" class="document-type-content">
                            <div style="text-align: center; padding: 40px; color: #6c757d;">
                                <div style="font-size: 3rem; margin-bottom: 15px;">${data.icon}</div>
                                <p>Cargando ${data.title.toLowerCase()}...</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Panel derecho: SOLO conversaciones del tipo -->
                    <div class="requests-panel">
                        <h3 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                            💬 ${data.title} - Actividad
                        </h3>
                        
                        <!-- Solicitudes pendientes filtradas -->
                        <div class="pending-requests-section" style="margin-bottom: 30px;">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⏳ Solicitudes Pendientes</h4>
                            <div id="direct-pending-requests-${employeeId}">
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                                    <p style="margin: 0; color: #6c757d;">Cargando...</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Timeline filtrado -->
                        <div class="activity-timeline-section">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⏱️ Historial de ${data.title}</h4>
                            <div id="direct-activity-timeline-${employeeId}">
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                                    <p style="margin: 0; color: #6c757d;">Cargando...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Cargar solo el contenido del tipo específico
    setTimeout(() => {
        loadDirectDocumentContent(mappedType, employeeId);
        loadDirectPendingRequests(employeeId, mappedType);
        loadDirectActivityTimeline(employeeId, mappedType);
    }, 300);
    
    showMedicalMessage(`📁 Abriendo ${data.title.toLowerCase()} de ${employee.name}`, 'info');
}

// Funciones avanzadas de solicitudes médicas
async function requestEmployeePhoto(employeeId) {
    const employee = findEmployeeById(employeeId);
    
    const modalContent = `
        <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 30px; border-radius: 10px; max-width: 500px; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">📷 Solicitar Foto Médica</h2>
                    <button onclick="closePhotoModal()" style="background: none; border: none; font-size: 24px; color: #6c757d; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                </div>
                <p><strong>Empleado:</strong> ${employee.name}</p>
                
                <form id="photoRequestForm">
                    <div class="form-group">
                        <label><strong>Parte del cuerpo a fotografiar:</strong></label>
                        <select id="bodyPart" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" required>
                            <option value="">Seleccionar...</option>
                            <option value="mano_derecha">Mano derecha</option>
                            <option value="mano_izquierda">Mano izquierda</option>
                            <option value="pie_derecho">Pie derecho</option>
                            <option value="pie_izquierdo">Pie izquierdo</option>
                            <option value="brazo_derecho">Brazo derecho</option>
                            <option value="brazo_izquierdo">Brazo izquierdo</option>
                            <option value="pierna_derecha">Pierna derecha</option>
                            <option value="pierna_izquierda">Pierna izquierda</option>
                            <option value="rostro">Rostro</option>
                            <option value="torso">Torso</option>
                            <option value="espalda">Espalda</option>
                            <option value="otro">Otro (especificar en observaciones)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Observaciones médicas:</strong></label>
                        <textarea id="photoObservations" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Detalles específicos de qué fotografiar y por qué..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Prioridad:</strong></label>
                        <select id="photoPriority" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" onclick="closePhotoModal()" class="btn btn-secondary" style="flex: 1;">❌ Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1;">📧 Enviar Solicitud</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    document.getElementById('photoRequestForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const bodyPart = document.getElementById('bodyPart').value;
        const observations = document.getElementById('photoObservations').value;
        const priority = document.getElementById('photoPriority').value;
        
        if (!bodyPart) {
            showMedicalMessage('❌ Debe seleccionar la parte del cuerpo', 'error');
            return;
        }
        
        try {
            // Simular envío de solicitud
            showMedicalMessage(`📧 Enviando solicitud de foto a ${employee.name}...`, 'info');
            
            // Simular delay de envío
            setTimeout(() => {
                const requestId = 'PHOTO-REQ-' + Date.now();
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().split(' ')[0].substring(0,5);
                
                // Agregar el documento a los datos mock
                if (!mockMedicalDocuments[employeeId]) {
                    mockMedicalDocuments[employeeId] = { certificates: [], studies: [], photos: [], prescriptions: [] };
                }
                
                const newPhoto = {
                    id: requestId,
                    title: `Solicitud Foto - ${bodyPart.replace('_', ' ')}`,
                    type: 'solicitud_foto',
                    direction: 'empleado_to_medico',
                    from: employee.name,
                    to: 'Personal Médico',
                    date: dateStr,
                    time: timeStr,
                    status: 'pendiente',
                    content: `Solicitud de fotografía médica de ${bodyPart.replace('_', ' ')}. ${observations || 'Sin observaciones adicionales'}`,
                    attachments: []
                };
                
                mockMedicalDocuments[employeeId].photos.push(newPhoto);
                
                // Agregar también a conversaciones
                if (!mockConversations[employeeId]) {
                    mockConversations[employeeId] = [];
                }
                
                const newConversation = {
                    id: 'CONV-' + Date.now(),
                    timestamp: `${dateStr} ${timeStr}`,
                    type: 'solicitud',
                    from: employee.name,
                    to: 'Personal Médico',
                    subject: `📷 Solicitud Foto Médica - ${bodyPart.replace('_', ' ')}`,
                    message: `Solicito fotografía médica de ${bodyPart.replace('_', ' ')}. ${observations || 'Sin observaciones adicionales'} Prioridad: ${priority}`,
                    attachments: [],
                    status: 'pendiente'
                };
                
                mockConversations[employeeId].push(newConversation);
                
                showMedicalMessage(`✅ Solicitud de foto enviada a ${employee.name} (ID: ${requestId})`, 'success');
                closePhotoModal();
                
                // Actualizar modal si está abierto
                if (document.getElementById(`document-type-content-${employeeId}`)) {
                    setTimeout(() => {
                        loadDocumentsByType('photos', employeeId);
                        loadPendingRequestsForEmployee(employeeId);
                        loadActivityTimelineForEmployee(employeeId);
                    }, 500);
                }
            }, 1000);
            
        } catch (error) {
            closePhotoModal();
            showMedicalMessage('❌ Error al enviar solicitud: ' + error.message, 'error');
        }
    };
}

function closePhotoModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

async function requestEmployeeStudy(employeeId) {
    const employee = findEmployeeById(employeeId);
    
    const modalContent = `
        <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 30px; border-radius: 10px; max-width: 600px; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">🩺 Solicitar Estudio Médico</h2>
                    <button onclick="closeStudyModal()" style="background: none; border: none; font-size: 24px; color: #6c757d; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                </div>
                <p><strong>Empleado:</strong> ${employee.name}</p>
                
                <form id="studyRequestForm">
                    <div class="form-group">
                        <label><strong>Tipo de estudio:</strong></label>
                        <select id="studyType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" required>
                            <option value="">Seleccionar...</option>
                            <option value="radiografia">Radiografía</option>
                            <option value="resonancia">Resonancia Magnética</option>
                            <option value="tomografia">Tomografía</option>
                            <option value="ecografia">Ecografía</option>
                            <option value="analisis_sangre">Análisis de Sangre</option>
                            <option value="analisis_orina">Análisis de Orina</option>
                            <option value="electrocardiograma">Electrocardiograma</option>
                            <option value="espirometria">Espirometría</option>
                            <option value="audiometria">Audiometría</option>
                            <option value="oftalmologia">Examen Oftalmológico</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Área anatómica:</strong></label>
                        <input type="text" id="studyArea" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Ej: Rodilla derecha, Columna lumbar, etc.">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Motivo del estudio:</strong></label>
                        <textarea id="studyReason" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Razón médica para solicitar el estudio..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Prioridad:</strong></label>
                        <select id="studyPriority" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" onclick="closeStudyModal()" class="btn btn-secondary" style="flex: 1;">❌ Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1;">📧 Enviar Solicitud</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    document.getElementById('studyRequestForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const studyType = document.getElementById('studyType').value;
        const studyArea = document.getElementById('studyArea').value;
        const reason = document.getElementById('studyReason').value;
        const priority = document.getElementById('studyPriority').value;
        
        if (!studyType || !reason) {
            showMedicalMessage('❌ Debe completar los campos obligatorios', 'error');
            return;
        }
        
        try {
            showMedicalMessage(`🩺 Enviando solicitud de estudio a ${employee.name}...`, 'info');
            
            setTimeout(() => {
                const requestId = 'study-' + Date.now();
                showMedicalMessage(`✅ Solicitud de ${studyType} enviada a ${employee.name} (ID: ${requestId})`, 'success');
                closeStudyModal();
                setTimeout(() => loadEmployeesWithMedicalRecords(), 1500);
            }, 2000);
            
        } catch (error) {
            closeStudyModal();
            showMedicalMessage('❌ Error al enviar solicitud: ' + error.message, 'error');
        }
    };
}

function closeStudyModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

async function requestEmployeeCertificate(employeeId) {
    const employee = findEmployeeById(employeeId);
    
    const modalContent = `
        <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 30px; border-radius: 10px; max-width: 600px; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">📄 Solicitar Certificado Médico</h2>
                    <button onclick="closeCertificateModal()" style="background: none; border: none; font-size: 24px; color: #6c757d; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                </div>
                <p><strong>Empleado:</strong> ${employee.name}</p>
                
                <form id="certificateRequestForm">
                    <div class="form-group">
                        <label><strong>Tipo de certificado:</strong></label>
                        <select id="certificateType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" required>
                            <option value="">Seleccionar...</option>
                            <option value="aptitud_fisica">Certificado de Aptitud Física</option>
                            <option value="reposo_medico">Certificado de Reposo Médico</option>
                            <option value="enfermedad">Certificado de Enfermedad</option>
                            <option value="accidente_trabajo">Certificado por Accidente de Trabajo</option>
                            <option value="control_medico">Certificado de Control Médico</option>
                            <option value="discapacidad">Certificado de Discapacidad</option>
                            <option value="vacunacion">Certificado de Vacunación</option>
                            <option value="salud_mental">Certificado de Salud Mental</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Días de reposo (si aplica):</strong></label>
                        <input type="number" id="certificateDays" min="1" max="365" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Número de días">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Diagnóstico o motivo:</strong></label>
                        <textarea id="certificateReason" rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Diagnóstico médico o motivo del certificado..." required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Observaciones adicionales:</strong></label>
                        <textarea id="certificateNotes" rows="2" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Restricciones, indicaciones especiales, etc."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Prioridad:</strong></label>
                        <select id="certificatePriority" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="button" onclick="closeCertificateModal()" class="btn btn-secondary" style="flex: 1;">❌ Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1;">📧 Enviar Solicitud</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    document.getElementById('certificateRequestForm').onsubmit = async (e) => {
        e.preventDefault();
        
        const certificateType = document.getElementById('certificateType').value;
        const days = document.getElementById('certificateDays').value;
        const reason = document.getElementById('certificateReason').value;
        const notes = document.getElementById('certificateNotes').value;
        const priority = document.getElementById('certificatePriority').value;
        
        if (!certificateType || !reason) {
            showMedicalMessage('❌ Debe completar los campos obligatorios', 'error');
            return;
        }
        
        try {
            showMedicalMessage(`📄 Enviando solicitud de certificado a ${employee.name}...`, 'info');
            
            setTimeout(() => {
                const requestId = 'CERT-REQ-' + Date.now();
                const typeText = certificateType.replace('_', ' ').toLowerCase();
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().split(' ')[0].substring(0,5);
                
                // Agregar el documento a los datos mock
                if (!mockMedicalDocuments[employeeId]) {
                    mockMedicalDocuments[employeeId] = { certificates: [], studies: [], photos: [], prescriptions: [] };
                }
                
                const newCertificate = {
                    id: requestId,
                    title: `Solicitud ${certificateType.replace('_', ' ')}`,
                    type: certificateType,
                    direction: 'empleado_to_medico',
                    from: employee.name,
                    to: 'Medicina Laboral',
                    date: dateStr,
                    time: timeStr,
                    status: 'pendiente',
                    content: `Solicitud de ${typeText}. ${reason}${days ? ` (${days} días)` : ''}${notes ? ` Observaciones: ${notes}` : ''}`,
                    attachments: []
                };
                
                mockMedicalDocuments[employeeId].certificates.push(newCertificate);
                
                // Agregar también a conversaciones
                if (!mockConversations[employeeId]) {
                    mockConversations[employeeId] = [];
                }
                
                const newConversation = {
                    id: 'CONV-' + Date.now(),
                    timestamp: `${dateStr} ${timeStr}`,
                    type: 'solicitud',
                    from: employee.name,
                    to: 'Medicina Laboral',
                    subject: `📄 Solicitud ${certificateType.replace('_', ' ')}`,
                    message: `${reason}${days ? ` Días solicitados: ${days}` : ''}${notes ? ` Observaciones: ${notes}` : ''}`,
                    attachments: [],
                    status: 'pendiente'
                };
                
                mockConversations[employeeId].push(newConversation);
                
                showMedicalMessage(`✅ Solicitud de ${typeText} enviada a ${employee.name} (ID: ${requestId})`, 'success');
                closeCertificateModal();
                
                // Actualizar modal si está abierto
                if (document.getElementById(`document-type-content-${employeeId}`)) {
                    setTimeout(() => {
                        loadDocumentsByType('certificates', employeeId);
                        loadPendingRequestsForEmployee(employeeId);
                        loadActivityTimelineForEmployee(employeeId);
                    }, 500);
                }
            }, 1000);
            
        } catch (error) {
            closeCertificateModal();
            showMedicalMessage('❌ Error al enviar solicitud: ' + error.message, 'error');
        }
    };
}

function closeCertificateModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

function viewFullEmployeeDetails(employeeId) {
    console.log(`👁️ [MEDICAL-DASHBOARD] Viendo detalles completos del empleado ${employeeId}`);
    
    const employee = findEmployeeById(employeeId);
    
    const modalContent = `
        <div class="modal employee-documents-modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 0; border-radius: 10px; max-width: 95%; max-height: 90vh; overflow: hidden;">
                <div style="padding: 20px; border-bottom: 2px solid #e9ecef; background: linear-gradient(135deg, #FFB88C 0%, #FFDAB9 100%); color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; color: white;">👤 ${employee.name}</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">Legajo: ${employee.legajo} • ${employee.department}</p>
                        </div>
                        <button onclick="closeEmployeeDetailsModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 30px; max-height: 70vh; overflow-y: auto;">
                    <!-- Panel izquierdo: Documentos y archivos -->
                    <div class="documents-panel">
                        <h3 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                            📁 Documentos Médicos
                            <small style="margin-left: auto; color: #6c757d; font-weight: normal;">Archivos disponibles</small>
                        </h3>
                        
                        <!-- Tipos de documentos con navegación por tabs -->
                        <div class="document-tabs" style="display: flex; border-bottom: 1px solid #dee2e6; margin-bottom: 20px;">
                            <button onclick="showDocumentType('certificates', ${employeeId})" class="doc-tab active" data-type="certificates" style="padding: 10px 15px; border: none; background: #f8f9fa; color: #495057; cursor: pointer; font-size: 0.9rem; border-radius: 5px 5px 0 0; margin-right: 2px;">🏥 Certificados</button>
                            <button onclick="showDocumentType('studies', ${employeeId})" class="doc-tab" data-type="studies" style="padding: 10px 15px; border: none; background: transparent; color: #6c757d; cursor: pointer; font-size: 0.9rem;">🩺 Estudios</button>
                            <button onclick="showDocumentType('photos', ${employeeId})" class="doc-tab" data-type="photos" style="padding: 10px 15px; border: none; background: transparent; color: #6c757d; cursor: pointer; font-size: 0.9rem;">📷 Fotos</button>
                            <button onclick="showDocumentType('prescriptions', ${employeeId})" class="doc-tab" data-type="prescriptions" style="padding: 10px 15px; border: none; background: transparent; color: #6c757d; cursor: pointer; font-size: 0.9rem;">💊 Recetas</button>
                        </div>
                        
                        <!-- Contenido de documentos -->
                        <div id="document-type-content-${employeeId}" class="document-type-content">
                            <div style="text-align: center; padding: 40px; color: #6c757d;">
                                <div style="font-size: 3rem; margin-bottom: 15px;">🏥</div>
                                <h4>Certificados Médicos</h4>
                                <p>Cargando certificados médicos disponibles...</p>
                                <div style="margin-top: 20px;">
                                    <button onclick="requestEmployeeCertificate(${employeeId})" class="btn btn-primary btn-sm">📄 Solicitar Nuevo Certificado</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Panel derecho: Solicitudes pendientes y timeline -->
                    <div class="requests-panel">
                        <h3 style="color: #495057; display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                            📋 Solicitudes y Actividad
                            <small style="margin-left: auto; color: #6c757d; font-weight: normal;">Estado actual</small>
                        </h3>
                        
                        <!-- Solicitudes pendientes -->
                        <div class="pending-requests-section" style="margin-bottom: 30px;">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⏳ Solicitudes Pendientes</h4>
                            <div id="pending-requests-${employeeId}" class="pending-requests-list">
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 10px;">📋</div>
                                    <p style="margin: 0; color: #6c757d;">Cargando solicitudes pendientes...</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Timeline de actividad -->
                        <div class="activity-timeline-section">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⏱️ Timeline de Actividad</h4>
                            <div id="activity-timeline-${employeeId}" class="activity-timeline">
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; margin-bottom: 10px;">⏰</div>
                                    <p style="margin: 0; color: #6c757d;">Cargando historial de actividad...</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Acciones rápidas -->
                        <div class="quick-actions-section" style="margin-top: 30px;">
                            <h4 style="color: #495057; font-size: 1.1rem; margin-bottom: 15px;">⚡ Acciones Rápidas</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <button onclick="requestEmployeePhoto(${employeeId})" class="btn btn-warning btn-sm">📷 Solicitar Foto</button>
                                <button onclick="requestEmployeeStudy(${employeeId})" class="btn btn-info btn-sm">🩺 Solicitar Estudio</button>
                                <button onclick="requestEmployeeCertificate(${employeeId})" class="btn btn-success btn-sm">📄 Solicitar Certificado</button>
                                <button onclick="sendInstructions(${employeeId})" class="btn btn-secondary btn-sm">📝 Enviar Instrucciones</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Cargar contenido dinámico
    setTimeout(() => {
        loadPendingRequestsForEmployee(employeeId);
        loadActivityTimelineForEmployee(employeeId);
        loadDocumentsByType('certificates', employeeId);
    }, 300);
    
    showMedicalMessage(`👁️ Mostrando detalles completos de ${employee.name}`, 'info');
}

// Funciones auxiliares para el modal de detalles completos
function closeEmployeeDetailsModal() {
    const modal = document.querySelector('.employee-documents-modal');
    if (modal) modal.remove();
}

function showDocumentType(type, employeeId) {
    // Actualizar tabs activos
    document.querySelectorAll('.doc-tab').forEach(tab => {
        tab.style.background = 'transparent';
        tab.style.color = '#6c757d';
    });
    document.querySelector(`[data-type="${type}"]`).style.background = '#f8f9fa';
    document.querySelector(`[data-type="${type}"]`).style.color = '#495057';
    
    // Cargar contenido del tipo seleccionado
    loadDocumentsByType(type, employeeId);
    
    // NUEVO: También actualizar el panel derecho con datos relacionados al tipo seleccionado
    setTimeout(() => {
        loadPendingRequestsForEmployee(employeeId, type);
        loadActivityTimelineForEmployee(employeeId, type);
    }, 100);
}

function loadDocumentsByType(type, employeeId) {
    const container = document.getElementById(`document-type-content-${employeeId}`);
    const employee = findEmployeeById(employeeId);
    
    const typeData = {
        certificates: { icon: '🏥', title: 'Certificados Médicos', action: 'requestEmployeeCertificate' },
        studies: { icon: '🩺', title: 'Estudios Médicos', action: 'requestEmployeeStudy' },
        photos: { icon: '📷', title: 'Fotos Médicas', action: 'requestEmployeePhoto' },
        prescriptions: { icon: '💊', title: 'Recetas Médicas', action: 'requestEmployeePrescription' }
    };
    
    const data = typeData[type];
    
    // Obtener documentos del empleado por tipo
    const employeeDocuments = getEmployeeDocuments(employeeId);
    const documents = employeeDocuments[type] || [];
    
    if (documents.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 3rem; margin-bottom: 15px;">${data.icon}</div>
                <h4>${data.title}</h4>
                <p>No hay documentos de este tipo para ${employee.name}</p>
                <div style="margin-top: 20px;">
                    <button onclick="${data.action}(${employeeId})" class="btn btn-primary btn-sm">➕ Solicitar Nuevo</button>
                </div>
            </div>
        `;
        return;
    }
    
    // Mostrar documentos existentes (bidireccionales empleado ↔ médico)
    const documentsHtml = documents.map(doc => {
        const directionIcon = doc.direction === 'empleado_to_medico' ? '📤' : '📥';
        const directionText = doc.direction === 'empleado_to_medico' ? 'Enviado a' : 'Recibido de';
        const directionColor = doc.direction === 'empleado_to_medico' ? '#17a2b8' : '#28a745';
        const statusColor = doc.status === 'entregado' ? '#28a745' : 
                           doc.status === 'pendiente' ? '#ffc107' : 
                           doc.status === 'revisado' ? '#17a2b8' : 
                           doc.status === 'vigente' ? '#28a745' : 
                           doc.status === 'completado' ? '#6f42c1' : '#6c757d';
        
        const attachmentsHtml = doc.attachments.length > 0 ? 
            `<div style="margin-top: 10px;">
                ${doc.attachments.map(att => 
                    `<span onclick="openFileViewer('${att}', '${doc.id}')" style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 5px; display: inline-block; margin-bottom: 3px; cursor: pointer; transition: all 0.3s ease;" title="Clic para abrir archivo" onmouseover="this.style.background='#007bff'; this.style.color='white'" onmouseout="this.style.background='#e9ecef'; this.style.color='inherit'">
                        📎 ${att}
                    </span>`
                ).join('')}
            </div>` : '';
        
        return `
            <div style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 1.2rem;">${directionIcon}</span>
                            <strong style="color: #2c3e50; font-size: 1rem;">${doc.title}</strong>
                        </div>
                        <p style="margin: 8px 0; font-size: 0.9rem;">
                            <span style="color: ${directionColor}; font-weight: 600;">${directionText}:</span> 
                            <span style="color: #495057;">${doc.direction === 'empleado_to_medico' ? doc.to : doc.from}</span>
                        </p>
                        <p style="margin: 8px 0; color: #6c757d; font-size: 0.85rem;">
                            📅 ${doc.date} • ⏰ ${doc.time}
                        </p>
                        <p style="margin: 10px 0; color: #495057; line-height: 1.4; background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 0.9rem;">
                            ${doc.content}
                        </p>
                        ${attachmentsHtml}
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: uppercase; font-weight: bold; display: inline-block;">
                            ${doc.status}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h4 style="margin: 0; color: #495057;">${data.icon} ${data.title}</h4>
                <button onclick="${data.action}(${employeeId})" class="btn btn-primary btn-sm">+ Nuevo</button>
            </div>
            <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                ${documentsHtml}
            </div>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 15px; text-align: center; font-size: 0.85rem; color: #6c757d;">
                📊 Total: ${documents.length} documento${documents.length !== 1 ? 's' : ''} • 
                📤 Enviados: ${documents.filter(d => d.direction === 'empleado_to_medico').length} • 
                📥 Recibidos: ${documents.filter(d => d.direction === 'medico_to_empleado').length}
            </div>
        </div>
    `;
}

function loadPendingRequestsForEmployee(employeeId, filterType = null) {
    const container = document.getElementById(`pending-requests-${employeeId}`);
    const employee = findEmployeeById(employeeId);
    
    // Obtener conversaciones pendientes del empleado
    const conversations = getEmployeeConversations(employeeId);
    let pendingRequests = conversations.filter(conv => conv.status === 'pendiente' || conv.status === 'enviado');
    
    // Filtrar por tipo si se especifica
    if (filterType) {
        const typeMap = {
            'certificates': ['solicitud', 'certificado'],
            'studies': ['resultado', 'estudio'],
            'photos': ['foto', 'imagen'],
            'prescriptions': ['receta', 'medicamento']
        };
        
        const relevantTypes = typeMap[filterType] || [];
        pendingRequests = pendingRequests.filter(conv => 
            relevantTypes.some(type => 
                conv.subject.toLowerCase().includes(type) || 
                conv.type.toLowerCase().includes(type) ||
                conv.message.toLowerCase().includes(type)
            )
        );
    }
    
    if (pendingRequests.length === 0) {
        container.innerHTML = `
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #c3e6cb;">
                <div style="font-size: 1.5rem; margin-bottom: 10px; color: #155724;">✅</div>
                <p style="margin: 0; color: #155724;"><strong>Sin solicitudes pendientes</strong></p>
                <small style="color: #155724;">Todas las consultas han sido respondidas</small>
            </div>
        `;
        return;
    }
    
    const requestsHtml = pendingRequests.map(req => {
        const typeIcon = req.type === 'solicitud' ? '📤' : 
                        req.type === 'consulta' ? '💬' : '📋';
        const statusColor = req.status === 'pendiente' ? '#ffc107' : '#fd7e14';
        const daysDiff = Math.floor((new Date() - new Date(req.timestamp)) / (1000 * 60 * 60 * 24));
        
        return `
            <div style="background: white; border: 1px solid ${statusColor}; border-left: 4px solid ${statusColor}; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 1rem;">${typeIcon}</span>
                            <strong style="color: #495057; font-size: 0.9rem;">${req.subject}</strong>
                        </div>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #6c757d;">
                            <strong>Para:</strong> ${req.to}
                        </p>
                        <p style="margin: 8px 0; font-size: 0.8rem; color: #495057; line-height: 1.3;">
                            ${req.message.substring(0, 80)}${req.message.length > 80 ? '...' : ''}
                        </p>
                        <small style="color: #6c757d; font-size: 0.75rem;">
                            📅 ${req.timestamp} • Hace ${daysDiff} día${daysDiff !== 1 ? 's' : ''}
                        </small>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">
                            ${req.status}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div style="max-height: 280px; overflow-y: auto;">
            ${requestsHtml}
        </div>
        <div style="background: #fff3cd; padding: 8px; border-radius: 5px; margin-top: 10px; text-align: center; font-size: 0.8rem; color: #856404;">
            ⏳ ${pendingRequests.length} solicitud${pendingRequests.length !== 1 ? 'es' : ''} esperando respuesta
        </div>
    `;
}

function loadActivityTimelineForEmployee(employeeId, filterType = null) {
    const container = document.getElementById(`activity-timeline-${employeeId}`);
    const employee = findEmployeeById(employeeId);
    
    // Obtener conversaciones del empleado ordenadas cronológicamente
    const conversations = getEmployeeConversations(employeeId);
    let filteredConversations = conversations;
    
    // Filtrar por tipo si se especifica
    if (filterType) {
        const typeMap = {
            'certificates': ['solicitud', 'certificado'],
            'studies': ['resultado', 'estudio'], 
            'photos': ['foto', 'imagen'],
            'prescriptions': ['receta', 'medicamento']
        };
        
        const relevantTypes = typeMap[filterType] || [];
        filteredConversations = conversations.filter(conv => 
            relevantTypes.some(type => 
                conv.subject.toLowerCase().includes(type) || 
                conv.type.toLowerCase().includes(type) ||
                conv.message.toLowerCase().includes(type)
            )
        );
    }
    
    const sortedConversations = filteredConversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (sortedConversations.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 2rem; margin-bottom: 15px;">📭</div>
                <p style="margin: 0;">No hay actividad registrada</p>
                <small style="color: #6c757d;">Las conversaciones aparecerán aquí</small>
            </div>
        `;
        return;
    }
    
    const timelineHtml = sortedConversations.map((conv, index) => {
        const typeConfig = {
            'solicitud': { icon: '📤', color: '#17a2b8', bgColor: '#e3f2fd' },
            'respuesta': { icon: '📥', color: '#28a745', bgColor: '#e8f5e8' },
            'consulta': { icon: '💬', color: '#6f42c1', bgColor: '#f3e5f5' },
            'resultado': { icon: '📊', color: '#fd7e14', bgColor: '#fff3e0' },
            'certificado': { icon: '🏥', color: '#dc3545', bgColor: '#f8d7da' }
        };
        
        const config = typeConfig[conv.type] || { icon: '📝', color: '#6c757d', bgColor: '#f8f9fa' };
        const isFromEmployee = conv.from.includes(employee.name);
        const directionText = isFromEmployee ? 'Enviado a' : 'Recibido de';
        const participantName = isFromEmployee ? conv.to : conv.from;
        
        // Status indicator
        const statusConfig = {
            'pendiente': { color: '#ffc107', text: 'Pendiente' },
            'enviado': { color: '#fd7e14', text: 'Enviado' },
            'leido': { color: '#28a745', text: 'Leído' },
            'respondido': { color: '#17a2b8', text: 'Respondido' },
            'entregado': { color: '#6f42c1', text: 'Entregado' }
        };
        
        const status = statusConfig[conv.status] || { color: '#6c757d', text: conv.status };
        
        // Attachments
        const attachmentsHtml = conv.attachments && conv.attachments.length > 0 ? 
            `<div style="margin-top: 8px; display: flex; gap: 5px; flex-wrap: wrap;">
                ${conv.attachments.map(att => 
                    `<span style="background: ${config.bgColor}; color: ${config.color}; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; border: 1px solid ${config.color}20;">
                        📎 ${att}
                    </span>`
                ).join('')}
            </div>` : '';
        
        return `
            <div style="display: flex; gap: 15px; margin-bottom: 20px; position: relative;">
                <!-- Timeline line -->
                ${index < sortedConversations.length - 1 ? 
                    '<div style="position: absolute; left: 8px; top: 20px; bottom: -20px; width: 2px; background: #e9ecef; z-index: 1;"></div>' : ''}
                
                <!-- Timeline dot -->
                <div style="width: 16px; height: 16px; border-radius: 50%; background: ${config.color}; margin-top: 4px; flex-shrink: 0; z-index: 2; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative;">
                    <div style="position: absolute; top: -1px; left: -1px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem;">
                        ${config.icon}
                    </div>
                </div>
                
                <!-- Content -->
                <div style="flex: 1; background: white; border: 1px solid #e9ecef; border-radius: 10px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #2c3e50; font-size: 0.9rem; margin-bottom: 4px;">
                                ${conv.subject}
                            </div>
                            <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 8px;">
                                <span style="color: ${config.color};">${directionText}:</span> ${participantName}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="background: ${status.color}; color: white; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: bold;">
                                ${status.text}
                            </span>
                        </div>
                    </div>
                    
                    <div style="color: #495057; font-size: 0.85rem; line-height: 1.4; margin-bottom: 8px;">
                        ${conv.message}
                    </div>
                    
                    ${attachmentsHtml}
                    
                    <div style="margin-top: 10px; font-size: 0.75rem; color: #6c757d; text-align: right;">
                        📅 ${conv.timestamp}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
            <div style="background: linear-gradient(135deg, #FFB88C 0%, #FFDAB9 100%); color: white; padding: 10px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <strong>💬 Conversaciones con Personal Médico</strong>
                <br><small style="opacity: 0.9;">Historial cronológico de intercambios</small>
            </div>
            ${timelineHtml}
        </div>
    `;
}

function sendInstructions(employeeId) {
    const employee = findEmployeeById(employeeId);
    showMedicalMessage(`📝 Enviando instrucciones médicas a ${employee.name}...`, 'info');
    
    setTimeout(() => {
        showMedicalMessage(`✅ Instrucciones enviadas a ${employee.name}`, 'success');
    }, 2000);
}

// Quick actions functions
function showAllEmployeesPhotoRequests() {
    console.log('📷 [MEDICAL-DASHBOARD] Mostrando fotos solicitadas...');
    showMedicalMessage('📷 Función ver fotos en desarrollo', 'info');
}

function showAllEmployeesStudies() {
    console.log('🩺 [MEDICAL-DASHBOARD] Mostrando estudios...');
    showMedicalMessage('🩺 Función ver estudios en desarrollo', 'info');
}

function showPendingAudits() {
    console.log('⚡ [MEDICAL-DASHBOARD] Mostrando auditorías pendientes...');
    showMedicalMessage('⚡ Función auditorías pendientes en desarrollo', 'info');
}

function generateGlobalMedicalReport() {
    console.log('📊 [MEDICAL-DASHBOARD] Generando reporte...');
    showMedicalMessage('📊 Generando reporte general...', 'info');
    
    setTimeout(() => {
        showMedicalMessage('✅ Reporte generado (función en desarrollo)', 'success');
    }, 2000);
}

// Employee actions
function viewEmployeeMedicalDetails(employeeId) {
    console.log('👁️ [MEDICAL-DASHBOARD] Viendo detalles:', employeeId);
    showMedicalMessage('👁️ Función ver detalles en desarrollo', 'info');
}

function editEmployeeMedical(employeeId) {
    console.log('✏️ [MEDICAL-DASHBOARD] Editando empleado:', employeeId);
    showMedicalMessage('✏️ Función editar en desarrollo', 'info');
}

function viewMedicalHistory(employeeId) {
    console.log('📋 [MEDICAL-DASHBOARD] Viendo historial:', employeeId);
    showMedicalMessage('📋 Función historial en desarrollo', 'info');
}

function addMedicalRecord(employeeId) {
    console.log('➕ [MEDICAL-DASHBOARD] Agregando registro:', employeeId);
    showMedicalMessage('➕ Función agregar registro en desarrollo', 'info');
}

// Utility functions
function showMedicalMessage(message, type) {
    let messageElement = document.getElementById('medicalDashboardMessage');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'medicalDashboardMessage';
        messageElement.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    switch (type) {
        case 'success': messageElement.style.backgroundColor = '#4CAF50'; break;
        case 'error': messageElement.style.backgroundColor = '#f44336'; break;
        case 'warning': messageElement.style.backgroundColor = '#ff9800'; break;
        case 'info': messageElement.style.backgroundColor = '#2196F3'; break;
        default: messageElement.style.backgroundColor = '#666';
    }
    
    setTimeout(() => {
        if (messageElement && messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

// Función para abrir visor de archivos
function openFileViewer(fileName, documentId) {
    console.log(`📁 [MEDICAL-DASHBOARD] Abriendo archivo: ${fileName} del documento ${documentId}`);
    
    // Determinar tipo de archivo por extensión
    const fileExt = fileName.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt);
    const isPDF = fileExt === 'pdf';
    const isDoc = ['doc', 'docx'].includes(fileExt);
    
    let contentHtml = '';
    let title = `📄 ${fileName}`;
    
    if (isImage) {
        title = `📷 ${fileName}`;
        contentHtml = `
            <div style="text-align: center; padding: 20px;">
                <div style="width: 400px; height: 300px; margin: 0 auto; background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%); border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; border-radius: 8px; position: relative;">
                    <div style="text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 10px;">📷</div>
                        <p style="color: #6c757d; margin: 0; font-weight: 500;">Imagen Médica</p>
                        <small style="color: #999;">${fileName}</small>
                    </div>
                </div>
                <p style="margin-top: 15px; color: #6c757d; font-size: 0.9rem;">
                    📸 Vista previa de imagen médica<br>
                    <small>En el sistema real, aquí se mostraría la imagen actual del archivo</small>
                </p>
            </div>
        `;
    } else if (isPDF) {
        title = `📋 ${fileName}`;
        contentHtml = `
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px;">
                <div style="font-size: 4rem; margin-bottom: 15px; color: #dc3545;">📄</div>
                <h3 style="color: #2c3e50; margin-bottom: 10px;">Documento PDF</h3>
                <p style="color: #6c757d; margin-bottom: 20px;">${fileName}</p>
                <div style="background: white; padding: 20px; border-radius: 5px; border: 1px solid #dee2e6; text-align: left; max-height: 300px; overflow-y: auto;">
                    <h4 style="color: #495057; margin-bottom: 15px;">📋 Contenido del documento</h4>
                    <div style="color: #6c757d; line-height: 1.8; font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 3px;">
                        <strong>CERTIFICADO MÉDICO</strong><br>
                        ========================<br><br>
                        Paciente: [Nombre del empleado]<br>
                        Fecha: ${new Date().toLocaleDateString('es-ES')}<br>
                        Médico: Dr. [Nombre]<br><br>
                        Diagnóstico: [Información médica]<br>
                        Tratamiento: [Indicaciones]<br><br>
                        ✓ Documento válido<br>
                        ✓ Firmado digitalmente<br>
                    </div>
                    <small style="color: #999; font-style: italic; display: block; margin-top: 10px;">
                        Simulación del contenido real del PDF
                    </small>
                </div>
            </div>
        `;
    } else {
        contentHtml = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 4rem; margin-bottom: 15px; color: #6c757d;">📁</div>
                <h3 style="color: #2c3e50; margin-bottom: 10px;">Archivo médico</h3>
                <p style="color: #6c757d; margin-bottom: 20px;">${fileName}</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                    <p style="color: #495057; margin-bottom: 10px;">
                        📄 Tipo: .${fileExt.toUpperCase()}<br>
                        📅 Documento médico disponible
                    </p>
                    <small style="color: #6c757d;">
                        El archivo está disponible para descarga.<br>
                        En el sistema real se abriría con la aplicación correspondiente.
                    </small>
                </div>
            </div>
        `;
    }
    
    const modalContent = `
        <div class="modal file-viewer-modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 0; border-radius: 10px; max-width: 80%; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="padding: 20px; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, #FFB88C 0%, #FFDAB9 100%); color: white; border-radius: 10px 10px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: white;">${title}</h3>
                        <button onclick="closeFileViewer()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                    </div>
                </div>
                
                <div style="padding: 20px;">
                    ${contentHtml}
                </div>
                
                <div style="padding: 20px; border-top: 1px solid #e9ecef; background: #f8f9fa; text-align: center; border-radius: 0 0 10px 10px;">
                    <button onclick="downloadFile('${fileName}')" class="btn btn-primary" style="margin-right: 10px;">📥 Descargar</button>
                    <button onclick="closeFileViewer()" class="btn btn-secondary">❌ Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
    showMedicalMessage(`📁 Abriendo ${fileName}...`, 'info');
}

function closeFileViewer() {
    const modal = document.querySelector('.file-viewer-modal');
    if (modal) modal.remove();
}

function downloadFile(fileName) {
    showMedicalMessage(`📥 Descargando ${fileName}...`, 'info');
    
    // Simular descarga creando un enlace temporal
    const link = document.createElement('a');
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    // Crear contenido simulado según el tipo
    let content = '';
    let mimeType = 'text/plain';
    
    if (fileExt === 'pdf') {
        content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Documento médico simulado) Tj
ET
endstream
endobj
trailer
<< /Size 5 /Root 1 0 R >>
startxref
%%EOF`;
        mimeType = 'application/pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
        // Para imágenes, crear un pequeño SVG como placeholder
        content = `<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="150" fill="#f0f0f0"/>
  <text x="100" y="75" text-anchor="middle" fill="#666">Imagen médica</text>
  <text x="100" y="95" text-anchor="middle" fill="#999" font-size="12">${fileName}</text>
</svg>`;
        mimeType = 'image/svg+xml';
    } else {
        content = `Documento médico simulado - ${fileName}
        
Fecha: ${new Date().toLocaleDateString('es-ES')}
Hora: ${new Date().toLocaleTimeString('es-ES')}

Este es un archivo de prueba generado por el sistema de gestión médica.

Contenido simulado para fines de demostración.`;
    }
    
    // Crear blob y descarga
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = fileName;
    link.style.setProperty('display', 'none', 'important');
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpiar URL temporal
    setTimeout(() => {
        URL.revokeObjectURL(url);
        showMedicalMessage(`✅ ${fileName} descargado exitosamente`, 'success');
    }, 1000);
}

// Funciones para el modal directo (sin duplicación de tabs)
function closeDirectModal() {
    const modal = document.querySelector('.employee-direct-modal');
    if (modal) modal.remove();
}

function loadDirectDocumentContent(type, employeeId) {
    const container = document.getElementById(`direct-document-content-${employeeId}`);
    if (!container) {
        console.log('❌ Container not found:', `direct-document-content-${employeeId}`);
        return;
    }
    
    console.log(`📦 Cargando contenido directo tipo: ${type} para empleado: ${employeeId}`);
    
    const employee = findEmployeeById(employeeId);
    
    const typeData = {
        certificates: { icon: '🏥', title: 'Certificados Médicos', action: 'requestEmployeeCertificate' },
        studies: { icon: '🩺', title: 'Estudios Médicos', action: 'requestEmployeeStudy' },
        photos: { icon: '📷', title: 'Fotos Médicas', action: 'requestEmployeePhoto' },
        prescriptions: { icon: '💊', title: 'Recetas Médicas', action: 'requestEmployeePrescription' }
    };
    
    const data = typeData[type];
    
    // Obtener documentos del tipo específico
    const documents = getEmployeeDocuments(employeeId)[type] || [];
    
    if (documents.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 3rem; margin-bottom: 15px;">${data.icon}</div>
                <h4>${data.title}</h4>
                <p>No hay ${data.title.toLowerCase()} registrados</p>
                <div style="margin-top: 20px;">
                    <button onclick="${data.action}(${employeeId})" class="btn btn-primary btn-sm">+ Solicitar Nuevo</button>
                </div>
            </div>
        `;
        return;
    }
    
    // Mostrar documentos existentes
    const documentsHtml = documents.map(doc => `
        <div style="border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <h5 style="margin: 0; color: #495057; flex-grow: 1;">${doc.title}</h5>
                <span style="font-size: 0.8rem; color: #6c757d; margin-left: 10px;">${doc.date}</span>
            </div>
            <p style="margin: 8px 0; font-size: 0.9rem; color: #666;">${doc.content}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span class="status-badge status-${doc.status}" style="font-size: 0.8rem; padding: 3px 8px; border-radius: 12px;">
                    ${doc.status === 'pendiente' ? '⏳ Pendiente' : doc.status === 'enviado' ? '📤 Enviado' : '✅ Completado'}
                </span>
                ${doc.attachments?.length > 0 ? `<button onclick="openFileViewer('${doc.attachments[0]}', '${doc.id}')" style="font-size: 0.8rem; padding: 5px 10px; border: 1px solid #007bff; background: white; color: #007bff; border-radius: 4px; cursor: pointer;">📎 Ver Archivo</button>` : ''}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto;">
            ${documentsHtml}
        </div>
        <div style="text-align: center; margin-top: 15px;">
            <button onclick="${data.action}(${employeeId})" class="btn btn-primary btn-sm">+ Nuevo ${data.title}</button>
        </div>
    `;
}

function loadDirectPendingRequests(employeeId, filterType) {
    const container = document.getElementById(`direct-pending-requests-${employeeId}`);
    const employee = findEmployeeById(employeeId);
    
    // Usar la misma lógica de filtrado
    const conversations = getEmployeeConversations(employeeId);
    let pendingRequests = conversations.filter(conv => conv.status === 'pendiente' || conv.status === 'enviado');
    
    if (filterType) {
        const typeMap = {
            'certificates': ['solicitud', 'certificado'],
            'studies': ['resultado', 'estudio'],
            'photos': ['foto', 'imagen'],
            'prescriptions': ['receta', 'medicamento']
        };
        
        const relevantTypes = typeMap[filterType] || [];
        pendingRequests = pendingRequests.filter(conv => 
            relevantTypes.some(type => 
                conv.subject.toLowerCase().includes(type) || 
                conv.type.toLowerCase().includes(type) ||
                conv.message.toLowerCase().includes(type)
            )
        );
    }
    
    if (pendingRequests.length === 0) {
        container.innerHTML = `
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #c3e6cb;">
                <div style="font-size: 1.5rem; margin-bottom: 10px; color: #155724;">✅</div>
                <p style="margin: 0; color: #155724;"><strong>Sin solicitudes pendientes</strong></p>
                <small style="color: #155724;">Todo al día en esta categoría</small>
            </div>
        `;
        return;
    }
    
    // Mostrar solicitudes filtradas (copiar lógica existente pero simplificada)
    const requestsHtml = pendingRequests.slice(0, 3).map(req => `
        <div style="background: white; border: 1px solid #ffc107; border-left: 4px solid #ffc107; padding: 10px; border-radius: 5px; margin-bottom: 8px;">
            <div style="font-size: 0.85rem; color: #495057; margin-bottom: 5px;">
                <strong>${req.subject}</strong>
            </div>
            <small style="color: #6c757d;">${req.timestamp}</small>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div style="max-height: 200px; overflow-y: auto;">
            ${requestsHtml}
        </div>
        ${pendingRequests.length > 3 ? `<div style="text-align: center; margin-top: 10px; color: #6c757d; font-size: 0.8rem;">... y ${pendingRequests.length - 3} más</div>` : ''}
    `;
}

function loadDirectActivityTimeline(employeeId, filterType) {
    const container = document.getElementById(`direct-activity-timeline-${employeeId}`);
    
    // Usar la misma lógica de filtrado que la función principal
    const conversations = getEmployeeConversations(employeeId);
    let filteredConversations = conversations;
    
    if (filterType) {
        const typeMap = {
            'certificates': ['solicitud', 'certificado'],
            'studies': ['resultado', 'estudio'], 
            'photos': ['foto', 'imagen'],
            'prescriptions': ['receta', 'medicamento']
        };
        
        const relevantTypes = typeMap[filterType] || [];
        filteredConversations = conversations.filter(conv => 
            relevantTypes.some(type => 
                conv.subject.toLowerCase().includes(type) || 
                conv.type.toLowerCase().includes(type) ||
                conv.message.toLowerCase().includes(type)
            )
        );
    }
    
    const sortedConversations = filteredConversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (sortedConversations.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #6c757d;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📭</div>
                <p style="margin: 0;">No hay actividad de este tipo</p>
            </div>
        `;
        return;
    }
    
    // Mostrar solo los primeros 4 elementos del timeline
    const timelineHtml = sortedConversations.slice(0, 4).map(conv => `
        <div style="display: flex; gap: 10px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e9ecef;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #17a2b8; margin-top: 4px; flex-shrink: 0;"></div>
            <div style="font-size: 0.8rem;">
                <div style="font-weight: 500; color: #495057;">${conv.subject}</div>
                <small style="color: #6c757d;">${conv.timestamp}</small>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div style="max-height: 250px; overflow-y: auto;">
            ${timelineHtml}
        </div>
        ${sortedConversations.length > 4 ? `<div style="text-align: center; margin-top: 10px; color: #6c757d; font-size: 0.8rem;">... y ${sortedConversations.length - 4} eventos más</div>` : ''}
    `;
}

// Función faltante para recetas médicas
async function requestEmployeePrescription(employeeId) {
    const employee = findEmployeeById(employeeId);
    
    const modalContent = `
        <div class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; overflow-y: auto;">
            <div class="modal-content" style="background: white; margin: 2% auto; padding: 30px; border-radius: 10px; max-width: 500px; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">💊 Solicitar Receta Médica</h2>
                    <button onclick="closePrescriptionModal()" style="background: none; border: none; font-size: 24px; color: #6c757d; cursor: pointer; padding: 5px; line-height: 1;" title="Cerrar">×</button>
                </div>
                <p><strong>Empleado:</strong> ${employee.name}</p>
                
                <form id="prescriptionRequestForm">
                    <div class="form-group">
                        <label><strong>Tipo de medicamento:</strong></label>
                        <select id="medicationType" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" required>
                            <option value="">Seleccionar...</option>
                            <option value="analgesico">Analgésico</option>
                            <option value="antiinflamatorio">Antiinflamatorio</option>
                            <option value="antibiotico">Antibiótico</option>
                            <option value="vitaminas">Vitaminas</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-top: 15px;">
                        <label><strong>Síntomas o diagnóstico:</strong></label>
                        <textarea id="symptoms" placeholder="Describa los síntomas o el diagnóstico médico..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; min-height: 80px;" required></textarea>
                    </div>
                    
                    <div class="form-group" style="margin-top: 15px;">
                        <label><strong>Observaciones adicionales:</strong></label>
                        <textarea id="prescriptionNotes" placeholder="Observaciones para el médico..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; min-height: 60px;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
                        <button type="button" onclick="closePrescriptionModal()" style="padding: 10px 20px; border: 1px solid #6c757d; background: white; color: #6c757d; border-radius: 5px; cursor: pointer;">Cancelar</button>
                        <button type="button" onclick="submitPrescriptionRequest(${employeeId})" style="padding: 10px 20px; background: linear-gradient(135deg, #FFB88C 0%, #FFDAB9 100%); color: white; border: none; border-radius: 5px; cursor: pointer;">💊 Solicitar Receta</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalContent);
}

function closePrescriptionModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

function submitPrescriptionRequest(employeeId) {
    const medicationType = document.getElementById('medicationType').value;
    const symptoms = document.getElementById('symptoms').value;
    const notes = document.getElementById('prescriptionNotes').value;
    
    if (!medicationType || !symptoms) {
        showMedicalMessage('❌ Por favor complete todos los campos requeridos', 'error');
        return;
    }
    
    showMedicalMessage('📤 Enviando solicitud de receta médica...', 'info');
    
    // Simular delay de envío
    setTimeout(() => {
        const requestId = 'PRESC-REQ-' + Date.now();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        const employee = findEmployeeById(employeeId);
        
        // Agregar a mockMedicalDocuments
        if (!mockMedicalDocuments[employeeId]) {
            mockMedicalDocuments[employeeId] = { certificates: [], studies: [], photos: [], prescriptions: [] };
        }
        
        const newPrescription = {
            id: requestId,
            title: `Solicitud Receta - ${medicationType}`,
            type: 'solicitud_receta',
            direction: 'empleado_to_medico',
            from: employee.name,
            to: 'Medicina Laboral',
            date: dateStr,
            time: timeStr,
            status: 'pendiente',
            content: `Solicitud de receta médica: ${medicationType}. Síntomas: ${symptoms}${notes ? ` Observaciones: ${notes}` : ''}`,
            attachments: []
        };
        
        mockMedicalDocuments[employeeId].prescriptions.push(newPrescription);
        
        // Agregar también a conversaciones
        if (!mockConversations[employeeId]) {
            mockConversations[employeeId] = [];
        }
        
        const newConversation = {
            id: 'CONV-' + Date.now(),
            timestamp: `${dateStr} ${timeStr}`,
            type: 'solicitud',
            from: employee.name,
            to: 'Medicina Laboral',
            subject: `💊 Solicitud Receta Médica - ${medicationType}`,
            message: `Solicitud de receta médica para ${medicationType}. ${symptoms}`,
            status: 'pendiente',
            attachments: []
        };
        
        mockConversations[employeeId].push(newConversation);
        
        showMedicalMessage(`✅ Solicitud de receta médica enviada (ID: ${requestId})`, 'success');
        closePrescriptionModal();
        
        // Refrescar el dashboard médico si está visible
        if (typeof loadMedicalEmployeesWithRecords === 'function') {
            loadMedicalEmployeesWithRecords();
        }
    }, 2000);
}

// ============================================================================
// FASE 2: FUNCIONES API REAL (coexisten con mock)
// ============================================================================

// ✅ 1. CARGAR CASOS PENDIENTES REALES
async function loadPendingCases_real() {
    console.log('🔄 [MEDICAL-API] Cargando casos pendientes reales...');

    const container = document.getElementById('pending-cases-container');

    try {
        const response = await MedicalAPI.getPendingCases();
        console.log('✅ [MEDICAL-API] Casos pendientes obtenidos:', response);

        // Backend devuelve response.data, no response.cases
        const cases = response.data || response.cases || [];

        // Renderizar casos pendientes en UI
        if (container) {
            displayPendingCasesReal(cases);
        }

        return cases;
    } catch (error) {
        console.error('❌ [MEDICAL-API] Error cargando casos pendientes:', error);

        // Mostrar mensaje amigable en el container
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">📋</div>
                    <h4>Sin casos pendientes</h4>
                    <p>No hay casos médicos pendientes de revisión.</p>
                    <p style="font-size: 0.85rem; color: #999;">${error.message}</p>
                </div>
            `;
        }
        return [];
    }
}

// ✅ 2. VER DETALLES COMPLETOS DE EMPLEADO (API REAL)
async function viewFullEmployeeDetails_real(employeeId) {
    console.log(`🔄 [MEDICAL-API] Cargando detalles completos de empleado ${employeeId}...`);

    try {
        const response = await MedicalAPI.getEmployeeCases(employeeId);
        console.log('✅ [MEDICAL-API] Casos del empleado obtenidos:', response);

        // Abrir modal con detalles reales
        openEmployeeDetailsModalReal(employeeId, response);

        return response;
    } catch (error) {
        console.error(`❌ [MEDICAL-API] Error cargando detalles de empleado ${employeeId}:`, error);
        showMedicalMessage('❌ Error cargando detalles del empleado', 'error');
        return null;
    }
}

// ✅ 3. CARGAR DOCUMENTOS POR TIPO (API REAL)
async function loadDocumentsByType_real(employeeId, documentType) {
    console.log(`🔄 [MEDICAL-API] Cargando documentos tipo ${documentType} para empleado ${employeeId}...`);

    try {
        const response = await MedicalAPI.getEmployeeCases(employeeId);
        console.log('✅ [MEDICAL-API] Documentos obtenidos:', response);

        // Filtrar documentos por tipo
        const documents = response.cases?.flatMap(c => c.attachments?.filter(a => a.type === documentType) || []) || [];

        displayDocumentsReal(documents, documentType);
        return documents;
    } catch (error) {
        console.error(`❌ [MEDICAL-API] Error cargando documentos tipo ${documentType}:`, error);
        showMedicalMessage('❌ Error cargando documentos', 'error');
        return [];
    }
}

// ✅ 4. CARGAR SOLICITUDES PENDIENTES DE EMPLEADO (API REAL)
async function loadPendingRequestsForEmployee_real(employeeId) {
    console.log(`🔄 [MEDICAL-API] Cargando solicitudes pendientes para empleado ${employeeId}...`);

    try {
        const response = await MedicalAPI.getEmployeeCases(employeeId);
        console.log('✅ [MEDICAL-API] Solicitudes pendientes obtenidas:', response);

        // Filtrar casos con status 'pending'
        const pendingRequests = response.cases?.filter(c => c.status === 'pending' || c.status === 'in_progress') || [];

        displayPendingRequestsReal(employeeId, pendingRequests);
        return pendingRequests;
    } catch (error) {
        console.error(`❌ [MEDICAL-API] Error cargando solicitudes pendientes:`, error);
        showMedicalMessage('❌ Error cargando solicitudes pendientes', 'error');
        return [];
    }
}

// ✅ 5. CARGAR TIMELINE DE ACTIVIDAD (API REAL)
async function loadActivityTimelineForEmployee_real(employeeId) {
    console.log(`🔄 [MEDICAL-API] Cargando timeline de actividad para empleado ${employeeId}...`);

    try {
        const response = await MedicalAPI.getEmployeeCases(employeeId);
        console.log('✅ [MEDICAL-API] Timeline de actividad obtenido:', response);

        // Convertir casos a timeline cronológico
        const timeline = response.cases?.map(c => ({
            date: c.created_at,
            type: c.absence_type,
            status: c.status,
            description: c.notes || c.absence_reason,
            caseId: c.id
        })).sort((a, b) => new Date(b.date) - new Date(a.date)) || [];

        displayActivityTimelineReal(employeeId, timeline);
        return timeline;
    } catch (error) {
        console.error(`❌ [MEDICAL-API] Error cargando timeline de actividad:`, error);
        showMedicalMessage('❌ Error cargando timeline de actividad', 'error');
        return [];
    }
}

// ============================================================================
// FASE 3: DIAGNÓSTICO MÉDICO (NUEVA FUNCIONALIDAD)
// ============================================================================

// ✅ 6. ABRIR MODAL DE DIAGNÓSTICO MÉDICO
function openDiagnosisModal(caseId, employeeName) {
    console.log(`📋 [DIAGNOSIS] Abriendo modal de diagnóstico para caso ${caseId}...`);

    const modalHTML = `
        <div id="diagnosisModal" class="modal-overlay-improved" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; align-items: center; justify-content: center;">
            <div class="modal-container-improved" style="background: white; border-radius: 15px; width: 90%; max-width: 700px; max-height: 85vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div class="modal-header-improved" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 15px 15px 0 0;">
                    <h2 style="margin: 0; font-size: 1.6rem; display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 2rem;">📋</span> Diagnóstico Médico
                    </h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.95; font-size: 0.95rem;">Empleado: <strong>${employeeName || "N/A"}</strong> | Caso ID: ${caseId}</p>
                </div>
                <div class="modal-body-improved" style="padding: 30px;">
                    <form id="diagnosisForm">
                        <!-- Diagnóstico -->
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                                🩺 Diagnóstico Médico <span style="color: #dc3545;">*</span>
                            </label>
                            <textarea id="diagnosisText" rows="5" required style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-family: inherit; font-size: 0.95rem; resize: vertical;" placeholder="Ingrese el diagnóstico médico detallado..."></textarea>
                        </div>

                        <!-- ¿Justifica la ausencia? -->
                        <div class="form-group" style="margin-bottom: 20px; background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #667eea;">
                            <label style="display: block; margin-bottom: 15px; font-weight: 600; color: #2c3e50; font-size: 1.05rem;">
                                ⚖️ ¿El diagnóstico justifica la ausencia? <span style="color: #dc3545;">*</span>
                            </label>
                            <div style="display: flex; gap: 20px;">
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 15px; background: white; border-radius: 8px; border: 2px solid #e9ecef; flex: 1; transition: all 0.3s;" onmouseover="this.style.borderColor='#28a745'" onmouseout="this.style.borderColor='#e9ecef'">
                                    <input type="radio" name="justifies" value="yes" required style="width: 20px; height: 20px; cursor: pointer;">
                                    <span style="font-weight: 600; color: #28a745; font-size: 1.1rem;">✅ SÍ JUSTIFICA</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 15px; background: white; border-radius: 8px; border: 2px solid #e9ecef; flex: 1; transition: all 0.3s;" onmouseover="this.style.borderColor='#dc3545'" onmouseout="this.style.borderColor='#e9ecef'">
                                    <input type="radio" name="justifies" value="no" required style="width: 20px; height: 20px; cursor: pointer;">
                                    <span style="font-weight: 600; color: #dc3545; font-size: 1.1rem;">❌ NO JUSTIFICA</span>
                                </label>
                            </div>
                        </div>

                        <!-- Notas adicionales -->
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                                📝 Notas Adicionales (opcional)
                            </label>
                            <textarea id="diagnosisNotes" rows="3" style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-family: inherit; font-size: 0.95rem; resize: vertical;" placeholder="Recomendaciones, observaciones, etc..."></textarea>
                        </div>

                        <!-- Botones -->
                        <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 2px solid #f8f9fa;">
                            <button type="button" onclick="closeDiagnosisModal()" class="btn" style="background: #6c757d; color: white; padding: 12px 30px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                                ❌ Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                ✅ Enviar Diagnóstico
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach form submit handler
    document.getElementById('diagnosisForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const diagnosisData = {
            diagnosis: document.getElementById('diagnosisText').value,
            justifies_absence: document.querySelector('input[name="justifies"]:checked').value === 'yes',
            notes: document.getElementById('diagnosisNotes').value
        };

        await sendDiagnosis_real(caseId, diagnosisData);
    });
}

function closeDiagnosisModal() {
    const modal = document.getElementById('diagnosisModal');
    if (modal) modal.remove();
}

// ✅ 7. ENVIAR DIAGNÓSTICO (API REAL)
async function sendDiagnosis_real(caseId, diagnosisData) {
    console.log(`🔄 [MEDICAL-API] Enviando diagnóstico para caso ${caseId}:`, diagnosisData);

    try {
        const response = await MedicalAPI.sendDiagnosis(caseId, diagnosisData);
        console.log('✅ [MEDICAL-API] Diagnóstico enviado exitosamente:', response);

        showMedicalMessage(`✅ Diagnóstico enviado correctamente. ${diagnosisData.justifies_absence ? 'Ausencia justificada.' : 'Ausencia NO justificada.'}`, 'success');
        closeDiagnosisModal();

        // Recargar casos pendientes
        if (typeof loadPendingCases_real === 'function') {
            await loadPendingCases_real();
        }

        return response;
    } catch (error) {
        console.error(`❌ [MEDICAL-API] Error enviando diagnóstico:`, error);
        showMedicalMessage('❌ Error enviando diagnóstico', 'error');
        throw error;
    }
}

// ============================================================================
// FASE 4: CERRAR EXPEDIENTE MÉDICO
// ============================================================================

// ✅ 8. ABRIR MODAL PARA CERRAR CASO
function openCloseCaseModal(caseId, employeeName) {
    console.log(`📁 [CLOSE-CASE] Abriendo modal para cerrar caso ${caseId}...`);

    const modalHTML = `
        <div id="closeCaseModal" class="modal-overlay-improved" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; align-items: center; justify-content: center;">
            <div class="modal-container-improved" style="background: white; border-radius: 15px; width: 90%; max-width: 650px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div class="modal-header-improved" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 25px; border-radius: 15px 15px 0 0;">
                    <h2 style="margin: 0; font-size: 1.6rem; display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 2rem;">📁</span> Cerrar Expediente Médico
                    </h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.95; font-size: 0.95rem;">Empleado: <strong>${employeeName || "N/A"}</strong> | Caso ID: ${caseId}</p>
                </div>
                <div class="modal-body-improved" style="padding: 30px;">
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                        <p style="margin: 0; color: #856404; font-weight: 600;">
                            ⚠️ Al cerrar este expediente:
                        </p>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #856404;">
                            <li>El caso quedará marcado como RESUELTO</li>
                            <li>Se actualizará la tabla de asistencias (attendances)</li>
                            <li>Se notificará al empleado</li>
                        </ul>
                    </div>

                    <form id="closeCaseForm">
                        <!-- Resolución final -->
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2c3e50;">
                                📋 Resolución Final <span style="color: #dc3545;">*</span>
                            </label>
                            <textarea id="closeCaseResolution" rows="4" required style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-family: inherit; font-size: 0.95rem; resize: vertical;" placeholder="Ingrese la resolución final del caso..."></textarea>
                        </div>

                        <!-- Botones -->
                        <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 2px solid #f8f9fa;">
                            <button type="button" onclick="closeCloseCaseModal()" class="btn" style="background: #6c757d; color: white; padding: 12px 30px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                                ❌ Cancelar
                            </button>
                            <button type="submit" class="btn btn-danger" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 12px 30px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);">
                                ✅ Cerrar Expediente
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach form submit handler
    document.getElementById('closeCaseForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const closingData = {
            resolution: document.getElementById('closeCaseResolution').value,
            closed_at: new Date().toISOString()
        };

        await closeCase_real(caseId, closingData);
    });
}

function closeCloseCaseModal() {
    const modal = document.getElementById('closeCaseModal');
    if (modal) modal.remove();
}

// ✅ 9. CERRAR CASO (API REAL) - Impacta attendance table
async function closeCase_real(caseId, closingData) {
    console.log(`🔄 [MEDICAL-API] Cerrando caso ${caseId}:`, closingData);

    try {
        const response = await MedicalAPI.closeCase(caseId, closingData);
        console.log('✅ [MEDICAL-API] Caso cerrado exitosamente:', response);

        showMedicalMessage(`✅ Expediente médico cerrado exitosamente. Tabla de asistencias actualizada.`, 'success');
        closeCloseCaseModal();

        // Recargar casos pendientes
        if (typeof loadPendingCases_real === 'function') {
            await loadPendingCases_real();
        }

        return response;
    } catch (error) {
        console.error(`❌ [MEDICAL-API] Error cerrando caso:`, error);
        showMedicalMessage('❌ Error cerrando expediente médico', 'error');
        throw error;
    }
}

// ============================================================================
// FASE 5: CHAT BIDIRECCIONAL EMPLEADO ↔ MÉDICO
// ============================================================================

// ✅ 10. ABRIR MODAL DE CHAT BIDIRECCIONAL
async function openCaseChatModal(caseId, employeeName) {
    console.log(`💬 [CHAT] Abriendo chat bidireccional para caso ${caseId}...`);

    const modalHTML = `
        <div id="caseChatModal" class="modal-overlay-improved" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; align-items: center; justify-content: center;">
            <div class="modal-container-improved" style="background: white; border-radius: 15px; width: 90%; max-width: 800px; height: 80vh; display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <!-- Header -->
                <div class="modal-header-improved" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 15px 15px 0 0; flex-shrink: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 1.8rem;">💬</span> Chat con Empleado
                            </h2>
                            <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 0.9rem;">${employeeName || "N/A"} | Caso ID: ${caseId}</p>
                        </div>
                        <button onclick="closeCaseChatModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 5px 12px; border-radius: 8px; transition: all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✖</button>
                    </div>
                </div>

                <!-- Messages Container -->
                <div id="chatMessagesContainer" style="flex: 1; overflow-y: auto; padding: 25px; background: #f8f9fa;">
                    <div style="text-align: center; padding: 40px; color: #6c757d;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">🔄</div>
                        <p>Cargando mensajes...</p>
                    </div>
                </div>

                <!-- Input Area -->
                <div style="padding: 20px; background: white; border-top: 2px solid #e9ecef; flex-shrink: 0;">
                    <form id="chatMessageForm" style="display: flex; gap: 15px; align-items: flex-end;">
                        <div style="flex: 1;">
                            <textarea id="chatMessageInput" rows="2" placeholder="Escribe tu mensaje al empleado..." style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-family: inherit; resize: none; font-size: 0.95rem;"></textarea>
                        </div>
                        <button type="submit" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 25px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.3s; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                            📤 Enviar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Cargar mensajes del caso
    await loadCaseMessages(caseId);

    // Attach form submit handler
    document.getElementById('chatMessageForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const messageText = document.getElementById('chatMessageInput').value.trim();
        if (!messageText) return;

        await sendCaseMessage_real(caseId, messageText);
        document.getElementById('chatMessageInput').value = '';
    });
}

function closeCaseChatModal() {
    const modal = document.getElementById('caseChatModal');
    if (modal) modal.remove();
}

async function loadCaseMessages(caseId) {
    console.log(`🔄 [CHAT] Cargando mensajes del caso ${caseId}...`);

    try {
        const response = await MedicalAPI.getCaseMessages(caseId);
        console.log('✅ [CHAT] Mensajes obtenidos:', response);

        const container = document.getElementById('chatMessagesContainer');
        if (!container) return;

        if (!response.messages || response.messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">💬</div>
                    <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = response.messages.map(msg => {
            const isDoctor = msg.sender_role === 'doctor' || msg.sender_role === 'admin';
            return `
                <div style="display: flex; justify-content: ${isDoctor ? 'flex-end' : 'flex-start'}; margin-bottom: 15px;">
                    <div style="max-width: 70%; background: ${isDoctor ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'}; color: ${isDoctor ? 'white' : '#2c3e50'}; padding: 15px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <div style="font-weight: 600; margin-bottom: 5px; font-size: 0.85rem; opacity: 0.9;">
                            ${isDoctor ? '👨‍⚕️ Médico' : '👤 Empleado'} | ${new Date(msg.created_at).toLocaleString('es-AR')}
                        </div>
                        <div style="font-size: 0.95rem; line-height: 1.5;">
                            ${msg.message}
                        </div>
                        ${msg.attachments?.length > 0 ? `
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid ${isDoctor ? 'rgba(255,255,255,0.3)' : '#e9ecef'};">
                                ${msg.attachments.map(att => `
                                    <a href="${att.url}" target="_blank" style="color: ${isDoctor ? 'white' : '#667eea'}; text-decoration: underline; display: block; margin-top: 5px;">
                                        📎 ${att.filename}
                                    </a>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;

    } catch (error) {
        console.error('❌ [CHAT] Error cargando mensajes:', error);
        const container = document.getElementById('chatMessagesContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">❌</div>
                    <p>Error cargando mensajes</p>
                </div>
            `;
        }
    }
}

async function sendCaseMessage_real(caseId, messageText) {
    console.log(`🔄 [CHAT] Enviando mensaje al caso ${caseId}:`, messageText);

    try {
        const formData = new FormData();
        formData.append('message', messageText);

        const response = await MedicalAPI.sendMessage(caseId, formData);
        console.log('✅ [CHAT] Mensaje enviado exitosamente:', response);

        // Recargar mensajes
        await loadCaseMessages(caseId);

        return response;
    } catch (error) {
        console.error('❌ [CHAT] Error enviando mensaje:', error);
        showMedicalMessage('❌ Error enviando mensaje', 'error');
        throw error;
    }
}

// ============================================================================
// FASE 7: INTEGRACIÓN CON MÓDULO USERS (crear caso desde ausencia)
// ============================================================================

// ✅ 11. CREAR CASO MÉDICO DESDE MÓDULO USERS
window.createMedicalCaseFromAbsence = async function(userId, absenceData) {
    console.log(`🔄 [INTEGRATION] Creando caso médico desde Users para usuario ${userId}:`, absenceData);

    try {
        const formData = new FormData();
        formData.append('employee_id', userId);
        formData.append('absence_type', absenceData.type || 'medical');
        formData.append('absence_reason', absenceData.reason || '');
        formData.append('start_date', absenceData.start_date);
        formData.append('end_date', absenceData.end_date || absenceData.start_date);

        // Adjuntar documentos si existen
        if (absenceData.attachments && absenceData.attachments.length > 0) {
            absenceData.attachments.forEach((file, index) => {
                formData.append('attachments', file);
            });
        }

        const response = await MedicalAPI.createCase(formData);
        console.log('✅ [INTEGRATION] Caso médico creado exitosamente:', response);

        showMedicalMessage(`✅ Caso médico creado exitosamente. ID: ${response.case?.id}`, 'success');

        return response.case;
    } catch (error) {
        console.error('❌ [INTEGRATION] Error creando caso médico desde Users:', error);
        showMedicalMessage('❌ Error creando caso médico', 'error');
        throw error;
    }
};

// ============================================================================
// HELPERS PARA RENDERIZAR DATOS REALES
// ============================================================================

function displayPendingCasesReal(cases) {
    const container = document.getElementById('pending-cases-container');
    if (!container) return;

    if (!cases || cases.length === 0) {
        container.innerHTML = `
            <div class="me-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h4>Sin casos pendientes</h4>
                <p>Todos los casos han sido atendidos</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cases.map(c => `
        <div class="me-case-card" onclick="openCaseChatModal('${c.id}', '${(c.employee_name || 'N/A').replace(/'/g, '')}')">
            <div class="me-case-header">
                <span class="me-case-type">${formatAbsenceType(c.absence_type) || 'Caso Médico'}</span>
                <span class="me-case-date">${new Date(c.created_at).toLocaleDateString('es-AR')}</span>
            </div>
            <div class="me-case-employee">${c.employee_name || 'Empleado'} - ID: ${c.id}</div>
            <div style="margin-top: 8px; display: flex; gap: 8px;">
                <span class="me-badge me-badge-api" style="font-size: 10px;">⏳ ${c.status?.toUpperCase() || 'PENDIENTE'}</span>
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button onclick="event.stopPropagation(); openDiagnosisModal('${c.id}', '${(c.employee_name || 'N/A').replace(/'/g, '')}')" class="me-btn me-btn-sm me-btn-primary" style="flex: 1;">
                    Diagnosticar
                </button>
                <button onclick="event.stopPropagation(); openCloseCaseModal('${c.id}', '${(c.employee_name || '').replace(/'/g, '')}')" class="me-btn me-btn-sm" style="flex: 1; background: rgba(255,82,82,0.2); color: var(--me-accent-red); border-color: var(--me-accent-red);">
                    Cerrar
                </button>
            </div>
        </div>
    `).join('');
}

function openEmployeeDetailsModalReal(employeeId, data) {
    // Similar a viewFullEmployeeDetails() pero con datos reales de la API
    console.log(`📋 Abriendo detalles del empleado ${employeeId} (datos reales):`, data);
    // Implementar modal real (similar al existente pero con data de API)
}

function displayDocumentsReal(documents, type) {
    console.log(`📄 Mostrando documentos tipo ${type} (datos reales):`, documents);
    // Implementar display real (similar al existente pero con data de API)
}

function displayPendingRequestsReal(employeeId, requests) {
    console.log(`📋 Mostrando solicitudes pendientes del empleado ${employeeId}:`, requests);
    // Implementar display real
}

function displayActivityTimelineReal(employeeId, timeline) {
    console.log(`📊 Mostrando timeline de actividad del empleado ${employeeId}:`, timeline);
    // Implementar timeline real
}

console.log('✅ [MEDICAL-DASHBOARD] Módulo medical-dashboard configurado');

// ============================================================================
// MEDICAL EMPLOYEE 360 - VISTA CONSOLIDADA COMPLETA DEL EMPLEADO
// ============================================================================

/**
 * Abre el modal Medical Employee 360 con TODA la información médica
 * @param {string} employeeId - ID del empleado
 */
window.openMedicalEmployee360 = async function(employeeId) {
    console.log(`🏥 [MEDICAL-360] Abriendo vista 360 para empleado ${employeeId}...`);

    // Mostrar loading
    const loadingModal = `
        <div id="medical360Modal" class="modal-overlay-improved" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; align-items: center; justify-content: center;">
            <div style="background: white; border-radius: 15px; padding: 40px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 15px;">⏳</div>
                <h3>Cargando expediente médico completo...</h3>
                <p style="color: #6c757d;">Por favor espere</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingModal);

    try {
        // Llamar API para obtener datos 360
        const data = await MedicalAPI.getEmployee360(employeeId);
        console.log('✅ [MEDICAL-360] Datos recibidos:', data);

        // Remover loading y mostrar modal completo
        document.getElementById('medical360Modal').remove();
        renderMedical360Modal(data);

    } catch (error) {
        console.error('❌ [MEDICAL-360] Error:', error);
        document.getElementById('medical360Modal').remove();
        showMedicalMessage('❌ Error al cargar expediente médico: ' + error.message, 'error');
    }
};

function renderMedical360Modal(data) {
    // Extraer datos de la nueva estructura de 3 capítulos
    const { employee, alerts, statistics, pre_occupational, occupational, post_occupational, communications_timeline } = data;

    // Compatibilidad con estructura antigua
    const medical_history = data.medical_history || {
        allergies: pre_occupational?.prior_conditions?.allergies || [],
        chronic_conditions: pre_occupational?.prior_conditions?.chronic_conditions || [],
        medical_exams: [...(pre_occupational?.exams || []), ...(occupational?.periodic_exams || []), ...(post_occupational?.exit_exams || [])],
        upcoming_exam: occupational?.next_exam_due
    };
    const absence_history = data.absence_history || { cases: occupational?.absences?.all || [] };
    const certificates = occupational?.certificates || data.certificates || [];
    const documents = occupational?.documents || data.documents || [];
    const oh_certifications = occupational?.oh_certifications || data.oh_certifications || [];

    // Datos de los 3 capítulos
    const surgeries = occupational?.surgeries_during_employment || [];
    const vaccinations = occupational?.vaccinations_during_employment || [];
    const workRestrictions = occupational?.work_restrictions?.all || [];
    const medications = occupational?.medications?.all || [];

    // Construir alertas HTML
    const alertsHTML = alerts && alerts.length > 0 ? alerts.map(a => `
        <div style="background: ${a.type === 'danger' ? '#f8d7da' : a.type === 'warning' ? '#fff3cd' : '#d1ecf1'};
             border-left: 4px solid ${a.type === 'danger' ? '#dc3545' : a.type === 'warning' ? '#ffc107' : '#17a2b8'};
             padding: 12px 15px; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${a.icon}" style="font-size: 1.2rem; color: ${a.type === 'danger' ? '#dc3545' : a.type === 'warning' ? '#856404' : '#0c5460'};"></i>
            <span style="color: ${a.type === 'danger' ? '#721c24' : a.type === 'warning' ? '#856404' : '#0c5460'}; font-weight: 500;">${a.message}</span>
        </div>
    `).join('') : '<p style="color: #28a745; font-weight: 500;">✅ Sin alertas médicas activas</p>';

    // Construir exámenes HTML
    const examsHTML = medical_history.medical_exams && medical_history.medical_exams.length > 0 ?
        medical_history.medical_exams.map(e => `
            <tr>
                <td>${formatExamType(e.exam_type)}</td>
                <td>${formatDate(e.exam_date)}</td>
                <td><span class="badge badge-${e.result === 'apto' ? 'success' : e.result === 'no_apto' ? 'danger' : 'warning'}">${e.result?.toUpperCase() || 'PENDIENTE'}</span></td>
                <td>${e.medical_center || '-'}</td>
                <td>${e.examining_doctor || '-'}</td>
                <td>${formatDate(e.next_exam_date) || '-'}</td>
            </tr>
        `).join('') : '<tr><td colspan="6" style="text-align: center; color: #6c757d;">Sin exámenes registrados</td></tr>';

    // Construir ausencias HTML
    const absencesHTML = absence_history.cases && absence_history.cases.length > 0 ?
        absence_history.cases.slice(0, 10).map(c => `
            <tr>
                <td>${formatAbsenceType(c.absence_type)}</td>
                <td>${formatDate(c.start_date)} - ${formatDate(c.end_date)}</td>
                <td>${c.requested_days || 0} días</td>
                <td><span class="badge badge-${c.is_justified ? 'success' : c.case_status === 'pending' ? 'warning' : 'danger'}">${c.is_justified ? 'JUSTIFICADA' : c.case_status?.toUpperCase() || 'PENDIENTE'}</span></td>
                <td>${c.final_diagnosis || c.employee_description?.substring(0, 50) || '-'}...</td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align: center; color: #6c757d;">Sin ausencias registradas</td></tr>';

    // Construir certificados HTML
    const certificatesHTML = certificates && certificates.length > 0 ?
        certificates.slice(0, 10).map(c => `
            <tr>
                <td>${c.certificate_number || '-'}</td>
                <td>${formatDate(c.issue_date)}</td>
                <td>${c.diagnosis || '-'}</td>
                <td>${c.requested_days || 0} días</td>
                <td><span class="badge badge-${c.status === 'approved' || c.is_justified ? 'success' : 'warning'}">${c.status?.toUpperCase() || 'PENDIENTE'}</span></td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align: center; color: #6c757d;">Sin certificados registrados</td></tr>';

    // Construir alergias HTML
    const allergiesHTML = medical_history.allergies && medical_history.allergies.length > 0 ?
        medical_history.allergies.map(a => `
            <span class="badge badge-${a.severity === 'severe' || a.severity === 'alta' ? 'danger' : 'warning'}" style="margin: 3px; padding: 8px 12px;">
                ${a.allergen} (${a.severity || 'N/A'})
            </span>
        `).join('') : '<span style="color: #28a745;">✅ Sin alergias conocidas</span>';

    // Construir condiciones crónicas HTML
    const chronicHTML = medical_history.chronic_conditions && medical_history.chronic_conditions.length > 0 ?
        medical_history.chronic_conditions.map(c => `
            <div style="background: #f8f9fa; padding: 10px 15px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid ${c.severity === 'severe' || c.severity === 'alta' ? '#dc3545' : '#ffc107'};">
                <strong>${c.condition_name || c.name || 'Condición'}</strong>
                ${c.icd10_code ? `<span style="color: #6c757d; font-size: 0.85rem;"> (${c.icd10_code})</span>` : ''}
                <br><small style="color: #6c757d;">Diagnóstico: ${formatDate(c.diagnosis_date)} | Estado: ${c.status || 'Activo'}</small>
            </div>
        `).join('') : '<span style="color: #28a745;">✅ Sin condiciones crónicas registradas</span>';

    const modalHTML = `
        <div id="medical360Modal" class="modal-overlay-improved" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 20px 0;">
            <div class="modal-container-improved" style="background: white; border-radius: 15px; width: 95%; max-width: 1200px; margin: 20px auto; box-shadow: 0 15px 50px rgba(0,0,0,0.4);">

                <!-- HEADER -->
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 25px 30px; border-radius: 15px 15px 0 0; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 2rem; border: 3px solid white;">
                            ${employee.photo_url ? `<img src="${employee.photo_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : '👤'}
                        </div>
                        <div>
                            <h2 style="margin: 0; font-size: 1.8rem;">${employee.firstName} ${employee.lastName}</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9;">
                                <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 15px; font-size: 0.85rem;">ID: ${employee.employee_id || employee.user_id}</span>
                                <span style="margin-left: 10px;">${employee.position || 'Sin cargo'} - ${employee.department_name || 'Sin depto'}</span>
                            </p>
                            <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 0.9rem;">
                                ${employee.age ? `${employee.age} años` : ''} ${employee.gender ? `| ${employee.gender}` : ''} ${employee.blood_type ? `| Grupo: ${employee.blood_type}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onclick="closeMedical360Modal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; font-size: 1.5rem; transition: all 0.3s;">✕</button>
                </div>

                <!-- ALERTAS MÉDICAS -->
                <div style="background: #f8f9fa; padding: 20px 30px; border-bottom: 1px solid #e9ecef;">
                    <h4 style="margin: 0 0 15px 0; color: #2c3e50;">⚠️ Alertas Médicas</h4>
                    ${alertsHTML}
                </div>

                <!-- ESTADÍSTICAS RÁPIDAS -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; padding: 20px 30px; background: white;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold;">${statistics.total_absences}</div>
                        <div style="font-size: 0.85rem; opacity: 0.9;">Ausencias Totales</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold;">${statistics.total_days_absent}</div>
                        <div style="font-size: 0.85rem; opacity: 0.9;">Días Ausente</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold;">${statistics.justified_absences}</div>
                        <div style="font-size: 0.85rem; opacity: 0.9;">Justificadas</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold;">${statistics.work_accidents}</div>
                        <div style="font-size: 0.85rem; opacity: 0.9;">Accidentes Lab.</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #2c3e50; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold;">${statistics.total_exams}</div>
                        <div style="font-size: 0.85rem;">Exámenes Ocupac.</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%); color: #2c3e50; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 2rem; font-weight: bold;">${statistics.pending_cases}</div>
                        <div style="font-size: 0.85rem;">Casos Pendientes</div>
                    </div>
                </div>

                <!-- TABS DE CONTENIDO - 3 CAPÍTULOS OCUPACIONALES -->
                <div style="padding: 0 30px 30px 30px;">
                    <div style="display: flex; gap: 10px; border-bottom: 2px solid #e9ecef; margin-bottom: 20px; flex-wrap: wrap;">
                        <button onclick="showMedical360Tab('pre-ocupacional')" class="tab-btn active" data-tab="pre-ocupacional" style="padding: 12px 25px; border: none; background: none; cursor: pointer; font-weight: 600; color: #667eea; border-bottom: 3px solid #667eea;">🔵 CAP 1: PRE-OCUPACIONAL</button>
                        <button onclick="showMedical360Tab('ocupacional')" class="tab-btn" data-tab="ocupacional" style="padding: 12px 25px; border: none; background: none; cursor: pointer; font-weight: 600; color: #6c757d; border-bottom: 3px solid transparent;">🟢 CAP 2: OCUPACIONAL</button>
                        <button onclick="showMedical360Tab('post-ocupacional')" class="tab-btn" data-tab="post-ocupacional" style="padding: 12px 25px; border: none; background: none; cursor: pointer; font-weight: 600; color: #6c757d; border-bottom: 3px solid transparent;">🔴 CAP 3: POST-OCUPACIONAL</button>
                        <button onclick="showMedical360Tab('contacto')" class="tab-btn" data-tab="contacto" style="padding: 12px 25px; border: none; background: none; cursor: pointer; font-weight: 600; color: #6c757d; border-bottom: 3px solid transparent;">📞 Contacto/Emergencia</button>
                    </div>

                    <!-- CAP 1: PRE-OCUPACIONAL - Antecedentes + Examen Ingreso -->
                    <div id="tab-pre-ocupacional" class="tab-content-360" style="display: block;">
                        <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #1976d2;">
                            <h4 style="margin: 0; color: #1565c0;">📋 Antecedentes Médicos PRE-Ocupacionales</h4>
                            <p style="margin: 5px 0 0 0; color: #1976d2; font-size: 0.9rem;">Información médica previa al ingreso laboral + Examen de ingreso</p>
                        </div>

                        <!-- Examen Preocupacional -->
                        <div style="background: #f0f9ff; padding: 20px; border-radius: 12px; border: 1px solid #bae6fd; margin-bottom: 20px;">
                            <h5 style="margin: 0 0 15px 0; color: #0369a1;">🔵 Examen Preocupacional (Ingreso)</h5>
                            ${pre_occupational?.exams?.length > 0 ? `
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead style="background: #e0f2fe;">
                                        <tr>
                                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #7dd3fc;">Fecha</th>
                                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #7dd3fc;">Resultado</th>
                                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #7dd3fc;">Centro</th>
                                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #7dd3fc;">Médico</th>
                                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #7dd3fc;">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pre_occupational.exams.map(e => `
                                            <tr style="border-bottom: 1px solid #e0f2fe;">
                                                <td style="padding: 10px;">${formatDate(e.exam_date)}</td>
                                                <td style="padding: 10px;"><span style="background: ${e.result === 'apto' ? '#dcfce7' : '#fef3c7'}; padding: 4px 10px; border-radius: 12px; font-weight: 600; color: ${e.result === 'apto' ? '#166534' : '#92400e'};">${e.result?.toUpperCase() || 'PENDIENTE'}</span></td>
                                                <td style="padding: 10px;">${e.medical_center || '-'}</td>
                                                <td style="padding: 10px;">${e.examining_doctor || '-'}</td>
                                                <td style="padding: 10px;">${e.observations || '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #64748b; text-align: center;">⚠️ Sin examen preocupacional registrado</p>'}
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                            <!-- Alergias conocidas -->
                            <div style="background: #fff5f5; padding: 20px; border-radius: 12px; border: 1px solid #feb2b2;">
                                <h5 style="margin: 0 0 15px 0; color: #c53030;">🚨 Alergias Conocidas</h5>
                                ${allergiesHTML}
                            </div>
                            <!-- Condiciones Crónicas Previas -->
                            <div style="background: #fffaf0; padding: 20px; border-radius: 12px; border: 1px solid #fbd38d;">
                                <h5 style="margin: 0 0 15px 0; color: #c05621;">💊 Condiciones Crónicas</h5>
                                ${chronicHTML}
                            </div>
                        </div>

                        <!-- Cirugías previas al ingreso -->
                        <div style="background: #faf5ff; padding: 20px; border-radius: 12px; border: 1px solid #d8b4fe; margin-top: 20px;">
                            <h5 style="margin: 0 0 15px 0; color: #7c3aed;">🔪 Cirugías Previas</h5>
                            ${(pre_occupational?.prior_conditions?.surgeries || []).length > 0 ?
                                pre_occupational.prior_conditions.surgeries.map(s => `
                                    <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #7c3aed;">
                                        <strong>${s.surgery_type}</strong> - ${formatDate(s.surgery_date)}<br>
                                        <small style="color: #64748b;">Centro: ${s.hospital_clinic || '-'} | Cirujano: ${s.surgeon_name || '-'}</small>
                                        ${s.has_permanent_effects ? `<br><span style="color: #dc2626; font-weight: 500;">⚠️ Efectos permanentes: ${s.permanent_effects_details}</span>` : ''}
                                    </div>
                                `).join('') : '<p style="color: #7c3aed;">✅ Sin cirugías previas registradas</p>'}
                        </div>

                        <!-- Obra Social -->
                        <div style="background: #ebf8ff; padding: 20px; border-radius: 12px; border: 1px solid #90cdf4; margin-top: 20px;">
                            <h5 style="margin: 0 0 15px 0; color: #2b6cb0;">🏥 Obra Social / Prepaga</h5>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                                <div><strong>Proveedor:</strong><br>${employee.health_insurance_provider || 'No registrado'}</div>
                                <div><strong>Plan:</strong><br>${employee.health_insurance_plan || '-'}</div>
                                <div><strong>N° Afiliado:</strong><br>${employee.health_insurance_number || '-'}</div>
                                <div><strong>Vencimiento:</strong><br>${formatDate(employee.health_insurance_expiry) || '-'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- CAP 2: OCUPACIONAL - Durante el empleo -->
                    <div id="tab-ocupacional" class="tab-content-360" style="display: none;">
                        <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #16a34a;">
                            <h4 style="margin: 0; color: #15803d;">🟢 Historial OCUPACIONAL</h4>
                            <p style="margin: 5px 0 0 0; color: #16a34a; font-size: 0.9rem;">Todo lo ocurrido durante la relación laboral: exámenes periódicos, ausencias, accidentes, certificados</p>
                        </div>

                        <!-- Exámenes Periódicos -->
                        <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #86efac; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h5 style="margin: 0; color: #166534;">🩺 Exámenes Periódicos/Especiales</h5>
                                ${occupational?.next_exam_due ? `<span style="background: #fef3c7; padding: 6px 12px; border-radius: 12px; font-size: 0.85rem; color: #92400e;"><strong>📅 Próximo:</strong> ${formatDate(occupational.next_exam_due.next_exam_date)}</span>` : ''}
                            </div>
                            ${(occupational?.periodic_exams || []).length > 0 ? `
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead style="background: #dcfce7;">
                                        <tr>
                                            <th style="padding: 10px; text-align: left;">Tipo</th>
                                            <th style="padding: 10px; text-align: left;">Fecha</th>
                                            <th style="padding: 10px; text-align: left;">Resultado</th>
                                            <th style="padding: 10px; text-align: left;">Próximo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${occupational.periodic_exams.map(e => `
                                            <tr style="border-bottom: 1px solid #dcfce7;">
                                                <td style="padding: 10px;">${formatExamType(e.exam_type)}</td>
                                                <td style="padding: 10px;">${formatDate(e.exam_date)}</td>
                                                <td style="padding: 10px;"><span style="background: ${e.result === 'apto' ? '#dcfce7' : '#fef3c7'}; padding: 4px 10px; border-radius: 12px;">${e.result?.toUpperCase() || 'PENDIENTE'}</span></td>
                                                <td style="padding: 10px;">${formatDate(e.next_exam_date) || '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #166534;">Sin exámenes periódicos registrados</p>'}
                        </div>

                        <!-- Ausencias por tipo -->
                        <div style="background: #fff7ed; padding: 20px; border-radius: 12px; border: 1px solid #fed7aa; margin-bottom: 20px;">
                            <h5 style="margin: 0 0 15px 0; color: #c2410c;">📅 Historial de Ausencias (${statistics.total_absences} total - ${statistics.total_days_absent} días)</h5>
                            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 15px;">
                                <div style="background: #e3f2fd; padding: 10px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #1565c0;">${occupational?.absences?.by_type?.medical_illness?.length || 0}</div>
                                    <div style="font-size: 0.7rem; color: #1565c0;">🤒 Enfermedad</div>
                                </div>
                                <div style="background: #ffebee; padding: 10px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #c62828;">${occupational?.absences?.by_type?.work_accident?.length || 0}</div>
                                    <div style="font-size: 0.7rem; color: #c62828;">⚠️ Acc. Laboral</div>
                                </div>
                                <div style="background: #fff3e0; padding: 10px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #e65100;">${occupational?.absences?.by_type?.non_work_accident?.length || 0}</div>
                                    <div style="font-size: 0.7rem; color: #e65100;">🚗 Acc. No Lab.</div>
                                </div>
                                <div style="background: #f3e5f5; padding: 10px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #7b1fa2;">${occupational?.absences?.by_type?.occupational_disease?.length || 0}</div>
                                    <div style="font-size: 0.7rem; color: #7b1fa2;">🏭 Enf. Prof.</div>
                                </div>
                                <div style="background: #fce4ec; padding: 10px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #ad1457;">${occupational?.absences?.by_type?.maternity?.length || 0}</div>
                                    <div style="font-size: 0.7rem; color: #ad1457;">🤰 Maternidad</div>
                                </div>
                                <div style="background: #e8f5e9; padding: 10px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 1.5rem; font-weight: bold; color: #2e7d32;">${occupational?.absences?.by_type?.family_care?.length || 0}</div>
                                    <div style="font-size: 0.7rem; color: #2e7d32;">👨‍👩‍👧 Familiar</div>
                                </div>
                            </div>
                            <!-- Últimas 10 ausencias -->
                            ${(occupational?.absences?.all || []).length > 0 ? `
                                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                                    <thead style="background: #fed7aa;">
                                        <tr>
                                            <th style="padding: 8px;">Tipo</th>
                                            <th style="padding: 8px;">Período</th>
                                            <th style="padding: 8px;">Días</th>
                                            <th style="padding: 8px;">Estado</th>
                                            <th style="padding: 8px;">Diagnóstico</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${occupational.absences.all.slice(0, 10).map(a => `
                                            <tr style="border-bottom: 1px solid #fed7aa;">
                                                <td style="padding: 8px;">${formatAbsenceType(a.absence_type)}</td>
                                                <td style="padding: 8px;">${formatDate(a.start_date)} - ${formatDate(a.end_date) || 'Actual'}</td>
                                                <td style="padding: 8px;">${a.approved_days || a.requested_days || 0}</td>
                                                <td style="padding: 8px;"><span style="background: ${a.is_justified ? '#dcfce7' : '#fef3c7'}; padding: 3px 8px; border-radius: 10px; font-size: 0.8rem;">${a.is_justified ? '✅ Justificada' : a.case_status}</span></td>
                                                <td style="padding: 8px; font-size: 0.85rem;">${(a.final_diagnosis || a.employee_description || '-').substring(0, 40)}...</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #c2410c;">✅ Sin ausencias registradas durante el empleo</p>'}
                        </div>

                        <!-- Restricciones Laborales Activas -->
                        ${(occupational?.work_restrictions?.active || []).length > 0 ? `
                            <div style="background: #fef2f2; padding: 20px; border-radius: 12px; border: 1px solid #fecaca; margin-bottom: 20px;">
                                <h5 style="margin: 0 0 15px 0; color: #dc2626;">⚠️ Restricciones Laborales Activas</h5>
                                ${occupational.work_restrictions.active.map(r => `
                                    <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #dc2626;">
                                        <strong>${r.restriction_type}</strong> ${r.is_permanent ? '(PERMANENTE)' : `hasta ${formatDate(r.end_date)}`}<br>
                                        <span style="color: #64748b;">${r.description}</span>
                                        ${r.affects_current_role ? '<br><span style="color: #dc2626; font-weight: 500;">⚠️ Afecta rol actual</span>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <!-- Medicamentos Actuales -->
                        ${(occupational?.medications?.current || []).length > 0 ? `
                            <div style="background: #faf5ff; padding: 20px; border-radius: 12px; border: 1px solid #d8b4fe; margin-bottom: 20px;">
                                <h5 style="margin: 0 0 15px 0; color: #7c3aed;">💊 Medicamentos Actuales</h5>
                                ${occupational.medications.current.map(m => `
                                    <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong>${m.medication_name}</strong> - ${m.dosage} (${m.frequency})
                                            ${m.is_chronic ? '<span style="background: #fef3c7; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; margin-left: 8px;">CRÓNICO</span>' : ''}
                                        </div>
                                        <small style="color: #64748b;">Desde: ${formatDate(m.start_date)}</small>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <!-- Certificados -->
                        <div style="background: #f0f9ff; padding: 20px; border-radius: 12px; border: 1px solid #bae6fd;">
                            <h5 style="margin: 0 0 15px 0; color: #0369a1;">📄 Certificados Médicos (${certificates.length})</h5>
                            ${certificates.length > 0 ? `
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead style="background: #e0f2fe;"><tr><th style="padding: 8px;">N°</th><th style="padding: 8px;">Fecha</th><th style="padding: 8px;">Diagnóstico</th><th style="padding: 8px;">Días</th><th style="padding: 8px;">Estado</th></tr></thead>
                                    <tbody>
                                        ${certificates.slice(0, 10).map(c => `
                                            <tr style="border-bottom: 1px solid #e0f2fe;">
                                                <td style="padding: 8px;">${c.certificate_number || '-'}</td>
                                                <td style="padding: 8px;">${formatDate(c.issue_date)}</td>
                                                <td style="padding: 8px;">${c.diagnosis || '-'}</td>
                                                <td style="padding: 8px;">${c.requested_days || 0}</td>
                                                <td style="padding: 8px;"><span style="background: ${c.is_justified ? '#dcfce7' : '#fef3c7'}; padding: 3px 8px; border-radius: 10px;">${c.status || 'PENDIENTE'}</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color: #0369a1;">Sin certificados registrados</p>'}
                        </div>
                    </div>

                    <!-- CAP 3: POST-OCUPACIONAL - Al egreso -->
                    <div id="tab-post-ocupacional" class="tab-content-360" style="display: none;">
                        <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #dc2626;">
                            <h4 style="margin: 0; color: #b91c1c;">🔴 Exámenes POST-Ocupacionales</h4>
                            <p style="margin: 5px 0 0 0; color: #dc2626; font-size: 0.9rem;">Exámenes de egreso y estado final al dejar la empresa</p>
                        </div>

                        <!-- Examen de Egreso -->
                        <div style="background: #fef2f2; padding: 20px; border-radius: 12px; border: 1px solid #fecaca; margin-bottom: 20px;">
                            <h5 style="margin: 0 0 15px 0; color: #dc2626;">🔴 Examen de Retiro/Egreso</h5>
                            ${post_occupational?.has_exit_exam ? `
                                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
                                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                                        <div><strong>Fecha:</strong><br>${formatDate(post_occupational.last_exit_exam.exam_date)}</div>
                                        <div><strong>Resultado:</strong><br><span style="background: ${post_occupational.last_exit_exam.result === 'apto' ? '#dcfce7' : '#fef3c7'}; padding: 4px 10px; border-radius: 8px;">${post_occupational.last_exit_exam.result?.toUpperCase()}</span></div>
                                        <div><strong>Centro:</strong><br>${post_occupational.last_exit_exam.medical_center || '-'}</div>
                                        <div><strong>Médico:</strong><br>${post_occupational.last_exit_exam.examining_doctor || '-'}</div>
                                    </div>
                                    ${post_occupational.last_exit_exam.observations ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fecaca;"><strong>Observaciones:</strong><br>${post_occupational.last_exit_exam.observations}</div>` : ''}
                                </div>
                            ` : `
                                <div style="text-align: center; padding: 40px; color: #64748b;">
                                    <div style="font-size: 3rem; margin-bottom: 10px;">📋</div>
                                    <p>Sin examen de egreso registrado</p>
                                    <small>El examen post-ocupacional se realiza al finalizar la relación laboral</small>
                                </div>
                            `}
                        </div>

                        <!-- Condiciones Permanentes -->
                        <div style="background: #fffbeb; padding: 20px; border-radius: 12px; border: 1px solid #fcd34d;">
                            <h5 style="margin: 0 0 15px 0; color: #b45309;">⚡ Condiciones Permanentes al Egreso</h5>
                            ${(post_occupational?.permanent_conditions?.chronic || []).length > 0 ||
                              (post_occupational?.permanent_conditions?.permanent_restrictions || []).length > 0 ||
                              (post_occupational?.permanent_conditions?.permanent_effects_from_surgeries || []).length > 0 ? `
                                <!-- Condiciones crónicas -->
                                ${(post_occupational?.permanent_conditions?.chronic || []).length > 0 ? `
                                    <div style="margin-bottom: 15px;">
                                        <h6 style="color: #92400e;">Condiciones Crónicas Activas:</h6>
                                        ${post_occupational.permanent_conditions.chronic.map(c => `
                                            <span style="display: inline-block; background: #fef3c7; padding: 5px 12px; border-radius: 15px; margin: 3px; font-size: 0.9rem;">${c.condition_name || c.name}</span>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                <!-- Restricciones permanentes -->
                                ${(post_occupational?.permanent_conditions?.permanent_restrictions || []).length > 0 ? `
                                    <div style="margin-bottom: 15px;">
                                        <h6 style="color: #92400e;">Restricciones Permanentes:</h6>
                                        ${post_occupational.permanent_conditions.permanent_restrictions.map(r => `
                                            <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #f59e0b;">
                                                <strong>${r.restriction_type}</strong>: ${r.description}
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                <!-- Efectos de cirugías -->
                                ${(post_occupational?.permanent_conditions?.permanent_effects_from_surgeries || []).length > 0 ? `
                                    <div>
                                        <h6 style="color: #92400e;">Efectos Permanentes de Cirugías:</h6>
                                        ${post_occupational.permanent_conditions.permanent_effects_from_surgeries.map(s => `
                                            <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #dc2626;">
                                                <strong>${s.surgery_type}</strong> (${formatDate(s.surgery_date)})<br>
                                                <span style="color: #dc2626;">${s.permanent_effects_details}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            ` : '<p style="color: #b45309; text-align: center;">✅ Sin condiciones permanentes registradas</p>'}
                        </div>
                    </div>

                    <!-- TAB: FICHA MÉDICA (mantenida por compatibilidad como contacto) -->
                    <div id="tab-ficha" class="tab-content-360" style="display: none;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                            <div style="background: #fff5f5; padding: 20px; border-radius: 12px; border: 1px solid #feb2b2;">
                                <h5 style="margin: 0 0 15px 0; color: #c53030;">🚨 Alergias</h5>
                                ${allergiesHTML}
                            </div>
                            <div style="background: #fffaf0; padding: 20px; border-radius: 12px; border: 1px solid #fbd38d;">
                                <h5 style="margin: 0 0 15px 0; color: #c05621;">💊 Condiciones Crónicas</h5>
                                ${chronicHTML}
                            </div>
                        </div>
                    </div>

                    <!-- TAB: EXÁMENES OCUPACIONALES -->
                    <div id="tab-examenes" class="tab-content-360" style="display: none;">
                        ${medical_history.upcoming_exam ? `
                            <div style="background: #d4edda; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
                                <strong>📅 Próximo examen programado:</strong> ${formatExamType(medical_history.upcoming_exam.exam_type)} - ${formatDate(medical_history.upcoming_exam.next_exam_date)}
                            </div>
                        ` : ''}
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f8f9fa;">
                                    <tr>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Tipo</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Fecha</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Resultado</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Centro Médico</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Médico</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Próximo</th>
                                    </tr>
                                </thead>
                                <tbody>${examsHTML}</tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB: HISTORIAL AUSENCIAS -->
                    <div id="tab-ausencias" class="tab-content-360" style="display: none;">
                        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px;">
                            <div style="background: #e3f2fd; padding: 10px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #1565c0;">${absence_history.by_type?.medical_illness || 0}</div>
                                <div style="font-size: 0.75rem; color: #1565c0;">Enfermedad</div>
                            </div>
                            <div style="background: #ffebee; padding: 10px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #c62828;">${absence_history.by_type?.work_accident || 0}</div>
                                <div style="font-size: 0.75rem; color: #c62828;">Acc. Laboral</div>
                            </div>
                            <div style="background: #fff3e0; padding: 10px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #e65100;">${absence_history.by_type?.non_work_accident || 0}</div>
                                <div style="font-size: 0.75rem; color: #e65100;">Acc. No Lab.</div>
                            </div>
                            <div style="background: #fce4ec; padding: 10px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #ad1457;">${absence_history.by_type?.maternity || 0}</div>
                                <div style="font-size: 0.75rem; color: #ad1457;">Maternidad</div>
                            </div>
                            <div style="background: #e8f5e9; padding: 10px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #2e7d32;">${absence_history.by_type?.family_care || 0}</div>
                                <div style="font-size: 0.75rem; color: #2e7d32;">Familiar</div>
                            </div>
                            <div style="background: #f3e5f5; padding: 10px; border-radius: 8px; text-align: center;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #7b1fa2;">${absence_history.by_type?.occupational_disease || 0}</div>
                                <div style="font-size: 0.75rem; color: #7b1fa2;">Enf. Prof.</div>
                            </div>
                        </div>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f8f9fa;">
                                    <tr>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Tipo</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Período</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Días</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Estado</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Diagnóstico/Motivo</th>
                                    </tr>
                                </thead>
                                <tbody>${absencesHTML}</tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB: CERTIFICADOS -->
                    <div id="tab-certificados" class="tab-content-360" style="display: none;">
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f8f9fa;">
                                    <tr>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Nro. Certificado</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Fecha Emisión</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Diagnóstico</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Días</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>${certificatesHTML}</tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB: CONTACTO/EMERGENCIA -->
                    <div id="tab-contacto" class="tab-content-360" style="display: none;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
                            <div style="background: #f8f9fa; padding: 25px; border-radius: 12px;">
                                <h5 style="margin: 0 0 20px 0; color: #2c3e50;">👤 Datos del Empleado</h5>
                                <div style="display: grid; gap: 12px;">
                                    <div><strong>📧 Email:</strong> ${employee.email || '-'}</div>
                                    <div><strong>📱 Teléfono:</strong> ${employee.phone || '-'}</div>
                                    <div><strong>🆔 DNI:</strong> ${employee.dni || '-'}</div>
                                    <div><strong>📋 CUIL:</strong> ${employee.cuil || '-'}</div>
                                    <div><strong>📍 Dirección:</strong> ${employee.address || '-'}, ${employee.city || ''} ${employee.province || ''}</div>
                                    <div><strong>📅 Fecha Alta:</strong> ${formatDate(employee.hire_date) || '-'}</div>
                                    <div><strong>⏱️ Antigüedad:</strong> ${employee.seniority_years ? `${employee.seniority_years} años` : '-'}</div>
                                </div>
                            </div>
                            <div style="background: #fff5f5; padding: 25px; border-radius: 12px; border: 2px solid #feb2b2;">
                                <h5 style="margin: 0 0 20px 0; color: #c53030;">🚨 Contacto de Emergencia</h5>
                                <div style="display: grid; gap: 12px;">
                                    <div><strong>👤 Nombre:</strong> ${employee.emergency_contact_name || 'No registrado'}</div>
                                    <div><strong>📱 Teléfono:</strong> ${employee.emergency_contact_phone || '-'}</div>
                                    <div><strong>👥 Relación:</strong> ${employee.emergency_contact_relationship || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- FOOTER CON ACCIONES -->
                <div style="background: #f8f9fa; padding: 20px 30px; border-radius: 0 0 15px 15px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e9ecef;">
                    <div style="color: #6c757d; font-size: 0.85rem;">
                        Generado: ${new Date().toLocaleString('es-AR')}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="printMedical360()" class="btn" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer;">
                            🖨️ Imprimir
                        </button>
                        <button onclick="closeMedical360Modal()" class="btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showMedical360Tab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content-360').forEach(t => t.style.display = 'none');
    // Mostrar tab seleccionado
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.color = '#6c757d';
        btn.style.borderBottomColor = 'transparent';
    });
    document.querySelector(`[data-tab="${tabName}"]`).style.color = '#667eea';
    document.querySelector(`[data-tab="${tabName}"]`).style.borderBottomColor = '#667eea';
}

function closeMedical360Modal() {
    const modal = document.getElementById('medical360Modal');
    if (modal) modal.remove();
}

function printMedical360() {
    window.print();
}

// Helpers de formato
function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es-AR');
}

function formatExamType(type) {
    const types = {
        'preocupacional': '🔵 Preocupacional',
        'periodico': '🟢 Periódico',
        'reingreso': '🟡 Reingreso',
        'egreso': '🔴 Egreso',
        'cambio_puesto': '🟠 Cambio de Puesto',
        'especial': '🟣 Especial'
    };
    return types[type] || type;
}

function formatAbsenceType(type) {
    const types = {
        'medical_illness': '🤒 Enfermedad',
        'work_accident': '⚠️ Accidente Laboral',
        'non_work_accident': '🚗 Accidente No Laboral',
        'occupational_disease': '🏭 Enfermedad Profesional',
        'maternity': '🤰 Maternidad',
        'family_care': '👨‍👩‍👧 Cuidado Familiar',
        'authorized_leave': '✅ Licencia Autorizada',
        'unauthorized': '❌ No Autorizada'
    };
    return types[type] || type;
}

// ============================================================================
// ENTERPRISE DARK THEME STYLES - Medical Engine
// ============================================================================
function injectMedicalEnterpriseStyles() {
    if (document.getElementById('me-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'me-styles';
    styles.textContent = `
        /* CSS Variables - Medical Enterprise Dark Theme */
        :root {
            --me-bg-primary: #0f0f1a;
            --me-bg-secondary: #1a1a2e;
            --me-bg-tertiary: #252542;
            --me-bg-card: #1e1e35;
            --me-border: #2d2d4a;
            --me-text-primary: #e8e8f0;
            --me-text-secondary: #a0a0b8;
            --me-text-muted: #6b6b80;
            --me-accent-blue: #00d4ff;
            --me-accent-green: #00e676;
            --me-accent-yellow: #ffc107;
            --me-accent-red: #ff5252;
            --me-accent-purple: #b388ff;
            --me-accent-teal: #00bfa5;
        }

        .medical-enterprise {
            background: var(--me-bg-primary);
            min-height: 100vh;
            color: var(--me-text-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Header */
        .me-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            background: var(--me-bg-secondary);
            border-bottom: 1px solid var(--me-border);
        }

        .me-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .me-logo {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, var(--me-accent-teal), var(--me-accent-green));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .me-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 1px;
            margin: 0;
            background: linear-gradient(90deg, var(--me-accent-teal), var(--me-accent-green));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .me-subtitle {
            font-size: 11px;
            color: var(--me-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .me-header-center { display: flex; align-items: center; }

        .me-tech-badges {
            display: flex;
            gap: 8px;
        }

        .me-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .me-badge-api {
            background: rgba(0, 191, 165, 0.15);
            color: var(--me-accent-teal);
            border: 1px solid rgba(0, 191, 165, 0.3);
        }

        .me-badge-db {
            background: rgba(0, 230, 118, 0.15);
            color: var(--me-accent-green);
            border: 1px solid rgba(0, 230, 118, 0.3);
        }

        .me-badge-health {
            background: rgba(179, 136, 255, 0.15);
            color: var(--me-accent-purple);
            border: 1px solid rgba(179, 136, 255, 0.3);
        }

        .me-badge-count {
            background: rgba(0, 212, 255, 0.15);
            color: var(--me-accent-blue);
            border: 1px solid rgba(0, 212, 255, 0.3);
            padding: 6px 12px;
        }

        .me-header-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .me-period-selector {
            display: flex;
            gap: 8px;
        }

        .me-input-date {
            background: var(--me-bg-tertiary);
            border: 1px solid var(--me-border);
            color: var(--me-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
        }

        .me-input-date:focus {
            outline: none;
            border-color: var(--me-accent-teal);
        }

        /* Navigation */
        .me-nav {
            display: flex;
            gap: 4px;
            padding: 8px 24px;
            background: var(--me-bg-secondary);
            border-bottom: 1px solid var(--me-border);
            overflow-x: auto;
        }

        .me-nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: transparent;
            border: none;
            color: var(--me-text-secondary);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .me-nav-item:hover {
            background: var(--me-bg-tertiary);
            color: var(--me-text-primary);
        }

        .me-nav-item.active {
            background: linear-gradient(135deg, rgba(0, 191, 165, 0.2), rgba(0, 230, 118, 0.2));
            color: var(--me-accent-teal);
            border: 1px solid rgba(0, 191, 165, 0.3);
        }

        /* Main Content */
        .me-main {
            padding: 24px;
            max-width: 1600px;
            margin: 0 auto;
        }

        /* KPI Cards */
        .me-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .me-kpi-card {
            background: var(--me-bg-card);
            border: 1px solid var(--me-border);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .me-kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .me-kpi-icon {
            width: 52px;
            height: 52px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .me-kpi-info { flex: 1; }

        .me-kpi-value {
            font-size: 28px;
            font-weight: 700;
            display: block;
            line-height: 1.2;
        }

        .me-kpi-label {
            font-size: 12px;
            color: var(--me-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Search Bar */
        .me-search-bar {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
        }

        .me-search-input-wrapper {
            flex: 1;
            position: relative;
        }

        .me-search-input-wrapper svg {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--me-text-muted);
        }

        .me-search-input {
            width: 100%;
            background: var(--me-bg-card);
            border: 1px solid var(--me-border);
            color: var(--me-text-primary);
            padding: 12px 12px 12px 44px;
            border-radius: 8px;
            font-size: 14px;
        }

        .me-search-input:focus {
            outline: none;
            border-color: var(--me-accent-teal);
        }

        .me-search-input::placeholder {
            color: var(--me-text-muted);
        }

        /* Buttons */
        .me-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            background: var(--me-bg-tertiary);
            color: var(--me-text-primary);
            border: 1px solid var(--me-border);
        }

        .me-btn:hover {
            background: var(--me-bg-card);
            border-color: var(--me-accent-teal);
        }

        .me-btn-primary {
            background: linear-gradient(135deg, var(--me-accent-teal), var(--me-accent-green));
            color: white;
            border: none;
        }

        .me-btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .me-btn-sm {
            padding: 6px 12px;
            font-size: 12px;
        }

        .me-btn-icon {
            width: 40px;
            height: 40px;
            padding: 0;
            justify-content: center;
            border-radius: 8px;
        }

        /* Two Column Layout */
        .me-two-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
        }

        @media (max-width: 1024px) {
            .me-two-columns {
                grid-template-columns: 1fr;
            }
        }

        .me-column { display: flex; flex-direction: column; gap: 16px; }

        /* Cards */
        .me-card {
            background: var(--me-bg-card);
            border: 1px solid var(--me-border);
            border-radius: 12px;
            overflow: hidden;
        }

        .me-card-full { margin-bottom: 24px; }

        .me-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--me-border);
            background: var(--me-bg-tertiary);
        }

        .me-card-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            font-weight: 600;
            margin: 0;
            color: var(--me-text-primary);
        }

        .me-card-body {
            padding: 20px;
            max-height: 400px;
            overflow-y: auto;
        }

        /* Loading */
        .me-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: var(--me-text-muted);
        }

        .me-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid var(--me-border);
            border-top-color: var(--me-accent-teal);
            border-radius: 50%;
            animation: me-spin 1s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes me-spin {
            to { transform: rotate(360deg); }
        }

        /* Empty State */
        .me-empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--me-text-muted);
        }

        .me-empty-state svg {
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .me-empty-state h4 {
            margin: 0 0 8px 0;
            color: var(--me-text-secondary);
        }

        .me-empty-state p {
            margin: 0;
            font-size: 13px;
        }

        /* Quick Actions */
        .me-quick-actions {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .me-action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 20px 16px;
            background: var(--me-bg-tertiary);
            border: 1px solid var(--me-border);
            border-radius: 10px;
            color: var(--me-text-primary);
            cursor: pointer;
            transition: all 0.2s;
        }

        .me-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        }

        .me-action-btn span {
            font-size: 12px;
            font-weight: 500;
        }

        .me-action-photos:hover { border-color: var(--me-accent-blue); color: var(--me-accent-blue); }
        .me-action-studies:hover { border-color: var(--me-accent-purple); color: var(--me-accent-purple); }
        .me-action-audits:hover { border-color: var(--me-accent-green); color: var(--me-accent-green); }
        .me-action-report:hover { border-color: var(--me-accent-yellow); color: var(--me-accent-yellow); }

        /* Alerts */
        .me-alert {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 10px;
            font-size: 13px;
        }

        .me-alert:last-child { margin-bottom: 0; }

        .me-alert svg { flex-shrink: 0; margin-top: 2px; }

        .me-alert-warning {
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            color: var(--me-accent-yellow);
        }

        .me-alert-info {
            background: rgba(0, 212, 255, 0.1);
            border: 1px solid rgba(0, 212, 255, 0.3);
            color: var(--me-accent-blue);
        }

        .me-alert-danger {
            background: rgba(255, 82, 82, 0.1);
            border: 1px solid rgba(255, 82, 82, 0.3);
            color: var(--me-accent-red);
        }

        .me-alert strong { font-weight: 600; }

        /* Employees List Cards */
        .me-employee-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: var(--me-bg-tertiary);
            border: 1px solid var(--me-border);
            border-radius: 10px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .me-employee-card:hover {
            border-color: var(--me-accent-teal);
            transform: translateX(4px);
        }

        .me-employee-card:last-child { margin-bottom: 0; }

        .me-employee-avatar {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            background: linear-gradient(135deg, var(--me-accent-teal), var(--me-accent-green));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 16px;
        }

        .me-employee-info { flex: 1; }

        .me-employee-name {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
        }

        .me-employee-meta {
            font-size: 12px;
            color: var(--me-text-muted);
        }

        .me-employee-status {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .me-status-active {
            background: rgba(0, 230, 118, 0.15);
            color: var(--me-accent-green);
        }

        .me-status-leave {
            background: rgba(255, 193, 7, 0.15);
            color: var(--me-accent-yellow);
        }

        .me-status-alert {
            background: rgba(255, 82, 82, 0.15);
            color: var(--me-accent-red);
        }

        /* Pending Case Card */
        .me-case-card {
            padding: 14px;
            background: var(--me-bg-tertiary);
            border: 1px solid var(--me-border);
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .me-case-card:hover {
            border-color: var(--me-accent-purple);
        }

        .me-case-card:last-child { margin-bottom: 0; }

        .me-case-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .me-case-type {
            font-weight: 600;
            font-size: 13px;
        }

        .me-case-date {
            font-size: 11px;
            color: var(--me-text-muted);
        }

        .me-case-employee {
            font-size: 12px;
            color: var(--me-text-secondary);
        }

        /* Scrollbar */
        .me-card-body::-webkit-scrollbar {
            width: 6px;
        }

        .me-card-body::-webkit-scrollbar-track {
            background: var(--me-bg-primary);
        }

        .me-card-body::-webkit-scrollbar-thumb {
            background: var(--me-border);
            border-radius: 3px;
        }

        .me-card-body::-webkit-scrollbar-thumb:hover {
            background: var(--me-text-muted);
        }
    `;
    document.head.appendChild(styles);
}

// ✅ INIT FUNCTION - Patrón idéntico a users.js
window.initMedicalDashboard = function() {
    console.log('🩺 [MEDICAL-DASHBOARD] Inicializando Dashboard Médico Profesional...');

    // Mismo patrón que users.js - renderizar en mainContent
    showMedicaldashboardContent();

    // Cargar datos automáticamente después de renderizar
    setTimeout(() => {
        console.log('🔄 [MEDICAL-DASHBOARD] Cargando datos iniciales...');
        // Cargar casos pendientes reales
        loadPendingCases_real();
        // Cargar lista de empleados con carpeta médica
        loadEmployeesWithMedicalRecords();
    }, 300);
};

// ============================================================================
// EXPONER FUNCIONES AL SCOPE GLOBAL (window) PARA ONCLICK HANDLERS
// ============================================================================
window.openDiagnosisModal = openDiagnosisModal;
window.closeDiagnosisModal = closeDiagnosisModal;
window.openCloseCaseModal = openCloseCaseModal;
window.closeCloseCaseModal = closeCloseCaseModal;
window.openCaseChatModal = openCaseChatModal;
window.showMedicalMessage = showMedicalMessage;
window.loadPendingCases_real = loadPendingCases_real;
window.loadEmployeesWithMedicalRecords = loadEmployeesWithMedicalRecords;

})(); // Cierre del IIFE para protección contra doble carga
