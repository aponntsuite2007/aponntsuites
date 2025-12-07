/**
 * ROLES & PERMISSIONS MANAGEMENT v1.0
 * Gestión de roles y matriz de permisos SSOT
 *
 * Dark Theme Enterprise con integración Estructura Organizacional
 *
 * @version 1.0
 * @date 2025-12-06
 */

window.RolesPermissionsModule = (function() {
    'use strict';

    // Estado del módulo
    const state = {
        roles: [],
        modules: [],
        users: [],
        permissionsMatrix: null,
        selectedRole: null,
        isLoading: false
    };

    // Configuración
    const config = {
        apiBase: '/api/v1/access-control',
        usersApi: '/api/v1/users'
    };

    // Colores para acciones
    const actionColors = {
        read: { bg: 'rgba(52, 152, 219, 0.3)', border: '#3498db', icon: 'fa-eye' },
        create: { bg: 'rgba(46, 204, 113, 0.3)', border: '#2ecc71', icon: 'fa-plus' },
        update: { bg: 'rgba(241, 196, 15, 0.3)', border: '#f1c40f', icon: 'fa-edit' },
        delete: { bg: 'rgba(231, 76, 60, 0.3)', border: '#e74c3c', icon: 'fa-trash' }
    };

    // Iconos de roles
    const roleIcons = {
        'super_admin': 'fa-crown',
        'admin': 'fa-user-shield',
        'manager': 'fa-user-tie',
        'supervisor': 'fa-user-check',
        'rrhh': 'fa-users-cog',
        'employee': 'fa-user',
        'associate_medical': 'fa-stethoscope',
        'associate_legal': 'fa-balance-scale',
        'associate_safety': 'fa-hard-hat'
    };

    /**
     * Inicializar módulo
     */
    async function init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[ROLES] Container not found:', containerId);
            return;
        }

        container.innerHTML = renderMainView();
        attachEventListeners(container);
        await loadData();
    }

    /**
     * Renderizar vista principal
     */
    function renderMainView() {
        return `
            <div class="roles-permissions-container" style="
                background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
                min-height: 100%;
                padding: 20px;
                color: #e0e0e0;
            ">
                <!-- Header -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                ">
                    <div>
                        <h2 style="margin: 0; color: #fff; font-size: 1.5rem;">
                            <i class="fas fa-shield-alt" style="color: #3498db; margin-right: 10px;"></i>
                            Gestión de Roles y Permisos
                        </h2>
                        <p style="margin: 5px 0 0; color: #888; font-size: 0.85rem;">
                            Sistema SSOT integrado con Estructura Organizacional
                        </p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="RolesPermissionsModule.showCreateRoleModal()" style="
                            background: linear-gradient(135deg, #3498db, #2980b9);
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 500;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-plus"></i> Nuevo Rol
                        </button>
                    </div>
                </div>

                <!-- Tabs -->
                <div style="
                    display: flex;
                    gap: 5px;
                    margin-bottom: 20px;
                    background: rgba(255,255,255,0.03);
                    padding: 5px;
                    border-radius: 10px;
                ">
                    <button class="rp-tab active" data-tab="roles" style="
                        flex: 1;
                        padding: 12px;
                        background: rgba(52, 152, 219, 0.2);
                        border: 1px solid rgba(52, 152, 219, 0.3);
                        color: #3498db;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        <i class="fas fa-user-tag"></i> Roles del Sistema
                    </button>
                    <button class="rp-tab" data-tab="matrix" style="
                        flex: 1;
                        padding: 12px;
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.1);
                        color: #888;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        <i class="fas fa-th"></i> Matriz de Permisos
                    </button>
                    <button class="rp-tab" data-tab="assignments" style="
                        flex: 1;
                        padding: 12px;
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.1);
                        color: #888;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        <i class="fas fa-user-plus"></i> Asignaciones
                    </button>
                </div>

                <!-- Content -->
                <div id="rp-content" style="
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    padding: 20px;
                    min-height: 400px;
                ">
                    <div class="loading-spinner" style="text-align: center; padding: 50px;">
                        <i class="fas fa-spinner fa-spin fa-2x" style="color: #3498db;"></i>
                        <p style="margin-top: 15px; color: #888;">Cargando...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar tab de Roles
     */
    function renderRolesTab() {
        if (state.roles.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-user-tag fa-3x" style="opacity: 0.3;"></i>
                    <p style="margin-top: 15px;">No hay roles configurados</p>
                </div>
            `;
        }

        const systemRoles = state.roles.filter(r => r.is_system_role);
        const customRoles = state.roles.filter(r => !r.is_system_role);

        return `
            <!-- Roles del Sistema -->
            <div style="margin-bottom: 30px;">
                <h4 style="color: #3498db; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-cog"></i> Roles del Sistema
                    <span style="
                        font-size: 0.7rem;
                        background: rgba(52,152,219,0.2);
                        padding: 3px 8px;
                        border-radius: 10px;
                    ">${systemRoles.length}</span>
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">
                    ${systemRoles.map(role => renderRoleCard(role, true)).join('')}
                </div>
            </div>

            <!-- Roles Personalizados -->
            <div>
                <h4 style="color: #9b59b6; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-palette"></i> Roles Personalizados
                    <span style="
                        font-size: 0.7rem;
                        background: rgba(155,89,182,0.2);
                        padding: 3px 8px;
                        border-radius: 10px;
                    ">${customRoles.length}</span>
                </h4>
                ${customRoles.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;">
                        ${customRoles.map(role => renderRoleCard(role, false)).join('')}
                    </div>
                ` : `
                    <div style="
                        text-align: center;
                        padding: 30px;
                        background: rgba(155,89,182,0.05);
                        border: 1px dashed rgba(155,89,182,0.3);
                        border-radius: 10px;
                        color: #888;
                    ">
                        <i class="fas fa-plus-circle fa-2x" style="opacity: 0.3;"></i>
                        <p style="margin-top: 10px;">Cree roles personalizados para su empresa</p>
                        <button onclick="RolesPermissionsModule.showCreateRoleModal()" style="
                            margin-top: 10px;
                            background: rgba(155,89,182,0.2);
                            border: 1px solid rgba(155,89,182,0.4);
                            color: #9b59b6;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                        ">
                            <i class="fas fa-plus"></i> Crear Rol
                        </button>
                    </div>
                `}
            </div>
        `;
    }

    /**
     * Renderizar tarjeta de rol
     */
    function renderRoleCard(role, isSystem) {
        const icon = roleIcons[role.role_key] || 'fa-user';
        const scopeLabels = {
            'all_company': 'Toda la empresa',
            'branch': 'Por sucursal',
            'department': 'Por departamento',
            'self_only': 'Solo datos propios',
            'assigned_only': 'Empleados asignados'
        };

        return `
            <div class="role-card" data-role-id="${role.id}" style="
                background: ${isSystem ? 'rgba(52,152,219,0.05)' : 'rgba(155,89,182,0.05)'};
                border: 1px solid ${isSystem ? 'rgba(52,152,219,0.2)' : 'rgba(155,89,182,0.2)'};
                border-radius: 10px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 20px rgba(0,0,0,0.3)'"
               onmouseout="this.style.transform='none'; this.style.boxShadow='none'"
               onclick="RolesPermissionsModule.showRoleDetail(${role.id})">

                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="
                            width: 45px;
                            height: 45px;
                            background: ${isSystem ? 'linear-gradient(135deg, #3498db, #2980b9)' : 'linear-gradient(135deg, #9b59b6, #8e44ad)'};
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fas ${icon}" style="color: white; font-size: 1.2rem;"></i>
                        </div>
                        <div>
                            <h5 style="margin: 0; color: #fff; font-size: 0.95rem;">${role.role_name}</h5>
                            <span style="
                                font-size: 0.7rem;
                                color: ${isSystem ? '#3498db' : '#9b59b6'};
                                background: ${isSystem ? 'rgba(52,152,219,0.2)' : 'rgba(155,89,182,0.2)'};
                                padding: 2px 8px;
                                border-radius: 10px;
                            ">${role.role_key}</span>
                        </div>
                    </div>
                    ${isSystem ? `
                        <span style="
                            font-size: 0.65rem;
                            background: rgba(52,152,219,0.2);
                            color: #3498db;
                            padding: 3px 8px;
                            border-radius: 10px;
                        ">
                            <i class="fas fa-lock"></i> Sistema
                        </span>
                    ` : `
                        <button onclick="event.stopPropagation(); RolesPermissionsModule.editRole(${role.id})" style="
                            background: transparent;
                            border: 1px solid rgba(255,255,255,0.2);
                            color: #888;
                            padding: 5px 10px;
                            border-radius: 5px;
                            cursor: pointer;
                        ">
                            <i class="fas fa-edit"></i>
                        </button>
                    `}
                </div>

                <p style="margin: 12px 0 10px; color: #888; font-size: 0.8rem; line-height: 1.4;">
                    ${role.description || 'Sin descripción'}
                </p>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <span style="
                        font-size: 0.7rem;
                        background: rgba(255,255,255,0.05);
                        padding: 4px 10px;
                        border-radius: 15px;
                        color: #aaa;
                    ">
                        <i class="fas fa-building"></i> ${scopeLabels[role.default_scope] || role.default_scope}
                    </span>
                    ${role.permission_level ? `
                        <span style="
                            font-size: 0.7rem;
                            background: rgba(46,204,113,0.1);
                            padding: 4px 10px;
                            border-radius: 15px;
                            color: #2ecc71;
                        ">
                            <i class="fas fa-layer-group"></i> Nivel ${role.permission_level}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Renderizar tab de Matriz de Permisos
     */
    function renderMatrixTab() {
        if (!state.permissionsMatrix) {
            return `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p style="margin-top: 15px;">Cargando matriz de permisos...</p>
                </div>
            `;
        }

        const { roles, modules, matrix } = state.permissionsMatrix;
        const actions = ['read', 'create', 'update', 'delete'];

        return `
            <div style="overflow-x: auto;">
                <table style="
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.8rem;
                ">
                    <thead>
                        <tr>
                            <th style="
                                position: sticky;
                                left: 0;
                                background: #1a1a2e;
                                padding: 15px;
                                text-align: left;
                                border-bottom: 2px solid rgba(255,255,255,0.1);
                                color: #3498db;
                                min-width: 200px;
                            ">
                                Módulo
                            </th>
                            ${roles.map(role => `
                                <th style="
                                    padding: 15px;
                                    text-align: center;
                                    border-bottom: 2px solid rgba(255,255,255,0.1);
                                    color: #fff;
                                    min-width: 100px;
                                ">
                                    <i class="fas ${roleIcons[role.role_key] || 'fa-user'}" style="display: block; margin-bottom: 5px; color: #3498db;"></i>
                                    ${role.role_name}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${modules.map(mod => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="
                                    position: sticky;
                                    left: 0;
                                    background: #1a1a2e;
                                    padding: 12px 15px;
                                    color: #e0e0e0;
                                    font-weight: 500;
                                ">
                                    <i class="fas ${mod.icon || 'fa-cube'}" style="color: #3498db; margin-right: 8px;"></i>
                                    ${mod.module_name}
                                </td>
                                ${roles.map(role => {
                                    const perms = matrix[mod.module_key]?.[role.role_key] || [];
                                    return `
                                        <td style="padding: 8px; text-align: center;">
                                            <div style="display: flex; justify-content: center; gap: 4px; flex-wrap: wrap;">
                                                ${actions.map(action => {
                                                    const hasPermission = perms.includes(action);
                                                    const colors = actionColors[action];
                                                    return `
                                                        <span style="
                                                            width: 24px;
                                                            height: 24px;
                                                            display: inline-flex;
                                                            align-items: center;
                                                            justify-content: center;
                                                            border-radius: 4px;
                                                            font-size: 0.65rem;
                                                            ${hasPermission ? `
                                                                background: ${colors.bg};
                                                                color: ${colors.border};
                                                                border: 1px solid ${colors.border};
                                                            ` : `
                                                                background: transparent;
                                                                color: #444;
                                                                border: 1px solid #333;
                                                            `}
                                                        " title="${action.charAt(0).toUpperCase() + action.slice(1)}">
                                                            <i class="fas ${colors.icon}"></i>
                                                        </span>
                                                    `;
                                                }).join('')}
                                            </div>
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Leyenda -->
            <div style="
                margin-top: 20px;
                padding: 15px;
                background: rgba(255,255,255,0.03);
                border-radius: 8px;
                display: flex;
                gap: 20px;
                justify-content: center;
                flex-wrap: wrap;
            ">
                ${actions.map(action => `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="
                            width: 24px;
                            height: 24px;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 4px;
                            background: ${actionColors[action].bg};
                            color: ${actionColors[action].border};
                            border: 1px solid ${actionColors[action].border};
                        ">
                            <i class="fas ${actionColors[action].icon}"></i>
                        </span>
                        <span style="color: #888; font-size: 0.8rem;">${action.charAt(0).toUpperCase() + action.slice(1)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Renderizar tab de Asignaciones
     */
    function renderAssignmentsTab() {
        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <!-- Lista de usuarios -->
                <div style="
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                    padding: 15px;
                ">
                    <h4 style="color: #3498db; margin: 0 0 15px; font-size: 0.95rem;">
                        <i class="fas fa-users"></i> Usuarios
                    </h4>
                    <input type="text" placeholder="Buscar usuario..." id="rp-user-search" style="
                        width: 100%;
                        padding: 10px 15px;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: #e0e0e0;
                        margin-bottom: 15px;
                    ">
                    <div id="rp-users-list" style="max-height: 400px; overflow-y: auto;">
                        ${state.users.map(user => `
                            <div class="user-item" data-user-id="${user.user_id}" onclick="RolesPermissionsModule.selectUser('${user.user_id}')" style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 10px;
                                border-radius: 8px;
                                margin-bottom: 8px;
                                background: rgba(255,255,255,0.02);
                                border: 1px solid rgba(255,255,255,0.05);
                                cursor: pointer;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='rgba(52,152,219,0.1)'"
                               onmouseout="this.style.background='rgba(255,255,255,0.02)'">
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <div style="
                                        width: 35px;
                                        height: 35px;
                                        background: linear-gradient(135deg, #3498db, #2980b9);
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        color: white;
                                        font-weight: bold;
                                        font-size: 0.8rem;
                                    ">
                                        ${(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                                    </div>
                                    <div>
                                        <div style="color: #fff; font-size: 0.85rem;">${user.firstName} ${user.lastName}</div>
                                        <div style="color: #666; font-size: 0.7rem;">${user.email}</div>
                                    </div>
                                </div>
                                <span style="
                                    font-size: 0.7rem;
                                    background: rgba(52,152,219,0.2);
                                    color: #3498db;
                                    padding: 3px 10px;
                                    border-radius: 10px;
                                ">${user.role}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Panel de asignación -->
                <div id="rp-assignment-panel" style="
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                    padding: 15px;
                ">
                    <div style="text-align: center; padding: 50px; color: #666;">
                        <i class="fas fa-user-plus fa-3x" style="opacity: 0.3;"></i>
                        <p style="margin-top: 15px;">Seleccione un usuario para ver/asignar roles</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cargar datos del servidor
     */
    async function loadData() {
        state.isLoading = true;
        const token = localStorage.getItem('token');

        try {
            // Cargar en paralelo
            const [rolesRes, modulesRes, matrixRes, usersRes] = await Promise.all([
                fetch(`${config.apiBase}/roles`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${config.apiBase}/modules`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${config.apiBase}/permissions-matrix`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => null),
                fetch(`${config.usersApi}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => null)
            ]);

            if (rolesRes.ok) {
                const data = await rolesRes.json();
                state.roles = data.roles || [];
            }

            if (modulesRes.ok) {
                const data = await modulesRes.json();
                state.modules = data.modules || [];
            }

            if (matrixRes && matrixRes.ok) {
                const data = await matrixRes.json();
                state.permissionsMatrix = data;
            }

            if (usersRes && usersRes.ok) {
                const data = await usersRes.json();
                state.users = data.users || data || [];
            }

            // Renderizar tab por defecto
            switchTab('roles');

        } catch (error) {
            console.error('[ROLES] Error loading data:', error);
            document.getElementById('rp-content').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle fa-2x"></i>
                    <p style="margin-top: 15px;">Error cargando datos: ${error.message}</p>
                    <button onclick="RolesPermissionsModule.loadData()" style="
                        margin-top: 15px;
                        background: rgba(231,76,60,0.2);
                        border: 1px solid #e74c3c;
                        color: #e74c3c;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            `;
        } finally {
            state.isLoading = false;
        }
    }

    /**
     * Cambiar tab
     */
    function switchTab(tabName) {
        // Actualizar botones
        document.querySelectorAll('.rp-tab').forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.style.background = isActive ? 'rgba(52, 152, 219, 0.2)' : 'transparent';
            btn.style.borderColor = isActive ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255,255,255,0.1)';
            btn.style.color = isActive ? '#3498db' : '#888';
            btn.classList.toggle('active', isActive);
        });

        // Renderizar contenido
        const content = document.getElementById('rp-content');
        switch (tabName) {
            case 'roles':
                content.innerHTML = renderRolesTab();
                break;
            case 'matrix':
                content.innerHTML = renderMatrixTab();
                break;
            case 'assignments':
                content.innerHTML = renderAssignmentsTab();
                break;
        }
    }

    /**
     * Mostrar modal de crear rol
     */
    function showCreateRoleModal() {
        const modal = document.createElement('div');
        modal.id = 'create-role-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            " onclick="if(event.target === this) this.remove()">
                <div style="
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 15px;
                    width: 500px;
                    max-height: 80vh;
                    overflow-y: auto;
                    padding: 25px;
                ">
                    <h3 style="margin: 0 0 20px; color: #fff;">
                        <i class="fas fa-plus-circle" style="color: #3498db;"></i> Crear Nuevo Rol
                    </h3>

                    <form id="create-role-form">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85rem;">
                                Nombre del Rol *
                            </label>
                            <input type="text" name="role_name" required style="
                                width: 100%;
                                padding: 12px;
                                background: #0f0f1a;
                                border: 1px solid rgba(255,255,255,0.15);
                                border-radius: 8px;
                                color: #e0e0e0;
                                font-size: 0.95rem;
                            " placeholder="Ej: Coordinador de Área">
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85rem;">
                                Clave del Rol *
                            </label>
                            <input type="text" name="role_key" required style="
                                width: 100%;
                                padding: 12px;
                                background: #0f0f1a;
                                border: 1px solid rgba(255,255,255,0.15);
                                border-radius: 8px;
                                color: #e0e0e0;
                                font-size: 0.95rem;
                            " placeholder="Ej: coordinator">
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85rem;">
                                Descripción
                            </label>
                            <textarea name="description" rows="3" style="
                                width: 100%;
                                padding: 12px;
                                background: #0f0f1a;
                                border: 1px solid rgba(255,255,255,0.15);
                                border-radius: 8px;
                                color: #e0e0e0;
                                resize: vertical;
                                font-size: 0.95rem;
                            " placeholder="Descripción de las responsabilidades del rol..."></textarea>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85rem;">
                                Alcance por Defecto
                            </label>
                            <select name="default_scope" style="
                                width: 100%;
                                padding: 12px;
                                background: #0f0f1a;
                                border: 1px solid rgba(255,255,255,0.15);
                                border-radius: 8px;
                                color: #e0e0e0;
                                font-size: 0.95rem;
                            ">
                                <option value="all_company" style="background: #0f0f1a; color: #e0e0e0;">Toda la empresa</option>
                                <option value="branch" style="background: #0f0f1a; color: #e0e0e0;">Por sucursal</option>
                                <option value="department" style="background: #0f0f1a; color: #e0e0e0;">Por departamento</option>
                                <option value="self_only" style="background: #0f0f1a; color: #e0e0e0;">Solo datos propios</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #888; margin-bottom: 5px; font-size: 0.85rem;">
                                Nivel de Permisos (1-100)
                            </label>
                            <input type="number" name="permission_level" min="1" max="100" value="50" style="
                                width: 100%;
                                padding: 12px;
                                background: #0f0f1a;
                                border: 1px solid rgba(255,255,255,0.15);
                                border-radius: 8px;
                                color: #e0e0e0;
                                font-size: 0.95rem;
                            ">
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" onclick="this.closest('#create-role-modal').remove()" style="
                                padding: 12px 25px;
                                background: transparent;
                                border: 1px solid rgba(255,255,255,0.2);
                                color: #888;
                                border-radius: 8px;
                                cursor: pointer;
                            ">Cancelar</button>
                            <button type="submit" style="
                                padding: 12px 25px;
                                background: linear-gradient(135deg, #3498db, #2980b9);
                                border: none;
                                color: white;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                <i class="fas fa-save"></i> Crear Rol
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Handler del form
        document.getElementById('create-role-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await createRole(new FormData(e.target));
        });
    }

    /**
     * Crear rol
     */
    async function createRole(formData) {
        const token = localStorage.getItem('token');
        const data = {
            role_name: formData.get('role_name'),
            role_key: formData.get('role_key'),
            description: formData.get('description'),
            default_scope: formData.get('default_scope'),
            permission_level: parseInt(formData.get('permission_level'))
        };

        try {
            const res = await fetch(`${config.apiBase}/roles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (result.success) {
                document.getElementById('create-role-modal')?.remove();
                await loadData();
                showNotification('Rol creado exitosamente', 'success');
            } else {
                showNotification(result.error || 'Error al crear rol', 'error');
            }

        } catch (error) {
            console.error('[ROLES] Error creating role:', error);
            showNotification('Error al crear rol', 'error');
        }
    }

    /**
     * Mostrar detalle de rol
     */
    function showRoleDetail(roleId) {
        const role = state.roles.find(r => r.id === roleId);
        if (!role) return;

        // Por ahora solo log, después se puede expandir
        console.log('[ROLES] Selected role:', role);
        state.selectedRole = role;
    }

    /**
     * Seleccionar usuario para asignar roles
     */
    async function selectUser(userId) {
        const user = state.users.find(u => u.user_id === userId);
        if (!user) return;

        // Marcar usuario seleccionado
        document.querySelectorAll('.user-item').forEach(el => {
            el.style.background = el.dataset.userId === userId
                ? 'rgba(52,152,219,0.2)'
                : 'rgba(255,255,255,0.02)';
            el.style.borderColor = el.dataset.userId === userId
                ? 'rgba(52,152,219,0.4)'
                : 'rgba(255,255,255,0.05)';
        });

        // Cargar roles del usuario
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${config.apiBase}/users/${userId}/roles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const userRoles = data.roles || [];

            // Renderizar panel de asignación
            document.getElementById('rp-assignment-panel').innerHTML = `
                <h4 style="color: #3498db; margin: 0 0 20px; font-size: 0.95rem;">
                    <i class="fas fa-user-tag"></i> Roles de ${user.firstName} ${user.lastName}
                </h4>

                <!-- Roles actuales -->
                <div style="margin-bottom: 20px;">
                    <h5 style="color: #888; margin-bottom: 10px; font-size: 0.85rem;">Roles Asignados</h5>
                    ${userRoles.length > 0 ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${userRoles.map(r => `
                                <span style="
                                    display: inline-flex;
                                    align-items: center;
                                    gap: 8px;
                                    padding: 8px 12px;
                                    background: rgba(52,152,219,0.2);
                                    border: 1px solid rgba(52,152,219,0.3);
                                    border-radius: 20px;
                                    font-size: 0.8rem;
                                    color: #3498db;
                                ">
                                    <i class="fas ${roleIcons[r.role_key] || 'fa-user'}"></i>
                                    ${r.role_name}
                                    ${r.is_primary ? '<i class="fas fa-star" style="color: #f1c40f;"></i>' : ''}
                                    <button onclick="RolesPermissionsModule.revokeRole('${userId}', ${r.id})" style="
                                        background: transparent;
                                        border: none;
                                        color: #e74c3c;
                                        cursor: pointer;
                                        padding: 0 5px;
                                    ">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </span>
                            `).join('')}
                        </div>
                    ` : `
                        <p style="color: #666; font-size: 0.85rem;">Sin roles adicionales asignados</p>
                    `}
                </div>

                <!-- Asignar nuevo rol -->
                <div style="
                    padding: 15px;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                ">
                    <h5 style="color: #888; margin: 0 0 15px; font-size: 0.85rem;">Asignar Rol</h5>
                    <select id="rp-assign-role-select" style="
                        width: 100%;
                        padding: 10px;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 8px;
                        color: #e0e0e0;
                        margin-bottom: 10px;
                    ">
                        <option value="">Seleccione un rol...</option>
                        ${state.roles.filter(r => !userRoles.some(ur => ur.id === r.id)).map(r => `
                            <option value="${r.id}">${r.role_name}</option>
                        `).join('')}
                    </select>
                    <button onclick="RolesPermissionsModule.assignRoleToUser('${userId}')" style="
                        width: 100%;
                        padding: 10px;
                        background: linear-gradient(135deg, #2ecc71, #27ae60);
                        border: none;
                        color: white;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        <i class="fas fa-plus"></i> Asignar Rol
                    </button>
                </div>
            `;

        } catch (error) {
            console.error('[ROLES] Error loading user roles:', error);
        }
    }

    /**
     * Asignar rol a usuario
     */
    async function assignRoleToUser(userId) {
        const roleId = document.getElementById('rp-assign-role-select')?.value;
        if (!roleId) {
            showNotification('Seleccione un rol', 'warning');
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${config.apiBase}/users/${userId}/roles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ roleId: parseInt(roleId) })
            });

            const result = await res.json();

            if (result.success) {
                showNotification('Rol asignado exitosamente', 'success');
                await selectUser(userId); // Recargar panel
            } else {
                showNotification(result.error || 'Error al asignar rol', 'error');
            }

        } catch (error) {
            console.error('[ROLES] Error assigning role:', error);
            showNotification('Error al asignar rol', 'error');
        }
    }

    /**
     * Revocar rol de usuario
     */
    async function revokeRole(userId, roleId) {
        if (!confirm('¿Está seguro de revocar este rol?')) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${config.apiBase}/users/${userId}/roles/${roleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason: 'Revocado por administrador' })
            });

            const result = await res.json();

            if (result.success) {
                showNotification('Rol revocado exitosamente', 'success');
                await selectUser(userId); // Recargar panel
            } else {
                showNotification(result.error || 'Error al revocar rol', 'error');
            }

        } catch (error) {
            console.error('[ROLES] Error revoking role:', error);
            showNotification('Error al revocar rol', 'error');
        }
    }

    /**
     * Mostrar notificación
     */
    function showNotification(message, type = 'info') {
        const colors = {
            success: '#2ecc71',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${colors[type]};
            color: white;
            border-radius: 8px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 10001;
            animation: slideIn 0.3s ease;
        `;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i> ${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Adjuntar event listeners
     */
    function attachEventListeners(container) {
        // Tabs
        container.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.rp-tab');
            if (tabBtn) {
                switchTab(tabBtn.dataset.tab);
            }
        });

        // Búsqueda de usuarios
        container.addEventListener('input', (e) => {
            if (e.target.id === 'rp-user-search') {
                const query = e.target.value.toLowerCase();
                document.querySelectorAll('.user-item').forEach(item => {
                    const text = item.textContent.toLowerCase();
                    item.style.display = text.includes(query) ? '' : 'none';
                });
            }
        });
    }

    /**
     * Mostrar modal de editar rol
     */
    function showEditRoleModal(roleId) {
        const role = state.roles.find(r => r.id === roleId);
        if (!role) {
            showNotification('Rol no encontrado', 'error');
            return;
        }

        if (role.is_system_role) {
            showNotification('Los roles del sistema no se pueden editar', 'warning');
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'edit-role-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            " onclick="if(event.target === this) this.remove()">
                <div style="
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 15px;
                    width: 550px;
                    max-height: 85vh;
                    overflow-y: auto;
                    padding: 25px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                ">
                    <h3 style="margin: 0 0 20px; color: #fff;">
                        <i class="fas fa-edit" style="color: #9b59b6;"></i> Editar Rol: ${role.role_name}
                    </h3>

                    <form id="edit-role-form">
                        <input type="hidden" name="role_id" value="${role.id}">

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #aaa; margin-bottom: 5px; font-size: 0.85rem;">
                                Nombre del Rol *
                            </label>
                            <input type="text" name="role_name" required value="${role.role_name || ''}" style="
                                width: 100%;
                                padding: 12px;
                                background: #0f0f1a;
                                border: 1px solid rgba(255,255,255,0.15);
                                border-radius: 8px;
                                color: #e0e0e0;
                                font-size: 0.95rem;
                            ">
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #aaa; margin-bottom: 5px; font-size: 0.85rem;">
                                Clave del Rol (no editable)
                            </label>
                            <input type="text" value="${role.role_key || ''}" disabled style="
                                width: 100%;
                                padding: 12px;
                                background: #0a0a12;
                                border: 1px solid rgba(255,255,255,0.08);
                                border-radius: 8px;
                                color: #666;
                                font-size: 0.95rem;
                            ">
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #aaa; margin-bottom: 5px; font-size: 0.85rem;">
                                Descripción
                            </label>
                            <textarea name="description" rows="3" style="
                                width: 100%;
                                padding: 12px;
                                background: #0f0f1a;
                                border: 1px solid rgba(255,255,255,0.15);
                                border-radius: 8px;
                                color: #e0e0e0;
                                resize: vertical;
                                font-size: 0.95rem;
                            ">${role.description || ''}</textarea>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #aaa; margin-bottom: 5px; font-size: 0.85rem;">
                                Alcance por Defecto
                            </label>
                            <select name="default_scope" style="
                                width: 100%;
                                padding: 12px;
                                background: #0f0f1a;
                                border: 1px solid rgba(255,255,255,0.15);
                                border-radius: 8px;
                                color: #e0e0e0;
                                font-size: 0.95rem;
                            ">
                                <option value="all_company" ${role.default_scope === 'all_company' ? 'selected' : ''} style="background: #0f0f1a; color: #e0e0e0;">Toda la empresa</option>
                                <option value="branch" ${role.default_scope === 'branch' ? 'selected' : ''} style="background: #0f0f1a; color: #e0e0e0;">Por sucursal</option>
                                <option value="department" ${role.default_scope === 'department' ? 'selected' : ''} style="background: #0f0f1a; color: #e0e0e0;">Por departamento</option>
                                <option value="self_only" ${role.default_scope === 'self_only' ? 'selected' : ''} style="background: #0f0f1a; color: #e0e0e0;">Solo datos propios</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #aaa; margin-bottom: 5px; font-size: 0.85rem;">
                                Nivel de Permisos (1-100)
                            </label>
                            <input type="number" name="permission_level" min="1" max="100" value="${role.permission_level || 50}" style="
                                width: 100%;
                                padding: 12px;
                                background: #0f0f1a;
                                border: 1px solid rgba(255,255,255,0.15);
                                border-radius: 8px;
                                color: #e0e0e0;
                                font-size: 0.95rem;
                            ">
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: space-between; margin-top: 25px;">
                            <button type="button" onclick="RolesPermissionsModule.deleteRole(${role.id})" style="
                                padding: 12px 20px;
                                background: rgba(231, 76, 60, 0.2);
                                border: 1px solid #e74c3c;
                                color: #e74c3c;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 500;
                            ">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                            <div style="display: flex; gap: 10px;">
                                <button type="button" onclick="this.closest('#edit-role-modal').remove()" style="
                                    padding: 12px 25px;
                                    background: transparent;
                                    border: 1px solid rgba(255,255,255,0.2);
                                    color: #888;
                                    border-radius: 8px;
                                    cursor: pointer;
                                ">Cancelar</button>
                                <button type="submit" style="
                                    padding: 12px 25px;
                                    background: linear-gradient(135deg, #9b59b6, #8e44ad);
                                    border: none;
                                    color: white;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    font-weight: 500;
                                ">
                                    <i class="fas fa-save"></i> Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Handler del form
        document.getElementById('edit-role-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateRole(new FormData(e.target));
        });
    }

    /**
     * Actualizar rol
     */
    async function updateRole(formData) {
        const token = localStorage.getItem('token');
        const roleId = formData.get('role_id');
        const data = {
            role_name: formData.get('role_name'),
            description: formData.get('description'),
            default_scope: formData.get('default_scope'),
            permission_level: parseInt(formData.get('permission_level'))
        };

        try {
            const res = await fetch(`${config.apiBase}/roles/${roleId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (result.success) {
                document.getElementById('edit-role-modal')?.remove();
                await loadData();
                showNotification('Rol actualizado exitosamente', 'success');
            } else {
                showNotification(result.error || 'Error al actualizar rol', 'error');
            }

        } catch (error) {
            console.error('[ROLES] Error updating role:', error);
            showNotification('Error al actualizar rol', 'error');
        }
    }

    /**
     * Eliminar rol
     */
    async function deleteRole(roleId) {
        if (!confirm('¿Está seguro de eliminar este rol? Esta acción no se puede deshacer.')) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${config.apiBase}/roles/${roleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await res.json();

            if (result.success) {
                document.getElementById('edit-role-modal')?.remove();
                await loadData();
                showNotification('Rol eliminado exitosamente', 'success');
            } else {
                showNotification(result.error || 'Error al eliminar rol', 'error');
            }

        } catch (error) {
            console.error('[ROLES] Error deleting role:', error);
            showNotification('Error al eliminar rol', 'error');
        }
    }

    // API pública
    return {
        init,
        loadData,
        switchTab,
        showCreateRoleModal,
        showRoleDetail,
        selectUser,
        assignRoleToUser,
        revokeRole,
        editRole: showEditRoleModal,
        deleteRole
    };
})();

// Auto-inicializar si existe el container
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('roles-permissions-container');
    if (container) {
        RolesPermissionsModule.init('roles-permissions-container');
    }
});
