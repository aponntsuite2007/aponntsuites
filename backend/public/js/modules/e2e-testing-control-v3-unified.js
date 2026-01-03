/**
 * ═══════════════════════════════════════════════════════════════════
 * E2E TESTING ADVANCED - VISTA UNIFICADA (Dark Theme)
 * ═══════════════════════════════════════════════════════════════════
 *
 * TODO EN UNA SOLA VISTA:
 * - Live Monitor (arriba)
 * - Quick Presets (lado derecho arriba)
 * - Matrix Builder: Tests × Módulos (centro)
 * - Config avanzada (abajo)
 * - Actions (ejecutar, guardar, history)
 *
 * SIN TABS - TODO VISIBLE - DARK THEME
 */

const E2ETestingAdvancedUnified = {
  // ═════════════════════════════════════════════════════════
  // ESTADO
  // ═════════════════════════════════════════════════════════
  selectedTests: new Set(['setup']), // SETUP siempre seleccionado por defecto
  selectedModules: new Set(),
  presets: [],
  modules: [],
  availableTests: [],
  currentExecution: null,
  isExecuting: false,
  executionProgress: {
    completed: 0,
    total: 0,
    currentModule: null,
    logs: []
  },

  executionConfig: {
    parallel: false,
    maxParallel: 3,
    timeout: 300000,
    retries: 3,
    brainIntegration: true
  },

  // ═════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ═════════════════════════════════════════════════════════
  async init() {
    console.log('🧪 [E2E-UNIFIED] Inicializando vista unificada...');

    try {
      await Promise.all([
        this.loadPresets(),
        this.loadModules(),
        this.loadAvailableTests()
      ]);

      console.log(`✅ [E2E-UNIFIED] Cargado: ${this.presets.length} presets, ${this.modules.length} módulos, ${this.availableTests.length} tests`);

      this.render();
      this.attachEventListeners();

    } catch (error) {
      console.error('❌ [E2E-UNIFIED] Error en init:', error);
      alert('Error cargando sistema E2E: ' + error.message);
    }
  },

  async loadPresets() {
    try {
      const response = await fetch('/api/e2e-advanced/presets', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      const data = await response.json();
      this.presets = data.success ? data.presets : [];
    } catch (error) {
      console.error('Error loading presets:', error);
      this.presets = [];
    }
  },

  async loadModules() {
    try {
      const response = await fetch('/api/audit/registry', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      const data = await response.json();

      if (data.success && data.registry) {
        this.modules = Object.keys(data.registry).map(key => ({
          key,
          name: data.registry[key].name,
          category: data.registry[key].category || 'other'
        }));
      }
    } catch (error) {
      console.error('Error loading modules:', error);
      this.modules = [];
    }
  },

  async loadAvailableTests() {
    this.availableTests = [
      // Básicos (5)
      { id: 'setup', name: 'SETUP', description: 'Crear datos de prueba', category: 'basic', required: true, duration: 30 },
      { id: 'chaos', name: 'CHAOS', description: 'Testing caótico (50 iter)', category: 'basic', duration: 180 },
      { id: 'dependency', name: 'DEPENDENCY', description: 'Mapeo de relaciones', category: 'basic', duration: 60 },
      { id: 'ssot', name: 'SSOT', description: 'Integridad de datos', category: 'basic', duration: 45 },
      { id: 'brain', name: 'BRAIN', description: 'Feedback loop', category: 'basic', duration: 30 },

      // Avanzados (8)
      { id: 'xss', name: 'XSS', description: 'Cross-site scripting', category: 'advanced', duration: 90 },
      { id: 'sql-injection', name: 'SQL Injection', description: 'SQL injection attacks', category: 'advanced', duration: 90 },
      { id: 'race-condition', name: 'Race Conditions', description: 'Concurrent access', category: 'advanced', duration: 120 },
      { id: 'memory-leak', name: 'Memory Leaks', description: 'Memory profiling', category: 'advanced', duration: 150 },
      { id: 'performance', name: 'Performance', description: 'Load testing', category: 'advanced', duration: 120 },
      { id: 'accessibility', name: 'Accessibility', description: 'A11y compliance', category: 'advanced', duration: 60 },
      { id: 'seo', name: 'SEO', description: 'SEO best practices', category: 'advanced', duration: 45 },
      { id: 'pwa', name: 'PWA', description: 'Progressive web app', category: 'advanced', duration: 60 }
    ];
  },

  // ═════════════════════════════════════════════════════════
  // RENDER PRINCIPAL - TODO EN UNA VISTA
  // ═════════════════════════════════════════════════════════
  render() {
    const darkBg = '#1a1a2e';
    const darkCard = '#16213e';
    const darkAccent = '#0f3460';
    const primary = '#667eea';
    const textLight = '#e0e0e0';
    const textDim = '#9ca3af';

    const html = `
      <div style="background: ${darkBg}; min-height: 100vh; padding: 20px; color: ${textLight};">

        <!-- HEADER -->
        <div style="background: linear-gradient(135deg, ${primary} 0%, #764ba2 100%);
                    padding: 25px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
            🧪 E2E Testing Advanced - Vista Unificada
          </h2>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">
            Control total parametrizable: ${this.availableTests.length} tests × ${this.modules.length} módulos = ${this.availableTests.length * this.modules.length} combinaciones posibles
          </p>
        </div>

        <!-- STATS GLOBALES -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
          ${this.renderGlobalStats(darkCard, textLight, textDim)}
        </div>

        <!-- ROW 1: LIVE MONITOR + QUICK PRESETS -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px;">
          <!-- LIVE MONITOR -->
          <div style="background: ${darkCard}; border-radius: 12px; padding: 20px; border: 1px solid ${darkAccent};">
            ${this.renderLiveMonitor(darkBg, darkCard, darkAccent, primary, textLight, textDim)}
          </div>

          <!-- QUICK PRESETS -->
          <div style="background: ${darkCard}; border-radius: 12px; padding: 20px; border: 1px solid ${darkAccent};">
            ${this.renderQuickPresets(darkBg, primary, textLight, textDim)}
          </div>
        </div>

        <!-- ROW 2: MATRIX BUILDER (TESTS × MÓDULOS) -->
        <div style="background: ${darkCard}; border-radius: 12px; padding: 25px; margin-bottom: 20px; border: 1px solid ${darkAccent};">
          <h3 style="margin: 0 0 20px 0; color: ${textLight}; font-size: 18px; font-weight: 600;">
            🎛️ Matrix Builder - Selección Granular
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px;">
            <!-- TESTS SELECTOR -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: ${textLight}; font-size: 14px;">
                  🧪 Tests (${this.selectedTests.size}/${this.availableTests.length})
                </h4>
                <div style="display: flex; gap: 8px;">
                  <button onclick="E2ETestingAdvancedUnified.selectAllTests()"
                          style="padding: 6px 12px; background: ${darkAccent}; color: ${textLight}; border: none; border-radius: 6px; cursor: pointer; font-size: 11px;">
                    ✅ Todos
                  </button>
                  <button onclick="E2ETestingAdvancedUnified.clearAllTests()"
                          style="padding: 6px 12px; background: ${darkAccent}; color: ${textLight}; border: none; border-radius: 6px; cursor: pointer; font-size: 11px;">
                    ❌ Ninguno
                  </button>
                </div>
              </div>
              ${this.renderTestsList(darkBg, darkAccent, primary, textLight, textDim)}
            </div>

            <!-- MÓDULOS SELECTOR -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: ${textLight}; font-size: 14px;">
                  📦 Módulos (${this.selectedModules.size}/${this.modules.length})
                </h4>
                <div style="display: flex; gap: 8px;">
                  <button onclick="E2ETestingAdvancedUnified.selectAllModules()"
                          style="padding: 6px 12px; background: ${darkAccent}; color: ${textLight}; border: none; border-radius: 6px; cursor: pointer; font-size: 11px;">
                    ✅ Todos
                  </button>
                  <button onclick="E2ETestingAdvancedUnified.clearAllModules()"
                          style="padding: 6px 12px; background: ${darkAccent}; color: ${textLight}; border: none; border-radius: 6px; cursor: pointer; font-size: 11px;">
                    ❌ Ninguno
                  </button>
                </div>
              </div>
              ${this.renderModulesList(darkBg, darkAccent, primary, textLight, textDim)}
            </div>
          </div>
        </div>

        <!-- ROW 3: CONFIG AVANZADA + ACTIONS -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px;">
          <!-- CONFIG -->
          <div style="background: ${darkCard}; border-radius: 12px; padding: 20px; border: 1px solid ${darkAccent};">
            ${this.renderAdvancedConfig(darkBg, darkAccent, primary, textLight, textDim)}
          </div>

          <!-- ACTIONS + SUMMARY -->
          <div style="background: ${darkCard}; border-radius: 12px; padding: 20px; border: 1px solid ${darkAccent};">
            ${this.renderActionsSummary(darkBg, primary, textLight, textDim)}
          </div>
        </div>

      </div>
    `;

    const container = document.getElementById('mainContent');
    if (container) {
      container.innerHTML = html;
    }
  },

  renderGlobalStats(darkCard, textLight, textDim) {
    const stats = [
      { label: 'Tests Disponibles', value: this.availableTests.length, color: '#667eea', icon: '🧪' },
      { label: 'Módulos del Sistema', value: this.modules.length, color: '#10b981', icon: '📦' },
      { label: 'Presets Guardados', value: this.presets.length, color: '#f59e0b', icon: '💾' },
      { label: 'Combinaciones', value: this.availableTests.length * this.modules.length, color: '#ef4444', icon: '🎯' }
    ];

    return stats.map(stat => `
      <div style="background: ${darkCard}; padding: 18px; border-radius: 10px; border-left: 4px solid ${stat.color};">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <span style="font-size: 24px;">${stat.icon}</span>
          <span style="font-size: 28px; font-weight: bold; color: ${stat.color};">${stat.value}</span>
        </div>
        <div style="font-size: 12px; color: ${textDim};">${stat.label}</div>
      </div>
    `).join('');
  },

  renderLiveMonitor(darkBg, darkCard, darkAccent, primary, textLight, textDim) {
    if (!this.isExecuting) {
      return `
        <h3 style="margin: 0 0 15px 0; color: ${textLight}; font-size: 16px; font-weight: 600;">
          📊 Live Monitor
        </h3>
        <div style="padding: 40px; text-align: center; color: ${textDim};">
          <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;">⏸️</div>
          <div style="font-size: 14px;">No hay ejecución activa</div>
          <div style="font-size: 12px; margin-top: 8px;">Selecciona tests y módulos, luego click en "Ejecutar"</div>
        </div>
      `;
    }

    const progress = Math.floor((this.executionProgress.completed / this.executionProgress.total) * 100);

    return `
      <h3 style="margin: 0 0 15px 0; color: ${textLight}; font-size: 16px; font-weight: 600;">
        📊 Live Monitor - Ejecución en Curso
      </h3>

      <!-- Progress Bar -->
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-size: 12px; color: ${textDim};">Progreso</span>
          <span style="font-size: 12px; font-weight: bold; color: ${primary};">
            ${this.executionProgress.completed}/${this.executionProgress.total} (${progress}%)
          </span>
        </div>
        <div style="width: 100%; height: 20px; background: ${darkBg}; border-radius: 10px; overflow: hidden;">
          <div style="height: 100%; background: linear-gradient(90deg, ${primary} 0%, #764ba2 100%);
                     width: ${progress}%; transition: width 0.3s;"></div>
        </div>
      </div>

      <!-- Current Module -->
      ${this.executionProgress.currentModule ? `
        <div style="padding: 10px; background: ${darkBg}; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid ${primary};">
          <div style="font-size: 12px; color: ${textDim};">Ejecutando ahora:</div>
          <div style="font-size: 14px; font-weight: 600; color: ${textLight};">
            ⚙️ ${this.executionProgress.currentModule}
          </div>
        </div>
      ` : ''}

      <!-- Logs (últimos 5) -->
      <div style="font-size: 11px; font-family: 'Courier New', monospace; max-height: 150px; overflow-y: auto;">
        ${this.executionProgress.logs.slice(-5).map(log => `
          <div style="padding: 4px; color: ${textDim};">${log}</div>
        `).join('')}
      </div>
    `;
  },

  renderQuickPresets(darkBg, primary, textLight, textDim) {
    return `
      <h3 style="margin: 0 0 15px 0; color: ${textLight}; font-size: 16px; font-weight: 600;">
        🚀 Quick Presets
      </h3>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${this.presets.slice(0, 5).map(preset => `
          <div onclick="E2ETestingAdvancedUnified.loadPreset(${preset.id})"
               style="padding: 12px; background: ${darkBg}; border-radius: 8px; cursor: pointer;
                      border: 1px solid #334155; transition: all 0.2s;"
               onmouseover="this.style.borderColor='${primary}'; this.style.background='#1e293b'"
               onmouseout="this.style.borderColor='#334155'; this.style.background='${darkBg}'">
            <div style="font-weight: 600; color: ${textLight}; font-size: 13px; margin-bottom: 4px;">
              ${preset.name}
            </div>
            <div style="font-size: 11px; color: ${textDim};">
              ${(preset.config.selectedModules || []).length} módulos × ${(preset.config.selectedTests || []).length} tests
            </div>
            ${preset.last_result ? `
              <div style="font-size: 11px; color: ${preset.last_result.rate >= 90 ? '#10b981' : '#f59e0b'}; margin-top: 4px;">
                ✓ ${preset.last_result.rate}% success
              </div>
            ` : ''}
          </div>
        `).join('')}

        ${this.presets.length === 0 ? `
          <div style="padding: 30px; text-align: center; color: ${textDim}; font-size: 12px;">
            No hay presets guardados
          </div>
        ` : ''}
      </div>
    `;
  },

  renderTestsList(darkBg, darkAccent, primary, textLight, textDim) {
    const basicTests = this.availableTests.filter(t => t.category === 'basic');
    const advancedTests = this.availableTests.filter(t => t.category === 'advanced');

    return `
      <div style="max-height: 400px; overflow-y: auto;">
        <!-- Básicos -->
        <div style="margin-bottom: 15px;">
          <div style="font-size: 11px; color: ${primary}; font-weight: 600; margin-bottom: 8px;">
            ⚡ BÁSICOS (${basicTests.length})
          </div>
          ${basicTests.map(test => this.renderTestCheckbox(test, darkBg, darkAccent, primary, textLight, textDim)).join('')}
        </div>

        <!-- Avanzados -->
        <div>
          <div style="font-size: 11px; color: #f59e0b; font-weight: 600; margin-bottom: 8px;">
            🔬 AVANZADOS (${advancedTests.length})
          </div>
          ${advancedTests.map(test => this.renderTestCheckbox(test, darkBg, darkAccent, primary, textLight, textDim)).join('')}
        </div>
      </div>
    `;
  },

  renderTestCheckbox(test, darkBg, darkAccent, primary, textLight, textDim) {
    const isSelected = this.selectedTests.has(test.id);
    return `
      <label style="display: flex; align-items: center; padding: 10px; background: ${darkBg}; border-radius: 6px; margin-bottom: 6px; cursor: pointer; border: 1px solid ${darkAccent}; transition: all 0.2s;"
             onmouseover="this.style.borderColor='${primary}'"
             onmouseout="this.style.borderColor='${darkAccent}'">
        <input type="checkbox"
               ${test.required ? 'checked disabled' : ''}
               ${isSelected ? 'checked' : ''}
               onchange="E2ETestingAdvancedUnified.toggleTest('${test.id}')"
               style="margin-right: 10px; width: 16px; height: 16px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: ${textLight}; font-size: 12px;">${test.name}</div>
          <div style="font-size: 10px; color: ${textDim};">${test.description}</div>
          ${test.required ? `<span style="font-size: 9px; color: #ef4444;">REQUIRED</span>` : ''}
        </div>
        ${test.duration ? `<span style="font-size: 10px; color: ${textDim};">~${test.duration}s</span>` : ''}
      </label>
    `;
  },

  renderModulesList(darkBg, darkAccent, primary, textLight, textDim) {
    const modulesByCategory = this.groupModulesByCategory();

    return `
      <div style="max-height: 400px; overflow-y: auto;">
        ${Object.entries(modulesByCategory).map(([category, modules]) => `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="font-size: 11px; color: ${primary}; font-weight: 600;">
                ${this.getCategoryIcon(category)} ${category.toUpperCase()} (${modules.length})
              </div>
              <div style="display: flex; gap: 4px;">
                <button onclick="E2ETestingAdvancedUnified.selectCategoryModules('${category}')"
                        style="padding: 3px 8px; background: ${darkAccent}; color: ${textLight}; border: none; border-radius: 4px; cursor: pointer; font-size: 9px;">
                  ✅
                </button>
                <button onclick="E2ETestingAdvancedUnified.clearCategoryModules('${category}')"
                        style="padding: 3px 8px; background: ${darkAccent}; color: ${textLight}; border: none; border-radius: 4px; cursor: pointer; font-size: 9px;">
                  ❌
                </button>
              </div>
            </div>
            ${modules.map(mod => {
              const isSelected = this.selectedModules.has(mod.key);
              return `
                <label style="display: flex; align-items: center; padding: 8px; background: ${darkBg}; border-radius: 4px; margin-bottom: 4px; cursor: pointer; font-size: 11px; border: 1px solid ${darkAccent}; transition: all 0.2s;"
                       onmouseover="this.style.borderColor='${primary}'"
                       onmouseout="this.style.borderColor='${darkAccent}'">
                  <input type="checkbox"
                         ${isSelected ? 'checked' : ''}
                         onchange="E2ETestingAdvancedUnified.toggleModule('${mod.key}')"
                         style="margin-right: 8px; width: 14px; height: 14px;">
                  <span style="color: ${textLight}; flex: 1;">${mod.name}</span>
                  <span style="font-size: 9px; color: ${textDim};">${mod.key}</span>
                </label>
              `;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  },

  renderAdvancedConfig(darkBg, darkAccent, primary, textLight, textDim) {
    return `
      <h3 style="margin: 0 0 15px 0; color: ${textLight}; font-size: 16px; font-weight: 600;">
        ⚙️ Configuración Avanzada
      </h3>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <!-- Parallel -->
        <div>
          <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 10px;">
            <input type="checkbox"
                   ${this.executionConfig.parallel ? 'checked' : ''}
                   onchange="E2ETestingAdvancedUnified.toggleParallel()"
                   style="margin-right: 10px; width: 16px; height: 16px;">
            <div>
              <div style="font-weight: 600; color: ${textLight}; font-size: 13px;">⚡ Ejecución Paralela</div>
              <div style="font-size: 11px; color: ${textDim};">Ejecutar módulos simultáneamente</div>
            </div>
          </label>
          ${this.executionConfig.parallel ? `
            <div style="padding-left: 26px;">
              <label style="display: block; font-size: 11px; color: ${textDim}; margin-bottom: 4px;">Máximo en paralelo:</label>
              <input type="number" min="1" max="10" value="${this.executionConfig.maxParallel}"
                     onchange="E2ETestingAdvancedUnified.setMaxParallel(this.value)"
                     style="width: 70px; padding: 6px; background: ${darkBg}; color: ${textLight}; border: 1px solid ${darkAccent}; border-radius: 4px;">
            </div>
          ` : ''}
        </div>

        <!-- Brain -->
        <div>
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox"
                   ${this.executionConfig.brainIntegration ? 'checked' : ''}
                   onchange="E2ETestingAdvancedUnified.toggleBrain()"
                   style="margin-right: 10px; width: 16px; height: 16px;">
            <div>
              <div style="font-weight: 600; color: ${textLight}; font-size: 13px;">🧠 Integración Brain</div>
              <div style="font-size: 11px; color: ${textDim};">Feedback automático de errores</div>
            </div>
          </label>
        </div>

        <!-- Timeout -->
        <div>
          <label style="display: block; font-weight: 600; color: ${textLight}; font-size: 13px; margin-bottom: 6px;">
            ⏱️ Timeout por módulo
          </label>
          <select onchange="E2ETestingAdvancedUnified.setTimeout(this.value)"
                  style="width: 100%; padding: 8px; background: ${darkBg}; color: ${textLight}; border: 1px solid ${darkAccent}; border-radius: 6px; font-size: 12px;">
            <option value="180000" ${this.executionConfig.timeout === 180000 ? 'selected' : ''}>3 minutos</option>
            <option value="300000" ${this.executionConfig.timeout === 300000 ? 'selected' : ''}>5 minutos (recomendado)</option>
            <option value="600000" ${this.executionConfig.timeout === 600000 ? 'selected' : ''}>10 minutos</option>
            <option value="900000" ${this.executionConfig.timeout === 900000 ? 'selected' : ''}>15 minutos</option>
          </select>
        </div>

        <!-- Retries -->
        <div>
          <label style="display: block; font-weight: 600; color: ${textLight}; font-size: 13px; margin-bottom: 6px;">
            🔄 Reintentos
          </label>
          <select onchange="E2ETestingAdvancedUnified.setRetries(this.value)"
                  style="width: 100%; padding: 8px; background: ${darkBg}; color: ${textLight}; border: 1px solid ${darkAccent}; border-radius: 6px; font-size: 12px;">
            <option value="0" ${this.executionConfig.retries === 0 ? 'selected' : ''}>Sin reintentos</option>
            <option value="1" ${this.executionConfig.retries === 1 ? 'selected' : ''}>1 reintento</option>
            <option value="2" ${this.executionConfig.retries === 2 ? 'selected' : ''}>2 reintentos</option>
            <option value="3" ${this.executionConfig.retries === 3 ? 'selected' : ''}>3 reintentos (recomendado)</option>
            <option value="5" ${this.executionConfig.retries === 5 ? 'selected' : ''}>5 reintentos</option>
          </select>
        </div>
      </div>
    `;
  },

  renderActionsSummary(darkBg, primary, textLight, textDim) {
    const totalOperations = this.selectedTests.size * this.selectedModules.size;
    const estimatedDuration = this.calculateEstimatedDuration();
    const canExecute = this.selectedTests.size > 0 && this.selectedModules.size > 0;

    return `
      <h3 style="margin: 0 0 15px 0; color: ${textLight}; font-size: 16px; font-weight: 600;">
        📊 Resumen
      </h3>

      <!-- Stats -->
      <div style="background: ${darkBg}; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: ${primary};">${this.selectedTests.size}</div>
            <div style="font-size: 11px; color: ${textDim};">Tests</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: ${primary};">${this.selectedModules.size}</div>
            <div style="font-size: 11px; color: ${textDim};">Módulos</div>
          </div>
        </div>

        <div style="text-align: center; padding: 12px; background: linear-gradient(135deg, ${primary}20, #764ba220); border-radius: 6px; margin-bottom: 12px;">
          <div style="font-size: 11px; color: ${textDim}; margin-bottom: 4px;">Total de operaciones</div>
          <div style="font-size: 24px; font-weight: bold; color: ${primary};">
            ${totalOperations}
          </div>
        </div>

        <div style="text-align: center; padding: 10px; background: ${primary}20; border-radius: 6px;">
          <div style="font-size: 11px; color: ${textDim}; margin-bottom: 4px;">⏱️ Tiempo estimado</div>
          <div style="font-size: 18px; font-weight: bold; color: ${primary};">
            ${estimatedDuration}
          </div>
          <div style="font-size: 9px; color: ${textDim}; margin-top: 4px;">
            ${this.executionConfig.parallel ? `Paralelo (${this.executionConfig.maxParallel} simultáneos)` : 'Secuencial'}
          </div>
        </div>
      </div>

      <!-- Actions -->
      <button onclick="E2ETestingAdvancedUnified.execute()"
              ${!canExecute ? 'disabled' : ''}
              style="width: 100%; padding: 15px; background: linear-gradient(135deg, ${primary} 0%, #764ba2 100%);
                     color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold;
                     cursor: ${canExecute ? 'pointer' : 'not-allowed'}; opacity: ${canExecute ? '1' : '0.5'};
                     margin-bottom: 10px; transition: transform 0.2s;"
              ${canExecute ? `onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'"` : ''}>
        ▶️ Ejecutar Ahora
      </button>

      <button onclick="E2ETestingAdvancedUnified.saveAsPreset()"
              ${!canExecute ? 'disabled' : ''}
              style="width: 100%; padding: 12px; background: ${darkBg}; color: ${textLight};
                     border: 2px solid ${primary}; border-radius: 8px; font-size: 14px; font-weight: 600;
                     cursor: ${canExecute ? 'pointer' : 'not-allowed'}; opacity: ${canExecute ? '1' : '0.5'};
                     margin-bottom: 10px;">
        💾 Guardar Preset
      </button>

      ${!canExecute ? `
        <div style="margin-top: 10px; padding: 10px; background: #fef3cd20; border: 1px solid #f59e0b;
                   border-radius: 6px; text-align: center;">
          <div style="font-size: 11px; color: #f59e0b;">
            ⚠️ Selecciona al menos 1 test y 1 módulo
          </div>
        </div>
      ` : ''}
    `;
  },

  // ═════════════════════════════════════════════════════════
  // UTILIDADES
  // ═════════════════════════════════════════════════════════

  groupModulesByCategory() {
    const grouped = {};
    this.modules.forEach(mod => {
      const cat = mod.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(mod);
    });
    return grouped;
  },

  getCategoryIcon(category) {
    const icons = {
      core: '🔵',
      rrhh: '👥',
      enterprise: '🏢',
      automation: '🤖',
      testing: '🧪',
      other: '📦'
    };
    return icons[category] || '📦';
  },

  calculateEstimatedDuration() {
    if (this.selectedTests.size === 0 || this.selectedModules.size === 0) {
      return '0 min';
    }

    let totalSeconds = 0;
    this.selectedTests.forEach(testId => {
      const test = this.availableTests.find(t => t.id === testId);
      if (test && test.duration) {
        totalSeconds += test.duration * this.selectedModules.size;
      }
    });

    if (this.executionConfig.parallel) {
      totalSeconds = totalSeconds / this.executionConfig.maxParallel;
    }

    const minutes = Math.ceil(totalSeconds / 60);
    if (minutes < 60) {
      return `~${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMin = minutes % 60;
      return `~${hours}h ${remainingMin}m`;
    }
  },

  // ═════════════════════════════════════════════════════════
  // FUNCIONES DE INTERACCIÓN
  // ═════════════════════════════════════════════════════════

  toggleTest(testId) {
    const test = this.availableTests.find(t => t.id === testId);
    if (test && test.required) return; // No permitir deseleccionar required

    if (this.selectedTests.has(testId)) {
      this.selectedTests.delete(testId);
    } else {
      this.selectedTests.add(testId);
    }
    this.render();
  },

  toggleModule(moduleKey) {
    if (this.selectedModules.has(moduleKey)) {
      this.selectedModules.delete(moduleKey);
    } else {
      this.selectedModules.add(moduleKey);
    }
    this.render();
  },

  selectAllTests() {
    this.availableTests.forEach(test => this.selectedTests.add(test.id));
    this.render();
  },

  clearAllTests() {
    this.selectedTests.clear();
    // Re-agregar required
    this.availableTests.filter(t => t.required).forEach(t => this.selectedTests.add(t.id));
    this.render();
  },

  selectAllModules() {
    this.modules.forEach(mod => this.selectedModules.add(mod.key));
    this.render();
  },

  clearAllModules() {
    this.selectedModules.clear();
    this.render();
  },

  selectCategoryModules(category) {
    this.modules.filter(m => (m.category || 'other') === category).forEach(mod => {
      this.selectedModules.add(mod.key);
    });
    this.render();
  },

  clearCategoryModules(category) {
    this.modules.filter(m => (m.category || 'other') === category).forEach(mod => {
      this.selectedModules.delete(mod.key);
    });
    this.render();
  },

  toggleParallel() {
    this.executionConfig.parallel = !this.executionConfig.parallel;
    this.render();
  },

  setMaxParallel(value) {
    this.executionConfig.maxParallel = parseInt(value);
  },

  setTimeout(value) {
    this.executionConfig.timeout = parseInt(value);
  },

  setRetries(value) {
    this.executionConfig.retries = parseInt(value);
  },

  toggleBrain() {
    this.executionConfig.brainIntegration = !this.executionConfig.brainIntegration;
    this.render();
  },

  async loadPreset(presetId) {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset) return;

    // Cargar configuración del preset
    this.selectedTests = new Set(preset.config.selectedTests || []);
    this.selectedModules = new Set(preset.config.selectedModules || []);

    if (preset.config.executionConfig) {
      Object.assign(this.executionConfig, preset.config.executionConfig);
    }

    this.render();
    alert(`✅ Preset "${preset.name}" cargado\n\n${this.selectedTests.size} tests × ${this.selectedModules.size} módulos`);
  },

  async execute() {
    if (this.selectedTests.size === 0 || this.selectedModules.size === 0) {
      alert('⚠️ Selecciona al menos 1 test y 1 módulo');
      return;
    }

    if (!confirm(`¿Ejecutar ${this.selectedTests.size} tests sobre ${this.selectedModules.size} módulos?\n\nTiempo estimado: ${this.calculateEstimatedDuration()}`)) {
      return;
    }

    try {
      const response = await fetch('/api/e2e-advanced/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          mode: 'matrix',
          selectedTests: Array.from(this.selectedTests),
          selectedModules: Array.from(this.selectedModules),
          config: this.executionConfig
        })
      });

      const data = await response.json();

      if (data.success) {
        this.currentExecution = data.executionId;
        this.isExecuting = true;
        this.executionProgress = {
          completed: 0,
          total: this.selectedModules.size,
          currentModule: null,
          logs: [`[${new Date().toLocaleTimeString()}] ✅ Ejecución iniciada - ID: ${data.executionId}`]
        };

        this.render();
        alert(`✅ Ejecución iniciada!\n\nID: ${data.executionId}\nTiempo estimado: ${data.estimatedDuration}`);
      } else {
        alert('❌ Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error ejecutando matrix:', error);
      alert('❌ Error ejecutando tests: ' + error.message);
    }
  },

  async saveAsPreset() {
    if (this.selectedTests.size === 0 || this.selectedModules.size === 0) {
      alert('⚠️ Selecciona al menos 1 test y 1 módulo');
      return;
    }

    const name = prompt('Nombre del preset:');
    if (!name) return;

    const description = prompt('Descripción (opcional):');

    try {
      const response = await fetch('/api/e2e-advanced/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          name,
          description: description || `Preset custom con ${this.selectedTests.size} tests × ${this.selectedModules.size} módulos`,
          config: {
            selectedTests: Array.from(this.selectedTests),
            selectedModules: Array.from(this.selectedModules),
            executionConfig: this.executionConfig
          },
          tags: ['custom']
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Preset guardado exitosamente!');
        await this.loadPresets();
        this.render();
      } else {
        alert('❌ Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error guardando preset:', error);
      alert('❌ Error guardando preset: ' + error.message);
    }
  },

  attachEventListeners() {
    console.log('✅ Event listeners attached');
  }
};

// Exportar
if (typeof window !== 'undefined') {
  window.E2ETestingAdvancedUnified = E2ETestingAdvancedUnified;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = E2ETestingAdvancedUnified;
}
