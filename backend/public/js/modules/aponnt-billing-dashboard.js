/**
 * APONNT BILLING DASHBOARD
 * Dashboard administrativo para gestión de facturación APONNT → Empresas
 *
 * Funcionalidades:
 * - Ver pre-facturas pendientes de revisión
 * - Aprobar/Rechazar pre-facturas
 * - Facturar (generar factura AFIP desde pre-factura aprobada)
 * - Ver tareas administrativas pendientes
 * - Historial de facturación
 *
 * @version 1.0.0
 * @date 2025-12-17
 */

const AponntBillingDashboard = (function() {
    'use strict';

    // ==================== STATE ====================
    const state = {
        isLoading: true,
        currentView: 'pending',
        stats: {},
        preInvoices: [],
        adminTasks: [],
        emailConfigs: [],
        selectedPreInvoice: null,
        filters: {
            status: 'all',
            companyId: null
        }
    };

    // ==================== API ====================
    const API = {
        getAuthHeaders() {
            const token = window.getMultiKeyToken();
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
        },

        async getDashboardStats() {
            try {
                const response = await fetch('/api/aponnt/billing/dashboard/stats', {
                    headers: this.getAuthHeaders()
                });
                return await response.json();
            } catch (error) {
                console.error('[APONNT-BILLING] Error fetching stats:', error);
                return { success: false, data: {} };
            }
        },

        async getPreInvoices(filters = {}) {
            try {
                const params = new URLSearchParams();
                if (filters.status && filters.status !== 'all') params.append('status', filters.status);
                if (filters.companyId) params.append('companyId', filters.companyId);

                const response = await fetch(`/api/aponnt/billing/pre-invoices?${params}`, {
                    headers: this.getAuthHeaders()
                });
                return await response.json();
            } catch (error) {
                console.error('[APONNT-BILLING] Error fetching pre-invoices:', error);
                return { success: false, data: [] };
            }
        },

        async getPreInvoiceDetail(id) {
            try {
                const response = await fetch(`/api/aponnt/billing/pre-invoices/${id}`, {
                    headers: this.getAuthHeaders()
                });
                return await response.json();
            } catch (error) {
                console.error('[APONNT-BILLING] Error fetching pre-invoice detail:', error);
                return { success: false, data: null };
            }
        },

        async approvePreInvoice(id) {
            try {
                const response = await fetch(`/api/aponnt/billing/pre-invoices/${id}/approve`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders()
                });
                return await response.json();
            } catch (error) {
                console.error('[APONNT-BILLING] Error approving:', error);
                return { success: false, error: error.message };
            }
        },

        async rejectPreInvoice(id, reason) {
            try {
                const response = await fetch(`/api/aponnt/billing/pre-invoices/${id}/reject`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ reason })
                });
                return await response.json();
            } catch (error) {
                console.error('[APONNT-BILLING] Error rejecting:', error);
                return { success: false, error: error.message };
            }
        },

        async invoicePreInvoice(id) {
            try {
                const response = await fetch(`/api/aponnt/billing/pre-invoices/${id}/invoice`, {
                    method: 'PUT',
                    headers: this.getAuthHeaders()
                });
                return await response.json();
            } catch (error) {
                console.error('[APONNT-BILLING] Error invoicing:', error);
                return { success: false, error: error.message };
            }
        },

        async getAdminTasks(filters = {}) {
            try {
                const params = new URLSearchParams();
                if (filters.taskType) params.append('taskType', filters.taskType);
                if (filters.priority) params.append('priority', filters.priority);
                if (filters.status) params.append('status', filters.status);

                const response = await fetch(`/api/aponnt/billing/admin-tasks?${params}`, {
                    headers: this.getAuthHeaders()
                });
                return await response.json();
            } catch (error) {
                console.error('[APONNT-BILLING] Error fetching tasks:', error);
                return { success: false, data: [] };
            }
        },

        async getEmailConfigs() {
            try {
                const response = await fetch('/api/aponnt/billing/email-config', {
                    headers: this.getAuthHeaders()
                });
                return await response.json();
            } catch (error) {
                console.error('[APONNT-BILLING] Error fetching email configs:', error);
                return { success: false, data: [] };
            }
        }
    };

    // ==================== HELPERS ====================
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount || 0);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function getStatusClass(status) {
        const map = {
            'PENDING_REVIEW': 'warning',
            'APPROVED': 'info',
            'INVOICED': 'success',
            'REJECTED': 'danger',
            'CANCELLED': 'secondary',
            'PENDING': 'warning',
            'COMPLETED': 'success'
        };
        return map[status] || 'secondary';
    }

    function getStatusLabel(status) {
        const map = {
            'PENDING_REVIEW': 'Pendiente Revisión',
            'APPROVED': 'Aprobada',
            'INVOICED': 'Facturada',
            'REJECTED': 'Rechazada',
            'CANCELLED': 'Cancelada',
            'PENDING': 'Pendiente',
            'COMPLETED': 'Completada'
        };
        return map[status] || status;
    }

    function getPriorityClass(priority) {
        const map = { 'URGENT': 'danger', 'HIGH': 'warning', 'MEDIUM': 'info', 'LOW': 'secondary' };
        return map[priority] || 'secondary';
    }

    // ==================== RENDER ====================
    function render(container) {
        if (!container) {
            container = document.getElementById('content-area');
        }
        if (!container) {
            console.error('[APONNT-BILLING] No container found');
            return;
        }

        container.innerHTML = `
            <div class="billing-dashboard">
                ${renderStyles()}

                <div class="billing-header">
                    <div class="billing-header-left">
                        <h1 class="billing-title">
                            <span class="billing-icon">📋</span>
                            Pre-facturación
                        </h1>
                        <p class="billing-subtitle">Pre-facturas pendientes de aprobación y listas para facturar</p>
                    </div>
                    <div class="billing-header-actions">
                        <button class="billing-btn billing-btn-secondary" onclick="AponntBillingDashboard.refreshData()">
                            <i class="fas fa-sync-alt"></i> Actualizar
                        </button>
                    </div>
                </div>

                <!-- Tabs de navegación - Solo Pendientes y Aprobadas -->
                <div class="billing-tabs">
                    <button class="billing-tab ${state.currentView === 'pending' ? 'active' : ''}" onclick="AponntBillingDashboard.switchView('pending')">
                        ⏳ Pendientes
                        ${state.stats.pendingReview > 0 ? `<span class="billing-badge">${state.stats.pendingReview}</span>` : ''}
                    </button>
                    <button class="billing-tab ${state.currentView === 'approved' ? 'active' : ''}" onclick="AponntBillingDashboard.switchView('approved')">
                        ✅ Aprobadas
                        ${state.stats.approved > 0 ? `<span class="billing-badge billing-badge-success">${state.stats.approved}</span>` : ''}
                    </button>
                </div>

                <!-- Contenido principal -->
                <div class="billing-content" id="billing-content">
                    ${state.isLoading ? renderLoading() : renderCurrentView()}
                </div>
            </div>
        `;

        // Si no está cargando, actualizar solo el contenido
        if (!state.isLoading) {
            updateContent();
        }
    }

    function renderStyles() {
        return `
            <style>
                .billing-dashboard {
                    padding: 0;
                    max-width: 100%;
                }

                .billing-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 24px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.1));
                }

                .billing-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--text-primary, #e6edf3);
                    margin: 0 0 8px 0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .billing-icon {
                    font-size: 2rem;
                }

                .billing-subtitle {
                    color: var(--text-secondary, rgba(255,255,255,0.6));
                    margin: 0;
                    font-size: 0.9rem;
                }

                .billing-tabs {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    background: var(--dark-bg-secondary, #161b22);
                    padding: 8px;
                    border-radius: 12px;
                }

                .billing-tab {
                    padding: 12px 20px;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary, rgba(255,255,255,0.6));
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .billing-tab:hover {
                    background: rgba(255,255,255,0.05);
                    color: var(--text-primary, #e6edf3);
                }

                .billing-tab.active {
                    background: linear-gradient(135deg, var(--accent-primary, #f59e0b), #d97706);
                    color: #000;
                }

                .billing-badge {
                    background: var(--accent-danger, #ef4444);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .billing-badge-success {
                    background: var(--accent-success, #22c55e);
                }

                .billing-badge-warning {
                    background: var(--accent-warning, #f59e0b);
                    color: #000;
                }

                .billing-content {
                    background: var(--dark-bg-card, rgba(15,15,30,0.8));
                    border-radius: 16px;
                    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
                    padding: 24px;
                    min-height: 400px;
                }

                .billing-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 32px;
                }

                .billing-stat-card {
                    background: var(--dark-bg-secondary, #161b22);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
                }

                .billing-stat-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .billing-stat-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                }

                .billing-stat-icon.yellow { background: rgba(245, 158, 11, 0.2); }
                .billing-stat-icon.green { background: rgba(34, 197, 94, 0.2); }
                .billing-stat-icon.blue { background: rgba(59, 130, 246, 0.2); }
                .billing-stat-icon.purple { background: rgba(139, 92, 246, 0.2); }
                .billing-stat-icon.red { background: rgba(239, 68, 68, 0.2); }

                .billing-stat-value {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary, #e6edf3);
                    margin-bottom: 4px;
                }

                .billing-stat-label {
                    font-size: 0.85rem;
                    color: var(--text-secondary, rgba(255,255,255,0.6));
                }

                .billing-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .billing-table th,
                .billing-table td {
                    padding: 14px 16px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.1));
                }

                .billing-table th {
                    font-weight: 600;
                    color: var(--text-secondary, rgba(255,255,255,0.6));
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .billing-table tr:hover {
                    background: rgba(255,255,255,0.02);
                }

                .billing-status {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .billing-status.warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
                .billing-status.success { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
                .billing-status.info { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
                .billing-status.danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
                .billing-status.secondary { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }

                .billing-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                }

                .billing-btn-primary {
                    background: linear-gradient(135deg, var(--accent-primary, #f59e0b), #d97706);
                    color: #000;
                }

                .billing-btn-success {
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    color: white;
                }

                .billing-btn-danger {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                }

                .billing-btn-secondary {
                    background: var(--dark-bg-secondary, #161b22);
                    color: var(--text-primary, #e6edf3);
                    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
                }

                .billing-btn-sm {
                    padding: 6px 12px;
                    font-size: 0.8rem;
                }

                .billing-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .billing-actions {
                    display: flex;
                    gap: 8px;
                }

                .billing-amount {
                    font-weight: 600;
                    font-family: 'JetBrains Mono', monospace;
                }

                .billing-amount.large {
                    font-size: 1.1rem;
                }

                .billing-empty {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-secondary, rgba(255,255,255,0.6));
                }

                .billing-empty-icon {
                    font-size: 4rem;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }

                .billing-section {
                    margin-bottom: 32px;
                }

                .billing-section-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-primary, #e6edf3);
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .billing-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px;
                    gap: 16px;
                }

                .billing-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border-color, rgba(255,255,255,0.1));
                    border-top-color: var(--accent-primary, #f59e0b);
                    border-radius: 50%;
                    animation: billing-spin 1s linear infinite;
                }

                @keyframes billing-spin {
                    to { transform: rotate(360deg); }
                }

                /* Modal styles */
                .billing-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }

                .billing-modal {
                    background: var(--dark-bg-card, #1a1a2e);
                    border-radius: 16px;
                    padding: 24px;
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
                }

                .billing-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.1));
                }

                .billing-modal-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary, #e6edf3);
                }

                .billing-modal-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary, rgba(255,255,255,0.6));
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 4px 8px;
                }

                .billing-modal-close:hover {
                    color: var(--text-primary, #e6edf3);
                }

                .billing-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color, rgba(255,255,255,0.1));
                }

                .billing-detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.05));
                }

                .billing-detail-label {
                    color: var(--text-secondary, rgba(255,255,255,0.6));
                    font-size: 0.9rem;
                }

                .billing-detail-value {
                    color: var(--text-primary, #e6edf3);
                    font-weight: 500;
                }

                .billing-total-box {
                    background: linear-gradient(135deg, var(--accent-primary, #f59e0b), #d97706);
                    padding: 20px;
                    border-radius: 12px;
                    margin-top: 16px;
                }

                .billing-total-box .billing-detail-row {
                    border-color: rgba(0,0,0,0.1);
                }

                .billing-total-box .billing-detail-label,
                .billing-total-box .billing-detail-value {
                    color: #000;
                }

                .billing-input {
                    width: 100%;
                    padding: 12px;
                    background: var(--dark-bg-secondary, #161b22);
                    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
                    border-radius: 8px;
                    color: var(--text-primary, #e6edf3);
                    font-size: 0.9rem;
                }

                .billing-input:focus {
                    outline: none;
                    border-color: var(--accent-primary, #f59e0b);
                }

                .billing-textarea {
                    min-height: 100px;
                    resize: vertical;
                }

                .billing-form-group {
                    margin-bottom: 16px;
                }

                .billing-form-label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 0.85rem;
                    color: var(--text-secondary, rgba(255,255,255,0.6));
                }
            </style>
        `;
    }

    function renderLoading() {
        return `
            <div class="billing-loading">
                <div class="billing-spinner"></div>
                <p>Cargando datos de facturación...</p>
            </div>
        `;
    }

    function renderCurrentView() {
        switch (state.currentView) {
            case 'pending':
                return renderPreInvoicesList('PENDING_REVIEW');
            case 'approved':
                return renderApprovedWithFacturarButton();
            default:
                return renderPreInvoicesList('PENDING_REVIEW');
        }
    }

    // Vista de Aprobadas con botón FACTURAR prominente
    function renderApprovedWithFacturarButton() {
        const approvedList = renderPreInvoicesList('APPROVED');
        const approvedCount = state.preInvoices.filter(p => p.status === 'APPROVED').length;

        return `
            <div class="approved-actions-bar" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
                border: 1px solid rgba(34, 197, 94, 0.3);
                border-radius: 12px;
                margin-bottom: 20px;
            ">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.5rem;">✅</span>
                    <div>
                        <div style="font-weight: 600; color: #22c55e;">${approvedCount} Pre-facturas Aprobadas</div>
                        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.6);">Listas para generar factura</div>
                    </div>
                </div>
                <button onclick="AponntBillingDashboard.facturarTodasAprobadas()"
                    style="
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #22c55e, #16a34a);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 1rem;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.2s;
                    "
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(34,197,94,0.4)'"
                    onmouseout="this.style.transform='none';this.style.boxShadow='none'"
                    ${approvedCount === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}
                >
                    <span>🧾</span> Facturar Aprobadas
                </button>
            </div>
            ${approvedList}
        `;
    }

    function renderPreInvoicesList(statusFilter) {
        const filtered = statusFilter === 'all'
            ? state.preInvoices
            : state.preInvoices.filter(pi => pi.status === statusFilter);

        const title = {
            'PENDING_REVIEW': '⏳ Pre-facturas Pendientes de Revisión',
            'APPROVED': '✅ Pre-facturas Aprobadas (listas para facturar)',
            'INVOICED': '📄 Pre-facturas Facturadas',
            'all': '📋 Todas las Pre-facturas'
        }[statusFilter] || 'Pre-facturas';

        return `
            <h3 class="billing-section-title">${title}</h3>
            ${renderPreInvoicesTable(filtered, true)}
        `;
    }

    function renderPreInvoicesTable(preInvoices, showActions = false) {
        if (!preInvoices || preInvoices.length === 0) {
            return `
                <div class="billing-empty">
                    <div class="billing-empty-icon">📄</div>
                    <h3>Sin pre-facturas</h3>
                    <p>No hay pre-facturas en este estado.</p>
                </div>
            `;
        }

        return `
            <div style="overflow-x: auto;">
                <table class="billing-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Empresa</th>
                            <th>Período</th>
                            <th>Subtotal</th>
                            <th>IVA</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${preInvoices.map(pi => `
                            <tr>
                                <td><strong>${pi.pre_invoice_code}</strong></td>
                                <td>
                                    ${pi.cliente_razon_social || pi.company_name || 'N/A'}
                                    <br><small style="color: var(--text-secondary);">${pi.cliente_cuit || ''}</small>
                                </td>
                                <td>${formatDate(pi.periodo_desde)} - ${formatDate(pi.periodo_hasta)}</td>
                                <td class="billing-amount">${formatCurrency(pi.subtotal)}</td>
                                <td class="billing-amount">${formatCurrency(pi.iva_21)}</td>
                                <td class="billing-amount large">${formatCurrency(pi.total)}</td>
                                <td>
                                    <span class="billing-status ${getStatusClass(pi.status)}">
                                        ${getStatusLabel(pi.status)}
                                    </span>
                                </td>
                                <td>
                                    <div class="billing-actions">
                                        <button class="billing-btn billing-btn-secondary billing-btn-sm" onclick="AponntBillingDashboard.viewDetail(${pi.id})">
                                            👁️
                                        </button>
                                        ${pi.status === 'PENDING_REVIEW' ? `
                                            <button class="billing-btn billing-btn-success billing-btn-sm" onclick="AponntBillingDashboard.approve(${pi.id})">
                                                ✅
                                            </button>
                                            <button class="billing-btn billing-btn-danger billing-btn-sm" onclick="AponntBillingDashboard.showRejectModal(${pi.id})">
                                                ❌
                                            </button>
                                        ` : ''}
                                        ${pi.status === 'APPROVED' ? `
                                            <button class="billing-btn billing-btn-primary billing-btn-sm" onclick="AponntBillingDashboard.invoice(${pi.id})">
                                                📄 Facturar
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderTasksView() {
        const tasks = state.adminTasks || [];

        if (tasks.length === 0) {
            return `
                <div class="billing-empty">
                    <div class="billing-empty-icon">✅</div>
                    <h3>Sin tareas pendientes</h3>
                    <p>No hay tareas administrativas pendientes.</p>
                </div>
            `;
        }

        return `
            <h3 class="billing-section-title">📋 Tareas Administrativas Pendientes</h3>
            <div style="overflow-x: auto;">
                <table class="billing-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Tipo</th>
                            <th>Título</th>
                            <th>Empresa</th>
                            <th>Prioridad</th>
                            <th>Vencimiento</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tasks.map(task => `
                            <tr>
                                <td><strong>${task.task_code}</strong></td>
                                <td>${task.task_type}</td>
                                <td>${task.title}</td>
                                <td>${task.company_name || 'N/A'}</td>
                                <td>
                                    <span class="billing-status ${getPriorityClass(task.priority)}">
                                        ${task.priority}
                                    </span>
                                </td>
                                <td>${formatDate(task.due_date)}</td>
                                <td>
                                    <span class="billing-status ${getStatusClass(task.status)}">
                                        ${getStatusLabel(task.status)}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderConfigView() {
        const configs = state.emailConfigs || [];

        return `
            <h3 class="billing-section-title">⚙️ Configuración de Emails APONNT</h3>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">
                Configuración de los emails de APONNT para diferentes tipos de comunicación.
            </p>
            <div style="overflow-x: auto;">
                <table class="billing-table">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Email</th>
                            <th>Nombre</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${configs.length > 0 ? configs.map(cfg => `
                            <tr>
                                <td><strong>${cfg.config_type}</strong></td>
                                <td>${cfg.from_email}</td>
                                <td>${cfg.from_name}</td>
                                <td>
                                    <span class="billing-status ${cfg.is_active ? 'success' : 'secondary'}">
                                        ${cfg.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="4" style="text-align: center; color: var(--text-secondary);">
                                    No hay configuraciones de email cargadas.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    }

    function updateContent() {
        const contentArea = document.getElementById('billing-content');
        if (contentArea) {
            contentArea.innerHTML = renderCurrentView();
        }
    }

    // ==================== ACTIONS ====================
    async function loadData() {
        state.isLoading = true;
        render();

        try {
            const [statsRes, preInvoicesRes, tasksRes, emailsRes] = await Promise.all([
                API.getDashboardStats(),
                API.getPreInvoices(),
                API.getAdminTasks({ status: 'PENDING' }),
                API.getEmailConfigs()
            ]);

            state.stats = statsRes.data || {};
            state.preInvoices = preInvoicesRes.data || [];
            state.adminTasks = tasksRes.data || [];
            state.emailConfigs = emailsRes.data || [];

            console.log('[APONNT-BILLING] Data loaded:', {
                stats: state.stats,
                preInvoices: state.preInvoices.length,
                tasks: state.adminTasks.length
            });

        } catch (error) {
            console.error('[APONNT-BILLING] Error loading data:', error);
        }

        state.isLoading = false;
        render();
    }

    function switchView(view) {
        state.currentView = view;
        updateContent();

        // Actualizar tabs activos
        document.querySelectorAll('.billing-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`.billing-tab[onclick*="'${view}'"]`);
        if (activeTab) activeTab.classList.add('active');
    }

    async function viewDetail(id) {
        const result = await API.getPreInvoiceDetail(id);
        if (!result.success || !result.data) {
            alert('Error al cargar detalle');
            return;
        }

        const pi = result.data;
        const items = pi.items || [];

        showModal('Detalle de Pre-factura', `
            <div class="billing-detail-row">
                <span class="billing-detail-label">Código:</span>
                <span class="billing-detail-value">${pi.pre_invoice_code}</span>
            </div>
            <div class="billing-detail-row">
                <span class="billing-detail-label">Estado:</span>
                <span class="billing-detail-value">
                    <span class="billing-status ${getStatusClass(pi.status)}">${getStatusLabel(pi.status)}</span>
                </span>
            </div>
            <div class="billing-detail-row">
                <span class="billing-detail-label">Cliente:</span>
                <span class="billing-detail-value">${pi.cliente_razon_social}</span>
            </div>
            <div class="billing-detail-row">
                <span class="billing-detail-label">CUIT:</span>
                <span class="billing-detail-value">${pi.cliente_cuit}</span>
            </div>
            <div class="billing-detail-row">
                <span class="billing-detail-label">Período:</span>
                <span class="billing-detail-value">${formatDate(pi.periodo_desde)} - ${formatDate(pi.periodo_hasta)}</span>
            </div>
            <div class="billing-detail-row">
                <span class="billing-detail-label">Condición IVA:</span>
                <span class="billing-detail-value">${pi.cliente_condicion_iva}</span>
            </div>

            ${items.length > 0 ? `
                <div style="margin: 20px 0;">
                    <h4 style="margin-bottom: 12px; color: var(--text-primary);">Detalle de Items</h4>
                    <table class="billing-table" style="font-size: 13px;">
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th style="text-align: right;">Cant.</th>
                                <th style="text-align: right;">Precio</th>
                                <th style="text-align: right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td>${item.description || item.module_name || item.name || 'Servicio'}</td>
                                    <td style="text-align: right;">${item.quantity || item.employees || 1}</td>
                                    <td style="text-align: right;">${formatCurrency(item.unit_price || item.price || 0)}</td>
                                    <td style="text-align: right;">${formatCurrency(item.subtotal || item.total || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            <div class="billing-total-box">
                <div class="billing-detail-row">
                    <span class="billing-detail-label">Subtotal:</span>
                    <span class="billing-detail-value billing-amount">${formatCurrency(pi.subtotal)}</span>
                </div>
                <div class="billing-detail-row">
                    <span class="billing-detail-label">IVA 21%:</span>
                    <span class="billing-detail-value billing-amount">${formatCurrency(pi.iva_21)}</span>
                </div>
                <div class="billing-detail-row" style="border-bottom: none;">
                    <span class="billing-detail-label" style="font-weight: 700;">TOTAL:</span>
                    <span class="billing-detail-value billing-amount large">${formatCurrency(pi.total)}</span>
                </div>
            </div>
        `, getActionsForStatus(pi));
    }

    function getActionsForStatus(pi) {
        const actions = [];
        if (pi.status === 'PENDING_REVIEW') {
            actions.push({ label: '✅ Aprobar', class: 'billing-btn-success', action: () => { closeModal(); approve(pi.id); } });
            actions.push({ label: '❌ Rechazar', class: 'billing-btn-danger', action: () => { closeModal(); showRejectModal(pi.id); } });
        }
        if (pi.status === 'APPROVED') {
            actions.push({ label: '📄 Facturar', class: 'billing-btn-primary', action: () => { closeModal(); invoice(pi.id); } });
        }
        return actions;
    }

    async function approve(id) {
        if (!confirm('¿Confirma aprobar esta pre-factura?')) return;

        const result = await API.approvePreInvoice(id);
        if (result.success) {
            alert('Pre-factura aprobada correctamente');
            loadData();
        } else {
            alert('Error al aprobar: ' + (result.error || 'Error desconocido'));
        }
    }

    function showRejectModal(id) {
        showModal('Rechazar Pre-factura', `
            <div class="billing-form-group">
                <label class="billing-form-label">Motivo del rechazo *</label>
                <textarea id="reject-reason" class="billing-input billing-textarea" placeholder="Ingrese el motivo del rechazo..."></textarea>
            </div>
        `, [
            { label: 'Cancelar', class: 'billing-btn-secondary', action: closeModal },
            { label: 'Rechazar', class: 'billing-btn-danger', action: () => reject(id) }
        ]);
    }

    async function reject(id) {
        const reason = document.getElementById('reject-reason')?.value?.trim();
        if (!reason) {
            alert('Debe ingresar un motivo de rechazo');
            return;
        }

        closeModal();

        const result = await API.rejectPreInvoice(id, reason);
        if (result.success) {
            alert('Pre-factura rechazada');
            loadData();
        } else {
            alert('Error al rechazar: ' + (result.error || 'Error desconocido'));
        }
    }

    async function invoice(id) {
        if (!confirm('¿Confirma facturar esta pre-factura?\nSe generará la factura electrónica en AFIP.')) return;

        const result = await API.invoicePreInvoice(id);
        if (result.success) {
            alert('Factura generada correctamente');
            loadData();
        } else {
            alert('Error al facturar: ' + (result.error || 'Error desconocido'));
        }
    }

    // ==================== MODAL ====================
    function showModal(title, content, actions = []) {
        const modal = document.createElement('div');
        modal.className = 'billing-modal-overlay';
        modal.id = 'billing-modal';
        modal.innerHTML = `
            <div class="billing-modal">
                <div class="billing-modal-header">
                    <h3 class="billing-modal-title">${title}</h3>
                    <button class="billing-modal-close" onclick="AponntBillingDashboard.closeModal()">&times;</button>
                </div>
                <div class="billing-modal-body">
                    ${content}
                </div>
                ${actions.length > 0 ? `
                    <div class="billing-modal-footer">
                        ${actions.map((a, i) => `
                            <button class="billing-btn ${a.class || 'billing-btn-secondary'}" id="modal-action-${i}">
                                ${a.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        document.body.appendChild(modal);

        // Bind action handlers
        actions.forEach((a, i) => {
            const btn = document.getElementById(`modal-action-${i}`);
            if (btn && a.action) {
                btn.addEventListener('click', a.action);
            }
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    function closeModal() {
        const modal = document.getElementById('billing-modal');
        if (modal) modal.remove();
    }

    // ==================== INIT ====================
    async function init(container) {
        console.log('[APONNT-BILLING] Initializing dashboard...');
        await loadData();
    }

    function refreshData() {
        loadData();
    }

    // Facturar todas las pre-facturas aprobadas
    async function facturarTodasAprobadas() {
        const approved = state.preInvoices.filter(p => p.status === 'APPROVED');
        if (approved.length === 0) {
            alert('No hay pre-facturas aprobadas para facturar');
            return;
        }

        if (!confirm(`¿Está seguro de facturar ${approved.length} pre-factura(s) aprobada(s)?`)) {
            return;
        }

        let success = 0;
        let errors = 0;

        for (const preInvoice of approved) {
            const result = await API.invoicePreInvoice(preInvoice.id);
            if (result.success) {
                success++;
            } else {
                errors++;
            }
        }

        alert(`Facturación completada:\n✅ ${success} facturadas\n❌ ${errors} errores`);
        await loadData();
    }

    // ==================== PUBLIC API ====================
    return {
        init,
        render,
        loadData,
        refreshData,
        switchView,
        viewDetail,
        approve,
        showRejectModal,
        invoice,
        closeModal,
        facturarTodasAprobadas
    };

})();

// Exportar globalmente
window.AponntBillingDashboard = AponntBillingDashboard;
