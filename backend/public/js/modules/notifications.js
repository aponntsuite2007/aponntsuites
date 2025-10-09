// Módulo de gestión de notificaciones
// Sistema de Control de Accesos - Panel Empresa

// Variables globales (evitar redeclaración)
if (typeof window.notificationsList === 'undefined') {
    window.notificationsList = [];
}
if (typeof window.notificationPolling === 'undefined') {
    window.notificationPolling = null;
}
if (typeof window.unreadCount === 'undefined') {
    window.unreadCount = 0;
}

var notificationsList = window.notificationsList;
var notificationPolling = window.notificationPolling;
var unreadCount = window.unreadCount;

// CSS del módulo
const notificationsStyleElement = document.createElement('style');
notificationsStyleElement.id = 'notifications-module-styles';
notificationsStyleElement.textContent = `
    /* Estilos del módulo de notificaciones */
    .notifications-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        gap: 2rem !important;
        margin-bottom: 2rem !important;
    }

    .notifications-header-left {
        flex: 1 !important;
    }

    .notifications-header h2 {
        font-size: 1.5rem !important;
        font-weight: bold !important;
        margin: 0 0 0.5rem 0 !important;
    }

    .notifications-header p {
        color: #6c757d !important;
        margin: 0 !important;
    }

    .notification-card {
        border-left: 4px solid #dee2e6;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transition: all 0.2s;
    }

    .notification-card:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .notification-card.unread {
        background: #f8f9fa;
        border-left-color: #007bff;
    }

    .notification-card.priority-critical {
        border-left-color: #dc3545;
        background: #fff5f5;
    }

    .notification-card.priority-high {
        border-left-color: #fd7e14;
    }

    .notification-card.priority-medium {
        border-left-color: #ffc107;
    }

    .notification-card.priority-low {
        border-left-color: #28a745;
    }

    .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 0.5rem;
    }

    .notification-title {
        font-weight: bold;
        font-size: 1.1rem;
        color: #212529;
        margin: 0;
    }

    .notification-time {
        font-size: 0.85rem;
        color: #6c757d;
        white-space: nowrap;
    }

    .notification-message {
        color: #495057;
        margin: 0.5rem 0;
    }

    .notification-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
    }

    .notification-badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .notification-badge.priority-critical {
        background: #dc3545;
        color: white;
    }

    .notification-badge.priority-high {
        background: #fd7e14;
        color: white;
    }

    .notification-badge.priority-medium {
        background: #ffc107;
        color: #212529;
    }

    .notification-badge.priority-low {
        background: #28a745;
        color: white;
    }

    .notification-type-icon {
        display: inline-block;
        width: 24px;
        height: 24px;
        line-height: 24px;
        text-align: center;
        border-radius: 50%;
        background: #e9ecef;
        margin-right: 0.5rem;
    }

    .notification-filters {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
    }

    .notification-filters .row {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .notification-filters .col {
        flex: 1;
        min-width: 200px;
    }

    .notification-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .notification-stat {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        text-align: center;
    }

    .notification-stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: #007bff;
    }

    .notification-stat-label {
        font-size: 0.875rem;
        color: #6c757d;
        margin-top: 0.25rem;
    }

    .notification-empty {
        text-align: center;
        padding: 3rem;
        color: #6c757d;
    }

    .notification-empty-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }

    /* Badge en el header */
    .notification-bell-badge {
        position: relative;
        display: inline-block;
    }

    .notification-bell-badge .badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #dc3545;
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 0.75rem;
        font-weight: bold;
    }
`;
document.head.appendChild(notificationsStyleElement);

/**
 * Función principal para mostrar el contenido del módulo de notificaciones
 */
