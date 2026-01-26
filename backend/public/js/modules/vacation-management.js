/**
 * ENTERPRISE VACATION MANAGEMENT SYSTEM v2.0
 * Sistema de Gestion de Vacaciones y Permisos - Nivel Enterprise
 *
 * Tecnologias: Node.js + PostgreSQL + Sequelize
 * Arquitectura: Multi-tenant, LCT Argentina Compatible
 *
 * @author Sistema Biometrico Enterprise
 * @version 2.0.0
 */

// Evitar re-declaracion si ya fue cargado
if (typeof window.VacationState !== 'undefined') {
    console.log('%c VACATION ENGINE v2.0 (already loaded) ', 'background: #1a5a4a; color: #00e676; font-size: 12px; padding: 4px 8px; border-radius: 4px;');
} else {

console.log('%c VACATION ENGINE v2.0 ', 'background: linear-gradient(90deg, #0f4c3a 0%, #1a5a4a 100%); color: #00e676; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT - Redux-like pattern
// ============================================================================
const VacationState = window.VacationState = {
    currentView: 'requests',
    requests: [],
    scales: [],
    licenses: [],
    config: null,
    selectedYear: new Date().getFullYear(),
    isLoading: false,
    filters: {
        type: 'all',
        status: 'all',
        source: 'all',
        search: ''
    },
    stats: {
        approved: 0,
        pending: 0,
        rejected: 0,
        fromMobile: 0
    }
};

// ============================================================================
// API SERVICE - Centralized fetch handler
// ============================================================================
const VacationAPI = window.VacationAPI = {
    baseUrl: '/api/v1/vacation',

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
            if (!response.ok) throw new Error(data.error || data.message || 'API Error');
            return data;
        } catch (error) {
            console.error(`[VacationAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    // Configuration
    getConfig: () => VacationAPI.request('/config'),
    updateConfig: (data) => VacationAPI.request('/config', { method: 'PUT', body: JSON.stringify(data) }),

    // Scales - usando /config que incluye scales
    getScales: function() {
        return VacationAPI.request('/config').then(function(config) {
            return { success: true, data: (config.data && config.data.vacationScales) || [] };
        });
    },
    createScale: (data) => VacationAPI.request('/scales', { method: 'POST', body: JSON.stringify(data) }),
    updateScale: (id, data) => VacationAPI.request(`/scales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteScale: (id) => VacationAPI.request(`/scales/${id}`, { method: 'DELETE' }),

    // Extraordinary Licenses - usando /config que incluye licenses
    getLicenses: function() {
        return VacationAPI.request('/config').then(function(config) {
            return { success: true, data: (config.data && config.data.extraordinaryLicenses) || [] };
        });
    },
    createLicense: (data) => VacationAPI.request('/extraordinary-licenses', { method: 'POST', body: JSON.stringify(data) }),
    updateLicense: (id, data) => VacationAPI.request(`/extraordinary-licenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteLicense: (id) => VacationAPI.request(`/extraordinary-licenses/${id}`, { method: 'DELETE' }),

    // Requests
    // NOTA: Si window.miEspacioSelfView está activo, agregar selfView=true
    getRequests: (params = '') => {
        // Si viene de Mi Espacio, forzar vista de datos propios
        if (window.miEspacioSelfView) {
            const separator = params.includes('?') ? '&' : '?';
            params += `${separator}selfView=true`;
        }
        return VacationAPI.request(`/requests${params}`);
    },
    getRequest: (id) => VacationAPI.request(`/requests/${id}`),
    createRequest: (data) => VacationAPI.request('/requests', { method: 'POST', body: JSON.stringify(data) }),
    updateRequest: (id, data) => VacationAPI.request(`/requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    approveRequest: (id, data) => VacationAPI.request(`/requests/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) }),
    rejectRequest: (id, data) => VacationAPI.request(`/requests/${id}/reject`, { method: 'PUT', body: JSON.stringify(data) }),

    // Balance
    calculateDays: (userId) => VacationAPI.request(`/calculate-days/${userId}`),
    getBalance: (userId) => VacationAPI.request(`/balance/${userId}`)
};

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================
function showVacationManagementContent() {
    console.log('[VACATION] Rendering Enterprise Vacation Management...');

    const content = document.getElementById('mainContent');
    if (!content) {
        console.error('[VACATION] mainContent not found');
        return;
    }

    content.style.setProperty('display', 'block', 'important');

    content.innerHTML = `
        <div class="vacation-enterprise" id="vacation-app">
            <!-- Header -->
            <header class="ve-header">
                <div class="ve-header-left">
                    <div class="ve-logo">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    </div>
                    <div class="ve-title-block">
                        <h1 class="ve-title">VACATION ENGINE</h1>
                        <span class="ve-subtitle">Enterprise Leave Management</span>
                    </div>
                </div>
                <div class="ve-header-center">
                    <div class="ve-tech-badges">
                        <span class="ve-badge ve-badge-lct" title="LCT Argentina">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                            LCT Argentina
                        </span>
                        <span class="ve-badge ve-badge-db" title="PostgreSQL Database">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4z"/></svg>
                            PostgreSQL
                        </span>
                        <span class="ve-badge ve-badge-mobile" title="Mobile App Integration">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                            APK Ready
                        </span>
                    </div>
                </div>
                <div class="ve-header-right">
                    <div class="ve-year-selector">
                        <select id="ve-year" class="ve-select" onchange="VacationEngine.changeYear(this.value)">
                            ${[2025, 2024, 2023].map(y => `<option value="${y}" ${y === VacationState.selectedYear ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="VacationEngine.refresh()" class="ve-btn ve-btn-icon" title="Actualizar datos">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    </button>
                    <button onclick="VacationEngine.showNewRequestModal()" class="ve-btn ve-btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Nueva Solicitud
                    </button>
                </div>
            </header>

            <!-- Navigation Tabs -->
            <nav class="ve-nav">
                <button class="ve-nav-item active" data-view="requests" onclick="VacationEngine.showView('requests')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                    Solicitudes
                </button>
                <button class="ve-nav-item" data-view="calendar" onclick="VacationEngine.showView('calendar')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Calendario
                </button>
                <button class="ve-nav-item" data-view="policies" onclick="VacationEngine.showView('policies')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Politicas LCT
                </button>
                <button class="ve-nav-item" data-view="balance" onclick="VacationEngine.showView('balance')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    Balance
                </button>
                <button class="ve-nav-item" data-view="analytics" onclick="VacationEngine.showView('analytics')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                    Analytics
                </button>
                <button class="ve-nav-item" data-view="config" onclick="VacationEngine.showView('config')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                    Config
                </button>
            </nav>

            <!-- Main Content Area -->
            <main class="ve-main" id="ve-content">
                <div class="ve-loading">
                    <div class="ve-spinner"></div>
                    <span>Cargando datos...</span>
                </div>
            </main>
        </div>
    `;

    injectVacationStyles();
    VacationEngine.init();
}

// ============================================================================
// VACATION ENGINE - Main Controller
// ============================================================================
const VacationEngine = window.VacationEngine = {
    async init() {
        await this.showView('requests');
    },

    changeYear(year) {
        VacationState.selectedYear = parseInt(year);
        this.refresh();
    },

    async refresh() {
        await this.showView(VacationState.currentView);
    },

    async showView(view) {
        VacationState.currentView = view;

        // Update nav active state
        document.querySelectorAll('.ve-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const content = document.getElementById('ve-content');
        if (!content) return;

        content.innerHTML = '<div class="ve-loading"><div class="ve-spinner"></div><span>Cargando...</span></div>';

        try {
            switch(view) {
                case 'requests': await this.renderRequests(); break;
                case 'calendar': await this.renderCalendar(); break;
                case 'policies': await this.renderPolicies(); break;
                case 'balance': await this.renderBalance(); break;
                case 'analytics': await this.renderAnalytics(); break;
                case 'config': await this.renderConfig(); break;
            }
        } catch (error) {
            content.innerHTML = `<div class="ve-error"><span>Error: ${error.message}</span></div>`;
        }
    },

    // ========================================================================
    // REQUESTS VIEW
    // ========================================================================
    async renderRequests() {
        const content = document.getElementById('ve-content');

        let requests = [];
        let stats = { approved: 0, pending: 0, rejected: 0, fromMobile: 0 };

        try {
            const result = await VacationAPI.getRequests();
            requests = result.data || result || [];

            // Calculate stats
            requests.forEach(r => {
                if (r.status === 'approved') stats.approved++;
                if (r.status === 'pending') stats.pending++;
                if (r.status === 'rejected') stats.rejected++;
                if (r.source === 'mobile-apk' || r.source === 'mobile_app') stats.fromMobile++;
            });
            VacationState.requests = requests;
            VacationState.stats = stats;
        } catch (e) {
            console.log('[VACATION] No requests data:', e.message);
        }

        content.innerHTML = `
            <div class="ve-dashboard">
                <!-- KPI Cards -->
                <div class="ve-kpi-grid">
                    <div class="ve-kpi-card">
                        <div class="ve-kpi-icon" style="background: var(--accent-green);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <div class="ve-kpi-data">
                            <span class="ve-kpi-value">${stats.approved}</span>
                            <span class="ve-kpi-label">Aprobadas</span>
                        </div>
                    </div>
                    <div class="ve-kpi-card">
                        <div class="ve-kpi-icon" style="background: var(--accent-yellow);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div class="ve-kpi-data">
                            <span class="ve-kpi-value">${stats.pending}</span>
                            <span class="ve-kpi-label">Pendientes</span>
                        </div>
                    </div>
                    <div class="ve-kpi-card">
                        <div class="ve-kpi-icon" style="background: var(--accent-red);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </div>
                        <div class="ve-kpi-data">
                            <span class="ve-kpi-value">${stats.rejected}</span>
                            <span class="ve-kpi-label">Rechazadas</span>
                        </div>
                    </div>
                    <div class="ve-kpi-card">
                        <div class="ve-kpi-icon" style="background: var(--accent-purple);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                        </div>
                        <div class="ve-kpi-data">
                            <span class="ve-kpi-value">${stats.fromMobile}</span>
                            <span class="ve-kpi-label">Desde APK</span>
                        </div>
                    </div>
                </div>

                <!-- Filters Toolbar -->
                <div class="ve-toolbar">
                    <div class="ve-filters">
                        <select class="ve-select" id="filter-type" onchange="VacationEngine.filterRequests()">
                            <option value="all">Todos los tipos</option>
                            <option value="vacation">Vacaciones</option>
                            <option value="personal_leave">Permiso Personal</option>
                            <option value="sick_leave">Licencia Medica</option>
                            <option value="maternity">Maternidad</option>
                            <option value="study_leave">Estudio</option>
                        </select>
                        <select class="ve-select" id="filter-status" onchange="VacationEngine.filterRequests()">
                            <option value="all">Todos los estados</option>
                            <option value="pending">Pendiente</option>
                            <option value="approved">Aprobada</option>
                            <option value="rejected">Rechazada</option>
                        </select>
                        <select class="ve-select" id="filter-source" onchange="VacationEngine.filterRequests()">
                            <option value="all">Todas las fuentes</option>
                            <option value="web">Web</option>
                            <option value="mobile-apk">APK Movil</option>
                        </select>
                    </div>
                    <div class="ve-search-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input type="text" placeholder="Buscar empleado..." id="search-requests" onkeyup="VacationEngine.filterRequests()">
                    </div>
                </div>

                <!-- Requests Table -->
                <div class="ve-table-container">
                    <table class="ve-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Empleado</th>
                                <th>Tipo</th>
                                <th>Fechas</th>
                                <th>Dias</th>
                                <th>Fuente</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="requests-tbody">
                            ${requests.length === 0 ? `
                                <tr><td colspan="8" class="ve-empty-cell">
                                    <div class="ve-empty-state">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                                        <h4>No hay solicitudes</h4>
                                        <p>Las solicitudes de vacaciones apareceran aqui</p>
                                    </div>
                                </td></tr>
                            ` : requests.map(r => `
                                <tr>
                                    <td><code>#${r.id}</code></td>
                                    <td>${r.user?.firstName || r.employee?.firstName || ''} ${r.user?.lastName || r.employee?.lastName || ''}</td>
                                    <td>${this.getRequestTypeBadge(r.request_type || r.requestType || r.type)}</td>
                                    <td>${this.formatDate(r.start_date || r.startDate)} - ${this.formatDate(r.end_date || r.endDate)}</td>
                                    <td><strong>${r.days_requested || r.totalDays || r.daysRequested || '-'}</strong></td>
                                    <td>${this.getSourceBadge(r.source || 'web')}</td>
                                    <td>${this.getStatusBadge(r.status)}</td>
                                    <td>
                                        <div class="ve-actions">
                                            <button class="ve-btn ve-btn-icon-sm" onclick="VacationEngine.viewRequest(${r.id})" title="Ver detalles">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                            </button>
                                            ${r.status === 'pending' ? `
                                                <button class="ve-btn ve-btn-icon-sm ve-btn-success" onclick="VacationEngine.approveRequest(${r.id})" title="Aprobar">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                                </button>
                                                <button class="ve-btn ve-btn-icon-sm ve-btn-danger" onclick="VacationEngine.rejectRequest(${r.id})" title="Rechazar">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // POLICIES VIEW - LCT Argentina
    // ========================================================================
    async renderPolicies() {
        const content = document.getElementById('ve-content');

        let scales = [];
        let licenses = [];

        try {
            const configResult = await VacationAPI.getConfig();
            scales = configResult.data?.scales || [];
            licenses = configResult.data?.licenses || [];
        } catch (e) {
            console.log('[VACATION] No policies data');
        }

        content.innerHTML = `
            <div class="ve-policies">
                <!-- Vacation Scales Section -->
                <div class="ve-section">
                    <div class="ve-section-header">
                        <div>
                            <h3 class="ve-section-title">Escalas de Vacaciones por Antiguedad</h3>
                            <p class="ve-section-desc">Configuracion segun Ley de Contrato de Trabajo (LCT) Argentina</p>
                        </div>
                        <button onclick="VacationEngine.showScaleModal()" class="ve-btn ve-btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Nueva Escala
                        </button>
                    </div>

                    <div class="ve-cards-grid">
                        ${scales.length === 0 ? `
                            <div class="ve-empty-card">
                                <p>No hay escalas configuradas</p>
                            </div>
                        ` : scales.map(s => `
                            <div class="ve-policy-card">
                                <div class="ve-policy-header">
                                    <span class="ve-policy-range">${s.min_years} - ${s.max_years || '+'} anos</span>
                                    <span class="ve-policy-days">${s.vacation_days} dias</span>
                                </div>
                                <div class="ve-policy-body">
                                    <p>${s.description || 'Sin descripcion'}</p>
                                </div>
                                <div class="ve-policy-footer">
                                    <button onclick="VacationEngine.editScale(${s.id})" class="ve-btn ve-btn-sm">Editar</button>
                                    <button onclick="VacationEngine.deleteScale(${s.id})" class="ve-btn ve-btn-sm ve-btn-outline">Eliminar</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Extraordinary Licenses Section -->
                <div class="ve-section">
                    <div class="ve-section-header">
                        <div>
                            <h3 class="ve-section-title">Licencias Extraordinarias</h3>
                            <p class="ve-section-desc">Licencias especiales segun LCT Art. 158-161</p>
                        </div>
                        <button onclick="VacationEngine.showLicenseModal()" class="ve-btn ve-btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Nueva Licencia
                        </button>
                    </div>

                    <div class="ve-table-container">
                        <table class="ve-table">
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Dias</th>
                                    <th>Remunerada</th>
                                    <th>Requiere Certificado</th>
                                    <th>Articulo LCT</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${licenses.length === 0 ? `
                                    <tr><td colspan="6" class="ve-empty-cell">No hay licencias configuradas</td></tr>
                                ` : licenses.map(l => `
                                    <tr>
                                        <td><strong>${l.license_type}</strong></td>
                                        <td><span class="ve-badge ve-badge-info">${l.days_allowed} dias</span></td>
                                        <td>${l.is_paid ? '<span class="ve-status ve-status-success">Si</span>' : '<span class="ve-status ve-status-warning">No</span>'}</td>
                                        <td>${l.requires_certificate ? '<span class="ve-status ve-status-info">Si</span>' : 'No'}</td>
                                        <td><code>Art. ${l.lct_article || '-'}</code></td>
                                        <td>
                                            <button onclick="VacationEngine.editLicense(${l.id})" class="ve-btn ve-btn-icon-sm" title="Editar">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </button>
                                            <button onclick="VacationEngine.deleteLicense(${l.id})" class="ve-btn ve-btn-icon-sm" title="Eliminar">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // CALENDAR VIEW
    // ========================================================================
    async renderCalendar() {
        const content = document.getElementById('ve-content');
        const now = new Date();
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        content.innerHTML = `
            <div class="ve-calendar-view">
                <div class="ve-calendar-header">
                    <button onclick="VacationEngine.changeCalendarMonth(-1)" class="ve-btn ve-btn-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <h3 id="calendar-month-title">${monthNames[now.getMonth()]} ${now.getFullYear()}</h3>
                    <button onclick="VacationEngine.changeCalendarMonth(1)" class="ve-btn ve-btn-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>

                <div class="ve-calendar-grid" id="calendar-grid">
                    <div class="ve-calendar-day-header">Dom</div>
                    <div class="ve-calendar-day-header">Lun</div>
                    <div class="ve-calendar-day-header">Mar</div>
                    <div class="ve-calendar-day-header">Mie</div>
                    <div class="ve-calendar-day-header">Jue</div>
                    <div class="ve-calendar-day-header">Vie</div>
                    <div class="ve-calendar-day-header">Sab</div>
                    ${this.generateCalendarDays(now.getFullYear(), now.getMonth())}
                </div>

                <div class="ve-calendar-legend">
                    <span><span class="ve-legend-dot ve-legend-approved"></span> Aprobadas</span>
                    <span><span class="ve-legend-dot ve-legend-pending"></span> Pendientes</span>
                    <span><span class="ve-legend-dot ve-legend-today"></span> Hoy</span>
                </div>
            </div>
        `;
    },

    generateCalendarDays(year, month) {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        let html = '';

        // Empty cells for days before the first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="ve-calendar-day ve-calendar-day-empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            html += `<div class="ve-calendar-day ${isToday ? 've-calendar-day-today' : ''}">${day}</div>`;
        }

        return html;
    },

    // ========================================================================
    // BALANCE VIEW
    // ========================================================================
    async renderBalance() {
        const content = document.getElementById('ve-content');

        content.innerHTML = `
            <div class="ve-balance-view">
                <div class="ve-section-header">
                    <div>
                        <h3 class="ve-section-title">Balance de Vacaciones</h3>
                        <p class="ve-section-desc">Dias disponibles y utilizados por empleado</p>
                    </div>
                    <div class="ve-search-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input type="text" placeholder="Buscar empleado..." id="search-balance">
                    </div>
                </div>

                <div class="ve-balance-info">
                    <div class="ve-ai-panel">
                        <div class="ve-ai-header">
                            <div class="ve-ai-title">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z"/></svg>
                                Calculo Automatico LCT
                            </div>
                            <span class="ve-ai-status">Activo</span>
                        </div>
                        <div class="ve-ai-content">
                            <p>El sistema calcula automaticamente los dias de vacaciones segun la antiguedad del empleado y la Ley de Contrato de Trabajo Argentina.</p>
                        </div>
                    </div>
                </div>

                <div class="ve-empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    <h4>Seleccione un empleado</h4>
                    <p>Use el buscador para ver el balance de vacaciones de un empleado</p>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // ANALYTICS VIEW
    // ========================================================================
    async renderAnalytics() {
        const content = document.getElementById('ve-content');
        const stats = VacationState.stats;
        const total = stats.approved + stats.pending + stats.rejected || 1;

        content.innerHTML = `
            <div class="ve-analytics">
                <div class="ve-section-title">Analisis de Solicitudes ${VacationState.selectedYear}</div>

                <div class="ve-analytics-grid">
                    <!-- Distribution Chart -->
                    <div class="ve-chart-card">
                        <h4>Distribucion por Estado</h4>
                        <div class="ve-chart-bars">
                            <div class="ve-bar-item">
                                <span class="ve-bar-label">Aprobadas</span>
                                <div class="ve-bar-container">
                                    <div class="ve-bar ve-bar-success" style="width: ${(stats.approved/total*100).toFixed(0)}%"></div>
                                </div>
                                <span class="ve-bar-value">${stats.approved}</span>
                            </div>
                            <div class="ve-bar-item">
                                <span class="ve-bar-label">Pendientes</span>
                                <div class="ve-bar-container">
                                    <div class="ve-bar ve-bar-warning" style="width: ${(stats.pending/total*100).toFixed(0)}%"></div>
                                </div>
                                <span class="ve-bar-value">${stats.pending}</span>
                            </div>
                            <div class="ve-bar-item">
                                <span class="ve-bar-label">Rechazadas</span>
                                <div class="ve-bar-container">
                                    <div class="ve-bar ve-bar-danger" style="width: ${(stats.rejected/total*100).toFixed(0)}%"></div>
                                </div>
                                <span class="ve-bar-value">${stats.rejected}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Source Chart -->
                    <div class="ve-chart-card">
                        <h4>Fuente de Solicitudes</h4>
                        <div class="ve-source-stats">
                            <div class="ve-source-item">
                                <div class="ve-source-icon" style="background: var(--accent-blue);">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                                </div>
                                <div>
                                    <span class="ve-source-value">${total - stats.fromMobile}</span>
                                    <span class="ve-source-label">Web</span>
                                </div>
                            </div>
                            <div class="ve-source-item">
                                <div class="ve-source-icon" style="background: var(--accent-purple);">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                                </div>
                                <div>
                                    <span class="ve-source-value">${stats.fromMobile}</span>
                                    <span class="ve-source-label">APK Movil</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // CONFIG VIEW
    // ========================================================================
    async renderConfig() {
        const content = document.getElementById('ve-content');

        let config = {};
        try {
            const result = await VacationAPI.getConfig();
            config = result.data || {};
        } catch (e) {
            console.log('[VACATION] No config data');
        }

        content.innerHTML = `
            <div class="ve-config">
                <div class="ve-section-title">Configuracion del Sistema</div>

                <div class="ve-config-card">
                    <h4>Parametros Generales</h4>
                    <form id="config-form" onsubmit="VacationEngine.saveConfig(event)">
                        <div class="ve-form-grid">
                            <div class="ve-form-group">
                                <label>Dias minimos continuos</label>
                                <input type="number" name="minContinuousDays" value="${config.minContinuousDays || 7}" class="ve-input">
                                <small>Periodo minimo de vacaciones continuas</small>
                            </div>
                            <div class="ve-form-group">
                                <label>Maximo fraccionamientos</label>
                                <input type="number" name="maxFractions" value="${config.maxFractions || 3}" class="ve-input">
                                <small>Numero maximo de divisiones permitidas</small>
                            </div>
                            <div class="ve-form-group">
                                <label>Dias de aviso minimo</label>
                                <input type="number" name="minAdvanceNoticeDays" value="${config.minAdvanceNoticeDays || 15}" class="ve-input">
                                <small>Antelacion para solicitar vacaciones</small>
                            </div>
                            <div class="ve-form-group">
                                <label>% Maximo simultaneos</label>
                                <input type="number" name="maxSimultaneousPercentage" value="${config.maxSimultaneousPercentage || 30}" class="ve-input">
                                <small>Porcentaje de empleados en vacaciones</small>
                            </div>
                        </div>

                        <div class="ve-form-toggles">
                            <label class="ve-toggle">
                                <input type="checkbox" name="vacationInterruptible" ${config.vacationInterruptible ? 'checked' : ''}>
                                <span>Vacaciones interrumpibles por enfermedad</span>
                            </label>
                            <label class="ve-toggle">
                                <input type="checkbox" name="autoSchedulingEnabled" ${config.autoSchedulingEnabled ? 'checked' : ''}>
                                <span>Programacion automatica habilitada</span>
                            </label>
                        </div>

                        <div class="ve-form-actions">
                            <button type="submit" class="ve-btn ve-btn-primary">Guardar Configuracion</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    },

    getRequestTypeBadge(type) {
        const types = {
            'vacation': { label: 'Vacaciones', class: 'success' },
            'personal_leave': { label: 'Personal', class: 'info' },
            'sick_leave': { label: 'Médica', class: 'warning' },
            'maternity': { label: 'Maternidad', class: 'info' },
            'study_leave': { label: 'Estudio', class: 'info' },
            'leave': { label: 'Licencia', class: 'info' }
        };
        const t = types[type] || { label: type || 'Sin tipo', class: 'secondary' };
        return `<span class="ve-badge ve-badge-${t.class}">${t.label}</span>`;
    },

    getStatusBadge(status) {
        const statuses = {
            'pending': { label: 'Pendiente', class: 'warning' },
            'approved': { label: 'Aprobada', class: 'success' },
            'rejected': { label: 'Rechazada', class: 'danger' },
            'cancelled': { label: 'Cancelada', class: 'info' }
        };
        const s = statuses[status] || { label: status, class: 'info' };
        return `<span class="ve-status ve-status-${s.class}">${s.label}</span>`;
    },

    getSourceBadge(source) {
        if (source === 'mobile-apk' || source === 'mobile_app') {
            return `<span class="ve-badge ve-badge-mobile">APK</span>`;
        }
        return `<span class="ve-badge ve-badge-db">Web</span>`;
    },

    // ========================================================================
    // ACTIONS
    // ========================================================================
    async filterRequests() {
        // TODO: Implement filtering
        console.log('[VACATION] Filtering requests...');
    },

    async viewRequest(id) {
        alert(`Ver solicitud #${id}`);
    },

    async approveRequest(id) {
        if (confirm('Aprobar esta solicitud?')) {
            try {
                await VacationAPI.approveRequest(id, { approved_by: 'admin' });
                this.refresh();
            } catch (e) {
                alert('Error: ' + e.message);
            }
        }
    },

    async rejectRequest(id) {
        const reason = prompt('Motivo del rechazo:');
        if (reason) {
            try {
                await VacationAPI.rejectRequest(id, { reason });
                this.refresh();
            } catch (e) {
                alert('Error: ' + e.message);
            }
        }
    },

    showNewRequestModal() {
        alert('Modal de nueva solicitud - TODO');
    },

    showScaleModal() {
        alert('Modal de nueva escala - TODO');
    },

    showLicenseModal() {
        alert('Modal de nueva licencia - TODO');
    },

    async saveConfig(event) {
        event.preventDefault();
        const form = event.target;
        const data = {
            minContinuousDays: parseInt(form.minContinuousDays.value),
            maxFractions: parseInt(form.maxFractions.value),
            minAdvanceNoticeDays: parseInt(form.minAdvanceNoticeDays.value),
            maxSimultaneousPercentage: parseInt(form.maxSimultaneousPercentage.value),
            vacationInterruptible: form.vacationInterruptible.checked,
            autoSchedulingEnabled: form.autoSchedulingEnabled.checked
        };

        try {
            await VacationAPI.updateConfig(data);
            alert('Configuracion guardada');
        } catch (e) {
            alert('Error: ' + e.message);
        }
    },

    changeCalendarMonth(delta) {
        console.log('Change month:', delta);
    }
};

// ============================================================================
// INJECT ENTERPRISE STYLES
// ============================================================================
function injectVacationStyles() {
    if (document.getElementById('ve-styles')) return;

    const styles = document.createElement('style');
    styles.id = 've-styles';
    styles.textContent = `
        /* CSS Variables - Dark Enterprise Theme (Vacation) */
        :root {
            --ve-bg-primary: #0a1a15;
            --ve-bg-secondary: #122a22;
            --ve-bg-tertiary: #1a3a30;
            --ve-bg-card: #162e25;
            --ve-border: #2d4a40;
            --ve-text-primary: #e8f0ed;
            --ve-text-secondary: #a0b8b0;
            --ve-text-muted: #6b8078;
            --accent-green: #00e676;
            --accent-blue: #00d4ff;
            --accent-yellow: #ffc107;
            --accent-red: #ff5252;
            --accent-purple: #b388ff;
        }

        .vacation-enterprise {
            background: var(--ve-bg-primary);
            min-height: 100vh;
            color: var(--ve-text-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Header */
        .ve-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            background: var(--ve-bg-secondary);
            border-bottom: 1px solid var(--ve-border);
        }

        .ve-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ve-logo {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, var(--accent-green), #00b860);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .ve-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 1px;
            margin: 0;
            background: linear-gradient(90deg, var(--accent-green), #00b860);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .ve-subtitle {
            font-size: 11px;
            color: var(--ve-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .ve-tech-badges {
            display: flex;
            gap: 8px;
        }

        .ve-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .ve-badge-lct {
            background: rgba(0, 230, 118, 0.15);
            color: var(--accent-green);
            border: 1px solid rgba(0, 230, 118, 0.3);
        }

        .ve-badge-db {
            background: rgba(0, 212, 255, 0.15);
            color: var(--accent-blue);
            border: 1px solid rgba(0, 212, 255, 0.3);
        }

        .ve-badge-mobile {
            background: rgba(179, 136, 255, 0.15);
            color: var(--accent-purple);
            border: 1px solid rgba(179, 136, 255, 0.3);
        }

        .ve-badge-info { background: rgba(0, 212, 255, 0.2); color: var(--accent-blue); }
        .ve-badge-success { background: rgba(0, 230, 118, 0.2); color: var(--accent-green); }
        .ve-badge-warning { background: rgba(255, 193, 7, 0.2); color: var(--accent-yellow); }
        .ve-badge-danger { background: rgba(255, 82, 82, 0.2); color: var(--accent-red); }

        .ve-header-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ve-select {
            background: var(--ve-bg-tertiary);
            border: 1px solid var(--ve-border);
            color: var(--ve-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
        }

        .ve-select:focus {
            outline: none;
            border-color: var(--accent-green);
        }

        /* Navigation */
        .ve-nav {
            display: flex;
            gap: 4px;
            padding: 8px 24px;
            background: var(--ve-bg-secondary);
            border-bottom: 1px solid var(--ve-border);
            overflow-x: auto;
        }

        .ve-nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: transparent;
            border: none;
            color: var(--ve-text-secondary);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .ve-nav-item:hover {
            background: var(--ve-bg-tertiary);
            color: var(--ve-text-primary);
        }

        .ve-nav-item.active {
            background: linear-gradient(135deg, rgba(0, 230, 118, 0.2), rgba(0, 184, 96, 0.2));
            color: var(--accent-green);
            border: 1px solid rgba(0, 230, 118, 0.3);
        }

        /* Main Content */
        .ve-main {
            padding: 24px;
            max-width: 1600px;
            margin: 0 auto;
        }

        /* Loading */
        .ve-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
            color: var(--ve-text-muted);
        }

        .ve-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--ve-border);
            border-top-color: var(--accent-green);
            border-radius: 50%;
            animation: ve-spin 1s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes ve-spin {
            to { transform: rotate(360deg); }
        }

        /* KPI Cards */
        .ve-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .ve-kpi-card {
            background: var(--ve-bg-card);
            border: 1px solid var(--ve-border);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .ve-kpi-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .ve-kpi-value {
            font-size: 28px;
            font-weight: 700;
            display: block;
        }

        .ve-kpi-label {
            font-size: 12px;
            color: var(--ve-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Toolbar */
        .ve-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .ve-filters {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .ve-search-box {
            display: flex;
            align-items: center;
            gap: 8px;
            background: var(--ve-bg-tertiary);
            border: 1px solid var(--ve-border);
            border-radius: 6px;
            padding: 8px 12px;
        }

        .ve-search-box input {
            background: transparent;
            border: none;
            color: var(--ve-text-primary);
            font-size: 13px;
            outline: none;
            width: 200px;
        }

        .ve-search-box svg {
            color: var(--ve-text-muted);
        }

        /* Tables */
        .ve-table-container {
            background: var(--ve-bg-card);
            border: 1px solid var(--ve-border);
            border-radius: 12px;
            overflow: hidden;
        }

        .ve-table {
            width: 100%;
            border-collapse: collapse;
        }

        .ve-table th {
            background: var(--ve-bg-secondary);
            padding: 12px 16px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--ve-text-muted);
            border-bottom: 1px solid var(--ve-border);
        }

        .ve-table td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--ve-border);
            color: var(--ve-text-primary);
        }

        .ve-table tr:hover td {
            background: rgba(255, 255, 255, 0.02);
        }

        .ve-table code {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            color: var(--accent-green);
        }

        .ve-empty-cell {
            text-align: center;
            padding: 40px !important;
        }

        /* Status badges */
        .ve-status {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .ve-status-success { background: rgba(0, 230, 118, 0.2); color: var(--accent-green); }
        .ve-status-warning { background: rgba(255, 193, 7, 0.2); color: var(--accent-yellow); }
        .ve-status-danger { background: rgba(255, 82, 82, 0.2); color: var(--accent-red); }
        .ve-status-info { background: rgba(0, 212, 255, 0.2); color: var(--accent-blue); }

        /* Buttons */
        .ve-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .ve-btn-primary {
            background: linear-gradient(135deg, var(--accent-green), #00b860);
            color: white;
        }

        .ve-btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .ve-btn-secondary {
            background: var(--ve-bg-tertiary);
            color: var(--ve-text-primary);
            border: 1px solid var(--ve-border);
        }

        .ve-btn-outline {
            background: transparent;
            color: var(--ve-text-primary);
            border: 1px solid var(--ve-border);
        }

        .ve-btn-sm {
            padding: 6px 12px;
            font-size: 12px;
        }

        .ve-btn-icon {
            width: 36px;
            height: 36px;
            padding: 0;
            background: var(--ve-bg-tertiary);
            border: 1px solid var(--ve-border);
            border-radius: 6px;
            color: var(--ve-text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .ve-btn-icon:hover {
            border-color: var(--accent-green);
            color: var(--accent-green);
        }

        .ve-btn-icon-sm {
            width: 28px;
            height: 28px;
            padding: 0;
            background: transparent;
            border: 1px solid var(--ve-border);
            border-radius: 4px;
            color: var(--ve-text-secondary);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .ve-btn-icon-sm:hover {
            border-color: var(--accent-blue);
            color: var(--accent-blue);
        }

        .ve-btn-success:hover {
            border-color: var(--accent-green);
            color: var(--accent-green);
        }

        .ve-btn-danger:hover {
            border-color: var(--accent-red);
            color: var(--accent-red);
        }

        .ve-actions {
            display: flex;
            gap: 4px;
        }

        /* Sections */
        .ve-section {
            margin-bottom: 32px;
        }

        .ve-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .ve-section-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0;
            color: var(--ve-text-primary);
        }

        .ve-section-desc {
            font-size: 12px;
            color: var(--ve-text-muted);
            margin: 4px 0 0;
        }

        /* Policy Cards */
        .ve-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
        }

        .ve-policy-card {
            background: var(--ve-bg-card);
            border: 1px solid var(--ve-border);
            border-radius: 12px;
            overflow: hidden;
        }

        .ve-policy-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: var(--ve-bg-secondary);
            border-bottom: 1px solid var(--ve-border);
        }

        .ve-policy-range {
            font-weight: 600;
            color: var(--accent-green);
        }

        .ve-policy-days {
            font-size: 20px;
            font-weight: 700;
        }

        .ve-policy-body {
            padding: 16px;
        }

        .ve-policy-body p {
            margin: 0;
            color: var(--ve-text-secondary);
            font-size: 13px;
        }

        .ve-policy-footer {
            padding: 12px 16px;
            border-top: 1px solid var(--ve-border);
            display: flex;
            gap: 8px;
        }

        /* Empty State */
        .ve-empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--ve-text-muted);
        }

        .ve-empty-state svg {
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .ve-empty-state h4 {
            margin: 0 0 8px;
            color: var(--ve-text-secondary);
        }

        .ve-empty-state p {
            margin: 0;
        }

        .ve-empty-card {
            background: var(--ve-bg-card);
            border: 1px solid var(--ve-border);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            color: var(--ve-text-muted);
        }

        /* AI Panel */
        .ve-ai-panel {
            background: linear-gradient(135deg, rgba(0, 230, 118, 0.1), rgba(0, 184, 96, 0.1));
            border: 1px solid rgba(0, 230, 118, 0.2);
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 24px;
        }

        .ve-ai-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.2);
        }

        .ve-ai-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: var(--accent-green);
        }

        .ve-ai-status {
            font-size: 11px;
            padding: 4px 8px;
            background: rgba(0, 230, 118, 0.2);
            color: var(--accent-green);
            border-radius: 10px;
        }

        .ve-ai-content {
            padding: 16px;
        }

        .ve-ai-content p {
            margin: 0;
            color: var(--ve-text-secondary);
            line-height: 1.5;
        }

        /* Calendar */
        .ve-calendar-view {
            background: var(--ve-bg-card);
            border: 1px solid var(--ve-border);
            border-radius: 12px;
            padding: 24px;
        }

        .ve-calendar-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 24px;
            margin-bottom: 24px;
        }

        .ve-calendar-header h3 {
            margin: 0;
            min-width: 200px;
            text-align: center;
        }

        .ve-calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }

        .ve-calendar-day-header {
            padding: 12px;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: var(--ve-text-muted);
            text-transform: uppercase;
        }

        .ve-calendar-day {
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--ve-bg-secondary);
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .ve-calendar-day:hover {
            background: var(--ve-bg-tertiary);
        }

        .ve-calendar-day-empty {
            background: transparent;
        }

        .ve-calendar-day-today {
            background: var(--accent-green);
            color: #000;
            font-weight: 700;
        }

        .ve-calendar-legend {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid var(--ve-border);
        }

        .ve-legend-dot {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }

        .ve-legend-approved { background: var(--accent-green); }
        .ve-legend-pending { background: var(--accent-yellow); }
        .ve-legend-today { background: var(--accent-blue); }

        /* Analytics */
        .ve-analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px;
        }

        .ve-chart-card {
            background: var(--ve-bg-card);
            border: 1px solid var(--ve-border);
            border-radius: 12px;
            padding: 24px;
        }

        .ve-chart-card h4 {
            margin: 0 0 20px;
            font-size: 14px;
            color: var(--ve-text-secondary);
        }

        .ve-chart-bars {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .ve-bar-item {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ve-bar-label {
            width: 100px;
            font-size: 13px;
            color: var(--ve-text-secondary);
        }

        .ve-bar-container {
            flex: 1;
            height: 24px;
            background: var(--ve-bg-secondary);
            border-radius: 4px;
            overflow: hidden;
        }

        .ve-bar {
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        .ve-bar-success { background: var(--accent-green); }
        .ve-bar-warning { background: var(--accent-yellow); }
        .ve-bar-danger { background: var(--accent-red); }

        .ve-bar-value {
            width: 40px;
            text-align: right;
            font-weight: 600;
        }

        .ve-source-stats {
            display: flex;
            gap: 24px;
        }

        .ve-source-item {
            display: flex;
            align-items: center;
            gap: 16px;
            flex: 1;
            padding: 16px;
            background: var(--ve-bg-secondary);
            border-radius: 8px;
        }

        .ve-source-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .ve-source-value {
            display: block;
            font-size: 28px;
            font-weight: 700;
        }

        .ve-source-label {
            font-size: 12px;
            color: var(--ve-text-muted);
        }

        /* Config */
        .ve-config-card {
            background: var(--ve-bg-card);
            border: 1px solid var(--ve-border);
            border-radius: 12px;
            padding: 24px;
        }

        .ve-config-card h4 {
            margin: 0 0 24px;
            color: var(--ve-text-secondary);
        }

        .ve-form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }

        .ve-form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .ve-form-group label {
            font-size: 13px;
            font-weight: 500;
            color: var(--ve-text-primary);
        }

        .ve-form-group small {
            font-size: 11px;
            color: var(--ve-text-muted);
        }

        .ve-input {
            background: var(--ve-bg-tertiary);
            border: 1px solid var(--ve-border);
            color: var(--ve-text-primary);
            padding: 10px 12px;
            border-radius: 6px;
            font-size: 14px;
        }

        .ve-input:focus {
            outline: none;
            border-color: var(--accent-green);
        }

        .ve-form-toggles {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 24px;
            padding: 16px;
            background: var(--ve-bg-secondary);
            border-radius: 8px;
        }

        .ve-toggle {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }

        .ve-toggle input {
            width: 18px;
            height: 18px;
            accent-color: var(--accent-green);
        }

        .ve-form-actions {
            display: flex;
            justify-content: flex-end;
        }

        /* Error */
        .ve-error {
            text-align: center;
            padding: 40px;
            color: var(--accent-red);
        }
    `;
    document.head.appendChild(styles);
}

// Make functions globally available
window.showVacationManagementContent = showVacationManagementContent;

} // End of if (typeof window.VacationState !== 'undefined') check
