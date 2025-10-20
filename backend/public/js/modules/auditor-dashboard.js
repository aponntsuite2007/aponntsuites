/**
 * AUDITOR DASHBOARD - Sistema de Auto-Diagnóstico y Auditoría
 *
 * Funcionalidades:
 * - Ejecutar auditorías completas o por módulo
 * - Ver estado en tiempo real
 * - Analizar dependencias entre módulos
 * - Aprobar/rechazar fixes sugeridos
 * - Generar datos de prueba
 * - Sugerencias de bundles comerciales
 * - Visualizar arquitectura del sistema
 *
 * @version 1.0.0
 */

// ═══════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════

let currentExecution = null;
let statusPollInterval = null;
let systemModules = [];
let executionHistory = [];

// ═══════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════

async function showAuditorContent() {
  console.log('🔍 [AUDITOR] Cargando módulo de auditoría...');

  const mainContent = document.getElementById('mainContent');
  if (!mainContent) {
    console.error('❌ [AUDITOR] No se encontró contenedor mainContent');
    return;
  }

  // Inyectar estilos
  injectAuditorStyles();

  // Renderizar UI
  mainContent.innerHTML = `
    <div class="auditor-container">
      <!-- HEADER -->
      <div class="auditor-header">
        <div class="header-title">
          <h2>🔍 Sistema de Auto-Diagnóstico y Auditoría</h2>
          <p class="subtitle">Análisis completo del sistema multi-tenant con auto-reparación híbrida</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" onclick="runFullAudit()">
            ▶️ Ejecutar Auditoría Completa
          </button>
          <button class="btn-secondary" onclick="refreshStatus()">
            🔄 Refrescar Estado
          </button>
        </div>
      </div>

      <!-- TABS -->
      <div class="auditor-tabs">
        <button class="tab-btn active" data-tab="status" onclick="switchTab('status')">
          📊 Estado Actual
        </button>
        <button class="tab-btn" data-tab="registry" onclick="switchTab('registry')">
          📋 Registry de Módulos
        </button>
        <button class="tab-btn" data-tab="dependencies" onclick="switchTab('dependencies')">
          🔗 Análisis de Dependencias
        </button>
        <button class="tab-btn" data-tab="history" onclick="switchTab('history')">
          📜 Historial de Ejecuciones
        </button>
        <button class="tab-btn" data-tab="seeder" onclick="switchTab('seeder')">
          🌱 Generador de Datos
        </button>
        <button class="tab-btn" data-tab="bundles" onclick="switchTab('bundles')">
          💰 Sugerencias Comerciales
        </button>
      </div>

      <!-- TAB: ESTADO ACTUAL -->
      <div id="tab-status" class="tab-content active">
        <div id="current-status-container">
          <div class="loading-spinner">Cargando estado...</div>
        </div>
      </div>

      <!-- TAB: REGISTRY -->
      <div id="tab-registry" class="tab-content">
        <div id="registry-container">
          <div class="loading-spinner">Cargando registry...</div>
        </div>
      </div>

      <!-- TAB: DEPENDENCIES -->
      <div id="tab-dependencies" class="tab-content">
        <div class="dependency-analyzer">
          <div class="analyzer-header">
            <h3>🔗 Analizador de Dependencias</h3>
            <select id="module-selector" onchange="analyzeDependencies(this.value)">
              <option value="">Selecciona un módulo...</option>
            </select>
          </div>
          <div id="dependency-result"></div>
        </div>
      </div>

      <!-- TAB: HISTORY -->
      <div id="tab-history" class="tab-content">
        <div id="history-container">
          <div class="loading-spinner">Cargando historial...</div>
        </div>
      </div>

      <!-- TAB: SEEDER -->
      <div id="tab-seeder" class="tab-content">
        <div class="seeder-panel">
          <h3>🌱 Generador de Datos de Prueba</h3>
          <p>Genera datos realistas para testear módulos (multi-tenant aislado)</p>

          <div class="seeder-form">
            <select id="seeder-module" class="form-control">
              <option value="">Selecciona módulo...</option>
              <option value="users">👥 Usuarios</option>
              <option value="attendance">⏰ Asistencias</option>
              <option value="medical">🏥 Certificados Médicos</option>
              <option value="vacation">🏖️ Vacaciones</option>
              <option value="departments">🏢 Departamentos</option>
              <option value="kiosks">📱 Kioscos</option>
            </select>

            <input type="number" id="seeder-count" class="form-control"
                   placeholder="Cantidad (default: 10)" min="1" max="100" value="10">

            <button class="btn-primary" onclick="generateTestData()">
              🌱 Generar Datos
            </button>

            <button class="btn-danger" onclick="cleanupTestData()">
              🗑️ Limpiar Datos de Prueba
            </button>
          </div>

          <div id="seeder-result"></div>
        </div>
      </div>

      <!-- TAB: BUNDLES -->
      <div id="tab-bundles" class="tab-content">
        <div id="bundles-container">
          <div class="loading-spinner">Cargando sugerencias...</div>
        </div>
      </div>
    </div>
  `;

  // Inicializar
  await initializeAuditor();
}