async function showNotificationsContent() {
    const content = document.getElementById('content');

    content.innerHTML = `
        <div class="notifications-container">
            <div class="notifications-header">
                <div class="notifications-header-left">
                    <h2>🔔 Notificaciones</h2>
                    <p>Centro de alertas y notificaciones del sistema</p>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="markAllNotificationsAsRead()">
                    ✓ Marcar todas como leídas
                </button>
            </div>

            <!-- Estadísticas -->
            <div class="notification-stats">
                <div class="notification-stat">
                    <div class="notification-stat-value" id="statTotal">0</div>
                    <div class="notification-stat-label">Total</div>
                </div>
                <div class="notification-stat">
                    <div class="notification-stat-value" id="statUnread">0</div>
                    <div class="notification-stat-label">No leídas</div>
                </div>
                <div class="notification-stat">
                    <div class="notification-stat-value" id="statCritical">0</div>
                    <div class="notification-stat-label">Críticas</div>
                </div>
                <div class="notification-stat">
                    <div class="notification-stat-value" id="statPending">0</div>
                    <div class="notification-stat-label">Pendientes</div>
                </div>
            </div>

            <!-- Filtros -->
            <div class="notification-filters">
                <div class="row">
                    <div class="col">
                        <label>Tipo</label>
                        <select class="form-control" id="filterType" onchange="applyNotificationFilters()">
                            <option value="">Todos</option>
                            <option value="visitor_arrival">Llegada de visitante</option>
                            <option value="visitor_authorization">Autorización de visita</option>
                            <option value="visitor_outside_facility">Visitante fuera del perímetro</option>
                            <option value="employee_late_arrival">Llegada tarde</option>
                            <option value="kiosk_offline">Kiosko offline</option>
                        </select>
                    </div>
                    <div class="col">
                        <label>Prioridad</label>
                        <select class="form-control" id="filterPriority" onchange="applyNotificationFilters()">
                            <option value="">Todas</option>
                            <option value="critical">Crítica</option>
                            <option value="high">Alta</option>
                            <option value="medium">Media</option>
                            <option value="low">Baja</option>
                        </select>
                    </div>
                    <div class="col">
                        <label>Estado</label>
                        <select class="form-control" id="filterRead" onchange="applyNotificationFilters()">
                            <option value="">Todas</option>
                            <option value="unread">No leídas</option>
                            <option value="read">Leídas</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Lista de notificaciones -->
            <div id="notificationsListContainer">
                <div class="text-center p-4">
                    <div class="spinner-border" role="status">
                        <span class="sr-only">Cargando...</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Cargar notificaciones
    await loadNotifications();

    // Iniciar polling cada 30 segundos
    startNotificationPolling();
}

/**
 * Cargar notificaciones
 */
async function loadNotifications() {
    try {
        const token = await getValidToken();

        const response = await fetch('/api/v1/notifications', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al cargar notificaciones');

        const data = await response.json();
        window.notificationsList = data.notifications || [];
        window.unreadCount = data.unreadCount || 0;

        notificationsList = window.notificationsList;
        unreadCount = window.unreadCount;

        updateNotificationStats();
        renderNotificationsList(notificationsList);
        updateNotificationBadge();

    } catch (error) {
        console.error('Error cargando notificaciones:', error);
        document.getElementById('notificationsListContainer').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar notificaciones: ${error.message}
            </div>
        `;
    }
}

/**
 * Actualizar estadísticas
 */
function updateNotificationStats() {
    const total = notificationsList.length;
    const unread = notificationsList.filter(n => !n.isRead).length;
    const critical = notificationsList.filter(n => n.priority === 'critical').length;
    const pending = notificationsList.filter(n => !n.actionTaken && n.priority !== 'low').length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statUnread').textContent = unread;
    document.getElementById('statCritical').textContent = critical;
    document.getElementById('statPending').textContent = pending;
}

/**
 * Renderizar lista de notificaciones
 */
function renderNotificationsList(notifications) {
    const container = document.getElementById('notificationsListContainer');

    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="notification-empty">
                <div class="notification-empty-icon">🔕</div>
                <h4>No hay notificaciones</h4>
                <p>Cuando recibas notificaciones aparecerán aquí</p>
            </div>
        `;
        return;
    }

    const html = notifications.map(notif => {
        const icon = getNotificationIcon(notif.notificationType);
        const isUnread = !notif.isRead;

        return `
            <div class="notification-card ${isUnread ? 'unread' : ''} priority-${notif.priority}">
                <div class="notification-header">
                    <div style="display: flex; align-items: center;">
                        <span class="notification-type-icon">${icon}</span>
                        <h5 class="notification-title">${notif.title}</h5>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="notification-badge priority-${notif.priority}">${notif.priority}</span>
                        <span class="notification-time">${formatRelativeTime(notif.createdAt)}</span>
                    </div>
                </div>
                <div class="notification-message">${notif.message}</div>

                ${notif.metadata && Object.keys(notif.metadata).length > 0 ? `
                    <div style="font-size: 0.85rem; color: #6c757d; margin-top: 0.5rem;">
                        ${Object.entries(notif.metadata).slice(0, 3).map(([key, val]) =>
                            `<div><strong>${key}:</strong> ${val}</div>`
                        ).join('')}
                    </div>
                ` : ''}

                <div class="notification-actions">
                    ${isUnread ? `
                        <button class="btn btn-sm btn-outline-primary" onclick="markNotificationAsRead(${notif.id})">
                            ✓ Marcar leída
                        </button>
                    ` : ''}
                    ${!notif.actionTaken && requiresAction(notif.notificationType) ? `
                        <button class="btn btn-sm btn-success" onclick="approveNotification(${notif.id})">
                            ✅ Aprobar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectNotification(${notif.id})">
                            ❌ Rechazar
                        </button>
                    ` : ''}
                    ${notif.actionTaken ? `
                        <span class="badge badge-info">
                            Acción: ${notif.actionType} ${notif.actionTakenAt ? '- ' + formatRelativeTime(notif.actionTakenAt) : ''}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Aplicar filtros
 */
function applyNotificationFilters() {
    const type = document.getElementById('filterType').value;
    const priority = document.getElementById('filterPriority').value;
    const readStatus = document.getElementById('filterRead').value;

    let filtered = notificationsList;

    if (type) {
        filtered = filtered.filter(n => n.notificationType === type);
    }

    if (priority) {
        filtered = filtered.filter(n => n.priority === priority);
    }

    if (readStatus === 'unread') {
        filtered = filtered.filter(n => !n.isRead);
    } else if (readStatus === 'read') {
        filtered = filtered.filter(n => n.isRead);
    }

    renderNotificationsList(filtered);
}

/**
 * Marcar notificación como leída
 */
async function markNotificationAsRead(notificationId) {
    try {
        const token = await getValidToken();

        const response = await fetch(`/api/v1/notifications/${notificationId}/mark-read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al marcar como leída');

        await loadNotifications();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al marcar notificación como leída');
    }
}

