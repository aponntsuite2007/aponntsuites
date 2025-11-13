// Users Module - v5.0 PROGRESSIVE + PLUG & PLAY
console.log('👥 [USERS] Módulo users v6.0 - PLUG & PLAY SYSTEM INTEGRADO');

// ═══════════════════════════════════════════════════════════════════
// 🎨 INYECTAR CSS RESPONSIVE GLOBAL PARA TODOS LOS MODALES
// ═══════════════════════════════════════════════════════════════════
(function injectResponsiveModalCSS() {
    if (document.getElementById('responsive-modals-css')) return; // Ya existe

    const style = document.createElement('style');
    style.id = 'responsive-modals-css';
    style.textContent = `
        /* ✅ FIX RESPONSIVE: Todos los modales creados dinámicamente */
        [id*="Modal"], [id*="modal"] {
            /* Overlay del modal */
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.5) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            z-index: 10000 !important;
            overflow-y: auto !important;
            padding: 20px 10px !important;
        }

        /* Contenido interno del modal */
        [id*="Modal"] > div:first-child,
        [id*="modal"] > div:first-child {
            background: white !important;
            border-radius: 10px !important;
            width: 100% !important;
            max-width: 1400px !important;
            max-height: calc(100vh - 80px) !important;
            overflow-y: auto !important;
            margin: 40px auto !important;
            padding: 30px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
        }

        /* Responsive para tablets */
        @media (max-width: 1200px) {
            [id*="Modal"] > div:first-child,
            [id*="modal"] > div:first-child {
                max-width: 95% !important;
                padding: 20px !important;
            }
        }

        /* Responsive para móviles */
        @media (max-width: 768px) {
            [id*="Modal"] > div:first-child,
            [id*="modal"] > div:first-child {
                max-width: 98% !important;
                padding: 15px !important;
                margin: 20px auto !important;
            }
        }

        /* Botones siempre visibles en el footer */
        [id*="Modal"] button,
        [id*="modal"] button {
            position: relative !important;
            z-index: 1 !important;
        }
    `;
    document.head.appendChild(style);
    console.log('✅ [USERS] CSS responsive global inyectado para todos los modales');
})();

// Global variables for users
let allUsers = [];
let filteredUsers = [];

// 📄 PAGINATION VARIABLES
let currentPage = 1;
let itemsPerPage = 25; // Default: 25 users per page
let totalPages = 1;

// 🔌 MODULE CONFIGURATION - Define which features require which modules
const USER_MODULE_FEATURES = {
    'biometric-verification': 'biometric-enterprise',
    'shift-assignment': 'shifts-enterprise',
    'bulk-actions': 'users-advanced',
    'export-csv': 'reports-advanced',
    'user-stats': 'analytics-basic'
};

// Users functions
async function showUsersContent() {
    // FIX: Eliminar modales fantasma si existen (triple seguridad)
    const modalFantasma1 = document.getElementById('addCompanyModal');
    if (modalFantasma1) {
        console.log('🗑️ [USERS] Eliminando modal fantasma addCompanyModal');
        modalFantasma1.remove();
    }

    const modalFantasma2 = document.getElementById('initCompanyModal');
    if (modalFantasma2) {
        console.log('🗑️ [USERS] Eliminando modal fantasma initCompanyModal (Inicializar Nueva Empresa)');
        modalFantasma2.style.display = 'none !important';
        modalFantasma2.style.visibility = 'hidden';
        modalFantasma2.style.opacity = '0';
        modalFantasma2.style.pointerEvents = 'none';
        modalFantasma2.remove();
    }

    const content = document.getElementById('mainContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="tab-content active" id="users">
            <div class="card">
                <h2 data-translate="users.title">👥 Gestión de Usuarios</h2>
                <div class="quick-actions">
                    <button class="btn btn-primary" onclick="showAddUser()" data-translate="users.add_user">➕ Agregar Usuario</button>
                    <button class="btn btn-success" onclick="loadUsers()" data-translate="users.user_list">📋 Lista de Usuarios</button>
                    <button class="btn btn-warning" onclick="showUserStats()" data-translate="users.statistics" data-module="analytics-basic">📊 Estadísticas</button>
                    <button class="btn btn-info" onclick="exportUsers()" data-translate="users.export_csv" data-module="reports-advanced">📤 Exportar CSV</button>
                    <button class="btn btn-secondary" onclick="showBulkActions()" data-translate="users.bulk_actions" data-module="users-advanced">⚡ Acciones Masivas</button>
                </div>
                
                <div id="users-container">
                    <h3 data-translate="users.list_title">📋 Lista de Usuarios</h3>
                    
                    <!-- Campos de búsqueda -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #dee2e6;">
                        <div style="display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #495057;" data-translate="users.search_dni">🔍 Buscar por DNI:</label>
                                <input type="text" id="searchDNI" data-translate-placeholder="users.search_dni" 
                                       style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;"
                                       onkeyup="filterUsers()" />
                            </div>
                            <div style="flex: 1; min-width: 250px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #495057;" data-translate="users.search_name">👤 Buscar por Nombre/Apellido:</label>
                                <input type="text" id="searchName" data-translate-placeholder="users.search_name" 
                                       style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;"
                                       onkeyup="filterUsers()" />
                            </div>
                            <div style="display: flex; flex-direction: column; justify-content: flex-end; gap: 5px; align-items: center; height: 60px;">
                                <button class="btn btn-sm btn-secondary" onclick="clearFilters()" title="Limpiar filtros" style="margin-top: 8px;" data-translate="users.clear_filters">🧹 Limpiar</button>
                                <span id="filterResults" style="font-size: 12px; color: #6c757d; white-space: nowrap;"></span>
                            </div>
                        </div>
                    </div>

                    <!-- 📄 PAGINATION CONTROLS TOP -->
                    <div id="pagination-top" style="display: none; margin: 15px 0;"></div>

                    <div id="users-list" class="server-info" data-translate="messages.loading_users">
                        Presiona "Lista de Usuarios" para cargar...
                    </div>

                    <!-- 📄 PAGINATION CONTROLS BOTTOM -->
                    <div id="pagination-bottom" style="display: none; margin: 15px 0;"></div>
                </div>
                
                <div id="user-stats" class="stats-grid" style="margin-top: 20px;">
                    <div class="stat-item">
                        <div class="stat-value" id="total-users">--</div>
                        <div class="stat-label" data-translate="users.total_users">Usuarios Totales</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="active-users">--</div>
                        <div class="stat-label" data-translate="users.active_users">Usuarios Activos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="admin-users">--</div>
                        <div class="stat-label" data-translate="users.admin_users">Administradores</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Apply translations
    if (window.translator) {
        await window.translator.updateInterface();
    }

    // 🔌 Apply module visibility (show/hide features based on contracted modules)
    if (window.moduleHelper) {
        console.log('🔌 [USERS] Aplicando visibilidad de módulos...');
        await window.moduleHelper.applyModuleVisibility();
    }

    // Auto load user stats on tab show
    setTimeout(showUserStats, 300);

    // 🔥 AUTO-LOAD users table when tab opens
    setTimeout(async () => {
        await loadUsers();
    }, 500);
}

// Load users list - Original functionality with biometric status
async function loadUsers() {
    console.log('👥 [USERS] Cargando lista de usuarios...');
    
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    usersList.innerHTML = '🔄 Cargando usuarios...';
    
    try {
        // Get auth token using the global function
        const token = window.progressiveAdmin ? window.progressiveAdmin.getAuthToken() : null;
        
        if (!token) {
            console.log('🔑 No hay token válido, usuario debe iniciar sesión');
            usersList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c; background: #fff5f5; border: 1px solid #fadde1; border-radius: 8px;">
                    <h3>❌ Sesión no válida</h3>
                    <p>Usuario y contraseña requeridos. Por favor, inicie sesión nuevamente.</p>
                    <button onclick="location.reload()" class="btn btn-primary">🔄 Recargar página</button>
                </div>
            `;
            return;
        }
        
        console.log('🔑 Token encontrado para autenticación:', token.substring(0, 20) + '...');

        const apiUrl = window.progressiveAdmin.getApiUrl('/api/v1/users');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });
        
        let users = [];
        if (response.ok) {
            const data = await response.json();
            // Handle different response formats
            users = data.users || data || [];

            // Validate users is an array before mapping
            if (!Array.isArray(users)) {
                console.warn('⚠️ Response does not contain users array:', data);
                users = [];
            }

            // Transform PostgreSQL users to expected format
            console.log('🔍 [DEBUG] Sample raw user from API:', users[0]);
            users = users.map(user => {
                console.log(`🔍 [DEBUG] Mapping user - id: ${user.id}, user_id fallback: ${user.user_id}`);
                return {
                id: user.id || user.user_id,  // ✅ FIX: Backend returns 'id', not 'user_id'
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
                email: user.email,
                role: user.role === 'admin' ? 'Administrador' :
                      user.role === 'supervisor' ? 'Supervisor' :
                      user.role === 'medical' ? 'Médico' : 'Empleado',
                legajo: user.employeeId || user.user_id || 'N/A',
                dni: user.dni || user.employeeId || 'N/A',
                department: user.department || 'Sin asignar',
                convenioColectivo: user.convenioColectivo || 'No especificado',
                status: user.isActive !== false ? 'Activo' : 'Inactivo',
                allowOutsideRadius: user.allowOutsideRadius || false,
                lastAccess: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca',
                biometric: 'Pendiente', // Default for now
                firstName: user.firstName,
                lastName: user.lastName,
                employeeId: user.employeeId,
                phone: user.phone,
                address: user.address,
                emergencyContact: user.emergencyContact,
                emergencyPhone: user.emergencyPhone,
                departmentId: user.departmentId
            };
            });
            console.log('🔍 [DEBUG] Sample mapped user:', users[0]);

        } else if (response.status === 401) {
            console.log('🔑 Token expirado o inválido');
            // Clear invalid tokens
            window.companyAuthToken = null;
            localStorage.removeItem('aponnt_session');
            sessionStorage.removeItem('aponnt_session');
            
            // Show authentication error message
            usersList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #e74c3c; background: #fff5f5; border: 1px solid #fadde1; border-radius: 8px;">
                    <h3>❌ Token de sesión expirado</h3>
                    <p>Su sesión ha expirado. Por favor, inicie sesión nuevamente.</p>
                    <button onclick="location.reload()" class="btn btn-primary">🔄 Iniciar sesión</button>
                </div>
            `;
            return;
        } else {
            console.log('⚠️ API no disponible, usando datos de ejemplo');
            // Use mock data if API not available
            users = [
                { 
                    id: 1, 
                    name: 'Juan Pérez', 
                    email: 'juan@empresa.com', 
                    role: 'Empleado',
                    legajo: 'E001',
                    department: 'IT', 
                    status: 'Activo', 
                    lastAccess: '2025-09-03 09:15',
                    biometric: 'Registrado'
                },
                { 
                    id: 2, 
                    name: 'María García', 
                    email: 'maria@empresa.com', 
                    role: 'Administrador',
                    legajo: 'A001',
                    department: 'RRHH', 
                    status: 'Activo', 
                    lastAccess: '2025-09-03 09:20',
                    biometric: 'Registrado'
                }
            ];
        }
        
        // Store users data globally for filtering and export
        allUsers = users;
        filteredUsers = [...users];
        window.currentUsersData = users;
        
        // Fetch biometric status for each user
        await fetchBiometricStatusForUsers(users);
        
        displayUsersTable(users);

        // Update stats
        updateUserStatsFromData(users);

        // 🔌 Apply module visibility to dynamically generated buttons
        if (window.moduleHelper) {
            await window.moduleHelper.applyModuleVisibility();
        }

    } catch (error) {
        console.error('❌ [USERS] Error cargando usuarios:', error);
        usersList.innerHTML = '❌ Error cargando usuarios: ' + error.message;
    }
}

// Display users in table format - WITH PAGINATION
function displayUsersTable(users) {
    console.log('🔍 [DEBUG displayUsersTable] Received users:', users.length, 'First user:', users[0]);
    const usersList = document.getElementById('users-list');
    if (!usersList) return;

    if (!users || users.length === 0) {
        usersList.innerHTML = 'No hay usuarios registrados';
        hidePaginationControls();
        return;
    }

    // 📄 CALCULATE PAGINATION
    totalPages = Math.ceil(users.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1; // Reset if out of bounds

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = users.slice(startIndex, endIndex);

    console.log(`📄 [PAGINATION] Mostrando usuarios ${startIndex + 1}-${Math.min(endIndex, users.length)} de ${users.length} (Página ${currentPage}/${totalPages})`);

    let tableHTML = `
        <div class="table-container" style="margin-top: 15px;">
            <table class="data-table" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="text-align: center; padding: 8px;">
                            <div>👤</div>
                            <div style="font-size: 0.85em;">Nombre</div>
                        </th>
                        <th style="text-align: center; padding: 8px;">
                            <div>🏷️</div>
                            <div style="font-size: 0.85em;">Legajo</div>
                        </th>
                        <th style="text-align: center; padding: 8px;">
                            <div>🏢</div>
                            <div style="font-size: 0.85em;">Departamento</div>
                        </th>
                        <th style="text-align: center; padding: 8px;">
                            <div>👑</div>
                            <div style="font-size: 0.85em;">Rol</div>
                        </th>
                        <th style="text-align: center; padding: 8px;">
                            <div>📋</div>
                            <div style="font-size: 0.85em;">Convenio</div>
                        </th>
                        <th style="text-align: center; padding: 8px;">
                            <div>📊</div>
                            <div style="font-size: 0.85em;">Estado</div>
                        </th>
                        <th style="text-align: center; padding: 8px;">
                            <div>📍</div>
                            <div style="font-size: 0.85em;">GPS Radio</div>
                        </th>
                        <th style="text-align: center; padding: 8px;">
                            <div>🕐</div>
                            <div style="font-size: 0.85em;">Turnos</div>
                        </th>
                        <th style="text-align: center; padding: 8px;">
                            <div>🖐️</div>
                            <div style="font-size: 0.85em;">Bio</div>
                        </th>
                        <th style="text-align: center; padding: 8px;">
                            <div>⚙️</div>
                            <div style="font-size: 0.85em;">Acciones</div>
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;

    // 📄 RENDER ONLY CURRENT PAGE USERS
    paginatedUsers.forEach(user => {
        const statusClass = user.status === 'Activo' ? 'success' : 'error';
        const biometricClass = user.biometric === 'Registrado' ? 'success' : 'warning';
        
        const gpsRadiusClass = user.allowOutsideRadius ? 'success' : 'warning';
        const gpsRadiusText = user.allowOutsideRadius ? '✅ Permitido' : '❌ Restringido';
        
        // Turnos asignados (por ahora simulado, luego se conectará con API)
        const userShifts = user.shifts || ['Mañana 08:00-16:00', 'Tarde 16:00-24:00'];
        const shiftsText = userShifts.length > 0 ? userShifts.join(', ') : 'Sin turnos';
        
        tableHTML += `
            <tr>
                <td><strong>${user.name}</strong></td>
                <td>${user.legajo}</td>
                <td>${user.role}</td>
                <td><span style="font-size: 0.8em; color: #666;">${user.convenioColectivo || 'No especificado'}</span></td>
                <td><span class="status-badge ${statusClass}">${user.status}</span></td>
                <td><span class="status-badge ${gpsRadiusClass}">${gpsRadiusText}</span></td>
                <td style="font-size: 0.85em; max-width: 150px; overflow: hidden; text-overflow: ellipsis;" title="${shiftsText}">${shiftsText}</td>
                <td>
                    <span class="status-badge ${biometricClass}">${user.biometric}</span>
                    ${user.biometricDetails && (user.biometricDetails.face || user.biometricDetails.fingerprint) ?
                        `<button class="btn-mini btn-primary" onclick="verifyUserBiometric('${user.id}', '${user.name}')"
                         title="Verificar biometría" style="margin-left: 5px;" data-module="biometric-enterprise">🔍</button>` : ''}
                </td>
                <td style="white-space: nowrap; min-width: 90px;">
                    <div style="display: flex; flex-direction: column; gap: 2px; align-items: center;">
                        <button class="btn-mini btn-success" onclick="assignUserShifts('${user.id}', '${user.name}')" title="Asignar Turnos" data-module="shifts-enterprise">🕐</button>
                        <button class="btn-mini btn-warning" onclick="resetPassword('${user.id}', '${user.name}')" title="Reset">🔑</button>
                        <button class="btn-mini btn-info" onclick="viewUser('${user.id}')" title="Ver">👁️</button>
                        <button class="btn-mini btn-danger" onclick="deleteUser('${user.id}')" title="Eliminar">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    usersList.innerHTML = tableHTML;

    // 📄 RENDER PAGINATION CONTROLS
    renderPaginationControls(users.length, startIndex, Math.min(endIndex, users.length));

    showUserMessage(`✅ ${users.length} usuarios cargados exitosamente`, 'success');
}

// 📄 ========== PAGINATION FUNCTIONS ==========

/**
 * Render pagination controls (top and bottom)
 */
function renderPaginationControls(totalUsers, startIndex, endIndex) {
    const paginationHTML = createPaginationHTML(totalUsers, startIndex, endIndex);

    const topControls = document.getElementById('pagination-top');
    const bottomControls = document.getElementById('pagination-bottom');

    if (topControls) {
        topControls.innerHTML = paginationHTML;
        topControls.style.display = 'block';
    }

    if (bottomControls) {
        bottomControls.innerHTML = paginationHTML;
        bottomControls.style.display = 'block';
    }
}

/**
 * Create pagination HTML
 */
function createPaginationHTML(totalUsers, startIndex, endIndex) {
    const maxVisiblePages = 5; // Show max 5 page numbers
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust start if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    let pagesHTML = '';
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'background: #2c5aa0; color: white; font-weight: bold;' : 'background: #f8f9fa; color: #495057;';
        pagesHTML += `
            <button onclick="goToPage(${i})"
                    style="padding: 6px 12px; margin: 0 2px; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; ${activeClass}">
                ${i}
            </button>
        `;
    }

    return `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
            <!-- Info Section -->
            <div style="font-size: 14px; color: #495057;">
                Mostrando <strong>${startIndex + 1}</strong> a <strong>${endIndex}</strong> de <strong>${totalUsers}</strong> usuarios
            </div>

            <!-- Controls Section -->
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <!-- Items per page selector -->
                <div style="display: flex; align-items: center; gap: 5px;">
                    <label style="font-size: 14px; color: #495057;">Por página:</label>
                    <select onchange="changeItemsPerPage(this.value)"
                            style="padding: 6px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;">
                        <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
                        <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25</option>
                        <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
                        <option value="9999" ${itemsPerPage === 9999 ? 'selected' : ''}>Todos</option>
                    </select>
                </div>

                <!-- Navigation buttons -->
                <div style="display: flex; gap: 5px;">
                    <button onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}
                            style="padding: 6px 12px; border: 1px solid #dee2e6; border-radius: 4px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; background: ${currentPage === 1 ? '#e9ecef' : '#fff'};">
                        ⏮️ Primera
                    </button>
                    <button onclick="previousPage()" ${currentPage === 1 ? 'disabled' : ''}
                            style="padding: 6px 12px; border: 1px solid #dee2e6; border-radius: 4px; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; background: ${currentPage === 1 ? '#e9ecef' : '#fff'};">
                        ◀️ Anterior
                    </button>

                    ${pagesHTML}

                    <button onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''}
                            style="padding: 6px 12px; border: 1px solid #dee2e6; border-radius: 4px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; background: ${currentPage === totalPages ? '#e9ecef' : '#fff'};">
                        Siguiente ▶️
                    </button>
                    <button onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}
                            style="padding: 6px 12px; border: 1px solid #dee2e6; border-radius: 4px; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; background: ${currentPage === totalPages ? '#e9ecef' : '#fff'};">
                        Última ⏭️
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Hide pagination controls
 */
function hidePaginationControls() {
    const topControls = document.getElementById('pagination-top');
    const bottomControls = document.getElementById('pagination-bottom');

    if (topControls) topControls.style.display = 'none';
    if (bottomControls) bottomControls.style.display = 'none';
}

/**
 * Go to specific page
 */
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayUsersTable(filteredUsers.length > 0 ? filteredUsers : allUsers);
}

/**
 * Go to next page
 */
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        displayUsersTable(filteredUsers.length > 0 ? filteredUsers : allUsers);
    }
}

/**
 * Go to previous page
 */
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayUsersTable(filteredUsers.length > 0 ? filteredUsers : allUsers);
    }
}

/**
 * Change items per page
 */
function changeItemsPerPage(value) {
    itemsPerPage = parseInt(value);
    currentPage = 1; // Reset to first page
    console.log(`📄 [PAGINATION] Items per page cambiado a: ${itemsPerPage}`);
    displayUsersTable(filteredUsers.length > 0 ? filteredUsers : allUsers);
}

// 📄 ========== END PAGINATION FUNCTIONS ==========

// Display users in the list
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    if (!users || users.length === 0) {
        usersList.innerHTML = '<div class="empty-item">No hay usuarios registrados</div>';
        return;
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="user-item" data-id="${user.id}">
            <div class="user-avatar">
                <div class="avatar-placeholder">${user.name.charAt(0)}</div>
            </div>
            <div class="user-info">
                <div class="user-name">${user.name}</div>
                <div class="user-email">${user.email}</div>
                <div class="user-department">${user.department}</div>
            </div>
            <div class="user-status">
                <span class="status-badge ${user.status.toLowerCase()}">${user.status}</span>
                <div class="last-access">Último: ${user.lastAccess}</div>
            </div>
            <div class="user-actions">
                <button class="btn-icon" onclick="viewUser('${user.id}')" title="Ver">👁️</button>
                <button class="btn-icon" onclick="deleteUser('${user.id}')" title="Eliminar">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Update user statistics
function updateUserStats(users) {
    if (!users) return;
    
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Activo').length;
    const pendingUsers = users.filter(u => u.status === 'Pendiente').length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('pendingUsers').textContent = pendingUsers;
}

// Update user statistics from data
function updateUserStatsFromData(users) {
    if (!users) return;
    
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Activo').length;
    const adminUsers = users.filter(u => u.role === 'Administrador').length;
    
    const totalElement = document.getElementById('total-users');
    const activeElement = document.getElementById('active-users');
    const adminElement = document.getElementById('admin-users');
    
    if (totalElement) totalElement.textContent = totalUsers;
    if (activeElement) activeElement.textContent = activeUsers;
    if (adminElement) adminElement.textContent = adminUsers;
}

// Fetch biometric status for all users
async function fetchBiometricStatusForUsers(users) {
    console.log('🔍 [USERS] Obteniendo estado biométrico de usuarios...');
    console.time('⏱️ Tiempo carga biometría');

    if (!users || users.length === 0) return;

    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) return;

    // ✅ OPTIMIZACIÓN: Fetch EN PARALELO con Promise.all() (100x más rápido!)
    const promises = users.map(async (user) => {
        try {
            const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/facial-biometric/user/${user.id}`);
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const bioData = await response.json();
                if (bioData && bioData.length > 0) {
                    // User has biometric data
                    const hasFace = bioData.some(b => b.faceEmbedding);
                    const hasFingerprint = bioData.some(b => b.fingerprintTemplate);

                    if (hasFace && hasFingerprint) {
                        user.biometric = '👤👆 Completo';
                        user.biometricDetails = { face: true, fingerprint: true };
                    } else if (hasFace) {
                        user.biometric = '👤 Rostro';
                        user.biometricDetails = { face: true, fingerprint: false };
                    } else if (hasFingerprint) {
                        user.biometric = '👆 Huella';
                        user.biometricDetails = { face: false, fingerprint: true };
                    } else {
                        user.biometric = '⚠️ Pendiente';
                        user.biometricDetails = { face: false, fingerprint: false };
                    }
                } else {
                    user.biometric = '❌ Sin registro';
                    user.biometricDetails = { face: false, fingerprint: false };
                }
            } else {
                // If error fetching, mark as pending
                user.biometric = '⚠️ Pendiente';
                user.biometricDetails = { face: false, fingerprint: false };
            }
        } catch (error) {
            console.error(`Error obteniendo biometría para usuario ${user.id}:`, error);
            user.biometric = '⚠️ Error';
            user.biometricDetails = { face: false, fingerprint: false };
        }
    });

    // Esperar a que TODAS las promesas se resuelvan en paralelo
    await Promise.allSettled(promises);  // allSettled = continúa aunque algunas fallen

    console.timeEnd('⏱️ Tiempo carga biometría');
    console.log('✅ [USERS] Estado biométrico actualizado');
}

// Filter users by search term
function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const userItems = document.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
        const userName = item.querySelector('.user-name').textContent.toLowerCase();
        const userEmail = item.querySelector('.user-email').textContent.toLowerCase();
        const userDept = item.querySelector('.user-department').textContent.toLowerCase();
        
        if (userName.includes(searchTerm) || userEmail.includes(searchTerm) || userDept.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.setProperty('display', 'none', 'important');
        }
    });
}

// Show user statistics - Original functionality  
function showUserStats() {
    console.log('📊 [USERS] Cargando estadísticas de usuarios...');
    
    // Simulate loading statistics from API or calculate from existing data
    setTimeout(() => {
        document.getElementById('total-users').textContent = '25';
        document.getElementById('active-users').textContent = '22';
        document.getElementById('admin-users').textContent = '3';
        
        showUserMessage('📊 Estadísticas actualizadas', 'success');
    }, 800);
}

// Show add user dialog - Original functionality
function showAddUser() {
    console.log('➕ [USERS] Mostrando formulario agregar usuario...');
    
    // Create modal for adding user (simplified version)
    const modal = document.createElement('div');
    modal.id = 'userModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">
            <h3>➕ Agregar Nuevo Usuario</h3>
            <div style="margin: 15px 0;">
                <label>👤 Nombre completo:</label>
                <input type="text" id="newUserName" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="Ej: Juan Pérez" required>
            </div>
            <div style="margin: 15px 0;">
                <label>📧 Email:</label>
                <input type="email" id="newUserEmail" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="juan.perez@empresa.com" required>
            </div>
            <div style="margin: 15px 0;">
                <label>🏷️ Legajo/ID Empleado:</label>
                <input type="text" id="newUserLegajo" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="EMP001" required>
            </div>
            <div style="margin: 15px 0;">
                <label>🔑 Contraseña (para APK):</label>
                <input type="password" id="newUserPassword" style="width: 100%; padding: 8px; margin-top: 5px;" placeholder="Contraseña para login APK" value="123456">
                <small style="color: #666; display: block; margin-top: 5px;">
                    💡 Esta será la contraseña que el usuario usará para loguearse en la APK
                </small>
            </div>
            <div style="margin: 15px 0;">
                <label>👑 Rol:</label>
                <select id="newUserRole" style="width: 100%; padding: 8px; margin-top: 5px;">
                    <option value="employee">Empleado</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                </select>
            </div>
            <div style="margin: 15px 0;">
                <label>🏢 Departamento:</label>
                <select id="newUserDept" style="width: 100%; padding: 8px; margin-top: 5px;">
                    <option value="">Selecciona un departamento...</option>
                    <!-- Se cargarán dinámicamente desde la API -->
                </select>
                <small style="color: #666; font-size: 11px; display: block; margin-top: 5px;">
                    💡 Los departamentos se cargan desde Gestión > Departamentos
                </small>
            </div>
            <div style="margin: 15px 0;">
                <label>📋 Convenio Colectivo de Trabajo:</label>
                <select id="newUserConvenio" style="width: 100%; padding: 8px; margin-top: 5px;">
                    <option value="">Selecciona un convenio...</option>
                    <option value="Convenio General">Convenio General</option>
                    <option value="Convenio Comercio">Convenio Comercio</option>
                    <option value="Convenio Metalúrgico">Convenio Metalúrgico</option>
                    <option value="Convenio Construcción">Convenio Construcción</option>
                    <option value="Convenio Gastronómico">Convenio Gastronómico</option>
                    <option value="Convenio UOM">Convenio UOM</option>
                    <option value="Convenio UOCRA">Convenio UOCRA</option>
                    <option value="Convenio Bancario">Convenio Bancario</option>
                    <option value="Convenio Textil">Convenio Textil</option>
                    <option value="Convenio Sanidad">Convenio Sanidad</option>
                    <option value="Otro">Otro - Especificar</option>
                </select>
                <small style="color: #666; font-size: 11px; display: block; margin-top: 5px;">
                    💡 Define el convenio colectivo aplicable al empleado
                </small>
            </div>
            <div style="margin: 15px 0;">
                <label style="display: flex; align-items: center;">
                    <input type="checkbox" id="newUserAllowOutsideRadius" style="margin-right: 8px;">
                    🌍 Permitir fichar fuera del radio GPS del departamento
                </label>
                <small style="color: #666; font-size: 11px; display: block; margin-top: 5px;">
                    💡 Si se marca, el usuario podrá fichar aunque esté fuera del área de cobertura GPS
                </small>
            </div>
            <div style="margin: 20px 0; text-align: center;">
                <button class="btn btn-primary" onclick="saveNewUser()" style="margin-right: 10px;">💾 Guardar</button>
                <button class="btn btn-secondary" onclick="closeUserModal()">❌ Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cargar departamentos dinámicamente
    setTimeout(() => {
        populateDepartmentSelect('newUserDept');
    }, 100);
}

// Save new user
async function saveNewUser() {
    const name = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const legajo = document.getElementById('newUserLegajo').value;
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const dept = document.getElementById('newUserDept').value;
    const convenio = document.getElementById('newUserConvenio').value;
    const allowOutsideRadius = document.getElementById('newUserAllowOutsideRadius').checked;
    
    if (!name || !email || !legajo || !password) {
        showUserMessage('⚠️ Por favor complete todos los campos obligatorios', 'warning');
        return;
    }
    
    console.log('💾 [USERS] Guardando usuario:', { name, email, legajo, role, dept });
    
    try {
        // Parse name into firstName and lastName
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || name;
        const lastName = nameParts.slice(1).join(' ') || 'Usuario';
        
        // Prepare user data for API
        const userData = {
            employeeId: legajo,
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            role: role,
            departmentId: dept, // Use departmentId instead of department for PostgreSQL
            convenioColectivo: convenio,
            allowOutsideRadius: allowOutsideRadius
        };
        
        // Get auth token from localStorage or sessionStorage
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showUserMessage('⚠️ No hay token de autenticación', 'error');
            return;
        }
        
        // Call API to create user
        const apiUrl = window.progressiveAdmin.getApiUrl('/api/v1/users');
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Show success message with credentials
            const credentialsMsg = `✅ Usuario creado exitosamente!\n\n📱 CREDENCIALES PARA APK:\nEmail: ${email}\nContraseña: ${password}\n\n💡 Estas credenciales son para login en la APK móvil`;
            
            // Show modal with credentials
            const credModal = document.createElement('div');
            credModal.id = 'userCredentialsModal';
            credModal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.9); display: flex; justify-content: center;
                align-items: center; z-index: 99999;
            `;
            credModal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; text-align: center; box-shadow: 0 10px 50px rgba(0,0,0,0.5);">
                    <h3 style="color: #4CAF50; margin-bottom: 20px;">✅ Usuario Creado Exitosamente</h3>
                    <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; text-align: left;">
                        <div style="margin: 8px 0;"><strong>👤 Nombre:</strong> ${name}</div>
                        <div style="margin: 8px 0;"><strong>📧 Email:</strong> ${email}</div>
                        <div style="margin: 8px 0;"><strong>🔑 Contraseña:</strong> ${password}</div>
                        <div style="margin: 8px 0;"><strong>🏷️ ID:</strong> ${legajo}</div>
                        <div style="margin: 8px 0;"><strong>👑 Rol:</strong> ${role}</div>
                    </div>
                    <div style="padding: 10px; background: #e3f2fd; border-radius: 5px; font-size: 0.9em; margin-bottom: 15px;">
                        📱 <strong>Estas credenciales son para login en la APK móvil</strong>
                    </div>
                    <button id="closeCredentialsBtn" onclick="document.getElementById('userCredentialsModal').remove(); setTimeout(loadUsers, 500);"
                            style="margin-top: 10px; padding: 12px 30px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; transition: all 0.3s ease;">
                        🆗 Entendido
                    </button>
                </div>
            `;

            // Remover cualquier modal de credenciales existente
            const existingModal = document.getElementById('userCredentialsModal');
            if (existingModal) {
                existingModal.remove();
            }

            document.body.appendChild(credModal);

            // Agregar efecto hover al botón
            setTimeout(() => {
                const btn = document.getElementById('closeCredentialsBtn');
                if (btn) {
                    btn.addEventListener('mouseover', function() {
                        this.style.background = '#45a049';
                        this.style.transform = 'scale(1.05)';
                    });
                    btn.addEventListener('mouseout', function() {
                        this.style.background = '#4CAF50';
                        this.style.transform = 'scale(1)';
                    });
                }
            }, 100);
            
            console.log('✅ Usuario creado:', result);
            closeUserModal();
            showUserMessage('✅ Usuario creado - Credenciales mostradas', 'success');
        } else {
            const error = await response.json();
            showUserMessage(`❌ Error: ${error.error || 'Error desconocido'}`, 'error');
            console.error('❌ Error creando usuario:', error);
        }
        
    } catch (error) {
        console.error('❌ [USERS] Error guardando usuario:', error);
        showUserMessage('❌ Error de conexión al guardar usuario', 'error');
    }
}

