/**
 * Admin Consent Management Module
 *
 * Purpose: Admin interface for creating, updating, and managing consent definitions
 * Features:
 * - Consent definitions table with search/filter
 * - Create/Edit consent modal
 * - Statistics dashboard
 * - Bulk operations
 * - Version history viewer
 *
 * @version 1.0.0
 * @date 2025-01-30
 */

console.log('📋 [CONSENT-MGMT] Admin Consent Management Module v1.0.0 loaded');

class ConsentManagement {
    constructor() {
        this.consents = [];
        this.filteredConsents = [];
        this.currentConsent = null;
        this.statsData = null;
        this.selectedConsents = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;

        // Consent categories
        this.categories = [
            { value: 'data_protection', label: 'Protección de Datos' },
            { value: 'biometric', label: 'Datos Biométricos' },
            { value: 'employment', label: 'Relación Laboral' },
            { value: 'medical', label: 'Información Médica' },
            { value: 'safety', label: 'Seguridad e Higiene' },
            { value: 'privacy', label: 'Privacidad' },
            { value: 'marketing', label: 'Marketing y Comunicaciones' },
            { value: 'legal', label: 'Legal y Compliance' },
            { value: 'custom', label: 'Personalizado' }
        ];

        // Applicable roles
        this.roles = [
            { value: 'employee', label: 'Empleado' },
            { value: 'vendor', label: 'Proveedor' },
            { value: 'leader', label: 'Líder' },
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'partner', label: 'Partner' },
            { value: 'admin', label: 'Administrador' }
        ];

        // Filters
        this.filters = {
            search: '',
            category: '',
            role: '',
            status: 'all',
            required: 'all'
        };

