/**
 * ============================================================================
 * USER SUPPORT DASHBOARD - Dashboard de Soporte para Usuarios
 * ============================================================================
 *
 * Dashboard profesional con DARK THEME para que usuarios:
 * - Vean sus tickets de soporte
 * - Creen nuevos tickets
 * - Vean tickets escalados desde el Asistente IA
 * - Chateen con soporte
 *
 * DARK THEME DESIGN - Consistente con el resto del sistema
 *
 * @version 1.0.0
 * @date 2025-01-30
 * ============================================================================
 */

console.log('🎫 [USER-SUPPORT] User Support Dashboard v1.0.0 loaded');

// Evitar redeclaración de la clase si el módulo se carga múltiples veces
if (typeof window.UserSupportDashboard !== 'undefined') {
    console.log('🎫 [USER-SUPPORT] Clase ya existe, saltando');
} else {

class UserSupportDashboard {
  constructor() {
    this.container = null;
    this.tickets = [];
    this.currentTicket = null;
    this.messages = [];
    this.modules = [];
    this.stats = { total: 0, open: 0, resolved: 0, aiEscalated: 0 };
    this.currentView = 'list'; // 'list', 'detail', 'create'
    this.filters = { status: 'all', priority: 'all' };

    // Dark Theme Colors (mismo que support-brain-dashboard.js)
    this.colors = {
      bgPrimary: '#0d1117',
      bgSecondary: '#161b22',
      bgTertiary: '#21262d',
      bgCard: '#1c2128',
      border: '#30363d',
      borderLight: '#484f58',
      textPrimary: '#e6edf3',
      textSecondary: '#8b949e',
      textMuted: '#6e7681',
      accentBlue: '#58a6ff',
      accentGreen: '#3fb950',
      accentPurple: '#a371f7',
      accentOrange: '#d29922',
      accentRed: '#f85149',
      accentCyan: '#39c5cf'
    };

    // Status colors
    this.statusColors = {
      'open': this.colors.accentBlue,
      'in_progress': this.colors.accentOrange,
      'waiting_customer': this.colors.accentPurple,
      'resolved': this.colors.accentGreen,
      'closed': this.colors.textMuted
    };

    // Priority colors
    this.priorityColors = {
      'low': this.colors.textMuted,
      'medium': this.colors.accentBlue,
      'high': this.colors.accentOrange,
      'urgent': this.colors.accentRed
    };
  }

  /**
   * Initialize the dashboard
   */
  async init(containerId) {
    console.log('🎫 [USER-SUPPORT] Initializing...');
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('[USER-SUPPORT] Container not found:', containerId);
      return;
    }

    this.injectStyles();
    await this.loadData();
    this.render();
    console.log('✅ [USER-SUPPORT] Initialized successfully');
  }

  /**
   * Get auth token
   */
  getAuthToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
  }

  /**
   * Inject styles
   */
  injectStyles() {
    if (document.getElementById('user-support-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'user-support-styles';
    styles.textContent = `
      /* ============================================ */
      /* USER SUPPORT DASHBOARD - DARK THEME         */
      /* ============================================ */

      .usd-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: ${this.colors.bgPrimary};
        color: ${this.colors.textPrimary};
        min-height: 100%;
        padding: 24px;
      }

      .usd-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid ${this.colors.border};
      }

      .usd-header-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .usd-header-title h1 {
        font-size: 24px;
        font-weight: 600;
        margin: 0;
        background: linear-gradient(135deg, ${this.colors.accentBlue}, ${this.colors.accentPurple});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .usd-header-actions {
        display: flex;
        gap: 12px;
      }

      /* Stats Grid */
      .usd-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .usd-stat-card {
        background: ${this.colors.bgSecondary};
        border: 1px solid ${this.colors.border};
        border-radius: 12px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        transition: all 0.2s ease;
      }

      .usd-stat-card:hover {
        border-color: ${this.colors.borderLight};
        transform: translateY(-2px);
      }

      .usd-stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        margin-bottom: 12px;
      }

      .usd-stat-value {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .usd-stat-label {
        font-size: 13px;
        color: ${this.colors.textSecondary};
      }

      /* Cards */
      .usd-card {
        background: ${this.colors.bgSecondary};
        border: 1px solid ${this.colors.border};
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .usd-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .usd-card-title {
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Filters */
      .usd-filters {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }

      .usd-filter-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .usd-filter-label {
        font-size: 13px;
        color: ${this.colors.textSecondary};
      }

      .usd-select {
        padding: 8px 12px;
        background: ${this.colors.bgTertiary};
        border: 1px solid ${this.colors.border};
        border-radius: 8px;
        color: ${this.colors.textPrimary};
        font-size: 13px;
        cursor: pointer;
      }

      .usd-select:focus {
        outline: none;
        border-color: ${this.colors.accentBlue};
      }

      /* Ticket List */
      .usd-ticket-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .usd-ticket-item {
        background: ${this.colors.bgTertiary};
        border: 1px solid ${this.colors.border};
        border-radius: 10px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 16px;
        align-items: center;
      }

      .usd-ticket-item:hover {
        border-color: ${this.colors.accentBlue};
        transform: translateX(4px);
      }

      .usd-ticket-item.ai-escalated {
        border-left: 3px solid ${this.colors.accentPurple};
      }

      .usd-ticket-number {
        font-family: monospace;
        font-size: 12px;
        color: ${this.colors.textMuted};
        background: ${this.colors.bgSecondary};
        padding: 4px 8px;
        border-radius: 4px;
      }

      .usd-ticket-content {
        flex: 1;
        min-width: 0;
      }

      .usd-ticket-subject {
        font-weight: 500;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .usd-ticket-meta {
        font-size: 12px;
        color: ${this.colors.textMuted};
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .usd-ticket-badges {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      /* Badges */
      .usd-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
      }

      .usd-badge-ai {
        background: ${this.colors.accentPurple}20;
        color: ${this.colors.accentPurple};
      }

      /* Buttons */
      .usd-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .usd-btn-primary {
        background: linear-gradient(135deg, ${this.colors.accentBlue}, ${this.colors.accentPurple});
        color: white;
      }

      .usd-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px ${this.colors.accentBlue}40;
      }

      .usd-btn-secondary {
        background: ${this.colors.bgTertiary};
        border: 1px solid ${this.colors.border};
        color: ${this.colors.textPrimary};
      }

      .usd-btn-secondary:hover {
        border-color: ${this.colors.borderLight};
        background: ${this.colors.bgSecondary};
      }

      .usd-btn-success {
        background: ${this.colors.accentGreen};
        color: white;
      }

      .usd-btn-danger {
        background: ${this.colors.accentRed};
        color: white;
      }

      /* Empty State */
      .usd-empty {
        text-align: center;
        padding: 60px 20px;
        color: ${this.colors.textMuted};
      }

      .usd-empty-icon {
        font-size: 64px;
        margin-bottom: 20px;
        opacity: 0.5;
      }

      .usd-empty-title {
        font-size: 18px;
        font-weight: 500;
        color: ${this.colors.textSecondary};
        margin-bottom: 8px;
      }

      .usd-empty-text {
        font-size: 14px;
        margin-bottom: 20px;
      }

      /* Form */
      .usd-form-group {
        margin-bottom: 20px;
      }

      .usd-form-label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
        color: ${this.colors.textSecondary};
      }

      .usd-form-input,
      .usd-form-textarea,
      .usd-form-select {
        width: 100%;
        padding: 12px 16px;
        background: ${this.colors.bgTertiary};
        border: 1px solid ${this.colors.border};
        border-radius: 8px;
        color: ${this.colors.textPrimary};
        font-size: 14px;
        font-family: inherit;
      }

      .usd-form-input:focus,
      .usd-form-textarea:focus,
      .usd-form-select:focus {
        outline: none;
        border-color: ${this.colors.accentBlue};
        box-shadow: 0 0 0 3px ${this.colors.accentBlue}20;
      }

      .usd-form-textarea {
        resize: vertical;
        min-height: 120px;
      }

      /* Ticket Detail */
      .usd-detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;
        padding-bottom: 20px;
        border-bottom: 1px solid ${this.colors.border};
      }

      .usd-detail-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .usd-detail-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .usd-info-item {
        background: ${this.colors.bgTertiary};
        padding: 12px 16px;
        border-radius: 8px;
      }

      .usd-info-label {
        font-size: 11px;
        color: ${this.colors.textMuted};
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .usd-info-value {
        font-size: 14px;
        font-weight: 500;
      }

      /* Chat Messages */
      .usd-chat-container {
        background: ${this.colors.bgTertiary};
        border-radius: 12px;
        overflow: hidden;
      }

      .usd-chat-messages {
        max-height: 400px;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .usd-message {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 12px;
        position: relative;
      }

      .usd-message-user {
        background: ${this.colors.accentBlue}20;
        border: 1px solid ${this.colors.accentBlue}40;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }

      .usd-message-support {
        background: ${this.colors.bgSecondary};
        border: 1px solid ${this.colors.border};
        align-self: flex-start;
        border-bottom-left-radius: 4px;
      }

      .usd-message-sender {
        font-size: 11px;
        font-weight: 600;
        color: ${this.colors.textMuted};
        margin-bottom: 4px;
      }

      .usd-message-text {
        font-size: 14px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .usd-message-time {
        font-size: 10px;
        color: ${this.colors.textMuted};
        margin-top: 8px;
        text-align: right;
      }

      .usd-chat-input {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: ${this.colors.bgSecondary};
        border-top: 1px solid ${this.colors.border};
      }

      .usd-chat-input input {
        flex: 1;
        padding: 12px 16px;
        background: ${this.colors.bgTertiary};
        border: 1px solid ${this.colors.border};
        border-radius: 8px;
        color: ${this.colors.textPrimary};
        font-size: 14px;
      }

      .usd-chat-input input:focus {
        outline: none;
        border-color: ${this.colors.accentBlue};
      }

      /* AI Escalation Banner */
      .usd-ai-banner {
        background: linear-gradient(135deg, ${this.colors.accentPurple}20, ${this.colors.accentBlue}20);
        border: 1px solid ${this.colors.accentPurple}40;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .usd-ai-banner-icon {
        font-size: 24px;
      }

      .usd-ai-banner-content {
        flex: 1;
      }

      .usd-ai-banner-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: ${this.colors.accentPurple};
      }

      .usd-ai-banner-text {
        font-size: 13px;
        color: ${this.colors.textSecondary};
      }

      /* Loading */
      .usd-loading {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 40px;
      }

      .usd-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid ${this.colors.bgTertiary};
        border-top-color: ${this.colors.accentBlue};
        border-radius: 50%;
        animation: usd-spin 1s linear infinite;
      }

      @keyframes usd-spin {
        to { transform: rotate(360deg); }
      }

      /* Notification Toast */
      .usd-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: usd-slide-in 0.3s ease;
      }

      @keyframes usd-slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .usd-container {
          padding: 16px;
        }

        .usd-header {
          flex-direction: column;
          gap: 16px;
          align-items: flex-start;
        }

        .usd-ticket-item {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .usd-stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Load all data
   */
  async loadData() {
    try {
      await Promise.all([
        this.loadTickets(),
        this.loadModules()
      ]);
      this.calculateStats();
    } catch (error) {
      console.error('[USER-SUPPORT] Error loading data:', error);
    }
  }

  /**
   * Load tickets
   */
  async loadTickets() {
    try {
      const token = this.getAuthToken();
      const response = await fetch('/api/support/v2/tickets', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.tickets = data.tickets || [];
        console.log(`✅ [USER-SUPPORT] Loaded ${this.tickets.length} tickets`);
      }
    } catch (error) {
      console.error('[USER-SUPPORT] Error loading tickets:', error);
      this.tickets = [];
    }
  }

  /**
   * Load available modules
   */
  async loadModules() {
    try {
      const token = this.getAuthToken();
      const response = await fetch('/api/support/v2/modules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.modules = data.modules || [];
      }
    } catch (error) {
      console.warn('[USER-SUPPORT] Could not load modules:', error);
      // Fallback modules
      this.modules = [
        { key: 'general', name: 'General' },
        { key: 'usuarios', name: 'Usuarios' },
        { key: 'asistencia', name: 'Asistencia' },
        { key: 'reportes', name: 'Reportes' },
        { key: 'kioscos', name: 'Kioscos' }
      ];
    }
  }

  /**
   * Calculate stats
   */
  calculateStats() {
    this.stats = {
      total: this.tickets.length,
      open: this.tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      resolved: this.tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
      aiEscalated: this.tickets.filter(t => t.assistant_attempted === true && t.assistant_resolved === false).length
    };
  }

  /**
   * Main render
   */
  render() {
    switch (this.currentView) {
      case 'detail':
        this.renderTicketDetail();
        break;
      case 'create':
        this.renderCreateTicket();
        break;
      default:
        this.renderTicketList();
    }
  }

  /**
   * Render ticket list view
   */
  renderTicketList() {
    const filteredTickets = this.getFilteredTickets();

    this.container.innerHTML = `
      <div class="usd-container">
        <!-- Header -->
        <div class="usd-header">
          <div class="usd-header-title">
            <span style="font-size: 32px;">🎫</span>
            <h1>Mis Tickets de Soporte</h1>
          </div>
          <div class="usd-header-actions">
            <button class="usd-btn usd-btn-secondary" onclick="userSupport.refresh()">
              🔄 Actualizar
            </button>
            <button class="usd-btn usd-btn-primary" onclick="userSupport.showCreateTicket()">
              ➕ Nuevo Ticket
            </button>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="usd-stats-grid">
          <div class="usd-stat-card">
            <div class="usd-stat-icon" style="background: ${this.colors.accentBlue}20; color: ${this.colors.accentBlue};">🎫</div>
            <div class="usd-stat-value">${this.stats.total}</div>
            <div class="usd-stat-label">Total Tickets</div>
          </div>
          <div class="usd-stat-card">
            <div class="usd-stat-icon" style="background: ${this.colors.accentOrange}20; color: ${this.colors.accentOrange};">⏳</div>
            <div class="usd-stat-value">${this.stats.open}</div>
            <div class="usd-stat-label">En Proceso</div>
          </div>
          <div class="usd-stat-card">
            <div class="usd-stat-icon" style="background: ${this.colors.accentGreen}20; color: ${this.colors.accentGreen};">✅</div>
            <div class="usd-stat-value">${this.stats.resolved}</div>
            <div class="usd-stat-label">Resueltos</div>
          </div>
          <div class="usd-stat-card">
            <div class="usd-stat-icon" style="background: ${this.colors.accentPurple}20; color: ${this.colors.accentPurple};">🤖</div>
            <div class="usd-stat-value">${this.stats.aiEscalated}</div>
            <div class="usd-stat-label">Escalados desde IA</div>
          </div>
        </div>

        ${this.stats.aiEscalated > 0 ? `
        <!-- AI Escalation Banner -->
        <div class="usd-ai-banner">
          <div class="usd-ai-banner-icon">🤖</div>
          <div class="usd-ai-banner-content">
            <div class="usd-ai-banner-title">Tickets Escalados desde Asistente IA</div>
            <div class="usd-ai-banner-text">
              Tienes ${this.stats.aiEscalated} ticket(s) que fueron escalados cuando el Asistente IA no pudo resolver tu consulta.
              Nuestro equipo de soporte está trabajando en ellos.
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Filters -->
        <div class="usd-card">
          <div class="usd-filters">
            <div class="usd-filter-group">
              <span class="usd-filter-label">Estado:</span>
              <select class="usd-select" id="filter-status" onchange="userSupport.setFilter('status', this.value)">
                <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>Todos</option>
                <option value="open" ${this.filters.status === 'open' ? 'selected' : ''}>Abierto</option>
                <option value="in_progress" ${this.filters.status === 'in_progress' ? 'selected' : ''}>En Progreso</option>
                <option value="waiting_customer" ${this.filters.status === 'waiting_customer' ? 'selected' : ''}>Esperando Respuesta</option>
                <option value="resolved" ${this.filters.status === 'resolved' ? 'selected' : ''}>Resuelto</option>
                <option value="closed" ${this.filters.status === 'closed' ? 'selected' : ''}>Cerrado</option>
              </select>
            </div>
            <div class="usd-filter-group">
              <span class="usd-filter-label">Prioridad:</span>
              <select class="usd-select" id="filter-priority" onchange="userSupport.setFilter('priority', this.value)">
                <option value="all" ${this.filters.priority === 'all' ? 'selected' : ''}>Todas</option>
                <option value="low" ${this.filters.priority === 'low' ? 'selected' : ''}>Baja</option>
                <option value="medium" ${this.filters.priority === 'medium' ? 'selected' : ''}>Media</option>
                <option value="high" ${this.filters.priority === 'high' ? 'selected' : ''}>Alta</option>
                <option value="urgent" ${this.filters.priority === 'urgent' ? 'selected' : ''}>Urgente</option>
              </select>
            </div>
          </div>

          <!-- Ticket List -->
          <div class="usd-ticket-list">
            ${filteredTickets.length === 0 ? this.renderEmpty() : filteredTickets.map(t => this.renderTicketItem(t)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get filtered tickets
   */
  getFilteredTickets() {
    let filtered = [...this.tickets];

    if (this.filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === this.filters.status);
    }

    if (this.filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === this.filters.priority);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return filtered;
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    return `
      <div class="usd-empty">
        <div class="usd-empty-icon">🎫</div>
        <div class="usd-empty-title">No hay tickets</div>
        <div class="usd-empty-text">
          ${this.filters.status !== 'all' || this.filters.priority !== 'all'
            ? 'No se encontraron tickets con los filtros aplicados.'
            : 'Aún no has creado ningún ticket de soporte.'}
        </div>
        <button class="usd-btn usd-btn-primary" onclick="userSupport.showCreateTicket()">
          ➕ Crear mi primer ticket
        </button>
      </div>
    `;
  }

  /**
   * Render single ticket item
   */
  renderTicketItem(ticket) {
    const isAIEscalated = ticket.assistant_attempted === true && ticket.assistant_resolved === false;
    const statusColor = this.statusColors[ticket.status] || this.colors.textMuted;
    const priorityColor = this.priorityColors[ticket.priority] || this.colors.textMuted;

    return `
      <div class="usd-ticket-item ${isAIEscalated ? 'ai-escalated' : ''}" onclick="userSupport.openTicket(${ticket.id})">
        <span class="usd-ticket-number">#${ticket.ticket_number || ticket.id}</span>

        <div class="usd-ticket-content">
          <div class="usd-ticket-subject">
            ${ticket.subject}
            ${isAIEscalated ? '<span class="usd-badge usd-badge-ai">🤖 Escalado IA</span>' : ''}
          </div>
          <div class="usd-ticket-meta">
            <span>📦 ${ticket.module_display_name || ticket.module_name || 'General'}</span>
            <span>📅 ${this.formatDate(ticket.created_at)}</span>
            ${ticket.unread_messages > 0 ? `<span style="color: ${this.colors.accentRed};">💬 ${ticket.unread_messages} nuevo(s)</span>` : ''}
          </div>
        </div>

        <div class="usd-ticket-badges">
          <span class="usd-badge" style="background: ${statusColor}20; color: ${statusColor};">
            ${this.translateStatus(ticket.status)}
          </span>
          <span class="usd-badge" style="background: ${priorityColor}20; color: ${priorityColor};">
            ${this.translatePriority(ticket.priority)}
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Render ticket detail view
   */
  renderTicketDetail() {
    const ticket = this.currentTicket;
    if (!ticket) return this.showList();

    const isAIEscalated = ticket.assistant_attempted === true && ticket.assistant_resolved === false;
    const statusColor = this.statusColors[ticket.status] || this.colors.textMuted;
    const priorityColor = this.priorityColors[ticket.priority] || this.colors.textMuted;

    this.container.innerHTML = `
      <div class="usd-container">
        <!-- Header -->
        <div class="usd-header">
          <div class="usd-header-title">
            <button class="usd-btn usd-btn-secondary" onclick="userSupport.showList()" style="padding: 8px 12px;">
              ← Volver
            </button>
            <h1>Ticket #${ticket.ticket_number || ticket.id}</h1>
          </div>
          <div class="usd-header-actions">
            ${ticket.status !== 'resolved' && ticket.status !== 'closed' ? `
              <button class="usd-btn usd-btn-success" onclick="userSupport.markResolved(${ticket.id})">
                ✅ Marcar Resuelto
              </button>
            ` : ''}
          </div>
        </div>

        ${isAIEscalated ? `
        <!-- AI Escalation Banner -->
        <div class="usd-ai-banner">
          <div class="usd-ai-banner-icon">🤖</div>
          <div class="usd-ai-banner-content">
            <div class="usd-ai-banner-title">Este ticket fue escalado desde el Asistente IA</div>
            <div class="usd-ai-banner-text">
              El asistente virtual no pudo resolver tu consulta y automáticamente creó este ticket para atención personalizada.
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Ticket Info Card -->
        <div class="usd-card">
          <div class="usd-detail-header">
            <div>
              <div class="usd-detail-title">${ticket.subject}</div>
              <div style="display: flex; gap: 12px; margin-top: 8px;">
                <span class="usd-badge" style="background: ${statusColor}20; color: ${statusColor};">
                  ${this.translateStatus(ticket.status)}
                </span>
                <span class="usd-badge" style="background: ${priorityColor}20; color: ${priorityColor};">
                  ${this.translatePriority(ticket.priority)}
                </span>
                ${isAIEscalated ? '<span class="usd-badge usd-badge-ai">🤖 Escalado IA</span>' : ''}
              </div>
            </div>
          </div>

          <div class="usd-detail-info">
            <div class="usd-info-item">
              <div class="usd-info-label">Módulo</div>
              <div class="usd-info-value">📦 ${ticket.module_display_name || ticket.module_name || 'General'}</div>
            </div>
            <div class="usd-info-item">
              <div class="usd-info-label">Creado</div>
              <div class="usd-info-value">📅 ${this.formatDate(ticket.created_at)}</div>
            </div>
            <div class="usd-info-item">
              <div class="usd-info-label">Última actualización</div>
              <div class="usd-info-value">🕐 ${this.formatDate(ticket.updated_at)}</div>
            </div>
            ${ticket.assigned_to_name ? `
            <div class="usd-info-item">
              <div class="usd-info-label">Asignado a</div>
              <div class="usd-info-value">👤 ${ticket.assigned_to_name}</div>
            </div>
            ` : ''}
          </div>

          <!-- Description -->
          <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 12px; color: ${this.colors.textSecondary};">📝 Descripción</h4>
            <div style="background: ${this.colors.bgTertiary}; padding: 16px; border-radius: 8px; white-space: pre-wrap; line-height: 1.6;">
              ${ticket.description || 'Sin descripción'}
            </div>
          </div>
        </div>

        <!-- Chat Section -->
        <div class="usd-card">
          <div class="usd-card-header">
            <span class="usd-card-title">💬 Conversación</span>
          </div>
          <div class="usd-chat-container">
            <div class="usd-chat-messages" id="chat-messages">
              ${this.renderMessages()}
            </div>
            ${ticket.status !== 'resolved' && ticket.status !== 'closed' ? `
            <div class="usd-chat-input">
              <input type="text" id="message-input" placeholder="Escribe tu mensaje..."
                     onkeypress="if(event.key==='Enter') userSupport.sendMessage(${ticket.id})">
              <button class="usd-btn usd-btn-primary" onclick="userSupport.sendMessage(${ticket.id})">
                📤 Enviar
              </button>
            </div>
            ` : `
            <div style="padding: 16px; text-align: center; color: ${this.colors.textMuted};">
              Este ticket está ${ticket.status === 'resolved' ? 'resuelto' : 'cerrado'}. No se pueden enviar más mensajes.
            </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Scroll to bottom of messages
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  /**
   * Render chat messages
   */
  renderMessages() {
    if (this.messages.length === 0) {
      return `
        <div style="text-align: center; padding: 40px; color: ${this.colors.textMuted};">
          <div style="font-size: 40px; margin-bottom: 12px;">💬</div>
          <p>No hay mensajes aún</p>
          <p style="font-size: 12px;">Envía un mensaje para iniciar la conversación</p>
        </div>
      `;
    }

    return this.messages.map(msg => {
      const isUser = msg.sender_type === 'client' || msg.sender_type === 'user';
      return `
        <div class="usd-message ${isUser ? 'usd-message-user' : 'usd-message-support'}">
          <div class="usd-message-sender">
            ${isUser ? '👤 Tú' : '🎧 Soporte'}
          </div>
          <div class="usd-message-text">${msg.message}</div>
          <div class="usd-message-time">${this.formatDate(msg.created_at)}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render create ticket view
   */
  renderCreateTicket() {
    this.container.innerHTML = `
      <div class="usd-container">
        <!-- Header -->
        <div class="usd-header">
          <div class="usd-header-title">
            <button class="usd-btn usd-btn-secondary" onclick="userSupport.showList()" style="padding: 8px 12px;">
              ← Volver
            </button>
            <h1>Nuevo Ticket de Soporte</h1>
          </div>
        </div>

        <!-- AI Suggestion Banner -->
        <div class="usd-ai-banner">
          <div class="usd-ai-banner-icon">💡</div>
          <div class="usd-ai-banner-content">
            <div class="usd-ai-banner-title">¿Ya probaste el Asistente IA?</div>
            <div class="usd-ai-banner-text">
              Nuestro asistente virtual puede responder muchas preguntas al instante.
              Busca el botón 🤖 en la esquina inferior derecha de la pantalla.
            </div>
          </div>
        </div>

        <!-- Form -->
        <div class="usd-card">
          <form id="create-ticket-form" onsubmit="userSupport.createTicket(event)">
            <div class="usd-form-group">
              <label class="usd-form-label">Módulo relacionado *</label>
              <select class="usd-form-select" id="ticket-module" required>
                <option value="">Selecciona un módulo</option>
                ${this.modules.map(m => `
                  <option value="${m.key}">${m.name}</option>
                `).join('')}
                <option value="ai-assistant">Asistente IA</option>
                <option value="general">General / Otro</option>
              </select>
            </div>

            <div class="usd-form-group">
              <label class="usd-form-label">Asunto *</label>
              <input type="text" class="usd-form-input" id="ticket-subject"
                     placeholder="Describe brevemente tu problema" required minlength="5" maxlength="200">
            </div>

            <div class="usd-form-group">
              <label class="usd-form-label">Descripción detallada *</label>
              <textarea class="usd-form-textarea" id="ticket-description"
                        placeholder="Proporciona todos los detalles relevantes:&#10;- ¿Qué estabas intentando hacer?&#10;- ¿Qué mensaje de error apareció?&#10;- ¿Cuándo ocurrió el problema?"
                        required minlength="20" maxlength="5000" rows="6"></textarea>
            </div>

            <div class="usd-form-group">
              <label class="usd-form-label">Prioridad</label>
              <select class="usd-form-select" id="ticket-priority">
                <option value="low">🟢 Baja - Consulta general</option>
                <option value="medium" selected>🟡 Media - Afecta mi trabajo</option>
                <option value="high">🟠 Alta - Urgente, bloquea mi trabajo</option>
                <option value="urgent">🔴 Urgente - Sistema caído</option>
              </select>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
              <button type="button" class="usd-btn usd-btn-secondary" onclick="userSupport.showList()">
                Cancelar
              </button>
              <button type="submit" class="usd-btn usd-btn-primary">
                📤 Crear Ticket
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================

  /**
   * Refresh data
   */
  async refresh() {
    this.showLoading();
    await this.loadData();
    this.render();
    this.showToast('Datos actualizados', 'success');
  }

  /**
   * Set filter
   */
  setFilter(key, value) {
    this.filters[key] = value;
    this.render();
  }

  /**
   * Show create ticket view
   */
  showCreateTicket() {
    this.currentView = 'create';
    this.render();
  }

  /**
   * Show list view
   */
  showList() {
    this.currentView = 'list';
    this.currentTicket = null;
    this.messages = [];
    this.render();
  }

  /**
   * Open ticket detail
   */
  async openTicket(ticketId) {
    this.showLoading();

    try {
      // Find ticket
      this.currentTicket = this.tickets.find(t => t.id === ticketId);
      if (!this.currentTicket) {
        throw new Error('Ticket no encontrado');
      }

      // Load messages
      await this.loadMessages(ticketId);

      this.currentView = 'detail';
      this.render();
    } catch (error) {
      console.error('[USER-SUPPORT] Error opening ticket:', error);
      this.showToast('Error abriendo ticket', 'error');
      this.showList();
    }
  }

  /**
   * Load messages for a ticket
   */
  async loadMessages(ticketId) {
    try {
      const token = this.getAuthToken();
      const response = await fetch(`/api/support/v2/tickets/${ticketId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.messages = data.messages || [];
      }
    } catch (error) {
      console.error('[USER-SUPPORT] Error loading messages:', error);
      this.messages = [];
    }
  }

  /**
   * Create new ticket
   */
  async createTicket(event) {
    event.preventDefault();

    const module = document.getElementById('ticket-module').value;
    const subject = document.getElementById('ticket-subject').value.trim();
    const description = document.getElementById('ticket-description').value.trim();
    const priority = document.getElementById('ticket-priority').value;

    if (!module || !subject || !description) {
      this.showToast('Por favor completa todos los campos', 'error');
      return;
    }

    try {
      const token = this.getAuthToken();
      const response = await fetch('/api/support/v2/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          module_name: module,
          subject,
          description,
          priority
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error creando ticket');
      }

      const result = await response.json();

      this.showToast(`Ticket #${result.ticket?.ticket_number || result.ticket?.id} creado exitosamente`, 'success');

      // Reload and go to list
      await this.loadData();
      this.showList();

    } catch (error) {
      console.error('[USER-SUPPORT] Error creating ticket:', error);
      this.showToast(error.message || 'Error creando ticket', 'error');
    }
  }

  /**
   * Send message
   */
  async sendMessage(ticketId) {
    const input = document.getElementById('message-input');
    const message = input?.value.trim();

    if (!message) return;

    try {
      const token = this.getAuthToken();
      const response = await fetch(`/api/support/v2/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          sender_type: 'client'
        })
      });

      if (!response.ok) {
        throw new Error('Error enviando mensaje');
      }

      const result = await response.json();

      // Add message to list
      this.messages.push(result.message);

      // Clear input and re-render messages
      input.value = '';

      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        chatMessages.innerHTML = this.renderMessages();
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

    } catch (error) {
      console.error('[USER-SUPPORT] Error sending message:', error);
      this.showToast('Error enviando mensaje', 'error');
    }
  }

  /**
   * Mark ticket as resolved
   */
  async markResolved(ticketId) {
    if (!confirm('¿Marcar este ticket como resuelto?')) return;

    try {
      const token = this.getAuthToken();
      const response = await fetch(`/api/support/v2/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'resolved' })
      });

      if (!response.ok) {
        throw new Error('Error actualizando estado');
      }

      this.showToast('Ticket marcado como resuelto', 'success');

      // Reload and refresh view
      await this.loadData();
      this.currentTicket = this.tickets.find(t => t.id === ticketId);
      this.render();

    } catch (error) {
      console.error('[USER-SUPPORT] Error marking as resolved:', error);
      this.showToast('Error actualizando ticket', 'error');
    }
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Show loading state
   */
  showLoading() {
    if (this.container) {
      this.container.innerHTML = `
        <div class="usd-container">
          <div class="usd-loading">
            <div class="usd-spinner"></div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const colors = {
      success: this.colors.accentGreen,
      error: this.colors.accentRed,
      warning: this.colors.accentOrange,
      info: this.colors.accentBlue
    };

    const toast = document.createElement('div');
    toast.className = 'usd-toast';
    toast.style.background = colors[type] || colors.info;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Format date
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `Hace ${hours}h ${minutes}m`;
      } else {
        return `Hace ${minutes}m`;
      }
    }

    // Otherwise show date
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Translate status
   */
  translateStatus(status) {
    const translations = {
      'open': '⏳ Abierto',
      'in_progress': '🔧 En Progreso',
      'waiting_customer': '⏰ Esperando Respuesta',
      'resolved': '✅ Resuelto',
      'closed': '🔒 Cerrado'
    };
    return translations[status] || status;
  }

  /**
   * Translate priority
   */
  translatePriority(priority) {
    const translations = {
      'low': '🟢 Baja',
      'medium': '🟡 Media',
      'high': '🟠 Alta',
      'urgent': '🔴 Urgente'
    };
    return translations[priority] || priority;
  }
}

// Close the else block
window.UserSupportDashboard = UserSupportDashboard;
}

// Create global instance (outside the else block)
// Use var to allow redeclaration when module loads multiple times in SPA
var userSupport = window.userSupport || new window.UserSupportDashboard();

// Export for use
window.userSupport = userSupport;

/**
 * Global function called by panel-empresa.html tab system
 * This is the entry point when user clicks on the support tab
 */
function showUserSupportContent() {
  console.log('🎫 [USER-SUPPORT] showUserSupportContent called');

  // Get mainContent container
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) {
    console.error('[USER-SUPPORT] mainContent not found');
    return;
  }

  // Create container for the dashboard
  mainContent.innerHTML = `
    <div id="user-support-container" style="height: 100%;"></div>
  `;

  // Initialize the dashboard
  userSupport.init('user-support-container');
}

// Export to window for the tab system
window.showUserSupportContent = showUserSupportContent;

console.log('✅ [USER-SUPPORT] Module loaded successfully');