// Close user modal
function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Edit user
async function editUser(userId) {
    console.log('✏️ [USERS] Editando usuario:', userId);
    
    try {
        // Get auth token
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showUserMessage('⚠️ No hay token de autenticación', 'error');
            return;
        }
        
        // Get user data first
        const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`);
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            showUserMessage(`❌ Error: ${error.error || 'Usuario no encontrado'}`, 'error');
            return;
        }

        // FIX CRÍTICO: Backend retorna {success: true, user: {...}}
        const responseData = await response.json();
        const user = responseData.user || responseData; // Extraer user del wrapper
        
        // Create edit modal
        const modal = document.createElement('div');
        modal.id = 'editUserModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            z-index: 10000;
            overflow-y: auto;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; width: 98%; max-width: 1800px; height: 95vh; overflow-y: auto; margin-top: 2vh;">
                <h3 style="text-align: center; margin-bottom: 25px;">✏️ Editar Usuario Completo</h3>
                
                <!-- Información Personal -->
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">👤 Información Personal</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label>Nombre:</label>
                            <input type="text" id="editFirstName" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.firstName || ''}" placeholder="Nombre" required>
                        </div>
                        <div>
                            <label>Apellido:</label>
                            <input type="text" id="editLastName" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.lastName || ''}" placeholder="Apellido" required>
                        </div>
                        <div>
                            <label>📧 Email:</label>
                            <input type="email" id="editEmail" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.email || ''}" required>
                        </div>
                        <div>
                            <label>🆔 DNI:</label>
                            <input type="text" id="editDni" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.dni || ''}" placeholder="DNI">
                        </div>
                        <div>
                            <label>🎂 Fecha de Nacimiento:</label>
                            <input type="date" id="editBirthDate" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.birthDate || ''}">
                        </div>
                        <div>
                            <label>📱 Teléfono:</label>
                            <input type="text" id="editPhone" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.phone || ''}" placeholder="Teléfono">
                        </div>
                    </div>
                    <div style="margin: 15px 0;">
                        <label>🏠 Dirección:</label>
                        <textarea id="editAddress" style="width: 100%; padding: 8px; margin-top: 5px; height: 60px; resize: vertical;" placeholder="Dirección completa">${user.address || ''}</textarea>
                    </div>
                </div>

                <!-- Información Laboral -->
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">🏢 Información Laboral</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label>🏷️ ID Empleado:</label>
                            <input type="text" id="editEmployeeId" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.employeeId || ''}" placeholder="ID Empleado" required>
                        </div>
                        <div>
                            <label>👑 Rol:</label>
                            <select id="editRole" style="width: 100%; padding: 8px; margin-top: 5px;">
                                <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>Empleado</option>
                                <option value="supervisor" ${user.role === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                                <option value="medical" ${user.role === 'medical' ? 'selected' : ''}>Médico</option>
                            </select>
                        </div>
                        <div>
                            <label>🏢 Departamento:</label>
                            <select id="editDepartment" style="width: 100%; padding: 8px; margin-top: 5px;">
                                <option value="">Cargando departamentos...</option>
                            </select>
                        </div>
                        <div>
                            <label>💼 Posición:</label>
                            <input type="text" id="editPosition" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.position || ''}" placeholder="Cargo/Posición">
                        </div>
                        <div>
                            <label>📅 Fecha de Contratación:</label>
                            <input type="date" id="editHireDate" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.hireDate || ''}">
                        </div>
                        <div>
                            <label>💰 Salario:</label>
                            <input type="number" id="editSalary" step="0.01" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.salary || ''}" placeholder="Salario">
                        </div>
                    </div>
                </div>

                <!-- Contacto de Emergencia -->
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">🚨 Contacto de Emergencia</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label>👤 Nombre del Contacto:</label>
                            <input type="text" id="editEmergencyContact" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.emergencyContact || ''}" placeholder="Nombre completo">
                        </div>
                        <div>
                            <label>📞 Teléfono de Emergencia:</label>
                            <input type="text" id="editEmergencyPhone" style="width: 100%; padding: 8px; margin-top: 5px;" value="${user.emergencyPhone || ''}" placeholder="Teléfono de contacto">
                        </div>
                    </div>
                </div>

                <!-- Configuraciones del Sistema -->
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">⚙️ Configuraciones</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: flex; align-items: center;">
                                <input type="checkbox" id="editIsActive" ${user.isActive !== false ? 'checked' : ''} style="margin-right: 8px;">
                                ✅ Usuario Activo
                            </label>
                        </div>
                        <div>
                            <label style="display: flex; align-items: center;">
                                <input type="checkbox" id="editAllowOutsideRadius" ${user.allowOutsideRadius ? 'checked' : ''} style="margin-right: 8px;">
                                🌍 Permitir fichar fuera del radio GPS
                            </label>
                        </div>
                    </div>
                    <small style="color: #666; font-size: 11px; display: block; margin-top: 10px;">
                        💡 GPS: Si se marca, el usuario podrá fichar aunque esté fuera del área de cobertura del departamento
                    </small>
                </div>

                <!-- Configuración de Autorizador -->
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0; background: #f8f9fa;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">🔐 Permisos de Autorización de Llegadas Tardías</h4>
                    <div style="margin-bottom: 15px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="editCanAuthorizeLateArrivals" ${user.canAuthorizeLateArrivals ? 'checked' : ''} style="margin-right: 8px;" onchange="toggleAuthorizedDepartments()">
                            <strong>✅ Puede autorizar llegadas tardías</strong>
                        </label>
                        <small style="color: #666; font-size: 11px; display: block; margin-top: 5px; margin-left: 24px;">
                            💡 Si se activa, este usuario podrá aprobar/rechazar solicitudes de llegadas tardías
                        </small>
                    </div>

                    <div id="authorizedDepartmentsContainer" style="display: ${user.canAuthorizeLateArrivals ? 'block' : 'none'}; background: white; padding: 15px; border-radius: 8px; margin-top: 15px;">
                        <h5 style="margin: 0 0 10px 0; color: #555;">📋 Departamentos que puede autorizar:</h5>
                        <small style="color: #666; font-size: 11px; display: block; margin-bottom: 10px;">
                            💡 Seleccione los departamentos. Si no selecciona ninguno, podrá autorizar TODOS los departamentos.
                        </small>
                        <div id="editAuthorizedDepartmentsList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                            <div style="text-align: center; color: #666;">
                                Cargando departamentos...
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
                        <small><strong>⚠️ Importante:</strong> Los autorizadores recibirán notificaciones por email/WhatsApp cuando un empleado marque llegada tardía y requiera autorización.</small>
                    </div>
                </div>

                <!-- Configuración de Acceso a Kioscos -->
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">🔐 Configuración de Acceso</h4>

                    <div style="margin: 10px 0;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="editCanUseMobileApp" ${user.canUseMobileApp !== false ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.3);">
                            <span>📱 Puede usar APK Móvil para marcar asistencia</span>
                        </label>
                    </div>

                    <div style="margin: 10px 0;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="editCanUseKiosk" ${user.canUseKiosk !== false ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.3);">
                            <span>📟 Puede usar Kioscos para marcar asistencia</span>
                        </label>
                    </div>

                    <div style="margin: 15px 0; padding-left: 35px;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="editCanUseAllKiosks" ${user.canUseAllKiosks ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.3);" onchange="toggleKiosksSelection(this.checked)">
                            <span>✅ Puede usar TODOS los kioscos</span>
                        </label>
                        <small style="color: #666; font-size: 11px; display: block; margin-top: 5px; margin-left: 34px;">
                            Si se activa, el empleado podrá marcar en cualquier kiosko de la empresa
                        </small>
                    </div>

                    <div id="authorizedKiosksContainer" style="display: ${user.canUseAllKiosks ? 'none' : 'block'}; background: white; padding: 15px; border-radius: 8px; margin-top: 15px; margin-left: 35px;">
                        <h5 style="margin: 0 0 10px 0; color: #555;">📟 Kioscos autorizados:</h5>
                        <small style="color: #666; font-size: 11px; display: block; margin-bottom: 10px;">
                            Seleccione los kioscos específicos donde puede marcar
                        </small>
                        <div id="editAuthorizedKiosksList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
                            <div style="text-align: center; color: #666;">
                                Cargando kioscos...
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Horario Flexible -->
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">⏰ Horario Flexible</h4>

                    <div style="margin: 10px 0;">
                        <label style="display: flex; align-items: center; cursor: pointer;">
                            <input type="checkbox" id="editHasFlexibleSchedule" ${user.hasFlexibleSchedule ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.3);" onchange="toggleFlexibleScheduleNotes(this.checked)">
                            <span>✓ Horario flexible (sin restricción de horarios)</span>
                        </label>
                        <small style="color: #666; font-size: 11px; display: block; margin-top: 5px; margin-left: 34px;">
                            El empleado podrá marcar a cualquier hora sin validación de turno
                        </small>
                    </div>

                    <div id="flexibleScheduleNotesContainer" style="display: ${user.hasFlexibleSchedule ? 'block' : 'none'}; margin-top: 15px;">
                        <label>📝 Notas/Razón del horario flexible:</label>
                        <textarea id="editFlexibleScheduleNotes" style="width: 100%; padding: 8px; margin-top: 5px; height: 80px; resize: vertical;" placeholder="Ej: Gerente con horario libre, vendedor externo, etc.">${user.flexibleScheduleNotes || ''}</textarea>
                    </div>
                </div>

                <!-- Botones de Acción -->
                <div style="margin: 25px 0; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
                    <button class="btn btn-primary" onclick="saveEditUser('${userId}')" style="margin-right: 15px; padding: 10px 25px; font-size: 16px;">💾 Guardar Cambios</button>
                    <button class="btn btn-secondary" onclick="closeEditModal()" style="padding: 10px 25px; font-size: 16px;">❌ Cancelar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cargar departamentos dinámicamente y seleccionar el actual
        setTimeout(() => {
            populateDepartmentSelect('editDepartment', user.departmentId || '');
            populateAuthorizedDepartmentsList(user.authorizedDepartments || []);
            // Cargar kioscos para configuración de acceso
            populateKiosksList('editAuthorizedKiosksList', user.authorizedKiosks || []);
        }, 100);

    } catch (error) {
        console.error('❌ [USERS] Error editando usuario:', error);
        showUserMessage('❌ Error cargando datos del usuario', 'error');
    }
}

// Toggle visibility of authorized departments section
function toggleAuthorizedDepartments() {
    const checkbox = document.getElementById('editCanAuthorizeLateArrivals');
    const container = document.getElementById('authorizedDepartmentsContainer');
    if (checkbox && container) {
        container.style.display = checkbox.checked ? 'block' : 'none';
    }
}

// Populate authorized departments checkboxes
async function populateAuthorizedDepartmentsList(selectedDepartments = []) {
    const container = document.getElementById('editAuthorizedDepartmentsList');
    if (!container) return;

    try {
        const departments = await getDepartments();

        if (!departments || departments.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999;">No hay departamentos disponibles</div>';
            return;
        }

        let html = '';
        departments.forEach(dept => {
            const isChecked = selectedDepartments.includes(dept.id);
            html += `
                <label style="display: block; padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;">
                    <input type="checkbox"
                           class="authorized-dept-checkbox"
                           value="${dept.id}"
                           ${isChecked ? 'checked' : ''}
                           style="margin-right: 8px;">
                    ${dept.name}
                </label>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading departments for authorization:', error);
        container.innerHTML = '<div style="text-align: center; color: #e74c3c;">Error cargando departamentos</div>';
    }
}

