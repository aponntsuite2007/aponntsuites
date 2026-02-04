/**
 * 🤖 AI TESTING DASHBOARD - Panel de Control de Testing con IA
 *
 * Permite ejecutar y visualizar diferentes tipos de tests:
 * - Tests básicos (navegación + autodescubrimiento)
 * - Performance testing (k6 load tests)
 * - Security testing (OWASP ZAP)
 * - Database testing (queries, integridad)
 * - CRUD completo
 * - Test completo (7 phases)
 *
 * @version 1.0.0
 * @date 2026-01-08
 */

const AITestingDashboard = {
  currentView: 'overview',
  currentExecution: null,
  refreshInterval: null,

  /**
   * Inicializar dashboard
   * Llamado por AdminPanelController cuando se navega a la sección
   */
  async init(containerSelector = '#content-area') {
    console.log('🤖 [AI-TESTING] Inicializando AI Testing Dashboard...');

    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error('[AI-TESTING] Contenedor no encontrado:', containerSelector);
      return;
    }

    this.render();
    this.attachEventListeners();
    await this.loadTestHistory();
    await this.loadOverviewData();

    console.log('✅ [AI-TESTING] Dashboard inicializado');
  },

  /**
   * Cleanup cuando se sale de la sección
   */
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  },

  /**
   * Renderizar dashboard
   */
  render() {
    const html = `
      <div class="testing-dashboard">
        <!-- Header -->
        <div class="dashboard-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">
            🤖 AI Testing Dashboard
          </h1>
          <p style="margin: 0; opacity: 0.9;">
            Control de Testing Avanzado con IA - E2E, Performance, Security, Database
          </p>
        </div>

        <!-- Tabs -->
        <div class="testing-tabs" style="display: flex; gap: 10px; margin-bottom: 30px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
          <button class="testing-tab active" data-view="overview">
            📊 Overview
          </button>
          <button class="testing-tab" data-view="run">
            ▶️ Ejecutar Tests
          </button>
          <button class="testing-tab" data-view="history">
            📜 Historial
          </button>
          <button class="testing-tab" data-view="config">
            ⚙️ Configuración
          </button>
        </div>

        <!-- Content -->
        <div id="testing-content">
          ${this.renderOverview()}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  },

  /**
   * Renderizar vista Overview
   */
  renderOverview() {
    return `
      <div class="overview-section">
        <!-- Status Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">

          <!-- Card: Tests Ejecutados Hoy -->
          <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #4CAF50;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Tests Hoy</div>
                <div style="font-size: 32px; font-weight: bold; color: #333;" id="tests-today">0</div>
              </div>
              <div style="font-size: 48px; opacity: 0.2;">📊</div>
            </div>
          </div>

          <!-- Card: Pass Rate -->
          <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #2196F3;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Pass Rate Promedio</div>
                <div style="font-size: 32px; font-weight: bold; color: #333;" id="avg-pass-rate">0%</div>
              </div>
              <div style="font-size: 48px; opacity: 0.2;">✅</div>
            </div>
          </div>

          <!-- Card: Módulos Testeados -->
          <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #FF9800;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Módulos Testeados</div>
                <div style="font-size: 32px; font-weight: bold; color: #333;" id="modules-tested">0/35</div>
              </div>
              <div style="font-size: 48px; opacity: 0.2;">📦</div>
            </div>
          </div>

          <!-- Card: Test en Ejecución -->
          <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #9C27B0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="color: #666; font-size: 14px; margin-bottom: 5px;">Test Actual</div>
                <div style="font-size: 16px; font-weight: bold; color: #333;" id="current-test">Ninguno</div>
              </div>
              <div style="font-size: 48px; opacity: 0.2;">⚡</div>
            </div>
          </div>
        </div>

        <!-- Test en Progreso -->
        <div id="current-execution-panel" style="display: none; background: white; padding: 25px; border-radius: 10px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0;">🔄 Test en Ejecución</h3>
          <div id="execution-details"></div>
          <div style="margin-top: 15px;">
            <div style="background: #f5f5f5; border-radius: 10px; height: 30px; overflow: hidden;">
              <div id="progress-bar" style="background: linear-gradient(90deg, #4CAF50, #81C784); height: 100%; width: 0%; transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;"></div>
            </div>
          </div>
        </div>

        <!-- Últimos Resultados -->
        <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0;">📋 Últimos Tests Ejecutados</h3>
          <div id="recent-tests">
            <p style="text-align: center; color: #999; padding: 40px 0;">
              No hay tests recientes
            </p>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Renderizar vista Ejecutar Tests
   */
  renderRunTests() {
    return `
      <div class="run-tests-section">
        <h2 style="margin-top: 0;">▶️ Ejecutar Tests</h2>

        <!-- Selector de Tipo de Test -->
        <div style="background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0;">1️⃣ Seleccionar Tipo de Test</h3>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px;">

            <!-- Test Básico -->
            <div class="test-type-card" data-type="basic" style="border: 2px solid #e0e0e0; padding: 20px; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <div style="font-size: 36px;">🧪</div>
                <div>
                  <h4 style="margin: 0; font-size: 18px;">Test Básico</h4>
                  <span style="font-size: 12px; color: #666;">Navegación + Autodescubrimiento</span>
                </div>
              </div>
              <p style="margin: 10px 0; font-size: 14px; color: #666;">
                Verifica que todos los módulos carguen correctamente y descubre elementos automáticamente.
              </p>
              <div style="margin-top: 10px; font-size: 12px;">
                <span style="color: #4CAF50;">⏱️ ~1-2 horas</span>
              </div>
            </div>

            <!-- Test de Performance -->
            <div class="test-type-card" data-type="performance" style="border: 2px solid #e0e0e0; padding: 20px; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <div style="font-size: 36px;">⚡</div>
                <div>
                  <h4 style="margin: 0; font-size: 18px;">Performance (k6)</h4>
                  <span style="font-size: 12px; color: #666;">Load Testing + Métricas</span>
                </div>
              </div>
              <p style="margin: 10px 0; font-size: 14px; color: #666;">
                Mide tiempos de respuesta, throughput y carga con 10-500 usuarios concurrentes.
              </p>
              <div style="margin-top: 10px; font-size: 12px;">
                <span style="color: #FF9800;">⏱️ ~30-60 min</span>
              </div>
            </div>

            <!-- Test de Seguridad -->
            <div class="test-type-card" data-type="security" style="border: 2px solid #e0e0e0; padding: 20px; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <div style="font-size: 36px;">🔒</div>
                <div>
                  <h4 style="margin: 0; font-size: 18px;">Security (OWASP ZAP)</h4>
                  <span style="font-size: 12px; color: #666;">Vulnerabilidades</span>
                </div>
              </div>
              <p style="margin: 10px 0; font-size: 14px; color: #666;">
                Escanea vulnerabilidades de seguridad (SQL injection, XSS, CSRF, etc.).
              </p>
              <div style="margin-top: 10px; font-size: 12px;">
                <span style="color: #F44336;">⏱️ ~2-3 horas</span>
              </div>
            </div>

            <!-- Test de Base de Datos -->
            <div class="test-type-card" data-type="database" style="border: 2px solid #e0e0e0; padding: 20px; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <div style="font-size: 36px;">🗄️</div>
                <div>
                  <h4 style="margin: 0; font-size: 18px;">Database Testing</h4>
                  <span style="font-size: 12px; color: #666;">Integridad + Performance</span>
                </div>
              </div>
              <p style="margin: 10px 0; font-size: 14px; color: #666;">
                Verifica integridad de datos, queries lentas, índices, y constraints.
              </p>
              <div style="margin-top: 10px; font-size: 12px;">
                <span style="color: #2196F3;">⏱️ ~20-30 min</span>
              </div>
            </div>

            <!-- Test CRUD Completo -->
            <div class="test-type-card" data-type="crud" style="border: 2px solid #e0e0e0; padding: 20px; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <div style="font-size: 36px;">📝</div>
                <div>
                  <h4 style="margin: 0; font-size: 18px;">CRUD Completo</h4>
                  <span style="font-size: 12px; color: #666;">Create, Read, Update, Delete</span>
                </div>
              </div>
              <p style="margin: 10px 0; font-size: 14px; color: #666;">
                Testea operaciones CRUD completas + validación de persistencia en BD.
              </p>
              <div style="margin-top: 10px; font-size: 12px;">
                <span style="color: #9C27B0;">⏱️ ~3-4 horas</span>
              </div>
            </div>

            <!-- Test Completo (7 Phases) -->
            <div class="test-type-card" data-type="complete" style="border: 2px solid #e0e0e0; padding: 20px; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <div style="font-size: 36px;">🚀</div>
                <div>
                  <h4 style="margin: 0; font-size: 18px;">Test Completo</h4>
                  <span style="font-size: 12px; color: #666;">Todas las 7 Phases</span>
                </div>
              </div>
              <p style="margin: 10px 0; font-size: 14px; color: #666;">
                E2E + Performance + Security + Database + Multi-Tenant + Monitoring + Edge Cases.
              </p>
              <div style="margin-top: 10px; font-size: 12px;">
                <span style="color: #E91E63;">⏱️ ~6-8 horas</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuración del Test -->
        <div id="test-config-panel" style="display: none; background: white; padding: 25px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0;">2️⃣ Configurar Test</h3>
          <div id="test-config-content"></div>
        </div>

        <!-- Botón Ejecutar -->
        <div style="text-align: center; padding: 20px;">
          <button id="btn-execute-test" disabled style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; opacity: 0.5;">
            ▶️ Ejecutar Test
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Renderizar configuración para tipo de test seleccionado
   */
  renderTestConfig(testType) {
    const configs = {
      basic: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Timeout por módulo (segundos):</label>
            <input type="number" id="config-timeout" value="60" min="10" max="300" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Empresa a testear:</label>
            <select id="config-company" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="isi">ISI (35 módulos)</option>
              <option value="all">Todas las empresas</option>
            </select>
          </div>
        </div>
        <div style="margin-top: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <input type="checkbox" id="config-headless" checked> Modo headless (sin UI)
          </label>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <input type="checkbox" id="config-screenshots" checked> Guardar screenshots
          </label>
        </div>
      `,

      performance: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Usuarios concurrentes (máximo):</label>
            <input type="number" id="config-max-users" value="100" min="10" max="1000" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Duración (minutos):</label>
            <input type="number" id="config-duration" value="30" min="5" max="120" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
        </div>
        <div style="margin-top: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Ramp-up profile:</label>
          <select id="config-rampup" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="gradual">Gradual (10 → 50 → 100)</option>
            <option value="aggressive">Agresivo (10 → 100 directo)</option>
            <option value="steady">Constante (100 todo el tiempo)</option>
          </select>
        </div>
      `,

      security: `
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Nivel de escaneo:</label>
          <select id="config-scan-level" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="passive">Pasivo (sin ataques activos)</option>
            <option value="active">Activo (incluye ataques simulados)</option>
            <option value="full">Completo (todos los tests OWASP)</option>
          </select>
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Vulnerabilidades a testear:</label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked> SQL Injection
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked> XSS (Cross-Site Scripting)
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked> CSRF (Cross-Site Request Forgery)
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked> Authentication bypass
          </label>
        </div>
      `,

      database: `
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Tests a ejecutar:</label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked> Slow queries (> 1s)
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked> Missing indexes
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked> Foreign key integrity
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked> Data consistency
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked> Orphaned records
          </label>
        </div>
      `,

      crud: `
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Módulos a testear:</label>
          <select id="config-modules" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="all">Todos los módulos (35)</option>
            <option value="core">Solo CORE (15 módulos)</option>
            <option value="custom">Seleccionar manualmente</option>
          </select>
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <input type="checkbox" id="config-validation" checked> Validar persistencia en BD
          </label>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <input type="checkbox" id="config-cleanup" checked> Limpiar datos de prueba al finalizar
          </label>
        </div>
      `,

      complete: `
        <div style="background: #FFF3CD; border: 1px solid #FFE69C; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <strong>⚠️ Advertencia:</strong> El test completo puede tomar 6-8 horas. Se ejecutarán las 7 phases completas.
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Phases a ejecutar:</label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked disabled> E2E Testing
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked disabled> Performance (k6)
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked disabled> Security (OWASP ZAP)
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked disabled> Database Integrity
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked disabled> Multi-Tenant Isolation
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked disabled> Monitoring & Logging
          </label>
          <label style="display: block; margin-bottom: 5px;">
            <input type="checkbox" checked disabled> Edge Cases
          </label>
        </div>
      `
    };

    return configs[testType] || '<p>Configuración no disponible</p>';
  },

  /**
   * Renderizar vista Historial
   */
  renderHistory() {
    return `
      <div class="history-section">
        <h2 style="margin-top: 0;">📜 Historial de Tests</h2>

        <!-- Filtros -->
        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <select id="filter-type" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="">Todos los tipos</option>
              <option value="basic">Test Básico</option>
              <option value="performance">Performance</option>
              <option value="security">Security</option>
              <option value="database">Database</option>
              <option value="crud">CRUD</option>
              <option value="complete">Completo</option>
            </select>

            <select id="filter-status" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="">Todos los estados</option>
              <option value="passed">✅ Passed</option>
              <option value="failed">❌ Failed</option>
              <option value="running">🔄 En ejecución</option>
            </select>

            <input type="date" id="filter-date" style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">

            <button id="btn-apply-filters" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Aplicar Filtros
            </button>
          </div>
        </div>

        <!-- Tabla de historial -->
        <div style="background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
          <table id="history-table" style="width: 100%; border-collapse: collapse;">
            <thead style="background: #f5f5f5;">
              <tr>
                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #e0e0e0;">Fecha</th>
                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #e0e0e0;">Tipo</th>
                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #e0e0e0;">Estado</th>
                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #e0e0e0;">Pass Rate</th>
                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #e0e0e0;">Duración</th>
                <th style="padding: 15px; text-align: left; border-bottom: 2px solid #e0e0e0;">Acciones</th>
              </tr>
            </thead>
            <tbody id="history-tbody">
              <tr>
                <td colspan="6" style="padding: 40px; text-align: center; color: #999;">
                  Cargando historial...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /**
   * Renderizar vista Configuración
   */
  renderConfig() {
    return `
      <div class="config-section">
        <h2 style="margin-top: 0;">⚙️ Configuración</h2>

        <div style="background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h3>Configuración Global de Testing</h3>

          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Timeout global (segundos):</label>
            <input type="number" id="global-timeout" value="60" min="10" max="300" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
            <span style="font-size: 12px; color: #666;">Tiempo máximo de espera para operaciones</span>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Notificaciones:</label>
            <label style="display: block; margin-bottom: 5px;">
              <input type="checkbox" id="config-email-notify" checked> Enviar email al completar tests
            </label>
            <label style="display: block; margin-bottom: 5px;">
              <input type="checkbox" id="config-slack-notify"> Notificar en Slack
            </label>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Auto-cleanup:</label>
            <label style="display: block; margin-bottom: 5px;">
              <input type="checkbox" id="config-auto-cleanup" checked> Limpiar datos de prueba automáticamente
            </label>
            <label style="display: block; margin-bottom: 5px;">
              <input type="checkbox" id="config-keep-screenshots"> Mantener screenshots
            </label>
          </div>

          <div style="margin-top: 30px;">
            <button id="btn-save-config" style="padding: 12px 30px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              💾 Guardar Configuración
            </button>
          </div>
        </div>

        <!-- Herramientas Instaladas -->
        <div style="background: white; padding: 25px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h3>🔧 Herramientas Instaladas</h3>
          <div id="tools-status">
            <p style="color: #999;">Verificando herramientas...</p>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Adjuntar event listeners
   */
  attachEventListeners() {
    // Tabs
    document.querySelectorAll('.testing-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });

    // Test type cards
    document.addEventListener('click', (e) => {
      if (e.target.closest('.test-type-card')) {
        const card = e.target.closest('.test-type-card');
        const testType = card.dataset.type;

        // Highlight selected
        document.querySelectorAll('.test-type-card').forEach(c => {
          c.style.borderColor = '#e0e0e0';
          c.style.background = 'white';
        });
        card.style.borderColor = '#667eea';
        card.style.background = '#f8f9ff';

        // Show config
        this.showTestConfig(testType);
      }
    });

    // Execute button
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-execute-test') {
        this.executeTest();
      }
    });
  },

  /**
   * Cambiar vista
   */
  switchView(view) {
    this.currentView = view;

    // Update tabs
    document.querySelectorAll('.testing-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === view);
    });

    // Render content
    const content = document.getElementById('testing-content');
    switch(view) {
      case 'overview':
        content.innerHTML = this.renderOverview();
        this.loadOverviewData();
        break;
      case 'run':
        content.innerHTML = this.renderRunTests();
        break;
      case 'history':
        content.innerHTML = this.renderHistory();
        this.loadTestHistory();
        break;
      case 'config':
        content.innerHTML = this.renderConfig();
        this.loadConfigData();
        break;
    }
  },

  /**
   * Mostrar configuración de test
   */
  showTestConfig(testType) {
    const panel = document.getElementById('test-config-panel');
    const content = document.getElementById('test-config-content');
    const btnExecute = document.getElementById('btn-execute-test');

    panel.style.display = 'block';
    content.innerHTML = this.renderTestConfig(testType);
    btnExecute.disabled = false;
    btnExecute.style.opacity = '1';
    btnExecute.dataset.testType = testType;
  },

  /**
   * Ejecutar test
   */
  async executeTest() {
    const btnExecute = document.getElementById('btn-execute-test');
    const testType = btnExecute.dataset.testType;

    if (!testType) {
      alert('Por favor selecciona un tipo de test');
      return;
    }

    // Confirm
    if (!confirm(`¿Ejecutar test de tipo "${testType}"?`)) {
      return;
    }

    btnExecute.disabled = true;
    btnExecute.textContent = '⏳ Ejecutando...';

    try {
      // Call API to execute test
      const response = await fetch(`/api/testing/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType: testType,
          config: this.gatherTestConfig()
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Test iniciado correctamente');
        this.switchView('overview');
        this.startPolling();
      } else {
        alert('❌ Error al iniciar test: ' + data.error);
      }

    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      btnExecute.disabled = false;
      btnExecute.textContent = '▶️ Ejecutar Test';
    }
  },

  /**
   * Recopilar configuración del test
   */
  gatherTestConfig() {
    return {
      timeout: document.getElementById('config-timeout')?.value || 60,
      headless: document.getElementById('config-headless')?.checked || true,
      screenshots: document.getElementById('config-screenshots')?.checked || true,
      company: document.getElementById('config-company')?.value || 'isi',
      // ... más configuración según el tipo de test
    };
  },

  /**
   * Cargar datos de overview
   */
  async loadOverviewData() {
    try {
      const response = await fetch('/api/testing/overview');
      const data = await response.json();

      if (data.success) {
        document.getElementById('tests-today').textContent = data.testsToday || 0;
        document.getElementById('avg-pass-rate').textContent = (data.avgPassRate || 0) + '%';
        document.getElementById('modules-tested').textContent = `${data.modulesTested || 0}/35`;
        document.getElementById('current-test').textContent = data.currentTest || 'Ninguno';
      }
    } catch (error) {
      console.error('Error cargando overview:', error);
    }
  },

  /**
   * Cargar historial de tests
   */
  async loadTestHistory() {
    try {
      const response = await fetch('/api/testing/history');
      const data = await response.json();

      const tbody = document.getElementById('history-tbody');
      if (!tbody) return;

      if (data.success && data.history && data.history.length > 0) {
        tbody.innerHTML = data.history.map(test => `
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">${new Date(test.created_at).toLocaleString()}</td>
            <td style="padding: 15px;">${test.test_type}</td>
            <td style="padding: 15px;">${this.renderStatus(test.status)}</td>
            <td style="padding: 15px;">${test.pass_rate || 0}%</td>
            <td style="padding: 15px;">${test.duration || 'N/A'}</td>
            <td style="padding: 15px;">
              <button onclick="AITestingDashboard.viewTestDetails('${test.id}')" style="padding: 5px 15px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Ver Detalles
              </button>
            </td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="padding: 40px; text-align: center; color: #999;">
              No hay historial de tests disponible
            </td>
          </tr>
        `;
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  },

  /**
   * Renderizar status badge
   */
  renderStatus(status) {
    const badges = {
      passed: '<span style="background: #4CAF50; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">✅ PASSED</span>',
      failed: '<span style="background: #F44336; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">❌ FAILED</span>',
      running: '<span style="background: #FF9800; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">🔄 EN EJECUCIÓN</span>'
    };
    return badges[status] || status;
  },

  /**
   * Cargar configuración
   */
  async loadConfigData() {
    try {
      // Check tools status
      const response = await fetch('/api/testing/tools-status');
      const data = await response.json();

      const toolsDiv = document.getElementById('tools-status');
      if (toolsDiv && data.success) {
        toolsDiv.innerHTML = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            ${this.renderToolStatus('Playwright', data.playwright)}
            ${this.renderToolStatus('k6', data.k6)}
            ${this.renderToolStatus('OWASP ZAP', data.owasp_zap)}
            ${this.renderToolStatus('PostgreSQL', data.postgresql)}
          </div>
        `;
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  },

  /**
   * Renderizar status de herramienta
   */
  renderToolStatus(name, installed) {
    const icon = installed ? '✅' : '❌';
    const color = installed ? '#4CAF50' : '#F44336';
    const status = installed ? 'Instalado' : 'No instalado';

    return `
      <div style="border: 1px solid ${color}; padding: 15px; border-radius: 8px;">
        <div style="font-size: 24px;">${icon}</div>
        <div style="font-weight: bold; margin-top: 10px;">${name}</div>
        <div style="font-size: 12px; color: #666;">${status}</div>
      </div>
    `;
  },

  /**
   * Iniciar polling de estado
   */
  startPolling() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      if (this.currentView === 'overview') {
        this.loadOverviewData();
      }
    }, 5000); // Cada 5 segundos
  },

  /**
   * Ver detalles de test
   */
  viewTestDetails(testId) {
    alert(`Ver detalles del test: ${testId}\n(Funcionalidad en desarrollo)`);
  }
};

// CSS para tabs activos
const aiTestingStyle = document.createElement('style');
aiTestingStyle.textContent = `
  .testing-tab {
    padding: 12px 24px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    color: #666;
    transition: all 0.3s;
    border-bottom: 3px solid transparent;
  }

  .testing-tab:hover {
    color: #667eea;
    background: rgba(102, 126, 234, 0.1);
  }

  .testing-tab.active {
    color: #667eea;
    border-bottom-color: #667eea;
    font-weight: bold;
  }

  .test-type-card:hover {
    border-color: #667eea !important;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    transform: translateY(-2px);
  }
`;
document.head.appendChild(aiTestingStyle);

// Export for module systems and window global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AITestingDashboard;
}
if (typeof window !== 'undefined') {
  window.AITestingDashboard = AITestingDashboard;
}
