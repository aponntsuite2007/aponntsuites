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
    advancedStatsUrl: '/api/attendance-stats',

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
    // NOTA: Si window.miEspacioSelfView está activo, pasar selfView=true
    getAttendances: (params = {}) => {
        const queryParams = new URLSearchParams();

        // Si viene de Mi Espacio, forzar vista de datos propios
        if (window.miEspacioSelfView) {
            queryParams.append('selfView', 'true');
        }

        // Agregar otros parámetros si se proporcionan
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value);
            }
        });

        const queryString = queryParams.toString();
        const url = queryString
            ? `${AttendanceAPI.baseUrl}?${queryString}`
            : AttendanceAPI.baseUrl;

        return AttendanceAPI.request(url);
    },
    getStats: () => {
        const url = window.miEspacioSelfView
            ? `${AttendanceAPI.baseUrl}/stats?selfView=true`
            : `${AttendanceAPI.baseUrl}/stats`;
        return AttendanceAPI.request(url);
    },
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

    // Advanced Statistics (Academic-level)
    getAdvancedStats: (companyId, startDate, endDate) => {
        let url = `${AttendanceAPI.advancedStatsUrl}/advanced/${companyId}`;
        const params = [];
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length) url += '?' + params.join('&');
        return AttendanceAPI.request(url);
    },
    getBranchComparison: (companyId, startDate, endDate) => {
        let url = `${AttendanceAPI.advancedStatsUrl}/branch-comparison/${companyId}`;
        const params = [];
        if (startDate) params.push(`startDate=${startDate}`);
        if (endDate) params.push(`endDate=${endDate}`);
        if (params.length) url += '?' + params.join('&');
        return AttendanceAPI.request(url);
    },
    getClimateZones: () => AttendanceAPI.request(`${AttendanceAPI.advancedStatsUrl}/climate-zones`),
    getDistribution: (companyId) => AttendanceAPI.request(`${AttendanceAPI.advancedStatsUrl}/distribution/${companyId}`),
    getTemporalAnalysis: (companyId) => AttendanceAPI.request(`${AttendanceAPI.advancedStatsUrl}/temporal/${companyId}`),
    getDepartmentRankings: (companyId, zone) => {
        let url = `${AttendanceAPI.advancedStatsUrl}/department-rankings/${companyId}`;
        if (zone) url += `?zone=${zone}`;
        return AttendanceAPI.request(url);
    },

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
                <button class="att-nav-item" data-view="cubo" onclick="AttendanceEngine.showView('cubo')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    Panel Ejecutivo
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
                case 'cubo': await this.renderCuboHoras(); break;
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
        let hoursData = { totalHours: 0, normalHours: 0, overtimeHours: 0, efficiency: 0 };

        try {
            const [statsResult, attendanceResult, overtimeResult] = await Promise.all([
                AttendanceAPI.getStats().catch(() => ({})),
                AttendanceAPI.getAttendances().catch(() => ({ attendances: [] })),
                AttendanceAPI.request(`${AttendanceAPI.baseUrl}/stats/overtime-summary`).catch(() => ({}))
            ]);

            stats = {
                total: parseInt(statsResult.total) || 0,
                present: parseInt(statsResult.present) || 0,
                late: parseInt(statsResult.late) || 0,
                absent: parseInt(statsResult.absent) || 0,
                onTime: parseInt(statsResult.onTime || statsResult.present) || 0
            };

            attendances = attendanceResult.attendances || attendanceResult.data || [];
            AttendanceState.attendances = attendances;

            // Procesar datos de horas extras (estructura del backend: data.hours)
            if (overtimeResult.success && overtimeResult.data) {
                const hours = overtimeResult.data.hours || {};
                const totalRecords = overtimeResult.data.totalRecords || 0;
                const totalHours = hours.total || hours.normal + hours.overtime || 0;
                const normalHours = hours.normal || 0;
                const overtimeHours = hours.overtime || 0;

                // Calcular porcentajes
                const normalPct = totalHours > 0 ? Math.round((normalHours / totalHours) * 100) : 0;
                const overtimePct = totalHours > 0 ? Math.round((overtimeHours / totalHours) * 100) : 0;

                // Calcular eficiencia (horas trabajadas vs esperadas - 8h/día promedio)
                const expectedHours = totalRecords * 8;
                const efficiency = expectedHours > 0 ? Math.round((totalHours / expectedHours) * 100) : 0;

                hoursData = {
                    totalHours: totalHours,
                    normalHours: normalHours,
                    overtimeHours: overtimeHours,
                    weekendHours: hours.weekend || 0,
                    holidayHours: hours.holiday || 0,
                    expectedHours: expectedHours,
                    efficiency: Math.min(efficiency, 150), // Limitar a 150%
                    recordCount: totalRecords,
                    recordsWithOvertime: overtimeResult.data.recordsWithOvertime || 0,
                    overtimePercentage: overtimeResult.data.overtimePercentage || 0,
                    percentages: {
                        normalPct,
                        overtimePct
                    }
                };
            }

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

                <!-- Hours Metrics Section -->
                <div class="att-hours-summary" style="margin-bottom: 20px;">
                    <div class="att-section-header" style="margin-bottom: 12px;">
                        <h3 style="margin: 0; color: var(--att-text-primary); display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 20px;">⏱️</span> Resumen de Horas (30 días)
                        </h3>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                        <div class="att-hours-card" style="background: linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 229, 255, 0.05) 100%); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 12px; padding: 16px; text-align: center;">
                            <div style="font-size: 28px; font-weight: 700; color: var(--att-accent-cyan);">${hoursData.totalHours?.toFixed(1) || '0'}h</div>
                            <div style="font-size: 12px; color: var(--att-text-muted); margin-top: 4px;">Total Horas</div>
                            <div style="font-size: 10px; color: var(--att-text-secondary); margin-top: 2px;">${hoursData.recordCount || 0} registros</div>
                        </div>
                        <div class="att-hours-card" style="background: linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(0, 230, 118, 0.05) 100%); border: 1px solid rgba(0, 230, 118, 0.3); border-radius: 12px; padding: 16px; text-align: center;">
                            <div style="font-size: 28px; font-weight: 700; color: var(--att-accent-green);">${hoursData.normalHours?.toFixed(1) || '0'}h</div>
                            <div style="font-size: 12px; color: var(--att-text-muted); margin-top: 4px;">Horas Normales</div>
                            <div style="font-size: 10px; color: var(--att-text-secondary); margin-top: 2px;">${hoursData.percentages?.normalPct || 0}% del total</div>
                        </div>
                        <div class="att-hours-card" style="background: linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 152, 0, 0.05) 100%); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 12px; padding: 16px; text-align: center;">
                            <div style="font-size: 28px; font-weight: 700; color: var(--att-accent-orange);">${hoursData.overtimeHours?.toFixed(1) || '0'}h</div>
                            <div style="font-size: 12px; color: var(--att-text-muted); margin-top: 4px;">Horas Extra</div>
                            <div style="font-size: 10px; color: var(--att-text-secondary); margin-top: 2px;">${hoursData.percentages?.overtimePct || 0}% del total</div>
                        </div>
                        <div class="att-hours-card" style="background: linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(156, 39, 176, 0.05) 100%); border: 1px solid rgba(156, 39, 176, 0.3); border-radius: 12px; padding: 16px; text-align: center;">
                            <div style="font-size: 28px; font-weight: 700; color: #9c27b0;">${hoursData.efficiency?.toFixed(0) || '0'}%</div>
                            <div style="font-size: 12px; color: var(--att-text-muted); margin-top: 4px;">Eficiencia</div>
                            <div style="font-size: 10px; color: var(--att-text-secondary); margin-top: 2px;">vs horas esperadas</div>
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
                    <div class="att-toolbar-right" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                        <div class="att-search-box">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="text" id="att-search" placeholder="Buscar empleado..." onkeyup="AttendanceEngine.filterRecords()" />
                        </div>
                        <select id="att-filter-branch" class="att-select att-select-compact" onchange="AttendanceEngine.filterRecords()" title="Sucursal">
                            <option value="">🏢 Sucursal</option>
                        </select>
                        <select id="att-filter-dept" class="att-select att-select-compact" onchange="AttendanceEngine.filterRecords()" title="Departamento">
                            <option value="">📁 Depto</option>
                        </select>
                        <select id="att-filter-destination" class="att-select att-select-compact" onchange="AttendanceEngine.filterRecords()" title="Destino HE">
                            <option value="">⚡ Destino HE</option>
                            <option value="bank">🏦 Solo Banco</option>
                            <option value="paid">💵 Solo Pago</option>
                            <option value="pending">⏳ Pendientes</option>
                        </select>
                        <select id="att-filter-status" class="att-select att-select-compact" onchange="AttendanceEngine.filterRecords()">
                            <option value="">📊 Estado</option>
                            <option value="present">A tiempo</option>
                            <option value="late">Tarde</option>
                            <option value="absent">Ausente</option>
                        </select>
                    </div>
                </div>

                <!-- Records Table -->
                <div class="att-table-container" style="overflow-x: auto;">
                    <table class="att-table att-table-striped att-table-compact">
                        <thead>
                            <tr>
                                <th>👤 Empleado</th>
                                <th>🏷️ Legajo</th>
                                <th>🏢 Sucursal</th>
                                <th>📁 Depto</th>
                                <th>🏭 Sector</th>
                                <th>📅 Fecha</th>
                                <th>⏰ Turno</th>
                                <th>🕐 Entrada</th>
                                <th>🕐 Salida</th>
                                <th>⏱️ Normal</th>
                                <th class="att-col-extras" title="Horas para Pago">💵 Extras</th>
                                <th class="att-col-banco" title="Horas para Banco">🏦 Banco</th>
                                <th>📊 Total</th>
                                <th>📍 Estado</th>
                                <th>⚙️</th>
                            </tr>
                        </thead>
                        <tbody id="att-records-body">
                            ${paginatedData.length > 0 ? paginatedData.map(att => {
                                // Calcular horas extras y destino - MUTUAMENTE EXCLUYENTES
                                const overtimeHours = parseFloat(att.hours?.overtimeHours || att.overtime_hours || 0);
                                const destination = att.overtime_destination || att.hours?.overtimeDestination;
                                // Columna Extras: solo si destino es 'pay' o 'paid'
                                const extrasHours = (destination === 'pay' || destination === 'paid') ? overtimeHours : 0;
                                // Columna Banco: solo si destino es 'bank'
                                const bancoHours = destination === 'bank' ? overtimeHours : 0;
                                // Si hay HE pero no hay destino definido, mostrar en Extras como pendiente
                                const pendingHours = (overtimeHours > 0 && !destination) ? overtimeHours : 0;

                                return `
                                <tr class="${overtimeHours > 0 ? 'has-overtime' : ''}">
                                    <td><strong>${att.user_name || att.employee_name || 'N/A'}</strong></td>
                                    <td><code style="font-size: 0.75rem;">${att.legajo || att.employee_id || 'N/A'}</code></td>
                                    <td class="att-td-compact">${att.branch_name || att.branch || '-'}</td>
                                    <td class="att-td-compact">${att.department_name || att.department || '-'}</td>
                                    <td class="att-td-compact">${att.sector_name || att.sector || '-'}</td>
                                    <td class="att-td-compact">${this.formatDate(att.date || att.attendance_date)}${att.hours?.isWeekend ? ' <span class="badge-weekend">FDS</span>' : ''}${att.hours?.isHoliday ? ' <span class="badge-holiday">FER</span>' : ''}</td>
                                    <td class="att-td-compact">${att.shift?.name || '<span class="text-muted">-</span>'}</td>
                                    <td class="att-td-compact">${this.formatTime(att.check_in || att.time_in)}${att.lateInfo?.isLate ? ' <span class="badge-late">+' + att.lateInfo.lateMinutes + 'm</span>' : ''}</td>
                                    <td class="att-td-compact">${this.formatTime(att.check_out || att.time_out)}</td>
                                    <td class="hours-normal att-td-compact">${att.hours?.normalHours?.toFixed(1) || '0.0'}h</td>
                                    <td class="att-col-extras ${extrasHours > 0 ? 'att-has-extras' : ''} ${pendingHours > 0 ? 'att-has-pending' : ''}">
                                        ${extrasHours > 0 ? '<span class="att-extras-value">+' + extrasHours.toFixed(1) + 'h</span>' :
                                          pendingHours > 0 ? '<span class="att-pending-value">⏳' + pendingHours.toFixed(1) + 'h</span>' : '-'}
                                    </td>
                                    <td class="att-col-banco ${bancoHours > 0 ? 'att-has-banco' : ''}">
                                        ${bancoHours > 0 ? '<span class="att-banco-value">+' + bancoHours.toFixed(1) + 'h</span>' : '-'}
                                    </td>
                                    <td class="hours-total att-td-compact"><strong>${att.hours?.effectiveHours?.toFixed(1) || this.calculateHours(att.check_in || att.time_in, att.check_out || att.time_out)}</strong></td>
                                    <td class="att-td-compact">${this.getStatusBadge(att.status, att.lateInfo)}</td>
                                    <td class="att-actions-cell">
                                        <button onclick="AttendanceEngine.viewRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-info" title="Ver">👁️</button>
                                        <button onclick="AttendanceEngine.editRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-warning" title="Editar">✏️</button>
                                        <button onclick="AttendanceEngine.deleteRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-danger" title="Eliminar">🗑️</button>
                                    </td>
                                </tr>
                            `}).join('') : `
                                <tr><td colspan="15" class="att-empty">No hay registros de asistencia</td></tr>
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

        // Poblar filtros de sucursal y departamento
        this.populateFiltersFromData(attendances);
    },

    /**
     * Poblar los selects de sucursal y departamento con datos únicos
     */
    populateFiltersFromData(attendances) {
        // Extraer sucursales únicas
        const branches = [...new Set(attendances.filter(a => a.branch_name || a.branch).map(a => a.branch_name || a.branch))].sort();
        const branchSelect = document.getElementById('att-filter-branch');
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">🏢 Sucursal</option>' +
                branches.map(b => `<option value="${b}">${b}</option>`).join('');
        }

        // Extraer departamentos únicos
        const depts = [...new Set(attendances.filter(a => a.department_name || a.department).map(a => a.department_name || a.department))].sort();
        const deptSelect = document.getElementById('att-filter-dept');
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="">📁 Depto</option>' +
                depts.map(d => `<option value="${d}">${d}</option>`).join('');
        }
    },

    // ========================================================================
    // ANALYTICS VIEW - Academic-Level Statistics
    // ========================================================================
    async renderAnalytics() {
        const content = document.getElementById('att-content');
        content.innerHTML = `
            <div class="att-loading att-loading-fancy">
                <div class="att-loading-orb"></div>
                <div class="att-loading-rings">
                    <div class="att-ring att-ring-1"></div>
                    <div class="att-ring att-ring-2"></div>
                    <div class="att-ring att-ring-3"></div>
                </div>
                <span class="att-loading-text">Analizando datos con IA...</span>
                <div class="att-loading-badges">
                    <span class="att-tech-badge">Trimmed Mean</span>
                    <span class="att-tech-badge">IQR Analysis</span>
                    <span class="att-tech-badge">Climate Zones</span>
                </div>
            </div>`;

        let stats = null;
        let hoursStats = null;

        let weatherStats = null;
        let yearComparison = null;

        if (AttendanceState.companyId) {
            try {
                // Cargar estadísticas avanzadas, de horas y clima en paralelo
                const [advancedResult, hoursResult, weatherResult, yearComparisonResult] = await Promise.all([
                    AttendanceAPI.getAdvancedStats(
                        AttendanceState.companyId,
                        AttendanceState.dateRange.start,
                        AttendanceState.dateRange.end
                    ).catch(e => { console.log('Advanced stats error:', e); return null; }),
                    AttendanceAPI.request(`${AttendanceAPI.baseUrl}/stats/detailed?groupBy=shift`).catch(e => {
                        console.log('Hours stats error:', e);
                        return null;
                    }),
                    AttendanceAPI.request(`${AttendanceAPI.baseUrl}/stats/weather-patterns?startDate=${AttendanceState.dateRange.start}&endDate=${AttendanceState.dateRange.end}`).catch(e => {
                        console.log('Weather stats error:', e);
                        return null;
                    }),
                    AttendanceAPI.request(`${AttendanceAPI.baseUrl}/stats/year-comparison?startDate=${AttendanceState.dateRange.start}&endDate=${AttendanceState.dateRange.end}`).catch(e => {
                        console.log('Year comparison error:', e);
                        return null;
                    })
                ]);
                stats = advancedResult;
                hoursStats = hoursResult?.success ? hoursResult.data : null;
                weatherStats = weatherResult?.success ? weatherResult.data : null;
                yearComparison = yearComparisonResult?.success ? yearComparisonResult.data : null;
            } catch (e) {
                console.log('Analytics API error:', e);
            }
        }

        // =======================================================================
        // ANALYTICS PLAYGROUND - "Toy Store for HR Managers"
        // =======================================================================

        // Formatters con separadores de miles (es-AR: punto miles, coma decimales)
        const fmt = (n, d = 1) => n != null ? Number(n).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '--';
        const fmtInt = (n) => n != null ? Number(n).toLocaleString('es-AR') : '--';
        const pct = (n) => n != null ? `${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : '--%';
        const hasData = stats?.success && stats?.attendance?.sampleSize > 0;

        // Zone configuration
        const zoneConfig = {
            TROPICAL: { icon: '🌴', color: '#f59e0b', bg: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)', label: 'Tropical' },
            SUBTROPICAL: { icon: '☀️', color: '#f97316', bg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', label: 'Subtropical' },
            TEMPERATE: { icon: '🌤️', color: '#3b82f6', bg: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)', label: 'Templado' },
            COLD: { icon: '❄️', color: '#6366f1', bg: 'linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 100%)', label: 'Frio' }
        };

        // Shift icons
        const shiftIcons = { morning: '🌅', afternoon: '☀️', night: '🌙' };

        // Weather icons
        const weatherIcons = {
            sunny: '☀️', clear: '☀️', cloudy: '☁️', rainy: '🌧️', stormy: '⛈️',
            snowy: '❄️', foggy: '🌫️', windy: '💨', default: '🌡️'
        };

        // Emotion icons
        const emotionIcons = {
            happy: '😊', sad: '😢', angry: '😠', surprised: '😲',
            neutral: '😐', fearful: '😨', disgusted: '😖', default: '🎭'
        };

        // Progress ring SVG generator
        const progressRing = (percent, size = 80, stroke = 8, color = '#6366f1') => {
            const radius = (size - stroke) / 2;
            const circumference = radius * 2 * Math.PI;
            const offset = circumference - (percent / 100) * circumference;
            return `
                <svg width="${size}" height="${size}" class="att-progress-ring">
                    <circle cx="${size/2}" cy="${size/2}" r="${radius}"
                            fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="${stroke}"/>
                    <circle cx="${size/2}" cy="${size/2}" r="${radius}"
                            fill="none" stroke="${color}" stroke-width="${stroke}"
                            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                            stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"
                            class="att-ring-progress"/>
                    <text x="50%" y="50%" text-anchor="middle" dy=".3em"
                          fill="#fff" font-size="${size/4}px" font-weight="600">${Math.round(percent)}%</text>
                </svg>`;
        };

        // Sparkline generator
        const sparkline = (values, width = 100, height = 30, color = '#6366f1') => {
            if (!values || values.length < 2) return '';
            const max = Math.max(...values);
            const min = Math.min(...values);
            const range = max - min || 1;
            const points = values.map((v, i) => {
                const x = (i / (values.length - 1)) * width;
                const y = height - ((v - min) / range) * height;
                return `${x},${y}`;
            }).join(' ');
            return `
                <svg width="${width}" height="${height}" class="att-sparkline">
                    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="${width}" cy="${height - ((values[values.length-1] - min) / range) * height}" r="3" fill="${color}"/>
                </svg>`;
        };

        // Mini bar chart
        const miniBarChart = (data, maxVal, height = 40, barColor = '#6366f1') => {
            if (!data || data.length === 0) return '';
            const barWidth = 100 / data.length;
            return `
                <div class="att-mini-bars" style="height: ${height}px">
                    ${data.map((v, i) => {
                        const h = maxVal > 0 ? (v / maxVal) * 100 : 0;
                        return `<div class="att-mini-bar" style="width: ${barWidth}%; height: ${h}%; background: ${barColor}"></div>`;
                    }).join('')}
                </div>`;
        };

        content.innerHTML = `
            <div class="att-playground">
                <!-- ============================================================ -->
                <!-- HERO HEADER - Command Center Style -->
                <!-- ============================================================ -->
                <header class="att-play-header">
                    <div class="att-hero-content">
                        <div class="att-hero-icon">
                            <div class="att-hero-pulse"></div>
                            <span>📊</span>
                        </div>
                        <div class="att-hero-text">
                            <h1>Centro de Inteligencia RRHH</h1>
                            <p>Analisis academico con metodologia estadistica avanzada</p>
                        </div>
                    </div>
                    <div class="att-hero-tech">
                        <div class="att-tech-stack">
                            <span class="att-tech-chip" data-tooltip="Media acotada - elimina 10% extremos">
                                <i>σ</i> Trimmed Mean
                            </span>
                            <span class="att-tech-chip" data-tooltip="Interquartile Range - detecta outliers">
                                <i>📦</i> IQR Analysis
                            </span>
                            <span class="att-tech-chip" data-tooltip="Zonificacion por latitud GPS">
                                <i>🌍</i> Climate Zones
                            </span>
                            <span class="att-tech-chip" data-tooltip="Predicciones con regresion lineal">
                                <i>📈</i> Predictive AI
                            </span>
                        </div>
                    </div>
                </header>

                ${hasData ? `
                <!-- ============================================================ -->
                <!-- QUICK STATS - Animated Score Cards -->
                <!-- ============================================================ -->
                <section class="att-quick-scores">
                    <div class="att-score-card att-score-primary">
                        <div class="att-score-glow"></div>
                        ${progressRing(stats.attendance.rates?.present || 0, 90, 10, '#22c55e')}
                        <div class="att-score-info">
                            <span class="att-score-label">Puntualidad</span>
                            <span class="att-score-trend att-trend-up">+2.3%</span>
                        </div>
                    </div>
                    <div class="att-score-card att-score-warning">
                        <div class="att-score-glow"></div>
                        ${progressRing(100 - (stats.attendance.rates?.late || 0), 90, 10, '#f59e0b')}
                        <div class="att-score-info">
                            <span class="att-score-label">Sin Tardanzas</span>
                            <span class="att-score-detail">${fmt(stats.attendance.lateMinutes?.trimmedMean)} min avg</span>
                        </div>
                    </div>
                    <div class="att-score-card att-score-success">
                        <div class="att-score-glow"></div>
                        ${progressRing(100 - (stats.attendance.rates?.absent || 0), 90, 10, '#6366f1')}
                        <div class="att-score-info">
                            <span class="att-score-label">Asistencia</span>
                            <span class="att-score-detail">${stats.attendance.sampleSize?.toLocaleString()} registros</span>
                        </div>
                    </div>
                    <div class="att-score-card att-score-info-card">
                        <div class="att-score-glow"></div>
                        <div class="att-score-big-number">
                            <span class="att-big-num">${stats.kiosks?.total || 0}</span>
                            <span class="att-big-label">Kioscos</span>
                        </div>
                        <div class="att-score-info">
                            <span class="att-score-label">Puntos de Fichaje</span>
                            <span class="att-score-detail">${stats.kiosks?.withGPS || 0} con GPS</span>
                        </div>
                    </div>
                </section>

                <!-- ============================================================ -->
                <!-- EXPLORATION ZONES - Interactive Cards -->
                <!-- ============================================================ -->
                <section class="att-explore-zones">
                    <h2 class="att-section-title">
                        <span class="att-title-icon">🎯</span>
                        Zonas de Exploracion
                        <span class="att-title-badge">${Object.keys(stats.byClimateZone || {}).length + 6} areas</span>
                    </h2>

                    <div class="att-zone-grid">
                        <!-- ZONE: Attendance Deep Dive -->
                        <div class="att-zone-card att-zone-attendance" onclick="AttendanceEngine.expandZone('attendance')">
                            <div class="att-zone-bg"></div>
                            <div class="att-zone-content">
                                <div class="att-zone-icon">🕐</div>
                                <h3>Asistencia</h3>
                                <p>Tardanzas, puntualidad, distribucion horaria</p>
                                <div class="att-zone-preview">
                                    ${sparkline([
                                        stats.attendance.rates?.present || 0,
                                        100 - (stats.attendance.rates?.late || 0),
                                        100 - (stats.attendance.rates?.absent || 0),
                                        stats.attendance.rates?.present || 0
                                    ], 80, 25, '#22c55e')}
                                </div>
                                <div class="att-zone-stats">
                                    <span><strong>${pct(stats.attendance.rates?.present)}</strong> Puntual</span>
                                    <span><strong>${pct(stats.attendance.rates?.late)}</strong> Tarde</span>
                                </div>
                            </div>
                            <div class="att-zone-action">
                                <span>Explorar</span>
                                <i>→</i>
                            </div>
                        </div>

                        <!-- ZONE: Medical Stats -->
                        <div class="att-zone-card att-zone-medical" onclick="AttendanceEngine.expandZone('medical')">
                            <div class="att-zone-bg"></div>
                            <div class="att-zone-content">
                                <div class="att-zone-icon">🏥</div>
                                <h3>Salud Laboral</h3>
                                <p>Certificados medicos, CIE-10, dias perdidos</p>
                                <div class="att-zone-preview">
                                    ${stats.medical?.available ? `
                                        <div class="att-zone-metric">
                                            <span class="att-metric-big">${stats.medical.totalDaysLost || 0}</span>
                                            <span class="att-metric-label">dias licencia</span>
                                        </div>
                                    ` : '<span class="att-zone-na">Sin datos</span>'}
                                </div>
                                <div class="att-zone-stats">
                                    <span><strong>${stats.medical?.sampleSize || 0}</strong> certificados</span>
                                    <span><strong>${stats.medical?.riskIndicators?.highFrequencyEmployees || 0}</strong> frecuentes</span>
                                </div>
                            </div>
                            <div class="att-zone-action">
                                <span>Explorar</span>
                                <i>→</i>
                            </div>
                        </div>

                        <!-- ZONE: Emotional/Biometric -->
                        <div class="att-zone-card att-zone-emotional" onclick="AttendanceEngine.expandZone('emotional')">
                            <div class="att-zone-bg"></div>
                            <div class="att-zone-content">
                                <div class="att-zone-icon">🧠</div>
                                <h3>Bienestar</h3>
                                <p>Fatiga, estres, emociones (Azure Face AI)</p>
                                <div class="att-zone-preview">
                                    ${stats.emotional?.available ? `
                                        <div class="att-emotion-faces">
                                            ${(stats.emotional.dominantEmotions || []).slice(0, 4).map(e =>
                                                `<span class="att-emotion-chip">${emotionIcons[e.emotion?.toLowerCase()] || emotionIcons.default} ${e.percentage?.toFixed(0)}%</span>`
                                            ).join('')}
                                        </div>
                                    ` : '<span class="att-zone-na">Sin datos biometricos</span>'}
                                </div>
                                <div class="att-zone-stats">
                                    <span><strong>${pct(stats.emotional?.fatigue?.highFatigueRate)}</strong> alta fatiga</span>
                                    <span><strong>${pct(stats.emotional?.stress?.highStressRate)}</strong> alto estres</span>
                                </div>
                            </div>
                            <div class="att-zone-action">
                                <span>Explorar</span>
                                <i>→</i>
                            </div>
                        </div>

                        <!-- ZONE: Shifts Analysis -->
                        <div class="att-zone-card att-zone-shifts" onclick="AttendanceEngine.expandZone('shifts')">
                            <div class="att-zone-bg"></div>
                            <div class="att-zone-content">
                                <div class="att-zone-icon">⏰</div>
                                <h3>Turnos</h3>
                                <p>Mañana, tarde, noche - comparativas</p>
                                <div class="att-zone-preview">
                                    ${stats.shifts?.available ? `
                                        <div class="att-shift-pills">
                                            <span class="att-shift-pill att-shift-morning">${shiftIcons.morning} ${stats.shifts.byType?.morning?.records || 0}</span>
                                            <span class="att-shift-pill att-shift-afternoon">${shiftIcons.afternoon} ${stats.shifts.byType?.afternoon?.records || 0}</span>
                                            <span class="att-shift-pill att-shift-night">${shiftIcons.night} ${stats.shifts.byType?.night?.records || 0}</span>
                                        </div>
                                    ` : '<span class="att-zone-na">Sin turnos</span>'}
                                </div>
                                <div class="att-zone-stats">
                                    <span><strong>${stats.shifts?.totalShifts || 0}</strong> turnos</span>
                                    <span><strong>${stats.shifts?.sampleSize || 0}</strong> fichajes</span>
                                </div>
                            </div>
                            <div class="att-zone-action">
                                <span>Explorar</span>
                                <i>→</i>
                            </div>
                        </div>

                        <!-- ZONE: Weather Correlations -->
                        <div class="att-zone-card att-zone-weather" onclick="AttendanceEngine.expandZone('weather')">
                            <div class="att-zone-bg"></div>
                            <div class="att-zone-content">
                                <div class="att-zone-icon">🌦️</div>
                                <h3>Clima</h3>
                                <p>Correlaciones meteorologicas</p>
                                <div class="att-zone-preview">
                                    ${stats.weather?.available ? `
                                        <div class="att-weather-chips">
                                            ${(stats.weather.byCondition || []).slice(0, 3).map(w =>
                                                `<span class="att-weather-chip">${weatherIcons[w.condition?.toLowerCase()] || weatherIcons.default} ${w.percentage?.toFixed(0)}%</span>`
                                            ).join('')}
                                        </div>
                                    ` : '<span class="att-zone-na">Sin datos clima</span>'}
                                </div>
                                <div class="att-zone-stats">
                                    <span><strong>${stats.weather?.sampleSize || 0}</strong> registros</span>
                                </div>
                            </div>
                            <div class="att-zone-action">
                                <span>Explorar</span>
                                <i>→</i>
                            </div>
                        </div>

                        <!-- ZONE: Predictions -->
                        <div class="att-zone-card att-zone-predictions" onclick="AttendanceEngine.expandZone('predictions')">
                            <div class="att-zone-bg"></div>
                            <div class="att-zone-content">
                                <div class="att-zone-icon">🔮</div>
                                <h3>Predicciones</h3>
                                <p>Tendencias y proyecciones ML</p>
                                <div class="att-zone-preview">
                                    ${stats.predictions ? `
                                        <div class="att-prediction-trend">
                                            <span class="att-trend-arrow ${stats.predictions.attendance?.trend === 'improving' ? 'att-trend-up' : 'att-trend-down'}">
                                                ${stats.predictions.attendance?.trend === 'improving' ? '📈' : '📉'}
                                            </span>
                                            <span>${stats.predictions.attendance?.description || 'Analizando...'}</span>
                                        </div>
                                    ` : '<span class="att-zone-na">Calculando...</span>'}
                                </div>
                                <div class="att-zone-stats">
                                    <span><strong>Regresion</strong> lineal</span>
                                </div>
                            </div>
                            <div class="att-zone-action">
                                <span>Explorar</span>
                                <i>→</i>
                            </div>
                        </div>

                        <!-- ZONE: Hours Worked - OvertimeCalculator -->
                        <div class="att-zone-card att-zone-hours" onclick="AttendanceEngine.expandZone('hours')">
                            <div class="att-zone-bg"></div>
                            <div class="att-zone-content">
                                <div class="att-zone-icon">⏱️</div>
                                <h3>Horas Trabajadas</h3>
                                <p>Normal, extras, finde, feriado</p>
                                <div class="att-zone-preview">
                                    ${hoursStats?.summary ? `
                                        <div class="att-hours-mini-grid">
                                            <span class="att-hour-chip att-hour-normal">${fmt(hoursStats.summary.normalHours)}h</span>
                                            <span class="att-hour-chip att-hour-extra">${fmt(hoursStats.summary.overtimeHours)}h</span>
                                        </div>
                                    ` : '<span class="att-zone-na">Calculando horas...</span>'}
                                </div>
                                <div class="att-zone-stats">
                                    <span><strong>${fmt(hoursStats?.summary?.totalHours || 0)}</strong> horas totales</span>
                                    <span><strong>${hoursStats?.summary?.totalRecords || 0}</strong> registros</span>
                                </div>
                            </div>
                            <div class="att-zone-action">
                                <span>Explorar</span>
                                <i>→</i>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ============================================================ -->
                <!-- CLIMATE ZONES - Geographic Intelligence -->
                <!-- ============================================================ -->
                ${Object.keys(stats.byClimateZone || {}).length > 0 ? `
                <section class="att-climate-section">
                    <h2 class="att-section-title">
                        <span class="att-title-icon">🌍</span>
                        Inteligencia Geografica
                        <span class="att-title-badge">${Object.keys(stats.byClimateZone).length} zonas</span>
                    </h2>
                    <p class="att-section-subtitle">Comparativas SOLO validas entre kioscos de la misma zona climatica (basada en latitud GPS)</p>

                    <div class="att-climate-cards">
                        ${Object.entries(stats.byClimateZone).map(([code, zone]) => {
                            const cfg = zoneConfig[code] || zoneConfig.TEMPERATE;
                            return `
                                <div class="att-climate-card" style="--zone-color: ${cfg.color}; --zone-bg: ${cfg.bg}">
                                    <div class="att-climate-header">
                                        <span class="att-climate-icon">${cfg.icon}</span>
                                        <div class="att-climate-title">
                                            <h4>${zone.zone?.name || cfg.label}</h4>
                                            <span class="att-climate-desc">${zone.zone?.description || ''}</span>
                                        </div>
                                    </div>
                                    <div class="att-climate-body">
                                        <div class="att-climate-kiosks">
                                            <span class="att-kiosk-count">${zone.kiosks || 0}</span>
                                            <span class="att-kiosk-label">kioscos</span>
                                        </div>
                                        <div class="att-climate-metrics">
                                            <div class="att-cm-row">
                                                <span>Registros</span>
                                                <strong>${(zone.records || 0).toLocaleString()}</strong>
                                            </div>
                                            <div class="att-cm-row">
                                                <span>Puntualidad</span>
                                                <strong>${pct(zone.rates?.present)}</strong>
                                            </div>
                                            <div class="att-cm-row">
                                                <span>Tardanzas</span>
                                                <strong>${pct(zone.rates?.late)}</strong>
                                            </div>
                                            <div class="att-cm-row">
                                                <span>Tardanza media</span>
                                                <strong>${fmt(zone.lateMinutes?.trimmed)} min</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="att-climate-footer">
                                        <span class="att-climate-impact">${zone.zone?.winterImpact || ''} en invierno</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </section>
                ` : ''}

                <!-- ============================================================ -->
                <!-- DEEP DIVE PANELS - Expandable Detail Sections -->
                <!-- ============================================================ -->
                <section class="att-deep-dives" id="att-deep-dives">
                    <!-- Attendance Deep Dive Panel -->
                    <div class="att-dive-panel att-dive-attendance" id="dive-attendance" style="display: none;">
                        <div class="att-dive-header">
                            <h3>🕐 Analisis Detallado de Asistencia</h3>
                            <button class="att-dive-close" onclick="AttendanceEngine.closeDive('attendance')">✕</button>
                        </div>
                        <div class="att-dive-content">
                            ${stats.attendance ? `
                                <div class="att-dive-grid">
                                    <div class="att-dive-stat">
                                        <span class="att-dive-label">Media Simple</span>
                                        <span class="att-dive-value">${fmt(stats.attendance.lateMinutes?.rawMean)} min</span>
                                        <span class="att-dive-note">Con outliers</span>
                                    </div>
                                    <div class="att-dive-stat att-dive-highlight">
                                        <span class="att-dive-label">Media Acotada</span>
                                        <span class="att-dive-value">${fmt(stats.attendance.lateMinutes?.trimmedMean)} min</span>
                                        <span class="att-dive-note">Sin 10% extremos</span>
                                    </div>
                                    <div class="att-dive-stat">
                                        <span class="att-dive-label">Desviacion Std</span>
                                        <span class="att-dive-value">${fmt(stats.attendance.lateMinutes?.stdDev)} min</span>
                                    </div>
                                    <div class="att-dive-stat">
                                        <span class="att-dive-label">CV%</span>
                                        <span class="att-dive-value">${fmt(stats.attendance.lateMinutes?.cv)}%</span>
                                    </div>
                                </div>
                                <div class="att-dive-section">
                                    <h4>Percentiles de Tardanza</h4>
                                    <div class="att-percentile-visual">
                                        <div class="att-pct-bar">
                                            <div class="att-pct-marker" style="left: 25%"><span>P25</span><strong>${fmt(stats.attendance.lateMinutes?.percentiles?.p25)}</strong></div>
                                            <div class="att-pct-marker att-pct-median" style="left: 50%"><span>P50</span><strong>${fmt(stats.attendance.lateMinutes?.percentiles?.p50)}</strong></div>
                                            <div class="att-pct-marker" style="left: 75%"><span>P75</span><strong>${fmt(stats.attendance.lateMinutes?.percentiles?.p75)}</strong></div>
                                            <div class="att-pct-marker" style="left: 90%"><span>P90</span><strong>${fmt(stats.attendance.lateMinutes?.percentiles?.p90)}</strong></div>
                                        </div>
                                    </div>
                                </div>
                                ${stats.attendance.byWeekday ? `
                                <div class="att-dive-section">
                                    <h4>Por Dia de Semana</h4>
                                    <div class="att-weekday-grid">
                                        ${stats.attendance.byWeekday.map(d => `
                                            <div class="att-weekday-item">
                                                <span class="att-wd-name">${d.dayName?.substring(0,3)}</span>
                                                <div class="att-wd-bar">
                                                    <div class="att-wd-fill" style="height: ${Math.min(100, d.lateRate * 5)}%"></div>
                                                </div>
                                                <span class="att-wd-rate">${pct(d.lateRate)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            ` : '<p>Sin datos de asistencia</p>'}
                        </div>
                    </div>

                    <!-- Medical Deep Dive Panel -->
                    <div class="att-dive-panel att-dive-medical" id="dive-medical" style="display: none;">
                        <div class="att-dive-header">
                            <h3>🏥 Analisis de Salud Laboral</h3>
                            <button class="att-dive-close" onclick="AttendanceEngine.closeDive('medical')">✕</button>
                        </div>
                        <div class="att-dive-content">
                            ${stats.medical?.available ? `
                                <div class="att-dive-grid">
                                    <div class="att-dive-stat att-dive-big">
                                        <span class="att-dive-value">${stats.medical.totalDaysLost || 0}</span>
                                        <span class="att-dive-label">Dias Totales Perdidos</span>
                                    </div>
                                    <div class="att-dive-stat">
                                        <span class="att-dive-value">${stats.medical.sampleSize || 0}</span>
                                        <span class="att-dive-label">Certificados</span>
                                    </div>
                                    <div class="att-dive-stat">
                                        <span class="att-dive-value">${fmt(stats.medical.averageDaysPerCertificate?.trimmed)}</span>
                                        <span class="att-dive-label">Dias Promedio</span>
                                    </div>
                                </div>
                                ${stats.medical.byCategory?.length > 0 ? `
                                <div class="att-dive-section">
                                    <h4>Por Categoria Diagnostica (CIE-10)</h4>
                                    <div class="att-category-list">
                                        ${stats.medical.byCategory.slice(0, 8).map(cat => `
                                            <div class="att-cat-item">
                                                <span class="att-cat-name">${cat.category}</span>
                                                <span class="att-cat-count">${cat.count} casos</span>
                                                <span class="att-cat-days">${cat.totalDays} dias</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                                ${stats.medical.frequentAbsentees?.length > 0 ? `
                                <div class="att-dive-section att-dive-warning">
                                    <h4>⚠️ Empleados con Alta Frecuencia</h4>
                                    <div class="att-freq-list">
                                        ${stats.medical.frequentAbsentees.slice(0, 5).map(emp => `
                                            <div class="att-freq-item">
                                                <span class="att-freq-name">${emp.name}</span>
                                                <span class="att-freq-count">${emp.count} certificados</span>
                                                <span class="att-freq-days">${emp.totalDays} dias</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            ` : '<p class="att-no-data">Sin datos medicos disponibles</p>'}
                        </div>
                    </div>

                    <!-- Emotional Deep Dive Panel -->
                    <div class="att-dive-panel att-dive-emotional" id="dive-emotional" style="display: none;">
                        <div class="att-dive-header">
                            <h3>🧠 Bienestar y Biometria</h3>
                            <button class="att-dive-close" onclick="AttendanceEngine.closeDive('emotional')">✕</button>
                        </div>
                        <div class="att-dive-content">
                            ${stats.emotional?.available ? `
                                <div class="att-tech-badge-row">
                                    <span class="att-tech-badge-sm">Azure Face API</span>
                                    <span class="att-tech-badge-sm">TensorFlow</span>
                                    <span class="att-tech-badge-sm">MediaPipe</span>
                                </div>
                                <div class="att-dive-grid">
                                    <div class="att-dive-stat att-stat-fatigue">
                                        <span class="att-dive-label">Fatiga Promedio</span>
                                        ${progressRing((stats.emotional.fatigue?.trimmedMean || 0) * 100, 70, 8, '#f59e0b')}
                                        <span class="att-dive-note">${pct(stats.emotional.fatigue?.highFatigueRate)} alta fatiga</span>
                                    </div>
                                    <div class="att-dive-stat att-stat-stress">
                                        <span class="att-dive-label">Estres Promedio</span>
                                        ${progressRing((stats.emotional.stress?.trimmedMean || 0) * 100, 70, 8, '#ef4444')}
                                        <span class="att-dive-note">${pct(stats.emotional.stress?.highStressRate)} alto estres</span>
                                    </div>
                                </div>
                                ${stats.emotional.dominantEmotions?.length > 0 ? `
                                <div class="att-dive-section">
                                    <h4>Emociones Dominantes</h4>
                                    <div class="att-emotions-grid">
                                        ${stats.emotional.dominantEmotions.map(e => `
                                            <div class="att-emotion-card">
                                                <span class="att-emotion-icon">${emotionIcons[e.emotion?.toLowerCase()] || '🎭'}</span>
                                                <span class="att-emotion-name">${e.emotion}</span>
                                                <span class="att-emotion-pct">${pct(e.percentage)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            ` : '<p class="att-no-data">Sin datos biometricos. Requiere Azure Face API activo.</p>'}
                        </div>
                    </div>

                    <!-- Shifts Deep Dive Panel -->
                    <div class="att-dive-panel att-dive-shifts" id="dive-shifts" style="display: none;">
                        <div class="att-dive-header">
                            <h3>⏰ Analisis por Turno</h3>
                            <button class="att-dive-close" onclick="AttendanceEngine.closeDive('shifts')">✕</button>
                        </div>
                        <div class="att-dive-content">
                            ${stats.shifts?.available ? `
                                <div class="att-shifts-compare">
                                    <div class="att-shift-card att-shift-morning">
                                        <span class="att-shift-icon">${shiftIcons.morning}</span>
                                        <h4>Mañana</h4>
                                        <span class="att-shift-time">05:00 - 12:00</span>
                                        <div class="att-shift-stats">
                                            <span>${stats.shifts.byType?.morning?.records || 0} fichajes</span>
                                            <span>${pct(stats.shifts.byType?.morning?.lateRate)} tardanzas</span>
                                        </div>
                                    </div>
                                    <div class="att-shift-card att-shift-afternoon">
                                        <span class="att-shift-icon">${shiftIcons.afternoon}</span>
                                        <h4>Tarde</h4>
                                        <span class="att-shift-time">12:00 - 18:00</span>
                                        <div class="att-shift-stats">
                                            <span>${stats.shifts.byType?.afternoon?.records || 0} fichajes</span>
                                            <span>${pct(stats.shifts.byType?.afternoon?.lateRate)} tardanzas</span>
                                        </div>
                                    </div>
                                    <div class="att-shift-card att-shift-night">
                                        <span class="att-shift-icon">${shiftIcons.night}</span>
                                        <h4>Noche</h4>
                                        <span class="att-shift-time">18:00 - 05:00</span>
                                        <div class="att-shift-stats">
                                            <span>${stats.shifts.byType?.night?.records || 0} fichajes</span>
                                            <span>${pct(stats.shifts.byType?.night?.lateRate)} tardanzas</span>
                                        </div>
                                    </div>
                                </div>
                            ` : '<p class="att-no-data">Sin turnos configurados</p>'}
                        </div>
                    </div>

                    <!-- Weather Deep Dive Panel -->
                    <div class="att-dive-panel att-dive-weather" id="dive-weather" style="display: none;">
                        <div class="att-dive-header">
                            <h3>🌦️ Correlaciones Climaticas</h3>
                            <button class="att-dive-close" onclick="AttendanceEngine.closeDive('weather')">✕</button>
                        </div>
                        <div class="att-dive-content">
                            ${stats.weather?.available ? `
                                <div class="att-weather-grid">
                                    ${(stats.weather.byCondition || []).map(w => `
                                        <div class="att-weather-card">
                                            <span class="att-weather-icon-lg">${weatherIcons[w.condition?.toLowerCase()] || '🌡️'}</span>
                                            <span class="att-weather-name">${w.condition}</span>
                                            <span class="att-weather-pct">${pct(w.percentage)}</span>
                                            <span class="att-weather-temp">${fmt(w.avgTemperature)}°C</span>
                                        </div>
                                    `).join('')}
                                </div>
                                <p class="att-dive-note">Correlacionar con tardanzas para detectar impacto del clima</p>
                            ` : '<p class="att-no-data">Sin datos climaticos. Requiere weatherConditions en fichajes.</p>'}
                        </div>
                    </div>

                    <!-- Predictions Deep Dive Panel -->
                    <div class="att-dive-panel att-dive-predictions" id="dive-predictions" style="display: none;">
                        <div class="att-dive-header">
                            <h3>🔮 Tendencias Predictivas</h3>
                            <button class="att-dive-close" onclick="AttendanceEngine.closeDive('predictions')">✕</button>
                        </div>
                        <div class="att-dive-content">
                            ${stats.predictions ? `
                                <div class="att-prediction-main">
                                    <span class="att-pred-trend ${stats.predictions.attendance?.trend === 'improving' ? 'att-trend-good' : 'att-trend-bad'}">
                                        ${stats.predictions.attendance?.trend === 'improving' ? '📈 Mejorando' : '📉 Empeorando'}
                                    </span>
                                    <p>${stats.predictions.attendance?.description || 'Analizando patrones...'}</p>
                                </div>
                                <div class="att-pred-method">
                                    <h4>Metodologia</h4>
                                    <p>Regresion lineal sobre serie temporal de 90 dias</p>
                                    <p>Pendiente (slope): ${fmt(stats.predictions.attendance?.slope, 4)}</p>
                                    <p>R²: ${fmt(stats.predictions.attendance?.r2, 3)}</p>
                                </div>
                            ` : '<p class="att-no-data">Calculando predicciones...</p>'}
                        </div>
                    </div>

                    <!-- Hours Worked Deep Dive Panel -->
                    <div class="att-dive-panel att-dive-hours" id="dive-hours" style="display: none;">
                        <div class="att-dive-header">
                            <h3>⏱️ Analisis Detallado de Horas Trabajadas</h3>
                            <button class="att-dive-close" onclick="AttendanceEngine.closeDive('hours')">✕</button>
                        </div>
                        <div class="att-dive-content">
                            ${hoursStats?.summary ? `
                                <div class="att-hours-dive-summary">
                                    <div class="att-dive-grid att-dive-grid-4">
                                        <div class="att-dive-stat att-stat-total">
                                            <span class="att-dive-value">${fmt(hoursStats.summary.totalHours)}h</span>
                                            <span class="att-dive-label">Total Trabajadas</span>
                                            <span class="att-dive-note">${hoursStats.summary.totalRecords} registros</span>
                                        </div>
                                        <div class="att-dive-stat att-stat-normal">
                                            <span class="att-dive-value">${fmt(hoursStats.summary.normalHours)}h</span>
                                            <span class="att-dive-label">Horas Normales</span>
                                            <span class="att-dive-note">x1.0 multiplicador</span>
                                        </div>
                                        <div class="att-dive-stat att-stat-overtime">
                                            <span class="att-dive-value">${fmt(hoursStats.summary.overtimeHours)}h</span>
                                            <span class="att-dive-label">Horas Extras</span>
                                            <span class="att-dive-note">x1.5 multiplicador</span>
                                        </div>
                                        <div class="att-dive-stat att-stat-avg">
                                            <span class="att-dive-value">${fmt(hoursStats.summary.averageHoursPerDay)}h</span>
                                            <span class="att-dive-label">Promedio/Dia</span>
                                            <span class="att-dive-note">vs 8h esperado</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="att-hours-by-daytype">
                                    <h4>📅 Desglose por Tipo de Dia</h4>
                                    <div class="att-daytype-grid">
                                        <div class="att-daytype-card att-daytype-normal">
                                            <span class="att-daytype-icon">🗓️</span>
                                            <span class="att-daytype-label">Dias Normales</span>
                                            <span class="att-daytype-count">${hoursStats.summary.byDayType?.normal?.count || 0} dias</span>
                                            <span class="att-daytype-hours">${fmt(hoursStats.summary.byDayType?.normal?.hours || 0)}h</span>
                                        </div>
                                        <div class="att-daytype-card att-daytype-weekend">
                                            <span class="att-daytype-icon">🌴</span>
                                            <span class="att-daytype-label">Fines de Semana</span>
                                            <span class="att-daytype-count">${hoursStats.summary.byDayType?.weekend?.count || 0} dias</span>
                                            <span class="att-daytype-hours">${fmt(hoursStats.summary.byDayType?.weekend?.hours || 0)}h (x1.5)</span>
                                        </div>
                                        <div class="att-daytype-card att-daytype-holiday">
                                            <span class="att-daytype-icon">🎉</span>
                                            <span class="att-daytype-label">Feriados</span>
                                            <span class="att-daytype-count">${hoursStats.summary.byDayType?.holiday?.count || 0} dias</span>
                                            <span class="att-daytype-hours">${fmt(hoursStats.summary.byDayType?.holiday?.hours || 0)}h (x2.0)</span>
                                        </div>
                                    </div>
                                </div>

                                ${hoursStats.grouped && hoursStats.grouped.length > 0 ? `
                                <div class="att-hours-by-shift">
                                    <h4>⏰ Horas por Turno</h4>
                                    <div class="att-shift-hours-grid">
                                        ${hoursStats.grouped.map(s => `
                                            <div class="att-shift-hours-card">
                                                <div class="att-shift-hours-header">
                                                    <span class="att-shift-name">${s.shiftName || 'Sin turno'}</span>
                                                    <span class="att-shift-employees">${s.employeeCount} empleados</span>
                                                </div>
                                                <div class="att-shift-hours-body">
                                                    <div class="att-shift-hour-row">
                                                        <span>Horas Normales</span>
                                                        <strong>${fmt(s.normalHours)}h</strong>
                                                    </div>
                                                    <div class="att-shift-hour-row">
                                                        <span>Horas Extra</span>
                                                        <strong class="att-overtime-val">${fmt(s.overtimeHours)}h</strong>
                                                    </div>
                                                    <div class="att-shift-hour-row att-total-row">
                                                        <span>Total</span>
                                                        <strong>${fmt(s.totalHours)}h</strong>
                                                    </div>
                                                </div>
                                                <div class="att-shift-hours-footer">
                                                    ${s.days} dias trabajados
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                ` : ''}

                                ${hoursStats.byUser && hoursStats.byUser.length > 0 ? `
                                <div class="att-hours-by-user">
                                    <h4>👥 Top Empleados por Horas Extra</h4>
                                    <table class="att-hours-table">
                                        <thead>
                                            <tr>
                                                <th>Empleado</th>
                                                <th>Legajo</th>
                                                <th>Dias</th>
                                                <th>Normal</th>
                                                <th>Extra</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${hoursStats.byUser
                                                .sort((a, b) => b.overtimeHours - a.overtimeHours)
                                                .slice(0, 10)
                                                .map(u => `
                                                    <tr>
                                                        <td>${u.userName || 'N/A'}</td>
                                                        <td><code>${u.legajo || '-'}</code></td>
                                                        <td>${u.days}</td>
                                                        <td>${fmt(u.normalHours)}h</td>
                                                        <td class="att-overtime-val"><strong>${fmt(u.overtimeHours)}h</strong></td>
                                                        <td><strong>${fmt(u.totalHours)}h</strong></td>
                                                    </tr>
                                                `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                ` : ''}

                                <div class="att-hours-method">
                                    <h4>📐 Metodologia de Calculo</h4>
                                    <p><strong>OvertimeCalculatorService</strong> procesa cada asistencia:</p>
                                    <ul>
                                        <li>Horas Normales: dentro del horario del turno asignado</li>
                                        <li>Horas Extra: excedente sobre jornada (multiplicador x1.5)</li>
                                        <li>Fin de Semana: multiplicador x1.5 configurable por turno</li>
                                        <li>Feriados: multiplicador x2.0 (tabla holidays)</li>
                                        <li>Descansos: se descuentan automaticamente</li>
                                    </ul>
                                </div>
                            ` : '<p class="att-no-data">No hay datos de horas para el periodo seleccionado</p>'}
                        </div>
                    </div>
                </section>

                <!-- ============================================================ -->
                <!-- WEATHER IMPACT ANALYSIS - Gráficos Comparativos -->
                <!-- ============================================================ -->
                ${weatherStats ? `
                <section class="att-play-section att-weather-section">
                    <div class="att-section-header">
                        <div class="att-section-icon">🌤️</div>
                        <div class="att-section-title">
                            <h2>Impacto Climatico en Tardanzas</h2>
                            <span class="att-section-badge">Grafico Comparativo</span>
                        </div>
                    </div>
                    <div class="att-section-body">
                        <!-- Gráfico de Barras Comparativo -->
                        <div class="att-weather-chart-container">
                            <div class="att-weather-bars">
                                ${Object.entries(weatherStats.byPattern)
                                    .filter(([k, v]) => v.total > 0)
                                    .sort((a, b) => b[1].latePercent - a[1].latePercent)
                                    .map(([pattern, data]) => {
                                        const icons = {
                                            'FAVORABLE': '☀️',
                                            'ADVERSO_LLUVIA': '🌧️',
                                            'ADVERSO_FRIO': '❄️',
                                            'NOCTURNO': '🌙',
                                            'UNKNOWN': '❓'
                                        };
                                        const colors = {
                                            'FAVORABLE': '#22c55e',
                                            'ADVERSO_LLUVIA': '#3b82f6',
                                            'ADVERSO_FRIO': '#8b5cf6',
                                            'NOCTURNO': '#6366f1',
                                            'UNKNOWN': '#9ca3af'
                                        };
                                        const basePercent = weatherStats.byPattern.FAVORABLE?.latePercent || 0;
                                        const diff = data.latePercent - basePercent;
                                        const diffClass = diff > 0 ? 'att-diff-up' : (diff < 0 ? 'att-diff-down' : '');
                                        const barHeight = Math.min(100, (data.latePercent / 25) * 100); // Max 25% = 100% height
                                        return `
                                            <div class="att-weather-bar-group">
                                                <div class="att-weather-bar" style="height: ${barHeight}%; background: ${colors[pattern] || '#6366f1'}">
                                                    <span class="att-bar-value">${data.latePercent.toLocaleString('es-AR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%</span>
                                                </div>
                                                <div class="att-weather-bar-label">
                                                    <span class="att-bar-icon">${icons[pattern] || '🌡️'}</span>
                                                    <span class="att-bar-name">${pattern.replace('ADVERSO_', '').replace('_', ' ')}</span>
                                                    <span class="att-bar-count">${data.total.toLocaleString('es-AR')} reg.</span>
                                                    ${pattern !== 'FAVORABLE' && diff !== 0 ? `
                                                        <span class="att-bar-diff ${diffClass}">${diff > 0 ? '+' : ''}${diff.toLocaleString('es-AR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} pp</span>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                            </div>

                            <!-- Línea de Referencia FAVORABLE -->
                            <div class="att-weather-baseline" style="bottom: ${Math.min(100, ((weatherStats.byPattern.FAVORABLE?.latePercent || 0) / 25) * 100)}%">
                                <span class="att-baseline-label">Base: ${(weatherStats.byPattern.FAVORABLE?.latePercent || 0).toLocaleString('es-AR', {minimumFractionDigits: 1})}%</span>
                            </div>
                        </div>

                        <!-- Insight Card -->
                        <div class="att-weather-insight">
                            <div class="att-insight-icon">💡</div>
                            <div class="att-insight-content">
                                <h4>Analisis Automatico</h4>
                                <p>${weatherStats.insights?.recommendation || 'Sin recomendaciones disponibles.'}</p>
                                ${weatherStats.insights?.mostImpactful?.increasePercent ? `
                                    <div class="att-insight-stats">
                                        <span class="att-insight-stat">
                                            <strong>${weatherStats.insights.mostImpactful.pattern.replace('ADVERSO_', '').replace('_', ' ')}</strong>
                                            aumenta tardanzas en <strong class="att-highlight-red">+${weatherStats.insights.mostImpactful.increasePercent}%</strong>
                                        </span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Tabla Detallada -->
                        <div class="att-weather-details">
                            <h4>📊 Detalle por Patron Climatico</h4>
                            <table class="att-weather-table">
                                <thead>
                                    <tr>
                                        <th>Patron</th>
                                        <th>Registros</th>
                                        <th>Tardanzas</th>
                                        <th>% Tardanza</th>
                                        <th>Prom. Min Tarde</th>
                                        <th>Δ vs Favorable</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(weatherStats.byPattern)
                                        .filter(([k, v]) => v.total > 0)
                                        .map(([pattern, data]) => {
                                            const basePercent = weatherStats.byPattern.FAVORABLE?.latePercent || 0;
                                            const diff = data.latePercent - basePercent;
                                            const diffClass = diff > 0 ? 'att-cell-up' : (diff < 0 ? 'att-cell-down' : 'att-cell-neutral');
                                            return `
                                                <tr>
                                                    <td><strong>${pattern.replace('ADVERSO_', '').replace('_', ' ')}</strong></td>
                                                    <td>${data.total.toLocaleString('es-AR')}</td>
                                                    <td>${data.lateCount.toLocaleString('es-AR')}</td>
                                                    <td><strong>${data.latePercent.toLocaleString('es-AR', {minimumFractionDigits: 1})}%</strong></td>
                                                    <td>${data.avgLateMinutes.toLocaleString('es-AR', {minimumFractionDigits: 1})} min</td>
                                                    <td class="${diffClass}">
                                                        ${pattern === 'FAVORABLE' ? '--' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('es-AR', {minimumFractionDigits: 1})} pp`}
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
                ` : ''}

                <!-- ============================================================ -->
                <!-- YEAR-OVER-YEAR COMPARISON -->
                <!-- ============================================================ -->
                ${yearComparison ? `
                <section class="att-play-section att-year-comparison-section">
                    <div class="att-section-header">
                        <div class="att-section-icon">📅</div>
                        <h3>Comparacion Interanual</h3>
                        <span class="att-section-badge">vs Mismo Periodo Ano Anterior</span>
                    </div>
                    <div class="att-section-body">
                        ${yearComparison.hasHistoricalData ? `
                        <!-- Tarjetas de Comparación -->
                        <div class="att-yoy-cards">
                            <div class="att-yoy-card">
                                <div class="att-yoy-label">Tasa de Asistencia</div>
                                <div class="att-yoy-values">
                                    <span class="att-yoy-current">${yearComparison.current.attendanceRate.toLocaleString('es-AR', {minimumFractionDigits: 1})}%</span>
                                    <span class="att-yoy-arrow ${yearComparison.variations.attendanceRate.absolute >= 0 ? 'att-arrow-up' : 'att-arrow-down'}">
                                        ${yearComparison.variations.attendanceRate.absolute >= 0 ? '↑' : '↓'}
                                    </span>
                                    <span class="att-yoy-previous">${yearComparison.previous.attendanceRate.toLocaleString('es-AR', {minimumFractionDigits: 1})}%</span>
                                </div>
                                <div class="att-yoy-diff ${yearComparison.variations.attendanceRate.absolute >= 0 ? 'att-diff-positive' : 'att-diff-negative'}">
                                    ${yearComparison.variations.attendanceRate.absolute >= 0 ? '+' : ''}${yearComparison.variations.attendanceRate.absolute.toLocaleString('es-AR', {minimumFractionDigits: 1})} pp
                                </div>
                            </div>
                            <div class="att-yoy-card">
                                <div class="att-yoy-label">Tasa de Tardanzas</div>
                                <div class="att-yoy-values">
                                    <span class="att-yoy-current">${yearComparison.current.lateRate.toLocaleString('es-AR', {minimumFractionDigits: 1})}%</span>
                                    <span class="att-yoy-arrow ${yearComparison.variations.lateRate.absolute >= 0 ? 'att-arrow-up' : 'att-arrow-down'}">
                                        ${yearComparison.variations.lateRate.absolute >= 0 ? '↓' : '↑'}
                                    </span>
                                    <span class="att-yoy-previous">${yearComparison.previous.lateRate.toLocaleString('es-AR', {minimumFractionDigits: 1})}%</span>
                                </div>
                                <div class="att-yoy-diff ${yearComparison.variations.lateRate.absolute >= 0 ? 'att-diff-positive' : 'att-diff-negative'}">
                                    ${yearComparison.variations.lateRate.absolute >= 0 ? '' : '+'}${(-yearComparison.variations.lateRate.absolute).toLocaleString('es-AR', {minimumFractionDigits: 1})} pp
                                </div>
                            </div>
                            <div class="att-yoy-card">
                                <div class="att-yoy-label">Prom. Minutos Tarde</div>
                                <div class="att-yoy-values">
                                    <span class="att-yoy-current">${yearComparison.current.avgLateMinutes.toLocaleString('es-AR', {minimumFractionDigits: 1})}</span>
                                    <span class="att-yoy-arrow ${yearComparison.variations.avgLateMinutes.absolute >= 0 ? 'att-arrow-up' : 'att-arrow-down'}">
                                        ${yearComparison.variations.avgLateMinutes.absolute >= 0 ? '↓' : '↑'}
                                    </span>
                                    <span class="att-yoy-previous">${yearComparison.previous.avgLateMinutes.toLocaleString('es-AR', {minimumFractionDigits: 1})}</span>
                                </div>
                                <div class="att-yoy-diff ${yearComparison.variations.avgLateMinutes.absolute >= 0 ? 'att-diff-positive' : 'att-diff-negative'}">
                                    ${yearComparison.variations.avgLateMinutes.absolute >= 0 ? '-' : '+'}${Math.abs(yearComparison.variations.avgLateMinutes.absolute).toLocaleString('es-AR', {minimumFractionDigits: 1})} min
                                </div>
                            </div>
                            <div class="att-yoy-card">
                                <div class="att-yoy-label">Empleados Activos</div>
                                <div class="att-yoy-values">
                                    <span class="att-yoy-current">${yearComparison.current.employees.toLocaleString('es-AR')}</span>
                                    <span class="att-yoy-arrow ${yearComparison.variations.employeeGrowth.absolute >= 0 ? 'att-arrow-up' : 'att-arrow-down'}">
                                        ${yearComparison.variations.employeeGrowth.absolute >= 0 ? '↑' : '↓'}
                                    </span>
                                    <span class="att-yoy-previous">${yearComparison.previous.employees.toLocaleString('es-AR')}</span>
                                </div>
                                <div class="att-yoy-diff att-diff-neutral">
                                    ${yearComparison.variations.employeeGrowth.absolute >= 0 ? '+' : ''}${yearComparison.variations.employeeGrowth.absolute.toLocaleString('es-AR')} (${yearComparison.variations.employeeGrowth.relative.toLocaleString('es-AR', {minimumFractionDigits: 0})}%)
                                </div>
                            </div>
                        </div>

                        <!-- Insights Automáticos -->
                        ${yearComparison.insights?.length > 0 ? `
                        <div class="att-yoy-insights">
                            ${yearComparison.insights.map(insight => `
                                <div class="att-yoy-insight att-insight-${insight.type}">
                                    <span class="att-insight-emoji">${insight.type === 'positive' ? '✅' : insight.type === 'negative' ? '⚠️' : 'ℹ️'}</span>
                                    <span>${insight.message}</span>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}

                        <!-- Nota sobre ponderación -->
                        ${yearComparison.employeeRatio !== 1 ? `
                        <div class="att-yoy-note">
                            <small>
                                📊 <strong>Nota:</strong> El personal ${yearComparison.employeeRatio > 1 ? 'creció' : 'decreció'} ${Math.abs((yearComparison.employeeRatio - 1) * 100).toFixed(0)}%.
                                Las métricas porcentuales son comparables independientemente del tamaño de la plantilla.
                            </small>
                        </div>
                        ` : ''}
                        ` : `
                        <div class="att-yoy-no-data">
                            <span class="att-no-data-icon">📅</span>
                            <p>No hay datos del mismo periodo del ano anterior para comparar.</p>
                            <small>Periodo buscado: ${yearComparison.previous?.period?.start || 'N/A'} a ${yearComparison.previous?.period?.end || 'N/A'}</small>
                        </div>
                        `}
                    </div>
                </section>
                ` : ''}

                <!-- ============================================================ -->
                <!-- METHODOLOGY FOOTER -->
                <!-- ============================================================ -->
                <footer class="att-play-footer">
                    <div class="att-method-summary">
                        <h4>Metodologia Cientifica Aplicada</h4>
                        <div class="att-method-pills">
                            <span class="att-mpill" title="Media acotada: elimina 10% valores extremos">σ Trimmed Mean</span>
                            <span class="att-mpill" title="Interquartile Range para detectar outliers">📦 IQR Outliers</span>
                            <span class="att-mpill" title="Zonificacion por latitud GPS">🌍 Climate Zones</span>
                            <span class="att-mpill" title="Regresion lineal para tendencias">📈 Linear Regression</span>
                            <span class="att-mpill" title="Clasificacion CIE-10 estandar">🏥 CIE-10</span>
                            <span class="att-mpill" title="Azure Face API para emociones">🧠 Azure Face AI</span>
                        </div>
                    </div>
                    <div class="att-engine-info">
                        <span>AttendanceAdvancedStatsService v2.0</span>
                        <span>Node.js + PostgreSQL</span>
                        <span>${stats?.attendance?.sampleSize?.toLocaleString() || 0} registros analizados</span>
                    </div>
                </footer>

                ` : `
                <!-- NO DATA STATE -->
                <div class="att-play-empty">
                    <div class="att-empty-visual">
                        <div class="att-empty-icon-wrapper">
                            <span>📊</span>
                            <div class="att-empty-pulse"></div>
                        </div>
                    </div>
                    <h2>Sin Datos para Analizar</h2>
                    <p>No hay suficientes registros de asistencia en el periodo seleccionado.</p>
                    <p class="att-empty-hint">Seleccione un rango de fechas mas amplio o verifique que existan fichajes.</p>
                    <button class="att-btn att-btn-primary att-btn-glow" onclick="AttendanceEngine.showView('dashboard')">
                        ← Volver al Dashboard
                    </button>
                </div>
                `}
            </div>
        `;

        // Inject playground styles
        this.injectPlaygroundStyles();
    },

    expandZone(zone) {
        const panel = document.getElementById(`dive-${zone}`);
        if (panel) {
            document.querySelectorAll('.att-dive-panel').forEach(p => p.style.display = 'none');
            panel.style.display = 'block';
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    closeDive(zone) {
        const panel = document.getElementById(`dive-${zone}`);
        if (panel) {
            panel.style.display = 'none';
        }
    },

    injectPlaygroundStyles() {
        if (document.getElementById('att-playground-styles')) return;
        const style = document.createElement('style');
        style.id = 'att-playground-styles';
        style.textContent = `
            /* ============================================ */
            /* PLAYGROUND - Toy Store for HR Managers      */
            /* ============================================ */

            .att-playground { padding: 20px; max-width: 1400px; margin: 0 auto; }

            /* Loading Animation */
            .att-loading-fancy { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; gap: 20px; }
            .att-loading-orb { width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50%; animation: att-pulse 1.5s ease-in-out infinite; }
            .att-loading-rings { position: absolute; display: flex; align-items: center; justify-content: center; }
            .att-ring { position: absolute; border: 2px solid transparent; border-radius: 50%; }
            .att-ring-1 { width: 80px; height: 80px; border-top-color: #6366f1; animation: att-spin 1s linear infinite; }
            .att-ring-2 { width: 100px; height: 100px; border-right-color: #8b5cf6; animation: att-spin 1.5s linear infinite reverse; }
            .att-ring-3 { width: 120px; height: 120px; border-bottom-color: #a78bfa; animation: att-spin 2s linear infinite; }
            .att-loading-text { color: #818cf8; font-size: 1.1em; margin-top: 40px; }
            .att-loading-badges { display: flex; gap: 8px; margin-top: 10px; }
            .att-tech-badge { background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 4px 10px; border-radius: 12px; font-size: 0.75em; }

            @keyframes att-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } }
            @keyframes att-spin { 100% { transform: rotate(360deg); } }

            /* Hero Header */
            .att-play-header { display: flex; justify-content: space-between; align-items: center; padding: 24px; background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%); border-radius: 16px; margin-bottom: 24px; flex-wrap: wrap; gap: 20px; }
            .att-hero-content { display: flex; align-items: center; gap: 20px; }
            .att-hero-icon { position: relative; font-size: 2.5em; }
            .att-hero-pulse { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(99,102,241,0.3); border-radius: 50%; animation: att-pulse 2s ease-in-out infinite; z-index: -1; }
            .att-hero-text h1 { margin: 0 0 4px 0; font-size: 1.5em; color: #e0e0e0; }
            .att-hero-text p { margin: 0; color: #888; font-size: 0.9em; }
            .att-tech-stack { display: flex; gap: 10px; flex-wrap: wrap; }
            .att-tech-chip { display: flex; align-items: center; gap: 6px; background: rgba(30,41,59,0.8); border: 1px solid rgba(99,102,241,0.3); padding: 6px 12px; border-radius: 20px; font-size: 0.8em; color: #a5b4fc; cursor: help; transition: all 0.2s; }
            .att-tech-chip:hover { background: rgba(99,102,241,0.2); border-color: #6366f1; transform: translateY(-2px); }
            .att-tech-chip i { font-style: normal; font-size: 1.1em; }

            /* Quick Scores */
            .att-quick-scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px; }
            .att-score-card { position: relative; background: rgba(30,41,59,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; overflow: hidden; transition: all 0.3s; }
            .att-score-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.4); }
            .att-score-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
            .att-score-card:hover .att-score-glow { opacity: 1; }
            .att-progress-ring { transform: rotate(-90deg); }
            .att-ring-progress { transition: stroke-dashoffset 1s ease-out; }
            .att-score-info { text-align: center; }
            .att-score-label { display: block; font-size: 0.85em; color: #a0a0a0; }
            .att-score-trend { display: inline-block; background: rgba(34,197,94,0.2); color: #4ade80; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; }
            .att-score-detail { display: block; font-size: 0.75em; color: #888; margin-top: 4px; }
            .att-score-big-number { text-align: center; }
            .att-big-num { display: block; font-size: 2.5em; font-weight: 700; color: #fff; }
            .att-big-label { display: block; font-size: 0.8em; color: #888; }

            /* Section Titles */
            .att-section-title { display: flex; align-items: center; gap: 10px; margin: 30px 0 16px 0; font-size: 1.2em; color: #e0e0e0; }
            .att-title-icon { font-size: 1.2em; }
            .att-title-badge { background: rgba(99,102,241,0.2); color: #818cf8; padding: 4px 10px; border-radius: 12px; font-size: 0.6em; font-weight: 500; }
            .att-section-subtitle { color: #888; font-size: 0.85em; margin: -10px 0 16px 0; }

            /* Exploration Zone Cards */
            .att-zone-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
            .att-zone-card { position: relative; background: rgba(30,41,59,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; cursor: pointer; transition: all 0.3s; }
            .att-zone-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
            .att-zone-bg { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); transition: height 0.3s; }
            .att-zone-card:hover .att-zone-bg { height: 100%; opacity: 0.1; }
            .att-zone-content { position: relative; padding: 20px; }
            .att-zone-icon { font-size: 2em; margin-bottom: 8px; }
            .att-zone-card h3 { margin: 0 0 4px 0; font-size: 1.1em; color: #e0e0e0; }
            .att-zone-card p { margin: 0 0 12px 0; font-size: 0.8em; color: #888; }
            .att-zone-preview { min-height: 40px; margin-bottom: 12px; }
            .att-zone-stats { display: flex; gap: 16px; font-size: 0.8em; color: #aaa; }
            .att-zone-stats strong { color: #fff; }
            .att-zone-na { color: #666; font-style: italic; font-size: 0.85em; }
            .att-zone-action { position: relative; padding: 12px 20px; background: rgba(99,102,241,0.1); display: flex; justify-content: space-between; align-items: center; font-size: 0.85em; color: #818cf8; }
            .att-zone-action i { transition: transform 0.2s; }
            .att-zone-card:hover .att-zone-action i { transform: translateX(4px); }

            /* Zone Specific Colors */
            .att-zone-attendance .att-zone-bg { background: linear-gradient(90deg, #22c55e 0%, #4ade80 100%); }
            .att-zone-medical .att-zone-bg { background: linear-gradient(90deg, #ef4444 0%, #f87171 100%); }
            .att-zone-emotional .att-zone-bg { background: linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%); }
            .att-zone-shifts .att-zone-bg { background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%); }
            .att-zone-weather .att-zone-bg { background: linear-gradient(90deg, #06b6d4 0%, #22d3ee 100%); }
            .att-zone-predictions .att-zone-bg { background: linear-gradient(90deg, #ec4899 0%, #f472b6 100%); }
            .att-zone-hours .att-zone-bg { background: linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%); }

            /* Hours Zone Preview */
            .att-hours-mini-grid { display: flex; gap: 8px; justify-content: center; }
            .att-hour-chip { padding: 6px 12px; border-radius: 8px; font-size: 0.85em; font-weight: 600; }
            .att-hour-chip.att-hour-normal { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
            .att-hour-chip.att-hour-extra { background: rgba(249, 115, 22, 0.2); color: #f97316; }

            /* Zone Preview Elements */
            .att-zone-metric { text-align: center; }
            .att-metric-big { display: block; font-size: 2em; font-weight: 700; color: #fff; }
            .att-metric-label { display: block; font-size: 0.75em; color: #888; }
            .att-sparkline { display: block; margin: 0 auto; }
            .att-emotion-faces, .att-shift-pills, .att-weather-chips { display: flex; gap: 6px; flex-wrap: wrap; }
            .att-emotion-chip, .att-weather-chip { background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 12px; font-size: 0.75em; }
            .att-shift-pill { padding: 4px 10px; border-radius: 12px; font-size: 0.75em; }
            .att-shift-morning { background: rgba(251,191,36,0.2); color: #fbbf24; }
            .att-shift-afternoon { background: rgba(249,115,22,0.2); color: #f97316; }
            .att-shift-night { background: rgba(99,102,241,0.2); color: #818cf8; }

            /* Climate Section */
            .att-climate-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
            .att-climate-card { background: var(--zone-bg); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; }
            .att-climate-header { display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(0,0,0,0.1); }
            .att-climate-icon { font-size: 2em; }
            .att-climate-title h4 { margin: 0; color: var(--zone-color); }
            .att-climate-desc { font-size: 0.75em; color: rgba(0,0,0,0.6); }
            .att-climate-body { padding: 16px; display: flex; gap: 16px; }
            .att-climate-kiosks { text-align: center; padding: 12px 16px; background: rgba(0,0,0,0.1); border-radius: 12px; }
            .att-kiosk-count { display: block; font-size: 2em; font-weight: 700; color: var(--zone-color); }
            .att-kiosk-label { font-size: 0.75em; color: rgba(0,0,0,0.6); }
            .att-climate-metrics { flex: 1; }
            .att-cm-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 0.85em; }
            .att-cm-row span { color: rgba(0,0,0,0.6); }
            .att-cm-row strong { color: rgba(0,0,0,0.8); }
            .att-climate-footer { padding: 12px 16px; background: rgba(0,0,0,0.05); font-size: 0.75em; color: rgba(0,0,0,0.5); }

            /* Deep Dive Panels */
            .att-dive-panel { background: rgba(30,41,59,0.95); border: 1px solid rgba(99,102,241,0.3); border-radius: 16px; margin: 20px 0; overflow: hidden; animation: att-slideDown 0.3s ease-out; }
            @keyframes att-slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            .att-dive-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: rgba(99,102,241,0.1); }
            .att-dive-header h3 { margin: 0; color: #e0e0e0; font-size: 1.1em; }
            .att-dive-close { background: none; border: none; color: #888; font-size: 1.2em; cursor: pointer; transition: color 0.2s; }
            .att-dive-close:hover { color: #fff; }
            .att-dive-content { padding: 20px; }
            .att-dive-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 20px; }
            .att-dive-stat { text-align: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; }
            .att-dive-stat.att-dive-highlight { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); }
            .att-dive-stat.att-dive-big { grid-column: span 2; }
            .att-dive-label { display: block; font-size: 0.8em; color: #888; margin-bottom: 8px; }
            .att-dive-value { display: block; font-size: 1.8em; font-weight: 600; color: #fff; }
            .att-dive-note { display: block; font-size: 0.75em; color: #666; margin-top: 4px; }
            .att-dive-section { margin-top: 20px; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; }
            .att-dive-section h4 { margin: 0 0 12px 0; color: #a0a0a0; font-size: 0.9em; }
            .att-dive-section.att-dive-warning { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); }

            /* Hours Deep Dive Styles */
            .att-dive-grid-4 { grid-template-columns: repeat(4, 1fr); }
            .att-stat-total .att-dive-value { color: #38bdf8; }
            .att-stat-normal .att-dive-value { color: #22c55e; }
            .att-stat-overtime .att-dive-value { color: #f97316; }
            .att-stat-avg .att-dive-value { color: #a78bfa; }

            .att-hours-by-daytype { margin-top: 24px; }
            .att-hours-by-daytype h4 { margin: 0 0 12px 0; color: #a0a0a0; }
            .att-daytype-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .att-daytype-card { padding: 16px; border-radius: 12px; text-align: center; }
            .att-daytype-normal { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); }
            .att-daytype-weekend { background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.3); }
            .att-daytype-holiday { background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.3); }
            .att-daytype-icon { font-size: 1.5em; display: block; margin-bottom: 8px; }
            .att-daytype-label { display: block; font-size: 0.85em; color: #e0e0e0; }
            .att-daytype-count { display: block; font-size: 0.75em; color: #888; margin-top: 4px; }
            .att-daytype-hours { display: block; font-size: 1.2em; font-weight: 600; color: #fff; margin-top: 8px; }

            .att-hours-by-shift { margin-top: 24px; }
            .att-hours-by-shift h4 { margin: 0 0 12px 0; color: #a0a0a0; }
            .att-shift-hours-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
            .att-shift-hours-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; }
            .att-shift-hours-header { padding: 12px 16px; background: rgba(99,102,241,0.1); display: flex; justify-content: space-between; align-items: center; }
            .att-shift-name { color: #e0e0e0; font-weight: 600; }
            .att-shift-employees { color: #888; font-size: 0.8em; }
            .att-shift-hours-body { padding: 12px 16px; }
            .att-shift-hour-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
            .att-shift-hour-row:last-child { border-bottom: none; }
            .att-shift-hour-row span { color: #888; }
            .att-shift-hour-row strong { color: #e0e0e0; }
            .att-shift-hour-row.att-total-row { background: rgba(99,102,241,0.1); margin: 8px -16px -12px; padding: 12px 16px; }
            .att-shift-hours-footer { padding: 8px 16px; background: rgba(0,0,0,0.2); text-align: center; color: #666; font-size: 0.8em; }
            .att-overtime-val { color: #f97316 !important; }

            .att-hours-by-user { margin-top: 24px; }
            .att-hours-by-user h4 { margin: 0 0 12px 0; color: #a0a0a0; }
            .att-hours-table { width: 100%; border-collapse: collapse; }
            .att-hours-table th { text-align: left; padding: 10px 12px; background: rgba(99,102,241,0.1); color: #a0a0a0; font-size: 0.85em; }
            .att-hours-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e0e0e0; }
            .att-hours-table tr:hover td { background: rgba(255,255,255,0.03); }

            .att-hours-method { margin-top: 24px; padding: 16px; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 12px; }
            .att-hours-method h4 { margin: 0 0 12px 0; color: #38bdf8; }
            .att-hours-method p { color: #a0a0a0; margin: 0 0 8px 0; }
            .att-hours-method ul { margin: 8px 0 0 0; padding-left: 20px; color: #888; }
            .att-hours-method li { margin: 4px 0; }

            /* Percentile Visual */
            .att-percentile-visual { padding: 20px 0; }
            .att-pct-bar { position: relative; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin: 30px 10px; }
            .att-pct-marker { position: absolute; transform: translateX(-50%); text-align: center; }
            .att-pct-marker span { display: block; font-size: 0.7em; color: #888; }
            .att-pct-marker strong { display: block; font-size: 0.9em; color: #fff; margin-top: 8px; }
            .att-pct-marker::before { content: ''; position: absolute; top: -25px; left: 50%; transform: translateX(-50%); width: 12px; height: 12px; background: #6366f1; border-radius: 50%; }
            .att-pct-median::before { background: #22c55e; width: 16px; height: 16px; }

            /* Weekday Grid */
            .att-weekday-grid { display: flex; justify-content: space-around; gap: 8px; }
            .att-weekday-item { text-align: center; flex: 1; }
            .att-wd-name { display: block; font-size: 0.75em; color: #888; margin-bottom: 8px; }
            .att-wd-bar { height: 60px; width: 100%; background: rgba(255,255,255,0.05); border-radius: 4px; position: relative; overflow: hidden; }
            .att-wd-fill { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, #6366f1, #818cf8); border-radius: 4px; transition: height 0.5s; }
            .att-wd-rate { display: block; font-size: 0.75em; color: #aaa; margin-top: 4px; }

            /* Category List */
            .att-category-list, .att-freq-list { display: flex; flex-direction: column; gap: 8px; }
            .att-cat-item, .att-freq-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; }
            .att-cat-name, .att-freq-name { flex: 1; color: #e0e0e0; font-size: 0.9em; }
            .att-cat-count, .att-freq-count { color: #818cf8; font-size: 0.85em; margin: 0 12px; }
            .att-cat-days, .att-freq-days { color: #f59e0b; font-size: 0.85em; }

            /* Tech Badge Row */
            .att-tech-badge-row { display: flex; gap: 8px; margin-bottom: 16px; justify-content: center; }
            .att-tech-badge-sm { background: rgba(139,92,246,0.2); color: #a78bfa; padding: 4px 10px; border-radius: 10px; font-size: 0.7em; }

            /* Emotions Grid */
            .att-emotions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; }
            .att-emotion-card { text-align: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; }
            .att-emotion-card .att-emotion-icon { font-size: 2em; display: block; margin-bottom: 8px; }
            .att-emotion-name { display: block; font-size: 0.8em; color: #aaa; margin-bottom: 4px; }
            .att-emotion-pct { display: block; font-size: 1.1em; font-weight: 600; color: #fff; }

            /* Shifts Compare */
            .att-shifts-compare { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .att-shift-card { text-align: center; padding: 20px; border-radius: 16px; }
            .att-shift-card.att-shift-morning { background: linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0.05) 100%); border: 1px solid rgba(251,191,36,0.3); }
            .att-shift-card.att-shift-afternoon { background: linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0.05) 100%); border: 1px solid rgba(249,115,22,0.3); }
            .att-shift-card.att-shift-night { background: linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%); border: 1px solid rgba(99,102,241,0.3); }
            .att-shift-card .att-shift-icon { font-size: 2.5em; display: block; margin-bottom: 8px; }
            .att-shift-card h4 { margin: 0 0 4px 0; color: #e0e0e0; }
            .att-shift-time { font-size: 0.75em; color: #888; }
            .att-shift-stats { margin-top: 12px; font-size: 0.85em; color: #aaa; }
            .att-shift-stats span { display: block; margin: 4px 0; }

            /* Weather Grid */
            .att-weather-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
            .att-weather-card { text-align: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 12px; }
            .att-weather-icon-lg { font-size: 2.5em; display: block; margin-bottom: 8px; }
            .att-weather-name { display: block; font-size: 0.85em; color: #aaa; margin-bottom: 4px; }
            .att-weather-pct { display: block; font-size: 1.2em; font-weight: 600; color: #fff; }
            .att-weather-temp { display: block; font-size: 0.8em; color: #06b6d4; margin-top: 4px; }

            /* Weather Impact Chart Section */
            .att-weather-section { background: linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(99,102,241,0.05) 100%); border: 1px solid rgba(99,102,241,0.2); }
            .att-weather-chart-container { position: relative; padding: 40px 20px 20px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 20px; }
            .att-weather-bars { display: flex; justify-content: space-around; align-items: flex-end; height: 200px; gap: 20px; }
            .att-weather-bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 120px; }
            .att-weather-bar { width: 60px; border-radius: 8px 8px 0 0; display: flex; align-items: flex-start; justify-content: center; min-height: 20px; transition: height 0.5s ease; }
            .att-bar-value { color: #fff; font-weight: 700; font-size: 0.9em; padding-top: 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
            .att-weather-bar-label { text-align: center; margin-top: 12px; }
            .att-bar-icon { font-size: 1.8em; display: block; margin-bottom: 4px; }
            .att-bar-name { display: block; font-size: 0.85em; color: #e0e0e0; font-weight: 600; }
            .att-bar-count { display: block; font-size: 0.7em; color: #888; margin-top: 2px; }
            .att-bar-diff { display: block; font-size: 0.75em; font-weight: 600; margin-top: 4px; padding: 2px 6px; border-radius: 4px; }
            .att-diff-up { background: rgba(239,68,68,0.2); color: #f87171; }
            .att-diff-down { background: rgba(34,197,94,0.2); color: #4ade80; }
            .att-weather-baseline { position: absolute; left: 20px; right: 20px; border-top: 2px dashed rgba(34,197,94,0.5); }
            .att-baseline-label { position: absolute; left: 0; top: -20px; font-size: 0.7em; color: #22c55e; background: rgba(0,0,0,0.8); padding: 2px 6px; border-radius: 4px; }

            /* Weather Insight Card */
            .att-weather-insight { display: flex; gap: 16px; padding: 20px; background: linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.02) 100%); border: 1px solid rgba(251,191,36,0.3); border-radius: 12px; margin-bottom: 20px; }
            .att-insight-icon { font-size: 2.5em; }
            .att-insight-content h4 { margin: 0 0 8px 0; color: #fbbf24; }
            .att-insight-content p { margin: 0; color: #e0e0e0; line-height: 1.6; }
            .att-insight-stats { margin-top: 12px; }
            .att-insight-stat { color: #a0a0a0; }
            .att-highlight-red { color: #f87171; }

            /* Weather Details Table */
            .att-weather-details { margin-top: 20px; }
            .att-weather-details h4 { margin: 0 0 12px 0; color: #a0a0a0; }
            .att-weather-table { width: 100%; border-collapse: collapse; background: rgba(0,0,0,0.2); border-radius: 12px; overflow: hidden; }
            .att-weather-table th { text-align: left; padding: 12px 16px; background: rgba(99,102,241,0.15); color: #a0a0a0; font-size: 0.85em; font-weight: 600; }
            .att-weather-table td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e0e0e0; }
            .att-weather-table tr:hover td { background: rgba(255,255,255,0.03); }
            .att-weather-table tr:last-child td { border-bottom: none; }
            .att-cell-up { color: #f87171; font-weight: 600; }
            .att-cell-down { color: #4ade80; font-weight: 600; }
            .att-cell-neutral { color: #888; }

            /* Predictions */
            .att-prediction-main { text-align: center; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 16px; }
            .att-pred-trend { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 1.1em; margin-bottom: 12px; }
            .att-pred-trend.att-trend-good { background: rgba(34,197,94,0.2); color: #4ade80; }
            .att-pred-trend.att-trend-bad { background: rgba(239,68,68,0.2); color: #f87171; }
            .att-pred-method { padding: 16px; background: rgba(99,102,241,0.1); border-radius: 12px; }
            .att-pred-method h4 { margin: 0 0 8px 0; color: #818cf8; }
            .att-pred-method p { margin: 4px 0; font-size: 0.85em; color: #aaa; }

            /* Footer */
            .att-play-footer { margin-top: 40px; padding: 24px; background: rgba(30,41,59,0.8); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
            .att-method-summary { text-align: center; margin-bottom: 16px; }
            .att-method-summary h4 { margin: 0 0 12px 0; color: #a0a0a0; font-size: 0.9em; }
            .att-method-pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
            .att-mpill { background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 6px 12px; border-radius: 16px; font-size: 0.75em; cursor: help; transition: all 0.2s; }
            .att-mpill:hover { background: rgba(99,102,241,0.3); transform: translateY(-2px); }
            .att-engine-info { display: flex; justify-content: center; gap: 24px; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.75em; color: #666; flex-wrap: wrap; }

            /* Year-over-Year Comparison */
            .att-year-comparison-section { background: linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(6,182,212,0.05) 100%); border: 1px solid rgba(16,185,129,0.2); }
            .att-yoy-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
            .att-yoy-card { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 20px; text-align: center; }
            .att-yoy-label { font-size: 0.85em; color: #888; margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .att-yoy-values { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
            .att-yoy-current { font-size: 1.8em; font-weight: 700; color: #fff; }
            .att-yoy-previous { font-size: 1.1em; color: #888; }
            .att-yoy-arrow { font-size: 1.5em; }
            .att-arrow-up { color: #10b981; }
            .att-arrow-down { color: #ef4444; }
            .att-yoy-diff { font-size: 0.9em; font-weight: 600; padding: 4px 12px; border-radius: 16px; display: inline-block; }
            .att-diff-positive { background: rgba(16,185,129,0.2); color: #34d399; }
            .att-diff-negative { background: rgba(239,68,68,0.2); color: #f87171; }
            .att-diff-neutral { background: rgba(99,102,241,0.2); color: #a5b4fc; }
            .att-yoy-insights { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
            .att-yoy-insight { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 8px; }
            .att-insight-positive { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); }
            .att-insight-negative { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); }
            .att-insight-info { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); }
            .att-insight-emoji { font-size: 1.2em; }
            .att-yoy-insight span:last-child { color: #e0e0e0; font-size: 0.9em; }
            .att-yoy-note { margin-top: 16px; padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: 8px; }
            .att-yoy-note small { color: #888; }
            .att-yoy-no-data { text-align: center; padding: 40px 20px; }
            .att-no-data-icon { font-size: 3em; display: block; margin-bottom: 12px; opacity: 0.5; }
            .att-yoy-no-data p { color: #888; margin: 0 0 8px 0; }
            .att-yoy-no-data small { color: #666; }

            /* Empty State */
            .att-play-empty { text-align: center; padding: 60px 20px; }
            .att-empty-visual { margin-bottom: 24px; }
            .att-empty-icon-wrapper { position: relative; display: inline-block; font-size: 4em; }
            .att-empty-pulse { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100px; height: 100px; background: rgba(99,102,241,0.2); border-radius: 50%; animation: att-pulse 2s ease-in-out infinite; }
            .att-play-empty h2 { margin: 0 0 12px 0; color: #e0e0e0; }
            .att-play-empty p { margin: 0 0 8px 0; color: #888; }
            .att-empty-hint { font-size: 0.85em; color: #666; margin-bottom: 24px !important; }
            .att-btn-glow { position: relative; overflow: hidden; }
            .att-btn-glow::after { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); animation: att-btn-shine 3s ease-in-out infinite; }
            @keyframes att-btn-shine { 0%, 100% { transform: translateX(-100%) rotate(45deg); } 50% { transform: translateX(100%) rotate(45deg); } }

            /* No Data */
            .att-no-data { text-align: center; padding: 20px; color: #666; font-style: italic; }

            /* Mini bars */
            .att-mini-bars { display: flex; align-items: flex-end; gap: 2px; }
            .att-mini-bar { background: #6366f1; border-radius: 2px 2px 0 0; transition: height 0.3s; }

            /* Responsive */
            @media (max-width: 768px) {
                .att-play-header { flex-direction: column; text-align: center; }
                .att-hero-content { flex-direction: column; }
                .att-shifts-compare { grid-template-columns: 1fr; }
                .att-climate-body { flex-direction: column; }
            }
        `;
        document.head.appendChild(style);
    },

    injectAcademicStyles() {
        if (document.getElementById('att-academic-styles')) return;
        const style = document.createElement('style');
        style.id = 'att-academic-styles';
        style.textContent = `
            .att-analytics-academic { padding: 20px; }
            .att-analytics-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
            .att-header-main h2 { margin: 0 0 5px 0; font-size: 1.5em; color: #e0e0e0; }
            .att-header-main p { margin: 0; color: #888; font-size: 0.9em; }
            .att-header-badges { display: flex; gap: 8px; flex-wrap: wrap; }
            .att-method-badge { background: rgba(99,102,241,0.2); color: #818cf8; padding: 4px 10px; border-radius: 12px; font-size: 0.75em; border: 1px solid rgba(99,102,241,0.3); }

            .att-sample-info { display: flex; gap: 20px; padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 20px; font-size: 0.85em; color: #aaa; flex-wrap: wrap; }
            .att-sample-info strong { color: #fff; }

            .att-stats-section { margin-bottom: 30px; }
            .att-stats-section h3 { color: #e0e0e0; margin-bottom: 10px; font-size: 1.1em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
            .att-section-subtitle { color: #888; font-size: 0.85em; margin: -5px 0 15px 0; }

            .att-academic-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
            .att-stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; }
            .att-stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            .att-stat-title { color: #e0e0e0; font-weight: 500; }
            .att-stat-method { background: rgba(34,197,94,0.15); color: #4ade80; padding: 2px 8px; border-radius: 10px; font-size: 0.7em; cursor: help; }
            .att-stat-body { text-align: center; padding: 10px 0; }
            .att-stat-big { display: block; font-size: 2em; font-weight: 600; color: #fff; }
            .att-stat-interpretation { display: block; color: #888; font-size: 0.8em; margin-top: 5px; }

            .att-stat-comparison .att-stat-compare { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
            .att-compare-item { text-align: center; flex: 1; padding: 10px; border-radius: 8px; }
            .att-compare-raw { background: rgba(239,68,68,0.1); }
            .att-compare-trimmed { background: rgba(34,197,94,0.1); }
            .att-compare-label { display: block; font-size: 0.75em; color: #888; margin-bottom: 4px; }
            .att-compare-value { display: block; font-size: 1.5em; font-weight: 600; color: #fff; }
            .att-compare-note { display: block; font-size: 0.7em; color: #666; }
            .att-compare-arrow { color: #666; font-size: 1.2em; }

            .att-percentile-grid { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px; padding: 10px 0; }
            .att-percentile { text-align: center; min-width: 50px; }
            .att-percentile span { display: block; font-size: 0.7em; color: #888; }
            .att-percentile strong { display: block; font-size: 1.2em; color: #fff; }
            .att-percentile-median { background: rgba(99,102,241,0.15); padding: 8px; border-radius: 8px; }
            .att-percentile-median em { display: block; font-size: 0.65em; color: #818cf8; }

            .att-distribution-container { display: flex; gap: 20px; align-items: stretch; }
            .att-distribution-chart { flex: 1; display: flex; align-items: flex-end; justify-content: space-around; height: 150px; background: rgba(255,255,255,0.02); border-radius: 8px; padding: 15px 10px 25px; }
            .att-dist-bar-wrapper { display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; flex: 1; }
            .att-dist-bar { width: 80%; background: linear-gradient(to top, #6366f1, #818cf8); border-radius: 3px 3px 0 0; min-height: 2px; transition: height 0.3s; }
            .att-dist-bar-wrapper:hover .att-dist-bar { background: linear-gradient(to top, #4f46e5, #6366f1); }
            .att-dist-label { font-size: 0.65em; color: #888; margin-top: 5px; }
            .att-distribution-stats { width: 200px; display: flex; flex-direction: column; gap: 10px; }
            .att-dist-stat { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 6px; }
            .att-dist-stat span { display: block; font-size: 0.75em; color: #888; }
            .att-dist-stat strong { display: block; font-size: 1.1em; color: #fff; }

            .att-temporal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
            .att-temporal-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; }
            .att-temporal-card h4 { margin: 0 0 5px 0; color: #e0e0e0; font-size: 1em; }
            .att-card-note { color: #888; font-size: 0.8em; margin: 0 0 12px 0; }
            .att-temporal-bars { display: flex; flex-direction: column; gap: 8px; }
            .att-temporal-row { display: flex; align-items: center; gap: 10px; }
            .att-temporal-name { width: 80px; font-size: 0.85em; color: #aaa; }
            .att-temporal-bar-bg { flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
            .att-temporal-bar-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #818cf8); border-radius: 4px; transition: width 0.5s; }
            .att-temporal-value { width: 50px; text-align: right; font-size: 0.85em; color: #fff; }

            .att-holiday-card { background: rgba(251,191,36,0.05); border-color: rgba(251,191,36,0.2); }
            .att-holiday-compare { display: flex; gap: 15px; margin: 10px 0; }
            .att-holiday-item { flex: 1; text-align: center; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px; }
            .att-holiday-item span { display: block; font-size: 0.8em; color: #888; }
            .att-holiday-item strong { display: block; font-size: 1.3em; color: #fff; }
            .att-holiday-pre { background: rgba(251,191,36,0.1); }
            .att-holiday-conclusion { font-size: 0.85em; color: #fbbf24; font-style: italic; margin: 0; }

            .att-insights-panel { margin-top: 20px; background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.2); border-radius: 10px; padding: 16px; }
            .att-insights-panel h4 { margin: 0 0 12px 0; color: #818cf8; }
            .att-insight { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: 6px; margin-bottom: 8px; }
            .att-insight-high { background: rgba(239,68,68,0.1); }
            .att-insight-medium { background: rgba(251,191,36,0.1); }
            .att-insight-icon { font-size: 1.2em; }
            .att-insight-text { flex: 1; color: #e0e0e0; }
            .att-insight-rec { font-size: 0.85em; color: #888; font-style: italic; }

            .att-zones-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
            .att-zone-card { border-radius: 10px; padding: 16px; border: 1px solid; }
            .att-zone-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; }
            .att-zone-icon { font-size: 1.5em; }
            .att-zone-desc { font-size: 0.8em; margin: 0 0 12px 0; opacity: 0.8; }
            .att-zone-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .att-zone-stat { text-align: center; }
            .att-zone-stat span { display: block; font-size: 0.7em; opacity: 0.7; }
            .att-zone-stat strong { display: block; font-size: 1.1em; }

            .att-branch-zone { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
            .att-branch-zone h4 { margin: 0 0 8px 0; color: #e0e0e0; }
            .att-branch-gap { color: #888; font-size: 0.85em; margin: 0 0 12px 0; }
            .att-branch-rankings { display: flex; flex-direction: column; gap: 8px; }
            .att-branch-rank { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; }
            .att-rank-num { font-weight: 700; color: #6366f1; min-width: 30px; }
            .att-rank-pos-1 .att-rank-num { color: #fbbf24; }
            .att-rank-pos-2 .att-rank-num { color: #94a3b8; }
            .att-rank-pos-3 .att-rank-num { color: #cd7f32; }
            .att-rank-branch { flex: 1; color: #e0e0e0; }
            .att-rank-metric { color: #4ade80; font-size: 0.85em; }
            .att-rank-score { color: #888; font-size: 0.85em; }

            .att-methodology-panel { background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-top: 30px; }
            .att-methodology-panel h3 { margin: 0 0 16px 0; color: #e0e0e0; font-size: 1.1em; }
            .att-method-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
            .att-method-item { display: flex; gap: 12px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; }
            .att-method-icon { font-size: 1.5em; width: 40px; text-align: center; }
            .att-method-content strong { display: block; color: #e0e0e0; margin-bottom: 4px; }
            .att-method-content p { margin: 0; font-size: 0.8em; color: #888; line-height: 1.4; }
            .att-method-footer { display: flex; justify-content: center; gap: 30px; margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.75em; color: #666; flex-wrap: wrap; }

            .att-no-data { color: #666; font-style: italic; text-align: center; padding: 20px; }

            @media (max-width: 768px) {
                .att-distribution-container { flex-direction: column; }
                .att-distribution-stats { width: 100%; flex-direction: row; flex-wrap: wrap; }
                .att-dist-stat { flex: 1; min-width: 120px; }
            }
        `;
        document.head.appendChild(style);
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
                    <h2>🚨 Centro de Alertas Avanzado</h2>
                    <p>Deteccion estadistica de patrones - Periodo: 90 dias rolling</p>
                </div>

                <!-- DOCUMENTACION CIENTIFICA: 15 TIPOS DE ALERTAS -->
                <details class="att-detection-docs" style="background:#1e293b;border-radius:12px;padding:16px;margin-bottom:20px;">
                    <summary style="cursor:pointer;font-weight:600;color:#f1f5f9;">
                        📊 Capacidades de Deteccion (15 patrones con umbral cientifico)
                    </summary>
                    <div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">
                        <div style="background:#450a0a;border-radius:8px;padding:12px;">
                            <h4 style="color:#fca5a5;margin:0 0 8px 0;font-size:14px;">⚠️ Negativos (9)</h4>
                            <div style="font-size:11px;color:#fecaca;line-height:1.6;">
                                • Tolerance Abuser: >60% dias usa tolerancia (-8pts)<br>
                                • Last In First Out: >50% tarde Y sale antes (-5pts)<br>
                                • Friday/Monday Absentee: >30% ausente (-6pts)<br>
                                • Late Arrival Streak: 3+ dias consecutivos (-7pts)<br>
                                • Absence Spike: >50% aumento reciente (-10pts)<br>
                                • Early Departure: >30% sale antes (-4pts)<br>
                                • Location Outlier: >20% fuera radio GPS (-8pts)<br>
                                • Seasonal Pattern: >50% mas ausencias mes (-3pts)
                            </div>
                        </div>
                        <div style="background:#052e16;border-radius:8px;padding:12px;">
                            <h4 style="color:#86efac;margin:0 0 8px 0;font-size:14px;">✨ Positivos (3)</h4>
                            <div style="font-size:11px;color:#bbf7d0;line-height:1.6;">
                                • Consistent Excellence: Score >95 por 30d (+15pts)<br>
                                • Overtime Hero: Extras >15% del total (+10pts)<br>
                                • Improving Trend: Score +10pts en 30d (+12pts)
                            </div>
                        </div>
                        <div style="background:#172554;border-radius:8px;padding:12px;">
                            <h4 style="color:#93c5fd;margin:0 0 8px 0;font-size:14px;">ℹ️ Informativos (3)</h4>
                            <div style="font-size:11px;color:#bfdbfe;line-height:1.6;">
                                • Weekend Overtime: >8 dias finde (0pts)<br>
                                • Night Shift Stable: >80% puntual noche (+5pts)<br>
                                • Flexible Hours: Var >2h, cumple 8h (0pts)
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:10px;padding:6px 10px;background:#334155;border-radius:6px;font-size:10px;color:#94a3b8;">
                        🔬 Metodologia: 90 dias rolling | Muestra min 10 | Confidence 70-95% | Por usuario | PostgreSQL
                    </div>
                </details>

                <!-- TABS DE SEGREGACION POR DEPTO/TURNO/SUCURSAL -->
                <div class="att-seg-tabs" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                    <button onclick="document.querySelectorAll('.att-seg-panel').forEach(p=>p.style.display='none');document.getElementById('seg-all').style.display='block';document.querySelectorAll('.att-seg-tab').forEach(t=>t.style.background='#334155');this.style.background='#6366f1';" class="att-seg-tab" style="background:#6366f1;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;">📋 Todas las Alertas</button>
                    <button onclick="document.querySelectorAll('.att-seg-panel').forEach(p=>p.style.display='none');document.getElementById('seg-dept').style.display='block';document.querySelectorAll('.att-seg-tab').forEach(t=>t.style.background='#334155');this.style.background='#6366f1';" class="att-seg-tab" style="background:#334155;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;">🏢 Por Departamento</button>
                    <button onclick="document.querySelectorAll('.att-seg-panel').forEach(p=>p.style.display='none');document.getElementById('seg-shift').style.display='block';document.querySelectorAll('.att-seg-tab').forEach(t=>t.style.background='#334155');this.style.background='#6366f1';" class="att-seg-tab" style="background:#334155;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;">⏰ Por Turno</button>
                    <button onclick="document.querySelectorAll('.att-seg-panel').forEach(p=>p.style.display='none');document.getElementById('seg-branch').style.display='block';document.querySelectorAll('.att-seg-tab').forEach(t=>t.style.background='#334155');this.style.background='#6366f1';" class="att-seg-tab" style="background:#334155;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;">📍 Por Sucursal</button>
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

                <!-- PANEL: Todas (seg-all) -->
                <div id="seg-all" class="att-seg-panel" style="display:block;">
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
                                        <span>📅 ${this.formatDate(p.detection_date)}</span>
                                        <span>📊 ${Math.round((p.confidence_score || 0) * 100)}%</span>
                                        <span>🏢 ${p.user?.department?.name || 'N/A'}</span>
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
                                <p>El motor de deteccion no encontro patrones en los ultimos 90 dias.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- PANEL: Por Departamento (seg-dept) -->
                <div id="seg-dept" class="att-seg-panel" style="display:none;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">
                        ${(() => {
                            const byDept = {};
                            patterns.forEach(p => {
                                const d = p.user?.department?.name || 'Sin Departamento';
                                if (!byDept[d]) byDept[d] = [];
                                byDept[d].push(p);
                            });
                            if (Object.keys(byDept).length === 0) return '<p style="color:#64748b;text-align:center;grid-column:1/-1;">Sin alertas para segregar</p>';
                            return Object.entries(byDept).map(([dept, alerts]) => `
                                <div style="background:#1e293b;border-radius:8px;padding:12px;">
                                    <h4 style="margin:0 0 8px 0;color:#f1f5f9;font-size:14px;">🏢 ${dept} <span style="background:#6366f1;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">${alerts.length}</span></h4>
                                    ${alerts.map(a => `<div style="padding:6px 0;border-bottom:1px solid #334155;font-size:12px;color:#94a3b8;">${a.severity==='critical'?'🚨':a.severity==='high'?'⚠️':'⚡'} ${a.pattern_name}</div>`).join('')}
                                </div>
                            `).join('');
                        })()}
                    </div>
                </div>

                <!-- PANEL: Por Turno (seg-shift) -->
                <div id="seg-shift" class="att-seg-panel" style="display:none;">
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
                        ${(() => {
                            const morning = patterns.filter(p => (p.user?.shift?.name||'').toLowerCase().includes('mañana'));
                            const afternoon = patterns.filter(p => (p.user?.shift?.name||'').toLowerCase().includes('tarde'));
                            const night = patterns.filter(p => !morning.includes(p) && !afternoon.includes(p));
                            return `
                                <div style="background:#1e293b;border-radius:8px;padding:12px;">
                                    <h4 style="margin:0 0 8px 0;color:#fcd34d;font-size:14px;">🌅 Mañana <span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:12px;font-size:11px;">${morning.length}</span></h4>
                                    ${morning.length > 0 ? morning.map(a => `<div style="padding:4px 0;font-size:11px;color:#94a3b8;">${a.severity==='critical'?'🚨':'⚠️'} ${a.pattern_name}</div>`).join('') : '<p style="color:#475569;font-size:11px;">Sin alertas</p>'}
                                </div>
                                <div style="background:#1e293b;border-radius:8px;padding:12px;">
                                    <h4 style="margin:0 0 8px 0;color:#fb923c;font-size:14px;">☀️ Tarde <span style="background:#f97316;color:#000;padding:2px 8px;border-radius:12px;font-size:11px;">${afternoon.length}</span></h4>
                                    ${afternoon.length > 0 ? afternoon.map(a => `<div style="padding:4px 0;font-size:11px;color:#94a3b8;">${a.severity==='critical'?'🚨':'⚠️'} ${a.pattern_name}</div>`).join('') : '<p style="color:#475569;font-size:11px;">Sin alertas</p>'}
                                </div>
                                <div style="background:#1e293b;border-radius:8px;padding:12px;">
                                    <h4 style="margin:0 0 8px 0;color:#a78bfa;font-size:14px;">🌙 Noche/Otros <span style="background:#8b5cf6;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">${night.length}</span></h4>
                                    ${night.length > 0 ? night.map(a => `<div style="padding:4px 0;font-size:11px;color:#94a3b8;">${a.severity==='critical'?'🚨':'⚠️'} ${a.pattern_name}</div>`).join('') : '<p style="color:#475569;font-size:11px;">Sin alertas</p>'}
                                </div>
                            `;
                        })()}
                    </div>
                </div>

                <!-- PANEL: Por Sucursal (seg-branch) -->
                <div id="seg-branch" class="att-seg-panel" style="display:none;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">
                        ${(() => {
                            const byBranch = {};
                            patterns.forEach(p => {
                                const b = p.user?.branch?.name || p.kiosk_name || 'Sucursal Principal';
                                if (!byBranch[b]) byBranch[b] = [];
                                byBranch[b].push(p);
                            });
                            if (Object.keys(byBranch).length === 0) return '<p style="color:#64748b;text-align:center;grid-column:1/-1;">Sin alertas para segregar</p>';
                            return Object.entries(byBranch).map(([branch, alerts]) => `
                                <div style="background:#1e293b;border-radius:8px;padding:12px;">
                                    <h4 style="margin:0 0 8px 0;color:#f1f5f9;font-size:14px;">📍 ${branch} <span style="background:#22c55e;color:#000;padding:2px 8px;border-radius:12px;font-size:11px;">${alerts.length}</span></h4>
                                    ${alerts.map(a => `<div style="padding:6px 0;border-bottom:1px solid #334155;font-size:12px;color:#94a3b8;">${a.severity==='critical'?'🚨':a.severity==='high'?'⚠️':'⚡'} ${a.pattern_name}</div>`).join('')}
                                </div>
                            `).join('');
                        })()}
                    </div>
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
    // CUBO DE HORAS - Panel Ejecutivo
    // ========================================================================
    async renderCuboHoras() {
        const content = document.getElementById('att-content');

        // Crear contenedor para el Hours Cube Dashboard
        content.innerHTML = `
            <div class="att-cubo-container" style="padding: 0;">
                <div id="hours-cube-dashboard-container" style="width: 100%; min-height: 600px;"></div>
            </div>
        `;

        // Cargar el script del Hours Cube Dashboard si no está cargado
        if (!window.HoursCubeDashboard) {
            try {
                await this.loadScript('/js/modules/hours-cube-dashboard.js');
            } catch (error) {
                content.innerHTML = `
                    <div class="att-error">
                        <span>Error cargando el Panel Ejecutivo: ${error.message}</span>
                        <button class="att-btn att-btn-primary" onclick="AttendanceEngine.renderCuboHoras()">Reintentar</button>
                    </div>
                `;
                return;
            }
        }

        // Inicializar el dashboard con el companyId del contexto de attendance
        try {
            window.hoursCubeDashboard = new window.HoursCubeDashboard('hours-cube-dashboard-container', {
                companyId: AttendanceState.companyId
            });
        } catch (error) {
            console.error('Error inicializando Hours Cube Dashboard:', error);
            content.innerHTML = `
                <div class="att-error">
                    <span>Error inicializando el Panel Ejecutivo: ${error.message}</span>
                    <button class="att-btn att-btn-primary" onclick="AttendanceEngine.renderCuboHoras()">Reintentar</button>
                </div>
            `;
        }
    },

    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
            document.head.appendChild(script);
        });
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

        // Información de turno
        const shiftInfo = att.shift ? `
            <div class="att-detail-item att-detail-full att-detail-shift">
                <span class="att-detail-label">🏢 Turno Asignado</span>
                <span class="att-detail-value">
                    <strong>${att.shift.name}</strong>
                    <small>(${att.shift.startTime?.substring(0,5) || '--:--'} - ${att.shift.endTime?.substring(0,5) || '--:--'})</small>
                </span>
            </div>
        ` : `
            <div class="att-detail-item att-detail-full">
                <span class="att-detail-label">🏢 Turno</span>
                <span class="att-detail-value text-muted">Sin turno asignado</span>
            </div>
        `;

        // Información de horas (del objeto hours del backend)
        const hours = att.hours || {};
        const hoursBreakdown = hours.totalHours ? `
            <div class="att-detail-section">
                <h4 class="att-section-title-modal">⏱️ Desglose de Horas</h4>
                <div class="att-hours-grid">
                    <div class="att-hours-item att-hours-normal">
                        <span class="att-hours-value">${hours.normalHours?.toFixed(1) || '0.0'}h</span>
                        <span class="att-hours-label">Horas Normales</span>
                        <span class="att-hours-multiplier">x${hours.multipliers?.normal || 1}</span>
                    </div>
                    <div class="att-hours-item att-hours-overtime ${hours.overtimeHours > 0 ? 'has-value' : ''}">
                        <span class="att-hours-value">${hours.overtimeHours?.toFixed(1) || '0.0'}h</span>
                        <span class="att-hours-label">Horas Extra</span>
                        <span class="att-hours-multiplier">x${hours.multipliers?.overtime || 1.5}</span>
                    </div>
                    <div class="att-hours-item att-hours-total">
                        <span class="att-hours-value">${hours.effectiveHours?.toFixed(1) || '0.0'}h</span>
                        <span class="att-hours-label">Total Efectivo</span>
                    </div>
                </div>
                ${hours.breakMinutes > 0 ? `
                    <div class="att-hours-note">
                        <small>☕ Descanso descontado: ${hours.breakMinutes} minutos</small>
                    </div>
                ` : ''}
                <div class="att-hours-expected">
                    <small>📋 Esperado por turno: ${hours.expectedWorkHours?.toFixed(1) || '8.0'}h</small>
                </div>
            </div>
        ` : '';

        // Tipo de día
        const dayTypeInfo = hours.dayType ? `
            <div class="att-detail-item">
                <span class="att-detail-label">📆 Tipo de Día</span>
                <span class="att-detail-value">
                    ${hours.isHoliday ? '<span class="badge-holiday">Feriado</span>' : ''}
                    ${hours.isWeekend ? '<span class="badge-weekend">Fin de Semana</span>' : ''}
                    ${!hours.isHoliday && !hours.isWeekend ? '<span class="badge-normal">Día Laboral</span>' : ''}
                    ${hours.isHoliday || hours.isWeekend ? `<small class="multiplier-note">Multiplicador: x${hours.isHoliday ? (hours.multipliers?.holiday || 2) : (hours.multipliers?.weekend || 1.5)}</small>` : ''}
                </span>
            </div>
        ` : '';

        // Información de tardanza
        const lateInfo = att.lateInfo?.isLate ? `
            <div class="att-detail-item att-detail-full att-late-alert">
                <span class="att-detail-label">⚠️ Tardanza Detectada</span>
                <span class="att-detail-value">
                    <strong>+${att.lateInfo.lateMinutes} minutos</strong>
                    <small>(Tolerancia: ${att.lateInfo.toleranceMinutes} min | Esperado: ${att.lateInfo.expectedTime?.substring(0,5)} | Llegada: ${att.lateInfo.actualTime})</small>
                </span>
            </div>
        ` : '';

        modal.innerHTML = `
            <div class="att-modal att-modal-large">
                <div class="att-modal-header">
                    <h3>👁️ Detalle de Asistencia</h3>
                    <button onclick="AttendanceEngine.closeModal()" class="att-modal-close">&times;</button>
                </div>
                <div class="att-modal-body">
                    <div class="att-detail-grid">
                        <div class="att-detail-item">
                            <span class="att-detail-label">👤 Empleado</span>
                            <span class="att-detail-value"><strong>${att.user_name || att.employee_name || 'N/A'}</strong></span>
                        </div>
                        <div class="att-detail-item">
                            <span class="att-detail-label">🏷️ Legajo</span>
                            <span class="att-detail-value"><code>${att.legajo || att.employee_id || 'N/A'}</code></span>
                        </div>
                        <div class="att-detail-item">
                            <span class="att-detail-label">📅 Fecha</span>
                            <span class="att-detail-value">${this.formatDate(att.date || att.attendance_date)}</span>
                        </div>
                        ${dayTypeInfo}
                        ${shiftInfo}
                        <div class="att-detail-item">
                            <span class="att-detail-label">🕐 Entrada</span>
                            <span class="att-detail-value">${this.formatTime(att.check_in || att.time_in)}</span>
                        </div>
                        <div class="att-detail-item">
                            <span class="att-detail-label">🕐 Salida</span>
                            <span class="att-detail-value">${this.formatTime(att.check_out || att.time_out)}</span>
                        </div>
                        <div class="att-detail-item att-detail-full">
                            <span class="att-detail-label">📍 Estado</span>
                            <span class="att-detail-value">${this.getStatusBadge(att.status, att.lateInfo)}</span>
                        </div>
                        ${lateInfo}
                    </div>

                    ${hoursBreakdown}
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
        const branchFilter = document.getElementById('att-filter-branch')?.value || '';
        const deptFilter = document.getElementById('att-filter-dept')?.value || '';
        const destinationFilter = document.getElementById('att-filter-destination')?.value || '';

        const filtered = AttendanceState.attendances.filter(att => {
            const name = (att.user_name || att.employee_name || '').toLowerCase();
            const legajo = (att.legajo || att.employee_id || '').toLowerCase();
            const matchSearch = name.includes(search) || legajo.includes(search);
            const matchStatus = !status || att.status === status;

            // Filtro por sucursal
            const matchBranch = !branchFilter || att.branch_id == branchFilter || att.branch_name === branchFilter;

            // Filtro por departamento
            const matchDept = !deptFilter || att.department_id == deptFilter || att.department_name === deptFilter;

            // Filtro por destino de HE
            const destination = att.overtime_destination || att.hours?.overtimeDestination;
            const overtimeHrs = parseFloat(att.overtime_hours || att.hours?.overtimeHours || 0);
            let matchDestination = true;
            if (destinationFilter) {
                if (destinationFilter === 'pending') {
                    // Pendientes: tiene HE pero sin destino definido
                    matchDestination = overtimeHrs > 0 && (!destination || destination === 'pending');
                } else if (destinationFilter === 'paid') {
                    // Pagadas: destino es 'paid' o 'pay'
                    matchDestination = destination === 'paid' || destination === 'pay';
                } else if (destinationFilter === 'bank') {
                    // Banco: destino es 'bank'
                    matchDestination = destination === 'bank';
                }
            }

            return matchSearch && matchStatus && matchBranch && matchDept && matchDestination;
        });

        // Re-render table body con estructura de columnas actualizada
        const tbody = document.getElementById('att-records-body');
        if (tbody) {
            tbody.innerHTML = filtered.length > 0 ? filtered.map(att => {
                // Calcular horas extras y destino - MUTUAMENTE EXCLUYENTES
                const overtimeHours = parseFloat(att.hours?.overtimeHours || att.overtime_hours || 0);
                const destination = att.overtime_destination || att.hours?.overtimeDestination;
                const extrasHours = (destination === 'pay' || destination === 'paid') ? overtimeHours : 0;
                const bancoHours = destination === 'bank' ? overtimeHours : 0;
                const pendingHours = (overtimeHours > 0 && !destination) ? overtimeHours : 0;

                return `
                <tr class="${overtimeHours > 0 ? 'has-overtime' : ''}">
                    <td><strong>${att.user_name || att.employee_name || 'N/A'}</strong></td>
                    <td><code style="font-size: 0.75rem;">${att.legajo || att.employee_id || 'N/A'}</code></td>
                    <td class="att-td-compact">${att.branch_name || att.branch || '-'}</td>
                    <td class="att-td-compact">${att.department_name || att.department || '-'}</td>
                    <td class="att-td-compact">${att.sector_name || att.sector || '-'}</td>
                    <td class="att-td-compact">${this.formatDate(att.date || att.attendance_date)}${att.hours?.isWeekend ? ' <span class="badge-weekend">FDS</span>' : ''}${att.hours?.isHoliday ? ' <span class="badge-holiday">FER</span>' : ''}</td>
                    <td class="att-td-compact">${att.shift?.name || '<span class="text-muted">-</span>'}</td>
                    <td class="att-td-compact">${this.formatTime(att.check_in || att.time_in)}${att.lateInfo?.isLate ? ' <span class="badge-late">+' + att.lateInfo.lateMinutes + 'm</span>' : ''}</td>
                    <td class="att-td-compact">${this.formatTime(att.check_out || att.time_out)}</td>
                    <td class="hours-normal att-td-compact">${att.hours?.normalHours?.toFixed(1) || '0.0'}h</td>
                    <td class="att-col-extras ${extrasHours > 0 ? 'att-has-extras' : ''} ${pendingHours > 0 ? 'att-has-pending' : ''}">
                        ${extrasHours > 0 ? '<span class="att-extras-value">+' + extrasHours.toFixed(1) + 'h</span>' :
                          pendingHours > 0 ? '<span class="att-pending-value">⏳' + pendingHours.toFixed(1) + 'h</span>' : '-'}
                    </td>
                    <td class="att-col-banco ${bancoHours > 0 ? 'att-has-banco' : ''}">
                        ${bancoHours > 0 ? '<span class="att-banco-value">+' + bancoHours.toFixed(1) + 'h</span>' : '-'}
                    </td>
                    <td class="hours-total att-td-compact"><strong>${att.hours?.effectiveHours?.toFixed(1) || this.calculateHours(att.check_in || att.time_in, att.check_out || att.time_out)}</strong></td>
                    <td class="att-td-compact">${this.getStatusBadge(att.status, att.lateInfo)}</td>
                    <td class="att-actions-cell">
                        <button onclick="AttendanceEngine.viewRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-info" title="Ver">👁️</button>
                        <button onclick="AttendanceEngine.editRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-warning" title="Editar">✏️</button>
                        <button onclick="AttendanceEngine.deleteRecord('${att.id || att.attendance_id}')" class="att-btn-mini att-btn-danger" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `}).join('') : '<tr><td colspan="15" class="att-empty">No se encontraron registros</td></tr>';
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
        try {
            // Si es timestamp ISO (ej: 2025-12-14T01:14:00.000Z)
            if (timeStr.includes('T')) {
                const date = new Date(timeStr);
                return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            }
            // Si ya es formato HH:MM
            if (timeStr.includes(':')) return timeStr.substring(0, 5);
            return timeStr;
        } catch {
            return '--:--';
        }
    },

    calculateHours(timeIn, timeOut) {
        if (!timeIn || !timeOut) return '0.0h';
        try {
            let d1, d2;
            // Manejar timestamps ISO
            if (timeIn.includes('T')) {
                d1 = new Date(timeIn);
                d2 = new Date(timeOut);
            } else {
                // Formato HH:MM
                const [h1, m1] = timeIn.split(':').map(Number);
                const [h2, m2] = timeOut.split(':').map(Number);
                d1 = new Date(2000, 0, 1, h1, m1);
                d2 = new Date(2000, 0, 1, h2, m2);
            }
            const diffMs = d2 - d1;
            const hours = diffMs / (1000 * 60 * 60);
            return `${hours.toFixed(1)}h`;
        } catch {
            return '0.0h';
        }
    },

    getStatusBadge(status, lateInfo = null) {
        // Si hay lateInfo con tardanza, mostrar badge de tarde aunque status sea "present"
        if (lateInfo?.isLate && status !== 'absent') {
            return '<span class="att-status att-status-warning">⚠️ Tarde</span>';
        }
        const badges = {
            present: '<span class="att-status att-status-success">✅ A Tiempo</span>',
            late: '<span class="att-status att-status-warning">⚠️ Tarde</span>',
            absent: '<span class="att-status att-status-danger">❌ Ausente</span>'
        };
        return badges[status] || `<span class="att-status">${status}</span>`;
    },

    /**
     * Renderiza el destino de las horas extras (Banco/Pago/Pendiente)
     * @param {Object} att - Registro de asistencia
     * @returns {string} HTML del badge de destino
     */
    renderOvertimeDestination(att) {
        const destination = att.overtime_destination || att.hours?.overtimeDestination;

        if (!destination) {
            // Si hay HE pero no hay destino definido, es pendiente
            return '<span class="att-ot-badge att-ot-pending" title="Pendiente de decision">⏳ Pendiente</span>';
        }

        switch (destination) {
            case 'bank':
                return '<span class="att-ot-badge att-ot-bank" title="Acumulado en Banco de Horas">🏦 Banco</span>';
            case 'pay':
                return '<span class="att-ot-badge att-ot-pay" title="Sera pagado en liquidacion">💵 Pago</span>';
            case 'pending':
                return '<span class="att-ot-badge att-ot-pending" title="Empleado debe decidir">⏳ Pendiente</span>';
            case 'expired':
                return '<span class="att-ot-badge att-ot-expired" title="Tiempo de decision expirado">⌛ Expirado</span>';
            default:
                return `<span class="att-ot-badge">${destination}</span>`;
        }
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

        /* Hours Breakdown Badges */
        .badge-weekend {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            background: rgba(103, 58, 183, 0.2);
            color: #b388ff;
            margin-left: 4px;
        }

        .badge-holiday {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            background: rgba(233, 30, 99, 0.2);
            color: #ff80ab;
            margin-left: 4px;
        }

        .badge-late {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            background: rgba(255, 193, 7, 0.2);
            color: var(--att-accent-yellow);
            margin-left: 4px;
        }

        /* Overtime Destination Badges (Hour Bank) */
        .att-ot-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
        }

        .att-ot-bank {
            background: linear-gradient(135deg, rgba(0, 150, 136, 0.2), rgba(0, 200, 150, 0.15));
            color: #00e5a0;
            border: 1px solid rgba(0, 229, 160, 0.3);
        }

        .att-ot-pay {
            background: linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(100, 180, 255, 0.15));
            color: #64b5f6;
            border: 1px solid rgba(100, 181, 246, 0.3);
        }

        .att-ot-pending {
            background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 220, 100, 0.15));
            color: #ffc107;
            border: 1px solid rgba(255, 193, 7, 0.3);
            animation: pulse-pending 2s ease-in-out infinite;
        }

        .att-ot-expired {
            background: linear-gradient(135deg, rgba(255, 82, 82, 0.2), rgba(255, 120, 120, 0.15));
            color: #ff5252;
            border: 1px solid rgba(255, 82, 82, 0.3);
        }

        .att-ot-na {
            background: rgba(150, 150, 150, 0.1);
            color: var(--att-text-muted);
            border: 1px solid rgba(150, 150, 150, 0.2);
            font-size: 10px;
        }

        @keyframes pulse-pending {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .text-muted {
            color: var(--att-text-muted);
            font-style: italic;
        }

        /* Hours columns */
        .hours-normal {
            color: var(--att-accent-cyan);
        }

        .hours-overtime {
            color: var(--att-accent-yellow);
        }

        .hours-overtime strong {
            color: #ff9800;
        }

        .hours-total {
            color: var(--att-accent-green);
        }

        /* ============================================
           COLUMNAS EXTRAS vs BANCO (SSOT)
           ============================================ */

        /* Tabla compacta */
        .att-table-compact th,
        .att-table-compact td {
            padding: 6px 8px;
            font-size: 0.75rem;
        }

        .att-table-compact th {
            font-size: 0.7rem;
            white-space: nowrap;
        }

        .att-td-compact {
            white-space: nowrap;
            font-size: 0.75rem;
        }

        /* Columna Extras (para pago) */
        .att-col-extras {
            background: rgba(255, 152, 0, 0.05);
            text-align: center;
            min-width: 70px;
        }

        .att-col-extras.att-has-extras {
            background: rgba(255, 152, 0, 0.15);
        }

        .att-col-extras.att-has-pending {
            background: rgba(255, 193, 7, 0.15);
        }

        .att-extras-value {
            color: #ff9800;
            font-weight: 600;
            font-size: 0.8rem;
        }

        .att-pending-value {
            color: #ffc107;
            font-weight: 500;
            font-size: 0.75rem;
        }

        /* Columna Banco */
        .att-col-banco {
            background: rgba(0, 200, 150, 0.05);
            text-align: center;
            min-width: 70px;
        }

        .att-col-banco.att-has-banco {
            background: rgba(0, 200, 150, 0.15);
        }

        .att-banco-value {
            color: #00e5a0;
            font-weight: 600;
            font-size: 0.8rem;
        }

        /* Select compacto */
        .att-select-compact {
            padding: 6px 10px;
            font-size: 0.75rem;
            min-width: 90px;
        }

        /* Row with overtime highlight */
        tr.has-overtime {
            background: rgba(255, 152, 0, 0.05) !important;
        }

        tr.has-overtime:hover {
            background: rgba(255, 152, 0, 0.1) !important;
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

        /* ====== Modal Detail View Enhanced ====== */
        .att-modal-large .att-modal-container {
            max-width: 700px;
        }

        .att-detail-section {
            background: rgba(255,255,255,0.03);
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .att-section-title-modal {
            font-size: 14px;
            font-weight: 600;
            color: var(--att-text-secondary);
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .att-shift-info {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }

        .att-shift-time {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .att-shift-time .att-detail-label {
            font-size: 11px;
            color: var(--att-text-muted);
        }

        .att-shift-time .att-detail-value {
            font-size: 14px;
            font-weight: 600;
        }

        .att-hours-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .att-hours-item {
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            border: 1px solid transparent;
        }

        .att-hours-item.att-hours-normal {
            border-color: var(--att-accent-cyan);
            background: rgba(0,229,255,0.1);
        }

        .att-hours-item.att-hours-overtime {
            border-color: var(--att-accent-orange);
            background: rgba(255,152,0,0.1);
        }

        .att-hours-item.att-hours-total {
            border-color: var(--att-accent-green);
            background: rgba(0,230,118,0.1);
        }

        .att-hours-value {
            display: block;
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .att-hours-normal .att-hours-value { color: var(--att-accent-cyan); }
        .att-hours-overtime .att-hours-value { color: var(--att-accent-orange); }
        .att-hours-total .att-hours-value { color: var(--att-accent-green); }

        .att-hours-label {
            display: block;
            font-size: 11px;
            color: var(--att-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .att-hours-multiplier {
            display: block;
            font-size: 10px;
            color: var(--att-text-secondary);
            margin-top: 4px;
            opacity: 0.8;
        }

        .att-day-type-info {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .att-multiplier-note {
            font-size: 12px;
            color: var(--att-text-secondary);
        }

        .att-late-alert {
            background: rgba(255,82,82,0.15);
            border: 1px solid rgba(255,82,82,0.3);
            border-radius: 8px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .att-late-alert-icon {
            font-size: 24px;
        }

        .att-late-alert-content {
            flex: 1;
        }

        .att-late-alert-title {
            font-weight: 600;
            color: var(--att-accent-red);
            margin-bottom: 4px;
        }

        .att-late-alert-detail {
            font-size: 12px;
            color: var(--att-text-secondary);
        }

        /* Badges for day types */
        .badge-normal {
            background: linear-gradient(135deg, #4caf50, #45a049);
        }

        .badge-weekend {
            background: linear-gradient(135deg, #9c27b0, #7b1fa2);
        }

        .badge-holiday {
            background: linear-gradient(135deg, #e91e63, #c2185b);
        }

        .badge-late {
            background: linear-gradient(135deg, #ff5722, #e64a19);
        }

        .badge-overtime {
            background: linear-gradient(135deg, #ff9800, #f57c00);
        }
    `;

    document.head.appendChild(styles);
}

console.log('✅ [ATTENDANCE] Modulo Attendance Engine v2.0 cargado');
