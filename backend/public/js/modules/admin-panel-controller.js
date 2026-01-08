/**
 * admin-panel-controller.js
 * Controlador Principal del Panel Administrativo APONNT
 *
 * Responsabilidades:
 * - Verificar autenticación JWT (aponnt_token_staff)
 * - Obtener datos del staff y su rol
 * - Inicializar sidebar con menú según rol
 * - Cargar secciones dinámicamente
 * - Gestionar navegación y estado
 * - Verificar permisos antes de cada acción
 *
 * @requires RolePermissions (role-permissions.js)
 * @requires AdminSidebar (admin-sidebar.js)
 */

const AdminPanelController = {
    // Estado interno
    _initialized: false,
    _currentStaff: null,
    _currentSection: null,
    _sectionModules: {},
    _apiBase: '/api/aponnt/dashboard',

    // Selectores DOM
    _contentArea: null,
    _headerTitle: null,
    _loadingOverlay: null,

    /**
     * Punto de entrada principal
     */
    async init() {
        if (this._initialized) {
            console.warn('[AdminPanel] Ya inicializado');
            return;
        }

        console.log('[AdminPanel] Iniciando controlador...');

        try {
            // Mostrar loading
            this._showLoading('Verificando sesión...');

            // Verificar autenticación
            const token = this._getToken();
            if (!token) {
                console.log('[AdminPanel] No hay token, mostrando login');
                this._showLoginForm();
                return;
            }

            // Obtener datos del staff
            const staff = await this._fetchStaffData(token);
            if (!staff) {
                console.log('[AdminPanel] Token inválido, mostrando login');
                this._clearToken();
                this._showLoginForm();
                return;
            }

            this._currentStaff = staff;
            console.log('[AdminPanel] Staff autenticado:', staff.full_name);

            // Inicializar UI
            this._initializeUI();

            // Inicializar sidebar
            AdminSidebar.init({
                staff: this._currentStaff,
                onNavigate: (sectionId) => this.loadSection(sectionId),
                activeSection: RolePermissions.getDefaultSection(this._currentStaff)
            });

            // Habilitar auto-hide del sidebar
            AdminSidebar.enableAutoHide();

            // Cargar sección inicial
            const defaultSection = RolePermissions.getDefaultSection(this._currentStaff);
            await this.loadSection(defaultSection);

            this._initialized = true;
            this._hideLoading();

            console.log('[AdminPanel] Inicialización completa');

        } catch (error) {
            console.error('[AdminPanel] Error de inicialización:', error);
            this._hideLoading();
            this._showError('Error al inicializar el panel. Por favor recargue la página.');
        }
    },

    /**
     * Inicializa la estructura UI base
     */
    _initializeUI() {
        // Referencias DOM
        this._contentArea = document.getElementById('content-area');
        this._headerTitle = document.getElementById('header-title');

        // Crear loading overlay si no existe
        if (!document.getElementById('admin-loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'admin-loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <span class="loading-text">Cargando...</span>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        this._loadingOverlay = document.getElementById('admin-loading-overlay');

        // Agregar info de rol al header
        const roleType = RolePermissions.getRoleType(this._currentStaff);
        const headerInfo = document.getElementById('header-user-info');
        if (headerInfo) {
            headerInfo.innerHTML = `
                <span class="header-user-name">${this._currentStaff.full_name}</span>
                <span class="header-role-badge role-${roleType.toLowerCase()}">${this._getRoleDisplayName(roleType)}</span>
            `;
        }
    },

    /**
     * Carga una sección en el área de contenido
     */
    async loadSection(sectionId) {
        // Verificar permisos
        if (!RolePermissions.canAccessSection(this._currentStaff, sectionId)) {
            console.warn('[AdminPanel] Acceso denegado a:', sectionId);
            this._showAccessDenied();
            return;
        }

        console.log('[AdminPanel] Cargando sección:', sectionId);
        this._showLoading(`Cargando ${sectionId}...`);

        try {
            // Actualizar estado
            this._currentSection = sectionId;

            // Actualizar título del header
            const sectionInfo = RolePermissions.getSectionData(sectionId);
            if (this._headerTitle && sectionInfo) {
                // El icono puede ser emoji o clase FA
                const icon = sectionInfo.icon || '📄';
                const isFontAwesome = icon.startsWith('fa');
                const iconHtml = isFontAwesome ? `<i class="${icon}"></i>` : `<span>${icon}</span>`;
                this._headerTitle.innerHTML = `${iconHtml} <span>${sectionInfo.label}</span>`;
            }

            // Cargar contenido según la sección
            const content = await this._loadSectionContent(sectionId);

            // Renderizar en el área de contenido
            if (this._contentArea) {
                this._contentArea.innerHTML = content;
            }

            // Inicializar módulo específico si existe
            await this._initializeSectionModule(sectionId);

            this._hideLoading();

        } catch (error) {
            console.error('[AdminPanel] Error cargando sección:', error);
            this._hideLoading();
            this._showError(`Error al cargar la sección: ${error.message}`);
        }
    },

    /**
     * Carga el contenido HTML de una sección
     */
    async _loadSectionContent(sectionId) {
        // Mapeo de secciones a su contenido/módulo
        const sectionLoaders = {
            // ===== DASHBOARD =====
            'mi-dashboard': () => this._loadVendorDashboard(),
            'kpis-generales': () => this._loadKpisGenerales(),

            // ===== COMERCIAL =====
            'mis-empresas': () => this._loadMisEmpresas(),
            'todas-empresas': () => this._loadTodasEmpresas(),
            'comercial': () => this._loadComercial(),
            'modulos-comerciales': () => this._loadModulosComerciales(),
            'presupuestos': () => this._loadPresupuestos(),
            'contratos': () => this._loadContratos(),
            'mis-comisiones': () => this._loadMisComisiones(),
            'todos-presupuestos': () => this._loadTodosPresupuestos(),
            'todos-contratos': () => this._loadTodosContratos(),

            // ===== FACTURACIÓN APONNT =====
            'aponnt-billing': () => this._loadAponntBilling(),
            'notification-billing': () => this._loadNotificationBilling(),

            // ===== TAREAS ADMIN =====
            'tareas-admin': () => this._loadTareasAdmin(),

            // ===== CONFIGURACIÓN =====
            'configuracion': () => this._loadConfiguracion(),

            // ===== FINANZAS =====
            'facturacion': () => this._loadFacturacion(),
            'comisiones': () => this._loadComisiones(),
            'comisiones-pago': () => this._loadComisionesPago(),
            'pago-comisiones': () => this._loadPagoComisiones(),
            'liquidacion-comisiones': () => this._loadLiquidacionComisiones(),
            'reportes-financieros': () => this._loadReportesFinancieros(),
            'reportes-consolidados': () => this._loadReportesConsolidados(),

            // ===== SOPORTE =====
            'tickets-soporte': () => this._loadTicketsSoporte(),
            'mis-tickets': () => this._loadMisTickets(),
            'todos-tickets': () => this._loadTodosTickets(),
            'sla-metricas': () => this._loadSLAMetricas(),
            'metricas-soporte': () => this._loadMetricasSoporte(),
            'bandeja-central': () => this._loadBandejaCentral(),

            // ===== EMPRESAS =====
            'empresas-admin': () => this._loadEmpresasAdmin(),
            'empresas-contexto': () => this._loadEmpresasContexto(),

            // ===== STAFF =====
            'gestion-staff': () => this._loadGestionStaff(),
            'vendedores': () => this._loadVendedores(),
            'staff-aponnt': () => this._loadStaffAponnt(),
            'staff-roles': () => this._loadStaffRoles(),
            'organigrama': () => this._loadOrganigrama(),

            // ===== INGENIERÍA =====
            'engineering': () => this._loadIngenieriaDashboard(),
            'ingenieria-dashboard': () => this._loadIngenieriaDashboard(),
            'ai-testing': () => this._loadAITestingDashboard(),
            'aponnt-email-config': () => this._loadAponntEmailConfig(),
            'brain-ecosystem': () => this._loadBrainEcosystem(),
            'debugging': () => this._loadDebugging(),
            'auditor-sistema': () => this._loadAuditorSistema(),
            'metricas-tech': () => this._loadMetricasTech(),

            // ===== COMUNICACIÓN =====
            'notificaciones': () => this._loadNotificaciones(),
            'mis-notificaciones': () => this._loadMisNotificaciones(),
            'capacitaciones': () => this._loadCapacitaciones(),
            'reportes': () => this._loadReportes(),

            // ===== MARKETING =====
            'marketing': () => this._loadMarketing(),
            'sales-orchestration': () => this._loadSalesOrchestration(),
            'pipeline-ventas': () => this._loadPipelineVentas()
        };

        const loader = sectionLoaders[sectionId];
        if (loader) {
            return await loader();
        }

        return this._getPlaceholderContent(sectionId);
    },

    /**
     * Inicializa el módulo JavaScript específico de una sección
     */
    async _initializeSectionModule(sectionId) {
        const moduleInitializers = {
            'engineering': async () => {
                console.log('[AdminPanel] Inicializando Engineering Dashboard...');
                if (window.EngineeringDashboard) {
                    await EngineeringDashboard.init();
                } else {
                    console.error('[AdminPanel] EngineeringDashboard no está definido');
                }
            },
            'ingenieria-dashboard': async () => {
                console.log('[AdminPanel] Inicializando Engineering Dashboard (alias)...');
                if (window.EngineeringDashboard) {
                    await EngineeringDashboard.init();
                }
            },
            'ai-testing': async () => {
                console.log('[AdminPanel] Inicializando AI Testing Dashboard...');
                if (window.AITestingDashboard) {
                    await AITestingDashboard.init('ai-testing-container');
                } else {
                    console.error('[AdminPanel] AITestingDashboard no está definido');
                }
            },
            'aponnt-email-config': () => {
                console.log('[AdminPanel] Intentando inicializar AponntEmailConfigModule...');
                console.log('[AdminPanel] AponntEmailConfigModule disponible:', !!window.AponntEmailConfigModule);
                if (window.AponntEmailConfigModule) {
                    console.log('[AdminPanel] Llamando a AponntEmailConfigModule.init()');
                    AponntEmailConfigModule.init();
                } else {
                    console.error('[AdminPanel] ❌ AponntEmailConfigModule no está disponible en window');
                    console.error('[AdminPanel] Verifica que el script esté cargado en panel-administrativo.html');
                }
            },
            'mi-dashboard': () => {
                if (window.VendorDashboard) {
                    VendorDashboard.init(AdminPanelController._currentStaff);
                }
            },
            'brain-ecosystem': async () => {
                console.log('[AdminPanel] Inicializando Brain Ecosystem...');
                // Brain Ecosystem usa la API directamente, se inicializa inline
                await AdminPanelController._initBrainEcosystemInline();
            },
            'auditor-sistema': () => {
                if (window.AuditorDashboard) {
                    AuditorDashboard.init();
                }
            },
            'tickets-soporte': async () => {
                if (window.SupportSupervisorDashboard) {
                    await SupportSupervisorDashboard.init();
                    const container = document.getElementById('tickets-table-container');
                    if (container) {
                        container.innerHTML = SupportSupervisorDashboard.render();
                    }
                }
            },
            'sla-metricas': async () => {
                if (window.SupportSupervisorDashboard) {
                    await SupportSupervisorDashboard.init();
                }
            },
            // 'facturacion', 'comisiones', 'liquidacion-comisiones' ahora usan sus propios loaders
            // en _loadFacturacion(), _loadTareasAdmin() sin AdminFinanceDashboard
            'aponnt-billing': async () => {
                if (window.AponntBillingDashboard) {
                    await AponntBillingDashboard.init(document.getElementById('content-area'));
                }
            },
            'notification-billing': async () => {
                console.log('[AdminPanel] Inicializando Notification Billing Dashboard...');
                if (window.NotificationBillingDashboard) {
                    await NotificationBillingDashboard.init();
                } else {
                    console.error('[AdminPanel] NotificationBillingDashboard no está definido');
                }
            },
            'marketing': async () => {
                if (window.MarketingLeadsModule) {
                    const container = document.getElementById('marketing-container') || document.getElementById('content-area');
                    await MarketingLeadsModule.init(container);
                }
            },
            'sales-orchestration': async () => {
                if (window.SalesOrchestrationDashboard) {
                    const container = document.getElementById('sales-orchestration-container') || document.getElementById('content-area');
                    await SalesOrchestrationDashboard.init(container);
                }
            },
            'pipeline-ventas': async () => {
                if (window.LeadsPipelineDashboard) {
                    const container = document.getElementById('pipeline-ventas-container') || document.getElementById('content-area');
                    await LeadsPipelineDashboard.init(container, AdminPanelController._currentStaff);
                }
            }
        };

        const initializer = moduleInitializers[sectionId];
        if (initializer) {
            try {
                // Pequeño delay para asegurar que el DOM esté actualizado
                await new Promise(resolve => setTimeout(resolve, 50));
                console.log(`[AdminPanel] Ejecutando inicializador para: ${sectionId}`);
                await initializer();
            } catch (error) {
                console.error(`[AdminPanel] Error inicializando módulo ${sectionId}:`, error);
            }
        }
    },

    // ============================
    // LOADERS DE SECCIONES
    // ============================

    async _loadVendorDashboard() {
        return `
            <div class="section-container" id="vendor-dashboard-container">
                <div class="section-header">
                    <h2>Mi Dashboard</h2>
                    <p class="section-subtitle">Resumen de tu actividad comercial</p>
                </div>
                <div id="vendor-dashboard-content">
                    <!-- VendorDashboard se inicializará aquí -->
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando dashboard...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadKpisGenerales() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>KPIs Generales</h2>
                    <p class="section-subtitle">Métricas generales del sistema</p>
                </div>
                <div class="kpis-grid" id="kpis-grid">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando KPIs...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadMisEmpresas() {
        const roleType = RolePermissions.getRoleType(this._currentStaff);
        const isVendor = roleType === 'VENDEDOR' || roleType === 'LIDER_VENTAS';

        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>${isVendor ? 'Mis Empresas' : 'Empresas'}</h2>
                    <p class="section-subtitle">${isVendor ? 'Empresas asignadas a ti' : 'Gestión de empresas cliente'}</p>
                    <div class="section-actions">
                        <button class="btn btn-primary" onclick="AdminPanelController.showNewCompanyModal()">
                            <i class="fas fa-plus"></i> Nueva Empresa
                        </button>
                    </div>
                </div>
                <div class="filter-bar">
                    <input type="text" id="company-search" placeholder="Buscar empresa..." class="search-input">
                    <select id="company-status-filter" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="active">Activas</option>
                        <option value="inactive">Inactivas</option>
                    </select>
                </div>
                <div class="table-container" id="companies-table-container">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando empresas...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadTodasEmpresas() {
        return this._loadMisEmpresas(); // Mismo UI pero sin filtro de vendor
    },

    async _loadModulosComerciales() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Módulos Comerciales</h2>
                    <p class="section-subtitle">Catálogo de módulos y precios</p>
                </div>
                <div class="modules-grid" id="modules-grid">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando módulos...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadPresupuestos() {
        const roleType = RolePermissions.getRoleType(this._currentStaff);
        const canCreate = roleType === 'VENDEDOR' || roleType === 'LIDER_VENTAS' || roleType === 'GERENCIA';

        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Presupuestos</h2>
                    <p class="section-subtitle">Gestión de presupuestos comerciales</p>
                    ${canCreate ? `
                    <div class="section-actions">
                        <button class="btn btn-primary" onclick="AdminPanelController.showNewBudgetModal()">
                            <i class="fas fa-plus"></i> Nuevo Presupuesto
                        </button>
                    </div>
                    ` : ''}
                </div>
                <div class="filter-bar">
                    <input type="text" id="budget-search" placeholder="Buscar presupuesto..." class="search-input">
                    <select id="budget-status-filter" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="draft">Borrador</option>
                        <option value="sent">Enviado</option>
                        <option value="approved">Aprobado</option>
                        <option value="rejected">Rechazado</option>
                    </select>
                </div>
                <div class="table-container" id="budgets-table-container">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando presupuestos...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadContratos() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Contratos</h2>
                    <p class="section-subtitle">Gestión de contratos activos</p>
                </div>
                <div class="filter-bar">
                    <input type="text" id="contract-search" placeholder="Buscar contrato..." class="search-input">
                    <select id="contract-status-filter" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="active">Activo</option>
                        <option value="pending">Pendiente</option>
                        <option value="expired">Vencido</option>
                    </select>
                </div>
                <div class="table-container" id="contracts-table-container">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando contratos...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadAponntBilling() {
        // El dashboard se auto-renderiza al inicializarse
        return `<div id="aponnt-billing-container"></div>`;
    },

    async _loadNotificationBilling() {
        console.log('[AdminPanel] Cargando Notification Billing Dashboard...');
        return '<div id="billing-dashboard-container" style="min-height: 600px;"></div>';
    },

    async _loadFacturacion() {
        // Cargar facturas emitidas con detalle expandible
        setTimeout(() => this._loadFacturasEmitidas(), 100);

        return `
            <div class="section-container facturacion-module">
                <style>
                    .facturacion-module .section-header {
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }
                    .facturacion-module h2 {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 1.5rem;
                        margin: 0 0 8px 0;
                    }
                    .facturacion-module .section-subtitle {
                        color: rgba(255,255,255,0.6);
                        margin: 0;
                    }
                    .factura-row {
                        display: grid;
                        grid-template-columns: 100px 1fr 120px 120px 100px;
                        padding: 14px 16px;
                        background: rgba(255,255,255,0.02);
                        border-radius: 8px;
                        margin-bottom: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: 1px solid transparent;
                    }
                    .factura-row:hover {
                        background: rgba(255,255,255,0.05);
                        border-color: rgba(74, 158, 255, 0.3);
                    }
                    .factura-row.expanded {
                        border-color: rgba(74, 158, 255, 0.5);
                        background: rgba(74, 158, 255, 0.05);
                    }
                    .factura-detail {
                        display: none;
                        margin: -4px 0 8px 0;
                        padding: 16px 20px 16px 40px;
                        background: rgba(0,0,0,0.2);
                        border-radius: 0 0 8px 8px;
                        font-size: 0.9rem;
                        border-left: 3px solid #4a9eff;
                    }
                    .factura-detail.show {
                        display: block;
                    }
                    .factura-detail-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 16px;
                    }
                    .factura-detail-item label {
                        display: block;
                        color: rgba(255,255,255,0.5);
                        font-size: 0.8rem;
                        margin-bottom: 4px;
                    }
                    .factura-detail-item span {
                        color: #e8eaed;
                    }
                    .status-badge {
                        padding: 4px 10px;
                        border-radius: 12px;
                        font-size: 0.8rem;
                        font-weight: 500;
                    }
                    .status-pagada { background: rgba(34,197,94,0.2); color: #22c55e; }
                    .status-pendiente { background: rgba(255,184,77,0.2); color: #ffb84d; }
                    .status-vencida { background: rgba(255,107,107,0.2); color: #ff6b6b; }
                    .factura-header-row {
                        display: grid;
                        grid-template-columns: 100px 1fr 120px 120px 100px;
                        padding: 10px 16px;
                        font-size: 0.8rem;
                        color: rgba(255,255,255,0.5);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                </style>

                <div class="section-header">
                    <h2><span>🧾</span> Facturación</h2>
                    <p class="section-subtitle">Facturas emitidas a empresas clientes - Doble click para ver detalle</p>
                </div>

                <div class="stats-row" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
                    <div class="stat-card" style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); padding: 16px; border-radius: 8px;">
                        <span class="stat-label" style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Pagadas</span>
                        <span class="stat-value" id="fact-pagadas" style="font-size: 1.5rem; font-weight: 600; color: #22c55e;">-</span>
                    </div>
                    <div class="stat-card" style="background: rgba(255,184,77,0.1); border: 1px solid rgba(255,184,77,0.3); padding: 16px; border-radius: 8px;">
                        <span class="stat-label" style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Pendientes</span>
                        <span class="stat-value" id="fact-pendientes" style="font-size: 1.5rem; font-weight: 600; color: #ffb84d;">-</span>
                    </div>
                    <div class="stat-card" style="background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); padding: 16px; border-radius: 8px;">
                        <span class="stat-label" style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Vencidas</span>
                        <span class="stat-value" id="fact-vencidas" style="font-size: 1.5rem; font-weight: 600; color: #ff6b6b;">-</span>
                    </div>
                    <div class="stat-card" style="background: rgba(74,158,255,0.1); border: 1px solid rgba(74,158,255,0.3); padding: 16px; border-radius: 8px;">
                        <span class="stat-label" style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Total Mes</span>
                        <span class="stat-value" id="fact-total-mes" style="font-size: 1.5rem; font-weight: 600; color: #4a9eff;">-</span>
                    </div>
                </div>

                <div class="factura-header-row">
                    <div>Nº Factura</div>
                    <div>Empresa</div>
                    <div>Fecha</div>
                    <div>Monto</div>
                    <div>Estado</div>
                </div>

                <div id="facturas-list">
                    <div class="loading-placeholder" style="padding: 40px; text-align: center;">
                        <div class="spinner-small"></div>
                        <span style="color: rgba(255,255,255,0.6);">Cargando facturas...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadFacturasEmitidas() {
        const container = document.getElementById('facturas-list');
        if (!container) return;

        try {
            const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
            const response = await fetch('/api/aponnt/billing/invoices', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (!result.success || !result.data || result.data.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        <div style="font-size: 3rem; margin-bottom: 12px;">📭</div>
                        <div>No hay facturas emitidas aún</div>
                        <div style="font-size: 0.85rem; margin-top: 8px;">Las facturas aparecerán aquí cuando se generen desde Pre-facturación</div>
                    </div>
                `;
                return;
            }

            const facturas = result.data;

            // Stats
            const pagadas = facturas.filter(f => f.status === 'PAID').length;
            const pendientes = facturas.filter(f => f.status === 'PENDING').length;
            const vencidas = facturas.filter(f => f.status === 'OVERDUE').length;
            const totalMes = facturas.reduce((sum, f) => sum + (f.total || 0), 0);

            document.getElementById('fact-pagadas').textContent = pagadas;
            document.getElementById('fact-pendientes').textContent = pendientes;
            document.getElementById('fact-vencidas').textContent = vencidas;
            document.getElementById('fact-total-mes').textContent = this._formatCurrency(totalMes);

            // Render list
            container.innerHTML = facturas.map((f, idx) => `
                <div class="factura-row" ondblclick="AdminPanelController.toggleFacturaDetail(${idx})">
                    <div style="font-weight: 600; color: #4a9eff;">${f.invoice_number || '-'}</div>
                    <div>${f.company_name || f.company?.name || '-'}</div>
                    <div>${f.invoice_date ? new Date(f.invoice_date).toLocaleDateString('es-AR') : '-'}</div>
                    <div style="font-weight: 500;">${this._formatCurrency(f.total)}</div>
                    <div><span class="status-badge status-${f.status?.toLowerCase() || 'pendiente'}">${this._getStatusLabel(f.status)}</span></div>
                </div>
                <div class="factura-detail" id="factura-detail-${idx}">
                    <div class="factura-detail-grid">
                        <div class="factura-detail-item">
                            <label>CAE</label>
                            <span>${f.cae || 'Sin CAE'}</span>
                        </div>
                        <div class="factura-detail-item">
                            <label>Vencimiento CAE</label>
                            <span>${f.cae_vto ? new Date(f.cae_vto).toLocaleDateString('es-AR') : '-'}</span>
                        </div>
                        <div class="factura-detail-item">
                            <label>Período</label>
                            <span>${f.period || '-'}</span>
                        </div>
                        <div class="factura-detail-item">
                            <label>Subtotal</label>
                            <span>${this._formatCurrency(f.subtotal)}</span>
                        </div>
                        <div class="factura-detail-item">
                            <label>IVA</label>
                            <span>${this._formatCurrency(f.tax_amount)}</span>
                        </div>
                        <div class="factura-detail-item">
                            <label>Total</label>
                            <span style="font-weight: 600; color: #4a9eff;">${this._formatCurrency(f.total)}</span>
                        </div>
                    </div>
                    ${f.items && f.items.length > 0 ? `
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                            <label style="display: block; color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-bottom: 8px;">Detalle de items</label>
                            ${f.items.map(item => `
                                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <span>${item.description || item.module_name || '-'}</span>
                                    <span>${this._formatCurrency(item.amount)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('');

        } catch (error) {
            console.error('[FACTURACION] Error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                    Error al cargar facturas: ${error.message}
                </div>
            `;
        }
    },

    toggleFacturaDetail(idx) {
        const detail = document.getElementById(`factura-detail-${idx}`);
        const row = detail?.previousElementSibling;

        if (detail) {
            const isOpen = detail.classList.contains('show');
            // Close all
            document.querySelectorAll('.factura-detail').forEach(d => d.classList.remove('show'));
            document.querySelectorAll('.factura-row').forEach(r => r.classList.remove('expanded'));

            if (!isOpen) {
                detail.classList.add('show');
                row?.classList.add('expanded');
            }
        }
    },

    _getStatusLabel(status) {
        const labels = {
            'PAID': 'Pagada',
            'PENDING': 'Pendiente',
            'OVERDUE': 'Vencida',
            'CANCELLED': 'Anulada'
        };
        return labels[status] || status || 'Pendiente';
    },

    _formatCurrency(amount) {
        if (amount === null || amount === undefined) return '$0';
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // ==================== TAREAS ADMIN ====================
    async _loadTareasAdmin() {
        return `
            <div class="section-container tareas-module">
                <style>
                    .tareas-module .section-header {
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }
                    .tareas-module h2 {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 1.5rem;
                        margin: 0 0 8px 0;
                    }
                    .tareas-tabs {
                        display: flex;
                        gap: 8px;
                        margin-bottom: 24px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        padding-bottom: 16px;
                    }
                    .tareas-tab {
                        padding: 10px 20px;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: rgba(255,255,255,0.7);
                        cursor: pointer;
                        transition: all 0.2s;
                        font-weight: 500;
                    }
                    .tareas-tab:hover {
                        background: rgba(255,255,255,0.1);
                    }
                    .tareas-tab.active {
                        background: linear-gradient(135deg, #4a9eff, #3b82f6);
                        color: white;
                        border-color: transparent;
                    }
                    .tareas-content {
                        min-height: 400px;
                    }
                </style>

                <div class="section-header">
                    <h2><span>📝</span> Tareas</h2>
                    <p class="section-subtitle" style="color: rgba(255,255,255,0.6); margin: 0;">Gestión de comisiones y liquidaciones</p>
                </div>

                <div class="tareas-tabs">
                    <button class="tareas-tab active" onclick="AdminPanelController.switchTareasTab('comisiones')">
                        💵 Comisiones
                    </button>
                    <button class="tareas-tab" onclick="AdminPanelController.switchTareasTab('liquidacion')">
                        📊 Liquidación
                    </button>
                </div>

                <div class="tareas-content" id="tareas-content">
                    ${this._renderComisionesTab()}
                </div>
            </div>
        `;
    },

    switchTareasTab(tab) {
        // Update tabs
        document.querySelectorAll('.tareas-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');

        const content = document.getElementById('tareas-content');
        if (!content) return;

        if (tab === 'comisiones') {
            content.innerHTML = this._renderComisionesTab();
        } else if (tab === 'liquidacion') {
            content.innerHTML = this._renderLiquidacionTab();
        }
    },

    _renderComisionesTab() {
        return `
            <div class="comisiones-section">
                <div class="stats-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
                    <div class="stat-card" style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); padding: 20px; border-radius: 8px;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Comisiones Pagadas</span>
                        <div style="font-size: 1.8rem; font-weight: 600; color: #22c55e; margin-top: 8px;">$0</div>
                    </div>
                    <div class="stat-card" style="background: rgba(255,184,77,0.1); border: 1px solid rgba(255,184,77,0.3); padding: 20px; border-radius: 8px;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Comisiones Pendientes</span>
                        <div style="font-size: 1.8rem; font-weight: 600; color: #ffb84d; margin-top: 8px;">$0</div>
                    </div>
                    <div class="stat-card" style="background: rgba(74,158,255,0.1); border: 1px solid rgba(74,158,255,0.3); padding: 20px; border-radius: 8px;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Total Este Mes</span>
                        <div style="font-size: 1.8rem; font-weight: 600; color: #4a9eff; margin-top: 8px;">$0</div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.02); border-radius: 8px; padding: 40px; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">💵</div>
                    <div style="color: rgba(255,255,255,0.7); font-weight: 500;">Comisiones</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-top: 8px;">
                        Las comisiones de vendedores aparecerán aquí cuando se generen facturas
                    </div>
                </div>
            </div>
        `;
    },

    _renderLiquidacionTab() {
        return `
            <div class="liquidacion-section">
                <div class="stats-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
                    <div class="stat-card" style="background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); padding: 20px; border-radius: 8px;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Liquidaciones Procesadas</span>
                        <div style="font-size: 1.8rem; font-weight: 600; color: #a855f7; margin-top: 8px;">0</div>
                    </div>
                    <div class="stat-card" style="background: rgba(34,211,238,0.1); border: 1px solid rgba(34,211,238,0.3); padding: 20px; border-radius: 8px;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Pendientes de Aprobación</span>
                        <div style="font-size: 1.8rem; font-weight: 600; color: #22d3ee; margin-top: 8px;">0</div>
                    </div>
                    <div class="stat-card" style="background: rgba(74,158,255,0.1); border: 1px solid rgba(74,158,255,0.3); padding: 20px; border-radius: 8px;">
                        <span style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">Monto Total Liquidado</span>
                        <div style="font-size: 1.8rem; font-weight: 600; color: #4a9eff; margin-top: 8px;">$0</div>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.02); border-radius: 8px; padding: 40px; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">📊</div>
                    <div style="color: rgba(255,255,255,0.7); font-weight: 500;">Liquidación de Comisiones</div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-top: 8px;">
                        Aquí se procesan y aprueban las liquidaciones de comisiones a vendedores
                    </div>
                    <button style="
                        margin-top: 20px;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #a855f7, #8b5cf6);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        Nueva Liquidación
                    </button>
                </div>
            </div>
        `;
    },

    // ==================== CONFIGURACIÓN ====================
    async _loadConfiguracion() {
        return `
            <div class="section-container config-module">
                <style>
                    .config-module .section-header {
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }
                    .config-module h2 {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 1.5rem;
                        margin: 0 0 8px 0;
                    }
                    .config-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px;
                    }
                    .config-card {
                        background: rgba(255,255,255,0.02);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 12px;
                        padding: 24px;
                        transition: all 0.2s;
                        cursor: pointer;
                    }
                    .config-card:hover {
                        background: rgba(255,255,255,0.05);
                        border-color: rgba(74,158,255,0.3);
                    }
                    .config-card-icon {
                        font-size: 2rem;
                        margin-bottom: 12px;
                    }
                    .config-card-title {
                        font-weight: 600;
                        color: #e8eaed;
                        margin-bottom: 8px;
                    }
                    .config-card-desc {
                        color: rgba(255,255,255,0.5);
                        font-size: 0.9rem;
                    }
                </style>

                <div class="section-header">
                    <h2><span>⚙️</span> Configuración</h2>
                    <p class="section-subtitle" style="color: rgba(255,255,255,0.6); margin: 0;">Ajustes generales del sistema</p>
                </div>

                <div class="config-grid">
                    <div class="config-card">
                        <div class="config-card-icon">🔔</div>
                        <div class="config-card-title">Notificaciones</div>
                        <div class="config-card-desc">Configurar alertas y notificaciones del sistema</div>
                    </div>
                    <div class="config-card">
                        <div class="config-card-icon">📧</div>
                        <div class="config-card-title">Email</div>
                        <div class="config-card-desc">Templates de email y configuración SMTP</div>
                    </div>
                    <div class="config-card">
                        <div class="config-card-icon">💳</div>
                        <div class="config-card-title">Facturación</div>
                        <div class="config-card-desc">Datos fiscales y configuración AFIP</div>
                    </div>
                    <div class="config-card">
                        <div class="config-card-icon">🔐</div>
                        <div class="config-card-title">Seguridad</div>
                        <div class="config-card-desc">Políticas de contraseñas y accesos</div>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadComisiones() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Mis Comisiones</h2>
                    <p class="section-subtitle">Historial de comisiones</p>
                </div>
                <div class="stats-row">
                    <div class="stat-card stat-success">
                        <span class="stat-label">Cobradas</span>
                        <span class="stat-value" id="commissions-paid">-</span>
                    </div>
                    <div class="stat-card stat-warning">
                        <span class="stat-label">Pendientes</span>
                        <span class="stat-value" id="commissions-pending">-</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Este Mes</span>
                        <span class="stat-value" id="commissions-month">-</span>
                    </div>
                </div>
                <div class="table-container" id="commissions-table-container">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando comisiones...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadLiquidacionComisiones() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Liquidación de Comisiones</h2>
                    <p class="section-subtitle">Aprobar y pagar comisiones pendientes</p>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Solo Gerencia puede aprobar pagos de comisiones
                </div>
                <div class="table-container" id="liquidation-table-container">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando liquidaciones...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadTicketsSoporte() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Tickets de Soporte</h2>
                    <p class="section-subtitle">Gestión de tickets de clientes</p>
                </div>
                <div class="filter-bar">
                    <input type="text" id="ticket-search" placeholder="Buscar ticket..." class="search-input">
                    <select id="ticket-priority-filter" class="filter-select">
                        <option value="">Todas las prioridades</option>
                        <option value="critical">Crítica</option>
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                    </select>
                    <select id="ticket-status-filter" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="open">Abierto</option>
                        <option value="in_progress">En Progreso</option>
                        <option value="resolved">Resuelto</option>
                        <option value="closed">Cerrado</option>
                    </select>
                </div>
                <div class="table-container" id="tickets-table-container">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando tickets...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadSLAMetricas() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Métricas SLA</h2>
                    <p class="section-subtitle">Análisis de cumplimiento de SLAs</p>
                </div>
                <div class="charts-grid">
                    <div class="chart-card" id="sla-compliance-chart">
                        <h3>Cumplimiento SLA</h3>
                        <div class="chart-placeholder">
                            <div class="spinner-small"></div>
                        </div>
                    </div>
                    <div class="chart-card" id="response-time-chart">
                        <h3>Tiempos de Respuesta</h3>
                        <div class="chart-placeholder">
                            <div class="spinner-small"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadGestionStaff() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Gestión de Staff</h2>
                    <p class="section-subtitle">Administración del equipo APONNT</p>
                    <div class="section-actions">
                        <button class="btn btn-primary" onclick="AdminPanelController.showNewStaffModal()">
                            <i class="fas fa-user-plus"></i> Nuevo Staff
                        </button>
                    </div>
                </div>
                <div class="table-container" id="staff-table-container">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando staff...</span>
                    </div>
                </div>
            </div>
        `;
    },

    // ==================== VENDEDORES ====================
    async _loadVendedores() {
        setTimeout(() => this._loadVendedoresList(), 100);
        return `
            <div class="section-container vendedores-module">
                <style>
                    .vendedores-module .section-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }
                    .vendedores-module h2 { margin: 0 0 8px 0; display: flex; align-items: center; gap: 12px; }
                    .vendedores-module .section-subtitle { color: rgba(255,255,255,0.6); margin: 0; }
                    .vendedores-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
                    .vendedor-stat { background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
                    .vendedor-stat-label { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
                    .vendedor-stat-value { font-size: 1.5rem; font-weight: 600; }
                    .vendedor-row { display: grid; grid-template-columns: 50px 1fr 150px 120px 100px 80px; padding: 12px 16px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 8px; align-items: center; }
                    .vendedor-row:hover { background: rgba(255,255,255,0.05); }
                    .vendedor-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #4a9eff, #7c3aed); display: flex; align-items: center; justify-content: center; font-weight: 600; }
                    .vendedor-info { display: flex; flex-direction: column; gap: 2px; }
                    .vendedor-name { font-weight: 500; }
                    .vendedor-email { font-size: 0.8rem; color: rgba(255,255,255,0.5); }
                    .vendedor-region { font-size: 0.85rem; color: rgba(255,255,255,0.7); }
                    .vendedor-empresas { font-size: 0.9rem; }
                    .vendedor-comision { font-weight: 500; color: #22c55e; }
                    .vendedor-actions button { background: transparent; border: none; color: rgba(255,255,255,0.6); cursor: pointer; padding: 4px 8px; }
                    .vendedor-actions button:hover { color: #4a9eff; }
                    .btn-nuevo-vendedor { background: linear-gradient(135deg, #4a9eff, #3b82f6); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px; }
                    .btn-nuevo-vendedor:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(74,158,255,0.3); }
                </style>
                <div class="section-header">
                    <div>
                        <h2><span>👥</span> Vendedores</h2>
                        <p class="section-subtitle">Gestión del equipo comercial y asignaciones</p>
                    </div>
                    <button class="btn-nuevo-vendedor" onclick="AdminPanelController.showNuevoVendedorModal()">
                        <span>➕</span> Nuevo Vendedor
                    </button>
                </div>
                <div class="vendedores-stats">
                    <div class="vendedor-stat">
                        <div class="vendedor-stat-label">Total Vendedores</div>
                        <div class="vendedor-stat-value" id="stat-total-vendedores">-</div>
                    </div>
                    <div class="vendedor-stat">
                        <div class="vendedor-stat-label">Activos</div>
                        <div class="vendedor-stat-value" id="stat-activos" style="color: #22c55e;">-</div>
                    </div>
                    <div class="vendedor-stat">
                        <div class="vendedor-stat-label">Empresas Asignadas</div>
                        <div class="vendedor-stat-value" id="stat-empresas" style="color: #4a9eff;">-</div>
                    </div>
                    <div class="vendedor-stat">
                        <div class="vendedor-stat-label">Comisiones Pendientes</div>
                        <div class="vendedor-stat-value" id="stat-comisiones" style="color: #ffb84d;">-</div>
                    </div>
                </div>
                <div class="vendedor-header-row" style="display: grid; grid-template-columns: 50px 1fr 150px 120px 100px 80px; padding: 10px 16px; font-size: 0.8rem; color: rgba(255,255,255,0.5); text-transform: uppercase;">
                    <div></div>
                    <div>Vendedor</div>
                    <div>Región</div>
                    <div>Empresas</div>
                    <div>Comisión</div>
                    <div>Acciones</div>
                </div>
                <div id="vendedores-list">
                    <div style="padding: 40px; text-align: center;">
                        <div class="spinner-small"></div>
                        <span style="color: rgba(255,255,255,0.6);">Cargando vendedores...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadVendedoresList() {
        const container = document.getElementById('vendedores-list');
        if (!container) return;

        try {
            const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
            const response = await fetch('/api/aponnt/staff-data/vendors', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            // Si no hay API aún, mostrar datos de ejemplo
            const vendedores = result.success ? result.data : [
                { id: 1, name: 'Juan Pérez', email: 'jperez@aponnt.com', region: 'Buenos Aires', empresas: 12, comision_pendiente: 45000, status: 'active' },
                { id: 2, name: 'María García', email: 'mgarcia@aponnt.com', region: 'Córdoba', empresas: 8, comision_pendiente: 32000, status: 'active' },
                { id: 3, name: 'Carlos López', email: 'clopez@aponnt.com', region: 'Santa Fe', empresas: 15, comision_pendiente: 67000, status: 'active' },
                { id: 4, name: 'Ana Rodríguez', email: 'arodriguez@aponnt.com', region: 'Mendoza', empresas: 6, comision_pendiente: 18000, status: 'active' }
            ];

            // Stats
            const total = vendedores.length;
            const activos = vendedores.filter(v => v.status === 'active').length;
            const totalEmpresas = vendedores.reduce((sum, v) => sum + (v.empresas || 0), 0);
            const totalComisiones = vendedores.reduce((sum, v) => sum + (v.comision_pendiente || 0), 0);

            document.getElementById('stat-total-vendedores').textContent = total;
            document.getElementById('stat-activos').textContent = activos;
            document.getElementById('stat-empresas').textContent = totalEmpresas;
            document.getElementById('stat-comisiones').textContent = this._formatCurrency(totalComisiones);

            if (vendedores.length === 0) {
                container.innerHTML = `<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                    <div style="font-size: 3rem; margin-bottom: 12px;">👥</div>
                    <div>No hay vendedores registrados</div>
                </div>`;
                return;
            }

            container.innerHTML = vendedores.map(v => `
                <div class="vendedor-row">
                    <div class="vendedor-avatar">${(v.name || '??').substring(0, 2).toUpperCase()}</div>
                    <div class="vendedor-info">
                        <span class="vendedor-name">${v.name || '-'}</span>
                        <span class="vendedor-email">${v.email || '-'}</span>
                    </div>
                    <div class="vendedor-region">📍 ${v.region || '-'}</div>
                    <div class="vendedor-empresas">${v.empresas || 0} empresas</div>
                    <div class="vendedor-comision">${this._formatCurrency(v.comision_pendiente || 0)}</div>
                    <div class="vendedor-actions">
                        <button onclick="AdminPanelController.editVendedor(${v.id})" title="Editar">✏️</button>
                        <button onclick="AdminPanelController.viewVendedorDetail(${v.id})" title="Ver detalle">👁️</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('[VENDEDORES] Error:', error);
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff6b6b;">Error al cargar vendedores</div>`;
        }
    },

    showNuevoVendedorModal() {
        alert('Modal de nuevo vendedor - Por implementar');
    },

    editVendedor(id) {
        alert(`Editar vendedor ${id} - Por implementar`);
    },

    viewVendedorDetail(id) {
        alert(`Detalle vendedor ${id} - Por implementar`);
    },

    // ==================== STAFF APONNT ====================
    async _loadStaffAponnt() {
        setTimeout(() => this._loadStaffAponntList(), 100);
        return `
            <div class="section-container staff-aponnt-module">
                <style>
                    .staff-aponnt-module .section-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
                    .staff-aponnt-module h2 { margin: 0 0 8px 0; display: flex; align-items: center; gap: 12px; }
                    .staff-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
                    .staff-tab { padding: 10px 20px; background: rgba(255,255,255,0.05); border: none; border-radius: 8px; color: rgba(255,255,255,0.7); cursor: pointer; transition: all 0.2s; }
                    .staff-tab.active { background: rgba(74,158,255,0.2); color: #4a9eff; }
                    .staff-tab:hover { background: rgba(255,255,255,0.1); }
                    .staff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
                    .staff-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; }
                    .staff-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
                    .staff-card-avatar { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 600; }
                    .staff-card-info h4 { margin: 0 0 4px 0; font-size: 1rem; }
                    .staff-card-info p { margin: 0; font-size: 0.8rem; color: rgba(255,255,255,0.5); }
                    .staff-card-role { display: inline-block; padding: 4px 12px; background: rgba(74,158,255,0.2); color: #4a9eff; border-radius: 20px; font-size: 0.8rem; margin-bottom: 12px; }
                    .staff-card-details { font-size: 0.85rem; color: rgba(255,255,255,0.7); }
                    .staff-card-details div { margin-bottom: 6px; }
                </style>
                <div class="section-header">
                    <h2><span>👔</span> Staff Aponnt</h2>
                    <p class="section-subtitle" style="color: rgba(255,255,255,0.6);">Personal administrativo, soporte y desarrollo</p>
                </div>
                <div class="staff-tabs">
                    <button class="staff-tab active" onclick="AdminPanelController.filterStaffByArea('all')">Todos</button>
                    <button class="staff-tab" onclick="AdminPanelController.filterStaffByArea('admin')">Administración</button>
                    <button class="staff-tab" onclick="AdminPanelController.filterStaffByArea('soporte')">Soporte</button>
                    <button class="staff-tab" onclick="AdminPanelController.filterStaffByArea('dev')">Desarrollo</button>
                </div>
                <div class="staff-grid" id="staff-aponnt-grid">
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                        <div class="spinner-small"></div>
                        <span style="color: rgba(255,255,255,0.6);">Cargando staff...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadStaffAponntList() {
        const container = document.getElementById('staff-aponnt-grid');
        if (!container) return;

        // Datos de ejemplo basados en la estructura organizacional
        const staffMembers = [
            { id: 1, name: 'Director General', email: 'director@aponnt.com', area: 'direccion', role: 'Gerente General', code: 'GG', level: 0, color: '#dc2626' },
            { id: 2, name: 'Gerente Administrativo', email: 'admin@aponnt.com', area: 'admin', role: 'Gerente Administrativo', code: 'GA', level: 1, color: '#0891b2' },
            { id: 3, name: 'Gerente de Desarrollo', email: 'dev@aponnt.com', area: 'dev', role: 'Gerente de Desarrollo', code: 'GD', level: 1, color: '#7c3aed' },
            { id: 4, name: 'Jefe de Administración', email: 'jefe.admin@aponnt.com', area: 'admin', role: 'Jefe de Administración', code: 'JA', level: 2, color: '#0891b2' },
            { id: 5, name: 'Jefe de Ingeniería', email: 'jefe.ing@aponnt.com', area: 'dev', role: 'Jefe de Ingeniería', code: 'JI', level: 2, color: '#7c3aed' },
            { id: 6, name: 'Soporte Nivel 1', email: 'soporte1@aponnt.com', area: 'soporte', role: 'Técnico Soporte', code: 'TS', level: 4, color: '#059669' },
            { id: 7, name: 'Soporte Nivel 2', email: 'soporte2@aponnt.com', area: 'soporte', role: 'Técnico Soporte Sr', code: 'TSS', level: 3, color: '#059669' },
            { id: 8, name: 'Desarrollador Frontend', email: 'frontend@aponnt.com', area: 'dev', role: 'Desarrollador Frontend', code: 'DEV-FE', level: 4, color: '#7c3aed' },
            { id: 9, name: 'Desarrollador Backend', email: 'backend@aponnt.com', area: 'dev', role: 'Desarrollador Backend', code: 'DEV-BE', level: 4, color: '#7c3aed' },
            { id: 10, name: 'Administrativo', email: 'administrativo@aponnt.com', area: 'admin', role: 'Administrativo', code: 'ADM', level: 4, color: '#0891b2' }
        ];

        container.innerHTML = staffMembers.map(s => `
            <div class="staff-card" data-area="${s.area}">
                <div class="staff-card-header">
                    <div class="staff-card-avatar" style="background: ${s.color};">${s.code}</div>
                    <div class="staff-card-info">
                        <h4>${s.name}</h4>
                        <p>${s.email}</p>
                    </div>
                </div>
                <div class="staff-card-role">${s.role}</div>
                <div class="staff-card-details">
                    <div>📊 Nivel: ${s.level}</div>
                    <div>🏢 Área: ${s.area.charAt(0).toUpperCase() + s.area.slice(1)}</div>
                </div>
            </div>
        `).join('');
    },

    filterStaffByArea(area) {
        document.querySelectorAll('.staff-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');

        document.querySelectorAll('.staff-card').forEach(card => {
            if (area === 'all' || card.dataset.area === area) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    },

    // ==================== STAFF ROLES ====================
    async _loadStaffRoles() {
        return `
            <div class="section-container staff-roles-module">
                <style>
                    .staff-roles-module .section-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
                    .staff-roles-module h2 { margin: 0 0 8px 0; display: flex; align-items: center; gap: 12px; }
                    .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
                    .role-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; }
                    .role-card h4 { margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px; }
                    .role-card .role-code { background: rgba(74,158,255,0.2); color: #4a9eff; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
                    .role-card .role-level { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-bottom: 12px; }
                    .role-card .role-permisos { font-size: 0.85rem; color: rgba(255,255,255,0.7); }
                    .role-card .role-permisos span { display: inline-block; background: rgba(34,197,94,0.2); color: #22c55e; padding: 2px 8px; border-radius: 4px; margin: 2px; font-size: 0.75rem; }
                </style>
                <div class="section-header">
                    <h2><span>🎭</span> Roles de Staff</h2>
                    <p class="section-subtitle" style="color: rgba(255,255,255,0.6);">Gestión de roles y permisos del personal</p>
                </div>
                <div class="roles-grid">
                    <div class="role-card">
                        <h4>👔 Gerente General <span class="role-code">GG</span></h4>
                        <div class="role-level">Nivel 0 - Dirección</div>
                        <div class="role-permisos">
                            <span>Full Access</span>
                            <span>Aprobar Pagos</span>
                            <span>Gestionar Staff</span>
                        </div>
                    </div>
                    <div class="role-card">
                        <h4>💼 Gerente Regional <span class="role-code">GR</span></h4>
                        <div class="role-level">Nivel 1 - Gerencia</div>
                        <div class="role-permisos">
                            <span>Ver Empresas</span>
                            <span>Aprobar Presupuestos</span>
                            <span>Gestionar Vendedores</span>
                        </div>
                    </div>
                    <div class="role-card">
                        <h4>📊 Gerente Administrativo <span class="role-code">GA</span></h4>
                        <div class="role-level">Nivel 1 - Gerencia</div>
                        <div class="role-permisos">
                            <span>Facturación</span>
                            <span>Cobranzas</span>
                            <span>Reportes</span>
                        </div>
                    </div>
                    <div class="role-card">
                        <h4>💻 Gerente Desarrollo <span class="role-code">GD</span></h4>
                        <div class="role-level">Nivel 1 - Gerencia</div>
                        <div class="role-permisos">
                            <span>Engineering</span>
                            <span>Releases</span>
                            <span>Debug</span>
                        </div>
                    </div>
                    <div class="role-card">
                        <h4>👤 Jefe Administración <span class="role-code">JA</span></h4>
                        <div class="role-level">Nivel 2 - Jefatura</div>
                        <div class="role-permisos">
                            <span>Procesar Facturas</span>
                            <span>Gestión Documental</span>
                        </div>
                    </div>
                    <div class="role-card">
                        <h4>🔧 Jefe Ingeniería <span class="role-code">JI</span></h4>
                        <div class="role-level">Nivel 2 - Jefatura</div>
                        <div class="role-permisos">
                            <span>Code Review</span>
                            <span>Deploy</span>
                            <span>Arquitectura</span>
                        </div>
                    </div>
                    <div class="role-card">
                        <h4>🤝 Líder de Equipo <span class="role-code">LE</span></h4>
                        <div class="role-level">Nivel 3 - Supervisión</div>
                        <div class="role-permisos">
                            <span>Gestionar Vendedores</span>
                            <span>Ver Comisiones</span>
                        </div>
                    </div>
                    <div class="role-card">
                        <h4>💰 Vendedor <span class="role-code">VE</span></h4>
                        <div class="role-level">Nivel 4 - Operativo</div>
                        <div class="role-permisos">
                            <span>Mis Empresas</span>
                            <span>Presupuestos</span>
                            <span>Mis Comisiones</span>
                        </div>
                    </div>
                    <div class="role-card">
                        <h4>🎫 Soporte <span class="role-code">SP</span></h4>
                        <div class="role-level">Nivel 4 - Operativo</div>
                        <div class="role-permisos">
                            <span>Tickets</span>
                            <span>Empresas (Solo Lectura)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ==================== ORGANIGRAMA ====================
    async _loadOrganigrama() {
        setTimeout(() => this._initOrgChartIntelligent(), 100);
        return `
            <div class="section-container organigrama-module" style="height: calc(100vh - 150px);">
                <div id="organigrama-intelligent-container" style="width: 100%; height: 100%;"></div>
            </div>
        `;
    },

    async _initOrgChartIntelligent() {
        // Cargar el script si no está ya cargado
        if (!window.OrgChartIntelligent) {
            const script = document.createElement('script');
            script.src = '/js/modules/OrgChartIntelligent.js?v=' + Date.now();
            script.onload = () => {
                this._createOrgChart();
            };
            script.onerror = () => {
                console.error('[ORGANIGRAMA] Error cargando OrgChartIntelligent.js');
                document.getElementById('organigrama-intelligent-container').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #ef4444;">
                        <div style="font-size: 3rem; margin-bottom: 16px;">❌</div>
                        <div>Error cargando componente de organigrama</div>
                    </div>
                `;
            };
            document.head.appendChild(script);
        } else {
            this._createOrgChart();
        }
    },

    _createOrgChart() {
        const orgchart = new OrgChartIntelligent({
            type: 'aponnt',
            containerId: 'organigrama-intelligent-container',
            mode: '2d',
            onNodeClick: (node) => {
                console.log('[ORGANIGRAMA] Nodo seleccionado:', node);
                // Aquí se puede mostrar modal con detalles del staff
            }
        });

        orgchart.init();

        // Guardar instancia para poder refreshar después
        window.orgchartInstance = orgchart;
    },

    // LEGACY METHOD (mantener por si acaso)
    async _loadOrganigramaData_OLD() {
        const container = document.getElementById('organigrama-content');
        if (!container) return;

        try {
            const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
            const response = await fetch('/api/brain/orgchart/aponnt', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (!result.success) {
                container.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff6b6b;">Error: ${result.message}</div>`;
                return;
            }

            const { data, stats } = result;

            // LEGACY: Este método está deprecado, usar _loadOrganigramaData() en su lugar
            console.log('[AdminPanel] _loadOrganigramaData_OLD() deprecado');
        } catch (error) {
            console.error('[AdminPanel] Error en organigrama legacy:', error);
        }
    },

    async _loadOrganigramaData() {
        const container = document.getElementById('organigrama-content');
        if (!container) return;

        try {
            const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
            const response = await fetch('/api/aponnt/staff-data/organigrama/data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (!result.success) {
                container.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff6b6b;">Error: ${result.message}</div>`;
                return;
            }

            const { data, stats } = result;

            // Actualizar stats
            document.getElementById('org-total-roles').textContent = stats.totalRoles;
            document.getElementById('org-total-staff').textContent = stats.totalStaff;
            document.getElementById('org-roles-vacios').textContent = stats.rolesVacios;

            // Iconos por área
            const iconos = {
                direccion: '👔', ventas: '💼', admin: '📊', desarrollo: '💻', soporte: '🎫', externo: '🌐'
            };

            // Renderizar niveles
            const renderNivel = (titulo, roles, nivelNum) => {
                if (!roles || roles.length === 0) return '';
                return `
                    <div class="org-nivel">
                        <div class="org-nivel-title">Nivel ${nivelNum} - ${titulo}</div>
                        <div class="org-nivel-grid">
                            ${roles.map(role => this._renderOrgCard(role, iconos)).join('')}
                        </div>
                    </div>
                `;
            };

            container.innerHTML = `
                ${renderNivel('Dirección', data.nivel0, 0)}
                ${renderNivel('Gerencias', data.nivel1.filter(r => r.area !== 'externo'), 1)}
                ${renderNivel('Jefaturas', data.nivel2, 2)}
                ${renderNivel('Coordinadores / Especialistas', data.nivel3, 3)}
                ${renderNivel('Operativos', data.nivel4, 4)}
                ${data.externos && data.externos.length > 0 ? renderNivel('Staff Externo', data.externos, 'E') : ''}
            `;

        } catch (error) {
            console.error('[ORGANIGRAMA] Error:', error);
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff6b6b;">Error al cargar organigrama</div>`;
        }
    },

    _renderOrgCard(role, iconos) {
        const isEmpty = !role.staff || role.staff.length === 0;
        const icon = iconos[role.area] || '👤';
        const maxShow = 3;

        return `
            <div class="org-card ${isEmpty ? 'vacante' : ''}">
                <div class="org-card-header">
                    <div class="org-card-icon ${role.area}">${icon}</div>
                    <div class="org-card-info">
                        <h4>${role.name}</h4>
                        <span class="code">${role.code} · ${role.area}</span>
                    </div>
                </div>
                <div class="org-card-staff">
                    ${isEmpty ? `
                        <span class="org-vacante-badge">⚠️ Vacante - Sin asignar</span>
                    ` : `
                        ${role.staff.slice(0, maxShow).map(s => `
                            <div class="org-staff-item">
                                <div class="org-staff-avatar">${s.name.substring(0, 2).toUpperCase()}</div>
                                <span class="org-staff-name">${s.name}</span>
                            </div>
                        `).join('')}
                        ${role.staff.length > maxShow ? `
                            <div class="org-card-count">+${role.staff.length - maxShow} más...</div>
                        ` : ''}
                    `}
                </div>
            </div>
        `;
    },

    async _loadIngenieriaDashboard() {
        return `
            <div class="section-container full-width">
                <div id="engineering-dashboard-container">
                    <!-- EngineeringDashboard se renderizará aquí -->
                </div>
            </div>
        `;
    },

    async _loadAITestingDashboard() {
        return `
            <div class="section-container full-width">
                <div id="ai-testing-container">
                    <!-- AITestingDashboard se renderizará aquí -->
                </div>
            </div>
        `;
    },

    async _loadAponntEmailConfig() {
        return `
            <div class="section-container full-width">
                <div id="email-config-container">
                    <!-- AponntEmailConfigModule se renderizará aquí -->
                </div>
            </div>
        `;
    },

    async _loadBrainEcosystem() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>🧠 Brain Ecosystem</h2>
                    <p class="section-subtitle">Sistema de auto-conocimiento del sistema</p>
                </div>
                <div id="brain-ecosystem-container">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando Brain Ecosystem...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _initBrainEcosystemInline() {
        console.log('[Brain] _initBrainEcosystemInline llamado');
        const container = document.getElementById('brain-ecosystem-container');
        console.log('[Brain] Container encontrado:', !!container);
        if (!container) {
            console.error('[Brain] Container brain-ecosystem-container NO encontrado');
            return;
        }

        try {
            console.log('[Brain] Cargando datos de API...');
            // Cargar datos del Brain
            const [overviewRes, workflowsRes, commercialRes] = await Promise.all([
                fetch('/api/brain/overview'),
                fetch('/api/brain/workflows'),
                fetch('/api/brain/commercial-modules')
            ]);
            console.log('[Brain] Respuestas recibidas:', overviewRes.status, workflowsRes.status, commercialRes.status);

            const overview = await overviewRes.json();
            const workflows = await workflowsRes.json();
            const commercial = await commercialRes.json();

            if (!overview.success) throw new Error(overview.error || 'Error cargando overview');

            const data = overview.data;
            const wfData = workflows.success ? workflows.data : { workflows: [] };
            const commercialModules = commercial.success ? commercial.data.modules : [];

            container.innerHTML = `
                <div class="brain-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">

                    <!-- Stats Card -->
                    <div class="brain-card" style="background: var(--dark-bg-card, #1a1a2e); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.1);">
                        <h3 style="color: var(--accent-primary, #f59e0b); margin: 0 0 15px 0;">📊 Estado del Sistema</h3>
                        <div style="display: grid; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <span style="color: rgba(255,255,255,0.6);">Archivos Backend</span>
                                <span style="color: #22c55e; font-weight: 600;">${data.stats?.backend?.totalFiles || 0}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <span style="color: rgba(255,255,255,0.6);">Archivos Frontend</span>
                                <span style="color: #3b82f6; font-weight: 600;">${data.stats?.frontend?.totalFiles || 0}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <span style="color: rgba(255,255,255,0.6);">Rutas API</span>
                                <span style="color: #8b5cf6; font-weight: 600;">${data.stats?.backend?.routes || 0}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <span style="color: rgba(255,255,255,0.6);">Servicios</span>
                                <span style="color: #ec4899; font-weight: 600;">${data.stats?.backend?.services || 0}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                <span style="color: rgba(255,255,255,0.6);">Tablas BD</span>
                                <span style="color: #14b8a6; font-weight: 600;">${data.stats?.database?.tables || 0}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Módulos Comerciales -->
                    <div class="brain-card" style="background: var(--dark-bg-card, #1a1a2e); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.1);">
                        <h3 style="color: var(--accent-primary, #f59e0b); margin: 0 0 15px 0;">💰 Módulos Comerciales</h3>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${commercialModules.slice(0, 10).map(m => `
                                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <span style="font-size: 1.2em;">${m.icon || '📦'}</span>
                                    <span style="color: rgba(255,255,255,0.9); flex: 1;">${m.name}</span>
                                    <span style="color: ${m.isCore ? '#22c55e' : '#3b82f6'}; font-size: 0.75em; padding: 2px 8px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                                        ${m.isCore ? 'CORE' : 'ADD-ON'}
                                    </span>
                                </div>
                            `).join('')}
                            ${commercialModules.length > 10 ? `<p style="color: rgba(255,255,255,0.5); text-align: center; margin: 10px 0;">+${commercialModules.length - 10} más...</p>` : ''}
                        </div>
                    </div>

                    <!-- Workflows Detectados -->
                    <div class="brain-card" style="background: var(--dark-bg-card, #1a1a2e); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.1);">
                        <h3 style="color: var(--accent-primary, #f59e0b); margin: 0 0 15px 0;">🔄 Workflows Detectados</h3>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${(wfData.workflows || []).slice(0, 8).map(wf => `
                                <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <div style="color: rgba(255,255,255,0.9); font-weight: 500;">${wf.name || wf.module}</div>
                                    <div style="color: rgba(255,255,255,0.5); font-size: 0.85em;">${wf.stages?.length || 0} etapas</div>
                                </div>
                            `).join('')}
                            ${(wfData.workflows || []).length === 0 ? '<p style="color: rgba(255,255,255,0.5);">No hay workflows configurados</p>' : ''}
                        </div>
                    </div>

                    <!-- Última Actualización -->
                    <div class="brain-card" style="background: var(--dark-bg-card, #1a1a2e); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.1);">
                        <h3 style="color: var(--accent-primary, #f59e0b); margin: 0 0 15px 0;">🕐 Estado del Brain</h3>
                        <div style="display: grid; gap: 10px;">
                            <div style="padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; border-left: 3px solid #22c55e;">
                                <div style="color: #22c55e; font-weight: 600;">✅ Brain Activo</div>
                                <div style="color: rgba(255,255,255,0.6); font-size: 0.85em;">Monitoreando cambios en tiempo real</div>
                            </div>
                            <div style="padding: 10px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border-left: 3px solid #3b82f6;">
                                <div style="color: #3b82f6; font-weight: 600;">📡 File Watcher</div>
                                <div style="color: rgba(255,255,255,0.6); font-size: 0.85em;">Observando ${data.stats?.services || 0} servicios</div>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Acciones -->
                <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="AdminPanelController._refreshBrainData()" class="btn btn-primary" style="background: var(--accent-primary, #f59e0b); border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; color: #000; font-weight: 600;">
                        🔄 Refrescar Datos
                    </button>
                    <button onclick="window.open('/api/brain/overview', '_blank')" class="btn btn-secondary" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 8px; cursor: pointer; color: #fff;">
                        📋 Ver JSON Completo
                    </button>
                </div>
            `;
        } catch (error) {
            console.error('[Brain] Error:', error);
            container.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 12px; padding: 20px; text-align: center;">
                    <h3 style="color: #ef4444; margin: 0 0 10px 0;">❌ Error cargando Brain</h3>
                    <p style="color: rgba(255,255,255,0.6);">${error.message}</p>
                    <button onclick="AdminPanelController._initBrainEcosystemInline()" style="margin-top: 15px; background: #ef4444; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; color: #fff;">
                        Reintentar
                    </button>
                </div>
            `;
        }
    },

    async _refreshBrainData() {
        const container = document.getElementById('brain-ecosystem-container');
        if (container) {
            container.innerHTML = '<div class="loading-placeholder"><div class="spinner-small"></div><span>Actualizando...</span></div>';
        }
        await this._initBrainEcosystemInline();
    },

    async _loadAuditorSistema() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Auditor del Sistema</h2>
                    <p class="section-subtitle">Diagnóstico y auto-reparación</p>
                </div>
                <div id="auditor-dashboard-container">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando Auditor...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadNotificaciones() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Notificaciones</h2>
                    <p class="section-subtitle">Centro de notificaciones</p>
                </div>
                <div class="notifications-list" id="notifications-list">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando notificaciones...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadCapacitaciones() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Capacitaciones</h2>
                    <p class="section-subtitle">Tutoriales y material de formación</p>
                </div>
                <div class="capacitaciones-grid" id="capacitaciones-grid">
                    <div class="loading-placeholder">
                        <div class="spinner-small"></div>
                        <span>Cargando capacitaciones...</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadReportes() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>Reportes</h2>
                    <p class="section-subtitle">Generación de reportes</p>
                </div>
                <div class="reports-grid">
                    <div class="report-card" onclick="AdminPanelController.generateReport('ventas')">
                        <i class="fas fa-chart-line"></i>
                        <span>Reporte de Ventas</span>
                    </div>
                    <div class="report-card" onclick="AdminPanelController.generateReport('facturacion')">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <span>Reporte de Facturación</span>
                    </div>
                    <div class="report-card" onclick="AdminPanelController.generateReport('comisiones')">
                        <i class="fas fa-percentage"></i>
                        <span>Reporte de Comisiones</span>
                    </div>
                    <div class="report-card" onclick="AdminPanelController.generateReport('soporte')">
                        <i class="fas fa-headset"></i>
                        <span>Reporte de Soporte</span>
                    </div>
                </div>
            </div>
        `;
    },

    // ===== LOADERS ADICIONALES =====

    async _loadComercial() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>💰 Comercial</h2>
                    <p class="section-subtitle">Módulos, precios y bundles</p>
                </div>
                <div class="cards-grid">
                    <div class="quick-action-card" onclick="AdminPanelController.loadSection('presupuestos')">
                        <span class="card-icon">📄</span>
                        <h3>Presupuestos</h3>
                        <p>Crear y gestionar presupuestos</p>
                    </div>
                    <div class="quick-action-card" onclick="AdminPanelController.loadSection('contratos')">
                        <span class="card-icon">📑</span>
                        <h3>Contratos</h3>
                        <p>Contratos activos y vencidos</p>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadMisComisiones() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>💵 Mis Comisiones</h2>
                    <p class="section-subtitle">Comisiones pendientes y cobradas</p>
                </div>
                <div class="stats-cards">
                    <div class="stat-card success">
                        <span class="stat-icon">💰</span>
                        <div class="stat-info">
                            <span class="stat-value">$0</span>
                            <span class="stat-label">Pendientes de Cobro</span>
                        </div>
                    </div>
                    <div class="stat-card info">
                        <span class="stat-icon">✅</span>
                        <div class="stat-info">
                            <span class="stat-value">$0</span>
                            <span class="stat-label">Cobradas este mes</span>
                        </div>
                    </div>
                </div>
                <div class="table-container" id="mis-comisiones-table">
                    <p class="empty-state">No hay comisiones registradas</p>
                </div>
            </div>
        `;
    },

    async _loadTodosPresupuestos() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>📄 Todos los Presupuestos</h2>
                    <p class="section-subtitle">Vista general de presupuestos del equipo</p>
                </div>
                <div class="table-container" id="todos-presupuestos-table">
                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>Empresa</th><th>Vendedor</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="6" class="empty-row">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async _loadTodosContratos() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>📑 Todos los Contratos</h2>
                    <p class="section-subtitle">Vista general de contratos</p>
                </div>
                <div class="table-container" id="todos-contratos-table">
                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>Empresa</th><th>Tipo</th><th>Vigencia</th><th>Estado</th></tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="5" class="empty-row">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async _loadComisionesPago() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>💵 Comisiones - Pagos</h2>
                    <p class="section-subtitle">Liquidación y pago de comisiones</p>
                </div>
                <div class="tabs-container">
                    <button class="tab active" data-tab="pendientes">Pendientes</button>
                    <button class="tab" data-tab="pagadas">Pagadas</button>
                    <button class="tab" data-tab="liquidacion">Liquidación</button>
                </div>
                <div class="table-container" id="comisiones-pago-table">
                    <p class="empty-state">Seleccione una pestaña</p>
                </div>
            </div>
        `;
    },

    async _loadPagoComisiones() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>💳 Autorizar Pago de Comisiones</h2>
                    <p class="section-subtitle">Aprobar pagos pendientes</p>
                </div>
                <div class="approval-queue" id="pago-comisiones-queue">
                    <p class="empty-state">No hay pagos pendientes de aprobación</p>
                </div>
            </div>
        `;
    },

    async _loadReportesFinancieros() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>📊 Reportes Financieros</h2>
                    <p class="section-subtitle">Informes de facturación y comisiones</p>
                </div>
                <div class="reports-grid">
                    <div class="report-card">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <span>Facturación Mensual</span>
                    </div>
                    <div class="report-card">
                        <i class="fas fa-percentage"></i>
                        <span>Comisiones por Vendedor</span>
                    </div>
                    <div class="report-card">
                        <i class="fas fa-chart-bar"></i>
                        <span>Ingresos vs Gastos</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadReportesConsolidados() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>📋 Reportes Consolidados</h2>
                    <p class="section-subtitle">Vista ejecutiva de toda la operación</p>
                </div>
                <div class="executive-summary">
                    <div class="summary-card">
                        <h4>Ventas del Mes</h4>
                        <span class="big-number">$0</span>
                    </div>
                    <div class="summary-card">
                        <h4>Nuevos Clientes</h4>
                        <span class="big-number">0</span>
                    </div>
                    <div class="summary-card">
                        <h4>Tickets Abiertos</h4>
                        <span class="big-number">0</span>
                    </div>
                    <div class="summary-card">
                        <h4>SLA Cumplido</h4>
                        <span class="big-number">--%</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadMisTickets() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>🎫 Mis Tickets de Soporte</h2>
                    <p class="section-subtitle">Tickets de tus empresas asignadas</p>
                </div>
                <div class="table-container" id="mis-tickets-table">
                    <table class="data-table">
                        <thead>
                            <tr><th>#</th><th>Empresa</th><th>Asunto</th><th>Estado</th><th>Fecha</th></tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="5" class="empty-row">No tienes tickets</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async _loadTodosTickets() {
        // Usar el componente AdminSupportTicketsView si está disponible
        if (typeof AdminSupportTicketsView !== 'undefined') {
            setTimeout(() => {
                const ticketsView = new AdminSupportTicketsView();
                ticketsView.init();
            }, 100);
            return `<div id="admin-support-tickets-container" class="section-container"></div>`;
        }

        // Fallback: cargar tickets directamente del API (filtrado por rol)
        const html = `
            <div class="section-container tickets-dashboard">
                <div class="section-header">
                    <h2>🎫 Tickets de Soporte</h2>
                    <p class="section-subtitle">Tickets según tu rol y empresas asignadas</p>
                </div>
                <div id="tickets-loading" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p>Cargando tickets...</p>
                </div>
                <div id="tickets-content" style="display: none;"></div>
            </div>
        `;

        // Cargar tickets después de renderizar
        setTimeout(async () => {
            try {
                // Usar el método _getToken que revisa localStorage Y sessionStorage
                const token = AdminPanelController._getToken();
                console.log('[AdminPanel] Token para tickets:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN');

                // Verificar que hay token antes de hacer fetch
                if (!token || token === 'null' || token === 'undefined') {
                    console.error('[AdminPanel] No hay token válido para cargar tickets');
                    document.getElementById('tickets-loading').style.display = 'none';
                    const content = document.getElementById('tickets-content');
                    content.style.display = 'block';
                    content.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #ef4444;">
                            <i class="fas fa-exclamation-triangle fa-3x" style="margin-bottom: 15px;"></i>
                            <p>Sesión expirada. Por favor recargue la página.</p>
                        </div>
                    `;
                    return;
                }

                // Usar endpoint admin con filtrado por rol
                const response = await fetch('/api/support/v2/admin/tickets?limit=50', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Error ${response.status}`);
                }

                const data = await response.json();
                const tickets = data.tickets || data.data || [];

                document.getElementById('tickets-loading').style.display = 'none';
                const content = document.getElementById('tickets-content');
                content.style.display = 'block';

                if (tickets.length === 0) {
                    content.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                            <i class="fas fa-inbox fa-3x" style="margin-bottom: 15px;"></i>
                            <p>No hay tickets pendientes</p>
                        </div>
                    `;
                    return;
                }

                content.innerHTML = `
                    <table class="data-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Empresa</th>
                                <th>Asunto</th>
                                <th>Prioridad</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tickets.map(t => `
                                <tr>
                                    <td>${t.ticket_number || t.id?.substring(0,8) || '-'}</td>
                                    <td>${t.company_name || t.Company?.name || '-'}</td>
                                    <td>${t.subject || '-'}</td>
                                    <td><span class="priority-badge ${t.priority}">${t.priority || '-'}</span></td>
                                    <td><span class="status-badge ${t.status}">${t.status || '-'}</span></td>
                                    <td>${t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } catch (error) {
                console.error('[TICKETS] Error cargando:', error);
                document.getElementById('tickets-loading').innerHTML = `
                    <div style="color: #ef4444;">
                        <i class="fas fa-exclamation-triangle fa-2x"></i>
                        <p>Error cargando tickets: ${error.message}</p>
                    </div>
                `;
            }
        }, 200);

        return html;
    },

    async _loadMetricasSoporte() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>📈 Métricas de Soporte</h2>
                    <p class="section-subtitle">SLA, tiempos de respuesta y escalamientos</p>
                </div>
                <div class="stats-cards">
                    <div class="stat-card success">
                        <span class="stat-icon">✅</span>
                        <div class="stat-info">
                            <span class="stat-value">--%</span>
                            <span class="stat-label">SLA Cumplido</span>
                        </div>
                    </div>
                    <div class="stat-card warning">
                        <span class="stat-icon">⏱️</span>
                        <div class="stat-info">
                            <span class="stat-value">--h</span>
                            <span class="stat-label">Tiempo Promedio</span>
                        </div>
                    </div>
                    <div class="stat-card danger">
                        <span class="stat-icon">🔺</span>
                        <div class="stat-info">
                            <span class="stat-value">0</span>
                            <span class="stat-label">Escalamientos</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadBandejaCentral() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>📬 Bandeja Central</h2>
                    <p class="section-subtitle">Notificaciones de soporte</p>
                </div>
                <div class="inbox-list" id="bandeja-central-list">
                    <p class="empty-state">No hay notificaciones nuevas</p>
                </div>
            </div>
        `;
    },

    async _loadEmpresasAdmin() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>🏢 Gestión de Empresas</h2>
                    <p class="section-subtitle">Vista administrativa de todas las empresas</p>
                    <button class="btn-primary" onclick="AdminPanelController.nuevaEmpresa()">
                        <i class="fas fa-plus"></i> Nueva Empresa
                    </button>
                </div>
                <div class="table-container" id="empresas-admin-table">
                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>Nombre</th><th>Vendedor</th><th>Plan</th><th>Estado</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="6" class="empty-row">Cargando empresas...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async _loadEmpresasContexto() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>🏢 Empresas (Contexto)</h2>
                    <p class="section-subtitle">Vista de solo lectura para contexto de tickets</p>
                </div>
                <div class="search-bar">
                    <input type="text" placeholder="Buscar empresa..." id="search-empresa-contexto">
                </div>
                <div class="table-container" id="empresas-contexto-table">
                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>Nombre</th><th>Plan</th><th>Tickets Abiertos</th></tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="4" class="empty-row">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async _loadDebugging() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>🔧 Herramientas de Debugging</h2>
                    <p class="section-subtitle">Auditor, logs y performance</p>
                </div>
                <div class="cards-grid">
                    <div class="quick-action-card" onclick="AdminPanelController.loadSection('auditor-sistema')">
                        <span class="card-icon">🔍</span>
                        <h3>Auditor de Sistema</h3>
                        <p>Tests automáticos y diagnósticos</p>
                    </div>
                    <div class="quick-action-card">
                        <span class="card-icon">📜</span>
                        <h3>Logs del Sistema</h3>
                        <p>Revisar logs de errores</p>
                    </div>
                    <div class="quick-action-card">
                        <span class="card-icon">⚡</span>
                        <h3>Performance</h3>
                        <p>Métricas de rendimiento</p>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadMetricasTech() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>📡 Métricas Técnicas</h2>
                    <p class="section-subtitle">Estado del sistema y recursos</p>
                </div>
                <div class="stats-cards">
                    <div class="stat-card info">
                        <span class="stat-icon">💻</span>
                        <div class="stat-info">
                            <span class="stat-value">--</span>
                            <span class="stat-label">CPU Usage</span>
                        </div>
                    </div>
                    <div class="stat-card info">
                        <span class="stat-icon">🧠</span>
                        <div class="stat-info">
                            <span class="stat-value">-- MB</span>
                            <span class="stat-label">Memory</span>
                        </div>
                    </div>
                    <div class="stat-card success">
                        <span class="stat-icon">🟢</span>
                        <div class="stat-info">
                            <span class="stat-value">Online</span>
                            <span class="stat-label">Status</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async _loadMisNotificaciones() {
        return `
            <div class="section-container">
                <div class="section-header">
                    <h2>🔔 Mis Notificaciones</h2>
                    <p class="section-subtitle">Bandeja de notificaciones comerciales</p>
                </div>
                <div class="notifications-list" id="mis-notificaciones-list">
                    <p class="empty-state">No tienes notificaciones nuevas</p>
                </div>
            </div>
        `;
    },

    _getPlaceholderContent(sectionId) {
        return `
            <div class="section-container">
                <div class="placeholder-content">
                    <i class="fas fa-tools"></i>
                    <h3>Sección en Desarrollo</h3>
                    <p>La sección "${sectionId}" está siendo implementada.</p>
                </div>
            </div>
        `;
    },

    // ============================
    // AUTENTICACIÓN
    // ============================

    _getToken() {
        return localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
    },

    _clearToken() {
        localStorage.removeItem('aponnt_token_staff');
        sessionStorage.removeItem('aponnt_token_staff');
    },

    async _fetchStaffData(token) {
        try {
            // Decodificar JWT para obtener datos del staff
            // El JWT tiene 3 partes separadas por punto: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error('[AdminPanel] Token JWT inválido');
                return null;
            }

            // Decodificar el payload (parte 2) desde Base64
            const payload = JSON.parse(atob(parts[1]));

            // Verificar que sea un token de staff
            if (payload.type !== 'aponnt_staff') {
                console.error('[AdminPanel] Token no es de staff');
                return null;
            }

            // Verificar expiración
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                console.error('[AdminPanel] Token expirado');
                return null;
            }

            // Construir objeto de staff desde el payload del JWT
            // RolePermissions espera staff.role.role_code, así que incluimos ambos formatos
            return {
                staff_id: payload.staff_id,
                user_id: payload.user_id,
                email: payload.email,
                full_name: payload.is_backdoor
                    ? 'Super Admin'
                    : `${payload.first_name || ''} ${payload.last_name || ''}`.trim() || payload.email,
                first_name: payload.first_name || 'Super',
                last_name: payload.last_name || 'Admin',
                // Formato plano (legacy)
                role_code: payload.role,
                role_name: payload.role_name || payload.role,
                // Formato nested (RolePermissions espera esto)
                role: {
                    role_code: payload.role,
                    role_name: payload.role_name || payload.role,
                    level: payload.level,
                    area: payload.area
                },
                level: payload.level,
                area: payload.area,
                country: payload.country,
                language: payload.language,
                is_backdoor: payload.is_backdoor || false
            };

        } catch (error) {
            console.error('[AdminPanel] Error decodificando token:', error);
            return null;
        }
    },

    // ============================
    // LOGIN FORM
    // ============================

    _showLoginForm() {
        this._hideLoading();
        document.body.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="login-header">
                        <img src="/img/aponnt-logo-white.png" alt="APONNT" class="login-logo" onerror="this.style.display='none'">
                        <h1>APONNT</h1>
                        <p>Panel Administrativo</p>
                    </div>
                    <form id="login-form" class="login-form">
                        <div class="form-group">
                            <label for="login-email">Email</label>
                            <input type="text" id="login-email" required placeholder="Email o usuario">
                        </div>
                        <div class="form-group">
                            <label for="login-password">Contraseña</label>
                            <input type="password" id="login-password" required placeholder="••••••••">
                        </div>
                        <div class="form-group checkbox-group">
                            <label>
                                <input type="checkbox" id="login-remember"> Recordarme
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                        </button>
                        <div id="login-error" class="login-error" style="display: none;"></div>
                    </form>
                </div>
            </div>
        `;

        // Event listener para el form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleLogin();
        });
    },

    async _handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const remember = document.getElementById('login-remember').checked;
        const errorDiv = document.getElementById('login-error');

        try {
            errorDiv.style.display = 'none';

            const response = await fetch('/api/aponnt/staff/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success && data.token) {
                // Guardar token
                if (remember) {
                    localStorage.setItem('aponnt_token_staff', data.token);
                } else {
                    sessionStorage.setItem('aponnt_token_staff', data.token);
                }

                // Recargar página para inicializar el panel
                window.location.reload();
            } else {
                errorDiv.textContent = data.message || 'Credenciales inválidas';
                errorDiv.style.display = 'block';
            }

        } catch (error) {
            errorDiv.textContent = 'Error de conexión. Intente nuevamente.';
            errorDiv.style.display = 'block';
        }
    },

    // ============================
    // UI HELPERS
    // ============================

    _showLoading(message = 'Cargando...') {
        if (this._loadingOverlay) {
            const textEl = this._loadingOverlay.querySelector('.loading-text');
            if (textEl) textEl.textContent = message;
            this._loadingOverlay.classList.add('visible');
        }
    },

    _hideLoading() {
        if (this._loadingOverlay) {
            this._loadingOverlay.classList.remove('visible');
        }
    },

    _showError(message) {
        if (this._contentArea) {
            this._contentArea.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="AdminPanelController.loadSection('${this._currentSection}')">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            `;
        }
    },

    _showAccessDenied() {
        if (this._contentArea) {
            this._contentArea.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-lock"></i>
                    <h3>Acceso Denegado</h3>
                    <p>No tienes permisos para acceder a esta sección.</p>
                    <button class="btn btn-primary" onclick="AdminSidebar.navigateTo('${RolePermissions.getDefaultSection(this._currentStaff)}')">
                        <i class="fas fa-home"></i> Ir al Inicio
                    </button>
                </div>
            `;
        }
    },

    _getRoleDisplayName(roleType) {
        const names = {
            'GERENCIA': 'Gerencia',
            'VENDEDOR': 'Vendedor',
            'LIDER_VENTAS': 'Líder Ventas',
            'SOPORTE': 'Soporte',
            'ADMINISTRACION': 'Admin',
            'INGENIERIA': 'Ingeniería'
        };
        return names[roleType] || roleType;
    },

    // ============================
    // MARKETING LOADERS
    // ============================

    async _loadMarketing() {
        // El módulo MarketingLeadsModule se encarga del render completo
        return `<div id="marketing-container"></div>`;
    },

    async _loadSalesOrchestration() {
        // El módulo SalesOrchestrationDashboard se encarga del render completo
        return `<div id="sales-orchestration-container"></div>`;
    },

    async _loadPipelineVentas() {
        // El módulo LeadsPipelineDashboard se encarga del render completo
        return `<div id="pipeline-ventas-container"></div>`;
    },

    // ============================
    // MODAL HELPERS (stubs)
    // ============================

    showNewCompanyModal() {
        console.log('[AdminPanel] TODO: Implementar modal nueva empresa');
        alert('Modal de Nueva Empresa - Por implementar');
    },

    showNewBudgetModal() {
        console.log('[AdminPanel] TODO: Implementar modal nuevo presupuesto');
        alert('Modal de Nuevo Presupuesto - Por implementar');
    },

    showNewInvoiceModal() {
        console.log('[AdminPanel] TODO: Implementar modal nueva factura');
        alert('Modal de Nueva Factura - Por implementar');
    },

    showNewStaffModal() {
        console.log('[AdminPanel] TODO: Implementar modal nuevo staff');
        alert('Modal de Nuevo Staff - Por implementar');
    },

    generateReport(type) {
        console.log('[AdminPanel] TODO: Implementar generación de reporte:', type);
        alert(`Generando reporte: ${type} - Por implementar`);
    }
};

// Exportar para uso global
window.AdminPanelController = AdminPanelController;

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    AdminPanelController.init();
});
