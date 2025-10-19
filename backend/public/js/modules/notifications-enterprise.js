/**
 * NOTIFICATIONS ENTERPRISE V3.0 MODULE
 * Sistema de Notificaciones Enterprise con Workflows y Multi-Canal
 *
 * Características:
 * - UI moderna y profesional
 * - Workflows visuales con aprobaciones
 * - Countdown de deadlines
 * - Filtros inteligentes
 * - Dashboard con estadísticas
 * - Animaciones suaves
 * - Responsive design
 *
 * @version 3.0
 * @date 2025-10-19
 */

const NotificationsEnterprise = {
  currentView: 'dashboard', // dashboard | list | detail
  notifications: [],
  stats: {},
  filters: {
    module: 'all',
    priority: 'all',
    category: 'all',
    requires_action: null,
    unread_only: false
  },
  selectedNotification: null,
  refreshInterval: null,

  // ========== INICIALIZACIÓN ==========

  init() {
    console.log('🔔 [ENTERPRISE] Iniciando Notifications Enterprise V3.0...');
    this.injectStyles();
    this.renderDashboard();
    this.loadDashboardData();
    this.startAutoRefresh();
  },

  // ========== ESTILOS PROFESIONALES ==========

  injectStyles() {
    const existingStyle = document.getElementById('notifications-enterprise-styles');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'notifications-enterprise-styles';
    style.textContent = `
      /* ========== LAYOUT PRINCIPAL ========== */
      .notifications-enterprise {
        padding: 30px;
        max-width: 1600px;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        min-height: 100vh;
      }

      /* ========== HEADER ========== */
      .ne-header {
        background: white;
        border-radius: 16px;
        padding: 25px 30px;
        margin-bottom: 30px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: slideDown 0.4s ease;
      }

      .ne-header-left h1 {
        margin: 0 0 5px 0;
        font-size: 32px;
        font-weight: 700;
        color: #1a1a2e;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ne-header-left p {
        margin: 0;
        color: #6c757d;
        font-size: 14px;
      }

      .ne-header-actions {
        display: flex;
        gap: 12px;
      }

      .ne-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .ne-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .ne-btn:active {
        transform: translateY(0);
      }

      .ne-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .ne-btn-secondary {
        background: white;
        color: #495057;
        border: 2px solid #e9ecef;
      }

      .ne-btn-success {
        background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
        color: white;
      }

      .ne-btn-danger {
        background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
        color: white;
      }

      /* ========== DASHBOARD STATS ========== */
      .ne-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }

      .ne-stat-card {
        background: white;
        border-radius: 16px;
        padding: 25px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        position: relative;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        animation: fadeInUp 0.5s ease;
      }

      .ne-stat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      }

      .ne-stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: var(--card-color, #667eea);
      }

      .ne-stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .ne-stat-title {
        font-size: 14px;
        font-weight: 600;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ne-stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        background: var(--card-color-light, #f0f3ff);
        color: var(--card-color, #667eea);
      }

      .ne-stat-value {
        font-size: 42px;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 5px;
      }

      .ne-stat-subtitle {
        font-size: 13px;
        color: #6c757d;
      }

      /* ========== FILTROS ========== */
      .ne-filters {
        background: white;
        border-radius: 16px;
        padding: 20px 25px;
        margin-bottom: 25px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        animation: fadeIn 0.4s ease;
      }

      .ne-filters-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 15px;
        color: #1a1a2e;
      }

      .ne-filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }

      .ne-filter-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .ne-filter-label {
        font-size: 13px;
        font-weight: 600;
        color: #495057;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .ne-filter-select {
        padding: 10px 15px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .ne-filter-select:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .ne-filter-checkbox {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        cursor: pointer;
      }

      .ne-filter-checkbox input {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }

      /* ========== LISTA DE NOTIFICACIONES ========== */
      .ne-notifications-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .ne-notification-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
        animation: fadeInUp 0.4s ease;
        border-left: 4px solid var(--notification-color, #667eea);
      }

      .ne-notification-card:hover {
        transform: translateX(4px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      .ne-notification-card.unread {
        background: linear-gradient(90deg, #fffbf0 0%, white 20%);
        border-left-color: #ffc107;
      }

      .ne-notification-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .ne-notification-title {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a2e;
        margin-bottom: 5px;
      }

      .ne-notification-meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .ne-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .ne-badge-urgent {
        background: #dc3545;
        color: white;
        animation: pulse 2s infinite;
      }

      .ne-badge-high {
        background: #fd7e14;
        color: white;
      }

      .ne-badge-medium {
        background: #ffc107;
        color: #333;
      }

      .ne-badge-normal {
        background: #17a2b8;
        color: white;
      }

      .ne-badge-module {
        background: #e9ecef;
        color: #495057;
      }

      .ne-notification-message {
        color: #495057;
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 15px;
        white-space: pre-line;
      }

      .ne-notification-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 15px;
        border-top: 1px solid #f0f0f0;
      }

      .ne-notification-time {
        font-size: 13px;
        color: #6c757d;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .ne-notification-actions {
        display: flex;
        gap: 8px;
      }

      .ne-btn-sm {
        padding: 8px 16px;
        font-size: 13px;
        border-radius: 8px;
      }

      /* ========== DEADLINE COUNTDOWN ========== */
      .ne-deadline {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
      }

      .ne-deadline-critical {
        background: #fff5f5;
        color: #dc3545;
        border: 2px solid #dc3545;
        animation: blink 1.5s infinite;
      }

      .ne-deadline-high {
        background: #fff3e0;
        color: #fd7e14;
        border: 2px solid #fd7e14;
      }

      .ne-deadline-medium {
        background: #fffbf0;
        color: #ffc107;
        border: 2px solid #ffc107;
      }

      .ne-deadline-normal {
        background: #f0f8ff;
        color: #17a2b8;
        border: 2px solid #17a2b8;
      }

      /* ========== MODAL DE DETALLE ========== */
      .ne-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
      }

      .ne-modal-content {
        background: white;
        border-radius: 20px;
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.4s ease;
      }

      .ne-modal-header {
        padding: 30px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .ne-modal-title {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 10px;
      }

      .ne-modal-close {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #f8f9fa;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: #6c757d;
        transition: all 0.2s ease;
      }

      .ne-modal-close:hover {
        background: #e9ecef;
        transform: rotate(90deg);
      }

      .ne-modal-body {
        padding: 30px;
      }

      .ne-detail-section {
        margin-bottom: 25px;
      }

      .ne-detail-label {
        font-size: 13px;
        font-weight: 600;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .ne-detail-value {
        font-size: 15px;
        color: #1a1a2e;
        line-height: 1.6;
      }

      .ne-actions-log {
        margin-top: 30px;
        padding-top: 30px;
        border-top: 2px solid #f0f0f0;
      }

      .ne-actions-log-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 20px;
        color: #1a1a2e;
      }

      .ne-action-item {
        padding: 15px;
        background: #f8f9fa;
        border-radius: 10px;
        margin-bottom: 12px;
        border-left: 3px solid var(--action-color, #667eea);
      }

      .ne-action-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .ne-action-type {
        font-weight: 600;
        color: #1a1a2e;
        text-transform: uppercase;
        font-size: 13px;
      }

      .ne-action-time {
        font-size: 12px;
        color: #6c757d;
      }

      .ne-action-notes {
        font-size: 14px;
        color: #495057;
        margin-top: 8px;
      }

      /* ========== RESPUESTA MODAL ========== */
      .ne-response-form {
        margin-top: 20px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 12px;
      }

      .ne-response-textarea {
        width: 100%;
        padding: 15px;
        border: 2px solid #e9ecef;
        border-radius: 10px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        min-height: 100px;
        transition: all 0.2s ease;
      }

      .ne-response-textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .ne-modal-footer {
        padding: 20px 30px;
        border-top: 1px solid #e9ecef;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      /* ========== LOADING ========== */
      .ne-loading {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 20px;
      }

      .ne-spinner {
        width: 60px;
        height: 60px;
        border: 4px solid #f0f0f0;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      /* ========== EMPTY STATE ========== */
      .ne-empty {
        text-align: center;
        padding: 80px 20px;
        color: #6c757d;
      }

      .ne-empty i {
        font-size: 80px;
        margin-bottom: 20px;
        opacity: 0.3;
      }

      .ne-empty h3 {
        font-size: 24px;
        margin-bottom: 10px;
      }

      .ne-empty p {
        font-size: 16px;
      }

      /* ========== ANIMACIONES ========== */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(40px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* ========== RESPONSIVE ========== */
      @media (max-width: 768px) {
        .ne-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 20px;
        }

        .ne-stats-grid {
          grid-template-columns: 1fr;
        }

        .ne-filters-grid {
          grid-template-columns: 1fr;
        }

        .ne-notification-footer {
          flex-direction: column;
          align-items: flex-start;
          gap: 15px;
        }

        .ne-modal-content {
          max-height: 100vh;
          border-radius: 0;
        }
      }
    `;
    document.head.appendChild(style);
  },

  // ========== RENDER DASHBOARD ==========

  renderDashboard() {
    const container = document.getElementById('mainContent');
    container.innerHTML = `
      <div class="notifications-enterprise">
        <!-- Header -->
        <div class="ne-header">
          <div class="ne-header-left">
            <h1>
              <i class="fas fa-bell" style="color: #667eea;"></i>
              Notificaciones Enterprise V3.0
            </h1>
            <p>Sistema de notificaciones con workflows y aprobaciones multi-nivel</p>
          </div>
          <div class="ne-header-actions">
            <button class="ne-btn ne-btn-secondary" onclick="NotificationsEnterprise.toggleView('list')">
              <i class="fas fa-list"></i> Ver Lista
            </button>
            <button class="ne-btn ne-btn-primary" onclick="NotificationsEnterprise.refreshAll()">
              <i class="fas fa-sync"></i> Actualizar
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div id="neLoading" class="ne-loading" style="display: none;">
          <div class="ne-spinner"></div>
          <p style="color: #6c757d; font-weight: 600;">Cargando...</p>
        </div>

        <!-- Content Container -->
        <div id="neContent">
          <!-- Aquí se renderiza el contenido dinámico -->
        </div>
      </div>
    `;
  },

  // ========== CARGAR DASHBOARD DATA ==========

  async loadDashboardData() {
    try {
      this.showLoading();

      const token = localStorage.getItem('authToken');
      if (!token) {
        this.showError('No se encontró token de autenticación');
        return;
      }

      const response = await fetch('/api/v1/enterprise/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al cargar estadísticas');

      const data = await response.json();
      this.stats = data.data || {};

      this.renderDashboardStats();

    } catch (error) {
      console.error('[loadDashboardData] Error:', error);
      this.showError('Error al cargar el dashboard: ' + error.message);
    } finally {
      this.hideLoading();
    }
  },

  // ========== RENDER DASHBOARD STATS ==========

  renderDashboardStats() {
    const content = document.getElementById('neContent');

    // Stats cards configuration
    const statsCards = [
      {
        title: 'Total',
        value: this.stats.total || 0,
        subtitle: 'Total de notificaciones',
        icon: 'fa-bell',
        color: '#667eea',
        colorLight: '#f0f3ff',
        onClick: () => this.showAllNotifications()
      },
      {
        title: 'No Leídas',
        value: this.stats.unread || 0,
        subtitle: 'Pendientes de lectura',
        icon: 'fa-envelope',
        color: '#ffc107',
        colorLight: '#fffbf0',
        onClick: () => this.showUnreadNotifications()
      },
      {
        title: 'Requieren Acción',
        value: this.stats.pending_actions || 0,
        subtitle: 'Aprobaciones pendientes',
        icon: 'fa-tasks',
        color: '#fd7e14',
        colorLight: '#fff3e0',
        onClick: () => this.showPendingActions()
      },
      {
        title: 'Urgentes',
        value: this.stats.urgent || 0,
        subtitle: 'Prioridad urgente',
        icon: 'fa-exclamation-triangle',
        color: '#dc3545',
        colorLight: '#fff5f5',
        onClick: () => this.showUrgentNotifications()
      }
    ];

    let html = `
      <div class="ne-stats-grid">
        ${statsCards.map(card => `
          <div class="ne-stat-card"
               style="--card-color: ${card.color}; --card-color-light: ${card.colorLight}"
               onclick="NotificationsEnterprise.${card.onClick.name}()">
            <div class="ne-stat-header">
              <div class="ne-stat-title">${card.title}</div>
              <div class="ne-stat-icon">
                <i class="fas ${card.icon}"></i>
              </div>
            </div>
            <div class="ne-stat-value">${card.value}</div>
            <div class="ne-stat-subtitle">${card.subtitle}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Recent notifications
    html += `
      <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #1a1a2e;">
            <i class="fas fa-history" style="color: #667eea; margin-right: 10px;"></i>
            Actividad Reciente
          </h2>
          <button class="ne-btn ne-btn-secondary ne-btn-sm" onclick="NotificationsEnterprise.showAllNotifications()">
            Ver Todas
          </button>
        </div>
        <div id="neRecentNotifications">
          <div style="text-align: center; padding: 40px; color: #6c757d;">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 15px;"></i>
            <p>Cargando notificaciones recientes...</p>
          </div>
        </div>
      </div>
    `;

    content.innerHTML = html;

    // Load recent notifications
    this.loadRecentNotifications();
  },

  // ========== CARGAR NOTIFICACIONES RECIENTES ==========

  async loadRecentNotifications() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v1/enterprise/notifications?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al cargar notificaciones');

      const data = await response.json();
      this.notifications = data.data || [];

      this.renderRecentNotifications();

    } catch (error) {
      console.error('[loadRecentNotifications] Error:', error);
      document.getElementById('neRecentNotifications').innerHTML = `
        <div class="ne-empty">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error al cargar notificaciones</p>
        </div>
      `;
    }
  },

  // ========== RENDER NOTIFICACIONES RECIENTES ==========

  renderRecentNotifications() {
    const container = document.getElementById('neRecentNotifications');

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="ne-empty">
          <i class="fas fa-inbox"></i>
          <h3>Sin notificaciones</h3>
          <p>No tienes notificaciones en este momento</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="ne-notifications-list">
        ${this.notifications.map(n => this.renderNotificationCard(n)).join('')}
      </div>
    `;
  },

  // ========== RENDER CARD DE NOTIFICACIÓN ==========

  renderNotificationCard(notification) {
    const priorityColor = this.getPriorityColor(notification.priority);
    const moduleIcon = this.getModuleIcon(notification.module);
    const deadlineHtml = this.renderDeadline(notification);

    return `
      <div class="ne-notification-card ${!notification.is_read ? 'unread' : ''}"
           style="--notification-color: ${priorityColor}"
           onclick="NotificationsEnterprise.showDetail(${notification.id})">
        <div class="ne-notification-header">
          <div style="flex: 1;">
            <div class="ne-notification-title">${notification.title}</div>
            <div class="ne-notification-meta">
              <span class="ne-badge ne-badge-${notification.priority}">
                <i class="fas fa-flag"></i> ${notification.priority.toUpperCase()}
              </span>
              <span class="ne-badge ne-badge-module">
                <i class="${moduleIcon}"></i> ${this.translateModule(notification.module)}
              </span>
              ${!notification.is_read ? '<span class="ne-badge" style="background: #ffc107; color: #333;"><i class="fas fa-circle"></i> NO LEÍDA</span>' : ''}
            </div>
          </div>
          ${deadlineHtml}
        </div>

        <div class="ne-notification-message">
          ${notification.short_message || notification.message}
        </div>

        <div class="ne-notification-footer">
          <div class="ne-notification-time">
            <i class="fas fa-clock"></i>
            ${this.formatTimeAgo(notification.created_at)}
          </div>
          ${notification.requires_action && notification.action_status === 'pending' ? `
            <div class="ne-notification-actions" onclick="event.stopPropagation();">
              <button class="ne-btn ne-btn-success ne-btn-sm"
                      onclick="NotificationsEnterprise.approveNotification(${notification.id})">
                <i class="fas fa-check"></i> Aprobar
              </button>
              <button class="ne-btn ne-btn-danger ne-btn-sm"
                      onclick="NotificationsEnterprise.rejectNotification(${notification.id})">
                <i class="fas fa-times"></i> Rechazar
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  // ========== RENDER DEADLINE ==========

  renderDeadline(notification) {
    if (!notification.deadline_info || !notification.deadline_info.deadline) {
      return '';
    }

    const info = notification.deadline_info;
    const urgencyClass = `ne-deadline-${info.urgency}`;

    let timeText = '';
    if (info.is_overdue) {
      timeText = '⚠️ VENCIDO';
    } else if (info.hours_remaining < 24) {
      timeText = `${info.hours_remaining}h restantes`;
    } else {
      timeText = `${info.days_remaining}d restantes`;
    }

    return `
      <div class="ne-deadline ${urgencyClass}">
        <i class="fas fa-hourglass-half"></i>
        ${timeText}
      </div>
    `;
  },

  // ========== MOSTRAR DETALLE ==========

  async showDetail(notificationId) {
    try {
      this.showLoading();

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/enterprise/notifications/${notificationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al cargar detalle');

      const data = await response.json();
      this.selectedNotification = data.data;

      // Marcar como leída automáticamente
      if (!this.selectedNotification.is_read) {
        this.markAsRead(notificationId);
      }

      this.renderDetailModal();

    } catch (error) {
      console.error('[showDetail] Error:', error);
      this.showError('Error al cargar el detalle');
    } finally {
      this.hideLoading();
    }
  },

  // ========== RENDER MODAL DE DETALLE ==========

  renderDetailModal() {
    const n = this.selectedNotification;
    const priorityColor = this.getPriorityColor(n.priority);

    const modalHtml = `
      <div class="ne-modal" onclick="if(event.target === this) NotificationsEnterprise.closeModal()">
        <div class="ne-modal-content">
          <div class="ne-modal-header">
            <div style="flex: 1;">
              <div class="ne-modal-title">${n.title}</div>
              <div style="display: flex; gap: 10px; margin-top: 10px;">
                <span class="ne-badge ne-badge-${n.priority}">
                  <i class="fas fa-flag"></i> ${n.priority.toUpperCase()}
                </span>
                <span class="ne-badge ne-badge-module">
                  <i class="${this.getModuleIcon(n.module)}"></i> ${this.translateModule(n.module)}
                </span>
                ${n.requires_action ? '<span class="ne-badge" style="background: #17a2b8; color: white;"><i class="fas fa-hand-point-up"></i> REQUIERE ACCIÓN</span>' : ''}
              </div>
            </div>
            <button class="ne-modal-close" onclick="NotificationsEnterprise.closeModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="ne-modal-body">
            <!-- Mensaje completo -->
            <div class="ne-detail-section">
              <div class="ne-detail-label">Mensaje</div>
              <div class="ne-detail-value" style="white-space: pre-line;">${n.message}</div>
            </div>

            <!-- Información adicional -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
              <div class="ne-detail-section">
                <div class="ne-detail-label">Creada</div>
                <div class="ne-detail-value">${this.formatDateTime(n.created_at)}</div>
              </div>
              ${n.action_deadline ? `
                <div class="ne-detail-section">
                  <div class="ne-detail-label">Plazo Límite</div>
                  <div class="ne-detail-value" style="color: ${n.deadline_info?.is_overdue ? '#dc3545' : '#1a1a2e'};">
                    ${this.formatDateTime(n.action_deadline)}
                    ${n.deadline_info?.is_overdue ? ' <span style="color: #dc3545; font-weight: 600;">(VENCIDO)</span>' : ''}
                  </div>
                </div>
              ` : ''}
              ${n.related_user ? `
                <div class="ne-detail-section">
                  <div class="ne-detail-label">Usuario Relacionado</div>
                  <div class="ne-detail-value">${n.related_user.name}</div>
                </div>
              ` : ''}
            </div>

            <!-- Formulario de respuesta si requiere acción -->
            ${n.requires_action && n.action_status === 'pending' ? `
              <div class="ne-response-form">
                <div class="ne-detail-label" style="margin-bottom: 10px;">Respuesta / Notas</div>
                <textarea id="neResponseText" class="ne-response-textarea"
                          placeholder="Ingrese sus comentarios o notas sobre esta decisión..."></textarea>
              </div>
            ` : ''}

            <!-- Historial de acciones (si existe) -->
            <div class="ne-actions-log">
              <div class="ne-actions-log-title">
                <i class="fas fa-history"></i> Historial de Acciones
              </div>
              <div id="neActionsHistory">
                <div style="text-align: center; padding: 20px; color: #6c757d;">
                  <i class="fas fa-spinner fa-spin"></i> Cargando historial...
                </div>
              </div>
            </div>
          </div>

          ${n.requires_action && n.action_status === 'pending' ? `
            <div class="ne-modal-footer">
              <button class="ne-btn ne-btn-secondary" onclick="NotificationsEnterprise.closeModal()">
                <i class="fas fa-times"></i> Cerrar
              </button>
              <button class="ne-btn ne-btn-danger" onclick="NotificationsEnterprise.rejectFromModal()">
                <i class="fas fa-times-circle"></i> Rechazar
              </button>
              <button class="ne-btn ne-btn-success" onclick="NotificationsEnterprise.approveFromModal()">
                <i class="fas fa-check-circle"></i> Aprobar
              </button>
            </div>
          ` : `
            <div class="ne-modal-footer">
              <button class="ne-btn ne-btn-primary" onclick="NotificationsEnterprise.closeModal()">
                <i class="fas fa-check"></i> Cerrar
              </button>
            </div>
          `}
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Cargar historial de acciones
    this.loadActionsHistory(n.id);
  },

  // ========== CARGAR HISTORIAL DE ACCIONES ==========

  async loadActionsHistory(notificationId) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/enterprise/notifications/${notificationId}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al cargar historial');

      const data = await response.json();
      const history = data.data || [];

      this.renderActionsHistory(history);

    } catch (error) {
      console.error('[loadActionsHistory] Error:', error);
      document.getElementById('neActionsHistory').innerHTML = `
        <div style="text-align: center; padding: 20px; color: #dc3545;">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error al cargar el historial</p>
        </div>
      `;
    }
  },

  // ========== RENDER HISTORIAL DE ACCIONES ==========

  renderActionsHistory(history) {
    const container = document.getElementById('neActionsHistory');

    if (history.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #6c757d;">
          <i class="fas fa-info-circle"></i>
          <p>No hay acciones registradas todavía</p>
        </div>
      `;
      return;
    }

    container.innerHTML = history.map(action => {
      const actionColor = this.getActionColor(action.action);
      return `
        <div class="ne-action-item" style="--action-color: ${actionColor}">
          <div class="ne-action-header">
            <div class="ne-action-type">
              <i class="${this.getActionIcon(action.action)}"></i>
              ${this.translateAction(action.action)}
            </div>
            <div class="ne-action-time">${this.formatDateTime(action.created_at)}</div>
          </div>
          ${action.notes ? `<div class="ne-action-notes">${action.notes}</div>` : ''}
          ${action.previous_status && action.new_status ? `
            <div style="font-size: 12px; color: #6c757d; margin-top: 8px;">
              Estado: <strong>${action.previous_status}</strong> → <strong>${action.new_status}</strong>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  // ========== APROBAR NOTIFICACIÓN ==========

  async approveNotification(notificationId) {
    if (!confirm('¿Está seguro de que desea aprobar esta solicitud?')) return;

    try {
      this.showLoading();

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/enterprise/notifications/${notificationId}/action`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve',
          response: 'Aprobado',
          metadata: {}
        })
      });

      if (!response.ok) throw new Error('Error al aprobar');

      const data = await response.json();

      alert('✅ Notificación aprobada exitosamente');
      this.refreshAll();

    } catch (error) {
      console.error('[approveNotification] Error:', error);
      this.showError('Error al aprobar: ' + error.message);
    } finally {
      this.hideLoading();
    }
  },

  // ========== RECHAZAR NOTIFICACIÓN ==========

  async rejectNotification(notificationId) {
    const reason = prompt('Ingrese el motivo del rechazo:');
    if (!reason) return;

    try {
      this.showLoading();

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/enterprise/notifications/${notificationId}/action`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reject',
          response: reason,
          metadata: {}
        })
      });

      if (!response.ok) throw new Error('Error al rechazar');

      const data = await response.json();

      alert('❌ Notificación rechazada');
      this.refreshAll();

    } catch (error) {
      console.error('[rejectNotification] Error:', error);
      this.showError('Error al rechazar: ' + error.message);
    } finally {
      this.hideLoading();
    }
  },

  // ========== APROBAR DESDE MODAL ==========

  async approveFromModal() {
    const response = document.getElementById('neResponseText')?.value || 'Aprobado';
    const notificationId = this.selectedNotification.id;

    try {
      this.closeModal();
      this.showLoading();

      const token = localStorage.getItem('authToken');
      const result = await fetch(`/api/v1/enterprise/notifications/${notificationId}/action`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve',
          response: response,
          metadata: {}
        })
      });

      if (!result.ok) throw new Error('Error al aprobar');

      alert('✅ Notificación aprobada exitosamente');
      this.refreshAll();

    } catch (error) {
      console.error('[approveFromModal] Error:', error);
      this.showError('Error al aprobar: ' + error.message);
    } finally {
      this.hideLoading();
    }
  },

  // ========== RECHAZAR DESDE MODAL ==========

  async rejectFromModal() {
    const response = document.getElementById('neResponseText')?.value || '';

    if (!response.trim()) {
      alert('Por favor ingrese un motivo para el rechazo');
      return;
    }

    const notificationId = this.selectedNotification.id;

    try {
      this.closeModal();
      this.showLoading();

      const token = localStorage.getItem('authToken');
      const result = await fetch(`/api/v1/enterprise/notifications/${notificationId}/action`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reject',
          response: response,
          metadata: {}
        })
      });

      if (!result.ok) throw new Error('Error al rechazar');

      alert('❌ Notificación rechazada');
      this.refreshAll();

    } catch (error) {
      console.error('[rejectFromModal] Error:', error);
      this.showError('Error al rechazar: ' + error.message);
    } finally {
      this.hideLoading();
    }
  },

  // ========== MARCAR COMO LEÍDA ==========

  async markAsRead(notificationId) {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/v1/enterprise/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('[markAsRead] Error:', error);
    }
  },

  // ========== NAVEGACIÓN ==========

  showAllNotifications() {
    this.filters = {
      module: 'all',
      priority: 'all',
      category: 'all',
      requires_action: null,
      unread_only: false
    };
    this.toggleView('list');
  },

  showUnreadNotifications() {
    this.filters = {
      ...this.filters,
      unread_only: true
    };
    this.toggleView('list');
  },

  showPendingActions() {
    this.filters = {
      ...this.filters,
      requires_action: true
    };
    this.toggleView('list');
  },

  showUrgentNotifications() {
    this.filters = {
      ...this.filters,
      priority: 'urgent'
    };
    this.toggleView('list');
  },

  toggleView(view) {
    this.currentView = view;
    if (view === 'dashboard') {
      this.renderDashboard();
      this.loadDashboardData();
    } else if (view === 'list') {
      // Implementar vista de lista completa con filtros
      this.renderListView();
    }
  },

  renderListView() {
    // TODO: Implementar vista de lista completa con filtros
    alert('Vista de lista completa - Próximamente');
  },

  // ========== HELPERS ==========

  closeModal() {
    const modal = document.querySelector('.ne-modal');
    if (modal) modal.remove();
  },

  refreshAll() {
    if (this.currentView === 'dashboard') {
      this.loadDashboardData();
    }
  },

  startAutoRefresh() {
    // Auto-refresh cada 30 segundos
    this.refreshInterval = setInterval(() => {
      if (this.currentView === 'dashboard') {
        this.loadDashboardData();
      }
    }, 30000);
  },

  showLoading() {
    const loading = document.getElementById('neLoading');
    if (loading) loading.style.display = 'flex';
  },

  hideLoading() {
    const loading = document.getElementById('neLoading');
    if (loading) loading.style.display = 'none';
  },

  showError(message) {
    alert('❌ ' + message);
  },

  getPriorityColor(priority) {
    const colors = {
      urgent: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      normal: '#17a2b8',
      low: '#6c757d'
    };
    return colors[priority] || colors.normal;
  },

  getModuleIcon(module) {
    const icons = {
      attendance: 'fa-clock',
      medical: 'fa-heartbeat',
      vacation: 'fa-umbrella-beach',
      legal: 'fa-gavel',
      general: 'fa-bell'
    };
    return icons[module] || icons.general;
  },

  translateModule(module) {
    const translations = {
      attendance: 'Asistencia',
      medical: 'Médico',
      vacation: 'Vacaciones',
      legal: 'Legal',
      general: 'General'
    };
    return translations[module] || module;
  },

  translateAction(action) {
    const translations = {
      created: 'Creada',
      approve: 'Aprobada',
      reject: 'Rechazada',
      escalate: 'Escalada',
      read: 'Leída',
      completed: 'Completada'
    };
    return translations[action] || action;
  },

  getActionIcon(action) {
    const icons = {
      created: 'fa-plus-circle',
      approve: 'fa-check-circle',
      reject: 'fa-times-circle',
      escalate: 'fa-arrow-up',
      read: 'fa-eye',
      completed: 'fa-flag-checkered'
    };
    return 'fas ' + (icons[action] || 'fa-circle');
  },

  getActionColor(action) {
    const colors = {
      created: '#667eea',
      approve: '#56ab2f',
      reject: '#eb3349',
      escalate: '#fd7e14',
      read: '#17a2b8',
      completed: '#6c757d'
    };
    return colors[action] || '#6c757d';
  },

  formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;

    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// ========== EXPORTAR ==========

window.NotificationsEnterprise = NotificationsEnterprise;

// Función wrapper para panel-empresa.html
function showNotificationsEnterpriseContent() {
  console.log('🔄 [MODULE] Ejecutando showNotificationsEnterpriseContent()');
  NotificationsEnterprise.init();
}

window.showNotificationsEnterpriseContent = showNotificationsEnterpriseContent;
