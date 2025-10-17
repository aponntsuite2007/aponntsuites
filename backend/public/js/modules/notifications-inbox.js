/**
 * NOTIFICATIONS INBOX MODULE
 * Bandeja de Notificaciones - Vista de grupos y conversaciones
 *
 * @version 1.0
 * @date 2025-10-16
 */

const NotificationsInbox = {
    currentGroups: [],
    selectedGroup: null,
    currentMessages: [],
    filters: {
        status: 'all',
        priority: 'all',
        unread_only: false
    },

    init() {
        console.log('📬 Iniciando Notifications Inbox...');
        this.injectStyles();
        this.renderInbox();
        this.attachEventListeners();
        this.loadGroups();
    },

    injectStyles() {
        const existingStyle = document.getElementById('notifications-inbox-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'notifications-inbox-styles';
        style.textContent = `
            .notifications-inbox {
                padding: 20px;
                max-width: 1400px;
                margin: 0 auto;
            }

            .notifications-inbox .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 2px solid #e0e0e0;
            }

            .notifications-inbox .header h2 {
                margin: 0;
                color: #333;
            }

            .notifications-inbox .header-actions {
                display: flex;
                gap: 10px;
            }

            .notifications-inbox .inbox-container {
                display: grid;
                grid-template-columns: 350px 1fr;
                gap: 20px;
                height: calc(100vh - 250px);
            }

            .notifications-inbox .groups-panel {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .notifications-inbox .groups-header {
                padding: 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
            }

            .notifications-inbox .groups-filters {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-top: 10px;
            }

            .notifications-inbox .filter-btn {
                padding: 5px 12px;
                font-size: 12px;
                border: 1px solid #dee2e6;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .notifications-inbox .filter-btn.active {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }

            .notifications-inbox .filter-btn:hover {
                background: #e9ecef;
            }

            .notifications-inbox .filter-btn.active:hover {
                background: #0056b3;
            }

            .notifications-inbox .groups-list {
                flex: 1;
                overflow-y: auto;
            }

            .notifications-inbox .group-item {
                padding: 15px;
                border-bottom: 1px solid #e9ecef;
                cursor: pointer;
                transition: background 0.2s;
                position: relative;
            }

            .notifications-inbox .group-item:hover {
                background: #f8f9fa;
            }

            .notifications-inbox .group-item.active {
                background: #e7f3ff;
                border-left: 4px solid #007bff;
            }

            .notifications-inbox .group-item.unread {
                background: #fff8e1;
                font-weight: 600;
            }

            .notifications-inbox .group-item .group-title {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 5px;
                color: #333;
            }

            .notifications-inbox .group-item .group-subtitle {
                font-size: 12px;
                color: #666;
                margin-bottom: 5px;
            }

            .notifications-inbox .group-item .group-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                color: #999;
            }

            .notifications-inbox .priority-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .notifications-inbox .priority-badge.critical {
                background: #dc3545;
                color: white;
            }

            .notifications-inbox .priority-badge.high {
                background: #fd7e14;
                color: white;
            }

            .notifications-inbox .priority-badge.medium {
                background: #ffc107;
                color: #333;
            }

            .notifications-inbox .priority-badge.low {
                background: #17a2b8;
                color: white;
            }

            .notifications-inbox .unread-count {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #dc3545;
                color: white;
                border-radius: 12px;
                padding: 2px 8px;
                font-size: 11px;
                font-weight: 600;
            }

            .notifications-inbox .conversation-panel {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .notifications-inbox .conversation-header {
                padding: 15px 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
            }

            .notifications-inbox .conversation-header h3 {
                margin: 0 0 5px 0;
                font-size: 18px;
                color: #333;
            }

            .notifications-inbox .conversation-header .meta {
                font-size: 13px;
                color: #666;
            }

            .notifications-inbox .conversation-actions {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }

            .notifications-inbox .messages-container {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f5f5f5;
            }

            .notifications-inbox .message {
                margin-bottom: 15px;
                display: flex;
                flex-direction: column;
                max-width: 70%;
            }

            .notifications-inbox .message.sent {
                align-self: flex-end;
                align-items: flex-end;
            }

            .notifications-inbox .message.received {
                align-self: flex-start;
                align-items: flex-start;
            }

            .notifications-inbox .message .sender {
                font-size: 12px;
                font-weight: 600;
                color: #666;
                margin-bottom: 5px;
            }

            .notifications-inbox .message .bubble {
                padding: 12px 16px;
                border-radius: 8px;
                background: white;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }

            .notifications-inbox .message.sent .bubble {
                background: #007bff;
                color: white;
            }

            .notifications-inbox .message.system .bubble {
                background: #ffc107;
                color: #333;
                font-style: italic;
            }

            .notifications-inbox .message .timestamp {
                font-size: 11px;
                color: #999;
                margin-top: 5px;
            }

            .notifications-inbox .reply-box {
                padding: 15px;
                background: white;
                border-top: 1px solid #dee2e6;
            }

            .notifications-inbox .reply-input {
                display: flex;
                gap: 10px;
            }

            .notifications-inbox .reply-input textarea {
                flex: 1;
                padding: 10px;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                resize: none;
                font-family: inherit;
            }

            .notifications-inbox .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #999;
            }

            .notifications-inbox .empty-state i {
                font-size: 64px;
                margin-bottom: 20px;
            }

            .notifications-inbox .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.9);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            }

            .notifications-inbox .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .notifications-inbox .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s;
            }

            .notifications-inbox .btn-primary {
                background: #007bff;
                color: white;
            }

            .notifications-inbox .btn-primary:hover {
                background: #0056b3;
            }

            .notifications-inbox .btn-success {
                background: #28a745;
                color: white;
            }

            .notifications-inbox .btn-success:hover {
                background: #218838;
            }

            .notifications-inbox .btn-secondary {
                background: #6c757d;
                color: white;
            }

            .notifications-inbox .btn-secondary:hover {
                background: #5a6268;
            }

            .notifications-inbox .btn-sm {
                padding: 5px 10px;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    },

    renderInbox() {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="notifications-inbox">
                <div class="header">
                    <h2>
                        <i class="fas fa-inbox"></i>
                        Bandeja de Notificaciones
                    </h2>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="refreshInbox">
                            <i class="fas fa-sync"></i> Actualizar
                        </button>
                        <button class="btn btn-success" id="markAllRead">
                            <i class="fas fa-check-double"></i> Marcar Todo Leído
                        </button>
                    </div>
                </div>

                <div id="inboxLoading" class="loading-overlay" style="display: none;">
                    <div class="spinner"></div>
                    <p>Cargando notificaciones...</p>
                </div>

                <div class="inbox-container">
                    <!-- Panel izquierdo: Lista de grupos -->
                    <div class="groups-panel">
                        <div class="groups-header">
                            <h3 style="margin: 0 0 10px 0; font-size: 16px;">Conversaciones</h3>
                            <div class="groups-filters">
                                <button class="filter-btn active" data-filter="status" data-value="all">
                                    Todas
                                </button>
                                <button class="filter-btn" data-filter="status" data-value="open">
                                    Abiertas
                                </button>
                                <button class="filter-btn" data-filter="status" data-value="pending">
                                    Pendientes
                                </button>
                                <button class="filter-btn" data-filter="status" data-value="resolved">
                                    Resueltas
                                </button>
                                <button class="filter-btn" data-filter="unread_only" data-value="true">
                                    <i class="fas fa-circle" style="color: #dc3545; font-size: 8px;"></i> No Leídas
                                </button>
                            </div>
                        </div>
                        <div class="groups-list" id="groupsList">
                            <!-- Grupos se cargan aquí -->
                        </div>
                    </div>

                    <!-- Panel derecho: Conversación -->
                    <div class="conversation-panel">
                        <div id="conversationContent">
                            <div class="empty-state">
                                <i class="fas fa-comments"></i>
                                <h3>Selecciona una conversación</h3>
                                <p>Elige una notificación de la lista para ver los detalles</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        // Refresh
        document.getElementById('refreshInbox').addEventListener('click', () => {
            this.loadGroups();
        });

        // Mark all read
        document.getElementById('markAllRead').addEventListener('click', () => {
            this.markAllAsRead();
        });

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                const value = e.target.dataset.value;

                // Update active state
                if (filter === 'status') {
                    document.querySelectorAll('[data-filter="status"]').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.filters.status = value;
                } else if (filter === 'unread_only') {
                    e.target.classList.toggle('active');
                    this.filters.unread_only = e.target.classList.contains('active');
                }

                this.applyFilters();
            });
        });
    },

    async loadGroups() {
        this.showLoading();

        try {
            const response = await fetch('/api/v1/notifications/groups', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh',
                    'x-user-id': sessionStorage.getItem('user_id') || sessionStorage.getItem('employee_id')
                }
            });

            if (!response.ok) throw new Error('Error al cargar grupos');

            const data = await response.json();
            this.currentGroups = data.groups || [];
            this.renderGroups(this.currentGroups);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar las notificaciones');
        } finally {
            this.hideLoading();
        }
    },

    renderGroups(groups) {
        const container = document.getElementById('groupsList');

        if (!groups || groups.length === 0) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #999;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <p>No hay notificaciones</p>
                </div>
            `;
            return;
        }

        let html = '';
        groups.forEach(group => {
            const unreadCount = group.unread_count || 0;
            const isUnread = unreadCount > 0;
            const isActive = this.selectedGroup && this.selectedGroup.group_id === group.group_id;

            html += `
                <div class="group-item ${isUnread ? 'unread' : ''} ${isActive ? 'active' : ''}"
                     data-group-id="${group.group_id}">
                    ${unreadCount > 0 ? `<span class="unread-count">${unreadCount}</span>` : ''}
                    <div class="group-title">${this.getGroupTitle(group)}</div>
                    <div class="group-subtitle">${group.context_type || 'Notificación'}</div>
                    <div class="group-meta">
                        <span>${this.formatDate(group.last_activity || group.created_at)}</span>
                        <span class="priority-badge ${group.priority || 'medium'}">${group.priority || 'Media'}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Attach click events
        document.querySelectorAll('.group-item').forEach(item => {
            item.addEventListener('click', () => {
                const groupId = item.dataset.groupId;
                const group = this.currentGroups.find(g => g.group_id === groupId);
                this.selectGroup(group);
            });
        });
    },

    async selectGroup(group) {
        this.selectedGroup = group;
        this.renderGroups(this.currentGroups); // Re-render to update active state
        await this.loadMessages(group.group_id);
    },

    async loadMessages(groupId) {
        this.showLoading();

        try {
            const response = await fetch(`/api/v1/notifications/groups/${groupId}/messages`, {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh',
                    'x-user-id': sessionStorage.getItem('user_id') || sessionStorage.getItem('employee_id')
                }
            });

            if (!response.ok) throw new Error('Error al cargar mensajes');

            const data = await response.json();
            this.currentMessages = data.messages || [];
            this.renderConversation();

            // Mark as read
            await this.markGroupAsRead(groupId);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar los mensajes');
        } finally {
            this.hideLoading();
        }
    },

    renderConversation() {
        const container = document.getElementById('conversationContent');
        const currentUserId = sessionStorage.getItem('user_id') || sessionStorage.getItem('employee_id');

        let html = `
            <div class="conversation-header">
                <h3>${this.getGroupTitle(this.selectedGroup)}</h3>
                <div class="meta">
                    <span><i class="fas fa-tag"></i> ${this.selectedGroup.context_type || 'Notificación'}</span>
                    <span style="margin-left: 15px;"><i class="fas fa-users"></i> ${(this.selectedGroup.participants || []).length} participantes</span>
                    <span style="margin-left: 15px;"><i class="fas fa-circle" style="color: ${this.getStatusColor(this.selectedGroup.status)};"></i> ${this.translateStatus(this.selectedGroup.status)}</span>
                </div>
                <div class="conversation-actions">
                    ${this.selectedGroup.status !== 'resolved' ? `
                        <button class="btn btn-success btn-sm" onclick="NotificationsInbox.resolveGroup('${this.selectedGroup.group_id}')">
                            <i class="fas fa-check"></i> Marcar como Resuelta
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary btn-sm" onclick="NotificationsInbox.viewGroupDetails()">
                        <i class="fas fa-info-circle"></i> Ver Detalles
                    </button>
                </div>
            </div>

            <div class="messages-container" id="messagesContainer">
        `;

        if (!this.currentMessages || this.currentMessages.length === 0) {
            html += `
                <div style="text-align: center; color: #999; padding: 40px;">
                    <i class="fas fa-comment-slash" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <p>No hay mensajes en esta conversación</p>
                </div>
            `;
        } else {
            this.currentMessages.forEach(msg => {
                const isSent = msg.sender_id === currentUserId;
                const isSystem = msg.sender_type === 'system';
                const messageClass = isSystem ? 'system' : (isSent ? 'sent' : 'received');

                html += `
                    <div class="message ${messageClass}">
                        <div class="sender">${this.getSenderName(msg)}</div>
                        <div class="bubble">${msg.message_text || ''}</div>
                        <div class="timestamp">${this.formatDate(msg.created_at)}</div>
                    </div>
                `;
            });
        }

        html += `</div>`;

        // Reply box
        if (this.selectedGroup.status !== 'resolved') {
            html += `
                <div class="reply-box">
                    <div class="reply-input">
                        <textarea id="replyText" rows="2" placeholder="Escribe tu respuesta..."></textarea>
                        <button class="btn btn-primary" onclick="NotificationsInbox.sendReply()">
                            <i class="fas fa-paper-plane"></i> Enviar
                        </button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Scroll to bottom
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    },

    async sendReply() {
        const textarea = document.getElementById('replyText');
        const message = textarea.value.trim();

        if (!message) {
            alert('Por favor ingresa un mensaje');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(`/api/v1/notifications/groups/${this.selectedGroup.group_id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh',
                    'x-user-id': sessionStorage.getItem('user_id') || sessionStorage.getItem('employee_id')
                },
                body: JSON.stringify({
                    message_text: message,
                    sender_type: sessionStorage.getItem('role') || 'rrhh'
                })
            });

            if (!response.ok) throw new Error('Error al enviar mensaje');

            textarea.value = '';
            await this.loadMessages(this.selectedGroup.group_id);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al enviar el mensaje');
        } finally {
            this.hideLoading();
        }
    },

    async markGroupAsRead(groupId) {
        try {
            await fetch(`/api/v1/notifications/groups/${groupId}/read`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-user-id': sessionStorage.getItem('user_id') || sessionStorage.getItem('employee_id')
                }
            });

            // Update local state
            const group = this.currentGroups.find(g => g.group_id === groupId);
            if (group) {
                group.unread_count = 0;
            }
        } catch (error) {
            console.error('Error al marcar como leído:', error);
        }
    },

    async markAllAsRead() {
        if (!confirm('¿Marcar todas las notificaciones como leídas?')) return;

        this.showLoading();

        try {
            const response = await fetch('/api/v1/notifications/groups/mark-all-read', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-user-id': sessionStorage.getItem('user_id') || sessionStorage.getItem('employee_id')
                }
            });

            if (!response.ok) throw new Error('Error al marcar como leídas');

            await this.loadGroups();
            alert('✅ Todas las notificaciones marcadas como leídas');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al marcar como leídas');
        } finally {
            this.hideLoading();
        }
    },

    async resolveGroup(groupId) {
        if (!confirm('¿Marcar esta conversación como resuelta?')) return;

        this.showLoading();

        try {
            const response = await fetch(`/api/v1/notifications/groups/${groupId}/resolve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-user-id': sessionStorage.getItem('user_id') || sessionStorage.getItem('employee_id')
                }
            });

            if (!response.ok) throw new Error('Error al resolver grupo');

            alert('✅ Conversación marcada como resuelta');
            await this.loadGroups();
            await this.loadMessages(groupId);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al resolver la conversación');
        } finally {
            this.hideLoading();
        }
    },

    viewGroupDetails() {
        const details = `
Detalles de la Conversación

ID: ${this.selectedGroup.group_id}
Tipo: ${this.selectedGroup.context_type || 'N/A'}
Estado: ${this.translateStatus(this.selectedGroup.status)}
Prioridad: ${this.selectedGroup.priority || 'Media'}
Creada: ${this.formatDate(this.selectedGroup.created_at)}
Última actividad: ${this.formatDate(this.selectedGroup.last_activity)}

Participantes:
${(this.selectedGroup.participants || []).join('\n')}
        `;
        alert(details);
    },

    applyFilters() {
        let filtered = [...this.currentGroups];

        if (this.filters.status !== 'all') {
            filtered = filtered.filter(g => g.status === this.filters.status);
        }

        if (this.filters.unread_only) {
            filtered = filtered.filter(g => (g.unread_count || 0) > 0);
        }

        this.renderGroups(filtered);
    },

    getGroupTitle(group) {
        if (group.group_metadata && group.group_metadata.title) {
            return group.group_metadata.title;
        }
        return group.context_type || 'Notificación';
    },

    getSenderName(message) {
        if (message.sender_type === 'system') {
            return '🤖 Sistema';
        }
        if (message.sender_metadata && message.sender_metadata.name) {
            return message.sender_metadata.name;
        }
        return message.sender_type || 'Usuario';
    },

    translateStatus(status) {
        const translations = {
            'open': 'Abierta',
            'pending': 'Pendiente',
            'resolved': 'Resuelta',
            'escalated': 'Escalada'
        };
        return translations[status] || status;
    },

    getStatusColor(status) {
        const colors = {
            'open': '#28a745',
            'pending': '#ffc107',
            'resolved': '#6c757d',
            'escalated': '#dc3545'
        };
        return colors[status] || '#6c757d';
    },

    formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `Hace ${minutes}m`;
        if (hours < 24) return `Hace ${hours}h`;
        if (days < 7) return `Hace ${days}d`;
        return d.toLocaleDateString('es-AR');
    },

    showLoading() {
        document.getElementById('inboxLoading').style.display = 'flex';
    },

    hideLoading() {
        document.getElementById('inboxLoading').style.display = 'none';
    },

    showError(message) {
        alert('❌ ' + message);
    }
};

window.NotificationsInbox = NotificationsInbox;
