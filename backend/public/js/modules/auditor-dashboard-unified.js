/**
 * 🚀 AUDITOR DASHBOARD UNIFICADO - Sistema de Auditoría con 3 Modos
 *
 * MODOS DISPONIBLES:
 * 1. MODO PASIVO - Monitoreo continuo de usuarios reales (sin ciclos)
 * 2. MODO ACTIVO - Auditoría completa con ciclos configurables (1-1000)
 * 3. MODO ITERATIVO - Auditoría intensiva pre-configurada (500+ ciclos)
 *
 * CARACTERÍSTICAS:
 * - WebSocket para actualizaciones en tiempo real
 * - Gráficos de progreso (Chart.js)
 * - Log viewer en vivo
 * - Controles START/STOP/PAUSE universales
 * - Tabla de errores y fixes aplicados
 * - Health score progression
 *
 * @version 2.0.0
 * @date 2025-10-20
 */

// ═══════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════

let socket = null; // Socket.IO instance
let currentMode = null; // 'passive', 'active', 'iterative'
let isRunning = false;
let currentCycle = 0;
let maxCycles = 0;
let progressChart = null;
let healthChart = null;
let logsBuffer = [];

// ═══════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL - RENDERIZAR PANEL
// ═══════════════════════════════════════════════════════════

async function showAuditorContent(containerId = null) {
  console.log('🔍 [AUDITOR-UNIFIED] Cargando panel unificado...');

  // Buscar contenedor: priorizar el pasado como parámetro, luego auditorDashboardContainer (panel-admin), luego mainContent (panel-empresa)
  let container;
  if (containerId) {
    container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  } else {
    container = document.getElementById('auditorDashboardContainer') || document.getElementById('mainContent');
  }

  if (!container) {
    console.error('❌ [AUDITOR] No se encontró contenedor válido (auditorDashboardContainer o mainContent)');
    return;
  }

  console.log(`✅ [AUDITOR] Usando contenedor: ${container.id}`);

  // Inyectar estilos
  injectUnifiedStyles();

  // Renderizar UI completa
  container.innerHTML = renderUnifiedPanel();

  // Inicializar componentes
  await initializeComponents();

  console.log('✅ [AUDITOR-UNIFIED] Panel cargado');
}

// ═══════════════════════════════════════════════════════════
// RENDERIZAR PANEL UNIFICADO
// ═══════════════════════════════════════════════════════════

