/**
 * OCCUPATIONAL HEALTH & ABSENCE MANAGEMENT SYSTEM v6.0
 * Enterprise-Grade International Occupational Health Platform
 *
 * Technologies: Node.js + PostgreSQL + AI Analytics + Real-time Dashboard
 * Architecture: Multi-tenant, Multi-country, GDPR/HIPAA Compliant, ISO 45001 Ready
 * Standards: International Labour Organization (ILO), WHO Guidelines
 *
 * @author Biometric Enterprise System
 * @version 6.0.0 - Enterprise Dark Theme
 * @license Enterprise
 */
console.log('%c OCCUPATIONAL HEALTH v6.0 ', 'background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%); color: #4ade80; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT - Redux-like Pattern
// ============================================================================
const OHState = {
    currentView: 'dashboard', // dashboard, cases, analytics, compliance, settings
    filters: {
        dateRange: { start: null, end: null },
        caseStatus: 'all', // all, pending, under_review, closed
        absenceType: 'all', // all, medical_illness, work_accident, etc.
        department: 'all',
        searchTerm: ''
    },
    cases: [],
    analytics: null,
    selectedCase: null,
    pagination: { page: 1, limit: 20, total: 0 },
    sorting: { field: 'created_at', order: 'DESC' },
    isLoading: false,
    user: null, // Current logged user (doctor, hr, admin)
    permissions: {}, // Role-based permissions
    notifications: [],
    kpis: {},
    trends: {},

    // ✅ PRE-EMPLOYMENT SCREENING (v6.0)
    preEmploymentScreenings: [],
    selectedScreening: null,
    screeningTypes: [],
    screeningFilters: {
        status: 'all',
        country: 'all',
        overallResult: 'all',
        screeningTypeId: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    },
    screeningPagination: { page: 1, limit: 20, total: 0 },
    screeningSorting: { field: 'created_at', order: 'DESC' },

    // ✅ WORKERS' COMPENSATION CLAIMS (v6.0)
    workersCompensationClaims: [],
    selectedClaim: null,
    claimTypes: [],
    claimFilters: {
        status: 'all',
        country: 'all',
        dateFrom: '',
        dateTo: '',
        search: ''
    },
    claimPagination: { page: 1, limit: 20, total: 0 },
    claimSorting: { field: 'incident_date', order: 'DESC' }
};

// ============================================================================
// API SERVICE - Centralized HTTP Client
// ============================================================================
const OccupationalHealthAPI = {
    baseUrl: '/api/occupational-health',

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
            OHState.isLoading = true;
            renderLoadingState();

            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP Error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`[OccupationalHealthAPI] ${endpoint}:`, error);
            showOHNotification(error.message, 'error');
            throw error;
        } finally {
            OHState.isLoading = false;
            hideLoadingState();
        }
    },

    // ===== ABSENCE CASES =====
    getCases: (params) => OccupationalHealthAPI.request(`/cases?${new URLSearchParams(params)}`),
    getCase: (id) => OccupationalHealthAPI.request(`/cases/${id}`),
    createCase: (data) => OccupationalHealthAPI.request('/cases', { method: 'POST', body: JSON.stringify(data) }),
    updateCase: (id, data) => OccupationalHealthAPI.request(`/cases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    closeCase: (id, data) => OccupationalHealthAPI.request(`/cases/${id}/close`, { method: 'POST', body: JSON.stringify(data) }),
    reopenCase: (id, reason) => OccupationalHealthAPI.request(`/cases/${id}/reopen`, { method: 'POST', body: JSON.stringify({ reason }) }),

    // ===== MEDICAL COMMUNICATIONS =====
    getCommunications: (caseId) => OccupationalHealthAPI.request(`/cases/${caseId}/communications`),
    sendMessage: (caseId, data) => OccupationalHealthAPI.request(`/cases/${caseId}/communications`, { method: 'POST', body: JSON.stringify(data) }),
    uploadDocument: (caseId, formData) => OccupationalHealthAPI.request(`/cases/${caseId}/documents`, { method: 'POST', body: formData, headers: {} }),

    // ===== ANALYTICS & DASHBOARDS =====
    getDashboardKPIs: (period) => OccupationalHealthAPI.request(`/analytics/dashboard?period=${period}`),
    getAbsenceTrends: (params) => OccupationalHealthAPI.request(`/analytics/absence-trends?${new URLSearchParams(params)}`),
    getAbsenceCostAnalysis: (period) => OccupationalHealthAPI.request(`/analytics/absence-cost?period=${period}`),
    getReturnToWorkMetrics: () => OccupationalHealthAPI.request('/analytics/return-to-work'),
    getComplianceReport: (type) => OccupationalHealthAPI.request(`/compliance/report?type=${type}`),

    // ===== MEDICAL STAFF =====
    getMedicalStaff: () => OccupationalHealthAPI.request('/medical-staff'),
    assignDoctor: (caseId, doctorId) => OccupationalHealthAPI.request(`/cases/${caseId}/assign-doctor`, { method: 'POST', body: JSON.stringify({ doctorId }) }),

    // ===== TREATMENT PLANS =====
    createTreatmentPlan: (caseId, data) => OccupationalHealthAPI.request(`/cases/${caseId}/treatment-plan`, { method: 'POST', body: JSON.stringify(data) }),
    updateTreatmentPlan: (planId, data) => OccupationalHealthAPI.request(`/treatment-plans/${planId}`, { method: 'PUT', body: JSON.stringify(data) }),

    // ===== ACCOMMODATIONS (Work Restrictions) =====
    createAccommodation: (caseId, data) => OccupationalHealthAPI.request(`/cases/${caseId}/accommodations`, { method: 'POST', body: JSON.stringify(data) }),
    getAccommodations: (caseId) => OccupationalHealthAPI.request(`/cases/${caseId}/accommodations`),

    // ===== RETURN TO WORK PROGRAMS =====
    createRTWProgram: (caseId, data) => OccupationalHealthAPI.request(`/cases/${caseId}/rtw-program`, { method: 'POST', body: JSON.stringify(data) }),
    updateRTWProgress: (programId, data) => OccupationalHealthAPI.request(`/rtw-programs/${programId}/progress`, { method: 'POST', body: JSON.stringify(data) }),

    // ===== EXPORTS & REPORTS =====
    exportCases: (params, format) => OccupationalHealthAPI.request(`/export/cases?${new URLSearchParams(params)}&format=${format}`),
    exportCompliance: (type, format) => OccupationalHealthAPI.request(`/export/compliance?type=${type}&format=${format}`),
    generateAuditReport: (caseId) => OccupationalHealthAPI.request(`/cases/${caseId}/audit-report`),

    // ===== BULK OPERATIONS =====
    bulkAssignDoctor: (caseIds, doctorId) => OccupationalHealthAPI.request('/cases/bulk/assign-doctor', { method: 'POST', body: JSON.stringify({ caseIds, doctorId }) }),
    bulkUpdateStatus: (caseIds, status) => OccupationalHealthAPI.request('/cases/bulk/update-status', { method: 'POST', body: JSON.stringify({ caseIds, status }) }),
    bulkExport: (caseIds, format) => OccupationalHealthAPI.request('/cases/bulk/export', { method: 'POST', body: JSON.stringify({ caseIds, format }) }),

    // ===== PRE-EMPLOYMENT SCREENING (v6.0) =====
    async getScreeningTypes(country = 'US') {
        return this.request(`/screening-types?country_code=${country}`);
    },

    async getPreEmploymentScreenings(filters = {}, page = 1, limit = 20, sorting = {}) {
        const params = new URLSearchParams({
            page,
            limit,
            sortField: sorting.field || 'created_at',
            sortOrder: sorting.order || 'DESC',
            ...filters
        });
        return this.request(`/pre-employment-screenings?${params}`);
    },

    async getPreEmploymentScreening(id) {
        return this.request(`/pre-employment-screenings/${id}`);
    },

    async createPreEmploymentScreening(data) {
        return this.request('/pre-employment-screenings', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updatePreEmploymentScreening(id, data) {
        return this.request(`/pre-employment-screenings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deletePreEmploymentScreening(id) {
        return this.request(`/pre-employment-screenings/${id}`, {
            method: 'DELETE'
        });
    },

    async uploadScreeningDocument(screeningId, formData) {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${this.baseUrl}/pre-employment-screenings/${screeningId}/documents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }
        return response.json();
    },

    async deleteScreeningDocument(screeningId, documentId) {
        return this.request(`/pre-employment-screenings/${screeningId}/documents/${documentId}`, {
            method: 'DELETE'
        });
    },

    // ===== WORKERS' COMPENSATION CLAIMS (v6.0) =====
    async getClaimTypes(country = 'US') {
        return this.request(`/claim-types?country_code=${country}`);
    },

    async getWorkersCompensationClaims(filters = {}, page = 1, limit = 20, sorting = {}) {
        const params = new URLSearchParams({
            page,
            limit,
            sortField: sorting.field || 'incident_date',
            sortOrder: sorting.order || 'DESC',
            ...filters
        });
        return this.request(`/workers-compensation-claims?${params}`);
    },

    async getWorkersCompensationClaim(id) {
        return this.request(`/workers-compensation-claims/${id}`);
    },

    async createWorkersCompensationClaim(data) {
        return this.request('/workers-compensation-claims', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateWorkersCompensationClaim(id, data) {
        return this.request(`/workers-compensation-claims/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteWorkersCompensationClaim(id) {
        return this.request(`/workers-compensation-claims/${id}`, {
            method: 'DELETE'
        });
    },

    async uploadClaimDocument(claimId, formData) {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(`${this.baseUrl}/workers-compensation-claims/${claimId}/documents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }
        return response.json();
    },

    async deleteClaimDocument(documentId) {
        return this.request(`/claim-documents/${documentId}`, {
            method: 'DELETE'
        });
    },

    async getClaimStatusHistory(claimId) {
        return this.request(`/workers-compensation-claims/${claimId}/status-history`);
    }
};

// ============================================================================
// MAIN DASHBOARD - Enterprise UI
// ============================================================================
async function initOccupationalHealthDashboard() {
    console.log('🏥 [OH] Initializing Occupational Health Dashboard v5.0...');

    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="oh-container">
            <!-- Header Professional con KPIs -->
            <div class="oh-header">
                <div class="oh-header-top">
                    <div class="oh-title-section">
                        <h1 class="oh-main-title">
                            <span class="oh-icon">🏥</span>
                            Occupational Health & Absence Management
                        </h1>
                        <p class="oh-subtitle">Enterprise-Grade International Health Platform • ISO 45001 Ready</p>
                    </div>
                    <div class="oh-quick-actions">
                        <button onclick="OHViews.showCreateCaseModal()" class="oh-btn oh-btn-primary">
                            <span>➕</span> New Absence Case
                        </button>
                        <button onclick="OHViews.showBulkActionsModal()" class="oh-btn oh-btn-secondary">
                            <span>⚡</span> Bulk Actions
                        </button>
                        <button onclick="OHExport.showExportModal()" class="oh-btn oh-btn-secondary">
                            <span>📊</span> Export Data
                        </button>
                        <button onclick="OHSettings.show()" class="oh-btn oh-btn-ghost">
                            <span>⚙️</span>
                        </button>
                    </div>
                </div>

                <!-- KPI Cards Row -->
                <div class="oh-kpi-grid" id="oh-kpi-grid">
                    <div class="oh-kpi-card">
                        <div class="oh-kpi-icon" style="background: #4ade80;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                            </svg>
                        </div>
                        <div class="oh-kpi-content">
                            <div class="oh-kpi-label">Active Cases</div>
                            <div class="oh-kpi-value" id="kpi-active-cases">--</div>
                            <div class="oh-kpi-change positive">+12% vs last month</div>
                        </div>
                    </div>

                    <div class="oh-kpi-card">
                        <div class="oh-kpi-icon" style="background: #00d4ff;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                        <div class="oh-kpi-content">
                            <div class="oh-kpi-label">Avg. Absence Duration</div>
                            <div class="oh-kpi-value" id="kpi-avg-duration">--</div>
                            <div class="oh-kpi-change negative">+5% vs last month</div>
                        </div>
                    </div>

                    <div class="oh-kpi-card">
                        <div class="oh-kpi-icon" style="background: #ffc107;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
                            </svg>
                        </div>
                        <div class="oh-kpi-content">
                            <div class="oh-kpi-label">Absence Cost (Monthly)</div>
                            <div class="oh-kpi-value" id="kpi-absence-cost">--</div>
                            <div class="oh-kpi-change negative">+8% vs last month</div>
                        </div>
                    </div>

                    <div class="oh-kpi-card">
                        <div class="oh-kpi-icon" style="background: #00e676;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <div class="oh-kpi-content">
                            <div class="oh-kpi-label">Return to Work Rate</div>
                            <div class="oh-kpi-value" id="kpi-rtw-rate">--</div>
                            <div class="oh-kpi-change positive">+3% vs last month</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Navigation Tabs -->
            <div class="oh-nav-tabs">
                <button class="oh-tab active" data-view="dashboard" onclick="OHViews.switchView('dashboard')">
                    <span>📊</span> Dashboard
                </button>
                <button class="oh-tab" data-view="cases" onclick="OHViews.switchView('cases')">
                    <span>📋</span> Absence Cases
                </button>
                <button class="oh-tab" data-view="analytics" onclick="OHViews.switchView('analytics')">
                    <span>📈</span> Analytics & Trends
                </button>
                <button class="oh-tab" data-view="compliance" onclick="OHViews.switchView('compliance')">
                    <span>📜</span> Compliance & Audit
                </button>
                <button class="oh-tab" data-view="medical-staff" onclick="OHViews.switchView('medical-staff')">
                    <span>👨‍⚕️</span> Medical Staff
                </button>
                <button class="oh-tab" data-view="pre-employment" onclick="OHViews.switchView('pre-employment')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <path d="M20 8v6M23 11h-6"></path>
                    </svg>
                    Pre-Employment
                </button>
                <button class="oh-tab" data-view="workers-compensation" onclick="OHViews.switchView('workers-compensation')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                    </svg>
                    Workers' Compensation
                </button>
            </div>

            <!-- Main Content Area -->
            <div class="oh-main-content" id="oh-main-content">
                <!-- Content will be injected here based on selected tab -->
            </div>

            <!-- Global Loading Overlay -->
            <div class="oh-loading-overlay" id="oh-loading-overlay" style="display: none;">
                <div class="oh-spinner"></div>
                <p>Loading data...</p>
            </div>

            <!-- Notification Toast Container -->
            <div class="oh-toast-container" id="oh-toast-container"></div>
        </div>
    `;

    // Initialize CSS if not loaded
    injectOccupationalHealthCSS();

    // Load initial data
    await loadInitialData();

    // Set default view
    OHViews.switchView('dashboard');
}

// ============================================================================
// VIEWS ROUTER - Navigation between different sections
// ============================================================================
const OHViews = {
    switchView(viewName) {
        console.log(`[OH] Switching to view: ${viewName}`);
        OHState.currentView = viewName;

        // Update active tab
        document.querySelectorAll('.oh-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });

        // Render corresponding view
        const contentArea = document.getElementById('oh-main-content');
        if (!contentArea) return;

        switch(viewName) {
            case 'dashboard':
                this.renderDashboard(contentArea);
                break;
            case 'cases':
                this.renderCasesList(contentArea);
                break;
            case 'analytics':
                this.renderAnalytics(contentArea);
                break;
            case 'compliance':
                this.renderCompliance(contentArea);
                break;
            case 'medical-staff':
                this.renderMedicalStaff(contentArea);
                break;
            case 'pre-employment':
                renderPreEmploymentView();
                break;
            case 'workers-compensation':
                renderWorkersCompensationView();
                break;
        }
    },

    async renderDashboard(container) {
        container.innerHTML = `
            <div class="oh-dashboard-grid">
                <!-- Absence Trends Chart -->
                <div class="oh-card oh-card-large">
                    <div class="oh-card-header">
                        <h3>📈 Absence Trends (Last 12 Months)</h3>
                        <div class="oh-card-actions">
                            <select class="oh-select" onchange="OHCharts.updateTrendsChart(this.value)">
                                <option value="12months">Last 12 Months</option>
                                <option value="6months">Last 6 Months</option>
                                <option value="3months">Last 3 Months</option>
                            </select>
                        </div>
                    </div>
                    <div class="oh-card-body">
                        <canvas id="oh-trends-chart" height="80"></canvas>
                    </div>
                </div>

                <!-- Top Absence Types -->
                <div class="oh-card">
                    <div class="oh-card-header">
                        <h3>🏥 Top Absence Types</h3>
                    </div>
                    <div class="oh-card-body">
                        <canvas id="oh-types-chart"></canvas>
                    </div>
                </div>

                <!-- Pending Actions -->
                <div class="oh-card">
                    <div class="oh-card-header">
                        <h3>⚡ Pending Actions</h3>
                        <span class="oh-badge oh-badge-danger" id="pending-actions-count">--</span>
                    </div>
                    <div class="oh-card-body" id="pending-actions-list">
                        <!-- Populated dynamically -->
                    </div>
                </div>

                <!-- Recent Cases -->
                <div class="oh-card oh-card-large">
                    <div class="oh-card-header">
                        <h3>📋 Recent Absence Cases</h3>
                        <button class="oh-btn oh-btn-sm oh-btn-link" onclick="OHViews.switchView('cases')">View All →</button>
                    </div>
                    <div class="oh-card-body">
                        <div class="oh-table-container">
                            <table class="oh-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Type</th>
                                        <th>Start Date</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="recent-cases-tbody">
                                    <!-- Populated dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Department Comparison -->
                <div class="oh-card">
                    <div class="oh-card-header">
                        <h3>🏢 Absence by Department</h3>
                    </div>
                    <div class="oh-card-body">
                        <canvas id="oh-department-chart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Load dashboard data and render charts
        await this.loadDashboardData();
    },

    async loadDashboardData() {
        try {
            // Load KPIs
            const kpis = await OccupationalHealthAPI.getDashboardKPIs('current-month');
            updateKPIs(kpis);

            // Load cases for recent cases table
            const recentCases = await OccupationalHealthAPI.getCases({ limit: 10, sort: 'created_at:DESC' });
            renderRecentCasesTable(recentCases.data || []);

            // Load pending actions
            const pendingActions = await OccupationalHealthAPI.getCases({ status: 'pending,under_review', limit: 5 });
            renderPendingActions(pendingActions.data || []);

            // Render charts
            await OHCharts.renderAll();

        } catch (error) {
            console.error('[OH] Error loading dashboard data:', error);
        }
    },

    async renderCasesList(container) {
        container.innerHTML = `
            <div class="oh-cases-view">
                <!-- Advanced Filters -->
                <div class="oh-card oh-filters-card">
                    <div class="oh-filters-grid">
                        <div class="oh-filter-group">
                            <label>Search</label>
                            <input type="text" class="oh-input" placeholder="Employee name, ID..."
                                   onchange="OHFilters.applySearch(this.value)">
                        </div>
                        <div class="oh-filter-group">
                            <label>Status</label>
                            <select class="oh-select" onchange="OHFilters.applyStatus(this.value)">
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="under_review">Under Review</option>
                                <option value="awaiting_docs">Awaiting Documents</option>
                                <option value="needs_follow_up">Needs Follow-up</option>
                                <option value="justified">Justified</option>
                                <option value="not_justified">Not Justified</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                        <div class="oh-filter-group">
                            <label>Absence Type</label>
                            <select class="oh-select" onchange="OHFilters.applyType(this.value)">
                                <option value="all">All Types</option>
                                <option value="medical_illness">Medical Illness</option>
                                <option value="work_accident">Work Accident</option>
                                <option value="non_work_accident">Non-Work Accident</option>
                                <option value="occupational_disease">Occupational Disease</option>
                                <option value="maternity">Maternity Leave</option>
                                <option value="family_care">Family Care</option>
                                <option value="authorized_leave">Authorized Leave</option>
                            </select>
                        </div>
                        <div class="oh-filter-group">
                            <label>Date Range</label>
                            <div class="oh-date-range">
                                <input type="date" class="oh-input" id="filter-date-start">
                                <span>to</span>
                                <input type="date" class="oh-input" id="filter-date-end">
                            </div>
                        </div>
                        <div class="oh-filter-group">
                            <label>Department</label>
                            <select class="oh-select" id="filter-department">
                                <option value="all">All Departments</option>
                                <!-- Populated dynamically -->
                            </select>
                        </div>
                        <div class="oh-filter-actions">
                            <button class="oh-btn oh-btn-primary" onclick="OHFilters.apply()">Apply Filters</button>
                            <button class="oh-btn oh-btn-ghost" onclick="OHFilters.clear()">Clear</button>
                        </div>
                    </div>
                </div>

                <!-- Cases Table -->
                <div class="oh-card">
                    <div class="oh-card-header">
                        <h3>📋 Absence Cases</h3>
                        <div class="oh-bulk-actions">
                            <button class="oh-btn oh-btn-sm oh-btn-secondary" onclick="OHBulkActions.selectAll()">
                                Select All
                            </button>
                            <button class="oh-btn oh-btn-sm oh-btn-secondary" onclick="OHBulkActions.deselectAll()">
                                Deselect All
                            </button>
                            <button class="oh-btn oh-btn-sm oh-btn-primary" onclick="OHBulkActions.assignDoctor()" disabled id="bulk-assign-btn">
                                Assign Doctor
                            </button>
                            <button class="oh-btn oh-btn-sm oh-btn-danger" onclick="OHBulkActions.exportSelected()" disabled id="bulk-export-btn">
                                Export Selected
                            </button>
                        </div>
                    </div>
                    <div class="oh-card-body">
                        <div class="oh-table-container" id="cases-table-container">
                            <!-- Table populated dynamically -->
                        </div>

                        <!-- Pagination -->
                        <div class="oh-pagination" id="cases-pagination">
                            <!-- Pagination controls -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load cases with filters
        await this.loadCasesList();
    },

    async loadCasesList() {
        try {
            const params = {
                ...OHState.filters,
                page: OHState.pagination.page,
                limit: OHState.pagination.limit,
                sort: `${OHState.sorting.field}:${OHState.sorting.order}`
            };

            const response = await OccupationalHealthAPI.getCases(params);
            OHState.cases = response.data || [];
            OHState.pagination.total = response.total || 0;

            renderCasesTable(OHState.cases);
            renderPagination(OHState.pagination);
        } catch (error) {
            console.error('[OH] Error loading cases:', error);
        }
    },

    async renderAnalytics(container) {
        container.innerHTML = `
            <div class="oh-analytics-view">
                <!-- Time Period Selector -->
                <div class="oh-card">
                    <div class="oh-period-selector">
                        <button class="oh-period-btn active" data-period="week" onclick="OHAnalytics.setPeriod('week')">Week</button>
                        <button class="oh-period-btn" data-period="month" onclick="OHAnalytics.setPeriod('month')">Month</button>
                        <button class="oh-period-btn" data-period="quarter" onclick="OHAnalytics.setPeriod('quarter')">Quarter</button>
                        <button class="oh-period-btn" data-period="year" onclick="OHAnalytics.setPeriod('year')">Year</button>
                        <button class="oh-period-btn" data-period="custom" onclick="OHAnalytics.setPeriod('custom')">Custom Range</button>
                    </div>
                </div>

                <!-- Analytics Grid -->
                <div class="oh-analytics-grid">
                    <!-- Absence Cost Analysis -->
                    <div class="oh-card oh-card-large">
                        <div class="oh-card-header">
                            <h3>💰 Absence Cost Analysis</h3>
                            <div class="oh-card-actions">
                                <button class="oh-btn oh-btn-sm oh-btn-link" onclick="OHExport.downloadCostAnalysis()">
                                    📊 Export
                                </button>
                            </div>
                        </div>
                        <div class="oh-card-body">
                            <canvas id="oh-cost-chart" height="80"></canvas>
                            <div class="oh-cost-breakdown" id="cost-breakdown">
                                <!-- Cost breakdown table -->
                            </div>
                        </div>
                    </div>

                    <!-- Return to Work Metrics -->
                    <div class="oh-card">
                        <div class="oh-card-header">
                            <h3>✅ Return to Work Programs</h3>
                        </div>
                        <div class="oh-card-body">
                            <div class="oh-rtw-metrics" id="rtw-metrics">
                                <!-- RTW metrics -->
                            </div>
                        </div>
                    </div>

                    <!-- Absence Patterns Detection -->
                    <div class="oh-card oh-card-large">
                        <div class="oh-card-header">
                            <h3>🔍 Absence Patterns Detection (AI)</h3>
                        </div>
                        <div class="oh-card-body">
                            <div class="oh-patterns-list" id="patterns-list">
                                <!-- AI-detected patterns -->
                            </div>
                        </div>
                    </div>

                    <!-- Compliance Score -->
                    <div class="oh-card">
                        <div class="oh-card-header">
                            <h3>📜 Compliance Score</h3>
                        </div>
                        <div class="oh-card-body">
                            <div class="oh-compliance-gauge" id="compliance-gauge">
                                <!-- Gauge chart -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await OHAnalytics.loadData();
    },

    async renderCompliance(container) {
        container.innerHTML = `
            <div class="oh-compliance-view">
                <div class="oh-card">
                    <div class="oh-card-header">
                        <h3>📜 Compliance & Audit Trail</h3>
                        <div class="oh-card-actions">
                            <button class="oh-btn oh-btn-primary" onclick="OHCompliance.generateFullReport()">
                                📋 Generate Full Report
                            </button>
                        </div>
                    </div>
                    <div class="oh-card-body">
                        <div class="oh-compliance-sections">
                            <div class="oh-compliance-section">
                                <h4>🏆 International Standards Compliance</h4>
                                <div class="oh-standards-list">
                                    <div class="oh-standard-item">
                                        <span class="oh-standard-name">ISO 45001 (Occupational Health & Safety)</span>
                                        <span class="oh-standard-status oh-status-compliant">✅ Compliant</span>
                                    </div>
                                    <div class="oh-standard-item">
                                        <span class="oh-standard-name">ILO C155 (Occupational Safety and Health Convention)</span>
                                        <span class="oh-standard-status oh-status-compliant">✅ Compliant</span>
                                    </div>
                                    <div class="oh-standard-item">
                                        <span class="oh-standard-name">GDPR (Data Protection)</span>
                                        <span class="oh-standard-status oh-status-compliant">✅ Compliant</span>
                                    </div>
                                    <div class="oh-standard-item">
                                        <span class="oh-standard-name">WHO Guidelines (Workplace Health Promotion)</span>
                                        <span class="oh-standard-status oh-status-partial">⚠️ Partial</span>
                                    </div>
                                </div>
                            </div>

                            <div class="oh-compliance-section">
                                <h4>📊 Audit Logs</h4>
                                <div class="oh-table-container">
                                    <table class="oh-table">
                                        <thead>
                                            <tr>
                                                <th>Timestamp</th>
                                                <th>User</th>
                                                <th>Action</th>
                                                <th>Case ID</th>
                                                <th>Details</th>
                                            </tr>
                                        </thead>
                                        <tbody id="audit-logs-tbody">
                                            <!-- Populated from API -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await OHCompliance.loadData();
    },

    async renderMedicalStaff(container) {
        container.innerHTML = `
            <div class="oh-medical-staff-view">
                <div class="oh-card">
                    <div class="oh-card-header">
                        <h3>👨‍⚕️ Medical Staff Management</h3>
                        <button class="oh-btn oh-btn-primary" onclick="OHMedicalStaff.showAddModal()">
                            ➕ Add Medical Staff
                        </button>
                    </div>
                    <div class="oh-card-body">
                        <div class="oh-staff-grid" id="medical-staff-grid">
                            <!-- Staff cards populated dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        await OHMedicalStaff.loadData();
    },

    showCreateCaseModal() {
        // Implementation for create case modal
        showOHNotification('Create Case modal - Implementation pending', 'info');
    },

    showBulkActionsModal() {
        // Implementation for bulk actions modal
        showOHNotification('Bulk Actions modal - Implementation pending', 'info');
    }
};