// Save edited user
async function saveEditUser(userId) {
    try {
        // Obtener todos los valores del formulario completo
        const firstName = document.getElementById('editFirstName').value.trim();
        const lastName = document.getElementById('editLastName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const employeeId = document.getElementById('editEmployeeId').value.trim();
        const role = document.getElementById('editRole').value;
        const department = document.getElementById('editDepartment').value;
        const phone = document.getElementById('editPhone').value.trim();
        const dni = document.getElementById('editDni').value.trim();
        const birthDate = document.getElementById('editBirthDate').value;
        const address = document.getElementById('editAddress').value.trim();
        const position = document.getElementById('editPosition').value.trim();
        const hireDate = document.getElementById('editHireDate').value;
        const salary = document.getElementById('editSalary').value;
        const emergencyContact = document.getElementById('editEmergencyContact').value.trim();
        const emergencyPhone = document.getElementById('editEmergencyPhone').value.trim();
        const isActive = document.getElementById('editIsActive').checked;
        const allowOutsideRadius = document.getElementById('editAllowOutsideRadius').checked;

        // Capturar configuración de autorizador
        const canAuthorizeLateArrivals = document.getElementById('editCanAuthorizeLateArrivals')?.checked || false;
        const authorizedDepartments = [];
        if (canAuthorizeLateArrivals) {
            const checkboxes = document.querySelectorAll('.authorized-dept-checkbox:checked');
            checkboxes.forEach(cb => {
                authorizedDepartments.push(parseInt(cb.value));
            });
        }

        // Capturar configuración de acceso a kioscos
        const canUseMobileApp = document.getElementById('editCanUseMobileApp')?.checked !== false;
        const canUseKiosk = document.getElementById('editCanUseKiosk')?.checked !== false;
        const canUseAllKiosks = document.getElementById('editCanUseAllKiosks')?.checked || false;
        const authorizedKiosks = [];
        if (!canUseAllKiosks && canUseKiosk) {
            const kioskCheckboxes = document.querySelectorAll('#editAuthorizedKiosksList input[type="checkbox"]:checked');
            kioskCheckboxes.forEach(cb => {
                authorizedKiosks.push(parseInt(cb.value));
            });
        }

        // Capturar configuración de horario flexible
        const hasFlexibleSchedule = document.getElementById('editHasFlexibleSchedule')?.checked || false;
        const flexibleScheduleNotes = document.getElementById('editFlexibleScheduleNotes')?.value.trim() || null;

        // Validaciones obligatorias
        if (!firstName || !lastName) {
            showUserMessage('⚠️ Nombre y apellido son obligatorios', 'warning');
            return;
        }
        
        if (!email) {
            showUserMessage('⚠️ Email es obligatorio', 'warning');
            return;
        }
        
        if (!employeeId) {
            showUserMessage('⚠️ ID de empleado es obligatorio', 'warning');
            return;
        }
        
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showUserMessage('⚠️ No hay token de autenticación', 'error');
            return;
        }
        
        // Preparar objeto con todos los datos
        const updateData = {
            firstName,
            lastName,
            email,
            employeeId,
            role,
            departmentId: department || null,
            phone: phone || null,
            dni: dni || null,
            birthDate: birthDate || null,
            address: address || null,
            position: position || null,
            hireDate: hireDate || null,
            salary: salary ? parseFloat(salary) : null,
            emergencyContact: emergencyContact || null,
            emergencyPhone: emergencyPhone || null,
            isActive,
            allowOutsideRadius,
            // Configuración de autorizador de llegadas tardías
            canAuthorizeLateArrivals,
            authorizedDepartments: canAuthorizeLateArrivals ? authorizedDepartments : [],
            // Configuración de acceso a kioscos y app móvil
            canUseMobileApp,
            canUseKiosk,
            canUseAllKiosks,
            authorizedKiosks,
            // Configuración de horario flexible
            hasFlexibleSchedule,
            flexibleScheduleNotes
        };

        console.log('💾 [USERS] Datos de usuario completos:', {
            canAuthorizeLateArrivals,
            authorizedDepartments: updateData.authorizedDepartments,
            accessConfig: { canUseMobileApp, canUseKiosk, canUseAllKiosks, authorizedKiosks },
            flexibleSchedule: { hasFlexibleSchedule, flexibleScheduleNotes }
        });
        
        const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`);
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showUserMessage('✅ Usuario actualizado exitosamente', 'success');
            closeEditModal();
            // Refresh the users list
            setTimeout(loadUsers, 500);
        } else {
            const error = await response.json();
            showUserMessage(`❌ Error: ${error.error || 'Error desconocido'}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error guardando usuario:', error);
        showUserMessage('❌ Error guardando cambios', 'error');
    }
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// View user details - Sistema de Expediente Completo
async function viewUser(userId) {
    console.log('📋 [USERS] Abriendo expediente completo del usuario:', userId);

    try {
        // Get auth token, if none exists, login first
        let token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            console.log('🔑 No hay token, ejecutando auto-login...');
            await initializeAdmin();
            token = localStorage.getItem('authToken');
            if (!token) {
                showUserMessage('⚠️ No se pudo obtener token de autenticación', 'error');
                return;
            }
        }

        // Get user data
        const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`);
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            showUserMessage(`❌ Error: ${error.error || 'Usuario no encontrado'}`, 'error');
            return;
        }
        
        // FIX CRÍTICO: Backend retorna {success: true, user: {...}}
        const responseData = await response.json();
        const user = responseData.user || responseData; // Extraer user del wrapper

        console.log('🔍 [DEBUG viewUser] user.isActive:', user.isActive);
        console.log('🔍 [DEBUG viewUser] user.allowOutsideRadius:', user.allowOutsideRadius);
        console.log('🔍 [DEBUG viewUser] user completo:', user);

        // Fetch biometric photo if available
        // Build biometric photo with expiration info from user fields
        let biometricPhotoHTML = '';
        let photoInfoHTML = '';

        if (user.biometric_photo_url) {
            // User has biometric photo
            biometricPhotoHTML = `
                <img src="${user.biometric_photo_url}" alt="Foto biométrica"
                     style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #28a745;">
            `;

            // Calculate days until renewal
            if (user.biometric_photo_expiration) {
                const expirationDate = new Date(user.biometric_photo_expiration);
                const now = new Date();
                const daysUntilRenewal = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
                const captureDate = user.biometric_photo_date ? new Date(user.biometric_photo_date).toLocaleDateString('es-AR') : 'N/A';

                let renewalColor = '#28a745'; // green
                let renewalIcon = '✅';
                if (daysUntilRenewal <= 7) {
                    renewalColor = '#dc3545'; // red
                    renewalIcon = '🚨';
                } else if (daysUntilRenewal <= 30) {
                    renewalColor = '#ffc107'; // yellow
                    renewalIcon = '⚠️';
                }

                photoInfoHTML = `
                    <div style="margin-top: 10px; font-size: 12px; color: #666;">
                        <div style="margin-bottom: 5px;">
                            <strong>📅 Capturada:</strong> ${captureDate}
                        </div>
                        <div style="background: ${renewalColor}; color: white; padding: 6px; border-radius: 4px; font-weight: bold;">
                            ${renewalIcon} ${daysUntilRenewal > 0 ? `${daysUntilRenewal} días para renovar` : 'RENOVACIÓN VENCIDA'}
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; font-style: italic; color: #999;">
                            La única forma de cambiar la foto es tomando un nuevo registro biométrico
                        </div>
                    </div>
                `;
            }
        } else {
            // No photo, use default avatar
            biometricPhotoHTML = `
                <div style="width: 120px; height: 120px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px;">
                    👤
                </div>
            `;
            photoInfoHTML = `
                <div style="margin-top: 10px; font-size: 12px; color: #999;">
                    <em>Sin foto biométrica</em>
                </div>
            `;
        }
        
        // Create comprehensive employee file modal
        const modal = document.createElement('div');
        modal.id = 'employeeFileModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px 10px 10px 10px;
            z-index: 10000;
            overflow-y: auto;
        `;
        
        const roleText = user.role === 'admin' ? 'Administrador' : 
                        user.role === 'supervisor' ? 'Supervisor' :
                        user.role === 'medical' ? 'Médico' : 'Empleado';

        // Detectar tamaño de pantalla y ajustar modal dinámicamente
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let modalWidth, modalMaxWidth, modalHeight;

        if (screenWidth <= 768) {
            // Móvil
            modalWidth = '95%';
            modalMaxWidth = '100%';
            modalHeight = '90vh';
        } else if (screenWidth <= 1366) {
            // Tablets y pantallas pequeñas
            modalWidth = '85%';
            modalMaxWidth = '1100px';
            modalHeight = '85vh';
        } else if (screenWidth <= 1920) {
            // Pantallas medianas (Full HD)
            modalWidth = '75%';
            modalMaxWidth = '1400px';
            modalHeight = '80vh';
        } else {
            // Pantallas grandes (4K+)
            modalWidth = '65%';
            modalMaxWidth = '1800px';
            modalHeight = '85vh';
        }

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; width: ${modalWidth}; max-width: ${modalMaxWidth}; height: ${modalHeight}; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <!-- Header del Expediente -->
                <div style="position: sticky; top: 0; background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; z-index: 100;">
                    <div>
                        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                            📋 Expediente Digital: ${user.firstName} ${user.lastName}
                        </h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">ID: ${user.employeeId} | ${roleText} | ${user.department?.name || 'Sin departamento'}</p>
                    </div>
                    <button onclick="closeEmployeeFile()" style="position: fixed; top: 20px; right: 20px; background: #dc3545; border: none; color: white; border-radius: 50%; width: 45px; height: 45px; cursor: pointer; font-size: 20px; z-index: 10001; box-shadow: 0 4px 8px rgba(0,0,0,0.3); transition: all 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">✕</button>
                </div>

                <!-- Tabs del Expediente -->
                <div style="position: sticky; top: 80px; background: #ecf0f1; padding: 10px 20px; display: flex; gap: 5px; flex-wrap: wrap; z-index: 99; border-bottom: 2px solid #ddd;">
                    <button class="file-tab active" onclick="showFileTab('admin', this)">⚙️ Administración</button>
                    <button class="file-tab" onclick="showFileTab('personal', this)">👤 Datos Personales</button>
                    <button class="file-tab" onclick="showFileTab('work', this)">💼 Antecedentes Laborales</button>
                    <button class="file-tab" onclick="showFileTab('family', this)">👨‍👩‍👧‍👦 Grupo Familiar</button>
                    <button class="file-tab" onclick="showFileTab('medical', this)">🏥 Antecedentes Médicos</button>
                    <button class="file-tab" onclick="showFileTab('attendance', this)">📅 Asistencias/Permisos</button>
                    <button class="file-tab" onclick="showFileTab('disciplinary', this)">⚖️ Disciplinarios</button>
                    <button class="file-tab" onclick="showFileTab('tasks', this)">🎯 Config. Tareas</button>
                    <button class="file-tab" onclick="showFileTab('biometric', this)">📸 Registro Biométrico</button>
                </div>

                <!-- Contenido del Expediente -->
                <div style="flex: 1; padding: 20px; overflow-y: auto;">
                    
                    <!-- Tab: Administración -->
                    <div id="admin-tab" class="file-tab-content active">
                        <h3>⚙️ Configuración Administrativa</h3>
                        
                        <!-- Información del Sistema -->
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">🔐 Acceso y Seguridad</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div class="info-card">
                                    <div class="info-label">👑 Rol del Usuario:</div>
                                    <div class="info-value" style="font-weight: bold; color: #2c5aa0;" id="admin-role">${user.role === 'admin' ? '👑 Administrador' : user.role === 'supervisor' ? '🔧 Supervisor' : user.role === 'medical' ? '🏥 Médico' : '👤 Empleado'}</div>
                                    <button class="btn btn-sm btn-outline-primary" onclick="editUserRole('${userId}', '${user.role}')">✏️ Cambiar Rol</button>
                                </div>
                                <div class="info-card">
                                    <div class="info-label">🔄 Estado del Usuario:</div>
                                    <div class="info-value" id="admin-status">
                                        <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? '✅ Activo' : '❌ Inactivo'}</span>
                                    </div>
                                    <button class="btn btn-sm btn-outline-secondary" onclick="toggleUserStatus('${userId}')">${user.isActive ? '🔒 Desactivar' : '✅ Activar'}</button>
                                </div>
                            </div>
                        </div>

                        <!-- GPS y Ubicación -->
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">🌍 Configuración GPS y Ubicación</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div class="info-card">
                                    <div class="info-label">📍 Cobertura GPS:</div>
                                    <div class="info-value" id="admin-gps">
                                        <span class="status-badge ${user.allowOutsideRadius ? 'warning' : 'success'}">${user.allowOutsideRadius ? '🌍 Sin restricción GPS' : '📍 Solo área autorizada'}</span>
                                    </div>
                                    <button class="btn btn-sm btn-outline-warning" onclick="toggleGPSRadius('${userId}')">${user.allowOutsideRadius ? '📍 Restringir GPS' : '🌍 Permitir fuera de área'}</button>
                                </div>
                                <div class="info-card">
                                    <div class="info-label">🏢 Sucursal por Defecto:</div>
                                    <div class="info-value" id="admin-branch">${user.defaultBranchId ? 'Asignada' : 'Sin asignar'}</div>
                                    <button class="btn btn-sm btn-outline-info" onclick="manageBranches('${userId}')">🏢 Gestionar Sucursales</button>
                                </div>
                            </div>
                        </div>

                        <!-- Consentimiento Biométrico -->
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">🔐 Consentimiento Biométrico (Análisis Emocional)</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div class="info-card">
                                    <div class="info-label">📋 Estado del Consentimiento:</div>
                                    <div class="info-value" id="consent-status">
                                        <span class="status-badge secondary">🔄 Cargando...</span>
                                    </div>
                                    <div id="consent-details" style="font-size: 0.85em; color: #666; margin-top: 10px;">
                                        <!-- Se llenará dinámicamente -->
                                    </div>
                                </div>
                                <div class="info-card">
                                    <div class="info-label">⚖️ Cumplimiento Legal:</div>
                                    <div style="font-size: 0.85em; line-height: 1.6; color: #666;">
                                        <div>✓ Ley 25.326 (Argentina)</div>
                                        <div>✓ GDPR (UE)</div>
                                        <div>✓ BIPA (Illinois)</div>
                                        <div style="margin-top: 8px; font-style: italic;">
                                            El consentimiento no es editable manualmente. El empleado debe otorgarlo mediante validación biométrica.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Departamento y Jerarquía -->
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">🏢 Departamento y Organización</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div class="info-card">
                                    <div class="info-label">🏢 Departamento:</div>
                                    <div class="info-value" id="admin-department">${user.departmentId ? 'Asignado' : 'Sin departamento'}</div>
                                    <button class="btn btn-sm btn-outline-success" onclick="changeDepartment('${userId}', '${user.departmentId || ''}')">🔄 Cambiar Departamento</button>
                                </div>
                                <div class="info-card">
                                    <div class="info-label">💼 Posición:</div>
                                    <div class="info-value" id="admin-position">${user.position || 'No especificada'}</div>
                                    <button class="btn btn-sm btn-outline-primary" onclick="editPosition('${userId}', '${user.position || ''}')">✏️ Editar Posición</button>
                                </div>
                            </div>
                        </div>

                        <!-- Acciones Administrativas -->
                        <div style="border: 1px solid #e74c3c; border-radius: 8px; padding: 15px; margin: 15px 0; background: #fdf2f2;">
                            <h4 style="margin: 0 0 15px 0; color: #c0392b;">⚡ Acciones Administrativas</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                <button class="btn btn-warning" onclick="resetPassword('${userId}', '${user.firstName} ${user.lastName}')">🔑 Resetear Contraseña</button>
                                <button class="btn btn-info" onclick="assignUserShifts('${userId}', '${user.firstName} ${user.lastName}')">🕐 Asignar Turnos</button>
                                <button class="btn btn-success" onclick="generateUserReport('${userId}')">📊 Generar Reporte</button>
                                <button class="btn btn-secondary" onclick="auditUserHistory('${userId}')">📋 Historial de Cambios</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Datos Personales -->
                    <div id="personal-tab" class="file-tab-content" style="display: none;">
                        <h3>👤 Información Personal</h3>
                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                            <div>
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                    <h4 style="color: #2c3e50; margin-top: 0;">Datos Básicos</h4>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                        <div><strong>Nombre Completo:</strong><br>${user.firstName} ${user.lastName}</div>
                                        <div><strong>DNI/ID:</strong><br>${user.employeeId}</div>
                                        <div><strong>Email:</strong><br>${user.email}</div>
                                        <div><strong>Teléfono:</strong><br>${user.phone || 'No especificado'}</div>
                                        <div><strong>Fecha Nacimiento:</strong><br>${user.birthDate ? new Date(user.birthDate).toLocaleDateString() : 'No especificada'}</div>
                                        <div><strong>Fecha Ingreso:</strong><br>${user.hireDate ? new Date(user.hireDate).toLocaleDateString() : 'No especificada'}</div>
                                    </div>
                                    <div style="margin-top: 10px;">
                                        <strong>Dirección:</strong><br>${user.address || 'No especificada'}
                                    </div>
                                </div>
                                
                                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #856404; margin: 0;">📞 Contactos</h4>
                                        <button class="btn btn-sm btn-warning" onclick="editContactInfo('${userId}')">✏️ Editar</button>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                        <div><strong>Emergencia:</strong><br>${user.emergencyContact || 'No especificado'}</div>
                                        <div><strong>Tel. Emergencia:</strong><br>${user.emergencyPhone || 'No especificado'}</div>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                        <div><strong>Contacto Adicional:</strong><br><span id="additional-contact">No especificado</span></div>
                                        <div><strong>Tel. Adicional:</strong><br><span id="additional-phone">No especificado</span></div>
                                    </div>
                                </div>
                                
                                <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #0c5460; margin: 0;">🏥 Obra Social / Prepaga</h4>
                                        <button class="btn btn-sm btn-info" onclick="editHealthInsurance('${userId}')">⚙️ Configurar</button>
                                    </div>
                                    <div id="health-insurance-info" style="font-size: 13px;">
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
                                            <div><strong>Cobertura:</strong> <span id="coverage-type">No asignada</span></div>
                                            <div><strong>Plan:</strong> <span id="insurance-plan">-</span></div>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
                                            <div><strong>Modalidad:</strong> <span id="coverage-mode">-</span></div>
                                            <div><strong>% Empresa:</strong> <span id="company-percentage">-</span></div>
                                        </div>
                                        <div><strong>Obra Social/Prepaga:</strong> <span id="insurance-provider">No especificada</span></div>
                                    </div>
                                </div>
                                
                                <div style="background: #e8f4f8; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                        <h4 style="color: #0c5460; margin: 0;">🎓 Formación Académica</h4>
                                        <button class="btn btn-sm btn-info" onclick="addEducation('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="education-list">
                                        <div style="background: rgba(255,255,255,0.7); padding: 10px; border-radius: 4px; margin-bottom: 8px;">
                                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                                                <div><strong>Primarios:</strong> <span id="primary-education">No especificado</span></div>
                                                <div><strong>Secundarios:</strong> <span id="secondary-education">No especificado</span></div>
                                                <div><strong>Terciarios:</strong> <span id="tertiary-education">No especificado</span></div>
                                                <div><strong>Universitarios:</strong> <span id="university-education">No especificado</span></div>
                                            </div>
                                            <div style="margin-top: 8px; font-size: 12px;">
                                                <div><strong>Títulos:</strong> <span id="titles-list">Ninguno registrado</span></div>
                                                <div><strong>Capacitaciones:</strong> <span id="training-list">Ninguna registrada</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Documentación Personal -->
                                <div style="background: #fff2e6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                        <h4 style="color: #d84315; margin: 0;">📄 Documentación Personal</h4>
                                        <button class="btn btn-sm btn-warning" onclick="managePersonalDocuments('${userId}')">⚙️ Gestionar</button>
                                    </div>
                                    <div id="personal-documents" style="font-size: 12px;">
                                        <!-- DNI/ID -->
                                        <div style="background: rgba(255,255,255,0.8); padding: 8px; border-radius: 4px; margin-bottom: 6px; display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center;">
                                            <span>🆔</span>
                                            <div><strong>DNI:</strong> <span id="dni-info">${user.employeeId} - Sin foto</span></div>
                                            <button class="btn btn-sm btn-outline-primary" onclick="uploadDNIPhotos('${userId}')">📷 Fotos</button>
                                        </div>
                                        
                                        <!-- Pasaporte -->
                                        <div style="background: rgba(255,255,255,0.8); padding: 8px; border-radius: 4px; margin-bottom: 6px; display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center;">
                                            <span>📘</span>
                                            <div><strong>Pasaporte:</strong> <span id="passport-info">No especificado</span></div>
                                            <button class="btn btn-sm btn-outline-success" onclick="managePassport('${userId}')">⚙️ Editar</button>
                                        </div>
                                        
                                        <!-- Visa de Trabajo -->
                                        <div style="background: rgba(255,255,255,0.8); padding: 8px; border-radius: 4px; margin-bottom: 6px; display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center;">
                                            <span>🌍</span>
                                            <div><strong>Visa de Trabajo:</strong> <span id="work-visa-info">No posee</span></div>
                                            <button class="btn btn-sm btn-outline-info" onclick="manageWorkVisa('${userId}')">+ Agregar</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Licencias de Conducción -->
                                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                        <h4 style="color: #2e7d32; margin: 0;">🚗 Licencias de Conducción</h4>
                                        <button class="btn btn-sm btn-success" onclick="manageDrivingLicenses('${userId}')">⚙️ Gestionar</button>
                                    </div>
                                    <div id="driving-licenses" style="font-size: 12px;">
                                        <!-- Licencia Nacional -->
                                        <div style="background: rgba(255,255,255,0.8); padding: 8px; border-radius: 4px; margin-bottom: 6px;">
                                            <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center;">
                                                <span>📄</span>
                                                <div><strong>Licencia Nacional:</strong> <span id="national-license-info">No posee</span></div>
                                                <button class="btn btn-sm btn-outline-success" onclick="editNationalLicense('${userId}')">✏️</button>
                                            </div>
                                        </div>
                                        
                                        <!-- Licencia Internacional -->
                                        <div style="background: rgba(255,255,255,0.8); padding: 8px; border-radius: 4px; margin-bottom: 6px;">
                                            <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center;">
                                                <span>🌏</span>
                                                <div><strong>Licencia Internacional:</strong> <span id="international-license-info">No posee</span></div>
                                                <button class="btn btn-sm btn-outline-info" onclick="editInternationalLicense('${userId}')">✏️</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Licencias Profesionales -->
                                <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                        <h4 style="color: #ef6c00; margin: 0;">🚛 Licencias Profesionales</h4>
                                        <button class="btn btn-sm btn-warning" onclick="manageProfessionalLicenses('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="professional-licenses" style="font-size: 12px;">
                                        <p style="text-align: center; color: #666; font-style: italic;">No posee licencias profesionales</p>
                                    </div>
                                    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(239,108,0,0.3);">
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; color: #666;">
                                            <div>📊 <strong>Estado Documentos:</strong> <span id="docs-status-summary">Pendiente verificación</span></div>
                                            <div>⚠️ <strong>Próximos Vencimientos:</strong> <span id="expiry-alerts-count">0 alertas</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="margin: 0 auto 15px; position: relative;">
                                        ${biometricPhotoHTML}
                                        <!-- Info de renovación de foto biométrica -->
                                        ${photoInfoHTML}
                                    </div>
                                    <h4>${user.firstName} ${user.lastName}</h4>
                                    <p><strong>${roleText}</strong></p>
                                    <div style="margin: 10px 0;">
                                        <span style="background: ${user.isActive ? '#28a745' : '#dc3545'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                                            ${user.isActive ? '🟢 ACTIVO' : '🔴 INACTIVO'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin-top: 15px;">
                                    <h5>⚙️ Configuraciones</h5>
                                    <div style="font-size: 14px;">
                                        <div style="margin: 8px 0;">
                                            <strong>GPS Override:</strong> ${user.allowOutsideRadius ? '✅ Permitido' : '❌ Restringido'}
                                        </div>
                                        <div style="margin: 8px 0;">
                                            <strong>Último Login:</strong><br>${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center;">
                                    <h5 style="margin: 0 0 10px 0;">⭐ Scoring del Empleado</h5>
                                    <div style="font-size: 32px; font-weight: bold; margin: 10px 0;" id="employee-score">
                                        --
                                    </div>
                                    <div style="font-size: 12px; opacity: 0.9;">
                                        Puntuación basada en: Educación, Experiencia,<br>Comportamiento, Médico, Capacitaciones y Disciplinario
                                    </div>
                                    <div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 4px; margin-top: 10px;">
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
                                            <div>📚 Educación: <span id="education-score">--</span></div>
                                            <div>💼 Experiencia: <span id="experience-score">--</span></div>
                                            <div>👤 Comportamiento: <span id="behavior-score">--</span></div>
                                            <div>🎓 Capacitaciones: <span id="training-score">--</span></div>
                                            <div>🏥 Médico: <span id="medical-score">--</span></div>
                                            <div>⚖️ Disciplinario: <span id="disciplinary-score">--</span></div>
                                        </div>
                                    </div>
                                    <button class="btn btn-sm" style="background: rgba(255,255,255,0.3); border: none; color: white; margin-top: 8px;" onclick="recalculateScore('${userId}')">
                                        🔄 Recalcular
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Antecedentes Laborales -->
                    <div id="work-tab" class="file-tab-content" style="display: none;">
                        <h3>💼 Antecedentes Laborales</h3>
                        <div id="work-history">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                <h4>Posición Actual</h4>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                                    <div><strong>Cargo:</strong><br>${user.position || 'No especificado'}</div>
                                    <div><strong>Departamento:</strong><br>${user.department?.name || 'No asignado'}</div>
                                    <div><strong>Salario:</strong><br>${user.salary ? '$' + user.salary.toLocaleString() : 'No especificado'}</div>
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                <div style="background: #f8d7da; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h5 style="color: #721c24; margin: 0;">⚖️ Juicios y Mediaciones</h5>
                                        <button class="btn btn-sm btn-danger" onclick="addLegalIssue('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="legal-issues-list">
                                        <p style="text-align: center; color: #666; font-style: italic; font-size: 12px;">Sin antecedentes judiciales</p>
                                    </div>
                                </div>
                                
                                <div style="background: #d1ecf1; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h5 style="color: #0c5460; margin: 0;">🏭 Afiliación Gremial</h5>
                                        <button class="btn btn-sm btn-info" onclick="addUnionAffiliation('${userId}')">+ Editar</button>
                                    </div>
                                    <div id="union-affiliation" style="font-size: 13px;">
                                        <div><strong>Gremio:</strong> <span id="union-name">No afiliado</span></div>
                                        <div style="margin-top: 5px;"><strong>Delegado:</strong> <span id="union-delegate">No</span></div>
                                        <div style="margin-top: 5px;"><strong>Período:</strong> <span id="delegate-period">-</span></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="background: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="margin: 0;">🎯 Tareas y Categorías Asignadas</h4>
                                    <button class="btn btn-sm btn-success" onclick="assignTasks('${userId}')">+ Asignar Tarea</button>
                                </div>
                                <div id="assigned-tasks-list">
                                    <p style="text-align: center; color: #666; font-style: italic;">No hay tareas asignadas</p>
                                </div>
                            </div>
                            
                            <div style="background: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="margin: 0;">📜 Historial de Posiciones</h4>
                                    <button class="btn btn-sm btn-primary" onclick="addWorkHistory('${userId}')">+ Agregar</button>
                                </div>
                                <div id="work-history-list">
                                    <p style="text-align: center; color: #666; font-style: italic;">No hay historial laboral registrado</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Grupo Familiar -->
                    <div id="family-tab" class="file-tab-content" style="display: none;">
                        <h3>👨‍👩‍👧‍👦 Grupo Familiar</h3>
                        <div id="family-info">
                            <!-- Estado Civil y Cónyuge -->
                            <div style="background: #fce4ec; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="color: #880e4f; margin: 0;">💑 Estado Civil y Cónyuge</h4>
                                    <button class="btn btn-sm btn-primary" onclick="editMaritalStatus('${userId}')">✏️ Editar</button>
                                </div>
                                <div id="marital-status-info">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                        <div>
                                            <strong>Estado Civil:</strong><br>
                                            <span id="marital-status" style="color: #880e4f; font-weight: bold;">No especificado</span>
                                        </div>
                                        <div>
                                            <strong>Fecha Matrimonio:</strong><br>
                                            <span id="marriage-date">-</span>
                                        </div>
                                        <div>
                                            <strong>A Cargo:</strong><br>
                                            <span id="spouse-dependent">-</span>
                                        </div>
                                    </div>
                                    <div id="spouse-details" style="background: rgba(255,255,255,0.6); padding: 10px; border-radius: 6px; display: none;">
                                        <h5 style="color: #880e4f; margin: 0 0 8px 0;">Datos del Cónyuge</h5>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 13px;">
                                            <div><strong>Nombre:</strong><br><span id="spouse-name">-</span></div>
                                            <div><strong>Apellido:</strong><br><span id="spouse-surname">-</span></div>
                                            <div><strong>DNI:</strong><br><span id="spouse-dni">-</span></div>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; margin-top: 8px;">
                                            <div><strong>Fecha Nacimiento:</strong><br><span id="spouse-birthdate">-</span></div>
                                            <div><strong>Cobertura Médica:</strong><br><span id="spouse-coverage">-</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Hijos -->
                            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="color: #0d47a1; margin: 0;">👶 Hijos</h4>
                                    <button class="btn btn-sm btn-info" onclick="addChild('${userId}')">+ Agregar Hijo</button>
                                </div>
                                <div id="children-list">
                                    <p style="text-align: center; color: #666; font-style: italic; font-size: 12px;">No hay hijos registrados</p>
                                </div>
                            </div>
                            
                            <!-- Otros Familiares -->
                            <div style="background: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="margin: 0;">👥 Otros Miembros del Grupo Familiar</h4>
                                    <button class="btn btn-sm btn-success" onclick="addFamilyMember('${userId}')">+ Agregar Familiar</button>
                                </div>
                                <div id="family-members-list">
                                    <p style="text-align: center; color: #666; font-style: italic;">No hay otros familiares registrados</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Antecedentes Médicos -->
                    <div id="medical-tab" class="file-tab-content" style="display: none;">
                        <h3>🏥 Historia Clínica y Antecedentes Médicos</h3>
                        <div id="medical-info">
                            
                            <!-- Primera fila: Médico de cabecera y Emergencias -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #155724; margin: 0;">👨‍⚕️ Médico de Cabecera</h4>
                                        <button class="btn btn-sm btn-success" onclick="editPrimaryCarePhysician('${userId}')">✏️ Editar</button>
                                    </div>
                                    <div id="primary-care-info" style="font-size: 13px;">
                                        <div style="margin-bottom: 8px;"><strong>Dr./Dra.:</strong> <span id="doctor-name">No especificado</span></div>
                                        <div style="margin-bottom: 8px;"><strong>Especialidad:</strong> <span id="doctor-specialty">-</span></div>
                                        <div style="margin-bottom: 8px;"><strong>Teléfono:</strong> <span id="doctor-phone">-</span></div>
                                        <div style="margin-bottom: 8px;"><strong>Dirección:</strong> <span id="doctor-address">-</span></div>
                                        <div><strong>Obra Social:</strong> <span id="doctor-insurance">-</span></div>
                                    </div>
                                </div>
                                
                                <div style="background: #f8d7da; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #721c24; margin: 0;">🚨 Contacto de Emergencia Médica</h4>
                                        <button class="btn btn-sm btn-danger" onclick="editMedicalEmergencyContact('${userId}')">✏️ Editar</button>
                                    </div>
                                    <div id="medical-emergency-info" style="font-size: 13px;">
                                        <div style="margin-bottom: 8px;"><strong>Contactar a:</strong> <span id="emergency-medical-contact">No especificado</span></div>
                                        <div style="margin-bottom: 8px;"><strong>Teléfono:</strong> <span id="emergency-medical-phone">-</span></div>
                                        <div style="margin-bottom: 8px;"><strong>Relación:</strong> <span id="emergency-medical-relation">-</span></div>
                                        <div style="background: #f5c6cb; padding: 8px; border-radius: 4px; margin-top: 10px;">
                                            <div style="font-size: 12px; font-weight: bold;">⚠️ Instrucciones de Emergencia:</div>
                                            <div id="emergency-instructions" style="font-size: 11px; margin-top: 4px;">Sin instrucciones específicas</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Segunda fila: Condiciones crónicas y Medicación -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #856404; margin: 0;">🏥 Enfermedades/Discapacidades Crónicas</h4>
                                        <button class="btn btn-sm btn-warning" onclick="addChronicCondition('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="chronic-conditions-list">
                                        <p style="font-style: italic; color: #666; font-size: 12px;">No hay condiciones crónicas registradas</p>
                                    </div>
                                </div>
                                
                                <div style="background: #cce5ff; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #004085; margin: 0;">💊 Medicación Frecuente</h4>
                                        <button class="btn btn-sm btn-info" onclick="addMedication('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="medications-list">
                                        <p style="font-style: italic; color: #666; font-size: 12px;">No hay medicación registrada</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Tercera fila: Alergias y Restricciones -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div style="background: #ffebee; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #c62828; margin: 0;">🚫 Alergias</h4>
                                        <button class="btn btn-sm btn-danger" onclick="addAllergy('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="allergies-list">
                                        <p style="font-style: italic; color: #666; font-size: 12px;">Sin alergias conocidas</p>
                                    </div>
                                </div>
                                
                                <div style="background: #e1f5fe; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #0277bd; margin: 0;">🚷 Restricciones de Actividad</h4>
                                        <button class="btn btn-sm btn-info" onclick="addActivityRestriction('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="activity-restrictions-list">
                                        <p style="font-style: italic; color: #666; font-size: 12px;">Sin restricciones de actividad</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Cuarta fila: Restricciones laborales y Estado mental -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div style="background: #ede7f6; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #512da8; margin: 0;">⚠️ Restricciones Laborales</h4>
                                        <button class="btn btn-sm btn-primary" onclick="addWorkRestriction('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="work-restrictions-info" style="font-size: 12px;">
                                        <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                                            <div><strong>🟢 Puede Realizar:</strong></div>
                                            <div id="allowed-tasks" style="color: #2e7d32; font-size: 11px;">Todas las tareas estándar</div>
                                        </div>
                                        <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                                            <div><strong>🔴 NO Puede Realizar:</strong></div>
                                            <div id="restricted-tasks" style="color: #d32f2f; font-size: 11px;">Sin restricciones</div>
                                        </div>
                                        <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 4px;">
                                            <div><strong>📋 Aprobación Médica:</strong></div>
                                            <div id="medical-approval-status" style="font-size: 11px;">Pendiente de evaluación</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="background: #f3e5f5; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #7b1fa2; margin: 0;">🧠 Salud Mental</h4>
                                        <button class="btn btn-sm btn-secondary" onclick="editMentalHealth('${userId}')">✏️ Editar</button>
                                    </div>
                                    <div id="mental-health-info" style="font-size: 13px;">
                                        <div style="margin-bottom: 8px;"><strong>Depresión:</strong> <span id="depression-status">No registrada</span></div>
                                        <div style="margin-bottom: 8px;"><strong>Ansiedad:</strong> <span id="anxiety-status">No registrada</span></div>
                                        <div style="margin-bottom: 8px;"><strong>Tratamiento:</strong> <span id="mental-treatment">-</span></div>
                                        <div><strong>Observaciones:</strong> <span id="mental-health-notes">-</span></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Quinta fila: Vacunación y Exámenes -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #2e7d32; margin: 0;">💉 Calendario de Vacunación</h4>
                                        <button class="btn btn-sm btn-success" onclick="addVaccination('${userId}')">+ Agregar Vacuna</button>
                                    </div>
                                    <div id="vaccination-calendar">
                                        <p style="font-style: italic; color: #666; font-size: 12px;">No hay vacunas registradas</p>
                                    </div>
                                </div>
                                
                                <div style="background: #d4edda; padding: 15px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #155724; margin: 0;">✅ Exámenes y Estudios</h4>
                                        <button class="btn btn-sm btn-success" onclick="addMedicalExam('${userId}')">+ Agregar Examen</button>
                                    </div>
                                    <div id="medical-exams-list">
                                        <p style="font-style: italic; color: #666; font-size: 12px;">No hay exámenes registrados</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Sexta fila: Historia clínica y Documentos -->
                            <div style="background: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="margin: 0;">📁 Historia Clínica Digital</h4>
                                    <div>
                                        <button class="btn btn-sm btn-primary" onclick="uploadMedicalDocument('${userId}')">📤 Subir Documento</button>
                                        <button class="btn btn-sm btn-info" onclick="addMedicalEvent('${userId}')">+ Evento Médico</button>
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                                    <div>
                                        <h5 style="color: #495057; margin-bottom: 10px;">📋 Historial de Eventos</h5>
                                        <div id="medical-events-list">
                                            <p style="text-align: center; color: #666; font-style: italic; font-size: 12px;">No hay eventos médicos registrados</p>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 style="color: #495057; margin-bottom: 10px;">📎 Documentos Médicos</h5>
                                        <div id="medical-documents-list" style="font-size: 12px;">
                                            <div style="background: #f8f9fa; padding: 8px; border-radius: 4px; margin-bottom: 5px; text-align: center; color: #666;">Sin documentos</div>
                                        </div>
                                        <div style="margin-top: 10px; font-size: 11px; color: #666;">
                                            <div><strong>✅ Historia clínica auditada:</strong> <span id="clinical-history-audited">No</span></div>
                                            <div><strong>👨‍⚕️ Médico empresa:</strong> <span id="company-doctor-approval">Pendiente</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Asistencias/Permisos -->
                    <div id="attendance-tab" class="file-tab-content" style="display: none;">
                        <h3>📅 Asistencias, Inasistencias y Permisos</h3>
                        <div id="attendance-info">
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                                <div style="background: #d4edda; padding: 15px; border-radius: 8px; text-align: center;">
                                    <h2 style="margin: 0; color: #155724;">--</h2>
                                    <p style="margin: 5px 0 0; color: #155724;">Días Trabajados</p>
                                </div>
                                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; text-align: center;">
                                    <h2 style="margin: 0; color: #856404;">--</h2>
                                    <p style="margin: 5px 0 0; color: #856404;">Ausencias</p>
                                </div>
                                <div style="background: #cce5ff; padding: 15px; border-radius: 8px; text-align: center;">
                                    <h2 style="margin: 0; color: #004085;">--</h2>
                                    <p style="margin: 5px 0 0; color: #004085;">Permisos</p>
                                </div>
                            </div>
                            
                            <div style="background: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="margin: 0;">📊 Registro de Asistencias</h4>
                                    <div>
                                        <button class="btn btn-sm btn-info" onclick="loadAttendanceHistory('${userId}')">🔄 Actualizar</button>
                                        <button class="btn btn-sm btn-success" onclick="addPermissionRequest('${userId}')">+ Permiso</button>
                                    </div>
                                </div>
                                <div id="attendance-history">
                                    <p style="text-align: center; color: #666; font-style: italic;">Cargando historial de asistencias...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Acciones Disciplinarias -->
                    <div id="disciplinary-tab" class="file-tab-content" style="display: none;">
                        <h3>⚖️ Acciones Disciplinarias y Suspensiones</h3>
                        <div id="disciplinary-info">
                            <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <h4 style="color: #721c24; margin-top: 0;">📊 Resumen Disciplinario</h4>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; text-align: center;">
                                    <div>
                                        <strong style="display: block; font-size: 24px; color: #ffc107;">--</strong>
                                        <span>Amonestaciones</span>
                                    </div>
                                    <div>
                                        <strong style="display: block; font-size: 24px; color: #fd7e14;">--</strong>
                                        <span>Apercibimientos</span>
                                    </div>
                                    <div>
                                        <strong style="display: block; font-size: 24px; color: #dc3545;">--</strong>
                                        <span>Suspensiones</span>
                                    </div>
                                    <div>
                                        <strong style="display: block; font-size: 24px; color: #6f42c1;">--</strong>
                                        <span>Total Días</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="background: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="margin: 0;">📋 Historial Disciplinario</h4>
                                    <button class="btn btn-sm btn-danger" onclick="addDisciplinaryAction('${userId}')">+ Acción Disciplinaria</button>
                                </div>
                                <div id="disciplinary-history">
                                    <p style="text-align: center; color: #666; font-style: italic;">No hay acciones disciplinarias registradas</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Tab: Configuración de Tareas -->
                    <div id="tasks-tab" class="file-tab-content" style="display: none;">
                        <h3>🎯 Configuración de Tareas y Categorías</h3>
                        <div id="tasks-config">
                            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <h4 style="color: #155724; margin-top: 0;">📊 Tareas Disponibles en la Empresa</h4>
                                <div style="display: grid; grid-template-columns: 1fr auto; gap: 15px; align-items: center;">
                                    <div style="background: white; padding: 12px; border-radius: 6px;">
                                        <div id="company-tasks-summary" style="font-size: 14px;">
                                            <div><strong>Total de Tareas Configuradas:</strong> <span id="total-tasks-count">--</span></div>
                                            <div><strong>Categorías Activas:</strong> <span id="active-categories-count">--</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        <button class="btn btn-success" onclick="manageCompanyTasks()" style="margin-bottom: 5px;">
                                            ⚙️ Gestionar Tareas
                                        </button>
                                        <button class="btn btn-info" onclick="createNewTask()" style="display: block;">
                                            + Nueva Tarea
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div style="background: #fff3cd; padding: 15px; border-radius: 8px;">
                                    <h5 style="color: #856404; margin-top: 0;">🏷️ Tareas Asignadas al Empleado</h5>
                                    <div id="employee-assigned-tasks">
                                        <p style="text-align: center; color: #666; font-style: italic; font-size: 12px;">
                                            No tiene tareas asignadas
                                        </p>
                                    </div>
                                    <div style="text-align: center; margin-top: 15px;">
                                        <button class="btn btn-sm btn-warning" onclick="assignEmployeeTasks('${userId}')">
                                            🎯 Asignar Tareas
                                        </button>
                                    </div>
                                </div>
                                
                                <div style="background: #d4edda; padding: 15px; border-radius: 8px;">
                                    <h5 style="color: #155724; margin-top: 0;">💰 Información Salarial por Tarea</h5>
                                    <div id="salary-by-task">
                                        <div style="background: white; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
                                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                                                <div><strong>Salario Base:</strong></div>
                                                <div>${user.salary ? '$' + user.salary.toLocaleString() : 'No especificado'}</div>
                                                <div><strong>Modalidad:</strong></div>
                                                <div id="salary-modality">Por definir</div>
                                                <div><strong>Jornada:</strong></div>
                                                <div id="work-schedule">Por definir</div>
                                            </div>
                                        </div>
                                        <button class="btn btn-sm btn-success" onclick="configureSalaryDetails('${userId}')">
                                            💰 Configurar Detalles
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="background: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="margin: 0;">📋 Historial de Asignaciones de Tareas</h4>
                                    <button class="btn btn-sm btn-info" onclick="viewTaskHistory('${userId}')">📊 Ver Historial</button>
                                </div>
                                <div id="task-assignment-history">
                                    <p style="text-align: center; color: #666; font-style: italic;">
                                        No hay historial de asignaciones de tareas
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: Registro Biométrico -->
                    <div id="biometric-tab" class="file-tab-content" style="display: none;">
                        <h3>📸 Registro Biométrico de Empleado</h3>
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">🔐 Captura de Template Biométrico</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                                <div>
                                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                        <h5 style="margin: 0 0 10px 0; color: #1976d2;">📋 Información</h5>
                                        <p style="margin: 0; font-size: 14px; line-height: 1.6;">
                                            El registro biométrico captura el template facial del empleado para permitir el reconocimiento automático en el sistema de asistencia.
                                        </p>
                                        <ul style="font-size: 14px; margin: 10px 0 0 20px; line-height: 1.8;">
                                            <li>Captura automática con guía visual</li>
                                            <li>Validación con Azure Face API</li>
                                            <li>Almacenamiento seguro encriptado (AES-256)</li>
                                            <li>Cumple Ley 25.326 y GDPR</li>
                                        </ul>
                                    </div>
                                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                                        <h5 style="margin: 0 0 10px 0; color: #856404;">⚠️ Importante</h5>
                                        <p style="margin: 0; font-size: 13px;">
                                            • Requiere buena iluminación<br>
                                            • Mirar directamente a la cámara<br>
                                            • Rostro descubierto (sin lentes/gorra)<br>
                                            • La captura es automática
                                        </p>
                                    </div>
                                </div>
                                <div style="text-align: center;">
                                    <div id="biometric-photo-display" style="margin-bottom: 20px;">
                                        ${biometricPhotoHTML}
                                    </div>
                                    <button class="btn btn-primary btn-lg" onclick="startBiometricCapture('${userId}', '${user.employeeId}')" style="width: 100%; padding: 15px; font-size: 16px;">
                                        📷 Capturar Foto Biométrica
                                    </button>
                                    <p style="margin-top: 15px; font-size: 12px; color: #666;">
                                        Al hacer clic se abrirá la interfaz de captura automática con feedback en tiempo real
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">📊 Estado del Registro Biométrico</h4>
                            <div id="biometric-status-container" style="padding: 15px; background: #f8f9fa; border-radius: 6px;">
                                <p style="text-align: center; color: #666;">Cargando estado...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer con Acciones -->
                <div style="background: #f8f9fa; padding: 15px 20px; border-radius: 0 0 12px 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 12px; color: #666;">
                        Última actualización: ${new Date().toLocaleString()}
                    </div>
                    <div>
                        <button class="btn btn-secondary" onclick="closeEmployeeFile()">❌ Cerrar Expediente</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Cargar datos iniciales de cada sección
        loadEmployeeFileData(userId);
        
    } catch (error) {
        console.error('❌ [USERS] Error cargando expediente:', error);
        showUserMessage('❌ Error cargando expediente del empleado', 'error');
    }
}

// Close view modal
function closeViewModal() {
    const modal = document.getElementById('viewUserModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Reset user password
async function resetPassword(userId, userName) {
    const newPassword = prompt(`🔑 Ingrese nueva contraseña para ${userName}:`, '123456');
    
    if (!newPassword || newPassword.trim() === '') {
        return;
    }
    
    if (newPassword.length < 6) {
        showUserMessage('⚠️ La contraseña debe tener al menos 6 caracteres', 'warning');
        return;
    }
    
    if (!confirm(`¿Está seguro que desea cambiar la contraseña de ${userName}?`)) {
        return;
    }
    
    console.log('🔑 [USERS] Reseteando contraseña para usuario:', userId);
    
    try {
        // Get auth token, if none exists, login first
        let token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            console.log('🔑 No hay token, ejecutando auto-login...');
            await initializeAdmin();
            token = localStorage.getItem('authToken');
            if (!token) {
                showUserMessage('⚠️ No se pudo obtener token de autenticación', 'error');
                return;
            }
        }
        
        // Call reset password API
        const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}/reset-password`);
        console.log('🔑 [DEBUG] Enviando request a:', apiUrl);
        console.log('🔑 [DEBUG] Token:', token ? 'Token presente (' + token.substring(0, 20) + '...)' : 'NO TOKEN');
        console.log('🔑 [DEBUG] UserId:', userId);
        console.log('🔑 [DEBUG] Nueva password:', newPassword);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                newPassword: newPassword
            })
        });
        
        console.log('🔑 [DEBUG] Response status:', response.status);
        console.log('🔑 [DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const result = await response.json();
            console.log('🔑 [DEBUG] Response body success:', result);
            showUserMessage(`✅ Contraseña cambiada exitosamente para ${userName}`, 'success');
            console.log('✅ Contraseña cambiada:', result);
        } else if (response.status === 401) {
            console.log('🔑 Token expirado, renovando y reintentando...');
            localStorage.removeItem('authToken');
            await initializeAdmin();
            const newToken = localStorage.getItem('authToken');
            if (newToken) {
                const retryResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${newToken}`
                    },
                    body: JSON.stringify({ newPassword: newPassword })
                });
                if (retryResponse.ok) {
                    const result = await retryResponse.json();
                    showUserMessage(`✅ Contraseña cambiada exitosamente para ${userName}`, 'success');
                    console.log('✅ Contraseña cambiada después de renovar token:', result);
                } else {
                    const error = await retryResponse.json();
                    showUserMessage(`❌ Error: ${error.error || 'Error desconocido'}`, 'error');
                }
            } else {
                showUserMessage('❌ Error de autenticación', 'error');
            }
        } else {
            let errorData;
            try {
                errorData = await response.json();
                console.log('🔑 [DEBUG] Response body error:', errorData);
            } catch (e) {
                const errorText = await response.text();
                console.log('🔑 [DEBUG] Response text error:', errorText);
                errorData = { error: `HTTP ${response.status}: ${errorText}` };
            }
            showUserMessage(`❌ Error: ${errorData.error || 'Error desconocido'}`, 'error');
            console.error('❌ Error reseteando contraseña:', errorData);
        }
        
    } catch (error) {
        console.error('❌ [USERS] Error reseteando contraseña:', error);
        showUserMessage('❌ Error de conexión al cambiar contraseña', 'error');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('¿Está seguro que desea desactivar este usuario?\n\nEsto no eliminará al usuario permanentemente, solo lo desactivará.')) {
        return;
    }
    
    console.log('🗑️ [USERS] Desactivando usuario:', userId);
    
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showUserMessage('⚠️ No hay token de autenticación', 'error');
            return;
        }
        
        // Call delete API (which does soft delete - deactivation)
        const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`);
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showUserMessage('✅ Usuario desactivado exitosamente', 'success');
            // Refresh the users list
            setTimeout(loadUsers, 500);
        } else {
            const error = await response.json();
            showUserMessage(`❌ Error: ${error.error || 'Error desconocido'}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ [USERS] Error desactivando usuario:', error);
        showUserMessage('❌ Error de conexión', 'error');
    }
}

// Refresh users list
function refreshUsers() {
    console.log('🔄 [USERS] Actualizando lista...');
    loadUsers();
}