        // Sort
        this.sortBy = 'created_at';
        this.sortOrder = 'desc';
    }

    /**
     * Initialize the consent management module
     */
    async init() {
        console.log('📋 [CONSENT-MGMT] Initializing...');
        await this.loadConsents();
        await this.loadStats();
        this.renderConsentTable();
        this.renderStats();
        this.setupEventListeners();
        console.log('✅ [CONSENT-MGMT] Initialized successfully');
    }

    /**
     * Load all consents from API
     */
    async loadConsents() {
        try {
            const token = this.getAuthToken();
            const response = await fetch('/api/consents/all', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.consents = data.consents || [];
            this.applyFilters();

            console.log(`✅ [CONSENT-MGMT] Loaded ${this.consents.length} consents`);
        } catch (error) {
            console.error('❌ [CONSENT-MGMT] Error loading consents:', error);
            this.showNotification('Error cargando consentimientos: ' + error.message, 'error');
            this.consents = [];
        }
    }

    /**
     * Load statistics
     */
    async loadStats() {
        try {
            const token = this.getAuthToken();
            const response = await fetch('/api/consents/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.statsData = await response.json();
            console.log('✅ [CONSENT-MGMT] Stats loaded');
        } catch (error) {
            console.error('❌ [CONSENT-MGMT] Error loading stats:', error);
            this.statsData = null;
        }
    }

    /**
     * Apply filters to consents
     */
    applyFilters() {
        let filtered = [...this.consents];

        // Search filter
        if (this.filters.search) {
            const searchLower = this.filters.search.toLowerCase();
            filtered = filtered.filter(c =>
                c.consent_key.toLowerCase().includes(searchLower) ||
                c.title.toLowerCase().includes(searchLower) ||
                (c.description && c.description.toLowerCase().includes(searchLower))
            );
        }

        // Category filter
        if (this.filters.category) {
            filtered = filtered.filter(c => c.category === this.filters.category);
        }

        // Role filter
        if (this.filters.role) {
            filtered = filtered.filter(c =>
                c.applicable_roles && c.applicable_roles.includes(this.filters.role)
            );
        }

        // Status filter
        if (this.filters.status !== 'all') {
            const isActive = this.filters.status === 'active';
            filtered = filtered.filter(c => c.is_active === isActive);
        }

        // Required filter
        if (this.filters.required !== 'all') {
            const isRequired = this.filters.required === 'required';
            filtered = filtered.filter(c => c.is_required === isRequired);
        }

        // Sort
        filtered.sort((a, b) => {
            let valA = a[this.sortBy];
            let valB = b[this.sortBy];

            if (this.sortBy === 'created_at' || this.sortBy === 'updated_at') {
                valA = new Date(valA);
                valB = new Date(valB);
            }

            if (this.sortOrder === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });

        this.filteredConsents = filtered;
        this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
    }

    /**
     * Render consent table
     */
    renderConsentTable() {
        const container = document.getElementById('consents-table-container');
        if (!container) {
            console.warn('⚠️ [CONSENT-MGMT] Table container not found');
            return;
        }

        if (this.filteredConsents.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📋</div>
                    <h3>No hay consentimientos</h3>
                    <p>No se encontraron consentimientos con los filtros aplicados.</p>
                    <button class="btn btn-primary" onclick="consentMgmt.openCreateModal()">
                        ➕ Crear Primer Consentimiento
                    </button>
                </div>
            `;
            return;
        }

        // Pagination
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageConsents = this.filteredConsents.slice(start, end);

        let html = `
            <div style="overflow-x: auto;">
                <table class="users-table" style="width: 100%; border-collapse: collapse;">
                    <thead class="table-dark">
                        <tr>
                            <th style="width: 40px; text-align: center;">
                                <input type="checkbox" id="selectAllConsents"
                                       onchange="consentMgmt.toggleSelectAll(this.checked)">
                            </th>
                            <th style="cursor: pointer;" onclick="consentMgmt.sortTable('consent_key')">
                                🔑 Clave ${this.getSortIcon('consent_key')}
                            </th>
                            <th style="cursor: pointer;" onclick="consentMgmt.sortTable('title')">
                                📝 Título ${this.getSortIcon('title')}
                            </th>
                            <th style="cursor: pointer;" onclick="consentMgmt.sortTable('category')">
                                📁 Categoría ${this.getSortIcon('category')}
                            </th>
                            <th>👥 Roles Aplicables</th>
                            <th style="text-align: center; width: 80px;">⚠️ Requerido</th>
                            <th style="text-align: center; width: 80px;">📊 Versión</th>
                            <th style="text-align: center; width: 100px;">✅ Estado</th>
                            <th style="text-align: center; width: 200px;">⚙️ Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        pageConsents.forEach(consent => {
            const categoryLabel = this.categories.find(c => c.value === consent.category)?.label || consent.category;
            const rolesLabels = (consent.applicable_roles || [])
                .map(r => this.roles.find(role => role.value === r)?.label || r)
                .join(', ');

            const isSelected = this.selectedConsents.includes(consent.id);

            html += `
                <tr style="${isSelected ? 'background: #e3f2fd;' : ''}">
                    <td style="text-align: center;">
                        <input type="checkbox" class="consent-checkbox"
                               data-consent-id="${consent.id}"
                               ${isSelected ? 'checked' : ''}
                               onchange="consentMgmt.toggleSelectConsent(${consent.id}, this.checked)">
                    </td>
                    <td style="font-family: monospace; font-size: 12px;">
                        ${consent.consent_key}
                    </td>
                    <td style="font-weight: bold;">
                        ${consent.title}
                    </td>
                    <td>
                        <span style="background: #e3f2fd; padding: 4px 10px; border-radius: 12px; font-size: 11px;">
                            ${categoryLabel}
                        </span>
                    </td>
                    <td style="font-size: 12px;">
                        ${rolesLabels || 'Todos'}
                    </td>
                    <td style="text-align: center;">
                        ${consent.is_required ?
                            '<span style="color: #f44336; font-weight: bold;">SÍ</span>' :
                            '<span style="color: #999;">No</span>'}
                    </td>
                    <td style="text-align: center; font-weight: bold;">
                        v${consent.version}
                    </td>
                    <td style="text-align: center;">
                        ${consent.is_active ?
                            '<span style="background: #4caf50; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px;">ACTIVO</span>' :
                            '<span style="background: #999; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px;">INACTIVO</span>'}
                    </td>
                    <td style="text-align: center;">
                        <button class="btn-mini btn-info" onclick="consentMgmt.openViewModal(${consent.id})"
                                title="Ver detalles">👁️</button>
                        <button class="btn-mini btn-warning" onclick="consentMgmt.openEditModal(${consent.id})"
                                title="Editar">✏️</button>
                        <button class="btn-mini btn-secondary" onclick="consentMgmt.cloneConsent(${consent.id})"
                                title="Clonar">📋</button>
                        <button class="btn-mini ${consent.is_active ? 'btn-danger' : 'btn-success'}"
                                onclick="consentMgmt.toggleConsentStatus(${consent.id})"
                                title="${consent.is_active ? 'Desactivar' : 'Activar'}">
                            ${consent.is_active ? '🔴' : '🟢'}
                        </button>
                        <button class="btn-mini btn-primary" onclick="consentMgmt.viewHistory(${consent.id})"
                                title="Ver historial">📜</button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Render pagination
        this.renderPagination();
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        if (this.totalPages <= 1) return;

        const paginationContainer = document.getElementById('consents-pagination');
        if (!paginationContainer) return;

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
                <div style="color: #666; font-size: 14px;">
                    Mostrando ${((this.currentPage - 1) * this.itemsPerPage) + 1} -
                    ${Math.min(this.currentPage * this.itemsPerPage, this.filteredConsents.length)}
                    de ${this.filteredConsents.length} consentimientos
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-secondary"
                            onclick="consentMgmt.goToPage(1)"
                            ${this.currentPage === 1 ? 'disabled' : ''}>
                        ⏮️ Primera
                    </button>
                    <button class="btn btn-sm btn-secondary"
                            onclick="consentMgmt.goToPage(${this.currentPage - 1})"
                            ${this.currentPage === 1 ? 'disabled' : ''}>
                        ◀️ Anterior
                    </button>
                    <span style="padding: 8px 15px; background: #f5f5f5; border-radius: 4px; font-weight: bold;">
                        ${this.currentPage} / ${this.totalPages}
                    </span>
                    <button class="btn btn-sm btn-secondary"
                            onclick="consentMgmt.goToPage(${this.currentPage + 1})"
                            ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                        Siguiente ▶️
                    </button>
                    <button class="btn btn-sm btn-secondary"
                            onclick="consentMgmt.goToPage(${this.totalPages})"
                            ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                        Última ⏭️
                    </button>
                </div>
            </div>
        `;

        paginationContainer.innerHTML = html;
    }

    /**
     * Render statistics dashboard
     */
    renderStats() {
        const statsContainer = document.getElementById('consent-stats-container');
        if (!statsContainer || !this.statsData) return;

        const stats = this.statsData;

        let html = `
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
                <div class="stat-item" style="background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center;">
                    <div class="stat-value" style="font-size: 36px; font-weight: bold; color: #1976d2;">
                        ${stats.total || 0}
                    </div>
                    <div class="stat-label" style="color: #666; margin-top: 8px;">
                        Total Consentimientos
                    </div>
                </div>
                <div class="stat-item" style="background: #e8f5e9; padding: 20px; border-radius: 8px; text-align: center;">
                    <div class="stat-value" style="font-size: 36px; font-weight: bold; color: #388e3c;">
                        ${stats.active || 0}
                    </div>
                    <div class="stat-label" style="color: #666; margin-top: 8px;">
                        Activos
                    </div>
                </div>
                <div class="stat-item" style="background: #fff3e0; padding: 20px; border-radius: 8px; text-align: center;">
                    <div class="stat-value" style="font-size: 36px; font-weight: bold; color: #f57c00;">
                        ${stats.required || 0}
                    </div>
                    <div class="stat-label" style="color: #666; margin-top: 8px;">
                        Obligatorios
                    </div>
                </div>
                <div class="stat-item" style="background: #f3e5f5; padding: 20px; border-radius: 8px; text-align: center;">
                    <div class="stat-value" style="font-size: 36px; font-weight: bold; color: #7b1fa2;">
                        ${stats.acceptance_rate ? (stats.acceptance_rate * 100).toFixed(1) : 0}%
                    </div>
                    <div class="stat-label" style="color: #666; margin-top: 8px;">
                        Tasa de Aceptación
                    </div>
                </div>
            </div>
        `;

        // Category breakdown
        if (stats.by_category) {
            html += `
                <div style="margin: 30px 0;">
                    <h4 style="margin-bottom: 15px;">📊 Por Categoría</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
            `;

            Object.entries(stats.by_category).forEach(([category, count]) => {
                const categoryLabel = this.categories.find(c => c.value === category)?.label || category;
                html += `
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #333;">${count}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 4px;">${categoryLabel}</div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        statsContainer.innerHTML = html;
    }

    /**
     * Open create consent modal
     */
    openCreateModal() {
        this.currentConsent = null;
        this.renderConsentModal('create');
    }

    /**
     * Open edit consent modal
     */
    openEditModal(consentId) {
        this.currentConsent = this.consents.find(c => c.id === consentId);
        if (!this.currentConsent) {
            this.showNotification('Consentimiento no encontrado', 'error');
            return;
        }
        this.renderConsentModal('edit');
    }

    /**
     * Open view consent modal
     */
    openViewModal(consentId) {
        const consent = this.consents.find(c => c.id === consentId);
        if (!consent) {
            this.showNotification('Consentimiento no encontrado', 'error');
            return;
        }

        const categoryLabel = this.categories.find(c => c.value === consent.category)?.label || consent.category;
        const rolesLabels = (consent.applicable_roles || [])
            .map(r => this.roles.find(role => role.value === r)?.label || r)
            .join(', ');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';

        modal.innerHTML = `
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #333;">📋 ${consent.title}</h2>
                    <button onclick="consentMgmt.closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖️</button>
                </div>

                <div style="display: grid; gap: 20px;">
                    <div>
                        <strong>🔑 Clave:</strong>
                        <div style="font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 5px;">
                            ${consent.consent_key}
                        </div>
                    </div>

                    <div>
                        <strong>📁 Categoría:</strong>
                        <div style="margin-top: 5px;">
                            <span style="background: #e3f2fd; padding: 6px 14px; border-radius: 12px;">
                                ${categoryLabel}
                            </span>
                        </div>
                    </div>

                    <div>
                        <strong>📝 Descripción:</strong>
                        <div style="margin-top: 5px; color: #666;">
                            ${consent.description || 'Sin descripción'}
                        </div>
                    </div>

                    <div>
                        <strong>📄 Texto Completo:</strong>
                        <div style="margin-top: 10px; padding: 15px; background: #f9f9f9; border-left: 4px solid #2196f3; border-radius: 4px; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">
                            ${consent.full_text}
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>👥 Roles Aplicables:</strong>
                            <div style="margin-top: 5px;">
                                ${rolesLabels || 'Todos'}
                            </div>
                        </div>
                        <div>
                            <strong>⚠️ Requerido:</strong>
                            <div style="margin-top: 5px;">
                                ${consent.is_required ?
                                    '<span style="color: #f44336; font-weight: bold;">SÍ</span>' :
                                    '<span style="color: #999;">No</span>'}
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>📊 Versión:</strong>
                            <div style="margin-top: 5px; font-weight: bold;">
                                v${consent.version}
                            </div>
                        </div>
                        <div>
                            <strong>✅ Estado:</strong>
                            <div style="margin-top: 5px;">
                                ${consent.is_active ?
                                    '<span style="background: #4caf50; color: white; padding: 4px 10px; border-radius: 12px;">ACTIVO</span>' :
                                    '<span style="background: #999; color: white; padding: 4px 10px; border-radius: 12px;">INACTIVO</span>'}
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px;">
                    <button class="btn btn-warning" onclick="consentMgmt.closeModal(); consentMgmt.openEditModal(${consent.id})">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-secondary" onclick="consentMgmt.closeModal()">
                        ✖️ Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Render create/edit modal
     */
    renderConsentModal(mode = 'create') {
        const consent = this.currentConsent || {};
        const isEdit = mode === 'edit';
        const title = isEdit ? '✏️ Editar Consentimiento' : '➕ Crear Nuevo Consentimiento';

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';

        modal.innerHTML = `
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #333;">${title}</h2>
                    <button onclick="consentMgmt.closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖️</button>
                </div>

                <form id="consentForm">
                    <div style="display: grid; gap: 20px;">
                        <!-- Consent Key -->
                        <div>
                            <label style="display: block; font-weight: bold; margin-bottom: 8px;">
                                🔑 Clave del Consentimiento <span style="color: #f44336;">*</span>
                            </label>
                            <input type="text" id="consentKey"
                                   style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: monospace;"
                                   placeholder="ej: consent_biometric_data"
                                   value="${consent.consent_key || ''}"
                                   ${isEdit ? 'readonly' : ''}
                                   required>
                            <small style="color: #666; display: block; margin-top: 5px;">
                                Identificador único (solo letras, números y guiones bajos)
                            </small>
                        </div>

                        <!-- Title -->
                        <div>
                            <label style="display: block; font-weight: bold; margin-bottom: 8px;">
                                📝 Título <span style="color: #f44336;">*</span>
                            </label>
                            <input type="text" id="consentTitle"
                                   style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;"
                                   placeholder="ej: Consentimiento para procesamiento de datos biométricos"
                                   value="${consent.title || ''}"
                                   maxlength="255"
                                   required>
                        </div>

                        <!-- Description -->
                        <div>
                            <label style="display: block; font-weight: bold; margin-bottom: 8px;">
                                📄 Descripción Breve
                            </label>
                            <textarea id="consentDescription"
                                      style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;"
                                      rows="3"
                                      placeholder="Breve descripción del propósito del consentimiento"
                                      maxlength="500">${consent.description || ''}</textarea>
                        </div>

                        <!-- Full Text -->
                        <div>
                            <label style="display: block; font-weight: bold; margin-bottom: 8px;">
                                📜 Texto Completo <span style="color: #f44336;">*</span>
                            </label>
                            <textarea id="consentFullText"
                                      style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: Arial;"
                                      rows="8"
                                      placeholder="Texto completo del consentimiento que verá el usuario"
                                      maxlength="5000"
                                      required>${consent.full_text || ''}</textarea>
                            <small style="color: #666; display: block; margin-top: 5px;">
                                Este es el texto que el usuario leerá y aceptará (máximo 5000 caracteres)
                            </small>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <!-- Category -->
                            <div>
                                <label style="display: block; font-weight: bold; margin-bottom: 8px;">
                                    📁 Categoría <span style="color: #f44336;">*</span>
                                </label>
                                <select id="consentCategory"
                                        style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;"
                                        required>
                                    <option value="">Seleccionar categoría...</option>
                                    ${this.categories.map(cat => `
                                        <option value="${cat.value}" ${consent.category === cat.value ? 'selected' : ''}>
                                            ${cat.label}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <!-- Version (read-only for edit) -->
                            <div>
                                <label style="display: block; font-weight: bold; margin-bottom: 8px;">
                                    📊 Versión
                                </label>
                                <input type="text"
                                       style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #f5f5f5;"
                                       value="v${consent.version || 1}"
                                       readonly>
                                <small style="color: #666; display: block; margin-top: 5px;">
                                    ${isEdit ? 'Se incrementará automáticamente al guardar' : 'Comenzará en v1'}
                                </small>
                            </div>
                        </div>

                        <!-- Applicable Roles -->
                        <div>
                            <label style="display: block; font-weight: bold; margin-bottom: 8px;">
                                👥 Roles Aplicables <span style="color: #f44336;">*</span>
                            </label>
                            <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9f9f9;">
                                <div style="margin-bottom: 10px;">
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: bold;">
                                        <input type="checkbox" id="selectAllRoles" onchange="consentMgmt.toggleAllRoles(this.checked)">
                                        <span>Seleccionar Todos</span>
                                    </label>
                                </div>
                                <hr style="margin: 10px 0;">
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                    ${this.roles.map(role => {
                                        const isChecked = consent.applicable_roles?.includes(role.value) || false;
                                        return `
                                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                                <input type="checkbox" class="role-checkbox" value="${role.value}" ${isChecked ? 'checked' : ''}>
                                                <span>${role.label}</span>
                                            </label>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                            <small style="color: #666; display: block; margin-top: 5px;">
                                Selecciona al menos un rol
                            </small>
                        </div>

                        <!-- Flags -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #fff3e0;">
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                    <input type="checkbox" id="isRequired" ${consent.is_required ? 'checked' : ''}>
                                    <span style="font-weight: bold;">⚠️ Es Obligatorio</span>
                                </label>
                                <small style="color: #666; display: block; margin-top: 8px; margin-left: 30px;">
                                    Si está marcado, el usuario no podrá continuar sin aceptar
                                </small>
                            </div>

                            <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #e8f5e9;">
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                    <input type="checkbox" id="isActive" ${consent.is_active !== false ? 'checked' : ''}>
                                    <span style="font-weight: bold;">✅ Activo</span>
                                </label>
                                <small style="color: #666; display: block; margin-top: 8px; margin-left: 30px;">
                                    Solo los consentimientos activos se mostrarán a los usuarios
                                </small>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; margin-top: 30px;">
                        <button type="button" class="btn btn-info" onclick="consentMgmt.previewConsent()">
                            👁️ Vista Previa
                        </button>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn btn-secondary" onclick="consentMgmt.closeModal()">
                                ❌ Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                💾 ${isEdit ? 'Actualizar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup form submit
        document.getElementById('consentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConsent(isEdit);
        });
    }

    /**
     * Save consent (create or update)
     */
    async saveConsent(isEdit = false) {
        const consentKey = document.getElementById('consentKey').value.trim();
        const title = document.getElementById('consentTitle').value.trim();
        const description = document.getElementById('consentDescription').value.trim();
        const fullText = document.getElementById('consentFullText').value.trim();
        const category = document.getElementById('consentCategory').value;
        const isRequired = document.getElementById('isRequired').checked;
        const isActive = document.getElementById('isActive').checked;

        // Get selected roles
        const roleCheckboxes = document.querySelectorAll('.role-checkbox:checked');
        const applicableRoles = Array.from(roleCheckboxes).map(cb => cb.value);

        // Validation
        if (!consentKey || !title || !fullText || !category) {
            this.showNotification('Por favor completa todos los campos obligatorios', 'error');
            return;
        }

        if (applicableRoles.length === 0) {
            this.showNotification('Debes seleccionar al menos un rol aplicable', 'error');
            return;
        }

        const consentData = {
            consent_key: consentKey,
            title,
            description,
            full_text: fullText,
            category,
            applicable_roles: applicableRoles,
            is_required: isRequired,
            is_active: isActive
        };

        try {
            const token = this.getAuthToken();
            const url = isEdit ? `/api/consents/definitions/${this.currentConsent.id}` : '/api/consents/definitions';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(consentData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            this.showNotification(
                isEdit ? 'Consentimiento actualizado exitosamente' : 'Consentimiento creado exitosamente',
                'success'
            );

            this.closeModal();
            await this.loadConsents();
            await this.loadStats();
            this.renderConsentTable();
            this.renderStats();

        } catch (error) {
            console.error('❌ [CONSENT-MGMT] Error saving consent:', error);
            this.showNotification('Error guardando consentimiento: ' + error.message, 'error');
        }
    }

    /**
     * Clone consent
     */
    async cloneConsent(consentId) {
        const consent = this.consents.find(c => c.id === consentId);
        if (!consent) return;

        const confirmed = confirm(`¿Clonar el consentimiento "${consent.title}"?\n\nSe creará una copia con el sufijo "_copy"`);
        if (!confirmed) return;

        this.currentConsent = {
            ...consent,
            consent_key: consent.consent_key + '_copy',
            title: consent.title + ' (Copia)',
            version: 1,
            is_active: false
        };

        this.renderConsentModal('create');
    }

    /**
     * Toggle consent active/inactive status
     */
    async toggleConsentStatus(consentId) {
        const consent = this.consents.find(c => c.id === consentId);
        if (!consent) return;

        const newStatus = !consent.is_active;
        const action = newStatus ? 'activar' : 'desactivar';

        const confirmed = confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} el consentimiento "${consent.title}"?`);
        if (!confirmed) return;

        try {
            const token = this.getAuthToken();
            const response = await fetch(`/api/consents/definitions/${consentId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: newStatus })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            this.showNotification(`Consentimiento ${action === 'activar' ? 'activado' : 'desactivado'} exitosamente`, 'success');
            await this.loadConsents();
            this.renderConsentTable();

        } catch (error) {
            console.error('❌ [CONSENT-MGMT] Error toggling status:', error);
            this.showNotification('Error cambiando estado: ' + error.message, 'error');
        }
    }

    /**
     * View version history
     */
    async viewHistory(consentId) {
        const consent = this.consents.find(c => c.id === consentId);
        if (!consent) return;

        // For now, show a simple modal
        // In production, this would fetch version history from the API
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';

        modal.innerHTML = `
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 700px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #333;">📜 Historial de Versiones</h2>
                    <button onclick="consentMgmt.closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">✖️</button>
                </div>

                <div style="padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📜</div>
                    <h3>Historial de Versiones</h3>
                    <p style="color: #666;">Versión actual: v${consent.version}</p>
                    <p style="color: #999; font-size: 14px;">
                        El sistema de control de versiones estará disponible próximamente.
                        Cada modificación incrementará la versión y se guardará el historial completo.
                    </p>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="consentMgmt.closeModal()">
                        ✖️ Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Preview consent as users would see it
     */
    previewConsent() {
        const title = document.getElementById('consentTitle').value.trim();
        const fullText = document.getElementById('consentFullText').value.trim();

        if (!title || !fullText) {
            this.showNotification('Completa el título y texto completo para ver la vista previa', 'warning');
            return;
        }

        const previewModal = document.createElement('div');
        previewModal.className = 'modal-overlay';
        previewModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; justify-content: center; align-items: center; z-index: 10001;';

        previewModal.innerHTML = `
            <div class="modal-content" style="background: white; padding: 30px; border-radius: 15px; width: 90%; max-width: 600px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">👁️ Vista Previa</h3>
                    <button onclick="this.closest('.modal-overlay').remove()"
                            style="background: none; border: none; font-size: 24px; cursor: pointer;">✖️</button>
                </div>

                <div style="border: 2px solid #2196f3; padding: 20px; border-radius: 8px; background: #f9f9f9;">
                    <h4 style="margin-top: 0; color: #1976d2;">${title}</h4>
                    <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">
                        ${fullText}
                    </div>
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" disabled>
                            <span>He leído y acepto este consentimiento</span>
                        </label>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cerrar Vista Previa
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(previewModal);
    }

    /**
     * Toggle select all roles
     */
    toggleAllRoles(checked) {
        document.querySelectorAll('.role-checkbox').forEach(cb => {
            cb.checked = checked;
        });
    }

    /**
     * Toggle select all consents
     */
    toggleSelectAll(checked) {
        document.querySelectorAll('.consent-checkbox').forEach(cb => {
            const consentId = parseInt(cb.dataset.consentId);
            this.toggleSelectConsent(consentId, checked);
            cb.checked = checked;
        });
    }

    /**
     * Toggle select consent
     */
    toggleSelectConsent(consentId, selected) {
        if (selected) {
            if (!this.selectedConsents.includes(consentId)) {
                this.selectedConsents.push(consentId);
            }
        } else {
            this.selectedConsents = this.selectedConsents.filter(id => id !== consentId);
        }

        this.updateBulkActionsButton();
    }

    /**
     * Update bulk actions button
     */
    updateBulkActionsButton() {
        const bulkBtn = document.getElementById('bulkActionsBtn');
        if (bulkBtn) {
            bulkBtn.textContent = `⚡ Acciones Masivas (${this.selectedConsents.length})`;
            bulkBtn.disabled = this.selectedConsents.length === 0;
        }
    }

    /**
     * Show bulk actions menu
     */
    showBulkActions() {
        if (this.selectedConsents.length === 0) {
            this.showNotification('Selecciona al menos un consentimiento', 'warning');
            return;
        }

        const actions = [
            { id: 'activate', label: '🟢 Activar seleccionados', action: () => this.bulkActivate() },
            { id: 'deactivate', label: '🔴 Desactivar seleccionados', action: () => this.bulkDeactivate() },
            { id: 'export', label: '📤 Exportar seleccionados', action: () => this.bulkExport() },
            { id: 'delete', label: '🗑️ Eliminar seleccionados', action: () => this.bulkDelete() }
        ];

        const menu = document.createElement('div');
        menu.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000;';

        menu.innerHTML = `
            <h3 style="margin-top: 0;">⚡ Acciones Masivas</h3>
            <p style="color: #666; margin-bottom: 20px;">
                ${this.selectedConsents.length} consentimiento(s) seleccionado(s)
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${actions.map(a => `
                    <button class="btn btn-primary" onclick="consentMgmt.closeBulkMenu(); consentMgmt.${a.id === 'activate' ? 'bulkActivate' : a.id === 'deactivate' ? 'bulkDeactivate' : a.id === 'export' ? 'bulkExport' : 'bulkDelete'}()">
                        ${a.label}
                    </button>
                `).join('')}
                <button class="btn btn-secondary" onclick="consentMgmt.closeBulkMenu()">
                    ❌ Cancelar
                </button>
            </div>
        `;

        menu.id = 'bulkActionsMenu';
        document.body.appendChild(menu);
    }

    closeBulkMenu() {
        const menu = document.getElementById('bulkActionsMenu');
        if (menu) menu.remove();
    }

    async bulkActivate() {
        // Implementation for bulk activate
        this.showNotification('Función de activación masiva en desarrollo', 'info');
    }

    async bulkDeactivate() {
        // Implementation for bulk deactivate
        this.showNotification('Función de desactivación masiva en desarrollo', 'info');
    }

    async bulkExport() {
        // Implementation for bulk export
        this.showNotification('Función de exportación masiva en desarrollo', 'info');
    }

    async bulkDelete() {
        // Implementation for bulk delete
        this.showNotification('Función de eliminación masiva en desarrollo', 'info');
    }

    /**
     * Sort table
     */
    sortTable(column) {
        if (this.sortBy === column) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = column;
            this.sortOrder = 'asc';
        }

        this.applyFilters();
        this.renderConsentTable();
    }

    /**
     * Get sort icon
     */
    getSortIcon(column) {
        if (this.sortBy !== column) return '';
        return this.sortOrder === 'asc' ? '▲' : '▼';
    }

    /**
     * Go to page
     */
    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.renderConsentTable();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search filter
        const searchInput = document.getElementById('consent-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderConsentTable();
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('consent-category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderConsentTable();
            });
        }

        // Role filter
        const roleFilter = document.getElementById('consent-role-filter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filters.role = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderConsentTable();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('consent-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderConsentTable();
            });
        }

        // Required filter
        const requiredFilter = document.getElementById('consent-required-filter');
        if (requiredFilter) {
            requiredFilter.addEventListener('change', (e) => {
                this.filters.required = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderConsentTable();
            });
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Get auth token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') ||
               localStorage.getItem('adminToken') ||
               sessionStorage.getItem('authToken') ||
               '';
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10002;
            font-weight: 500;
            max-width: 400px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize global instance
const consentMgmt = new ConsentManagement();

// Make it available globally
window.consentMgmt = consentMgmt;

console.log('✅ [CONSENT-MGMT] Module loaded successfully');