// ============================================================================
// CHARTS & VISUALIZATION - Using Chart.js
// ============================================================================
const OHCharts = {
    trendsChart: null,
    typesChart: null,
    departmentChart: null,
    costChart: null,

    async renderAll() {
        try {
            await this.renderTrendsChart();
            await this.renderTypesChart();
            await this.renderDepartmentChart();
        } catch (error) {
            console.error('[OH Charts] Error rendering charts:', error);
        }
    },

    async renderTrendsChart() {
        const ctx = document.getElementById('oh-trends-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.trendsChart) this.trendsChart.destroy();

        // Fetch data from API
        const data = await OccupationalHealthAPI.getAbsenceTrends({ period: '12months' });

        this.trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Medical Illness',
                    data: data.medicalIllness || [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Work Accidents',
                    data: data.workAccidents || [],
                    borderColor: '#f5576c',
                    backgroundColor: 'rgba(245, 87, 108, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },

    async renderTypesChart() {
        const ctx = document.getElementById('oh-types-chart');
        if (!ctx) return;

        if (this.typesChart) this.typesChart.destroy();

        // Fetch from API
        const kpis = await OccupationalHealthAPI.getDashboardKPIs('current-month');
        const typeData = kpis.absenceTypes || {};

        this.typesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeData),
                datasets: [{
                    data: Object.values(typeData),
                    backgroundColor: [
                        '#667eea',
                        '#f5576c',
                        '#4facfe',
                        '#43e97b',
                        '#fa709a',
                        '#fee140'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },

    async renderDepartmentChart() {
        const ctx = document.getElementById('oh-department-chart');
        if (!ctx) return;

        if (this.departmentChart) this.departmentChart.destroy();

        const kpis = await OccupationalHealthAPI.getDashboardKPIs('current-month');
        const deptData = kpis.departmentAbsences || {};

        this.departmentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(deptData),
                datasets: [{
                    label: 'Absences',
                    data: Object.values(deptData),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },

    async updateTrendsChart(period) {
        const data = await OccupationalHealthAPI.getAbsenceTrends({ period });

        this.trendsChart.data.labels = data.labels || [];
        this.trendsChart.data.datasets[0].data = data.medicalIllness || [];
        this.trendsChart.data.datasets[1].data = data.workAccidents || [];
        this.trendsChart.update();
    }
};

// ============================================================================
// ANALYTICS MODULE
// ============================================================================
const OHAnalytics = {
    currentPeriod: 'month',

    async setPeriod(period) {
        this.currentPeriod = period;

        // Update active button
        document.querySelectorAll('.oh-period-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === period);
        });

        await this.loadData();
    },

    async loadData() {
        try {
            // Load cost analysis
            const costData = await OccupationalHealthAPI.getAbsenceCostAnalysis(this.currentPeriod);
            this.renderCostAnalysis(costData);

            // Load RTW metrics
            const rtwData = await OccupationalHealthAPI.getReturnToWorkMetrics();
            this.renderRTWMetrics(rtwData);

            // Load AI patterns (mock for now)
            this.renderPatterns();

        } catch (error) {
            console.error('[OH Analytics] Error loading data:', error);
        }
    },

    renderCostAnalysis(data) {
        const container = document.getElementById('cost-breakdown');
        if (!container) return;

        container.innerHTML = `
            <div class="oh-cost-summary">
                <div class="oh-cost-item">
                    <span class="oh-cost-label">Direct Costs</span>
                    <span class="oh-cost-value">$${(data.directCosts || 0).toLocaleString()}</span>
                </div>
                <div class="oh-cost-item">
                    <span class="oh-cost-label">Indirect Costs</span>
                    <span class="oh-cost-value">$${(data.indirectCosts || 0).toLocaleString()}</span>
                </div>
                <div class="oh-cost-item oh-cost-total">
                    <span class="oh-cost-label">Total</span>
                    <span class="oh-cost-value">$${((data.directCosts || 0) + (data.indirectCosts || 0)).toLocaleString()}</span>
                </div>
            </div>
        `;
    },

    renderRTWMetrics(data) {
        const container = document.getElementById('rtw-metrics');
        if (!container) return;

        container.innerHTML = `
            <div class="oh-metric-item">
                <div class="oh-metric-label">Active RTW Programs</div>
                <div class="oh-metric-value">${data.activePrograms || 0}</div>
            </div>
            <div class="oh-metric-item">
                <div class="oh-metric-label">Success Rate</div>
                <div class="oh-metric-value">${data.successRate || 0}%</div>
            </div>
            <div class="oh-metric-item">
                <div class="oh-metric-label">Avg. Time to Return</div>
                <div class="oh-metric-value">${data.avgTimeToReturn || 0} days</div>
            </div>
        `;
    },

    renderPatterns() {
        const container = document.getElementById('patterns-list');
        if (!container) return;

        // Mock data - real implementation would use AI/ML
        container.innerHTML = `
            <div class="oh-pattern-item">
                <div class="oh-pattern-icon">🔴</div>
                <div class="oh-pattern-content">
                    <div class="oh-pattern-title">High Frequency: Monday Absences</div>
                    <div class="oh-pattern-desc">23% of absences occur on Mondays (45% above average)</div>
                </div>
            </div>
            <div class="oh-pattern-item">
                <div class="oh-pattern-icon">🟡</div>
                <div class="oh-pattern-content">
                    <div class="oh-pattern-title">Seasonal Pattern: Winter Increase</div>
                    <div class="oh-pattern-desc">Medical illness cases +35% in Q1 vs Q3</div>
                </div>
            </div>
            <div class="oh-pattern-item">
                <div class="oh-pattern-icon">🟢</div>
                <div class="oh-pattern-content">
                    <div class="oh-pattern-title">Improvement: Return-to-Work Rate</div>
                    <div class="oh-pattern-desc">RTW success rate improved by 12% this quarter</div>
                </div>
            </div>
        `;
    }
};

// ============================================================================
// COMPLIANCE MODULE
// ============================================================================
const OHCompliance = {
    async loadData() {
        try {
            const auditLogs = await OccupationalHealthAPI.request('/compliance/audit-logs?limit=50');
            this.renderAuditLogs(auditLogs.data || []);
        } catch (error) {
            console.error('[OH Compliance] Error loading data:', error);
        }
    },

    renderAuditLogs(logs) {
        const tbody = document.getElementById('audit-logs-tbody');
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6c757d;">No audit logs found</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${formatDateTime(log.timestamp)}</td>
                <td>${escapeHTML(log.userName)}</td>
                <td><span class="oh-badge oh-badge-info">${log.action}</span></td>
                <td>${log.caseId || '-'}</td>
                <td>${escapeHTML(log.details || '')}</td>
            </tr>
        `).join('');
    },

    async generateFullReport() {
        try {
            showOHNotification('Generating compliance report...', 'info');
            const report = await OccupationalHealthAPI.exportCompliance('full', 'pdf');

            // Trigger download
            window.open(report.downloadUrl, '_blank');
            showOHNotification('Report generated successfully', 'success');
        } catch (error) {
            showOHNotification('Error generating report: ' + error.message, 'error');
        }
    }
};

// ============================================================================
// MEDICAL STAFF MODULE
// ============================================================================
const OHMedicalStaff = {
    async loadData() {
        try {
            const staff = await OccupationalHealthAPI.getMedicalStaff();
            this.renderStaffGrid(staff.data || []);
        } catch (error) {
            console.error('[OH Medical Staff] Error loading data:', error);
        }
    },

    renderStaffGrid(staff) {
        const grid = document.getElementById('medical-staff-grid');
        if (!grid) return;

        if (staff.length === 0) {
            grid.innerHTML = '<div class="oh-empty-state">No medical staff registered</div>';
            return;
        }

        grid.innerHTML = staff.map(doctor => `
            <div class="oh-staff-card">
                <div class="oh-staff-avatar">
                    ${doctor.avatarUrl ? `<img src="${doctor.avatarUrl}" alt="${doctor.name}">` : '👨‍⚕️'}
                </div>
                <div class="oh-staff-info">
                    <div class="oh-staff-name">${escapeHTML(doctor.firstName)} ${escapeHTML(doctor.lastName)}</div>
                    <div class="oh-staff-specialty">${escapeHTML(doctor.specialty || 'General Practice')}</div>
                    <div class="oh-staff-license">License: ${escapeHTML(doctor.licenseNumber)}</div>
                </div>
                <div class="oh-staff-stats">
                    <div class="oh-stat">
                        <span class="oh-stat-value">${doctor.activeCases || 0}</span>
                        <span class="oh-stat-label">Active Cases</span>
                    </div>
                    <div class="oh-stat">
                        <span class="oh-stat-value">${doctor.avgResponseTime || 0}h</span>
                        <span class="oh-stat-label">Avg Response</span>
                    </div>
                </div>
                <div class="oh-staff-actions">
                    <button class="oh-btn oh-btn-sm oh-btn-primary" onclick="OHMedicalStaff.viewDetails('${doctor.id}')">View Details</button>
                </div>
            </div>
        `).join('');
    },

    showAddModal() {
        showOHNotification('Add Medical Staff modal - Implementation pending', 'info');
    },

    viewDetails(doctorId) {
        showOHNotification(`View details for doctor ${doctorId} - Implementation pending`, 'info');
    }
};

// ============================================================================
// FILTERS MODULE
// ============================================================================
const OHFilters = {
    applySearch(value) {
        OHState.filters.searchTerm = value;
    },

    applyStatus(value) {
        OHState.filters.caseStatus = value;
    },

    applyType(value) {
        OHState.filters.absenceType = value;
    },

    apply() {
        OHState.filters.dateRange.start = document.getElementById('filter-date-start').value;
        OHState.filters.dateRange.end = document.getElementById('filter-date-end').value;
        OHState.filters.department = document.getElementById('filter-department').value;

        OHState.pagination.page = 1; // Reset to first page
        OHViews.loadCasesList();
    },

    clear() {
        OHState.filters = {
            dateRange: { start: null, end: null },
            caseStatus: 'all',
            absenceType: 'all',
            department: 'all',
            searchTerm: ''
        };

        document.getElementById('filter-date-start').value = '';
        document.getElementById('filter-date-end').value = '';
        document.getElementById('filter-department').value = 'all';

        OHViews.loadCasesList();
    }
};

// ============================================================================
// BULK ACTIONS MODULE
// ============================================================================
const OHBulkActions = {
    selectedCases: new Set(),

    selectAll() {
        document.querySelectorAll('.oh-case-checkbox').forEach(checkbox => {
            checkbox.checked = true;
            this.selectedCases.add(checkbox.value);
        });
        this.updateBulkButtons();
    },

    deselectAll() {
        document.querySelectorAll('.oh-case-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.selectedCases.clear();
        this.updateBulkButtons();
    },

    updateBulkButtons() {
        const count = this.selectedCases.size;
        document.getElementById('bulk-assign-btn').disabled = count === 0;
        document.getElementById('bulk-export-btn').disabled = count === 0;
    },

    async assignDoctor() {
        if (this.selectedCases.size === 0) return;

        // Show doctor selection modal
        showOHNotification('Bulk assign doctor - Implementation pending', 'info');
    },

    async exportSelected() {
        if (this.selectedCases.size === 0) return;

        try {
            const caseIds = Array.from(this.selectedCases);
            const result = await OccupationalHealthAPI.bulkExport(caseIds, 'xlsx');
            window.open(result.downloadUrl, '_blank');
            showOHNotification('Export completed successfully', 'success');
        } catch (error) {
            showOHNotification('Export failed: ' + error.message, 'error');
        }
    }
};

// ============================================================================
// EXPORT MODULE
// ============================================================================
const OHExport = {
    showExportModal() {
        showOHNotification('Export modal - Implementation pending', 'info');
    },

    async downloadCostAnalysis() {
        try {
            const result = await OccupationalHealthAPI.request('/export/cost-analysis?format=xlsx');
            window.open(result.downloadUrl, '_blank');
        } catch (error) {
            showOHNotification('Export failed: ' + error.message, 'error');
        }
    }
};

// ============================================================================
// SETTINGS MODULE
// ============================================================================
const OHSettings = {
    show() {
        showOHNotification('Settings panel - Implementation pending', 'info');
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
async function loadInitialData() {
    try {
        // Load user profile
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (token) {
            // Decode JWT to get user info
            const payload = JSON.parse(atob(token.split('.')[1]));
            OHState.user = payload;
            OHState.permissions = payload.permissions || {};
        }

        // Load initial KPIs
        const kpis = await OccupationalHealthAPI.getDashboardKPIs('current-month');
        updateKPIs(kpis);

    } catch (error) {
        console.error('[OH] Error loading initial data:', error);
    }
}

function updateKPIs(kpis) {
    OHState.kpis = kpis;

    document.getElementById('kpi-active-cases').textContent = kpis.activeCases || 0;
    document.getElementById('kpi-avg-duration').textContent = `${kpis.avgDuration || 0} days`;
    document.getElementById('kpi-absence-cost').textContent = `$${(kpis.absenceCost || 0).toLocaleString()}`;
    document.getElementById('kpi-rtw-rate').textContent = `${kpis.rtwRate || 0}%`;
}

function renderRecentCasesTable(cases) {
    const tbody = document.getElementById('recent-cases-tbody');
    if (!tbody) return;

    if (cases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #6c757d;">No recent cases</td></tr>';
        return;
    }

    tbody.innerHTML = cases.map(c => `
        <tr onclick="OHCaseDetails.show('${c.id}')" style="cursor: pointer;">
            <td>
                <div class="oh-employee-cell">
                    <div class="oh-employee-name">${escapeHTML(c.employeeName)}</div>
                    <div class="oh-employee-id">${escapeHTML(c.employeeId)}</div>
                </div>
            </td>
            <td><span class="oh-badge oh-badge-type">${formatAbsenceType(c.absenceType)}</span></td>
            <td>${formatDate(c.startDate)}</td>
            <td>${c.requestedDays} days</td>
            <td><span class="oh-status-badge oh-status-${c.caseStatus}">${formatStatus(c.caseStatus)}</span></td>
            <td>
                <button class="oh-btn oh-btn-sm oh-btn-link" onclick="event.stopPropagation(); OHCaseDetails.show('${c.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

function renderPendingActions(actions) {
    const container = document.getElementById('pending-actions-list');
    const countBadge = document.getElementById('pending-actions-count');

    if (!container || !countBadge) return;

    countBadge.textContent = actions.length;

    if (actions.length === 0) {
        container.innerHTML = '<div class="oh-empty-state">No pending actions</div>';
        return;
    }

    container.innerHTML = actions.map(action => `
        <div class="oh-pending-action-item">
            <div class="oh-action-icon">⚠️</div>
            <div class="oh-action-content">
                <div class="oh-action-title">${escapeHTML(action.title || 'Pending review')}</div>
                <div class="oh-action-desc">${escapeHTML(action.description || 'Case requires attention')}</div>
            </div>
            <button class="oh-btn oh-btn-sm oh-btn-primary" onclick="OHCaseDetails.show('${action.id}')">
                Review
            </button>
        </div>
    `).join('');
}

function renderCasesTable(cases) {
    const container = document.getElementById('cases-table-container');
    if (!container) return;

    if (cases.length === 0) {
        container.innerHTML = '<div class="oh-empty-state">No cases found</div>';
        return;
    }

    container.innerHTML = `
        <table class="oh-table oh-table-hover">
            <thead>
                <tr>
                    <th><input type="checkbox" onchange="OHBulkActions.toggleAll(this)"></th>
                    <th onclick="OHSorting.toggle('employeeName')">Employee ⬍</th>
                    <th onclick="OHSorting.toggle('absenceType')">Type ⬍</th>
                    <th onclick="OHSorting.toggle('startDate')">Start Date ⬍</th>
                    <th onclick="OHSorting.toggle('requestedDays')">Duration ⬍</th>
                    <th onclick="OHSorting.toggle('caseStatus')">Status ⬍</th>
                    <th>Assigned Doctor</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${cases.map(c => `
                    <tr>
                        <td><input type="checkbox" class="oh-case-checkbox" value="${c.id}" onchange="OHBulkActions.toggleCase('${c.id}', this.checked)"></td>
                        <td>
                            <div class="oh-employee-cell">
                                <div class="oh-employee-name">${escapeHTML(c.employeeName)}</div>
                                <div class="oh-employee-id">${escapeHTML(c.employeeId)}</div>
                            </div>
                        </td>
                        <td><span class="oh-badge oh-badge-type">${formatAbsenceType(c.absenceType)}</span></td>
                        <td>${formatDate(c.startDate)}</td>
                        <td>${c.requestedDays} days</td>
                        <td><span class="oh-status-badge oh-status-${c.caseStatus}">${formatStatus(c.caseStatus)}</span></td>
                        <td>${c.assignedDoctor || '<span style="color: #999;">Unassigned</span>'}</td>
                        <td>
                            <div class="oh-actions-menu">
                                <button class="oh-btn oh-btn-sm oh-btn-link" onclick="OHCaseDetails.show('${c.id}')">View</button>
                                <button class="oh-btn oh-btn-sm oh-btn-link" onclick="OHCaseActions.assign('${c.id}')">Assign</button>
                                <button class="oh-btn oh-btn-sm oh-btn-link" onclick="OHCaseActions.close('${c.id}')">Close</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderPagination(pagination) {
    const container = document.getElementById('cases-pagination');
    if (!container) return;

    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const currentPage = pagination.page;

    container.innerHTML = `
        <div class="oh-pagination-info">
            Showing ${((currentPage - 1) * pagination.limit) + 1} to ${Math.min(currentPage * pagination.limit, pagination.total)} of ${pagination.total} cases
        </div>
        <div class="oh-pagination-controls">
            <button class="oh-btn oh-btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="OHPagination.goToPage(${currentPage - 1})">
                ← Previous
            </button>
            ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (page > totalPages) return '';
                return `
                    <button class="oh-btn oh-btn-sm ${page === currentPage ? 'oh-btn-primary' : ''}"
                            onclick="OHPagination.goToPage(${page})">
                        ${page}
                    </button>
                `;
            }).join('')}
            <button class="oh-btn oh-btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="OHPagination.goToPage(${currentPage + 1})">
                Next →
            </button>
        </div>
    `;
}

const OHPagination = {
    goToPage(page) {
        OHState.pagination.page = page;
        OHViews.loadCasesList();
    }
};

const OHSorting = {
    toggle(field) {
        if (OHState.sorting.field === field) {
            OHState.sorting.order = OHState.sorting.order === 'ASC' ? 'DESC' : 'ASC';
        } else {
            OHState.sorting.field = field;
            OHState.sorting.order = 'ASC';
        }
        OHViews.loadCasesList();
    }
};

const OHCaseDetails = {
    show(caseId) {
        showOHNotification(`View details for case ${caseId} - Implementation pending`, 'info');
    }
};

const OHCaseActions = {
    assign(caseId) {
        showOHNotification(`Assign doctor to case ${caseId} - Implementation pending`, 'info');
    },

    close(caseId) {
        showOHNotification(`Close case ${caseId} - Implementation pending`, 'info');
    }
};

function renderLoadingState() {
    const overlay = document.getElementById('oh-loading-overlay');
    if (!overlay) return;

    // Use skeleton screens instead of spinner
    overlay.innerHTML = `
        <div class="oh-skeleton">
            <!-- Skeleton Header -->
            <div class="oh-skeleton-header"></div>

            <!-- Skeleton KPI Grid -->
            <div class="oh-skeleton-kpi-grid">
                <div class="oh-skeleton-kpi"></div>
                <div class="oh-skeleton-kpi"></div>
                <div class="oh-skeleton-kpi"></div>
                <div class="oh-skeleton-kpi"></div>
            </div>

            <!-- Skeleton Tabs -->
            <div class="oh-skeleton-tabs"></div>

            <!-- Skeleton Cards -->
            <div class="oh-skeleton-card">
                <div class="oh-skeleton-card-header"></div>
                <div class="oh-skeleton-table">
                    <div class="oh-skeleton-row"></div>
                    <div class="oh-skeleton-row"></div>
                    <div class="oh-skeleton-row"></div>
                    <div class="oh-skeleton-row"></div>
                    <div class="oh-skeleton-row"></div>
                </div>
            </div>

            <div class="oh-skeleton-card">
                <div class="oh-skeleton-card-header"></div>
                <div class="oh-skeleton-table">
                    <div class="oh-skeleton-row"></div>
                    <div class="oh-skeleton-row"></div>
                    <div class="oh-skeleton-row"></div>
                </div>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
}

function hideLoadingState() {
    const overlay = document.getElementById('oh-loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

function showOHNotification(message, type = 'info') {
    const container = document.getElementById('oh-toast-container');
    if (!container) {
        console.log(`[OH Notification] ${type}: ${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `oh-toast oh-toast-${type}`;
    toast.innerHTML = `
        <div class="oh-toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
        <div class="oh-toast-message">${escapeHTML(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('oh-toast-show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('oh-toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatAbsenceType(type) {
    const types = {
        'medical_illness': 'Medical Illness',
        'work_accident': 'Work Accident',
        'non_work_accident': 'Non-Work Accident',
        'occupational_disease': 'Occupational Disease',
        'maternity': 'Maternity Leave',
        'family_care': 'Family Care',
        'authorized_leave': 'Authorized Leave',
        'unauthorized': 'Unauthorized'
    };
    return types[type] || type;
}

function formatStatus(status) {
    const statuses = {
        'pending': 'Pending',
        'under_review': 'Under Review',
        'awaiting_docs': 'Awaiting Documents',
        'needs_follow_up': 'Needs Follow-up',
        'justified': 'Justified',
        'not_justified': 'Not Justified',
        'closed': 'Closed'
    };
    return statuses[status] || status;
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================================
// CSS INJECTION
// ============================================================================
function injectOccupationalHealthCSS() {
    if (document.getElementById('oh-enterprise-styles')) return;

    const style = document.createElement('style');
    style.id = 'oh-enterprise-styles';
    style.textContent = `
        /* OCCUPATIONAL HEALTH ENTERPRISE STYLES v6.0 - Dark Theme */

        :root {
            --oh-bg-primary: #0f0f1e;
            --oh-bg-secondary: #1a1a2e;
            --oh-bg-tertiary: #16213e;
            --oh-card-bg: rgba(255, 255, 255, 0.05);
            --oh-card-border: rgba(255, 255, 255, 0.1);
            --oh-text-primary: #ffffff;
            --oh-text-secondary: #b0b3c1;
            --oh-text-muted: #6b6b80;
            --oh-accent-medical: #4ade80;
            --oh-accent-blue: #00d4ff;
            --oh-accent-green: #00e676;
            --oh-accent-yellow: #ffc107;
            --oh-accent-red: #ff5252;
            --oh-accent-purple: #b388ff;
        }

        .oh-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: var(--oh-bg-primary);
            min-height: 100vh;
        }

        /* Header - Enterprise Dark Theme */
        .oh-header {
            background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px;
            padding: 30px;
            color: white;
            margin-bottom: 30px;
            box-shadow: 0 10px 40px rgba(26, 26, 46, 0.6);
            border: 1px solid rgba(74, 222, 128, 0.2);
        }

        .oh-header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
        }

        .oh-title-section {}

        .oh-main-title {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .oh-subtitle {
            font-size: 14px;
            opacity: 0.9;
            margin: 0;
        }

        .oh-quick-actions {
            display: flex;
            gap: 12px;
        }

        .oh-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .oh-btn-primary {
            background: white;
            color: #667eea;
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
        }

        .oh-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
        }

        .oh-btn-secondary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            backdrop-filter: blur(10px);
        }

        .oh-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .oh-btn-ghost {
            background: transparent;
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .oh-btn-ghost:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        /* KPI Cards - Glassmorphism */
        .oh-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }

        .oh-kpi-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            gap: 15px;
            align-items: center;
            transition: all 0.3s ease;
        }

        .oh-kpi-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--oh-accent-medical);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(74, 222, 128, 0.2);
        }

        .oh-kpi-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .oh-kpi-content {
            flex: 1;
        }

        .oh-kpi-label {
            font-size: 12px;
            color: var(--oh-text-secondary);
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .oh-kpi-value {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 5px;
            color: var(--oh-text-primary);
        }

        .oh-kpi-change {
            font-size: 12px;
            font-weight: 600;
        }

        .oh-kpi-change.positive { color: var(--oh-accent-green); }
        .oh-kpi-change.negative { color: var(--oh-accent-red); }

        /* Navigation Tabs - Enterprise Dark */
        .oh-nav-tabs {
            display: flex;
            gap: 10px;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 8px;
            border-radius: 12px;
            margin-bottom: 30px;
        }

        .oh-tab {
            flex: 1;
            padding: 12px 20px;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            color: var(--oh-text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .oh-tab:hover {
            background: rgba(74, 222, 128, 0.1);
            color: var(--oh-accent-medical);
            border-color: rgba(74, 222, 128, 0.3);
        }

        .oh-tab.active {
            background: linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(0, 230, 118, 0.2));
            color: var(--oh-accent-medical);
            border-color: var(--oh-accent-medical);
        }

        /* Cards - Glassmorphism */
        .oh-card {
            background: var(--oh-card-bg);
            backdrop-filter: blur(10px);
            border: 1px solid var(--oh-card-border);
            border-radius: 12px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }

        .oh-card:hover {
            border-color: rgba(74, 222, 128, 0.3);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .oh-card-large {
            grid-column: span 2;
        }

        .oh-card-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .oh-card-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--oh-text-primary);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .oh-card-body {
            padding: 20px;
        }

        .oh-card-actions {
            display: flex;
            gap: 10px;
        }

        /* Tables - Dark Theme */
        .oh-table-container {
            overflow-x: auto;
            border-radius: 8px;
        }

        .oh-table {
            width: 100%;
            border-collapse: collapse;
        }

        .oh-table thead {
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .oh-table th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            color: var(--oh-text-secondary);
            cursor: pointer;
            user-select: none;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
        }

        .oh-table th:hover {
            background: rgba(74, 222, 128, 0.08);
            color: var(--oh-accent-medical);
        }

        .oh-table td {
            padding: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            color: var(--oh-text-primary);
        }

        .oh-table-hover tbody tr {
            transition: all 0.2s ease;
        }

        .oh-table-hover tbody tr:hover {
            background: rgba(255, 255, 255, 0.03);
        }

        /* Badges */
        .oh-badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }

        .oh-badge-type {
            background: #e3f2fd;
            color: #1976d2;
        }

        .oh-badge-danger {
            background: #ffebee;
            color: #c62828;
        }

        .oh-badge-info {
            background: #e8eaf6;
            color: #5e35b1;
        }

        .oh-status-badge {
            padding: 6px 14px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }

        .oh-status-pending {
            background: #fff3e0;
            color: #e65100;
        }

        .oh-status-under_review {
            background: #e3f2fd;
            color: #1565c0;
        }

        .oh-status-closed {
            background: #e8f5e9;
            color: #2e7d32;
        }

        .oh-status-justified {
            background: #e8f5e9;
            color: #2e7d32;
        }

        .oh-status-not_justified {
            background: #ffebee;
            color: #c62828;
        }

        /* Dashboard Grid */
        .oh-dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
            gap: 20px;
        }

        /* Loading - Skeleton Screens */
        .oh-loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--oh-bg-primary);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            z-index: 9999;
            padding: 20px;
            overflow-y: auto;
        }

        .oh-skeleton {
            width: 100%;
            max-width: 1600px;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .oh-skeleton-header {
            height: 200px;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 16px;
            margin-bottom: 30px;
        }

        .oh-skeleton-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .oh-skeleton-kpi {
            height: 100px;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .oh-skeleton-tabs {
            height: 60px;
            background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 12px;
            margin-bottom: 30px;
        }

        .oh-skeleton-card {
            background: var(--oh-card-bg);
            border: 1px solid var(--oh-card-border);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .oh-skeleton-card-header {
            height: 24px;
            width: 200px;
            background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.1) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .oh-skeleton-table {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .oh-skeleton-row {
            height: 50px;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 8px;
        }

        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        /* Legacy spinner (fallback) */
        .oh-spinner {
            width: 50px;
            height: 50px;
            border: 5px solid rgba(255,255,255,0.1);
            border-top: 5px solid var(--oh-accent-medical);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Notifications */
        .oh-toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .oh-toast {
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            transform: translateX(400px);
            transition: transform 0.3s;
        }

        .oh-toast-show {
            transform: translateX(0);
        }

        .oh-toast-icon {
            font-size: 24px;
        }

        .oh-toast-message {
            flex: 1;
        }

        .oh-toast-success {
            border-left: 4px solid #43e97b;
        }

        .oh-toast-error {
            border-left: 4px solid #f5576c;
        }

        .oh-toast-info {
            border-left: 4px solid #4facfe;
        }

        /* Empty State */
        .oh-empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
            font-size: 16px;
        }

        /* Filters */
        .oh-filters-card {
            margin-bottom: 20px;
        }

        .oh-filters-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            align-items: end;
        }

        .oh-filter-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 5px;
            color: #666;
        }

        .oh-input,
        .oh-select {
            width: 100%;
            padding: 10px 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s;
        }

        .oh-input:focus,
        .oh-select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .oh-date-range {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .oh-filter-actions {
            display: flex;
            gap: 10px;
        }

        /* Pagination */
        .oh-pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }

        .oh-pagination-info {
            color: #666;
            font-size: 14px;
        }

        .oh-pagination-controls {
            display: flex;
            gap: 8px;
        }

        /* Employee Cell */
        .oh-employee-cell {}

        .oh-employee-name {
            font-weight: 600;
            color: #333;
        }

        .oh-employee-id {
            font-size: 12px;
            color: #999;
            margin-top: 2px;
        }

        /* Candidate Cell (Pre-Employment Screening) */
        .oh-candidate-info {}

        .oh-candidate-name {
            font-weight: 600;
            color: var(--oh-text-primary);
            margin-bottom: 2px;
        }

        .oh-candidate-email {
            font-size: 12px;
            color: var(--oh-text-muted);
        }

        /* Modal Overlay & Container */
        .oh-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .oh-modal {
            background: var(--oh-bg-secondary);
            border: 1px solid var(--oh-card-border);
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .oh-modal-large {
            max-width: 900px;
        }

        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .oh-modal-header {
            padding: 24px 24px 20px;
            border-bottom: 1px solid var(--oh-card-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .oh-modal-title {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: var(--oh-text-primary);
        }

        .oh-modal-close {
            background: transparent;
            border: none;
            color: var(--oh-text-secondary);
            cursor: pointer;
            padding: 8px;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .oh-modal-close:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--oh-text-primary);
        }

        .oh-modal-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
        }

        .oh-modal-body::-webkit-scrollbar {
            width: 8px;
        }

        .oh-modal-body::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
        }

        .oh-modal-body::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }

        .oh-modal-body::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .oh-modal-footer {
            padding: 16px 24px;
            border-top: 1px solid var(--oh-card-border);
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }

        /* Form Sections */
        .oh-form-section {
            margin-bottom: 32px;
        }

        .oh-form-section:last-child {
            margin-bottom: 0;
        }

        .oh-form-section-title {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--oh-text-primary);
            padding-bottom: 12px;
            border-bottom: 1px solid var(--oh-card-border);
        }

        .oh-form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
        }

        .oh-form-group {
            display: flex;
            flex-direction: column;
        }

        .oh-form-group-full {
            grid-column: span 2;
        }

        .oh-form-label {
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: var(--oh-text-secondary);
        }

        .oh-form-input,
        .oh-form-select,
        .oh-form-textarea {
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--oh-card-border);
            border-radius: 6px;
            color: var(--oh-text-primary);
            font-size: 14px;
            font-family: inherit;
            transition: all 0.2s;
        }

        .oh-form-input:focus,
        .oh-form-select:focus,
        .oh-form-textarea:focus {
            outline: none;
            border-color: var(--oh-accent-medical);
            background: rgba(74, 222, 128, 0.05);
            box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
        }

        .oh-form-input::placeholder,
        .oh-form-textarea::placeholder {
            color: var(--oh-text-muted);
        }

        .oh-form-textarea {
            resize: vertical;
            min-height: 80px;
        }

        .oh-form-select {
            cursor: pointer;
        }

        input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }

        /* ============================================ */
        /* DETAILS PANEL (OH-V6-4 Part 3)              */
        /* ============================================ */

        .oh-details-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            z-index: 9998;
            animation: fadeIn 0.2s ease;
        }

        .oh-details-panel {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 600px;
            max-width: 90%;
            background: var(--oh-bg-primary);
            box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            animation: slideInRight 0.3s ease;
            z-index: 9999;
        }

        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .oh-details-header {
            padding: 24px;
            background: linear-gradient(135deg, var(--oh-accent-medical), #059669);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }

        .oh-details-header-content h2 {
            font-size: 20px;
            font-weight: 700;
            color: white;
            margin: 0 0 4px 0;
        }

        .oh-details-header-content p {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            margin: 0;
        }

        .oh-details-header-actions {
            display: flex;
            gap: 8px;
        }

        .oh-details-header-actions button {
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .oh-details-header-actions button:hover {
            background: rgba(255, 255, 255, 0.25);
            border-color: rgba(255, 255, 255, 0.5);
        }

        .oh-details-tabs {
            display: flex;
            gap: 4px;
            padding: 16px 24px 0 24px;
            background: var(--oh-bg-secondary);
            border-bottom: 1px solid var(--oh-card-border);
            flex-shrink: 0;
        }

        .oh-details-tab {
            padding: 12px 20px;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            color: var(--oh-text-secondary);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }

        .oh-details-tab:hover {
            color: var(--oh-text-primary);
            background: rgba(74, 222, 128, 0.05);
        }

        .oh-details-tab.active {
            color: var(--oh-accent-medical);
            border-bottom-color: var(--oh-accent-medical);
        }

        .oh-details-body {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            background: var(--oh-bg-secondary);
        }

        .oh-details-tab-content {
            display: none;
        }

        .oh-details-tab-content.active {
            display: block;
            animation: fadeIn 0.2s ease;
        }

        .oh-details-section {
            margin-bottom: 32px;
        }

        .oh-details-section:last-child {
            margin-bottom: 0;
        }

        .oh-details-section-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--oh-text-primary);
            margin: 0 0 16px 0;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--oh-card-border);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .oh-details-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }

        .oh-details-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .oh-details-field label {
            font-size: 12px;
            font-weight: 500;
            color: var(--oh-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .oh-details-field > div {
            font-size: 14px;
            color: var(--oh-text-primary);
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--oh-card-border);
            border-radius: 6px;
        }

        .oh-details-field.full-width {
            grid-column: span 2;
        }

        .oh-details-empty {
            padding: 48px 24px;
            text-align: center;
            color: var(--oh-text-secondary);
            font-size: 14px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px dashed var(--oh-card-border);
            border-radius: 8px;
        }

        .oh-details-empty svg {
            margin-bottom: 16px;
            opacity: 0.3;
        }

        /* Upload Area */
        .oh-upload-area {
            margin-bottom: 24px;
        }

        .oh-upload-content {
            padding: 40px 24px;
            border: 2px dashed var(--oh-card-border);
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            background: rgba(255, 255, 255, 0.02);
        }

        .oh-upload-content:hover {
            border-color: var(--oh-accent-medical);
            background: rgba(74, 222, 128, 0.05);
        }

        .oh-upload-content svg {
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .oh-upload-content p {
            font-size: 14px;
            font-weight: 500;
            color: var(--oh-text-primary);
            margin: 0 0 8px 0;
        }

        .oh-upload-content small {
            font-size: 12px;
            color: var(--oh-text-secondary);
        }

        /* Documents List */
        .oh-documents-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .oh-document-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: var(--oh-card-bg);
            border: 1px solid var(--oh-card-border);
            border-radius: 8px;
            transition: all 0.2s;
        }

        .oh-document-item:hover {
            border-color: var(--oh-accent-medical);
            background: rgba(74, 222, 128, 0.05);
        }

        .oh-document-icon {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
        }

        .oh-document-info {
            flex: 1;
            min-width: 0;
        }

        .oh-document-info .name {
            font-size: 14px;
            font-weight: 500;
            color: var(--oh-text-primary);
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .oh-document-info .meta {
            font-size: 12px;
            color: var(--oh-text-secondary);
        }

        .oh-document-actions {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
        }

        .oh-document-actions button {
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--oh-card-border);
            border-radius: 6px;
            color: var(--oh-text-primary);
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .oh-document-actions button:hover {
            background: rgba(74, 222, 128, 0.1);
            border-color: var(--oh-accent-medical);
            color: var(--oh-accent-medical);
        }

        .oh-document-actions button.danger:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: #ef4444;
            color: #ef4444;
        }

        /* Results Display */
        .oh-results-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }

        .oh-result-card {
            padding: 16px;
            background: var(--oh-card-bg);
            border: 1px solid var(--oh-card-border);
            border-radius: 8px;
            text-align: center;
        }

        .oh-result-card label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: var(--oh-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .oh-result-card .value {
            font-size: 18px;
            font-weight: 600;
            color: var(--oh-text-primary);
        }

        .oh-result-card .value.pass {
            color: var(--oh-accent-medical);
        }

        .oh-result-card .value.fail {
            color: #ef4444;
        }

        .oh-result-card .value.pending {
            color: #f59e0b;
        }

        .oh-details-json {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--oh-card-border);
            border-radius: 6px;
            padding: 16px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #a3e635;
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
        }

        .oh-details-json pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .oh-header-top {
                flex-direction: column;
                gap: 20px;
            }

            .oh-quick-actions {
                flex-wrap: wrap;
            }

            .oh-dashboard-grid,
            .oh-filters-grid {
                grid-template-columns: 1fr;
            }

            .oh-card-large {
                grid-column: span 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================
document.addEventListener('keydown', (e) => {
    // Only process shortcuts when OH module is active
    const ohContainer = document.querySelector('.oh-container');
    if (!ohContainer) return;

    // Ctrl+S: Save current form (if any)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const activeModal = document.querySelector('.oh-modal:not([style*="display: none"])');
        if (activeModal) {
            const saveButton = activeModal.querySelector('.oh-btn-primary');
            if (saveButton && !saveButton.disabled) {
                saveButton.click();
                showOHNotification('Saving... (Ctrl+S)', 'info');
            }
        }
    }

    // Esc: Close current modal or cancel action
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.oh-modal:not([style*="display: none"])');
        if (activeModal) {
            const closeButton = activeModal.querySelector('.oh-btn-ghost, .oh-modal-close');
            if (closeButton) {
                closeButton.click();
            }
        }
        // Also clear any active selections
        document.querySelectorAll('.oh-case-checkbox:checked').forEach(cb => cb.checked = false);
    }

    // Ctrl+F: Focus search input
    if (e.ctrlKey && e.key === 'f' && document.querySelector('.oh-filters-card')) {
        e.preventDefault();
        const searchInput = document.querySelector('.oh-filters-card input[type="text"]');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    // Ctrl+N: New case (if on cases view)
    if (e.ctrlKey && e.key === 'n' && OHState.currentView === 'cases') {
        e.preventDefault();
        const newCaseBtn = document.querySelector('button[onclick*="showCreateCaseModal"]');
        if (newCaseBtn) {
            newCaseBtn.click();
        }
    }
});