// Export users to CSV
function exportUsers() {
    console.log('📤 [USERS] Exportando usuarios...');
    
    // Create CSV content
    const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Nombre,Apellido,Email,Legajo,Rol,Departamento,Estado,Ultimo Acceso\n";
    
    // Get current users data (you would fetch this from the loaded users)
    const users = window.currentUsersData || [];
    
    if (users.length === 0) {
        showUserMessage('⚠️ Primero carga la lista de usuarios', 'warning');
        return;
    }
    
    const csvRows = users.map(user => {
        return [
            user.user_id,
            user.firstName || '',
            user.lastName || '',
            user.email,
            user.employeeId || user.legajo,
            user.role,
            user.department,
            user.status,
            user.lastAccess
        ].join(',');
    }).join('\n');
    
    const finalCsv = csvContent + csvRows;
    
    // Create download link
    const encodedUri = encodeURI(finalCsv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showUserMessage('📤 Archivo CSV descargado', 'success');
}

// Import users from CSV
function importUsers() {
    console.log('📥 [USERS] Importando usuarios...');
    showUserMessage('📥 Función importar en desarrollo', 'info');
}

// Show user message utility
function showUserMessage(message, type) {
    let messageElement = document.getElementById('userMessage');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'userMessage';
        messageElement.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    switch (type) {
        case 'success': messageElement.style.backgroundColor = '#4CAF50'; break;
        case 'error': messageElement.style.backgroundColor = '#f44336'; break;
        case 'warning': messageElement.style.backgroundColor = '#ff9800'; break;
        case 'info': messageElement.style.backgroundColor = '#2196F3'; break;
        default: messageElement.style.backgroundColor = '#666';
    }
    
    setTimeout(() => {
        if (messageElement && messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 3000);
}

// Auto-login admin for testing - USE REAL CREDENTIALS
async function initializeAdmin() {
    try {
        // Check if we already have a valid token
        const existingToken = localStorage.getItem('authToken');
        if (existingToken) {
            console.log('🔑 Token existente encontrado');
            return;
        }
        
        // Auto-login with admin credentials (USING REAL DATABASE ADMIN)
        console.log('🔐 Iniciando sesión como administrador...');
        
        const loginData = {
            identifier: 'admin@empresa.com',
            password: 'admin123'
        };
        
        const apiUrl = window.progressiveAdmin ? window.progressiveAdmin.getApiUrl('/api/v1/auth/login') : '/api/v1/auth/login';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        if (response.ok) {
            const result = await response.json();
            localStorage.setItem('authToken', result.token);
            console.log('✅ Token de administrador guardado para:', result.user?.firstName || 'admin');
            showUserMessage('✅ Sesión iniciada como ' + (result.user?.firstName || 'admin'), 'success');
        } else {
            const errorData = await response.json();
            console.log('⚠️ No se pudo obtener token de admin:', errorData.error);
            showUserMessage('⚠️ Error: ' + (errorData.error || 'Credenciales incorrectas'), 'warning');
        }
        
    } catch (error) {
        console.log('⚠️ Error en auto-login admin:', error);
        showUserMessage('⚠️ Error de conexión', 'error');
    }
}

// Initialize admin token on module load
setTimeout(initializeAdmin, 1000);

// Show bulk actions dialog
function showBulkActions() {
    console.log('⚡ [USERS] Mostrando acciones masivas...');
    
    const modal = document.createElement('div');
    modal.id = 'bulkActionsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%;">
            <h3>⚡ Acciones Masivas</h3>
            <div style="margin: 20px 0;">
                <h4>🔐 Gestión de Contraseñas</h4>
                <div style="margin: 10px 0;">
                    <button class="btn btn-warning" onclick="resetAllPasswords()" style="margin: 5px;">
                        🔑 Resetear todas las contraseñas a "123456"
                    </button>
                </div>
                <div style="margin: 10px 0;">
                    <button class="btn btn-info" onclick="generateRandomPasswords()" style="margin: 5px;">
                        🎲 Generar contraseñas aleatorias
                    </button>
                </div>
                
                <h4 style="margin-top: 20px;">👥 Gestión de Estados</h4>
                <div style="margin: 10px 0;">
                    <button class="btn btn-success" onclick="activateAllUsers()" style="margin: 5px;">
                        ✅ Activar todos los usuarios
                    </button>
                    <button class="btn btn-danger" onclick="deactivateInactiveUsers()" style="margin: 5px;">
                        ❌ Desactivar usuarios inactivos
                    </button>
                </div>
                
                <h4 style="margin-top: 20px;">📊 Informes</h4>
                <div style="margin: 10px 0;">
                    <button class="btn btn-secondary" onclick="generateUserReport()" style="margin: 5px;">
                        📋 Generar reporte completo
                    </button>
                    <button class="btn btn-secondary" onclick="checkDuplicateEmails()" style="margin: 5px;">
                        🔍 Verificar emails duplicados
                    </button>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeBulkModal()">❌ Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Close bulk actions modal
function closeBulkModal() {
    const modal = document.getElementById('bulkActionsModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Reset all passwords to 123456
async function resetAllPasswords() {
    if (!confirm('⚠️ ¿Está seguro que desea resetear TODAS las contraseñas a "123456"?\n\nEsta acción afectará a todos los usuarios del sistema.')) {
        return;
    }
    
    showUserMessage('🔄 Iniciando reset masivo de contraseñas...', 'info');
    const users = window.currentUsersData || [];
    let successful = 0;
    let failed = 0;
    
    for (const user of users) {
        try {
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
            
            const token = localStorage.getItem('authToken');
            const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${user.user_id}/reset-password`);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword: '123456' })
            });
            
            if (response.ok) {
                successful++;
                console.log(`✅ Password reset para ${user.name}`);
            } else {
                failed++;
                console.log(`❌ Error reset password para ${user.name}`);
            }
        } catch (error) {
            failed++;
            console.error(`❌ Error con ${user.name}:`, error);
        }
    }
    
    showUserMessage(`🎉 Reset masivo completado: ${successful} exitosos, ${failed} fallidos`, successful > 0 ? 'success' : 'error');
    closeBulkModal();
}

// Generate random passwords
async function generateRandomPasswords() {
    if (!confirm('⚠️ ¿Está seguro que desea generar contraseñas aleatorias para TODOS los usuarios?\n\nEsta acción afectará a todos los usuarios del sistema y no es reversible.')) {
        return;
    }
    
    showUserMessage('🎲 Generando contraseñas aleatorias...', 'info');
    const users = window.currentUsersData || [];
    let successful = 0;
    let failed = 0;
    let reportText = 'REPORTE DE CONTRASEÑAS ALEATORIAS GENERADAS:\n\n';
    
    function generateSecurePassword() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    
    for (const user of users) {
        try {
            const newPassword = generateSecurePassword();
            await new Promise(resolve => setTimeout(resolve, 300)); // Small delay
            
            const token = localStorage.getItem('authToken');
            const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${user.user_id}/reset-password`);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });
            
            if (response.ok) {
                successful++;
                reportText += `✅ ${user.name} (${user.email}): ${newPassword}\n`;
            } else {
                failed++;
                reportText += `❌ ${user.name} (${user.email}): FALLÓ\n`;
            }
        } catch (error) {
            failed++;
            reportText += `❌ ${user.name} (${user.email}): ERROR\n`;
        }
    }
    
    // Show results and download report
    showUserMessage(`🎲 Contraseñas generadas: ${successful} exitosas, ${failed} fallidas`, successful > 0 ? 'success' : 'error');
    
    if (successful > 0) {
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contraseñas_aleatorias_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    closeBulkModal();
}

// Activate all users
async function activateAllUsers() {
    if (!confirm('⚠️ ¿Está seguro que desea ACTIVAR todos los usuarios del sistema?')) {
        return;
    }
    
    showUserMessage('✅ Activando todos los usuarios...', 'info');
    const users = window.currentUsersData || [];
    let successful = 0;
    let failed = 0;
    
    for (const user of users) {
        if (!user.isActive) { // Solo usuarios inactivos
            try {
                await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
                
                const token = localStorage.getItem('authToken');
                const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${user.user_id}`);
                
                const response = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ isActive: true })
                });
                
                if (response.ok) {
                    successful++;
                } else {
                    failed++;
                }
            } catch (error) {
                failed++;
            }
        }
    }
    
    showUserMessage(`✅ Activación completada: ${successful} usuarios activados, ${failed} fallos`, successful > 0 ? 'success' : 'warning');
    setTimeout(() => loadUsers(), 1000); // Reload users
    closeBulkModal();
}

// Deactivate inactive users (users without recent activity)
async function deactivateInactiveUsers() {
    if (!confirm('⚠️ ¿Está seguro que desea DESACTIVAR usuarios inactivos?\n\nEsto desactivará usuarios que no han accedido recientemente.')) {
        return;
    }
    
    showUserMessage('❌ Desactivando usuarios inactivos...', 'info');
    const users = window.currentUsersData || [];
    let successful = 0;
    let failed = 0;
    
    // Logic: deactivate users without recent login (example: older than 30 days or never logged in)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const user of users) {
        if (user.isActive && user.role !== 'admin') { // Don't deactivate admins
            const lastLoginDate = user.lastLogin ? new Date(user.lastLogin) : null;
            const shouldDeactivate = !lastLoginDate || lastLoginDate < thirtyDaysAgo;
            
            if (shouldDeactivate) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
                    
                    const token = localStorage.getItem('authToken');
                    const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${user.user_id}`);
                    
                    const response = await fetch(apiUrl, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ isActive: false })
                    });
                    
                    if (response.ok) {
                        successful++;
                    } else {
                        failed++;
                    }
                } catch (error) {
                    failed++;
                }
            }
        }
    }
    
    showUserMessage(`❌ Desactivación completada: ${successful} usuarios desactivados, ${failed} fallos`, successful > 0 ? 'success' : 'warning');
    setTimeout(() => loadUsers(), 1000); // Reload users
    closeBulkModal();
}

// Generate user report (placeholder)
function generateUserReport() {
    const users = window.currentUsersData || [];
    if (users.length === 0) {
        showUserMessage('⚠️ Primero carga la lista de usuarios', 'warning');
        return;
    }
    
    const report = `
📊 REPORTE DE USUARIOS
======================
Total de usuarios: ${users.length}
Usuarios activos: ${users.filter(u => u.status === 'Activo').length}
Administradores: ${users.filter(u => u.role === 'Administrador').length}
Empleados: ${users.filter(u => u.role === 'Empleado').length}

📧 Emails registrados: ${users.map(u => u.email).join(', ')}
    `;
    
    console.log(report);
    showUserMessage('📋 Reporte generado - Ver consola del navegador', 'success');
}

// Check duplicate emails
function checkDuplicateEmails() {
    const users = window.currentUsersData || [];
    if (users.length === 0) {
        showUserMessage('⚠️ Primero carga la lista de usuarios', 'warning');
        return;
    }
    
    const emails = users.map(u => u.email.toLowerCase());
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    
    if (duplicates.length > 0) {
        showUserMessage(`⚠️ Encontrados ${duplicates.length} emails duplicados`, 'warning');
        console.log('📧 Emails duplicados:', [...new Set(duplicates)]);
    } else {
        showUserMessage('✅ No se encontraron emails duplicados', 'success');
    }
}

// Exportar funciones de scoring para otros módulos
window.updateEmployeeScoreForTraining = updateEmployeeScoreForTraining;
window.calculateTrainingScore = calculateTrainingScore;
window.calculateEmployeeScore = calculateEmployeeScore;

console.log('✅ [USERS] Módulo users configurado v6.6 con acciones masivas - Scoring de capacitaciones integrado');

// Dynamic departments loading functions
async function loadDepartmentsForUsers() {
    try {
        // Get auth token, if none exists, login first
        let token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            console.log('🔑 No hay token, ejecutando auto-login...');
            await initializeAdmin();
            token = localStorage.getItem('authToken');
        }
        
        const apiUrl = window.progressiveAdmin.getApiUrl('/api/v1/departments');
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.departments) {
                return data.departments;
            }
        } else if (response.status === 401) {
            // Token expired, try to refresh
            console.log('🔑 Token expirado, renovando...');
            localStorage.removeItem('authToken');
            await initializeAdmin();
            const newToken = localStorage.getItem('authToken');
            if (newToken) {
                const retryResponse = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (retryResponse.ok) {
                    const data = await retryResponse.json();
                    if (data.success && data.departments) {
                        return data.departments;
                    }
                }
            }
        }
        
        console.warn('No se pudieron cargar los departamentos, usando predeterminados');
        return getDefaultDepartments();
        
    } catch (error) {
        console.warn('Error cargando departamentos:', error);
        return getDefaultDepartments();
    }
}

function getDefaultDepartments() {
    return [
        { id: 'default_it', name: 'IT' },
        { id: 'default_rrhh', name: 'RRHH' },
        { id: 'default_ventas', name: 'Ventas' },
        { id: 'default_contabilidad', name: 'Contabilidad' },
        { id: 'default_admin', name: 'Administración' },
        { id: 'default_produccion', name: 'Producción' },
        { id: 'default_marketing', name: 'Marketing' }
    ];
}

async function populateDepartmentSelect(selectId, selectedValue = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Mostrar estado de carga
    select.innerHTML = '<option value="">Cargando departamentos...</option>';
    
    try {
        const departments = await loadDepartmentsForUsers();
        
        // Limpiar select
        select.innerHTML = '<option value="">Selecciona un departamento...</option>';
        
        // Agregar departamentos
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id; // Usar id para PostgreSQL
            option.textContent = dept.name;
            if (dept.id == selectedValue || dept.name === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        console.log(`✅ Se cargaron ${departments.length} departamentos en select ${selectId}`);
        
    } catch (error) {
        console.error('Error poblando departamentos:', error);
        select.innerHTML = '<option value="">Error cargando departamentos</option>';
    }
}

// Cargar kioscos para configuración de acceso
async function populateKiosksList(containerId, authorizedKiosks = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; color: #666;">Cargando kioscos...</div>';

    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch('/api/v1/kiosks', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al cargar kioscos');

        const data = await response.json();
        const kiosks = data.kiosks || [];

        if (kiosks.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999;">No hay kioscos disponibles</div>';
            return;
        }

        // Crear checkboxes para cada kiosko
        container.innerHTML = kiosks.map(kiosk => `
            <label style="display: block; padding: 8px; margin: 5px 0; border-radius: 4px; cursor: pointer; background: #f8f9fa;">
                <input type="checkbox"
                       value="${kiosk.id}"
                       ${authorizedKiosks.includes(kiosk.id) ? 'checked' : ''}
                       style="margin-right: 10px;">
                <span>${kiosk.name}</span>
                <small style="color: #666; margin-left: 10px;">${kiosk.location || ''}</small>
            </label>
        `).join('');

        console.log(`✅ Se cargaron ${kiosks.length} kioscos`);

    } catch (error) {
        console.error('Error cargando kioscos:', error);
        container.innerHTML = '<div style="text-align: center; color: #dc3545;">Error cargando kioscos</div>';
    }
}

// Toggle para mostrar/ocultar selección de kioscos
function toggleKiosksSelection(canUseAll) {
    const container = document.getElementById('authorizedKiosksContainer');
    if (container) {
        container.style.display = canUseAll ? 'none' : 'block';
    }
}

// Toggle para mostrar/ocultar notas de horario flexible
function toggleFlexibleScheduleNotes(hasFlexible) {
    const container = document.getElementById('flexibleScheduleNotesContainer');
    if (container) {
        container.style.display = hasFlexible ? 'block' : 'none';
    }
}

console.log('🏢 [USERS] Funciones de departamentos y kioscos dinámicos agregadas');

// User filtering functions
function filterUsers() {
    const dniSearch = document.getElementById('searchDNI')?.value.trim().toLowerCase() || '';
    const nameSearch = document.getElementById('searchName')?.value.trim().toLowerCase() || '';

    if (!dniSearch && !nameSearch) {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(user => {
            const matchesDNI = !dniSearch || (user.dni && user.dni.toLowerCase().includes(dniSearch));
            const matchesName = !nameSearch || (
                (user.name && user.name.toLowerCase().includes(nameSearch)) ||
                (user.firstName && user.firstName.toLowerCase().includes(nameSearch)) ||
                (user.lastName && user.lastName.toLowerCase().includes(nameSearch)) ||
                (user.email && user.email.toLowerCase().includes(nameSearch))
            );

            return (!dniSearch || matchesDNI) && (!nameSearch || matchesName);
        });
    }

    // 📄 Reset pagination to first page when filtering
    currentPage = 1;

    displayUsersTable(filteredUsers);
    updateFilterResults();
}

function clearFilters() {
    document.getElementById('searchDNI').value = '';
    document.getElementById('searchName').value = '';
    filteredUsers = [...allUsers];

    // 📄 Reset pagination to first page when clearing filters
    currentPage = 1;

    displayUsersTable(filteredUsers);
    updateFilterResults();
}

function updateFilterResults() {
    const resultElement = document.getElementById('filterResults');
    if (resultElement) {
        const total = allUsers.length;
        const filtered = filteredUsers.length;
        
        if (filtered === total) {
            resultElement.textContent = `${total} usuarios`;
        } else {
            resultElement.textContent = `${filtered} de ${total} usuarios`;
        }
    }
}

console.log('🔍 [USERS] Funciones de filtrado agregadas');

// Función para asignar turnos a un usuario específico
function assignUserShifts(userId, userName) {
    console.log('🕐 [USERS] Asignando turnos para usuario:', userId, userName);
    
    // Crear modal específico para asignación de turnos de un usuario
    const modal = document.createElement('div');
    modal.id = 'assignUserShiftsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                    🕐 Asignar Turnos: ${userName}
                    <button onclick="closeUserShiftsModal()" style="margin-left: auto; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">✕</button>
                </h3>
            </div>
            <div style="padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <h4>📋 Turnos Disponibles</h4>
                    <div id="availableShiftsForUser" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
                        Cargando turnos disponibles...
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4>🕐 Turnos Actuales del Usuario</h4>
                    <div id="currentUserShifts" style="max-height: 150px; overflow-y: auto; border: 1px solid #e9ecef; border-radius: 8px; padding: 10px; background: #f8f9fa;">
                        Cargando turnos actuales...
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button id="assignSelectedShifts" class="btn btn-success" onclick="performUserShiftAssignment('${userId}', '${userName}')" style="margin: 5px;">
                        ✅ Asignar Turnos Seleccionados
                    </button>
                    <button class="btn btn-secondary" onclick="closeUserShiftsModal()" style="margin: 5px;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cargar datos de turnos
    loadShiftsForUser(userId);
}

// Función para cargar turnos disponibles y actuales del usuario
async function loadShiftsForUser(userId) {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        // Cargar turnos disponibles usando la ruta correcta con API_PREFIX
        const shiftsResponse = await fetch(window.progressiveAdmin.getApiUrl('/api/v1/shifts'), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (shiftsResponse.ok) {
            const shiftsData = await shiftsResponse.json();
            const allShifts = shiftsData.shifts || shiftsData || [];
            renderAvailableShiftsForUser(allShifts);
        } else {
            console.error('Error al obtener shifts:', shiftsResponse.status);
            document.getElementById('availableShiftsForUser').innerHTML = '❌ Error cargando turnos disponibles';
        }

        // Cargar turnos actuales del usuario
        const userResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();
            const user = userData.user || userData;
            renderCurrentUserShifts(user.shifts || []);
        } else {
            console.error('Error al obtener usuario:', userResponse.status);
            document.getElementById('currentUserShifts').innerHTML = '❌ Error cargando turnos actuales';
        }

    } catch (error) {
        console.error('Error cargando turnos:', error);
        document.getElementById('availableShiftsForUser').innerHTML = `❌ Error: ${error.message}`;
        document.getElementById('currentUserShifts').innerHTML = `❌ Error: ${error.message}`;
    }
}

// Renderizar turnos disponibles para selección
function renderAvailableShiftsForUser(shifts) {
    const container = document.getElementById('availableShiftsForUser');
    if (!container) return;
    
    if (shifts.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">No hay turnos disponibles</p>';
        return;
    }
    
    container.innerHTML = shifts.map(shift => `
        <div style="border: 1px solid #e9ecef; border-radius: 6px; padding: 10px; margin-bottom: 8px; background: white;">
            <label style="display: flex; align-items: center; cursor: pointer; margin: 0;">
                <input type="checkbox" value="${shift.id}" class="shift-checkbox" style="margin-right: 10px;">
                <div style="flex: 1;">
                    <strong>${shift.name}</strong><br>
                    <small style="color: #666;">${shift.start_time} - ${shift.end_time}</small>
                    ${shift.description ? `<br><small style="color: #888;">${shift.description}</small>` : ''}
                </div>
            </label>
        </div>
    `).join('');
}

// Renderizar turnos actuales del usuario
function renderCurrentUserShifts(shifts) {
    const container = document.getElementById('currentUserShifts');
    if (!container) return;
    
    if (shifts.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; margin: 0;">Este usuario no tiene turnos asignados</p>';
        return;
    }
    
    container.innerHTML = shifts.map(shift => `
        <div style="border: 1px solid #d4edda; border-radius: 6px; padding: 8px; margin-bottom: 6px; background: #d1ecf1;">
            <strong>${shift.name}</strong>
            <small style="color: #155724; margin-left: 10px;">${shift.start_time} - ${shift.end_time}</small>
            <button onclick="removeUserShift('${shift.UserShift?.id || shift.id}')" 
                    style="float: right; background: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 11px;"
                    title="Remover turno">🗑️</button>
        </div>
    `).join('');
}

// Realizar asignación de turnos seleccionados
async function performUserShiftAssignment(userId, userName) {
    const selectedCheckboxes = document.querySelectorAll('#availableShiftsForUser .shift-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('⚠️ Debe seleccionar al menos un turno para asignar');
        return;
    }
    
    const shiftIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    
    if (!confirm(`¿Desea asignar ${shiftIds.length} turno(s) a ${userName}?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/shifts/bulk-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userIds: [parseInt(userId)],
                shiftIds: shiftIds
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showUserMessage(`✅ Turnos asignados exitosamente a ${userName}. ${result.assigned} asignaciones realizadas.`, 'success');
            closeUserShiftsModal();
            loadUsers(); // Recargar la lista de usuarios
        } else {
            const error = await response.json();
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    } catch (error) {
        console.error('Error asignando turnos:', error);
        showUserMessage('❌ Error al asignar turnos', 'error');
    }
}

// Remover turno específico del usuario
async function removeUserShift(userShiftId) {
    if (!confirm('¿Está seguro que desea remover este turno del usuario?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/shifts/user-shift/${userShiftId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showUserMessage('✅ Turno removido exitosamente', 'success');
            // Recargar los datos del modal
            const modal = document.getElementById('assignUserShiftsModal');
            if (modal) {
                const userId = modal.querySelector('[onclick*="performUserShiftAssignment"]').onclick.toString().match(/performUserShiftAssignment\('(\d+)'/)[1];
                loadShiftsForUser(userId);
            }
        } else {
            const error = await response.json();
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    } catch (error) {
        console.error('Error removiendo turno:', error);
        showUserMessage('❌ Error al remover turno', 'error');
    }
}

// Cerrar modal de asignación de turnos
function closeUserShiftsModal() {
    const modal = document.getElementById('assignUserShiftsModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// =================== FUNCIONES DEL EXPEDIENTE COMPLETO ===================

// Cerrar expediente del empleado
function closeEmployeeFile() {
    const modal = document.getElementById('employeeFileModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Iniciar captura biométrica del empleado
async function startBiometricCapture(userId, employeeId) {
    console.log('📸 [BIOMETRIC] Iniciando captura biométrica para:', { userId, employeeId });

    try {
        // Importar dinámicamente el módulo biometric-simple
        const { startProfessionalFaceCapture } = await import('./biometric-simple.js');

        // Iniciar la captura profesional con feedback en tiempo real
        await startProfessionalFaceCapture({
            userId: userId,
            employeeId: employeeId,
            onSuccess: async (capturedData) => {
                console.log('✅ [BIOMETRIC] Captura exitosa:', capturedData);

                // Actualizar la foto en el modal
                const photoDisplay = document.getElementById('biometric-photo-display');
                if (photoDisplay && capturedData.photo) {
                    photoDisplay.innerHTML = `
                        <img src="${capturedData.photo}" alt="Foto biométrica"
                             style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #28a745;">
                    `;
                }

                // Mostrar mensaje de éxito
                showUserMessage('✅ Template biométrico capturado exitosamente', 'success');

                // Recargar el expediente para actualizar la información
                setTimeout(() => {
                    closeEmployeeFile();
                    viewUser(userId);
                }, 1500);
            },
            onError: (error) => {
                console.error('❌ [BIOMETRIC] Error en captura:', error);
                showUserMessage(`❌ Error en captura biométrica: ${error.message}`, 'error');
            }
        });

    } catch (error) {
        console.error('❌ [BIOMETRIC] Error importando módulo:', error);
        showUserMessage('❌ Error al iniciar captura biométrica. Verifique que el módulo esté disponible.', 'error');
    }
}

// Cambiar entre tabs del expediente
window.showFileTab = function(tabName, button) {
    console.log(`🔄 [TABS] Cambiando a tab: ${tabName}`);

    // Obtener el modal
    const modal = document.getElementById('employeeFileModal');
    if (!modal) {
        console.error('❌ [TABS] Modal employeeFileModal no encontrado');
        return;
    }

    // Ocultar todos los tabs DENTRO del modal
    modal.querySelectorAll('.file-tab-content').forEach(tab => {
        tab.style.setProperty('display', 'none', 'important');
        tab.classList.remove('active');
    });

    // Remover clase active de todos los botones DENTRO del modal
    modal.querySelectorAll('.file-tab').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar tab seleccionado
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.style.setProperty('display', 'block', 'important');
        targetTab.classList.add('active');
        button.classList.add('active');
        console.log(`✅ [TABS] Tab "${tabName}" mostrado correctamente`);
    } else {
        console.error(`❌ [TABS] No se encontró el tab con ID: ${tabName}-tab`);
    }
};

// Cargar datos iniciales del expediente
async function loadEmployeeFileData(userId) {
    console.log('📋 [EMPLOYEE FILE] Cargando datos del expediente:', userId);

    // Aquí se cargarán los datos de cada sección
    // Por ahora, agregamos los estilos CSS necesarios
    addEmployeeFileStyles();

    // Cargar estado de consentimiento biométrico
    await loadBiometricConsentStatus(userId);
}

// Cargar estado de consentimiento biométrico para un usuario
async function loadBiometricConsentStatus(userId) {
    console.log('🔐 [CONSENT] Cargando estado de consentimiento para:', userId);

    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            console.warn('⚠️ [CONSENT] No hay token de autenticación');
            return;
        }

        const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/biometric/consents/${userId}`);
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const consentStatusDiv = document.getElementById('consent-status');
        const consentDetailsDiv = document.getElementById('consent-details');

        if (!consentStatusDiv || !consentDetailsDiv) {
            console.warn('⚠️ [CONSENT] Elementos DOM no encontrados');
            return;
        }

        if (response.ok) {
            const data = await response.json();

            if (data.hasConsent && data.consent) {
                const consent = data.consent;
                const consentDate = new Date(consent.consent_date).toLocaleDateString('es-AR');
                const expiresAt = consent.expires_at ? new Date(consent.expires_at).toLocaleDateString('es-AR') : 'Sin expiración';
                const validationMethod = consent.acceptance_method === 'facial' ? '😊 Facial' :
                                       consent.acceptance_method === 'fingerprint' ? '👆 Huella' :
                                       consent.acceptance_method || 'No especificado';

                // Verificar si está expirado
                const isExpired = consent.expires_at && new Date(consent.expires_at) < new Date();

                if (isExpired) {
                    consentStatusDiv.innerHTML = '<span class="status-badge secondary">⏰ Expirado</span>';
                    consentDetailsDiv.innerHTML = `
                        <div style="color: #dc3545;">
                            <strong>Consentimiento expirado</strong><br>
                            Otorgado: ${consentDate}<br>
                            Expiró: ${expiresAt}<br>
                            Método: ${validationMethod}
                        </div>
                    `;
                } else {
                    consentStatusDiv.innerHTML = '<span class="status-badge success">✅ Activo</span>';
                    consentDetailsDiv.innerHTML = `
                        <div style="color: #28a745;">
                            <strong>Consentimiento otorgado</strong><br>
                            Fecha: ${consentDate}<br>
                            Expira: ${expiresAt}<br>
                            Método: ${validationMethod}<br>
                            IP: ${consent.ip_address || 'No disponible'}
                        </div>
                    `;
                }
            } else {
                consentStatusDiv.innerHTML = '<span class="status-badge warning">⏳ Pendiente</span>';
                consentDetailsDiv.innerHTML = `
                    <div style="color: #ffc107;">
                        <strong>Sin consentimiento</strong><br>
                        El empleado aún no ha otorgado su consentimiento para el análisis emocional biométrico.<br>
                        <em>Debe otorgarlo mediante validación biométrica (facial o huella).</em>
                    </div>
                `;
            }

            console.log('✅ [CONSENT] Estado de consentimiento cargado exitosamente');
        } else if (response.status === 404 || response.status === 400) {
            // No hay consentimiento
            consentStatusDiv.innerHTML = '<span class="status-badge warning">⏳ Pendiente</span>';
            consentDetailsDiv.innerHTML = `
                <div style="color: #ffc107;">
                    <strong>Sin consentimiento</strong><br>
                    El empleado aún no ha otorgado su consentimiento para el análisis emocional biométrico.<br>
                    <em>Debe otorgarlo mediante validación biométrica (facial o huella).</em>
                </div>
            `;
        } else {
            throw new Error('Error obteniendo consentimiento');
        }

    } catch (error) {
        console.error('❌ [CONSENT] Error cargando consentimiento:', error);
        const consentStatusDiv = document.getElementById('consent-status');
        const consentDetailsDiv = document.getElementById('consent-details');

        if (consentStatusDiv && consentDetailsDiv) {
            consentStatusDiv.innerHTML = '<span class="status-badge secondary">❌ Error</span>';
            consentDetailsDiv.innerHTML = `
                <div style="color: #dc3545;">
                    <strong>Error al cargar</strong><br>
                    No se pudo obtener el estado del consentimiento.
                </div>
            `;
        }
    }
}

