/**
 * Finance Cash Flow Module
 * Flujo de Caja con Proyecciones y Escenarios
 */

window.FinanceCashFlow = (function() {
    'use strict';

    const API_BASE = '/api/finance/treasury/cash-flow';
    let forecastData = null;
    let chartInstance = null;

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    async function init(container) {
        console.log('💰 Inicializando Flujo de Caja...');

        container.innerHTML = renderStructure();
        await loadCashFlowData();

        console.log('✅ Flujo de Caja inicializado');
    }

    function renderStructure() {
        return `
            <div class="finance-module finance-cash-flow">
                <div class="module-header">
                    <h2>💰 Flujo de Caja</h2>
                    <div class="header-actions">
                        <select id="cf-period" class="filter-select" onchange="FinanceCashFlow.changePeriod()">
                            <option value="30">Próximos 30 días</option>
                            <option value="60">Próximos 60 días</option>
                            <option value="90" selected>Próximos 90 días</option>
                            <option value="180">Próximos 6 meses</option>
                            <option value="365">Próximo año</option>
                        </select>
                        <select id="cf-scenario" class="filter-select" onchange="FinanceCashFlow.changeScenario()">
                            <option value="base" selected>Escenario Base</option>
                            <option value="optimistic">Optimista</option>
                            <option value="pessimistic">Pesimista</option>
                        </select>
                        <button onclick="FinanceCashFlow.refreshData()" class="btn-secondary">
                            🔄 Actualizar
                        </button>
                        <button onclick="FinanceCashFlow.exportCashFlow()" class="btn-primary">
                            📥 Exportar
                        </button>
                    </div>
                </div>

                <div class="module-content">
                    <!-- Summary Cards -->
                    <div class="cf-summary-cards">
                        <div class="cf-card current">
                            <div class="cf-card-icon">💵</div>
                            <div class="cf-card-content">
                                <label>Posición Actual</label>
                                <span id="cf-current-position">$0</span>
                            </div>
                        </div>
                        <div class="cf-card inflows">
                            <div class="cf-card-icon">📥</div>
                            <div class="cf-card-content">
                                <label>Entradas Proyectadas</label>
                                <span id="cf-total-inflows">$0</span>
                            </div>
                        </div>
                        <div class="cf-card outflows">
                            <div class="cf-card-icon">📤</div>
                            <div class="cf-card-content">
                                <label>Salidas Proyectadas</label>
                                <span id="cf-total-outflows">$0</span>
                            </div>
                        </div>
                        <div class="cf-card projected">
                            <div class="cf-card-icon">🎯</div>
                            <div class="cf-card-content">
                                <label>Posición Proyectada</label>
                                <span id="cf-projected-position">$0</span>
                            </div>
                        </div>
                    </div>

                    <!-- Alerts -->
                    <div id="cf-alerts" class="cf-alerts"></div>

                    <!-- Chart -->
                    <div class="cf-chart-container">
                        <h3>Proyección de Flujo de Caja</h3>
                        <canvas id="cf-chart"></canvas>
                    </div>

                    <!-- Breakdown Tabs -->
                    <div class="cf-tabs">
                        <button class="cf-tab active" onclick="FinanceCashFlow.switchTab('timeline')">📅 Timeline</button>
                        <button class="cf-tab" onclick="FinanceCashFlow.switchTab('inflows')">📥 Entradas</button>
                        <button class="cf-tab" onclick="FinanceCashFlow.switchTab('outflows')">📤 Salidas</button>
                        <button class="cf-tab" onclick="FinanceCashFlow.switchTab('scenarios')">📊 Escenarios</button>
                    </div>

                    <div id="cf-tab-content" class="cf-tab-content"></div>
                </div>
            </div>

            <style>
                .finance-cash-flow { padding: 20px; }

                .cf-summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
                .cf-card { background: white; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
                .cf-card-icon { font-size: 32px; }
                .cf-card-content { display: flex; flex-direction: column; }
                .cf-card-content label { font-size: 12px; color: #666; margin-bottom: 4px; }
                .cf-card-content span { font-size: 24px; font-weight: 700; }
                .cf-card.current .cf-card-content span { color: #2196F3; }
                .cf-card.inflows .cf-card-content span { color: #4caf50; }
                .cf-card.outflows .cf-card-content span { color: #f44336; }
                .cf-card.projected .cf-card-content span { color: #9c27b0; }

                .cf-alerts { margin-bottom: 24px; }
                .cf-alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
                .cf-alert.warning { background: #fff3e0; border-left: 4px solid #ff9800; }
                .cf-alert.danger { background: #ffebee; border-left: 4px solid #f44336; }
                .cf-alert.info { background: #e3f2fd; border-left: 4px solid #2196F3; }

                .cf-chart-container { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
                .cf-chart-container h3 { margin: 0 0 16px; color: #333; }
                #cf-chart { max-height: 300px; }

                .cf-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
                .cf-tab { padding: 10px 20px; border: none; background: #f5f5f5; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
                .cf-tab:hover { background: #e0e0e0; }
                .cf-tab.active { background: #2196F3; color: white; }

                .cf-tab-content { background: white; border-radius: 12px; padding: 24px; min-height: 300px; }

                .cf-timeline { display: flex; flex-direction: column; gap: 12px; }
                .cf-timeline-item { display: grid; grid-template-columns: 100px 1fr auto auto; gap: 16px; padding: 12px; border-radius: 8px; background: #f8f9fa; align-items: center; }
                .cf-timeline-item.negative { background: #ffebee; }
                .cf-timeline-date { font-weight: 600; color: #333; }
                .cf-timeline-bar { height: 8px; border-radius: 4px; background: #e0e0e0; position: relative; }
                .cf-timeline-bar-fill { height: 100%; border-radius: 4px; position: absolute; left: 0; }
                .cf-timeline-bar-fill.positive { background: #4caf50; }
                .cf-timeline-bar-fill.negative { background: #f44336; }
                .cf-timeline-amount { font-family: monospace; font-weight: 600; min-width: 120px; text-align: right; }
                .cf-timeline-balance { font-family: monospace; font-weight: 600; min-width: 120px; text-align: right; }

                .cf-breakdown-table { width: 100%; border-collapse: collapse; }
                .cf-breakdown-table th, .cf-breakdown-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
                .cf-breakdown-table th { background: #f8f9fa; font-weight: 600; }
                .cf-breakdown-table .amount { text-align: right; font-family: monospace; }

                .cf-scenarios-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
                .cf-scenario-card { background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center; }
                .cf-scenario-card.optimistic { border-top: 4px solid #4caf50; }
                .cf-scenario-card.base { border-top: 4px solid #2196F3; }
                .cf-scenario-card.pessimistic { border-top: 4px solid #f44336; }
                .cf-scenario-card h4 { margin: 0 0 16px; }
                .cf-scenario-value { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
                .cf-scenario-card.optimistic .cf-scenario-value { color: #4caf50; }
                .cf-scenario-card.base .cf-scenario-value { color: #2196F3; }
                .cf-scenario-card.pessimistic .cf-scenario-value { color: #f44336; }
                .cf-scenario-detail { font-size: 13px; color: #666; margin-top: 4px; }

                @media (max-width: 1200px) {
                    .cf-summary-cards { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 768px) {
                    .cf-summary-cards { grid-template-columns: 1fr; }
                    .cf-scenarios-grid { grid-template-columns: 1fr; }
                }
            </style>
        `;
    }

    // =============================================
    // CARGA DE DATOS
    // =============================================

    async function loadCashFlowData() {
        const period = document.getElementById('cf-period')?.value || 90;
        const scenario = document.getElementById('cf-scenario')?.value || 'base';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/forecast?days=${period}&scenario=${scenario}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (result.success) {
                forecastData = result.data;
                updateSummaryCards();
                updateAlerts();
                renderChart();
                switchTab('timeline');
            }
        } catch (error) {
            console.error('Error loading cash flow:', error);
        }
    }

    function updateSummaryCards() {
        if (!forecastData) return;

        document.getElementById('cf-current-position').textContent = formatCurrency(forecastData.current_position || 0);
        document.getElementById('cf-total-inflows').textContent = formatCurrency(forecastData.total_inflows || 0);
        document.getElementById('cf-total-outflows').textContent = formatCurrency(forecastData.total_outflows || 0);
        document.getElementById('cf-projected-position').textContent = formatCurrency(forecastData.projected_position || 0);

        // Color projected position based on value
        const projectedEl = document.getElementById('cf-projected-position');
        if (forecastData.projected_position < 0) {
            projectedEl.style.color = '#f44336';
        } else if (forecastData.projected_position < forecastData.current_position * 0.2) {
            projectedEl.style.color = '#ff9800';
        }
    }

    function updateAlerts() {
        const container = document.getElementById('cf-alerts');
        if (!forecastData || !forecastData.alerts || forecastData.alerts.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = forecastData.alerts.map(alert => `
            <div class="cf-alert ${alert.type}">
                <span>${getAlertIcon(alert.type)}</span>
                <span>${alert.message}</span>
                ${alert.date ? `<span style="margin-left: auto; color: #666;">${formatDate(alert.date)}</span>` : ''}
            </div>
        `).join('');
    }

    function getAlertIcon(type) {
        switch (type) {
            case 'danger': return '🚨';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }

    // =============================================
    // CHART
    // =============================================

    function renderChart() {
        const canvas = document.getElementById('cf-chart');
        if (!canvas || !forecastData || !forecastData.daily_forecast) return;

        // Destroy existing chart
        if (chartInstance) {
            chartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        const dailyData = forecastData.daily_forecast;

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyData.map(d => formatDate(d.date)),
                datasets: [
                    {
                        label: 'Saldo Proyectado',
                        data: dailyData.map(d => d.balance),
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Entradas',
                        data: dailyData.map(d => d.inflows),
                        borderColor: '#4caf50',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.4
                    },
                    {
                        label: 'Salidas',
                        data: dailyData.map(d => -d.outflows),
                        borderColor: '#f44336',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return formatCurrencyShort(value);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    // =============================================
    // TABS
    // =============================================

    function switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.cf-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.cf-tab[onclick*="${tab}"]`)?.classList.add('active');

        // Render tab content
        const container = document.getElementById('cf-tab-content');

        switch (tab) {
            case 'timeline':
                container.innerHTML = renderTimelineTab();
                break;
            case 'inflows':
                container.innerHTML = renderInflowsTab();
                break;
            case 'outflows':
                container.innerHTML = renderOutflowsTab();
                break;
            case 'scenarios':
                container.innerHTML = renderScenariosTab();
                break;
        }
    }

    function renderTimelineTab() {
        if (!forecastData || !forecastData.daily_forecast) {
            return '<p style="color: #999; text-align: center;">No hay datos disponibles</p>';
        }

        const maxBalance = Math.max(...forecastData.daily_forecast.map(d => Math.abs(d.balance)));

        return `
            <div class="cf-timeline">
                ${forecastData.daily_forecast.map(day => {
                    const netFlow = day.inflows - day.outflows;
                    const barWidth = Math.min(Math.abs(day.balance) / maxBalance * 100, 100);
                    const isNegative = day.balance < 0;

                    return `
                        <div class="cf-timeline-item ${isNegative ? 'negative' : ''}">
                            <div class="cf-timeline-date">${formatDate(day.date)}</div>
                            <div class="cf-timeline-bar">
                                <div class="cf-timeline-bar-fill ${isNegative ? 'negative' : 'positive'}" style="width: ${barWidth}%"></div>
                            </div>
                            <div class="cf-timeline-amount" style="color: ${netFlow >= 0 ? '#4caf50' : '#f44336'}">
                                ${netFlow >= 0 ? '+' : ''}${formatCurrency(netFlow)}
                            </div>
                            <div class="cf-timeline-balance" style="color: ${isNegative ? '#f44336' : '#333'}">
                                ${formatCurrency(day.balance)}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderInflowsTab() {
        if (!forecastData || !forecastData.inflows_breakdown) {
            return '<p style="color: #999; text-align: center;">No hay datos disponibles</p>';
        }

        return `
            <table class="cf-breakdown-table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Fuente</th>
                        <th>Fecha Esperada</th>
                        <th>Probabilidad</th>
                        <th class="amount">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${forecastData.inflows_breakdown.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td>${getSourceLabel(item.source)}</td>
                            <td>${formatDate(item.expected_date)}</td>
                            <td>
                                <span style="color: ${getProbabilityColor(item.probability)}">
                                    ${item.probability}%
                                </span>
                            </td>
                            <td class="amount" style="color: #4caf50;">${formatCurrency(item.amount)}</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: 700; background: #e8f5e9;">
                        <td colspan="4">TOTAL ENTRADAS</td>
                        <td class="amount" style="color: #4caf50;">${formatCurrency(forecastData.total_inflows)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    function renderOutflowsTab() {
        if (!forecastData || !forecastData.outflows_breakdown) {
            return '<p style="color: #999; text-align: center;">No hay datos disponibles</p>';
        }

        return `
            <table class="cf-breakdown-table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Tipo</th>
                        <th>Fecha Vencimiento</th>
                        <th>Estado</th>
                        <th class="amount">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${forecastData.outflows_breakdown.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td>${getOutflowTypeLabel(item.type)}</td>
                            <td>${formatDate(item.due_date)}</td>
                            <td>
                                <span style="color: ${getStatusColor(item.status)}">
                                    ${getStatusLabel(item.status)}
                                </span>
                            </td>
                            <td class="amount" style="color: #f44336;">${formatCurrency(item.amount)}</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: 700; background: #ffebee;">
                        <td colspan="4">TOTAL SALIDAS</td>
                        <td class="amount" style="color: #f44336;">${formatCurrency(forecastData.total_outflows)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    function renderScenariosTab() {
        if (!forecastData || !forecastData.scenarios) {
            return '<p style="color: #999; text-align: center;">No hay datos de escenarios</p>';
        }

        const { optimistic, base, pessimistic } = forecastData.scenarios;

        return `
            <div class="cf-scenarios-grid">
                <div class="cf-scenario-card optimistic">
                    <h4>🌟 Escenario Optimista</h4>
                    <div class="cf-scenario-value">${formatCurrency(optimistic.projected_balance)}</div>
                    <div class="cf-scenario-detail">Cobranzas +${optimistic.collection_rate}%</div>
                    <div class="cf-scenario-detail">Gastos -${optimistic.expense_reduction}%</div>
                    <div class="cf-scenario-detail">Probabilidad: ${optimistic.probability}%</div>
                </div>
                <div class="cf-scenario-card base">
                    <h4>📊 Escenario Base</h4>
                    <div class="cf-scenario-value">${formatCurrency(base.projected_balance)}</div>
                    <div class="cf-scenario-detail">Cobranzas al ${base.collection_rate}%</div>
                    <div class="cf-scenario-detail">Gastos proyectados</div>
                    <div class="cf-scenario-detail">Probabilidad: ${base.probability}%</div>
                </div>
                <div class="cf-scenario-card pessimistic">
                    <h4>⚠️ Escenario Pesimista</h4>
                    <div class="cf-scenario-value">${formatCurrency(pessimistic.projected_balance)}</div>
                    <div class="cf-scenario-detail">Cobranzas -${pessimistic.collection_delay}%</div>
                    <div class="cf-scenario-detail">Gastos +${pessimistic.expense_increase}%</div>
                    <div class="cf-scenario-detail">Probabilidad: ${pessimistic.probability}%</div>
                </div>
            </div>

            <div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin: 0 0 12px;">📈 Análisis de Sensibilidad</h4>
                <p style="margin: 0; color: #666; font-size: 14px;">
                    ${getSensitivityAnalysis()}
                </p>
            </div>
        `;
    }

    function getSensitivityAnalysis() {
        if (!forecastData || !forecastData.scenarios) return 'Sin datos suficientes para análisis.';

        const { optimistic, base, pessimistic } = forecastData.scenarios;
        const range = optimistic.projected_balance - pessimistic.projected_balance;

        if (pessimistic.projected_balance < 0) {
            return `⚠️ En el escenario pesimista, la empresa podría enfrentar un déficit de caja de ${formatCurrency(Math.abs(pessimistic.projected_balance))}. Se recomienda acelerar cobranzas y revisar compromisos de pago.`;
        } else if (range > base.projected_balance) {
            return `📊 Alta variabilidad entre escenarios (${formatCurrency(range)}). El flujo de caja es sensible a cambios en cobranzas. Se recomienda diversificar fuentes de ingreso.`;
        } else {
            return `✅ Flujo de caja estable. Variación entre escenarios de ${formatCurrency(range)}, representando un ${((range / base.projected_balance) * 100).toFixed(1)}% del escenario base.`;
        }
    }

    // =============================================
    // HELPERS
    // =============================================

    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    function formatCurrencyShort(amount) {
        if (Math.abs(amount) >= 1000000) {
            return '$' + (amount / 1000000).toFixed(1) + 'M';
        } else if (Math.abs(amount) >= 1000) {
            return '$' + (amount / 1000).toFixed(0) + 'K';
        }
        return '$' + amount.toFixed(0);
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short'
        });
    }

    function getSourceLabel(source) {
        const labels = {
            receivables: 'Cobranzas',
            sales: 'Ventas',
            other: 'Otros',
            transfers: 'Transferencias'
        };
        return labels[source] || source;
    }

    function getOutflowTypeLabel(type) {
        const labels = {
            payroll: 'Nómina',
            suppliers: 'Proveedores',
            taxes: 'Impuestos',
            loans: 'Préstamos',
            fixed: 'Gastos Fijos',
            other: 'Otros'
        };
        return labels[type] || type;
    }

    function getProbabilityColor(prob) {
        if (prob >= 80) return '#4caf50';
        if (prob >= 50) return '#ff9800';
        return '#f44336';
    }

    function getStatusColor(status) {
        const colors = {
            pending: '#ff9800',
            confirmed: '#4caf50',
            overdue: '#f44336',
            paid: '#9e9e9e'
        };
        return colors[status] || '#666';
    }

    function getStatusLabel(status) {
        const labels = {
            pending: 'Pendiente',
            confirmed: 'Confirmado',
            overdue: 'Vencido',
            paid: 'Pagado'
        };
        return labels[status] || status;
    }

    // =============================================
    // ACCIONES
    // =============================================

    function changePeriod() {
        loadCashFlowData();
    }

    function changeScenario() {
        loadCashFlowData();
    }

    function refreshData() {
        loadCashFlowData();
    }

    async function exportCashFlow() {
        try {
            const token = localStorage.getItem('token');
            const period = document.getElementById('cf-period')?.value || 90;
            const scenario = document.getElementById('cf-scenario')?.value || 'base';

            const response = await fetch(`${API_BASE}/export?days=${period}&scenario=${scenario}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `flujo-caja-${period}dias-${scenario}.xlsx`;
                a.click();
            } else {
                alert('Error al exportar');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Error al exportar');
        }
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    return {
        init,
        changePeriod,
        changeScenario,
        refreshData,
        exportCashFlow,
        switchTab
    };

})();