// ============================================================================
// PRE-EMPLOYMENT SCREENING VIEW (v6.0) - Multi-Country
// ============================================================================

async function renderPreEmploymentView() {
    const contentArea = document.getElementById('oh-main-content');
    if (!contentArea) return;

    showLoadingState();

    try {
        // Load screening types for filter
        const typesResponse = await OccupationalHealthAPI.getScreeningTypes(OHState.screeningFilters.country || '*');
        OHState.screeningTypes = typesResponse.success ? typesResponse.data : [];

        // Load screenings
        await loadPreEmploymentScreenings();

        contentArea.innerHTML = `
            <div class="oh-view-header">
                <div class="oh-view-title-section">
                    <h2 class="oh-view-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 10px;">
                            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <path d="M20 8v6M23 11h-6"></path>
                        </svg>
                        Pre-Employment Medical Screening
                    </h2>
                    <p class="oh-view-subtitle">Multi-country parametrizable pre-employment health assessments</p>
                </div>
                <div class="oh-view-actions">
                    <button class="oh-btn oh-btn-primary" onclick="showCreateScreeningModal()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Screening
                    </button>
                </div>
            </div>

            <!-- Filters -->
            ${renderScreeningFilters()}

            <!-- Screenings Table -->
            ${renderScreeningsTable()}

            <!-- Pagination -->
            ${renderScreeningPagination()}
        `;

        hideLoadingState();

    } catch (error) {
        console.error('Error rendering pre-employment view:', error);
        showOHNotification('Error loading pre-employment screenings', 'error');
        hideLoadingState();
    }
}

