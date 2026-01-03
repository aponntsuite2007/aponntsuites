/**
 * Cash Management Module
 * Sistema de Cajas, Transferencias, Fondos Fijos y Medios de Pago
 * DARK THEME - Diciembre 2025
 */

window.CashManagement = (function() {
    'use strict';

    // =========================================================================
    // ESTADO
    // =========================================================================

    let state = {
        currentView: 'dashboard',
        myRegister: null,
        currentSession: null,
        paymentMethods: [],
        pendingTransfers: { incoming: [], outgoing: [] },
        registers: [],
        pettyCashFunds: []
    };

    const API_BASE = '/api/finance/cash';

    // =========================================================================
    // ESTILOS DARK THEME
    // =========================================================================

    const styles = `
        <style>
            .cash-management-container {
                background: #0d1117;
                min-height: 100vh;
                padding: 24px;
                color: #e6edf3;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .cash-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid #30363d;
            }

            .cash-title {
                font-size: 24px;
                font-weight: 600;
                color: #58a6ff;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .cash-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 24px;
                flex-wrap: wrap;
            }

            .cash-tab {
                padding: 10px 20px;
                background: #21262d;
                border: 1px solid #30363d;
                border-radius: 8px;
                color: #8b949e;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
            }

            .cash-tab:hover {
                background: #30363d;
                color: #e6edf3;
            }

            .cash-tab.active {
                background: linear-gradient(135deg, #238636, #2ea043);
                border-color: #238636;
                color: white;
            }

            .cash-card {
                background: #161b22;
                border: 1px solid #30363d;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
            }

            .cash-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 1px solid #30363d;
            }

            .cash-card-title {
                font-size: 16px;
                font-weight: 600;
                color: #e6edf3;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .cash-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
            }

            .cash-stat {
                background: #21262d;
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }

            .cash-stat-value {
                font-size: 28px;
                font-weight: 700;
                color: #58a6ff;
            }

            .cash-stat-label {
                font-size: 12px;
                color: #8b949e;
                margin-top: 4px;
            }

            .cash-stat.success .cash-stat-value { color: #3fb950; }
            .cash-stat.warning .cash-stat-value { color: #d29922; }
            .cash-stat.danger .cash-stat-value { color: #f85149; }

            .cash-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .cash-btn-primary {
                background: linear-gradient(135deg, #238636, #2ea043);
                color: white;
            }

            .cash-btn-primary:hover {
                background: linear-gradient(135deg, #2ea043, #3fb950);
                transform: translateY(-1px);
            }

            .cash-btn-secondary {
                background: #21262d;
                border: 1px solid #30363d;
                color: #e6edf3;
            }

            .cash-btn-secondary:hover {
                background: #30363d;
            }

            .cash-btn-danger {
                background: linear-gradient(135deg, #da3633, #f85149);
                color: white;
            }

            .cash-btn-warning {
                background: linear-gradient(135deg, #9e6a03, #d29922);
                color: white;
            }

            .cash-table {
                width: 100%;
                border-collapse: collapse;
            }

            .cash-table th,
            .cash-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #30363d;
            }

            .cash-table th {
                background: #21262d;
                color: #8b949e;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
            }

            .cash-table tr:hover {
                background: #21262d;
            }

            .cash-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
            }

            .cash-badge-success {
                background: rgba(63, 185, 80, 0.2);
                color: #3fb950;
            }

            .cash-badge-warning {
                background: rgba(210, 153, 34, 0.2);
                color: #d29922;
            }

            .cash-badge-danger {
                background: rgba(248, 81, 73, 0.2);
                color: #f85149;
            }

            .cash-badge-info {
                background: rgba(88, 166, 255, 0.2);
                color: #58a6ff;
            }

            .cash-alert {
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .cash-alert-warning {
                background: rgba(210, 153, 34, 0.15);
                border: 1px solid rgba(210, 153, 34, 0.3);
                color: #d29922;
            }

            .cash-alert-danger {
                background: rgba(248, 81, 73, 0.15);
                border: 1px solid rgba(248, 81, 73, 0.3);
                color: #f85149;
            }

            .cash-alert-success {
                background: rgba(63, 185, 80, 0.15);
                border: 1px solid rgba(63, 185, 80, 0.3);
                color: #3fb950;
            }

            .cash-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }

            .cash-modal {
                background: #161b22;
                border: 1px solid #30363d;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
            }

            .cash-modal-header {
                padding: 20px;
                border-bottom: 1px solid #30363d;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .cash-modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #e6edf3;
            }

            .cash-modal-close {
                background: none;
                border: none;
                color: #8b949e;
                font-size: 24px;
                cursor: pointer;
            }

            .cash-modal-body {
                padding: 20px;
            }

            .cash-modal-footer {
                padding: 20px;
                border-top: 1px solid #30363d;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            .cash-form-group {
                margin-bottom: 16px;
            }

            .cash-form-label {
                display: block;
                margin-bottom: 8px;
                color: #8b949e;
                font-size: 14px;
            }

            .cash-form-input,
            .cash-form-select,
            .cash-form-textarea {
                width: 100%;
                padding: 10px 14px;
                background: #0d1117;
                border: 1px solid #30363d;
                border-radius: 8px;
                color: #e6edf3;
                font-size: 14px;
            }

            .cash-form-input:focus,
            .cash-form-select:focus,
            .cash-form-textarea:focus {
                outline: none;
                border-color: #58a6ff;
                box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.2);
            }

            .transfer-card {
                background: #21262d;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                border-left: 4px solid #d29922;
            }

            .transfer-card.incoming {
                border-left-color: #3fb950;
            }

            .transfer-card.outgoing {
                border-left-color: #f85149;
            }

            .transfer-amount {
                font-size: 20px;
                font-weight: 700;
                color: #e6edf3;
            }

            .transfer-info {
                color: #8b949e;
                font-size: 13px;
                margin-top: 8px;
            }

            .transfer-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }

            .denomination-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
            }

            .denomination-item {
                background: #21262d;
                border-radius: 8px;
                padding: 12px;
                text-align: center;
            }

            .denomination-value {
                font-size: 18px;
                font-weight: 600;
                color: #3fb950;
            }

            .denomination-input {
                width: 60px;
                text-align: center;
                padding: 6px;
                background: #0d1117;
                border: 1px solid #30363d;
                border-radius: 4px;
                color: #e6edf3;
                margin-top: 8px;
            }

            .session-status {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 500;
            }

            .session-status.open {
                background: rgba(63, 185, 80, 0.2);
                color: #3fb950;
            }

            .session-status.closed {
                background: rgba(139, 148, 158, 0.2);
                color: #8b949e;
            }

            .petty-cash-bar {
                height: 8px;
                background: #21262d;
                border-radius: 4px;
                overflow: hidden;
                margin-top: 8px;
            }

            .petty-cash-progress {
                height: 100%;
                background: linear-gradient(90deg, #3fb950, #238636);
                transition: width 0.3s;
            }

            .petty-cash-progress.warning {
                background: linear-gradient(90deg, #d29922, #9e6a03);
            }

            .petty-cash-progress.danger {
                background: linear-gradient(90deg, #f85149, #da3633);
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .pending-indicator {
                animation: pulse 2s infinite;
            }
        </style>
    `;

    // =========================================================================
    // API
    // =========================================================================

    async function apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error en la solicitud');
        }
        return data;
    }

    // =========================================================================
    // RENDERIZADO PRINCIPAL
    // =========================================================================

    function render(container) {
        container.innerHTML = styles + `
            <div class="cash-management-container">
                <div class="cash-header">
                    <div class="cash-title">
                        <span>💰</span>
                        <span>Sistema de Cajas</span>
                    </div>
                    <div id="cash-session-status"></div>
                </div>

                <div class="cash-tabs" id="cash-tabs">
                    <button class="cash-tab active" data-view="dashboard">📊 Dashboard</button>
                    <button class="cash-tab" data-view="my-register">🏧 Mi Caja</button>
                    <button class="cash-tab" data-view="transfers">🔄 Transferencias</button>
                    <button class="cash-tab" data-view="movements">📝 Movimientos</button>
                    <button class="cash-tab" data-view="petty-cash">💵 Fondos Fijos</button>
                    <button class="cash-tab" data-view="config">⚙️ Configuración</button>
                </div>

                <div id="cash-content"></div>
                <div id="cash-modal-container"></div>
            </div>
        `;

        // Event listeners tabs
        container.querySelectorAll('.cash-tab').forEach(tab => {
            tab.addEventListener('click', () => switchView(tab.dataset.view));
        });

        // Cargar datos iniciales
        loadInitialData();
    }

    async function loadInitialData() {
        try {
            // Cargar en paralelo
            const [registerData, methodsData, transfersData] = await Promise.all([
                apiCall('/cash-registers/my-register'),
                apiCall('/payment-methods'),
                apiCall('/cash-transfers/pending')
            ]);

            state.myRegister = registerData.data?.register;
            state.currentSession = registerData.data?.currentSession;
            state.paymentMethods = methodsData.data || [];
            state.pendingTransfers = transfersData.data || { incoming: [], outgoing: [] };

            updateSessionStatus();
            renderView(state.currentView);
        } catch (error) {
            console.error('Error loading initial data:', error);
            showNotification('Error cargando datos', 'error');
        }
    }

    function updateSessionStatus() {
        const container = document.getElementById('cash-session-status');
        if (!container) return;

        if (!state.myRegister) {
            container.innerHTML = `<span class="cash-badge cash-badge-warning">Sin caja asignada</span>`;
            return;
        }

        if (state.currentSession) {
            container.innerHTML = `
                <span class="session-status open">
                    <span>🟢</span>
                    <span>${state.myRegister.name} - Sesión Abierta</span>
                </span>
            `;
        } else {
            container.innerHTML = `
                <span class="session-status closed">
                    <span>⚪</span>
                    <span>${state.myRegister.name} - Cerrada</span>
                </span>
            `;
        }
    }

    function switchView(view) {
        state.currentView = view;

        document.querySelectorAll('.cash-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });

        renderView(view);
    }

    function renderView(view) {
        const content = document.getElementById('cash-content');
        if (!content) return;

        switch (view) {
            case 'dashboard':
                renderDashboard(content);
                break;
            case 'my-register':
                renderMyRegister(content);
                break;
            case 'transfers':
                renderTransfers(content);
                break;
            case 'movements':
                renderMovements(content);
                break;
            case 'petty-cash':
                renderPettyCash(content);
                break;
            case 'config':
                renderConfig(content);
                break;
        }
    }

    // =========================================================================
    // DASHBOARD
    // =========================================================================

    function renderDashboard(container) {
        const pendingCount = state.pendingTransfers.incoming.length + state.pendingTransfers.outgoing.length;

        container.innerHTML = `
            ${pendingCount > 0 ? `
                <div class="cash-alert cash-alert-warning pending-indicator">
                    <span>⚠️</span>
                    <span>Tienes <strong>${pendingCount}</strong> transferencia(s) pendiente(s) de procesar</span>
                    <button class="cash-btn cash-btn-secondary" onclick="CashManagement.switchView('transfers')">
                        Ver Transferencias
                    </button>
                </div>
            ` : ''}

            <div class="cash-grid">
                <div class="cash-card">
                    <div class="cash-card-header">
                        <span class="cash-card-title">🏧 Mi Caja</span>
                    </div>
                    ${state.myRegister ? `
                        <div class="cash-stat ${state.currentSession ? 'success' : ''}">
                            <div class="cash-stat-value">${state.myRegister.name}</div>
                            <div class="cash-stat-label">${state.currentSession ? 'Sesión Abierta' : 'Sesión Cerrada'}</div>
                        </div>
                        ${state.currentSession ? `
                            <div style="margin-top: 16px; text-align: center;">
                                <div style="font-size: 14px; color: #8b949e;">Saldo Esperado</div>
                                <div style="font-size: 24px; font-weight: 600; color: #3fb950;">
                                    $${formatNumber(state.currentSession.expected_amount || 0)}
                                </div>
                            </div>
                        ` : ''}
                    ` : `
                        <div class="cash-stat warning">
                            <div class="cash-stat-value">-</div>
                            <div class="cash-stat-label">Sin caja asignada</div>
                        </div>
                    `}
                </div>

                <div class="cash-card">
                    <div class="cash-card-header">
                        <span class="cash-card-title">🔄 Transferencias Pendientes</span>
                    </div>
                    <div style="display: flex; gap: 20px; justify-content: center;">
                        <div class="cash-stat ${state.pendingTransfers.incoming.length > 0 ? 'warning' : ''}">
                            <div class="cash-stat-value">${state.pendingTransfers.incoming.length}</div>
                            <div class="cash-stat-label">Por Confirmar</div>
                        </div>
                        <div class="cash-stat ${state.pendingTransfers.outgoing.length > 0 ? 'warning' : ''}">
                            <div class="cash-stat-value">${state.pendingTransfers.outgoing.length}</div>
                            <div class="cash-stat-label">Enviadas</div>
                        </div>
                    </div>
                </div>

                <div class="cash-card">
                    <div class="cash-card-header">
                        <span class="cash-card-title">💳 Medios de Pago</span>
                    </div>
                    <div class="cash-stat">
                        <div class="cash-stat-value">${state.paymentMethods.length}</div>
                        <div class="cash-stat-label">Configurados</div>
                    </div>
                </div>
            </div>

            <div class="cash-card">
                <div class="cash-card-header">
                    <span class="cash-card-title">⚡ Acciones Rápidas</span>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    ${!state.currentSession && state.myRegister ? `
                        <button class="cash-btn cash-btn-primary" onclick="CashManagement.showOpenSessionModal()">
                            🔓 Abrir Caja
                        </button>
                    ` : ''}
                    ${state.currentSession ? `
                        <button class="cash-btn cash-btn-primary" onclick="CashManagement.showNewMovementModal()">
                            ➕ Nuevo Movimiento
                        </button>
                        <button class="cash-btn cash-btn-secondary" onclick="CashManagement.showNewTransferModal()">
                            🔄 Nueva Transferencia
                        </button>
                        <button class="cash-btn cash-btn-secondary" onclick="CashManagement.showCashCountModal()">
                            🔢 Arqueo
                        </button>
                        <button class="cash-btn cash-btn-danger" onclick="CashManagement.showCloseSessionModal()">
                            🔒 Cerrar Caja
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // =========================================================================
    // MI CAJA
    // =========================================================================

    function renderMyRegister(container) {
        if (!state.myRegister) {
            container.innerHTML = `
                <div class="cash-card">
                    <div class="cash-alert cash-alert-warning">
                        <span>⚠️</span>
                        <span>No tienes una caja asignada. Contacta al administrador.</span>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="cash-grid">
                <div class="cash-card">
                    <div class="cash-card-header">
                        <span class="cash-card-title">🏧 ${state.myRegister.name}</span>
                        <span class="cash-badge ${state.myRegister.register_type === 'main' ? 'cash-badge-info' : 'cash-badge-success'}">
                            ${state.myRegister.register_type === 'main' ? 'PRINCIPAL' : 'INDIVIDUAL'}
                        </span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                        <div class="cash-stat">
                            <div class="cash-stat-value">${state.myRegister.code}</div>
                            <div class="cash-stat-label">Código</div>
                        </div>
                        <div class="cash-stat ${state.currentSession ? 'success' : ''}">
                            <div class="cash-stat-value">${state.currentSession ? '🟢' : '⚪'}</div>
                            <div class="cash-stat-label">${state.currentSession ? 'Abierta' : 'Cerrada'}</div>
                        </div>
                    </div>

                    ${state.currentSession ? `
                        <div class="cash-card" style="background: #0d1117;">
                            <h4 style="color: #58a6ff; margin-bottom: 16px;">📊 Sesión Actual</h4>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                                <div class="cash-stat">
                                    <div class="cash-stat-value">$${formatNumber(state.currentSession.opening_amount)}</div>
                                    <div class="cash-stat-label">Apertura</div>
                                </div>
                                <div class="cash-stat success">
                                    <div class="cash-stat-value">$${formatNumber(state.currentSession.expected_amount)}</div>
                                    <div class="cash-stat-label">Esperado</div>
                                </div>
                                <div class="cash-stat">
                                    <div class="cash-stat-value">${formatTime(state.currentSession.opened_at)}</div>
                                    <div class="cash-stat-label">Hora Apertura</div>
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 12px; margin-top: 16px;">
                            <button class="cash-btn cash-btn-primary" onclick="CashManagement.showNewMovementModal()">
                                ➕ Nuevo Movimiento
                            </button>
                            <button class="cash-btn cash-btn-secondary" onclick="CashManagement.showCashCountModal()">
                                🔢 Arqueo
                            </button>
                            <button class="cash-btn cash-btn-danger" onclick="CashManagement.showCloseSessionModal()">
                                🔒 Cerrar Caja
                            </button>
                        </div>
                    ` : `
                        <button class="cash-btn cash-btn-primary" onclick="CashManagement.showOpenSessionModal()">
                            🔓 Abrir Caja
                        </button>
                    `}
                </div>

                <div class="cash-card">
                    <div class="cash-card-header">
                        <span class="cash-card-title">📋 Últimos Movimientos</span>
                    </div>
                    <div id="recent-movements-list">
                        <div style="text-align: center; color: #8b949e; padding: 20px;">
                            Cargando...
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (state.currentSession) {
            loadRecentMovements();
        }
    }

    async function loadRecentMovements() {
        try {
            const response = await apiCall(`/cash-sessions/${state.currentSession.id}/movements?limit=10`);
            const container = document.getElementById('recent-movements-list');

            if (!response.data || response.data.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; color: #8b949e; padding: 20px;">
                        No hay movimientos en esta sesión
                    </div>
                `;
                return;
            }

            container.innerHTML = response.data.map(m => `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #30363d;">
                    <div>
                        <div style="font-weight: 500;">${m.description || m.category}</div>
                        <div style="font-size: 12px; color: #8b949e;">
                            ${m.paymentMethod?.name || 'Efectivo'} • ${formatTime(m.movement_date)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: ${m.movement_type === 'income' || m.movement_type === 'transfer_in' ? '#3fb950' : '#f85149'};">
                            ${m.movement_type === 'income' || m.movement_type === 'transfer_in' ? '+' : '-'}$${formatNumber(m.amount)}
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading movements:', error);
        }
    }

    // =========================================================================
    // TRANSFERENCIAS
    // =========================================================================

    function renderTransfers(container) {
        const { incoming, outgoing } = state.pendingTransfers;

        container.innerHTML = `
            ${incoming.length > 0 ? `
                <div class="cash-alert cash-alert-warning">
                    <span>⚠️</span>
                    <span>Tienes ${incoming.length} transferencia(s) entrante(s) pendientes de confirmación.
                    <strong>No podrás cerrar tu caja hasta procesarlas.</strong></span>
                </div>
            ` : ''}

            <div class="cash-grid">
                <div class="cash-card">
                    <div class="cash-card-header">
                        <span class="cash-card-title">📥 Transferencias Entrantes</span>
                        <span class="cash-badge cash-badge-warning">${incoming.length} pendiente(s)</span>
                    </div>
                    ${incoming.length > 0 ? incoming.map(t => `
                        <div class="transfer-card incoming">
                            <div class="transfer-amount">$${formatNumber(t.amount)}</div>
                            <div class="transfer-info">
                                <div>Desde: <strong>${t.sourceRegister?.name}</strong></div>
                                <div>Método: ${t.paymentMethod?.name || t.payment_method_name}</div>
                                <div>Fecha: ${formatDateTime(t.created_at)}</div>
                                ${t.description ? `<div>Nota: ${t.description}</div>` : ''}
                            </div>
                            <div class="transfer-actions">
                                <button class="cash-btn cash-btn-primary" onclick="CashManagement.confirmTransfer(${t.id})">
                                    ✅ Confirmar
                                </button>
                                <button class="cash-btn cash-btn-danger" onclick="CashManagement.showRejectTransferModal(${t.id})">
                                    ❌ Rechazar
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <div style="text-align: center; color: #8b949e; padding: 20px;">
                            No hay transferencias entrantes pendientes
                        </div>
                    `}
                </div>

                <div class="cash-card">
                    <div class="cash-card-header">
                        <span class="cash-card-title">📤 Transferencias Enviadas</span>
                        <span class="cash-badge cash-badge-info">${outgoing.length} pendiente(s)</span>
                    </div>
                    ${state.currentSession ? `
                        <button class="cash-btn cash-btn-secondary" onclick="CashManagement.showNewTransferModal()" style="margin-bottom: 16px;">
                            ➕ Nueva Transferencia
                        </button>
                    ` : ''}
                    ${outgoing.length > 0 ? outgoing.map(t => `
                        <div class="transfer-card outgoing">
                            <div class="transfer-amount">$${formatNumber(t.amount)}</div>
                            <div class="transfer-info">
                                <div>Hacia: <strong>${t.destinationRegister?.name}</strong></div>
                                <div>Método: ${t.paymentMethod?.name || t.payment_method_name}</div>
                                <div>Fecha: ${formatDateTime(t.created_at)}</div>
                                <div><span class="cash-badge cash-badge-warning">Esperando confirmación</span></div>
                            </div>
                            <div class="transfer-actions">
                                <button class="cash-btn cash-btn-danger" onclick="CashManagement.showCancelTransferModal(${t.id})">
                                    🚫 Cancelar
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <div style="text-align: center; color: #8b949e; padding: 20px;">
                            No hay transferencias enviadas pendientes
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // =========================================================================
    // MOVIMIENTOS
    // =========================================================================

    async function renderMovements(container) {
        container.innerHTML = `
            <div class="cash-card">
                <div class="cash-card-header">
                    <span class="cash-card-title">📝 Movimientos de Caja</span>
                    ${state.currentSession ? `
                        <button class="cash-btn cash-btn-primary" onclick="CashManagement.showNewMovementModal()">
                            ➕ Nuevo Movimiento
                        </button>
                    ` : ''}
                </div>
                <div id="movements-table-container">
                    ${state.currentSession ? `
                        <div style="text-align: center; color: #8b949e; padding: 20px;">
                            Cargando movimientos...
                        </div>
                    ` : `
                        <div style="text-align: center; color: #8b949e; padding: 40px;">
                            Abre una sesión de caja para ver los movimientos
                        </div>
                    `}
                </div>
            </div>
        `;

        if (state.currentSession) {
            await loadMovementsTable();
        }
    }

    async function loadMovementsTable() {
        try {
            const response = await apiCall(`/cash-sessions/${state.currentSession.id}/movements?limit=50`);
            const container = document.getElementById('movements-table-container');

            if (!response.data || response.data.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; color: #8b949e; padding: 40px;">
                        No hay movimientos en esta sesión
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <table class="cash-table">
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Tipo</th>
                            <th>Descripción</th>
                            <th>Medio de Pago</th>
                            <th>Módulo</th>
                            <th style="text-align: right;">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.data.map(m => `
                            <tr>
                                <td>${formatDateTime(m.movement_date)}</td>
                                <td>
                                    <span class="cash-badge ${getMovementBadgeClass(m.movement_type)}">
                                        ${getMovementTypeLabel(m.movement_type)}
                                    </span>
                                </td>
                                <td>${m.description || m.category || '-'}</td>
                                <td>${m.paymentMethod?.name || 'Efectivo'}</td>
                                <td>${m.source_module || 'manual'}</td>
                                <td style="text-align: right; font-weight: 600; color: ${m.movement_type === 'income' || m.movement_type === 'transfer_in' ? '#3fb950' : '#f85149'};">
                                    ${m.movement_type === 'income' || m.movement_type === 'transfer_in' ? '+' : '-'}$${formatNumber(m.amount)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading movements:', error);
        }
    }

    // =========================================================================
    // FONDOS FIJOS
    // =========================================================================

    async function renderPettyCash(container) {
        container.innerHTML = `
            <div class="cash-card">
                <div class="cash-card-header">
                    <span class="cash-card-title">💵 Fondos Fijos</span>
                    <button class="cash-btn cash-btn-primary" onclick="CashManagement.showNewFundModal()">
                        ➕ Nuevo Fondo
                    </button>
                </div>
                <div id="petty-cash-list">
                    <div style="text-align: center; color: #8b949e; padding: 20px;">
                        Cargando fondos fijos...
                    </div>
                </div>
            </div>
        `;

        await loadPettyCashFunds();
    }

    async function loadPettyCashFunds() {
        try {
            const response = await apiCall('/petty-cash/funds');
            state.pettyCashFunds = response.data || [];
            const container = document.getElementById('petty-cash-list');

            if (state.pettyCashFunds.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; color: #8b949e; padding: 40px;">
                        No hay fondos fijos configurados
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="cash-grid">
                    ${state.pettyCashFunds.map(fund => {
                        const usedPercent = ((fund.fund_amount - fund.current_balance) / fund.fund_amount * 100).toFixed(0);
                        const progressClass = usedPercent > 80 ? 'danger' : usedPercent > 50 ? 'warning' : '';
                        return `
                            <div class="cash-card" style="background: #0d1117; cursor: pointer;" onclick="CashManagement.showFundDetail(${fund.id})">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight: 600; font-size: 16px;">${fund.name}</div>
                                        <div style="color: #8b949e; font-size: 13px;">${fund.code}</div>
                                    </div>
                                    <span class="cash-badge ${fund.is_active ? 'cash-badge-success' : 'cash-badge-danger'}">
                                        ${fund.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                <div style="margin-top: 16px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <span style="color: #8b949e;">Disponible</span>
                                        <span style="font-weight: 600; color: ${progressClass === 'danger' ? '#f85149' : progressClass === 'warning' ? '#d29922' : '#3fb950'};">
                                            $${formatNumber(fund.current_balance)}
                                        </span>
                                    </div>
                                    <div class="petty-cash-bar">
                                        <div class="petty-cash-progress ${progressClass}" style="width: ${100 - usedPercent}%"></div>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: #8b949e;">
                                        <span>Fondo: $${formatNumber(fund.fund_amount)}</span>
                                        <span>Usado: ${usedPercent}%</span>
                                    </div>
                                </div>
                                ${fund.custodian ? `
                                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #30363d; font-size: 13px; color: #8b949e;">
                                        👤 Responsable: ${fund.custodian.name}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading petty cash funds:', error);
            showNotification('Error cargando fondos fijos', 'error');
        }
    }

    // =========================================================================
    // CONFIGURACIÓN
    // =========================================================================

    async function renderConfig(container) {
        container.innerHTML = `
            <div class="cash-grid">
                <div class="cash-card">
                    <div class="cash-card-header">
                        <span class="cash-card-title">💳 Medios de Pago</span>
                        <button class="cash-btn cash-btn-primary" onclick="CashManagement.showNewPaymentMethodModal()">
                            ➕ Nuevo
                        </button>
                    </div>
                    <div id="payment-methods-list">
                        ${state.paymentMethods.map(pm => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #30363d;">
                                <div>
                                    <div style="font-weight: 500;">${pm.name}</div>
                                    <div style="font-size: 12px; color: #8b949e;">
                                        Código: ${pm.code}
                                        ${pm.commission_percent ? ` • Comisión: ${pm.commission_percent}%` : ''}
                                    </div>
                                </div>
                                <span class="cash-badge ${pm.is_active ? 'cash-badge-success' : 'cash-badge-danger'}">
                                    ${pm.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        `).join('') || '<div style="color: #8b949e; padding: 20px; text-align: center;">No hay medios de pago configurados</div>'}
                    </div>
                </div>

                <div class="cash-card">
                    <div class="cash-card-header">
                        <span class="cash-card-title">🏧 Cajas Registradas</span>
                        <button class="cash-btn cash-btn-primary" onclick="CashManagement.showNewRegisterModal()">
                            ➕ Nueva Caja
                        </button>
                    </div>
                    <div id="registers-list">
                        <div style="text-align: center; color: #8b949e; padding: 20px;">
                            Cargando...
                        </div>
                    </div>
                </div>
            </div>
        `;

        await loadRegisters();
    }

    async function loadRegisters() {
        try {
            const response = await apiCall('/cash-registers?includeAssignments=true');
            state.registers = response.data || [];
            const container = document.getElementById('registers-list');

            if (state.registers.length === 0) {
                container.innerHTML = `<div style="color: #8b949e; padding: 20px; text-align: center;">No hay cajas registradas</div>`;
                return;
            }

            container.innerHTML = state.registers.map(r => `
                <div style="padding: 12px 0; border-bottom: 1px solid #30363d;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 500;">${r.name}</div>
                            <div style="font-size: 12px; color: #8b949e;">
                                ${r.code} • ${getRegisterTypeLabel(r.register_type)}
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span class="cash-badge ${r.is_active ? 'cash-badge-success' : 'cash-badge-danger'}">
                                ${r.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                            <button class="cash-btn cash-btn-secondary" onclick="CashManagement.showAssignUserModal(${r.id})">
                                👤
                            </button>
                        </div>
                    </div>
                    ${r.assignments?.length > 0 ? `
                        <div style="margin-top: 8px; font-size: 12px; color: #8b949e;">
                            Usuarios: ${r.assignments.map(a => a.user?.name || 'Sin nombre').join(', ')}
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading registers:', error);
        }
    }

    // =========================================================================
    // MODALES
    // =========================================================================

    function showModal(title, content, footer = '') {
        const container = document.getElementById('cash-modal-container');
        container.innerHTML = `
            <div class="cash-modal-overlay" onclick="CashManagement.closeModal()">
                <div class="cash-modal" onclick="event.stopPropagation()">
                    <div class="cash-modal-header">
                        <span class="cash-modal-title">${title}</span>
                        <button class="cash-modal-close" onclick="CashManagement.closeModal()">&times;</button>
                    </div>
                    <div class="cash-modal-body">
                        ${content}
                    </div>
                    ${footer ? `<div class="cash-modal-footer">${footer}</div>` : ''}
                </div>
            </div>
        `;
    }

    function closeModal() {
        document.getElementById('cash-modal-container').innerHTML = '';
    }

    function showOpenSessionModal() {
        showModal('🔓 Abrir Caja', `
            <div class="cash-form-group">
                <label class="cash-form-label">Monto de Apertura</label>
                <input type="number" id="opening-amount" class="cash-form-input" step="0.01" placeholder="0.00">
            </div>
            <div class="cash-form-group">
                <label class="cash-form-label">Notas (opcional)</label>
                <textarea id="opening-notes" class="cash-form-textarea" rows="3"></textarea>
            </div>
        `, `
            <button class="cash-btn cash-btn-secondary" onclick="CashManagement.closeModal()">Cancelar</button>
            <button class="cash-btn cash-btn-primary" onclick="CashManagement.openSession()">Abrir Caja</button>
        `);
    }

    async function openSession() {
        try {
            const openingAmount = parseFloat(document.getElementById('opening-amount').value) || 0;
            const notes = document.getElementById('opening-notes').value;

            const response = await apiCall('/cash-sessions/open', {
                method: 'POST',
                body: JSON.stringify({
                    registerId: state.myRegister.id,
                    openingAmount,
                    notes
                })
            });

            state.currentSession = response.data;
            closeModal();
            showNotification('Caja abierta correctamente', 'success');
            updateSessionStatus();
            renderView(state.currentView);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function showCloseSessionModal() {
        try {
            const canCloseResponse = await apiCall(`/cash-sessions/${state.currentSession.id}/can-close`);
            const { canClose, pendingTransfers } = canCloseResponse.data;

            if (!canClose) {
                showModal('⚠️ No se puede cerrar la caja', `
                    <div class="cash-alert cash-alert-danger">
                        <span>❌</span>
                        <span>Tienes ${pendingTransfers.length} transferencia(s) pendiente(s). Debes confirmar o rechazar todas antes de cerrar.</span>
                    </div>
                    <div style="margin-top: 16px;">
                        ${pendingTransfers.map(t => `
                            <div class="transfer-card ${t.type}">
                                <div style="font-weight: 500;">${t.type === 'incoming' ? '📥 Entrante' : '📤 Saliente'}</div>
                                <div>${t.message}</div>
                            </div>
                        `).join('')}
                    </div>
                `, `
                    <button class="cash-btn cash-btn-primary" onclick="CashManagement.switchView('transfers'); CashManagement.closeModal();">
                        Ir a Transferencias
                    </button>
                `);
                return;
            }

            showModal('🔒 Cerrar Caja', `
                <div class="cash-form-group">
                    <label class="cash-form-label">Monto de Cierre (efectivo contado)</label>
                    <input type="number" id="closing-amount" class="cash-form-input" step="0.01" placeholder="0.00">
                </div>
                <div style="background: #21262d; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Saldo Esperado:</span>
                        <span style="font-weight: 600; color: #3fb950;">$${formatNumber(state.currentSession.expected_amount)}</span>
                    </div>
                </div>
                <div class="cash-form-group">
                    <label class="cash-form-label">Notas (opcional)</label>
                    <textarea id="closing-notes" class="cash-form-textarea" rows="3"></textarea>
                </div>
            `, `
                <button class="cash-btn cash-btn-secondary" onclick="CashManagement.closeModal()">Cancelar</button>
                <button class="cash-btn cash-btn-danger" onclick="CashManagement.closeSession()">Cerrar Caja</button>
            `);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function closeSession() {
        try {
            const closingAmount = parseFloat(document.getElementById('closing-amount').value) || 0;
            const notes = document.getElementById('closing-notes').value;

            const response = await apiCall(`/cash-sessions/${state.currentSession.id}/close`, {
                method: 'POST',
                body: JSON.stringify({ closingAmount, notes })
            });

            const summary = response.data.summary;
            state.currentSession = null;
            closeModal();

            showModal('✅ Caja Cerrada', `
                <div class="cash-alert cash-alert-success">
                    <span>✅</span>
                    <span>La caja se cerró correctamente</span>
                </div>
                <div style="background: #21262d; padding: 16px; border-radius: 8px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <div style="color: #8b949e; font-size: 12px;">Apertura</div>
                            <div style="font-weight: 600;">$${formatNumber(summary.openingAmount)}</div>
                        </div>
                        <div>
                            <div style="color: #8b949e; font-size: 12px;">Ingresos</div>
                            <div style="font-weight: 600; color: #3fb950;">+$${formatNumber(summary.totalIncome)}</div>
                        </div>
                        <div>
                            <div style="color: #8b949e; font-size: 12px;">Egresos</div>
                            <div style="font-weight: 600; color: #f85149;">-$${formatNumber(summary.totalExpense)}</div>
                        </div>
                        <div>
                            <div style="color: #8b949e; font-size: 12px;">Esperado</div>
                            <div style="font-weight: 600;">$${formatNumber(summary.expectedAmount)}</div>
                        </div>
                        <div>
                            <div style="color: #8b949e; font-size: 12px;">Declarado</div>
                            <div style="font-weight: 600;">$${formatNumber(summary.closingAmount)}</div>
                        </div>
                        <div>
                            <div style="color: #8b949e; font-size: 12px;">Diferencia</div>
                            <div style="font-weight: 600; color: ${summary.difference === 0 ? '#3fb950' : '#f85149'};">
                                $${formatNumber(summary.difference)}
                            </div>
                        </div>
                    </div>
                </div>
            `, `
                <button class="cash-btn cash-btn-primary" onclick="CashManagement.closeModal()">Cerrar</button>
            `);

            updateSessionStatus();
            renderView(state.currentView);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    function showNewMovementModal() {
        showModal('➕ Nuevo Movimiento', `
            <div class="cash-form-group">
                <label class="cash-form-label">Tipo</label>
                <select id="movement-type" class="cash-form-select">
                    <option value="income">Ingreso</option>
                    <option value="expense">Egreso</option>
                </select>
            </div>
            <div class="cash-form-group">
                <label class="cash-form-label">Monto</label>
                <input type="number" id="movement-amount" class="cash-form-input" step="0.01" placeholder="0.00">
            </div>
            <div class="cash-form-group">
                <label class="cash-form-label">Medio de Pago</label>
                <select id="movement-payment-method" class="cash-form-select">
                    ${state.paymentMethods.map(pm => `
                        <option value="${pm.id}">${pm.name}</option>
                    `).join('')}
                </select>
            </div>
            <div class="cash-form-group">
                <label class="cash-form-label">Categoría</label>
                <input type="text" id="movement-category" class="cash-form-input" placeholder="Ej: ventas, gastos, etc.">
            </div>
            <div class="cash-form-group">
                <label class="cash-form-label">Descripción</label>
                <textarea id="movement-description" class="cash-form-textarea" rows="3"></textarea>
            </div>
        `, `
            <button class="cash-btn cash-btn-secondary" onclick="CashManagement.closeModal()">Cancelar</button>
            <button class="cash-btn cash-btn-primary" onclick="CashManagement.createMovement()">Guardar</button>
        `);
    }

    async function createMovement() {
        try {
            const data = {
                cashRegisterId: state.myRegister.id,
                sessionId: state.currentSession.id,
                movementType: document.getElementById('movement-type').value,
                amount: parseFloat(document.getElementById('movement-amount').value),
                paymentMethodId: parseInt(document.getElementById('movement-payment-method').value),
                category: document.getElementById('movement-category').value,
                description: document.getElementById('movement-description').value,
                sourceModule: 'manual'
            };

            await apiCall('/cash-movements', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            closeModal();
            showNotification('Movimiento registrado', 'success');
            await loadInitialData();
            renderView(state.currentView);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function showNewTransferModal() {
        try {
            const registersResponse = await apiCall('/cash-registers');
            const otherRegisters = registersResponse.data.filter(r => r.id !== state.myRegister.id);

            showModal('🔄 Nueva Transferencia', `
                <div class="cash-alert cash-alert-warning">
                    <span>⚠️</span>
                    <span>La caja destino deberá confirmar la recepción. Ambas cajas quedarán bloqueadas para cierre hasta que se resuelva.</span>
                </div>
                <div class="cash-form-group">
                    <label class="cash-form-label">Caja Destino</label>
                    <select id="transfer-destination" class="cash-form-select">
                        ${otherRegisters.map(r => `
                            <option value="${r.id}">${r.name} (${r.code})</option>
                        `).join('')}
                    </select>
                </div>
                <div class="cash-form-group">
                    <label class="cash-form-label">Monto</label>
                    <input type="number" id="transfer-amount" class="cash-form-input" step="0.01" placeholder="0.00">
                </div>
                <div class="cash-form-group">
                    <label class="cash-form-label">Medio de Pago</label>
                    <select id="transfer-payment-method" class="cash-form-select">
                        ${state.paymentMethods.map(pm => `
                            <option value="${pm.id}">${pm.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="cash-form-group">
                    <label class="cash-form-label">Descripción (opcional)</label>
                    <textarea id="transfer-description" class="cash-form-textarea" rows="2"></textarea>
                </div>
            `, `
                <button class="cash-btn cash-btn-secondary" onclick="CashManagement.closeModal()">Cancelar</button>
                <button class="cash-btn cash-btn-primary" onclick="CashManagement.createTransfer()">Enviar Transferencia</button>
            `);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function createTransfer() {
        try {
            const data = {
                sourceRegisterId: state.myRegister.id,
                destinationRegisterId: parseInt(document.getElementById('transfer-destination').value),
                amount: parseFloat(document.getElementById('transfer-amount').value),
                paymentMethodId: parseInt(document.getElementById('transfer-payment-method').value),
                description: document.getElementById('transfer-description').value
            };

            await apiCall('/cash-transfers', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            closeModal();
            showNotification('Transferencia enviada. Esperando confirmación.', 'success');
            await loadInitialData();
            renderView('transfers');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function confirmTransfer(transferId) {
        try {
            await apiCall(`/cash-transfers/${transferId}/confirm`, {
                method: 'POST',
                body: JSON.stringify({})
            });

            showNotification('Transferencia confirmada', 'success');
            await loadInitialData();
            renderView('transfers');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    function showRejectTransferModal(transferId) {
        showModal('❌ Rechazar Transferencia', `
            <div class="cash-alert cash-alert-warning">
                <span>⚠️</span>
                <span>Al rechazar, el monto será devuelto automáticamente a la caja origen.</span>
            </div>
            <div class="cash-form-group">
                <label class="cash-form-label">Motivo del Rechazo *</label>
                <textarea id="reject-reason" class="cash-form-textarea" rows="3" placeholder="Explique el motivo del rechazo..."></textarea>
            </div>
        `, `
            <button class="cash-btn cash-btn-secondary" onclick="CashManagement.closeModal()">Cancelar</button>
            <button class="cash-btn cash-btn-danger" onclick="CashManagement.rejectTransfer(${transferId})">Rechazar</button>
        `);
    }

    async function rejectTransfer(transferId) {
        try {
            const reason = document.getElementById('reject-reason').value;
            if (!reason.trim()) {
                showNotification('Debe indicar un motivo', 'error');
                return;
            }

            await apiCall(`/cash-transfers/${transferId}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });

            closeModal();
            showNotification('Transferencia rechazada. Monto revertido a caja origen.', 'success');
            await loadInitialData();
            renderView('transfers');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    function showCancelTransferModal(transferId) {
        showModal('🚫 Cancelar Transferencia', `
            <div class="cash-alert cash-alert-warning">
                <span>⚠️</span>
                <span>Solo puede cancelar si la caja destino aún no ha procesado la transferencia.</span>
            </div>
            <div class="cash-form-group">
                <label class="cash-form-label">Motivo de Cancelación *</label>
                <textarea id="cancel-reason" class="cash-form-textarea" rows="3" placeholder="Explique el motivo..."></textarea>
            </div>
        `, `
            <button class="cash-btn cash-btn-secondary" onclick="CashManagement.closeModal()">Volver</button>
            <button class="cash-btn cash-btn-danger" onclick="CashManagement.cancelTransfer(${transferId})">Cancelar Transferencia</button>
        `);
    }

    async function cancelTransfer(transferId) {
        try {
            const reason = document.getElementById('cancel-reason').value;
            if (!reason.trim()) {
                showNotification('Debe indicar un motivo', 'error');
                return;
            }

            await apiCall(`/cash-transfers/${transferId}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });

            closeModal();
            showNotification('Transferencia cancelada', 'success');
            await loadInitialData();
            renderView('transfers');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    function showCashCountModal() {
        const denominations = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

        showModal('🔢 Arqueo de Caja', `
            <div class="cash-form-group">
                <label class="cash-form-label">Tipo de Arqueo</label>
                <select id="count-type" class="cash-form-select">
                    <option value="audit">Arqueo</option>
                    <option value="surprise">Sorpresa</option>
                    <option value="closing">Cierre</option>
                </select>
            </div>
            <div class="cash-form-group">
                <label class="cash-form-label">Billetes</label>
                <div class="denomination-grid">
                    ${denominations.slice(0, 4).map(d => `
                        <div class="denomination-item">
                            <div class="denomination-value">$${d}</div>
                            <input type="number" class="denomination-input" data-denom="${d}" data-type="bills" min="0" value="0">
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="cash-form-group">
                <label class="cash-form-label">Monedas</label>
                <div class="denomination-grid">
                    ${denominations.slice(4).map(d => `
                        <div class="denomination-item">
                            <div class="denomination-value">$${d}</div>
                            <input type="number" class="denomination-input" data-denom="${d}" data-type="coins" min="0" value="0">
                        </div>
                    `).join('')}
                </div>
            </div>
            <div style="background: #21262d; padding: 16px; border-radius: 8px; margin-top: 16px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Total Contado:</span>
                    <span id="counted-total" style="font-weight: 600; color: #3fb950;">$0</span>
                </div>
            </div>
            <div class="cash-form-group" style="margin-top: 16px;">
                <label class="cash-form-label">Notas</label>
                <textarea id="count-notes" class="cash-form-textarea" rows="2"></textarea>
            </div>
        `, `
            <button class="cash-btn cash-btn-secondary" onclick="CashManagement.closeModal()">Cancelar</button>
            <button class="cash-btn cash-btn-primary" onclick="CashManagement.saveCashCount()">Guardar Arqueo</button>
        `);

        // Agregar evento para calcular total
        document.querySelectorAll('.denomination-input').forEach(input => {
            input.addEventListener('input', calculateCountTotal);
        });
    }

    function calculateCountTotal() {
        let total = 0;
        document.querySelectorAll('.denomination-input').forEach(input => {
            const denom = parseInt(input.dataset.denom);
            const count = parseInt(input.value) || 0;
            total += denom * count;
        });
        document.getElementById('counted-total').textContent = `$${formatNumber(total)}`;
    }

    async function saveCashCount() {
        try {
            const bills = {};
            const coins = {};

            document.querySelectorAll('.denomination-input').forEach(input => {
                const denom = input.dataset.denom;
                const type = input.dataset.type;
                const count = parseInt(input.value) || 0;

                if (count > 0) {
                    if (type === 'bills') bills[denom] = count;
                    else coins[denom] = count;
                }
            });

            await apiCall('/cash-counts', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: state.currentSession.id,
                    countType: document.getElementById('count-type').value,
                    cashDenominations: { bills, coins },
                    notes: document.getElementById('count-notes').value
                })
            });

            closeModal();
            showNotification('Arqueo registrado correctamente', 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    function formatNumber(num) {
        return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);
    }

    function formatTime(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function getMovementTypeLabel(type) {
        const labels = {
            'income': 'Ingreso',
            'expense': 'Egreso',
            'transfer_in': 'Transf. Entrada',
            'transfer_out': 'Transf. Salida'
        };
        return labels[type] || type;
    }

    function getMovementBadgeClass(type) {
        if (type === 'income' || type === 'transfer_in') return 'cash-badge-success';
        return 'cash-badge-danger';
    }

    function getRegisterTypeLabel(type) {
        const labels = {
            'main': 'Principal',
            'individual': 'Individual',
            'petty_cash': 'Fondo Fijo',
            'vault': 'Bóveda'
        };
        return labels[type] || type;
    }

    function showNotification(message, type = 'info') {
        // Usar el sistema de notificaciones existente si está disponible
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }

    // =========================================================================
    // API PÚBLICA
    // =========================================================================

    return {
        init: function(container) {
            render(container);
        },
        render,
        switchView,
        closeModal,
        showOpenSessionModal,
        openSession,
        showCloseSessionModal,
        closeSession,
        showNewMovementModal,
        createMovement,
        showNewTransferModal,
        createTransfer,
        confirmTransfer,
        showRejectTransferModal,
        rejectTransfer,
        showCancelTransferModal,
        cancelTransfer,
        showCashCountModal,
        saveCashCount,
        showFundDetail: async function(fundId) {
            // TODO: Implementar vista detalle de fondo fijo
            showNotification('Detalle de fondo fijo - En desarrollo', 'info');
        },
        showNewFundModal: function() {
            // TODO: Implementar modal de nuevo fondo fijo
            showNotification('Nuevo fondo fijo - En desarrollo', 'info');
        },
        showNewPaymentMethodModal: function() {
            // TODO: Implementar modal de nuevo método de pago
            showNotification('Nuevo método de pago - En desarrollo', 'info');
        },
        showNewRegisterModal: function() {
            // TODO: Implementar modal de nueva caja
            showNotification('Nueva caja - En desarrollo', 'info');
        },
        showAssignUserModal: function(registerId) {
            // TODO: Implementar modal de asignación de usuario
            showNotification('Asignar usuario - En desarrollo', 'info');
        }
    };
})();
