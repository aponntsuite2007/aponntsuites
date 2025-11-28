/**
 * ATTENDANCE INTELLIGENCE ENGINE v2.0
 * Sistema de Control de Asistencia - Nivel Enterprise Internacional
 *
 * Ecosistema Inteligente de Gestion de Asistencia
 *
 * Tecnologias: Node.js + PostgreSQL + Analytics AI + Pattern Detection
 * Arquitectura: Multi-tenant, Scoring Engine, Insights en tiempo real
 *
 * @author Sistema Biometrico Enterprise
 * @version 2.0.0
 */
console.log('%c ATTENDANCE ENGINE v2.0 ', 'background: linear-gradient(90deg, #0f2027 0%, #203a43 50%, #2c5364 100%); color: #00e5ff; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const AttendanceState = {
    dateRange: {
        start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    },
    filters: {
        department: '',
        shift: '',
        status: '',
        search: ''
    },
    attendances: [],
    stats: null,
    patterns: [],
    rankings: [],
    currentView: 'dashboard',
    currentPage: 1,
    itemsPerPage: 25,
    isLoading: false,
    companyId: null
};

// ============================================================================
// API SERVICE - Centralized fetch handler
// ============================================================================
const AttendanceAPI = {
    baseUrl: '/api/v1/attendance',
    analyticsUrl: '/api/attendance-analytics',

    getAuthHeaders() {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: this.getAuthHeaders(),
                ...options
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || data.message || 'API Error');
            return data;
        } catch (error) {
            console.error(`[AttendanceAPI] Error:`, error);
            throw error;
        }
    },

    // Basic Attendance
    getAttendances: () => AttendanceAPI.request(`${AttendanceAPI.baseUrl}`),
    getStats: () => AttendanceAPI.request(`${AttendanceAPI.baseUrl}/stats`),
    getAttendance: (id) => AttendanceAPI.request(`${AttendanceAPI.baseUrl}/${id}`),
    createAttendance: (data) => AttendanceAPI.request(`${AttendanceAPI.baseUrl}`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAttendance: (id, data) => AttendanceAPI.request(`${AttendanceAPI.baseUrl}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteAttendance: (id) => AttendanceAPI.request(`${AttendanceAPI.baseUrl}/${id}`, {
        method: 'DELETE'
    }),

    // Analytics
    getCompanyAnalytics: (companyId) => AttendanceAPI.request(`${AttendanceAPI.analyticsUrl}/company/${companyId}`),
    getCompanyStats: (companyId) => AttendanceAPI.request(`${AttendanceAPI.analyticsUrl}/company/${companyId}/stats`),
    getRankings: (companyId, groupBy = 'department') => AttendanceAPI.request(`${AttendanceAPI.analyticsUrl}/company/${companyId}/rankings?group_by=${groupBy}`),
    getCriticalPatterns: (companyId) => AttendanceAPI.request(`${AttendanceAPI.analyticsUrl}/company/${companyId}/critical-patterns`),
    getEmployeeAnalysis: (userId, companyId) => AttendanceAPI.request(`${AttendanceAPI.analyticsUrl}/employee/${userId}?company_id=${companyId}`),

    // Users for dropdowns
    getUsers: () => AttendanceAPI.request('/api/v1/users'),
    getDepartments: () => AttendanceAPI.request('/api/v1/departments'),
    getShifts: () => AttendanceAPI.request('/api/v1/shifts')
};

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================
function showAttendanceContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    // Extract company ID from localStorage or token
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            AttendanceState.companyId = payload.companyId || payload.company_id;
        }
    } catch (e) {
        console.warn('Could not extract companyId from token');
    }

    content.innerHTML = `
        <div id="attendance-enterprise" class="att-enterprise">
            <!-- Header Enterprise -->
            <header class="att-header">
                <div class="att-header-left">
                    <div class="att-logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div class="att-title-block">
                        <h1 class="att-title">ATTENDANCE ENGINE</h1>
                        <span class="att-subtitle">Ecosistema Inteligente de Asistencia</span>
                    </div>
                </div>
                <div class="att-header-center">
                    <div class="att-tech-badges">
                        <span class="att-badge att-badge-ai" title="Pattern Detection AI">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                            AI Patterns
                        </span>
                        <span class="att-badge att-badge-db" title="Scoring Engine">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-3v-2h3v2zm0-4h-3V7h3v6z"/></svg>
                            Scoring
                        </span>
                        <span class="att-badge att-badge-bio" title="Biometric Integration">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z"/></svg>
                            Biometric
                        </span>
                    </div>
                </div>
                <div class="att-header-right">
                    <div class="att-date-range">
                        <input type="date" id="att-date-start" class="att-input" value="${AttendanceState.dateRange.start}" />
                        <span class="att-date-separator">→</span>
                        <input type="date" id="att-date-end" class="att-input" value="${AttendanceState.dateRange.end}" />
                    </div>
                    <button onclick="AttendanceEngine.refresh()" class="att-btn att-btn-icon" title="Actualizar Datos">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    </button>
                </div>
            </header>

            <!-- Navigation Tabs -->
            <nav class="att-nav">
                <button class="att-nav-item active" data-view="dashboard" onclick="AttendanceEngine.showView('dashboard')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Dashboard
                </button>
                <button class="att-nav-item" data-view="records" onclick="AttendanceEngine.showView('records')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                    Registros
                </button>
                <button class="att-nav-item" data-view="analytics" onclick="AttendanceEngine.showView('analytics')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                    Analytics
                </button>
                <button class="att-nav-item" data-view="patterns" onclick="AttendanceEngine.showView('patterns')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Alertas
                </button>
                <button class="att-nav-item" data-view="insights" onclick="AttendanceEngine.showView('insights')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Insights
                </button>
            </nav>

            <!-- Main Content Area -->
            <main class="att-main" id="att-content">
                <div class="att-loading">
                    <div class="att-spinner"></div>
                    <span>Cargando datos...</span>
                </div>
            </main>
        </div>
    `;

    injectAttendanceStyles();
    AttendanceEngine.init();
}

// ============================================================================
// ATTENDANCE ENGINE - Main Controller
// ============================================================================
const AttendanceEngine = {
    async init() {
        this.bindEvents();
        await this.showView('dashboard');
    },

    bindEvents() {
        document.getElementById('att-date-start')?.addEventListener('change', (e) => {
            AttendanceState.dateRange.start = e.target.value;
        });
        document.getElementById('att-date-end')?.addEventListener('change', (e) => {
            AttendanceState.dateRange.end = e.target.value;
        });
    },

    async showView(view) {
        AttendanceState.currentView = view;

        document.querySelectorAll('.att-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const content = document.getElementById('att-content');
        content.innerHTML = '<div class="att-loading"><div class="att-spinner"></div><span>Cargando...</span></div>';

        try {
            switch(view) {
                case 'dashboard': await this.renderDashboard(); break;
                case 'records': await this.renderRecords(); break;
                case 'analytics': await this.renderAnalytics(); break;
                case 'patterns': await this.renderPatterns(); break;
                case 'insights': await this.renderInsights(); break;
            }
        } catch (error) {
            content.innerHTML = `<div class="att-error"><span>⚠️ Error: ${error.message}</span></div>`;
        }
    },

    async refresh() {
        await this.showView(AttendanceState.currentView);
    },

    // ========================================================================
    // DASHBOARD VIEW
    // ========================================================================
    async renderDashboard() {
        const content = document.getElementById('att-content');

        // Load data in parallel
        let stats = { total: 0, present: 0, late: 0, absent: 0, onTime: 0 };
        let patterns = [];
        let attendances = [];

        try {
            const [statsResult, attendanceResult] = await Promise.all([
                AttendanceAPI.getStats().catch(() => ({})),
                AttendanceAPI.getAttendances().catch(() => ({ attendances: [] }))
            ]);

            stats = {
                total: statsResult.total || 0,
                present: statsResult.present || 0,
                late: statsResult.late || 0,
                absent: statsResult.absent || 0,
                onTime: statsResult.onTime || statsResult.present || 0
            };

            attendances = attendanceResult.attendances || attendanceResult.data || [];
            AttendanceState.attendances = attendances;

            // Try to get patterns if analytics available
            if (AttendanceState.companyId) {
                try {
                    const patternsResult = await AttendanceAPI.getCriticalPatterns(AttendanceState.companyId);
                    patterns = patternsResult.patterns || [];
                } catch (e) {
                    console.log('Analytics not available');
                }
            }
        } catch (e) {
            console.error('Error loading dashboard data:', e);
        }

        // Calculate percentages
        const totalEmployees = stats.present + stats.late + stats.absent || 1;
        const presentPct = Math.round((stats.present / totalEmployees) * 100) || 0;
        const latePct = Math.round((stats.late / totalEmployees) * 100) || 0;
        const absentPct = Math.round((stats.absent / totalEmployees) * 100) || 0;
        const punctualityScore = Math.round(((stats.present) / totalEmployees) * 100) || 0;

        content.innerHTML = `
            <div class="att-dashboard">
                <!-- KPI Cards -->
                <div class="att-kpi-grid">
                    <div class="att-kpi-card att-kpi-total">
                        <div class="att-kpi-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                        </div>
                        <div class="att-kpi-data">
                            <span class="att-kpi-value">${stats.total || attendances.length}</span>
                            <span class="att-kpi-label">Registros Totales</span>
                        </div>
                        <div class="att-kpi-trend att-trend-neutral">
                            <span>Hoy</span>
                        </div>
                    </div>

                    <div class="att-kpi-card att-kpi-present">
                        <div class="att-kpi-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <div class="att-kpi-data">
                            <span class="att-kpi-value">${stats.present}</span>
                            <span class="att-kpi-label">A Tiempo</span>
                        </div>
                        <div class="att-kpi-trend att-trend-up">
                            <span>${presentPct}%</span>
                        </div>
                    </div>

                    <div class="att-kpi-card att-kpi-late">
                        <div class="att-kpi-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <div class="att-kpi-data">
                            <span class="att-kpi-value">${stats.late}</span>
                            <span class="att-kpi-label">Tardanzas</span>
                        </div>
                        <div class="att-kpi-trend att-trend-warning">
                            <span>${latePct}%</span>
                        </div>
                    </div>

                    <div class="att-kpi-card att-kpi-absent">
                        <div class="att-kpi-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </div>
                        <div class="att-kpi-data">
                            <span class="att-kpi-value">${stats.absent}</span>
                            <span class="att-kpi-label">Ausentes</span>
                        </div>
                        <div class="att-kpi-trend att-trend-down">
                            <span>${absentPct}%</span>
                        </div>
                    </div>
                </div>

                <!-- Main Grid -->
                <div class="att-dashboard-grid">
                    <!-- Punctuality Score Card -->
                    <div class="att-score-card">
                        <div class="att-score-header">
                            <h3>📊 Indice de Puntualidad</h3>
                            <span class="att-badge att-badge-info">Hoy</span>
                        </div>
                        <div class="att-score-gauge">
                            <div class="att-gauge-ring" style="--score: ${punctualityScore}">
                                <div class="att-gauge-value">${punctualityScore}<small>%</small></div>
                            </div>
                        </div>
                        <div class="att-score-legend">
                            <div class="att-legend-item">
                                <span class="att-legend-dot att-dot-green"></span>
                                <span>A tiempo: ${stats.present}</span>
                            </div>
                            <div class="att-legend-item">
                                <span class="att-legend-dot att-dot-yellow"></span>
                                <span>Tarde: ${stats.late}</span>
                            </div>
                            <div class="att-legend-item">
                                <span class="att-legend-dot att-dot-red"></span>
                                <span>Ausente: ${stats.absent}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Distribution Chart -->
                    <div class="att-chart-card">
                        <div class="att-chart-header">
                            <h3>📈 Distribucion de Asistencia</h3>
                        </div>
                        <div class="att-distribution-bars">
                            <div class="att-bar-group">
                                <div class="att-bar-label">A Tiempo</div>
                                <div class="att-bar-container">
                                    <div class="att-bar att-bar-green" style="width: ${presentPct}%"></div>
                                </div>
                                <div class="att-bar-value">${presentPct}%</div>
                            </div>
                            <div class="att-bar-group">
                                <div class="att-bar-label">Tardanzas</div>
                                <div class="att-bar-container">
                                    <div class="att-bar att-bar-yellow" style="width: ${latePct}%"></div>
                                </div>
                                <div class="att-bar-value">${latePct}%</div>
                            </div>
                            <div class="att-bar-group">
                                <div class="att-bar-label">Ausencias</div>
                                <div class="att-bar-container">
                                    <div class="att-bar att-bar-red" style="width: ${absentPct}%"></div>
                                </div>
                                <div class="att-bar-value">${absentPct}%</div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="att-actions-card">
                        <h3>⚡ Acciones Rapidas</h3>
                        <div class="att-quick-actions">
                            <button onclick="AttendanceEngine.showAddModal()" class="att-action-btn">
                                <div class="att-action-icon att-icon-add">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </div>
                                <span>Nuevo Registro</span>
                            </button>
                            <button onclick="AttendanceEngine.showView('records')" class="att-action-btn">
                                <div class="att-action-icon att-icon-list">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                </div>
                                <span>Ver Registros</span>
                            </button>
                            <button onclick="AttendanceEngine.exportData()" class="att-action-btn">
                                <div class="att-action-icon att-icon-export">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                </div>
                                <span>Exportar CSV</span>
                            </button>
                            <button onclick="AttendanceEngine.showView('patterns')" class="att-action-btn">
                                <div class="att-action-icon att-icon-alert">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                                </div>
                                <span>Ver Alertas</span>
                            </button>
                        </div>
                    </div>

                    <!-- Alerts Panel -->
                    <div class="att-alerts-card">
                        <div class="att-alerts-header">
                            <h3>🔔 Alertas Activas</h3>
                            <span class="att-alerts-count">${patterns.length}</span>
                        </div>
                        <div class="att-alerts-list">
                            ${patterns.length > 0 ? patterns.slice(0, 4).map(p => `
                                <div class="att-alert-item att-alert-${p.severity}">
                                    <div class="att-alert-icon">
                                        ${p.severity === 'critical' ? '🚨' : p.severity === 'high' ? '⚠️' : 'ℹ️'}
                                    </div>
                                    <div class="att-alert-content">
                                        <span class="att-alert-title">${p.pattern_name}</span>
                                        <span class="att-alert-meta">${p.user?.firstName || 'Usuario'} ${p.user?.lastName || ''}</span>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="att-alert-empty">
                                    <span>✅ Sin alertas criticas</span>
                                    <p>El sistema no ha detectado patrones preocupantes</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="att-recent-section">
                    <div class="att-section-header">
                        <h3>🕐 Actividad Reciente</h3>
                        <button onclick="AttendanceEngine.showView('records')" class="att-link-btn">Ver todos →</button>
                    </div>
                    <div class="att-recent-table">
                        <table class="att-table">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Fecha</th>
                                    <th>Entrada</th>
                                    <th>Salida</th>
                                    <th>Horas</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${attendances.slice(0, 5).map(att => `
                                    <tr>
                                        <td><strong>${att.user_name || att.employee_name || 'N/A'}</strong></td>
                                        <td>${this.formatDate(att.date || att.attendance_date)}</td>
                                        <td>${this.formatTime(att.check_in || att.time_in)}</td>
                                        <td>${this.formatTime(att.check_out || att.time_out)}</td>
                                        <td>${this.calculateHours(att.check_in || att.time_in, att.check_out || att.time_out)}</td>
                                        <td>${this.getStatusBadge(att.status)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="6" class="att-empty">No hay registros recientes</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // RECORDS VIEW
    // ========================================================================
    async renderRecords() {
        const content = document.getElementById('att-content');

        let attendances = [];
        try {
            const result = await AttendanceAPI.getAttendances();
            attendances = result.attendances || result.data || [];
            AttendanceState.attendances = attendances;
        } catch (e) {
            console.error('Error loading attendances:', e);
        }

        // Pagination
        const totalPages = Math.ceil(attendances.length / AttendanceState.itemsPerPage);
        const start = (AttendanceState.currentPage - 1) * AttendanceState.itemsPerPage;
        const end = start + AttendanceState.itemsPerPage;
        const paginatedData = attendances.slice(start, end);

        content.innerHTML = `
            <div class="att-records">
                <!-- Toolbar -->
                <div class="att-toolbar">
                    <div class="att-toolbar-left">
                        <button onclick="AttendanceEngine.showAddModal()" class="att-btn att-btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Nuevo Registro
                        </button>
                        <button onclick="AttendanceEngine.exportData()" class="att-btn att-btn-secondary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Exportar
                        </button>
                    </div>
                    <div class="att-toolbar-right">
                        <div class="att-search-box">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="text" id="att-search" placeholder="Buscar empleado..." onkeyup="AttendanceEngine.filterRecords()" />
                        </div>
                        <select id="att-filter-status" class="att-select" onchange="AttendanceEngine.filterRecords()">
                            <option value="">Todos los estados</option>
                            <option value="present">A tiempo</option>
                            <option value="late">Tarde</option>
                            <option value="absent">Ausente</option>
                        </select>
                    </div>
                </div>

                <!-- Records Table -->
                <div class="att-table-container">
                    <table class="att-table att-table-striped">
                        <thead>
                            <tr>
                                <th>👤 Empleado</th>
                                <th>🏷️ Legajo</th>
                                <th>📅 Fecha</th>
                                <th>🕐 Entrada</th>
                                <th>🕐 Salida</th>
                                <th>⏱️ Horas</th>
                                <th>📍 Estado</th>
                                <th>⚙️ Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="att-records-body">
                            ${paginatedData.length > 0 ? paginatedData.map(att => `
                                <tr>
                                    <td><strong>${att.user_name || att.employee_name || 'N/A'}</strong></td>
                                    <td><code>${att.legajo || att.employee_id || 'N/A'}</code></td>
                                    <td>${this.formatDate(att.date || att.attendance_date)}</td>
                                    <td>${this.formatTime(att.check_in || att.time_in)}</td>
                                    <td>${this.formatTime(att.check_out || att.time_out)}</td>
                                    <td>${this.calculateHours(att.check_in || att.time_in, att.check_out || att.time_out)}</td>
                                    <td>${this.getStatusBadge(att.status)}</td>
                                    <td class="att-actions-cell">
                                        <button onclick="AttendanceEngine.viewRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-info" title="Ver">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        </button>
                                        <button onclick="AttendanceEngine.editRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-warning" title="Editar">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                        <button onclick="AttendanceEngine.deleteRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-danger" title="Eliminar">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr><td colspan="8" class="att-empty">No hay registros de asistencia</td></tr>
                            `}
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                ${attendances.length > AttendanceState.itemsPerPage ? `
                    <div class="att-pagination">
                        <div class="att-pagination-info">
                            Mostrando <strong>${start + 1}</strong> - <strong>${Math.min(end, attendances.length)}</strong> de <strong>${attendances.length}</strong>
                        </div>
                        <div class="att-pagination-controls">
                            <button onclick="AttendanceEngine.goToPage(1)" ${AttendanceState.currentPage === 1 ? 'disabled' : ''} class="att-btn att-btn-sm">⏮️</button>
                            <button onclick="AttendanceEngine.goToPage(${AttendanceState.currentPage - 1})" ${AttendanceState.currentPage === 1 ? 'disabled' : ''} class="att-btn att-btn-sm">◀️</button>
                            <span class="att-page-indicator">${AttendanceState.currentPage} / ${totalPages}</span>
                            <button onclick="AttendanceEngine.goToPage(${AttendanceState.currentPage + 1})" ${AttendanceState.currentPage === totalPages ? 'disabled' : ''} class="att-btn att-btn-sm">▶️</button>
                            <button onclick="AttendanceEngine.goToPage(${totalPages})" ${AttendanceState.currentPage === totalPages ? 'disabled' : ''} class="att-btn att-btn-sm">⏭️</button>
                        </div>
                        <div class="att-pagination-size">
                            <select onchange="AttendanceEngine.changePageSize(this.value)" class="att-select att-select-sm">
                                <option value="10" ${AttendanceState.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                                <option value="25" ${AttendanceState.itemsPerPage === 25 ? 'selected' : ''}>25</option>
                                <option value="50" ${AttendanceState.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                                <option value="100" ${AttendanceState.itemsPerPage === 100 ? 'selected' : ''}>100</option>
                            </select>
                            <span>por página</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // ========================================================================
    // ANALYTICS VIEW
    // ========================================================================
    async renderAnalytics() {
        const content = document.getElementById('att-content');

        let stats = null;
        let rankings = null;

        if (AttendanceState.companyId) {
            try {
                [stats, rankings] = await Promise.all([
                    AttendanceAPI.getCompanyStats(AttendanceState.companyId).catch(() => null),
                    AttendanceAPI.getRankings(AttendanceState.companyId, 'department').catch(() => null)
                ]);
            } catch (e) {
                console.log('Analytics API not available');
            }
        }

        content.innerHTML = `
            <div class="att-analytics">
                <div class="att-analytics-header">
                    <h2>📈 Centro de Analytics</h2>
                    <p>Metricas avanzadas y analisis de patrones de asistencia</p>
                </div>

                ${stats ? `
                    <div class="att-metrics-grid">
                        <div class="att-metric-card">
                            <div class="att-metric-icon att-metric-score">🎯</div>
                            <div class="att-metric-content">
                                <span class="att-metric-value">${stats.averageScore?.toFixed(1) || '--'}</span>
                                <span class="att-metric-label">Score Promedio</span>
                            </div>
                        </div>
                        <div class="att-metric-card">
                            <div class="att-metric-icon att-metric-punctuality">⏰</div>
                            <div class="att-metric-content">
                                <span class="att-metric-value">${stats.punctualityRate?.toFixed(1) || '--'}%</span>
                                <span class="att-metric-label">Tasa Puntualidad</span>
                            </div>
                        </div>
                        <div class="att-metric-card">
                            <div class="att-metric-icon att-metric-absence">📋</div>
                            <div class="att-metric-content">
                                <span class="att-metric-value">${stats.absenceRate?.toFixed(1) || '--'}%</span>
                                <span class="att-metric-label">Tasa Ausencia</span>
                            </div>
                        </div>
                        <div class="att-metric-card">
                            <div class="att-metric-icon att-metric-trend">📊</div>
                            <div class="att-metric-content">
                                <span class="att-metric-value">${stats.trend || '--'}</span>
                                <span class="att-metric-label">Tendencia</span>
                            </div>
                        </div>
                    </div>

                    ${rankings?.rankings ? `
                        <div class="att-rankings-section">
                            <h3>🏆 Rankings por Departamento</h3>
                            <div class="att-rankings-grid">
                                ${rankings.rankings.slice(0, 6).map((r, i) => `
                                    <div class="att-ranking-card att-rank-${i + 1}">
                                        <div class="att-rank-position">#${i + 1}</div>
                                        <div class="att-rank-info">
                                            <span class="att-rank-name">${r.name || r.department}</span>
                                            <span class="att-rank-score">${r.score?.toFixed(1) || '--'} pts</span>
                                        </div>
                                        <div class="att-rank-bar">
                                            <div class="att-rank-fill" style="width: ${r.score || 0}%"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                ` : `
                    <div class="att-analytics-empty">
                        <div class="att-empty-icon">📊</div>
                        <h3>Analytics en Desarrollo</h3>
                        <p>El sistema de analytics avanzado requiere configuracion adicional.
                           Contacte al administrador para habilitar esta funcionalidad.</p>
                        <button onclick="AttendanceEngine.showView('dashboard')" class="att-btn att-btn-primary">
                            Volver al Dashboard
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    // ========================================================================
    // PATTERNS VIEW
    // ========================================================================
    async renderPatterns() {
        const content = document.getElementById('att-content');

        let patterns = [];
        if (AttendanceState.companyId) {
            try {
                const result = await AttendanceAPI.getCriticalPatterns(AttendanceState.companyId);
                patterns = result.patterns || [];
            } catch (e) {
                console.log('Patterns API not available');
            }
        }

        content.innerHTML = `
            <div class="att-patterns">
                <div class="att-patterns-header">
                    <h2>🚨 Centro de Alertas</h2>
                    <p>Patrones detectados y alertas que requieren atencion</p>
                </div>

                <div class="att-patterns-summary">
                    <div class="att-summary-card att-summary-critical">
                        <span class="att-summary-value">${patterns.filter(p => p.severity === 'critical').length}</span>
                        <span class="att-summary-label">Criticos</span>
                    </div>
                    <div class="att-summary-card att-summary-high">
                        <span class="att-summary-value">${patterns.filter(p => p.severity === 'high').length}</span>
                        <span class="att-summary-label">Altos</span>
                    </div>
                    <div class="att-summary-card att-summary-medium">
                        <span class="att-summary-value">${patterns.filter(p => p.severity === 'medium').length}</span>
                        <span class="att-summary-label">Medios</span>
                    </div>
                    <div class="att-summary-card att-summary-low">
                        <span class="att-summary-value">${patterns.filter(p => p.severity === 'low').length}</span>
                        <span class="att-summary-label">Bajos</span>
                    </div>
                </div>

                <div class="att-patterns-list">
                    ${patterns.length > 0 ? patterns.map(p => `
                        <div class="att-pattern-card att-pattern-${p.severity}">
                            <div class="att-pattern-severity">
                                ${p.severity === 'critical' ? '🚨' : p.severity === 'high' ? '⚠️' : p.severity === 'medium' ? '⚡' : 'ℹ️'}
                            </div>
                            <div class="att-pattern-content">
                                <div class="att-pattern-title">${p.pattern_name}</div>
                                <div class="att-pattern-employee">
                                    👤 ${p.user?.firstName || 'Usuario'} ${p.user?.lastName || ''}
                                    ${p.user?.employee_id ? `(${p.user.employee_id})` : ''}
                                </div>
                                <div class="att-pattern-meta">
                                    <span>📅 Detectado: ${this.formatDate(p.detection_date)}</span>
                                    <span>📊 Confianza: ${Math.round((p.confidence_score || 0) * 100)}%</span>
                                </div>
                            </div>
                            <div class="att-pattern-actions">
                                <button class="att-btn att-btn-sm att-btn-success" title="Resolver">✓</button>
                                <button class="att-btn att-btn-sm att-btn-secondary" title="Ignorar">✕</button>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="att-patterns-empty">
                            <div class="att-empty-icon">✅</div>
                            <h3>Sin Alertas Activas</h3>
                            <p>No se han detectado patrones preocupantes en el sistema.</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    // ========================================================================
    // INSIGHTS VIEW
    // ========================================================================
    async renderInsights() {
        const content = document.getElementById('att-content');

        let companyAnalysis = null;
        if (AttendanceState.companyId) {
            try {
                companyAnalysis = await AttendanceAPI.getCompanyAnalytics(AttendanceState.companyId);
            } catch (e) {
                console.log('Company analytics not available');
            }
        }

        content.innerHTML = `
            <div class="att-insights">
                <div class="att-insights-header">
                    <h2>💡 Centro de Insights</h2>
                    <p>Analisis inteligente y recomendaciones basadas en IA</p>
                </div>

                ${companyAnalysis ? `
                    <div class="att-insights-grid">
                        <div class="att-insight-card att-insight-ai">
                            <div class="att-insight-icon">🤖</div>
                            <div class="att-insight-content">
                                <h4>Analisis de IA</h4>
                                <p>${companyAnalysis.insights?.summary || 'El sistema analiza continuamente los patrones de asistencia para detectar anomalias.'}</p>
                            </div>
                        </div>

                        <div class="att-insight-card att-insight-trend">
                            <div class="att-insight-icon">📈</div>
                            <div class="att-insight-content">
                                <h4>Tendencia General</h4>
                                <p>${companyAnalysis.trend?.description || 'Tendencia estable en los ultimos 30 dias.'}</p>
                            </div>
                        </div>

                        <div class="att-insight-card att-insight-recommendation">
                            <div class="att-insight-icon">💡</div>
                            <div class="att-insight-content">
                                <h4>Recomendacion</h4>
                                <p>${companyAnalysis.recommendation || 'Mantener monitoreo regular de patrones de asistencia.'}</p>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="att-insights-intro">
                        <div class="att-intro-icon">🧠</div>
                        <h3>Sistema de Insights Inteligente</h3>
                        <p>Este modulo utiliza algoritmos de deteccion de patrones para:</p>
                        <ul>
                            <li>🔍 Identificar anomalias en asistencia</li>
                            <li>📊 Calcular scores de puntualidad</li>
                            <li>⚠️ Alertar sobre patrones preocupantes</li>
                            <li>📈 Analizar tendencias historicas</li>
                            <li>🎯 Generar recomendaciones personalizadas</li>
                        </ul>
                        <button onclick="AttendanceEngine.showView('dashboard')" class="att-btn att-btn-primary">
                            Explorar Dashboard
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    // ========================================================================
    // MODAL FUNCTIONS
    // ========================================================================
    async showAddModal() {
        const modal = document.createElement('div');
        modal.id = 'att-modal';
        modal.className = 'att-modal-overlay';

        // Load employees
        let employees = [];
        try {
            const result = await AttendanceAPI.getUsers();
            employees = result.users || result.data || [];
        } catch (e) {
            console.error('Error loading employees:', e);
        }

        modal.innerHTML = `
            <div class="att-modal">
                <div class="att-modal-header">
                    <h3>➕ Nuevo Registro de Asistencia</h3>
                    <button onclick="AttendanceEngine.closeModal()" class="att-modal-close">&times;</button>
                </div>
                <form id="att-add-form" onsubmit="AttendanceEngine.saveRecord(event)">
                    <div class="att-modal-body">
                        <div class="att-form-group">
                            <label>👤 Empleado</label>
                            <select id="att-user-id" required class="att-select">
                                <option value="">Seleccionar empleado...</option>
                                ${employees.map(e => `
                                    <option value="${e.id || e.user_id}">${e.name || `${e.firstName} ${e.lastName}`} ${e.legajo ? `(${e.legajo})` : ''}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="att-form-row">
                            <div class="att-form-group">
                                <label>📅 Fecha</label>
                                <input type="date" id="att-date" required class="att-input" value="${new Date().toISOString().split('T')[0]}" />
                            </div>
                            <div class="att-form-group">
                                <label>📍 Estado</label>
                                <select id="att-status" required class="att-select">
                                    <option value="present">✅ A Tiempo</option>
                                    <option value="late">⚠️ Tarde</option>
                                    <option value="absent">❌ Ausente</option>
                                </select>
                            </div>
                        </div>
                        <div class="att-form-row">
                            <div class="att-form-group">
                                <label>🕐 Hora Entrada</label>
                                <input type="time" id="att-time-in" required class="att-input" />
                            </div>
                            <div class="att-form-group">
                                <label>🕐 Hora Salida</label>
                                <input type="time" id="att-time-out" class="att-input" />
                            </div>
                        </div>
                    </div>
                    <div class="att-modal-footer">
                        <button type="button" onclick="AttendanceEngine.closeModal()" class="att-btn att-btn-secondary">Cancelar</button>
                        <button type="submit" class="att-btn att-btn-primary">💾 Guardar</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    },

    closeModal() {
        const modal = document.getElementById('att-modal');
        if (modal) modal.remove();
    },

    async saveRecord(event) {
        event.preventDefault();

        const data = {
            user_id: document.getElementById('att-user-id').value,
            date: document.getElementById('att-date').value,
            time_in: document.getElementById('att-time-in').value,
            time_out: document.getElementById('att-time-out').value,
            status: document.getElementById('att-status').value
        };

        try {
            await AttendanceAPI.createAttendance(data);
            this.closeModal();
            this.showNotification('Registro guardado exitosamente', 'success');
            this.refresh();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async viewRecord(id) {
        const att = AttendanceState.attendances.find(a => (a.id || a.attendance_id) == id);
        if (!att) return;

        const modal = document.createElement('div');
        modal.id = 'att-modal';
        modal.className = 'att-modal-overlay';

        modal.innerHTML = `
            <div class="att-modal">
                <div class="att-modal-header">
                    <h3>👁️ Detalle de Asistencia</h3>
                    <button onclick="AttendanceEngine.closeModal()" class="att-modal-close">&times;</button>
                </div>
                <div class="att-modal-body">
                    <div class="att-detail-grid">
                        <div class="att-detail-item">
                            <span class="att-detail-label">👤 Empleado</span>
                            <span class="att-detail-value">${att.user_name || att.employee_name || 'N/A'}</span>
                        </div>
                        <div class="att-detail-item">
                            <span class="att-detail-label">🏷️ Legajo</span>
                            <span class="att-detail-value">${att.legajo || att.employee_id || 'N/A'}</span>
                        </div>
                        <div class="att-detail-item">
                            <span class="att-detail-label">📅 Fecha</span>
                            <span class="att-detail-value">${this.formatDate(att.date || att.attendance_date)}</span>
                        </div>
                        <div class="att-detail-item">
                            <span class="att-detail-label">🕐 Entrada</span>
                            <span class="att-detail-value">${this.formatTime(att.check_in || att.time_in)}</span>
                        </div>
                        <div class="att-detail-item">
                            <span class="att-detail-label">🕐 Salida</span>
                            <span class="att-detail-value">${this.formatTime(att.check_out || att.time_out)}</span>
                        </div>
                        <div class="att-detail-item">
                            <span class="att-detail-label">⏱️ Horas</span>
                            <span class="att-detail-value">${this.calculateHours(att.check_in || att.time_in, att.check_out || att.time_out)}</span>
                        </div>
                        <div class="att-detail-item att-detail-full">
                            <span class="att-detail-label">📍 Estado</span>
                            <span class="att-detail-value">${this.getStatusBadge(att.status)}</span>
                        </div>
                    </div>
                </div>
                <div class="att-modal-footer">
                    <button onclick="AttendanceEngine.closeModal()" class="att-btn att-btn-secondary">Cerrar</button>
                    <button onclick="AttendanceEngine.closeModal(); AttendanceEngine.editRecord('${id}')" class="att-btn att-btn-primary">✏️ Editar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async editRecord(id) {
        const att = AttendanceState.attendances.find(a => (a.id || a.attendance_id) == id);
        if (!att) return;

        // Load employees
        let employees = [];
        try {
            const result = await AttendanceAPI.getUsers();
            employees = result.users || result.data || [];
        } catch (e) {
            console.error('Error loading employees:', e);
        }

        const modal = document.createElement('div');
        modal.id = 'att-modal';
        modal.className = 'att-modal-overlay';

        modal.innerHTML = `
            <div class="att-modal">
                <div class="att-modal-header">
                    <h3>✏️ Editar Registro</h3>
                    <button onclick="AttendanceEngine.closeModal()" class="att-modal-close">&times;</button>
                </div>
                <form onsubmit="AttendanceEngine.updateRecord(event, '${id}')">
                    <div class="att-modal-body">
                        <div class="att-form-group">
                            <label>👤 Empleado</label>
                            <select id="att-user-id" required class="att-select">
                                ${employees.map(e => `
                                    <option value="${e.id || e.user_id}" ${(e.id || e.user_id) == att.user_id ? 'selected' : ''}>${e.name || `${e.firstName} ${e.lastName}`}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="att-form-row">
                            <div class="att-form-group">
                                <label>📅 Fecha</label>
                                <input type="date" id="att-date" required class="att-input" value="${(att.date || att.attendance_date || '').split('T')[0]}" />
                            </div>
                            <div class="att-form-group">
                                <label>📍 Estado</label>
                                <select id="att-status" required class="att-select">
                                    <option value="present" ${att.status === 'present' ? 'selected' : ''}>✅ A Tiempo</option>
                                    <option value="late" ${att.status === 'late' ? 'selected' : ''}>⚠️ Tarde</option>
                                    <option value="absent" ${att.status === 'absent' ? 'selected' : ''}>❌ Ausente</option>
                                </select>
                            </div>
                        </div>
                        <div class="att-form-row">
                            <div class="att-form-group">
                                <label>🕐 Hora Entrada</label>
                                <input type="time" id="att-time-in" required class="att-input" value="${(att.check_in || att.time_in || '').substring(0,5)}" />
                            </div>
                            <div class="att-form-group">
                                <label>🕐 Hora Salida</label>
                                <input type="time" id="att-time-out" class="att-input" value="${(att.check_out || att.time_out || '').substring(0,5)}" />
                            </div>
                        </div>
                    </div>
                    <div class="att-modal-footer">
                        <button type="button" onclick="AttendanceEngine.closeModal()" class="att-btn att-btn-secondary">Cancelar</button>
                        <button type="submit" class="att-btn att-btn-primary">💾 Actualizar</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async updateRecord(event, id) {
        event.preventDefault();

        const data = {
            user_id: document.getElementById('att-user-id').value,
            date: document.getElementById('att-date').value,
            time_in: document.getElementById('att-time-in').value,
            time_out: document.getElementById('att-time-out').value,
            status: document.getElementById('att-status').value
        };

        try {
            await AttendanceAPI.updateAttendance(id, data);
            this.closeModal();
            this.showNotification('Registro actualizado exitosamente', 'success');
            this.refresh();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async deleteRecord(id) {
        if (!confirm('¿Está seguro de eliminar este registro?')) return;

        try {
            await AttendanceAPI.deleteAttendance(id);
            this.showNotification('Registro eliminado', 'success');
            this.refresh();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
    filterRecords() {
        const search = document.getElementById('att-search')?.value.toLowerCase() || '';
        const status = document.getElementById('att-filter-status')?.value || '';

        const filtered = AttendanceState.attendances.filter(att => {
            const name = (att.user_name || att.employee_name || '').toLowerCase();
            const matchSearch = name.includes(search);
            const matchStatus = !status || att.status === status;
            return matchSearch && matchStatus;
        });

        // Re-render table body
        const tbody = document.getElementById('att-records-body');
        if (tbody) {
            tbody.innerHTML = filtered.length > 0 ? filtered.map(att => `
                <tr>
                    <td><strong>${att.user_name || att.employee_name || 'N/A'}</strong></td>
                    <td><code>${att.legajo || att.employee_id || 'N/A'}</code></td>
                    <td>${this.formatDate(att.date || att.attendance_date)}</td>
                    <td>${this.formatTime(att.check_in || att.time_in)}</td>
                    <td>${this.formatTime(att.check_out || att.time_out)}</td>
                    <td>${this.calculateHours(att.check_in || att.time_in, att.check_out || att.time_out)}</td>
                    <td>${this.getStatusBadge(att.status)}</td>
                    <td class="att-actions-cell">
                        <button onclick="AttendanceEngine.viewRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-info" title="Ver">👁️</button>
                        <button onclick="AttendanceEngine.editRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-warning" title="Editar">✏️</button>
                        <button onclick="AttendanceEngine.deleteRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-danger" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="8" class="att-empty">No se encontraron registros</td></tr>';
        }
    },

    goToPage(page) {
        const total = Math.ceil(AttendanceState.attendances.length / AttendanceState.itemsPerPage);
        if (page < 1 || page > total) return;
        AttendanceState.currentPage = page;
        this.renderRecords();
    },

    changePageSize(size) {
        AttendanceState.itemsPerPage = parseInt(size);
        AttendanceState.currentPage = 1;
        this.renderRecords();
    },

    exportData() {
        const data = AttendanceState.attendances;
        if (data.length === 0) {
            this.showNotification('No hay datos para exportar', 'warning');
            return;
        }

        let csv = 'Empleado,Legajo,Fecha,Entrada,Salida,Horas,Estado\n';
        data.forEach(att => {
            csv += `"${att.user_name || att.employee_name || 'N/A'}","${att.legajo || att.employee_id || 'N/A'}","${att.date || att.attendance_date}","${att.check_in || att.time_in || ''}","${att.check_out || att.time_out || ''}","${this.calculateHours(att.check_in || att.time_in, att.check_out || att.time_out)}","${att.status}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `asistencias_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showNotification(`${data.length} registros exportados`, 'success');
    },

    formatDate(dateStr) {
        if (!dateStr) return '--';
        try {
            return new Date(dateStr).toLocaleDateString('es-AR');
        } catch {
            return dateStr;
        }
    },

    formatTime(timeStr) {
        if (!timeStr) return '--:--';
        if (timeStr.includes(':')) return timeStr.substring(0, 5);
        return timeStr;
    },

    calculateHours(timeIn, timeOut) {
        if (!timeIn || !timeOut) return '0.0h';
        try {
            const [h1, m1] = timeIn.split(':').map(Number);
            const [h2, m2] = timeOut.split(':').map(Number);
            const minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
            return `${(minutes / 60).toFixed(1)}h`;
        } catch {
            return '0.0h';
        }
    },

    getStatusBadge(status) {
        const badges = {
            present: '<span class="att-status att-status-success">✅ A Tiempo</span>',
            late: '<span class="att-status att-status-warning">⚠️ Tarde</span>',
            absent: '<span class="att-status att-status-danger">❌ Ausente</span>'
        };
        return badges[status] || `<span class="att-status">${status}</span>`;
    },

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.att-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `att-notification att-notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 4000);
    }
};

// ============================================================================
// STYLES INJECTION
// ============================================================================
function injectAttendanceStyles() {
    if (document.getElementById('att-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'att-styles';
    styles.textContent = `
        /* ================================================================
           ATTENDANCE ENGINE - Enterprise Dark Theme
           ================================================================ */
        :root {
            --att-bg-primary: #0a1628;
            --att-bg-secondary: #0f2137;
            --att-bg-tertiary: #162a45;
            --att-bg-card: #132337;
            --att-border: #1e3a5f;
            --att-text-primary: #e8ecf3;
            --att-text-secondary: #a0b4c8;
            --att-text-muted: #5c7a99;
            --att-accent-blue: #00e5ff;
            --att-accent-green: #00e676;
            --att-accent-yellow: #ffc107;
            --att-accent-red: #ff5252;
            --att-accent-purple: #b388ff;
            --att-accent-cyan: #00bcd4;
        }

        .att-enterprise {
            background: var(--att-bg-primary);
            min-height: 100vh;
            color: var(--att-text-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Header */
        .att-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 24px;
            background: var(--att-bg-secondary);
            border-bottom: 1px solid var(--att-border);
        }

        .att-header-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .att-logo {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, var(--att-accent-cyan), var(--att-accent-blue));
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .att-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
            background: linear-gradient(90deg, var(--att-accent-cyan), var(--att-accent-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .att-subtitle {
            font-size: 12px;
            color: var(--att-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .att-tech-badges {
            display: flex;
            gap: 8px;
        }

        .att-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .att-badge-ai {
            background: rgba(179, 136, 255, 0.15);
            color: var(--att-accent-purple);
            border: 1px solid rgba(179, 136, 255, 0.3);
        }

        .att-badge-db {
            background: rgba(0, 229, 255, 0.15);
            color: var(--att-accent-cyan);
            border: 1px solid rgba(0, 229, 255, 0.3);
        }

        .att-badge-bio {
            background: rgba(0, 230, 118, 0.15);
            color: var(--att-accent-green);
            border: 1px solid rgba(0, 230, 118, 0.3);
        }

        .att-badge-info {
            background: rgba(0, 229, 255, 0.15);
            color: var(--att-accent-cyan);
            border: 1px solid rgba(0, 229, 255, 0.3);
        }

        .att-header-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .att-date-range {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .att-date-separator {
            color: var(--att-text-muted);
        }

        .att-input {
            background: var(--att-bg-tertiary);
            border: 1px solid var(--att-border);
            color: var(--att-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
        }

        .att-input:focus {
            outline: none;
            border-color: var(--att-accent-cyan);
        }

        .att-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }

        .att-btn-icon {
            width: 36px;
            height: 36px;
            padding: 0;
            justify-content: center;
            background: var(--att-bg-tertiary);
            border: 1px solid var(--att-border);
            color: var(--att-text-secondary);
        }

        .att-btn-icon:hover {
            background: var(--att-bg-card);
            color: var(--att-accent-cyan);
        }

        .att-btn-primary {
            background: linear-gradient(135deg, var(--att-accent-cyan), var(--att-accent-blue));
            color: white;
        }

        .att-btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .att-btn-secondary {
            background: var(--att-bg-tertiary);
            border: 1px solid var(--att-border);
            color: var(--att-text-secondary);
        }

        .att-btn-secondary:hover {
            background: var(--att-bg-card);
            color: var(--att-text-primary);
        }

        .att-btn-sm {
            padding: 6px 12px;
            font-size: 12px;
        }

        .att-btn-success {
            background: var(--att-accent-green);
            color: white;
        }

        /* Navigation */
        .att-nav {
            display: flex;
            gap: 4px;
            padding: 12px 24px;
            background: var(--att-bg-secondary);
            border-bottom: 1px solid var(--att-border);
            overflow-x: auto;
        }

        .att-nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            background: transparent;
            border: none;
            color: var(--att-text-secondary);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            border-radius: 6px;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .att-nav-item:hover {
            background: var(--att-bg-tertiary);
            color: var(--att-text-primary);
        }

        .att-nav-item.active {
            background: linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(0, 188, 212, 0.2));
            color: var(--att-accent-cyan);
        }

        /* Main Content */
        .att-main {
            padding: 24px;
            min-height: calc(100vh - 150px);
        }

        .att-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
            color: var(--att-text-muted);
        }

        .att-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--att-border);
            border-top-color: var(--att-accent-cyan);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .att-error {
            text-align: center;
            padding: 40px;
            color: var(--att-accent-red);
        }

        /* Dashboard */
        .att-dashboard {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .att-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
        }

        .att-kpi-card {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            position: relative;
            overflow: hidden;
        }

        .att-kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
        }

        .att-kpi-total::before { background: var(--att-accent-blue); }
        .att-kpi-present::before { background: var(--att-accent-green); }
        .att-kpi-late::before { background: var(--att-accent-yellow); }
        .att-kpi-absent::before { background: var(--att-accent-red); }

        .att-kpi-icon {
            width: 52px;
            height: 52px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .att-kpi-total .att-kpi-icon { background: rgba(0, 229, 255, 0.15); color: var(--att-accent-cyan); }
        .att-kpi-present .att-kpi-icon { background: rgba(0, 230, 118, 0.15); color: var(--att-accent-green); }
        .att-kpi-late .att-kpi-icon { background: rgba(255, 193, 7, 0.15); color: var(--att-accent-yellow); }
        .att-kpi-absent .att-kpi-icon { background: rgba(255, 82, 82, 0.15); color: var(--att-accent-red); }

        .att-kpi-data {
            flex: 1;
        }

        .att-kpi-value {
            display: block;
            font-size: 28px;
            font-weight: 700;
            line-height: 1.2;
        }

        .att-kpi-label {
            font-size: 13px;
            color: var(--att-text-muted);
        }

        .att-kpi-trend {
            position: absolute;
            top: 12px;
            right: 12px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }

        .att-trend-up { background: rgba(0, 230, 118, 0.15); color: var(--att-accent-green); }
        .att-trend-down { background: rgba(255, 82, 82, 0.15); color: var(--att-accent-red); }
        .att-trend-warning { background: rgba(255, 193, 7, 0.15); color: var(--att-accent-yellow); }
        .att-trend-neutral { background: rgba(0, 229, 255, 0.15); color: var(--att-accent-cyan); }

        /* Dashboard Grid */
        .att-dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        /* Score Card */
        .att-score-card {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 20px;
        }

        .att-score-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .att-score-header h3 {
            margin: 0;
            font-size: 16px;
        }

        .att-score-gauge {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
        }

        .att-gauge-ring {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: conic-gradient(
                var(--att-accent-green) 0deg calc(var(--score) * 3.6deg),
                var(--att-bg-tertiary) calc(var(--score) * 3.6deg) 360deg
            );
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .att-gauge-ring::before {
            content: '';
            position: absolute;
            width: 100px;
            height: 100px;
            background: var(--att-bg-card);
            border-radius: 50%;
        }

        .att-gauge-value {
            position: relative;
            font-size: 32px;
            font-weight: 700;
            z-index: 1;
        }

        .att-gauge-value small {
            font-size: 18px;
            font-weight: 400;
        }

        .att-score-legend {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }

        .att-legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: var(--att-text-secondary);
        }

        .att-legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .att-dot-green { background: var(--att-accent-green); }
        .att-dot-yellow { background: var(--att-accent-yellow); }
        .att-dot-red { background: var(--att-accent-red); }

        /* Chart Card */
        .att-chart-card {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 20px;
        }

        .att-chart-header h3 {
            margin: 0 0 20px 0;
            font-size: 16px;
        }

        .att-distribution-bars {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .att-bar-group {
            display: grid;
            grid-template-columns: 80px 1fr 50px;
            gap: 12px;
            align-items: center;
        }

        .att-bar-label {
            font-size: 13px;
            color: var(--att-text-secondary);
        }

        .att-bar-container {
            height: 24px;
            background: var(--att-bg-tertiary);
            border-radius: 6px;
            overflow: hidden;
        }

        .att-bar {
            height: 100%;
            border-radius: 6px;
            transition: width 0.5s ease;
        }

        .att-bar-green { background: linear-gradient(90deg, var(--att-accent-green), #4caf50); }
        .att-bar-yellow { background: linear-gradient(90deg, var(--att-accent-yellow), #ff9800); }
        .att-bar-red { background: linear-gradient(90deg, var(--att-accent-red), #e53935); }

        .att-bar-value {
            font-size: 14px;
            font-weight: 600;
            text-align: right;
        }

        /* Actions Card */
        .att-actions-card {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 20px;
        }

        .att-actions-card h3 {
            margin: 0 0 16px 0;
            font-size: 16px;
        }

        .att-quick-actions {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .att-action-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 16px;
            background: var(--att-bg-tertiary);
            border: 1px solid var(--att-border);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .att-action-btn:hover {
            background: var(--att-bg-secondary);
            border-color: var(--att-accent-cyan);
            transform: translateY(-2px);
        }

        .att-action-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .att-icon-add { background: rgba(0, 230, 118, 0.15); color: var(--att-accent-green); }
        .att-icon-list { background: rgba(0, 229, 255, 0.15); color: var(--att-accent-cyan); }
        .att-icon-export { background: rgba(179, 136, 255, 0.15); color: var(--att-accent-purple); }
        .att-icon-alert { background: rgba(255, 193, 7, 0.15); color: var(--att-accent-yellow); }

        .att-action-btn span {
            font-size: 12px;
            color: var(--att-text-secondary);
            font-weight: 500;
        }

        /* Alerts Card */
        .att-alerts-card {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 20px;
        }

        .att-alerts-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .att-alerts-header h3 {
            margin: 0;
            font-size: 16px;
        }

        .att-alerts-count {
            background: var(--att-accent-red);
            color: white;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 12px;
        }

        .att-alerts-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .att-alert-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: var(--att-bg-tertiary);
            border-radius: 8px;
            border-left: 3px solid;
        }

        .att-alert-critical { border-color: var(--att-accent-red); }
        .att-alert-high { border-color: var(--att-accent-yellow); }
        .att-alert-medium { border-color: var(--att-accent-cyan); }

        .att-alert-icon {
            font-size: 20px;
        }

        .att-alert-content {
            flex: 1;
        }

        .att-alert-title {
            display: block;
            font-weight: 500;
            font-size: 13px;
        }

        .att-alert-meta {
            font-size: 12px;
            color: var(--att-text-muted);
        }

        .att-alert-empty {
            text-align: center;
            padding: 20px;
            color: var(--att-text-muted);
        }

        .att-alert-empty span {
            display: block;
            font-size: 18px;
            margin-bottom: 8px;
            color: var(--att-accent-green);
        }

        /* Recent Section */
        .att-recent-section {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 20px;
        }

        .att-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .att-section-header h3 {
            margin: 0;
            font-size: 16px;
        }

        .att-link-btn {
            background: none;
            border: none;
            color: var(--att-accent-cyan);
            font-size: 13px;
            cursor: pointer;
        }

        .att-link-btn:hover {
            text-decoration: underline;
        }

        /* Tables */
        .att-table {
            width: 100%;
            border-collapse: collapse;
        }

        .att-table th,
        .att-table td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--att-border);
        }

        .att-table th {
            font-size: 12px;
            font-weight: 600;
            color: var(--att-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: var(--att-bg-tertiary);
        }

        .att-table td {
            font-size: 13px;
            color: var(--att-text-primary);
        }

        .att-table tbody tr:hover {
            background: var(--att-bg-tertiary);
        }

        .att-table code {
            background: rgba(0, 229, 255, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            color: var(--att-accent-cyan);
        }

        .att-table-striped tbody tr:nth-child(even) {
            background: var(--att-bg-tertiary);
        }

        .att-empty {
            text-align: center;
            padding: 40px !important;
            color: var(--att-text-muted);
        }

        /* Status Badges */
        .att-status {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }

        .att-status-success {
            background: rgba(0, 230, 118, 0.15);
            color: var(--att-accent-green);
        }

        .att-status-warning {
            background: rgba(255, 193, 7, 0.15);
            color: var(--att-accent-yellow);
        }

        .att-status-danger {
            background: rgba(255, 82, 82, 0.15);
            color: var(--att-accent-red);
        }

        /* Records View */
        .att-records {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .att-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            padding: 16px;
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
        }

        .att-toolbar-left,
        .att-toolbar-right {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .att-search-box {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: var(--att-bg-tertiary);
            border: 1px solid var(--att-border);
            border-radius: 6px;
        }

        .att-search-box input {
            border: none;
            background: transparent;
            color: var(--att-text-primary);
            font-size: 13px;
            outline: none;
            width: 200px;
        }

        .att-search-box svg {
            color: var(--att-text-muted);
        }

        .att-select {
            background: var(--att-bg-tertiary);
            border: 1px solid var(--att-border);
            color: var(--att-text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
        }

        .att-select-sm {
            padding: 6px 10px;
            font-size: 12px;
        }

        .att-table-container {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            overflow: hidden;
        }

        .att-actions-cell {
            display: flex;
            gap: 6px;
        }

        .att-btn-mini {
            width: 28px;
            height: 28px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .att-btn-info { background: rgba(0, 229, 255, 0.15); color: var(--att-accent-cyan); }
        .att-btn-warning { background: rgba(255, 193, 7, 0.15); color: var(--att-accent-yellow); }
        .att-btn-danger { background: rgba(255, 82, 82, 0.15); color: var(--att-accent-red); }

        .att-btn-mini:hover {
            transform: scale(1.1);
        }

        /* Pagination */
        .att-pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            padding: 16px;
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
        }

        .att-pagination-info {
            font-size: 13px;
            color: var(--att-text-secondary);
        }

        .att-pagination-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .att-page-indicator {
            padding: 0 12px;
            font-size: 13px;
            color: var(--att-text-secondary);
        }

        .att-pagination-size {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--att-text-secondary);
        }

        /* Modal */
        .att-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }

        .att-modal {
            background: var(--att-bg-secondary);
            border: 1px solid var(--att-border);
            border-radius: 16px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
        }

        .att-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid var(--att-border);
        }

        .att-modal-header h3 {
            margin: 0;
            font-size: 18px;
        }

        .att-modal-close {
            background: none;
            border: none;
            color: var(--att-text-muted);
            font-size: 24px;
            cursor: pointer;
            line-height: 1;
        }

        .att-modal-close:hover {
            color: var(--att-accent-red);
        }

        .att-modal-body {
            padding: 20px;
        }

        .att-modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 20px;
            border-top: 1px solid var(--att-border);
        }

        .att-form-group {
            margin-bottom: 16px;
        }

        .att-form-group label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 500;
            color: var(--att-text-secondary);
        }

        .att-form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .att-form-group .att-input,
        .att-form-group .att-select {
            width: 100%;
        }

        /* Detail View */
        .att-detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .att-detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .att-detail-full {
            grid-column: span 2;
        }

        .att-detail-label {
            font-size: 12px;
            color: var(--att-text-muted);
        }

        .att-detail-value {
            font-size: 14px;
            font-weight: 500;
        }

        /* Analytics View */
        .att-analytics {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .att-analytics-header {
            text-align: center;
            margin-bottom: 20px;
        }

        .att-analytics-header h2 {
            margin: 0 0 8px 0;
            font-size: 24px;
        }

        .att-analytics-header p {
            color: var(--att-text-muted);
            margin: 0;
        }

        .att-metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .att-metric-card {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .att-metric-icon {
            font-size: 32px;
        }

        .att-metric-content {
            display: flex;
            flex-direction: column;
        }

        .att-metric-value {
            font-size: 24px;
            font-weight: 700;
        }

        .att-metric-label {
            font-size: 13px;
            color: var(--att-text-muted);
        }

        .att-rankings-section {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 20px;
        }

        .att-rankings-section h3 {
            margin: 0 0 16px 0;
        }

        .att-rankings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 12px;
        }

        .att-ranking-card {
            background: var(--att-bg-tertiary);
            border-radius: 8px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .att-rank-position {
            font-size: 20px;
            font-weight: 700;
            color: var(--att-accent-cyan);
            width: 40px;
        }

        .att-rank-1 .att-rank-position { color: #ffd700; }
        .att-rank-2 .att-rank-position { color: #c0c0c0; }
        .att-rank-3 .att-rank-position { color: #cd7f32; }

        .att-rank-info {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .att-rank-name {
            font-weight: 500;
        }

        .att-rank-score {
            font-size: 12px;
            color: var(--att-text-muted);
        }

        .att-rank-bar {
            width: 80px;
            height: 6px;
            background: var(--att-bg-secondary);
            border-radius: 3px;
            overflow: hidden;
        }

        .att-rank-fill {
            height: 100%;
            background: var(--att-accent-green);
            border-radius: 3px;
        }

        .att-analytics-empty {
            text-align: center;
            padding: 60px;
        }

        .att-empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .att-analytics-empty h3 {
            margin: 0 0 12px 0;
        }

        .att-analytics-empty p {
            color: var(--att-text-muted);
            margin-bottom: 24px;
        }

        /* Patterns View */
        .att-patterns {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .att-patterns-header {
            text-align: center;
        }

        .att-patterns-header h2 {
            margin: 0 0 8px 0;
            font-size: 24px;
        }

        .att-patterns-header p {
            color: var(--att-text-muted);
            margin: 0;
        }

        .att-patterns-summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
        }

        .att-summary-card {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }

        .att-summary-value {
            display: block;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .att-summary-label {
            font-size: 13px;
            color: var(--att-text-muted);
        }

        .att-summary-critical .att-summary-value { color: var(--att-accent-red); }
        .att-summary-high .att-summary-value { color: var(--att-accent-yellow); }
        .att-summary-medium .att-summary-value { color: var(--att-accent-cyan); }
        .att-summary-low .att-summary-value { color: var(--att-accent-green); }

        .att-patterns-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .att-pattern-card {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px 20px;
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            border-left: 4px solid;
        }

        .att-pattern-critical { border-left-color: var(--att-accent-red); }
        .att-pattern-high { border-left-color: var(--att-accent-yellow); }
        .att-pattern-medium { border-left-color: var(--att-accent-cyan); }
        .att-pattern-low { border-left-color: var(--att-accent-green); }

        .att-pattern-severity {
            font-size: 24px;
        }

        .att-pattern-content {
            flex: 1;
        }

        .att-pattern-title {
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 4px;
        }

        .att-pattern-employee {
            font-size: 13px;
            color: var(--att-text-secondary);
            margin-bottom: 8px;
        }

        .att-pattern-meta {
            display: flex;
            gap: 20px;
            font-size: 12px;
            color: var(--att-text-muted);
        }

        .att-pattern-actions {
            display: flex;
            gap: 8px;
        }

        .att-patterns-empty {
            text-align: center;
            padding: 60px;
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
        }

        /* Insights View */
        .att-insights {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .att-insights-header {
            text-align: center;
        }

        .att-insights-header h2 {
            margin: 0 0 8px 0;
            font-size: 24px;
        }

        .att-insights-header p {
            color: var(--att-text-muted);
            margin: 0;
        }

        .att-insights-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .att-insight-card {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 24px;
            display: flex;
            gap: 16px;
        }

        .att-insight-icon {
            font-size: 32px;
        }

        .att-insight-content h4 {
            margin: 0 0 8px 0;
            font-size: 16px;
        }

        .att-insight-content p {
            margin: 0;
            font-size: 14px;
            color: var(--att-text-secondary);
            line-height: 1.5;
        }

        .att-insights-intro {
            background: var(--att-bg-card);
            border: 1px solid var(--att-border);
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            max-width: 600px;
            margin: 0 auto;
        }

        .att-intro-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        .att-insights-intro h3 {
            margin: 0 0 16px 0;
        }

        .att-insights-intro ul {
            text-align: left;
            list-style: none;
            padding: 0;
            margin: 0 0 24px 0;
        }

        .att-insights-intro li {
            padding: 8px 0;
            font-size: 14px;
            color: var(--att-text-secondary);
        }

        /* Notification */
        .att-notification {
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 16px 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10001;
            animation: slideIn 0.3s ease;
        }

        .att-notification-success {
            background: rgba(0, 230, 118, 0.9);
            color: white;
        }

        .att-notification-error {
            background: rgba(255, 82, 82, 0.9);
            color: white;
        }

        .att-notification-warning {
            background: rgba(255, 193, 7, 0.9);
            color: #333;
        }

        .att-notification-info {
            background: rgba(0, 229, 255, 0.9);
            color: white;
        }

        .att-notification button {
            background: none;
            border: none;
            color: inherit;
            font-size: 18px;
            cursor: pointer;
            opacity: 0.8;
        }

        .att-notification button:hover {
            opacity: 1;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .att-header {
                flex-direction: column;
                gap: 16px;
            }

            .att-header-center {
                order: 3;
            }

            .att-kpi-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .att-dashboard-grid {
                grid-template-columns: 1fr;
            }

            .att-toolbar {
                flex-direction: column;
                align-items: stretch;
            }

            .att-toolbar-left,
            .att-toolbar-right {
                flex-wrap: wrap;
            }

            .att-pagination {
                flex-direction: column;
                text-align: center;
            }

            .att-form-row {
                grid-template-columns: 1fr;
            }

            .att-patterns-summary {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    `;

    document.head.appendChild(styles);
}

console.log('✅ [ATTENDANCE] Modulo Attendance Engine v2.0 cargado');
