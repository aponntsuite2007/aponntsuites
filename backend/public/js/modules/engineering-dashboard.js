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
   * Helper: Obtener status de forma segura (evita undefined.toLowerCase())
   */
  safeStatus(obj, defaultStatus = 'unknown') {
    if (!obj) return defaultStatus;
    const status = obj.status || defaultStatus;
    return typeof status === 'string' ? status.toLowerCase() : defaultStatus;
  },

  /**
   * Helper: Obtener progreso de forma segura
   */
  safeProgress(obj, defaultProgress = 0) {
    if (!obj) return defaultProgress;
    return obj.progress !== undefined ? obj.progress : defaultProgress;
  },

  /**
   * Helper: Obtener nombre de forma segura
   */
  safeName(obj, key, defaultName = 'Sin nombre') {
    if (!obj) return key || defaultName;
    return obj.name || key || defaultName;
  },

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

    // GUARDAR FOCO ACTUAL ANTES DE RENDERIZAR
    const activeElement = document.activeElement;
    const isSearchFocused = activeElement && activeElement.id === 'engineering-search';
    const searchValue = isSearchFocused ? activeElement.value : this.searchTerm;
    const cursorPosition = isSearchFocused ? activeElement.selectionStart : 0;

    try {
      // RENDERIZAR INMEDIATAMENTE sin setTimeout
      container.innerHTML = `
        <!-- CSS para tabs claros del Engineering Dashboard -->
        <style>
          .navigation-tabs {
            display: flex;
            background: #f8f9fa !important;
            border-radius: 8px;
            overflow-x: auto;
            padding: 5px;
            margin-bottom: 20px;
            gap: 5px;
          }
          .navigation-tabs .nav-tab {
            flex: 0 0 auto;
            min-width: 140px;
            padding: 12px 20px !important;
            background: white !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 6px !important;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
            color: #374151 !important;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .navigation-tabs .nav-tab:hover {
            background: #f3f4f6 !important;
            border-color: #3b82f6 !important;
          }
          .navigation-tabs .nav-tab.active {
            background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
            color: white !important;
            border-color: #3b82f6 !important;
          }
          .navigation-tabs .tab-icon {
            font-size: 1.2em;
          }
          .navigation-tabs .tab-label {
            font-size: 0.9rem;
          }
        </style>

        <div style="padding: 20px !important; background: white !important; min-height: 600px !important; position: relative !important;">
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

      // Re-configurar event listeners después de re-renderizar
      setTimeout(() => {
        this.setupEventListeners();

        // RESTAURAR FOCO AL INPUT DE BÚSQUEDA SI ESTABA ENFOCADO
        if (isSearchFocused) {
          const searchInput = document.getElementById('engineering-search');
          if (searchInput) {
            searchInput.value = searchValue;
            searchInput.focus();
            searchInput.setSelectionRange(cursorPosition, cursorPosition);
            console.log('✅ [ENGINEERING] Foco restaurado al buscador');
          }
        }

        console.log('✅ [ENGINEERING] Event listeners reconfigurados');
      }, 100);

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

        <!-- Panel de Sincronización de Sesiones -->
        <div class="sync-panel" style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 20px;">🔄</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #1e40af; margin-bottom: 5px;">Session Coordination System</div>
              <div id="sync-status-text" style="font-size: 0.9rem; color: #6b7280;">
                Actualización manual - Usa 🔄 Refresh para ver cambios
              </div>
            </div>
            <div id="session-indicators" style="display: flex; gap: 10px;">
              <!-- Se llenará dinámicamente -->
            </div>
          </div>
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
          <button class="btn-llm-context" id="btn-regenerate-llm-context" title="Regenerar llm-context.json para IAs">
            🤖 Regenerar LLM Context
          </button>
          <button class="btn-ultimate-test" id="btn-ultimate-test" title="Ejecutar ULTIMATE TEST - Batería completa integrada">
            🚀 ULTIMATE TEST
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
      { id: 'system-health', icon: '🧠', label: 'Salud del Sistema' },
      { id: 'commercial-modules', icon: '💰', label: 'Módulos Comerciales' },
      { id: 'applications', icon: '📱', label: 'Aplicaciones' },
      { id: 'modules', icon: '📦', label: 'Módulos Técnicos' },
      { id: 'backend-files', icon: '⚙️', label: 'Archivos Backend' },
      { id: 'frontend-files', icon: '🎨', label: 'Archivos Frontend' },
      { id: 'roadmap', icon: '🗺️', label: 'Roadmap' },
      { id: 'critical-path', icon: '🎯', label: 'Camino Crítico (CPM)' },
      { id: 'organigrama', icon: '🏢', label: 'Organigrama' },
      { id: 'database', icon: '🗄️', label: 'Base de Datos' },
      { id: 'workflows', icon: '🔄', label: 'Workflows' },
      { id: 'auto-healing', icon: '🔧', label: 'Auto-Healing' },
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
      case 'system-health':
        // Cargar salud del sistema dinámicamente
        setTimeout(() => this.loadSystemHealthView(), 100);
        return `
          <div id="system-health-dynamic" style="padding: 20px;">
            <div style="text-align: center; padding: 50px;">
              <div style="font-size: 64px; margin-bottom: 20px;">🧠</div>
              <h2 style="color: #374151;">Cargando Estado del Sistema...</h2>
              <p style="color: #6b7280;">Obteniendo datos del Brain Orchestrator</p>
            </div>
          </div>
        `;
      case 'commercial-modules':
        // Cargar módulos comerciales dinámicamente
        setTimeout(() => this.loadCommercialModulesView(), 100);
        return `
          <div id="commercial-modules-dynamic" style="padding: 20px;">
            <div style="text-align: center; padding: 50px;">
              <div style="font-size: 64px; margin-bottom: 20px;">💰</div>
              <h2 style="color: #374151;">Cargando Módulos Comerciales...</h2>
              <p style="color: #6b7280;">Obteniendo datos del Single Source of Truth</p>
            </div>
          </div>
        `;
      case 'applications':
        return this.renderApplications();
      case 'modules':
        return this.renderModules();
      case 'backend-files':
        return this.renderBackendFiles();
      case 'frontend-files':
        return this.renderFrontendFiles();
      case 'roadmap':
        return this.renderRoadmap();
      case 'critical-path':
        // Critical Path es async, cargar dinámicamente DESPUÉS de que el DOM esté listo
        setTimeout(() => this.loadCriticalPathView(), 100);
        return `
          <div id="critical-path-dynamic" style="padding: 20px;">
            <div style="text-align: center; padding: 50px;">
              <div style="font-size: 64px; margin-bottom: 20px;">🎯</div>
              <h2 style="color: #374151;">Cargando Camino Crítico...</h2>
              <p style="color: #6b7280;">Analizando tareas y calculando rutas críticas</p>
            </div>
          </div>
        `;
      case 'organigrama':
        return this.renderOrganigrama();
      case 'database':
        return this.renderDatabase();
      case 'workflows':
        setTimeout(() => this.loadWorkflowsFromBrain(), 100);
        return this.renderWorkflows();
      case 'auto-healing':
        // Inicializar Auto-Healing Dashboard si está disponible
        setTimeout(() => {
          if (window.AutoHealingDashboard && typeof window.AutoHealingDashboard.render === 'function') {
            window.AutoHealingDashboard.render();
          }
        }, 100);
        return `
          <div id="auto-healing-container" style="padding: 20px;">
            <div style="text-align: center; padding: 50px;">
              <div style="font-size: 64px; margin-bottom: 20px;">🔧</div>
              <h2 style="color: #374151;">Sistema de Auto-Healing</h2>
              <p style="color: #6b7280;">Cargando dashboard...</p>
            </div>
          </div>
        `;
      default:
        return '<p>Vista no encontrada</p>';
    }
  },

  /**
   * VISTA: Backend Files - Todos los archivos/módulos de backend (DINÁMICO)
   * Con sub-tabs: Archivos | Deploy
   */
  renderBackendFiles() {
    // Cargar archivos dinámicamente y renderizar
    this.loadAndRenderFiles('backend');

    return `
      <div class="backend-files-container" style="padding: 20px;">
        <div style="margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; color: #374151; display: flex; align-items: center; gap: 10px;">
            <span>⚙️</span>
            <span>Archivos Backend</span>
          </h2>
        </div>

        <!-- Sub-tabs de Backend -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          <button onclick="window.EngineeringDashboard.switchBackendSubTab('files')" id="backend-subtab-files"
            class="backend-subtab active"
            style="padding: 10px 20px; border: none; background: #3b82f6; color: white; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500;">
            📂 Archivos
          </button>
          <button onclick="window.EngineeringDashboard.switchBackendSubTab('deploy')" id="backend-subtab-deploy"
            class="backend-subtab"
            style="padding: 10px 20px; border: none; background: #e5e7eb; color: #374151; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500;">
            🚀 Deploy a Render
          </button>
        </div>

        <!-- Contenido Archivos (default) -->
        <div id="backend-content-files">
          <div id="backend-files-dynamic">
            <div style="text-align: center; padding: 50px;">
              <div style="font-size: 64px; margin-bottom: 20px;">⚙️</div>
              <div style="font-size: 18px; color: #6b7280;">Escaneando todos los archivos .js del proyecto...</div>
              <div style="margin-top: 15px; color: #3b82f6;">Esto puede tardar unos segundos</div>
            </div>
          </div>
        </div>

        <!-- Contenido Deploy (hidden by default) -->
        <div id="backend-content-deploy" style="display: none;"></div>
      </div>
    `;
  },

  /**
   * Switch entre sub-tabs de Backend
   */
  switchBackendSubTab(tabId) {
    // Ocultar todos los contenidos
    document.getElementById('backend-content-files').style.display = 'none';
    document.getElementById('backend-content-deploy').style.display = 'none';

    // Desactivar todos los tabs
    document.getElementById('backend-subtab-files').style.background = '#e5e7eb';
    document.getElementById('backend-subtab-files').style.color = '#374151';
    document.getElementById('backend-subtab-deploy').style.background = '#e5e7eb';
    document.getElementById('backend-subtab-deploy').style.color = '#374151';

    // Activar el tab seleccionado
    const activeTab = document.getElementById(`backend-subtab-${tabId}`);
    activeTab.style.background = '#3b82f6';
    activeTab.style.color = 'white';

    // Mostrar contenido correspondiente
    const content = document.getElementById(`backend-content-${tabId}`);
    content.style.display = 'block';

    // Si es deploy, renderizar el módulo DeploymentSync
    if (tabId === 'deploy') {
      if (typeof DeploymentSync !== 'undefined') {
        DeploymentSync.render(content, 'backend');
      } else {
        content.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #6b7280;">
            <p>⏳ Cargando módulo de deployment...</p>
            <p style="font-size: 12px; margin-top: 10px;">Si no carga, verifique que deployment-sync.js esté incluido</p>
          </div>
        `;
        // Intentar cargar el script dinámicamente
        const script = document.createElement('script');
        script.src = '/js/modules/deployment-sync.js';
        script.onload = () => {
          if (typeof DeploymentSync !== 'undefined') {
            DeploymentSync.render(content, 'backend');
          }
        };
        document.head.appendChild(script);
      }
    }
  },

  /**
   * VISTA: Frontend Files - Todos los archivos/módulos de frontend (DINÁMICO)
   * Con sub-tabs: Archivos | APK Management
   */
  renderFrontendFiles() {
    // Cargar archivos dinámicamente y renderizar
    this.loadAndRenderFiles('frontend');

    return `
      <div class="frontend-files-container" style="padding: 20px;">
        <div style="margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; color: #374151; display: flex; align-items: center; gap: 10px;">
            <span>🎨</span>
            <span>Archivos Frontend</span>
          </h2>
        </div>

        <!-- Sub-tabs de Frontend -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          <button onclick="window.EngineeringDashboard.switchFrontendSubTab('files')" id="frontend-subtab-files"
            class="frontend-subtab active"
            style="padding: 10px 20px; border: none; background: #10b981; color: white; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500;">
            📂 Archivos
          </button>
          <button onclick="window.EngineeringDashboard.switchFrontendSubTab('apk')" id="frontend-subtab-apk"
            class="frontend-subtab"
            style="padding: 10px 20px; border: none; background: #e5e7eb; color: #374151; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500;">
            📱 APK Management
          </button>
        </div>

        <!-- Contenido Archivos (default) -->
        <div id="frontend-content-files">
          <div id="frontend-files-dynamic">
            <div style="text-align: center; padding: 50px;">
              <div style="font-size: 64px; margin-bottom: 20px;">🎨</div>
              <div style="font-size: 18px; color: #6b7280;">Escaneando todos los archivos .js del frontend...</div>
              <div style="margin-top: 15px; color: #10b981;">Esto puede tardar unos segundos</div>
            </div>
          </div>
        </div>

        <!-- Contenido APK (hidden by default) -->
        <div id="frontend-content-apk" style="display: none;"></div>
      </div>
    `;
  },

  /**
   * Switch entre sub-tabs de Frontend
   */
  switchFrontendSubTab(tabId) {
    // Ocultar todos los contenidos
    document.getElementById('frontend-content-files').style.display = 'none';
    document.getElementById('frontend-content-apk').style.display = 'none';

    // Desactivar todos los tabs
    document.getElementById('frontend-subtab-files').style.background = '#e5e7eb';
    document.getElementById('frontend-subtab-files').style.color = '#374151';
    document.getElementById('frontend-subtab-apk').style.background = '#e5e7eb';
    document.getElementById('frontend-subtab-apk').style.color = '#374151';

    // Activar el tab seleccionado
    const activeTab = document.getElementById(`frontend-subtab-${tabId}`);
    activeTab.style.background = '#10b981';
    activeTab.style.color = 'white';

    // Mostrar contenido correspondiente
    const content = document.getElementById(`frontend-content-${tabId}`);
    content.style.display = 'block';

    // Si es apk, renderizar el módulo DeploymentSync en modo APK
    if (tabId === 'apk') {
      if (typeof DeploymentSync !== 'undefined') {
        DeploymentSync.render(content, 'apk');
      } else {
        content.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #6b7280;">
            <p>⏳ Cargando módulo de APK management...</p>
            <p style="font-size: 12px; margin-top: 10px;">Si no carga, verifique que deployment-sync.js esté incluido</p>
          </div>
        `;
        // Intentar cargar el script dinámicamente
        const script = document.createElement('script');
        script.src = '/js/modules/deployment-sync.js';
        script.onload = () => {
          if (typeof DeploymentSync !== 'undefined') {
            DeploymentSync.render(content, 'apk');
          }
        };
        document.head.appendChild(script);
      }
    }
  },

  /**
   * MÉTODO HELPER: Carga archivos dinámicamente desde API y renderiza AGRUPADOS POR MÓDULO
   * @param {string} type - 'backend' o 'frontend'
   */
  async loadAndRenderFiles(type) {
    try {
      // Fetch files from API
      const response = await fetch(`/api/engineering/scan-files?type=${type}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error al escanear archivos: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido');
      }

      const modules = result.data[type] || [];
      const totalModules = modules.length;
      const totalFiles = result.data[`total${type.charAt(0).toUpperCase() + type.slice(1)}`] || 0;

      // Generar HTML agrupado por módulos
      const gridHtml = `
        <div class="${type}-files-container">
          <h2>${type === 'backend' ? '⚙️' : '🎨'} Archivos ${type === 'backend' ? 'Backend' : 'Frontend'}</h2>

          <div style="background: linear-gradient(135deg, ${type === 'backend' ? '#eff6ff' : '#d1fae5'} 0%, ${type === 'backend' ? '#dbeafe' : '#a7f3d0'} 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-around; text-align: center;">
              <div>
                <div style="font-size: 32px; font-weight: 700; color: ${type === 'backend' ? '#1e40af' : '#059669'};">${totalModules}</div>
                <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Módulos</div>
              </div>
              <div>
                <div style="font-size: 32px; font-weight: 700; color: ${type === 'backend' ? '#1e40af' : '#059669'};">${totalFiles}</div>
                <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Archivos</div>
              </div>
            </div>
          </div>

          <div style="background: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 8px; margin-bottom: 25px;">
            <p style="margin: 0; color: #1e40af; font-weight: 600;">💡 Archivos organizados por módulo. Click en "Ver Código" para abrir en sub-modal.</p>
          </div>

          ${modules.map((module, moduleIndex) => `
            <!-- Módulo ${module.moduleName} -->
            <div class="module-section" style="margin-bottom: 40px;">
              <div style="background: linear-gradient(135deg, ${type === 'backend' ? '#3b82f6' : '#10b981'} 0%, ${type === 'backend' ? '#1e40af' : '#059669'} 100%); color: white; padding: 15px 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin: 0; font-size: 18px; font-weight: 700;">
                  📦 ${module.moduleName}
                </h3>
                <div style="background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                  ${module.files.length} archivo${module.files.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div class="${type}-files-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 15px; padding: 20px; background: #f9fafb; border-radius: 0 0 12px 12px; border: 2px solid ${type === 'backend' ? '#3b82f6' : '#10b981'}; border-top: none;">
                ${module.files.map((file, fileIndex) => `
                  <div class="${type}-file-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; position: relative;" data-file-index="${moduleIndex}-${fileIndex}">

                    <!-- Icono + Archivo -->
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                      <div style="font-size: 24px;">${file.name.endsWith('.html') ? '🌐' : '📄'}</div>
                      <div style="flex: 1;">
                        <div style="font-family: 'Courier New', monospace; color: ${type === 'backend' ? '#1e40af' : '#059669'}; font-weight: 700; font-size: 13px; word-break: break-all;">
                          ${file.name}
                        </div>
                        <div style="color: #f59e0b; background: #fef3c7; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block; margin-top: 4px;">
                          ${file.lines} líneas
                        </div>
                      </div>
                    </div>

                    <!-- Path completo -->
                    <div style="color: #6b7280; font-size: 10px; font-family: 'Courier New', monospace; margin-bottom: 12px; background: #f3f4f6; padding: 6px 8px; border-radius: 4px; word-break: break-all; max-height: 40px; overflow: hidden; text-overflow: ellipsis;" title="${file.file}">
                      ${file.file}
                    </div>

                    <!-- Botón para ver código -->
                    <button class="btn-view-code" data-file-path="${file.file}" data-lines="1-${file.lines}" style="width: 100%; padding: 8px; background: linear-gradient(135deg, ${type === 'backend' ? '#3b82f6' : '#10b981'} 0%, ${type === 'backend' ? '#1e40af' : '#059669'} 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
                      👁️ Ver Código
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Update DOM
      const container = document.getElementById(`${type}-files-dynamic`);
      if (container) {
        container.innerHTML = gridHtml;

        // Re-attach event listeners to "Ver Código" buttons
        this.setupEventListeners();
      }

    } catch (error) {
      console.error(`Error cargando archivos ${type}:`, error);

      const container = document.getElementById(`${type}-files-dynamic`);
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 50px;">
            <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
            <div style="font-size: 18px; color: #ef4444;">Error al cargar archivos</div>
            <div style="margin-top: 15px; color: #6b7280;">${error.message}</div>
          </div>
        `;
      }
    }
  },

  /**
   * VISTA: Overview - Arquitectura global en 3D/cubo
   */
  renderOverview() {
    if (!this.metadata) return '<p>Cargando...</p>';

    // Validar que existan las propiedades necesarias
    const applications = this.metadata.applications || {};
    const modules = this.metadata.modules || {};
    const roadmap = this.metadata.roadmap || {};
    const database = this.metadata.database || { tables: {}, schema: {} };

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
              <h3>🗄️ Base de Datos (${Object.keys(database.tables || database.schema || {}).length} tablas)</h3>
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

    if (apps.length === 0) {
      return '<div class="preview-grid"><p style="color: #6b7280; text-align: center;">Sin aplicaciones</p></div>';
    }

    return `
      <div class="preview-grid">
        ${apps.map(([key, app]) => {
          const status = this.safeStatus(app, 'production');
          const progress = this.safeProgress(app, 100);
          const name = this.safeName(app, key);
          return `
          <div class="preview-card ${status}">
            <div class="app-icon">${this.getAppIcon(app?.type)}</div>
            <div class="app-name">${name}</div>
            <div class="app-status">${this.getStatusBadge(app?.status || 'PRODUCTION')}</div>
            <div class="app-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
              <span class="progress-text">${progress}%</span>
            </div>
          </div>
        `}).join('')}
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
        ${mods.map(([key, mod]) => {
          // Protección: usar valores por defecto si faltan
          const status = mod.status || 'PRODUCTION';
          const progress = mod.progress !== undefined ? mod.progress : 100;
          const name = mod.name || key;
          return `
          <div class="preview-card ${status.toLowerCase()}">
            <div class="module-name">${name}</div>
            <div class="module-status">${this.getStatusBadge(status)}</div>
            <div class="module-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
              <span class="progress-text">${progress}%</span>
            </div>
          </div>
        `}).join('')}
        ${total > 4 ? `<div class="preview-more">+${total - 4} más</div>` : ''}
      </div>
    `;
  },

  /**
   * Preview de roadmap (para overview)
   */
  renderRoadmapPreview(roadmap) {
    const phases = Object.entries(roadmap).slice(0, 3);

    if (phases.length === 0) {
      return '<div class="preview-timeline"><p style="color: #6b7280; text-align: center;">Sin fases en roadmap</p></div>';
    }

    return `
      <div class="preview-timeline">
        ${phases.map(([key, phase]) => {
          // Protección: usar valores por defecto si faltan
          const status = phase.status || 'IN_PROGRESS';
          const progress = phase.progress !== undefined ? phase.progress : 0;
          const name = phase.name || key;
          return `
          <div class="timeline-item ${status.toLowerCase()}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="phase-name">${name}</div>
              <div class="phase-status">${this.getStatusBadge(status)}</div>
              <div class="phase-progress">${progress}%</div>
            </div>
          </div>
        `}).join('')}
      </div>
    `;
  },

  /**
   * Preview de base de datos (para overview)
   */
  renderDatabasePreview(database) {
    const tablesSource = database?.tables || database?.schema || {};
    const tables = Object.entries(tablesSource).slice(0, 5);

    if (tables.length === 0) {
      return '<div class="preview-list"><p style="color: #6b7280; text-align: center;">Sin datos de BD</p></div>';
    }

    return `
      <div class="preview-list">
        ${tables.map(([key, table]) => `
          <div class="list-item ${(table?.status || 'unknown').toLowerCase()}">
            <span class="table-name">${key}</span>
            <span class="table-status">${this.getStatusBadge(table?.status || 'UNKNOWN')}</span>
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
            <div class="application-card ${(app.status || 'unknown').toLowerCase()}" data-app="${key}">
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
            <div class="module-card ${(mod.status || 'unknown').toLowerCase()}" data-module="${key}">
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

              <!-- Code Location (Backend + Frontend) -->
              ${mod.codeLocation ? this.renderCodeLocation(mod.codeLocation) : ''}

              <!-- Botón Ver Detalles Completos -->
              <div class="module-actions" style="margin: 15px 0;">
                <button class="btn-view-details" data-module="${key}" style="width: 100%; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease;">
                  Ver Detalles Completos
                </button>
              </div>

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
   * Renderizar ubicación de código (Backend + Frontend)
   */
  renderCodeLocation(codeLocation) {
    if (!codeLocation || (!codeLocation.backend && !codeLocation.frontend)) return '';

    return `
      <div class="code-location-section" style="margin: 15px 0; padding: 15px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1e40af;">📍 Ubicación del Código</h4>

        ${codeLocation.backend && codeLocation.backend.length > 0 ? `
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 6px;">🔹 Backend (Bk):</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${codeLocation.backend.map(file => `
                <div style="background: white; padding: 8px; border-radius: 4px; font-size: 12px; border-left: 3px solid #3b82f6;">
                  <div style="font-family: 'Courier New', monospace; color: #1e40af; font-weight: 600;">
                    ${file.file} <span style="color: #f59e0b;">(${file.lines})</span>
                  </div>
                  <div style="color: #6b7280; font-size: 11px; margin-top: 3px;">${file.description}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${codeLocation.frontend && codeLocation.frontend.length > 0 ? `
          <div>
            <div style="font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 6px;">🔹 Frontend (Fe):</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${codeLocation.frontend.map(file => `
                <div style="background: white; padding: 8px; border-radius: 4px; font-size: 12px; border-left: 3px solid #10b981;">
                  <div style="font-family: 'Courier New', monospace; color: #059669; font-weight: 600;">
                    ${file.file} <span style="color: #f59e0b;">(${file.lines})</span>
                  </div>
                  <div style="color: #6b7280; font-size: 11px; margin-top: 3px;">${file.description}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
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
            <div class="gantt-phase ${(phase.status || 'unknown').toLowerCase()}">
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
                <div class="gantt-tasks" style="margin-top: 15px;">
                  <button onclick="window.EngineeringDashboard.toggleRoadmapTasks('${key}')" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                    <span>📋</span>
                    <span>${phase.tasks.filter(t => t.done).length}/${phase.tasks.length} tareas</span>
                    <span id="toggle-icon-${key}" style="margin-left: 5px; transition: transform 0.2s;">▼</span>
                  </button>
                  <div id="tasks-list-${key}" style="display: none; margin-top: 10px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    ${phase.tasks.map(task => `
                      <div class="task-item ${task.done ? 'done' : 'pending'}" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin-bottom: 6px; background: ${task.done ? '#f0fdf4' : 'white'}; border-radius: 6px; border-left: 3px solid ${task.done ? '#22c55e' : '#f59e0b'}; transition: all 0.2s;">
                        <span class="task-checkbox" style="font-size: 16px;">${task.done ? '✅' : '⏳'}</span>
                        <span class="task-id" style="font-weight: 600; color: ${task.done ? '#166534' : '#92400e'}; min-width: 60px;">${task.id}</span>
                        <span class="task-name" style="flex: 1; ${task.done ? 'text-decoration: line-through; color: #6b7280;' : 'color: #374151;'}">${task.name}</span>
                        ${task.assignedTo ? `<span style="font-size: 11px; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px;">👤 ${task.assignedTo}</span>` : ''}
                        ${task.completedDate ? `<span style="font-size: 11px; color: #059669;">📅 ${task.completedDate}</span>` : ''}
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
              <div class="timeline-phase ${(phase.status || 'unknown').toLowerCase()}">
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
   * VISTA: Base de Datos - Schema Completo con Campos y Módulos
   * Para coordinar múltiples sesiones de Claude Code sin interferencias
   */
  renderDatabase() {
    if (!this.metadata) return '<p>Cargando...</p>';

    const { database } = this.metadata;

    // Usar schema si existe, sino usar tables
    const schema = database.schema || database.tables || {};
    const totalTables = Object.keys(schema).length;
    const totalFields = Object.values(schema).reduce((sum, t) => sum + (t.fields?.length || 0), 0);

    return `
      <div class="database-container" style="padding: 20px;">
        <div style="margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; color: #374151; display: flex; align-items: center; gap: 10px;">
            <span>🗄️</span>
            <span>Base de Datos</span>
          </h2>
        </div>

        <!-- Sub-tabs de Base de Datos -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          <button onclick="window.EngineeringDashboard.switchDbSubTab('schema')" id="db-subtab-schema"
            class="db-subtab active"
            style="padding: 10px 20px; border: none; background: #3b82f6; color: white; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500;">
            📋 Schema Coordinado
          </button>
          <button onclick="window.EngineeringDashboard.switchDbSubTab('sync')" id="db-subtab-sync"
            class="db-subtab"
            style="padding: 10px 20px; border: none; background: #e5e7eb; color: #374151; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 500;">
            🔄 Sincronización
          </button>
        </div>

        <!-- Contenido Schema (default) -->
        <div id="db-content-schema">
          <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">
            ⚠️ <strong>IMPORTANTE:</strong> Antes de modificar cualquier campo, verificar qué módulos lo usan para no romper funcionalidad.
          </p>

        <!-- Stats -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">📊 Total Tablas</div>
            <div style="font-size: 32px; font-weight: 700;">${totalTables}</div>
          </div>
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">🔧 Total Campos</div>
            <div style="font-size: 32px; font-weight: 700;">${totalFields}</div>
          </div>
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2);">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">⚠️ Reglas de Seguridad</div>
            <div style="font-size: 32px; font-weight: 700;">${database.modificationRules?.length || 0}</div>
          </div>
        </div>

        <!-- Buscador -->
        <div style="margin-bottom: 20px;">
          <input type="text" id="db-search" placeholder="🔍 Buscar tabla o campo..."
            style="width: 100%; max-width: 400px; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;"
            onkeyup="window.EngineeringDashboard.filterDatabaseTables(this.value)">
        </div>

        <!-- Tablas con campos expandidos -->
        <div id="database-tables" style="display: flex; flex-direction: column; gap: 15px;">
          ${Object.entries(schema).map(([tableName, table]) => `
            <div class="db-table-card" data-table="${tableName}" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: all 0.2s;">
              <!-- Header de tabla -->
              <div class="db-table-header" onclick="window.EngineeringDashboard.toggleTableFields('${tableName}')"
                style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #f8fafc; cursor: pointer; border-bottom: 1px solid #e5e7eb; transition: background 0.2s;"
                onmouseenter="this.style.background='#f1f5f9'" onmouseleave="this.style.background='#f8fafc'">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-size: 20px;">📋</span>
                  <div>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #374151;">${tableName}</h3>
                    <span style="font-size: 12px; color: #6b7280;">${table.fields?.length || 0} campos</span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  ${table.fields?.some(f => f.usedBy?.length > 5) ?
                    '<span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">⚠️ Alta dependencia</span>' : ''}
                  <span class="toggle-arrow" data-table="${tableName}" style="font-size: 18px; transition: transform 0.2s;">▼</span>
                </div>
              </div>

              <!-- Campos de la tabla (expandibles) -->
              <div class="db-fields-list" data-table="${tableName}" style="display: none; padding: 0;">
                ${table.fields?.map((field, idx) => `
                  <div class="db-field-row" style="display: flex; align-items: flex-start; gap: 15px; padding: 12px 20px; border-bottom: 1px solid #f3f4f6; ${idx % 2 === 0 ? 'background: #fafafa;' : 'background: white;'}">
                    <!-- Nombre y tipo -->
                    <div style="flex: 0 0 200px;">
                      <div style="font-weight: 600; color: #374151; font-size: 14px;">${field.name}</div>
                      <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">
                        <span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${field.type}</span>
                        ${field.nullable === false ? '<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">NOT NULL</span>' : ''}
                      </div>
                    </div>

                    <!-- Módulos que lo usan -->
                    <div style="flex: 1;">
                      <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Usado por ${field.usedBy?.length || 0} módulos:</div>
                      <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${(field.usedBy || []).slice(0, 10).map(mod => `
                          <span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 10px; font-size: 11px;">${mod}</span>
                        `).join('')}
                        ${(field.usedBy?.length || 0) > 10 ? `<span style="color: #6b7280; font-size: 11px;">+${field.usedBy.length - 10} más</span>` : ''}
                      </div>
                    </div>

                    <!-- Indicador de riesgo -->
                    <div style="flex: 0 0 80px; text-align: right;">
                      ${(field.usedBy?.length || 0) > 10 ?
                        '<span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">CRÍTICO</span>' :
                        (field.usedBy?.length || 0) > 5 ?
                        '<span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">CUIDADO</span>' :
                        '<span style="background: #22c55e; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">SEGURO</span>'}
                    </div>
                  </div>
                `).join('') || '<div style="padding: 20px; color: #6b7280; text-align: center;">Sin campos definidos</div>'}
              </div>
            </div>
          `).join('')}
        </div>
        </div>

        <!-- Contenido Sincronización (hidden by default) -->
        <div id="db-content-sync" style="display: none;"></div>
      </div>
    `;
  },

  /**
   * Switch entre sub-tabs de Base de Datos
   */
  switchDbSubTab(tabId) {
    // Ocultar todos los contenidos
    document.getElementById('db-content-schema').style.display = 'none';
    document.getElementById('db-content-sync').style.display = 'none';

    // Desactivar todos los tabs
    document.getElementById('db-subtab-schema').style.background = '#e5e7eb';
    document.getElementById('db-subtab-schema').style.color = '#374151';
    document.getElementById('db-subtab-sync').style.background = '#e5e7eb';
    document.getElementById('db-subtab-sync').style.color = '#374151';

    // Activar el tab seleccionado
    const activeTab = document.getElementById(`db-subtab-${tabId}`);
    activeTab.style.background = '#3b82f6';
    activeTab.style.color = 'white';

    // Mostrar contenido correspondiente
    const content = document.getElementById(`db-content-${tabId}`);
    content.style.display = 'block';

    // Si es sync, renderizar el módulo DatabaseSync
    if (tabId === 'sync') {
      if (typeof DatabaseSync !== 'undefined') {
        DatabaseSync.render(content);
      } else {
        content.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #6b7280;">
            <p>⏳ Cargando módulo de sincronización...</p>
            <p style="font-size: 12px; margin-top: 10px;">Si no carga, verifique que database-sync.js esté incluido</p>
          </div>
        `;
        // Intentar cargar el script dinámicamente
        const script = document.createElement('script');
        script.src = '/js/modules/database-sync.js';
        script.onload = () => {
          if (typeof DatabaseSync !== 'undefined') {
            DatabaseSync.render(content);
          }
        };
        document.head.appendChild(script);
      }
    }
  },

  /**
   * Toggle campos de una tabla en la vista de BD
   */
  toggleTableFields(tableName) {
    const fieldsList = document.querySelector(`.db-fields-list[data-table="${tableName}"]`);
    const arrow = document.querySelector(`.toggle-arrow[data-table="${tableName}"]`);

    if (fieldsList && arrow) {
      if (fieldsList.style.display === 'none') {
        fieldsList.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
      } else {
        fieldsList.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
      }
    }
  },

  /**
   * Toggle tareas del roadmap
   */
  toggleRoadmapTasks(phaseKey) {
    const tasksList = document.getElementById(`tasks-list-${phaseKey}`);
    const icon = document.getElementById(`toggle-icon-${phaseKey}`);

    if (tasksList && icon) {
      if (tasksList.style.display === 'none') {
        tasksList.style.display = 'block';
        icon.textContent = '▲';
      } else {
        tasksList.style.display = 'none';
        icon.textContent = '▼';
      }
    }
  },

  /**
   * Forzar liberación de una tarea específica
   */
  async forceReleaseTask(taskId) {
    if (!confirm(`⚠️ ¿Estás seguro de forzar la liberación de la tarea "${taskId}"?\n\nEsto liberará todos los locks de archivos y tablas asociados.`)) {
      return;
    }

    try {
      const response = await fetch('/api/coordination/force-release-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Tarea "${taskId}" liberada exitosamente.\n\nPropietario anterior: ${result.previousOwner}`);
        // Recargar la vista de camino crítico
        this.loadCriticalPathView();
      } else {
        alert(`❌ Error liberando tarea: ${result.error}`);
      }
    } catch (error) {
      console.error('Error forzando liberación de tarea:', error);
      alert(`❌ Error de conexión: ${error.message}`);
    }
  },

  /**
   * Liberar tarea - Alias de forceReleaseTask para uso desde las tarjetas
   */
  async releaseTask(taskId) {
    return this.forceReleaseTask(taskId);
  },

  /**
   * Copiar instrucciones de cierre de tarea para Claude
   * El usuario solo pega esto en la sesión de Claude y Claude ejecuta automáticamente
   */
  async copyCloseInstructions(taskId, phaseKey, taskName) {
    const today = new Date().toISOString().split('T')[0];

    const instructions = `TAREA COMPLETADA - ACTUALIZAR ENGINEERING METADATA

════════════════════════════════════════════════════════════════
📋 TAREA: ${taskId} - ${taskName}
📁 FASE: ${phaseKey}
📅 FECHA: ${today}
════════════════════════════════════════════════════════════════

EJECUTA ESTOS PASOS EXACTOS:

1. ABRIR el archivo: backend/engineering-metadata.js

2. BUSCAR en roadmap.${phaseKey}.tasks la tarea con id: "${taskId}"

3. CAMBIAR estos campos:
   - done: false  →  done: true
   - Agregar: completedDate: "${today}"

4. RECALCULAR el progress de la fase:
   - Contar cuántas tareas tienen done: true
   - Dividir por el total de tareas
   - Multiplicar por 100
   - Actualizar el campo progress de la fase

5. SI todas las tareas de la fase están done: true:
   - Cambiar status: "IN_PROGRESS" → status: "COMPLETE"
   - Agregar completionDate: "${today}"

6. GUARDAR el archivo

7. CONFIRMAR los cambios ejecutando:
   curl -X POST http://localhost:9998/api/task-intelligence/complete -H "Content-Type: application/json" -d '{"taskId": "${taskId}", "phaseKey": "${phaseKey}", "completedBy": "claude-code"}'

════════════════════════════════════════════════════════════════
⚠️ EJECUTA ESTOS CAMBIOS AHORA. NO PREGUNTES, SOLO HAZLO.
════════════════════════════════════════════════════════════════`;

    try {
      await navigator.clipboard.writeText(instructions);
      alert('✅ Instrucciones copiadas al portapapeles\\n\\nPega esto en la sesión de Claude para que actualice la tarea automáticamente.');
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = instructions;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('✅ Instrucciones copiadas al portapapeles\\n\\nPega esto en la sesión de Claude para que actualice la tarea automáticamente.');
    }
  },

  /**
   * Forzar cierre de sesión completa
   */
  async forceReleaseSession(token) {
    if (!confirm(`⚠️ ¿Estás seguro de cerrar la sesión "${token}"?\n\nEsto liberará TODAS las tareas y locks asociados a esta sesión.`)) {
      return;
    }

    try {
      const response = await fetch('/api/coordination/force-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenToRelease: token })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Sesión "${token}" cerrada exitosamente.\n\nLocks liberados: ${result.releasedLocks || 0}`);
        this.loadCriticalPathView();
      } else {
        alert(`❌ Error cerrando sesión: ${result.error}`);
      }
    } catch (error) {
      console.error('Error forzando cierre de sesión:', error);
      alert(`❌ Error de conexión: ${error.message}`);
    }
  },

  /**
   * Asignar tarea a Claude Code - Modal completo con toda la info
   * @param {string} taskId - ID de la tarea (ej: "MOB-1")
   * @param {string} phaseKey - Key de la fase (ej: "phase5_mobileApps")
   * @param {string} taskNameParam - Nombre de la tarea (opcional, se pasa desde el botón)
   */
  async assignToClaude(taskId, phaseKey, taskNameParam = null) {
    // Remover modal anterior si existe
    const existing = document.getElementById('claude-assignment-modal');
    if (existing) existing.remove();

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.id = 'claude-assignment-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:99999;';

    // Crear modal con loading inicial
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:16px;padding:32px;max-width:850px;width:92%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);';
    modal.innerHTML = '<div style="text-align:center;padding:40px;"><div style="font-size:48px;margin-bottom:16px;">⏳</div><div style="color:#6b7280;">Cargando información de la tarea...</div></div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Cerrar con click fuera o ESC
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    const escHandler = (e) => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    try {
      // Hacer fetch primero
      const response = await fetch('/api/task-intelligence/assign-to-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, phaseKey, instructions: '' })
      });
      const data = await response.json();

      if (!data.success || !data.claudeContext) {
        modal.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626;"><div style="font-size:48px;margin-bottom:16px;">❌</div><div>Error: ' + (data.error || 'Respuesta inválida') + '</div><button onclick="this.closest(\'#claude-assignment-modal\').remove()" style="margin-top:20px;padding:10px 24px;background:#6b7280;color:white;border:none;border-radius:6px;cursor:pointer;">Cerrar</button></div>';
        return;
      }

      const ctx = data.claudeContext;

      // Obtener nombre descriptivo de la tarea
      // Prioridad: 1) parámetro directo, 2) metadata cargado, 3) API relatedEntries
      let taskName = taskNameParam || null;

      // Método 1: Si no viene como parámetro, buscar en metadata del dashboard
      if (!taskName && window.EngineeringDashboard?.metadata?.roadmap) {
        const phase = window.EngineeringDashboard.metadata.roadmap[phaseKey];
        if (phase && phase.tasks) {
          const foundTask = phase.tasks.find(t => t.id === taskId);
          if (foundTask && foundTask.name) {
            taskName = foundTask.name;
          }
        }
      }

      // Método 2: Si aún no encontró, buscar en relatedEntries del API
      if (!taskName) {
        const relatedEntries = ctx.preAnalysis?.relatedEntries || [];
        for (const entry of relatedEntries) {
          if (entry.tasks && Array.isArray(entry.tasks)) {
            const foundTask = entry.tasks.find(t => t.id === taskId);
            if (foundTask && foundTask.name) {
              taskName = foundTask.name;
              break;
            }
          }
        }
      }

      // Fallback final
      if (!taskName) {
        taskName = 'Sin descripción disponible';
      }

      // Obtener descripción detallada de la tarea - SIEMPRE fetch fresco del servidor
      let taskDescription = '';
      let taskEstimatedEffort = '';
      let taskDependencies = [];

      // Primero intentar fetch fresco del servidor (para evitar cache issues)
      try {
        const freshResponse = await fetch('/api/engineering/metadata');
        const freshResult = await freshResponse.json();
        if (freshResult.success && freshResult.data?.roadmap) {
          // Actualizar el cache local también
          window.EngineeringDashboard.metadata = freshResult.data;
          const phase = freshResult.data.roadmap[phaseKey];
          if (phase && phase.tasks) {
            const foundTask = phase.tasks.find(t => t.id === taskId);
            if (foundTask) {
              taskDescription = foundTask.description || '';
              taskEstimatedEffort = foundTask.estimatedEffort || '';
              taskDependencies = foundTask.dependencies || [];
            }
          }
        }
      } catch (fetchError) {
        console.warn('⚠️ No se pudo obtener metadata fresco, usando cache:', fetchError);
        // Fallback al cache local
        if (window.EngineeringDashboard?.metadata?.roadmap) {
          const phase = window.EngineeringDashboard.metadata.roadmap[phaseKey];
          if (phase && phase.tasks) {
            const foundTask = phase.tasks.find(t => t.id === taskId);
            if (foundTask) {
              taskDescription = foundTask.description || '';
              taskEstimatedEffort = foundTask.estimatedEffort || '';
              taskDependencies = foundTask.dependencies || [];
            }
          }
        }
      }

      console.log('Task name encontrado:', taskName, '(fuente:', taskNameParam ? 'parámetro' : 'metadata/API', ')');
      console.log('Task description:', taskDescription || '(sin descripción detallada)');

      // Renderizar modal completo
      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #e5e7eb;padding-bottom:16px;">
          <h2 style="margin:0;color:#1f2937;font-size:22px;display:flex;align-items:center;gap:10px;">
            <span style="font-size:28px;">🤖</span> Asignar Tarea a Claude Code
          </h2>
          <button onclick="this.closest('#claude-assignment-modal').remove()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#6b7280;">&times;</button>
        </div>

        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:14px 18px;border-radius:10px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <div style="font-size:11px;opacity:0.8;text-transform:uppercase;">TAREA</div>
              <div style="font-size:20px;font-weight:700;">${taskId}</div>
            </div>
            ${taskEstimatedEffort ? `<div style="background:rgba(255,255,255,0.2);padding:6px 12px;border-radius:6px;font-size:12px;">⏱️ ${taskEstimatedEffort}</div>` : ''}
          </div>
          <div style="font-size:14px;opacity:0.95;line-height:1.4;border-top:1px solid rgba(255,255,255,0.2);padding-top:10px;margin-top:8px;">
            📝 ${taskName}
          </div>
          <div style="font-size:12px;opacity:0.75;margin-top:8px;">📂 Phase: ${phaseKey}</div>
          ${taskDependencies.length > 0 ? `<div style="font-size:11px;opacity:0.7;margin-top:4px;">🔗 Depende de: ${taskDependencies.join(', ')}</div>` : ''}
        </div>

        <!-- DESCRIPCIÓN DETALLADA - Campo principal editable -->
        <div style="margin-bottom:16px;">
          <label style="display:flex;align-items:center;gap:8px;font-weight:600;color:#374151;margin-bottom:6px;font-size:13px;">
            📋 DESCRIPCIÓN DETALLADA DE LA TAREA:
            ${taskDescription ? '<span style="color:#10b981;font-size:11px;font-weight:normal;">(cargada del roadmap)</span>' : '<span style="color:#f59e0b;font-size:11px;font-weight:normal;">⚠️ Sin descripción - escribe qué debe hacer Claude</span>'}
          </label>
          <textarea id="claude-task-description" placeholder="Describe detalladamente qué debe hacer Claude para completar esta tarea...

Ejemplo:
- Qué archivos modificar o crear
- Qué funcionalidades implementar
- Qué tests agregar
- Referencias a archivos similares
- Criterios de éxito" style="width:100%;height:120px;padding:12px;border:2px solid ${taskDescription ? '#10b981' : '#f59e0b'};border-radius:8px;font-size:13px;resize:vertical;box-sizing:border-box;line-height:1.5;">${taskDescription}</textarea>
          <div style="display:flex;justify-content:flex-end;margin-top:6px;">
            <button id="save-description-btn" style="background:#8b5cf6;color:white;border:none;padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px;">
              💾 Guardar Descripción en Roadmap
            </button>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label style="display:block;font-weight:600;color:#374151;margin-bottom:6px;font-size:13px;">📁 COMANDO PARA TERMINAL:</label>
          <div style="background:#1f2937;color:#10b981;padding:12px 14px;border-radius:6px;font-family:Consolas,Monaco,monospace;font-size:13px;">${ctx.commandToRun}</div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="display:block;font-weight:600;color:#374151;margin-bottom:6px;font-size:13px;">✏️ INSTRUCCIONES ADICIONALES (opcional):</label>
          <textarea id="claude-extra-instructions" placeholder="Notas extra, aclaraciones, preferencias..." style="width:100%;height:50px;padding:10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;resize:vertical;box-sizing:border-box;"></textarea>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="modal-confirm-assignment" style="flex:1;min-width:200px;background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);color:white;border:none;padding:14px 20px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">
            ✅ Confirmar Asignación a Claude
          </button>
          <button id="modal-copy-all" style="flex:1;min-width:200px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;border:none;padding:14px 20px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">
            📋 Copiar TODO al Portapapeles
          </button>
          <button id="modal-copy-cmd" style="flex:1;min-width:140px;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;border:none;padding:14px 20px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">
            🖥️ Solo Comando
          </button>
          <button onclick="this.closest('#claude-assignment-modal').remove()" style="background:#6b7280;color:white;border:none;padding:14px 20px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">
            Cerrar
          </button>
        </div>

        <div style="margin-top:16px;padding:10px 14px;background:#fef3c7;border-radius:6px;border-left:4px solid #f59e0b;">
          <div style="font-weight:600;color:#92400e;font-size:12px;">💡 Cómo usar:</div>
          <div style="color:#78350f;font-size:11px;margin-top:2px;">1. Click "Confirmar Asignación" para bloquear la tarea → 2. "Copiar TODO" → 3. Abrir Claude Code → 4. Pegar (Ctrl+V)</div>
        </div>
      `;

      // Event listeners

      // Handler para confirmar asignación (crear lock real)
      document.getElementById('modal-confirm-assignment').onclick = async function() {
        this.innerHTML = '⏳ Asignando...';
        this.disabled = true;

        try {
          // 1. Registrar sesión de Claude (obtener token)
          const registerResponse = await fetch('/api/coordination/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'claude',
              name: 'Claude Code Session',
              description: 'Sesión asignada desde Engineering Dashboard'
            })
          });
          const registerResult = await registerResponse.json();

          if (!registerResult.success) {
            throw new Error(registerResult.error || 'Error registrando sesión');
          }

          const token = registerResult.token;

          // 2. Adquirir lock de la tarea
          const lockResponse = await fetch('/api/coordination/acquire-lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: token,
              taskId: taskId,
              phaseKey: phaseKey
            })
          });
          const lockResult = await lockResponse.json();

          if (!lockResult.success) {
            throw new Error(lockResult.error || 'Error adquiriendo lock');
          }

          this.innerHTML = '✅ ¡Asignada!';
          this.style.background = '#10b981';

          // 3. Cerrar modal y recargar vista
          setTimeout(() => {
            document.getElementById('claude-assignment-modal').remove();
            window.EngineeringDashboard.loadCriticalPathView();
          }, 1000);

        } catch(e) {
          alert('❌ Error: ' + e.message);
          this.innerHTML = '✅ Confirmar Asignación a Claude';
          this.style.background = 'linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)';
          this.disabled = false;
        }
      };

      document.getElementById('modal-copy-all').onclick = async function() {
        const description = document.getElementById('claude-task-description').value.trim();
        const extraInstructions = document.getElementById('claude-extra-instructions').value.trim();

        // Texto completo con descripción detallada
        let fullText = `🎯 TAREA: ${taskId} - ${taskName}
📂 PHASE: ${phaseKey}
📁 PROYECTO: C:\\Bio\\sistema_asistencia_biometrico

${description ? '📋 QUÉ HACER:\n' + description + '\n' : ''}
${extraInstructions ? '📝 NOTAS ADICIONALES: ' + extraInstructions + '\n' : ''}
⚠️ ANTES DE EMPEZAR: Decime qué entendiste y esperá mi OK.`;

        try {
          await navigator.clipboard.writeText(fullText);
          this.innerHTML = '✅ ¡COPIADO!';
          this.style.background = '#059669';
          setTimeout(() => { this.innerHTML = '📋 Copiar TODO al Portapapeles'; this.style.background = 'linear-gradient(135deg,#10b981 0%,#059669 100%)'; }, 2500);
        } catch(e) { alert('Error al copiar. Usa Ctrl+C manualmente.'); }
      };

      // Handler para guardar descripción en el roadmap
      document.getElementById('save-description-btn').onclick = async function() {
        const newDescription = document.getElementById('claude-task-description').value.trim();
        if (!newDescription) {
          alert('La descripción está vacía. Escribe algo primero.');
          return;
        }

        this.innerHTML = '⏳ Guardando...';
        this.disabled = true;

        try {
          const response = await fetch('/api/engineering/update-task-description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, phaseKey, description: newDescription })
          });
          const result = await response.json();

          if (result.success) {
            this.innerHTML = '✅ ¡Guardado!';
            this.style.background = '#10b981';
            // Actualizar el metadata local
            if (window.EngineeringDashboard?.metadata?.roadmap?.[phaseKey]?.tasks) {
              const task = window.EngineeringDashboard.metadata.roadmap[phaseKey].tasks.find(t => t.id === taskId);
              if (task) task.description = newDescription;
            }
            // Cambiar borde del textarea a verde
            document.getElementById('claude-task-description').style.borderColor = '#10b981';
            setTimeout(() => { this.innerHTML = '💾 Guardar Descripción en Roadmap'; this.style.background = '#8b5cf6'; }, 2000);
          } else {
            throw new Error(result.error || 'Error desconocido');
          }
        } catch(e) {
          alert('Error guardando: ' + e.message);
          this.innerHTML = '💾 Guardar Descripción en Roadmap';
        }
        this.disabled = false;
      };

      document.getElementById('modal-copy-cmd').onclick = async function() {
        try {
          await navigator.clipboard.writeText(ctx.commandToRun);
          this.innerHTML = '✅ ¡Copiado!';
          setTimeout(() => { this.innerHTML = '🖥️ Solo Comando'; }, 2000);
        } catch(e) { alert('Error al copiar'); }
      };

    } catch (error) {
      modal.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626;"><div style="font-size:48px;margin-bottom:16px;">❌</div><div>Error de conexión: ' + error.message + '</div><button onclick="this.closest(\'#claude-assignment-modal\').remove()" style="margin-top:20px;padding:10px 24px;background:#6b7280;color:white;border:none;border-radius:6px;cursor:pointer;">Cerrar</button></div>';
    }
  },

  /**
   * Asignar tarea a humano
   */
  async assignToHuman(taskId, phaseKey) {
    const assignedTo = prompt('¿A quién asignar esta tarea? (ej: Juan Pérez)');
    if (!assignedTo) return;

    try {
      // 1. Registrar sesión de humano
      const registerResponse = await fetch('/api/coordination/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'human',
          name: assignedTo,
          description: 'Asignado desde Engineering Dashboard'
        })
      });
      const registerResult = await registerResponse.json();

      if (!registerResult.success) {
        throw new Error(registerResult.error || 'Error registrando sesión');
      }

      const token = registerResult.token;

      // 2. Adquirir lock de la tarea
      const lockResponse = await fetch('/api/coordination/acquire-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, taskId, phaseKey })
      });
      const lockResult = await lockResponse.json();

      if (!lockResult.success) {
        throw new Error(lockResult.error || 'Error adquiriendo lock');
      }

      // 3. También actualizar metadata
      const response = await fetch('/api/task-intelligence/assign-to-human', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, phaseKey, assignedTo })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Tarea ${taskId} asignada a ${assignedTo}\n\n🔒 Lock adquirido - la tarea está bloqueada`);
        this.loadCriticalPathView();
      } else {
        alert('Error: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  },

  /**
   * Marcar tarea como completada
   */
  async completeTask(taskId, phaseKey) {
    if (!confirm(`¿Marcar tarea ${taskId} como completada?`)) return;

    try {
      const response = await fetch('/api/task-intelligence/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          phaseKey,
          completedBy: 'human'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Tarea completada\n\n${data.result.changes?.join('\n') || 'Actualizado'}`);
        this.loadCriticalPathView();
      } else {
        alert('Error: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  },

  /**
   * Cambiar prioridad de tarea
   */
  async updatePriority(taskId, phaseKey) {
    const newPriority = prompt('Nueva prioridad (1-10):', '5');
    if (!newPriority) return;

    const priority = parseInt(newPriority);
    if (priority < 1 || priority > 10) {
      alert('La prioridad debe estar entre 1 y 10');
      return;
    }

    try {
      const response = await fetch('/api/critical-path/update-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, phaseKey, priority })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Prioridad actualizada\nCamino crítico recalculado automáticamente`);
        this.loadCriticalPathView();
      } else {
        alert('Error: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  },

  /**
   * Filtrar tablas en la vista de BD
   */
  filterDatabaseTables(searchTerm) {
    const term = searchTerm.toLowerCase();
    const tables = document.querySelectorAll('.db-table-card');

    tables.forEach(table => {
      const tableName = table.getAttribute('data-table').toLowerCase();
      const fields = table.querySelectorAll('.db-field-row');
      let hasMatch = tableName.includes(term);

      // También buscar en campos
      fields.forEach(field => {
        const fieldText = field.textContent.toLowerCase();
        if (fieldText.includes(term)) hasMatch = true;
      });

      table.style.display = hasMatch ? 'block' : 'none';
    });
  },

  /**
   * VISTA: Workflows - AHORA USA BRAIN API CON DATOS LIVE
   */
  renderWorkflows() {
    // Mostrar loading mientras carga desde Brain
    return `
      <div class="workflows-container">
        <h2>🔄 Workflows del Sistema <span style="font-size: 0.7em; color: #10b981;">🧠 LIVE desde Brain</span></h2>
        <div id="workflows-brain-content">
          <p style="text-align: center; padding: 40px;">
            <span style="font-size: 2em;">⏳</span><br>
            Cargando workflows desde Brain Service...
          </p>
        </div>
      </div>
    `;
  },

  /**
   * Cargar workflows desde Brain API después de renderizar
   */
  async loadWorkflowsFromBrain() {
    const container = document.getElementById('workflows-brain-content');
    if (!container) return;

    try {
      const response = await fetch('/api/engineering/workflows');
      const result = await response.json();

      if (!result.success || !result.data) {
        container.innerHTML = '<p style="color: red;">Error cargando workflows</p>';
        return;
      }

      const { workflows, stats } = result.data;

      container.innerHTML = `
        <!-- Stats Panel -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
          <div style="text-align: center; color: white;">
            <div style="font-size: 2em; font-weight: bold;">${stats.total}</div>
            <div style="font-size: 0.85em; opacity: 0.9;">Total Workflows</div>
          </div>
          <div style="text-align: center; color: white;">
            <div style="font-size: 2em; font-weight: bold;">${stats.tutorialCapable}</div>
            <div style="font-size: 0.85em; opacity: 0.9;">📚 Con Tutorial</div>
          </div>
          <div style="text-align: center; color: white;">
            <div style="font-size: 2em; font-weight: bold;">${stats.totalStages}</div>
            <div style="font-size: 0.85em; opacity: 0.9;">Etapas Totales</div>
          </div>
          <div style="text-align: center; color: white;">
            <div style="font-size: 2em; font-weight: bold;">${stats.totalSteps}</div>
            <div style="font-size: 0.85em; opacity: 0.9;">Pasos Totales</div>
          </div>
          <div style="text-align: center; color: white;">
            <div style="font-size: 2em; font-weight: bold;">${stats.implemented}</div>
            <div style="font-size: 0.85em; opacity: 0.9;">✅ Implementados</div>
          </div>
        </div>

        <!-- Workflows Grid -->
        <div class="workflows-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
          ${workflows.map(workflow => `
            <div class="workflow-card" style="background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; border-left: 4px solid ${this.getWorkflowColor(workflow.status)};">
              <!-- Header -->
              <div style="padding: 15px; background: linear-gradient(135deg, ${this.getWorkflowColor(workflow.status)}22, transparent);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <h3 style="margin: 0; font-size: 1.1em;">${workflow.displayName || workflow.name}</h3>
                  <span style="background: ${this.getWorkflowColor(workflow.status)}; color: white; padding: 4px 10px; border-radius: 15px; font-size: 0.75em;">
                    ${workflow.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                <div style="margin-top: 8px; font-size: 0.85em; color: #6b7280;">
                  <span>📁 ${workflow.source}</span>
                </div>
              </div>

              <!-- Stats -->
              <div style="padding: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                <div>
                  <div style="font-size: 1.5em; font-weight: bold; color: #3b82f6;">${workflow.stageCount || 0}</div>
                  <div style="font-size: 0.75em; color: #6b7280;">Etapas</div>
                </div>
                <div>
                  <div style="font-size: 1.5em; font-weight: bold; color: #10b981;">${workflow.totalSteps || 0}</div>
                  <div style="font-size: 0.75em; color: #6b7280;">Pasos</div>
                </div>
                <div>
                  <div style="font-size: 1.5em; font-weight: bold; color: #8b5cf6;">${workflow.completeness || 0}%</div>
                  <div style="font-size: 0.75em; color: #6b7280;">Completo</div>
                </div>
              </div>

              <!-- Stages Preview -->
              ${workflow.stages && workflow.stages.length > 0 ? `
                <div style="padding: 15px;">
                  <h4 style="margin: 0 0 10px 0; font-size: 0.9em; color: #374151;">📋 Etapas:</h4>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${workflow.stages.slice(0, 6).map((stage, idx) => `
                      <span style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 0.75em;">
                        ${idx + 1}. ${stage.name} <span style="color: #10b981;">(${stage.stepCount || stage.subStatuses?.length || 0})</span>
                      </span>
                    `).join('')}
                    ${workflow.stages.length > 6 ? `<span style="padding: 4px 8px; font-size: 0.75em; color: #6b7280;">+${workflow.stages.length - 6} más</span>` : ''}
                  </div>
                </div>
              ` : ''}

              <!-- Connected Modules -->
              ${workflow.connectedModules && workflow.connectedModules.length > 0 ? `
                <div style="padding: 0 15px 15px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 0.85em; color: #374151;">🔗 Módulos conectados:</h4>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${workflow.connectedModules.slice(0, 5).map(mod => `
                      <span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 3px; font-size: 0.7em;">${mod}</span>
                    `).join('')}
                    ${workflow.connectedModules.length > 5 ? `<span style="font-size: 0.7em; color: #6b7280;">+${workflow.connectedModules.length - 5}</span>` : ''}
                  </div>
                </div>
              ` : ''}

              <!-- Actions -->
              <div style="padding: 15px; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; gap: 10px;">
                ${workflow.tutorialCapable ? `
                  <button onclick="window.EngineeringDashboard.showTutorial('${workflow.id}')"
                    style="flex: 1; padding: 8px 12px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85em;">
                    📚 Ver Tutorial
                  </button>
                ` : `
                  <span style="flex: 1; padding: 8px 12px; background: #e5e7eb; color: #6b7280; border-radius: 6px; text-align: center; font-size: 0.85em;">
                    Sin tutorial disponible
                  </span>
                `}
                <button onclick="window.EngineeringDashboard.showWorkflowDetails('${workflow.id}')"
                  style="padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85em;">
                  🔍 Detalles
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 0.85em;">
          🧠 Datos escaneados EN VIVO desde el código • Última actualización: ${new Date(result.scannedAt).toLocaleString()}
        </div>
      `;
    } catch (error) {
      console.error('Error loading workflows from Brain:', error);
      container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
  },

  /**
   * Obtener color según status del workflow
   */
  getWorkflowColor(status) {
    const colors = {
      'implemented': '#10b981',
      'partial': '#f59e0b',
      'planned': '#6b7280',
      'development': '#3b82f6'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  },

  /**
   * Mostrar tutorial de un workflow
   */
  async showTutorial(workflowId) {
    try {
      const response = await fetch(`/api/engineering/workflows/${workflowId}/tutorial`);
      const result = await response.json();

      if (!result.success) {
        alert('Error cargando tutorial: ' + result.error);
        return;
      }

      const tutorial = result.data;

      // Crear modal con el tutorial
      const modal = document.createElement('div');
      modal.id = 'tutorial-modal';
      modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px;';

      modal.innerHTML = `
        <div style="background: white; border-radius: 12px; max-width: 900px; max-height: 90vh; overflow: auto; width: 100%;">
          <!-- Header -->
          <div style="padding: 20px; background: linear-gradient(135deg, #10b981, #059669); color: white; position: sticky; top: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h2 style="margin: 0;">📚 ${tutorial.title}</h2>
              <button onclick="document.getElementById('tutorial-modal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer;">✕ Cerrar</button>
            </div>
            <div style="margin-top: 10px; display: flex; gap: 15px; flex-wrap: wrap; font-size: 0.9em;">
              <span>⏱️ ${tutorial.overview.estimatedTime}</span>
              <span>📊 ${tutorial.overview.difficulty}</span>
              <span>📋 ${tutorial.overview.totalStages} etapas</span>
              <span>📝 ${tutorial.overview.totalSteps} pasos</span>
            </div>
          </div>

          <!-- Content -->
          <div style="padding: 20px;">
            <p style="color: #374151; margin-bottom: 20px;">${tutorial.overview.description}</p>

            <!-- Prerequisites -->
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Prerequisitos</h4>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                ${tutorial.overview.prerequisites.map(p => `<li>${p}</li>`).join('')}
              </ul>
            </div>

            <!-- Stages -->
            ${tutorial.stages.map(stage => `
              <div style="margin-bottom: 25px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background: #f3f4f6; padding: 15px;">
                  <h3 style="margin: 0; color: #374151;">
                    <span style="background: #3b82f6; color: white; padding: 4px 10px; border-radius: 4px; margin-right: 10px;">${stage.number}</span>
                    ${stage.title}
                  </h3>
                  <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 0.9em;">${stage.description}</p>
                </div>

                <div style="padding: 15px;">
                  ${stage.steps.map(step => `
                    <div style="padding: 12px; margin-bottom: 10px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #10b981;">
                      <div style="font-weight: 600; color: #374151;">
                        Paso ${step.number}: ${step.title}
                      </div>
                      <div style="color: #059669; font-size: 0.9em; margin-top: 4px;">
                        🎯 ${step.action}
                      </div>
                      <div style="margin-top: 8px; font-size: 0.85em; color: #6b7280;">
                        ${step.instructions.join('<br>')}
                      </div>
                      ${step.tips && step.tips.length > 0 ? `
                        <div style="margin-top: 8px; padding: 8px; background: #ecfdf5; border-radius: 4px; font-size: 0.85em; color: #065f46;">
                          ${step.tips.join('<br>')}
                        </div>
                      ` : ''}
                      ${step.nextOptions && step.nextOptions.length > 0 ? `
                        <div style="margin-top: 8px; font-size: 0.8em; color: #6b7280;">
                          ➡️ Puede continuar a: ${step.nextOptions.map(n => n.name).join(', ')}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}

                  ${stage.canTransitionTo && stage.canTransitionTo.length > 0 ? `
                    <div style="padding: 10px; background: #dbeafe; border-radius: 6px; font-size: 0.85em; color: #1e40af;">
                      🔄 Esta etapa puede transicionar a: ${stage.canTransitionTo.map(t => t.name).join(', ')}
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}

            <!-- Summary -->
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h4 style="margin: 0 0 15px 0; color: #166534;">📋 Resumen</h4>

              <div style="margin-bottom: 15px;">
                <strong style="color: #166534;">✅ Puntos Clave:</strong>
                <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #166534;">
                  ${tutorial.summary.keyTakeaways.map(k => `<li>${k}</li>`).join('')}
                </ul>
              </div>

              <div style="margin-bottom: 15px;">
                <strong style="color: #dc2626;">❌ Errores Comunes:</strong>
                <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #dc2626;">
                  ${tutorial.summary.commonMistakes.map(m => `<li>${m}</li>`).join('')}
                </ul>
              </div>

              <div>
                <strong style="color: #2563eb;">💡 Mejores Prácticas:</strong>
                <ul style="margin: 5px 0 0 0; padding-left: 20px; color: #2563eb;">
                  ${tutorial.summary.bestPractices.map(b => `<li>${b}</li>`).join('')}
                </ul>
              </div>
            </div>

            <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 0.85em;">
              🧠 Tutorial generado dinámicamente desde el código • ${new Date(tutorial.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    } catch (error) {
      console.error('Error showing tutorial:', error);
      alert('Error cargando tutorial: ' + error.message);
    }
  },

  /**
   * Mostrar detalles de un workflow
   */
  async showWorkflowDetails(workflowId) {
    try {
      const response = await fetch(`/api/engineering/workflows/${workflowId}`);
      const result = await response.json();

      if (!result.success) {
        alert('Error: ' + result.error);
        return;
      }

      const workflow = result.data;
      alert(`Workflow: ${workflow.displayName}\n\nEtapas: ${workflow.stageCount}\nPasos: ${workflow.totalSteps}\nCompleteness: ${workflow.completeness}%\nMódulos: ${(workflow.connectedModules || []).join(', ')}\n\nFuente: ${workflow.source}`);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  },

  /**
   * VISTA: Organigrama Jerárquico Profesional
   */
  renderOrganigrama() {
    if (!this.metadata) return '<p>Cargando...</p>';

    const { organizationalStructure } = this.metadata;
    if (!organizationalStructure) return '<p>No hay estructura organizacional definida</p>';

    const { hierarchy } = organizationalStructure;

    return `
      <div class="organigrama-container" style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
        <h2 style="color: white; margin-bottom: 10px;">🏢 Organigrama Aponnt</h2>
        <p style="color: rgba(255,255,255,0.9); margin-bottom: 30px;">
          Estructura organizacional jerárquica completa
        </p>

        <!-- NIVEL 0: GERENTE GENERAL -->
        <div style="text-align: center; margin-bottom: 50px;">
          ${this.renderOrgBox(hierarchy.gerenteGeneral, '#dc2626', '👔')}
        </div>

        <!-- NIVEL 1: GERENTES DE ÁREA -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; margin-bottom: 50px; position: relative;">

          <!-- Líneas conectoras desde Gerente General -->
          <div style="position: absolute; top: -30px; left: 0; right: 0; height: 30px; display: flex; justify-content: center;">
            <div style="width: 2px; height: 30px; background: white;"></div>
          </div>
          <div style="position: absolute; top: 0; left: 10%; right: 10%; height: 2px; background: white;"></div>

          <!-- Gerentes Regionales (Ventas) -->
          <div style="text-align: center;">
            ${this.renderOrgBox(hierarchy.gerentesRegionales, '#ea580c', '💼')}
            ${this.renderSubHierarchy(hierarchy.gerentesRegionales.hierarchy, '#f97316')}
          </div>

          <!-- Gerente Administrativo -->
          <div style="text-align: center;">
            ${this.renderOrgBox(hierarchy.gerenteAdministrativo, '#0891b2', '📊')}
            ${this.renderSubHierarchy(hierarchy.gerenteAdministrativo.hierarchy, '#06b6d4')}
          </div>

          <!-- Gerente de Desarrollo -->
          <div style="text-align: center;">
            ${this.renderOrgBox(hierarchy.gerenteDesarrollo, '#7c3aed', '💻')}
            ${this.renderSubHierarchy(hierarchy.gerenteDesarrollo.hierarchy, '#8b5cf6')}
          </div>

          <!-- Staff Externo -->
          <div style="text-align: center;">
            ${this.renderOrgBox(hierarchy.staffExterno, '#059669', '🌐')}
            ${this.renderExternalStaff(hierarchy.staffExterno.areas)}
          </div>
        </div>

        <!-- Resumen de niveles -->
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px);">
          <h3 style="color: white; margin-bottom: 15px;">📋 Resumen de Niveles Jerárquicos</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            ${Object.entries(organizationalStructure.levels).map(([level, data]) => `
              <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 6px; border-left: 4px solid white;">
                <div style="color: white; font-weight: 600; font-size: 1.2rem;">Nivel ${level}</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 0.9rem; margin-top: 4px;">${data.name}</div>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 4px;">${data.quantity}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Áreas de negocio -->
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px); margin-top: 20px;">
          <h3 style="color: white; margin-bottom: 15px;">🏢 Áreas de Negocio</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            ${organizationalStructure.areas.map(area => `
              <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 6px;">
                <div style="color: white; font-weight: 600;">${area.name}</div>
                <div style="color: rgba(255,255,255,0.8); font-size: 0.85rem; margin-top: 4px;">
                  👤 ${area.gerente}
                </div>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 2px;">
                  📍 ${area.type}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Sistema de comisiones -->
        ${organizationalStructure.commissionSystem ? `
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; backdrop-filter: blur(10px); margin-top: 20px;">
            <h3 style="color: white; margin-bottom: 10px;">💰 Sistema de Comisiones</h3>
            <p style="color: rgba(255,255,255,0.9); margin-bottom: 10px;">${organizationalStructure.commissionSystem.description}</p>
            <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 6px; border-left: 4px solid #fbbf24;">
              <div style="color: white; font-weight: 600; margin-bottom: 8px;">Aplica a:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${organizationalStructure.commissionSystem.applies.map(role => `
                  <span style="background: rgba(251, 191, 36, 0.3); color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem;">
                    ${role}
                  </span>
                `).join('')}
              </div>
              <div style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-top: 12px;">
                📊 ${organizationalStructure.commissionSystem.structure}
              </div>
              <div style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin-top: 8px;">
                🚧 ${organizationalStructure.commissionSystem.implementation}
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * Renderizar caja de posición organizacional
   */
  renderOrgBox(position, color, emoji) {
    const level = position.level !== undefined ? position.level : '';
    const code = position.code || '';
    const quantity = position.quantity ? ` (${position.quantity})` : '';

    return `
      <div style="
        display: inline-block;
        background: ${color};
        color: white;
        padding: 10px;
        border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        min-width: 120px;
        text-align: center;
        position: relative;
        transform: scale(1);
        transition: transform 0.2s ease;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        <div style="font-size: 1rem; margin-bottom: 4px;">${emoji}</div>
        <div style="font-weight: 700; font-size: 0.55rem; margin-bottom: 2px;">
          ${position.position}${quantity}
        </div>
        ${code ? `<div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 2px 6px; border-radius: 2px; font-size: 0.4rem; margin-bottom: 4px;">${code}</div>` : ''}
        ${level !== '' ? `<div style="font-size: 0.375rem; opacity: 0.8;">Nivel ${level}</div>` : ''}
        ${position.responsibilities ? `
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.3);">
            <div style="font-size: 0.375rem; opacity: 0.9; text-align: left;">
              ${position.responsibilities.slice(0, 2).map(resp => `
                <div style="margin-bottom: 2px;">• ${resp}</div>
              `).join('')}
              ${position.responsibilities.length > 2 ? `<div style="opacity: 0.7;">+${position.responsibilities.length - 2} más...</div>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * Renderizar sub-jerarquía
   */
  renderSubHierarchy(hierarchy, baseColor) {
    if (!hierarchy) return '';

    const entries = Object.entries(hierarchy);
    if (entries.length === 0) return '';

    // Colores más claros para niveles inferiores
    const lighterColor = this.adjustColorBrightness(baseColor, 20);

    // Si todos los elementos son invisibles, renderizar directamente sus hijos
    const allInvisible = entries.every(([_, subPosition]) => subPosition.invisible);
    if (allInvisible && entries.length === 1) {
      const [_, subPosition] = entries[0];
      console.log('[DEBUG] Saltando nivel invisible:', subPosition);
      return `
        <!-- Nivel invisible omitido -->
        <div style="margin-top: 20px; padding-top: 20px; position: relative;">
          <div style="position: absolute; top: 0; left: 50%; width: 2px; height: 20px; background: rgba(255,255,255,0.5);"></div>
          ${subPosition.hierarchy ? this.renderSubHierarchy(subPosition.hierarchy, baseColor) : ''}
        </div>
      `;
    }

    return `
      <div style="margin-top: 20px; padding-top: 20px; position: relative;">
        <!-- Línea conectora vertical -->
        <div style="position: absolute; top: 0; left: 50%; width: 2px; height: 20px; background: rgba(255,255,255,0.5);"></div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
          ${entries.map(([key, subPosition]) => {
            // Si es invisible, solo renderizar su jerarquía
            if (subPosition.invisible) {
              return subPosition.hierarchy ? this.renderSubHierarchy(subPosition.hierarchy, baseColor) : '';
            }

            return `
            <div style="text-align: center;">
              <div style="
                background: ${lighterColor};
                color: white;
                padding: 12px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                font-size: 0.85rem;
                min-height: 80px;
                display: flex;
                flex-direction: column;
                justify-content: center;
              ">
                <div style="font-weight: 600; margin-bottom: 4px;">${subPosition.position}</div>
                ${subPosition.code ? `<div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.7rem; margin: 4px auto;">${subPosition.code}</div>` : ''}
                ${subPosition.level !== undefined ? `<div style="font-size: 0.7rem; opacity: 0.8; margin-top: 4px;">Nivel ${subPosition.level}</div>` : ''}
                ${subPosition.manages ? `<div style="font-size: 0.7rem; opacity: 0.7; margin-top: 4px;">👥 Gestiona ${subPosition.manages.length} área(s)</div>` : ''}
              </div>
              ${subPosition.hierarchy ? this.renderSubHierarchy(subPosition.hierarchy, lighterColor) : ''}
            </div>
          `}).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Renderizar staff externo
   */
  renderExternalStaff(areas) {
    if (!areas) return '';

    const entries = Object.entries(areas);
    if (entries.length === 0) return '';

    return `
      <div style="margin-top: 20px; padding-top: 20px; position: relative;">
        <!-- Línea conectora vertical -->
        <div style="position: absolute; top: 0; left: 50%; width: 2px; height: 20px; background: rgba(255,255,255,0.5);"></div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
          ${entries.map(([key, area]) => `
            <div style="
              background: rgba(5, 150, 105, 0.7);
              color: white;
              padding: 10px;
              border-radius: 6px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              font-size: 0.8rem;
              border: 1px dashed rgba(255,255,255,0.4);
            ">
              <div style="font-weight: 600;">${area.position}</div>
              ${area.code ? `<div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; margin-top: 4px;">${area.code}</div>` : ''}
              ${area.contractType ? `<div style="font-size: 0.7rem; opacity: 0.8; margin-top: 4px;">📄 ${area.contractType}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Ajustar brillo de color (helper)
   */
  adjustColorBrightness(color, percent) {
    // Convertir hex a RGB
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.min(255, Math.floor((num >> 16) + percent));
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.floor((num & 0x0000FF) + percent));
    return `rgb(${r}, ${g}, ${b})`;
  },

  /**
   * Carga async la vista de Camino Crítico
   */
  async loadCriticalPathView() {
    try {
      const container = document.getElementById('critical-path-dynamic');
      if (!container) return;

      const html = await this.renderCriticalPathView();
      container.innerHTML = html;
    } catch (error) {
      console.error('Error cargando Critical Path:', error);
      const container = document.getElementById('critical-path-dynamic');
      if (container) {
        container.innerHTML = `
          <div style="padding: 40px; text-align: center;">
            <h3 style="color: #dc2626;">❌ Error al cargar Camino Crítico</h3>
            <p style="color: #6b7280;">${error.message}</p>
            <button onclick="window.EngineeringDashboard.loadCriticalPathView()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 20px;">
              🔄 Reintentar
            </button>
          </div>
        `;
      }
    }
  },

  /**
   * ⭐ NUEVO: Cargar vista de Salud del Sistema (Brain Orchestrator Live)
   */
  async loadSystemHealthView() {
    console.log('🧠 [SYSTEM-HEALTH] Cargando vista de salud del sistema...');

    const container = document.getElementById('system-health-dynamic');
    if (!container) {
      console.error('❌ [SYSTEM-HEALTH] Container no encontrado');
      return;
    }

    try {
      // Fetch estado completo del Brain Orchestrator
      const response = await fetch('/api/engineering/full-system-status');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message || 'Error obteniendo estado del sistema');
      }

      const systemStatus = result.data;

      // Renderizar vista con árbol vivo
      container.innerHTML = this.renderSystemHealthTree(systemStatus);

      // Auto-actualizar cada 5 segundos
      if (this.systemHealthInterval) {
        clearInterval(this.systemHealthInterval);
      }

      this.systemHealthInterval = setInterval(async () => {
        // Solo actualizar si todavía estamos en la vista system-health
        if (this.currentView === 'system-health') {
          await this.loadSystemHealthView();
        } else {
          clearInterval(this.systemHealthInterval);
        }
      }, 5000);

    } catch (error) {
      console.error('❌ [SYSTEM-HEALTH] Error:', error);
      container.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <h3 style="color: #dc2626;">❌ Error al cargar Salud del Sistema</h3>
          <p style="color: #6b7280;">${error.message}</p>
          <button onclick="window.EngineeringDashboard.loadSystemHealthView()"
                  style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 20px;">
            🔄 Reintentar
          </button>
        </div>
      `;
    }
  },

  /**
   * Renderizar árbol vivo del Brain Orchestrator
   */
  renderSystemHealthTree(systemStatus) {
    const { system, orchestrator, nervousSystem, ecosystemBrain, roadmap, metadataWriter, loosePieces, health } = systemStatus;

    // Iconos de salud
    const healthIcons = {
      excellent: '🟢',
      good: '🟡',
      degraded: '🟠',
      critical: '🔴',
      healthy: '✅',
      unhealthy: '❌',
      stopped: '⏸️',
      unavailable: '⚫'
    };

    return `
      <div style="padding: 30px; max-width: 1400px; margin: 0 auto;">
        <!-- Header -->
        <div style="margin-bottom: 30px; text-align: center;">
          <h1 style="color: #111827; margin: 0; display: flex; align-items: center; justify-content: center; gap: 15px;">
            🧠 Brain Orchestrator
            <span style="font-size: 48px;">${healthIcons[health.overall]}</span>
          </h1>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 18px;">
            Sistema Nervioso Central - Introspección Completa de Código Vivo
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 14px;">
            ⏱️ Uptime: ${system.uptime} | 🔄 Auto-actualización cada 5 segundos
          </p>
        </div>

        <!-- ¿Qué es el Brain Orchestrator? - Info expandible -->
        <details style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <summary style="font-size: 16px; font-weight: 600; outline: none; user-select: none; list-style: none; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">💡</span>
            <span>¿Qué es el Brain Orchestrator?</span>
            <span style="margin-left: auto; font-size: 12px; opacity: 0.8;">Click para expandir</span>
          </summary>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 13px; line-height: 1.8;">
            <p style="margin: 0 0 15px 0;">
              El <strong>Brain Orchestrator</strong> es el <strong>sistema nervioso central</strong> de tu aplicación. Funciona como un "cerebro" que:
            </p>
            <ul style="margin: 0; padding-left: 20px; line-height: 2;">
              <li><strong>🧠 Orquesta 5 agentes IA</strong> especializados (Support, Trainer, Tester, Evaluator, Sales)</li>
              <li><strong>🧬 Monitorea en tiempo real</strong> errores, health checks, integridad de datos (SSOT)</li>
              <li><strong>🌍 Escanea TODO tu código</strong> automáticamente (192 módulos, 405K líneas, 2,235 endpoints)</li>
              <li><strong>📝 Auto-actualiza metadata</strong> cada 5 minutos con datos frescos del código vivo</li>
              <li><strong>🔍 Detecta piezas sueltas</strong> (código desconectado: routes sin modelo, frontends sin backend)</li>
            </ul>
            <p style="margin: 15px 0 0 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
              <strong>✨ La magia:</strong> El Brain <em>conoce</em> tu código sin configuración manual.
              Se auto-descubre, se auto-monitorea y mantiene una introspección completa del sistema en todo momento.
            </p>
          </div>
        </details>

        <!-- Leyenda de Estados - Info rápida -->
        <div style="background: #f9fafb; border-radius: 12px; padding: 15px 20px; margin-bottom: 25px; border: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="font-size: 14px; font-weight: 600; color: #374151;">📊 Leyenda de Estados:</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; font-size: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">🟢</span>
              <span style="color: #059669;">Excellent</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">✅</span>
              <span style="color: #10b981;">Healthy</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">🟡</span>
              <span style="color: #f59e0b;">Good</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">🟠</span>
              <span style="color: #f97316;">Degraded</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">🔴</span>
              <span style="color: #ef4444;">Critical</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">❌</span>
              <span style="color: #dc2626;">Unhealthy</span>
            </div>
          </div>
        </div>

        <!-- Salud General - Health Cards con Tooltips -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px;">
          ${this.renderHealthCard('Orchestrator', health.orchestrator, orchestrator.activeAgents + orchestrator.activeServices, 'componentes activos', '🧠 Coordina 5 agentes IA + 8 servicios. Es el director de orquesta del sistema.')}
          ${this.renderHealthCard('Sistema Nervioso', health.nervousSystem, nervousSystem?.errorsDetected || 0, 'errores detectados', '🧬 Monitorea en tiempo real: errores, health checks cada 60s, tests SSOT cada 5 min.')}
          ${this.renderHealthCard('Ecosystem Brain', health.ecosystemBrain, ecosystemBrain?.totalModules || 0, 'módulos escaneados', '🌍 Escanea TODO el código vivo: 192 módulos, 405K LOC, 2,235 endpoints, 230 tablas.')}
          ${this.renderHealthCard('Metadata Writer', metadataWriter?.running ? 'healthy' : 'stopped', metadataWriter?.updateCount || 0, 'updates realizados', '📝 Auto-actualiza engineering-metadata.js cada 5 min con datos frescos del Brain.')}
        </div>

        <!-- Árbol del Brain -->
        <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 30px;">
          <h2 style="color: #111827; margin: 0 0 25px 0; font-size: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px;">
            🌳 Árbol Vivo del Sistema
          </h2>

          <!-- Orchestrator: Root -->
          ${this.renderBrainBranch('🧠 Brain Orchestrator', orchestrator, health.orchestrator, [
            { label: 'Agentes IA', value: `${orchestrator.activeAgents}/5`, icon: '🤖' },
            { label: 'Servicios', value: `${orchestrator.activeServices}/8`, icon: '📦' },
            { label: 'Requests Totales', value: orchestrator.totalRequests.toLocaleString(), icon: '📊' }
          ], [
            // Sub-rama: Agentes IA
            this.renderBrainSubBranch('🤖 Agentes IA', [
              { name: 'Support AI', stats: orchestrator.agents?.support?.questionsAnswered || 0, label: 'preguntas' },
              { name: 'Trainer AI', stats: orchestrator.agents?.trainer?.tutorialsCompleted || 0, label: 'tutoriales' },
              { name: 'Tester AI', stats: orchestrator.agents?.tester?.testsRun || 0, label: 'tests' },
              { name: 'Evaluator AI', stats: orchestrator.agents?.evaluator?.evaluationsCompleted || 0, label: 'evaluaciones' },
              { name: 'Sales AI', stats: orchestrator.agents?.sales?.demosCompleted || 0, label: 'demos' }
            ]),

            // Sub-rama: Servicios Core
            this.renderBrainSubBranch('📦 Servicios Core', [
              { name: 'Knowledge DB', stats: orchestrator.services?.knowledgeDB?.totalEntries || 0, label: 'entradas' },
              { name: 'Tours', stats: orchestrator.services?.tours?.toursAvailable || 0, label: 'tours' },
              { name: 'NLU', stats: '✅', label: 'activo' }
            ])
          ], '🎭 Director de orquesta del sistema. Coordina 5 agentes IA especializados (Support, Trainer, Tester, Evaluator, Sales) y 8 servicios core. Gestiona todas las solicitudes y distribuye trabajo entre agentes.')}

          <!-- Sistema Nervioso -->
          ${this.renderBrainBranch('🧬 Sistema Nervioso', nervousSystem, health.nervousSystem, [
            { label: 'Errores Detectados', value: nervousSystem?.errorsDetected || 0, icon: '🔔' },
            { label: 'Violaciones SSOT', value: nervousSystem?.ssotViolations || 0, icon: '⚠️' },
            { label: 'Cambios de Archivos', value: nervousSystem?.fileChangesDetected || 0, icon: '📝' },
            { label: 'Health Checks', value: nervousSystem?.healthChecks || 0, icon: '💓' },
            { label: 'Incidentes Activos', value: nervousSystem?.activeIncidents || 0, icon: '🚨' }
          ], [], '💓 Monitoreo en tiempo real. Ejecuta health checks cada 60 segundos (DB, memory, event loop) y tests de integridad SSOT cada 5 minutos. Detecta errores y anomalías automáticamente.')}

          <!-- Ecosystem Brain -->
          ${this.renderBrainBranch('🌍 Ecosystem Brain', ecosystemBrain, health.ecosystemBrain, [
            { label: 'Módulos Totales', value: ecosystemBrain?.totalModules || 0, icon: '📦' },
            { label: 'Archivos Escaneados', value: (ecosystemBrain?.totalFiles || 0).toLocaleString(), icon: '📄' },
            { label: 'Endpoints', value: (ecosystemBrain?.totalEndpoints || 0).toLocaleString(), icon: '🔌' },
            { label: 'Líneas de Código', value: (ecosystemBrain?.totalLines || 0).toLocaleString(), icon: '💻' },
            { label: 'Aplicaciones', value: ecosystemBrain?.applications || 0, icon: '📱' }
          ], ecosystemBrain?.modulesByCategory ? [
            this.renderBrainSubBranch('📂 Módulos por Categoría',
              Object.entries(ecosystemBrain.modulesByCategory).map(([cat, count]) => ({
                name: cat,
                stats: count,
                label: 'módulos'
              }))
            )
          ] : [], '🔍 Introspección de código vivo. Escanea TODO el código automáticamente sin configuración: detecta módulos, endpoints, archivos, workflows. Genera metadata fresco continuamente.')}

          <!-- Roadmap -->
          ${this.renderBrainBranch('🗺️ Roadmap', roadmap, 'healthy', [
            { label: 'Fases Totales', value: roadmap?.totalPhases || 0, icon: '📋' },
            { label: 'Completadas', value: roadmap?.completedPhases || 0, icon: '✅' },
            { label: 'En Progreso', value: roadmap?.inProgressPhases || 0, icon: '🔄' },
            { label: 'Planeadas', value: roadmap?.plannedPhases || 0, icon: '📝' }
          ], [], '🗺️ Gestión de proyecto. Tracking de fases, tareas, progreso. Incluye cálculo de camino crítico (CPM) y diagramas PERT para planificación óptima.')}

          <!-- Metadata Writer -->
          ${this.renderBrainBranch('📝 Metadata Writer', metadataWriter, metadataWriter?.running ? 'healthy' : 'stopped', [
            { label: 'Estado', value: metadataWriter?.running ? 'Activo' : 'Detenido', icon: metadataWriter?.running ? '🟢' : '🔴' },
            { label: 'Última Actualización', value: metadataWriter?.lastUpdate ? new Date(metadataWriter.lastUpdate).toLocaleTimeString() : 'N/A', icon: '⏰' },
            { label: 'Updates Totales', value: metadataWriter?.updateCount || 0, icon: '🔄' }
          ], [], '⏰ Auto-actualización periódica. Reescribe engineering-metadata.js cada 5 minutos con datos frescos del Ecosystem Brain. Mantiene backups automáticos (últimos 10).')}

          <!-- Piezas Sueltas (Loose Pieces Detection) -->
          ${this.renderBrainBranch('🔍 Detección de Piezas Sueltas',
            loosePieces,
            loosePieces?.totalLoosePieces > 0 ? 'unhealthy' : 'healthy', [
            { label: 'Total Detectadas', value: loosePieces?.totalLoosePieces || 0, icon: loosePieces?.totalLoosePieces > 0 ? '⚠️' : '✅' },
            { label: 'Routes sin Modelo', value: loosePieces?.byCategory?.routesWithoutModel || 0, icon: '📂' },
            { label: 'Servicios sin Routes', value: loosePieces?.byCategory?.servicesWithoutRoutes || 0, icon: '⚙️' },
            { label: 'Frontends sin Backend', value: loosePieces?.byCategory?.frontendsWithoutBackend || 0, icon: '🎨' }
          ], loosePieces?.totalLoosePieces > 0 ? [
            this.renderLoosePiecesDetails(loosePieces.categories)
          ] : [], '🔎 Detección de arquitectura. Identifica código desconectado: routes sin modelos (severidad medium), servicios sin routes (low), frontends sin backend (high). Ayuda a optimizar la arquitectura.')}
        </div>

        <!-- Alerta de Piezas Sueltas -->
        ${loosePieces?.totalLoosePieces > 0 ? `
          <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-top: 20px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; display: flex; align-items: center; gap: 10px;">
              ⚠️ Piezas Sueltas Detectadas
            </h3>
            <p style="color: #78350f; margin: 0 0 10px 0; font-size: 14px;">
              El Brain detectó ${loosePieces.totalLoosePieces} componentes que no están conectados o referenciados.
              Revisa los detalles arriba para optimizar la arquitectura.
            </p>
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * Renderizar card de salud
   */
  renderHealthCard(title, status, value, label, tooltip = '') {
    const healthIcons = {
      excellent: '🟢',
      good: '🟡',
      degraded: '🟠',
      critical: '🔴',
      healthy: '✅',
      unhealthy: '❌',
      stopped: '⏸️',
      unavailable: '⚫'
    };

    const colors = {
      excellent: '#10b981',
      good: '#f59e0b',
      degraded: '#f97316',
      critical: '#ef4444',
      healthy: '#10b981',
      unhealthy: '#ef4444',
      stopped: '#6b7280',
      unavailable: '#9ca3af'
    };

    const icon = healthIcons[status] || '⚫';
    const color = colors[status] || '#6b7280';

    return `
      <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid ${color}; position: relative; transition: transform 0.2s, box-shadow 0.2s; cursor: help;"
           onmouseenter="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
           onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'"
           title="${tooltip.replace(/"/g, '&quot;')}">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <span style="font-size: 24px;">${icon}</span>
          <h3 style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">${title}</h3>
        </div>
        <div style="font-size: 32px; font-weight: 700; color: ${color}; margin-bottom: 5px;">${value}</div>
        <div style="color: #6b7280; font-size: 12px;">${label}</div>
        ${tooltip ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 11px; line-height: 1.5;">${tooltip}</p>
          </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * Renderizar rama del Brain
   */
  renderBrainBranch(title, data, status, metrics, subBranches = [], description = '') {
    if (!data) return '';

    const healthIcons = {
      healthy: '✅',
      unhealthy: '❌',
      stopped: '⏸️',
      unavailable: '⚫'
    };

    const icon = healthIcons[status] || '⚫';

    return `
      <div style="margin-bottom: 25px; padding-left: 20px; border-left: 3px solid #e5e7eb;">
        <h3 style="color: #111827; margin: 0 0 10px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
          ${title} ${icon}
        </h3>

        ${description ? `
          <div style="background: #eff6ff; padding: 10px 12px; border-radius: 6px; margin-bottom: 15px; border-left: 3px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 12px; line-height: 1.6;">${description}</p>
          </div>
        ` : ''}

        <!-- Métricas -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
          ${metrics.map(m => `
            <div style="background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 3px solid #3b82f6;">
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${m.icon} ${m.label}</div>
              <div style="color: #111827; font-size: 20px; font-weight: 600;">${m.value}</div>
            </div>
          `).join('')}
        </div>

        <!-- Sub-ramas -->
        ${subBranches.join('')}
      </div>
    `;
  },

  /**
   * Renderizar sub-rama del Brain
   */
  renderBrainSubBranch(title, items) {
    return `
      <div style="margin-left: 25px; margin-top: 15px; padding-left: 15px; border-left: 2px dashed #d1d5db;">
        <h4 style="color: #374151; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">${title}</h4>
        <div style="display: grid; gap: 8px;">
          ${items.map(item => `
            <div style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
              <span style="color: #374151;">${item.name}</span>
              <span style="color: #3b82f6; font-weight: 600;">${item.stats} ${item.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Renderizar detalles de piezas sueltas
   */
  renderLoosePiecesDetails(categories) {
    const allPieces = [
      ...(categories.routesWithoutModel || []).map(p => ({ ...p, category: 'Routes sin Modelo', icon: '📂' })),
      ...(categories.servicesWithoutRoutes || []).map(p => ({ ...p, category: 'Servicios sin Routes', icon: '⚙️' })),
      ...(categories.frontendsWithoutBackend || []).map(p => ({ ...p, category: 'Frontends sin Backend', icon: '🎨' }))
    ];

    if (allPieces.length === 0) return '';

    // Severity colors
    const severityColors = {
      high: '#dc2626',
      medium: '#f59e0b',
      low: '#6b7280'
    };

    return `
      <div style="margin-left: 25px; margin-top: 15px; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 3px solid #f59e0b;">
        <h4 style="color: #92400e; margin: 0 0 15px 0; font-size: 14px; font-weight: 600;">⚠️ Detalles de Piezas Sueltas</h4>
        <div style="display: grid; gap: 10px; max-height: 400px; overflow-y: auto;">
          ${allPieces.map(piece => `
            <div style="background: white; padding: 12px; border-radius: 4px; border-left: 3px solid ${severityColors[piece.severity] || '#6b7280'};">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 16px;">${piece.icon}</span>
                <span style="color: #374151; font-weight: 600; font-size: 12px;">${piece.category}</span>
                <span style="background: ${severityColors[piece.severity] || '#6b7280'}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; text-transform: uppercase;">
                  ${piece.severity}
                </span>
              </div>
              <div style="color: #6b7280; font-size: 12px; font-family: 'Courier New', monospace; margin-bottom: 6px;">
                📄 ${piece.file || piece.routeName || piece.serviceName || piece.endpoint}
              </div>
              <div style="color: #3b82f6; font-size: 11px; font-style: italic;">
                💡 ${piece.suggestion}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * VISTA: Camino Crítico - CPM/PERT Analysis
   */
  async renderCriticalPathView() {
    if (!this.metadata) return '<p>Cargando...</p>';

    try {
      // Fetch análisis de camino crítico
      const response = await fetch('/api/critical-path/analyze');
      const { analysis } = await response.json();

      // Fetch estadísticas
      const statsResponse = await fetch('/api/critical-path/statistics');
      const { statistics } = await statsResponse.json();

      // Fetch sesiones activas de coordinación
      let sessions = [];
      let locks = { fileLocks: {}, tableLocks: {}, taskAssignments: {} };
      try {
        const sessionsResponse = await fetch('/api/coordination/sessions-with-tasks');
        const sessionsData = await sessionsResponse.json();
        if (sessionsData.success) sessions = sessionsData.sessions;

        const locksResponse = await fetch('/api/coordination/locks');
        const locksData = await locksResponse.json();
        if (locksData.success) locks = locksData;
      } catch (e) {
        console.log('No hay sistema de coordinación activo');
      }

      // Obtener info de roadmap para las tareas
      const roadmap = this.metadata.roadmap || {};

      return `
        <div class="critical-path-container" style="padding: 20px;">
          <!-- Header -->
          <div class="cp-header" style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 10px 0; color: #374151; display: flex; align-items: center; gap: 10px;">
              <span>🎯</span>
              <span>Camino Crítico - Programación CPM/PERT + Coordinación</span>
            </h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Gestión inteligente de tareas con coordinación multi-sesión (Claude + Humanos)
            </p>
          </div>

          <!-- Panel de Sesiones Activas -->
          ${sessions.length > 0 ? `
            <div class="cp-sessions" style="margin-bottom: 30px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 20px; border: 1px solid #bfdbfe;">
              <h3 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 10px; font-size: 18px;">
                <span>👥</span>
                <span>Equipo Activo (${sessions.length} sesiones)</span>
                <button onclick="window.EngineeringDashboard.loadCriticalPathView()" style="margin-left: auto; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">🔄 Refresh</button>
              </h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                ${sessions.map(s => `
                  <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 15px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                      <span style="font-size: 24px;">${s.type === 'claude' ? '🤖' : '👤'}</span>
                      <div>
                        <div style="font-weight: 600;">${s.name}</div>
                        <div style="font-size: 11px; opacity: 0.7;">Token: ${s.token}</div>
                      </div>
                      <span style="margin-left: auto; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${s.status === 'working' ? '#22c55e' : s.status === 'idle' ? '#f59e0b' : '#6b7280'};">${s.status.toUpperCase()}</span>
                    </div>
                    ${s.currentTask ? `
                      <div style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 10px; margin-bottom: 10px;">
                        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">📋 Trabajando en:</div>
                        <div style="font-weight: 600; color: #fbbf24;">${s.currentTask.taskId}: ${s.currentTask.taskName}</div>
                        <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Fase: ${s.currentTask.phaseName}</div>
                        <div style="font-size: 11px; opacity: 0.7;">🔒 ${s.currentTask.lockedFiles?.length || 0} archivos, ${s.currentTask.lockedTables?.length || 0} tablas</div>
                      </div>
                      <button onclick="window.EngineeringDashboard.forceReleaseTask('${s.currentTask.taskId}')" style="width: 100%; background: #dc2626; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">⚠️ Forzar Liberación de Tarea</button>
                    ` : `
                      <div style="text-align: center; padding: 10px; opacity: 0.5; font-size: 13px;">Sin tarea asignada</div>
                    `}
                    <button onclick="window.EngineeringDashboard.forceReleaseSession('${s.token}')" style="width: 100%; background: transparent; color: #f87171; border: 1px solid #f87171; padding: 6px; border-radius: 6px; cursor: pointer; font-size: 11px; margin-top: 8px;">🗑️ Cerrar Sesión Completa</button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : `
            <div style="margin-bottom: 30px; background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 10px;">👥</div>
              <div style="color: #64748b; font-weight: 500;">No hay sesiones de coordinación activas</div>
              <div style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Las sesiones de Claude/Humanos aparecerán aquí cuando se registren</div>
            </div>
          `}

          <!-- Locks Activos -->
          ${Object.keys(locks.taskAssignments).length > 0 ? `
            <div style="margin-bottom: 20px; background: #fef3c7; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">🔒</span>
              <span style="color: #92400e; font-weight: 500;">${Object.keys(locks.taskAssignments).length} tareas bloqueadas, ${Object.keys(locks.fileLocks).length} archivos, ${Object.keys(locks.tableLocks).length} tablas</span>
            </div>
          ` : ''}

          <!-- Estadísticas Globales -->
          <div class="cp-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div class="stat-card critical" style="background: #ffffff !important; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2); border-left: 4px solid #dc2626;">
              <div style="font-size: 14px; color: #dc2626 !important; font-weight: 600; margin-bottom: 8px;">⚠️ Tareas Críticas</div>
              <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px; color: #b91c1c !important;">${statistics.critical}</div>
              <div style="font-size: 12px; color: #991b1b !important; font-weight: 500;">de ${statistics.pending} pendientes</div>
            </div>

            <div class="stat-card" style="background: #ffffff !important; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2); border-left: 4px solid #3b82f6;">
              <div style="font-size: 14px; color: #3b82f6 !important; font-weight: 600; margin-bottom: 8px;">📅 Duración Proyecto</div>
              <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px; color: #2563eb !important;">${statistics.projectDuration}</div>
              <div style="font-size: 12px; color: #1d4ed8 !important; font-weight: 500;">días estimados</div>
            </div>

            <div class="stat-card" style="background: #ffffff !important; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2); border-left: 4px solid #10b981;">
              <div style="font-size: 14px; color: #10b981 !important; font-weight: 600; margin-bottom: 8px;">✅ Progreso Global</div>
              <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px; color: #059669 !important;">${statistics.completionPercentage}%</div>
              <div style="font-size: 12px; color: #047857 !important; font-weight: 500;">${statistics.completed} de ${statistics.total} completadas</div>
            </div>

            <div class="stat-card" style="background: #ffffff !important; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.2); border-left: 4px solid #8b5cf6;">
              <div style="font-size: 14px; color: #8b5cf6 !important; font-weight: 600; margin-bottom: 8px;">⏱️ Holgura Promedio</div>
              <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px; color: #7c3aed !important;">${statistics.averageSlack}</div>
              <div style="font-size: 12px; color: #6d28d9 !important; font-weight: 500;">días de slack</div>
            </div>
          </div>

          <!-- Tareas Críticas -->
          ${analysis.criticalTasks > 0 ? `
            <div class="cp-section" style="margin-bottom: 40px;">
              <h3 style="margin: 0 0 20px 0; color: #dc2626; display: flex; align-items: center; gap: 10px; font-size: 20px;">
                <span>⚠️</span>
                <span>Tareas Críticas (Slack = 0)</span>
              </h3>
              <div class="tasks-grid" style="display: flex; flex-direction: column; gap: 15px;">
                ${analysis.criticalPath.map(task => {
                  const phase = roadmap[task.phaseKey] || {};
                  const roadmapTask = phase.tasks?.find(t => t.id === task.id) || {};
                  const taskAssignment = locks.taskAssignments[task.id];
                  const isAssigned = !!taskAssignment;
                  const assignedToName = taskAssignment?.sessionName || roadmapTask.assignedTo || '';
                  const assignedType = taskAssignment?.sessionName?.toLowerCase().includes('claude') ? 'claude' : 'human';
                  return `
                  <div class="task-card critical" style="background: white; border-left: 4px solid ${isAssigned ? '#f59e0b' : '#dc2626'}; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s;" onmouseenter="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseleave="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                    ${isAssigned ? `
                      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 12px 16px; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                          <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">${assignedType === 'claude' ? '🤖' : '👤'}</span>
                            <div>
                              <div style="font-size: 11px; color: #92400e; text-transform: uppercase; font-weight: 700;">🔒 TAREA ASIGNADA</div>
                              <div style="font-size: 14px; color: #78350f; font-weight: 600;">${assignedToName}</div>
                            </div>
                          </div>
                          <button onclick="window.EngineeringDashboard.releaseTask('${task.id}')" style="background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            🔓 Liberar
                          </button>
                        </div>
                        <button onclick="window.EngineeringDashboard.copyCloseInstructions('${task.id}', '${task.phaseKey}', \`${(task.name || '').replace(/`/g, "'").replace(/\\/g, '')}\`)" style="width: 100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                          <span>📋</span> Copiar Instrucciones de Cierre para Claude
                        </button>
                      </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                      <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                          <span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase;">⚠️ CRÍTICA</span>
                          <span style="background: #dbeafe; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;" title="${task.phaseKey}">${phase.name || task.phaseKey}</span>
                          ${roadmapTask.assignedTo && !isAssigned ? `<span style="background: #f3e8ff; color: #7c3aed; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">👤 ${roadmapTask.assignedTo}</span>` : ''}
                        </div>
                        <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 16px; font-weight: 600;">${task.id}: ${task.name}</h4>
                        ${phase.description ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280; line-height: 1.5; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #3b82f6;">📋 <strong>Fase:</strong> ${phase.description}</p>` : ''}
                        ${roadmapTask.estimatedEffort ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #059669; font-weight: 500;">⏱️ Esfuerzo estimado: ${roadmapTask.estimatedEffort}</p>` : ''}
                        ${roadmapTask.dependencies?.length > 0 ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #f59e0b;">🔗 Depende de: ${roadmapTask.dependencies.join(', ')}</p>` : ''}
                        <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #374151 !important; background: #f8fafc; padding: 10px 12px; border-radius: 6px; margin-top: 10px;">
                          <span title="Duración estimada" style="color: #374151 !important;"><strong style="color: #374151 !important;">📅 Duración:</strong> ${task.duration} días</span>
                          <span title="Earliest Start" style="color: #374151 !important;"><strong style="color: #374151 !important;">ES:</strong> ${task.es}</span>
                          <span title="Earliest Finish" style="color: #374151 !important;"><strong style="color: #374151 !important;">EF:</strong> ${task.ef}</span>
                          <span title="Latest Start" style="color: #374151 !important;"><strong style="color: #374151 !important;">LS:</strong> ${task.ls}</span>
                          <span title="Latest Finish" style="color: #374151 !important;"><strong style="color: #374151 !important;">LF:</strong> ${task.lf}</span>
                          <span title="Slack/Float" style="color: #dc2626 !important; font-weight: 600;"><strong style="color: #dc2626 !important;">⏱️ Slack:</strong> ${task.slack} días</span>
                          <span title="Prioridad" style="color: #7c3aed !important; font-weight: 600;"><strong style="color: #7c3aed !important;">🎯 Prioridad:</strong> ${task.priority}/10</span>
                        </div>
                      </div>
                    </div>
                    <div class="task-actions" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                      <button onclick="window.EngineeringDashboard.assignToClaude('${task.id}', '${task.phaseKey}', \`${(task.name || '').replace(/`/g, '').replace(/\$/g, '')}\`)" ${isAssigned ? 'disabled' : ''} style="flex: 1; min-width: 150px; background: ${isAssigned ? '#94a3b8' : '#3b82f6'} !important; color: #ffffff !important; border: none; padding: 12px 16px; border-radius: 6px; font-weight: 600; cursor: ${isAssigned ? 'not-allowed' : 'pointer'}; font-size: 14px; text-shadow: none; opacity: ${isAssigned ? '0.6' : '1'};">
                        🤖 Asignar a Claude
                      </button>
                      <button onclick="window.EngineeringDashboard.assignToHuman('${task.id}', '${task.phaseKey}')" ${isAssigned ? 'disabled' : ''} style="flex: 1; min-width: 150px; background: ${isAssigned ? '#f1f5f9' : '#ffffff'} !important; color: ${isAssigned ? '#94a3b8' : '#3b82f6'} !important; border: 2px solid ${isAssigned ? '#cbd5e1' : '#3b82f6'}; padding: 12px 16px; border-radius: 6px; font-weight: 600; cursor: ${isAssigned ? 'not-allowed' : 'pointer'}; font-size: 14px; opacity: ${isAssigned ? '0.6' : '1'};">
                        👤 Asignar a Humano
                      </button>
                      <button onclick="window.EngineeringDashboard.completeTask('${task.id}', '${task.phaseKey}')" style="flex: 1; min-width: 150px; background: #10b981 !important; color: #ffffff !important; border: none; padding: 12px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; text-shadow: none;">
                        ✅ Marcar Completada
                      </button>
                      <button onclick="window.EngineeringDashboard.updatePriority('${task.id}', '${task.phaseKey}')" style="background: #ffffff !important; color: #8b5cf6 !important; border: 2px solid #8b5cf6; padding: 12px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        🎯 Cambiar Prioridad
                      </button>
                    </div>
                    ${roadmapTask.description ? `
                      <div class="task-description" style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border-left: 4px solid #6366f1;">
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6366f1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📝 Descripción de la Tarea:</p>
                        <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.7; white-space: pre-line;">${roadmapTask.description}</p>
                      </div>
                    ` : `
                      <div class="task-description" style="margin-top: 15px; padding: 12px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0; font-size: 12px; color: #92400e;"><strong>⚠️ Sin descripción:</strong> Esta tarea no tiene una descripción detallada. Usa "Asignar a Claude" para agregarla.</p>
                      </div>
                    `}
                  </div>
                `}).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Tareas No Críticas -->
          ${analysis.tasks.filter(t => !t.isCritical && !t.done).length > 0 ? `
            <div class="cp-section">
              <h3 style="margin: 0 0 20px 0; color: #3b82f6; display: flex; align-items: center; gap: 10px; font-size: 20px;">
                <span>📋</span>
                <span>Tareas con Holgura</span>
              </h3>
              <div class="tasks-grid" style="display: flex; flex-direction: column; gap: 15px;">
                ${analysis.tasks.filter(t => !t.isCritical && !t.done).map(task => {
                  const phase = roadmap[task.phaseKey] || {};
                  const roadmapTask = phase.tasks?.find(t => t.id === task.id) || {};
                  const taskAssignment = locks.taskAssignments[task.id];
                  const isAssigned = !!taskAssignment;
                  const assignedToName = taskAssignment?.sessionName || roadmapTask.assignedTo || '';
                  const assignedType = taskAssignment?.sessionName?.toLowerCase().includes('claude') ? 'claude' : 'human';
                  return `
                  <div class="task-card" style="background: white; border-left: 4px solid ${isAssigned ? '#f59e0b' : '#3b82f6'}; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s;" onmouseenter="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseleave="this.style.transform='translateX(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'">
                    ${isAssigned ? `
                      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 12px 16px; margin-bottom: 15px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                          <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">${assignedType === 'claude' ? '🤖' : '👤'}</span>
                            <div>
                              <div style="font-size: 11px; color: #92400e; text-transform: uppercase; font-weight: 700;">🔒 TAREA ASIGNADA</div>
                              <div style="font-size: 14px; color: #78350f; font-weight: 600;">${assignedToName}</div>
                            </div>
                          </div>
                          <button onclick="window.EngineeringDashboard.releaseTask('${task.id}')" style="background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                            🔓 Liberar
                          </button>
                        </div>
                        <button onclick="window.EngineeringDashboard.copyCloseInstructions('${task.id}', '${task.phaseKey}', \`${(task.name || '').replace(/\`/g, "'").replace(/\\/g, '')}\`)" style="width: 100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                          <span>📋</span> Copiar Instrucciones de Cierre para Claude
                        </button>
                      </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                      <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                          <span style="background: #dbeafe; color: #2563eb; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">Slack: ${task.slack}d</span>
                          <span style="background: #f3f4f6; color: #6b7280; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;" title="${task.phaseKey}">${phase.name || task.phaseKey}</span>
                          ${roadmapTask.assignedTo && !isAssigned ? `<span style="background: #f3e8ff; color: #7c3aed; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">👤 ${roadmapTask.assignedTo}</span>` : ''}
                        </div>
                        <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 16px; font-weight: 600;">${task.id}: ${task.name}</h4>
                        ${phase.description ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280; line-height: 1.5; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #10b981;">📋 <strong>Fase:</strong> ${phase.description}</p>` : ''}
                        ${roadmapTask.estimatedEffort ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #059669; font-weight: 500;">⏱️ Esfuerzo estimado: ${roadmapTask.estimatedEffort}</p>` : ''}
                        ${roadmapTask.dependencies?.length > 0 ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #f59e0b;">🔗 Depende de: ${roadmapTask.dependencies.join(', ')}</p>` : ''}
                        <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #374151 !important; background: #f8fafc; padding: 10px 12px; border-radius: 6px; margin-top: 10px;">
                          <span title="Duración estimada" style="color: #374151 !important;"><strong style="color: #374151 !important;">📅 Duración:</strong> ${task.duration} días</span>
                          <span title="Earliest Start" style="color: #374151 !important;"><strong style="color: #374151 !important;">ES:</strong> ${task.es}</span>
                          <span title="Earliest Finish" style="color: #374151 !important;"><strong style="color: #374151 !important;">EF:</strong> ${task.ef}</span>
                          <span title="Latest Start" style="color: #374151 !important;"><strong style="color: #374151 !important;">LS:</strong> ${task.ls}</span>
                          <span title="Latest Finish" style="color: #374151 !important;"><strong style="color: #374151 !important;">LF:</strong> ${task.lf}</span>
                          <span title="Slack/Float" style="color: #10b981 !important; font-weight: 600;"><strong style="color: #10b981 !important;">⏱️ Slack:</strong> ${task.slack} días</span>
                          <span title="Prioridad" style="color: #7c3aed !important; font-weight: 600;"><strong style="color: #7c3aed !important;">🎯 Prioridad:</strong> ${task.priority}/10</span>
                        </div>
                      </div>
                    </div>
                    <div class="task-actions" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                      <button onclick="window.EngineeringDashboard.assignToClaude('${task.id}', '${task.phaseKey}', \`${(task.name || '').replace(/`/g, '').replace(/\$/g, '')}\`)" ${isAssigned ? 'disabled' : ''} style="flex: 1; min-width: 150px; background: ${isAssigned ? '#94a3b8' : '#3b82f6'} !important; color: #ffffff !important; border: none; padding: 12px 16px; border-radius: 6px; font-weight: 600; cursor: ${isAssigned ? 'not-allowed' : 'pointer'}; font-size: 14px; text-shadow: none; opacity: ${isAssigned ? '0.6' : '1'};">
                        🤖 Asignar a Claude
                      </button>
                      <button onclick="window.EngineeringDashboard.assignToHuman('${task.id}', '${task.phaseKey}')" ${isAssigned ? 'disabled' : ''} style="flex: 1; min-width: 150px; background: ${isAssigned ? '#f1f5f9' : '#ffffff'} !important; color: ${isAssigned ? '#94a3b8' : '#3b82f6'} !important; border: 2px solid ${isAssigned ? '#cbd5e1' : '#3b82f6'}; padding: 12px 16px; border-radius: 6px; font-weight: 600; cursor: ${isAssigned ? 'not-allowed' : 'pointer'}; font-size: 14px; opacity: ${isAssigned ? '0.6' : '1'};">
                        👤 Asignar a Humano
                      </button>
                      <button onclick="window.EngineeringDashboard.completeTask('${task.id}', '${task.phaseKey}')" style="flex: 1; min-width: 150px; background: #10b981 !important; color: #ffffff !important; border: none; padding: 12px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; text-shadow: none;">
                        ✅ Marcar Completada
                      </button>
                      <button onclick="window.EngineeringDashboard.updatePriority('${task.id}', '${task.phaseKey}')" style="background: #ffffff !important; color: #8b5cf6 !important; border: 2px solid #8b5cf6; padding: 12px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        🎯 Cambiar Prioridad
                      </button>
                    </div>
                    ${roadmapTask.description ? `
                      <div class="task-description" style="margin-top: 15px; padding: 15px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border-left: 4px solid #10b981;">
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #10b981; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📝 Descripción de la Tarea:</p>
                        <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.7; white-space: pre-line;">${roadmapTask.description}</p>
                      </div>
                    ` : `
                      <div class="task-description" style="margin-top: 15px; padding: 12px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0; font-size: 12px; color: #92400e;"><strong>⚠️ Sin descripción:</strong> Esta tarea no tiene una descripción detallada. Usa "Asignar a Claude" para agregarla.</p>
                      </div>
                    `}
                  </div>
                `}).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Análisis por Phases -->
          <div class="cp-section" style="margin-top: 40px;">
            <h3 style="margin: 0 0 20px 0; color: #374151; display: flex; align-items: center; gap: 10px; font-size: 20px;">
              <span>📊</span>
              <span>Análisis por Phases</span>
            </h3>
            <div style="display: grid; gap: 20px;">
              ${analysis.phases.map(phase => `
                <div class="phase-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; ${phase.isCritical ? 'border-left: 4px solid #dc2626;' : ''}">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        ${phase.isCritical ? '<span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">⚠️ PHASE CRÍTICA</span>' : ''}
                        <span style="background: ${phase.status === 'COMPLETED' ? '#d1fae5' : phase.status === 'IN_PROGRESS' ? '#dbeafe' : '#f3f4f6'}; color: ${phase.status === 'COMPLETED' ? '#065f46' : phase.status === 'IN_PROGRESS' ? '#1e40af' : '#374151'}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">${phase.status}</span>
                      </div>
                      <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 16px; font-weight: 600;">${phase.name}</h4>
                      <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; color: #6b7280;">
                        <span><strong>Total Tareas:</strong> ${phase.totalTasks}</span>
                        <span><strong>✅ Completadas:</strong> ${phase.completedTasks}</span>
                        <span><strong>📋 Pendientes:</strong> ${phase.pendingTasks}</span>
                        <span style="${phase.criticalTasks > 0 ? 'color: #dc2626; font-weight: 600;' : ''}"><strong>⚠️ Críticas:</strong> ${phase.criticalTasks}</span>
                        <span><strong>📈 Progreso:</strong> ${phase.progress}%</span>
                      </div>
                    </div>
                  </div>
                  <div class="progress-bar-container" style="width: 100%; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden;">
                    <div class="progress-bar" style="width: ${phase.progress}%; height: 100%; background: linear-gradient(90deg, #3b82f6 0%, #10b981 100%); transition: width 0.3s;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      `;

    } catch (error) {
      console.error('Error renderizando Critical Path:', error);
      return `
        <div style="padding: 40px; text-align: center;">
          <h3 style="color: #dc2626;">❌ Error al cargar Camino Crítico</h3>
          <p style="color: #6b7280;">${error.message}</p>
          <button onclick="location.reload()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 20px;">
            🔄 Reintentar
          </button>
        </div>
      `;
    }
  },

  /**
   * Calcular Critical Path (CPM - Critical Path Method)
   */
  calculateCriticalPath(roadmap) {
    const phases = Object.entries(roadmap);
    let totalTasks = 0;
    let completedTasks = 0;
    let criticalPath = [];
    let maxDuration = 0;

    // Calcular duración de cada fase
    const phasesWithDuration = phases.map(([key, phase]) => {
      const start = new Date(phase.startDate);
      const end = new Date(phase.estimatedCompletion);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // días

      const tasksCount = phase.tasks ? phase.tasks.length : 0;
      const doneCount = phase.tasks ? phase.tasks.filter(t => t.done).length : 0;

      totalTasks += tasksCount;
      completedTasks += doneCount;

      return {
        key,
        ...phase,
        duration,
        tasksCount,
        doneCount,
        dependencies: phase.dependencies || []
      };
    });

    // Encontrar Critical Path (considerando dependencias)
    // En este caso simplificado, el critical path es la secuencia de fases dependientes
    const visited = new Set();
    const findLongestPath = (phaseKey, currentPath = [], currentDuration = 0) => {
      if (visited.has(phaseKey)) return { path: currentPath, duration: currentDuration };

      const phase = phasesWithDuration.find(p => p.key === phaseKey);
      if (!phase) return { path: currentPath, duration: currentDuration };

      visited.add(phaseKey);
      const newPath = [...currentPath, phaseKey];
      const newDuration = currentDuration + phase.duration;

      if (phase.dependencies && phase.dependencies.length > 0) {
        // Explorar dependencias
        let longestPath = { path: newPath, duration: newDuration };
        phase.dependencies.forEach(dep => {
          const result = findLongestPath(dep, newPath, newDuration);
          if (result.duration > longestPath.duration) {
            longestPath = result;
          }
        });
        return longestPath;
      }

      return { path: newPath, duration: newDuration };
    };

    // Encontrar el camino más largo
    phasesWithDuration.forEach(phase => {
      visited.clear();
      const result = findLongestPath(phase.key);
      if (result.duration > maxDuration) {
        maxDuration = result.duration;
        criticalPath = result.path;
      }
    });

    return {
      totalPhases: phases.length,
      totalTasks,
      completedTasks,
      criticalPathLength: maxDuration,
      criticalPath,
      phases: phasesWithDuration
    };
  },

  /**
   * Renderizar PERT Chart
   */
  renderPERTChart(roadmap, criticalPathData) {
    const { phases, criticalPath } = criticalPathData;

    return `
      <h3 style="margin-bottom: 20px;">🔄 PERT Chart (Program Evaluation Review Technique)</h3>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
        ${phases.map(phase => {
          const isCritical = criticalPath.includes(phase.key);
          const optimistic = Math.ceil(phase.duration * 0.75); // 75% del tiempo estimado
          const mostLikely = phase.duration; // Tiempo estimado
          const pessimistic = Math.ceil(phase.duration * 1.5); // 150% del tiempo estimado
          const expectedTime = Math.ceil((optimistic + 4 * mostLikely + pessimistic) / 6);
          const variance = Math.pow((pessimistic - optimistic) / 6, 2).toFixed(2);

          return `
            <div style="background: ${isCritical ? '#fee2e2' : 'white'}; padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid ${isCritical ? '#ef4444' : '#3b82f6'};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="margin: 0; color: ${isCritical ? '#991b1b' : '#1e40af'};">
                  ${isCritical ? '⚠️ ' : ''}${phase.name}
                </h4>
                ${isCritical ? '<span style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">CRITICAL PATH</span>' : ''}
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; font-size: 0.875rem;">
                <div>
                  <div style="color: #6b7280; font-size: 0.75rem;">Optimista</div>
                  <div style="font-weight: 600;">${optimistic} días</div>
                </div>
                <div>
                  <div style="color: #6b7280; font-size: 0.75rem;">Más Probable</div>
                  <div style="font-weight: 600;">${mostLikely} días</div>
                </div>
                <div>
                  <div style="color: #6b7280; font-size: 0.75rem;">Pesimista</div>
                  <div style="font-weight: 600;">${pessimistic} días</div>
                </div>
                <div>
                  <div style="color: #6b7280; font-size: 0.75rem;">Tiempo Esperado</div>
                  <div style="font-weight: 600; color: #059669;">${expectedTime} días</div>
                </div>
                <div>
                  <div style="color: #6b7280; font-size: 0.75rem;">Varianza</div>
                  <div style="font-weight: 600;">${variance}</div>
                </div>
              </div>
              ${phase.dependencies && phase.dependencies.length > 0 ? `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                  <span style="font-size: 0.75rem; color: #6b7280;">Depende de:</span>
                  <span style="font-size: 0.875rem; font-weight: 500;"> ${phase.dependencies.join(', ')}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /**
   * Renderizar Dependency Graph
   */
  renderDependenciesGraph(roadmap, criticalPathData) {
    const { phases, criticalPath } = criticalPathData;

    return `
      <h3 style="margin-bottom: 20px;">🔗 Grafo de Dependencias</h3>
      <div style="background: #f9fafb; padding: 30px; border-radius: 8px; overflow-x: auto;">
        <svg id="dependency-graph-svg" width="100%" height="600" style="border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
          <!-- El grafo se renderizará con JavaScript después del DOM -->
        </svg>
      </div>

      <div style="margin-top: 20px;">
        <h4>📊 Análisis de Dependencias:</h4>
        <ul style="list-style: none; padding: 0;">
          ${phases.map(phase => `
            <li style="padding: 10px; margin-bottom: 10px; background: ${criticalPath.includes(phase.key) ? '#fee2e2' : 'white'}; border-radius: 8px; border-left: 4px solid ${criticalPath.includes(phase.key) ? '#ef4444' : '#3b82f6'};">
              <strong>${phase.name}</strong>
              ${phase.dependencies && phase.dependencies.length > 0
                ? `<br><span style="color: #6b7280; font-size: 0.875rem;">→ Bloquea: ${phases.filter(p => p.dependencies && p.dependencies.includes(phase.key)).map(p => p.name).join(', ') || 'Ninguna'}</span>`
                : '<br><span style="color: #22c55e; font-size: 0.875rem;">✓ Sin dependencias</span>'
              }
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  },

  /**
   * Renderizar detalles de fases
   */
  renderPhaseDetails(roadmap, criticalPathData) {
    const { phases, criticalPath } = criticalPathData;

    return `
      <div style="display: grid; gap: 20px;">
        ${phases.map(phase => {
          const isCritical = criticalPath.includes(phase.key);
          const progress = phase.tasksCount > 0 ? Math.round((phase.doneCount / phase.tasksCount) * 100) : 0;

          return `
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid ${isCritical ? '#ef4444' : '#3b82f6'};">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                  <h4 style="margin: 0 0 5px 0; color: ${isCritical ? '#991b1b' : '#1e40af'};">
                    ${isCritical ? '⚠️ ' : ''}${phase.name}
                  </h4>
                  <div style="font-size: 0.875rem; color: #6b7280;">
                    ${new Date(phase.startDate).toLocaleDateString('es-AR')} - ${new Date(phase.estimatedCompletion).toLocaleDateString('es-AR')}
                  </div>
                </div>
                <span class="status-badge ${(phase.status || 'unknown').toLowerCase()}">${this.getStatusBadge(phase.status)}</span>
              </div>

              <!-- Progress Bar -->
              <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="font-size: 0.875rem; font-weight: 500;">Progreso: ${progress}%</span>
                  <span style="font-size: 0.875rem; color: #6b7280;">${phase.doneCount} / ${phase.tasksCount} tareas</span>
                </div>
                <div style="height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                  <div style="height: 100%; width: ${progress}%; background: ${isCritical ? '#ef4444' : '#22c55e'}; transition: width 0.3s;"></div>
                </div>
              </div>

              <!-- Tasks -->
              ${phase.tasks && phase.tasks.length > 0 ? `
                <div style="margin-top: 15px;">
                  <h5 style="font-size: 0.875rem; color: #6b7280; margin-bottom: 10px;">Tareas:</h5>
                  <div style="display: grid; gap: 5px;">
                    ${phase.tasks.map(task => `
                      <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: ${task.done ? '#dcfce7' : '#f9fafb'}; border-radius: 4px;">
                        <span style="font-size: 1.2rem;">${task.done ? '✅' : '⏸️'}</span>
                        <span style="flex: 1; font-size: 0.875rem; ${task.done ? 'text-decoration: line-through; color: #6b7280;' : ''}">${task.name}</span>
                        ${task.assignedTo ? `<span style="font-size: 0.75rem; color: #6b7280; background: white; padding: 2px 6px; border-radius: 4px;">${task.assignedTo}</span>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
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

    // Regenerar LLM Context
    const btnRegenerateLLM = document.getElementById('btn-regenerate-llm-context');
    if (btnRegenerateLLM) {
      btnRegenerateLLM.addEventListener('click', async () => {
        await this.regenerateLLMContext();
      });
    }

    // ULTIMATE TEST (2026-01-05)
    const btnUltimateTest = document.getElementById('btn-ultimate-test');
    if (btnUltimateTest) {
      btnUltimateTest.addEventListener('click', async () => {
        await this.runUltimateTest();
      });
    }

    // Ver Detalles Completos buttons (Applications y Modules)
    document.querySelectorAll('.btn-view-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const moduleKey = e.currentTarget.getAttribute('data-app') || e.currentTarget.getAttribute('data-module');
        const moduleData = this.metadata.modules[moduleKey] || this.metadata.applications[moduleKey];
        if (moduleData) {
          this.showDetailsModal(moduleKey, moduleData);
        }
      });
    });

    // Ver Código buttons (Frontend/Backend Files tabs)
    document.querySelectorAll('.btn-view-code').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const filePath = e.currentTarget.getAttribute('data-file-path');
        const lines = e.currentTarget.getAttribute('data-lines');
        if (filePath) {
          await this.showCodeModal(filePath, lines);
        }
      });
    });

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

    // Gantt sub-tabs switching (Gantt / PERT / Dependencies)
    document.querySelectorAll('.gantt-subtab').forEach(subtab => {
      subtab.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-gantt-view');

        // Update active state
        document.querySelectorAll('.gantt-subtab').forEach(t => {
          t.classList.remove('active');
          t.style.background = '#e5e7eb';
          t.style.color = '#374151';
        });
        e.currentTarget.classList.add('active');
        e.currentTarget.style.background = '#3b82f6';
        e.currentTarget.style.color = 'white';

        // Show/hide views
        document.querySelectorAll('.gantt-view').forEach(v => {
          v.classList.remove('active');
          v.style.display = 'none';
        });

        const targetView = document.getElementById(`${view}-chart-view`);
        if (targetView) {
          targetView.classList.add('active');
          targetView.style.display = 'block';
        }
      });
    });

    // Initialize Frappe Gantt if on gantt view
    if (this.currentView === 'gantt') {
      this.initializeFrappeGantt();
    }
  },

  /**
   * Initialize Frappe Gantt Chart
   */
  initializeFrappeGantt() {
    // Wait for next tick to ensure DOM is ready
    setTimeout(() => {
      const ganttContainer = document.getElementById('gantt-chart');
      if (!ganttContainer || !this.metadata || !window.Gantt) {
        console.warn('⚠️ [GANTT] Container, metadata, or Frappe Gantt not available');
        return;
      }

      const { roadmap } = this.metadata;
      const criticalPathData = this.calculateCriticalPath(roadmap);

      // Convert roadmap phases to Gantt tasks format
      const ganttTasks = criticalPathData.phases.map(phase => {
        const isCritical = criticalPathData.criticalPath.includes(phase.key);

        return {
          id: phase.key,
          name: phase.name,
          start: phase.startDate,
          end: phase.estimatedCompletion,
          progress: phase.progress || 0,
          dependencies: (phase.dependencies || []).join(', '),
          custom_class: isCritical ? 'bar-critical' : (phase.status === 'COMPLETE' ? 'bar-complete' : (phase.status === 'IN_PROGRESS' ? 'bar-progress' : 'bar-planned'))
        };
      });

      // Clear previous gantt if exists
      ganttContainer.innerHTML = '';

      try {
        // Initialize Frappe Gantt
        const gantt = new Gantt(ganttContainer, ganttTasks, {
          view_mode: 'Week',
          date_format: 'YYYY-MM-DD',
          language: 'es',
          custom_popup_html: (task) => {
            const phase = criticalPathData.phases.find(p => p.key === task.id);
            const isCritical = criticalPathData.criticalPath.includes(task.id);

            return `
              <div class="gantt-popup" style="padding: 15px; min-width: 300px;">
                <h4 style="margin: 0 0 10px 0; color: ${isCritical ? '#991b1b' : '#1e40af'};">
                  ${isCritical ? '⚠️ ' : ''}${task.name}
                </h4>
                ${isCritical ? '<div style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; margin-bottom: 10px; display: inline-block;">CRITICAL PATH</div>' : ''}
                <div style="margin-bottom: 8px;">
                  <strong>Fechas:</strong> ${new Date(task._start).toLocaleDateString('es-AR')} - ${new Date(task._end).toLocaleDateString('es-AR')}
                </div>
                <div style="margin-bottom: 8px;">
                  <strong>Duración:</strong> ${phase.duration} días
                </div>
                <div style="margin-bottom: 8px;">
                  <strong>Progreso:</strong> ${task.progress}%
                </div>
                <div style="margin-bottom: 8px;">
                  <strong>Tareas:</strong> ${phase.doneCount} / ${phase.tasksCount} completadas
                </div>
                ${phase.dependencies && phase.dependencies.length > 0
                  ? `<div style="margin-bottom: 8px;"><strong>Depende de:</strong> ${phase.dependencies.join(', ')}</div>`
                  : ''
                }
              </div>
            `;
          }
        });

        // Add custom CSS for critical path
        const style = document.createElement('style');
        style.textContent = `
          .bar-critical .bar { fill: #ef4444 !important; }
          .bar-critical .bar-progress { fill: #dc2626 !important; }
          .bar-complete .bar { fill: #22c55e !important; }
          .bar-complete .bar-progress { fill: #16a34a !important; }
          .bar-progress .bar { fill: #3b82f6 !important; }
          .bar-progress .bar-progress { fill: #2563eb !important; }
          .bar-planned .bar { fill: #9ca3af !important; }
          .bar-planned .bar-progress { fill: #6b7280 !important; }
        `;
        if (!document.getElementById('gantt-custom-styles')) {
          style.id = 'gantt-custom-styles';
          document.head.appendChild(style);
        }

        console.log('✅ [GANTT] Frappe Gantt initialized with', ganttTasks.length, 'tasks');
      } catch (error) {
        console.error('❌ [GANTT] Error initializing Frappe Gantt:', error);
        ganttContainer.innerHTML = `
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <h4 style="margin: 0 0 10px 0; color: #991b1b;">❌ Error al cargar Gantt Chart</h4>
            <p style="margin: 0; color: #7f1d1d;">${error.message}</p>
            <p style="margin: 10px 0 0 0; color: #7f1d1d; font-size: 0.875rem;">
              Por favor, verifica que la librería Frappe Gantt esté cargada correctamente.
            </p>
          </div>
        `;
      }
    }, 200);
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
   * Regenerar llm-context.json para IAs
   */
  async regenerateLLMContext() {
    const btn = document.getElementById('btn-regenerate-llm-context');
    const originalText = btn.innerHTML;

    try {
      btn.innerHTML = '⏳ Regenerando...';
      btn.disabled = true;

      console.log('🤖 [LLM-CONTEXT] Regenerando llm-context.json...');

      const response = await fetch('/api/brain/update-llm-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ [LLM-CONTEXT] Regeneración exitosa:', result.stats);

        // Mostrar modal de éxito con stats
        this.showSuccessModal('🤖 LLM Context Regenerado Exitosamente', `
          <div style="padding: 20px;">
            <p style="margin-bottom: 20px;">El archivo <code>llm-context.json</code> ha sido regenerado con éxito.</p>

            <div style="background: #f8f9ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #667eea;">📊 Estadísticas</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Total módulos: <strong>${result.stats.total_modules}</strong></li>
                <li>Módulos visibles: <strong>${result.stats.client_visible_modules}</strong></li>
                <li>Líneas de metadata: <strong>${result.stats.engineering_metadata_lines.toLocaleString()}</strong></li>
                <li>Versión: <strong>${result.stats.version}</strong></li>
                <li>Generado: <strong>${new Date(result.stats.generated_at).toLocaleString()}</strong></li>
              </ul>
            </div>

            <div style="background: #fff8e1; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
              <h4 style="margin: 0 0 10px 0; color: #f57c00;">🎯 Estrategia</h4>
              <p style="margin: 0; font-size: 0.9rem;">
                <strong>${result.strategy}</strong><br>
                ${result.competitive_advantage}
              </p>
            </div>

            <div style="margin-top: 20px; text-align: center;">
              <a href="/llm-context.json" target="_blank" style="color: #667eea; text-decoration: underline; margin-right: 15px;">
                📄 Ver llm-context.json
              </a>
              <a href="/for-ai-agents.html" target="_blank" style="color: #667eea; text-decoration: underline;">
                🤖 Ver página para IAs
              </a>
            </div>
          </div>
        `);
      } else {
        console.error('❌ [LLM-CONTEXT] Error:', result.error);
        this.showErrorModal('Error Regenerando LLM Context', result.error);
      }

    } catch (error) {
      console.error('❌ [LLM-CONTEXT] Error en regeneración:', error);
      this.showErrorModal('Error Regenerando LLM Context', error.message);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  /**
   * Mostrar modal de éxito
   */
  showSuccessModal(title, content) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.7); z-index: 999999; display: flex;
      align-items: center; justify-content: center; padding: 20px;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white; border-radius: 12px; max-width: 600px; width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    modal.innerHTML = `
      <div style="padding: 30px;">
        <h3 style="margin: 0 0 20px 0; color: #10b981; font-size: 1.5rem;">${title}</h3>
        ${content}
        <button id="modal-close" style="
          margin-top: 20px; padding: 10px 30px; background: #10b981; color: white;
          border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; width: 100%;
        ">Cerrar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  },

  /**
   * Mostrar modal de error
   */
  showErrorModal(title, error) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.7); z-index: 999999; display: flex;
      align-items: center; justify-content: center; padding: 20px;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white; border-radius: 12px; max-width: 600px; width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    modal.innerHTML = `
      <div style="padding: 30px;">
        <h3 style="margin: 0 0 20px 0; color: #ef4444; font-size: 1.5rem;">${title}</h3>
        <div style="background: #fee; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
          <p style="margin: 0; color: #991b1b;">${error}</p>
        </div>
        <button id="modal-close" style="
          margin-top: 20px; padding: 10px 30px; background: #ef4444; color: white;
          border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; width: 100%;
        ">Cerrar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  },

  /**
   * Mostrar modal de detalles completos (INTERNO - sin abrir ventanas)
   */
  showDetailsModal(moduleKey, moduleData) {
    // Crear overlay (backdrop)
    const overlay = document.createElement('div');
    overlay.id = 'details-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    // Crear modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      max-width: 1000px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
    `;

    // Contenido del modal
    modal.innerHTML = `
      <div style="padding: 30px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
          <div>
            <h2 style="margin: 0; color: #1e40af; font-size: 28px;">
              ${moduleData.name || moduleKey}
            </h2>
            <div style="margin-top: 8px; display: flex; gap: 10px;">
              ${this.getStatusBadge(moduleData.status)}
              <span style="background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                ${moduleData.category || 'N/A'}
              </span>
              <span style="background: #f0fdf4; color: #15803d; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                ${moduleData.progress || 0}% Completado
              </span>
            </div>
          </div>
          <button id="close-details-modal" style="background: #dc2626; color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 20px; line-height: 1;">✕</button>
        </div>

        <!-- Descripción -->
        ${moduleData.description ? `
          <div style="margin-bottom: 25px; padding: 15px; background: #f9fafb; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 14px; font-weight: 600;">📝 Descripción</h4>
            <p style="margin: 0; color: #6b7280; line-height: 1.6;">${moduleData.description}</p>
          </div>
        ` : ''}

        <!-- Code Location (SI EXISTE) -->
        ${moduleData.codeLocation ? this.renderCodeLocationFull(moduleData.codeLocation) : ''}

        <!-- Features -->
        ${moduleData.features ? `
          <div style="margin-bottom: 25px;">
            <h4 style="margin: 0 0 15px 0; color: #374151; font-size: 16px; font-weight: 600;">⚡ Features</h4>
            ${this.renderModuleFeatures(moduleData.features)}
          </div>
        ` : ''}

        <!-- API Endpoints -->
        ${moduleData.apiEndpoints && moduleData.apiEndpoints.length > 0 ? `
          <div style="margin-bottom: 25px; padding: 15px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
            <h4 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600;">🌐 API Endpoints (${moduleData.apiEndpoints.length})</h4>
            <div style="font-family: 'Courier New', monospace; font-size: 12px; max-height: 200px; overflow-y: auto;">
              ${moduleData.apiEndpoints.map(endpoint => `
                <div style="padding: 6px 0; color: #1e40af;">${endpoint}</div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Tables -->
        ${moduleData.tables && moduleData.tables.length > 0 ? `
          <div style="margin-bottom: 25px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
            <h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 14px; font-weight: 600;">🗄️ Tablas de Base de Datos (${moduleData.tables.length})</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${moduleData.tables.map(table => `
                <span style="background: white; padding: 6px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 12px; color: #78350f;">${table}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Dependencies -->
        ${moduleData.dependencies ? this.renderDependencies(moduleData.dependencies) : ''}

        <!-- Known Issues -->
        ${moduleData.knownIssues && moduleData.knownIssues.length > 0 ? this.renderKnownIssues(moduleData.knownIssues) : ''}

        <!-- Botón cerrar al final -->
        <div style="margin-top: 30px; text-align: center;">
          <button class="close-modal-btn" style="padding: 12px 30px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">
            Cerrar
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event listeners para cerrar
    const closeBtn = overlay.querySelector('#close-details-modal');
    const closeModalBtn = overlay.querySelector('.close-modal-btn');

    const closeModal = () => {
      overlay.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    closeModalBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // ESC para cerrar
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  /**
   * Mostrar código de un archivo en sub-modal
   */
  async showCodeModal(filePath, lines) {
    // Crear overlay de carga
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'code-loading-overlay';
    loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    loadingOverlay.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 12px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">📄</div>
        <div style="font-size: 16px; color: #374151; font-weight: 600;">Cargando código...</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 5px;">${filePath}</div>
      </div>
    `;
    document.body.appendChild(loadingOverlay);

    try {
      // Llamar al endpoint para leer el archivo
      const response = await fetch('/api/engineering/read-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ filePath, lines })
      });

      const result = await response.json();

      // Remover loading
      loadingOverlay.remove();

      if (!result.success) {
        alert(`Error: ${result.error}`);
        return;
      }

      const { data } = result;

      // Crear modal de código
      const overlay = document.createElement('div');
      overlay.id = 'code-modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        background: #1e1e1e;
        border-radius: 12px;
        max-width: 1200px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
      `;

      // Header del modal
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 20px;
        background: #2d2d2d;
        border-bottom: 2px solid #3b82f6;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      header.innerHTML = `
        <div>
          <div style="font-family: 'Courier New', monospace; color: #3b82f6; font-size: 16px; font-weight: 700;">
            📄 ${data.filePath}
          </div>
          <div style="margin-top: 6px; display: flex; gap: 10px; font-size: 12px;">
            <span style="background: #f59e0b; color: white; padding: 3px 10px; border-radius: 6px; font-weight: 600;">
              Líneas ${data.startLine} - ${data.endLine}
            </span>
            <span style="background: #10b981; color: white; padding: 3px 10px; border-radius: 6px; font-weight: 600;">
              Total: ${data.totalLines} líneas
            </span>
          </div>
        </div>
        <button id="close-code-modal" style="background: #dc2626; color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 20px; line-height: 1;">✕</button>
      `;

      // Contenedor de código con scroll
      const codeContainer = document.createElement('div');
      codeContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        background: #1e1e1e;
        padding: 20px;
      `;

      // Pre con el código
      const pre = document.createElement('pre');
      pre.style.cssText = `
        margin: 0;
        font-family: 'Courier New', Consolas, Monaco, monospace;
        font-size: 13px;
        line-height: 1.6;
        color: #d4d4d4;
        white-space: pre;
        overflow-x: auto;
      `;

      // Generar líneas con números
      const codeLines = data.lines.map((line, index) => {
        const lineNumber = data.startLine + index;
        const lineNumberStr = String(lineNumber).padStart(5, ' ');

        // Escapar HTML
        const escapedLine = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

        return `<span style="color: #858585; user-select: none;">${lineNumberStr} │ </span><span style="color: #d4d4d4;">${escapedLine}</span>`;
      }).join('\n');

      pre.innerHTML = codeLines;
      codeContainer.appendChild(pre);

      // Footer con botones
      const footer = document.createElement('div');
      footer.style.cssText = `
        padding: 15px 20px;
        background: #2d2d2d;
        border-top: 1px solid #3f3f3f;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      footer.innerHTML = `
        <div style="color: #9ca3af; font-size: 12px;">
          💡 <strong>Tip:</strong> Presioná ESC para cerrar
        </div>
        <button class="close-code-modal-btn" style="padding: 10px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
          Cerrar
        </button>
      `;

      // Ensamblar modal
      modal.appendChild(header);
      modal.appendChild(codeContainer);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Event listeners para cerrar
      const closeBtn = header.querySelector('#close-code-modal');
      const closeModalBtn = footer.querySelector('.close-code-modal-btn');

      const closeModal = () => {
        overlay.remove();
      };

      closeBtn.addEventListener('click', closeModal);
      closeModalBtn.addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });

      // ESC para cerrar
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          closeModal();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

    } catch (error) {
      loadingOverlay.remove();
      console.error('Error cargando código:', error);
      alert(`Error cargando código: ${error.message}`);
    }
  },

  /**
   * Renderizar ubicación de código COMPLETA (para modal)
   */
  renderCodeLocationFull(codeLocation) {
    if (!codeLocation || (!codeLocation.backend && !codeLocation.frontend)) return '';

    return `
      <div style="margin-bottom: 25px; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #3b82f6; border-radius: 10px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);">
        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #1e40af; display: flex; align-items: center; gap: 10px;">
          📍 Ubicación del Código
          <span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${(codeLocation.backend?.length || 0) + (codeLocation.frontend?.length || 0)} archivos
          </span>
        </h3>

        ${codeLocation.backend && codeLocation.backend.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 700; font-size: 15px; color: #1e40af; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              🔹 Backend (Bk) <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">${codeLocation.backend.length}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${codeLocation.backend.map(file => `
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                  <div style="font-family: 'Courier New', monospace; color: #1e40af; font-weight: 700; font-size: 13px; margin-bottom: 6px;">
                    ${file.file} <span style="color: #f59e0b; background: #fef3c7; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">Líneas ${file.lines}</span>
                  </div>
                  <div style="color: #6b7280; font-size: 12px; line-height: 1.5;">${file.description}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${codeLocation.frontend && codeLocation.frontend.length > 0 ? `
          <div>
            <div style="font-weight: 700; font-size: 15px; color: #059669; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              🔹 Frontend (Fe) <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">${codeLocation.frontend.length}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${codeLocation.frontend.map(file => `
                <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                  <div style="font-family: 'Courier New', monospace; color: #059669; font-weight: 700; font-size: 13px; margin-bottom: 6px;">
                    ${file.file} <span style="color: #f59e0b; background: #fef3c7; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">Líneas ${file.lines}</span>
                  </div>
                  <div style="color: #6b7280; font-size: 12px; line-height: 1.5;">${file.description}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="margin-top: 15px; padding: 10px; background: rgba(255, 255, 255, 0.6); border-radius: 6px; font-size: 11px; color: #6b7280; text-align: center;">
          💡 <strong>Tip:</strong> Usá estas rutas y líneas para navegar directo al código en tu editor
        </div>
      </div>
    `;
  },

  /**
   * Auto-refresh DESACTIVADO - Solo carga al abrir el tab
   */
  startAutoRefresh() {
    // ❌ AUTO-REFRESH DESACTIVADO - Se actualiza solo al abrir el módulo
    // Razón: Resetea el Auto-Healing dashboard mientras está ejecutando

    /* CÓDIGO ORIGINAL COMENTADO:
    // Polling para detectar cambios de otras sesiones (cada 30 segundos - no agresivo)
    this.lastMetadataChecksum = null;

    setInterval(async () => {
      await this.checkForChanges();
    }, 30000); // Cada 30 segundos (no cada 3 para evitar carga innecesaria)

    // Auto-refresh completo cada 5 minutos
    setInterval(() => {
      this.refresh();
    }, 5 * 60 * 1000);
    */
  },

  /**
   * Verificar cambios de otras sesiones
   */
  async checkForChanges() {
    try {
      // Obtener checksum actual de metadata
      const response = await fetch('/api/engineering/metadata');
      const result = await response.json();

      if (!result.success) return;

      // Crear checksum simple del metadata
      const currentChecksum = JSON.stringify(result.data);

      // Primera vez, solo guardar checksum
      if (!this.lastMetadataChecksum) {
        this.lastMetadataChecksum = currentChecksum;
        return;
      }

      // Detectar cambio
      if (currentChecksum !== this.lastMetadataChecksum) {
        console.log('🔔 [SYNC] Cambios detectados en metadata, actualizando...');
        this.showSyncNotification('Metadata actualizado por otra sesión');

        // Actualizar checksum
        this.lastMetadataChecksum = currentChecksum;

        // Refrescar dashboard
        await this.refresh();
      }
    } catch (error) {
      console.error('Error verificando cambios:', error);
    }
  },

  /**
   * Mostrar notificación de sincronización
   */
  showSyncNotification(message) {
    // Crear notificación visual
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999999;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `🔄 ${message}`;

    document.body.appendChild(notification);

    // Remover después de 3 segundos
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  /**
   * Filtrar por estado y búsqueda
   */
  filterByStatus(items) {
    let filtered = items;

    // Filtrar por estado
    if (this.filterStatus !== 'all') {
      const statusFiltered = {};
      Object.entries(filtered).forEach(([key, item]) => {
        if (item.status === this.filterStatus) {
          statusFiltered[key] = item;
        }
      });
      filtered = statusFiltered;
    }

    // Filtrar por búsqueda
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchLower = this.searchTerm.toLowerCase().trim();
      const searchFiltered = {};
      Object.entries(filtered).forEach(([key, item]) => {
        const itemName = (item.name || '').toLowerCase();
        const itemDesc = (item.description || '').toLowerCase();
        const itemKey = key.toLowerCase();

        if (itemName.includes(searchLower) ||
            itemDesc.includes(searchLower) ||
            itemKey.includes(searchLower)) {
          searchFiltered[key] = item;
        }
      });
      filtered = searchFiltered;
    }

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
   * VISTA: Módulos Comerciales - Single Source of Truth
   */
  async loadCommercialModulesView() {
    console.log('💰 [COMMERCIAL] Cargando vista de módulos comerciales...');

    const container = document.getElementById('commercial-modules-dynamic');
    if (!container) {
      console.error('❌ [COMMERCIAL] Container no encontrado');
      return;
    }

    try {
      // Fetch módulos comerciales desde API
      const response = await fetch('/api/engineering/commercial-modules');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error cargando módulos comerciales');
      }

      const { modules, bundles, stats, version, lastSync } = result.data;
      const modulesArray = Object.values(modules);

            // Mapeo de categorías con iconos y colores
      const categoryConfig = {
        core: { icon: '⚙️', color: '#3b82f6', label: 'Core' },
        rrhh: { icon: '👥', color: '#8b5cf6', label: 'RRHH' },
        security: { icon: '🔒', color: '#ef4444', label: 'Seguridad' },
        compliance: { icon: '📋', color: '#f59e0b', label: 'Cumplimiento' },
        communication: { icon: '📬', color: '#10b981', label: 'Comunicación' },
        medical: { icon: '🏥', color: '#ec4899', label: 'Médico' },
        payroll: { icon: '💰', color: '#14b8a6', label: 'Nómina' },
        analytics: { icon: '📊', color: '#6366f1', label: 'Analytics' },
        admin: { icon: '🛠️', color: '#64748b', label: 'Admin' },
        support: { icon: '🆘', color: '#06b6d4', label: 'Soporte' },
        ai: { icon: '🤖', color: '#a855f7', label: 'IA' },
        legal: { icon: '⚖️', color: '#eab308', label: 'Legal' },
        reports: { icon: '📈', color: '#22c55e', label: 'Reportes' },
        hardware: { icon: '🖥️', color: '#84cc16', label: 'Hardware' },
        integration: { icon: '🔗', color: '#06b6d4', label: 'Integración' },
        siac: { icon: '🏢', color: '#f97316', label: 'SIAC' },
        monitoring: { icon: '👁️', color: '#6366f1', label: 'Monitoreo' },
        system: { icon: '⚡', color: '#71717a', label: 'Sistema' },
        testing: { icon: '🧪', color: '#94a3b8', label: 'Testing' },
        scheduling: { icon: '📅', color: '#0ea5e9', label: 'Turnos' }
      };

      // Detectar categorías dinámicamente desde los datos
      const categoriesSet = new Set();
      modulesArray.forEach(m => {
        if (m.category) categoriesSet.add(m.category);
      });

      console.log('📋 [COMMERCIAL] Categorías detectadas:', Array.from(categoriesSet));

      // Orden de prioridad para categorías
      const categoryOrder = [
        'core', 'rrhh', 'security', 'compliance', 'communication',
        'medical', 'payroll', 'analytics', 'admin', 'support',
        'ai', 'legal', 'reports', 'hardware', 'integration',
        'siac', 'monitoring', 'system', 'testing', 'scheduling'
      ];

      // Agrupar por categoría (dinámico)
      const categories = {};

      // Primero agregar categorías en orden de prioridad
      categoryOrder.forEach(catKey => {
        if (categoriesSet.has(catKey)) {
          categories[catKey] = modulesArray.filter(m => m.category === catKey);
          console.log(`  ✓ ${catKey}: ${categories[catKey].length} módulos`);
        }
      });

      // Luego agregar cualquier categoría no mapeada (alfabético)
      Array.from(categoriesSet)
        .filter(cat => !categoryOrder.includes(cat))
        .sort()
        .forEach(catKey => {
          categories[catKey] = modulesArray.filter(m => m.category === catKey);
          console.log(`  ✓ ${catKey} (no mapeada): ${categories[catKey].length} módulos`);

          // Asignar config por defecto para categorías no mapeadas
          if (!categoryConfig[catKey]) {
            categoryConfig[catKey] = {
              icon: '📦',
              color: '#9ca3af',
              label: catKey.charAt(0).toUpperCase() + catKey.slice(1)
            };
          }
        });

      console.log(`📊 [COMMERCIAL] Total categorías: ${Object.keys(categories).length}`);
      console.log(`📊 [COMMERCIAL] Total módulos: ${modulesArray.length}`);

      // Renderizar vista
      container.innerHTML = `
        <div style="max-width: 1400px; margin: 0 auto;">
          <!-- Header con stats -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h1 style="margin: 0 0 10px 0; font-size: 32px; display: flex; align-items: center; gap: 15px;">
              <span>💰</span>
              <span>Módulos Comerciales</span>
              <span style="background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 14px;">v${version}</span>
            </h1>
            <p style="margin: 0; opacity: 0.95; font-size: 16px;">Single Source of Truth - engineering-metadata.js</p>
            <p style="margin: 8px 0 0 0; opacity: 0.8; font-size: 13px;">Última sincronización: ${new Date(lastSync).toLocaleString('es-AR')}</p>
          </div>

          <!-- Stats Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: white; padding: 25px; border-radius: 12px; border-left: 4px solid #3b82f6; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <div style="font-size: 36px; font-weight: bold; color: #3b82f6; margin-bottom: 8px;">${stats.total}</div>
              <div style="color: #6b7280; font-size: 14px; font-weight: 600;">TOTAL MÓDULOS</div>
            </div>
            <div style="background: white; padding: 25px; border-radius: 12px; border-left: 4px solid #10b981; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <div style="font-size: 36px; font-weight: bold; color: #10b981; margin-bottom: 8px;">${stats.core}</div>
              <div style="color: #6b7280; font-size: 14px; font-weight: 600;">MÓDULOS CORE</div>
            </div>
            <div style="background: white; padding: 25px; border-radius: 12px; border-left: 4px solid #f59e0b; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <div style="font-size: 36px; font-weight: bold; color: #f59e0b; margin-bottom: 8px;">${stats.premium}</div>
              <div style="color: #6b7280; font-size: 14px; font-weight: 600;">MÓDULOS PREMIUM</div>
            </div>
          </div>

          <!-- Botón sincronizar -->
          <div style="margin-bottom: 30px; text-align: right;">
            <button
              onclick="EngineeringDashboard.syncCommercialModules()"
              style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 600; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); transition: all 0.3s;"
              onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'"
              onmouseout="this.style.transform=''; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)'"
            >
              🔄 Sincronizar con Registry
            </button>
          </div>

          <!-- SUBTABS: Catálogo vs Gestión Comercial -->
          <div style="background: white; border-radius: 12px; padding: 15px 25px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="display: flex; gap: 10px; border-bottom: 2px solid #f3f4f6; padding-bottom: 15px;">
              <button
                class="commercial-subtab-btn active"
                data-subtab="catalog"
                onclick="EngineeringDashboard.switchCommercialSubTab('catalog')"
                style="padding: 10px 24px; border: none; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s;"
              >
                📋 Catálogo (Solo Lectura)
              </button>
              <button
                class="commercial-subtab-btn"
                data-subtab="management"
                onclick="EngineeringDashboard.switchCommercialSubTab('management')"
                style="padding: 10px 24px; border: 2px solid #e5e7eb; background: white; color: #6b7280; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s;"
              >
                ✏️ Gestión Comercial (Editar Precios & Bundles)
              </button>
            </div>
          </div>

          <!-- Contenido del subtab CATALOG -->
          <div id="commercial-subtab-catalog" class="commercial-subtab-content" style="display: block;">

          <!-- Tabs por categoría -->
          <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
            <div style="border-bottom: 2px solid #f3f4f6; padding: 20px 25px;">
              <div class="commercial-category-tabs" style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${Object.entries(categories).map(([catKey, catModules], index) => {
                  const config = categoryConfig[catKey] || { icon: '📦', color: '#9ca3af', label: catKey };
                  const isFirst = index === 0;

                  return `
                    <button
                      class="commercial-cat-btn ${isFirst ? 'active' : ''}"
                      data-category="${catKey}"
                      style="
                        padding: 10px 20px;
                        border: 2px solid ${isFirst ? config.color : '#e5e7eb'};
                        background: ${isFirst ? `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)` : 'white'};
                        color: ${isFirst ? 'white' : '#6b7280'};
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.3s;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                      "
                    >
                      <span>${config.icon}</span>
                      <span>${config.label}</span>
                      <span style="background: ${isFirst ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}; padding: 2px 8px; border-radius: 10px; font-size: 12px;">${catModules.length}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            ${Object.entries(categories).map(([catKey, catModules]) => `
              <div
                class="commercial-category-content"
                data-category="${catKey}"
                style="padding: 25px; display: ${catKey === 'core' ? 'block' : 'none'};"
              >
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
                  ${catModules.map(module => `
                    <div style="
                      border: 2px solid #e5e7eb;
                      border-radius: 10px;
                      padding: 20px;
                      transition: all 0.3s;
                      background: white;
                      cursor: pointer;
                    "
                    onmouseover="this.style.borderColor='#667eea'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.15)'"
                    onmouseout="this.style.borderColor='#e5e7eb'; this.style.boxShadow=''"
                    >
                      <!-- Header del módulo -->
                      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 15px;">
                        <div>
                          <div style="font-size: 32px; margin-bottom: 8px;">${module.icon}</div>
                          <h3 style="margin: 0; font-size: 18px; color: #374151; font-weight: 700;">${module.name}</h3>
                          ${module.nameAlt ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">${module.nameAlt}</div>` : ''}
                        </div>
                        ${module.isCore ? '<span style="background: #10b981; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;">CORE</span>' : ''}
                      </div>

                      <!-- Descripción -->
                      <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${module.description || 'Sin descripción'}</p>

                      <!-- Precio -->
                      <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                        <div style="font-size: 24px; font-weight: 800; color: #3b82f6;">$${module.basePrice.toLocaleString()}</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Precio base mensual</div>
                      </div>

                      <!-- Estado técnico -->
                      ${module.technicalModule.hasImplementation ? `
                        <div style="margin-bottom: 15px;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 12px; color: #6b7280; font-weight: 600;">Implementación</span>
                            <span style="font-size: 12px; font-weight: 700; color: ${module.technicalModule.progress === 100 ? '#10b981' : '#f59e0b'};">${module.technicalModule.progress}%</span>
                          </div>
                          <div style="background: #e5e7eb; height: 6px; border-radius: 3px; overflow: hidden;">
                            <div style="background: ${module.technicalModule.progress === 100 ? '#10b981' : '#f59e0b'}; height: 100%; width: ${module.technicalModule.progress}%;"></div>
                          </div>
                          <div style="margin-top: 6px;">
                            <span style="background: ${module.technicalModule.status === 'PRODUCTION' ? '#10b981' : module.technicalModule.status === 'IN_PROGRESS' ? '#f59e0b' : '#6b7280'}; color: white; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;">${module.technicalModule.status}</span>
                          </div>
                        </div>
                      ` : `
                        <div style="margin-bottom: 15px;">
                          <span style="background: #ef4444; color: white; padding: 4px 10px; border-radius: 10px; font-size: 11px; font-weight: 700;">⚠️ NO IMPLEMENTADO</span>
                        </div>
                      `}

                      <!-- Dependencies -->
                      ${module.dependencies.required.length > 0 ? `
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 600;">DEPENDE DE:</div>
                          <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                            ${module.dependencies.required.map(dep => `
                              <span style="background: #e5e7eb; padding: 3px 8px; border-radius: 8px; font-size: 10px; color: #6b7280;">${dep}</span>
                            `).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Bundles section (si existen) -->
          ${Object.keys(bundles || {}).length > 0 ? `
            <div style="margin-top: 40px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3);">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; display: flex; align-items: center; gap: 10px;">
                <span>🎁</span>
                <span>Bundles Disponibles (${Object.keys(bundles).length})</span>
              </h2>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                ${Object.entries(bundles).map(([bundleKey, bundle]) => `
                  <div style="background: rgba(255, 255, 255, 0.95); padding: 20px; border-radius: 10px; border: 2px solid rgba(120, 53, 15, 0.2);">
                    <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #78350f;">${bundle.name || bundleKey}</h3>
                    ${bundle.description ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #92400e;">${bundle.description}</p>` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="text-decoration: line-through; color: #9ca3af;">$${bundle.regular_price?.toLocaleString() || 'N/A'}</span>
                      <span style="background: #10b981; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;">-${bundle.discount_percentage || 0}%</span>
                    </div>
                    <div style="font-size: 28px; font-weight: 800; color: #10b981;">$${bundle.bundle_price?.toLocaleString() || 'N/A'}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          </div><!-- Fin subtab CATALOG -->

          <!-- Contenido del subtab MANAGEMENT -->
          <div id="commercial-subtab-management" class="commercial-subtab-content" style="display: none;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <h2 style="margin: 0 0 10px 0; color: #374151; font-size: 24px;">✏️ Gestión Comercial</h2>
              <p style="margin: 0 0 30px 0; color: #6b7280;">Editar precios por tier de empleados y gestionar bundles</p>

              <!-- Tabs internos: Precios | Bundles -->
              <div style="border-bottom: 2px solid #f3f4f6; margin-bottom: 30px;">
                <div style="display: flex; gap: 10px;">
                  <button
                    class="management-tab-btn active"
                    data-tab="pricing"
                    onclick="EngineeringDashboard.switchManagementTab('pricing')"
                    style="padding: 10px 20px; border: none; background: transparent; color: #3b82f6; font-weight: 600; cursor: pointer; border-bottom: 3px solid #3b82f6;"
                  >
                    💰 Editor de Precios
                  </button>
                  <button
                    class="management-tab-btn"
                    data-tab="bundles"
                    onclick="EngineeringDashboard.switchManagementTab('bundles')"
                    style="padding: 10px 20px; border: none; background: transparent; color: #6b7280; font-weight: 600; cursor: pointer; border-bottom: 3px solid transparent;"
                  >
                    🎁 Constructor de Bundles
                  </button>
                </div>
              </div>

              <!-- Contenido: Editor de Precios -->
              <div id="management-tab-pricing" class="management-tab-content" style="display: block;">
                <p style="color: #6b7280; text-align: center; padding: 40px;">Cargando editor de precios...</p>
              </div>

              <!-- Contenido: Constructor de Bundles -->
              <div id="management-tab-bundles" class="management-tab-content" style="display: none;">
                <p style="color: #6b7280; text-align: center; padding: 40px;">Cargando constructor de bundles...</p>
              </div>
            </div>
          </div><!-- Fin subtab MANAGEMENT -->

        </div>
      `;

      // Event listeners para tabs de categorías
      const catButtons = container.querySelectorAll('.commercial-cat-btn');
      const catContents = container.querySelectorAll('.commercial-category-content');

      catButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const category = btn.dataset.category;

          // Actualizar botones
          catButtons.forEach(b => {
            const isActive = b.dataset.category === category;
            b.style.border = isActive ? '2px solid #667eea' : '2px solid #e5e7eb';
            b.style.background = isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white';
            b.style.color = isActive ? 'white' : '#6b7280';
            if (isActive) {
              b.classList.add('active');
            } else {
              b.classList.remove('active');
            }
          });

          // Actualizar contenidos
          catContents.forEach(content => {
            content.style.display = content.dataset.category === category ? 'block' : 'none';
          });
        });
      });

      console.log('✅ [COMMERCIAL] Vista renderizada con', modulesArray.length, 'módulos');

    } catch (error) {
      console.error('❌ [COMMERCIAL] Error cargando módulos:', error);
      container.innerHTML = `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px; border-radius: 8px;">
          <h3 style="color: #991b1b; margin: 0 0 10px 0;">❌ Error cargando módulos comerciales</h3>
          <p style="color: #7f1d1d; margin: 0;">${error.message}</p>
          <button
            onclick="EngineeringDashboard.loadCommercialModulesView()"
            style="margin-top: 15px; padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;"
          >
            🔄 Reintentar
          </button>
        </div>
      `;
    }
  },

  /**
   * Alternar entre subtabs: Catálogo vs Gestión Comercial
   */
  switchCommercialSubTab(subtab) {
    console.log('🔄 [COMMERCIAL] Switching to subtab:', subtab);

    // Actualizar botones
    const subtabButtons = document.querySelectorAll('.commercial-subtab-btn');
    subtabButtons.forEach(btn => {
      const isActive = btn.dataset.subtab === subtab;
      if (isActive) {
        btn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.classList.add('active');
      } else {
        btn.style.background = 'white';
        btn.style.color = '#6b7280';
        btn.style.border = '2px solid #e5e7eb';
        btn.classList.remove('active');
      }
    });

    // Alternar contenido
    document.getElementById('commercial-subtab-catalog').style.display =
      subtab === 'catalog' ? 'block' : 'none';
    document.getElementById('commercial-subtab-management').style.display =
      subtab === 'management' ? 'block' : 'none';

    // Si cambiamos a "management", cargar los editores
    if (subtab === 'management') {
      this.loadManagementEditors();
    }
  },

  /**
   * Cargar editores de gestión comercial
   */
  async loadManagementEditors() {
    // Cargar editor de precios por defecto
    await this.renderPricingEditor();
  },

  /**
   * Alternar entre tabs de management: Pricing vs Bundles
   */
  switchManagementTab(tab) {
    console.log('🔄 [MANAGEMENT] Switching to tab:', tab);

    // Actualizar botones
    const tabButtons = document.querySelectorAll('.management-tab-btn');
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.style.color = isActive ? '#3b82f6' : '#6b7280';
      btn.style.borderBottom = isActive ? '3px solid #3b82f6' : '3px solid transparent';
      if (isActive) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Alternar contenido
    document.getElementById('management-tab-pricing').style.display =
      tab === 'pricing' ? 'block' : 'none';
    document.getElementById('management-tab-bundles').style.display =
      tab === 'bundles' ? 'block' : 'none';

    // Cargar contenido según tab
    if (tab === 'pricing') {
      this.renderPricingEditor();
    } else if (tab === 'bundles') {
      this.renderBundlesConstructor();
    }
  },

  /**
   * Renderizar editor de precios por tier
   */
  async renderPricingEditor() {
    const container = document.getElementById('management-tab-pricing');

    container.innerHTML = '<p style="text-align: center; padding: 40px;">Cargando editor...</p>';

    try {
      // Fetch módulos comerciales
      const response = await fetch('/api/engineering/commercial-modules');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const modules = Object.values(result.data.modules);

      container.innerHTML = `
        <div>
          <h3 style="margin: 0 0 20px 0; color: #374151;">💰 Editor de Precios por Tier de Empleados</h3>

          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
              ℹ️ Los precios se ajustan automáticamente según la cantidad de empleados de la empresa:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 13px;">
              <li><strong>Tier 1 (1-50 empleados):</strong> Sin descuento</li>
              <li><strong>Tier 2 (51-100 empleados):</strong> 15% descuento</li>
              <li><strong>Tier 3 (101+ empleados):</strong> 30% descuento</li>
            </ul>
          </div>

          <!-- Grid de módulos -->
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 25px;">
            ${modules.map(module => this.renderModulePricingCard(module)).join('')}
          </div>
        </div>
      `;

      // Agregar event listeners a todos los formularios
      modules.forEach(module => {
        const form = document.getElementById(`pricing-form-${module.key}`);
        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.savePricing(module.key, new FormData(e.target));
          });
        }
      });

    } catch (error) {
      console.error('❌ [PRICING] Error:', error);
      container.innerHTML = `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b;">❌ Error cargando editor: ${error.message}</p>
        </div>
      `;
    }
  },

  /**
   * Renderizar tarjeta de pricing de un módulo individual
   */
  renderModulePricingCard(module) {
    return `
      <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: box-shadow 0.3s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)'">
        <!-- Header -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #f3f4f6;">
          <div style="font-size: 32px;">${module.icon}</div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 3px 0; color: #374151; font-size: 16px; font-weight: 600;">${module.name}</h4>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">${module.category.toUpperCase()}</p>
          </div>
        </div>

        <!-- Formulario -->
        <form id="pricing-form-${module.key}">
          <!-- Tier 1 -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="font-size: 12px; font-weight: 600; color: #6b7280;">1-50 empleados</label>
              <span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 600;">0%</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #9ca3af; font-size: 18px;">$</span>
              <input
                type="number"
                name="tier1_price"
                value="${module.pricingTiers.tier1.price}"
                step="0.01"
                min="0"
                style="flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
              />
            </div>
          </div>

          <!-- Tier 2 -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="font-size: 12px; font-weight: 600; color: #6b7280;">51-100 empleados</label>
              <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 600;">-15%</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #9ca3af; font-size: 18px;">$</span>
              <input
                type="number"
                name="tier2_price"
                value="${module.pricingTiers.tier2.price}"
                step="0.01"
                min="0"
                style="flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
              />
            </div>
          </div>

          <!-- Tier 3 -->
          <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="font-size: 12px; font-weight: 600; color: #6b7280;">101+ empleados</label>
              <span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 600;">-30%</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #9ca3af; font-size: 18px;">$</span>
              <input
                type="number"
                name="tier3_price"
                value="${module.pricingTiers.tier3.price}"
                step="0.01"
                min="0"
                style="flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
              />
            </div>
          </div>

          <!-- Botón Guardar -->
          <button
            type="submit"
            style="width: 100%; padding: 10px; border: none; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); transition: transform 0.2s;"
            onmouseover="this.style.transform='translateY(-2px)'"
            onmouseout="this.style.transform='translateY(0)'"
          >
            💾 Guardar
          </button>
        </form>
      </div>
    `;
  },

  /**
   * Guardar precios de un módulo
   */
  async savePricing(moduleKey, formData) {
    console.log('💾 [PRICING] Guardando precios para:', moduleKey);

    const pricing = {
      tier1: parseFloat(formData.get('tier1_price')),
      tier2: parseFloat(formData.get('tier2_price')),
      tier3: parseFloat(formData.get('tier3_price'))
    };

    try {
      const response = await fetch(`/api/engineering/commercial-modules/${moduleKey}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing })
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Precios guardados correctamente');
        // Recargar vista
        await this.loadCommercialModulesView();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ [PRICING] Error guardando:', error);
      alert('❌ Error guardando precios: ' + error.message);
    }
  },

  /**
   * Renderizar constructor de bundles
   */
  async renderBundlesConstructor() {
    const container = document.getElementById('management-tab-bundles');

    container.innerHTML = '<p style="text-align: center; padding: 40px;">Cargando constructor de bundles...</p>';

    try {
      // Fetch módulos y bundles
      const response = await fetch('/api/engineering/commercial-modules');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const modules = Object.values(result.data.modules);
      const bundles = result.data.bundles || {};

      container.innerHTML = `
        <div>
          <h3 style="margin: 0 0 20px 0; color: #374151;">🎁 Constructor de Bundles</h3>

          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              ℹ️ Los bundles son solo una presentación comercial. Al asignarlos a una empresa, se descomponen en módulos individuales.
            </p>
          </div>

          <!-- Botón crear bundle -->
          <div style="margin-bottom: 30px;">
            <button
              onclick="EngineeringDashboard.showBundleForm()"
              style="padding: 12px 24px; border: none; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);"
            >
              ➕ Crear Nuevo Bundle
            </button>
          </div>

          <!-- Lista de bundles existentes -->
          <div>
            <h4 style="margin: 0 0 15px 0; color: #374151;">Bundles Existentes (${Object.keys(bundles).length})</h4>
            <div id="bundles-list" style="display: grid; gap: 15px;">
              ${Object.keys(bundles).length === 0 ? `
                <p style="text-align: center; color: #6b7280; padding: 40px;">No hay bundles creados</p>
              ` : Object.entries(bundles).map(([bundleKey, bundle]) => `
                <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px;">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                      <h5 style="margin: 0 0 5px 0; color: #374151; font-size: 18px;">${bundle.name}</h5>
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">${bundle.description || ''}</p>
                    </div>
                    <button
                      onclick="EngineeringDashboard.editBundle('${bundleKey}')"
                      style="padding: 8px 16px; border: 2px solid #3b82f6; background: white; color: #3b82f6; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                  <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                    <div>
                      <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Módulos</div>
                      <div style="font-size: 20px; font-weight: 700; color: #3b82f6;">${bundle.modules.length}</div>
                    </div>
                    <div>
                      <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Precio Regular</div>
                      <div style="font-size: 20px; font-weight: 700; color: #6b7280; text-decoration: line-through;">$${bundle.regular_price}</div>
                    </div>
                    <div>
                      <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Precio Bundle</div>
                      <div style="font-size: 20px; font-weight: 700; color: #10b981;">$${bundle.bundle_price}</div>
                    </div>
                    <div>
                      <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Descuento</div>
                      <div style="font-size: 20px; font-weight: 700; color: #ef4444;">${bundle.discount_percentage}%</div>
                    </div>
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${bundle.modules.map(modKey => {
                      const mod = modules.find(m => m.key === modKey);
                      return mod ? `
                        <span style="background: #f3f4f6; padding: 4px 10px; border-radius: 12px; font-size: 12px; color: #374151;">
                          ${mod.icon} ${mod.name}
                        </span>
                      ` : '';
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Modal crear/editar bundle -->
          <div id="bundle-form-modal" style="display: none;"></div>
        </div>
      `;

    } catch (error) {
      console.error('❌ [BUNDLES] Error:', error);
      container.innerHTML = `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b;">❌ Error cargando bundles: ${error.message}</p>
        </div>
      `;
    }
  },

  /**
   * Mostrar formulario de bundle (crear)
   */
  async showBundleForm() {
    try {
      // Fetch módulos disponibles
      const response = await fetch('/api/engineering/commercial-modules');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const modules = Object.entries(result.data.modules);

      this.showBundleModal(null, modules);
    } catch (error) {
      console.error('❌ [BUNDLES] Error cargando módulos:', error);
      alert('❌ Error cargando módulos: ' + error.message);
    }
  },

  /**
   * Editar bundle existente
   */
  async editBundle(bundleKey) {
    try {
      // Fetch bundle + módulos
      const [bundleResponse, modulesResponse] = await Promise.all([
        fetch('/api/engineering/bundles'),
        fetch('/api/engineering/commercial-modules')
      ]);

      const bundleResult = await bundleResponse.json();
      const modulesResult = await modulesResponse.json();

      if (!bundleResult.success || !modulesResult.success) {
        throw new Error('Error cargando datos');
      }

      const bundle = bundleResult.data[bundleKey];
      if (!bundle) {
        throw new Error(`Bundle "${bundleKey}" no encontrado`);
      }

      const modules = Object.entries(modulesResult.data.modules);

      this.showBundleModal(bundle, modules);
    } catch (error) {
      console.error('❌ [BUNDLES] Error cargando bundle:', error);
      alert('❌ Error cargando bundle: ' + error.message);
    }
  },

  /**
   * Mostrar modal de bundle (crear o editar)
   */
  showBundleModal(bundle, modules) {
    const isEdit = !!bundle;

    // Crear modal
    const modalHtml = `
      <div id="bundle-modal-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 12px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
          <!-- Header -->
          <div style="padding: 24px; border-bottom: 2px solid #e5e7eb;">
            <h3 style="margin: 0; color: #374151;">${isEdit ? '✏️ Editar Bundle' : '➕ Crear Nuevo Bundle'}</h3>
          </div>

          <!-- Form -->
          <div style="padding: 24px;">
            <form id="bundle-form">
              <!-- Nombre -->
              <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Nombre del Bundle</label>
                <input type="text" name="name" value="${bundle?.name || ''}" required
                  style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;"
                  placeholder="Ej: Bundle RRHH Completo">
              </div>

              <!-- Descripción -->
              <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Descripción</label>
                <textarea name="description" rows="3"
                  style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;"
                  placeholder="Descripción del bundle...">${bundle?.description || ''}</textarea>
              </div>

              <!-- Categoría -->
              <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Categoría</label>
                <select name="category" required
                  style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;">
                  <option value="core" ${bundle?.category === 'core' ? 'selected' : ''}>Core</option>
                  <option value="rrhh" ${bundle?.category === 'rrhh' ? 'selected' : ''}>RRHH</option>
                  <option value="operations" ${bundle?.category === 'operations' ? 'selected' : ''}>Operaciones</option>
                  <option value="sales" ${bundle?.category === 'sales' ? 'selected' : ''}>Ventas</option>
                  <option value="analytics" ${bundle?.category === 'analytics' ? 'selected' : ''}>Analíticas</option>
                  <option value="custom" ${bundle?.category === 'custom' || !bundle ? 'selected' : ''}>Personalizado</option>
                </select>
              </div>

              <!-- Descuento -->
              <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Descuento (%)</label>
                <input type="number" name="discount_percentage" min="0" max="100" value="${bundle?.discount_percentage || 10}" required
                  style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 14px;"
                  placeholder="10">
                <small style="color: #6b7280;">Porcentaje de descuento sobre la suma de módulos individuales</small>
              </div>

              <!-- Selección de módulos -->
              <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 12px; font-weight: 600; color: #374151;">Módulos Incluidos (${bundle?.modules?.length || 0} seleccionados)</label>
                <div style="max-height: 300px; overflow-y: auto; border: 2px solid #d1d5db; border-radius: 6px; padding: 12px;">
                  ${modules.map(([key, module]) => `
                    <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 4px; transition: background 0.2s;"
                      onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'">
                      <input type="checkbox" name="modules" value="${key}"
                        ${bundle?.modules?.includes(key) ? 'checked' : ''}
                        style="margin-right: 12px; width: 18px; height: 18px;">
                      <span style="flex: 1;">
                        <span style="font-weight: 600;">${module.icon} ${module.name}</span>
                        <span style="color: #6b7280; font-size: 13px; margin-left: 8px;">${module.category}</span>
                      </span>
                      <span style="color: #10b981; font-weight: 600;">$${module.basePrice}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </form>
          </div>

          <!-- Footer -->
          <div style="padding: 24px; border-top: 2px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end;">
            ${isEdit ? `
              <button onclick="EngineeringDashboard.deleteBundleConfirm('${bundle.key}')"
                style="padding: 12px 24px; border: 2px solid #ef4444; background: white; color: #ef4444; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🗑️ Eliminar
              </button>
            ` : ''}
            <button onclick="EngineeringDashboard.closeBundleModal()"
              style="padding: 12px 24px; border: 2px solid #d1d5db; background: white; color: #374151; border-radius: 8px; cursor: pointer; font-weight: 600;">
              Cancelar
            </button>
            <button onclick="EngineeringDashboard.saveBundleModal(${isEdit ? `'${bundle.key}'` : 'null'})"
              style="padding: 12px 24px; border: none; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
              💾 Guardar
            </button>
          </div>
        </div>
      </div>
    `;

    // Insertar modal en el DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // Click fuera del modal para cerrar
    document.getElementById('bundle-modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'bundle-modal-overlay') {
        this.closeBundleModal();
      }
    });
  },

  /**
   * Guardar bundle desde modal
   */
  async saveBundleModal(bundleKey) {
    const form = document.getElementById('bundle-form');
    const formData = new FormData(form);

    // Validar que haya al menos un módulo seleccionado
    const selectedModules = formData.getAll('modules');
    if (selectedModules.length === 0) {
      alert('⚠️ Debes seleccionar al menos un módulo');
      return;
    }

    const bundleData = {
      bundleKey: bundleKey || undefined, // null para nuevo, bundleKey para editar
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      discount_percentage: parseFloat(formData.get('discount_percentage')),
      modules: selectedModules
    };

    console.log('💾 [BUNDLES] Guardando bundle:', bundleData);

    try {
      const response = await fetch('/api/engineering/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundleData)
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Bundle guardado correctamente');
        this.closeBundleModal();
        // Recargar vista de bundles
        await this.renderBundlesConstructor();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ [BUNDLES] Error guardando:', error);
      alert('❌ Error guardando bundle: ' + error.message);
    }
  },

  /**
   * Confirmar eliminación de bundle
   */
  async deleteBundleConfirm(bundleKey) {
    if (!confirm('¿Estás seguro de que quieres eliminar este bundle?\n\nEsta acción no se puede deshacer.')) {
      return;
    }

    console.log('🗑️ [BUNDLES] Eliminando bundle:', bundleKey);

    try {
      const response = await fetch(`/api/engineering/bundles/${bundleKey}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Bundle eliminado correctamente');
        this.closeBundleModal();
        // Recargar vista de bundles
        await this.renderBundlesConstructor();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ [BUNDLES] Error eliminando:', error);
      alert('❌ Error eliminando bundle: ' + error.message);
    }
  },

  /**
   * Cerrar modal de bundle
   */
  closeBundleModal() {
    const overlay = document.getElementById('bundle-modal-overlay');
    if (overlay) {
      overlay.parentElement.remove();
    }
  },

  /**
   * Sincronizar módulos comerciales desde registry
   */
  async syncCommercialModules() {
    console.log('🔄 [COMMERCIAL] Sincronizando módulos...');

    try {
      const response = await fetch('/api/engineering/sync-commercial-modules', {
        method: 'POST'
      });
      const result = await response.json();

      if (result.success) {
        alert(`✅ Sincronización completada\n\nTotal: ${result.stats?.total || 0} módulos\nCore: ${result.stats?.core || 0}\nPremium: ${result.stats?.premium || 0}`);

        // Recargar vista
        this.loadCommercialModulesView();
      } else {
        throw new Error(result.error || 'Error en sincronización');
      }
    } catch (error) {
      console.error('❌ [COMMERCIAL] Error sincronizando:', error);
      alert('❌ Error sincronizando módulos: ' + error.message);
    }
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
  },

  /**
   * ========================================================================
   * ⚡ ULTIMATE TEST - UN SOLO MEGA TEST (2026-01-05)
   * ========================================================================
   * Ejecuta la batería completa de testing integrada
   */
  async runUltimateTest() {
    const btn = document.getElementById('btn-ultimate-test');
    const originalText = btn.innerHTML;

    try {
      btn.innerHTML = '⏳ Ejecutando...';
      btn.disabled = true;

      console.log('🚀 [ULTIMATE-TEST] Iniciando batería completa...');

      // 1. Ejecutar ULTIMATE TEST
      const response = await fetch('/api/ultimate-test/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          modules: 'all',           // Todos los módulos
          headless: false,          // Ver navegador (útil en local)
          includePerformance: true,
          includeSimulation: true,
          includeSecurity: false    // Security tests opcionales
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ [ULTIMATE-TEST] Iniciado correctamente');

        // 2. Mostrar modal con link a resultados en tiempo real
        this.showSuccessModal('🚀 ULTIMATE TEST Iniciado', `
          <div style="padding: 20px;">
            <p style="margin-bottom: 20px;">
              La batería completa de testing se está ejecutando en background.
            </p>

            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #3b82f6;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">📊 Progreso en Tiempo Real</h4>
              <p style="margin: 0; font-size: 0.9rem;">
                Puedes ver el progreso en:
                <br><br>
                <a href="/api/ultimate-test/status" target="_blank" style="color: #3b82f6; text-decoration: underline;">
                  🔗 Ver Estado Actual (JSON)
                </a>
              </p>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">⚡ Fases de Testing</h4>
              <ol style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
                <li>Structural Tests (Endpoints, BD)</li>
                <li>Functional Tests (CRUD, Módulos)</li>
                <li>Performance Tests (Load Times, Queries)</li>
                <li>UX Tests (Console Errors, Network)</li>
                <li>Simulation Tests (Monkey Testing)</li>
                <li>Auto-Healing (Si detecta errores)</li>
                <li>Guarantees (Verificación final)</li>
                <li>Brain Sync (Actualizar knowledge)</li>
              </ol>
            </div>

            <div style="margin-top: 20px; text-align: center; background: #f0fdf4; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #15803d; font-weight: 600;">
                ⏱️ Tiempo estimado: 10-30 minutos
              </p>
              <p style="margin: 10px 0 0 0; color: #166534; font-size: 0.875rem;">
                Se te notificará cuando termine
              </p>
            </div>
          </div>
        `);

        // 3. Polling para actualizar estado (cada 5 segundos)
        const checkStatus = setInterval(async () => {
          try {
            const statusResponse = await fetch('/api/ultimate-test/status', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const statusResult = await statusResponse.json();

            if (!statusResult.execution.isRunning) {
              clearInterval(checkStatus);

              // Mostrar resultados finales
              const executionId = statusResult.execution.executionId;
              if (executionId) {
                const resultsResponse = await fetch(`/api/ultimate-test/results/${executionId}`, {
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const resultsData = await resultsResponse.json();

                this.showSuccessModal('✅ ULTIMATE TEST Completado', `
                  <div style="padding: 20px;">
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                      <h4 style="margin: 0 0 10px 0; color: #15803d;">📊 Resultados</h4>
                      <ul style="margin: 0; padding-left: 20px;">
                        <li>Total tests: <strong>${resultsData.execution.totalTests}</strong></li>
                        <li>Passed: <strong style="color: #10b981;">${resultsData.execution.passed}</strong></li>
                        <li>Failed: <strong style="color: #ef4444;">${resultsData.execution.failed}</strong></li>
                        <li>Success rate: <strong>${resultsData.execution.successRate}</strong></li>
                      </ul>
                    </div>
                    <div style="text-align: center;">
                      <a href="/api/ultimate-test/results/${executionId}" target="_blank" style="color: #3b82f6; text-decoration: underline;">
                        📄 Ver Reporte Completo (JSON)
                      </a>
                    </div>
                  </div>
                `);
              }
            }
          } catch (error) {
            console.error('❌ [ULTIMATE-TEST] Error checking status:', error);
            clearInterval(checkStatus);
          }
        }, 5000); // Check cada 5 segundos

      } else {
        console.error('❌ [ULTIMATE-TEST] Error:', result.message);
        this.showErrorModal('Error Ejecutando ULTIMATE TEST', result.message);
      }

    } catch (error) {
      console.error('❌ [ULTIMATE-TEST] Error en ejecución:', error);
      this.showErrorModal('Error Ejecutando ULTIMATE TEST', error.message);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
};

// NOTA: La inicialización se maneja desde panel-administrativo.html
// cuando se abre el tab 'engineering', NO se auto-inicializa aquí

// Exportar para uso global
window.EngineeringDashboard = EngineeringDashboard;
