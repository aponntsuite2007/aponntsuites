/**
 * NOTIFICATIONS ADMIN - Bandeja de Notificaciones para Panel Administrativo
 *
 * Módulo para gestionar notificaciones desde el panel admin de Aponnt:
 * - Ver notificaciones de todas las empresas
 * - Filtrado por empresa, estado, prioridad
 * - Estadísticas globales y tracking de emails
 *
 * @version 1.0
 * @date 2026-02-02
 */

const NotificationsAdmin = {
    // Estado interno
    notifications: [],
    companies: [],
    stats: {},
    emailTracking: {},
    emailsList: [],
    selectedNotification: null,
    filters: {
        company_id: null,
        status: 'all',
        priority: 'all',
        search: ''
    },
    pagination: {
        limit: 50,
        offset: 0,
        total: 0
    },
    refreshInterval: null,

    // Configuración de tipos de grupos
    GROUP_TYPE_CONFIG: {
        proactive_vacation_expiry: { icon: '🏖️', label: 'Vacaciones por Vencer', color: '#3498db' },
        proactive_overtime_limit: { icon: '⏰', label: 'Límite Horas Extra', color: '#e74c3c' },
        proactive_rest_violation: { icon: '😴', label: 'Violación Descanso', color: '#9b59b6' },
        proactive_document_expiry: { icon: '📄', label: 'Documentos por Vencer', color: '#f39c12' },
        proactive_certificate_expiry: { icon: '🏥', label: 'Certificados Médicos', color: '#1abc9c' },
        vacation_request: { icon: '🌴', label: 'Solicitud Vacaciones', color: '#27ae60' },
        leave_request: { icon: '📝', label: 'Solicitud Licencia', color: '#2980b9' },
        overtime_request: { icon: '💼', label: 'Solicitud Horas Extra', color: '#8e44ad' },
        late_arrival: { icon: '🕐', label: 'Llegada Tarde', color: '#e67e22' },
        shift_swap: { icon: '🔄', label: 'Cambio de Turno', color: '#16a085' },
        system_alert: { icon: '⚠️', label: 'Alerta Sistema', color: '#c0392b' },
        announcement: { icon: '📢', label: 'Anuncio', color: '#16a085' },
        default: { icon: '🔔', label: 'Notificación', color: '#95a5a6' }
    },

    PRIORITY_CONFIG: {
        critical: { icon: '🔴', label: 'Crítica', color: '#c0392b' },
        urgent: { icon: '🔴', label: 'Urgente', color: '#c0392b' },
        high: { icon: '🟠', label: 'Alta', color: '#e67e22' },
        medium: { icon: '🟡', label: 'Media', color: '#f1c40f' },
        normal: { icon: '🟢', label: 'Normal', color: '#27ae60' },
        low: { icon: '⚪', label: 'Baja', color: '#95a5a6' }
    },

    // ========== INICIALIZACIÓN ==========

    async init(containerId = 'content-area') {
        console.log('🔔 [NOTIFICATIONS-ADMIN] Iniciando...');
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('[NOTIFICATIONS-ADMIN] Container no encontrado:', containerId);
            return;
        }

        this.injectStyles();
        this.render();
        await this.loadData();
        this.startAutoRefresh();
    },

    async loadData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadNotifications(),
                this.loadCompanies(),
                this.loadEmailTracking()
            ]);
        } catch (error) {
            console.error('[NOTIFICATIONS-ADMIN] Error loading data:', error);
        }
    },

    // ========== API CALLS ==========

    getAuthHeaders() {
        const token = window.getMultiKeyToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    async loadNotifications() {
        try {
            const params = new URLSearchParams({
                limit: this.pagination.limit,
                offset: this.pagination.offset,
                status: this.filters.status,
                priority: this.filters.priority
            });

            if (this.filters.company_id) {
                params.append('company_id', this.filters.company_id);
            }
            if (this.filters.search) {
                params.append('search', this.filters.search);
            }

            const response = await fetch(`/api/admin/notifications?${params}`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            if (data.success) {
                this.notifications = data.data.groups || [];
                this.pagination.total = data.data.total;
                this.renderList();
            }
        } catch (error) {
            console.error('[NOTIFICATIONS-ADMIN] Error loading notifications:', error);
        }
    },

    async loadStats() {
        try {
            const params = this.filters.company_id ? `?company_id=${this.filters.company_id}` : '';
            const response = await fetch(`/api/admin/notifications/stats${params}`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            if (data.success) {
                this.stats = data.stats;
                this.renderStats();
            }
        } catch (error) {
            console.error('[NOTIFICATIONS-ADMIN] Error loading stats:', error);
        }
    },

    async loadCompanies() {
        try {
            const response = await fetch('/api/admin/notifications/companies/list', {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            if (data.success) {
                this.companies = data.companies || [];
                this.renderCompanyFilter();
            }
        } catch (error) {
            console.error('[NOTIFICATIONS-ADMIN] Error loading companies:', error);
        }
    },

    async loadEmailTracking() {
        try {
            const params = this.filters.company_id ? `?company_id=${this.filters.company_id}` : '';
            const response = await fetch(`/api/admin/notifications/email-tracking/summary${params}`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            if (data.success) {
                this.emailTracking = data.tracking;
                this.renderEmailTracking();
            }

            // También cargar la lista de emails
            await this.loadEmailsList();
        } catch (error) {
            console.error('[NOTIFICATIONS-ADMIN] Error loading email tracking:', error);
        }
    },

    async loadEmailsList() {
        try {
            const response = await fetch(`/api/admin/notifications/email-tracking/list?limit=50`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            if (data.success) {
                this.emailsList = data.emails || [];
                this.renderEmailsList();
            }
        } catch (error) {
            console.error('[NOTIFICATIONS-ADMIN] Error loading emails list:', error);
        }
    },

    async loadNotificationDetail(id) {
        try {
            const response = await fetch(`/api/admin/notifications/${id}`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            if (data.success) {
                this.selectedNotification = data.notification;
                this.renderDetail();
            }
        } catch (error) {
            console.error('[NOTIFICATIONS-ADMIN] Error loading detail:', error);
        }
    },

    // ========== ESTILOS ==========

    injectStyles() {
        if (document.getElementById('notif-admin-styles')) return;
        const style = document.createElement('style');
        style.id = 'notif-admin-styles';
        style.textContent = `
            .notif-admin { padding: 20px; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

            /* Header */
            .notif-admin-header {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                padding: 25px;
                margin-bottom: 20px;
                border: 1px solid rgba(102, 126, 234, 0.3);
            }
            .notif-admin-header h1 { margin: 0 0 5px 0; font-size: 1.6em; color: #fff; display: flex; align-items: center; gap: 10px; }
            .notif-admin-header .subtitle { color: #888; font-size: 0.9em; }

            /* Quick Stats */
            .quick-stats { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px; }
            .stat-card {
                background: rgba(255,255,255,0.05);
                padding: 15px 20px;
                border-radius: 12px;
                min-width: 120px;
                text-align: center;
                border: 1px solid rgba(255,255,255,0.1);
                transition: all 0.3s ease;
            }
            .stat-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.08); }
            .stat-card.urgent { border-color: #e74c3c; background: rgba(231, 76, 60, 0.1); }
            .stat-card.pending { border-color: #f1c40f; background: rgba(241, 196, 15, 0.1); }
            .stat-card .number { display: block; font-size: 1.8em; font-weight: bold; color: #fff; }
            .stat-card .label { font-size: 0.75em; color: #888; text-transform: uppercase; }

            /* Tabs */
            .notif-tabs { display: flex; gap: 5px; margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 5px; border-radius: 12px; }
            .notif-tab {
                padding: 12px 24px;
                border: none;
                background: transparent;
                color: #888;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.2s;
                font-size: 14px;
            }
            .notif-tab:hover { background: rgba(255,255,255,0.05); color: #fff; }
            .notif-tab.active { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }

            /* Filters */
            .filters-bar {
                display: flex;
                gap: 15px;
                align-items: center;
                flex-wrap: wrap;
                padding: 15px 20px;
                background: rgba(255,255,255,0.02);
                border-radius: 12px;
                margin-bottom: 20px;
                border: 1px solid rgba(255,255,255,0.1);
            }
            .filter-group { display: flex; flex-direction: column; gap: 5px; }
            .filter-group label { font-size: 11px; color: #666; text-transform: uppercase; }
            .filter-group select, .filter-group input {
                padding: 10px 15px;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                background: #1a1a2e;
                color: #fff;
                min-width: 180px;
            }
            .filter-group input { min-width: 250px; }
            .btn-search {
                padding: 10px 20px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .btn-search:hover { opacity: 0.9; transform: translateY(-1px); }

            /* Layout Grid */
            .notif-layout { display: grid; grid-template-columns: 1fr 400px; gap: 20px; }
            .notif-layout.full { grid-template-columns: 1fr; }

            /* List */
            .notif-list { background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-height: 600px; overflow-y: auto; }
            .notif-item {
                padding: 15px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                gap: 15px;
                align-items: flex-start;
            }
            .notif-item:hover { background: rgba(102, 126, 234, 0.05); }
            .notif-item.active { background: rgba(102, 126, 234, 0.1); border-left: 3px solid #667eea; }
            .notif-item.unread { border-left: 3px solid #e74c3c; }
            .notif-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4em; flex-shrink: 0; }
            .notif-content { flex: 1; min-width: 0; }
            .notif-title { font-weight: 600; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .notif-company { font-size: 12px; color: #667eea; margin-bottom: 4px; }
            .notif-preview { font-size: 13px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .notif-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; align-items: center; }
            .notif-time { font-size: 11px; color: #666; }
            .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 500; }
            .badge-priority-urgent, .badge-priority-critical { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
            .badge-priority-high { background: rgba(230, 126, 34, 0.2); color: #e67e22; }
            .badge-priority-medium { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
            .badge-priority-normal { background: rgba(39, 174, 96, 0.2); color: #27ae60; }
            .badge-status { background: rgba(102, 126, 234, 0.2); color: #667eea; }
            .badge-unread { background: #e74c3c; color: white; }
            .badge-count { background: rgba(255,255,255,0.1); color: #888; }

            /* Detail Panel */
            .notif-detail { background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); padding: 20px; max-height: 600px; overflow-y: auto; }
            .detail-header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; margin-bottom: 15px; }
            .detail-title { font-size: 1.2em; font-weight: 600; color: #fff; margin-bottom: 5px; }
            .detail-company { color: #667eea; font-size: 14px; }
            .detail-meta { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px; }
            .message-thread { display: flex; flex-direction: column; gap: 15px; }
            .message-item { padding: 15px; background: rgba(255,255,255,0.03); border-radius: 10px; border-left: 3px solid #667eea; }
            .message-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .message-sender { font-weight: 600; color: #667eea; }
            .message-time { font-size: 12px; color: #666; }
            .message-content { color: #ccc; line-height: 1.6; }

            /* Email Tracking Section */
            .email-tracking { background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); padding: 20px; margin-top: 20px; }
            .tracking-title { font-size: 1.1em; font-weight: 600; color: #fff; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
            .tracking-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; }
            .tracking-stat { text-align: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 10px; }
            .tracking-stat .value { font-size: 1.5em; font-weight: bold; color: #fff; }
            .tracking-stat .label { font-size: 11px; color: #888; text-transform: uppercase; }
            .tracking-stat.sent .value { color: #3498db; }
            .tracking-stat.opened .value { color: #27ae60; }
            .tracking-stat.clicked .value { color: #9b59b6; }
            .tracking-stat.bounced .value { color: #e74c3c; }

            /* Emails List */
            .emails-list { max-height: 500px; overflow-y: auto; }
            .email-row { display: grid; grid-template-columns: 2fr 3fr 1fr 1fr auto; gap: 15px; padding: 12px 15px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 8px; align-items: center; border-left: 3px solid transparent; }
            .email-row:hover { background: rgba(255,255,255,0.05); }
            .email-row.status-sent { border-left-color: #3498db; }
            .email-row.status-opened { border-left-color: #27ae60; }
            .email-row.status-clicked { border-left-color: #9b59b6; }
            .email-row.status-bounced, .email-row.status-failed { border-left-color: #e74c3c; }
            .email-recipient { font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .email-recipient small { display: block; color: #888; font-weight: normal; font-size: 11px; }
            .email-subject { color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .email-status { text-align: center; }
            .email-status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .email-status-badge.sent { background: rgba(52, 152, 219, 0.2); color: #3498db; }
            .email-status-badge.opened { background: rgba(39, 174, 96, 0.2); color: #27ae60; }
            .email-status-badge.clicked { background: rgba(155, 89, 182, 0.2); color: #9b59b6; }
            .email-status-badge.bounced, .email-status-badge.failed { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
            .email-status-badge.pending { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
            .email-date { color: #888; font-size: 12px; text-align: right; }
            .email-date small { display: block; font-size: 10px; color: #666; }
            .email-actions { text-align: center; }
            .btn-view-email {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }
            .btn-view-email:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }
            .btn-view-email:active {
                transform: translateY(0);
            }
            .emails-empty { text-align: center; padding: 40px; color: #888; }
            .emails-empty-icon { font-size: 3em; margin-bottom: 15px; opacity: 0.5; }

            /* Pagination */
            .pagination { display: flex; justify-content: center; align-items: center; gap: 10px; padding: 15px; }
            .pagination button {
                padding: 8px 15px;
                border: 1px solid rgba(255,255,255,0.1);
                background: transparent;
                color: #fff;
                border-radius: 6px;
                cursor: pointer;
            }
            .pagination button:hover:not(:disabled) { background: rgba(102, 126, 234, 0.2); }
            .pagination button:disabled { opacity: 0.3; cursor: not-allowed; }
            .pagination .info { color: #888; font-size: 13px; }

            /* Empty State */
            .empty-state { text-align: center; padding: 60px 20px; color: #666; }
            .empty-state .icon { font-size: 4em; margin-bottom: 15px; opacity: 0.5; }

            /* Loading */
            .loading { text-align: center; padding: 40px; color: #888; }
            .loading .spinner { display: inline-block; width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }

            /* Responsive */
            @media (max-width: 1200px) {
                .notif-layout { grid-template-columns: 1fr; }
                .notif-detail { margin-top: 20px; }
            }
        `;
        document.head.appendChild(style);
    },

    // ========== RENDER PRINCIPAL ==========

    render() {
        this.container.innerHTML = `
            <div class="notif-admin">
                <!-- Header -->
                <div class="notif-admin-header">
                    <h1>📬 Centro de Notificaciones</h1>
                    <div class="subtitle">Gestión de notificaciones de todas las empresas</div>
                    <div class="quick-stats" id="quick-stats">
                        <div class="stat-card"><span class="number">-</span><span class="label">Loading...</span></div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="notif-tabs">
                    <button class="notif-tab active" data-tab="notifications">📋 Notificaciones</button>
                    <button class="notif-tab" data-tab="email-tracking">📧 Email Tracking</button>
                    <button class="notif-tab" data-tab="companies">🏢 Por Empresa</button>
                </div>

                <!-- Filters -->
                <div class="filters-bar" id="filters-bar">
                    <div class="filter-group">
                        <label>Empresa</label>
                        <select id="filter-company">
                            <option value="">Todas las empresas</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Estado</label>
                        <select id="filter-status">
                            <option value="all">Todos</option>
                            <option value="open">Abiertos</option>
                            <option value="pending">Pendientes</option>
                            <option value="closed">Cerrados</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Prioridad</label>
                        <select id="filter-priority">
                            <option value="all">Todas</option>
                            <option value="critical">Crítica</option>
                            <option value="urgent">Urgente</option>
                            <option value="high">Alta</option>
                            <option value="normal">Normal</option>
                            <option value="low">Baja</option>
                        </select>
                    </div>
                    <div class="filter-group" style="flex: 1;">
                        <label>Buscar</label>
                        <input type="text" id="filter-search" placeholder="Buscar por asunto o empresa...">
                    </div>
                    <button class="btn-search" id="btn-apply-filters">
                        <i class="fas fa-search"></i> Buscar
                    </button>
                </div>

                <!-- Content Area -->
                <div id="tab-content">
                    <div class="notif-layout" id="notifications-layout">
                        <div class="notif-list" id="notifications-list">
                            <div class="loading"><div class="spinner"></div><p>Cargando notificaciones...</p></div>
                        </div>
                        <div class="notif-detail" id="notifications-detail">
                            <div class="empty-state">
                                <div class="icon">📋</div>
                                <p>Selecciona una notificación para ver el detalle</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Email Tracking Section (hidden by default) -->
                <div class="email-tracking" id="email-tracking-section" style="display: none;">
                    <div class="tracking-title">📊 Estadísticas de Email Tracking</div>
                    <div class="tracking-stats" id="tracking-stats">
                        <div class="tracking-stat"><span class="value">-</span><span class="label">Loading...</span></div>
                    </div>

                    <div class="emails-list-section" style="margin-top: 25px;">
                        <div class="tracking-title">📧 Emails Enviados</div>
                        <div id="emails-list" class="emails-list">
                            <div style="text-align: center; color: #888; padding: 20px;">Cargando emails...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        // Tabs
        document.querySelectorAll('.notif-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Filters
        document.getElementById('btn-apply-filters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('filter-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });

        // Quick filter on select change
        ['filter-company', 'filter-status', 'filter-priority'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.applyFilters());
        });
    },

    switchTab(tab) {
        document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

        const layout = document.getElementById('notifications-layout');
        const tracking = document.getElementById('email-tracking-section');

        if (tab === 'notifications') {
            layout.style.display = 'grid';
            tracking.style.display = 'none';
        } else if (tab === 'email-tracking') {
            layout.style.display = 'none';
            tracking.style.display = 'block';
            this.loadEmailTracking();
        } else if (tab === 'companies') {
            layout.style.display = 'grid';
            layout.classList.add('full');
            tracking.style.display = 'none';
            this.renderCompaniesView();
        }
    },

    applyFilters() {
        this.filters.company_id = document.getElementById('filter-company')?.value || null;
        this.filters.status = document.getElementById('filter-status')?.value || 'all';
        this.filters.priority = document.getElementById('filter-priority')?.value || 'all';
        this.filters.search = document.getElementById('filter-search')?.value || '';
        this.pagination.offset = 0;
        this.loadNotifications();
        this.loadStats();
    },

    // ========== RENDER STATS ==========

    renderStats() {
        const container = document.getElementById('quick-stats');
        if (!container || !this.stats.groups) return;

        const gs = this.stats.groups;
        container.innerHTML = `
            <div class="stat-card">
                <span class="number">${gs.total_groups || 0}</span>
                <span class="label">Total</span>
            </div>
            <div class="stat-card">
                <span class="number">${gs.open_groups || 0}</span>
                <span class="label">Abiertos</span>
            </div>
            <div class="stat-card pending">
                <span class="number">${gs.pending_groups || 0}</span>
                <span class="label">Pendientes</span>
            </div>
            <div class="stat-card urgent">
                <span class="number">${gs.urgent_groups || 0}</span>
                <span class="label">Urgentes</span>
            </div>
            <div class="stat-card">
                <span class="number">${gs.companies_with_notifications || 0}</span>
                <span class="label">Empresas</span>
            </div>
        `;
    },

    // ========== RENDER LIST ==========

    renderList() {
        const container = document.getElementById('notifications-list');
        if (!container) return;

        if (!this.notifications || this.notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <p>No hay notificaciones que mostrar</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(n => this.renderNotificationItem(n)).join('') +
            this.renderPagination();

        // Bind click events
        container.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.notif-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.loadNotificationDetail(item.dataset.id);
            });
        });
    },

    renderNotificationItem(n) {
        const typeConfig = this.GROUP_TYPE_CONFIG[n.group_type] || this.GROUP_TYPE_CONFIG.default;
        const priorityConfig = this.PRIORITY_CONFIG[n.priority] || this.PRIORITY_CONFIG.normal;
        const isUnread = parseInt(n.unread_count) > 0;

        return `
            <div class="notif-item ${isUnread ? 'unread' : ''}" data-id="${n.id}">
                <div class="notif-icon" style="background: ${typeConfig.color}20;">
                    ${typeConfig.icon}
                </div>
                <div class="notif-content">
                    <div class="notif-title">${n.subject || typeConfig.label}</div>
                    <div class="notif-company">🏢 ${n.company_name || 'Sin empresa'}</div>
                    <div class="notif-preview">${n.last_message || 'Sin mensajes'}</div>
                    <div class="notif-meta">
                        <span class="badge badge-priority-${n.priority}">${priorityConfig.icon} ${priorityConfig.label}</span>
                        <span class="badge badge-status">${n.status}</span>
                        ${n.message_count > 0 ? `<span class="badge badge-count">💬 ${n.message_count}</span>` : ''}
                        ${isUnread ? `<span class="badge badge-unread">${n.unread_count} nuevos</span>` : ''}
                        <span class="notif-time">${this.formatDate(n.last_message_at || n.created_at)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderPagination() {
        const currentPage = Math.floor(this.pagination.offset / this.pagination.limit) + 1;
        const totalPages = Math.ceil(this.pagination.total / this.pagination.limit);

        return `
            <div class="pagination">
                <button ${this.pagination.offset === 0 ? 'disabled' : ''} onclick="NotificationsAdmin.prevPage()">
                    ← Anterior
                </button>
                <span class="info">Página ${currentPage} de ${totalPages} (${this.pagination.total} total)</span>
                <button ${(this.pagination.offset + this.pagination.limit) >= this.pagination.total ? 'disabled' : ''} onclick="NotificationsAdmin.nextPage()">
                    Siguiente →
                </button>
            </div>
        `;
    },

    prevPage() {
        this.pagination.offset = Math.max(0, this.pagination.offset - this.pagination.limit);
        this.loadNotifications();
    },

    nextPage() {
        this.pagination.offset += this.pagination.limit;
        this.loadNotifications();
    },

    // ========== RENDER DETAIL ==========

    renderDetail() {
        const container = document.getElementById('notifications-detail');
        if (!container || !this.selectedNotification) return;

        const { group, messages } = this.selectedNotification;
        const typeConfig = this.GROUP_TYPE_CONFIG[group.group_type] || this.GROUP_TYPE_CONFIG.default;

        container.innerHTML = `
            <div class="detail-header">
                <div class="detail-title">${typeConfig.icon} ${group.subject || typeConfig.label}</div>
                <div class="detail-company">🏢 ${group.company_name || 'Sin empresa'}</div>
                <div class="detail-meta">
                    <span class="badge badge-priority-${group.priority}">${group.priority}</span>
                    <span class="badge badge-status">${group.status}</span>
                    <span class="notif-time">Creado: ${this.formatDate(group.created_at)}</span>
                </div>
            </div>

            <div class="message-thread">
                ${messages.length === 0 ? '<p style="color: #666; text-align: center;">Sin mensajes</p>' :
                    messages.map(m => `
                        <div class="message-item">
                            <div class="message-header">
                                <span class="message-sender">${m.sender_name || m.sender_type}</span>
                                <span class="message-time">${this.formatDate(m.created_at)}</span>
                            </div>
                            <div class="message-content">${m.content || m.subject}</div>
                            ${m.read_at ? `<small style="color: #27ae60;">✓ Leído ${this.formatDate(m.read_at)}</small>` : ''}
                        </div>
                    `).join('')
                }
            </div>
        `;
    },

    // ========== RENDER COMPANY FILTER ==========

    renderCompanyFilter() {
        const select = document.getElementById('filter-company');
        if (!select) return;

        // Asegurar que companies sea un array
        const companiesList = Array.isArray(this.companies) ? this.companies : [];

        select.innerHTML = `
            <option value="">Todas las empresas</option>
            ${companiesList.map(c => `
                <option value="${c.company_id}">${c.name} (${c.total_notifications || 0})</option>
            `).join('')}
        `;
    },

    // ========== RENDER EMAIL TRACKING ==========

    renderEmailTracking() {
        const container = document.getElementById('tracking-stats');
        if (!container || !this.emailTracking.stats) return;

        const s = this.emailTracking.stats;
        container.innerHTML = `
            <div class="tracking-stat">
                <span class="value">${s.total_emails || 0}</span>
                <span class="label">Total Emails</span>
            </div>
            <div class="tracking-stat sent">
                <span class="value">${s.sent || 0}</span>
                <span class="label">Enviados</span>
            </div>
            <div class="tracking-stat opened">
                <span class="value">${s.opened || 0}</span>
                <span class="label">Abiertos</span>
            </div>
            <div class="tracking-stat clicked">
                <span class="value">${s.clicked || 0}</span>
                <span class="label">Clicks</span>
            </div>
            <div class="tracking-stat bounced">
                <span class="value">${s.bounced || 0}</span>
                <span class="label">Rebotados</span>
            </div>
            <div class="tracking-stat">
                <span class="value">${s.open_rate || 0}%</span>
                <span class="label">Tasa Apertura</span>
            </div>
            <div class="tracking-stat">
                <span class="value">${s.click_rate || 0}%</span>
                <span class="label">Tasa Click</span>
            </div>
        `;
    },

    renderEmailsList() {
        const container = document.getElementById('emails-list');
        if (!container) return;

        if (!this.emailsList || this.emailsList.length === 0) {
            container.innerHTML = `
                <div class="emails-empty">
                    <div class="emails-empty-icon">📭</div>
                    <div>No hay emails enviados aún</div>
                    <small style="color: #666;">Los emails enviados desde presupuestos y otros módulos aparecerán aquí</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.emailsList.map(email => {
            const statusLabels = {
                sent: 'Enviado',
                opened: 'Abierto',
                clicked: 'Click',
                bounced: 'Rebotado',
                failed: 'Falló',
                pending: 'Pendiente'
            };

            const statusIcons = {
                sent: '📤',
                opened: '👁️',
                clicked: '🔗',
                bounced: '⚠️',
                failed: '❌',
                pending: '⏳'
            };

            return `
                <div class="email-row status-${email.status}">
                    <div class="email-recipient">
                        ${email.recipient_name || 'Destinatario'}
                        <small>${email.recipient_email}</small>
                    </div>
                    <div class="email-subject" title="${email.subject}">
                        ${email.subject}
                    </div>
                    <div class="email-status">
                        <span class="email-status-badge ${email.status}">
                            ${statusIcons[email.status] || '📧'} ${statusLabels[email.status] || email.status}
                        </span>
                    </div>
                    <div class="email-date">
                        ${this.formatDate(email.sent_at || email.created_at)}
                        ${email.opened_at ? `<small>📖 ${this.formatDate(email.opened_at)}</small>` : ''}
                    </div>
                    <div class="email-actions">
                        <button class="btn-view-email" onclick="NotificationsAdmin.showEmailDetail('${email.tracking_id}')">
                            👁️ Ver
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderCompaniesView() {
        const container = document.getElementById('notifications-list');
        if (!container || !this.companies) return;

        container.innerHTML = this.companies.map(c => `
            <div class="notif-item" data-company="${c.company_id}" onclick="NotificationsAdmin.filterByCompany(${c.company_id})">
                <div class="notif-icon" style="background: rgba(102, 126, 234, 0.2);">🏢</div>
                <div class="notif-content">
                    <div class="notif-title">${c.name}</div>
                    <div class="notif-preview">${c.slug}</div>
                    <div class="notif-meta">
                        <span class="badge badge-count">📋 ${c.total_notifications || 0} notificaciones</span>
                        ${c.open_notifications > 0 ? `<span class="badge badge-unread">${c.open_notifications} abiertas</span>` : ''}
                        ${c.unread_messages > 0 ? `<span class="badge badge-priority-high">💬 ${c.unread_messages} sin leer</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('') || '<div class="empty-state"><div class="icon">🏢</div><p>No hay empresas con notificaciones</p></div>';
    },

    filterByCompany(companyId) {
        document.getElementById('filter-company').value = companyId;
        this.switchTab('notifications');
        this.applyFilters();
    },

    // ========== HELPERS ==========

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `Hace ${minutes}m`;
        if (hours < 24) return `Hace ${hours}h`;
        if (days < 7) return `Hace ${days}d`;
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    },

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.loadStats();
        }, 60000); // Refresh stats every minute
    },

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    showEmailDetail(trackingId) {
        const email = this.emailsList.find(e => e.tracking_id === trackingId);
        if (!email) {
            console.error('Email no encontrado:', trackingId);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'email-modal-overlay';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
        modal.innerHTML = `
            <div style="background:#1a1a2e;border-radius:12px;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 25px;border-bottom:1px solid rgba(255,255,255,0.1);">
                    <div style="font-size:18px;font-weight:600;color:#fff;">📧 Detalle del Email</div>
                    <button onclick="this.closest('[style*=position]').remove()" style="background:none;border:none;color:#888;font-size:28px;cursor:pointer;padding:0;width:32px;height:32px;line-height:1;">×</button>
                </div>
                <div style="padding:25px;color:#fff;">
                    <div style="margin-bottom:20px;"><div style="font-size:12px;color:#888;text-transform:uppercase;margin-bottom:8px;">Destinatario</div><div>${email.recipient_email}</div></div>
                    <div style="margin-bottom:20px;"><div style="font-size:12px;color:#888;text-transform:uppercase;margin-bottom:8px;">Asunto</div><div>${email.subject || 'Sin asunto'}</div></div>
                    <div style="margin-bottom:20px;"><div style="font-size:12px;color:#888;text-transform:uppercase;margin-bottom:8px;">Categoría</div><div>${email.category || '-'}</div></div>
                    <div style="margin-bottom:20px;"><div style="font-size:12px;color:#888;text-transform:uppercase;margin-bottom:8px;">Tracking ID</div><div style="font-family:monospace;font-size:11px;">${email.tracking_id}</div></div>
                    <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);">
                        <div style="font-size:12px;color:#888;text-transform:uppercase;margin-bottom:15px;">Timeline</div>
                        ${email.sent_at ? `<div style="display:flex;gap:15px;margin-bottom:15px;"><div style="width:40px;height:40px;border-radius:50%;background:rgba(52,152,219,0.2);display:flex;align-items:center;justify-content:center;">📤</div><div><div style="font-weight:500;margin-bottom:4px;">Enviado</div><div style="color:#888;font-size:12px;">${new Date(email.sent_at).toLocaleString('es-AR')}</div></div></div>` : ''}
                        ${email.opened_at ? `<div style="display:flex;gap:15px;margin-bottom:15px;"><div style="width:40px;height:40px;border-radius:50%;background:rgba(39,174,96,0.2);display:flex;align-items:center;justify-content:center;">✅</div><div><div style="font-weight:500;margin-bottom:4px;">Abierto</div><div style="color:#888;font-size:12px;">${new Date(email.opened_at).toLocaleString('es-AR')}</div></div></div>` : ''}
                        ${email.clicked_at ? `<div style="display:flex;gap:15px;margin-bottom:15px;"><div style="width:40px;height:40px;border-radius:50%;background:rgba(155,89,182,0.2);display:flex;align-items:center;justify-content:center;">🖱️</div><div><div style="font-weight:500;margin-bottom:4px;">Clickeado</div><div style="color:#888;font-size:12px;">${new Date(email.clicked_at).toLocaleString('es-AR')}</div></div></div>` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    },

    destroy() {
        this.stopAutoRefresh();
        this.notifications = [];
        this.companies = [];
        this.stats = {};
        this.selectedNotification = null;
    }
};

// Export for global use
window.NotificationsAdmin = NotificationsAdmin;
