// Access Control Module - Validación real de accesos
console.log('🛡️ [ACCESS-CONTROL] Módulo de control de acceso cargado');

// Función principal para verificar si un usuario puede acceder a un módulo/función
function checkUserAccess(userId, moduleId, functionId = null, companyId = null) {
    console.log(`🛡️ [ACCESS-CONTROL] Verificando acceso: Usuario ${userId}, Módulo ${moduleId}, Función ${functionId}`);

    // 1. Obtener usuario y sus permisos
    const user = getUserById(userId);
    if (!user) {
        console.warn(`🛡️ [ACCESS-CONTROL] ❌ Usuario ${userId} no encontrado`);
        return {
            allowed: false,
            reason: 'user_not_found',
            message: 'Usuario no encontrado en el sistema.'
        };
    }

    // 2. Los administradores de empresa tienen acceso total
    if (user.role === 'admin' || user.isCompanyAdmin) {
        console.log(`🛡️ [ACCESS-CONTROL] ✅ Acceso de administrador concedido para usuario ${userId}`);
        return {
            allowed: true,
            reason: 'admin_access',
            message: 'Acceso administrativo completo'
        };
    }

    // 3. Verificar permisos específicos del usuario
    const userPermissions = getUserEffectivePermissions(user);
    const hasModuleAccess = userPermissions.modules && userPermissions.modules.includes(moduleId);

    if (!hasModuleAccess) {
        console.warn(`🛡️ [ACCESS-CONTROL] ❌ Usuario ${userId} no tiene acceso al módulo ${moduleId}`);
        return {
            allowed: false,
            reason: 'module_access_denied',
            message: 'No tiene permisos para acceder a este módulo.'
        };
    }

    // 4. Si se especifica una función, verificar permiso específico
    if (functionId) {
        const modulePermissions = userPermissions.permissions[moduleId] || [];
        const hasFunctionAccess = modulePermissions.includes(functionId);

        if (!hasFunctionAccess) {
            console.warn(`🛡️ [ACCESS-CONTROL] ❌ Usuario ${userId} no tiene acceso a función ${functionId} del módulo ${moduleId}`);
            return {
                allowed: false,
                reason: 'function_access_denied',
                message: 'No tiene permisos para realizar esta acción.'
            };
        }
    }

    console.log(`🛡️ [ACCESS-CONTROL] ✅ Acceso concedido: Usuario ${userId}, Módulo ${moduleId}, Función ${functionId}`);
    return {
        allowed: true,
        reason: 'access_granted',
        message: 'Acceso autorizado'
    };
}

// NOTA: Licencias empresa-módulos se manejan desde panel-administrativo
// y se consultan en companies_modules table del backend

// Obtener usuario por ID
function getUserById(userId) {
    // Buscar en la lista de usuarios de permisos
    if (typeof permissionUsers !== 'undefined' && permissionUsers) {
        const user = permissionUsers.find(u => u.id === userId);
        if (user) return user;
    }
    
    // Buscar en currentUser global si existe
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id === userId) {
        return currentUser;
    }
    
    console.warn(`🛡️ [ACCESS-CONTROL] Usuario ${userId} no encontrado`);
    return null;
}

// Obtener permisos efectivos de un usuario (rol + personalizados)
function getUserEffectivePermissions(user) {
    const rolePermissions = getRolePermissions(user.role);
    const customPermissions = user.permissions || {};
    
    // Los módulos permitidos son la intersección entre:
    // 1. Módulos del rol
    // 2. Módulos con licencia de la empresa
    const companyModules = getCompanyLicensedModules();
    const allowedModules = rolePermissions.modules.filter(module => companyModules.includes(module));
    
    // Combinar permisos de rol con personalizaciones
    const effectivePermissions = {};
    
    allowedModules.forEach(moduleId => {
        // Permisos base del rol
        let modulePerms = [];
        if (rolePermissions.permissions === 'all') {
            // Admin tiene todos los permisos
            if (typeof systemModules !== 'undefined' && systemModules[moduleId]) {
                modulePerms = systemModules[moduleId].functions.map(f => f.id);
            }
        } else if (rolePermissions.permissions[moduleId]) {
            modulePerms = [...rolePermissions.permissions[moduleId]];
        }
        
        // Aplicar permisos personalizados si existen
        if (customPermissions[moduleId]) {
            modulePerms = customPermissions[moduleId];
        }
        
        effectivePermissions[moduleId] = modulePerms;
    });
    
    return {
        modules: allowedModules,
        permissions: effectivePermissions
    };
}

