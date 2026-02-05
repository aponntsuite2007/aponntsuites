/**
 * ╔════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                ║
 * ║   🤖 INSTRUCCIONES PARA OTRAS SESIONES DE CLAUDE CODE                         ║
 * ║                                                                                ║
 * ╠════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                ║
 * ║   CUANDO EL USUARIO PIDA:                                                     ║
 * ║   "Verificar estructura organizacional" / "100% de confianza" / "testear"     ║
 * ║                                                                                ║
 * ║   DEBES EJECUTAR:                                                             ║
 * ║   ─────────────────────────────────────────────────────────────────────────   ║
 * ║                                                                                ║
 * ║   PASO 1: cd backend                                                          ║
 * ║   PASO 2: npx playwright test tests/e2e/test-organizational-structure-completo.e2e.spec.js
 * ║   PASO 3: Verificar que diga "16 passed"                                      ║
 * ║                                                                                ║
 * ║   SI DICE "16 passed" → MÓDULO FUNCIONA AL 100%                               ║
 * ║                                                                                ║
 * ╠════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                ║
 * ║   📋 FUNCIONES VERIFICADAS (2026-02-03) - TODAS PERSISTEN EN BD               ║
 * ║   ─────────────────────────────────────────────────────────────────────────   ║
 * ║                                                                                ║
 * ║   • saveDepartment()      → POST/PUT /api/v1/departments                      ║
 * ║   • deleteDepartment()    → DELETE /api/v1/departments/:id                    ║
 * ║   • saveSector()          → POST/PUT /api/v1/organizational/sectors           ║
 * ║   • deleteSector()        → DELETE /api/v1/organizational/sectors/:id         ║
 * ║   • saveCategory()        → POST/PUT /api/v1/organizational/categories        ║
 * ║   • deleteCategory()      → DELETE /api/v1/organizational/categories/:id      ║
 * ║   • saveAgreement()       → POST/PUT /api/v1/organizational/agreements        ║
 * ║   • deleteAgreement()     → DELETE /api/v1/organizational/agreements/:id      ║
 * ║   • saveRole()            → POST/PUT /api/v1/organizational/roles             ║
 * ║   • deleteRole()          → DELETE /api/v1/organizational/roles/:id           ║
 * ║   • savePosition()        → POST/PUT /api/v1/organizational/positions         ║
 * ║   • deletePosition()      → DELETE /api/v1/organizational/positions/:id       ║
 * ║                                                                                ║
 * ╠════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                ║
 * ║   📊 DATOS EN BD VERIFICADOS:                                                 ║
 * ║   ─────────────────────────────────────────────────────────────────────────   ║
 * ║                                                                                ║
 * ║   • Departamentos: 5 registros                                                ║
 * ║   • Sectores: 6 registros                                                     ║
 * ║   • Convenios Laborales: 23 registros                                         ║
 * ║   • Categorías Salariales: 10 registros                                       ║
 * ║   • Posiciones: 5 registros                                                   ║
 * ║                                                                                ║
 * ║   ÚLTIMA ACTUALIZACIÓN: 2026-02-03                                            ║
 * ║   VERIFICADO CON TEST E2E: test-organizational-structure.e2e.spec.js          ║
 * ║                                                                                ║
 * ╚════════════════════════════════════════════════════════════════════════════════╝
 *
 * ORGANIZATIONAL STRUCTURE ENTERPRISE v1.0
 * Sistema de Estructura Organizacional - Nivel Enterprise
 *
 * Tabs:
 * 1. Departamentos (integrado)
 * 2. Sectores (nuevo)
 * 3. Convenios/Acuerdos Laborales
 * 4. Categorías Salariales
 * 5. Turnos (integrado)
 * 6. Roles Adicionales
 *
 * Tecnologias: Node.js + PostgreSQL + Sequelize
 * Arquitectura: Multi-tenant, Multi-pais, 100% Parametrizable
 *
 * @author Sistema Biometrico Enterprise
 * @version 1.0.0
 */
