/**
 * ============================================================================
 * PROCESS CHAIN ANALYTICS DASHBOARD - Professional Analytics Visualization
 * ============================================================================
 *
 * Dashboard profesional para visualizar métricas y analytics de Process Chains:
 * - Overall stats (requests, completion rate, avg time, users)
 * - Top 10 actions chart (horizontal bar chart)
 * - Module stats chart (pie/donut chart)
 * - Time trends (line chart)
 * - Bottlenecks table (severity indicators)
 * - Period selector (7, 30, 90 días)
 * - Auto-refresh (configurable)
 * - Dark mode support
 * - Responsive design
 *
 * Dependencies: NINGUNA (vanilla JS + Canvas API para charts)
 *
 * Usage:
 * const dashboard = new ProcessChainAnalyticsDashboard('container-id', {
 *   companyId: 1,
 *   theme: 'dark',
 *   refreshInterval: 60000
 * });
 *
 * @version 1.0.0
 * @date 2025-12-11
 * ============================================================================
 */

console.log('✅ [ANALYTICS] ProcessChainAnalyticsDashboard.js cargado');

class ProcessChainAnalyticsDashboard {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error(`❌ [ANALYTICS] Container "${containerId}" no encontrado`);
      return;
    }

    // Configuración
    this.companyId = options.companyId;
    this.theme = options.theme || 'light';
    this.refreshInterval = options.refreshInterval || 60000; // 1 min default

    // Estado interno
    this.state = {
      loading: false,
      error: null,
      dashboardData: null,
      selectedPeriod: 30, // días por defecto
      charts: {} // Almacenar instancias de charts para resize/destroy
    };

    // Timers
    this.refreshTimer = null;
    this.resizeTimer = null;

    console.log(`🚀 [ANALYTICS] Inicializando dashboard para company ${this.companyId}`);
    this.init();
  }

  /**
   * Inicialización del dashboard
   */
  async init() {
    this.injectStyles();
    this.render();
    await this.loadData();
    this.setupEventListeners();
    this.startAutoRefresh();

    console.log('✅ [ANALYTICS] Dashboard inicializado correctamente');
  }

  /**
   * Inyectar estilos CSS (una sola vez)
   */
  injectStyles() {
    if (document.getElementById('process-chain-analytics-styles')) {
      return; // Ya inyectado
    }

    const style = document.createElement('style');
    style.id = 'process-chain-analytics-styles';
    style.textContent = `
      /* ========================================
         PROCESS CHAIN ANALYTICS DASHBOARD STYLES
         ======================================== */

      .pc-analytics-dashboard {
        width: 100%;
        min-height: 600px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f9fafb;
        padding: 20px;
        box-sizing: border-box;
      }

      /* Dark theme */
      .pc-analytics-dashboard[data-theme="dark"] {
        background: #1f2937;
        color: #f3f4f6;
      }

      /* Period Selector */
      .pc-period-selector {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-bottom: 30px;
      }

      .pc-period-btn {
        padding: 10px 24px;
        border: 2px solid #d1d5db;
        background: white;
        color: #374151;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .pc-period-btn:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .pc-period-btn.active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      [data-theme="dark"] .pc-period-btn {
        background: #374151;
        color: #f3f4f6;
        border-color: #4b5563;
      }

      [data-theme="dark"] .pc-period-btn:hover {
        background: #4b5563;
        border-color: #6b7280;
      }

      [data-theme="dark"] .pc-period-btn.active {
        background: #3b82f6;
        border-color: #3b82f6;
      }

      /* Stats Cards Grid */
      .pc-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }

      .pc-stat-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .pc-stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      [data-theme="dark"] .pc-stat-card {
        background: #374151;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .pc-stat-icon {
        font-size: 28px;
        margin-bottom: 12px;
      }

      .pc-stat-label {
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 8px;
        font-weight: 500;
      }

      [data-theme="dark"] .pc-stat-label {
        color: #9ca3af;
      }

      .pc-stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 8px;
      }

      [data-theme="dark"] .pc-stat-value {
        color: #f3f4f6;
      }

      .pc-stat-change {
        font-size: 12px;
        font-weight: 600;
      }

      .pc-stat-change.positive {
        color: #10b981;
      }

      .pc-stat-change.negative {
        color: #ef4444;
      }

      /* Charts Grid */
      .pc-charts-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 20px;
        margin-bottom: 30px;
      }

      @media (max-width: 1024px) {
        .pc-charts-grid {
          grid-template-columns: 1fr;
        }
      }

      .pc-chart-container {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      [data-theme="dark"] .pc-chart-container {
        background: #374151;
      }

      .pc-chart-title {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 20px;
      }

      [data-theme="dark"] .pc-chart-title {
        color: #f3f4f6;
      }

      .pc-chart-canvas {
        width: 100%;
        height: 300px;
      }

      /* Horizontal Bar Chart */
      .pc-bar-chart {
        width: 100%;
      }

      .pc-bar-item {
        margin-bottom: 16px;
      }

      .pc-bar-label {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #374151;
        margin-bottom: 6px;
      }

      [data-theme="dark"] .pc-bar-label {
        color: #d1d5db;
      }

      .pc-bar-wrapper {
        width: 100%;
        height: 24px;
        background: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }

      [data-theme="dark"] .pc-bar-wrapper {
        background: #4b5563;
      }

      .pc-bar-fill {
        height: 100%;
        transition: width 0.5s ease;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: 8px;
        color: white;
        font-size: 12px;
        font-weight: 600;
      }

      .pc-bar-fill.high {
        background: linear-gradient(90deg, #10b981, #059669);
      }

      .pc-bar-fill.medium {
        background: linear-gradient(90deg, #f59e0b, #d97706);
      }

      .pc-bar-fill.low {
        background: linear-gradient(90deg, #ef4444, #dc2626);
      }

      /* Trends Chart */
      .pc-trends-chart {
        width: 100%;
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin-bottom: 30px;
      }

      [data-theme="dark"] .pc-trends-chart {
        background: #374151;
      }

      /* Bottlenecks Table */
      .pc-bottlenecks-table {
        width: 100%;
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        overflow-x: auto;
      }

      [data-theme="dark"] .pc-bottlenecks-table {
        background: #374151;
      }

      .pc-table {
        width: 100%;
        border-collapse: collapse;
      }

      .pc-table th {
        text-align: left;
        padding: 12px;
        font-size: 13px;
        font-weight: 600;
        color: #6b7280;
        border-bottom: 2px solid #e5e7eb;
      }

      [data-theme="dark"] .pc-table th {
        color: #9ca3af;
        border-bottom-color: #4b5563;
      }

      .pc-table td {
        padding: 12px;
        font-size: 14px;
        color: #374151;
        border-bottom: 1px solid #f3f4f6;
      }

      [data-theme="dark"] .pc-table td {
        color: #d1d5db;
        border-bottom-color: #4b5563;
      }

      .pc-severity-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }

      .pc-severity-badge.critical {
        background: #fef2f2;
        color: #991b1b;
      }

      .pc-severity-badge.high {
        background: #fff7ed;
        color: #9a3412;
      }

      .pc-severity-badge.medium {
        background: #fefce8;
        color: #854d0e;
      }

      [data-theme="dark"] .pc-severity-badge.critical {
        background: #7f1d1d;
        color: #fecaca;
      }

      [data-theme="dark"] .pc-severity-badge.high {
        background: #7c2d12;
        color: #fed7aa;
      }

      [data-theme="dark"] .pc-severity-badge.medium {
        background: #713f12;
        color: #fef08a;
      }

      /* Loading State */
      .pc-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
      }

      .pc-loading-spinner {
        width: 48px;
        height: 48px;
        border: 4px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: pc-spin 0.8s linear infinite;
      }

      @keyframes pc-spin {
        to { transform: rotate(360deg); }
      }

      .pc-loading-text {
        margin-top: 16px;
        font-size: 14px;
        color: #6b7280;
      }

      /* Error State */
      .pc-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }

      [data-theme="dark"] .pc-error {
        background: #7f1d1d;
        border-color: #991b1b;
      }

      .pc-error-title {
        color: #991b1b;
        font-weight: 600;
        margin-bottom: 8px;
      }

      [data-theme="dark"] .pc-error-title {
        color: #fecaca;
      }

      .pc-error-message {
        color: #dc2626;
        font-size: 14px;
      }

      [data-theme="dark"] .pc-error-message {
        color: #fca5a5;
      }

      .pc-retry-btn {
        margin-top: 12px;
        padding: 8px 16px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }

      .pc-retry-btn:hover {
        background: #2563eb;
      }

      /* Empty State */
      .pc-empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #6b7280;
      }

      .pc-empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      /* Legend */
      .pc-chart-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-top: 16px;
        justify-content: center;
      }

      .pc-legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #374151;
      }

      [data-theme="dark"] .pc-legend-item {
        color: #d1d5db;
      }

      .pc-legend-color {
        width: 16px;
        height: 16px;
        border-radius: 3px;
      }

      /* Skeleton Loading */
      .pc-skeleton {
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: pc-skeleton-loading 1.5s infinite;
        border-radius: 4px;
      }

      @keyframes pc-skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Tooltip */
      .pc-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .pc-tooltip.visible {
        opacity: 1;
      }
    `;

    document.head.appendChild(style);
    console.log('✅ [ANALYTICS] Estilos inyectados');
  }

  /**
   * Renderizar dashboard completo
   */
  render() {
    this.container.setAttribute('data-theme', this.theme);
    this.container.className = 'pc-analytics-dashboard';

    if (this.state.loading) {
      this.renderLoading();
      return;
    }

    if (this.state.error) {
      this.renderError();
      return;
    }

    if (!this.state.dashboardData) {
      this.renderEmpty();
      return;
    }

    this.renderContent();
  }

  /**
   * Renderizar estado de carga
   */
  renderLoading() {
    this.container.innerHTML = `
      <div class="pc-loading">
        <div class="pc-loading-spinner"></div>
        <div class="pc-loading-text">Cargando analytics...</div>
      </div>
    `;
  }

  /**
   * Renderizar estado de error
   */
  renderError() {
    this.container.innerHTML = `
      <div class="pc-error">
        <div class="pc-error-title">Error al cargar analytics</div>
        <div class="pc-error-message">${this.state.error}</div>
        <button class="pc-retry-btn" onclick="window.processChainAnalytics?.loadData()">
          Reintentar
        </button>
      </div>
    `;
  }

  /**
   * Renderizar estado vacío
   */
  renderEmpty() {
    this.container.innerHTML = `
      <div class="pc-empty-state">
        <div class="pc-empty-icon">📊</div>
        <div>No hay datos disponibles para el período seleccionado</div>
      </div>
    `;
  }

  /**
   * Renderizar contenido completo del dashboard
   */
  renderContent() {
    const data = this.state.dashboardData;

    this.container.innerHTML = `
      <!-- Period Selector -->
      <div class="pc-period-selector">
        <button class="pc-period-btn ${this.state.selectedPeriod === 7 ? 'active' : ''}" data-period="7">
          7 días
        </button>
        <button class="pc-period-btn ${this.state.selectedPeriod === 30 ? 'active' : ''}" data-period="30">
          30 días
        </button>
        <button class="pc-period-btn ${this.state.selectedPeriod === 90 ? 'active' : ''}" data-period="90">
          90 días
        </button>
      </div>

      <!-- Overall Stats Cards -->
      <div class="pc-stats-grid">
        ${this.renderStatsCards(data.overall)}
      </div>

      <!-- Charts Grid: Top Actions + Module Stats -->
      <div class="pc-charts-grid">
        <!-- Top 10 Actions -->
        <div class="pc-chart-container">
          <div class="pc-chart-title">🏆 Top 10 Acciones Más Solicitadas</div>
          <div class="pc-bar-chart" id="pc-top-actions-chart"></div>
        </div>

        <!-- Module Stats Pie Chart -->
        <div class="pc-chart-container">
          <div class="pc-chart-title">📦 Distribución por Módulo</div>
          <canvas id="pc-module-pie-chart" class="pc-chart-canvas"></canvas>
        </div>
      </div>

      <!-- Time Trends Line Chart -->
      <div class="pc-trends-chart">
        <div class="pc-chart-title">📈 Tendencias Temporales</div>
        <canvas id="pc-trends-line-chart" class="pc-chart-canvas" style="height: 400px;"></canvas>
        <div class="pc-chart-legend" id="pc-trends-legend"></div>
      </div>

      <!-- Bottlenecks Table -->
      <div class="pc-bottlenecks-table">
        <div class="pc-chart-title">⚠️ Bottlenecks Detectados</div>
        ${this.renderBottlenecksTable(data.bottlenecks)}
      </div>
    `;

    // Renderizar charts (después del DOM estar listo)
    setTimeout(() => {
      this.renderTopActionsChart(data.topActions);
      this.renderModulePieChart(data.moduleStats);
      this.renderTrendsLineChart(data.trends);
    }, 0);
  }

  /**
   * Renderizar tarjetas de estadísticas generales
   */
  renderStatsCards(overall) {
    if (!overall) {
      return '<div>No hay datos disponibles</div>';
    }

    const cards = [
      {
        icon: '📊',
        label: 'Total Requests',
        value: this.formatNumber(overall.totalRequests || 0),
        change: overall.requestsChange || 0,
        changeLabel: 'vs período anterior'
      },
      {
        icon: '✅',
        label: 'Completion Rate',
        value: `${(overall.completionRate || 0).toFixed(1)}%`,
        change: overall.completionChange || 0,
        changeLabel: 'vs período anterior'
      },
      {
        icon: '⏱️',
        label: 'Avg Time',
        value: this.formatDuration(overall.avgTimeToComplete || 0),
        change: overall.timeChange || 0,
        changeLabel: 'vs período anterior',
        invertChange: true // Menos tiempo = mejor
      },
      {
        icon: '👥',
        label: 'Unique Users',
        value: this.formatNumber(overall.uniqueUsers || 0),
        change: overall.usersChange || 0,
        changeLabel: 'vs período anterior'
      }
    ];

    return cards.map(card => `
      <div class="pc-stat-card">
        <div class="pc-stat-icon">${card.icon}</div>
        <div class="pc-stat-label">${card.label}</div>
        <div class="pc-stat-value">${card.value}</div>
        <div class="pc-stat-change ${this.getChangeClass(card.change, card.invertChange)}">
          ${this.formatChange(card.change)} ${card.changeLabel}
        </div>
      </div>
    `).join('');
  }

  /**
   * Renderizar chart de Top 10 Actions (horizontal bars)
   */
  renderTopActionsChart(topActions) {
    const container = document.getElementById('pc-top-actions-chart');
    if (!container || !topActions || topActions.length === 0) {
      container.innerHTML = '<div class="pc-empty-state">No hay datos disponibles</div>';
      return;
    }

    const maxRequests = Math.max(...topActions.map(a => a.requestCount || 0));

    container.innerHTML = topActions.slice(0, 10).map(action => {
      const completionRate = action.completionRate || 0;
      const width = (action.requestCount / maxRequests) * 100;
      const colorClass = completionRate >= 70 ? 'high' : completionRate >= 40 ? 'medium' : 'low';

      return `
        <div class="pc-bar-item">
          <div class="pc-bar-label">
            <span>${this.truncate(action.actionName, 40)}</span>
            <span>${action.requestCount} requests (${completionRate.toFixed(0)}% completado)</span>
          </div>
          <div class="pc-bar-wrapper">
            <div class="pc-bar-fill ${colorClass}" style="width: ${width}%">
              ${width > 20 ? action.requestCount : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Renderizar pie chart de Module Stats (Canvas API)
   */
  renderModulePieChart(moduleStats) {
    const canvas = document.getElementById('pc-module-pie-chart');
    if (!canvas || !moduleStats || moduleStats.length === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Colores para los módulos
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];

    // Calcular total
    const total = moduleStats.reduce((sum, m) => sum + (m.requestCount || 0), 0);

    // Calcular ángulos
    let currentAngle = -Math.PI / 2; // Empezar arriba
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    // Dibujar slices
    moduleStats.forEach((module, index) => {
      const sliceAngle = (module.requestCount / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      // Border
      ctx.strokeStyle = this.theme === 'dark' ? '#374151' : 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sliceAngle;
    });

    // Leyenda
    this.renderPieChartLegend(moduleStats, colors);
  }

  /**
   * Renderizar leyenda del pie chart
   */
  renderPieChartLegend(moduleStats, colors) {
    const legendContainer = document.querySelector('#pc-module-pie-chart').parentElement;
    const total = moduleStats.reduce((sum, m) => sum + (m.requestCount || 0), 0);

    const legendHTML = `
      <div class="pc-chart-legend">
        ${moduleStats.map((module, index) => {
          const percentage = ((module.requestCount / total) * 100).toFixed(1);
          return `
            <div class="pc-legend-item">
              <div class="pc-legend-color" style="background: ${colors[index % colors.length]}"></div>
              <span>${module.moduleName}: ${module.requestCount} (${percentage}%)</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    legendContainer.insertAdjacentHTML('beforeend', legendHTML);
  }

  /**
   * Renderizar line chart de Time Trends (Canvas API)
   */
  renderTrendsLineChart(trends) {
    const canvas = document.getElementById('pc-trends-line-chart');
    if (!canvas || !trends || trends.length === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Configuración
    const padding = { top: 20, right: 20, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Encontrar valores máximos
    const maxValue = Math.max(
      ...trends.map(t => Math.max(t.requests || 0, t.completed || 0, t.abandoned || 0))
    );

    // Dibujar ejes
    ctx.strokeStyle = this.theme === 'dark' ? '#4b5563' : '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Labels del eje Y
    ctx.fillStyle = this.theme === 'dark' ? '#9ca3af' : '#6b7280';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = height - padding.bottom - (chartHeight / ySteps) * i;
      const value = Math.round((maxValue / ySteps) * i);
      ctx.fillText(value.toString(), padding.left - 10, y + 4);
    }

    // Función para convertir datos a coordenadas
    const getX = (index) => padding.left + (chartWidth / (trends.length - 1)) * index;
    const getY = (value) => height - padding.bottom - (value / maxValue) * chartHeight;

    // Dibujar 3 líneas (requests, completed, abandoned)
    const lines = [
      { data: trends.map(t => t.requests || 0), color: '#3b82f6', label: 'Total Requests' },
      { data: trends.map(t => t.completed || 0), color: '#10b981', label: 'Completed' },
      { data: trends.map(t => t.abandoned || 0), color: '#ef4444', label: 'Abandoned' }
    ];

    lines.forEach(line => {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      line.data.forEach((value, index) => {
        const x = getX(index);
        const y = getY(value);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Puntos
      line.data.forEach((value, index) => {
        const x = getX(index);
        const y = getY(value);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = line.color;
        ctx.fill();
      });
    });

    // Labels del eje X (fechas)
    ctx.fillStyle = this.theme === 'dark' ? '#9ca3af' : '#6b7280';
    ctx.textAlign = 'center';
    trends.forEach((trend, index) => {
      if (index % Math.ceil(trends.length / 10) === 0) { // Mostrar solo algunas fechas
        const x = getX(index);
        const y = height - padding.bottom + 20;
        const date = new Date(trend.date);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        ctx.fillText(label, x, y);
      }
    });

    // Leyenda
    this.renderLineChartLegend(lines);
  }

  /**
   * Renderizar leyenda del line chart
   */
  renderLineChartLegend(lines) {
    const legendContainer = document.getElementById('pc-trends-legend');
    legendContainer.innerHTML = lines.map(line => `
      <div class="pc-legend-item">
        <div class="pc-legend-color" style="background: ${line.color}"></div>
        <span>${line.label}</span>
      </div>
    `).join('');
  }

  /**
   * Renderizar tabla de bottlenecks
   */
  renderBottlenecksTable(bottlenecks) {
    if (!bottlenecks || bottlenecks.length === 0) {
      return '<div class="pc-empty-state">No se detectaron bottlenecks</div>';
    }

    return `
      <table class="pc-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Acción</th>
            <th>Issue Type</th>
            <th>Requests</th>
            <th>Stats</th>
          </tr>
        </thead>
        <tbody>
          ${bottlenecks.map(b => `
            <tr>
              <td>
                <span class="pc-severity-badge ${b.severity.toLowerCase()}">
                  ${this.getSeverityIcon(b.severity)} ${b.severity}
                </span>
              </td>
              <td>${this.truncate(b.actionName, 40)}</td>
              <td>${b.issueType}</td>
              <td>${b.requestCount}</td>
              <td>${this.getBottleneckStats(b)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Obtener stats del bottleneck según issue type
   */
  getBottleneckStats(bottleneck) {
    switch (bottleneck.issueType) {
      case 'High Block Rate':
        return `${bottleneck.blockedRate.toFixed(0)}% bloqueado`;
      case 'Low Completion':
        return `${bottleneck.completionRate.toFixed(0)}% completado`;
      case 'High Abandonment':
        return `${bottleneck.abandonmentRate.toFixed(0)}% abandonado`;
      default:
        return '-';
    }
  }

  /**
   * Obtener icono de severity
   */
  getSeverityIcon(severity) {
    const icons = {
      'CRITICAL': '🔴',
      'HIGH': '🟠',
      'MEDIUM': '🟡',
      'LOW': '🟢'
    };
    return icons[severity] || '⚪';
  }

  /**
   * Cargar datos desde la API
   */
  async loadData() {
    this.setState({ loading: true, error: null });

    try {
      const token = this.getToken();
      const response = await fetch(
        `/api/process-chains/analytics/dashboard?companyId=${this.companyId}&days=${this.state.selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      this.setState({
        dashboardData: result.data,
        loading: false
      });

      this.render(); // Re-renderizar con nueva data

    } catch (error) {
      console.error('❌ [ANALYTICS] Error loading data:', error);
      this.setState({
        error: error.message,
        loading: false
      });
      this.render(); // Renderizar error
    }
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Period selector
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('pc-period-btn')) {
        const period = parseInt(e.target.dataset.period);
        if (period !== this.state.selectedPeriod) {
          this.state.selectedPeriod = period;
          this.loadData();
        }
      }
    });

    // Resize de charts
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        if (this.state.dashboardData) {
          this.render();
        }
      }, 200);
    });
  }

  /**
   * Iniciar auto-refresh
   */
  startAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      console.log('🔄 [ANALYTICS] Auto-refresh...');
      this.loadData();
    }, this.refreshInterval);

    console.log(`✅ [ANALYTICS] Auto-refresh configurado cada ${this.refreshInterval / 1000}s`);
  }

  /**
   * Detener auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('⏹️ [ANALYTICS] Auto-refresh detenido');
    }
  }

  /**
   * Actualizar estado interno
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Obtener token de autenticación
   */
  getToken() {
    // Intentar desde localStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) return token;

    // Fallback: buscar en cookies
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') return value;
    }

    console.warn('⚠️ [ANALYTICS] Token no encontrado');
    return '';
  }

  /**
   * Formatear número con separadores de miles
   */
  formatNumber(num) {
    return num.toLocaleString('es-ES');
  }

  /**
   * Formatear duración (segundos a minutos/horas)
   */
  formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
    return `${(seconds / 3600).toFixed(1)} hrs`;
  }

  /**
   * Formatear cambio porcentual
   */
  formatChange(change) {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  /**
   * Obtener clase CSS para el cambio (positivo/negativo)
   */
  getChangeClass(change, invert = false) {
    if (invert) {
      return change < 0 ? 'positive' : 'negative';
    }
    return change >= 0 ? 'positive' : 'negative';
  }

  /**
   * Truncar texto largo
   */
  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Destruir dashboard (cleanup)
   */
  destroy() {
    this.stopAutoRefresh();

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }

    this.container.innerHTML = '';
    console.log('🗑️ [ANALYTICS] Dashboard destruido');
  }
}

// Exponer globalmente para debugging
window.ProcessChainAnalyticsDashboard = ProcessChainAnalyticsDashboard;

console.log('✅ [ANALYTICS] ProcessChainAnalyticsDashboard class registrada globalmente');