// Agregar estilos CSS para el expediente
function addEmployeeFileStyles() {
    if (document.getElementById('employee-file-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'employee-file-styles';
    style.textContent = `
        .file-tab {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 8px 16px;
            border-radius: 8px 8px 0 0;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .file-tab:hover {
            background: #e9ecef;
        }
        
        .file-tab.active {
            background: white;
            border-bottom: 1px solid white;
            transform: translateY(1px);
            font-weight: 600;
            color: #2c3e50;
        }
        
        .file-tab-content {
            animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .btn-sm {
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
}

// =================== FUNCIONES DE ANTECEDENTES LABORALES ===================

function addWorkHistory(userId) {
    console.log('💼 [WORK HISTORY] Agregando antecedente laboral para:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'workHistoryModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 500px;">
            <h4>💼 Agregar Antecedente Laboral</h4>
            <form id="workHistoryForm">
                <div style="margin: 10px 0;">
                    <label>Empresa:</label>
                    <input type="text" id="company" class="form-control" required>
                </div>
                <div style="margin: 10px 0;">
                    <label>Cargo:</label>
                    <input type="text" id="position" class="form-control" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
                    <div>
                        <label>Fecha Inicio:</label>
                        <input type="date" id="startDate" class="form-control" required>
                    </div>
                    <div>
                        <label>Fecha Fin:</label>
                        <input type="date" id="endDate" class="form-control">
                    </div>
                </div>
                <div style="margin: 10px 0;">
                    <label>Descripción:</label>
                    <textarea id="description" class="form-control" rows="3"></textarea>
                </div>
                <div style="text-align: right; margin-top: 15px;">
                    <button type="button" onclick="closeModal('workHistoryModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('workHistoryForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
                company_name: document.getElementById('company').value,
                position: document.getElementById('position').value,
                start_date: document.getElementById('startDate').value,
                end_date: document.getElementById('endDate').value || null,
                responsibilities: document.getElementById('description').value
            };

            console.log('💼 [WORK-HISTORY] Enviando datos:', formData);
            console.log('💼 [WORK-HISTORY] URL:', `/api/v1/users/${userId}/work-history`);
            console.log('💼 [WORK-HISTORY] Token:', localStorage.getItem('authToken') ? 'Presente' : 'FALTA');

            const response = await fetch(`/api/v1/users/${userId}/work-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            console.log('💼 [WORK-HISTORY] Response status:', response.status);
            console.log('💼 [WORK-HISTORY] Response OK:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('💼 [WORK-HISTORY] Error response:', errorText);
                let error;
                try {
                    error = JSON.parse(errorText);
                } catch {
                    error = { error: errorText };
                }
                throw new Error(error.error || 'Error al agregar antecedente laboral');
            }

            const result = await response.json();
            console.log('💼 [WORK-HISTORY] Guardado exitosamente:', result);

            closeModal('workHistoryModal');
            showUserMessage('✅ Antecedente laboral agregado exitosamente', 'success');

            // Recargar datos si existe función
            if (typeof loadWorkHistory === 'function') {
                loadWorkHistory(userId);
            }
        } catch (error) {
            console.error('❌ [WORK-HISTORY] Error completo:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

// =================== FUNCIONES DE GRUPO FAMILIAR ===================

function addFamilyMember(userId) {
    console.log('👨‍👩‍👧‍👦 [FAMILY] Agregando familiar para:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'familyMemberModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 500px;">
            <h4>👥 Agregar Miembro del Grupo Familiar</h4>
            <form id="familyMemberForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label>Nombre:</label>
                        <input type="text" id="familyName" class="form-control" required>
                    </div>
                    <div style="margin: 10px 0;">
                        <label>Apellido:</label>
                        <input type="text" id="familySurname" class="form-control" required>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label>Parentesco:</label>
                        <select id="relationship" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="spouse">Cónyuge</option>
                            <option value="child">Hijo/a</option>
                            <option value="parent">Padre/Madre</option>
                            <option value="sibling">Hermano/a</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>
                    <div style="margin: 10px 0;">
                        <label>Fecha Nacimiento:</label>
                        <input type="date" id="familyBirthDate" class="form-control">
                    </div>
                </div>
                <div style="margin: 10px 0;">
                    <label>DNI:</label>
                    <input type="text" id="familyDni" class="form-control">
                </div>
                <div style="margin: 10px 0;">
                    <label>
                        <input type="checkbox" id="isDependent"> ¿Es dependiente económicamente?
                    </label>
                </div>
                <div style="text-align: right; margin-top: 15px;">
                    <button type="button" onclick="closeModal('familyMemberModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('familyMemberForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const familyName = document.getElementById('familyName').value;
            const familySurname = document.getElementById('familySurname').value;

            const formData = {
                full_name: `${familyName} ${familySurname}`.trim(),
                relationship: document.getElementById('relationship').value,
                birth_date: document.getElementById('familyBirthDate').value || null,
                dni: document.getElementById('familyDni').value || null,
                is_dependent: document.getElementById('isDependent')?.checked || false
            };

            console.log('👨‍👩‍👧‍👦 [FAMILY] Enviando datos:', formData);
            console.log('👨‍👩‍👧‍👦 [FAMILY] URL:', `/api/v1/user-profile/${userId}/family-members`);
            console.log('👨‍👩‍👧‍👦 [FAMILY] Token:', localStorage.getItem('authToken') ? 'Presente' : 'FALTA');

            const response = await fetch(`/api/v1/user-profile/${userId}/family-members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            console.log('👨‍👩‍👧‍👦 [FAMILY] Response status:', response.status);
            console.log('👨‍👩‍👧‍👦 [FAMILY] Response OK:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('👨‍👩‍👧‍👦 [FAMILY] Error response:', errorText);
                let error;
                try {
                    error = JSON.parse(errorText);
                } catch {
                    error = { error: errorText };
                }
                throw new Error(error.error || 'Error al agregar familiar');
            }

            const result = await response.json();
            console.log('👨‍👩‍👧‍👦 [FAMILY] Guardado exitosamente:', result);

            closeModal('familyMemberModal');
            showUserMessage('✅ Familiar agregado al grupo familiar exitosamente', 'success');

            // Recargar datos si existe función
            if (typeof loadFamilyMembers === 'function') {
                loadFamilyMembers(userId);
            }
        } catch (error) {
            console.error('❌ Error al agregar familiar:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

// =================== FUNCIONES MÉDICAS ===================

function addPreexistingCondition(userId) {
    console.log('⚠️ [MEDICAL] Agregando condición preexistente para:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'conditionModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>⚠️ Agregar Condición Preexistente</h4>
            <form id="conditionForm">
                <div style="margin: 10px 0;">
                    <label>Condición/Diagnóstico:</label>
                    <input type="text" id="condition" class="form-control" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label>Fecha Diagnóstico:</label>
                        <input type="date" id="diagnosisDate" class="form-control">
                    </div>
                    <div style="margin: 10px 0;">
                        <label>Severidad:</label>
                        <select id="severity" class="form-control">
                            <option value="low">Leve</option>
                            <option value="medium">Moderada</option>
                            <option value="high">Grave</option>
                        </select>
                    </div>
                </div>
                <div style="margin: 10px 0;">
                    <label>Tratamiento/Medicación:</label>
                    <textarea id="treatment" class="form-control" rows="3"></textarea>
                </div>
                <div style="margin: 10px 0;">
                    <label>Observaciones:</label>
                    <textarea id="observations" class="form-control" rows="2"></textarea>
                </div>
                <div style="text-align: right; margin-top: 15px;">
                    <button type="button" onclick="closeModal('conditionModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-warning">Guardar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('conditionForm').onsubmit = (e) => {
        e.preventDefault();
        closeModal('conditionModal');
        showUserMessage('✅ Condición preexistente registrada', 'success');
    };
}

function addPreoccupationalExam(userId) {
    console.log('✅ [MEDICAL] Agregando examen preocupacional para:', userId);
    // Similar al anterior pero para examen preocupacional
    showUserMessage('🔧 Función en desarrollo: Examen Preocupacional', 'info');
}

function addMedicalRecord(userId) {
    console.log('📋 [MEDICAL] Agregando evento médico para:', userId);
    // Similar al anterior pero para eventos médicos
    showUserMessage('🔧 Función en desarrollo: Evento Médico', 'info');
}

// =================== FUNCIONES DE ASISTENCIA Y PERMISOS ===================

function loadAttendanceHistory(userId) {
    console.log('📊 [ATTENDANCE] Cargando historial de asistencias:', userId);
    // Integrar con el sistema de asistencias existente
    showUserMessage('🔧 Función en desarrollo: Historial de Asistencias', 'info');
}

function addPermissionRequest(userId) {
    console.log('📅 [PERMISSIONS] Agregando solicitud de permiso:', userId);

    const modal = document.createElement('div');
    modal.id = 'permissionRequestModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px; max-height: 90vh; overflow-y: auto;">
            <h4>📅 Agregar Solicitud de Permiso</h4>
            <form id="permissionRequestForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label>Tipo de Permiso:</label>
                        <select id="requestType" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="vacaciones">Vacaciones</option>
                            <option value="licencia_medica">Licencia Médica</option>
                            <option value="permiso_personal">Permiso Personal</option>
                            <option value="estudio">Estudio</option>
                            <option value="duelo">Duelo</option>
                            <option value="maternidad">Maternidad</option>
                            <option value="paternidad">Paternidad</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                    <div style="margin: 10px 0;">
                        <label>Días Totales:</label>
                        <input type="number" id="totalDays" class="form-control" min="1" required>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label>Fecha Inicio:</label>
                        <input type="date" id="startDate" class="form-control" required>
                    </div>
                    <div style="margin: 10px 0;">
                        <label>Fecha Fin:</label>
                        <input type="date" id="endDate" class="form-control" required>
                    </div>
                </div>
                <div style="margin: 10px 0;">
                    <label>Motivo:</label>
                    <textarea id="permissionReason" class="form-control" rows="4" required></textarea>
                </div>
                <div style="text-align: right; margin-top: 15px;">
                    <button type="button" onclick="closeModal('permissionRequestModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Solicitar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto-calculate days
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    const daysInput = document.getElementById('totalDays');

    const calculateDays = () => {
        if (startInput.value && endInput.value) {
            const start = new Date(startInput.value);
            const end = new Date(endInput.value);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            daysInput.value = diffDays;
        }
    };

    startInput.onchange = calculateDays;
    endInput.onchange = calculateDays;

    document.getElementById('permissionRequestForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
                request_type: document.getElementById('requestType').value,
                start_date: document.getElementById('startDate').value,
                end_date: document.getElementById('endDate').value,
                total_days: parseInt(document.getElementById('totalDays').value),
                reason: document.getElementById('permissionReason').value
            };

            const response = await fetch(`/api/v1/user-admin/${userId}/permissions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al procesar solicitud');
            }

            closeModal('permissionRequestModal');
            showUserMessage('✅ Solicitud de permiso registrada exitosamente', 'success');

            // Reload permissions if function exists
            if (typeof loadPermissionRequests === 'function') {
                loadPermissionRequests(userId);
            }
        } catch (error) {
            console.error('❌ [PERMISSIONS] Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

// =================== FUNCIONES DISCIPLINARIAS ===================

function addDisciplinaryAction(userId) {
    console.log('⚖️ [DISCIPLINARY] Agregando acción disciplinaria:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'disciplinaryModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>⚖️ Agregar Acción Disciplinaria</h4>
            <form id="disciplinaryForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label>Tipo:</label>
                        <select id="actionType" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="warning">Amonestación</option>
                            <option value="reprimand">Apercibimiento</option>
                            <option value="suspension">Suspensión</option>
                        </select>
                    </div>
                    <div style="margin: 10px 0;">
                        <label>Fecha:</label>
                        <input type="date" id="actionDate" class="form-control" required>
                    </div>
                </div>
                <div style="margin: 10px 0;">
                    <label>Motivo:</label>
                    <input type="text" id="reason" class="form-control" required>
                </div>
                <div style="margin: 10px 0;">
                    <label>Descripción Detallada:</label>
                    <textarea id="description" class="form-control" rows="4" required></textarea>
                </div>
                <div id="suspensionDays" style="margin: 10px 0; display: none;">
                    <label>Días de Suspensión:</label>
                    <input type="number" id="days" class="form-control" min="1">
                </div>
                <div style="text-align: right; margin-top: 15px;">
                    <button type="button" onclick="closeModal('disciplinaryModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-danger">Registrar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Mostrar campo de días si es suspensión
    document.getElementById('actionType').onchange = (e) => {
        const daysField = document.getElementById('suspensionDays');
        daysField.style.display = e.target.value === 'suspension' ? 'block' : 'none';
    };
    
    document.getElementById('disciplinaryForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            action_type: document.getElementById('actionType').value || null,
            severity: 'moderada', // Default severity
            description: document.getElementById('description').value || null,
            date_occurred: document.getElementById('actionDate').value || null,
            action_taken: document.getElementById('reason').value || null,
            follow_up_required: false,
        };

            const response = await fetch(`/api/v1/user-admin/${userId}/disciplinary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Acción disciplinaria registrada Error al procesar solicitud');
            }

            closeModal('disciplinaryModal');
            showUserMessage('✅ Acción disciplinaria registrada exitosamente', 'success');

            if (typeof loadDisciplinaryActions === 'function') { loadDisciplinaryActions(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

// =================== FUNCIONES AUXILIARES ===================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        document.body.removeChild(modal);
    }
}

// =================== FUNCIONES DE FORMACIÓN ACADÉMICA ===================

function addEducation(userId) {
    console.log('🎓 [EDUCATION] Agregando formación académica para:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'educationModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px; max-height: 80vh; overflow-y: auto;">
            <h4>🎓 Agregar Formación Académica</h4>
            <form id="educationForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <h5 style="color: #0c5460;">📚 Nivel Educativo</h5>
                        <div style="margin: 10px 0;">
                            <label>Tipo:</label>
                            <select id="educationType" class="form-control" required>
                                <option value="">Seleccionar...</option>
                                <option value="primary">Primarios</option>
                                <option value="secondary">Secundarios</option>
                                <option value="tertiary">Terciarios</option>
                                <option value="university">Universitarios</option>
                                <option value="postgraduate">Posgrado</option>
                            </select>
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Institución:</label>
                            <input type="text" id="institution" class="form-control" required>
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Título/Certificado:</label>
                            <input type="text" id="degree" class="form-control" required>
                        </div>
                    </div>
                    
                    <div>
                        <h5 style="color: #0c5460;">📊 Detalles</h5>
                        <div style="margin: 10px 0;">
                            <label>Estado:</label>
                            <select id="status" class="form-control" required>
                                <option value="completed">Completado</option>
                                <option value="in_progress">En curso</option>
                                <option value="abandoned">Abandonado</option>
                            </select>
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Año Finalización:</label>
                            <input type="number" id="graduationYear" class="form-control" min="1950" max="2030">
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Promedio General:</label>
                            <input type="number" id="gpa" class="form-control" step="0.1" min="1" max="10">
                        </div>
                    </div>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Descripción/Especialización:</label>
                    <textarea id="description" class="form-control" rows="3" placeholder="Detalles sobre la especialización, orientación, etc."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('educationModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-info">Guardar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('educationForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const educationType = document.getElementById('educationType').value;
            const institution = document.getElementById('institution').value;
            const degree = document.getElementById('degree').value;
            const status = document.getElementById('status').value;
            const graduationYear = document.getElementById('graduationYear').value;
            const description = document.getElementById('description').value;

            const formData = {
                education_level: educationType,
                institution_name: institution,
                degree_title: degree,
                field_of_study: description || null,
                start_date: null,  // No está en el formulario
                end_date: graduationYear ? `${graduationYear}-12-31` : null,
                graduated: status === 'completed'
            };

            const response = await fetch(`/api/v1/user-profile/${userId}/education`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al agregar educación');
            }

            closeModal('educationModal');
            showUserMessage('✅ Formación académica agregada exitosamente', 'success');

            if (typeof loadEducation === 'function') {
                loadEducation(userId);
            }
        } catch (error) {
            console.error('❌ Error al agregar educación:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

// =================== FUNCIONES DE SCORING ===================

function recalculateScore(userId) {
    console.log('⭐ [SCORING] Recalculando puntuación para:', userId);
    
    // Simulación del cálculo de scoring
    setTimeout(() => {
        const scores = calculateEmployeeScore(userId);
        
        const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
        
        // Actualizar UI
        document.getElementById('employee-score').textContent = totalScore;
        document.getElementById('education-score').textContent = scores.education;
        document.getElementById('experience-score').textContent = scores.experience;
        document.getElementById('behavior-score').textContent = scores.behavior;
        document.getElementById('training-score').textContent = scores.training;
        document.getElementById('medical-score').textContent = scores.medical;
        document.getElementById('disciplinary-score').textContent = scores.disciplinary;
        
        showUserMessage(`⭐ Scoring recalculado: ${totalScore} puntos`, 'success');
    }, 1000);
}

// Nueva función para calcular scoring completo
function calculateEmployeeScore(userId) {
    // Simulación del cálculo de scoring - en producción esto vendría de la base de datos
    const baseScores = {
        education: Math.floor(Math.random() * 25) + 15, // 15-40 puntos
        experience: Math.floor(Math.random() * 30) + 20, // 20-50 puntos  
        behavior: Math.floor(Math.random() * 20) + 30, // 30-50 puntos
        training: calculateTrainingScore(userId), // Dinámico basado en capacitaciones
        medical: Math.floor(Math.random() * 15) + 35, // 35-50 puntos
        disciplinary: Math.floor(Math.random() * 10) + 40 // 40-50 puntos (menos puntos = más problemas)
    };
    
    return baseScores;
}

// Función para calcular puntaje de capacitaciones
function calculateTrainingScore(userId) {
    console.log('🎓 [TRAINING-SCORING] Calculando puntaje de capacitaciones para:', userId);
    
    // Obtener datos de capacitaciones del localStorage o API
    let trainingData = [];
    try {
        const saved = localStorage.getItem(`employee_${userId}_trainings`);
        if (saved) {
            trainingData = JSON.parse(saved);
        }
    } catch (error) {
        console.log('⚠️ [TRAINING-SCORING] Error cargando datos de capacitaciones:', error);
    }
    
    // Factores de scoring para capacitaciones
    let trainingScore = 20; // Puntaje base
    
    // Bonificaciones por capacitaciones completadas
    const completedTrainings = trainingData.filter(t => t.status === 'completed' || t.status === 'approved');
    trainingScore += completedTrainings.length * 3; // +3 puntos por capacitación completada
    
    // Bonificación por capacitaciones completadas a tiempo
    const onTimeCompletions = completedTrainings.filter(t => 
        t.completedDate && t.deadline && new Date(t.completedDate) <= new Date(t.deadline)
    );
    trainingScore += onTimeCompletions.length * 2; // +2 puntos adicionales por puntualidad
    
    // Bonificación por excelencia (calificaciones altas)
    const excellentScores = completedTrainings.filter(t => t.score && t.score >= 90);
    trainingScore += excellentScores.length * 5; // +5 puntos por excelencia
    
    // Penalización por capacitaciones no completadas o reprobadas
    const failedTrainings = trainingData.filter(t => t.status === 'failed' || t.status === 'expired');
    trainingScore -= failedTrainings.length * 3; // -3 puntos por falla
    
    // Penalización por capacitaciones vencidas sin completar
    const expiredTrainings = trainingData.filter(t => 
        t.status === 'assigned' && t.deadline && new Date(t.deadline) < new Date()
    );
    trainingScore -= expiredTrainings.length * 5; // -5 puntos por vencimiento
    
    // Bonus por certificaciones obtenidas
    const certifications = trainingData.filter(t => t.certificateIssued);
    trainingScore += certifications.length * 4; // +4 puntos por certificación
    
    // Asegurar que el puntaje esté en un rango razonable (0-50)
    trainingScore = Math.max(0, Math.min(50, trainingScore));
    
    console.log('🎓 [TRAINING-SCORING] Puntaje calculado:', trainingScore, 'para usuario:', userId);
    
    return trainingScore;
}

// Función para actualizar scoring cuando se completa una capacitación
function updateEmployeeScoreForTraining(userId, trainingData) {
    console.log('⭐ [SCORING-UPDATE] Actualizando scoring por capacitación:', userId, trainingData);
    
    // Obtener datos actuales del empleado
    let employeeTrainings = [];
    try {
        const saved = localStorage.getItem(`employee_${userId}_trainings`);
        if (saved) {
            employeeTrainings = JSON.parse(saved);
        }
    } catch (error) {
        console.log('⚠️ [SCORING-UPDATE] Error cargando datos:', error);
        employeeTrainings = [];
    }
    
    // Buscar si ya existe el registro de esta capacitación
    const existingIndex = employeeTrainings.findIndex(t => t.trainingId === trainingData.trainingId);
    
    if (existingIndex >= 0) {
        // Actualizar registro existente
        employeeTrainings[existingIndex] = { ...employeeTrainings[existingIndex], ...trainingData };
    } else {
        // Agregar nuevo registro
        employeeTrainings.push(trainingData);
    }
    
    // Guardar datos actualizados
    localStorage.setItem(`employee_${userId}_trainings`, JSON.stringify(employeeTrainings));
    
    // Recalcular y actualizar UI si estamos viendo este empleado
    const currentEmployeeScore = document.getElementById('employee-score');
    if (currentEmployeeScore) {
        recalculateScore(userId);
    }
    
    // Log de auditoría
    if (typeof window.logSystemAudit === 'function') {
        window.logSystemAudit(
            'training_score_update',
            `Scoring actualizado por ${trainingData.status === 'completed' ? 'completar' : trainingData.status === 'failed' ? 'reprobar' : 'cambio en'} capacitación: ${trainingData.title}`,
            userId
        );
    }
    
    return calculateTrainingScore(userId);
}

// =================== FUNCIONES LABORALES AVANZADAS ===================

function addLegalIssue(userId) {
    console.log('⚖️ [LEGAL] Agregando antecedente judicial para:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'legalIssueModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>⚖️ Agregar Juicio o Mediación Laboral</h4>
            <form id="legalIssueForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label>Tipo:</label>
                        <select id="legalType" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="lawsuit">Juicio</option>
                            <option value="mediation">Mediación</option>
                            <option value="arbitration">Arbitraje</option>
                            <option value="complaint">Denuncia</option>
                        </select>
                    </div>
                    <div style="margin: 10px 0;">
                        <label>Estado:</label>
                        <select id="legalStatus" class="form-control" required>
                            <option value="active">Activo</option>
                            <option value="resolved">Resuelto</option>
                            <option value="dismissed">Desestimado</option>
                        </select>
                    </div>
                </div>
                <div style="margin: 10px 0;">
                    <label>Empresa/Demandante:</label>
                    <input type="text" id="plaintiff" class="form-control" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label>Fecha Inicio:</label>
                        <input type="date" id="startDate" class="form-control" required>
                    </div>
                    <div style="margin: 10px 0;">
                        <label>Fecha Resolución:</label>
                        <input type="date" id="resolutionDate" class="form-control">
                    </div>
                </div>
                <div style="margin: 10px 0;">
                    <label>Motivo/Descripción:</label>
                    <textarea id="description" class="form-control" rows="4" required></textarea>
                </div>
                <div style="margin: 10px 0;">
                    <label>Resultado/Resolución:</label>
                    <textarea id="resolution" class="form-control" rows="2"></textarea>
                </div>
                <div style="text-align: right; margin-top: 15px;">
                    <button type="button" onclick="closeModal('legalIssueModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-danger">Registrar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('legalIssueForm').onsubmit = (e) => {
        e.preventDefault();
        closeModal('legalIssueModal');
        showUserMessage('✅ Antecedente judicial registrado', 'success');
    };
}

function addUnionAffiliation(userId) {
    console.log('🏭 [UNION] Editando afiliación gremial para:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'unionModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 500px;">
            <h4>🏭 Afiliación Gremial</h4>
            <form id="unionForm">
                <div style="margin: 10px 0;">
                    <label>¿Está afiliado a algún gremio?</label>
                    <select id="isAffiliated" class="form-control" onchange="toggleUnionFields()" required>
                        <option value="">Seleccionar...</option>
                        <option value="yes">Sí</option>
                        <option value="no">No</option>
                    </select>
                </div>
                
                <div id="unionFields" style="display: none;">
                    <div style="margin: 10px 0;">
                        <label>Nombre del Gremio:</label>
                        <input type="text" id="unionName" class="form-control">
                    </div>
                    
                    <div style="margin: 10px 0;">
                        <label>¿Es delegado gremial?</label>
                        <select id="isDelegate" class="form-control" onchange="toggleDelegateFields()">
                            <option value="no">No</option>
                            <option value="yes">Sí</option>
                        </select>
                    </div>
                    
                    <div id="delegateFields" style="display: none;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div style="margin: 10px 0;">
                                <label>Desde:</label>
                                <input type="date" id="delegateFrom" class="form-control">
                            </div>
                            <div style="margin: 10px 0;">
                                <label>Hasta:</label>
                                <input type="date" id="delegateTo" class="form-control">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('unionModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-info">Guardar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Funciones para mostrar/ocultar campos
    window.toggleUnionFields = () => {
        const fields = document.getElementById('unionFields');
        const isAffiliated = document.getElementById('isAffiliated').value;
        fields.style.display = isAffiliated === 'yes' ? 'block' : 'none';
    };
    
    window.toggleDelegateFields = () => {
        const fields = document.getElementById('delegateFields');
        const isDelegate = document.getElementById('isDelegate').value;
        fields.style.display = isDelegate === 'yes' ? 'block' : 'none';
    };
    
    document.getElementById('unionForm').onsubmit = (e) => {
        e.preventDefault();
        closeModal('unionModal');
        showUserMessage('✅ Afiliación gremial actualizada', 'success');
    };
}

// =================== FUNCIONES DE GESTIÓN DE TAREAS ===================

function assignTasks(userId) {
    console.log('🎯 [TASKS] Asignando tareas a usuario:', userId);
    showUserMessage('🔧 Función en desarrollo: Asignación de Tareas', 'info');
}

function manageCompanyTasks() {
    console.log('⚙️ [TASKS] Gestionando tareas de la empresa');
    showUserMessage('🔧 Función en desarrollo: Gestión de Tareas Empresa', 'info');
}

function createNewTask() {
    console.log('➕ [TASKS] Creando nueva tarea');
    
    const modal = document.createElement('div');
    modal.id = 'newTaskModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 700px; max-height: 80vh; overflow-y: auto;">
            <h4>➕ Crear Nueva Tarea/Categoría</h4>
            <form id="newTaskForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <h5 style="color: #155724;">📝 Información de la Tarea</h5>
                        <div style="margin: 10px 0;">
                            <label>Nombre de la Tarea:</label>
                            <input type="text" id="taskName" class="form-control" required>
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Categoría:</label>
                            <select id="taskCategory" class="form-control" required>
                                <option value="">Seleccionar...</option>
                                <option value="administrative">Administrativo</option>
                                <option value="operational">Operativo</option>
                                <option value="technical">Técnico</option>
                                <option value="management">Gerencial</option>
                                <option value="sales">Ventas</option>
                                <option value="support">Soporte</option>
                            </select>
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Descripción:</label>
                            <textarea id="taskDescription" class="form-control" rows="4" required placeholder="Describe las responsabilidades y actividades de esta tarea..."></textarea>
                        </div>
                    </div>
                    
                    <div>
                        <h5 style="color: #856404;">💰 Información Salarial</h5>
                        <div style="margin: 10px 0;">
                            <label>Salario:</label>
                            <input type="number" id="taskSalary" class="form-control" step="0.01" required>
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Modalidad de Pago:</label>
                            <select id="paymentMode" class="form-control" required>
                                <option value="">Seleccionar...</option>
                                <option value="hourly">Por Hora</option>
                                <option value="monthly">Mensual</option>
                                <option value="daily">Diario</option>
                                <option value="piece">Por Pieza/Proyecto</option>
                            </select>
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Jornada Laboral:</label>
                            <select id="workSchedule" class="form-control" required>
                                <option value="">Seleccionar...</option>
                                <option value="full_time">Tiempo Completo</option>
                                <option value="part_time">Medio Tiempo</option>
                                <option value="weekly">Semanal</option>
                                <option value="biweekly">Quincenal</option>
                                <option value="monthly">Mensual</option>
                                <option value="flexible">Flexible</option>
                            </select>
                        </div>
                        <div style="margin: 10px 0;">
                            <label>
                                <input type="checkbox" id="isActive"> ¿Tarea activa?
                            </label>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('newTaskModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Crear Tarea</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('newTaskForm').onsubmit = (e) => {
        e.preventDefault();
        closeModal('newTaskModal');
        showUserMessage('✅ Nueva tarea creada exitosamente', 'success');
    };
}

function assignEmployeeTasks(userId) {
    console.log('🎯 [TASKS] Asignando tareas específicas al empleado:', userId);
    showUserMessage('🔧 Función en desarrollo: Asignar Tareas al Empleado', 'info');
}

function configureSalaryDetails(userId) {
    console.log('💰 [SALARY] Configurando detalles salariales:', userId);
    showUserMessage('🔧 Función en desarrollo: Configuración Salarial', 'info');
}

function viewTaskHistory(userId) {
    console.log('📊 [TASKS] Viendo historial de tareas:', userId);
    showUserMessage('🔧 Función en desarrollo: Historial de Tareas', 'info');
}

// =================== FUNCIONES DE CONTACTO Y OBRA SOCIAL ===================

function editContactInfo(userId) {
    console.log('📞 [CONTACT] Editando información de contacto:', userId);

    // CRITICAL FIX: Eliminar modal anterior si existe para evitar conflictos
    const existingModal = document.getElementById('contactInfoModal');
    if (existingModal) {
        console.log('⚠️  [CONTACT] Modal anterior encontrado, eliminando...');
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'contactInfoModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>📞 Editar Información de Contacto</h4>
            <form id="contactInfoForm">
                <h5 style="color: #856404; margin-bottom: 15px;">Contacto de Emergencia</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Nombre del Contacto:</label>
                        <input type="text" id="emergencyContactName" class="form-control" placeholder="Nombre completo">
                    </div>
                    <div>
                        <label>Teléfono de Emergencia:</label>
                        <input type="text" id="emergencyContactPhone" class="form-control" placeholder="+54 11 9999-9999">
                    </div>
                </div>
                
                <h5 style="color: #856404; margin-bottom: 15px;">Contacto Adicional</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Nombre del Contacto Adicional:</label>
                        <input type="text" id="additionalContactName" class="form-control" placeholder="Nombre completo">
                    </div>
                    <div>
                        <label>Teléfono Adicional:</label>
                        <input type="text" id="additionalContactPhone" class="form-control" placeholder="+54 11 9999-9999">
                    </div>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Relación del Contacto Adicional:</label>
                    <select id="additionalContactRelation" class="form-control">
                        <option value="">Seleccionar relación...</option>
                        <option value="family">Familiar</option>
                        <option value="friend">Amigo</option>
                        <option value="neighbor">Vecino</option>
                        <option value="colleague">Compañero de trabajo</option>
                        <option value="other">Otro</option>
                    </select>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('contactInfoModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-warning">Guardar Contactos</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('contactInfoForm').onsubmit = async (e) => {
        e.preventDefault();

        const emergencyContactName = document.getElementById('emergencyContactName').value;
        const emergencyContactPhone = document.getElementById('emergencyContactPhone').value;
        const additionalContactName = document.getElementById('additionalContactName').value;
        const additionalContactPhone = document.getElementById('additionalContactPhone').value;
        const additionalContactRelation = document.getElementById('additionalContactRelation').value;

        try {
            // Guardar en base de datos via API
            const response = await fetch(`/api/v1/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    emergencyContact: emergencyContactName,
                    emergencyPhone: emergencyContactPhone,
                    phone: additionalContactPhone  // Teléfono adicional va a phone
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error al actualizar contactos');
            }

            // Update UI immediately
            if (document.getElementById('emergency-contact')) {
                document.getElementById('emergency-contact').textContent = emergencyContactName || 'No especificado';
            }
            if (document.getElementById('emergency-phone')) {
                document.getElementById('emergency-phone').textContent = emergencyContactPhone || 'No especificado';
            }
            if (document.getElementById('additional-contact')) {
                document.getElementById('additional-contact').textContent = additionalContactName || 'No especificado';
            }
            if (document.getElementById('additional-phone')) {
                document.getElementById('additional-phone').textContent = additionalContactPhone || 'No especificado';
            }

            closeModal('contactInfoModal');
            showUserMessage('✅ Información de contacto actualizada y guardada en BD', 'success');
        } catch (error) {
            console.error('Error guardando contactos:', error);
            showUserMessage('❌ Error al guardar información de contacto', 'danger');
        }
    };
}

function editHealthInsurance(userId) {
    console.log('🏥 [HEALTH] Configurando obra social/prepaga:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'healthInsuranceModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 700px; max-height: 80vh; overflow-y: auto;">
            <h4>🏥 Configurar Obra Social / Prepaga</h4>
            <form id="healthInsuranceForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <h5 style="color: #0c5460;">📋 Información Básica</h5>
                        <div style="margin: 10px 0;">
                            <label>Obra Social / Prepaga:</label>
                            <input type="text" id="insuranceProvider" class="form-control" placeholder="Ej: OSDE, Swiss Medical, IOMA" required>
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Plan:</label>
                            <input type="text" id="insurancePlan" class="form-control" placeholder="Ej: Plan 210, Plan Integral">
                        </div>
                        <div style="margin: 10px 0;">
                            <label>Número de Afiliado:</label>
                            <input type="text" id="memberNumber" class="form-control" placeholder="Número de socio/afiliado">
                        </div>
                    </div>
                    
                    <div>
                        <h5 style="color: #856404;">💰 Modalidad de Cobertura</h5>
                        <div style="margin: 10px 0;">
                            <label>¿Se otorga obra social?</label>
                            <select id="coverageGranted" class="form-control" onchange="toggleCoverageDetails()" required>
                                <option value="">Seleccionar...</option>
                                <option value="yes">Sí</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div id="coverage-details" style="display: none;">
                            <div style="margin: 10px 0;">
                                <label>Modalidad de Pago:</label>
                                <select id="coverageMode" class="form-control">
                                    <option value="company">A cargo de la empresa</option>
                                    <option value="voluntary">Voluntario (empleado)</option>
                                    <option value="shared">En conjunto (empresa + empleado)</option>
                                </select>
                            </div>
                            <div id="shared-details" style="display: none;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
                                    <div>
                                        <label>% Empresa:</label>
                                        <input type="number" id="companyPercentage" class="form-control" min="0" max="100" placeholder="60">
                                    </div>
                                    <div>
                                        <label>% Empleado:</label>
                                        <input type="number" id="employeePercentage" class="form-control" min="0" max="100" placeholder="40" readonly>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Observaciones:</label>
                    <textarea id="insuranceNotes" class="form-control" rows="2" placeholder="Notas adicionales sobre la cobertura..."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('healthInsuranceModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-info">Guardar Configuración</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('companyPercentage').oninput = function() {
        const companyPercent = parseFloat(this.value) || 0;
        document.getElementById('employeePercentage').value = Math.max(0, 100 - companyPercent);
    };
    
    document.getElementById('coverageMode').onchange = function() {
        const sharedDetails = document.getElementById('shared-details');
        sharedDetails.style.display = this.value === 'shared' ? 'block' : 'none';
    };
    
    document.getElementById('healthInsuranceForm').onsubmit = (e) => {
        e.preventDefault();
        const provider = document.getElementById('insuranceProvider').value;
        const plan = document.getElementById('insurancePlan').value;
        const mode = document.getElementById('coverageMode').value;
        const companyPercent = document.getElementById('companyPercentage').value;
        
        // Update UI
        document.getElementById('insurance-provider').textContent = provider || 'No especificada';
        document.getElementById('insurance-plan').textContent = plan || '-';
        
        let modeText = mode === 'company' ? 'A cargo empresa' :
                      mode === 'voluntary' ? 'Voluntario' :
                      mode === 'shared' ? 'En conjunto' : '-';
        document.getElementById('coverage-mode').textContent = modeText;
        document.getElementById('company-percentage').textContent = 
            mode === 'shared' ? companyPercent + '%' : 
            mode === 'company' ? '100%' : '0%';
        
        closeModal('healthInsuranceModal');
        showUserMessage('✅ Configuración de obra social actualizada', 'success');
    };
}

function toggleCoverageDetails() {
    const granted = document.getElementById('coverageGranted').value;
    const details = document.getElementById('coverage-details');
    details.style.display = granted === 'yes' ? 'block' : 'none';
}

// =================== FUNCIONES DE ESTADO CIVIL Y FAMILIA ===================

function editMaritalStatus(userId) {
    console.log('💑 [MARITAL] Editando estado civil:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'maritalStatusModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 700px; max-height: 80vh; overflow-y: auto;">
            <h4>💑 Estado Civil y Cónyuge</h4>
            <form id="maritalStatusForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label>Estado Civil:</label>
                        <select id="maritalStatus" class="form-control" onchange="toggleSpouseDetails()" required>
                            <option value="">Seleccionar...</option>
                            <option value="single">Soltero/a</option>
                            <option value="married">Casado/a</option>
                            <option value="divorced">Divorciado/a</option>
                            <option value="widowed">Viudo/a</option>
                            <option value="common_law">Unión Civil/Concubinato</option>
                            <option value="separated">Separado/a</option>
                        </select>
                    </div>
                    <div>
                        <label>Fecha Matrimonio/Unión:</label>
                        <input type="date" id="marriageDate" class="form-control">
                    </div>
                </div>
                
                <div id="spouse-section" style="display: none;">
                    <h5 style="color: #880e4f; margin-bottom: 15px;">👫 Datos del Cónyuge</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div>
                            <label>Nombre:</label>
                            <input type="text" id="spouseName" class="form-control" placeholder="Nombre">
                        </div>
                        <div>
                            <label>Apellido:</label>
                            <input type="text" id="spouseSurname" class="form-control" placeholder="Apellido">
                        </div>
                        <div>
                            <label>DNI:</label>
                            <input type="text" id="spouseDni" class="form-control" placeholder="DNI del cónyuge">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div>
                            <label>Fecha de Nacimiento:</label>
                            <input type="date" id="spouseBirthdate" class="form-control">
                        </div>
                        <div>
                            <label>¿A cargo económicamente?</label>
                            <select id="spouseDependent" class="form-control">
                                <option value="no">No</option>
                                <option value="yes">Sí</option>
                                <option value="partial">Parcialmente</option>
                            </select>
                        </div>
                        <div>
                            <label>Cobertura Médica:</label>
                            <select id="spouseCoverage" class="form-control">
                                <option value="no">Sin cobertura</option>
                                <option value="included">Incluido en plan familiar</option>
                                <option value="own">Tiene cobertura propia</option>
                                <option value="other">Otra cobertura</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('maritalStatusModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Estado Civil</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('maritalStatusForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            marital_status: document.getElementById('maritalStatus').value || null,
            spouse_name: document.getElementById('spouseName').value || null,
            spouse_dni: document.getElementById('spouseDni').value || null,
            spouse_phone: document.getElementById('spousePhone').value || null,
            spouse_occupation: document.getElementById('spouseOccupation').value || null,
            marriage_date: document.getElementById('marriageDate').value || null,
        };

            const response = await fetch(`/api/v1/user-profile/${userId}/marital-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Estado civil actualizado Error al procesar solicitud');
            }

            closeModal('maritalStatusModal');
            showUserMessage('✅ Estado civil actualizado exitosamente', 'success');

            if (typeof loadMaritalStatus === 'function') { loadMaritalStatus(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function toggleSpouseDetails() {
    const status = document.getElementById('maritalStatus').value;
    const spouseSection = document.getElementById('spouse-section');
    spouseSection.style.display = ['married', 'common_law'].includes(status) ? 'block' : 'none';
}

function addChild(userId) {
    console.log('👶 [CHILDREN] Agregando hijo:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'childModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>👶 Agregar Hijo</h4>
            <form id="childForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Nombre:</label>
                        <input type="text" id="childName" class="form-control" required>
                    </div>
                    <div>
                        <label>Apellido:</label>
                        <input type="text" id="childSurname" class="form-control" required>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Fecha de Nacimiento:</label>
                        <input type="date" id="childBirthdate" class="form-control" required>
                    </div>
                    <div>
                        <label>DNI:</label>
                        <input type="text" id="childDni" class="form-control" placeholder="Si tiene DNI">
                    </div>
                    <div>
                        <label>Sexo:</label>
                        <select id="childGender" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>¿Vive con el empleado?</label>
                        <select id="childLivesWith" class="form-control" required>
                            <option value="yes">Sí</option>
                            <option value="no">No</option>
                            <option value="partial">Parcialmente</option>
                        </select>
                    </div>
                    <div>
                        <label>¿A cargo económicamente?</label>
                        <select id="childDependent" class="form-control" required>
                            <option value="yes">Sí</option>
                            <option value="no">No</option>
                            <option value="partial">Parcialmente</option>
                        </select>
                    </div>
                    <div>
                        <label>Cobertura Médica:</label>
                        <select id="childCoverage" class="form-control">
                            <option value="included">Incluido en plan familiar</option>
                            <option value="none">Sin cobertura</option>
                            <option value="other">Otra cobertura</option>
                        </select>
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>Observaciones:</label>
                    <textarea id="childNotes" class="form-control" rows="2" placeholder="Información adicional sobre el hijo..."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('childModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-info">Agregar Hijo</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('childForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            full_name: document.getElementById('childFullName').value || null,
            birth_date: document.getElementById('childBirthDate').value || null,
            dni: document.getElementById('childDni').value || null,
            gender: document.getElementById('childGender').value || null,
            lives_with_employee: document.getElementById('livesWithEmployee')?.checked || false,
            is_student: document.getElementById('isStudent')?.checked || false,
            school_name: document.getElementById('schoolName').value || null,
        };

            const response = await fetch(`/api/v1/user-profile/${userId}/children`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Hijo/a agregado/a Error al procesar solicitud');
            }

            closeModal('childModal');
            showUserMessage('✅ Hijo/a agregado/a exitosamente', 'success');

            if (typeof loadChildren === 'function') { loadChildren(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

// =================== FUNCIONES MÉDICAS AVANZADAS ===================

function editPrimaryCarePhysician(userId) {
    console.log('🏥 [MEDICAL] Editando médico de cabecera:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'primaryCareModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>👨‍⚕️ Médico de Cabecera</h4>
            <form id="primaryCareForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Nombre del Médico:</label>
                        <input type="text" id="doctorName" class="form-control" placeholder="Dr./Dra. Nombre Apellido" required>
                    </div>
                    <div>
                        <label>Especialidad:</label>
                        <input type="text" id="doctorSpecialty" class="form-control" placeholder="Ej: Clínica Médica">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Teléfono:</label>
                        <input type="text" id="doctorPhone" class="form-control" placeholder="+54 11 9999-9999" required>
                    </div>
                    <div>
                        <label>Email:</label>
                        <input type="email" id="doctorEmail" class="form-control" placeholder="doctor@email.com">
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>Dirección del Consultorio:</label>
                    <input type="text" id="doctorAddress" class="form-control" placeholder="Dirección completa">
                </div>
                <div style="margin: 15px 0;">
                    <label>Obra Social que Acepta:</label>
                    <input type="text" id="doctorInsurance" class="form-control" placeholder="Obras sociales que acepta">
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('primaryCareModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Guardar Médico</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('primaryCareForm').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('doctorName').value;
        const specialty = document.getElementById('doctorSpecialty').value;
        const phone = document.getElementById('doctorPhone').value;
        const address = document.getElementById('doctorAddress').value;
        const insurance = document.getElementById('doctorInsurance').value;
        
        // Update UI
        document.getElementById('doctor-name').textContent = name;
        document.getElementById('doctor-specialty').textContent = specialty || '-';
        document.getElementById('doctor-phone').textContent = phone;
        document.getElementById('doctor-address').textContent = address || '-';
        document.getElementById('doctor-insurance').textContent = insurance || '-';
        
        closeModal('primaryCareModal');
        showUserMessage('✅ Médico de cabecera actualizado', 'success');
    };
}

function editMedicalEmergencyContact(userId) {
    console.log('🚨 [MEDICAL] Editando contacto médico de emergencia:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'medicalEmergencyModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>🚨 Contacto de Emergencia Médica</h4>
            <form id="medicalEmergencyForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Contactar a:</label>
                        <input type="text" id="emergencyMedicalContact" class="form-control" placeholder="Nombre completo" required>
                    </div>
                    <div>
                        <label>Teléfono:</label>
                        <input type="text" id="emergencyMedicalPhone" class="form-control" placeholder="+54 11 9999-9999" required>
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>Relación:</label>
                    <select id="emergencyMedicalRelation" class="form-control" required>
                        <option value="">Seleccionar...</option>
                        <option value="family">Familiar</option>
                        <option value="spouse">Cónyuge</option>
                        <option value="doctor">Médico tratante</option>
                        <option value="friend">Amigo</option>
                        <option value="other">Otro</option>
                    </select>
                </div>
                <div style="margin: 15px 0;">
                    <label>⚠️ Instrucciones Específicas de Emergencia:</label>
                    <textarea id="emergencyInstructions" class="form-control" rows="4" 
                              placeholder="Ej: Contactar inmediatamente en caso de convulsiones. Avisar sobre alergia a penicilina. Diabético tipo 1 - verificar glucosa..."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('medicalEmergencyModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-danger">Guardar Contacto</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('medicalEmergencyForm').onsubmit = (e) => {
        e.preventDefault();
        const contact = document.getElementById('emergencyMedicalContact').value;
        const phone = document.getElementById('emergencyMedicalPhone').value;
        const relation = document.getElementById('emergencyMedicalRelation').value;
        const instructions = document.getElementById('emergencyInstructions').value;
        
        // Update UI
        document.getElementById('emergency-medical-contact').textContent = contact;
        document.getElementById('emergency-medical-phone').textContent = phone;
        
        const relationText = {
            'family': 'Familiar',
            'spouse': 'Cónyuge',
            'doctor': 'Médico tratante',
            'friend': 'Amigo',
            'other': 'Otro'
        };
        document.getElementById('emergency-medical-relation').textContent = relationText[relation] || '-';
        document.getElementById('emergency-instructions').textContent = instructions || 'Sin instrucciones específicas';
        
        closeModal('medicalEmergencyModal');
        showUserMessage('✅ Contacto de emergencia médica actualizado', 'success');
    };
}

function addChronicCondition(userId) {
    console.log('🏥 [MEDICAL] Agregando condición crónica:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'chronicConditionModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>🏥 Enfermedad/Discapacidad Crónica</h4>
            <form id="chronicConditionForm">
                <div style="margin: 15px 0;">
                    <label>Condición/Enfermedad:</label>
                    <select id="conditionType" class="form-control" onchange="toggleCustomCondition()" required>
                        <option value="">Seleccionar...</option>
                        <option value="diabetes">Diabetes</option>
                        <option value="hypertension">Hipertensión</option>
                        <option value="asthma">Asma</option>
                        <option value="epilepsy">Epilepsia</option>
                        <option value="heart_disease">Enfermedad Cardíaca</option>
                        <option value="arthritis">Artritis</option>
                        <option value="depression">Depresión</option>
                        <option value="anxiety">Ansiedad</option>
                        <option value="visual_impairment">Discapacidad Visual</option>
                        <option value="hearing_impairment">Discapacidad Auditiva</option>
                        <option value="mobility_impairment">Discapacidad Motriz</option>
                        <option value="custom">Otra (especificar)</option>
                    </select>
                </div>
                <div id="customCondition" style="margin: 15px 0; display: none;">
                    <label>Especificar Condición:</label>
                    <input type="text" id="customConditionName" class="form-control" placeholder="Nombre de la condición">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                    <div>
                        <label>Severidad:</label>
                        <select id="conditionSeverity" class="form-control" required>
                            <option value="mild">Leve</option>
                            <option value="moderate">Moderada</option>
                            <option value="severe">Severa</option>
                        </select>
                    </div>
                    <div>
                        <label>Fecha Diagnóstico:</label>
                        <input type="date" id="diagnosisDate" class="form-control">
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>Descripción/Observaciones:</label>
                    <textarea id="conditionDescription" class="form-control" rows="3" 
                              placeholder="Detalles sobre la condición, tratamiento, limitaciones..."></textarea>
                </div>
                <div style="margin: 15px 0;">
                    <label>
                        <input type="checkbox" id="requiresMonitoring"> ¿Requiere monitoreo especial en el trabajo?
                    </label>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('chronicConditionModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-warning">Agregar Condición</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('chronicConditionForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            condition_name: document.getElementById('conditionName').value || null,
            diagnosis_date: document.getElementById('diagnosisDate').value || null,
            severity: document.getElementById('severity').value || null,
            requires_treatment: document.getElementById('requiresTreatment')?.checked || false,
            requires_monitoring: document.getElementById('requiresMonitoring')?.checked || false,
            notes: document.getElementById('conditionNotes').value || null,
        };

            const response = await fetch(`/api/v1/user-medical/${userId}/chronic-conditions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Condición crónica agregada Error al procesar solicitud');
            }

            closeModal('chronicConditionModal');
            showUserMessage('✅ Condición crónica agregada exitosamente', 'success');

            if (typeof loadChronicConditions === 'function') { loadChronicConditions(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function toggleCustomCondition() {
    const type = document.getElementById('conditionType').value;
    const customDiv = document.getElementById('customCondition');
    customDiv.style.display = type === 'custom' ? 'block' : 'none';
}

function addMedication(userId) {
    console.log('💊 [MEDICAL] Agregando medicación:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'medicationModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>💊 Medicación Frecuente</h4>
            <form id="medicationForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Nombre del Medicamento:</label>
                        <input type="text" id="medicationName" class="form-control" placeholder="Ej: Metformina" required>
                    </div>
                    <div>
                        <label>Dosis:</label>
                        <input type="text" id="medicationDose" class="form-control" placeholder="Ej: 500mg" required>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Frecuencia:</label>
                        <select id="medicationFrequency" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="daily">Diario</option>
                            <option value="twice_daily">2 veces al día</option>
                            <option value="three_times_daily">3 veces al día</option>
                            <option value="weekly">Semanal</option>
                            <option value="as_needed">Según necesidad</option>
                            <option value="other">Otra frecuencia</option>
                        </select>
                    </div>
                    <div>
                        <label>Hora(s) de toma:</label>
                        <input type="text" id="medicationTime" class="form-control" placeholder="Ej: 8:00, 20:00">
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>Condición que trata:</label>
                    <input type="text" id="medicationCondition" class="form-control" placeholder="Ej: Diabetes, Hipertensión">
                </div>
                <div style="margin: 15px 0;">
                    <label>Médico que prescribe:</label>
                    <input type="text" id="prescribingDoctor" class="form-control" placeholder="Dr./Dra. Nombre">
                </div>
                <div style="margin: 15px 0;">
                    <label>Observaciones/Efectos secundarios:</label>
                    <textarea id="medicationNotes" class="form-control" rows="2" 
                              placeholder="Efectos secundarios conocidos, instrucciones especiales..."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('medicationModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-info">Agregar Medicación</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('medicationForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            medication_name: document.getElementById('medicationName').value || null,
            dosage: document.getElementById('dosage').value || null,
            frequency: document.getElementById('frequency').value || null,
            route: document.getElementById('route').value || null,
            start_date: document.getElementById('medStartDate').value || null,
            end_date: document.getElementById('medEndDate').value || null,
            is_continuous: document.getElementById('isContinuous')?.checked || false,
            prescribing_doctor: document.getElementById('prescribingDoctor').value || null,
            purpose: document.getElementById('medPurpose').value || null,
        };

            const response = await fetch(`/api/v1/user-medical/${userId}/medications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Medicamento agregado Error al procesar solicitud');
            }

            closeModal('medicationModal');
            showUserMessage('✅ Medicamento agregado exitosamente', 'success');

            if (typeof loadMedications === 'function') { loadMedications(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function addAllergy(userId) {
    console.log('🚫 [MEDICAL] Agregando alergia:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'allergyModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>🚫 Alergia</h4>
            <form id="allergyForm">
                <div style="margin: 15px 0;">
                    <label>Tipo de Alergia:</label>
                    <select id="allergyType" class="form-control" onchange="toggleCustomAllergy()" required>
                        <option value="">Seleccionar...</option>
                        <option value="food">Alimentaria</option>
                        <option value="medication">Medicamentos</option>
                        <option value="environmental">Ambiental</option>
                        <option value="chemical">Química</option>
                        <option value="latex">Látex</option>
                        <option value="insect">Picaduras de insectos</option>
                        <option value="custom">Otra (especificar)</option>
                    </select>
                </div>
                <div style="margin: 15px 0;">
                    <label>Alérgeno Específico:</label>
                    <input type="text" id="allergen" class="form-control" placeholder="Ej: Penicilina, Maní, Polen" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                    <div>
                        <label>Severidad:</label>
                        <select id="allergySeverity" class="form-control" required>
                            <option value="mild">Leve</option>
                            <option value="moderate">Moderada</option>
                            <option value="severe">Severa</option>
                            <option value="anaphylactic">Anafiláctica</option>
                        </select>
                    </div>
                    <div>
                        <label>¿Porta Epinefrina?</label>
                        <select id="carriesEpipen" class="form-control">
                            <option value="no">No</option>
                            <option value="yes">Sí</option>
                        </select>
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>Síntomas/Reacciones:</label>
                    <textarea id="allergySymptoms" class="form-control" rows="3" 
                              placeholder="Ej: Urticaria, dificultad respiratoria, hinchazón..."></textarea>
                </div>
                <div style="margin: 15px 0;">
                    <label>Fecha Último Episodio:</label>
                    <input type="date" id="lastReaction" class="form-control">
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('allergyModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-danger">Agregar Alergia</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('allergyForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            allergen: document.getElementById('allergen').value || null,
            allergy_type: document.getElementById('allergyType').value || null,
            severity: document.getElementById('allergySeverity').value || null,
            symptoms: document.getElementById('symptoms').value || null,
            diagnosed_date: document.getElementById('allergyDiagnosedDate').value || null,
            requires_epipen: document.getElementById('requiresEpipen')?.checked || false,
            notes: document.getElementById('allergyNotes').value || null,
        };

            const response = await fetch(`/api/v1/user-medical/${userId}/allergies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Alergia agregada Error al procesar solicitud');
            }

            closeModal('allergyModal');
            showUserMessage('✅ Alergia agregada exitosamente', 'success');

            if (typeof loadAllergies === 'function') { loadAllergies(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function addActivityRestriction(userId) {
    console.log('🚷 [MEDICAL] Agregando restricción de actividad:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'activityRestrictionModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>🚷 Restricción de Actividad</h4>
            <form id="activityRestrictionForm">
                <div style="margin: 15px 0;">
                    <label>Tipo de Restricción:</label>
                    <select id="restrictionType" class="form-control" required>
                        <option value="">Seleccionar...</option>
                        <option value="physical">Física</option>
                        <option value="visual">Visual</option>
                        <option value="auditory">Auditiva</option>
                        <option value="cognitive">Cognitiva</option>
                        <option value="respiratory">Respiratoria</option>
                        <option value="cardiac">Cardíaca</option>
                        <option value="postural">Postural</option>
                        <option value="environmental">Ambiental</option>
                    </select>
                </div>
                <div style="margin: 15px 0;">
                    <label>Actividad Restringida:</label>
                    <input type="text" id="restrictedActivity" class="form-control" 
                           placeholder="Ej: Levantar más de 10kg, Trabajar en altura, Conducir" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                    <div>
                        <label>Duración:</label>
                        <select id="restrictionDuration" class="form-control" required>
                            <option value="temporary">Temporal</option>
                            <option value="permanent">Permanente</option>
                            <option value="conditional">Condicional</option>
                        </select>
                    </div>
                    <div>
                        <label>Fecha Vencimiento (si aplica):</label>
                        <input type="date" id="restrictionExpiry" class="form-control">
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>Motivo Médico:</label>
                    <textarea id="restrictionReason" class="form-control" rows="2" 
                              placeholder="Razón médica para la restricción..."></textarea>
                </div>
                <div style="margin: 15px 0;">
                    <label>Alternativas/Adaptaciones:</label>
                    <textarea id="alternatives" class="form-control" rows="2" 
                              placeholder="Actividades alternativas o adaptaciones posibles..."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('activityRestrictionModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-info">Agregar Restricción</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('activityRestrictionForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            restriction_type: document.getElementById('activityRestrictionType').value || null,
            description: document.getElementById('activityDescription').value || null,
            start_date: document.getElementById('activityStartDate').value || null,
            end_date: document.getElementById('activityEndDate').value || null,
            is_permanent: document.getElementById('isPermanentActivity')?.checked || false,
            prescribed_by: document.getElementById('prescribedByActivity').value || null,
        };

            const response = await fetch(`/api/v1/user-medical/${userId}/activity-restrictions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Restricción de actividad agregada Error al procesar solicitud');
            }

            closeModal('activityRestrictionModal');
            showUserMessage('✅ Restricción de actividad agregada exitosamente', 'success');

            if (typeof loadActivityRestrictions === 'function') { loadActivityRestrictions(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function addWorkRestriction(userId) {
    console.log('⚠️ [MEDICAL] Agregando restricción laboral:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'workRestrictionModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 700px; max-height: 80vh; overflow-y: auto;">
            <h4>⚠️ Restricciones Laborales</h4>
            <form id="workRestrictionForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <h5 style="color: #2e7d32;">🟢 Tareas que PUEDE realizar:</h5>
                        <textarea id="allowedTasks" class="form-control" rows="4" 
                                  placeholder="Ej: Trabajo de oficina, atención al cliente, tareas administrativas...">${document.getElementById('allowed-tasks').textContent === 'Todas las tareas estándar' ? '' : document.getElementById('allowed-tasks').textContent}</textarea>
                    </div>
                    <div>
                        <h5 style="color: #d32f2f;">🔴 Tareas que NO puede realizar:</h5>
                        <textarea id="restrictedTasks" class="form-control" rows="4" 
                                  placeholder="Ej: Levantar más de 5kg, trabajar en altura, manejar maquinaria...">${document.getElementById('restricted-tasks').textContent === 'Sin restricciones' ? '' : document.getElementById('restricted-tasks').textContent}</textarea>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <h5 style="color: #512da8;">📋 Aprobación Médica</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <div>
                            <label>Médico Tratante:</label>
                            <input type="text" id="treatingDoctor" class="form-control" placeholder="Dr./Dra. Nombre">
                        </div>
                        <div>
                            <label>Médico de la Empresa:</label>
                            <input type="text" id="companyDoctor" class="form-control" placeholder="Dr./Dra. Nombre">
                        </div>
                        <div>
                            <label>Estado de Aprobación:</label>
                            <select id="approvalStatus" class="form-control">
                                <option value="pending">Pendiente</option>
                                <option value="approved">Aprobado</option>
                                <option value="rejected">Rechazado</option>
                                <option value="under_review">En revisión</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label>Fecha de Evaluación:</label>
                            <input type="date" id="evaluationDate" class="form-control">
                        </div>
                        <div>
                            <label>Próxima Revisión:</label>
                            <input type="date" id="nextReviewDate" class="form-control">
                        </div>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <label>
                        <input type="checkbox" id="clinicalHistoryUploaded"> Historia clínica subida al sistema
                    </label>
                </div>
                
                <div style="margin: 20px 0;">
                    <label>Observaciones médicas:</label>
                    <textarea id="medicalObservations" class="form-control" rows="3" 
                              placeholder="Observaciones del médico tratante y de la empresa..."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('workRestrictionModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Actualizar Restricciones</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('workRestrictionForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            restriction_type: document.getElementById('workRestrictionType').value || null,
            description: document.getElementById('workRestrictionDescription').value || null,
            start_date: document.getElementById('workRestrictionStartDate').value || null,
            end_date: document.getElementById('workRestrictionEndDate').value || null,
            is_permanent: document.getElementById('isPermanentWork')?.checked || false,
            affects_current_position: document.getElementById('affectsCurrentPosition')?.checked || false,
            prescribed_by: document.getElementById('prescribedByWork').value || null,
        };

            const response = await fetch(`/api/v1/user-medical/${userId}/work-restrictions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Restricción laboral agregada Error al procesar solicitud');
            }

            closeModal('workRestrictionModal');
            showUserMessage('✅ Restricción laboral agregada exitosamente', 'success');

            if (typeof loadWorkRestrictions === 'function') { loadWorkRestrictions(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function editMentalHealth(userId) {
    console.log('🧠 [MEDICAL] Editando salud mental:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'mentalHealthModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>🧠 Salud Mental</h4>
            <form id="mentalHealthForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Depresión:</label>
                        <select id="depressionStatus" class="form-control">
                            <option value="none">No registrada</option>
                            <option value="mild">Leve</option>
                            <option value="moderate">Moderada</option>
                            <option value="severe">Severa</option>
                            <option value="history">Antecedentes</option>
                        </select>
                    </div>
                    <div>
                        <label>Ansiedad:</label>
                        <select id="anxietyStatus" class="form-control">
                            <option value="none">No registrada</option>
                            <option value="mild">Leve</option>
                            <option value="moderate">Moderada</option>
                            <option value="severe">Severa</option>
                            <option value="panic">Trastorno de pánico</option>
                            <option value="history">Antecedentes</option>
                        </select>
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>Tratamiento Actual:</label>
                    <textarea id="mentalTreatment" class="form-control" rows="2" 
                              placeholder="Ej: Terapia psicológica semanal, medicación antidepresiva..."></textarea>
                </div>
                <div style="margin: 15px 0;">
                    <label>Profesional Tratante:</label>
                    <input type="text" id="mentalHealthProfessional" class="form-control" 
                           placeholder="Psicólogo/Psiquiatra tratante">
                </div>
                <div style="margin: 15px 0;">
                    <label>
                        <input type="checkbox" id="workImpact"> ¿Afecta el desempeño laboral?
                    </label>
                </div>
                <div style="margin: 15px 0;">
                    <label>Observaciones:</label>
                    <textarea id="mentalHealthNotes" class="form-control" rows="3" 
                              placeholder="Observaciones adicionales, adaptaciones necesarias..."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('mentalHealthModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-secondary">Actualizar Salud Mental</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('mentalHealthForm').onsubmit = (e) => {
        e.preventDefault();
        const depression = document.getElementById('depressionStatus').value;
        const anxiety = document.getElementById('anxietyStatus').value;
        const treatment = document.getElementById('mentalTreatment').value;
        const professional = document.getElementById('mentalHealthProfessional').value;
        const workImpact = document.getElementById('workImpact').checked;
        const notes = document.getElementById('mentalHealthNotes').value;
        
        const statusText = {
            'none': 'No registrada',
            'mild': 'Leve',
            'moderate': 'Moderada',
            'severe': 'Severa',
            'panic': 'Trastorno pánico',
            'history': 'Antecedentes'
        };
        
        // Update UI
        document.getElementById('depression-status').textContent = statusText[depression] || 'No registrada';
        document.getElementById('anxiety-status').textContent = statusText[anxiety] || 'No registrada';
        document.getElementById('mental-treatment').textContent = treatment || '-';
        
        let notesText = notes;
        if (professional) notesText = `Profesional: ${professional}. ${notesText}`;
        if (workImpact) notesText = `⚠️ Afecta desempeño laboral. ${notesText}`;
        
        document.getElementById('mental-health-notes').textContent = notesText || '-';
        
        closeModal('mentalHealthModal');
        showUserMessage('✅ Información de salud mental actualizada', 'success');
    };
}

function addVaccination(userId) {
    console.log('💉 [MEDICAL] Agregando vacuna:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'vaccinationModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>💉 Vacuna</h4>
            <form id="vaccinationForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Tipo de Vacuna:</label>
                        <select id="vaccineType" class="form-control" onchange="toggleCustomVaccine()" required>
                            <option value="">Seleccionar...</option>
                            <option value="covid19">COVID-19</option>
                            <option value="influenza">Influenza (Gripe)</option>
                            <option value="hepatitis_b">Hepatitis B</option>
                            <option value="tetanus">Tétanos</option>
                            <option value="pneumonia">Neumonía</option>
                            <option value="meningitis">Meningitis</option>
                            <option value="yellow_fever">Fiebre Amarilla</option>
                            <option value="mmr">Triple Viral (MMR)</option>
                            <option value="hpv">HPV</option>
                            <option value="chickenpox">Varicela</option>
                            <option value="custom">Otra (especificar)</option>
                        </select>
                    </div>
                    <div>
                        <label>Fecha de Aplicación:</label>
                        <input type="date" id="vaccineDate" class="form-control" required>
                    </div>
                </div>
                
                <div id="customVaccine" style="margin: 15px 0; display: none;">
                    <label>Especificar Vacuna:</label>
                    <input type="text" id="customVaccineName" class="form-control" placeholder="Nombre de la vacuna">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Dosis:</label>
                        <select id="vaccinedose" class="form-control" required>
                            <option value="1">Primera dosis</option>
                            <option value="2">Segunda dosis</option>
                            <option value="3">Tercera dosis</option>
                            <option value="4">Cuarta dosis</option>
                            <option value="booster">Refuerzo</option>
                            <option value="annual">Anual</option>
                            <option value="single">Dosis única</option>
                        </select>
                    </div>
                    <div>
                        <label>Lote:</label>
                        <input type="text" id="vaccineLot" class="form-control" placeholder="Número de lote">
                    </div>
                    <div>
                        <label>Próxima Dosis:</label>
                        <input type="date" id="nextDose" class="form-control">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Centro de Vacunación:</label>
                        <input type="text" id="vaccinationCenter" class="form-control" placeholder="Hospital, centro de salud, farmacia">
                    </div>
                    <div>
                        <label>Médico/Enfermero:</label>
                        <input type="text" id="administeredBy" class="form-control" placeholder="Profesional que aplicó">
                    </div>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Reacciones Adversas:</label>
                    <textarea id="vaccineReactions" class="form-control" rows="2" 
                              placeholder="Dolor en el lugar de aplicación, fiebre, etc. (Opcional)"></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('vaccinationModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Agregar Vacuna</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('vaccinationForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            vaccine_name: document.getElementById('vaccineName').value || null,
            vaccine_type: document.getElementById('vaccineType').value || null,
            dose_number: parseInt(document.getElementById('doseNumber').value) || 1,
            administration_date: document.getElementById('administrationDate').value || null,
            next_dose_date: document.getElementById('nextDoseDate').value || null,
            administered_by: document.getElementById('administeredBy').value || null,
            batch_number: document.getElementById('batchNumber').value || null,
            location: document.getElementById('vaccinationLocation').value || null,
        };

            const response = await fetch(`/api/v1/user-medical/${userId}/vaccinations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Vacunación agregada Error al procesar solicitud');
            }

            closeModal('vaccinationModal');
            showUserMessage('✅ Vacunación agregada exitosamente', 'success');

            if (typeof loadVaccinations === 'function') { loadVaccinations(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function toggleCustomVaccine() {
    const type = document.getElementById('vaccineType').value;
    const customDiv = document.getElementById('customVaccine');
    customDiv.style.display = type === 'custom' ? 'block' : 'none';
}

function addMedicalExam(userId) {
    console.log('🔬 [MEDICAL] Agregando examen médico:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'medicalExamModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>🔬 Examen Médico</h4>
            <form id="medicalExamForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Tipo de Examen:</label>
                        <select id="examType" class="form-control" onchange="toggleCustomExam()" required>
                            <option value="">Seleccionar...</option>
                            <option value="preoccupational">Preocupacional</option>
                            <option value="annual">Chequeo Anual</option>
                            <option value="blood_test">Análisis de Sangre</option>
                            <option value="urine_test">Análisis de Orina</option>
                            <option value="chest_xray">Radiografía de Tórax</option>
                            <option value="ecg">Electrocardiograma</option>
                            <option value="audiometry">Audiometría</option>
                            <option value="vision_test">Examen Visual</option>
                            <option value="stress_test">Test de Esfuerzo</option>
                            <option value="spirometry">Espirometría</option>
                            <option value="custom">Otro (especificar)</option>
                        </select>
                    </div>
                    <div>
                        <label>Fecha del Examen:</label>
                        <input type="date" id="examDate" class="form-control" required>
                    </div>
                </div>
                
                <div id="customExam" style="margin: 15px 0; display: none;">
                    <label>Especificar Examen:</label>
                    <input type="text" id="customExamName" class="form-control" placeholder="Nombre del examen">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Resultado:</label>
                        <select id="examResult" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="normal">Normal</option>
                            <option value="abnormal">Alterado</option>
                            <option value="pending">Pendiente</option>
                            <option value="follow_up">Requiere seguimiento</option>
                        </select>
                    </div>
                    <div>
                        <label>Próximo Control:</label>
                        <input type="date" id="nextControl" class="form-control">
                    </div>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Centro Médico:</label>
                    <input type="text" id="medicalCenter" class="form-control" placeholder="Hospital, clínica, laboratorio">
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Médico:</label>
                    <input type="text" id="examDoctor" class="form-control" placeholder="Dr./Dra. que realizó el examen">
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Observaciones/Resultados:</label>
                    <textarea id="examNotes" class="form-control" rows="3" 
                              placeholder="Detalles del resultado, valores específicos, recomendaciones..."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('medicalExamModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Agregar Examen</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('medicalExamForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
            exam_type: document.getElementById('examType').value || null,
            exam_date: document.getElementById('examDate').value || null,
            result: document.getElementById('examResult').value || null,
            performed_by: document.getElementById('performedBy').value || null,
            facility_name: document.getElementById('facilityName').value || null,
            next_exam_date: document.getElementById('nextExamDate').value || null,
            is_fit_for_work: document.getElementById('isFitForWork')?.checked || true,
            notes: document.getElementById('examNotes').value || null,
        };

            const response = await fetch(`/api/v1/user-medical/${userId}/medical-exams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Examen médico agregado Error al procesar solicitud');
            }

            closeModal('medicalExamModal');
            showUserMessage('✅ Examen médico agregado exitosamente', 'success');

            if (typeof loadMedicalExams === 'function') { loadMedicalExams(userId); }
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function toggleCustomExam() {
    const type = document.getElementById('examType').value;
    const customDiv = document.getElementById('customExam');
    customDiv.style.display = type === 'custom' ? 'block' : 'none';
}

function uploadMedicalDocument(userId) {
    console.log('📄 [MEDICAL] Subiendo documento médico:', userId);
    showUserMessage('📄 Funcionalidad de carga de documentos - Sistema de archivos en desarrollo', 'info');
}

function addMedicalEvent(userId) {
    console.log('📋 [MEDICAL] Agregando evento médico:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'medicalEventModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>📋 Evento Médico</h4>
            <form id="medicalEventForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Tipo de Evento:</label>
                        <select id="eventType" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="consultation">Consulta médica</option>
                            <option value="hospitalization">Hospitalización</option>
                            <option value="surgery">Cirugía</option>
                            <option value="accident">Accidente laboral</option>
                            <option value="illness">Enfermedad</option>
                            <option value="therapy">Terapia/Rehabilitación</option>
                            <option value="specialist">Consulta especialista</option>
                            <option value="emergency">Emergencia médica</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label>Fecha del Evento:</label>
                        <input type="date" id="eventDate" class="form-control" required>
                    </div>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Descripción del Evento:</label>
                    <textarea id="eventDescription" class="form-control" rows="3" 
                              placeholder="Descripción detallada del evento médico..." required></textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Centro Médico:</label>
                        <input type="text" id="eventCenter" class="form-control" placeholder="Hospital, clínica">
                    </div>
                    <div>
                        <label>Médico Tratante:</label>
                        <input type="text" id="eventDoctor" class="form-control" placeholder="Dr./Dra.">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>¿Afecta trabajo?</label>
                        <select id="worklmpact" class="form-control">
                            <option value="no">No</option>
                            <option value="temporary">Temporalmente</option>
                            <option value="permanent">Permanentemente</option>
                        </select>
                    </div>
                    <div>
                        <label>Días de baja (si aplica):</label>
                        <input type="number" id="sickDays" class="form-control" min="0" placeholder="0">
                    </div>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>Tratamiento/Seguimiento:</label>
                    <textarea id="treatment" class="form-control" rows="2" 
                              placeholder="Medicación prescrita, tratamiento recomendado..."></textarea>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('medicalEventModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Agregar Evento</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('medicalEventForm').onsubmit = (e) => {
        e.preventDefault();
        const type = document.getElementById('eventType').value;
        const date = document.getElementById('eventDate').value;
        const description = document.getElementById('eventDescription').value;
        const center = document.getElementById('eventCenter').value;
        const doctor = document.getElementById('eventDoctor').value;
        const workImpact = document.getElementById('worklmpact').value;
        const sickDays = document.getElementById('sickDays').value;
        const treatment = document.getElementById('treatment').value;
        
        const eventTypes = {
            'consultation': 'Consulta médica',
            'hospitalization': 'Hospitalización',
            'surgery': 'Cirugía',
            'accident': 'Accidente laboral',
            'illness': 'Enfermedad',
            'therapy': 'Terapia/Rehabilitación',
            'specialist': 'Consulta especialista',
            'emergency': 'Emergencia médica',
            'other': 'Otro'
        };
        
        const workImpactText = {
            'no': '',
            'temporary': '⚠️ Afecta trabajo temporalmente',
            'permanent': '🚫 Afecta trabajo permanentemente'
        };
        
        // Create event card
        const eventCard = document.createElement('div');
        eventCard.style.cssText = 'background: #f8f9fa; border-left: 4px solid #6c757d; padding: 10px; border-radius: 4px; margin-bottom: 8px;';
        
        eventCard.innerHTML = `
            <div style="font-size: 13px;">
                <div style="font-weight: bold; color: #495057;">${eventTypes[type]} - ${new Date(date).toLocaleDateString()}</div>
                <div style="font-size: 11px; margin-top: 4px;">${description}</div>
                ${center ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">🏥 ${center}${doctor ? ' - ' + doctor : ''}</div>` : ''}
                ${workImpact !== 'no' ? `<div style="font-size: 11px; color: #856404; margin-top: 4px;">${workImpactText[workImpact]}${sickDays ? ' - ' + sickDays + ' días' : ''}</div>` : ''}
                ${treatment ? `<div style="font-size: 11px; color: #28a745; margin-top: 4px;">💊 ${treatment}</div>` : ''}
            </div>
        `;
        
        // Add to events list
        const eventsList = document.getElementById('medical-events-list');
        if (eventsList.querySelector('p')) {
            eventsList.innerHTML = '';
        }
        eventsList.appendChild(eventCard);
        
        closeModal('medicalEventModal');
        showUserMessage(`✅ Evento médico ${eventTypes[type]} agregado`, 'success');
    };
}

// =================== FUNCIONES DE DOCUMENTACIÓN PERSONAL ===================

function managePersonalDocuments(userId) {
    console.log('📄 [DOCUMENTS] Gestionando documentación personal:', userId);
    showUserMessage('📄 Vista general de documentación - Use los botones individuales para cada documento', 'info');
}

function uploadDNIPhotos(userId) {
    console.log('🆔 [DNI] Subiendo fotos del DNI:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'dniPhotosModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>🆔 Fotos del DNI/Documento de Identidad</h4>
            <form id="dniPhotosForm">
                <div style="margin: 15px 0;">
                    <label>📷 Foto Frente del DNI:</label>
                    <input type="file" id="dniFront" class="form-control" accept="image/*" required>
                    <small style="color: #666;">Sube una imagen clara del frente del documento</small>
                </div>
                
                <div style="margin: 15px 0;">
                    <label>📷 Foto Dorso del DNI:</label>
                    <input type="file" id="dniBack" class="form-control" accept="image/*" required>
                    <small style="color: #666;">Sube una imagen clara del dorso del documento</small>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                    <div>
                        <label>Número de Documento:</label>
                        <input type="text" id="dniNumber" class="form-control" placeholder="Número del DNI">
                    </div>
                    <div>
                        <label>Fecha de Vencimiento:</label>
                        <input type="date" id="dniExpiry" class="form-control">
                    </div>
                </div>
                
                <div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin: 15px 0;">
                    <small style="color: #856404;">
                        ⚠️ Las fotos se almacenarán de forma segura y encriptada. Solo personal autorizado tendrá acceso.
                    </small>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('dniPhotosModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Subir Fotos</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('dniPhotosForm').onsubmit = (e) => {
        e.preventDefault();
        const frontFile = document.getElementById('dniFront').files[0];
        const backFile = document.getElementById('dniBack').files[0];
        const number = document.getElementById('dniNumber').value;
        const expiry = document.getElementById('dniExpiry').value;
        
        // Simulate file upload
        setTimeout(() => {
            document.getElementById('dni-info').textContent = 
                `${number || 'DNI'} - Fotos subidas ${expiry ? '• Vence: ' + new Date(expiry).toLocaleDateString() : ''}`;
            
            closeModal('dniPhotosModal');
            showUserMessage('✅ Fotos del DNI subidas correctamente', 'success');
            updateDocumentStatus();
        }, 2000);
        
        showUserMessage('📤 Subiendo fotos del DNI...', 'info');
    };
}

function managePassport(userId) {
    console.log('📘 [PASSPORT] Gestionando pasaporte:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'passportModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>📘 Información del Pasaporte</h4>
            <form id="passportForm">
                <div style="margin: 15px 0;">
                    <label>¿Posee Pasaporte?</label>
                    <select id="hasPassport" class="form-control" onchange="togglePassportDetails()" required>
                        <option value="">Seleccionar...</option>
                        <option value="yes">Sí</option>
                        <option value="no">No</option>
                    </select>
                </div>
                
                <div id="passport-details" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                        <div>
                            <label>Número de Pasaporte:</label>
                            <input type="text" id="passportNumber" class="form-control" placeholder="Número del pasaporte">
                        </div>
                        <div>
                            <label>País Emisor:</label>
                            <input type="text" id="issuingCountry" class="form-control" placeholder="Ej: Argentina" value="Argentina">
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                        <div>
                            <label>Fecha de Emisión:</label>
                            <input type="date" id="passportIssueDate" class="form-control">
                        </div>
                        <div>
                            <label>Fecha de Vencimiento:</label>
                            <input type="date" id="passportExpiry" class="form-control">
                        </div>
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>📷 Foto Primera Hoja (Datos personales):</label>
                        <input type="file" id="passportPage1" class="form-control" accept="image/*">
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>📷 Foto Segunda Hoja (Sellos y visas):</label>
                        <input type="file" id="passportPage2" class="form-control" accept="image/*">
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('passportModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Guardar Pasaporte</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('passportForm').onsubmit = (e) => {
        e.preventDefault();
        const hasPassport = document.getElementById('hasPassport').value;
        
        if (hasPassport === 'no') {
            document.getElementById('passport-info').textContent = 'No posee pasaporte';
        } else {
            const number = document.getElementById('passportNumber').value;
            const country = document.getElementById('issuingCountry').value;
            const expiry = document.getElementById('passportExpiry').value;
            const page1File = document.getElementById('passportPage1').files[0];
            const page2File = document.getElementById('passportPage2').files[0];
            
            let passportInfo = `${number} (${country})`;
            if (expiry) passportInfo += ` • Vence: ${new Date(expiry).toLocaleDateString()}`;
            if (page1File && page2File) passportInfo += ' • Fotos subidas';
            
            document.getElementById('passport-info').textContent = passportInfo;
        }
        
        closeModal('passportModal');
        showUserMessage('✅ Información del pasaporte actualizada', 'success');
        updateDocumentStatus();
    };
}

function togglePassportDetails() {
    const hasPassport = document.getElementById('hasPassport').value;
    const details = document.getElementById('passport-details');
    details.style.display = hasPassport === 'yes' ? 'block' : 'none';
}

function manageWorkVisa(userId) {
    console.log('🌍 [VISA] Gestionando visa de trabajo:', userId);
    
    const modal = document.createElement('div');
    modal.id = 'workVisaModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 600px;">
            <h4>🌍 Visa de Trabajo</h4>
            <form id="workVisaForm">
                <div style="margin: 15px 0;">
                    <label>¿Posee Visa de Trabajo?</label>
                    <select id="hasWorkVisa" class="form-control" onchange="toggleWorkVisaDetails()" required>
                        <option value="">Seleccionar...</option>
                        <option value="yes">Sí</option>
                        <option value="no">No</option>
                    </select>
                </div>
                
                <div id="work-visa-details" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                        <div>
                            <label>País de Destino:</label>
                            <select id="destinationCountry" class="form-control">
                                <option value="">Seleccionar país...</option>
                                <option value="USA">Estados Unidos</option>
                                <option value="Canada">Canadá</option>
                                <option value="UK">Reino Unido</option>
                                <option value="Germany">Alemania</option>
                                <option value="Spain">España</option>
                                <option value="France">Francia</option>
                                <option value="Italy">Italia</option>
                                <option value="Australia">Australia</option>
                                <option value="Chile">Chile</option>
                                <option value="Other">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label>Tipo de Visa:</label>
                            <select id="visaType" class="form-control">
                                <option value="">Seleccionar tipo...</option>
                                <option value="H1B">H1-B (USA)</option>
                                <option value="L1">L1 (USA)</option>
                                <option value="Work_Permit">Permiso de Trabajo</option>
                                <option value="Temporary">Temporal</option>
                                <option value="Permanent">Permanente</option>
                                <option value="Student_Work">Estudiante con permiso trabajo</option>
                                <option value="Other">Otra</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                        <div>
                            <label>Fecha de Emisión:</label>
                            <input type="date" id="visaIssueDate" class="form-control">
                        </div>
                        <div>
                            <label>Fecha de Vencimiento:</label>
                            <input type="date" id="visaExpiry" class="form-control">
                        </div>
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>Número de Visa:</label>
                        <input type="text" id="visaNumber" class="form-control" placeholder="Número de la visa">
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>Empresa/Sponsor:</label>
                        <input type="text" id="sponsorCompany" class="form-control" placeholder="Empresa que sponsorea">
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>📄 Documento de Visa:</label>
                        <input type="file" id="visaDocument" class="form-control" accept="image/*,application/pdf">
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('workVisaModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-info">Guardar Visa</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('workVisaForm').onsubmit = (e) => {
        e.preventDefault();
        const hasVisa = document.getElementById('hasWorkVisa').value;
        
        if (hasVisa === 'no') {
            document.getElementById('work-visa-info').textContent = 'No posee visa de trabajo';
        } else {
            const country = document.getElementById('destinationCountry').value;
            const type = document.getElementById('visaType').value;
            const expiry = document.getElementById('visaExpiry').value;
            const sponsor = document.getElementById('sponsorCompany').value;
            
            let visaInfo = `${type} para ${country}`;
            if (sponsor) visaInfo += ` (${sponsor})`;
            if (expiry) visaInfo += ` • Vence: ${new Date(expiry).toLocaleDateString()}`;
            
            document.getElementById('work-visa-info').textContent = visaInfo;
        }
        
        closeModal('workVisaModal');
        showUserMessage('✅ Información de visa de trabajo actualizada', 'success');
        updateDocumentStatus();
    };
}

function toggleWorkVisaDetails() {
    const hasVisa = document.getElementById('hasWorkVisa').value;
    const details = document.getElementById('work-visa-details');
    details.style.display = hasVisa === 'yes' ? 'block' : 'none';
}

function editNationalLicense(userId) {
    if (document.getElementById('nationalLicenseModal')) {
        document.getElementById('nationalLicenseModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'nationalLicenseModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <form id="nationalLicenseForm" class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #2c3e50; margin-bottom: 20px;">🚗 Licencia Nacional de Conducir</h5>
                
                <div style="margin: 15px 0;">
                    <label>¿Posee licencia de conducir nacional?</label>
                    <select id="hasNationalLicense" class="form-control" onchange="toggleNationalLicenseDetails()">
                        <option value="no">No</option>
                        <option value="yes">Sí</option>
                    </select>
                </div>
                
                <div id="national-license-details" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                        <div>
                            <label>Número de Licencia:</label>
                            <input type="text" id="licenseNumber" class="form-control" placeholder="Número de licencia">
                        </div>
                        <div>
                            <label>Fecha de Vencimiento:</label>
                            <input type="date" id="licenseExpiry" class="form-control">
                        </div>
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>Categorías Habilitadas:</label>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0;">
                            <label><input type="checkbox" value="A1" class="license-category"> A1 (Ciclomotor)</label>
                            <label><input type="checkbox" value="A2" class="license-category"> A2 (Motocicleta)</label>
                            <label><input type="checkbox" value="A3" class="license-category"> A3 (Triciclo)</label>
                            <label><input type="checkbox" value="B1" class="license-category"> B1 (Auto)</label>
                            <label><input type="checkbox" value="B2" class="license-category"> B2 (Camioneta)</label>
                            <label><input type="checkbox" value="C1" class="license-category"> C1 (Camión)</label>
                            <label><input type="checkbox" value="C2" class="license-category"> C2 (Camión +)</label>
                            <label><input type="checkbox" value="D1" class="license-category"> D1 (Transporte)</label>
                            <label><input type="checkbox" value="D2" class="license-category"> D2 (Ómnibus)</label>
                            <label><input type="checkbox" value="D3" class="license-category"> D3 (Ómnibus +)</label>
                            <label><input type="checkbox" value="E1" class="license-category"> E1 (Remolque)</label>
                            <label><input type="checkbox" value="E2" class="license-category"> E2 (Semirremolque)</label>
                        </div>
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>Autoridad que Expide:</label>
                        <input type="text" id="issuingAuthority" class="form-control" placeholder="Ej: Municipalidad de Buenos Aires">
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>📄 Foto de la Licencia (Frente y Dorso):</label>
                        <input type="file" id="licensePhotos" class="form-control" accept="image/*" multiple>
                        <small class="text-muted">Seleccionar ambas caras de la licencia</small>
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('nationalLicenseModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Licencia</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('nationalLicenseForm').onsubmit = (e) => {
        e.preventDefault();
        const hasLicense = document.getElementById('hasNationalLicense').value;
        
        if (hasLicense === 'no') {
            document.getElementById('national-license-info').textContent = 'No posee licencia nacional';
        } else {
            const number = document.getElementById('licenseNumber').value;
            const expiry = document.getElementById('licenseExpiry').value;
            const authority = document.getElementById('issuingAuthority').value;
            
            const categories = Array.from(document.querySelectorAll('.license-category:checked'))
                .map(cb => cb.value).join(', ');
            
            let licenseInfo = `N° ${number}`;
            if (categories) licenseInfo += ` • Categorías: ${categories}`;
            if (expiry) licenseInfo += ` • Vence: ${new Date(expiry).toLocaleDateString()}`;
            if (authority) licenseInfo += ` • Expedida por: ${authority}`;
            
            document.getElementById('national-license-info').textContent = licenseInfo;
        }
        
        closeModal('nationalLicenseModal');
        showUserMessage('✅ Licencia nacional de conducir actualizada', 'success');
        updateDocumentStatus();
    };
}

function editInternationalLicense(userId) {
    if (document.getElementById('internationalLicenseModal')) {
        document.getElementById('internationalLicenseModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'internationalLicenseModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <form id="internationalLicenseForm" class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #2c3e50; margin-bottom: 20px;">🌍 Licencia Internacional de Conducir</h5>
                
                <div style="margin: 15px 0;">
                    <label>¿Posee licencia internacional de conducir?</label>
                    <select id="hasInternationalLicense" class="form-control" onchange="toggleInternationalLicenseDetails()">
                        <option value="no">No</option>
                        <option value="yes">Sí</option>
                    </select>
                </div>
                
                <div id="international-license-details" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0;">
                        <div>
                            <label>Número de Licencia Internacional:</label>
                            <input type="text" id="intlLicenseNumber" class="form-control" placeholder="Número de licencia">
                        </div>
                        <div>
                            <label>Fecha de Vencimiento:</label>
                            <input type="date" id="intlLicenseExpiry" class="form-control">
                        </div>
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>Entidad que Otorga:</label>
                        <select id="issuingEntity" class="form-control">
                            <option value="">Seleccionar entidad</option>
                            <option value="ACA">Automóvil Club Argentino (ACA)</option>
                            <option value="AAA">American Automobile Association (AAA)</option>
                            <option value="RACE">Real Automóvil Club de España (RACE)</option>
                            <option value="ADAC">Allgemeiner Deutscher Automobil-Club (ADAC)</option>
                            <option value="AA">Automobile Association (AA - Reino Unido)</option>
                            <option value="Other">Otra entidad</option>
                        </select>
                    </div>
                    
                    <div id="other-entity-div" style="display: none; margin: 15px 0;">
                        <label>Especificar otra entidad:</label>
                        <input type="text" id="otherEntity" class="form-control" placeholder="Nombre de la entidad">
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>País de Emisión:</label>
                        <input type="text" id="issuingCountry" class="form-control" placeholder="País que emitió la licencia">
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>Válida para Países:</label>
                        <textarea id="validCountries" class="form-control" rows="2" placeholder="Lista de países donde es válida (opcional)"></textarea>
                    </div>
                    
                    <div style="margin: 15px 0;">
                        <label>📄 Foto de la Licencia Internacional:</label>
                        <input type="file" id="intlLicensePhoto" class="form-control" accept="image/*">
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('internationalLicenseModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Guardar Licencia</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle other entity selection
    document.getElementById('issuingEntity').onchange = function() {
        const otherDiv = document.getElementById('other-entity-div');
        otherDiv.style.display = this.value === 'Other' ? 'block' : 'none';
    };
    
    document.getElementById('internationalLicenseForm').onsubmit = (e) => {
        e.preventDefault();
        const hasLicense = document.getElementById('hasInternationalLicense').value;
        
        if (hasLicense === 'no') {
            document.getElementById('international-license-info').textContent = 'No posee licencia internacional';
        } else {
            const number = document.getElementById('intlLicenseNumber').value;
            const expiry = document.getElementById('intlLicenseExpiry').value;
            const entity = document.getElementById('issuingEntity').value;
            const otherEntity = document.getElementById('otherEntity').value;
            const country = document.getElementById('issuingCountry').value;
            
            const finalEntity = entity === 'Other' ? otherEntity : entity;
            
            let licenseInfo = `N° ${number}`;
            if (finalEntity) licenseInfo += ` • ${finalEntity}`;
            if (country) licenseInfo += ` (${country})`;
            if (expiry) licenseInfo += ` • Vence: ${new Date(expiry).toLocaleDateString()}`;
            
            document.getElementById('international-license-info').textContent = licenseInfo;
        }
        
        closeModal('internationalLicenseModal');
        showUserMessage('✅ Licencia internacional de conducir actualizada', 'success');
        updateDocumentStatus();
    };
}

function toggleNationalLicenseDetails() {
    const hasLicense = document.getElementById('hasNationalLicense').value;
    const details = document.getElementById('national-license-details');
    details.style.display = hasLicense === 'yes' ? 'block' : 'none';
}

function toggleInternationalLicenseDetails() {
    const hasLicense = document.getElementById('hasInternationalLicense').value;
    const details = document.getElementById('international-license-details');
    details.style.display = hasLicense === 'yes' ? 'block' : 'none';
}

function manageProfessionalLicenses(userId) {
    if (document.getElementById('professionalLicensesModal')) {
        document.getElementById('professionalLicensesModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'professionalLicensesModal';
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-dialog modal-xl">
            <form id="professionalLicensesForm" class="modal-content" style="background: #fff; padding: 25px; border-radius: 15px;">
                <h5 style="color: #2c3e50; margin-bottom: 20px;">🚛 Licencias Profesionales de Transporte</h5>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <!-- Transporte de Pasajeros -->
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 10px;">
                        <h6 style="color: #2c5aa0; margin-bottom: 15px;">🚌 Transporte de Pasajeros</h6>
                        
                        <div style="margin: 10px 0;">
                            <label>¿Posee licencia?</label>
                            <select id="hasPassengerLicense" class="form-control" onchange="togglePassengerDetails()">
                                <option value="no">No</option>
                                <option value="yes">Sí</option>
                            </select>
                        </div>
                        
                        <div id="passenger-details" style="display: none;">
                            <div style="margin: 10px 0;">
                                <label>Número de Licencia:</label>
                                <input type="text" id="passengerLicenseNumber" class="form-control" placeholder="N° de licencia">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Tipo de Vehículo:</label>
                                <select id="passengerVehicleType" class="form-control">
                                    <option value="">Seleccionar</option>
                                    <option value="Taxi">Taxi</option>
                                    <option value="Remis">Remis</option>
                                    <option value="Uber/Cabify">Uber/Cabify</option>
                                    <option value="Colectivo">Colectivo</option>
                                    <option value="Microbus">Microbus</option>
                                    <option value="Omnibus">Ómnibus</option>
                                    <option value="Turismo">Turismo</option>
                                </select>
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Vencimiento:</label>
                                <input type="date" id="passengerExpiry" class="form-control">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Autoridad Emisora:</label>
                                <input type="text" id="passengerAuthority" class="form-control" placeholder="CNRT, Municipalidad, etc.">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>📄 Copia del Permiso:</label>
                                <input type="file" id="passengerDocument" class="form-control" accept="image/*,application/pdf">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Transporte de Carga -->
                    <div style="background: #fff3e0; padding: 15px; border-radius: 10px;">
                        <h6 style="color: #d84315; margin-bottom: 15px;">📦 Transporte de Carga</h6>
                        
                        <div style="margin: 10px 0;">
                            <label>¿Posee licencia?</label>
                            <select id="hasCargoLicense" class="form-control" onchange="toggleCargoDetails()">
                                <option value="no">No</option>
                                <option value="yes">Sí</option>
                            </select>
                        </div>
                        
                        <div id="cargo-details" style="display: none;">
                            <div style="margin: 10px 0;">
                                <label>Número de Licencia:</label>
                                <input type="text" id="cargoLicenseNumber" class="form-control" placeholder="N° de licencia">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Tipo de Carga:</label>
                                <select id="cargoType" class="form-control">
                                    <option value="">Seleccionar</option>
                                    <option value="General">Carga General</option>
                                    <option value="Peligrosa">Carga Peligrosa</option>
                                    <option value="Refrigerada">Carga Refrigerada</option>
                                    <option value="Liquidos">Líquidos</option>
                                    <option value="Contenedores">Contenedores</option>
                                    <option value="Animales">Animales Vivos</option>
                                </select>
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Peso Máximo (Kg):</label>
                                <input type="number" id="maxWeight" class="form-control" placeholder="Peso máximo autorizado">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Vencimiento:</label>
                                <input type="date" id="cargoExpiry" class="form-control">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Autoridad Emisora:</label>
                                <input type="text" id="cargoAuthority" class="form-control" placeholder="CNRT, ANMAT, etc.">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>📄 Copia del Permiso:</label>
                                <input type="file" id="cargoDocument" class="form-control" accept="image/*,application/pdf">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Maquinaria Pesada -->
                    <div style="background: #f3e5f5; padding: 15px; border-radius: 10px;">
                        <h6 style="color: #7b1fa2; margin-bottom: 15px;">🏗️ Maquinaria Pesada</h6>
                        
                        <div style="margin: 10px 0;">
                            <label>¿Posee licencia?</label>
                            <select id="hasHeavyLicense" class="form-control" onchange="toggleHeavyDetails()">
                                <option value="no">No</option>
                                <option value="yes">Sí</option>
                            </select>
                        </div>
                        
                        <div id="heavy-details" style="display: none;">
                            <div style="margin: 10px 0;">
                                <label>Número de Licencia:</label>
                                <input type="text" id="heavyLicenseNumber" class="form-control" placeholder="N° de licencia">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Tipo de Maquinaria:</label>
                                <select id="machineryType" class="form-control">
                                    <option value="">Seleccionar</option>
                                    <option value="Excavadora">Excavadora</option>
                                    <option value="Retroexcavadora">Retroexcavadora</option>
                                    <option value="Bulldozer">Bulldozer</option>
                                    <option value="Grua">Grúa</option>
                                    <option value="Montacargas">Montacargas</option>
                                    <option value="Rodillo">Rodillo Compactador</option>
                                    <option value="Motoniveladora">Motoniveladora</option>
                                    <option value="Tractor">Tractor</option>
                                </select>
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Capacidad Máxima:</label>
                                <input type="text" id="maxCapacity" class="form-control" placeholder="Ej: 20 Ton, 5000 Kg">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Vencimiento:</label>
                                <input type="date" id="heavyExpiry" class="form-control">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>Autoridad Emisora:</label>
                                <input type="text" id="heavyAuthority" class="form-control" placeholder="IRAM, UOCRA, etc.">
                            </div>
                            
                            <div style="margin: 10px 0;">
                                <label>📄 Copia del Certificado:</label>
                                <input type="file" id="heavyDocument" class="form-control" accept="image/*,application/pdf">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="closeModal('professionalLicensesModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-warning">Guardar Licencias</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('professionalLicensesForm').onsubmit = (e) => {
        e.preventDefault();
        
        let professionalInfo = [];
        
        // Transporte de Pasajeros
        if (document.getElementById('hasPassengerLicense').value === 'yes') {
            const vehicleType = document.getElementById('passengerVehicleType').value;
            const expiry = document.getElementById('passengerExpiry').value;
            let info = `Pasajeros: ${vehicleType}`;
            if (expiry) info += ` (Vence: ${new Date(expiry).toLocaleDateString()})`;
            professionalInfo.push(info);
        }
        
        // Transporte de Carga
        if (document.getElementById('hasCargoLicense').value === 'yes') {
            const cargoType = document.getElementById('cargoType').value;
            const maxWeight = document.getElementById('maxWeight').value;
            const expiry = document.getElementById('cargoExpiry').value;
            let info = `Carga: ${cargoType}`;
            if (maxWeight) info += ` (${maxWeight}Kg)`;
            if (expiry) info += ` (Vence: ${new Date(expiry).toLocaleDateString()})`;
            professionalInfo.push(info);
        }
        
        // Maquinaria Pesada
        if (document.getElementById('hasHeavyLicense').value === 'yes') {
            const machineryType = document.getElementById('machineryType').value;
            const capacity = document.getElementById('maxCapacity').value;
            const expiry = document.getElementById('heavyExpiry').value;
            let info = `Maquinaria: ${machineryType}`;
            if (capacity) info += ` (${capacity})`;
            if (expiry) info += ` (Vence: ${new Date(expiry).toLocaleDateString()})`;
            professionalInfo.push(info);
        }
        
        if (professionalInfo.length === 0) {
            document.getElementById('professional-licenses-info').textContent = 'No posee licencias profesionales';
        } else {
            document.getElementById('professional-licenses-info').textContent = professionalInfo.join(' • ');
        }
        
        closeModal('professionalLicensesModal');
        showUserMessage('✅ Licencias profesionales actualizadas', 'success');
        updateDocumentStatus();
    };
}

function togglePassengerDetails() {
    const hasLicense = document.getElementById('hasPassengerLicense').value;
    const details = document.getElementById('passenger-details');
    details.style.display = hasLicense === 'yes' ? 'block' : 'none';
}

function toggleCargoDetails() {
    const hasLicense = document.getElementById('hasCargoLicense').value;
    const details = document.getElementById('cargo-details');
    details.style.display = hasLicense === 'yes' ? 'block' : 'none';
}

function toggleHeavyDetails() {
    const hasLicense = document.getElementById('hasHeavyLicense').value;
    const details = document.getElementById('heavy-details');
    details.style.display = hasLicense === 'yes' ? 'block' : 'none';
}

function updateDocumentStatus() {
    // This function would normally save document data to the database
    // and update the document expiry alert system
    console.log('Updating document status and checking for expiry alerts...');
    
    // Here we would check all document expiry dates and create alerts
    checkDocumentExpiries();
    
    // Update the visual status indicators
    updateDocumentStatusIndicators();
}

function checkDocumentExpiries() {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysFromNow = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000));
    
    const alerts = [];
    
    // Check DNI expiry (if implemented with expiry tracking)
    const dniInfo = document.getElementById('dni-info')?.textContent;
    if (dniInfo && dniInfo.includes('Vence:')) {
        const expiryMatch = dniInfo.match(/Vence:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (expiryMatch) {
            const expiryDate = new Date(expiryMatch[1].split('/').reverse().join('-'));
            if (expiryDate <= thirtyDaysFromNow) {
                alerts.push({
                    type: 'critical',
                    document: 'DNI',
                    expiry: expiryDate,
                    daysLeft: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
                });
            }
        }
    }
    
    // Check passport expiry
    const passportInfo = document.getElementById('passport-info')?.textContent;
    if (passportInfo && passportInfo.includes('Vence:')) {
        const expiryMatch = passportInfo.match(/Vence:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (expiryMatch) {
            const expiryDate = new Date(expiryMatch[1].split('/').reverse().join('-'));
            if (expiryDate <= ninetyDaysFromNow) {
                alerts.push({
                    type: expiryDate <= thirtyDaysFromNow ? 'critical' : 'warning',
                    document: 'Pasaporte',
                    expiry: expiryDate,
                    daysLeft: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
                });
            }
        }
    }
    
    // Check work visa expiry
    const visaInfo = document.getElementById('work-visa-info')?.textContent;
    if (visaInfo && visaInfo.includes('Vence:')) {
        const expiryMatch = visaInfo.match(/Vence:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (expiryMatch) {
            const expiryDate = new Date(expiryMatch[1].split('/').reverse().join('-'));
            if (expiryDate <= ninetyDaysFromNow) {
                alerts.push({
                    type: expiryDate <= thirtyDaysFromNow ? 'critical' : 'warning',
                    document: 'Visa de Trabajo',
                    expiry: expiryDate,
                    daysLeft: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
                });
            }
        }
    }
    
    // Check national license expiry
    const nationalLicenseInfo = document.getElementById('national-license-info')?.textContent;
    if (nationalLicenseInfo && nationalLicenseInfo.includes('Vence:')) {
        const expiryMatch = nationalLicenseInfo.match(/Vence:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (expiryMatch) {
            const expiryDate = new Date(expiryMatch[1].split('/').reverse().join('-'));
            if (expiryDate <= thirtyDaysFromNow) {
                alerts.push({
                    type: 'critical',
                    document: 'Licencia Nacional de Conducir',
                    expiry: expiryDate,
                    daysLeft: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
                });
            }
        }
    }
    
    // Check international license expiry
    const intlLicenseInfo = document.getElementById('international-license-info')?.textContent;
    if (intlLicenseInfo && intlLicenseInfo.includes('Vence:')) {
        const expiryMatch = intlLicenseInfo.match(/Vence:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (expiryMatch) {
            const expiryDate = new Date(expiryMatch[1].split('/').reverse().join('-'));
            if (expiryDate <= thirtyDaysFromNow) {
                alerts.push({
                    type: 'critical',
                    document: 'Licencia Internacional de Conducir',
                    expiry: expiryDate,
                    daysLeft: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
                });
            }
        }
    }
    
    // Check professional licenses expiry
    const professionalInfo = document.getElementById('professional-licenses-info')?.textContent;
    if (professionalInfo && professionalInfo.includes('Vence:')) {
        const expiryMatches = professionalInfo.match(/(\w+):[^•]*Vence:\s*(\d{1,2}\/\d{1,2}\/\d{4})/g);
        if (expiryMatches) {
            expiryMatches.forEach(match => {
                const [, licenseType, expiryStr] = match.match(/(\w+):[^•]*Vence:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
                const expiryDate = new Date(expiryStr.split('/').reverse().join('-'));
                if (expiryDate <= thirtyDaysFromNow) {
                    alerts.push({
                        type: 'critical',
                        document: `Licencia Professional ${licenseType}`,
                        expiry: expiryDate,
                        daysLeft: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
                    });
                }
            });
        }
    }
    
    // Display alerts if any
    if (alerts.length > 0) {
        showExpiryAlerts(alerts);
    }
    
    return alerts;
}

function showExpiryAlerts(alerts) {
    const existingAlert = document.getElementById('document-expiry-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertContainer = document.createElement('div');
    alertContainer.id = 'document-expiry-alert';
    alertContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 400px;
        z-index: 9999;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border-left: 5px solid #dc3545;
    `;
    
    let alertsHtml = '<div style="padding: 15px;"><h6 style="color: #dc3545; margin: 0 0 10px 0;">⚠️ Documentos por Vencer</h6>';
    
    alerts.forEach(alert => {
        const bgColor = alert.type === 'critical' ? '#fee2e2' : '#fef3cd';
        const textColor = alert.type === 'critical' ? '#dc2626' : '#d97706';
        const icon = alert.daysLeft <= 0 ? '🔴' : alert.daysLeft <= 7 ? '🟡' : '🟠';
        
        const daysText = alert.daysLeft <= 0 ? 'VENCIDO' : 
                        alert.daysLeft === 1 ? '1 día' : 
                        `${alert.daysLeft} días`;
        
        alertsHtml += `
            <div style="background: ${bgColor}; padding: 10px; border-radius: 5px; margin: 5px 0; border: 1px solid ${textColor};">
                <div style="color: ${textColor}; font-weight: bold; font-size: 12px;">
                    ${icon} ${alert.document}
                </div>
                <div style="color: #666; font-size: 11px;">
                    Vence: ${alert.expiry.toLocaleDateString()} (${daysText})
                </div>
            </div>
        `;
    });
    
    alertsHtml += `
        <div style="text-align: right; margin-top: 10px;">
            <button onclick="document.getElementById('document-expiry-alert').remove()" 
                    class="btn btn-sm btn-secondary">Cerrar</button>
        </div>
    </div>`;
    
    alertContainer.innerHTML = alertsHtml;
    document.body.appendChild(alertContainer);
    
    // Auto-hide after 10 seconds for warnings (not critical alerts)
    const hasCritical = alerts.some(alert => alert.type === 'critical');
    if (!hasCritical) {
        setTimeout(() => {
            if (document.getElementById('document-expiry-alert')) {
                alertContainer.remove();
            }
        }, 10000);
    }
}

function updateDocumentStatusIndicators() {
    // Update visual indicators in the personal data tab
    const documentSections = [
        { id: 'dni-info', indicator: 'dni-status' },
        { id: 'passport-info', indicator: 'passport-status' },
        { id: 'work-visa-info', indicator: 'visa-status' },
        { id: 'national-license-info', indicator: 'national-license-status' },
        { id: 'international-license-info', indicator: 'intl-license-status' },
        { id: 'professional-licenses-info', indicator: 'professional-status' }
    ];
    
    documentSections.forEach(section => {
        const infoElement = document.getElementById(section.id);
        const statusElement = document.getElementById(section.indicator);
        
        if (infoElement && statusElement) {
            const text = infoElement.textContent;
            let status = '⚪'; // Default: Not configured
            
            if (text.includes('No posee') || text === 'Sin información') {
                status = '⚫'; // Black: Not applicable
            } else if (text.includes('Vence:')) {
                const today = new Date();
                const expiryMatch = text.match(/Vence:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
                if (expiryMatch) {
                    const expiryDate = new Date(expiryMatch[1].split('/').reverse().join('-'));
                    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (daysLeft <= 0) {
                        status = '🔴'; // Red: Expired
                    } else if (daysLeft <= 7) {
                        status = '🟡'; // Yellow: Expires within 7 days
                    } else if (daysLeft <= 30) {
                        status = '🟠'; // Orange: Expires within 30 days
                    } else {
                        status = '🟢'; // Green: Valid
                    }
                }
            } else if (text !== 'Sin información') {
                status = '🟢'; // Green: Has document
            }
            
            statusElement.textContent = status;
        }
    });
}

// ===== FUNCIONES PARA LA SOLAPA DE ADMINISTRACIÓN =====

// Activar/Desactivar usuario
async function toggleUserStatus(userId) {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const response = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) return;

    const userData = await response.json();
    const user = userData.user || userData;
    const newStatus = !user.isActive;

    if (!confirm(`¿${newStatus ? 'Activar' : 'Desactivar'} este usuario?`)) return;

    const updateResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: newStatus })
    });

    if (!updateResponse.ok) {
        alert('❌ Error actualizando estado');
        return;
    }

    alert(`✅ Usuario ${newStatus ? 'activado' : 'desactivado'}`);
    await closeEmployeeFile();
    await viewUser(userId);
}

// Toggle GPS Radius
async function toggleGPSRadius(userId) {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const response = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) return;

    const userData = await response.json();
    const user = userData.user || userData;
    const newValue = !user.allowOutsideRadius;

    if (!confirm(`¿${newValue ? 'Permitir asistencias fuera de área GPS' : 'Restringir GPS al área autorizada'}?`)) return;

    const updateResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ allowOutsideRadius: newValue })
    });

    if (!updateResponse.ok) {
        alert('❌ Error actualizando configuración GPS');
        return;
    }

    alert(`✅ GPS ${newValue ? 'sin restricción' : 'restringido a área autorizada'}`);
    await closeEmployeeFile();
    await viewUser(userId);
}

// Cambiar rol del usuario
async function editUserRole(userId, currentRole) {
    const roles = {
        'admin': '👑 Administrador',
        'supervisor': '🔧 Supervisor',
        'medical': '🏥 Médico',
        'employee': '👤 Empleado'
    };

    const roleOptions = Object.keys(roles).map(key =>
        `${key === currentRole ? '✓ ' : ''}${roles[key]} (${key})`
    ).join('\n');

    const newRole = prompt(`Seleccione nuevo rol:\n\n${roleOptions}\n\nIngrese uno de: admin, supervisor, medical, employee`, currentRole);

    if (!newRole || newRole === currentRole || !roles[newRole]) return;

    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const response = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
    });

    if (!response.ok) {
        alert('❌ Error cambiando rol');
        return;
    }

    alert(`✅ Rol actualizado a: ${roles[newRole]}`);
    await closeEmployeeFile();
    await viewUser(userId);
}

// Edit position
async function editPosition(userId, currentPosition) {
    const newPosition = prompt('Ingresa la nueva posición/cargo:', currentPosition || '');
    
    if (newPosition === null || newPosition === currentPosition) return;
    
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                position: newPosition
            })
        });
        
        if (response.ok) {
            showUserMessage('✅ Posición actualizada exitosamente', 'success');
            // Refresh TAB 1 data
            await refreshTab1Data(userId);
        } else {
            showUserMessage('❌ Error actualizando posición', 'error');
        }
    } catch (error) {
        showUserMessage(`❌ Error: ${error.message}`, 'error');
    }
}

// Change department
async function changeDepartment(userId, currentDeptId) {
    console.log('🏢 [USERS] Cambiando departamento para usuario:', userId);

    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showUserMessage('⚠️ No hay sesión activa', 'error');
            return;
        }

        // Get all departments
        const deptResponse = await fetch(window.progressiveAdmin.getApiUrl('/api/v1/departments'), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!deptResponse.ok) throw new Error('Error al obtener departamentos');
        const deptData = await deptResponse.json();
        const departments = deptData.departments || deptData || [];

        // Get user data
        const userResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok) throw new Error('Error al obtener usuario');
        const userData = await userResponse.json();
        const user = userData.user || userData;

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'changeDepartmentModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const departmentOptions = departments.map(dept => `
            <option value="${dept.id}" ${dept.id === currentDeptId ? 'selected' : ''}>
                ${dept.name || dept.department_name || 'Sin nombre'}
            </option>
        `).join('');

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 500px; width: 90%;">
                <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        🔄 Cambiar Departamento
                        <button onclick="closeDepartmentModal()" style="margin-left: auto; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">✕</button>
                    </h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Usuario: ${user.firstName} ${user.lastName}</p>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">🏢 Nuevo Departamento:</label>
                        <select id="newDepartmentSelect" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                            <option value="">Sin departamento</option>
                            ${departmentOptions}
                        </select>
                    </div>

                    <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="margin: 0; font-size: 13px; color: #1976D2;">
                            💡 <strong>Nota:</strong> Cambiar el departamento puede afectar permisos, turnos y asignaciones del usuario.
                        </p>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="closeDepartmentModal()" class="btn btn-secondary">
                            ❌ Cancelar
                        </button>
                        <button onclick="saveDepartmentChange('${userId}')" class="btn btn-success">
                            💾 Guardar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close function
        window.closeDepartmentModal = () => {
            modal.remove();
            delete window.closeDepartmentModal;
            delete window.saveDepartmentChange;
        };

        // Save function
        window.saveDepartmentChange = async (userId) => {
            try {
                const newDeptId = document.getElementById('newDepartmentSelect').value;

                const response = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        departmentId: newDeptId || null
                    })
                });

                if (!response.ok) throw new Error('Error al cambiar departamento');

                showUserMessage('✅ Departamento actualizado correctamente', 'success');
                closeDepartmentModal();

                // Refresh TAB 1 data
                await refreshTab1Data(userId);
            } catch (error) {
                console.error('Error:', error);
                showUserMessage('❌ Error al cambiar departamento: ' + error.message, 'error');
            }
        };

    } catch (error) {
        console.error('Error:', error);
        showUserMessage('❌ Error al cargar departamentos: ' + error.message, 'error');
    }
}

// Manage branches - CRUD completo
async function manageBranches(userId) {
    console.log('🏢 [USERS] Gestionando sucursales para usuario:', userId);

    try {
        // Get user data
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showUserMessage('⚠️ No hay sesión activa', 'error');
            return;
        }

        // Get current user data
        const userResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok) throw new Error('Error al obtener usuario');
        const userData = await userResponse.json();
        const user = userData.user || userData;

        // Get company ID from logged user
        const companyId = window.progressiveAdmin.currentUser?.company_id || window.progressiveAdmin.currentUser?.companyId || 11;

        // Get all available branches for the company
        const branchesResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/companies/${companyId}/branches`), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!branchesResponse.ok) throw new Error('Error al obtener sucursales');
        const branchesData = await branchesResponse.json();
        const branches = branchesData.branches || branchesData || [];

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'manageBranchesModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const branchesOptions = branches.map(branch => `
            <option value="${branch.id}" ${user.defaultBranchId === branch.id ? 'selected' : ''}>
                ${branch.name || branch.department_name || 'Sin nombre'}
            </option>
        `).join('');

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        🏢 Gestionar Sucursales
                        <button onclick="closeBranchesModal()" style="margin-left: auto; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">✕</button>
                    </h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Usuario: ${user.firstName} ${user.lastName}</p>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">🏢 Sucursal por Defecto:</label>
                        <select id="defaultBranchSelect" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                            <option value="">Sin sucursal asignada</option>
                            ${branchesOptions}
                        </select>
                        <p style="font-size: 12px; color: #666; margin-top: 8px;">
                            💡 La sucursal por defecto se usa para asignaciones automáticas
                        </p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600;">📍 Sucursales Autorizadas:</label>
                        <div id="authorizedBranches" style="max-height: 200px; overflow-y: auto; border: 2px solid #ddd; border-radius: 6px; padding: 10px; background: #f8f9fa;">
                            ${branches.map(branch => `
                                <label style="display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; border-bottom: 1px solid #dee2e6;">
                                    <input type="checkbox" value="${branch.id}" ${user.authorizedBranches && user.authorizedBranches.includes(branch.id) ? 'checked' : ''} style="transform: scale(1.2);">
                                    <span style="flex: 1;">${branch.name || branch.department_name || 'Sin nombre'}</span>
                                    <span style="font-size: 12px; color: #666;">${branch.address || 'Sin dirección'}</span>
                                </label>
                            `).join('')}
                        </div>
                        <p style="font-size: 12px; color: #666; margin-top: 8px;">
                            💡 El usuario podrá registrar asistencia en las sucursales autorizadas
                        </p>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button onclick="closeBranchesModal()" class="btn btn-secondary">
                            ❌ Cancelar
                        </button>
                        <button onclick="saveBranchesAssignment('${userId}')" class="btn btn-success">
                            💾 Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close function
        window.closeBranchesModal = () => {
            modal.remove();
            delete window.closeBranchesModal;
            delete window.saveBranchesAssignment;
        };

        // Save function
        window.saveBranchesAssignment = async (userId) => {
            try {
                const defaultBranch = document.getElementById('defaultBranchSelect').value;
                const checkboxes = document.querySelectorAll('#authorizedBranches input[type="checkbox"]:checked');
                const authorizedBranches = Array.from(checkboxes).map(cb => cb.value);

                const response = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        defaultBranchId: defaultBranch || null,
                        authorizedBranches: authorizedBranches
                    })
                });

                if (!response.ok) throw new Error('Error al guardar sucursales');

                showUserMessage('✅ Sucursales actualizadas correctamente', 'success');
                closeBranchesModal();

                // Refresh TAB 1 data
                await refreshTab1Data(userId);
            } catch (error) {
                console.error('Error:', error);
                showUserMessage('❌ Error al guardar: ' + error.message, 'error');
            }
        };

    } catch (error) {
        console.error('Error:', error);
        showUserMessage('❌ Error al cargar sucursales: ' + error.message, 'error');
    }
}

// Generate user report
async function generateUserReport(userId) {
    console.log('📊 [USERS] Generando reporte para usuario:', userId);

    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showUserMessage('⚠️ No hay sesión activa', 'error');
            return;
        }

        // Get user data
        const userResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok) throw new Error('Error al obtener usuario');
        const userData = await userResponse.json();
        const user = userData.user || userData;

        // Create modal with report options
        const modal = document.createElement('div');
        modal.id = 'generateReportModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 600px; width: 90%;">
                <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        📊 Generar Reporte
                        <button onclick="closeReportModal()" style="margin-left: auto; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">✕</button>
                    </h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Usuario: ${user.firstName} ${user.lastName}</p>
                </div>
                <div style="padding: 20px;">
                    <h4 style="margin-top: 0;">📋 Tipo de Reporte:</h4>

                    <div style="display: grid; gap: 10px; margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                            <input type="radio" name="reportType" value="complete" checked style="transform: scale(1.3);">
                            <div>
                                <strong>📄 Reporte Completo</strong>
                                <br><small style="color: #666;">Incluye todos los datos del empleado</small>
                            </div>
                        </label>

                        <label style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                            <input type="radio" name="reportType" value="attendance" style="transform: scale(1.3);">
                            <div>
                                <strong>📅 Reporte de Asistencias</strong>
                                <br><small style="color: #666;">Historial de asistencias y ausencias</small>
                            </div>
                        </label>

                        <label style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                            <input type="radio" name="reportType" value="medical" style="transform: scale(1.3);">
                            <div>
                                <strong>🏥 Reporte Médico</strong>
                                <br><small style="color: #666;">Exámenes, vacunas y condiciones médicas</small>
                            </div>
                        </label>

                        <label style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                            <input type="radio" name="reportType" value="performance" style="transform: scale(1.3);">
                            <div>
                                <strong>📈 Reporte de Desempeño</strong>
                                <br><small style="color: #666;">Evaluaciones y métricas de desempeño</small>
                            </div>
                        </label>
                    </div>

                    <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="margin: 0; font-size: 13px; color: #1976D2;">
                            💡 El reporte se descargará en formato PDF
                        </p>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button onclick="closeReportModal()" class="btn btn-secondary">
                            ❌ Cancelar
                        </button>
                        <button onclick="downloadUserReport('${userId}')" class="btn btn-success">
                            📥 Descargar Reporte
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add hover effect
        const labels = modal.querySelectorAll('label');
        labels.forEach(label => {
            label.addEventListener('mouseenter', () => {
                label.style.borderColor = '#17a2b8';
                label.style.background = '#f0f9ff';
            });
            label.addEventListener('mouseleave', () => {
                label.style.borderColor = '#e9ecef';
                label.style.background = 'white';
            });
        });

        // Close function
        window.closeReportModal = () => {
            modal.remove();
            delete window.closeReportModal;
            delete window.downloadUserReport;
        };

        // Download function
        window.downloadUserReport = async (userId) => {
            try {
                const reportType = document.querySelector('input[name="reportType"]:checked').value;

                showUserMessage('📥 Generando reporte...', 'info');

                // Create download URL
                const downloadUrl = window.progressiveAdmin.getApiUrl(
                    `/api/v1/users/${userId}/report?type=${reportType}`
                );

                // Download the file
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `reporte_${user.firstName}_${user.lastName}_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                showUserMessage('✅ Reporte generado correctamente', 'success');
                closeReportModal();
            } catch (error) {
                console.error('Error:', error);
                showUserMessage('❌ Error al generar reporte: ' + error.message, 'error');
            }
        };

    } catch (error) {
        console.error('Error:', error);
        showUserMessage('❌ Error al generar reporte: ' + error.message, 'error');
    }
}

