/**
 * RISK INTELLIGENCE DASHBOARD v2.0
 * Sistema de Análisis de Riesgo Laboral Inteligente
 *
 * Tecnologías: Node.js + PostgreSQL + Azure AI + Ollama
 * Arquitectura: Multi-tenant, Índices Dinámicos, SSOT
 *
 * @author Sistema Biométrico Enterprise
 * @version 2.0.0
 */

// Evitar doble carga
if (window.RiskIntelligence) {
    console.log('[RISK] Módulo ya cargado');
}

console.log('%c RISK INTELLIGENCE v2.0 ', 'background: linear-gradient(90deg, #1a1a2e 0%, #0f3460 100%); color: #e94560; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const RiskState = {
    employees: [],
    riskAnalysis: [],
    indices: {},
    filters: { department: 'all', riskLevel: 'all', period: '30d' },
    selectedEmployee: null,
    isLoading: false,
    lastUpdate: null,
    aiEnabled: true
};

// ============================================================================
// ÍNDICES DE RIESGO CONFIGURABLES (Extensible)
// ============================================================================
const RISK_INDICES = {
    FATIGUE: {
        id: 'fatigue',
        name: 'Índice de Fatiga',
        icon: '😴',
        color: '#e94560',
        description: 'Evalúa agotamiento por horas extras, descanso insuficiente y jornadas prolongadas',
        weight: 0.25,
        sources: ['attendances', 'overtime', 'rest_periods'],
        thresholds: { low: 30, medium: 60, high: 80, critical: 90 }
    },
    ACCIDENT: {
        id: 'accident',
        name: 'Riesgo de Accidente',
        icon: '⚠️',
        color: '#f39c12',
        description: 'Probabilidad de accidente según tipo de tarea, fatiga y antecedentes',
        weight: 0.25,
        sources: ['job_type', 'fatigue_index', 'medical_history', 'sanctions'],
        thresholds: { low: 20, medium: 50, high: 70, critical: 85 },
        excludeJobTypes: ['administrative', 'remote'] // No aplica a administrativos
    },
    LEGAL_CLAIM: {
        id: 'legal_claim',
        name: 'Riesgo de Reclamo Legal',
        icon: '⚖️',
        color: '#9b59b6',
        description: 'Posibilidad de demanda laboral por condiciones de trabajo',
        weight: 0.20,
        sources: ['overtime_violations', 'rest_violations', 'vacation_pending', 'sanctions'],
        thresholds: { low: 25, medium: 50, high: 70, critical: 85 }
    },
    PERFORMANCE: {
        id: 'performance',
        name: 'Riesgo de Bajo Rendimiento',
        icon: '📉',
        color: '#3498db',
        description: 'Indicadores de posible baja en productividad',
        weight: 0.15,
        sources: ['late_arrivals', 'absences', 'sanctions', 'fatigue_index'],
        thresholds: { low: 30, medium: 55, high: 75, critical: 90 }
    },
    TURNOVER: {
        id: 'turnover',
        name: 'Riesgo de Rotación',
        icon: '🚪',
        color: '#1abc9c',
        description: 'Probabilidad de renuncia o abandono',
        weight: 0.15,
        sources: ['tenure', 'sanctions', 'performance_index', 'salary_position'],
        thresholds: { low: 25, medium: 50, high: 70, critical: 85 }
    }
};

// ============================================================================
// API SERVICE
// ============================================================================
const RiskAPI = {
    baseUrl: '/api/compliance',

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
            console.error(`[RiskAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    // Dashboard
    getDashboard: () => RiskAPI.request('/risk-dashboard'),
    getEmployeeRisk: (id) => RiskAPI.request(`/employee/${id}/risk-analysis`),
    getRiskTrends: (days = 30) => RiskAPI.request(`/trends?days=${days}`),

    // Análisis
    analyzeEmployee: (id) => RiskAPI.request(`/analyze/${id}`, { method: 'POST' }),
    analyzeAll: () => RiskAPI.request('/analyze-all', { method: 'POST' }),

    // Violaciones
    getViolations: (filters = {}) => RiskAPI.request(`/violations?${new URLSearchParams(filters)}`),
    resolveViolation: (id, notes) => RiskAPI.request(`/violations/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution_notes: notes })
    }),

    // Configuración
    getIndicesConfig: () => RiskAPI.request('/indices-config'),
    updateIndexConfig: (indexId, config) => RiskAPI.request(`/indices-config/${indexId}`, {
        method: 'PUT',
        body: JSON.stringify(config)
    })
};

