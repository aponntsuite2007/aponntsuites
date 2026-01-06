/**
 * Finance Journal Entries Module
 * Asientos Contables manuales y visualización
 */

// ============================================================================
// 💡 SISTEMA DE AYUDA CONTEXTUAL
// ============================================================================
if (typeof ModuleHelpSystem !== 'undefined') {
    ModuleHelpSystem.registerModule('finance-journal-entries', {
        moduleName: 'Asientos Contables',
        moduleDescription: 'Registro y gestión de asientos contables con partida doble',
        contexts: {
            list: {
                title: 'Libro Diario',
                description: 'Lista de todos los asientos contables',
                tips: [
                    'Los asientos usan partida doble: débito = crédito siempre',
                    'Filtra por fecha, cuenta o estado (borrador/aprobado)',
                    'Click en un asiento para ver su detalle completo'
                ],
                warnings: ['Los asientos aprobados no pueden modificarse'],
                helpTopics: ['¿Qué es la partida doble?', '¿Cómo crear un asiento?', '¿Cuándo aprobar un asiento?'],
                fieldHelp: {
                    date: 'Fecha del asiento contable',
                    reference: 'Número de referencia o comprobante',
                    description: 'Descripción del movimiento contable',
                    debit: 'Cuenta y monto del débito (debe)',
                    credit: 'Cuenta y monto del crédito (haber)',
                    status: 'Borrador o Aprobado'
                }
            }
        },
        fallbackResponses: {
            'partida doble': 'La partida doble asegura que cada movimiento tenga débito y crédito iguales.',
            'aprobar': 'Aprueba un asiento cuando hayas verificado que está correcto. Una vez aprobado, no se puede editar.',
            'borrador': 'Los borradores permiten guardar asientos sin afectar los balances. Apruébalos cuando estén listos.'
        }
    });
}