function renderUnifiedPanel() {
  return `
    <div class="auditor-unified-container">
      <!-- HEADER -->
      <div class="auditor-header">
        <div class="header-title">
          <h2>🚀 Sistema de Auditoría Unificado</h2>
          <p class="subtitle">Monitoreo, Testing y Auto-Reparación Multi-Modo</p>
        </div>
        <div class="header-status">
          <div class="status-badge" id="status-badge">
            🔴 <span id="status-text">Detenido</span>
          </div>
        </div>
      </div>

      <!-- OPCIONES DE TESTING -->
      <div class="testing-options-container">
        <h3>🎯 Testing Profundo con Auto-Reparación</h3>
        <p class="testing-subtitle">Sistema completo de testing + auto-repair + reportes técnicos detallados</p>
        <div class="testing-cards">
          <!-- TEST PROFUNDO CON REPORTE (PHASE 4) -->
          <div class="testing-card testing-card-phase4" id="testing-phase4" onclick="executeTestPhase4()">
            <div class="testing-icon">🔬</div>
            <div class="testing-title">TEST PROFUNDO CON REPORTE</div>
            <div class="testing-description">
              Test completo con auto-reparación inteligente y reporte técnico detallado. Elige TODOS los módulos o uno específico.
            </div>
            <div class="testing-features">
              <div class="feature">✅ Puppeteer visible (headless: false)</div>
              <div class="feature">✅ Auto-reparación con Ollama + Patterns</div>
              <div class="feature">✅ Reporte con 7 secciones + timestamps</div>
              <div class="feature">✅ Prefijos "test_" fáciles de borrar</div>
              <div class="feature">✅ Comparación histórica</div>
              <div class="feature">✅ Aprendizaje en Knowledge Base</div>
            </div>
            <button class="btn-test-option btn-test-phase4">🚀 INICIAR TEST PROFUNDO</button>
          </div>
        </div>

        <div class="phase4-info">
          <strong>💡 ¿Qué hace este test?</strong>
          <ol>
            <li><strong>Test profundo</strong>: Ejecuta tests E2E con Puppeteer (navegador visible)</li>
            <li><strong>Auto-reparación</strong>: Si detecta fallos, intenta repararlos automáticamente</li>
            <li><strong>Reporte técnico</strong>: Genera reporte detallado con numeración, timestamps y métricas</li>
          </ol>
          <p><strong>Datos de prueba</strong>: Usa prefijo "test_" (ej: "test_John Doe") para fácil limpieza después.</p>
        </div>
      </div>

      <!-- SELECTOR DE MODO -->
      <div class="mode-selector-container">
        <h3>📋 Selecciona el Modo de Auditoría Automática</h3>
        <div class="mode-cards">
          <!-- MODO PASIVO -->
          <div class="mode-card" id="mode-passive" onclick="selectMode('passive')">
            <div class="mode-icon">👀</div>
            <div class="mode-title">MODO PASIVO</div>
            <div class="mode-description">
              Monitoreo continuo de usuarios reales. Detecta y repara errores en tiempo real sin interrumpir.
            </div>
            <div class="mode-features">
              <div class="feature">✅ Sin ciclos (continuo)</div>
              <div class="feature">✅ Auto-reparación</div>
              <div class="feature">✅ Documentación automática</div>
            </div>
          </div>

          <!-- MODO ACTIVO -->
          <div class="mode-card" id="mode-active" onclick="selectMode('active')">
            <div class="mode-icon">⚡</div>
            <div class="mode-title">MODO ACTIVO</div>
            <div class="mode-description">
              Auditoría completa sistemática con ciclos configurables. Navegador visible.
            </div>
            <div class="mode-features">
              <div class="feature">✅ Ciclos configurables (1-1000)</div>
              <div class="feature">✅ Navegador visible</div>
              <div class="feature">✅ Mejora incremental</div>
            </div>
          </div>

          <!-- MODO ITERATIVO -->
          <div class="mode-card" id="mode-iterative" onclick="selectMode('iterative')">
            <div class="mode-icon">🔁</div>
            <div class="mode-title">MODO ITERATIVO</div>
            <div class="mode-description">
              Auditoría intensiva pre-configurada. Objetivo: Alcanzar 100% de éxito.
            </div>
            <div class="mode-features">
              <div class="feature">✅ Pre-configurado (500+ ciclos)</div>
              <div class="feature">✅ Máxima profundidad</div>
              <div class="feature">✅ Objetivo: 100%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL DE CONFIGURACIÓN (visible cuando se selecciona un modo) -->
      <div class="config-panel" id="config-panel" style="display: none;">
        <h3>⚙️ Configuración del Modo: <span id="selected-mode-name"></span></h3>

        <!-- Config para MODO ACTIVO -->
        <div id="config-active" style="display: none;">
          <div class="config-row">
            <label for="cycles-input">Número de Ciclos (1-1000):</label>
            <input type="number" id="cycles-input" min="1" max="1000" value="10" class="form-control">
          </div>
          <div class="config-row">
            <label for="target-rate-input">Tasa de Éxito Objetivo (%):</label>
            <input type="number" id="target-rate-input" min="0" max="100" value="100" class="form-control">
          </div>
        </div>

        <!-- Config para MODO ITERATIVO -->
        <div id="config-iterative" style="display: none;">
          <div class="config-info">
            <p>📊 Ciclos: 500 (pre-configurado)</p>
            <p>🎯 Objetivo: 100% de éxito</p>
            <p>⏱️ Duración estimada: 2-4 horas</p>
          </div>
        </div>

        <!-- Config para MODO PASIVO -->
        <div id="config-passive" style="display: none;">
          <div class="config-info">
            <p>⏰ Intervalo de monitoreo: 2 minutos</p>
            <p>🔄 Ejecución continua hasta detener</p>
          </div>
        </div>

        <!-- Botones de Control -->
        <div class="control-buttons">
          <button class="btn-start" id="btn-start" onclick="startAudit()">
            ▶️ INICIAR
          </button>
          <button class="btn-stop" id="btn-stop" onclick="stopAudit()" disabled>
            ⏹️ DETENER
          </button>
          <button class="btn-back" onclick="backToModeSelection()">
            ⬅️ VOLVER
          </button>
        </div>
      </div>

      <!-- PANEL DE EJECUCIÓN (visible cuando está corriendo) -->
      <div class="execution-panel" id="execution-panel" style="display: none;">
        <div class="execution-header">
          <h3>📊 Ejecución en Progreso</h3>
          <div class="execution-mode-badge" id="execution-mode-badge"></div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-container">
          <div class="progress-header">
            <span id="progress-text">Ciclo 0/0</span>
            <span id="progress-percent">0%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
          </div>
        </div>

        <!-- Métricas en Tiempo Real -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">✅</div>
            <div class="metric-value" id="metric-passed">0</div>
            <div class="metric-label">Tests Pasados</div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">❌</div>
            <div class="metric-value" id="metric-failed">0</div>
            <div class="metric-label">Tests Fallados</div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">🔧</div>
            <div class="metric-value" id="metric-repaired">0</div>
            <div class="metric-label">Errores Reparados</div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">📊</div>
            <div class="metric-value" id="metric-success-rate">0%</div>
            <div class="metric-label">Tasa de Éxito</div>
          </div>
        </div>

        <!-- Gráficos -->
        <div class="charts-container">
          <div class="chart-wrapper">
            <h4>📈 Progreso de Ciclos</h4>
            <canvas id="progress-chart"></canvas>
          </div>
          <div class="chart-wrapper">
            <h4>💚 Health Score Evolution</h4>
            <canvas id="health-chart"></canvas>
          </div>
        </div>

        <!-- Log Viewer en Tiempo Real -->
        <div class="log-viewer">
          <div class="log-header">
            <h4>📜 Logs en Tiempo Real</h4>
            <button class="btn-clear-logs" onclick="clearLogs()">🗑️ Limpiar</button>
          </div>
          <div class="log-container" id="log-container">
            <div class="log-entry log-info">
              🔵 Esperando inicio de auditoría...
            </div>
          </div>
        </div>

        <!-- Tabla de Errores Detectados -->
        <div class="errors-table-container">
          <h4>❌ Errores Detectados</h4>
          <div class="table-wrapper">
            <table class="errors-table" id="errors-table">
              <thead>
                <tr>
                  <th>Ciclo</th>
                  <th>Módulo</th>
                  <th>Tipo</th>
                  <th>Error</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody id="errors-tbody">
                <tr>
                  <td colspan="6" class="no-errors">Sin errores detectados</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ⭐ MEGA-UPGRADE: Real-Time Error Detection Dashboard -->
        <div class="realtime-errors-container">
          <div class="realtime-header">
            <h4>🚨 Detección de Errores en Tiempo Real (MEGA-UPGRADE)</h4>
            <div class="realtime-status">
              <span class="status-indicator" id="realtime-status">🔴 Esperando...</span>
              <span class="error-count-badge" id="realtime-error-count">0 errores</span>
            </div>
          </div>

          <!-- Métricas del MEGA-UPGRADE -->
          <div class="realtime-metrics">
            <div class="realtime-metric">
              <div class="metric-label">🔍 Errores JS</div>
              <div class="metric-value" id="js-errors-count">0</div>
            </div>
            <div class="realtime-metric">
              <div class="metric-label">🌐 Errores HTTP</div>
              <div class="metric-value" id="http-errors-count">0</div>
            </div>
            <div class="realtime-metric">
              <div class="metric-label">🔗 Errores Network</div>
              <div class="metric-value" id="network-errors-count">0</div>
            </div>
            <div class="realtime-metric">
              <div class="metric-label">🔄 Errores CORS</div>
              <div class="metric-value" id="cors-errors-count">0</div>
            </div>
            <div class="realtime-metric">
              <div class="metric-label">🔧 Auto-Fixable</div>
              <div class="metric-value" id="autofix-count">0</div>
            </div>
            <div class="realtime-metric">
              <div class="metric-label">✅ Fixes Aplicados</div>
              <div class="metric-value" id="fixes-applied-count">0</div>
            </div>
          </div>

          <!-- Tabla de Errores en Tiempo Real con Clasificación -->
          <div class="realtime-errors-table-wrapper">
            <table class="realtime-errors-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Categoría</th>
                  <th>Severidad</th>
                  <th>Archivo</th>
                  <th>Línea</th>
                  <th>Mensaje</th>
                  <th>Auto-Fix</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody id="realtime-errors-tbody">
                <tr>
                  <td colspan="8" class="no-realtime-errors">
                    <div class="waiting-message">
                      🔍 Esperando detección de errores en tiempo real...<br>
                      <small>El MEGA-UPGRADE detectará 100+ tipos de errores automáticamente</small>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Batch Errors Log (para 60s post-login) -->
          <div class="batch-errors-log" id="batch-errors-log" style="display: none;">
            <h5>📦 Batch de Errores Detectados (60s post-login)</h5>
            <div class="batch-info" id="batch-info">
              <span class="batch-phase">Fase: -</span>
              <span class="batch-duration">Duración: -</span>
              <span class="batch-count">Errores: 0</span>
            </div>
            <div class="batch-errors-list" id="batch-errors-list"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// INICIALIZAR COMPONENTES
// ═══════════════════════════════════════════════════════════

async function initializeComponents() {
  // Inicializar WebSocket
  initializeWebSocket();

  // Inicializar gráficos (Chart.js)
  initializeCharts();

  console.log('✅ [AUDITOR] Componentes inicializados');
}

// ═══════════════════════════════════════════════════════════
// WEBSOCKET - CONEXIÓN Y LISTENERS
// ═══════════════════════════════════════════════════════════

function initializeWebSocket() {
  // Verificar que Socket.IO esté cargado
  if (typeof io === 'undefined') {
    console.warn('⚠️ [WEBSOCKET] Socket.IO no está cargado aún. Reintentando en 1 segundo...');
    setTimeout(initializeWebSocket, 1000);
    return;
  }

  // Conectar a Socket.IO con URL completa y path específico
  const serverUrl = window.location.origin; // http://localhost:9998
  socket = io(serverUrl, {
    path: '/auditor-socket',
    transports: ['polling', 'websocket'], // Probar polling primero
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('🔌 [WEBSOCKET] Conectado al servidor');

    // Subscribe al room de auditor
    socket.emit('subscribe-auditor');

    addLog('🟢 Conectado al servidor de actualizaciones', 'success');
  });

  socket.on('disconnect', () => {
    console.log('🔌 [WEBSOCKET] Desconectado');
    addLog('🔴 Desconectado del servidor', 'error');
  });

  // Escuchar inicio de ciclo
  socket.on('cycle-start', (data) => {
    console.log('🔄 [WEBSOCKET] Ciclo iniciado:', data);
    currentCycle = data.cycle;
    maxCycles = data.maxCycles;
    updateProgress();
    addLog(`🔄 Iniciando ciclo ${data.cycle}/${data.maxCycles}`, 'info');
  });

  // Escuchar completación de ciclo
  socket.on('cycle-complete', (data) => {
    console.log('✅ [WEBSOCKET] Ciclo completado:', data);
    updateMetrics(data);
    updateCharts(data);
    addLog(`✅ Ciclo ${data.cycle} completado - Éxito: ${data.successRate}%`, 'success');
  });

  // Escuchar errores detectados
  socket.on('error-detected', (data) => {
    console.log('❌ [WEBSOCKET] Error detectado:', data);
    addErrorToTable(data);
    addLog(`❌ Error en ${data.module}: ${data.error}`, 'error');
  });

  // Escuchar fix aplicado
  socket.on('fix-applied', (data) => {
    console.log('🔧 [WEBSOCKET] Fix aplicado:', data);
    addLog(`🔧 Fix aplicado en ${data.module}`, 'success');
  });

  // ⭐ NUEVO: Escuchar resumen final de auditoría
  socket.on('audit-summary', (data) => {
    console.log('📊 [WEBSOCKET] Resumen final recibido:', data);
    displayAuditSummary(data);
    addLog(`📊 Auditoría completada - ${data.passed}/${data.total} tests pasaron (${data.successRate}%)`, 'success');
  });

  // ⭐ NUEVO: Escuchar progreso de tests en tiempo real
  socket.on('test-progress', (data) => {
    console.log('📊 [WEBSOCKET] Progreso de test:', data);

    // Mostrar mensaje específico según la fase
    let icon = '🔍';
    if (data.phase === 'audit') icon = '🔍';
    else if (data.phase === 'analysis') icon = '📊';
    else if (data.phase === 'repair') icon = '🔧';
    else if (data.phase === 'learning') icon = '🧠';
    else if (data.phase === 'collection') icon = '📦';

    // Agregar al log con el mensaje del backend
    addLog(`${icon} ${data.message}`, 'info');

    // Actualizar barra de progreso si hay collector
    if (data.collector) {
      // Incrementar progreso gradualmente
      const progressBar = document.querySelector('.progress-bar');
      if (progressBar) {
        const currentProgress = parseInt(progressBar.style.width || '0');
        const newProgress = Math.min(currentProgress + 10, 90); // Máximo 90% hasta completar
        progressBar.style.width = `${newProgress}%`;
      }
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ⭐ MEGA-UPGRADE: WEBSOCKET LISTENERS PARA DETECCIÓN EN TIEMPO REAL
  // ═══════════════════════════════════════════════════════════

  // Escuchar error individual detectado en tiempo real
  socket.on('error-detected', (data) => {
    console.log('🚨 [MEGA-UPGRADE] Error detectado en tiempo real:', data);
    handleRealtimeError(data.error || data);
    updateRealtimeStatus('🟢 Activo');
  });

  // Escuchar batch de errores (60s post-login)
  socket.on('errors-batch', (data) => {
    console.log('📦 [MEGA-UPGRADE] Batch de errores recibido:', data);
    handleErrorsBatch(data);
    updateRealtimeStatus('🟢 Activo');
  });

  // Escuchar fix aplicado exitosamente
  socket.on('fix-applied-success', (data) => {
    console.log('✅ [MEGA-UPGRADE] Fix aplicado:', data);
    handleFixApplied(data);
    incrementFixesAppliedCount();
  });

  // Escuchar fix fallido
  socket.on('fix-applied-failed', (data) => {
    console.log('❌ [MEGA-UPGRADE] Fix falló:', data);
    handleFixFailed(data);
  });

  // Unirse al room de actualizaciones del auditor
  socket.on('connect', () => {
    console.log('🔌 [WEBSOCKET] Conectado - Uniéndose a auditor-updates room');
    socket.emit('join-room', 'auditor-updates');
  });
}

// ═══════════════════════════════════════════════════════════
// GRÁFICOS - INICIALIZACIÓN Y ACTUALIZACIÓN
// ═══════════════════════════════════════════════════════════

function initializeCharts() {
  const progressCtx = document.getElementById('progress-chart')?.getContext('2d');
  const healthCtx = document.getElementById('health-chart')?.getContext('2d');

  if (!progressCtx || !healthCtx) {
    console.log('⚠️ [CHARTS] Canvas no encontrados aún');
    return;
  }

  // Gráfico de Progreso
  progressChart = new Chart(progressCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Tests Pasados',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }, {
        label: 'Tests Fallados',
        data: [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // Gráfico de Health Score
  healthChart = new Chart(healthCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Success Rate (%)',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
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
      }
    }
  });

  console.log('📊 [CHARTS] Gráficos inicializados');
}

function updateCharts(data) {
  if (!progressChart || !healthChart) {
    return;
  }

  const cycleLabel = `Ciclo ${data.cycle}`;

  // Actualizar gráfico de progreso
  progressChart.data.labels.push(cycleLabel);
  progressChart.data.datasets[0].data.push(data.passed);
  progressChart.data.datasets[1].data.push(data.failed);

  // Limitar a últimos 20 ciclos
  if (progressChart.data.labels.length > 20) {
    progressChart.data.labels.shift();
    progressChart.data.datasets[0].data.shift();
    progressChart.data.datasets[1].data.shift();
  }

  progressChart.update();

  // Actualizar gráfico de health
  healthChart.data.labels.push(cycleLabel);
  healthChart.data.datasets[0].data.push(data.successRate);

  if (healthChart.data.labels.length > 20) {
    healthChart.data.labels.shift();
    healthChart.data.datasets[0].data.shift();
  }

  healthChart.update();
}

// ═══════════════════════════════════════════════════════════
// SELECTOR DE MODO
// ═══════════════════════════════════════════════════════════

function selectMode(mode) {
  currentMode = mode;

  // Remover selección anterior
  document.querySelectorAll('.mode-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Marcar como seleccionado
  document.getElementById(`mode-${mode}`).classList.add('selected');

  // Mostrar panel de configuración
  document.getElementById('config-panel').style.display = 'block';

  // Mostrar config específica del modo
  document.getElementById('config-active').style.display = mode === 'active' ? 'block' : 'none';
  document.getElementById('config-iterative').style.display = mode === 'iterative' ? 'block' : 'none';
  document.getElementById('config-passive').style.display = mode === 'passive' ? 'block' : 'none';

  // Actualizar nombre del modo
  const modeNames = {
    passive: 'MODO PASIVO',
    active: 'MODO ACTIVO',
    iterative: 'MODO ITERATIVO'
  };

  document.getElementById('selected-mode-name').textContent = modeNames[mode];

  console.log(`🎯 [MODE] Seleccionado: ${mode}`);
}

function backToModeSelection() {
  document.getElementById('config-panel').style.display = 'none';
  document.querySelectorAll('.mode-card').forEach(card => {
    card.classList.remove('selected');
  });
  currentMode = null;
}

// ═══════════════════════════════════════════════════════════
// CONTROLES - START / STOP
// ═══════════════════════════════════════════════════════════

async function startAudit() {
  if (!currentMode) {
    showNotification('⚠️ Selecciona un modo primero', 'warning');
    return;
  }

  const token = getAuthToken();

  if (!token) {
    showNotification('❌ Error: No se encontró token de autenticación. Por favor, recarga la página e inicia sesión nuevamente.', 'error');
    console.error('❌ [AUTH] Token no encontrado. Variables disponibles:', {
      authToken: window.authToken,
      companyAuthToken: window.companyAuthToken,
      localStorage_authToken: localStorage.getItem('authToken'),
      localStorage_token: localStorage.getItem('token'),
      sessionStorage_authToken: sessionStorage.getItem('authToken'),
      sessionStorage_token: sessionStorage.getItem('token')
    });
    return;
  }

  try {
    let response;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    if (currentMode === 'passive') {
      // Iniciar monitor pasivo
      response = await fetch('/api/audit/monitor/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          interval: 120000 // 2 minutos
        })
      });
    } else if (currentMode === 'active' || currentMode === 'iterative') {
      // Iniciar auditor iterativo
      const cycles = currentMode === 'iterative' ? 500 : parseInt(document.getElementById('cycles-input').value);
      const targetRate = parseInt(document.getElementById('target-rate-input')?.value || 100);

      response = await fetch('/api/audit/iterative/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          maxCycles: cycles,
          targetSuccessRate: targetRate
        })
      });
    }

    const data = await response.json();

    if (data.success) {
      isRunning = true;

      // Ocultar selector de modo y config
      document.querySelector('.mode-selector-container').style.display = 'none';
      document.getElementById('config-panel').style.display = 'none';

      // Mostrar panel de ejecución
      document.getElementById('execution-panel').style.display = 'block';

      // Actualizar badge de modo
      const modeNames = {
        passive: '👀 MODO PASIVO',
        active: '⚡ MODO ACTIVO',
        iterative: '🔁 MODO ITERATIVO'
      };
      document.getElementById('execution-mode-badge').textContent = modeNames[currentMode];

      // Actualizar status badge
      document.getElementById('status-badge').innerHTML = '🟢 <span id="status-text">En Ejecución</span>';

      // Habilitar botón stop
      document.getElementById('btn-start').disabled = true;
      document.getElementById('btn-stop').disabled = false;

      // Inicializar gráficos si no están
      if (!progressChart || !healthChart) {
        initializeCharts();
      }

      addLog(`🚀 ${modeNames[currentMode]} iniciado`, 'success');
      showNotification('✅ Auditoría iniciada correctamente', 'success');
    } else {
      showNotification('❌ Error: ' + data.error, 'error');
    }

  } catch (error) {
    console.error('❌ [START] Error:', error);
    showNotification('❌ Error al iniciar auditoría', 'error');
  }
}

async function stopAudit() {
  if (!isRunning) return;

  const token = getAuthToken();

  if (!token) {
    showNotification('❌ Error: No se encontró token de autenticación', 'error');
    return;
  }

  try {
    let response;

    const headers = {
      'Authorization': `Bearer ${token}`
    };

    if (currentMode === 'passive') {
      response = await fetch('/api/audit/monitor/stop', {
        method: 'POST',
        headers
      });
    } else {
      response = await fetch('/api/audit/iterative/stop', {
        method: 'POST',
        headers
      });
    }

    const data = await response.json();

    if (data.success) {
      isRunning = false;

      // Actualizar status badge
      document.getElementById('status-badge').innerHTML = '🔴 <span id="status-text">Detenido</span>';

      // Deshabilitar botón stop
      document.getElementById('btn-start').disabled = false;
      document.getElementById('btn-stop').disabled = true;

      addLog('🛑 Auditoría detenida', 'info');
      showNotification('✅ Auditoría detenida correctamente', 'success');
    } else {
      showNotification('❌ Error: ' + data.error, 'error');
    }

  } catch (error) {
    console.error('❌ [STOP] Error:', error);
    showNotification('❌ Error al detener auditoría', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// ACTUALIZAR UI
// ═══════════════════════════════════════════════════════════

function updateProgress() {
  if (maxCycles === 0) return;

  const percent = Math.round((currentCycle / maxCycles) * 100);

  document.getElementById('progress-text').textContent = `Ciclo ${currentCycle}/${maxCycles}`;
  document.getElementById('progress-percent').textContent = `${percent}%`;
  document.getElementById('progress-bar').style.width = `${percent}%`;
}

function updateMetrics(data) {
  document.getElementById('metric-passed').textContent = data.passed || 0;
  document.getElementById('metric-failed').textContent = data.failed || 0;
  document.getElementById('metric-repaired').textContent = data.errorsRepaired || 0;
  document.getElementById('metric-success-rate').textContent = `${data.successRate || 0}%`;
}

// ═══════════════════════════════════════════════════════════
// LOG VIEWER
// ═══════════════════════════════════════════════════════════

function addLog(message, type = 'info') {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;

  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;

  const timestamp = new Date().toLocaleTimeString();
  logEntry.textContent = `[${timestamp}] ${message}`;

  logContainer.appendChild(logEntry);

  // Auto-scroll al final
  logContainer.scrollTop = logContainer.scrollHeight;

  // Limitar a últimos 100 logs
  if (logContainer.children.length > 100) {
    logContainer.removeChild(logContainer.firstChild);
  }
}

function clearLogs() {
  const logContainer = document.getElementById('log-container');
  if (logContainer) {
    logContainer.innerHTML = '<div class="log-entry log-info">🔵 Logs limpiados</div>';
  }
}

// ═══════════════════════════════════════════════════════════
// TABLA DE ERRORES
// ═══════════════════════════════════════════════════════════

function addErrorToTable(error) {
  const tbody = document.getElementById('errors-tbody');
  if (!tbody) return;

  // Remover mensaje "Sin errores"
  if (tbody.querySelector('.no-errors')) {
    tbody.innerHTML = '';
  }

  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${error.cycle || currentCycle}</td>
    <td>${error.module || 'N/A'}</td>
    <td><span class="error-type-badge">${error.type || 'Error'}</span></td>
    <td class="error-message">${error.error || error.message}</td>
    <td><span class="status-badge status-${error.status || 'pending'}">${error.status || 'Pendiente'}</span></td>
    <td>
      <button class="btn-fix-small" onclick="retryFix('${error.id}')">🔧 Reintentar</button>
    </td>
  `;

  tbody.insertBefore(row, tbody.firstChild);

  // Limitar a últimos 50 errores
  if (tbody.children.length > 50) {
    tbody.removeChild(tbody.lastChild);
  }
}

