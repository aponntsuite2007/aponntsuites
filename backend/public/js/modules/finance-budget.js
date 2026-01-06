/**
 * Finance Budget Module
 * Presupuestos con generación inteligente, inflación e inversiones
 */

// ============================================================================
// 💡 SISTEMA DE AYUDA CONTEXTUAL
// ============================================================================
if (typeof ModuleHelpSystem !== 'undefined') {
    ModuleHelpSystem.registerModule('finance-budget', {
        moduleName: 'Presupuestos Financieros',
        moduleDescription: 'Gestión de presupuestos con generación inteligente, inflación e inversiones',
        contexts: {
            list: {
                title: 'Lista de Presupuestos',
                description: 'Vista general de todos los presupuestos creados',
                tips: [
                    'Filtra presupuestos por año usando el selector superior',
                    'Puedes generar un presupuesto automáticamente desde datos históricos',
                    'Click en un presupuesto para ver su detalle y ejecución'
                ],
                warnings: [
                    'Los presupuestos generados automáticamente requieren revisión antes de aprobar'
                ],
                helpTopics: [
                    '¿Cómo crear un nuevo presupuesto?',
                    '¿Qué es la generación inteligente?',
                    '¿Cómo funciona el ajuste por inflación?'
                ],
                fieldHelp: {}
            },
            lines: {
                title: 'Líneas Presupuestarias',
                description: 'Detalle de ingresos y gastos por cuenta contable',
                tips: [
                    'Cada línea representa un rubro de ingreso o gasto',
                    'Puedes modificar los montos mensuales individualmente',
                    'Los totales se calculan automáticamente'
                ],
                warnings: [
                    'Verifica que las cuentas contables estén creadas antes de agregar líneas'
                ],
                helpTopics: [
                    '¿Cómo agregar una nueva línea?',
                    '¿Cómo distribuir un monto anualmente?',
                    '¿Qué es el plan de cuentas?'
                ],
                fieldHelp: {
                    account: 'Cuenta contable del plan de cuentas (ingresos o gastos)',
                    type: 'Tipo de línea: ingreso o gasto',
                    monthly: 'Monto presupuestado para cada mes',
                    total: 'Total anual de la línea presupuestaria'
                }
            },
            investments: {
                title: 'Inversiones de Capital',
                description: 'Gestión de inversiones e CAPEX (Capital Expenditure)',
                tips: [
                    'Registra inversiones en activos fijos: maquinaria, equipos, infraestructura',
                    'Define la depreciación para distribuir el costo en el tiempo',
                    'Las inversiones impactan el flujo de caja pero no el P&L inmediato'
                ],
                warnings: [
                    'Las inversiones afectan el flujo de caja en el mes de compra',
                    'La depreciación se calcula automáticamente según vida útil'
                ],
                helpTopics: [
                    '¿Qué es una inversión de capital?',
                    '¿Cómo se calcula la depreciación?',
                    '¿Cómo afecta el presupuesto?'
                ],
                fieldHelp: {
                    description: 'Descripción del activo a adquirir',
                    amount: 'Monto total de la inversión',
                    date: 'Fecha estimada de compra',
                    usefulLife: 'Vida útil en años para depreciación',
                    depreciation: 'Método de depreciación (lineal, acelerada)'
                }
            },
            execution: {
                title: 'Ejecución Presupuestaria',
                description: 'Seguimiento de presupuesto vs. real',
                tips: [
                    'Compara los montos presupuestados vs. gastos/ingresos reales',
                    'Los porcentajes de ejecución muestran el avance',
                    'Las variaciones se destacan en rojo (sobregasto) o verde (ahorro)'
                ],
                warnings: [
                    'Las variaciones superiores al 10% requieren justificación'
                ],
                helpTopics: [
                    '¿Cómo se calcula la ejecución?',
                    '¿Qué hacer ante sobregiros?',
                    '¿Cómo generar reportes de ejecución?'
                ],
                fieldHelp: {
                    budgeted: 'Monto presupuestado originalmente',
                    actual: 'Gasto o ingreso real registrado',
                    variance: 'Diferencia entre presupuestado y real',
                    percentage: 'Porcentaje de ejecución del presupuesto'
                }
            },
            projection: {
                title: 'Proyección Financiera',
                description: 'Proyecciones y escenarios futuros con inflación',
                tips: [
                    'Proyecta el presupuesto a 12, 24 o 36 meses',
                    'Aplica tasas de inflación estimadas por categoría',
                    'Compara escenarios: optimista, base, pesimista'
                ],
                warnings: [
                    'Las proyecciones son estimaciones basadas en datos históricos',
                    'Revisa periódicamente y ajusta según contexto económico'
                ],
                helpTopics: [
                    '¿Cómo generar una proyección?',
                    '¿Qué es el análisis de escenarios?',
                    '¿Cómo ajustar por inflación?'
                ],
                fieldHelp: {
                    inflationRate: 'Tasa de inflación anual estimada (%)',
                    growthRate: 'Tasa de crecimiento de ingresos (%)',
                    scenario: 'Escenario de proyección (optimista, base, pesimista)'
                }
            }
        },
        fallbackResponses: {
            'generar': 'Usa el botón "Generar desde Histórico" para crear un presupuesto basado en datos del año anterior con ajuste por inflación.',
            'inflación': 'El sistema puede ajustar los montos automáticamente según una tasa de inflación estimada. Define la tasa al generar o proyectar.',
            'inversión': 'Las inversiones de capital se registran en la pestaña "Inversiones". Afectan el flujo de caja pero se deprecian en el tiempo.',
            'ejecución': 'Revisa la ejecución en la pestaña "Ejecución" para comparar presupuesto vs. real.',
            'proyección': 'En la pestaña "Proyección" puedes simular escenarios futuros con diferentes tasas de inflación y crecimiento.'
        }
    });
}