// ═══════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════

async function initializeAuditor() {
  console.log('🔧 [AUDITOR] Inicializando dashboard...');

  try {
    // Cargar registry de módulos
    await loadSystemRegistry();

    // Cargar estado actual
    await loadCurrentStatus();

    // Cargar historial
    await loadExecutionHistory();

    console.log('✅ [AUDITOR] Dashboard inicializado correctamente');
  } catch (error) {
    console.error('❌ [AUDITOR] Error inicializando:', error);
    showError('Error inicializando el auditor: ' + error.message);
  }
}

// ═══════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════

async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('authToken');

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`/api/audit${endpoint}`, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en la API');
  }

  return await response.json();
}

// ═══════════════════════════════════════════════════════════
// REGISTRY - Cargar módulos del sistema
// ═══════════════════════════════════════════════════════════

async function loadSystemRegistry() {
  try {
    const result = await apiCall('/registry');
    systemModules = result.modules;

    console.log(`📋 [AUDITOR] ${systemModules.length} módulos cargados`);

    // Renderizar registry
    renderRegistry();

    // Poblar selector de dependencias
    const selector = document.getElementById('module-selector');
    if (selector) {
      selector.innerHTML = '<option value="">Selecciona un módulo...</option>' +
        systemModules.map(m =>
          `<option value="${m.id}">${m.name} (${m.id})</option>`
        ).join('');
    }

  } catch (error) {
    console.error('❌ [AUDITOR] Error cargando registry:', error);
  }
}