// Obtener permisos de un rol
function getRolePermissions(roleId) {
    if (typeof defaultRoles !== 'undefined' && defaultRoles[roleId]) {
        return defaultRoles[roleId];
    }
    
    // Rol por defecto (empleado básico)
    return {
        modules: [],
        permissions: {}
    };
}

// Obtener módulos con licencia de la empresa actual
function getCompanyLicensedModules() {
    if (typeof companyLicenses !== 'undefined' && companyLicenses) {
        return companyLicenses;
    }
    
    if (typeof currentCompany !== 'undefined' && currentCompany) {
        // Nuevo formato: array de módulos
        if (currentCompany.modules && Array.isArray(currentCompany.modules)) {
            return currentCompany.modules;
        }
        
        // Formato legacy: contractedModules
        if (currentCompany.contractedModules) {
            return currentCompany.contractedModules;
        }
        
        // Formato object: activeModules
        if (currentCompany.activeModules) {
            return Object.keys(currentCompany.activeModules).filter(
                module => currentCompany.activeModules[module] === true
            );
        }
    }
    
    return [];
}

// Middleware para validar acceso antes de cargar contenido
function validatePageAccess(moduleId, functionId = null) {
    return new Promise((resolve, reject) => {
        // Obtener usuario actual
        const user = typeof currentUser !== 'undefined' ? currentUser : null;
        if (!user) {
            reject({
                error: 'no_user',
                message: 'Debe iniciar sesión para acceder a esta página'
            });
            return;
        }
        
        // Verificar acceso usando user.id (estándar kiosk/asistencia)
        const accessCheck = checkUserAccess(user.id, moduleId, functionId, user.company_id);
        
        if (accessCheck.allowed) {
            resolve({
                user: user,
                permissions: getUserEffectivePermissions(user),
                modules: getCompanyLicensedModules()
            });
        } else {
            reject({
                error: accessCheck.reason,
                message: accessCheck.message
            });
        }
    });
}

