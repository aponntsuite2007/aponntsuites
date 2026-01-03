/**
 * Procurement Management Dashboard
 * Sistema completo de Gestión de Compras P2P (Procure-to-Pay)
 *
 * Features:
 * - Dashboard con KPIs y pendientes
 * - Requisiciones (solicitudes de compra)
 * - Órdenes de compra
 * - Recepciones de mercadería
 * - Facturas de compra
 * - Proveedores con historial
 * - Mapeo de artículos proveedor-interno
 * - Configuración de aprobaciones
 */

const ProcurementManagement = {
    name: 'procurement-management',
    currentTab: 'dashboard',
    currentRequisition: null,
    currentOrder: null,
    currentSupplier: null,
    filters: {
        status: '',
        supplierId: '',
        dateFrom: '',
        dateTo: ''
    },
    cache: {
        suppliers: [],
        categories: [],
        sectors: [],
        warehouses: [],
        costCenters: []
    },

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    async init(containerId) {
        // Soportar tanto ID string como elemento directo
        if (typeof containerId === 'string') {
            this.container = document.getElementById(containerId) || document.getElementById('mainContent');
        } else if (containerId instanceof HTMLElement) {
            this.container = containerId;
        } else {
            this.container = document.getElementById('mainContent');
        }

        if (!this.container) {
            console.error('❌ [PROCUREMENT] No se encontró contenedor');
            return;
        }

        console.log('🛒 [PROCUREMENT] Inicializando módulo de Compras P2P...');

        // Detectar módulos relacionados disponibles (plug-and-play)
        await this.detectIntegrations();

        await this.loadBaseData();
        this.render();
        this.setupEventListeners();

        console.log('✅ [PROCUREMENT] Módulo inicializado correctamente');
    },

    // Detectar integraciones disponibles (plug-and-play)
    async detectIntegrations() {
        this.integrations = {
            finance: false,
            warehouse: false,
            siac: false
        };

        try {
            // Verificar módulos activos de la empresa
            const activeModules = window.activeModules || [];
            const moduleKeys = activeModules.map(m => m.module_key || m.id);

            this.integrations.finance = moduleKeys.some(k =>
                k.includes('finance') || k === 'finance-dashboard'
            );
            this.integrations.warehouse = moduleKeys.includes('warehouse-management');
            this.integrations.siac = moduleKeys.some(k =>
                k.includes('siac') || k === 'facturacion'
            );

            console.log('🔌 [PROCUREMENT] Integraciones detectadas:', this.integrations);
        } catch (error) {
            console.warn('⚠️ [PROCUREMENT] Error detectando integraciones:', error.message);
        }
    },

    async loadBaseData() {
        // Cargar datos base con fallbacks para módulos no contratados
        const safeLoad = async (url, fallback = []) => {
            try {
                const response = await this.fetchAPI(url);
                return response?.data || fallback;
            } catch (error) {
                console.warn(`⚠️ [PROCUREMENT] ${url} no disponible (módulo no contratado)`);
                return fallback;
            }
        };

        try {
            // Cargar en paralelo con fallbacks
            const [suppliers, categories, sectors, warehouses, costCenters] = await Promise.all([
                safeLoad('/api/procurement/suppliers?limit=500'),
                safeLoad('/api/procurement/categories'),
                safeLoad('/api/procurement/sectors'),
                // Warehouses: depende del módulo warehouse-management
                this.integrations?.warehouse
                    ? safeLoad('/api/warehouse/locations')
                    : Promise.resolve([]),
                // Cost Centers: depende del módulo finance
                this.integrations?.finance
                    ? safeLoad('/api/finance/cost-centers')
                    : Promise.resolve([])
            ]);

            this.cache.suppliers = suppliers;
            this.cache.categories = categories;
            this.cache.sectors = sectors;
            this.cache.warehouses = warehouses;
            this.cache.costCenters = costCenters;

            console.log('📦 [PROCUREMENT] Datos base cargados:', {
                suppliers: this.cache.suppliers.length,
                categories: this.cache.categories.length,
                warehouses: this.cache.warehouses.length,
                costCenters: this.cache.costCenters.length
            });
        } catch (error) {
            console.error('❌ Error cargando datos base:', error);
        }
    },

    // ========================================
    // RENDER PRINCIPAL
    // ========================================

    injectStyles() {
        // Inyectar estilos en el head solo una vez
        if (document.getElementById('procurement-module-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'procurement-module-styles';
        styleSheet.textContent = `
            /* ============================================
               PROCUREMENT MODULE - DARK THEME
               Consistente con engineering-dashboard.css
               ============================================ */

            .procurement-module {
                padding: 20px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #e6edf3;
            }

            /* Header */
            .procurement-module .module-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 25px 30px;
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
            }
            .procurement-module .module-header h2 {
                color: #e6edf3; margin: 0; font-size: 24px; font-weight: 700;
            }
            .procurement-module .module-header h2 i { color: #f59e0b; margin-right: 10px; }

            /* Tabs */
            .procurement-module .module-tabs {
                display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;
                background: rgba(15, 15, 30, 0.6);
                padding: 12px; border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .procurement-module .tab-btn {
                padding: 10px 20px; border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(33, 38, 45, 0.8); color: rgba(255, 255, 255, 0.6);
                cursor: pointer; border-radius: 8px; transition: all 0.3s;
                font-weight: 500;
            }
            .procurement-module .tab-btn:hover {
                background: rgba(245, 158, 11, 0.2);
                border-color: rgba(245, 158, 11, 0.3);
                color: #f59e0b;
            }
            .procurement-module .tab-btn.active {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #fff; border-color: #f59e0b;
            }

            /* Dashboard Grid */
            .procurement-module .dashboard-grid { display: flex; flex-direction: column; gap: 20px; }

            /* KPI Cards */
            .procurement-module .kpi-row {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px;
            }
            .procurement-module .kpi-card {
                display: flex; align-items: center; gap: 15px;
                background: rgba(15, 15, 30, 0.8);
                padding: 20px; border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
                transition: all 0.3s;
            }
            .procurement-module .kpi-card:hover {
                border-color: rgba(245, 158, 11, 0.3);
                transform: translateY(-2px);
            }
            .procurement-module .kpi-icon {
                width: 55px; height: 55px; border-radius: 12px;
                display: flex; align-items: center; justify-content: center;
                font-size: 22px; color: #fff;
            }
            .procurement-module .kpi-icon.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
            .procurement-module .kpi-icon.green { background: linear-gradient(135deg, #22c55e, #16a34a); }
            .procurement-module .kpi-icon.purple { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
            .procurement-module .kpi-icon.orange { background: linear-gradient(135deg, #f59e0b, #d97706); }
            .procurement-module .kpi-value { font-size: 28px; font-weight: 700; display: block; color: #e6edf3; }
            .procurement-module .kpi-label { color: rgba(255, 255, 255, 0.6); font-size: 13px; }

            /* Pending Section */
            .procurement-module .pending-section, .procurement-module .quick-actions {
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px; padding: 20px;
            }
            .procurement-module .pending-section h3, .procurement-module .quick-actions h3 {
                color: #e6edf3; margin: 0 0 15px 0; font-size: 16px;
            }
            .procurement-module .pending-section h3 i, .procurement-module .quick-actions h3 i {
                color: #f59e0b; margin-right: 8px;
            }
            .procurement-module .pending-grid, .procurement-module .actions-grid {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;
            }
            .procurement-module .pending-card {
                background: rgba(33, 38, 45, 0.8); padding: 18px; border-radius: 10px; text-align: center;
                border-left: 4px solid rgba(255, 255, 255, 0.2);
                transition: all 0.3s;
            }
            .procurement-module .pending-card:hover { transform: translateY(-2px); }
            .procurement-module .pending-card.alert { border-left-color: #ef4444; }
            .procurement-module .pending-card.warning { border-left-color: #f59e0b; }
            .procurement-module .pending-count { font-size: 32px; font-weight: 700; display: block; color: #e6edf3; }
            .procurement-module .pending-label { color: rgba(255, 255, 255, 0.6); font-size: 12px; display: block; margin-bottom: 12px; }

            /* Action Buttons */
            .procurement-module .action-btn {
                display: flex; flex-direction: column; align-items: center; gap: 10px;
                padding: 20px; background: rgba(33, 38, 45, 0.8);
                border: 2px dashed rgba(255, 255, 255, 0.2);
                border-radius: 10px; cursor: pointer; transition: all 0.3s; color: #e6edf3;
            }
            .procurement-module .action-btn:hover {
                border-color: #f59e0b; background: rgba(245, 158, 11, 0.1);
            }
            .procurement-module .action-btn i { font-size: 28px; color: #f59e0b; }

            /* Integrations Panel */
            .procurement-module .integrations-panel {
                margin-top: 20px; padding: 20px;
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
            }
            .procurement-module .integrations-panel h3 { margin: 0 0 15px 0; color: #e6edf3; }
            .procurement-module .integrations-panel h3 i { color: #f59e0b; margin-right: 8px; }
            .procurement-module .integrations-grid {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px;
            }
            .procurement-module .integration-card {
                background: rgba(33, 38, 45, 0.8); padding: 18px; border-radius: 10px;
                display: flex; flex-direction: column; gap: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.3s;
            }
            .procurement-module .integration-card.active {
                border-color: #22c55e; background: rgba(34, 197, 94, 0.1);
            }
            .procurement-module .integration-card.inactive { opacity: 0.6; }
            .procurement-module .integration-card i { font-size: 28px; color: #f59e0b; }
            .procurement-module .integration-card .int-name { font-weight: 600; color: #e6edf3; }
            .procurement-module .integration-card .int-status { font-size: 12px; color: rgba(255, 255, 255, 0.6); }
            .procurement-module .integration-card small { font-size: 11px; color: rgba(255, 255, 255, 0.4); }

            /* Data Tables */
            .procurement-module .data-table {
                width: 100%; border-collapse: collapse;
                background: rgba(15, 15, 30, 0.8);
                border-radius: 10px; overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .procurement-module .data-table th {
                background: rgba(33, 38, 45, 0.9); color: #e6edf3;
                padding: 14px 16px; text-align: left; font-weight: 600;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .procurement-module .data-table td {
                padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                color: rgba(255, 255, 255, 0.8);
            }
            .procurement-module .data-table tr:hover { background: rgba(245, 158, 11, 0.05); }

            /* Status Badges */
            .procurement-module .status-badge {
                padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
                text-transform: uppercase;
            }
            .procurement-module .status-badge.draft { background: rgba(107, 114, 128, 0.3); color: #9ca3af; }
            .procurement-module .status-badge.pending, .procurement-module .status-badge.pending_approval {
                background: rgba(245, 158, 11, 0.2); color: #f59e0b;
            }
            .procurement-module .status-badge.approved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
            .procurement-module .status-badge.rejected { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
            .procurement-module .status-badge.completed, .procurement-module .status-badge.closed {
                background: rgba(59, 130, 246, 0.2); color: #3b82f6;
            }

            /* List Section */
            .procurement-module .list-section {
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px; padding: 20px;
            }
            .procurement-module .list-toolbar {
                display: flex; justify-content: space-between;
                margin-bottom: 15px; flex-wrap: wrap; gap: 10px;
            }
            .procurement-module .filters { display: flex; gap: 10px; flex-wrap: wrap; }
            .procurement-module .filters select, .procurement-module .filters input {
                padding: 10px 14px;
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px; color: #e6edf3;
            }
            .procurement-module .filters select:focus, .procurement-module .filters input:focus {
                border-color: #f59e0b; outline: none;
            }

            /* Buttons */
            .procurement-module .btn {
                padding: 10px 18px; border: none; border-radius: 8px;
                cursor: pointer; transition: all 0.3s; font-weight: 500;
            }
            .procurement-module .btn-primary {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff;
            }
            .procurement-module .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); }
            .procurement-module .btn-success { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; }
            .procurement-module .btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
            .procurement-module .btn-secondary {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2); color: #e6edf3;
            }
            .procurement-module .btn-sm { padding: 6px 12px; font-size: 12px; }

            /* Modals - GLOBAL (se renderizan fuera del .procurement-module) */
            .modal-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
                display: flex; align-items: center; justify-content: center; z-index: 10000;
                animation: fadeIn 0.2s ease;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

            .modal-container {
                background: linear-gradient(180deg, #1a1f2e 0%, #0d1117 100%);
                border: 1px solid rgba(245, 158, 11, 0.3);
                border-radius: 16px;
                width: 95%;
                max-width: 700px;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 158, 11, 0.1);
                animation: slideUp 0.3s ease;
            }
            @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

            .modal-header {
                padding: 20px 25px;
                background: rgba(15, 15, 30, 0.95);
                border-bottom: 1px solid rgba(245, 158, 11, 0.2);
                display: flex; justify-content: space-between; align-items: center;
            }
            .modal-header h3 {
                margin: 0;
                color: #f59e0b;
                font-size: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .modal-header h3::before {
                content: '\\f218';
                font-family: 'Font Awesome 5 Free';
                font-weight: 900;
            }
            .modal-close {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: rgba(255, 255, 255, 0.6);
                width: 36px; height: 36px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex; align-items: center; justify-content: center;
            }
            .modal-close:hover {
                background: rgba(239, 68, 68, 0.2);
                border-color: #ef4444;
                color: #ef4444;
            }

            .modal-body {
                padding: 25px;
                overflow-y: auto;
                max-height: calc(90vh - 160px);
                background: rgba(13, 17, 23, 0.95);
            }

            .modal-footer {
                padding: 18px 25px;
                background: rgba(15, 15, 30, 0.95);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            /* Forms - GLOBAL */
            .modal-body form { color: #e6edf3; }

            .modal-body .form-row {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 0;
            }

            .modal-body .form-group {
                margin-bottom: 20px;
            }

            .modal-body .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .modal-body .form-group input,
            .modal-body .form-group select,
            .modal-body .form-group textarea {
                width: 100%;
                padding: 14px 16px;
                background: rgba(30, 35, 45, 0.9);
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                color: #e6edf3;
                font-size: 14px;
                transition: all 0.2s;
                box-sizing: border-box;
            }

            .modal-body .form-group input::placeholder,
            .modal-body .form-group textarea::placeholder {
                color: rgba(255, 255, 255, 0.4);
            }

            .modal-body .form-group input:focus,
            .modal-body .form-group select:focus,
            .modal-body .form-group textarea:focus {
                border-color: #f59e0b;
                outline: none;
                background: rgba(40, 45, 55, 0.95);
                box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
            }

            .modal-body .form-group input:required:valid {
                border-color: rgba(34, 197, 94, 0.4);
            }

            .modal-body .form-group select {
                cursor: pointer;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23f59e0b' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 14px center;
                padding-right: 40px;
            }

            .modal-body .form-group select option {
                background: #1a1f2e;
                color: #e6edf3;
                padding: 10px;
            }

            /* Form Sections (h4 headings) */
            .modal-body h4 {
                color: #f59e0b;
                font-size: 14px;
                font-weight: 600;
                margin: 28px 0 18px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid rgba(245, 158, 11, 0.3);
                text-transform: uppercase;
                letter-spacing: 1px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .modal-body h4::before {
                content: '';
                width: 4px;
                height: 20px;
                background: #f59e0b;
                border-radius: 2px;
            }

            /* Buttons in modal */
            .modal-footer .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 600;
                font-size: 14px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .modal-footer .btn-primary {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #fff;
                box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
            }
            .modal-footer .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
            }
            .modal-footer .btn-secondary {
                background: rgba(33, 38, 45, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #e6edf3;
            }
            .modal-footer .btn-secondary:hover {
                background: rgba(50, 55, 65, 0.9);
                border-color: rgba(255, 255, 255, 0.3);
            }

            /* Loading */
            .procurement-module .loading {
                text-align: center; padding: 40px;
                color: rgba(255, 255, 255, 0.6);
            }
            .procurement-module .loading i { font-size: 24px; color: #f59e0b; }

            /* Notification Toast */
            .notification {
                position: fixed;
                bottom: 30px;
                right: 30px;
                padding: 16px 24px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                font-weight: 500;
                z-index: 10001;
                animation: slideInRight 0.3s ease;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            }
            @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            .notification.success {
                background: linear-gradient(135deg, #065f46, #047857);
                color: #fff;
                border-left: 4px solid #10b981;
            }
            .notification.error {
                background: linear-gradient(135deg, #7f1d1d, #991b1b);
                color: #fff;
                border-left: 4px solid #ef4444;
            }
            .notification.info {
                background: linear-gradient(135deg, #1e3a5f, #1e40af);
                color: #fff;
                border-left: 4px solid #3b82f6;
            }
        `;
        document.head.appendChild(styleSheet);
    },

    render() {
        // Inyectar estilos en el head
        this.injectStyles();

        this.container.innerHTML = `
            <div class="procurement-module">
                <div class="module-header">
                    <h2><i class="fas fa-shopping-cart"></i> Gestión de Compras P2P</h2>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="ProcurementManagement.showNewRequisitionModal()">
                            <i class="fas fa-plus"></i> Nueva Solicitud
                        </button>
                    </div>
                </div>

                <div class="module-tabs">
                    <button class="tab-btn active" data-tab="dashboard">
                        <i class="fas fa-chart-line"></i> Dashboard
                    </button>
                    <button class="tab-btn" data-tab="requisitions">
                        <i class="fas fa-file-alt"></i> Solicitudes
                    </button>
                    <button class="tab-btn" data-tab="orders">
                        <i class="fas fa-file-invoice"></i> Órdenes
                    </button>
                    <button class="tab-btn" data-tab="receipts">
                        <i class="fas fa-truck-loading"></i> Recepciones
                    </button>
                    <button class="tab-btn" data-tab="invoices">
                        <i class="fas fa-file-invoice-dollar"></i> Facturas
                    </button>
                    <button class="tab-btn" data-tab="suppliers">
                        <i class="fas fa-building"></i> Proveedores
                    </button>
                    <button class="tab-btn" data-tab="mappings">
                        <i class="fas fa-exchange-alt"></i> Mapeos
                    </button>
                    <button class="tab-btn" data-tab="config">
                        <i class="fas fa-cog"></i> Config
                    </button>
                </div>

                <div class="tab-content" id="procurement-tab-content">
                    <!-- Contenido dinámico -->
                </div>
            </div>
        `;

        this.loadTab(this.currentTab);
    },

    setupEventListeners() {
        // Tab navigation
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.closest('.tab-btn').dataset.tab;
                this.switchTab(tab);
            });
        });
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        this.loadTab(tab);
    },

    async loadTab(tab) {
        const content = document.getElementById('procurement-tab-content');
        content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

        switch (tab) {
            case 'dashboard':
                await this.renderDashboard(content);
                break;
            case 'requisitions':
                await this.renderRequisitions(content);
                break;
            case 'orders':
                await this.renderOrders(content);
                break;
            case 'receipts':
                await this.renderReceipts(content);
                break;
            case 'invoices':
                await this.renderInvoices(content);
                break;
            case 'suppliers':
                await this.renderSuppliers(content);
                break;
            case 'mappings':
                await this.renderMappings(content);
                break;
            case 'config':
                await this.renderConfig(content);
                break;
        }
    },

    // ========================================
    // DASHBOARD
    // ========================================

    async renderDashboard(content) {
        try {
            const [stats, pending] = await Promise.all([
                this.fetchAPI('/api/procurement/dashboard'),
                this.fetchAPI('/api/procurement/dashboard/pending')
            ]);

            content.innerHTML = `
                <div class="dashboard-grid">
                    <!-- KPIs Row -->
                    <div class="kpi-row">
                        <div class="kpi-card">
                            <div class="kpi-icon blue"><i class="fas fa-file-alt"></i></div>
                            <div class="kpi-info">
                                <span class="kpi-value">${stats?.data?.requisitions_this_month || 0}</span>
                                <span class="kpi-label">Solicitudes del Mes</span>
                            </div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon green"><i class="fas fa-file-invoice"></i></div>
                            <div class="kpi-info">
                                <span class="kpi-value">${stats?.data?.orders_this_month || 0}</span>
                                <span class="kpi-label">Órdenes del Mes</span>
                            </div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon purple"><i class="fas fa-dollar-sign"></i></div>
                            <div class="kpi-info">
                                <span class="kpi-value">${this.formatCurrency(stats?.data?.total_purchased_month || 0)}</span>
                                <span class="kpi-label">Compras del Mes</span>
                            </div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon orange"><i class="fas fa-building"></i></div>
                            <div class="kpi-info">
                                <span class="kpi-value">${stats?.data?.active_suppliers || 0}</span>
                                <span class="kpi-label">Proveedores Activos</span>
                            </div>
                        </div>
                    </div>

                    <!-- Pending Items -->
                    <div class="pending-section">
                        <h3><i class="fas fa-clock"></i> Pendientes de Atención</h3>
                        <div class="pending-grid">
                            <div class="pending-card ${pending?.data?.requisitions_pending > 0 ? 'alert' : ''}">
                                <span class="pending-count">${pending?.data?.requisitions_pending || 0}</span>
                                <span class="pending-label">Solicitudes por Aprobar</span>
                                <button class="btn btn-sm" onclick="ProcurementManagement.switchTab('requisitions')">
                                    Ver <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                            <div class="pending-card ${pending?.data?.orders_pending > 0 ? 'alert' : ''}">
                                <span class="pending-count">${pending?.data?.orders_pending || 0}</span>
                                <span class="pending-label">Órdenes por Aprobar</span>
                                <button class="btn btn-sm" onclick="ProcurementManagement.switchTab('orders')">
                                    Ver <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                            <div class="pending-card ${pending?.data?.orders_pending_delivery > 0 ? 'warning' : ''}">
                                <span class="pending-count">${pending?.data?.orders_pending_delivery || 0}</span>
                                <span class="pending-label">Entregas Pendientes</span>
                                <button class="btn btn-sm" onclick="ProcurementManagement.switchTab('receipts')">
                                    Ver <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                            <div class="pending-card ${pending?.data?.invoices_to_pay > 0 ? 'warning' : ''}">
                                <span class="pending-count">${pending?.data?.invoices_to_pay || 0}</span>
                                <span class="pending-label">Facturas por Pagar</span>
                                <button class="btn btn-sm" onclick="ProcurementManagement.switchTab('invoices')">
                                    Ver <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="quick-actions">
                        <h3><i class="fas fa-bolt"></i> Acciones Rápidas</h3>
                        <div class="actions-grid">
                            <button class="action-btn" onclick="ProcurementManagement.showNewRequisitionModal()">
                                <i class="fas fa-plus-circle"></i>
                                <span>Nueva Solicitud</span>
                            </button>
                            <button class="action-btn" onclick="ProcurementManagement.showNewSupplierModal()">
                                <i class="fas fa-user-plus"></i>
                                <span>Nuevo Proveedor</span>
                            </button>
                            <button class="action-btn" onclick="ProcurementManagement.showNewReceiptModal()">
                                <i class="fas fa-truck"></i>
                                <span>Registrar Recepción</span>
                            </button>
                            <button class="action-btn" onclick="ProcurementManagement.showReportsModal()">
                                <i class="fas fa-chart-bar"></i>
                                <span>Ver Reportes</span>
                            </button>
                        </div>
                    </div>

                    <!-- Integrations Status (Plug & Play) -->
                    <div class="integrations-panel">
                        <h3><i class="fas fa-plug"></i> Integraciones Disponibles</h3>
                        <div class="integrations-grid">
                            <div class="integration-card ${this.integrations?.finance ? 'active' : 'inactive'}">
                                <i class="fas fa-landmark"></i>
                                <span class="int-name">Finance SSOT</span>
                                <span class="int-status">${this.integrations?.finance ? '✅ Conectado' : '⚪ No contratado'}</span>
                                ${this.integrations?.finance ?
                                    '<small>Auto-posting de asientos contables</small>' :
                                    '<small>Contabilización manual</small>'}
                            </div>
                            <div class="integration-card ${this.integrations?.warehouse ? 'active' : 'inactive'}">
                                <i class="fas fa-warehouse"></i>
                                <span class="int-name">Almacenes WMS</span>
                                <span class="int-status">${this.integrations?.warehouse ? '✅ Conectado' : '⚪ No contratado'}</span>
                                ${this.integrations?.warehouse ?
                                    '<small>Stock automático en recepciones</small>' :
                                    '<small>Sin gestión de stock</small>'}
                            </div>
                            <div class="integration-card ${this.integrations?.siac ? 'active' : 'inactive'}">
                                <i class="fas fa-file-invoice-dollar"></i>
                                <span class="int-name">SIAC Comercial</span>
                                <span class="int-status">${this.integrations?.siac ? '✅ Conectado' : '⚪ No contratado'}</span>
                                ${this.integrations?.siac ?
                                    '<small>Clientes/Productos compartidos</small>' :
                                    '<small>Catálogo independiente</small>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            content.innerHTML = `<div class="error-message">Error cargando dashboard: ${error.message}</div>`;
        }
    },

    // ========================================
    // REQUISICIONES
    // ========================================

    async renderRequisitions(content) {
        try {
            const response = await this.fetchAPI('/api/procurement/requisitions');
            const requisitions = response?.data || [];

            content.innerHTML = `
                <div class="list-section">
                    <div class="list-toolbar">
                        <div class="filters">
                            <select id="req-status-filter" onchange="ProcurementManagement.filterRequisitions()">
                                <option value="">Todos los estados</option>
                                <option value="draft">Borrador</option>
                                <option value="pending_approval">Pendiente Aprobación</option>
                                <option value="approved">Aprobada</option>
                                <option value="rejected">Rechazada</option>
                                <option value="in_purchase">En Compra</option>
                                <option value="completed">Completada</option>
                            </select>
                            <label>
                                <input type="checkbox" id="req-my-only" onchange="ProcurementManagement.filterRequisitions()">
                                Solo mis solicitudes
                            </label>
                        </div>
                        <button class="btn btn-primary" onclick="ProcurementManagement.showNewRequisitionModal()">
                            <i class="fas fa-plus"></i> Nueva Solicitud
                        </button>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>Título</th>
                                <th>Solicitante</th>
                                <th>Fecha</th>
                                <th>Prioridad</th>
                                <th>Monto Est.</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${requisitions.map(r => `
                                <tr>
                                    <td><strong>${r.requisition_number}</strong></td>
                                    <td>${r.title}</td>
                                    <td>${r.requester_name || 'N/A'}</td>
                                    <td>${this.formatDate(r.created_at)}</td>
                                    <td><span class="priority-badge ${r.priority}">${this.getPriorityLabel(r.priority)}</span></td>
                                    <td>${this.formatCurrency(r.estimated_total)}</td>
                                    <td><span class="status-badge ${r.status}">${this.getStatusLabel(r.status)}</span></td>
                                    <td>
                                        <button class="btn btn-sm" onclick="ProcurementManagement.viewRequisition(${r.id})" title="Ver">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${r.status === 'draft' ? `
                                            <button class="btn btn-sm btn-primary" onclick="ProcurementManagement.editRequisition(${r.id})" title="Editar">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-sm btn-success" onclick="ProcurementManagement.submitRequisition(${r.id})" title="Enviar">
                                                <i class="fas fa-paper-plane"></i>
                                            </button>
                                        ` : ''}
                                        ${r.status === 'pending_approval' ? `
                                            <button class="btn btn-sm btn-success" onclick="ProcurementManagement.approveRequisition(${r.id})" title="Aprobar">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="ProcurementManagement.rejectRequisition(${r.id})" title="Rechazar">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        ` : ''}
                                        ${r.status === 'approved' ? `
                                            <button class="btn btn-sm btn-primary" onclick="ProcurementManagement.createOrderFromRequisition(${r.id})" title="Crear OC">
                                                <i class="fas fa-file-invoice"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            content.innerHTML = `<div class="error-message">Error cargando solicitudes: ${error.message}</div>`;
        }
    },

    // ========================================
    // ÓRDENES DE COMPRA
    // ========================================

    async renderOrders(content) {
        try {
            const response = await this.fetchAPI('/api/procurement/orders');
            const orders = response?.data || [];

            content.innerHTML = `
                <div class="list-section">
                    <div class="list-toolbar">
                        <div class="filters">
                            <select id="order-status-filter" onchange="ProcurementManagement.filterOrders()">
                                <option value="">Todos los estados</option>
                                <option value="draft">Borrador</option>
                                <option value="pending_approval">Pendiente Aprobación</option>
                                <option value="approved">Aprobada</option>
                                <option value="sent">Enviada</option>
                                <option value="acknowledged">Confirmada por Proveedor</option>
                                <option value="partial">Entrega Parcial</option>
                                <option value="received">Recibida</option>
                                <option value="completed">Completada</option>
                            </select>
                            <select id="order-supplier-filter" onchange="ProcurementManagement.filterOrders()">
                                <option value="">Todos los proveedores</option>
                                ${this.cache.suppliers.map(s => `<option value="${s.id}">${s.trade_name || s.legal_name}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Número OC</th>
                                <th>Proveedor</th>
                                <th>Fecha</th>
                                <th>Entrega Est.</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map(o => `
                                <tr>
                                    <td><strong>${o.order_number}</strong></td>
                                    <td>${o.supplier?.trade_name || o.supplier?.legal_name || 'N/A'}</td>
                                    <td>${this.formatDate(o.order_date)}</td>
                                    <td>${this.formatDate(o.expected_delivery_date)}</td>
                                    <td>${this.formatCurrency(o.total_amount)}</td>
                                    <td><span class="status-badge ${o.status}">${this.getStatusLabel(o.status)}</span></td>
                                    <td>
                                        <button class="btn btn-sm" onclick="ProcurementManagement.viewOrder(${o.id})" title="Ver">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${o.status === 'pending_approval' ? `
                                            <button class="btn btn-sm btn-success" onclick="ProcurementManagement.approveOrder(${o.id})" title="Aprobar">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        ` : ''}
                                        ${o.status === 'approved' ? `
                                            <button class="btn btn-sm btn-primary" onclick="ProcurementManagement.sendOrder(${o.id})" title="Enviar">
                                                <i class="fas fa-paper-plane"></i>
                                            </button>
                                        ` : ''}
                                        ${['sent', 'acknowledged', 'partial'].includes(o.status) ? `
                                            <button class="btn btn-sm btn-success" onclick="ProcurementManagement.showReceiptModal(${o.id})" title="Recepcionar">
                                                <i class="fas fa-truck-loading"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-sm" onclick="ProcurementManagement.printOrder(${o.id})" title="Imprimir">
                                            <i class="fas fa-print"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            content.innerHTML = `<div class="error-message">Error cargando órdenes: ${error.message}</div>`;
        }
    },

    // ========================================
    // RECEPCIONES
    // ========================================

    async renderReceipts(content) {
        try {
            const response = await this.fetchAPI('/api/procurement/receipts');
            const receipts = response?.data || [];

            content.innerHTML = `
                <div class="list-section">
                    <div class="list-toolbar">
                        <div class="filters">
                            <select id="receipt-status-filter" onchange="ProcurementManagement.filterReceipts()">
                                <option value="">Todos los estados</option>
                                <option value="pending">Pendiente</option>
                                <option value="confirmed">Confirmada</option>
                                <option value="rejected">Rechazada</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" onclick="ProcurementManagement.showNewReceiptModal()">
                            <i class="fas fa-plus"></i> Nueva Recepción
                        </button>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>OC</th>
                                <th>Remito Proveedor</th>
                                <th>Fecha</th>
                                <th>Recibido por</th>
                                <th>Calidad</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${receipts.map(r => `
                                <tr>
                                    <td><strong>${r.receipt_number}</strong></td>
                                    <td>${r.order?.order_number || 'N/A'}</td>
                                    <td>${r.delivery_note_number || '-'}</td>
                                    <td>${this.formatDate(r.receipt_date)}</td>
                                    <td>${r.received_by_name || 'N/A'}</td>
                                    <td><span class="status-badge ${r.quality_status}">${this.getQualityLabel(r.quality_status)}</span></td>
                                    <td><span class="status-badge ${r.status}">${this.getStatusLabel(r.status)}</span></td>
                                    <td>
                                        <button class="btn btn-sm" onclick="ProcurementManagement.viewReceipt(${r.id})" title="Ver">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${r.status === 'pending' ? `
                                            <button class="btn btn-sm btn-success" onclick="ProcurementManagement.confirmReceipt(${r.id})" title="Confirmar">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        ` : ''}
                                        ${r.status === 'confirmed' && r.quality_status === 'pending' ? `
                                            <button class="btn btn-sm btn-primary" onclick="ProcurementManagement.showQualityModal(${r.id})" title="Control Calidad">
                                                <i class="fas fa-clipboard-check"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            content.innerHTML = `<div class="error-message">Error cargando recepciones: ${error.message}</div>`;
        }
    },

    // ========================================
    // FACTURAS
    // ========================================

    async renderInvoices(content) {
        try {
            const response = await this.fetchAPI('/api/procurement/invoices');
            const invoices = response?.data || [];

            content.innerHTML = `
                <div class="list-section">
                    <div class="list-toolbar">
                        <div class="filters">
                            <select id="invoice-status-filter" onchange="ProcurementManagement.filterInvoices()">
                                <option value="">Todos los estados</option>
                                <option value="pending_verification">Pendiente Verificación</option>
                                <option value="verified">Verificada</option>
                                <option value="disputed">En Disputa</option>
                            </select>
                            <select id="invoice-payment-filter" onchange="ProcurementManagement.filterInvoices()">
                                <option value="">Todos los pagos</option>
                                <option value="pending">Pendiente Pago</option>
                                <option value="partial">Pago Parcial</option>
                                <option value="paid">Pagada</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" onclick="ProcurementManagement.showNewInvoiceModal()">
                            <i class="fas fa-plus"></i> Registrar Factura
                        </button>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>Proveedor</th>
                                <th>Fecha</th>
                                <th>Vencimiento</th>
                                <th>Total</th>
                                <th>Saldo</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoices.map(i => `
                                <tr class="${new Date(i.due_date) < new Date() && i.payment_status !== 'paid' ? 'overdue' : ''}">
                                    <td><strong>${i.invoice_number}</strong></td>
                                    <td>${i.supplier?.trade_name || i.supplier?.legal_name || 'N/A'}</td>
                                    <td>${this.formatDate(i.invoice_date)}</td>
                                    <td>${this.formatDate(i.due_date)}</td>
                                    <td>${this.formatCurrency(i.total_amount)}</td>
                                    <td>${this.formatCurrency(i.balance_due)}</td>
                                    <td>
                                        <span class="status-badge ${i.status}">${this.getStatusLabel(i.status)}</span>
                                        <span class="status-badge ${i.payment_status}">${this.getPaymentLabel(i.payment_status)}</span>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm" onclick="ProcurementManagement.viewInvoice(${i.id})" title="Ver">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${i.status === 'pending_verification' ? `
                                            <button class="btn btn-sm btn-success" onclick="ProcurementManagement.verifyInvoice(${i.id})" title="Verificar">
                                                <i class="fas fa-check-double"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            content.innerHTML = `<div class="error-message">Error cargando facturas: ${error.message}</div>`;
        }
    },

    // ========================================
    // PROVEEDORES
    // ========================================

    async renderSuppliers(content) {
        try {
            const response = await this.fetchAPI('/api/procurement/suppliers');
            const suppliers = response?.data || [];

            content.innerHTML = `
                <div class="list-section">
                    <div class="list-toolbar">
                        <div class="filters">
                            <input type="text" id="supplier-search" placeholder="Buscar proveedor..."
                                   onkeyup="ProcurementManagement.searchSuppliers(this.value)">
                            <select id="supplier-status-filter" onchange="ProcurementManagement.filterSuppliers()">
                                <option value="">Todos los estados</option>
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                                <option value="blocked">Bloqueado</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" onclick="ProcurementManagement.showNewSupplierModal()">
                            <i class="fas fa-plus"></i> Nuevo Proveedor
                        </button>
                    </div>

                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>CUIT</th>
                                <th>Contacto</th>
                                <th>Email</th>
                                <th>Score</th>
                                <th>Portal</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${suppliers.map(s => `
                                <tr>
                                    <td>
                                        <strong>${s.name || s.trade_name || s.legal_name}</strong>
                                        ${s.legal_name && s.legal_name !== s.name ? `<br><small>${s.legal_name}</small>` : ''}
                                    </td>
                                    <td>${s.tax_id || '-'}</td>
                                    <td>${s.contact_name || '-'}</td>
                                    <td>${s.email || s.contact_email || '-'}</td>
                                    <td>
                                        <div class="score-display">
                                            <span class="score-value">${(s.overall_score || s.rating_score || 0).toFixed(1)}</span>
                                            <div class="score-bar">
                                                <div class="score-fill" style="width: ${(s.overall_score || s.rating_score || 0) * 20}%"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        ${s.portal_enabled ?
                                            `<span class="status-badge active" title="Portal activo">
                                                <i class="fas fa-globe"></i> Activo
                                            </span>` :
                                            `<button class="btn btn-sm btn-outline" onclick="ProcurementManagement.enableSupplierPortal(${s.id})"
                                                     title="Habilitar acceso al portal" ${!s.email ? 'disabled' : ''}>
                                                <i class="fas fa-key"></i> Habilitar
                                            </button>`
                                        }
                                    </td>
                                    <td><span class="status-badge ${s.status || (s.is_active ? 'active' : 'inactive')}">${this.getSupplierStatusLabel(s.status || (s.is_active ? 'active' : 'inactive'))}</span></td>
                                    <td>
                                        <button class="btn btn-sm" onclick="ProcurementManagement.viewSupplier(${s.id})" title="Ver">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-sm" onclick="ProcurementManagement.editSupplier(${s.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${s.portal_enabled ? `
                                            <button class="btn btn-sm btn-warning" onclick="ProcurementManagement.resetSupplierPassword(${s.id})" title="Resetear contraseña">
                                                <i class="fas fa-sync"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="ProcurementManagement.disableSupplierPortal(${s.id})" title="Deshabilitar portal">
                                                <i class="fas fa-ban"></i>
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-sm" onclick="ProcurementManagement.viewSupplierHistory(${s.id})" title="Historial">
                                            <i class="fas fa-history"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            content.innerHTML = `<div class="error-message">Error cargando proveedores: ${error.message}</div>`;
        }
    },

    // ========================================
    // MAPEOS DE ARTÍCULOS
    // ========================================

    async renderMappings(content) {
        try {
            const stats = await this.fetchAPI('/api/procurement/item-mappings/stats');

            content.innerHTML = `
                <div class="mappings-section">
                    <div class="stats-row">
                        <div class="stat-card">
                            <span class="stat-value">${stats?.data?.total_mappings || 0}</span>
                            <span class="stat-label">Mapeos Totales</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${stats?.data?.suppliers_with_mappings || 0}</span>
                            <span class="stat-label">Proveedores con Mapeos</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${stats?.data?.products_mapped || 0}</span>
                            <span class="stat-label">Productos Mapeados</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${stats?.data?.active_last_30_days || 0}</span>
                            <span class="stat-label">Activos (30 días)</span>
                        </div>
                    </div>

                    <div class="mapping-tool">
                        <h3><i class="fas fa-exchange-alt"></i> Gestión de Mapeos por Proveedor</h3>
                        <div class="supplier-selector">
                            <label>Seleccione Proveedor:</label>
                            <select id="mapping-supplier" onchange="ProcurementManagement.loadSupplierMappings()">
                                <option value="">-- Seleccionar --</option>
                                ${this.cache.suppliers.map(s => `<option value="${s.id}">${s.trade_name || s.legal_name}</option>`).join('')}
                            </select>
                        </div>
                        <div id="supplier-mappings-content">
                            <p class="hint">Seleccione un proveedor para ver y gestionar sus mapeos de artículos</p>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            content.innerHTML = `<div class="error-message">Error cargando mapeos: ${error.message}</div>`;
        }
    },

    async loadSupplierMappings() {
        const supplierId = document.getElementById('mapping-supplier').value;
        const container = document.getElementById('supplier-mappings-content');

        if (!supplierId) {
            container.innerHTML = '<p class="hint">Seleccione un proveedor para ver y gestionar sus mapeos de artículos</p>';
            return;
        }

        try {
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

            const [mappings, unmapped] = await Promise.all([
                this.fetchAPI(`/api/procurement/item-mappings?supplierId=${supplierId}`),
                this.fetchAPI(`/api/procurement/item-mappings/unmapped/${supplierId}`)
            ]);

            container.innerHTML = `
                <div class="mappings-toolbar">
                    <button class="btn btn-primary" onclick="ProcurementManagement.showNewMappingModal(${supplierId})">
                        <i class="fas fa-plus"></i> Nuevo Mapeo
                    </button>
                    <button class="btn btn-secondary" onclick="ProcurementManagement.importMappings(${supplierId})">
                        <i class="fas fa-upload"></i> Importar desde Excel
                    </button>
                </div>

                ${unmapped?.data?.length > 0 ? `
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>${unmapped.data.length} artículos sin mapear</strong> encontrados en compras anteriores
                        <button class="btn btn-sm" onclick="ProcurementManagement.showUnmappedModal(${supplierId})">
                            Ver y mapear
                        </button>
                    </div>
                ` : ''}

                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Código Proveedor</th>
                            <th>Descripción Proveedor</th>
                            <th>Código Interno</th>
                            <th>Último Precio</th>
                            <th>Lead Time</th>
                            <th>Calidad</th>
                            <th>Preferido</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(mappings?.data || mappings?.items || []).map(m => `
                            <tr>
                                <td><strong>${m.supplier_item_code}</strong></td>
                                <td>${m.supplier_item_description || '-'}</td>
                                <td>${m.internal_product_code || '-'}</td>
                                <td>${this.formatCurrency(m.last_price)}</td>
                                <td>${m.avg_lead_time_days || '-'} días</td>
                                <td>${(m.quality_rating || 0).toFixed(1)} ⭐</td>
                                <td>${m.is_preferred ? '<i class="fas fa-star text-gold"></i>' : '-'}</td>
                                <td>
                                    <button class="btn btn-sm" onclick="ProcurementManagement.editMapping(${m.id})" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="ProcurementManagement.deleteMapping(${m.id})" title="Eliminar">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (error) {
            container.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        }
    },

    // ========================================
    // CONFIGURACIÓN
    // ========================================

    async renderConfig(content) {
        try {
            const [approvalConfig, accountingConfig] = await Promise.all([
                this.fetchAPI('/api/procurement/approval-config'),
                this.fetchAPI('/api/procurement/accounting-config')
            ]);

            content.innerHTML = `
                <div class="config-section">
                    <div class="config-tabs">
                        <button class="config-tab active" data-config="approvals">Aprobaciones</button>
                        <button class="config-tab" data-config="accounting">Contabilidad</button>
                        <button class="config-tab" data-config="general">General</button>
                    </div>

                    <div class="config-content" id="approvals-config">
                        <h3><i class="fas fa-user-check"></i> Configuración de Aprobaciones</h3>
                        <p class="config-description">Configure los niveles de aprobación según tipo de documento y monto</p>

                        <table class="config-table">
                            <thead>
                                <tr>
                                    <th>Documento</th>
                                    <th>Monto Mín</th>
                                    <th>Monto Máx</th>
                                    <th>Nivel</th>
                                    <th>Rol</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(approvalConfig?.data || []).map(c => `
                                    <tr>
                                        <td>${this.getDocumentTypeLabel(c.document_type)}</td>
                                        <td>${this.formatCurrency(c.min_amount)}</td>
                                        <td>${c.max_amount ? this.formatCurrency(c.max_amount) : 'Sin límite'}</td>
                                        <td>Nivel ${c.approval_level}</td>
                                        <td>${c.approval_role_name || c.approval_role}</td>
                                        <td>
                                            <button class="btn btn-sm" onclick="ProcurementManagement.editApprovalConfig(${c.id})">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <button class="btn btn-primary" onclick="ProcurementManagement.showNewApprovalConfigModal()">
                            <i class="fas fa-plus"></i> Agregar Nivel
                        </button>
                    </div>

                    <div class="config-content hidden" id="accounting-config">
                        <h3><i class="fas fa-calculator"></i> Configuración Contable</h3>
                        <p class="config-description">Configure las cuentas contables por tipo de compra</p>

                        <table class="config-table">
                            <thead>
                                <tr>
                                    <th>Tipo de Compra</th>
                                    <th>Cuenta Gasto</th>
                                    <th>Cuenta Activo</th>
                                    <th>Cuenta Proveedor</th>
                                    <th>Umbral Capitalización</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(accountingConfig?.data || []).map(c => `
                                    <tr>
                                        <td>${this.getPurchaseTypeLabel(c.purchase_type)}</td>
                                        <td>${c.expense_account_id || '-'}</td>
                                        <td>${c.asset_account_id || '-'}</td>
                                        <td>${c.liability_account_id || '-'}</td>
                                        <td>${c.capitalize_threshold ? this.formatCurrency(c.capitalize_threshold) : 'N/A'}</td>
                                        <td>
                                            <button class="btn btn-sm" onclick="ProcurementManagement.editAccountingConfig(${c.id})">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <button class="btn btn-primary" onclick="ProcurementManagement.showNewAccountingConfigModal()">
                            <i class="fas fa-plus"></i> Agregar Configuración
                        </button>
                    </div>

                    <div class="config-content hidden" id="general-config">
                        <h3><i class="fas fa-cog"></i> Configuración General</h3>
                        <div class="form-group">
                            <label>Numeración de Solicitudes</label>
                            <input type="text" id="req-prefix" value="SOL-" placeholder="SOL-">
                        </div>
                        <div class="form-group">
                            <label>Numeración de Órdenes</label>
                            <input type="text" id="order-prefix" value="OC-" placeholder="OC-">
                        </div>
                        <div class="form-group">
                            <label>Tolerancia Three-Way Match (%)</label>
                            <input type="number" id="match-tolerance" value="2" min="0" max="10">
                        </div>
                        <button class="btn btn-primary" onclick="ProcurementManagement.saveGeneralConfig()">
                            <i class="fas fa-save"></i> Guardar
                        </button>
                    </div>
                </div>
            `;

            // Config tabs
            content.querySelectorAll('.config-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    const config = e.target.dataset.config;
                    content.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
                    content.querySelectorAll('.config-content').forEach(c => c.classList.add('hidden'));
                    e.target.classList.add('active');
                    document.getElementById(`${config}-config`).classList.remove('hidden');
                });
            });
        } catch (error) {
            content.innerHTML = `<div class="error-message">Error cargando configuración: ${error.message}</div>`;
        }
    },

    // ========================================
    // MODALES
    // ========================================

    showNewRequisitionModal() {
        const modal = this.createModal('Nueva Solicitud de Compra', `
            <form id="new-requisition-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Título *</label>
                        <input type="text" name="title" required placeholder="Descripción breve de la solicitud">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Prioridad</label>
                        <select name="priority">
                            <option value="low">Baja</option>
                            <option value="medium" selected>Media</option>
                            <option value="high">Alta</option>
                            <option value="critical">Crítica</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Fecha Requerida</label>
                        <input type="date" name="required_date">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Sector</label>
                        <select name="sector_id">
                            <option value="">-- Seleccionar --</option>
                            ${this.cache.sectors.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Centro de Costo</label>
                        <select name="finance_cost_center_id">
                            <option value="">-- Seleccionar --</option>
                            ${this.cache.costCenters.map(c => `<option value="${c.id}">${c.code} - ${c.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Depósito Destino</label>
                        <select name="delivery_warehouse_id">
                            <option value="">-- Seleccionar --</option>
                            ${this.cache.warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Justificación</label>
                    <textarea name="justification" rows="3" placeholder="Explique el motivo de la solicitud"></textarea>
                </div>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea name="observations" rows="2"></textarea>
                </div>

                <h4>Items de la Solicitud</h4>
                <div id="requisition-items">
                    <div class="item-row">
                        <input type="text" name="items[0][description]" placeholder="Descripción del item" required>
                        <input type="number" name="items[0][quantity]" placeholder="Cantidad" min="1" required>
                        <input type="text" name="items[0][unit]" placeholder="Unidad" value="UN">
                        <input type="number" name="items[0][estimated_price]" placeholder="Precio Est." step="0.01">
                        <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.item-row').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="ProcurementManagement.addRequisitionItem()">
                    <i class="fas fa-plus"></i> Agregar Item
                </button>
            </form>
        `, [
            { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
            { label: 'Guardar Borrador', class: 'btn-secondary', action: 'saveRequisition(false)' },
            { label: 'Guardar y Enviar', class: 'btn-primary', action: 'saveRequisition(true)' }
        ]);
    },

    addRequisitionItem() {
        const container = document.getElementById('requisition-items');
        const index = container.children.length;
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <input type="text" name="items[${index}][description]" placeholder="Descripción del item" required>
            <input type="number" name="items[${index}][quantity]" placeholder="Cantidad" min="1" required>
            <input type="text" name="items[${index}][unit]" placeholder="Unidad" value="UN">
            <input type="number" name="items[${index}][estimated_price]" placeholder="Precio Est." step="0.01">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.item-row').remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(row);
    },

    async saveRequisition(submit = false) {
        const form = document.getElementById('new-requisition-form');
        const formData = new FormData(form);

        // Parse items
        const items = [];
        document.querySelectorAll('#requisition-items .item-row').forEach((row, i) => {
            items.push({
                description: row.querySelector(`[name="items[${i}][description]"]`)?.value,
                quantity: parseFloat(row.querySelector(`[name="items[${i}][quantity]"]`)?.value) || 1,
                unit: row.querySelector(`[name="items[${i}][unit]"]`)?.value || 'UN',
                estimated_unit_price: parseFloat(row.querySelector(`[name="items[${i}][estimated_price]"]`)?.value) || 0
            });
        });

        const data = {
            title: formData.get('title'),
            priority: formData.get('priority'),
            required_date: formData.get('required_date') || null,
            sector_id: formData.get('sector_id') || null,
            finance_cost_center_id: formData.get('finance_cost_center_id') || null,
            delivery_warehouse_id: formData.get('delivery_warehouse_id') || null,
            justification: formData.get('justification'),
            observations: formData.get('observations'),
            items
        };

        try {
            const response = await this.fetchAPI('/api/procurement/requisitions', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                if (submit) {
                    await this.fetchAPI(`/api/procurement/requisitions/${response.data.id}/submit`, {
                        method: 'POST'
                    });
                    this.showNotification('Solicitud creada y enviada para aprobación', 'success');
                } else {
                    this.showNotification('Solicitud guardada como borrador', 'success');
                }
                this.closeModal();
                this.loadTab('requisitions');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    showNewSupplierModal() {
        const modal = this.createModal('Nuevo Proveedor', `
            <form id="new-supplier-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Razón Social *</label>
                        <input type="text" name="legal_name" required>
                    </div>
                    <div class="form-group">
                        <label>Nombre Comercial</label>
                        <input type="text" name="trade_name">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>CUIT *</label>
                        <input type="text" name="tax_id" required pattern="[0-9-]+" placeholder="XX-XXXXXXXX-X">
                    </div>
                    <div class="form-group">
                        <label>Condición IVA</label>
                        <select name="tax_condition">
                            <option value="responsable_inscripto">Responsable Inscripto</option>
                            <option value="monotributista">Monotributista</option>
                            <option value="exento">Exento</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email">
                    </div>
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" name="phone">
                    </div>
                </div>
                <div class="form-group">
                    <label>Dirección</label>
                    <input type="text" name="address">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ciudad</label>
                        <input type="text" name="city">
                    </div>
                    <div class="form-group">
                        <label>Provincia</label>
                        <input type="text" name="state">
                    </div>
                </div>
                <h4>Datos de Contacto</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre Contacto</label>
                        <input type="text" name="contact_name">
                    </div>
                    <div class="form-group">
                        <label>Teléfono Contacto</label>
                        <input type="tel" name="contact_phone">
                    </div>
                </div>
                <div class="form-group">
                    <label>Email Contacto</label>
                    <input type="email" name="contact_email">
                </div>
                <h4>Datos Bancarios</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Banco</label>
                        <input type="text" name="bank_name">
                    </div>
                    <div class="form-group">
                        <label>CBU</label>
                        <input type="text" name="bank_cbu" maxlength="22">
                    </div>
                </div>
            </form>
        `, [
            { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
            { label: 'Guardar', class: 'btn-primary', action: 'saveSupplier()' }
        ]);
    },

    async saveSupplier() {
        const form = document.getElementById('new-supplier-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Map form fields to database fields
        const supplierData = {
            code: data.supplier_code || `PROV-${Date.now()}`,
            name: data.trade_name || data.legal_name,
            legal_name: data.legal_name,
            tax_id: data.tax_id,
            email: data.email || data.contact_email,
            phone: data.phone || data.contact_phone,
            address: data.address,
            city: data.city,
            contact_name: data.contact_name,
            bank_name: data.bank_name,
            bank_cbu: data.bank_cbu,
            is_active: true
        };

        try {
            const response = await this.fetchAPI('/api/procurement/suppliers', {
                method: 'POST',
                body: JSON.stringify(supplierData)
            });

            if (response.success) {
                this.showNotification('Proveedor creado exitosamente', 'success');
                this.closeModal();
                this.cache.suppliers.push(response.data);
                this.loadTab('suppliers');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================
    // PORTAL DE PROVEEDORES
    // ========================================

    /**
     * Habilita acceso al portal para un proveedor
     * Crea usuario, genera contraseña temporal y envía email de bienvenida
     */
    async enableSupplierPortal(supplierId) {
        if (!confirm('¿Habilitar acceso al portal de proveedores?\n\nSe creará un usuario y se enviarán las credenciales por email.')) {
            return;
        }

        try {
            this.showNotification('Habilitando portal...', 'info');

            const response = await this.fetchAPI(`/api/procurement/suppliers/${supplierId}/enable-portal`, {
                method: 'POST'
            });

            if (response.success) {
                this.showNotification(
                    `Portal habilitado. Credenciales enviadas a ${response.data.portal_user_email}`,
                    'success'
                );
                this.loadTab('suppliers');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    /**
     * Deshabilita acceso al portal para un proveedor
     */
    async disableSupplierPortal(supplierId) {
        if (!confirm('¿Deshabilitar acceso al portal de proveedores?\n\nEl proveedor no podrá ingresar hasta que se vuelva a habilitar.')) {
            return;
        }

        try {
            const response = await this.fetchAPI(`/api/procurement/suppliers/${supplierId}/disable-portal`, {
                method: 'POST'
            });

            if (response.success) {
                this.showNotification('Acceso al portal deshabilitado', 'success');
                this.loadTab('suppliers');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    /**
     * Resetea la contraseña del portal de un proveedor
     */
    async resetSupplierPassword(supplierId) {
        if (!confirm('¿Resetear contraseña del portal?\n\nSe generará una nueva contraseña temporal y se enviará por email.')) {
            return;
        }

        try {
            this.showNotification('Reseteando contraseña...', 'info');

            const response = await this.fetchAPI(`/api/procurement/suppliers/${supplierId}/reset-portal-password`, {
                method: 'POST'
            });

            if (response.success) {
                this.showNotification('Contraseña reseteada. Nuevas credenciales enviadas por email.', 'success');
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================
    // UTILIDADES
    // ========================================

    async fetchAPI(url, options = {}) {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });
        return response.json();
    },

    createModal(title, content, buttons = []) {
        // Cerrar modal anterior si existe
        this.closeModal();

        // Bloquear scroll del body
        document.body.style.overflow = 'hidden';

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'procurement-modal';

        // Estilos inline para garantizar el posicionamiento correcto
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.85) !important;
            backdrop-filter: blur(8px) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999 !important;
            animation: fadeIn 0.2s ease !important;
        `;

        modal.innerHTML = `
            <div class="modal-container" style="
                background: linear-gradient(180deg, #1a1f2e 0%, #0d1117 100%);
                border: 1px solid rgba(245, 158, 11, 0.3);
                border-radius: 16px;
                width: 95%;
                max-width: 700px;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 158, 11, 0.1);
                animation: slideUp 0.3s ease;
            ">
                <div class="modal-header" style="
                    padding: 20px 25px;
                    background: rgba(15, 15, 30, 0.95);
                    border-bottom: 1px solid rgba(245, 158, 11, 0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="
                        margin: 0;
                        color: #f59e0b;
                        font-size: 20px;
                        font-weight: 600;
                    "><i class="fas fa-shopping-cart" style="margin-right: 10px;"></i>${title}</h3>
                    <button class="modal-close" onclick="ProcurementManagement.closeModal()" style="
                        background: transparent;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: rgba(255, 255, 255, 0.6);
                        width: 36px;
                        height: 36px;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                    ">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="
                    padding: 25px;
                    overflow-y: auto;
                    max-height: calc(90vh - 160px);
                    background: rgba(13, 17, 23, 0.95);
                    color: #e6edf3;
                ">
                    ${content}
                </div>
                <div class="modal-footer" style="
                    padding: 18px 25px;
                    background: rgba(15, 15, 30, 0.95);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                ">
                    ${buttons.map(b => `
                        <button class="btn ${b.class}" onclick="ProcurementManagement.${b.action}" style="
                            padding: 12px 24px;
                            border: ${b.class.includes('secondary') ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
                            border-radius: 10px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 14px;
                            background: ${b.class.includes('primary') ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(33, 38, 45, 0.9)'};
                            color: #fff;
                            box-shadow: ${b.class.includes('primary') ? '0 4px 15px rgba(245, 158, 11, 0.3)' : 'none'};
                            transition: all 0.2s;
                        ">
                            ${b.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // Click en overlay cierra el modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // ESC cierra el modal
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        document.body.appendChild(modal);

        // Agregar estilos a los inputs del formulario
        setTimeout(() => {
            const inputs = modal.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.style.cssText = `
                    width: 100%;
                    padding: 14px 16px;
                    background: rgba(30, 35, 45, 0.9);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    color: #e6edf3;
                    font-size: 14px;
                    box-sizing: border-box;
                `;
            });
            const labels = modal.querySelectorAll('label');
            labels.forEach(label => {
                label.style.cssText = `
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                `;
            });
            const formGroups = modal.querySelectorAll('.form-group');
            formGroups.forEach(fg => {
                fg.style.marginBottom = '20px';
            });
            const formRows = modal.querySelectorAll('.form-row');
            formRows.forEach(fr => {
                fr.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                `;
            });
            const h4s = modal.querySelectorAll('h4');
            h4s.forEach(h4 => {
                h4.style.cssText = `
                    color: #f59e0b;
                    font-size: 14px;
                    font-weight: 600;
                    margin: 28px 0 18px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid rgba(245, 158, 11, 0.3);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                `;
            });
        }, 10);

        return modal;
    },

    closeModal() {
        const modal = document.getElementById('procurement-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount || 0);
    },

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-AR');
    },

    getStatusLabel(status) {
        const labels = {
            draft: 'Borrador',
            pending_approval: 'Pend. Aprobación',
            approved: 'Aprobada',
            rejected: 'Rechazada',
            in_quotation: 'En Cotización',
            in_purchase: 'En Compra',
            sent: 'Enviada',
            acknowledged: 'Confirmada',
            partial: 'Parcial',
            received: 'Recibida',
            completed: 'Completada',
            cancelled: 'Cancelada',
            pending: 'Pendiente',
            confirmed: 'Confirmada',
            pending_verification: 'Pend. Verificación',
            verified: 'Verificada',
            disputed: 'En Disputa'
        };
        return labels[status] || status;
    },

    getPriorityLabel(priority) {
        const labels = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' };
        return labels[priority] || priority;
    },

    getQualityLabel(status) {
        const labels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', conditional: 'Condicional' };
        return labels[status] || status;
    },

    getPaymentLabel(status) {
        const labels = { pending: 'Pendiente', partial: 'Parcial', paid: 'Pagada' };
        return labels[status] || status;
    },

    getSupplierStatusLabel(status) {
        const labels = { active: 'Activo', inactive: 'Inactivo', blocked: 'Bloqueado', pending_approval: 'Pend. Aprobación' };
        return labels[status] || status;
    },

    getDocumentTypeLabel(type) {
        const labels = { requisition: 'Solicitud', order: 'Orden de Compra', receipt: 'Recepción', invoice: 'Factura', payment: 'Pago' };
        return labels[type] || type;
    },

    getPurchaseTypeLabel(type) {
        const labels = {
            goods: 'Bienes',
            services: 'Servicios',
            assets: 'Activos Fijos',
            consumables: 'Consumibles',
            raw_materials: 'Materias Primas',
            utilities: 'Servicios Públicos',
            other: 'Otros'
        };
        return labels[type] || type;
    },

    // ========================================
    // ACCIONES DE REQUISICIONES
    // ========================================

    async viewRequisition(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/requisitions/${id}`);
            const req = response.data;

            this.createModal('Detalle de Solicitud', `
                <div class="detail-view">
                    <div class="detail-header">
                        <h4>${req.requisition_number}</h4>
                        <span class="status-badge ${req.status}">${this.getStatusLabel(req.status)}</span>
                    </div>
                    <div class="detail-info">
                        <div class="info-row">
                            <label>Título:</label>
                            <span>${req.title}</span>
                        </div>
                        <div class="info-row">
                            <label>Solicitante:</label>
                            <span>${req.requester_name || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <label>Prioridad:</label>
                            <span class="priority-badge ${req.priority}">${this.getPriorityLabel(req.priority)}</span>
                        </div>
                        <div class="info-row">
                            <label>Fecha Requerida:</label>
                            <span>${this.formatDate(req.required_date)}</span>
                        </div>
                        <div class="info-row">
                            <label>Justificación:</label>
                            <span>${req.justification || '-'}</span>
                        </div>
                        <div class="info-row">
                            <label>Total Estimado:</label>
                            <span>${this.formatCurrency(req.estimated_total)}</span>
                        </div>
                    </div>
                    <h5>Items de la Solicitud</h5>
                    <table class="data-table compact">
                        <thead>
                            <tr><th>#</th><th>Descripción</th><th>Cantidad</th><th>Unidad</th><th>Precio Est.</th><th>Subtotal</th></tr>
                        </thead>
                        <tbody>
                            ${(req.items || []).map((item, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${item.description}</td>
                                    <td>${item.quantity}</td>
                                    <td>${item.unit_of_measure || 'UN'}</td>
                                    <td>${this.formatCurrency(item.estimated_unit_price)}</td>
                                    <td>${this.formatCurrency(item.quantity * (item.estimated_unit_price || 0))}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${req.observations ? `<div class="info-row"><label>Observaciones:</label><span>${req.observations}</span></div>` : ''}
                </div>
            `, [{ label: 'Cerrar', class: 'btn-secondary', action: 'closeModal()' }]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async editRequisition(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/requisitions/${id}`);
            const req = response.data;

            this.createModal('Editar Solicitud', `
                <form id="edit-requisition-form">
                    <input type="hidden" name="id" value="${req.id}">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Título *</label>
                            <input type="text" name="title" value="${req.title || ''}" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Prioridad</label>
                            <select name="priority">
                                <option value="low" ${req.priority === 'low' ? 'selected' : ''}>Baja</option>
                                <option value="medium" ${req.priority === 'medium' ? 'selected' : ''}>Media</option>
                                <option value="high" ${req.priority === 'high' ? 'selected' : ''}>Alta</option>
                                <option value="critical" ${req.priority === 'critical' ? 'selected' : ''}>Crítica</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Fecha Requerida</label>
                            <input type="date" name="required_date" value="${req.required_date ? req.required_date.split('T')[0] : ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Justificación</label>
                        <textarea name="justification" rows="3">${req.justification || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Observaciones</label>
                        <textarea name="observations" rows="2">${req.observations || ''}</textarea>
                    </div>
                </form>
            `, [
                { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
                { label: 'Guardar', class: 'btn-primary', action: `updateRequisition(${id})` }
            ]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async updateRequisition(id) {
        const form = document.getElementById('edit-requisition-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            await this.fetchAPI(`/api/procurement/requisitions/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            this.showNotification('Solicitud actualizada', 'success');
            this.closeModal();
            this.loadTab('requisitions');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async submitRequisition(id) {
        if (!confirm('¿Enviar solicitud para aprobación?')) return;
        try {
            await this.fetchAPI(`/api/procurement/requisitions/${id}/submit`, { method: 'POST' });
            this.showNotification('Solicitud enviada para aprobación', 'success');
            this.loadTab('requisitions');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async approveRequisition(id) {
        if (!confirm('¿Aprobar esta solicitud?')) return;
        try {
            await this.fetchAPI(`/api/procurement/requisitions/${id}/approve`, {
                method: 'POST',
                body: JSON.stringify({ comments: '' })
            });
            this.showNotification('Solicitud aprobada', 'success');
            this.loadTab('requisitions');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async rejectRequisition(id) {
        const reason = prompt('Motivo del rechazo:');
        if (!reason) return;
        try {
            await this.fetchAPI(`/api/procurement/requisitions/${id}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });
            this.showNotification('Solicitud rechazada', 'success');
            this.loadTab('requisitions');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async createOrderFromRequisition(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/requisitions/${id}`);
            const req = response.data;

            this.createModal('Crear Orden de Compra', `
                <form id="create-order-form">
                    <input type="hidden" name="requisitionId" value="${id}">
                    <div class="info-banner">
                        <i class="fas fa-info-circle"></i>
                        Creando OC desde solicitud <strong>${req.requisition_number}</strong>
                    </div>
                    <div class="form-group">
                        <label>Proveedor *</label>
                        <select name="supplierId" required>
                            <option value="">-- Seleccionar proveedor --</option>
                            ${this.cache.suppliers.map(s => `<option value="${s.id}">${s.trade_name || s.legal_name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Fecha Entrega Esperada</label>
                        <input type="date" name="expectedDeliveryDate">
                    </div>
                    <h5>Items a incluir en la OC</h5>
                    <table class="data-table compact">
                        <thead><tr><th>Incluir</th><th>Descripción</th><th>Cantidad</th><th>Precio Unit.</th></tr></thead>
                        <tbody>
                            ${(req.items || []).map((item, i) => `
                                <tr>
                                    <td><input type="checkbox" name="items[${i}][include]" checked></td>
                                    <td>${item.description}<input type="hidden" name="items[${i}][description]" value="${item.description}"></td>
                                    <td><input type="number" name="items[${i}][quantity]" value="${item.quantity}" style="width:80px"></td>
                                    <td><input type="number" name="items[${i}][unit_price]" value="${item.estimated_unit_price || 0}" step="0.01" style="width:100px"></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="form-group">
                        <label>Condiciones de Pago</label>
                        <select name="paymentTerms">
                            <option value="contado">Contado</option>
                            <option value="30_dias">30 días</option>
                            <option value="60_dias">60 días</option>
                            <option value="anticipo">Con anticipo</option>
                        </select>
                    </div>
                </form>
            `, [
                { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
                { label: 'Crear Orden', class: 'btn-primary', action: 'submitCreateOrder()' }
            ]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async submitCreateOrder() {
        const form = document.getElementById('create-order-form');
        const formData = new FormData(form);
        const items = [];

        document.querySelectorAll('#create-order-form tbody tr').forEach((row, i) => {
            const include = row.querySelector(`[name="items[${i}][include]"]`)?.checked;
            if (include) {
                items.push({
                    description: row.querySelector(`[name="items[${i}][description]"]`)?.value,
                    quantity: parseFloat(row.querySelector(`[name="items[${i}][quantity]"]`)?.value) || 1,
                    unit_price: parseFloat(row.querySelector(`[name="items[${i}][unit_price]"]`)?.value) || 0
                });
            }
        });

        try {
            await this.fetchAPI('/api/procurement/orders', {
                method: 'POST',
                body: JSON.stringify({
                    requisitionId: formData.get('requisitionId'),
                    supplierId: formData.get('supplierId'),
                    expectedDeliveryDate: formData.get('expectedDeliveryDate'),
                    paymentTerms: formData.get('paymentTerms'),
                    items
                })
            });
            this.showNotification('Orden de compra creada', 'success');
            this.closeModal();
            this.switchTab('orders');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================
    // ACCIONES DE ÓRDENES
    // ========================================

    async viewOrder(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/orders/${id}`);
            const order = response.data;

            this.createModal('Detalle de Orden de Compra', `
                <div class="detail-view">
                    <div class="detail-header">
                        <h4>${order.order_number}</h4>
                        <span class="status-badge ${order.status}">${this.getStatusLabel(order.status)}</span>
                    </div>
                    <div class="detail-grid">
                        <div class="info-row"><label>Proveedor:</label><span>${order.supplier?.trade_name || order.supplier?.legal_name || 'N/A'}</span></div>
                        <div class="info-row"><label>Fecha Orden:</label><span>${this.formatDate(order.order_date)}</span></div>
                        <div class="info-row"><label>Entrega Esperada:</label><span>${this.formatDate(order.expected_delivery_date)}</span></div>
                        <div class="info-row"><label>Total:</label><span class="amount">${this.formatCurrency(order.total_amount)}</span></div>
                    </div>
                    <h5>Items</h5>
                    <table class="data-table compact">
                        <thead><tr><th>Descripción</th><th>Cantidad</th><th>P. Unitario</th><th>Subtotal</th></tr></thead>
                        <tbody>
                            ${(order.items || []).map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td>${item.quantity} ${item.unit_of_measure || 'UN'}</td>
                                    <td>${this.formatCurrency(item.unit_price)}</td>
                                    <td>${this.formatCurrency(item.total_price)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `, [{ label: 'Cerrar', class: 'btn-secondary', action: 'closeModal()' }]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async approveOrder(id) {
        if (!confirm('¿Aprobar esta orden de compra?')) return;
        try {
            await this.fetchAPI(`/api/procurement/orders/${id}/approve`, {
                method: 'POST',
                body: JSON.stringify({})
            });
            this.showNotification('Orden aprobada', 'success');
            this.loadTab('orders');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async sendOrder(id) {
        if (!confirm('¿Enviar esta orden al proveedor?')) return;
        try {
            await this.fetchAPI(`/api/procurement/orders/${id}/send`, {
                method: 'POST'
            });
            this.showNotification('Orden enviada al proveedor', 'success');
            this.loadTab('orders');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async printOrder(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/orders/${id}`);
            const order = response.data;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Orden de Compra ${order.order_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .header-info { display: flex; justify-content: space-between; margin: 20px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #f5f5f5; }
                        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
                        @media print { button { display: none; } }
                    </style>
                </head>
                <body>
                    <h1>ORDEN DE COMPRA</h1>
                    <div class="header-info">
                        <div><strong>N°:</strong> ${order.order_number}</div>
                        <div><strong>Fecha:</strong> ${this.formatDate(order.order_date)}</div>
                    </div>
                    <div><strong>Proveedor:</strong> ${order.supplier?.trade_name || order.supplier?.legal_name}</div>
                    <div><strong>CUIT:</strong> ${order.supplier?.tax_id || '-'}</div>
                    <div><strong>Entrega estimada:</strong> ${this.formatDate(order.expected_delivery_date)}</div>
                    <table>
                        <thead><tr><th>Descripción</th><th>Cantidad</th><th>P. Unitario</th><th>Subtotal</th></tr></thead>
                        <tbody>
                            ${(order.items || []).map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td>${item.quantity}</td>
                                    <td>$ ${(item.unit_price || 0).toFixed(2)}</td>
                                    <td>$ ${(item.total_price || 0).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="total">TOTAL: ${this.formatCurrency(order.total_amount)}</div>
                    <button onclick="window.print()">Imprimir</button>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================
    // ACCIONES DE RECEPCIONES
    // ========================================

    async showReceiptModal(orderId) {
        try {
            const response = await this.fetchAPI(`/api/procurement/orders/${orderId}`);
            const order = response.data;

            this.createModal('Registrar Recepción', `
                <form id="receipt-form">
                    <input type="hidden" name="orderId" value="${orderId}">
                    <div class="info-banner">
                        <i class="fas fa-truck"></i>
                        Recepcionando OC <strong>${order.order_number}</strong> de ${order.supplier?.trade_name || order.supplier?.legal_name}
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>N° Remito Proveedor</label>
                            <input type="text" name="deliveryNoteNumber" placeholder="Número del remito del proveedor">
                        </div>
                        <div class="form-group">
                            <label>Fecha Recepción</label>
                            <input type="date" name="receiptDate" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Depósito de Recepción</label>
                        <select name="warehouseId">
                            ${this.cache.warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                        </select>
                    </div>
                    <h5>Items Recibidos</h5>
                    <table class="data-table compact">
                        <thead><tr><th>Descripción</th><th>Esperado</th><th>Recibido</th><th>Estado</th></tr></thead>
                        <tbody>
                            ${(order.items || []).map((item, i) => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td>${item.quantity}</td>
                                    <td><input type="number" name="items[${i}][receivedQty]" value="${item.quantity}" min="0" style="width:80px"></td>
                                    <td>
                                        <select name="items[${i}][status]">
                                            <option value="ok">OK</option>
                                            <option value="damaged">Dañado</option>
                                            <option value="wrong_item">Artículo incorrecto</option>
                                            <option value="missing">Faltante</option>
                                        </select>
                                        <input type="hidden" name="items[${i}][orderItemId]" value="${item.id}">
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="form-group">
                        <label>Observaciones</label>
                        <textarea name="notes" rows="2"></textarea>
                    </div>
                </form>
            `, [
                { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
                { label: 'Registrar Recepción', class: 'btn-primary', action: 'submitReceipt()' }
            ]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async submitReceipt() {
        const form = document.getElementById('receipt-form');
        const formData = new FormData(form);
        const items = [];

        document.querySelectorAll('#receipt-form tbody tr').forEach((row, i) => {
            items.push({
                orderItemId: row.querySelector(`[name="items[${i}][orderItemId]"]`)?.value,
                receivedQty: parseFloat(row.querySelector(`[name="items[${i}][receivedQty]"]`)?.value) || 0,
                status: row.querySelector(`[name="items[${i}][status]"]`)?.value
            });
        });

        try {
            await this.fetchAPI('/api/procurement/receipts', {
                method: 'POST',
                body: JSON.stringify({
                    orderId: formData.get('orderId'),
                    deliveryNoteNumber: formData.get('deliveryNoteNumber'),
                    receiptDate: formData.get('receiptDate'),
                    warehouseId: formData.get('warehouseId'),
                    notes: formData.get('notes'),
                    items
                })
            });
            this.showNotification('Recepción registrada', 'success');
            this.closeModal();
            this.switchTab('receipts');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    showNewReceiptModal() {
        this.createModal('Nueva Recepción (sin OC)', `
            <form id="internal-receipt-form">
                <div class="form-group">
                    <label>Proveedor *</label>
                    <select name="supplierId" required>
                        <option value="">-- Seleccionar --</option>
                        ${this.cache.suppliers.map(s => `<option value="${s.id}">${s.trade_name || s.legal_name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>N° Remito Proveedor</label>
                        <input type="text" name="deliveryNoteNumber">
                    </div>
                    <div class="form-group">
                        <label>Fecha Recepción</label>
                        <input type="date" name="receiptDate" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Depósito</label>
                    <select name="warehouseId">
                        ${this.cache.warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                    </select>
                </div>
                <h5>Items</h5>
                <div id="internal-receipt-items">
                    <div class="item-row">
                        <input type="text" name="items[0][description]" placeholder="Descripción" required style="flex:2">
                        <input type="number" name="items[0][quantity]" placeholder="Cant." min="1" required style="width:80px">
                        <input type="text" name="items[0][unit]" placeholder="Unidad" value="UN" style="width:60px">
                        <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.item-row').remove()"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" onclick="ProcurementManagement.addInternalReceiptItem()">
                    <i class="fas fa-plus"></i> Agregar Item
                </button>
            </form>
        `, [
            { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
            { label: 'Registrar', class: 'btn-primary', action: 'submitInternalReceipt()' }
        ]);
    },

    addInternalReceiptItem() {
        const container = document.getElementById('internal-receipt-items');
        const index = container.children.length;
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <input type="text" name="items[${index}][description]" placeholder="Descripción" required style="flex:2">
            <input type="number" name="items[${index}][quantity]" placeholder="Cant." min="1" required style="width:80px">
            <input type="text" name="items[${index}][unit]" placeholder="Unidad" value="UN" style="width:60px">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.item-row').remove()"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(row);
    },

    async submitInternalReceipt() {
        const form = document.getElementById('internal-receipt-form');
        const formData = new FormData(form);
        const items = [];

        document.querySelectorAll('#internal-receipt-items .item-row').forEach((row, i) => {
            items.push({
                description: row.querySelector(`[name="items[${i}][description]"]`)?.value,
                quantity: parseFloat(row.querySelector(`[name="items[${i}][quantity]"]`)?.value) || 1,
                unit: row.querySelector(`[name="items[${i}][unit]"]`)?.value || 'UN'
            });
        });

        try {
            await this.fetchAPI('/api/procurement/internal-receipts', {
                method: 'POST',
                body: JSON.stringify({
                    supplierId: formData.get('supplierId'),
                    deliveryNoteNumber: formData.get('deliveryNoteNumber'),
                    receiptDate: formData.get('receiptDate'),
                    warehouseId: formData.get('warehouseId'),
                    items
                })
            });
            this.showNotification('Recepción interna registrada', 'success');
            this.closeModal();
            this.loadTab('receipts');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async viewReceipt(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/receipts/${id}`);
            const receipt = response.data;

            this.createModal('Detalle de Recepción', `
                <div class="detail-view">
                    <div class="detail-header">
                        <h4>${receipt.receipt_number}</h4>
                        <span class="status-badge ${receipt.status}">${this.getStatusLabel(receipt.status)}</span>
                    </div>
                    <div class="detail-grid">
                        <div class="info-row"><label>OC:</label><span>${receipt.order?.order_number || 'N/A'}</span></div>
                        <div class="info-row"><label>Remito Proveedor:</label><span>${receipt.delivery_note_number || '-'}</span></div>
                        <div class="info-row"><label>Fecha:</label><span>${this.formatDate(receipt.receipt_date)}</span></div>
                        <div class="info-row"><label>Recibido por:</label><span>${receipt.received_by_name || 'N/A'}</span></div>
                    </div>
                    <h5>Items Recibidos</h5>
                    <table class="data-table compact">
                        <thead><tr><th>Descripción</th><th>Cantidad</th><th>Estado</th></tr></thead>
                        <tbody>
                            ${(receipt.items || []).map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td>${item.received_quantity}</td>
                                    <td><span class="status-badge ${item.quality_status || 'pending'}">${item.quality_status || 'Pendiente'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `, [{ label: 'Cerrar', class: 'btn-secondary', action: 'closeModal()' }]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async confirmReceipt(id) {
        if (!confirm('¿Confirmar esta recepción?')) return;
        try {
            await this.fetchAPI(`/api/procurement/receipts/${id}/confirm`, { method: 'POST' });
            this.showNotification('Recepción confirmada', 'success');
            this.loadTab('receipts');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async showQualityModal(id) {
        this.createModal('Control de Calidad', `
            <form id="quality-form">
                <input type="hidden" name="receiptId" value="${id}">
                <div class="form-group">
                    <label>Estado de Calidad</label>
                    <select name="qualityStatus" required>
                        <option value="approved">Aprobado</option>
                        <option value="conditional">Aprobado con observaciones</option>
                        <option value="rejected">Rechazado</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Observaciones del Control</label>
                    <textarea name="qualityNotes" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>Responsable del Control</label>
                    <input type="text" name="qualityInspector">
                </div>
            </form>
        `, [
            { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
            { label: 'Registrar Control', class: 'btn-primary', action: 'submitQualityControl()' }
        ]);
    },

    async submitQualityControl() {
        const form = document.getElementById('quality-form');
        const formData = new FormData(form);

        try {
            await this.fetchAPI(`/api/procurement/receipts/${formData.get('receiptId')}/quality`, {
                method: 'POST',
                body: JSON.stringify({
                    qualityStatus: formData.get('qualityStatus'),
                    qualityNotes: formData.get('qualityNotes'),
                    qualityInspector: formData.get('qualityInspector')
                })
            });
            this.showNotification('Control de calidad registrado', 'success');
            this.closeModal();
            this.loadTab('receipts');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================
    // ACCIONES DE FACTURAS
    // ========================================

    showNewInvoiceModal() {
        this.createModal('Registrar Factura de Compra', `
            <form id="new-invoice-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Proveedor *</label>
                        <select name="supplierId" required onchange="ProcurementManagement.loadSupplierOrders(this.value)">
                            <option value="">-- Seleccionar --</option>
                            ${this.cache.suppliers.map(s => `<option value="${s.id}">${s.trade_name || s.legal_name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>N° Factura *</label>
                        <input type="text" name="invoiceNumber" required placeholder="A-00001-00000001">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha Factura</label>
                        <input type="date" name="invoiceDate" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Fecha Vencimiento</label>
                        <input type="date" name="dueDate">
                    </div>
                </div>
                <div class="form-group">
                    <label>OC Relacionada</label>
                    <select name="orderId" id="invoice-order-select">
                        <option value="">-- Sin OC --</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Subtotal *</label>
                        <input type="number" name="subtotal" step="0.01" required onchange="ProcurementManagement.calculateInvoiceTotal()">
                    </div>
                    <div class="form-group">
                        <label>IVA</label>
                        <input type="number" name="taxAmount" step="0.01" value="0" onchange="ProcurementManagement.calculateInvoiceTotal()">
                    </div>
                    <div class="form-group">
                        <label>Total</label>
                        <input type="number" name="totalAmount" step="0.01" readonly>
                    </div>
                </div>
            </form>
        `, [
            { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
            { label: 'Registrar', class: 'btn-primary', action: 'submitNewInvoice()' }
        ]);
    },

    async loadSupplierOrders(supplierId) {
        if (!supplierId) return;
        try {
            const response = await this.fetchAPI(`/api/procurement/orders?supplierId=${supplierId}&status=received`);
            const select = document.getElementById('invoice-order-select');
            select.innerHTML = '<option value="">-- Sin OC --</option>';
            (response.data || []).forEach(order => {
                select.innerHTML += `<option value="${order.id}">${order.order_number} - ${this.formatCurrency(order.total_amount)}</option>`;
            });
        } catch (error) {
            console.error('Error cargando órdenes:', error);
        }
    },

    calculateInvoiceTotal() {
        const subtotal = parseFloat(document.querySelector('[name="subtotal"]')?.value) || 0;
        const tax = parseFloat(document.querySelector('[name="taxAmount"]')?.value) || 0;
        document.querySelector('[name="totalAmount"]').value = (subtotal + tax).toFixed(2);
    },

    async submitNewInvoice() {
        const form = document.getElementById('new-invoice-form');
        const formData = new FormData(form);

        try {
            await this.fetchAPI('/api/procurement/invoices', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData.entries()))
            });
            this.showNotification('Factura registrada', 'success');
            this.closeModal();
            this.loadTab('invoices');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async viewInvoice(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/invoices/${id}`);
            const invoice = response.data;

            this.createModal('Detalle de Factura', `
                <div class="detail-view">
                    <div class="detail-header">
                        <h4>${invoice.invoice_number}</h4>
                        <div>
                            <span class="status-badge ${invoice.status}">${this.getStatusLabel(invoice.status)}</span>
                            <span class="status-badge ${invoice.payment_status}">${this.getPaymentLabel(invoice.payment_status)}</span>
                        </div>
                    </div>
                    <div class="detail-grid">
                        <div class="info-row"><label>Proveedor:</label><span>${invoice.supplier?.trade_name || invoice.supplier?.legal_name}</span></div>
                        <div class="info-row"><label>Fecha:</label><span>${this.formatDate(invoice.invoice_date)}</span></div>
                        <div class="info-row"><label>Vencimiento:</label><span>${this.formatDate(invoice.due_date)}</span></div>
                        <div class="info-row"><label>OC:</label><span>${invoice.order?.order_number || '-'}</span></div>
                    </div>
                    <div class="amounts-summary">
                        <div class="amount-row"><label>Subtotal:</label><span>${this.formatCurrency(invoice.subtotal)}</span></div>
                        <div class="amount-row"><label>IVA:</label><span>${this.formatCurrency(invoice.tax_amount)}</span></div>
                        <div class="amount-row total"><label>Total:</label><span>${this.formatCurrency(invoice.total_amount)}</span></div>
                        <div class="amount-row"><label>Pagado:</label><span>${this.formatCurrency(invoice.paid_amount || 0)}</span></div>
                        <div class="amount-row balance"><label>Saldo:</label><span>${this.formatCurrency(invoice.balance_due)}</span></div>
                    </div>
                </div>
            `, [{ label: 'Cerrar', class: 'btn-secondary', action: 'closeModal()' }]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async verifyInvoice(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/invoices/${id}/three-way-match`);
            const match = response.data;

            const allOk = match.order_match && match.receipt_match && match.price_match;

            this.createModal('Verificación Three-Way Match', `
                <div class="three-way-match">
                    <div class="match-item ${match.order_match ? 'success' : 'error'}">
                        <i class="fas fa-${match.order_match ? 'check-circle' : 'times-circle'}"></i>
                        <span>Coincidencia con OC</span>
                        <small>${match.order_details || ''}</small>
                    </div>
                    <div class="match-item ${match.receipt_match ? 'success' : 'error'}">
                        <i class="fas fa-${match.receipt_match ? 'check-circle' : 'times-circle'}"></i>
                        <span>Coincidencia con Recepción</span>
                        <small>${match.receipt_details || ''}</small>
                    </div>
                    <div class="match-item ${match.price_match ? 'success' : 'warning'}">
                        <i class="fas fa-${match.price_match ? 'check-circle' : 'exclamation-circle'}"></i>
                        <span>Verificación de Precios</span>
                        <small>Tolerancia: ${match.tolerance || '2%'}, Diferencia: ${match.price_difference || '0%'}</small>
                    </div>
                    ${allOk ? '<div class="match-success"><i class="fas fa-check-double"></i> Factura verificada correctamente</div>' :
                             '<div class="match-warning"><i class="fas fa-exclamation-triangle"></i> Hay discrepancias que requieren revisión</div>'}
                </div>
            `, [
                { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
                allOk ? { label: 'Aprobar Factura', class: 'btn-success', action: `approveInvoice(${id})` } :
                        { label: 'Marcar en Disputa', class: 'btn-warning', action: `disputeInvoice(${id})` }
            ]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async approveInvoice(id) {
        try {
            await this.fetchAPI(`/api/procurement/invoices/${id}/verify`, {
                method: 'POST',
                body: JSON.stringify({ status: 'verified' })
            });
            this.showNotification('Factura verificada y aprobada', 'success');
            this.closeModal();
            this.loadTab('invoices');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async disputeInvoice(id) {
        const reason = prompt('Motivo de la disputa:');
        if (!reason) return;
        try {
            await this.fetchAPI(`/api/procurement/invoices/${id}/dispute`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });
            this.showNotification('Factura marcada en disputa', 'warning');
            this.closeModal();
            this.loadTab('invoices');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================
    // ACCIONES DE PROVEEDORES
    // ========================================

    async viewSupplier(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/suppliers/${id}`);
            const supplier = response.data;

            this.createModal('Detalle de Proveedor', `
                <div class="detail-view">
                    <div class="detail-header">
                        <h4>${supplier.trade_name || supplier.legal_name}</h4>
                        <span class="status-badge ${supplier.status}">${this.getSupplierStatusLabel(supplier.status)}</span>
                    </div>
                    <div class="detail-grid">
                        <div class="info-row"><label>Razón Social:</label><span>${supplier.legal_name}</span></div>
                        <div class="info-row"><label>CUIT:</label><span>${supplier.tax_id || '-'}</span></div>
                        <div class="info-row"><label>Email:</label><span>${supplier.email || '-'}</span></div>
                        <div class="info-row"><label>Teléfono:</label><span>${supplier.phone || '-'}</span></div>
                        <div class="info-row"><label>Dirección:</label><span>${supplier.address || '-'}</span></div>
                        <div class="info-row"><label>Ciudad:</label><span>${supplier.city || '-'}, ${supplier.state || '-'}</span></div>
                    </div>
                    <h5>Contacto</h5>
                    <div class="detail-grid">
                        <div class="info-row"><label>Nombre:</label><span>${supplier.contact_name || '-'}</span></div>
                        <div class="info-row"><label>Teléfono:</label><span>${supplier.contact_phone || '-'}</span></div>
                        <div class="info-row"><label>Email:</label><span>${supplier.contact_email || '-'}</span></div>
                    </div>
                    <h5>Scoring</h5>
                    <div class="score-detail">
                        <div class="score-item"><label>General:</label><span>${(supplier.overall_score || 0).toFixed(1)}/5</span></div>
                        <div class="score-item"><label>Calidad:</label><span>${(supplier.quality_score || 0).toFixed(1)}/5</span></div>
                        <div class="score-item"><label>Entrega:</label><span>${(supplier.delivery_score || 0).toFixed(1)}/5</span></div>
                        <div class="score-item"><label>Precio:</label><span>${(supplier.price_score || 0).toFixed(1)}/5</span></div>
                    </div>
                </div>
            `, [{ label: 'Cerrar', class: 'btn-secondary', action: 'closeModal()' }]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async editSupplier(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/suppliers/${id}`);
            const s = response.data;

            this.createModal('Editar Proveedor', `
                <form id="edit-supplier-form">
                    <input type="hidden" name="id" value="${s.id}">
                    <div class="form-row">
                        <div class="form-group"><label>Razón Social *</label><input type="text" name="legal_name" value="${s.legal_name || ''}" required></div>
                        <div class="form-group"><label>Nombre Comercial</label><input type="text" name="trade_name" value="${s.trade_name || ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>CUIT *</label><input type="text" name="tax_id" value="${s.tax_id || ''}" required></div>
                        <div class="form-group">
                            <label>Condición IVA</label>
                            <select name="tax_condition">
                                <option value="responsable_inscripto" ${s.tax_condition === 'responsable_inscripto' ? 'selected' : ''}>Responsable Inscripto</option>
                                <option value="monotributista" ${s.tax_condition === 'monotributista' ? 'selected' : ''}>Monotributista</option>
                                <option value="exento" ${s.tax_condition === 'exento' ? 'selected' : ''}>Exento</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Email</label><input type="email" name="email" value="${s.email || ''}"></div>
                        <div class="form-group"><label>Teléfono</label><input type="tel" name="phone" value="${s.phone || ''}"></div>
                    </div>
                    <div class="form-group"><label>Dirección</label><input type="text" name="address" value="${s.address || ''}"></div>
                    <div class="form-row">
                        <div class="form-group"><label>Ciudad</label><input type="text" name="city" value="${s.city || ''}"></div>
                        <div class="form-group"><label>Provincia</label><input type="text" name="state" value="${s.state || ''}"></div>
                    </div>
                    <div class="form-group">
                        <label>Estado</label>
                        <select name="status">
                            <option value="active" ${s.status === 'active' ? 'selected' : ''}>Activo</option>
                            <option value="inactive" ${s.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
                            <option value="blocked" ${s.status === 'blocked' ? 'selected' : ''}>Bloqueado</option>
                        </select>
                    </div>
                </form>
            `, [
                { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
                { label: 'Guardar', class: 'btn-primary', action: `updateSupplier(${id})` }
            ]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async updateSupplier(id) {
        const form = document.getElementById('edit-supplier-form');
        const formData = new FormData(form);

        try {
            await this.fetchAPI(`/api/procurement/suppliers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(Object.fromEntries(formData.entries()))
            });
            this.showNotification('Proveedor actualizado', 'success');
            this.closeModal();
            this.loadTab('suppliers');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async viewSupplierHistory(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/suppliers/${id}/history`);
            const history = response.data;

            this.createModal('Historial del Proveedor', `
                <div class="history-view">
                    <div class="history-stats">
                        <div class="stat"><label>Total OC:</label><span>${history.total_orders || 0}</span></div>
                        <div class="stat"><label>Total Comprado:</label><span>${this.formatCurrency(history.total_amount || 0)}</span></div>
                        <div class="stat"><label>Última OC:</label><span>${this.formatDate(history.last_order_date)}</span></div>
                    </div>
                    <h5>Últimas Órdenes</h5>
                    <table class="data-table compact">
                        <thead><tr><th>N° OC</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
                        <tbody>
                            ${(history.recent_orders || []).map(o => `
                                <tr>
                                    <td>${o.order_number}</td>
                                    <td>${this.formatDate(o.order_date)}</td>
                                    <td>${this.formatCurrency(o.total_amount)}</td>
                                    <td><span class="status-badge ${o.status}">${this.getStatusLabel(o.status)}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `, [{ label: 'Cerrar', class: 'btn-secondary', action: 'closeModal()' }]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async showSupplierMappings(id) {
        document.getElementById('mapping-supplier').value = id;
        this.switchTab('mappings');
        this.loadSupplierMappings();
    },

    // ========================================
    // ACCIONES DE MAPEOS
    // ========================================

    async showNewMappingModal(supplierId) {
        this.createModal('Nuevo Mapeo de Artículo', `
            <form id="new-mapping-form">
                <input type="hidden" name="supplierId" value="${supplierId}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Código Proveedor *</label>
                        <input type="text" name="supplierItemCode" required placeholder="SKU del proveedor">
                    </div>
                    <div class="form-group">
                        <label>Código Interno</label>
                        <input type="text" name="internalProductCode" placeholder="SKU interno WMS">
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción Proveedor</label>
                    <input type="text" name="supplierItemDescription">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Último Precio</label>
                        <input type="number" name="lastPrice" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Lead Time (días)</label>
                        <input type="number" name="avgLeadTimeDays" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" name="isPreferred"> Proveedor preferido para este artículo</label>
                </div>
            </form>
        `, [
            { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
            { label: 'Guardar', class: 'btn-primary', action: 'submitNewMapping()' }
        ]);
    },

    async submitNewMapping() {
        const form = document.getElementById('new-mapping-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.isPreferred = form.querySelector('[name="isPreferred"]').checked;

        try {
            await this.fetchAPI('/api/procurement/item-mappings', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            this.showNotification('Mapeo creado', 'success');
            this.closeModal();
            this.loadSupplierMappings();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async importMappings(supplierId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('supplierId', supplierId);

            try {
                const response = await fetch('/api/procurement/item-mappings/import', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    this.showNotification(`${result.imported} mapeos importados`, 'success');
                    this.loadSupplierMappings();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                this.showNotification(`Error: ${error.message}`, 'error');
            }
        };
        input.click();
    },

    async showUnmappedModal(supplierId) {
        try {
            const response = await this.fetchAPI(`/api/procurement/item-mappings/unmapped/${supplierId}`);
            const unmapped = response.data || [];

            this.createModal('Artículos Sin Mapear', `
                <p>Los siguientes códigos de proveedor no tienen mapeo interno:</p>
                <table class="data-table compact">
                    <thead><tr><th>Código Proveedor</th><th>Última Compra</th><th>Acción</th></tr></thead>
                    <tbody>
                        ${unmapped.map(item => `
                            <tr>
                                <td>${item.supplier_item_code}</td>
                                <td>${this.formatDate(item.last_purchase_date)}</td>
                                <td><button class="btn btn-sm btn-primary" onclick="ProcurementManagement.quickMapItem('${item.supplier_item_code}', ${supplierId})">Mapear</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `, [{ label: 'Cerrar', class: 'btn-secondary', action: 'closeModal()' }]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async quickMapItem(supplierCode, supplierId) {
        const internalCode = prompt(`Ingrese el código interno para "${supplierCode}":`);
        if (!internalCode) return;

        try {
            await this.fetchAPI('/api/procurement/item-mappings', {
                method: 'POST',
                body: JSON.stringify({
                    supplierId,
                    supplierItemCode: supplierCode,
                    internalProductCode: internalCode
                })
            });
            this.showNotification('Mapeo creado', 'success');
            this.closeModal();
            this.loadSupplierMappings();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async editMapping(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/item-mappings/${id}`);
            const m = response.data;

            this.createModal('Editar Mapeo', `
                <form id="edit-mapping-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Código Proveedor</label>
                            <input type="text" name="supplierItemCode" value="${m.supplier_item_code}" readonly>
                        </div>
                        <div class="form-group">
                            <label>Código Interno</label>
                            <input type="text" name="internalProductCode" value="${m.internal_product_code || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Descripción</label>
                        <input type="text" name="supplierItemDescription" value="${m.supplier_item_description || ''}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Último Precio</label>
                            <input type="number" name="lastPrice" step="0.01" value="${m.last_price || ''}">
                        </div>
                        <div class="form-group">
                            <label>Lead Time (días)</label>
                            <input type="number" name="avgLeadTimeDays" value="${m.avg_lead_time_days || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" name="isPreferred" ${m.is_preferred ? 'checked' : ''}> Proveedor preferido</label>
                    </div>
                </form>
            `, [
                { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
                { label: 'Guardar', class: 'btn-primary', action: `updateMapping(${id})` }
            ]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async updateMapping(id) {
        const form = document.getElementById('edit-mapping-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.isPreferred = form.querySelector('[name="isPreferred"]').checked;

        try {
            await this.fetchAPI(`/api/procurement/item-mappings/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            this.showNotification('Mapeo actualizado', 'success');
            this.closeModal();
            this.loadSupplierMappings();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async deleteMapping(id) {
        if (!confirm('¿Eliminar este mapeo?')) return;
        try {
            await this.fetchAPI(`/api/procurement/item-mappings/${id}`, { method: 'DELETE' });
            this.showNotification('Mapeo eliminado', 'success');
            this.loadSupplierMappings();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================
    // ACCIONES DE CONFIGURACIÓN
    // ========================================

    showNewApprovalConfigModal() {
        this.createModal('Nueva Regla de Aprobación', `
            <form id="new-approval-form">
                <div class="form-group">
                    <label>Tipo de Documento</label>
                    <select name="documentType" required>
                        <option value="requisition">Solicitud</option>
                        <option value="order">Orden de Compra</option>
                        <option value="payment">Pago</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Monto Mínimo</label>
                        <input type="number" name="minAmount" step="0.01" value="0">
                    </div>
                    <div class="form-group">
                        <label>Monto Máximo</label>
                        <input type="number" name="maxAmount" step="0.01" placeholder="Sin límite">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nivel de Aprobación</label>
                        <input type="number" name="approvalLevel" min="1" max="5" value="1">
                    </div>
                    <div class="form-group">
                        <label>Rol Requerido</label>
                        <select name="approvalRole">
                            <option value="supervisor">Supervisor</option>
                            <option value="manager">Gerente</option>
                            <option value="director">Director</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                </div>
            </form>
        `, [
            { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
            { label: 'Guardar', class: 'btn-primary', action: 'submitApprovalConfig()' }
        ]);
    },

    async submitApprovalConfig() {
        const form = document.getElementById('new-approval-form');
        const formData = new FormData(form);

        try {
            await this.fetchAPI('/api/procurement/approval-config', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData.entries()))
            });
            this.showNotification('Regla de aprobación creada', 'success');
            this.closeModal();
            this.loadTab('config');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async editApprovalConfig(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/approval-config/${id}`);
            const config = response.data;

            this.createModal('Editar Regla de Aprobación', `
                <form id="edit-approval-form">
                    <div class="form-group">
                        <label>Tipo de Documento</label>
                        <select name="documentType" required>
                            <option value="requisition" ${config.document_type === 'requisition' ? 'selected' : ''}>Solicitud</option>
                            <option value="order" ${config.document_type === 'order' ? 'selected' : ''}>Orden de Compra</option>
                            <option value="payment" ${config.document_type === 'payment' ? 'selected' : ''}>Pago</option>
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Monto Mínimo</label><input type="number" name="minAmount" step="0.01" value="${config.min_amount || 0}"></div>
                        <div class="form-group"><label>Monto Máximo</label><input type="number" name="maxAmount" step="0.01" value="${config.max_amount || ''}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Nivel</label><input type="number" name="approvalLevel" min="1" max="5" value="${config.approval_level || 1}"></div>
                        <div class="form-group">
                            <label>Rol</label>
                            <select name="approvalRole">
                                <option value="supervisor" ${config.approval_role === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                                <option value="manager" ${config.approval_role === 'manager' ? 'selected' : ''}>Gerente</option>
                                <option value="director" ${config.approval_role === 'director' ? 'selected' : ''}>Director</option>
                                <option value="admin" ${config.approval_role === 'admin' ? 'selected' : ''}>Administrador</option>
                            </select>
                        </div>
                    </div>
                </form>
            `, [
                { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
                { label: 'Guardar', class: 'btn-primary', action: `updateApprovalConfig(${id})` }
            ]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async updateApprovalConfig(id) {
        const form = document.getElementById('edit-approval-form');
        const formData = new FormData(form);

        try {
            await this.fetchAPI(`/api/procurement/approval-config/${id}`, {
                method: 'PUT',
                body: JSON.stringify(Object.fromEntries(formData.entries()))
            });
            this.showNotification('Configuración actualizada', 'success');
            this.closeModal();
            this.loadTab('config');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    showNewAccountingConfigModal() {
        this.createModal('Nueva Configuración Contable', `
            <form id="new-accounting-form">
                <div class="form-group">
                    <label>Tipo de Compra</label>
                    <select name="purchaseType" required>
                        <option value="goods">Bienes</option>
                        <option value="services">Servicios</option>
                        <option value="assets">Activos Fijos</option>
                        <option value="consumables">Consumibles</option>
                        <option value="raw_materials">Materias Primas</option>
                        <option value="utilities">Servicios Públicos</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Cuenta de Gasto</label>
                    <input type="text" name="expenseAccountId" placeholder="Ej: 5201">
                </div>
                <div class="form-group">
                    <label>Cuenta de Activo</label>
                    <input type="text" name="assetAccountId" placeholder="Ej: 1501">
                </div>
                <div class="form-group">
                    <label>Cuenta de Proveedor</label>
                    <input type="text" name="liabilityAccountId" placeholder="Ej: 2101">
                </div>
                <div class="form-group">
                    <label>Umbral de Capitalización</label>
                    <input type="number" name="capitalizeThreshold" step="0.01" placeholder="Monto mínimo para capitalizar">
                </div>
            </form>
        `, [
            { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
            { label: 'Guardar', class: 'btn-primary', action: 'submitAccountingConfig()' }
        ]);
    },

    async submitAccountingConfig() {
        const form = document.getElementById('new-accounting-form');
        const formData = new FormData(form);

        try {
            await this.fetchAPI('/api/procurement/accounting-config', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData.entries()))
            });
            this.showNotification('Configuración contable creada', 'success');
            this.closeModal();
            this.loadTab('config');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async editAccountingConfig(id) {
        try {
            const response = await this.fetchAPI(`/api/procurement/accounting-config/${id}`);
            const config = response.data;

            this.createModal('Editar Configuración Contable', `
                <form id="edit-accounting-form">
                    <div class="form-group">
                        <label>Tipo de Compra</label>
                        <select name="purchaseType" required>
                            <option value="goods" ${config.purchase_type === 'goods' ? 'selected' : ''}>Bienes</option>
                            <option value="services" ${config.purchase_type === 'services' ? 'selected' : ''}>Servicios</option>
                            <option value="assets" ${config.purchase_type === 'assets' ? 'selected' : ''}>Activos Fijos</option>
                            <option value="consumables" ${config.purchase_type === 'consumables' ? 'selected' : ''}>Consumibles</option>
                            <option value="raw_materials" ${config.purchase_type === 'raw_materials' ? 'selected' : ''}>Materias Primas</option>
                            <option value="utilities" ${config.purchase_type === 'utilities' ? 'selected' : ''}>Servicios Públicos</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Cuenta de Gasto</label><input type="text" name="expenseAccountId" value="${config.expense_account_id || ''}"></div>
                    <div class="form-group"><label>Cuenta de Activo</label><input type="text" name="assetAccountId" value="${config.asset_account_id || ''}"></div>
                    <div class="form-group"><label>Cuenta de Proveedor</label><input type="text" name="liabilityAccountId" value="${config.liability_account_id || ''}"></div>
                    <div class="form-group"><label>Umbral de Capitalización</label><input type="number" name="capitalizeThreshold" step="0.01" value="${config.capitalize_threshold || ''}"></div>
                </form>
            `, [
                { label: 'Cancelar', class: 'btn-secondary', action: 'closeModal()' },
                { label: 'Guardar', class: 'btn-primary', action: `updateAccountingConfig(${id})` }
            ]);
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async updateAccountingConfig(id) {
        const form = document.getElementById('edit-accounting-form');
        const formData = new FormData(form);

        try {
            await this.fetchAPI(`/api/procurement/accounting-config/${id}`, {
                method: 'PUT',
                body: JSON.stringify(Object.fromEntries(formData.entries()))
            });
            this.showNotification('Configuración actualizada', 'success');
            this.closeModal();
            this.loadTab('config');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    async saveGeneralConfig() {
        const config = {
            requisitionPrefix: document.getElementById('req-prefix')?.value || 'SOL-',
            orderPrefix: document.getElementById('order-prefix')?.value || 'OC-',
            matchTolerance: parseFloat(document.getElementById('match-tolerance')?.value) || 2
        };

        try {
            await this.fetchAPI('/api/procurement/config/general', {
                method: 'PUT',
                body: JSON.stringify(config)
            });
            this.showNotification('Configuración guardada', 'success');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================
    // REPORTES
    // ========================================

    showReportsModal() {
        this.createModal('Reportes de Compras', `
            <div class="reports-grid">
                <button class="report-btn" onclick="ProcurementManagement.generateReport('purchases_by_supplier')">
                    <i class="fas fa-building"></i>
                    <span>Compras por Proveedor</span>
                </button>
                <button class="report-btn" onclick="ProcurementManagement.generateReport('purchases_by_category')">
                    <i class="fas fa-tags"></i>
                    <span>Compras por Categoría</span>
                </button>
                <button class="report-btn" onclick="ProcurementManagement.generateReport('pending_payments')">
                    <i class="fas fa-clock"></i>
                    <span>Pagos Pendientes</span>
                </button>
                <button class="report-btn" onclick="ProcurementManagement.generateReport('supplier_performance')">
                    <i class="fas fa-chart-line"></i>
                    <span>Performance Proveedores</span>
                </button>
                <button class="report-btn" onclick="ProcurementManagement.generateReport('price_history')">
                    <i class="fas fa-history"></i>
                    <span>Historial de Precios</span>
                </button>
                <button class="report-btn" onclick="ProcurementManagement.generateReport('monthly_summary')">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Resumen Mensual</span>
                </button>
            </div>
        `, [{ label: 'Cerrar', class: 'btn-secondary', action: 'closeModal()' }]);
    },

    async generateReport(reportType) {
        try {
            const response = await this.fetchAPI(`/api/procurement/reports/${reportType}`);
            this.showNotification('Generando reporte...', 'info');

            // Open report in new window
            if (response.data?.url) {
                window.open(response.data.url, '_blank');
            } else {
                this.showNotification('Reporte generado', 'success');
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    },

    // ========================================
    // FILTROS Y BÚSQUEDA
    // ========================================

    filterRequisitions() {
        this.loadTab('requisitions');
    },

    filterOrders() {
        this.loadTab('orders');
    },

    filterReceipts() {
        this.loadTab('receipts');
    },

    filterInvoices() {
        this.loadTab('invoices');
    },

    filterSuppliers() {
        this.loadTab('suppliers');
    },

    searchSuppliers(query) {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(async () => {
            if (query.length < 2) {
                this.loadTab('suppliers');
                return;
            }
            try {
                const response = await this.fetchAPI(`/api/procurement/suppliers?search=${encodeURIComponent(query)}`);
                this.renderSupplierResults(response.data || []);
            } catch (error) {
                console.error('Error buscando:', error);
            }
        }, 300);
    },

    renderSupplierResults(suppliers) {
        const tbody = this.container.querySelector('.data-table tbody');
        if (!tbody) return;

        tbody.innerHTML = suppliers.map(s => `
            <tr>
                <td>
                    <strong>${s.trade_name || s.legal_name}</strong>
                    ${s.trade_name && s.trade_name !== s.legal_name ? `<br><small>${s.legal_name}</small>` : ''}
                </td>
                <td>${s.tax_id || '-'}</td>
                <td>${s.contact_name || '-'}</td>
                <td>${s.contact_phone || s.phone || '-'}</td>
                <td>
                    <div class="score-display">
                        <span class="score-value">${(s.overall_score || 0).toFixed(1)}</span>
                    </div>
                </td>
                <td><span class="status-badge ${s.status}">${this.getSupplierStatusLabel(s.status)}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="ProcurementManagement.viewSupplier(${s.id})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm" onclick="ProcurementManagement.editSupplier(${s.id})"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    }
};

// Exponer al scope global para el sistema de carga dinámica
window.ProcurementManagement = ProcurementManagement;

// Registrar módulo en ModuleManager si existe
if (typeof ModuleManager !== 'undefined') {
    ModuleManager.register('procurement-management', ProcurementManagement);
}

// Función legacy para compatibilidad con init_function del metadata
window.showProcurementManagementContent = function(containerId) {
    ProcurementManagement.init(containerId);
};

console.log('🛒 [PROCUREMENT] Módulo cargado y registrado en window.ProcurementManagement');
