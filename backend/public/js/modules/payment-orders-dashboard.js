/**
 * Payment Orders Dashboard Module
 * Dashboard OLAP con cubo de navegación para órdenes de pago
 * Incluye: Forecast financiero, Cartera de cheques, Workflow de autorización
 */

// ============================================================================
// PAYMENT ORDERS HELP SYSTEM - Sistema de Ayuda Contextual
// ============================================================================
if (typeof ModuleHelpSystem !== 'undefined') {
    ModuleHelpSystem.registerModule('payment-orders-dashboard', {
        moduleName: 'Órdenes de Pago',
        moduleDescription: 'Sistema de gestión de pagos con dashboard OLAP, cartera de cheques y workflow de autorización.',

        contexts: {
            dashboard: {
                title: 'Dashboard OLAP de Pagos',
                description: 'Vista multidimensional del estado de pagos con cubo de navegación interactivo.',
                tips: [
                    'El dashboard OLAP permite navegar por dimensiones: tiempo, proveedor, tipo de pago, estado',
                    'Use el breadcrumb para volver a niveles superiores del cubo',
                    'Los KPIs muestran resumen actual vs. proyectado (forecast financiero)',
                    'El cubo se actualiza automáticamente cada 5 minutos'
                ],
                warnings: [
                    'Los montos se muestran en la moneda base configurada en Finance'
                ],
                helpTopics: [
                    '¿Cómo funciona el cubo OLAP?',
                    '¿Qué es el forecast financiero?',
                    '¿Cómo filtro por proveedor o período?'
                ]
            },

            orders: {
                title: 'Órdenes de Pago',
                description: 'Listado completo de órdenes de pago con filtros y acciones masivas.',
                tips: [
                    'Estados: Borrador → Pendiente Aprobación → Aprobada → Programada → Pagada',
                    'Puede vincular múltiples facturas a una misma orden de pago',
                    'Integración con Finance: genera asiento al aprobar la orden',
                    'Exportar a archivo bancario (opcional, según configuración)'
                ],
                warnings: [
                    'Verifique datos bancarios del beneficiario antes de programar pago',
                    'Una vez aprobada, cambios requieren re-autorización'
                ],
                helpTopics: [
                    '¿Cómo creo una orden de pago desde una factura?',
                    '¿Puedo pagar varias facturas juntas?',
                    '¿Qué formatos de archivo bancario soporta?'
                ],
                fieldHelp: {
                    beneficiary: 'Proveedor o persona a quien se pagará',
                    payment_date: 'Fecha programada de pago (puede ser futura)',
                    payment_method: 'Transferencia, Cheque, Efectivo, etc.',
                    bank_account: 'Cuenta bancaria destino del beneficiario',
                    authorization_workflow: 'Flujo de aprobación según monto y configuración'
                }
            },

            pending: {
                title: 'Pendientes de Aprobación',
                description: 'Órdenes que requieren autorización según workflow configurado.',
                tips: [
                    'El workflow valida jerarquía, montos límite y sectores',
                    'Puede aprobar/rechazar en lote seleccionando múltiples órdenes',
                    'Las notificaciones se envían automáticamente a aprobadores',
                    'Historial de aprobaciones disponible en el detalle de cada orden'
                ],
                warnings: [
                    'Revise adjuntos (facturas, remitos) antes de aprobar',
                    'Valide que el beneficiario y monto sean correctos'
                ],
                helpTopics: [
                    '¿Quiénes son los aprobadores en mi empresa?',
                    '¿Puedo delegar mi aprobación?',
                    '¿Qué hago si una orden tiene montos incorrectos?'
                ]
            },

            checks: {
                title: 'Cartera de Cheques',
                description: 'Gestión de cheques emitidos, recibidos y posdatados.',
                tips: [
                    'Estados de cheques: Emitido → Entregado → Cobrado / Rechazado',
                    'Cheques propios: emitidos por la empresa (pago a proveedores)',
                    'Cheques de terceros: recibidos de clientes (pueden re-endosarse)',
                    'Alertas de vencimiento: notifica 3 días antes del vencimiento',
                    'Integración bancaria: concilia cheques cobrados automáticamente'
                ],
                warnings: [
                    'Verifique saldo en cuenta antes de emitir cheques',
                    'Cheques rechazados generan multas bancarias',
                    'Mantenga actualizado el estado de cheques de terceros'
                ],
                helpTopics: [
                    '¿Cómo registro un cheque recibido de un cliente?',
                    '¿Puedo endosar un cheque de terceros?',
                    '¿Cómo doy de baja un cheque extraviado?',
                    '¿Qué es un cheque posdatado?'
                ],
                fieldHelp: {
                    check_number: 'Número de cheque (según chequera)',
                    issue_date: 'Fecha de emisión del cheque',
                    payment_date: 'Fecha de pago/cobro (puede ser posdatada)',
                    bank: 'Banco emisor del cheque',
                    account_number: 'Cuenta corriente de origen',
                    payee: 'Beneficiario del cheque (a la orden de)'
                }
            },

            checkbooks: {
                title: 'Gestión de Chequeras',
                description: 'Control de chequeras físicas y numeración de cheques.',
                tips: [
                    'Registre cada chequera con rango de números de cheques',
                    'El sistema valida que no se use un número de cheque duplicado',
                    'Marque cheques como anulados si comete error al emitirlos',
                    'Cuando se agota una chequera, marque como Finalizada',
                    'Puede tener múltiples chequeras activas de diferentes cuentas'
                ],
                warnings: [
                    'Guarde las chequeras en lugar seguro',
                    'Informe al banco cheques extraviados inmediatamente',
                    'Verifique que el rango de cheques coincida con el banco'
                ],
                helpTopics: [
                    '¿Cómo registro una chequera nueva?',
                    '¿Qué hago si pierdo una chequera?',
                    '¿Puedo anular un cheque ya emitido?'
                ],
                fieldHelp: {
                    checkbook_number: 'Número de chequera (según banco)',
                    start_number: 'Primer número de cheque de la chequera',
                    end_number: 'Último número de cheque de la chequera',
                    bank_account_id: 'Cuenta corriente asociada',
                    status: 'Activa, Finalizada, Anulada'
                }
            }
        },

        fallbackResponses: {
            olap: 'OLAP (Online Analytical Processing) es un cubo multidimensional que permite analizar datos desde diferentes perspectivas. En Órdenes de Pago, puede navegar por tiempo, proveedor, tipo de pago y estado.',
            forecast: 'El forecast financiero proyecta pagos futuros basándose en órdenes programadas, términos de pago de facturas pendientes y patrones históricos.',
            workflow: 'El workflow de autorización define quién debe aprobar una orden según monto, sector y jerarquía. Se configura en Configuración → Aprobaciones.',
            cheque: 'Un cheque es un documento de pago que ordena al banco transferir fondos. Puede ser "al día" (cobro inmediato) o "diferido/posdatado" (cobro en fecha futura).',
            endoso: 'Endosar un cheque de terceros significa transferirlo a otro beneficiario (firmando al dorso). Solo cheques "a la orden" pueden endosarse.',
            conciliacion: 'La conciliación bancaria compara los registros de cheques emitidos con los efectivamente cobrados por el banco, detectando diferencias.'
        }
    });
}

