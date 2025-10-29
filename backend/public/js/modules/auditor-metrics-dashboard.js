/**
 * AUDITOR METRICS DASHBOARD
 *
 * Dashboard visual completo para métricas del sistema híbrido Ollama
 * - Gráficas comparativas Ollama vs OpenAI
 * - Timeline de progreso
 * - Tabla de errores con diagnósticos
 * - Métricas de precisión en tiempo real
 *
 * @version 1.0.0
 */

class AuditorMetricsDashboard {
  constructor() {
    this.currentToken = localStorage.getItem('token');
    this.refreshInterval = null;
    this.charts = {};
    this.autoRefreshEnabled = true;
  }

  /**
   * Inicializar dashboard
   */
  async init() {
    console.log('🎨 Inicializando Auditor Metrics Dashboard...');

    // Crear estructura HTML del dashboard
    this.createDashboardHTML();

    // Cargar datos iniciales
    await this.loadAllMetrics();

    // Auto-refresh cada 30 segundos
    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    }

    // Event listeners
    this.attachEventListeners();

    console.log('✅ Dashboard inicializado');
  }

  /**
   * Crear estructura HTML del dashboard
   */
  createDashboardHTML() {
    const container = document.getElementById('auditor-metrics-container');
    if (!container) {
      console.error('❌ Contenedor #auditor-metrics-container no encontrado');
      return;
    }

    container.innerHTML = `
      <div class="metrics-dashboard">
        <!-- Header con controles -->
        <div class="dashboard-header">
          <h2>📊 Sistema de Diagnóstico - Métricas de Precisión</h2>
          <div class="dashboard-controls">
            <button id="refresh-metrics-btn" class="btn btn-primary">
              🔄 Actualizar
            </button>
            <button id="toggle-autorefresh-btn" class="btn btn-secondary">
              ⏸️ Pausar Auto-refresh
            </button>
            <span id="last-update-time" class="last-update-time"></span>
          </div>
        </div>

        <!-- Precisión Global -->
        <div class="metrics-section">
          <h3>🎯 Precisión Global del Sistema</h3>
          <div class="precision-cards" id="precision-cards">
            <!-- Cards se generan dinámicamente -->
          </div>
          <div class="recommendation-box" id="recommendation-box">
            <!-- Recomendación automática -->
          </div>
        </div>

        <!-- Gráfica Comparativa -->
        <div class="metrics-section">
          <h3>📈 Comparación: Ollama vs OpenAI vs Patterns</h3>
          <div class="chart-container">
            <canvas id="source-comparison-chart"></canvas>
          </div>
        </div>

        <!-- Timeline de Progreso -->
        <div class="metrics-section">
          <h3>⏱️ Timeline de Progreso (Últimas 24h)</h3>
          <div class="chart-container">
            <canvas id="progress-timeline-chart"></canvas>
          </div>
        </div>

        <!-- Tabla de Errores con Diagnósticos -->
        <div class="metrics-section">
          <h3>🔍 Errores Recientes con Diagnósticos</h3>
          <div class="table-controls">
            <input type="text" id="filter-module" placeholder="Filtrar por módulo..." class="form-control">
            <select id="filter-source" class="form-control">
              <option value="">Todas las fuentes</option>
              <option value="ollama-local">Ollama Local</option>
              <option value="ollama-external">Ollama Externo</option>
              <option value="openai">OpenAI</option>
              <option value="pattern-analysis">Pattern Analysis</option>
            </select>
          </div>
          <div class="table-responsive">
            <table id="errors-table" class="table">
              <thead>
                <tr>
                  <th>Módulo</th>
                  <th>Error</th>
                  <th>Fuente</th>
                  <th>Modelo</th>
                  <th>Confidence</th>
                  <th>Reparación</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="errors-table-body">
                <!-- Rows se generan dinámicamente -->
              </tbody>
            </table>
          </div>
          <div class="pagination-controls" id="pagination-controls"></div>
        </div>

        <!-- Módulos con Más Errores -->
        <div class="metrics-section">
          <h3>⚠️ Top 10 Módulos con Más Errores</h3>
          <div class="chart-container">
            <canvas id="top-modules-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Modal para detalles de error -->
      <div id="error-details-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h3>Detalles del Error</h3>
          <div id="error-details-content"></div>
        </div>
      </div>
    `;
  }

  /**
   * Cargar todas las métricas
   */
  async loadAllMetrics() {
    try {
      console.log('📊 Cargando métricas del dashboard...');

      // Usar endpoint unificado
      const response = await fetch('/api/audit/metrics/dashboard-summary', {
        headers: {
          'Authorization': `Bearer ${this.currentToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.renderPrecisionCards(data.data.precision);
        this.renderRecommendation(data.data.precision);
        this.renderSourceComparisonChart(data.data.by_source);
        this.renderTopModulesChart(data.data.top_failing_modules);
        this.renderProgressTimelineChart(data.data.recent_activity);
        await this.loadErrorsTable();
        this.updateLastUpdateTime();
      }

    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
      this.showError('Error al cargar métricas del dashboard');
    }
  }

  /**
   * Renderizar cards de precisión global
   */
  renderPrecisionCards(precision) {
    const container = document.getElementById('precision-cards');
    if (!precision) {
      container.innerHTML = '<p class="no-data">No hay datos de diagnóstico aún. Ejecuta una auditoría para ver métricas.</p>';
      return;
    }

    container.innerHTML = `
      <div class="precision-card">
        <h4>Total Diagnósticos</h4>
        <div class="metric-value">${precision.total_diagnoses || 0}</div>
      </div>

      <div class="precision-card ollama-card">
        <h4>🤖 Ollama Local</h4>
        <div class="metric-value">${precision.ollama_local_count || 0}</div>
        <div class="metric-details">
          <div>Confidence: ${this.formatPercent(precision.avg_ollama_confidence)}</div>
          <div>Éxito: ${this.formatPercent(precision.ollama_repair_success_rate, 100)}</div>
        </div>
      </div>

      <div class="precision-card ollama-external-card">
        <h4>🌐 Ollama Externo</h4>
        <div class="metric-value">${precision.ollama_external_count || 0}</div>
      </div>

      <div class="precision-card openai-card">
        <h4>✨ OpenAI</h4>
        <div class="metric-value">${precision.openai_count || 0}</div>
        <div class="metric-details">
          <div>Confidence: ${this.formatPercent(precision.avg_openai_confidence)}</div>
          <div>Éxito: ${this.formatPercent(precision.openai_repair_success_rate, 100)}</div>
        </div>
      </div>

      <div class="precision-card pattern-card">
        <h4>📋 Patterns</h4>
        <div class="metric-value">${precision.pattern_count || 0}</div>
        <div class="metric-details">
          <div>Confidence: ${this.formatPercent(precision.avg_pattern_confidence)}</div>
          <div>Éxito: ${this.formatPercent(precision.pattern_repair_success_rate, 100)}</div>
        </div>
      </div>
    `;
  }

  /**
   * Renderizar recomendación automática
   */
  renderRecommendation(precision) {
    const container = document.getElementById('recommendation-box');
    if (!precision || !precision.recommendation) return;

    const recommendation = precision.recommendation;
    let icon = '💡';
    let className = 'info';

    if (recommendation.includes('migrar a OpenAI')) {
      icon = '⚠️';
      className = 'warning';
    } else if (recommendation.includes('buen rendimiento')) {
      icon = '✅';
      className = 'success';
    } else if (recommendation.includes('Baja precisión')) {
      icon = '❌';
      className = 'error';
    }

    container.innerHTML = `
      <div class="recommendation ${className}">
        <span class="recommendation-icon">${icon}</span>
        <span class="recommendation-text">${recommendation}</span>
      </div>
    `;
  }

  /**
   * Renderizar gráfica comparativa de fuentes
   */
  renderSourceComparisonChart(bySource) {
    const ctx = document.getElementById('source-comparison-chart');
    if (!ctx) return;

    // Destruir gráfica anterior si existe
    if (this.charts.sourceComparison) {
      this.charts.sourceComparison.destroy();
    }

    if (!bySource || bySource.length === 0) {
      ctx.parentElement.innerHTML = '<p class="no-data">No hay datos para mostrar</p>';
      return;
    }

    const labels = bySource.map(s => this.getSourceLabel(s.diagnosis_source));
    const confidenceData = bySource.map(s => parseFloat(s.avg_confidence) * 100);
    const specificityData = bySource.map(s => parseFloat(s.avg_specificity) * 100);
    const successRateData = bySource.map(s => parseFloat(s.repair_success_rate));

    this.charts.sourceComparison = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Confidence (%)',
            data: confidenceData,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Specificity (%)',
            data: specificityData,
            backgroundColor: 'rgba(255, 206, 86, 0.6)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          },
          {
            label: 'Tasa de Éxito (%)',
            data: successRateData,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
              }
            }
          }
        }
      }
    });
  }

  /**
   * Renderizar timeline de progreso
   */
  renderProgressTimelineChart(recentActivity) {
    const ctx = document.getElementById('progress-timeline-chart');
    if (!ctx) return;

    if (this.charts.progressTimeline) {
      this.charts.progressTimeline.destroy();
    }

    if (!recentActivity || recentActivity.length === 0) {
      ctx.parentElement.innerHTML = '<p class="no-data">No hay actividad reciente (últimas 24h)</p>';
      return;
    }

    // Invertir para mostrar orden cronológico
    const data = [...recentActivity].reverse();

    const labels = data.map(d => {
      const date = new Date(d.hour);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    });

    const passedData = data.map(d => parseInt(d.passed) || 0);
    const failedData = data.map(d => parseInt(d.failed) || 0);

    this.charts.progressTimeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Tests Passed',
            data: passedData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Tests Failed',
            data: failedData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });
  }

  /**
   * Renderizar top módulos con errores
   */
  renderTopModulesChart(topModules) {
    const ctx = document.getElementById('top-modules-chart');
    if (!ctx) return;

    if (this.charts.topModules) {
      this.charts.topModules.destroy();
    }

    if (!topModules || topModules.length === 0) {
      ctx.parentElement.innerHTML = '<p class="no-data">No hay módulos con errores</p>';
      return;
    }

    const labels = topModules.map(m => m.module_name);
    const failedData = topModules.map(m => parseInt(m.failed) || 0);

    this.charts.topModules = new Chart(ctx, {
      type: 'horizontalBar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tests Failed',
          data: failedData,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  /**
   * Cargar tabla de errores con diagnósticos
   */
  async loadErrorsTable(limit = 50, offset = 0) {
    try {
      const response = await fetch(`/api/audit/metrics/errors-with-diagnosis?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${this.currentToken}`
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.success) {
        this.renderErrorsTable(data.data);
        this.renderPagination(data.pagination);
      }

    } catch (error) {
      console.error('❌ Error cargando tabla de errores:', error);
    }
  }

  /**
   * Renderizar tabla de errores
   */
  renderErrorsTable(errors) {
    const tbody = document.getElementById('errors-table-body');
    if (!tbody) return;

    if (!errors || errors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data">No hay errores con diagnósticos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = errors.map(error => `
      <tr>
        <td><span class="module-badge">${error.module_name}</span></td>
        <td class="error-message-cell" title="${this.escapeHtml(error.error_message)}">
          ${this.truncate(error.error_message, 50)}
        </td>
        <td>${this.renderSourceBadge(error.diagnosis_source, error.diagnosis_level)}</td>
        <td><code>${error.diagnosis_model}</code></td>
        <td>${this.renderConfidenceBadge(error.diagnosis_confidence)}</td>
        <td>${this.renderRepairStatus(error.repair_success)}</td>
        <td>${this.formatDate(error.created_at)}</td>
        <td>
          <button class="btn-sm btn-info" onclick="auditorMetricsDashboard.showErrorDetails(${error.log_id})">
            Ver Detalles
          </button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Renderizar paginación
   */
  renderPagination(pagination) {
    const container = document.getElementById('pagination-controls');
    if (!container || !pagination) return;

    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    container.innerHTML = `
      <div class="pagination">
        <button ${pagination.offset === 0 ? 'disabled' : ''}
                onclick="auditorMetricsDashboard.loadErrorsTable(${pagination.limit}, ${pagination.offset - pagination.limit})">
          ← Anterior
        </button>
        <span>Página ${currentPage} de ${totalPages} (Total: ${pagination.total})</span>
        <button ${!pagination.hasMore ? 'disabled' : ''}
                onclick="auditorMetricsDashboard.loadErrorsTable(${pagination.limit}, ${pagination.offset + pagination.limit})">
          Siguiente →
        </button>
      </div>
    `;
  }

  /**
   * Mostrar detalles de error en modal
   */
  async showErrorDetails(logId) {
    // TODO: Implementar endpoint GET /api/audit/logs/:id para obtener detalles completos
    alert(`Ver detalles del log ID: ${logId}`);
  }

  /**
   * Event listeners
   */
  attachEventListeners() {
    // Botón refresh manual
    const refreshBtn = document.getElementById('refresh-metrics-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadAllMetrics());
    }

    // Toggle auto-refresh
    const toggleAutoRefreshBtn = document.getElementById('toggle-autorefresh-btn');
    if (toggleAutoRefreshBtn) {
      toggleAutoRefreshBtn.addEventListener('click', () => this.toggleAutoRefresh());
    }

    // Cerrar modal
    const modal = document.getElementById('error-details-modal');
    const closeBtn = modal?.querySelector('.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }
  }

  /**
   * Auto-refresh cada 30 segundos
   */
  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh de métricas...');
      this.loadAllMetrics();
    }, 30000); // 30 segundos
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh() {
    const btn = document.getElementById('toggle-autorefresh-btn');

    if (this.autoRefreshEnabled) {
      clearInterval(this.refreshInterval);
      this.autoRefreshEnabled = false;
      if (btn) btn.innerHTML = '▶️ Reanudar Auto-refresh';
    } else {
      this.startAutoRefresh();
      this.autoRefreshEnabled = true;
      if (btn) btn.innerHTML = '⏸️ Pausar Auto-refresh';
    }
  }

  /**
   * Actualizar timestamp de última actualización
   */
  updateLastUpdateTime() {
    const el = document.getElementById('last-update-time');
    if (el) {
      const now = new Date();
      el.textContent = `Última actualización: ${now.toLocaleTimeString('es-ES')}`;
    }
  }

  // ════════════════════════════════════════════════════════════
  // UTILIDADES
  // ════════════════════════════════════════════════════════════

  getSourceLabel(source) {
    const labels = {
      'ollama-local': '🤖 Ollama Local',
      'ollama-external': '🌐 Ollama Externo',
      'openai': '✨ OpenAI',
      'pattern-analysis': '📋 Patterns'
    };
    return labels[source] || source;
  }

  renderSourceBadge(source, level) {
    const colors = {
      'ollama-local': '#4CAF50',
      'ollama-external': '#2196F3',
      'openai': '#FF9800',
      'pattern-analysis': '#9E9E9E'
    };
    const color = colors[source] || '#999';
    return `<span class="source-badge" style="background-color: ${color}">
      ${this.getSourceLabel(source)} (L${level})
    </span>`;
  }

  renderConfidenceBadge(confidence) {
    if (!confidence) return '<span class="confidence-badge">N/A</span>';
    const percent = (parseFloat(confidence) * 100).toFixed(0);
    const color = percent >= 80 ? '#4CAF50' : percent >= 60 ? '#FF9800' : '#f44336';
    return `<span class="confidence-badge" style="background-color: ${color}">
      ${percent}%
    </span>`;
  }

  renderRepairStatus(success) {
    if (success === null || success === undefined) {
      return '<span class="repair-status pending">Pendiente</span>';
    }
    return success
      ? '<span class="repair-status success">✅ Éxito</span>'
      : '<span class="repair-status failed">❌ Falló</span>';
  }

  formatPercent(value, multiplier = 1) {
    if (!value) return 'N/A';
    return (parseFloat(value) * multiplier).toFixed(1) + '%';
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  truncate(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  showError(message) {
    alert('❌ ' + message);
  }
}

// Instancia global
window.auditorMetricsDashboard = new AuditorMetricsDashboard();
