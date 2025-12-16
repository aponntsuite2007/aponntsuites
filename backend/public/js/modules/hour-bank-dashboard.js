/**
 * ============================================================================
 * HOUR BANK DASHBOARD - Sistema de Banco de Horas Enterprise
 * ============================================================================
 *
 * Módulo SSOT (Single Source of Truth) para gestión de banco de horas.
 * Dashboard completo con métricas, gráficos y administración de plantillas.
 *
 * CARACTERÍSTICAS:
 * - Vista jerárquica: Empresa → Sucursal → Departamento → Empleado
 * - Métricas y KPIs en tiempo real
 * - Gráficos de balance acreedor/deudor
 * - Configuración de plantillas por sucursal
 * - Módulo comercial opcional (Plug & Play)
 *
 * @version 1.0.0
 * @date 2025-12-15
 * @author Sistema Biométrico Enterprise
 * ============================================================================
 */

(function() {
    'use strict';

    const MODULE_KEY = 'hour-bank';
    const MODULE_NAME = 'Banco de Horas';
    const API_BASE = '/api/hour-bank';

    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================
    const state = {
        initialized: false,
        loading: false,
        currentView: 'dashboard', // dashboard, employees, templates, reports
        currentLevel: 'company',  // company, branch, department, employee

        // Filtros
        filters: {
            branchId: null,
            departmentId: null,
            dateFrom: null,
            dateTo: null,
            balanceType: 'all' // all, positive, negative
        },

        // Datos
        companyMetrics: null,
        branchMetrics: [],
        departmentMetrics: [],
        employeeBalances: [],
        templates: [],
        transactions: [],
        fichajes: [],
        departments: [],
        sectors: [],

        // Paginación
        pagination: {
            page: 1,
            limit: 20,
            total: 0
        },

        // Usuario y empresa
        user: null,
        company: null
    };

    // =========================================================================
    // ESTILOS - Dark Theme Enterprise
    // =========================================================================
    function injectStyles() {
        if (document.getElementById('hour-bank-dashboard-styles')) return;

        const style = document.createElement('style');
        style.id = 'hour-bank-dashboard-styles';
        style.textContent = `
            /* ============================================
               HOUR BANK DASHBOARD - Dark Theme Enterprise
               ============================================ */

            .hb-dashboard {
                min-height: calc(100vh - 60px);
                background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f1419 100%);
                padding: 20px;
                color: #e0e0e0;
                font-family: 'Inter', 'Segoe UI', sans-serif;
            }

            /* Header */
            .hb-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #00c896 0%, #00a67d 50%, #008f6b 100%);
                padding: 20px 25px;
                border-radius: 16px;
                margin-bottom: 20px;
                box-shadow: 0 8px 32px rgba(0, 200, 150, 0.3);
                position: relative;
                overflow: hidden;
            }

            .hb-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                opacity: 0.5;
            }

            .hb-header-content {
                position: relative;
                z-index: 1;
            }

            .hb-header h1 {
                margin: 0;
                font-size: 1.8rem;
                font-weight: 700;
                color: white;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .hb-header-subtitle {
                color: rgba(255,255,255,0.85);
                font-size: 0.9rem;
                margin-top: 5px;
            }

            .hb-tech-badges {
                display: flex;
                gap: 10px;
                position: relative;
                z-index: 1;
            }

            .hb-badge {
                background: rgba(255,255,255,0.15);
                backdrop-filter: blur(10px);
                padding: 8px 14px;
                border-radius: 20px;
                font-size: 0.75rem;
                color: white;
                display: flex;
                align-items: center;
                gap: 6px;
                border: 1px solid rgba(255,255,255,0.2);
            }

            /* Navigation Tabs */
            .hb-nav {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
                background: rgba(20, 20, 35, 0.8);
                padding: 8px;
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.05);
            }

            .hb-nav-item {
                padding: 12px 20px;
                border-radius: 8px;
                border: none;
                background: transparent;
                color: #888;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .hb-nav-item:hover {
                background: rgba(0, 200, 150, 0.1);
                color: #00e5a0;
            }

            .hb-nav-item.active {
                background: linear-gradient(135deg, #00c896 0%, #00a67d 100%);
                color: white;
                box-shadow: 0 4px 15px rgba(0, 200, 150, 0.3);
            }

            /* Metrics Grid */
            .hb-metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .hb-metric-card {
                background: linear-gradient(145deg, rgba(25, 25, 40, 0.9), rgba(15, 15, 25, 0.95));
                border-radius: 16px;
                padding: 20px;
                border: 1px solid rgba(255,255,255,0.05);
                position: relative;
                overflow: hidden;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }

            .hb-metric-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }

            .hb-metric-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: var(--metric-color, #00e5a0);
            }

            .hb-metric-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.4rem;
                margin-bottom: 12px;
                background: var(--metric-bg, rgba(0, 229, 160, 0.15));
                color: var(--metric-color, #00e5a0);
            }

            .hb-metric-value {
                font-size: 2rem;
                font-weight: 700;
                color: white;
                margin-bottom: 4px;
            }

            .hb-metric-label {
                font-size: 0.85rem;
                color: #888;
            }

            .hb-metric-change {
                position: absolute;
                top: 16px;
                right: 16px;
                font-size: 0.8rem;
                padding: 4px 10px;
                border-radius: 20px;
            }

            .hb-metric-change.positive {
                background: rgba(0, 200, 150, 0.15);
                color: #00e5a0;
            }

            .hb-metric-change.negative {
                background: rgba(255, 82, 82, 0.15);
                color: #ff5252;
            }

            /* Content Panels */
            .hb-panel {
                background: linear-gradient(145deg, rgba(25, 25, 40, 0.9), rgba(15, 15, 25, 0.95));
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.05);
                margin-bottom: 20px;
                overflow: hidden;
            }

            .hb-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                background: rgba(0,0,0,0.2);
            }

            .hb-panel-title {
                font-size: 1rem;
                font-weight: 600;
                color: white;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .hb-panel-body {
                padding: 20px;
            }

            /* Hierarchy Navigation */
            .hb-breadcrumb {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 20px;
                font-size: 0.9rem;
            }

            .hb-breadcrumb-item {
                color: #888;
                cursor: pointer;
                transition: color 0.3s;
            }

            .hb-breadcrumb-item:hover {
                color: #00e5a0;
            }

            .hb-breadcrumb-item.active {
                color: #00e5a0;
                font-weight: 600;
            }

            .hb-breadcrumb-separator {
                color: #555;
            }

            /* Data Table */
            .hb-table {
                width: 100%;
                border-collapse: collapse;
            }

            .hb-table th {
                text-align: left;
                padding: 14px 16px;
                background: rgba(0,0,0,0.3);
                color: #888;
                font-weight: 600;
                font-size: 0.8rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }

            .hb-table td {
                padding: 14px 16px;
                border-bottom: 1px solid rgba(255,255,255,0.03);
                font-size: 0.9rem;
            }

            .hb-table tr:hover td {
                background: rgba(0, 200, 150, 0.05);
            }

            .hb-table tr {
                cursor: pointer;
                transition: background 0.3s;
            }

            /* Balance Indicator */
            .hb-balance {
                font-weight: 700;
                font-size: 1rem;
            }

            .hb-balance.positive {
                color: #00e5a0;
            }

            .hb-balance.negative {
                color: #ff5252;
            }

            .hb-balance.neutral {
                color: #ffc107;
            }

            /* Progress Bar */
            .hb-progress-container {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                overflow: hidden;
                position: relative;
            }

            .hb-progress-bar {
                height: 100%;
                border-radius: 4px;
                transition: width 0.5s ease;
            }

            .hb-progress-bar.positive {
                background: linear-gradient(90deg, #00e5a0, #00c896);
            }

            .hb-progress-bar.negative {
                background: linear-gradient(90deg, #ff5252, #ff1744);
            }

            /* Chart Container */
            .hb-chart-container {
                height: 300px;
                position: relative;
            }

            /* Buttons */
            .hb-btn {
                padding: 10px 20px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 500;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .hb-btn-primary {
                background: linear-gradient(135deg, #00c896 0%, #00a67d 100%);
                color: white;
            }

            .hb-btn-primary:hover {
                box-shadow: 0 4px 15px rgba(0, 200, 150, 0.4);
                transform: translateY(-2px);
            }

            .hb-btn-secondary {
                background: rgba(255,255,255,0.1);
                color: #e0e0e0;
                border: 1px solid rgba(255,255,255,0.1);
            }

            .hb-btn-secondary:hover {
                background: rgba(255,255,255,0.15);
            }

            /* Filters */
            .hb-filters {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 20px;
            }

            .hb-filter-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .hb-filter-label {
                font-size: 0.75rem;
                color: #888;
                text-transform: uppercase;
            }

            .hb-select, .hb-input {
                background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 10px 14px;
                color: #e0e0e0;
                font-size: 0.9rem;
                min-width: 150px;
            }

            .hb-select:focus, .hb-input:focus {
                outline: none;
                border-color: #00e5a0;
                box-shadow: 0 0 0 3px rgba(0, 229, 160, 0.1);
            }

            /* Template Card */
            .hb-template-card {
                background: rgba(0,0,0,0.2);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(255,255,255,0.05);
                margin-bottom: 16px;
            }

            .hb-template-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
            }

            .hb-template-name {
                font-size: 1.1rem;
                font-weight: 600;
                color: white;
            }

            .hb-template-code {
                font-size: 0.8rem;
                color: #888;
                background: rgba(255,255,255,0.05);
                padding: 4px 10px;
                border-radius: 4px;
            }

            .hb-template-params {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 12px;
            }

            .hb-template-param {
                background: rgba(255,255,255,0.03);
                padding: 12px;
                border-radius: 8px;
            }

            .hb-template-param-label {
                font-size: 0.75rem;
                color: #888;
                margin-bottom: 4px;
            }

            .hb-template-param-value {
                font-size: 0.95rem;
                color: #e0e0e0;
                font-weight: 500;
            }

            /* Loading */
            .hb-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px 20px;
                color: #888;
            }

            .hb-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(0, 229, 160, 0.1);
                border-top-color: #00e5a0;
                border-radius: 50%;
                animation: hb-spin 1s linear infinite;
                margin-bottom: 16px;
            }

            @keyframes hb-spin {
                to { transform: rotate(360deg); }
            }

            /* Empty State */
            .hb-empty {
                text-align: center;
                padding: 60px 20px;
                color: #888;
            }

            .hb-empty i {
                font-size: 3rem;
                margin-bottom: 16px;
                opacity: 0.5;
            }

            /* ============================================
               FICHAJES VIEW - Tabla Compacta
               ============================================ */

            /* Tabla compacta para fichajes */
            .hb-table-compact {
                font-size: 0.75rem;
            }

            .hb-table-compact th {
                padding: 8px 6px;
                font-size: 0.7rem;
                white-space: nowrap;
            }

            .hb-table-compact td,
            .hb-td-compact {
                padding: 6px;
                font-size: 0.75rem;
                white-space: nowrap;
            }

            /* Columnas de horas extras */
            .hb-col-extras {
                background: rgba(255, 152, 0, 0.05);
                text-align: center;
                min-width: 70px;
            }

            .hb-col-banco {
                background: rgba(0, 200, 150, 0.05);
                text-align: center;
                min-width: 70px;
            }

            .hb-col-extras.hb-has-value {
                background: rgba(255, 152, 0, 0.15);
            }

            .hb-col-banco.hb-has-value {
                background: rgba(0, 200, 150, 0.15);
            }

            .hb-extras-value {
                color: #ff9800;
                font-weight: 600;
            }

            .hb-banco-value {
                color: #00e5a0;
                font-weight: 600;
            }

            /* Celda empleado compacta */
            .hb-employee-cell {
                display: flex;
                flex-direction: column;
                gap: 1px;
            }

            .hb-employee-name {
                font-weight: 500;
                color: #e0e0e0;
                font-size: 0.75rem;
            }

            .hb-employee-legajo {
                font-size: 0.65rem;
                color: #888;
            }

            /* Badges de estado */
            .hb-status-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.65rem;
                font-weight: 500;
                white-space: nowrap;
            }

            .hb-status-normal {
                background: rgba(100, 100, 100, 0.2);
                color: #888;
            }

            .hb-status-pending {
                background: rgba(255, 193, 7, 0.2);
                color: #ffc107;
            }

            .hb-status-bank {
                background: rgba(0, 200, 150, 0.2);
                color: #00e5a0;
            }

            .hb-status-paid {
                background: rgba(255, 152, 0, 0.2);
                color: #ff9800;
            }

            /* Controles compactos */
            .hb-compact {
                padding: 6px 10px;
                font-size: 0.8rem;
                min-width: 100px;
            }

            .hb-btn.hb-compact {
                padding: 6px 12px;
                font-size: 0.8rem;
            }

            /* Paginación */
            .hb-pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 12px;
                padding: 12px;
                border-top: 1px solid rgba(255,255,255,0.05);
            }

            .hb-pagination-info {
                color: #888;
                font-size: 0.85rem;
            }

            .hb-pagination button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .hb-header {
                    flex-direction: column;
                    gap: 16px;
                    text-align: center;
                }

                .hb-tech-badges {
                    justify-content: center;
                }

                .hb-nav {
                    overflow-x: auto;
                }

                .hb-metrics-grid {
                    grid-template-columns: 1fr 1fr;
                }

                .hb-table-compact th,
                .hb-table-compact td {
                    padding: 4px;
                    font-size: 0.65rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================================
    // API FUNCTIONS
    // =========================================================================
    const API = {
        getHeaders() {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        },

        async request(endpoint, options = {}) {
            try {
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    headers: this.getHeaders(),
                    ...options
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || error.error || 'API Error');
                }

                return await response.json();
            } catch (error) {
                console.error(`[HourBank API] ${endpoint}:`, error);
                throw error;
            }
        },

        // Métricas
        getCompanyMetrics: () => API.request('/metrics/company'),
        getBranchMetrics: () => API.request('/metrics/branches'),
        getDepartmentMetrics: (branchId) => API.request(`/metrics/departments?branchId=${branchId}`),

        // Balances - usando employees-list para filtros avanzados
        getEmployeeBalances: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return API.request(`/employees-list?${query}`);
        },
        getEmployeeDetail: (userId) => API.request(`/employee-summary/${userId}`),

        // Templates
        getTemplates: () => API.request('/templates'),
        getTemplate: (id) => API.request(`/templates/${id}`),
        saveTemplate: (data) => API.request('/templates', {
            method: data.id ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        }),
        initDefaults: () => API.request('/templates/init-defaults', { method: 'POST' }),

        // Transacciones
        getTransactions: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return API.request(`/transactions?${query}`);
        },

        // Reportes
        getReport: (type, params = {}) => {
            const query = new URLSearchParams(params).toString();
            return API.request(`/reports/${type}?${query}`);
        },

        // Fichajes con horas extras (SSOT)
        getFichajes: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return API.request(`/fichajes?${query}`);
        },

        // Departamentos y Sectores
        getDepartments: () => fetch('/api/departments', { headers: API.getHeaders() }).then(r => r.json()),
        getSectors: () => fetch('/api/sectors', { headers: API.getHeaders() }).then(r => r.json())
    };

    // =========================================================================
    // RENDER FUNCTIONS
    // =========================================================================

    function render() {
        const container = document.getElementById('mainContent');
        if (!container) return;

        injectStyles();

        container.innerHTML = `
            <div class="hb-dashboard">
                ${renderHeader()}
                ${renderNav()}
                <div id="hb-content">
                    ${renderLoading()}
                </div>
            </div>
        `;

        // Cargar datos iniciales
        loadDashboard();
    }

    function renderHeader() {
        return `
            <header class="hb-header">
                <div class="hb-header-content">
                    <h1>
                        <i class="fas fa-piggy-bank"></i>
                        HOUR BANK ENGINE
                    </h1>
                    <div class="hb-header-subtitle">
                        Sistema de Gestión de Banco de Horas Enterprise
                    </div>
                </div>
                <div class="hb-tech-badges">
                    <span class="hb-badge">
                        <i class="fas fa-database"></i> PostgreSQL
                    </span>
                    <span class="hb-badge">
                        <i class="fas fa-clock"></i> Real-time
                    </span>
                    <span class="hb-badge">
                        <i class="fas fa-chart-line"></i> Analytics
                    </span>
                </div>
            </header>
        `;
    }

    function renderNav() {
        const tabs = [
            { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
            { id: 'fichajes', icon: 'fa-clock', label: 'Fichajes' },
            { id: 'employees', icon: 'fa-users', label: 'Empleados' },
            { id: 'templates', icon: 'fa-cogs', label: 'Plantillas' },
            { id: 'reports', icon: 'fa-file-alt', label: 'Reportes' }
        ];

        return `
            <nav class="hb-nav">
                ${tabs.map(tab => `
                    <button class="hb-nav-item ${state.currentView === tab.id ? 'active' : ''}"
                            onclick="HourBankDashboard.switchView('${tab.id}')">
                        <i class="fas ${tab.icon}"></i>
                        ${tab.label}
                    </button>
                `).join('')}
            </nav>
        `;
    }

    function renderLoading() {
        return `
            <div class="hb-loading">
                <div class="hb-spinner"></div>
                <span>Cargando datos...</span>
            </div>
        `;
    }

    function renderDashboard() {
        const metrics = state.companyMetrics || {};

        // Calcular métricas derivadas
        const totalBalance = parseFloat(metrics.totalBalance || 0);
        const positiveBalance = totalBalance > 0 ? totalBalance : 0;
        const negativeBalance = totalBalance < 0 ? totalBalance : 0;
        const utilizationRate = metrics.totalAccrued > 0
            ? ((metrics.totalUsed || 0) / metrics.totalAccrued * 100)
            : 0;

        return `
            <!-- Métricas Principales -->
            <div class="hb-metrics-grid">
                <div class="hb-metric-card" style="--metric-color: #00e5a0; --metric-bg: rgba(0, 229, 160, 0.15);">
                    <div class="hb-metric-icon"><i class="fas fa-users"></i></div>
                    <div class="hb-metric-value">${metrics.totalEmployees || 0}</div>
                    <div class="hb-metric-label">Empleados con Banco</div>
                </div>

                <div class="hb-metric-card" style="--metric-color: #00bcd4; --metric-bg: rgba(0, 188, 212, 0.15);">
                    <div class="hb-metric-icon"><i class="fas fa-clock"></i></div>
                    <div class="hb-metric-value">${formatHours(metrics.totalAccrued || 0)}</div>
                    <div class="hb-metric-label">Total Horas Acumuladas</div>
                    <span class="hb-metric-change positive">Saldo: ${formatHours(totalBalance)}</span>
                </div>

                <div class="hb-metric-card" style="--metric-color: #4caf50; --metric-bg: rgba(76, 175, 80, 0.15);">
                    <div class="hb-metric-icon"><i class="fas fa-plus-circle"></i></div>
                    <div class="hb-metric-value">${metrics.employeesWithPositive || 0}</div>
                    <div class="hb-metric-label">Saldos Acreedores</div>
                    <span class="hb-metric-change positive">${formatHours(positiveBalance)}</span>
                </div>

                <div class="hb-metric-card" style="--metric-color: #ff5252; --metric-bg: rgba(255, 82, 82, 0.15);">
                    <div class="hb-metric-icon"><i class="fas fa-minus-circle"></i></div>
                    <div class="hb-metric-value">${metrics.employeesWithNegative || 0}</div>
                    <div class="hb-metric-label">Saldos Deudores</div>
                    <span class="hb-metric-change negative">${formatHours(negativeBalance)}</span>
                </div>

                <div class="hb-metric-card" style="--metric-color: #ffc107; --metric-bg: rgba(255, 193, 7, 0.15);">
                    <div class="hb-metric-icon"><i class="fas fa-exchange-alt"></i></div>
                    <div class="hb-metric-value">${metrics.pendingDecisions || 0}</div>
                    <div class="hb-metric-label">Decisiones Pendientes</div>
                </div>

                <div class="hb-metric-card" style="--metric-color: #9c27b0; --metric-bg: rgba(156, 39, 176, 0.15);">
                    <div class="hb-metric-icon"><i class="fas fa-percentage"></i></div>
                    <div class="hb-metric-value">${utilizationRate.toFixed(1)}%</div>
                    <div class="hb-metric-label">Tasa de Utilización</div>
                </div>
            </div>

            <!-- Gráfico de Balance y Sucursales -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <!-- Balance Global -->
                <div class="hb-panel">
                    <div class="hb-panel-header">
                        <span class="hb-panel-title">
                            <i class="fas fa-balance-scale"></i>
                            Balance Global
                        </span>
                    </div>
                    <div class="hb-panel-body">
                        <div style="display: flex; justify-content: space-around; align-items: center; padding: 20px 0;">
                            <div style="text-align: center;">
                                <div style="font-size: 2.5rem; font-weight: 700; color: #00e5a0;">
                                    +${formatHours(metrics.totalPositiveBalance || 0)}
                                </div>
                                <div style="color: #888; font-size: 0.9rem;">Total Acreedor</div>
                            </div>
                            <div style="width: 2px; height: 60px; background: rgba(255,255,255,0.1);"></div>
                            <div style="text-align: center;">
                                <div style="font-size: 2.5rem; font-weight: 700; color: #ff5252;">
                                    ${formatHours(metrics.totalNegativeBalance || 0)}
                                </div>
                                <div style="color: #888; font-size: 0.9rem;">Total Deudor</div>
                            </div>
                        </div>
                        <div class="hb-progress-container" style="margin-top: 20px;">
                            <div class="hb-progress-bar positive"
                                 style="width: ${calculateBalanceRatio(metrics)}%;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.8rem; color: #888;">
                            <span>Ratio: ${calculateBalanceRatio(metrics).toFixed(1)}% acreedor</span>
                            <span>Neto: ${formatHours((metrics.totalPositiveBalance || 0) + (metrics.totalNegativeBalance || 0))}</span>
                        </div>
                    </div>
                </div>

                <!-- Top Sucursales -->
                <div class="hb-panel">
                    <div class="hb-panel-header">
                        <span class="hb-panel-title">
                            <i class="fas fa-building"></i>
                            Balance por Sucursal
                        </span>
                    </div>
                    <div class="hb-panel-body">
                        ${renderBranchList()}
                    </div>
                </div>
            </div>

            <!-- Empleados con Mayor/Menor Balance -->
            <div class="hb-panel" style="margin-top: 20px;">
                <div class="hb-panel-header">
                    <span class="hb-panel-title">
                        <i class="fas fa-trophy"></i>
                        Top Empleados por Balance
                    </span>
                    <button class="hb-btn hb-btn-secondary" onclick="HourBankDashboard.switchView('employees')">
                        Ver todos <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="hb-panel-body">
                    ${renderTopEmployees()}
                </div>
            </div>
        `;
    }

    function renderBranchList() {
        const branches = state.branchMetrics || [];

        if (branches.length === 0) {
            return `<div class="hb-empty"><i class="fas fa-building"></i><p>No hay datos de sucursales</p></div>`;
        }

        return branches.slice(0, 5).map(branch => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);"
                 onclick="HourBankDashboard.drillDown('branch', '${branch.id}')"
                 style="cursor: pointer;">
                <div>
                    <div style="font-weight: 500; color: #e0e0e0;">${branch.name || 'Sin nombre'}</div>
                    <div style="font-size: 0.8rem; color: #888;">${branch.employeeCount || 0} empleados</div>
                </div>
                <div style="text-align: right;">
                    <div class="hb-balance ${branch.totalBalance >= 0 ? 'positive' : 'negative'}">
                        ${formatHours(branch.totalBalance || 0)}
                    </div>
                    <div style="font-size: 0.75rem; color: #888;">
                        ${branch.positiveCount || 0} <span style="color: #00e5a0;">+</span> /
                        ${branch.negativeCount || 0} <span style="color: #ff5252;">-</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderTopEmployees() {
        const employees = state.employeeBalances || [];

        if (employees.length === 0) {
            return `<div class="hb-empty"><i class="fas fa-users"></i><p>No hay datos de empleados</p></div>`;
        }

        // Dividir en mayores acreedores y deudores
        const sorted = [...employees].sort((a, b) => b.balance - a.balance);
        const topPositive = sorted.filter(e => e.balance > 0).slice(0, 3);
        const topNegative = sorted.filter(e => e.balance < 0).slice(-3).reverse();

        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <h4 style="color: #00e5a0; margin-bottom: 12px; font-size: 0.9rem;">
                        <i class="fas fa-arrow-up"></i> Mayores Acreedores
                    </h4>
                    ${topPositive.map((emp, i) => `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                            <span style="color: #00e5a0; font-weight: 700; width: 20px;">#${i + 1}</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${emp.name || 'N/A'}</div>
                                <div style="font-size: 0.75rem; color: #888;">${emp.department || ''}</div>
                            </div>
                            <span class="hb-balance positive">+${formatHours(emp.balance)}</span>
                        </div>
                    `).join('') || '<div style="color: #888;">Sin datos</div>'}
                </div>
                <div>
                    <h4 style="color: #ff5252; margin-bottom: 12px; font-size: 0.9rem;">
                        <i class="fas fa-arrow-down"></i> Mayores Deudores
                    </h4>
                    ${topNegative.map((emp, i) => `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                            <span style="color: #ff5252; font-weight: 700; width: 20px;">#${i + 1}</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${emp.name || 'N/A'}</div>
                                <div style="font-size: 0.75rem; color: #888;">${emp.department || ''}</div>
                            </div>
                            <span class="hb-balance negative">${formatHours(emp.balance)}</span>
                        </div>
                    `).join('') || '<div style="color: #888;">Sin datos</div>'}
                </div>
            </div>
        `;
    }

    function renderEmployeesView() {
        return `
            <!-- Filtros -->
            <div class="hb-filters">
                <div class="hb-filter-group">
                    <label class="hb-filter-label">Sucursal</label>
                    <select class="hb-select" id="filterBranch" onchange="HourBankDashboard.applyFilters()">
                        <option value="">Todas</option>
                        ${(state.branchMetrics || []).map(b =>
                            `<option value="${b.id}">${b.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="hb-filter-group">
                    <label class="hb-filter-label">Tipo Balance</label>
                    <select class="hb-select" id="filterBalance" onchange="HourBankDashboard.applyFilters()">
                        <option value="all">Todos</option>
                        <option value="positive">Solo Acreedores (+)</option>
                        <option value="negative">Solo Deudores (-)</option>
                    </select>
                </div>
                <div class="hb-filter-group">
                    <label class="hb-filter-label">Buscar</label>
                    <input type="text" class="hb-input" id="filterSearch"
                           placeholder="Nombre o legajo..."
                           onkeyup="HourBankDashboard.applyFilters()">
                </div>
            </div>

            <!-- Tabla de Empleados -->
            <div class="hb-panel">
                <div class="hb-panel-header">
                    <span class="hb-panel-title">
                        <i class="fas fa-users"></i>
                        Balances de Empleados
                        <span style="color: #888; font-weight: normal; font-size: 0.85rem;">
                            (${state.employeeBalances?.length || 0} registros)
                        </span>
                    </span>
                    <button class="hb-btn hb-btn-primary" onclick="HourBankDashboard.exportEmployees()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
                <div class="hb-panel-body" style="padding: 0;">
                    <table class="hb-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Sucursal</th>
                                <th>Departamento</th>
                                <th>Horas Acumuladas</th>
                                <th>Horas Usadas</th>
                                <th>Balance</th>
                                <th>Última Actividad</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderEmployeeRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderEmployeeRows() {
        const employees = state.employeeBalances || [];

        if (employees.length === 0) {
            return `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #888;">
                No hay empleados con banco de horas activo
            </td></tr>`;
        }

        return employees.map(emp => `
            <tr onclick="HourBankDashboard.showEmployeeDetail('${emp.userId}')">
                <td>
                    <div style="font-weight: 500;">${emp.name || 'N/A'}</div>
                    <div style="font-size: 0.8rem; color: #888;">${emp.legajo || ''}</div>
                </td>
                <td>${emp.branch || '-'}</td>
                <td>${emp.department || '-'}</td>
                <td style="color: #00e5a0;">+${formatHours(emp.hoursAccrued || 0)}</td>
                <td style="color: #ff9800;">${formatHours(emp.hoursUsed || 0)}</td>
                <td>
                    <span class="hb-balance ${emp.balance >= 0 ? 'positive' : 'negative'}">
                        ${emp.balance >= 0 ? '+' : ''}${formatHours(emp.balance || 0)}
                    </span>
                </td>
                <td style="color: #888;">${formatDate(emp.lastActivity)}</td>
            </tr>
        `).join('');
    }

    function renderTemplatesView() {
        const templates = state.templates || [];

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #e0e0e0; margin: 0;">Plantillas de Configuración</h3>
                <div style="display: flex; gap: 10px;">
                    <button class="hb-btn hb-btn-secondary" onclick="HourBankDashboard.initDefaults()">
                        <i class="fas fa-magic"></i> Inicializar Defaults
                    </button>
                    <button class="hb-btn hb-btn-primary" onclick="HourBankDashboard.showTemplateModal()">
                        <i class="fas fa-plus"></i> Nueva Plantilla
                    </button>
                </div>
            </div>

            ${templates.length === 0 ? `
                <div class="hb-empty">
                    <i class="fas fa-cogs"></i>
                    <p>No hay plantillas configuradas</p>
                    <p style="font-size: 0.85rem;">Haz clic en "Inicializar Defaults" para crear las plantillas por defecto</p>
                </div>
            ` : templates.map(t => renderTemplateCard(t)).join('')}
        `;
    }

    function renderTemplateCard(template) {
        return `
            <div class="hb-template-card">
                <div class="hb-template-header">
                    <div>
                        <div class="hb-template-name">${template.template_name || 'Sin nombre'}</div>
                        <div style="font-size: 0.85rem; color: #888; margin-top: 4px;">
                            ${template.description || ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="hb-template-code">${template.template_code || 'N/A'}</span>
                        <span style="padding: 4px 10px; border-radius: 4px; font-size: 0.75rem;
                                     background: ${template.is_enabled ? 'rgba(0,229,160,0.15)' : 'rgba(255,82,82,0.15)'};
                                     color: ${template.is_enabled ? '#00e5a0' : '#ff5252'};">
                            ${template.is_enabled ? 'Activa' : 'Inactiva'}
                        </span>
                    </div>
                </div>
                <div class="hb-template-params">
                    <div class="hb-template-param">
                        <div class="hb-template-param-label">Límite Máximo</div>
                        <div class="hb-template-param-value">${template.max_balance_hours || 0}h</div>
                    </div>
                    <div class="hb-template-param">
                        <div class="hb-template-param-label">Límite Deudor</div>
                        <div class="hb-template-param-value">${template.min_balance_hours || 0}h</div>
                    </div>
                    <div class="hb-template-param">
                        <div class="hb-template-param-label">Tasa Conversión</div>
                        <div class="hb-template-param-value">${template.accrual_rate || 1}x</div>
                    </div>
                    <div class="hb-template-param">
                        <div class="hb-template-param-label">Vencimiento</div>
                        <div class="hb-template-param-value">${template.expiration_months || 12} meses</div>
                    </div>
                    <div class="hb-template-param">
                        <div class="hb-template-param-label">Max Canje/Evento</div>
                        <div class="hb-template-param-value">${template.redemption_max_hours_per_event || 8}h</div>
                    </div>
                    <div class="hb-template-param">
                        <div class="hb-template-param-label">Anticipación Mínima</div>
                        <div class="hb-template-param-value">${template.redemption_min_advance_days || 2} días</div>
                    </div>
                </div>
                <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="hb-btn hb-btn-secondary" onclick="HourBankDashboard.editTemplate('${template.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        `;
    }

    function renderReportsView() {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div class="hb-panel" style="cursor: pointer;" onclick="HourBankDashboard.generateReport('monthly')">
                    <div class="hb-panel-body" style="text-align: center; padding: 40px;">
                        <i class="fas fa-calendar-alt" style="font-size: 3rem; color: #00e5a0; margin-bottom: 16px;"></i>
                        <h3 style="color: white; margin-bottom: 8px;">Reporte Mensual</h3>
                        <p style="color: #888; font-size: 0.9rem;">Resumen de movimientos del mes actual</p>
                    </div>
                </div>

                <div class="hb-panel" style="cursor: pointer;" onclick="HourBankDashboard.generateReport('balance')">
                    <div class="hb-panel-body" style="text-align: center; padding: 40px;">
                        <i class="fas fa-balance-scale" style="font-size: 3rem; color: #00bcd4; margin-bottom: 16px;"></i>
                        <h3 style="color: white; margin-bottom: 8px;">Reporte de Balances</h3>
                        <p style="color: #888; font-size: 0.9rem;">Estado actual de todos los empleados</p>
                    </div>
                </div>

                <div class="hb-panel" style="cursor: pointer;" onclick="HourBankDashboard.generateReport('expiring')">
                    <div class="hb-panel-body" style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ffc107; margin-bottom: 16px;"></i>
                        <h3 style="color: white; margin-bottom: 8px;">Horas por Vencer</h3>
                        <p style="color: #888; font-size: 0.9rem;">Horas que vencen en los próximos 30 días</p>
                    </div>
                </div>

                <div class="hb-panel" style="cursor: pointer;" onclick="HourBankDashboard.generateReport('usage')">
                    <div class="hb-panel-body" style="text-align: center; padding: 40px;">
                        <i class="fas fa-chart-pie" style="font-size: 3rem; color: #9c27b0; margin-bottom: 16px;"></i>
                        <h3 style="color: white; margin-bottom: 8px;">Análisis de Uso</h3>
                        <p style="color: #888; font-size: 0.9rem;">Estadísticas de acumulación y canje</p>
                    </div>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // DATA LOADING
    // =========================================================================

    async function loadDashboard() {
        const content = document.getElementById('hb-content');
        if (!content) return;

        content.innerHTML = renderLoading();

        try {
            // Cargar datos en paralelo
            const [metricsResult, branchesResult, employeesResult] = await Promise.allSettled([
                API.getCompanyMetrics(),
                API.getBranchMetrics(),
                API.getEmployeeBalances({ limit: 100 })
            ]);

            // Extraer metrics del objeto response (backend devuelve { success, metrics })
            const metricsData = metricsResult.status === 'fulfilled' ? metricsResult.value : {};
            state.companyMetrics = metricsData.metrics || metricsData || {};

            const branchesData = branchesResult.status === 'fulfilled' ? branchesResult.value : {};
            state.branchMetrics = branchesData.branches || [];

            const employeesData = employeesResult.status === 'fulfilled' ? employeesResult.value : {};
            state.employeeBalances = employeesData.balances || [];

            content.innerHTML = renderDashboard();
        } catch (error) {
            console.error('[HourBank] Error loading dashboard:', error);
            content.innerHTML = `<div class="hb-empty">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error cargando datos</p>
                <p style="font-size: 0.85rem; color: #888;">${error.message}</p>
            </div>`;
        }
    }

    async function loadEmployees() {
        const content = document.getElementById('hb-content');
        if (!content) return;

        content.innerHTML = renderLoading();

        try {
            const result = await API.getEmployeeBalances({
                ...state.filters,
                ...state.pagination
            });
            state.employeeBalances = result.balances || [];
            state.pagination.total = result.total || 0;

            content.innerHTML = renderEmployeesView();
        } catch (error) {
            console.error('[HourBank] Error loading employees:', error);
            content.innerHTML = renderEmployeesView();
        }
    }

    async function loadTemplates() {
        const content = document.getElementById('hb-content');
        if (!content) return;

        content.innerHTML = renderLoading();

        try {
            const result = await API.getTemplates();
            state.templates = result.templates || [];
            content.innerHTML = renderTemplatesView();
        } catch (error) {
            console.error('[HourBank] Error loading templates:', error);
            state.templates = [];
            content.innerHTML = renderTemplatesView();
        }
    }

    // =========================================================================
    // FICHAJES VIEW (SSOT - Grilla de Asistencias con Horas Extras)
    // =========================================================================

    async function loadFichajes() {
        const content = document.getElementById('hb-content');
        if (!content) return;

        content.innerHTML = renderLoading();

        try {
            // Cargar datos en paralelo: fichajes, sucursales, departamentos
            const [fichajesResult, branchesResult] = await Promise.allSettled([
                API.getFichajes({
                    ...state.filters,
                    limit: state.pagination.limit,
                    offset: (state.pagination.page - 1) * state.pagination.limit
                }),
                API.getBranchMetrics()
            ]);

            const fichajesData = fichajesResult.status === 'fulfilled' ? fichajesResult.value : {};
            state.fichajes = fichajesData.fichajes || [];
            state.pagination.total = fichajesData.total || 0;

            const branchesData = branchesResult.status === 'fulfilled' ? branchesResult.value : {};
            state.branchMetrics = branchesData.branches || [];

            content.innerHTML = renderFichajesView();
        } catch (error) {
            console.error('[HourBank] Error loading fichajes:', error);
            content.innerHTML = `<div class="hb-empty">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error cargando fichajes</p>
                <p style="font-size: 0.85rem; color: #888;">${error.message}</p>
            </div>`;
        }
    }

    function renderFichajesView() {
        return `
            <!-- Filtros Compactos -->
            <div class="hb-filters" style="gap: 8px;">
                <div class="hb-filter-group">
                    <label class="hb-filter-label">Sucursal</label>
                    <select class="hb-select hb-compact" id="filterFichajeBranch" onchange="HourBankDashboard.applyFichajesFilters()">
                        <option value="">Todas</option>
                        ${(state.branchMetrics || []).map(b =>
                            `<option value="${b.id}" ${state.filters.branchId == b.id ? 'selected' : ''}>${b.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="hb-filter-group">
                    <label class="hb-filter-label">Departamento</label>
                    <select class="hb-select hb-compact" id="filterFichajeDept" onchange="HourBankDashboard.applyFichajesFilters()">
                        <option value="">Todos</option>
                    </select>
                </div>
                <div class="hb-filter-group">
                    <label class="hb-filter-label">Destino HE</label>
                    <select class="hb-select hb-compact" id="filterFichajeDestino" onchange="HourBankDashboard.applyFichajesFilters()">
                        <option value="">Todos</option>
                        <option value="bank">🏦 Solo Banco</option>
                        <option value="paid">💵 Solo Pago</option>
                    </select>
                </div>
                <div class="hb-filter-group">
                    <label class="hb-filter-label">Desde</label>
                    <input type="date" class="hb-input hb-compact" id="filterFichajeFrom"
                           value="${state.filters.dateFrom || ''}"
                           onchange="HourBankDashboard.applyFichajesFilters()">
                </div>
                <div class="hb-filter-group">
                    <label class="hb-filter-label">Hasta</label>
                    <input type="date" class="hb-input hb-compact" id="filterFichajeTo"
                           value="${state.filters.dateTo || ''}"
                           onchange="HourBankDashboard.applyFichajesFilters()">
                </div>
                <div class="hb-filter-group">
                    <label class="hb-filter-label">Buscar</label>
                    <input type="text" class="hb-input hb-compact" id="filterFichajeSearch"
                           placeholder="Nombre..."
                           onkeyup="HourBankDashboard.applyFichajesFilters()">
                </div>
            </div>

            <!-- Tabla de Fichajes -->
            <div class="hb-panel">
                <div class="hb-panel-header">
                    <span class="hb-panel-title">
                        <i class="fas fa-clock"></i>
                        Fichajes con Horas Extras
                        <span style="color: #888; font-weight: normal; font-size: 0.8rem;">
                            (${state.fichajes?.length || 0} de ${state.pagination.total || 0})
                        </span>
                    </span>
                    <div style="display: flex; gap: 8px;">
                        <button class="hb-btn hb-btn-secondary hb-compact" onclick="HourBankDashboard.exportFichajes()">
                            <i class="fas fa-download"></i> Excel
                        </button>
                    </div>
                </div>
                <div class="hb-panel-body" style="padding: 0; overflow-x: auto;">
                    <table class="hb-table hb-table-compact">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Empleado</th>
                                <th>Sucursal</th>
                                <th>Depto</th>
                                <th>Sector</th>
                                <th>Entrada</th>
                                <th>Salida</th>
                                <th>Horas</th>
                                <th class="hb-col-extras" title="Horas para Pago">💵 Extras</th>
                                <th class="hb-col-banco" title="Horas para Banco">🏦 Banco</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderFichajesRows()}
                        </tbody>
                    </table>
                </div>
                ${renderPagination()}
            </div>
        `;
    }

    function renderFichajesRows() {
        const fichajes = state.fichajes || [];

        if (fichajes.length === 0) {
            return `<tr><td colspan="11" style="text-align: center; padding: 40px; color: #888;">
                No hay fichajes con horas extras en el período seleccionado
            </td></tr>`;
        }

        return fichajes.map(f => {
            // Calcular horas extras y destino - MUTUAMENTE EXCLUYENTES
            const overtimeHours = parseFloat(f.overtime_hours || 0);
            const destination = f.overtime_destination; // 'bank' o 'paid'

            // Columna Extras: solo si destino es 'paid' o null (sin decisión)
            const extrasHours = destination === 'paid' ? overtimeHours : 0;
            // Columna Banco: solo si destino es 'bank'
            const bancoHours = destination === 'bank' ? overtimeHours : 0;

            // Formatear tiempo trabajado
            const horasTrabajadas = f.hours_worked ? parseFloat(f.hours_worked).toFixed(1) : '-';

            return `
                <tr>
                    <td class="hb-td-compact">${formatDateShort(f.date)}</td>
                    <td class="hb-td-compact">
                        <div class="hb-employee-cell">
                            <span class="hb-employee-name">${f.employee_name || 'N/A'}</span>
                            <span class="hb-employee-legajo">${f.legajo || ''}</span>
                        </div>
                    </td>
                    <td class="hb-td-compact">${f.branch_name || '-'}</td>
                    <td class="hb-td-compact">${f.department_name || '-'}</td>
                    <td class="hb-td-compact">${f.sector_name || '-'}</td>
                    <td class="hb-td-compact">${formatTime(f.check_in)}</td>
                    <td class="hb-td-compact">${formatTime(f.check_out)}</td>
                    <td class="hb-td-compact">${horasTrabajadas}h</td>
                    <td class="hb-td-compact hb-col-extras ${extrasHours > 0 ? 'hb-has-value' : ''}">
                        ${extrasHours > 0 ? `<span class="hb-extras-value">+${extrasHours.toFixed(1)}h</span>` : '-'}
                    </td>
                    <td class="hb-td-compact hb-col-banco ${bancoHours > 0 ? 'hb-has-value' : ''}">
                        ${bancoHours > 0 ? `<span class="hb-banco-value">+${bancoHours.toFixed(1)}h</span>` : '-'}
                    </td>
                    <td class="hb-td-compact">
                        ${renderFichajeStatus(f)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderFichajeStatus(fichaje) {
        const destination = fichaje.overtime_destination;
        const decisionStatus = fichaje.decision_status;

        if (!fichaje.overtime_hours || fichaje.overtime_hours <= 0) {
            return `<span class="hb-status-badge hb-status-normal">Normal</span>`;
        }

        if (!destination || decisionStatus === 'pending') {
            return `<span class="hb-status-badge hb-status-pending">⏳ Pendiente</span>`;
        }

        if (destination === 'bank') {
            return `<span class="hb-status-badge hb-status-bank">🏦 Acreditado</span>`;
        }

        if (destination === 'paid') {
            return `<span class="hb-status-badge hb-status-paid">💵 A pagar</span>`;
        }

        return `<span class="hb-status-badge">${destination}</span>`;
    }

    function renderPagination() {
        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        if (totalPages <= 1) return '';

        return `
            <div class="hb-pagination">
                <button class="hb-btn hb-btn-secondary hb-compact"
                        onclick="HourBankDashboard.changePage(-1)"
                        ${state.pagination.page <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="hb-pagination-info">
                    Página ${state.pagination.page} de ${totalPages}
                </span>
                <button class="hb-btn hb-btn-secondary hb-compact"
                        onclick="HourBankDashboard.changePage(1)"
                        ${state.pagination.page >= totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    }

    function applyFichajesFilters() {
        state.filters.branchId = document.getElementById('filterFichajeBranch')?.value || null;
        state.filters.departmentId = document.getElementById('filterFichajeDept')?.value || null;
        state.filters.overtimeDestination = document.getElementById('filterFichajeDestino')?.value || null;
        state.filters.dateFrom = document.getElementById('filterFichajeFrom')?.value || null;
        state.filters.dateTo = document.getElementById('filterFichajeTo')?.value || null;
        state.filters.search = document.getElementById('filterFichajeSearch')?.value || '';
        state.pagination.page = 1;

        loadFichajes();
    }

    function changePage(delta) {
        const totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        const newPage = state.pagination.page + delta;

        if (newPage >= 1 && newPage <= totalPages) {
            state.pagination.page = newPage;
            loadFichajes();
        }
    }

    function exportFichajes() {
        // TODO: Implementar exportación a Excel
        showToast('Exportando fichajes...', 'info');
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================

    function switchView(viewId) {
        state.currentView = viewId;

        // Update nav
        document.querySelectorAll('.hb-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase().includes(viewId) ||
                                          btn.getAttribute('onclick')?.includes(viewId));
        });

        // Load view
        switch (viewId) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'fichajes':
                loadFichajes();
                break;
            case 'employees':
                loadEmployees();
                break;
            case 'templates':
                loadTemplates();
                break;
            case 'reports':
                document.getElementById('hb-content').innerHTML = renderReportsView();
                break;
        }
    }

    function applyFilters() {
        state.filters.branchId = document.getElementById('filterBranch')?.value || null;
        state.filters.balanceType = document.getElementById('filterBalance')?.value || 'all';
        state.filters.search = document.getElementById('filterSearch')?.value || '';
        state.pagination.page = 1;

        loadEmployees();
    }

    async function initDefaults() {
        if (!confirm('¿Crear plantillas por defecto? Esto no afectará las existentes.')) return;

        try {
            await API.initDefaults();
            await loadTemplates();
            showToast('Plantillas creadas correctamente', 'success');
        } catch (error) {
            showToast('Error creando plantillas: ' + error.message, 'error');
        }
    }

    function showEmployeeDetail(userId) {
        // TODO: Modal con detalle del empleado
        console.log('Show employee detail:', userId);
    }

    function generateReport(type) {
        // TODO: Generar reporte
        console.log('Generate report:', type);
        showToast('Generando reporte...', 'info');
    }

    function exportEmployees() {
        // TODO: Exportar a Excel/CSV
        showToast('Exportando datos...', 'info');
    }

    function showTemplateModal(templateId = null) {
        // TODO: Modal para crear/editar plantilla
        console.log('Show template modal:', templateId);
    }

    function editTemplate(id) {
        showTemplateModal(id);
    }

    function drillDown(level, id) {
        console.log('Drill down:', level, id);
        // TODO: Navegar a nivel específico
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    function formatHours(hours) {
        if (hours === null || hours === undefined) return '0h';
        const h = parseFloat(hours);
        if (isNaN(h)) return '0h';
        return h.toFixed(1) + 'h';
    }

    function formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function formatDateShort(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit'
        });
    }

    function formatTime(datetime) {
        if (!datetime) return '-';
        const d = new Date(datetime);
        return d.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    function calculateBalanceRatio(metrics) {
        const positive = Math.abs(metrics?.totalPositiveBalance || 0);
        const negative = Math.abs(metrics?.totalNegativeBalance || 0);
        const total = positive + negative;
        return total > 0 ? (positive / total) * 100 : 50;
    }

    function showToast(message, type = 'info') {
        if (window.Toastify) {
            const colors = {
                success: '#00e5a0',
                error: '#ff5252',
                warning: '#ffc107',
                info: '#00bcd4'
            };
            Toastify({
                text: message,
                duration: 3000,
                gravity: 'top',
                position: 'right',
                backgroundColor: colors[type] || colors.info
            }).showToast();
        } else {
            alert(message);
        }
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    function init() {
        console.log('🏦 [HOUR-BANK] Inicializando módulo...');

        state.user = window.currentUser || {};
        state.company = window.currentCompany || window.selectedCompany || {};

        render();
        state.initialized = true;

        console.log('✅ [HOUR-BANK] Módulo inicializado');
    }

    function showHourBankDashboardContent() {
        init();
    }

    // =========================================================================
    // EXPORTS
    // =========================================================================

    if (!window.Modules) window.Modules = {};
    window.Modules[MODULE_KEY] = { init, render, switchView };

    window.showHourBankDashboardContent = showHourBankDashboardContent;
    window.HourBankDashboard = {
        init,
        render,
        switchView,
        applyFilters,
        applyFichajesFilters,
        changePage,
        exportFichajes,
        initDefaults,
        showEmployeeDetail,
        generateReport,
        exportEmployees,
        showTemplateModal,
        editTemplate,
        drillDown
    };

    console.log('📦 [HOUR-BANK] Módulo registrado');

})();