async function retryFix(errorId) {
  console.log(`🔧 [FIX] Reintentando fix para error: ${errorId}`);
  showNotification('🔧 Reintentando fix...', 'info');
  // TODO: Implementar retry de fix
}

function displayAuditSummary(data) {
  console.log('📊 [SUMMARY] Mostrando resumen final:', data);

  // Buscar contenedor de resumen o crearlo si no existe
  let summaryContainer = document.getElementById('audit-summary-container');
  if (!summaryContainer) {
    // Crear contenedor de resumen después de la tabla de errores
    const errorsSection = document.querySelector('.errors-section');
    if (errorsSection) {
      summaryContainer = document.createElement('div');
      summaryContainer.id = 'audit-summary-container';
      summaryContainer.className = 'summary-section';
      errorsSection.parentNode.insertBefore(summaryContainer, errorsSection.nextSibling);
    }
  }

  if (!summaryContainer) return;

  // Calcular métricas adicionales
  const successRate = parseFloat(data.successRate) || 0;
  const failureRate = (100 - successRate).toFixed(1);
  const criticalErrors = data.criticalErrors || 0;
  const modulesAffected = data.modulesAffected || 0;
  const duration = data.duration ? `${(data.duration / 1000).toFixed(1)}s` : 'N/A';

  // Determinar estado del sistema
  let systemStatus = '🔴 CRÍTICO';
  let statusClass = 'critical';
  if (successRate >= 95) {
    systemStatus = '🟢 EXCELENTE';
    statusClass = 'excellent';
  } else if (successRate >= 80) {
    systemStatus = '🟡 BUENO';
    statusClass = 'good';
  } else if (successRate >= 60) {
    systemStatus = '🟠 REGULAR';
    statusClass = 'regular';
  }

  // Generar HTML del resumen
  summaryContainer.innerHTML = `
    <div class="audit-summary-card">
      <div class="summary-header">
        <h3>📊 RESUMEN FINAL DE AUDITORÍA</h3>
        <div class="system-status ${statusClass}">${systemStatus}</div>
      </div>

      <div class="summary-metrics">
        <div class="metric-row">
          <div class="metric-item">
            <div class="metric-label">Tests Ejecutados</div>
            <div class="metric-value">${data.total || 0}</div>
          </div>
          <div class="metric-item success">
            <div class="metric-label">✅ Exitosos</div>
            <div class="metric-value">${data.passed || 0}</div>
          </div>
          <div class="metric-item failed">
            <div class="metric-label">❌ Fallidos</div>
            <div class="metric-value">${data.failed || 0}</div>
          </div>
          <div class="metric-item warning">
            <div class="metric-label">⚠️ Advertencias</div>
            <div class="metric-value">${data.warnings || 0}</div>
          </div>
        </div>

        <div class="metric-row">
          <div class="metric-item">
            <div class="metric-label">Tasa de Éxito</div>
            <div class="metric-value">${successRate}%</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Duración</div>
            <div class="metric-value">${duration}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Errores Críticos</div>
            <div class="metric-value">${criticalErrors}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Módulos Afectados</div>
            <div class="metric-value">${modulesAffected}</div>
          </div>
        </div>
      </div>

      <div class="summary-actions">
        <button class="btn-primary" onclick="downloadAuditReport('${data.execution_id}')">
          📄 Descargar Reporte
        </button>
        <button class="btn-secondary" onclick="runNewAudit()">
          🔄 Nueva Auditoría
        </button>
        <button class="btn-secondary" onclick="clearAuditSummary()">
          🗑️ Limpiar Resumen
        </button>
      </div>

      <div class="summary-timestamp">
        <small>Completado el ${new Date().toLocaleString()}</small>
      </div>
    </div>
  `;

  // Scroll al resumen para que sea visible
  summaryContainer.scrollIntoView({ behavior: 'smooth' });

  // Actualizar progreso a 100%
  const progressBar = document.querySelector('.progress-bar');
  if (progressBar) {
    progressBar.style.width = '100%';
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function getAuthToken() {
  // Intentar obtener el token de múltiples fuentes
  const token = localStorage.getItem('authToken') ||
                localStorage.getItem('token') ||
                sessionStorage.getItem('authToken') ||
                sessionStorage.getItem('token') ||
                window.authToken ||
                window.companyAuthToken ||
                '';

  console.log('🔑 [AUTH] Token obtenido:', token ? 'Presente ✓' : 'Ausente ✗');
  return token;
}

// Helper functions para el resumen de auditoría
function clearAuditSummary() {
  const summaryContainer = document.getElementById('audit-summary-container');
  if (summaryContainer) {
    summaryContainer.remove();
    addLog('🗑️ Resumen de auditoría limpiado', 'info');
  }
}

function runNewAudit() {
  // Limpiar resumen anterior
  clearAuditSummary();

  // Limpiar errores de la tabla
  const tbody = document.getElementById('errors-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr class="no-errors"><td colspan="6">Sin errores detectados aún</td></tr>';
  }

  // Resetear progreso
  const progressBar = document.querySelector('.progress-bar');
  if (progressBar) {
    progressBar.style.width = '0%';
  }

  addLog('🔄 Preparando nueva auditoría...', 'info');
}

function downloadAuditReport(executionId) {
  if (!executionId) {
    showNotification('⚠️ No hay ID de ejecución disponible', 'warning');
    return;
  }

  const token = getAuthToken();
  if (!token) {
    showNotification('❌ Error de autenticación', 'error');
    return;
  }

  // Descargar reporte usando la API
  const downloadUrl = `/api/audit/executions/${executionId}/report?format=pdf`;

  // Crear enlace temporal y hacer click
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', `audit-report-${executionId}.pdf`);
  link.style.display = 'none';

  // Agregar headers de autenticación (aunque no sea posible en un enlace directo)
  // TODO: Usar fetch para descargar con headers personalizados

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  addLog(`📄 Descargando reporte: ${executionId}`, 'info');
}

function showNotification(message, type = 'info') {
  // Simple notification usando console y log viewer
  console.log(`[${type.toUpperCase()}] ${message}`);
  addLog(message, type);
}

// ═══════════════════════════════════════════════════════════
// ESTILOS CSS INYECTADOS
// ═══════════════════════════════════════════════════════════

function injectUnifiedStyles() {
  if (document.getElementById('auditor-unified-styles')) return;

  const style = document.createElement('style');
  style.id = 'auditor-unified-styles';
  style.textContent = `
    /* Contenedor Principal */
    .auditor-unified-container {
      padding: 20px;
      background: #f9fafb;
      min-height: 100vh;
    }

    /* Header */
    .auditor-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .header-title h2 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }

    .subtitle {
      margin: 5px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .status-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 10px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      backdrop-filter: blur(10px);
    }

    /* Mode Selector */
    .mode-selector-container {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .mode-selector-container h3 {
      margin: 0 0 20px 0;
      color: #1f2937;
    }

    .mode-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .mode-card {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 25px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
    }

    .mode-card:hover {
      border-color: #667eea;
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.2);
    }

    .mode-card.selected {
      border-color: #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .mode-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }

    .mode-title {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 10px;
    }

    .mode-description {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 15px;
      line-height: 1.5;
    }

    .mode-features {
      text-align: left;
      margin-top: 15px;
    }

    .feature {
      font-size: 13px;
      color: #059669;
      margin: 5px 0;
    }

    /* Testing Options Container */
    .testing-options-container {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      border: 2px solid #f59e0b;
    }

    .testing-options-container h3 {
      margin: 0 0 10px 0;
      color: #1f2937;
    }

    .testing-subtitle {
      color: #6b7280;
      font-size: 14px;
      margin: 0 0 20px 0;
    }

    .testing-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .testing-card {
      background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 25px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
      position: relative;
    }

    .testing-card:hover {
      border-color: #d97706;
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(245, 158, 11, 0.3);
    }

    .testing-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }

    .testing-title {
      font-size: 18px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 10px;
    }

    .testing-description {
      font-size: 14px;
      color: #78350f;
      margin-bottom: 15px;
      line-height: 1.5;
    }

    .testing-features {
      text-align: left;
      margin-top: 15px;
      margin-bottom: 15px;
    }

    .testing-features .feature {
      color: #065f46;
    }

    .btn-test-option {
      width: 100%;
      padding: 12px 20px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 10px;
    }

    .btn-test-option:hover {
      background: linear-gradient(135deg, #d97706, #b45309);
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(217, 119, 6, 0.4);
    }

    /* Config Panel */
    .config-panel {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .config-panel h3 {
      margin: 0 0 20px 0;
      color: #1f2937;
    }

    .config-row {
      margin-bottom: 20px;
    }

    .config-row label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }

    .config-info {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .config-info p {
      margin: 8px 0;
      color: #374151;
    }

    .control-buttons {
      display: flex;
      gap: 15px;
      margin-top: 25px;
    }

    .btn-start, .btn-stop, .btn-back {
      padding: 12px 30px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-start {
      background: #10b981;
      color: white;
    }

    .btn-start:hover:not(:disabled) {
      background: #059669;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }

    .btn-start:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-stop {
      background: #ef4444;
      color: white;
    }

    .btn-stop:hover:not(:disabled) {
      background: #dc2626;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
    }

    .btn-stop:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-back {
      background: #6b7280;
      color: white;
    }

    .btn-back:hover {
      background: #4b5563;
    }

    /* Execution Panel */
    .execution-panel {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .execution-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }

    .execution-mode-badge {
      background: #667eea;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }

    /* Progress Bar */
    .progress-container {
      margin-bottom: 30px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-weight: 600;
      color: #374151;
    }

    .progress-bar-container {
      width: 100%;
      height: 30px;
      background: #e5e7eb;
      border-radius: 15px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.5s ease;
      border-radius: 15px;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }

    .metric-icon {
      font-size: 32px;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 5px;
    }

    .metric-label {
      font-size: 14px;
      color: #6b7280;
    }

    /* Charts */
    .charts-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .chart-wrapper {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .chart-wrapper h4 {
      margin: 0 0 15px 0;
      color: #1f2937;
    }

    .chart-wrapper canvas {
      max-height: 250px;
    }

    /* Log Viewer */
    .log-viewer {
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      margin-bottom: 30px;
      overflow: hidden;
    }

    .log-header {
      background: #f9fafb;
      padding: 15px 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .log-header h4 {
      margin: 0;
      color: #1f2937;
    }

    .btn-clear-logs {
      background: #ef4444;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    }

    .btn-clear-logs:hover {
      background: #dc2626;
    }

    .log-container {
      background: #1f2937;
      color: #f9fafb;
      padding: 20px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      max-height: 300px;
      overflow-y: auto;
    }

    .log-entry {
      margin-bottom: 5px;
      padding: 5px;
      border-radius: 4px;
    }

    .log-info { color: #3b82f6; }
    .log-success { color: #10b981; }
    .log-error { color: #ef4444; }
    .log-warning { color: #f59e0b; }

    /* Errors Table */
    .errors-table-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      padding: 20px;
    }

    .errors-table-container h4 {
      margin: 0 0 15px 0;
      color: #1f2937;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .errors-table {
      width: 100%;
      border-collapse: collapse;
    }

    .errors-table th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }

    .errors-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      color: #6b7280;
    }

    .no-errors {
      text-align: center !important;
      color: #9ca3af !important;
      font-style: italic;
    }

    .error-type-badge {
      background: #fef2f2;
      color: #991b1b;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .error-message {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-pending { background: #fef3c7; color: #92400e; }
    .status-fixed { background: #d1fae5; color: #065f46; }
    .status-failed { background: #fee2e2; color: #991b1b; }

    .btn-fix-small {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    }

    .btn-fix-small:hover {
      background: #2563eb;
    }

    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    /* Resumen de Auditoría */
    .summary-section {
      margin-top: 30px;
    }

    .audit-summary-card {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border: 2px solid #cbd5e0;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      animation: slideInUp 0.5s ease-out;
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 15px;
    }

    .summary-header h3 {
      margin: 0;
      color: #2d3748;
      font-size: 24px;
      font-weight: 700;
    }

    .system-status {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .system-status.excellent {
      background: linear-gradient(135deg, #48bb78, #38a169);
      color: white;
    }

    .system-status.good {
      background: linear-gradient(135deg, #ed8936, #dd6b20);
      color: white;
    }

    .system-status.regular {
      background: linear-gradient(135deg, #ed8936, #d69e2e);
      color: white;
    }

    .system-status.critical {
      background: linear-gradient(135deg, #f56565, #e53e3e);
      color: white;
    }

    .summary-metrics {
      margin-bottom: 25px;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 15px;
    }

    .metric-item {
      flex: 1;
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      transition: transform 0.2s ease;
    }

    .metric-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }

    .metric-item.success {
      border-left: 4px solid #48bb78;
    }

    .metric-item.failed {
      border-left: 4px solid #f56565;
    }

    .metric-item.warning {
      border-left: 4px solid #ed8936;
    }

    .metric-label {
      font-size: 14px;
      color: #718096;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #2d3748;
    }

    .summary-actions {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
      justify-content: center;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #5a67d8, #6b46c1);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f7fafc;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #edf2f7;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .summary-timestamp {
      text-align: center;
      color: #718096;
      font-style: italic;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
    }
  `;

  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════
// TESTING MANUAL - 3 OPCIONES
// ═══════════════════════════════════════════════════════════

async function executeTestGlobal() {
  console.log('🌍 [TEST-GLOBAL] Iniciando auditoría PROFESIONAL completa...');

  const token = getAuthToken();
  if (!token) {
    showNotification('❌ Error: No se encontró token de autenticación', 'error');
    return;
  }

  // Mostrar panel de ejecución
  document.querySelector('.mode-selector-container').style.display = 'none';
  document.querySelector('.testing-options-container').style.display = 'none';
  document.getElementById('execution-panel').style.display = 'block';
  document.getElementById('execution-mode-badge').textContent = '🌍 AUDITORÍA PROFESIONAL COMPLETA';
  document.getElementById('status-badge').innerHTML = '🟢 <span id="status-text">Ejecutando</span>';

  // Limpiar logs y métricas
  logsBuffer = [];
  document.getElementById('log-container').innerHTML = '<div class="log-entry log-info">🌍 Iniciando Auditoría Profesional...</div>';

  addLog('🚀 AUDITORÍA PROFESIONAL - Sistema completo activado', 'info');
  addLog('🔍 5 Collectors: Endpoint, Database, Frontend (Puppeteer), Integration, Android', 'info');
  addLog('🤖 IA (Ollama + DeepSeek R1): Análisis inteligente de errores', 'info');
  addLog('🔧 Auto-reparación: HybridHealer con patrones seguros', 'info');
  addLog('🧠 Knowledge Base: Sistema de aprendizaje continuo', 'info');
  addLog('👁️ Navegador VISIBLE: Se abrirá Chrome para que veas el testing', 'info');
  addLog('📊 WebSocket activo: Updates en tiempo real', 'info');

  try {
    const response = await fetch('/api/audit/test/global', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        testMode: 'global',
        simulationLevel: 'complete',
        includeSubmodules: true,
        humanTiming: true,
        authToken: token,
        company_id: window.currentCompany?.company_id || 11
      })
    });

    const data = await response.json();

    if (data.success) {
      addLog('✅ Auditoría iniciada correctamente', 'success');
      addLog(`📊 Execution ID: ${data.execution_id}`, 'info');
      addLog('🔄 Conectado vía WebSocket - recibirás updates en tiempo real', 'info');
      addLog('🌐 Abriendo navegador visible en 3 segundos...', 'info');
      showNotification('✅ Auditoría en curso - Observa el navegador que se abrirá', 'success');
    } else {
      addLog(`❌ Error: ${data.error}`, 'error');
      showNotification('❌ Error: ' + data.error, 'error');
    }

  } catch (error) {
    console.error('❌ [TEST-GLOBAL] Error:', error);
    addLog(`❌ Error de conexión: ${error.message}`, 'error');
    showNotification('❌ Error al iniciar auditoría', 'error');
  }
}

