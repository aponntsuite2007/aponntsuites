/**
 * ENTERPRISE LEGAL SYSTEM v3.0
 * Sistema de Comunicaciones Legales - Multi-Jurisdiccional
 *
 * Tecnologias: Node.js + PostgreSQL + Multi-Country Legal Framework
 * Arquitectura: Multi-tenant, Multi-Jurisdiction, Compliance Ready
 * SSOT: Disciplinario → legal_communications | Juicios → user_legal_issues
 *
 * @author Sistema Biometrico Enterprise
 * @version 3.0.0
 */

// Evitar doble carga del módulo
if (window.LegalEngine) {
    console.log('[LEGAL] Módulo ya cargado');
    throw new Error('LegalModule already loaded');
}

console.log('%c LEGAL ENGINE v3.0 - MULTI-JURISDICTION ', 'background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%); color: #ffc107; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
// Evitar redeclaración si el módulo se carga múltiples veces
if (typeof window.LegalState !== 'undefined') {
    console.log('⚖️ [LEGAL] Estado ya inicializado, usando instancia existente');
}
window.LegalState = window.LegalState || {
    communications: [],
    communicationTypes: [],
    judicialIssues: [],
    stats: {},
    jurisdiction: null, // Jurisdicción detectada automáticamente
    currentView: 'dashboard', // 'dashboard', 'cases', 'case-detail', 'deadlines'
    currentPage: 1,
    itemsPerPage: 20,
    isLoading: false,
    filters: {
        employee_id: '',
        type_id: '',
        status: ''
    },
    // ===== NUEVO: Estado para casos y workflow =====
    cases: [],
    currentCase: null,
    caseTimeline: [],
    caseDocuments: [],
    caseDeadlines: [],
    employee360: null,
    workflowStages: null,
    upcomingDeadlines: [],
    aiStatus: { available: false },
    aiAnalysis: null,
    helpVisible: true // Sistema de ayuda visible por defecto
};
// Local alias for backward compatibility (use var to allow redeclaration)
var LegalState = window.LegalState;

// ============================================================================
// HELP SYSTEM - Sistema de ayuda contextual con tooltips
// ============================================================================
// Evitar redeclaración si el módulo se carga múltiples veces
if (typeof window.LegalHelpSystem !== 'undefined') {
    console.log('⚖️ [LEGAL] LegalHelpSystem ya existe, usando instancia existente');
}
window.LegalHelpSystem = window.LegalHelpSystem || {
    // Definiciones de ayuda contextual
    tips: {
        dashboard: {
            title: 'Panel Legal',
            icon: '📊',
            content: 'Vista general de casos, vencimientos y métricas legales. Use las tarjetas KPI para ver el estado actual.',
            actions: ['Ver casos activos', 'Revisar vencimientos', 'Crear nuevo caso']
        },
        cases: {
            title: 'Gestión de Casos',
            icon: '⚖️',
            content: 'Aquí gestiona todos los expedientes legales: demandas, reclamos, mediaciones. Cada caso tiene un workflow completo con etapas.',
            actions: ['Crear caso', 'Ver timeline', 'Subir documentos']
        },
        workflow: {
            title: 'Workflow Legal',
            icon: '🔄',
            content: 'Los casos siguen un flujo: Prejudicial → Mediación → Judicial → Apelación → Ejecución → Cerrado. Cada etapa tiene sub-estados específicos.',
            stages: [
                { name: 'Prejudicial', desc: 'Intimaciones, cartas documento, negociaciones' },
                { name: 'Mediación', desc: 'Audiencias de mediación obligatoria' },
                { name: 'Judicial', desc: 'Proceso judicial: demanda, prueba, sentencia' },
                { name: 'Apelación', desc: 'Recursos ante Cámara' },
                { name: 'Ejecución', desc: 'Liquidación y cobro/pago' }
            ]
        },
        expediente360: {
            title: 'Expediente 360',
            icon: '👤',
            content: 'Al crear un caso, el sistema trae AUTOMÁTICAMENTE todo el historial del empleado: asistencia, sanciones, exámenes médicos, notificaciones, etc. No necesita solicitar nada adicional.',
            sections: ['Datos personales', 'Historial laboral', 'Asistencia', 'Sanciones', 'Médico', 'Vacaciones', 'Nómina']
        },
        timeline: {
            title: 'Línea de Tiempo',
            icon: '📅',
            content: 'Visualice cronológicamente todos los eventos del caso: documentos, audiencias, resoluciones, cambios de estado. Ideal para reconstruir los hechos.',
            tip: 'Los hitos importantes aparecen destacados con estrella ⭐'
        },
        documents: {
            title: 'Documentos',
            icon: '📁',
            content: 'Suba y organice todos los documentos del caso: demandas, contestaciones, pruebas, sentencias. Cada documento queda vinculado a la etapa correspondiente.',
            types: ['Contratos', 'Cartas documento', 'Escritos judiciales', 'Sentencias', 'Recibos']
        },
        deadlines: {
            title: 'Vencimientos',
            icon: '⏰',
            content: 'Gestione plazos procesales y vencimientos. El sistema envía alertas automáticas a abogados y RRHH a través del sistema de notificaciones central.',
            alerts: ['Crítico: menos de 24h', 'Urgente: menos de 3 días', 'Normal: más de 3 días']
        },
        ai: {
            title: 'Asistente IA',
            icon: '🤖',
            content: 'El sistema usa Ollama (Llama 3.1) para análisis inteligente: evaluación de riesgo, cálculo de exposición, sugerencias de documentos, resumen de casos.',
            capabilities: ['Análisis de riesgo', 'Cálculo de exposición', 'Sugerencia de documentos', 'Resumen ejecutivo', 'Detección de patrones']
        },
        immutability: {
            title: 'Inmutabilidad',
            icon: '🔒',
            content: 'Los registros legales se bloquean automáticamente después de 48 horas. Para modificar un registro bloqueado, debe solicitar autorización a RRHH.',
            rules: ['Ventana inicial: 48 horas', 'Post-autorización: 24 horas', 'Escalamiento: 2 niveles']
        }
    },

    // Renderiza un tooltip de ayuda
    renderTooltip(tipKey, position = 'right') {
        const tip = this.tips[tipKey];
        if (!tip) return '';

        return `
            <div class="le-help-tooltip le-help-${position}" data-tip="${tipKey}">
                <button class="le-help-trigger" onclick="LegalHelpSystem.showHelp('${tipKey}')">
                    <span class="le-help-icon">?</span>
                </button>
            </div>
        `;
    },

    // Muestra modal de ayuda
    showHelp(tipKey) {
        const tip = this.tips[tipKey];
        if (!tip) return;

        const modal = document.createElement('div');
        modal.className = 'le-help-modal';
        modal.innerHTML = `
            <div class="le-help-modal-content">
                <div class="le-help-modal-header">
                    <span class="le-help-modal-icon">${tip.icon}</span>
                    <h3>${tip.title}</h3>
                    <button class="le-help-modal-close" onclick="this.closest('.le-help-modal').remove()">×</button>
                </div>
                <div class="le-help-modal-body">
                    <p>${tip.content}</p>
                    ${tip.stages ? `
                        <div class="le-help-stages">
                            <h4>Etapas del Workflow:</h4>
                            ${tip.stages.map(s => `
                                <div class="le-help-stage">
                                    <strong>${s.name}</strong>
                                    <span>${s.desc}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${tip.sections ? `
                        <div class="le-help-list">
                            <h4>Secciones incluidas:</h4>
                            <ul>${tip.sections.map(s => `<li>${s}</li>`).join('')}</ul>
                        </div>
                    ` : ''}
                    ${tip.actions ? `
                        <div class="le-help-actions-list">
                            <h4>Acciones disponibles:</h4>
                            <ul>${tip.actions.map(a => `<li>✓ ${a}</li>`).join('')}</ul>
                        </div>
                    ` : ''}
                    ${tip.capabilities ? `
                        <div class="le-help-list">
                            <h4>Capacidades IA:</h4>
                            <ul>${tip.capabilities.map(c => `<li>🧠 ${c}</li>`).join('')}</ul>
                        </div>
                    ` : ''}
                    ${tip.rules ? `
                        <div class="le-help-list">
                            <h4>Reglas de inmutabilidad:</h4>
                            <ul>${tip.rules.map(r => `<li>🔒 ${r}</li>`).join('')}</ul>
                        </div>
                    ` : ''}
                    ${tip.tip ? `<p class="le-help-tip">💡 ${tip.tip}</p>` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Cerrar al hacer click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    // Renderiza barra de ayuda flotante
    renderHelpBar() {
        return `
            <div class="le-help-bar" id="le-help-bar">
                <div class="le-help-bar-content">
                    <span class="le-help-bar-icon">💡</span>
                    <span class="le-help-bar-text">
                        <strong>Bienvenido al Sistema Legal</strong> -
                        Haga clic en los iconos <span class="le-help-icon-inline">?</span> para obtener ayuda contextual.
                    </span>
                    <button class="le-help-bar-close" onclick="LegalHelpSystem.hideHelpBar()">×</button>
                </div>
            </div>
        `;
    },

    hideHelpBar() {
        const bar = document.getElementById('le-help-bar');
        if (bar) {
            bar.style.display = 'none';
            LegalState.helpVisible = false;
        }
    }
};

// Hacer LegalHelpSystem global para los onclick
window.LegalHelpSystem = LegalHelpSystem;

// ============================================================================
// API SERVICE
// ============================================================================
// Use var to allow redeclaration when module loads multiple times in SPA
if (typeof window.LegalAPI !== 'undefined') {
    console.log('⚖️ [LEGAL] LegalAPI ya existe, usando instancia existente');
}
window.LegalAPI = window.LegalAPI || {
    baseUrl: '/api/v1/legal',

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('authToken');
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
            console.error(`[LegalAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    // Jurisdiction (Multi-Country)
    getJurisdiction: () => LegalAPI.request('/jurisdiction'),
    getJurisdictionForEmployee: (employeeId) => LegalAPI.request(`/jurisdiction/employee/${employeeId}`),
    getAllJurisdictions: () => LegalAPI.request('/jurisdiction/all'),

    // Communication Types
    getTypes: () => LegalAPI.request('/communication-types'),

    // Communications (Disciplinario - SSOT)
    getCommunications: (params = '') => LegalAPI.request(`/communications${params}`),
    getCommunication: (id) => LegalAPI.request(`/communications/${id}`),
    createCommunication: (data) => LegalAPI.request('/communications', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id, data) => LegalAPI.request(`/communications/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),

    // Legal Issues (Juicios/Mediaciones - SSOT)
    getIssues: (params = '') => LegalAPI.request(`/issues${params}`),
    createIssue: (data) => LegalAPI.request('/issues', { method: 'POST', body: JSON.stringify(data) }),
    updateIssue: (id, data) => LegalAPI.request(`/issues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteIssue: (id) => LegalAPI.request(`/issues/${id}`, { method: 'DELETE' }),

    // Employee Legal 360
    getEmployeeLegal360: (employeeId) => LegalAPI.request(`/employee/${employeeId}/legal-360`),

    // Stats
    getStats: () => LegalAPI.request('/dashboard/stats'),

    // =================== INMUTABILIDAD Y AUTORIZACIONES ===================
    // Sistema de ventanas de tiempo y autorización RRHH (patrón médico)

    // Verificar editabilidad de registro (ventana 48h o autorización activa)
    checkEditability: (table, recordId) => LegalAPI.request(`/editability/${table}/${recordId}`),

    // Solicitar autorización para editar/eliminar registro bloqueado
    requestAuthorization: (data) => LegalAPI.request('/authorization/request', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Aprobar autorización (solo RRHH/admin)
    approveAuthorization: (id, response) => LegalAPI.request(`/authorization/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ response })
    }),

    // Rechazar autorización (solo RRHH/admin)
    rejectAuthorization: (id, response) => LegalAPI.request(`/authorization/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ response })
    }),

    // Listar autorizaciones pendientes (para RRHH)
    getPendingAuthorizations: () => LegalAPI.request('/authorizations/pending'),

    // Mis solicitudes de autorización
    getMyAuthorizationRequests: (status = '') => LegalAPI.request(`/authorizations/my-requests${status ? '?status=' + status : ''}`),

    // Actualizar registro con verificación de inmutabilidad
    updateRecordSecure: (table, id, data) => LegalAPI.request(`/record/${table}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Eliminar registro con verificación de inmutabilidad
    deleteRecordSecure: (table, id, reason) => LegalAPI.request(`/record/${table}/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason })
    }),

    // =================== CASOS LEGALES (WORKFLOW COMPLETO) ===================

    // Listar casos legales
    getCases: (params = '') => LegalAPI.request(`/cases${params}`),

    // Obtener caso por ID
    getCase: (id) => LegalAPI.request(`/cases/${id}`),

    // Crear nuevo caso
    createCase: (data) => LegalAPI.request('/cases', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Avanzar etapa del caso
    advanceCaseStage: (id, data) => LegalAPI.request(`/cases/${id}/advance-stage`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Actualizar sub-estado
    updateCaseSubStatus: (id, data) => LegalAPI.request(`/cases/${id}/sub-status`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Cerrar caso
    closeCase: (id, data) => LegalAPI.request(`/cases/${id}/close`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    // Timeline del caso
    getCaseTimeline: (id) => LegalAPI.request(`/cases/${id}/timeline`),
    addTimelineEvent: (id, data) => LegalAPI.request(`/cases/${id}/timeline`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Documentos del caso
    getCaseDocuments: (id) => LegalAPI.request(`/cases/${id}/documents`),
    addCaseDocument: (id, data) => LegalAPI.request(`/cases/${id}/documents`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Vencimientos del caso
    getCaseDeadlines: (id, status = '') => LegalAPI.request(`/cases/${id}/deadlines${status ? '?status=' + status : ''}`),
    createCaseDeadline: (id, data) => LegalAPI.request(`/cases/${id}/deadlines`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Etapas del workflow
    getWorkflowStages: () => LegalAPI.request('/workflow/stages'),

    // Expediente 360 del caso
    getCaseEmployee360: (caseId) => LegalAPI.request(`/cases/${caseId}/employee-360`),

    // Expediente 360 de empleado
    getEmployee360Full: (employeeId) => LegalAPI.request(`/employee/${employeeId}/360`),

    // Vencimientos globales
    getUpcomingDeadlines: (days = 7) => LegalAPI.request(`/deadlines/upcoming?days=${days}`),
    completeDeadline: (id) => LegalAPI.request(`/deadlines/${id}/complete`, { method: 'PUT' }),

    // =================== INTELIGENCIA ARTIFICIAL (OLLAMA) ===================

    // Estado de IA
    getAIStatus: () => LegalAPI.request('/ai/status'),

    // Análisis de riesgo
    analyzeRisk: (caseId) => LegalAPI.request('/ai/analyze-risk', {
        method: 'POST',
        body: JSON.stringify({ case_id: caseId })
    }),

    // Resumen del caso
    generateCaseSummary: (caseId) => LegalAPI.request('/ai/case-summary', {
        method: 'POST',
        body: JSON.stringify({ case_id: caseId })
    }),

    // Analizar historial empleado
    analyzeEmployee: (employeeId) => LegalAPI.request('/ai/analyze-employee', {
        method: 'POST',
        body: JSON.stringify({ employee_id: employeeId })
    }),

    // Calcular exposición económica
    calculateExposure: (caseId) => LegalAPI.request('/ai/calculate-exposure', {
        method: 'POST',
        body: JSON.stringify({ case_id: caseId })
    }),

    // Sugerir documentos
    suggestDocuments: (caseType, currentDocs = []) => LegalAPI.request('/ai/suggest-documents', {
        method: 'POST',
        body: JSON.stringify({ case_type: caseType, current_documents: currentDocs })
    }),

    // Asistente de consultas
    askAssistant: (question, context = {}) => LegalAPI.request('/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ question, context })
    }),

    // Analizar timeline
    analyzeTimeline: (caseId) => LegalAPI.request('/ai/analyze-timeline', {
        method: 'POST',
        body: JSON.stringify({ case_id: caseId })
    }),

    // Recomendaciones proactivas
    getAIRecommendations: () => LegalAPI.request('/ai/recommendations'),

    // Análisis previos
    getPreviousAnalyses: (caseId, type = '') => LegalAPI.request(`/ai/previous-analyses/${caseId}${type ? '?type=' + type : ''}`),

    // =================== ALIASES Y HELPERS ===================

    // Alias para consistencia
    getCaseById: (id) => LegalAPI.getCase(id),
    getEmployee360: (employeeId) => LegalAPI.getEmployee360Full(employeeId),

    // Obtener empleados de la empresa
    getEmployees: async () => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token') || sessionStorage.getItem('authToken');
        try {
            const response = await fetch('/api/v1/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            return { success: true, data: data.users || data.data || data };
        } catch (error) {
            console.error('[LegalAPI] getEmployees:', error);
            return { success: false, data: [] };
        }
    }
};
// Local alias for backward compatibility (use var to allow redeclaration)
var LegalAPI = window.LegalAPI;

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================
function showLegalDashboardContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    // Placeholder para badges de jurisdicción (se actualizarán dinámicamente)
    content.innerHTML = `
        <div id="legal-enterprise" class="legal-enterprise">
            <!-- Header Enterprise -->
            <header class="le-header">
                <div class="le-header-left">
                    <div class="le-logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                            <path d="M9 12l2 2 4-4"/>
                        </svg>
                    </div>
                    <div class="le-title-block">
                        <h1 class="le-title">LEGAL ENGINE</h1>
                        <span class="le-subtitle">Multi-Jurisdiction Compliance System</span>
                    </div>
                </div>
                <div class="le-header-center">
                    <div class="le-tech-badges" id="le-jurisdiction-badges">
                        <!-- Badges se cargan dinámicamente según jurisdicción -->
                        <span class="le-badge le-badge-law">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                            <span id="le-law-name">Cargando...</span>
                        </span>
                        <span class="le-badge le-badge-db" title="PostgreSQL Database">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.87 0 6 1.5 6 2s-2.13 2-6 2-6-1.5-6-2 2.13-2 6-2z"/></svg>
                            PostgreSQL
                        </span>
                        <span class="le-badge le-badge-secure" title="Multi-Jurisdiction">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                            <span id="le-region-name">Global</span>
                        </span>
                    </div>
                </div>
                <div class="le-header-right">
                    <button onclick="LegalEngine.refresh()" class="le-btn le-btn-icon" title="Refresh Data">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    </button>
                </div>
            </header>

            <!-- Navigation Tabs -->
            <nav class="le-nav">
                <button class="le-nav-item active" data-view="dashboard" onclick="LegalEngine.showView('dashboard')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Dashboard
                </button>
                <button class="le-nav-item" data-view="cases" onclick="LegalEngine.showView('cases')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                    ⚖️ Casos
                </button>
                <button class="le-nav-item" data-view="communications" onclick="LegalEngine.showView('communications')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                    Comunicaciones
                </button>
                <button class="le-nav-item" data-view="deadlines" onclick="LegalEngine.showView('deadlines')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ⏰ Vencimientos
                </button>
                <button class="le-nav-item" data-view="types" onclick="LegalEngine.showView('types')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                    Tipos
                </button>
                <button class="le-nav-item" data-view="new" onclick="LegalEngine.showView('new')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    Nueva
                </button>
                <button class="le-nav-item le-nav-help" data-view="help" onclick="LegalHelpSystem.showHelp('dashboard')" title="Ayuda contextual">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    ❓ Ayuda
                </button>
            </nav>

            <!-- Help Bar - Barra sutil -->
            <div class="le-help-bar" id="le-help-bar">
                <span class="le-help-bar-text">💡 Use ❓ para ayuda</span>
                <button class="le-help-bar-close" onclick="document.getElementById('le-help-bar').style.display='none'">×</button>
            </div>

            <!-- Main Content Area -->
            <main class="le-main" id="le-content">
                <div class="le-loading">
                    <div class="le-spinner"></div>
                    <span>Cargando datos...</span>
                </div>
            </main>
        </div>
    `;

    injectLegalStyles();
    LegalEngine.init();
}

// Alias para compatibilidad
window.showLegalDashboard = showLegalDashboardContent;
window.showLegalDashboardContent = showLegalDashboardContent;

// ============================================================================
// LEGAL ENGINE - Main Controller
// ============================================================================
const LegalEngine = {
    async init() {
        await this.loadInitialData();
        this.updateJurisdictionBadges();
        await this.showView('dashboard');
    },

    async loadInitialData() {
        try {
            const [typesResult, statsResult, jurisdictionResult] = await Promise.all([
                LegalAPI.getTypes().catch(() => ({ data: [] })),
                LegalAPI.getStats().catch(() => ({ data: {} })),
                LegalAPI.getJurisdiction().catch(() => ({ data: null }))
            ]);
            LegalState.communicationTypes = typesResult.data || [];
            LegalState.stats = statsResult.data || {};
            LegalState.jurisdiction = jurisdictionResult.data || null;

            console.log('[LegalEngine] Jurisdicción detectada:', LegalState.jurisdiction);
        } catch (e) {
            console.error('[LegalEngine] Error loading initial data:', e);
        }
    },

    // Actualiza los badges del header según la jurisdicción detectada
    updateJurisdictionBadges() {
        const jurisdiction = LegalState.jurisdiction;
        const lawNameEl = document.getElementById('le-law-name');
        const regionNameEl = document.getElementById('le-region-name');

        if (jurisdiction && jurisdiction.law) {
            lawNameEl.textContent = jurisdiction.law.code || jurisdiction.law.name || 'Labor Law';
            lawNameEl.title = jurisdiction.law.fullName || jurisdiction.law.name || '';
            regionNameEl.textContent = jurisdiction.region || 'Global';

            // Actualizar tooltip del badge de ley
            const lawBadge = lawNameEl.closest('.le-badge');
            if (lawBadge) {
                lawBadge.title = jurisdiction.law.fullName || `${jurisdiction.law.name} - ${jurisdiction.countryName || ''}`;
            }
        } else {
            lawNameEl.textContent = 'Multi-Jurisdiction';
            regionNameEl.textContent = 'Global';
        }
    },

    // Obtiene el texto de base legal según jurisdicción y tipo
    getLegalBasisText(communicationType) {
        const jurisdiction = LegalState.jurisdiction;
        if (!jurisdiction || !jurisdiction.law) {
            return 'Según legislación laboral aplicable';
        }

        const law = jurisdiction.law;
        const category = communicationType?.category || '';

        if (category === 'disciplinaria' || category === 'apercibimiento' || category === 'suspension') {
            return `${law.fullName || law.name} - ${law.disciplinaryArticles || 'Artículos disciplinarios aplicables'}`;
        } else if (category === 'despido') {
            return `${law.fullName || law.name} - ${law.dismissalArticles || 'Artículos de despido aplicables'}`;
        }
        return `${law.fullName || law.name} - ${law.sanctionsArticles || law.disciplinaryArticles || 'Según normativa'}`;
    },

    // Genera el badge de estado de compliance según jurisdicción
    getComplianceStatusBadge() {
        const jurisdiction = LegalState.jurisdiction;
        if (jurisdiction && jurisdiction.law) {
            return `${jurisdiction.law.code || jurisdiction.region} Compliant`;
        }
        return 'Compliance Ready';
    },

    // Genera el mensaje de compliance según jurisdicción
    getComplianceMessage(stats) {
        const jurisdiction = LegalState.jurisdiction;
        if (jurisdiction && jurisdiction.law) {
            const lawName = jurisdiction.law.fullName || jurisdiction.law.name;
            const authority = jurisdiction.law.authority || 'Autoridad laboral correspondiente';
            return `Sistema configurado según ${lawName}. Autoridad competente: ${authority}. `;
        }
        return 'Sistema multi-jurisdiccional configurado para compliance con legislación laboral local. ';
    },

    async showView(view) {
        LegalState.currentView = view;

        // Update nav active state
        document.querySelectorAll('.le-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const content = document.getElementById('le-content');
        content.innerHTML = '<div class="le-loading"><div class="le-spinner"></div><span>Cargando...</span></div>';

        try {
            switch(view) {
                case 'dashboard': await this.renderDashboard(); break;
                case 'cases': await this.renderCases(); break;
                case 'communications': await this.renderCommunications(); break;
                case 'deadlines': await this.renderDeadlines(); break;
                case 'types': await this.renderTypes(); break;
                case 'new': await this.renderNewCommunication(); break;
                case 'case-detail': await this.renderCaseDetail(); break;
            }
        } catch (error) {
            content.innerHTML = `<div class="le-error"><span>Error: ${error.message}</span></div>`;
        }
    },

    async refresh() {
        await this.loadInitialData();
        await this.showView(LegalState.currentView);
    },

    // ========================================================================
    // DASHBOARD VIEW
    // ========================================================================
    async renderDashboard() {
        const content = document.getElementById('le-content');
        const stats = LegalState.stats.general || {};
        const byType = LegalState.stats.by_type || [];
        const byEmployee = LegalState.stats.by_employee || [];

        content.innerHTML = `
            <div class="le-dashboard">
                <!-- KPI Cards -->
                <div class="le-kpi-grid">
                    <div class="le-kpi-card">
                        <div class="le-kpi-icon" style="background: var(--accent-blue);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                        </div>
                        <div class="le-kpi-data">
                            <span class="le-kpi-value">${stats.total_communications || 0}</span>
                            <span class="le-kpi-label">Total Comunicaciones</span>
                        </div>
                    </div>
                    <div class="le-kpi-card">
                        <div class="le-kpi-icon" style="background: var(--accent-yellow);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div class="le-kpi-data">
                            <span class="le-kpi-value">${stats.draft_count || 0}</span>
                            <span class="le-kpi-label">Borradores</span>
                        </div>
                    </div>
                    <div class="le-kpi-card">
                        <div class="le-kpi-icon" style="background: var(--accent-purple);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </div>
                        <div class="le-kpi-data">
                            <span class="le-kpi-value">${stats.sent_count || 0}</span>
                            <span class="le-kpi-label">Enviadas</span>
                        </div>
                    </div>
                    <div class="le-kpi-card">
                        <div class="le-kpi-icon" style="background: var(--accent-green);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <div class="le-kpi-data">
                            <span class="le-kpi-value">${stats.delivered_count || 0}</span>
                            <span class="le-kpi-label">Entregadas</span>
                        </div>
                    </div>
                </div>

                <!-- Activity Summary -->
                <div class="le-finance-cards">
                    <div class="le-finance-card le-finance-gross">
                        <div class="le-finance-header">
                            <span class="le-finance-label">Últimos 7 días</span>
                            <span class="le-finance-period">Actividad reciente</span>
                        </div>
                        <div class="le-finance-value">${stats.last_7_days || 0}</div>
                        <div class="le-finance-sublabel">comunicaciones generadas</div>
                    </div>
                    <div class="le-finance-card le-finance-net">
                        <div class="le-finance-header">
                            <span class="le-finance-label">Últimos 30 días</span>
                            <span class="le-finance-period">Período mensual</span>
                        </div>
                        <div class="le-finance-value">${stats.last_30_days || 0}</div>
                        <div class="le-finance-sublabel">comunicaciones generadas</div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="le-section">
                    <h3 class="le-section-title">Acciones Rápidas</h3>
                    <div class="le-actions-grid">
                        <button onclick="LegalEngine.showView('new')" class="le-action-btn">
                            <div class="le-action-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
                            <span>Nueva Comunicación</span>
                        </button>
                        <button onclick="LegalEngine.showView('communications')" class="le-action-btn">
                            <div class="le-action-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div>
                            <span>Ver Comunicaciones</span>
                        </button>
                        <button onclick="LegalEngine.showView('types')" class="le-action-btn">
                            <div class="le-action-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div>
                            <span>Tipos de Comunicación</span>
                        </button>
                        <button onclick="LegalEngine.exportReport()" class="le-action-btn">
                            <div class="le-action-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
                            <span>Exportar Reporte</span>
                        </button>
                    </div>
                </div>

                <!-- By Type Summary -->
                ${byType.length > 0 ? `
                <div class="le-section">
                    <h3 class="le-section-title">Por Tipo de Comunicación</h3>
                    <div class="le-table-container">
                        <table class="le-table">
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Categoría</th>
                                    <th>Severidad</th>
                                    <th>Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${byType.map(t => `
                                    <tr>
                                        <td>${t.name}</td>
                                        <td><span class="le-badge le-badge-info">${t.category || '-'}</span></td>
                                        <td><span class="le-badge le-badge-${this.getSeverityClass(t.severity)}">${t.severity || '-'}</span></td>
                                        <td><strong>${t.count || 0}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}

                <!-- Compliance Panel - Multi-Jurisdiction -->
                <div class="le-ai-panel">
                    <div class="le-ai-header">
                        <div class="le-ai-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                            Compliance Status
                        </div>
                        <span class="le-ai-status">${this.getComplianceStatusBadge()}</span>
                    </div>
                    <div class="le-ai-content">
                        <div class="le-ai-insight">
                            <span class="le-ai-icon">⚖️</span>
                            <p>${this.getComplianceMessage(stats)}
                            ${stats.draft_count > 0 ? `<strong class="le-text-warning">Atención: ${stats.draft_count} comunicaciones en borrador pendientes de envío.</strong>` : 'Todas las comunicaciones procesadas correctamente.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // COMMUNICATIONS LIST VIEW
    // ========================================================================
    async renderCommunications() {
        const content = document.getElementById('le-content');

        let communications = [];
        try {
            const params = new URLSearchParams({
                page: LegalState.currentPage,
                limit: LegalState.itemsPerPage,
                ...LegalState.filters
            });
            const result = await LegalAPI.getCommunications(`?${params}`);
            communications = result.data || [];
            LegalState.communications = communications;
        } catch (e) {
            console.error('Error loading communications:', e);
        }

        const typeOptions = LegalState.communicationTypes.map(t =>
            `<option value="${t.id}">${t.name}</option>`
        ).join('');

        content.innerHTML = `
            <div class="le-communications">
                <!-- Filters -->
                <div class="le-filters">
                    <select class="le-select" onchange="LegalEngine.setFilter('type_id', this.value)">
                        <option value="">Todos los tipos</option>
                        ${typeOptions}
                    </select>
                    <select class="le-select" onchange="LegalEngine.setFilter('status', this.value)">
                        <option value="">Todos los estados</option>
                        <option value="draft">Borrador</option>
                        <option value="sent">Enviado</option>
                        <option value="delivered">Entregado</option>
                        <option value="responded">Respondido</option>
                        <option value="closed">Cerrado</option>
                    </select>
                    <button class="le-btn le-btn-primary" onclick="LegalEngine.applyFilters()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Filtrar
                    </button>
                    <button class="le-btn" onclick="LegalEngine.showView('new')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        Nueva
                    </button>
                </div>

                <!-- Table -->
                <div class="le-table-container">
                    ${communications.length === 0 ? `
                        <div class="le-empty">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                            <h3>No hay comunicaciones</h3>
                            <p>Crea una nueva comunicación legal para comenzar.</p>
                        </div>
                    ` : `
                        <table class="le-table">
                            <thead>
                                <tr>
                                    <th>Referencia</th>
                                    <th>Empleado</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Asunto</th>
                                    <th>Fecha</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${communications.map(c => `
                                    <tr>
                                        <td><code>${c.reference_number || '-'}</code></td>
                                        <td>
                                            <strong>${c.employee_first_name || ''} ${c.employee_last_name || ''}</strong>
                                            <br><small>${c.employee_code || ''}</small>
                                        </td>
                                        <td>
                                            <span class="le-badge le-badge-info">${c.type_name || '-'}</span>
                                            <br><small class="le-badge le-badge-${this.getSeverityClass(c.severity)}">${c.severity || ''}</small>
                                        </td>
                                        <td><span class="le-status le-status-${c.status}">${this.getStatusText(c.status)}</span></td>
                                        <td>${c.subject || '-'}</td>
                                        <td><small>${this.formatDate(c.created_at)}</small></td>
                                        <td>
                                            <div class="le-actions">
                                                <button class="le-btn-sm" onclick="LegalEngine.viewCommunication('${c.id}')" title="Ver">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                </button>
                                                ${c.pdf_path ? `
                                                <button class="le-btn-sm" onclick="LegalEngine.downloadPDF('${c.id}')" title="PDF">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                                                </button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;
    },

    // ========================================================================
    // TYPES VIEW
    // ========================================================================
    async renderTypes() {
        const content = document.getElementById('le-content');
        const types = LegalState.communicationTypes;

        content.innerHTML = `
            <div class="le-types">
                <div class="le-section">
                    <h3 class="le-section-title">Tipos de Comunicación Legal Disponibles</h3>
                    <p class="le-section-desc">Configurados según legislación laboral argentina (LCT)</p>
                </div>

                <div class="le-table-container">
                    ${types.length === 0 ? `
                        <div class="le-empty">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                            <h3>No hay tipos configurados</h3>
                            <p>Ejecute la migración de tipos de comunicación legal.</p>
                        </div>
                    ` : `
                        <table class="le-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Categoría</th>
                                    <th>Severidad</th>
                                    <th>Base Legal</th>
                                    <th>Requiere Respuesta</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${types.map(t => `
                                    <tr>
                                        <td><strong>${t.name}</strong></td>
                                        <td><span class="le-badge le-badge-info">${t.category || '-'}</span></td>
                                        <td><span class="le-badge le-badge-${this.getSeverityClass(t.severity)}">${t.severity || '-'}</span></td>
                                        <td><small>${t.legal_basis || '-'}</small></td>
                                        <td>${t.requires_response ? '✅ Sí' : '❌ No'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;
    },

    // ========================================================================
    // NEW COMMUNICATION VIEW
    // ========================================================================
    async renderNewCommunication() {
        const content = document.getElementById('le-content');
        const types = LegalState.communicationTypes;

        const typeOptions = types.map(t =>
            `<option value="${t.id}" data-legal-basis="${t.legal_basis || ''}">${t.name} (${(t.category || '').toUpperCase()})</option>`
        ).join('');

        content.innerHTML = `
            <div class="le-new-communication">
                <div class="le-section">
                    <h3 class="le-section-title">Nueva Comunicación Legal</h3>
                    <p class="le-section-desc">Complete los datos para generar una nueva comunicación</p>
                </div>

                <form id="newCommunicationForm" class="le-form" onsubmit="LegalEngine.createCommunication(event)">
                    <div class="le-form-row">
                        <div class="le-form-group">
                            <label>Empleado *</label>
                            <input type="text" id="employee-search" class="le-input" placeholder="Buscar por nombre o ID..." required>
                            <div id="employee-results" class="le-search-results"></div>
                            <input type="hidden" id="selected-employee-id">
                        </div>
                        <div class="le-form-group">
                            <label>Tipo de Comunicación *</label>
                            <select id="communication-type" class="le-select" required onchange="LegalEngine.updateLegalBasis()">
                                <option value="">Seleccionar tipo...</option>
                                ${typeOptions}
                            </select>
                        </div>
                    </div>

                    <div class="le-form-group">
                        <label>Base Legal</label>
                        <textarea id="legal-basis" class="le-textarea" rows="2" readonly placeholder="Se completará automáticamente según el tipo"></textarea>
                    </div>

                    <div class="le-form-group">
                        <label>Asunto *</label>
                        <input type="text" id="subject" class="le-input" placeholder="Asunto de la comunicación" required>
                    </div>

                    <div class="le-form-group">
                        <label>Descripción</label>
                        <textarea id="description" class="le-textarea" rows="3" placeholder="Descripción general"></textarea>
                    </div>

                    <div class="le-form-group">
                        <label>Hechos que Motivan la Medida *</label>
                        <textarea id="facts-description" class="le-textarea" rows="4" required placeholder="Descripción detallada de los hechos..."></textarea>
                    </div>

                    <div class="le-form-row">
                        <div class="le-form-group">
                            <label>Fecha Programada (opcional)</label>
                            <input type="datetime-local" id="scheduled-date" class="le-input">
                        </div>
                        <div class="le-form-group le-checkbox-group">
                            <label class="le-checkbox">
                                <input type="checkbox" id="generate-pdf" checked>
                                <span>Generar PDF automáticamente</span>
                            </label>
                        </div>
                    </div>

                    <div class="le-form-actions">
                        <button type="button" class="le-btn" onclick="LegalEngine.showView('communications')">Cancelar</button>
                        <button type="submit" class="le-btn le-btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            Crear Comunicación
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Setup employee search
        document.getElementById('employee-search')?.addEventListener('input', (e) => {
            this.searchEmployees(e.target.value);
        });
    },

    // ========================================================================
    // HELPER METHODS
    // ========================================================================
    setFilter(key, value) {
        LegalState.filters[key] = value;
    },

    async applyFilters() {
        LegalState.currentPage = 1;
        await this.showView('communications');
    },

    updateLegalBasis() {
        const select = document.getElementById('communication-type');
        const selectedOption = select.options[select.selectedIndex];
        const legalBasis = selectedOption.getAttribute('data-legal-basis');
        document.getElementById('legal-basis').value = legalBasis || '';
    },

    async searchEmployees(query) {
        if (!query || query.length < 2) {
            document.getElementById('employee-results').innerHTML = '';
            return;
        }
        // TODO: Implementar búsqueda real de empleados
        document.getElementById('employee-results').innerHTML = `
            <div class="le-search-item" onclick="LegalEngine.selectEmployee('emp-1', 'Juan Pérez', 'EMP001')">
                <strong>Juan Pérez</strong> - EMP001
            </div>
        `;
    },

    selectEmployee(id, name, code) {
        document.getElementById('employee-search').value = `${name} (${code})`;
        document.getElementById('selected-employee-id').value = id;
        document.getElementById('employee-results').innerHTML = '';
    },

    async createCommunication(event) {
        event.preventDefault();

        const formData = {
            employee_id: document.getElementById('selected-employee-id').value,
            type_id: document.getElementById('communication-type').value,
            subject: document.getElementById('subject').value,
            description: document.getElementById('description').value,
            facts_description: document.getElementById('facts-description').value,
            scheduled_date: document.getElementById('scheduled-date').value || null,
            generate_pdf: document.getElementById('generate-pdf').checked
        };

        if (!formData.employee_id) {
            alert('❌ Debe seleccionar un empleado');
            return;
        }

        try {
            await LegalAPI.createCommunication(formData);
            alert('✅ Comunicación legal creada exitosamente');
            await this.showView('communications');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    },

    async viewCommunication(id) {
        // TODO: Implementar modal de visualización
        console.log('Ver comunicación:', id);
        alert('Función en desarrollo');
    },

    async downloadPDF(id) {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch(`/api/v1/legal/communications/${id}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comunicacion-legal-${id}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('❌ Error descargando PDF');
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    },

    exportReport() {
        alert('📊 Función de exportación en desarrollo');
    },

    getStatusText(status) {
        const map = {
            draft: 'Borrador',
            generated: 'Generado',
            sent: 'Enviado',
            delivered: 'Entregado',
            responded: 'Respondido',
            closed: 'Cerrado'
        };
        return map[status] || status || '-';
    },

    getSeverityClass(severity) {
        const map = {
            critical: 'danger',
            high: 'warning',
            medium: 'info',
            low: 'success'
        };
        return map[severity] || 'info';
    },

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // =================== SISTEMA DE INMUTABILIDAD ===================
    // Ventanas de tiempo + Autorización RRHH (patrón médico)

    /**
     * Verifica y muestra estado de editabilidad de un registro
     * @param {string} table - 'legal_communications' o 'user_legal_issues'
     * @param {number} recordId - ID del registro
     * @returns {Object} Estado de editabilidad
     */
    async checkAndShowEditability(table, recordId) {
        try {
            const result = await LegalAPI.checkEditability(table, recordId);

            if (!result.editable && result.requiresAuthorization) {
                // Mostrar modal de solicitud de autorización
                this.showAuthorizationRequestModal(table, recordId, result);
            }

            return result;
        } catch (error) {
            console.error('❌ [LEGAL] Error verificando editabilidad:', error);
            return { editable: false, error: error.message };
        }
    },

    /**
     * Genera badge HTML para estado de editabilidad
     */
    getEditabilityBadge(editability) {
        if (!editability) return '';

        if (editability.editable) {
            if (editability.code === 'EDIT_WINDOW') {
                return `<span class="le-badge le-badge-success" title="Editable hasta ${editability.editableUntil}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    ${editability.remainingTime} restantes
                </span>`;
            } else if (editability.code === 'AUTHORIZATION_ACTIVE') {
                return `<span class="le-badge le-badge-info" title="Autorización activa">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    Autorizado - ${editability.remainingTime}
                </span>`;
            }
        } else {
            if (editability.requiresAuthorization) {
                return `<span class="le-badge le-badge-warning" title="Requiere autorización de RRHH">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    Bloqueado - Solicitar autorización
                </span>`;
            } else {
                return `<span class="le-badge le-badge-danger" title="${editability.reason}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                    No editable
                </span>`;
            }
        }
    },

    /**
     * Muestra modal para solicitar autorización
     */
    showAuthorizationRequestModal(table, recordId, editability) {
        const tableLabel = table === 'legal_communications' ? 'Comunicación Legal' : 'Juicio/Mediación';

        const modalHTML = `
            <div id="le-auth-modal" class="le-modal-overlay" onclick="if(event.target===this) this.remove()">
                <div class="le-modal" style="max-width: 500px;">
                    <div class="le-modal-header">
                        <h3>🔐 Solicitar Autorización</h3>
                        <button onclick="this.closest('.le-modal-overlay').remove()" class="le-btn-close">&times;</button>
                    </div>
                    <div class="le-modal-body">
                        <div class="le-alert le-alert-warning" style="margin-bottom: 15px;">
                            <p><strong>Registro Bloqueado</strong></p>
                            <p style="font-size: 12px; margin-top: 5px;">
                                ${editability.reason || 'La ventana de edición de 48 horas ha expirado.'}
                                <br>Para modificar este registro necesita autorización de RRHH.
                            </p>
                        </div>

                        <div class="le-form-group">
                            <label>Tipo de ${tableLabel}</label>
                            <input type="text" value="ID: ${recordId}" disabled class="le-input">
                        </div>

                        <div class="le-form-group">
                            <label>Acción solicitada</label>
                            <select id="auth-action-type" class="le-select">
                                <option value="edit">Editar registro</option>
                                <option value="delete">Eliminar registro</option>
                            </select>
                        </div>

                        <div class="le-form-group">
                            <label>Motivo de la solicitud *</label>
                            <textarea id="auth-reason" class="le-textarea" rows="4"
                                placeholder="Explique el motivo por el cual necesita modificar este registro (mínimo 10 caracteres)"
                                required minlength="10"></textarea>
                        </div>

                        <div class="le-form-group">
                            <label>Prioridad</label>
                            <select id="auth-priority" class="le-select">
                                <option value="normal">Normal</option>
                                <option value="high">Alta</option>
                                <option value="urgent">Urgente</option>
                            </select>
                        </div>

                        <div class="le-info-box" style="margin-top: 15px; font-size: 11px; color: var(--le-text-secondary);">
                            <strong>Proceso de autorización:</strong>
                            <ol style="margin: 5px 0 0 15px; padding: 0;">
                                <li>RRHH recibirá una notificación de su solicitud</li>
                                <li>Tienen 48 horas para aprobar/rechazar</li>
                                <li>Si aprueban, tendrá 24 horas para realizar la acción</li>
                            </ol>
                        </div>
                    </div>
                    <div class="le-modal-footer">
                        <button onclick="this.closest('.le-modal-overlay').remove()" class="le-btn le-btn-secondary">
                            Cancelar
                        </button>
                        <button onclick="LegalEngine.submitAuthorizationRequest('${table}', ${recordId})" class="le-btn le-btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                            Enviar Solicitud
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * Envía solicitud de autorización
     */
    async submitAuthorizationRequest(table, recordId) {
        const reason = document.getElementById('auth-reason')?.value;
        const actionType = document.getElementById('auth-action-type')?.value;
        const priority = document.getElementById('auth-priority')?.value;

        if (!reason || reason.length < 10) {
            alert('❌ El motivo debe tener al menos 10 caracteres');
            return;
        }

        try {
            const result = await LegalAPI.requestAuthorization({
                table,
                record_id: recordId,
                reason,
                action_type: actionType || 'edit',
                priority: priority || 'normal'
            });

            if (result.success) {
                document.getElementById('le-auth-modal')?.remove();
                alert('✅ Solicitud enviada exitosamente.\nRRHH será notificado y procesará su solicitud.');
            } else {
                alert(`❌ Error: ${result.error || 'No se pudo enviar la solicitud'}`);
            }
        } catch (error) {
            console.error('❌ [LEGAL] Error enviando solicitud:', error);
            alert(`❌ Error: ${error.message}`);
        }
    },

    /**
     * Muestra panel de autorizaciones pendientes (para RRHH)
     */
    async showPendingAuthorizations() {
        try {
            const result = await LegalAPI.getPendingAuthorizations();
            const pending = result.data || [];

            if (pending.length === 0) {
                alert('✅ No hay autorizaciones pendientes');
                return;
            }

            // Renderizar modal con lista de pendientes
            const listHTML = pending.map(auth => `
                <div class="le-auth-item" style="padding: 15px; background: var(--le-bg-card); border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <strong>${auth.action_type === 'delete' ? '🗑️ Eliminar' : '✏️ Editar'}</strong>
                            <span class="le-badge le-badge-${auth.priority === 'urgent' ? 'danger' : auth.priority === 'high' ? 'warning' : 'info'}">
                                ${auth.priority}
                            </span>
                        </div>
                        <span style="font-size: 11px; color: var(--le-text-muted);">
                            ${this.formatDate(auth.created_at)}
                        </span>
                    </div>
                    <p style="margin: 10px 0; font-size: 13px;">${auth.request_reason}</p>
                    <p style="font-size: 11px; color: var(--le-text-secondary);">
                        Solicitado por: ${auth.requestor?.name || 'Usuario'}
                    </p>
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <button onclick="LegalEngine.approveAuth(${auth.id})" class="le-btn le-btn-success le-btn-sm">
                            ✅ Aprobar
                        </button>
                        <button onclick="LegalEngine.rejectAuth(${auth.id})" class="le-btn le-btn-danger le-btn-sm">
                            ❌ Rechazar
                        </button>
                    </div>
                </div>
            `).join('');

            const modalHTML = `
                <div id="le-pending-modal" class="le-modal-overlay" onclick="if(event.target===this) this.remove()">
                    <div class="le-modal" style="max-width: 600px;">
                        <div class="le-modal-header">
                            <h3>📋 Autorizaciones Pendientes (${pending.length})</h3>
                            <button onclick="this.closest('.le-modal-overlay').remove()" class="le-btn-close">&times;</button>
                        </div>
                        <div class="le-modal-body" style="max-height: 400px; overflow-y: auto;">
                            ${listHTML}
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
        } catch (error) {
            console.error('❌ [LEGAL] Error obteniendo pendientes:', error);
            alert(`❌ Error: ${error.message}`);
        }
    },

    /**
     * Aprobar autorización
     */
    async approveAuth(authId) {
        const response = prompt('Comentario de aprobación (opcional):');

        try {
            const result = await LegalAPI.approveAuthorization(authId, response || '');

            if (result.success) {
                alert(`✅ Autorización aprobada.\nEl solicitante tiene ${result.windowHours || 24} horas para realizar la acción.`);
                document.getElementById('le-pending-modal')?.remove();
                this.showPendingAuthorizations(); // Refresh
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    },

    /**
     * Rechazar autorización
     */
    async rejectAuth(authId) {
        const response = prompt('Motivo del rechazo (requerido):');

        if (!response) {
            alert('❌ Debe proporcionar un motivo para rechazar');
            return;
        }

        try {
            const result = await LegalAPI.rejectAuthorization(authId, response);

            if (result.success) {
                alert('✅ Autorización rechazada');
                document.getElementById('le-pending-modal')?.remove();
                this.showPendingAuthorizations(); // Refresh
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    },

    // ========================================================================
    // CASES VIEW - Gestión de expedientes judiciales
    // ========================================================================
    async renderCases() {
        const content = document.getElementById('le-content');

        // Cargar casos desde la API
        try {
            const casesResult = await LegalAPI.getCases().catch(() => ({ data: [] }));
            LegalState.cases = casesResult.data || [];
        } catch (e) {
            LegalState.cases = [];
        }

        const cases = LegalState.cases;

        content.innerHTML = `
            <div class="le-cases-view">
                <!-- Header con acciones -->
                <div class="le-section-header">
                    <div>
                        <h2 class="le-section-title">⚖️ Expedientes Legales</h2>
                        <p class="le-section-subtitle">Gestión de casos judiciales, reclamos y mediaciones</p>
                    </div>
                    <button onclick="LegalEngine.showNewCaseModal()" class="le-btn le-btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        Nuevo Caso
                    </button>
                </div>

                <!-- Stats rápidas de casos -->
                <div class="le-cases-stats">
                    <div class="le-case-stat">
                        <span class="le-case-stat-value">${cases.filter(c => c.current_stage === 'prejudicial').length}</span>
                        <span class="le-case-stat-label">Prejudicial</span>
                    </div>
                    <div class="le-case-stat">
                        <span class="le-case-stat-value">${cases.filter(c => c.current_stage === 'mediation').length}</span>
                        <span class="le-case-stat-label">Mediación</span>
                    </div>
                    <div class="le-case-stat">
                        <span class="le-case-stat-value">${cases.filter(c => c.current_stage === 'judicial').length}</span>
                        <span class="le-case-stat-label">Judicial</span>
                    </div>
                    <div class="le-case-stat">
                        <span class="le-case-stat-value">${cases.filter(c => c.status === 'closed').length}</span>
                        <span class="le-case-stat-label">Cerrados</span>
                    </div>
                </div>

                <!-- Lista de casos -->
                ${cases.length > 0 ? `
                    <div class="le-cases-grid">
                        ${cases.map(c => this.renderCaseCard(c)).join('')}
                    </div>
                ` : `
                    <div class="le-empty-state">
                        <div class="le-empty-icon">📁</div>
                        <h3>No hay casos registrados</h3>
                        <p>Cree un nuevo caso para comenzar a gestionar expedientes legales.</p>
                        <button onclick="LegalEngine.showNewCaseModal()" class="le-btn le-btn-primary">
                            Crear Primer Caso
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    renderCaseCard(caseData) {
        const stageColors = {
            prejudicial: '#ff9800',
            mediation: '#2196f3',
            judicial: '#9c27b0',
            appeal: '#f44336',
            execution: '#4caf50',
            closed: '#607d8b'
        };
        const stageNames = {
            prejudicial: 'Prejudicial',
            mediation: 'Mediación',
            judicial: 'Judicial',
            appeal: 'Apelación',
            execution: 'Ejecución',
            closed: 'Cerrado'
        };

        return `
            <div class="le-case-card" onclick="LegalEngine.openCaseDetail('${caseData.id}')">
                <div class="le-case-header">
                    <span class="le-case-number">${caseData.case_number || 'Sin número'}</span>
                    <span class="le-case-stage" style="background: ${stageColors[caseData.current_stage] || '#607d8b'}">
                        ${stageNames[caseData.current_stage] || caseData.current_stage}
                    </span>
                </div>
                <div class="le-case-body">
                    <h4 class="le-case-title">${caseData.title || 'Sin título'}</h4>
                    <p class="le-case-type">${this.getCaseTypeName(caseData.case_type)}</p>
                    <div class="le-case-employee">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        ${caseData.employee_name || 'Sin empleado'}
                    </div>
                </div>
                <div class="le-case-footer">
                    <span class="le-case-date">
                        📅 ${caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : '-'}
                    </span>
                    <button class="le-btn-icon" onclick="event.stopPropagation(); LegalEngine.openEmployee360('${caseData.employee_id}')" title="Ver Expediente 360">
                        👤
                    </button>
                </div>
            </div>
        `;
    },

    getCaseTypeName(type) {
        const typeNames = {
            'lawsuit_employee': 'Demanda del Empleado',
            'lawsuit_company': 'Demanda de la Empresa',
            'labor_claim': 'Reclamo Laboral',
            'mediation_request': 'Pedido de Mediación',
            'administrative_claim': 'Reclamo Administrativo',
            'union_dispute': 'Conflicto Sindical',
            'workplace_accident': 'Accidente Laboral',
            'harassment_claim': 'Denuncia de Acoso',
            'discrimination_claim': 'Denuncia de Discriminación',
            'severance_dispute': 'Disputa de Indemnización'
        };
        return typeNames[type] || type || 'Tipo no especificado';
    },

    // ========================================================================
    // DEADLINES VIEW - Vencimientos y alertas
    // ========================================================================
    async renderDeadlines() {
        const content = document.getElementById('le-content');

        // Cargar vencimientos desde la API
        try {
            const deadlinesResult = await LegalAPI.getUpcomingDeadlines().catch(() => ({ data: [] }));
            LegalState.upcomingDeadlines = deadlinesResult.data || [];
        } catch (e) {
            LegalState.upcomingDeadlines = [];
        }

        const deadlines = LegalState.upcomingDeadlines;

        content.innerHTML = `
            <div class="le-deadlines-view">
                <!-- Header -->
                <div class="le-section-header">
                    <div>
                        <h2 class="le-section-title">⏰ Vencimientos y Alertas</h2>
                        <p class="le-section-subtitle">Seguimiento de plazos procesales y fechas límite</p>
                    </div>
                </div>

                <!-- Leyenda de colores -->
                <div class="le-deadline-legend">
                    <span class="le-legend-item"><span class="le-legend-color critical"></span> Crítico (&lt;24h)</span>
                    <span class="le-legend-item"><span class="le-legend-color urgent"></span> Urgente (&lt;3 días)</span>
                    <span class="le-legend-item"><span class="le-legend-color normal"></span> Normal (&gt;3 días)</span>
                </div>

                <!-- Lista de vencimientos -->
                ${deadlines.length > 0 ? `
                    <div class="le-deadlines-list">
                        ${deadlines.map(d => this.renderDeadlineItem(d)).join('')}
                    </div>
                ` : `
                    <div class="le-empty-state">
                        <div class="le-empty-icon">📅</div>
                        <h3>No hay vencimientos próximos</h3>
                        <p>Los vencimientos se generan automáticamente al crear casos y definir plazos.</p>
                    </div>
                `}
            </div>
        `;
    },

    renderDeadlineItem(deadline) {
        const now = new Date();
        const dueDate = new Date(deadline.due_date);
        const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        let urgencyClass = 'normal';
        if (diffDays <= 1) urgencyClass = 'critical';
        else if (diffDays <= 3) urgencyClass = 'urgent';

        return `
            <div class="le-deadline-item ${urgencyClass}">
                <div class="le-deadline-days ${urgencyClass}">
                    <span class="days-number">${diffDays > 0 ? diffDays : 0}</span>
                    <span class="days-label">días</span>
                </div>
                <div class="le-deadline-content">
                    <div class="le-deadline-title">${deadline.title || 'Sin título'}</div>
                    <div class="le-deadline-case">Caso: ${deadline.case_number || 'N/A'}</div>
                    <div class="le-deadline-due">Vence: ${dueDate.toLocaleDateString()} ${dueDate.toLocaleTimeString()}</div>
                </div>
                <div class="le-deadline-actions">
                    <button class="le-btn-icon" onclick="LegalEngine.openCaseDetail('${deadline.case_id}')" title="Ver caso">
                        📁
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // CASE DETAIL VIEW - Vista detallada de un caso
    // ========================================================================
    async renderCaseDetail() {
        const content = document.getElementById('le-content');
        const caseData = LegalState.currentCase;

        if (!caseData) {
            content.innerHTML = '<div class="le-error">No se encontró el caso</div>';
            return;
        }

        // Cargar datos adicionales del caso
        try {
            const [timelineResult, docsResult, deadlinesResult] = await Promise.all([
                LegalAPI.getCaseTimeline(caseData.id).catch(() => ({ data: [] })),
                LegalAPI.getCaseDocuments(caseData.id).catch(() => ({ data: [] })),
                LegalAPI.getCaseDeadlines(caseData.id).catch(() => ({ data: [] }))
            ]);
            LegalState.caseTimeline = timelineResult.data || [];
            LegalState.caseDocuments = docsResult.data || [];
            LegalState.caseDeadlines = deadlinesResult.data || [];
        } catch (e) {
            console.error('[LegalEngine] Error loading case details:', e);
        }

        content.innerHTML = `
            <div class="le-case-detail">
                <!-- Back button -->
                <button onclick="LegalEngine.showView('cases')" class="le-btn le-btn-ghost">
                    ← Volver a Casos
                </button>

                <!-- Case Header -->
                <div class="le-case-detail-header">
                    <div>
                        <h2>${caseData.case_number || 'Sin número'}</h2>
                        <p>${caseData.title || 'Sin título'}</p>
                    </div>
                    <div class="le-case-detail-actions">
                        <button onclick="LegalEngine.openEmployee360('${caseData.employee_id}')" class="le-btn le-btn-secondary">
                            👤 Ver Expediente 360
                        </button>
                        <button onclick="LegalEngine.advanceCaseStage('${caseData.id}')" class="le-btn le-btn-primary">
                            ➡️ Avanzar Etapa
                        </button>
                    </div>
                </div>

                <!-- Workflow Visual -->
                <div class="le-workflow-visual">
                    ${this.renderWorkflowSteps(caseData.current_stage)}
                </div>

                <!-- Tabs -->
                <div class="le-detail-tabs">
                    <button class="le-detail-tab active" onclick="LegalEngine.showCaseTab('timeline')">📅 Timeline</button>
                    <button class="le-detail-tab" onclick="LegalEngine.showCaseTab('documents')">📁 Documentos</button>
                    <button class="le-detail-tab" onclick="LegalEngine.showCaseTab('deadlines')">⏰ Vencimientos</button>
                    <button class="le-detail-tab" onclick="LegalEngine.showCaseTab('360')">👤 Exp. 360</button>
                </div>

                <!-- Tab Content -->
                <div class="le-detail-content" id="le-case-tab-content">
                    ${this.renderCaseTimeline(LegalState.caseTimeline)}
                </div>
            </div>
        `;
    },

    renderWorkflowSteps(currentStage) {
        const stages = ['prejudicial', 'mediation', 'judicial', 'appeal', 'execution', 'closed'];
        const stageNames = {
            prejudicial: 'Prejudicial',
            mediation: 'Mediación',
            judicial: 'Judicial',
            appeal: 'Apelación',
            execution: 'Ejecución',
            closed: 'Cerrado'
        };
        const currentIndex = stages.indexOf(currentStage);

        return `
            <div class="le-workflow-steps">
                ${stages.map((stage, index) => `
                    <div class="le-workflow-step ${index < currentIndex ? 'completed' : ''} ${index === currentIndex ? 'current' : ''}">
                        <div class="le-step-indicator">${index < currentIndex ? '✓' : index + 1}</div>
                        <div class="le-step-name">${stageNames[stage]}</div>
                    </div>
                    ${index < stages.length - 1 ? '<div class="le-step-connector"></div>' : ''}
                `).join('')}
            </div>
        `;
    },

    renderCaseTimeline(timeline) {
        if (!timeline || timeline.length === 0) {
            return '<div class="le-empty-state"><p>No hay eventos en el timeline</p></div>';
        }

        return `
            <div class="le-timeline">
                ${timeline.map(event => `
                    <div class="le-timeline-item">
                        <div class="le-timeline-marker ${event.is_milestone ? 'milestone' : ''}">
                            ${event.is_milestone ? '⭐' : '●'}
                        </div>
                        <div class="le-timeline-content">
                            <div class="le-timeline-date">${new Date(event.event_date).toLocaleDateString()}</div>
                            <div class="le-timeline-title">${event.title}</div>
                            ${event.description ? `<div class="le-timeline-desc">${event.description}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    showCaseTab(tab) {
        document.querySelectorAll('.le-detail-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');

        const content = document.getElementById('le-case-tab-content');

        switch(tab) {
            case 'timeline':
                content.innerHTML = this.renderCaseTimeline(LegalState.caseTimeline);
                break;
            case 'documents':
                content.innerHTML = this.renderCaseDocuments(LegalState.caseDocuments);
                break;
            case 'deadlines':
                content.innerHTML = this.renderCaseDeadlinesTab(LegalState.caseDeadlines);
                break;
            case '360':
                this.loadEmployee360ForCase();
                break;
        }
    },

    // Iconos por tipo de documento legal
    docIcons: {
        'carta_documento':'📨','telegrama':'📬','acuse_recibo':'✅','demanda':'⚖️','contestacion':'📋',
        'sentencia':'🏛️','recurso':'📤','resolucion':'📜','termination_letter':'🚪','warning_letter':'⚠️',
        'employment_contract':'📑','salary_receipt':'💰','attendance_report':'🕐','expediente_completo':'📚',
        'prueba_testimonial':'👥','citacion_mediacion':'📅','medical_certificate':'🏥','other':'📄'
    },

    respTypes: {
        'acuse_recibo':'Espera acuse de recibo','contestacion_extrajudicial':'Espera contestacion extrajudicial',
        'contestacion_judicial':'Espera contestacion judicial','notificacion_judicial':'Espera notif. juzgado',
        'resolucion':'Espera resolucion','apelacion':'Espera apelacion'
    },

    renderCaseDocuments(docs) {
        if (!docs || docs.length === 0) {
            return '<div class="le-empty-state"><p>No hay documentos</p><button onclick="LegalEngine.uploadDocument()" class="le-btn le-btn-primary">📤 Subir</button></div>';
        }
        const pending = docs.filter(d => d.expects_response && !d.response_received);
        const locked = docs.filter(d => d.is_locked);
        return `
            <div class="le-docs-panel">
                <div class="le-docs-toolbar">
                    <button onclick="LegalEngine.uploadDocument()" class="le-btn le-btn-primary le-btn-sm">📤 Subir Documento</button>
                    <div class="le-docs-counts">
                        <span class="le-count-item">📄 ${docs.length} docs</span>
                        ${locked.length ? '<span class="le-count-item le-count-locked">🔒 '+locked.length+'</span>' : ''}
                        ${pending.length ? '<span class="le-count-item le-count-pending">⏳ '+pending.length+'</span>' : ''}
                    </div>
                </div>
                ${pending.length ? '<div class="le-docs-warning">⚠️ <strong>'+pending.length+'</strong> documento(s) esperan respuesta/acuse</div>' : ''}
                <div class="le-docs-grid">${docs.map(d => this.renderDocCard(d)).join('')}</div>
            </div>
        `;
    },

    renderDocCard(doc) {
        const icon = this.docIcons[doc.document_type] || '📄';
        const locked = doc.is_locked;
        const pending = doc.expects_response && !doc.response_received;
        const respText = this.respTypes[doc.response_type] || '';
        const dt = doc.document_date ? new Date(doc.document_date).toLocaleDateString('es-AR') : '';
        const title = doc.title || doc.file_name || 'Documento';
        return `
            <div class="le-doc-card ${locked?'le-card-locked':''} ${pending?'le-card-pending':''}">
                <div class="le-doc-header">
                    <span class="le-doc-icon-big">${icon}</span>
                    <div class="le-doc-badges">
                        ${locked ? '<span class="le-badge-lock" title="Inmutable">🔒</span>' : ''}
                        ${pending ? '<span class="le-badge-wait" title="'+respText+'">⏳</span>' : ''}
                        ${doc.response_received ? '<span class="le-badge-done">✅</span>' : ''}
                    </div>
                </div>
                <div class="le-doc-body">
                    <div class="le-doc-type">${this.fmtDocType(doc.document_type)}</div>
                    <div class="le-doc-name" title="${title}">${title.length>35?title.substring(0,35)+'...':title}</div>
                    ${dt ? '<div class="le-doc-date">📅 '+dt+'</div>' : ''}
                    ${pending ? '<div class="le-doc-pending-alert">⚠️ '+respText+(doc.response_deadline?' (vence: '+new Date(doc.response_deadline).toLocaleDateString('es-AR')+')':'')+'</div>' : ''}
                </div>
                <div class="le-doc-footer">
                    <button class="le-doc-action le-action-view" onclick="LegalEngine.openPdfViewer('${doc.id}')" title="Ver PDF">👁️ PDF</button>
                    <button class="le-doc-action" onclick="LegalEngine.downloadDocument('${doc.id}')" title="Descargar">⬇️</button>
                    ${pending ? '<button class="le-doc-action le-action-acuse" onclick="LegalEngine.openAcuseModal(\''+doc.id+'\')">📥 Acuse</button>' : ''}
                </div>
                ${locked ? '<div class="le-doc-lock-info">🔒 '+(doc.lock_reason||'Documento bloqueado')+'</div>' : ''}
            </div>
        `;
    },

    fmtDocType(t) {
        const m = {'carta_documento':'Carta Documento','telegrama':'Telegrama','acuse_recibo':'Acuse Recibo',
            'demanda':'Demanda','contestacion':'Contestacion','sentencia':'Sentencia','recurso':'Recurso',
            'termination_letter':'Carta Despido','warning_letter':'Apercibimiento','salary_receipt':'Recibo Sueldo',
            'attendance_report':'Inf. Asistencia','expediente_completo':'Expediente','citacion_mediacion':'Citacion SECLO',
            'prueba_testimonial':'Testimonial','medical_certificate':'Certificado Medico'};
        return m[t] || (t||'').replace(/_/g,' ') || 'Documento';
    },

    openPdfViewer(docId) {
        const doc = LegalState.caseDocuments?.find(d => d.id == docId);
        if (!doc) return;
        const icon = this.docIcons[doc.document_type] || '📄';
        const m = document.createElement('div');
        m.className = 'le-modal-overlay';
        m.innerHTML = `
            <div class="le-modal le-modal-wide">
                <div class="le-modal-header">
                    <h3>${icon} ${doc.title || 'Documento'}</h3>
                    <button onclick="this.closest('.le-modal-overlay').remove()" class="le-modal-x">×</button>
                </div>
                <div class="le-modal-body le-pdf-body">
                    ${doc.file_path ? '<iframe src="'+doc.file_path+'" class="le-pdf-frame"></iframe>' :
                        '<div class="le-pdf-placeholder"><div class="le-pdf-icon">📄</div><p>Vista previa no disponible</p><p class="le-pdf-file">'+
                        (doc.file_name||'documento.pdf')+'</p><button class="le-btn le-btn-primary" onclick="LegalEngine.downloadDocument(\''+docId+'\')">⬇️ Descargar</button></div>'}
                </div>
                <div class="le-modal-footer le-pdf-footer">
                    <span>📅 ${doc.document_date?new Date(doc.document_date).toLocaleDateString('es-AR'):'-'} | ${this.fmtDocType(doc.document_type)}${doc.is_locked?' | 🔒 Bloqueado':''}</span>
                    <button class="le-btn" onclick="this.closest('.le-modal-overlay').remove()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    openAcuseModal(docId) {
        const doc = LegalState.caseDocuments?.find(d => d.id == docId);
        if (!doc) return;
        const m = document.createElement('div');
        m.className = 'le-modal-overlay';
        m.innerHTML = `
            <div class="le-modal">
                <div class="le-modal-header">
                    <h3>📥 Registrar Acuse/Respuesta</h3>
                    <button onclick="this.closest('.le-modal-overlay').remove()" class="le-modal-x">×</button>
                </div>
                <div class="le-modal-body">
                    <p style="margin-bottom:12px;"><strong>${doc.title}</strong></p>
                    <p style="color:#999;margin-bottom:16px;">Esperado: ${this.respTypes[doc.response_type]||'Respuesta'}</p>
                    <div class="le-form-row"><label>Fecha recepcion</label><input type="date" id="acuse-date" value="${new Date().toISOString().split('T')[0]}" class="le-input"></div>
                    <div class="le-form-row"><label>Adjuntar PDF (opcional)</label><input type="file" id="acuse-file" accept=".pdf,.jpg,.png" class="le-input"></div>
                    <div class="le-form-row"><label>Notas</label><textarea id="acuse-notes" class="le-input" rows="2" placeholder="Observaciones..."></textarea></div>
                </div>
                <div class="le-modal-footer">
                    <button class="le-btn" onclick="this.closest('.le-modal-overlay').remove()">Cancelar</button>
                    <button class="le-btn le-btn-primary" onclick="LegalEngine.submitAcuse('${docId}')">✅ Registrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(m);
    },

    async submitAcuse(docId) {
        const dt = document.getElementById('acuse-date')?.value;
        const notes = document.getElementById('acuse-notes')?.value;
        try {
            await LegalAPI.request('/documents/'+docId+'/response',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({response_date:dt,notes:notes})});
            document.querySelector('.le-modal-overlay')?.remove();
            this.showCaseTab('documents');
            this.showNotification('✅ Acuse registrado','success');
        } catch(e) { this.showNotification('Error: '+e.message,'error'); }
    },

    renderCaseDeadlinesTab(deadlines) {
        if (!deadlines || deadlines.length === 0) {
            return `
                <div class="le-empty-state">
                    <p>No hay vencimientos para este caso</p>
                    <button onclick="LegalEngine.addDeadline()" class="le-btn le-btn-primary">
                        ➕ Agregar Vencimiento
                    </button>
                </div>
            `;
        }

        return `
            <div class="le-deadlines-list">
                <button onclick="LegalEngine.addDeadline()" class="le-btn le-btn-primary" style="margin-bottom: 16px;">
                    ➕ Agregar Vencimiento
                </button>
                ${deadlines.map(d => this.renderDeadlineItem(d)).join('')}
            </div>
        `;
    },

    async loadEmployee360ForCase() {
        const content = document.getElementById('le-case-tab-content');
        content.innerHTML = '<div class="le-loading"><div class="le-spinner"></div><span>Cargando expediente 360...</span></div>';

        try {
            const result = await LegalAPI.getEmployee360(LegalState.currentCase.employee_id);
            if (result.success) {
                LegalState.employee360 = result.data;
                content.innerHTML = this.renderEmployee360View(result.data);
            } else {
                content.innerHTML = '<div class="le-error">Error cargando expediente 360</div>';
            }
        } catch (e) {
            content.innerHTML = `<div class="le-error">Error: ${e.message}</div>`;
        }
    },

    renderEmployee360View(data) {
        const personal = data.personal_info || {};
        const employment = data.employment_info || {};
        const stats = data.statistics || {};

        return `
            <div class="le-360-view">
                <!-- Personal Info -->
                <div class="le-360-section">
                    <h4 class="le-360-section-title">👤 Datos Personales</h4>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Nombre</span><span class="le-360-stat-value">${personal.full_name || '-'}</span></div>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">DNI/CUIL</span><span class="le-360-stat-value">${personal.document_number || '-'}</span></div>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Email</span><span class="le-360-stat-value">${personal.email || '-'}</span></div>
                </div>

                <!-- Employment Info -->
                <div class="le-360-section">
                    <h4 class="le-360-section-title">💼 Datos Laborales</h4>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Fecha Ingreso</span><span class="le-360-stat-value">${employment.hire_date || '-'}</span></div>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Departamento</span><span class="le-360-stat-value">${employment.department || '-'}</span></div>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Puesto</span><span class="le-360-stat-value">${employment.position || '-'}</span></div>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Estado</span><span class="le-360-stat-value">${employment.status || '-'}</span></div>
                </div>

                <!-- Statistics -->
                <div class="le-360-section">
                    <h4 class="le-360-section-title">📊 Estadísticas</h4>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Asistencias</span><span class="le-360-stat-value">${stats.total_attendances || 0}</span></div>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Llegadas Tarde</span><span class="le-360-stat-value">${stats.late_arrivals || 0}</span></div>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Ausencias</span><span class="le-360-stat-value">${stats.absences || 0}</span></div>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Sanciones</span><span class="le-360-stat-value">${stats.sanctions || 0}</span></div>
                    <div class="le-360-stat-row"><span class="le-360-stat-label">Comunicaciones Legales</span><span class="le-360-stat-value">${stats.legal_communications || 0}</span></div>
                </div>

                <button onclick="LegalEngine.openFullEmployee360('${LegalState.currentCase.employee_id}')" class="le-btn le-btn-secondary" style="width: 100%; margin-top: 16px;">
                    Ver Expediente Completo →
                </button>
            </div>
        `;
    },

    async openCaseDetail(caseId) {
        try {
            const result = await LegalAPI.getCaseById(caseId);
            if (result.success) {
                LegalState.currentCase = result.data;
                this.showView('case-detail');
            } else {
                alert('Error cargando caso');
            }
        } catch (e) {
            alert(`Error: ${e.message}`);
        }
    },

    async openEmployee360(employeeId) {
        // Mostrar modal con expediente 360 del empleado
        const modal = document.createElement('div');
        modal.className = 'le-help-modal';
        modal.id = 'le-360-modal';
        modal.innerHTML = `
            <div class="le-help-modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <button class="le-help-modal-close" onclick="document.getElementById('le-360-modal').remove()">×</button>
                <h3>👤 Expediente 360 del Empleado</h3>
                <div id="le-360-modal-content">
                    <div class="le-loading"><div class="le-spinner"></div><span>Cargando expediente completo...</span></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        try {
            const result = await LegalAPI.getEmployee360(employeeId);
            const contentEl = document.getElementById('le-360-modal-content');
            if (result.success) {
                contentEl.innerHTML = this.renderEmployee360View(result.data);
            } else {
                contentEl.innerHTML = '<div class="le-error">Error cargando expediente</div>';
            }
        } catch (e) {
            document.getElementById('le-360-modal-content').innerHTML = `<div class="le-error">Error: ${e.message}</div>`;
        }
    },

    showNewCaseModal() {
        const modal = document.createElement('div');
        modal.className = 'le-help-modal';
        modal.id = 'le-new-case-modal';
        modal.innerHTML = `
            <div class="le-help-modal-content" style="max-width: 600px;">
                <button class="le-help-modal-close" onclick="document.getElementById('le-new-case-modal').remove()">×</button>
                <h3>⚖️ Nuevo Caso Legal</h3>
                <form onsubmit="event.preventDefault(); LegalEngine.createCase();">
                    <div class="le-form-group">
                        <label>Tipo de Caso *</label>
                        <select id="new-case-type" required class="le-input">
                            <option value="">Seleccione...</option>
                            <option value="lawsuit_employee">Demanda del Empleado</option>
                            <option value="lawsuit_company">Demanda de la Empresa</option>
                            <option value="labor_claim">Reclamo Laboral</option>
                            <option value="mediation_request">Pedido de Mediación</option>
                            <option value="workplace_accident">Accidente Laboral</option>
                            <option value="harassment_claim">Denuncia de Acoso</option>
                            <option value="discrimination_claim">Denuncia de Discriminación</option>
                            <option value="severance_dispute">Disputa de Indemnización</option>
                        </select>
                    </div>
                    <div class="le-form-group">
                        <label>Empleado *</label>
                        <select id="new-case-employee" required class="le-input">
                            <option value="">Cargando empleados...</option>
                        </select>
                    </div>
                    <div class="le-form-group">
                        <label>Título del Caso *</label>
                        <input type="text" id="new-case-title" required class="le-input" placeholder="Ej: Demanda por despido sin causa">
                    </div>
                    <div class="le-form-group">
                        <label>Descripción</label>
                        <textarea id="new-case-description" class="le-input" rows="3" placeholder="Descripción del caso..."></textarea>
                    </div>
                    <div class="le-form-actions">
                        <button type="button" onclick="document.getElementById('le-new-case-modal').remove()" class="le-btn le-btn-ghost">Cancelar</button>
                        <button type="submit" class="le-btn le-btn-primary">Crear Caso</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        this.loadEmployeesForCase();
    },

    async loadEmployeesForCase() {
        try {
            const result = await LegalAPI.getEmployees();
            const select = document.getElementById('new-case-employee');
            if (result.success && result.data) {
                select.innerHTML = '<option value="">Seleccione empleado...</option>' +
                    result.data.map(e => `<option value="${e.id}">${e.full_name || e.first_name + ' ' + e.last_name}</option>`).join('');
            }
        } catch (e) {
            console.error('[LegalEngine] Error loading employees:', e);
        }
    },

    async createCase() {
        const caseType = document.getElementById('new-case-type').value;
        const employeeId = document.getElementById('new-case-employee').value;
        const title = document.getElementById('new-case-title').value;
        const description = document.getElementById('new-case-description').value;

        if (!caseType || !employeeId || !title) {
            alert('Complete todos los campos requeridos');
            return;
        }

        try {
            const result = await LegalAPI.createCase({
                case_type: caseType,
                employee_id: employeeId,
                title: title,
                description: description,
                fetch_360: true // Obtener expediente 360 automáticamente
            });

            if (result.success) {
                alert('✅ Caso creado exitosamente. Se generó automáticamente el expediente 360 del empleado.');
                document.getElementById('le-new-case-modal').remove();
                this.showView('cases');
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (e) {
            alert(`❌ Error: ${e.message}`);
        }
    },

    async advanceCaseStage(caseId) {
        if (!confirm('¿Está seguro de avanzar el caso a la siguiente etapa?')) return;

        try {
            const result = await LegalAPI.advanceCaseStage(caseId);
            if (result.success) {
                alert(`✅ Caso avanzado a etapa: ${result.data.new_stage}`);
                // Recargar detalle
                LegalState.currentCase = result.data.case;
                this.showView('case-detail');
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (e) {
            alert(`❌ Error: ${e.message}`);
        }
    }
};

// Export to window
window.LegalEngine = LegalEngine;

// ============================================================================
// INJECT STYLES
// ============================================================================
function injectLegalStyles() {
    if (document.getElementById('le-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'le-styles';
    styles.textContent = `
        /* CSS Variables - Dark Enterprise Theme */
        :root {
            --le-bg-primary: #0f0f1a;
            --le-bg-secondary: #1a1a2e;
            --le-bg-tertiary: #252542;
            --le-bg-card: #1e1e35;
            --le-border: #2d2d4a;
            --le-text-primary: #e8e8f0;
            --le-text-secondary: #a0a0b8;
            --le-text-muted: #6b6b80;
            --accent-blue: #00d4ff;
            --accent-green: #00e676;
            --accent-yellow: #ffc107;
            --accent-red: #ff5252;
            --accent-purple: #b388ff;
        }

        .legal-enterprise {
            background: var(--le-bg-primary);
            min-height: 100vh;
            color: var(--le-text-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Header */
        .le-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            background: var(--le-bg-secondary);
            border-bottom: 1px solid var(--le-border);
        }

        .le-header-left { display: flex; align-items: center; gap: 12px; }

        .le-logo {
            width: 40px; height: 40px;
            background: linear-gradient(135deg, var(--accent-yellow), var(--accent-red));
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            color: white;
        }

        .le-title {
            font-size: 18px; font-weight: 700; letter-spacing: 1px; margin: 0;
            background: linear-gradient(90deg, var(--accent-yellow), var(--accent-red));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .le-subtitle {
            font-size: 11px; color: var(--le-text-muted);
            text-transform: uppercase; letter-spacing: 0.5px;
        }

        .le-tech-badges { display: flex; gap: 8px; }

        .le-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 4px 10px; border-radius: 12px;
            font-size: 11px; font-weight: 500;
        }

        .le-badge-law { background: rgba(255, 193, 7, 0.15); color: var(--accent-yellow); border: 1px solid rgba(255, 193, 7, 0.3); }
        .le-badge-db { background: rgba(0, 230, 118, 0.15); color: var(--accent-green); border: 1px solid rgba(0, 230, 118, 0.3); }
        .le-badge-secure { background: rgba(179, 136, 255, 0.15); color: var(--accent-purple); border: 1px solid rgba(179, 136, 255, 0.3); }
        .le-badge-info { background: rgba(0, 212, 255, 0.2); color: var(--accent-blue); }
        .le-badge-success { background: rgba(0, 230, 118, 0.2); color: var(--accent-green); }
        .le-badge-warning { background: rgba(255, 193, 7, 0.2); color: var(--accent-yellow); }
        .le-badge-danger { background: rgba(255, 82, 82, 0.2); color: var(--accent-red); }

        .le-header-right { display: flex; align-items: center; gap: 12px; }

        /* Navigation */
        .le-nav {
            display: flex; gap: 4px; padding: 8px 24px;
            background: var(--le-bg-secondary);
            border-bottom: 1px solid var(--le-border);
            overflow-x: auto;
        }

        .le-nav-item {
            display: flex; align-items: center; gap: 8px;
            padding: 10px 16px; background: transparent; border: none;
            color: var(--le-text-secondary); font-size: 13px; font-weight: 500;
            cursor: pointer; border-radius: 6px; transition: all 0.2s; white-space: nowrap;
        }

        .le-nav-item:hover { background: var(--le-bg-tertiary); color: var(--le-text-primary); }

        .le-nav-item.active {
            background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 82, 82, 0.2));
            color: var(--accent-yellow);
            border: 1px solid rgba(255, 193, 7, 0.3);
        }

        /* Main Content */
        .le-main { padding: 24px; max-width: 1400px; margin: 0 auto; }

        /* Loading */
        .le-loading {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; padding: 60px; color: var(--le-text-muted);
        }

        .le-spinner {
            width: 40px; height: 40px;
            border: 3px solid var(--le-border);
            border-top-color: var(--accent-yellow);
            border-radius: 50%; animation: le-spin 1s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes le-spin { to { transform: rotate(360deg); } }

        /* KPI Cards */
        .le-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px; margin-bottom: 24px;
        }

        .le-kpi-card {
            background: var(--le-bg-card);
            border: 1px solid var(--le-border);
            border-radius: 12px; padding: 20px;
            display: flex; align-items: center; gap: 16px;
        }

        .le-kpi-icon {
            width: 48px; height: 48px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center; color: white;
        }

        .le-kpi-value { font-size: 28px; font-weight: 700; display: block; }
        .le-kpi-label { font-size: 12px; color: var(--le-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

        /* Finance Cards */
        .le-finance-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px; margin-bottom: 24px;
        }

        .le-finance-card {
            background: var(--le-bg-card);
            border: 1px solid var(--le-border);
            border-radius: 12px; padding: 24px;
        }

        .le-finance-gross { border-left: 4px solid var(--accent-yellow); }
        .le-finance-net { border-left: 4px solid var(--accent-green); }

        .le-finance-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .le-finance-label { font-size: 13px; color: var(--le-text-secondary); }
        .le-finance-period { font-size: 12px; color: var(--le-text-muted); }
        .le-finance-value { font-size: 32px; font-weight: 700; margin-bottom: 4px; }
        .le-finance-sublabel { font-size: 12px; color: var(--le-text-muted); }

        /* Section */
        .le-section { margin-bottom: 24px; }
        .le-section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--le-text-secondary); margin-bottom: 8px; }
        .le-section-desc { font-size: 13px; color: var(--le-text-muted); margin-bottom: 16px; }

        /* Actions Grid */
        .le-actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
        }

        .le-action-btn {
            display: flex; align-items: center; gap: 12px;
            padding: 16px; background: var(--le-bg-card);
            border: 1px solid var(--le-border); border-radius: 10px;
            color: var(--le-text-primary); cursor: pointer; transition: all 0.2s;
        }

        .le-action-btn:hover { border-color: var(--accent-yellow); background: var(--le-bg-tertiary); }

        .le-action-icon {
            width: 40px; height: 40px; background: var(--le-bg-tertiary);
            border-radius: 8px; display: flex; align-items: center; justify-content: center;
            color: var(--accent-yellow);
        }

        /* Table */
        .le-table-container {
            background: var(--le-bg-card);
            border: 1px solid var(--le-border);
            border-radius: 12px; overflow: hidden;
        }

        .le-table { width: 100%; border-collapse: collapse; }
        .le-table th, .le-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--le-border); }
        .le-table th { background: var(--le-bg-tertiary); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--le-text-muted); }
        .le-table tr:hover { background: var(--le-bg-tertiary); }
        .le-table code { background: var(--le-bg-tertiary); padding: 2px 6px; border-radius: 4px; font-size: 11px; }

        /* Status */
        .le-status { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; }
        .le-status-draft { background: rgba(160, 160, 184, 0.2); color: var(--le-text-secondary); }
        .le-status-sent { background: rgba(179, 136, 255, 0.2); color: var(--accent-purple); }
        .le-status-delivered { background: rgba(0, 230, 118, 0.2); color: var(--accent-green); }
        .le-status-responded { background: rgba(0, 212, 255, 0.2); color: var(--accent-blue); }
        .le-status-closed { background: rgba(107, 107, 128, 0.2); color: var(--le-text-muted); }

        /* Filters */
        .le-filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }

        /* Forms */
        .le-form { max-width: 800px; }
        .le-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .le-form-group { margin-bottom: 16px; }
        .le-form-group label { display: block; font-size: 12px; color: var(--le-text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }

        .le-input, .le-select, .le-textarea {
            width: 100%; padding: 10px 12px;
            background: var(--le-bg-tertiary);
            border: 1px solid var(--le-border);
            color: var(--le-text-primary);
            border-radius: 6px; font-size: 14px;
        }

        .le-input:focus, .le-select:focus, .le-textarea:focus {
            outline: none; border-color: var(--accent-yellow);
        }

        .le-textarea { resize: vertical; min-height: 80px; }

        .le-checkbox-group { display: flex; align-items: center; }
        .le-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .le-checkbox input { width: 18px; height: 18px; accent-color: var(--accent-yellow); }

        .le-form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--le-border); }

        /* Buttons */
        .le-btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 10px 16px; background: var(--le-bg-tertiary);
            border: 1px solid var(--le-border); color: var(--le-text-primary);
            border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s;
        }

        .le-btn:hover { background: var(--le-bg-card); border-color: var(--le-text-muted); }

        .le-btn-primary {
            background: linear-gradient(135deg, var(--accent-yellow), #ff8f00);
            border: none; color: #000; font-weight: 600;
        }

        .le-btn-primary:hover { opacity: 0.9; }

        .le-btn-icon {
            width: 36px; height: 36px; padding: 0;
            display: flex; align-items: center; justify-content: center;
            background: var(--le-bg-tertiary); border: 1px solid var(--le-border);
            border-radius: 6px; color: var(--le-text-secondary); cursor: pointer;
        }

        .le-btn-icon:hover { border-color: var(--accent-yellow); color: var(--accent-yellow); }

        .le-btn-sm {
            width: 28px; height: 28px; padding: 0;
            display: inline-flex; align-items: center; justify-content: center;
            background: transparent; border: 1px solid var(--le-border);
            border-radius: 4px; color: var(--le-text-secondary); cursor: pointer;
        }

        .le-btn-sm:hover { border-color: var(--accent-yellow); color: var(--accent-yellow); }

        .le-actions { display: flex; gap: 4px; }

        /* Empty State */
        .le-empty {
            text-align: center; padding: 60px 20px; color: var(--le-text-muted);
        }

        .le-empty svg { margin-bottom: 16px; opacity: 0.5; }
        .le-empty h3 { margin: 0 0 8px 0; color: var(--le-text-secondary); }
        .le-empty p { margin: 0; font-size: 14px; }

        /* Search Results */
        .le-search-results {
            position: absolute; z-index: 100;
            background: var(--le-bg-card);
            border: 1px solid var(--le-border);
            border-radius: 6px; margin-top: 4px;
            max-height: 200px; overflow-y: auto;
        }

        .le-search-item {
            padding: 10px 12px; cursor: pointer;
            border-bottom: 1px solid var(--le-border);
        }

        .le-search-item:hover { background: var(--le-bg-tertiary); }
        .le-search-item:last-child { border-bottom: none; }

        /* AI Panel */
        .le-ai-panel {
            background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 82, 82, 0.1));
            border: 1px solid rgba(255, 193, 7, 0.2);
            border-radius: 12px; overflow: hidden; margin-top: 24px;
        }

        .le-ai-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 16px; background: rgba(0, 0, 0, 0.2);
        }

        .le-ai-title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--accent-yellow); }
        .le-ai-status { font-size: 11px; padding: 4px 8px; background: rgba(0, 230, 118, 0.2); color: var(--accent-green); border-radius: 10px; }
        .le-ai-content { padding: 16px; }
        .le-ai-insight { display: flex; gap: 12px; align-items: flex-start; }
        .le-ai-icon { font-size: 20px; }
        .le-ai-insight p { margin: 0; font-size: 14px; line-height: 1.5; }
        .le-text-warning { color: var(--accent-yellow); }

        /* Error */
        .le-error { text-align: center; padding: 40px; color: var(--accent-red); }

        /* =================== HELP SYSTEM STYLES =================== */

        /* Help Bar - Barra sutil */
        .le-help-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding: 4px 12px;
            margin-bottom: 8px;
        }
        .le-help-bar-text { font-size: 11px; color: rgba(255,255,255,0.4); }
        .le-help-bar-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.3);
            font-size: 14px;
            cursor: pointer;
            padding: 2px 6px;
            line-height: 1;
        }
        .le-help-bar-close:hover { color: rgba(255,255,255,0.6); }

        /* Help Tooltip Trigger */
        .le-help-tooltip {
            position: relative;
            display: inline-flex;
        }

        .le-help-trigger {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px; height: 20px;
            background: rgba(255, 193, 7, 0.2);
            border: 1px solid rgba(255, 193, 7, 0.4);
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s;
        }

        .le-help-trigger:hover {
            background: var(--accent-yellow);
            border-color: var(--accent-yellow);
        }

        .le-help-trigger:hover .le-help-icon {
            color: #000;
        }

        .le-help-icon {
            font-size: 11px;
            font-weight: bold;
            color: var(--accent-yellow);
            line-height: 1;
        }

        /* Help Modal */
        .le-help-modal {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: le-modal-fade-in 0.2s ease-out;
        }

        @keyframes le-modal-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .le-help-modal-content {
            background: var(--le-bg-card);
            border: 1px solid var(--le-border);
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: le-modal-slide-up 0.3s ease-out;
        }

        @keyframes le-modal-slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .le-help-modal-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 20px 24px;
            border-bottom: 1px solid var(--le-border);
            background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), transparent);
        }

        .le-help-modal-icon { font-size: 28px; }
        .le-help-modal-header h3 {
            flex: 1;
            margin: 0;
            font-size: 18px;
            color: var(--le-text-primary);
        }

        .le-help-modal-close {
            background: none;
            border: none;
            color: var(--le-text-muted);
            font-size: 24px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
        }

        .le-help-modal-close:hover {
            background: var(--le-bg-tertiary);
            color: var(--le-text-primary);
        }

        .le-help-modal-body {
            padding: 24px;
        }

        .le-help-modal-body p {
            margin: 0 0 16px 0;
            font-size: 14px;
            line-height: 1.6;
            color: var(--le-text-secondary);
        }

        .le-help-modal-body h4 {
            margin: 16px 0 8px 0;
            font-size: 13px;
            font-weight: 600;
            color: var(--accent-yellow);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .le-help-stages {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .le-help-stage {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            background: var(--le-bg-tertiary);
            border-radius: 8px;
            border-left: 3px solid var(--accent-yellow);
        }

        .le-help-stage strong {
            min-width: 100px;
            color: var(--le-text-primary);
            font-size: 13px;
        }

        .le-help-stage span {
            font-size: 12px;
            color: var(--le-text-muted);
        }

        .le-help-list ul {
            margin: 0;
            padding-left: 20px;
        }

        .le-help-list li {
            margin: 6px 0;
            font-size: 13px;
            color: var(--le-text-secondary);
        }

        .le-help-tip {
            margin-top: 16px !important;
            padding: 12px;
            background: rgba(255, 193, 7, 0.1);
            border-radius: 8px;
            font-size: 13px !important;
        }

        /* =================== CASES & WORKFLOW STYLES =================== */

        /* Cases Grid */
        .le-cases-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 16px;
        }

        .le-case-card {
            background: var(--le-bg-card);
            border: 1px solid var(--le-border);
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.2s;
        }

        .le-case-card:hover {
            border-color: var(--accent-yellow);
            transform: translateY(-2px);
        }

        .le-case-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), transparent);
            border-bottom: 1px solid var(--le-border);
        }

        .le-case-number {
            font-family: 'Roboto Mono', monospace;
            font-size: 12px;
            color: var(--accent-yellow);
            font-weight: 600;
        }

        .le-case-stage-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .le-stage-prejudicial { background: rgba(156, 39, 176, 0.2); color: #ce93d8; }
        .le-stage-mediation { background: rgba(33, 150, 243, 0.2); color: #64b5f6; }
        .le-stage-judicial { background: rgba(255, 152, 0, 0.2); color: #ffb74d; }
        .le-stage-appeal { background: rgba(244, 67, 54, 0.2); color: #e57373; }
        .le-stage-execution { background: rgba(0, 230, 118, 0.2); color: #69f0ae; }
        .le-stage-closed { background: rgba(158, 158, 158, 0.2); color: #bdbdbd; }

        .le-case-card-body {
            padding: 16px;
        }

        .le-case-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--le-text-primary);
            margin-bottom: 8px;
        }

        .le-case-employee {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--le-text-secondary);
            margin-bottom: 12px;
        }

        .le-case-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 12px;
            color: var(--le-text-muted);
        }

        .le-case-meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .le-case-card-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: var(--le-bg-tertiary);
            border-top: 1px solid var(--le-border);
        }

        .le-case-priority {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .le-priority-critical { background: rgba(244, 67, 54, 0.3); color: #f44336; }
        .le-priority-high { background: rgba(255, 152, 0, 0.3); color: #ff9800; }
        .le-priority-normal { background: rgba(33, 150, 243, 0.3); color: #2196f3; }
        .le-priority-low { background: rgba(158, 158, 158, 0.3); color: #9e9e9e; }

        /* Timeline */
        .le-timeline {
            position: relative;
            padding-left: 30px;
        }

        .le-timeline::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--le-border);
        }

        .le-timeline-item {
            position: relative;
            padding-bottom: 24px;
        }

        .le-timeline-item::before {
            content: '';
            position: absolute;
            left: -24px;
            top: 4px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--le-border);
            border: 2px solid var(--le-bg-card);
        }

        .le-timeline-item.le-milestone::before {
            background: var(--accent-yellow);
            box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.2);
        }

        .le-timeline-date {
            font-size: 11px;
            color: var(--le-text-muted);
            margin-bottom: 4px;
        }

        .le-timeline-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--le-text-primary);
            margin-bottom: 4px;
        }

        .le-timeline-desc {
            font-size: 13px;
            color: var(--le-text-secondary);
        }

        .le-timeline-type {
            display: inline-block;
            padding: 2px 6px;
            background: var(--le-bg-tertiary);
            border-radius: 4px;
            font-size: 10px;
            color: var(--le-text-muted);
            margin-top: 4px;
        }

        /* Deadlines */
        .le-deadline-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: var(--le-bg-card);
            border: 1px solid var(--le-border);
            border-radius: 10px;
            margin-bottom: 12px;
        }

        .le-deadline-days {
            min-width: 60px;
            text-align: center;
            padding: 8px;
            border-radius: 8px;
            font-weight: 700;
        }

        .le-deadline-days.critical { background: rgba(244, 67, 54, 0.2); color: #f44336; }
        .le-deadline-days.urgent { background: rgba(255, 152, 0, 0.2); color: #ff9800; }
        .le-deadline-days.normal { background: rgba(33, 150, 243, 0.2); color: #2196f3; }

        .le-deadline-days .days-number { font-size: 24px; display: block; }
        .le-deadline-days .days-label { font-size: 10px; text-transform: uppercase; }

        .le-deadline-content { flex: 1; }
        .le-deadline-title { font-weight: 600; margin-bottom: 4px; }
        .le-deadline-case { font-size: 12px; color: var(--le-text-muted); }
        .le-deadline-due { font-size: 11px; color: var(--le-text-secondary); margin-top: 4px; }

        /* 360 View Sections */
        .le-360-tabs {
            display: flex;
            gap: 4px;
            border-bottom: 1px solid var(--le-border);
            margin-bottom: 16px;
            overflow-x: auto;
        }

        .le-360-tab {
            padding: 10px 16px;
            background: none;
            border: none;
            color: var(--le-text-muted);
            font-size: 13px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            white-space: nowrap;
        }

        .le-360-tab:hover { color: var(--le-text-secondary); }
        .le-360-tab.active {
            color: var(--accent-yellow);
            border-bottom-color: var(--accent-yellow);
        }

        .le-360-section {
            background: var(--le-bg-tertiary);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .le-360-section-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--accent-yellow);
            text-transform: uppercase;
            margin-bottom: 12px;
        }

        .le-360-stat-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--le-border);
        }

        .le-360-stat-row:last-child { border-bottom: none; }

        .le-360-stat-label { color: var(--le-text-muted); font-size: 13px; }
        .le-360-stat-value { color: var(--le-text-primary); font-weight: 600; }

        /* Cases Stats Bar */
        .le-cases-stats {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .le-case-stat {
            background: var(--le-bg-secondary);
            border: 1px solid var(--le-border);
            border-radius: 8px;
            padding: 12px 20px;
            text-align: center;
            min-width: 100px;
        }

        .le-case-stat-value {
            display: block;
            font-size: 24px;
            font-weight: 700;
            color: var(--accent-yellow);
        }

        .le-case-stat-label {
            display: block;
            font-size: 11px;
            color: var(--le-text-muted);
            text-transform: uppercase;
        }

        /* Section Header */
        .le-section-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }

        .le-section-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--le-text-primary);
            margin: 0 0 4px 0;
        }

        .le-section-subtitle {
            font-size: 13px;
            color: var(--le-text-muted);
            margin: 0;
        }

        /* Deadline Legend */
        .le-deadline-legend {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
            padding: 12px;
            background: var(--le-bg-secondary);
            border-radius: 8px;
        }

        .le-legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--le-text-secondary);
        }

        .le-legend-color {
            width: 12px;
            height: 12px;
            border-radius: 3px;
        }

        .le-legend-color.critical { background: #f44336; }
        .le-legend-color.urgent { background: #ff9800; }
        .le-legend-color.normal { background: #2196f3; }

        /* Case Stage Badge */
        .le-case-stage {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            color: #fff;
        }

        /* Workflow Steps */
        .le-workflow-steps {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 24px;
            background: var(--le-bg-secondary);
            border-radius: 12px;
            margin-bottom: 24px;
            overflow-x: auto;
        }

        .le-workflow-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            min-width: 80px;
        }

        .le-step-indicator {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--le-bg-tertiary);
            border: 2px solid var(--le-border);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: var(--le-text-muted);
        }

        .le-workflow-step.completed .le-step-indicator {
            background: var(--accent-green);
            border-color: var(--accent-green);
            color: #000;
        }

        .le-workflow-step.current .le-step-indicator {
            background: var(--accent-yellow);
            border-color: var(--accent-yellow);
            color: #000;
        }

        .le-step-name {
            font-size: 11px;
            color: var(--le-text-muted);
            text-align: center;
        }

        .le-workflow-step.current .le-step-name {
            color: var(--accent-yellow);
            font-weight: 600;
        }

        .le-step-connector {
            width: 30px;
            height: 2px;
            background: var(--le-border);
        }

        /* Detail Tabs */
        .le-detail-tabs {
            display: flex;
            gap: 4px;
            border-bottom: 1px solid var(--le-border);
            margin-bottom: 20px;
        }

        .le-detail-tab {
            padding: 12px 20px;
            background: none;
            border: none;
            color: var(--le-text-muted);
            font-size: 13px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
        }

        .le-detail-tab:hover { color: var(--le-text-secondary); }
        .le-detail-tab.active {
            color: var(--accent-yellow);
            border-bottom-color: var(--accent-yellow);
        }

        /* Case Detail Header */
        .le-case-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin: 20px 0;
        }

        .le-case-detail-actions {
            display: flex;
            gap: 12px;
        }

        /* Documents Panel */
        .le-docs-panel { display: flex; flex-direction: column; gap: 12px; }
        .le-docs-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .le-docs-counts { display: flex; gap: 8px; }
        .le-count-item { font-size: 12px; padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 4px; }
        .le-count-locked { color: #f59e0b; }
        .le-count-pending { color: #3b82f6; }
        .le-docs-warning { background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #f59e0b; }
        .le-docs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .le-doc-card { background: var(--le-bg-secondary); border-radius: 10px; padding: 12px; border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s; position: relative; }
        .le-doc-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .le-card-locked { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.05); }
        .le-card-pending { border-color: rgba(59,130,246,0.3); }
        .le-doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .le-doc-icon-big { font-size: 28px; }
        .le-doc-badges { display: flex; gap: 4px; }
        .le-badge-lock, .le-badge-wait, .le-badge-done { font-size: 14px; }
        .le-badge-lock { color: #f59e0b; }
        .le-badge-wait { color: #3b82f6; }
        .le-badge-done { color: #22c55e; }
        .le-doc-body { margin-bottom: 10px; }
        .le-doc-type { font-size: 11px; color: var(--le-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .le-doc-name { font-size: 13px; font-weight: 500; color: var(--le-text-primary); line-height: 1.3; margin-bottom: 4px; }
        .le-doc-date { font-size: 11px; color: var(--le-text-muted); }
        .le-doc-pending-alert { font-size: 11px; color: #3b82f6; margin-top: 6px; padding: 4px 6px; background: rgba(59,130,246,0.1); border-radius: 4px; }
        .le-doc-footer { display: flex; gap: 6px; flex-wrap: wrap; }
        .le-doc-action { font-size: 11px; padding: 5px 8px; border: none; border-radius: 4px; cursor: pointer; background: rgba(255,255,255,0.08); color: var(--le-text-secondary); transition: all 0.2s; }
        .le-doc-action:hover { background: rgba(255,255,255,0.15); color: var(--le-text-primary); }
        .le-action-view { background: rgba(59,130,246,0.2); color: #60a5fa; }
        .le-action-view:hover { background: rgba(59,130,246,0.3); }
        .le-action-acuse { background: rgba(34,197,94,0.2); color: #4ade80; }
        .le-action-acuse:hover { background: rgba(34,197,94,0.3); }
        .le-doc-lock-info { font-size: 10px; color: #f59e0b; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); }
        .le-modal-wide { width: 90%; max-width: 1000px; }
        .le-pdf-body { padding: 0 !important; }
        .le-pdf-frame { width: 100%; height: 65vh; border: none; }
        .le-pdf-placeholder { text-align: center; padding: 60px 20px; }
        .le-pdf-icon { font-size: 72px; margin-bottom: 16px; }
        .le-pdf-file { color: #888; margin: 8px 0 16px; }
        .le-pdf-footer { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--le-text-muted); }
        .le-form-row { margin-bottom: 12px; }
        .le-form-row label { display: block; font-size: 12px; color: var(--le-text-muted); margin-bottom: 4px; }
        .le-documents-list { display: flex; flex-direction: column; gap: 8px; }
        .le-document-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--le-bg-secondary); border-radius: 8px; }
        .le-doc-icon { font-size: 24px; }
        /* Responsive */
        @media (max-width: 768px) {
            .le-header { flex-direction: column; gap: 12px; }
            .le-header-center { display: none; }
            .le-form-row { grid-template-columns: 1fr; }
            .le-kpi-grid { grid-template-columns: repeat(2, 1fr); }
            .le-cases-grid { grid-template-columns: 1fr; }
            .le-help-modal-content { width: 95%; }
        }
    `;

    document.head.appendChild(styles);
}
