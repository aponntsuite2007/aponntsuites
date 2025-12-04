/**
 * notification-badge-floating.js
 *
 * Globo Flotante de Notificaciones Pendientes
 *
 * Características:
 * - Floating badge discreto (bottom-left)
 * - Muestra contador de notificaciones pendientes
 * - Actualización automática cada 30 segundos
 * - Tooltip expandible con resumen
 * - Click para ir al módulo de notificaciones
 *
 * Endpoints utilizados:
 * - GET /api/inbox/pending-badge
 *
 * @version 1.0.0
 * @created 2025-12-02
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════

  const CONFIG = {
    // En producción usar URLs relativas (vacío), en desarrollo usar la URL configurada
    apiBaseURL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? (window.progressiveAdmin?.getApiUrl?.() || '')
      : '',
    endpoints: {
      pendingBadge: '/api/inbox/pending-badge'
    },
    refreshInterval: 30000, // 30 segundos
    animation: {
      fadeInDuration: 300
    }
  };

  // ═══════════════════════════════════════════════════════════
  // ESTADO GLOBAL
  // ═══════════════════════════════════════════════════════════

  let STATE = {
    isExpanded: false,
    isLoading: false,
    badgeData: null,
    refreshTimer: null,
    initialized: false
  };

  // ═══════════════════════════════════════════════════════════
  // ESTILOS CSS
  // ═══════════════════════════════════════════════════════════

  const STYLES = `
    /* ========== NOTIFICATION FLOATING BADGE ========== */

    #notification-badge-widget {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 9998;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    /* BOTÓN PRINCIPAL */
    #notification-badge-button {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      border: none;
      box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      transition: all 0.3s ease;
      position: relative;
    }

    #notification-badge-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(240, 147, 251, 0.5);
    }

    #notification-badge-button:active {
      transform: scale(0.95);
    }

    #notification-badge-button.has-notifications {
      animation: badgePulse 2s ease-in-out infinite;
    }

    @keyframes badgePulse {
      0%, 100% { box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4); }
      50% { box-shadow: 0 4px 25px rgba(240, 147, 251, 0.7); }
    }

    /* CONTADOR */
    .notification-count-bubble {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 22px;
      height: 22px;
      background: #ff3b30;
      color: white;
      font-size: 12px;
      font-weight: 700;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      box-shadow: 0 2px 8px rgba(255, 59, 48, 0.5);
      animation: countBounce 0.3s ease-out;
    }

    @keyframes countBounce {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .notification-count-bubble.hidden {
      display: none;
    }

    /* TOOLTIP EXPANDIDO */
    #notification-badge-tooltip {
      display: none;
      position: absolute;
      bottom: 60px;
      left: 0;
      min-width: 280px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      animation: tooltipFadeIn 0.2s ease-out;
    }

    #notification-badge-tooltip.visible {
      display: block;
    }

    @keyframes tooltipFadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* HEADER DEL TOOLTIP */
    .tooltip-header {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tooltip-header h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }

    .tooltip-header .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .tooltip-header .close-btn:hover {
      opacity: 1;
    }

    /* CUERPO DEL TOOLTIP */
    .tooltip-body {
      padding: 16px;
      color: #e0e0e0;
    }

    .notification-summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .notification-summary-row:last-child {
      border-bottom: none;
    }

    .summary-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .summary-label .icon {
      font-size: 16px;
    }

    .summary-value {
      font-weight: 700;
      font-size: 14px;
      padding: 3px 10px;
      border-radius: 12px;
    }

    .summary-value.pending {
      background: rgba(255, 193, 7, 0.2);
      color: #ffc107;
    }

    .summary-value.overdue {
      background: rgba(255, 59, 48, 0.2);
      color: #ff3b30;
    }

    .summary-value.unread {
      background: rgba(52, 199, 89, 0.2);
      color: #34c759;
    }

    .summary-value.escalated {
      background: rgba(255, 149, 0, 0.2);
      color: #ff9500;
    }

    /* FOOTER */
    .tooltip-footer {
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .view-all-btn {
      width: 100%;
      padding: 10px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .view-all-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);
    }

    /* ESTADO SIN NOTIFICACIONES */
    .no-notifications {
      text-align: center;
      padding: 20px;
      color: #888;
    }

    .no-notifications .icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .no-notifications p {
      margin: 0;
      font-size: 13px;
    }

    /* ESTADO OCULTO (cuando no hay notificaciones) */
    #notification-badge-widget.hidden-badge {
      display: none;
    }

    /* RESPONSIVE */
    @media (max-width: 480px) {
      #notification-badge-tooltip {
        left: 10px;
        right: 10px;
        min-width: auto;
        width: calc(100vw - 40px);
      }

      #notification-badge-widget {
        bottom: 80px; /* Evitar conflicto con navegación móvil */
      }
    }
  `;

  // ═══════════════════════════════════════════════════════════
  // FUNCIONES DE INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════

  function injectStyles() {
    if (document.getElementById('notification-badge-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'notification-badge-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  function createWidget() {
    if (document.getElementById('notification-badge-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'notification-badge-widget';
    widget.innerHTML = `
      <button id="notification-badge-button" title="Notificaciones pendientes">
        🔔
        <span class="notification-count-bubble hidden" id="notification-count">0</span>
      </button>

      <div id="notification-badge-tooltip">
        <div class="tooltip-header">
          <h4>📬 Notificaciones Pendientes</h4>
          <button class="close-btn" id="close-tooltip-btn">×</button>
        </div>
        <div class="tooltip-body" id="tooltip-body">
          <!-- Contenido dinámico -->
        </div>
        <div class="tooltip-footer">
          <button class="view-all-btn" id="view-all-notifications-btn">
            Ver todas las notificaciones →
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Event listeners
    document.getElementById('notification-badge-button').addEventListener('click', toggleTooltip);
    document.getElementById('close-tooltip-btn').addEventListener('click', closeTooltip);
    document.getElementById('view-all-notifications-btn').addEventListener('click', goToNotifications);

    // Cerrar tooltip al hacer click fuera
    document.addEventListener('click', (e) => {
      if (!widget.contains(e.target)) {
        closeTooltip();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // FUNCIONES DE UI
  // ═══════════════════════════════════════════════════════════

  function toggleTooltip(e) {
    e.stopPropagation();
    STATE.isExpanded = !STATE.isExpanded;

    const tooltip = document.getElementById('notification-badge-tooltip');
    if (STATE.isExpanded) {
      tooltip.classList.add('visible');
      fetchBadgeData(); // Actualizar al abrir
    } else {
      tooltip.classList.remove('visible');
    }
  }

  function closeTooltip() {
    STATE.isExpanded = false;
    const tooltip = document.getElementById('notification-badge-tooltip');
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
  }

  function goToNotifications() {
    closeTooltip();
    // Navegar al módulo de notificaciones
    if (typeof window.loadModule === 'function') {
      window.loadModule('notifications-complete');
    } else if (typeof window.showModule === 'function') {
      window.showModule('notifications-complete');
    } else {
      // Fallback: intentar navegar por URL
      const currentPath = window.location.pathname;
      if (currentPath.includes('panel-empresa')) {
        // Simular click en el menu item
        const menuItem = document.querySelector('[data-module="notifications-complete"], [onclick*="notifications-complete"]');
        if (menuItem) {
          menuItem.click();
        } else {
          console.log('[NOTIFICATION-BADGE] No se encontró el módulo de notificaciones');
        }
      }
    }
  }

  function updateUI() {
    const widget = document.getElementById('notification-badge-widget');
    const countBubble = document.getElementById('notification-count');
    const button = document.getElementById('notification-badge-button');
    const tooltipBody = document.getElementById('tooltip-body');

    if (!STATE.badgeData) {
      widget.classList.add('hidden-badge');
      return;
    }

    const data = STATE.badgeData;
    const totalCount = data.total_attention_required || 0;
    const hasNotifications = data.has_notifications || totalCount > 0;

    // Mostrar/ocultar widget según si hay notificaciones
    if (hasNotifications) {
      widget.classList.remove('hidden-badge');
      button.classList.add('has-notifications');
    } else {
      // Mostrar de todos modos pero sin animación
      widget.classList.remove('hidden-badge');
      button.classList.remove('has-notifications');
    }

    // Actualizar contador
    if (totalCount > 0) {
      countBubble.classList.remove('hidden');
      countBubble.textContent = totalCount > 99 ? '99+' : totalCount;
    } else {
      countBubble.classList.add('hidden');
    }

    // Actualizar tooltip
    if (hasNotifications) {
      tooltipBody.innerHTML = `
        <div class="notification-summary-row">
          <span class="summary-label">
            <span class="icon">📥</span>
            Pendientes de responder
          </span>
          <span class="summary-value pending">${data.received_pending || 0}</span>
        </div>
        <div class="notification-summary-row">
          <span class="summary-label">
            <span class="icon">⏰</span>
            Vencidas sin respuesta
          </span>
          <span class="summary-value overdue">${data.received_overdue || 0}</span>
        </div>
        <div class="notification-summary-row">
          <span class="summary-label">
            <span class="icon">✉️</span>
            Sin leer
          </span>
          <span class="summary-value unread">${data.received_unread || 0}</span>
        </div>
        <div class="notification-summary-row">
          <span class="summary-label">
            <span class="icon">📤</span>
            Enviadas esperando respuesta
          </span>
          <span class="summary-value pending">${data.sent_awaiting || 0}</span>
        </div>
        <div class="notification-summary-row">
          <span class="summary-label">
            <span class="icon">🚨</span>
            Escaladas
          </span>
          <span class="summary-value escalated">${data.escalated || 0}</span>
        </div>
      `;
    } else {
      tooltipBody.innerHTML = `
        <div class="no-notifications">
          <div class="icon">✅</div>
          <p>No tienes notificaciones pendientes</p>
        </div>
      `;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FUNCIONES DE API
  // ═══════════════════════════════════════════════════════════

  function getAuthToken() {
    // Intentar obtener token de diferentes fuentes
    const token = localStorage.getItem('token') ||
                  localStorage.getItem('jwt') ||
                  localStorage.getItem('authToken') ||
                  sessionStorage.getItem('token');
    return token;
  }

  function getEmployeeId() {
    // Intentar obtener employee_id de diferentes fuentes
    try {
      const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.employee_id || user.employeeId || user.id;
      }
    } catch (e) {
      console.warn('[NOTIFICATION-BADGE] No se pudo obtener employee_id');
    }
    return null;
  }

  function getCompanyId() {
    // Intentar obtener company_id de diferentes fuentes
    try {
      const userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.company_id || user.companyId;
      }
    } catch (e) {
      console.warn('[NOTIFICATION-BADGE] No se pudo obtener company_id');
    }
    return null;
  }

  async function fetchBadgeData() {
    if (STATE.isLoading) return;

    STATE.isLoading = true;
    const token = getAuthToken();
    const employeeId = getEmployeeId();
    const companyId = getCompanyId();

    if (!token) {
      console.log('[NOTIFICATION-BADGE] Sin token de autenticación');
      STATE.isLoading = false;
      return;
    }

    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Agregar headers de empleado/empresa si están disponibles
      if (employeeId) headers['x-employee-id'] = employeeId;
      if (companyId) headers['x-company-id'] = companyId;

      const response = await fetch(`${CONFIG.apiBaseURL}${CONFIG.endpoints.pendingBadge}`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        STATE.badgeData = result.badge;
        updateUI();
      } else {
        console.warn('[NOTIFICATION-BADGE] Error en respuesta:', result.error);
      }

    } catch (error) {
      console.error('[NOTIFICATION-BADGE] Error fetching badge data:', error.message);
    } finally {
      STATE.isLoading = false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // AUTO-REFRESH
  // ═══════════════════════════════════════════════════════════

  function startRefreshTimer() {
    if (STATE.refreshTimer) {
      clearInterval(STATE.refreshTimer);
    }

    STATE.refreshTimer = setInterval(() => {
      fetchBadgeData();
    }, CONFIG.refreshInterval);
  }

  function stopRefreshTimer() {
    if (STATE.refreshTimer) {
      clearInterval(STATE.refreshTimer);
      STATE.refreshTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════

  function init() {
    // Solo inicializar si hay un usuario logueado
    const token = getAuthToken();
    if (!token) {
      console.log('[NOTIFICATION-BADGE] Esperando login...');
      // Reintentar en 2 segundos
      setTimeout(init, 2000);
      return;
    }

    if (STATE.initialized) return;

    console.log('🔔 [NOTIFICATION-BADGE] Inicializando globo flotante de notificaciones...');

    injectStyles();
    createWidget();
    fetchBadgeData();
    startRefreshTimer();

    STATE.initialized = true;

    console.log('✅ [NOTIFICATION-BADGE] Globo flotante activo');
  }

  // ═══════════════════════════════════════════════════════════
  // EXPORT API PÚBLICA
  // ═══════════════════════════════════════════════════════════

  window.NotificationBadge = {
    init: init,
    refresh: fetchBadgeData,
    show: () => {
      const widget = document.getElementById('notification-badge-widget');
      if (widget) widget.classList.remove('hidden-badge');
    },
    hide: () => {
      const widget = document.getElementById('notification-badge-widget');
      if (widget) widget.classList.add('hidden-badge');
    },
    destroy: () => {
      stopRefreshTimer();
      const widget = document.getElementById('notification-badge-widget');
      if (widget) widget.remove();
      const styles = document.getElementById('notification-badge-styles');
      if (styles) styles.remove();
      STATE.initialized = false;
    }
  };

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(init, 1000); // Esperar un poco por el login
    });
  } else {
    setTimeout(init, 1000);
  }

})();
