/**
 * DEPLOY MANAGER - Sistema de Migración de 3 Etapas
 *
 * Flujo: LOCAL → STAGING → PRODUCTION
 *
 * Características:
 * - Autenticación APONNT hardcodeada
 * - Validación de 50 tests en cada etapa
 * - Horarios programados para producción
 * - Backups automáticos
 * - Modo mantenimiento
 *
 * @module DeployManager3Stages
 * @version 2.0.0
 */

(function() {
  'use strict';

  const DeployManager = {
    // Estado
    isAuthenticated: false,
    currentUsername: null,
    currentPassword: null,

    // Constantes
    MIN_TESTS: 50,
    DEPLOY_USERNAME: 'APONNT',

    // Estado de las etapas
    stages: {
      local: { complete: false, testsPass: false },
      staging: { migrated: false, testsPass: false },
      production: { migrated: false }
    },

    /**
     * Inicializar módulo
     */
    init() {
      console.log('🚀 [DEPLOY-MANAGER-3STAGES] Inicializando...');

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

        // Status cards de cada etapa
        localStatus: document.getElementById('local-status'),
        stagingStatus: document.getElementById('staging-status'),
        productionStatus: document.getElementById('production-status'),

        // Botones de acción
        btnMigrateStaging: document.getElementById('btn-migrate-staging'),
        btnTestStaging: document.getElementById('btn-test-staging'),
        btnMigrateProduction: document.getElementById('btn-migrate-production'),

        // Progress indicators
        progressLocal: document.getElementById('progress-local'),
        progressStaging: document.getElementById('progress-staging'),
        progressProduction: document.getElementById('progress-production'),

        // Log output
        logOutput: document.getElementById('deploy-log-output'),

        // Maintenance mode
        maintenanceStatus: document.getElementById('maintenance-status'),
        maintenanceWindow: document.getElementById('maintenance-window')
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

      // Botones de las 3 etapas
      this.elements.btnMigrateStaging?.addEventListener('click', () => {
        this.executeStage1_MigrateToStaging();
      });

      this.elements.btnTestStaging?.addEventListener('click', () => {
        this.executeStage2_TestStaging();
      });

      this.elements.btnMigrateProduction?.addEventListener('click', () => {
        this.executeStage3_MigrateToProduction();
      });

      // Refresh buttons
      document.getElementById('btn-refresh-status')?.addEventListener('click', () => {
        this.refreshAllStatus();
      });
    },

    /**
     * Cargar datos iniciales
     */
    async loadInitialData() {
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

      // Cargar estado inicial
      this.refreshAllStatus();
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

      // Verificar credenciales localmente (hardcoded)
      if (username !== this.DEPLOY_USERNAME) {
        this.showAuthError('Usuario incorrecto. Solo usuario APONNT autorizado.');
        return;
      }

      this.elements.authButton.disabled = true;
      this.elements.authButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verificando...';

      try {
        // Verificar conectividad con backend
        const response = await fetch('/api/deploy/pre-deploy-check');

        if (!response.ok) {
          throw new Error('Error conectando con servidor de deploy');
        }

        // Autenticación exitosa
        this.isAuthenticated = true;
        this.currentUsername = username;
        this.currentPassword = password;

        this.addLog('✅ Autenticación exitosa como ' + username, 'success');
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
     * Refrescar estado de todas las etapas
     */
    async refreshAllStatus() {
      this.addLog('🔄 Actualizando estado de todas las etapas...', 'info');

      await Promise.all([
        this.checkLocalStatus(),
        this.checkMaintenanceStatus()
      ]);

      this.updateStageButtons();
    },

    /**
     * Verificar estado de LOCAL
     */
    async checkLocalStatus() {
      try {
        const response = await fetch('/api/deploy/pre-deploy-check');
        const data = await response.json();

        if (data.success) {
          const checks = data.checks;

          this.stages.local.testsPass = checks.testsPassed;
          this.stages.local.complete = checks.readyToDeploy;

          // Actualizar UI
          const statusHTML = `
            <h6>LOCAL (Localhost)</h6>
            <div class="mb-2">
              <small>BD Local:</small>
              <span class="badge ${checks.localDatabase ? 'badge-success' : 'badge-danger'}">
                ${checks.localDatabase ? 'Conectada' : 'Desconectada'}
              </span>
            </div>
            <div class="mb-2">
              <small>Migraciones Pendientes:</small>
              <span class="badge ${checks.migrationsPending === 0 ? 'badge-success' : 'badge-warning'}">
                ${checks.migrationsPending}
              </span>
            </div>
            <div class="mb-2">
              <small>Tests Exitosos:</small>
              <span class="badge ${checks.testsPassed ? 'badge-success' : 'badge-warning'}">
                ${checks.testsSuccessful}/${this.MIN_TESTS}
              </span>
            </div>
            <div class="mt-3">
              <strong>Estado: </strong>
              <span class="badge ${checks.readyToDeploy ? 'badge-success' : 'badge-warning'}">
                ${checks.readyToDeploy ? '✅ Listo para Staging' : '⚠️ No listo'}
              </span>
            </div>
          `;

          if (this.elements.localStatus) {
            this.elements.localStatus.innerHTML = statusHTML;
          }

          // Progress bar
          const progress = checks.readyToDeploy ? 100 : 50;
          if (this.elements.progressLocal) {
            this.elements.progressLocal.style.width = progress + '%';
            this.elements.progressLocal.className = `progress-bar ${checks.readyToDeploy ? 'bg-success' : 'bg-warning'}`;
          }
        }

      } catch (error) {
        console.error('Error verificando estado local:', error);
        this.addLog('❌ Error verificando estado local: ' + error.message, 'error');
      }
    },

    /**
     * Verificar estado de modo mantenimiento
     */
    async checkMaintenanceStatus() {
      try {
        const response = await fetch('/api/deploy/maintenance/status');
        const data = await response.json();

        if (data.success) {
          const inWindow = data.withinMaintenanceWindow;
          const modeActive = data.maintenanceMode;

          if (this.elements.maintenanceStatus) {
            this.elements.maintenanceStatus.innerHTML = `
              <span class="badge ${modeActive ? 'badge-warning' : 'badge-success'}">
                ${modeActive ? '🔧 Mantenimiento ACTIVO' : '✅ Normal'}
              </span>
            `;
          }

          if (this.elements.maintenanceWindow) {
            this.elements.maintenanceWindow.innerHTML = `
              <span class="badge ${inWindow ? 'badge-success' : 'badge-secondary'}">
                ${inWindow ? '✅ En horario permitido' : '⏰ Fuera de horario'}
              </span>
            `;
          }
        }

      } catch (error) {
        console.error('Error verificando modo mantenimiento:', error);
      }
    },

    /**
     * Actualizar botones según estado
     */
    updateStageButtons() {
      // Botón Migrate to Staging: habilitado si local está listo
      if (this.elements.btnMigrateStaging) {
        this.elements.btnMigrateStaging.disabled = !this.stages.local.complete;
      }

      // Botón Test Staging: habilitado si staging fue migrado
      if (this.elements.btnTestStaging) {
        this.elements.btnTestStaging.disabled = !this.stages.staging.migrated;
      }

      // Botón Migrate to Production: habilitado si staging tests pasaron
      if (this.elements.btnMigrateProduction) {
        this.elements.btnMigrateProduction.disabled = !this.stages.staging.testsPass;
      }
    },

    /**
     * ETAPA 1: Migrar a STAGING
     */
    async executeStage1_MigrateToStaging() {
      if (!confirm('⚠️ ¿Ejecutar migración a STAGING (Render Preview)?\n\nSe aplicarán todas las migraciones pendientes.')) {
        return;
      }

      this.elements.btnMigrateStaging.disabled = true;
      this.elements.btnMigrateStaging.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Migrando...';

      this.addLog('', 'info');
      this.addLog('═'.repeat(60), 'info');
      this.addLog('🚀 ETAPA 1: MIGRACIÓN A STAGING', 'info');
      this.addLog('═'.repeat(60), 'info');

      try {
        const response = await fetch('/api/deploy/migrate-to-staging', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.currentUsername,
            password: this.currentPassword
          })
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Error en migración a Staging');
        }

        this.addLog(`✅ STAGING MIGRADO: ${data.migrated} migraciones aplicadas`, 'success');

        if (data.results && data.results.length > 0) {
          data.results.forEach(r => {
            this.addLog(`  ${r.success ? '✅' : '❌'} ${r.migration}`, r.success ? 'success' : 'error');
          });
        }

        this.stages.staging.migrated = true;

        // Actualizar UI de Staging
        if (this.elements.stagingStatus) {
          this.elements.stagingStatus.innerHTML = `
            <h6>STAGING (Render Preview)</h6>
            <div class="mb-2">
              <small>Migraciones Aplicadas:</small>
              <span class="badge badge-success">${data.migrated}</span>
            </div>
            <div class="mt-3">
              <strong>Estado: </strong>
              <span class="badge badge-success">✅ Migrado</span>
            </div>
            <div class="mt-2">
              <small class="text-muted">Próximo paso: Ejecutar tests en Staging</small>
            </div>
          `;
        }

        if (this.elements.progressStaging) {
          this.elements.progressStaging.style.width = '50%';
          this.elements.progressStaging.className = 'progress-bar bg-info';
        }

        this.addLog('📋 PRÓXIMO PASO: Click en "Test Staging" para validar', 'info');
        this.updateStageButtons();

      } catch (error) {
        this.addLog(`❌ Error en ETAPA 1: ${error.message}`, 'error');

      } finally {
        this.elements.btnMigrateStaging.disabled = false;
        this.elements.btnMigrateStaging.innerHTML = '<i class="fas fa-upload"></i> 1. Migrate to Staging';
      }
    },

    /**
     * ETAPA 2: Ejecutar tests en STAGING
     */
    async executeStage2_TestStaging() {
      if (!confirm('🧪 ¿Ejecutar 50 tests en STAGING?\n\nEsto tomará varios minutos.')) {
        return;
      }

      this.elements.btnTestStaging.disabled = true;
      this.elements.btnTestStaging.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Testing...';

      this.addLog('', 'info');
      this.addLog('═'.repeat(60), 'info');
      this.addLog('🧪 ETAPA 2: TESTING EN STAGING', 'info');
      this.addLog('═'.repeat(60), 'info');

      try {
        const response = await fetch('/api/deploy/run-staging-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.currentUsername,
            password: this.currentPassword,
            companyId: 11,
            moduleKey: 'users'
          })
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Tests en Staging fallaron');
        }

        const testResults = data.testResults;

        this.addLog(`✅ TESTS EN STAGING EXITOSOS: ${testResults.passed}/${this.MIN_TESTS}`, 'success');
        this.addLog(`   Total tests: ${testResults.total}`, 'info');
        this.addLog(`   Exitosos: ${testResults.passed}`, 'success');
        this.addLog(`   Fallidos: ${testResults.failed}`, testResults.failed > 0 ? 'warning' : 'info');

        this.stages.staging.testsPass = testResults.success;

        // Actualizar UI de Staging
        if (this.elements.stagingStatus) {
          this.elements.stagingStatus.innerHTML = `
            <h6>STAGING (Render Preview)</h6>
            <div class="mb-2">
              <small>Tests Ejecutados:</small>
              <span class="badge badge-success">${testResults.total}</span>
            </div>
            <div class="mb-2">
              <small>Tests Exitosos:</small>
              <span class="badge ${testResults.success ? 'badge-success' : 'badge-warning'}">
                ${testResults.passed}/${this.MIN_TESTS}
              </span>
            </div>
            <div class="mt-3">
              <strong>Estado: </strong>
              <span class="badge ${testResults.success ? 'badge-success' : 'badge-warning'}">
                ${testResults.success ? '✅ Validado - Listo para Producción' : '⚠️ Tests insuficientes'}
              </span>
            </div>
          `;
        }

        if (this.elements.progressStaging) {
          this.elements.progressStaging.style.width = '100%';
          this.elements.progressStaging.className = 'progress-bar bg-success';
        }

        if (testResults.success) {
          this.addLog('📋 PRÓXIMO PASO: Click en "Migrate to Production" (verificar horario)', 'info');
        }

        this.updateStageButtons();

      } catch (error) {
        this.addLog(`❌ Error en ETAPA 2: ${error.message}`, 'error');

      } finally {
        this.elements.btnTestStaging.disabled = false;
        this.elements.btnTestStaging.innerHTML = '<i class="fas fa-vial"></i> 2. Test Staging';
      }
    },

    /**
     * ETAPA 3: Migrar a PRODUCTION
     */
    async executeStage3_MigrateToProduction() {
      const confirmed = confirm(
        '⚠️⚠️⚠️ MIGRACIÓN A PRODUCCIÓN ⚠️⚠️⚠️\n\n' +
        'Esta acción aplicará cambios en la BASE DE DATOS DE PRODUCCIÓN.\n\n' +
        '✓ Se creará un backup automático\n' +
        '✓ Se activará modo mantenimiento\n' +
        '✓ Solo disponible en horarios programados\n\n' +
        '¿Estás SEGURO de continuar?'
      );

      if (!confirmed) {
        return;
      }

      this.elements.btnMigrateProduction.disabled = true;
      this.elements.btnMigrateProduction.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Migrando...';

      this.addLog('', 'info');
      this.addLog('═'.repeat(60), 'info');
      this.addLog('🚀 ETAPA 3: MIGRACIÓN A PRODUCCIÓN', 'info');
      this.addLog('═'.repeat(60), 'info');

      try {
        const response = await fetch('/api/deploy/migrate-to-production', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.currentUsername,
            password: this.currentPassword,
            forceMaintenanceMode: true,
            bypassSchedule: false
          })
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Error en migración a Producción');
        }

        this.addLog(`✅ PRODUCCIÓN MIGRADA: ${data.migrated} migraciones aplicadas`, 'success');

        if (data.backup) {
          this.addLog(`💾 Backup creado: ${data.backup.backupFile}`, 'success');
        }

        if (data.results && data.results.length > 0) {
          data.results.forEach(r => {
            this.addLog(`  ${r.success ? '✅' : '❌'} ${r.migration}`, r.success ? 'success' : 'error');
          });
        }

        this.stages.production.migrated = true;

        // Actualizar UI de Production
        if (this.elements.productionStatus) {
          this.elements.productionStatus.innerHTML = `
            <h6>PRODUCTION (Render Main)</h6>
            <div class="mb-2">
              <small>Migraciones Aplicadas:</small>
              <span class="badge badge-success">${data.migrated}</span>
            </div>
            <div class="mb-2">
              <small>Backup Creado:</small>
              <span class="badge badge-success">✅</span>
            </div>
            <div class="mt-3">
              <strong>Estado: </strong>
              <span class="badge badge-success">✅ DEPLOYED!</span>
            </div>
            <div class="mt-2">
              <small class="text-success">Deploy completado exitosamente</small>
            </div>
          `;
        }

        if (this.elements.progressProduction) {
          this.elements.progressProduction.style.width = '100%';
          this.elements.progressProduction.className = 'progress-bar bg-success';
        }

        this.addLog('🎉 DEPLOY COMPLETO - Sistema en producción actualizado', 'success');

        // Actualizar estado de mantenimiento
        setTimeout(() => {
          this.checkMaintenanceStatus();
        }, 2000);

      } catch (error) {
        this.addLog(`❌ Error en ETAPA 3: ${error.message}`, 'error');

        if (error.message.includes('horarios programados')) {
          this.addLog('⏰ Deploy a producción solo permitido en ventanas de mantenimiento', 'warning');
          this.addLog('   2 AM - 5 AM todos los días', 'info');
          this.addLog('   11 PM - 12 AM sábados y domingos', 'info');
        }

      } finally {
        this.elements.btnMigrateProduction.disabled = false;
        this.elements.btnMigrateProduction.innerHTML = '<i class="fas fa-rocket"></i> 3. Migrate to Production';
      }
    },

    /**
     * Agregar log al output
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
  window.DeployManager3Stages = DeployManager;

})();