async function executeTestAPK() {
  console.log('📱 [TEST-APK] Iniciando test de APK Kiosk Android...');

  const token = getAuthToken();
  if (!token) {
    showNotification('❌ Error: No se encontró token de autenticación', 'error');
    return;
  }

  // Mostrar panel de ejecución
  document.querySelector('.mode-selector-container').style.display = 'none';
  document.querySelector('.testing-options-container').style.display = 'none';
  document.getElementById('execution-panel').style.display = 'block';
  document.getElementById('execution-mode-badge').textContent = '📱 TEST APK KIOSK';
  document.getElementById('status-badge').innerHTML = '🟢 <span id="status-text">Ejecutando Test APK</span>';

  // Limpiar logs
  logsBuffer = [];
  document.getElementById('log-container').innerHTML = '<div class="log-entry log-info">📱 Iniciando Test de APK Kiosk Android...</div>';

  addLog('📱 TEST APK KIOSK - Android Verification', 'info');
  addLog('🔍 Verificando: APK existence, mobile endpoints, Flutter structure', 'info');

  try {
    const response = await fetch('/api/audit/test/apk-kiosk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        apkTestLevel: 'complete'
      })
    });

    const data = await response.json();

    if (data.success) {
      addLog('✅ Test APK Kiosk iniciado correctamente', 'success');
      addLog(`📊 Execution ID: ${data.execution_id}`, 'info');
      showNotification('✅ Test APK en ejecución', 'success');
    } else {
      addLog(`❌ Error al iniciar test: ${data.error}`, 'error');
      showNotification('❌ Error: ' + data.error, 'error');
    }

  } catch (error) {
    console.error('❌ [TEST-APK] Error:', error);
    addLog(`❌ Error de conexión: ${error.message}`, 'error');
    showNotification('❌ Error al ejecutar test APK', 'error');
  }
}