/**
 * Marcar todas como leídas
 */
async function markAllNotificationsAsRead() {
    if (!confirm('¿Marcar todas las notificaciones como leídas?')) return;

    try {
        const token = await getValidToken();

        const response = await fetch('/api/v1/notifications/mark-all-read', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al marcar todas como leídas');

        await loadNotifications();
        alert('Todas las notificaciones fueron marcadas como leídas');

    } catch (error) {
        console.error('Error:', error);
        alert('Error al marcar todas como leídas');
    }
}

/**
 * Aprobar notificación
 */
async function approveNotification(notificationId) {
    const notes = prompt('Notas (opcional):');

    try {
        const token = await getValidToken();

        const response = await fetch(`/api/v1/notifications/${notificationId}/respond`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'approve',
                notes: notes || ''
            })
        });

        if (!response.ok) throw new Error('Error al aprobar');

        alert('Notificación aprobada exitosamente');
        await loadNotifications();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al aprobar notificación');
    }
}

/**
 * Rechazar notificación
 */
async function rejectNotification(notificationId) {
    const notes = prompt('Motivo del rechazo:');
    if (!notes) return;

    try {
        const token = await getValidToken();

        const response = await fetch(`/api/v1/notifications/${notificationId}/respond`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'reject',
                notes: notes
            })
        });

        if (!response.ok) throw new Error('Error al rechazar');

        alert('Notificación rechazada');
        await loadNotifications();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al rechazar notificación');
    }
}

/**
 * Polling de notificaciones
 */
function startNotificationPolling() {
    // Limpiar polling anterior si existe
    if (window.notificationPolling) {
        clearInterval(window.notificationPolling);
    }

    // Actualizar cada 30 segundos
    window.notificationPolling = setInterval(async () => {
        await updateUnreadCount();
    }, 30000);
}

/**
 * Actualizar contador de no leídas
 */
async function updateUnreadCount() {
    try {
        const token = await getValidToken();

        const response = await fetch('/api/v1/notifications/unread-count', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            window.unreadCount = data.unreadCount || 0;
            unreadCount = window.unreadCount;
            updateNotificationBadge();
        }

    } catch (error) {
        console.error('Error actualizando contador:', error);
    }
}

/**
 * Actualizar badge de notificaciones en el header
 */
function updateNotificationBadge() {
    // TODO: Actualizar badge en el header principal si existe
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }
}

/**
 * Helper functions
 */
function getNotificationIcon(type) {
    const icons = {
        'visitor_arrival': '👥',
        'visitor_checkout': '👋',
        'visitor_authorization': '🔐',
        'visitor_outside_facility': '⚠️',
        'visitor_overstay': '⏰',
        'employee_late_arrival': '🕐',
        'employee_early_departure': '🏃',
        'employee_break_exceeded': '☕',
        'unauthorized_access': '🚫',
        'kiosk_offline': '📟',
        'gps_low_battery': '🔋',
        'gps_signal_lost': '📡',
        'system_alert': '🔔'
    };
    return icons[type] || '📢';
}

function requiresAction(type) {
    const actionTypes = [
        'visitor_authorization',
        'visitor_outside_facility',
        'employee_late_arrival',
        'unauthorized_access'
    ];
    return actionTypes.includes(type);
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hs`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;

    return date.toLocaleDateString('es-AR');
}

async function getValidToken() {
    let token = localStorage.getItem('authToken') || window.authToken;
    if (!token && typeof initializeAdmin === 'function') {
        await initializeAdmin();
        token = localStorage.getItem('authToken');
    }
    return token;
}

// Exportar función principal
if (typeof window !== 'undefined') {
    window.showNotificationsContent = showNotificationsContent;
    window.updateUnreadCount = updateUnreadCount;
}
