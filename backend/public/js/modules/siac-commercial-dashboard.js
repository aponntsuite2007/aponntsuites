/**
 * ============================================================================
 * SIAC COMMERCIAL DASHBOARD - Gestión Comercial Integral
 * ============================================================================
 *
 * Dashboard unificado para:
 * - Remitos (delivery notes)
 * - Cuentas Corrientes (customer accounts)
 * - Cobranzas (collections)
 * - Caja (cash register)
 *
 * Created: 2025-12-17
 */

const SiacCommercialDashboard = {
    currentTab: 'overview',
    companyId: null,
    apiBaseUrl: '/api/siac',

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    init(companyId) {
        this.companyId = companyId;
        this.render();
        this.loadOverview();
    },

    // =============================================================================
    // MAIN RENDER
    // =============================================================================

    render() {
        const container = document.getElementById('siac-commercial-container');
        if (!container) {
            console.error('Container #siac-commercial-container not found');
            return;
        }

        container.innerHTML = `
            <style>
                ${this.getStyles()}
            </style>

            <div class="siac-commercial-dashboard">
                <!-- Header -->
                <div class="siac-header">
                    <div class="siac-header-title">
                        <i class="fas fa-cash-register"></i>
                        <span>Gestión Comercial SIAC</span>
                    </div>
                    <div class="siac-header-actions">
                        <button class="siac-btn siac-btn-primary" onclick="SiacCommercialDashboard.refreshData()">
                            <i class="fas fa-sync-alt"></i> Actualizar
                        </button>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="siac-tabs">
                    <button class="siac-tab active" data-tab="overview" onclick="SiacCommercialDashboard.switchTab('overview')">
                        <i class="fas fa-chart-line"></i> Overview
                    </button>
                    <button class="siac-tab" data-tab="remitos" onclick="SiacCommercialDashboard.switchTab('remitos')">
                        <i class="fas fa-truck"></i> Remitos
                    </button>
                    <button class="siac-tab" data-tab="cuenta-corriente" onclick="SiacCommercialDashboard.switchTab('cuenta-corriente')">
                        <i class="fas fa-file-invoice-dollar"></i> Ctas. Corrientes
                    </button>
                    <button class="siac-tab" data-tab="cobranzas" onclick="SiacCommercialDashboard.switchTab('cobranzas')">
                        <i class="fas fa-hand-holding-usd"></i> Cobranzas
                    </button>
                    <button class="siac-tab" data-tab="caja" onclick="SiacCommercialDashboard.switchTab('caja')">
                        <i class="fas fa-cash-register"></i> Caja
                    </button>
                    <button class="siac-tab" data-tab="clientes" onclick="SiacCommercialDashboard.switchTab('clientes')">
                        <i class="fas fa-users"></i> Clientes
                    </button>
                    <button class="siac-tab" data-tab="facturacion" onclick="SiacCommercialDashboard.switchTab('facturacion')">
                        <i class="fas fa-file-invoice"></i> Facturacion
                    </button>
                    <button class="siac-tab" data-tab="plantillas-fiscales" onclick="SiacCommercialDashboard.switchTab('plantillas-fiscales')">
                        <i class="fas fa-calculator"></i> Plantillas Fiscales
                    </button>
                </div>

                <!-- Content Area -->
                <div id="siac-content" class="siac-content">
                    <div class="siac-loading">
                        <i class="fas fa-spinner fa-spin"></i> Cargando...
                    </div>
                </div>
            </div>
        `;
    },

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.siac-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Load content
        switch (tab) {
            case 'overview':
                this.loadOverview();
                break;
            case 'remitos':
                this.loadRemitos();
                break;
            case 'cuenta-corriente':
                this.loadCuentaCorriente();
                break;
            case 'cobranzas':
                this.loadCobranzas();
                break;
            case 'caja':
                this.loadCaja();
                break;
            case 'clientes':
                this.loadClientes();
                break;
            case 'facturacion':
                this.loadFacturacion();
                break;
            case 'plantillas-fiscales':
                this.loadPlantillasFiscales();
                break;
        }
    },

    refreshData() {
        this.switchTab(this.currentTab);
    },

    // =============================================================================
    // OVERVIEW TAB
    // =============================================================================

    async loadOverview() {
        const content = document.getElementById('siac-content');
        content.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando resumen...</div>`;

        try {
            // Load all stats in parallel
            const [remitosStats, ccStats, cobranzasStats, cajaStats] = await Promise.all([
                this.fetchAPI('/remitos/stats'),
                this.fetchAPI('/cuenta-corriente/estadisticas'),
                this.fetchAPI('/cobranzas/stats'),
                this.fetchAPI('/caja/reportes/estadisticas')
            ]);

            content.innerHTML = `
                <div class="siac-overview">
                    <!-- KPI Cards -->
                    <div class="siac-kpi-grid">
                        <div class="siac-kpi-card">
                            <div class="siac-kpi-icon remitos"><i class="fas fa-truck"></i></div>
                            <div class="siac-kpi-data">
                                <div class="siac-kpi-value">${remitosStats?.total_remitos || 0}</div>
                                <div class="siac-kpi-label">Remitos del Mes</div>
                            </div>
                            <div class="siac-kpi-footer">
                                <span class="pending">${remitosStats?.pendientes_facturar || 0} pendientes de facturar</span>
                            </div>
                        </div>

                        <div class="siac-kpi-card">
                            <div class="siac-kpi-icon cta-cte"><i class="fas fa-file-invoice-dollar"></i></div>
                            <div class="siac-kpi-data">
                                <div class="siac-kpi-value">$${this.formatMoney(ccStats?.saldo_total || 0)}</div>
                                <div class="siac-kpi-label">Saldo Ctas. Corrientes</div>
                            </div>
                            <div class="siac-kpi-footer">
                                <span class="danger">${ccStats?.clientes_morosos || 0} clientes morosos</span>
                            </div>
                        </div>

                        <div class="siac-kpi-card">
                            <div class="siac-kpi-icon cobranzas"><i class="fas fa-hand-holding-usd"></i></div>
                            <div class="siac-kpi-data">
                                <div class="siac-kpi-value">$${this.formatMoney(cobranzasStats?.total_cobrado || 0)}</div>
                                <div class="siac-kpi-label">Cobrado este Mes</div>
                            </div>
                            <div class="siac-kpi-footer">
                                <span>${cobranzasStats?.total_recibos || 0} recibos emitidos</span>
                            </div>
                        </div>

                        <div class="siac-kpi-card">
                            <div class="siac-kpi-icon caja"><i class="fas fa-cash-register"></i></div>
                            <div class="siac-kpi-data">
                                <div class="siac-kpi-value">$${this.formatMoney(cajaStats?.total_ingresos || 0)}</div>
                                <div class="siac-kpi-label">Ingresos Caja</div>
                            </div>
                            <div class="siac-kpi-footer">
                                <span class="success">$${this.formatMoney((cajaStats?.total_ingresos || 0) - (cajaStats?.total_egresos || 0))} neto</span>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="siac-section">
                        <h3><i class="fas fa-bolt"></i> Acciones Rápidas</h3>
                        <div class="siac-quick-actions">
                            <button class="siac-action-btn" onclick="SiacCommercialDashboard.showNuevoRemito()">
                                <i class="fas fa-plus"></i> Nuevo Remito
                            </button>
                            <button class="siac-action-btn" onclick="SiacCommercialDashboard.showNuevoRecibo()">
                                <i class="fas fa-receipt"></i> Nuevo Recibo
                            </button>
                            <button class="siac-action-btn" onclick="SiacCommercialDashboard.showMovimientoCaja()">
                                <i class="fas fa-exchange-alt"></i> Movimiento Caja
                            </button>
                            <button class="siac-action-btn" onclick="SiacCommercialDashboard.showEstadoCuenta()">
                                <i class="fas fa-search-dollar"></i> Estado de Cuenta
                            </button>
                        </div>
                    </div>

                    <!-- Alerts -->
                    ${this.renderAlerts(ccStats, cobranzasStats)}
                </div>
            `;

        } catch (error) {
            content.innerHTML = `
                <div class="siac-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error cargando datos: ${error.message}</p>
                    <button class="siac-btn" onclick="SiacCommercialDashboard.loadOverview()">Reintentar</button>
                </div>
            `;
        }
    },

    renderAlerts(ccStats, cobranzasStats) {
        const alerts = [];

        if (ccStats?.clientes_morosos > 0) {
            alerts.push({
                type: 'danger',
                icon: 'exclamation-circle',
                title: `${ccStats.clientes_morosos} clientes morosos`,
                desc: `Saldo vencido: $${this.formatMoney(ccStats.saldo_vencido || 0)}`
            });
        }

        if (cobranzasStats?.cheques_a_vencer > 0) {
            alerts.push({
                type: 'warning',
                icon: 'clock',
                title: `${cobranzasStats.cheques_a_vencer} cheques a vencer`,
                desc: 'En los próximos 7 días'
            });
        }

        if (cobranzasStats?.promesas_vencidas > 0) {
            alerts.push({
                type: 'warning',
                icon: 'handshake-slash',
                title: `${cobranzasStats.promesas_vencidas} promesas vencidas`,
                desc: 'Requieren seguimiento'
            });
        }

        if (alerts.length === 0) {
            return `
                <div class="siac-section siac-alerts">
                    <h3><i class="fas fa-bell"></i> Alertas</h3>
                    <div class="siac-no-alerts">
                        <i class="fas fa-check-circle"></i>
                        <span>Sin alertas pendientes</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="siac-section siac-alerts">
                <h3><i class="fas fa-bell"></i> Alertas</h3>
                <div class="siac-alerts-list">
                    ${alerts.map(a => `
                        <div class="siac-alert siac-alert-${a.type}">
                            <i class="fas fa-${a.icon}"></i>
                            <div>
                                <strong>${a.title}</strong>
                                <span>${a.desc}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // =============================================================================
    // REMITOS TAB
    // =============================================================================

    async loadRemitos() {
        const content = document.getElementById('siac-content');
        content.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando remitos...</div>`;

        try {
            const [remitos, pendientes] = await Promise.all([
                this.fetchAPI('/remitos?limit=50'),
                this.fetchAPI('/remitos/pendientes')
            ]);

            content.innerHTML = `
                <div class="siac-remitos">
                    <!-- Header Actions -->
                    <div class="siac-section-header">
                        <h3><i class="fas fa-truck"></i> Gestión de Remitos</h3>
                        <button class="siac-btn siac-btn-primary" onclick="SiacCommercialDashboard.showNuevoRemito()">
                            <i class="fas fa-plus"></i> Nuevo Remito
                        </button>
                    </div>

                    <!-- Pendientes de Facturar Alert -->
                    ${pendientes.length > 0 ? `
                        <div class="siac-alert siac-alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span><strong>${pendientes.length} remitos</strong> pendientes de facturar</span>
                            <button class="siac-btn-link" onclick="SiacCommercialDashboard.showRemitosPendientes()">
                                Ver todos <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    ` : ''}

                    <!-- Filters -->
                    <div class="siac-filters">
                        <select id="remitos-estado" onchange="SiacCommercialDashboard.filterRemitos()">
                            <option value="">Todos los estados</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="ENTREGADO">Entregado</option>
                            <option value="FACTURADO">Facturado</option>
                            <option value="ANULADO">Anulado</option>
                        </select>
                        <input type="text" id="remitos-search" placeholder="Buscar cliente..."
                               onkeyup="SiacCommercialDashboard.filterRemitos()">
                    </div>

                    <!-- Remitos Table -->
                    <div class="siac-table-container">
                        <table class="siac-table">
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Items</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="remitos-tbody">
                                ${this.renderRemitosRows(remitos)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            this.remitosData = remitos;

        } catch (error) {
            content.innerHTML = this.renderError('Error cargando remitos', error);
        }
    },

    renderRemitosRows(remitos) {
        if (!remitos || remitos.length === 0) {
            return `<tr><td colspan="6" class="siac-empty">No hay remitos para mostrar</td></tr>`;
        }

        return remitos.map(r => `
            <tr>
                <td><strong>${r.numero_completo || `${String(r.punto_venta).padStart(4, '0')}-${String(r.numero).padStart(8, '0')}`}</strong></td>
                <td>${this.formatDate(r.fecha)}</td>
                <td>${r.cliente_nombre || r.razon_social || '-'}</td>
                <td>${r.items_count || r.total_items || '-'}</td>
                <td><span class="siac-badge siac-badge-${this.getRemitoBadgeClass(r.estado)}">${r.estado}</span></td>
                <td>
                    <button class="siac-btn-icon" onclick="SiacCommercialDashboard.viewRemito(${r.id})" title="Ver">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${r.estado === 'PENDIENTE' ? `
                        <button class="siac-btn-icon" onclick="SiacCommercialDashboard.entregarRemito(${r.id})" title="Marcar entregado">
                            <i class="fas fa-truck-loading"></i>
                        </button>
                    ` : ''}
                    ${r.estado === 'ENTREGADO' ? `
                        <button class="siac-btn-icon success" onclick="SiacCommercialDashboard.facturarRemito(${r.id})" title="Facturar">
                            <i class="fas fa-file-invoice"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    },

    getRemitoBadgeClass(estado) {
        const classes = {
            'PENDIENTE': 'warning',
            'ENTREGADO': 'info',
            'FACTURADO': 'success',
            'ANULADO': 'danger'
        };
        return classes[estado] || 'secondary';
    },

    // =============================================================================
    // CUENTA CORRIENTE TAB
    // =============================================================================

    async loadCuentaCorriente() {
        const content = document.getElementById('siac-content');
        content.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando cuentas corrientes...</div>`;

        try {
            const [clientes, morosos, estadisticas] = await Promise.all([
                this.fetchAPI('/cuenta-corriente/clientes?solo_con_saldo=true&limit=100'),
                this.fetchAPI('/cuenta-corriente/morosos'),
                this.fetchAPI('/cuenta-corriente/estadisticas')
            ]);

            content.innerHTML = `
                <div class="siac-cuenta-corriente">
                    <!-- Header -->
                    <div class="siac-section-header">
                        <h3><i class="fas fa-file-invoice-dollar"></i> Cuentas Corrientes</h3>
                    </div>

                    <!-- Stats Cards -->
                    <div class="siac-stats-row">
                        <div class="siac-stat-card">
                            <div class="siac-stat-value">$${this.formatMoney(estadisticas?.saldo_total || 0)}</div>
                            <div class="siac-stat-label">Saldo Total</div>
                        </div>
                        <div class="siac-stat-card danger">
                            <div class="siac-stat-value">$${this.formatMoney(estadisticas?.saldo_vencido || 0)}</div>
                            <div class="siac-stat-label">Saldo Vencido</div>
                        </div>
                        <div class="siac-stat-card warning">
                            <div class="siac-stat-value">${morosos?.length || 0}</div>
                            <div class="siac-stat-label">Clientes Morosos</div>
                        </div>
                        <div class="siac-stat-card success">
                            <div class="siac-stat-value">${clientes?.length || 0}</div>
                            <div class="siac-stat-label">Clientes con Saldo</div>
                        </div>
                    </div>

                    <!-- Aging Report -->
                    ${this.renderAgingReport(estadisticas?.aging)}

                    <!-- Filters -->
                    <div class="siac-filters">
                        <select id="cc-filter" onchange="SiacCommercialDashboard.filterCuentasCorrientes()">
                            <option value="all">Todos los clientes</option>
                            <option value="morosos">Solo morosos</option>
                            <option value="vencidos">Con saldo vencido</option>
                        </select>
                        <input type="text" id="cc-search" placeholder="Buscar cliente..."
                               onkeyup="SiacCommercialDashboard.filterCuentasCorrientes()">
                    </div>

                    <!-- Clients Table -->
                    <div class="siac-table-container">
                        <table class="siac-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Saldo</th>
                                    <th>Vencido</th>
                                    <th>Límite</th>
                                    <th>Último Pago</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="cc-tbody">
                                ${this.renderCCRows(clientes)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            this.ccData = clientes;

        } catch (error) {
            content.innerHTML = this.renderError('Error cargando cuentas corrientes', error);
        }
    },

    renderAgingReport(aging) {
        if (!aging) return '';

        return `
            <div class="siac-aging-report">
                <h4>Antigüedad de Saldos</h4>
                <div class="siac-aging-bars">
                    <div class="siac-aging-item">
                        <div class="siac-aging-label">Al día</div>
                        <div class="siac-aging-bar success" style="width: ${aging.al_dia_pct || 0}%"></div>
                        <div class="siac-aging-value">$${this.formatMoney(aging.al_dia || 0)}</div>
                    </div>
                    <div class="siac-aging-item">
                        <div class="siac-aging-label">1-30 días</div>
                        <div class="siac-aging-bar warning" style="width: ${aging.dias_30_pct || 0}%"></div>
                        <div class="siac-aging-value">$${this.formatMoney(aging.dias_30 || 0)}</div>
                    </div>
                    <div class="siac-aging-item">
                        <div class="siac-aging-label">31-60 días</div>
                        <div class="siac-aging-bar orange" style="width: ${aging.dias_60_pct || 0}%"></div>
                        <div class="siac-aging-value">$${this.formatMoney(aging.dias_60 || 0)}</div>
                    </div>
                    <div class="siac-aging-item">
                        <div class="siac-aging-label">61-90 días</div>
                        <div class="siac-aging-bar danger" style="width: ${aging.dias_90_pct || 0}%"></div>
                        <div class="siac-aging-value">$${this.formatMoney(aging.dias_90 || 0)}</div>
                    </div>
                    <div class="siac-aging-item">
                        <div class="siac-aging-label">+90 días</div>
                        <div class="siac-aging-bar critical" style="width: ${aging.dias_mas_90_pct || 0}%"></div>
                        <div class="siac-aging-value">$${this.formatMoney(aging.dias_mas_90 || 0)}</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderCCRows(clientes) {
        if (!clientes || clientes.length === 0) {
            return `<tr><td colspan="6" class="siac-empty">No hay clientes con saldo</td></tr>`;
        }

        return clientes.map(c => `
            <tr class="${c.saldo_vencido > 0 ? 'siac-row-warning' : ''}">
                <td><strong>${c.razon_social || c.nombre}</strong></td>
                <td>$${this.formatMoney(c.saldo || 0)}</td>
                <td class="${c.saldo_vencido > 0 ? 'text-danger' : ''}">$${this.formatMoney(c.saldo_vencido || 0)}</td>
                <td>$${this.formatMoney(c.limite_credito || 0)}</td>
                <td>${c.ultimo_pago ? this.formatDate(c.ultimo_pago) : '-'}</td>
                <td>
                    <button class="siac-btn-icon" onclick="SiacCommercialDashboard.viewEstadoCuenta(${c.id})" title="Estado de cuenta">
                        <i class="fas fa-list"></i>
                    </button>
                    <button class="siac-btn-icon success" onclick="SiacCommercialDashboard.showReciboCliente(${c.id})" title="Nuevo recibo">
                        <i class="fas fa-receipt"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // =============================================================================
    // COBRANZAS TAB
    // =============================================================================

    async loadCobranzas() {
        const content = document.getElementById('siac-content');
        content.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando cobranzas...</div>`;

        try {
            const [recibos, cheques, proximas, promesasVencidas, stats] = await Promise.all([
                this.fetchAPI('/cobranzas/recibos?limit=30'),
                this.fetchAPI('/cobranzas/cheques?estados=CARTERA,DEPOSITADO'),
                this.fetchAPI('/cobranzas/seguimiento/proximas'),
                this.fetchAPI('/cobranzas/seguimiento/promesas-vencidas'),
                this.fetchAPI('/cobranzas/stats')
            ]);

            content.innerHTML = `
                <div class="siac-cobranzas">
                    <!-- Header -->
                    <div class="siac-section-header">
                        <h3><i class="fas fa-hand-holding-usd"></i> Gestión de Cobranzas</h3>
                        <button class="siac-btn siac-btn-primary" onclick="SiacCommercialDashboard.showNuevoRecibo()">
                            <i class="fas fa-plus"></i> Nuevo Recibo
                        </button>
                    </div>

                    <!-- Stats -->
                    <div class="siac-stats-row">
                        <div class="siac-stat-card success">
                            <div class="siac-stat-value">$${this.formatMoney(stats?.total_cobrado || 0)}</div>
                            <div class="siac-stat-label">Cobrado este Mes</div>
                        </div>
                        <div class="siac-stat-card">
                            <div class="siac-stat-value">${stats?.total_recibos || 0}</div>
                            <div class="siac-stat-label">Recibos Emitidos</div>
                        </div>
                        <div class="siac-stat-card info">
                            <div class="siac-stat-value">$${this.formatMoney(stats?.cheques_cartera || 0)}</div>
                            <div class="siac-stat-label">Cheques en Cartera</div>
                        </div>
                        <div class="siac-stat-card warning">
                            <div class="siac-stat-value">${proximas?.length || 0}</div>
                            <div class="siac-stat-label">Gestiones Pendientes</div>
                        </div>
                    </div>

                    <!-- Alerts -->
                    ${promesasVencidas?.length > 0 ? `
                        <div class="siac-alert siac-alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span><strong>${promesasVencidas.length} promesas de pago</strong> vencidas sin cumplir</span>
                        </div>
                    ` : ''}

                    <!-- Sub-tabs -->
                    <div class="siac-subtabs">
                        <button class="siac-subtab active" data-subtab="recibos" onclick="SiacCommercialDashboard.switchCobranzasSubtab('recibos')">
                            <i class="fas fa-receipt"></i> Recibos
                        </button>
                        <button class="siac-subtab" data-subtab="cheques" onclick="SiacCommercialDashboard.switchCobranzasSubtab('cheques')">
                            <i class="fas fa-money-check"></i> Cheques
                        </button>
                        <button class="siac-subtab" data-subtab="seguimiento" onclick="SiacCommercialDashboard.switchCobranzasSubtab('seguimiento')">
                            <i class="fas fa-tasks"></i> Seguimiento
                        </button>
                    </div>

                    <!-- Content -->
                    <div id="cobranzas-content">
                        ${this.renderRecibosContent(recibos)}
                    </div>
                </div>
            `;

            this.cobranzasData = { recibos, cheques, proximas, promesasVencidas };

        } catch (error) {
            content.innerHTML = this.renderError('Error cargando cobranzas', error);
        }
    },

    switchCobranzasSubtab(subtab) {
        document.querySelectorAll('.siac-subtab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.subtab === subtab);
        });

        const contentEl = document.getElementById('cobranzas-content');
        switch (subtab) {
            case 'recibos':
                contentEl.innerHTML = this.renderRecibosContent(this.cobranzasData?.recibos);
                break;
            case 'cheques':
                contentEl.innerHTML = this.renderChequesContent(this.cobranzasData?.cheques);
                break;
            case 'seguimiento':
                contentEl.innerHTML = this.renderSeguimientoContent(this.cobranzasData?.proximas, this.cobranzasData?.promesasVencidas);
                break;
        }
    },

    renderRecibosContent(recibos) {
        return `
            <div class="siac-table-container">
                <table class="siac-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Importe</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${!recibos || recibos.length === 0
                            ? `<tr><td colspan="6" class="siac-empty">No hay recibos para mostrar</td></tr>`
                            : recibos.map(r => `
                                <tr>
                                    <td><strong>${r.numero_completo || r.numero}</strong></td>
                                    <td>${this.formatDate(r.fecha)}</td>
                                    <td>${r.cliente_nombre || '-'}</td>
                                    <td>$${this.formatMoney(r.total)}</td>
                                    <td><span class="siac-badge siac-badge-${r.estado === 'ACTIVO' ? 'success' : 'danger'}">${r.estado}</span></td>
                                    <td>
                                        <button class="siac-btn-icon" onclick="SiacCommercialDashboard.viewRecibo(${r.id})" title="Ver">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="siac-btn-icon" onclick="SiacCommercialDashboard.printRecibo(${r.id})" title="Imprimir">
                                            <i class="fas fa-print"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')
                        }
                    </tbody>
                </table>
            </div>
        `;
    },

    renderChequesContent(cheques) {
        return `
            <div class="siac-table-container">
                <table class="siac-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Banco</th>
                            <th>Importe</th>
                            <th>Fecha Cobro</th>
                            <th>Cliente</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${!cheques || cheques.length === 0
                            ? `<tr><td colspan="7" class="siac-empty">No hay cheques en cartera</td></tr>`
                            : cheques.map(c => `
                                <tr>
                                    <td><strong>${c.numero_cheque}</strong></td>
                                    <td>${c.banco || '-'}</td>
                                    <td>$${this.formatMoney(c.monto)}</td>
                                    <td>${this.formatDate(c.fecha_cobro)}</td>
                                    <td>${c.cliente_nombre || '-'}</td>
                                    <td><span class="siac-badge siac-badge-${this.getChequeBadgeClass(c.estado)}">${c.estado}</span></td>
                                    <td>
                                        ${c.estado === 'CARTERA' ? `
                                            <button class="siac-btn-icon" onclick="SiacCommercialDashboard.depositarCheque(${c.id})" title="Depositar">
                                                <i class="fas fa-university"></i>
                                            </button>
                                        ` : ''}
                                        ${c.estado === 'DEPOSITADO' ? `
                                            <button class="siac-btn-icon success" onclick="SiacCommercialDashboard.cobrarCheque(${c.id})" title="Marcar cobrado">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')
                        }
                    </tbody>
                </table>
            </div>
        `;
    },

    renderSeguimientoContent(proximas, promesasVencidas) {
        return `
            <div class="siac-seguimiento-grid">
                <div class="siac-seguimiento-section">
                    <h4><i class="fas fa-calendar-check"></i> Próximas Gestiones</h4>
                    ${!proximas || proximas.length === 0
                        ? `<div class="siac-empty-state">Sin gestiones pendientes</div>`
                        : `<ul class="siac-gestion-list">
                            ${proximas.slice(0, 10).map(p => `
                                <li class="siac-gestion-item">
                                    <div class="siac-gestion-date">${this.formatDate(p.proxima_accion)}</div>
                                    <div class="siac-gestion-info">
                                        <strong>${p.cliente_nombre}</strong>
                                        <span>${p.tipo_accion}</span>
                                    </div>
                                    <button class="siac-btn-icon" onclick="SiacCommercialDashboard.registrarGestion(${p.cliente_id})">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </li>
                            `).join('')}
                        </ul>`
                    }
                </div>
                <div class="siac-seguimiento-section danger">
                    <h4><i class="fas fa-exclamation-circle"></i> Promesas Vencidas</h4>
                    ${!promesasVencidas || promesasVencidas.length === 0
                        ? `<div class="siac-empty-state">Sin promesas vencidas</div>`
                        : `<ul class="siac-gestion-list">
                            ${promesasVencidas.slice(0, 10).map(p => `
                                <li class="siac-gestion-item warning">
                                    <div class="siac-gestion-date">${this.formatDate(p.promesa_fecha)}</div>
                                    <div class="siac-gestion-info">
                                        <strong>${p.cliente_nombre}</strong>
                                        <span>$${this.formatMoney(p.promesa_monto)}</span>
                                    </div>
                                    <button class="siac-btn-icon" onclick="SiacCommercialDashboard.marcarPromesaIncumplida(${p.id})">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </li>
                            `).join('')}
                        </ul>`
                    }
                </div>
            </div>
        `;
    },

    getChequeBadgeClass(estado) {
        const classes = {
            'CARTERA': 'info',
            'DEPOSITADO': 'warning',
            'COBRADO': 'success',
            'RECHAZADO': 'danger',
            'ENDOSADO': 'secondary'
        };
        return classes[estado] || 'secondary';
    },

    // =============================================================================
    // CAJA TAB
    // =============================================================================

    async loadCaja() {
        const content = document.getElementById('siac-content');
        content.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando caja...</div>`;

        try {
            const [cajas, estadoCajas, stats] = await Promise.all([
                this.fetchAPI('/caja/cajas'),
                this.fetchAPI('/caja/estado'),
                this.fetchAPI('/caja/reportes/estadisticas')
            ]);

            content.innerHTML = `
                <div class="siac-caja">
                    <!-- Header -->
                    <div class="siac-section-header">
                        <h3><i class="fas fa-cash-register"></i> Gestión de Caja</h3>
                    </div>

                    <!-- Stats -->
                    <div class="siac-stats-row">
                        <div class="siac-stat-card success">
                            <div class="siac-stat-value">$${this.formatMoney(stats?.total_ingresos || 0)}</div>
                            <div class="siac-stat-label">Ingresos</div>
                        </div>
                        <div class="siac-stat-card danger">
                            <div class="siac-stat-value">$${this.formatMoney(stats?.total_egresos || 0)}</div>
                            <div class="siac-stat-label">Egresos</div>
                        </div>
                        <div class="siac-stat-card">
                            <div class="siac-stat-value">$${this.formatMoney((stats?.total_ingresos || 0) - (stats?.total_egresos || 0))}</div>
                            <div class="siac-stat-label">Saldo Neto</div>
                        </div>
                        <div class="siac-stat-card info">
                            <div class="siac-stat-value">${stats?.cant_ingresos || 0} / ${stats?.cant_egresos || 0}</div>
                            <div class="siac-stat-label">Mov. Ing/Egr</div>
                        </div>
                    </div>

                    <!-- Cajas Cards -->
                    <div class="siac-cajas-grid">
                        ${estadoCajas?.map(c => this.renderCajaCard(c)).join('') || '<div class="siac-empty">No hay cajas configuradas</div>'}
                    </div>
                </div>
            `;

            this.cajasData = estadoCajas;

        } catch (error) {
            content.innerHTML = this.renderError('Error cargando caja', error);
        }
    },

    renderCajaCard(caja) {
        const sesionAbierta = caja.sesion_estado === 'ABIERTA';

        return `
            <div class="siac-caja-card ${sesionAbierta ? 'open' : 'closed'}">
                <div class="siac-caja-header">
                    <div class="siac-caja-icon">
                        <i class="fas fa-cash-register"></i>
                    </div>
                    <div class="siac-caja-info">
                        <h4>${caja.nombre}</h4>
                        <span class="siac-caja-pv">PV: ${caja.punto_venta || 1}</span>
                    </div>
                    <div class="siac-caja-status ${sesionAbierta ? 'open' : 'closed'}">
                        ${sesionAbierta ? 'ABIERTA' : 'CERRADA'}
                    </div>
                </div>

                ${sesionAbierta ? `
                    <div class="siac-caja-details">
                        <div class="siac-caja-detail">
                            <span>Usuario:</span>
                            <strong>${caja.usuario_nombre || '-'}</strong>
                        </div>
                        <div class="siac-caja-detail">
                            <span>Apertura:</span>
                            <strong>${this.formatDateTime(caja.fecha_apertura)}</strong>
                        </div>
                        <div class="siac-caja-detail">
                            <span>Saldo Actual:</span>
                            <strong class="siac-caja-saldo">$${this.formatMoney(caja.saldo_actual || 0)}</strong>
                        </div>
                        <div class="siac-caja-detail">
                            <span>Movimientos:</span>
                            <strong>${caja.total_movimientos || 0}</strong>
                        </div>
                    </div>
                    <div class="siac-caja-actions">
                        <button class="siac-btn siac-btn-success" onclick="SiacCommercialDashboard.showMovimientoCaja(${caja.id}, ${caja.sesion_id})">
                            <i class="fas fa-exchange-alt"></i> Movimiento
                        </button>
                        <button class="siac-btn" onclick="SiacCommercialDashboard.showArqueo(${caja.sesion_id})">
                            <i class="fas fa-calculator"></i> Arqueo
                        </button>
                        <button class="siac-btn siac-btn-danger" onclick="SiacCommercialDashboard.cerrarCaja(${caja.sesion_id})">
                            <i class="fas fa-lock"></i> Cerrar
                        </button>
                    </div>
                ` : `
                    <div class="siac-caja-closed-msg">
                        <i class="fas fa-lock"></i>
                        <span>Caja cerrada</span>
                    </div>
                    <div class="siac-caja-actions">
                        <button class="siac-btn siac-btn-primary" onclick="SiacCommercialDashboard.abrirCaja(${caja.id})">
                            <i class="fas fa-lock-open"></i> Abrir Caja
                        </button>
                        <button class="siac-btn" onclick="SiacCommercialDashboard.verHistorialCaja(${caja.id})">
                            <i class="fas fa-history"></i> Historial
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    // =============================================================================
    // MODALS & ACTIONS
    // =============================================================================

    showNuevoRemito() {
        // Remover modal existente si hay
        document.querySelector('.siac-modal.active')?.remove();

        const modal = document.createElement('div');
        modal.className = 'siac-modal active';
        modal.id = 'nuevo-remito-modal';
        modal.innerHTML = `
            <div class="siac-modal-content" style="max-width: 700px;">
                <div class="siac-modal-header">
                    <h3><i class="fas fa-truck"></i> Nuevo Remito</h3>
                    <button class="siac-modal-close" onclick="this.closest('.siac-modal').remove()">&times;</button>
                </div>
                <div class="siac-modal-body">
                    <form id="nuevo-remito-form" onsubmit="SiacCommercialDashboard.submitNuevoRemito(event)">
                        <div class="siac-form-row">
                            <div class="siac-form-group">
                                <label>Cliente *</label>
                                <select name="cliente_id" id="remito-cliente" required>
                                    <option value="">Seleccionar cliente...</option>
                                </select>
                            </div>
                            <div class="siac-form-group">
                                <label>Fecha *</label>
                                <input type="date" name="fecha" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                        </div>
                        <div class="siac-form-row">
                            <div class="siac-form-group">
                                <label>Punto de Venta *</label>
                                <input type="number" name="punto_venta" value="1" min="1" max="99999" required>
                            </div>
                            <div class="siac-form-group">
                                <label>Dirección de Entrega</label>
                                <input type="text" name="direccion_entrega" placeholder="Dirección de entrega...">
                            </div>
                        </div>
                        <div class="siac-form-group">
                            <label>Observaciones</label>
                            <textarea name="observaciones" rows="3" placeholder="Notas adicionales..."></textarea>
                        </div>
                        <div class="siac-form-group">
                            <label>Items del Remito</label>
                            <div id="remito-items-container">
                                <div class="remito-item-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
                                    <input type="text" name="item_descripcion_0" placeholder="Descripción del item *" style="flex: 3;" required>
                                    <input type="number" name="item_cantidad_0" placeholder="Cant." value="1" min="1" style="flex: 1;" required>
                                    <input type="text" name="item_unidad_0" placeholder="Unidad" value="UN" style="flex: 1;">
                                </div>
                            </div>
                            <button type="button" onclick="SiacCommercialDashboard.addRemitoItem()" class="siac-btn" style="margin-top: 8px;">
                                <i class="fas fa-plus"></i> Agregar Item
                            </button>
                        </div>
                        <div class="siac-modal-footer" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="siac-btn" onclick="this.closest('.siac-modal').remove()">Cancelar</button>
                            <button type="submit" class="siac-btn siac-btn-primary">
                                <i class="fas fa-save"></i> Crear Remito
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Cargar lista de clientes
        this.loadClientesForSelect('remito-cliente');
    },

    remitoItemCount: 1,

    addRemitoItem() {
        const container = document.getElementById('remito-items-container');
        const idx = this.remitoItemCount++;
        const row = document.createElement('div');
        row.className = 'remito-item-row';
        row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';
        row.innerHTML = `
            <input type="text" name="item_descripcion_${idx}" placeholder="Descripción del item *" style="flex: 3;" required>
            <input type="number" name="item_cantidad_${idx}" placeholder="Cant." value="1" min="1" style="flex: 1;" required>
            <input type="text" name="item_unidad_${idx}" placeholder="Unidad" value="UN" style="flex: 1;">
            <button type="button" onclick="this.parentElement.remove()" class="siac-btn" style="background: #e74c3c;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(row);
    },

    async loadClientesForSelect(selectId) {
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`${this.apiBaseUrl}/clientes?company_id=${this.companyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            const select = document.getElementById(selectId);
            if (select && data.success && data.data) {
                data.data.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = `${c.razon_social || c.nombre} - ${c.cuit || 'Sin CUIT'}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error cargando clientes:', error);
        }
    },

    async submitNuevoRemito(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        // Recopilar items
        const items = [];
        let idx = 0;
        while (formData.has(`item_descripcion_${idx}`)) {
            items.push({
                descripcion: formData.get(`item_descripcion_${idx}`),
                cantidad: parseInt(formData.get(`item_cantidad_${idx}`)) || 1,
                unidad: formData.get(`item_unidad_${idx}`) || 'UN'
            });
            idx++;
        }

        const data = {
            company_id: this.companyId,
            cliente_id: formData.get('cliente_id'),
            fecha: formData.get('fecha'),
            punto_venta: formData.get('punto_venta'),
            direccion_entrega: formData.get('direccion_entrega'),
            observaciones: formData.get('observaciones'),
            items: items
        };

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`${this.apiBaseUrl}/remitos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Remito creado exitosamente');
                document.querySelector('.siac-modal.active')?.remove();
                this.loadRemitos();
            } else {
                alert('❌ Error: ' + (result.error || 'Error creando remito'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error de conexión: ' + error.message);
        }
    },

    showNuevoRecibo() {
        // Remover modal existente si hay
        document.querySelector('.siac-modal.active')?.remove();

        const modal = document.createElement('div');
        modal.className = 'siac-modal active';
        modal.id = 'nuevo-recibo-modal';
        modal.innerHTML = `
            <div class="siac-modal-content" style="max-width: 600px;">
                <div class="siac-modal-header">
                    <h3><i class="fas fa-receipt"></i> Nuevo Recibo</h3>
                    <button class="siac-modal-close" onclick="this.closest('.siac-modal').remove()">&times;</button>
                </div>
                <div class="siac-modal-body">
                    <form id="nuevo-recibo-form" onsubmit="SiacCommercialDashboard.submitNuevoRecibo(event)">
                        <div class="siac-form-row">
                            <div class="siac-form-group">
                                <label>Cliente *</label>
                                <select name="cliente_id" id="recibo-cliente" required>
                                    <option value="">Seleccionar cliente...</option>
                                </select>
                            </div>
                            <div class="siac-form-group">
                                <label>Fecha *</label>
                                <input type="date" name="fecha" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                        </div>
                        <div class="siac-form-row">
                            <div class="siac-form-group">
                                <label>Monto *</label>
                                <input type="number" name="monto" step="0.01" min="0.01" placeholder="0.00" required>
                            </div>
                            <div class="siac-form-group">
                                <label>Medio de Pago *</label>
                                <select name="medio_pago" required>
                                    <option value="efectivo">💵 Efectivo</option>
                                    <option value="transferencia">🏦 Transferencia</option>
                                    <option value="cheque">📄 Cheque</option>
                                    <option value="tarjeta">💳 Tarjeta</option>
                                </select>
                            </div>
                        </div>
                        <div class="siac-form-group">
                            <label>Concepto / Observaciones</label>
                            <textarea name="concepto" rows="2" placeholder="Descripción del pago..."></textarea>
                        </div>
                        <div class="siac-modal-footer" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="siac-btn" onclick="this.closest('.siac-modal').remove()">Cancelar</button>
                            <button type="submit" class="siac-btn siac-btn-primary">
                                <i class="fas fa-save"></i> Crear Recibo
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Cargar lista de clientes
        this.loadClientesForSelect('recibo-cliente');
    },

    async submitNuevoRecibo(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const data = {
            company_id: this.companyId,
            cliente_id: formData.get('cliente_id'),
            fecha: formData.get('fecha'),
            monto: parseFloat(formData.get('monto')),
            medio_pago: formData.get('medio_pago'),
            concepto: formData.get('concepto')
        };

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`${this.apiBaseUrl}/cobranzas/recibos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Recibo creado exitosamente');
                document.querySelector('.siac-modal.active')?.remove();
                this.loadCobranzas();
            } else {
                alert('❌ Error: ' + (result.error || 'Error creando recibo'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error de conexión: ' + error.message);
        }
    },

    showMovimientoCaja(cajaId, sesionId) {
        // Remover modal existente si hay
        document.querySelector('.siac-modal.active')?.remove();

        const modal = document.createElement('div');
        modal.className = 'siac-modal active';
        modal.id = 'movimiento-caja-modal';
        modal.innerHTML = `
            <div class="siac-modal-content" style="max-width: 500px;">
                <div class="siac-modal-header">
                    <h3><i class="fas fa-exchange-alt"></i> Movimiento de Caja</h3>
                    <button class="siac-modal-close" onclick="this.closest('.siac-modal').remove()">&times;</button>
                </div>
                <div class="siac-modal-body">
                    <form id="movimiento-caja-form" onsubmit="SiacCommercialDashboard.submitMovimientoCaja(event, ${cajaId || 1}, ${sesionId || 0})">
                        <div class="siac-form-group">
                            <label>Tipo de Movimiento *</label>
                            <select name="tipo" required>
                                <option value="ingreso">📥 Ingreso</option>
                                <option value="egreso">📤 Egreso</option>
                            </select>
                        </div>
                        <div class="siac-form-group">
                            <label>Monto *</label>
                            <input type="number" name="monto" step="0.01" min="0.01" placeholder="0.00" required>
                        </div>
                        <div class="siac-form-group">
                            <label>Concepto *</label>
                            <input type="text" name="concepto" placeholder="Descripción del movimiento" required>
                        </div>
                        <div class="siac-modal-footer" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="siac-btn" onclick="this.closest('.siac-modal').remove()">Cancelar</button>
                            <button type="submit" class="siac-btn siac-btn-primary">
                                <i class="fas fa-save"></i> Registrar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async submitMovimientoCaja(event, cajaId, sesionId) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const data = {
            company_id: this.companyId,
            caja_id: cajaId,
            sesion_id: sesionId,
            tipo: formData.get('tipo'),
            monto: parseFloat(formData.get('monto')),
            concepto: formData.get('concepto')
        };

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`${this.apiBaseUrl}/caja/movimientos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Movimiento registrado exitosamente');
                document.querySelector('.siac-modal.active')?.remove();
                this.loadCaja();
            } else {
                alert('❌ Error: ' + (result.error || 'Error registrando movimiento'));
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error de conexión: ' + error.message);
        }
    },

    showEstadoCuenta() {
        // Modal para ver estado de cuenta de un cliente
        document.querySelector('.siac-modal.active')?.remove();

        const modal = document.createElement('div');
        modal.className = 'siac-modal active';
        modal.id = 'estado-cuenta-modal';
        modal.innerHTML = `
            <div class="siac-modal-content" style="max-width: 600px;">
                <div class="siac-modal-header">
                    <h3><i class="fas fa-file-invoice-dollar"></i> Estado de Cuenta</h3>
                    <button class="siac-modal-close" onclick="this.closest('.siac-modal').remove()">&times;</button>
                </div>
                <div class="siac-modal-body">
                    <div class="siac-form-group">
                        <label>Seleccionar Cliente</label>
                        <select id="estado-cuenta-cliente" onchange="SiacCommercialDashboard.loadEstadoCuentaCliente(this.value)">
                            <option value="">Seleccionar cliente...</option>
                        </select>
                    </div>
                    <div id="estado-cuenta-content" style="margin-top: 20px;">
                        <p style="color: #888; text-align: center;">Seleccione un cliente para ver su estado de cuenta</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Cargar lista de clientes
        this.loadClientesForSelect('estado-cuenta-cliente');
    },

    async loadEstadoCuentaCliente(clienteId) {
        if (!clienteId) return;

        const container = document.getElementById('estado-cuenta-content');
        container.innerHTML = '<p style="text-align: center;">Cargando...</p>';

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`${this.apiBaseUrl}/cuenta-corriente/cliente/${clienteId}?company_id=${this.companyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                const saldo = data.data?.saldo || 0;
                const movimientos = data.data?.movimientos || [];
                container.innerHTML = `
                    <div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="font-size: 12px; color: #888;">Saldo Actual</div>
                        <div style="font-size: 24px; font-weight: bold; color: ${saldo >= 0 ? '#2ecc71' : '#e74c3c'};">
                            $${Math.abs(saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            ${saldo >= 0 ? ' (A Favor)' : ' (Debe)'}
                        </div>
                    </div>
                    <div style="max-height: 300px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #21262d;">
                                    <th style="padding: 8px; text-align: left;">Fecha</th>
                                    <th style="padding: 8px; text-align: left;">Concepto</th>
                                    <th style="padding: 8px; text-align: right;">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${movimientos.slice(0, 10).map(m => `
                                    <tr style="border-bottom: 1px solid #30363d;">
                                        <td style="padding: 8px;">${new Date(m.fecha).toLocaleDateString('es-AR')}</td>
                                        <td style="padding: 8px;">${m.concepto || m.tipo || '-'}</td>
                                        <td style="padding: 8px; text-align: right; color: ${m.monto >= 0 ? '#2ecc71' : '#e74c3c'};">
                                            ${m.monto >= 0 ? '+' : ''}$${Math.abs(m.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                `).join('') || '<tr><td colspan="3" style="padding: 15px; text-align: center; color: #888;">Sin movimientos</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                container.innerHTML = `<p style="color: #e74c3c;">Error: ${data.error}</p>`;
            }
        } catch (error) {
            container.innerHTML = `<p style="color: #e74c3c;">Error: ${error.message}</p>`;
        }
    },

    async viewRemito(id) {
        alert(`Ver Remito ${id} - Por implementar`);
    },

    async entregarRemito(id) {
        if (!confirm('¿Marcar remito como entregado?')) return;
        try {
            await this.fetchAPI(`/remitos/${id}/entregar`, 'PUT', {});
            this.loadRemitos();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    async facturarRemito(id) {
        alert(`Facturar Remito ${id} - Por implementar`);
    },

    async viewEstadoCuenta(clienteId) {
        alert(`Ver Estado Cuenta Cliente ${clienteId} - Por implementar`);
    },

    showReciboCliente(clienteId) {
        alert(`Nuevo Recibo Cliente ${clienteId} - Por implementar`);
    },

    async viewRecibo(id) {
        alert(`Ver Recibo ${id} - Por implementar`);
    },

    printRecibo(id) {
        alert(`Imprimir Recibo ${id} - Por implementar`);
    },

    async depositarCheque(id) {
        if (!confirm('¿Confirmar depósito del cheque?')) return;
        try {
            await this.fetchAPI(`/cobranzas/cheques/${id}/depositar`, 'PUT', {});
            this.loadCobranzas();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    async cobrarCheque(id) {
        if (!confirm('¿Confirmar cobro del cheque?')) return;
        try {
            await this.fetchAPI(`/cobranzas/cheques/${id}/cobrar`, 'PUT', {});
            this.loadCobranzas();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    registrarGestion(clienteId) {
        alert(`Registrar Gestión Cliente ${clienteId} - Por implementar`);
    },

    async marcarPromesaIncumplida(id) {
        if (!confirm('¿Marcar promesa como incumplida?')) return;
        try {
            await this.fetchAPI(`/cobranzas/seguimiento/${id}/promesa`, 'PUT', { cumplida: false });
            this.loadCobranzas();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    async abrirCaja(cajaId) {
        const saldoApertura = prompt('Saldo de apertura:', '0');
        if (saldoApertura === null) return;

        try {
            await this.fetchAPI('/caja/sesiones/abrir', 'POST', {
                caja_id: cajaId,
                saldo_apertura: parseFloat(saldoApertura) || 0
            });
            this.loadCaja();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    async cerrarCaja(sesionId) {
        const saldoCierre = prompt('Saldo de cierre declarado:', '0');
        if (saldoCierre === null) return;

        try {
            await this.fetchAPI(`/caja/sesiones/${sesionId}/cerrar`, 'POST', {
                saldo_cierre_declarado: parseFloat(saldoCierre) || 0
            });
            this.loadCaja();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    },

    showArqueo(sesionId) {
        alert(`Arqueo Sesion ${sesionId} - Por implementar`);
    },

    verHistorialCaja(cajaId) {
        alert(`Historial Caja ${cajaId} - Por implementar`);
    },

    showRemitosPendientes() {
        document.getElementById('remitos-estado').value = 'PENDIENTE';
        this.filterRemitos();
    },

    filterRemitos() {
        // Client-side filtering
        const estado = document.getElementById('remitos-estado')?.value;
        const search = document.getElementById('remitos-search')?.value?.toLowerCase();

        let filtered = this.remitosData || [];

        if (estado) {
            filtered = filtered.filter(r => r.estado === estado);
        }
        if (search) {
            filtered = filtered.filter(r =>
                (r.cliente_nombre || '').toLowerCase().includes(search) ||
                (r.numero_completo || '').toLowerCase().includes(search)
            );
        }

        document.getElementById('remitos-tbody').innerHTML = this.renderRemitosRows(filtered);
    },

    filterCuentasCorrientes() {
        const filter = document.getElementById('cc-filter')?.value;
        const search = document.getElementById('cc-search')?.value?.toLowerCase();

        let filtered = this.ccData || [];

        if (filter === 'morosos') {
            filtered = filtered.filter(c => c.dias_mora > 30);
        } else if (filter === 'vencidos') {
            filtered = filtered.filter(c => c.saldo_vencido > 0);
        }

        if (search) {
            filtered = filtered.filter(c =>
                (c.razon_social || '').toLowerCase().includes(search) ||
                (c.nombre || '').toLowerCase().includes(search)
            );
        }

        document.getElementById('cc-tbody').innerHTML = this.renderCCRows(filtered);
    },

    // =============================================================================
    // UTILITIES
    // =============================================================================

    async fetchAPI(endpoint, method = 'GET', body = null) {
        const url = `${this.apiBaseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}company_id=${this.companyId}`;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify({ ...body, company_id: this.companyId });
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error en la solicitud');
        }

        return data.data;
    },

    formatMoney(amount) {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    },

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-AR');
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

    renderError(title, error) {
        return `
            <div class="siac-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${title}</h3>
                <p>${error.message}</p>
                <button class="siac-btn" onclick="SiacCommercialDashboard.refreshData()">Reintentar</button>
            </div>
        `;
    },

    // =============================================================================
    // CLIENTES TAB - FUNCIONALIDAD COMPLETA
    // =============================================================================

    clientesData: [],
    editingClienteId: null,

    async loadClientes() {
        const content = document.getElementById('siac-content');
        content.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando clientes...</div>`;

        try {
            const response = await this.fetchAPI('/clientes');
            const clientes = response?.clientes || [];
            this.clientesData = clientes;

            const activos = clientes.filter(c => c.estado === 'activo').length;
            const catA = clientes.filter(c => c.categoria_cliente === 'A').length;

            content.innerHTML = `
                <div class="siac-section">
                    <!-- Header Principal -->
                    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5f8d 100%); color: #e8eaed; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h2 style="margin: 0; font-size: 1.6rem; display: flex; align-items: center; gap: 12px;">
                                    <i class="fas fa-users"></i> Gestion de Clientes
                                </h2>
                                <p style="margin: 8px 0 0 0; opacity: 0.8;">Sistema Integrado de Administracion Comercial - SIAC</p>
                                <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 5px;">
                                    Multi-pais • AFIP Ready • Condiciones Comerciales
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 2.5rem; font-weight: bold; color: #4a9eff;">${clientes.length}</div>
                                <div style="font-size: 0.85rem; opacity: 0.9;">Clientes Activos</div>
                            </div>
                        </div>
                    </div>

                    <!-- Help Banner -->
                    <div class="siac-card" style="background: linear-gradient(135deg, rgba(74,158,255,0.1) 0%, rgba(139,92,246,0.1) 100%); border: 1px solid rgba(74,158,255,0.3); margin-bottom: 20px;">
                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                            <div style="font-size: 24px;">💡</div>
                            <div>
                                <div style="font-weight: 600; margin-bottom: 8px;">Lista de Clientes</div>
                                <div style="color: #a0a0a0; font-size: 0.85rem; line-height: 1.6;">
                                    Los clientes se gestionan por empresa. Cada empresa ve solo sus clientes.<br>
                                    🌎 Sistema multi-pais: Los campos fiscales se adaptan automaticamente (CUIT, RUT, RUC, RFC, CNPJ, NIT).<br>
                                    💳 Condiciones comerciales: Habilita cuenta corriente, plazo de pago y credito maximo por cliente.
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
                        <button class="siac-btn siac-btn-success" style="padding: 15px; justify-content: center;" onclick="SiacCommercialDashboard.nuevoCliente()">
                            <i class="fas fa-user-plus"></i> Nuevo Cliente
                        </button>
                        <button class="siac-btn siac-btn-primary" style="padding: 15px; justify-content: center;" onclick="SiacCommercialDashboard.importarClientes()">
                            <i class="fas fa-upload"></i> Importar
                        </button>
                        <button class="siac-btn" style="padding: 15px; justify-content: center; background: #f59e0b;" onclick="SiacCommercialDashboard.exportarClientes()">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                        <button class="siac-btn" style="padding: 15px; justify-content: center; background: #8b5cf6;" onclick="SiacCommercialDashboard.mostrarReportesClientes()">
                            <i class="fas fa-chart-bar"></i> Reportes
                        </button>
                    </div>

                    <!-- Stats Cards -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="siac-card" style="text-align: center; padding: 18px; background: linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.2) 100%); border: 1px solid rgba(34,197,94,0.3);">
                            <div style="font-size: 2rem; font-weight: bold; color: #22c55e;">${activos}</div>
                            <div style="font-size: 0.8rem; color: #a0a0a0;">Clientes Activos</div>
                        </div>
                        <div class="siac-card" style="text-align: center; padding: 18px; background: linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.2) 100%); border: 1px solid rgba(245,158,11,0.3);">
                            <div style="font-size: 2rem; font-weight: bold; color: #f59e0b;">${catA}</div>
                            <div style="font-size: 0.8rem; color: #a0a0a0;">Categoria A</div>
                        </div>
                        <div class="siac-card" style="text-align: center; padding: 18px; background: linear-gradient(135deg, rgba(74,158,255,0.1) 0%, rgba(74,158,255,0.2) 100%); border: 1px solid rgba(74,158,255,0.3);">
                            <div style="font-size: 2rem; font-weight: bold; color: #4a9eff;">$${this.formatNumber(45230)}</div>
                            <div style="font-size: 0.8rem; color: #a0a0a0;">Facturacion del Mes</div>
                        </div>
                        <div class="siac-card" style="text-align: center; padding: 18px; background: linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.2) 100%); border: 1px solid rgba(139,92,246,0.3);">
                            <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${clientes.filter(c => c.cuenta_corriente_habilitada).length}</div>
                            <div style="font-size: 0.8rem; color: #a0a0a0;">Con Cta. Cte.</div>
                        </div>
                    </div>

                    <!-- Filtros -->
                    <div class="siac-card" style="margin-bottom: 20px; padding: 15px;">
                        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                            <input type="text" id="searchClientes" placeholder="Buscar por nombre, CUIT/RUT/RUC..."
                                class="siac-input" style="flex: 1; min-width: 250px;"
                                onkeyup="SiacCommercialDashboard.filtrarClientes()">
                            <select id="paisFilter" class="siac-input" style="width: 150px;" onchange="SiacCommercialDashboard.filtrarClientes()">
                                <option value="">Todos los paises</option>
                                <option value="Argentina">Argentina</option>
                                <option value="Chile">Chile</option>
                                <option value="Peru">Peru</option>
                                <option value="Mexico">Mexico</option>
                                <option value="Brasil">Brasil</option>
                                <option value="Colombia">Colombia</option>
                            </select>
                            <select id="categoriaFilter" class="siac-input" style="width: 150px;" onchange="SiacCommercialDashboard.filtrarClientes()">
                                <option value="">Todas categorias</option>
                                <option value="A">Categoria A</option>
                                <option value="B">Categoria B</option>
                                <option value="C">Categoria C</option>
                            </select>
                            <select id="estadoFilter" class="siac-input" style="width: 130px;" onchange="SiacCommercialDashboard.filtrarClientes()">
                                <option value="">Todos</option>
                                <option value="activo">Activos</option>
                                <option value="inactivo">Inactivos</option>
                            </select>
                        </div>
                    </div>

                    <!-- Tabla de clientes -->
                    <div class="siac-table-container">
                        <table class="siac-table">
                            <thead>
                                <tr>
                                    <th>Codigo</th>
                                    <th>Razon Social</th>
                                    <th>ID Fiscal</th>
                                    <th>Pais</th>
                                    <th>Categoria</th>
                                    <th>Cta. Cte.</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="clientesTableBody">
                                ${this.renderClientesRows(clientes)}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Modal Crear/Editar Cliente -->
                ${this.renderModalCliente()}
            `;
        } catch (error) {
            this.showError(content, 'Error al cargar clientes', error);
        }
    },

    renderClientesRows(clientes) {
        if (clientes.length === 0) {
            return `<tr><td colspan="8" style="text-align: center; padding: 40px; color: #a0a0a0;">
                <i class="fas fa-users" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
                No hay clientes registrados
            </td></tr>`;
        }

        return clientes.map(c => `
            <tr>
                <td><strong>${c.codigo || c.id}</strong></td>
                <td>${c.razon_social}</td>
                <td style="font-family: monospace; color: #4a9eff;">${c.cuit || 'N/A'}</td>
                <td>${this.getPaisFlag(c.pais)} ${c.pais || 'Argentina'}</td>
                <td><span class="siac-badge ${this.getCategoriaClass(c.categoria_cliente)}">${c.categoria_cliente || 'B'}</span></td>
                <td>${c.cuenta_corriente_habilitada ? '<span class="siac-badge success">Si</span>' : '<span class="siac-badge secondary">No</span>'}</td>
                <td><span class="siac-badge ${c.estado === 'activo' ? 'success' : 'danger'}">${c.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <button class="siac-btn-icon" onclick="SiacCommercialDashboard.editarCliente(${c.id})" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="siac-btn-icon" onclick="SiacCommercialDashboard.verCliente(${c.id})" title="Ver"><i class="fas fa-eye"></i></button>
                    <button class="siac-btn-icon danger" onclick="SiacCommercialDashboard.toggleEstadoCliente(${c.id})" title="${c.estado === 'activo' ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${c.estado === 'activo' ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    getPaisFlag(pais) {
        const flags = { 'Argentina': '🇦🇷', 'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Mexico': '🇲🇽', 'Brasil': '🇧🇷', 'Colombia': '🇨🇴' };
        return flags[pais] || '🌎';
    },

    renderModalCliente() {
        return `
            <div id="modalCliente" class="siac-modal" style="display: none;">
                <div class="siac-modal-content" style="max-width: 900px;">
                    <div class="siac-modal-header">
                        <h3 id="modalClienteTitulo"><i class="fas fa-user-plus"></i> Nuevo Cliente</h3>
                        <button class="siac-modal-close" onclick="SiacCommercialDashboard.cerrarModalCliente()">&times;</button>
                    </div>
                    <div class="siac-modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <form id="formCliente" onsubmit="SiacCommercialDashboard.guardarCliente(event)">
                            <!-- Datos Basicos -->
                            <div class="siac-form-section">
                                <h4><i class="fas fa-id-card"></i> Datos Basicos</h4>
                                <div class="siac-form-grid">
                                    <div class="siac-form-group" style="grid-column: span 2;">
                                        <label>Razon Social / Nombre *</label>
                                        <input type="text" id="clienteRazonSocial" class="siac-input" required>
                                    </div>
                                    <div class="siac-form-group">
                                        <label>Categoria</label>
                                        <select id="clienteCategoria" class="siac-input">
                                            <option value="A">A - Premium</option>
                                            <option value="B" selected>B - Estandar</option>
                                            <option value="C">C - Basico</option>
                                        </select>
                                    </div>
                                    <div class="siac-form-group">
                                        <label>Email</label>
                                        <input type="email" id="clienteEmail" class="siac-input">
                                    </div>
                                    <div class="siac-form-group">
                                        <label>Telefono</label>
                                        <input type="text" id="clienteTelefono" class="siac-input">
                                    </div>
                                </div>
                            </div>

                            <!-- Datos Fiscales Multi-Pais -->
                            <div class="siac-form-section">
                                <h4><i class="fas fa-globe"></i> Datos Fiscales (Multi-Pais)</h4>
                                <div class="siac-form-grid">
                                    <div class="siac-form-group">
                                        <label>Pais *</label>
                                        <select id="clientePais" class="siac-input" onchange="SiacCommercialDashboard.cambiarPais()">
                                            <option value="Argentina">🇦🇷 Argentina</option>
                                            <option value="Chile">🇨🇱 Chile</option>
                                            <option value="Peru">🇵🇪 Peru</option>
                                            <option value="Mexico">🇲🇽 Mexico</option>
                                            <option value="Brasil">🇧🇷 Brasil</option>
                                            <option value="Colombia">🇨🇴 Colombia</option>
                                        </select>
                                    </div>
                                    <div class="siac-form-group">
                                        <label id="labelFiscalId">CUIT *</label>
                                        <input type="text" id="clienteFiscalId" class="siac-input" placeholder="XX-XXXXXXXX-X" required>
                                        <small id="helpFiscalId" style="color: #a0a0a0;">Formato: XX-XXXXXXXX-X</small>
                                    </div>
                                    <div class="siac-form-group">
                                        <label>Condicion Fiscal</label>
                                        <select id="clienteCondicionFiscal" class="siac-input">
                                            <option value="RI">Responsable Inscripto</option>
                                            <option value="MT">Monotributista</option>
                                            <option value="EX">Exento</option>
                                            <option value="CF">Consumidor Final</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Direccion -->
                            <div class="siac-form-section">
                                <h4><i class="fas fa-map-marker-alt"></i> Direccion</h4>
                                <div class="siac-form-grid">
                                    <div class="siac-form-group">
                                        <label>Provincia/Estado</label>
                                        <input type="text" id="clienteProvincia" class="siac-input">
                                    </div>
                                    <div class="siac-form-group">
                                        <label>Ciudad/Localidad</label>
                                        <input type="text" id="clienteLocalidad" class="siac-input">
                                    </div>
                                    <div class="siac-form-group" style="grid-column: span 2;">
                                        <label>Calle</label>
                                        <input type="text" id="clienteCalle" class="siac-input">
                                    </div>
                                    <div class="siac-form-group">
                                        <label>Numero</label>
                                        <input type="text" id="clienteNumero" class="siac-input">
                                    </div>
                                    <div class="siac-form-group">
                                        <label>Piso</label>
                                        <input type="text" id="clientePiso" class="siac-input">
                                    </div>
                                    <div class="siac-form-group">
                                        <label>Depto</label>
                                        <input type="text" id="clienteDepartamento" class="siac-input">
                                    </div>
                                    <div class="siac-form-group">
                                        <label>CP</label>
                                        <input type="text" id="clienteCodigoPostal" class="siac-input">
                                    </div>
                                </div>
                            </div>

                            <!-- Condiciones Comerciales -->
                            <div class="siac-form-section">
                                <h4><i class="fas fa-handshake"></i> Condiciones Comerciales</h4>
                                <div class="siac-form-group">
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                        <input type="checkbox" id="clienteCuentaCorriente" onchange="SiacCommercialDashboard.toggleCuentaCorriente()">
                                        <span>Habilitar Cuenta Corriente</span>
                                    </label>
                                </div>
                                <div id="ccFields" style="display: none;">
                                    <div class="siac-form-grid">
                                        <div class="siac-form-group">
                                            <label>Plazo de Pago (dias)</label>
                                            <input type="number" id="clientePlazoPago" class="siac-input" value="30" min="0">
                                        </div>
                                        <div class="siac-form-group">
                                            <label>Credito Maximo ($)</label>
                                            <input type="number" id="clienteCreditoMaximo" class="siac-input" value="0" min="0" step="0.01">
                                        </div>
                                        <div class="siac-form-group">
                                            <label style="display: flex; align-items: center; gap: 10px; margin-top: 25px;">
                                                <input type="checkbox" id="clienteBloqueoPorVencimiento">
                                                <span>Bloquear por vencimiento</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Datos Bancarios -->
                            <div class="siac-form-section">
                                <h4><i class="fas fa-university"></i> Datos Bancarios (Opcional)</h4>
                                <div class="siac-form-grid">
                                    <div class="siac-form-group">
                                        <label>Banco</label>
                                        <input type="text" id="clienteBanco" class="siac-input">
                                    </div>
                                    <div class="siac-form-group">
                                        <label>CBU / Cuenta</label>
                                        <input type="text" id="clienteCBU" class="siac-input" placeholder="22 digitos">
                                    </div>
                                    <div class="siac-form-group">
                                        <label>Alias CBU</label>
                                        <input type="text" id="clienteAliasCBU" class="siac-input">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="siac-modal-footer">
                        <button type="button" class="siac-btn" onclick="SiacCommercialDashboard.cerrarModalCliente()">Cancelar</button>
                        <button type="submit" form="formCliente" class="siac-btn siac-btn-success"><i class="fas fa-save"></i> Guardar Cliente</button>
                    </div>
                </div>
            </div>
        `;
    },

    getCategoriaClass(cat) {
        return { 'A': 'danger', 'B': 'warning', 'C': 'success' }[cat] || 'secondary';
    },

    filtrarClientes() {
        const search = document.getElementById('searchClientes')?.value?.toLowerCase() || '';
        const pais = document.getElementById('paisFilter')?.value || '';
        const categoria = document.getElementById('categoriaFilter')?.value || '';
        const estado = document.getElementById('estadoFilter')?.value || '';

        let filtered = this.clientesData;

        if (search) {
            filtered = filtered.filter(c =>
                c.razon_social?.toLowerCase().includes(search) ||
                c.cuit?.toLowerCase().includes(search) ||
                c.email?.toLowerCase().includes(search)
            );
        }
        if (pais) filtered = filtered.filter(c => c.pais === pais);
        if (categoria) filtered = filtered.filter(c => c.categoria_cliente === categoria);
        if (estado) filtered = filtered.filter(c => c.estado === estado);

        document.getElementById('clientesTableBody').innerHTML = this.renderClientesRows(filtered);
    },

    nuevoCliente() {
        this.editingClienteId = null;
        document.getElementById('modalClienteTitulo').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Cliente';
        document.getElementById('formCliente').reset();
        document.getElementById('ccFields').style.display = 'none';
        document.getElementById('modalCliente').style.display = 'flex';
        this.cambiarPais(); // Initialize country fields
    },

    editarCliente(id) {
        const cliente = this.clientesData.find(c => c.id === id);
        if (!cliente) return;

        this.editingClienteId = id;
        document.getElementById('modalClienteTitulo').innerHTML = '<i class="fas fa-user-edit"></i> Editar Cliente';

        // Fill form
        document.getElementById('clienteRazonSocial').value = cliente.razon_social || '';
        document.getElementById('clienteCategoria').value = cliente.categoria_cliente || 'B';
        document.getElementById('clienteEmail').value = cliente.email || '';
        document.getElementById('clienteTelefono').value = cliente.telefono || '';
        document.getElementById('clientePais').value = cliente.pais || 'Argentina';
        document.getElementById('clienteFiscalId').value = cliente.cuit || '';
        document.getElementById('clienteCondicionFiscal').value = cliente.condicion_fiscal_code || 'RI';
        document.getElementById('clienteProvincia').value = cliente.provincia || '';
        document.getElementById('clienteLocalidad').value = cliente.localidad || '';
        document.getElementById('clienteCalle').value = cliente.calle || '';
        document.getElementById('clienteNumero').value = cliente.numero || '';
        document.getElementById('clientePiso').value = cliente.piso || '';
        document.getElementById('clienteDepartamento').value = cliente.departamento || '';
        document.getElementById('clienteCodigoPostal').value = cliente.codigo_postal || '';
        document.getElementById('clienteCuentaCorriente').checked = cliente.cuenta_corriente_habilitada || false;
        document.getElementById('clientePlazoPago').value = cliente.plazo_pago_dias || 30;
        document.getElementById('clienteCreditoMaximo').value = cliente.credito_maximo || 0;
        document.getElementById('clienteBloqueoPorVencimiento').checked = cliente.bloqueo_por_vencimiento || false;
        document.getElementById('clienteBanco').value = cliente.banco || '';
        document.getElementById('clienteCBU').value = cliente.cbu || '';
        document.getElementById('clienteAliasCBU').value = cliente.alias_cbu || '';

        document.getElementById('ccFields').style.display = cliente.cuenta_corriente_habilitada ? 'block' : 'none';
        document.getElementById('modalCliente').style.display = 'flex';
        this.cambiarPais();
    },

    verCliente(id) {
        const c = this.clientesData.find(cl => cl.id === id);
        if (!c) return;

        alert(`Cliente: ${c.razon_social}\n\nPais: ${c.pais || 'Argentina'}\nID Fiscal: ${c.cuit || 'N/A'}\nCategoria: ${c.categoria_cliente || 'B'}\nEmail: ${c.email || 'N/A'}\nTelefono: ${c.telefono || 'N/A'}\n\nCuenta Corriente: ${c.cuenta_corriente_habilitada ? 'Si' : 'No'}\nCredito Maximo: $${c.credito_maximo || 0}\nPlazo Pago: ${c.plazo_pago_dias || 0} dias`);
    },

    cerrarModalCliente() {
        document.getElementById('modalCliente').style.display = 'none';
    },

    toggleCuentaCorriente() {
        const checked = document.getElementById('clienteCuentaCorriente').checked;
        document.getElementById('ccFields').style.display = checked ? 'block' : 'none';
    },

    cambiarPais() {
        const pais = document.getElementById('clientePais')?.value || 'Argentina';
        const labelFiscalId = document.getElementById('labelFiscalId');
        const inputFiscalId = document.getElementById('clienteFiscalId');
        const helpFiscalId = document.getElementById('helpFiscalId');
        const selectCondicion = document.getElementById('clienteCondicionFiscal');

        const config = {
            'Argentina': { label: 'CUIT', format: 'XX-XXXXXXXX-X', condiciones: [
                { code: 'RI', name: 'Responsable Inscripto' },
                { code: 'MT', name: 'Monotributista' },
                { code: 'EX', name: 'Exento' },
                { code: 'CF', name: 'Consumidor Final' }
            ]},
            'Chile': { label: 'RUT', format: 'XX.XXX.XXX-X', condiciones: [
                { code: 'PRIMERA', name: 'Primera Categoria' },
                { code: 'SEGUNDA', name: 'Segunda Categoria' }
            ]},
            'Peru': { label: 'RUC', format: 'XXXXXXXXXXX', condiciones: [
                { code: 'RER', name: 'Regimen Especial' },
                { code: 'RUS', name: 'Regimen Unico Simplificado' },
                { code: 'RG', name: 'Regimen General' }
            ]},
            'Mexico': { label: 'RFC', format: 'XXXX-XXXXXX-XXX', condiciones: [
                { code: 'PF', name: 'Persona Fisica' },
                { code: 'PM', name: 'Persona Moral' }
            ]},
            'Brasil': { label: 'CNPJ', format: 'XX.XXX.XXX/XXXX-XX', condiciones: [
                { code: 'SN', name: 'Simples Nacional' },
                { code: 'LP', name: 'Lucro Presumido' },
                { code: 'LR', name: 'Lucro Real' }
            ]},
            'Colombia': { label: 'NIT', format: 'XXX.XXX.XXX-X', condiciones: [
                { code: 'GC', name: 'Gran Contribuyente' },
                { code: 'AR', name: 'Autoretenedor' },
                { code: 'RS', name: 'Regimen Simple' }
            ]}
        };

        const c = config[pais] || config['Argentina'];
        if (labelFiscalId) labelFiscalId.textContent = c.label + ' *';
        if (inputFiscalId) inputFiscalId.placeholder = c.format;
        if (helpFiscalId) helpFiscalId.textContent = 'Formato: ' + c.format;
        if (selectCondicion) {
            selectCondicion.innerHTML = c.condiciones.map(cond =>
                `<option value="${cond.code}">${cond.name}</option>`
            ).join('');
        }
    },

    async guardarCliente(event) {
        event.preventDefault();

        const clienteData = {
            company_id: this.companyId,
            razon_social: document.getElementById('clienteRazonSocial').value,
            categoria_cliente: document.getElementById('clienteCategoria').value,
            email: document.getElementById('clienteEmail').value,
            telefono: document.getElementById('clienteTelefono').value,
            pais: document.getElementById('clientePais').value,
            cuit: document.getElementById('clienteFiscalId').value,
            condicion_fiscal_code: document.getElementById('clienteCondicionFiscal').value,
            provincia: document.getElementById('clienteProvincia').value,
            localidad: document.getElementById('clienteLocalidad').value,
            calle: document.getElementById('clienteCalle').value,
            numero: document.getElementById('clienteNumero').value,
            piso: document.getElementById('clientePiso').value,
            departamento: document.getElementById('clienteDepartamento').value,
            codigo_postal: document.getElementById('clienteCodigoPostal').value,
            cuenta_corriente_habilitada: document.getElementById('clienteCuentaCorriente').checked,
            plazo_pago_dias: parseInt(document.getElementById('clientePlazoPago').value) || 0,
            credito_maximo: parseFloat(document.getElementById('clienteCreditoMaximo').value) || 0,
            bloqueo_por_vencimiento: document.getElementById('clienteBloqueoPorVencimiento').checked,
            banco: document.getElementById('clienteBanco').value,
            cbu: document.getElementById('clienteCBU').value,
            alias_cbu: document.getElementById('clienteAliasCBU').value
        };

        try {
            const url = this.editingClienteId ? `/clientes/${this.editingClienteId}` : '/clientes';
            const method = this.editingClienteId ? 'PUT' : 'POST';

            const response = await this.fetchAPI(url, { method, body: JSON.stringify(clienteData) });

            if (response.success) {
                alert(this.editingClienteId ? 'Cliente actualizado' : 'Cliente creado exitosamente');
                this.cerrarModalCliente();
                this.loadClientes();
            } else {
                alert('Error: ' + (response.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error guardando cliente:', error);
            alert('Error de conexion');
        }
    },

    async toggleEstadoCliente(id) {
        const cliente = this.clientesData.find(c => c.id === id);
        if (!cliente) return;

        const nuevoEstado = cliente.estado === 'activo' ? 'inactivo' : 'activo';
        if (!confirm(`¿${nuevoEstado === 'activo' ? 'Activar' : 'Desactivar'} cliente ${cliente.razon_social}?`)) return;

        try {
            await this.fetchAPI(`/clientes/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ estado: nuevoEstado })
            });
            this.loadClientes();
        } catch (error) {
            alert('Error al cambiar estado');
        }
    },

    exportarClientes() {
        const modal = document.createElement('div');
        modal.className = 'siac-modal active';
        modal.innerHTML = `
            <div class="siac-modal-content" style="max-width: 500px;">
                <div class="siac-modal-header">
                    <h3><i class="fas fa-download"></i> Exportar Clientes</h3>
                    <button class="siac-modal-close" onclick="this.closest('.siac-modal').remove()">&times;</button>
                </div>
                <div class="siac-modal-body">
                    <div class="siac-form-section">
                        <h4><i class="fas fa-file-export"></i> Formato de exportacion</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="siac-btn siac-btn-success" style="justify-content: flex-start; padding: 15px;" onclick="SiacCommercialDashboard.descargarExport('excel')">
                                <i class="fas fa-file-excel"></i> Exportar a Excel (.xlsx)
                            </button>
                            <button class="siac-btn siac-btn-primary" style="justify-content: flex-start; padding: 15px;" onclick="SiacCommercialDashboard.descargarExport('csv')">
                                <i class="fas fa-file-csv"></i> Exportar a CSV
                            </button>
                            <button class="siac-btn" style="justify-content: flex-start; padding: 15px; background: #ef4444;" onclick="SiacCommercialDashboard.descargarExport('pdf')">
                                <i class="fas fa-file-pdf"></i> Exportar a PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    descargarExport(formato) {
        this.showToast(`Descargando clientes en formato ${formato.toUpperCase()}...`, 'info');
        document.querySelector('.siac-modal.active')?.remove();
        // TODO: Implementar descarga real
    },

    importarClientes() {
        const modal = document.createElement('div');
        modal.className = 'siac-modal active';
        modal.innerHTML = `
            <div class="siac-modal-content" style="max-width: 600px;">
                <div class="siac-modal-header">
                    <h3><i class="fas fa-upload"></i> Importar Clientes</h3>
                    <button class="siac-modal-close" onclick="this.closest('.siac-modal').remove()">&times;</button>
                </div>
                <div class="siac-modal-body">
                    <div class="siac-form-section">
                        <h4><i class="fas fa-info-circle"></i> Instrucciones</h4>
                        <div style="color: #a0a0a0; font-size: 0.9rem; line-height: 1.6; margin-bottom: 20px;">
                            <p>Sube un archivo Excel (.xlsx) o CSV con las siguientes columnas:</p>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li><strong>razon_social</strong> (obligatorio)</li>
                                <li><strong>cuit</strong> / rut / ruc / rfc / cnpj / nit (obligatorio)</li>
                                <li><strong>pais</strong> (Argentina, Chile, Peru, Mexico, Brasil, Colombia)</li>
                                <li>email, telefono, categoria_cliente, provincia, localidad, calle, numero, cp</li>
                                <li>cuenta_corriente, plazo_pago, credito_maximo</li>
                            </ul>
                        </div>
                    </div>

                    <div class="siac-form-section">
                        <h4><i class="fas fa-file-upload"></i> Seleccionar archivo</h4>
                        <div style="border: 2px dashed #3a4556; border-radius: 12px; padding: 40px; text-align: center; cursor: pointer;" onclick="document.getElementById('importFile').click()">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: #4a9eff; margin-bottom: 15px;"></i>
                            <p style="color: #a0a0a0;">Haz clic aqui o arrastra un archivo</p>
                            <p style="color: #666; font-size: 0.8rem;">Formatos: .xlsx, .csv (max 5MB)</p>
                            <input type="file" id="importFile" accept=".xlsx,.csv" style="display: none;" onchange="SiacCommercialDashboard.procesarImport(this)">
                        </div>
                        <div id="importStatus" style="margin-top: 15px;"></div>
                    </div>

                    <div style="margin-top: 20px;">
                        <button class="siac-btn siac-btn-primary" onclick="window.open('/api/siac/clientes/plantilla-importacion', '_blank')">
                            <i class="fas fa-download"></i> Descargar Plantilla
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    procesarImport(input) {
        const file = input.files[0];
        if (!file) return;

        const status = document.getElementById('importStatus');
        status.innerHTML = `
            <div style="background: rgba(74,158,255,0.1); border: 1px solid #4a9eff; border-radius: 8px; padding: 15px;">
                <i class="fas fa-spinner fa-spin"></i> Procesando ${file.name}...
            </div>
        `;

        // TODO: Implementar procesamiento real con FormData
        setTimeout(() => {
            status.innerHTML = `
                <div style="background: rgba(34,197,94,0.1); border: 1px solid #22c55e; border-radius: 8px; padding: 15px;">
                    <i class="fas fa-check-circle" style="color: #22c55e;"></i>
                    Archivo procesado. Encontrados 0 registros validos.
                </div>
            `;
        }, 2000);
    },

    mostrarReportesClientes() {
        const modal = document.createElement('div');
        modal.className = 'siac-modal active';
        modal.innerHTML = `
            <div class="siac-modal-content" style="max-width: 700px;">
                <div class="siac-modal-header" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);">
                    <h3><i class="fas fa-chart-bar"></i> Reportes de Clientes</h3>
                    <button class="siac-modal-close" onclick="this.closest('.siac-modal').remove()">&times;</button>
                </div>
                <div class="siac-modal-body">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div class="siac-card" style="cursor: pointer; transition: all 0.3s;" onclick="SiacCommercialDashboard.generarReporte('categoria')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-layer-group" style="color: white; font-size: 20px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 600;">Por Categoria</div>
                                    <div style="color: #a0a0a0; font-size: 0.85rem;">Distribucion A, B, C</div>
                                </div>
                            </div>
                        </div>

                        <div class="siac-card" style="cursor: pointer; transition: all 0.3s;" onclick="SiacCommercialDashboard.generarReporte('pais')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-globe-americas" style="color: white; font-size: 20px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 600;">Por Pais</div>
                                    <div style="color: #a0a0a0; font-size: 0.85rem;">Distribucion geografica</div>
                                </div>
                            </div>
                        </div>

                        <div class="siac-card" style="cursor: pointer; transition: all 0.3s;" onclick="SiacCommercialDashboard.generarReporte('facturacion')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #4a9eff 0%, #2563eb 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-file-invoice-dollar" style="color: white; font-size: 20px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 600;">Facturacion</div>
                                    <div style="color: #a0a0a0; font-size: 0.85rem;">Top clientes por ventas</div>
                                </div>
                            </div>
                        </div>

                        <div class="siac-card" style="cursor: pointer; transition: all 0.3s;" onclick="SiacCommercialDashboard.generarReporte('saldos')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-balance-scale" style="color: white; font-size: 20px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 600;">Saldos</div>
                                    <div style="color: #a0a0a0; font-size: 0.85rem;">Cuentas corrientes</div>
                                </div>
                            </div>
                        </div>

                        <div class="siac-card" style="cursor: pointer; transition: all 0.3s;" onclick="SiacCommercialDashboard.generarReporte('antiguedad')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-calendar-alt" style="color: white; font-size: 20px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 600;">Antiguedad</div>
                                    <div style="color: #a0a0a0; font-size: 0.85rem;">Clientes nuevos vs antiguos</div>
                                </div>
                            </div>
                        </div>

                        <div class="siac-card" style="cursor: pointer; transition: all 0.3s;" onclick="SiacCommercialDashboard.generarReporte('actividad')" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-chart-line" style="color: white; font-size: 20px;"></i>
                                </div>
                                <div>
                                    <div style="font-weight: 600;">Actividad</div>
                                    <div style="color: #a0a0a0; font-size: 0.85rem;">Ultimas compras</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    generarReporte(tipo) {
        this.showToast(`Generando reporte de ${tipo}...`, 'info');
        document.querySelector('.siac-modal.active')?.remove();
        // TODO: Implementar generacion de reportes
    },

    // =============================================================================
    // FACTURACION TAB - SISTEMA COMPLETO
    // =============================================================================

    facturacionState: {
        currentMode: 'manual',
        currentSubTab: 'facturacion',
        tiposComprobante: ['Factura A', 'Factura B', 'Factura C', 'Nota de Credito A', 'Nota de Credito B', 'Nota de Debito A', 'Nota de Debito B'],
        condicionesVenta: ['Contado', '15 dias', '30 dias', '60 dias', '90 dias'],
        condicionesIVA: ['Responsable Inscripto', 'Monotributista', 'Exento', 'Consumidor Final', 'No Responsable']
    },

    async loadFacturacion() {
        const content = document.getElementById('siac-content');
        content.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando facturacion...</div>`;

        // Obtener estadisticas
        let stats = { total: 0, pendientes: 0, aprobadas: 0, montoMes: 0 };
        try {
            const response = await this.fetchAPI('/facturacion/stats');
            if (response) stats = response;
        } catch (e) { console.log('No hay stats disponibles'); }

        content.innerHTML = `
            <div class="siac-section">
                <!-- Header con info -->
                <div class="siac-fact-header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
                                <i class="fas fa-file-invoice"></i> Sistema de Facturacion SIAC
                            </h2>
                            <p style="margin: 8px 0 0 0; opacity: 0.8;">AFIP Ready - Facturacion electronica integrada</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 2rem; font-weight: bold; color: #4a9eff;">${stats.total || 0}</div>
                            <div style="font-size: 0.85rem; opacity: 0.8;">Facturas Emitidas</div>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div class="siac-card" style="text-align: center; padding: 20px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #f59e0b;">${stats.pendientes || 0}</div>
                        <div style="color: #a0a0a0; font-size: 0.85rem;">Pendientes AFIP</div>
                    </div>
                    <div class="siac-card" style="text-align: center; padding: 20px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #22c55e;">${stats.aprobadas || 0}</div>
                        <div style="color: #a0a0a0; font-size: 0.85rem;">Aprobadas CAE</div>
                    </div>
                    <div class="siac-card" style="text-align: center; padding: 20px;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: #4a9eff;">$${this.formatNumber(stats.montoMes || 0)}</div>
                        <div style="color: #a0a0a0; font-size: 0.85rem;">Facturado Este Mes</div>
                    </div>
                </div>

                <!-- Sub-tabs de Facturacion -->
                <div class="siac-fact-tabs">
                    <button class="siac-fact-tab active" id="factTab-facturacion" onclick="SiacCommercialDashboard.switchFacturacionTab('facturacion')">
                        <i class="fas fa-file-invoice"></i>
                        <span class="label">Facturacion</span>
                        <span class="sublabel">3 Modos</span>
                    </button>
                    <button class="siac-fact-tab" id="factTab-emitidas" onclick="SiacCommercialDashboard.switchFacturacionTab('emitidas')">
                        <i class="fas fa-history"></i>
                        <span class="label">Facturas Emitidas</span>
                        <span class="sublabel">Historial + CAE</span>
                    </button>
                    <button class="siac-fact-tab" id="factTab-config" onclick="SiacCommercialDashboard.switchFacturacionTab('config')">
                        <i class="fas fa-cog"></i>
                        <span class="label">Config AFIP</span>
                        <span class="sublabel">Certificados</span>
                    </button>
                </div>

                <div id="facturacion-content">
                    <!-- Se llena dinamicamente -->
                </div>
            </div>
        `;

        // Cargar tab por defecto
        this.switchFacturacionTab('facturacion');
    },

    switchFacturacionTab(tab) {
        this.facturacionState.currentSubTab = tab;

        // Actualizar tabs activos
        document.querySelectorAll('.siac-fact-tab').forEach(btn => btn.classList.remove('active'));
        const activeTab = document.getElementById(`factTab-${tab}`);
        if (activeTab) activeTab.classList.add('active');

        switch(tab) {
            case 'facturacion':
                this.loadFacturacionModes();
                break;
            case 'emitidas':
                this.loadFacturasEmitidas();
                break;
            case 'config':
                this.loadConfigAFIP();
                break;
        }
    },

    loadFacturacionModes() {
        const container = document.getElementById('facturacion-content');
        container.innerHTML = `
            <!-- Banner de ayuda -->
            <div class="siac-card" style="background: linear-gradient(135deg, rgba(74,158,255,0.1) 0%, rgba(139,92,246,0.1) 100%); border: 1px solid rgba(74,158,255,0.3); margin-bottom: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="font-size: 24px;">💡</div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 8px;">Facturacion - 3 Modos</div>
                        <div style="color: #a0a0a0; font-size: 0.85rem;">
                            <strong>MANUAL:</strong> Factura directa sin presupuesto (ventas ad-hoc) |
                            <strong>OCASIONAL:</strong> Presupuesto → Factura 1 vez (proyectos unicos) |
                            <strong>RECURRENTE:</strong> Presupuesto → Facturas periodicas (servicios continuos)
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mode Selector -->
            <div class="siac-mode-selector">
                <button class="siac-mode-btn active manual" id="modeBtn-manual" onclick="SiacCommercialDashboard.switchFacturacionMode('manual')">
                    <i class="fas fa-edit" style="color: #22c55e;"></i>
                    <div class="mode-title">MODO MANUAL</div>
                    <div class="mode-desc">Factura directa sin presupuesto</div>
                </button>
                <button class="siac-mode-btn" id="modeBtn-ocasional" onclick="SiacCommercialDashboard.switchFacturacionMode('ocasional')">
                    <i class="fas fa-file-alt" style="color: #22d3ee;"></i>
                    <div class="mode-title">MODO OCASIONAL</div>
                    <div class="mode-desc">Presupuesto → Factura 1 vez</div>
                </button>
                <button class="siac-mode-btn" id="modeBtn-recurrente" onclick="SiacCommercialDashboard.switchFacturacionMode('recurrente')">
                    <i class="fas fa-sync" style="color: #a855f7;"></i>
                    <div class="mode-title">MODO RECURRENTE</div>
                    <div class="mode-desc">Facturas periodicas</div>
                </button>
            </div>

            <div id="mode-content">
                <!-- Se llena segun el modo -->
            </div>
        `;

        this.switchFacturacionMode('manual');
    },

    switchFacturacionMode(mode) {
        this.facturacionState.currentMode = mode;

        // Actualizar botones
        document.querySelectorAll('.siac-mode-btn').forEach(btn => {
            btn.classList.remove('active', 'manual', 'ocasional', 'recurrente');
        });
        const activeBtn = document.getElementById(`modeBtn-${mode}`);
        if (activeBtn) {
            activeBtn.classList.add('active', mode);
        }

        const container = document.getElementById('mode-content');

        switch(mode) {
            case 'manual':
                container.innerHTML = `
                    <div class="siac-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h4 style="margin: 0;"><i class="fas fa-edit" style="color: #22c55e;"></i> Facturacion Manual</h4>
                            <button class="siac-btn siac-btn-success" onclick="SiacCommercialDashboard.nuevaFacturaManual()">
                                <i class="fas fa-plus"></i> Nueva Factura
                            </button>
                        </div>
                        <div id="facturas-manuales-list">
                            <div style="text-align: center; padding: 40px; color: #a0a0a0;">
                                <i class="fas fa-edit" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                                <p>Crea una factura directa sin necesidad de presupuesto previo</p>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'ocasional':
                this.loadPresupuestosOcasionales();
                break;

            case 'recurrente':
                this.loadPresupuestosRecurrentes();
                break;
        }
    },

    async loadPresupuestosOcasionales() {
        const container = document.getElementById('mode-content');
        container.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando presupuestos...</div>`;

        try {
            const response = await this.fetchAPI('/facturacion/presupuestos?tipo=ocasional');
            const presupuestos = response?.presupuestos || [];

            container.innerHTML = `
                <div class="siac-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h4 style="margin: 0;"><i class="fas fa-file-alt" style="color: #22d3ee;"></i> Presupuestos Ocasionales</h4>
                        <button class="siac-btn siac-btn-primary" onclick="SiacCommercialDashboard.nuevoPresupuestoOcasional()">
                            <i class="fas fa-plus"></i> Nuevo Presupuesto
                        </button>
                    </div>

                    ${presupuestos.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: #a0a0a0;">
                            <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                            <p>No hay presupuestos ocasionales</p>
                            <p style="font-size: 0.85rem;">Crea un presupuesto que se facturara una sola vez</p>
                        </div>
                    ` : `
                        <div class="siac-table-container">
                            <table class="siac-fact-table">
                                <thead>
                                    <tr>
                                        <th>Nro</th>
                                        <th>Cliente</th>
                                        <th>Descripcion</th>
                                        <th>Total</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${presupuestos.map(p => `
                                        <tr>
                                            <td><strong>#${p.id}</strong></td>
                                            <td>${p.cliente_razon_social || 'N/A'}</td>
                                            <td>${p.descripcion || '-'}</td>
                                            <td style="color: #4a9eff;">$${this.formatNumber(p.total || 0)}</td>
                                            <td><span class="siac-estado-badge ${p.estado === 'facturado' ? 'aprobado' : 'pendiente'}">${p.estado || 'pendiente'}</span></td>
                                            <td>
                                                ${p.estado !== 'facturado' ? `
                                                    <button class="siac-btn siac-btn-success" style="padding: 6px 12px; font-size: 0.8rem;" onclick="SiacCommercialDashboard.facturarPresupuesto(${p.id})">
                                                        <i class="fas fa-file-invoice"></i> Facturar
                                                    </button>
                                                ` : `<span style="color: #22c55e;"><i class="fas fa-check"></i> Facturado</span>`}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            `;
        } catch (error) {
            container.innerHTML = `
                <div class="siac-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h4 style="margin: 0;"><i class="fas fa-file-alt" style="color: #22d3ee;"></i> Presupuestos Ocasionales</h4>
                        <button class="siac-btn siac-btn-primary" onclick="SiacCommercialDashboard.nuevoPresupuestoOcasional()">
                            <i class="fas fa-plus"></i> Nuevo Presupuesto
                        </button>
                    </div>
                    <div style="text-align: center; padding: 40px; color: #a0a0a0;">
                        <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                        <p>No hay presupuestos ocasionales</p>
                    </div>
                </div>
            `;
        }
    },

    async loadPresupuestosRecurrentes() {
        const container = document.getElementById('mode-content');
        container.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando presupuestos...</div>`;

        try {
            const response = await this.fetchAPI('/facturacion/presupuestos?tipo=recurrente');
            const presupuestos = response?.presupuestos || [];

            container.innerHTML = `
                <div class="siac-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h4 style="margin: 0;"><i class="fas fa-sync" style="color: #a855f7;"></i> Presupuestos Recurrentes</h4>
                        <button class="siac-btn" style="background: #a855f7;" onclick="SiacCommercialDashboard.nuevoPresupuestoRecurrente()">
                            <i class="fas fa-plus"></i> Nuevo Presupuesto
                        </button>
                    </div>

                    ${presupuestos.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: #a0a0a0;">
                            <i class="fas fa-sync" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                            <p>No hay presupuestos recurrentes</p>
                            <p style="font-size: 0.85rem;">Crea un presupuesto que genere facturas automaticas periodicamente</p>
                        </div>
                    ` : `
                        <div class="siac-table-container">
                            <table class="siac-fact-table">
                                <thead>
                                    <tr>
                                        <th>Nro</th>
                                        <th>Cliente</th>
                                        <th>Descripcion</th>
                                        <th>Monto</th>
                                        <th>Frecuencia</th>
                                        <th>Prox. Factura</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${presupuestos.map(p => `
                                        <tr>
                                            <td><strong>#${p.id}</strong></td>
                                            <td>${p.cliente_razon_social || 'N/A'}</td>
                                            <td>${p.descripcion || '-'}</td>
                                            <td style="color: #4a9eff;">$${this.formatNumber(p.monto_mensual || 0)}</td>
                                            <td>${p.frecuencia || 'Mensual'}</td>
                                            <td>${p.proxima_factura ? new Date(p.proxima_factura).toLocaleDateString() : '-'}</td>
                                            <td><span class="siac-estado-badge ${p.activo ? 'aprobado' : 'pendiente'}">${p.activo ? 'Activo' : 'Pausado'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            `;
        } catch (error) {
            container.innerHTML = `
                <div class="siac-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h4 style="margin: 0;"><i class="fas fa-sync" style="color: #a855f7;"></i> Presupuestos Recurrentes</h4>
                        <button class="siac-btn" style="background: #a855f7;" onclick="SiacCommercialDashboard.nuevoPresupuestoRecurrente()">
                            <i class="fas fa-plus"></i> Nuevo Presupuesto
                        </button>
                    </div>
                    <div style="text-align: center; padding: 40px; color: #a0a0a0;">
                        <i class="fas fa-sync" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                        <p>No hay presupuestos recurrentes</p>
                    </div>
                </div>
            `;
        }
    },

    async loadFacturasEmitidas() {
        const container = document.getElementById('facturacion-content');
        container.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando facturas...</div>`;

        try {
            const response = await this.fetchAPI('/facturacion/invoices');
            const facturas = response?.invoices || [];

            container.innerHTML = `
                <!-- Banner de ayuda -->
                <div class="siac-card" style="background: linear-gradient(135deg, rgba(74,158,255,0.1) 0%, rgba(34,197,94,0.1) 100%); border: 1px solid rgba(74,158,255,0.3); margin-bottom: 20px;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="font-size: 24px;">📜</div>
                        <div>
                            <div style="font-weight: 600; margin-bottom: 4px;">Facturas Emitidas</div>
                            <div style="color: #a0a0a0; font-size: 0.85rem;">
                                Aqui se listan todas las facturas emitidas. Las facturas con estado AFIP "PENDIENTE" aun no tienen CAE.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="siac-card" style="margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 12px; align-items: end;">
                        <div class="siac-form-group">
                            <label>Buscar</label>
                            <input type="text" id="fact-search" placeholder="Cliente, numero de factura..." class="siac-input">
                        </div>
                        <div class="siac-form-group">
                            <label>Estado AFIP</label>
                            <select id="fact-estado" class="siac-input">
                                <option value="">Todos</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="APROBADO">Aprobado</option>
                                <option value="RECHAZADO">Rechazado</option>
                            </select>
                        </div>
                        <div class="siac-form-group">
                            <label>Desde</label>
                            <input type="date" id="fact-desde" class="siac-input">
                        </div>
                        <div class="siac-form-group">
                            <label>Hasta</label>
                            <input type="date" id="fact-hasta" class="siac-input">
                        </div>
                        <button class="siac-btn siac-btn-primary" onclick="SiacCommercialDashboard.buscarFacturas()">
                            <i class="fas fa-search"></i> Buscar
                        </button>
                    </div>
                </div>

                <!-- Tabla -->
                <div class="siac-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h4 style="margin: 0;"><i class="fas fa-list"></i> Listado de Facturas</h4>
                        <span style="color: #a0a0a0; font-size: 0.85rem;">${facturas.length} facturas encontradas</span>
                    </div>

                    <div class="siac-table-container" style="overflow-x: auto;">
                        <table class="siac-fact-table">
                            <thead>
                                <tr>
                                    <th>Numero</th>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Tipo</th>
                                    <th style="text-align: right;">Total</th>
                                    <th style="text-align: center;">Estado AFIP</th>
                                    <th>CAE</th>
                                    <th style="text-align: center;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${facturas.length === 0 ? `
                                    <tr>
                                        <td colspan="8" style="text-align: center; padding: 60px; color: #a0a0a0;">
                                            <i class="fas fa-file-invoice" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                                            <p>No hay facturas emitidas</p>
                                            <p style="font-size: 0.85rem;">Ve a la pestana "Facturacion" para crear una</p>
                                        </td>
                                    </tr>
                                ` : facturas.map(f => `
                                    <tr>
                                        <td><strong>${f.numero_completo || f.invoice_number || '#' + f.id}</strong></td>
                                        <td>${new Date(f.fecha_factura).toLocaleDateString()}</td>
                                        <td>${f.cliente_razon_social || f.cliente?.razon_social || 'N/A'}</td>
                                        <td>${f.tipo_comprobante || 'Factura'}</td>
                                        <td style="text-align: right; color: #4a9eff; font-weight: 600;">$${this.formatNumber(f.total_factura || 0)}</td>
                                        <td style="text-align: center;">
                                            <span class="siac-estado-badge ${f.estado_afip === 'APROBADO' ? 'aprobado' : f.estado_afip === 'RECHAZADO' ? 'rechazado' : 'pendiente'}">
                                                ${f.estado_afip || 'PENDIENTE'}
                                            </span>
                                        </td>
                                        <td style="font-family: monospace; font-size: 0.8rem; color: ${f.cae ? '#22c55e' : '#a0a0a0'};">
                                            ${f.cae ? f.cae.substring(0, 14) + '...' : 'Sin CAE'}
                                        </td>
                                        <td style="text-align: center;">
                                            <div style="display: flex; gap: 6px; justify-content: center;">
                                                ${f.cae ? `
                                                    <button class="siac-btn-icon" title="Ver CAE" onclick="SiacCommercialDashboard.verCAE('${f.cae}', '${f.cae_vencimiento || ''}')">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    <button class="siac-btn-icon" title="Imprimir" onclick="SiacCommercialDashboard.imprimirFactura(${f.id})">
                                                        <i class="fas fa-print"></i>
                                                    </button>
                                                ` : `
                                                    <button class="siac-btn" style="padding: 6px 10px; font-size: 0.75rem; background: #f59e0b;" onclick="SiacCommercialDashboard.solicitarCAE(${f.id})">
                                                        <i class="fas fa-paper-plane"></i> Solicitar CAE
                                                    </button>
                                                `}
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `
                <div class="siac-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar facturas</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },

    loadConfigAFIP() {
        const container = document.getElementById('facturacion-content');
        container.innerHTML = `
            <!-- Banner de ayuda -->
            <div class="siac-card" style="background: linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(239,68,68,0.1) 100%); border: 1px solid rgba(245,158,11,0.3); margin-bottom: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="font-size: 24px;">⚠️</div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 4px;">Configuracion AFIP</div>
                        <div style="color: #a0a0a0; font-size: 0.85rem;">
                            Configura tu certificado digital y puntos de venta para facturacion electronica.
                            <strong>Nunca compartas tu certificado digital con terceros.</strong>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Seccion Certificados -->
            <div class="siac-card" style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-certificate" style="color: #f59e0b;"></i> Certificado Digital AFIP
                </h4>

                <div class="siac-form-grid cols-2">
                    <div class="siac-form-group">
                        <label>Archivo de Certificado (.p12 o .pem)</label>
                        <input type="file" id="afip-cert-file" accept=".p12,.pem" class="siac-input">
                    </div>
                    <div class="siac-form-group" style="display: flex; align-items: flex-end;">
                        <button class="siac-btn siac-btn-success" onclick="SiacCommercialDashboard.subirCertificado()">
                            <i class="fas fa-upload"></i> Subir Certificado
                        </button>
                    </div>
                </div>

                <div id="cert-status" style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; color: #a0a0a0; font-size: 0.85rem;">
                    <i class="fas fa-info-circle"></i> Estado: Sin certificado configurado
                </div>

                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <h5 style="margin: 0 0 12px 0; color: #a0a0a0;">Token WSAA Actual</h5>
                    <div id="token-wsaa" style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; color: #4a9eff; font-size: 0.8rem; word-break: break-all;">
                        Sin token disponible. Sube tu certificado primero.
                    </div>
                    <div id="token-exp" style="margin-top: 8px; color: #a0a0a0; font-size: 0.8rem;">
                        Expiracion: N/A
                    </div>
                </div>
            </div>

            <!-- Seccion Puntos de Venta -->
            <div class="siac-card" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-store" style="color: #22d3ee;"></i> Puntos de Venta
                    </h4>
                    <button class="siac-btn siac-btn-primary" onclick="SiacCommercialDashboard.agregarPuntoVenta()">
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </div>

                <div id="puntos-venta-list">
                    <div style="text-align: center; padding: 30px; color: #a0a0a0;">
                        <i class="fas fa-store" style="font-size: 32px; margin-bottom: 10px; opacity: 0.3;"></i>
                        <p>No hay puntos de venta configurados</p>
                    </div>
                </div>
            </div>

            <!-- Seccion Config General -->
            <div class="siac-card">
                <h4 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-cog" style="color: #a855f7;"></i> Configuracion General
                </h4>

                <div class="siac-form-grid cols-2">
                    <div class="siac-form-group">
                        <label>Ambiente AFIP</label>
                        <select id="afip-env" class="siac-input">
                            <option value="TESTING">🧪 TESTING (Homologacion)</option>
                            <option value="PRODUCTION">🚀 PRODUCCION</option>
                        </select>
                    </div>
                    <div class="siac-form-group">
                        <label>CUIT Empresa</label>
                        <input type="text" id="afip-cuit" placeholder="30-12345678-9" class="siac-input">
                    </div>
                    <div class="siac-form-group full-width">
                        <label>Razon Social</label>
                        <input type="text" id="afip-razon" class="siac-input">
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <button class="siac-btn siac-btn-success" onclick="SiacCommercialDashboard.guardarConfigAFIP()">
                        <i class="fas fa-save"></i> Guardar Configuracion
                    </button>
                </div>
            </div>
        `;

        // Cargar datos existentes
        this.cargarConfigAFIP();
        this.cargarPuntosVenta();
    },

    async cargarConfigAFIP() {
        try {
            const response = await this.fetchAPI('/afip/config');
            if (response?.config) {
                const config = response.config;
                document.getElementById('afip-env').value = config.afip_environment || 'TESTING';
                document.getElementById('afip-cuit').value = config.cuit || '';
                document.getElementById('afip-razon').value = config.razon_social || '';

                if (config.cached_token) {
                    document.getElementById('token-wsaa').textContent = config.cached_token.substring(0, 100) + '...';
                    document.getElementById('token-exp').textContent = `Expiracion: ${new Date(config.token_expiration).toLocaleString()}`;
                }

                if (config.certificate_expiration) {
                    document.getElementById('cert-status').innerHTML = `<i class="fas fa-check-circle" style="color: #22c55e;"></i> Certificado activo | Vencimiento: ${new Date(config.certificate_expiration).toLocaleDateString()}`;
                }
            }
        } catch (e) { console.log('No hay config AFIP'); }
    },

    async cargarPuntosVenta() {
        try {
            const response = await this.fetchAPI('/afip/puntos-venta');
            const puntos = response?.puntos_venta || [];
            const container = document.getElementById('puntos-venta-list');

            if (puntos.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #a0a0a0;">
                        <i class="fas fa-store" style="font-size: 32px; margin-bottom: 10px; opacity: 0.3;"></i>
                        <p>No hay puntos de venta configurados</p>
                    </div>
                `;
            } else {
                container.innerHTML = puntos.map(pv => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 10px;">
                        <div>
                            <div style="font-weight: 600;">Punto de Venta: ${pv.punto_venta}</div>
                            <div style="color: #a0a0a0; font-size: 0.85rem; margin-top: 4px;">
                                Domicilio: ${pv.domicilio_fiscal || 'No configurado'}
                            </div>
                            <div style="color: #4a9eff; font-size: 0.8rem; margin-top: 4px;">
                                Ultimo Nro Factura A: ${pv.ultimo_numero_factura_a || 0} | B: ${pv.ultimo_numero_factura_b || 0}
                            </div>
                        </div>
                        <button class="siac-btn-icon" onclick="SiacCommercialDashboard.editarPuntoVenta(${pv.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                `).join('');
            }
        } catch (e) { console.log('No hay puntos de venta'); }
    },

    // ===================== ACCIONES DE FACTURACION =====================

    nuevaFacturaManual() {
        this.renderModalFactura('manual');
    },

    nuevoPresupuestoOcasional() {
        this.renderModalPresupuesto('ocasional');
    },

    nuevoPresupuestoRecurrente() {
        this.renderModalPresupuesto('recurrente');
    },

    renderModalFactura(modo) {
        const modal = document.createElement('div');
        modal.className = 'siac-modal active';
        modal.id = 'modal-factura';
        modal.innerHTML = `
            <div class="siac-modal-content" style="max-width: 1000px;">
                <div class="siac-modal-header">
                    <h3><i class="fas fa-file-invoice"></i> Nueva Factura ${modo === 'manual' ? 'Manual' : ''}</h3>
                    <button class="siac-modal-close" onclick="SiacCommercialDashboard.cerrarModalFactura()">×</button>
                </div>
                <div class="siac-modal-body">
                    <!-- Datos del Cliente -->
                    <div class="siac-form-section">
                        <h4><i class="fas fa-user"></i> Datos del Cliente</h4>
                        <div class="siac-form-grid cols-2">
                            <div class="siac-form-group">
                                <label>Cliente <span class="required">*</span></label>
                                <select id="fact-cliente" class="siac-input" onchange="SiacCommercialDashboard.cargarDatosCliente()">
                                    <option value="">Seleccionar cliente...</option>
                                </select>
                            </div>
                            <div class="siac-form-group">
                                <label>CUIT/CUIL</label>
                                <input type="text" id="fact-cuit" class="siac-input" readonly>
                            </div>
                            <div class="siac-form-group">
                                <label>Condicion IVA</label>
                                <input type="text" id="fact-cond-iva" class="siac-input" readonly>
                            </div>
                            <div class="siac-form-group">
                                <label>Domicilio</label>
                                <input type="text" id="fact-domicilio" class="siac-input" readonly>
                            </div>
                        </div>
                    </div>

                    <!-- Datos de la Factura -->
                    <div class="siac-form-section">
                        <h4><i class="fas fa-file-alt"></i> Datos de la Factura</h4>
                        <div class="siac-form-grid cols-3">
                            <div class="siac-form-group">
                                <label>Tipo Comprobante <span class="required">*</span></label>
                                <select id="fact-tipo" class="siac-input">
                                    ${this.facturacionState.tiposComprobante.map(t => `<option value="${t}">${t}</option>`).join('')}
                                </select>
                            </div>
                            <div class="siac-form-group">
                                <label>Punto de Venta</label>
                                <select id="fact-pv" class="siac-input">
                                    <option value="1">0001</option>
                                </select>
                            </div>
                            <div class="siac-form-group">
                                <label>Fecha</label>
                                <input type="date" id="fact-fecha" class="siac-input" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="siac-form-group">
                                <label>Condicion de Venta</label>
                                <select id="fact-condicion" class="siac-input">
                                    ${this.facturacionState.condicionesVenta.map(c => `<option value="${c}">${c}</option>`).join('')}
                                </select>
                            </div>
                            <div class="siac-form-group full-width">
                                <label>Concepto / Descripcion</label>
                                <textarea id="fact-concepto" class="siac-input" rows="2" placeholder="Descripcion del servicio o producto..."></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Items -->
                    <div class="siac-form-section">
                        <h4><i class="fas fa-list"></i> Items</h4>
                        <div id="fact-items">
                            <div class="fact-item-row" style="display: grid; grid-template-columns: 3fr 1fr 1fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: end;">
                                <div class="siac-form-group">
                                    <label>Descripcion</label>
                                    <input type="text" class="siac-input item-desc" placeholder="Descripcion del item">
                                </div>
                                <div class="siac-form-group">
                                    <label>Cant</label>
                                    <input type="number" class="siac-input item-cant" value="1" min="1" onchange="SiacCommercialDashboard.calcularTotales()">
                                </div>
                                <div class="siac-form-group">
                                    <label>Precio Unit.</label>
                                    <input type="number" class="siac-input item-precio" value="0" step="0.01" onchange="SiacCommercialDashboard.calcularTotales()">
                                </div>
                                <div class="siac-form-group">
                                    <label>IVA %</label>
                                    <select class="siac-input item-iva" onchange="SiacCommercialDashboard.calcularTotales()">
                                        <option value="21">21%</option>
                                        <option value="10.5">10.5%</option>
                                        <option value="27">27%</option>
                                        <option value="0">0%</option>
                                    </select>
                                </div>
                                <div class="siac-form-group">
                                    <label>Subtotal</label>
                                    <input type="text" class="siac-input item-subtotal" readonly value="$0.00">
                                </div>
                                <button class="siac-btn-icon" style="color: #ef4444;" onclick="this.closest('.fact-item-row').remove(); SiacCommercialDashboard.calcularTotales();">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <button class="siac-btn" onclick="SiacCommercialDashboard.agregarItemFactura()">
                            <i class="fas fa-plus"></i> Agregar Item
                        </button>
                    </div>

                    <!-- Totales -->
                    <div class="siac-form-section">
                        <div style="display: flex; justify-content: flex-end;">
                            <div style="width: 300px; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span>Subtotal:</span>
                                    <span id="fact-subtotal">$0.00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span>IVA:</span>
                                    <span id="fact-iva-total">$0.00</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                                    <span>TOTAL:</span>
                                    <span id="fact-total" style="color: #4a9eff;">$0.00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="siac-modal-footer">
                    <button class="siac-btn" onclick="SiacCommercialDashboard.cerrarModalFactura()">Cancelar</button>
                    <button class="siac-btn siac-btn-success" onclick="SiacCommercialDashboard.emitirFactura()">
                        <i class="fas fa-paper-plane"></i> Emitir Factura
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.cargarClientesEnSelect();
    },

    renderModalPresupuesto(tipo) {
        const esRecurrente = tipo === 'recurrente';
        const color = esRecurrente ? '#a855f7' : '#22d3ee';

        const modal = document.createElement('div');
        modal.className = 'siac-modal active';
        modal.id = 'modal-presupuesto';
        modal.innerHTML = `
            <div class="siac-modal-content">
                <div class="siac-modal-header" style="background: linear-gradient(135deg, ${color}33 0%, ${color}66 100%);">
                    <h3><i class="fas fa-${esRecurrente ? 'sync' : 'file-alt'}"></i> Nuevo Presupuesto ${esRecurrente ? 'Recurrente' : 'Ocasional'}</h3>
                    <button class="siac-modal-close" onclick="document.getElementById('modal-presupuesto').remove()">×</button>
                </div>
                <div class="siac-modal-body">
                    <div class="siac-form-section">
                        <h4><i class="fas fa-user"></i> Cliente</h4>
                        <div class="siac-form-grid">
                            <div class="siac-form-group full-width">
                                <label>Seleccionar Cliente <span class="required">*</span></label>
                                <select id="pres-cliente" class="siac-input">
                                    <option value="">Seleccionar...</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="siac-form-section">
                        <h4><i class="fas fa-file-alt"></i> Detalle</h4>
                        <div class="siac-form-grid cols-2">
                            <div class="siac-form-group full-width">
                                <label>Descripcion <span class="required">*</span></label>
                                <textarea id="pres-descripcion" class="siac-input" rows="3" placeholder="Descripcion del servicio..."></textarea>
                            </div>
                            <div class="siac-form-group">
                                <label>Monto ${esRecurrente ? 'Mensual' : ''} <span class="required">*</span></label>
                                <input type="number" id="pres-monto" class="siac-input" step="0.01" placeholder="0.00">
                            </div>
                            ${esRecurrente ? `
                                <div class="siac-form-group">
                                    <label>Frecuencia</label>
                                    <select id="pres-frecuencia" class="siac-input">
                                        <option value="mensual">Mensual</option>
                                        <option value="bimestral">Bimestral</option>
                                        <option value="trimestral">Trimestral</option>
                                        <option value="semestral">Semestral</option>
                                        <option value="anual">Anual</option>
                                    </select>
                                </div>
                                <div class="siac-form-group">
                                    <label>Fecha Inicio</label>
                                    <input type="date" id="pres-inicio" class="siac-input" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="siac-form-group">
                                    <label>Fecha Fin (opcional)</label>
                                    <input type="date" id="pres-fin" class="siac-input">
                                </div>
                            ` : `
                                <div class="siac-form-group">
                                    <label>Validez (dias)</label>
                                    <input type="number" id="pres-validez" class="siac-input" value="30">
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                <div class="siac-modal-footer">
                    <button class="siac-btn" onclick="document.getElementById('modal-presupuesto').remove()">Cancelar</button>
                    <button class="siac-btn" style="background: ${color};" onclick="SiacCommercialDashboard.guardarPresupuesto('${tipo}')">
                        <i class="fas fa-save"></i> Guardar Presupuesto
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.cargarClientesEnSelect('pres-cliente');
    },

    cerrarModalFactura() {
        const modal = document.getElementById('modal-factura');
        if (modal) modal.remove();
    },

    async cargarClientesEnSelect(selectId = 'fact-cliente') {
        try {
            const response = await this.fetchAPI('/clientes');
            const clientes = response?.clientes || [];
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Seleccionar cliente...</option>' +
                    clientes.map(c => `<option value="${c.id}" data-cuit="${c.cuit || ''}" data-condicion="${c.condicion_iva || ''}" data-domicilio="${c.direccion || ''}">${c.razon_social}</option>`).join('');
            }
        } catch (e) { console.log('Error cargando clientes'); }
    },

    cargarDatosCliente() {
        const select = document.getElementById('fact-cliente');
        const option = select.options[select.selectedIndex];
        if (option && option.value) {
            document.getElementById('fact-cuit').value = option.dataset.cuit || '';
            document.getElementById('fact-cond-iva').value = option.dataset.condicion || '';
            document.getElementById('fact-domicilio').value = option.dataset.domicilio || '';
        }
    },

    agregarItemFactura() {
        const container = document.getElementById('fact-items');
        const newRow = document.createElement('div');
        newRow.className = 'fact-item-row';
        newRow.style.cssText = 'display: grid; grid-template-columns: 3fr 1fr 1fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: end;';
        newRow.innerHTML = `
            <div class="siac-form-group">
                <input type="text" class="siac-input item-desc" placeholder="Descripcion del item">
            </div>
            <div class="siac-form-group">
                <input type="number" class="siac-input item-cant" value="1" min="1" onchange="SiacCommercialDashboard.calcularTotales()">
            </div>
            <div class="siac-form-group">
                <input type="number" class="siac-input item-precio" value="0" step="0.01" onchange="SiacCommercialDashboard.calcularTotales()">
            </div>
            <div class="siac-form-group">
                <select class="siac-input item-iva" onchange="SiacCommercialDashboard.calcularTotales()">
                    <option value="21">21%</option>
                    <option value="10.5">10.5%</option>
                    <option value="27">27%</option>
                    <option value="0">0%</option>
                </select>
            </div>
            <div class="siac-form-group">
                <input type="text" class="siac-input item-subtotal" readonly value="$0.00">
            </div>
            <button class="siac-btn-icon" style="color: #ef4444;" onclick="this.closest('.fact-item-row').remove(); SiacCommercialDashboard.calcularTotales();">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(newRow);
    },

    calcularTotales() {
        let subtotal = 0;
        let ivaTotal = 0;

        document.querySelectorAll('.fact-item-row').forEach(row => {
            const cant = parseFloat(row.querySelector('.item-cant')?.value) || 0;
            const precio = parseFloat(row.querySelector('.item-precio')?.value) || 0;
            const iva = parseFloat(row.querySelector('.item-iva')?.value) || 0;

            const itemSubtotal = cant * precio;
            const itemIva = itemSubtotal * (iva / 100);

            subtotal += itemSubtotal;
            ivaTotal += itemIva;

            const subtotalInput = row.querySelector('.item-subtotal');
            if (subtotalInput) subtotalInput.value = '$' + this.formatNumber(itemSubtotal);
        });

        document.getElementById('fact-subtotal').textContent = '$' + this.formatNumber(subtotal);
        document.getElementById('fact-iva-total').textContent = '$' + this.formatNumber(ivaTotal);
        document.getElementById('fact-total').textContent = '$' + this.formatNumber(subtotal + ivaTotal);
    },

    async emitirFactura() {
        const clienteId = document.getElementById('fact-cliente').value;
        if (!clienteId) {
            this.showToast('Selecciona un cliente', 'error');
            return;
        }

        const items = [];
        document.querySelectorAll('.fact-item-row').forEach(row => {
            const desc = row.querySelector('.item-desc')?.value;
            const cant = parseFloat(row.querySelector('.item-cant')?.value) || 0;
            const precio = parseFloat(row.querySelector('.item-precio')?.value) || 0;
            const iva = parseFloat(row.querySelector('.item-iva')?.value) || 0;
            if (desc && cant > 0) {
                items.push({ descripcion: desc, cantidad: cant, precio_unitario: precio, iva_porcentaje: iva });
            }
        });

        if (items.length === 0) {
            this.showToast('Agrega al menos un item', 'error');
            return;
        }

        try {
            const response = await this.fetchAPI('/facturacion/invoices', {
                method: 'POST',
                body: JSON.stringify({
                    cliente_id: clienteId,
                    tipo_comprobante: document.getElementById('fact-tipo').value,
                    punto_venta: document.getElementById('fact-pv').value,
                    fecha_factura: document.getElementById('fact-fecha').value,
                    condicion_venta: document.getElementById('fact-condicion').value,
                    concepto: document.getElementById('fact-concepto').value,
                    items: items
                })
            });

            if (response?.success) {
                this.showToast('Factura emitida exitosamente', 'success');
                this.cerrarModalFactura();
                this.loadFacturacion();
            } else {
                this.showToast(response?.error || 'Error al emitir factura', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    async guardarPresupuesto(tipo) {
        const clienteId = document.getElementById('pres-cliente').value;
        const descripcion = document.getElementById('pres-descripcion').value;
        const monto = parseFloat(document.getElementById('pres-monto').value) || 0;

        if (!clienteId || !descripcion || monto <= 0) {
            this.showToast('Completa todos los campos requeridos', 'error');
            return;
        }

        const data = {
            cliente_id: clienteId,
            descripcion,
            tipo,
            monto: tipo === 'recurrente' ? undefined : monto,
            monto_mensual: tipo === 'recurrente' ? monto : undefined,
            frecuencia: tipo === 'recurrente' ? document.getElementById('pres-frecuencia').value : undefined,
            fecha_inicio: tipo === 'recurrente' ? document.getElementById('pres-inicio').value : undefined,
            fecha_fin: tipo === 'recurrente' ? document.getElementById('pres-fin').value : undefined,
            validez_dias: tipo === 'ocasional' ? parseInt(document.getElementById('pres-validez').value) : undefined
        };

        try {
            const response = await this.fetchAPI('/facturacion/presupuestos', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response?.success) {
                this.showToast('Presupuesto guardado', 'success');
                document.getElementById('modal-presupuesto').remove();
                this.switchFacturacionMode(tipo);
            } else {
                this.showToast(response?.error || 'Error al guardar', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    async facturarPresupuesto(presupuestoId) {
        if (!confirm('¿Generar factura a partir de este presupuesto?')) return;

        try {
            const response = await this.fetchAPI(`/facturacion/presupuestos/${presupuestoId}/facturar`, { method: 'POST' });
            if (response?.success) {
                this.showToast('Factura generada exitosamente', 'success');
                this.switchFacturacionMode('ocasional');
            } else {
                this.showToast(response?.error || 'Error al facturar', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    verCAE(cae, vencimiento) {
        alert(`📜 CAE - Codigo de Autorizacion Electronica\n\nCAE: ${cae}\nVencimiento: ${vencimiento || 'N/A'}\n\nEste codigo es valido ante AFIP.`);
    },

    async solicitarCAE(facturaId) {
        if (!confirm('¿Solicitar CAE a AFIP para esta factura?')) return;

        try {
            const response = await this.fetchAPI(`/afip/cae/solicitar/${facturaId}`, { method: 'POST' });
            if (response?.success) {
                this.showToast(`CAE obtenido: ${response.cae?.cae}`, 'success');
                this.loadFacturasEmitidas();
            } else {
                this.showToast(response?.error || 'Error al solicitar CAE', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    imprimirFactura(facturaId) {
        window.open(`/api/siac/facturacion/invoices/${facturaId}/pdf?company_id=${this.companyId}`, '_blank');
    },

    buscarFacturas() {
        // Implementar filtrado
        this.showToast('Filtros aplicados', 'info');
        this.loadFacturasEmitidas();
    },

    async subirCertificado() {
        const fileInput = document.getElementById('afip-cert-file');
        if (!fileInput?.files?.length) {
            this.showToast('Selecciona un archivo', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('certificate', fileInput.files[0]);

        try {
            const response = await fetch(`/api/afip/certificates/upload?company_id=${this.companyId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            });
            const result = await response.json();

            if (result.success) {
                this.showToast('Certificado subido', 'success');
                this.cargarConfigAFIP();
            } else {
                this.showToast(result.error || 'Error al subir', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    agregarPuntoVenta() {
        const pv = prompt('Numero de Punto de Venta (1-9999):', '1');
        const domicilio = prompt('Domicilio Fiscal:');

        if (!pv || !domicilio) {
            this.showToast('Ambos campos son requeridos', 'error');
            return;
        }

        this.fetchAPI('/afip/puntos-venta', {
            method: 'POST',
            body: JSON.stringify({ punto_venta: parseInt(pv), domicilio_fiscal: domicilio })
        }).then(response => {
            if (response?.success) {
                this.showToast('Punto de venta agregado', 'success');
                this.cargarPuntosVenta();
            } else {
                this.showToast(response?.error || 'Error', 'error');
            }
        });
    },

    editarPuntoVenta(id) {
        this.showToast('Editar punto de venta - Proximamente', 'info');
    },

    async guardarConfigAFIP() {
        const data = {
            afip_environment: document.getElementById('afip-env').value,
            cuit: document.getElementById('afip-cuit').value,
            razon_social: document.getElementById('afip-razon').value
        };

        try {
            const response = await this.fetchAPI('/afip/config', {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            if (response?.success) {
                this.showToast('Configuracion guardada', 'success');
            } else {
                this.showToast(response?.error || 'Error al guardar', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    // =============================================================================
    // PLANTILLAS FISCALES TAB
    // =============================================================================

    async loadPlantillasFiscales() {
        const content = document.getElementById('siac-content');
        content.innerHTML = `<div class="siac-loading"><i class="fas fa-spinner fa-spin"></i> Cargando plantillas fiscales...</div>`;

        content.innerHTML = `
            <div class="siac-section">
                <div class="siac-section-header">
                    <h3><i class="fas fa-calculator"></i> Plantillas Fiscales</h3>
                    <button class="siac-btn siac-btn-success" onclick="SiacCommercialDashboard.nuevaPlantilla()">
                        <i class="fas fa-plus"></i> Nueva Plantilla
                    </button>
                </div>

                <!-- Sub-tabs -->
                <div class="siac-subtabs" style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="siac-subtab active" onclick="SiacCommercialDashboard.loadPlantillasSubTab('plantillas')">
                        <i class="fas fa-file-alt"></i> Plantillas
                    </button>
                    <button class="siac-subtab" onclick="SiacCommercialDashboard.loadPlantillasSubTab('condiciones')">
                        <i class="fas fa-tag"></i> Condiciones IVA
                    </button>
                    <button class="siac-subtab" onclick="SiacCommercialDashboard.loadPlantillasSubTab('alicuotas')">
                        <i class="fas fa-percent"></i> Alicuotas
                    </button>
                </div>

                <div id="plantillas-content">
                    <div class="siac-card" style="text-align: center; padding: 40px;">
                        <i class="fas fa-calculator" style="font-size: 48px; color: #4a9eff; margin-bottom: 15px;"></i>
                        <h4>Plantillas Fiscales por Pais</h4>
                        <p style="color: #a0a0a0;">Configura la matriz impositiva para Argentina, Chile, Peru, Mexico, Brasil y Colombia</p>
                    </div>

                    <!-- Tabla de plantillas -->
                    <div class="siac-table-container" style="margin-top: 20px;">
                        <table class="siac-table">
                            <thead>
                                <tr>
                                    <th>Pais</th>
                                    <th>Nombre</th>
                                    <th>Campo Fiscal</th>
                                    <th>Formato</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span style="font-size: 1.5em;">🇦🇷</span> Argentina</td>
                                    <td>CUIT</td>
                                    <td>tax_id</td>
                                    <td style="font-family: monospace;">XX-XXXXXXXX-X</td>
                                    <td><span class="siac-badge success">Activo</span></td>
                                    <td><button class="siac-btn-icon"><i class="fas fa-edit"></i></button></td>
                                </tr>
                                <tr>
                                    <td><span style="font-size: 1.5em;">🇨🇱</span> Chile</td>
                                    <td>RUT</td>
                                    <td>tax_id</td>
                                    <td style="font-family: monospace;">XX.XXX.XXX-X</td>
                                    <td><span class="siac-badge success">Activo</span></td>
                                    <td><button class="siac-btn-icon"><i class="fas fa-edit"></i></button></td>
                                </tr>
                                <tr>
                                    <td><span style="font-size: 1.5em;">🇲🇽</span> Mexico</td>
                                    <td>RFC</td>
                                    <td>tax_id</td>
                                    <td style="font-family: monospace;">XXXX-XXXXXX-XXX</td>
                                    <td><span class="siac-badge success">Activo</span></td>
                                    <td><button class="siac-btn-icon"><i class="fas fa-edit"></i></button></td>
                                </tr>
                                <tr>
                                    <td><span style="font-size: 1.5em;">🇧🇷</span> Brasil</td>
                                    <td>CNPJ</td>
                                    <td>tax_id</td>
                                    <td style="font-family: monospace;">XX.XXX.XXX/XXXX-XX</td>
                                    <td><span class="siac-badge success">Activo</span></td>
                                    <td><button class="siac-btn-icon"><i class="fas fa-edit"></i></button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    loadPlantillasSubTab(tab) {
        document.querySelectorAll('.siac-subtab').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.siac-subtab').classList.add('active');

        const container = document.getElementById('plantillas-content');

        switch(tab) {
            case 'plantillas':
                this.loadPlantillasFiscales();
                break;
            case 'condiciones':
                container.innerHTML = `
                    <div class="siac-card">
                        <h4>Condiciones de IVA</h4>
                        <div class="siac-table-container" style="margin-top: 15px;">
                            <table class="siac-table">
                                <thead><tr><th>Codigo</th><th>Nombre</th><th>Discrimina IVA</th><th>Pais</th></tr></thead>
                                <tbody>
                                    <tr><td>RI</td><td>Responsable Inscripto</td><td><span class="siac-badge success">Si</span></td><td>Argentina</td></tr>
                                    <tr><td>MT</td><td>Monotributista</td><td><span class="siac-badge danger">No</span></td><td>Argentina</td></tr>
                                    <tr><td>CF</td><td>Consumidor Final</td><td><span class="siac-badge danger">No</span></td><td>Argentina</td></tr>
                                    <tr><td>EX</td><td>Exento</td><td><span class="siac-badge danger">No</span></td><td>Argentina</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                break;
            case 'alicuotas':
                container.innerHTML = `
                    <div class="siac-card">
                        <h4>Alicuotas de IVA</h4>
                        <div class="siac-table-container" style="margin-top: 15px;">
                            <table class="siac-table">
                                <thead><tr><th>Codigo</th><th>Descripcion</th><th>Porcentaje</th><th>Pais</th></tr></thead>
                                <tbody>
                                    <tr><td>IVA21</td><td>IVA 21%</td><td style="color: #4a9eff;">21.00%</td><td>Argentina</td></tr>
                                    <tr><td>IVA10.5</td><td>IVA 10.5%</td><td style="color: #4a9eff;">10.50%</td><td>Argentina</td></tr>
                                    <tr><td>IVA27</td><td>IVA 27%</td><td style="color: #4a9eff;">27.00%</td><td>Argentina</td></tr>
                                    <tr><td>EX</td><td>Exento</td><td style="color: #22c55e;">0.00%</td><td>Argentina</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                break;
        }
    },

    nuevaPlantilla() {
        alert('Nueva Plantilla Fiscal - Proximamente');
    },

    // =============================================================================
    // STYLES
    // =============================================================================

    getStyles() {
        return `
            .siac-commercial-dashboard {
                background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
                min-height: 100vh;
                padding: 20px;
                color: #e6edf3;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            /* Header */
            .siac-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
                margin-bottom: 20px;
            }

            .siac-header-title {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 1.5rem;
                font-weight: 600;
            }

            .siac-header-title i {
                color: #f59e0b;
            }

            /* Tabs */
            .siac-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
                background: rgba(255,255,255,0.03);
                padding: 8px;
                border-radius: 12px;
            }

            .siac-tab {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                border: none;
                background: transparent;
                color: #b0b0b0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.9rem;
            }

            .siac-tab:hover {
                background: rgba(255,255,255,0.05);
                color: #fff;
            }

            .siac-tab.active {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #000;
                font-weight: 500;
            }

            /* Content */
            .siac-content {
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
                padding: 20px;
                min-height: 400px;
            }

            /* Loading */
            .siac-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 60px;
                color: #e0e0e0;
            }

            /* Buttons */
            .siac-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                border: 1px solid rgba(255,255,255,0.1);
                background: rgba(255,255,255,0.05);
                color: #fff;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.875rem;
            }

            .siac-btn:hover {
                background: rgba(255,255,255,0.1);
            }

            .siac-btn-primary {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border: none;
                color: #000;
            }

            .siac-btn-primary:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(245,158,11,0.3);
            }

            .siac-btn-success {
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                border: none;
                color: #fff;
            }

            .siac-btn-danger {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                border: none;
                color: #fff;
            }

            .siac-btn-icon {
                width: 32px;
                height: 32px;
                padding: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: none;
                background: rgba(255,255,255,0.05);
                color: #c0c0c0;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .siac-btn-icon:hover {
                background: rgba(255,255,255,0.1);
                color: #fff;
            }

            .siac-btn-icon.success:hover {
                background: rgba(34,197,94,0.2);
                color: #22c55e;
            }

            .siac-btn-link {
                background: none;
                border: none;
                color: #f59e0b;
                cursor: pointer;
                font-size: 0.875rem;
            }

            /* KPI Cards */
            .siac-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }

            .siac-kpi-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 12px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .siac-kpi-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
            }

            .siac-kpi-icon.remitos { background: rgba(59,130,246,0.2); color: #3b82f6; }
            .siac-kpi-icon.cta-cte { background: rgba(139,92,246,0.2); color: #8b5cf6; }
            .siac-kpi-icon.cobranzas { background: rgba(34,197,94,0.2); color: #22c55e; }
            .siac-kpi-icon.caja { background: rgba(245,158,11,0.2); color: #f59e0b; }

            .siac-kpi-value {
                font-size: 1.75rem;
                font-weight: 700;
            }

            .siac-kpi-label {
                color: #a0a0a0;
                font-size: 0.875rem;
            }

            .siac-kpi-footer {
                padding-top: 12px;
                border-top: 1px solid rgba(255,255,255,0.05);
                font-size: 0.8rem;
            }

            .siac-kpi-footer .pending { color: #f59e0b; }
            .siac-kpi-footer .danger { color: #ef4444; }
            .siac-kpi-footer .success { color: #22c55e; }

            /* Stats Row */
            .siac-stats-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 12px;
                margin-bottom: 24px;
            }

            .siac-stat-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 10px;
                padding: 16px;
                text-align: center;
            }

            .siac-stat-card.success { border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.1); }
            .siac-stat-card.danger { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.1); }
            .siac-stat-card.warning { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.1); }
            .siac-stat-card.info { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.1); }

            .siac-stat-value {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 4px;
            }

            .siac-stat-label {
                font-size: 0.75rem;
                color: #a0a0a0;
                text-transform: uppercase;
            }

            /* Section */
            .siac-section {
                margin-bottom: 24px;
            }

            .siac-section h3 {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
                font-size: 1.1rem;
            }

            .siac-section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            /* Quick Actions */
            .siac-quick-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
            }

            .siac-action-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                color: #fff;
                cursor: pointer;
                transition: all 0.2s;
            }

            .siac-action-btn:hover {
                background: rgba(255,255,255,0.1);
                border-color: rgba(245,158,11,0.5);
            }

            /* Alerts */
            .siac-alert {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 18px;
                border-radius: 10px;
                margin-bottom: 16px;
                font-size: 0.9rem;
            }

            .siac-alert-warning {
                background: rgba(245,158,11,0.1);
                border: 1px solid rgba(245,158,11,0.3);
                color: #f59e0b;
            }

            .siac-alert-danger {
                background: rgba(239,68,68,0.1);
                border: 1px solid rgba(239,68,68,0.3);
                color: #ef4444;
            }

            .siac-no-alerts {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 20px;
                color: #22c55e;
            }

            .siac-alerts-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            /* Tables */
            .siac-table-container {
                overflow-x: auto;
            }

            .siac-table {
                width: 100%;
                border-collapse: collapse;
            }

            .siac-table th,
            .siac-table td {
                padding: 12px 16px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }

            .siac-table th {
                background: rgba(255,255,255,0.03);
                font-weight: 500;
                color: #c0c0c0;
                font-size: 0.8rem;
                text-transform: uppercase;
            }

            .siac-table tr:hover {
                background: rgba(255,255,255,0.02);
            }

            .siac-table .siac-empty {
                text-align: center;
                color: #909090;
                padding: 40px;
            }

            .siac-row-warning {
                background: rgba(245,158,11,0.05);
            }

            .text-danger {
                color: #ef4444 !important;
            }

            /* Badges */
            .siac-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 500;
            }

            .siac-badge-success { background: rgba(34,197,94,0.2); color: #22c55e; }
            .siac-badge-warning { background: rgba(245,158,11,0.2); color: #f59e0b; }
            .siac-badge-danger { background: rgba(239,68,68,0.2); color: #ef4444; }
            .siac-badge-info { background: rgba(59,130,246,0.2); color: #3b82f6; }
            .siac-badge-secondary { background: rgba(255,255,255,0.1); color: #c0c0c0; }

            /* Filters */
            .siac-filters {
                display: flex;
                gap: 12px;
                margin-bottom: 16px;
            }

            .siac-filters select,
            .siac-filters input {
                padding: 10px 14px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                color: #fff;
                font-size: 0.9rem;
            }

            .siac-filters select:focus,
            .siac-filters input:focus {
                outline: none;
                border-color: #f59e0b;
            }

            /* Sub-tabs */
            .siac-subtabs {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding-bottom: 8px;
            }

            .siac-subtab {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                border: none;
                background: transparent;
                color: #a0a0a0;
                cursor: pointer;
                font-size: 0.875rem;
                border-bottom: 2px solid transparent;
                margin-bottom: -9px;
            }

            .siac-subtab:hover {
                color: #fff;
            }

            .siac-subtab.active {
                color: #f59e0b;
                border-bottom-color: #f59e0b;
            }

            /* Seguimiento Grid */
            .siac-seguimiento-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
            }

            .siac-seguimiento-section {
                background: rgba(255,255,255,0.02);
                border-radius: 10px;
                padding: 16px;
            }

            .siac-seguimiento-section.danger {
                border: 1px solid rgba(239,68,68,0.2);
            }

            .siac-seguimiento-section h4 {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                font-size: 0.95rem;
            }

            .siac-gestion-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .siac-gestion-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px;
                background: rgba(255,255,255,0.02);
                border-radius: 8px;
                margin-bottom: 8px;
            }

            .siac-gestion-item.warning {
                background: rgba(245,158,11,0.1);
            }

            .siac-gestion-date {
                font-size: 0.8rem;
                color: #a0a0a0;
                min-width: 80px;
            }

            .siac-gestion-info {
                flex: 1;
            }

            .siac-gestion-info strong {
                display: block;
                font-size: 0.9rem;
            }

            .siac-gestion-info span {
                font-size: 0.8rem;
                color: #a0a0a0;
            }

            .siac-empty-state {
                text-align: center;
                padding: 30px;
                color: #909090;
            }

            /* Aging Report */
            .siac-aging-report {
                background: rgba(255,255,255,0.02);
                border-radius: 10px;
                padding: 16px;
                margin-bottom: 24px;
            }

            .siac-aging-report h4 {
                margin-bottom: 16px;
                font-size: 0.95rem;
            }

            .siac-aging-bars {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .siac-aging-item {
                display: grid;
                grid-template-columns: 80px 1fr 100px;
                align-items: center;
                gap: 12px;
            }

            .siac-aging-label {
                font-size: 0.8rem;
                color: #b0b0b0;
            }

            .siac-aging-bar {
                height: 8px;
                border-radius: 4px;
                min-width: 4px;
            }

            .siac-aging-bar.success { background: #22c55e; }
            .siac-aging-bar.warning { background: #f59e0b; }
            .siac-aging-bar.orange { background: #f97316; }
            .siac-aging-bar.danger { background: #ef4444; }
            .siac-aging-bar.critical { background: #dc2626; }

            .siac-aging-value {
                text-align: right;
                font-size: 0.85rem;
                font-weight: 500;
            }

            /* Caja Cards */
            .siac-cajas-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                gap: 20px;
            }

            .siac-caja-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 12px;
                overflow: hidden;
            }

            .siac-caja-card.open {
                border-color: rgba(34,197,94,0.3);
            }

            .siac-caja-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                background: rgba(255,255,255,0.02);
            }

            .siac-caja-icon {
                width: 44px;
                height: 44px;
                background: rgba(245,158,11,0.2);
                color: #f59e0b;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.1rem;
            }

            .siac-caja-info {
                flex: 1;
            }

            .siac-caja-info h4 {
                margin: 0 0 4px 0;
                font-size: 1rem;
            }

            .siac-caja-pv {
                font-size: 0.75rem;
                color: #a0a0a0;
            }

            .siac-caja-status {
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.7rem;
                font-weight: 600;
            }

            .siac-caja-status.open {
                background: rgba(34,197,94,0.2);
                color: #22c55e;
            }

            .siac-caja-status.closed {
                background: rgba(255,255,255,0.1);
                color: #a0a0a0;
            }

            .siac-caja-details {
                padding: 16px;
            }

            .siac-caja-detail {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                font-size: 0.875rem;
            }

            .siac-caja-detail span {
                color: #a0a0a0;
            }

            .siac-caja-saldo {
                color: #22c55e !important;
                font-size: 1.1rem;
            }

            .siac-caja-actions {
                display: flex;
                gap: 8px;
                padding: 16px;
                background: rgba(255,255,255,0.02);
            }

            .siac-caja-actions .siac-btn {
                flex: 1;
                justify-content: center;
            }

            .siac-caja-closed-msg {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 40px;
                color: rgba(255,255,255,0.3);
            }

            .siac-caja-closed-msg i {
                font-size: 2rem;
            }

            /* Error */
            .siac-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 16px;
                padding: 60px;
                text-align: center;
            }

            .siac-error i {
                font-size: 3rem;
                color: #ef4444;
            }

            .siac-error h3 {
                margin: 0;
            }

            .siac-error p {
                color: #a0a0a0;
            }

            /* ============================================ */
            /* MODAL STYLES */
            /* ============================================ */
            .siac-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .siac-modal.active {
                opacity: 1;
                visibility: visible;
            }

            .siac-modal-content {
                background: #1a1f2e;
                border-radius: 16px;
                width: 90%;
                max-width: 900px;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                transform: scale(0.9);
                transition: transform 0.3s ease;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            }

            .siac-modal.active .siac-modal-content {
                transform: scale(1);
            }

            .siac-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                background: linear-gradient(135deg, #1e3a5f 0%, #2c5f8d 100%);
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .siac-modal-header h3 {
                margin: 0;
                font-size: 1.25rem;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .siac-modal-close {
                background: rgba(255,255,255,0.1);
                border: none;
                color: #fff;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.25rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }

            .siac-modal-close:hover {
                background: rgba(239,68,68,0.8);
            }

            .siac-modal-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .siac-modal-footer {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 12px;
                padding: 16px 24px;
                background: rgba(0,0,0,0.2);
                border-top: 1px solid rgba(255,255,255,0.05);
            }

            /* ============================================ */
            /* FORM STYLES */
            /* ============================================ */
            .siac-form-section {
                margin-bottom: 24px;
            }

            .siac-form-section h4 {
                margin: 0 0 16px 0;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                color: #4a9eff;
                font-size: 0.9rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .siac-form-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
            }

            .siac-form-grid.cols-2 {
                grid-template-columns: repeat(2, 1fr);
            }

            .siac-form-grid.cols-3 {
                grid-template-columns: repeat(3, 1fr);
            }

            .siac-form-grid.cols-4 {
                grid-template-columns: repeat(4, 1fr);
            }

            .siac-form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .siac-form-group.full-width {
                grid-column: 1 / -1;
            }

            .siac-form-group label {
                font-size: 0.8rem;
                color: #a0a0a0;
                font-weight: 500;
            }

            .siac-form-group label .required {
                color: #ef4444;
                margin-left: 2px;
            }

            .siac-form-group input,
            .siac-form-group select,
            .siac-form-group textarea {
                padding: 10px 12px;
                background: #151a23;
                border: 1px solid #3a4556;
                border-radius: 8px;
                color: #e8eaed;
                font-size: 0.9rem;
                transition: all 0.2s;
            }

            .siac-form-group input:focus,
            .siac-form-group select:focus,
            .siac-form-group textarea:focus {
                outline: none;
                border-color: #4a9eff;
                box-shadow: 0 0 0 3px rgba(74,158,255,0.1);
            }

            .siac-form-group input:disabled,
            .siac-form-group select:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .siac-form-group textarea {
                min-height: 80px;
                resize: vertical;
            }

            .siac-form-group .checkbox-wrapper {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 6px;
            }

            .siac-form-group .checkbox-wrapper input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: #4a9eff;
            }

            .siac-form-group .checkbox-wrapper label {
                margin: 0;
                cursor: pointer;
            }

            /* ============================================ */
            /* FACTURACION TAB STYLES */
            /* ============================================ */
            .siac-fact-container {
                padding: 20px;
            }

            .siac-fact-header {
                background: linear-gradient(135deg, #1e3a5f 0%, #2c5f8d 100%);
                color: #e8eaed;
                padding: 25px;
                border-radius: 12px;
                margin-bottom: 25px;
            }

            .siac-fact-header h2 {
                margin: 0;
                font-size: 1.5rem;
            }

            .siac-fact-header p {
                margin: 8px 0 0 0;
                opacity: 0.8;
            }

            .siac-fact-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 25px;
                overflow-x: auto;
            }

            .siac-fact-tab {
                flex: 1;
                min-width: 180px;
                padding: 15px 20px;
                border: 2px solid #2d3748;
                border-radius: 10px;
                cursor: pointer;
                background: #1a1f2e;
                color: #e8eaed;
                text-align: center;
                transition: all 0.3s;
            }

            .siac-fact-tab:hover {
                background: #242938;
            }

            .siac-fact-tab.active {
                border-color: #3dd56d;
                background: #242938;
                transform: scale(1.02);
            }

            .siac-fact-tab i {
                font-size: 1.5rem;
                display: block;
                margin-bottom: 8px;
            }

            .siac-fact-tab .label {
                font-weight: 600;
                display: block;
            }

            .siac-fact-tab .sublabel {
                font-size: 0.75rem;
                opacity: 0.7;
                margin-top: 4px;
            }

            .siac-mode-selector {
                display: flex;
                gap: 15px;
                margin-bottom: 25px;
            }

            .siac-mode-btn {
                flex: 1;
                padding: 20px;
                border: 2px solid #2d3748;
                border-radius: 12px;
                cursor: pointer;
                background: #151a23;
                color: #e8eaed;
                text-align: center;
                transition: all 0.3s;
            }

            .siac-mode-btn:hover {
                background: #1a1f2e;
            }

            .siac-mode-btn.active {
                transform: scale(1.03);
            }

            .siac-mode-btn.active.manual {
                border-color: #3dd56d;
            }

            .siac-mode-btn.active.ocasional {
                border-color: #22d3ee;
            }

            .siac-mode-btn.active.recurrente {
                border-color: #a855f7;
            }

            .siac-mode-btn i {
                font-size: 2rem;
                display: block;
                margin-bottom: 10px;
            }

            .siac-mode-btn .mode-title {
                font-weight: 600;
                margin-bottom: 4px;
            }

            .siac-mode-btn .mode-desc {
                font-size: 0.8rem;
                color: #9aa0a6;
            }

            .siac-fact-table {
                width: 100%;
                border-collapse: collapse;
            }

            .siac-fact-table th {
                padding: 12px;
                text-align: left;
                font-weight: 600;
                color: #9aa0a6;
                background: #151a23;
                border-bottom: 2px solid #2d3748;
            }

            .siac-fact-table td {
                padding: 12px;
                border-bottom: 1px solid #2d3748;
                color: #e8eaed;
            }

            .siac-fact-table tr:hover {
                background: #242938;
            }

            .siac-estado-badge {
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .siac-estado-badge.pendiente {
                background: rgba(245,158,11,0.2);
                color: #f59e0b;
            }

            .siac-estado-badge.aprobado {
                background: rgba(34,197,94,0.2);
                color: #22c55e;
            }

            .siac-estado-badge.rechazado {
                background: rgba(239,68,68,0.2);
                color: #ef4444;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .siac-form-grid {
                    grid-template-columns: 1fr;
                }

                .siac-form-grid.cols-2,
                .siac-form-grid.cols-3,
                .siac-form-grid.cols-4 {
                    grid-template-columns: 1fr;
                }

                .siac-modal-content {
                    width: 95%;
                    max-height: 95vh;
                }

                .siac-mode-selector {
                    flex-direction: column;
                }

                .siac-fact-tabs {
                    flex-direction: column;
                }
            }
        `;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SiacCommercialDashboard;
}

// =============================================================================
// GLOBAL FUNCTION FOR DYNAMIC LOADING
// =============================================================================

function showSiacCommercialDashboardContent() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error('mainContent not found');
        return;
    }

    // Get company ID from global state
    const companyId = window.currentCompany?.company_id || window.companyId || 11;

    mainContent.innerHTML = '<div id="siac-commercial-container"></div>';
    SiacCommercialDashboard.init(companyId);
}

// Log that the module is loaded
console.log('[SIAC-COMMERCIAL] Dashboard module loaded');
