/**
 * ============================================================================
 * INBOX - BANDEJA DE NOTIFICACIONES CON HILOS CONVERSACIONALES
 * ============================================================================
 * Sistema de notificaciones agrupadas por hilos/conversaciones.
 * Las notificaciones relacionadas se agrupan en threads con mensajes secuenciales.
 * ============================================================================
 */

const InboxModule = {
    currentGroupId: null,
    notifications: [],

    init() {
        console.log('📬 [INBOX] Inicializando módulo Bandeja de Notificaciones');
        this.loadInbox();
    },

    async loadInbox() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/inbox', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error cargando bandeja de notificaciones');
            }

            const data = await response.json();
            this.notifications = data.groups || [];
            this.render();
        } catch (error) {
            console.error('❌ [INBOX] Error:', error);
            this.renderError(error.message);
        }
    },

    render() {
        const mainContent = document.getElementById('mainContent');

        mainContent.innerHTML = `
            <div class="inbox-container">
                <div class="inbox-header">
                    <h2>📬 Bandeja de Notificaciones</h2>
                    <div class="inbox-stats">
                        <span class="stat-badge">
                            <strong>${this.notifications.length}</strong> conversaciones
                        </span>
                        <span class="stat-badge unread">
                            <strong>${this.notifications.filter(g => g.unread_count > 0).length}</strong> sin leer
                        </span>
                    </div>
                </div>

                <div class="inbox-content">
                    <div class="inbox-list">
                        ${this.renderGroupList()}
                    </div>
                    <div class="inbox-detail" id="inboxDetail">
                        <div class="empty-state">
                            <i class="fas fa-inbox" style="font-size: 4em; color: #ccc;"></i>
                            <p>Selecciona una conversación para ver los mensajes</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .inbox-container {
                    padding: 20px;
                }
                .inbox-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #e0e0e0;
                }
                .inbox-stats {
                    display: flex;
                    gap: 15px;
                }
                .stat-badge {
                    padding: 8px 16px;
                    background: #f5f5f5;
                    border-radius: 20px;
                    font-size: 14px;
                }
                .stat-badge.unread {
                    background: #ff4444;
                    color: white;
                }
                .inbox-content {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    gap: 20px;
                    height: calc(100vh - 250px);
                }
                .inbox-list {
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    overflow-y: auto;
                    background: white;
                }
                .inbox-detail {
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    background: white;
                    padding: 20px;
                    overflow-y: auto;
                }
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #999;
                }
                .group-item {
                    padding: 15px;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .group-item:hover {
                    background: #f8f9fa;
                }
                .group-item.unread {
                    background: #fff3e0;
                    font-weight: bold;
                }
                .group-item.active {
                    background: #e3f2fd;
                }
                .group-title {
                    font-size: 16px;
                    margin-bottom: 5px;
                }
                .group-preview {
                    font-size: 13px;
                    color: #666;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .group-meta {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                    font-size: 12px;
                    color: #999;
                }
                .message-item {
                    margin-bottom: 15px;
                    padding: 12px;
                    background: #f5f5f5;
                    border-radius: 8px;
                    border-left: 4px solid #2196F3;
                }
                .message-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 13px;
                }
                .message-sender {
                    font-weight: bold;
                    color: #2196F3;
                }
                .message-time {
                    color: #999;
                }
                .message-content {
                    font-size: 14px;
                    line-height: 1.5;
                }
            </style>
        `;

        this.attachEventListeners();
    },

    renderGroupList() {
        if (this.notifications.length === 0) {
            return `
                <div class="empty-state" style="padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 3em; color: #ccc;"></i>
                    <p style="margin-top: 15px; color: #999;">No tienes notificaciones</p>
                </div>
            `;
        }

        return this.notifications.map(group => `
            <div class="group-item ${group.unread_count > 0 ? 'unread' : ''}"
                 data-group-id="${group.group_id}"
                 onclick="InboxModule.loadGroupMessages('${group.group_id}')">
                <div class="group-title">
                    ${group.subject || 'Sin asunto'}
                    ${group.unread_count > 0 ? `<span style="color: #ff4444;">(${group.unread_count})</span>` : ''}
                </div>
                <div class="group-preview">
                    ${group.last_message_preview || 'No hay mensajes'}
                </div>
                <div class="group-meta">
                    <span>💬 ${group.message_count} mensajes</span>
                    <span>${this.formatDate(group.last_message_at)}</span>
                </div>
            </div>
        `).join('');
    },

    async loadGroupMessages(groupId) {
        try {
            this.currentGroupId = groupId;

            // Actualizar UI - marcar como activo
            document.querySelectorAll('.group-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-group-id="${groupId}"]`).classList.add('active');

            const token = localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error cargando mensajes');
            }

            const data = await response.json();
            this.renderMessages(data.messages || []);

            // Marcar como leído (automático en el backend)
            this.loadInbox(); // Refrescar lista
        } catch (error) {
            console.error('❌ [INBOX] Error cargando mensajes:', error);
            this.renderError(error.message);
        }
    },

    renderMessages(messages) {
        const detailContainer = document.getElementById('inboxDetail');

        if (messages.length === 0) {
            detailContainer.innerHTML = `
                <div class="empty-state">
                    <p>No hay mensajes en esta conversación</p>
                </div>
            `;
            return;
        }

        detailContainer.innerHTML = `
            <div class="messages-container">
                <h3>Conversación</h3>
                ${messages.map(msg => `
                    <div class="message-item">
                        <div class="message-header">
                            <span class="message-sender">${msg.sender_name || 'Sistema'}</span>
                            <span class="message-time">${this.formatDate(msg.timestamp)}</span>
                        </div>
                        <div class="message-content">
                            ${msg.content}
                        </div>
                        ${msg.metadata ? `
                            <div class="message-meta" style="margin-top: 8px; font-size: 12px; color: #666;">
                                ${JSON.stringify(msg.metadata, null, 2)}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderError(message) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Error:</strong> ${message}
            </div>
        `;
    },

    formatDate(dateString) {
        if (!dateString) return 'Fecha desconocida';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;

        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    attachEventListeners() {
        // Los eventos están en onclick inline por ahora
        console.log('✅ [INBOX] Event listeners configurados');
    }
};

// Función global para compatibilidad con el switch
function showInboxContent() {
    InboxModule.init();
}

// Auto-inicializar si se carga directamente
if (typeof window !== 'undefined') {
    window.InboxModule = InboxModule;
    window.showInboxContent = showInboxContent;
}
