/**
 * admin-finance-dashboard.js
 * Dashboard de Administración y Finanzas para APONNT
 *
 * Características:
 * - Gestión de facturación
 * - Comisiones pendientes y pagadas
 * - Liquidación de comisiones
 * - Presupuestos y contratos (vista administrativa)
 *
 * Solo visible para: ADMINISTRACION, GERENCIA
 */

// ============================================================================
// 💡 SISTEMA DE AYUDA CONTEXTUAL
// ============================================================================
if (typeof ModuleHelpSystem !== 'undefined') {
    ModuleHelpSystem.registerModule('admin-finance-dashboard', {
        moduleName: 'Dashboard Finanzas Admin',
        moduleDescription: 'Dashboard de administración financiera para APONNT (facturación, comisiones, liquidaciones)',
        contexts: {
            dashboard: {
                title: 'Dashboard Principal',
                description: 'Vista general de estadísticas financieras',
                tips: [
                    'Revisa las métricas principales en las tarjetas superiores',
                    'Usa las pestañas para navegar entre Facturación, Comisiones y Liquidación',
                    'Las estadísticas se actualizan en tiempo real'
                ],
                warnings: [
                    'Solo usuarios ADMINISTRACION y GERENCIA pueden acceder a este módulo'
                ],
                helpTopics: [
                    '¿Cómo interpretar las métricas del dashboard?',
                    '¿Qué diferencia hay entre comisiones pendientes y pagadas?'
                ],
                fieldHelp: {}
            },
            invoices: {
                title: 'Gestión de Facturación',
                description: 'Administración de facturas emitidas a empresas cliente',
                tips: [
                    'Filtra las facturas por estado: pendiente, pagada, vencida',
                    'Click en una factura para ver sus detalles completos',
                    'Puedes generar y descargar facturas desde aquí'
                ],
                warnings: [
                    'Las facturas vencidas aparecen destacadas en rojo'
                ],
                helpTopics: [
                    '¿Cómo generar una nueva factura?',
                    '¿Cómo marcar una factura como pagada?',
                    '¿Qué hacer con facturas vencidas?'
                ],
                fieldHelp: {
                    company: 'Empresa a la que se emite la factura',
                    amount: 'Monto total de la factura (incluye IVA si aplica)',
                    dueDate: 'Fecha de vencimiento para el pago',
                    status: 'Estado actual: pendiente, pagada, vencida'
                }
            },
            commissions: {
                title: 'Gestión de Comisiones',
                description: 'Seguimiento de comisiones por ventas pendientes y pagadas',
                tips: [
                    'Las comisiones se calculan automáticamente según los contratos',
                    'Filtra por estado: pendientes, pagadas, en proceso',
                    'Puedes aprobar comisiones pendientes para liquidación'
                ],
                warnings: [
                    'Verifica los montos antes de aprobar comisiones para pago'
                ],
                helpTopics: [
                    '¿Cómo se calculan las comisiones?',
                    '¿Cuándo se genera una comisión?',
                    '¿Cómo aprobar comisiones pendientes?'
                ],
                fieldHelp: {
                    seller: 'Vendedor o comercial que generó la venta',
                    commissionRate: 'Porcentaje de comisión según contrato',
                    baseAmount: 'Monto base sobre el cual se calcula la comisión',
                    commissionAmount: 'Monto final de la comisión a pagar',
                    approvalStatus: 'Estado de aprobación de la comisión'
                }
            },
            liquidation: {
                title: 'Liquidación de Comisiones',
                description: 'Proceso de liquidación y pago de comisiones aprobadas',
                tips: [
                    'Solo aparecen comisiones ya aprobadas',
                    'Puedes liquidar comisiones individuales o en lote',
                    'Al liquidar se genera automáticamente el comprobante de pago'
                ],
                warnings: [
                    'La liquidación es irreversible, verifica los datos antes de confirmar',
                    'Asegúrate de tener fondos disponibles antes de liquidar'
                ],
                helpTopics: [
                    '¿Cómo liquidar comisiones?',
                    '¿Qué documentos se generan al liquidar?',
                    '¿Se puede revertir una liquidación?'
                ],
                fieldHelp: {
                    paymentMethod: 'Método de pago: transferencia, cheque, efectivo',
                    paymentDate: 'Fecha en que se realizará el pago',
                    reference: 'Número de referencia o comprobante de pago'
                }
            }
        },
        fallbackResponses: {
            factura: 'Las facturas se gestionan desde la pestaña "Facturación". Puedes crear, editar y marcar como pagadas las facturas a empresas.',
            comision: 'Las comisiones se calculan automáticamente al cerrar ventas. Gestiónalas desde la pestaña "Comisiones".',
            liquidar: 'Para liquidar comisiones, ve a la pestaña "Liquidación" y selecciona las comisiones aprobadas que deseas pagar.',
            pago: 'Los pagos se registran al liquidar comisiones o al marcar facturas como pagadas.',
            vencida: 'Las facturas vencidas aparecen destacadas. Contacta al cliente para gestionar el pago.'
        }
    });
}