/**
 * ═══════════════════════════════════════════════════════════
 * FUNCIÓN AUXILIAR: Refresh TAB 1 Data
 * ═══════════════════════════════════════════════════════════
 * Actualiza SOLO los campos del TAB 1 sin recargar el modal completo
 * MEJORA LA UX - No cierra y reabre el modal
 */
async function refreshTab1Data(userId) {
    console.log('🔄 [USERS] Actualizando datos del TAB 1...');

    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            console.error('No hay token de autenticación');
            return;
        }

        // GET updated user data
        const response = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('Error obteniendo datos actualizados');
            return;
        }

        const userData = await response.json();
        const user = userData.user || userData;

        // Update TAB 1 fields

        // 1. ROL
        const roleEl = document.getElementById('admin-role');
        if (roleEl) {
            const roleIcons = {
                'admin': '👑 Administrador',
                'supervisor': '🔧 Supervisor',
                'medical': '🏥 Médico',
                'employee': '👤 Empleado'
            };
            roleEl.textContent = roleIcons[user.role] || '👤 Empleado';
        }

        // 2. STATUS
        const statusEl = document.getElementById('admin-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                    ${user.isActive ? '✅ Activo' : '❌ Inactivo'}
                </span>
            `;
            // UPDATE STATUS BUTTON
            const statusBtn = statusEl.parentElement.querySelector('button[onclick*="toggleUserStatus"]');
            if (statusBtn) {
                statusBtn.setAttribute('onclick', `toggleUserStatus('${userId}', ${user.isActive})`);
                statusBtn.textContent = user.isActive ? '🔒 Desactivar' : '✅ Activar';
            }
        }

        // 3. GPS
        const gpsEl = document.getElementById('admin-gps');
        if (gpsEl) {
            gpsEl.innerHTML = `
                <span class="status-badge ${user.allowOutsideRadius ? 'warning' : 'success'}">
                    ${user.allowOutsideRadius ? '🌍 Sin restricción GPS' : '📍 Solo área autorizada'}
                </span>
            `;
            // UPDATE GPS BUTTON
            const gpsBtn = gpsEl.parentElement.querySelector('button[onclick*="toggleGPSRadius"]');
            if (gpsBtn) {
                gpsBtn.setAttribute('onclick', `toggleGPSRadius('${userId}')`);
                gpsBtn.textContent = user.allowOutsideRadius ? '📍 Restringir GPS' : '🌍 Permitir fuera de área';
            }
        }

        // 4. BRANCH
        const branchEl = document.getElementById('admin-branch');
        if (branchEl) {
            if (user.defaultBranchId) {
                // Get branch name if possible
                try {
                    const branchResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/departments/${user.defaultBranchId}`), {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (branchResponse.ok) {
                        const branchData = await branchResponse.json();
                        const branch = branchData.data || branchData;
                        branchEl.innerHTML = `<strong style="color: #28a745;">${branch.name || 'Sucursal ' + user.defaultBranchId}</strong>`;
                    } else {
                        branchEl.innerHTML = `<strong style="color: #28a745;">Sucursal ${user.defaultBranchId}</strong>`;
                    }
                } catch (e) {
                    branchEl.innerHTML = `<strong style="color: #28a745;">Asignada</strong>`;
                }
            } else {
                branchEl.innerHTML = '<span style="color: #999;">Sin asignar</span>';
            }
        }

        // 5. DEPARTMENT
        const deptEl = document.getElementById('admin-department');
        if (deptEl) {
            if (user.departmentId) {
                // Get department name
                try {
                    const deptResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/departments/${user.departmentId}`), {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (deptResponse.ok) {
                        const deptData = await deptResponse.json();
                        const dept = deptData.data || deptData;
                        deptEl.innerHTML = `<strong style="color: #007bff;">${dept.name || 'Departamento ' + user.departmentId}</strong>`;
                    } else {
                        deptEl.innerHTML = `<strong style="color: #007bff;">Departamento ${user.departmentId}</strong>`;
                    }
                } catch (e) {
                    deptEl.innerHTML = '<strong style="color: #007bff;">Asignado</strong>';
                }
            } else {
                deptEl.innerHTML = '<span style="color: #999;">Sin departamento</span>';
            }
        }

        // 6. POSITION
        const positionEl = document.getElementById('admin-position');
        if (positionEl) {
            positionEl.innerHTML = user.position ?
                `<strong style="color: #6c757d;">${user.position}</strong>` :
                '<span style="color: #999;">No especificada</span>';
        }

        console.log('✅ [USERS] TAB 1 actualizado correctamente');

        // Visual feedback
        const tab1 = document.getElementById('admin-tab');
        if (tab1) {
            tab1.style.animation = 'fadeIn 0.5s';
        }

    } catch (error) {
        console.error('❌ [USERS] Error actualizando TAB 1:', error);
    }
}

// Audit user history
async function auditUserHistory(userId) {
    console.log('📋 [USERS] Mostrando historial de cambios para usuario:', userId);

    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showUserMessage('⚠️ No hay sesión activa', 'error');
            return;
        }

        // Get user data
        const userResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok) throw new Error('Error al obtener usuario');
        const userData = await userResponse.json();
        const user = userData.user || userData;

        // Get audit logs (if endpoint exists)
        let auditLogs = [];
        try {
            const logsResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}/audit-logs`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (logsResponse.ok) {
                const logsData = await logsResponse.json();
                auditLogs = logsData.logs || logsData || [];
            }
        } catch (e) {
            console.log('No audit logs endpoint available');
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'auditHistoryModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const logsHTML = auditLogs.length > 0 ? auditLogs.map(log => `
            <div style="border-left: 4px solid #17a2b8; padding: 12px; margin-bottom: 10px; background: #f8f9fa; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <strong>${log.action || 'Cambio'}</strong>
                    <small style="color: #666;">${new Date(log.timestamp || log.createdAt).toLocaleString('es-AR')}</small>
                </div>
                <div style="font-size: 13px; color: #666;">
                    ${log.description || log.changes || 'Sin descripción'}
                </div>
                ${log.user ? `<div style="font-size: 12px; color: #999; margin-top: 5px;">Por: ${log.user.firstName} ${log.user.lastName}</div>` : ''}
            </div>
        `).join('') : '<p style="text-align: center; color: #666; padding: 20px;">No hay historial de cambios disponible</p>';

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0; position: sticky; top: 0; z-index: 1;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        📋 Historial de Cambios
                        <button onclick="closeAuditModal()" style="margin-left: auto; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">✕</button>
                    </h3>
                    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Usuario: ${user.firstName} ${user.lastName}</p>
                </div>
                <div style="padding: 20px;">
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="margin: 0; font-size: 13px; color: #856404;">
                            ℹ️ Este historial muestra todos los cambios realizados en el expediente del usuario.
                        </p>
                    </div>

                    <div style="max-height: 400px; overflow-y: auto;">
                        ${logsHTML}
                    </div>

                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="closeAuditModal()" class="btn btn-secondary">
                            ❌ Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close function
        window.closeAuditModal = () => {
            modal.remove();
            delete window.closeAuditModal;
        };

    } catch (error) {
        console.error('Error:', error);
        showUserMessage('❌ Error al cargar historial: ' + error.message, 'error');
    }
}

// Verify user biometric
async function verifyUserBiometric(userId, userName) {
    console.log('🔍 [USERS] Verificando biometría para usuario:', userId, userName);
    
    // Check if biometric verification module is loaded
    if (!window.biometricVerificationModule) {
        console.log('📦 [USERS] Cargando módulo de verificación biométrica...');
        
        // Load the biometric verification module dynamically
        const script = document.createElement('script');
        script.src = '/js/modules/biometric-verification.js';
        script.onload = async () => {
            console.log('✅ [USERS] Módulo de verificación cargado');
            // Initialize and show verification
            if (window.biometricVerificationModule) {
                await window.biometricVerificationModule.initialize();
                window.biometricVerificationModule.createBiometricVerificationModal(userId, userName);
            }
        };
        script.onerror = () => {
            console.error('❌ [USERS] Error cargando módulo de verificación');
            showUserMessage('❌ Error cargando módulo de verificación biométrica', 'error');
        };
        document.head.appendChild(script);
    } else {
        // Module already loaded, show verification modal
        window.biometricVerificationModule.createBiometricVerificationModal(userId, userName);
    }
}

// Change user photo
async function changeUserPhoto(userId) {
    console.log('📷 [USERS] Cambiando foto de usuario:', userId);
    
    // Create file input for photo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.setProperty('display', 'none', 'important');
    
    input.onchange = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showUserMessage('❌ La imagen es muy grande. Máximo 5MB permitidos.', 'error');
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showUserMessage('❌ Solo se permiten archivos de imagen.', 'error');
            return;
        }
        
        try {
            showUserMessage('📷 Subiendo foto...', 'info');
            
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('userId', userId);
            
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            if (!token) {
                showUserMessage('⚠️ No hay token de autenticación', 'error');
                return;
            }
            
            const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}/photo`);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                showUserMessage(`❌ Error subiendo foto: ${error.error || 'Error desconocido'}`, 'error');
                return;
            }
            
            const result = await response.json();
            showUserMessage('✅ Foto actualizada exitosamente', 'success');
            
            // Refresh the user details modal to show the new photo
            setTimeout(() => {
                viewUser(userId);
            }, 1000);
            
        } catch (error) {
            console.error('Error subiendo foto:', error);
            showUserMessage('❌ Error subiendo la foto: ' + error.message, 'error');
        }
        
        // Clean up
        document.body.removeChild(input);
    };
    
    // Add to DOM and click
    document.body.appendChild(input);
    input.click();
}

