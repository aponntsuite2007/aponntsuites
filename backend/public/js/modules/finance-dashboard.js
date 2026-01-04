/**
 * Finance Enterprise Dashboard - OLAP Style
 * Dashboard financiero con KPIs determinísticos y predictivos
 * Dark Theme Professional
 */

window.FinanceDashboard = (function() {
    'use strict';

    // =============================================
    // CONFIGURACIÓN Y ESTADO
    // =============================================

    const API_BASE = '/api/finance';
    let currentData = null;
    let refreshInterval = null;

    // Colores del tema oscuro
    const THEME = {
        background: '#1a1a2e',
        card: '#16213e',
        accent: '#0f3460',
        success: '#00d9ff',
        warning: '#ffc107',
        danger: '#ff4757',
        text: '#e4e4e4',
        textMuted: '#8892b0'
    };

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    async function init(container) {
        console.log('🏦 Inicializando Finance Dashboard...');

        // Si es un string (ID), convertirlo a elemento DOM
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!container) {
            container = document.getElementById('finance-dashboard-container');
        }

        if (!container) {
            console.error('Container no encontrado');
            return;
        }

        // Renderizar estructura
        container.innerHTML = renderDashboardStructure();

        // Cargar datos
        await loadDashboardData();

        // Auto-refresh cada 5 minutos
        refreshInterval = setInterval(() => loadDashboardData(), 300000);

        console.log('✅ Finance Dashboard inicializado');
    }

    function destroy() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    }

    // =============================================
    // ESTRUCTURA DEL DASHBOARD
    // =============================================

    function renderDashboardStructure() {
        return `
            <div class="finance-dashboard" style="background: ${THEME.background}; min-height: 100vh; padding: 20px;">
                <!-- Header -->
                <div class="dashboard-header" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h1 style="color: ${THEME.text}; margin: 0; font-size: 28px;">
                                🏦 Finance Enterprise Dashboard
                            </h1>
                            <p style="color: ${THEME.textMuted}; margin: 8px 0 0 0;">
                                KPIs Financieros en Tiempo Real | OLAP Analytics
                            </p>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <select id="finance-fiscal-year" class="finance-select" onchange="FinanceDashboard.changePeriod()">
                                ${generateYearOptions()}
                            </select>
                            <select id="finance-fiscal-period" class="finance-select" onchange="FinanceDashboard.changePeriod()">
                                <option value="">Año completo</option>
                                ${generateMonthOptions()}
                            </select>
                            <button onclick="FinanceDashboard.refresh()" class="finance-btn">
                                🔄 Actualizar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Alertas -->
                <div id="finance-alerts" class="alerts-container" style="margin-bottom: 20px;"></div>

                <!-- Finance Modules Grid -->
                <div style="margin-bottom: 32px;">
                    <h2 style="color: ${THEME.text}; font-size: 22px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
                        📊 Módulos Financieros Profesionales
                        <span style="font-size: 12px; background: rgba(0, 217, 255, 0.2); color: ${THEME.success}; padding: 4px 12px; border-radius: 12px; font-weight: 600;">
                            8 MÓDULOS PRO
                        </span>
                    </h2>
                    <div id="finance-modules-grid" class="finance-modules-grid">
                        <!-- Se renderiza dinámicamente -->
                    </div>
                </div>

                <!-- KPIs Row 1 -->
                <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
                    <div id="kpi-budget" class="kpi-card"></div>
                    <div id="kpi-cash" class="kpi-card"></div>
                    <div id="kpi-dso" class="kpi-card"></div>
                    <div id="kpi-dpo" class="kpi-card"></div>
                </div>

                <!-- Charts Row -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div id="chart-revenue-expense" class="chart-card" style="background: ${THEME.card}; border-radius: 12px; padding: 20px;">
                        <h3 style="color: ${THEME.text}; margin-top: 0;">📊 Ingresos vs Gastos</h3>
                        <div id="revenue-expense-chart" style="height: 300px;"></div>
                    </div>
                    <div id="chart-cash-flow" class="chart-card" style="background: ${THEME.card}; border-radius: 12px; padding: 20px;">
                        <h3 style="color: ${THEME.text}; margin-top: 0;">💰 Flujo de Caja Proyectado</h3>
                        <div id="cash-flow-chart" style="height: 300px;"></div>
                    </div>
                </div>

                <!-- KPIs Row 2 - Ratios -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
                    <div id="kpi-current-ratio" class="kpi-card"></div>
                    <div id="kpi-quick-ratio" class="kpi-card"></div>
                    <div id="kpi-ccc" class="kpi-card"></div>
                </div>

                <!-- Bottom Section -->
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                    <!-- Budget Gauge & Execution -->
                    <div style="background: ${THEME.card}; border-radius: 12px; padding: 20px;">
                        <h3 style="color: ${THEME.text}; margin-top: 0;">📈 Ejecución Presupuestaria</h3>
                        <div id="budget-execution" style="display: flex; align-items: center; gap: 40px;">
                            <div id="budget-gauge" style="width: 200px; height: 200px;"></div>
                            <div id="budget-details" style="flex: 1;"></div>
                        </div>
                    </div>

                    <!-- Top Expenses -->
                    <div style="background: ${THEME.card}; border-radius: 12px; padding: 20px;">
                        <h3 style="color: ${THEME.text}; margin-top: 0;">💸 Top 5 Gastos</h3>
                        <div id="top-expenses"></div>
                    </div>
                </div>

                <!-- Integrations Status -->
                <div style="margin-top: 20px; background: ${THEME.card}; border-radius: 12px; padding: 20px;">
                    <h3 style="color: ${THEME.text}; margin-top: 0;">🔌 Estado de Integraciones</h3>
                    <div id="integrations-status"></div>
                </div>
            </div>

            <style>
                .finance-select {
                    background: ${THEME.accent};
                    color: ${THEME.text};
                    border: 1px solid ${THEME.textMuted};
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                }
                .finance-btn {
                    background: linear-gradient(135deg, ${THEME.success}, #0099cc);
                    color: #fff;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: transform 0.2s;
                }
                .finance-btn:hover {
                    transform: scale(1.05);
                }
                .kpi-card {
                    background: ${THEME.card};
                    border-radius: 12px;
                    padding: 20px;
                    position: relative;
                    overflow: hidden;
                }
                .kpi-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, ${THEME.success}, ${THEME.accent});
                }
                .alert-item {
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .alert-critical { background: rgba(255, 71, 87, 0.2); border-left: 4px solid ${THEME.danger}; }
                .alert-warning { background: rgba(255, 193, 7, 0.2); border-left: 4px solid ${THEME.warning}; }
                .alert-info { background: rgba(0, 217, 255, 0.2); border-left: 4px solid ${THEME.success}; }
            </style>
        `;
    }

    function generateYearOptions() {
        const currentYear = new Date().getFullYear();
        let options = '';
        for (let y = currentYear; y >= currentYear - 3; y--) {
            options += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
        }
        return options;
    }

    function generateMonthOptions() {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    }

    // =============================================
    // CARGA DE DATOS
    // =============================================

    async function loadDashboardData() {
        try {
            const year = document.getElementById('finance-fiscal-year')?.value;
            const period = document.getElementById('finance-fiscal-period')?.value;

            const params = new URLSearchParams();
            if (year) params.append('fiscal_year', year);
            if (period) params.append('fiscal_period', period);

            // Cargar todos los datos en paralelo
            const [dashboard, alerts, integrations] = await Promise.all([
                fetchAPI(`${API_BASE}/dashboard?${params}`),
                fetchAPI(`${API_BASE}/dashboard/alerts`),
                fetchAPI(`${API_BASE}/integrations`)
            ]);

            currentData = { dashboard, alerts, integrations };

            // Renderizar componentes
            renderAlerts(alerts);
            renderFinanceModulesCards(); // Grid de 8 módulos profesionales
            renderKPIs(dashboard);
            renderCharts(dashboard);
            renderBudgetExecution(dashboard);
            renderTopExpenses();
            renderIntegrations(integrations);

        } catch (error) {
            console.error('Error cargando dashboard:', error);
            showError('Error al cargar datos del dashboard');
        }
    }

    async function fetchAPI(url) {
        const token = localStorage.getItem('authToken');
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        return result.data;
    }

    // =============================================
    // RENDERIZADO DE COMPONENTES
    // =============================================

    function renderAlerts(alerts) {
        const container = document.getElementById('finance-alerts');
        if (!container || !alerts?.length) {
            if (container) container.innerHTML = '';
            return;
        }

        container.innerHTML = alerts.slice(0, 5).map(alert => `
            <div class="alert-item alert-${alert.type}">
                <span style="font-size: 20px;">
                    ${alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <div style="flex: 1;">
                    <div style="color: ${THEME.text}; font-weight: 500;">${alert.message}</div>
                    ${alert.action ? `<div style="color: ${THEME.textMuted}; font-size: 12px; margin-top: 4px;">${alert.action}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    function renderKPIs(data) {
        // Budget KPI
        renderKPICard('kpi-budget', {
            icon: '📊',
            title: 'Presupuesto vs Real',
            value: data?.budget?.has_budget
                ? `${data.budget.execution_percent?.value?.toFixed(1) || 0}%`
                : 'Sin presupuesto',
            status: data?.budget?.budget_vs_actual?.status || 'unknown',
            subtitle: data?.budget?.has_budget
                ? `${formatCurrency(data.budget.total_actual)} de ${formatCurrency(data.budget.total_budget)}`
                : 'Configure un presupuesto activo'
        });

        // Cash KPI
        renderKPICard('kpi-cash', {
            icon: '💰',
            title: 'Posición de Caja',
            value: formatCurrency(data?.cash_flow?.current_cash_position || data?.liquidity?.cash_position || 0),
            status: data?.cash_flow?.liquidity_risk === 'high' ? 'danger' : 'success',
            subtitle: data?.cash_flow?.has_forecast
                ? `Proyectado: ${formatCurrency(data.cash_flow.projected_end_balance)}`
                : 'Sin proyección activa'
        });

        // DSO KPI
        renderKPICard('kpi-dso', {
            icon: '📅',
            title: 'DSO (Días de Cobro)',
            value: `${data?.operational?.dso?.value || 0} días`,
            status: data?.operational?.dso?.status || 'unknown',
            subtitle: `Benchmark: ${data?.operational?.dso?.benchmark?.ideal || 30} días`
        });

        // DPO KPI
        renderKPICard('kpi-dpo', {
            icon: '🏦',
            title: 'DPO (Días de Pago)',
            value: `${data?.operational?.dpo?.value || 0} días`,
            status: data?.operational?.dpo?.status || 'unknown',
            subtitle: `Benchmark: ${data?.operational?.dpo?.benchmark?.ideal || 45} días`
        });

        // Current Ratio
        renderKPICard('kpi-current-ratio', {
            icon: '📈',
            title: 'Ratio de Liquidez',
            value: data?.liquidity?.current_ratio?.value?.toFixed(2) || 'N/A',
            status: data?.liquidity?.current_ratio?.status || 'unknown',
            subtitle: `Ideal: ≥ ${data?.liquidity?.current_ratio?.benchmark?.ideal || 2.0}`
        });

        // Quick Ratio
        renderKPICard('kpi-quick-ratio', {
            icon: '⚡',
            title: 'Prueba Ácida',
            value: data?.liquidity?.quick_ratio?.value?.toFixed(2) || 'N/A',
            status: data?.liquidity?.quick_ratio?.status || 'unknown',
            subtitle: `Ideal: ≥ ${data?.liquidity?.quick_ratio?.benchmark?.ideal || 1.5}`
        });

        // Cash Conversion Cycle
        renderKPICard('kpi-ccc', {
            icon: '🔄',
            title: 'Ciclo de Conversión de Caja',
            value: `${data?.operational?.cash_conversion_cycle?.value || 0} días`,
            status: (data?.operational?.cash_conversion_cycle?.value || 0) < 0 ? 'success' : 'warning',
            subtitle: data?.operational?.cash_conversion_cycle?.description || ''
        });
    }

    function renderKPICard(containerId, kpi) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const statusColors = {
            excellent: THEME.success,
            good: '#4ecdc4',
            on_track: THEME.success,
            warning: THEME.warning,
            danger: THEME.danger,
            unknown: THEME.textMuted,
            success: THEME.success
        };

        container.innerHTML = `
            <div style="color: ${THEME.textMuted}; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">${kpi.icon}</span>
                ${kpi.title}
            </div>
            <div style="color: ${THEME.text}; font-size: 28px; font-weight: 700; margin-bottom: 8px;">
                ${kpi.value}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColors[kpi.status] || THEME.textMuted};"></span>
                <span style="color: ${THEME.textMuted}; font-size: 12px;">${kpi.subtitle}</span>
            </div>
        `;
    }

    function renderCharts(data) {
        // Placeholder para charts - requiere biblioteca de gráficos
        const revenueExpenseChart = document.getElementById('revenue-expense-chart');
        const cashFlowChart = document.getElementById('cash-flow-chart');

        if (revenueExpenseChart) {
            revenueExpenseChart.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: ${THEME.textMuted};">
                    <div style="display: flex; gap: 40px; margin-bottom: 20px;">
                        <div style="text-align: center;">
                            <div style="font-size: 32px; font-weight: 700; color: ${THEME.success};">
                                ${formatCurrency(data?.profitability?.revenue || 0)}
                            </div>
                            <div>Ingresos</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 32px; font-weight: 700; color: ${THEME.danger};">
                                ${formatCurrency((data?.profitability?.cost_of_sales || 0) + (data?.profitability?.operating_expenses || 0))}
                            </div>
                            <div>Gastos</div>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: ${(data?.profitability?.net_income || 0) >= 0 ? THEME.success : THEME.danger};">
                            ${formatCurrency(data?.profitability?.net_income || 0)}
                        </div>
                        <div>Resultado Neto</div>
                    </div>
                </div>
            `;
        }

        if (cashFlowChart) {
            const cashData = data?.cash_flow;
            if (cashData?.has_forecast) {
                cashFlowChart.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%;">
                        <div style="display: flex; flex-direction: column; justify-content: center;">
                            <div style="color: ${THEME.textMuted}; margin-bottom: 8px;">Saldo Actual</div>
                            <div style="font-size: 24px; font-weight: 700; color: ${THEME.text};">
                                ${formatCurrency(cashData.current_balance || 0)}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center;">
                            <div style="color: ${THEME.textMuted}; margin-bottom: 8px;">Proyección 30 días</div>
                            <div style="font-size: 24px; font-weight: 700; color: ${(cashData.projected_end_balance || 0) >= 0 ? THEME.success : THEME.danger};">
                                ${formatCurrency(cashData.projected_end_balance || 0)}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center;">
                            <div style="color: ${THEME.textMuted}; margin-bottom: 8px;">Saldo Mínimo</div>
                            <div style="font-size: 20px; font-weight: 600; color: ${(cashData.min_balance || 0) < 0 ? THEME.danger : THEME.warning};">
                                ${formatCurrency(cashData.min_balance || 0)}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center;">
                            <div style="color: ${THEME.textMuted}; margin-bottom: 8px;">Riesgo Liquidez</div>
                            <div style="font-size: 20px; font-weight: 600; color: ${cashData.liquidity_risk === 'high' ? THEME.danger : cashData.liquidity_risk === 'medium' ? THEME.warning : THEME.success};">
                                ${cashData.liquidity_risk === 'high' ? '🔴 Alto' : cashData.liquidity_risk === 'medium' ? '🟡 Medio' : '🟢 Bajo'}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                cashFlowChart.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: ${THEME.textMuted};">
                        <div style="text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                            <div>Sin proyección de flujo de caja activa</div>
                            <button onclick="FinanceDashboard.goToModule('cash-flow')" class="finance-btn" style="margin-top: 16px;">
                                Generar Proyección
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }

    function renderBudgetExecution(data) {
        const gaugeContainer = document.getElementById('budget-gauge');
        const detailsContainer = document.getElementById('budget-details');

        if (!gaugeContainer || !detailsContainer) return;

        const budget = data?.budget;

        if (!budget?.has_budget) {
            gaugeContainer.innerHTML = '';
            detailsContainer.innerHTML = `
                <div style="color: ${THEME.textMuted}; text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                    <div>No hay presupuesto activo para el período</div>
                    <button onclick="FinanceDashboard.goToModule('budget')" class="finance-btn" style="margin-top: 16px;">
                        Crear Presupuesto
                    </button>
                </div>
            `;
            return;
        }

        // Gauge visual
        const percent = Math.min(budget.execution_percent?.value || 0, 150);
        const statusColor = percent > 110 ? THEME.danger : percent > 105 ? THEME.warning : THEME.success;

        gaugeContainer.innerHTML = `
            <svg viewBox="0 0 100 100" style="transform: rotate(-90deg);">
                <circle cx="50" cy="50" r="40" fill="none" stroke="${THEME.accent}" stroke-width="8"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="${statusColor}" stroke-width="8"
                    stroke-dasharray="${percent * 2.51} 251"
                    stroke-linecap="round"/>
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                <div style="font-size: 28px; font-weight: 700; color: ${THEME.text};">${percent.toFixed(0)}%</div>
                <div style="font-size: 11px; color: ${THEME.textMuted};">Ejecutado</div>
            </div>
        `;
        gaugeContainer.style.position = 'relative';

        // Details
        detailsContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <div style="color: ${THEME.textMuted}; font-size: 12px;">Presupuesto Total</div>
                    <div style="color: ${THEME.text}; font-size: 18px; font-weight: 600;">${formatCurrency(budget.total_budget)}</div>
                </div>
                <div>
                    <div style="color: ${THEME.textMuted}; font-size: 12px;">Ejecutado Real</div>
                    <div style="color: ${THEME.text}; font-size: 18px; font-weight: 600;">${formatCurrency(budget.total_actual)}</div>
                </div>
                <div>
                    <div style="color: ${THEME.textMuted}; font-size: 12px;">Comprometido</div>
                    <div style="color: ${THEME.warning}; font-size: 18px; font-weight: 600;">${formatCurrency(budget.total_committed || 0)}</div>
                </div>
                <div>
                    <div style="color: ${THEME.textMuted}; font-size: 12px;">Disponible</div>
                    <div style="color: ${THEME.success}; font-size: 18px; font-weight: 600;">${formatCurrency(budget.total_available || 0)}</div>
                </div>
            </div>
            ${budget.top_variances?.length > 0 ? `
                <div style="margin-top: 20px;">
                    <div style="color: ${THEME.textMuted}; font-size: 12px; margin-bottom: 8px;">⚠️ Principales Desvíos</div>
                    ${budget.top_variances.slice(0, 3).map(v => `
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: ${THEME.text};">
                            <span>Cuenta ${v.account_id}</span>
                            <span style="color: ${THEME.danger};">+${v.variance_percent?.toFixed(1)}%</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    async function renderTopExpenses() {
        const container = document.getElementById('top-expenses');
        if (!container) return;

        try {
            const year = document.getElementById('finance-fiscal-year')?.value;
            const period = document.getElementById('finance-fiscal-period')?.value;

            const params = new URLSearchParams({ limit: '5' });
            if (year) params.append('fiscal_year', year);
            if (period) params.append('fiscal_period', period);

            const data = await fetchAPI(`${API_BASE}/dashboard/widgets/top-expenses?${params}`);

            if (!data?.length) {
                container.innerHTML = `
                    <div style="color: ${THEME.textMuted}; text-align: center; padding: 40px;">
                        Sin datos de gastos
                    </div>
                `;
                return;
            }

            container.innerHTML = data.map((expense, index) => `
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; ${index < data.length - 1 ? `border-bottom: 1px solid ${THEME.accent};` : ''}">
                    <div style="width: 24px; height: 24px; background: ${THEME.accent}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${THEME.text}; font-size: 12px; font-weight: 600;">
                        ${index + 1}
                    </div>
                    <div style="flex: 1; overflow: hidden;">
                        <div style="color: ${THEME.text}; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${expense.account_name || `Cuenta ${expense.account_code}`}
                        </div>
                        <div style="color: ${THEME.textMuted}; font-size: 11px;">${expense.account_code}</div>
                    </div>
                    <div style="color: ${THEME.danger}; font-weight: 600;">
                        ${formatCurrency(expense.amount)}
                    </div>
                </div>
            `).join('');

        } catch (error) {
            container.innerHTML = `
                <div style="color: ${THEME.danger}; text-align: center; padding: 20px;">
                    Error al cargar gastos
                </div>
            `;
        }
    }

    function renderIntegrations(data) {
        const container = document.getElementById('integrations-status');
        if (!container) return;

        const modules = data?.modules || {};

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;">
                ${Object.entries(modules).map(([key, mod]) => `
                    <div style="background: ${THEME.accent}; border-radius: 8px; padding: 16px; text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 8px;">
                            ${mod.available ? '✅' : '❌'}
                        </div>
                        <div style="color: ${THEME.text}; font-weight: 500; margin-bottom: 4px;">
                            ${mod.name}
                        </div>
                        <div style="color: ${THEME.textMuted}; font-size: 11px;">
                            ${mod.available ? `${mod.features_enabled?.length || 0} features` : 'No contratado'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Renderiza el grid de 8 módulos Finance profesionales
     */
    function renderFinanceModulesCards() {
        const container = document.getElementById('finance-modules-grid');
        if (!container) return;

        const modules = [
            {
                key: 'chart-of-accounts',
                icon: '📊',
                name: 'Plan de Cuentas',
                description: 'Gestión completa del plan de cuentas contable'
            },
            {
                key: 'budget',
                icon: '📋',
                name: 'Presupuestos',
                description: 'Control y seguimiento de presupuestos'
            },
            {
                key: 'cash-flow',
                icon: '💰',
                name: 'Flujo de Caja',
                description: 'Proyecciones y análisis de tesorería'
            },
            {
                key: 'cost-centers',
                icon: '🏢',
                name: 'Centros de Costo',
                description: 'Gestión de centros de costo y dimensiones'
            },
            {
                key: 'journal-entries',
                icon: '📝',
                name: 'Asientos Contables',
                description: 'Registro de movimientos contables'
            },
            {
                key: 'treasury',
                icon: '🏦',
                name: 'Tesorería',
                description: 'Gestión de caja, bancos y pagos'
            },
            {
                key: 'reports',
                icon: '📈',
                name: 'Reportes Financieros',
                description: 'Balance, Estado de Resultados y más'
            },
            {
                key: 'executive-dashboard',
                icon: '📊',
                name: 'Dashboard Ejecutivo',
                description: 'KPIs ejecutivos y análisis avanzado'
            }
        ];

        container.innerHTML = modules.map(mod => `
            <div class="finance-module-card" onclick="FinanceDashboard.goToModule('${mod.key}')">
                <span class="module-icon">${mod.icon}</span>
                <span class="module-name">${mod.name}</span>
                <span class="module-description">${mod.description}</span>
                <span class="module-badge">PRO</span>
            </div>
        `).join('');
    }

    // =============================================
    // UTILIDADES
    // =============================================

    function formatCurrency(amount, currency = 'ARS') {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    function showError(message) {
        const alerts = document.getElementById('finance-alerts');
        if (alerts) {
            alerts.innerHTML = `
                <div class="alert-item alert-critical">
                    <span style="font-size: 20px;">🚨</span>
                    <div style="color: ${THEME.text};">${message}</div>
                </div>
            `;
        }
    }

    // =============================================
    // ACCIONES
    // =============================================

    function refresh() {
        loadDashboardData();
    }

    function changePeriod() {
        loadDashboardData();
    }

    function goToModule(moduleName) {
        // Navegar a módulo específico usando showModuleContent
        if (window.showModuleContent) {
            window.showModuleContent(`finance-${moduleName}`, moduleName);
        } else {
            console.error('showModuleContent no está disponible');
        }
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    return {
        init,
        destroy,
        refresh,
        changePeriod,
        goToModule
    };

})();

// Auto-inicializar si existe el container
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('finance-dashboard-container');
    if (container) {
        FinanceDashboard.init(container);
    }
});
