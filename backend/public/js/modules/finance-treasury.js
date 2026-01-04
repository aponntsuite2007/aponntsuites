/**
 * Finance Treasury Module
 * Tesorería: Cuentas Bancarias, Transacciones, Conciliación
 */

window.FinanceTreasury = (function() {
    'use strict';

    const API_BASE = '/api/finance/treasury';
    let bankAccounts = [];
    let selectedAccount = null;

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    async function init(container) {
        console.log('🏦 Inicializando Tesorería...');

        container.innerHTML = renderStructure();
        await loadBankAccounts();

        console.log('✅ Tesorería inicializado');
    }

    function renderStructure() {
        return `
            <div class="finance-module">
                <div class="module-header">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <button onclick="window.showModuleContent('finance-dashboard', 'Finance Dashboard')" class="finance-back-btn">
                            ← Volver a Finance
                        </button>
                        <h2>🏦 Tesorería</h2>
                    </div>
                    <div class="header-actions">
                        <button onclick="FinanceTreasury.showAddAccountModal()" class="btn-primary">
                            + Nueva Cuenta Bancaria
                        </button>
                    </div>
                </div>

                <!-- Dashboard Resumen -->
                <div class="treasury-dashboard" id="treasury-dashboard"></div>

                <!-- Tabs -->
                <div class="treasury-tabs">
                    <button class="tab-btn active" onclick="FinanceTreasury.switchTab('accounts')">🏦 Cuentas</button>
                    <button class="tab-btn" onclick="FinanceTreasury.switchTab('transactions')">💳 Transacciones</button>
                    <button class="tab-btn" onclick="FinanceTreasury.switchTab('reconciliation')">🔗 Conciliación</button>
                    <button class="tab-btn" onclick="FinanceTreasury.switchTab('cashflow')">📈 Flujo de Caja</button>
                </div>

                <div id="treasury-content" class="treasury-content"></div>

                <!-- Modal Cuenta Bancaria -->
                <div id="bank-account-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="bank-modal-title">Nueva Cuenta Bancaria</h3>
                            <button onclick="FinanceTreasury.closeModal('bank-account')" class="btn-close">&times;</button>
                        </div>
                        <form id="bank-account-form" onsubmit="return FinanceTreasury.saveBankAccount(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Código *</label>
                                    <input type="text" name="account_code" required placeholder="BCO-001">
                                </div>
                                <div class="form-group">
                                    <label>Nombre de la Cuenta *</label>
                                    <input type="text" name="account_name" required placeholder="Cuenta Corriente Principal">
                                </div>
                                <div class="form-group">
                                    <label>Banco *</label>
                                    <input type="text" name="bank_name" required placeholder="Banco Nación">
                                </div>
                                <div class="form-group">
                                    <label>Sucursal</label>
                                    <input type="text" name="bank_branch" placeholder="Casa Central">
                                </div>
                                <div class="form-group">
                                    <label>Número de Cuenta *</label>
                                    <input type="text" name="account_number" required>
                                </div>
                                <div class="form-group">
                                    <label>Tipo de Cuenta *</label>
                                    <select name="account_type" required>
                                        <option value="checking">Cuenta Corriente</option>
                                        <option value="savings">Caja de Ahorro</option>
                                        <option value="investment">Inversión</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>CBU</label>
                                    <input type="text" name="cbu" maxlength="22" placeholder="22 dígitos">
                                </div>
                                <div class="form-group">
                                    <label>Alias</label>
                                    <input type="text" name="alias" placeholder="MI.EMPRESA.PESOS">
                                </div>
                                <div class="form-group">
                                    <label>Moneda *</label>
                                    <select name="currency" required>
                                        <option value="ARS">ARS - Peso Argentino</option>
                                        <option value="USD">USD - Dólar Estadounidense</option>
                                        <option value="EUR">EUR - Euro</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Saldo Inicial</label>
                                    <input type="number" name="current_balance" step="0.01" value="0">
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="is_primary">
                                        Cuenta Principal
                                    </label>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" onclick="FinanceTreasury.closeModal('bank-account')" class="btn-secondary">Cancelar</button>
                                <button type="submit" class="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Modal Transacción -->
                <div id="transaction-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Nueva Transacción</h3>
                            <button onclick="FinanceTreasury.closeModal('transaction')" class="btn-close">&times;</button>
                        </div>
                        <form id="transaction-form" onsubmit="return FinanceTreasury.saveTransaction(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Cuenta Bancaria *</label>
                                    <select name="bank_account_id" id="tx-bank-select" required></select>
                                </div>
                                <div class="form-group">
                                    <label>Fecha *</label>
                                    <input type="date" name="transaction_date" required value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="form-group">
                                    <label>Tipo *</label>
                                    <select name="transaction_type" required>
                                        <option value="deposit">Depósito</option>
                                        <option value="withdrawal">Extracción</option>
                                        <option value="transfer_in">Transferencia Entrante</option>
                                        <option value="transfer_out">Transferencia Saliente</option>
                                        <option value="fee">Comisión/Cargo</option>
                                        <option value="interest">Interés</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Monto *</label>
                                    <input type="number" name="amount" step="0.01" required>
                                    <small style="color: #666;">Positivo para entradas, negativo para salidas</small>
                                </div>
                                <div class="form-group full-width">
                                    <label>Descripción *</label>
                                    <input type="text" name="description" required>
                                </div>
                                <div class="form-group">
                                    <label>Referencia</label>
                                    <input type="text" name="reference">
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" onclick="FinanceTreasury.closeModal('transaction')" class="btn-secondary">Cancelar</button>
                                <button type="submit" class="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>
                .treasury-dashboard { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
                .dashboard-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .dashboard-card .card-title { font-size: 12px; color: #666; margin-bottom: 8px; }
                .dashboard-card .card-value { font-size: 28px; font-weight: 700; color: #333; }
                .dashboard-card .card-subtitle { font-size: 12px; color: #999; margin-top: 4px; }

                .treasury-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
                .treasury-content { background: white; border-radius: 8px; padding: 20px; min-height: 400px; }

                .accounts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
                .account-card { border: 1px solid #eee; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; }
                .account-card:hover { border-color: #2196F3; box-shadow: 0 2px 8px rgba(33,150,243,0.2); }
                .account-card.primary { border-color: #4CAF50; background: #f1f8e9; }
                .account-card .bank-name { font-size: 12px; color: #666; }
                .account-card .account-name { font-size: 16px; font-weight: 600; margin: 4px 0; }
                .account-card .account-number { font-family: monospace; color: #999; font-size: 12px; }
                .account-card .balance { font-size: 24px; font-weight: 700; margin-top: 12px; }
                .account-card .balance.positive { color: #27ae60; }
                .account-card .balance.negative { color: #e74c3c; }

                .transactions-table { width: 100%; }
                .tx-type { padding: 4px 8px; border-radius: 4px; font-size: 11px; }
                .tx-type.deposit, .tx-type.transfer_in, .tx-type.interest { background: #d5f5e3; color: #27ae60; }
                .tx-type.withdrawal, .tx-type.transfer_out, .tx-type.fee { background: #fadbd8; color: #e74c3c; }
            </style>
        `;
    }

    // =============================================
    // CARGA DE DATOS
    // =============================================

    async function loadBankAccounts() {
        try {
            const token = localStorage.getItem('token');
            const [accountsRes, dashboardRes] = await Promise.all([
                fetch(`${API_BASE}/bank-accounts`, { headers: { 'Authorization': `Bearer ${token}` }}),
                fetch(`${API_BASE}/bank-accounts/dashboard`, { headers: { 'Authorization': `Bearer ${token}` }})
            ]);

            const accountsResult = await accountsRes.json();
            const dashboardResult = await dashboardRes.json();

            if (accountsResult.success) {
                bankAccounts = accountsResult.data;
            }

            if (dashboardResult.success) {
                renderDashboard(dashboardResult.data);
            }

            switchTab('accounts');
        } catch (error) {
            console.error('Error loading bank accounts:', error);
        }
    }

    function renderDashboard(data) {
        const container = document.getElementById('treasury-dashboard');
        if (!container) return;

        const totalBalance = data.total_balance || 0;
        const accountCount = data.total_accounts || 0;

        container.innerHTML = `
            <div class="dashboard-card">
                <div class="card-title">💰 Saldo Total</div>
                <div class="card-value" style="color: ${totalBalance >= 0 ? '#27ae60' : '#e74c3c'}">
                    ${formatCurrency(totalBalance)}
                </div>
                <div class="card-subtitle">${accountCount} cuenta(s) activa(s)</div>
            </div>
            <div class="dashboard-card">
                <div class="card-title">🏦 Cuenta Principal</div>
                <div class="card-value">${formatCurrency(data.primary_balance || 0)}</div>
                <div class="card-subtitle">${data.primary_account || 'No definida'}</div>
            </div>
            <div class="dashboard-card">
                <div class="card-title">📅 Pendientes de Conciliar</div>
                <div class="card-value">${data.pending_reconciliation || 0}</div>
                <div class="card-subtitle">transacciones</div>
            </div>
            <div class="dashboard-card">
                <div class="card-title">📊 Proyección 30 días</div>
                <div class="card-value">${formatCurrency(data.projected_30_days || totalBalance)}</div>
                <div class="card-subtitle">saldo estimado</div>
            </div>
        `;
    }

    function formatCurrency(amount) {
        if (!amount) return '$0';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency', currency: 'ARS', minimumFractionDigits: 0
        }).format(amount);
    }

    // =============================================
    // TABS
    // =============================================

    function switchTab(tabName) {
        document.querySelectorAll('.treasury-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event?.target?.classList.add('active');

        const content = document.getElementById('treasury-content');

        switch (tabName) {
            case 'accounts':
                renderAccountsTab(content);
                break;
            case 'transactions':
                renderTransactionsTab(content);
                break;
            case 'reconciliation':
                renderReconciliationTab(content);
                break;
            case 'cashflow':
                renderCashFlowTab(content);
                break;
        }
    }

    function renderAccountsTab(container) {
        if (bankAccounts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🏦</div>
                    <p>No hay cuentas bancarias registradas</p>
                    <button onclick="FinanceTreasury.showAddAccountModal()" class="btn-primary" style="margin-top: 16px;">
                        + Agregar Cuenta
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="accounts-grid">
                ${bankAccounts.map(account => `
                    <div class="account-card ${account.is_primary ? 'primary' : ''}" onclick="FinanceTreasury.selectAccount(${account.id})">
                        <div class="bank-name">${account.bank_name} ${account.is_primary ? '⭐' : ''}</div>
                        <div class="account-name">${account.account_name}</div>
                        <div class="account-number">${account.account_number}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                            <div class="balance ${account.current_balance >= 0 ? 'positive' : 'negative'}">
                                ${formatCurrency(account.current_balance)}
                            </div>
                            <span style="font-size: 12px; color: #999;">${account.currency}</span>
                        </div>
                        ${account.alias ? `<div style="font-size: 11px; color: #2196F3; margin-top: 8px;">📋 ${account.alias}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    async function renderTransactionsTab(container) {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                <div style="display: flex; gap: 12px;">
                    <select id="tx-account-filter" class="filter-select" onchange="FinanceTreasury.loadTransactions()">
                        <option value="">Todas las cuentas</option>
                        ${bankAccounts.map(a => `<option value="${a.id}">${a.account_name}</option>`).join('')}
                    </select>
                    <input type="date" id="tx-start-date" class="filter-select" onchange="FinanceTreasury.loadTransactions()">
                    <input type="date" id="tx-end-date" class="filter-select" onchange="FinanceTreasury.loadTransactions()">
                </div>
                <button onclick="FinanceTreasury.showTransactionModal()" class="btn-primary">+ Nueva Transacción</button>
            </div>
            <div id="transactions-list">Cargando...</div>
        `;

        await loadTransactions();
    }

    async function loadTransactions() {
        const accountId = document.getElementById('tx-account-filter')?.value;
        const startDate = document.getElementById('tx-start-date')?.value;
        const endDate = document.getElementById('tx-end-date')?.value;

        const params = new URLSearchParams();
        if (accountId) params.append('bank_account_id', accountId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/transactions?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            const container = document.getElementById('transactions-list');

            if (result.success && result.data.length > 0) {
                container.innerHTML = `
                    <table class="data-table transactions-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Cuenta</th>
                                <th>Tipo</th>
                                <th>Descripción</th>
                                <th style="text-align: right;">Monto</th>
                                <th>Conciliado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.data.map(tx => `
                                <tr>
                                    <td>${new Date(tx.transaction_date).toLocaleDateString('es-AR')}</td>
                                    <td>${tx.bankAccount?.account_name || '-'}</td>
                                    <td><span class="tx-type ${tx.transaction_type}">${getTypeLabel(tx.transaction_type)}</span></td>
                                    <td>${tx.description}</td>
                                    <td style="text-align: right; font-family: monospace; color: ${tx.amount >= 0 ? '#27ae60' : '#e74c3c'}">
                                        ${formatCurrency(tx.amount)}
                                    </td>
                                    <td>${tx.is_reconciled ? '✅' : '⏳'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No hay transacciones</div>';
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    function getTypeLabel(type) {
        const labels = {
            deposit: 'Depósito',
            withdrawal: 'Extracción',
            transfer_in: 'Transf. Entrada',
            transfer_out: 'Transf. Salida',
            fee: 'Comisión',
            interest: 'Interés'
        };
        return labels[type] || type;
    }

    async function renderReconciliationTab(container) {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                <div>
                    <select id="recon-account" class="filter-select">
                        ${bankAccounts.map(a => `<option value="${a.id}">${a.account_name}</option>`).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button onclick="FinanceTreasury.loadReconciliationSuggestions()" class="btn-secondary">🔍 Ver Sugerencias</button>
                    <button onclick="FinanceTreasury.runAutoReconciliation()" class="btn-primary">⚡ Auto-Conciliar</button>
                </div>
            </div>
            <div id="reconciliation-content">
                <p style="color: #666;">Seleccione una cuenta y haga clic en "Ver Sugerencias" para ver las transacciones pendientes de conciliar.</p>
            </div>
        `;
    }

    async function loadReconciliationSuggestions() {
        const accountId = document.getElementById('recon-account')?.value;
        if (!accountId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/reconciliation/suggestions/${accountId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            const container = document.getElementById('reconciliation-content');

            if (result.success && result.data.length > 0) {
                container.innerHTML = `
                    <h4>🔗 Sugerencias de Conciliación (${result.data.length})</h4>
                    ${result.data.map(s => `
                        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between;">
                                <div>
                                    <strong>Transacción:</strong> ${s.transaction.description}<br>
                                    <small>${formatCurrency(s.transaction.amount)} - ${new Date(s.transaction.date).toLocaleDateString()}</small>
                                </div>
                                <div style="text-align: right;">
                                    <strong>Mejor coincidencia:</strong> ${s.matches[0]?.score}% score<br>
                                    <button class="btn-link" onclick="FinanceTreasury.reconcile(${s.transaction.id}, ${s.matches[0]?.entry_id})">
                                        ✓ Conciliar
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                `;
            } else {
                container.innerHTML = '<p style="color: #27ae60;">✅ No hay transacciones pendientes de conciliar</p>';
            }
        } catch (error) {
            console.error('Error loading suggestions:', error);
        }
    }

    async function runAutoReconciliation() {
        const accountId = document.getElementById('recon-account')?.value;
        if (!accountId) return;

        if (!confirm('¿Ejecutar conciliación automática? Se conciliarán las transacciones con score >= 90%.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/reconciliation/auto/${accountId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                alert(`Conciliación completada: ${result.data.reconciled} conciliadas, ${result.data.failed} fallidas`);
                loadReconciliationSuggestions();
            }
        } catch (error) {
            console.error('Error in auto reconciliation:', error);
        }
    }

    async function renderCashFlowTab(container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">Cargando proyección de flujo de caja...</div>';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/cash-flow/scenarios?days=30`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (result.success) {
                container.innerHTML = `
                    <h4>📈 Proyección de Flujo de Caja - Próximos 30 días</h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
                        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 12px; color: #666;">Escenario Optimista</div>
                            <div style="font-size: 28px; font-weight: 700; color: #27ae60;">
                                ${formatCurrency(result.data.optimistic?.projected_end_balance)}
                            </div>
                        </div>
                        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 12px; color: #666;">Escenario Base</div>
                            <div style="font-size: 28px; font-weight: 700; color: #1976D2;">
                                ${formatCurrency(result.data.base?.projected_end_balance)}
                            </div>
                        </div>
                        <div style="background: #ffebee; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 12px; color: #666;">Escenario Pesimista</div>
                            <div style="font-size: 28px; font-weight: 700; color: #c62828;">
                                ${formatCurrency(result.data.pessimistic?.projected_end_balance)}
                            </div>
                        </div>
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

    function showAddAccountModal() {
        document.getElementById('bank-modal-title').textContent = 'Nueva Cuenta Bancaria';
        document.getElementById('bank-account-form').reset();
        document.getElementById('bank-account-modal').style.display = 'flex';
    }

    function showTransactionModal() {
        const select = document.getElementById('tx-bank-select');
        select.innerHTML = bankAccounts.map(a => `<option value="${a.id}">${a.account_name}</option>`).join('');
        document.getElementById('transaction-form').reset();
        document.getElementById('transaction-modal').style.display = 'flex';
    }

    function closeModal(type) {
        document.getElementById(`${type}-modal`).style.display = 'none';
    }

    function selectAccount(id) {
        selectedAccount = bankAccounts.find(a => a.id === id);
        // Could show detail modal or navigate to transactions filtered by account
        document.getElementById('tx-account-filter').value = id;
        switchTab('transactions');
    }

    async function saveBankAccount(event) {
        event.preventDefault();

        const form = event.target;
        const data = {
            account_code: form.account_code.value,
            account_name: form.account_name.value,
            bank_name: form.bank_name.value,
            bank_branch: form.bank_branch.value,
            account_number: form.account_number.value,
            account_type: form.account_type.value,
            cbu: form.cbu.value,
            alias: form.alias.value,
            currency: form.currency.value,
            current_balance: parseFloat(form.current_balance.value) || 0,
            is_primary: form.is_primary.checked
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/bank-accounts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                closeModal('bank-account');
                await loadBankAccounts();
                alert('Cuenta bancaria creada correctamente');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving bank account:', error);
            alert('Error al guardar');
        }
    }

    async function saveTransaction(event) {
        event.preventDefault();

        const form = event.target;
        const data = {
            bank_account_id: parseInt(form.bank_account_id.value),
            transaction_date: form.transaction_date.value,
            transaction_type: form.transaction_type.value,
            amount: parseFloat(form.amount.value),
            description: form.description.value,
            reference: form.reference.value
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/transactions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.success) {
                closeModal('transaction');
                await loadBankAccounts();
                await loadTransactions();
                alert('Transacción registrada correctamente');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving transaction:', error);
            alert('Error al guardar');
        }
    }

    async function reconcile(transactionId, entryId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/reconciliation/reconcile`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ transaction_id: transactionId, journal_entry_id: entryId })
            });

            const result = await response.json();
            if (result.success) {
                alert('Transacción conciliada');
                loadReconciliationSuggestions();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error reconciling:', error);
        }
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    return {
        init,
        switchTab,
        loadTransactions,
        loadReconciliationSuggestions,
        runAutoReconciliation,
        showAddAccountModal,
        showTransactionModal,
        closeModal,
        selectAccount,
        saveBankAccount,
        saveTransaction,
        reconcile
    };

})();