function renderScreeningFilters() {
    const countries = [
        { code: 'all', name: 'All Countries' },
        { code: 'US', name: 'United States' },
        { code: 'MX', name: 'Mexico' },
        { code: 'AR', name: 'Argentina' },
        { code: 'BR', name: 'Brazil' },
        { code: 'CL', name: 'Chile' },
        { code: 'DE', name: 'Germany' },
        { code: 'ES', name: 'Spain' }
    ];

    return `
        <div class="oh-filters-card">
            <div class="oh-filters-row">
                <div class="oh-filter-group">
                    <label class="oh-filter-label">Search</label>
                    <input
                        type="text"
                        class="oh-filter-input"
                        placeholder="Candidate name, email, position..."
                        value="${OHState.screeningFilters.search || ''}"
                        oninput="handleScreeningFilterChange('search', this.value)"
                    />
                </div>

                <div class="oh-filter-group">
                    <label class="oh-filter-label">Country</label>
                    <select class="oh-filter-select" onchange="handleScreeningFilterChange('country', this.value)">
                        ${countries.map(c => `
                            <option value="${c.code}" ${OHState.screeningFilters.country === c.code ? 'selected' : ''}>
                                ${c.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="oh-filter-group">
                    <label class="oh-filter-label">Status</label>
                    <select class="oh-filter-select" onchange="handleScreeningFilterChange('status', this.value)">
                        <option value="all" ${OHState.screeningFilters.status === 'all' ? 'selected' : ''}>All</option>
                        <option value="scheduled" ${OHState.screeningFilters.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="in_progress" ${OHState.screeningFilters.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${OHState.screeningFilters.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${OHState.screeningFilters.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>

                <div class="oh-filter-group">
                    <label class="oh-filter-label">Result</label>
                    <select class="oh-filter-select" onchange="handleScreeningFilterChange('overallResult', this.value)">
                        <option value="all" ${OHState.screeningFilters.overallResult === 'all' ? 'selected' : ''}>All</option>
                        <option value="pass" ${OHState.screeningFilters.overallResult === 'pass' ? 'selected' : ''}>Pass</option>
                        <option value="fail" ${OHState.screeningFilters.overallResult === 'fail' ? 'selected' : ''}>Fail</option>
                        <option value="conditional" ${OHState.screeningFilters.overallResult === 'conditional' ? 'selected' : ''}>Conditional</option>
                        <option value="pending" ${OHState.screeningFilters.overallResult === 'pending' ? 'selected' : ''}>Pending</option>
                    </select>
                </div>

                <div class="oh-filter-group">
                    <label class="oh-filter-label">Date From</label>
                    <input
                        type="date"
                        class="oh-filter-input"
                        value="${OHState.screeningFilters.dateFrom || ''}"
                        onchange="handleScreeningFilterChange('dateFrom', this.value)"
                    />
                </div>

                <div class="oh-filter-group">
                    <label class="oh-filter-label">Date To</label>
                    <input
                        type="date"
                        class="oh-filter-input"
                        value="${OHState.screeningFilters.dateTo || ''}"
                        onchange="handleScreeningFilterChange('dateTo', this.value)"
                    />
                </div>

                <div class="oh-filter-group">
                    <button class="oh-btn oh-btn-ghost" onclick="clearScreeningFilters()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Clear Filters
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderScreeningsTable() {
    if (!OHState.preEmploymentScreenings || OHState.preEmploymentScreenings.length === 0) {
        return `
            <div class="oh-empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <path d="M20 8v6M23 11h-6"></path>
                </svg>
                <h3>No screenings found</h3>
                <p>Create your first pre-employment screening or adjust filters</p>
                <button class="oh-btn oh-btn-primary" onclick="showCreateScreeningModal()">
                    Create Screening
                </button>
            </div>
        `;
    }

    return `
        <div class="oh-card">
            <table class="oh-table oh-table-hover">
                <thead>
                    <tr>
                        <th onclick="handleScreeningSortChange('candidate_last_name')">
                            Candidate
                            ${getSortIcon('candidate_last_name')}
                        </th>
                        <th onclick="handleScreeningSortChange('position_title')">
                            Position
                            ${getSortIcon('position_title')}
                        </th>
                        <th onclick="handleScreeningSortChange('country_code')">
                            Country
                            ${getSortIcon('country_code')}
                        </th>
                        <th onclick="handleScreeningSortChange('scheduled_date')">
                            Scheduled Date
                            ${getSortIcon('scheduled_date')}
                        </th>
                        <th>Status</th>
                        <th>Result</th>
                        <th>Approved</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${OHState.preEmploymentScreenings.map(screening => `
                        <tr onclick="viewScreeningDetails('${screening.id}')" style="cursor: pointer;">
                            <td>
                                <div class="oh-candidate-info">
                                    <div class="oh-candidate-name">${screening.candidate_first_name} ${screening.candidate_last_name}</div>
                                    <div class="oh-candidate-email">${screening.candidate_email || 'N/A'}</div>
                                </div>
                            </td>
                            <td>${screening.position_title}</td>
                            <td>
                                <span class="oh-badge oh-badge-neutral">${screening.country_code}</span>
                            </td>
                            <td>${screening.scheduled_date ? formatDate(screening.scheduled_date) : 'Not scheduled'}</td>
                            <td>${renderStatusBadge(screening.status)}</td>
                            <td>${renderResultBadge(screening.overall_result)}</td>
                            <td>
                                ${screening.approved_for_hiring === true ?
                                    '<span class="oh-badge oh-badge-success">✓ Yes</span>' :
                                    screening.approved_for_hiring === false ?
                                    '<span class="oh-badge oh-badge-danger">✗ No</span>' :
                                    '<span class="oh-badge oh-badge-neutral">Pending</span>'
                                }
                            </td>
                            <td onclick="event.stopPropagation()">
                                <div class="oh-table-actions">
                                    <button
                                        class="oh-btn-icon oh-btn-icon-primary"
                                        onclick="viewScreeningDetails('${screening.id}')"
                                        title="View Details"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>
                                    <button
                                        class="oh-btn-icon oh-btn-icon-secondary"
                                        onclick="showEditScreeningModal('${screening.id}')"
                                        title="Edit"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button
                                        class="oh-btn-icon oh-btn-icon-danger"
                                        onclick="confirmDeleteScreening('${screening.id}')"
                                        title="Delete"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderStatusBadge(status) {
    const statusMap = {
        scheduled: { label: 'Scheduled', class: 'oh-badge-info' },
        in_progress: { label: 'In Progress', class: 'oh-badge-warning' },
        completed: { label: 'Completed', class: 'oh-badge-success' },
        cancelled: { label: 'Cancelled', class: 'oh-badge-neutral' }
    };

    const s = statusMap[status] || { label: status || 'Unknown', class: 'oh-badge-neutral' };
    return `<span class="oh-badge ${s.class}">${s.label}</span>`;
}

function renderResultBadge(result) {
    if (!result) return '<span class="oh-badge oh-badge-neutral">Pending</span>';

    const resultMap = {
        pass: { label: 'Pass', class: 'oh-badge-success' },
        fail: { label: 'Fail', class: 'oh-badge-danger' },
        conditional: { label: 'Conditional', class: 'oh-badge-warning' },
        pending: { label: 'Pending', class: 'oh-badge-neutral' }
    };

    const r = resultMap[result] || { label: result, class: 'oh-badge-neutral' };
    return `<span class="oh-badge ${r.class}">${r.label}</span>`;
}

function renderScreeningPagination() {
    const { page, total, limit } = OHState.screeningPagination;
    const totalPages = Math.ceil(total / limit);

    if (totalPages <= 1) return '';

    return `
        <div class="oh-pagination">
            <button
                class="oh-pagination-btn"
                ${page === 1 ? 'disabled' : ''}
                onclick="changeScreeningPage(${page - 1})"
            >
                Previous
            </button>
            <span class="oh-pagination-info">
                Page ${page} of ${totalPages} (${total} total)
            </span>
            <button
                class="oh-pagination-btn"
                ${page === totalPages ? 'disabled' : ''}
                onclick="changeScreeningPage(${page + 1})"
            >
                Next
            </button>
        </div>
    `;
}

// Event Handlers
async function loadPreEmploymentScreenings() {
    try {
        const filters = {};
        if (OHState.screeningFilters.status !== 'all') filters.status = OHState.screeningFilters.status;
        if (OHState.screeningFilters.country !== 'all') filters.country_code = OHState.screeningFilters.country;
        if (OHState.screeningFilters.overallResult !== 'all') filters.overall_result = OHState.screeningFilters.overallResult;
        if (OHState.screeningFilters.search) filters.search = OHState.screeningFilters.search;
        if (OHState.screeningFilters.dateFrom) filters.dateFrom = OHState.screeningFilters.dateFrom;
        if (OHState.screeningFilters.dateTo) filters.dateTo = OHState.screeningFilters.dateTo;

        const response = await OccupationalHealthAPI.getPreEmploymentScreenings(
            filters,
            OHState.screeningPagination.page,
            OHState.screeningPagination.limit,
            OHState.screeningSorting
        );

        if (response.success) {
            OHState.preEmploymentScreenings = response.data;
            OHState.screeningPagination = response.pagination;
        }
    } catch (error) {
        console.error('Error loading screenings:', error);
        showOHNotification('Error loading screenings', 'error');
    }
}

async function handleScreeningFilterChange(field, value) {
    OHState.screeningFilters[field] = value;
    OHState.screeningPagination.page = 1; // Reset to first page

    // Reload screening types if country changed
    if (field === 'country') {
        const typesResponse = await OccupationalHealthAPI.getScreeningTypes(value === 'all' ? '*' : value);
        OHState.screeningTypes = typesResponse.success ? typesResponse.data : [];
    }

    await renderPreEmploymentView();
}

async function clearScreeningFilters() {
    OHState.screeningFilters = {
        status: 'all',
        country: 'all',
        overallResult: 'all',
        screeningTypeId: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    };
    OHState.screeningPagination.page = 1;
    await renderPreEmploymentView();
}

async function changeScreeningPage(newPage) {
    OHState.screeningPagination.page = newPage;
    await renderPreEmploymentView();
}

async function handleScreeningSortChange(field) {
    if (OHState.screeningSorting.field === field) {
        // Toggle order
        OHState.screeningSorting.order = OHState.screeningSorting.order === 'ASC' ? 'DESC' : 'ASC';
    } else {
        OHState.screeningSorting.field = field;
        OHState.screeningSorting.order = 'ASC';
    }
    await renderPreEmploymentView();
}

function getSortIcon(field) {
    if (OHState.screeningSorting.field !== field) {
        return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"></path></svg>';
    }
    return OHState.screeningSorting.order === 'ASC' ?
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"></path></svg>' :
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"></path></svg>';
}

// ============================================================================
// SCREENING MODALS (Create/Edit)
// ============================================================================

function showCreateScreeningModal() {
    OHState.selectedScreening = null;
    renderScreeningModal('create');
}

async function showEditScreeningModal(id) {
    try {
        showLoadingState();
        const response = await OccupationalHealthAPI.getPreEmploymentScreening(id);

        if (response.success) {
            OHState.selectedScreening = response.data;
            renderScreeningModal('edit');
        }

        hideLoadingState();
    } catch (error) {
        console.error('Error loading screening:', error);
        showOHNotification('Error loading screening details', 'error');
        hideLoadingState();
    }
}

async function renderScreeningModal(mode = 'create') {
    const screening = OHState.selectedScreening;
    const isEdit = mode === 'edit';

    // Load screening types for current country
    const country = isEdit ? screening.country_code : (OHState.screeningFilters.country !== 'all' ? OHState.screeningFilters.country : 'US');
    const typesResponse = await OccupationalHealthAPI.getScreeningTypes(country);
    const screeningTypes = typesResponse.success ? typesResponse.data : [];

    // Countries list
    const countries = [
        { code: 'US', name: 'United States' },
        { code: 'MX', name: 'Mexico' },
        { code: 'AR', name: 'Argentina' },
        { code: 'BR', name: 'Brazil' },
        { code: 'CL', name: 'Chile' },
        { code: 'CO', name: 'Colombia' },
        { code: 'PE', name: 'Peru' },
        { code: 'DE', name: 'Germany' },
        { code: 'ES', name: 'Spain' },
        { code: 'FR', name: 'France' },
        { code: 'GB', name: 'United Kingdom' }
    ];

    const modalHTML = `
        <div class="oh-modal-overlay" id="screening-modal-overlay" onclick="closeScreeningModal(event)">
            <div class="oh-modal oh-modal-large" onclick="event.stopPropagation()">
                <div class="oh-modal-header">
                    <h2 class="oh-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <path d="M20 8v6M23 11h-6"></path>
                        </svg>
                        ${isEdit ? 'Edit Pre-Employment Screening' : 'New Pre-Employment Screening'}
                    </h2>
                    <button class="oh-modal-close" onclick="closeScreeningModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form id="screening-form" onsubmit="handleScreeningSubmit(event)">
                    <div class="oh-modal-body">
                        <!-- Section 1: Candidate Information -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">👤 Candidate Information</h3>
                            <div class="oh-form-grid">
                                <div class="oh-form-group">
                                    <label class="oh-form-label">First Name *</label>
                                    <input
                                        type="text"
                                        name="candidate_first_name"
                                        class="oh-form-input"
                                        value="${isEdit ? screening.candidate_first_name : ''}"
                                        required
                                        placeholder="John"
                                    />
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Last Name *</label>
                                    <input
                                        type="text"
                                        name="candidate_last_name"
                                        class="oh-form-input"
                                        value="${isEdit ? screening.candidate_last_name : ''}"
                                        required
                                        placeholder="Doe"
                                    />
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Email *</label>
                                    <input
                                        type="email"
                                        name="candidate_email"
                                        class="oh-form-input"
                                        value="${isEdit ? (screening.candidate_email || '') : ''}"
                                        required
                                        placeholder="john.doe@example.com"
                                    />
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Phone</label>
                                    <input
                                        type="tel"
                                        name="candidate_phone"
                                        class="oh-form-input"
                                        value="${isEdit ? (screening.candidate_phone || '') : ''}"
                                        placeholder="+1-555-0100"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Section 2: Position Information -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">💼 Position Information</h3>
                            <div class="oh-form-grid">
                                <div class="oh-form-group oh-form-group-full">
                                    <label class="oh-form-label">Position Title *</label>
                                    <input
                                        type="text"
                                        name="position_title"
                                        class="oh-form-input"
                                        value="${isEdit ? screening.position_title : ''}"
                                        required
                                        placeholder="Software Engineer"
                                    />
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Department</label>
                                    <input
                                        type="text"
                                        name="department"
                                        class="oh-form-input"
                                        value="${isEdit ? (screening.department || '') : ''}"
                                        placeholder="Engineering"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Section 3: Screening Details -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">🏥 Screening Details</h3>
                            <div class="oh-form-grid">
                                <div class="oh-form-group">
                                    <label class="oh-form-label">Country *</label>
                                    <select
                                        name="country_code"
                                        class="oh-form-select"
                                        required
                                        onchange="handleCountryChange(this.value)"
                                    >
                                        ${countries.map(c => `
                                            <option value="${c.code}" ${isEdit && screening.country_code === c.code ? 'selected' : (c.code === country ? 'selected' : '')}>
                                                ${c.name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Screening Type *</label>
                                    <select
                                        name="screening_type_id"
                                        id="screening-type-select"
                                        class="oh-form-select"
                                        required
                                    >
                                        <option value="">Select screening type...</option>
                                        ${screeningTypes.map(type => `
                                            <option value="${type.id}" ${isEdit && screening.screening_type_id === type.id ? 'selected' : ''}>
                                                ${type.name_i18n?.en || type.code}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Scheduled Date</label>
                                    <input
                                        type="date"
                                        name="scheduled_date"
                                        class="oh-form-input"
                                        value="${isEdit && screening.scheduled_date ? screening.scheduled_date.split('T')[0] : ''}"
                                    />
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Status</label>
                                    <select
                                        name="status"
                                        class="oh-form-select"
                                    >
                                        <option value="scheduled" ${isEdit && screening.status === 'scheduled' ? 'selected' : 'selected'}>Scheduled</option>
                                        <option value="in_progress" ${isEdit && screening.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                        <option value="completed" ${isEdit && screening.status === 'completed' ? 'selected' : ''}>Completed</option>
                                        <option value="cancelled" ${isEdit && screening.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        ${isEdit ? `
                        <!-- Section 4: Results (Edit Only) -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">✅ Results & Approval</h3>
                            <div class="oh-form-grid">
                                <div class="oh-form-group">
                                    <label class="oh-form-label">Overall Result</label>
                                    <select
                                        name="overall_result"
                                        class="oh-form-select"
                                    >
                                        <option value="">Pending</option>
                                        <option value="pass" ${screening.overall_result === 'pass' ? 'selected' : ''}>Pass</option>
                                        <option value="fail" ${screening.overall_result === 'fail' ? 'selected' : ''}>Fail</option>
                                        <option value="conditional" ${screening.overall_result === 'conditional' ? 'selected' : ''}>Conditional</option>
                                    </select>
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Completed Date</label>
                                    <input
                                        type="date"
                                        name="completed_date"
                                        class="oh-form-input"
                                        value="${screening.completed_date ? screening.completed_date.split('T')[0] : ''}"
                                    />
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">
                                        <input
                                            type="checkbox"
                                            name="has_restrictions"
                                            ${screening.has_restrictions ? 'checked' : ''}
                                            style="width: auto; margin-right: 8px;"
                                        />
                                        Has Work Restrictions
                                    </label>
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">
                                        <input
                                            type="checkbox"
                                            name="approved_for_hiring"
                                            ${screening.approved_for_hiring ? 'checked' : ''}
                                            style="width: auto; margin-right: 8px;"
                                        />
                                        Approved for Hiring
                                    </label>
                                </div>
                            </div>

                            <div class="oh-form-group oh-form-group-full">
                                <label class="oh-form-label">Restrictions Description</label>
                                <textarea
                                    name="restrictions_description"
                                    class="oh-form-textarea"
                                    rows="3"
                                    placeholder="Describe any work restrictions or accommodations needed..."
                                >${screening.restrictions_description || ''}</textarea>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Section 5: Notes -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">📝 Additional Notes</h3>
                            <div class="oh-form-group oh-form-group-full">
                                <label class="oh-form-label">Notes</label>
                                <textarea
                                    name="notes"
                                    class="oh-form-textarea"
                                    rows="4"
                                    placeholder="Additional information, special requirements, etc..."
                                >${isEdit ? (screening.notes || '') : ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="oh-modal-footer">
                        <button type="button" class="oh-btn oh-btn-ghost" onclick="closeScreeningModal()">
                            Cancel
                        </button>
                        <button type="submit" class="oh-btn oh-btn-primary" id="screening-submit-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            ${isEdit ? 'Update Screening' : 'Create Screening'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Inject modal into DOM
    const existingModal = document.getElementById('screening-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Focus first input
    setTimeout(() => {
        const firstInput = document.querySelector('#screening-form input');
        if (firstInput) firstInput.focus();
    }, 100);
}

async function handleCountryChange(countryCode) {
    try {
        const response = await OccupationalHealthAPI.getScreeningTypes(countryCode);
        const screeningTypes = response.success ? response.data : [];

        const select = document.getElementById('screening-type-select');
        if (!select) return;

        select.innerHTML = '<option value="">Select screening type...</option>' +
            screeningTypes.map(type => `
                <option value="${type.id}">
                    ${type.name_i18n?.en || type.code}
                </option>
            `).join('');
    } catch (error) {
        console.error('Error loading screening types:', error);
    }
}

async function handleScreeningSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = document.getElementById('screening-submit-btn');
    const originalBtnText = submitBtn.innerHTML;

    // Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Saving...</span>';

    try {
        // Gather form data
        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            if (key === 'has_restrictions' || key === 'approved_for_hiring') {
                data[key] = formData.get(key) === 'on';
            } else if (value !== '') {
                data[key] = value;
            }
        });

        // Validate
        const validation = validateScreeningForm(data);
        if (!validation.valid) {
            showOHNotification(validation.message, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        // Submit
        const isEdit = OHState.selectedScreening !== null;
        let response;

        if (isEdit) {
            response = await OccupationalHealthAPI.updatePreEmploymentScreening(OHState.selectedScreening.id, data);
        } else {
            response = await OccupationalHealthAPI.createPreEmploymentScreening(data);
        }

        if (response.success) {
            showOHNotification(
                isEdit ? 'Screening updated successfully' : 'Screening created successfully',
                'success'
            );
            closeScreeningModal();
            await renderPreEmploymentView();
        }

    } catch (error) {
        console.error('Error submitting screening:', error);
        showOHNotification(error.message || 'Error saving screening', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function validateScreeningForm(data) {
    if (!data.candidate_first_name || !data.candidate_last_name) {
        return { valid: false, message: 'Candidate first and last name are required' };
    }

    if (!data.candidate_email) {
        return { valid: false, message: 'Candidate email is required' };
    }

    if (!data.position_title) {
        return { valid: false, message: 'Position title is required' };
    }

    if (!data.country_code) {
        return { valid: false, message: 'Country is required' };
    }

    if (!data.screening_type_id) {
        return { valid: false, message: 'Screening type is required' };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.candidate_email)) {
        return { valid: false, message: 'Invalid email format' };
    }

    return { valid: true };
}

function closeScreeningModal(event) {
    if (event && event.target.id !== 'screening-modal-overlay') return;

    const modal = document.getElementById('screening-modal-overlay');
    if (modal) {
        modal.remove();
    }

    OHState.selectedScreening = null;
}

// ============================================================================
// SCREENING DETAILS PANEL (Part 3)
// ============================================================================

async function viewScreeningDetails(id) {
    try {
        showLoadingState();
        const response = await OccupationalHealthAPI.getPreEmploymentScreening(id);

        if (response.success) {
            OHState.selectedScreening = response.data;
            renderScreeningDetailsPanel();
        }

        hideLoadingState();
    } catch (error) {
        console.error('Error loading screening details:', error);
        showOHNotification('Error loading screening details', 'error');
        hideLoadingState();
    }
}

function renderScreeningDetailsPanel() {
    const screening = OHState.selectedScreening;
    if (!screening) return;

    const panelHTML = `
        <div class="oh-details-overlay" id="screening-details-overlay" onclick="closeScreeningDetails(event)">
            <div class="oh-details-panel" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="oh-details-header">
                    <div class="oh-details-header-content">
                        <div class="oh-details-header-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <path d="M20 8v6M23 11h-6"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 class="oh-details-title">${screening.candidate_first_name} ${screening.candidate_last_name}</h2>
                            <p class="oh-details-subtitle">${screening.position_title} • ${screening.country_code}</p>
                        </div>
                    </div>
                    <div class="oh-details-header-actions">
                        <button class="oh-btn oh-btn-ghost oh-btn-sm" onclick="showEditScreeningModal('${screening.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                        </button>
                        <button class="oh-btn oh-btn-ghost oh-btn-sm" onclick="closeScreeningDetails()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="oh-details-tabs">
                    <button class="oh-details-tab active" data-tab="info" onclick="switchDetailsTab('info')">
                        Information
                    </button>
                    <button class="oh-details-tab" data-tab="results" onclick="switchDetailsTab('results')">
                        Results
                    </button>
                    <button class="oh-details-tab" data-tab="documents" onclick="switchDetailsTab('documents')">
                        Documents (${screening.documents_count || 0})
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="oh-details-body">
                    <!-- Tab: Information -->
                    <div class="oh-details-tab-content active" data-tab-content="info">
                        ${renderScreeningInfoTab(screening)}
                    </div>

                    <!-- Tab: Results -->
                    <div class="oh-details-tab-content" data-tab-content="results">
                        ${renderScreeningResultsTab(screening)}
                    </div>

                    <!-- Tab: Documents -->
                    <div class="oh-details-tab-content" data-tab-content="documents">
                        ${renderScreeningDocumentsTab(screening)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inject panel into DOM
    const existingPanel = document.getElementById('screening-details-overlay');
    if (existingPanel) {
        existingPanel.remove();
    }

    document.body.insertAdjacentHTML('beforeend', panelHTML);
}

function renderScreeningInfoTab(screening) {
    return `
        <div class="oh-details-section">
            <h3 class="oh-details-section-title">Candidate Information</h3>
            <div class="oh-details-grid">
                <div class="oh-details-field">
                    <label>Full Name</label>
                    <div>${screening.candidate_first_name} ${screening.candidate_last_name}</div>
                </div>
                <div class="oh-details-field">
                    <label>Email</label>
                    <div>${screening.candidate_email || 'N/A'}</div>
                </div>
                <div class="oh-details-field">
                    <label>Phone</label>
                    <div>${screening.candidate_phone || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="oh-details-section">
            <h3 class="oh-details-section-title">Position Details</h3>
            <div class="oh-details-grid">
                <div class="oh-details-field">
                    <label>Position Title</label>
                    <div>${screening.position_title}</div>
                </div>
                <div class="oh-details-field">
                    <label>Department</label>
                    <div>${screening.department || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="oh-details-section">
            <h3 class="oh-details-section-title">Screening Details</h3>
            <div class="oh-details-grid">
                <div class="oh-details-field">
                    <label>Country</label>
                    <div><span class="oh-badge oh-badge-neutral">${screening.country_code}</span></div>
                </div>
                <div class="oh-details-field">
                    <label>Screening Type</label>
                    <div>${screening.screening_type_name || `Type ID: ${screening.screening_type_id}`}</div>
                </div>
                <div class="oh-details-field">
                    <label>Scheduled Date</label>
                    <div>${screening.scheduled_date ? formatDate(screening.scheduled_date) : 'Not scheduled'}</div>
                </div>
                <div class="oh-details-field">
                    <label>Status</label>
                    <div>${renderStatusBadge(screening.status)}</div>
                </div>
            </div>
        </div>

        ${screening.notes ? `
        <div class="oh-details-section">
            <h3 class="oh-details-section-title">Notes</h3>
            <div class="oh-details-notes">${screening.notes}</div>
        </div>
        ` : ''}

        <div class="oh-details-section">
            <h3 class="oh-details-section-title">Metadata</h3>
            <div class="oh-details-grid">
                <div class="oh-details-field">
                    <label>Created</label>
                    <div>${formatDate(screening.created_at)}</div>
                </div>
                <div class="oh-details-field">
                    <label>Last Updated</label>
                    <div>${formatDate(screening.updated_at)}</div>
                </div>
                <div class="oh-details-field">
                    <label>Created By</label>
                    <div>${screening.created_by_name || 'System'}</div>
                </div>
            </div>
        </div>
    `;
}

function renderScreeningResultsTab(screening) {
    return `
        <div class="oh-details-section">
            <h3 class="oh-details-section-title">Overall Results</h3>
            <div class="oh-details-grid">
                <div class="oh-details-field">
                    <label>Overall Result</label>
                    <div>${renderResultBadge(screening.overall_result)}</div>
                </div>
                <div class="oh-details-field">
                    <label>Completed Date</label>
                    <div>${screening.completed_date ? formatDate(screening.completed_date) : 'Pending'}</div>
                </div>
                <div class="oh-details-field">
                    <label>Has Work Restrictions</label>
                    <div>${screening.has_restrictions ?
                        '<span class="oh-badge oh-badge-warning">Yes</span>' :
                        '<span class="oh-badge oh-badge-success">No</span>'
                    }</div>
                </div>
                <div class="oh-details-field">
                    <label>Approved for Hiring</label>
                    <div>${screening.approved_for_hiring === true ?
                        '<span class="oh-badge oh-badge-success">✓ Yes</span>' :
                        screening.approved_for_hiring === false ?
                        '<span class="oh-badge oh-badge-danger">✗ No</span>' :
                        '<span class="oh-badge oh-badge-neutral">Pending</span>'
                    }</div>
                </div>
            </div>
        </div>

        ${screening.restrictions_description ? `
        <div class="oh-details-section">
            <h3 class="oh-details-section-title">Work Restrictions</h3>
            <div class="oh-details-notes">${screening.restrictions_description}</div>
        </div>
        ` : ''}

        ${screening.result_details ? `
        <div class="oh-details-section">
            <h3 class="oh-details-section-title">Detailed Results</h3>
            <div class="oh-details-json">
                <pre>${JSON.stringify(screening.result_details, null, 2)}</pre>
            </div>
        </div>
        ` : `
        <div class="oh-details-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
            </svg>
            <p>Results pending</p>
            <small>Edit screening to add results</small>
        </div>
        `}
    `;
}

function renderScreeningDocumentsTab(screening) {
    return `
        <!-- Upload Area -->
        <div class="oh-details-section">
            <div class="oh-upload-area" id="document-upload-area">
                <input
                    type="file"
                    id="document-upload-input"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    style="display: none;"
                    onchange="handleDocumentUpload(event)"
                />
                <div class="oh-upload-content" onclick="document.getElementById('document-upload-input').click()">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p>Click to upload documents</p>
                    <small>PDF, JPG, PNG, DOC (max 10MB per file)</small>
                </div>
            </div>
        </div>

        <!-- Documents List -->
        <div class="oh-details-section">
            <h3 class="oh-details-section-title">Uploaded Documents (${screening.documents_count || 0})</h3>
            <div id="documents-list">
                ${screening.documents && screening.documents.length > 0 ?
                    renderDocumentsList(screening.documents) :
                    `<div class="oh-details-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        <p>No documents uploaded</p>
                        <small>Upload documents above</small>
                    </div>`
                }
            </div>
        </div>
    `;
}

function renderDocumentsList(documents) {
    return `
        <div class="oh-documents-list">
            ${documents.map(doc => `
                <div class="oh-document-item">
                    <div class="oh-document-icon">
                        ${getDocumentIcon(doc.file_type)}
                    </div>
                    <div class="oh-document-info">
                        <div class="oh-document-name">${doc.file_name}</div>
                        <div class="oh-document-meta">
                            ${doc.file_size ? formatFileSize(doc.file_size) : 'Unknown size'} •
                            Uploaded ${formatDate(doc.uploaded_at)}
                        </div>
                    </div>
                    <div class="oh-document-actions">
                        <button
                            class="oh-btn-icon oh-btn-icon-primary"
                            onclick="downloadDocument('${doc.id}')"
                            title="Download"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                        <button
                            class="oh-btn-icon oh-btn-icon-danger"
                            onclick="confirmDeleteDocument('${OHState.selectedScreening.id}', '${doc.id}')"
                            title="Delete"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getDocumentIcon(fileType) {
    const type = fileType?.toLowerCase() || '';

    if (type.includes('pdf')) {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>`;
    } else if (type.includes('image') || type.includes('jpg') || type.includes('png')) {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
        </svg>`;
    } else if (type.includes('word') || type.includes('doc')) {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2980b9" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
        </svg>`;
    } else {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
        </svg>`;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function switchDetailsTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.oh-details-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.oh-details-tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.tabContent === tabName);
    });
}

async function handleDocumentUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const screeningId = OHState.selectedScreening.id;

    for (const file of files) {
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            showOHNotification(`File ${file.name} is too large (max 10MB)`, 'error');
            continue;
        }

        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('file_name', file.name);
            formData.append('file_type', file.type);

            showOHNotification(`Uploading ${file.name}...`, 'info');

            const response = await OccupationalHealthAPI.uploadScreeningDocument(screeningId, formData);

            if (response.success) {
                showOHNotification(`${file.name} uploaded successfully`, 'success');

                // Reload screening details
                await viewScreeningDetails(screeningId);
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            showOHNotification(`Error uploading ${file.name}`, 'error');
        }
    }

    // Clear input
    event.target.value = '';
}

function downloadDocument(documentId) {
    showOHNotification('Download functionality - TO BE IMPLEMENTED', 'info');
    // TODO: Implement document download
}

async function confirmDeleteDocument(screeningId, documentId) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        await OccupationalHealthAPI.deleteScreeningDocument(screeningId, documentId);
        showOHNotification('Document deleted successfully', 'success');

        // Reload screening details
        await viewScreeningDetails(screeningId);
    } catch (error) {
        console.error('Error deleting document:', error);
        showOHNotification('Error deleting document', 'error');
    }
}

function closeScreeningDetails(event) {
    if (event && event.target.id !== 'screening-details-overlay') return;

    const panel = document.getElementById('screening-details-overlay');
    if (panel) {
        panel.remove();
    }

    OHState.selectedScreening = null;
}

async function confirmDeleteScreening(id) {
    if (!confirm('Are you sure you want to delete this screening?')) return;

    try {
        await OccupationalHealthAPI.deletePreEmploymentScreening(id);
        showOHNotification('Screening deleted successfully', 'success');
        await renderPreEmploymentView();
    } catch (error) {
        console.error('Error deleting screening:', error);
        showOHNotification('Error deleting screening', 'error');
    }
}

// ============================================================================
// WORKERS' COMPENSATION CLAIMS MANAGEMENT (v6.0)
// ============================================================================

async function renderWorkersCompensationView() {
    const contentArea = document.getElementById('oh-main-content');
    if (!contentArea) return;

    showLoadingState();

    try {
        // Load claim types for filter
        const typesResponse = await OccupationalHealthAPI.getClaimTypes(OHState.claimFilters.country || '*');
        OHState.claimTypes = typesResponse.success ? typesResponse.data : [];

        // Load claims
        await loadWorkersCompensationClaims();

        contentArea.innerHTML = `
            <div class="oh-view-header">
                <div class="oh-view-title-section">
                    <h2 class="oh-view-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 10px;">
                            <path d="M9 11l3 3L22 4"></path>
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                        </svg>
                        Workers' Compensation Claims
                    </h2>
                    <p class="oh-view-subtitle">Multi-country work accident & injury claims management (OSHA, ART, IMSS)</p>
                </div>
                <div class="oh-view-actions">
                    <button class="oh-btn oh-btn-primary" onclick="showCreateClaimModal()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Claim
                    </button>
                </div>
            </div>

            <!-- Filters -->
            ${renderClaimFilters()}

            <!-- Claims Table -->
            ${renderClaimsTable()}

            <!-- Pagination -->
            ${renderClaimPagination()}
        `;

        hideLoadingState();

    } catch (error) {
        console.error('Error rendering workers compensation view:', error);
        showOHNotification('Error loading claims', 'error');
        hideLoadingState();
    }
}

function renderClaimFilters() {
    const countries = [
        { code: 'all', name: 'All Countries' },
        { code: 'US', name: 'United States (OSHA)' },
        { code: 'AR', name: 'Argentina (ART)' },
        { code: 'MX', name: 'Mexico (IMSS)' },
        { code: 'BR', name: 'Brazil (CAT)' },
        { code: 'ES', name: 'Spain (Mutua)' }
    ];

    return `
        <div class="oh-filters-card">
            <div class="oh-filters-row">
                <div class="oh-filter-group">
                    <label class="oh-filter-label">Search</label>
                    <input
                        type="text"
                        class="oh-filter-input"
                        placeholder="Claim number, employee ID, description..."
                        value="${OHState.claimFilters.search || ''}"
                        oninput="handleClaimFilterChange('search', this.value)"
                    />
                </div>

                <div class="oh-filter-group">
                    <label class="oh-filter-label">Country</label>
                    <select class="oh-filter-select" onchange="handleClaimFilterChange('country', this.value)">
                        ${countries.map(c => `
                            <option value="${c.code}" ${OHState.claimFilters.country === c.code ? 'selected' : ''}>
                                ${c.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="oh-filter-group">
                    <label class="oh-filter-label">Status</label>
                    <select class="oh-filter-select" onchange="handleClaimFilterChange('status', this.value)">
                        <option value="all" ${OHState.claimFilters.status === 'all' ? 'selected' : ''}>All</option>
                        <option value="reported" ${OHState.claimFilters.status === 'reported' ? 'selected' : ''}>Reported</option>
                        <option value="under_review" ${OHState.claimFilters.status === 'under_review' ? 'selected' : ''}>Under Review</option>
                        <option value="approved" ${OHState.claimFilters.status === 'approved' ? 'selected' : ''}>Approved</option>
                        <option value="rejected" ${OHState.claimFilters.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        <option value="in_treatment" ${OHState.claimFilters.status === 'in_treatment' ? 'selected' : ''}>In Treatment</option>
                        <option value="closed" ${OHState.claimFilters.status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select>
                </div>

                <div class="oh-filter-group">
                    <label class="oh-filter-label">Incident Date From</label>
                    <input
                        type="date"
                        class="oh-filter-input"
                        value="${OHState.claimFilters.dateFrom || ''}"
                        onchange="handleClaimFilterChange('dateFrom', this.value)"
                    />
                </div>

                <div class="oh-filter-group">
                    <label class="oh-filter-label">Incident Date To</label>
                    <input
                        type="date"
                        class="oh-filter-input"
                        value="${OHState.claimFilters.dateTo || ''}"
                        onchange="handleClaimFilterChange('dateTo', this.value)"
                    />
                </div>

                <div class="oh-filter-group">
                    <button class="oh-btn oh-btn-ghost" onclick="clearClaimFilters()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Clear Filters
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderClaimsTable() {
    if (!OHState.workersCompensationClaims || OHState.workersCompensationClaims.length === 0) {
        return `
            <div class="oh-empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
                <h3>No claims found</h3>
                <p>Create your first workers' compensation claim or adjust filters</p>
                <button class="oh-btn oh-btn-primary" onclick="showCreateClaimModal()">
                    Create Claim
                </button>
            </div>
        `;
    }

    return `
        <div class="oh-card">
            <table class="oh-table oh-table-hover">
                <thead>
                    <tr>
                        <th onclick="handleClaimSortChange('claim_number')">
                            Claim #
                            ${getClaimSortIcon('claim_number')}
                        </th>
                        <th onclick="handleClaimSortChange('employee_id')">
                            Employee
                            ${getClaimSortIcon('employee_id')}
                        </th>
                        <th onclick="handleClaimSortChange('incident_date')">
                            Incident Date
                            ${getClaimSortIcon('incident_date')}
                        </th>
                        <th onclick="handleClaimSortChange('country_code')">
                            Country
                            ${getClaimSortIcon('country_code')}
                        </th>
                        <th>Status</th>
                        <th>Severity</th>
                        <th>Days Lost</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${OHState.workersCompensationClaims.map(claim => `
                        <tr onclick="viewClaimDetails('${claim.id}')" style="cursor: pointer;">
                            <td>
                                <div class="oh-claim-number">${claim.claim_number || 'N/A'}</div>
                            </td>
                            <td>
                                <div class="oh-employee-info">
                                    <div class="oh-employee-id">${claim.employee_id}</div>
                                    <div class="oh-employee-dept">${claim.department || 'N/A'}</div>
                                </div>
                            </td>
                            <td>${claim.incident_date ? formatDate(claim.incident_date) : 'N/A'}</td>
                            <td>
                                <span class="oh-badge oh-badge-neutral">${claim.country_code}</span>
                            </td>
                            <td>${renderClaimStatusBadge(claim.status)}</td>
                            <td>${renderSeverityBadge(claim.severity_level)}</td>
                            <td>${claim.work_days_lost || 0} days</td>
                            <td onclick="event.stopPropagation()">
                                <div class="oh-table-actions">
                                    <button
                                        class="oh-btn-icon oh-btn-icon-primary"
                                        onclick="viewClaimDetails('${claim.id}')"
                                        title="View Details"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>
                                    <button
                                        class="oh-btn-icon oh-btn-icon-secondary"
                                        onclick="showEditClaimModal('${claim.id}')"
                                        title="Edit"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button
                                        class="oh-btn-icon oh-btn-icon-danger"
                                        onclick="confirmDeleteClaim('${claim.id}')"
                                        title="Delete"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderClaimStatusBadge(status) {
    const statusMap = {
        reported: { label: 'Reported', class: 'oh-badge-info' },
        under_review: { label: 'Under Review', class: 'oh-badge-warning' },
        approved: { label: 'Approved', class: 'oh-badge-success' },
        rejected: { label: 'Rejected', class: 'oh-badge-danger' },
        in_treatment: { label: 'In Treatment', class: 'oh-badge-warning' },
        closed: { label: 'Closed', class: 'oh-badge-neutral' },
        appealed: { label: 'Appealed', class: 'oh-badge-info' }
    };

    const s = statusMap[status] || { label: status || 'Unknown', class: 'oh-badge-neutral' };
    return `<span class="oh-badge ${s.class}">${s.label}</span>`;
}

function renderSeverityBadge(severity) {
    if (!severity) return '<span class="oh-badge oh-badge-neutral">N/A</span>';

    const severityMap = {
        low: { label: 'Low', class: 'oh-badge-success' },
        medium: { label: 'Medium', class: 'oh-badge-warning' },
        high: { label: 'High', class: 'oh-badge-danger' },
        critical: { label: 'Critical', class: 'oh-badge-danger' }
    };

    const sev = severityMap[severity] || { label: severity, class: 'oh-badge-neutral' };
    return `<span class="oh-badge ${sev.class}">${sev.label}</span>`;
}

function renderClaimPagination() {
    const { page, total, limit } = OHState.claimPagination;
    const totalPages = Math.ceil(total / limit);

    if (totalPages <= 1) return '';

    return `
        <div class="oh-pagination">
            <button
                class="oh-pagination-btn"
                ${page === 1 ? 'disabled' : ''}
                onclick="changeClaimPage(${page - 1})"
            >
                Previous
            </button>
            <span class="oh-pagination-info">
                Page ${page} of ${totalPages} (${total} total)
            </span>
            <button
                class="oh-pagination-btn"
                ${page === totalPages ? 'disabled' : ''}
                onclick="changeClaimPage(${page + 1})"
            >
                Next
            </button>
        </div>
    `;
}

// Event Handlers
async function loadWorkersCompensationClaims() {
    try {
        const filters = {};
        if (OHState.claimFilters.status !== 'all') filters.status = OHState.claimFilters.status;
        if (OHState.claimFilters.country !== 'all') filters.country_code = OHState.claimFilters.country;
        if (OHState.claimFilters.search) filters.search = OHState.claimFilters.search;
        if (OHState.claimFilters.dateFrom) filters.dateFrom = OHState.claimFilters.dateFrom;
        if (OHState.claimFilters.dateTo) filters.dateTo = OHState.claimFilters.dateTo;

        const response = await OccupationalHealthAPI.getWorkersCompensationClaims(
            filters,
            OHState.claimPagination.page,
            OHState.claimPagination.limit,
            OHState.claimSorting
        );

        if (response.success) {
            OHState.workersCompensationClaims = response.data;
            OHState.claimPagination = response.pagination;
        }
    } catch (error) {
        console.error('Error loading claims:', error);
        showOHNotification('Error loading claims', 'error');
    }
}

async function handleClaimFilterChange(field, value) {
    OHState.claimFilters[field] = value;
    OHState.claimPagination.page = 1; // Reset to first page

    // Reload claim types if country changed
    if (field === 'country') {
        const typesResponse = await OccupationalHealthAPI.getClaimTypes(value === 'all' ? '*' : value);
        OHState.claimTypes = typesResponse.success ? typesResponse.data : [];
    }

    await renderWorkersCompensationView();
}

async function clearClaimFilters() {
    OHState.claimFilters = {
        status: 'all',
        country: 'all',
        dateFrom: '',
        dateTo: '',
        search: ''
    };
    OHState.claimPagination.page = 1;
    await renderWorkersCompensationView();
}

async function changeClaimPage(newPage) {
    OHState.claimPagination.page = newPage;
    await renderWorkersCompensationView();
}

async function handleClaimSortChange(field) {
    if (OHState.claimSorting.field === field) {
        // Toggle order
        OHState.claimSorting.order = OHState.claimSorting.order === 'ASC' ? 'DESC' : 'ASC';
    } else {
        OHState.claimSorting.field = field;
        OHState.claimSorting.order = 'ASC';
    }
    await renderWorkersCompensationView();
}

function getClaimSortIcon(field) {
    if (OHState.claimSorting.field !== field) {
        return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"></path></svg>';
    }
    return OHState.claimSorting.order === 'ASC' ?
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"></path></svg>' :
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"></path></svg>';
}

// Claim Modal Functions
function showCreateClaimModal() {
    OHState.selectedClaim = null;
    renderClaimModal('create');
}

async function showEditClaimModal(id) {
    try {
        showLoadingState();
        const response = await OccupationalHealthAPI.getWorkersCompensationClaim(id);

        if (response.success) {
            OHState.selectedClaim = response.data;
            renderClaimModal('edit');
        }

        hideLoadingState();
    } catch (error) {
        console.error('Error loading claim:', error);
        showOHNotification('Error loading claim details', 'error');
        hideLoadingState();
    }
}

async function renderClaimModal(mode = 'create') {
    const claim = OHState.selectedClaim;
    const isEdit = mode === 'edit';

    // Load claim types for current country
    const country = isEdit ? claim.country_code : (OHState.claimFilters.country !== 'all' ? OHState.claimFilters.country : 'US');
    const typesResponse = await OccupationalHealthAPI.getClaimTypes(country);
    const claimTypes = typesResponse.success ? typesResponse.data : [];

    // Countries list
    const countries = [
        { code: 'US', name: 'United States (OSHA)' },
        { code: 'AR', name: 'Argentina (ART)' },
        { code: 'MX', name: 'Mexico (IMSS)' },
        { code: 'BR', name: 'Brazil (CAT)' },
        { code: 'ES', name: 'Spain (Mutua)' }
    ];

    const modalHTML = `
        <div class="oh-modal-overlay" id="claim-modal-overlay" onclick="closeClaimModal(event)">
            <div class="oh-modal oh-modal-large" onclick="event.stopPropagation()">
                <div class="oh-modal-header">
                    <h2 class="oh-modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                            <path d="M9 11l3 3L22 4"></path>
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                        </svg>
                        ${isEdit ? 'Edit Workers\' Compensation Claim' : 'New Workers\' Compensation Claim'}
                    </h2>
                    <button class="oh-modal-close" onclick="closeClaimModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form id="claim-form" onsubmit="handleClaimSubmit(event)">
                    <div class="oh-modal-body">
                        ${isEdit ? `
                        <div class="oh-form-section">
                            <div class="oh-info-banner oh-info-banner-info">
                                📋 <strong>Claim Number:</strong> ${claim.claim_number || 'Auto-generated'}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Section 1: Employee Information -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">👤 Employee Information</h3>
                            <div class="oh-form-grid">
                                <div class="oh-form-group">
                                    <label class="oh-form-label">Employee ID *</label>
                                    <input
                                        type="text"
                                        name="employee_id"
                                        class="oh-form-input"
                                        value="${isEdit ? claim.employee_id : ''}"
                                        required
                                        placeholder="EMP-001"
                                    />
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Department</label>
                                    <input
                                        type="text"
                                        name="department"
                                        class="oh-form-input"
                                        value="${isEdit ? (claim.department || '') : ''}"
                                        placeholder="Production"
                                    />
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Supervisor Name</label>
                                    <input
                                        type="text"
                                        name="supervisor_name"
                                        class="oh-form-input"
                                        value="${isEdit ? (claim.supervisor_name || '') : ''}"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Section 2: Incident Information -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">⚠️ Incident Information</h3>
                            <div class="oh-form-grid">
                                <div class="oh-form-group">
                                    <label class="oh-form-label">Incident Date *</label>
                                    <input
                                        type="date"
                                        name="incident_date"
                                        class="oh-form-input"
                                        value="${isEdit && claim.incident_date ? claim.incident_date.split('T')[0] : ''}"
                                        required
                                    />
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Incident Time</label>
                                    <input
                                        type="time"
                                        name="incident_time"
                                        class="oh-form-input"
                                        value="${isEdit && claim.incident_time ? claim.incident_time : ''}"
                                    />
                                </div>

                                <div class="oh-form-group oh-form-group-full">
                                    <label class="oh-form-label">Incident Location *</label>
                                    <input
                                        type="text"
                                        name="incident_location"
                                        class="oh-form-input"
                                        value="${isEdit ? (claim.incident_location || '') : ''}"
                                        required
                                        placeholder="Factory floor, Section A"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Section 3: Claim Type & Classification -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">🏥 Claim Type & Classification</h3>
                            <div class="oh-form-grid">
                                <div class="oh-form-group">
                                    <label class="oh-form-label">Country *</label>
                                    <select
                                        name="country_code"
                                        class="oh-form-select"
                                        required
                                        onchange="handleClaimCountryChange(this.value)"
                                    >
                                        ${countries.map(c => `
                                            <option value="${c.code}" ${isEdit && claim.country_code === c.code ? 'selected' : (c.code === country ? 'selected' : '')}>
                                                ${c.name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Claim Type *</label>
                                    <select
                                        name="claim_type_id"
                                        id="claim-type-select"
                                        class="oh-form-select"
                                        required
                                    >
                                        <option value="">Select claim type...</option>
                                        ${claimTypes.map(type => `
                                            <option value="${type.id}" ${isEdit && claim.claim_type_id === type.id ? 'selected' : ''}>
                                                ${type.name_i18n?.en || type.type_code}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="oh-form-group oh-form-group-full">
                                    <label class="oh-form-label">Injury/Illness Description *</label>
                                    <textarea
                                        name="injury_description"
                                        class="oh-form-textarea"
                                        rows="3"
                                        required
                                        placeholder="Detailed description of the injury or illness..."
                                    >${isEdit ? (claim.injury_description || '') : ''}</textarea>
                                </div>
                            </div>
                        </div>

                        <!-- Section 4: Medical Treatment -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">💊 Medical Treatment</h3>
                            <div class="oh-form-grid">
                                <div class="oh-form-group">
                                    <label class="oh-form-label">
                                        <input
                                            type="checkbox"
                                            name="medical_treatment_required"
                                            ${isEdit && claim.medical_treatment_required ? 'checked' : ''}
                                            style="width: auto; margin-right: 8px;"
                                        />
                                        Medical Treatment Required
                                    </label>
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Work Days Lost</label>
                                    <input
                                        type="number"
                                        name="work_days_lost"
                                        class="oh-form-input"
                                        value="${isEdit ? (claim.work_days_lost || 0) : 0}"
                                        min="0"
                                        placeholder="0"
                                    />
                                </div>

                                <div class="oh-form-group oh-form-group-full">
                                    <label class="oh-form-label">Medical Treatment Details</label>
                                    <textarea
                                        name="medical_treatment_details"
                                        class="oh-form-textarea"
                                        rows="3"
                                        placeholder="Description of medical treatment received..."
                                    >${isEdit ? (claim.medical_treatment_details || '') : ''}</textarea>
                                </div>
                            </div>
                        </div>

                        ${isEdit ? `
                        <!-- Section 5: Status & Resolution (Edit Only) -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">✅ Status & Resolution</h3>
                            <div class="oh-form-grid">
                                <div class="oh-form-group">
                                    <label class="oh-form-label">Status</label>
                                    <select
                                        name="status"
                                        class="oh-form-select"
                                    >
                                        <option value="reported" ${claim.status === 'reported' ? 'selected' : ''}>Reported</option>
                                        <option value="under_review" ${claim.status === 'under_review' ? 'selected' : ''}>Under Review</option>
                                        <option value="approved" ${claim.status === 'approved' ? 'selected' : ''}>Approved</option>
                                        <option value="rejected" ${claim.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                                        <option value="in_treatment" ${claim.status === 'in_treatment' ? 'selected' : ''}>In Treatment</option>
                                        <option value="closed" ${claim.status === 'closed' ? 'selected' : ''}>Closed</option>
                                        <option value="appealed" ${claim.status === 'appealed' ? 'selected' : ''}>Appealed</option>
                                    </select>
                                </div>

                                <div class="oh-form-group">
                                    <label class="oh-form-label">Resolution Date</label>
                                    <input
                                        type="date"
                                        name="resolution_date"
                                        class="oh-form-input"
                                        value="${claim.resolution_date ? claim.resolution_date.split('T')[0] : ''}"
                                    />
                                </div>

                                <div class="oh-form-group oh-form-group-full">
                                    <label class="oh-form-label">Resolution Notes</label>
                                    <textarea
                                        name="resolution_notes"
                                        class="oh-form-textarea"
                                        rows="3"
                                        placeholder="Notes about resolution..."
                                    >${claim.resolution_notes || ''}</textarea>
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Section 6: Additional Information -->
                        <div class="oh-form-section">
                            <h3 class="oh-form-section-title">📝 Additional Information</h3>
                            <div class="oh-form-group oh-form-group-full">
                                <label class="oh-form-label">Notes</label>
                                <textarea
                                    name="notes"
                                    class="oh-form-textarea"
                                    rows="4"
                                    placeholder="Additional notes or comments..."
                                >${isEdit ? (claim.notes || '') : ''}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="oh-modal-footer">
                        <button type="button" class="oh-btn oh-btn-ghost" onclick="closeClaimModal()">
                            Cancel
                        </button>
                        <button type="submit" class="oh-btn oh-btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            ${isEdit ? 'Update Claim' : 'Create Claim'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('claim-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function handleClaimCountryChange(country) {
    try {
        const typesResponse = await OccupationalHealthAPI.getClaimTypes(country);
        const claimTypes = typesResponse.success ? typesResponse.data : [];

        const selectElement = document.getElementById('claim-type-select');
        if (selectElement) {
            selectElement.innerHTML = `
                <option value="">Select claim type...</option>
                ${claimTypes.map(type => `
                    <option value="${type.id}">
                        ${type.name_i18n?.en || type.type_code}
                    </option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading claim types:', error);
    }
}

async function handleClaimSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        employee_id: formData.get('employee_id'),
        incident_date: formData.get('incident_date'),
        incident_time: formData.get('incident_time') || null,
        incident_location: formData.get('incident_location'),
        department: formData.get('department') || null,
        supervisor_name: formData.get('supervisor_name') || null,
        claim_type_id: parseInt(formData.get('claim_type_id')),
        country_code: formData.get('country_code'),
        injury_description: formData.get('injury_description'),
        medical_treatment_required: formData.get('medical_treatment_required') === 'on',
        work_days_lost: parseInt(formData.get('work_days_lost')) || 0,
        medical_treatment_details: formData.get('medical_treatment_details') || null,
        notes: formData.get('notes') || null
    };

    // Add edit-only fields
    if (OHState.selectedClaim) {
        data.status = formData.get('status');
        data.resolution_date = formData.get('resolution_date') || null;
        data.resolution_notes = formData.get('resolution_notes') || null;
    }

    try {
        showLoadingState();

        let response;
        if (OHState.selectedClaim) {
            response = await OccupationalHealthAPI.updateWorkersCompensationClaim(OHState.selectedClaim.id, data);
            showOHNotification('Claim updated successfully', 'success');
        } else {
            response = await OccupationalHealthAPI.createWorkersCompensationClaim(data);
            showOHNotification('Claim created successfully', 'success');
        }

        closeClaimModal();
        await renderWorkersCompensationView();
        hideLoadingState();

    } catch (error) {
        console.error('Error submitting claim:', error);
        showOHNotification(error.message || 'Error saving claim', 'error');
        hideLoadingState();
    }
}

function closeClaimModal(event) {
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('claim-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

async function viewClaimDetails(id) {
    try {
        showLoadingState();
        const response = await OccupationalHealthAPI.getWorkersCompensationClaim(id);

        if (!response.success) {
            throw new Error(response.message || 'Failed to load claim');
        }

        const claim = response.data;
        OHState.selectedClaim = claim;

        // Render details panel
        renderClaimDetailsPanel(claim);
        hideLoadingState();

    } catch (error) {
        console.error('Error viewing claim details:', error);
        showOHNotification('Error loading claim details', 'error');
        hideLoadingState();
    }
}

async function renderClaimDetailsPanel(claim) {
    const panelHTML = `
        <div class="oh-details-overlay" onclick="closeClaimDetails()"></div>
        <div class="oh-details-panel">
            <div class="oh-details-header">
                <div class="oh-details-header-content">
                    <h2 class="oh-details-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                            <path d="M9 11l3 3L22 4"></path>
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                        </svg>
                        ${claim.claim_number || 'Claim Details'}
                    </h2>
                    <div class="oh-details-subtitle">
                        Employee: ${claim.employee_id} | ${renderClaimStatusBadge(claim.status)}
                    </div>
                </div>
                <button class="oh-details-close" onclick="closeClaimDetails()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="oh-details-tabs">
                <button class="oh-details-tab active" data-tab="info" onclick="switchClaimTab('info')">
                    Information
                </button>
                <button class="oh-details-tab" data-tab="history" onclick="switchClaimTab('history')">
                    Status History
                </button>
                <button class="oh-details-tab" data-tab="documents" onclick="switchClaimTab('documents')">
                    Documents (${claim.documents?.length || 0})
                </button>
            </div>

            <div class="oh-details-content">
                <div class="oh-details-tab-content active" id="claim-tab-info">
                    ${renderClaimInfoTab(claim)}
                </div>
                <div class="oh-details-tab-content" id="claim-tab-history">
                    <div class="oh-loading-message">Loading status history...</div>
                </div>
                <div class="oh-details-tab-content" id="claim-tab-documents">
                    ${renderClaimDocumentsTab(claim)}
                </div>
            </div>
        </div>
    `;

    const existing = document.querySelector('.oh-details-overlay');
    if (existing) {
        existing.remove();
        document.querySelector('.oh-details-panel')?.remove();
    }

    document.body.insertAdjacentHTML('beforeend', panelHTML);
}

function renderClaimInfoTab(claim) {
    return `
        <div class="oh-details-section">
            <h3 class="oh-details-section-title">👤 Employee Information</h3>
            <div class="oh-details-grid">
                <div class="oh-details-field">
                    <label>Employee ID</label>
                    <div>${claim.employee_id}</div>
                </div>
                <div class="oh-details-field">
                    <label>Department</label>
                    <div>${claim.department || 'N/A'}</div>
                </div>
                <div class="oh-details-field">
                    <label>Supervisor</label>
                    <div>${claim.supervisor_name || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="oh-details-section">
            <h3 class="oh-details-section-title">⚠️ Incident Information</h3>
            <div class="oh-details-grid">
                <div class="oh-details-field">
                    <label>Incident Date</label>
                    <div>${claim.incident_date ? formatDate(claim.incident_date) : 'N/A'}</div>
                </div>
                <div class="oh-details-field">
                    <label>Incident Time</label>
                    <div>${claim.incident_time || 'N/A'}</div>
                </div>
                <div class="oh-details-field">
                    <label>Location</label>
                    <div>${claim.incident_location || 'N/A'}</div>
                </div>
                <div class="oh-details-field">
                    <label>Country</label>
                    <div><span class="oh-badge oh-badge-neutral">${claim.country_code}</span></div>
                </div>
            </div>
            <div class="oh-details-field oh-details-field-full">
                <label>Injury/Illness Description</label>
                <div>${claim.injury_description || 'N/A'}</div>
            </div>
        </div>

        <div class="oh-details-section">
            <h3 class="oh-details-section-title">💊 Medical Treatment</h3>
            <div class="oh-details-grid">
                <div class="oh-details-field">
                    <label>Medical Treatment Required</label>
                    <div>${claim.medical_treatment_required ? '<span class="oh-badge oh-badge-success">Yes</span>' : '<span class="oh-badge oh-badge-neutral">No</span>'}</div>
                </div>
                <div class="oh-details-field">
                    <label>Work Days Lost</label>
                    <div>${claim.work_days_lost || 0} days</div>
                </div>
                <div class="oh-details-field">
                    <label>Severity Level</label>
                    <div>${renderSeverityBadge(claim.severity_level)}</div>
                </div>
            </div>
            ${claim.medical_treatment_details ? `
            <div class="oh-details-field oh-details-field-full">
                <label>Treatment Details</label>
                <div>${claim.medical_treatment_details}</div>
            </div>
            ` : ''}
        </div>

        ${claim.resolution_date || claim.resolution_notes ? `
        <div class="oh-details-section">
            <h3 class="oh-details-section-title">✅ Resolution</h3>
            <div class="oh-details-grid">
                ${claim.resolution_date ? `
                <div class="oh-details-field">
                    <label>Resolution Date</label>
                    <div>${formatDate(claim.resolution_date)}</div>
                </div>
                ` : ''}
            </div>
            ${claim.resolution_notes ? `
            <div class="oh-details-field oh-details-field-full">
                <label>Resolution Notes</label>
                <div>${claim.resolution_notes}</div>
            </div>
            ` : ''}
        </div>
        ` : ''}

        ${claim.notes ? `
        <div class="oh-details-section">
            <h3 class="oh-details-section-title">📝 Additional Notes</h3>
            <div class="oh-details-field oh-details-field-full">
                <div>${claim.notes}</div>
            </div>
        </div>
        ` : ''}
    `;
}

function renderClaimDocumentsTab(claim) {
    const documents = claim.documents || [];

    return `
        <div class="oh-documents-section">
            <div class="oh-upload-area" onclick="document.getElementById('claim-doc-upload-${claim.id}').click()">
                <input
                    type="file"
                    id="claim-doc-upload-${claim.id}"
                    style="display: none;"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onchange="handleClaimDocumentUpload(event, '${claim.id}')"
                />
                <div class="oh-upload-content">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p class="oh-upload-title">Click to upload document</p>
                    <p class="oh-upload-subtitle">PDF, JPG, PNG, DOC, DOCX (max 15MB)</p>
                </div>
            </div>

            ${documents.length > 0 ? `
            <div class="oh-documents-list">
                <h4 class="oh-documents-list-title">Uploaded Documents</h4>
                ${documents.map(doc => `
                    <div class="oh-document-item">
                        <div class="oh-document-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path>
                                <polyline points="13 2 13 9 20 9"></polyline>
                            </svg>
                        </div>
                        <div class="oh-document-info">
                            <div class="oh-document-name">${doc.file_name}</div>
                            <div class="oh-document-meta">
                                ${doc.document_type || 'Document'} • ${formatFileSize(doc.file_size)} • ${formatDate(doc.uploaded_at)}
                            </div>
                        </div>
                        <div class="oh-document-actions">
                            <button
                                class="oh-btn-icon oh-btn-icon-danger"
                                onclick="confirmDeleteClaimDocument('${doc.id}')"
                                title="Delete"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : '<div class="oh-empty-message">No documents uploaded yet</div>'}
        </div>
    `;
}

async function switchClaimTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.oh-details-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.oh-details-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const selectedContent = document.getElementById(`claim-tab-${tabName}`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }

    // Load status history if needed
    if (tabName === 'history' && OHState.selectedClaim) {
        await loadClaimStatusHistory(OHState.selectedClaim.id);
    }
}

async function loadClaimStatusHistory(claimId) {
    try {
        const response = await OccupationalHealthAPI.getClaimStatusHistory(claimId);
        const history = response.success ? response.data : [];

        const historyContent = document.getElementById('claim-tab-history');
        if (!historyContent) return;

        if (history.length === 0) {
            historyContent.innerHTML = '<div class="oh-empty-message">No status changes recorded</div>';
            return;
        }

        historyContent.innerHTML = `
            <div class="oh-timeline">
                ${history.map(item => `
                    <div class="oh-timeline-item">
                        <div class="oh-timeline-marker"></div>
                        <div class="oh-timeline-content">
                            <div class="oh-timeline-header">
                                <span class="oh-timeline-status">
                                    ${renderClaimStatusBadge(item.previous_status)} → ${renderClaimStatusBadge(item.new_status)}
                                </span>
                                <span class="oh-timeline-date">${formatDate(item.changed_at)}</span>
                            </div>
                            ${item.notes ? `<div class="oh-timeline-notes">${item.notes}</div>` : ''}
                            ${item.changed_by ? `<div class="oh-timeline-user">Changed by: ${item.changed_by}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading status history:', error);
        const historyContent = document.getElementById('claim-tab-history');
        if (historyContent) {
            historyContent.innerHTML = '<div class="oh-error-message">Error loading status history</div>';
        }
    }
}

async function handleClaimDocumentUpload(event, claimId) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
        showOHNotification('File size exceeds 15MB limit', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', 'medical_report'); // Default type

    try {
        showLoadingState();
        await OccupationalHealthAPI.uploadClaimDocument(claimId, formData);
        showOHNotification('Document uploaded successfully', 'success');

        // Refresh claim details
        await viewClaimDetails(claimId);
        switchClaimTab('documents');

        hideLoadingState();
    } catch (error) {
        console.error('Error uploading document:', error);
        showOHNotification('Error uploading document', 'error');
        hideLoadingState();
    }
}

async function confirmDeleteClaimDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        await OccupationalHealthAPI.deleteClaimDocument(documentId);
        showOHNotification('Document deleted successfully', 'success');

        // Refresh claim details
        if (OHState.selectedClaim) {
            await viewClaimDetails(OHState.selectedClaim.id);
            switchClaimTab('documents');
        }
    } catch (error) {
        console.error('Error deleting document:', error);
        showOHNotification('Error deleting document', 'error');
    }
}

function closeClaimDetails() {
    const overlay = document.querySelector('.oh-details-overlay');
    const panel = document.querySelector('.oh-details-panel');

    if (overlay) overlay.remove();
    if (panel) panel.remove();

    OHState.selectedClaim = null;
}

async function confirmDeleteClaim(id) {
    if (!confirm('Are you sure you want to delete this claim?')) return;

    try {
        await OccupationalHealthAPI.deleteWorkersCompensationClaim(id);
        showOHNotification('Claim deleted successfully', 'success');
        await renderWorkersCompensationView();
    } catch (error) {
        console.error('Error deleting claim:', error);
        showOHNotification('Error deleting claim', 'error');
    }
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================================================
// AUTO-INITIALIZE ON MODULE LOAD
// ============================================================================
console.log('✅ [OH] Occupational Health Enterprise Module v6.0 loaded successfully');
console.log('🎹 [OH] Keyboard shortcuts enabled: Ctrl+S (Save), Esc (Cancel), Ctrl+F (Search), Ctrl+N (New)');

// Export for global access
window.OccupationalHealth = {
    init: initOccupationalHealthDashboard,
    API: OccupationalHealthAPI,
    Views: OHViews,
    State: OHState
};