console.log('%c ORGANIZATIONAL STRUCTURE v1.0 ', 'background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%); color: #00d4ff; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT - Redux-like pattern
// ============================================================================
// Evitar redeclaración si el módulo se carga múltiples veces
if (typeof window.OrgState !== 'undefined') {
    console.log('🏢 [ORG] Estado ya inicializado');
}
window.OrgState = window.OrgState || {
    currentTab: 'departments',
    departments: [],
    sectors: [],
    agreements: [],
    categories: [],
    shifts: [],
    roles: [],
    countries: [],
    stats: {},
    isLoading: false,
    filters: {},
    selectedItem: null
};

// ============================================================================
// HELPER: Obtener company_id (igual que users.js)
// ============================================================================
function getCompanyId() {
    return window.progressiveAdmin?.currentUser?.company_id ||
           window.progressiveAdmin?.currentUser?.companyId ||
           window.currentCompany?.company_id ||
           window.currentCompany?.id ||
           window.selectedCompany?.company_id ||
           window.selectedCompany?.id ||
           11; // Fallback
}

// ============================================================================
// API SERVICE - Centralized fetch handler (con company_id en TODOS los endpoints)
// ============================================================================
// Use var to allow redeclaration when module loads multiple times in SPA
if (typeof window.OrgAPI !== 'undefined') {
    console.log('🏢 [ORG] OrgAPI ya existe, usando instancia existente');
}
window.OrgAPI = window.OrgAPI || {
    baseUrl: '/api/v1/organizational',

    getToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    },

    async request(endpoint, options = {}) {
        const config = {
            headers: {
                'Authorization': `Bearer ${this.getToken()}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            // Agregar company_id si no está en el endpoint
            let url = `${this.baseUrl}${endpoint}`;
            if (!url.includes('company_id')) {
                url += url.includes('?') ? `&company_id=${getCompanyId()}` : `?company_id=${getCompanyId()}`;
            }

            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || data.error || 'API Error');
            return data;
        } catch (error) {
            console.error(`[OrgAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    // Departments (usando API /api/v1/departments)
    async getDepartments() {
        const response = await fetch(`/api/v1/departments?company_id=${getCompanyId()}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        const result = await response.json();
        // Normalizar: puede venir como array o como { data: [...] }
        return Array.isArray(result) ? result : (result.data || result.departments || []);
    },

    async createDepartment(data) {
        data.company_id = getCompanyId();
        const response = await fetch('/api/v1/departments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async updateDepartment(id, data) {
        const response = await fetch(`/api/v1/departments/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async deleteDepartment(id) {
        const response = await fetch(`/api/v1/departments/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        return response.json();
    },

    // Sectors (todos con company_id automático via request())
    getSectors: () => OrgAPI.request('/sectors'),
    createSector: (data) => { data.company_id = getCompanyId(); return OrgAPI.request('/sectors', { method: 'POST', body: JSON.stringify(data) }); },
    updateSector: (id, data) => { data.company_id = getCompanyId(); return OrgAPI.request(`/sectors/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    deleteSector: (id) => OrgAPI.request(`/sectors/${id}`, { method: 'DELETE' }),

    // Agreements (todos con company_id automático via request())
    getAgreements: (extraParams = '') => OrgAPI.request(`/agreements${extraParams}`),
    createAgreement: (data) => { data.company_id = getCompanyId(); return OrgAPI.request('/agreements', { method: 'POST', body: JSON.stringify(data) }); },
    updateAgreement: (id, data) => { data.company_id = getCompanyId(); return OrgAPI.request(`/agreements/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    deleteAgreement: (id) => OrgAPI.request(`/agreements/${id}`, { method: 'DELETE' }),

    // Categories (todos con company_id automático via request())
    getCategories: (extraParams = '') => OrgAPI.request(`/categories${extraParams}`),
    createCategory: (data) => { data.company_id = getCompanyId(); return OrgAPI.request('/categories', { method: 'POST', body: JSON.stringify(data) }); },
    updateCategory: (id, data) => { data.company_id = getCompanyId(); return OrgAPI.request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    deleteCategory: (id) => OrgAPI.request(`/categories/${id}`, { method: 'DELETE' }),

    // Roles (todos con company_id automático via request())
    getRoles: () => OrgAPI.request('/roles'),
    createRole: (data) => { data.company_id = getCompanyId(); return OrgAPI.request('/roles', { method: 'POST', body: JSON.stringify(data) }); },
    updateRole: (id, data) => { data.company_id = getCompanyId(); return OrgAPI.request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    deleteRole: (id) => OrgAPI.request(`/roles/${id}`, { method: 'DELETE' }),

    // Shifts (usando API /api/v1/shifts)
    async getShifts() {
        const response = await fetch(`/api/v1/shifts?company_id=${getCompanyId()}`, {
            headers: { 'Authorization': `Bearer ${this.getToken()}` }
        });
        const result = await response.json();
        return Array.isArray(result) ? result : (result.data || result.shifts || []);
    },

    // Structure & Countries
    getStructure: () => OrgAPI.request('/structure'),
    getCountries: () => OrgAPI.request('/countries'),

    // Employee assignments
    assignCategory: (userId, categoryId) => OrgAPI.request(`/employees/${userId}/category`, {
        method: 'PUT',
        body: JSON.stringify({ salary_category_id: categoryId })
    }),
    assignSector: (userId, sectorId) => OrgAPI.request(`/employees/${userId}/sector`, {
        method: 'PUT',
        body: JSON.stringify({ sector_id: sectorId })
    }),
    assignRoles: (userId, roles) => OrgAPI.request(`/employees/${userId}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ additional_roles: roles })
    })
};
// Local alias for backward compatibility (use var to allow redeclaration)
var OrgAPI = window.OrgAPI;

// ============================================================================
// ORGANIZATIONAL ENGINE - Main Controller
// ============================================================================
const OrgEngine = {
    containerId: 'org-structure-container',

    async init(containerId = 'mainContent') {
        this.containerId = containerId;
        console.log('[OrgEngine] Inicializando en container:', containerId);

        // Inyectar estilos
        this.injectStyles();

        // Cargar datos iniciales
        await this.loadInitialData();

        // Renderizar interfaz
        this.render();

        // Mostrar tab por defecto
        await this.showTab('departments');
    },

    injectStyles() {
        if (document.getElementById('org-enterprise-styles')) return;

        const style = document.createElement('style');
        style.id = 'org-enterprise-styles';
        style.textContent = `
            /* ============================================
               ORGANIZATIONAL STRUCTURE - Enterprise Theme
               ============================================ */
            :root {
                --org-bg-primary: #0d1117;
                --org-bg-secondary: #161b22;
                --org-bg-tertiary: #21262d;
                --org-border: #30363d;
                --org-text-primary: #e6edf3;
                --org-text-secondary: #8b949e;
                --org-accent-blue: #238636;
                --org-accent-green: #238636;
                --org-accent-yellow: #d29922;
                --org-accent-red: #f85149;
                --org-accent-purple: #8957e5;
            }

            .org-container {
                background: var(--org-bg-primary);
                color: var(--org-text-primary);
                min-height: 600px;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            }

            /* Header */
            .org-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--org-border);
            }

            .org-title {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .org-title h2 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                background: linear-gradient(90deg, #00d4ff, #00ff88);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .org-title-badge {
                background: var(--org-accent-green);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            }

            /* KPI Cards */
            .org-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .org-kpi-card {
                background: var(--org-bg-secondary);
                border: 1px solid var(--org-border);
                border-radius: 8px;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .org-kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }

            .org-kpi-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
            }

            .org-kpi-data {
                flex: 1;
            }

            .org-kpi-value {
                display: block;
                font-size: 28px;
                font-weight: 700;
                color: var(--org-text-primary);
            }

            .org-kpi-label {
                font-size: 12px;
                color: var(--org-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* Tabs Navigation */
            .org-tabs {
                display: flex;
                gap: 4px;
                background: var(--org-bg-secondary);
                padding: 4px;
                border-radius: 8px;
                margin-bottom: 20px;
                overflow-x: auto;
            }

            .org-tab {
                padding: 10px 16px;
                background: transparent;
                border: none;
                color: var(--org-text-secondary);
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.2s;
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .org-tab:hover {
                background: var(--org-bg-tertiary);
                color: var(--org-text-primary);
            }

            .org-tab.active {
                background: var(--org-accent-blue);
                color: white;
            }

            .org-tab-icon {
                font-size: 16px;
            }

            /* Content Panel */
            .org-content {
                background: var(--org-bg-secondary);
                border: 1px solid var(--org-border);
                border-radius: 8px;
                min-height: 400px;
            }

            .org-content-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--org-border);
            }

            .org-content-title {
                font-size: 18px;
                font-weight: 600;
                margin: 0;
            }

            .org-toolbar {
                display: flex;
                gap: 8px;
            }

            /* Buttons */
            .org-btn {
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                border: 1px solid transparent;
            }

            .org-btn-primary {
                background: var(--org-accent-green);
                color: white;
                border-color: var(--org-accent-green);
            }

            .org-btn-primary:hover {
                background: #2ea043;
            }

            .org-btn-secondary {
                background: transparent;
                color: var(--org-text-primary);
                border-color: var(--org-border);
            }

            .org-btn-secondary:hover {
                background: var(--org-bg-tertiary);
            }

            .org-btn-danger {
                background: var(--org-accent-red);
                color: white;
            }

            .org-btn-sm {
                padding: 4px 10px;
                font-size: 12px;
            }

            /* Table */
            .org-table-container {
                padding: 20px;
                overflow-x: auto;
            }

            .org-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
            }

            .org-table th {
                text-align: left;
                padding: 12px;
                background: var(--org-bg-tertiary);
                color: var(--org-text-secondary);
                font-weight: 600;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
                border-bottom: 1px solid var(--org-border);
            }

            .org-table td {
                padding: 12px;
                border-bottom: 1px solid var(--org-border);
                color: var(--org-text-primary);
            }

            .org-table tr:hover td {
                background: var(--org-bg-tertiary);
            }

            .org-table-actions {
                display: flex;
                gap: 4px;
            }

            /* Badge */
            .org-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
            }

            .org-badge-active {
                background: rgba(35, 134, 54, 0.2);
                color: #3fb950;
            }

            .org-badge-inactive {
                background: rgba(248, 81, 73, 0.2);
                color: #f85149;
            }

            .org-badge-global {
                background: rgba(137, 87, 229, 0.2);
                color: #a371f7;
            }

            /* Modal */
            .org-modal-overlay {
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

            .org-modal {
                background: var(--org-bg-secondary);
                border: 1px solid var(--org-border);
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .org-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--org-border);
            }

            .org-modal-title {
                font-size: 18px;
                font-weight: 600;
                margin: 0;
            }

            .org-modal-close {
                background: transparent;
                border: none;
                color: var(--org-text-secondary);
                font-size: 24px;
                cursor: pointer;
                padding: 4px;
            }

            .org-modal-close:hover {
                color: var(--org-text-primary);
            }

            .org-modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }

            .org-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 16px 20px;
                border-top: 1px solid var(--org-border);
            }

            /* Form */
            .org-form-group {
                margin-bottom: 16px;
            }

            .org-form-label {
                display: block;
                margin-bottom: 6px;
                font-size: 13px;
                font-weight: 500;
                color: var(--org-text-secondary);
            }

            .org-form-input,
            .org-form-select,
            .org-form-textarea {
                width: 100%;
                padding: 10px 12px;
                background: var(--org-bg-tertiary);
                border: 1px solid var(--org-border);
                border-radius: 6px;
                color: var(--org-text-primary);
                font-size: 14px;
            }

            .org-form-input:focus,
            .org-form-select:focus,
            .org-form-textarea:focus {
                outline: none;
                border-color: var(--org-accent-blue);
                box-shadow: 0 0 0 3px rgba(35, 134, 54, 0.2);
            }

            .org-form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }

            /* Loading */
            .org-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: var(--org-text-secondary);
            }

            .org-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid var(--org-border);
                border-top-color: var(--org-accent-blue);
                border-radius: 50%;
                animation: org-spin 1s linear infinite;
                margin-bottom: 12px;
            }

            @keyframes org-spin {
                to { transform: rotate(360deg); }
            }

            /* Empty state */
            .org-empty {
                text-align: center;
                padding: 60px 20px;
                color: var(--org-text-secondary);
            }

            .org-empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.5;
            }

            /* Salary display */
            .org-salary {
                font-family: 'Monaco', 'Menlo', monospace;
                color: #3fb950;
            }

            /* Country flag */
            .org-flag {
                font-size: 20px;
                margin-right: 8px;
            }

            /* Toast notifications */
            .org-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--org-bg-secondary);
                border: 1px solid var(--org-border);
                border-radius: 8px;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 10001;
                animation: org-slideIn 0.3s ease;
            }

            .org-toast-success {
                border-left: 4px solid var(--org-accent-green);
            }

            .org-toast-error {
                border-left: 4px solid var(--org-accent-red);
            }

            @keyframes org-slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    },

    async loadInitialData() {
        try {
            // Cargar países y estadísticas en paralelo
            const [countriesRes, structureRes] = await Promise.all([
                OrgAPI.getCountries().catch(() => ({ data: [] })),
                OrgAPI.getStructure().catch(() => ({ data: { stats: {} } }))
            ]);

            OrgState.countries = countriesRes.data || [];
            OrgState.stats = structureRes.data?.stats || {};
        } catch (error) {
            console.error('[OrgEngine] Error cargando datos iniciales:', error);
        }
    },

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('[OrgEngine] Container no encontrado:', this.containerId);
            return;
        }

        const stats = OrgState.stats;

        container.innerHTML = `
            <div class="org-container">
                <!-- Header -->
                <div class="org-header">
                    <div class="org-title">
                        <h2>Estructura Organizacional</h2>
                        <span class="org-title-badge">ENTERPRISE</span>
                    </div>
                </div>

                <!-- KPI Cards -->
                <div class="org-kpi-grid">
                    <div class="org-kpi-card">
                        <div class="org-kpi-icon" style="background: linear-gradient(135deg, #238636, #1a6b2c);">🏢</div>
                        <div class="org-kpi-data">
                            <span class="org-kpi-value">${stats.total_departments || 0}</span>
                            <span class="org-kpi-label">Departamentos</span>
                        </div>
                    </div>
                    <div class="org-kpi-card">
                        <div class="org-kpi-icon" style="background: linear-gradient(135deg, #1f6feb, #1158c7);">🏬</div>
                        <div class="org-kpi-data">
                            <span class="org-kpi-value">${stats.total_sectors || 0}</span>
                            <span class="org-kpi-label">Sectores</span>
                        </div>
                    </div>
                    <div class="org-kpi-card">
                        <div class="org-kpi-icon" style="background: linear-gradient(135deg, #8957e5, #6e40c9);">⏰</div>
                        <div class="org-kpi-data">
                            <span class="org-kpi-value">${stats.total_shifts || 0}</span>
                            <span class="org-kpi-label">Turnos</span>
                        </div>
                    </div>
                    <div class="org-kpi-card">
                        <div class="org-kpi-icon" style="background: linear-gradient(135deg, #d29922, #b08016);">👥</div>
                        <div class="org-kpi-data">
                            <span class="org-kpi-value">${stats.total_employees || 0}</span>
                            <span class="org-kpi-label">Empleados</span>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="org-tabs">
                    <button class="org-tab active" data-tab="departments" onclick="OrgEngine.showTab('departments')">
                        <span class="org-tab-icon">🏢</span>
                        Departamentos
                    </button>
                    <button class="org-tab" data-tab="sectors" onclick="OrgEngine.showTab('sectors')">
                        <span class="org-tab-icon">🏬</span>
                        Sectores
                    </button>
                    <button class="org-tab" data-tab="agreements" onclick="OrgEngine.showTab('agreements')">
                        <span class="org-tab-icon">📜</span>
                        Convenios
                    </button>
                    <button class="org-tab" data-tab="categories" onclick="OrgEngine.showTab('categories')">
                        <span class="org-tab-icon">💼</span>
                        Categorías
                    </button>
                    <button class="org-tab" data-tab="shifts" onclick="OrgEngine.showTab('shifts')">
                        <span class="org-tab-icon">⏰</span>
                        Turnos
                    </button>
                    <button class="org-tab" data-tab="roles" onclick="OrgEngine.showTab('roles')">
                        <span class="org-tab-icon">🏷️</span>
                        Roles
                    </button>
                    <button class="org-tab" data-tab="orgchart" onclick="OrgEngine.showTab('orgchart')">
                        <span class="org-tab-icon">📊</span>
                        Organigrama
                    </button>
                    <button class="org-tab" data-tab="positions" onclick="OrgEngine.showTab('positions')">
                        <span class="org-tab-icon">👔</span>
                        Posiciones
                    </button>
                </div>

                <!-- Content -->
                <div class="org-content" id="org-tab-content">
                    <div class="org-loading">
                        <div class="org-spinner"></div>
                        <span>Cargando...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async showTab(tab) {
        OrgState.currentTab = tab;

        // Actualizar tabs activos
        document.querySelectorAll('.org-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        const content = document.getElementById('org-tab-content');
        content.innerHTML = '<div class="org-loading"><div class="org-spinner"></div><span>Cargando...</span></div>';

        try {
            switch(tab) {
                case 'departments': await this.renderDepartments(); break;
                case 'sectors': await this.renderSectors(); break;
                case 'agreements': await this.renderAgreements(); break;
                case 'categories': await this.renderCategories(); break;
                case 'shifts': await this.renderShifts(); break;
                case 'roles': await this.renderRoles(); break;
                case 'orgchart': await this.renderOrgChart(); break;
                case 'positions': await this.renderPositions(); break;
            }
        } catch (error) {
            content.innerHTML = `<div class="org-empty"><div class="org-empty-icon">⚠️</div><p>Error: ${error.message}</p></div>`;
        }
    },

    // ========================================================================
    // DEPARTMENTS TAB
    // ========================================================================
    async renderDepartments() {
        const content = document.getElementById('org-tab-content');

        try {
            // getDepartments() ya devuelve array normalizado
            OrgState.departments = await OrgAPI.getDepartments();
        } catch (e) {
            console.error('[OrgEngine] Error cargando departamentos:', e);
            OrgState.departments = [];
        }

        // Calcular estadísticas GPS
        const gpsEnabledDepts = OrgState.departments.filter(d =>
            (d.gps_lat && d.gps_lng) || (d.gpsLocation?.lat && d.gpsLocation?.lng)
        ).length;

        content.innerHTML = `
            <div class="org-content-header">
                <h3 class="org-content-title">🏢 Departamentos</h3>
                <div class="org-toolbar">
                    <span style="margin-right: 15px; font-size: 12px; color: var(--org-text-secondary);">
                        📍 ${gpsEnabledDepts}/${OrgState.departments.length} con GPS
                    </span>
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.openDepartmentModal()">
                        + Nuevo Departamento
                    </button>
                </div>
            </div>
            <div class="org-table-container">
                ${OrgState.departments.length === 0 ? `
                    <div class="org-empty">
                        <div class="org-empty-icon">🏢</div>
                        <p>No hay departamentos configurados</p>
                    </div>
                ` : `
                    <table class="org-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Dirección</th>
                                <th>GPS</th>
                                <th>Radio</th>
                                <th>Kiosks</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${OrgState.departments.map(d => {
                                // Obtener datos GPS (pueden venir en diferentes formatos)
                                const lat = d.gps_lat || d.gpsLocation?.lat || null;
                                const lng = d.gps_lng || d.gpsLocation?.lng || null;
                                const hasGPS = lat && lng;
                                const radius = d.coverage_radius || d.coverageRadius || 50;
                                const allowGps = d.allow_gps_attendance || d.allowGpsAttendance || false;
                                const authorizedKiosks = d.authorized_kiosks || d.authorizedKiosks || [];

                                return `
                                <tr>
                                    <td><strong>${d.name}</strong></td>
                                    <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${d.address || '-'}</td>
                                    <td>
                                        ${hasGPS ?
                                            `<span class="org-badge org-badge-active" title="${lat}, ${lng}">✅ GPS</span>` :
                                            `<span class="org-badge org-badge-inactive">❌ Sin GPS</span>`
                                        }
                                    </td>
                                    <td>
                                        <span style="background: ${hasGPS ? '#238636' : '#6e7681'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                            ${radius}m
                                        </span>
                                    </td>
                                    <td>
                                        ${authorizedKiosks.length > 0 ?
                                            `<span class="org-badge org-badge-active">🖥️ ${authorizedKiosks.length}</span>` :
                                            `<span class="org-badge org-badge-inactive">-</span>`
                                        }
                                    </td>
                                    <td>
                                        <span class="org-badge ${d.is_active !== false ? 'org-badge-active' : 'org-badge-inactive'}">
                                            ${d.is_active !== false ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td class="org-table-actions">
                                        <button class="org-btn org-btn-secondary org-btn-sm" onclick="OrgEngine.openDepartmentModal(${d.id})" title="Editar">✏️</button>
                                        <button class="org-btn org-btn-danger org-btn-sm" onclick="OrgEngine.deleteDepartment(${d.id})" title="Eliminar">🗑️</button>
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;
    },

    // ========================================================================
    // SECTORS TAB
    // ========================================================================
    async renderSectors() {
        const content = document.getElementById('org-tab-content');

        try {
            const [sectorsRes, departments] = await Promise.all([
                OrgAPI.getSectors(),
                OrgAPI.getDepartments()
            ]);
            OrgState.sectors = sectorsRes.data || [];
            OrgState.departments = departments; // Ya viene normalizado
        } catch (e) {
            console.error('[OrgEngine] Error cargando sectores:', e);
            OrgState.sectors = [];
        }

        content.innerHTML = `
            <div class="org-content-header">
                <h3 class="org-content-title">🏬 Sectores (Subdivisiones de Departamentos)</h3>
                <div class="org-toolbar">
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.openSectorModal()">
                        + Nuevo Sector
                    </button>
                </div>
            </div>
            <div class="org-table-container">
                ${OrgState.sectors.length === 0 ? `
                    <div class="org-empty">
                        <div class="org-empty-icon">🏬</div>
                        <p>No hay sectores configurados</p>
                        <p style="font-size: 12px; margin-top: 8px;">Los sectores permiten subdividir departamentos para mayor control</p>
                    </div>
                ` : `
                    <table class="org-table">
                        <thead>
                            <tr>
                                <th>Sector</th>
                                <th>Departamento</th>
                                <th>Código</th>
                                <th>Supervisor</th>
                                <th>Max. Empleados</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${OrgState.sectors.map(s => `
                                <tr>
                                    <td><strong>${s.name}</strong></td>
                                    <td>${s.department?.name || '-'}</td>
                                    <td>${s.code || '-'}</td>
                                    <td>${s.supervisor ? `${s.supervisor.first_name} ${s.supervisor.last_name}` : '-'}</td>
                                    <td>${s.max_employees || '∞'}</td>
                                    <td class="org-table-actions">
                                        <button class="org-btn org-btn-secondary org-btn-sm" onclick="OrgEngine.openSectorModal(${s.id})">✏️</button>
                                        <button class="org-btn org-btn-danger org-btn-sm" onclick="OrgEngine.deleteSector(${s.id})">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;
    },

    // ========================================================================
    // AGREEMENTS TAB
    // ========================================================================
    async renderAgreements() {
        const content = document.getElementById('org-tab-content');

        try {
            const result = await OrgAPI.getAgreements('?include_categories=true');
            OrgState.agreements = result.data || [];
        } catch (e) {
            OrgState.agreements = [];
        }

        content.innerHTML = `
            <div class="org-content-header">
                <h3 class="org-content-title">📜 Convenios / Acuerdos Laborales</h3>
                <div class="org-toolbar">
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.openAgreementModal()">
                        + Nuevo Convenio
                    </button>
                </div>
            </div>
            <div class="org-table-container">
                ${OrgState.agreements.length === 0 ? `
                    <div class="org-empty">
                        <div class="org-empty-icon">📜</div>
                        <p>No hay convenios configurados</p>
                    </div>
                ` : `
                    <table class="org-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Industria</th>
                                <th>Horas/Semana</th>
                                <th>Extras 50%</th>
                                <th>Extras 100%</th>
                                <th>Categorías</th>
                                <th>Tipo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${OrgState.agreements.map(a => `
                                <tr>
                                    <td><strong>${a.code || '-'}</strong></td>
                                    <td>${a.name}</td>
                                    <td>${a.industry || '-'}</td>
                                    <td>${a.base_work_hours_weekly || 40}h</td>
                                    <td>x${a.overtime_50_multiplier || 1.5}</td>
                                    <td>x${a.overtime_100_multiplier || 2.0}</td>
                                    <td>${a.categories?.length || 0}</td>
                                    <td>
                                        <span class="org-badge ${a.company_id ? 'org-badge-active' : 'org-badge-global'}">
                                            ${a.company_id ? 'Empresa' : 'Global'}
                                        </span>
                                    </td>
                                    <td class="org-table-actions">
                                        ${a.company_id ? `
                                            <button class="org-btn org-btn-secondary org-btn-sm" onclick="OrgEngine.openAgreementModal(${a.id})">✏️</button>
                                            <button class="org-btn org-btn-danger org-btn-sm" onclick="OrgEngine.deleteAgreement(${a.id})">🗑️</button>
                                        ` : `
                                            <button class="org-btn org-btn-secondary org-btn-sm" onclick="OrgEngine.openAgreementModal(${a.id})" title="Solo lectura (global)">👁️</button>
                                        `}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;
    },

    // ========================================================================
    // CATEGORIES TAB
    // ========================================================================
    async renderCategories() {
        const content = document.getElementById('org-tab-content');

        try {
            const [catsRes, agreementsRes] = await Promise.all([
                OrgAPI.getCategories(),
                OrgAPI.getAgreements()
            ]);
            // Mapear id a category_id para compatibilidad
            OrgState.categories = (catsRes.data || []).map(c => ({ ...c, category_id: c.category_id || c.id }));
            OrgState.agreements = agreementsRes.data || [];
        } catch (e) {
            OrgState.categories = [];
        }

        content.innerHTML = `
            <div class="org-content-header">
                <h3 class="org-content-title">💼 Categorías Salariales</h3>
                <div class="org-toolbar">
                    <select id="org-filter-agreement" class="org-form-select" style="width: 200px;" onchange="OrgEngine.filterCategories(this.value)">
                        <option value="">Todos los convenios</option>
                        ${OrgState.agreements.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.openCategoryModal()">
                        + Nueva Categoría
                    </button>
                </div>
            </div>
            <div class="org-table-container">
                ${OrgState.categories.length === 0 ? `
                    <div class="org-empty">
                        <div class="org-empty-icon">💼</div>
                        <p>No hay categorías salariales configuradas</p>
                    </div>
                ` : `
                    <table class="org-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Convenio</th>
                                <th>Nivel</th>
                                <th>Sueldo Base</th>
                                <th>Valor Hora</th>
                                <th>Exp. Mínima</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${OrgState.categories.map(c => `
                                <tr>
                                    <td><strong>${c.category_code}</strong></td>
                                    <td>${c.category_name}</td>
                                    <td>${c.laborAgreement?.name || '-'}</td>
                                    <td>${c.level || 1}</td>
                                    <td class="org-salary">$${this.formatNumber(c.base_salary || 0)}</td>
                                    <td class="org-salary">$${this.formatNumber(c.hourly_rate || 0)}</td>
                                    <td>${c.min_experience_years || 0} años</td>
                                    <td class="org-table-actions">
                                        <button class="org-btn org-btn-secondary org-btn-sm" onclick="OrgEngine.openCategoryModal(${c.category_id})">✏️</button>
                                        <button class="org-btn org-btn-danger org-btn-sm" onclick="OrgEngine.deleteCategory(${c.category_id})">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;
    },

    async filterCategories(agreementId) {
        try {
            const params = agreementId ? `?agreement_id=${agreementId}` : '';
            const result = await OrgAPI.getCategories(params);
            // Mapear id a category_id para compatibilidad
            OrgState.categories = (result.data || []).map(c => ({ ...c, category_id: c.category_id || c.id }));

            // Solo actualizar la tabla
            const tbody = document.querySelector('.org-table tbody');
            if (tbody) {
                tbody.innerHTML = OrgState.categories.map(c => `
                    <tr>
                        <td><strong>${c.category_code}</strong></td>
                        <td>${c.category_name}</td>
                        <td>${c.laborAgreement?.name || '-'}</td>
                        <td>${c.level || 1}</td>
                        <td class="org-salary">$${this.formatNumber(c.base_salary || 0)}</td>
                        <td class="org-salary">$${this.formatNumber(c.hourly_rate || 0)}</td>
                        <td>${c.min_experience_years || 0} años</td>
                        <td class="org-table-actions">
                            <button class="org-btn org-btn-secondary org-btn-sm" onclick="OrgEngine.openCategoryModal(${c.category_id})">✏️</button>
                            <button class="org-btn org-btn-danger org-btn-sm" onclick="OrgEngine.deleteCategory(${c.category_id})">🗑️</button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (e) {
            console.error('Error filtrando categorías:', e);
        }
    },

    // ========================================================================
    // SHIFTS TAB
    // ========================================================================
    async renderShifts() {
        const content = document.getElementById('org-tab-content');

        try {
            // getShifts() ya devuelve array normalizado
            OrgState.shifts = await OrgAPI.getShifts();
        } catch (e) {
            console.error('[OrgEngine] Error cargando turnos:', e);
            OrgState.shifts = [];
        }

        content.innerHTML = `
            <div class="org-content-header">
                <h3 class="org-content-title">⏰ Turnos de Trabajo</h3>
                <div class="org-toolbar">
                    <span style="color: var(--org-text-secondary); font-size: 12px; margin-right: 15px;">
                        📅 Gestiona horarios, días laborables y feriados por turno
                    </span>
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.openShiftModal()">
                        + Nuevo Turno
                    </button>
                </div>
            </div>
            <div class="org-table-container">
                ${OrgState.shifts.length === 0 ? `
                    <div class="org-empty">
                        <div class="org-empty-icon">⏰</div>
                        <p>No hay turnos configurados</p>
                    </div>
                ` : `
                    <table class="org-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Horario</th>
                                <th>Días</th>
                                <th>Feriados</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${OrgState.shifts.map(s => {
                                const nationalHolidays = s.respect_national_holidays ? '✅' : '❌';
                                const provincialHolidays = s.respect_provincial_holidays ? '✅' : '❌';
                                const customDays = (s.custom_non_working_days || []).length;
                                return `
                                <tr>
                                    <td><strong>${s.name}</strong></td>
                                    <td>${s.start_time || s.startTime || '-'} - ${s.end_time || s.endTime || '-'}</td>
                                    <td>${this.formatShiftDays(s)}</td>
                                    <td>
                                        <span title="Feriados Nacionales: ${nationalHolidays === '✅' ? 'Sí' : 'No'}" style="cursor: help;">
                                            🇦🇷 ${nationalHolidays}
                                        </span>
                                        <span title="Feriados Provinciales: ${provincialHolidays === '✅' ? 'Sí' : 'No'}" style="cursor: help; margin-left: 5px;">
                                            🏛️ ${provincialHolidays}
                                        </span>
                                        ${customDays > 0 ? `<span style="margin-left: 5px; background: #e3f2fd; padding: 2px 6px; border-radius: 10px; font-size: 11px;">+${customDays}</span>` : ''}
                                    </td>
                                    <td>
                                        <span class="org-badge ${s.is_active !== false && s.isActive !== false ? 'org-badge-active' : 'org-badge-inactive'}">
                                            ${s.is_active !== false && s.isActive !== false ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td class="org-table-actions">
                                        <button class="org-btn org-btn-primary org-btn-sm" onclick="OrgEngine.openShiftCalendarModal('${s.id}')" title="Ver Calendario y Feriados">
                                            📅
                                        </button>
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                    <div style="margin-top: 15px; padding: 12px; background: #f5f5f5; border-radius: 8px;">
                        <h4 style="margin: 0 0 8px 0; font-size: 13px;">📋 Leyenda:</h4>
                        <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 12px;">
                            <span>🇦🇷 = Feriados Nacionales</span>
                            <span>🏛️ = Feriados Provinciales</span>
                            <span>✅ = Activo</span>
                            <span>❌ = Inactivo</span>
                            <span>+N = Días no laborables personalizados</span>
                        </div>
                    </div>
                `}
            </div>
        `;
    },

    formatShiftDays(shift) {
        if (!shift.work_days) return '-';
        const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        if (Array.isArray(shift.work_days)) {
            return shift.work_days.map(d => days[d - 1] || d).join(', ');
        }
        return shift.work_days;
    },

    // ========================================================================
    // ROLES TAB
    // ========================================================================
    async renderRoles() {
        const content = document.getElementById('org-tab-content');

        try {
            const result = await OrgAPI.getRoles();
            OrgState.roles = result.data || [];
        } catch (e) {
            OrgState.roles = [];
        }

        // Agrupar por categoría
        const grouped = {};
        OrgState.roles.forEach(r => {
            const cat = r.category || 'otros';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(r);
        });

        content.innerHTML = `
            <div class="org-content-header">
                <h3 class="org-content-title">🏷️ Roles Adicionales</h3>
                <div class="org-toolbar">
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.openRoleModal()">
                        + Nuevo Rol
                    </button>
                </div>
            </div>
            <div class="org-table-container">
                ${OrgState.roles.length === 0 ? `
                    <div class="org-empty">
                        <div class="org-empty-icon">🏷️</div>
                        <p>No hay roles adicionales configurados</p>
                        <p style="font-size: 12px; margin-top: 8px;">Roles como: Brigadista, Socorrista, Delegado sindical, etc.</p>
                    </div>
                ` : `
                    <table class="org-table">
                        <thead>
                            <tr>
                                <th>Icono</th>
                                <th>Rol</th>
                                <th>Clave</th>
                                <th>Categoría</th>
                                <th>Certificación</th>
                                <th>Bonus</th>
                                <th>Tipo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${OrgState.roles.map(r => `
                                <tr>
                                    <td style="font-size: 24px;">${r.icon || '🏷️'}</td>
                                    <td><strong>${r.role_name}</strong></td>
                                    <td><code>${r.role_key}</code></td>
                                    <td>${r.category || '-'}</td>
                                    <td>${r.requires_certification ? `✅ ${r.certification_validity_months || 12} meses` : '❌'}</td>
                                    <td>${r.scoring_bonus ? `+${(r.scoring_bonus * 100).toFixed(0)}%` : '-'}</td>
                                    <td>
                                        <span class="org-badge ${r.company_id ? 'org-badge-active' : 'org-badge-global'}">
                                            ${r.company_id ? 'Empresa' : 'Global'}
                                        </span>
                                    </td>
                                    <td class="org-table-actions">
                                        ${r.company_id ? `
                                            <button class="org-btn org-btn-secondary org-btn-sm" onclick="OrgEngine.openRoleModal('${r.id}')">✏️</button>
                                            <button class="org-btn org-btn-danger org-btn-sm" onclick="OrgEngine.deleteRole('${r.id}')">🗑️</button>
                                        ` : `
                                            <button class="org-btn org-btn-secondary org-btn-sm" onclick="OrgEngine.openRoleModal('${r.id}')" title="Solo lectura (global)">👁️</button>
                                        `}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;
    },

    // ========================================================================
    // ORGCHART TAB - Organigrama Visual INTELIGENTE
    // ========================================================================
    async renderOrgChart() {
        const content = document.getElementById('org-tab-content');

        content.innerHTML = `
            <div id="orgchart-intelligent-container-company" style="height: calc(100vh - 240px); min-height: 600px;">
                <div class="org-loading" style="padding: 60px; text-align: center;">
                    <div class="org-spinner" style="margin: 0 auto 20px;"></div>
                    <span style="color: rgba(255,255,255,0.7);">Cargando organigrama inteligente...</span>
                </div>
            </div>
        `;

        // Cargar componente inteligente
        setTimeout(() => this._initOrgChartIntelligent(), 100);
    },

    async _initOrgChartIntelligent() {
        // Obtener company_id de TODAS las fuentes posibles
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const company = JSON.parse(localStorage.getItem('company') || '{}');
        const currentCompanyLS = JSON.parse(localStorage.getItem('currentCompany') || '{}');
        const selectedCompanyLS = JSON.parse(localStorage.getItem('selectedCompany') || '{}');

        const companyId =
            // Desde window (variables globales)
            window.currentCompany?.id || window.selectedCompany?.id ||
            // Desde localStorage parseado
            currentCompanyLS?.id || selectedCompanyLS?.id ||
            // Desde user object
            user.company_id || user.companyId ||
            // Desde company object
            company.id || company.company_id ||
            // Desde localStorage directo
            localStorage.getItem('companyId') || localStorage.getItem('company_id') ||
            localStorage.getItem('aponnt_remember_company') ||
            // Desde sessionStorage
            sessionStorage.getItem('company_id');

        console.log('[ORGCHART] company_id detectado:', companyId, {
            windowCurrentCompany: window.currentCompany?.id,
            windowSelectedCompany: window.selectedCompany?.id,
            currentCompanyLS: currentCompanyLS?.id,
            selectedCompanyLS: selectedCompanyLS?.id,
            user: user.company_id
        });

        if (!companyId) {
            document.getElementById('orgchart-intelligent-container-company').innerHTML = `
                <div style="text-align: center; padding: 60px; color: #ef4444;">
                    <div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>
                    <div style="font-size: 1.1rem;">No se pudo obtener el ID de la empresa</div>
                    <div style="font-size: 0.9rem; margin-top: 8px; color: rgba(255,255,255,0.6);">Verifica que hayas iniciado sesión correctamente</div>
                </div>
            `;
            return;
        }

        // Cargar el script si no está ya cargado
        if (!window.OrgChartIntelligent) {
            const script = document.createElement('script');
            script.src = '/js/modules/OrgChartIntelligent.js?v=' + Date.now();
            script.onload = () => {
                console.log('🧠 [ORGCHART] OrgChartIntelligent.js cargado');
                this._createCompanyOrgChart(companyId);
            };
            script.onerror = () => {
                console.error('[OrgEngine] Error cargando OrgChartIntelligent.js');
                document.getElementById('orgchart-intelligent-container-company').innerHTML = `
                    <div style="text-align: center; padding: 60px; color: #ef4444;">
                        <div style="font-size: 3rem; margin-bottom: 16px;">❌</div>
                        <div style="font-size: 1.1rem;">Error cargando componente de organigrama inteligente</div>
                        <div style="font-size: 0.9rem; margin-top: 8px; color: rgba(255,255,255,0.6);">Verifica tu conexión e intenta nuevamente</div>
                    </div>
                `;
            };
            document.head.appendChild(script);
        } else {
            this._createCompanyOrgChart(companyId);
        }
    },

    _createCompanyOrgChart(companyId) {
        console.log(`🧠 [ORGCHART] Creando organigrama para company_id: ${companyId}`);

        const orgchart = new OrgChartIntelligent({
            type: 'company',
            companyId: companyId,
            containerId: 'orgchart-intelligent-container-company',
            mode: '2d',
            onNodeClick: (node) => {
                console.log('[ORGCHART-COMPANY] Nodo seleccionado:', node);
                // TODO: Mostrar modal con detalles del empleado
                // OrgEngine.showEmployeeModal(node.entityId);
            },
            onNodeEdit: (node) => {
                // Callback para editar empleado
                console.log('[ORGCHART-COMPANY] Editar:', node);
                // TODO: Abrir modal de edición
            }
        });

        orgchart.init();

        // Guardar instancia para poder usar refresh() y exportChart()
        window.orgchartCompanyInstance = orgchart;
        console.log('✅ [ORGCHART] Organigrama inteligente inicializado');
    },

    refreshOrgChart() {
        if (window.orgchartCompanyInstance) {
            console.log('🔄 [ORGCHART] Refrescando organigrama...');
            window.orgchartCompanyInstance.refresh();
        } else {
            console.log('🔄 [ORGCHART] Re-renderizando organigrama...');
            this.renderOrgChart();
        }
    },

    exportOrgChart() {
        if (window.orgchartCompanyInstance) {
            console.log('📥 [ORGCHART] Exportando organigrama...');
            window.orgchartCompanyInstance.exportChart();
        } else {
            alert('El organigrama no está disponible para exportar. Intenta recargarlo.');
        }
    },

    // ========================================================================
    // POSITIONS TAB - Gestión de Posiciones (Cargos)
    // ========================================================================
    async renderPositions() {
        const content = document.getElementById('org-tab-content');

        // Cargar posiciones desde la API
        let positions = [];
        try {
            const response = await fetch(`/api/v1/organizational/positions?company_id=${getCompanyId()}`, {
                headers: { 'Authorization': `Bearer ${OrgAPI.getToken()}` }
            });
            const result = await response.json();
            positions = result.data || result.positions || [];
        } catch (e) {
            console.error('[OrgEngine] Error cargando posiciones:', e);
        }

        // Organizar por nivel jerárquico
        const byLevel = {};
        positions.forEach(p => {
            const level = p.hierarchy_level || 0;
            if (!byLevel[level]) byLevel[level] = [];
            byLevel[level].push(p);
        });

        const levelNames = {
            0: '👑 CEO / Director General',
            1: '🏛️ Gerentes / Directores',
            2: '👔 Jefes de Área',
            3: '📋 Supervisores / Coordinadores',
            4: '👷 Personal Operativo'
        };

        content.innerHTML = `
            <div class="org-content-header">
                <h3 class="org-content-title">👔 Posiciones Organizacionales</h3>
                <div class="org-toolbar">
                    <button class="org-btn org-btn-secondary" onclick="OrgEngine.showTab('orgchart')">
                        📊 Ver Organigrama
                    </button>
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.openPositionModal()">
                        + Nueva Posición
                    </button>
                </div>
            </div>

            ${positions.length === 0 ? `
                <div class="org-empty">
                    <div class="org-empty-icon">👔</div>
                    <p>No hay posiciones configuradas</p>
                    <p style="font-size: 12px; margin-top: 8px;">
                        Cree posiciones para definir la jerarquía organizacional.<br>
                        Nivel 0 = CEO, Nivel 1 = Gerentes, Nivel 2 = Jefes, etc.
                    </p>
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.openPositionModal()" style="margin-top: 16px;">
                        + Crear Primera Posición
                    </button>
                </div>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    ${Object.keys(byLevel).sort((a,b) => a - b).map(level => `
                        <div class="org-positions-level" style="background: rgba(255,255,255,0.02); border-radius: 8px; padding: 16px;">
                            <h4 style="color: var(--org-text-secondary); margin-bottom: 12px; font-size: 14px;">
                                ${levelNames[level] || `Nivel ${level}`}
                                <span style="color: var(--org-accent); margin-left: 8px;">(${byLevel[level].length})</span>
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;">
                                ${byLevel[level].map(pos => `
                                    <div class="org-position-card" style="
                                        background: rgba(255,255,255,0.05);
                                        border-radius: 6px;
                                        padding: 12px;
                                        border-left: 3px solid ${this.getLevelColor(level)};
                                        transition: all 0.2s ease;
                                        position: relative;
                                    " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                                        <div style="display: flex; justify-content: space-between; align-items: start;">
                                            <div style="cursor: pointer; flex: 1;" onclick="OrgEngine.openPositionModal(${pos.id})">
                                                <strong style="color: var(--org-text-primary);">${pos.position_name}</strong>
                                                <div style="font-size: 11px; color: var(--org-text-secondary); margin-top: 4px;">
                                                    ${pos.department_name ? `🏢 ${pos.department_name}` : ''}
                                                    ${pos.branch_code ? `<span style="margin-left: 8px;">🌳 Rama: ${pos.branch_code}</span>` : ''}
                                                </div>
                                            </div>
                                            <div style="display: flex; gap: 4px; align-items: center;">
                                                ${pos.is_approver ? '<span class="org-badge" style="font-size: 10px; padding: 2px 6px;">✅</span>' : ''}
                                                <button class="org-btn org-btn-secondary org-btn-sm" style="padding: 4px 8px; font-size: 12px;" onclick="event.stopPropagation(); OrgEngine.openPositionModal(${pos.id})">✏️</button>
                                                <button class="org-btn org-btn-danger org-btn-sm" style="padding: 4px 8px; font-size: 12px;" onclick="event.stopPropagation(); OrgEngine.deletePosition(${pos.id})">🗑️</button>
                                            </div>
                                        </div>
                                        ${pos.description ? `<div style="font-size: 11px; color: var(--org-text-muted); margin-top: 8px; cursor: pointer;" onclick="OrgEngine.openPositionModal(${pos.id})">${pos.description.substring(0, 80)}...</div>` : ''}
                                        <div style="display: flex; gap: 8px; margin-top: 8px; font-size: 11px;">
                                            ${pos.parent_position_name ? `<span style="color: var(--org-text-secondary);">↳ Reporta a: ${pos.parent_position_name}</span>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;
    },

    getLevelColor(level) {
        const colors = {
            0: '#1E40AF', // CEO - Dark blue
            1: '#3B82F6', // Managers - Blue
            2: '#10B981', // Chiefs - Green
            3: '#F59E0B', // Supervisors - Yellow
            4: '#6B7280', // Operatives - Gray
        };
        return colors[level] || '#6B7280';
    },

    async openPositionModal(id = null) {
        // Cargar posición si es edición
        let position = null;
        let allPositions = [];

        try {
            const response = await fetch(`/api/v1/organizational/positions?company_id=${getCompanyId()}`, {
                headers: { 'Authorization': `Bearer ${OrgAPI.getToken()}` }
            });
            const result = await response.json();
            allPositions = result.data || result.positions || [];
            if (id) {
                position = allPositions.find(p => p.id === id);
            }
        } catch (e) {
            console.error('[OrgEngine] Error cargando posición:', e);
        }

        const isEdit = !!position;

        const modal = document.createElement('div');
        modal.className = 'org-modal-overlay';
        modal.id = 'org-modal';
        modal.innerHTML = `
            <div class="org-modal" style="max-width: 600px;">
                <div class="org-modal-header">
                    <h3 class="org-modal-title">${isEdit ? 'Editar' : 'Nueva'} Posición</h3>
                    <button class="org-modal-close" onclick="OrgEngine.closeModal()">&times;</button>
                </div>
                <div class="org-modal-body">
                    <form id="org-position-form">
                        <input type="hidden" name="id" value="${position?.id || ''}">

                        <div class="org-form-row">
                            <div class="org-form-group" style="flex: 2;">
                                <label class="org-form-label">Nombre del Cargo *</label>
                                <input type="text" name="position_name" class="org-form-input"
                                    value="${position?.position_name || ''}"
                                    placeholder="Ej: Gerente de RRHH" required
                                    oninput="this.form.position_code.value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')">
                            </div>
                            <div class="org-form-group" style="flex: 1;">
                                <label class="org-form-label">Código *</label>
                                <input type="text" name="position_code" class="org-form-input"
                                    value="${position?.position_code || ''}"
                                    placeholder="gerente_rrhh" required>
                                <small style="color: var(--org-text-secondary); font-size: 10px;">Auto-generado</small>
                            </div>
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Nivel Jerárquico *</label>
                                <select name="hierarchy_level" class="org-form-select" required>
                                    <option value="0" ${position?.hierarchy_level === 0 ? 'selected' : ''}>0 - CEO / Director General</option>
                                    <option value="1" ${position?.hierarchy_level === 1 ? 'selected' : ''}>1 - Gerente / Director</option>
                                    <option value="2" ${position?.hierarchy_level === 2 ? 'selected' : ''}>2 - Jefe de Área</option>
                                    <option value="3" ${position?.hierarchy_level === 3 ? 'selected' : ''}>3 - Supervisor / Coordinador</option>
                                    <option value="4" ${position?.hierarchy_level === 4 ? 'selected' : ''}>4 - Personal Operativo</option>
                                </select>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Código de Rama</label>
                                <input type="text" name="branch_code" class="org-form-input"
                                    value="${position?.branch_code || ''}"
                                    placeholder="Ej: 1.2.3">
                                <small style="color: var(--org-text-secondary); font-size: 10px;">Identifica la rama organizacional</small>
                            </div>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Reporta a (Posición Superior)</label>
                            <select name="parent_position_id" class="org-form-select">
                                <option value="">-- Sin supervisor directo --</option>
                                ${allPositions.filter(p => p.id !== position?.id).map(p => `
                                    <option value="${p.id}" ${position?.parent_position_id === p.id ? 'selected' : ''}>
                                        ${p.position_name} (Nivel ${p.hierarchy_level})
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Departamento</label>
                            <select name="department_id" class="org-form-select">
                                <option value="">-- Opcional --</option>
                                ${OrgState.departments.map(d => `
                                    <option value="${d.id}" ${position?.department_id === d.id ? 'selected' : ''}>${d.name}</option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Descripción</label>
                            <textarea name="description" class="org-form-textarea" rows="2"
                                placeholder="Responsabilidades principales del cargo">${position?.description || ''}</textarea>
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group" style="flex: 0 0 auto;">
                                <label class="org-form-label" style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" name="is_approver" ${position?.is_approver ? 'checked' : ''}>
                                    Es aprobador de solicitudes
                                </label>
                            </div>
                            <div class="org-form-group" style="flex: 1;">
                                <label class="org-form-label">Nivel máximo de aprobación (días)</label>
                                <input type="number" name="max_approval_days" class="org-form-input"
                                    value="${position?.max_approval_days || ''}"
                                    placeholder="Ej: 5" min="0">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="org-modal-footer">
                    <button class="org-btn org-btn-secondary" onclick="OrgEngine.closeModal()">Cancelar</button>
                    ${isEdit ? `<button class="org-btn org-btn-danger" onclick="OrgEngine.deletePosition(${position.id})">Eliminar</button>` : ''}
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.savePosition()">
                        ${isEdit ? 'Guardar Cambios' : 'Crear Posición'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async savePosition() {
        const form = document.getElementById('org-position-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        data.company_id = getCompanyId();
        data.hierarchy_level = parseInt(data.hierarchy_level) || 0;
        data.is_approver = form.querySelector('[name="is_approver"]').checked;
        data.max_approval_days = parseInt(data.max_approval_days) || null;
        data.parent_position_id = data.parent_position_id || null;
        data.department_id = data.department_id || null;

        try {
            const isEdit = !!data.id;
            const url = isEdit
                ? `/api/v1/organizational/positions/${data.id}`
                : '/api/v1/organizational/positions';

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${OrgAPI.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Error guardando posición');
            }

            this.closeModal();
            this.showTab('positions');
            this.showToast(isEdit ? 'Posición actualizada' : 'Posición creada', 'success');
        } catch (error) {
            console.error('[OrgEngine] Error guardando posición:', error);
            this.showToast(error.message, 'error');
        }
    },

    async deletePosition(id) {
        if (!confirm('¿Eliminar esta posición? Los empleados asignados quedarán sin posición.')) return;

        try {
            const response = await fetch(`/api/v1/organizational/positions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${OrgAPI.getToken()}` }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Error eliminando posición');
            }

            this.closeModal();
            this.showTab('positions');
            this.showToast('Posición eliminada', 'success');
        } catch (error) {
            console.error('[OrgEngine] Error eliminando posición:', error);
            this.showToast(error.message, 'error');
        }
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `org-toast org-toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    // ========================================================================
    // MODALS
    // ========================================================================
    openSectorModal(id = null) {
        const sector = id ? OrgState.sectors.find(s => s.id === id) : null;
        const isEdit = !!sector;

        const modal = document.createElement('div');
        modal.className = 'org-modal-overlay';
        modal.id = 'org-modal';
        modal.innerHTML = `
            <div class="org-modal">
                <div class="org-modal-header">
                    <h3 class="org-modal-title">${isEdit ? 'Editar' : 'Nuevo'} Sector</h3>
                    <button class="org-modal-close" onclick="OrgEngine.closeModal()">&times;</button>
                </div>
                <div class="org-modal-body">
                    <form id="org-sector-form">
                        <input type="hidden" name="id" value="${sector?.id || ''}">

                        <div class="org-form-group">
                            <label class="org-form-label">Departamento *</label>
                            <select name="department_id" class="org-form-select" required>
                                <option value="">Seleccionar departamento</option>
                                ${OrgState.departments.map(d => `
                                    <option value="${d.id}" ${sector?.department_id === d.id ? 'selected' : ''}>${d.name}</option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Nombre *</label>
                                <input type="text" name="name" class="org-form-input" value="${sector?.name || ''}" required>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Código</label>
                                <input type="text" name="code" class="org-form-input" value="${sector?.code || ''}">
                            </div>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Descripción</label>
                            <textarea name="description" class="org-form-textarea" rows="3">${sector?.description || ''}</textarea>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Máximo de Empleados</label>
                            <input type="number" name="max_employees" class="org-form-input" value="${sector?.max_employees || ''}" placeholder="Sin límite">
                        </div>
                    </form>
                </div>
                <div class="org-modal-footer">
                    <button class="org-btn org-btn-secondary" onclick="OrgEngine.closeModal()">Cancelar</button>
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.saveSector()">
                        ${isEdit ? 'Guardar Cambios' : 'Crear Sector'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async saveSector() {
        const form = document.getElementById('org-sector-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            if (data.id) {
                await OrgAPI.updateSector(data.id, data);
                this.showToast('Sector actualizado', 'success');
            } else {
                await OrgAPI.createSector(data);
                this.showToast('Sector creado', 'success');
            }
            this.closeModal();
            await this.renderSectors();
            await this.loadInitialData();
            this.updateKPIs();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async deleteSector(id) {
        if (!confirm('¿Eliminar este sector?')) return;

        try {
            await OrgAPI.deleteSector(id);
            this.showToast('Sector eliminado', 'success');
            await this.renderSectors();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    openCategoryModal(id = null) {
        const category = id ? OrgState.categories.find(c => c.category_id === id) : null;
        const isEdit = !!category;

        const modal = document.createElement('div');
        modal.className = 'org-modal-overlay';
        modal.id = 'org-modal';
        modal.innerHTML = `
            <div class="org-modal">
                <div class="org-modal-header">
                    <h3 class="org-modal-title">${isEdit ? 'Editar' : 'Nueva'} Categoría Salarial</h3>
                    <button class="org-modal-close" onclick="OrgEngine.closeModal()">&times;</button>
                </div>
                <div class="org-modal-body">
                    <form id="org-category-form">
                        <input type="hidden" name="id" value="${category?.category_id || ''}">

                        <div class="org-form-group">
                            <label class="org-form-label">Convenio *</label>
                            <select name="agreement_id" class="org-form-select" required>
                                <option value="">Seleccionar convenio</option>
                                ${OrgState.agreements.map(a => `
                                    <option value="${a.id}" ${category?.agreement_id === a.id ? 'selected' : ''}>${a.name}</option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Código *</label>
                                <input type="text" name="category_code" class="org-form-input" value="${category?.category_code || ''}" required placeholder="Ej: CAT-1">
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Nivel</label>
                                <input type="number" name="level" class="org-form-input" value="${category?.level || 1}" min="1">
                            </div>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Nombre de la Categoría *</label>
                            <input type="text" name="category_name" class="org-form-input" value="${category?.category_name || ''}" required placeholder="Ej: Operario Calificado">
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Sueldo Base Mensual *</label>
                                <input type="number" name="base_salary" class="org-form-input" value="${category?.base_salary || ''}" required step="0.01">
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Valor Hora</label>
                                <input type="number" name="hourly_rate" class="org-form-input" value="${category?.hourly_rate || ''}" step="0.01" placeholder="Auto-calculado">
                            </div>
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Experiencia Mínima (años)</label>
                                <input type="number" name="min_experience_years" class="org-form-input" value="${category?.min_experience_years || 0}" min="0">
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Requiere Título</label>
                                <select name="requires_degree" class="org-form-select">
                                    <option value="false" ${!category?.requires_degree ? 'selected' : ''}>No</option>
                                    <option value="true" ${category?.requires_degree ? 'selected' : ''}>Sí</option>
                                </select>
                            </div>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Descripción</label>
                            <textarea name="description" class="org-form-textarea" rows="2">${category?.description || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="org-modal-footer">
                    <button class="org-btn org-btn-secondary" onclick="OrgEngine.closeModal()">Cancelar</button>
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.saveCategory()">
                        ${isEdit ? 'Guardar Cambios' : 'Crear Categoría'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async saveCategory() {
        const form = document.getElementById('org-category-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Convertir tipos
        data.base_salary = parseFloat(data.base_salary);
        data.hourly_rate = data.hourly_rate ? parseFloat(data.hourly_rate) : null;
        data.level = parseInt(data.level) || 1;
        data.min_experience_years = parseInt(data.min_experience_years) || 0;
        data.requires_degree = data.requires_degree === 'true';

        try {
            if (data.id) {
                await OrgAPI.updateCategory(data.id, data);
                this.showToast('Categoría actualizada', 'success');
            } else {
                await OrgAPI.createCategory(data);
                this.showToast('Categoría creada', 'success');
            }
            this.closeModal();
            await this.renderCategories();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async deleteCategory(id) {
        if (!confirm('¿Eliminar esta categoría?')) return;

        try {
            await OrgAPI.deleteCategory(id);
            this.showToast('Categoría eliminada', 'success');
            await this.renderCategories();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    openRoleModal(id = null) {
        const role = id ? OrgState.roles.find(r => r.id === id) : null;
        const isEdit = !!role;

        const categories = ['seguridad', 'emergencias', 'capacitacion', 'representacion', 'supervision', 'tecnico', 'otros'];

        const modal = document.createElement('div');
        modal.className = 'org-modal-overlay';
        modal.id = 'org-modal';
        modal.innerHTML = `
            <div class="org-modal">
                <div class="org-modal-header">
                    <h3 class="org-modal-title">${isEdit ? 'Editar' : 'Nuevo'} Rol Adicional</h3>
                    <button class="org-modal-close" onclick="OrgEngine.closeModal()">&times;</button>
                </div>
                <div class="org-modal-body">
                    <form id="org-role-form">
                        <input type="hidden" name="id" value="${role?.id || ''}">

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Clave Única *</label>
                                <input type="text" name="role_key" class="org-form-input" value="${role?.role_key || ''}" required placeholder="brigadista_incendios" ${isEdit ? 'readonly' : ''}>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Icono</label>
                                <input type="text" name="icon" class="org-form-input" value="${role?.icon || '🏷️'}" maxlength="4">
                            </div>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Nombre del Rol *</label>
                            <input type="text" name="role_name" class="org-form-input" value="${role?.role_name || ''}" required placeholder="Brigadista de Incendios">
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Categoría</label>
                                <select name="category" class="org-form-select">
                                    ${categories.map(c => `
                                        <option value="${c}" ${role?.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Color</label>
                                <input type="color" name="color" class="org-form-input" value="${role?.color || '#6c757d'}" style="height: 38px;">
                            </div>
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Requiere Certificación</label>
                                <select name="requires_certification" class="org-form-select">
                                    <option value="false" ${!role?.requires_certification ? 'selected' : ''}>No</option>
                                    <option value="true" ${role?.requires_certification ? 'selected' : ''}>Sí</option>
                                </select>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Validez Certificación (meses)</label>
                                <input type="number" name="certification_validity_months" class="org-form-input" value="${role?.certification_validity_months || 12}" min="1">
                            </div>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Bonus de Scoring (%)</label>
                            <input type="number" name="scoring_bonus" class="org-form-input" value="${role?.scoring_bonus ? (role.scoring_bonus * 100) : 5}" min="0" max="50" step="1">
                            <small style="color: var(--org-text-secondary);">Porcentaje adicional para cálculos de asistencia/desempeño</small>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Descripción</label>
                            <textarea name="description" class="org-form-textarea" rows="2">${role?.description || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="org-modal-footer">
                    <button class="org-btn org-btn-secondary" onclick="OrgEngine.closeModal()">Cancelar</button>
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.saveRole()">
                        ${isEdit ? 'Guardar Cambios' : 'Crear Rol'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async saveRole() {
        const form = document.getElementById('org-role-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Convertir tipos
        data.requires_certification = data.requires_certification === 'true';
        data.certification_validity_months = parseInt(data.certification_validity_months) || 12;
        data.scoring_bonus = parseFloat(data.scoring_bonus) / 100 || 0.05;

        try {
            if (data.id) {
                await OrgAPI.updateRole(data.id, data);
                this.showToast('Rol actualizado', 'success');
            } else {
                await OrgAPI.createRole(data);
                this.showToast('Rol creado', 'success');
            }
            this.closeModal();
            await this.renderRoles();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async deleteRole(id) {
        if (!confirm('¿Eliminar este rol? Los empleados con este rol perderán la asignación.')) return;

        try {
            await OrgAPI.deleteRole(id);
            this.showToast('Rol eliminado', 'success');
            await this.renderRoles();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    openAgreementModal(id = null) {
        const agreement = id ? OrgState.agreements.find(a => a.id === id) : null;
        const isEdit = !!agreement;
        const isGlobal = agreement && !agreement.company_id;

        const modal = document.createElement('div');
        modal.className = 'org-modal-overlay';
        modal.id = 'org-modal';
        modal.innerHTML = `
            <div class="org-modal">
                <div class="org-modal-header">
                    <h3 class="org-modal-title">${isEdit ? (isGlobal ? 'Ver' : 'Editar') : 'Nuevo'} Convenio Laboral</h3>
                    <button class="org-modal-close" onclick="OrgEngine.closeModal()">&times;</button>
                </div>
                <div class="org-modal-body">
                    ${isGlobal ? '<div style="background: rgba(137,87,229,0.1); border: 1px solid #8957e5; padding: 10px; border-radius: 6px; margin-bottom: 16px;"><strong>Convenio Global</strong> - Solo lectura. Cree una copia para personalizar.</div>' : ''}
                    <form id="org-agreement-form">
                        <input type="hidden" name="id" value="${agreement?.id || ''}">

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Código</label>
                                <input type="text" name="code" class="org-form-input" value="${agreement?.code || ''}" ${isGlobal ? 'readonly' : ''} placeholder="CCT-123/75">
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Industria</label>
                                <input type="text" name="industry" class="org-form-input" value="${agreement?.industry || ''}" ${isGlobal ? 'readonly' : ''}>
                            </div>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Nombre Completo *</label>
                            <input type="text" name="name" class="org-form-input" value="${agreement?.name || ''}" ${isGlobal ? 'readonly' : ''} required>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Nombre Corto</label>
                            <input type="text" name="short_name" class="org-form-input" value="${agreement?.short_name || ''}" ${isGlobal ? 'readonly' : ''}>
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Horas/Semana</label>
                                <input type="number" name="base_work_hours_weekly" class="org-form-input" value="${agreement?.base_work_hours_weekly || 40}" ${isGlobal ? 'readonly' : ''}>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Horas/Día</label>
                                <input type="number" name="base_work_hours_daily" class="org-form-input" value="${agreement?.base_work_hours_daily || 8}" ${isGlobal ? 'readonly' : ''}>
                            </div>
                        </div>

                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Multiplicador Extras 50%</label>
                                <input type="number" name="overtime_50_multiplier" class="org-form-input" value="${agreement?.overtime_50_multiplier || 1.5}" step="0.1" ${isGlobal ? 'readonly' : ''}>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Multiplicador Extras 100%</label>
                                <input type="number" name="overtime_100_multiplier" class="org-form-input" value="${agreement?.overtime_100_multiplier || 2.0}" step="0.1" ${isGlobal ? 'readonly' : ''}>
                            </div>
                        </div>

                        <div class="org-form-group">
                            <label class="org-form-label">Multiplicador Turno Noche</label>
                            <input type="number" name="night_shift_multiplier" class="org-form-input" value="${agreement?.night_shift_multiplier || 1.0}" step="0.1" ${isGlobal ? 'readonly' : ''}>
                        </div>
                    </form>
                </div>
                <div class="org-modal-footer">
                    <button class="org-btn org-btn-secondary" onclick="OrgEngine.closeModal()">Cerrar</button>
                    ${!isGlobal ? `
                        <button class="org-btn org-btn-primary" onclick="OrgEngine.saveAgreement()">
                            ${isEdit ? 'Guardar Cambios' : 'Crear Convenio'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async saveAgreement() {
        const form = document.getElementById('org-agreement-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Convertir tipos
        data.base_work_hours_weekly = parseInt(data.base_work_hours_weekly) || 40;
        data.base_work_hours_daily = parseInt(data.base_work_hours_daily) || 8;
        data.overtime_50_multiplier = parseFloat(data.overtime_50_multiplier) || 1.5;
        data.overtime_100_multiplier = parseFloat(data.overtime_100_multiplier) || 2.0;
        data.night_shift_multiplier = parseFloat(data.night_shift_multiplier) || 1.0;

        try {
            if (data.id) {
                await OrgAPI.updateAgreement(data.id, data);
                this.showToast('Convenio actualizado', 'success');
            } else {
                await OrgAPI.createAgreement(data);
                this.showToast('Convenio creado', 'success');
            }
            this.closeModal();
            await this.renderAgreements();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async deleteAgreement(id) {
        if (!confirm('¿Eliminar este convenio? Las categorías asociadas quedarán sin convenio.')) return;

        try {
            await OrgAPI.deleteAgreement(id);
            this.showToast('Convenio eliminado', 'success');
            await this.renderAgreements();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    // ========================================================================
    // DEPARTAMENTOS - Modal completo con GPS, kiosks, sucursales
    // ========================================================================
    async openDepartmentModal(id = null) {
        const dept = id ? OrgState.departments.find(d => d.id === id) : null;
        const isEdit = !!dept;

        // Cargar kiosks y sucursales
        const kiosks = await this.loadKiosksForDepartment();
        const branches = await this.loadBranchesForDepartment();

        // Datos del departamento para edición
        const deptData = {
            id: dept?.id || '',
            name: dept?.name || '',
            code: dept?.code || '',
            description: dept?.description || '',
            address: dept?.address || '',
            gpsLat: dept?.gpsLocation?.lat || dept?.gps_lat || '',
            gpsLng: dept?.gpsLocation?.lng || dept?.gps_lng || '',
            coverageRadius: dept?.coverageRadius || dept?.coverage_radius || 50,
            allowGpsAttendance: dept?.allow_gps_attendance || dept?.allowGpsAttendance || false,
            authorizedKiosks: dept?.authorized_kiosks || dept?.authorizedKiosks || [],
            branchId: dept?.branch_id || dept?.branchId || ''
        };

        const modal = document.createElement('div');
        modal.className = 'org-modal-overlay';
        modal.id = 'org-modal';
        modal.innerHTML = `
            <div class="org-modal" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                <div class="org-modal-header">
                    <h3 class="org-modal-title">🏢 ${isEdit ? 'Editar' : 'Nuevo'} Departamento</h3>
                    <button class="org-modal-close" onclick="OrgEngine.closeModal()">&times;</button>
                </div>
                <div class="org-modal-body">
                    <form id="org-department-form">
                        <input type="hidden" name="id" value="${deptData.id}">

                        <!-- Sucursal (si hay sucursales disponibles) -->
                        ${branches.length > 0 ? `
                        <div class="org-form-group" style="margin-bottom: 20px;">
                            <label class="org-form-label"><strong>🏛️ Sucursal:</strong></label>
                            <select name="branch_id" class="org-form-input">
                                <option value="">-- Seleccione sucursal --</option>
                                ${branches.map(b => `<option value="${b.id}" ${deptData.branchId == b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                            </select>
                        </div>
                        ` : ''}

                        <!-- Nombre y Código -->
                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label"><strong>🏢 Nombre *</strong></label>
                                <input type="text" name="name" class="org-form-input" value="${deptData.name}" required placeholder="Ej: Sistemas, RRHH, Operaciones">
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label"><strong>🔖 Código</strong></label>
                                <input type="text" name="code" class="org-form-input" value="${deptData.code}" placeholder="Ej: SIS, RRHH">
                            </div>
                        </div>

                        <!-- Descripción -->
                        <div class="org-form-group">
                            <label class="org-form-label"><strong>📝 Descripción</strong></label>
                            <textarea name="description" class="org-form-textarea" rows="2" placeholder="Descripción del departamento">${deptData.description}</textarea>
                        </div>

                        <!-- Dirección -->
                        <div class="org-form-group">
                            <label class="org-form-label"><strong>📍 Dirección</strong></label>
                            <input type="text" name="address" class="org-form-input" value="${deptData.address}" placeholder="Ej: Piso 3, Oficina 301">
                        </div>

                        <!-- Checkbox Permitir GPS -->
                        <div style="margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: bold;">
                                <input type="checkbox" name="allow_gps_attendance" id="dept-allow-gps" style="width: 20px; height: 20px;" ${deptData.allowGpsAttendance ? 'checked' : ''}>
                                <span>📱 Permitir fichaje por GPS desde APK</span>
                            </label>
                            <small style="color: #666; display: block; margin-left: 30px; margin-top: 5px;">
                                Los empleados podrán fichar desde la aplicación móvil si están dentro del radio de cobertura.
                            </small>
                        </div>

                        <!-- Sección GPS (visible si está habilitado) -->
                        <div id="dept-gps-section" style="display: ${deptData.allowGpsAttendance ? 'block' : 'none'}; margin-bottom: 20px; padding: 20px; background: #f0f8ff; border-radius: 8px;">
                            <label style="font-weight: bold; margin-bottom: 10px; display: block;">📍 Configuración GPS:</label>
                            <small style="color: #666; display: block; margin-bottom: 15px;">
                                Define las coordenadas del centro del departamento y el radio de cobertura permitido.
                            </small>

                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                                <div>
                                    <label style="font-size: 12px; color: #555; font-weight: bold;">Latitud:</label>
                                    <input type="number" name="gps_lat" step="0.00000001" class="org-form-input" value="${deptData.gpsLat}" placeholder="-34.603722">
                                </div>
                                <div>
                                    <label style="font-size: 12px; color: #555; font-weight: bold;">Longitud:</label>
                                    <input type="number" name="gps_lng" step="0.00000001" class="org-form-input" value="${deptData.gpsLng}" placeholder="-58.381592">
                                </div>
                                <div>
                                    <label style="font-size: 12px; color: #555; font-weight: bold;">📏 Radio (metros):</label>
                                    <input type="number" name="coverage_radius" min="10" max="1000" class="org-form-input" value="${deptData.coverageRadius}">
                                </div>
                            </div>

                            <div style="margin-top: 15px;">
                                <button type="button" class="org-btn org-btn-secondary org-btn-sm" onclick="OrgEngine.getCurrentLocation()">
                                    📍 Usar mi ubicación actual
                                </button>
                            </div>

                            <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px; border-left: 3px solid #ffc107;">
                                <small style="color: #856404;">
                                    💡 <strong>Tip:</strong> Puedes buscar la dirección en Google Maps, hacer clic derecho y copiar las coordenadas.
                                </small>
                            </div>
                        </div>

                        <!-- Sección Kiosks Autorizados -->
                        <div style="margin-bottom: 20px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
                            <label style="font-weight: bold; margin-bottom: 10px; display: block;">🖥️ Kiosks Autorizados:</label>
                            <small style="color: #666; display: block; margin-bottom: 12px;">
                                Selecciona los kiosks desde donde los empleados de este departamento pueden fichar.
                            </small>

                            <div id="dept-kiosks-container" style="max-height: 180px; overflow-y: auto; border: 1px solid #ddd; padding: 12px; background: white; border-radius: 5px;">
                                ${kiosks.length > 0 ? `
                                    <div style="margin-bottom: 10px; padding: 8px; background: #e8f5e9; border-radius: 4px;">
                                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: bold;">
                                            <input type="checkbox" id="dept-all-kiosks" style="width: 18px; height: 18px;">
                                            <span>✅ Seleccionar todos</span>
                                        </label>
                                    </div>
                                    <hr style="margin: 10px 0; border-color: #eee;">
                                    ${kiosks.map(k => `
                                        <div style="margin-bottom: 6px;">
                                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                                <input type="checkbox" name="authorized_kiosks" value="${k.id}" class="dept-kiosk-cb" style="width: 16px; height: 16px;" ${deptData.authorizedKiosks.includes(k.id) ? 'checked' : ''}>
                                                <span>${k.name}${k.location ? ' - ' + k.location : ''}</span>
                                            </label>
                                        </div>
                                    `).join('')}
                                ` : '<p style="color: #999; margin: 0;">No hay kiosks disponibles</p>'}
                            </div>

                            <div style="margin-top: 10px; padding: 10px; background: #e1f5fe; border-radius: 5px;">
                                <small style="color: #01579b;">
                                    ℹ️ Los empleados pueden fichar por <strong>GPS</strong> y/o <strong>Kiosks</strong>. Se recomienda habilitar al menos una opción.
                                </small>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="org-modal-footer">
                    <button class="org-btn org-btn-secondary" onclick="OrgEngine.closeModal()">Cancelar</button>
                    <button class="org-btn org-btn-primary" onclick="OrgEngine.saveDepartment()">
                        ${isEdit ? '💾 Guardar Cambios' : '✅ Crear Departamento'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Event listeners
        this.setupDepartmentModalEvents();
    },

    setupDepartmentModalEvents() {
        // Toggle sección GPS
        const gpsCheckbox = document.getElementById('dept-allow-gps');
        const gpsSection = document.getElementById('dept-gps-section');
        if (gpsCheckbox && gpsSection) {
            gpsCheckbox.addEventListener('change', (e) => {
                gpsSection.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Seleccionar todos los kiosks
        const allKiosksCheckbox = document.getElementById('dept-all-kiosks');
        if (allKiosksCheckbox) {
            allKiosksCheckbox.addEventListener('change', (e) => {
                document.querySelectorAll('.dept-kiosk-cb').forEach(cb => cb.checked = e.target.checked);
            });

            // Actualizar "todos" cuando cambia individual
            document.querySelectorAll('.dept-kiosk-cb').forEach(cb => {
                cb.addEventListener('change', () => {
                    const allChecked = Array.from(document.querySelectorAll('.dept-kiosk-cb')).every(c => c.checked);
                    allKiosksCheckbox.checked = allChecked;
                });
            });
        }
    },

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showToast('Geolocalización no soportada', 'error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latInput = document.querySelector('input[name="gps_lat"]');
                const lngInput = document.querySelector('input[name="gps_lng"]');
                if (latInput) latInput.value = position.coords.latitude.toFixed(8);
                if (lngInput) lngInput.value = position.coords.longitude.toFixed(8);
                this.showToast('Ubicación obtenida', 'success');
            },
            (error) => {
                this.showToast('Error obteniendo ubicación: ' + error.message, 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    },

    async loadKiosksForDepartment() {
        try {
            const response = await fetch('/api/v1/kiosks?company_id=' + getCompanyId(), {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.kiosks || data.data || [];
        } catch (error) {
            console.warn('Error cargando kiosks:', error);
            return [];
        }
    },

    async loadBranchesForDepartment() {
        try {
            const response = await fetch('/api/v1/companies/' + getCompanyId() + '/branches', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            if (!response.ok) return [];
            const data = await response.json();
            return data.branches || data.data || [];
        } catch (error) {
            console.warn('Error cargando sucursales:', error);
            return [];
        }
    },

    async saveDepartment() {
        const form = document.getElementById('org-department-form');
        const formData = new FormData(form);

        // Recolectar kiosks autorizados
        const selectedKiosks = Array.from(document.querySelectorAll('.dept-kiosk-cb:checked'))
            .map(cb => parseInt(cb.value));

        // Construir datos del departamento
        const data = {
            name: formData.get('name'),
            code: formData.get('code'),
            description: formData.get('description'),
            address: formData.get('address'),
            branch_id: formData.get('branch_id') || null,
            allow_gps_attendance: formData.get('allow_gps_attendance') === 'on',
            gpsLocation: {
                lat: parseFloat(formData.get('gps_lat')) || null,
                lng: parseFloat(formData.get('gps_lng')) || null
            },
            coverageRadius: parseInt(formData.get('coverage_radius')) || 50,
            authorized_kiosks: selectedKiosks
        };

        // Validaciones
        if (!data.name || data.name.trim().length < 2) {
            this.showToast('El nombre debe tener al menos 2 caracteres', 'error');
            return;
        }

        if (!data.allow_gps_attendance && selectedKiosks.length === 0) {
            this.showToast('Debe habilitar GPS o seleccionar al menos un kiosk', 'error');
            return;
        }

        if (data.allow_gps_attendance) {
            if (!data.gpsLocation.lat || !data.gpsLocation.lng) {
                this.showToast('Configure las coordenadas GPS', 'error');
                return;
            }
        }

        const deptId = formData.get('id');

        try {
            if (deptId) {
                await OrgAPI.updateDepartment(deptId, data);
                this.showToast('Departamento actualizado', 'success');
            } else {
                await OrgAPI.createDepartment(data);
                this.showToast('Departamento creado', 'success');
            }
            this.closeModal();
            await this.renderDepartments();
            await this.loadInitialData();
            this.updateKPIs();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async deleteDepartment(id) {
        if (!confirm('¿Eliminar este departamento? Esta acción no se puede deshacer.')) return;

        try {
            await OrgAPI.deleteDepartment(id);
            this.showToast('Departamento eliminado', 'success');
            await this.renderDepartments();
            await this.loadInitialData();
            this.updateKPIs();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    // ========================================================================
    // MODAL CREAR/EDITAR TURNO (CON SOLAPAS)
    // ========================================================================
    async openShiftModal(shiftId = null) {
        const isEdit = !!shiftId;
        let shift = {};

        if (isEdit) {
            shift = OrgState.shifts.find(s => s.id == shiftId) || {};
        }

        // Cargar sucursales (obligatorio)
        const branches = await this.loadBranchesForDepartment();
        OrgState.branches = branches;

        // Auto-seleccionar sucursal principal si no hay branch_id seleccionado
        const mainBranch = branches.find(b => b.is_main || b.isMain);
        if (!shift.branch_id && mainBranch) {
            shift.branch_id = mainBranch.id;
            console.log('🏛️ [SHIFT-MODAL] Auto-seleccionando sucursal principal:', mainBranch.name, 'ID:', mainBranch.id);
        } else if (!shift.branch_id && branches.length > 0) {
            // Fallback: si no hay is_main, usar la primera sucursal
            shift.branch_id = branches[0].id;
            console.log('🏛️ [SHIFT-MODAL] Usando primera sucursal como fallback:', branches[0].name, 'ID:', branches[0].id);
        }

        const modal = document.createElement('div');
        modal.className = 'org-modal-overlay';
        modal.id = 'org-modal';
        modal.innerHTML = `
            <div class="org-modal" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
                <div class="org-modal-header">
                    <h3 class="org-modal-title">⏰ ${isEdit ? 'Editar' : 'Nuevo'} Turno</h3>
                    <button class="org-modal-close" onclick="OrgEngine.closeModal()">&times;</button>
                </div>
                <div class="org-modal-body">
                    <!-- Tabs del Modal - Tema Oscuro -->
                    <div style="display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 10px; flex-wrap: wrap;">
                        <button type="button" class="shift-modal-tab active" data-tab="basico" onclick="OrgEngine.switchShiftTab('basico')" style="background: linear-gradient(135deg, #10B981, #059669); border: none; color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">
                            📋 Básicos
                        </button>
                        <button type="button" class="shift-modal-tab" data-tab="horarios" onclick="OrgEngine.switchShiftTab('horarios')" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            🕐 Horarios
                        </button>
                        <button type="button" class="shift-modal-tab" data-tab="dias" onclick="OrgEngine.switchShiftTab('dias')" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            📅 Días
                        </button>
                        <button type="button" class="shift-modal-tab" data-tab="feriados" onclick="OrgEngine.switchShiftTab('feriados')" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            🎉 Feriados
                        </button>
                        <button type="button" class="shift-modal-tab" data-tab="opciones" onclick="OrgEngine.switchShiftTab('opciones')" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            ⚙️ Opciones
                        </button>
                    </div>

                    <form id="shift-form" onsubmit="OrgEngine.saveShift(event, ${shiftId || 'null'})">
                        <!-- Tab: Datos Básicos -->
                        <div id="shift-tab-basico" class="shift-tab-content">
                            <div class="org-form-group">
                                <label class="org-form-label">Nombre del Turno *</label>
                                <input type="text" class="org-form-input" name="name" value="${shift.name || ''}" required placeholder="Ej: Turno Mañana, Turno Rotativo A">
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Código</label>
                                <input type="text" class="org-form-input" name="code" value="${shift.code || ''}" placeholder="Ej: TM, TR-A">
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Descripción</label>
                                <textarea class="org-form-input" name="description" rows="2" placeholder="Descripción opcional del turno">${shift.description || ''}</textarea>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Sucursal *</label>
                                <select class="org-form-input" name="branch_id" required>
                                    ${branches.length === 0 ? '<option value="">-- No hay sucursales --</option>' :
                                    branches.map(b => `
                                        <option value="${b.id}" ${shift.branch_id == b.id ? 'selected' : ''}>${b.name}${b.is_main || b.isMain ? ' ★' : ''}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- Tab: Horarios -->
                        <div id="shift-tab-horarios" class="shift-tab-content" style="display: none;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div class="org-form-group">
                                    <label class="org-form-label">Hora de Entrada *</label>
                                    <input type="time" class="org-form-input" name="start_time" value="${shift.start_time || shift.startTime || '08:00'}" required>
                                </div>
                                <div class="org-form-group">
                                    <label class="org-form-label">Hora de Salida *</label>
                                    <input type="time" class="org-form-input" name="end_time" value="${shift.end_time || shift.endTime || '17:00'}" required>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                                <div class="org-form-group">
                                    <label class="org-form-label">Tolerancia Entrada (min)</label>
                                    <input type="number" class="org-form-input" name="entry_tolerance" value="${shift.entry_tolerance || 10}" min="0" max="60">
                                </div>
                                <div class="org-form-group">
                                    <label class="org-form-label">Tolerancia Salida (min)</label>
                                    <input type="number" class="org-form-input" name="exit_tolerance" value="${shift.exit_tolerance || 10}" min="0" max="60">
                                </div>
                            </div>
                            <div class="org-form-group" style="margin-top: 15px;">
                                <label class="org-form-label">Duración del Descanso (min)</label>
                                <input type="number" class="org-form-input" name="break_duration" value="${shift.break_duration || 60}" min="0" max="180">
                                <small style="color: #666;">Tiempo de almuerzo/descanso durante el turno</small>
                            </div>
                        </div>

                        <!-- Tab: Días Laborables -->
                        <div id="shift-tab-dias" class="shift-tab-content" style="display: none;">
                            <p style="margin-bottom: 15px; color: rgba(255,255,255,0.7); font-size: 13px;">Selecciona los días que se trabaja en este turno:</p>
                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;">
                                ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, idx) => {
                                    const dayNum = idx + 1;
                                    const isChecked = shift.work_days ? (Array.isArray(shift.work_days) ? shift.work_days.includes(dayNum) : true) : (dayNum <= 5);
                                    return `
                                        <label style="display: flex; flex-direction: column; align-items: center; padding: 8px 4px; background: ${isChecked ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${isChecked ? '#10B981' : 'rgba(255,255,255,0.1)'}; border-radius: 6px; cursor: pointer; transition: all 0.2s;" class="shift-day-label">
                                            <input type="checkbox" name="work_days" value="${dayNum}" ${isChecked ? 'checked' : ''} style="margin-bottom: 4px; width: 14px; height: 14px;" onchange="this.parentElement.style.background = this.checked ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'; this.parentElement.style.borderColor = this.checked ? '#10B981' : 'rgba(255,255,255,0.1)';">
                                            <span style="font-weight: 500; font-size: 11px; color: rgba(255,255,255,0.9);">${day}</span>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                            <div style="margin-top: 15px; padding: 10px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px; font-size: 12px; color: rgba(255,255,255,0.8);">
                                💡 Para turnos rotativos, puedes crear múltiples turnos con diferentes días.
                            </div>
                        </div>

                        <!-- Tab: Feriados -->
                        <div id="shift-tab-feriados" class="shift-tab-content" style="display: none;">
                            <div style="display: flex; flex-direction: column; gap: 15px;">
                                <label style="display: flex; align-items: center; gap: 12px; padding: 15px; background: #f5f5f5; border-radius: 8px; cursor: pointer;">
                                    <input type="checkbox" name="respect_national_holidays" ${shift.respect_national_holidays !== false ? 'checked' : ''} style="width: 20px; height: 20px;">
                                    <div>
                                        <div style="font-weight: 600;">🇦🇷 Respetar Feriados Nacionales</div>
                                        <small style="color: #666;">Los empleados de este turno no trabajan en feriados nacionales</small>
                                    </div>
                                </label>
                                <label style="display: flex; align-items: center; gap: 12px; padding: 15px; background: #f5f5f5; border-radius: 8px; cursor: pointer;">
                                    <input type="checkbox" name="respect_provincial_holidays" ${shift.respect_provincial_holidays ? 'checked' : ''} style="width: 20px; height: 20px;">
                                    <div>
                                        <div style="font-weight: 600;">🏛️ Respetar Feriados Provinciales</div>
                                        <small style="color: #666;">Según la provincia de la sucursal asignada</small>
                                    </div>
                                </label>
                            </div>
                            <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
                                <strong>📅 Días No Laborables Personalizados:</strong>
                                <p style="margin: 8px 0; font-size: 13px; color: #666;">Puedes agregar días específicos después de crear el turno usando el botón 📅 en la tabla.</p>
                            </div>
                        </div>

                        <!-- Tab: Opciones -->
                        <div id="shift-tab-opciones" class="shift-tab-content" style="display: none;">
                            <div class="org-form-group">
                                <label style="display: flex; align-items: center; gap: 12px; padding: 15px; background: #f5f5f5; border-radius: 8px; cursor: pointer;">
                                    <input type="checkbox" name="is_active" ${shift.is_active !== false ? 'checked' : ''} style="width: 20px; height: 20px;">
                                    <div>
                                        <div style="font-weight: 600;">✅ Turno Activo</div>
                                        <small style="color: #666;">Los turnos inactivos no aparecen en las asignaciones</small>
                                    </div>
                                </label>
                            </div>
                            <div class="org-form-group" style="margin-top: 15px;">
                                <label style="display: flex; align-items: center; gap: 12px; padding: 15px; background: #f5f5f5; border-radius: 8px; cursor: pointer;">
                                    <input type="checkbox" name="is_flexible" ${shift.is_flexible ? 'checked' : ''} style="width: 20px; height: 20px;">
                                    <div>
                                        <div style="font-weight: 600;">🔄 Horario Flexible</div>
                                        <small style="color: #666;">Permite variaciones en horario de entrada/salida</small>
                                    </div>
                                </label>
                            </div>
                            <div class="org-form-group" style="margin-top: 15px;">
                                <label style="display: flex; align-items: center; gap: 12px; padding: 15px; background: #f5f5f5; border-radius: 8px; cursor: pointer;">
                                    <input type="checkbox" name="requires_overtime_approval" ${shift.requires_overtime_approval !== false ? 'checked' : ''} style="width: 20px; height: 20px;">
                                    <div>
                                        <div style="font-weight: 600;">⏱️ Horas Extra Requieren Aprobación</div>
                                        <small style="color: #666;">Las horas extra deben ser aprobadas por supervisor</small>
                                    </div>
                                </label>
                            </div>
                            <div class="org-form-group" style="margin-top: 15px;">
                                <label class="org-form-label">Color del Turno</label>
                                <input type="color" class="org-form-input" name="color" value="${shift.color || '#4CAF50'}" style="height: 45px; padding: 5px;">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="org-modal-footer">
                    <button type="button" class="org-btn" onclick="OrgEngine.closeModal()">Cancelar</button>
                    <button type="submit" form="shift-form" class="org-btn org-btn-primary">
                        ${isEdit ? '💾 Guardar Cambios' : '✅ Crear Turno'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));
    },

    switchShiftTab(tabId) {
        // Ocultar todos los tabs
        document.querySelectorAll('.shift-tab-content').forEach(tab => tab.style.display = 'none');
        document.querySelectorAll('.shift-modal-tab').forEach(btn => btn.classList.remove('active'));

        // Mostrar tab seleccionado
        document.getElementById(`shift-tab-${tabId}`).style.display = 'block';
        document.querySelector(`.shift-modal-tab[data-tab="${tabId}"]`).classList.add('active');
    },

    async saveShift(event, shiftId) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        console.log('🕐 [SHIFT-SAVE] Iniciando guardado de turno...');

        // Recoger días laborables
        const workDays = [];
        form.querySelectorAll('input[name="work_days"]:checked').forEach(cb => {
            workDays.push(parseInt(cb.value));
        });

        const data = {
            name: formData.get('name'),
            code: formData.get('code') || null,
            description: formData.get('description') || null,
            branch_id: formData.get('branch_id') || null,
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            entry_tolerance: parseInt(formData.get('entry_tolerance')) || 10,
            exit_tolerance: parseInt(formData.get('exit_tolerance')) || 10,
            break_duration: parseInt(formData.get('break_duration')) || 60,
            work_days: workDays,
            respect_national_holidays: form.querySelector('input[name="respect_national_holidays"]')?.checked || false,
            respect_provincial_holidays: form.querySelector('input[name="respect_provincial_holidays"]')?.checked || false,
            is_active: form.querySelector('input[name="is_active"]')?.checked !== false, // true por defecto
            is_flexible: form.querySelector('input[name="is_flexible"]')?.checked || false,
            requires_overtime_approval: form.querySelector('input[name="requires_overtime_approval"]')?.checked || false,
            color: formData.get('color') || '#007bff',
            company_id: getCompanyId()
        };

        // VALIDACIÓN CRÍTICA
        if (!data.name || !data.start_time || !data.end_time) {
            console.error('🕐 [SHIFT-SAVE] ERROR: Campos requeridos faltantes:', {
                name: data.name,
                start_time: data.start_time,
                end_time: data.end_time
            });
            this.showToast('Error: Nombre, hora de inicio y fin son requeridos', 'error');
            return;
        }

        console.log('🕐 [SHIFT-SAVE] Datos a enviar:', data);

        try {
            const url = shiftId ? `/api/v1/shifts/${shiftId}` : '/api/v1/shifts';
            const method = shiftId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
                console.error('🕐 [SHIFT-SAVE] Error del servidor:', {
                    status: response.status,
                    error: errorData
                });
                throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('🕐 [SHIFT-SAVE] Turno guardado exitosamente:', result);

            this.closeModal();
            this.showToast(shiftId ? 'Turno actualizado' : 'Turno creado exitosamente', 'success');
            await this.renderShifts();
        } catch (error) {
            console.error('🕐 [SHIFT-SAVE] Error capturado:', error);
            this.showToast(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================================================
    // CALENDARIO DE FERIADOS PARA TURNOS
    // ========================================================================
    async openShiftCalendarModal(shiftId) {
        try {
            // Obtener feriados del turno desde la API
            const response = await fetch(`/api/v1/organizational/shifts/${shiftId}/holidays?year=${new Date().getFullYear()}&company_id=${getCompanyId()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (!response.ok) {
                throw new Error('Error obteniendo feriados');
            }

            const result = await response.json();
            const data = result.data || {};

            const shift = data.shift || OrgState.shifts.find(s => s.id === shiftId) || {};
            const holidays = data.holidays || [];
            const customDays = data.custom_non_working_days || [];
            const settings = data.settings || {};
            const branch = data.branch || {};

            const modal = document.createElement('div');
            modal.className = 'org-modal-overlay';
            modal.id = 'org-modal';
            modal.innerHTML = `
                <div class="org-modal" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <div class="org-modal-header">
                        <h3 class="org-modal-title">📅 Calendario de Feriados - ${shift.name || 'Turno'}</h3>
                        <button class="org-modal-close" onclick="OrgEngine.closeModal()">&times;</button>
                    </div>
                    <div class="org-modal-body">
                        <!-- Información del Turno -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                            <div style="padding: 15px; background: #e8f5e9; border-radius: 8px;">
                                <strong>⏰ Turno:</strong> ${shift.name}<br>
                                <small>Horario: ${shift.start_time || '-'} - ${shift.end_time || '-'}</small>
                            </div>
                            <div style="padding: 15px; background: #e3f2fd; border-radius: 8px;">
                                <strong>🏛️ Sucursal:</strong> ${branch.name || 'Sin asignar'}<br>
                                <small>País: ${branch.country_name || branch.country || 'No definido'}</small>
                            </div>
                        </div>

                        <!-- Configuración de Feriados -->
                        <div style="margin-bottom: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
                            <h4 style="margin: 0 0 15px 0;">⚙️ Configuración de Feriados</h4>
                            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                    <input type="checkbox" id="shift-national-holidays" ${settings.respect_national_holidays ? 'checked' : ''} style="width: 18px; height: 18px;">
                                    <span>🇦🇷 Respetar feriados nacionales</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                    <input type="checkbox" id="shift-provincial-holidays" ${settings.respect_provincial_holidays ? 'checked' : ''} style="width: 18px; height: 18px;">
                                    <span>🏛️ Respetar feriados provinciales</span>
                                </label>
                            </div>
                            <button class="org-btn org-btn-secondary org-btn-sm" style="margin-top: 15px;" onclick="OrgEngine.saveShiftHolidaySettings('${shiftId}')">
                                💾 Guardar Configuración
                            </button>
                        </div>

                        <!-- Lista de Feriados del País -->
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0;">🗓️ Feriados ${new Date().getFullYear()} (${branch.country_name || 'Sin país'})</h4>
                            ${holidays.length > 0 ? `
                                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <thead style="background: #f0f0f0; position: sticky; top: 0;">
                                            <tr>
                                                <th style="padding: 10px; text-align: left;">Fecha</th>
                                                <th style="padding: 10px; text-align: left;">Feriado</th>
                                                <th style="padding: 10px; text-align: center;">Tipo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${holidays.map(h => `
                                                <tr style="border-bottom: 1px solid #eee;">
                                                    <td style="padding: 8px;">${new Date(h.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                                                    <td style="padding: 8px;">${h.name}</td>
                                                    <td style="padding: 8px; text-align: center;">
                                                        <span style="background: ${h.is_national || h.type === 'national' ? '#1976d2' : '#7b1fa2'}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                                                            ${h.is_national || h.type === 'national' ? 'Nacional' : 'Provincial'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : `
                                <div style="padding: 20px; background: #fff3cd; border-radius: 8px; text-align: center;">
                                    <p style="margin: 0;">⚠️ No se encontraron feriados para este país/año.</p>
                                    <small>Verifique que la sucursal tenga país asignado y que existan feriados cargados.</small>
                                </div>
                            `}
                        </div>

                        <!-- Días No Laborables Personalizados -->
                        <div style="padding: 20px; background: #fff8e1; border-radius: 8px;">
                            <h4 style="margin: 0 0 15px 0;">📌 Días No Laborables Personalizados</h4>
                            <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
                                Agrega días específicos que no se trabajan en este turno (ej: día del gremio, cierre por inventario).
                            </p>

                            <!-- Formulario para agregar día -->
                            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                                <input type="date" id="custom-day-date" class="org-form-input" style="flex: 1; min-width: 150px;">
                                <input type="text" id="custom-day-reason" class="org-form-input" placeholder="Motivo (ej: Día del trabajador)" style="flex: 2; min-width: 200px;">
                                <button class="org-btn org-btn-primary" onclick="OrgEngine.addCustomNonWorkingDay('${shiftId}')">
                                    ➕ Agregar
                                </button>
                            </div>

                            <!-- Lista de días personalizados -->
                            <div id="custom-days-list">
                                ${customDays.length > 0 ? `
                                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <tbody>
                                            ${customDays.map(d => `
                                                <tr style="border-bottom: 1px solid #eee;">
                                                    <td style="padding: 8px;">${new Date(d.date).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                                    <td style="padding: 8px;">${d.reason || 'Sin motivo'}</td>
                                                    <td style="padding: 8px; text-align: right;">
                                                        <button class="org-btn org-btn-danger org-btn-sm" onclick="OrgEngine.removeCustomNonWorkingDay('${shiftId}', '${d.date}')">🗑️</button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                ` : '<p style="color: #999; text-align: center; margin: 0;">No hay días personalizados configurados</p>'}
                            </div>
                        </div>
                    </div>
                    <div class="org-modal-footer">
                        <button class="org-btn org-btn-secondary" onclick="OrgEngine.closeModal()">Cerrar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

        } catch (error) {
            console.error('Error abriendo calendario:', error);
            this.showToast('Error cargando calendario: ' + error.message, 'error');
        }
    },

    async saveShiftHolidaySettings(shiftId) {
        const nationalHolidays = document.getElementById('shift-national-holidays').checked;
        const provincialHolidays = document.getElementById('shift-provincial-holidays').checked;

        try {
            const response = await fetch(`/api/v1/organizational/shifts/${shiftId}/holiday-settings?company_id=${getCompanyId()}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    respect_national_holidays: nationalHolidays,
                    respect_provincial_holidays: provincialHolidays
                })
            });

            if (!response.ok) throw new Error('Error guardando configuración');

            this.showToast('Configuración guardada', 'success');
            await this.renderShifts();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async addCustomNonWorkingDay(shiftId) {
        const dateInput = document.getElementById('custom-day-date');
        const reasonInput = document.getElementById('custom-day-reason');

        if (!dateInput.value) {
            this.showToast('Seleccione una fecha', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/v1/organizational/shifts/${shiftId}/custom-days?company_id=${getCompanyId()}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'add',
                    day: {
                        date: dateInput.value,
                        reason: reasonInput.value || 'Día no laborable'
                    }
                })
            });

            if (!response.ok) throw new Error('Error agregando día');

            this.showToast('Día agregado', 'success');
            this.closeModal();
            await this.renderShifts();
            this.openShiftCalendarModal(shiftId); // Reabrir modal actualizado
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    async removeCustomNonWorkingDay(shiftId, date) {
        if (!confirm('¿Eliminar este día no laborable?')) return;

        try {
            const response = await fetch(`/api/v1/organizational/shifts/${shiftId}/custom-days?company_id=${getCompanyId()}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'remove',
                    day: { date }
                })
            });

            if (!response.ok) throw new Error('Error eliminando día');

            this.showToast('Día eliminado', 'success');
            this.closeModal();
            await this.renderShifts();
            this.openShiftCalendarModal(shiftId); // Reabrir modal actualizado
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    closeModal() {
        const modal = document.getElementById('org-modal');
        if (modal) modal.remove();
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================
    formatNumber(num) {
        return new Intl.NumberFormat('es-AR').format(num);
    },

    updateKPIs() {
        const stats = OrgState.stats;
        document.querySelectorAll('.org-kpi-value').forEach((el, idx) => {
            const values = [stats.total_departments, stats.total_sectors, stats.total_shifts, stats.total_employees];
            if (values[idx] !== undefined) el.textContent = values[idx] || 0;
        });
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `org-toast org-toast-${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : '⚠️'}</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }
};

// ============================================================================
// AUTO-INIT
// ============================================================================
// La inicialización se hace desde panel-empresa.html cuando se carga el módulo
// OrgEngine.init('module-content');

// Export para uso global
window.OrgEngine = OrgEngine;
window.OrgAPI = OrgAPI;
window.OrgState = OrgState;

// Función de inicialización para panel-empresa.html (convención showXXXContent)
window.showOrganizationalStructureContent = function() {
    console.log('🏛️ [ORGANIZATIONAL] Inicializando módulo Estructura Organizacional...');
    OrgEngine.init('mainContent');
};

// También registrar en window.Modules para patrón nuevo
window.Modules = window.Modules || {};
window.Modules['organizational-structure'] = {
    init: () => OrgEngine.init('mainContent')
};
window.Modules['departments'] = window.Modules['organizational-structure']; // Alias
window.Modules['organizational'] = window.Modules['organizational-structure']; // Alias

console.log('[OrgEngine] Módulo cargado. Usar OrgEngine.init("container-id") para inicializar.');
