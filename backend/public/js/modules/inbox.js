/**
 * ============================================================================
 * INBOX - BANDEJA DE NOTIFICACIONES MULTI-TENANT CON HILOS CONVERSACIONALES
 * ============================================================================
 * Sistema de notificaciones agrupadas por hilos/conversaciones.
 * Integrado con el sistema de notificaciones proactivas.
 *
 * @version 2.0
 * @date 2025-12-02
 * ============================================================================
 */

const InboxModule = {
    currentGroupId: null,
    notifications: [],
    filters: {
        status: 'all',
        priority: 'all',
        groupType: 'all',
        search: ''
    },
    stats: {},
    stylesInjected: false,

    // Configuración de tipos de grupos con iconos y colores
    GROUP_TYPE_CONFIG: {
        // Notificaciones proactivas
        proactive_vacation_expiry: { icon: '🏖️', label: 'Vacaciones', color: '#3498db' },
        proactive_overtime_limit: { icon: '⏰', label: 'Horas Extra', color: '#e74c3c' },
        proactive_rest_violation: { icon: '😴', label: 'Descanso', color: '#9b59b6' },
        proactive_document_expiry: { icon: '📄', label: 'Documentos', color: '#f39c12' },
        proactive_certificate_expiry: { icon: '🏥', label: 'Certificados', color: '#1abc9c' },
        proactive_consent_renewal: { icon: '🔐', label: 'Consentimientos', color: '#34495e' },
        // Solicitudes
        vacation_request: { icon: '🌴', label: 'Solicitud Vacaciones', color: '#27ae60' },
        leave_request: { icon: '📝', label: 'Solicitud Licencia', color: '#2980b9' },
        overtime_request: { icon: '💼', label: 'Horas Extra', color: '#8e44ad' },
        // Sistema
        system_alert: { icon: '⚠️', label: 'Alerta Sistema', color: '#c0392b' },
        announcement: { icon: '📢', label: 'Anuncio', color: '#16a085' },
        // Default
        default: { icon: '🔔', label: 'Notificación', color: '#95a5a6' }
    },

    PRIORITY_CONFIG: {
        critical: { icon: '🔴', label: 'Crítica', class: 'priority-critical' },
        high: { icon: '🟠', label: 'Alta', class: 'priority-high' },
        medium: { icon: '🟡', label: 'Media', class: 'priority-medium' },
        normal: { icon: '🟢', label: 'Normal', class: 'priority-normal' },
        low: { icon: '⚪', label: 'Baja', class: 'priority-low' }
    },

    init() {
        console.log('📬 [INBOX] Inicializando módulo Bandeja de Notificaciones v2.0');
        this.injectStyles();
        this.loadStats();
        this.loadInbox();
        // Inicializar indicador de IA si está disponible
        if (typeof InboxAIIndicator !== 'undefined') {
            InboxAIIndicator.init();
        }
    },

    injectStyles() {
        if (this.stylesInjected) return;
        if (document.getElementById('inbox-module-styles')) {
            this.stylesInjected = true;
            return;
        }

        const style = document.createElement('style');
        style.id = 'inbox-module-styles';
        style.textContent = `
            .inbox-module {
                padding: 20px;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: #f8f9fa;
            }
            .inbox-header {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin-bottom: 20px;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                color: white;
            }
            .inbox-header-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
            }
            .inbox-title h2 { margin: 0; font-size: 1.8em; }
            .inbox-subtitle { opacity: 0.8; font-size: 0.9em; }
            .inbox-ai-section { display: flex; align-items: center; }
            .inbox-stats-bar { display: flex; gap: 15px; flex-wrap: wrap; }
            .stat-card {
                background: rgba(255,255,255,0.2);
                padding: 12px 20px;
                border-radius: 10px;
                text-align: center;
                min-width: 80px;
            }
            .stat-card.unread { background: rgba(231, 76, 60, 0.8); }
            .stat-card.pending { background: rgba(241, 196, 15, 0.8); }
            .stat-card.overdue { background: rgba(192, 57, 43, 0.9); }
            .stat-number { display: block; font-size: 1.5em; font-weight: bold; }
            .stat-label { font-size: 0.75em; opacity: 0.9; }
            .inbox-filters {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
                padding: 15px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                flex-wrap: wrap;
                align-items: flex-end;
            }
            .filter-group { display: flex; flex-direction: column; gap: 5px; }
            .filter-group label { font-size: 0.8em; color: #666; font-weight: 500; }
            .filter-group select, .filter-group input {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                min-width: 150px;
            }
            .filter-group input { min-width: 250px; }
            .btn-refresh {
                padding: 10px 20px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
            }
            .btn-refresh:hover { background: #5a6fd6; transform: translateY(-1px); }
            .inbox-content {
                display: grid;
                grid-template-columns: 400px 1fr;
                gap: 15px;
                flex: 1;
                min-height: 0;
            }
            .inbox-list {
                background: white;
                border-radius: 10px;
                overflow-y: auto;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .inbox-detail {
                background: white;
                border-radius: 10px;
                padding: 20px;
                overflow-y: auto;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #999;
                text-align: center;
            }
            .empty-icon { font-size: 4em; margin-bottom: 15px; }
            .group-item {
                padding: 15px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                gap: 12px;
            }
            .group-item:hover { background: #f8f9fa; }
            .group-item.unread {
                background: linear-gradient(90deg, #fff3e0 0%, white 100%);
                border-left: 4px solid #ff9800;
            }
            .group-item.active {
                background: linear-gradient(90deg, #e3f2fd 0%, white 100%);
                border-left: 4px solid #2196F3;
            }
            .group-icon {
                width: 45px;
                height: 45px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5em;
                flex-shrink: 0;
            }
            .group-content { flex: 1; min-width: 0; }
            .group-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 5px;
            }
            .group-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 200px;
            }
            .group-time { font-size: 11px; color: #999; white-space: nowrap; }
            .group-preview {
                font-size: 13px;
                color: #666;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                margin-bottom: 8px;
            }
            .group-meta { display: flex; justify-content: space-between; align-items: center; }
            .group-badges { display: flex; gap: 6px; }
            .badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
            .badge-priority-critical { background: #ffebee; color: #c62828; }
            .badge-priority-high { background: #fff3e0; color: #e65100; }
            .badge-priority-medium { background: #fffde7; color: #f9a825; }
            .badge-priority-normal { background: #e8f5e9; color: #2e7d32; }
            .badge-type { background: #e3f2fd; color: #1565c0; }
            .badge-unread { background: #ff5252; color: white; }
            .badge-count { background: #f5f5f5; color: #666; }
            .message-list { display: flex; flex-direction: column; gap: 12px; }
            .message-item {
                padding: 15px;
                background: #f8f9fa;
                border-radius: 10px;
                border-left: 4px solid #667eea;
            }
            .message-item.system { border-left-color: #9b59b6; background: #faf5ff; }
            .message-item.proactive { border-left-color: #e74c3c; background: #fff5f5; }
            .message-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .message-sender { font-weight: 600; color: #667eea; }
            .message-time { font-size: 12px; color: #999; }
            .message-content { font-size: 14px; line-height: 1.6; color: #333; white-space: pre-wrap; }
            .conversation-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
                margin-bottom: 15px;
            }
            .conversation-title { font-size: 1.2em; font-weight: 600; color: #333; }
            .conversation-actions { display: flex; gap: 10px; }
            .btn-action {
                padding: 8px 15px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            .btn-action.primary { background: #667eea; color: white; }
            .btn-action.secondary { background: #f0f0f0; color: #666; }
            .btn-action:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            @media (max-width: 900px) {
                .inbox-content { grid-template-columns: 1fr; }
                .inbox-detail { display: none; }
                .inbox-detail.active {
                    display: block;
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 1000;
                    border-radius: 0;
                }
            }
        `;
        document.head.appendChild(style);
        this.stylesInjected = true;
        console.log('✅ [INBOX] Estilos inyectados en head');
    },

    async loadStats() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/inbox/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats || {};
            }
        } catch (error) {
            console.error('❌ [INBOX] Error cargando stats:', error);
        }
    },

    async loadInbox() {
        try {
            const token = localStorage.getItem('token');
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
                throw new Error('Error cargando bandeja de notificaciones');
            }

            const data = await response.json();
            this.notifications = data.inbox?.groups || [];
            this.render();
        } catch (error) {
            console.error('❌ [INBOX] Error:', error);
            this.renderError(error.message);
        }
    },

    applyFilters() {
        let filtered = [...this.notifications];

        // Filtro por tipo de grupo
        if (this.filters.groupType !== 'all') {
            filtered = filtered.filter(g => g.group_type === this.filters.groupType);
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

    render() {
        const mainContent = document.getElementById('mainContent');
        const filteredNotifications = this.applyFilters();
        const groupTypes = [...new Set(this.notifications.map(g => g.group_type))];

        mainContent.innerHTML = `
            <div class="inbox-module">
                <!-- Header con estadísticas -->
                <div class="inbox-header">
                    <div class="inbox-header-top">
                        <div class="inbox-title">
                            <h2>📬 Bandeja de Notificaciones</h2>
                            <span class="inbox-subtitle">Sistema Multi-tenant con Hilos</span>
                        </div>
                        <!-- AI Indicator -->
                        <div class="inbox-ai-section" id="inboxAISection">
                            ${typeof InboxAIIndicator !== 'undefined' ? InboxAIIndicator.render() : ''}
                        </div>
                    </div>
                    <div class="inbox-stats-bar">
                        <div class="stat-card">
                            <span class="stat-number">${this.notifications.length}</span>
                            <span class="stat-label">Conversaciones</span>
                        </div>
                        <div class="stat-card unread">
                            <span class="stat-number">${this.notifications.filter(g => parseInt(g.unread_count) > 0).length}</span>
                            <span class="stat-label">Sin leer</span>
                        </div>
                        <div class="stat-card pending">
                            <span class="stat-number">${this.stats.pending_responses || 0}</span>
                            <span class="stat-label">Pendientes</span>
                        </div>
                        <div class="stat-card overdue">
                            <span class="stat-number">${this.stats.overdue_messages || 0}</span>
                            <span class="stat-label">Vencidas</span>
                        </div>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="inbox-filters">
                    <div class="filter-group">
                        <label>Buscar:</label>
                        <input type="text" id="inboxSearch" placeholder="Buscar en conversaciones..."
                               value="${this.filters.search}" onchange="InboxModule.setFilter('search', this.value)">
                    </div>
                    <div class="filter-group">
                        <label>Tipo:</label>
                        <select id="filterGroupType" onchange="InboxModule.setFilter('groupType', this.value)">
                            <option value="all">Todos los tipos</option>
                            ${groupTypes.map(type => {
                                const config = this.GROUP_TYPE_CONFIG[type] || this.GROUP_TYPE_CONFIG.default;
                                return `<option value="${type}" ${this.filters.groupType === type ? 'selected' : ''}>
                                    ${config.icon} ${config.label}
                                </option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Prioridad:</label>
                        <select id="filterPriority" onchange="InboxModule.setFilter('priority', this.value)">
                            <option value="all">Todas</option>
                            <option value="critical" ${this.filters.priority === 'critical' ? 'selected' : ''}>🔴 Crítica</option>
                            <option value="high" ${this.filters.priority === 'high' ? 'selected' : ''}>🟠 Alta</option>
                            <option value="medium" ${this.filters.priority === 'medium' ? 'selected' : ''}>🟡 Media</option>
                            <option value="normal" ${this.filters.priority === 'normal' ? 'selected' : ''}>🟢 Normal</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Estado:</label>
                        <select id="filterStatus" onchange="InboxModule.setFilter('status', this.value)">
                            <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>Todos</option>
                            <option value="open" ${this.filters.status === 'open' ? 'selected' : ''}>Abiertos</option>
                            <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>Pendientes</option>
                            <option value="closed" ${this.filters.status === 'closed' ? 'selected' : ''}>Cerrados</option>
                        </select>
                    </div>
                    <button class="btn-refresh" onclick="InboxModule.loadInbox()">
                        🔄 Actualizar
                    </button>
                </div>

                <!-- Contenido principal -->
                <div class="inbox-content">
                    <div class="inbox-list">
                        ${this.renderGroupList(filteredNotifications)}
                    </div>
                    <div class="inbox-detail" id="inboxDetail">
                        <div class="empty-state">
                            <div class="empty-icon">📥</div>
                            <h3>Selecciona una conversación</h3>
                            <p>Haz clic en un hilo de la izquierda para ver los mensajes</p>
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
                    <h3>No hay notificaciones</h3>
                    <p>Tu bandeja está vacía o no hay resultados para los filtros aplicados</p>
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
                     onclick="InboxModule.loadGroupMessages('${group.id}')">
                    <div class="group-icon" style="background: ${config.color}20; color: ${config.color}">
                        ${config.icon}
                    </div>
                    <div class="group-content">
                        <div class="group-header">
                            <span class="group-title">${this.escapeHtml(group.subject || 'Sin asunto')}</span>
                            <span class="group-time">${this.formatDate(group.last_message_at || group.created_at)}</span>
                        </div>
                        <div class="group-preview">
                            ${this.escapeHtml(group.last_message || 'No hay mensajes')}
                        </div>
                        <div class="group-meta">
                            <div class="group-badges">
                                <span class="badge badge-type">${config.label}</span>
                                <span class="badge badge-priority-${group.priority}">${priorityConfig.icon} ${priorityConfig.label}</span>
                                ${isUnread ? `<span class="badge badge-unread">${group.unread_count} nuevos</span>` : ''}
                            </div>
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

            // Actualizar UI - marcar como activo
            document.querySelectorAll('.group-item').forEach(item => {
                item.classList.remove('active');
            });
            const activeItem = document.querySelector(`[data-group-id="${groupId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
                activeItem.classList.remove('unread');
            }

            const token = localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Error cargando mensajes');
            }

            const data = await response.json();
            this.renderMessages(data.conversation?.group, data.conversation?.messages || []);

        } catch (error) {
            console.error('❌ [INBOX] Error cargando mensajes:', error);
            this.renderDetailError(error.message);
        }
    },

    renderMessages(group, messages) {
        const detailContainer = document.getElementById('inboxDetail');
        const config = this.GROUP_TYPE_CONFIG[group?.group_type] || this.GROUP_TYPE_CONFIG.default;

        if (messages.length === 0) {
            detailContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>Sin mensajes</h3>
                    <p>Esta conversación no tiene mensajes aún</p>
                </div>
            `;
            return;
        }

        detailContainer.innerHTML = `
            <div class="conversation-header">
                <div>
                    <span style="font-size: 1.5em; margin-right: 10px;">${config.icon}</span>
                    <span class="conversation-title">${this.escapeHtml(group?.subject || 'Conversación')}</span>
                </div>
                <div class="conversation-actions">
                    <button class="btn-action secondary" onclick="InboxModule.markAsRead('${group?.id}')">
                        ✓ Marcar leído
                    </button>
                    <button class="btn-action secondary" onclick="InboxModule.closeConversation('${group?.id}')">
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
                <div class="message-content">${this.formatMessageContent(msg.content)}</div>
                ${msg.requires_response ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;">
                        <span style="color: #e74c3c; font-size: 12px;">⚠️ Requiere respuesta</span>
                        ${msg.deadline_at ? `<span style="color: #666; font-size: 12px; margin-left: 10px;">Fecha límite: ${this.formatDate(msg.deadline_at)}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    },

    formatMessageContent(content) {
        if (!content) return '';
        // Convertir markdown básico a HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    },

    async markAsRead(groupId) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/inbox/group/${groupId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.loadInbox();
        } catch (error) {
            console.error('❌ Error marcando como leído:', error);
        }
    },

    async closeConversation(groupId) {
        if (!confirm('¿Cerrar esta conversación?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/inbox/group/${groupId}/close`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.currentGroupId = null;
            this.loadInbox();
        } catch (error) {
            console.error('❌ Error cerrando conversación:', error);
        }
    },

    setFilter(key, value) {
        this.filters[key] = value;
        if (key === 'status' || key === 'priority') {
            this.loadInbox(); // Recargar desde servidor para estos filtros
        } else {
            this.render(); // Filtrado local para tipo y búsqueda
        }
    },

    renderError(message) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 4em; margin-bottom: 20px;">⚠️</div>
                <h3 style="color: #c62828;">Error al cargar bandeja</h3>
                <p style="color: #666;">${this.escapeHtml(message)}</p>
                <button onclick="InboxModule.init()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
    },

    renderDetailError(message) {
        const detailContainer = document.getElementById('inboxDetail');
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
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;

        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    attachEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentGroupId) {
                this.currentGroupId = null;
                this.render();
            }
        });

        console.log('✅ [INBOX] Event listeners configurados');
    }
};

// Función global para compatibilidad con el switch de módulos
function showInboxContent() {
    InboxModule.init();
}

// Auto-inicializar si se carga directamente
if (typeof window !== 'undefined') {
    window.InboxModule = InboxModule;
    window.showInboxContent = showInboxContent;
}
