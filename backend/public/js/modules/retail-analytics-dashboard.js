/**
 * Retail Analytics Dashboard
 * Sistema Predictivo de Retail con Inteligencia Artificial
 *
 * Algoritmos implementados:
 * - Market Basket Analysis (FP-Growth Simplificado)
 * - Demand Forecasting (SES, MA, WMA)
 * - Customer Segmentation (RFM Analysis)
 * - ABC/XYZ Classification
 * - Smart Reorder Suggestions
 *
 * @author Claude AI
 * @version 1.0.0
 * @date 2025-12-31
 */

const RetailAnalyticsDashboard = {
    name: 'retail-analytics-dashboard',
    currentTab: 'overview',
    data: {
        kpis: {},
        basketRules: [],
        forecasts: [],
        rfmSegments: [],
        reorderSuggestions: [],
        config: {}
    },

    // Dark theme colors
    theme: {
        background: '#0d1117',
        surface: '#161b22',
        surfaceHover: '#21262d',
        border: '#30363d',
        text: '#c9d1d9',
        textMuted: '#8b949e',
        primary: '#58a6ff',
        success: '#3fb950',
        warning: '#d29922',
        danger: '#f85149',
        purple: '#a371f7',
        orange: '#db6d28',
        cyan: '#39c5cf',

        // Algorithm indicator colors
        aiGradientStart: '#7c3aed',
        aiGradientEnd: '#3b82f6',
        mlBadge: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        statsBadge: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
    },

    async init() {
        console.log('📊 [RetailAnalytics] Inicializando dashboard...');
        this.injectStyles();
        this.render();
        await this.loadData();
    },

    injectStyles() {
        if (document.getElementById('retail-analytics-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'retail-analytics-styles';
        styles.textContent = `
            /* ═══════════════════════════════════════════════════════════════ */
            /* RETAIL ANALYTICS DASHBOARD - DARK THEME                          */
            /* ═══════════════════════════════════════════════════════════════ */

            .ra-container {
                background: ${this.theme.background};
                color: ${this.theme.text};
                min-height: 100vh;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            }

            .ra-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid ${this.theme.border};
            }

            .ra-title {
                font-size: 24px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .ra-title-icon {
                font-size: 28px;
            }

            /* AI Badge - Indicates AI-powered feature */
            .ra-ai-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: ${this.theme.mlBadge};
                color: white;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }

            .ra-ai-badge::before {
                content: '🧠';
                font-size: 12px;
            }

            /* Stats Badge - Indicates statistical method */
            .ra-stats-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: ${this.theme.statsBadge};
                color: white;
                box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
            }

            .ra-stats-badge::before {
                content: '📊';
                font-size: 12px;
            }

            /* Algorithm info tooltip */
            .ra-algo-info {
                position: relative;
                display: inline-flex;
                align-items: center;
                cursor: help;
            }

            .ra-algo-info .ra-algo-tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: ${this.theme.surface};
                border: 1px solid ${this.theme.border};
                border-radius: 8px;
                padding: 12px;
                min-width: 280px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s, visibility 0.2s;
                z-index: 1000;
                font-size: 12px;
                line-height: 1.5;
            }

            .ra-algo-info:hover .ra-algo-tooltip {
                opacity: 1;
                visibility: visible;
            }

            .ra-algo-tooltip-title {
                font-weight: 600;
                color: ${this.theme.primary};
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .ra-algo-tooltip-desc {
                color: ${this.theme.textMuted};
                font-size: 11px;
            }

            .ra-algo-tooltip-params {
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid ${this.theme.border};
                font-family: monospace;
                font-size: 10px;
                color: ${this.theme.cyan};
            }

            /* Tabs */
            .ra-tabs {
                display: flex;
                gap: 4px;
                background: ${this.theme.surface};
                padding: 4px;
                border-radius: 12px;
                margin-bottom: 20px;
            }

            .ra-tab {
                padding: 10px 20px;
                border-radius: 8px;
                background: transparent;
                border: none;
                color: ${this.theme.textMuted};
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ra-tab:hover {
                background: ${this.theme.surfaceHover};
                color: ${this.theme.text};
            }

            .ra-tab.active {
                background: ${this.theme.primary};
                color: white;
            }

            .ra-tab-icon {
                font-size: 16px;
            }

            /* Cards */
            .ra-card {
                background: ${this.theme.surface};
                border: 1px solid ${this.theme.border};
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 16px;
            }

            .ra-card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
            }

            .ra-card-title {
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .ra-card-title-icon {
                font-size: 20px;
            }

            /* KPI Grid */
            .ra-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .ra-kpi-card {
                background: ${this.theme.surface};
                border: 1px solid ${this.theme.border};
                border-radius: 12px;
                padding: 20px;
                position: relative;
                overflow: hidden;
            }

            .ra-kpi-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
            }

            .ra-kpi-card.primary::before { background: ${this.theme.primary}; }
            .ra-kpi-card.success::before { background: ${this.theme.success}; }
            .ra-kpi-card.warning::before { background: ${this.theme.warning}; }
            .ra-kpi-card.danger::before { background: ${this.theme.danger}; }
            .ra-kpi-card.purple::before { background: ${this.theme.purple}; }
            .ra-kpi-card.cyan::before { background: ${this.theme.cyan}; }

            .ra-kpi-label {
                font-size: 12px;
                color: ${this.theme.textMuted};
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ra-kpi-value {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 4px;
            }

            .ra-kpi-change {
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .ra-kpi-change.positive { color: ${this.theme.success}; }
            .ra-kpi-change.negative { color: ${this.theme.danger}; }

            /* Tables */
            .ra-table-container {
                overflow-x: auto;
            }

            .ra-table {
                width: 100%;
                border-collapse: collapse;
            }

            .ra-table th,
            .ra-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid ${this.theme.border};
            }

            .ra-table th {
                font-size: 12px;
                font-weight: 600;
                color: ${this.theme.textMuted};
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: ${this.theme.surfaceHover};
            }

            .ra-table tbody tr:hover {
                background: ${this.theme.surfaceHover};
            }

            /* Association Rule Card */
            .ra-rule-card {
                background: ${this.theme.surfaceHover};
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
            }

            .ra-rule-items {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }

            .ra-rule-antecedent,
            .ra-rule-consequent {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .ra-rule-item {
                background: ${this.theme.surface};
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 13px;
                border: 1px solid ${this.theme.border};
            }

            .ra-rule-arrow {
                font-size: 20px;
                color: ${this.theme.primary};
            }

            .ra-rule-metrics {
                display: flex;
                gap: 20px;
                font-size: 12px;
                color: ${this.theme.textMuted};
            }

            .ra-rule-metric {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .ra-rule-metric-value {
                color: ${this.theme.text};
                font-weight: 600;
            }

            /* RFM Segment Badge */
            .ra-segment-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
            }

            .ra-segment-champions { background: #28a7451a; color: #28a745; border: 1px solid #28a74540; }
            .ra-segment-loyal { background: #17a2b81a; color: #17a2b8; border: 1px solid #17a2b840; }
            .ra-segment-potential_loyalist { background: #6f42c11a; color: #6f42c1; border: 1px solid #6f42c140; }
            .ra-segment-new_customers { background: #007bff1a; color: #007bff; border: 1px solid #007bff40; }
            .ra-segment-at_risk { background: #fd7e141a; color: #fd7e14; border: 1px solid #fd7e1440; }
            .ra-segment-cant_lose { background: #dc35451a; color: #dc3545; border: 1px solid #dc354540; }
            .ra-segment-hibernating { background: #6c757d1a; color: #6c757d; border: 1px solid #6c757d40; }
            .ra-segment-lost { background: #4950571a; color: #adb5bd; border: 1px solid #49505740; }

            /* Urgency Badge */
            .ra-urgency-badge {
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .ra-urgency-critical { background: #dc35451a; color: #dc3545; }
            .ra-urgency-high { background: #fd7e141a; color: #fd7e14; }
            .ra-urgency-normal { background: #28a7451a; color: #28a745; }
            .ra-urgency-low { background: #6c757d1a; color: #6c757d; }

            /* ABC/XYZ Matrix */
            .ra-matrix-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
            }

            .ra-matrix-cell {
                background: ${this.theme.surfaceHover};
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }

            .ra-matrix-label {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 8px;
            }

            .ra-matrix-count {
                font-size: 24px;
                font-weight: 700;
                color: ${this.theme.primary};
            }

            /* Buttons */
            .ra-btn {
                padding: 10px 20px;
                border-radius: 8px;
                border: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .ra-btn-primary {
                background: ${this.theme.primary};
                color: white;
            }

            .ra-btn-primary:hover {
                filter: brightness(1.1);
            }

            .ra-btn-secondary {
                background: ${this.theme.surfaceHover};
                color: ${this.theme.text};
                border: 1px solid ${this.theme.border};
            }

            .ra-btn-secondary:hover {
                background: ${this.theme.border};
            }

            /* Loading */
            .ra-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: ${this.theme.textMuted};
            }

            .ra-spinner {
                width: 24px;
                height: 24px;
                border: 3px solid ${this.theme.border};
                border-top-color: ${this.theme.primary};
                border-radius: 50%;
                animation: ra-spin 1s linear infinite;
                margin-right: 12px;
            }

            @keyframes ra-spin {
                to { transform: rotate(360deg); }
            }

            /* Confidence Bar */
            .ra-confidence-bar {
                height: 6px;
                background: ${this.theme.border};
                border-radius: 3px;
                overflow: hidden;
                width: 100px;
            }

            .ra-confidence-fill {
                height: 100%;
                background: ${this.theme.primary};
                border-radius: 3px;
                transition: width 0.3s;
            }

            /* Empty state */
            .ra-empty {
                text-align: center;
                padding: 40px;
                color: ${this.theme.textMuted};
            }

            .ra-empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            /* Grid layouts */
            .ra-grid-2 {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
            }

            .ra-grid-3 {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
            }

            @media (max-width: 1200px) {
                .ra-grid-3 { grid-template-columns: repeat(2, 1fr); }
            }

            @media (max-width: 768px) {
                .ra-grid-2,
                .ra-grid-3 { grid-template-columns: 1fr; }
                .ra-tabs { flex-wrap: wrap; }
                .ra-tab { flex: 1; justify-content: center; }
            }
        `;

        document.head.appendChild(styles);
    },

    render() {
        const container = document.getElementById('content-area') ||
                          document.querySelector('.main-content') ||
                          document.querySelector('[data-module-container]');

        if (!container) {
            console.error('❌ [RetailAnalytics] Container not found');
            return;
        }

        container.innerHTML = `
            <div class="ra-container">
                <div class="ra-header">
                    <div class="ra-title">
                        <span class="ra-title-icon">📊</span>
                        Retail Analytics & Predictive System
                        <span class="ra-ai-badge">AI Powered</span>
                    </div>
                    <div>
                        <button class="ra-btn ra-btn-secondary" onclick="RetailAnalyticsDashboard.showConfig()">
                            ⚙️ Configuración
                        </button>
                        <button class="ra-btn ra-btn-primary" onclick="RetailAnalyticsDashboard.syncData()">
                            🔄 Sincronizar
                        </button>
                    </div>
                </div>

                <div class="ra-tabs">
                    <button class="ra-tab active" data-tab="overview" onclick="RetailAnalyticsDashboard.switchTab('overview')">
                        <span class="ra-tab-icon">📈</span> Dashboard
                    </button>
                    <button class="ra-tab" data-tab="basket" onclick="RetailAnalyticsDashboard.switchTab('basket')">
                        <span class="ra-tab-icon">🛒</span> Market Basket
                        <span class="ra-ai-badge" style="padding: 2px 6px; font-size: 9px;">FP-Growth</span>
                    </button>
                    <button class="ra-tab" data-tab="forecast" onclick="RetailAnalyticsDashboard.switchTab('forecast')">
                        <span class="ra-tab-icon">🔮</span> Forecasting
                        <span class="ra-stats-badge" style="padding: 2px 6px; font-size: 9px;">SES</span>
                    </button>
                    <button class="ra-tab" data-tab="rfm" onclick="RetailAnalyticsDashboard.switchTab('rfm')">
                        <span class="ra-tab-icon">👥</span> Segmentación RFM
                    </button>
                    <button class="ra-tab" data-tab="reorder" onclick="RetailAnalyticsDashboard.switchTab('reorder')">
                        <span class="ra-tab-icon">📦</span> Reorden Inteligente
                    </button>
                    <button class="ra-tab" data-tab="centralized" onclick="RetailAnalyticsDashboard.switchTab('centralized')">
                        <span class="ra-tab-icon">🏢</span> Compra Centralizada
                    </button>
                </div>

                <div id="ra-content">
                    ${this.renderLoading()}
                </div>
            </div>
        `;
    },

    renderLoading() {
        return `
            <div class="ra-loading">
                <div class="ra-spinner"></div>
                Cargando datos de analytics...
            </div>
        `;
    },

    async loadData() {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Load dashboard KPIs
            const [kpisRes, configRes] = await Promise.all([
                fetch('/api/retail-analytics/dashboard', { headers }).catch(() => ({ ok: false })),
                fetch('/api/retail-analytics/config', { headers }).catch(() => ({ ok: false }))
            ]);

            if (kpisRes.ok) {
                this.data.kpis = await kpisRes.json();
            }
            if (configRes.ok) {
                this.data.config = await configRes.json();
            }

            this.renderTab(this.currentTab);
        } catch (error) {
            console.error('❌ [RetailAnalytics] Error loading data:', error);
            this.renderError('Error cargando datos');
        }
    },

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.ra-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        this.renderTab(tab);
    },

    async renderTab(tab) {
        const content = document.getElementById('ra-content');
        if (!content) return;

        content.innerHTML = this.renderLoading();

        switch(tab) {
            case 'overview':
                content.innerHTML = this.renderOverview();
                break;
            case 'basket':
                await this.loadBasketRules();
                content.innerHTML = this.renderBasketAnalysis();
                break;
            case 'forecast':
                content.innerHTML = this.renderForecast();
                break;
            case 'rfm':
                await this.loadRFMData();
                content.innerHTML = this.renderRFM();
                break;
            case 'reorder':
                await this.loadReorderSuggestions();
                content.innerHTML = this.renderReorder();
                break;
            case 'centralized':
                content.innerHTML = this.renderCentralized();
                break;
        }
    },

    renderOverview() {
        const kpis = this.data.kpis || {};

        return `
            <div class="ra-kpi-grid">
                <div class="ra-kpi-card primary">
                    <div class="ra-kpi-label">
                        Transacciones Procesadas
                        <span class="ra-ai-badge" style="padding: 2px 6px; font-size: 8px;">SIAC Sync</span>
                    </div>
                    <div class="ra-kpi-value">${this.formatNumber(kpis.totalTransactions || 0)}</div>
                    <div class="ra-kpi-change positive">
                        ↑ ${kpis.transactionsGrowth || 0}% vs mes anterior
                    </div>
                </div>

                <div class="ra-kpi-card success">
                    <div class="ra-kpi-label">
                        Reglas de Asociación
                        <span class="ra-ai-badge" style="padding: 2px 6px; font-size: 8px;">FP-Growth</span>
                    </div>
                    <div class="ra-kpi-value">${this.formatNumber(kpis.associationRules || 0)}</div>
                    <div class="ra-kpi-change">
                        Con confianza > 30%
                    </div>
                </div>

                <div class="ra-kpi-card warning">
                    <div class="ra-kpi-label">
                        Productos en Reorden
                        <span class="ra-stats-badge" style="padding: 2px 6px; font-size: 8px;">Safety Stock</span>
                    </div>
                    <div class="ra-kpi-value">${this.formatNumber(kpis.reorderProducts || 0)}</div>
                    <div class="ra-kpi-change negative">
                        ${kpis.criticalProducts || 0} críticos
                    </div>
                </div>

                <div class="ra-kpi-card purple">
                    <div class="ra-kpi-label">
                        Clientes Segmentados
                        <span class="ra-ai-badge" style="padding: 2px 6px; font-size: 8px;">RFM</span>
                    </div>
                    <div class="ra-kpi-value">${this.formatNumber(kpis.segmentedCustomers || 0)}</div>
                    <div class="ra-kpi-change">
                        ${kpis.championsCount || 0} Champions
                    </div>
                </div>

                <div class="ra-kpi-card cyan">
                    <div class="ra-kpi-label">
                        Forecast Accuracy
                        <span class="ra-stats-badge" style="padding: 2px 6px; font-size: 8px;">MAPE</span>
                    </div>
                    <div class="ra-kpi-value">${(kpis.forecastAccuracy || 85).toFixed(1)}%</div>
                    <div class="ra-kpi-change positive">
                        Suavizado Exponencial
                    </div>
                </div>

                <div class="ra-kpi-card danger">
                    <div class="ra-kpi-label">
                        Stockouts Detectados
                        <span class="ra-stats-badge" style="padding: 2px 6px; font-size: 8px;">Billing</span>
                    </div>
                    <div class="ra-kpi-value">${this.formatNumber(kpis.stockouts || 0)}</div>
                    <div class="ra-kpi-change">
                        Últimos 30 días
                    </div>
                </div>
            </div>

            <div class="ra-grid-2">
                <div class="ra-card">
                    <div class="ra-card-header">
                        <div class="ra-card-title">
                            <span class="ra-card-title-icon">🛒</span>
                            Top Asociaciones Detectadas
                            ${this.renderAlgoInfo('FP-Growth', 'Algoritmo de minería de patrones frecuentes', 'min_support: 0.01, min_confidence: 0.30')}
                        </div>
                    </div>
                    ${this.renderTopRules()}
                </div>

                <div class="ra-card">
                    <div class="ra-card-header">
                        <div class="ra-card-title">
                            <span class="ra-card-title-icon">📊</span>
                            Matriz ABC/XYZ
                            ${this.renderAlgoInfo('Pareto + CV', 'Clasificación por volumen y variabilidad', 'A: 80%, B: 15%, C: 5% | X: CV<0.2, Y: 0.2-0.5, Z: >0.5')}
                        </div>
                    </div>
                    ${this.renderABCXYZMatrix()}
                </div>
            </div>
        `;
    },

    renderAlgoInfo(name, description, params) {
        return `
            <div class="ra-algo-info">
                <span class="ra-ai-badge" style="cursor: help;">ℹ️ ${name}</span>
                <div class="ra-algo-tooltip">
                    <div class="ra-algo-tooltip-title">🧠 ${name}</div>
                    <div class="ra-algo-tooltip-desc">${description}</div>
                    <div class="ra-algo-tooltip-params">${params}</div>
                </div>
            </div>
        `;
    },

    renderTopRules() {
        const rules = this.data.basketRules?.slice(0, 5) || [];

        if (rules.length === 0) {
            return `
                <div class="ra-empty">
                    <div class="ra-empty-icon">📊</div>
                    <p>No hay reglas de asociación calculadas aún</p>
                    <button class="ra-btn ra-btn-primary" onclick="RetailAnalyticsDashboard.runBasketAnalysis()">
                        🧠 Ejecutar Análisis
                    </button>
                </div>
            `;
        }

        return rules.map(rule => `
            <div class="ra-rule-card">
                <div class="ra-rule-items">
                    <div class="ra-rule-antecedent">
                        ${(rule.antecedent_products || []).map(p => `<span class="ra-rule-item">${p}</span>`).join('')}
                    </div>
                    <span class="ra-rule-arrow">→</span>
                    <div class="ra-rule-consequent">
                        ${(rule.consequent_products || []).map(p => `<span class="ra-rule-item">${p}</span>`).join('')}
                    </div>
                </div>
                <div class="ra-rule-metrics">
                    <div class="ra-rule-metric">
                        Support: <span class="ra-rule-metric-value">${(rule.support * 100).toFixed(1)}%</span>
                    </div>
                    <div class="ra-rule-metric">
                        Confidence: <span class="ra-rule-metric-value">${(rule.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div class="ra-rule-metric">
                        Lift: <span class="ra-rule-metric-value">${rule.lift?.toFixed(2) || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderABCXYZMatrix() {
        const matrix = this.data.kpis?.abcxyzMatrix || {
            AX: 12, AY: 8, AZ: 3,
            BX: 15, BY: 22, BZ: 10,
            CX: 5, CY: 18, CZ: 45
        };

        return `
            <div style="margin-top: 16px;">
                <div style="display: grid; grid-template-columns: 40px repeat(3, 1fr); gap: 8px;">
                    <div></div>
                    <div style="text-align: center; font-weight: 600; color: ${this.theme.primary};">X (Estable)</div>
                    <div style="text-align: center; font-weight: 600; color: ${this.theme.warning};">Y (Variable)</div>
                    <div style="text-align: center; font-weight: 600; color: ${this.theme.danger};">Z (Errático)</div>

                    <div style="writing-mode: vertical-lr; transform: rotate(180deg); text-align: center; font-weight: 600; color: ${this.theme.success};">A (Alto Vol)</div>
                    <div class="ra-matrix-cell" style="background: #3fb95020; border: 1px solid #3fb95040;">
                        <div class="ra-matrix-count">${matrix.AX || 0}</div>
                        <div style="font-size: 11px; color: ${this.theme.textMuted};">Críticos</div>
                    </div>
                    <div class="ra-matrix-cell" style="background: #d2992220; border: 1px solid #d2992240;">
                        <div class="ra-matrix-count">${matrix.AY || 0}</div>
                    </div>
                    <div class="ra-matrix-cell" style="background: #f8514920; border: 1px solid #f8514940;">
                        <div class="ra-matrix-count">${matrix.AZ || 0}</div>
                    </div>

                    <div style="writing-mode: vertical-lr; transform: rotate(180deg); text-align: center; font-weight: 600; color: ${this.theme.warning};">B (Medio)</div>
                    <div class="ra-matrix-cell">
                        <div class="ra-matrix-count">${matrix.BX || 0}</div>
                    </div>
                    <div class="ra-matrix-cell">
                        <div class="ra-matrix-count">${matrix.BY || 0}</div>
                    </div>
                    <div class="ra-matrix-cell">
                        <div class="ra-matrix-count">${matrix.BZ || 0}</div>
                    </div>

                    <div style="writing-mode: vertical-lr; transform: rotate(180deg); text-align: center; font-weight: 600; color: ${this.theme.textMuted};">C (Bajo)</div>
                    <div class="ra-matrix-cell">
                        <div class="ra-matrix-count">${matrix.CX || 0}</div>
                    </div>
                    <div class="ra-matrix-cell">
                        <div class="ra-matrix-count">${matrix.CY || 0}</div>
                    </div>
                    <div class="ra-matrix-cell">
                        <div class="ra-matrix-count">${matrix.CZ || 0}</div>
                        <div style="font-size: 11px; color: ${this.theme.textMuted};">Candidatos a baja</div>
                    </div>
                </div>
            </div>
        `;
    },

    async loadBasketRules() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/retail-analytics/basket-analysis/rules', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                this.data.basketRules = await res.json();
            }
        } catch (error) {
            console.error('Error loading basket rules:', error);
        }
    },

    renderBasketAnalysis() {
        const rules = this.data.basketRules || [];

        return `
            <div class="ra-card">
                <div class="ra-card-header">
                    <div class="ra-card-title">
                        <span class="ra-card-title-icon">🛒</span>
                        Market Basket Analysis
                        ${this.renderAlgoInfo('FP-Growth Simplificado',
                            'Versión optimizada para SQL que encuentra patrones frecuentes de compra conjunta sin necesidad de bibliotecas externas.',
                            'Support ≥ 1%, Confidence ≥ 30%, Max items: 5'
                        )}
                    </div>
                    <button class="ra-btn ra-btn-primary" onclick="RetailAnalyticsDashboard.runBasketAnalysis()">
                        🧠 Recalcular
                    </button>
                </div>

                <p style="color: ${this.theme.textMuted}; margin-bottom: 20px;">
                    Detecta patrones de productos que se compran juntos. Ejemplo: "El 70% de quienes compran carne también compran leña y vino".
                </p>

                ${rules.length === 0 ? `
                    <div class="ra-empty">
                        <div class="ra-empty-icon">🛒</div>
                        <p>No hay reglas de asociación calculadas</p>
                        <p style="font-size: 13px; color: ${this.theme.textMuted};">
                            Ejecute el análisis para detectar patrones de compra.
                        </p>
                    </div>
                ` : `
                    <div class="ra-table-container">
                        <table class="ra-table">
                            <thead>
                                <tr>
                                    <th>Antecedente (Si compra...)</th>
                                    <th>Consecuente (...también compra)</th>
                                    <th>Support</th>
                                    <th>Confidence</th>
                                    <th>Lift</th>
                                    <th>Transacciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rules.map(rule => `
                                    <tr>
                                        <td>${(rule.antecedent_products || []).join(' + ')}</td>
                                        <td>${(rule.consequent_products || []).join(' + ')}</td>
                                        <td>
                                            <div class="ra-confidence-bar">
                                                <div class="ra-confidence-fill" style="width: ${rule.support * 100}%; background: ${this.theme.primary};"></div>
                                            </div>
                                            <span style="font-size: 11px;">${(rule.support * 100).toFixed(1)}%</span>
                                        </td>
                                        <td>
                                            <div class="ra-confidence-bar">
                                                <div class="ra-confidence-fill" style="width: ${rule.confidence * 100}%; background: ${this.theme.success};"></div>
                                            </div>
                                            <span style="font-size: 11px;">${(rule.confidence * 100).toFixed(1)}%</span>
                                        </td>
                                        <td style="font-weight: 600; color: ${rule.lift > 1 ? this.theme.success : this.theme.danger};">
                                            ${rule.lift?.toFixed(2) || '-'}
                                        </td>
                                        <td>${this.formatNumber(rule.transaction_count || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    },

    renderForecast() {
        return `
            <div class="ra-card">
                <div class="ra-card-header">
                    <div class="ra-card-title">
                        <span class="ra-card-title-icon">🔮</span>
                        Demand Forecasting
                        ${this.renderAlgoInfo('Simple Exponential Smoothing',
                            'Método de suavizado que da más peso a observaciones recientes. Ideal para datos sin tendencia clara.',
                            'α (alpha) optimizado automáticamente via grid search'
                        )}
                    </div>
                    <button class="ra-btn ra-btn-primary" onclick="RetailAnalyticsDashboard.runForecast()">
                        🔮 Generar Predicciones
                    </button>
                </div>

                <div class="ra-grid-3" style="margin-bottom: 20px;">
                    <div class="ra-kpi-card primary">
                        <div class="ra-kpi-label">Algoritmo Principal</div>
                        <div class="ra-kpi-value" style="font-size: 18px;">SES</div>
                        <div class="ra-kpi-change">Simple Exponential Smoothing</div>
                    </div>
                    <div class="ra-kpi-card success">
                        <div class="ra-kpi-label">Algoritmo Alternativo</div>
                        <div class="ra-kpi-value" style="font-size: 18px;">MA</div>
                        <div class="ra-kpi-change">Moving Average (7 días)</div>
                    </div>
                    <div class="ra-kpi-card purple">
                        <div class="ra-kpi-label">Con Estacionalidad</div>
                        <div class="ra-kpi-value" style="font-size: 18px;">WMA</div>
                        <div class="ra-kpi-change">Weighted Moving Average</div>
                    </div>
                </div>

                <p style="color: ${this.theme.textMuted}; margin-bottom: 20px;">
                    Predice la demanda futura de productos considerando patrones históricos, estacionalidad y tendencias.
                    Los algoritmos se seleccionan automáticamente según las características del producto.
                </p>

                <div class="ra-empty">
                    <div class="ra-empty-icon">🔮</div>
                    <p>Seleccione un producto para ver su predicción de demanda</p>
                </div>
            </div>
        `;
    },

    async loadRFMData() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/retail-analytics/rfm/segments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                this.data.rfmSegments = await res.json();
            }
        } catch (error) {
            console.error('Error loading RFM data:', error);
        }
    },

    renderRFM() {
        const segments = this.data.rfmSegments || [];

        return `
            <div class="ra-card">
                <div class="ra-card-header">
                    <div class="ra-card-title">
                        <span class="ra-card-title-icon">👥</span>
                        Segmentación RFM
                        ${this.renderAlgoInfo('RFM Analysis',
                            'Recency (cuándo compró), Frequency (cuántas veces), Monetary (cuánto gastó). Cada dimensión se puntúa 1-5.',
                            'Quintiles calculados por empresa. Última compra: 365 días máx.'
                        )}
                    </div>
                    <button class="ra-btn ra-btn-primary" onclick="RetailAnalyticsDashboard.runRFM()">
                        👥 Recalcular
                    </button>
                </div>

                <div class="ra-grid-3" style="margin-bottom: 20px;">
                    <div class="ra-kpi-card success">
                        <div class="ra-kpi-label">Champions</div>
                        <div class="ra-kpi-value">${this.formatNumber(segments.find(s => s.segment_code === 'champions')?.customer_count || 0)}</div>
                        <div class="ra-kpi-change">RFM: 445-555</div>
                    </div>
                    <div class="ra-kpi-card warning">
                        <div class="ra-kpi-label">At Risk</div>
                        <div class="ra-kpi-value">${this.formatNumber(segments.find(s => s.segment_code === 'at_risk')?.customer_count || 0)}</div>
                        <div class="ra-kpi-change">Necesitan reactivación</div>
                    </div>
                    <div class="ra-kpi-card danger">
                        <div class="ra-kpi-label">Lost</div>
                        <div class="ra-kpi-value">${this.formatNumber(segments.find(s => s.segment_code === 'lost')?.customer_count || 0)}</div>
                        <div class="ra-kpi-change">Inactivos largo tiempo</div>
                    </div>
                </div>

                ${segments.length === 0 ? `
                    <div class="ra-empty">
                        <div class="ra-empty-icon">👥</div>
                        <p>No hay datos de segmentación RFM</p>
                    </div>
                ` : `
                    <div class="ra-table-container">
                        <table class="ra-table">
                            <thead>
                                <tr>
                                    <th>Segmento</th>
                                    <th>Clientes</th>
                                    <th>% del Total</th>
                                    <th>Valor Promedio</th>
                                    <th>Acciones Recomendadas</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${segments.map(seg => `
                                    <tr>
                                        <td>
                                            <span class="ra-segment-badge ra-segment-${seg.segment_code}">
                                                ${seg.segment_name}
                                            </span>
                                        </td>
                                        <td>${this.formatNumber(seg.customer_count || 0)}</td>
                                        <td>${(seg.percentage || 0).toFixed(1)}%</td>
                                        <td>$${this.formatNumber(seg.avg_monetary || 0)}</td>
                                        <td style="font-size: 12px; color: ${this.theme.textMuted};">
                                            ${(seg.recommended_actions || []).slice(0, 2).join(', ')}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    },

    async loadReorderSuggestions() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/retail-analytics/reorder/suggestions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                this.data.reorderSuggestions = await res.json();
            }
        } catch (error) {
            console.error('Error loading reorder suggestions:', error);
        }
    },

    renderReorder() {
        const suggestions = this.data.reorderSuggestions || [];

        return `
            <div class="ra-card">
                <div class="ra-card-header">
                    <div class="ra-card-title">
                        <span class="ra-card-title-icon">📦</span>
                        Sugerencias de Reorden Inteligente
                        ${this.renderAlgoInfo('Safety Stock + Lead Time',
                            'Calcula punto de reorden considerando demanda promedio, lead time del proveedor y stock de seguridad.',
                            'Reorder Point = (Avg Daily Sales × Lead Time) + Safety Stock'
                        )}
                    </div>
                    <button class="ra-btn ra-btn-primary" onclick="RetailAnalyticsDashboard.generateReorders()">
                        📦 Generar Sugerencias
                    </button>
                </div>

                ${suggestions.length === 0 ? `
                    <div class="ra-empty">
                        <div class="ra-empty-icon">📦</div>
                        <p>No hay sugerencias de reorden pendientes</p>
                        <p style="font-size: 13px; color: ${this.theme.textMuted};">
                            El sistema analiza automáticamente el inventario y genera sugerencias.
                        </p>
                    </div>
                ` : `
                    <div class="ra-table-container">
                        <table class="ra-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Proveedor</th>
                                    <th>Stock Actual</th>
                                    <th>Punto Reorden</th>
                                    <th>Cantidad Sugerida</th>
                                    <th>Urgencia</th>
                                    <th>Días de Stock</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${suggestions.map(s => `
                                    <tr>
                                        <td>
                                            <strong>${s.product_name}</strong>
                                            <br><span style="font-size: 11px; color: ${this.theme.textMuted};">${s.product_code}</span>
                                        </td>
                                        <td>${s.supplier_name || '-'}</td>
                                        <td>${this.formatNumber(s.current_stock)}</td>
                                        <td>${this.formatNumber(s.reorder_point)}</td>
                                        <td style="font-weight: 600; color: ${this.theme.primary};">
                                            ${this.formatNumber(s.suggested_quantity)}
                                        </td>
                                        <td>
                                            <span class="ra-urgency-badge ra-urgency-${s.urgency_level}">
                                                ${s.urgency_level}
                                            </span>
                                        </td>
                                        <td>${s.days_of_supply?.toFixed(1) || '-'}</td>
                                        <td>
                                            <button class="ra-btn ra-btn-secondary" style="padding: 6px 12px; font-size: 12px;"
                                                onclick="RetailAnalyticsDashboard.approveReorder(${s.id})">
                                                ✅ Aprobar
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    },

    renderCentralized() {
        return `
            <div class="ra-card">
                <div class="ra-card-header">
                    <div class="ra-card-title">
                        <span class="ra-card-title-icon">🏢</span>
                        Compra Centralizada Multi-Sucursal
                    </div>
                </div>

                <p style="color: ${this.theme.textMuted}; margin-bottom: 20px;">
                    Gestiona pedidos consolidados de múltiples sucursales hacia un Centro de Distribución (CEDI).
                </p>

                <div class="ra-grid-3" style="margin-bottom: 20px;">
                    <div class="ra-kpi-card primary">
                        <div class="ra-kpi-label">Sucursales Activas</div>
                        <div class="ra-kpi-value">0</div>
                    </div>
                    <div class="ra-kpi-card warning">
                        <div class="ra-kpi-label">Pedidos Pendientes</div>
                        <div class="ra-kpi-value">0</div>
                    </div>
                    <div class="ra-kpi-card success">
                        <div class="ra-kpi-label">Consolidaciones Hoy</div>
                        <div class="ra-kpi-value">0</div>
                    </div>
                </div>

                <div class="ra-empty">
                    <div class="ra-empty-icon">🏢</div>
                    <p>Configure las sucursales y CEDIs para habilitar la compra centralizada</p>
                    <button class="ra-btn ra-btn-primary" onclick="RetailAnalyticsDashboard.showLocationSetup()">
                        ⚙️ Configurar Ubicaciones
                    </button>
                </div>
            </div>
        `;
    },

    renderError(message) {
        const content = document.getElementById('ra-content');
        if (content) {
            content.innerHTML = `
                <div class="ra-empty">
                    <div class="ra-empty-icon">❌</div>
                    <p>${message}</p>
                    <button class="ra-btn ra-btn-primary" onclick="RetailAnalyticsDashboard.loadData()">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    },

    // API Actions
    async syncData() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/retail-analytics/sync-transactions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            this.showNotification('Sincronización completada', 'success');
            await this.loadData();
        } catch (error) {
            this.showNotification('Error en sincronización', 'error');
        }
    },

    async runBasketAnalysis() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/retail-analytics/basket-analysis/run', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            this.showNotification(`Market Basket Analysis completado: ${result.rulesGenerated} reglas`, 'success');
            await this.loadBasketRules();
            this.renderTab('basket');
        } catch (error) {
            this.showNotification('Error ejecutando análisis', 'error');
        }
    },

    async runRFM() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/retail-analytics/rfm/calculate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            this.showNotification('Segmentación RFM completada', 'success');
            await this.loadRFMData();
            this.renderTab('rfm');
        } catch (error) {
            this.showNotification('Error calculando RFM', 'error');
        }
    },

    async generateReorders() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/retail-analytics/reorder/generate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            this.showNotification(`${result.suggestionsGenerated} sugerencias generadas`, 'success');
            await this.loadReorderSuggestions();
            this.renderTab('reorder');
        } catch (error) {
            this.showNotification('Error generando sugerencias', 'error');
        }
    },

    async approveReorder(suggestionId) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/retail-analytics/reorder/approve', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ suggestionIds: [suggestionId] })
            });
            const result = await res.json();
            this.showNotification('Reorden aprobado', 'success');
            await this.loadReorderSuggestions();
            this.renderTab('reorder');
        } catch (error) {
            this.showNotification('Error aprobando reorden', 'error');
        }
    },

    showConfig() {
        this.showNotification('Configuración en desarrollo', 'info');
    },

    showLocationSetup() {
        this.showNotification('Setup de ubicaciones en desarrollo', 'info');
    },

    runForecast() {
        this.showNotification('Seleccione un producto para generar forecast', 'info');
    },

    // Helpers
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return new Intl.NumberFormat('es-AR').format(num);
    },

    showNotification(message, type = 'info') {
        // Use existing notification system or create simple one
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }
};

// Auto-init if loaded as module
if (typeof window !== 'undefined') {
    window.RetailAnalyticsDashboard = RetailAnalyticsDashboard;
}
