/**
 * ============================================================================
 * E2E ADVANCED TESTING - DASHBOARD PROFESIONAL
 * ============================================================================
 *
 * Dashboard interactivo para visualizar y ejecutar el sistema de testing avanzado.
 * Integración completa con MasterTestOrchestrator vía WebSocket y REST API.
 *
 * CARACTERÍSTICAS:
 * - 8 Tabs: Overview + 7 phases (e2e, load, security, multiTenant, database, monitoring, edgeCases)
 * - Real-time progress con WebSocket
 * - Charts profesionales con Chart.js
 * - Drill-down por módulo/fase
 * - Export PDF/CSV de resultados
 * - Historial de ejecuciones
 * - Confidence score visualization (0-100)
 *
 * API ENDPOINTS CONSUMIDOS:
 * - POST /api/e2e-advanced/run - Ejecutar tests
 * - GET /api/e2e-advanced/status - Estado en tiempo real
 * - GET /api/e2e-advanced/executions - Historial
 * - GET /api/e2e-advanced/executions/:id - Detalles
 * - GET /api/e2e-advanced/confidence/:id - Score de confianza
 * - GET /api/e2e-advanced/phases - Phases disponibles
 * - GET /api/e2e-advanced/modules - Módulos disponibles
 *
 * WEBSOCKET:
 * - Conecta a /e2e-advanced-progress para updates en tiempo real
 * - Muestra progress bar, logs, errores mientras ejecuta
 *
 * ============================================================================
 */

console.log('✅ [E2E ADVANCED] Archivo e2e-advanced-dashboard.js cargado');