// Remove user photo
async function removeUserPhoto(userId) {
    console.log('🗑️ [USERS] Eliminando foto de usuario:', userId);
    
    if (!confirm('¿Está seguro que desea eliminar la foto del usuario?')) {
        return;
    }
    
    try {
        showUserMessage('🗑️ Eliminando foto...', 'info');
        
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            showUserMessage('⚠️ No hay token de autenticación', 'error');
            return;
        }
        
        const apiUrl = window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}/photo`);
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            showUserMessage(`❌ Error eliminando foto: ${error.error || 'Error desconocido'}`, 'error');
            return;
        }
        
        showUserMessage('✅ Foto eliminada exitosamente', 'success');
        
        // Refresh the user details modal to show the default avatar
        setTimeout(() => {
            viewUser(userId);
        }, 1000);
        
    } catch (error) {
        console.error('Error eliminando foto:', error);
        showUserMessage('❌ Error eliminando la foto: ' + error.message, 'error');
    }
}

// Translation update function for Users module
window.currentModuleTranslationUpdate = async function() {
    console.log('🌍 [USERS] Actualizando traducciones del módulo usuarios...');
    
    // Update search placeholders with translated text
    const searchDNI = document.getElementById('searchDNI');
    if (searchDNI) {
        searchDNI.placeholder = await window.translator.t('users.search_dni');
    }
    
    const searchName = document.getElementById('searchName');
    if (searchName) {
        searchName.placeholder = await window.translator.t('users.search_name');
    }
};

console.log('✅ [USERS] Módulo de usuarios con traducción registrado');

// ✅ HACER FUNCIÓN DISPONIBLE GLOBALMENTE (Legacy)
window.showUsersContent = showUsersContent;

// ✅ EXPORTACIÓN UNIFICADA (Sistema de Auto-Conocimiento v3.0)
if (!window.Modules) window.Modules = {};
window.Modules.users = {
    init: showUsersContent
};
console.log('🧠 [USERS] Exportación unificada registrada: window.Modules.users');

// Exponer funciones globalmente para onclick handlers
window.viewUser = viewUser;
window.deleteUser = deleteUser;
window.resetPassword = resetPassword;
window.assignUserShifts = assignUserShifts;
// window.uploadUserPhoto = uploadUserPhoto; // COMMENTED: Function not defined, causing errors
// window.removeUserPhoto = removeUserPhoto; // COMMENTED: Function not defined, causing errors