async function executeTestModule() {
  console.log('🎯 [TEST-MODULE] Mostrando selector de módulos...');

  // Módulos disponibles (basados en modules-registry.json)
  const modules = [
    { id: 'users', name: 'Gestión de Usuarios' },
    { id: 'attendance', name: 'Control de Asistencia' },
    { id: 'dashboard', name: 'Dashboard Principal' },
    { id: 'settings', name: 'Configuración del Sistema' },
    { id: 'departments', name: 'Departamentos' },
    { id: 'shifts', name: 'Turnos y Horarios' },
    { id: 'kiosks', name: 'Kioscos Biométricos' },
    { id: 'medical', name: 'Gestión Médica' },
    { id: 'vacation', name: 'Vacaciones y Permisos' },
    { id: 'legal', name: 'Gestión Legal' },
    { id: 'reports', name: 'Reportes Básicos' },
    { id: 'reports-advanced', name: 'Reportes Avanzados' },
    { id: 'training', name: 'Capacitaciones' },
    { id: 'notifications-enterprise', name: 'Notificaciones Enterprise' },
    { id: 'biometric-enterprise', name: 'Biométrico Enterprise' },
    { id: 'payroll', name: 'Nómina y Planilla' },
    { id: 'android-kiosk', name: 'Android Kiosk APK' }
  ];

  // Crear modal con selector de módulo
  const moduleOptions = modules.map(m =>
    `<option value="${m.id}">${m.name}</option>`
  ).join('');

  const modalHTML = `
    <div class="module-selector-modal" id="module-selector-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    ">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      ">
        <h3 style="margin-top: 0; color: #2d3748;">🎯 Selecciona el Módulo a Testear</h3>
        <p style="color: #718096; margin-bottom: 20px;">Selecciona un módulo para ejecutar tests profundos incluyendo sub-módulos.</p>

        <select id="module-select" style="
          width: 100%;
          padding: 12px;
          font-size: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 20px;
          background: white;
        ">
          <option value="">-- Selecciona un módulo --</option>
          ${moduleOptions}
        </select>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="closeModuleSelector()" style="
            padding: 10px 20px;
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">Cancelar</button>
          <button onclick="confirmModuleSelection()" style="
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">▶️ Ejecutar Test</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeModuleSelector = function() {
  const modal = document.getElementById('module-selector-modal');
  if (modal) modal.remove();
};

window.confirmModuleSelection = async function() {
  const select = document.getElementById('module-select');
  const moduleKey = select.value;

  if (!moduleKey) {
    showNotification('⚠️ Selecciona un módulo primero', 'warning');
    return;
  }

  const moduleName = select.options[select.selectedIndex].text;

  // Cerrar modal
  closeModuleSelector();

  console.log(`🎯 [TEST-MODULE] Auditoría PROFESIONAL de módulo: ${moduleKey}`);

  const token = getAuthToken();
  if (!token) {
    showNotification('❌ Error: No se encontró token de autenticación', 'error');
    return;
  }

  // Mostrar panel de ejecución
  document.querySelector('.mode-selector-container').style.display = 'none';
  document.querySelector('.testing-options-container').style.display = 'none';
  document.getElementById('execution-panel').style.display = 'block';
  document.getElementById('execution-mode-badge').textContent = `🎯 AUDITORÍA: ${moduleName}`;
  document.getElementById('status-badge').innerHTML = '🟢 <span id="status-text">Ejecutando</span>';

  // Limpiar logs
  logsBuffer = [];
  document.getElementById('log-container').innerHTML = `<div class="log-entry log-info">🎯 Iniciando Auditoría de: ${moduleName}...</div>`;

  addLog(`🚀 AUDITORÍA PROFESIONAL - ${moduleName}`, 'info');
  addLog('🔍 Testing profundo con todos los collectors', 'info');
  addLog('🤖 IA + Auto-reparación activos', 'info');
  addLog('👁️ Navegador visible con Puppeteer', 'info');
  addLog('📦 Incluye sub-módulos y workflows', 'info');

  try {
    const response = await fetch('/api/audit/test/module', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        moduleKey: moduleKey,
        testMode: 'module-specific',
        simulationLevel: 'complete',
        includeSubmodules: true,
        authToken: token,
        company_id: window.currentCompany?.company_id || 11
      })
    });

    const data = await response.json();

    if (data.success) {
      addLog(`✅ Auditoría de ${moduleName} iniciada`, 'success');
      addLog(`📊 Execution ID: ${data.execution_id}`, 'info');
      addLog('🔄 WebSocket conectado - updates en tiempo real', 'info');
      addLog('🌐 Abriendo navegador visible...', 'info');
      showNotification(`✅ Auditoría en curso - Observa el navegador`, 'success');
    } else {
      addLog(`❌ Error: ${data.error}`, 'error');
      showNotification('❌ Error: ' + data.error, 'error');
    }

  } catch (error) {
    console.error('❌ [TEST-MODULE] Error:', error);
    addLog(`❌ Error de conexión: ${error.message}`, 'error');
    showNotification('❌ Error al iniciar auditoría', 'error');
  }
};

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS - REAL BROWSER TEST
// ═══════════════════════════════════════════════════════════

function updateMetricsFromResults(results) {
  if (!results || results.length === 0) return;

  let totalTests = 0;
  let passedTests = 0;

  results.forEach(result => {
    const tests = result.tests;
    totalTests += Object.keys(tests).length;
    passedTests += Object.values(tests).filter(t => t === true).length;
  });

  const failedTests = totalTests - passedTests;

  // Actualizar métricas en UI
  document.getElementById('metric-passed').textContent = passedTests;
  document.getElementById('metric-failed').textContent = failedTests;

  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  document.getElementById('metric-success-rate').textContent = `${successRate}%`;
}

function displayTestSummary(summary) {
  console.log('📊 [SUMMARY] Mostrando resumen final:', summary);

  // Actualizar métricas finales
  updateMetricsFromResults(summary.results);

  // Crear tabla de resultados por módulo
  const errorsTableBody = document.getElementById('errors-tbody');
  errorsTableBody.innerHTML = '';

  summary.results.forEach((result, index) => {
    const row = document.createElement('tr');
    row.className = result.status === 'passed' ? 'success-row' : 'error-row';

    const statusIcon = result.status === 'passed' ? '✅' : '❌';
    const statusText = result.status === 'passed' ? 'PASSED' : 'FAILED';

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${result.module_name}</td>
      <td>CRUD Real</td>
      <td>${result.errors.length > 0 ? result.errors.join(', ') : 'Sin errores'}</td>
      <td>${statusIcon} ${statusText} (${result.success_rate}%)</td>
      <td>
        ${result.tests.navigation ? '✅' : '❌'} Nav |
        ${result.tests.create ? '✅' : '❌'} Create |
        ${result.tests.read ? '✅' : '❌'} Read |
        ${result.tests.update ? '✅' : '❌'} Update |
        ${result.tests.delete ? '✅' : '❌'} Delete
      </td>
    `;

    errorsTableBody.appendChild(row);
  });

  // Agregar fila de cleanup
  if (summary.cleanup) {
    const cleanupRow = document.createElement('tr');
    cleanupRow.className = 'cleanup-row';
    cleanupRow.innerHTML = `
      <td colspan="6" style="background: #f3f4f6; font-weight: 600; text-align: center;">
        🧹 CLEANUP: ${summary.cleanup.deleted}/${summary.cleanup.total} registros eliminados
        ${summary.cleanup.failed > 0 ? `(${summary.cleanup.failed} errores)` : ''}
      </td>
    `;
    errorsTableBody.appendChild(cleanupRow);
  }
}