window.FinanceBudget = (function() {
    'use strict';

    const API_BASE = '/api/finance/budget';
    let budgets = [];
    let currentBudget = null;

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    async function init(container) {
        console.log('📈 Inicializando Presupuestos...');

        // Inicializar sistema de ayuda contextual
        if (typeof ModuleHelpSystem !== 'undefined') {
            ModuleHelpSystem.init('finance-budget');
        }

        container.innerHTML = renderStructure();
        await loadBudgets();

        console.log('✅ Presupuestos inicializado');
    }

    function renderStructure() {
        return `
            <div class="finance-module">
                <div class="module-header">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <button onclick="window.showModuleContent('finance-dashboard', 'Finance Dashboard')" class="finance-back-btn">
                            ← Volver a Finance
                        </button>
                        <h2>📈 Presupuestos</h2>
                    </div>
                    <div class="header-actions">
                        <select id="budget-year-filter" class="filter-select" onchange="FinanceBudget.filterBudgets()">
                            ${generateYearOptions()}
                        </select>
                        <button onclick="FinanceBudget.showGenerateModal()" class="btn-secondary">
                            🪄 Generar desde Histórico
                        </button>
                        <button onclick="FinanceBudget.showCreateModal()" class="btn-primary">
                            + Nuevo Presupuesto
                        </button>
                    </div>
                </div>

                <div class="module-content">
                    <!-- Lista de Presupuestos -->
                    <div id="budgets-list" class="budgets-grid"></div>

                    <!-- Detalle del Presupuesto Seleccionado -->
                    <div id="budget-detail" style="display: none;">
                        <div class="detail-header">
                            <button onclick="FinanceBudget.backToList()" class="btn-link">← Volver</button>
                            <h3 id="budget-detail-title"></h3>
                            <div class="detail-actions">
                                <button onclick="FinanceBudget.showAddLineModal()" class="btn-secondary">+ Agregar Línea</button>
                                <button onclick="FinanceBudget.showAddInvestmentModal()" class="btn-secondary">+ Inversión</button>
                                <button onclick="FinanceBudget.viewExecution()" class="btn-primary">📊 Ver Ejecución</button>
                            </div>
                        </div>

                        <!-- Tabs -->
                        <div class="budget-tabs">
                            <button class="tab-btn active" onclick="FinanceBudget.switchTab('lines')">📋 Líneas</button>
                            <button class="tab-btn" onclick="FinanceBudget.switchTab('investments')">💰 Inversiones</button>
                            <button class="tab-btn" onclick="FinanceBudget.switchTab('execution')">📊 Ejecución</button>
                            <button class="tab-btn" onclick="FinanceBudget.switchTab('projection')">🔮 Proyección</button>
                        </div>

                        <div id="budget-tab-content" class="tab-content"></div>
                    </div>
                </div>

                <!-- Modal Crear Presupuesto -->
                <div id="budget-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="budget-modal-title">Nuevo Presupuesto</h3>
                            <button onclick="FinanceBudget.closeModal('budget')" class="btn-close">&times;</button>
                        </div>
                        <form id="budget-form" onsubmit="return FinanceBudget.saveBudget(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Código *</label>
                                    <input type="text" name="budget_code" required placeholder="PPTO-2025">
                                </div>
                                <div class="form-group">
                                    <label>Nombre *</label>
                                    <input type="text" name="name" required placeholder="Presupuesto Operativo 2025">
                                </div>
                                <div class="form-group">
                                    <label>Año Fiscal *</label>
                                    <input type="number" name="fiscal_year" required value="${new Date().getFullYear() + 1}">
                                </div>
                                <div class="form-group">
                                    <label>Categoría *</label>
                                    <select name="category" required>
                                        <option value="operational">Operativo</option>
                                        <option value="capital">Capital (CAPEX)</option>
                                        <option value="cash_flow">Flujo de Caja</option>
                                        <option value="master">Maestro</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Tasa de Inflación Anual (%)</label>
                                    <input type="number" name="inflation_rate" step="0.1" value="0" min="0" max="200">
                                </div>
                                <div class="form-group">
                                    <label>Tasa de Crecimiento (%)</label>
                                    <input type="number" name="growth_rate" step="0.1" value="0" min="-50" max="100">
                                </div>
                                <div class="form-group full-width">
                                    <label>Descripción</label>
                                    <textarea name="description" rows="2"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" onclick="FinanceBudget.closeModal('budget')" class="btn-secondary">Cancelar</button>
                                <button type="submit" class="btn-primary">Crear Presupuesto</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Modal Generar desde Histórico -->
                <div id="generate-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>🪄 Generar Presupuesto desde Histórico</h3>
                            <button onclick="FinanceBudget.closeModal('generate')" class="btn-close">&times;</button>
                        </div>
                        <form id="generate-form" onsubmit="return FinanceBudget.generateFromHistorical(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Año Objetivo *</label>
                                    <input type="number" name="targetYear" required value="${new Date().getFullYear() + 1}">
                                </div>
                                <div class="form-group">
                                    <label>Tasa de Inflación Anual (%)</label>
                                    <input type="number" name="inflationRate" step="0.1" value="30" min="0" max="200">
                                </div>
                                <div class="form-group">
                                    <label>Tasa de Crecimiento (%)</label>
                                    <input type="number" name="growthRate" step="0.1" value="5" min="-50" max="100">
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="excludeOneTime" checked>
                                        Excluir gastos extraordinarios
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="adjustSeasonality" checked>
                                        Ajustar estacionalidad
                                    </label>
                                </div>
                            </div>
                            <div class="info-box">
                                <p>ℹ️ El sistema analizará los datos del año anterior y generará automáticamente las líneas de presupuesto aplicando:</p>
                                <ul>
                                    <li>Ajuste por inflación mensual compuesta</li>
                                    <li>Factor de crecimiento global</li>
                                    <li>Distribución estacional basada en histórico</li>
                                </ul>
                            </div>
                            <div class="modal-footer">
                                <button type="button" onclick="FinanceBudget.closeModal('generate')" class="btn-secondary">Cancelar</button>
                                <button type="submit" class="btn-primary">🪄 Generar Presupuesto</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Modal Agregar Línea -->
                <div id="line-modal" class="modal" style="display: none;">
                    <div class="modal-content modal-wide">
                        <div class="modal-header">
                            <h3>Agregar Línea de Presupuesto</h3>
                            <button onclick="FinanceBudget.closeModal('line')" class="btn-close">&times;</button>
                        </div>
                        <form id="line-form" onsubmit="return FinanceBudget.saveLine(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Cuenta Contable *</label>
                                    <select name="account_id" id="line-account-select" required></select>
                                </div>
                                <div class="form-group">
                                    <label>Centro de Costo</label>
                                    <select name="cost_center_id" id="line-cc-select"></select>
                                </div>
                                <div class="form-group">
                                    <label>Tipo *</label>
                                    <select name="line_type" required>
                                        <option value="expense">Gasto</option>
                                        <option value="revenue">Ingreso</option>
                                    </select>
                                </div>
                            </div>

                            <h4>Montos por Período</h4>
                            <div class="periods-grid">
                                ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `
                                    <div class="period-input">
                                        <label>${getMonthName(m)}</label>
                                        <input type="number" name="period_${m.toString().padStart(2,'0')}" step="0.01" value="0">
                                    </div>
                                `).join('')}
                            </div>

                            <div class="form-group full-width">
                                <label>Notas</label>
                                <textarea name="notes" rows="2"></textarea>
                            </div>

                            <div class="modal-footer">
                                <button type="button" onclick="FinanceBudget.closeModal('line')" class="btn-secondary">Cancelar</button>
                                <button type="submit" class="btn-primary">Guardar Línea</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>
                .budgets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 16px; }
                .budget-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
                .budget-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
                .budget-card .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
                .budget-card .budget-name { font-size: 18px; font-weight: 600; color: #333; margin: 0; }
                .budget-card .budget-year { font-size: 14px; color: #666; }
                .budget-card .budget-status { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
                .budget-card .status-draft { background: #ffeaa7; color: #d68910; }
                .budget-card .status-active { background: #d5f5e3; color: #27ae60; }
                .budget-card .status-closed { background: #fadbd8; color: #c0392b; }
                .budget-card .budget-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
                .budget-card .stat { text-align: center; }
                .budget-card .stat-value { font-size: 20px; font-weight: 700; color: #2196F3; }
                .budget-card .stat-label { font-size: 11px; color: #999; }

                .detail-header { display: flex; align-items: center; gap: 20px; padding: 16px 0; border-bottom: 1px solid #eee; }
                .detail-header h3 { flex: 1; margin: 0; }
                .detail-actions { display: flex; gap: 12px; }

                .budget-tabs { display: flex; gap: 8px; padding: 16px 0; }
                .tab-btn { padding: 10px 20px; border: none; background: #f5f5f5; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
                .tab-btn.active { background: #2196F3; color: white; }
                .tab-content { background: white; border-radius: 8px; padding: 20px; min-height: 400px; }

                .periods-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 16px 0; }
                .period-input { display: flex; flex-direction: column; gap: 4px; }
                .period-input label { font-size: 11px; color: #666; }
                .period-input input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; text-align: right; }

                .modal-wide { width: 800px; max-width: 90vw; }

                .info-box { background: #e3f2fd; border-radius: 8px; padding: 16px; margin: 16px 0; }
                .info-box p { margin: 0 0 8px; }
                .info-box ul { margin: 0; padding-left: 20px; }

                .btn-link { background: none; border: none; color: #2196F3; cursor: pointer; font-size: 14px; }
            </style>
        `;
    }

    function generateYearOptions() {
        const currentYear = new Date().getFullYear();
        let options = '';
        for (let y = currentYear + 1; y >= currentYear - 2; y--) {
            options += `<option value="${y}">${y}</option>`;
        }
        return options;
    }

    function getMonthName(m) {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return months[m - 1];
    }

    // =============================================
    // CARGA DE DATOS
    // =============================================

    async function loadBudgets() {
        try {
            const year = document.getElementById('budget-year-filter')?.value;
            const params = year ? `?fiscal_year=${year}` : '';

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/list${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                budgets = result.data;
                renderBudgetsList();
            }
        } catch (error) {
            console.error('Error loading budgets:', error);
        }
    }

    function renderBudgetsList() {
        const container = document.getElementById('budgets-list');
        if (!container) return;

        if (budgets.length === 0) {
            container.innerHTML = `
                <div style="grid-column: span 3; text-align: center; padding: 60px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📈</div>
                    <p>No hay presupuestos para el año seleccionado</p>
                    <button onclick="FinanceBudget.showCreateModal()" class="btn-primary" style="margin-top: 16px;">
                        Crear Presupuesto
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = budgets.map(budget => `
            <div class="budget-card" onclick="FinanceBudget.selectBudget(${budget.id})">
                <div class="card-header">
                    <div>
                        <h4 class="budget-name">${budget.name}</h4>
                        <span class="budget-year">${budget.budget_code} | ${budget.fiscal_year}</span>
                    </div>
                    <span class="budget-status status-${budget.status}">${getStatusLabel(budget.status)}</span>
                </div>
                <div class="budget-stats">
                    <div class="stat">
                        <div class="stat-value">${formatCurrency(budget.total_revenue)}</div>
                        <div class="stat-label">Ingresos</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${formatCurrency(budget.total_expense)}</div>
                        <div class="stat-label">Gastos</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${formatCurrency(budget.total_capex)}</div>
                        <div class="stat-label">CAPEX</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value" style="color: ${budget.net_result >= 0 ? '#27ae60' : '#c0392b'}">
                            ${formatCurrency(budget.net_result)}
                        </div>
                        <div class="stat-label">Resultado</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function getStatusLabel(status) {
        const labels = {
            draft: 'Borrador',
            pending_approval: 'Pendiente',
            approved: 'Aprobado',
            active: 'Activo',
            closed: 'Cerrado'
        };
        return labels[status] || status;
    }

    function formatCurrency(amount) {
        if (!amount) return '$0';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(amount);
    }

    // =============================================
    // ACCIONES
    // =============================================

    function filterBudgets() {
        loadBudgets();
    }

    async function selectBudget(id) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                currentBudget = result.data;
                showBudgetDetail();
            }
        } catch (error) {
            console.error('Error loading budget:', error);
        }
    }

    function showBudgetDetail() {
        document.getElementById('budgets-list').style.display = 'none';
        document.getElementById('budget-detail').style.display = 'block';
        document.getElementById('budget-detail-title').textContent =
            `${currentBudget.name} (${currentBudget.fiscal_year})`;

        switchTab('lines');
    }

    function backToList() {
        document.getElementById('budgets-list').style.display = 'grid';
        document.getElementById('budget-detail').style.display = 'none';
        currentBudget = null;
    }

    function switchTab(tabName) {
        // Cambiar contexto de ayuda
        if (typeof ModuleHelpSystem !== 'undefined') {
            ModuleHelpSystem.setContext(tabName);
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase().includes(tabName)) {
                btn.classList.add('active');
            }
        });

        const content = document.getElementById('budget-tab-content');

        switch (tabName) {
            case 'lines':
                renderLinesTab(content);
                break;
            case 'investments':
                renderInvestmentsTab(content);
                break;
            case 'execution':
                renderExecutionTab(content);
                break;
            case 'projection':
                renderProjectionTab(content);
                break;
        }
    }

    function renderLinesTab(container) {
        const lines = currentBudget?.lines || [];
        const helpBanner = typeof ModuleHelpSystem !== 'undefined'
            ? ModuleHelpSystem.renderBanner('lines')
            : '';

        if (lines.length === 0) {
            container.innerHTML = `
                ${helpBanner}
                <div style="text-align: center; padding: 60px; color: #999;">
                    <p>No hay líneas de presupuesto</p>
                    <button onclick="FinanceBudget.showAddLineModal()" class="btn-primary">
                        + Agregar Línea
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            ${helpBanner}
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Cuenta</th>
                        <th>Centro Costo</th>
                        <th>Tipo</th>
                        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => `<th>${getMonthName(m)}</th>`).join('')}
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${lines.map(line => `
                        <tr>
                            <td>${line.account?.account_code || ''} - ${line.account?.name || ''}</td>
                            <td>${line.costCenter?.name || '-'}</td>
                            <td>${line.line_type === 'revenue' ? '📈' : '📉'}</td>
                            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m =>
                                `<td style="text-align: right;">${formatCurrency(line['period_' + m.toString().padStart(2,'0')])}</td>`
                            ).join('')}
                            <td style="text-align: right; font-weight: 600;">${formatCurrency(line.annual_total)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function renderInvestmentsTab(container) {
        const investments = currentBudget?.investments || [];
        const helpBanner = typeof ModuleHelpSystem !== 'undefined'
            ? ModuleHelpSystem.renderBanner('investments')
            : '';

        container.innerHTML = `${helpBanner}` + (investments.length ? `
            <div class="investments-grid">
                ${investments.map(inv => `
                    <div class="investment-card">
                        <div class="inv-header">
                            <h4>${inv.name}</h4>
                            <span class="inv-status status-${inv.status}">${inv.status}</span>
                        </div>
                        <div class="inv-amount">${formatCurrency(inv.total_amount)}</div>
                        <div class="inv-details">
                            <span>ROI: ${inv.expected_roi_percent || 0}%</span>
                            <span>Payback: ${inv.payback_months || 0} meses</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '<div style="text-align: center; padding: 60px; color: #999;">No hay inversiones registradas</div>');
    }

    async function renderExecutionTab(container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">Cargando ejecución...</div>';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${currentBudget.id}/execution`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                const data = result.data;
                const helpBanner = typeof ModuleHelpSystem !== 'undefined'
                    ? ModuleHelpSystem.renderBanner('execution')
                    : '';

                container.innerHTML = `
                    ${helpBanner}
                    <div class="execution-summary">
                        <div class="exec-stat">
                            <div class="exec-value">${formatCurrency(data.summary?.total_budget)}</div>
                            <div class="exec-label">Presupuesto Total</div>
                        </div>
                        <div class="exec-stat">
                            <div class="exec-value">${formatCurrency(data.summary?.total_actual)}</div>
                            <div class="exec-label">Ejecutado Real</div>
                        </div>
                        <div class="exec-stat">
                            <div class="exec-value">${data.summary?.overall_execution_percent?.toFixed(1)}%</div>
                            <div class="exec-label">% Ejecución</div>
                        </div>
                        <div class="exec-stat">
                            <div class="exec-value">${formatCurrency(data.summary?.total_available)}</div>
                            <div class="exec-label">Disponible</div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            container.innerHTML = '<div style="color: red; padding: 20px;">Error al cargar ejecución</div>';
        }
    }

    async function renderProjectionTab(container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">Cargando proyección...</div>';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${currentBudget.id}/projection`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success && result.data) {
                const data = result.data;
                const helpBanner = typeof ModuleHelpSystem !== 'undefined'
                    ? ModuleHelpSystem.renderBanner('projection')
                    : '';

                container.innerHTML = `
                    ${helpBanner}
                    <div class="projection-content">
                        <h4>🔮 Proyección de Fin de Año</h4>
                        <p>Basado en datos hasta el mes ${data.current_month}</p>

                        <div class="scenarios-grid">
                            <div class="scenario optimistic">
                                <h5>📈 Escenario Optimista</h5>
                                <div class="scenario-value">${formatCurrency(data.scenarios?.optimistic)}</div>
                            </div>
                            <div class="scenario base">
                                <h5>📊 Escenario Base</h5>
                                <div class="scenario-value">${formatCurrency(data.scenarios?.base)}</div>
                            </div>
                            <div class="scenario pessimistic">
                                <h5>📉 Escenario Pesimista</h5>
                                <div class="scenario-value">${formatCurrency(data.scenarios?.pessimistic)}</div>
                            </div>
                        </div>

                        <p style="color: #666; margin-top: 20px;">
                            Nivel de confianza: ${data.confidence_level}%
                        </p>
                    </div>
                `;
            }
        } catch (error) {
            container.innerHTML = '<div style="color: red; padding: 20px;">Error al cargar proyección</div>';
        }
    }

    // =============================================
    // MODALES Y CRUD
    // =============================================

    function showCreateModal() {
        document.getElementById('budget-modal-title').textContent = 'Nuevo Presupuesto';
        document.getElementById('budget-form').reset();
        document.getElementById('budget-modal').style.display = 'flex';
    }

    function showGenerateModal() {
        document.getElementById('generate-form').reset();
        document.getElementById('generate-modal').style.display = 'flex';
    }

    async function showAddLineModal() {
        await loadAccountsForSelect();
        await loadCostCentersForSelect();
        document.getElementById('line-form').reset();
        document.getElementById('line-modal').style.display = 'flex';
    }

    function showAddInvestmentModal() {
        alert('Modal de inversiones - Por implementar');
    }

    function closeModal(type) {
        document.getElementById(`${type}-modal`).style.display = 'none';
    }

    async function loadAccountsForSelect() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/finance/accounts/chart?is_header=false', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                const select = document.getElementById('line-account-select');
                select.innerHTML = '<option value="">Seleccionar cuenta...</option>' +
                    result.data.map(a => `<option value="${a.id}">${a.account_code} - ${a.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }

    async function loadCostCentersForSelect() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/finance/accounts/cost-centers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                const select = document.getElementById('line-cc-select');
                select.innerHTML = '<option value="">Sin centro de costo</option>' +
                    result.data.map(cc => `<option value="${cc.id}">${cc.code} - ${cc.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading cost centers:', error);
        }
    }

    async function saveBudget(event) {
        event.preventDefault();

        const form = event.target;
        const data = {
            budget_code: form.budget_code.value,
            name: form.name.value,
            fiscal_year: parseInt(form.fiscal_year.value),
            category: form.category.value,
            inflation_rate: parseFloat(form.inflation_rate.value) || 0,
            growth_rate: parseFloat(form.growth_rate.value) || 0,
            description: form.description.value,
            status: 'draft'
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                closeModal('budget');
                await loadBudgets();
                alert('Presupuesto creado correctamente');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving budget:', error);
            alert('Error al guardar');
        }
    }

    async function generateFromHistorical(event) {
        event.preventDefault();

        const form = event.target;
        const data = {
            targetYear: parseInt(form.targetYear.value),
            options: {
                inflationRate: parseFloat(form.inflationRate.value) || 0,
                growthRate: parseFloat(form.growthRate.value) || 0,
                excludeOneTime: form.excludeOneTime.checked,
                adjustSeasonality: form.adjustSeasonality.checked
            }
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/generate-from-historical`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                closeModal('generate');
                await loadBudgets();
                alert('Presupuesto generado correctamente');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error generating budget:', error);
            alert('Error al generar');
        }
    }

    async function saveLine(event) {
        event.preventDefault();

        const form = event.target;
        const data = {
            account_id: parseInt(form.account_id.value),
            cost_center_id: form.cost_center_id.value ? parseInt(form.cost_center_id.value) : null,
            line_type: form.line_type.value,
            notes: form.notes.value
        };

        // Add period values
        for (let m = 1; m <= 12; m++) {
            data[`period_${m.toString().padStart(2, '0')}`] =
                parseFloat(form[`period_${m.toString().padStart(2, '0')}`].value) || 0;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${currentBudget.id}/lines`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                closeModal('line');
                await selectBudget(currentBudget.id);
                alert('Línea agregada correctamente');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving line:', error);
            alert('Error al guardar');
        }
    }

    function viewExecution() {
        switchTab('execution');
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    return {
        init,
        filterBudgets,
        selectBudget,
        backToList,
        switchTab,
        showCreateModal,
        showGenerateModal,
        showAddLineModal,
        showAddInvestmentModal,
        closeModal,
        saveBudget,
        generateFromHistorical,
        saveLine,
        viewExecution
    };

})();
