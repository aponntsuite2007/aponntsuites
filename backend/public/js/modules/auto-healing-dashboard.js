/**
 * ============================================================================
 * AUTO-HEALING DASHBOARD - Funcional con logs en tiempo real (DARK THEME)
 * ============================================================================
 */

// ========================================
// DARK THEME - Inyectar variables CSS globales si no existen
// ========================================
if (!document.getElementById('auto-healing-dark-theme-vars')) {
    const darkThemeVars = document.createElement('style');
    darkThemeVars.id = 'auto-healing-dark-theme-vars';
    darkThemeVars.textContent = `
        :root {
            --bg-primary: #1a1d29;
            --bg-secondary: #252834;
            --bg-card: #2d3142;
            --bg-hover: #363a4f;
            --text-primary: #e4e6eb;
            --text-secondary: #b8b9bf;
            --text-muted: #8e8f96;
            --border: #404456;
            --border-light: #4a4d5e;
            --accent: #0d6efd;
            --accent-hover: #0b5ed7;
            --success-bg: rgba(40, 167, 69, 0.15);
            --warning-bg: rgba(255, 193, 7, 0.15);
            --danger-bg: rgba(220, 53, 69, 0.15);
            --info-bg: rgba(23, 162, 184, 0.15);
        }
    `;
    document.head.insertBefore(darkThemeVars, document.head.firstChild);
}

console.log('✅ [AUTO-HEALING] Módulo cargado (Dark Theme)');


