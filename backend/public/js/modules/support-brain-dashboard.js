/**
 * ============================================================================
 * SUPPORT BRAIN DASHBOARD - Dashboard Inteligente de Soporte
 * ============================================================================
 *
 * Dashboard profesional con:
 * - Brain Analytics en tiempo real
 * - Sistema de tutoriales auto-generados
 * - Capacitacion con autoevaluacion
 * - Notificaciones de novedades
 * - Integracion con tickets de soporte
 *
 * DARK THEME DESIGN
 *
 * @version 1.0.0
 * @date 2025-12-09
 * ============================================================================
 */

class SupportBrainDashboard {
  constructor() {
    this.container = null;
    this.currentTab = 'overview';
    this.tutorials = [];
    this.brainStatus = null;
    this.userProgress = {};
    this.brainModules = [];
    this.activeExecutions = [];
    this.testingHistory = [];
    this.pollingIntervals = {};

    // Dark Theme Colors
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
      accentCyan: '#39c5cf',
      gradientStart: '#238636',
      gradientEnd: '#2ea043'
    };

    this.init();
  }

  init() {
    console.log('[SUPPORT-BRAIN] Inicializando dashboard...');
    this.injectStyles();
  }

  /**
   * Inyectar estilos Dark Theme
   */
  injectStyles() {
    if (document.getElementById('support-brain-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'support-brain-styles';
    styles.textContent = `
      /* ============================================ */
      /* SUPPORT BRAIN DASHBOARD - DARK THEME        */
      /* ============================================ */

      .sbd-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: ${this.colors.bgPrimary};
        color: ${this.colors.textPrimary};
        min-height: 100vh;
        padding: 24px;
      }

      .sbd-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid ${this.colors.border};
      }

      .sbd-header-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .sbd-header-title h1 {
        font-size: 24px;
        font-weight: 600;
        margin: 0;
        background: linear-gradient(135deg, ${this.colors.accentBlue}, ${this.colors.accentPurple});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .sbd-brain-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: ${this.colors.bgSecondary};
        border: 1px solid ${this.colors.border};
        border-radius: 20px;
        font-size: 13px;
      }

      .sbd-brain-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        animation: sbd-pulse 2s infinite;
      }

      .sbd-brain-dot.active {
        background: ${this.colors.accentGreen};
        box-shadow: 0 0 8px ${this.colors.accentGreen};
      }

      .sbd-brain-dot.inactive {
        background: ${this.colors.accentRed};
      }

      @keyframes sbd-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* Tabs */
      .sbd-tabs {
        display: flex;
        gap: 4px;
        background: ${this.colors.bgSecondary};
        padding: 4px;
        border-radius: 12px;
        margin-bottom: 24px;
        overflow-x: auto;
      }

      .sbd-tab {
        padding: 10px 20px;
        background: transparent;
        border: none;
        color: ${this.colors.textSecondary};
        font-size: 14px;
        font-weight: 500;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sbd-tab:hover {
        background: ${this.colors.bgTertiary};
        color: ${this.colors.textPrimary};
      }

      .sbd-tab.active {
        background: ${this.colors.bgTertiary};
        color: ${this.colors.accentBlue};
        box-shadow: 0 0 0 1px ${this.colors.accentBlue}40;
      }

      /* Content Area */
      .sbd-content {
        display: grid;
        gap: 24px;
      }

      /* Cards */
      .sbd-card {
        background: ${this.colors.bgSecondary};
        border: 1px solid ${this.colors.border};
        border-radius: 12px;
        padding: 20px;
        transition: all 0.2s ease;
      }

      .sbd-card:hover {
        border-color: ${this.colors.borderLight};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }

      .sbd-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .sbd-card-title {
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sbd-card-badge {
        padding: 2px 8px;
        background: ${this.colors.accentBlue}20;
        color: ${this.colors.accentBlue};
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }

      /* Stats Grid */
      .sbd-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .sbd-stat-card {
        background: ${this.colors.bgSecondary};
        border: 1px solid ${this.colors.border};
        border-radius: 12px;
        padding: 20px;
        display: flex;
        flex-direction: column;
      }

      .sbd-stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        margin-bottom: 12px;
      }

      .sbd-stat-value {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .sbd-stat-label {
        font-size: 13px;
        color: ${this.colors.textSecondary};
      }

      /* Tutorials Grid */
      .sbd-tutorials-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }

      .sbd-tutorial-card {
        background: ${this.colors.bgTertiary};
        border: 1px solid ${this.colors.border};
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .sbd-tutorial-card:hover {
        transform: translateY(-2px);
        border-color: ${this.colors.accentBlue};
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }

      .sbd-tutorial-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .sbd-tutorial-name {
        font-weight: 600;
        font-size: 15px;
      }

      .sbd-tutorial-category {
        padding: 2px 8px;
        background: ${this.colors.accentPurple}20;
        color: ${this.colors.accentPurple};
        border-radius: 4px;
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 600;
      }

      .sbd-tutorial-description {
        font-size: 13px;
        color: ${this.colors.textSecondary};
        margin-bottom: 12px;
        line-height: 1.5;
      }

      .sbd-tutorial-formats {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .sbd-format-tag {
        padding: 4px 8px;
        background: ${this.colors.bgSecondary};
        border: 1px solid ${this.colors.border};
        border-radius: 4px;
        font-size: 11px;
        color: ${this.colors.textMuted};
      }

      /* Quiz Section */
      .sbd-quiz-container {
        background: ${this.colors.bgTertiary};
        border-radius: 12px;
        padding: 24px;
      }

      .sbd-quiz-question {
        margin-bottom: 24px;
      }

      .sbd-quiz-question-text {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 16px;
      }

      .sbd-quiz-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .sbd-quiz-option {
        padding: 12px 16px;
        background: ${this.colors.bgSecondary};
        border: 1px solid ${this.colors.border};
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .sbd-quiz-option:hover {
        border-color: ${this.colors.accentBlue};
        background: ${this.colors.bgTertiary};
      }

      .sbd-quiz-option.selected {
        border-color: ${this.colors.accentBlue};
        background: ${this.colors.accentBlue}15;
      }

      .sbd-quiz-option-radio {
        width: 18px;
        height: 18px;
        border: 2px solid ${this.colors.border};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .sbd-quiz-option.selected .sbd-quiz-option-radio {
        border-color: ${this.colors.accentBlue};
      }

      .sbd-quiz-option.selected .sbd-quiz-option-radio::after {
        content: '';
        width: 10px;
        height: 10px;
        background: ${this.colors.accentBlue};
        border-radius: 50%;
      }

      /* Progress Bar */
      .sbd-progress-container {
        margin-bottom: 24px;
      }

      .sbd-progress-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .sbd-progress-bar {
        height: 8px;
        background: ${this.colors.bgTertiary};
        border-radius: 4px;
        overflow: hidden;
      }

      .sbd-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, ${this.colors.accentBlue}, ${this.colors.accentPurple});
        border-radius: 4px;
        transition: width 0.5s ease;
      }

      /* Buttons */
      .sbd-btn {
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

      .sbd-btn-primary {
        background: linear-gradient(135deg, ${this.colors.accentBlue}, ${this.colors.accentPurple});
        color: white;
      }

      .sbd-btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px ${this.colors.accentBlue}40;
      }

      .sbd-btn-secondary {
        background: ${this.colors.bgTertiary};
        border: 1px solid ${this.colors.border};
        color: ${this.colors.textPrimary};
      }

      .sbd-btn-secondary:hover {
        border-color: ${this.colors.borderLight};
        background: ${this.colors.bgSecondary};
      }

      /* Notifications */
      .sbd-notification {
        background: ${this.colors.bgTertiary};
        border: 1px solid ${this.colors.border};
        border-left: 3px solid ${this.colors.accentBlue};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        display: flex;
        gap: 12px;
      }

      .sbd-notification.new-feature {
        border-left-color: ${this.colors.accentGreen};
      }

      .sbd-notification.update {
        border-left-color: ${this.colors.accentOrange};
      }

      .sbd-notification.training {
        border-left-color: ${this.colors.accentPurple};
      }

      .sbd-notification-icon {
        font-size: 20px;
      }

      .sbd-notification-content {
        flex: 1;
      }

      .sbd-notification-title {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .sbd-notification-text {
        font-size: 13px;
        color: ${this.colors.textSecondary};
      }

      .sbd-notification-time {
        font-size: 11px;
        color: ${this.colors.textMuted};
      }

      /* Brain Analytics */
      .sbd-brain-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 16px;
      }

      .sbd-brain-metric {
        background: ${this.colors.bgTertiary};
        border-radius: 8px;
        padding: 16px;
      }

      .sbd-brain-metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .sbd-brain-metric-value {
        font-size: 24px;
        font-weight: 700;
      }

      .sbd-brain-metric-trend {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
      }

      .sbd-brain-metric-trend.up {
        color: ${this.colors.accentGreen};
      }

      .sbd-brain-metric-trend.down {
        color: ${this.colors.accentRed};
      }

      /* Search */
      .sbd-search {
        position: relative;
        margin-bottom: 20px;
      }

      .sbd-search input {
        width: 100%;
        padding: 12px 16px 12px 44px;
        background: ${this.colors.bgTertiary};
        border: 1px solid ${this.colors.border};
        border-radius: 8px;
        color: ${this.colors.textPrimary};
        font-size: 14px;
      }

      .sbd-search input:focus {
        outline: none;
        border-color: ${this.colors.accentBlue};
        box-shadow: 0 0 0 3px ${this.colors.accentBlue}20;
      }

      .sbd-search input::placeholder {
        color: ${this.colors.textMuted};
      }

      .sbd-search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: ${this.colors.textMuted};
      }

      /* Tutorial Viewer */
      .sbd-tutorial-viewer {
        background: ${this.colors.bgTertiary};
        border-radius: 12px;
        padding: 24px;
      }

      .sbd-tutorial-step {
        padding: 16px;
        background: ${this.colors.bgSecondary};
        border-radius: 8px;
        margin-bottom: 12px;
        border-left: 3px solid ${this.colors.accentBlue};
      }

      .sbd-tutorial-step-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: ${this.colors.accentBlue};
        color: white;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 600;
        margin-right: 12px;
      }

      .sbd-tutorial-step-title {
        font-weight: 600;
        margin-bottom: 8px;
      }

      .sbd-tutorial-step-description {
        font-size: 14px;
        color: ${this.colors.textSecondary};
        line-height: 1.6;
      }

      /* Loading */
      .sbd-loading {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 40px;
      }

      .sbd-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid ${this.colors.bgTertiary};
        border-top-color: ${this.colors.accentBlue};
        border-radius: 50%;
        animation: sbd-spin 1s linear infinite;
      }

      @keyframes sbd-spin {
        to { transform: rotate(360deg); }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .sbd-container {
          padding: 16px;
        }

        .sbd-header {
          flex-direction: column;
          gap: 16px;
          align-items: flex-start;
        }

        .sbd-tabs {
          width: 100%;
        }

        .sbd-stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Renderizar el dashboard completo
   */
  async render(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('[SUPPORT-BRAIN] Container no encontrado:', containerId);
      return;
    }

    // Cargar datos iniciales
    await this.loadInitialData();

    this.container.innerHTML = this.buildHTML();
    this.attachEventListeners();
  }

  /**
   * Cargar datos iniciales
   */
  async loadInitialData() {
    try {
      // Status del Brain
      const statusRes = await fetch('/api/training/status');
      this.brainStatus = await statusRes.json();

      // Lista de tutoriales
      const tutorialsRes = await fetch('/api/training/tutorials');
      const tutorialsData = await tutorialsRes.json();
      this.tutorials = tutorialsData.data?.tutorials || [];

      // Modulos del Brain para testing
      try {
        const modulesRes = await fetch('/api/brain/technical-modules');
        const modulesData = await modulesRes.json();
        this.brainModules = modulesData.data?.modules || modulesData.modules || [];
        console.log('[SUPPORT-BRAIN] Modulos del Brain cargados:', this.brainModules.length);
      } catch (e) {
        console.log('[SUPPORT-BRAIN] Brain modules no disponibles:', e.message);
      }

      // Ejecuciones activas
      try {
        const execRes = await fetch('/api/testing/active-executions');
        const execData = await execRes.json();
        this.activeExecutions = execData.executions || [];
      } catch (e) {
        console.log('[SUPPORT-BRAIN] Testing API no disponible:', e.message);
      }

    } catch (error) {
      console.error('[SUPPORT-BRAIN] Error cargando datos:', error);
    }
  }

  /**
   * Construir HTML del dashboard
   */
  buildHTML() {
    const brainConnected = this.brainStatus?.data?.brainConnected;

    return `
      <div class="sbd-container">
        <!-- Header -->
        <div class="sbd-header">
          <div class="sbd-header-title">
            <span style="font-size: 32px;">*</span>
            <h1>Centro de Conocimiento & Soporte</h1>
          </div>
          <div class="sbd-brain-indicator">
            <span class="sbd-brain-dot ${brainConnected ? 'active' : 'inactive'}"></span>
            <span>Brain ${brainConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="sbd-tabs">
          <button class="sbd-tab active" data-tab="overview">
            <span>$</span> Vista General
          </button>
          <button class="sbd-tab" data-tab="tutorials">
            <span>+</span> Tutoriales
          </button>
          <button class="sbd-tab" data-tab="training">
            <span>@</span> Capacitacion
          </button>
          <button class="sbd-tab" data-tab="brain">
            <span>*</span> Brain Analytics
          </button>
          <button class="sbd-tab" data-tab="notifications">
            <span>#</span> Novedades
          </button>
          <button class="sbd-tab" data-tab="testing">
            <span>!</span> Testing E2E
          </button>
        </div>

        <!-- Content -->
        <div class="sbd-content">
          ${this.buildOverviewTab()}
        </div>
      </div>
    `;
  }

  /**
   * Tab: Vista General
   */
  buildOverviewTab() {
    return `
      <!-- Stats Grid -->
      <div class="sbd-stats-grid">
        <div class="sbd-stat-card">
          <div class="sbd-stat-icon" style="background: ${this.colors.accentBlue}20; color: ${this.colors.accentBlue};">+</div>
          <div class="sbd-stat-value">${this.tutorials.length}</div>
          <div class="sbd-stat-label">Tutoriales Disponibles</div>
        </div>
        <div class="sbd-stat-card">
          <div class="sbd-stat-icon" style="background: ${this.colors.accentGreen}20; color: ${this.colors.accentGreen};">*</div>
          <div class="sbd-stat-value">${this.brainStatus?.data?.features?.length || 0}</div>
          <div class="sbd-stat-label">Features del Brain</div>
        </div>
        <div class="sbd-stat-card">
          <div class="sbd-stat-icon" style="background: ${this.colors.accentPurple}20; color: ${this.colors.accentPurple};">@</div>
          <div class="sbd-stat-value">4</div>
          <div class="sbd-stat-label">Formatos Tutorial</div>
        </div>
        <div class="sbd-stat-card">
          <div class="sbd-stat-icon" style="background: ${this.colors.accentOrange}20; color: ${this.colors.accentOrange};">#</div>
          <div class="sbd-stat-value">100%</div>
          <div class="sbd-stat-label">Sistema Operativo</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>~</span> Acciones Rapidas
          </span>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="sbd-btn sbd-btn-primary" onclick="supportBrain.showTutorials()">
            <span>+</span> Ver Tutoriales
          </button>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.showTraining()">
            <span>@</span> Mi Capacitacion
          </button>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.showBrainAnalytics()">
            <span>*</span> Brain Analytics
          </button>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.generateTicketTutorial()">
            <span>!</span> Tutorial para Ticket
          </button>
          <button class="sbd-btn" style="background: linear-gradient(135deg, ${this.colors.accentOrange}, ${this.colors.accentRed}); color: white;" onclick="supportBrain.showTesting()">
            <span>!</span> Testing E2E
          </button>
        </div>
      </div>

      <!-- Features -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>*</span> Features del Sistema
          </span>
          <span class="sbd-card-badge">v${this.brainStatus?.data?.version || '1.0.0'}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
          ${(this.brainStatus?.data?.features || []).map(feature => `
            <div style="padding: 12px; background: ${this.colors.bgTertiary}; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="color: ${this.colors.accentGreen};">ok</span>
              <span>${this.formatFeatureName(feature)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Recent Tutorials -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>+</span> Tutoriales Destacados
          </span>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.showTutorials()">
            Ver todos >
          </button>
        </div>
        <div class="sbd-tutorials-grid">
          ${this.tutorials.slice(0, 6).map(t => this.buildTutorialCard(t)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Tab: Tutoriales
   */
  buildTutorialsTab() {
    return `
      <div class="sbd-search">
        <span class="sbd-search-icon">O</span>
        <input type="text" placeholder="Buscar tutoriales por modulo, categoria..." id="sbd-tutorial-search">
      </div>

      <div class="sbd-tutorials-grid" id="sbd-tutorials-list">
        ${this.tutorials.map(t => this.buildTutorialCard(t)).join('')}
      </div>
    `;
  }

  /**
   * Tab: Capacitacion
   */
  buildTrainingTab() {
    return `
      <!-- Progress Overview -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>@</span> Mi Progreso de Capacitacion
          </span>
          <span class="sbd-card-badge">0% Completado</span>
        </div>
        <div class="sbd-progress-container">
          <div class="sbd-progress-header">
            <span>Progreso General</span>
            <span>0 de ${this.tutorials.length} modulos</span>
          </div>
          <div class="sbd-progress-bar">
            <div class="sbd-progress-fill" style="width: 0%;"></div>
          </div>
        </div>
        <p style="color: ${this.colors.textSecondary}; font-size: 14px;">
          Completa los tutoriales y aprueba los quizzes para obtener tu certificacion.
        </p>
      </div>

      <!-- Training Modules -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>+</span> Modulos de Capacitacion
          </span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${this.tutorials.slice(0, 10).map((t, i) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <span style="width: 32px; height: 32px; background: ${this.colors.bgSecondary}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${this.colors.textMuted};">${i + 1}</span>
                <div>
                  <div style="font-weight: 500;">${t.name}</div>
                  <div style="font-size: 12px; color: ${this.colors.textMuted};">${t.description?.substring(0, 50) || 'Sin descripcion'}...</div>
                </div>
              </div>
              <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.startTraining('${t.moduleKey}')">
                Comenzar
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Tab: Brain Analytics
   */
  buildBrainTab() {
    return `
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>*</span> Estado del Brain
          </span>
          <div class="sbd-brain-indicator" style="background: transparent; border: none; padding: 0;">
            <span class="sbd-brain-dot active"></span>
            <span style="color: ${this.colors.accentGreen};">Operativo</span>
          </div>
        </div>
        <div class="sbd-brain-grid">
          <div class="sbd-brain-metric">
            <div class="sbd-brain-metric-header">
              <span>Modulos Analizados</span>
              <span class="sbd-brain-metric-trend up">^ 12%</span>
            </div>
            <div class="sbd-brain-metric-value">${this.tutorials.length}</div>
          </div>
          <div class="sbd-brain-metric">
            <div class="sbd-brain-metric-header">
              <span>Endpoints Detectados</span>
              <span class="sbd-brain-metric-trend up">^ 5%</span>
            </div>
            <div class="sbd-brain-metric-value">500+</div>
          </div>
          <div class="sbd-brain-metric">
            <div class="sbd-brain-metric-header">
              <span>Tutoriales Generados</span>
              <span class="sbd-brain-metric-trend up">^ 100%</span>
            </div>
            <div class="sbd-brain-metric-value">${this.tutorials.length * 4}</div>
          </div>
          <div class="sbd-brain-metric">
            <div class="sbd-brain-metric-header">
              <span>Health Score</span>
            </div>
            <div class="sbd-brain-metric-value" style="color: ${this.colors.accentGreen};">98%</div>
          </div>
        </div>
      </div>

      <!-- Brain Capabilities -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>~</span> Capacidades del Brain
          </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <div style="font-weight: 500; margin-bottom: 8px;">+ Analisis de Dependencias</div>
            <div style="font-size: 13px; color: ${this.colors.textSecondary};">Detecta dependencias entre modulos automaticamente</div>
          </div>
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <div style="font-weight: 500; margin-bottom: 8px;">X Deteccion de Codigo Muerto</div>
            <div style="font-size: 13px; color: ${this.colors.textSecondary};">Identifica codigo sin usar en el sistema</div>
          </div>
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <div style="font-weight: 500; margin-bottom: 8px;">@ Integracion Git</div>
            <div style="font-size: 13px; color: ${this.colors.textSecondary};">Analiza cambios recientes y su impacto</div>
          </div>
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <div style="font-weight: 500; margin-bottom: 8px;">* Generacion de Tests</div>
            <div style="font-size: 13px; color: ${this.colors.textSecondary};">Auto-genera tests para modulos</div>
          </div>
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <div style="font-weight: 500; margin-bottom: 8px;">! Security Scan</div>
            <div style="font-size: 13px; color: ${this.colors.textSecondary};">Escanea vulnerabilidades de seguridad</div>
          </div>
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <div style="font-weight: 500; margin-bottom: 8px;">= Complejidad Ciclomatica</div>
            <div style="font-size: 13px; color: ${this.colors.textSecondary};">Mide complejidad del codigo</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>~</span> Ejecutar Analisis
          </span>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="sbd-btn sbd-btn-primary" onclick="supportBrain.runBrainAnalysis('full')">
            * Analisis Completo
          </button>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.runBrainAnalysis('security')">
            ! Security Scan
          </button>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.runBrainAnalysis('dependencies')">
            + Dependencias
          </button>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.runBrainAnalysis('dead-code')">
            X Codigo Muerto
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Tab: Notificaciones
   */
  buildNotificationsTab() {
    return `
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>#</span> Novedades y Actualizaciones
          </span>
          <span class="sbd-card-badge">3 nuevas</span>
        </div>

        <div class="sbd-notification new-feature">
          <span class="sbd-notification-icon">+</span>
          <div class="sbd-notification-content">
            <div class="sbd-notification-title">Nueva Feature: Brain Analytics</div>
            <div class="sbd-notification-text">
              Sistema de analisis inteligente del codigo con deteccion de dependencias, codigo muerto y security scan.
            </div>
            <div class="sbd-notification-time">Hace 1 hora</div>
          </div>
        </div>

        <div class="sbd-notification training">
          <span class="sbd-notification-icon">@</span>
          <div class="sbd-notification-content">
            <div class="sbd-notification-title">Capacitacion Requerida: Sistema de Tutoriales</div>
            <div class="sbd-notification-text">
              Se ha habilitado el nuevo sistema de tutoriales auto-generados. Se requiere completar la capacitacion.
            </div>
            <div class="sbd-notification-time">Hace 2 horas</div>
          </div>
        </div>

        <div class="sbd-notification update">
          <span class="sbd-notification-icon">!</span>
          <div class="sbd-notification-content">
            <div class="sbd-notification-title">Actualizacion: API de Soporte</div>
            <div class="sbd-notification-text">
              Se han agregado nuevos endpoints para generacion de tutoriales personalizados en tickets.
            </div>
            <div class="sbd-notification-time">Hace 5 horas</div>
          </div>
        </div>
      </div>

      <!-- Subscription Settings -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>=</span> Preferencias de Notificacion
          </span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <label style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${this.colors.bgTertiary}; border-radius: 8px; cursor: pointer;">
            <span>Nuevas features</span>
            <input type="checkbox" checked style="width: 20px; height: 20px;">
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${this.colors.bgTertiary}; border-radius: 8px; cursor: pointer;">
            <span>Capacitaciones obligatorias</span>
            <input type="checkbox" checked style="width: 20px; height: 20px;">
          </label>
          <label style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${this.colors.bgTertiary}; border-radius: 8px; cursor: pointer;">
            <span>Actualizaciones del sistema</span>
            <input type="checkbox" checked style="width: 20px; height: 20px;">
          </label>
        </div>
      </div>
    `;
  }

  /**
   * Construir card de tutorial
   */
  buildTutorialCard(tutorial) {
    return `
      <div class="sbd-tutorial-card" onclick="supportBrain.openTutorial('${tutorial.moduleKey}')">
        <div class="sbd-tutorial-header">
          <span class="sbd-tutorial-name">${tutorial.name}</span>
          <span class="sbd-tutorial-category">${tutorial.category || 'General'}</span>
        </div>
        <div class="sbd-tutorial-description">
          ${tutorial.description?.substring(0, 100) || 'Tutorial auto-generado por el Brain'}...
        </div>
        <div class="sbd-tutorial-formats">
          ${(tutorial.formats || []).map(f => `
            <span class="sbd-format-tag">${this.formatFormatName(f)}</span>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Formatear nombre de feature
   */
  formatFeatureName(feature) {
    const names = {
      'module-tutorials': 'Tutoriales por Modulo',
      'auto-evaluation': 'Autoevaluacion',
      'ticket-tutorials': 'Tutoriales para Tickets',
      'feature-notifications': 'Notificaciones',
      'training-progress': 'Progreso de Capacitacion',
      'support-dashboard': 'Dashboard de Soporte'
    };
    return names[feature] || feature;
  }

  /**
   * Formatear nombre de formato
   */
  formatFormatName(format) {
    const names = {
      'step_by_step': 'Paso a Paso',
      'video_script': 'Video Script',
      'faq': 'FAQ',
      'quick_reference': 'Ref. Rapida'
    };
    return names[format] || format;
  }

  /**
   * Adjuntar event listeners
   */
  attachEventListeners() {
    // Tab clicks
    document.querySelectorAll('.sbd-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Search
    const searchInput = document.getElementById('sbd-tutorial-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterTutorials(e.target.value));
    }
  }

  /**
   * Cambiar tab
   */
  switchTab(tabName) {
    this.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.sbd-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update content
    const content = document.querySelector('.sbd-content');
    switch (tabName) {
      case 'overview':
        content.innerHTML = this.buildOverviewTab();
        break;
      case 'tutorials':
        content.innerHTML = this.buildTutorialsTab();
        break;
      case 'training':
        content.innerHTML = this.buildTrainingTab();
        break;
      case 'brain':
        content.innerHTML = this.buildBrainTab();
        break;
      case 'notifications':
        content.innerHTML = this.buildNotificationsTab();
        break;
      case 'testing':
        content.innerHTML = this.buildTestingTab();
        this.loadActiveExecutions();
        break;
    }

    this.attachEventListeners();
  }

  /**
   * Filtrar tutoriales
   */
  filterTutorials(query) {
    const list = document.getElementById('sbd-tutorials-list');
    if (!list) return;

    const filtered = this.tutorials.filter(t =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.moduleKey.toLowerCase().includes(query.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(query.toLowerCase())
    );

    list.innerHTML = filtered.map(t => this.buildTutorialCard(t)).join('');
  }

  /**
   * Abrir tutorial
   */
  async openTutorial(moduleKey) {
    const content = document.querySelector('.sbd-content');
    content.innerHTML = `
      <div class="sbd-loading">
        <div class="sbd-spinner"></div>
      </div>
    `;

    try {
      const response = await fetch(`/api/training/tutorial/${moduleKey}`);
      const data = await response.json();

      if (data.success) {
        content.innerHTML = this.buildTutorialViewer(data.tutorial);
      } else {
        content.innerHTML = `
          <div class="sbd-card">
            <p style="color: ${this.colors.accentRed};">Error: ${data.error}</p>
            <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.showTutorials()">
              < Volver
            </button>
          </div>
        `;
      }
    } catch (error) {
      content.innerHTML = `
        <div class="sbd-card">
          <p style="color: ${this.colors.accentRed};">Error cargando tutorial: ${error.message}</p>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.showTutorials()">
            < Volver
          </button>
        </div>
      `;
    }
  }

  /**
   * Construir visor de tutorial
   */
  buildTutorialViewer(tutorial) {
    return `
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>+</span> ${tutorial.title}
          </span>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.showTutorials()">
            < Volver
          </button>
        </div>

        <div class="sbd-tutorial-viewer">
          ${(tutorial.steps || []).map((step, i) => `
            <div class="sbd-tutorial-step">
              <span class="sbd-tutorial-step-number">${i + 1}</span>
              <span class="sbd-tutorial-step-title">${step.title}</span>
              <div class="sbd-tutorial-step-description">${step.description}</div>
            </div>
          `).join('')}
        </div>

        ${tutorial.quiz ? `
          <div style="margin-top: 24px;">
            <button class="sbd-btn sbd-btn-primary" onclick="supportBrain.startQuiz('${tutorial.moduleKey}')">
              @ Realizar Autoevaluacion
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Public Methods for onclick handlers
  showTutorials() { this.switchTab('tutorials'); }
  showTraining() { this.switchTab('training'); }
  showBrainAnalytics() { this.switchTab('brain'); }

  async generateTicketTutorial() {
    const ticketId = prompt('Ingrese el ID del ticket:');
    if (!ticketId) return;

    const description = prompt('Descripcion del problema:');
    if (!description) return;

    try {
      const response = await fetch('/api/training/ticket-tutorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, description })
      });
      const data = await response.json();
      alert(data.success ? 'Tutorial generado exitosamente!' : `Error: ${data.error}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }

  async startTraining(moduleKey) {
    this.openTutorial(moduleKey);
  }

  async runBrainAnalysis(type) {
    const endpoints = {
      'full': '/api/brain-analyzer/full-analysis',
      'security': '/api/brain-analyzer/security',
      'dependencies': '/api/brain-analyzer/dependencies',
      'dead-code': '/api/brain-analyzer/dead-code'
    };

    alert(`Ejecutando analisis ${type}... Esto puede tomar unos segundos.`);

    try {
      const response = await fetch(endpoints[type]);
      const data = await response.json();
      console.log('[BRAIN-ANALYSIS]', data);
      alert(data.success ? 'Analisis completado! Ver consola para detalles.' : `Error: ${data.error}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }

  async startQuiz(moduleKey) {
    alert(`Iniciando quiz para ${moduleKey}...`);
    // Quiz implementation would go here
  }

  // ============================================================================
  // TAB: TESTING E2E (Conectado al Brain)
  // ============================================================================

  /**
   * Tab: Testing E2E - Modulos desde el Brain
   */
  buildTestingTab() {
    const modulesFromBrain = this.brainModules || [];
    const activeExecs = this.activeExecutions || [];

    return `
      <!-- Testing Header -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>!</span> Sistema de Testing E2E
            <span class="sbd-card-badge">Conectado al Brain</span>
          </span>
          <div style="display: flex; gap: 8px;">
            <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.refreshTestingData()">
              ~ Actualizar
            </button>
            <button class="sbd-btn sbd-btn-primary" onclick="supportBrain.runDeepTestAll()">
              ! Test Completo
            </button>
          </div>
        </div>
        <p style="color: ${this.colors.textSecondary}; margin-bottom: 16px;">
          Sistema de testing automatizado integrado con el Brain. Los modulos se obtienen
          dinamicamente del ecosistema. Selecciona un modulo para ejecutar tests E2E.
        </p>

        <!-- Quick Stats -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentBlue};">${modulesFromBrain.length}</div>
            <div style="font-size: 12px; color: ${this.colors.textSecondary};">Modulos en Brain</div>
          </div>
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentOrange};">${activeExecs.length}</div>
            <div style="font-size: 12px; color: ${this.colors.textSecondary};">Ejecuciones Activas</div>
          </div>
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentGreen};">E2E</div>
            <div style="font-size: 12px; color: ${this.colors.textSecondary};">Tipo de Test</div>
          </div>
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentPurple};">AI</div>
            <div style="font-size: 12px; color: ${this.colors.textSecondary};">Auto-Repair</div>
          </div>
        </div>
      </div>

      <!-- Active Executions -->
      <div class="sbd-card" id="sbd-active-executions">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>~</span> Ejecuciones Activas
          </span>
        </div>
        ${activeExecs.length === 0 ? `
          <p style="color: ${this.colors.textMuted}; text-align: center; padding: 20px;">
            No hay ejecuciones activas. Selecciona un modulo para iniciar un test.
          </p>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${activeExecs.map(exec => this.buildExecutionCard(exec)).join('')}
          </div>
        `}
      </div>

      <!-- Modules Grid from Brain -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>*</span> Modulos del Sistema (desde Brain)
          </span>
          <span style="color: ${this.colors.textSecondary}; font-size: 12px;">
            ${modulesFromBrain.length} modulos detectados
          </span>
        </div>

        ${modulesFromBrain.length === 0 ? `
          <div style="text-align: center; padding: 40px; color: ${this.colors.textMuted};">
            <p>No se encontraron modulos en el Brain.</p>
            <p style="font-size: 12px; margin-top: 8px;">Verifica que el Brain este activo y conectado.</p>
            <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.refreshTestingData()" style="margin-top: 16px;">
              ~ Reintentar
            </button>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
            ${modulesFromBrain.map(mod => this.buildModuleTestCard(mod)).join('')}
          </div>
        `}
      </div>

      <!-- Test History -->
      <div class="sbd-card">
        <div class="sbd-card-header">
          <span class="sbd-card-title">
            <span>#</span> Historial de Tests
          </span>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.loadTestHistory()">
            Ver Historial Completo
          </button>
        </div>
        <div id="sbd-test-history">
          <p style="color: ${this.colors.textMuted}; text-align: center; padding: 20px;">
            Cargando historial...
          </p>
        </div>
      </div>

      <!-- Test Execution Modal (hidden by default) -->
      <div id="sbd-test-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;">
        <div style="background: ${this.colors.bgSecondary}; border: 1px solid ${this.colors.border}; border-radius: 12px; width: 90%; max-width: 800px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
          <div style="padding: 16px 20px; border-bottom: 1px solid ${this.colors.border}; display: flex; justify-content: space-between; align-items: center;">
            <span id="sbd-test-modal-title" style="font-weight: 600;">Ejecutando Test</span>
            <button onclick="supportBrain.closeTestModal()" style="background: none; border: none; color: ${this.colors.textSecondary}; cursor: pointer; font-size: 20px;">x</button>
          </div>
          <div id="sbd-test-modal-content" style="flex: 1; overflow-y: auto; padding: 20px;">
            <!-- Dynamic content -->
          </div>
          <div style="padding: 16px 20px; border-top: 1px solid ${this.colors.border}; display: flex; justify-content: flex-end; gap: 12px;">
            <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.closeTestModal()">Cerrar</button>
            <button id="sbd-test-modal-stop" class="sbd-btn" style="background: ${this.colors.accentRed}; color: white; display: none;" onclick="supportBrain.stopCurrentTest()">
              Detener Test
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Construir card de modulo para testing
   */
  buildModuleTestCard(mod) {
    const key = mod.key || mod.name || 'unknown';
    const name = mod.name || key;
    const category = mod.category || 'general';
    const description = mod.description || '';

    const categoryColors = {
      'core': this.colors.accentBlue,
      'hr': this.colors.accentPurple,
      'biometric': this.colors.accentGreen,
      'reports': this.colors.accentOrange,
      'admin': this.colors.accentCyan
    };
    const color = categoryColors[category] || this.colors.accentBlue;

    return `
      <div class="sbd-tutorial-card" style="cursor: pointer;" onclick="supportBrain.showTestOptions('${key}', '${name.replace(/'/g, "\\'")}')">
        <div class="sbd-tutorial-header">
          <span class="sbd-tutorial-name">${name}</span>
          <span class="sbd-tutorial-category" style="background: ${color}20; color: ${color};">${category}</span>
        </div>
        <p class="sbd-tutorial-description">${description.substring(0, 80)}${description.length > 80 ? '...' : ''}</p>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <span class="sbd-format-tag" style="color: ${this.colors.accentGreen};">E2E</span>
          <span class="sbd-format-tag" style="color: ${this.colors.accentPurple};">DB</span>
          <span class="sbd-format-tag" style="color: ${this.colors.accentOrange};">UI</span>
        </div>
      </div>
    `;
  }

  /**
   * Construir card de ejecucion activa
   */
  buildExecutionCard(exec) {
    const statusColors = {
      'starting': this.colors.accentOrange,
      'running': this.colors.accentBlue,
      'completed': this.colors.accentGreen,
      'failed': this.colors.accentRed,
      'killed': this.colors.textMuted
    };
    const color = statusColors[exec.status] || this.colors.accentBlue;

    return `
      <div style="padding: 12px; background: ${this.colors.bgTertiary}; border-radius: 8px; border-left: 3px solid ${color};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: 600;">${exec.module || 'Unknown'}</span>
            <span style="margin-left: 8px; padding: 2px 8px; background: ${color}20; color: ${color}; border-radius: 4px; font-size: 11px;">${exec.status}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="sbd-btn sbd-btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="supportBrain.viewExecutionLogs('${exec.executionId}')">
              Ver Logs
            </button>
            ${exec.status === 'running' ? `
              <button class="sbd-btn" style="padding: 6px 12px; font-size: 12px; background: ${this.colors.accentRed}; color: white;" onclick="supportBrain.killExecution('${exec.executionId}')">
                Detener
              </button>
            ` : ''}
          </div>
        </div>
        <div style="font-size: 12px; color: ${this.colors.textMuted}; margin-top: 4px;">
          ID: ${exec.executionId?.substring(0, 8)}... | Env: ${exec.environment || 'local'} | Inicio: ${new Date(exec.startTime).toLocaleTimeString()}
        </div>
      </div>
    `;
  }

  /**
   * Mostrar opciones de test para un modulo
   */
  showTestOptions(moduleKey, moduleName) {
    const modal = document.getElementById('sbd-test-modal');
    const title = document.getElementById('sbd-test-modal-title');
    const content = document.getElementById('sbd-test-modal-content');
    const stopBtn = document.getElementById('sbd-test-modal-stop');

    title.textContent = `Test: ${moduleName}`;
    stopBtn.style.display = 'none';

    content.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <p style="color: ${this.colors.textSecondary};">
          Selecciona el tipo de test a ejecutar para el modulo <strong>${moduleName}</strong>:
        </p>

        <!-- TEST INTELIGENTE - CONECTADO AL BRAIN (NUEVO) -->
        <div style="padding: 16px; background: linear-gradient(135deg, ${this.colors.bgTertiary}, rgba(88, 166, 255, 0.1)); border-radius: 8px; border: 2px solid ${this.colors.accentBlue}; position: relative;">
          <span style="position: absolute; top: -10px; right: 12px; background: ${this.colors.accentBlue}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">RECOMENDADO</span>
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h4 style="margin: 0 0 8px 0; color: ${this.colors.accentBlue};">Test Inteligente (Brain)</h4>
              <p style="font-size: 13px; color: ${this.colors.textSecondary}; margin: 0;">
                Tests generados automaticamente desde el <strong>codigo vivo</strong>:
              </p>
              <ul style="font-size: 12px; color: ${this.colors.textMuted}; margin: 8px 0 0 16px; padding: 0;">
                <li>Escanea formularios del frontend</li>
                <li>Detecta campos required, tipos de datos</li>
                <li>Genera tests de API desde endpoints</li>
                <li>Crea tests CRUD automaticos</li>
              </ul>
              <div id="intelligent-test-preview-${moduleKey}" style="margin-top: 12px; font-size: 12px; color: ${this.colors.textMuted};">
                <span class="sbd-spinner" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></span>
                Analizando modulo...
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button class="sbd-btn sbd-btn-primary" onclick="supportBrain.runIntelligentTest('${moduleKey}')">
                * Test Inteligente
              </button>
              <button class="sbd-btn sbd-btn-secondary" style="font-size: 11px; padding: 6px 12px;" onclick="supportBrain.viewTestPlan('${moduleKey}')">
                Ver Plan
              </button>
            </div>
          </div>
        </div>

        <!-- Test Visible E2E -->
        <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px; border: 1px solid ${this.colors.border};">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h4 style="margin: 0 0 8px 0; color: ${this.colors.accentOrange};">Test E2E Visible (Playwright)</h4>
              <p style="font-size: 13px; color: ${this.colors.textSecondary}; margin: 0;">
                Ejecuta tests End-to-End con navegador visible.
                Puedes observar la ejecucion en tiempo real.
              </p>
              <div style="margin-top: 12px; display: flex; gap: 12px; align-items: center;">
                <label style="font-size: 12px; color: ${this.colors.textMuted};">
                  Ciclos: <input type="number" id="test-cycles" value="3" min="1" max="10" style="width: 50px; background: ${this.colors.bgSecondary}; border: 1px solid ${this.colors.border}; border-radius: 4px; padding: 4px; color: ${this.colors.textPrimary};">
                </label>
                <label style="font-size: 12px; color: ${this.colors.textMuted};">
                  SlowMo: <input type="number" id="test-slowmo" value="100" min="0" max="500" step="50" style="width: 60px; background: ${this.colors.bgSecondary}; border: 1px solid ${this.colors.border}; border-radius: 4px; padding: 4px; color: ${this.colors.textPrimary};"> ms
                </label>
              </div>
            </div>
            <button class="sbd-btn" style="background: ${this.colors.accentOrange}; color: white;" onclick="supportBrain.runVisibleTest('${moduleKey}')">
              ! Ejecutar
            </button>
          </div>
        </div>

        <!-- Test Profundo con Auto-Repair -->
        <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px; border: 1px solid ${this.colors.border};">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h4 style="margin: 0 0 8px 0; color: ${this.colors.accentPurple};">Test Profundo + Auto-Repair</h4>
              <p style="font-size: 13px; color: ${this.colors.textSecondary}; margin: 0;">
                Ejecuta tests completos con auto-reparacion inteligente (IA).
                Genera reportes tecnicos detallados.
              </p>
              <div style="margin-top: 12px; display: flex; gap: 12px; align-items: center;">
                <label style="font-size: 12px; color: ${this.colors.textMuted};">
                  <input type="checkbox" id="test-auto-approve" checked> Auto-aprobar fixes
                </label>
                <label style="font-size: 12px; color: ${this.colors.textMuted};">
                  Max retries: <input type="number" id="test-retries" value="2" min="1" max="5" style="width: 40px; background: ${this.colors.bgSecondary}; border: 1px solid ${this.colors.border}; border-radius: 4px; padding: 4px; color: ${this.colors.textPrimary};">
                </label>
              </div>
            </div>
            <button class="sbd-btn" style="background: linear-gradient(135deg, ${this.colors.accentPurple}, ${this.colors.accentBlue}); color: white;" onclick="supportBrain.runDeepTest('${moduleKey}')">
              * Deep Test
            </button>
          </div>
        </div>

        <!-- Health Check Rapido -->
        <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px; border: 1px solid ${this.colors.border};">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h4 style="margin: 0 0 8px 0; color: ${this.colors.accentGreen};">Health Check Rapido</h4>
              <p style="font-size: 13px; color: ${this.colors.textSecondary}; margin: 0;">
                Verifica el estado del modulo via Brain Analyzer.
                No ejecuta tests E2E, solo analiza estructura y dependencias.
              </p>
            </div>
            <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.runHealthCheck('${moduleKey}')">
              @ Health
            </button>
          </div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    // Cargar preview del test inteligente
    this.loadIntelligentTestPreview(moduleKey);
  }

  /**
   * Cargar preview del plan de test inteligente
   */
  async loadIntelligentTestPreview(moduleKey) {
    const previewDiv = document.getElementById(`intelligent-test-preview-${moduleKey}`);
    if (!previewDiv) return;

    try {
      const response = await fetch(`/api/brain-testing/plan/${moduleKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        const plan = data.data;
        const tests = plan.tests || [];
        const forms = plan.forms || {};

        previewDiv.innerHTML = `
          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <span style="color: ${this.colors.accentBlue};">
              <strong>${tests.length}</strong> tests generados
            </span>
            <span style="color: ${this.colors.accentGreen};">
              <strong>${forms.total || 0}</strong> formularios
            </span>
            <span style="color: ${this.colors.accentOrange};">
              <strong>${plan.moduleInfo?.endpoints?.length || 0}</strong> endpoints
            </span>
          </div>
        `;
      } else {
        previewDiv.innerHTML = `<span style="color: ${this.colors.textMuted};">Sin datos disponibles</span>`;
      }
    } catch (error) {
      previewDiv.innerHTML = `<span style="color: ${this.colors.accentRed};">Error cargando preview</span>`;
    }
  }

  /**
   * Ver plan de tests completo
   */
  async viewTestPlan(moduleKey) {
    const content = document.getElementById('sbd-test-modal-content');
    const title = document.getElementById('sbd-test-modal-title');

    title.textContent = `Plan de Tests: ${moduleKey}`;

    content.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="sbd-spinner" style="width: 50px; height: 50px; margin: 0 auto 16px;"></div>
        <p>Generando plan de tests inteligente...</p>
      </div>
    `;

    try {
      const response = await fetch(`/api/brain-testing/plan/${moduleKey}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido');
      }

      const plan = data.data;

      content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Resumen -->
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <h4 style="margin: 0 0 12px 0; color: ${this.colors.accentBlue};">Resumen del Plan</h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentBlue};">${plan.tests?.length || 0}</div>
                <div style="font-size: 11px; color: ${this.colors.textMuted};">Tests</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentGreen};">${plan.forms?.total || 0}</div>
                <div style="font-size: 11px; color: ${this.colors.textMuted};">Formularios</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentOrange};">${plan.moduleInfo?.endpoints?.length || 0}</div>
                <div style="font-size: 11px; color: ${this.colors.textMuted};">Endpoints</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentPurple};">${plan.moduleInfo?.crudAnalysis?.isComplete ? 'Si' : 'No'}</div>
                <div style="font-size: 11px; color: ${this.colors.textMuted};">CRUD Completo</div>
              </div>
            </div>
          </div>

          <!-- Tests -->
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <h4 style="margin: 0 0 12px 0; color: ${this.colors.textPrimary};">Tests a Ejecutar</h4>
            <div style="max-height: 300px; overflow-y: auto;">
              ${(plan.tests || []).map((test, idx) => `
                <div style="padding: 8px; margin-bottom: 8px; background: ${this.colors.bgSecondary}; border-radius: 4px; border-left: 3px solid ${this.getTestColor(test.category)};">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 500;">${idx + 1}. ${test.name}</span>
                    <span style="padding: 2px 6px; background: ${this.getTestColor(test.category)}20; color: ${this.getTestColor(test.category)}; border-radius: 4px; font-size: 10px;">${test.category}</span>
                  </div>
                  <p style="font-size: 11px; color: ${this.colors.textMuted}; margin: 4px 0 0 0;">${test.description || ''}</p>
                  ${test.fields?.length ? `<span style="font-size: 10px; color: ${this.colors.textMuted};">${test.fields.length} campos</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Formularios detectados -->
          ${plan.forms?.details?.length ? `
            <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
              <h4 style="margin: 0 0 12px 0; color: ${this.colors.textPrimary};">Formularios Detectados</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${plan.forms.details.map(form => `
                  <span style="padding: 4px 8px; background: ${this.colors.bgSecondary}; border-radius: 4px; font-size: 12px;">
                    ${form.id} (${form.fields?.length || 0} campos)
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.showTestOptions('${moduleKey}', '${moduleKey}')">
              Volver
            </button>
            <button class="sbd-btn sbd-btn-primary" onclick="supportBrain.runIntelligentTest('${moduleKey}')">
              * Ejecutar ${plan.tests?.length || 0} Tests
            </button>
          </div>
        </div>
      `;

    } catch (error) {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: ${this.colors.accentRed};">
          <p>Error generando plan: ${error.message}</p>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.showTestOptions('${moduleKey}', '${moduleKey}')" style="margin-top: 16px;">
            Volver
          </button>
        </div>
      `;
    }
  }

  /**
   * Obtener color por categoria de test
   */
  getTestColor(category) {
    const colors = {
      'endpoint': this.colors.accentBlue,
      'api': this.colors.accentBlue,
      'form': this.colors.accentGreen,
      'modal-form': this.colors.accentGreen,
      'crud': this.colors.accentPurple,
      'validation': this.colors.accentOrange
    };
    return colors[category] || this.colors.textMuted;
  }

  /**
   * Ejecutar test inteligente
   */
  async runIntelligentTest(moduleKey) {
    const content = document.getElementById('sbd-test-modal-content');
    const title = document.getElementById('sbd-test-modal-title');
    const stopBtn = document.getElementById('sbd-test-modal-stop');

    title.textContent = `Test Inteligente: ${moduleKey}`;
    stopBtn.style.display = 'none';

    content.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="sbd-spinner" style="width: 50px; height: 50px; margin: 0 auto 16px;"></div>
        <p>Ejecutando tests inteligentes...</p>
        <p style="font-size: 12px; color: ${this.colors.textMuted};">Tests generados desde codigo vivo (Brain)</p>
      </div>
    `;

    try {
      const response = await fetch(`/api/brain-testing/execute/${moduleKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido');
      }

      const execution = data.data;
      const summary = execution.summary || {};

      content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Resumen de ejecucion -->
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <h4 style="margin: 0 0 12px 0; color: ${this.colors.accentGreen};">Ejecucion Completada</h4>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; text-align: center;">
              <div>
                <div style="font-size: 24px; font-weight: 700; color: ${this.colors.textPrimary};">${summary.total || 0}</div>
                <div style="font-size: 11px; color: ${this.colors.textMuted};">Total</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentGreen};">${summary.passed || 0}</div>
                <div style="font-size: 11px; color: ${this.colors.textMuted};">Passed</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentRed};">${summary.failed || 0}</div>
                <div style="font-size: 11px; color: ${this.colors.textMuted};">Failed</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentOrange};">${summary.pending || 0}</div>
                <div style="font-size: 11px; color: ${this.colors.textMuted};">Pending</div>
              </div>
              <div>
                <div style="font-size: 24px; font-weight: 700; color: ${this.colors.textMuted};">${summary.skipped || 0}</div>
                <div style="font-size: 11px; color: ${this.colors.textMuted};">Skipped</div>
              </div>
            </div>
          </div>

          <!-- Resultados detallados -->
          <div style="padding: 16px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
            <h4 style="margin: 0 0 12px 0; color: ${this.colors.textPrimary};">Resultados por Test</h4>
            <div style="max-height: 250px; overflow-y: auto;">
              ${(execution.results || []).map((result, idx) => `
                <div style="padding: 8px; margin-bottom: 8px; background: ${this.colors.bgSecondary}; border-radius: 4px; border-left: 3px solid ${this.getStatusColor(result.status)};">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px;">${idx + 1}. ${result.testName}</span>
                    <span style="padding: 2px 6px; background: ${this.getStatusColor(result.status)}20; color: ${this.getStatusColor(result.status)}; border-radius: 4px; font-size: 10px; font-weight: 600;">${result.status}</span>
                  </div>
                  ${result.error ? `<p style="font-size: 11px; color: ${this.colors.accentRed}; margin: 4px 0 0 0;">${result.error}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.closeTestModal()">
              Cerrar
            </button>
            <button class="sbd-btn sbd-btn-primary" onclick="supportBrain.runIntelligentTest('${moduleKey}')">
              ~ Ejecutar de Nuevo
            </button>
          </div>
        </div>
      `;

    } catch (error) {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: ${this.colors.accentRed};">
          <p>Error ejecutando tests: ${error.message}</p>
          <button class="sbd-btn sbd-btn-secondary" onclick="supportBrain.showTestOptions('${moduleKey}', '${moduleKey}')" style="margin-top: 16px;">
            Volver
          </button>
        </div>
      `;
    }
  }

  /**
   * Obtener color por status de test
   */
  getStatusColor(status) {
    const colors = {
      'passed': this.colors.accentGreen,
      'failed': this.colors.accentRed,
      'error': this.colors.accentRed,
      'pending': this.colors.accentOrange,
      'skipped': this.colors.textMuted
    };
    return colors[status] || this.colors.textMuted;
  }

  /**
   * Cerrar modal de test
   */
  closeTestModal() {
    document.getElementById('sbd-test-modal').style.display = 'none';
    // Limpiar polling si existe
    if (this.currentTestPolling) {
      clearInterval(this.currentTestPolling);
      this.currentTestPolling = null;
    }
  }

  /**
   * Ejecutar test E2E visible
   */
  async runVisibleTest(moduleKey) {
    const cycles = parseInt(document.getElementById('test-cycles')?.value) || 3;
    const slowMo = parseInt(document.getElementById('test-slowmo')?.value) || 100;

    const content = document.getElementById('sbd-test-modal-content');
    const stopBtn = document.getElementById('sbd-test-modal-stop');
    const title = document.getElementById('sbd-test-modal-title');

    title.textContent = `Ejecutando Test: ${moduleKey}`;
    content.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="sbd-spinner" style="width: 50px; height: 50px; margin: 0 auto 16px;"></div>
        <p>Iniciando test E2E visible...</p>
        <p style="font-size: 12px; color: ${this.colors.textMuted};">El navegador deberia abrirse en breve</p>
      </div>
    `;

    try {
      const response = await fetch('/api/testing/run-visible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: 'local',
          module: moduleKey,
          cycles,
          slowMo,
          companyId: 11 // Default company
        })
      });

      const data = await response.json();

      if (data.success) {
        this.currentExecutionId = data.executionId;
        stopBtn.style.display = 'block';
        this.startExecutionPolling(data.executionId);
      } else {
        content.innerHTML = `
          <div style="text-align: center; padding: 40px; color: ${this.colors.accentRed};">
            <p style="font-size: 32px;">!</p>
            <p>Error iniciando test: ${data.message || 'Unknown error'}</p>
          </div>
        `;
      }
    } catch (error) {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: ${this.colors.accentRed};">
          <p style="font-size: 32px;">!</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Ejecutar test profundo con auto-repair
   */
  async runDeepTest(moduleKey) {
    const autoApprove = document.getElementById('test-auto-approve')?.checked ?? true;
    const maxRetries = parseInt(document.getElementById('test-retries')?.value) || 2;

    const content = document.getElementById('sbd-test-modal-content');
    const title = document.getElementById('sbd-test-modal-title');

    title.textContent = `Deep Test: ${moduleKey}`;
    content.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="sbd-spinner" style="width: 50px; height: 50px; margin: 0 auto 16px;"></div>
        <p>Iniciando test profundo con auto-repair...</p>
        <p style="font-size: 12px; color: ${this.colors.textMuted};">Esto puede tomar varios minutos</p>
      </div>
    `;

    try {
      const response = await fetch('/api/audit/test/deep-with-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleKey,
          maxRetries,
          autoApprove,
          includeComparison: true
        })
      });

      const data = await response.json();

      if (data.success) {
        content.innerHTML = `
          <div style="padding: 20px;">
            <div style="margin-bottom: 16px; padding: 12px; background: ${this.colors.accentGreen}20; border-radius: 8px; color: ${this.colors.accentGreen};">
              Test iniciado correctamente
            </div>
            <p style="margin-bottom: 12px;"><strong>Execution ID:</strong> ${data.execution_id}</p>
            <p style="margin-bottom: 12px;"><strong>Status:</strong> ${data.status}</p>
            <div style="margin-bottom: 16px;">
              <strong>Features incluidas:</strong>
              <ul style="margin-top: 8px; padding-left: 20px; color: ${this.colors.textSecondary};">
                ${data.features.map(f => `<li style="margin-bottom: 4px;">${f}</li>`).join('')}
              </ul>
            </div>
            <div style="background: ${this.colors.bgTertiary}; padding: 12px; border-radius: 8px; font-size: 12px;">
              <p style="margin-bottom: 8px;"><strong>Ver reporte:</strong></p>
              <code style="color: ${this.colors.accentCyan};">${data.endpoints?.download_report}</code>
            </div>
          </div>
        `;

        // Refrescar datos
        this.loadActiveExecutions();
      } else {
        content.innerHTML = `
          <div style="text-align: center; padding: 40px; color: ${this.colors.accentRed};">
            <p style="font-size: 32px;">!</p>
            <p>Error: ${data.error || 'Unknown error'}</p>
          </div>
        `;
      }
    } catch (error) {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: ${this.colors.accentRed};">
          <p style="font-size: 32px;">!</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Health check de modulo
   */
  async runHealthCheck(moduleKey) {
    const content = document.getElementById('sbd-test-modal-content');
    const title = document.getElementById('sbd-test-modal-title');

    title.textContent = `Health Check: ${moduleKey}`;
    content.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="sbd-spinner" style="width: 50px; height: 50px; margin: 0 auto 16px;"></div>
        <p>Analizando modulo...</p>
      </div>
    `;

    try {
      const response = await fetch(`/api/training/module-health/${moduleKey}`);
      const data = await response.json();

      if (data.success) {
        content.innerHTML = `
          <div style="padding: 20px;">
            <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 32px; color: ${data.data?.health?.status === 'operational' ? this.colors.accentGreen : this.colors.accentOrange};">
                ${data.data?.health?.status === 'operational' ? 'ok' : '!'}
              </span>
              <div>
                <h3 style="margin: 0;">${moduleKey}</h3>
                <span style="color: ${this.colors.textSecondary};">Status: ${data.data?.health?.status || 'unknown'}</span>
              </div>
            </div>
            <pre style="background: ${this.colors.bgTertiary}; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; color: ${this.colors.textSecondary};">
${JSON.stringify(data.data, null, 2)}
            </pre>
          </div>
        `;
      } else {
        content.innerHTML = `
          <div style="text-align: center; padding: 40px; color: ${this.colors.accentRed};">
            <p>Error: ${data.error}</p>
          </div>
        `;
      }
    } catch (error) {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: ${this.colors.accentRed};">
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Polling de estado de ejecucion
   */
  startExecutionPolling(executionId) {
    const content = document.getElementById('sbd-test-modal-content');

    this.currentTestPolling = setInterval(async () => {
      try {
        const response = await fetch(`/api/testing/execution-status/${executionId}`);
        const data = await response.json();

        if (data.success) {
          const logsHtml = (data.logs || []).map(log => {
            const color = log.type === 'error' ? this.colors.accentRed :
                          log.type === 'success' ? this.colors.accentGreen :
                          log.type === 'warning' ? this.colors.accentOrange :
                          this.colors.textSecondary;
            return `<div style="margin-bottom: 4px; font-size: 12px;">
              <span style="color: ${this.colors.textMuted};">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span style="color: ${color};">${log.message}</span>
            </div>`;
          }).join('');

          content.innerHTML = `
            <div style="padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span>Status: <strong style="color: ${data.status === 'completed' ? this.colors.accentGreen : data.status === 'failed' ? this.colors.accentRed : this.colors.accentBlue};">${data.status}</strong></span>
                <span>Progress: ${data.progress}%</span>
              </div>
              <div class="sbd-progress-bar" style="margin-bottom: 16px;">
                <div class="sbd-progress-fill" style="width: ${data.progress}%;"></div>
              </div>
              <div style="background: ${this.colors.bgTertiary}; border-radius: 8px; padding: 12px; max-height: 300px; overflow-y: auto; font-family: monospace;">
                ${logsHtml || '<p style="color: ' + this.colors.textMuted + ';">Esperando logs...</p>'}
              </div>
              ${data.results ? `
                <div style="margin-top: 16px; padding: 12px; background: ${this.colors.bgTertiary}; border-radius: 8px;">
                  <h4 style="margin-bottom: 12px;">Resultados:</h4>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                    <div style="text-align: center;">
                      <div style="font-size: 24px; font-weight: 700; color: ${this.colors.textPrimary};">${data.results.total || 0}</div>
                      <div style="font-size: 11px; color: ${this.colors.textMuted};">Total</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentGreen};">${data.results.passed || 0}</div>
                      <div style="font-size: 11px; color: ${this.colors.textMuted};">Passed</div>
                    </div>
                    <div style="text-align: center;">
                      <div style="font-size: 24px; font-weight: 700; color: ${this.colors.accentRed};">${data.results.failed || 0}</div>
                      <div style="font-size: 11px; color: ${this.colors.textMuted};">Failed</div>
                    </div>
                  </div>
                  <div style="margin-top: 12px; text-align: center;">
                    <span style="color: ${this.colors.textSecondary};">Success Rate: </span>
                    <strong>${data.results.successRate || 0}%</strong>
                  </div>
                </div>
              ` : ''}
            </div>
          `;

          // Detener polling si termino
          if (['completed', 'failed', 'killed'].includes(data.status)) {
            clearInterval(this.currentTestPolling);
            this.currentTestPolling = null;
            document.getElementById('sbd-test-modal-stop').style.display = 'none';
            this.loadActiveExecutions();
          }
        }
      } catch (error) {
        console.error('[TESTING] Error polling:', error);
      }
    }, 2000);
  }

  /**
   * Detener test actual
   */
  async stopCurrentTest() {
    if (!this.currentExecutionId) return;

    try {
      await fetch(`/api/testing/kill-execution/${this.currentExecutionId}`, { method: 'POST' });
      if (this.currentTestPolling) {
        clearInterval(this.currentTestPolling);
        this.currentTestPolling = null;
      }
      this.loadActiveExecutions();
    } catch (error) {
      console.error('[TESTING] Error stopping test:', error);
    }
  }

  /**
   * Cargar ejecuciones activas
   */
  async loadActiveExecutions() {
    try {
      const response = await fetch('/api/testing/active-executions');
      const data = await response.json();
      this.activeExecutions = data.executions || [];

      const container = document.getElementById('sbd-active-executions');
      if (container && this.currentTab === 'testing') {
        const cardContent = container.querySelector('.sbd-card-header').nextElementSibling;
        if (this.activeExecutions.length === 0) {
          if (cardContent?.tagName === 'P') {
            // Ya esta vacio, no hacer nada
          } else {
            container.innerHTML = `
              <div class="sbd-card-header">
                <span class="sbd-card-title">
                  <span>~</span> Ejecuciones Activas
                </span>
              </div>
              <p style="color: ${this.colors.textMuted}; text-align: center; padding: 20px;">
                No hay ejecuciones activas.
              </p>
            `;
          }
        } else {
          container.innerHTML = `
            <div class="sbd-card-header">
              <span class="sbd-card-title">
                <span>~</span> Ejecuciones Activas
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${this.activeExecutions.map(exec => this.buildExecutionCard(exec)).join('')}
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('[TESTING] Error loading active executions:', error);
    }
  }

  /**
   * Ver logs de una ejecucion
   */
  async viewExecutionLogs(executionId) {
    const modal = document.getElementById('sbd-test-modal');
    const title = document.getElementById('sbd-test-modal-title');
    const content = document.getElementById('sbd-test-modal-content');

    title.textContent = `Logs: ${executionId.substring(0, 8)}...`;
    content.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="sbd-spinner"></div><p>Cargando logs...</p></div>`;
    modal.style.display = 'flex';

    try {
      const response = await fetch(`/api/testing/execution-status/${executionId}`);
      const data = await response.json();

      const logsHtml = (data.logs || []).map(log => {
        const color = log.type === 'error' ? this.colors.accentRed :
                      log.type === 'success' ? this.colors.accentGreen :
                      log.type === 'warning' ? this.colors.accentOrange :
                      this.colors.textSecondary;
        return `<div style="margin-bottom: 4px; font-size: 12px;">
          <span style="color: ${this.colors.textMuted};">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
          <span style="color: ${color};">${log.message}</span>
        </div>`;
      }).join('');

      content.innerHTML = `
        <div style="background: ${this.colors.bgTertiary}; border-radius: 8px; padding: 12px; max-height: 400px; overflow-y: auto; font-family: monospace;">
          ${logsHtml || '<p style="color: ' + this.colors.textMuted + ';">No hay logs disponibles</p>'}
        </div>
      `;
    } catch (error) {
      content.innerHTML = `<p style="color: ${this.colors.accentRed};">Error: ${error.message}</p>`;
    }
  }

  /**
   * Matar ejecucion
   */
  async killExecution(executionId) {
    if (!confirm('Seguro que deseas detener esta ejecucion?')) return;

    try {
      await fetch(`/api/testing/kill-execution/${executionId}`, { method: 'POST' });
      this.loadActiveExecutions();
    } catch (error) {
      alert('Error deteniendo ejecucion: ' + error.message);
    }
  }

  /**
   * Refrescar datos de testing
   */
  async refreshTestingData() {
    // Recargar modulos del Brain
    try {
      const modulesRes = await fetch('/api/brain/technical-modules');
      const modulesData = await modulesRes.json();
      this.brainModules = modulesData.data?.modules || modulesData.modules || [];
    } catch (e) {
      console.log('[TESTING] Error refreshing modules:', e.message);
    }

    // Recargar ejecuciones
    await this.loadActiveExecutions();

    // Re-renderizar tab
    if (this.currentTab === 'testing') {
      this.switchTab('testing');
    }
  }

  /**
   * Test completo de todos los modulos
   */
  async runDeepTestAll() {
    if (!confirm('Esto ejecutara un test profundo de TODOS los modulos. Puede tomar varios minutos. Continuar?')) return;

    const modal = document.getElementById('sbd-test-modal');
    const title = document.getElementById('sbd-test-modal-title');
    const content = document.getElementById('sbd-test-modal-content');

    title.textContent = 'Test Completo del Sistema';
    content.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="sbd-spinner" style="width: 50px; height: 50px; margin: 0 auto 16px;"></div>
        <p>Iniciando test completo...</p>
      </div>
    `;
    modal.style.display = 'flex';

    try {
      const response = await fetch('/api/audit/test/deep-with-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleKey: null, // Todos los modulos
          maxRetries: 2,
          autoApprove: true,
          includeComparison: true
        })
      });

      const data = await response.json();

      if (data.success) {
        content.innerHTML = `
          <div style="padding: 20px;">
            <div style="margin-bottom: 16px; padding: 12px; background: ${this.colors.accentGreen}20; border-radius: 8px; color: ${this.colors.accentGreen};">
              Test completo iniciado
            </div>
            <p><strong>Execution ID:</strong> ${data.execution_id}</p>
            <p style="margin-top: 12px; color: ${this.colors.textSecondary};">
              El test se ejecuta en background. Puedes cerrar este modal y verificar el progreso
              en la seccion de Ejecuciones Activas.
            </p>
          </div>
        `;
        this.loadActiveExecutions();
      } else {
        content.innerHTML = `<p style="color: ${this.colors.accentRed};">Error: ${data.error}</p>`;
      }
    } catch (error) {
      content.innerHTML = `<p style="color: ${this.colors.accentRed};">Error: ${error.message}</p>`;
    }
  }

  /**
   * Cargar historial de tests
   */
  async loadTestHistory() {
    const container = document.getElementById('sbd-test-history');
    if (!container) return;

    container.innerHTML = '<p style="text-align: center; padding: 20px;"><span class="sbd-spinner"></span> Cargando...</p>';

    try {
      const response = await fetch('/api/testing/history?limit=10');
      const data = await response.json();

      if (data.success && data.executions?.length > 0) {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${data.executions.map(exec => `
              <div style="padding: 12px; background: ${this.colors.bgTertiary}; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-weight: 600;">${exec.module || 'System'}</span>
                  <span style="margin-left: 8px; padding: 2px 6px; background: ${exec.status === 'completed' ? this.colors.accentGreen : this.colors.accentRed}20; color: ${exec.status === 'completed' ? this.colors.accentGreen : this.colors.accentRed}; border-radius: 4px; font-size: 10px;">${exec.status}</span>
                </div>
                <span style="font-size: 11px; color: ${this.colors.textMuted};">${new Date(exec.created_at).toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        container.innerHTML = '<p style="color: ' + this.colors.textMuted + '; text-align: center; padding: 20px;">No hay historial disponible</p>';
      }
    } catch (error) {
      container.innerHTML = '<p style="color: ' + this.colors.accentRed + '; text-align: center; padding: 20px;">Error cargando historial</p>';
    }
  }

  showTesting() { this.switchTab('testing'); }
}

// Initialize and expose globally
const supportBrain = new SupportBrainDashboard();
window.supportBrain = supportBrain;

console.log('[SUPPORT-BRAIN] Dashboard cargado. Usar supportBrain.render("containerId") para mostrar.');