// ═══════════════════════════════════════════════════════════
// ⭐ MEGA-UPGRADE: HANDLER FUNCTIONS PARA DETECCIÓN EN TIEMPO REAL
// ═══════════════════════════════════════════════════════════

let realtimeErrorsCount = 0;
let categoryCounters = {
  'javascript-error': 0,
  'http-error': 0,
  'network-error': 0,
  'cors-error': 0,
  'autofix': 0,
  'fixes-applied': 0
};

/**
 * Manejar error individual en tiempo real
 */
function handleRealtimeError(errorData) {
  console.log('🚨 [HANDLER] Procesando error en tiempo real:', errorData);

  realtimeErrorsCount++;

  // Actualizar contador total
  const errorCountBadge = document.getElementById('realtime-error-count');
  if (errorCountBadge) {
    errorCountBadge.textContent = `${realtimeErrorsCount} ${realtimeErrorsCount === 1 ? 'error' : 'errores'}`;
  }

  // Actualizar contador por categoría
  updateCategoryCount(errorData.category || 'unknown-error');

  // Si es auto-fixable, incrementar contador
  if (errorData.canAutoFix) {
    incrementCounter('autofix');
  }

  // Agregar fila a la tabla
  addRealtimeErrorRow(errorData);

  // Log en consola
  addLog(`❌ Error ${errorData.category}: ${errorData.message}`, 'error');
}

/**
 * Manejar batch de errores (60s post-login)
 */
