/**
 * Finance Chart of Accounts Module
 * Plan de Cuentas con estructura jerárquica 1XXX-7XXX
 */

window.FinanceChartOfAccounts = (function() {
    'use strict';

    const API_BASE = '/api/finance/accounts';
    let accounts = [];
    let selectedAccount = null;

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    async function init(container) {
        console.log('📋 Inicializando Plan de Cuentas...');

        container.innerHTML = renderStructure();
        await loadAccounts();

        console.log('✅ Plan de Cuentas inicializado');
    }

    function renderStructure() {
        return `
            <div class="finance-module">
                <div class="module-header">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <button onclick="window.showModuleContent('finance-dashboard', 'Finance Dashboard')" class="finance-back-btn">
                            ← Volver a Finance
                        </button>
                        <h2>📋 Plan de Cuentas</h2>
                    </div>
                    <div class="header-actions">
                        <input type="text" id="account-search" placeholder="Buscar cuenta..." class="search-input" oninput="FinanceChartOfAccounts.filterAccounts()">
                        <select id="account-type-filter" class="filter-select" onchange="FinanceChartOfAccounts.filterAccounts()">
                            <option value="">Todos los tipos</option>
                            <option value="asset">Activo</option>
                            <option value="liability">Pasivo</option>
                            <option value="equity">Patrimonio</option>
                            <option value="revenue">Ingresos</option>
                            <option value="expense">Gastos</option>
                        </select>
                        <button onclick="FinanceChartOfAccounts.showCreateModal()" class="btn-primary">
                            + Nueva Cuenta
                        </button>
                    </div>
                </div>

                <div class="module-content">
                    <div class="tree-container" id="accounts-tree"></div>
                </div>

                <!-- Modal Crear/Editar -->
                <div id="account-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="modal-title">Nueva Cuenta</h3>
                            <button onclick="FinanceChartOfAccounts.closeModal()" class="btn-close">&times;</button>
                        </div>
                        <form id="account-form" onsubmit="return FinanceChartOfAccounts.saveAccount(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Código de Cuenta *</label>
                                    <input type="text" name="account_code" required placeholder="1.1.01.001" pattern="[0-9.]+">
                                </div>
                                <div class="form-group">
                                    <label>Nombre *</label>
                                    <input type="text" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label>Tipo de Cuenta *</label>
                                    <select name="account_type" required>
                                        <option value="asset">Activo</option>
                                        <option value="liability">Pasivo</option>
                                        <option value="equity">Patrimonio Neto</option>
                                        <option value="revenue">Ingresos</option>
                                        <option value="expense">Gastos</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Naturaleza *</label>
                                    <select name="account_nature" required>
                                        <option value="debit">Débito (Deudora)</option>
                                        <option value="credit">Crédito (Acreedora)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Cuenta Padre</label>
                                    <select name="parent_id" id="parent-account-select">
                                        <option value="">Sin cuenta padre</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Nivel</label>
                                    <select name="level" required>
                                        <option value="1">1 - Tipo</option>
                                        <option value="2">2 - Mayor</option>
                                        <option value="3">3 - SubMayor</option>
                                        <option value="4">4 - Auxiliar</option>
                                    </select>
                                </div>
                                <div class="form-group full-width">
                                    <label>Descripción</label>
                                    <textarea name="description" rows="2"></textarea>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="is_header">
                                        Es cuenta de grupo (no imputable)
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="requires_cost_center">
                                        Requiere Centro de Costo
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" name="is_budgetable" checked>
                                        Presupuestable
                                    </label>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" onclick="FinanceChartOfAccounts.closeModal()" class="btn-secondary">Cancelar</button>
                                <button type="submit" class="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>
                .finance-module { padding: 20px; }
                .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .module-header h2 { margin: 0; color: #333; }
                .header-actions { display: flex; gap: 12px; align-items: center; }
                .search-input, .filter-select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; }
                .search-input { width: 200px; }
                .btn-primary { background: #2196F3; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
                .btn-secondary { background: #9e9e9e; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
                .btn-close { background: none; border: none; font-size: 24px; cursor: pointer; }

                .tree-container { background: white; border-radius: 8px; padding: 16px; max-height: 600px; overflow-y: auto; }
                .tree-item { padding: 8px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
                .tree-item:hover { background: #f5f5f5; }
                .tree-item.header { font-weight: 600; color: #333; }
                .tree-item.level-1 { margin-left: 0; font-size: 15px; font-weight: 700; background: #e3f2fd; }
                .tree-item.level-2 { margin-left: 24px; font-size: 14px; font-weight: 600; }
                .tree-item.level-3 { margin-left: 48px; font-size: 13px; }
                .tree-item.level-4 { margin-left: 72px; font-size: 13px; color: #666; }
                .tree-item .account-code { color: #2196F3; font-family: monospace; min-width: 100px; }
                .tree-item .account-type { font-size: 11px; padding: 2px 6px; border-radius: 4px; }
                .tree-item .account-type.asset { background: #e8f5e9; color: #2e7d32; }
                .tree-item .account-type.liability { background: #ffebee; color: #c62828; }
                .tree-item .account-type.equity { background: #e3f2fd; color: #1565c0; }
                .tree-item .account-type.revenue { background: #f3e5f5; color: #7b1fa2; }
                .tree-item .account-type.expense { background: #fff3e0; color: #e65100; }

                .modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .modal-content { background: white; border-radius: 12px; width: 600px; max-height: 90vh; overflow-y: auto; }
                .modal-header { padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
                .modal-header h3 { margin: 0; }
                .modal-footer { padding: 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 12px; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 20px; }
                .form-group { display: flex; flex-direction: column; gap: 4px; }
                .form-group.full-width { grid-column: span 2; }
                .form-group label { font-weight: 500; font-size: 13px; color: #555; }
                .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; }
                .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
                .checkbox-label input { width: auto; }
            </style>
        `;
    }

    // =============================================
    // CARGA DE DATOS
    // =============================================

    async function loadAccounts() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/chart`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                accounts = result.data;
                renderAccountsTree();
                populateParentSelect();
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }

    function renderAccountsTree() {
        const container = document.getElementById('accounts-tree');
        if (!container) return;

        const searchTerm = document.getElementById('account-search')?.value?.toLowerCase() || '';
        const typeFilter = document.getElementById('account-type-filter')?.value || '';

        let filtered = accounts;

        if (searchTerm) {
            filtered = filtered.filter(a =>
                a.account_code.toLowerCase().includes(searchTerm) ||
                a.name.toLowerCase().includes(searchTerm)
            );
        }

        if (typeFilter) {
            filtered = filtered.filter(a => a.account_type === typeFilter);
        }

        // Ordenar por account_number
        filtered.sort((a, b) => a.account_number - b.account_number);

        container.innerHTML = filtered.map(account => `
            <div class="tree-item level-${account.level} ${account.is_header ? 'header' : ''}"
                 onclick="FinanceChartOfAccounts.selectAccount(${account.id})">
                <span class="account-code">${account.account_code}</span>
                <span class="account-name" style="flex: 1;">${account.name}</span>
                <span class="account-type ${account.account_type}">${getTypeLabel(account.account_type)}</span>
                ${account.is_header ? '<span style="font-size: 11px; color: #999;">📁</span>' : ''}
            </div>
        `).join('') || '<div style="padding: 20px; text-align: center; color: #999;">No se encontraron cuentas</div>';
    }

    function populateParentSelect() {
        const select = document.getElementById('parent-account-select');
        if (!select) return;

        const headerAccounts = accounts.filter(a => a.is_header);

        select.innerHTML = '<option value="">Sin cuenta padre</option>' +
            headerAccounts.map(a => `
                <option value="${a.id}">${a.account_code} - ${a.name}</option>
            `).join('');
    }

    function getTypeLabel(type) {
        const labels = {
            asset: 'Activo',
            liability: 'Pasivo',
            equity: 'Patrimonio',
            revenue: 'Ingreso',
            expense: 'Gasto'
        };
        return labels[type] || type;
    }

    // =============================================
    // ACCIONES
    // =============================================

    function filterAccounts() {
        renderAccountsTree();
    }

    function selectAccount(id) {
        selectedAccount = accounts.find(a => a.id === id);
        showEditModal(selectedAccount);
    }

    function showCreateModal() {
        selectedAccount = null;
        document.getElementById('modal-title').textContent = 'Nueva Cuenta';
        document.getElementById('account-form').reset();
        document.getElementById('account-modal').style.display = 'flex';
    }

    function showEditModal(account) {
        document.getElementById('modal-title').textContent = 'Editar Cuenta';
        const form = document.getElementById('account-form');

        form.account_code.value = account.account_code;
        form.name.value = account.name;
        form.account_type.value = account.account_type;
        form.account_nature.value = account.account_nature;
        form.parent_id.value = account.parent_id || '';
        form.level.value = account.level;
        form.description.value = account.description || '';
        form.is_header.checked = account.is_header;
        form.requires_cost_center.checked = account.requires_cost_center;
        form.is_budgetable.checked = account.is_budgetable;

        document.getElementById('account-modal').style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('account-modal').style.display = 'none';
        selectedAccount = null;
    }

    async function saveAccount(event) {
        event.preventDefault();

        const form = event.target;
        const data = {
            account_code: form.account_code.value,
            name: form.name.value,
            account_type: form.account_type.value,
            account_nature: form.account_nature.value,
            parent_id: form.parent_id.value || null,
            level: parseInt(form.level.value),
            description: form.description.value,
            is_header: form.is_header.checked,
            requires_cost_center: form.requires_cost_center.checked,
            is_budgetable: form.is_budgetable.checked
        };

        try {
            const token = localStorage.getItem('token');
            const url = selectedAccount ? `${API_BASE}/chart/${selectedAccount.id}` : `${API_BASE}/chart`;
            const method = selectedAccount ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                closeModal();
                await loadAccounts();
                alert(selectedAccount ? 'Cuenta actualizada' : 'Cuenta creada');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving account:', error);
            alert('Error al guardar');
        }
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    return {
        init,
        filterAccounts,
        selectAccount,
        showCreateModal,
        closeModal,
        saveAccount
    };

})();