// Mostrar página de acceso denegado
function showAccessDeniedPage(reason = '', message = '') {
    const content = document.getElementById('mainContent');
    if (!content) return;
    
    let icon = '🚫';
    let title = 'Acceso Denegado';
    let description = message || 'No tiene permisos para acceder a esta sección.';
    let actionButton = '';
    
    switch (reason) {
        case 'company_license':
            icon = '🏢';
            title = 'Módulo No Contratado';
            description = 'Su empresa no tiene licencia para este módulo. Contacte al administrador para obtener acceso.';
            actionButton = `
                <button onclick="contactAdmin()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">
                    📞 Contactar Administrador
                </button>
            `;
            break;
        case 'module_access_denied':
            icon = '🔒';
            title = 'Sin Permisos de Módulo';
            description = 'Su rol no tiene acceso a este módulo. Consulte con su supervisor si necesita acceso.';
            break;
        case 'function_access_denied':
            icon = '⚠️';
            title = 'Función Restringida';
            description = 'No tiene permisos para realizar esta acción específica.';
            break;
        case 'no_user':
            icon = '👤';
            title = 'Sesión Requerida';
            description = 'Debe iniciar sesión para acceder a esta página.';
            actionButton = `
                <button onclick="redirectToLogin()" style="padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">
                    🔑 Iniciar Sesión
                </button>
            `;
            break;
    }
    
    content.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 100px auto; text-align: center;">
            <div style="padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">${icon}</div>
                <h2 style="color: #dc3545; margin-bottom: 15px;">${title}</h2>
                <p style="color: #6c757d; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">${description}</p>
                
                ${actionButton}
                
                <button onclick="goBack()" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 15px 10px 0 10px;">
                    ← Volver
                </button>
            </div>
        </div>
    `;
}

// Funciones auxiliares para botones
function contactAdmin() {
    alert('Funcionalidad de contacto con administrador - Implementar según necesidades');
}

function redirectToLogin() {
    // Redirigir a página de login
    window.location.href = '/login.html';
}

function goBack() {
    if (history.length > 1) {
        history.back();
    } else {
        window.location.href = '/dashboard.html';
    }
}

// Mostrar panel de control de acceso para testing
function showAccessControlPanel() {
    console.log('🛡️ [ACCESS-CONTROL] Mostrando panel de control de acceso');

    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>🛡️ Control de Acceso</h3>
                <p>Gestión de permisos y accesos de usuarios</p>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h5>Verificar Acceso de Usuario</h5>
                        <div class="form-group">
                            <label>ID Usuario:</label>
                            <input type="number" id="testUserId" class="form-control" placeholder="ID del usuario">
                        </div>
                        <div class="form-group">
                            <label>Módulo:</label>
                            <input type="text" id="testModuleId" class="form-control" placeholder="ID del módulo">
                        </div>
                        <div class="form-group">
                            <label>Función (opcional):</label>
                            <input type="text" id="testFunctionId" class="form-control" placeholder="ID de la función">
                        </div>
                        <button onclick="testUserAccess()" class="btn btn-primary">Verificar Acceso</button>
                    </div>
                    <div class="col-md-6">
                        <h5>Resultado de Verificación</h5>
                        <div id="accessResult" style="padding: 15px; background: #f8f9fa; border-radius: 5px; min-height: 100px;">
                            <em>Ingrese datos y presione "Verificar Acceso"</em>
                        </div>
                    </div>
                </div>

                <hr>

                <div class="row">
                    <div class="col-md-12">
                        <h5>Usuario Actual</h5>
                        <div id="currentUserInfo"></div>
                        <button onclick="showCurrentUserInfo()" class="btn btn-info mt-2">Mostrar Info Usuario</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Mostrar info del usuario actual automáticamente
    setTimeout(showCurrentUserInfo, 100);
}

// Función para testear acceso de usuario
function testUserAccess() {
    const userId = parseInt(document.getElementById('testUserId').value);
    const moduleId = document.getElementById('testModuleId').value;
    const functionId = document.getElementById('testFunctionId').value || null;

    if (!userId || !moduleId) {
        document.getElementById('accessResult').innerHTML = `
            <div style="color: #dc3545;">
                ❌ Error: Debe proporcionar al menos ID de usuario y módulo
            </div>
        `;
        return;
    }

    const result = checkUserAccess(userId, moduleId, functionId);

    const resultDiv = document.getElementById('accessResult');
    const bgColor = result.allowed ? '#d4edda' : '#f8d7da';
    const textColor = result.allowed ? '#155724' : '#721c24';
    const icon = result.allowed ? '✅' : '❌';

    resultDiv.innerHTML = `
        <div style="background: ${bgColor}; color: ${textColor}; padding: 15px; border-radius: 5px;">
            <h6>${icon} ${result.allowed ? 'Acceso Permitido' : 'Acceso Denegado'}</h6>
            <p><strong>Razón:</strong> ${result.reason}</p>
            <p><strong>Mensaje:</strong> ${result.message}</p>
            <small><strong>Usuario:</strong> ${userId}, <strong>Módulo:</strong> ${moduleId}, <strong>Función:</strong> ${functionId || 'ninguna'}</small>
        </div>
    `;
}

// Mostrar información del usuario actual
function showCurrentUserInfo() {
    const infoDiv = document.getElementById('currentUserInfo');

    if (typeof currentUser !== 'undefined' && currentUser) {
        const permissions = getUserEffectivePermissions(currentUser);

        infoDiv.innerHTML = `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                <h6>👤 Usuario: ${currentUser.name || currentUser.username || 'Sin nombre'} (ID: ${currentUser.id})</h6>
                <p><strong>Rol:</strong> ${currentUser.role}</p>
                <p><strong>Email:</strong> ${currentUser.email || 'No especificado'}</p>
                <p><strong>Empresa:</strong> ${currentUser.company_id || 'No especificada'}</p>
                <p><strong>Módulos Permitidos:</strong> ${permissions.modules?.join(', ') || 'Ninguno'}</p>
                <details style="margin-top: 10px;">
                    <summary>Ver Permisos Detallados</summary>
                    <pre style="background: white; padding: 10px; margin-top: 5px; font-size: 12px;">${JSON.stringify(permissions, null, 2)}</pre>
                </details>
            </div>
        `;
    } else {
        infoDiv.innerHTML = `
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; color: #856404;">
                ⚠️ No hay usuario autenticado actualmente
            </div>
        `;
    }
}

// Funciones globales
window.checkUserAccess = checkUserAccess;
window.getUserEffectivePermissions = getUserEffectivePermissions;
window.validatePageAccess = validatePageAccess;
window.showAccessDeniedPage = showAccessDeniedPage;
window.showAccessControlPanel = showAccessControlPanel;

// Alias para compatibilidad con sistema de módulos
window.showAccessControlContent = showAccessControlPanel;

// Registro en window.Modules para sistema moderno
window.Modules = window.Modules || {};
window.Modules['access-control'] = {
    init: showAccessControlPanel
};

console.log('✅ [ACCESS-CONTROL] Módulo de control de acceso completamente cargado');