function handleErrorsBatch(batchData) {
  console.log('📦 [HANDLER] Procesando batch de errores:', batchData);

  const batchLog = document.getElementById('batch-errors-log');
  const batchInfo = document.getElementById('batch-info');
  const batchList = document.getElementById('batch-errors-list');

  if (!batchLog || !batchInfo || !batchList) return;

  // Mostrar sección de batch
  batchLog.style.display = 'block';

  // Actualizar info
  batchInfo.innerHTML = `
    <span class="batch-phase">Fase: ${batchData.context?.phase || 'unknown'}</span>
    <span class="batch-duration">Duración: ${batchData.context?.duration_ms || '?'} ms</span>
    <span class="batch-count">Errores: ${batchData.count || batchData.errors?.length || 0}</span>
  `;

  // Listar errores
  const errorsList = batchData.errors || [];
  batchList.innerHTML = '';

  errorsList.forEach((error, index) => {
    // Agregar cada error a la tabla principal
    handleRealtimeError(error);

    // Agregar item al batch log
    const item = document.createElement('div');
    item.className = 'batch-error-item';
    item.innerHTML = `
      <strong>${index + 1}.</strong>
      <span class="severity-badge severity-${error.severity || 'medium'}">${error.severity || 'MEDIUM'}</span>
      <span class="category-badge">${error.category || 'unknown'}</span>
      ${error.file || 'unknown file'} - ${error.message || 'Sin mensaje'}
    `;
    batchList.appendChild(item);
  });

  addLog(`📦 Batch recibido: ${errorsList.length} errores detectados (${batchData.context?.phase || 'unknown'})`, 'info');
}

/**
 * Manejar fix aplicado exitosamente
 */
function handleFixApplied(fixData) {
  console.log('✅ [HANDLER] Fix aplicado:', fixData);

  // Buscar la fila del error en la tabla y actualizarla
  const tbody = document.getElementById('realtime-errors-tbody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const errorId = row.dataset.errorId;
    if (errorId === fixData.error_id) {
      const actionCell = row.querySelector('.action-cell');
      if (actionCell) {
        actionCell.innerHTML = `
          <span class="fix-applied-badge">✅ Fix aplicado</span>
          <small>${fixData.fix_strategy || 'auto-fix'}</small>
        `;
      }
    }
  });

  addLog(`✅ Fix aplicado: ${fixData.fix_strategy || 'auto-fix'}`, 'success');
}

/**
 * Manejar fix fallido
 */
function handleFixFailed(failData) {
  console.log('❌ [HANDLER] Fix falló:', failData);

  // Buscar la fila del error y actualizarla
  const tbody = document.getElementById('realtime-errors-tbody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const errorId = row.dataset.errorId;
    if (errorId === failData.error_id) {
      const actionCell = row.querySelector('.action-cell');
      if (actionCell) {
        actionCell.innerHTML = `
          <span class="fix-failed-badge">❌ Fix falló</span>
          <small>${failData.error_message || 'Error desconocido'}</small>
        `;
      }
    }
  });

  addLog(`❌ Fix falló: ${failData.error_message || 'Error desconocido'}`, 'error');
}

/**
 * Agregar fila a la tabla de errores en tiempo real
 */
function addRealtimeErrorRow(errorData) {
  const tbody = document.getElementById('realtime-errors-tbody');
  if (!tbody) return;

  // Remover mensaje de "esperando"
  const noErrors = tbody.querySelector('.no-realtime-errors');
  if (noErrors) {
    noErrors.parentElement.remove();
  }

  const row = document.createElement('tr');
  row.dataset.errorId = generateErrorId(errorData);
  row.className = `severity-row severity-${errorData.severity || 'medium'}`;

  const timestamp = new Date().toLocaleTimeString('es-AR');
  const severityBadge = getSeverityBadge(errorData.severity);
  const categoryBadge = getCategoryBadge(errorData.category);
  const autoFixBadge = errorData.canAutoFix ? '🔧 Sí' : '❌ No';

  row.innerHTML = `
    <td>${timestamp}</td>
    <td>${categoryBadge}</td>
    <td>${severityBadge}</td>
    <td title="${errorData.file || 'unknown'}">${truncate(errorData.file || 'unknown', 30)}</td>
    <td>${errorData.line || '-'}</td>
    <td title="${errorData.message}">${truncate(errorData.message || 'Sin mensaje', 50)}</td>
    <td>${autoFixBadge}</td>
    <td class="action-cell">
      ${errorData.canAutoFix ? '<button class="btn-apply-fix" onclick="requestFix(\'' + generateErrorId(errorData) + '\')">🔧 Aplicar</button>' : '<span class="no-autofix">Manual</span>'}
    </td>
  `;

  tbody.insertBefore(row, tbody.firstChild);

  // Limitar a 50 errores mostrados
  const rows = tbody.querySelectorAll('tr');
  if (rows.length > 50) {
    rows[rows.length - 1].remove();
  }
}

/**
 * Actualizar contador de categoría
 */
function updateCategoryCount(category) {
  let counterId = null;

  if (category.includes('javascript') || category.includes('SyntaxError') || category.includes('TypeError') || category.includes('ReferenceError')) {
    counterId = 'js-errors-count';
    categoryCounters['javascript-error']++;
  } else if (category.includes('http-error') || category.includes('404') || category.includes('500')) {
    counterId = 'http-errors-count';
    categoryCounters['http-error']++;
  } else if (category.includes('network-error') || category.includes('ERR_')) {
    counterId = 'network-errors-count';
    categoryCounters['network-error']++;
  } else if (category.includes('cors')) {
    counterId = 'cors-errors-count';
    categoryCounters['cors-error']++;
  }

  if (counterId) {
    const counter = document.getElementById(counterId);
    if (counter) {
      counter.textContent = categoryCounters[getCategoryKey(counterId)];
    }
  }
}

function getCategoryKey(counterId) {
  const map = {
    'js-errors-count': 'javascript-error',
    'http-errors-count': 'http-error',
    'network-errors-count': 'network-error',
    'cors-errors-count': 'cors-error'
  };
  return map[counterId] || 'unknown';
}

function incrementCounter(type) {
  if (type === 'autofix') {
    categoryCounters.autofix++;
    const counter = document.getElementById('autofix-count');
    if (counter) counter.textContent = categoryCounters.autofix;
  }
}

function incrementFixesAppliedCount() {
  categoryCounters['fixes-applied']++;
  const counter = document.getElementById('fixes-applied-count');
  if (counter) counter.textContent = categoryCounters['fixes-applied'];
}

function updateRealtimeStatus(status) {
  const statusIndicator = document.getElementById('realtime-status');
  if (statusIndicator) {
    statusIndicator.textContent = status;
  }
}

