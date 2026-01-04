/**
 * Finance Reports Module
 * Reportes Contables Profesionales
 */

window.FinanceReports = (function() {
    'use strict';

    const API_BASE = '/api/finance/reports';
    let currentReport = null;
    let reportData = null;

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    async function init(container) {
        console.log('📊 Inicializando Reportes Financieros...');

        container.innerHTML = renderStructure();
        setupEventListeners();

        console.log('✅ Reportes Financieros inicializado');
    }

    function renderStructure() {
        return `
            <div class="finance-module finance-reports">
                <div class="module-header">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <button onclick="window.showModuleContent('finance-dashboard', 'Finance Dashboard')" class="finance-back-btn">
                            ← Volver a Finance
                        </button>
                        <h2>📊 Reportes Financieros</h2>
                    </div>
                    <div class="header-actions">
                        <select id="report-period-year" class="filter-select">
                            ${generateYearOptions()}
                        </select>
                        <select id="report-period-month" class="filter-select">
                            <option value="">Año completo</option>
                            ${generateMonthOptions()}
                        </select>
                        <button onclick="FinanceReports.exportReport('pdf')" class="btn-secondary">
                            📄 PDF
                        </button>
                        <button onclick="FinanceReports.exportReport('excel')" class="btn-secondary">
                            📗 Excel
                        </button>
                    </div>
                </div>

                <div class="module-content">
                    <div class="reports-grid">
                        <!-- Report Cards -->
                        <div class="report-card" onclick="FinanceReports.loadReport('balance-sheet')">
                            <div class="report-icon">📋</div>
                            <h3>Balance General</h3>
                            <p>Estado de situación patrimonial</p>
                        </div>
                        <div class="report-card" onclick="FinanceReports.loadReport('income-statement')">
                            <div class="report-icon">📈</div>
                            <h3>Estado de Resultados</h3>
                            <p>Pérdidas y ganancias del período</p>
                        </div>
                        <div class="report-card" onclick="FinanceReports.loadReport('cash-flow-statement')">
                            <div class="report-icon">💰</div>
                            <h3>Flujo de Efectivo</h3>
                            <p>Movimientos de caja</p>
                        </div>
                        <div class="report-card" onclick="FinanceReports.loadReport('trial-balance')">
                            <div class="report-icon">⚖️</div>
                            <h3>Balance de Comprobación</h3>
                            <p>Sumas y saldos de cuentas</p>
                        </div>
                        <div class="report-card" onclick="FinanceReports.loadReport('account-ledger')">
                            <div class="report-icon">📒</div>
                            <h3>Mayor por Cuenta</h3>
                            <p>Movimientos de cuenta específica</p>
                        </div>
                        <div class="report-card" onclick="FinanceReports.loadReport('cost-center-report')">
                            <div class="report-icon">🏢</div>
                            <h3>Por Centro de Costo</h3>
                            <p>Análisis por área/departamento</p>
                        </div>
                        <div class="report-card" onclick="FinanceReports.loadReport('variance-analysis')">
                            <div class="report-icon">📊</div>
                            <h3>Análisis de Desvíos</h3>
                            <p>Real vs Presupuesto</p>
                        </div>
                        <div class="report-card" onclick="FinanceReports.loadReport('ratios')">
                            <div class="report-icon">🎯</div>
                            <h3>Ratios Financieros</h3>
                            <p>Indicadores clave</p>
                        </div>
                    </div>

                    <!-- Report Viewer -->
                    <div id="report-viewer" class="report-viewer" style="display: none;">
                        <div class="report-viewer-header">
                            <button onclick="FinanceReports.closeReport()" class="btn-back">← Volver</button>
                            <h3 id="report-title">Reporte</h3>
                            <div class="report-actions">
                                <button onclick="FinanceReports.printReport()" class="btn-icon">🖨️</button>
                            </div>
                        </div>
                        <div id="report-content" class="report-content"></div>
                    </div>
                </div>

                <!-- Modal Seleccionar Cuenta -->
                <div id="account-select-modal" class="modal" style="display: none;">
                    <div class="modal-content modal-sm">
                        <div class="modal-header">
                            <h3>Seleccionar Cuenta</h3>
                            <button onclick="FinanceReports.closeAccountModal()" class="btn-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <input type="text" id="account-search" placeholder="Buscar cuenta..." class="search-input" oninput="FinanceReports.filterAccounts()">
                            <div id="accounts-list" class="accounts-list"></div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .finance-reports { padding: 20px; }
                .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
                .report-card { background: white; border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
                .report-card:hover { border-color: #2196F3; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .report-card .report-icon { font-size: 48px; margin-bottom: 12px; }
                .report-card h3 { margin: 0 0 8px; color: #333; font-size: 16px; }
                .report-card p { margin: 0; color: #666; font-size: 13px; }

                .report-viewer { background: white; border-radius: 12px; padding: 24px; }
                .report-viewer-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
                .report-viewer-header h3 { flex: 1; margin: 0; }
                .btn-back { background: none; border: none; font-size: 14px; cursor: pointer; color: #2196F3; }
                .btn-icon { background: none; border: none; font-size: 20px; cursor: pointer; }

                .report-content { min-height: 400px; }
                .report-table { width: 100%; border-collapse: collapse; }
                .report-table th, .report-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
                .report-table th { background: #f8f9fa; font-weight: 600; }
                .report-table tr:hover { background: #f8f9fa; }
                .report-table .amount { text-align: right; font-family: monospace; }
                .report-table .total-row { font-weight: 700; background: #e3f2fd; }
                .report-table .subtotal-row { font-weight: 600; background: #f5f5f5; }
                .report-table .indent-1 { padding-left: 32px; }
                .report-table .indent-2 { padding-left: 56px; }
                .report-table .indent-3 { padding-left: 80px; }

                .report-header-info { display: flex; justify-content: space-between; margin-bottom: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px; }
                .report-header-info div { text-align: center; }
                .report-header-info label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
                .report-header-info span { font-weight: 600; color: #333; }

                .ratio-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
                .ratio-card { background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; }
                .ratio-card .ratio-value { font-size: 32px; font-weight: 700; color: #2196F3; }
                .ratio-card .ratio-name { font-size: 14px; color: #333; margin-top: 8px; }
                .ratio-card .ratio-status { font-size: 12px; margin-top: 4px; }
                .ratio-card .ratio-status.good { color: #4caf50; }
                .ratio-card .ratio-status.warning { color: #ff9800; }
                .ratio-card .ratio-status.danger { color: #f44336; }

                .accounts-list { max-height: 300px; overflow-y: auto; margin-top: 12px; }
                .account-option { padding: 10px; cursor: pointer; border-radius: 4px; }
                .account-option:hover { background: #f5f5f5; }
                .modal-sm .modal-content { width: 400px; }
            </style>
        `;
    }

    function generateYearOptions() {
        const currentYear = new Date().getFullYear();
        let options = '';
        for (let y = currentYear; y >= currentYear - 5; y--) {
            options += `<option value="${y}">${y}</option>`;
        }
        return options;
    }

    function generateMonthOptions() {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    }

    function setupEventListeners() {
        // Period change handlers
        document.getElementById('report-period-year')?.addEventListener('change', () => {
            if (currentReport) loadReport(currentReport);
        });
        document.getElementById('report-period-month')?.addEventListener('change', () => {
            if (currentReport) loadReport(currentReport);
        });
    }

    // =============================================
    // CARGA DE REPORTES
    // =============================================

    async function loadReport(reportType) {
        currentReport = reportType;
        const year = document.getElementById('report-period-year')?.value || new Date().getFullYear();
        const month = document.getElementById('report-period-month')?.value || '';

        // Show viewer, hide grid
        document.querySelector('.reports-grid').style.display = 'none';
        document.getElementById('report-viewer').style.display = 'block';

        const titles = {
            'balance-sheet': 'Balance General',
            'income-statement': 'Estado de Resultados',
            'cash-flow-statement': 'Estado de Flujo de Efectivo',
            'trial-balance': 'Balance de Comprobación',
            'account-ledger': 'Mayor por Cuenta',
            'cost-center-report': 'Reporte por Centro de Costo',
            'variance-analysis': 'Análisis de Desvíos',
            'ratios': 'Ratios Financieros'
        };

        document.getElementById('report-title').textContent = titles[reportType] || reportType;

        // Special case: account ledger needs account selection
        if (reportType === 'account-ledger') {
            showAccountSelectModal();
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ year });
            if (month) params.append('month', month);

            const response = await fetch(`${API_BASE}/${reportType}?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (result.success) {
                reportData = result.data;
                renderReport(reportType, result.data);
            } else {
                document.getElementById('report-content').innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #999;">
                        Error al cargar reporte: ${result.error}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading report:', error);
            document.getElementById('report-content').innerHTML = `
                <div style="padding: 40px; text-align: center; color: #999;">
                    Error de conexión al cargar reporte
                </div>
            `;
        }
    }

    function renderReport(type, data) {
        const container = document.getElementById('report-content');

        switch (type) {
            case 'balance-sheet':
                container.innerHTML = renderBalanceSheet(data);
                break;
            case 'income-statement':
                container.innerHTML = renderIncomeStatement(data);
                break;
            case 'cash-flow-statement':
                container.innerHTML = renderCashFlowStatement(data);
                break;
            case 'trial-balance':
                container.innerHTML = renderTrialBalance(data);
                break;
            case 'cost-center-report':
                container.innerHTML = renderCostCenterReport(data);
                break;
            case 'variance-analysis':
                container.innerHTML = renderVarianceAnalysis(data);
                break;
            case 'ratios':
                container.innerHTML = renderRatios(data);
                break;
            default:
                container.innerHTML = '<p>Reporte no disponible</p>';
        }
    }

    // =============================================
    // RENDERIZADO DE REPORTES
    // =============================================

    function renderBalanceSheet(data) {
        const { assets, liabilities, equity, totals, period } = data;

        return `
            <div class="report-header-info">
                <div><label>Empresa</label><span>${data.company_name || 'N/A'}</span></div>
                <div><label>Período</label><span>${period || 'N/A'}</span></div>
                <div><label>Moneda</label><span>ARS</span></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <!-- ACTIVO -->
                <div>
                    <h4 style="margin-bottom: 12px;">ACTIVO</h4>
                    <table class="report-table">
                        <tbody>
                            ${renderAccountSection(assets?.current, 'Activo Corriente')}
                            ${renderAccountSection(assets?.non_current, 'Activo No Corriente')}
                            <tr class="total-row">
                                <td>TOTAL ACTIVO</td>
                                <td class="amount">${formatCurrency(totals?.total_assets || 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- PASIVO + PATRIMONIO -->
                <div>
                    <h4 style="margin-bottom: 12px;">PASIVO + PATRIMONIO NETO</h4>
                    <table class="report-table">
                        <tbody>
                            ${renderAccountSection(liabilities?.current, 'Pasivo Corriente')}
                            ${renderAccountSection(liabilities?.non_current, 'Pasivo No Corriente')}
                            <tr class="subtotal-row">
                                <td>TOTAL PASIVO</td>
                                <td class="amount">${formatCurrency(totals?.total_liabilities || 0)}</td>
                            </tr>
                            ${renderAccountSection(equity, 'Patrimonio Neto')}
                            <tr class="total-row">
                                <td>TOTAL PASIVO + PN</td>
                                <td class="amount">${formatCurrency(totals?.total_liabilities_equity || 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderIncomeStatement(data) {
        const { revenue, costs, operating_expenses, other_income_expenses, totals, period } = data;

        return `
            <div class="report-header-info">
                <div><label>Empresa</label><span>${data.company_name || 'N/A'}</span></div>
                <div><label>Período</label><span>${period || 'N/A'}</span></div>
                <div><label>Moneda</label><span>ARS</span></div>
            </div>

            <table class="report-table">
                <tbody>
                    ${renderAccountSection(revenue, 'Ingresos')}
                    <tr class="subtotal-row">
                        <td>INGRESOS TOTALES</td>
                        <td class="amount">${formatCurrency(totals?.total_revenue || 0)}</td>
                    </tr>

                    ${renderAccountSection(costs, 'Costo de Ventas')}
                    <tr class="subtotal-row">
                        <td>UTILIDAD BRUTA</td>
                        <td class="amount">${formatCurrency(totals?.gross_profit || 0)}</td>
                    </tr>

                    ${renderAccountSection(operating_expenses, 'Gastos Operativos')}
                    <tr class="subtotal-row">
                        <td>UTILIDAD OPERATIVA (EBIT)</td>
                        <td class="amount">${formatCurrency(totals?.operating_income || 0)}</td>
                    </tr>

                    ${renderAccountSection(other_income_expenses, 'Otros Ingresos/Egresos')}

                    <tr class="total-row">
                        <td>UTILIDAD NETA</td>
                        <td class="amount" style="color: ${(totals?.net_income || 0) >= 0 ? '#4caf50' : '#f44336'}">
                            ${formatCurrency(totals?.net_income || 0)}
                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    function renderCashFlowStatement(data) {
        const { operating, investing, financing, totals, period } = data;

        return `
            <div class="report-header-info">
                <div><label>Empresa</label><span>${data.company_name || 'N/A'}</span></div>
                <div><label>Período</label><span>${period || 'N/A'}</span></div>
                <div><label>Moneda</label><span>ARS</span></div>
            </div>

            <table class="report-table">
                <tbody>
                    <tr class="subtotal-row"><td colspan="2">ACTIVIDADES OPERATIVAS</td></tr>
                    ${renderCashFlowItems(operating)}
                    <tr class="subtotal-row">
                        <td>Flujo neto de actividades operativas</td>
                        <td class="amount">${formatCurrency(totals?.operating_total || 0)}</td>
                    </tr>

                    <tr class="subtotal-row"><td colspan="2">ACTIVIDADES DE INVERSIÓN</td></tr>
                    ${renderCashFlowItems(investing)}
                    <tr class="subtotal-row">
                        <td>Flujo neto de actividades de inversión</td>
                        <td class="amount">${formatCurrency(totals?.investing_total || 0)}</td>
                    </tr>

                    <tr class="subtotal-row"><td colspan="2">ACTIVIDADES DE FINANCIAMIENTO</td></tr>
                    ${renderCashFlowItems(financing)}
                    <tr class="subtotal-row">
                        <td>Flujo neto de actividades de financiamiento</td>
                        <td class="amount">${formatCurrency(totals?.financing_total || 0)}</td>
                    </tr>

                    <tr class="total-row">
                        <td>VARIACIÓN NETA DEL EFECTIVO</td>
                        <td class="amount">${formatCurrency(totals?.net_change || 0)}</td>
                    </tr>
                    <tr>
                        <td>Efectivo al inicio</td>
                        <td class="amount">${formatCurrency(totals?.opening_cash || 0)}</td>
                    </tr>
                    <tr class="total-row">
                        <td>EFECTIVO AL CIERRE</td>
                        <td class="amount">${formatCurrency(totals?.closing_cash || 0)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    function renderTrialBalance(data) {
        const { accounts, totals, period } = data;

        return `
            <div class="report-header-info">
                <div><label>Empresa</label><span>${data.company_name || 'N/A'}</span></div>
                <div><label>Período</label><span>${period || 'N/A'}</span></div>
            </div>

            <table class="report-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Cuenta</th>
                        <th class="amount">Débitos</th>
                        <th class="amount">Créditos</th>
                        <th class="amount">Saldo Deudor</th>
                        <th class="amount">Saldo Acreedor</th>
                    </tr>
                </thead>
                <tbody>
                    ${(accounts || []).map(acc => `
                        <tr class="${acc.is_header ? 'subtotal-row' : ''}">
                            <td>${acc.account_code}</td>
                            <td class="indent-${(acc.level || 1) - 1}">${acc.name}</td>
                            <td class="amount">${formatCurrency(acc.total_debit || 0)}</td>
                            <td class="amount">${formatCurrency(acc.total_credit || 0)}</td>
                            <td class="amount">${acc.debit_balance > 0 ? formatCurrency(acc.debit_balance) : ''}</td>
                            <td class="amount">${acc.credit_balance > 0 ? formatCurrency(acc.credit_balance) : ''}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td colspan="2">TOTALES</td>
                        <td class="amount">${formatCurrency(totals?.total_debits || 0)}</td>
                        <td class="amount">${formatCurrency(totals?.total_credits || 0)}</td>
                        <td class="amount">${formatCurrency(totals?.total_debit_balance || 0)}</td>
                        <td class="amount">${formatCurrency(totals?.total_credit_balance || 0)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    function renderCostCenterReport(data) {
        const { cost_centers, period } = data;

        return `
            <div class="report-header-info">
                <div><label>Empresa</label><span>${data.company_name || 'N/A'}</span></div>
                <div><label>Período</label><span>${period || 'N/A'}</span></div>
            </div>

            <table class="report-table">
                <thead>
                    <tr>
                        <th>Centro de Costo</th>
                        <th class="amount">Presupuesto</th>
                        <th class="amount">Real</th>
                        <th class="amount">Desvío</th>
                        <th class="amount">%</th>
                    </tr>
                </thead>
                <tbody>
                    ${(cost_centers || []).map(cc => `
                        <tr class="level-${cc.level || 1}">
                            <td class="indent-${(cc.level || 1) - 1}">${cc.code} - ${cc.name}</td>
                            <td class="amount">${formatCurrency(cc.budget || 0)}</td>
                            <td class="amount">${formatCurrency(cc.actual || 0)}</td>
                            <td class="amount" style="color: ${(cc.variance || 0) <= 0 ? '#4caf50' : '#f44336'}">
                                ${formatCurrency(cc.variance || 0)}
                            </td>
                            <td class="amount" style="color: ${(cc.variance_percent || 0) <= 0 ? '#4caf50' : '#f44336'}">
                                ${(cc.variance_percent || 0).toFixed(1)}%
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function renderVarianceAnalysis(data) {
        const { accounts, summary, period } = data;

        return `
            <div class="report-header-info">
                <div><label>Empresa</label><span>${data.company_name || 'N/A'}</span></div>
                <div><label>Período</label><span>${period || 'N/A'}</span></div>
                <div><label>Desvío Total</label><span style="color: ${(summary?.total_variance || 0) <= 0 ? '#4caf50' : '#f44336'}">${formatCurrency(summary?.total_variance || 0)}</span></div>
            </div>

            <table class="report-table">
                <thead>
                    <tr>
                        <th>Cuenta</th>
                        <th class="amount">Presupuesto</th>
                        <th class="amount">Real</th>
                        <th class="amount">Desvío</th>
                        <th class="amount">%</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${(accounts || []).map(acc => {
                        const variancePercent = acc.variance_percent || 0;
                        let status = '✅ OK';
                        let statusColor = '#4caf50';
                        if (Math.abs(variancePercent) > 10) {
                            status = '⚠️ Alerta';
                            statusColor = '#ff9800';
                        }
                        if (Math.abs(variancePercent) > 20) {
                            status = '🚨 Crítico';
                            statusColor = '#f44336';
                        }

                        return `
                            <tr>
                                <td>${acc.account_code} - ${acc.name}</td>
                                <td class="amount">${formatCurrency(acc.budget || 0)}</td>
                                <td class="amount">${formatCurrency(acc.actual || 0)}</td>
                                <td class="amount" style="color: ${(acc.variance || 0) <= 0 ? '#4caf50' : '#f44336'}">
                                    ${formatCurrency(acc.variance || 0)}
                                </td>
                                <td class="amount">${variancePercent.toFixed(1)}%</td>
                                <td style="color: ${statusColor}">${status}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    function renderRatios(data) {
        const { ratios } = data;

        const ratioConfig = {
            current_ratio: { name: 'Ratio de Liquidez', good: [1.5, 3], format: 'decimal' },
            quick_ratio: { name: 'Prueba Ácida', good: [1, 2], format: 'decimal' },
            debt_ratio: { name: 'Ratio de Endeudamiento', good: [0, 0.5], format: 'percent' },
            roe: { name: 'ROE', good: [0.1, 1], format: 'percent' },
            roa: { name: 'ROA', good: [0.05, 0.5], format: 'percent' },
            gross_margin: { name: 'Margen Bruto', good: [0.2, 1], format: 'percent' },
            net_margin: { name: 'Margen Neto', good: [0.05, 0.5], format: 'percent' },
            dso: { name: 'DSO (Días de Cobro)', good: [0, 45], format: 'days' },
            dpo: { name: 'DPO (Días de Pago)', good: [30, 90], format: 'days' },
            cash_conversion: { name: 'Ciclo de Conversión', good: [0, 60], format: 'days' }
        };

        return `
            <div class="ratio-grid">
                ${Object.entries(ratios || {}).map(([key, value]) => {
                    const config = ratioConfig[key] || { name: key, good: [0, 100], format: 'decimal' };
                    const formatted = formatRatioValue(value, config.format);
                    const status = getRatioStatus(value, config.good);

                    return `
                        <div class="ratio-card">
                            <div class="ratio-value">${formatted}</div>
                            <div class="ratio-name">${config.name}</div>
                            <div class="ratio-status ${status.class}">${status.text}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // =============================================
    // HELPERS DE RENDERIZADO
    // =============================================

    function renderAccountSection(accounts, title) {
        if (!accounts || accounts.length === 0) return '';

        let html = `<tr class="subtotal-row"><td colspan="2">${title}</td></tr>`;

        accounts.forEach(acc => {
            html += `
                <tr>
                    <td class="indent-1">${acc.name}</td>
                    <td class="amount">${formatCurrency(acc.balance || 0)}</td>
                </tr>
            `;
        });

        const subtotal = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
        html += `
            <tr class="subtotal-row">
                <td>Total ${title}</td>
                <td class="amount">${formatCurrency(subtotal)}</td>
            </tr>
        `;

        return html;
    }

    function renderCashFlowItems(items) {
        if (!items || items.length === 0) return '';

        return items.map(item => `
            <tr>
                <td class="indent-1">${item.description}</td>
                <td class="amount" style="color: ${item.amount >= 0 ? '#4caf50' : '#f44336'}">
                    ${formatCurrency(item.amount || 0)}
                </td>
            </tr>
        `).join('');
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(amount);
    }

    function formatRatioValue(value, format) {
        switch (format) {
            case 'percent':
                return (value * 100).toFixed(1) + '%';
            case 'days':
                return Math.round(value) + ' días';
            default:
                return value.toFixed(2);
        }
    }

    function getRatioStatus(value, goodRange) {
        if (value >= goodRange[0] && value <= goodRange[1]) {
            return { class: 'good', text: '✅ Óptimo' };
        } else if (value < goodRange[0] * 0.7 || value > goodRange[1] * 1.3) {
            return { class: 'danger', text: '🚨 Crítico' };
        } else {
            return { class: 'warning', text: '⚠️ Atención' };
        }
    }

    // =============================================
    // MAYOR POR CUENTA
    // =============================================

    let allAccounts = [];

    async function showAccountSelectModal() {
        document.getElementById('account-select-modal').style.display = 'flex';
        await loadAccountsForSelection();
    }

    async function loadAccountsForSelection() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/finance/accounts/chart', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                allAccounts = result.data.filter(a => !a.is_header);
                renderAccountsList(allAccounts);
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }

    function renderAccountsList(accounts) {
        const container = document.getElementById('accounts-list');
        container.innerHTML = accounts.map(a => `
            <div class="account-option" onclick="FinanceReports.selectAccountForLedger(${a.id}, '${a.account_code}', '${a.name}')">
                <strong>${a.account_code}</strong> - ${a.name}
            </div>
        `).join('');
    }

    function filterAccounts() {
        const search = document.getElementById('account-search')?.value?.toLowerCase() || '';
        const filtered = allAccounts.filter(a =>
            a.account_code.toLowerCase().includes(search) ||
            a.name.toLowerCase().includes(search)
        );
        renderAccountsList(filtered);
    }

    async function selectAccountForLedger(accountId, code, name) {
        closeAccountModal();

        document.getElementById('report-title').textContent = `Mayor: ${code} - ${name}`;

        try {
            const token = localStorage.getItem('token');
            const year = document.getElementById('report-period-year')?.value || new Date().getFullYear();
            const month = document.getElementById('report-period-month')?.value || '';

            const params = new URLSearchParams({ year, account_id: accountId });
            if (month) params.append('month', month);

            const response = await fetch(`${API_BASE}/account-ledger?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (result.success) {
                renderAccountLedger(result.data);
            }
        } catch (error) {
            console.error('Error loading ledger:', error);
        }
    }

    function renderAccountLedger(data) {
        const container = document.getElementById('report-content');
        const { movements, opening_balance, closing_balance } = data;

        container.innerHTML = `
            <div class="report-header-info">
                <div><label>Saldo Inicial</label><span>${formatCurrency(opening_balance || 0)}</span></div>
                <div><label>Saldo Final</label><span>${formatCurrency(closing_balance || 0)}</span></div>
            </div>

            <table class="report-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Asiento</th>
                        <th>Descripción</th>
                        <th class="amount">Débito</th>
                        <th class="amount">Crédito</th>
                        <th class="amount">Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="5"><em>Saldo inicial</em></td>
                        <td class="amount">${formatCurrency(opening_balance || 0)}</td>
                    </tr>
                    ${(movements || []).map(m => `
                        <tr>
                            <td>${new Date(m.date).toLocaleDateString('es-AR')}</td>
                            <td>${m.entry_number}</td>
                            <td>${m.description}</td>
                            <td class="amount">${m.debit > 0 ? formatCurrency(m.debit) : ''}</td>
                            <td class="amount">${m.credit > 0 ? formatCurrency(m.credit) : ''}</td>
                            <td class="amount">${formatCurrency(m.running_balance)}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td colspan="5">Saldo final</td>
                        <td class="amount">${formatCurrency(closing_balance || 0)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    function closeAccountModal() {
        document.getElementById('account-select-modal').style.display = 'none';
    }

    // =============================================
    // ACCIONES
    // =============================================

    function closeReport() {
        currentReport = null;
        reportData = null;
        document.querySelector('.reports-grid').style.display = 'grid';
        document.getElementById('report-viewer').style.display = 'none';
    }

    async function exportReport(format) {
        if (!currentReport || !reportData) {
            alert('Primero seleccione un reporte');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const year = document.getElementById('report-period-year')?.value;
            const month = document.getElementById('report-period-month')?.value;

            const response = await fetch(`${API_BASE}/${currentReport}/export?format=${format}&year=${year}${month ? '&month=' + month : ''}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentReport}-${year}${month ? '-' + month : ''}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
                a.click();
            } else {
                alert('Error al exportar reporte');
            }
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Error al exportar');
        }
    }

    function printReport() {
        window.print();
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    return {
        init,
        loadReport,
        closeReport,
        exportReport,
        printReport,
        filterAccounts,
        selectAccountForLedger,
        closeAccountModal
    };

})();
