/**
 * Finance Executive Dashboard
 * Dashboard ejecutivo completo para el responsable de finanzas
 * Dark Theme - Enterprise Level
 */

const FinanceExecutiveDashboard = {
    name: 'finance-executive-dashboard',
    currentView: 'overview',
    refreshInterval: null,
    dashboardData: null,

    // Estilos Dark Theme
    styles: `
        .finance-exec-container {
            background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
            min-height: 100vh;
            padding: 20px;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        .finance-exec-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(48, 54, 61, 0.8);
        }

        .finance-exec-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .finance-exec-title h1 {
            color: #e6edf3;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }

        .finance-exec-title .badge {
            background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }

        .finance-exec-actions {
            display: flex;
            gap: 12px;
        }

        .finance-exec-btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .finance-exec-btn.primary {
            background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
            color: white;
        }

        .finance-exec-btn.primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(35, 134, 54, 0.4);
        }

        .finance-exec-btn.secondary {
            background: rgba(48, 54, 61, 0.6);
            color: #8b949e;
            border: 1px solid rgba(48, 54, 61, 0.8);
        }

        .finance-exec-btn.secondary:hover {
            background: rgba(48, 54, 61, 0.9);
            color: #e6edf3;
        }

        /* Navigation Tabs */
        .finance-exec-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            background: rgba(22, 27, 34, 0.8);
            padding: 8px;
            border-radius: 12px;
            border: 1px solid rgba(48, 54, 61, 0.5);
        }

        .finance-exec-tab {
            padding: 12px 24px;
            background: transparent;
            color: #8b949e;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .finance-exec-tab:hover {
            background: rgba(48, 54, 61, 0.5);
            color: #e6edf3;
        }

        .finance-exec-tab.active {
            background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
            color: white;
        }

        .finance-exec-tab .count {
            background: rgba(255, 255, 255, 0.2);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 12px;
        }

        /* KPI Cards */
        .finance-kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .finance-kpi-card {
            background: linear-gradient(135deg, rgba(22, 27, 34, 0.9) 0%, rgba(13, 17, 23, 0.95) 100%);
            border: 1px solid rgba(48, 54, 61, 0.5);
            border-radius: 12px;
            padding: 20px;
            position: relative;
            overflow: hidden;
        }

        .finance-kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--kpi-color, linear-gradient(90deg, #238636, #2ea043));
        }

        .finance-kpi-card.income::before {
            --kpi-color: linear-gradient(90deg, #238636, #2ea043);
        }

        .finance-kpi-card.expense::before {
            --kpi-color: linear-gradient(90deg, #da3633, #f85149);
        }

        .finance-kpi-card.pending::before {
            --kpi-color: linear-gradient(90deg, #9e6a03, #d29922);
        }

        .finance-kpi-card.info::before {
            --kpi-color: linear-gradient(90deg, #1f6feb, #388bfd);
        }

        .finance-kpi-label {
            color: #8b949e;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .finance-kpi-value {
            color: #e6edf3;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .finance-kpi-trend {
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .finance-kpi-trend.positive {
            color: #3fb950;
        }

        .finance-kpi-trend.negative {
            color: #f85149;
        }

        /* Data Tables */
        .finance-data-section {
            background: rgba(22, 27, 34, 0.8);
            border: 1px solid rgba(48, 54, 61, 0.5);
            border-radius: 12px;
            margin-bottom: 24px;
            overflow: hidden;
        }

        .finance-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid rgba(48, 54, 61, 0.5);
            background: rgba(13, 17, 23, 0.5);
        }

        .finance-section-title {
            color: #e6edf3;
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .finance-section-title .icon {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(35, 134, 54, 0.2);
            border-radius: 8px;
            color: #3fb950;
        }

        .finance-data-table {
            width: 100%;
            border-collapse: collapse;
        }

        .finance-data-table th {
            text-align: left;
            padding: 12px 16px;
            color: #8b949e;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: rgba(13, 17, 23, 0.3);
            border-bottom: 1px solid rgba(48, 54, 61, 0.5);
        }

        .finance-data-table td {
            padding: 14px 16px;
            color: #e6edf3;
            font-size: 14px;
            border-bottom: 1px solid rgba(48, 54, 61, 0.3);
        }

        .finance-data-table tr:hover td {
            background: rgba(48, 54, 61, 0.2);
        }

        .finance-data-table tr:last-child td {
            border-bottom: none;
        }

        /* Status Badges */
        .finance-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
        }

        .finance-status.open {
            background: rgba(35, 134, 54, 0.2);
            color: #3fb950;
        }

        .finance-status.closed {
            background: rgba(110, 118, 129, 0.2);
            color: #8b949e;
        }

        .finance-status.pending {
            background: rgba(210, 153, 34, 0.2);
            color: #d29922;
        }

        .finance-status.approved {
            background: rgba(35, 134, 54, 0.2);
            color: #3fb950;
        }

        .finance-status.rejected {
            background: rgba(248, 81, 73, 0.2);
            color: #f85149;
        }

        /* Cash Register Cards Grid */
        .finance-registers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
            padding: 20px;
        }

        .finance-register-card {
            background: linear-gradient(135deg, rgba(30, 35, 42, 0.9) 0%, rgba(22, 27, 34, 0.95) 100%);
            border: 1px solid rgba(48, 54, 61, 0.5);
            border-radius: 12px;
            padding: 20px;
            transition: all 0.2s ease;
        }

        .finance-register-card:hover {
            border-color: rgba(56, 139, 253, 0.5);
            transform: translateY(-2px);
        }

        .finance-register-card.open {
            border-left: 3px solid #3fb950;
        }

        .finance-register-card.closed {
            border-left: 3px solid #8b949e;
        }

        .finance-register-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
        }

        .finance-register-name {
            color: #e6edf3;
            font-size: 16px;
            font-weight: 600;
        }

        .finance-register-code {
            color: #8b949e;
            font-size: 12px;
            margin-top: 2px;
        }

        .finance-register-balance {
            text-align: right;
        }

        .finance-register-balance .label {
            color: #8b949e;
            font-size: 11px;
        }

        .finance-register-balance .value {
            color: #3fb950;
            font-size: 20px;
            font-weight: 700;
        }

        .finance-register-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            padding-top: 16px;
            border-top: 1px solid rgba(48, 54, 61, 0.5);
        }

        .finance-register-info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .finance-register-info-item .label {
            color: #8b949e;
            font-size: 11px;
        }

        .finance-register-info-item .value {
            color: #e6edf3;
            font-size: 13px;
            font-weight: 500;
        }

        /* Approval Cards */
        .finance-approval-card {
            background: rgba(30, 35, 42, 0.9);
            border: 1px solid rgba(48, 54, 61, 0.5);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 12px;
        }

        .finance-approval-card.urgent {
            border-left: 3px solid #f85149;
        }

        .finance-approval-card.normal {
            border-left: 3px solid #d29922;
        }

        .finance-approval-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .finance-approval-type {
            color: #e6edf3;
            font-weight: 600;
        }

        .finance-approval-amount {
            color: #f85149;
            font-size: 18px;
            font-weight: 700;
        }

        .finance-approval-details {
            color: #8b949e;
            font-size: 13px;
            margin-bottom: 16px;
        }

        .finance-approval-actions {
            display: flex;
            gap: 12px;
        }

        .finance-approval-btn {
            flex: 1;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
        }

        .finance-approval-btn.approve {
            background: linear-gradient(135deg, #238636 0%, #2ea043 100%);
            color: white;
        }

        .finance-approval-btn.reject {
            background: rgba(248, 81, 73, 0.2);
            color: #f85149;
            border: 1px solid rgba(248, 81, 73, 0.3);
        }

        /* Charts Section */
        .finance-charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }

        .finance-chart-container {
            background: rgba(22, 27, 34, 0.8);
            border: 1px solid rgba(48, 54, 61, 0.5);
            border-radius: 12px;
            padding: 20px;
        }

        .finance-chart-title {
            color: #e6edf3;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
        }

        /* Authorization Timeline */
        .finance-timeline {
            padding: 20px;
        }

        .finance-timeline-item {
            display: flex;
            gap: 16px;
            padding-bottom: 20px;
            position: relative;
        }

        .finance-timeline-item:not(:last-child)::before {
            content: '';
            position: absolute;
            left: 15px;
            top: 40px;
            bottom: 0;
            width: 2px;
            background: rgba(48, 54, 61, 0.5);
        }

        .finance-timeline-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .finance-timeline-icon.success {
            background: rgba(35, 134, 54, 0.2);
            color: #3fb950;
        }

        .finance-timeline-icon.failed {
            background: rgba(248, 81, 73, 0.2);
            color: #f85149;
        }

        .finance-timeline-content {
            flex: 1;
        }

        .finance-timeline-title {
            color: #e6edf3;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 4px;
        }

        .finance-timeline-meta {
            color: #8b949e;
            font-size: 12px;
        }

        /* Loading State */
        .finance-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px;
            color: #8b949e;
        }

        .finance-loading-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(48, 54, 61, 0.5);
            border-top-color: #238636;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* Empty State */
        .finance-empty {
            text-align: center;
            padding: 60px;
            color: #8b949e;
        }

        .finance-empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .finance-exec-header {
                flex-direction: column;
                gap: 16px;
            }

            .finance-exec-tabs {
                flex-wrap: wrap;
            }

            .finance-charts-grid {
                grid-template-columns: 1fr;
            }
        }
    `,

    init() {
        this.injectStyles();
        this.render();
        this.loadDashboardData();
        this.startAutoRefresh();
    },

    injectStyles() {
        if (!document.getElementById('finance-exec-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'finance-exec-styles';
            styleEl.textContent = this.styles;
            document.head.appendChild(styleEl);
        }
    },

    render() {
        const container = document.getElementById('module-content') || document.body;
        container.innerHTML = `
            <div class="finance-exec-container">
                ${this.renderHeader()}
                ${this.renderTabs()}
                <div id="finance-exec-content">
                    ${this.renderLoading()}
                </div>
            </div>
        `;
        this.attachEventListeners();
    },

    renderHeader() {
        return `
            <div class="finance-exec-header">
                <div style="display: flex; align-items: center; gap: 24px; flex: 1;">
                    <button onclick="window.showModuleContent('finance-dashboard', 'Finance Dashboard')" class="finance-back-btn">
                        ← Volver a Finance
                    </button>
                    <div class="finance-exec-title">
                        <h1>Dashboard Ejecutivo de Finanzas</h1>
                        <span class="badge">ENTERPRISE</span>
                    </div>
                </div>
                <div class="finance-exec-actions">
                    <button class="finance-exec-btn secondary" onclick="FinanceExecutiveDashboard.exportReport()">
                        <i class="fas fa-file-export"></i> Exportar
                    </button>
                    <button class="finance-exec-btn primary" onclick="FinanceExecutiveDashboard.refreshData()">
                        <i class="fas fa-sync-alt"></i> Actualizar
                    </button>
                </div>
            </div>
        `;
    },

    renderTabs() {
        const tabs = [
            { id: 'overview', label: 'Vista General', icon: 'fas fa-chart-line' },
            { id: 'registers', label: 'Cajas', icon: 'fas fa-cash-register' },
            { id: 'approvals', label: 'Aprobaciones', icon: 'fas fa-check-circle', count: 0 },
            { id: 'movements', label: 'Movimientos', icon: 'fas fa-exchange-alt' },
            { id: 'authorizations', label: 'Autorizaciones', icon: 'fas fa-fingerprint' }
        ];

        return `
            <div class="finance-exec-tabs">
                ${tabs.map(tab => `
                    <button class="finance-exec-tab ${this.currentView === tab.id ? 'active' : ''}"
                            onclick="FinanceExecutiveDashboard.switchView('${tab.id}')">
                        <i class="${tab.icon}"></i>
                        ${tab.label}
                        ${tab.count !== undefined ? `<span class="count" id="tab-count-${tab.id}">${tab.count}</span>` : ''}
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderLoading() {
        return `
            <div class="finance-loading">
                <div class="finance-loading-spinner"></div>
                <span>Cargando datos financieros...</span>
            </div>
        `;
    },

    async loadDashboardData() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch('/api/finance/executive-dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error loading dashboard data');

            const result = await response.json();
            if (result.success) {
                this.dashboardData = result.data;
                this.updateContent();
                this.updateTabCounts();
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.renderError();
        }
    },

    updateContent() {
        const contentEl = document.getElementById('finance-exec-content');
        if (!contentEl) return;

        switch (this.currentView) {
            case 'overview':
                contentEl.innerHTML = this.renderOverview();
                break;
            case 'registers':
                contentEl.innerHTML = this.renderRegisters();
                break;
            case 'approvals':
                contentEl.innerHTML = this.renderApprovals();
                break;
            case 'movements':
                contentEl.innerHTML = this.renderMovements();
                break;
            case 'authorizations':
                contentEl.innerHTML = this.renderAuthorizations();
                break;
        }
    },

    updateTabCounts() {
        if (!this.dashboardData) return;

        const pendingCount = (this.dashboardData.pendingEgresses || 0) +
                            (this.dashboardData.pendingAdjustments || 0);

        const countEl = document.getElementById('tab-count-approvals');
        if (countEl) {
            countEl.textContent = pendingCount;
            countEl.style.display = pendingCount > 0 ? 'inline' : 'none';
        }
    },

    renderOverview() {
        const data = this.dashboardData;
        if (!data) return this.renderLoading();

        return `
            <!-- KPIs -->
            <div class="finance-kpi-grid">
                ${this.renderKpiCard('Ingresos Hoy', this.formatCurrency(data.totalIncomeToday || 0), 'income', 'fas fa-arrow-down')}
                ${this.renderKpiCard('Egresos Hoy', this.formatCurrency(data.totalExpenseToday || 0), 'expense', 'fas fa-arrow-up')}
                ${this.renderKpiCard('Pendientes', (data.pendingEgresses || 0) + (data.pendingAdjustments || 0), 'pending', 'fas fa-clock')}
                ${this.renderKpiCard('Cajas Activas', data.activeSessions?.length || 0, 'info', 'fas fa-cash-register')}
            </div>

            <!-- Charts Grid -->
            <div class="finance-charts-grid">
                ${this.renderMovementsByTypeChart()}
                ${this.renderPaymentMethodsChart()}
            </div>

            <!-- Active Sessions & Petty Cash -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                ${this.renderActiveSessionsSection()}
                ${this.renderPettyCashSection()}
            </div>
        `;
    },

    renderKpiCard(label, value, type, icon) {
        return `
            <div class="finance-kpi-card ${type}">
                <div class="finance-kpi-label">
                    <i class="${icon}"></i>
                    ${label}
                </div>
                <div class="finance-kpi-value">${value}</div>
            </div>
        `;
    },

    renderMovementsByTypeChart() {
        const movements = this.dashboardData?.todayMovements || [];

        return `
            <div class="finance-chart-container">
                <div class="finance-chart-title">Movimientos por Tipo</div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${movements.length === 0 ? '<div class="finance-empty">Sin movimientos hoy</div>' :
                      movements.map(m => this.renderMovementBar(m)).join('')}
                </div>
            </div>
        `;
    },

    renderMovementBar(movement) {
        const isIncome = ['income', 'adjustment_in', 'transfer_in'].includes(movement.movement_type);
        const color = isIncome ? '#3fb950' : '#f85149';
        const maxAmount = 100000;
        const width = Math.min((parseFloat(movement.total) / maxAmount) * 100, 100);

        return `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 100px; color: #8b949e; font-size: 12px; text-transform: capitalize;">
                    ${movement.movement_type.replace('_', ' ')}
                </div>
                <div style="flex: 1; background: rgba(48, 54, 61, 0.5); height: 24px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${width}%; height: 100%; background: ${color}; transition: width 0.5s ease;"></div>
                </div>
                <div style="width: 100px; text-align: right; color: ${color}; font-weight: 600;">
                    ${this.formatCurrency(movement.total)}
                </div>
            </div>
        `;
    },

    renderPaymentMethodsChart() {
        const methods = this.dashboardData?.movementsByPaymentMethod || [];

        return `
            <div class="finance-chart-container">
                <div class="finance-chart-title">Por Medio de Pago</div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${methods.length === 0 ? '<div class="finance-empty">Sin movimientos hoy</div>' :
                      methods.map(m => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(48, 54, 61, 0.3); border-radius: 8px;">
                            <span style="color: #e6edf3; font-weight: 500;">${m.paymentMethod?.name || 'N/A'}</span>
                            <span style="color: #3fb950; font-weight: 600;">${this.formatCurrency(m.total)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderActiveSessionsSection() {
        const sessions = this.dashboardData?.activeSessions || [];

        return `
            <div class="finance-data-section">
                <div class="finance-section-header">
                    <div class="finance-section-title">
                        <span class="icon"><i class="fas fa-play-circle"></i></span>
                        Sesiones Activas
                    </div>
                </div>
                ${sessions.length === 0 ?
                    '<div class="finance-empty">No hay sesiones activas</div>' :
                    `<table class="finance-data-table">
                        <thead>
                            <tr>
                                <th>Caja</th>
                                <th>Operador</th>
                                <th>Inicio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sessions.map(s => `
                                <tr>
                                    <td>${s.cashRegister?.name || 'N/A'}</td>
                                    <td>${s.openedByUser?.first_name || ''} ${s.openedByUser?.last_name || ''}</td>
                                    <td>${this.formatTime(s.opened_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        `;
    },

    renderPettyCashSection() {
        const funds = this.dashboardData?.pettyCashStatus || [];

        return `
            <div class="finance-data-section">
                <div class="finance-section-header">
                    <div class="finance-section-title">
                        <span class="icon"><i class="fas fa-piggy-bank"></i></span>
                        Fondos Fijos
                    </div>
                </div>
                ${funds.length === 0 ?
                    '<div class="finance-empty">No hay fondos fijos configurados</div>' :
                    `<table class="finance-data-table">
                        <thead>
                            <tr>
                                <th>Fondo</th>
                                <th>Saldo</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${funds.map(f => {
                                const percentage = (f.current_balance / f.fund_amount) * 100;
                                const isLow = f.current_balance <= f.minimum_balance;
                                return `
                                    <tr>
                                        <td>${f.name}</td>
                                        <td style="color: ${isLow ? '#f85149' : '#3fb950'};">
                                            ${this.formatCurrency(f.current_balance)}
                                        </td>
                                        <td>
                                            <span class="finance-status ${isLow ? 'pending' : 'open'}">
                                                ${isLow ? 'Bajo' : 'Normal'}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        `;
    },

    async renderRegisters() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch('/api/finance/executive-dashboard/registers-status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error loading registers');

            const result = await response.json();
            const registers = result.data || [];

            if (registers.length === 0) {
                return '<div class="finance-empty">No hay cajas configuradas</div>';
            }

            return `
                <div class="finance-registers-grid">
                    ${registers.map(r => this.renderRegisterCard(r)).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading registers:', error);
            return '<div class="finance-empty">Error al cargar las cajas</div>';
        }
    },

    renderRegisterCard(register) {
        const isOpen = register.status === 'open';

        return `
            <div class="finance-register-card ${register.status}">
                <div class="finance-register-header">
                    <div>
                        <div class="finance-register-name">${register.name}</div>
                        <div class="finance-register-code">${register.code}</div>
                    </div>
                    <div class="finance-register-balance">
                        <div class="label">Saldo actual</div>
                        <div class="value">
                            ${register.currentBalance !== null ? this.formatCurrency(register.currentBalance) : '-'}
                        </div>
                    </div>
                </div>
                <div class="finance-register-info">
                    <div class="finance-register-info-item">
                        <span class="label">Estado</span>
                        <span class="finance-status ${register.status}">
                            ${isOpen ? 'Abierta' : 'Cerrada'}
                        </span>
                    </div>
                    <div class="finance-register-info-item">
                        <span class="label">${isOpen ? 'Operador' : 'Departamento'}</span>
                        <span class="value">
                            ${isOpen ? (register.operator?.first_name + ' ' + register.operator?.last_name) : (register.department?.name || '-')}
                        </span>
                    </div>
                    ${isOpen ? `
                        <div class="finance-register-info-item">
                            <span class="label">Inicio</span>
                            <span class="value">${this.formatTime(register.openedAt)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    renderApprovals() {
        const data = this.dashboardData;
        const pendingEgresses = data?.pendingEgressRequests || [];
        const pendingAdjustments = data?.pendingAdjustmentRequests || [];

        const total = pendingEgresses.length + pendingAdjustments.length;

        if (total === 0) {
            return `
                <div class="finance-empty">
                    <div class="finance-empty-icon">
                        <i class="fas fa-check-circle" style="color: #3fb950;"></i>
                    </div>
                    <p>No hay aprobaciones pendientes</p>
                </div>
            `;
        }

        return `
            <div style="max-width: 800px; margin: 0 auto;">
                ${pendingEgresses.length > 0 ? `
                    <h3 style="color: #e6edf3; margin-bottom: 16px;">
                        <i class="fas fa-arrow-up" style="color: #f85149;"></i>
                        Egresos Pendientes (${pendingEgresses.length})
                    </h3>
                    ${pendingEgresses.map(e => this.renderApprovalCard(e, 'egress')).join('')}
                ` : ''}

                ${pendingAdjustments.length > 0 ? `
                    <h3 style="color: #e6edf3; margin-bottom: 16px; margin-top: 24px;">
                        <i class="fas fa-sliders-h" style="color: #d29922;"></i>
                        Ajustes Pendientes (${pendingAdjustments.length})
                    </h3>
                    ${pendingAdjustments.map(a => this.renderApprovalCard(a, 'adjustment')).join('')}
                ` : ''}
            </div>
        `;
    },

    renderApprovalCard(item, type) {
        return `
            <div class="finance-approval-card ${type === 'egress' ? 'urgent' : 'normal'}">
                <div class="finance-approval-header">
                    <span class="finance-approval-type">
                        ${type === 'egress' ? 'Solicitud de Egreso' : 'Solicitud de Ajuste'}
                    </span>
                    <span class="finance-approval-amount">
                        ${this.formatCurrency(item.amount)}
                    </span>
                </div>
                <div class="finance-approval-details">
                    <div><strong>Solicitante:</strong> ${item.requestedByUser?.first_name || ''} ${item.requestedByUser?.last_name || ''}</div>
                    <div><strong>Caja:</strong> ${item.cashRegister?.name || 'N/A'}</div>
                    <div><strong>Descripción:</strong> ${item.description || '-'}</div>
                    ${type === 'egress' && item.supervisor_approved_at ? `
                        <div style="margin-top: 8px; padding: 8px; background: rgba(35, 134, 54, 0.1); border-radius: 6px; border-left: 3px solid #3fb950;">
                            <i class="fas fa-check" style="color: #3fb950;"></i>
                            Aprobado por supervisor el ${this.formatDateTime(item.supervisor_approved_at)}
                        </div>
                    ` : ''}
                </div>
                <div class="finance-approval-actions">
                    <button class="finance-approval-btn approve" onclick="FinanceExecutiveDashboard.approveRequest(${item.id}, '${type}')">
                        <i class="fas fa-check"></i> Aprobar
                    </button>
                    <button class="finance-approval-btn reject" onclick="FinanceExecutiveDashboard.rejectRequest(${item.id}, '${type}')">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                </div>
            </div>
        `;
    },

    renderMovements() {
        const movements = this.dashboardData?.todayMovements || [];

        return `
            <div class="finance-data-section">
                <div class="finance-section-header">
                    <div class="finance-section-title">
                        <span class="icon"><i class="fas fa-exchange-alt"></i></span>
                        Movimientos del Día
                    </div>
                    <select id="movement-filter" style="background: rgba(48, 54, 61, 0.6); color: #e6edf3; border: 1px solid rgba(48, 54, 61, 0.8); padding: 8px 12px; border-radius: 6px;">
                        <option value="">Todos los tipos</option>
                        <option value="income">Ingresos</option>
                        <option value="expense">Egresos</option>
                        <option value="transfer_out">Transferencias</option>
                    </select>
                </div>
                ${movements.length === 0 ?
                    '<div class="finance-empty">No hay movimientos hoy</div>' :
                    `<table class="finance-data-table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Moneda</th>
                                <th>Cantidad</th>
                                <th style="text-align: right;">Monto Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movements.map(m => {
                                const isIncome = ['income', 'adjustment_in', 'transfer_in'].includes(m.movement_type);
                                return `
                                    <tr>
                                        <td>
                                            <span style="display: inline-flex; align-items: center; gap: 8px;">
                                                <i class="fas fa-${isIncome ? 'arrow-down' : 'arrow-up'}" style="color: ${isIncome ? '#3fb950' : '#f85149'};"></i>
                                                ${m.movement_type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>${m.currency || 'ARS'}</td>
                                        <td>${m.count || 0}</td>
                                        <td style="text-align: right; font-weight: 600; color: ${isIncome ? '#3fb950' : '#f85149'};">
                                            ${this.formatCurrency(m.total)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        `;
    },

    renderAuthorizations() {
        const logs = this.dashboardData?.recentAuthorizations || [];

        return `
            <div class="finance-data-section">
                <div class="finance-section-header">
                    <div class="finance-section-title">
                        <span class="icon"><i class="fas fa-fingerprint"></i></span>
                        Historial de Autorizaciones
                    </div>
                </div>
                ${logs.length === 0 ?
                    '<div class="finance-empty">No hay autorizaciones recientes</div>' :
                    `<div class="finance-timeline">
                        ${logs.map(log => `
                            <div class="finance-timeline-item">
                                <div class="finance-timeline-icon ${log.authorization_result === 'success' ? 'success' : 'failed'}">
                                    <i class="fas fa-${log.authorization_result === 'success' ? 'check' : 'times'}"></i>
                                </div>
                                <div class="finance-timeline-content">
                                    <div class="finance-timeline-title">
                                        ${log.operation_type} - ${log.authorization_method}
                                        <span class="finance-status ${log.authorization_result === 'success' ? 'approved' : 'rejected'}">
                                            ${log.authorization_result}
                                        </span>
                                    </div>
                                    <div class="finance-timeline-meta">
                                        Por ${log.authorizer?.first_name || ''} ${log.authorizer?.last_name || ''}
                                        - ${this.formatDateTime(log.created_at)}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>`
                }
            </div>
        `;
    },

    renderError() {
        const contentEl = document.getElementById('finance-exec-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="finance-empty">
                    <div class="finance-empty-icon">
                        <i class="fas fa-exclamation-triangle" style="color: #f85149;"></i>
                    </div>
                    <p>Error al cargar los datos. Por favor, intente nuevamente.</p>
                    <button class="finance-exec-btn primary" onclick="FinanceExecutiveDashboard.refreshData()">
                        Reintentar
                    </button>
                </div>
            `;
        }
    },

    switchView(view) {
        this.currentView = view;

        // Update tabs
        document.querySelectorAll('.finance-exec-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.closest('.finance-exec-tab').classList.add('active');

        // Update content
        this.updateContent();
    },

    async refreshData() {
        const contentEl = document.getElementById('finance-exec-content');
        if (contentEl) contentEl.innerHTML = this.renderLoading();
        await this.loadDashboardData();
    },

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    },

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    async approveRequest(id, type) {
        const method = prompt('Método de autorización (password/biometric):', 'password');
        if (!method) return;

        const password = prompt('Ingrese su contraseña para autorizar:');
        if (!password) return;

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const endpoint = type === 'egress'
                ? `/api/finance/egress-requests/${id}/finance-approve`
                : `/api/finance/adjustments/${id}/approve`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    authorizationMethod: method,
                    authorizationData: { password }
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('Aprobado exitosamente');
                this.refreshData();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error approving:', error);
            alert('Error al aprobar: ' + error.message);
        }
    },

    async rejectRequest(id, type) {
        const reason = prompt('Motivo del rechazo:');
        if (!reason) return;

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const endpoint = type === 'egress'
                ? `/api/finance/egress-requests/${id}/reject`
                : `/api/finance/adjustments/${id}/reject`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            const result = await response.json();
            if (result.success) {
                alert('Rechazado exitosamente');
                this.refreshData();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error rejecting:', error);
            alert('Error al rechazar: ' + error.message);
        }
    },

    exportReport() {
        alert('Funcionalidad de exportación próximamente');
    },

    attachEventListeners() {
        // Additional event listeners if needed
    },

    // Utility functions
    formatCurrency(amount, currency = 'ARS') {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency
        }).format(amount || 0);
    },

    formatTime(date) {
        if (!date) return '-';
        return new Date(date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    },

    formatDateTime(date) {
        if (!date) return '-';
        return new Date(date).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    destroy() {
        this.stopAutoRefresh();
    }
};

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinanceExecutiveDashboard;
}
