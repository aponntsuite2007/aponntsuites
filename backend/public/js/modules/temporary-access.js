/**
 * ============================================================================
 * MÓDULO FRONTEND: Temporary Access (Accesos Temporales)
 * ============================================================================
 * Sistema profesional de gestión de accesos temporales digitales para:
 * - Auditores externos
 * - Asesores y consultores
 * - Médicos no asociados
 * - Contratistas IT
 * - Personal temporal
 *
 * Diferenciado de "visitors" (acceso físico a kioscos)
 * ============================================================================
 */

const TemporaryAccessModule = {
    currentView: 'dashboard', // dashboard, list, create, detail
    grants: [],
    stats: {},
    templates: [],
    selectedGrant: null,
    filters: {
        status: 'all',
        accessType: 'all',
        search: ''
    },
    pagination: {
        limit: 50,
        offset: 0
    },

    // Configuración de tipos de acceso
    ACCESS_TYPES: {
        external_auditor: {
            label: 'Auditor Externo',
            icon: '📊',
            color: '#3498db'
        },
        external_advisor: {
            label: 'Asesor/Consultor',
            icon: '💼',
            color: '#9b59b6'
        },
        external_doctor: {
            label: 'Médico Externo',
            icon: '⚕️',
            color: '#e74c3c'
        },
        consultant: {
            label: 'Consultor',
            icon: '📈',
            color: '#f39c12'
        },
        contractor: {
            label: 'Contratista IT',
            icon: '⚙️',
            color: '#34495e'
        },
        temp_staff: {
            label: 'Personal Temporal',
            icon: '👤',
            color: '#16a085'
        }
    },

    STATUS_CONFIG: {
        pending: { label: 'Pendiente', color: '#f39c12', icon: '⏳' },
        active: { label: 'Activo', color: '#27ae60', icon: '✅' },
        expired: { label: 'Expirado', color: '#95a5a6', icon: '⏰' },
        revoked: { label: 'Revocado', color: '#e74c3c', icon: '🚫' },
        suspended: { label: 'Suspendido', color: '#e67e22', icon: '⏸️' }
    },

    /**
     * Inicialización del módulo
     */
    async init() {
        console.log('🔐 [TEMP-ACCESS] Inicializando módulo...');

        try {
            // Inyectar estilos
            this.injectStyles();

            // Cargar templates disponibles
            await this.loadTemplates();

            // Cargar estadísticas
            await this.loadStats();

            // Renderizar dashboard inicial
            this.renderDashboard();

            console.log('   ✅ Módulo inicializado correctamente');

        } catch (error) {
            console.error('   ❌ Error al inicializar:', error);
            this.renderError(error.message);
        }
    },

    /**
     * ========================================================================
     * CARGA DE DATOS
     * ========================================================================
     */

    async loadStats() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/temporary-access/company/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando estadísticas');

            const data = await response.json();
            this.stats = data.stats || {};

        } catch (error) {
            console.error('❌ [TEMP-ACCESS] Error cargando stats:', error);
            this.stats = {};
        }
    },

    async loadTemplates() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/temporary-access/templates', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando templates');

            const data = await response.json();
            this.templates = data.templates || [];

        } catch (error) {
            console.error('❌ [TEMP-ACCESS] Error cargando templates:', error);
            this.templates = [];
        }
    },

    async loadGrants() {
        try {
            const token = localStorage.getItem('authToken');

            const params = new URLSearchParams({
                status: this.filters.status !== 'all' ? this.filters.status : '',
                accessType: this.filters.accessType !== 'all' ? this.filters.accessType : '',
                search: this.filters.search,
                limit: this.pagination.limit,
                offset: this.pagination.offset
            });

            const response = await fetch(`/api/temporary-access/list?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando accesos');

            const data = await response.json();
            this.grants = data.grants || [];

        } catch (error) {
            console.error('❌ [TEMP-ACCESS] Error cargando grants:', error);
            this.grants = [];
        }
    },

    async loadGrantDetail(grantId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/temporary-access/${grantId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando detalles');

            const data = await response.json();
            this.selectedGrant = data.grant;

        } catch (error) {
            console.error('❌ [TEMP-ACCESS] Error cargando detalle:', error);
            throw error;
        }
    },

    /**
     * ========================================================================
     * RENDERS
     * ========================================================================
     */

    renderDashboard() {
        const mainContent = document.getElementById('mainContent');

        mainContent.innerHTML = `
            <div class="temp-access-container">
                <!-- Header -->
                <div class="temp-access-header">
                    <div>
                        <h2>
                            <i class="fas fa-user-shield"></i>
                            Accesos Temporales
                        </h2>
                        <p class="subtitle">Sistema de accesos digitales para auditores, asesores y colaboradores externos</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn-primary" onclick="TemporaryAccessModule.showCreateModal()">
                            <i class="fas fa-plus"></i>
                            Crear Acceso Temporal
                        </button>
                        <button class="btn-secondary" onclick="TemporaryAccessModule.switchView('list')">
                            <i class="fas fa-list"></i>
                            Ver Lista Completa
                        </button>
                    </div>
                </div>

                <!-- Dashboard Stats -->
                <div class="stats-grid">
                    ${this.renderStatsCards()}
                </div>

                <!-- Templates Section -->
                <div class="templates-section">
                    <h3>
                        <i class="fas fa-layer-group"></i>
                        Templates Predefinidos
                    </h3>
                    <div class="templates-grid">
                        ${this.renderTemplatesCards()}
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="recent-activity-section">
                    <h3>
                        <i class="fas fa-history"></i>
                        Actividad Reciente
                    </h3>
                    <div id="recentActivity">
                        <p class="loading">Cargando actividad...</p>
                    </div>
                </div>
            </div>
        `;

        // Cargar actividad reciente
        this.loadRecentActivity();
    },

    renderStatsCards() {
        const stats = this.stats || {};

        return `
            <div class="stat-card stat-active">
                <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.active_count || 0}</div>
                    <div class="stat-label">Accesos Activos</div>
                </div>
            </div>

            <div class="stat-card stat-pending">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.pending_count || 0}</div>
                    <div class="stat-label">Pendientes Aprobación</div>
                </div>
            </div>

            <div class="stat-card stat-expiring">
                <div class="stat-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.expiring_soon_count || 0}</div>
                    <div class="stat-label">Expiran Pronto (&lt;7 días)</div>
                </div>
            </div>

            <div class="stat-card stat-total">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.used_count || 0}</div>
                    <div class="stat-label">Total Utilizados</div>
                </div>
            </div>

            <div class="stat-card stat-expired">
                <div class="stat-icon">
                    <i class="fas fa-ban"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.expired_count || 0}</div>
                    <div class="stat-label">Expirados</div>
                </div>
            </div>

            <div class="stat-card stat-revoked">
                <div class="stat-icon">
                    <i class="fas fa-user-slash"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-number">${stats.revoked_count || 0}</div>
                    <div class="stat-label">Revocados</div>
                </div>
            </div>
        `;
    },

    renderTemplatesCards() {
        if (!this.templates || this.templates.length === 0) {
            return `<p class="no-templates">No hay templates disponibles</p>`;
        }

        return this.templates.map(template => `
            <div class="template-card" onclick="TemporaryAccessModule.selectTemplate('${template.template_key}')">
                <div class="template-icon" style="background: ${template.color}20; color: ${template.color}">
                    ${template.icon}
                </div>
                <div class="template-content">
                    <h4>${template.name}</h4>
                    <p>${template.description}</p>
                    <div class="template-meta">
                        <span class="badge">${template.default_duration_days} días</span>
                        <span class="badge">${template.permission_level}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    async loadRecentActivity() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/temporary-access/company/activity?limit=10', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando actividad');

            const data = await response.json();
            const logs = data.logs || [];

            const container = document.getElementById('recentActivity');

            if (logs.length === 0) {
                container.innerHTML = '<p class="no-activity">No hay actividad reciente</p>';
                return;
            }

            container.innerHTML = `
                <div class="activity-list">
                    ${logs.map(log => this.renderActivityItem(log)).join('')}
                </div>
            `;

        } catch (error) {
            console.error('❌ Error cargando actividad:', error);
            document.getElementById('recentActivity').innerHTML = '<p class="error">Error cargando actividad</p>';
        }
    },

    renderActivityItem(log) {
        const activityIcons = {
            login_success: '🔓',
            login_failed: '❌',
            access_created: '✨',
            access_activated: '✅',
            access_revoked: '🚫',
            access_suspended: '⏸️',
            access_extended: '📅',
            password_changed: '🔑',
            module_accessed: '📂'
        };

        const icon = activityIcons[log.activity_type] || '📌';
        const date = new Date(log.created_at).toLocaleString('es-AR');

        return `
            <div class="activity-item">
                <span class="activity-icon">${icon}</span>
                <div class="activity-content">
                    <strong>${log.full_name}</strong>
                    <span class="activity-type">${log.activity_type.replace(/_/g, ' ')}</span>
                    ${log.module_accessed ? `<span class="module-badge">${log.module_accessed}</span>` : ''}
                </div>
                <span class="activity-date">${date}</span>
            </div>
        `;
    },

    /**
     * ========================================================================
     * VISTA LISTA
     * ========================================================================
     */

    async switchView(view) {
        this.currentView = view;

        if (view === 'dashboard') {
            await this.loadStats();
            this.renderDashboard();
        } else if (view === 'list') {
            await this.loadGrants();
            this.renderList();
        } else if (view === 'detail' && this.selectedGrant) {
            this.renderDetail();
        }
    },

    renderList() {
        const mainContent = document.getElementById('mainContent');

        mainContent.innerHTML = `
            <div class="temp-access-container">
                <!-- Header -->
                <div class="temp-access-header">
                    <div>
                        <h2>
                            <i class="fas fa-list"></i>
                            Lista de Accesos Temporales
                        </h2>
                    </div>
                    <div class="header-actions">
                        <button class="btn-secondary" onclick="TemporaryAccessModule.switchView('dashboard')">
                            <i class="fas fa-arrow-left"></i>
                            Volver al Dashboard
                        </button>
                        <button class="btn-primary" onclick="TemporaryAccessModule.showCreateModal()">
                            <i class="fas fa-plus"></i>
                            Crear Acceso
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="filters-bar">
                    ${this.renderFilters()}
                </div>

                <!-- Table -->
                <div class="table-container">
                    ${this.renderTable()}
                </div>
            </div>
        `;
    },

    renderFilters() {
        return `
            <div class="filter-group">
                <label>Estado</label>
                <select id="filterStatus" onchange="TemporaryAccessModule.applyFilters()">
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="pending">Pendientes</option>
                    <option value="expired">Expirados</option>
                    <option value="revoked">Revocados</option>
                    <option value="suspended">Suspendidos</option>
                </select>
            </div>

            <div class="filter-group">
                <label>Tipo de Acceso</label>
                <select id="filterAccessType" onchange="TemporaryAccessModule.applyFilters()">
                    <option value="all">Todos</option>
                    ${Object.entries(this.ACCESS_TYPES).map(([key, config]) => `
                        <option value="${key}">${config.icon} ${config.label}</option>
                    `).join('')}
                </select>
            </div>

            <div class="filter-group flex-grow">
                <label>Buscar</label>
                <input
                    type="text"
                    id="filterSearch"
                    placeholder="Buscar por nombre, email o username..."
                    onkeyup="TemporaryAccessModule.debounceSearch()"
                />
            </div>

            <div class="filter-actions">
                <button class="btn-secondary" onclick="TemporaryAccessModule.clearFilters()">
                    <i class="fas fa-times"></i>
                    Limpiar Filtros
                </button>
            </div>
        `;
    },

    renderTable() {
        if (!this.grants || this.grants.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-inbox fa-3x"></i>
                    <h3>No hay accesos temporales</h3>
                    <p>Crea el primer acceso temporal usando el botón "Crear Acceso"</p>
                </div>
            `;
        }

        return `
            <table class="grants-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Tipo de Acceso</th>
                        <th>Username</th>
                        <th>Estado</th>
                        <th>Vigencia</th>
                        <th>Último Login</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.grants.map(grant => this.renderTableRow(grant)).join('')}
                </tbody>
            </table>
        `;
    },

    renderTableRow(grant) {
        const typeConfig = this.ACCESS_TYPES[grant.access_type] || {};
        const statusConfig = this.STATUS_CONFIG[grant.status] || {};
        const daysRemaining = grant.days_remaining !== null ? Math.floor(grant.days_remaining) : 0;

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <strong>${grant.full_name}</strong>
                        <small>${grant.email}</small>
                        ${grant.organization ? `<small class="org">${grant.organization}</small>` : ''}
                    </div>
                </td>
                <td>
                    <span class="badge" style="background: ${typeConfig.color}20; color: ${typeConfig.color}">
                        ${typeConfig.icon} ${typeConfig.label}
                    </span>
                </td>
                <td><code>${grant.username}</code></td>
                <td>
                    <span class="status-badge status-${grant.status}">
                        ${statusConfig.icon} ${statusConfig.label}
                    </span>
                </td>
                <td>
                    <div class="validity-cell">
                        <small>${new Date(grant.valid_from).toLocaleDateString('es-AR')}</small>
                        <strong>→</strong>
                        <small>${new Date(grant.valid_until).toLocaleDateString('es-AR')}</small>
                        ${grant.status === 'active' && daysRemaining <= 7 ? `
                            <span class="badge badge-warning">⚠️ ${daysRemaining} días</span>
                        ` : ''}
                    </div>
                </td>
                <td>${grant.last_login_at ? new Date(grant.last_login_at).toLocaleString('es-AR') : 'Nunca'}</td>
                <td>
                    <div class="action-buttons">
                        <button
                            class="btn-icon"
                            title="Ver Detalles"
                            onclick="TemporaryAccessModule.viewGrantDetail('${grant.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${this.renderActionButtons(grant)}
                    </div>
                </td>
            </tr>
        `;
    },

    renderActionButtons(grant) {
        let buttons = '';

        if (grant.status === 'pending') {
            buttons += `
                <button
                    class="btn-icon btn-success"
                    title="Activar Acceso"
                    onclick="TemporaryAccessModule.activateGrant('${grant.id}')">
                    <i class="fas fa-check"></i>
                </button>
            `;
        }

        if (grant.status === 'active') {
            buttons += `
                <button
                    class="btn-icon btn-info"
                    title="Extender Vigencia"
                    onclick="TemporaryAccessModule.extendGrant('${grant.id}')">
                    <i class="fas fa-calendar-plus"></i>
                </button>
                <button
                    class="btn-icon btn-warning"
                    title="Suspender"
                    onclick="TemporaryAccessModule.suspendGrant('${grant.id}')">
                    <i class="fas fa-pause"></i>
                </button>
            `;
        }

        if (grant.status === 'suspended') {
            buttons += `
                <button
                    class="btn-icon btn-success"
                    title="Reactivar"
                    onclick="TemporaryAccessModule.reactivateGrant('${grant.id}')">
                    <i class="fas fa-play"></i>
                </button>
            `;
        }

        if (['active', 'pending', 'suspended'].includes(grant.status)) {
            buttons += `
                <button
                    class="btn-icon btn-danger"
                    title="Revocar Acceso"
                    onclick="TemporaryAccessModule.revokeGrant('${grant.id}')">
                    <i class="fas fa-ban"></i>
                </button>
            `;
        }

        if (grant.status === 'pending') {
            buttons += `
                <button
                    class="btn-icon btn-danger"
                    title="Eliminar"
                    onclick="TemporaryAccessModule.deleteGrant('${grant.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }

        return buttons;
    },

    /**
     * ========================================================================
     * FILTROS Y BÚSQUEDA
     * ========================================================================
     */

    async applyFilters() {
        this.filters.status = document.getElementById('filterStatus').value;
        this.filters.accessType = document.getElementById('filterAccessType').value;
        this.filters.search = document.getElementById('filterSearch')?.value || '';

        await this.loadGrants();
        this.renderTable();

        // Reemplazar solo la tabla
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.innerHTML = this.renderTable();
        }
    },

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.applyFilters(), 500);
    },

    clearFilters() {
        this.filters = { status: 'all', accessType: 'all', search: '' };
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('filterAccessType').value = 'all';
        if (document.getElementById('filterSearch')) {
            document.getElementById('filterSearch').value = '';
        }
        this.applyFilters();
    },

    /**
     * ========================================================================
     * MODALES
     * ========================================================================
     */

    showCreateModal() {
        const modalHTML = `
            <div class="modal-overlay" id="createAccessModal" onclick="TemporaryAccessModule.closeModal(event)">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3><i class="fas fa-user-plus"></i> Crear Acceso Temporal</h3>
                        <button class="btn-close" onclick="TemporaryAccessModule.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="createAccessForm" onsubmit="TemporaryAccessModule.submitCreateForm(event)">
                            <!-- Template Selector -->
                            <div class="form-section">
                                <h4>1. Seleccionar Template (Opcional)</h4>
                                <div class="template-selector">
                                    ${this.templates.map(t => `
                                        <label class="template-option">
                                            <input type="radio" name="template" value="${t.template_key}">
                                            <div class="template-card-small">
                                                <span style="color: ${t.color}">${t.icon}</span>
                                                <strong>${t.name}</strong>
                                                <small>${t.default_duration_days} días</small>
                                            </div>
                                        </label>
                                    `).join('')}
                                    <label class="template-option">
                                        <input type="radio" name="template" value="" checked>
                                        <div class="template-card-small">
                                            <span>⚙️</span>
                                            <strong>Personalizado</strong>
                                            <small>Configurar manualmente</small>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- Datos Personales -->
                            <div class="form-section">
                                <h4>2. Datos del Usuario</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Nombre Completo *</label>
                                        <input type="text" name="fullName" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Email *</label>
                                        <input type="email" name="email" required>
                                    </div>
                                    <div class="form-group">
                                        <label>DNI</label>
                                        <input type="text" name="dni">
                                    </div>
                                    <div class="form-group">
                                        <label>Teléfono</label>
                                        <input type="tel" name="phone">
                                    </div>
                                    <div class="form-group full-width">
                                        <label>Organización</label>
                                        <input type="text" name="organization" placeholder="Empresa u organización del usuario">
                                    </div>
                                </div>
                            </div>

                            <!-- Configuración de Acceso -->
                            <div class="form-section">
                                <h4>3. Configuración de Acceso</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Tipo de Acceso *</label>
                                        <select name="accessType" required>
                                            ${Object.entries(this.ACCESS_TYPES).map(([key, config]) => `
                                                <option value="${key}">${config.icon} ${config.label}</option>
                                            `).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Nivel de Permisos *</label>
                                        <select name="permissionLevel" required>
                                            <option value="read_only">Solo Lectura</option>
                                            <option value="read_write">Lectura y Escritura</option>
                                            <option value="custom">Personalizado</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Duración (días) *</label>
                                        <input type="number" name="durationDays" value="30" min="1" max="365" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Fecha Inicio</label>
                                        <input type="date" name="validFrom" value="${new Date().toISOString().split('T')[0]}">
                                    </div>
                                </div>
                            </div>

                            <!-- Módulos Permitidos -->
                            <div class="form-section">
                                <h4>4. Módulos Permitidos</h4>
                                <div class="modules-selector" id="modulesSelector">
                                    <p class="loading">Cargando módulos disponibles...</p>
                                </div>
                            </div>

                            <!-- Seguridad -->
                            <div class="form-section">
                                <h4>5. Seguridad</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="requirePasswordChange" checked>
                                            Requiere cambio de contraseña en primer login
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="twoFactorEnabled">
                                            Autenticación de dos factores (2FA)
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label>Máx. Sesiones Concurrentes</label>
                                        <input type="number" name="maxConcurrentSessions" value="1" min="1" max="5">
                                    </div>
                                </div>
                            </div>

                            <!-- Notas -->
                            <div class="form-section">
                                <h4>6. Notas y Propósito</h4>
                                <div class="form-group full-width">
                                    <label>Propósito del Acceso</label>
                                    <textarea name="purpose" rows="2" placeholder="Ej: Auditoría externa del sistema de RRHH"></textarea>
                                </div>
                                <div class="form-group full-width">
                                    <label>Notas Internas (no visibles para el usuario)</label>
                                    <textarea name="internalNotes" rows="2"></textarea>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="modal-actions">
                                <button type="button" class="btn-secondary" onclick="TemporaryAccessModule.closeModal()">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-check"></i>
                                    Crear Acceso Temporal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.loadAvailableModules();
    },

    async loadAvailableModules() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/modules', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando módulos');

            const data = await response.json();
            const modules = data.modules || [];

            const container = document.getElementById('modulesSelector');
            container.innerHTML = `
                <div class="modules-grid">
                    ${modules.map(mod => `
                        <label class="module-checkbox">
                            <input type="checkbox" name="modules" value="${mod.module_key}">
                            <span>${mod.icon || '📦'} ${mod.name}</span>
                        </label>
                    `).join('')}
                </div>
            `;

        } catch (error) {
            console.error('Error cargando módulos:', error);
            document.getElementById('modulesSelector').innerHTML = '<p class="error">Error cargando módulos</p>';
        }
    },

    async submitCreateForm(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        // Recopilar módulos seleccionados
        const selectedModules = Array.from(form.querySelectorAll('input[name="modules"]:checked'))
            .map(cb => cb.value);

        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            dni: formData.get('dni') || null,
            phone: formData.get('phone') || null,
            organization: formData.get('organization') || null,
            accessType: formData.get('accessType'),
            templateKey: formData.get('template') || null,
            allowedModules: selectedModules,
            permissionLevel: formData.get('permissionLevel'),
            durationDays: parseInt(formData.get('durationDays')),
            validFrom: formData.get('validFrom') || null,
            purpose: formData.get('purpose') || null,
            internalNotes: formData.get('internalNotes') || null,
            requirePasswordChange: formData.get('requirePasswordChange') === 'on',
            twoFactorEnabled: formData.get('twoFactorEnabled') === 'on',
            maxConcurrentSessions: parseInt(formData.get('maxConcurrentSessions'))
        };

        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/temporary-access/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al crear acceso');
            }

            // Mostrar contraseña temporal
            this.showPasswordModal(result.grant, result.tempPassword);

            this.closeModal();
            await this.loadStats();
            this.switchView('dashboard');

        } catch (error) {
            console.error('❌ Error creando acceso:', error);
            alert('Error: ' + error.message);

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Crear Acceso Temporal';
        }
    },

    showPasswordModal(grant, tempPassword) {
        const modalHTML = `
            <div class="modal-overlay" id="passwordModal" onclick="TemporaryAccessModule.closeModal(event)">
                <div class="modal-container modal-sm" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3><i class="fas fa-key"></i> Acceso Creado Exitosamente</h3>
                    </div>
                    <div class="modal-body">
                        <div class="success-message">
                            <i class="fas fa-check-circle fa-3x"></i>
                            <h4>Credenciales Generadas</h4>
                        </div>

                        <div class="credentials-box">
                            <div class="credential-item">
                                <label>Username:</label>
                                <code id="usernameText">${grant.username}</code>
                                <button class="btn-copy" onclick="TemporaryAccessModule.copyToClipboard('usernameText')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                            <div class="credential-item">
                                <label>Password Temporal:</label>
                                <code id="passwordText">${tempPassword}</code>
                                <button class="btn-copy" onclick="TemporaryAccessModule.copyToClipboard('passwordText')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>

                        <div class="warning-box">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p><strong>IMPORTANTE:</strong> Esta es la única vez que podrá ver esta contraseña. Asegúrese de copiarla y enviarla al usuario de forma segura.</p>
                        </div>

                        <div class="modal-actions">
                            <button class="btn-primary full-width" onclick="TemporaryAccessModule.closeModal()">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        const text = element.textContent;

        navigator.clipboard.writeText(text).then(() => {
            // Mostrar feedback visual
            const btn = element.nextElementSibling;
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('copied');

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        });
    },

    closeModal(event) {
        if (event && event.target.classList.contains('modal-overlay')) {
            event.target.remove();
        } else if (!event) {
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
        }
    },

    /**
     * ========================================================================
     * ACCIONES
     * ========================================================================
     */

    async activateGrant(grantId) {
        if (!confirm('¿Activar este acceso temporal?')) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/temporary-access/${grantId}/activate`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al activar');

            alert('Acceso activado correctamente');
            await this.loadGrants();
            await this.loadStats();
            this.renderList();

        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    },

    async revokeGrant(grantId) {
        const reason = prompt('Motivo de la revocación:');
        if (!reason) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/temporary-access/${grantId}/revoke`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) throw new Error('Error al revocar');

            alert('Acceso revocado correctamente');
            await this.loadGrants();
            await this.loadStats();
            this.renderList();

        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    },

    async suspendGrant(grantId) {
        const reason = prompt('Motivo de la suspensión:');
        if (!reason) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/temporary-access/${grantId}/suspend`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) throw new Error('Error al suspender');

            alert('Acceso suspendido correctamente');
            await this.loadGrants();
            await this.loadStats();
            this.renderList();

        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    },

    async reactivateGrant(grantId) {
        if (!confirm('¿Reactivar este acceso?')) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/temporary-access/${grantId}/reactivate`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al reactivar');

            alert('Acceso reactivado correctamente');
            await this.loadGrants();
            await this.loadStats();
            this.renderList();

        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    },

    async extendGrant(grantId) {
        const days = prompt('¿Cuántos días desea extender el acceso?', '30');
        if (!days || isNaN(days)) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/temporary-access/${grantId}/extend`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ additionalDays: parseInt(days) })
            });

            if (!response.ok) throw new Error('Error al extender');

            const result = await response.json();
            alert(`Vigencia extendida hasta: ${new Date(result.newValidUntil).toLocaleDateString('es-AR')}`);

            await this.loadGrants();
            this.renderList();

        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    },

    async deleteGrant(grantId) {
        if (!confirm('¿Eliminar este acceso? Esta acción no se puede deshacer.')) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/temporary-access/${grantId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al eliminar');

            alert('Acceso eliminado correctamente');
            await this.loadGrants();
            await this.loadStats();
            this.renderList();

        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        }
    },

    async viewGrantDetail(grantId) {
        try {
            await this.loadGrantDetail(grantId);
            this.switchView('detail');
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar detalles: ' + error.message);
        }
    },

    selectTemplate(templateKey) {
        // Pre-llenar form con datos del template (si hay modal abierto)
        const templateInput = document.querySelector(`input[name="template"][value="${templateKey}"]`);
        if (templateInput) {
            templateInput.checked = true;

            const template = this.templates.find(t => t.template_key === templateKey);
            if (template) {
                const form = document.getElementById('createAccessForm');
                if (form) {
                    form.querySelector('[name="accessType"]').value = template.access_type;
                    form.querySelector('[name="permissionLevel"]').value = template.permission_level;
                    form.querySelector('[name="durationDays"]').value = template.default_duration_days;
                    form.querySelector('[name="requirePasswordChange"]').checked = template.require_password_change;
                    form.querySelector('[name="twoFactorEnabled"]').checked = template.two_factor_enabled;
                }
            }
        } else {
            // Si no hay modal, abrir modal con template pre-seleccionado
            this.showCreateModal();
            setTimeout(() => this.selectTemplate(templateKey), 100);
        }
    },

    renderDetail() {
        const grant = this.selectedGrant;
        if (!grant) return;

        const typeConfig = this.ACCESS_TYPES[grant.access_type] || {};
        const statusConfig = this.STATUS_CONFIG[grant.status] || {};

        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="temp-access-container">
                <div class="detail-header">
                    <button class="btn-back" onclick="TemporaryAccessModule.switchView('list')">
                        <i class="fas fa-arrow-left"></i> Volver a la Lista
                    </button>
                    <h2>${grant.full_name}</h2>
                    <span class="status-badge status-${grant.status}">
                        ${statusConfig.icon} ${statusConfig.label}
                    </span>
                </div>

                <div class="detail-grid">
                    <div class="detail-section">
                        <h3>Información del Usuario</h3>
                        <dl>
                            <dt>Nombre Completo:</dt>
                            <dd>${grant.full_name}</dd>

                            <dt>Email:</dt>
                            <dd>${grant.email}</dd>

                            <dt>DNI:</dt>
                            <dd>${grant.dni || 'No especificado'}</dd>

                            <dt>Teléfono:</dt>
                            <dd>${grant.phone || 'No especificado'}</dd>

                            <dt>Organización:</dt>
                            <dd>${grant.organization || 'No especificada'}</dd>
                        </dl>
                    </div>

                    <div class="detail-section">
                        <h3>Configuración de Acceso</h3>
                        <dl>
                            <dt>Tipo de Acceso:</dt>
                            <dd>
                                <span style="color: ${typeConfig.color}">
                                    ${typeConfig.icon} ${typeConfig.label}
                                </span>
                            </dd>

                            <dt>Username:</dt>
                            <dd><code>${grant.username}</code></dd>

                            <dt>Nivel de Permisos:</dt>
                            <dd>${grant.permission_level}</dd>

                            <dt>Módulos Permitidos:</dt>
                            <dd>
                                <div class="modules-list">
                                    ${grant.allowed_modules?.map(m => `<span class="badge">${m}</span>`).join('') || 'Ninguno'}
                                </div>
                            </dd>
                        </dl>
                    </div>

                    <div class="detail-section">
                        <h3>Vigencia y Estado</h3>
                        <dl>
                            <dt>Fecha Inicio:</dt>
                            <dd>${new Date(grant.valid_from).toLocaleString('es-AR')}</dd>

                            <dt>Fecha Fin:</dt>
                            <dd>${new Date(grant.valid_until).toLocaleString('es-AR')}</dd>

                            <dt>Días Restantes:</dt>
                            <dd>${grant.days_remaining !== null ? Math.floor(grant.days_remaining) : 'N/A'}</dd>

                            <dt>Contraseña Cambiada:</dt>
                            <dd>${grant.password_changed ? '✅ Sí' : '❌ No'}</dd>
                        </dl>
                    </div>

                    <div class="detail-section">
                        <h3>Actividad</h3>
                        <dl>
                            <dt>Primer Login:</dt>
                            <dd>${grant.first_login_at ? new Date(grant.first_login_at).toLocaleString('es-AR') : 'Nunca'}</dd>

                            <dt>Último Login:</dt>
                            <dd>${grant.last_login_at ? new Date(grant.last_login_at).toLocaleString('es-AR') : 'Nunca'}</dd>

                            <dt>Total de Logins:</dt>
                            <dd>${grant.total_logins || 0}</dd>
                        </dl>
                    </div>

                    ${grant.purpose || grant.internal_notes ? `
                        <div class="detail-section full-width">
                            <h3>Notas</h3>
                            ${grant.purpose ? `
                                <div class="note-box">
                                    <strong>Propósito:</strong>
                                    <p>${grant.purpose}</p>
                                </div>
                            ` : ''}
                            ${grant.internal_notes ? `
                                <div class="note-box internal">
                                    <strong>Notas Internas:</strong>
                                    <p>${grant.internal_notes}</p>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="detail-actions">
                    ${this.renderDetailActions(grant)}
                </div>

                <div class="activity-timeline">
                    <h3>Registro de Actividad</h3>
                    <div id="grantActivity">
                        <p class="loading">Cargando actividad...</p>
                    </div>
                </div>
            </div>
        `;

        this.loadGrantActivity(grant.id);
    },

    renderDetailActions(grant) {
        let html = '';

        if (grant.status === 'pending') {
            html += `
                <button class="btn-success" onclick="TemporaryAccessModule.activateGrant('${grant.id}')">
                    <i class="fas fa-check"></i> Activar Acceso
                </button>
            `;
        }

        if (grant.status === 'active') {
            html += `
                <button class="btn-info" onclick="TemporaryAccessModule.extendGrant('${grant.id}')">
                    <i class="fas fa-calendar-plus"></i> Extender Vigencia
                </button>
                <button class="btn-warning" onclick="TemporaryAccessModule.suspendGrant('${grant.id}')">
                    <i class="fas fa-pause"></i> Suspender
                </button>
            `;
        }

        if (grant.status === 'suspended') {
            html += `
                <button class="btn-success" onclick="TemporaryAccessModule.reactivateGrant('${grant.id}')">
                    <i class="fas fa-play"></i> Reactivar
                </button>
            `;
        }

        if (['active', 'pending', 'suspended'].includes(grant.status)) {
            html += `
                <button class="btn-danger" onclick="TemporaryAccessModule.revokeGrant('${grant.id}')">
                    <i class="fas fa-ban"></i> Revocar Acceso
                </button>
            `;
        }

        return html;
    },

    async loadGrantActivity(grantId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/temporary-access/${grantId}/activity`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando actividad');

            const data = await response.json();
            const logs = data.logs || [];

            const container = document.getElementById('grantActivity');

            if (logs.length === 0) {
                container.innerHTML = '<p class="no-activity">No hay actividad registrada</p>';
                return;
            }

            container.innerHTML = `
                <div class="timeline">
                    ${logs.map(log => `
                        <div class="timeline-item">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <strong>${log.activity_type.replace(/_/g, ' ')}</strong>
                                ${log.module_accessed ? `<span class="badge">${log.module_accessed}</span>` : ''}
                                ${log.ip_address ? `<small>IP: ${log.ip_address}</small>` : ''}
                                <small class="timeline-date">${new Date(log.created_at).toLocaleString('es-AR')}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

        } catch (error) {
            console.error('Error:', error);
            document.getElementById('grantActivity').innerHTML = '<p class="error">Error cargando actividad</p>';
        }
    },

    renderError(message) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn-primary" onclick="TemporaryAccessModule.init()">
                    Reintentar
                </button>
            </div>
        `;
    },

    /**
     * ========================================================================
     * ESTILOS
     * ========================================================================
     */

    injectStyles() {
        if (document.getElementById('tempAccessStyles')) return;

        const styles = `
            <style id="tempAccessStyles">
                /* ===== DARK THEME PROFESIONAL ===== */

                /* Container */
                .temp-access-container {
                    padding: 25px;
                    max-width: 1400px;
                    margin: 0 auto;
                    background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);
                    min-height: calc(100vh - 100px);
                    border-radius: 20px;
                }

                /* Header con Glassmorphism */
                .temp-access-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 35px;
                    padding: 25px;
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                }

                .temp-access-header h2 {
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    font-size: 28px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    letter-spacing: -0.5px;
                }

                .subtitle {
                    color: rgba(255, 255, 255, 0.5);
                    margin: 8px 0 0 0;
                    font-size: 14px;
                    font-weight: 400;
                }

                .header-actions {
                    display: flex;
                    gap: 12px;
                }

                /* Stats Grid con Glow Effects */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 20px;
                    margin-bottom: 40px;
                }

                .stat-card {
                    position: relative;
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }

                .stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    opacity: 0;
                    transition: opacity 0.4s;
                }

                .stat-card:hover {
                    transform: translateY(-4px) scale(1.02);
                    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .stat-card:hover::before {
                    opacity: 1;
                }

                .stat-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 26px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
                    transition: transform 0.3s;
                }

                .stat-card:hover .stat-icon {
                    transform: scale(1.1) rotate(5deg);
                }

                .stat-active .stat-icon {
                    background: linear-gradient(135deg, rgba(39, 174, 96, 0.25), rgba(39, 174, 96, 0.15));
                    color: #2ecc71;
                    box-shadow: 0 4px 20px rgba(39, 174, 96, 0.4);
                }
                .stat-pending .stat-icon {
                    background: linear-gradient(135deg, rgba(243, 156, 18, 0.25), rgba(243, 156, 18, 0.15));
                    color: #f39c12;
                    box-shadow: 0 4px 20px rgba(243, 156, 18, 0.4);
                }
                .stat-expiring .stat-icon {
                    background: linear-gradient(135deg, rgba(231, 76, 60, 0.25), rgba(231, 76, 60, 0.15));
                    color: #e74c3c;
                    box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
                }
                .stat-total .stat-icon {
                    background: linear-gradient(135deg, rgba(52, 152, 219, 0.25), rgba(52, 152, 219, 0.15));
                    color: #3498db;
                    box-shadow: 0 4px 20px rgba(52, 152, 219, 0.4);
                }
                .stat-expired .stat-icon {
                    background: linear-gradient(135deg, rgba(149, 165, 166, 0.25), rgba(149, 165, 166, 0.15));
                    color: #95a5a6;
                    box-shadow: 0 4px 20px rgba(149, 165, 166, 0.3);
                }
                .stat-revoked .stat-icon {
                    background: linear-gradient(135deg, rgba(192, 57, 43, 0.25), rgba(192, 57, 43, 0.15));
                    color: #c0392b;
                    box-shadow: 0 4px 20px rgba(192, 57, 43, 0.4);
                }

                .stat-number {
                    font-size: 2.2rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #ffffff, #e0e0e0);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    line-height: 1;
                }

                .stat-label {
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.55);
                    font-weight: 500;
                    letter-spacing: 0.3px;
                }

                /* Templates Section con Glassmorphism */
                .templates-section, .recent-activity-section {
                    margin-bottom: 45px;
                }

                .templates-section h3, .recent-activity-section h3 {
                    color: #fff;
                    margin-bottom: 24px;
                    font-size: 20px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    letter-spacing: -0.3px;
                }

                .templates-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 18px;
                }

                .template-card {
                    position: relative;
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    padding: 22px;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    gap: 18px;
                    overflow: hidden;
                }

                .template-card::before {
                    content: '';
                    position: absolute;
                    top: -2px;
                    left: -2px;
                    right: -2px;
                    bottom: -2px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    opacity: 0;
                    z-index: -1;
                    border-radius: 14px;
                    transition: opacity 0.4s;
                }

                .template-card:hover {
                    background: rgba(255, 255, 255, 0.06);
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
                }

                .template-card:hover::before {
                    opacity: 0.15;
                }

                .template-icon {
                    width: 54px;
                    height: 54px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 26px;
                    flex-shrink: 0;
                    background: rgba(255, 255, 255, 0.05);
                    transition: transform 0.3s;
                }

                .template-card:hover .template-icon {
                    transform: scale(1.1) rotate(-5deg);
                }

                .template-content h4 {
                    margin: 0 0 6px 0;
                    color: #fff;
                    font-size: 16px;
                    font-weight: 600;
                }

                .template-content p {
                    margin: 0 0 12px 0;
                    color: rgba(255, 255, 255, 0.55);
                    font-size: 13px;
                    line-height: 1.5;
                }

                .template-meta {
                    display: flex;
                    gap: 10px;
                }

                /* Activity List con Dark Theme */
                .activity-list {
                    background: rgba(255, 255, 255, 0.02);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 14px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }

                .activity-item {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    padding: 18px 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                    transition: background 0.3s;
                }

                .activity-item:last-child {
                    border-bottom: none;
                }

                .activity-item:hover {
                    background: rgba(255, 255, 255, 0.03);
                }

                .activity-icon {
                    font-size: 26px;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
                }

                .activity-content {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .activity-type {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 14px;
                    font-weight: 500;
                }

                .activity-date {
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 12px;
                    font-weight: 400;
                }

                /* Filters Bar con Glassmorphism */
                .filters-bar {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                    padding: 24px;
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(15px);
                    -webkit-backdrop-filter: blur(15px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    flex-wrap: wrap;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
                }

                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    min-width: 220px;
                }

                .filter-group.flex-grow {
                    flex: 1;
                }

                .filter-group label {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.65);
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }

                .filter-group select,
                .filter-group input {
                    padding: 12px 14px;
                    background: rgba(0, 0, 0, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: #fff;
                    font-size: 14px;
                    transition: all 0.3s;
                }

                .filter-group select:focus,
                .filter-group input:focus {
                    outline: none;
                    border-color: rgba(102, 126, 234, 0.6);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
                    background: rgba(0, 0, 0, 0.35);
                }

                .filter-group select option {
                    background: #1a1a2e;
                    color: #fff;
                }

                /* Table Dark Theme */
                .table-container {
                    background: rgba(255, 255, 255, 0.02);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 14px;
                    overflow: hidden;
                    box-shadow: 0 6px 30px rgba(0, 0, 0, 0.4);
                }

                .grants-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .grants-table th {
                    background: rgba(255, 255, 255, 0.04);
                    color: rgba(255, 255, 255, 0.75);
                    font-weight: 700;
                    padding: 18px 16px;
                    text-align: left;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    border-bottom: 2px solid rgba(102, 126, 234, 0.2);
                }

                .grants-table tbody tr {
                    transition: background 0.3s;
                }

                .grants-table tbody tr:hover {
                    background: rgba(255, 255, 255, 0.03);
                }

                .grants-table td {
                    padding: 18px 16px;
                    border-top: 1px solid rgba(255, 255, 255, 0.04);
                    color: #fff;
                }

                .user-cell {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .user-cell strong {
                    color: #fff;
                    font-weight: 600;
                }

                .user-cell small {
                    color: rgba(255, 255, 255, 0.55);
                    font-size: 12px;
                }

                .user-cell small.org {
                    color: rgba(255, 255, 255, 0.45);
                    font-style: italic;
                }

                .validity-cell {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                }

                .action-buttons {
                    display: flex;
                    gap: 6px;
                }

                /* Badges con Glow */
                .badge {
                    display: inline-block;
                    padding: 5px 12px;
                    border-radius: 14px;
                    font-size: 11px;
                    font-weight: 700;
                    background: rgba(255, 255, 255, 0.08);
                    color: #fff;
                    letter-spacing: 0.3px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }

                .badge-warning {
                    background: linear-gradient(135deg, rgba(243, 156, 18, 0.25), rgba(243, 156, 18, 0.15));
                    color: #f39c12;
                    box-shadow: 0 2px 12px rgba(243, 156, 18, 0.3);
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 14px;
                    border-radius: 16px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
                }

                .status-pending {
                    background: linear-gradient(135deg, rgba(243, 156, 18, 0.25), rgba(243, 156, 18, 0.15));
                    color: #f39c12;
                    box-shadow: 0 2px 12px rgba(243, 156, 18, 0.3);
                }
                .status-active {
                    background: linear-gradient(135deg, rgba(39, 174, 96, 0.25), rgba(39, 174, 96, 0.15));
                    color: #2ecc71;
                    box-shadow: 0 2px 12px rgba(39, 174, 96, 0.3);
                }
                .status-expired {
                    background: linear-gradient(135deg, rgba(149, 165, 166, 0.25), rgba(149, 165, 166, 0.15));
                    color: #95a5a6;
                    box-shadow: 0 2px 12px rgba(149, 165, 166, 0.2);
                }
                .status-revoked {
                    background: linear-gradient(135deg, rgba(231, 76, 60, 0.25), rgba(231, 76, 60, 0.15));
                    color: #e74c3c;
                    box-shadow: 0 2px 12px rgba(231, 76, 60, 0.3);
                }
                .status-suspended {
                    background: linear-gradient(135deg, rgba(230, 126, 34, 0.25), rgba(230, 126, 34, 0.15));
                    color: #e67e22;
                    box-shadow: 0 2px 12px rgba(230, 126, 34, 0.3);
                }

                /* Buttons con Gradientes y Glow */
                .btn-primary, .btn-secondary, .btn-success, .btn-danger,
                .btn-warning, .btn-info, .btn-icon {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    letter-spacing: 0.3px;
                    position: relative;
                    overflow: hidden;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                }

                .btn-primary::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transition: left 0.5s;
                }

                .btn-primary:hover::before {
                    left: 100%;
                }

                .btn-secondary {
                    background: rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #fff;
                }

                .btn-success {
                    background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                    color: #fff;
                    box-shadow: 0 4px 20px rgba(46, 204, 113, 0.4);
                }

                .btn-danger {
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: #fff;
                    box-shadow: 0 4px 20px rgba(231, 76, 60, 0.4);
                }

                .btn-warning {
                    background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
                    color: #fff;
                    box-shadow: 0 4px 20px rgba(243, 156, 18, 0.4);
                }

                .btn-info {
                    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                    color: #fff;
                    box-shadow: 0 4px 20px rgba(52, 152, 219, 0.4);
                }

                .btn-icon {
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    color: #fff;
                    min-width: 38px;
                    justify-content: center;
                }

                .btn-icon.btn-success {
                    background: linear-gradient(135deg, rgba(39, 174, 96, 0.25), rgba(39, 174, 96, 0.15));
                    color: #2ecc71;
                    box-shadow: 0 2px 12px rgba(39, 174, 96, 0.3);
                }
                .btn-icon.btn-danger {
                    background: linear-gradient(135deg, rgba(231, 76, 60, 0.25), rgba(231, 76, 60, 0.15));
                    color: #e74c3c;
                    box-shadow: 0 2px 12px rgba(231, 76, 60, 0.3);
                }
                .btn-icon.btn-warning {
                    background: linear-gradient(135deg, rgba(243, 156, 18, 0.25), rgba(243, 156, 18, 0.15));
                    color: #f39c12;
                    box-shadow: 0 2px 12px rgba(243, 156, 18, 0.3);
                }
                .btn-icon.btn-info {
                    background: linear-gradient(135deg, rgba(52, 152, 219, 0.25), rgba(52, 152, 219, 0.15));
                    color: #3498db;
                    box-shadow: 0 2px 12px rgba(52, 152, 219, 0.3);
                }

                .btn-primary:hover, .btn-success:hover, .btn-danger:hover, .btn-warning:hover, .btn-info:hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
                }

                .btn-secondary:hover, .btn-icon:hover {
                    transform: translateY(-2px);
                    background: rgba(255, 255, 255, 0.12);
                    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
                }

                .btn-primary:active, .btn-secondary:active, .btn-success:active,
                .btn-danger:active, .btn-warning:active, .btn-info:active, .btn-icon:active {
                    transform: translateY(0);
                }

                /* Modales con Glassmorphism Profundo */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.92);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 20px;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modal-container {
                    background: rgba(26, 26, 46, 0.95);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    max-width: 900px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6),
                                0 0 0 1px rgba(102, 126, 234, 0.1);
                    animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .modal-container.modal-sm {
                    max-width: 500px;
                }

                .modal-header {
                    padding: 28px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 20px 20px 0 0;
                }

                .modal-header h3 {
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 22px;
                    font-weight: 700;
                }

                .btn-close {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    color: #fff;
                    font-size: 24px;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-close:hover {
                    opacity: 1;
                    background: rgba(231, 76, 60, 0.2);
                    border-color: rgba(231, 76, 60, 0.4);
                    transform: rotate(90deg);
                }

                .modal-body {
                    padding: 28px;
                }

                .modal-actions {
                    padding-top: 24px;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }

                .modal-actions .full-width {
                    width: 100%;
                    justify-content: center;
                }

                /* Form con Glassmorphism */
                .form-section {
                    margin-bottom: 32px;
                    padding-bottom: 24px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    position: relative;
                }

                .form-section::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    width: 60px;
                    height: 2px;
                    background: linear-gradient(90deg, #667eea, transparent);
                }

                .form-section:last-child {
                    border-bottom: none;
                }

                .form-section h4 {
                    color: #fff;
                    margin: 0 0 18px 0;
                    font-size: 17px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .form-section h4::before {
                    content: '';
                    width: 4px;
                    height: 20px;
                    background: linear-gradient(180deg, #667eea, #764ba2);
                    border-radius: 2px;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 18px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .form-group.full-width {
                    grid-column: 1 / -1;
                }

                .form-group label {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.8);
                    font-weight: 600;
                    letter-spacing: 0.3px;
                }

                .form-group input,
                .form-group select,
                .form-group textarea {
                    padding: 12px 16px;
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    color: #fff;
                    font-size: 14px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .form-group input:focus,
                .form-group select:focus,
                .form-group textarea:focus {
                    outline: none;
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(102, 126, 234, 0.5);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1),
                                0 4px 20px rgba(102, 126, 234, 0.15);
                }

                .form-group input::placeholder,
                .form-group textarea::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }

                .form-group textarea {
                    resize: vertical;
                    font-family: inherit;
                    min-height: 100px;
                }

                .checkbox-label {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center;
                    gap: 12px !important;
                    cursor: pointer;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                    transition: all 0.3s ease;
                }

                .checkbox-label:hover {
                    background: rgba(255, 255, 255, 0.04);
                }

                .checkbox-label input[type="checkbox"] {
                    width: auto;
                    cursor: pointer;
                    accent-color: #667eea;
                }

                /* Template Selector con Efectos de Glow */
                .template-selector {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 14px;
                }

                .template-option {
                    cursor: pointer;
                    position: relative;
                }

                .template-option input[type="radio"] {
                    display: none;
                }

                .template-card-small {
                    padding: 18px;
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(10px);
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    text-align: center;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    position: relative;
                    overflow: hidden;
                }

                .template-card-small::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.5), transparent);
                    opacity: 0;
                    transition: opacity 0.3s;
                }

                .template-card-small:hover {
                    transform: translateY(-4px);
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(102, 126, 234, 0.3);
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
                }

                .template-card-small:hover::before {
                    opacity: 1;
                }

                .template-option input[type="radio"]:checked + .template-card-small {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.15));
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2),
                                0 8px 30px rgba(102, 126, 234, 0.3);
                }

                .template-card-small span {
                    font-size: 32px;
                    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
                }

                .template-card-small strong {
                    color: #fff;
                    font-size: 14px;
                    font-weight: 600;
                }

                .template-card-small small {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 11px;
                }

                /* Modules Selector con Glassmorphism */
                .modules-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 12px;
                }

                .module-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px;
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .module-checkbox:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(102, 126, 234, 0.3);
                    transform: translateX(4px);
                }

                .module-checkbox input[type="checkbox"] {
                    width: auto;
                    cursor: pointer;
                    accent-color: #667eea;
                }

                .module-checkbox input[type="checkbox"]:checked {
                    box-shadow: 0 0 8px rgba(102, 126, 234, 0.5);
                }

                /* Success Message con Glow Animation */
                .success-message {
                    text-align: center;
                    padding: 30px;
                    background: linear-gradient(135deg, rgba(39, 174, 96, 0.15), rgba(46, 204, 113, 0.08));
                    border: 1px solid rgba(39, 174, 96, 0.3);
                    border-radius: 16px;
                    color: #2ecc71;
                }

                .success-message i {
                    color: #2ecc71;
                    margin-bottom: 15px;
                    font-size: 48px;
                    filter: drop-shadow(0 4px 20px rgba(46, 204, 113, 0.4));
                    animation: successPulse 2s ease-in-out infinite;
                }

                @keyframes successPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                }

                .success-message h4 {
                    color: #fff;
                    margin: 10px 0 0 0;
                    font-size: 20px;
                    font-weight: 600;
                }

                /* Credentials Box con Glassmorphism */
                .credentials-box {
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(15px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    padding: 24px;
                    margin: 24px 0;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }

                .credential-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 18px;
                }

                .credential-item:last-child {
                    margin-bottom: 0;
                }

                .credential-item label {
                    color: rgba(255, 255, 255, 0.8);
                    font-weight: 600;
                    min-width: 150px;
                    font-size: 14px;
                }

                .credential-item code {
                    flex: 1;
                    padding: 12px 18px;
                    background: linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.3));
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    color: #f39c12;
                    font-size: 16px;
                    font-weight: 700;
                    font-family: 'Courier New', monospace;
                    letter-spacing: 0.5px;
                    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
                }

                .btn-copy {
                    padding: 10px 16px;
                    background: rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-copy:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                }

                .btn-copy.copied {
                    background: linear-gradient(135deg, rgba(39, 174, 96, 0.3), rgba(46, 204, 113, 0.2));
                    border-color: rgba(39, 174, 96, 0.5);
                    color: #2ecc71;
                    box-shadow: 0 4px 20px rgba(39, 174, 96, 0.4);
                }

                /* Warning Box con Glow */
                .warning-box {
                    background: linear-gradient(135deg, rgba(243, 156, 18, 0.15), rgba(243, 156, 18, 0.08));
                    border-left: 4px solid #f39c12;
                    border-radius: 12px;
                    padding: 18px 20px;
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                    box-shadow: 0 4px 20px rgba(243, 156, 18, 0.15);
                }

                .warning-box i {
                    color: #f39c12;
                    font-size: 24px;
                    filter: drop-shadow(0 2px 8px rgba(243, 156, 18, 0.4));
                }

                .warning-box p {
                    margin: 0;
                    color: rgba(255, 255, 255, 0.95);
                    font-size: 14px;
                    line-height: 1.6;
                }

                /* Detail View con Glassmorphism */
                .detail-header {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                    margin-bottom: 35px;
                    padding: 20px;
                    padding-bottom: 24px;
                    border-bottom: 2px solid rgba(255, 255, 255, 0.08);
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 12px 12px 0 0;
                }

                .btn-back {
                    padding: 12px 18px;
                    background: rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-back:hover {
                    background: rgba(255, 255, 255, 0.12);
                    transform: translateX(-4px);
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
                }

                .detail-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 24px;
                    margin-bottom: 35px;
                }

                .detail-section {
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    padding: 24px;
                    transition: all 0.3s ease;
                }

                .detail-section:hover {
                    background: rgba(255, 255, 255, 0.06);
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
                }

                .detail-section.full-width {
                    grid-column: 1 / -1;
                }

                .detail-section h3 {
                    color: #fff;
                    margin: 0 0 18px 0;
                    font-size: 17px;
                    font-weight: 600;
                    padding-bottom: 12px;
                    border-bottom: 2px solid rgba(102, 126, 234, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .detail-section dl {
                    margin: 0;
                }

                .detail-section dt {
                    color: rgba(255, 255, 255, 0.65);
                    font-size: 13px;
                    margin-bottom: 6px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .detail-section dd {
                    color: #fff;
                    margin: 0 0 18px 0;
                    font-size: 15px;
                }

                .detail-section dd:last-child {
                    margin-bottom: 0;
                }

                .modules-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .note-box {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border-left: 4px solid #667eea;
                    padding: 18px 20px;
                    border-radius: 10px;
                    margin-bottom: 16px;
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
                }

                .note-box:last-child {
                    margin-bottom: 0;
                }

                .note-box.internal {
                    border-left-color: #f39c12;
                    box-shadow: 0 4px 20px rgba(243, 156, 18, 0.1);
                }

                .note-box strong {
                    color: #fff;
                    display: block;
                    margin-bottom: 8px;
                    font-size: 15px;
                }

                .note-box p {
                    margin: 0;
                    color: rgba(255, 255, 255, 0.85);
                    line-height: 1.6;
                }

                .detail-actions {
                    display: flex;
                    gap: 12px;
                    padding: 24px;
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    margin-bottom: 35px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }

                /* Timeline con Efectos Modernos */
                .activity-timeline h3 {
                    color: #fff;
                    margin-bottom: 25px;
                    font-size: 18px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .timeline {
                    position: relative;
                    padding-left: 35px;
                }

                .timeline::before {
                    content: '';
                    position: absolute;
                    left: 9px;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background: linear-gradient(180deg,
                                rgba(102, 126, 234, 0.4) 0%,
                                rgba(118, 75, 162, 0.2) 50%,
                                rgba(102, 126, 234, 0.1) 100%);
                    border-radius: 2px;
                }

                .timeline-item {
                    position: relative;
                    padding-bottom: 35px;
                }

                .timeline-item:last-child {
                    padding-bottom: 0;
                }

                .timeline-marker {
                    position: absolute;
                    left: -30px;
                    top: 6px;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border: 4px solid #1a1a2e;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2),
                                0 4px 15px rgba(102, 126, 234, 0.4);
                    animation: timelinePulse 2s ease-in-out infinite;
                }

                @keyframes timelinePulse {
                    0%, 100% { box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2), 0 4px 15px rgba(102, 126, 234, 0.4); }
                    50% { box-shadow: 0 0 0 6px rgba(102, 126, 234, 0.1), 0 4px 20px rgba(102, 126, 234, 0.6); }
                }

                .timeline-content {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    padding: 18px 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    transition: all 0.3s ease;
                }

                .timeline-content:hover {
                    background: rgba(255, 255, 255, 0.07);
                    transform: translateX(6px);
                    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
                }

                .timeline-content strong {
                    color: #fff;
                    display: block;
                    margin-bottom: 6px;
                    text-transform: capitalize;
                    font-size: 15px;
                    font-weight: 600;
                }

                .timeline-content small {
                    color: rgba(255, 255, 255, 0.65);
                    font-size: 13px;
                    line-height: 1.5;
                }

                .timeline-date {
                    display: block;
                    margin-top: 8px;
                    color: rgba(255, 255, 255, 0.5) !important;
                    font-size: 12px;
                    font-style: italic;
                }

                /* Empty States con Estilo Moderno */
                .empty-state, .error-container {
                    text-align: center;
                    padding: 80px 30px;
                    color: rgba(255, 255, 255, 0.6);
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 16px;
                    border: 1px dashed rgba(255, 255, 255, 0.1);
                }

                .empty-state i, .error-container i {
                    color: rgba(255, 255, 255, 0.25);
                    margin-bottom: 25px;
                    font-size: 64px;
                    opacity: 0.5;
                    filter: drop-shadow(0 4px 15px rgba(0, 0, 0, 0.3));
                }

                .empty-state h3, .error-container h3 {
                    color: #fff;
                    margin-bottom: 12px;
                    font-size: 20px;
                    font-weight: 600;
                }

                .empty-state p, .error-container p {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 14px;
                    max-width: 400px;
                    margin: 0 auto;
                    line-height: 1.6;
                }

                .loading, .no-templates, .no-activity, .error {
                    text-align: center;
                    padding: 60px 30px;
                    color: rgba(255, 255, 255, 0.5);
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 14px;
                }

                .loading::before {
                    content: '';
                    display: inline-block;
                    width: 40px;
                    height: 40px;
                    margin-bottom: 20px;
                    border: 4px solid rgba(255, 255, 255, 0.1);
                    border-top-color: #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Responsive */
                @media (max-width: 1024px) {
                    .detail-grid {
                        grid-template-columns: 1fr;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .temp-access-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .header-actions {
                        width: 100%;
                    }

                    .header-actions button {
                        flex: 1;
                    }

                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .templates-grid {
                        grid-template-columns: 1fr;
                    }

                    .filters-bar {
                        flex-direction: column;
                    }

                    .filter-group {
                        width: 100%;
                    }

                    .table-container {
                        overflow-x: auto;
                    }

                    .grants-table {
                        min-width: 1000px;
                    }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }
};

// Exponer funciones globales para window
window.showTemporaryAccessContent = async function() {
    await TemporaryAccessModule.init();
};

// Auto-inicializar si se carga directamente
if (document.getElementById('mainContent')) {
    window.showTemporaryAccessContent();
}