const PaymentOrdersDashboard = {
    name: 'payment-orders-dashboard',
    currentTab: 'dashboard',
    companyId: null,
    cubeState: {
        breadcrumb: [],
        currentLevel: 'month',
        filters: {}
    },
    charts: {},

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    async init(container, context = {}) {
        console.log('💰 [PaymentOrders] Inicializando módulo');
        this.container = container;
        this.companyId = context.company_id || window.currentCompanyId;

        this.render();
        await this.loadDashboardData();

        // Inicializar sistema de ayuda contextual
        if (typeof ModuleHelpSystem !== 'undefined') {
            ModuleHelpSystem.init('payment-orders-dashboard', {
                initialContext: this.currentTab
            });
        }
    },

    render() {
        this.container.innerHTML = `
            <div class="payment-orders-module dark-theme">
                <!-- Header con KPIs rápidos -->
                <div class="module-header">
                    <div class="header-title">
                        <h2><i class="fas fa-file-invoice-dollar"></i> Órdenes de Pago</h2>
                        <span class="subtitle">Gestión de pagos y cartera de cheques</span>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="PaymentOrdersDashboard.showCreateOrderModal()">
                            <i class="fas fa-plus"></i> Nueva Orden
                        </button>
                        <button class="btn btn-secondary" onclick="PaymentOrdersDashboard.refreshCube()">
                            <i class="fas fa-sync"></i> Actualizar Cubo
                        </button>
                    </div>
                </div>

                <!-- Tabs de navegación -->
                <div class="module-tabs">
                    <button class="tab-btn active" data-tab="dashboard" onclick="PaymentOrdersDashboard.switchTab('dashboard')">
                        <i class="fas fa-chart-pie"></i> Dashboard OLAP
                    </button>
                    <button class="tab-btn" data-tab="orders" onclick="PaymentOrdersDashboard.switchTab('orders')">
                        <i class="fas fa-list"></i> Órdenes de Pago
                    </button>
                    <button class="tab-btn" data-tab="pending" onclick="PaymentOrdersDashboard.switchTab('pending')">
                        <i class="fas fa-clock"></i> Pendientes
                        <span class="badge pending-badge" id="pending-count">0</span>
                    </button>
                    <button class="tab-btn" data-tab="checks" onclick="PaymentOrdersDashboard.switchTab('checks')">
                        <i class="fas fa-money-check"></i> Cartera de Cheques
                    </button>
                    <button class="tab-btn" data-tab="checkbooks" onclick="PaymentOrdersDashboard.switchTab('checkbooks')">
                        <i class="fas fa-book"></i> Chequeras
                    </button>
                </div>

                <!-- Contenido dinámico -->
                <div class="module-content" id="payment-orders-content">
                    <!-- Se carga dinámicamente -->
                </div>
            </div>

            <style>
                .payment-orders-module {
                    padding: 20px;
                    background: #1a1a2e;
                    min-height: 100%;
                    color: #e4e4e4;
                }

                .payment-orders-module.dark-theme {
                    --bg-primary: #1a1a2e;
                    --bg-secondary: #16213e;
                    --bg-card: #0f3460;
                    --text-primary: #e4e4e4;
                    --text-muted: #8892b0;
                    --accent: #00d9ff;
                    --success: #00d9ff;
                    --warning: #ffc107;
                    --danger: #ff4757;
                    --border: #2d3748;
                }

                .module-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border);
                }

                .header-title h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    color: var(--text-primary);
                }

                .header-title .subtitle {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }

                .header-actions {
                    display: flex;
                    gap: 10px;
                }

                .module-tabs {
                    display: flex;
                    gap: 5px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--border);
                    padding-bottom: 10px;
                }

                .tab-btn {
                    padding: 10px 20px;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    border-radius: 8px 8px 0 0;
                    transition: all 0.3s;
                    position: relative;
                }

                .tab-btn:hover {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }

                .tab-btn.active {
                    background: var(--bg-card);
                    color: var(--accent);
                    border-bottom: 2px solid var(--accent);
                }

                .tab-btn .badge {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: var(--danger);
                    color: white;
                    font-size: 0.7rem;
                    padding: 2px 6px;
                    border-radius: 10px;
                }

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.3s;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-primary {
                    background: var(--accent);
                    color: #1a1a2e;
                }

                .btn-primary:hover {
                    background: #00b8d4;
                    transform: translateY(-2px);
                }

                .btn-secondary {
                    background: var(--bg-card);
                    color: var(--text-primary);
                    border: 1px solid var(--border);
                }

                .btn-secondary:hover {
                    background: var(--bg-secondary);
                }

                .btn-sm {
                    padding: 6px 12px;
                    font-size: 0.85rem;
                }

                .btn-danger {
                    background: var(--danger);
                    color: white;
                }

                .btn-success {
                    background: var(--success);
                    color: #1a1a2e;
                }

                .btn-warning {
                    background: var(--warning);
                    color: #1a1a2e;
                }

                /* KPI Cards */
                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin-bottom: 25px;
                }

                .kpi-card {
                    background: var(--bg-card);
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                }

                .kpi-card .kpi-label {
                    display: block;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    margin-bottom: 8px;
                }

                .kpi-card .kpi-value {
                    display: block;
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: var(--accent);
                }

                .kpi-card .kpi-trend {
                    display: block;
                    font-size: 0.8rem;
                    margin-top: 5px;
                }

                .kpi-card .kpi-trend.positive {
                    color: var(--success);
                }

                .kpi-card .kpi-trend.negative {
                    color: var(--danger);
                }

                /* Cubo OLAP */
                .olap-cube {
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .cube-breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                    flex-wrap: wrap;
                }

                .breadcrumb-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    background: var(--bg-card);
                    padding: 5px 12px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .breadcrumb-item:hover {
                    background: var(--accent);
                    color: #1a1a2e;
                }

                .breadcrumb-item i {
                    font-size: 0.7rem;
                }

                .breadcrumb-home {
                    background: var(--accent);
                    color: #1a1a2e;
                }

                .cube-filters {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }

                .cube-filters select,
                .cube-filters input {
                    padding: 8px 12px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-primary);
                }

                .cube-data-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .cube-data-table th,
                .cube-data-table td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid var(--border);
                }

                .cube-data-table th {
                    background: var(--bg-card);
                    color: var(--text-muted);
                    font-weight: 500;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                }

                .cube-data-table tr:hover {
                    background: rgba(0, 217, 255, 0.1);
                }

                .cube-data-table .drilldown-btn {
                    background: transparent;
                    border: none;
                    color: var(--accent);
                    cursor: pointer;
                    padding: 5px;
                }

                .cube-data-table .drilldown-btn:hover {
                    color: var(--text-primary);
                }

                /* Timeline */
                .payment-timeline {
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    padding: 20px;
                    margin-top: 20px;
                }

                .timeline-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .timeline-chart {
                    height: 200px;
                    display: flex;
                    align-items: flex-end;
                    gap: 4px;
                }

                .timeline-bar {
                    flex: 1;
                    background: var(--accent);
                    min-height: 2px;
                    border-radius: 4px 4px 0 0;
                    transition: all 0.3s;
                    cursor: pointer;
                    position: relative;
                }

                .timeline-bar:hover {
                    background: #00b8d4;
                }

                .timeline-bar[data-has-payments="false"] {
                    background: var(--bg-card);
                }

                .timeline-bar .tooltip {
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--bg-card);
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s;
                }

                .timeline-bar:hover .tooltip {
                    opacity: 1;
                }

                /* Orders Table */
                .orders-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .orders-table th,
                .orders-table td {
                    padding: 15px;
                    text-align: left;
                    border-bottom: 1px solid var(--border);
                }

                .orders-table th {
                    background: var(--bg-card);
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .orders-table tr:hover {
                    background: rgba(0, 217, 255, 0.05);
                }

                .status-badge {
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }

                .status-draft {
                    background: var(--bg-card);
                    color: var(--text-muted);
                }

                .status-pending_approval {
                    background: rgba(255, 193, 7, 0.2);
                    color: var(--warning);
                }

                .status-approved {
                    background: rgba(0, 217, 255, 0.2);
                    color: var(--accent);
                }

                .status-scheduled {
                    background: rgba(0, 217, 255, 0.3);
                    color: var(--accent);
                }

                .status-executed {
                    background: rgba(0, 217, 255, 0.4);
                    color: var(--success);
                }

                .status-cancelled {
                    background: rgba(255, 71, 87, 0.2);
                    color: var(--danger);
                }

                /* Check cards */
                .check-card {
                    background: var(--bg-card);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid var(--border);
                    margin-bottom: 15px;
                }

                .check-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .check-number {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: var(--accent);
                }

                .check-beneficiary {
                    color: var(--text-primary);
                }

                .check-amount {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .check-date {
                    color: var(--text-muted);
                    font-size: 0.85rem;
                }

                /* Alerts */
                .alert-card {
                    padding: 15px 20px;
                    border-radius: 10px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .alert-card.danger {
                    background: rgba(255, 71, 87, 0.15);
                    border-left: 4px solid var(--danger);
                }

                .alert-card.warning {
                    background: rgba(255, 193, 7, 0.15);
                    border-left: 4px solid var(--warning);
                }

                .alert-card.info {
                    background: rgba(0, 217, 255, 0.15);
                    border-left: 4px solid var(--accent);
                }

                .alert-icon {
                    font-size: 1.5rem;
                }

                .alert-content {
                    flex: 1;
                }

                .alert-title {
                    font-weight: 600;
                    margin-bottom: 3px;
                }

                .alert-message {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }

                /* Loading */
                .loading-spinner {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 40px;
                }

                .loading-spinner::after {
                    content: '';
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--border);
                    border-top-color: var(--accent);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                }

                .modal-content {
                    background: var(--bg-secondary);
                    border-radius: 16px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                    border: 1px solid var(--border);
                }

                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                }

                .modal-close {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 1.5rem;
                    cursor: pointer;
                }

                .modal-body {
                    padding: 20px;
                }

                .modal-footer {
                    padding: 20px;
                    border-top: 1px solid var(--border);
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                /* Forms */
                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                }

                .form-control {
                    width: 100%;
                    padding: 12px 15px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-primary);
                    font-size: 1rem;
                }

                .form-control:focus {
                    outline: none;
                    border-color: var(--accent);
                }

                .form-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }

                /* Maturity analysis */
                .maturity-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 10px;
                    margin-top: 20px;
                }

                .maturity-card {
                    background: var(--bg-card);
                    padding: 15px;
                    border-radius: 10px;
                    text-align: center;
                }

                .maturity-card.overdue {
                    border-left: 3px solid var(--danger);
                }

                .maturity-card.this-week {
                    border-left: 3px solid var(--warning);
                }

                .maturity-card.next-week {
                    border-left: 3px solid var(--accent);
                }

                .maturity-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    margin-bottom: 5px;
                }

                .maturity-count {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .maturity-amount {
                    font-size: 0.85rem;
                    color: var(--accent);
                }

                /* Empty state */
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--text-muted);
                }

                .empty-state i {
                    font-size: 4rem;
                    margin-bottom: 20px;
                    opacity: 0.3;
                }

                .empty-state h4 {
                    margin-bottom: 10px;
                    color: var(--text-primary);
                }
            </style>
        `;

        this.renderTabContent('dashboard');
    },

    // ==========================================
    // TABS
    // ==========================================

    switchTab(tab) {
        this.currentTab = tab;

        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Actualizar contexto de ayuda
        if (typeof ModuleHelpSystem !== 'undefined') {
            ModuleHelpSystem.setContext(tab);
        }

        this.renderTabContent(tab);
    },

    renderTabContent(tab) {
        const content = document.getElementById('payment-orders-content');

        switch (tab) {
            case 'dashboard':
                this.renderDashboard(content);
                break;
            case 'orders':
                this.renderOrdersList(content);
                break;
            case 'pending':
                this.renderPendingApproval(content);
                break;
            case 'checks':
                this.renderChecksPortfolio(content);
                break;
            case 'checkbooks':
                this.renderCheckbooks(content);
                break;
            default:
                content.innerHTML = '<div class="loading-spinner"></div>';
        }
    },

    // ==========================================
    // DASHBOARD OLAP
    // ==========================================

    async renderDashboard(container) {
        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const [kpis, cubeData, timeline] = await Promise.all([
                this.fetchKPIs(),
                this.fetchCubeData(),
                this.fetchTimeline()
            ]);

            // Renderizar banner de ayuda contextual
            const helpBanner = typeof ModuleHelpSystem !== 'undefined'
                ? ModuleHelpSystem.renderBanner('dashboard')
                : '';

            container.innerHTML = `
                ${helpBanner}
                <!-- KPIs -->
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <span class="kpi-label">Total Comprometido</span>
                        <span class="kpi-value">${this.formatCurrency(kpis.total_committed)}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Vence esta Semana</span>
                        <span class="kpi-value">${this.formatCurrency(kpis.due_this_week)}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Vence este Mes</span>
                        <span class="kpi-value">${this.formatCurrency(kpis.due_this_month)}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Pendientes Aprobación</span>
                        <span class="kpi-value">${kpis.pending_approval_count}</span>
                        <span class="kpi-trend">${this.formatCurrency(kpis.pending_approval_amount)}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Cheques en Cartera</span>
                        <span class="kpi-value">${kpis.checks_portfolio_count}</span>
                        <span class="kpi-trend">${this.formatCurrency(kpis.checks_portfolio_amount)}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Proveedores con Deuda</span>
                        <span class="kpi-value">${kpis.overdue_suppliers || 0}</span>
                    </div>
                </div>

                <!-- Cubo OLAP -->
                <div class="olap-cube">
                    <h3><i class="fas fa-cube"></i> Cubo de Previsión Financiera</h3>

                    <!-- Breadcrumb -->
                    <div class="cube-breadcrumb" id="cube-breadcrumb">
                        <span class="breadcrumb-item breadcrumb-home" onclick="PaymentOrdersDashboard.resetCube()">
                            <i class="fas fa-home"></i> Inicio
                        </span>
                    </div>

                    <!-- Filtros -->
                    <div class="cube-filters">
                        <select id="cube-groupby" onchange="PaymentOrdersDashboard.changeGroupBy(this.value)">
                            <option value="month" selected>Por Mes</option>
                            <option value="week">Por Semana</option>
                            <option value="day">Por Día</option>
                            <option value="supplier">Por Proveedor</option>
                            <option value="category">Por Categoría</option>
                            <option value="purchase_type">Por Tipo de Compra</option>
                            <option value="branch">Por Sucursal</option>
                            <option value="cost_center">Por Centro de Costo</option>
                        </select>
                        <input type="date" id="cube-date-from" onchange="PaymentOrdersDashboard.applyFilters()">
                        <input type="date" id="cube-date-to" onchange="PaymentOrdersDashboard.applyFilters()">
                    </div>

                    <!-- Datos del cubo -->
                    <div id="cube-content">
                        ${this.renderCubeTable(cubeData)}
                    </div>

                    <!-- Totales -->
                    <div class="cube-totals" style="margin-top: 15px; padding: 15px; background: var(--bg-card); border-radius: 8px;">
                        <strong>Totales:</strong>
                        Órdenes: ${cubeData.totals?.order_count || 0} |
                        Facturas: ${cubeData.totals?.invoice_count || 0} |
                        Bruto: ${this.formatCurrency(cubeData.totals?.gross_amount || 0)} |
                        Retenciones: ${this.formatCurrency(cubeData.totals?.total_retentions || 0)} |
                        <strong style="color: var(--accent)">Neto: ${this.formatCurrency(cubeData.totals?.net_amount || 0)}</strong>
                    </div>
                </div>

                <!-- Timeline de pagos -->
                <div class="payment-timeline">
                    <div class="timeline-header">
                        <h3><i class="fas fa-calendar-alt"></i> Timeline de Pagos (próximos 30 días)</h3>
                    </div>
                    <div class="timeline-chart" id="payment-timeline-chart">
                        ${this.renderTimeline(timeline)}
                    </div>
                </div>
            `;

            // Update pending badge
            document.getElementById('pending-count').textContent = kpis.pending_approval_count || 0;

        } catch (error) {
            console.error('❌ Error cargando dashboard:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error cargando dashboard</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="PaymentOrdersDashboard.loadDashboardData()">
                        Reintentar
                    </button>
                </div>
            `;
        }
    },

    renderCubeTable(cubeData) {
        if (!cubeData.data || cubeData.data.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h4>Sin datos</h4>
                    <p>No hay datos de pagos para los filtros seleccionados</p>
                </div>
            `;
        }

        return `
            <table class="cube-data-table">
                <thead>
                    <tr>
                        <th>Período/Dimensión</th>
                        <th>Órdenes</th>
                        <th>Facturas</th>
                        <th>Monto Bruto</th>
                        <th>Retenciones</th>
                        <th>Monto Neto</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${cubeData.data.map(row => {
                        const retPercent = row.gross_amount > 0 ? ((row.total_retentions / row.gross_amount) * 100).toFixed(1) : 0;
                        const retColor = retPercent > 5 ? '#e74c3c' : retPercent > 2 ? '#f39c12' : '#27ae60';
                        return `
                        <tr>
                            <td><strong>${row.label || 'N/A'}</strong></td>
                            <td>${row.order_count || 0}</td>
                            <td>${row.invoice_count || 0}</td>
                            <td>${this.formatCurrency(row.gross_amount)}</td>
                            <td title="Retención: ${retPercent}% del bruto" style="cursor:help">
                                <span style="color:${retColor}">${this.formatCurrency(row.total_retentions)}</span>
                                <small style="color:#888;margin-left:4px">(${retPercent}%)</small>
                            </td>
                            <td><strong>${this.formatCurrency(row.net_amount)}</strong></td>
                            <td>
                                <button class="drilldown-btn" onclick="PaymentOrdersDashboard.drillDown('${cubeData.groupBy}', '${row.label}')">
                                    <i class="fas fa-search-plus"></i>
                                </button>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;
    },

    renderTimeline(timeline) {
        if (!timeline || timeline.length === 0) {
            return '<p style="text-align: center; color: var(--text-muted)">Sin datos de timeline</p>';
        }

        const maxAmount = Math.max(...timeline.map(t => t.total || 0), 1);

        return timeline.map(day => {
            const height = Math.max((day.total / maxAmount) * 180, 2);
            const hasPayments = day.total > 0;

            return `
                <div class="timeline-bar"
                     style="height: ${height}px"
                     data-has-payments="${hasPayments}"
                     title="${day.date}: ${this.formatCurrency(day.total)}">
                    <div class="tooltip">
                        <strong>${this.formatDate(day.date)}</strong><br>
                        ${this.formatCurrency(day.total)}<br>
                        ${day.orders || 0} pagos
                    </div>
                </div>
            `;
        }).join('');
    },

    // ==========================================
    // LISTA DE ÓRDENES
    // ==========================================

    async renderOrdersList(container) {
        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const orders = await this.fetchOrders();

            // Renderizar banner de ayuda contextual
            const helpBanner = typeof ModuleHelpSystem !== 'undefined'
                ? ModuleHelpSystem.renderBanner('orders')
                : '';

            container.innerHTML = `
                ${helpBanner}
                <div class="orders-header" style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div class="orders-filters">
                        <select id="orders-status-filter" onchange="PaymentOrdersDashboard.filterOrders()">
                            <option value="">Todos los estados</option>
                            <option value="draft">Borrador</option>
                            <option value="pending_approval">Pendiente Aprobación</option>
                            <option value="approved">Aprobada</option>
                            <option value="scheduled">Programada</option>
                            <option value="executed">Ejecutada</option>
                            <option value="cancelled">Cancelada</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="PaymentOrdersDashboard.showCreateOrderModal()">
                        <i class="fas fa-plus"></i> Nueva Orden
                    </button>
                </div>

                ${orders.data && orders.data.length > 0 ? `
                    <table class="orders-table">
                        <thead>
                            <tr>
                                <th>Nro. Orden</th>
                                <th>Fecha</th>
                                <th>Proveedor</th>
                                <th>Bruto</th>
                                <th>Ret.</th>
                                <th>Neto</th>
                                <th>F. Pago</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.data.map(order => {
                                const retTooltip = this.getRetentionTooltip(order.retentions_detail, order.total_retentions);
                                const hasRet = (order.total_retentions || 0) > 0;
                                return `
                                <tr>
                                    <td><strong>${order.order_number}</strong></td>
                                    <td>${this.formatDate(order.order_date)}</td>
                                    <td>${order.supplier?.name || order.supplier_name || 'N/A'}</td>
                                    <td>${this.formatCurrency(order.gross_amount || order.total_amount)}</td>
                                    <td title="${retTooltip}" style="cursor:${hasRet ? 'help' : 'default'}">
                                        ${hasRet ? `<span style="color:#e67e22">${this.formatCurrency(order.total_retentions)}</span>` : '-'}
                                    </td>
                                    <td><strong style="color:var(--accent)">${this.formatCurrency(order.net_payment_amount)}</strong></td>
                                    <td>${order.scheduled_payment_date ? this.formatDate(order.scheduled_payment_date) : '-'}</td>
                                    <td><span class="status-badge status-${order.status}">${this.getStatusLabel(order.status)}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick="PaymentOrdersDashboard.viewOrder(${order.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${order.status === 'draft' ? `
                                            <button class="btn btn-sm btn-primary" onclick="PaymentOrdersDashboard.submitOrder(${order.id})">
                                                <i class="fas fa-paper-plane"></i>
                                            </button>
                                        ` : ''}
                                        ${order.status === 'pending_approval' ? `
                                            <button class="btn btn-sm btn-success" onclick="PaymentOrdersDashboard.approveOrder(${order.id})">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `; }).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <h4>Sin órdenes de pago</h4>
                        <p>No hay órdenes de pago registradas</p>
                        <button class="btn btn-primary" onclick="PaymentOrdersDashboard.showCreateOrderModal()">
                            <i class="fas fa-plus"></i> Crear primera orden
                        </button>
                    </div>
                `}
            `;

        } catch (error) {
            console.error('❌ Error cargando órdenes:', error);
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>Error: ${error.message}</h4></div>`;
        }
    },

    // ==========================================
    // PENDIENTES DE APROBACIÓN
    // ==========================================

    async renderPendingApproval(container) {
        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const pending = await this.fetchPendingApproval();

            // Renderizar banner de ayuda contextual
            const helpBanner = typeof ModuleHelpSystem !== 'undefined'
                ? ModuleHelpSystem.renderBanner('pending')
                : '';

            container.innerHTML = `
                ${helpBanner}
                <h3 style="margin-bottom: 20px;"><i class="fas fa-clock"></i> Órdenes Pendientes de Aprobación</h3>

                ${pending.data && pending.data.length > 0 ? `
                    <div class="pending-grid">
                        ${pending.data.map(order => `
                            <div class="check-card">
                                <div class="check-card-header">
                                    <span class="check-number">${order.order_number}</span>
                                    <span class="status-badge status-pending_approval">Pendiente</span>
                                </div>
                                <div class="check-beneficiary">${order.supplier?.name || order.supplier_name}</div>
                                <div class="check-amount">${this.formatCurrency(order.net_payment_amount)}</div>
                                <div class="check-date">
                                    Nivel requerido: <strong>${order.authorization_level}</strong>
                                </div>
                                <div style="margin-top: 15px; display: flex; gap: 10px;">
                                    <button class="btn btn-success btn-sm" onclick="PaymentOrdersDashboard.approveOrder(${order.id})">
                                        <i class="fas fa-check"></i> Aprobar
                                    </button>
                                    <button class="btn btn-secondary btn-sm" onclick="PaymentOrdersDashboard.viewOrder(${order.id})">
                                        <i class="fas fa-eye"></i> Ver
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <h4>Sin pendientes</h4>
                        <p>No hay órdenes pendientes de aprobación</p>
                    </div>
                `}
            `;

        } catch (error) {
            console.error('❌ Error cargando pendientes:', error);
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>Error: ${error.message}</h4></div>`;
        }
    },

    // ==========================================
    // CARTERA DE CHEQUES
    // ==========================================

    async renderChecksPortfolio(container) {
        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const dashboard = await this.fetchChecksDashboard();

            // Renderizar banner de ayuda contextual
            const helpBanner = typeof ModuleHelpSystem !== 'undefined'
                ? ModuleHelpSystem.renderBanner('checks')
                : '';

            container.innerHTML = `
                ${helpBanner}
                <!-- Alertas -->
                ${dashboard.alerts && dashboard.alerts.length > 0 ? `
                    <div class="alerts-section" style="margin-bottom: 20px;">
                        ${dashboard.alerts.map(alert => `
                            <div class="alert-card ${alert.type}">
                                <i class="alert-icon fas fa-${alert.type === 'danger' ? 'exclamation-circle' : alert.type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                                <div class="alert-content">
                                    <div class="alert-title">${alert.title}</div>
                                    <div class="alert-message">${alert.message}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Stats -->
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <span class="kpi-label">Cheques Emitidos</span>
                        <span class="kpi-value">${dashboard.stats?.issued || 0}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Entregados</span>
                        <span class="kpi-value">${dashboard.stats?.delivered || 0}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Cobrados</span>
                        <span class="kpi-value">${dashboard.stats?.cashed || 0}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Rebotados</span>
                        <span class="kpi-value" style="color: var(--danger)">${dashboard.stats?.bounced || 0}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Total Pendiente</span>
                        <span class="kpi-value">${this.formatCurrency(dashboard.stats?.total_pending_amount || 0)}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Tasa de Rechazo</span>
                        <span class="kpi-value">${dashboard.stats?.bounce_rate || 0}%</span>
                    </div>
                </div>

                <!-- Análisis de vencimientos -->
                <h4 style="margin: 20px 0 10px;"><i class="fas fa-calendar-check"></i> Vencimientos</h4>
                <div class="maturity-grid">
                    <div class="maturity-card overdue">
                        <div class="maturity-label">Vencidos</div>
                        <div class="maturity-count">${dashboard.maturityAnalysis?.overdue?.count || 0}</div>
                        <div class="maturity-amount">${this.formatCurrency(dashboard.maturityAnalysis?.overdue?.amount || 0)}</div>
                    </div>
                    <div class="maturity-card this-week">
                        <div class="maturity-label">Esta Semana</div>
                        <div class="maturity-count">${dashboard.maturityAnalysis?.this_week?.count || 0}</div>
                        <div class="maturity-amount">${this.formatCurrency(dashboard.maturityAnalysis?.this_week?.amount || 0)}</div>
                    </div>
                    <div class="maturity-card next-week">
                        <div class="maturity-label">Próxima Semana</div>
                        <div class="maturity-count">${dashboard.maturityAnalysis?.next_week?.count || 0}</div>
                        <div class="maturity-amount">${this.formatCurrency(dashboard.maturityAnalysis?.next_week?.amount || 0)}</div>
                    </div>
                    <div class="maturity-card">
                        <div class="maturity-label">Este Mes</div>
                        <div class="maturity-count">${dashboard.maturityAnalysis?.this_month?.count || 0}</div>
                        <div class="maturity-amount">${this.formatCurrency(dashboard.maturityAnalysis?.this_month?.amount || 0)}</div>
                    </div>
                    <div class="maturity-card">
                        <div class="maturity-label">Posterior</div>
                        <div class="maturity-count">${dashboard.maturityAnalysis?.later?.count || 0}</div>
                        <div class="maturity-amount">${this.formatCurrency(dashboard.maturityAnalysis?.later?.amount || 0)}</div>
                    </div>
                </div>

                <!-- Próximos cheques -->
                <h4 style="margin: 20px 0 10px;"><i class="fas fa-clock"></i> Próximos a Vencer</h4>
                ${dashboard.upcomingChecks && dashboard.upcomingChecks.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                        ${dashboard.upcomingChecks.map(check => `
                            <div class="check-card">
                                <div class="check-card-header">
                                    <span class="check-number">Cheque #${check.check_number}</span>
                                    <span class="status-badge status-${check.status}">${check.status}</span>
                                </div>
                                <div class="check-beneficiary">${check.beneficiary_name}</div>
                                <div class="check-amount">${this.formatCurrency(check.amount)}</div>
                                <div class="check-date">Vence: ${this.formatDate(check.payment_date)}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p style="color: var(--text-muted)">No hay cheques próximos a vencer</p>
                `}
            `;

        } catch (error) {
            console.error('❌ Error cargando cartera:', error);
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>Error: ${error.message}</h4></div>`;
        }
    },

    // ==========================================
    // CHEQUERAS
    // ==========================================

    async renderCheckbooks(container) {
        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const [checkbooks, stats] = await Promise.all([
                this.fetchCheckbooks(),
                this.fetchCheckbooksStats()
            ]);

            // Renderizar banner de ayuda contextual
            const helpBanner = typeof ModuleHelpSystem !== 'undefined'
                ? ModuleHelpSystem.renderBanner('checkbooks')
                : '';

            container.innerHTML = `
                ${helpBanner}
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <h3><i class="fas fa-book"></i> Gestión de Chequeras</h3>
                    <button class="btn btn-primary" onclick="PaymentOrdersDashboard.showCreateCheckbookModal()">
                        <i class="fas fa-plus"></i> Nueva Chequera
                    </button>
                </div>

                <!-- Stats -->
                <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr);">
                    <div class="kpi-card">
                        <span class="kpi-label">Chequeras Activas</span>
                        <span class="kpi-value">${stats.active_checkbooks || 0}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Agotadas</span>
                        <span class="kpi-value">${stats.exhausted_checkbooks || 0}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Cheques Disponibles</span>
                        <span class="kpi-value">${stats.total_checks_available || 0}</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-label">Cheques Usados</span>
                        <span class="kpi-value">${stats.total_checks_used || 0}</span>
                    </div>
                </div>

                <!-- Lista de chequeras -->
                ${checkbooks.data && checkbooks.data.length > 0 ? `
                    <table class="orders-table" style="margin-top: 20px;">
                        <thead>
                            <tr>
                                <th>Nro. Chequera</th>
                                <th>Banco</th>
                                <th>Cuenta</th>
                                <th>Rango</th>
                                <th>Disponibles</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${checkbooks.data.map(cb => `
                                <tr>
                                    <td><strong>${cb.checkbook_number}</strong></td>
                                    <td>${cb.bank_name || '-'}</td>
                                    <td>${cb.account_number || '-'}</td>
                                    <td>${cb.first_check_number} - ${cb.last_check_number}</td>
                                    <td>
                                        <strong>${cb.checks_available}</strong> / ${cb.checks_total}
                                        <div style="height: 4px; background: var(--bg-card); border-radius: 2px; margin-top: 5px;">
                                            <div style="height: 100%; width: ${(cb.checks_available / cb.checks_total) * 100}%; background: var(--accent); border-radius: 2px;"></div>
                                        </div>
                                    </td>
                                    <td><span class="status-badge status-${cb.status === 'active' ? 'approved' : 'cancelled'}">${cb.status}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick="PaymentOrdersDashboard.viewCheckbook(${cb.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-book"></i>
                        <h4>Sin chequeras</h4>
                        <p>No hay chequeras registradas</p>
                        <button class="btn btn-primary" onclick="PaymentOrdersDashboard.showCreateCheckbookModal()">
                            <i class="fas fa-plus"></i> Crear primera chequera
                        </button>
                    </div>
                `}
            `;

        } catch (error) {
            console.error('❌ Error cargando chequeras:', error);
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>Error: ${error.message}</h4></div>`;
        }
    },

    // ==========================================
    // CUBO OLAP - NAVEGACIÓN
    // ==========================================

    async changeGroupBy(groupBy) {
        this.cubeState.currentLevel = groupBy;
        await this.refreshCubeData();
    },

    async drillDown(currentLevel, value) {
        // Add to breadcrumb
        this.cubeState.breadcrumb.push({ level: currentLevel, value: value });

        // Set filter based on current level
        this.cubeState.filters[currentLevel] = value;

        // Determine next level
        const hierarchy = {
            year: 'month',
            month: 'week',
            week: 'day',
            day: 'supplier',
            supplier: 'category',
            category: 'purchase_type',
            branch: 'cost_center',
            cost_center: 'purchase_type'
        };

        const nextLevel = hierarchy[currentLevel] || 'supplier';
        this.cubeState.currentLevel = nextLevel;

        // Update groupby selector
        const selector = document.getElementById('cube-groupby');
        if (selector) {
            selector.value = nextLevel;
        }

        await this.refreshCubeData();
        this.updateBreadcrumb();
    },

    resetCube() {
        this.cubeState = {
            breadcrumb: [],
            currentLevel: 'month',
            filters: {}
        };

        const selector = document.getElementById('cube-groupby');
        if (selector) {
            selector.value = 'month';
        }

        this.refreshCubeData();
        this.updateBreadcrumb();
    },

    drillUp(index) {
        // Remove all breadcrumb items after index
        const removed = this.cubeState.breadcrumb.splice(index);

        // Remove corresponding filters
        removed.forEach(item => {
            delete this.cubeState.filters[item.level];
        });

        // Set level to the last remaining item or default
        if (this.cubeState.breadcrumb.length > 0) {
            const lastItem = this.cubeState.breadcrumb[this.cubeState.breadcrumb.length - 1];
            this.cubeState.currentLevel = lastItem.level;
        } else {
            this.cubeState.currentLevel = 'month';
        }

        this.refreshCubeData();
        this.updateBreadcrumb();
    },

    updateBreadcrumb() {
        const container = document.getElementById('cube-breadcrumb');
        if (!container) return;

        let html = `
            <span class="breadcrumb-item breadcrumb-home" onclick="PaymentOrdersDashboard.resetCube()">
                <i class="fas fa-home"></i> Inicio
            </span>
        `;

        this.cubeState.breadcrumb.forEach((item, index) => {
            html += `
                <i class="fas fa-chevron-right" style="color: var(--text-muted); font-size: 0.8rem;"></i>
                <span class="breadcrumb-item" onclick="PaymentOrdersDashboard.drillUp(${index})">
                    ${item.level}: ${item.value}
                </span>
            `;
        });

        container.innerHTML = html;
    },

    async refreshCubeData() {
        const content = document.getElementById('cube-content');
        if (!content) return;

        content.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const cubeData = await this.fetchCubeData();
            content.innerHTML = this.renderCubeTable(cubeData);
        } catch (error) {
            content.innerHTML = `<p style="color: var(--danger)">Error: ${error.message}</p>`;
        }
    },

    applyFilters() {
        const dateFrom = document.getElementById('cube-date-from')?.value;
        const dateTo = document.getElementById('cube-date-to')?.value;

        if (dateFrom) this.cubeState.filters.date_from = dateFrom;
        else delete this.cubeState.filters.date_from;

        if (dateTo) this.cubeState.filters.date_to = dateTo;
        else delete this.cubeState.filters.date_to;

        this.refreshCubeData();
    },

    async refreshCube() {
        try {
            await this.apiCall('/api/payment-orders/forecast/refresh', 'POST');
            this.showToast('Cubo actualizado correctamente', 'success');
            this.loadDashboardData();
        } catch (error) {
            this.showToast('Error actualizando cubo: ' + error.message, 'error');
        }
    },

    // ==========================================
    // MODALES
    // ==========================================

    showCreateOrderModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> Nueva Orden de Pago</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-order-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Proveedor *</label>
                                <select class="form-control" name="supplier_id" required>
                                    <option value="">Seleccione proveedor</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Fecha de Pago Programada</label>
                                <input type="date" class="form-control" name="scheduled_payment_date">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Método de Pago *</label>
                                <select class="form-control" name="payment_method" required>
                                    <option value="transfer">Transferencia</option>
                                    <option value="check">Cheque</option>
                                    <option value="cash">Efectivo</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Centro de Costo</label>
                                <select class="form-control" name="cost_center_id">
                                    <option value="">Sin centro de costo</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Notas</label>
                            <textarea class="form-control" name="notes" rows="3"></textarea>
                        </div>

                        <div class="form-group">
                            <label>Facturas a Incluir</label>
                            <div id="invoices-container" style="max-height: 200px; overflow-y: auto; background: var(--bg-card); padding: 10px; border-radius: 8px;">
                                <p style="color: var(--text-muted)">Seleccione un proveedor para ver facturas pendientes</p>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="PaymentOrdersDashboard.createOrder()">
                        <i class="fas fa-save"></i> Crear Orden
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.loadSuppliersForModal();
    },

    showCreateCheckbookModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-book"></i> Nueva Chequera</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="create-checkbook-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Número de Chequera *</label>
                                <input type="text" class="form-control" name="checkbook_number" required>
                            </div>
                            <div class="form-group">
                                <label>Banco *</label>
                                <input type="text" class="form-control" name="bank_name" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Número de Cuenta</label>
                                <input type="text" class="form-control" name="account_number">
                            </div>
                            <div class="form-group">
                                <label>Moneda</label>
                                <select class="form-control" name="currency">
                                    <option value="ARS">ARS - Peso Argentino</option>
                                    <option value="USD">USD - Dólar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="BRL">BRL - Real</option>
                                    <option value="CLP">CLP - Peso Chileno</option>
                                    <option value="MXN">MXN - Peso Mexicano</option>
                                    <option value="UYU">UYU - Peso Uruguayo</option>
                                    <option value="COP">COP - Peso Colombiano</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Primer Cheque *</label>
                                <input type="number" class="form-control" name="first_check_number" required>
                            </div>
                            <div class="form-group">
                                <label>Último Cheque *</label>
                                <input type="number" class="form-control" name="last_check_number" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Fecha Recepción</label>
                                <input type="date" class="form-control" name="received_date">
                            </div>
                            <div class="form-group">
                                <label>Fecha Vencimiento</label>
                                <input type="date" class="form-control" name="expiry_date">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Ubicación Física</label>
                            <input type="text" class="form-control" name="location" placeholder="Ej: Caja fuerte principal">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="PaymentOrdersDashboard.createCheckbook()">
                        <i class="fas fa-save"></i> Crear Chequera
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // ==========================================
    // API CALLS
    // ==========================================

    async loadDashboardData() {
        if (this.currentTab === 'dashboard') {
            await this.renderDashboard(document.getElementById('payment-orders-content'));
        }
    },

    async fetchKPIs() {
        return this.apiCall(`/api/payment-orders/forecast/kpis?company_id=${this.companyId}`);
    },

    async fetchCubeData() {
        const params = new URLSearchParams({
            company_id: this.companyId,
            group_by: this.cubeState.currentLevel,
            ...this.cubeState.filters
        });
        return this.apiCall(`/api/payment-orders/forecast/cube?${params}`);
    },

    async fetchTimeline() {
        const result = await this.apiCall(`/api/payment-orders/forecast/timeline?company_id=${this.companyId}&days=30`);
        return result.data || [];
    },

    async fetchOrders(statusFilter = '') {
        let url = `/api/payment-orders?company_id=${this.companyId}`;
        if (statusFilter) {
            url += `&status=${statusFilter}`;
        }
        return this.apiCall(url);
    },

    async loadOrders(statusFilter = '') {
        const container = document.getElementById('payment-orders-content');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const orders = await this.fetchOrders(statusFilter);

            // Renderizar banner de ayuda contextual
            const helpBanner = typeof ModuleHelpSystem !== 'undefined'
                ? ModuleHelpSystem.renderBanner('orders')
                : '';

            container.innerHTML = `
                ${helpBanner}
                <div class="orders-header" style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                    <div class="orders-filters">
                        <select id="orders-status-filter" onchange="PaymentOrdersDashboard.filterOrders()">
                            <option value="" ${!statusFilter ? 'selected' : ''}>Todos los estados</option>
                            <option value="draft" ${statusFilter === 'draft' ? 'selected' : ''}>Borrador</option>
                            <option value="pending_approval" ${statusFilter === 'pending_approval' ? 'selected' : ''}>Pendiente Aprobación</option>
                            <option value="approved" ${statusFilter === 'approved' ? 'selected' : ''}>Aprobada</option>
                            <option value="scheduled" ${statusFilter === 'scheduled' ? 'selected' : ''}>Programada</option>
                            <option value="executed" ${statusFilter === 'executed' ? 'selected' : ''}>Ejecutada</option>
                            <option value="cancelled" ${statusFilter === 'cancelled' ? 'selected' : ''}>Cancelada</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="PaymentOrdersDashboard.showCreateOrderModal()">
                        <i class="fas fa-plus"></i> Nueva Orden
                    </button>
                </div>

                ${orders.data && orders.data.length > 0 ? `
                    <table class="orders-table">
                        <thead>
                            <tr>
                                <th>Nro. Orden</th>
                                <th>Fecha</th>
                                <th>Proveedor</th>
                                <th>Bruto</th>
                                <th>Ret.</th>
                                <th>Neto</th>
                                <th>F. Pago</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.data.map(order => {
                                const retTooltip = this.getRetentionTooltip(order.retentions_detail, order.total_retentions);
                                const hasRet = (order.total_retentions || 0) > 0;
                                return `
                                <tr>
                                    <td><strong>${order.order_number}</strong></td>
                                    <td>${this.formatDate(order.order_date)}</td>
                                    <td>${order.supplier?.name || order.supplier_name || 'N/A'}</td>
                                    <td>${this.formatCurrency(order.gross_amount || order.total_amount)}</td>
                                    <td title="${retTooltip}" style="cursor:${hasRet ? 'help' : 'default'}">
                                        ${hasRet ? `<span style="color:#e67e22">${this.formatCurrency(order.total_retentions)}</span>` : '-'}
                                    </td>
                                    <td><strong style="color:var(--accent)">${this.formatCurrency(order.net_payment_amount)}</strong></td>
                                    <td>${order.scheduled_payment_date ? this.formatDate(order.scheduled_payment_date) : '-'}</td>
                                    <td><span class="status-badge status-${order.status}">${this.getStatusLabel(order.status)}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick="PaymentOrdersDashboard.viewOrder(${order.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${order.status === 'draft' ? `
                                            <button class="btn btn-sm btn-primary" onclick="PaymentOrdersDashboard.submitOrder(${order.id})">
                                                <i class="fas fa-paper-plane"></i>
                                            </button>
                                        ` : ''}
                                        ${order.status === 'pending_approval' ? `
                                            <button class="btn btn-sm btn-success" onclick="PaymentOrdersDashboard.approveOrder(${order.id})">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `; }).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <h4>Sin órdenes de pago</h4>
                        <p>${statusFilter ? 'No hay órdenes con el estado seleccionado' : 'No hay órdenes de pago registradas'}</p>
                        <button class="btn btn-primary" onclick="PaymentOrdersDashboard.showCreateOrderModal()">
                            <i class="fas fa-plus"></i> Crear primera orden
                        </button>
                    </div>
                `}
            `;
        } catch (error) {
            console.error('Error cargando órdenes:', error);
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>Error: ${error.message}</h4></div>`;
        }
    },

    async fetchPendingApproval() {
        return this.apiCall(`/api/payment-orders/pending-approval?company_id=${this.companyId}`);
    },

    async fetchChecksDashboard() {
        return this.apiCall(`/api/payment-orders/checks/dashboard?company_id=${this.companyId}`);
    },

    async fetchCheckbooks() {
        return this.apiCall(`/api/payment-orders/checkbooks?company_id=${this.companyId}`);
    },

    async fetchCheckbooksStats() {
        return this.apiCall(`/api/payment-orders/checkbooks/stats?company_id=${this.companyId}`);
    },

    async apiCall(url, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en la solicitud');
        }

        return data.data || data;
    },

    // ==========================================
    // ACCIONES
    // ==========================================

    async createOrder() {
        const form = document.getElementById('create-order-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        data.company_id = this.companyId;

        // Collect selected invoices from checkboxes
        const invoiceCheckboxes = document.querySelectorAll('.invoice-checkbox:checked');
        if (invoiceCheckboxes.length > 0) {
            data.items = Array.from(invoiceCheckboxes).map(cb => ({
                invoice_id: parseInt(cb.dataset.invoiceId),
                amount: parseFloat(cb.dataset.amount) || 0
            }));
        }

        try {
            await this.apiCall('/api/payment-orders', 'POST', data);
            this.showToast('Orden creada exitosamente', 'success');
            document.querySelector('.modal-overlay').remove();
            this.switchTab('orders');
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    async createCheckbook() {
        const form = document.getElementById('create-checkbook-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        data.company_id = this.companyId;

        try {
            await this.apiCall('/api/payment-orders/checkbooks', 'POST', data);
            this.showToast('Chequera creada exitosamente', 'success');
            document.querySelector('.modal-overlay').remove();
            this.switchTab('checkbooks');
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    async submitOrder(id) {
        if (!confirm('¿Enviar orden a aprobación?')) return;

        try {
            await this.apiCall(`/api/payment-orders/${id}/submit`, 'POST');
            this.showToast('Orden enviada a aprobación', 'success');
            this.switchTab('orders');
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    async approveOrder(id) {
        if (!confirm('¿Aprobar esta orden de pago?')) return;

        try {
            await this.apiCall(`/api/payment-orders/${id}/approve`, 'POST', {
                auth_method: 'password'
            });
            this.showToast('Orden aprobada exitosamente', 'success');
            this.switchTab('pending');
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        }
    },

    async viewOrder(id) {
        try {
            const order = await this.apiCall(`/api/payment-orders/${id}?company_id=${this.companyId}`);

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-file-invoice-dollar"></i> Orden de Pago #${order.order_number || id}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Nro. Orden</label>
                                <div class="form-control" style="background: var(--bg-primary);">${order.order_number || '-'}</div>
                            </div>
                            <div class="form-group">
                                <label>Estado</label>
                                <div><span class="status-badge status-${order.status}">${this.getStatusLabel(order.status)}</span></div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Proveedor</label>
                                <div class="form-control" style="background: var(--bg-primary);">${order.supplier?.name || order.supplier_name || '-'}</div>
                            </div>
                            <div class="form-group">
                                <label>Método de Pago</label>
                                <div class="form-control" style="background: var(--bg-primary);">${order.payment_method || '-'}</div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Monto Bruto</label>
                                <div class="form-control" style="background: var(--bg-primary);">${this.formatCurrency(order.gross_amount)}</div>
                            </div>
                            <div class="form-group">
                                <label>Retenciones <span style="font-size:11px;color:#888">(Total: ${this.formatCurrency(order.total_retentions)})</span></label>
                                ${this.renderRetentionsBreakdown(order.retentions_detail, order.total_retentions)}
                            </div>
                            <div class="form-group">
                                <label>Monto Neto</label>
                                <div class="form-control" style="background: var(--bg-primary); color: var(--accent); font-weight: 700;">${this.formatCurrency(order.net_payment_amount)}</div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Fecha de Orden</label>
                                <div class="form-control" style="background: var(--bg-primary);">${this.formatDate(order.order_date)}</div>
                            </div>
                            <div class="form-group">
                                <label>Fecha de Pago Programada</label>
                                <div class="form-control" style="background: var(--bg-primary);">${this.formatDate(order.scheduled_payment_date)}</div>
                            </div>
                            <div class="form-group">
                                <label>Fecha de Ejecución</label>
                                <div class="form-control" style="background: var(--bg-primary);">${this.formatDate(order.execution_date)}</div>
                            </div>
                        </div>

                        ${order.notes ? `
                            <div class="form-group">
                                <label>Notas</label>
                                <div class="form-control" style="background: var(--bg-primary); white-space: pre-wrap;">${order.notes}</div>
                            </div>
                        ` : ''}

                        ${order.items && order.items.length > 0 ? `
                            <div class="form-group">
                                <label>Facturas Vinculadas</label>
                                <table class="orders-table" style="margin-top: 8px;">
                                    <thead>
                                        <tr>
                                            <th>Factura</th>
                                            <th>Monto</th>
                                            <th>Retención</th>
                                            <th>Neto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${order.items.map(item => `
                                            <tr>
                                                <td>${item.invoice_number || item.invoice_id || '-'}</td>
                                                <td>${this.formatCurrency(item.amount || item.gross_amount)}</td>
                                                <td>${this.formatCurrency(item.retention_amount || 0)}</td>
                                                <td><strong>${this.formatCurrency(item.net_amount || item.amount || 0)}</strong></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
                        ${order.status === 'draft' ? `
                            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); PaymentOrdersDashboard.submitOrder(${order.id})">
                                <i class="fas fa-paper-plane"></i> Enviar a Aprobación
                            </button>
                        ` : ''}
                        ${order.status === 'pending_approval' ? `
                            <button class="btn btn-success" onclick="this.closest('.modal-overlay').remove(); PaymentOrdersDashboard.approveOrder(${order.id})">
                                <i class="fas fa-check"></i> Aprobar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            this.showToast('Error cargando detalle de orden: ' + error.message, 'error');
        }
    },

    async viewCheckbook(id) {
        try {
            const checkbook = await this.apiCall(`/api/payment-orders/checkbooks/${id}?company_id=${this.companyId}`);

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-book"></i> Chequera #${checkbook.checkbook_number || id}</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Número de Chequera</label>
                                <div class="form-control" style="background: var(--bg-primary);">${checkbook.checkbook_number || '-'}</div>
                            </div>
                            <div class="form-group">
                                <label>Estado</label>
                                <div><span class="status-badge status-${checkbook.status === 'active' ? 'approved' : 'cancelled'}">${checkbook.status || '-'}</span></div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Banco</label>
                                <div class="form-control" style="background: var(--bg-primary);">${checkbook.bank_name || '-'}</div>
                            </div>
                            <div class="form-group">
                                <label>Número de Cuenta</label>
                                <div class="form-control" style="background: var(--bg-primary);">${checkbook.account_number || '-'}</div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Primer Cheque</label>
                                <div class="form-control" style="background: var(--bg-primary);">${checkbook.first_check_number || '-'}</div>
                            </div>
                            <div class="form-group">
                                <label>Último Cheque</label>
                                <div class="form-control" style="background: var(--bg-primary);">${checkbook.last_check_number || '-'}</div>
                            </div>
                            <div class="form-group">
                                <label>Cheque Actual</label>
                                <div class="form-control" style="background: var(--bg-primary); color: var(--accent); font-weight: 700;">${checkbook.current_check_number || checkbook.first_check_number || '-'}</div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Cheques Disponibles</label>
                                <div class="form-control" style="background: var(--bg-primary);">
                                    ${checkbook.checks_available || 0} / ${checkbook.checks_total || 0}
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Moneda</label>
                                <div class="form-control" style="background: var(--bg-primary);">${checkbook.currency || 'ARS'}</div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Fecha Recepción</label>
                                <div class="form-control" style="background: var(--bg-primary);">${this.formatDate(checkbook.received_date)}</div>
                            </div>
                            <div class="form-group">
                                <label>Fecha Vencimiento</label>
                                <div class="form-control" style="background: var(--bg-primary);">${this.formatDate(checkbook.expiry_date)}</div>
                            </div>
                        </div>

                        ${checkbook.location ? `
                            <div class="form-group">
                                <label>Ubicación Física</label>
                                <div class="form-control" style="background: var(--bg-primary);">${checkbook.location}</div>
                            </div>
                        ` : ''}

                        ${checkbook.checks_available !== undefined && checkbook.checks_total ? `
                            <div class="form-group">
                                <label>Uso de Chequera</label>
                                <div style="height: 8px; background: var(--bg-card); border-radius: 4px; margin-top: 8px;">
                                    <div style="height: 100%; width: ${(checkbook.checks_available / checkbook.checks_total) * 100}%; background: var(--accent); border-radius: 4px;"></div>
                                </div>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">
                                    ${checkbook.checks_total - checkbook.checks_available} usados de ${checkbook.checks_total}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        } catch (error) {
            this.showToast('Error cargando detalle de chequera: ' + error.message, 'error');
        }
    },

    async loadSuppliersForModal() {
        try {
            const result = await this.apiCall(`/api/procurement/suppliers?company_id=${this.companyId}`);
            const suppliers = result.data || result || [];

            const select = document.querySelector('#create-order-form select[name="supplier_id"]');
            if (!select) return;

            select.innerHTML = '<option value="">Seleccione proveedor</option>';
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id;
                option.textContent = supplier.name || supplier.business_name || `Proveedor #${supplier.id}`;
                select.appendChild(option);
            });

            // When supplier changes, load their pending invoices
            select.addEventListener('change', async (e) => {
                const supplierId = e.target.value;
                const invoicesContainer = document.getElementById('invoices-container');
                if (!invoicesContainer) return;

                if (!supplierId) {
                    invoicesContainer.innerHTML = '<p style="color: var(--text-muted)">Seleccione un proveedor para ver facturas pendientes</p>';
                    return;
                }

                invoicesContainer.innerHTML = '<div class="loading-spinner" style="padding: 10px;"></div>';

                try {
                    const invoices = await this.apiCall(`/api/payment-orders/pending-invoices?company_id=${this.companyId}&supplier_id=${supplierId}`);
                    const invoiceList = invoices.data || invoices || [];

                    if (invoiceList.length === 0) {
                        invoicesContainer.innerHTML = '<p style="color: var(--text-muted)">No hay facturas pendientes para este proveedor</p>';
                        return;
                    }

                    invoicesContainer.innerHTML = invoiceList.map(inv => `
                        <label style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--border); cursor: pointer;">
                            <input type="checkbox" class="invoice-checkbox" data-invoice-id="${inv.id}" data-amount="${inv.pending_amount || inv.total_amount || 0}">
                            <span style="flex: 1;">
                                <strong>${inv.invoice_number || inv.number || '-'}</strong>
                                <span style="color: var(--text-muted); font-size: 0.85rem;"> - ${this.formatDate(inv.due_date || inv.date)}</span>
                            </span>
                            <span style="font-weight: 600; color: var(--accent);">${this.formatCurrency(inv.pending_amount || inv.total_amount || 0)}</span>
                        </label>
                    `).join('');
                } catch (err) {
                    invoicesContainer.innerHTML = `<p style="color: var(--danger)">Error cargando facturas: ${err.message}</p>`;
                }
            });
        } catch (error) {
            console.error('Error cargando proveedores:', error);
            const select = document.querySelector('#create-order-form select[name="supplier_id"]');
            if (select) {
                select.innerHTML = '<option value="">Error cargando proveedores</option>';
            }
        }
    },

    async filterOrders() {
        const statusFilter = document.getElementById('orders-status-filter')?.value || '';
        await this.loadOrders(statusFilter);
    },

    // ==========================================
    // UTILIDADES
    // ==========================================

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    },

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    getStatusLabel(status) {
        const labels = {
            draft: 'Borrador',
            pending_approval: 'Pend. Aprobación',
            approved: 'Aprobada',
            scheduled: 'Programada',
            executing: 'En Ejecución',
            executed: 'Ejecutada',
            cancelled: 'Cancelada'
        };
        return labels[status] || status;
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#00d9ff' : type === 'error' ? '#ff4757' : '#ffc107'};
            color: ${type === 'success' || type === 'error' ? 'white' : '#1a1a2e'};
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    /**
     * Renderiza el breakdown de retenciones como una lista/tabla visual
     * @param {Array|Object|string} retentionsDetail - Detalle de retenciones (JSONB de BD)
     * @param {number} totalRetentions - Total de retenciones como fallback
     * @returns {string} HTML del breakdown
     */
    renderRetentionsBreakdown(retentionsDetail, totalRetentions = 0) {
        // Parsear si viene como string JSON
        let breakdown = retentionsDetail;
        if (typeof breakdown === 'string') {
            try { breakdown = JSON.parse(breakdown); } catch { breakdown = null; }
        }

        // Si no hay breakdown o es vacío, mostrar solo el total
        if (!breakdown || (Array.isArray(breakdown) && breakdown.length === 0)) {
            if (totalRetentions > 0) {
                return `<div class="form-control" style="background: var(--bg-primary);">
                    <span style="color:#888">Sin desglose disponible</span>
                </div>`;
            }
            return `<div class="form-control" style="background: var(--bg-primary); color: #666;">Sin retenciones</div>`;
        }

        // Mapeo de tipos a nombres legibles
        const typeLabels = {
            ganancias: 'Ret. Ganancias',
            iva: 'Ret. IVA',
            iibb: 'Ret. IIBB',
            suss: 'Ret. SUSS',
            retefuente: 'ReteFuente',
            reteiva: 'ReteIVA',
            reteica: 'ReteICA',
            irrf: 'IRRF',
            pis: 'PIS',
            cofins: 'COFINS',
            csll: 'CSLL',
            iss: 'ISS',
            isr: 'ISR',
            iva_retenido: 'IVA Retenido',
            irpf: 'IRPF',
            irae: 'IRAE',
            boleta_honorarios: 'Boleta Honorarios',
            ppm: 'PPM'
        };

        // Colores por tipo
        const typeColors = {
            ganancias: '#3498db',
            iva: '#2ecc71',
            iibb: '#9b59b6',
            suss: '#e67e22',
            retefuente: '#1abc9c',
            reteiva: '#27ae60',
            reteica: '#8e44ad'
        };

        // Generar filas
        const rows = breakdown.filter(r => r.amount > 0).map(r => {
            const label = r.name || typeLabels[r.type] || r.type?.toUpperCase() || 'Retención';
            const color = typeColors[r.type] || '#7f8c8d';
            const percent = r.percent ? `${r.percent}%` : '';
            return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                    <span>
                        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:8px"></span>
                        ${label} ${percent ? `<small style="color:#888">(${percent})</small>` : ''}
                    </span>
                    <strong style="color:${color}">${this.formatCurrency(r.amount)}</strong>
                </div>
            `;
        }).join('');

        return `
            <div class="form-control" style="background: var(--bg-primary); padding: 8px 12px;">
                ${rows || '<span style="color:#666">Sin retenciones</span>'}
            </div>
        `;
    },

    /**
     * Genera tooltip de texto plano para retenciones (usado en tablas OLAP)
     * @param {Array|Object|string} retentionsDetail - Detalle de retenciones
     * @param {number} totalRetentions - Total como fallback
     * @returns {string} Texto para title attribute
     */
    getRetentionTooltip(retentionsDetail, totalRetentions = 0) {
        // Parsear si viene como string
        let breakdown = retentionsDetail;
        if (typeof breakdown === 'string') {
            try { breakdown = JSON.parse(breakdown); } catch { breakdown = null; }
        }

        // Sin retenciones
        if (!totalRetentions && (!breakdown || !breakdown.length)) {
            return 'Sin retenciones';
        }

        // Sin desglose pero con total
        if (!breakdown || !Array.isArray(breakdown) || breakdown.length === 0) {
            return `Total retenciones: ${this.formatCurrency(totalRetentions)}`;
        }

        // Mapeo de tipos
        const typeLabels = {
            ganancias: 'Ganancias', iva: 'IVA', iibb: 'IIBB', suss: 'SUSS',
            retefuente: 'ReteFuente', reteiva: 'ReteIVA', reteica: 'ReteICA',
            irrf: 'IRRF', pis: 'PIS', cofins: 'COFINS', csll: 'CSLL', iss: 'ISS',
            isr: 'ISR', iva_retenido: 'IVA Ret.', irpf: 'IRPF', irae: 'IRAE'
        };

        // Generar líneas
        const lines = breakdown
            .filter(r => r.amount > 0)
            .map(r => {
                const label = typeLabels[r.type] || r.type?.toUpperCase() || 'Ret';
                const pct = r.percent ? ` (${r.percent}%)` : '';
                return `${label}${pct}: ${this.formatCurrency(r.amount)}`;
            });

        if (lines.length === 0) return 'Sin retenciones aplicadas';

        return lines.join(' | ') + ` | TOTAL: ${this.formatCurrency(totalRetentions)}`;
    }
};

// Registrar en el sistema de módulos
if (typeof window.ModulesRegistry !== 'undefined') {
    window.ModulesRegistry.register('payment-orders-dashboard', PaymentOrdersDashboard);
}

// Export para uso directo
window.PaymentOrdersDashboard = PaymentOrdersDashboard;