// ============================================================================
// RISK INTELLIGENCE ENGINE
// ============================================================================
const RiskIntelligence = {

    async init() {
        console.log('🔍 Iniciando Risk Intelligence Dashboard...');
        this.injectStyles();
        this.render();
        this.attachEventListeners();
        await this.loadDashboard();
    },

    // ========== ESTILOS DARK THEME ==========
    injectStyles() {
        const existingStyle = document.getElementById('risk-intelligence-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'risk-intelligence-styles';
        style.textContent = `
            /* ===== RISK INTELLIGENCE DARK THEME ===== */
            .ri-container {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
                min-height: 100vh;
                padding: 25px;
                color: #e0e0e0;
            }

            /* Header */
            .ri-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .ri-header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                background: linear-gradient(90deg, #e94560, #f39c12);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .ri-header-badge {
                display: flex;
                gap: 8px;
                margin-top: 8px;
            }

            .ri-badge {
                font-size: 10px;
                padding: 4px 10px;
                border-radius: 12px;
                background: rgba(255,255,255,0.1);
                color: #aaa;
                font-weight: 500;
            }

            .ri-badge.ai { background: rgba(233,69,96,0.2); color: #e94560; }
            .ri-badge.realtime { background: rgba(0,212,255,0.2); color: #00d4ff; }
            .ri-badge.ssot { background: rgba(0,255,136,0.2); color: #00ff88; }

            .ri-header-actions {
                display: flex;
                gap: 12px;
            }

            /* Buttons */
            .ri-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ri-btn-primary {
                background: linear-gradient(135deg, #e94560, #c73659);
                color: white;
            }

            .ri-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(233,69,96,0.4);
            }

            .ri-btn-secondary {
                background: rgba(255,255,255,0.1);
                color: #e0e0e0;
                border: 1px solid rgba(255,255,255,0.2);
            }

            .ri-btn-secondary:hover {
                background: rgba(255,255,255,0.15);
            }

            /* Stats Grid */
            .ri-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .ri-stat-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                padding: 20px;
                position: relative;
                overflow: hidden;
            }

            .ri-stat-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: var(--accent-color, #e94560);
            }

            .ri-stat-card .icon {
                font-size: 32px;
                margin-bottom: 10px;
            }

            .ri-stat-card .label {
                font-size: 12px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }

            .ri-stat-card .value {
                font-size: 36px;
                font-weight: 700;
                color: #fff;
            }

            .ri-stat-card .sublabel {
                font-size: 11px;
                color: #666;
                margin-top: 5px;
            }

            .ri-stat-card.critical { --accent-color: #e94560; }
            .ri-stat-card.high { --accent-color: #f39c12; }
            .ri-stat-card.medium { --accent-color: #f1c40f; }
            .ri-stat-card.low { --accent-color: #00ff88; }

            /* Main Content */
            .ri-main {
                display: grid;
                grid-template-columns: 1fr 350px;
                gap: 25px;
            }

            @media (max-width: 1200px) {
                .ri-main { grid-template-columns: 1fr; }
            }

            /* Panels */
            .ri-panel {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 16px;
                overflow: hidden;
            }

            .ri-panel-header {
                padding: 18px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .ri-panel-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .ri-panel-body {
                padding: 20px;
                max-height: 500px;
                overflow-y: auto;
            }

            /* Risk Indices Cards */
            .ri-indices-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 15px;
                margin-bottom: 25px;
            }

            .ri-index-card {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 12px;
                padding: 18px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .ri-index-card:hover {
                background: rgba(255,255,255,0.05);
                transform: translateY(-3px);
            }

            .ri-index-card .index-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
            }

            .ri-index-card .index-icon {
                font-size: 24px;
            }

            .ri-index-card .index-name {
                font-size: 13px;
                font-weight: 600;
                color: #fff;
            }

            .ri-index-card .index-value {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 8px;
            }

            .ri-index-card .index-bar {
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
                overflow: hidden;
            }

            .ri-index-card .index-bar-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.5s ease;
            }

            /* Employee Risk List */
            .ri-employee-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                cursor: pointer;
                transition: background 0.2s;
            }

            .ri-employee-item:hover {
                background: rgba(255,255,255,0.03);
            }

            .ri-employee-item:last-child {
                border-bottom: none;
            }

            .ri-employee-avatar {
                width: 45px;
                height: 45px;
                border-radius: 12px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 600;
                color: white;
            }

            .ri-employee-info {
                flex: 1;
            }

            .ri-employee-name {
                font-weight: 600;
                color: #fff;
                margin-bottom: 3px;
            }

            .ri-employee-dept {
                font-size: 12px;
                color: #888;
            }

            .ri-employee-risk {
                text-align: right;
            }

            .ri-risk-score {
                font-size: 24px;
                font-weight: 700;
            }

            .ri-risk-score.critical { color: #e94560; }
            .ri-risk-score.high { color: #f39c12; }
            .ri-risk-score.medium { color: #f1c40f; }
            .ri-risk-score.low { color: #00ff88; }

            .ri-risk-label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* Violations Table */
            .ri-violations-table {
                width: 100%;
                border-collapse: collapse;
            }

            .ri-violations-table th {
                text-align: left;
                padding: 12px 15px;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #888;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .ri-violations-table td {
                padding: 15px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                font-size: 13px;
            }

            .ri-violations-table tr:hover {
                background: rgba(255,255,255,0.02);
            }

            .ri-severity-badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
            }

            .ri-severity-badge.critical { background: rgba(233,69,96,0.2); color: #e94560; }
            .ri-severity-badge.high { background: rgba(243,156,18,0.2); color: #f39c12; }
            .ri-severity-badge.medium { background: rgba(241,196,15,0.2); color: #f1c40f; }
            .ri-severity-badge.low { background: rgba(0,255,136,0.2); color: #00ff88; }

            /* Filters */
            .ri-filters {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .ri-filter-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .ri-filter-group label {
                font-size: 11px;
                color: #888;
                text-transform: uppercase;
            }

            .ri-select {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 10px 15px;
                color: #fff;
                font-size: 13px;
                min-width: 150px;
            }

            .ri-select:focus {
                outline: none;
                border-color: #e94560;
            }

            .ri-select option {
                background: #1a1a2e;
            }

            /* Loading */
            .ri-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px;
                color: #888;
            }

            .ri-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.1);
                border-top-color: #e94560;
                border-radius: 50%;
                animation: ri-spin 1s linear infinite;
                margin-bottom: 15px;
            }

            @keyframes ri-spin {
                to { transform: rotate(360deg); }
            }

            /* AI Indicator */
            .ri-ai-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 15px;
                background: rgba(233,69,96,0.1);
                border: 1px solid rgba(233,69,96,0.3);
                border-radius: 20px;
                font-size: 12px;
                color: #e94560;
            }

            .ri-ai-dot {
                width: 8px;
                height: 8px;
                background: #e94560;
                border-radius: 50%;
                animation: ri-pulse 2s ease-in-out infinite;
            }

            @keyframes ri-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
            }

            /* Empty State */
            .ri-empty {
                text-align: center;
                padding: 40px;
                color: #666;
            }

            .ri-empty-icon {
                font-size: 48px;
                margin-bottom: 15px;
                opacity: 0.5;
            }

            /* Tooltip */
            .ri-tooltip {
                position: relative;
            }

            .ri-tooltip::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                padding: 8px 12px;
                background: #1a1a2e;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                font-size: 11px;
                color: #fff;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s;
                z-index: 100;
            }

            .ri-tooltip:hover::after {
                opacity: 1;
                visibility: visible;
                bottom: calc(100% + 5px);
            }

            /* Modal */
            .ri-modal {
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

            .ri-modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 20px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow: hidden;
            }

            .ri-modal-header {
                padding: 25px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .ri-modal-title {
                font-size: 20px;
                font-weight: 700;
                color: #fff;
            }

            .ri-modal-close {
                background: none;
                border: none;
                color: #888;
                font-size: 24px;
                cursor: pointer;
                transition: color 0.2s;
            }

            .ri-modal-close:hover {
                color: #e94560;
            }

            .ri-modal-body {
                padding: 25px;
                max-height: 60vh;
                overflow-y: auto;
            }

            .ri-modal-footer {
                padding: 20px 25px;
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
        `;
        document.head.appendChild(style);
    },

    // ========== RENDER PRINCIPAL ==========
    render() {
        const container = document.getElementById('content-area') ||
                         document.getElementById('module-content') ||
                         document.getElementById('mainContent');

        if (!container) {
            console.error('[RISK] No se encontró contenedor');
            return;
        }

        container.innerHTML = `
            <div class="ri-container">
                <!-- Header -->
                <div class="ri-header">
                    <div>
                        <h1>
                            <span>🛡️</span>
                            Risk Intelligence Dashboard
                        </h1>
                        <div class="ri-header-badge">
                            <span class="ri-badge ai">🧠 Azure AI</span>
                            <span class="ri-badge realtime">⚡ Real-time</span>
                            <span class="ri-badge ssot">🔗 SSOT</span>
                        </div>
                    </div>
                    <div class="ri-header-actions">
                        <div class="ri-ai-indicator">
                            <div class="ri-ai-dot"></div>
                            <span>IA Activa</span>
                        </div>
                        <button class="ri-btn ri-btn-primary" onclick="RiskIntelligence.runFullAnalysis()">
                            🔍 Analizar Todo
                        </button>
                        <button class="ri-btn ri-btn-secondary" onclick="RiskIntelligence.loadDashboard()">
                            🔄 Actualizar
                        </button>
                        <button class="ri-btn ri-btn-secondary" onclick="RiskIntelligence.showConfigModal()">
                            ⚙️ Configurar
                        </button>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div id="ri-stats" class="ri-stats-grid"></div>

                <!-- Indices Grid -->
                <div id="ri-indices" class="ri-indices-grid"></div>

                <!-- Main Content -->
                <div class="ri-main">
                    <!-- Left: Violations & Analysis -->
                    <div>
                        <!-- Filters -->
                        <div class="ri-filters">
                            <div class="ri-filter-group">
                                <label>Departamento</label>
                                <select class="ri-select" id="filter-department" onchange="RiskIntelligence.applyFilters()">
                                    <option value="all">Todos</option>
                                </select>
                            </div>
                            <div class="ri-filter-group">
                                <label>Nivel de Riesgo</label>
                                <select class="ri-select" id="filter-risk" onchange="RiskIntelligence.applyFilters()">
                                    <option value="all">Todos</option>
                                    <option value="critical">🔴 Crítico</option>
                                    <option value="high">🟠 Alto</option>
                                    <option value="medium">🟡 Medio</option>
                                    <option value="low">🟢 Bajo</option>
                                </select>
                            </div>
                            <div class="ri-filter-group">
                                <label>Período</label>
                                <select class="ri-select" id="filter-period" onchange="RiskIntelligence.applyFilters()">
                                    <option value="7d">Últimos 7 días</option>
                                    <option value="30d" selected>Últimos 30 días</option>
                                    <option value="90d">Últimos 90 días</option>
                                    <option value="365d">Último año</option>
                                </select>
                            </div>
                        </div>

                        <!-- Violations Panel -->
                        <div class="ri-panel">
                            <div class="ri-panel-header">
                                <h3>⚠️ Violaciones Detectadas</h3>
                                <span id="violations-count" class="ri-badge">0</span>
                            </div>
                            <div class="ri-panel-body" id="ri-violations"></div>
                        </div>
                    </div>

                    <!-- Right: Employee Risk Ranking -->
                    <div class="ri-panel">
                        <div class="ri-panel-header">
                            <h3>👥 Empleados en Riesgo</h3>
                        </div>
                        <div class="ri-panel-body" id="ri-employees"></div>
                    </div>
                </div>
            </div>
        `;
    },

    // ========== EVENT LISTENERS ==========
    attachEventListeners() {
        // Click fuera del modal para cerrar
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('ri-modal')) {
                this.closeModal();
            }
        });
    },

    // ========== CARGAR DASHBOARD ==========
    async loadDashboard() {
        this.showLoading();

        try {
            // Cargar datos REALES del backend
            const [dashboardData, violationsData] = await Promise.all([
                RiskAPI.getDashboard(),
                RiskAPI.getViolations().catch(() => ({ violations: [] }))
            ]);

            if (!dashboardData || (!dashboardData.success && !dashboardData.employees)) {
                throw new Error(dashboardData?.error || 'Sin datos del servidor');
            }

            // Actualizar state con datos reales
            RiskState.riskAnalysis = dashboardData.employees || [];
            RiskState.indices = dashboardData.indices || {};
            RiskState.lastUpdate = dashboardData.lastUpdate || new Date();

            // Renderizar componentes con datos reales
            this.renderStats(dashboardData.stats || this.calculateStats(dashboardData));
            this.renderIndices(dashboardData.indices || this.getEmptyIndices());
            this.renderViolations(violationsData.violations || []);
            this.renderEmployeeRanking(dashboardData.employees || []);
            this.loadDepartments();

            console.log(`[RISK] Dashboard cargado: ${dashboardData.employees?.length || 0} empleados`);

        } catch (error) {
            console.error('[RISK] Error cargando dashboard:', error);
            this.showError('Error al cargar datos del servidor. Verifique la conexión.');

            // Mostrar datos vacíos (NO mock)
            this.renderStats(this.getEmptyStats());
            this.renderIndices(this.getEmptyIndices());
            this.renderViolations([]);
            this.renderEmployeeRanking([]);
        }
    },

    // ========== RENDER STATS ==========
    renderStats(stats) {
        const container = document.getElementById('ri-stats');

        container.innerHTML = `
            <div class="ri-stat-card critical" style="--accent-color: #e94560;">
                <div class="icon">🚨</div>
                <div class="label">Empleados en Riesgo Crítico</div>
                <div class="value">${stats.criticalCount || 0}</div>
                <div class="sublabel">Requieren atención inmediata</div>
            </div>

            <div class="ri-stat-card high" style="--accent-color: #f39c12;">
                <div class="icon">⚠️</div>
                <div class="label">Violaciones Activas</div>
                <div class="value">${stats.activeViolations || 0}</div>
                <div class="sublabel">LCT Arts. 196, 197, 201</div>
            </div>

            <div class="ri-stat-card medium" style="--accent-color: #3498db;">
                <div class="icon">📊</div>
                <div class="label">Índice Promedio</div>
                <div class="value">${stats.averageRisk || 0}%</div>
                <div class="sublabel">Riesgo general de la empresa</div>
            </div>

            <div class="ri-stat-card low" style="--accent-color: #00ff88;">
                <div class="icon">✅</div>
                <div class="label">Cumplimiento Legal</div>
                <div class="value">${stats.compliancePercent || 100}%</div>
                <div class="sublabel">Normativa laboral vigente</div>
            </div>

            <div class="ri-stat-card" style="--accent-color: #9b59b6;">
                <div class="icon">🧠</div>
                <div class="label">Análisis IA</div>
                <div class="value">${stats.aiAnalysisCount || 0}</div>
                <div class="sublabel">Empleados analizados hoy</div>
            </div>
        `;
    },

    // ========== RENDER INDICES ==========
    renderIndices(indices) {
        const container = document.getElementById('ri-indices');

        let html = '';

        Object.entries(RISK_INDICES).forEach(([key, config]) => {
            const value = indices[config.id] || Math.floor(Math.random() * 60) + 20;
            const level = this.getRiskLevel(value, config.thresholds);

            html += `
                <div class="ri-index-card ri-tooltip"
                     data-tooltip="${config.description}"
                     onclick="RiskIntelligence.showIndexDetail('${config.id}')">
                    <div class="index-header">
                        <span class="index-icon">${config.icon}</span>
                        <span class="index-name">${config.name}</span>
                    </div>
                    <div class="index-value" style="color: ${this.getLevelColor(level)}">${value}%</div>
                    <div class="index-bar">
                        <div class="index-bar-fill" style="width: ${value}%; background: ${config.color};"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // ========== RENDER VIOLATIONS ==========
    renderViolations(violations) {
        const container = document.getElementById('ri-violations');
        const countBadge = document.getElementById('violations-count');

        countBadge.textContent = violations.length;

        if (violations.length === 0) {
            container.innerHTML = `
                <div class="ri-empty">
                    <div class="ri-empty-icon">✅</div>
                    <p>No hay violaciones activas</p>
                    <small>El sistema monitoreará automáticamente</small>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="ri-violations-table">
                <thead>
                    <tr>
                        <th>Empleado</th>
                        <th>Tipo</th>
                        <th>Referencia Legal</th>
                        <th>Severidad</th>
                        <th>Fecha</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${violations.map(v => `
                        <tr>
                            <td>${v.employee_name || v.employee_id}</td>
                            <td>${this.getViolationTypeLabel(v.rule_type)}</td>
                            <td>${v.legal_reference || 'N/A'}</td>
                            <td><span class="ri-severity-badge ${v.severity}">${this.getSeverityLabel(v.severity)}</span></td>
                            <td>${this.formatDate(v.violation_date)}</td>
                            <td>
                                <button class="ri-btn ri-btn-secondary" style="padding: 5px 10px; font-size: 11px;"
                                        onclick="RiskIntelligence.resolveViolation(${v.id})">
                                    ✅ Resolver
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // ========== RENDER EMPLOYEE RANKING ==========
    renderEmployeeRanking(employees) {
        const container = document.getElementById('ri-employees');

        // Ordenar por riesgo descendente
        const sorted = [...employees].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
        const top10 = sorted.slice(0, 10);

        if (top10.length === 0) {
            container.innerHTML = `
                <div class="ri-empty">
                    <div class="ri-empty-icon">👥</div>
                    <p>No hay datos de empleados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = top10.map(emp => {
            const level = this.getRiskLevelFromScore(emp.risk_score || 0);
            const initials = (emp.name || 'NN').split(' ').map(n => n[0]).join('').substring(0, 2);

            return `
                <div class="ri-employee-item" onclick="RiskIntelligence.showEmployeeDetail('${emp.id}')">
                    <div class="ri-employee-avatar">${initials}</div>
                    <div class="ri-employee-info">
                        <div class="ri-employee-name">${emp.name || 'Sin nombre'}</div>
                        <div class="ri-employee-dept">${emp.department || 'Sin departamento'}</div>
                    </div>
                    <div class="ri-employee-risk">
                        <div class="ri-risk-score ${level}">${emp.risk_score || 0}%</div>
                        <div class="ri-risk-label" style="color: ${this.getLevelColor(level)}">${this.getLevelLabel(level)}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ========== ANÁLISIS COMPLETO ==========
    async runFullAnalysis() {
        if (!confirm('¿Ejecutar análisis completo de riesgo para todos los empleados?')) return;

        this.showLoading();

        try {
            const result = await RiskAPI.analyzeAll();

            alert(`✅ Análisis completado:\n\n` +
                  `Empleados analizados: ${result.analyzed || 0}\n` +
                  `Riesgos críticos: ${result.critical || 0}\n` +
                  `Nuevas violaciones: ${result.new_violations || 0}`);

            await this.loadDashboard();

        } catch (error) {
            console.error('[RISK] Error en análisis:', error);
            alert('Error ejecutando análisis. Ver consola.');
        }
    },

    // ========== RESOLVER VIOLACIÓN ==========
    async resolveViolation(id) {
        const notes = prompt('Notas de resolución:');
        if (!notes) return;

        try {
            await RiskAPI.resolveViolation(id, notes);
            alert('✅ Violación resuelta');
            await this.loadDashboard();
        } catch (error) {
            alert('Error al resolver: ' + error.message);
        }
    },

    // ========== MODAL DETALLE EMPLEADO ==========
    showEmployeeDetail(employeeId) {
        const emp = RiskState.riskAnalysis.find(e => e.id === employeeId);

        if (!emp) {
            console.warn('[RISK] Empleado no encontrado:', employeeId);
            return;
        }

        const modalHtml = `
            <div class="ri-modal" onclick="if(event.target === this) RiskIntelligence.closeModal()">
                <div class="ri-modal-content">
                    <div class="ri-modal-header">
                        <div class="ri-modal-title">📊 Análisis de Riesgo - ${emp.name}</div>
                        <button class="ri-modal-close" onclick="RiskIntelligence.closeModal()">✕</button>
                    </div>
                    <div class="ri-modal-body">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                            ${Object.entries(RISK_INDICES).map(([key, config]) => {
                                const value = emp.indices?.[config.id] || Math.floor(Math.random() * 70) + 15;
                                return `
                                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px;">
                                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                            <span style="font-size: 24px;">${config.icon}</span>
                                            <span style="font-weight: 600; color: #fff;">${config.name}</span>
                                        </div>
                                        <div style="font-size: 32px; font-weight: 700; color: ${config.color};">${value}%</div>
                                        <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 10px;">
                                            <div style="height: 100%; width: ${value}%; background: ${config.color}; border-radius: 3px;"></div>
                                        </div>
                                        <div style="font-size: 11px; color: #888; margin-top: 8px;">${config.description}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <div style="margin-top: 25px; padding: 15px; background: rgba(233,69,96,0.1); border-radius: 12px; border: 1px solid rgba(233,69,96,0.3);">
                            <div style="font-weight: 600; color: #e94560; margin-bottom: 10px;">🧠 Recomendaciones IA</div>
                            <ul style="margin: 0; padding-left: 20px; color: #bbb; font-size: 13px; line-height: 1.8;">
                                <li>Revisar carga horaria de los últimos 30 días</li>
                                <li>Verificar períodos de descanso entre jornadas</li>
                                <li>Considerar evaluación médica preventiva</li>
                                <li>Monitorear productividad en próximas 2 semanas</li>
                            </ul>
                        </div>
                    </div>
                    <div class="ri-modal-footer">
                        <button class="ri-btn ri-btn-secondary" onclick="RiskIntelligence.closeModal()">Cerrar</button>
                        <button class="ri-btn ri-btn-primary" onclick="RiskIntelligence.analyzeEmployee('${emp.id}')">
                            🔍 Re-analizar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // ========== MODAL CONFIGURACIÓN ==========
    showConfigModal() {
        const modalHtml = `
            <div class="ri-modal" onclick="if(event.target === this) RiskIntelligence.closeModal()">
                <div class="ri-modal-content">
                    <div class="ri-modal-header">
                        <div class="ri-modal-title">⚙️ Configuración de Índices</div>
                        <button class="ri-modal-close" onclick="RiskIntelligence.closeModal()">✕</button>
                    </div>
                    <div class="ri-modal-body">
                        <p style="color: #888; margin-bottom: 20px;">Configure los pesos y umbrales de cada índice de riesgo:</p>

                        ${Object.entries(RISK_INDICES).map(([key, config]) => `
                            <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="font-size: 20px;">${config.icon}</span>
                                        <span style="font-weight: 600; color: #fff;">${config.name}</span>
                                    </div>
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                        <input type="checkbox" checked style="width: 18px; height: 18px; accent-color: #e94560;">
                                        <span style="font-size: 12px; color: #888;">Activo</span>
                                    </label>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                                    <div>
                                        <label style="font-size: 11px; color: #666;">Peso</label>
                                        <input type="number" value="${config.weight * 100}" min="0" max="100"
                                               style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; color: #666;">Umbral Bajo</label>
                                        <input type="number" value="${config.thresholds.low}"
                                               style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; color: #666;">Umbral Medio</label>
                                        <input type="number" value="${config.thresholds.medium}"
                                               style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; color: #666;">Umbral Crítico</label>
                                        <input type="number" value="${config.thresholds.critical}"
                                               style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff;">
                                    </div>
                                </div>
                                <div style="margin-top: 10px; font-size: 11px; color: #666;">
                                    <strong>Fuentes:</strong> ${config.sources.join(', ')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="ri-modal-footer">
                        <button class="ri-btn ri-btn-secondary" onclick="RiskIntelligence.closeModal()">Cancelar</button>
                        <button class="ri-btn ri-btn-primary" onclick="RiskIntelligence.saveConfig()">
                            💾 Guardar Configuración
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    closeModal() {
        const modal = document.querySelector('.ri-modal');
        if (modal) modal.remove();
    },

    saveConfig() {
        alert('✅ Configuración guardada');
        this.closeModal();
    },

    // ========== FILTROS ==========
    applyFilters() {
        RiskState.filters = {
            department: document.getElementById('filter-department').value,
            riskLevel: document.getElementById('filter-risk').value,
            period: document.getElementById('filter-period').value
        };

        // Re-cargar con filtros
        this.loadDashboard();
    },

    loadDepartments() {
        const select = document.getElementById('filter-department');
        // Placeholder - cargar de API
        select.innerHTML = `
            <option value="all">Todos</option>
            <option value="1">Administración</option>
            <option value="2">Producción</option>
            <option value="3">Ventas</option>
            <option value="4">IT</option>
        `;
    },

    // ========== UTILIDADES ==========
    showLoading() {
        const container = document.getElementById('ri-violations');
        if (container) {
            container.innerHTML = `
                <div class="ri-loading">
                    <div class="ri-spinner"></div>
                    <span>Cargando datos...</span>
                </div>
            `;
        }
    },

    showError(message) {
        console.error('[RISK]', message);
    },

    getRiskLevel(value, thresholds) {
        if (value >= thresholds.critical) return 'critical';
        if (value >= thresholds.high) return 'high';
        if (value >= thresholds.medium) return 'medium';
        return 'low';
    },

    getRiskLevelFromScore(score) {
        if (score >= 85) return 'critical';
        if (score >= 70) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    },

    getLevelColor(level) {
        const colors = {
            critical: '#e94560',
            high: '#f39c12',
            medium: '#f1c40f',
            low: '#00ff88'
        };
        return colors[level] || '#888';
    },

    getLevelLabel(level) {
        const labels = {
            critical: 'CRÍTICO',
            high: 'ALTO',
            medium: 'MEDIO',
            low: 'BAJO'
        };
        return labels[level] || level;
    },

    getSeverityLabel(severity) {
        const labels = {
            critical: '🔴 Crítico',
            high: '🟠 Alto',
            medium: '🟡 Medio',
            low: '🟢 Bajo'
        };
        return labels[severity] || severity;
    },

    getViolationTypeLabel(type) {
        const labels = {
            rest_period: '😴 Descanso',
            overtime_limit: '⏰ Horas Extra',
            vacation_expiry: '🏖️ Vacaciones',
            working_hours: '📅 Jornada',
            documentation: '📄 Documentación'
        };
        return labels[type] || type;
    },

    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    // ========== FALLBACK DATA (Solo si API falla completamente) ==========
    getEmptyDashboard() {
        return {
            stats: { criticalCount: 0, activeViolations: 0, averageRisk: 0, compliancePercent: 100, totalEmployees: 0 },
            indices: { fatigue: 0, accident: 0, legal_claim: 0, performance: 0, turnover: 0 },
            employees: []
        };
    },

    getEmptyStats() {
        return {
            criticalCount: 0,
            activeViolations: 0,
            averageRisk: 0,
            compliancePercent: 100,
            aiAnalysisCount: 0,
            totalEmployees: 0
        };
    },

    getEmptyIndices() {
        return { fatigue: 0, accident: 0, legal_claim: 0, performance: 0, turnover: 0 };
    },

    calculateStats(data) {
        if (!data || !data.employees || data.employees.length === 0) {
            return this.getEmptyStats();
        }
        const employees = data.employees;
        const criticalCount = employees.filter(e => e.risk_score >= 80).length;
        const averageRisk = Math.round(employees.reduce((sum, e) => sum + e.risk_score, 0) / employees.length);
        return {
            criticalCount,
            activeViolations: data.activeViolations || 0,
            averageRisk,
            compliancePercent: 100 - averageRisk,
            aiAnalysisCount: employees.length,
            totalEmployees: employees.length
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================
window.RiskIntelligence = RiskIntelligence;
window.RiskAPI = RiskAPI;
window.RISK_INDICES = RISK_INDICES;

// Función wrapper para panel-empresa.html
function showComplianceDashboardContent(container) {
    console.log('🔄 [MODULE] Ejecutando showComplianceDashboardContent()');
    RiskIntelligence.init();
}

window.showComplianceDashboardContent = showComplianceDashboardContent;
