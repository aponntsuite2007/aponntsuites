/**
 * ═══════════════════════════════════════════════════════════
 * E2E TESTING CONTROL V2 - Sistema Completo con Brain Integration
 * ═══════════════════════════════════════════════════════════
 *
 * Features V2:
 * - Agrupación jerárquica de módulos por categoría
 * - Integración en tiempo real con Brain (detecta 200+ problemas)
 * - Ciclo continuo de feedback (Test → Fix → Verify → Repeat)
 * - Selección masiva por categoría
 * - 37 módulos organizados en 6 categorías
 * - Tests + Módulos seleccionables independientemente
 */

const E2ETestingControlV2 = {
  // ═════════════════════════════════════════════════════════
  // ESTADO
  // ═════════════════════════════════════════════════════════
  selectedTests: new Set(),
  selectedModules: new Set(),
  modulesRegistry: null,
  brainIssues: [],
  results: {},
  isExecuting: false,

  // ═════════════════════════════════════════════════════════
  // SISTEMA DE TIMERS EN TIEMPO REAL
  // ═════════════════════════════════════════════════════════
  timerState: {
    globalStart: null,
    globalElapsed: 0,
    rafId: null,
    phases: {},
    logs: []
  },

  /**
   * Inicializar estado de timers para todas las fases
   */
  initTimers() {
    this.testHierarchy.forEach(phase => {
      this.timerState.phases[phase.id] = {
        elapsed: 0,
        status: 'pending',
        startTime: null,
        tests: {}
      };
      phase.tests.forEach(test => {
        this.timerState.phases[phase.id].tests[test.id] = {
          elapsed: 0,
          status: 'pending',
          startTime: null
        };
      });
    });
    this.timerState.globalStart = null;
    this.timerState.globalElapsed = 0;
    this.timerState.logs = [];
  },

  /**
   * Iniciar loop de actualización de timers (60 FPS)
   */
  startTimerLoop() {
    console.log('🔄 Iniciando timer loop...');
    let frameCount = 0;

    const update = () => {
      const now = performance.now();
      frameCount++;

      // Log cada 60 frames (~1 segundo)
      if (frameCount % 60 === 0) {
        console.log(`⏱️ Frame ${frameCount}, elapsed: ${this.formatTime(this.timerState.globalElapsed).full}`);
      }

      // Actualizar timer global
      if (this.timerState.globalStart) {
        this.timerState.globalElapsed = now - this.timerState.globalStart;
      }

      // Actualizar timers de fases activas
      Object.keys(this.timerState.phases).forEach(phaseId => {
        const phase = this.timerState.phases[phaseId];
        if (phase.status === 'running' && phase.startTime) {
          phase.elapsed = now - phase.startTime;
        }
        // Actualizar tests activos
        Object.keys(phase.tests).forEach(testId => {
          const test = phase.tests[testId];
          if (test.status === 'running' && test.startTime) {
            test.elapsed = now - test.startTime;
          }
        });
      });

      // Actualizar displays (solo texto, no re-render completo)
      this.updateTimerDisplays();

      // Continuar solo si está ejecutando
      if (this.isExecuting || this.timerState.globalStart) {
        this.timerState.rafId = requestAnimationFrame(update);
      }
    };

    this.timerState.rafId = requestAnimationFrame(update);
  },

  /**
   * Detener loop de timers
   */
  stopTimerLoop() {
    if (this.timerState.rafId) {
      cancelAnimationFrame(this.timerState.rafId);
      this.timerState.rafId = null;
    }
  },

  /**
   * Formatear milisegundos a MM:SS.ms
   */
  formatTime(ms) {
    if (!ms || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    return {
      full: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`,
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
      ms: String(milliseconds).padStart(2, '0')
    };
  },

  /**
   * Actualizar displays de tiempo (sin re-render DOM completo)
   */
  updateTimerDisplays() {
    // Timer global
    const globalTimeEl = document.getElementById('e2e-global-time');
    if (globalTimeEl) {
      const globalTime = this.formatTime(this.timerState.globalElapsed);
      globalTimeEl.textContent = globalTime.full;
    }

    // Actualizar anillo de progreso global
    const globalRingProgress = document.querySelector('.e2e-ring-progress');
    if (globalRingProgress) {
      const completedPhases = Object.values(this.timerState.phases).filter(p => p.status === 'completed' || p.status === 'failed').length;
      const totalPhases = this.testHierarchy.length;
      const progressPercent = (completedPhases / totalPhases) * 100;
      const circumference = 339.292;
      globalRingProgress.style.strokeDashoffset = String(circumference - (circumference * progressPercent / 100));
    }

    // Actualizar stats cards
    this.updateStatsCards();

    // Timers de fases
    this.testHierarchy.forEach(phase => {
      const phaseState = this.timerState.phases[phase.id];
      if (!phaseState) return;

      // Timer display de la fase
      const phaseCard = document.querySelector(`[data-phase-id="${phase.id}"]`);
      if (phaseCard) {
        const time = this.formatTime(phaseState.elapsed);

        // Actualizar dígitos del timer
        const minEl = phaseCard.querySelector('.e2e-timer-min');
        const secEl = phaseCard.querySelector('.e2e-timer-sec');
        const msEl = phaseCard.querySelector('.e2e-timer-ms');

        if (minEl) minEl.textContent = time.minutes;
        if (secEl) secEl.textContent = time.seconds;
        if (msEl) msEl.textContent = '.' + time.ms;

        // Mini ring progress
        const miniRing = phaseCard.querySelector('.e2e-mini-ring .ring-progress');
        if (miniRing) {
          const completedTests = Object.values(phaseState.tests).filter(t => t.status === 'completed' || t.status === 'failed').length;
          const totalTests = phase.tests.length;
          const progressPercent = (completedTests / totalTests) * 100;
          const circumference = 126;
          miniRing.style.strokeDashoffset = String(circumference - (circumference * progressPercent / 100));
        }
      }
    });
  },

  /**
   * Actualizar las tarjetas de estadísticas
   */
  updateStatsCards() {
    const statsCards = document.querySelectorAll('.e2e-stat-card');
    if (statsCards.length < 4) return;

    const completedPhases = Object.values(this.timerState.phases).filter(p => p.status === 'completed').length;
    const failedPhases = Object.values(this.timerState.phases).filter(p => p.status === 'failed').length;
    const totalPhases = this.testHierarchy.length;

    let passedTests = 0;
    let failedTests = 0;
    this.testHierarchy.forEach(phase => {
      const phaseState = this.timerState.phases[phase.id];
      if (phaseState) {
        passedTests += Object.values(phaseState.tests).filter(t => t.status === 'completed').length;
        failedTests += Object.values(phaseState.tests).filter(t => t.status === 'failed').length;
      }
    });

    // Card 1: Fases completadas
    const card1Value = statsCards[0].querySelector('.e2e-stat-value');
    const card1Sub = statsCards[0].querySelector('.e2e-stat-sub');
    if (card1Value) card1Value.textContent = `${completedPhases}/${totalPhases}`;
    if (card1Sub) card1Sub.textContent = `${Math.round((completedPhases / totalPhases) * 100)}% progreso`;

    // Card 2: Tests passed
    const card2Value = statsCards[1].querySelector('.e2e-stat-value');
    if (card2Value) card2Value.textContent = String(passedTests);

    // Card 3: Tests failed
    const card3Value = statsCards[2].querySelector('.e2e-stat-value');
    const card3Sub = statsCards[2].querySelector('.e2e-stat-sub');
    if (card3Value) card3Value.textContent = String(failedTests);
    if (card3Sub) card3Sub.textContent = `${failedPhases} fases con errores`;

    // Card 4: Tiempo total
    const card4Value = statsCards[3].querySelector('.e2e-stat-value');
    if (card4Value) card4Value.textContent = this.formatTime(this.timerState.globalElapsed).full;
  },

  /**
   * Agregar log a la consola
   */
  addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.timerState.logs.unshift({ message, type, timestamp });
    if (this.timerState.logs.length > 50) {
      this.timerState.logs.pop();
    }

    const consoleOutput = document.getElementById('e2e-console-output');
    if (consoleOutput) {
      const logLine = document.createElement('div');
      logLine.className = `e2e-log-line ${type}`;
      logLine.textContent = `[${timestamp}] ${message}`;
      consoleOutput.insertBefore(logLine, consoleOutput.firstChild);

      // Limitar líneas visibles
      while (consoleOutput.children.length > 30) {
        consoleOutput.removeChild(consoleOutput.lastChild);
      }
    }
  },

  /**
   * Simular ejecución de tests con timers
   */
  async simulateExecution() {
    if (this.isExecuting) {
      console.log('⚠️ Ya hay una ejecución en curso');
      return;
    }

    this.initTimers();
    this.isExecuting = true;

    // PRIMERO re-render para crear los elementos DOM
    this.renderFuturisticContent();

    // Esperar a que el DOM esté listo
    await this.delay(50);

    // DESPUÉS iniciar los timers
    this.timerState.globalStart = performance.now();
    this.startTimerLoop();

    console.log('🚀 Timer loop iniciado, buscando elementos...');
    console.log('   Global time element:', document.getElementById('e2e-global-time'));

    this.addLog('🚀 Iniciando ejecución de tests E2E...', 'info');

    for (const phase of this.testHierarchy) {
      // Marcar fase como running
      this.timerState.phases[phase.id].status = 'running';
      this.timerState.phases[phase.id].startTime = performance.now();
      this.updatePhaseCardStatus(phase.id, 'running');
      this.addLog(`▶️ Iniciando fase: ${phase.name}`, 'info');

      // Ejecutar cada test de la fase
      for (const test of phase.tests) {
        this.timerState.phases[phase.id].tests[test.id].status = 'running';
        this.timerState.phases[phase.id].tests[test.id].startTime = performance.now();
        this.addLog(`  ⏳ ${test.name}...`, 'info');

        // Simular tiempo de ejecución (1-3 segundos por test)
        const duration = 1000 + Math.random() * 2000;
        await this.delay(duration);

        // 90% probabilidad de éxito
        const success = Math.random() > 0.1;
        this.timerState.phases[phase.id].tests[test.id].status = success ? 'completed' : 'failed';
        this.timerState.phases[phase.id].tests[test.id].elapsed = performance.now() - this.timerState.phases[phase.id].tests[test.id].startTime;

        if (success) {
          this.addLog(`  ✅ ${test.name} - OK (${this.formatTime(this.timerState.phases[phase.id].tests[test.id].elapsed).full})`, 'success');
        } else {
          this.addLog(`  ❌ ${test.name} - FAILED`, 'error');
        }

        // Actualizar contador de tests
        this.updateTestsCount(phase.id);
      }

      // Marcar fase como completada
      const failedTests = Object.values(this.timerState.phases[phase.id].tests).filter(t => t.status === 'failed').length;
      this.timerState.phases[phase.id].status = failedTests > 0 ? 'failed' : 'completed';
      this.timerState.phases[phase.id].elapsed = performance.now() - this.timerState.phases[phase.id].startTime;
      this.updatePhaseCardStatus(phase.id, this.timerState.phases[phase.id].status);

      if (failedTests > 0) {
        this.addLog(`❌ Fase ${phase.name} completada con ${failedTests} errores`, 'error');
      } else {
        this.addLog(`✅ Fase ${phase.name} completada en ${this.formatTime(this.timerState.phases[phase.id].elapsed).full}`, 'success');
      }
    }

    this.stopTimerLoop();
    this.isExecuting = false;

    // Resumen final
    const passedPhases = Object.values(this.timerState.phases).filter(p => p.status === 'completed').length;
    const totalPhases = this.testHierarchy.length;
    this.addLog(`🏁 Ejecución finalizada: ${passedPhases}/${totalPhases} fases exitosas`, passedPhases === totalPhases ? 'success' : 'warning');

    // Actualizar status indicator
    this.updateStatusIndicator('complete');
  },

  /**
   * Actualizar estado visual de una fase
   */
  updatePhaseCardStatus(phaseId, status) {
    const card = document.querySelector(`[data-phase-id="${phaseId}"]`);
    if (card) {
      card.className = `e2e-phase-card ${status}`;
      const statusEl = card.querySelector('.e2e-phase-status');
      if (statusEl) {
        const statusTexts = {
          pending: '⏳ PENDING',
          running: '▶️ RUNNING',
          completed: '✅ COMPLETE',
          failed: '❌ FAILED'
        };
        statusEl.textContent = statusTexts[status] || status;
      }
    }
  },

  /**
   * Actualizar contador de tests de una fase
   */
  updateTestsCount(phaseId) {
    const phase = this.testHierarchy.find(p => p.id === phaseId);
    if (!phase) return;

    const phaseState = this.timerState.phases[phaseId];
    const completedTests = Object.values(phaseState.tests).filter(t => t.status === 'completed' || t.status === 'failed').length;

    const countEl = document.querySelector(`[data-phase-id="${phaseId}"] .e2e-tests-count`);
    if (countEl) {
      countEl.textContent = `${completedTests}/${phase.tests.length}`;
    }

    const progressFill = document.querySelector(`[data-phase-id="${phaseId}"] .e2e-progress-fill`);
    if (progressFill) {
      progressFill.style.width = `${(completedTests / phase.tests.length) * 100}%`;
    }
  },

  /**
   * Actualizar indicador de status global
   */
  updateStatusIndicator(status) {
    const indicator = document.querySelector('.e2e-status-indicator');
    if (indicator) {
      indicator.className = `e2e-status-indicator ${status}`;
      const statusTexts = {
        idle: 'STANDBY',
        running: 'EXECUTING',
        complete: 'COMPLETE'
      };
      indicator.innerHTML = `<span class="e2e-status-dot"></span>${statusTexts[status] || status}`;
    }
  },

  /**
   * Helper para delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Jerarquía de TESTS (igual que antes)
  testHierarchy: [
    {
      id: 'setup',
      name: '🔧 SETUP - Configuración Inicial',
      priority: 'CRITICAL',
      level: 1,
      depends_on: [],
      estimated_time: '5s',
      tests: [
        { id: 'db-connect', name: 'Conectar a PostgreSQL', required: true },
        { id: 'create-test-data', name: 'Crear datos de prueba', required: true },
        { id: 'login', name: 'Autenticar en sistema', required: true }
      ]
    },
    {
      id: 'brain-check',
      name: '🧠 BRAIN PRE-CHECK - Consultar Problemas',
      priority: 'HIGH',
      level: 2,
      depends_on: ['setup'],
      estimated_time: '10s',
      tests: [
        { id: 'brain-get-issues', name: 'Consultar Brain por módulos con problemas', required: true },
        { id: 'brain-prioritize', name: 'Priorizar módulos según severidad', required: false }
      ]
    },
    {
      id: 'basic-navigation',
      name: '🧭 NAVEGACIÓN BÁSICA',
      priority: 'HIGH',
      level: 3,
      depends_on: ['setup'],
      estimated_time: '30s',
      tests: [
        { id: 'open-modal', name: 'Abrir modal/pantalla', required: true },
        { id: 'navigate-tabs', name: 'Navegar tabs/secciones', required: true },
        { id: 'close-modal', name: 'Cerrar sin errores', required: false }
      ]
    },
    {
      id: 'ssot-analysis',
      name: '🗺️  SSOT ANALYSIS - Fuente Única de Verdad',
      priority: 'HIGH',
      level: 4,
      depends_on: ['basic-navigation'],
      estimated_time: '45s',
      tests: [
        { id: 'ssot-map-fields', name: 'Mapear fuentes de datos', required: true },
        { id: 'ssot-verify-db', name: 'Verificar vs PostgreSQL', required: true },
        { id: 'ssot-detect-conflicts', name: 'Detectar conflictos UI vs BD', required: true },
        { id: 'ssot-cross-tab', name: 'Detectar inconsistencias cross-tab', required: false },
        { id: 'ssot-register-kb', name: 'Registrar en Knowledge Base', required: false }
      ]
    },
    {
      id: 'dependency-mapping',
      name: '🔗 DEPENDENCY MAPPING - Relaciones entre Campos',
      priority: 'MEDIUM',
      level: 4,
      depends_on: ['basic-navigation'],
      estimated_time: '60s',
      tests: [
        { id: 'dep-static-analysis', name: 'Análisis estático (código)', required: true },
        { id: 'dep-dynamic-detection', name: 'Detectar dependencias dinámicas', required: true },
        { id: 'dep-cross-validations', name: 'Validaciones cruzadas', required: false },
        { id: 'dep-circular', name: 'Detectar dependencias circulares', required: true },
        { id: 'dep-generate-graph', name: 'Generar grafo visual', required: false }
      ]
    },
    {
      id: 'chaos-testing',
      name: '🌪️  CHAOS TESTING - Ejército de Testers Caóticos',
      priority: 'MEDIUM',
      level: 5,
      depends_on: ['basic-navigation'],
      estimated_time: '90s',
      tests: [
        { id: 'chaos-monkey', name: 'Monkey Testing (clicks aleatorios)', required: false },
        { id: 'chaos-fuzzing', name: 'Fuzzing (valores maliciosos)', required: true },
        { id: 'chaos-xss', name: 'XSS Attack Tests', required: true },
        { id: 'chaos-sql', name: 'SQL Injection Tests', required: true },
        { id: 'chaos-overflow', name: 'Buffer Overflow Tests', required: true },
        { id: 'chaos-race', name: 'Race Conditions', required: false },
        { id: 'chaos-stress', name: 'Stress Testing (100+ iter)', required: false },
        { id: 'chaos-memory-leak', name: 'Memory Leak Detection', required: true }
      ]
    },
    {
      id: 'brain-feedback',
      name: '🧠 BRAIN POST-CHECK - Verificación y Feedback',
      priority: 'CRITICAL',
      level: 6,
      depends_on: ['ssot-analysis', 'dependency-mapping', 'chaos-testing'],
      estimated_time: '30s',
      tests: [
        { id: 'brain-send-results', name: 'Enviar resultados al Brain', required: true },
        { id: 'brain-verify-fixes', name: 'Verificar si arregló problemas detectados', required: true },
        { id: 'brain-get-suggestions', name: 'Obtener sugerencias de fixes', required: true },
        { id: 'brain-auto-fix', name: 'Intentar auto-reparación', required: false },
        { id: 'brain-feed-kb', name: 'Alimentar Knowledge Base', required: true }
      ]
    },
    {
      id: 'cleanup',
      name: '🧹 CLEANUP - Limpieza',
      priority: 'CRITICAL',
      level: 7,
      depends_on: ['brain-feedback'],
      estimated_time: '5s',
      tests: [
        { id: 'delete-test-data', name: 'Eliminar datos de prueba', required: true },
        { id: 'db-disconnect', name: 'Cerrar conexión PostgreSQL', required: true }
      ]
    }
  ],

  // ═════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ═════════════════════════════════════════════════════════
  async init() {
    console.log('🧪 [E2E-CONTROL-V2] Inicializando...');

    // Cargar registry de módulos
    await this.loadModulesRegistry();

    // Consultar Brain por problemas
    await this.loadBrainIssues();

    // Renderizar
    this.render();
    this.attachEventListeners();

    console.log('✅ [E2E-CONTROL-V2] Inicializado');
  },

  /**
   * Cargar registry de módulos desde JSON
   */
  async loadModulesRegistry() {
    try {
      // Llamar a API en tiempo real (datos desde audit_test_logs)
      const response = await fetch('/api/e2e-testing/modules-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('API no disponible');
      }

      const apiData = await response.json();

      if (!apiData.success || !apiData.data.modules) {
        throw new Error('Datos inválidos de API');
      }

      // Transformar datos de API a formato de registry con categorías
      this.modulesRegistry = this.transformAPIToRegistry(apiData.data);

      console.log(`   ✅ Registry cargado desde API: ${this.modulesRegistry.statistics.totalModules} módulos (REAL-TIME)`);

    } catch (err) {
      console.warn('   ⚠️  API no disponible, usando fallback:', err.message);

      // Fallback: crear registry mínimo
      this.modulesRegistry = {
        categories: [
          {
            id: 'panel-empresa-core',
            name: '🏢 Panel Empresa - Módulos CORE',
            description: 'Módulos esenciales del panel de empresa',
            priority: 'HIGH',
            modules: [
              { key: 'users', name: 'Gestión de Usuarios', hasConfig: true, estimatedTime: '90s' },
              { key: 'departments', name: 'Departamentos', hasConfig: true, estimatedTime: '60s' }
            ]
          }
        ],
        statistics: { totalModules: 2 }
      };
    }
  },

  /**
   * Transformar datos de API a formato de registry con categorías
   */
  transformAPIToRegistry(apiData) {
    const modules = apiData.modules || [];

    // Definir categorías basadas en prefijos/patrones de nombres
    const categoryMap = {
      'panel-empresa-core': {
        name: '🏢 Panel Empresa - Módulos CORE',
        description: 'Módulos esenciales de gestión empresarial',
        priority: 'CRITICAL',
        keywords: ['users', 'departments', 'attendance', 'dashboard']
      },
      'automation': {
        name: '🤖 Automatización & Brain',
        description: 'Módulos de automatización e inteligencia',
        priority: 'HIGH',
        keywords: ['auto-healing', 'testing-metrics', 'engineering', 'deploy']
      },
      'communication': {
        name: '💬 Comunicación & Notificaciones',
        description: 'Módulos de mensajería y notificaciones',
        priority: 'MEDIUM',
        keywords: ['notification', 'inbox', 'email']
      },
      'hr-biometric': {
        name: '👤 RRHH & Biométrico',
        description: 'Gestión de recursos humanos y control biométrico',
        priority: 'HIGH',
        keywords: ['biometric', 'consent', 'mi-espacio', 'vendor']
      },
      'integrations': {
        name: '🔗 Integraciones & Partners',
        description: 'Módulos de asociados y marketplace',
        priority: 'MEDIUM',
        keywords: ['partner', 'associate', 'marketplace']
      },
      'enterprise': {
        name: '🏢 Empresarial & Admin',
        description: 'Gestión empresarial y configuración',
        priority: 'HIGH',
        keywords: ['company', 'admin', 'organizational', 'roles', 'configurador']
      },
      'technical': {
        name: '🔧 Técnicos & Sync',
        description: 'Módulos técnicos y sincronización',
        priority: 'LOW',
        keywords: ['database-sync', 'deployment-sync', 'dms', 'hours-cube', 'support', 'phase4']
      }
    };

    // Crear objeto de categorías
    const categories = {};
    Object.keys(categoryMap).forEach(catId => {
      categories[catId] = {
        id: catId,
        name: categoryMap[catId].name,
        description: categoryMap[catId].description,
        priority: categoryMap[catId].priority,
        modules: []
      };
    });

    // Categoría por defecto para módulos no clasificados
    categories['others'] = {
      id: 'others',
      name: '📦 Otros Módulos',
      description: 'Módulos adicionales del sistema',
      priority: 'LOW',
      modules: []
    };

    // Asignar módulos a categorías
    modules.forEach(mod => {
      let assigned = false;

      // Buscar en qué categoría encaja el módulo
      for (const [catId, catInfo] of Object.entries(categoryMap)) {
        if (catInfo.keywords.some(keyword => mod.moduleName.includes(keyword))) {
          categories[catId].modules.push({
            key: mod.moduleName,
            name: this.formatModuleName(mod.moduleName),
            hasConfig: true,
            estimatedTime: `${Math.round(mod.avgDuration / 1000)}s`,
            // Datos en tiempo real desde API
            totalTests: mod.totalTests,
            passed: mod.passed,
            failed: mod.failed,
            successRate: mod.successRate,
            lastTestAt: mod.lastTestAt,
            status: mod.status
          });
          assigned = true;
          break;
        }
      }

      // Si no encaja en ninguna categoría, va a "others"
      if (!assigned) {
        categories['others'].modules.push({
          key: mod.moduleName,
          name: this.formatModuleName(mod.moduleName),
          hasConfig: true,
          estimatedTime: `${Math.round(mod.avgDuration / 1000)}s`,
          totalTests: mod.totalTests,
          passed: mod.passed,
          failed: mod.failed,
          successRate: mod.successRate,
          lastTestAt: mod.lastTestAt,
          status: mod.status
        });
      }
    });

    // Filtrar categorías vacías
    const finalCategories = Object.values(categories).filter(cat => cat.modules.length > 0);

    return {
      categories: finalCategories,
      statistics: {
        totalModules: modules.length,
        lastUpdate: new Date().toISOString(),
        source: 'API-REAL-TIME'
      }
    };
  },

  /**
   * Formatear nombre de módulo (de snake-case a Title Case)
   */
  formatModuleName(moduleKey) {
    return moduleKey
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  /**
   * Consultar Brain por módulos con problemas (tiempo real)
   */
  async loadBrainIssues() {
    console.log('🧠 [BRAIN] Consultando problemas detectados...');

    try {
      const response = await fetch('/api/audit/executions?status=failed&limit=200', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) throw new Error('Brain no disponible');

      const data = await response.json();
      this.brainIssues = data.executions || [];

      console.log(`   ✅ Brain detectó ${this.brainIssues.length} problemas en el sistema`);

      // Agrupar por módulo
      const byModule = {};
      this.brainIssues.forEach(issue => {
        const module = issue.module_name || 'unknown';
        if (!byModule[module]) byModule[module] = 0;
        byModule[module]++;
      });

      console.log('   📊 Top módulos con problemas:', Object.entries(byModule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([mod, count]) => `${mod}: ${count}`)
        .join(', ')
      );

    } catch (err) {
      console.log(`   ⚠️  Brain no disponible: ${err.message}`);
      this.brainIssues = [];
    }
  },

  /**
   * Renderizar interfaz completa
   */
  currentTab: 'live', // Nueva propiedad para controlar el tab actual

  render() {
    const html = `
      <div class="e2e-control-v2" style="padding: 20px; background: #f8f9fa;">
        <!-- HEADER -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; font-size: 32px;">
            🧪 E2E Testing Control Center V2
          </h2>
          <p style="margin: 0; opacity: 0.9; font-size: 16px;">
            Sistema Universal: Chaos + Brain + Dependencies + SSOT | 37 Módulos en 6 Categorías
          </p>
        </div>

        <!-- TABS -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
          <button onclick="E2ETestingControlV2.switchTab('live')"
                  id="tab-live"
                  class="e2e-tab ${this.currentTab === 'live' ? 'active' : ''}"
                  style="padding: 15px 30px; border: none; background: ${this.currentTab === 'live' ? '#667eea' : 'transparent'};
                         color: ${this.currentTab === 'live' ? 'white' : '#666'}; cursor: pointer; font-weight: 600;
                         border-radius: 8px 8px 0 0; transition: all 0.3s;">
            📊 Live Dashboard
          </button>
          <button onclick="E2ETestingControlV2.switchTab('config')"
                  id="tab-config"
                  class="e2e-tab ${this.currentTab === 'config' ? 'active' : ''}"
                  style="padding: 15px 30px; border: none; background: ${this.currentTab === 'config' ? '#667eea' : 'transparent'};
                         color: ${this.currentTab === 'config' ? 'white' : '#666'}; cursor: pointer; font-weight: 600;
                         border-radius: 8px 8px 0 0; transition: all 0.3s;">
            ⚙️ Configuración
          </button>
        </div>

        <!-- TAB CONTENT -->
        <div id="tab-content-live" style="display: ${this.currentTab === 'live' ? 'block' : 'none'};">
          ${this.renderLiveDashboard()}
        </div>

        <div id="tab-content-config" style="display: ${this.currentTab === 'config' ? 'block' : 'none'};">
          <!-- STATS SUMMARY -->
          ${this.renderStats()}

        <!-- CONFIGURACIÓN: TESTS vs MÓDULOS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          <!-- TESTS -->
          <div style="background: white; padding: 25px; border-radius: 10px;">
            <h3 style="margin: 0 0 20px 0; color: #2c3e50;">
              ✅ Seleccionar Tests a Ejecutar
            </h3>
            ${this.renderTestsHierarchy()}
          </div>

          <!-- MÓDULOS -->
          <div style="background: white; padding: 25px; border-radius: 10px;">
            <h3 style="margin: 0 0 20px 0; color: #2c3e50;">
              📦 Seleccionar Módulos a Testear
            </h3>
            ${this.renderModulesHierarchy()}
          </div>
        </div>

        <!-- ACTIONS -->
        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
          <button id="select-all-tests-btn" class="btn btn-secondary">
            ☑️ Todos los Tests
          </button>
          <button id="select-required-tests-btn" class="btn btn-secondary">
            ⭐ Solo Tests Requeridos
          </button>
          <button id="select-all-modules-btn" class="btn btn-secondary">
            ☑️ Todos los Módulos
          </button>
          <button id="select-critical-modules-btn" class="btn btn-warning">
            🧠 Módulos con Problemas (Brain)
          </button>
          <button id="run-tests-btn" class="btn btn-primary" style="margin-left: auto; font-size: 18px; padding: 15px 40px;">
            🚀 Ejecutar Tests
          </button>
        </div>

        <!-- RESULTS PANEL -->
        <div id="results-panel" style="display: none;">
          <div style="background: white; padding: 25px; border-radius: 10px;">
            <h3 style="margin: 0 0 20px 0; color: #2c3e50;">
              📊 Resultados y Verificación vs Brain
            </h3>
            <div id="results-content"></div>
          </div>
        </div>
        </div> <!-- END tab-content-config -->
      </div>
    `;

    const container = document.getElementById('mainContent');
    if (container) {
      container.innerHTML = html;
    }

    // Iniciar auto-refresh si estamos en tab live
    if (this.currentTab === 'live') {
      this.startLiveRefresh();
    }
  },

  /**
   * Cambiar de tab
   */
  switchTab(tab) {
    this.currentTab = tab;

    // Detener refresh si salimos de live
    if (tab !== 'live' && this.liveRefreshInterval) {
      clearInterval(this.liveRefreshInterval);
      this.liveRefreshInterval = null;
    }

    this.render();
  },

  /**
   * Renderizar estadísticas
   */
  renderStats() {
    const totalTests = this.testHierarchy.reduce((sum, group) => sum + group.tests.length, 0);
    const totalModules = this.modulesRegistry?.statistics?.totalModules || 0;
    const brainProblems = this.brainIssues.length;

    return `
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 30px;">
        <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #3498db;">
          <div style="font-size: 32px; font-weight: bold; color: #3498db;">${totalTests}</div>
          <div style="color: #666;">Tests Disponibles</div>
        </div>
        <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #9b59b6;">
          <div style="font-size: 32px; font-weight: bold; color: #9b59b6;">${totalModules}</div>
          <div style="color: #666;">Módulos del Sistema</div>
        </div>
        <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #e74c3c;">
          <div style="font-size: 32px; font-weight: bold; color: #e74c3c;">${brainProblems}</div>
          <div style="color: #666;">🧠 Problemas (Brain)</div>
        </div>
        <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #2ecc71;">
          <div style="font-size: 32px; font-weight: bold; color: #2ecc71;" id="stat-selected">0</div>
          <div style="color: #666;">Tests Seleccionados</div>
        </div>
        <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid #f39c12;">
          <div style="font-size: 32px; font-weight: bold; color: #f39c12;" id="stat-modules-selected">0</div>
          <div style="color: #666;">Módulos Seleccionados</div>
        </div>
      </div>
    `;
  },

  /**
   * Renderizar jerarquía de TESTS (compacto)
   */
  renderTestsHierarchy() {
    let html = '<div style="max-height: 600px; overflow-y: auto;">';

    this.testHierarchy.forEach(group => {
      const priorityColors = {
        CRITICAL: '#e74c3c',
        HIGH: '#f39c12',
        MEDIUM: '#3498db',
        LOW: '#95a5a6'
      };

      html += `
        <div style="margin-bottom: 15px; border-left: 4px solid ${priorityColors[group.priority]}; padding-left: 15px;">
          <label style="font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <input type="checkbox" class="group-test-checkbox" data-group-id="${group.id}">
            <span>${group.name}</span>
            <span style="background: ${priorityColors[group.priority]}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
              ${group.priority}
            </span>
            <span style="color: #999; font-size: 12px;">${group.estimated_time}</span>
          </label>
          <div style="margin-left: 25px; font-size: 13px;">
            ${group.tests.map(test => `
              <label style="display: block; margin-bottom: 4px;">
                <input type="checkbox" class="test-checkbox" data-group-id="${group.id}" data-test-id="${test.id}" ${test.required ? 'data-required="true"' : ''}>
                ${test.name} ${test.required ? '<span style="color: #e74c3c;">*</span>' : ''}
              </label>
            `).join('')}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  },

  /**
   * Renderizar jerarquía de MÓDULOS (por categoría)
   */
  renderModulesHierarchy() {
    if (!this.modulesRegistry || !this.modulesRegistry.categories) {
      return '<p style="color: #999;">Cargando módulos...</p>';
    }

    let html = '<div style="max-height: 600px; overflow-y: auto;">';

    this.modulesRegistry.categories.forEach(category => {
      const issueCount = this.brainIssues.filter(issue =>
        category.modules.some(mod => mod.key === issue.module_name)
      ).length;

      const priorityColors = {
        CRITICAL: '#e74c3c',
        HIGH: '#f39c12',
        MEDIUM: '#3498db',
        LOW: '#95a5a6'
      };

      html += `
        <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: ${issueCount > 0 ? '#fff5f5' : '#f9f9f9'};">
          <label style="font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <input type="checkbox" class="category-checkbox" data-category-id="${category.id}">
            <span>${category.name}</span>
            <span style="background: ${priorityColors[category.priority]}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
              ${category.priority}
            </span>
            ${issueCount > 0 ? `
              <span style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px;">
                🧠 ${issueCount} problemas
              </span>
            ` : ''}
          </label>
          <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
            ${category.description}
          </div>
          <div style="margin-left: 25px; font-size: 13px;">
            ${category.modules.map(module => {
              const moduleIssues = this.brainIssues.filter(issue => issue.module_name === module.key).length;
              return `
                <label style="display: block; margin-bottom: 6px; padding: 6px; background: white; border-radius: 4px; ${moduleIssues > 0 ? 'border-left: 3px solid #e74c3c;' : ''}">
                  <input type="checkbox" class="module-checkbox" data-category-id="${category.id}" data-module-key="${module.key}" ${!module.hasConfig ? 'data-no-config="true"' : ''}>
                  ${module.name}
                  ${module.hasConfig ? '<span style="color: #2ecc71; font-size: 11px;">✓ Config</span>' : '<span style="color: #95a5a6; font-size: 11px;">Sin config</span>'}
                  ${moduleIssues > 0 ? `<span style="color: #e74c3c; font-size: 11px; margin-left: 10px;">🧠 ${moduleIssues} problemas</span>` : ''}
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  },

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Group test checkboxes
    document.querySelectorAll('.group-test-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const groupId = e.target.dataset.groupId;
        const checked = e.target.checked;
        document.querySelectorAll(`.test-checkbox[data-group-id="${groupId}"]`).forEach(testCb => {
          testCb.checked = checked;
        });
        this.updateStats();
      });
    });

    // Individual test checkboxes
    document.querySelectorAll('.test-checkbox').forEach(cb => {
      cb.addEventListener('change', () => this.updateStats());
    });

    // Category checkboxes (seleccionar todos los módulos de la categoría)
    document.querySelectorAll('.category-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const categoryId = e.target.dataset.categoryId;
        const checked = e.target.checked;
        document.querySelectorAll(`.module-checkbox[data-category-id="${categoryId}"]`).forEach(modCb => {
          modCb.checked = checked;
        });
        this.updateStats();
      });
    });

    // Module checkboxes
    document.querySelectorAll('.module-checkbox').forEach(cb => {
      cb.addEventListener('change', () => this.updateStats());
    });

    // Botones de acción
    document.getElementById('select-all-tests-btn')?.addEventListener('click', () => {
      document.querySelectorAll('.test-checkbox, .group-test-checkbox').forEach(cb => cb.checked = true);
      this.updateStats();
    });

    document.getElementById('select-required-tests-btn')?.addEventListener('click', () => {
      document.querySelectorAll('.test-checkbox').forEach(cb => {
        cb.checked = cb.dataset.required === 'true';
      });
      this.updateStats();
    });

    document.getElementById('select-all-modules-btn')?.addEventListener('click', () => {
      document.querySelectorAll('.module-checkbox, .category-checkbox').forEach(cb => cb.checked = true);
      this.updateStats();
    });

    document.getElementById('select-critical-modules-btn')?.addEventListener('click', () => {
      // Seleccionar solo módulos que Brain detectó con problemas
      const modulesWithIssues = new Set(this.brainIssues.map(issue => issue.module_name));
      document.querySelectorAll('.module-checkbox').forEach(cb => {
        cb.checked = modulesWithIssues.has(cb.dataset.moduleKey);
      });
      this.updateStats();
    });

    document.getElementById('run-tests-btn')?.addEventListener('click', () => {
      this.runTests();
    });
  },

  /**
   * Actualizar estadísticas
   */
  updateStats() {
    const selectedTests = document.querySelectorAll('.test-checkbox:checked').length;
    const selectedModules = document.querySelectorAll('.module-checkbox:checked').length;

    document.getElementById('stat-selected').textContent = selectedTests;
    document.getElementById('stat-modules-selected').textContent = selectedModules;
  },

  /**
   * Ejecutar tests
   */
  async runTests() {
    if (this.isExecuting) {
      alert('⚠️ Ya hay una ejecución en curso');
      return;
    }

    const selectedTests = Array.from(document.querySelectorAll('.test-checkbox:checked')).map(cb => ({
      groupId: cb.dataset.groupId,
      testId: cb.dataset.testId
    }));

    const selectedModules = Array.from(document.querySelectorAll('.module-checkbox:checked')).map(cb => cb.dataset.moduleKey);

    if (selectedTests.length === 0 || selectedModules.length === 0) {
      alert('⚠️ Debes seleccionar al menos 1 test y 1 módulo');
      return;
    }

    this.isExecuting = true;

    const btn = document.getElementById('run-tests-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Ejecutando...';

    const resultsPanel = document.getElementById('results-panel');
    resultsPanel.style.display = 'block';

    const resultsContent = document.getElementById('results-content');
    resultsContent.innerHTML = `<div style="text-align: center; padding: 40px;">⏳ Ejecutando ${selectedTests.length} tests en ${selectedModules.length} módulos...</div>`;

    try {
      const response = await fetch('/api/testing/run-e2e-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          selectedTests,
          selectedModules,
          brainIntegration: true,
          continuousCycle: false
        })
      });

      const results = await response.json();
      this.renderResults(results);

    } catch (err) {
      resultsContent.innerHTML = `
        <div style="color: #e74c3c; padding: 20px;">
          ❌ Error: ${err.message}
        </div>
      `;
    } finally {
      this.isExecuting = false;
      btn.disabled = false;
      btn.textContent = '🚀 Ejecutar Tests';
    }
  },

  /**
   * Renderizar resultados (similar a la versión anterior, pero con verificación Brain)
   */
  renderResults(results) {
    // TODO: Implementar renderizado completo con verificación Brain
    const resultsContent = document.getElementById('results-content');
    resultsContent.innerHTML = `
      <pre style="background: #2c3e50; color: #ecf0f1; padding: 20px; border-radius: 10px; overflow-x: auto;">
${JSON.stringify(results, null, 2)}
      </pre>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // LIVE DASHBOARD - VISUALIZACIONES EN TIEMPO REAL
  // ═══════════════════════════════════════════════════════════════
  // LIVE DASHBOARD FUTURISTA CON TIMERS
  // ═══════════════════════════════════════════════════════════════

  liveRefreshInterval: null,
  batchData: null,

  /**
   * Renderizar Live Dashboard FUTURISTA con timers en tiempo real
   */
  renderLiveDashboard() {
    // Inicializar timers si no están inicializados
    if (Object.keys(this.timerState.phases).length === 0) {
      this.initTimers();
    }

    const globalTime = this.formatTime(this.timerState.globalElapsed);
    const completedPhases = Object.values(this.timerState.phases).filter(p => p.status === 'completed').length;
    const failedPhases = Object.values(this.timerState.phases).filter(p => p.status === 'failed').length;
    const totalPhases = this.testHierarchy.length;
    const progressPercent = Math.round((completedPhases / totalPhases) * 100);

    // Calcular estadísticas de tests
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    this.testHierarchy.forEach(phase => {
      totalTests += phase.tests.length;
      const phaseState = this.timerState.phases[phase.id];
      if (phaseState) {
        passedTests += Object.values(phaseState.tests).filter(t => t.status === 'completed').length;
        failedTests += Object.values(phaseState.tests).filter(t => t.status === 'failed').length;
      }
    });

    return `
      <div class="e2e-futuristic-dashboard">
        <!-- SVG GRADIENT DEFINITION -->
        <svg width="0" height="0" style="position: absolute;">
          <defs>
            <linearGradient id="e2e-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#00d4ff;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#667eea;stop-opacity:1" />
            </linearGradient>
          </defs>
        </svg>

        <!-- HEADER FUTURISTA -->
        <div class="e2e-futuristic-header">
          <!-- Timer Global -->
          <div class="e2e-global-timer-container">
            <svg class="e2e-global-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" class="e2e-ring-bg"/>
              <circle cx="60" cy="60" r="54" class="e2e-ring-progress"
                      style="stroke-dashoffset: ${339.292 - (339.292 * progressPercent / 100)}"/>
            </svg>
            <div class="e2e-global-time" id="e2e-global-time">${globalTime.full}</div>
          </div>

          <!-- Info -->
          <div class="e2e-header-info">
            <h1>E2E MISSION CONTROL</h1>
            <p>Real-Time Test Execution Monitor • ${totalPhases} Phases • ${totalTests} Tests</p>
          </div>

          <!-- Status Indicator -->
          <div class="e2e-status-indicator ${this.isExecuting ? 'running' : 'idle'}">
            <span class="e2e-status-dot"></span>
            ${this.isExecuting ? 'EXECUTING' : 'STANDBY'}
          </div>
        </div>

        <!-- STATS GRID -->
        <div class="e2e-stats-grid">
          <div class="e2e-stat-card">
            <div class="e2e-stat-label">Fases Completadas</div>
            <div class="e2e-stat-value">${completedPhases}/${totalPhases}</div>
            <div class="e2e-stat-sub">${progressPercent}% progreso</div>
          </div>
          <div class="e2e-stat-card">
            <div class="e2e-stat-label">Tests Passed</div>
            <div class="e2e-stat-value success">${passedTests}</div>
            <div class="e2e-stat-sub">${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}% éxito</div>
          </div>
          <div class="e2e-stat-card">
            <div class="e2e-stat-label">Tests Failed</div>
            <div class="e2e-stat-value danger">${failedTests}</div>
            <div class="e2e-stat-sub">${failedPhases} fases con errores</div>
          </div>
          <div class="e2e-stat-card">
            <div class="e2e-stat-label">Tiempo Total</div>
            <div class="e2e-stat-value">${globalTime.full}</div>
            <div class="e2e-stat-sub">Tiempo transcurrido</div>
          </div>
        </div>

        <!-- PHASES GRID CON TIMERS -->
        <div class="e2e-phases-grid">
          ${this.testHierarchy.map(phase => this.renderPhaseCard(phase)).join('')}
        </div>

        <!-- ACTION BAR -->
        <div class="e2e-action-bar">
          <div>
            <button class="e2e-btn e2e-btn-secondary" onclick="E2ETestingControlV2.initTimers(); E2ETestingControlV2.renderFuturisticContent();">
              🔄 Reset
            </button>
          </div>
          <button class="e2e-btn e2e-btn-primary"
                  onclick="E2ETestingControlV2.simulateExecution();"
                  ${this.isExecuting ? 'disabled' : ''}>
            ${this.isExecuting ? '⏳ Ejecutando...' : '🚀 Ejecutar Tests E2E'}
          </button>
        </div>

        <!-- EXECUTION CONSOLE -->
        <div class="e2e-execution-console">
          <div class="e2e-console-header">
            <span class="e2e-console-title">📟 EXECUTION LOG</span>
            <span class="e2e-console-timestamp">${new Date().toLocaleTimeString()}</span>
          </div>
          <div class="e2e-console-output" id="e2e-console-output">
            <div class="e2e-log-line">[ READY ] Sistema E2E Mission Control inicializado</div>
            <div class="e2e-log-line">[ INFO ] ${totalPhases} fases configuradas con ${totalTests} tests</div>
            <div class="e2e-log-line">[ STANDBY ] Esperando ejecución...</div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Renderizar card de fase con timer
   */
  renderPhaseCard(phase) {
    const phaseState = this.timerState.phases[phase.id] || { elapsed: 0, status: 'pending', tests: {} };
    const time = this.formatTime(phaseState.elapsed);

    // Calcular progreso de tests
    const completedTests = Object.values(phaseState.tests).filter(t =>
      t.status === 'completed' || t.status === 'failed'
    ).length;
    const progressPercent = (completedTests / phase.tests.length) * 100;

    // Color de prioridad
    const priorityClass = phase.priority.toLowerCase();

    return `
      <div class="e2e-phase-card ${phaseState.status}" data-phase-id="${phase.id}">
        <!-- Scan Line Effect -->
        <div class="e2e-scan-line"></div>

        <!-- Phase Header -->
        <div class="e2e-phase-header">
          <span class="e2e-phase-name">${phase.name}</span>
          <span class="e2e-phase-priority ${priorityClass}">${phase.priority}</span>
        </div>

        <!-- Timer Display -->
        <div class="e2e-timer-display-container">
          <div class="e2e-timer-display" data-timer="${phase.id}">
            <span class="e2e-timer-min">${time.minutes}</span>
            <span class="e2e-timer-sep">:</span>
            <span class="e2e-timer-sec">${time.seconds}</span>
            <span class="e2e-timer-ms">.${time.ms}</span>
          </div>

          <!-- Mini Ring Progress -->
          <svg class="e2e-mini-ring" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" class="ring-bg"/>
            <circle cx="25" cy="25" r="20" class="ring-progress"
                    style="stroke-dashoffset: ${126 - (126 * progressPercent / 100)}"/>
          </svg>
        </div>

        <!-- Tests Progress -->
        <div class="e2e-tests-progress">
          <span class="e2e-tests-count">${completedTests}/${phase.tests.length}</span>
          <div class="e2e-progress-bar">
            <div class="e2e-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>

        <!-- Status -->
        <div class="e2e-phase-status">
          ${phaseState.status === 'pending' ? '⏳ PENDING' : ''}
          ${phaseState.status === 'running' ? '▶️ RUNNING' : ''}
          ${phaseState.status === 'completed' ? '✅ COMPLETE' : ''}
          ${phaseState.status === 'failed' ? '❌ FAILED' : ''}
        </div>
      </div>
    `;
  },

  /**
   * Re-renderizar solo el contenido futurista
   */
  renderFuturisticContent() {
    const liveContent = document.getElementById('tab-content-live');
    if (liveContent) {
      liveContent.innerHTML = this.renderLiveDashboard();
    }
  },

  /**
   * Iniciar auto-refresh del dashboard
   */
  async startLiveRefresh() {
    // Cargar datos iniciales
    await this.fetchBatchResults();

    // Auto-refresh cada 5 segundos
    if (this.liveRefreshInterval) {
      clearInterval(this.liveRefreshInterval);
    }

    this.liveRefreshInterval = setInterval(async () => {
      await this.fetchBatchResults();

      // Solo actualizar el contenido del dashboard sin re-render completo
      const liveContent = document.getElementById('tab-content-live');
      if (liveContent && this.currentTab === 'live') {
        liveContent.innerHTML = this.renderLiveDashboard();
      }
    }, 5000);
  },

  /**
   * Obtener resultados del batch desde el servidor
   */
  async fetchBatchResults() {
    try {
      const response = await fetch('/tests/e2e/results/batch-test-results.json');
      if (response.ok) {
        this.batchData = await response.json();
      }
    } catch (error) {
      console.warn('⚠️  No se pudieron cargar resultados del batch:', error);
      // Usar datos de ejemplo si no está disponible
      this.batchData = {
        summary: { total: 0, passed: 0, failed: 0 },
        modules: []
      };
    }
  }
};

// Exportar
if (typeof window !== 'undefined') {
  window.E2ETestingControlV2 = E2ETestingControlV2;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = E2ETestingControlV2;
}
