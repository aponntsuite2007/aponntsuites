/**
 * Predictive Workforce Dashboard - UI Module
 * Sistema de Analytics Predictivo con metodología científica visible
 *
 * Metodologías implementadas:
 * - IRA (Índice de Riesgo de Asistencia): Σ(βᵢ × Xᵢ)
 * - Análisis de Sensibilidad: ∂IRA/∂Xᵢ (derivadas parciales)
 * - Normalización Z-Score: Z = (x - μ) / σ
 * - Regresión Lineal: y = mx + b
 * - Media Acotada: Trimmed Mean (descarta outliers)
 *
 * @version 2.0.0
 * @date 2025-01
 */

window.PredictiveWorkforceDashboard = (function() {
    'use strict';

    // ========================================
    // CONFIGURACIÓN
    // ========================================
    const API_BASE = '/api/predictive-workforce';

    // CSS para badges de metodología científica
    const METHODOLOGY_STYLES = `
        <style>
            .methodology-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 12px;
                font-size: 10px;
                font-family: 'Fira Code', 'Monaco', monospace;
                color: #8b5cf6;
                white-space: nowrap;
            }
            .methodology-badge .formula {
                font-style: italic;
                opacity: 0.9;
            }
            .methodology-badge .icon {
                font-size: 11px;
            }

            .methodology-tooltip {
                position: relative;
                cursor: help;
            }
            .methodology-tooltip:hover::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                padding: 8px 12px;
                background: rgba(30, 41, 59, 0.95);
                color: white;
                font-size: 11px;
                border-radius: 6px;
                white-space: nowrap;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }

            .predictive-card {
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                margin-bottom: 24px;
                border: 1px solid rgba(0,0,0,0.05);
            }

            .predictive-card-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
            }

            .predictive-card-title {
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 4px 0;
            }

            .predictive-card-subtitle {
                font-size: 12px;
                color: #64748b;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ira-gauge {
                width: 200px;
                height: 200px;
                position: relative;
            }

            .ira-value {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
            }

            .ira-value .number {
                font-size: 48px;
                font-weight: 700;
                color: #1e293b;
            }

            .ira-value .label {
                font-size: 14px;
                color: #64748b;
            }

            .risk-level {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
            }

            .risk-level.low {
                background: rgba(34, 197, 94, 0.1);
                color: #16a34a;
            }

            .risk-level.medium {
                background: rgba(234, 179, 8, 0.1);
                color: #ca8a04;
            }

            .risk-level.high {
                background: rgba(239, 68, 68, 0.1);
                color: #dc2626;
            }

            .factor-bar {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }

            .factor-label {
                min-width: 140px;
                font-size: 13px;
                color: #475569;
            }

            .factor-bar-container {
                flex: 1;
                height: 8px;
                background: #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
            }

            .factor-bar-fill {
                height: 100%;
                border-radius: 4px;
                transition: width 0.5s ease;
            }

            .factor-weight {
                min-width: 50px;
                text-align: right;
                font-size: 12px;
                font-family: 'Fira Code', monospace;
                color: #64748b;
            }

            .sensitivity-chart {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
            }

            .sensitivity-item {
                background: #f8fafc;
                border-radius: 12px;
                padding: 16px;
                text-align: center;
            }

            .sensitivity-value {
                font-size: 32px;
                font-weight: 600;
            }

            .sensitivity-value.positive {
                color: #dc2626;
            }

            .sensitivity-value.negative {
                color: #16a34a;
            }

            .sensitivity-label {
                font-size: 13px;
                color: #64748b;
                margin-top: 4px;
            }

            .comparison-table {
                width: 100%;
                border-collapse: collapse;
            }

            .comparison-table th,
            .comparison-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
            }

            .comparison-table th {
                background: #f8fafc;
                font-weight: 600;
                font-size: 12px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .z-score-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-family: 'Fira Code', monospace;
            }

            .z-score-badge.excellent {
                background: rgba(34, 197, 94, 0.15);
                color: #16a34a;
            }

            .z-score-badge.good {
                background: rgba(59, 130, 246, 0.15);
                color: #2563eb;
            }

            .z-score-badge.average {
                background: rgba(234, 179, 8, 0.15);
                color: #ca8a04;
            }

            .z-score-badge.poor {
                background: rgba(239, 68, 68, 0.15);
                color: #dc2626;
            }

            .drill-down-breadcrumb {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                background: #f8fafc;
                border-radius: 8px;
                margin-bottom: 16px;
                font-size: 13px;
            }

            .drill-down-breadcrumb .crumb {
                color: #3b82f6;
                cursor: pointer;
            }

            .drill-down-breadcrumb .crumb:hover {
                text-decoration: underline;
            }

            .drill-down-breadcrumb .separator {
                color: #94a3b8;
            }

            .drill-down-breadcrumb .current {
                color: #1e293b;
                font-weight: 500;
            }

            .forecast-summary {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                margin-bottom: 24px;
            }

            .forecast-metric {
                background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
            }

            .forecast-metric .value {
                font-size: 28px;
                font-weight: 700;
                color: #1e293b;
            }

            .forecast-metric .label {
                font-size: 12px;
                color: #64748b;
                margin-top: 4px;
            }

            .tab-navigation {
                display: flex;
                gap: 4px;
                background: #f1f5f9;
                padding: 4px;
                border-radius: 12px;
                margin-bottom: 24px;
            }

            .tab-button {
                flex: 1;
                padding: 12px 16px;
                border: none;
                background: transparent;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                color: #64748b;
                cursor: pointer;
                transition: all 0.2s;
            }

            .tab-button:hover {
                color: #1e293b;
            }

            .tab-button.active {
                background: white;
                color: #3b82f6;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .tab-content {
                display: none;
            }

            .tab-content.active {
                display: block;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .loading-skeleton {
                background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
                background-size: 200% 100%;
                animation: skeleton 1.5s infinite;
                border-radius: 8px;
            }

            @keyframes skeleton {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        </style>
    `;

    // Datos en memoria
    let currentCompanyId = null;
    let currentTab = 'ira';
    let drillDownState = {
        metric: 'attendance',
        level: 'company',
        path: [],
        breadcrumb: []
    };

    // ========================================
    // BADGES DE METODOLOGÍA
    // ========================================
    const methodologyBadges = {
        ira: {
            icon: '∑',
            formula: 'Σ(βᵢ × Xᵢ)',
            tooltip: 'Suma ponderada de factores de riesgo con coeficientes beta'
        },
        sensitivity: {
            icon: '∂',
            formula: '∂IRA/∂Xᵢ',
            tooltip: 'Derivada parcial: impacto de cada variable en el índice'
        },
        zscore: {
            icon: 'σ',
            formula: 'Z=(x-μ)/σ',
            tooltip: 'Z-Score: desviaciones estándar respecto a la media'
        },
        regression: {
            icon: '📈',
            formula: 'y=mx+b',
            tooltip: 'Regresión lineal para proyecciones temporales'
        },
        trimmedMean: {
            icon: 'x̄',
            formula: 'x̄ₜ (p=0.1)',
            tooltip: 'Media acotada: descarta 10% de valores extremos'
        },
        confidence: {
            icon: 'CI',
            formula: '95% CI',
            tooltip: 'Intervalo de confianza al 95%'
        }
    };

    function renderMethodologyBadge(type, showTooltip = true) {
        const badge = methodologyBadges[type];
        if (!badge) return '';

        const tooltipAttr = showTooltip ? `data-tooltip="${badge.tooltip}"` : '';

        return `
            <span class="methodology-badge methodology-tooltip" ${tooltipAttr}>
                <span class="icon">${badge.icon}</span>
                <span class="formula">${badge.formula}</span>
            </span>
        `;
    }

    // ========================================
    // RENDER PRINCIPAL
    // ========================================
    function render(containerId, companyId) {
        currentCompanyId = companyId;
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = METHODOLOGY_STYLES + `
            <div class="predictive-workforce-container">
                <!-- Header con metodología visible -->
                <div class="predictive-card">
                    <div class="predictive-card-header">
                        <div>
                            <h2 class="predictive-card-title">🔮 Analytics Predictivo de Workforce</h2>
                            <div class="predictive-card-subtitle">
                                Análisis científico basado en
                                ${renderMethodologyBadge('ira')}
                                ${renderMethodologyBadge('sensitivity')}
                                ${renderMethodologyBadge('zscore')}
                                ${renderMethodologyBadge('regression')}
                            </div>
                        </div>
                        <button onclick="PredictiveWorkforceDashboard.refreshAll()" class="btn btn-outline-primary btn-sm">
                            🔄 Actualizar
                        </button>
                    </div>

                    <!-- Navegación por tabs -->
                    <div class="tab-navigation">
                        <button class="tab-button active" data-tab="ira" onclick="PredictiveWorkforceDashboard.switchTab('ira')">
                            📊 IRA
                        </button>
                        <button class="tab-button" data-tab="sensitivity" onclick="PredictiveWorkforceDashboard.switchTab('sensitivity')">
                            🔬 Sensibilidad
                        </button>
                        <button class="tab-button" data-tab="compare" onclick="PredictiveWorkforceDashboard.switchTab('compare')">
                            ⚖️ Comparativa
                        </button>
                        <button class="tab-button" data-tab="forecast" onclick="PredictiveWorkforceDashboard.switchTab('forecast')">
                            💰 Presupuesto
                        </button>
                        <button class="tab-button" data-tab="drilldown" onclick="PredictiveWorkforceDashboard.switchTab('drilldown')">
                            🔍 Drill-Down
                        </button>
                    </div>
                </div>

                <!-- Contenido de tabs -->
                <div id="tab-content-ira" class="tab-content active"></div>
                <div id="tab-content-sensitivity" class="tab-content"></div>
                <div id="tab-content-compare" class="tab-content"></div>
                <div id="tab-content-forecast" class="tab-content"></div>
                <div id="tab-content-drilldown" class="tab-content"></div>
            </div>
        `;

        // Cargar datos iniciales
        loadIRAData();
    }

    function switchTab(tabName) {
        currentTab = tabName;

        // Actualizar botones
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Actualizar contenido
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-content-${tabName}`);
        });

        // Cargar datos del tab
        switch(tabName) {
            case 'ira': loadIRAData(); break;
            case 'sensitivity': loadSensitivityData(); break;
            case 'compare': loadCompareData(); break;
            case 'forecast': loadForecastData(); break;
            case 'drilldown': loadDrillDownData(); break;
        }
    }

    // ========================================
    // TAB: IRA (Índice de Riesgo de Asistencia)
    // ========================================
    async function loadIRAData() {
        const container = document.getElementById('tab-content-ira');
        container.innerHTML = renderLoading();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${currentCompanyId}/ira`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando IRA');

            const result = await response.json();
            const data = result.data || result;

            container.innerHTML = renderIRAContent(data);
        } catch (error) {
            container.innerHTML = renderError(error.message);
        }
    }

    function renderIRAContent(data) {
        const ira = data.ira || {};
        const factors = data.factors || {};
        const riskLevel = getRiskLevel(ira.value);

        // Colores para factores
        const factorColors = {
            climate: '#3b82f6',
            dayOfWeek: '#8b5cf6',
            weekendProximity: '#ec4899',
            holidayProximity: '#f97316',
            seasonality: '#14b8a6',
            workType: '#eab308',
            employeeHistory: '#6366f1'
        };

        return `
            <div class="row">
                <div class="col-md-4">
                    <div class="predictive-card">
                        <div class="predictive-card-header">
                            <div>
                                <h3 class="predictive-card-title">Índice de Riesgo</h3>
                                <div class="predictive-card-subtitle">
                                    ${renderMethodologyBadge('ira')}
                                </div>
                            </div>
                        </div>

                        <div class="text-center">
                            <div class="ira-gauge">
                                ${renderGauge(ira.value || 0)}
                                <div class="ira-value">
                                    <div class="number">${(ira.value || 0).toFixed(1)}</div>
                                    <div class="label">de 100</div>
                                </div>
                            </div>

                            <div class="risk-level ${riskLevel.class}" style="margin-top: 16px;">
                                ${riskLevel.icon} ${riskLevel.label}
                            </div>

                            <div style="margin-top: 16px; font-size: 12px; color: #64748b;">
                                Interpretación: ${ira.interpretation || 'Calculando...'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-8">
                    <div class="predictive-card">
                        <div class="predictive-card-header">
                            <div>
                                <h3 class="predictive-card-title">Factores Contribuyentes</h3>
                                <div class="predictive-card-subtitle">
                                    Peso relativo: ${renderMethodologyBadge('trimmedMean')}
                                </div>
                            </div>
                        </div>

                        ${Object.entries(factors).map(([key, factor]) => `
                            <div class="factor-bar">
                                <div class="factor-label">${getFactorLabel(key)}</div>
                                <div class="factor-bar-container">
                                    <div class="factor-bar-fill" style="
                                        width: ${(factor.contribution || 0) * 10}%;
                                        background: ${factorColors[key] || '#64748b'}
                                    "></div>
                                </div>
                                <div class="factor-weight">
                                    β=${(factor.weight || 0).toFixed(2)}
                                </div>
                            </div>
                        `).join('')}

                        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                            <small style="color: #64748b;">
                                📐 <strong>Fórmula aplicada:</strong> IRA = ${Object.entries(factors).map(([k, f]) =>
                                    `(${(f.weight || 0).toFixed(2)} × ${(f.value || 0).toFixed(1)})`
                                ).join(' + ')}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========================================
    // TAB: ANÁLISIS DE SENSIBILIDAD
    // ========================================
    async function loadSensitivityData() {
        const container = document.getElementById('tab-content-sensitivity');
        container.innerHTML = renderLoading();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${currentCompanyId}/sensitivity`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando sensibilidad');

            const result = await response.json();
            const data = result.data || result;

            container.innerHTML = renderSensitivityContent(data);
        } catch (error) {
            container.innerHTML = renderError(error.message);
        }
    }

    function renderSensitivityContent(data) {
        const analysis = data.analysis || {};
        const variables = analysis.variables || [];

        return `
            <div class="predictive-card">
                <div class="predictive-card-header">
                    <div>
                        <h3 class="predictive-card-title">Análisis de Sensibilidad</h3>
                        <div class="predictive-card-subtitle">
                            Impacto marginal por variable ${renderMethodologyBadge('sensitivity')}
                        </div>
                    </div>
                </div>

                <p style="color: #64748b; margin-bottom: 24px;">
                    Este análisis muestra cómo un cambio de <strong>+1 unidad</strong> en cada variable
                    afecta el IRA. Valores positivos aumentan el riesgo, negativos lo disminuyen.
                </p>

                <div class="sensitivity-chart">
                    ${variables.map(v => `
                        <div class="sensitivity-item">
                            <div class="sensitivity-value ${v.impact > 0 ? 'positive' : 'negative'}">
                                ${v.impact > 0 ? '+' : ''}${(v.impact || 0).toFixed(2)}
                            </div>
                            <div class="sensitivity-label">${getFactorLabel(v.variable)}</div>
                            <div style="margin-top: 8px;">
                                <span class="methodology-badge" style="font-size: 9px;">
                                    ∂IRA/∂${v.variable.substring(0, 4)} = ${(v.partialDerivative || 0).toFixed(3)}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                ${data.recommendations ? `
                    <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                        <strong style="color: #16a34a;">💡 Recomendaciones basadas en sensibilidad:</strong>
                        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #166534;">
                            ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ========================================
    // TAB: COMPARATIVA Z-SCORE
    // ========================================
    async function loadCompareData() {
        const container = document.getElementById('tab-content-compare');
        container.innerHTML = renderLoading();

        try {
            const token = localStorage.getItem('token');

            // Cargar comparación por departamentos
            const response = await fetch(`${API_BASE}/${currentCompanyId}/compare/departments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando comparativa');

            const result = await response.json();
            const data = result.data || result;

            container.innerHTML = renderCompareContent(data);
        } catch (error) {
            container.innerHTML = renderError(error.message);
        }
    }

    function renderCompareContent(data) {
        const units = data.units || [];
        const stats = data.statistics || {};

        return `
            <div class="predictive-card">
                <div class="predictive-card-header">
                    <div>
                        <h3 class="predictive-card-title">Comparativa por Departamentos</h3>
                        <div class="predictive-card-subtitle">
                            Normalización estadística ${renderMethodologyBadge('zscore')} ${renderMethodologyBadge('trimmedMean')}
                        </div>
                    </div>
                    <select class="form-select form-select-sm" style="width: auto;"
                            onchange="PredictiveWorkforceDashboard.changeCompareType(this.value)">
                        <option value="departments" selected>Por Departamento</option>
                        <option value="branches">Por Sucursal</option>
                        <option value="shifts">Por Turno</option>
                        <option value="sectors">Por Sector</option>
                    </select>
                </div>

                <div style="margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px;">
                    <div class="row text-center">
                        <div class="col">
                            <strong>${(stats.mean || 0).toFixed(1)}</strong>
                            <div style="font-size: 11px; color: #64748b;">Media (μ)</div>
                        </div>
                        <div class="col">
                            <strong>${(stats.stdDev || 0).toFixed(2)}</strong>
                            <div style="font-size: 11px; color: #64748b;">Desv. Std (σ)</div>
                        </div>
                        <div class="col">
                            <strong>${(stats.trimmedMean || 0).toFixed(1)}</strong>
                            <div style="font-size: 11px; color: #64748b;">Media Acotada</div>
                        </div>
                        <div class="col">
                            <strong>${units.length}</strong>
                            <div style="font-size: 11px; color: #64748b;">Unidades</div>
                        </div>
                    </div>
                </div>

                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Unidad</th>
                            <th>IRA</th>
                            <th>Z-Score</th>
                            <th>Ranking</th>
                            <th>Tendencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${units.map((unit, idx) => `
                            <tr>
                                <td>
                                    <strong>${unit.name}</strong>
                                    <div style="font-size: 11px; color: #64748b;">${unit.employeeCount || 0} empleados</div>
                                </td>
                                <td>
                                    <span style="font-size: 18px; font-weight: 600;">${(unit.ira || 0).toFixed(1)}</span>
                                </td>
                                <td>
                                    <span class="z-score-badge ${getZScoreClass(unit.zScore)}">
                                        ${unit.zScore > 0 ? '+' : ''}${(unit.zScore || 0).toFixed(2)}σ
                                    </span>
                                </td>
                                <td>
                                    <span style="font-weight: 500;">#${idx + 1}</span>
                                </td>
                                <td>
                                    ${renderTrend(unit.trend)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 16px; font-size: 11px; color: #64748b;">
                    <strong>Interpretación Z-Score:</strong>
                    Z < -1σ = Excelente | -1σ a 0 = Bueno | 0 a +1σ = Promedio | Z > +1σ = Requiere atención
                </div>
            </div>
        `;
    }

    async function changeCompareType(type) {
        const container = document.getElementById('tab-content-compare');
        container.innerHTML = renderLoading();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${currentCompanyId}/compare/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando comparativa');

            const result = await response.json();
            container.innerHTML = renderCompareContent(result.data || result);
        } catch (error) {
            container.innerHTML = renderError(error.message);
        }
    }

    // ========================================
    // TAB: PRESUPUESTO DE COBERTURA
    // ========================================
    async function loadForecastData() {
        const container = document.getElementById('tab-content-forecast');
        container.innerHTML = renderLoading();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${currentCompanyId}/forecast?days=30`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando forecast');

            const result = await response.json();
            const data = result.data || result;

            container.innerHTML = renderForecastContent(data);
        } catch (error) {
            container.innerHTML = renderError(error.message);
        }
    }

    function renderForecastContent(data) {
        const forecast = data.forecast || {};
        const daily = forecast.dailyProjections || [];

        return `
            <div class="predictive-card">
                <div class="predictive-card-header">
                    <div>
                        <h3 class="predictive-card-title">Presupuesto de Cobertura</h3>
                        <div class="predictive-card-subtitle">
                            Proyección basada en ${renderMethodologyBadge('regression')} ${renderMethodologyBadge('confidence')}
                        </div>
                    </div>
                    <select class="form-select form-select-sm" style="width: auto;"
                            onchange="PredictiveWorkforceDashboard.changeForecastPeriod(this.value)">
                        <option value="7">Próximos 7 días</option>
                        <option value="30" selected>Próximos 30 días</option>
                        <option value="90">Próximos 90 días</option>
                    </select>
                </div>

                <div class="forecast-summary">
                    <div class="forecast-metric">
                        <div class="value">${formatCurrency(forecast.totalCost || 0)}</div>
                        <div class="label">Costo Total Proyectado</div>
                    </div>
                    <div class="forecast-metric">
                        <div class="value">${forecast.totalHours || 0}h</div>
                        <div class="label">Horas de Cobertura</div>
                    </div>
                    <div class="forecast-metric">
                        <div class="value">${forecast.expectedAbsences || 0}</div>
                        <div class="label">Ausencias Esperadas</div>
                    </div>
                    <div class="forecast-metric">
                        <div class="value">${(forecast.confidence || 0).toFixed(0)}%</div>
                        <div class="label">Intervalo de Confianza</div>
                    </div>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h5 style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
                        📅 Proyección Diaria (Top 10 días de mayor riesgo)
                    </h5>
                    <div class="table-responsive">
                        <table class="comparison-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>IRA Proyectado</th>
                                    <th>Ausencias Est.</th>
                                    <th>Horas Cobertura</th>
                                    <th>Costo Est.</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${daily.slice(0, 10).map(day => `
                                    <tr>
                                        <td>
                                            <strong>${formatDate(day.date)}</strong>
                                            <div style="font-size: 10px; color: #64748b;">${day.dayName || ''}</div>
                                        </td>
                                        <td>
                                            <span class="risk-level ${getRiskLevel(day.ira).class}" style="font-size: 11px;">
                                                ${(day.ira || 0).toFixed(1)}
                                            </span>
                                        </td>
                                        <td>${day.expectedAbsences || 0}</td>
                                        <td>${day.coverageHours || 0}h</td>
                                        <td>${formatCurrency(day.estimatedCost || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="padding: 12px; background: #fefce8; border-radius: 8px; border-left: 4px solid #eab308;">
                    <small style="color: #854d0e;">
                        📊 <strong>Metodología:</strong> Proyección basada en regresión lineal (y = mx + b) con datos históricos de 90 días.
                        Intervalo de confianza al 95% calculado con distribución t-Student.
                        Los costos incluyen multiplicadores por tipo de hora (extra, feriado, nocturno).
                    </small>
                </div>
            </div>
        `;
    }

    async function changeForecastPeriod(days) {
        const container = document.getElementById('tab-content-forecast');
        container.innerHTML = renderLoading();

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${currentCompanyId}/forecast?days=${days}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando forecast');

            const result = await response.json();
            container.innerHTML = renderForecastContent(result.data || result);
        } catch (error) {
            container.innerHTML = renderError(error.message);
        }
    }

    // ========================================
    // TAB: DRILL-DOWN SSOT
    // ========================================
    async function loadDrillDownData() {
        const container = document.getElementById('tab-content-drilldown');
        container.innerHTML = renderLoading();

        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                level: drillDownState.level,
                ...(drillDownState.path.length > 0 && { path: drillDownState.path.join(',') })
            });

            const response = await fetch(
                `${API_BASE}/${currentCompanyId}/drill-down/${drillDownState.metric}?${params}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Error cargando drill-down');

            const result = await response.json();
            const data = result.data || result;

            drillDownState.breadcrumb = data.breadcrumb || [];
            container.innerHTML = renderDrillDownContent(data);
        } catch (error) {
            container.innerHTML = renderError(error.message);
        }
    }

    function renderDrillDownContent(data) {
        const items = data.data || [];
        const methodology = data.methodology || {};

        return `
            <div class="predictive-card">
                <div class="predictive-card-header">
                    <div>
                        <h3 class="predictive-card-title">🔍 Exploración SSOT</h3>
                        <div class="predictive-card-subtitle">
                            Single Source of Truth - Drill-down hasta el fichaje individual
                        </div>
                    </div>
                    <select class="form-select form-select-sm" style="width: auto;"
                            onchange="PredictiveWorkforceDashboard.changeMetric(this.value)">
                        <option value="attendance" ${drillDownState.metric === 'attendance' ? 'selected' : ''}>Asistencia</option>
                        <option value="health" ${drillDownState.metric === 'health' ? 'selected' : ''}>Salud Laboral</option>
                        <option value="overtime" ${drillDownState.metric === 'overtime' ? 'selected' : ''}>Horas Extra</option>
                        <option value="patterns" ${drillDownState.metric === 'patterns' ? 'selected' : ''}>Patrones</option>
                        <option value="climate" ${drillDownState.metric === 'climate' ? 'selected' : ''}>Impacto Clima</option>
                    </select>
                </div>

                <!-- Breadcrumb de navegación -->
                <div class="drill-down-breadcrumb">
                    <span class="crumb" onclick="PredictiveWorkforceDashboard.navigateTo('company', [])">🏢 Empresa</span>
                    ${drillDownState.breadcrumb.map((crumb, idx) => `
                        <span class="separator">›</span>
                        <span class="${idx === drillDownState.breadcrumb.length - 1 ? 'current' : 'crumb'}"
                              onclick="PredictiveWorkforceDashboard.navigateTo('${crumb.level}', ${JSON.stringify(crumb.path)})">
                            ${crumb.icon || ''} ${crumb.name}
                        </span>
                    `).join('')}
                </div>

                <!-- Nivel actual -->
                <div style="margin-bottom: 16px;">
                    <span style="font-size: 12px; color: #64748b;">
                        Nivel: <strong>${data.level}</strong>
                        ${data.canDrillDeeper ? `→ Siguiente: ${data.nextLevel}` : '(nivel más profundo)'}
                    </span>
                </div>

                <!-- Datos del nivel -->
                <div class="table-responsive">
                    <table class="comparison-table">
                        <thead>
                            <tr>
                                <th style="width: 40%;">Elemento</th>
                                <th>Métrica Principal</th>
                                <th>Detalle</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="font-size: 18px;">${item.icon || '📊'}</span>
                                            <div>
                                                <strong>${item.name}</strong>
                                                ${item.subtitle ? `<div style="font-size: 11px; color: #64748b;">${item.subtitle}</div>` : ''}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style="font-size: 20px; font-weight: 600; color: ${getMetricColor(item.value, item.type)}">
                                            ${formatMetricValue(item.value, item.type)}
                                        </span>
                                    </td>
                                    <td>
                                        <div style="font-size: 12px; color: #64748b;">
                                            ${item.details ? Object.entries(item.details).map(([k, v]) =>
                                                `${k}: <strong>${v}</strong>`
                                            ).join(' | ') : '-'}
                                        </div>
                                    </td>
                                    <td>
                                        ${data.canDrillDeeper ? `
                                            <button class="btn btn-sm btn-outline-primary"
                                                    onclick="PredictiveWorkforceDashboard.drillInto('${item.id}', '${item.name}')">
                                                🔍 Ver más
                                            </button>
                                        ` : `
                                            <button class="btn btn-sm btn-outline-secondary"
                                                    onclick="PredictiveWorkforceDashboard.showRecordDetail('${item.id}')">
                                                📄 Detalle
                                            </button>
                                        `}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                ${methodology.name ? `
                    <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
                        <small style="color: #64748b;">
                            🔬 <strong>Metodología aplicada:</strong> ${methodology.name}
                            ${methodology.formula ? ` | Fórmula: <code>${methodology.formula}</code>` : ''}
                            ${methodology.description ? ` | ${methodology.description}` : ''}
                        </small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function changeMetric(metric) {
        drillDownState.metric = metric;
        drillDownState.level = 'company';
        drillDownState.path = [];
        drillDownState.breadcrumb = [];
        loadDrillDownData();
    }

    function navigateTo(level, path) {
        drillDownState.level = level;
        drillDownState.path = path;
        loadDrillDownData();
    }

    function drillInto(id, name) {
        const levelOrder = ['company', 'branch', 'department', 'sector', 'shift', 'employee', 'record'];
        const currentIdx = levelOrder.indexOf(drillDownState.level);

        if (currentIdx < levelOrder.length - 1) {
            drillDownState.level = levelOrder[currentIdx + 1];
            drillDownState.path.push(id);
            loadDrillDownData();
        }
    }

    function showRecordDetail(id) {
        // Mostrar modal con detalle del fichaje
        alert(`Detalle del fichaje ID: ${id}\n\nEsta funcionalidad abrirá un modal con toda la información del fichaje individual.`);
    }

    // ========================================
    // UTILIDADES
    // ========================================
    function renderLoading() {
        return `
            <div class="predictive-card">
                <div style="padding: 40px; text-align: center;">
                    <div class="loading-skeleton" style="height: 200px; margin-bottom: 16px;"></div>
                    <div class="loading-skeleton" style="height: 100px;"></div>
                </div>
            </div>
        `;
    }

    function renderError(message) {
        return `
            <div class="predictive-card">
                <div style="padding: 40px; text-align: center; color: #dc2626;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h4>Error al cargar datos</h4>
                    <p>${message}</p>
                    <button class="btn btn-outline-danger btn-sm" onclick="PredictiveWorkforceDashboard.refreshAll()">
                        🔄 Reintentar
                    </button>
                </div>
            </div>
        `;
    }

    function renderGauge(value) {
        const angle = (value / 100) * 180 - 90;
        const color = value < 30 ? '#22c55e' : value < 60 ? '#eab308' : '#dc2626';

        return `
            <svg viewBox="0 0 200 120" style="width: 100%; height: auto;">
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#22c55e"/>
                        <stop offset="50%" style="stop-color:#eab308"/>
                        <stop offset="100%" style="stop-color:#dc2626"/>
                    </linearGradient>
                </defs>

                <!-- Fondo del gauge -->
                <path d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/>

                <!-- Valor actual -->
                <path d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none" stroke="url(#gaugeGradient)" stroke-width="12" stroke-linecap="round"
                      stroke-dasharray="${value * 2.51} 251"/>

                <!-- Aguja -->
                <line x1="100" y1="100" x2="100" y2="40"
                      stroke="${color}" stroke-width="3" stroke-linecap="round"
                      transform="rotate(${angle}, 100, 100)"/>
                <circle cx="100" cy="100" r="8" fill="${color}"/>
            </svg>
        `;
    }

    function getRiskLevel(value) {
        if (value < 30) return { class: 'low', label: 'Bajo', icon: '✅' };
        if (value < 60) return { class: 'medium', label: 'Moderado', icon: '⚠️' };
        return { class: 'high', label: 'Alto', icon: '🔴' };
    }

    function getFactorLabel(key) {
        const labels = {
            climate: '🌡️ Clima',
            dayOfWeek: '📅 Día de semana',
            weekendProximity: '🏖️ Cercanía fin de semana',
            holidayProximity: '🎉 Cercanía feriado',
            seasonality: '🍂 Estacionalidad',
            workType: '🔧 Tipo de trabajo',
            employeeHistory: '📈 Historial empleado'
        };
        return labels[key] || key;
    }

    function getZScoreClass(zScore) {
        if (zScore <= -1) return 'excellent';
        if (zScore <= 0) return 'good';
        if (zScore <= 1) return 'average';
        return 'poor';
    }

    function renderTrend(trend) {
        if (!trend) return '-';
        const icon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
        const color = trend > 0 ? '#dc2626' : trend < 0 ? '#16a34a' : '#64748b';
        return `<span style="color: ${color}">${icon} ${trend > 0 ? '+' : ''}${(trend || 0).toFixed(1)}%</span>`;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(value);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short'
        });
    }

    function getMetricColor(value, type) {
        if (type === 'percentage') {
            return value > 90 ? '#16a34a' : value > 70 ? '#ca8a04' : '#dc2626';
        }
        return '#1e293b';
    }

    function formatMetricValue(value, type) {
        if (type === 'percentage') return `${value.toFixed(1)}%`;
        if (type === 'currency') return formatCurrency(value);
        if (type === 'hours') return `${value.toFixed(1)}h`;
        return value;
    }

    function refreshAll() {
        switchTab(currentTab);
    }

    // ========================================
    // API PÚBLICA
    // ========================================
    return {
        render,
        switchTab,
        refreshAll,
        changeCompareType,
        changeForecastPeriod,
        changeMetric,
        navigateTo,
        drillInto,
        showRecordDetail
    };
})();

// Auto-registro si ModuleLoader existe
if (typeof ModuleLoader !== 'undefined') {
    ModuleLoader.register('predictive-workforce', {
        init: function(container, context) {
            PredictiveWorkforceDashboard.render(container.id, context.companyId);
        }
    });
}

console.log('🔮 [PREDICTIVE-WORKFORCE-DASHBOARD] Módulo cargado');
console.log('   Metodologías: IRA (Σβᵢ×Xᵢ), Sensibilidad (∂/∂x), Z-Score ((x-μ)/σ), Regresión Lineal');