const E2EAdvancedDashboard = {
  // Estado
  currentTab: 'overview',
  currentExecution: null,
  executions: [],
  availablePhases: [],
  availableModules: [],
  ws: null,
  wsReconnectTimer: null,
  charts: {},
  isInitialized: false,

  // Configuración de phases
  phaseConfig: {
    e2e: {
      name: 'E2E Functional',
      icon: '🎭',
      color: '#3b82f6',
      weight: 25,
      description: 'Tests funcionales end-to-end con Playwright'
    },
    load: {
      name: 'Load Testing',
      icon: '⚡',
      color: '#f59e0b',
      weight: 15,
      description: 'Performance testing con k6'
    },
    security: {
      name: 'Security',
      icon: '🔒',
      color: '#ef4444',
      weight: 20,
      description: 'Análisis de vulnerabilidades con OWASP ZAP'
    },
    multiTenant: {
      name: 'Multi-Tenant',
      icon: '🏢',
      color: '#8b5cf6',
      weight: 15,
      description: 'Tests de aislamiento y data leakage'
    },
    database: {
      name: 'Database',
      icon: '🗄️',
      color: '#10b981',
      weight: 10,
      description: 'ACID compliance + integridad referencial'
    },
    monitoring: {
      name: 'Monitoring',
      icon: '📊',
      color: '#06b6d4',
      weight: 5,
      description: 'APM, logs, traces con OpenTelemetry'
    },
    edgeCases: {
      name: 'Edge Cases',
      icon: '🎯',
      color: '#ec4899',
      weight: 10,
      description: 'Unicode, timezones, boundaries, concurrency'
    }
  },

  /**
   * Inicializar dashboard
   */
  async init() {
    if (this.isInitialized) {
      console.log('ℹ️ [E2E ADVANCED] Dashboard ya inicializado');
      return;
    }

    console.log('🏗️ [E2E ADVANCED] Inicializando dashboard...');

    try {
      // Cargar datos iniciales
      await this.loadAvailablePhases();
      await this.loadAvailableModules();
      await this.loadExecutions();

      // Renderizar UI
      this.render();
      this.setupEventListeners();
      this.connectWebSocket();
      this.startAutoRefresh();

      this.isInitialized = true;
      console.log('✅ [E2E ADVANCED] Dashboard inicializado correctamente');
    } catch (error) {
      console.error('❌ [E2E ADVANCED] Error inicializando dashboard:', error);
      this.showError('Error al inicializar dashboard', error.message);
    }
  },

  /**
   * Conectar WebSocket para updates en tiempo real
   */
  connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('ℹ️ [E2E ADVANCED] WebSocket ya conectado');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/e2e-advanced-progress`;

      console.log('📡 [E2E ADVANCED] Conectando WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ [E2E ADVANCED] WebSocket conectado');
        this.updateConnectionStatus(true);
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 [E2E ADVANCED] WebSocket message:', data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ [E2E ADVANCED] Error procesando mensaje WebSocket:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ [E2E ADVANCED] WebSocket error:', error);
        this.updateConnectionStatus(false);
      };

      this.ws.onclose = () => {
        console.log('⚠️ [E2E ADVANCED] WebSocket desconectado');
        this.updateConnectionStatus(false);

        // Reconectar después de 5 segundos
        if (!this.wsReconnectTimer) {
          this.wsReconnectTimer = setTimeout(() => {
            console.log('🔄 [E2E ADVANCED] Reconectando WebSocket...');
            this.connectWebSocket();
          }, 5000);
        }
      };
    } catch (error) {
      console.error('❌ [E2E ADVANCED] Error conectando WebSocket:', error);
    }
  },

  /**
   * Manejar mensajes del WebSocket
   */
  handleWebSocketMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'execution_started':
        this.currentExecution = payload;
        this.updateExecutionStatus();
        this.showNotification('Ejecución iniciada', 'info');
        break;

      case 'phase_started':
        if (this.currentExecution) {
          this.currentExecution.currentPhase = payload.phase;
          this.updateExecutionStatus();
        }
        break;

      case 'phase_progress':
        if (this.currentExecution) {
          if (!this.currentExecution.phaseProgress) {
            this.currentExecution.phaseProgress = {};
          }
          this.currentExecution.phaseProgress[payload.phase] = payload.progress;
          this.updateExecutionStatus();
        }
        break;

      case 'phase_completed':
        if (this.currentExecution) {
          if (!this.currentExecution.phaseResults) {
            this.currentExecution.phaseResults = {};
          }
          this.currentExecution.phaseResults[payload.phase] = payload.result;
          this.updatePhaseTab(payload.phase, payload.result);
        }
        break;

      case 'execution_completed':
        this.currentExecution = null;
        this.loadExecutions();
        this.showNotification('Ejecución completada', 'success');
        this.updateExecutionStatus();
        break;

      case 'execution_error':
        this.showNotification('Error en ejecución: ' + payload.error, 'error');
        this.currentExecution = null;
        this.updateExecutionStatus();
        break;

      case 'log':
        this.appendLog(payload);
        break;

      default:
        console.log('⚠️ [E2E ADVANCED] Mensaje WebSocket desconocido:', type);
    }
  },

  /**
   * Actualizar indicador de conexión WebSocket
   */
  updateConnectionStatus(connected) {
    const indicator = document.getElementById('ws-connection-status');
    if (indicator) {
      indicator.innerHTML = connected
        ? '<span style="color: #10b981;">🟢 Conectado</span>'
        : '<span style="color: #ef4444;">🔴 Desconectado</span>';
    }
  },

  /**
   * Cargar phases disponibles
   */
  async loadAvailablePhases() {
    try {
      const response = await fetch('/api/e2e-advanced/phases', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.availablePhases = data.phases || [];
      console.log('✅ [E2E ADVANCED] Phases cargadas:', this.availablePhases.length);
    } catch (error) {
      console.error('❌ [E2E ADVANCED] Error cargando phases:', error);
      this.availablePhases = Object.keys(this.phaseConfig);
    }
  },

  /**
   * Cargar módulos disponibles
   */
  async loadAvailableModules() {
    try {
      const response = await fetch('/api/e2e-advanced/modules', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.availableModules = data.modules || [];
      console.log('✅ [E2E ADVANCED] Módulos cargados:', this.availableModules.length);
    } catch (error) {
      console.error('❌ [E2E ADVANCED] Error cargando módulos:', error);
      this.availableModules = ['users', 'attendance', 'departments', 'shifts'];
    }
  },

  /**
   * Cargar historial de ejecuciones
   */
  async loadExecutions() {
    try {
      const response = await fetch('/api/e2e-advanced/executions?limit=20', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.executions = data.executions || [];
      console.log('✅ [E2E ADVANCED] Ejecuciones cargadas:', this.executions.length);

      // Actualizar tabla de historial si está visible
      if (this.currentTab === 'overview') {
        this.renderHistoryTable();
      }
    } catch (error) {
      console.error('❌ [E2E ADVANCED] Error cargando ejecuciones:', error);
      this.executions = [];
    }
  },

  /**
   * Renderizar dashboard completo
   */
  render() {
    const container = document.getElementById('module-content');
    if (!container) {
      console.error('❌ [E2E ADVANCED] Contenedor module-content no encontrado');
      return;
    }

    container.innerHTML = `
      <div class="e2e-advanced-dashboard" style="padding: 20px; max-width: 1400px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <div>
            <h2 style="margin: 0 0 5px 0; color: #1e293b; font-size: 28px; font-weight: 700;">
              🧪 E2E Advanced Testing System
            </h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              Sistema completo de testing con 7 phases • Confidence Score 0-100
            </p>
          </div>
          <div style="display: flex; gap: 15px; align-items: center;">
            <div id="ws-connection-status" style="font-size: 12px; font-weight: 600;">
              <span style="color: #94a3b8;">🟡 Conectando...</span>
            </div>
            <button id="run-suite-btn" class="btn-primary" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              ▶️ Ejecutar Suite Completo
            </button>
            <button id="refresh-btn" style="padding: 10px 20px; background: white; color: #64748b; border: 2px solid #e2e8f0; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              🔄 Refresh
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; overflow-x: auto; white-space: nowrap;">
          ${this.renderTabs()}
        </div>

        <!-- Tab Content -->
        <div id="tab-content" style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 30px;">
          ${this.renderTabContent()}
        </div>
      </div>
    `;

    // Inicializar charts si estamos en overview
    if (this.currentTab === 'overview') {
      setTimeout(() => this.initializeCharts(), 100);
    }
  },

  /**
   * Renderizar tabs
   */
  renderTabs() {
    const tabs = [
      { id: 'overview', label: '📊 Overview', icon: '📊' },
      ...Object.entries(this.phaseConfig).map(([key, config]) => ({
        id: key,
        label: `${config.icon} ${config.name}`,
        icon: config.icon
      }))
    ];

    return tabs.map(tab => `
      <button
        class="tab-btn ${this.currentTab === tab.id ? 'active' : ''}"
        data-tab="${tab.id}"
        style="
          padding: 12px 24px;
          background: ${this.currentTab === tab.id ? '#3b82f6' : 'white'};
          color: ${this.currentTab === tab.id ? 'white' : '#64748b'};
          border: 2px solid ${this.currentTab === tab.id ? '#3b82f6' : '#e2e8f0'};
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        "
      >
        ${tab.label}
      </button>
    `).join('');
  },

  /**
   * Renderizar contenido del tab actual
   */
  renderTabContent() {
    switch (this.currentTab) {
      case 'overview':
        return this.renderOverviewTab();
      default:
        return this.renderPhaseTab(this.currentTab);
    }
  },

  /**
   * Renderizar tab Overview
   */
  renderOverviewTab() {
    const lastExecution = this.executions[0];
    const avgConfidence = this.executions.length > 0
      ? this.executions.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) / this.executions.length
      : 0;

    return `
      <!-- Ejecución actual (si existe) -->
      ${this.currentExecution ? `
        <div id="current-execution-status" style="margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; color: white;">
          <h3 style="margin: 0 0 15px 0; font-size: 20px;">⚡ Ejecución en Progreso</h3>
          <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-weight: 600;">Execution ID:</span>
              <span style="font-family: monospace;">${this.currentExecution.executionId || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-weight: 600;">Phase Actual:</span>
              <span>${this.currentExecution.currentPhase || 'Iniciando...'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600;">Progreso:</span>
              <span>${this.currentExecution.progress || 0}%</span>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.2); border-radius: 8px; height: 8px; overflow: hidden;">
            <div style="background: white; height: 100%; width: ${this.currentExecution.progress || 0}%; transition: width 0.3s;"></div>
          </div>
        </div>
      ` : ''}

      <!-- Stats Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <!-- Total Executions -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; color: white;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total Ejecuciones</div>
          <div style="font-size: 36px; font-weight: 700;">${this.executions.length}</div>
        </div>

        <!-- Avg Confidence -->
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 20px; color: white;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Confidence Promedio</div>
          <div style="font-size: 36px; font-weight: 700;">${avgConfidence.toFixed(1)}/100</div>
        </div>

        <!-- Last Execution -->
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 12px; padding: 20px; color: white;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Última Ejecución</div>
          <div style="font-size: 18px; font-weight: 700;">
            ${lastExecution ? new Date(lastExecution.startedAt).toLocaleString('es-AR') : 'N/A'}
          </div>
        </div>

        <!-- Status -->
        <div style="background: ${lastExecution?.status === 'passed' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : lastExecution?.status === 'warning' ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' : 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'}; border-radius: 12px; padding: 20px; color: white;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Último Status</div>
          <div style="font-size: 24px; font-weight: 700; text-transform: uppercase;">
            ${lastExecution?.status || 'N/A'}
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <!-- Confidence Score Chart -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; font-weight: 600;">📈 Confidence Score (últimas 10)</h3>
          <canvas id="confidence-chart" style="max-height: 250px;"></canvas>
        </div>

        <!-- Phase Weight Distribution -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; font-weight: 600;">🎯 Distribución de Pesos</h3>
          <canvas id="weights-chart" style="max-height: 250px;"></canvas>
        </div>
      </div>

      <!-- History Table -->
      <div>
        <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; font-weight: 600;">📜 Historial de Ejecuciones</h3>
        <div id="history-table-container">
          ${this.renderHistoryTable()}
        </div>
      </div>
    `;
  },

  /**
   * Renderizar tabla de historial
   */
  renderHistoryTable() {
    if (this.executions.length === 0) {
      return `
        <div style="background: #f1f5f9; border-radius: 8px; padding: 40px; text-align: center; color: #64748b;">
          <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
          <div style="font-size: 16px; font-weight: 600;">No hay ejecuciones registradas</div>
          <div style="font-size: 14px; margin-top: 5px;">Ejecuta el suite completo para ver resultados</div>
        </div>
      `;
    }

    return `
      <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">ID</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Inicio</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Duración</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Modules</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Confidence</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Status</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${this.executions.map((exec, idx) => `
              <tr style="background: ${idx % 2 === 0 ? 'white' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px; font-family: monospace; font-size: 12px; color: #64748b;">${(exec.executionId || exec.id || '').substring(0, 8)}...</td>
                <td style="padding: 12px; color: #475569;">${new Date(exec.startedAt).toLocaleString('es-AR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td style="padding: 12px; color: #475569;">${this.formatDuration(exec.duration)}</td>
                <td style="padding: 12px; color: #475569;">${(exec.modules || []).length} módulos</td>
                <td style="padding: 12px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="flex: 1; background: #e2e8f0; border-radius: 4px; height: 6px; overflow: hidden;">
                      <div style="background: ${exec.confidenceScore >= 90 ? '#10b981' : exec.confidenceScore >= 70 ? '#f59e0b' : '#ef4444'}; height: 100%; width: ${exec.confidenceScore || 0}%;"></div>
                    </div>
                    <span style="font-weight: 600; color: ${exec.confidenceScore >= 90 ? '#10b981' : exec.confidenceScore >= 70 ? '#f59e0b' : '#ef4444'}; min-width: 40px;">${(exec.confidenceScore || 0).toFixed(0)}</span>
                  </div>
                </td>
                <td style="padding: 12px;">
                  <span style="padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${exec.status === 'passed' ? '#d1fae5' : exec.status === 'warning' ? '#fef3c7' : exec.status === 'failed' ? '#fee2e2' : '#f1f5f9'}; color: ${exec.status === 'passed' ? '#065f46' : exec.status === 'warning' ? '#92400e' : exec.status === 'failed' ? '#991b1b' : '#475569'};">
                    ${exec.status || 'unknown'}
                  </span>
                </td>
                <td style="padding: 12px;">
                  <button class="view-execution-btn" data-id="${exec.id}" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                    Ver Detalles
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Renderizar tab de phase específica
   */
  renderPhaseTab(phaseKey) {
    const config = this.phaseConfig[phaseKey];
    if (!config) {
      return `<div style="text-align: center; padding: 40px; color: #64748b;">Phase no encontrada</div>`;
    }

    const lastExecution = this.executions.find(e => e.phaseResults && e.phaseResults[phaseKey]);
    const lastResult = lastExecution?.phaseResults?.[phaseKey];

    return `
      <!-- Phase Header -->
      <div style="background: linear-gradient(135deg, ${config.color}dd 0%, ${config.color}88 100%); border-radius: 12px; padding: 30px; color: white; margin-bottom: 30px;">
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 15px;">
          <div style="font-size: 64px;">${config.icon}</div>
          <div style="flex: 1;">
            <h2 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">${config.name}</h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">${config.description}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 5px;">Peso en Score</div>
            <div style="font-size: 36px; font-weight: 700;">${config.weight}%</div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      ${lastResult ? `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; border-left: 4px solid #3b82f6;">
            <div style="font-size: 12px; color: #64748b; margin-bottom: 5px; font-weight: 600;">TOTAL TESTS</div>
            <div style="font-size: 28px; font-weight: 700; color: #1e293b;">${lastResult.total || 0}</div>
          </div>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; border-left: 4px solid #10b981;">
            <div style="font-size: 12px; color: #064e3b; margin-bottom: 5px; font-weight: 600;">PASSED</div>
            <div style="font-size: 28px; font-weight: 700; color: #10b981;">${lastResult.passed || 0}</div>
          </div>
          <div style="background: #fef2f2; border-radius: 8px; padding: 20px; border-left: 4px solid #ef4444;">
            <div style="font-size: 12px; color: #7f1d1d; margin-bottom: 5px; font-weight: 600;">FAILED</div>
            <div style="font-size: 28px; font-weight: 700; color: #ef4444;">${lastResult.failed || 0}</div>
          </div>
          <div style="background: #fffbeb; border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b;">
            <div style="font-size: 12px; color: #78350f; margin-bottom: 5px; font-weight: 600;">WARNINGS</div>
            <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${lastResult.warnings || 0}</div>
          </div>
        </div>
      ` : `
        <div style="background: #f1f5f9; border-radius: 8px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
          <div style="font-size: 16px; color: #64748b; font-weight: 600;">No hay resultados disponibles</div>
          <div style="font-size: 14px; color: #94a3b8; margin-top: 5px;">Ejecuta el suite completo para ver resultados de esta phase</div>
        </div>
      `}

      <!-- Test Details -->
      ${lastResult?.tests && lastResult.tests.length > 0 ? `
        <div>
          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; font-weight: 600;">🧪 Tests Ejecutados</h3>
          <div style="max-height: 500px; overflow-y: auto; border-radius: 8px; border: 1px solid #e2e8f0;">
            ${lastResult.tests.map((test, idx) => `
              <div style="padding: 15px; border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? 'white' : '#f8fafc'};">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                  <span style="font-size: 18px;">${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️'}</span>
                  <span style="font-weight: 600; color: #1e293b;">${test.name || test.title || 'Test sin nombre'}</span>
                </div>
                ${test.error ? `
                  <div style="margin-top: 10px; padding: 10px; background: #fef2f2; border-radius: 6px; border-left: 3px solid #ef4444;">
                    <div style="font-size: 12px; font-weight: 600; color: #991b1b; margin-bottom: 5px;">ERROR:</div>
                    <div style="font-size: 12px; color: #7f1d1d; font-family: monospace;">${test.error}</div>
                  </div>
                ` : ''}
                ${test.duration ? `
                  <div style="font-size: 12px; color: #64748b; margin-top: 5px;">⏱️ ${test.duration}ms</div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Metrics -->
      ${lastResult?.metrics && Object.keys(lastResult.metrics).length > 0 ? `
        <div style="margin-top: 30px;">
          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px; font-weight: 600;">📊 Métricas</h3>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              ${Object.entries(lastResult.metrics).map(([key, value]) => `
                <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #e2e8f0;">
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">${key.replace(/_/g, ' ')}</div>
                  <div style="font-size: 20px; font-weight: 700; color: #1e293b;">${typeof value === 'number' ? value.toFixed(2) : value}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}
    `;
  },

  /**
   * Inicializar charts (Chart.js)
   */
  initializeCharts() {
    // Confidence Score Chart
    const confidenceCtx = document.getElementById('confidence-chart');
    if (confidenceCtx && typeof Chart !== 'undefined') {
      const last10 = this.executions.slice(0, 10).reverse();

      if (this.charts.confidence) {
        this.charts.confidence.destroy();
      }

      this.charts.confidence = new Chart(confidenceCtx, {
        type: 'line',
        data: {
          labels: last10.map((e, i) => `#${i + 1}`),
          datasets: [{
            label: 'Confidence Score',
            data: last10.map(e => e.confidenceScore || 0),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `Score: ${context.parsed.y.toFixed(1)}/100`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (value) => value + '%'
              }
            }
          }
        }
      });
    }

    // Phase Weights Chart
    const weightsCtx = document.getElementById('weights-chart');
    if (weightsCtx && typeof Chart !== 'undefined') {
      if (this.charts.weights) {
        this.charts.weights.destroy();
      }

      const phases = Object.entries(this.phaseConfig);

      this.charts.weights = new Chart(weightsCtx, {
        type: 'doughnut',
        data: {
          labels: phases.map(([k, c]) => c.name),
          datasets: [{
            data: phases.map(([k, c]) => c.weight),
            backgroundColor: phases.map(([k, c]) => c.color),
            borderWidth: 2,
            borderColor: 'white'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                usePointStyle: true,
                padding: 15
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => `${context.label}: ${context.parsed}%`
              }
            }
          }
        }
      });
    }
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        const tab = e.target.dataset.tab;
        if (tab && tab !== this.currentTab) {
          this.currentTab = tab;
          this.render();
        }
      }

      // Run suite button
      if (e.target.id === 'run-suite-btn') {
        this.showRunSuiteDialog();
      }

      // Refresh button
      if (e.target.id === 'refresh-btn') {
        this.loadExecutions();
        this.showNotification('Datos actualizados', 'info');
      }

      // View execution button
      if (e.target.classList.contains('view-execution-btn')) {
        const id = e.target.dataset.id;
        if (id) {
          this.showExecutionDetails(id);
        }
      }
    });
  },

  /**
   * Mostrar diálogo para ejecutar suite
   */
  showRunSuiteDialog() {
    const modules = this.availableModules;

    Utils.showModal({
      title: '▶️ Ejecutar Suite Completo',
      content: `
        <div style="padding: 20px;">
          <p style="margin-bottom: 20px; color: #475569;">
            Selecciona los módulos a testear. El sistema ejecutará las 7 phases para cada módulo seleccionado.
          </p>

          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #1e293b;">
              Módulos a Testear:
            </label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-height: 300px; overflow-y: auto; padding: 10px; background: #f8fafc; border-radius: 8px;">
              ${modules.map(mod => `
                <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: white; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
                  <input type="checkbox" name="module" value="${mod}" checked style="cursor: pointer;">
                  <span style="font-weight: 500; color: #475569;">${mod}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <div style="font-weight: 600; color: #92400e; margin-bottom: 5px;">⚠️ Advertencia</div>
            <div style="font-size: 14px; color: #78350f;">
              La ejecución completa puede tardar varios minutos dependiendo de los módulos seleccionados.
              Podrás ver el progreso en tiempo real.
            </div>
          </div>
        </div>
      `,
      onConfirm: async () => {
        const selectedModules = Array.from(document.querySelectorAll('input[name="module"]:checked'))
          .map(input => input.value);

        if (selectedModules.length === 0) {
          Utils.showNotification('Debes seleccionar al menos un módulo', 'warning');
          return;
        }

        await this.runSuite(selectedModules);
      },
      confirmText: '▶️ Ejecutar',
      cancelText: '❌ Cancelar'
    });
  },

  /**
   * Ejecutar suite completo
   */
  async runSuite(modules) {
    try {
      Utils.showNotification('Iniciando ejecución...', 'info');

      const response = await fetch('/api/e2e-advanced/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modules,
          options: {
            saveResults: true,
            notifyOnComplete: true
          }
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      Utils.showNotification('Ejecución iniciada. Ver progreso en Overview.', 'success');

      // Cambiar a tab overview
      this.currentTab = 'overview';
      this.render();

    } catch (error) {
      console.error('❌ [E2E ADVANCED] Error ejecutando suite:', error);
      Utils.showNotification('Error al ejecutar suite: ' + error.message, 'error');
    }
  },

  /**
   * Mostrar detalles de ejecución
   */
  async showExecutionDetails(id) {
    try {
      const response = await fetch(`/api/e2e-advanced/executions/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const exec = data.execution;

      Utils.showModal({
        title: `📊 Detalles de Ejecución`,
        content: `
          <div style="padding: 20px; max-height: 500px; overflow-y: auto;">
            <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Execution ID</div>
                  <div style="font-family: monospace; font-size: 14px; color: #1e293b; font-weight: 600;">${exec.executionId}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Status</div>
                  <div style="font-weight: 600; color: ${exec.status === 'passed' ? '#10b981' : exec.status === 'warning' ? '#f59e0b' : '#ef4444'}; text-transform: uppercase;">${exec.status}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Confidence Score</div>
                  <div style="font-size: 20px; font-weight: 700; color: ${exec.confidenceScore >= 90 ? '#10b981' : exec.confidenceScore >= 70 ? '#f59e0b' : '#ef4444'};">${exec.confidenceScore.toFixed(1)}/100</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Duración</div>
                  <div style="font-weight: 600; color: #1e293b;">${this.formatDuration(exec.duration)}</div>
                </div>
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px; font-weight: 600;">Módulos Testeados (${(exec.modules || []).length})</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${(exec.modules || []).map(mod => `
                  <span style="padding: 6px 12px; background: #dbeafe; color: #1e40af; border-radius: 6px; font-size: 12px; font-weight: 600;">${mod}</span>
                `).join('')}
              </div>
            </div>

            <div>
              <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 16px; font-weight: 600;">Resultados por Phase</h4>
              ${Object.entries(exec.phaseResults || {}).map(([phaseKey, result]) => {
                const config = this.phaseConfig[phaseKey] || {};
                return `
                  <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${config.color || '#3b82f6'};">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                      <span style="font-size: 24px;">${config.icon || '📊'}</span>
                      <span style="font-weight: 600; color: #1e293b; font-size: 16px;">${config.name || phaseKey}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 13px;">
                      <div>
                        <div style="color: #64748b;">Total</div>
                        <div style="font-weight: 600; color: #1e293b;">${result.total || 0}</div>
                      </div>
                      <div>
                        <div style="color: #064e3b;">Passed</div>
                        <div style="font-weight: 600; color: #10b981;">${result.passed || 0}</div>
                      </div>
                      <div>
                        <div style="color: #7f1d1d;">Failed</div>
                        <div style="font-weight: 600; color: #ef4444;">${result.failed || 0}</div>
                      </div>
                      <div>
                        <div style="color: #78350f;">Warnings</div>
                        <div style="font-weight: 600; color: #f59e0b;">${result.warnings || 0}</div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `,
        size: 'large'
      });

    } catch (error) {
      console.error('❌ [E2E ADVANCED] Error cargando detalles:', error);
      Utils.showNotification('Error al cargar detalles: ' + error.message, 'error');
    }
  },

  /**
   * Actualizar estado de ejecución actual
   */
  updateExecutionStatus() {
    const statusContainer = document.getElementById('current-execution-status');
    if (!statusContainer || !this.currentExecution) return;

    statusContainer.innerHTML = `
      <h3 style="margin: 0 0 15px 0; font-size: 20px;">⚡ Ejecución en Progreso</h3>
      <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-weight: 600;">Execution ID:</span>
          <span style="font-family: monospace;">${this.currentExecution.executionId || 'N/A'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-weight: 600;">Phase Actual:</span>
          <span>${this.currentExecution.currentPhase || 'Iniciando...'}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: 600;">Progreso:</span>
          <span>${this.currentExecution.progress || 0}%</span>
        </div>
      </div>
      <div style="background: rgba(255,255,255,0.2); border-radius: 8px; height: 8px; overflow: hidden;">
        <div style="background: white; height: 100%; width: ${this.currentExecution.progress || 0}%; transition: width 0.3s;"></div>
      </div>
    `;
  },

  /**
   * Actualizar tab de phase específica
   */
  updatePhaseTab(phaseKey, result) {
    // Si estamos viendo ese tab, re-renderizar
    if (this.currentTab === phaseKey) {
      // Buscar la ejecución actual en el array y actualizar sus resultados
      const currentExecIndex = this.executions.findIndex(e => e.executionId === this.currentExecution?.executionId);
      if (currentExecIndex !== -1) {
        if (!this.executions[currentExecIndex].phaseResults) {
          this.executions[currentExecIndex].phaseResults = {};
        }
        this.executions[currentExecIndex].phaseResults[phaseKey] = result;
      }

      this.render();
    }
  },

  /**
   * Agregar log al console
   */
  appendLog(logEntry) {
    console.log(`📝 [E2E ADVANCED] ${logEntry.phase || 'System'}: ${logEntry.message}`);
  },

  /**
   * Auto-refresh periódico
   */
  startAutoRefresh() {
    setInterval(async () => {
      if (this.currentTab === 'overview') {
        await this.loadExecutions();
        // Solo actualizar tabla si no hay ejecución en progreso
        if (!this.currentExecution) {
          const tableContainer = document.getElementById('history-table-container');
          if (tableContainer) {
            tableContainer.innerHTML = this.renderHistoryTable();
          }
        }
      }
    }, 30000); // Cada 30 segundos
  },

  /**
   * Formatear duración (ms to human readable)
   */
  formatDuration(ms) {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },

  /**
   * Mostrar notificación
   */
  showNotification(message, type = 'info') {
    if (typeof Utils !== 'undefined' && Utils.showNotification) {
      Utils.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  },

  /**
   * Mostrar error
   */
  showError(title, message) {
    if (typeof Utils !== 'undefined' && Utils.showModal) {
      Utils.showModal({
        title: `❌ ${title}`,
        content: `
          <div style="padding: 20px;">
            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px;">
              <div style="font-weight: 600; color: #991b1b; margin-bottom: 5px;">Error</div>
              <div style="color: #7f1d1d;">${message}</div>
            </div>
          </div>
        `
      });
    } else {
      alert(`${title}: ${message}`);
    }
  },

  /**
   * Cleanup al cerrar
   */
  destroy() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }

    Object.values(this.charts).forEach(chart => {
      if (chart && chart.destroy) {
        chart.destroy();
      }
    });

    this.charts = {};
    this.isInitialized = false;

    console.log('🧹 [E2E ADVANCED] Dashboard cleanup completado');
  }
};

// Export global
if (typeof window !== 'undefined') {
  window.E2EAdvancedDashboard = E2EAdvancedDashboard;
}

console.log('✅ [E2E ADVANCED] Dashboard registrado globalmente');
