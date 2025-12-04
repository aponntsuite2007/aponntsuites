/**
 * hours-cube-dashboard.js
 *
 * Panel Ejecutivo de Cubo de Horas
 * Sistema de Analítica Avanzada v2.0
 *
 * BASADO EN:
 * - Configuración dinámica de turnos del sistema
 * - Metodología OLAP para análisis multidimensional
 *
 * CARACTERÍSTICAS:
 * 1. Resumen ejecutivo con KPIs principales
 * 2. Cubo de horas con drill-down (Sucursal → Departamento → Turno)
 * 3. Análisis de costos de reposición
 * 4. Optimizador de vacaciones con sugerencias
 * 5. Gráficos interactivos con Chart.js
 */

class HoursCubeDashboard {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            companyId: options.companyId || this.getCompanyIdFromContext(),
            apiBase: options.apiBase || '/api/hours-cube',
            theme: options.theme || 'light',
            locale: 'es-AR',
            currency: 'ARS',
            ...options
        };

        this.data = {
            cube: null,
            replacementCosts: null,
            vacationOptimization: null,
            executiveDashboard: null
        };

        this.charts = {};
        this.currentDrillDown = null;

        this.init();
    }

    getCompanyIdFromContext() {
        const userContext = window.userContext || {};
        return userContext.companyId || 11;
    }

    async init() {
        this.renderSkeleton();
        await this.loadData();
        this.render();
    }

    renderSkeleton() {
        this.container.innerHTML = `
            <div class="hcd-dashboard">
                <div class="hcd-header">
                    <div class="hcd-title">
                        <h2><i class="fas fa-cube"></i> Panel Ejecutivo de Horas</h2>
                        <span class="hcd-subtitle">Analisis multidimensional de horas trabajadas</span>
                    </div>
                    <div class="hcd-date-selector">
                        <label>Período de análisis:</label>
                        <input type="date" id="hcd-start-date" value="${this.getDefaultStartDate()}">
                        <span>hasta</span>
                        <input type="date" id="hcd-end-date" value="${this.getDefaultEndDate()}">
                        <button class="hcd-btn-refresh" onclick="hoursCubeDashboard.refresh()">
                            <i class="fas fa-sync-alt"></i> Actualizar
                        </button>
                    </div>
                </div>

                <div class="hcd-loading" id="hcd-loading">
                    <div class="hcd-spinner"></div>
                    <p>Cargando panel ejecutivo...</p>
                </div>

                <div class="hcd-content" id="hcd-content" style="display: none;">
                    <!-- KPIs -->
                    <div class="hcd-kpis" id="hcd-kpis"></div>

                    <!-- Tabs -->
                    <div class="hcd-tabs">
                        <button class="hcd-tab active" data-tab="resumen">
                            <i class="fas fa-chart-pie"></i> Resumen General
                        </button>
                        <button class="hcd-tab" data-tab="cubo">
                            <i class="fas fa-cube"></i> Cubo de Horas
                        </button>
                        <button class="hcd-tab" data-tab="reposicion">
                            <i class="fas fa-exchange-alt"></i> Costos de Reposición
                        </button>
                        <button class="hcd-tab" data-tab="vacaciones">
                            <i class="fas fa-umbrella-beach"></i> Optimizador de Vacaciones
                        </button>
                    </div>

                    <!-- Contenido de tabs -->
                    <div class="hcd-tab-content active" id="tab-resumen"></div>
                    <div class="hcd-tab-content" id="tab-cubo"></div>
                    <div class="hcd-tab-content" id="tab-reposicion"></div>
                    <div class="hcd-tab-content" id="tab-vacaciones"></div>
                </div>

                <!-- Pie de pagina -->
                <div class="hcd-legal-footer">
                    <small>
                        <i class="fas fa-cog"></i>
                        Multiplicadores configurados por turno | Analisis basado en datos reales de asistencia
                    </small>
                </div>
            </div>
        `;

        this.addStyles();
        this.setupTabNavigation();
    }

    addStyles() {
        if (document.getElementById('hcd-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'hcd-styles';
        styles.textContent = `
            .hcd-dashboard {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                padding: 20px;
                background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }

            .hcd-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 25px;
                flex-wrap: wrap;
                gap: 20px;
            }

            .hcd-title h2 {
                margin: 0;
                color: #1a365d;
                font-size: 1.6em;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .hcd-subtitle {
                display: block;
                color: #718096;
                font-size: 0.85em;
                margin-top: 5px;
            }

            .hcd-date-selector {
                display: flex;
                align-items: center;
                gap: 10px;
                background: white;
                padding: 12px 16px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }

            .hcd-date-selector input {
                padding: 8px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                font-size: 0.9em;
            }

            .hcd-btn-refresh {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 10px 18px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .hcd-btn-refresh:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .hcd-loading {
                text-align: center;
                padding: 80px;
            }

            .hcd-spinner {
                border: 4px solid #e2e8f0;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: hcd-spin 0.8s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes hcd-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .hcd-kpis {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 16px;
                margin-bottom: 25px;
            }

            .hcd-kpi {
                background: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.06);
                text-align: center;
                position: relative;
                overflow: hidden;
            }

            .hcd-kpi::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
            }

            .hcd-kpi.success::before { background: linear-gradient(90deg, #48bb78, #38a169); }
            .hcd-kpi.warning::before { background: linear-gradient(90deg, #ecc94b, #d69e2e); }
            .hcd-kpi.danger::before { background: linear-gradient(90deg, #fc8181, #e53e3e); }
            .hcd-kpi.info::before { background: linear-gradient(90deg, #63b3ed, #4299e1); }

            .hcd-kpi-icon {
                font-size: 1.8em;
                margin-bottom: 10px;
                opacity: 0.8;
            }

            .hcd-kpi-value {
                font-size: 2em;
                font-weight: 700;
                color: #1a365d;
                margin-bottom: 5px;
            }

            .hcd-kpi-label {
                color: #718096;
                font-size: 0.85em;
                font-weight: 500;
            }

            .hcd-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 12px;
                flex-wrap: wrap;
            }

            .hcd-tab {
                background: transparent;
                border: none;
                padding: 12px 20px;
                cursor: pointer;
                border-radius: 8px 8px 0 0;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 500;
                color: #4a5568;
            }

            .hcd-tab:hover {
                background: #edf2f7;
            }

            .hcd-tab.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .hcd-tab-content {
                display: none;
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            }

            .hcd-tab-content.active {
                display: block;
            }

            .hcd-section-title {
                font-size: 1.2em;
                font-weight: 600;
                color: #2d3748;
                margin: 0 0 20px 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .hcd-chart-container {
                width: 100%;
                margin-bottom: 25px;
                padding: 20px;
                background: #f7fafc;
                border-radius: 10px;
            }

            .hcd-chart-title {
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 15px;
                font-size: 1em;
            }

            .hcd-bar-chart {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .hcd-bar-item {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .hcd-bar-label {
                width: 150px;
                font-size: 0.9em;
                color: #4a5568;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .hcd-bar-wrapper {
                flex: 1;
                height: 28px;
                background: #e2e8f0;
                border-radius: 6px;
                overflow: hidden;
                position: relative;
            }

            .hcd-bar-fill {
                height: 100%;
                border-radius: 6px;
                transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding-right: 10px;
                color: white;
                font-size: 0.85em;
                font-weight: 600;
            }

            .hcd-bar-value {
                width: 100px;
                text-align: right;
                font-weight: 600;
                color: #2d3748;
            }

            .hcd-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                gap: 20px;
            }

            .hcd-card {
                background: #f7fafc;
                padding: 20px;
                border-radius: 10px;
                border: 1px solid #e2e8f0;
            }

            .hcd-card-title {
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .hcd-list-item {
                background: white;
                padding: 14px;
                border-radius: 8px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.3s;
                border-left: 4px solid #667eea;
            }

            .hcd-list-item:hover {
                transform: translateX(6px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .hcd-list-item-name {
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 6px;
            }

            .hcd-list-item-stats {
                display: flex;
                justify-content: space-between;
                font-size: 0.9em;
                color: #718096;
            }

            .hcd-progress-bar {
                height: 6px;
                background: #e2e8f0;
                border-radius: 3px;
                margin-top: 10px;
                overflow: hidden;
            }

            .hcd-progress-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.6s ease;
            }

            .hcd-metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 25px;
            }

            .hcd-metric-card {
                background: #f7fafc;
                padding: 18px;
                border-radius: 10px;
                text-align: center;
            }

            .hcd-metric-title {
                font-size: 0.85em;
                color: #718096;
                margin-bottom: 8px;
            }

            .hcd-metric-value {
                font-size: 1.6em;
                font-weight: 700;
                color: #2d3748;
            }

            .hcd-efficiency-meter {
                display: flex;
                align-items: center;
                gap: 15px;
                margin: 15px 0;
            }

            .hcd-efficiency-bar {
                flex: 1;
                height: 24px;
                background: #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
            }

            .hcd-efficiency-fill {
                height: 100%;
                border-radius: 12px;
                transition: width 0.6s ease;
            }

            .hcd-efficiency-label {
                width: 80px;
                text-align: right;
                font-weight: 700;
                font-size: 1.1em;
            }

            .hcd-alert {
                padding: 16px;
                border-radius: 10px;
                margin-bottom: 15px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }

            .hcd-alert.warning {
                background: #fffbeb;
                border-left: 4px solid #f59e0b;
            }

            .hcd-alert.critical {
                background: #fef2f2;
                border-left: 4px solid #ef4444;
            }

            .hcd-alert.info {
                background: #eff6ff;
                border-left: 4px solid #3b82f6;
            }

            .hcd-alert.success {
                background: #f0fdf4;
                border-left: 4px solid #22c55e;
            }

            .hcd-vacation-item {
                display: flex;
                align-items: center;
                padding: 15px;
                background: #f7fafc;
                border-radius: 10px;
                margin-bottom: 12px;
                border: 1px solid #e2e8f0;
            }

            .hcd-vacation-employee {
                flex: 1;
            }

            .hcd-vacation-period {
                text-align: right;
                color: #718096;
            }

            .hcd-score-badge {
                background: linear-gradient(135deg, #48bb78, #38a169);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.85em;
                font-weight: 600;
                margin-left: 15px;
            }

            .hcd-legal-footer {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid #e2e8f0;
                text-align: center;
                color: #a0aec0;
            }

            .hcd-breadcrumb {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                background: #edf2f7;
                border-radius: 8px;
                margin-bottom: 20px;
            }

            .hcd-breadcrumb a {
                color: #667eea;
                text-decoration: none;
                font-weight: 500;
            }

            .hcd-breadcrumb a:hover {
                text-decoration: underline;
            }

            .hcd-donut-container {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 40px;
                padding: 20px;
            }

            .hcd-donut {
                position: relative;
                width: 180px;
                height: 180px;
            }

            .hcd-donut-center {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
            }

            .hcd-donut-value {
                font-size: 2em;
                font-weight: 700;
                color: #2d3748;
            }

            .hcd-donut-label {
                font-size: 0.85em;
                color: #718096;
            }

            .hcd-legend {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .hcd-legend-item {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .hcd-legend-color {
                width: 16px;
                height: 16px;
                border-radius: 4px;
            }

            .hcd-legend-text {
                font-size: 0.9em;
                color: #4a5568;
            }

            .hcd-legend-value {
                font-weight: 600;
                color: #2d3748;
                margin-left: auto;
            }
        `;
        document.head.appendChild(styles);
    }

    setupTabNavigation() {
        const tabs = this.container.querySelectorAll('.hcd-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const tabId = tab.dataset.tab;
                this.container.querySelectorAll('.hcd-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`tab-${tabId}`).classList.add('active');
            });
        });
    }

    getDefaultStartDate() {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    }

    getDefaultEndDate() {
        return new Date().toISOString().split('T')[0];
    }

    async loadData() {
        try {
            const startDate = document.getElementById('hcd-start-date')?.value || this.getDefaultStartDate();
            const endDate = document.getElementById('hcd-end-date')?.value || this.getDefaultEndDate();
            const params = `?startDate=${startDate}&endDate=${endDate}`;

            const response = await fetch(
                `${this.options.apiBase}/${this.options.companyId}/executive-dashboard${params}`,
                { headers: { 'Authorization': `Bearer ${this.getAuthToken()}` } }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.data.executiveDashboard = await response.json();

            const cubeResponse = await fetch(
                `${this.options.apiBase}/${this.options.companyId}${params}`,
                { headers: { 'Authorization': `Bearer ${this.getAuthToken()}` } }
            );

            if (cubeResponse.ok) {
                this.data.cube = await cubeResponse.json();
            }

        } catch (error) {
            console.error('Error cargando datos:', error);
            this.showError(error.message);
        }
    }

    getAuthToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    }

    async refresh() {
        document.getElementById('hcd-loading').style.display = 'block';
        document.getElementById('hcd-content').style.display = 'none';
        await this.loadData();
        this.render();
    }

    showError(message) {
        document.getElementById('hcd-loading').innerHTML = `
            <div class="hcd-alert critical">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Error al cargar el panel: ${message}</span>
            </div>
            <button class="hcd-btn-refresh" onclick="hoursCubeDashboard.refresh()">
                <i class="fas fa-redo"></i> Reintentar
            </button>
        `;
    }

    render() {
        document.getElementById('hcd-loading').style.display = 'none';
        document.getElementById('hcd-content').style.display = 'block';

        this.renderKPIs();
        this.renderResumenTab();
        this.renderCuboTab();
        this.renderReposicionTab();
        this.renderVacacionesTab();
    }

    renderKPIs() {
        const kpis = this.data.executiveDashboard?.kpis || {};
        const container = document.getElementById('hcd-kpis');

        container.innerHTML = `
            <div class="hcd-kpi info">
                <div class="hcd-kpi-icon"><i class="fas fa-clock"></i></div>
                <div class="hcd-kpi-value">${this.formatNumber(kpis.attendanceRate || 0)}%</div>
                <div class="hcd-kpi-label">Tasa de Asistencia</div>
            </div>

            <div class="hcd-kpi ${kpis.overtimeRatio > 20 ? 'danger' : kpis.overtimeRatio > 10 ? 'warning' : 'success'}">
                <div class="hcd-kpi-icon"><i class="fas fa-business-time"></i></div>
                <div class="hcd-kpi-value">${this.formatNumber(kpis.overtimeRatio || 0)}%</div>
                <div class="hcd-kpi-label">Ratio Horas Extras</div>
            </div>

            <div class="hcd-kpi ${kpis.costEfficiency > 80 ? 'success' : kpis.costEfficiency > 60 ? 'warning' : 'danger'}">
                <div class="hcd-kpi-icon"><i class="fas fa-dollar-sign"></i></div>
                <div class="hcd-kpi-value">${this.formatNumber(kpis.costEfficiency || 0)}%</div>
                <div class="hcd-kpi-label">Eficiencia de Costos</div>
            </div>

            <div class="hcd-kpi ${kpis.healthScore >= 80 ? 'success' : kpis.healthScore >= 60 ? 'warning' : 'danger'}">
                <div class="hcd-kpi-icon"><i class="fas fa-heartbeat"></i></div>
                <div class="hcd-kpi-value">${kpis.healthScore || 0}</div>
                <div class="hcd-kpi-label">Índice de Salud</div>
            </div>

            <div class="hcd-kpi success">
                <div class="hcd-kpi-icon"><i class="fas fa-piggy-bank"></i></div>
                <div class="hcd-kpi-value">$${this.formatNumber(kpis.potentialSavings || 0)}</div>
                <div class="hcd-kpi-label">Ahorro Potencial</div>
            </div>
        `;
    }

    renderResumenTab() {
        const container = document.getElementById('tab-resumen');
        const hours = this.data.executiveDashboard?.hoursSummary?.total || {};
        const alerts = this.data.executiveDashboard?.hoursSummary?.alerts || [];

        const total = (hours.normal || 0) + (hours.overtime50 || 0) + (hours.overtime100 || 0);
        const normalPct = total > 0 ? ((hours.normal || 0) / total) * 100 : 0;
        const ot50Pct = total > 0 ? ((hours.overtime50 || 0) / total) * 100 : 0;
        const ot100Pct = total > 0 ? ((hours.overtime100 || 0) / total) * 100 : 0;

        container.innerHTML = `
            <h3 class="hcd-section-title">
                <i class="fas fa-chart-bar"></i> Distribución de Horas del Período
            </h3>

            <div class="hcd-chart-container">
                <div class="hcd-donut-container">
                    <div class="hcd-donut">
                        <svg viewBox="0 0 100 100">
                            ${this.renderDonutSegments([
                                { value: normalPct, color: '#48bb78' },
                                { value: ot50Pct, color: '#ecc94b' },
                                { value: ot100Pct, color: '#fc8181' }
                            ])}
                        </svg>
                        <div class="hcd-donut-center">
                            <div class="hcd-donut-value">${this.formatNumber(total)}</div>
                            <div class="hcd-donut-label">Total Horas</div>
                        </div>
                    </div>

                    <div class="hcd-legend">
                        <div class="hcd-legend-item">
                            <div class="hcd-legend-color" style="background: #48bb78;"></div>
                            <span class="hcd-legend-text">Horas Normales</span>
                            <span class="hcd-legend-value">${this.formatNumber(hours.normal || 0)} hrs (${this.formatNumber(normalPct)}%)</span>
                        </div>
                        <div class="hcd-legend-item">
                            <div class="hcd-legend-color" style="background: #ecc94b;"></div>
                            <span class="hcd-legend-text">Extras 50%</span>
                            <span class="hcd-legend-value">${this.formatNumber(hours.overtime50 || 0)} hrs (${this.formatNumber(ot50Pct)}%)</span>
                        </div>
                        <div class="hcd-legend-item">
                            <div class="hcd-legend-color" style="background: #fc8181;"></div>
                            <span class="hcd-legend-text">Extras 100%</span>
                            <span class="hcd-legend-value">${this.formatNumber(hours.overtime100 || 0)} hrs (${this.formatNumber(ot100Pct)}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="hcd-grid">
                <div class="hcd-card">
                    <h4 class="hcd-card-title"><i class="fas fa-building"></i> Principales Sucursales</h4>
                    ${this.renderTopItems(this.data.executiveDashboard?.hoursSummary?.topBranches || [], 'sucursal')}
                </div>

                <div class="hcd-card">
                    <h4 class="hcd-card-title"><i class="fas fa-sitemap"></i> Departamentos con Mayor Overtime</h4>
                    ${this.renderTopItems(this.data.executiveDashboard?.hoursSummary?.topOvertimeDepartments || [], 'overtime')}
                </div>
            </div>

            ${alerts.length > 0 ? `
                <h3 class="hcd-section-title" style="margin-top: 25px;">
                    <i class="fas fa-exclamation-triangle"></i> Alertas del Sistema
                </h3>
                ${alerts.map(alert => `
                    <div class="hcd-alert ${alert.type}">
                        <i class="fas ${alert.type === 'critical' ? 'fa-times-circle' : alert.type === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                        <div>
                            <strong>${this.translateCategory(alert.category)}</strong>: ${alert.message}
                        </div>
                    </div>
                `).join('')}
            ` : `
                <div class="hcd-alert success" style="margin-top: 25px;">
                    <i class="fas fa-check-circle"></i>
                    <span>No hay alertas activas. Los indicadores están dentro de los parámetros normales.</span>
                </div>
            `}
        `;
    }

    renderDonutSegments(segments) {
        let currentAngle = -90;
        const radius = 40;
        const cx = 50;
        const cy = 50;

        return segments.map(segment => {
            if (segment.value <= 0) return '';

            const angle = (segment.value / 100) * 360;
            const largeArc = angle > 180 ? 1 : 0;

            const startX = cx + radius * Math.cos(currentAngle * Math.PI / 180);
            const startY = cy + radius * Math.sin(currentAngle * Math.PI / 180);

            currentAngle += angle;

            const endX = cx + radius * Math.cos(currentAngle * Math.PI / 180);
            const endY = cy + radius * Math.sin(currentAngle * Math.PI / 180);

            return `<path d="M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z" fill="${segment.color}" />`;
        }).join('');
    }

    translateCategory(category) {
        const translations = {
            'overtime': 'Horas Extras',
            'department_overtime': 'Overtime Departamental',
            'shift_concentration': 'Concentración de Turnos',
            'coverage': 'Cobertura',
            'costs': 'Costos'
        };
        return translations[category] || category;
    }

    renderTopItems(items, type) {
        if (!items || items.length === 0) {
            return '<p style="color: #a0aec0; text-align: center; padding: 20px;">Sin datos disponibles para el período seleccionado</p>';
        }

        return items.map(item => {
            const value = type === 'overtime' ? item.totalOvertime : item.totalHours;
            const percentage = type === 'overtime' ? item.overtimeRatio : item.percentOfTotal;
            const color = type === 'overtime'
                ? (percentage > 30 ? '#fc8181' : percentage > 20 ? '#ecc94b' : '#48bb78')
                : '#667eea';

            return `
                <div class="hcd-list-item">
                    <div class="hcd-list-item-name">${item.name}</div>
                    <div class="hcd-list-item-stats">
                        <span>${this.formatNumber(value)} horas</span>
                        <span>${this.formatNumber(percentage)}%</span>
                    </div>
                    <div class="hcd-progress-bar">
                        <div class="hcd-progress-fill" style="width: ${Math.min(100, percentage)}%; background: ${color};"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderCuboTab() {
        const container = document.getElementById('tab-cubo');
        const cube = this.data.cube?.cube || {};

        container.innerHTML = `
            <h3 class="hcd-section-title">
                <i class="fas fa-cube"></i> Cubo Multidimensional de Horas
            </h3>
            <p style="color: #718096; margin-bottom: 20px;">
                Haga clic en cualquier elemento para ver el desglose detallado (drill-down)
            </p>

            <div id="hcd-drill-breadcrumb" class="hcd-breadcrumb" style="display: none;"></div>

            <div class="hcd-grid" id="hcd-cube-content">
                ${this.renderCubeDimension('Sucursales', cube.byBranch || {}, 'branch', 'fa-building')}
                ${this.renderCubeDimension('Departamentos', cube.byDepartment || {}, 'department', 'fa-sitemap')}
                ${this.renderCubeDimension('Tipos de Turno', cube.byShiftType || {}, 'shiftType', 'fa-clock')}
            </div>
        `;
    }

    renderCubeDimension(title, data, dimension, icon) {
        const items = Object.entries(data);

        if (items.length === 0) {
            return `
                <div class="hcd-card">
                    <h4 class="hcd-card-title"><i class="fas ${icon}"></i> ${title}</h4>
                    <p style="color: #a0aec0; text-align: center;">Sin datos</p>
                </div>
            `;
        }

        return `
            <div class="hcd-card">
                <h4 class="hcd-card-title"><i class="fas ${icon}"></i> ${title}</h4>
                ${items.slice(0, 5).map(([id, item]) => {
                    const total = item.totalHours || 0;
                    const overtimePct = total > 0 ? (((item.overtime50 || 0) + (item.overtime100 || 0)) / total) * 100 : 0;

                    return `
                        <div class="hcd-list-item" onclick="hoursCubeDashboard.drillDown('${dimension}', '${id}')">
                            <div class="hcd-list-item-name">${item.name}</div>
                            <div class="hcd-list-item-stats">
                                <span>Total: ${this.formatNumber(total)} hrs</span>
                                <span>OT: ${this.formatNumber(overtimePct)}%</span>
                            </div>
                            <div class="hcd-progress-bar">
                                <div class="hcd-progress-fill" style="width: ${100 - overtimePct}%; background: linear-gradient(90deg, #48bb78, #ecc94b);"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    async drillDown(dimension, id) {
        try {
            const startDate = document.getElementById('hcd-start-date')?.value;
            const endDate = document.getElementById('hcd-end-date')?.value;
            const params = `?startDate=${startDate}&endDate=${endDate}`;

            const response = await fetch(
                `${this.options.apiBase}/${this.options.companyId}/drill-down/${dimension}/${id}${params}`,
                { headers: { 'Authorization': `Bearer ${this.getAuthToken()}` } }
            );

            if (!response.ok) throw new Error('Error en drill-down');
            const result = await response.json();

            if (result.success) {
                this.showDrillDownResults(result);
            }
        } catch (error) {
            console.error('Error en drill-down:', error);
        }
    }

    showDrillDownResults(result) {
        const breadcrumb = document.getElementById('hcd-drill-breadcrumb');
        breadcrumb.style.display = 'flex';
        breadcrumb.innerHTML = `
            <a href="#" onclick="hoursCubeDashboard.resetDrillDown(); return false;">
                <i class="fas fa-home"></i> Inicio
            </a>
            <span>/</span>
            <span>${this.translateDimension(result.dimension)}: ${result.data?.name || result.dimensionId}</span>
        `;

        const content = document.getElementById('hcd-cube-content');
        const data = result.data;

        content.innerHTML = `
            <div class="hcd-card" style="grid-column: 1 / -1;">
                <h4 class="hcd-card-title"><i class="fas fa-info-circle"></i> Detalle: ${data.name}</h4>

                <div class="hcd-metrics-grid">
                    <div class="hcd-metric-card">
                        <div class="hcd-metric-title">Horas Normales</div>
                        <div class="hcd-metric-value" style="color: #48bb78;">${this.formatNumber(data.normalHours || 0)}</div>
                    </div>
                    <div class="hcd-metric-card">
                        <div class="hcd-metric-title">Extras 50%</div>
                        <div class="hcd-metric-value" style="color: #ecc94b;">${this.formatNumber(data.overtime50 || 0)}</div>
                    </div>
                    <div class="hcd-metric-card">
                        <div class="hcd-metric-title">Extras 100%</div>
                        <div class="hcd-metric-value" style="color: #fc8181;">${this.formatNumber(data.overtime100 || 0)}</div>
                    </div>
                    <div class="hcd-metric-card">
                        <div class="hcd-metric-title">Total</div>
                        <div class="hcd-metric-value">${this.formatNumber(data.totalHours || 0)}</div>
                    </div>
                </div>

                ${data.percentOfTotal ? `
                    <h4 style="margin-top: 20px;">Participación sobre el Total de la Empresa</h4>
                    <div class="hcd-efficiency-meter">
                        <div class="hcd-efficiency-bar">
                            <div class="hcd-efficiency-fill" style="width: ${data.percentOfTotal.totalHours}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                        </div>
                        <div class="hcd-efficiency-label">${this.formatNumber(data.percentOfTotal.totalHours)}%</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    translateDimension(dimension) {
        const translations = {
            'branch': 'Sucursal',
            'department': 'Departamento',
            'shiftType': 'Tipo de Turno'
        };
        return translations[dimension] || dimension;
    }

    resetDrillDown() {
        document.getElementById('hcd-drill-breadcrumb').style.display = 'none';
        this.renderCuboTab();
    }

    renderReposicionTab() {
        const container = document.getElementById('tab-reposicion');
        const replacement = this.data.executiveDashboard?.replacementAnalysis || {};
        const summary = replacement.summary || {};
        const efficiency = replacement.efficiencyMetrics || {};

        container.innerHTML = `
            <h3 class="hcd-section-title">
                <i class="fas fa-exchange-alt"></i> Análisis de Costos de Reposición
            </h3>
            <p style="color: #718096; margin-bottom: 20px;">
                Horas extras utilizadas para cubrir ausencias por enfermedad, licencias o vacaciones
            </p>

            <div class="hcd-metrics-grid">
                <div class="hcd-metric-card">
                    <div class="hcd-metric-title">Horas de Ausencia</div>
                    <div class="hcd-metric-value">${this.formatNumber(summary.totalAbsenceHours || 0)}</div>
                </div>
                <div class="hcd-metric-card">
                    <div class="hcd-metric-title">Overtime de Reposición</div>
                    <div class="hcd-metric-value" style="color: #ecc94b;">${this.formatNumber(summary.totalReplacementOvertimeHours || 0)}</div>
                </div>
                <div class="hcd-metric-card">
                    <div class="hcd-metric-title">Ratio de Reposición</div>
                    <div class="hcd-metric-value">${this.formatNumber((summary.replacementRatio || 0) * 100)}%</div>
                </div>
                <div class="hcd-metric-card">
                    <div class="hcd-metric-title">Costo Adicional</div>
                    <div class="hcd-metric-value" style="color: #fc8181;">+${this.formatNumber(summary.costImpact?.costIncreasePercentage || 0)}%</div>
                </div>
            </div>

            <h4 class="hcd-section-title"><i class="fas fa-chart-line"></i> Indicadores de Eficiencia</h4>

            ${efficiency.coverageRatio ? `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 500;">Ratio de Cobertura</span>
                        <span style="color: #718096; font-size: 0.9em;">${efficiency.coverageRatio.interpretation}</span>
                    </div>
                    <div class="hcd-efficiency-meter">
                        <div class="hcd-efficiency-bar">
                            <div class="hcd-efficiency-fill" style="width: ${efficiency.coverageRatio.percentage}%; background: ${this.getEfficiencyColor(efficiency.coverageRatio.percentage)};"></div>
                        </div>
                        <div class="hcd-efficiency-label">${this.formatNumber(efficiency.coverageRatio.percentage)}%</div>
                    </div>
                </div>
            ` : ''}

            ${efficiency.costEfficiency ? `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 500;">Eficiencia de Costos</span>
                        <span style="color: #718096; font-size: 0.9em;">${efficiency.costEfficiency.interpretation}</span>
                    </div>
                    <div class="hcd-efficiency-meter">
                        <div class="hcd-efficiency-bar">
                            <div class="hcd-efficiency-fill" style="width: ${Math.min(100, efficiency.costEfficiency.percentage)}%; background: ${this.getEfficiencyColor(efficiency.costEfficiency.percentage)};"></div>
                        </div>
                        <div class="hcd-efficiency-label">${this.formatNumber(efficiency.costEfficiency.percentage)}%</div>
                    </div>
                </div>
            ` : ''}

            ${efficiency.healthScore ? `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: 500;">Índice de Salud General</span>
                        <span style="color: #718096; font-size: 0.9em;">Calificación: ${efficiency.healthScore.grade}</span>
                    </div>
                    <div class="hcd-efficiency-meter">
                        <div class="hcd-efficiency-bar">
                            <div class="hcd-efficiency-fill" style="width: ${efficiency.healthScore.value}%; background: ${this.getEfficiencyColor(efficiency.healthScore.value)};"></div>
                        </div>
                        <div class="hcd-efficiency-label">${efficiency.healthScore.value}</div>
                    </div>
                    <p style="color: #718096; font-size: 0.9em; margin-top: 8px;">${efficiency.healthScore.interpretation}</p>
                </div>
            ` : ''}

            ${efficiency.recommendations && efficiency.recommendations.length > 0 ? `
                <h4 class="hcd-section-title" style="margin-top: 25px;"><i class="fas fa-lightbulb"></i> Recomendaciones</h4>
                ${efficiency.recommendations.map(rec => `
                    <div class="hcd-alert ${rec.priority === 'HIGH' ? 'warning' : 'info'}">
                        <i class="fas ${rec.priority === 'HIGH' ? 'fa-exclamation-triangle' : 'fa-lightbulb'}"></i>
                        <div>
                            <strong>${rec.area}</strong>: ${rec.recommendation}
                            <div style="font-size: 0.9em; color: #718096; margin-top: 5px;">
                                Impacto esperado: ${rec.expectedImpact}
                            </div>
                        </div>
                    </div>
                `).join('')}
            ` : ''}
        `;
    }

    getEfficiencyColor(value) {
        if (value >= 80) return 'linear-gradient(90deg, #48bb78, #38a169)';
        if (value >= 60) return 'linear-gradient(90deg, #ecc94b, #d69e2e)';
        return 'linear-gradient(90deg, #fc8181, #e53e3e)';
    }

    renderVacacionesTab() {
        const container = document.getElementById('tab-vacaciones');
        const vacation = this.data.executiveDashboard?.vacationOptimization || {};
        const summary = vacation.summary || {};
        const suggestions = vacation.topSuggestions || [];
        const impact = vacation.projectedImpact || {};

        container.innerHTML = `
            <h3 class="hcd-section-title">
                <i class="fas fa-umbrella-beach"></i> Optimizador de Vacaciones
            </h3>
            <p style="color: #718096; margin-bottom: 20px;">
                Sugerencias de cronograma que minimizan costos de horas extras
                <br><small>(Basado en análisis de compatibilidad de tareas y costos históricos de reposición)</small>
            </p>

            <div class="hcd-metrics-grid">
                <div class="hcd-metric-card">
                    <div class="hcd-metric-title">Empleados Analizados</div>
                    <div class="hcd-metric-value">${summary.employeesAnalyzed || 0}</div>
                </div>
                <div class="hcd-metric-card">
                    <div class="hcd-metric-title">Días de Vacaciones</div>
                    <div class="hcd-metric-value">${summary.totalVacationDays || 0}</div>
                </div>
                <div class="hcd-metric-card">
                    <div class="hcd-metric-title">Ahorro Estimado</div>
                    <div class="hcd-metric-value" style="color: #48bb78;">$${this.formatNumber(summary.estimatedCostSavings || 0)}</div>
                </div>
            </div>

            ${suggestions.length > 0 ? `
                <h4 class="hcd-section-title"><i class="fas fa-calendar-check"></i> Sugerencias de Cronograma</h4>
                ${suggestions.map(sug => `
                    <div class="hcd-vacation-item">
                        <div class="hcd-vacation-employee">
                            <strong>${sug.employeeName}</strong>
                            <div style="font-size: 0.9em; color: #718096;">
                                ${sug.departmentName || 'Sin departamento asignado'}
                            </div>
                        </div>
                        <div class="hcd-vacation-period">
                            <div>${this.formatDate(sug.period?.startDate)} - ${this.formatDate(sug.period?.endDate)}</div>
                            <div style="font-size: 0.9em;">${sug.period?.days || 7} días</div>
                        </div>
                        <div class="hcd-score-badge">
                            Puntuación: ${this.formatNumber(sug.score || 0)}
                        </div>
                    </div>
                `).join('')}
            ` : `
                <div class="hcd-alert info">
                    <i class="fas fa-info-circle"></i>
                    <span>No hay sugerencias de vacaciones disponibles. Verifique que existan empleados con días de vacaciones pendientes en el sistema.</span>
                </div>
            `}

            ${impact.projectedOvertimeHours ? `
                <h4 class="hcd-section-title" style="margin-top: 25px;"><i class="fas fa-chart-bar"></i> Impacto Proyectado</h4>
                <div class="hcd-metrics-grid">
                    <div class="hcd-metric-card">
                        <div class="hcd-metric-title">Horas Extras Proyectadas</div>
                        <div class="hcd-metric-value">${this.formatNumber(impact.projectedOvertimeHours)}</div>
                    </div>
                    <div class="hcd-metric-card">
                        <div class="hcd-metric-title">Costo Proyectado</div>
                        <div class="hcd-metric-value">$${this.formatNumber(impact.projectedCost)}</div>
                    </div>
                    <div class="hcd-metric-card">
                        <div class="hcd-metric-title">Ahorro vs Distribución Aleatoria</div>
                        <div class="hcd-metric-value" style="color: #48bb78;">${impact.savingsPercentage || 0}%</div>
                    </div>
                </div>
            ` : ''}
        `;
    }

    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString(this.options.locale, {
            maximumFractionDigits: 2
        });
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString(this.options.locale, {
            day: '2-digit',
            month: 'short'
        });
    }
}

// Exportar globalmente
window.HoursCubeDashboard = HoursCubeDashboard;

/**
 * Función global para inicializar el dashboard desde el sistema dinámico de módulos
 * Llamada por panel-empresa.html cuando se selecciona el módulo
 */
function showHoursCubeDashboardContent() {
    console.log('🎯 [HOURS-CUBE] showHoursCubeDashboardContent ejecutado');

    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('❌ [HOURS-CUBE] No se encontró mainContent');
        return;
    }

    // Crear contenedor para el dashboard
    mainContent.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div id="hours-cube-dashboard-container" style="width: 100%;"></div>
        </div>
    `;

    // Inicializar el dashboard
    try {
        window.hoursCubeDashboard = new HoursCubeDashboard('hours-cube-dashboard-container');
        console.log('✅ [HOURS-CUBE] Dashboard inicializado correctamente');
    } catch (error) {
        console.error('❌ [HOURS-CUBE] Error inicializando dashboard:', error);
        mainContent.innerHTML = `
            <div class="module-container" style="padding: 20px;">
                <div class="alert alert-danger">
                    <h4><i class="fas fa-exclamation-triangle"></i> Error al cargar el Panel de Horas</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="showHoursCubeDashboardContent()">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            </div>
        `;
    }
}

// Exportar función global
window.showHoursCubeDashboardContent = showHoursCubeDashboardContent;

// Registrar en window.Modules para el sistema dinámico
window.Modules = window.Modules || {};
window.Modules['hours-cube-dashboard'] = {
    init: showHoursCubeDashboardContent
};

// Auto-inicializar si existe el contenedor (fallback)
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('hours-cube-dashboard-container');
    if (container) {
        window.hoursCubeDashboard = new HoursCubeDashboard('hours-cube-dashboard-container');
    }
});
