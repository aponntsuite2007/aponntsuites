/**
 * DEPLOY MANAGER - Sistema de Migración Segura a Render
 *
 * Características:
 * - Autenticación APONNT hardcodeada
 * - Requiere mínimo 50 tests exitosos
 * - Confirmación manual antes de deploy
 * - Progress en tiempo real
 * - Rollback disponible
 *
 * @module DeployManager
 * @version 1.0.0
 */

(function() {
  'use strict';

  const DeployManager = {
    // Estado
    isAuthenticated: false,
    preDeployCheck: null,
    pendingMigrations: [],

    // Constantes
    MIN_TESTS: 50,
    DEPLOY_USERNAME: 'APONNT',

    /**
     * Inicializar módulo
     */
    init() {
      console.log('🚀 [DEPLOY-MANAGER] Inicializando...');

      this.cacheDOMElements();
      this.attachEventListeners();
      this.loadInitialData();
    },

    /**
     * Cachear elementos del DOM
     */
    cacheDOMElements() {
      this.elements = {
        // Secciones
        authSection: document.getElementById('deploy-auth-section'),
        dashboardSection: document.getElementById('deploy-dashboard-section'),

        // Auth
        authForm: document.getElementById('deploy-auth-form'),
        usernameInput: document.getElementById('deploy-username'),
        passwordInput: document.getElementById('deploy-password'),
        authError: document.getElementById('deploy-auth-error'),
        authButton: document.getElementById('deploy-auth-button'),

        // Dashboard
        testsStats: document.getElementById('deploy-tests-stats'),
        testsProgress: document.getElementById('deploy-tests-progress'),
        testsProgressBar: document.querySelector('#deploy-tests-progress .progress-bar'),
        testsMeetsReq: document.getElementById('deploy-tests-meets-req'),

        migrationsStatus: document.getElementById('deploy-migrations-status'),
        migrationsList: document.getElementById('deploy-migrations-list'),
        migrationsPending: document.getElementById('deploy-migrations-pending'),

        readyStatus: document.getElementById('deploy-ready-status'),
        deployButton: document.getElementById('deploy-execute-button'),

        logOutput: document.getElementById('deploy-log-output')
      };
    },

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
      // Auth form
      this.elements.authForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAuth();
      });

      // Deploy button
      this.elements.deployButton?.addEventListener('click', () => {
        this.confirmDeploy();
      });

      // Refresh buttons
      document.getElementById('deploy-refresh-stats')?.addEventListener('click', () => {
        this.loadTestStats();
      });

      document.getElementById('deploy-refresh-migrations')?.addEventListener('click', () => {
        this.loadPendingMigrations();
      });
    },

    /**
     * Cargar datos iniciales
     */
    async loadInitialData() {
      // Solo mostrar sección de auth
      this.showAuthSection();
    },

    /**
     * Mostrar sección de autenticación
     */
    showAuthSection() {
      if (this.elements.authSection) this.elements.authSection.style.display = 'block';
      if (this.elements.dashboardSection) this.elements.dashboardSection.style.display = 'none';
    },

    /**
     * Mostrar dashboard
     */
    showDashboard() {
      if (this.elements.authSection) this.elements.authSection.style.display = 'none';
      if (this.elements.dashboardSection) this.elements.dashboardSection.style.display = 'block';

      // Cargar datos
      this.loadTestStats();
      this.loadPendingMigrations();
      this.loadPreDeployCheck();
    },

    /**
     * Handle autenticación
     */
    async handleAuth() {
      const username = this.elements.usernameInput?.value.trim();
      const password = this.elements.passwordInput?.value;

      if (!username || !password) {
        this.showAuthError('Por favor ingrese usuario y contraseña');
        return;
      }

      this.elements.authButton.disabled = true;
      this.elements.authButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verificando...';

      try {
        // Verificar credenciales (hardcoded en backend)
        const response = await fetch('/api/deploy/pre-deploy-check', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Error verificando pre-requisitos');
        }

        // Verificar credenciales localmente
        if (username !== this.DEPLOY_USERNAME) {
          throw new Error('Usuario incorrecto');
        }

        // Autenticación exitosa
        this.isAuthenticated = true;
        this.currentUsername = username;
        this.currentPassword = password;

        this.showDashboard();

      } catch (error) {
        this.showAuthError(error.message);

      } finally {
        this.elements.authButton.disabled = false;
        this.elements.authButton.textContent = 'Autenticar';
      }
    },

    /**
     * Mostrar error de autenticación
     */
    showAuthError(message) {
      if (this.elements.authError) {
        this.elements.authError.textContent = message;
        this.elements.authError.style.display = 'block';

        setTimeout(() => {
          this.elements.authError.style.display = 'none';
        }, 5000);
      }
    },

    /**
     * Cargar estadísticas de tests
     */
    async loadTestStats() {
      try {
        const response = await fetch('/api/deploy/test-stats');
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        const stats = data.stats;
        const successfulTests = parseInt(stats.successful_24h) || 0;
        const meetsRequirement = stats.meets_requirement;

        // Actualizar UI
        const percentage = Math.min((successfulTests / this.MIN_TESTS) * 100, 100);

        if (this.elements.testsProgressBar) {
          this.elements.testsProgressBar.style.width = `${percentage}%`;
          this.elements.testsProgressBar.className = `progress-bar ${
            meetsRequirement ? 'bg-success' : 'bg-warning'
          }`;
        }

        if (this.elements.testsStats) {
          this.elements.testsStats.innerHTML = `
            <div class="row text-center">
              <div class="col">
                <h4>${successfulTests}</h4>
                <small>Tests Exitosos (24h)</small>
              </div>
              <div class="col">
                <h4>${this.MIN_TESTS}</h4>
                <small>Requeridos</small>
              </div>
              <div class="col">
                <h4 class="${meetsRequirement ? 'text-success' : 'text-warning'}">
                  ${meetsRequirement ? '✓' : '✗'}
                </h4>
                <small>${meetsRequirement ? 'Cumple' : 'No cumple'}</small>
              </div>
            </div>
          `;
        }

        if (this.elements.testsMeetsReq) {
          this.elements.testsMeetsReq.className = `badge ${
            meetsRequirement ? 'badge-success' : 'badge-warning'
          }`;
          this.elements.testsMeetsReq.textContent = meetsRequirement ? 'Cumple requisito' : 'No cumple requisito';
        }

        this.preDeployCheck = { ...this.preDeployCheck, testsPassed: meetsRequirement };
        this.updateReadyStatus();

      } catch (error) {
        console.error('Error cargando test stats:', error);
        this.addLog('❌ Error cargando estadísticas de tests', 'error');
      }
    },

    /**
     * Cargar migraciones pendientes
     */
    async loadPendingMigrations() {
      try {
        const response = await fetch('/api/deploy/pending-migrations');
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        this.pendingMigrations = data.pendingMigrations || [];

        // Actualizar UI
        if (this.elements.migrationsStatus) {
          this.elements.migrationsStatus.innerHTML = `
            <strong>Total:</strong> ${data.total} |
            <strong class="text-success">Ejecutadas:</strong> ${data.executed} |
            <strong class="text-warning">Pendientes:</strong> ${data.pending}
          `;
        }

        if (this.elements.migrationsList) {
          if (this.pendingMigrations.length === 0) {
            this.elements.migrationsList.innerHTML = `
              <div class="alert alert-success">
                ✅ No hay migraciones pendientes. La base de datos local está actualizada.
              </div>
            `;
          } else {
            this.elements.migrationsList.innerHTML = `
              <div class="alert alert-warning">
                ⚠️ Hay ${this.pendingMigrations.length} migraciones pendientes en BD local.
                Ejecutar: <code>node run-all-migrations.js</code>
              </div>
              <ul class="list-group">
                ${this.pendingMigrations.map(m => `
                  <li class="list-group-item">
                    <i class="fas fa-clock text-warning"></i>
                    ${m.file}
                  </li>
                `).join('')}
              </ul>
            `;
          }
        }

        this.preDeployCheck = {
          ...this.preDeployCheck,
          migrationsPending: this.pendingMigrations.length
        };
        this.updateReadyStatus();

      } catch (error) {
        console.error('Error cargando migraciones:', error);
        this.addLog('❌ Error cargando migraciones pendientes', 'error');
      }
    },

    /**
     * Cargar pre-deploy check
     */
    async loadPreDeployCheck() {
      try {
        const response = await fetch('/api/deploy/pre-deploy-check');
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        this.preDeployCheck = data.checks;
        this.updateReadyStatus();

      } catch (error) {
        console.error('Error en pre-deploy check:', error);
        this.addLog('❌ Error verificando pre-requisitos', 'error');
      }
    },

    /**
     * Actualizar estado de "listo para deploy"
     */
    updateReadyStatus() {
      if (!this.preDeployCheck) return;

      const isReady = this.preDeployCheck.readyToDeploy;

      if (this.elements.readyStatus) {
        this.elements.readyStatus.className = `alert ${isReady ? 'alert-success' : 'alert-warning'}`;
        this.elements.readyStatus.innerHTML = isReady
          ? '<i class="fas fa-check-circle"></i> <strong>Sistema listo para deploy a Render</strong>'
          : '<i class="fas fa-exclamation-triangle"></i> <strong>Sistema NO listo para deploy</strong><br><small>Verifica los requisitos arriba</small>';
      }

      if (this.elements.deployButton) {
        this.elements.deployButton.disabled = !isReady;
      }
    },

    /**
     * Confirmar deploy
     */
    confirmDeploy() {
      if (!this.preDeployCheck?.readyToDeploy) {
        alert('El sistema no cumple los requisitos para deploy.');
        return;
      }

      const confirmed = confirm(
        '⚠️ CONFIRMAR DEPLOY A PRODUCCIÓN (RENDER)\n\n' +
        `Se ejecutarán las migraciones en la base de datos de PRODUCCIÓN.\n\n` +
        `✓ Tests exitosos: ${this.preDeployCheck.testsSuccessful}/${this.MIN_TESTS}\n` +
        `✓ Migraciones locales: OK\n\n` +
        `¿Estás seguro de continuar?`
      );

      if (confirmed) {
        this.executeDeploy();
      }
    },

    /**
     * Ejecutar deploy
     */
    async executeDeploy() {
      this.elements.deployButton.disabled = true;
      this.elements.deployButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Desplegando...';

      this.addLog('🚀 Iniciando deploy a Render...', 'info');

      try {
        const response = await fetch('/api/deploy/migrate-to-render', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.currentUsername,
            password: this.currentPassword
          })
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        this.addLog(`✅ Deploy completado: ${data.migrated} migraciones ejecutadas`, 'success');

        if (data.results && data.results.length > 0) {
          data.results.forEach(result => {
            this.addLog(
              `${result.success ? '✅' : '❌'} ${result.migration}`,
              result.success ? 'success' : 'error'
            );

            if (result.error) {
              this.addLog(`   Error: ${result.error}`, 'error');
            }
          });
        }

        // Refresh data
        setTimeout(() => {
          this.loadPendingMigrations();
          this.loadPreDeployCheck();
        }, 2000);

      } catch (error) {
        this.addLog(`❌ Error en deploy: ${error.message}`, 'error');

      } finally {
        this.elements.deployButton.disabled = false;
        this.elements.deployButton.innerHTML = '<i class="fas fa-rocket"></i> Ejecutar Deploy a Render';
      }
    },

    /**
     * Agregar log
     */
    addLog(message, type = 'info') {
      if (!this.elements.logOutput) return;

      const timestamp = new Date().toLocaleTimeString();
      const colorClass = {
        info: 'text-info',
        success: 'text-success',
        error: 'text-danger',
        warning: 'text-warning'
      }[type] || 'text-muted';

      const logEntry = document.createElement('div');
      logEntry.className = `log-entry ${colorClass}`;
      logEntry.innerHTML = `<small>[${timestamp}]</small> ${message}`;

      this.elements.logOutput.appendChild(logEntry);
      this.elements.logOutput.scrollTop = this.elements.logOutput.scrollHeight;
    }
  };

  // Auto-inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DeployManager.init());
  } else {
    DeployManager.init();
  }

  // Exportar para uso global
  window.DeployManager = DeployManager;

})();
