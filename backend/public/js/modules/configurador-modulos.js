/**
 * ============================================================================
 * CONFIGURADOR DE MÓDULOS - Sistema de Bundling y Auto-Conocimiento
 * ============================================================================
 *
 * Módulo para gestionar y configurar módulos del sistema desde panel admin.
 * Integrado con sistema de bundling, dependencias y pricing.
 *
 * @version 1.0.0
 * @date 2025-10-30
 */

(function() {
  'use strict';

  const ModulesConfigurator = {
    modules: [],
    stats: null,
    filters: {
      category: 'all',
      panel: 'all',
      isCore: 'all'
    },

    /**
     * Inicializar configurador
     */
    async init() {
      console.log('🧩 Inicializando Configurador de Módulos...');

      await this.loadModules();
      await this.loadStats();
      this.setupEventListeners();
      this.render();
    },

    /**
     * Cargar módulos desde API
     */
    async loadModules() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/modules', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar módulos');

        const data = await response.json();
        this.modules = data.modules || [];

        console.log(`✅ ${this.modules.length} módulos cargados`);
      } catch (error) {
        console.error('❌ Error cargando módulos:', error);
        this.showError('No se pudieron cargar los módulos');
      }
    },

    /**
     * Cargar estadísticas
     */
    async loadStats() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/modules/stats/general', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al cargar stats');

        const data = await response.json();
        this.stats = data.stats;
      } catch (error) {
        console.error('⚠️ Error cargando stats:', error);
      }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // Filtros
      document.getElementById('filterCategory')?.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.renderModulesTable();
      });

      document.getElementById('filterPanel')?.addEventListener('change', (e) => {
        this.filters.panel = e.target.value;
        this.renderModulesTable();
      });

      document.getElementById('filterCore')?.addEventListener('change', (e) => {
        this.filters.isCore = e.target.value;
        this.renderModulesTable();
      });

      // Botón refrescar
      document.getElementById('btnRefreshModules')?.addEventListener('click', async () => {
        await this.loadModules();
        await this.loadStats();
        this.render();
      });
    },

    /**
     * Renderizar todo el configurador
     */
    render() {
      this.renderStats();
      this.renderModulesTable();
    },

    /**
     * Renderizar estadísticas
     */
    renderStats() {
      if (!this.stats) return;

      const container = document.getElementById('modulesStatsContainer');
      if (!container) return;

      const html = `
        <div class="row">
          <div class="col-md-3">
            <div class="stat-card text-center">
              <div class="stat-icon">📦</div>
              <div class="stat-number">${this.stats.total}</div>
              <div class="stat-label">Total Módulos</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card text-center">
              <div class="stat-icon">🎁</div>
              <div class="stat-number">${this.stats.core}</div>
              <div class="stat-label">Core (Gratis)</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card text-center">
              <div class="stat-icon">🔗</div>
              <div class="stat-number">${this.stats.with_bundling}</div>
              <div class="stat-label">Con Bundling</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="stat-card text-center">
              <div class="stat-icon">💰</div>
              <div class="stat-number">${this.modules.filter(m => !m.isCore && m.basePrice > 0).length}</div>
              <div class="stat-label">Premium</div>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;
    },

    /**
     * Renderizar tabla de módulos
     */
    renderModulesTable() {
      const tbody = document.getElementById('modulesTableBody');
      if (!tbody) return;

      // Aplicar filtros
      let filtered = this.modules;

      if (this.filters.category !== 'all') {
        filtered = filtered.filter(m => m.category === this.filters.category);
      }

      if (this.filters.panel !== 'all') {
        filtered = filtered.filter(m => m.availableIn === this.filters.panel || m.availableIn === 'both');
      }

      if (this.filters.isCore !== 'all') {
        const isCore = this.filters.isCore === 'true';
        filtered = filtered.filter(m => m.isCore === isCore);
      }

      // Renderizar filas
      tbody.innerHTML = filtered.map(mod => `
        <tr>
          <td>
            <span style="font-size: 1.3em;">${mod.icon || '📦'}</span>
          </td>
          <td>
            <strong>${mod.name}</strong>
            <br>
            <small style="color: #666;">${mod.moduleKey}</small>
          </td>
          <td>
            <span class="badge badge-${this.getCategoryColor(mod.category)}">
              ${mod.category}
            </span>
          </td>
          <td>
            ${mod.isCore ?
              '<span class="badge badge-success">CORE</span>' :
              `<strong>$${parseFloat(mod.basePrice).toFixed(2)}</strong>/emp`
            }
          </td>
          <td>
            <span class="badge badge-${this.getPanelColor(mod.availableIn)}">
              ${mod.availableIn}
            </span>
          </td>
          <td>
            ${this.renderBundledModules(mod.bundledModules)}
          </td>
          <td>
            ${this.renderDependencies(mod.requirements)}
          </td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="ModulesConfigurator.viewDetails('${mod.id}')">
              👁️ Ver
            </button>
            <button class="btn btn-sm btn-info" onclick="ModulesConfigurator.editModule('${mod.id}')">
              ✏️
            </button>
          </td>
        </tr>
      `).join('');
    },

    /**
     * Renderizar módulos bundled
     */
    renderBundledModules(bundled) {
      if (!bundled || bundled.length === 0) {
        return '<small style="color: #999;">Ninguno</small>';
      }

      return `<small style="color: #27ae60;">🎁 ${bundled.length} gratis</small>`;
    },

    /**
     * Renderizar dependencias
     */
    renderDependencies(deps) {
      if (!deps || deps.length === 0) {
        return '<small style="color: #999;">Ninguna</small>';
      }

      return `<small style="color: #e74c3c;">⚠️ ${deps.length}</small>`;
    },

    /**
     * Ver detalles de módulo
     */
    async viewDetails(moduleId) {
      const module = this.modules.find(m => m.id === moduleId);
      if (!module) return;

      const html = `
        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <h3 style="margin: 0;">
            ${module.icon} ${module.name}
          </h3>
        </div>
        <div class="modal-body" style="padding: 20px;">
          <div class="row">
            <div class="col-md-6">
              <h6>📋 Información General</h6>
              <table class="table table-sm">
                <tr><th>Module Key:</th><td><code>${module.moduleKey}</code></td></tr>
                <tr><th>Categoría:</th><td>${module.category}</td></tr>
                <tr><th>Versión:</th><td>${module.version || '1.0.0'}</td></tr>
                <tr><th>Precio Base:</th><td>${module.isCore ? 'GRATIS (Core)' : `$${module.basePrice}/emp`}</td></tr>
                <tr><th>Disponible en:</th><td>${module.availableIn}</td></tr>
              </table>
            </div>
            <div class="col-md-6">
              <h6>🔗 Relaciones</h6>
              <p><strong>Módulos Bundled (gratis):</strong></p>
              <ul>
                ${module.bundledModules?.length > 0 ?
                  module.bundledModules.map(m => `<li>🎁 ${m}</li>`).join('') :
                  '<li style="color: #999;">Ninguno</li>'
                }
              </ul>
              <p><strong>Dependencias Requeridas:</strong></p>
              <ul>
                ${module.requirements?.length > 0 ?
                  module.requirements.map(m => `<li>⚠️ ${m}</li>`).join('') :
                  '<li style="color: #999;">Ninguna</li>'
                }
              </ul>
            </div>
          </div>
          <div style="margin-top: 20px;">
            <h6>📝 Descripción</h6>
            <p>${module.description || 'Sin descripción'}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="ModulesConfigurator.closeModal()">Cerrar</button>
          <button class="btn btn-primary" onclick="ModulesConfigurator.editModule('${module.id}')">✏️ Editar</button>
        </div>
      `;

      this.showModal(html);
    },

    /**
     * Editar módulo
     */
    editModule(moduleId) {
      alert('⚠️ Funcionalidad de edición en desarrollo.\n\nUsa el script populate-modules-with-bundling.js para editar módulos por ahora.');
    },

    /**
     * Helper: color por categoría
     */
    getCategoryColor(category) {
      const colors = {
        core: 'primary',
        security: 'danger',
        medical: 'info',
        rrhh: 'warning',
        siac: 'success'
      };
      return colors[category] || 'secondary';
    },

    /**
     * Helper: color por panel
     */
    getPanelColor(panel) {
      const colors = {
        admin: 'danger',
        company: 'success',
        both: 'info'
      };
      return colors[panel] || 'secondary';
    },

    /**
     * Mostrar modal
     */
    showModal(html) {
      // Crear modal temporal
      const modalId = 'moduleDetailsModal';
      let modal = document.getElementById(modalId);

      if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal fade';
        modal.innerHTML = `
          <div class="modal-dialog modal-lg">
            <div class="modal-content" id="${modalId}Content"></div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      document.getElementById(`${modalId}Content`).innerHTML = html;
      $(modal).modal('show');
    },

    /**
     * Cerrar modal
     */
    closeModal() {
      $('#moduleDetailsModal').modal('hide');
    },

    /**
     * Mostrar error
     */
    showError(message) {
      console.error('❌', message);
      alert(`❌ Error: ${message}`);
    }
  };

  // Exponer globalmente
  window.ModulesConfigurator = ModulesConfigurator;

  console.log('✅ Configurador de Módulos cargado');
})();
