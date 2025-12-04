/**
 * NOTIFICATIONS COMPLETE - Sistema Unificado de Notificaciones
 *
 * Este módulo unifica todas las notificaciones en una sola bandeja:
 * - Notificaciones proactivas (vacaciones, documentos, consentimientos)
 * - Solicitudes (vacaciones, licencias, horas extra)
 * - Alertas del sistema
 *
 * Usa las tablas: notification_groups + notification_messages
 *
 * @version 2.0 - Unificado
 * @date 2025-12-02
 */

const NotificationsComplete = {
    currentGroupId: null,
    notifications: [],
    filters: {
        status: 'all',
        priority: 'all',
        groupType: 'all',
        search: '',
        categoryFilter: null  // Filtro por categoría del sidebar
    },
    stats: {},

    // Configuración de tipos de grupos con iconos y colores
    GROUP_TYPE_CONFIG: {
        // Notificaciones proactivas
        proactive_vacation_expiry: { icon: '🏖️', label: 'Vacaciones por Vencer', color: '#3498db', category: 'proactive' },
        proactive_overtime_limit: { icon: '⏰', label: 'Límite Horas Extra', color: '#e74c3c', category: 'proactive' },
        proactive_rest_violation: { icon: '😴', label: 'Violación Descanso', color: '#9b59b6', category: 'proactive' },
        proactive_document_expiry: { icon: '📄', label: 'Documentos por Vencer', color: '#f39c12', category: 'proactive' },
        proactive_certificate_expiry: { icon: '🏥', label: 'Certificados Médicos', color: '#1abc9c', category: 'proactive' },
        proactive_consent_renewal: { icon: '🔐', label: 'Renovar Consentimiento', color: '#34495e', category: 'proactive' },
        // Solicitudes
        vacation_request: { icon: '🌴', label: 'Solicitud Vacaciones', color: '#27ae60', category: 'request' },
        leave_request: { icon: '📝', label: 'Solicitud Licencia', color: '#2980b9', category: 'request' },
        overtime_request: { icon: '💼', label: 'Solicitud Horas Extra', color: '#8e44ad', category: 'request' },
        late_arrival: { icon: '🕐', label: 'Llegada Tarde', color: '#e67e22', category: 'attendance' },
        shift_swap: { icon: '🔄', label: 'Cambio de Turno', color: '#16a085', category: 'request' },
        training_mandatory: { icon: '📚', label: 'Capacitación', color: '#2c3e50', category: 'training' },
        // Sistema
        system_alert: { icon: '⚠️', label: 'Alerta Sistema', color: '#c0392b', category: 'system' },
        announcement: { icon: '📢', label: 'Anuncio', color: '#16a085', category: 'system' },
        // Default
        default: { icon: '🔔', label: 'Notificación', color: '#95a5a6', category: 'other' }
    },

    PRIORITY_CONFIG: {
        critical: { icon: '🔴', label: 'Crítica', class: 'priority-critical', color: '#c0392b' },
        high: { icon: '🟠', label: 'Alta', class: 'priority-high', color: '#e67e22' },
        medium: { icon: '🟡', label: 'Media', class: 'priority-medium', color: '#f1c40f' },
        normal: { icon: '🟢', label: 'Normal', class: 'priority-normal', color: '#27ae60' },
        low: { icon: '⚪', label: 'Baja', class: 'priority-low', color: '#95a5a6' }
    },

    CATEGORY_CONFIG: {
        proactive: { label: 'Alertas Proactivas', icon: '🔮' },
        request: { label: 'Solicitudes', icon: '📋' },
        attendance: { label: 'Asistencia', icon: '⏱️' },
        training: { label: 'Capacitación', icon: '📚' },
        system: { label: 'Sistema', icon: '⚙️' },
        other: { label: 'Otros', icon: '📌' }
    },

    init() {
        console.log('🔔 [NOTIFICATIONS-COMPLETE] Iniciando Sistema Unificado de Notificaciones v2.0');
        this.injectStyles();
        this.loadStats();
        this.loadInbox();
    },

    injectStyles() {
        if (document.getElementById('nc-styles')) return;
        const style = document.createElement('style');
        style.id = 'nc-styles';
        style.textContent = `
            .notifications-complete { padding: 20px; height: 100%; display: flex; flex-direction: column; background: #0a0a0f; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .nc-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 25px 30px; margin-bottom: 20px; border: 1px solid rgba(102, 126, 234, 0.3); }
            .nc-header-content { display: flex; justify-content: space-between; align-items: center; }
            .nc-title h1 { margin: 0; font-size: 1.8em; color: #fff; }
            .nc-subtitle { color: #888; font-size: 0.9em; }
            .nc-quick-stats { display: flex; gap: 15px; }
            .qs-item { background: rgba(255,255,255,0.05); padding: 12px 20px; border-radius: 12px; text-align: center; min-width: 80px; border: 1px solid rgba(255,255,255,0.1); }
            .qs-item.unread { border-color: #e74c3c; background: rgba(231, 76, 60, 0.1); }
            .qs-item.pending { border-color: #f1c40f; background: rgba(241, 196, 15, 0.1); }
            .qs-item.overdue { border-color: #c0392b; background: rgba(192, 57, 43, 0.1); }
            .qs-number { display: block; font-size: 1.5em; font-weight: bold; color: #fff; }
            .qs-label { font-size: 0.75em; color: #888; }
            .nc-filters { background: #12121a; padding: 15px 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); }
            .filter-row { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
            .filter-item { position: relative; }
            .filter-item.search { flex: 1; min-width: 200px; }
            .filter-item.search i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #666; }
            .filter-item input, .filter-item select { padding: 10px 15px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; background: #1a1a2e; color: #fff; font-size: 14px; width: 100%; }
            .filter-item select { padding-left: 15px; min-width: 180px; }
            .btn-refresh { padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
            .btn-refresh:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
            .nc-layout { display: grid; grid-template-columns: 200px 1fr 400px; gap: 15px; flex: 1; min-height: 0; }
            .nc-sidebar { background: #12121a; border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.1); overflow-y: auto; }
            .sidebar-section h3 { font-size: 0.8em; text-transform: uppercase; color: #666; margin: 0 0 10px 0; letter-spacing: 1px; }
            .category-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-bottom: 5px; }
            .category-item:hover { background: rgba(102, 126, 234, 0.1); }
            .category-item.empty { opacity: 0.5; }
            .category-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .category-item.active .cat-count { background: rgba(255,255,255,0.2); color: white; }
            .cat-icon { font-size: 1.2em; }
            .cat-label { flex: 1; font-size: 0.9em; }
            .cat-count { background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px; font-size: 0.75em; }
            .cat-unread { background: #e74c3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7em; font-weight: bold; }
            .nc-list { background: #12121a; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); overflow-y: auto; }
            .nc-detail { background: #12121a; border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.1); overflow-y: auto; }
            .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; }
            .empty-icon { font-size: 4em; margin-bottom: 15px; }
            .group-item { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.2s; display: flex; gap: 12px; }
            .group-item:hover { background: rgba(102, 126, 234, 0.05); }
            .group-item.unread { background: rgba(231, 76, 60, 0.05); border-left: 3px solid #e74c3c; }
            .group-item.active { background: rgba(102, 126, 234, 0.1); border-left: 3px solid #667eea; }
            .group-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.3em; flex-shrink: 0; }
            .group-content { flex: 1; min-width: 0; }
            .group-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
            .group-title { font-weight: 600; font-size: 14px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .group-time { font-size: 11px; color: #666; white-space: nowrap; }
            .group-preview { font-size: 12px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 6px; }
            .group-badges { display: flex; gap: 6px; flex-wrap: wrap; }
            .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 500; }
            .badge-priority-critical { background: rgba(192, 57, 43, 0.2); color: #e74c3c; }
            .badge-priority-high { background: rgba(230, 126, 34, 0.2); color: #e67e22; }
            .badge-priority-medium { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
            .badge-priority-normal { background: rgba(39, 174, 96, 0.2); color: #27ae60; }
            .badge-type { background: rgba(102, 126, 234, 0.2); color: #667eea; }
            .badge-unread { background: #e74c3c; color: white; }
            .badge-count { background: rgba(255,255,255,0.1); color: #888; }
            .message-list { display: flex; flex-direction: column; gap: 12px; }
            .message-item { padding: 15px; background: rgba(255,255,255,0.02); border-radius: 10px; border-left: 3px solid #667eea; }
            .message-item.system { border-left-color: #9b59b6; }
            .message-item.proactive { border-left-color: #e74c3c; }
            .message-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .message-sender { font-weight: 600; color: #667eea; }
            .message-time { font-size: 12px; color: #666; }
            .message-content { font-size: 14px; line-height: 1.6; color: #ccc; }
            .conversation-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px; }
            .conversation-title { font-size: 1.1em; font-weight: 600; color: #fff; }
            .conversation-actions { display: flex; gap: 10px; }
            .btn-action { padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
            .btn-action.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .btn-action.secondary { background: rgba(255,255,255,0.1); color: #ccc; }
            .btn-action:hover { transform: translateY(-1px); }
            @media (max-width: 1200px) { .nc-layout { grid-template-columns: 1fr 350px; } .nc-sidebar { display: none; } }
            @media (max-width: 800px) { .nc-layout { grid-template-columns: 1fr; } .nc-detail { display: none; } }
        `;
        document.head.appendChild(style);
    },

    async loadStats() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const response = await fetch('/api/inbox/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats || {};
            }
        } catch (error) {
            console.error('❌ [NOTIFICATIONS] Error cargando stats:', error);
        }
    },

    async loadInbox() {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const params = new URLSearchParams({
                status: this.filters.status,
                priority: this.filters.priority,
                limit: 100,
                offset: 0
            });

            const response = await fetch(`/api/inbox?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Error cargando notificaciones');
            }

            const data = await response.json();
            this.notifications = data.inbox?.groups || [];
            this.render();
        } catch (error) {
            console.error('❌ [NOTIFICATIONS] Error:', error);
            this.renderError(error.message);
        }
    },

    applyFilters() {
        let filtered = [...this.notifications];

        // Filtro por tipo de grupo
        if (this.filters.groupType !== 'all') {
            filtered = filtered.filter(g => g.group_type === this.filters.groupType);
        }

        // Filtro por categoría del sidebar
        if (this.filters.categoryFilter) {
            const categoryTypes = Object.entries(this.GROUP_TYPE_CONFIG)
                .filter(([key, config]) => config.category === this.filters.categoryFilter)
                .map(([key]) => key);
            filtered = filtered.filter(g => categoryTypes.includes(g.group_type));
        }

        // Filtro por búsqueda
        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(g =>
                (g.subject || '').toLowerCase().includes(search) ||
                (g.last_message || '').toLowerCase().includes(search)
            );
        }

        return filtered;
    },

    getGroupsByCategory() {
        const categories = {};
        // Usar notificaciones sin filtro de categoría para mostrar contadores correctos en sidebar
        const groups = this.notifications;

        groups.forEach(group => {
            const config = this.GROUP_TYPE_CONFIG[group.group_type] || this.GROUP_TYPE_CONFIG.default;
            const category = config.category || 'other';

            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(group);
        });

        return categories;
    },

    render() {
        const mainContent = document.getElementById('mainContent');
        const filteredNotifications = this.applyFilters();
        const groupTypes = [...new Set(this.notifications.map(g => g.group_type))];
        const groupsByCategory = this.getGroupsByCategory();
        const totalUnread = this.notifications.filter(g => parseInt(g.unread_count) > 0).length;

        mainContent.innerHTML = `
            <div class="notifications-complete">
                <!-- Header -->
                <div class="nc-header">
                    <div class="nc-header-content">
                        <div class="nc-title">
                            <h1>🔔 Centro de Notificaciones</h1>
                            <span class="nc-subtitle">Sistema Unificado Multi-tenant</span>
                        </div>
                        <div class="nc-quick-stats">
                            <div class="qs-item total">
                                <span class="qs-number">${this.notifications.length}</span>
                                <span class="qs-label">Total</span>
                            </div>
                            <div class="qs-item unread">
                                <span class="qs-number">${totalUnread}</span>
                                <span class="qs-label">Sin leer</span>
                            </div>
                            <div class="qs-item pending">
                                <span class="qs-number">${this.stats.pending_responses || 0}</span>
                                <span class="qs-label">Pendientes</span>
                            </div>
                            <div class="qs-item overdue">
                                <span class="qs-number">${this.stats.overdue_messages || 0}</span>
                                <span class="qs-label">Vencidas</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="nc-filters">
                    <div class="filter-row">
                        <div class="filter-item search">
                            <i class="fas fa-search"></i>
                            <input type="text" id="ncSearch" placeholder="Buscar notificaciones..."
                                   value="${this.filters.search}"
                                   oninput="NotificationsComplete.setFilter('search', this.value)">
                        </div>
                        <div class="filter-item">
                            <select id="filterGroupType" onchange="NotificationsComplete.setFilter('groupType', this.value)">
                                <option value="all">📁 Todos los tipos</option>
                                ${groupTypes.map(type => {
                                    const config = this.GROUP_TYPE_CONFIG[type] || this.GROUP_TYPE_CONFIG.default;
                                    return `<option value="${type}" ${this.filters.groupType === type ? 'selected' : ''}>
                                        ${config.icon} ${config.label}
                                    </option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div class="filter-item">
                            <select id="filterPriority" onchange="NotificationsComplete.setFilter('priority', this.value)">
                                <option value="all">🎯 Todas las prioridades</option>
                                <option value="critical" ${this.filters.priority === 'critical' ? 'selected' : ''}>🔴 Crítica</option>
                                <option value="high" ${this.filters.priority === 'high' ? 'selected' : ''}>🟠 Alta</option>
                                <option value="medium" ${this.filters.priority === 'medium' ? 'selected' : ''}>🟡 Media</option>
                                <option value="normal" ${this.filters.priority === 'normal' ? 'selected' : ''}>🟢 Normal</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <select id="filterStatus" onchange="NotificationsComplete.setFilter('status', this.value)">
                                <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>📊 Todos los estados</option>
                                <option value="open" ${this.filters.status === 'open' ? 'selected' : ''}>🟢 Abiertos</option>
                                <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>🟡 Pendientes</option>
                                <option value="closed" ${this.filters.status === 'closed' ? 'selected' : ''}>⚫ Cerrados</option>
                            </select>
                        </div>
                        <button class="btn-refresh" onclick="NotificationsComplete.loadInbox()">
                            <i class="fas fa-sync-alt"></i> Actualizar
                        </button>
                    </div>
                </div>

                <!-- Layout principal -->
                <div class="nc-layout">
                    <!-- Sidebar con categorías -->
                    <div class="nc-sidebar">
                        <div class="sidebar-section">
                            <h3>Categorías</h3>
                            <div class="category-item ${!this.filters.categoryFilter ? 'active' : ''}"
                                 onclick="NotificationsComplete.clearCategoryFilter()">
                                <span class="cat-icon">📋</span>
                                <span class="cat-label">Todos</span>
                                <span class="cat-count">${this.notifications.length}</span>
                            </div>
                            ${Object.entries(this.CATEGORY_CONFIG).map(([key, cat]) => {
                                const count = (groupsByCategory[key] || []).length;
                                const unreadCount = (groupsByCategory[key] || []).filter(g => parseInt(g.unread_count) > 0).length;
                                const isActive = this.filters.categoryFilter === key;
                                return `
                                    <div class="category-item ${count === 0 ? 'empty' : ''} ${isActive ? 'active' : ''}"
                                         onclick="NotificationsComplete.filterByCategory('${key}')">
                                        <span class="cat-icon">${cat.icon}</span>
                                        <span class="cat-label">${cat.label}</span>
                                        <span class="cat-count">${count}</span>
                                        ${unreadCount > 0 ? `<span class="cat-unread">${unreadCount}</span>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Lista de notificaciones -->
                    <div class="nc-list">
                        ${this.renderGroupList(filteredNotifications)}
                    </div>

                    <!-- Panel de detalle -->
                    <div class="nc-detail" id="ncDetail">
                        <div class="empty-state">
                            <div class="empty-icon">📬</div>
                            <h3>Selecciona una notificación</h3>
                            <p>Haz clic en un elemento de la lista para ver los detalles</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    renderGroupList(groups) {
        if (groups.length === 0) {
            return `
                <div class="empty-state" style="padding: 60px 20px;">
                    <div class="empty-icon">📭</div>
                    <h3>Sin notificaciones</h3>
                    <p>Tu bandeja está vacía o no hay resultados</p>
                </div>
            `;
        }

        return groups.map(group => {
            const config = this.GROUP_TYPE_CONFIG[group.group_type] || this.GROUP_TYPE_CONFIG.default;
            const priorityConfig = this.PRIORITY_CONFIG[group.priority] || this.PRIORITY_CONFIG.normal;
            const isUnread = parseInt(group.unread_count) > 0;
            const isActive = this.currentGroupId === group.id;

            return `
                <div class="group-item ${isUnread ? 'unread' : ''} ${isActive ? 'active' : ''}"
                     data-group-id="${group.id}"
                     onclick="NotificationsComplete.loadGroupMessages('${group.id}')">
                    <div class="group-icon" style="background: ${config.color}20; color: ${config.color}">
                        ${config.icon}
                    </div>
                    <div class="group-content">
                        <div class="group-header">
                            <span class="group-title">${this.escapeHtml(group.subject || 'Sin asunto')}</span>
                            <span class="group-time">${this.formatDate(group.last_message_at || group.created_at)}</span>
                        </div>
                        <div class="group-preview">
                            ${this.escapeHtml(group.last_message || 'Sin mensajes')}
                        </div>
                        <div class="group-badges">
                            <span class="badge badge-type">${config.label}</span>
                            <span class="badge badge-priority-${group.priority}">${priorityConfig.icon}</span>
                            ${isUnread ? `<span class="badge badge-unread">${group.unread_count}</span>` : ''}
                            <span class="badge badge-count">💬 ${group.message_count || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async loadGroupMessages(groupId) {
        try {
            this.currentGroupId = groupId;

            document.querySelectorAll('.group-item').forEach(item => {
                item.classList.remove('active');
            });
            const activeItem = document.querySelector(`[data-group-id="${groupId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
                activeItem.classList.remove('unread');
            }

            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            const response = await fetch(`/api/inbox/group/${groupId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando mensajes');

            const data = await response.json();
            this.renderMessages(data.conversation?.group, data.conversation?.messages || []);

        } catch (error) {
            console.error('❌ Error cargando mensajes:', error);
            this.renderDetailError(error.message);
        }
    },

    renderMessages(group, messages) {
        const detailContainer = document.getElementById('ncDetail');
        const config = this.GROUP_TYPE_CONFIG[group?.group_type] || this.GROUP_TYPE_CONFIG.default;

        if (messages.length === 0) {
            detailContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>Sin mensajes</h3>
                    <p>Esta conversación no tiene mensajes</p>
                </div>
            `;
            return;
        }

        detailContainer.innerHTML = `
            <div class="conversation-header">
                <div>
                    <span style="font-size: 1.3em; margin-right: 10px;">${config.icon}</span>
                    <span class="conversation-title">${this.escapeHtml(group?.subject || 'Conversación')}</span>
                </div>
                <div class="conversation-actions">
                    <button class="btn-action secondary" onclick="NotificationsComplete.markAsRead('${group?.id}')">
                        ✓ Leído
                    </button>
                    <button class="btn-action secondary" onclick="NotificationsComplete.closeConversation('${group?.id}')">
                        ✕ Cerrar
                    </button>
                </div>
            </div>

            <div class="message-list">
                ${messages.map(msg => this.renderMessage(msg)).join('')}
            </div>
        `;
    },

    renderMessage(msg) {
        const isSystem = msg.sender_type === 'system';
        const isProactive = msg.message_type === 'proactive_detection';

        return `
            <div class="message-item ${isSystem ? 'system' : ''} ${isProactive ? 'proactive' : ''}">
                <div class="message-header">
                    <span class="message-sender">${this.escapeHtml(msg.sender_name || 'Sistema')}</span>
                    <span class="message-time">${this.formatDate(msg.created_at)}</span>
                </div>
                <div class="message-content">${this.formatContent(msg.content)}</div>
                ${msg.requires_response ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1);">
                        <span style="color: #e74c3c; font-size: 12px;">⚠️ Requiere respuesta</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    formatContent(content) {
        if (!content) return '';
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    },

    async markAsRead(groupId) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            await fetch(`/api/inbox/group/${groupId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.loadInbox();
        } catch (error) {
            console.error('Error:', error);
        }
    },

    async closeConversation(groupId) {
        if (!confirm('¿Cerrar esta conversación?')) return;
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            await fetch(`/api/inbox/group/${groupId}/close`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.currentGroupId = null;
            this.loadInbox();
        } catch (error) {
            console.error('Error:', error);
        }
    },

    filterByCategory(category) {
        // Si ya está activa, limpiar el filtro
        if (this.filters.categoryFilter === category) {
            this.clearCategoryFilter();
            return;
        }

        // Aplicar filtro
        this.filters.categoryFilter = category;
        this.render();
    },

    clearCategoryFilter() {
        this.filters.categoryFilter = null;
        this.render();
    },

    setFilter(key, value) {
        this.filters[key] = value;
        if (key === 'status' || key === 'priority') {
            this.loadInbox();
        } else {
            this.render();
        }
    },

    renderError(message) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="notifications-complete">
                <div style="padding: 60px; text-align: center;">
                    <div style="font-size: 4em; margin-bottom: 20px;">⚠️</div>
                    <h3 style="color: #e74c3c;">Error al cargar notificaciones</h3>
                    <p style="color: #888;">${this.escapeHtml(message)}</p>
                    <button onclick="NotificationsComplete.init()"
                            style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Reintentar
                    </button>
                </div>
            </div>
        `;
    },

    renderDetailError(message) {
        const detailContainer = document.getElementById('ncDetail');
        detailContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error</h3>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;

        return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    attachEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentGroupId) {
                this.currentGroupId = null;
                this.render();
            }
        });
    }
};

// Exportaciones globales
window.NotificationsComplete = NotificationsComplete;
window.showNotificationsCompleteContent = () => NotificationsComplete.init();

// Sistema de módulos
if (!window.Modules) window.Modules = {};
window.Modules['notifications-complete'] = { init: () => NotificationsComplete.init() };

console.log('🔔 [NOTIFICATIONS-COMPLETE] Módulo unificado cargado');
