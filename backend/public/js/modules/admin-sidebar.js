/**
 * admin-sidebar.js
 * Componente de Sidebar Colapsable para Panel Administrativo APONNT
 *
 * Características:
 * - Toggle collapse/expand (70px ↔ 280px)
 * - Menú dinámico basado en rol (usa RolePermissions)
 * - Grupos colapsables de menú
 * - Tooltips cuando está colapsado
 * - Footer con info de usuario y logout
 * - Persistencia de estado en localStorage
 *
 * @requires RolePermissions (role-permissions.js)
 */

const AdminSidebar = {
    // Estado interno
    _isCollapsed: false,
    _currentStaff: null,
    _activeSection: null,
    _expandedGroups: new Set(),
    _onNavigate: null,

    // Selectores DOM
    _sidebar: null,
    _mainContent: null,

    /**
     * Inicializa el sidebar
     * @param {Object} options - Opciones de configuración
     * @param {Object} options.staff - Datos del staff logueado
     * @param {Function} options.onNavigate - Callback cuando se navega a una sección
     * @param {string} options.activeSection - Sección activa inicial
     */
    init(options = {}) {
        const { staff, onNavigate, activeSection } = options;

        if (!staff) {
            console.error('[AdminSidebar] Error: staff es requerido');
            return;
        }

        this._currentStaff = staff;
        this._onNavigate = onNavigate;
        this._activeSection = activeSection || RolePermissions.getDefaultSection(staff);

        // Restaurar estado colapsado desde localStorage
        const savedState = localStorage.getItem('admin_sidebar_collapsed');
        this._isCollapsed = savedState === 'true';

        // Restaurar grupos expandidos
        const savedGroups = localStorage.getItem('admin_sidebar_groups');
        if (savedGroups) {
            try {
                this._expandedGroups = new Set(JSON.parse(savedGroups));
            } catch (e) {
                this._expandedGroups = new Set();
            }
        }

        // Renderizar sidebar
        this.render();

        // Aplicar estado inicial
        this._applyCollapsedState();

        console.log('[AdminSidebar] Inicializado para:', staff.full_name, '| Rol:', RolePermissions.getRoleType(staff));
    },

    /**
     * Renderiza el sidebar completo
     */
    render() {
        const container = document.getElementById('admin-sidebar');
        if (!container) {
            console.error('[AdminSidebar] No se encontró #admin-sidebar');
            return;
        }

        this._sidebar = container;
        this._mainContent = document.getElementById('admin-main');

        const menuConfig = RolePermissions.getMenuForStaff(this._currentStaff);
        const menuGroups = menuConfig.groups || [];
        const roleType = RolePermissions.getRoleType(this._currentStaff);

        container.innerHTML = `
            <!-- Header del Sidebar -->
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <img src="/img/aponnt-logo-white.png" alt="APONNT" class="logo-full" onerror="this.style.display='none'">
                    <span class="logo-text">APONNT</span>
                    <span class="logo-mini">A</span>
                </div>
                <button class="sidebar-toggle" id="sidebar-toggle" title="Colapsar/Expandir menú">
                    <i class="fas fa-chevron-left toggle-icon"></i>
                </button>
            </div>

            <!-- Navegación Principal -->
            <nav class="sidebar-nav">
                ${this._renderMenuGroups(menuGroups)}
            </nav>

            <!-- Footer del Sidebar -->
            <div class="sidebar-footer">
                <div class="user-info">
                    <div class="user-avatar">
                        ${this._getInitials(this._currentStaff.full_name)}
                    </div>
                    <div class="user-details">
                        <span class="user-name">${this._truncateName(this._currentStaff.full_name)}</span>
                        <span class="user-role">${this._getRoleLabel(roleType)}</span>
                    </div>
                </div>
                <button class="logout-btn" id="sidebar-logout" title="Cerrar sesión">
                    <i class="fas fa-sign-out-alt"></i>
                    <span class="logout-text">Salir</span>
                </button>
            </div>
        `;

        // Agregar event listeners
        this._bindEvents();
    },

    /**
     * Renderiza los grupos de menú
     */
    _renderMenuGroups(menuGroups) {
        if (!menuGroups || menuGroups.length === 0) {
            return '<div class="menu-empty">No hay secciones disponibles</div>';
        }

        return menuGroups.map((group, index) => {
            // Adaptar al formato de RolePermissions: { title, sections }
            const groupId = group.id || `group-${index}`;
            const groupTitle = group.title || group.label || 'Grupo';
            const items = group.sections || group.items || [];
            const validItems = items.filter(Boolean);

            // Si el grupo tiene UN SOLO item, renderizarlo directamente como menú (sin submenú)
            if (validItems.length === 1) {
                const item = validItems[0];
                const isActive = item.id === this._activeSection;
                const icon = item.icon || '📄';
                return `
                    <a href="#"
                       class="menu-item menu-item-single ${isActive ? 'active' : ''}"
                       data-section="${item.id}"
                       data-tooltip="${item.label}">
                        <span class="menu-item-icon">${icon}</span>
                        <span class="menu-item-label">${item.label}</span>
                    </a>
                `;
            }

            const isExpanded = this._expandedGroups.has(groupId);
            const hasActiveItem = validItems.some(item => item.id === this._activeSection);

            // Obtener icono del primer item o usar uno por defecto (puede ser emoji o clase FA)
            const firstItemIcon = validItems[0] && validItems[0].icon;
            const groupIcon = group.icon || firstItemIcon || '📁';

            return `
                <div class="menu-group ${isExpanded || hasActiveItem ? 'expanded' : ''}" data-group="${groupId}">
                    <div class="menu-group-header" data-group-toggle="${groupId}">
                        <span class="menu-group-icon">${groupIcon}</span>
                        <span class="menu-group-label">${groupTitle}</span>
                        <i class="fas fa-chevron-down menu-group-arrow"></i>
                    </div>
                    <div class="menu-group-items">
                        ${validItems.map(item => this._renderMenuItem(item)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Renderiza un item individual del menú
     */
    _renderMenuItem(item) {
        const isActive = item.id === this._activeSection;
        const badgeHtml = item.badge ? `<span class="menu-item-badge">${item.badge}</span>` : '';

        // El icono puede ser emoji (📊) o clase FA (fas fa-chart-bar)
        const icon = item.icon || '📄';
        const isFontAwesome = icon.startsWith('fa');
        const iconHtml = isFontAwesome
            ? `<i class="${icon} menu-item-icon"></i>`
            : `<span class="menu-item-icon">${icon}</span>`;

        return `
            <a href="#"
               class="menu-item ${isActive ? 'active' : ''}"
               data-section="${item.id}"
               data-tooltip="${item.label}">
                ${iconHtml}
                <span class="menu-item-label">${item.label}</span>
                ${badgeHtml}
            </a>
        `;
    },

    /**
     * Vincula los event listeners
     */
    _bindEvents() {
        // Toggle sidebar
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Click en items de menú
        this._sidebar.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = item.dataset.section;
                this.navigateTo(sectionId);
            });
        });

        // Toggle grupos
        this._sidebar.querySelectorAll('.menu-group-header').forEach(header => {
            header.addEventListener('click', () => {
                const groupId = header.dataset.groupToggle;
                this._toggleGroup(groupId);
            });
        });

        // Logout
        const logoutBtn = document.getElementById('sidebar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this._handleLogout());
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Ctrl + B para toggle sidebar
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.toggle();
            }
        });
    },

    /**
     * Navega a una sección
     */
    navigateTo(sectionId) {
        if (!RolePermissions.canAccessSection(this._currentStaff, sectionId)) {
            console.warn('[AdminSidebar] Acceso denegado a sección:', sectionId);
            return;
        }

        // Actualizar estado activo
        this._activeSection = sectionId;

        // Actualizar UI
        this._sidebar.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        // Expandir grupo del item activo
        const activeItem = this._sidebar.querySelector(`.menu-item[data-section="${sectionId}"]`);
        if (activeItem) {
            const group = activeItem.closest('.menu-group');
            if (group) {
                group.classList.add('expanded');
                this._expandedGroups.add(group.dataset.group);
                this._saveGroupsState();
            }
        }

        // Callback de navegación
        if (this._onNavigate) {
            this._onNavigate(sectionId);
        }
    },

    /**
     * Toggle de grupo de menú
     */
    _toggleGroup(groupId) {
        const group = this._sidebar.querySelector(`.menu-group[data-group="${groupId}"]`);
        if (!group) return;

        const isExpanded = group.classList.toggle('expanded');

        if (isExpanded) {
            this._expandedGroups.add(groupId);
        } else {
            this._expandedGroups.delete(groupId);
        }

        this._saveGroupsState();
    },

    /**
     * Toggle del sidebar (collapse/expand)
     */
    toggle() {
        this._isCollapsed = !this._isCollapsed;
        this._applyCollapsedState();
        localStorage.setItem('admin_sidebar_collapsed', this._isCollapsed);
    },

    /**
     * Aplica el estado colapsado/expandido
     */
    _applyCollapsedState() {
        if (this._sidebar) {
            this._sidebar.classList.toggle('collapsed', this._isCollapsed);
        }
        if (this._mainContent) {
            this._mainContent.classList.toggle('sidebar-collapsed', this._isCollapsed);
        }

        // Rotar icono del toggle
        const toggleIcon = this._sidebar?.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.style.transform = this._isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    },

    /**
     * Guarda estado de grupos en localStorage
     */
    _saveGroupsState() {
        localStorage.setItem('admin_sidebar_groups', JSON.stringify([...this._expandedGroups]));
    },

    /**
     * Maneja el logout
     */
    _handleLogout() {
        // Limpiar tokens
        localStorage.removeItem('aponnt_token_staff');
        sessionStorage.removeItem('aponnt_token_staff');

        // Limpiar estado del sidebar
        localStorage.removeItem('admin_sidebar_collapsed');
        localStorage.removeItem('admin_sidebar_groups');

        // Redirigir a login
        window.location.href = '/panel-administrativo.html';
    },

    /**
     * Obtiene las iniciales del nombre
     */
    _getInitials(fullName) {
        if (!fullName) return '??';
        const parts = fullName.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return fullName.substring(0, 2).toUpperCase();
    },

    /**
     * Trunca el nombre si es muy largo
     */
    _truncateName(name, maxLength = 18) {
        if (!name) return '';
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 3) + '...';
    },

    /**
     * Obtiene la etiqueta del rol
     */
    _getRoleLabel(roleType) {
        const labels = {
            'GERENCIA': 'Gerencia General',
            'VENDEDOR': 'Vendedor',
            'LIDER_VENTAS': 'Líder de Ventas',
            'SOPORTE': 'Soporte',
            'ADMINISTRACION': 'Administración',
            'INGENIERIA': 'Ingeniería'
        };
        return labels[roleType] || roleType;
    },

    /**
     * Actualiza el badge de un item de menú
     */
    updateBadge(sectionId, count) {
        const menuItem = this._sidebar?.querySelector(`.menu-item[data-section="${sectionId}"]`);
        if (!menuItem) return;

        let badge = menuItem.querySelector('.menu-item-badge');

        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'menu-item-badge';
                menuItem.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
        } else if (badge) {
            badge.remove();
        }
    },

    /**
     * Expande el sidebar programáticamente
     */
    expand() {
        if (this._isCollapsed) {
            this.toggle();
        }
    },

    /**
     * Colapsa el sidebar programáticamente
     */
    collapse() {
        if (!this._isCollapsed) {
            this.toggle();
        }
    },

    /**
     * Obtiene la sección activa actual
     */
    getActiveSection() {
        return this._activeSection;
    },

    /**
     * Obtiene el staff actual
     */
    getCurrentStaff() {
        return this._currentStaff;
    },

    /**
     * Refresca el menú (útil si cambian permisos dinámicamente)
     */
    refresh() {
        if (this._currentStaff) {
            this.render();
            this._applyCollapsedState();
        }
    },

    /**
     * Destruye el componente y limpia listeners
     */
    destroy() {
        if (this._sidebar) {
            this._sidebar.innerHTML = '';
        }
        this._currentStaff = null;
        this._onNavigate = null;
        this._activeSection = null;
        this._expandedGroups.clear();
    }
};

// Exportar para uso global
window.AdminSidebar = AdminSidebar;

// CSS adicional inyectado (tooltips y animaciones especiales)
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    /* Tooltip cuando sidebar está colapsado */
    .sidebar.collapsed .menu-item {
        position: relative;
    }

    .sidebar.collapsed .menu-item::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        background: var(--dark-bg-card, #1a1a2e);
        color: var(--text-primary, #e6edf3);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        z-index: 1000;
        margin-left: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    }

    .sidebar.collapsed .menu-item::before {
        content: '';
        position: absolute;
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border: 6px solid transparent;
        border-right-color: var(--dark-bg-card, #1a1a2e);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        margin-left: -2px;
    }

    .sidebar.collapsed .menu-item:hover::after,
    .sidebar.collapsed .menu-item:hover::before {
        opacity: 1;
        visibility: visible;
    }

    /* Animación de entrada del sidebar */
    @keyframes sidebarSlideIn {
        from {
            transform: translateX(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .sidebar {
        animation: sidebarSlideIn 0.3s ease-out;
    }

    /* Efecto ripple en items */
    .menu-item {
        position: relative;
        overflow: hidden;
    }

    .menu-item::after {
        pointer-events: none;
    }

    /* Indicador de sección activa */
    .menu-item.active::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 70%;
        background: var(--accent-primary, #f59e0b);
        border-radius: 0 4px 4px 0;
    }

    /* Badge con animación */
    @keyframes badgePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }

    .menu-item-badge {
        animation: badgePulse 2s ease-in-out infinite;
    }

    /* Hover en grupo header */
    .menu-group-header:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    /* Transición suave de grupos */
    .menu-group-items {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
    }

    .menu-group.expanded .menu-group-items {
        max-height: 500px;
    }

    /* Rotación de flecha */
    .menu-group-arrow {
        transition: transform 0.3s ease;
    }

    .menu-group.expanded .menu-group-arrow {
        transform: rotate(180deg);
    }
`;

document.head.appendChild(additionalStyles);