function generateErrorId(errorData) {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getSeverityBadge(severity) {
  const badges = {
    critical: '<span class="severity-badge severity-critical">🔴 CRÍTICO</span>',
    high: '<span class="severity-badge severity-high">🟠 ALTO</span>',
    medium: '<span class="severity-badge severity-medium">🟡 MEDIO</span>',
    low: '<span class="severity-badge severity-low">🟢 BAJO</span>'
  };
  return badges[severity] || badges.medium;
}

function getCategoryBadge(category) {
  const color = category?.includes('javascript') ? '#f59e0b' :
                category?.includes('http') ? '#ef4444' :
                category?.includes('network') ? '#8b5cf6' :
                category?.includes('cors') ? '#ec4899' : '#6b7280';
  return `<span class="category-badge" style="background: ${color};">${category || 'unknown'}</span>`;
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

window.requestFix = function(errorId) {
  console.log('🔧 [ACTION] Solicitando aplicar fix para error:', errorId);

  // En el futuro, esto enviará un evento via WebSocket a Claude Code
  // Por ahora, solo mostramos un mensaje
  addLog(`🔧 Solicitando fix para error: ${errorId}`, 'info');

  // Simular que el fix está siendo procesado
  showNotification('🔧 Solicitando aplicación de fix...', 'info');


// ═══════════════════════════════════════════════════════════
// PHASE 4: TEST PROFUNDO CON AUTO-REPARACIÓN Y REPORTE
// ═══════════════════════════════════════════════════════════

async function executeTestPhase4() {
  console.log('🔬 [PHASE4] Abriendo modal de selección...');

  // Obtener lista de módulos disponibles
  const token = getAuthToken();
  if (!token) {
    showNotification('❌ Error: No se encontró token de autenticación', 'error');
    return;
  }

  try {
    // Fetch lista de módulos
    const response = await fetch('/api/audit/test/modules', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      showNotification('❌ Error al obtener módulos: ' + data.error, 'error');
      return;
    }

    // Mostrar modal de selección
    showPhase4ModuleSelector(data.all_modules);

  } catch (error) {
    console.error('❌ [PHASE4] Error:', error);
    showNotification('❌ Error al cargar módulos', 'error');
  }
}

function showPhase4ModuleSelector(modules) {
  // Crear opciones de módulos
  const moduleOptions = modules.map(m =>
    `<option value="${m.key}">${m.name} (${m.category})</option>`
  ).join('');

  const modalHTML = `
    <div class="phase4-modal-overlay" id="phase4-modal-overlay" onclick="closePhase4Modal(event)">
      <div class="phase4-modal" onclick="event.stopPropagation()">
        <div class="phase4-modal-header">
          <h3>🔬 Test Profundo con Auto-Reparación</h3>
          <button class="phase4-modal-close" onclick="closePhase4Modal()">✕</button>
        </div>

        <div class="phase4-modal-body">
          <div class="phase4-form-group">
            <label for="phase4-module-select">
              <strong>Selecciona el alcance del test:</strong>
            </label>
            <select id="phase4-module-select" class="phase4-select">
              <option value="">🌍 TODOS LOS MÓDULOS (Test Global)</option>
              <optgroup label="📦 Módulos Específicos">
                ${moduleOptions}
              </optgroup>
            </select>
            <p class="phase4-help-text">
              💡 Si seleccionas un módulo específico, se incluirán sus dependencias y submódulos automáticamente.
            </p>
          </div>

          <div class="phase4-form-group">
            <label>
              <input type="checkbox" id="phase4-auto-repair" checked>
              <strong>Auto-reparación</strong> - Intentar reparar errores automáticamente
            </label>
          </div>

          <div class="phase4-form-group">
            <label>
              <input type="checkbox" id="phase4-comparison" checked>
              <strong>Comparación histórica</strong> - Comparar con ejecuciones anteriores
            </label>
          </div>

          <div class="phase4-form-group">
            <label for="phase4-max-retries">
              <strong>Reintentos de auto-reparación:</strong>
            </label>
            <select id="phase4-max-retries" class="phase4-select">
              <option value="1">1 reintento</option>
              <option value="2" selected>2 reintentos (recomendado)</option>
              <option value="3">3 reintentos</option>
            </select>
          </div>

          <div class="phase4-info-box">
            <strong>📋 Este test incluye:</strong>
            <ul>
              <li>✅ Navegador visible (headless: false) - Verás el test en tiempo real</li>
              <li>✅ CRUD completo con datos de prueba (prefijo "test_")</li>
              <li>✅ Auto-reparación inteligente (Ollama + Pattern-based)</li>
              <li>✅ Reporte técnico con 7 secciones + numeración + timestamps</li>
              <li>✅ Comparación con ejecuciones anteriores</li>
              <li>✅ Aprendizaje en Knowledge Base</li>
            </ul>
          </div>
        </div>

        <div class="phase4-modal-footer">
          <button class="btn-secondary" onclick="closePhase4Modal()">Cancelar</button>
          <button class="btn-primary" onclick="confirmPhase4Test()">🚀 Iniciar Test</button>
        </div>
      </div>
    </div>
  `;

  // Insertar modal en el DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Agregar estilos dinámicamente
  addPhase4Styles();
}

function closePhase4Modal(event) {
  // Si se hizo click en el overlay (fuera del modal), cerrar
  if (event && event.target.id !== 'phase4-modal-overlay') {
    return;
  }

  const modal = document.getElementById('phase4-modal-overlay');
  if (modal) {
    modal.remove();
  }
}

async function confirmPhase4Test() {
  const moduleKey = document.getElementById('phase4-module-select').value;
  const autoRepair = document.getElementById('phase4-auto-repair').checked;
  const includeComparison = document.getElementById('phase4-comparison').checked;
  const maxRetries = parseInt(document.getElementById('phase4-max-retries').value);

  console.log('🔬 [PHASE4] Configuración:', {
    moduleKey: moduleKey || 'TODOS',
    autoRepair,
    includeComparison,
    maxRetries
  });

  closePhase4Modal();

  // Mostrar panel de ejecución
  document.querySelector('.mode-selector-container').style.display = 'none';
  document.querySelector('.testing-options-container').style.display = 'none';
  document.getElementById('execution-panel').style.display = 'block';
  document.getElementById('execution-mode-badge').textContent = '🔬 TEST PROFUNDO CON REPORTE';
  document.getElementById('status-badge').innerHTML = '🟢 <span id="status-text">Ejecutando</span>';

  // Limpiar logs
  logsBuffer = [];
  document.getElementById('log-container').innerHTML = '<div class="log-entry log-info">🔬 Iniciando Test Profundo con Auto-Reparación...</div>';

  addLog('🚀 PHASE 4 - Test Profundo con Auto-Reparación', 'info');
  addLog(`📊 Alcance: ${moduleKey || 'TODOS LOS MÓDULOS'}`, 'info');
  addLog(`🔧 Auto-reparación: ${autoRepair ? 'ACTIVADA' : 'DESACTIVADA'}`, 'info');
  addLog(`🔄 Reintentos: ${maxRetries}`, 'info');
  addLog(`📈 Comparación: ${includeComparison ? 'ACTIVADA' : 'DESACTIVADA'}`, 'info');
  addLog('👁️ Navegador VISIBLE: Se abrirá Chrome para que veas el testing', 'info');
  addLog('🏷️ Datos de prueba: Prefijo "test_" para fácil limpieza', 'info');

  const token = getAuthToken();

  try {
    const response = await fetch('/api/audit/phase4/test/deep-with-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        moduleKey: moduleKey || null,
        maxRetries,
        autoApprove: autoRepair,
        includeComparison
      })
    });

    const data = await response.json();

    if (data.success) {
      addLog('✅ Test profundo iniciado correctamente', 'success');
      addLog(`📊 Execution ID: ${data.execution_id}`, 'info');
      addLog('🔄 Progreso en tiempo real vía WebSocket', 'info');
      addLog('🌐 Abriendo navegador visible en 3 segundos...', 'info');
      addLog(`📄 Reporte disponible en: ${data.endpoints.download_report}`, 'info');
      showNotification('✅ Test profundo iniciado - Observa el navegador', 'success');

      // Escuchar evento de finalización
      if (window.socket) {
        window.socket.on('deep-test-complete', (result) => {
          addLog('✅ TEST PROFUNDO COMPLETADO', 'success');
          addLog(`📄 Reporte generado: ${result.report_file}`, 'success');
          addLog(`📊 Tests: ${result.test_summary.passed} passed, ${result.test_summary.failed} failed`, 'info');

          if (result.repair_summary) {
            addLog(`🔧 Auto-reparaciones: ${result.repair_summary.repairs_successful}/${result.repair_summary.repairs_attempted}`, 'info');
          }

          showNotification(`✅ Test completado - Reporte: ${result.report_file}`, 'success');

          // Botón para descargar reporte
          addLog('📥 Puedes descargar el reporte desde el panel de reportes', 'info');
        });

        window.socket.on('deep-test-error', (error) => {
          addLog(`❌ Error en test profundo: ${error.error}`, 'error');
          showNotification('❌ Error en test profundo', 'error');
        });
      }

    } else {
      addLog(`❌ Error: ${data.error}`, 'error');
      showNotification('❌ Error: ' + data.error, 'error');
    }

  } catch (error) {
    console.error('❌ [PHASE4] Error:', error);
    addLog(`❌ Error de conexión: ${error.message}`, 'error');
    showNotification('❌ Error al iniciar test', 'error');
  }
}

function addPhase4Styles() {
  // Evitar agregar estilos múltiples veces
  if (document.getElementById('phase4-styles')) {
    return;
  }

  const styles = document.createElement('style');
  styles.id = 'phase4-styles';
  styles.textContent = `
    .phase4-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    }

    .phase4-modal {
      background: white;
      border-radius: 16px;
      max-width: 700px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }

    .phase4-modal-header {
      padding: 24px 24px 16px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .phase4-modal-header h3 {
      margin: 0;
      color: #2d3748;
      font-size: 1.5rem;
    }

    .phase4-modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #718096;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .phase4-modal-close:hover {
      background: #f7fafc;
      color: #2d3748;
    }

    .phase4-modal-body {
      padding: 24px;
    }

    .phase4-form-group {
      margin-bottom: 20px;
    }

    .phase4-form-group label {
      display: block;
      margin-bottom: 8px;
      color: #2d3748;
      font-size: 0.95rem;
    }

    .phase4-select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .phase4-select:hover {
      border-color: #cbd5e0;
    }

    .phase4-select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .phase4-help-text {
      margin-top: 8px;
      font-size: 0.875rem;
      color: #718096;
      font-style: italic;
    }

    .phase4-info-box {
      background: linear-gradient(135deg, #f0f4ff, #e6f0ff);
      border-left: 4px solid #667eea;
      padding: 16px;
      border-radius: 8px;
      margin-top: 20px;
    }

    .phase4-info-box strong {
      color: #2d3748;
      display: block;
      margin-bottom: 8px;
    }

    .phase4-info-box ul {
      margin: 8px 0 0 0;
      padding-left: 20px;
      color: #4a5568;
    }

    .phase4-info-box li {
      margin-bottom: 4px;
    }

    .phase4-modal-footer {
      padding: 16px 24px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f7fafc;
      color: #2d3748;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #edf2f7;
    }

    .testing-card-phase4 {
      border: 3px solid #667eea;
      background: linear-gradient(135deg, #ffffff, #f0f4ff);
    }

    .btn-test-phase4 {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      font-weight: 700;
    }

    .phase4-info {
      background: linear-gradient(135deg, #f7fafc, #edf2f7);
      border-radius: 12px;
      padding: 20px;
      margin-top: 20px;
      border-left: 4px solid #667eea;
    }

    .phase4-info strong {
      color: #2d3748;
      display: block;
      margin-bottom: 12px;
      font-size: 1.1rem;
    }

    .phase4-info ol {
      margin: 12px 0 0 20px;
      color: #4a5568;
    }

    .phase4-info li {
      margin-bottom: 8px;
    }

    .phase4-info p {
      margin-top: 12px;
      color: #718096;
      font-style: italic;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;

  document.head.appendChild(styles);
}


};

// ═══════════════════════════════════════════════════════════
// EXPORT - Hacer disponible globalmente
// ═══════════════════════════════════════════════════════════

// Exponer funciones globalmente para onclick handlers
window.showAuditorContent = showAuditorContent;
window.selectMode = selectMode;
window.backToModeSelection = backToModeSelection;
window.startAudit = startAudit;
window.stopAudit = stopAudit;
window.clearLogs = clearLogs;
window.retryFix = retryFix;
window.executeTestGlobal = executeTestGlobal;
window.executeTestAPK = executeTestAPK;
window.executeTestModule = executeTestModule;