const AutoHealingDashboard = {
  currentExecution: null,
  reports: [],
  metrics: null,
  refreshInterval: null,
  logs: [],

  /**
   * Inicializar dashboard
   */
  init() {
    console.log('🔄 [AUTO-HEALING] Inicializando...');
    this.loadMetrics();
    this.startAutoRefresh();
  },

  /**
   * Renderizar dashboard completo
   */
  render() {
    const section = document.getElementById('auto-healing-container');
    if (!section) {
      console.error('❌ [AUTO-HEALING] Container no encontrado');
      return;
    }

    section.innerHTML = `
      <div style="background: var(--bg-card); padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="margin-bottom: 25px; border-bottom: 2px solid var(--border); padding-bottom: 15px;">
          <h2 style="margin: 0 0 10px 0; color: var(--text-primary); font-size: 24px; font-weight: 600;">
            🔧 Auto-Healing Cycle
          </h2>
          <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
            Sistema automático de testing y actualización del Brain metadata
          </p>
        </div>

        <!-- Métricas -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
          ${this.renderMetricsCards()}
        </div>

        <!-- Panel de control -->
        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 6px; margin-bottom: 20px; border: 1px solid var(--border);">
          <h3 style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 18px; font-weight: 600;">
            🎮 Ejecutar Test
          </h3>

          <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center; margin-bottom: 15px;">
            <button
              id="btn-start-healing"
              style="background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
              onmouseover="this.style.background='#2563eb'"
              onmouseout="this.style.background='#3b82f6'"
            >
              ▶️ Ejecutar Auto-Healing
            </button>

            <button
              id="btn-stop-healing"
              style="background: #ef4444; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; display: none;"
              onmouseover="this.style.background='#dc2626'"
              onmouseout="this.style.background='#ef4444'"
            >
              🛑 Detener Ejecución
            </button>

            <div style="display: flex; gap: 10px; align-items: center;">
              <label style="color: var(--text-secondary); font-size: 14px; font-weight: 500;">Iteraciones:</label>
              <input
                type="number"
                id="max-iterations"
                value="3"
                min="1"
                max="10"
                style="width: 70px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 14px;"
              />
            </div>

            <div style="display: flex; gap: 10px; align-items: center;">
              <label style="color: var(--text-secondary); font-size: 14px; font-weight: 500;">Empresa:</label>
              <input
                type="text"
                id="company-slug"
                value="isi"
                style="width: 120px; padding: 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 14px;"
              />
            </div>

            <div style="display: flex; gap: 10px; align-items: center;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary); font-size: 14px; font-weight: 500;">
                <input
                  type="checkbox"
                  id="show-browser"
                  style="width: 18px; height: 18px; cursor: pointer;"
                />
                <span>👁️ Ver navegador en vivo</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Logs en tiempo real -->
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 18px; font-weight: 600;">
            📜 Logs en Tiempo Real
          </h3>
          <div id="auto-healing-logs" style="background: #1e3a8a; color: #10b981; padding: 15px; border-radius: 6px; font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; max-height: 400px; overflow-y: auto; min-height: 200px;">
            <div style="color: #9ca3af;">Esperando ejecución...</div>
          </div>
        </div>

        <!-- Estado actual -->
        <div id="execution-status">
          ${this.renderExecutionStatus()}
        </div>

        <!-- Reportes recientes -->
        <div>
          <h3 style="margin: 0 0 15px 0; color: var(--text-primary); font-size: 18px; font-weight: 600;">
            📋 Reportes Recientes
          </h3>
          <div id="recent-reports">
            ${this.renderRecentReports()}
          </div>
        </div>

      </div>
    `;

    // Event listeners
    this.setupEventListeners();
  },

  /**
   * Renderizar cards de métricas
   */
  renderMetricsCards() {
    if (!this.metrics) {
      return `
        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
          <div style="color: #92400e; font-size: 12px; font-weight: 600;">Sin datos históricos</div>
          <div style="color: #78350f; font-size: 11px; margin-top: 3px;">Ejecuta un ciclo para ver métricas</div>
        </div>
      `;
    }

    const { totalExecutions, totalGapsHealed, successRate } = this.metrics;

    return `
      <div style="background: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
        <div style="color: #1e40af; font-size: 12px; font-weight: 600; margin-bottom: 5px;">EJECUCIONES</div>
        <div style="color: #1e3a8a; font-size: 28px; font-weight: 700;">${totalExecutions || 0}</div>
      </div>
      <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">
        <div style="color: #065f46; font-size: 12px; font-weight: 600; margin-bottom: 5px;">GAPS SANADOS</div>
        <div style="color: #064e3b; font-size: 28px; font-weight: 700;">${totalGapsHealed || 0}</div>
      </div>
      <div style="background: ${successRate >= 80 ? '#f0fdf4' : '#fef3c7'}; padding: 15px; border-radius: 6px; border-left: 4px solid ${successRate >= 80 ? '#10b981' : '#f59e0b'};">
        <div style="color: ${successRate >= 80 ? '#065f46' : '#92400e'}; font-size: 12px; font-weight: 600; margin-bottom: 5px;">ÉXITO</div>
        <div style="color: ${successRate >= 80 ? '#064e3b' : '#78350f'}; font-size: 28px; font-weight: 700;">${successRate || 0}%</div>
      </div>
    `;
  },

  /**
   * Renderizar estado de ejecución
   */
  renderExecutionStatus() {
    if (!this.currentExecution || !this.currentExecution.isRunning) {
      return `
        <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; text-align: center; color: var(--text-secondary); margin-bottom: 20px;">
          No hay ejecución en curso
        </div>
      `;
    }

    const exec = this.currentExecution;
    const progress = exec.totalIterations > 0
      ? Math.round((exec.currentIteration / exec.totalIterations) * 100)
      : 0;

    return `
      <div style="background: #eff6ff; padding: 20px; border-radius: 6px; border: 2px solid #3b82f6; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
          <h3 style="margin: 0; color: #1e40af; font-size: 18px;">⚡ Ejecutando...</h3>
          <div style="background: #3b82f6; color: white; padding: 5px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ACTIVO
          </div>
        </div>
        <div style="background: #dbeafe; height: 8px; border-radius: 4px; margin-bottom: 15px;">
          <div style="background: #3b82f6; height: 100%; width: ${progress}%; border-radius: 4px; transition: width 0.3s;"></div>
        </div>
        <div style="color: var(--text-primary); font-size: 14px;">
          Iteración ${exec.currentIteration} de ${exec.totalIterations} - ${progress}%
        </div>
      </div>
    `;
  },

  /**
   * Renderizar reportes recientes
   */
  renderRecentReports() {
    if (!this.reports || this.reports.length === 0) {
      return `
        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 6px; text-align: center; color: var(--text-secondary);">
          No hay reportes disponibles
        </div>
      `;
    }

    return `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 6px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--border);">
              <th style="padding: 12px; text-align: left; color: var(--text-primary); font-size: 13px;">Fecha</th>
              <th style="padding: 12px; text-align: center; color: var(--text-primary); font-size: 13px;">Iteraciones</th>
              <th style="padding: 12px; text-align: center; color: var(--text-primary); font-size: 13px;">Gaps Sanados</th>
              <th style="padding: 12px; text-align: center; color: var(--text-primary); font-size: 13px;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${this.reports.slice(0, 10).map((report, index) => {
              const isSuccess = report.finalGapsCount === 0;
              const timestamp = new Date(report.timestamp || report.startedAt).toLocaleString();

              return `
                <tr style="border-bottom: 1px solid var(--border); ${index % 2 === 0 ? 'background: var(--bg-card);' : 'background: var(--bg-secondary);'}">
                  <td style="padding: 12px; color: var(--text-primary); font-size: 13px;">${timestamp}</td>
                  <td style="padding: 12px; text-align: center; color: var(--text-secondary); font-size: 13px;">${report.iterations?.length || 0}</td>
                  <td style="padding: 12px; text-align: center; color: #10b981; font-size: 13px; font-weight: 600;">${report.totalGapsHealed || 0}</td>
                  <td style="padding: 12px; text-align: center;">
                    <span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${isSuccess ? '#d1fae5' : '#fef3c7'}; color: ${isSuccess ? '#065f46' : '#92400e'};">
                      ${isSuccess ? '✅ OK' : '⚠️ Parcial'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const btnStart = document.getElementById('btn-start-healing');
    if (btnStart) {
      btnStart.onclick = () => this.startAutoHealing();
    }

    const btnStop = document.getElementById('btn-stop-healing');
    if (btnStop) {
      btnStop.onclick = () => this.stopAutoHealing();
    }
  },

  /**
   * Agregar log
   */
  addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: '#10b981',
      error: '#ef4444',
      success: '#22c55e',
      warning: '#f59e0b'
    };

    this.logs.push({ timestamp, message, type });

    const logsContainer = document.getElementById('auto-healing-logs');
    if (logsContainer) {
      const logEntry = document.createElement('div');
      logEntry.style.color = colors[type];
      logEntry.style.marginBottom = '5px';
      logEntry.innerHTML = `<span style="color: #9ca3af;">[${timestamp}]</span> ${message}`;
      logsContainer.appendChild(logEntry);
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }
  },

  /**
   * Iniciar auto-healing
   */
  async startAutoHealing() {
    const maxIterations = parseInt(document.getElementById('max-iterations')?.value) || 3;
    const companySlug = document.getElementById('company-slug')?.value || 'isi';
    const showBrowser = document.getElementById('show-browser')?.checked || false;

    // Limpiar logs
    const logsContainer = document.getElementById('auto-healing-logs');
    if (logsContainer) {
      logsContainer.innerHTML = '';
    }
    this.logs = [];

    this.addLog('🚀 Iniciando Auto-Healing Cycle...', 'info');
    this.addLog(`📊 Configuración: ${maxIterations} iteraciones | Empresa: ${companySlug}`, 'info');
    if (showBrowser) {
      this.addLog('👁️ Navegador visible: Se abrirá una ventana de Chrome', 'info');
    }

    try {
      this.addLog('📡 Enviando solicitud al servidor...', 'info');

      const response = await fetch('/api/auto-healing/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxIterations,
          companySlug,
          username: 'admin',
          password: 'admin123',
          headless: !showBrowser  // Si quiere ver navegador, headless = false
        })
      });

      const result = await response.json();

      if (result.success) {
        this.addLog('✅ Auto-Healing iniciado correctamente', 'success');
        this.addLog('⏳ Ejecución en progreso... Monitorea el estado abajo', 'info');
        this.loadStatus();
      } else {
        this.addLog(`❌ Error: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      this.addLog(`❌ Error de conexión: ${error.message}`, 'error');
    }
  },

  /**
   * Detener auto-healing
   */
  async stopAutoHealing() {
    try {
      this.addLog('🛑 Deteniendo ejecución...', 'warning');

      const response = await fetch('/api/auto-healing/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        this.addLog('✅ Ejecución detenida correctamente', 'success');
        this.currentExecution = result.execution;

        // Actualizar UI
        const btnStart = document.getElementById('btn-start-healing');
        const btnStop = document.getElementById('btn-stop-healing');
        if (btnStart) btnStart.style.display = '';
        if (btnStop) btnStop.style.display = 'none';

        // Reload status
        await this.loadStatus();
      } else {
        this.addLog(`❌ Error: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error deteniendo:', error);
      this.addLog(`❌ Error: ${error.message}`, 'error');
    }
  },

  /**
   * Cargar estado
   */
  async loadStatus() {
    try {
      const response = await fetch('/api/auto-healing/status');
      const result = await response.json();

      if (result.success) {
        this.currentExecution = result.execution;

        // Re-renderizar estado
        const statusDiv = document.getElementById('execution-status');
        if (statusDiv) {
          statusDiv.innerHTML = this.renderExecutionStatus();
        }

        // ACTUALIZAR LOGS EN TIEMPO REAL
        if (result.execution.logs && result.execution.logs.length > 0) {
          const logsContainer = document.getElementById('auto-healing-logs');
          if (logsContainer) {
            // Limpiar logs anteriores
            logsContainer.innerHTML = '';

            // Agregar cada log del servidor
            result.execution.logs.forEach(log => {
              const logEntry = document.createElement('div');
              logEntry.style.color = '#10b981';
              logEntry.style.marginBottom = '5px';
              const timestamp = new Date().toLocaleTimeString();
              logEntry.innerHTML = `<span style="color: #9ca3af;">[${timestamp}]</span> ${log}`;
              logsContainer.appendChild(logEntry);
            });

            // Scroll al final
            logsContainer.scrollTop = logsContainer.scrollHeight;
          }
        }

        // Actualizar visibilidad de botones
        const btnStart = document.getElementById('btn-start-healing');
        const btnStop = document.getElementById('btn-stop-healing');
        if (result.execution.isRunning) {
          // Hay ejecución corriendo → Ocultar "Ejecutar", mostrar "Detener"
          if (btnStart) btnStart.style.display = 'none';
          if (btnStop) btnStop.style.display = '';
        } else {
          // NO hay ejecución → Mostrar "Ejecutar", ocultar "Detener"
          if (btnStart) btnStart.style.display = '';
          if (btnStop) btnStop.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('❌ Error cargando estado:', error);
    }
  },

  /**
   * Cargar métricas
   */
  async loadMetrics() {
    try {
      const response = await fetch('/api/auto-healing/metrics');
      const result = await response.json();

      if (result.success) {
        this.metrics = result.metrics;
        await this.loadReports();
        this.render();
      } else {
        // Sin métricas, renderizar de todos modos
        console.log('⚠️ Sin métricas históricas, renderizando dashboard vacío');
        this.render();
      }
    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
      // Renderizar de todos modos
      this.render();
    }
  },

  /**
   * Cargar reportes
   */
  async loadReports() {
    try {
      const response = await fetch('/api/auto-healing/reports');
      const result = await response.json();

      if (result.success) {
        this.reports = result.reports || [];
      }
    } catch (error) {
      console.error('❌ Error cargando reportes:', error);
    }
  },

  /**
   * Auto-refresh
   */
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      if (this.currentExecution && this.currentExecution.isRunning) {
        this.loadStatus();
      }
    }, 3000);
  },

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
};

// Exportar globalmente
window.AutoHealingDashboard = AutoHealingDashboard;

console.log('✅ [AUTO-HEALING] Módulo cargado y listo');