function renderRegistry() {
  const container = document.getElementById('registry-container');
  if (!container) return;

  if (systemModules.length === 0) {
    container.innerHTML = '<p>No hay módulos registrados</p>';
    return;
  }

  // Agrupar por categoría
  const byCategory = {};
  systemModules.forEach(m => {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  });

  let html = '<div class="registry-grid">';

  for (const [category, modules] of Object.entries(byCategory)) {
    html += `
      <div class="category-section">
        <h3 class="category-title">${getCategoryIcon(category)} ${category.toUpperCase()}</h3>
        <div class="modules-list">
    `;

    modules.forEach(module => {
      const isCore = module.commercial?.is_core;
      const standalone = module.commercial?.standalone;

      html += `
        <div class="module-card ${isCore ? 'core' : 'premium'}">
          <div class="module-header">
            <h4>${module.name}</h4>
            <span class="version-badge">v${module.version}</span>
          </div>

          <p class="module-description">${module.description || ''}</p>

          <div class="module-meta">
            <span class="badge ${isCore ? 'badge-core' : 'badge-premium'}">
              ${isCore ? '⚙️ CORE' : '💎 PREMIUM'}
            </span>
            ${standalone ? '<span class="badge badge-standalone">🔌 Standalone</span>' : ''}
          </div>

          <div class="module-dependencies">
            ${module.dependencies.required.length > 0 ? `
              <div class="dep-section">
                <strong>Requiere:</strong>
                <span class="dep-tags">
                  ${module.dependencies.required.map(d => `<span class="dep-tag required">${d}</span>`).join('')}
                </span>
              </div>
            ` : ''}

            ${module.dependencies.optional.length > 0 ? `
              <div class="dep-section">
                <strong>Opcional:</strong>
                <span class="dep-tags">
                  ${module.dependencies.optional.map(d => `<span class="dep-tag optional">${d}</span>`).join('')}
                </span>
              </div>
            ` : ''}
          </div>

          <button class="btn-sm" onclick="viewModuleDetails('${module.id}')">
            👁️ Ver Detalles
          </button>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

function getCategoryIcon(category) {
  const icons = {
    'core': '⚙️',
    'rrhh': '👥',
    'communication': '📢',
    'security': '🔒',
    'hardware': '📱',
    'organization': '🏢',
    'scheduling': '📅',
    'compliance': '⚖️',
    'analytics': '📊'
  };
  return icons[category] || '📦';
}

async function viewModuleDetails(moduleId) {
  try {
    const result = await apiCall(`/registry/${moduleId}`);
    const module = result.module;

    // Mostrar modal con detalles completos
    const modalHtml = `
      <div class="modal-overlay" onclick="closeModal()">
        <div class="modal-content large" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>${module.name}</h3>
            <button class="close-btn" onclick="closeModal()">✕</button>
          </div>

          <div class="modal-body">
            <div class="detail-section">
              <strong>ID:</strong> ${module.id}<br>
              <strong>Versión:</strong> ${module.version}<br>
              <strong>Categoría:</strong> ${module.category}
            </div>

            <div class="detail-section">
              <h4>📝 Descripción</h4>
              <p>${module.description}</p>
            </div>

            <div class="detail-section">
              <h4>🔗 Dependencias</h4>
              <p><strong>Requeridas:</strong> ${module.dependencies.required.join(', ') || 'Ninguna'}</p>
              <p><strong>Opcionales:</strong> ${module.dependencies.optional.join(', ') || 'Ninguna'}</p>
              <p><strong>Integra con:</strong> ${module.dependencies.integrates_with.join(', ') || 'Ninguno'}</p>
              <p><strong>Provee a:</strong> ${module.dependencies.provides_to.join(', ') || 'Ninguno'}</p>
            </div>

            ${module.api_endpoints ? `
              <div class="detail-section">
                <h4>🌐 API Endpoints</h4>
                <table class="endpoints-table">
                  <thead>
                    <tr>
                      <th>Método</th>
                      <th>Path</th>
                      <th>Descripción</th>
                      <th>Auth</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${module.api_endpoints.map(ep => `
                      <tr>
                        <td><span class="method-badge ${ep.method.toLowerCase()}">${ep.method}</span></td>
                        <td><code>${ep.path}</code></td>
                        <td>${ep.description}</td>
                        <td>${ep.auth_required ? '🔒' : '🔓'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${module.commercial?.suggested_bundles?.length > 0 ? `
              <div class="detail-section">
                <h4>💰 Bundles Sugeridos</h4>
                ${module.commercial.suggested_bundles.map(bundle => `
                  <div class="bundle-suggestion">
                    <strong>${bundle.name}</strong><br>
                    <small>Incluye: ${bundle.modules.join(', ')}</small><br>
                    <small>Beneficio: ${bundle.benefit}</small>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            <button class="btn-primary" onclick="analyzeDependencies('${module.id}'); closeModal(); switchTab('dependencies');">
              🔗 Analizar Dependencias
            </button>
            <button class="btn-secondary" onclick="closeModal()">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

  } catch (error) {
    console.error('❌ Error cargando detalles:', error);
    showError('Error cargando detalles del módulo');
  }
}

// ═══════════════════════════════════════════════════════════
// STATUS - Estado actual
// ═══════════════════════════════════════════════════════════

async function loadCurrentStatus() {
  try {
    const result = await apiCall('/status');
    renderStatus(result.status);
  } catch (error) {
    console.error('❌ [AUDITOR] Error cargando estado:', error);
    document.getElementById('current-status-container').innerHTML =
      '<p class="error-message">Error cargando estado del auditor</p>';
  }
}

function renderStatus(status) {
  const container = document.getElementById('current-status-container');
  if (!container) return;

  const isRunning = status.is_running;
  const hasExecution = status.current_execution;

  let html = `
    <div class="status-panel">
      <div class="status-header">
        <h3>Estado del Sistema de Auditoría</h3>
        <div class="status-indicator ${isRunning ? 'running' : 'idle'}">
          ${isRunning ? '🔄 EN EJECUCIÓN' : '⚪ INACTIVO'}
        </div>
      </div>
  `;

  if (hasExecution) {
    html += `
      <div class="execution-info">
        <h4>Ejecución Actual</h4>
        <p><strong>ID:</strong> ${status.current_execution.id}</p>
        <p><strong>Fase:</strong> ${status.current_execution.phase || 'Iniciando...'}</p>
        <p><strong>Progreso:</strong> ${status.current_execution.progress || 0}%</p>

        <div class="progress-bar">
          <div class="progress-fill" style="width: ${status.current_execution.progress || 0}%"></div>
        </div>

        ${status.current_execution.current_task ? `
          <p><strong>Tarea actual:</strong> ${status.current_execution.current_task}</p>
        ` : ''}
      </div>
    `;
  } else if (status.last_execution) {
    // Mostrar última ejecución completada
    const lastEx = status.last_execution;
    const summary = lastEx.summary || {};
    const duration = lastEx.duration ? (lastEx.duration / 1000).toFixed(2) : '?';
    const statusClass = summary.failed > 0 ? 'error' : summary.warnings > 0 ? 'warning' : 'success';

    html += `
      <div class="last-execution">
        <h4>✅ Última Auditoría Completada</h4>
        <p><strong>ID:</strong> ${lastEx.id}</p>
        <p><strong>Duración:</strong> ${duration}s</p>

        <div class="summary-stats ${statusClass}">
          <div class="stat">
            <span class="stat-label">Total</span>
            <span class="stat-value">${summary.total || 0}</span>
          </div>
          <div class="stat success">
            <span class="stat-label">✅ Passed</span>
            <span class="stat-value">${summary.passed || 0}</span>
          </div>
          <div class="stat error">
            <span class="stat-label">❌ Failed</span>
            <span class="stat-value">${summary.failed || 0}</span>
          </div>
          <div class="stat warning">
            <span class="stat-label">⚠️ Warnings</span>
            <span class="stat-value">${summary.warnings || 0}</span>
          </div>
        </div>

        <button class="btn-primary" onclick="runFullAudit()" style="margin-top: 15px;">
          ▶️ Ejecutar Nueva Auditoría
        </button>
      </div>
    `;
  } else {
    html += `
      <div class="no-execution">
        <p>No hay auditorías en ejecución actualmente</p>
        <p style="color: #666; font-size: 13px; margin: 10px 0;">No se han ejecutado auditorías aún</p>
        <button class="btn-primary" onclick="runFullAudit()">
          ▶️ Iniciar Auditoría Completa
        </button>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

async function refreshStatus() {
  console.log('🔄 [AUDITOR] Refrescando estado...');
  await loadCurrentStatus();
}

// ═══════════════════════════════════════════════════════════
// EXECUTION - Ejecutar auditorías
// ═══════════════════════════════════════════════════════════

async function runFullAudit() {
  if (currentExecution) {
    if (!confirm('Ya hay una auditoría en curso. ¿Deseas iniciar una nueva?')) {
      return;
    }
  }

  try {
    showLoading('Iniciando auditoría completa...');

    const result = await apiCall('/run', 'POST', {
      parallel: true,
      autoHeal: true
    });

    currentExecution = result.execution_id;

    console.log(`✅ [AUDITOR] Auditoría iniciada: ${currentExecution}`);

    showSuccess(`Auditoría iniciada exitosamente (ID: ${currentExecution})`);

    // Polling de estado cada 2 segundos
    startStatusPolling();

    // Cambiar a tab de estado
    switchTab('status');

  } catch (error) {
    console.error('❌ [AUDITOR] Error ejecutando auditoría:', error);
    showError('Error ejecutando auditoría: ' + error.message);
  }
}

async function runModuleAudit(moduleId) {
  try {
    showLoading(`Auditando módulo: ${moduleId}...`);

    const result = await apiCall(`/run/${moduleId}`, 'POST');

    currentExecution = result.execution_id;

    showSuccess(`Auditoría de ${moduleId} iniciada (ID: ${currentExecution})`);

    startStatusPolling();
    switchTab('status');

  } catch (error) {
    console.error('❌ Error auditando módulo:', error);
    showError('Error auditando módulo: ' + error.message);
  }
}

function startStatusPolling() {
  if (statusPollInterval) {
    clearInterval(statusPollInterval);
  }

  statusPollInterval = setInterval(async () => {
    await loadCurrentStatus();

    // Si ya no hay ejecución en curso, detener polling
    const statusResult = await apiCall('/status');
    if (!statusResult.status.is_running) {
      stopStatusPolling();
      await loadExecutionHistory(); // Recargar historial
    }
  }, 2000);
}

function stopStatusPolling() {
  if (statusPollInterval) {
    clearInterval(statusPollInterval);
    statusPollInterval = null;
  }
}

// ═══════════════════════════════════════════════════════════
// HISTORY - Historial de ejecuciones
// ═══════════════════════════════════════════════════════════

async function loadExecutionHistory() {
  try {
    const result = await apiCall('/executions?limit=20');
    executionHistory = result.executions;
    renderHistory();
  } catch (error) {
    console.error('❌ Error cargando historial:', error);
    document.getElementById('history-container').innerHTML =
      '<p class="error-message">Error cargando historial</p>';
  }
}

function renderHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;

  if (executionHistory.length === 0) {
    container.innerHTML = '<p>No hay ejecuciones previas</p>';
    return;
  }

  let html = `
    <table class="history-table">
      <thead>
        <tr>
          <th>ID Ejecución</th>
          <th>Fecha</th>
          <th>Duración</th>
          <th>Tests</th>
          <th>Errores</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;

  executionHistory.forEach(exec => {
    const date = new Date(exec.started_at).toLocaleString('es-AR');
    const duration = exec.completed_at
      ? Math.round((new Date(exec.completed_at) - new Date(exec.started_at)) / 1000)
      : '-';

    html += `
      <tr>
        <td><code>${exec.id.substring(0, 8)}...</code></td>
        <td>${date}</td>
        <td>${duration}s</td>
        <td>${exec.total_tests || 0}</td>
        <td class="${exec.total_failures > 0 ? 'text-danger' : ''}">
          ${exec.total_failures || 0}
        </td>
        <td>
          <span class="status-badge ${exec.status}">${exec.status}</span>
        </td>
        <td>
          <button class="btn-sm" onclick="viewExecutionDetails('${exec.id}')">
            👁️ Ver
          </button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

async function viewExecutionDetails(executionId) {
  try {
    showLoading('Cargando detalles de ejecución...');

    const result = await apiCall(`/executions/${executionId}`);

    // TODO: Mostrar modal con detalles completos
    console.log('Execution details:', result);

    showSuccess('Detalles cargados (ver consola)');

  } catch (error) {
    console.error('❌ Error cargando detalles:', error);
    showError('Error cargando detalles de ejecución');
  }
}

// ═══════════════════════════════════════════════════════════
// DEPENDENCIES - Análisis de dependencias
// ═══════════════════════════════════════════════════════════

async function analyzeDependencies(moduleId) {
  if (!moduleId) {
    document.getElementById('dependency-result').innerHTML = '';
    return;
  }

  try {
    showLoading('Analizando dependencias...');

    const result = await apiCall(`/dependencies/${moduleId}`);

    renderDependencyAnalysis(result);

  } catch (error) {
    console.error('❌ Error analizando dependencias:', error);
    showError('Error analizando dependencias');
  }
}

function renderDependencyAnalysis(result) {
  const container = document.getElementById('dependency-result');
  if (!container) return;

  const canWork = result.can_work;
  const impact = result.deactivation_impact;

  let html = `
    <div class="dependency-analysis">
      <h4>Análisis de: ${result.module}</h4>

      <div class="analysis-section">
        <h5>¿Puede funcionar actualmente?</h5>
        <div class="status-indicator ${canWork ? 'success' : 'error'}">
          ${canWork ? '✅ SÍ puede funcionar' : '❌ NO puede funcionar'}
        </div>

        ${!canWork && canWork.missing?.length > 0 ? `
          <div class="alert alert-danger">
            <strong>Faltan dependencias requeridas:</strong>
            <ul>
              ${canWork.missing.map(m => `<li>${m}</li>`).join('')}
            </ul>
            <p><strong>Sugerencia:</strong> ${canWork.suggestion}</p>
          </div>
        ` : ''}
      </div>

      <div class="analysis-section">
        <h5>Impacto de Desactivación</h5>

        ${impact.safe ? `
          <div class="alert alert-success">
            ✅ Se puede desactivar sin problemas
          </div>
        ` : `
          <div class="alert alert-warning">
            ⚠️ Desactivar este módulo afectará a otros módulos
          </div>
        `}

        ${impact.critical_affected?.length > 0 ? `
          <div class="alert alert-danger">
            <strong>⚠️ Módulos que DEJARÁN DE FUNCIONAR:</strong>
            <ul>
              ${impact.critical_affected.map(m => `<li><strong>${m}</strong> (requiere este módulo)</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${impact.degraded_affected?.length > 0 ? `
          <div class="alert alert-warning">
            <strong>Módulos con funcionalidad reducida:</strong>
            <ul>
              ${impact.degraded_affected.map(m => `<li>${m} (mejora opcional)</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
// SEEDER - Generador de datos
// ═══════════════════════════════════════════════════════════

async function generateTestData() {
  const moduleSelect = document.getElementById('seeder-module');
  const countInput = document.getElementById('seeder-count');

  const moduleId = moduleSelect.value;
  const count = parseInt(countInput.value) || 10;

  if (!moduleId) {
    showError('Selecciona un módulo');
    return;
  }

  try {
    showLoading(`Generando ${count} registros de prueba para ${moduleId}...`);

    const result = await apiCall(`/seed/${moduleId}`, 'POST', { count });

    const resultDiv = document.getElementById('seeder-result');
    resultDiv.innerHTML = `
      <div class="alert alert-success">
        ✅ ${result.message}
        <br>
        <small>IDs generados: ${result.records.map(r => r.id.substring(0, 8)).join(', ')}...</small>
      </div>
    `;

    showSuccess(result.message);

  } catch (error) {
    console.error('❌ Error generando datos:', error);
    showError('Error generando datos: ' + error.message);
  }
}

async function cleanupTestData() {
  if (!confirm('¿Estás seguro de eliminar TODOS los datos de prueba generados?')) {
    return;
  }

  try {
    showLoading('Limpiando datos de prueba...');

    const result = await apiCall('/cleanup', 'DELETE');

    const resultDiv = document.getElementById('seeder-result');
    resultDiv.innerHTML = `
      <div class="alert alert-success">
        ✅ ${result.message}
      </div>
    `;

    showSuccess(result.message);

  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
    showError('Error limpiando datos: ' + error.message);
  }
}

// ═══════════════════════════════════════════════════════════
// BUNDLES - Sugerencias comerciales
// ═══════════════════════════════════════════════════════════

async function loadBundleSuggestions() {
  try {
    const result = await apiCall('/bundles');
    renderBundles(result.suggestions);
  } catch (error) {
    console.error('❌ Error cargando bundles:', error);
    document.getElementById('bundles-container').innerHTML =
      '<p class="error-message">Error cargando sugerencias comerciales</p>';
  }
}

function renderBundles(suggestions) {
  const container = document.getElementById('bundles-container');
  if (!container) return;

  if (!suggestions || suggestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No hay sugerencias de bundles disponibles actualmente</p>
        <p><small>Las sugerencias se generan basándose en los módulos activos de tu empresa</small></p>
      </div>
    `;
    return;
  }

  let html = '<div class="bundles-grid">';

  suggestions.forEach(bundle => {
    html += `
      <div class="bundle-card">
        <h4>${bundle.name}</h4>
        <p class="bundle-description">${bundle.benefit}</p>

        <div class="bundle-modules">
          <strong>Incluye:</strong>
          <ul>
            ${bundle.modules.map(m => `<li>${m}</li>`).join('')}
          </ul>
        </div>

        ${bundle.discount ? `
          <div class="bundle-pricing">
            <span class="discount-badge">💰 ${bundle.discount}% descuento</span>
          </div>
        ` : ''}
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════

function switchTab(tabName) {
  // Remover active de todos los tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Activar tab seleccionado
  const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
  const tabContent = document.getElementById(`tab-${tabName}`);

  if (tabBtn) tabBtn.classList.add('active');
  if (tabContent) tabContent.classList.add('active');

  // Cargar datos si es necesario
  if (tabName === 'bundles' && document.getElementById('bundles-container').innerHTML.includes('Cargando')) {
    loadBundleSuggestions();
  }
}

// ═══════════════════════════════════════════════════════════
// UTILIDADES UI
// ═══════════════════════════════════════════════════════════

function showLoading(message) {
  if (window.showAlert) {
    window.showAlert(message, 'info');
  } else {
    console.log('⏳', message);
  }
}

function showSuccess(message) {
  if (window.showAlert) {
    window.showAlert(message, 'success');
  } else {
    console.log('✅', message);
  }
}

function showError(message) {
  if (window.showAlert) {
    window.showAlert(message, 'danger');
  } else {
    console.error('❌', message);
  }
}

function closeModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// ═══════════════════════════════════════════════════════════
// ESTILOS CSS
// ═══════════════════════════════════════════════════════════

function injectAuditorStyles() {
  if (document.getElementById('auditor-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'auditor-styles';
  styles.textContent = `
    .auditor-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .auditor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
    }

    .header-title h2 {
      margin: 0;
      font-size: 24px;
    }

    .header-title .subtitle {
      margin: 5px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    .auditor-tabs {
      display: flex;
      gap: 5px;
      margin-bottom: 20px;
      border-bottom: 2px solid #e0e0e0;
      overflow-x: auto;
    }

    .tab-btn {
      padding: 12px 20px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
      white-space: nowrap;
    }

    .tab-btn:hover {
      background: #f5f5f5;
      color: #333;
    }

    .tab-btn.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .tab-content {
      display: none;
      animation: fadeIn 0.3s;
    }

    .tab-content.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .status-panel,
    .seeder-panel,
    .dependency-analyzer {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .status-indicator {
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 12px;
    }

    .status-indicator.running {
      background: #4caf50;
      color: white;
      animation: pulse 2s infinite;
    }

    .status-indicator.idle {
      background: #9e9e9e;
      color: white;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .execution-info, .last-execution {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 6px;
      margin-top: 15px;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin: 15px 0;
    }

    .summary-stats .stat {
      background: white;
      padding: 12px;
      border-radius: 6px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .summary-stats .stat-label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }

    .summary-stats .stat-value {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }

    .summary-stats .stat.success .stat-value {
      color: #4caf50;
    }

    .summary-stats .stat.error .stat-value {
      color: #f44336;
    }

    .summary-stats .stat.warning .stat-value {
      color: #ff9800;
    }

    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      margin: 10px 0;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.5s;
    }

    .registry-grid {
      display: grid;
      gap: 30px;
    }

    .category-section {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
    }

    .category-title {
      margin: 0 0 15px 0;
      color: #667eea;
      font-size: 16px;
    }

    .modules-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
    }

    .module-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
      background: white;
      transition: all 0.3s;
    }

    .module-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .module-card.core {
      border-left: 4px solid #2196f3;
    }

    .module-card.premium {
      border-left: 4px solid #ff9800;
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .module-header h4 {
      margin: 0;
      font-size: 16px;
    }

    .version-badge {
      background: #e0e0e0;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      color: #666;
    }

    .module-description {
      font-size: 13px;
      color: #666;
      margin: 10px 0;
      min-height: 40px;
    }

    .module-meta {
      display: flex;
      gap: 5px;
      margin-bottom: 10px;
    }

    .badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
    }

    .badge-core {
      background: #e3f2fd;
      color: #2196f3;
    }

    .badge-premium {
      background: #fff3e0;
      color: #ff9800;
    }

    .badge-standalone {
      background: #f3e5f5;
      color: #9c27b0;
    }

    .module-dependencies {
      font-size: 12px;
      margin: 10px 0;
    }

    .dep-section {
      margin: 5px 0;
    }

    .dep-tags {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .dep-tag {
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 10px;
    }

    .dep-tag.required {
      background: #ffebee;
      color: #c62828;
    }

    .dep-tag.optional {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }

    .history-table th {
      background: #f5f5f5;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #666;
    }

    .history-table td {
      padding: 12px;
      border-top: 1px solid #e0e0e0;
      font-size: 13px;
    }

    .history-table tbody tr:hover {
      background: #f9f9f9;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
    }

    .status-badge.completed {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-badge.failed {
      background: #ffebee;
      color: #c62828;
    }

    .status-badge.running {
      background: #e3f2fd;
      color: #1976d2;
    }

    .seeder-form {
      display: flex;
      gap: 10px;
      margin: 20px 0;
      flex-wrap: wrap;
    }

    .seeder-form .form-control {
      flex: 1;
      min-width: 200px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
    }

    .alert {
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }

    .alert-success {
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
      color: #2e7d32;
    }

    .alert-warning {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      color: #e65100;
    }

    .alert-danger {
      background: #ffebee;
      border-left: 4px solid #f44336;
      color: #c62828;
    }

    .alert-info {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      color: #1565c0;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }

    .modal-content.large {
      max-width: 900px;
    }

    .modal-header {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 {
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
    }

    .close-btn:hover {
      color: #333;
    }

    .modal-body {
      padding: 20px;
    }

    .modal-footer {
      padding: 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .detail-section {
      margin-bottom: 20px;
    }

    .detail-section h4 {
      margin: 0 0 10px 0;
      color: #667eea;
      font-size: 16px;
    }

    .endpoints-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .endpoints-table th,
    .endpoints-table td {
      padding: 8px;
      border: 1px solid #e0e0e0;
      text-align: left;
    }

    .endpoints-table th {
      background: #f5f5f5;
      font-weight: 600;
    }

    .method-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }

    .method-badge.get {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .method-badge.post {
      background: #e3f2fd;
      color: #1976d2;
    }

    .method-badge.put {
      background: #fff3e0;
      color: #e65100;
    }

    .method-badge.delete {
      background: #ffebee;
      color: #c62828;
    }

    .loading-spinner {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: #667eea;
      color: white;
      transition: all 0.3s;
    }

    .btn-sm:hover {
      background: #5568d3;
    }

    .btn-primary {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s;
    }

    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      padding: 10px 20px;
      background: #9e9e9e;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-secondary:hover {
      background: #757575;
    }

    .btn-danger {
      padding: 10px 20px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-danger:hover {
      background: #d32f2f;
    }

    .text-danger {
      color: #c62828;
      font-weight: bold;
    }

    .bundles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .bundle-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: white;
      transition: all 0.3s;
    }

    .bundle-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .bundle-description {
      color: #666;
      font-size: 14px;
      margin: 10px 0;
    }

    .bundle-modules ul {
      margin: 10px 0;
      padding-left: 20px;
    }

    .bundle-modules li {
      margin: 5px 0;
      font-size: 13px;
    }

    .discount-badge {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }

    .analyzer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .analyzer-header select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }

    .dependency-analysis {
      margin-top: 20px;
    }

    .analysis-section {
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 6px;
    }

    .analysis-section h5 {
      margin: 0 0 10px 0;
      color: #667eea;
    }

    .status-indicator.success {
      background: #4caf50;
      color: white;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
    }

    .status-indicator.error {
      background: #f44336;
      color: white;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
    }
  `;

  document.head.appendChild(styles);
}

// ═══════════════════════════════════════════════════════════
// EXPORTAR (para uso global)
// ═══════════════════════════════════════════════════════════

window.showAuditorContent = showAuditorContent;