const AdminFinanceDashboard = {
    // Estado
    _initialized: false,
    _invoices: [],
    _commissions: [],
    _stats: null,
    _activeTab: 'invoices',
    _apiBase: '/api/aponnt/dashboard',

    /**
     * Inicializa el dashboard
     */
    async init() {
        if (this._initialized) return;

        console.log('[FinanceDashboard] Inicializando...');

        try {
            await Promise.all([
                this._loadStats(),
                this._loadInvoices(),
                this._loadCommissions()
            ]);

            // Inicializar sistema de ayuda contextual
            if (typeof ModuleHelpSystem !== 'undefined') {
                ModuleHelpSystem.init('admin-finance-dashboard');
            }

            this._initialized = true;
            console.log('[FinanceDashboard] Inicializado correctamente');

        } catch (error) {
            console.error('[FinanceDashboard] Error de inicialización:', error);
        }
    },

    /**
     * Renderiza el dashboard completo
     */
    render() {
        return `
            <div class="finance-dashboard">
                <!-- Header Stats -->
                ${this._renderStatsCards()}

                <!-- Tabs Navigation -->
                <div class="finance-tabs">
                    <button class="finance-tab ${this._activeTab === 'invoices' ? 'active' : ''}"
                            onclick="AdminFinanceDashboard.switchTab('invoices')">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <span>Facturación</span>
                    </button>
                    <button class="finance-tab ${this._activeTab === 'commissions' ? 'active' : ''}"
                            onclick="AdminFinanceDashboard.switchTab('commissions')">
                        <i class="fas fa-percentage"></i>
                        <span>Comisiones</span>
                    </button>
                    <button class="finance-tab ${this._activeTab === 'liquidation' ? 'active' : ''}"
                            onclick="AdminFinanceDashboard.switchTab('liquidation')">
                        <i class="fas fa-hand-holding-usd"></i>
                        <span>Liquidación</span>
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="finance-tab-content" id="finance-content">
                    ${this._renderActiveTab()}
                </div>
            </div>
        `;
    },

    /**
     * Cambia de tab
     */
    switchTab(tab) {
        this._activeTab = tab;

        // Cambiar contexto de ayuda
        if (typeof ModuleHelpSystem !== 'undefined') {
            ModuleHelpSystem.setContext(tab);
        }

        const content = document.getElementById('finance-content');
        if (content) {
            content.innerHTML = this._renderActiveTab();
        }

        // Actualizar estado activo de tabs
        document.querySelectorAll('.finance-tab').forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab.substring(0, 4)));
        });
    },

    /**
     * Renderiza el tab activo
     */
    _renderActiveTab() {
        switch (this._activeTab) {
            case 'invoices': return this._renderInvoicesTab();
            case 'commissions': return this._renderCommissionsTab();
            case 'liquidation': return this._renderLiquidationTab();
            default: return this._renderInvoicesTab();
        }
    },

    /**
     * Renderiza las tarjetas de estadísticas
     */
    _renderStatsCards() {
        const stats = this._stats || {
            monthlyRevenue: 0,
            pendingInvoices: 0,
            pendingCommissions: 0,
            paidCommissions: 0
        };

        const formatCurrency = (value, currencyCode = 'ARS') => {
            const localeMap = { ARS: 'es-AR', CLP: 'es-CL', BRL: 'pt-BR', MXN: 'es-MX', UYU: 'es-UY', COP: 'es-CO', USD: 'en-US', EUR: 'de-DE' };
            return new Intl.NumberFormat(localeMap[currencyCode] || 'es-AR', {
                style: 'currency',
                currency: currencyCode,
                maximumFractionDigits: 0
            }).format(value);
        };

        return `
            <div class="stats-row">
                <div class="stat-card stat-success">
                    <span class="stat-label">Facturado (Mes)</span>
                    <span class="stat-value">${formatCurrency(stats.monthlyRevenue)}</span>
                </div>
                <div class="stat-card stat-warning">
                    <span class="stat-label">Facturas Pendientes</span>
                    <span class="stat-value">${stats.pendingInvoices}</span>
                </div>
                <div class="stat-card" style="border-left: 4px solid #f59e0b;">
                    <span class="stat-label">Comisiones Pendientes</span>
                    <span class="stat-value">${formatCurrency(stats.pendingCommissions)}</span>
                </div>
                <div class="stat-card stat-success">
                    <span class="stat-label">Comisiones Pagadas (Mes)</span>
                    <span class="stat-value">${formatCurrency(stats.paidCommissions)}</span>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza tab de facturación
     */
    _renderInvoicesTab() {
        const helpBanner = typeof ModuleHelpSystem !== 'undefined'
            ? ModuleHelpSystem.renderBanner('invoices')
            : '';

        return `
            ${helpBanner}
            <div class="section-container">
                <div class="section-header">
                    <div>
                        <h2>Facturación</h2>
                        <p class="section-subtitle">Gestión de facturas a clientes</p>
                    </div>
                    <div class="section-actions">
                        <button class="btn btn-secondary" onclick="AdminFinanceDashboard.exportInvoices()">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                        <button class="btn btn-primary" onclick="AdminFinanceDashboard.generateInvoice()">
                            <i class="fas fa-plus"></i> Generar Factura
                        </button>
                    </div>
                </div>

                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Buscar factura..."
                           onkeyup="AdminFinanceDashboard.filterInvoices(event)">
                    <select class="filter-select" onchange="AdminFinanceDashboard.filterByStatus(this.value)">
                        <option value="">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="sent">Enviada</option>
                        <option value="paid">Pagada</option>
                        <option value="overdue">Vencida</option>
                    </select>
                    <input type="month" class="filter-select" onchange="AdminFinanceDashboard.filterByMonth(this.value)">
                </div>

                <div class="table-container">
                    ${this._renderInvoicesTable()}
                </div>
            </div>
        `;
    },

    /**
     * Renderiza tabla de facturas
     */
    _renderInvoicesTable() {
        const invoices = this._invoices.length > 0 ? this._invoices : this._getMockInvoices();

        if (invoices.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-file-invoice"></i>
                    <h3>No hay facturas</h3>
                    <p>No se encontraron facturas para mostrar</p>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>N° Factura</th>
                        <th>Empresa</th>
                        <th>Fecha</th>
                        <th>Vencimiento</th>
                        <th>Monto</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoices.map(inv => `
                        <tr>
                            <td><strong>${inv.number}</strong></td>
                            <td>${inv.company_name}</td>
                            <td>${this._formatDate(inv.date)}</td>
                            <td>${this._formatDate(inv.due_date)}</td>
                            <td class="amount">${this._formatCurrency(inv.amount)}</td>
                            <td>
                                <span class="invoice-status status-${inv.status}">
                                    ${this._getStatusLabel(inv.status)}
                                </span>
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-icon" title="Ver" onclick="AdminFinanceDashboard.viewInvoice(${inv.id})">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn-icon" title="Descargar" onclick="AdminFinanceDashboard.downloadInvoice(${inv.id})">
                                        <i class="fas fa-download"></i>
                                    </button>
                                    ${inv.status === 'pending' ? `
                                        <button class="btn-icon btn-success" title="Marcar Pagada" onclick="AdminFinanceDashboard.markPaid(${inv.id})">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    /**
     * Renderiza tab de comisiones
     */
    _renderCommissionsTab() {
        const helpBanner = typeof ModuleHelpSystem !== 'undefined'
            ? ModuleHelpSystem.renderBanner('commissions')
            : '';

        return `
            ${helpBanner}
            <div class="section-container">
                <div class="section-header">
                    <div>
                        <h2>Comisiones de Vendedores</h2>
                        <p class="section-subtitle">Historial de comisiones generadas</p>
                    </div>
                    <div class="section-actions">
                        <button class="btn btn-secondary" onclick="AdminFinanceDashboard.exportCommissions()">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                    </div>
                </div>

                <div class="filter-bar">
                    <input type="text" class="search-input" placeholder="Buscar por vendedor..."
                           onkeyup="AdminFinanceDashboard.filterCommissions(event)">
                    <select class="filter-select" onchange="AdminFinanceDashboard.filterCommissionsByStatus(this.value)">
                        <option value="">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="approved">Aprobada</option>
                        <option value="paid">Pagada</option>
                    </select>
                    <input type="month" class="filter-select" onchange="AdminFinanceDashboard.filterCommissionsByMonth(this.value)">
                </div>

                <div class="table-container">
                    ${this._renderCommissionsTable()}
                </div>
            </div>
        `;
    },

    /**
     * Renderiza tabla de comisiones
     */
    _renderCommissionsTable() {
        const commissions = this._commissions.length > 0 ? this._commissions : this._getMockCommissions();

        if (commissions.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-percentage"></i>
                    <h3>No hay comisiones</h3>
                    <p>No se encontraron comisiones para mostrar</p>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Vendedor</th>
                        <th>Empresa</th>
                        <th>Concepto</th>
                        <th>Base</th>
                        <th>%</th>
                        <th>Comisión</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${commissions.map(com => `
                        <tr>
                            <td><strong>${com.vendor_name}</strong></td>
                            <td>${com.company_name}</td>
                            <td>${com.concept}</td>
                            <td class="amount">${this._formatCurrency(com.base_amount)}</td>
                            <td>${com.percentage}%</td>
                            <td class="amount commission-amount">${this._formatCurrency(com.commission_amount)}</td>
                            <td>
                                <span class="commission-status status-${com.status}">
                                    ${this._getCommissionStatusLabel(com.status)}
                                </span>
                            </td>
                            <td>${this._formatDate(com.date)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    /**
     * Renderiza tab de liquidación
     */
    _renderLiquidationTab() {
        const pendingByVendor = this._groupCommissionsByVendor();
        const helpBanner = typeof ModuleHelpSystem !== 'undefined'
            ? ModuleHelpSystem.renderBanner('liquidation')
            : '';

        return `
            ${helpBanner}
            <div class="section-container">
                <div class="section-header">
                    <div>
                        <h2>Liquidación de Comisiones</h2>
                        <p class="section-subtitle">Aprobar y pagar comisiones pendientes</p>
                    </div>
                </div>

                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Seleccione las comisiones a liquidar y presione "Procesar Pago"
                </div>

                <div class="liquidation-grid">
                    ${Object.entries(pendingByVendor).map(([vendorId, data]) => `
                        <div class="liquidation-card">
                            <div class="liquidation-header">
                                <div class="vendor-info">
                                    <div class="vendor-avatar">${this._getInitials(data.vendor_name)}</div>
                                    <div>
                                        <h3>${data.vendor_name}</h3>
                                        <span class="vendor-count">${data.commissions.length} comisiones pendientes</span>
                                    </div>
                                </div>
                                <div class="liquidation-total">
                                    <span class="total-label">Total a Pagar</span>
                                    <span class="total-amount">${this._formatCurrency(data.total)}</span>
                                </div>
                            </div>
                            <div class="liquidation-details">
                                ${data.commissions.slice(0, 3).map(c => `
                                    <div class="liquidation-item">
                                        <span>${c.company_name}</span>
                                        <span>${this._formatCurrency(c.commission_amount)}</span>
                                    </div>
                                `).join('')}
                                ${data.commissions.length > 3 ? `
                                    <div class="liquidation-more">
                                        + ${data.commissions.length - 3} más...
                                    </div>
                                ` : ''}
                            </div>
                            <div class="liquidation-actions">
                                <button class="btn btn-secondary" onclick="AdminFinanceDashboard.viewVendorDetail('${vendorId}')">
                                    <i class="fas fa-eye"></i> Ver Detalle
                                </button>
                                <button class="btn btn-primary" onclick="AdminFinanceDashboard.processPayment('${vendorId}')">
                                    <i class="fas fa-check"></i> Procesar Pago
                                </button>
                            </div>
                        </div>
                    `).join('')}

                    ${Object.keys(pendingByVendor).length === 0 ? `
                        <div class="empty-state" style="grid-column: 1 / -1;">
                            <i class="fas fa-check-circle"></i>
                            <h3>Sin Liquidaciones Pendientes</h3>
                            <p>No hay comisiones pendientes de pago</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Agrupa comisiones pendientes por vendedor
     */
    _groupCommissionsByVendor() {
        const commissions = this._commissions.length > 0 ? this._commissions : this._getMockCommissions();
        const pending = commissions.filter(c => c.status === 'pending' || c.status === 'approved');

        const grouped = {};
        pending.forEach(c => {
            if (!grouped[c.vendor_id]) {
                grouped[c.vendor_id] = {
                    vendor_name: c.vendor_name,
                    commissions: [],
                    total: 0
                };
            }
            grouped[c.vendor_id].commissions.push(c);
            grouped[c.vendor_id].total += c.commission_amount;
        });

        return grouped;
    },

    // ============================
    // DATA LOADERS
    // ============================

    async _loadStats() {
        try {
            const token = window.getMultiKeyToken();
            const response = await fetch(`${this._apiBase}/finance/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this._stats = data.data;
                }
            }
        } catch (error) {
            console.error('[FinanceDashboard] Error cargando stats:', error);
            this._stats = {
                monthlyRevenue: 2450000,
                pendingInvoices: 8,
                pendingCommissions: 185000,
                paidCommissions: 320000
            };
        }
    },

    async _loadInvoices() {
        try {
            const token = window.getMultiKeyToken();
            const response = await fetch(`${this._apiBase}/invoices`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this._invoices = data.data || [];
                }
            }
        } catch (error) {
            console.error('[FinanceDashboard] Error cargando facturas:', error);
        }
    },

    async _loadCommissions() {
        try {
            const token = window.getMultiKeyToken();
            const response = await fetch(`${this._apiBase}/vendor-commissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this._commissions = data.data || [];
                }
            }
        } catch (error) {
            console.error('[FinanceDashboard] Error cargando comisiones:', error);
        }
    },

    // ============================
    // ACTIONS
    // ============================

    _showComingSoon(feature) {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#334155;color:#f1f5f9;padding:12px 20px;border-radius:8px;z-index:99999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:opacity 0.3s;';
        toast.textContent = `${feature} - Disponible en la proxima actualizacion`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    },

    generateInvoice() {
        this._showComingSoon('Generacion de facturas');
    },

    viewInvoice(id) {
        this._showComingSoon('Vista detallada de factura');
    },

    downloadInvoice(id) {
        this._showComingSoon('Descarga de facturas');
    },

    markPaid(id) {
        this._showComingSoon('Marcado de pagos');
    },

    exportInvoices() {
        this._showComingSoon('Exportacion de facturas');
    },

    exportCommissions() {
        this._showComingSoon('Exportacion de comisiones');
    },

    viewVendorDetail(vendorId) {
        this._showComingSoon('Detalle de vendedor');
    },

    processPayment(vendorId) {
        this._showComingSoon('Procesamiento de pagos');
    },

    filterInvoices(event) {
        // Implementar filtrado
    },

    filterByStatus(status) {
        // Implementar filtrado
    },

    filterByMonth(month) {
        // Implementar filtrado
    },

    filterCommissions(event) {
        // Implementar filtrado
    },

    filterCommissionsByStatus(status) {
        // Implementar filtrado
    },

    filterCommissionsByMonth(month) {
        // Implementar filtrado
    },

    // ============================
    // HELPERS
    // ============================

    _formatCurrency(value, currencyCode = 'ARS') {
        const localeMap = { ARS: 'es-AR', CLP: 'es-CL', BRL: 'pt-BR', MXN: 'es-MX', UYU: 'es-UY', COP: 'es-CO', USD: 'en-US', EUR: 'de-DE' };
        return new Intl.NumberFormat(localeMap[currencyCode] || 'es-AR', {
            style: 'currency',
            currency: currencyCode,
            maximumFractionDigits: 0
        }).format(value || 0);
    },

    _formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('es-AR');
    },

    _getStatusLabel(status) {
        const labels = {
            pending: 'Pendiente',
            sent: 'Enviada',
            paid: 'Pagada',
            overdue: 'Vencida'
        };
        return labels[status] || status;
    },

    _getCommissionStatusLabel(status) {
        const labels = {
            pending: 'Pendiente',
            approved: 'Aprobada',
            paid: 'Pagada'
        };
        return labels[status] || status;
    },

    _getInitials(name) {
        if (!name) return '??';
        const parts = name.split(' ');
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    },

    // ============================
    // MOCK DATA
    // ============================

    _getMockInvoices() {
        return [
            { id: 1, number: 'A-0001-00123', company_name: 'Empresa ABC', date: '2025-12-01', due_date: '2025-12-15', amount: 125000, status: 'paid' },
            { id: 2, number: 'A-0001-00124', company_name: 'Tech Solutions', date: '2025-12-05', due_date: '2025-12-20', amount: 89500, status: 'pending' },
            { id: 3, number: 'A-0001-00125', company_name: 'Industrias XYZ', date: '2025-12-10', due_date: '2025-12-25', amount: 156000, status: 'sent' },
            { id: 4, number: 'A-0001-00126', company_name: 'Comercial 123', date: '2025-11-15', due_date: '2025-11-30', amount: 78000, status: 'overdue' },
            { id: 5, number: 'A-0001-00127', company_name: 'Servicios Pro', date: '2025-12-12', due_date: '2025-12-27', amount: 234000, status: 'pending' }
        ];
    },

    _getMockCommissions() {
        return [
            { id: 1, vendor_id: 1, vendor_name: 'Carlos González', company_name: 'Empresa ABC', concept: 'Venta Inicial', base_amount: 125000, percentage: 10, commission_amount: 12500, status: 'pending', date: '2025-12-01' },
            { id: 2, vendor_id: 1, vendor_name: 'Carlos González', company_name: 'Tech Solutions', concept: 'Venta Inicial', base_amount: 89500, percentage: 10, commission_amount: 8950, status: 'pending', date: '2025-12-05' },
            { id: 3, vendor_id: 2, vendor_name: 'María López', company_name: 'Industrias XYZ', concept: 'Renovación', base_amount: 156000, percentage: 5, commission_amount: 7800, status: 'approved', date: '2025-12-10' },
            { id: 4, vendor_id: 2, vendor_name: 'María López', company_name: 'Servicios Pro', concept: 'Venta Inicial', base_amount: 234000, percentage: 10, commission_amount: 23400, status: 'paid', date: '2025-11-20' },
            { id: 5, vendor_id: 3, vendor_name: 'Juan Rodríguez', company_name: 'Comercial 123', concept: 'Upgrade', base_amount: 78000, percentage: 8, commission_amount: 6240, status: 'pending', date: '2025-12-08' }
        ];
    }
};

// Exportar
window.AdminFinanceDashboard = AdminFinanceDashboard;

// Estilos específicos del dashboard de finanzas
const financeStyles = document.createElement('style');
financeStyles.textContent = `
    /* Finance Tabs */
    .finance-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        padding: 4px;
        background: var(--dark-bg-secondary);
        border-radius: 12px;
        width: fit-content;
    }

    .finance-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
    }

    .finance-tab:hover {
        color: var(--text-primary);
        background: rgba(255, 255, 255, 0.05);
    }

    .finance-tab.active {
        background: var(--accent-primary);
        color: #000;
    }

    .finance-tab i {
        font-size: 1rem;
    }

    /* Invoice Status */
    .invoice-status {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .invoice-status.status-pending { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .invoice-status.status-sent { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .invoice-status.status-paid { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .invoice-status.status-overdue { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }

    /* Commission Status */
    .commission-status {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .commission-status.status-pending { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .commission-status.status-approved { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .commission-status.status-paid { background: rgba(34, 197, 94, 0.2); color: #86efac; }

    /* Amount cells */
    .amount {
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
        text-align: right;
    }

    .commission-amount {
        font-weight: 600;
        color: var(--accent-primary);
    }

    /* Liquidation Grid */
    .liquidation-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 20px;
        padding: 24px;
    }

    .liquidation-card {
        background: var(--dark-bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.2s;
    }

    .liquidation-card:hover {
        border-color: var(--accent-primary);
    }

    .liquidation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--border-color);
    }

    .vendor-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .vendor-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #000;
        font-size: 1rem;
    }

    .vendor-info h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
    }

    .vendor-count {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .liquidation-total {
        text-align: right;
    }

    .total-label {
        display: block;
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 4px;
    }

    .total-amount {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--accent-primary);
    }

    .liquidation-details {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
    }

    .liquidation-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    .liquidation-item:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .liquidation-more {
        padding-top: 8px;
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-style: italic;
    }

    .liquidation-actions {
        display: flex;
        gap: 8px;
        padding: 16px 20px;
    }

    .liquidation-actions .btn {
        flex: 1;
        justify-content: center;
    }

    /* Action buttons */
    .action-buttons {
        display: flex;
        gap: 4px;
    }

    .btn-icon {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .btn-icon:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
    }

    .btn-icon.btn-success:hover {
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
    }

    /* Empty state */
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        color: var(--text-secondary);
        text-align: center;
    }

    .empty-state i {
        font-size: 3rem;
        margin-bottom: 16px;
        opacity: 0.5;
    }

    .empty-state h3 {
        margin: 0;
        color: var(--text-primary);
    }

    .empty-state p {
        margin: 8px 0 0 0;
    }
`;
document.head.appendChild(financeStyles);
