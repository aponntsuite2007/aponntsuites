/**
 * TALENT ACQUISITION ENTERPRISE v2.0
 * Sistema Integral de Reclutamiento y Selección
 *
 * Flujo: Oferta → Postulación → Entrevista → Médico → Legal → Alta Automática
 *
 * Tecnologías: Node.js + PostgreSQL + Notificaciones Proactivas
 * Arquitectura: Multi-tenant, Integrado con 360, Dark Theme Enterprise
 *
 * @author Sistema Biométrico Enterprise
 * @version 2.0.0
 */

// Evitar doble carga del módulo
if (window.TalentEngine) {
    console.log('[TALENT] Módulo ya cargado');
}

console.log('%c TALENT ACQUISITION v2.0 ', 'background: linear-gradient(90deg, #1a1a2e 0%, #4a1a6b 100%); color: #ff6b9d; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT - Redux-like pattern
// ============================================================================
// Evitar redeclaración si el módulo se carga múltiples veces
if (typeof window.TalentState !== 'undefined') {
    console.log('💼 [TALENT] Estado ya inicializado');
}
window.TalentState = window.TalentState || {
    currentView: 'dashboard',
    offers: [],
    applications: [],
    interviews: [],
    pipeline: [],
    stats: {},
    selectedOffer: null,
    selectedApplication: null,
    filters: {
        status: 'all',
        department: 'all',
        branch: 'all'
    },
    isLoading: false,
    departments: [],
    branches: []
};

// ============================================================================
// CONSTANTS - Estados y configuración
// ============================================================================
const TALENT_CONSTANTS = {
    APPLICATION_STATUSES: {
        nuevo: { label: 'Nuevo', color: '#17a2b8', icon: '🆕' },
        revision: { label: 'En Revisión', color: '#6c757d', icon: '👁️' },
        entrevista_pendiente: { label: 'Entrevista Pendiente', color: '#fd7e14', icon: '📅' },
        entrevista_realizada: { label: 'Entrevista Realizada', color: '#6f42c1', icon: '✅' },
        aprobado_administrativo: { label: 'Aprobado RRHH', color: '#20c997', icon: '👔' },
        examen_pendiente: { label: 'Examen Médico Pendiente', color: '#e83e8c', icon: '🏥' },
        examen_realizado: { label: 'Examen Realizado', color: '#6610f2', icon: '📋' },
        apto: { label: 'Apto Médico', color: '#28a745', icon: '💚' },
        apto_con_observaciones: { label: 'Apto con Obs.', color: '#ffc107', icon: '⚠️' },
        no_apto: { label: 'No Apto', color: '#dc3545', icon: '❌' },
        revision_legal: { label: 'Revisión Legal', color: '#795548', icon: '⚖️' },
        aprobado_legal: { label: 'Aprobado Legal', color: '#4caf50', icon: '✔️' },
        contratado: { label: 'Contratado', color: '#28a745', icon: '🎉' },
        rechazado: { label: 'Rechazado', color: '#dc3545', icon: '🚫' },
        desistio: { label: 'Desistió', color: '#6c757d', icon: '👋' }
    },
    OFFER_STATUSES: {
        draft: { label: 'Borrador', color: '#6c757d' },
        active: { label: 'Activa', color: '#28a745' },
        paused: { label: 'Pausada', color: '#ffc107' },
        closed: { label: 'Cerrada', color: '#dc3545' },
        filled: { label: 'Cubierta', color: '#17a2b8' }
    },
    JOB_TYPES: {
        'full-time': 'Tiempo Completo',
        'part-time': 'Medio Tiempo',
        'contract': 'Contrato',
        'temporary': 'Temporal',
        'internship': 'Pasantía'
    },
    SEARCH_SCOPES: {
        external: { label: 'Solo Externa (Portal Público)', icon: '🌐', description: 'Visible solo en el portal público de empleos' },
        internal: { label: 'Solo Interna (Empleados)', icon: '👥', description: 'Solo visible para empleados actuales, con matching automático' },
        both: { label: 'Ambas (Externa + Interna)', icon: '🔄', description: 'Portal público + invitación a empleados con perfil compatible' }
    },
    PUBLICATION_CHANNELS: [
        { id: 'portal', name: 'Portal Público', icon: '🌐', enabled: true },
        { id: 'internal', name: 'Promoción Interna', icon: '👥', enabled: true },
        { id: 'email', name: 'Email a Candidatos', icon: '📧', enabled: true },
        { id: 'instagram', name: 'Instagram', icon: '📸', enabled: false, coming: true },
        { id: 'linkedin', name: 'LinkedIn', icon: '💼', enabled: false, coming: true },
        { id: 'whatsapp', name: 'WhatsApp', icon: '💬', enabled: false, coming: true }
    ],
    REQUIRED_DOCUMENTS: [
        { id: 'cv', name: 'Curriculum Vitae', required: true },
        { id: 'dni', name: 'DNI/Documento', required: true },
        { id: 'titulo', name: 'Título/Certificado', required: false },
        { id: 'antecedentes', name: 'Cert. Antecedentes', required: false },
        { id: 'referencias', name: 'Referencias Laborales', required: false },
        { id: 'analitico', name: 'Analítico', required: false }
    ]
};

// ============================================================================
// API SERVICE - Centralized fetch handler
// ============================================================================
const TalentAPI = {
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
            TalentState.isLoading = true;
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API Error');
            return data;
        } catch (error) {
            console.error(`[TalentAPI] ${endpoint}:`, error);
            throw error;
        } finally {
            TalentState.isLoading = false;
        }
    },

    // === OFERTAS ===
    getOffers: (params = '') => TalentAPI.request(`/offers${params}`),
    getOffer: (id) => TalentAPI.request(`/offers/${id}`),
    createOffer: (data) => TalentAPI.request('/offers', { method: 'POST', body: JSON.stringify(data) }),
    updateOffer: (id, data) => TalentAPI.request(`/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    publishOffer: (id, channels) => TalentAPI.request(`/offers/${id}/publish`, { method: 'POST', body: JSON.stringify({ channels }) }),
    pauseOffer: (id) => TalentAPI.request(`/offers/${id}/pause`, { method: 'POST' }),
    closeOffer: (id) => TalentAPI.request(`/offers/${id}/close`, { method: 'POST' }),

    // === POSTULACIONES ===
    getApplications: (params = '') => TalentAPI.request(`/applications${params}`),
    getApplication: (id) => TalentAPI.request(`/applications/${id}`),
    createApplication: (data) => TalentAPI.request('/applications', { method: 'POST', body: JSON.stringify(data) }),
    updateApplicationStatus: (id, status, notes) => TalentAPI.request(`/applications/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes })
    }),

    // === FLUJO DE APROBACIÓN ===
    approveAdmin: (id, notes) => TalentAPI.request(`/applications/${id}/approve-admin`, {
        method: 'POST',
        body: JSON.stringify({ notes })
    }),
    scheduleInterview: (id, data) => TalentAPI.request(`/applications/${id}/schedule-interview`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    completeInterview: (id, data) => TalentAPI.request(`/applications/${id}/complete-interview`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    setMedicalResult: (id, data) => TalentAPI.request(`/applications/${id}/medical-result`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    setLegalResult: (id, data) => TalentAPI.request(`/applications/${id}/legal-result`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    hire: (id, data) => TalentAPI.request(`/applications/${id}/hire`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    reject: (id, reason, notes) => TalentAPI.request(`/applications/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason, notes })
    }),

    // === ESTADÍSTICAS ===
    getStats: () => TalentAPI.request('/stats'),
    getPipeline: () => TalentAPI.request('/pipeline'),

    // === CANDIDATOS PENDIENTES (para médico/legal) ===
    getPendingMedical: () => TalentAPI.request('/pending-medical'),
    getPendingLegal: () => TalentAPI.request('/pending-legal'),

    // === MATCHING INTERNO ===
    runInternalMatching: (id, options = {}) => TalentAPI.request(`/offers/${id}/run-internal-matching`, {
        method: 'POST',
        body: JSON.stringify(options)
    }),
    getInternalCandidates: (id, showAll = false) => TalentAPI.request(`/offers/${id}/internal-candidates?show_all=${showAll}`),

    // === AUXILIARES ===
    getDepartments: () => fetch('/api/v1/departments', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}` }
    }).then(r => r.json()),
    getBranches: () => fetch('/api/v1/branches', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}` }
    }).then(r => r.json())
};

// ============================================================================
// UI COMPONENTS - Dark Theme Enterprise
// ============================================================================
const TalentUI = {
    // CSS Variables for dark theme
    styles: `
        .talent-container {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #e4e4e4;
            font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .talent-header {
            background: linear-gradient(90deg, #4a1a6b 0%, #6b1a5c 50%, #1a4a6b 100%);
            padding: 25px 30px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .talent-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .talent-header p {
            margin: 5px 0 0 0;
            opacity: 0.8;
            font-size: 14px;
        }
        .talent-tabs {
            display: flex;
            background: rgba(0,0,0,0.3);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding: 0 20px;
            overflow-x: auto;
        }
        .talent-tab {
            padding: 15px 25px;
            background: none;
            border: none;
            color: rgba(255,255,255,0.6);
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
            white-space: nowrap;
        }
        .talent-tab:hover {
            color: rgba(255,255,255,0.9);
            background: rgba(255,255,255,0.05);
        }
        .talent-tab.active {
            color: #ff6b9d;
            border-bottom-color: #ff6b9d;
        }
        .talent-content {
            padding: 25px;
        }
        .talent-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .talent-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .talent-card-title {
            font-size: 18px;
            font-weight: 600;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .talent-stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
        }
        .talent-stat-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .talent-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        .talent-stat-value {
            font-size: 36px;
            font-weight: 700;
            background: linear-gradient(135deg, #ff6b9d 0%, #c850c0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .talent-stat-label {
            color: rgba(255,255,255,0.7);
            font-size: 14px;
            margin-top: 5px;
        }
        .talent-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .talent-btn-primary {
            background: linear-gradient(135deg, #ff6b9d 0%, #c850c0 100%);
            color: white;
        }
        .talent-btn-primary:hover {
            box-shadow: 0 4px 15px rgba(255,107,157,0.4);
            transform: translateY(-1px);
        }
        .talent-btn-secondary {
            background: rgba(255,255,255,0.1);
            color: #e4e4e4;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .talent-btn-secondary:hover {
            background: rgba(255,255,255,0.15);
        }
        .talent-btn-success {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
        }
        .talent-btn-warning {
            background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
            color: #212529;
        }
        .talent-btn-danger {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
        }
        .talent-table {
            width: 100%;
            border-collapse: collapse;
        }
        .talent-table th {
            background: rgba(255,255,255,0.05);
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: rgba(255,255,255,0.8);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .talent-table td {
            padding: 15px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            vertical-align: middle;
        }
        .talent-table tr:hover td {
            background: rgba(255,255,255,0.03);
        }
        .talent-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .talent-input {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.2);
            color: #e4e4e4;
            padding: 12px 15px;
            border-radius: 8px;
            font-size: 14px;
            width: 100%;
            transition: border-color 0.3s;
        }
        .talent-input:focus {
            outline: none;
            border-color: #ff6b9d;
        }
        .talent-input::placeholder {
            color: rgba(255,255,255,0.4);
        }
        .talent-select {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.2);
            color: #e4e4e4;
            padding: 12px 15px;
            border-radius: 8px;
            font-size: 14px;
            width: 100%;
            cursor: pointer;
        }
        .talent-select option {
            background: #1a1a2e;
            color: #e4e4e4;
        }
        .talent-textarea {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.2);
            color: #e4e4e4;
            padding: 12px 15px;
            border-radius: 8px;
            font-size: 14px;
            width: 100%;
            min-height: 100px;
            resize: vertical;
        }
        .talent-form-group {
            margin-bottom: 20px;
        }
        .talent-form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: rgba(255,255,255,0.9);
        }
        .talent-form-label span {
            color: #ff6b9d;
        }
        .talent-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        }
        .talent-modal {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            width: 95%;
            max-width: 900px;
            max-height: 90vh;
            overflow-y: auto;
        }
        .talent-modal-header {
            background: linear-gradient(90deg, #4a1a6b 0%, #6b1a5c 100%);
            padding: 20px 25px;
            border-radius: 16px 16px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .talent-modal-header h3 {
            margin: 0;
            color: #fff;
            font-size: 20px;
        }
        .talent-modal-close {
            background: none;
            border: none;
            color: #fff;
            font-size: 28px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.3s;
        }
        .talent-modal-close:hover {
            opacity: 1;
        }
        .talent-modal-body {
            padding: 25px;
        }
        .talent-modal-footer {
            padding: 20px 25px;
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: flex-end;
            gap: 15px;
        }
        .talent-pipeline {
            display: flex;
            gap: 15px;
            overflow-x: auto;
            padding: 10px 0;
        }
        .talent-pipeline-stage {
            min-width: 280px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 15px;
        }
        .talent-pipeline-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .talent-pipeline-count {
            background: rgba(255,107,157,0.2);
            color: #ff6b9d;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .talent-candidate-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .talent-candidate-card:hover {
            background: rgba(255,255,255,0.08);
            border-color: #ff6b9d;
        }
        .talent-candidate-name {
            font-weight: 600;
            color: #fff;
            margin-bottom: 5px;
        }
        .talent-candidate-position {
            font-size: 12px;
            color: rgba(255,255,255,0.6);
        }
        .talent-empty-state {
            text-align: center;
            padding: 60px 20px;
            color: rgba(255,255,255,0.5);
        }
        .talent-empty-state-icon {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.3;
        }
        .talent-loader {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 40px;
        }
        .talent-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #ff6b9d;
            border-radius: 50%;
            animation: talent-spin 1s linear infinite;
        }
        @keyframes talent-spin {
            to { transform: rotate(360deg); }
        }
        .talent-channel-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .talent-channel-card {
            background: rgba(255,255,255,0.05);
            border: 2px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        .talent-channel-card:hover:not(.disabled) {
            border-color: #ff6b9d;
        }
        .talent-channel-card.selected {
            border-color: #ff6b9d;
            background: rgba(255,107,157,0.1);
        }
        .talent-channel-card.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .talent-channel-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .talent-channel-name {
            font-weight: 600;
            color: #fff;
        }
        .talent-channel-badge {
            font-size: 10px;
            background: #ffc107;
            color: #212529;
            padding: 2px 8px;
            border-radius: 10px;
            margin-top: 5px;
            display: inline-block;
        }
        .talent-doc-checklist {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .talent-doc-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
        }
        .talent-doc-item input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: #ff6b9d;
        }
        .talent-timeline {
            position: relative;
            padding-left: 30px;
        }
        .talent-timeline::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: rgba(255,255,255,0.1);
        }
        .talent-timeline-item {
            position: relative;
            padding-bottom: 25px;
        }
        .talent-timeline-item::before {
            content: '';
            position: absolute;
            left: -24px;
            top: 5px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ff6b9d;
            border: 2px solid #1a1a2e;
        }
        .talent-timeline-date {
            font-size: 12px;
            color: rgba(255,255,255,0.5);
            margin-bottom: 5px;
        }
        .talent-timeline-content {
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 12px;
        }
    `,

    // Inject styles
    injectStyles() {
        if (!document.getElementById('talent-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'talent-styles';
            styleEl.textContent = this.styles;
            document.head.appendChild(styleEl);
        }
    },

    // Format date
    formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    // Format datetime
    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Get status badge
    getStatusBadge(status) {
        const config = TALENT_CONSTANTS.APPLICATION_STATUSES[status] || { label: status, color: '#6c757d', icon: '❓' };
        return `<span class="talent-badge" style="background: ${config.color}20; color: ${config.color}; border: 1px solid ${config.color}40;">
            ${config.icon} ${config.label}
        </span>`;
    },

    // Get offer status badge
    getOfferStatusBadge(status) {
        const config = TALENT_CONSTANTS.OFFER_STATUSES[status] || { label: status, color: '#6c757d' };
        return `<span class="talent-badge" style="background: ${config.color}20; color: ${config.color}; border: 1px solid ${config.color}40;">
            ${config.label}
        </span>`;
    },

    // Show loading
    showLoading(container) {
        container.innerHTML = `
            <div class="talent-loader">
                <div class="talent-spinner"></div>
            </div>
        `;
    },

    // Show empty state
    showEmptyState(container, icon, message) {
        container.innerHTML = `
            <div class="talent-empty-state">
                <div class="talent-empty-state-icon">${icon}</div>
                <p>${message}</p>
            </div>
        `;
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };

        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 100000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ============================================================================
// TALENT ENGINE - Main Controller
// ============================================================================
const TalentEngine = {
    // Initialize module
    async init() {
        console.log('[TALENT] Inicializando módulo...');
        TalentUI.injectStyles();

        const content = document.getElementById('mainContent');
        if (!content) {
            console.error('[TALENT] mainContent no encontrado');
            return;
        }

        content.style.setProperty('display', 'block', 'important');
        this.render(content);

        // Load initial data
        await this.loadData();
    },

    // Load all data
    async loadData() {
        try {
            // Load departments and branches for filters
            const [deptResponse, branchResponse] = await Promise.all([
                TalentAPI.getDepartments(),
                TalentAPI.getBranches()
            ]);

            // Normalize to array (handle multiple response formats)
            TalentState.departments = Array.isArray(deptResponse) ? deptResponse :
                                      (deptResponse.departments || deptResponse.data || []);
            TalentState.branches = Array.isArray(branchResponse) ? branchResponse :
                                   (branchResponse.branches || branchResponse.data || []);

            // Load view-specific data
            await this.loadViewData();
        } catch (error) {
            console.error('[TALENT] Error loading data:', error);
            TalentUI.showToast('Error cargando datos', 'error');
        }
    },

    // Load data for current view
    async loadViewData() {
        const contentDiv = document.getElementById('talent-view-content');
        if (!contentDiv) return;

        TalentUI.showLoading(contentDiv);

        try {
            switch (TalentState.currentView) {
                case 'dashboard':
                    const stats = await TalentAPI.getStats();
                    TalentState.stats = stats;
                    this.renderDashboard(contentDiv);
                    break;
                case 'offers':
                    const offers = await TalentAPI.getOffers();
                    TalentState.offers = offers.data || offers || [];
                    this.renderOffers(contentDiv);
                    break;
                case 'applications':
                    const apps = await TalentAPI.getApplications();
                    TalentState.applications = apps.data || apps || [];
                    this.renderApplications(contentDiv);
                    break;
                case 'pipeline':
                    const pipelineResponse = await TalentAPI.getPipeline();
                    // Pipeline endpoint returns {pipeline: [...]} not {data: [...]}
                    TalentState.pipeline = Array.isArray(pipelineResponse) ? pipelineResponse :
                                          (pipelineResponse.pipeline || pipelineResponse.data || []);
                    this.renderPipeline(contentDiv);
                    break;
                case 'interviews':
                    const interviews = await TalentAPI.getApplications('?status=entrevista_pendiente,entrevista_realizada');
                    TalentState.interviews = interviews.data || interviews || [];
                    this.renderInterviews(contentDiv);
                    break;
            }
        } catch (error) {
            console.error('[TALENT] Error loading view data:', error);
            TalentUI.showEmptyState(contentDiv, '❌', 'Error cargando datos. Intente nuevamente.');
        }
    },

    // Main render
    render(container) {
        container.innerHTML = `
            <div class="talent-container">
                <div class="talent-header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1>💼 Talent Acquisition</h1>
                            <p>Sistema Integral de Reclutamiento y Selección</p>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button class="talent-btn talent-btn-secondary" onclick="TalentHelp.showDetailedHelp('dashboard')"
                                    title="Centro de Ayuda" style="padding: 10px 16px;">
                                ❓ Ayuda
                            </button>
                            <button class="talent-btn talent-btn-primary" onclick="TalentEngine.showCreateOfferModal()">
                                ➕ Nueva Oferta Laboral
                            </button>
                        </div>
                    </div>
                </div>

                <div class="talent-tabs">
                    <button class="talent-tab ${TalentState.currentView === 'dashboard' ? 'active' : ''}"
                            onclick="TalentEngine.switchView('dashboard')">
                        📊 Dashboard
                        <span class="talent-help-icon" onclick="event.stopPropagation(); TalentHelp.showHelpBubble(this, 'dashboard')">?</span>
                    </button>
                    <button class="talent-tab ${TalentState.currentView === 'offers' ? 'active' : ''}"
                            onclick="TalentEngine.switchView('offers')">
                        📋 Ofertas Laborales
                        <span class="talent-help-icon" onclick="event.stopPropagation(); TalentHelp.showHelpBubble(this, 'create_offer')">?</span>
                    </button>
                    <button class="talent-tab ${TalentState.currentView === 'applications' ? 'active' : ''}"
                            onclick="TalentEngine.switchView('applications')">
                        👥 Postulaciones
                        <span class="talent-help-icon" onclick="event.stopPropagation(); TalentHelp.showHelpBubble(this, 'applications')">?</span>
                    </button>
                    <button class="talent-tab ${TalentState.currentView === 'pipeline' ? 'active' : ''}"
                            onclick="TalentEngine.switchView('pipeline')">
                        🔄 Pipeline
                        <span class="talent-help-icon" onclick="event.stopPropagation(); TalentHelp.showHelpBubble(this, 'pipeline')">?</span>
                    </button>
                    <button class="talent-tab ${TalentState.currentView === 'interviews' ? 'active' : ''}"
                            onclick="TalentEngine.switchView('interviews')">
                        🗣️ Entrevistas
                        <span class="talent-help-icon" onclick="event.stopPropagation(); TalentHelp.showHelpBubble(this, 'pipeline')">?</span>
                    </button>
                </div>

                <div class="talent-content" id="talent-view-content">
                    <div class="talent-loader">
                        <div class="talent-spinner"></div>
                    </div>
                </div>
            </div>
        `;
    },

    // Switch view
    async switchView(view) {
        TalentState.currentView = view;

        // Update tabs
        document.querySelectorAll('.talent-tab').forEach(tab => tab.classList.remove('active'));
        event.target.classList.add('active');

        await this.loadViewData();
    },

    // ========================================================================
    // DASHBOARD VIEW
    // ========================================================================
    renderDashboard(container) {
        const stats = TalentState.stats || {};

        container.innerHTML = `
            <div class="talent-stat-grid">
                <div class="talent-stat-card">
                    <div class="talent-stat-value">${stats.active_offers || 0}</div>
                    <div class="talent-stat-label">Ofertas Activas</div>
                </div>
                <div class="talent-stat-card">
                    <div class="talent-stat-value">${stats.total_applications || 0}</div>
                    <div class="talent-stat-label">Postulaciones Totales</div>
                </div>
                <div class="talent-stat-card">
                    <div class="talent-stat-value">${stats.pending_interviews || 0}</div>
                    <div class="talent-stat-label">Entrevistas Pendientes</div>
                </div>
                <div class="talent-stat-card">
                    <div class="talent-stat-value">${stats.hired_this_month || 0}</div>
                    <div class="talent-stat-label">Contratados (Mes)</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="talent-card">
                    <div class="talent-card-header">
                        <div class="talent-card-title">📈 Postulaciones Recientes</div>
                        <button class="talent-btn talent-btn-secondary" onclick="TalentEngine.switchView('applications')">
                            Ver Todas
                        </button>
                    </div>
                    <div id="recent-applications">
                        ${this.renderRecentApplications(stats.recent_applications || [])}
                    </div>
                </div>

                <div class="talent-card">
                    <div class="talent-card-header">
                        <div class="talent-card-title">⏳ Acciones Pendientes</div>
                    </div>
                    <div id="pending-actions">
                        ${this.renderPendingActions(stats)}
                    </div>
                </div>
            </div>
        `;
    },

    renderRecentApplications(applications) {
        if (!applications.length) {
            return '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">No hay postulaciones recientes</p>';
        }

        return applications.slice(0, 5).map(app => `
            <div class="talent-candidate-card" onclick="TalentEngine.viewApplication(${app.id})">
                <div class="talent-candidate-name">${app.candidate_first_name} ${app.candidate_last_name}</div>
                <div class="talent-candidate-position">${app.job_title || 'Sin puesto'}</div>
                <div style="margin-top: 8px;">
                    ${TalentUI.getStatusBadge(app.status)}
                </div>
            </div>
        `).join('');
    },

    renderPendingActions(stats) {
        const actions = [];

        if (stats.nuevas > 0) {
            actions.push(`<div style="padding: 10px; background: rgba(23,162,184,0.1); border-radius: 8px; margin-bottom: 10px;">
                🆕 <strong>${stats.nuevas}</strong> postulaciones nuevas por revisar
            </div>`);
        }
        if (stats.pending_interviews > 0) {
            actions.push(`<div style="padding: 10px; background: rgba(253,126,20,0.1); border-radius: 8px; margin-bottom: 10px;">
                📅 <strong>${stats.pending_interviews}</strong> entrevistas por agendar
            </div>`);
        }
        if (stats.pending_medical > 0) {
            actions.push(`<div style="padding: 10px; background: rgba(232,62,140,0.1); border-radius: 8px; margin-bottom: 10px;">
                🏥 <strong>${stats.pending_medical}</strong> exámenes médicos pendientes
            </div>`);
        }
        if (stats.ready_to_hire > 0) {
            actions.push(`<div style="padding: 10px; background: rgba(40,167,69,0.1); border-radius: 8px; margin-bottom: 10px;">
                ✅ <strong>${stats.ready_to_hire}</strong> candidatos listos para contratar
            </div>`);
        }

        return actions.length ? actions.join('') : '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">No hay acciones pendientes</p>';
    },

    // ========================================================================
    // OFFERS VIEW
    // ========================================================================
    renderOffers(container) {
        const offers = TalentState.offers;

        container.innerHTML = `
            <div class="talent-card">
                <div class="talent-card-header">
                    <div class="talent-card-title">📋 Ofertas Laborales</div>
                    <div style="display: flex; gap: 10px;">
                        <select class="talent-select" style="width: auto;" onchange="TalentEngine.filterOffers(this.value)">
                            <option value="all">Todos los estados</option>
                            <option value="active">Activas</option>
                            <option value="draft">Borradores</option>
                            <option value="paused">Pausadas</option>
                            <option value="closed">Cerradas</option>
                        </select>
                    </div>
                </div>

                ${offers.length ? `
                    <table class="talent-table">
                        <thead>
                            <tr>
                                <th>Puesto</th>
                                <th>Departamento</th>
                                <th>Alcance</th>
                                <th>Postulaciones</th>
                                <th>Candidatos Int.</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${offers.map(offer => `
                                <tr>
                                    <td>
                                        <strong style="color: #fff;">${offer.title}</strong>
                                        <div style="font-size: 12px; color: rgba(255,255,255,0.5);">
                                            ${TALENT_CONSTANTS.JOB_TYPES[offer.job_type] || offer.job_type}
                                            ${offer.location ? ` • ${offer.location}` : ''}
                                        </div>
                                    </td>
                                    <td>${offer.department_name || '-'}</td>
                                    <td>
                                        ${TalentEngine.getSearchScopeBadge(offer.search_scope)}
                                    </td>
                                    <td>
                                        <span style="font-size: 20px; font-weight: 600; color: #ff6b9d;">
                                            ${offer.applications_count || 0}
                                        </span>
                                    </td>
                                    <td>
                                        ${['internal', 'both'].includes(offer.search_scope) ? `
                                            <div style="display: flex; align-items: center; gap: 5px;">
                                                <span style="font-size: 16px; font-weight: 600; color: #17a2b8;">
                                                    ${offer.internal_candidates_count || 0}
                                                </span>
                                                <button class="talent-btn talent-btn-secondary" style="padding: 3px 8px; font-size: 11px;"
                                                        onclick="TalentEngine.showInternalCandidates(${offer.id})" title="Ver candidatos internos">
                                                    👥
                                                </button>
                                            </div>
                                        ` : '-'}
                                    </td>
                                    <td>${TalentUI.getOfferStatusBadge(offer.status)}</td>
                                    <td>
                                        <div style="display: flex; gap: 5px;">
                                            <button class="talent-btn talent-btn-secondary" style="padding: 6px 10px;"
                                                    onclick="TalentEngine.viewOffer(${offer.id})" title="Ver">
                                                👁️
                                            </button>
                                            <button class="talent-btn talent-btn-secondary" style="padding: 6px 10px;"
                                                    onclick="TalentEngine.editOffer(${offer.id})" title="Editar">
                                                ✏️
                                            </button>
                                            ${['internal', 'both'].includes(offer.search_scope) && offer.status === 'active' ? `
                                                <button class="talent-btn talent-btn-primary" style="padding: 6px 10px;"
                                                        onclick="TalentEngine.runInternalMatching(${offer.id})" title="Re-escanear candidatos">
                                                    🔄
                                                </button>
                                            ` : ''}
                                            ${offer.status === 'active' ? `
                                                <button class="talent-btn talent-btn-warning" style="padding: 6px 10px;"
                                                        onclick="TalentEngine.pauseOffer(${offer.id})" title="Pausar">
                                                    ⏸️
                                                </button>
                                            ` : offer.status === 'paused' ? `
                                                <button class="talent-btn talent-btn-success" style="padding: 6px 10px;"
                                                        onclick="TalentEngine.publishOffer(${offer.id})" title="Reactivar">
                                                    ▶️
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="talent-empty-state">
                        <div class="talent-empty-state-icon">📋</div>
                        <p>No hay ofertas laborales</p>
                        <button class="talent-btn talent-btn-primary" onclick="TalentEngine.showCreateOfferModal()">
                            ➕ Crear Primera Oferta
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    // ========================================================================
    // APPLICATIONS VIEW
    // ========================================================================
    renderApplications(container) {
        const applications = TalentState.applications;

        container.innerHTML = `
            <div class="talent-card">
                <div class="talent-card-header">
                    <div class="talent-card-title">👥 Postulaciones</div>
                    <div style="display: flex; gap: 10px;">
                        <select class="talent-select" style="width: auto;" id="filter-status" onchange="TalentEngine.filterApplications()">
                            <option value="all">Todos los estados</option>
                            ${Object.entries(TALENT_CONSTANTS.APPLICATION_STATUSES).map(([key, val]) =>
                                `<option value="${key}">${val.icon} ${val.label}</option>`
                            ).join('')}
                        </select>
                        <input type="text" class="talent-input" style="width: 200px;"
                               placeholder="🔍 Buscar candidato..."
                               onkeyup="TalentEngine.searchApplications(this.value)">
                    </div>
                </div>

                ${applications.length ? `
                    <table class="talent-table">
                        <thead>
                            <tr>
                                <th>Candidato</th>
                                <th>Puesto</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="applications-tbody">
                            ${this.renderApplicationRows(applications)}
                        </tbody>
                    </table>
                ` : `
                    <div class="talent-empty-state">
                        <div class="talent-empty-state-icon">👥</div>
                        <p>No hay postulaciones</p>
                    </div>
                `}
            </div>
        `;
    },

    renderApplicationRows(applications) {
        return applications.map(app => `
            <tr data-id="${app.id}" data-status="${app.status}" data-name="${app.candidate_first_name} ${app.candidate_last_name}">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #ff6b9d 0%, #c850c0 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: white;">
                            ${app.candidate_first_name?.[0] || ''}${app.candidate_last_name?.[0] || ''}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #fff;">
                                ${app.candidate_first_name} ${app.candidate_last_name}
                            </div>
                            <div style="font-size: 12px; color: rgba(255,255,255,0.5);">
                                ${app.candidate_email || '-'}
                            </div>
                        </div>
                    </div>
                </td>
                <td>${app.job_title || 'Sin puesto'}</td>
                <td>${TalentUI.getStatusBadge(app.status)}</td>
                <td>${TalentUI.formatDate(app.applied_at)}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="talent-btn talent-btn-secondary" style="padding: 6px 10px;"
                                onclick="TalentEngine.viewApplication(${app.id})" title="Ver Ficha">
                            👁️
                        </button>
                        ${this.getApplicationActions(app)}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    getApplicationActions(app) {
        const actions = [];

        switch(app.status) {
            case 'nuevo':
                actions.push(`<button class="talent-btn talent-btn-primary" style="padding: 6px 10px;"
                              onclick="TalentEngine.startReview(${app.id})" title="Iniciar Revisión">📋</button>`);
                break;
            case 'revision':
                actions.push(`<button class="talent-btn talent-btn-success" style="padding: 6px 10px;"
                              onclick="TalentEngine.showScheduleInterviewModal(${app.id})" title="Agendar Entrevista">📅</button>`);
                actions.push(`<button class="talent-btn talent-btn-warning" style="padding: 6px 10px;"
                              onclick="TalentEngine.approveDirectly(${app.id})" title="Aprobar sin Entrevista">⏭️</button>`);
                break;
            case 'entrevista_pendiente':
                actions.push(`<button class="talent-btn talent-btn-primary" style="padding: 6px 10px;"
                              onclick="TalentEngine.showCompleteInterviewModal(${app.id})" title="Completar Entrevista">✅</button>`);
                break;
            case 'entrevista_realizada':
                actions.push(`<button class="talent-btn talent-btn-success" style="padding: 6px 10px;"
                              onclick="TalentEngine.approveAdmin(${app.id})" title="Aprobar RRHH">👔</button>`);
                break;
            case 'apto':
            case 'apto_con_observaciones':
                actions.push(`<button class="talent-btn talent-btn-success" style="padding: 6px 10px;"
                              onclick="TalentEngine.showHireModal(${app.id})" title="Contratar">🎉</button>`);
                break;
        }

        // Siempre mostrar opción de rechazar excepto en estados finales
        if (!['contratado', 'rechazado', 'desistio', 'no_apto'].includes(app.status)) {
            actions.push(`<button class="talent-btn talent-btn-danger" style="padding: 6px 10px;"
                          onclick="TalentEngine.showRejectModal(${app.id})" title="Rechazar">🚫</button>`);
        }

        return actions.join('');
    },

    // ========================================================================
    // PIPELINE VIEW
    // ========================================================================
    renderPipeline(container) {
        const stages = [
            { key: 'nuevo', label: '🆕 Nuevos', filter: ['nuevo'] },
            { key: 'revision', label: '👁️ En Revisión', filter: ['revision'] },
            { key: 'entrevista', label: '🗣️ Entrevista', filter: ['entrevista_pendiente', 'entrevista_realizada'] },
            { key: 'aprobado', label: '👔 Aprobado RRHH', filter: ['aprobado_administrativo'] },
            { key: 'medico', label: '🏥 Examen Médico', filter: ['examen_pendiente', 'examen_realizado', 'apto', 'apto_con_observaciones'] },
            { key: 'contratar', label: '🎉 Por Contratar', filter: ['apto', 'apto_con_observaciones'] }
        ];

        const pipeline = TalentState.pipeline || TalentState.applications || [];

        container.innerHTML = `
            <div class="talent-card" style="overflow-x: auto;">
                <div class="talent-card-header">
                    <div class="talent-card-title">🔄 Pipeline de Reclutamiento</div>
                </div>
                <div class="talent-pipeline">
                    ${stages.map(stage => {
                        const candidates = pipeline.filter(p => stage.filter.includes(p.status));
                        return `
                            <div class="talent-pipeline-stage">
                                <div class="talent-pipeline-header">
                                    <span>${stage.label}</span>
                                    <span class="talent-pipeline-count">${candidates.length}</span>
                                </div>
                                <div>
                                    ${candidates.length ? candidates.map(c => `
                                        <div class="talent-candidate-card" onclick="TalentEngine.viewApplication(${c.id})">
                                            <div class="talent-candidate-name">${c.candidate_first_name} ${c.candidate_last_name}</div>
                                            <div class="talent-candidate-position">${c.job_title || 'Sin puesto'}</div>
                                        </div>
                                    `).join('') : `
                                        <p style="text-align: center; color: rgba(255,255,255,0.3); font-size: 12px; padding: 20px;">
                                            Sin candidatos
                                        </p>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    // ========================================================================
    // INTERVIEWS VIEW
    // ========================================================================
    renderInterviews(container) {
        const interviews = TalentState.interviews;

        container.innerHTML = `
            <div class="talent-card">
                <div class="talent-card-header">
                    <div class="talent-card-title">🗣️ Gestión de Entrevistas</div>
                </div>

                ${interviews.length ? `
                    <table class="talent-table">
                        <thead>
                            <tr>
                                <th>Candidato</th>
                                <th>Puesto</th>
                                <th>Fecha/Hora</th>
                                <th>Lugar</th>
                                <th>Entrevistador</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${interviews.map(int => `
                                <tr>
                                    <td>
                                        <strong style="color: #fff;">${int.candidate_first_name} ${int.candidate_last_name}</strong>
                                    </td>
                                    <td>${int.job_title || '-'}</td>
                                    <td>${TalentUI.formatDateTime(int.interview_scheduled_at) || 'Por agendar'}</td>
                                    <td>${int.interview_location || '-'}</td>
                                    <td>${int.interviewer_name || 'Por asignar'}</td>
                                    <td>${TalentUI.getStatusBadge(int.status)}</td>
                                    <td>
                                        ${int.status === 'entrevista_pendiente' ? `
                                            <button class="talent-btn talent-btn-primary" style="padding: 6px 10px;"
                                                    onclick="TalentEngine.showCompleteInterviewModal(${int.id})">
                                                ✅ Completar
                                            </button>
                                        ` : `
                                            <button class="talent-btn talent-btn-secondary" style="padding: 6px 10px;"
                                                    onclick="TalentEngine.viewApplication(${int.id})">
                                                👁️ Ver
                                            </button>
                                        `}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="talent-empty-state">
                        <div class="talent-empty-state-icon">🗣️</div>
                        <p>No hay entrevistas pendientes</p>
                    </div>
                `}
            </div>
        `;
    },

    // ========================================================================
    // MODALS
    // ========================================================================

    // Create Offer Modal
    showCreateOfferModal() {
        const modal = document.createElement('div');
        modal.className = 'talent-modal-overlay';
        modal.id = 'create-offer-modal';

        modal.innerHTML = `
            <div class="talent-modal">
                <div class="talent-modal-header">
                    <h3>💼 Nueva Oferta Laboral</h3>
                    <button class="talent-modal-close" onclick="TalentEngine.closeModal('create-offer-modal')">&times;</button>
                </div>
                <div class="talent-modal-body">
                    <form id="create-offer-form">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="talent-form-group">
                                <label class="talent-form-label">Título del Puesto <span>*</span></label>
                                <input type="text" class="talent-input" name="title" required
                                       placeholder="Ej: Desarrollador Full Stack Senior">
                            </div>
                            <div class="talent-form-group">
                                <label class="talent-form-label">Departamento</label>
                                <select class="talent-select" name="department_id">
                                    <option value="">Seleccionar...</option>
                                    ${TalentState.departments.map(d =>
                                        `<option value="${d.id}">${d.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="talent-form-group">
                                <label class="talent-form-label">Tipo de Empleo</label>
                                <select class="talent-select" name="job_type">
                                    ${Object.entries(TALENT_CONSTANTS.JOB_TYPES).map(([k, v]) =>
                                        `<option value="${k}">${v}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="talent-form-group">
                                <label class="talent-form-label">Ubicación</label>
                                <input type="text" class="talent-input" name="location"
                                       placeholder="Ej: Buenos Aires / Remoto">
                            </div>
                        </div>

                        <!-- SELECTOR DE ALCANCE DE BÚSQUEDA -->
                        <div class="talent-form-group" style="margin-top: 20px;">
                            <label class="talent-form-label">
                                🎯 Alcance de la Búsqueda <span>*</span>
                                <span class="talent-help-icon" style="margin-left: 8px;"
                                      onclick="event.stopPropagation(); TalentHelp.showHelpBubble(this, 'search_scope')"
                                      title="Click para más información">?</span>
                            </label>
                            <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin-bottom: 15px;">
                                Define si la oferta será visible para el público, solo empleados internos, o ambos.
                            </p>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                                ${Object.entries(TALENT_CONSTANTS.SEARCH_SCOPES).map(([key, scope]) => `
                                    <div class="talent-channel-card search-scope-card ${key === 'external' ? 'selected' : ''}"
                                         onclick="TalentEngine.selectSearchScope(this, '${key}')"
                                         data-scope="${key}">
                                        <div class="talent-channel-icon">${scope.icon}</div>
                                        <div class="talent-channel-name" style="font-size: 13px;">${scope.label}</div>
                                        <p style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 8px;">
                                            ${scope.description}
                                        </p>
                                    </div>
                                `).join('')}
                            </div>
                            <input type="hidden" name="search_scope" id="search-scope-input" value="external">
                        </div>

                        <!-- PANEL DE MATCHING INTERNO (visible si scope es internal o both) -->
                        <div id="internal-matching-panel" class="talent-card" style="margin-top: 15px; display: none; border-color: #ff6b9d;">
                            <div class="talent-card-header" style="padding-bottom: 10px; margin-bottom: 15px;">
                                <div class="talent-card-title" style="font-size: 16px; display: flex; align-items: center; gap: 10px;">
                                    👥 Configuración de Búsqueda Interna
                                    <span class="talent-help-icon"
                                          onclick="event.stopPropagation(); TalentHelp.showHelpBubble(this, 'internal_matching')"
                                          title="Click para más información">?</span>
                                </div>
                            </div>
                            <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 15px;">
                                El sistema escaneará automáticamente a los empleados actuales y enviará
                                invitaciones a quienes tengan un perfil compatible basado en:
                            </p>
                            <div class="talent-doc-checklist" style="margin-bottom: 15px;">
                                <div class="talent-doc-item">
                                    <input type="checkbox" name="match_skills" checked>
                                    <span>Skills y competencias</span>
                                </div>
                                <div class="talent-doc-item">
                                    <input type="checkbox" name="match_experience" checked>
                                    <span>Experiencia laboral previa</span>
                                </div>
                                <div class="talent-doc-item">
                                    <input type="checkbox" name="match_certifications" checked>
                                    <span>Certificaciones y capacitaciones</span>
                                </div>
                                <div class="talent-doc-item">
                                    <input type="checkbox" name="match_education" checked>
                                    <span>Formación académica</span>
                                </div>
                            </div>
                            <div class="talent-form-group" style="margin-bottom: 0;">
                                <label class="talent-form-label" style="font-size: 13px;">Puntaje mínimo de compatibilidad (%)</label>
                                <input type="number" class="talent-input" name="min_match_score" value="50" min="0" max="100"
                                       style="width: 100px;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                            <div class="talent-form-group">
                                <label class="talent-form-label">Salario Mínimo</label>
                                <input type="number" class="talent-input" name="salary_min" placeholder="150000">
                            </div>
                            <div class="talent-form-group">
                                <label class="talent-form-label">Salario Máximo</label>
                                <input type="number" class="talent-input" name="salary_max" placeholder="250000">
                            </div>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Descripción del Puesto <span>*</span></label>
                            <textarea class="talent-textarea" name="description" required
                                      placeholder="Describe las responsabilidades y objetivos del puesto..."></textarea>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Requisitos</label>
                            <textarea class="talent-textarea" name="requirements"
                                      placeholder="Lista los requisitos técnicos y experiencia necesaria..."></textarea>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">📄 Documentación Requerida</label>
                            <div class="talent-doc-checklist">
                                ${TALENT_CONSTANTS.REQUIRED_DOCUMENTS.map(doc => `
                                    <div class="talent-doc-item">
                                        <input type="checkbox" name="required_docs" value="${doc.id}"
                                               ${doc.required ? 'checked' : ''}>
                                        <span>${doc.name}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">📢 Canales de Publicación</label>
                            <div class="talent-channel-grid">
                                ${TALENT_CONSTANTS.PUBLICATION_CHANNELS.map(ch => `
                                    <div class="talent-channel-card ${ch.enabled ? '' : 'disabled'}"
                                         onclick="${ch.enabled ? `TalentEngine.toggleChannel(this, '${ch.id}')` : ''}"
                                         data-channel="${ch.id}">
                                        <div class="talent-channel-icon">${ch.icon}</div>
                                        <div class="talent-channel-name">${ch.name}</div>
                                        ${ch.coming ? '<span class="talent-channel-badge">Próximamente</span>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </form>
                </div>
                <div class="talent-modal-footer">
                    <button class="talent-btn talent-btn-secondary" onclick="TalentEngine.closeModal('create-offer-modal')">
                        Cancelar
                    </button>
                    <button class="talent-btn talent-btn-secondary" onclick="TalentEngine.saveOfferDraft()">
                        💾 Guardar Borrador
                    </button>
                    <button class="talent-btn talent-btn-primary" onclick="TalentEngine.publishNewOffer()">
                        🚀 Publicar Oferta
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    toggleChannel(element, channelId) {
        element.classList.toggle('selected');
    },

    selectSearchScope(element, scope) {
        // Deselect all scope cards
        document.querySelectorAll('.search-scope-card').forEach(card => card.classList.remove('selected'));
        // Select this one
        element.classList.add('selected');
        // Update hidden input
        document.getElementById('search-scope-input').value = scope;

        // Show/hide internal matching panel
        const panel = document.getElementById('internal-matching-panel');
        if (scope === 'internal' || scope === 'both') {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    },

    async saveOfferDraft() {
        const form = document.getElementById('create-offer-form');
        const formData = new FormData(form);

        const data = {
            title: formData.get('title'),
            department_id: formData.get('department_id') || null,
            job_type: formData.get('job_type'),
            location: formData.get('location'),
            salary_min: formData.get('salary_min') || null,
            salary_max: formData.get('salary_max') || null,
            description: formData.get('description'),
            requirements: formData.get('requirements'),
            status: 'draft'
        };

        try {
            await TalentAPI.createOffer(data);
            TalentUI.showToast('Borrador guardado exitosamente', 'success');
            this.closeModal('create-offer-modal');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error guardando borrador', 'error');
        }
    },

    async publishNewOffer() {
        const form = document.getElementById('create-offer-form');
        const formData = new FormData(form);

        // Get selected channels
        const selectedChannels = Array.from(document.querySelectorAll('.talent-channel-card.selected:not(.search-scope-card)'))
            .map(el => el.dataset.channel)
            .filter(Boolean);

        // Get required docs
        const requiredDocs = Array.from(form.querySelectorAll('input[name="required_docs"]:checked'))
            .map(cb => cb.value);

        // Get search scope
        const searchScope = formData.get('search_scope') || 'external';

        // Build internal matching criteria if applicable
        let internalMatchingCriteria = null;
        if (searchScope === 'internal' || searchScope === 'both') {
            internalMatchingCriteria = {
                match_skills: form.querySelector('input[name="match_skills"]')?.checked !== false,
                match_experience: form.querySelector('input[name="match_experience"]')?.checked !== false,
                match_certifications: form.querySelector('input[name="match_certifications"]')?.checked !== false,
                match_education: form.querySelector('input[name="match_education"]')?.checked !== false,
                min_match_score: parseInt(formData.get('min_match_score')) || 50
            };
        }

        const data = {
            title: formData.get('title'),
            department_id: formData.get('department_id') || null,
            job_type: formData.get('job_type'),
            location: formData.get('location'),
            salary_min: formData.get('salary_min') || null,
            salary_max: formData.get('salary_max') || null,
            description: formData.get('description'),
            requirements: formData.get('requirements'),
            required_documents: requiredDocs,
            publication_channels: selectedChannels,
            // Campos de búsqueda interna
            search_scope: searchScope,
            internal_matching_enabled: searchScope !== 'external',
            internal_matching_criteria: internalMatchingCriteria,
            status: 'active'
        };

        if (!data.title || !data.description) {
            TalentUI.showToast('Complete los campos requeridos', 'warning');
            return;
        }

        try {
            const result = await TalentAPI.createOffer(data);

            // Show message based on search scope
            let message = '¡Oferta publicada exitosamente!';
            if (searchScope === 'internal' || searchScope === 'both') {
                // Publish and run matching
                await TalentAPI.publishOffer(result.offer?.id || result.id, selectedChannels);
                message = '¡Oferta publicada! Se están enviando invitaciones a candidatos internos compatibles.';
            }

            TalentUI.showToast(message, 'success');
            this.closeModal('create-offer-modal');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error publicando oferta: ' + error.message, 'error');
        }
    },

    // View Application Modal
    async viewApplication(id) {
        try {
            const app = await TalentAPI.getApplication(id);
            TalentState.selectedApplication = app;

            const modal = document.createElement('div');
            modal.className = 'talent-modal-overlay';
            modal.id = 'view-application-modal';

            modal.innerHTML = `
                <div class="talent-modal" style="max-width: 1000px;">
                    <div class="talent-modal-header">
                        <h3>👤 Ficha del Candidato</h3>
                        <button class="talent-modal-close" onclick="TalentEngine.closeModal('view-application-modal')">&times;</button>
                    </div>
                    <div class="talent-modal-body">
                        <div style="display: grid; grid-template-columns: 300px 1fr; gap: 25px;">
                            <!-- Sidebar con info básica -->
                            <div>
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #ff6b9d 0%, #c850c0 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 600; color: white; margin: 0 auto 15px;">
                                        ${app.candidate_first_name?.[0] || ''}${app.candidate_last_name?.[0] || ''}
                                    </div>
                                    <h3 style="margin: 0; color: #fff;">${app.candidate_first_name} ${app.candidate_last_name}</h3>
                                    <p style="color: rgba(255,255,255,0.6); margin: 5px 0;">${app.candidate_email}</p>
                                    <div style="margin-top: 10px;">
                                        ${TalentUI.getStatusBadge(app.status)}
                                    </div>
                                </div>

                                <div class="talent-card" style="padding: 15px;">
                                    <h4 style="margin: 0 0 15px 0; color: #ff6b9d;">📋 Información</h4>
                                    <div style="font-size: 14px;">
                                        <p><strong>📞 Teléfono:</strong> ${app.candidate_phone || '-'}</p>
                                        <p><strong>🪪 DNI:</strong> ${app.candidate_dni || '-'}</p>
                                        <p><strong>📍 Ubicación:</strong> ${app.candidate_city || '-'}, ${app.candidate_province || '-'}</p>
                                        <p><strong>📅 Postulación:</strong> ${TalentUI.formatDate(app.applied_at)}</p>
                                    </div>
                                </div>

                                <div class="talent-card" style="padding: 15px; margin-top: 15px;">
                                    <h4 style="margin: 0 0 15px 0; color: #ff6b9d;">💼 Puesto</h4>
                                    <div style="font-size: 14px;">
                                        <p><strong>${app.job_title || 'Sin especificar'}</strong></p>
                                        <p>Expectativa: $${app.salary_expectation || '-'}</p>
                                        <p>Disponibilidad: ${app.availability || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Contenido principal -->
                            <div>
                                <!-- Timeline -->
                                <div class="talent-card">
                                    <h4 style="margin: 0 0 20px 0; color: #fff;">📜 Historial del Proceso</h4>
                                    <div class="talent-timeline">
                                        ${(app.status_history || []).map(h => `
                                            <div class="talent-timeline-item">
                                                <div class="talent-timeline-date">${TalentUI.formatDateTime(h.changed_at)}</div>
                                                <div class="talent-timeline-content">
                                                    <strong>${TALENT_CONSTANTS.APPLICATION_STATUSES[h.to_status]?.label || h.to_status}</strong>
                                                    ${h.notes ? `<p style="margin: 5px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.6);">${h.notes}</p>` : ''}
                                                </div>
                                            </div>
                                        `).join('') || '<p style="color: rgba(255,255,255,0.5);">Sin historial</p>'}
                                    </div>
                                </div>

                                <!-- Notas de entrevista si existen -->
                                ${app.interview_notes ? `
                                    <div class="talent-card" style="margin-top: 15px;">
                                        <h4 style="margin: 0 0 15px 0; color: #fff;">🗣️ Notas de Entrevista</h4>
                                        <p style="color: rgba(255,255,255,0.8);">${app.interview_notes}</p>
                                        ${app.interview_score ? `
                                            <div style="margin-top: 10px;">
                                                <strong>Puntuación:</strong>
                                                <span style="color: #ff6b9d; font-size: 20px;">${app.interview_score}/10</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                ` : ''}

                                <!-- Carta de presentación -->
                                ${app.cover_letter ? `
                                    <div class="talent-card" style="margin-top: 15px;">
                                        <h4 style="margin: 0 0 15px 0; color: #fff;">💬 Carta de Presentación</h4>
                                        <p style="color: rgba(255,255,255,0.8); line-height: 1.6;">${app.cover_letter}</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="talent-modal-footer">
                        <button class="talent-btn talent-btn-secondary" onclick="TalentEngine.closeModal('view-application-modal')">
                            Cerrar
                        </button>
                        ${this.getApplicationActions(app).replace(/style="padding: 6px 10px;"/g, '')}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            TalentUI.showToast('Error cargando candidato', 'error');
        }
    },

    // Schedule Interview Modal
    showScheduleInterviewModal(appId) {
        const modal = document.createElement('div');
        modal.className = 'talent-modal-overlay';
        modal.id = 'schedule-interview-modal';

        modal.innerHTML = `
            <div class="talent-modal" style="max-width: 600px;">
                <div class="talent-modal-header">
                    <h3>📅 Agendar Entrevista</h3>
                    <button class="talent-modal-close" onclick="TalentEngine.closeModal('schedule-interview-modal')">&times;</button>
                </div>
                <div class="talent-modal-body">
                    <form id="schedule-interview-form">
                        <input type="hidden" name="application_id" value="${appId}">

                        <div class="talent-form-group">
                            <label class="talent-form-label">Fecha y Hora <span>*</span></label>
                            <input type="datetime-local" class="talent-input" name="scheduled_at" required>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Tipo de Entrevista</label>
                            <select class="talent-select" name="interview_type">
                                <option value="presencial">Presencial</option>
                                <option value="virtual">Virtual (Videollamada)</option>
                                <option value="telefonica">Telefónica</option>
                            </select>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Lugar / Link</label>
                            <input type="text" class="talent-input" name="location"
                                   placeholder="Ej: Oficina Central, Piso 3 / Link de Meet">
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Entrevistador</label>
                            <input type="text" class="talent-input" name="interviewer_name"
                                   placeholder="Nombre del entrevistador">
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Documentación a Traer</label>
                            <textarea class="talent-textarea" name="bring_documents"
                                      placeholder="Ej: DNI original, Certificados de estudios..."></textarea>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Notas Adicionales</label>
                            <textarea class="talent-textarea" name="notes"
                                      placeholder="Instrucciones especiales para el candidato..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="talent-modal-footer">
                    <button class="talent-btn talent-btn-secondary" onclick="TalentEngine.closeModal('schedule-interview-modal')">
                        Cancelar
                    </button>
                    <button class="talent-btn talent-btn-primary" onclick="TalentEngine.submitScheduleInterview()">
                        📅 Agendar y Notificar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async submitScheduleInterview() {
        const form = document.getElementById('schedule-interview-form');
        const formData = new FormData(form);

        const appId = formData.get('application_id');
        const data = {
            scheduled_at: formData.get('scheduled_at'),
            interview_type: formData.get('interview_type'),
            location: formData.get('location'),
            interviewer_name: formData.get('interviewer_name'),
            bring_documents: formData.get('bring_documents'),
            notes: formData.get('notes')
        };

        try {
            await TalentAPI.scheduleInterview(appId, data);
            TalentUI.showToast('Entrevista agendada. Se enviaron notificaciones.', 'success');
            this.closeModal('schedule-interview-modal');
            this.closeModal('view-application-modal');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error agendando entrevista', 'error');
        }
    },

    // Hire Modal
    showHireModal(appId) {
        const app = TalentState.selectedApplication || TalentState.applications.find(a => a.id === appId);

        const modal = document.createElement('div');
        modal.className = 'talent-modal-overlay';
        modal.id = 'hire-modal';

        modal.innerHTML = `
            <div class="talent-modal" style="max-width: 600px;">
                <div class="talent-modal-header" style="background: linear-gradient(90deg, #28a745 0%, #20c997 100%);">
                    <h3>🎉 Contratar Candidato</h3>
                    <button class="talent-modal-close" onclick="TalentEngine.closeModal('hire-modal')">&times;</button>
                </div>
                <div class="talent-modal-body">
                    <div style="text-align: center; margin-bottom: 25px; padding: 20px; background: rgba(40,167,69,0.1); border-radius: 12px;">
                        <h3 style="margin: 0; color: #28a745;">
                            ${app?.candidate_first_name || ''} ${app?.candidate_last_name || ''}
                        </h3>
                        <p style="color: rgba(255,255,255,0.6); margin: 5px 0;">${app?.job_title || 'Sin puesto'}</p>
                    </div>

                    <form id="hire-form">
                        <input type="hidden" name="application_id" value="${appId}">

                        <div class="talent-form-group">
                            <label class="talent-form-label">Fecha de Ingreso <span>*</span></label>
                            <input type="date" class="talent-input" name="start_date" required>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Puesto Asignado</label>
                            <input type="text" class="talent-input" name="position"
                                   value="${app?.job_title || ''}" placeholder="Puesto oficial">
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Salario Acordado</label>
                            <input type="number" class="talent-input" name="salary"
                                   value="${app?.salary_expectation || ''}" placeholder="Salario mensual">
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Tipo de Contrato</label>
                            <select class="talent-select" name="contract_type">
                                <option value="indefinido">Indefinido</option>
                                <option value="temporal">Temporal</option>
                                <option value="prueba">Período de Prueba</option>
                            </select>
                        </div>

                        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-top: 20px;">
                            <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">
                                ℹ️ <strong>Alta Automática:</strong> Al confirmar, el sistema creará automáticamente
                                el usuario del empleado con los datos de la postulación. Se generará una contraseña
                                temporal que deberá cambiar en su primer ingreso.
                            </p>
                        </div>
                    </form>
                </div>
                <div class="talent-modal-footer">
                    <button class="talent-btn talent-btn-secondary" onclick="TalentEngine.closeModal('hire-modal')">
                        Cancelar
                    </button>
                    <button class="talent-btn talent-btn-success" onclick="TalentEngine.submitHire()">
                        🎉 Confirmar Contratación
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async submitHire() {
        const form = document.getElementById('hire-form');
        const formData = new FormData(form);

        const appId = formData.get('application_id');
        const data = {
            start_date: formData.get('start_date'),
            position: formData.get('position'),
            salary: formData.get('salary'),
            contract_type: formData.get('contract_type')
        };

        try {
            const result = await TalentAPI.hire(appId, data);

            let message = '¡Candidato contratado exitosamente!';
            if (result.newEmployee) {
                message += `\n\nUsuario creado: ${result.newEmployee.username}\nContraseña temporal: ${result.newEmployee.temporaryPassword}`;
            }

            TalentUI.showToast(message, 'success');
            this.closeModal('hire-modal');
            this.closeModal('view-application-modal');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error contratando candidato: ' + error.message, 'error');
        }
    },

    // ========================================================================
    // ACTIONS
    // ========================================================================

    async startReview(appId) {
        try {
            await TalentAPI.updateApplicationStatus(appId, 'revision', 'Iniciada revisión de documentación');
            TalentUI.showToast('Postulación en revisión', 'success');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error actualizando estado', 'error');
        }
    },

    async approveAdmin(appId) {
        try {
            await TalentAPI.approveAdmin(appId, 'Aprobado por RRHH');
            TalentUI.showToast('Candidato aprobado. Se notificó al área médica.', 'success');
            this.closeModal('view-application-modal');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error aprobando candidato', 'error');
        }
    },

    async approveDirectly(appId) {
        if (!confirm('¿Aprobar directamente sin entrevista?')) return;
        await this.approveAdmin(appId);
    },

    showRejectModal(appId) {
        const modal = document.createElement('div');
        modal.className = 'talent-modal-overlay';
        modal.id = 'reject-modal';

        modal.innerHTML = `
            <div class="talent-modal" style="max-width: 500px;">
                <div class="talent-modal-header" style="background: linear-gradient(90deg, #dc3545 0%, #c82333 100%);">
                    <h3>🚫 Rechazar Candidato</h3>
                    <button class="talent-modal-close" onclick="TalentEngine.closeModal('reject-modal')">&times;</button>
                </div>
                <div class="talent-modal-body">
                    <form id="reject-form">
                        <input type="hidden" name="application_id" value="${appId}">

                        <div class="talent-form-group">
                            <label class="talent-form-label">Motivo del Rechazo <span>*</span></label>
                            <select class="talent-select" name="reason" required>
                                <option value="">Seleccionar...</option>
                                <option value="perfil_no_adecuado">Perfil no adecuado</option>
                                <option value="experiencia_insuficiente">Experiencia insuficiente</option>
                                <option value="expectativa_salarial">Expectativa salarial fuera de rango</option>
                                <option value="documentacion_incompleta">Documentación incompleta</option>
                                <option value="no_supero_entrevista">No superó entrevista</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Notas Adicionales</label>
                            <textarea class="talent-textarea" name="notes"
                                      placeholder="Detalles adicionales del rechazo..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="talent-modal-footer">
                    <button class="talent-btn talent-btn-secondary" onclick="TalentEngine.closeModal('reject-modal')">
                        Cancelar
                    </button>
                    <button class="talent-btn talent-btn-danger" onclick="TalentEngine.submitReject()">
                        🚫 Confirmar Rechazo
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async submitReject() {
        const form = document.getElementById('reject-form');
        const formData = new FormData(form);

        const appId = formData.get('application_id');
        const reason = formData.get('reason');
        const notes = formData.get('notes');

        if (!reason) {
            TalentUI.showToast('Seleccione un motivo', 'warning');
            return;
        }

        try {
            await TalentAPI.reject(appId, reason, notes);
            TalentUI.showToast('Candidato rechazado', 'info');
            this.closeModal('reject-modal');
            this.closeModal('view-application-modal');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error rechazando candidato', 'error');
        }
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.remove();
    },

    // Get search scope badge
    getSearchScopeBadge(scope) {
        const scopes = {
            external: { label: 'Externa', color: '#17a2b8', icon: '🌐' },
            internal: { label: 'Interna', color: '#6f42c1', icon: '👥' },
            both: { label: 'Ambas', color: '#20c997', icon: '🔄' }
        };
        const config = scopes[scope] || scopes.external;
        return `<span class="talent-badge" style="background: ${config.color}20; color: ${config.color}; border: 1px solid ${config.color}40;">
            ${config.icon} ${config.label}
        </span>`;
    },

    // Show internal candidates modal
    async showInternalCandidates(offerId) {
        try {
            const result = await TalentAPI.getInternalCandidates(offerId, true);

            const modal = document.createElement('div');
            modal.className = 'talent-modal-overlay';
            modal.id = 'internal-candidates-modal';

            modal.innerHTML = `
                <div class="talent-modal" style="max-width: 800px;">
                    <div class="talent-modal-header" style="background: linear-gradient(90deg, #6f42c1 0%, #17a2b8 100%);">
                        <h3>👥 Candidatos Internos</h3>
                        <button class="talent-modal-close" onclick="TalentEngine.closeModal('internal-candidates-modal')">&times;</button>
                    </div>
                    <div class="talent-modal-body">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                            <div>
                                <p style="margin: 0; color: rgba(255,255,255,0.7);">
                                    Total: <strong>${result.total}</strong> candidatos |
                                    Notificados: <strong>${result.alreadyNotified}</strong> |
                                    Pendientes: <strong>${result.pendingNotification}</strong>
                                </p>
                                ${result.lastExecutedAt ? `
                                    <p style="margin: 5px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.5);">
                                        Último escaneo: ${TalentUI.formatDateTime(result.lastExecutedAt)}
                                    </p>
                                ` : ''}
                            </div>
                            <button class="talent-btn talent-btn-primary" onclick="TalentEngine.runInternalMatching(${offerId})">
                                🔄 Re-escanear
                            </button>
                        </div>

                        ${result.candidates?.length ? `
                            <table class="talent-table">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Puesto Actual</th>
                                        <th>Compatibilidad</th>
                                        <th>Detalles</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${result.candidates.map(c => `
                                        <tr>
                                            <td>
                                                <div style="display: flex; align-items: center; gap: 10px;">
                                                    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #6f42c1 0%, #17a2b8 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: white; font-size: 12px;">
                                                        ${c.name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '??'}
                                                    </div>
                                                    <div>
                                                        <div style="font-weight: 600; color: #fff;">${c.name}</div>
                                                        <div style="font-size: 11px; color: rgba(255,255,255,0.5);">${c.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>${c.current_position || '-'}</td>
                                            <td>
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                                                        <div style="height: 100%; width: ${c.score}%; background: ${c.score >= 70 ? '#28a745' : c.score >= 50 ? '#ffc107' : '#dc3545'};"></div>
                                                    </div>
                                                    <span style="font-weight: 600; color: ${c.score >= 70 ? '#28a745' : c.score >= 50 ? '#ffc107' : '#dc3545'};">${c.score}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                ${c.matchDetails?.map(d => `
                                                    <span style="display: inline-block; font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; margin: 2px;">
                                                        ${d.category}: +${d.points}
                                                    </span>
                                                `).join('') || '-'}
                                            </td>
                                            <td>
                                                ${c.already_notified ? `
                                                    <span class="talent-badge" style="background: rgba(40,167,69,0.2); color: #28a745; border: 1px solid rgba(40,167,69,0.3);">
                                                        ✓ Notificado
                                                    </span>
                                                ` : `
                                                    <span class="talent-badge" style="background: rgba(255,193,7,0.2); color: #ffc107; border: 1px solid rgba(255,193,7,0.3);">
                                                        ⏳ Pendiente
                                                    </span>
                                                `}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div class="talent-empty-state" style="padding: 40px;">
                                <div class="talent-empty-state-icon">👥</div>
                                <p>No se encontraron candidatos internos compatibles</p>
                                <p style="font-size: 12px; color: rgba(255,255,255,0.4);">
                                    Ajuste los criterios de matching o las habilidades requeridas
                                </p>
                            </div>
                        `}
                    </div>
                    <div class="talent-modal-footer">
                        <button class="talent-btn talent-btn-secondary" onclick="TalentEngine.closeModal('internal-candidates-modal')">
                            Cerrar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            TalentUI.showToast('Error cargando candidatos internos', 'error');
        }
    },

    // Run internal matching
    async runInternalMatching(offerId) {
        try {
            TalentUI.showToast('Escaneando empleados...', 'info');
            const result = await TalentAPI.runInternalMatching(offerId, { force: false });

            TalentUI.showToast(
                `${result.result?.candidatesNotified || 0} nuevos candidatos notificados`,
                'success'
            );

            // Close and reopen modal if it's open
            this.closeModal('internal-candidates-modal');
            await this.showInternalCandidates(offerId);

            // Refresh offers list
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error ejecutando matching: ' + error.message, 'error');
        }
    },

    filterApplications() {
        const status = document.getElementById('filter-status')?.value || 'all';
        const rows = document.querySelectorAll('#applications-tbody tr');

        rows.forEach(row => {
            if (status === 'all' || row.dataset.status === status) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    },

    searchApplications(query) {
        const rows = document.querySelectorAll('#applications-tbody tr');
        const lowerQuery = query.toLowerCase();

        rows.forEach(row => {
            const name = row.dataset.name?.toLowerCase() || '';
            if (name.includes(lowerQuery)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    },

    async filterOffers(status) {
        const params = status !== 'all' ? `?status=${status}` : '';
        const offers = await TalentAPI.getOffers(params);
        TalentState.offers = offers.data || offers || [];
        this.renderOffers(document.getElementById('talent-view-content'));
    },

    async viewOffer(id) {
        // TODO: Implement offer detail view
        alert(`Ver oferta ${id} - En desarrollo`);
    },

    async editOffer(id) {
        // TODO: Implement offer edit
        alert(`Editar oferta ${id} - En desarrollo`);
    },

    async pauseOffer(id) {
        if (!confirm('¿Pausar esta oferta?')) return;
        try {
            await TalentAPI.pauseOffer(id);
            TalentUI.showToast('Oferta pausada', 'info');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error pausando oferta', 'error');
        }
    },

    async publishOffer(id) {
        try {
            await TalentAPI.publishOffer(id, ['portal']);
            TalentUI.showToast('Oferta reactivada', 'success');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error reactivando oferta', 'error');
        }
    },

    showCompleteInterviewModal(appId) {
        const modal = document.createElement('div');
        modal.className = 'talent-modal-overlay';
        modal.id = 'complete-interview-modal';

        modal.innerHTML = `
            <div class="talent-modal" style="max-width: 600px;">
                <div class="talent-modal-header">
                    <h3>✅ Completar Entrevista</h3>
                    <button class="talent-modal-close" onclick="TalentEngine.closeModal('complete-interview-modal')">&times;</button>
                </div>
                <div class="talent-modal-body">
                    <form id="complete-interview-form">
                        <input type="hidden" name="application_id" value="${appId}">

                        <div class="talent-form-group">
                            <label class="talent-form-label">Puntuación (1-10) <span>*</span></label>
                            <input type="number" class="talent-input" name="score" min="1" max="10" required>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Recomendación <span>*</span></label>
                            <select class="talent-select" name="recommendation" required>
                                <option value="">Seleccionar...</option>
                                <option value="highly_recommended">Altamente Recomendado ⭐⭐⭐</option>
                                <option value="recommended">Recomendado ⭐⭐</option>
                                <option value="acceptable">Aceptable ⭐</option>
                                <option value="not_recommended">No Recomendado ❌</option>
                            </select>
                        </div>

                        <div class="talent-form-group">
                            <label class="talent-form-label">Notas de la Entrevista <span>*</span></label>
                            <textarea class="talent-textarea" name="notes" required
                                      placeholder="Observaciones sobre el candidato, fortalezas, debilidades, impresión general..."></textarea>
                        </div>
                    </form>
                </div>
                <div class="talent-modal-footer">
                    <button class="talent-btn talent-btn-secondary" onclick="TalentEngine.closeModal('complete-interview-modal')">
                        Cancelar
                    </button>
                    <button class="talent-btn talent-btn-primary" onclick="TalentEngine.submitCompleteInterview()">
                        ✅ Guardar y Notificar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async submitCompleteInterview() {
        const form = document.getElementById('complete-interview-form');
        const formData = new FormData(form);

        const appId = formData.get('application_id');
        const data = {
            score: parseInt(formData.get('score')),
            recommendation: formData.get('recommendation'),
            notes: formData.get('notes')
        };

        try {
            await TalentAPI.completeInterview(appId, data);
            TalentUI.showToast('Entrevista completada. Se notificó a RRHH.', 'success');
            this.closeModal('complete-interview-modal');
            this.closeModal('view-application-modal');
            this.loadViewData();
        } catch (error) {
            TalentUI.showToast('Error guardando entrevista', 'error');
        }
    }
};

// ============================================================================
// CONTEXTUAL HELP SYSTEM - Powered by Ollama
// ============================================================================

// ============================================================================
// TALENT HELP SYSTEM - Migrado a ModuleHelpSystem (SSOT)
// ============================================================================

// Registrar contenido de ayuda en el sistema unificado
if (window.ModuleHelpSystem) {
    ModuleHelpSystem.registerModule('job-postings', {
        moduleName: 'Talent Acquisition',
        moduleDescription: 'Sistema integral de reclutamiento y selección de personal',

        contexts: {
            dashboard: {
                title: 'Dashboard de Reclutamiento',
                description: 'Vista general del proceso de reclutamiento con métricas clave y acciones pendientes.',
                tips: [
                    'Las métricas se actualizan en tiempo real',
                    'Los items en rojo requieren acción urgente',
                    'Usa los filtros para ver por departamento o sucursal'
                ],
                warnings: [],
                helpTopics: [
                    '¿Cómo creo una nueva oferta laboral?',
                    '¿Cómo veo los candidatos pendientes?',
                    '¿Qué significan las métricas del dashboard?'
                ],
                fieldHelp: {
                    ofertas_activas: 'Cantidad de búsquedas laborales actualmente publicadas',
                    postulaciones: 'Total de candidatos que han aplicado a tus ofertas',
                    entrevistas: 'Candidatos esperando ser entrevistados',
                    contratados: 'Incorporaciones exitosas este mes'
                }
            },

            search_scope: {
                title: 'Alcance de Búsqueda',
                description: 'Define si la oferta es pública, solo para empleados actuales, o ambas.',
                tips: [
                    'Para promociones internas, usa "Solo Interna"',
                    'El matching automático analiza skills, experiencia y certificaciones',
                    '"Ambas" maximiza el alcance de tu búsqueda'
                ],
                warnings: [
                    'Las ofertas internas notifican automáticamente a empleados compatibles'
                ],
                helpTopics: [
                    '¿Qué es el matching interno automático?',
                    '¿Cómo funciona el portal público?',
                    '¿Cuándo usar búsqueda interna vs externa?'
                ],
                fieldHelp: {
                    external: 'Visible en el portal público - cualquier persona puede postularse',
                    internal: 'Solo para empleados actuales - con invitaciones automáticas',
                    both: 'Combina portal público + invitaciones a empleados compatibles'
                }
            },

            internal_matching: {
                title: 'Matching de Candidatos Internos',
                description: 'El sistema analiza perfiles de empleados para encontrar candidatos ideales.',
                tips: [
                    'El matching usa un algoritmo de 100 puntos',
                    'Skills aportan 30 pts, Experiencia 25 pts, Certificaciones 25 pts',
                    'Puedes re-escanear cuando haya nuevos empleados'
                ],
                warnings: [
                    'Solo empleados que superen el puntaje mínimo recibirán invitación'
                ],
                helpTopics: [
                    '¿Cómo se calcula la compatibilidad?',
                    '¿Puedo ajustar el puntaje mínimo?',
                    '¿Cuándo debo re-escanear?'
                ],
                fieldHelp: {
                    score_minimo: 'Umbral de compatibilidad (por defecto 50%). Solo empleados que superen este puntaje recibirán invitación.',
                    criterios: 'Puedes activar/desactivar criterios específicos de matching',
                    rescanear: 'Ejecuta el matching nuevamente para incluir nuevos empleados o actualizaciones de perfil'
                }
            },

            pipeline: {
                title: 'Pipeline de Reclutamiento',
                description: 'Visualización Kanban del flujo de candidatos por etapas.',
                tips: [
                    'Click en un candidato para ver su ficha completa',
                    'Las notificaciones son automáticas en cada cambio de estado',
                    'El área médica recibe alertas cuando corresponde'
                ],
                warnings: [],
                helpTopics: [
                    '¿Cuáles son las etapas del pipeline?',
                    '¿Cómo muevo un candidato de etapa?',
                    '¿Se notifica al candidato de los cambios?'
                ],
                fieldHelp: {
                    nuevos: 'Postulaciones recién recibidas pendientes de revisión',
                    revision: 'Documentación siendo evaluada por RRHH',
                    entrevista: 'Candidatos en proceso de entrevista',
                    aprobado_rrhh: 'Validación administrativa completada',
                    examen_medico: 'Pendiente o realizado el preocupacional',
                    contratar: 'Candidatos listos para alta'
                }
            },

            applications: {
                title: 'Gestión de Postulaciones',
                description: 'Revisa, evalúa y gestiona los candidatos que aplican a tus ofertas.',
                tips: [
                    'Usa los filtros para ver por estado o oferta',
                    'Puedes agendar entrevistas directamente desde aquí',
                    'La contratación genera alta automática como empleado'
                ],
                warnings: [
                    'Al rechazar un candidato se envía notificación automática'
                ],
                helpTopics: [
                    '¿Cómo cambio el estado de un candidato?',
                    '¿Cómo agendo una entrevista?',
                    '¿Qué pasa cuando contrato a alguien?'
                ],
                fieldHelp: {
                    estado: 'Estado actual del candidato en el proceso de selección',
                    acciones: 'Aprobar, rechazar, agendar entrevista o contratar',
                    documentos: 'CV y documentación adjunta del candidato'
                }
            },

            create_offer: {
                title: 'Crear Oferta Laboral',
                description: 'Completa los datos del puesto y configura cómo publicarla.',
                tips: [
                    'Define un rango salarial para atraer más candidatos',
                    'Selecciona los documentos requeridos cuidadosamente',
                    'Puedes guardar como borrador y publicar después'
                ],
                warnings: [
                    'Una vez publicada, los cambios pueden afectar a candidatos existentes'
                ],
                helpTopics: [
                    '¿Qué campos son obligatorios?',
                    '¿Puedo editar una oferta después de publicarla?',
                    '¿Cómo pauso o cierro una oferta?'
                ],
                fieldHelp: {
                    titulo: 'Nombre del puesto (ej: "Desarrollador Full Stack Senior")',
                    departamento: 'Área donde se ubicará el puesto',
                    tipo_empleo: 'Full-time, Part-time, Contrato, Temporal, Pasantía',
                    ubicacion: 'Ciudad, oficina o "Remoto"',
                    salario: 'Rango salarial (mínimo - máximo)',
                    documentos: 'CV es obligatorio, el resto es configurable'
                }
            }
        },

        fallbackResponses: {
            'crear oferta': 'Para crear una oferta laboral, ve a la pestaña "Crear Oferta" y completa el formulario con título, departamento, requisitos y salario.',
            'postulacion': 'Las postulaciones se gestionan desde la pestaña "Postulaciones". Puedes filtrar por estado o por oferta.',
            'entrevista': 'Para agendar una entrevista, abre el detalle del candidato y usa el botón "Agendar Entrevista".',
            'contratar': 'Para contratar, el candidato debe estar en estado "Apto Médico". Usa el botón "Contratar" para generar el alta automática.',
            'matching': 'El matching interno analiza skills, experiencia, certificaciones y educación de los empleados contra los requisitos del puesto.',
            'pipeline': 'El pipeline muestra el flujo de candidatos por etapas: Nuevo → Revisión → Entrevista → RRHH → Médico → Contratar'
        }
    });

    console.log('✅ [TalentHelp] Contenido registrado en ModuleHelpSystem');
} else {
    console.warn('⚠️ [TalentHelp] ModuleHelpSystem no disponible, usando fallback');
}

// Wrapper de compatibilidad para llamadas existentes a TalentHelp
const TalentHelp = {
    // Contenido de respaldo si ModuleHelpSystem no está disponible
    helpContent: {
        dashboard: { title: 'Dashboard de Reclutamiento', brief: 'Vista general del proceso de reclutamiento.' },
        search_scope: { title: 'Alcance de Búsqueda', brief: 'Define si la oferta es pública, interna o ambas.' },
        internal_matching: { title: 'Matching Interno', brief: 'El sistema analiza perfiles de empleados.' },
        pipeline: { title: 'Pipeline', brief: 'Visualización Kanban del flujo de candidatos.' },
        applications: { title: 'Postulaciones', brief: 'Gestiona los candidatos que aplican.' },
        create_offer: { title: 'Crear Oferta', brief: 'Completa los datos del puesto.' }
    },

    // Delega a ModuleHelpSystem si está disponible
    showHelpBubble(element, contextKey) {
        if (window.ModuleHelpSystem && ModuleHelpSystem.modules['job-postings']) {
            const ctx = ModuleHelpSystem.modules['job-postings'].contexts[contextKey];
            if (ctx) {
                ModuleHelpSystem.showBubble(element, ctx.title, ctx.description);
                return;
            }
        }
        // Fallback
        const help = this.helpContent[contextKey];
        if (!help) return;

        document.querySelectorAll('.talent-help-bubble').forEach(b => b.remove());
        const bubble = document.createElement('div');
        bubble.className = 'talent-help-bubble';
        bubble.innerHTML = `
            <div class="talent-help-bubble-header">
                <span>💡 ${help.title}</span>
                <button onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <p>${help.brief}</p>
        `;
        const rect = element.getBoundingClientRect();
        bubble.style.cssText = `position:fixed;top:${rect.bottom+10}px;left:${Math.min(rect.left, window.innerWidth-320)}px;z-index:100001;`;
        document.body.appendChild(bubble);
        setTimeout(() => bubble.remove(), 8000);
    },

    // Muestra ayuda detallada
    showDetailedHelp(contextKey) {
        if (window.ModuleHelpSystem && ModuleHelpSystem.modules['job-postings']) {
            ModuleHelpSystem.setContext(contextKey);
            ModuleHelpSystem.toggleChat();
            return;
        }
        // Fallback simple
        alert(`Ayuda para: ${contextKey}\n\nPor favor, habilita ModuleHelpSystem para ver la ayuda completa.`);
    },

    // Pregunta al asistente
    askQuestion(contextKey) {
        if (window.ModuleHelpSystem) {
            ModuleHelpSystem.setContext(contextKey);
            ModuleHelpSystem.toggleChat();
            return;
        }
        alert('El asistente de ayuda no está disponible.');
    },

    // Inyectar estilos mínimos (fallback)
    injectHelpStyles() {
        if (document.getElementById('talent-help-styles')) return;
        const styles = document.createElement('style');
        styles.id = 'talent-help-styles';
        styles.textContent = `
            .talent-help-icon { display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:rgba(255,107,157,0.2);border:1px solid rgba(255,107,157,0.4);border-radius:50%;cursor:pointer;font-size:12px;margin-left:8px;transition:all 0.3s; }
            .talent-help-icon:hover { background:rgba(255,107,157,0.4);transform:scale(1.1); }
            .talent-help-bubble { background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:1px solid rgba(255,107,157,0.3);border-radius:12px;padding:15px;width:300px;box-shadow:0 10px 30px rgba(0,0,0,0.5);animation:fadeIn 0.3s ease; }
            .talent-help-bubble-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;color:#ff6b9d;font-weight:600; }
            .talent-help-bubble-header button { background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:18px; }
            .talent-help-bubble p { color:rgba(255,255,255,0.8);font-size:13px;margin:0;line-height:1.5; }
            @keyframes fadeIn { from{opacity:0;transform:translateY(-10px);} to{opacity:1;transform:translateY(0);} }
        `;
        document.head.appendChild(styles);
    },

    init() {
        this.injectHelpStyles();
        // Inicializar ModuleHelpSystem para este módulo
        if (window.ModuleHelpSystem && ModuleHelpSystem.modules['job-postings']) {
            ModuleHelpSystem.init('job-postings', { initialContext: 'dashboard' });
        }
        console.log('💡 [TalentHelp] Sistema de ayuda inicializado (delegando a ModuleHelpSystem)');
    }
};

// Initialize help system on load
TalentHelp.init();

// Export to window
window.TalentHelp = TalentHelp;

// ============================================================================
// INITIALIZATION
// ============================================================================

// Main entry point - called by panel-empresa.html
function showJobPostingsContent() {
    console.log('💼 [TALENT] Ejecutando showJobPostingsContent()');
    TalentEngine.init();
}

// Export to window
window.TalentEngine = TalentEngine;
window.TalentAPI = TalentAPI;
window.TalentUI = TalentUI;
window.TalentState = TalentState;
window.showJobPostingsContent = showJobPostingsContent;

// Register in Modules system
window.Modules = window.Modules || {};
window.Modules['job-postings'] = {
    init: showJobPostingsContent
};

console.log('✅ [TALENT] Módulo Talent Acquisition v2.0 cargado');
