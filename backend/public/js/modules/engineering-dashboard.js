/**
 * ============================================================================
 * ENGINEERING DASHBOARD - Visualización 3D Interactiva del Sistema
 * ============================================================================
 *
 * Dashboard profesional para visualizar arquitectura completa del ecosistema:
 * - Panel Administrativo (Web)
 * - Panel Empresa (Web)
 * - Index.html (Landing)
 * - APK Kiosk (Mobile - Biométrico)
 * - APK Empleados (Mobile - Planned)
 * - APK Vendedores/Soporte (Mobile - Planned)
 * - APK Asociados (Mobile - Planned)
 *
 * Features:
 * - Drill-down navigation (cube-style)
 * - Gantt charts para roadmap
 * - Dependency graphs
 * - Progress tracking en tiempo real
 * - Color-coded status indicators
 * - Búsqueda y filtrado
 *
 * Layers:
 * 1. Applications (7 apps del ecosistema)
 * 2. Modules (20+ módulos backend)
 * 3. Roadmap (6 fases con tareas)
 * 4. Database (Schema y relaciones)
 *
 * ============================================================================
 */

console.log('✅ [ENGINEERING] Archivo engineering-dashboard.js cargado');

const EngineeringDashboard = {
  metadata: null,
  stats: null,
  currentView: 'overview', // overview, applications, modules, roadmap, database
  currentDrilldown: null,
  searchTerm: '',
  filterStatus: 'all',
  isInitialized: false,
  isInitializing: false,

  /**
   * Inicializar dashboard
   */
  async init() {
    // Protección contra inicialización múltiple
    if (this.isInitialized) {
      console.log('ℹ️ [ENGINEERING] Dashboard ya inicializado, omitiendo...');
      return;
    }

    if (this.isInitializing) {
      console.log('⏳ [ENGINEERING] Inicialización en progreso, esperando...');
      return;
    }

    this.isInitializing = true;
    console.log('🏗️ [ENGINEERING] Inicializando Engineering Dashboard...');

    try {
      // Cargar metadata y stats
      await this.loadMetadata();
      await this.loadStats();

      // Renderizar UI
      this.renderDashboard();
      this.setupEventListeners();
      this.startAutoRefresh();

      this.isInitialized = true;
      console.log('✅ [ENGINEERING] Dashboard inicializado correctamente');
    } catch (error) {
      console.error('❌ [ENGINEERING] Error inicializando dashboard:', error);
      this.showError('Error inicializando dashboard: ' + error.message);
    } finally {
      this.isInitializing = false;
    }
  },

  /**
   * Cargar metadata desde API
   */
  async loadMetadata() {
    try {
      const response = await fetch('/api/engineering/metadata');
      const result = await response.json();

      if (result.success) {
        this.metadata = result.data;
        console.log('✅ [ENGINEERING] Metadata cargado:', this.metadata);
      } else {
        throw new Error(result.error || 'Error cargando metadata');
      }
    } catch (error) {
      console.error('❌ [ENGINEERING] Error en loadMetadata:', error);
      throw error;
    }
  },

  /**
   * Cargar estadísticas desde API
   */
  async loadStats() {
    try {
      const response = await fetch('/api/engineering/stats');
      const result = await response.json();

      if (result.success) {
        this.stats = result.data;
        console.log('✅ [ENGINEERING] Stats cargados:', this.stats);
      } else {
        throw new Error(result.error || 'Error cargando stats');
      }
    } catch (error) {
      console.error('❌ [ENGINEERING] Error en loadStats:', error);
      throw error;
    }
  },

  /**
   * Renderizar dashboard completo
   */
  renderDashboard() {
    console.log('🔄 [ENGINEERING] Renderizando dashboard...');

    const container = document.getElementById('engineering-dashboard-container');
    if (!container) {
      console.error('❌ [ENGINEERING] Container no encontrado');
      return;
    }

    const engineeringTab = document.getElementById('engineering');
    console.log('✅ [ENGINEERING] Container encontrado');
    console.log('📊 [ENGINEERING] Tab tiene clase active?', engineeringTab?.classList.contains('active'));
    console.log('📊 [ENGINEERING] Tab display:', engineeringTab ? window.getComputedStyle(engineeringTab).display : 'N/A');
    console.log('📊 [ENGINEERING] Metadata:', this.metadata ? 'OK' : 'NULL');
    console.log('📊 [ENGINEERING] Stats:', this.stats ? 'OK' : 'NULL');

    // FORZAR VISIBILIDAD DEL TAB SI NO ESTÁ VISIBLE
    if (engineeringTab && !engineeringTab.classList.contains('active')) {
      console.warn('⚠️ [ENGINEERING] Tab NO tiene clase active, agregándola...');
      engineeringTab.classList.add('active');
    }

    // FORZAR ESTILOS INLINE DEL TAB Y CONTAINER (MÁXIMA PRIORIDAD)
    if (engineeringTab) {
      engineeringTab.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 1 !important; min-height: 600px !important;';
    }
    container.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; min-height: 600px !important; padding: 20px !important; background: #f9f9f9 !important;';

    try {
      // RENDERIZAR INMEDIATAMENTE sin setTimeout
      container.innerHTML = `
        <div style="padding: 20px !important; background: white !important; min-height: 600px !important; border: 5px solid #ff0000 !important; box-shadow: 0 0 20px rgba(255,0,0,0.5) !important; position: relative !important; z-index: 99999 !important;">
          <h1 style="color: #2563eb !important; margin-bottom: 20px !important; font-size: 32px !important;">🏗️ Engineering Dashboard</h1>

          ${!this.metadata || !this.stats ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0;">⚠️ Cargando datos...</h3>
              <p style="color: #78350f; margin: 0;">Metadata: ${this.metadata ? '✅' : '❌'}</p>
              <p style="color: #78350f; margin: 0;">Stats: ${this.stats ? '✅' : '❌'}</p>
            </div>
          ` : `
            <!-- Header con stats globales -->
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              ${this.renderHeader()}
            </div>

            <!-- Toolbar -->
            <div style="margin-bottom: 20px;">
              ${this.renderToolbar()}
            </div>

            <!-- Navegación -->
            <div style="margin-bottom: 20px;">
              ${this.renderNavigation()}
            </div>

            <!-- Contenido -->
            <div>
              ${this.renderContent()}
            </div>
          `}
        </div>
      `;

      console.log('✅ [ENGINEERING] Dashboard renderizado');
      console.log('📝 [ENGINEERING] HTML generado (primeros 300 chars):', container.innerHTML.substring(0, 300));

    } catch (error) {
      console.error('❌ [ENGINEERING] Error en renderDashboard:', error);
      container.innerHTML = `
        <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 20px; margin: 20px; border-radius: 8px;">
          <h4 style="color: #991b1b; margin: 0 0 10px 0;">❌ Error renderizando dashboard</h4>
          <p style="color: #7f1d1d; margin: 0 0 10px 0;">${error.message}</p>
          <pre style="background: white; padding: 10px; border-radius: 4px; overflow: auto;">${error.stack}</pre>
        </div>
      `;
    }
  },

  /**
   * Header con stats globales
   */
  renderHeader() {
    if (!this.metadata || !this.stats) return '<p>Cargando...</p>';

    const { project } = this.metadata;
    const { modules, roadmap } = this.stats;

    return `
      <div class="header-container">
        <div class="header-title">
          <h1>🏗️ Engineering Dashboard</h1>
          <p class="subtitle">${project.name} - ${project.version}</p>
        </div>

        <div class="header-stats">
          <!-- Progreso global -->
          <div class="stat-card global-progress">
            <div class="stat-icon">📊</div>
            <div class="stat-info">
              <div class="stat-label">Progreso Global</div>
              <div class="stat-value">${project.totalProgress}%</div>
              <div class="stat-bar">
                <div class="stat-bar-fill" style="width: ${project.totalProgress}%"></div>
              </div>
            </div>
          </div>

          <!-- Módulos completados -->
          <div class="stat-card modules-stat">
            <div class="stat-icon">📦</div>
            <div class="stat-info">
              <div class="stat-label">Módulos</div>
              <div class="stat-value">${modules.completed} / ${modules.total}</div>
              <div class="stat-detail">${modules.completionRate}% completo</div>
            </div>
          </div>

          <!-- Tareas completadas -->
          <div class="stat-card tasks-stat">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-label">Tareas del Roadmap</div>
              <div class="stat-value">${roadmap.completedTasks} / ${roadmap.totalTasks}</div>
              <div class="stat-detail">${roadmap.taskCompletionRate}% completo</div>
            </div>
          </div>

          <!-- Fase actual -->
          <div class="stat-card phase-stat">
            <div class="stat-icon">🎯</div>
            <div class="stat-info">
              <div class="stat-label">Fase Actual</div>
              <div class="stat-value">${this.formatPhaseName(project.currentPhase)}</div>
              <div class="stat-detail">${roadmap.inProgressPhases} en progreso</div>
            </div>
          </div>
        </div>

        <div class="header-timestamp">
          <small>Última actualización: ${new Date(project.lastUpdated).toLocaleString('es-AR')}</small>
        </div>
      </div>
    `;
  },

  /**
   * Toolbar con búsqueda y filtros
   */
  renderToolbar() {
    return `
      <div class="toolbar-container">
        <!-- Búsqueda -->
        <div class="toolbar-search">
          <input
            type="text"
            id="engineering-search"
            placeholder="Buscar módulos, tareas, aplicaciones..."
            value="${this.searchTerm}"
          />
          <button class="btn-search">🔍</button>
        </div>

        <!-- Filtros de estado -->
        <div class="toolbar-filters">
          <label>Estado:</label>
          <select id="engineering-filter-status">
            <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>Todos</option>
            <option value="PLANNED" ${this.filterStatus === 'PLANNED' ? 'selected' : ''}>Planificados</option>
            <option value="IN_PROGRESS" ${this.filterStatus === 'IN_PROGRESS' ? 'selected' : ''}>En Progreso</option>
            <option value="COMPLETE" ${this.filterStatus === 'COMPLETE' ? 'selected' : ''}>Completos</option>
            <option value="PRODUCTION" ${this.filterStatus === 'PRODUCTION' ? 'selected' : ''}>En Producción</option>
          </select>
        </div>

        <!-- Acciones -->
        <div class="toolbar-actions">
          <button class="btn-refresh" id="btn-refresh-metadata">
            🔄 Recargar
          </button>
          <button class="btn-export" id="btn-export-metadata">
            📥 Exportar JSON
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Navegación entre layers (tabs)
   */
  renderNavigation() {
    const tabs = [
      { id: 'overview', icon: '🌍', label: 'Vista General' },
      { id: 'applications', icon: '📱', label: 'Aplicaciones' },
      { id: 'modules', icon: '📦', label: 'Módulos Backend' },
      { id: 'roadmap', icon: '🗺️', label: 'Roadmap' },
      { id: 'database', icon: '🗄️', label: 'Base de Datos' },
      { id: 'workflows', icon: '🔄', label: 'Workflows' }
    ];

    return `
      <div class="navigation-tabs">
        ${tabs.map(tab => `
          <button
            class="nav-tab ${this.currentView === tab.id ? 'active' : ''}"
            data-view="${tab.id}"
          >
            <span class="tab-icon">${tab.icon}</span>
            <span class="tab-label">${tab.label}</span>
          </button>
        `).join('')}
      </div>
    `;
  },

  /**
   * Contenido principal (cambia según currentView)
   */
  renderContent() {
    switch (this.currentView) {
      case 'overview':
        return this.renderOverview();
      case 'applications':
        return this.renderApplications();
      case 'modules':
        return this.renderModules();
      case 'roadmap':
        return this.renderRoadmap();
      case 'database':
        return this.renderDatabase();
      case 'workflows':
        return this.renderWorkflows();
      default:
        return '<p>Vista no encontrada</p>';
    }
  },

  /**
   * VISTA: Overview - Arquitectura global en 3D/cubo
   */
  renderOverview() {
    if (!this.metadata) return '<p>Cargando...</p>';

    const { applications, modules, roadmap, database } = this.metadata;

    return `
      <div class="overview-container">
        <h2>🌍 Vista General del Ecosistema</h2>

        <!-- Cubo interactivo con 4 capas -->
        <div class="architecture-cube">
          <!-- Capa 1: Aplicaciones -->
          <div class="cube-layer applications-layer" data-layer="applications">
            <div class="layer-header">
              <h3>📱 Aplicaciones (${Object.keys(applications).length})</h3>
              <button class="btn-drill-down" data-target="applications">Ver Detalle →</button>
            </div>
            <div class="layer-preview">
              ${this.renderApplicationsPreview(applications)}
            </div>
          </div>

          <!-- Capa 2: Módulos Backend -->
          <div class="cube-layer modules-layer" data-layer="modules">
            <div class="layer-header">
              <h3>📦 Módulos Backend (${Object.keys(modules).length})</h3>
              <button class="btn-drill-down" data-target="modules">Ver Detalle →</button>
            </div>
            <div class="layer-preview">
              ${this.renderModulesPreview(modules)}
            </div>
          </div>

          <!-- Capa 3: Roadmap -->
          <div class="cube-layer roadmap-layer" data-layer="roadmap">
            <div class="layer-header">
              <h3>🗺️ Roadmap (${Object.keys(roadmap).length} fases)</h3>
              <button class="btn-drill-down" data-target="roadmap">Ver Detalle →</button>
            </div>
            <div class="layer-preview">
              ${this.renderRoadmapPreview(roadmap)}
            </div>
          </div>

          <!-- Capa 4: Base de Datos -->
          <div class="cube-layer database-layer" data-layer="database">
            <div class="layer-header">
              <h3>🗄️ Base de Datos (${Object.keys(database.tables).length} tablas)</h3>
              <button class="btn-drill-down" data-target="database">Ver Detalle →</button>
            </div>
            <div class="layer-preview">
              ${this.renderDatabasePreview(database)}
            </div>
          </div>
        </div>

        <!-- Dependency Graph -->
        <div class="dependency-section">
          <h3>🔗 Grafo de Dependencias</h3>
          <div id="dependency-graph">
            ${this.renderDependencyGraph()}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Preview de aplicaciones (para overview)
   */
  renderApplicationsPreview(applications) {
    const apps = Object.entries(applications).slice(0, 4); // Mostrar solo 4
    const total = Object.keys(applications).length;

    return `
      <div class="preview-grid">
        ${apps.map(([key, app]) => `
          <div class="preview-card ${app.status.toLowerCase()}">
            <div class="app-icon">${this.getAppIcon(app.type)}</div>
            <div class="app-name">${app.name}</div>
            <div class="app-status">${this.getStatusBadge(app.status)}</div>
            <div class="app-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${app.progress}%"></div>
              </div>
              <span class="progress-text">${app.progress}%</span>
            </div>
          </div>
        `).join('')}
        ${total > 4 ? `<div class="preview-more">+${total - 4} más</div>` : ''}
      </div>
    `;
  },

  /**
   * Preview de módulos (para overview)
   */
  renderModulesPreview(modules) {
    const mods = Object.entries(modules).slice(0, 4);
    const total = Object.keys(modules).length;

    return `
      <div class="preview-grid">
        ${mods.map(([key, mod]) => `
          <div class="preview-card ${mod.status.toLowerCase()}">
            <div class="module-name">${mod.name}</div>
            <div class="module-status">${this.getStatusBadge(mod.status)}</div>
            <div class="module-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${mod.progress}%"></div>
              </div>
              <span class="progress-text">${mod.progress}%</span>
            </div>
          </div>
        `).join('')}
        ${total > 4 ? `<div class="preview-more">+${total - 4} más</div>` : ''}
      </div>
    `;
  },

  /**
   * Preview de roadmap (para overview)
   */
  renderRoadmapPreview(roadmap) {
    const phases = Object.entries(roadmap).slice(0, 3);

    return `
      <div class="preview-timeline">
        ${phases.map(([key, phase]) => `
          <div class="timeline-item ${phase.status.toLowerCase()}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="phase-name">${phase.name}</div>
              <div class="phase-status">${this.getStatusBadge(phase.status)}</div>
              <div class="phase-progress">${phase.progress}%</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  /**
   * Preview de base de datos (para overview)
   */
  renderDatabasePreview(database) {
    const tables = Object.entries(database.tables).slice(0, 5);

    return `
      <div class="preview-list">
        ${tables.map(([key, table]) => `
          <div class="list-item ${table.status.toLowerCase()}">
            <span class="table-name">${key}</span>
            <span class="table-status">${this.getStatusBadge(table.status)}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  /**
   * VISTA: Aplicaciones - Detalle completo
   */
  renderApplications() {
    if (!this.metadata) return '<p>Cargando...</p>';

    const { applications } = this.metadata;
    const filtered = this.filterByStatus(applications);

    return `
      <div class="applications-container">
        <h2>📱 Aplicaciones del Ecosistema</h2>

        <div class="applications-grid">
          ${Object.entries(filtered).map(([key, app]) => `
            <div class="application-card ${app.status.toLowerCase()}" data-app="${key}">
              <!-- Header -->
              <div class="app-card-header">
                <div class="app-icon-large">${this.getAppIcon(app.type)}</div>
                <div class="app-title">
                  <h3>${app.name}</h3>
                  <p class="app-type">${app.type}</p>
                  ${app.platform ? `<p class="app-platform">📱 ${app.platform}</p>` : ''}
                </div>
                <div class="app-status-badge">${this.getStatusBadge(app.status)}</div>
              </div>

              <!-- Progress -->
              <div class="app-progress-section">
                <div class="progress-label">Progreso: ${app.progress}%</div>
                <div class="progress-bar-large">
                  <div class="progress-fill" style="width: ${app.progress}%; background: ${this.getProgressColor(app.progress)}"></div>
                </div>
              </div>

              <!-- Description -->
              <div class="app-description">
                <p>${app.description || 'Sin descripción'}</p>
              </div>

              <!-- Features (si existen) -->
              ${app.features ? this.renderAppFeatures(app.features) : ''}
              ${app.plannedFeatures ? this.renderPlannedFeatures(app.plannedFeatures) : ''}

              <!-- Dependencies (si existen) -->
              ${app.dependencies ? this.renderDependencies(app.dependencies) : ''}

              <!-- Known Issues (si existen) -->
              ${app.knownIssues && app.knownIssues.length > 0 ? this.renderKnownIssues(app.knownIssues) : ''}

              <!-- Actions -->
              <div class="app-actions">
                <button class="btn-view-details" data-app="${key}">
                  Ver Detalles Completos
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Features de aplicación
   */
  renderAppFeatures(features) {
    return `
      <div class="app-features">
        <h4>✅ Features Implementadas</h4>
        <ul>
          ${Object.entries(features).map(([key, feature]) => `
            <li class="${feature.done ? 'done' : feature.inProgress ? 'in-progress' : 'pending'}">
              ${feature.done ? '✅' : feature.inProgress ? '🔄' : '⏸️'}
              ${feature.name || key} (${feature.progress || 0}%)
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  },

  /**
   * Planned features de aplicación
   */
  renderPlannedFeatures(plannedFeatures) {
    return `
      <div class="app-planned-features">
        <h4>📋 Features Planificadas</h4>
        <ul>
          ${Object.entries(plannedFeatures).map(([key, feature]) => `
            <li class="planned">
              📝 ${feature.name || key}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  },

  /**
   * VISTA: Módulos - Detalle completo
   */
  renderModules() {
    if (!this.metadata) return '<p>Cargando...</p>';

    const { modules } = this.metadata;
    const filtered = this.filterByStatus(modules);

    return `
      <div class="modules-container">
        <h2>📦 Módulos Backend</h2>

        <div class="modules-grid">
          ${Object.entries(filtered).map(([key, mod]) => `
            <div class="module-card ${mod.status.toLowerCase()}" data-module="${key}">
              <!-- Header -->
              <div class="module-card-header">
                <div class="module-title">
                  <h3>${mod.name}</h3>
                  <span class="module-key">${key}</span>
                </div>
                <div class="module-status-badge">${this.getStatusBadge(mod.status)}</div>
              </div>

              <!-- Progress -->
              <div class="module-progress-section">
                <div class="progress-label">Progreso: ${mod.progress}%</div>
                <div class="progress-bar-large">
                  <div class="progress-fill" style="width: ${mod.progress}%; background: ${this.getProgressColor(mod.progress)}"></div>
                </div>
              </div>

              <!-- Description -->
              <div class="module-description">
                <p>${mod.description || 'Sin descripción'}</p>
              </div>

              <!-- Features (si existen) -->
              ${mod.features ? this.renderModuleFeatures(mod.features) : ''}

              <!-- Dependencies -->
              ${mod.dependencies ? this.renderDependencies(mod.dependencies) : ''}

              <!-- Known Issues -->
              ${mod.knownIssues && mod.knownIssues.length > 0 ? this.renderKnownIssues(mod.knownIssues) : ''}

              <!-- Design Doc -->
              ${mod.designDoc ? `
                <div class="module-design-doc">
                  <small>📄 Documentación: <code>${mod.designDoc}</code></small>
                </div>
              ` : ''}

              <!-- Last Updated -->
              <div class="module-timestamp">
                <small>Última actualización: ${new Date(mod.lastUpdated).toLocaleString('es-AR')}</small>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Features de módulo
   */
  renderModuleFeatures(features) {
    return `
      <div class="module-features">
        <h4>Features</h4>
        <ul>
          ${Object.entries(features).map(([key, feature]) => `
            <li class="${feature.done ? 'done' : feature.inProgress ? 'in-progress' : 'pending'}">
              ${feature.done ? '✅' : feature.inProgress ? '🔄' : '⏸️'}
              ${feature.name || key}
              ${feature.tested ? ' 🧪' : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  },

  /**
   * VISTA: Roadmap - Gantt charts
   */
  renderRoadmap() {
    if (!this.metadata) return '<p>Cargando...</p>';

    const { roadmap } = this.metadata;

    return `
      <div class="roadmap-container">
        <h2>🗺️ Roadmap del Proyecto</h2>

        <!-- Gantt Chart -->
        <div class="gantt-chart">
          ${Object.entries(roadmap).map(([key, phase], index) => `
            <div class="gantt-phase ${phase.status.toLowerCase()}">
              <!-- Phase Info -->
              <div class="gantt-phase-info">
                <div class="phase-number">Fase ${index + 1}</div>
                <div class="phase-details">
                  <h3>${phase.name}</h3>
                  <div class="phase-meta">
                    <span class="phase-status">${this.getStatusBadge(phase.status)}</span>
                    <span class="phase-progress">${phase.progress}% completo</span>
                    <span class="phase-tasks">${phase.tasks ? phase.tasks.filter(t => t.done).length : 0} / ${phase.tasks ? phase.tasks.length : 0} tareas</span>
                  </div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="gantt-progress">
                <div class="progress-bar-gantt">
                  <div class="progress-fill" style="width: ${phase.progress}%; background: ${this.getProgressColor(phase.progress)}"></div>
                </div>
              </div>

              <!-- Tasks -->
              ${phase.tasks ? `
                <div class="gantt-tasks">
                  <button class="btn-toggle-tasks" data-phase="${key}">
                    ${phase.tasks.length} tareas
                    <span class="toggle-icon">▼</span>
                  </button>
                  <div class="tasks-list" data-phase="${key}" style="display: none;">
                    ${phase.tasks.map(task => `
                      <div class="task-item ${task.done ? 'done' : 'pending'}">
                        <span class="task-checkbox">${task.done ? '✅' : '⏸️'}</span>
                        <span class="task-id">${task.id}</span>
                        <span class="task-name">${task.name}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Dependencies -->
              ${phase.dependencies && phase.dependencies.length > 0 ? `
                <div class="phase-dependencies">
                  <small>Depende de: ${phase.dependencies.join(', ')}</small>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- Timeline Visual -->
        <div class="timeline-visual">
          <h3>Timeline del Proyecto</h3>
          <div class="timeline-container">
            ${Object.entries(roadmap).map(([key, phase], index) => `
              <div class="timeline-phase ${phase.status.toLowerCase()}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                  <div class="timeline-date">Fase ${index + 1}</div>
                  <div class="timeline-title">${phase.name}</div>
                  <div class="timeline-progress">${phase.progress}%</div>
                </div>
                ${index < Object.keys(roadmap).length - 1 ? '<div class="timeline-connector"></div>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * VISTA: Base de Datos
   */
  renderDatabase() {
    if (!this.metadata) return '<p>Cargando...</p>';

    const { database } = this.metadata;

    return `
      <div class="database-container">
        <h2>🗄️ Base de Datos - Schema</h2>

        <!-- Stats -->
        <div class="database-stats">
          <div class="stat-item">
            <span class="stat-label">Total Tablas:</span>
            <span class="stat-value">${database.totalTables || Object.keys(database.tables).length}</span>
          </div>
        </div>

        <!-- Tablas -->
        <div class="tables-grid">
          ${Object.entries(database.tables).map(([key, table]) => `
            <div class="table-card ${table.status.toLowerCase()}">
              <!-- Header -->
              <div class="table-header">
                <h3>${key}</h3>
                <span class="table-status">${this.getStatusBadge(table.status)}</span>
              </div>

              <!-- Pending Changes (si existen) -->
              ${table.pendingChanges && table.pendingChanges.length > 0 ? `
                <div class="table-pending-changes">
                  <h4>⚠️ Cambios Pendientes:</h4>
                  <ul>
                    ${table.pendingChanges.map(change => `
                      <li>${change}</li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}

              <!-- Relations (si existen) -->
              ${table.relations && table.relations.length > 0 ? `
                <div class="table-relations">
                  <h4>🔗 Relaciones:</h4>
                  <ul>
                    ${table.relations.map(rel => `
                      <li>${rel}</li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * VISTA: Workflows
   */
  renderWorkflows() {
    if (!this.metadata) return '<p>Cargando...</p>';

    const { workflows } = this.metadata;

    return `
      <div class="workflows-container">
        <h2>🔄 Workflows del Sistema</h2>

        <div class="workflows-grid">
          ${Object.entries(workflows).map(([key, workflow]) => `
            <div class="workflow-card ${workflow.status.toLowerCase()}">
              <!-- Header -->
              <div class="workflow-header">
                <h3>${workflow.name}</h3>
                <div class="workflow-meta">
                  <span class="workflow-status">${this.getStatusBadge(workflow.status)}</span>
                  <span class="workflow-implemented">${workflow.implemented ? '✅ Implementado' : '⏸️ No Implementado'}</span>
                </div>
              </div>

              <!-- Steps -->
              ${workflow.steps ? `
                <div class="workflow-steps">
                  <h4>Pasos del Workflow:</h4>
                  <ol>
                    ${workflow.steps.map(step => `
                      <li class="${step.status ? step.status.toLowerCase() : 'pending'}">
                        <span class="step-number">Paso ${step.step}</span>
                        <span class="step-name">${step.name}</span>
                        ${step.status ? `<span class="step-status">${this.getStatusBadge(step.status)}</span>` : ''}
                      </li>
                    `).join('')}
                  </ol>
                </div>
              ` : ''}

              <!-- Database Impact (si existe) -->
              ${workflow.databaseImpact ? `
                <div class="workflow-db-impact">
                  <h4>💾 Impacto en BD:</h4>
                  <ul>
                    ${workflow.databaseImpact.map(impact => `
                      <li>${impact}</li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Dependencies
   */
  renderDependencies(deps) {
    if (!deps || Object.keys(deps).length === 0) return '';

    return `
      <div class="dependencies-section">
        <h4>🔗 Dependencias</h4>
        ${deps.required && deps.required.length > 0 ? `
          <div class="dep-required">
            <strong>Requeridas:</strong> ${deps.required.join(', ')}
          </div>
        ` : ''}
        ${deps.optional && deps.optional.length > 0 ? `
          <div class="dep-optional">
            <strong>Opcionales:</strong> ${deps.optional.join(', ')}
          </div>
        ` : ''}
        ${deps.integrates_with && deps.integrates_with.length > 0 ? `
          <div class="dep-integrates">
            <strong>Integra con:</strong> ${deps.integrates_with.join(', ')}
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * Known Issues
   */
  renderKnownIssues(issues) {
    return `
      <div class="known-issues">
        <h4>⚠️ Problemas Conocidos</h4>
        <ul>
          ${issues.map(issue => `
            <li>${issue}</li>
          `).join('')}
        </ul>
      </div>
    `;
  },

  /**
   * Dependency Graph
   */
  renderDependencyGraph() {
    // Implementación simplificada - en producción usarías una librería como D3.js
    return `
      <div class="dependency-graph-placeholder">
        <p>Grafo de dependencias (visualización con D3.js o similar)</p>
        <p>Mostraría conexiones entre módulos y sus dependencias</p>
      </div>
    `;
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Navegación entre tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        this.changeView(view);
      });
    });

    // Drill-down buttons
    document.querySelectorAll('.btn-drill-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        this.changeView(target);
      });
    });

    // Búsqueda
    const searchInput = document.getElementById('engineering-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.renderDashboard();
      });
    }

    // Filtro de estado
    const filterSelect = document.getElementById('engineering-filter-status');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterStatus = e.target.value;
        this.renderDashboard();
      });
    }

    // Refresh
    const btnRefresh = document.getElementById('btn-refresh-metadata');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        await this.refresh();
      });
    }

    // Export
    const btnExport = document.getElementById('btn-export-metadata');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.exportMetadata();
      });
    }

    // Toggle tasks en roadmap
    document.querySelectorAll('.btn-toggle-tasks').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const phase = e.currentTarget.getAttribute('data-phase');
        const tasksList = document.querySelector(`.tasks-list[data-phase="${phase}"]`);
        const icon = e.currentTarget.querySelector('.toggle-icon');

        if (tasksList.style.display === 'none') {
          tasksList.style.display = 'block';
          icon.textContent = '▲';
        } else {
          tasksList.style.display = 'none';
          icon.textContent = '▼';
        }
      });
    });
  },

  /**
   * Cambiar vista
   */
  changeView(view) {
    this.currentView = view;
    this.renderDashboard();
  },

  /**
   * Refrescar metadata
   */
  async refresh() {
    try {
      await this.loadMetadata();
      await this.loadStats();
      this.renderDashboard();
      this.setupEventListeners();
      console.log('✅ [ENGINEERING] Dashboard actualizado');
    } catch (error) {
      console.error('❌ [ENGINEERING] Error refrescando:', error);
      this.showError('Error refrescando dashboard: ' + error.message);
    }
  },

  /**
   * Exportar metadata como JSON
   */
  exportMetadata() {
    const dataStr = JSON.stringify(this.metadata, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `engineering-metadata-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Auto-refresh cada 5 minutos
   */
  startAutoRefresh() {
    setInterval(() => {
      this.refresh();
    }, 5 * 60 * 1000); // 5 minutos
  },

  /**
   * Filtrar por estado
   */
  filterByStatus(items) {
    if (this.filterStatus === 'all') return items;

    const filtered = {};
    Object.entries(items).forEach(([key, item]) => {
      if (item.status === this.filterStatus) {
        filtered[key] = item;
      }
    });

    return filtered;
  },

  /**
   * Helpers de UI
   */
  getAppIcon(type) {
    const icons = {
      'WEB_APP': '🌐',
      'MOBILE_APP': '📱',
      'LANDING_PAGE': '🏠',
      'API': '🔌'
    };
    return icons[type] || '📦';
  },

  getStatusBadge(status) {
    const badges = {
      'PLANNED': '<span class="badge badge-planned">📋 Planificado</span>',
      'IN_PROGRESS': '<span class="badge badge-in-progress">🔄 En Progreso</span>',
      'IN_MIGRATION': '<span class="badge badge-migration">🔄 En Migración</span>',
      'COMPLETE': '<span class="badge badge-complete">✅ Completo</span>',
      'PRODUCTION': '<span class="badge badge-production">🚀 En Producción</span>',
      'DESIGNED': '<span class="badge badge-designed">📐 Diseñado</span>',
      'NOT_IMPLEMENTED': '<span class="badge badge-not-implemented">⏸️ No Implementado</span>'
    };
    return badges[status] || `<span class="badge">${status}</span>`;
  },

  getProgressColor(progress) {
    if (progress >= 80) return '#10b981'; // green
    if (progress >= 50) return '#f59e0b'; // orange
    if (progress >= 20) return '#3b82f6'; // blue
    return '#6b7280'; // gray
  },

  formatPhaseName(phaseName) {
    return phaseName.replace(/_/g, ' ').replace(/phase\d+\s*/i, 'Fase ');
  },

  /**
   * Mostrar error
   */
  showError(message) {
    const container = document.getElementById('engineering-dashboard-container');
    if (container) {
      container.innerHTML = `
        <div class="error-container">
          <h2>❌ Error</h2>
          <p>${message}</p>
          <button onclick="location.reload()">Recargar Página</button>
        </div>
      `;
    }
  }
};

// NOTA: La inicialización se maneja desde panel-administrativo.html
// cuando se abre el tab 'engineering', NO se auto-inicializa aquí

// Exportar para uso global
window.EngineeringDashboard = EngineeringDashboard;
