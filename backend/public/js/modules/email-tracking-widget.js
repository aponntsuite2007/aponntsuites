/**
 * EMAIL TRACKING WIDGET - Componente Reutilizable
 *
 * Widget modular para mostrar tracking de emails en diferentes contextos:
 * - Notification Center (vista global)
 * - Marketing (solo flyers)
 * - Quotes (solo presupuestos/contratos)
 *
 * @version 1.0
 * @date 2026-02-03
 */

const EmailTrackingWidget = {
    containerId: null,
    config: {
        categoryFilter: null, // null = todos, 'marketing', 'quotes', etc.
        showStats: true,
        showFilters: true,
        autoRefresh: true,
        refreshInterval: 30000 // 30 segundos
    },
    emails: [],
    stats: {},
    filters: {
        status: 'all',
        category: 'all',
        search: '',
        dateFrom: null,
        dateTo: null
    },
    refreshTimer: null,

    /**
     * Inicializar widget
     * @param {string} containerId - ID del contenedor
     * @param {object} options - Configuración personalizada
     */
    init(containerId, options = {}) {
        console.log('📧 [EMAIL-TRACKING] Inicializando widget...');
        this.containerId = containerId;
        this.config = { ...this.config, ...options };

        // Aplicar filtro de categoría si está configurado
        if (this.config.categoryFilter) {
            this.filters.category = this.config.categoryFilter;
        }

        this.injectStyles();
        this.render();
        this.loadData();

        if (this.config.autoRefresh) {
            this.startAutoRefresh();
        }
    },

    /**
     * Estilos del widget
     */
    injectStyles() {
        if (document.getElementById('email-tracking-styles')) return;

        const style = document.createElement('style');
        style.id = 'email-tracking-styles';
        style.textContent = `
            /* ========== EMAIL TRACKING WIDGET STYLES ========== */
            .email-tracking-widget {
                background: #1a1f2e;
                border-radius: 12px;
                padding: 20px;
                color: #e8eaed;
            }

            .et-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #2d3748;
            }

            .et-title {
                font-size: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .et-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .et-stat-card {
                background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
                border-radius: 10px;
                padding: 15px;
                border-left: 4px solid;
            }

            .et-stat-card.sent { border-left-color: #4299e1; }
            .et-stat-card.opened { border-left-color: #48bb78; }
            .et-stat-card.clicked { border-left-color: #ed8936; }
            .et-stat-card.bounced { border-left-color: #f56565; }

            .et-stat-label {
                font-size: 12px;
                color: #a0aec0;
                margin-bottom: 5px;
            }

            .et-stat-value {
                font-size: 28px;
                font-weight: 700;
                color: #e8eaed;
            }

            .et-stat-rate {
                font-size: 14px;
                color: #48bb78;
                margin-top: 5px;
            }

            .et-filters {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .et-filter-group {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .et-filter-label {
                font-size: 13px;
                color: #a0aec0;
            }

            .et-select, .et-input {
                background: #2d3748;
                border: 1px solid #4a5568;
                border-radius: 6px;
                padding: 8px 12px;
                color: #e8eaed;
                font-size: 13px;
            }

            .et-select:focus, .et-input:focus {
                outline: none;
                border-color: #4299e1;
            }

            .et-table-container {
                background: #2d3748;
                border-radius: 10px;
                overflow: hidden;
            }

            .et-table {
                width: 100%;
                border-collapse: collapse;
            }

            .et-table thead {
                background: #1a202c;
            }

            .et-table th {
                padding: 12px 15px;
                text-align: left;
                font-size: 12px;
                font-weight: 600;
                color: #a0aec0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .et-table td {
                padding: 12px 15px;
                border-top: 1px solid #374151;
                font-size: 13px;
            }

            .et-table tbody tr {
                transition: background 0.2s;
                cursor: pointer;
            }

            .et-table tbody tr:hover {
                background: #374151;
            }

            .et-status-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
            }

            .et-status-badge.sent {
                background: rgba(66, 153, 225, 0.2);
                color: #4299e1;
            }

            .et-status-badge.opened {
                background: rgba(72, 187, 120, 0.2);
                color: #48bb78;
            }

            .et-status-badge.clicked {
                background: rgba(237, 137, 54, 0.2);
                color: #ed8936;
            }

            .et-status-badge.bounced {
                background: rgba(245, 101, 101, 0.2);
                color: #f56565;
            }

            .et-category-badge {
                background: #374151;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 11px;
                color: #a0aec0;
            }

            .et-btn-details {
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

            .et-btn-details:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .et-btn-details:active {
                transform: translateY(0);
            }

            .et-empty {
                text-align: center;
                padding: 60px 20px;
                color: #718096;
            }

            .et-empty-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }

            .et-loading {
                text-align: center;
                padding: 40px;
                color: #4299e1;
            }

            .et-btn {
                background: #4299e1;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .et-btn:hover {
                background: #3182ce;
                transform: translateY(-1px);
            }

            .et-btn-secondary {
                background: #2d3748;
                color: #e8eaed;
            }

            .et-btn-secondary:hover {
                background: #374151;
            }

            /* Modal de detalle */
            .et-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            }

            .et-modal {
                background: #1a1f2e;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            .et-modal-header {
                padding: 20px;
                border-bottom: 2px solid #2d3748;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .et-modal-title {
                font-size: 18px;
                font-weight: 600;
                color: #e8eaed;
            }

            .et-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #718096;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            }

            .et-modal-close:hover {
                color: #e8eaed;
            }

            .et-modal-body {
                padding: 20px;
            }

            .et-detail-row {
                margin-bottom: 15px;
            }

            .et-detail-label {
                font-size: 12px;
                color: #a0aec0;
                margin-bottom: 5px;
            }

            .et-detail-value {
                font-size: 14px;
                color: #e8eaed;
            }

            .et-timeline {
                margin-top: 20px;
            }

            .et-timeline-item {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
            }

            .et-timeline-icon {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                flex-shrink: 0;
            }

            .et-timeline-icon.sent { background: rgba(66, 153, 225, 0.2); }
            .et-timeline-icon.opened { background: rgba(72, 187, 120, 0.2); }
            .et-timeline-icon.clicked { background: rgba(237, 137, 54, 0.2); }

            .et-timeline-content {
                flex: 1;
            }

            .et-timeline-title {
                font-size: 14px;
                font-weight: 600;
                color: #e8eaed;
            }

            .et-timeline-date {
                font-size: 12px;
                color: #718096;
            }
        `;

        document.head.appendChild(style);
    },

    /**
     * Renderizar estructura HTML
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('❌ [EMAIL-TRACKING] Contenedor no encontrado:', this.containerId);
            return;
        }

        container.innerHTML = `
            <div class="email-tracking-widget">
                ${this.config.showStats ? `
                <div class="et-stats" id="et-stats">
                    <div class="et-stat-card sent">
                        <div class="et-stat-label">📤 Enviados</div>
                        <div class="et-stat-value" id="et-stat-sent">-</div>
                    </div>
                    <div class="et-stat-card opened">
                        <div class="et-stat-label">👁️ Abiertos</div>
                        <div class="et-stat-value" id="et-stat-opened">-</div>
                        <div class="et-stat-rate" id="et-stat-opened-rate">-</div>
                    </div>
                    <div class="et-stat-card clicked">
                        <div class="et-stat-label">🖱️ Clicks</div>
                        <div class="et-stat-value" id="et-stat-clicked">-</div>
                        <div class="et-stat-rate" id="et-stat-clicked-rate">-</div>
                    </div>
                    <div class="et-stat-card bounced">
                        <div class="et-stat-label">❌ Rebotados</div>
                        <div class="et-stat-value" id="et-stat-bounced">-</div>
                    </div>
                </div>
                ` : ''}

                ${this.config.showFilters ? `
                <div class="et-filters">
                    <div class="et-filter-group">
                        <span class="et-filter-label">Estado:</span>
                        <select class="et-select" id="et-filter-status">
                            <option value="all">Todos</option>
                            <option value="sent">Enviados</option>
                            <option value="opened">Abiertos</option>
                            <option value="clicked">Con clicks</option>
                            <option value="bounced">Rebotados</option>
                        </select>
                    </div>

                    ${!this.config.categoryFilter ? `
                    <div class="et-filter-group">
                        <span class="et-filter-label">Categoría:</span>
                        <select class="et-select" id="et-filter-category">
                            <option value="all">Todas</option>
                            <option value="marketing">Marketing</option>
                            <option value="quotes">Presupuestos</option>
                            <option value="general">General</option>
                        </select>
                    </div>
                    ` : ''}

                    <div class="et-filter-group">
                        <span class="et-filter-label">Buscar:</span>
                        <input type="text" class="et-input" id="et-filter-search" placeholder="Email o asunto..." />
                    </div>

                    <button class="et-btn et-btn-secondary" id="et-btn-clear-filters">
                        Limpiar filtros
                    </button>

                    <button class="et-btn" id="et-btn-refresh">
                        🔄 Actualizar
                    </button>
                </div>
                ` : ''}

                <div class="et-table-container">
                    <table class="et-table">
                        <thead>
                            <tr>
                                <th>Destinatario</th>
                                <th>Asunto</th>
                                <th>Categoría</th>
                                <th>Estado</th>
                                <th>Enviado</th>
                                <th>Abierto</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="et-table-body">
                            <tr>
                                <td colspan="7" class="et-loading">
                                    <div>⏳ Cargando emails...</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        // Filtros
        const statusFilter = document.getElementById('et-filter-status');
        const categoryFilter = document.getElementById('et-filter-category');
        const searchInput = document.getElementById('et-filter-search');
        const clearBtn = document.getElementById('et-btn-clear-filters');
        const refreshBtn = document.getElementById('et-btn-refresh');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filters.status = statusFilter.value;
                this.renderTable();
            });
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filters.category = categoryFilter.value;
                this.renderTable();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filters.search = searchInput.value;
                this.renderTable();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadData());
        }
    },

    /**
     * Cargar datos del backend
     */
    async loadData() {
        try {
            const params = new URLSearchParams();
            params.append('limit', '100');
            params.append('offset', '0');

            if (this.config.categoryFilter) {
                params.append('category', this.config.categoryFilter);
            }

            const response = await fetch(`/api/admin/notifications/email-tracking/list?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Error al cargar emails');

            const data = await response.json();
            this.emails = data.emails || [];

            // Cargar stats
            await this.loadStats();

            this.renderTable();
            this.renderStats();

        } catch (error) {
            console.error('❌ [EMAIL-TRACKING] Error cargando datos:', error);
            this.showError('Error al cargar los emails. Intente nuevamente.');
        }
    },

    /**
     * Cargar estadísticas
     */
    async loadStats() {
        try {
            const params = new URLSearchParams();
            if (this.config.categoryFilter) {
                params.append('category', this.config.categoryFilter);
            }

            const response = await fetch(`/api/admin/notifications/email-tracking/summary?${params}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error('Error al cargar stats');

            const data = await response.json();
            this.stats = data.tracking?.stats || {};

        } catch (error) {
            console.error('❌ [EMAIL-TRACKING] Error cargando stats:', error);
        }
    },

    /**
     * Renderizar estadísticas
     */
    renderStats() {
        if (!this.config.showStats) return;

        const { total_emails = 0, sent = 0, opened = 0, clicked = 0, bounced = 0, open_rate = 0, click_rate = 0 } = this.stats;

        document.getElementById('et-stat-sent').textContent = sent;
        document.getElementById('et-stat-opened').textContent = opened;
        document.getElementById('et-stat-clicked').textContent = clicked;
        document.getElementById('et-stat-bounced').textContent = bounced;

        document.getElementById('et-stat-opened-rate').textContent = `${open_rate}% tasa de apertura`;
        document.getElementById('et-stat-clicked-rate').textContent = `${click_rate}% click rate`;
    },

    /**
     * Renderizar tabla de emails
     */
    renderTable() {
        const tbody = document.getElementById('et-table-body');
        if (!tbody) return;

        // Filtrar emails
        const filtered = this.emails.filter(email => {
            // Filtro de status
            if (this.filters.status !== 'all') {
                if (this.filters.status === 'opened' && !email.opened_at) return false;
                if (this.filters.status === 'clicked' && !email.clicked_at) return false;
                if (this.filters.status === 'bounced' && !email.bounced_at) return false;
                if (this.filters.status === 'sent' && (email.opened_at || email.clicked_at || email.bounced_at)) return false;
            }

            // Filtro de category
            if (this.filters.category !== 'all' && email.category !== this.filters.category) {
                return false;
            }

            // Filtro de búsqueda
            if (this.filters.search) {
                const search = this.filters.search.toLowerCase();
                const matchesEmail = email.recipient_email?.toLowerCase().includes(search);
                const matchesSubject = email.subject?.toLowerCase().includes(search);
                if (!matchesEmail && !matchesSubject) return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="et-empty">
                        <div class="et-empty-icon">📭</div>
                        <div>No se encontraron emails</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(email => {
            const status = this.getEmailStatus(email);
            const statusBadge = `<span class="et-status-badge ${status.class}">${status.icon} ${status.label}</span>`;
            const categoryBadge = email.category ? `<span class="et-category-badge">${email.category}</span>` : '-';
            const sentDate = email.sent_at ? new Date(email.sent_at).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }) : '-';
            const openedDate = email.opened_at ? new Date(email.opened_at).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }) : '-';

            return `
                <tr>
                    <td>${email.recipient_email}</td>
                    <td>${email.subject || 'Sin asunto'}</td>
                    <td>${categoryBadge}</td>
                    <td>${statusBadge}</td>
                    <td>${sentDate}</td>
                    <td>${openedDate}</td>
                    <td>
                        <button class="et-btn-details" onclick="EmailTrackingWidget.showDetail('${email.tracking_id}')">
                            👁️ Ver
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Obtener estado del email
     */
    getEmailStatus(email) {
        if (email.bounced_at) {
            return { class: 'bounced', icon: '❌', label: 'Rebotado' };
        }
        if (email.clicked_at) {
            return { class: 'clicked', icon: '🖱️', label: 'Con click' };
        }
        if (email.opened_at) {
            return { class: 'opened', icon: '✅', label: 'Abierto' };
        }
        return { class: 'sent', icon: '📤', label: 'Enviado' };
    },

    /**
     * Mostrar detalle de un email
     */
    showDetail(trackingId) {
        const email = this.emails.find(e => e.tracking_id === trackingId);
        if (!email) return;

        const modal = document.createElement('div');
        modal.className = 'et-modal-overlay';
        modal.innerHTML = `
            <div class="et-modal">
                <div class="et-modal-header">
                    <div class="et-modal-title">📧 Detalle del Email</div>
                    <button class="et-modal-close" onclick="this.closest('.et-modal-overlay').remove()">×</button>
                </div>
                <div class="et-modal-body">
                    <div class="et-detail-row">
                        <div class="et-detail-label">Destinatario</div>
                        <div class="et-detail-value">${email.recipient_email}</div>
                    </div>
                    <div class="et-detail-row">
                        <div class="et-detail-label">Asunto</div>
                        <div class="et-detail-value">${email.subject || 'Sin asunto'}</div>
                    </div>
                    <div class="et-detail-row">
                        <div class="et-detail-label">Categoría</div>
                        <div class="et-detail-value">${email.category || '-'}</div>
                    </div>
                    <div class="et-detail-row">
                        <div class="et-detail-label">Tracking ID</div>
                        <div class="et-detail-value" style="font-family: monospace; font-size: 11px;">${email.tracking_id}</div>
                    </div>
                    <div class="et-detail-row">
                        <div class="et-detail-label">Message ID</div>
                        <div class="et-detail-value" style="font-family: monospace; font-size: 11px;">${email.message_id || '-'}</div>
                    </div>

                    <div class="et-timeline">
                        <div class="et-detail-label">Timeline de eventos</div>

                        ${email.sent_at ? `
                        <div class="et-timeline-item">
                            <div class="et-timeline-icon sent">📤</div>
                            <div class="et-timeline-content">
                                <div class="et-timeline-title">Email enviado</div>
                                <div class="et-timeline-date">${new Date(email.sent_at).toLocaleString('es-AR')}</div>
                            </div>
                        </div>
                        ` : ''}

                        ${email.opened_at ? `
                        <div class="et-timeline-item">
                            <div class="et-timeline-icon opened">✅</div>
                            <div class="et-timeline-content">
                                <div class="et-timeline-title">Email abierto</div>
                                <div class="et-timeline-date">${new Date(email.opened_at).toLocaleString('es-AR')}</div>
                            </div>
                        </div>
                        ` : ''}

                        ${email.clicked_at ? `
                        <div class="et-timeline-item">
                            <div class="et-timeline-icon clicked">🖱️</div>
                            <div class="et-timeline-content">
                                <div class="et-timeline-title">Click registrado</div>
                                <div class="et-timeline-date">${new Date(email.clicked_at).toLocaleString('es-AR')}</div>
                            </div>
                        </div>
                        ` : ''}

                        ${email.bounced_at ? `
                        <div class="et-timeline-item">
                            <div class="et-timeline-icon bounced">❌</div>
                            <div class="et-timeline-content">
                                <div class="et-timeline-title">Email rebotado</div>
                                <div class="et-timeline-date">${new Date(email.bounced_at).toLocaleString('es-AR')}</div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Limpiar filtros
     */
    clearFilters() {
        this.filters.status = 'all';
        this.filters.category = this.config.categoryFilter || 'all';
        this.filters.search = '';

        const statusFilter = document.getElementById('et-filter-status');
        const categoryFilter = document.getElementById('et-filter-category');
        const searchInput = document.getElementById('et-filter-search');

        if (statusFilter) statusFilter.value = 'all';
        if (categoryFilter) categoryFilter.value = this.config.categoryFilter || 'all';
        if (searchInput) searchInput.value = '';

        this.renderTable();
    },

    /**
     * Mostrar error
     */
    showError(message) {
        const tbody = document.getElementById('et-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="et-empty">
                        <div class="et-empty-icon">⚠️</div>
                        <div>${message}</div>
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Auto-refresh
     */
    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => {
            console.log('📧 [EMAIL-TRACKING] Auto-refresh...');
            this.loadData();
        }, this.config.refreshInterval);
    },

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    },

    /**
     * Destruir widget
     */
    destroy() {
        this.stopAutoRefresh();
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = '';
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.EmailTrackingWidget = EmailTrackingWidget;
}