window.FinanceJournalEntries = (function() {
    'use strict';

    const API_BASE = '/api/finance/accounts/journal-entries';
    let entries = [];
    let currentEntry = null;
    let accounts = [];

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    async function init(container) {
        console.log('📓 Inicializando Asientos Contables...');

        // Inicializar sistema de ayuda
        if (typeof ModuleHelpSystem !== 'undefined') {
            ModuleHelpSystem.init('finance-journal-entries');
            ModuleHelpSystem.setContext('list');
        }

        container.innerHTML = renderStructure();
        await Promise.all([loadEntries(), loadAccounts()]);

        console.log('✅ Asientos Contables inicializado');
    }

    function renderStructure() {
        const currentYear = new Date().getFullYear();

        return `
            <div class="finance-module">
                <div class="module-header">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <button onclick="window.showModuleContent('finance-dashboard', 'Finance Dashboard')" class="finance-back-btn">
                            ← Volver a Finance
                        </button>
                        <h2>📓 Asientos Contables</h2>
                    </div>
                    <div class="header-actions">
                        <select id="entry-year" class="filter-select" onchange="FinanceJournalEntries.filterEntries()">
                            <option value="${currentYear}">${currentYear}</option>
                            <option value="${currentYear - 1}">${currentYear - 1}</option>
                        </select>
                        <select id="entry-period" class="filter-select" onchange="FinanceJournalEntries.filterEntries()">
                            <option value="">Todos los períodos</option>
                            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m =>
                                `<option value="${m}">${getMonthName(m)}</option>`
                            ).join('')}
                        </select>
                        <select id="entry-status" class="filter-select" onchange="FinanceJournalEntries.filterEntries()">
                            <option value="">Todos</option>
                            <option value="draft">Borrador</option>
                            <option value="posted">Contabilizado</option>
                            <option value="reversed">Revertido</option>
                        </select>
                        <button onclick="FinanceJournalEntries.showCreateModal()" class="btn-primary">
                            + Nuevo Asiento
                        </button>
                    </div>
                </div>

                ${typeof ModuleHelpSystem !== 'undefined' ? ModuleHelpSystem.renderBanner('list') : ''}

                <div class="module-content">
                    <div id="entries-table" class="table-container"></div>
                </div>

                <!-- Modal Ver Asiento -->
                <div id="entry-view-modal" class="modal" style="display: none;">
                    <div class="modal-content modal-wide">
                        <div class="modal-header">
                            <h3>Detalle del Asiento</h3>
                            <button onclick="FinanceJournalEntries.closeModal('view')" class="btn-close">&times;</button>
                        </div>
                        <div id="entry-view-content"></div>
                    </div>
                </div>

                <!-- Modal Crear Asiento -->
                <div id="entry-create-modal" class="modal" style="display: none;">
                    <div class="modal-content modal-wide">
                        <div class="modal-header">
                            <h3>Nuevo Asiento Contable</h3>
                            <button onclick="FinanceJournalEntries.closeModal('create')" class="btn-close">&times;</button>
                        </div>
                        <form id="entry-form" onsubmit="return FinanceJournalEntries.saveEntry(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Fecha *</label>
                                    <input type="date" name="entry_date" required value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="form-group">
                                    <label>Referencia</label>
                                    <input type="text" name="reference" placeholder="Factura, Recibo, etc.">
                                </div>
                                <div class="form-group full-width">
                                    <label>Descripción *</label>
                                    <textarea name="description" required rows="2" placeholder="Descripción del asiento..."></textarea>
                                </div>
                            </div>

                            <h4>Líneas del Asiento</h4>
                            <div id="entry-lines-container">
                                <table class="lines-table">
                                    <thead>
                                        <tr>
                                            <th style="width: 40%;">Cuenta</th>
                                            <th>Centro Costo</th>
                                            <th>Débito</th>
                                            <th>Crédito</th>
                                            <th>Descripción</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody id="entry-lines-body"></tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="2" style="text-align: right; font-weight: 600;">Totales:</td>
                                            <td id="total-debit" style="font-weight: 600; color: #2196F3;">$0</td>
                                            <td id="total-credit" style="font-weight: 600; color: #4CAF50;">$0</td>
                                            <td id="balance-indicator"></td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <button type="button" onclick="FinanceJournalEntries.addLine()" class="btn-secondary" style="margin-top: 12px;">
                                    + Agregar Línea
                                </button>
                            </div>

                            <div class="modal-footer">
                                <button type="button" onclick="FinanceJournalEntries.closeModal('create')" class="btn-secondary">Cancelar</button>
                                <button type="submit" class="btn-primary">Guardar Borrador</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>
                .table-container { background: white; border-radius: 8px; overflow: hidden; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; }
                .data-table th { background: #f5f5f5; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #666; }
                .data-table tr:hover { background: #f9f9f9; }
                .data-table .status { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
                .data-table .status-draft { background: #ffeaa7; color: #d68910; }
                .data-table .status-posted { background: #d5f5e3; color: #27ae60; }
                .data-table .status-reversed { background: #fadbd8; color: #c0392b; }

                .lines-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                .lines-table th, .lines-table td { padding: 8px; border: 1px solid #ddd; }
                .lines-table th { background: #f5f5f5; font-size: 12px; }
                .lines-table input, .lines-table select { width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; }
                .lines-table .amount-input { text-align: right; }

                .entry-header { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px; }
                .entry-header .header-item label { font-size: 11px; color: #666; display: block; }
                .entry-header .header-item span { font-size: 16px; font-weight: 500; }

                .entry-lines { margin-top: 20px; }
                .entry-lines h4 { margin-bottom: 12px; }
            </style>
        `;
    }

    function getMonthName(m) {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[m - 1];
    }

    // =============================================
    // CARGA DE DATOS
    // =============================================

    async function loadEntries() {
        try {
            const year = document.getElementById('entry-year')?.value;
            const period = document.getElementById('entry-period')?.value;
            const status = document.getElementById('entry-status')?.value;

            const params = new URLSearchParams();
            if (year) params.append('fiscal_year', year);
            if (period) params.append('fiscal_period', period);
            if (status) params.append('status', status);

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                entries = result.data;
                renderEntriesTable();
            }
        } catch (error) {
            console.error('Error loading entries:', error);
        }
    }

    async function loadAccounts() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/finance/accounts/chart?is_header=false', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                accounts = result.data;
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }

    function renderEntriesTable() {
        const container = document.getElementById('entries-table');
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📓</div>
                    <p>No hay asientos para el período seleccionado</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Origen</th>
                        <th style="text-align: right;">Débito</th>
                        <th style="text-align: right;">Crédito</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map(entry => `
                        <tr>
                            <td style="font-family: monospace;">${entry.entry_number}</td>
                            <td>${formatDate(entry.entry_date)}</td>
                            <td>${truncate(entry.description, 40)}</td>
                            <td>
                                <span style="font-size: 11px; color: #666;">
                                    ${getSourceLabel(entry.source_type)}
                                </span>
                            </td>
                            <td style="text-align: right; font-family: monospace;">${formatCurrency(entry.total_debit)}</td>
                            <td style="text-align: right; font-family: monospace;">${formatCurrency(entry.total_credit)}</td>
                            <td>
                                <span class="status status-${entry.status}">${getStatusLabel(entry.status)}</span>
                            </td>
                            <td>
                                <button onclick="FinanceJournalEntries.viewEntry(${entry.id})" class="btn-link">Ver</button>
                                ${entry.status === 'draft' ? `
                                    <button onclick="FinanceJournalEntries.postEntry(${entry.id})" class="btn-link" style="color: #27ae60;">Contabilizar</button>
                                ` : ''}
                                ${entry.status === 'posted' ? `
                                    <button onclick="FinanceJournalEntries.reverseEntry(${entry.id})" class="btn-link" style="color: #e74c3c;">Revertir</button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function getSourceLabel(source) {
        const labels = {
            manual: '✏️ Manual',
            payroll: '💰 Nómina',
            billing: '🧾 Facturación',
            procurement: '🛒 Compras',
            bank: '🏦 Banco',
            auto: '⚡ Automático'
        };
        return labels[source] || source || 'Manual';
    }

    function getStatusLabel(status) {
        const labels = { draft: 'Borrador', posted: 'Contabilizado', reversed: 'Revertido' };
        return labels[status] || status;
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString('es-AR');
    }

    function formatCurrency(amount) {
        if (!amount) return '$0';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency', currency: 'ARS', minimumFractionDigits: 2
        }).format(amount);
    }

    function truncate(str, len) {
        return str?.length > len ? str.substring(0, len) + '...' : str || '';
    }

    // =============================================
    // ACCIONES
    // =============================================

    function filterEntries() {
        loadEntries();
    }

    async function viewEntry(id) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                currentEntry = result.data;
                showViewModal();
            }
        } catch (error) {
            console.error('Error loading entry:', error);
        }
    }

    function showViewModal() {
        const content = document.getElementById('entry-view-content');

        content.innerHTML = `
            <div class="entry-header">
                <div class="header-item">
                    <label>Número</label>
                    <span>${currentEntry.entry_number}</span>
                </div>
                <div class="header-item">
                    <label>Fecha</label>
                    <span>${formatDate(currentEntry.entry_date)}</span>
                </div>
                <div class="header-item">
                    <label>Estado</label>
                    <span class="status status-${currentEntry.status}">${getStatusLabel(currentEntry.status)}</span>
                </div>
                <div class="header-item">
                    <label>Origen</label>
                    <span>${getSourceLabel(currentEntry.source_type)}</span>
                </div>
                <div class="header-item">
                    <label>Referencia</label>
                    <span>${currentEntry.reference || '-'}</span>
                </div>
                <div class="header-item">
                    <label>Período</label>
                    <span>${currentEntry.fiscal_year}/${currentEntry.fiscal_period}</span>
                </div>
            </div>

            <div class="entry-description" style="padding: 16px; background: #f9f9f9; border-radius: 8px; margin-bottom: 20px;">
                <label style="font-size: 11px; color: #666;">Descripción:</label>
                <p style="margin: 8px 0 0;">${currentEntry.description}</p>
            </div>

            <div class="entry-lines">
                <h4>Líneas del Asiento</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Cuenta</th>
                            <th>Centro Costo</th>
                            <th style="text-align: right;">Débito</th>
                            <th style="text-align: right;">Crédito</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${currentEntry.lines?.map((line, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>
                                    <span style="font-family: monospace;">${line.account?.account_code}</span>
                                    ${line.account?.name}
                                </td>
                                <td>${line.costCenter?.name || '-'}</td>
                                <td style="text-align: right; font-family: monospace; color: #2196F3;">
                                    ${line.debit_amount > 0 ? formatCurrency(line.debit_amount) : ''}
                                </td>
                                <td style="text-align: right; font-family: monospace; color: #4CAF50;">
                                    ${line.credit_amount > 0 ? formatCurrency(line.credit_amount) : ''}
                                </td>
                                <td>${line.description || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: 600; background: #f5f5f5;">
                            <td colspan="3" style="text-align: right;">TOTALES:</td>
                            <td style="text-align: right; color: #2196F3;">${formatCurrency(currentEntry.total_debit)}</td>
                            <td style="text-align: right; color: #4CAF50;">${formatCurrency(currentEntry.total_credit)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div class="modal-footer" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                ${currentEntry.status === 'draft' ? `
                    <button onclick="FinanceJournalEntries.postEntry(${currentEntry.id})" class="btn-primary">
                        ✓ Contabilizar
                    </button>
                ` : ''}
                ${currentEntry.status === 'posted' ? `
                    <button onclick="FinanceJournalEntries.reverseEntry(${currentEntry.id})" class="btn-secondary" style="color: #e74c3c;">
                        ↩ Revertir
                    </button>
                ` : ''}
                <button onclick="FinanceJournalEntries.closeModal('view')" class="btn-secondary">Cerrar</button>
            </div>
        `;

        document.getElementById('entry-view-modal').style.display = 'flex';
    }

    function showCreateModal() {
        document.getElementById('entry-form').reset();
        document.getElementById('entry-lines-body').innerHTML = '';

        // Add two initial lines
        addLine();
        addLine();

        document.getElementById('entry-create-modal').style.display = 'flex';
    }

    function closeModal(type) {
        document.getElementById(`entry-${type}-modal`).style.display = 'none';
    }

    let lineCounter = 0;

    function addLine() {
        lineCounter++;
        const tbody = document.getElementById('entry-lines-body');

        const row = document.createElement('tr');
        row.id = `line-${lineCounter}`;
        row.innerHTML = `
            <td>
                <select name="account_id_${lineCounter}" required onchange="FinanceJournalEntries.updateTotals()">
                    <option value="">Seleccionar...</option>
                    ${accounts.map(a => `<option value="${a.id}">${a.account_code} - ${a.name}</option>`).join('')}
                </select>
            </td>
            <td>
                <select name="cost_center_id_${lineCounter}">
                    <option value="">-</option>
                </select>
            </td>
            <td>
                <input type="number" name="debit_${lineCounter}" step="0.01" min="0" class="amount-input"
                       onchange="FinanceJournalEntries.updateTotals()" onfocus="this.select()">
            </td>
            <td>
                <input type="number" name="credit_${lineCounter}" step="0.01" min="0" class="amount-input"
                       onchange="FinanceJournalEntries.updateTotals()" onfocus="this.select()">
            </td>
            <td>
                <input type="text" name="line_desc_${lineCounter}" placeholder="Descripción...">
            </td>
            <td>
                <button type="button" onclick="FinanceJournalEntries.removeLine(${lineCounter})" class="btn-link" style="color: #e74c3c;">✕</button>
            </td>
        `;

        tbody.appendChild(row);
    }

    function removeLine(id) {
        const row = document.getElementById(`line-${id}`);
        if (row) {
            row.remove();
            updateTotals();
        }
    }

    function updateTotals() {
        const form = document.getElementById('entry-form');
        let totalDebit = 0;
        let totalCredit = 0;

        // Find all debit and credit inputs
        const debitInputs = form.querySelectorAll('input[name^="debit_"]');
        const creditInputs = form.querySelectorAll('input[name^="credit_"]');

        debitInputs.forEach(input => {
            totalDebit += parseFloat(input.value) || 0;
        });

        creditInputs.forEach(input => {
            totalCredit += parseFloat(input.value) || 0;
        });

        document.getElementById('total-debit').textContent = formatCurrency(totalDebit);
        document.getElementById('total-credit').textContent = formatCurrency(totalCredit);

        const diff = Math.abs(totalDebit - totalCredit);
        const indicator = document.getElementById('balance-indicator');

        if (diff < 0.01) {
            indicator.innerHTML = '<span style="color: #27ae60;">✓ Cuadrado</span>';
        } else {
            indicator.innerHTML = `<span style="color: #e74c3c;">⚠ Diferencia: ${formatCurrency(diff)}</span>`;
        }
    }

    async function saveEntry(event) {
        event.preventDefault();

        const form = event.target;

        // Collect lines
        const lines = [];
        const rows = document.querySelectorAll('#entry-lines-body tr');

        rows.forEach((row, index) => {
            const lineNum = row.id.split('-')[1];
            const accountId = form[`account_id_${lineNum}`]?.value;
            const debit = parseFloat(form[`debit_${lineNum}`]?.value) || 0;
            const credit = parseFloat(form[`credit_${lineNum}`]?.value) || 0;

            if (accountId && (debit > 0 || credit > 0)) {
                lines.push({
                    account_id: parseInt(accountId),
                    cost_center_id: form[`cost_center_id_${lineNum}`]?.value || null,
                    debit_amount: debit,
                    credit_amount: credit,
                    description: form[`line_desc_${lineNum}`]?.value || ''
                });
            }
        });

        if (lines.length < 2) {
            alert('Un asiento debe tener al menos 2 líneas');
            return;
        }

        // Check balance
        const totalDebit = lines.reduce((sum, l) => sum + l.debit_amount, 0);
        const totalCredit = lines.reduce((sum, l) => sum + l.credit_amount, 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            alert('El asiento no está cuadrado. Débitos y créditos deben ser iguales.');
            return;
        }

        const data = {
            entry_date: form.entry_date.value,
            reference: form.reference.value,
            description: form.description.value,
            lines
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
                closeModal('create');
                await loadEntries();
                alert('Asiento creado correctamente');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Error al guardar');
        }
    }

    async function postEntry(id) {
        if (!confirm('¿Contabilizar este asiento? Una vez contabilizado no podrá modificarse.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${id}/post`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                closeModal('view');
                await loadEntries();
                alert('Asiento contabilizado correctamente');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error posting entry:', error);
            alert('Error al contabilizar');
        }
    }

    async function reverseEntry(id) {
        if (!confirm('¿Revertir este asiento? Se creará un asiento inverso.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/${id}/reverse`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description: 'Reversión de asiento' })
            });

            const result = await response.json();
            if (result.success) {
                closeModal('view');
                await loadEntries();
                alert('Asiento revertido correctamente');
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            console.error('Error reversing entry:', error);
            alert('Error al revertir');
        }
    }

    // =============================================
    // API PÚBLICA
    // =============================================

    return {
        init,
        filterEntries,
        viewEntry,
        showCreateModal,
        closeModal,
        addLine,
        removeLine,
        updateTotals,
        saveEntry,
        postEntry,
        reverseEntry
    };

})();
