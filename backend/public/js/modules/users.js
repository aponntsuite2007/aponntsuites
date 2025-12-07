// Users Module - v5.0 PROGRESSIVE + PLUG & PLAY

// 🔒 GUARD MEJORADO: Prevenir doble carga del módulo (BLOQUEA ejecución duplicada)
if (typeof window.showUsersContent === 'function') {
    console.warn('⚠️ [USERS] Módulo ya fue cargado anteriormente - SKIPPING re-ejecución');
    // Early return para evitar re-declaración de variables
    // El script termina aquí en la segunda carga
    void(0); // No-op statement para evitar syntax error
} else {
    // ✅ PRIMERA CARGA: Ejecutar todo el código del módulo
    console.log('👥 [USERS] Módulo users v6.0 - PLUG & PLAY SYSTEM INTEGRADO - PRIMERA CARGA');
    window.__USERS_MODULE_LOADED__ = true;

// ═══════════════════════════════════════════════════════════════════
// 🎨 INYECTAR CSS MODERNO PARA MÓDULO USERS (estilo hours-cube-dashboard)
// ═══════════════════════════════════════════════════════════════════
(function injectUsersModuleCSS() {
    if (document.getElementById('users-module-modern-css')) return;

    const style = document.createElement('style');
    style.id = 'users-module-modern-css';
    style.textContent = `
        /* ═══════════════════════════════════════════════════════════════════ */
        /* USERS MODULE - MODERN STYLES (similar to hours-cube-dashboard)      */
        /* ═══════════════════════════════════════════════════════════════════ */

        .users-dashboard {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            border: 1px solid #334155;
        }

        .users-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
            flex-wrap: wrap;
            gap: 20px;
        }

        .users-title h2 {
            margin: 0;
            color: #f1f5f9;
            font-size: 1.6em;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .users-subtitle {
            display: block;
            color: #94a3b8;
            font-size: 0.85em;
            margin-top: 5px;
        }

        /* TOP BAR - Métricas + Botón Agregar */
        .users-top-bar {
            display: flex;
            justify-content: space-between;
            align-items: stretch;
            background: #1e293b;
            padding: 8px 12px;
            border-radius: 8px;
            margin-bottom: 6px;
            border: 1px solid #334155;
            gap: 12px;
        }

        .users-stats-inline {
            display: flex;
            flex: 1;
            gap: 8px;
            align-items: stretch;
        }

        .users-stat-mini {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            padding: 10px 8px;
            background: rgba(0,0,0,0.25);
            border-radius: 6px;
            border-bottom: 3px solid transparent;
            min-height: 55px;
        }
        .users-stat-mini.purple { border-bottom-color: #8b5cf6; }
        .users-stat-mini.success { border-bottom-color: #10b981; }
        .users-stat-mini.info { border-bottom-color: #3b82f6; }
        .users-stat-mini.warning { border-bottom-color: #f59e0b; }

        .users-stat-mini i { font-size: 1.1em; margin-bottom: 2px; }
        .users-stat-mini .stat-value {
            font-weight: 700;
            font-size: 1.3em;
            color: #f1f5f9;
            line-height: 1;
        }
        .users-stat-mini .stat-label {
            font-size: 0.7em;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .btn-add-user {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9em;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            white-space: nowrap;
        }
        .btn-add-user:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.5);
        }

        /* FILTROS EN UNA SOLA FILA - ANCHO COMPLETO */
        .users-filters-compact {
            background: #1e293b;
            padding: 8px 12px;
            border-radius: 6px 6px 0 0;
            margin-bottom: 0;
            border: 1px solid #334155;
            border-bottom: none;
        }

        .filters-row {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: nowrap;
            width: 100%;
        }

        .filter-input {
            flex: 1;
            min-width: 80px;
            padding: 6px 10px;
            border: 1px solid #334155;
            border-radius: 4px;
            background: #0f172a;
            color: #e2e8f0;
            font-size: 0.85em;
        }
        .filter-input:focus {
            outline: none;
            border-color: #6366f1;
        }
        .filter-input::placeholder { color: #64748b; }

        .filter-select {
            flex: 1;
            min-width: 80px;
            padding: 6px 8px;
            border: 1px solid #334155;
            border-radius: 4px;
            background: #0f172a;
            color: #e2e8f0;
            font-size: 0.85em;
            cursor: pointer;
        }
        .filter-select:focus {
            outline: none;
            border-color: #6366f1;
        }

        .btn-clear-compact {
            background: #ef4444;
            color: white;
            border: none;
            width: 32px;
            height: 32px;
            min-width: 32px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            font-size: 0.85em;
        }
        .btn-clear-compact:hover {
            background: #dc2626;
            transform: scale(1.05);
        }

        .filter-results-compact {
            font-size: 0.8em;
            color: #94a3b8;
            white-space: nowrap;
            min-width: 60px;
        }

        /* Search Section - Modern Style (Legacy support) */
        .users-search-section {
            background: #1e293b;
            padding: 10px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.2);
            border: 1px solid #334155;
        }

        .users-search-grid {
            display: flex;
            gap: 15px;
            align-items: flex-end;
            flex-wrap: wrap;
        }

        .users-search-field {
            flex: 1;
            min-width: 200px;
        }

        .users-search-field label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #cbd5e1;
            font-size: 0.9em;
        }

        .users-search-field input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #334155;
            border-radius: 8px;
            font-size: 0.95em;
            transition: border-color 0.3s, box-shadow 0.3s;
            background: #0f172a;
            color: #e2e8f0;
        }

        .users-search-field input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .users-search-field input::placeholder {
            color: #64748b;
        }

        .users-search-actions {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .users-search-actions .btn-clear {
            background: #334155;
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            color: #94a3b8;
            transition: all 0.2s;
        }

        .users-search-actions .btn-clear:hover {
            background: #475569;
            color: #e2e8f0;
        }

        .users-filter-results {
            font-size: 0.8em;
            color: #94a3b8;
        }

        /* Table Container - Modern Style */
        .users-table-container {
            background: #1e293b;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.2);
            overflow: hidden;
            margin-top: 0;
            border: 1px solid #334155;
            border-top: 1px solid #475569;
        }

        .users-table {
            width: 100%;
            border-collapse: collapse;
        }

        .users-table thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .users-table th {
            padding: 15px 12px;
            text-align: center;
            font-weight: 600;
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .users-table th .th-icon {
            display: block;
            font-size: 1.2em;
            margin-bottom: 4px;
        }
        .users-table th .th-icon i { color: #60a5fa !important; }
        .users-table th:nth-child(1) .th-icon i { color: #8b5cf6 !important; }
        .users-table th:nth-child(2) .th-icon i { color: #f59e0b !important; }
        .users-table th:nth-child(3) .th-icon i { color: #10b981 !important; }
        .users-table th:nth-child(4) .th-icon i { color: #ec4899 !important; }
        .users-table th:nth-child(5) .th-icon i { color: #22c55e !important; }
        .users-table th:nth-child(6) .th-icon i { color: #f97316 !important; }
        .users-table th:nth-child(7) .th-icon i { color: #06b6d4 !important; }
        .users-table th:nth-child(8) .th-icon i { color: #3b82f6 !important; }

        .users-table tbody tr {
            border-bottom: 1px solid #334155;
            transition: background 0.2s;
        }

        .users-table tbody tr:hover {
            background: rgba(99, 102, 241, 0.1);
        }

        .users-table tbody tr:last-child {
            border-bottom: none;
        }

        .users-table td {
            padding: 14px 12px;
            text-align: center;
            color: #e2e8f0;
        }

        .users-table td.name-cell {
            font-weight: 600;
            color: #f1f5f9;
            text-align: left;
        }

        /* Status Badges - Modern Style */
        .users-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
        }

        .users-badge.success {
            background: #c6f6d5;
            color: #22543d;
        }

        .users-badge.warning {
            background: #fefcbf;
            color: #744210;
        }

        .users-badge.danger {
            background: #fed7d7;
            color: #742a2a;
        }

        .users-badge.info {
            background: #bee3f8;
            color: #2a4365;
        }

        /* Action Buttons - Modern Style */
        .users-action-btns {
            display: flex;
            gap: 4px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .users-action-btn {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            font-size: 0.9em;
        }

        .users-action-btn.view {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
            color: white !important;
            width: 38px !important;
            height: 38px !important;
            font-size: 1.1em !important;
            border-radius: 8px !important;
            border: 2px solid rgba(255,255,255,0.3) !important;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4) !important;
        }
        .users-action-btn.view:hover {
            background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%) !important;
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6) !important;
            transform: scale(1.15) !important;
            border-color: white !important;
        }
        .users-action-btn.view i {
            color: white !important;
            font-size: 1em !important;
        }

        /* Pagination - Modern Style */
        .users-pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
            padding: 8px 10px;
            background: #0f172a;
            border-top: 1px solid #334155;
        }

        .users-pagination button {
            background: #1e293b;
            border: 1px solid #334155;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
            font-size: 0.8em;
            color: #e2e8f0;
        }

        .users-pagination button:hover:not(:disabled) {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: transparent;
        }

        .users-pagination button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .users-pagination button.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: transparent;
        }

        .users-pagination-info {
            color: #94a3b8;
            font-size: 0.75em;
            margin: 0 8px;
        }

        /* Contenedores - Sin espacio extra */
        #users-container {
            margin: 0 !important;
            padding: 0 !important;
        }
        #users-list {
            margin: 0 !important;
            padding: 0 !important;
        }
        #users-list > .users-table-container {
            margin-top: 0 !important;
        }

        /* Loading Spinner */
        .users-loading {
            text-align: center;
            padding: 40px 20px;
            color: #94a3b8;
        }

        .users-spinner {
            border: 4px solid #334155;
            border-top: 4px solid #6366f1;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: users-spin 0.8s linear infinite;
            margin: 0 auto 20px;
        }

        @keyframes users-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* ═══════════════════════════════════════════════════════════════════ */
        /* MODALES - RESPONSIVE                                                */
        /* ═══════════════════════════════════════════════════════════════════ */
        [id*="Modal"], [id*="modal"] {
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

        [id*="Modal"] > div:first-child,
        [id*="modal"] > div:first-child {
            background: white !important;
            border-radius: 12px !important;
            width: 100% !important;
            max-width: 1400px !important;
            max-height: calc(100vh - 80px) !important;
            overflow-y: auto !important;
            margin: 40px auto !important;
            padding: 30px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
        }

        @media (max-width: 1200px) {
            [id*="Modal"] > div:first-child,
            [id*="modal"] > div:first-child {
                max-width: 95% !important;
                padding: 20px !important;
            }
        }

        @media (max-width: 768px) {
            .users-header { flex-direction: column; }
            .users-quick-actions { justify-content: center; }
            .users-stats-grid { grid-template-columns: repeat(2, 1fr); }
            .users-search-grid { flex-direction: column; }
            .users-table th, .users-table td { padding: 10px 6px; font-size: 0.8em; }
            [id*="Modal"] > div:first-child,
            [id*="modal"] > div:first-child {
                max-width: 98% !important;
                padding: 15px !important;
                margin: 20px auto !important;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('✅ [USERS] CSS moderno inyectado (estilo hours-cube-dashboard)');
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
        <div class="users-dashboard">
            <!-- Fila 1: Métricas compactas + Botón Agregar -->
            <div class="users-top-bar">
                <div class="users-stats-inline" id="user-stats">
                    <div class="users-stat-mini purple">
                        <i class="fas fa-users" style="color: #8b5cf6;"></i>
                        <span class="stat-value" id="total-users">--</span>
                        <span class="stat-label">Total</span>
                    </div>
                    <div class="users-stat-mini success">
                        <i class="fas fa-user-check" style="color: #10b981;"></i>
                        <span class="stat-value" id="active-users">--</span>
                        <span class="stat-label">Activos</span>
                    </div>
                    <div class="users-stat-mini info">
                        <i class="fas fa-user-shield" style="color: #3b82f6;"></i>
                        <span class="stat-value" id="admin-users">--</span>
                        <span class="stat-label">Admins</span>
                    </div>
                    <div class="users-stat-mini warning">
                        <i class="fas fa-fingerprint" style="color: #f59e0b;"></i>
                        <span class="stat-value" id="biometric-users">--</span>
                        <span class="stat-label">Biometria</span>
                    </div>
                </div>
                <button class="btn-add-user" onclick="showAddUser()">
                    <i class="fas fa-user-plus"></i> Agregar Usuario
                </button>
            </div>

            <div id="users-container">
                <!-- Filtros ultra-compactos en 1 sola fila -->
                <div class="users-filters-compact">
                    <div class="filters-row">
                        <input type="text" id="searchDNI" placeholder="DNI" onkeyup="filterUsers()" class="filter-input" />
                        <input type="text" id="searchName" placeholder="Nombre" onkeyup="filterUsers()" class="filter-input" />
                        <input type="text" id="searchLegajo" placeholder="Legajo" onkeyup="filterUsers()" class="filter-input" />
                        <select id="filterDepartment" onchange="filterUsers()" class="filter-select"><option value="">Depto</option></select>
                        <select id="filterRole" onchange="filterUsers()" class="filter-select"><option value="">Rol</option><option value="admin">Admin</option><option value="operator">Operador</option><option value="employee">Empleado</option></select>
                        <select id="filterStatus" onchange="filterUsers()" class="filter-select"><option value="">Estado</option><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select>
                        <select id="filterGPS" onchange="filterUsers()" class="filter-select"><option value="">GPS</option><option value="true">Si</option><option value="false">No</option></select>
                        <select id="filterBiometric" onchange="filterUsers()" class="filter-select"><option value="">Bio</option><option value="Registrado">Si</option><option value="Pendiente">No</option></select>
                        <button class="btn-clear-compact" onclick="clearFilters()" title="Limpiar"><i class="fas fa-times"></i></button>
                        <span id="filterResults" class="filter-results-compact"></span>
                    </div>
                </div><!-- Users List --><div id="users-list" class="users-loading">
                    <div class="users-spinner"></div>
                    <p style="color: #718096;">Cargando usuarios...</p>
                </div>

                <!-- Pagination Bottom -->
                <div id="pagination-bottom" style="display: none;"></div>
            </div>

            <!-- Footer legal -->
            <div style="margin-top: 20px; text-align: center; color: #718096; font-size: 0.85em;">
                <i class="fas fa-shield-alt"></i> Datos protegidos | Sistema Multi-Tenant con aislamiento por empresa
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

        // Poblar filtro de departamentos
        populateDepartmentFilter();

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
        <div class="users-table-container">
            <table class="users-table">
                <thead>
                    <tr>
                        <th>
                            <span class="th-icon"><i class="fas fa-user" style="color: #8b5cf6;"></i></span>
                            Nombre
                        </th>
                        <th>
                            <span class="th-icon"><i class="fas fa-id-badge" style="color: #f59e0b;"></i></span>
                            Legajo
                        </th>
                        <th>
                            <span class="th-icon"><i class="fas fa-building" style="color: #10b981;"></i></span>
                            Departamento
                        </th>
                        <th>
                            <span class="th-icon"><i class="fas fa-crown" style="color: #ec4899;"></i></span>
                            Rol
                        </th>
                        <th>
                            <span class="th-icon"><i class="fas fa-toggle-on" style="color: #22c55e;"></i></span>
                            Estado
                        </th>
                        <th>
                            <span class="th-icon"><i class="fas fa-map-marker-alt" style="color: #f97316;"></i></span>
                            GPS
                        </th>
                        <th>
                            <span class="th-icon"><i class="fas fa-fingerprint" style="color: #06b6d4;"></i></span>
                            Bio
                        </th>
                        <th>
                            <span class="th-icon"><i class="fas fa-cogs" style="color: #3b82f6;"></i></span>
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody>
    `;

    // 📄 RENDER ONLY CURRENT PAGE USERS
    paginatedUsers.forEach(user => {
        const statusClass = user.status === 'Activo' ? 'success' : 'danger';
        const biometricClass = user.biometric === 'Registrado' ? 'success' : 'warning';

        const gpsRadiusClass = user.allowOutsideRadius ? 'success' : 'warning';
        const gpsRadiusText = user.allowOutsideRadius ? 'Permitido' : 'Restringido';

        tableHTML += `
            <tr>
                <td class="name-cell">${user.name}</td>
                <td>${user.legajo}</td>
                <td>${user.department || 'Sin asignar'}</td>
                <td><span class="users-badge info">${user.role}</span></td>
                <td><span class="users-badge ${statusClass}">${user.status}</span></td>
                <td><span class="users-badge ${gpsRadiusClass}">${gpsRadiusText}</span></td>
                <td>
                    <span class="users-badge ${biometricClass}">${user.biometric}</span>
                </td>
                <td>
                    <div class="users-action-btns">
                        <button class="users-action-btn view" onclick="viewUser('${user.id}')" title="Ver Empleado" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; width: 38px; height: 38px; font-size: 1.1em; border-radius: 8px; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4); cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-eye" style="color: white;"></i>
                        </button>
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
        const activeClass = i === currentPage ? 'active' : '';
        pagesHTML += `
            <button class="${activeClass}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    return `
        <div class="users-pagination">
            <span class="users-pagination-info">
                Mostrando <strong>${startIndex + 1}</strong> a <strong>${endIndex}</strong> de <strong>${totalUsers}</strong>
            </span>

            <select onchange="changeItemsPerPage(this.value)" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.9em;">
                <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
                <option value="9999" ${itemsPerPage === 9999 ? 'selected' : ''}>Todos</option>
            </select>

            <button onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-double-left"></i>
            </button>
            <button onclick="previousPage()" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-angle-left"></i>
            </button>

            ${pagesHTML}

            <button onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-angle-right"></i>
            </button>
            <button onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-angle-double-right"></i>
            </button>
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

    // Store userId globally for calendar and other components
    window.currentViewUserId = userId;

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
        modal.setAttribute('data-version', '13.0-FULLSCREEN-CSS-EXCEPTION');
        console.log('✅ MODAL VERSIÓN 13.0 - FULLSCREEN | CSS Exception en modal-fullscreen-responsive.css');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 0;
            border: none;
            z-index: 10000;
            overflow: hidden;
            background: white;
        `;
        
        const roleText = user.role === 'admin' ? 'Administrador' : 
                        user.role === 'supervisor' ? 'Supervisor' :
                        user.role === 'medical' ? 'Médico' : 'Empleado';

        // Detectar tamaño de pantalla y ajustar modal dinámicamente - FORZAR PANTALLA COMPLETA
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let modalWidth, modalMaxWidth, modalHeight;

        // MAXIMIZAR MODAL AL 100% - FORZADO CON PÍXELES + AJUSTES PERSONALIZADOS
        modalWidth = '100vw';  // Pantalla completa
        modalMaxWidth = '100vw';
        modalHeight = '100vh';  // Pantalla completa

        // Ocultar scroll del body mientras el modal está abierto
        document.body.style.overflow = 'hidden';

        modal.innerHTML = `
            <div style="background: white; position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; display: block; overflow: hidden; margin: 0 !important; padding: 0 !important;">
                <!-- Header del Expediente -->
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 70px; background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%); color: white; padding: 15px 20px; border-radius: 0; display: flex; justify-content: space-between; align-items: center; z-index: 100;">
                    <div>
                        <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                            📋 Expediente Digital: ${user.firstName} ${user.lastName}
                        </h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">ID: ${user.employeeId} | ${roleText} | ${user.department?.name || 'Sin departamento'}</p>
                    </div>
                    <button onclick="closeEmployeeFile()" style="position: fixed; top: 20px; right: 20px; background: #dc3545; border: none; color: white; border-radius: 50%; width: 45px; height: 45px; cursor: pointer; font-size: 20px; z-index: 10001; box-shadow: 0 4px 8px rgba(0,0,0,0.3); transition: all 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">✕</button>
                </div>

                <!-- Tabs del Expediente -->
                <div style="position: absolute; top: 70px; left: 0; right: 0; height: 50px; background: #ecf0f1; padding: 10px 20px; display: flex; gap: 5px; flex-wrap: wrap; z-index: 99; border-bottom: 2px solid #ddd;">
                    <button class="file-tab active" onclick="showFileTab('admin', this)">⚙️ Administración</button>
                    <button class="file-tab" onclick="showFileTab('personal', this)">👤 Datos Personales</button>
                    <button class="file-tab" onclick="showFileTab('work', this)">💼 Antecedentes Laborales</button>
                    <button class="file-tab" onclick="showFileTab('family', this)">👨‍👩‍👧‍👦 Grupo Familiar</button>
                    <button class="file-tab" onclick="showFileTab('medical', this)">🏥 Antecedentes Médicos</button>
                    <button class="file-tab" onclick="showFileTab('attendance', this)">📅 Asistencias/Permisos</button>
                    <button class="file-tab" onclick="showFileTab('calendar', this)">📆 Calendario</button>
                    <button class="file-tab" onclick="showFileTab('disciplinary', this)">⚖️ Disciplinarios</button>
                    <button class="file-tab" onclick="showFileTab('tasks', this)">🎯 Config. Tareas</button>
                    <button class="file-tab" onclick="showFileTab('biometric', this)">📸 Registro Biométrico</button>
                    <button class="file-tab" onclick="showFileTab('notifications', this)">🔔 Notificaciones</button>
                </div>

                <!-- Contenido del Expediente -->
                <div style="position: absolute; top: 160px; left: 0; right: 0; bottom: 0; padding: 20px; overflow-y: auto; background: white;">
                    
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
                                    <div class="info-value" id="admin-branch">${user.branchName || (user.defaultBranchId ? 'Asignada' : 'Sin asignar')}</div>
                                    <button class="btn btn-sm btn-outline-info" onclick="manageBranches('${userId}')">🏢 Gestionar Sucursales</button>
                                </div>
                                <div class="info-card">
                                    <div class="info-label">🕐 Turnos Asignados:</div>
                                    <div class="info-value" id="admin-shifts">${user.shiftNames && user.shiftNames.length > 0 ? user.shiftNames.join(', ') : 'Sin turnos'}</div>
                                    <button class="btn btn-sm btn-outline-info" onclick="assignUserShifts('${userId}', '${user.firstName} ${user.lastName}')">🕐 Asignar Turnos</button>
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
                                    <div class="info-value" id="admin-department">${user.departmentName || user.departmentId || 'Sin departamento'}</div>
                                    <button class="btn btn-sm btn-outline-success" onclick="changeDepartment('${userId}', '${user.departmentId || ''}')">🔄 Cambiar Departamento</button>
                                </div>
                                <div class="info-card">
                                    <div class="info-label">💼 Posición:</div>
                                    <div class="info-value" id="admin-position">${user.position || 'No especificada'}</div>
                                    <button class="btn btn-sm btn-outline-primary" onclick="editPosition('${userId}', '${user.position || ''}')">✏️ Editar Posición</button>
                                </div>
                            </div>
                        </div>

                        <!-- Acceso a Kioscos -->
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">📟 Acceso a Kioscos</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div class="info-card">
                                    <div class="info-label">📟 Puede usar Kioscos:</div>
                                    <div class="info-value" id="admin-kiosk-access">
                                        <span class="status-badge ${user.canUseKiosk || user.can_use_kiosk ? 'success' : 'secondary'}">${user.canUseKiosk || user.can_use_kiosk ? '✅ Habilitado' : '❌ No habilitado'}</span>
                                    </div>
                                </div>
                                <div class="info-card">
                                    <div class="info-label">🏢 Kioscos Autorizados:</div>
                                    <div class="info-value" id="admin-allowed-kiosks">
                                        ${user.useAllKiosks || user.use_all_kiosks ? '✅ Todos los kioscos' : (user.allowedKiosks && user.allowedKiosks.length > 0 ? user.allowedKiosks.map(k => k.name || k).join(', ') : 'Ninguno específico')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Horario Flexible -->
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">⏰ Configuración de Horario</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div class="info-card">
                                    <div class="info-label">⏰ Horario Flexible:</div>
                                    <div class="info-value" id="admin-flexible-schedule">
                                        <span class="status-badge ${user.hasFlexibleSchedule || user.has_flexible_schedule ? 'warning' : 'secondary'}">${user.hasFlexibleSchedule || user.has_flexible_schedule ? '✅ Habilitado (sin restricción horaria)' : '📅 Horario estándar'}</span>
                                    </div>
                                </div>
                                <div class="info-card">
                                    <div class="info-label">📝 Notas de Horario Flexible:</div>
                                    <div class="info-value" id="admin-flexible-notes">
                                        ${user.flexibleScheduleNotes || user.flexible_schedule_notes || 'Sin notas'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Permisos de Autorización -->
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">🔐 Permisos Especiales</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div class="info-card">
                                    <div class="info-label">⏱️ Puede Autorizar Llegadas Tarde:</div>
                                    <div class="info-value" id="admin-authorize-late">
                                        <span class="status-badge ${user.canAuthorizeLateArrivals || user.can_authorize_late_arrivals ? 'success' : 'secondary'}">${user.canAuthorizeLateArrivals || user.can_authorize_late_arrivals ? '✅ Habilitado' : '❌ No habilitado'}</span>
                                    </div>
                                </div>
                                <div class="info-card">
                                    <div class="info-label">📱 Puede usar App Móvil:</div>
                                    <div class="info-value" id="admin-mobile-app">
                                        <span class="status-badge ${user.canUseMobileApp || user.can_use_mobile_app ? 'success' : 'secondary'}">${user.canUseMobileApp || user.can_use_mobile_app ? '✅ Habilitado' : '❌ No habilitado'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Acciones Administrativas -->
                        <div style="border: 1px solid #e74c3c; border-radius: 8px; padding: 15px; margin: 15px 0; background: #fdf2f2;">
                            <h4 style="margin: 0 0 15px 0; color: #c0392b;">⚡ Acciones Administrativas</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                <button class="btn btn-warning" onclick="resetPassword('${userId}', '${user.firstName} ${user.lastName}')">🔑 Resetear Contraseña</button>
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
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #2c3e50; margin: 0;">Datos Básicos</h4>
                                        <button class="btn btn-sm btn-primary" onclick="editBasicData('${userId}')" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer;">✏️ Editar</button>
                                    </div>
                                    <div id="basic-data-display-${userId}" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                        <div><strong>Nombre Completo:</strong><br><span id="display-fullname-${userId}">${user.firstName} ${user.lastName}</span></div>
                                        <div><strong>DNI/ID:</strong><br><span id="display-employeeid-${userId}">${user.employeeId}</span></div>
                                        <div><strong>Email:</strong><br><span id="display-email-${userId}">${user.email}</span></div>
                                        <div><strong>Teléfono:</strong><br><span id="display-phone-${userId}">${user.phone || 'No especificado'}</span></div>
                                        <div><strong>Fecha Nacimiento:</strong><br><span id="display-birthdate-${userId}">${user.birthDate ? new Date(user.birthDate).toLocaleDateString() : 'No especificada'}</span></div>
                                        <div><strong>Fecha Ingreso:</strong><br><span id="display-hiredate-${userId}">${user.hireDate ? new Date(user.hireDate).toLocaleDateString() : 'No especificada'}</span></div>
                                    </div>
                                    <div style="margin-top: 10px;">
                                        <strong>Dirección:</strong><br><span id="display-address-${userId}">${user.address || 'No especificada'}</span>
                                    </div>
                                </div>
                                
                                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #856404; margin: 0;">📞 Contactos</h4>
                                        <button class="btn btn-sm btn-warning" onclick="editContactInfo('${userId}')">✏️ Editar</button>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                        <div><strong>Emergencia:</strong><br>${user.emergencyContact || 'No especificado'}</div>
                                        <div><strong>Tel. Emergencia:</strong><br>${user.emergencyPhone || 'No especificado'}</div>
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
                                        <div style="margin: 8px 0;">
                                            <strong>Turnos Asignados:</strong><br>${user.shiftNames && user.shiftNames.length > 0 ? user.shiftNames.join(', ') : '❌ Sin turnos asignados'}
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
                                <h4>📌 Posición Actual <span style="font-size: 11px; color: #666; font-weight: normal;">(Resumen - editar desde ⚙️ Administración)</span></h4>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <div><strong>Cargo:</strong><br>${user.position || 'No especificado'}</div>
                                    <div><strong>Departamento:</strong><br><span style="color: #666;">${user.department?.name || user.departmentName || 'No asignado'}</span> <span style="font-size: 10px; color: #999;">→ Tab Admin</span></div>
                                </div>
                            </div>

                            <!-- SECCIÓN SALARIAL COMPLETA -->
                            <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px solid #4caf50;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="color: #2e7d32; margin: 0;">💰 Configuración Salarial</h4>
                                    <button class="btn btn-sm btn-success" onclick="editSalaryConfig('${userId}')">✏️ Editar Configuración</button>
                                </div>

                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                    <!-- Convenio y Categoría -->
                                    <div style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
                                        <h5 style="color: #1b5e20; margin: 0 0 12px 0; font-size: 14px;">📋 Convenio y Categoría</h5>
                                        <div style="font-size: 13px;">
                                            <div style="margin-bottom: 8px;">
                                                <strong id="salary-agreement-label">Convenio Laboral:</strong><br>
                                                <span id="salary-agreement" style="color: #2e7d32; font-weight: bold;">No asignado</span>
                                            </div>
                                            <div style="margin-bottom: 8px;">
                                                <strong id="salary-category-label">Categoría Salarial:</strong><br>
                                                <span id="salary-category">No asignada</span>
                                            </div>
                                            <div>
                                                <strong>Tipo de Salario:</strong><br>
                                                <span id="salary-type" style="padding: 2px 8px; background: #c8e6c9; border-radius: 10px; font-size: 11px;">--</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Salario Actual -->
                                    <div style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px;">
                                        <h5 style="color: #1b5e20; margin: 0 0 12px 0; font-size: 14px;">💵 Salario Actual</h5>
                                        <div style="text-align: center;">
                                            <div style="font-size: 28px; font-weight: bold; color: #2e7d32;" id="salary-base-amount">$--</div>
                                            <div style="font-size: 11px; color: #666;">Salario Base Bruto</div>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; font-size: 12px;">
                                            <div style="text-align: center; background: #e8f5e9; padding: 6px; border-radius: 4px;">
                                                <div id="salary-hourly-rate">$--</div>
                                                <div style="font-size: 10px; color: #666;">Hora Normal</div>
                                            </div>
                                            <div style="text-align: center; background: #fff3e0; padding: 6px; border-radius: 4px;">
                                                <div id="salary-overtime-rate">$--</div>
                                                <div style="font-size: 10px; color: #666;">Hora Extra 50%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Historial de Aumentos -->
                                <div style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px; margin-top: 15px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <h5 style="color: #1b5e20; margin: 0; font-size: 14px;">📈 Historial de Aumentos</h5>
                                        <button class="btn btn-sm btn-outline-success" onclick="addSalaryIncrease('${userId}')">+ Registrar Aumento</button>
                                    </div>
                                    <div id="salary-history-list" style="font-size: 12px; max-height: 120px; overflow-y: auto;">
                                        <p style="text-align: center; color: #666; font-style: italic;">Sin historial de aumentos</p>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px; font-size: 11px; text-align: center;">
                                        <div style="background: #e3f2fd; padding: 6px; border-radius: 4px;">
                                            <strong id="salary-last-increase">--</strong><br>Último Aumento
                                        </div>
                                        <div style="background: #e3f2fd; padding: 6px; border-radius: 4px;">
                                            <strong id="salary-increase-pct">--</strong><br>% Incremento
                                        </div>
                                        <div style="background: #e3f2fd; padding: 6px; border-radius: 4px;">
                                            <strong id="salary-update-date">--</strong><br>Fecha Actualización
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- HISTORIAL DE LIQUIDACIONES (DINÁMICO) -->
                            <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px solid #2196f3;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="color: #1565c0; margin: 0;">📊 Historial de Liquidaciones</h4>
                                    <div>
                                        <button class="btn btn-sm btn-secondary" onclick="loadUserPayrollHistory('${userId}')">🔄 Actualizar</button>
                                    </div>
                                </div>

                                <!-- KPIs Dinámicos -->
                                <div id="payroll-kpis-${userId}" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
                                    <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 8px; text-align: center;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Última Liquidación</div>
                                        <div style="font-size: 18px; font-weight: bold; color: #1565c0;" id="payroll-last-net-${userId}">--</div>
                                        <div style="font-size: 10px; color: #666;" id="payroll-last-period-${userId}">Sin datos</div>
                                    </div>
                                    <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 8px; text-align: center;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Total Liquidaciones</div>
                                        <div style="font-size: 18px; font-weight: bold; color: #388e3c;" id="payroll-total-count-${userId}">0</div>
                                        <div style="font-size: 10px; color: #2e7d32;">registradas</div>
                                    </div>
                                    <div style="background: rgba(255,255,255,0.8); padding: 12px; border-radius: 8px; text-align: center;">
                                        <div style="font-size: 11px; color: #666; margin-bottom: 5px;" id="payroll-ytd-year-${userId}">Acumulado 2025</div>
                                        <div style="font-size: 18px; font-weight: bold; color: #7b1fa2;" id="payroll-ytd-net-${userId}">--</div>
                                        <div style="font-size: 10px; color: #666;" id="payroll-ytd-months-${userId}">0 meses procesados</div>
                                    </div>
                                </div>

                                <!-- Grilla de Liquidaciones -->
                                <div style="background: rgba(255,255,255,0.9); border-radius: 8px; overflow: hidden;">
                                    <div style="max-height: 300px; overflow-y: auto;">
                                        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                            <thead style="background: #1565c0; color: white; position: sticky; top: 0;">
                                                <tr>
                                                    <th style="padding: 10px; text-align: left;">Período</th>
                                                    <th style="padding: 10px; text-align: right;">Bruto</th>
                                                    <th style="padding: 10px; text-align: right;">Deducciones</th>
                                                    <th style="padding: 10px; text-align: right;">Neto</th>
                                                    <th style="padding: 10px; text-align: center;">Estado</th>
                                                    <th style="padding: 10px; text-align: center;">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody id="payroll-history-table-${userId}">
                                                <tr>
                                                    <td colspan="6" style="padding: 20px; text-align: center; color: #666;">
                                                        <span id="payroll-loading-${userId}">⏳ Cargando historial...</span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <!-- Paginación -->
                                <div id="payroll-pagination-${userId}" style="display: none; margin-top: 10px; text-align: center;">
                                    <button class="btn btn-sm btn-outline-primary" onclick="loadMorePayrollHistory('${userId}')" id="payroll-load-more-${userId}">
                                        Cargar más liquidaciones
                                    </button>
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

                            <!-- Documentos / Certificados Familiares -->
                            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="color: #e65100; margin: 0;">📄 Documentos / Certificados Familiares</h4>
                                    <button class="btn btn-sm btn-warning" onclick="addFamilyDocument('${userId}')" style="background: #ff9800; border: none; color: white;">+ Cargar Documento</button>
                                </div>
                                <p style="font-size: 12px; color: #666; margin-bottom: 15px;">
                                    Certificados de escolaridad, facturas de guardería, certificados médicos y otros documentos que pueden ser requeridos para beneficios o asignaciones.
                                </p>
                                <div id="family-documents-list">
                                    <p style="text-align: center; color: #666; font-style: italic; font-size: 12px;">No hay documentos cargados</p>
                                </div>
                                <div id="family-documents-stats" style="display: none; margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 6px;">
                                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; font-size: 12px;">
                                        <div>
                                            <span style="font-size: 20px; color: #4caf50;">&#10003;</span><br>
                                            <strong id="docs-valid-count">0</strong> Vigentes
                                        </div>
                                        <div>
                                            <span style="font-size: 20px; color: #ff9800;">&#9888;</span><br>
                                            <strong id="docs-expiring-count">0</strong> Por Vencer
                                        </div>
                                        <div>
                                            <span style="font-size: 20px; color: #f44336;">&#10007;</span><br>
                                            <strong id="docs-expired-count">0</strong> Vencidos
                                        </div>
                                        <div>
                                            <span style="font-size: 20px; color: #2196f3;">&#128196;</span><br>
                                            <strong id="docs-total-count">0</strong> Total
                                        </div>
                                    </div>
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
                            
                            <!-- Nueva fila: Datos Antropométricos -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 15px; border-radius: 8px; border: 1px solid #90caf9;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <h4 style="color: #1565c0; margin: 0;">📊 Datos Antropométricos</h4>
                                        <button class="btn btn-sm btn-primary" onclick="editAnthropometricData('${userId}')">✏️ Actualizar</button>
                                    </div>
                                    <div id="anthropometric-data" style="font-size: 13px;">
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                            <div style="background: rgba(255,255,255,0.7); padding: 10px; border-radius: 6px; text-align: center;">
                                                <div style="font-size: 24px; font-weight: bold; color: #1565c0;" id="user-weight">--</div>
                                                <div style="font-size: 11px; color: #666;">Peso (kg)</div>
                                            </div>
                                            <div style="background: rgba(255,255,255,0.7); padding: 10px; border-radius: 6px; text-align: center;">
                                                <div style="font-size: 24px; font-weight: bold; color: #1565c0;" id="user-height">--</div>
                                                <div style="font-size: 11px; color: #666;">Altura (cm)</div>
                                            </div>
                                        </div>
                                        <div style="background: rgba(255,255,255,0.7); padding: 10px; border-radius: 6px; margin-top: 10px; text-align: center;">
                                            <div style="display: flex; justify-content: space-around; align-items: center;">
                                                <div>
                                                    <div style="font-size: 28px; font-weight: bold;" id="user-bmi">--</div>
                                                    <div style="font-size: 11px; color: #666;">IMC</div>
                                                </div>
                                                <div id="bmi-indicator" style="padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                                                    Sin datos
                                                </div>
                                            </div>
                                        </div>
                                        <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center;">
                                            Última medición: <span id="anthropometric-date">No registrada</span>
                                        </div>
                                    </div>
                                </div>

                                <div style="background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%); padding: 15px; border-radius: 8px; border: 1px solid #f48fb1;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <h4 style="color: #c2185b; margin: 0;">🔪 Historial de Cirugías</h4>
                                        <button class="btn btn-sm btn-danger" onclick="addSurgery('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="surgeries-list" style="max-height: 180px; overflow-y: auto;">
                                        <p style="font-style: italic; color: #666; font-size: 12px; text-align: center;">Sin cirugías registradas</p>
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
                                
                                <div style="background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); padding: 15px; border-radius: 8px; border: 1px solid #ce93d8;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <h4 style="color: #7b1fa2; margin: 0;">🧠 Salud Mental y Tratamientos Psiquiátricos</h4>
                                        <button class="btn btn-sm btn-secondary" onclick="addPsychiatricTreatment('${userId}')">+ Tratamiento</button>
                                    </div>
                                    <div id="mental-health-info" style="font-size: 13px;">
                                        <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                                            <strong>Estado General:</strong>
                                            <span id="mental-health-status" style="margin-left: 8px; padding: 2px 8px; border-radius: 10px; font-size: 11px; background: #c8e6c9; color: #2e7d32;">Sin condiciones</span>
                                        </div>
                                        <div style="margin-bottom: 8px;"><strong>Tratamientos Activos:</strong> <span id="active-psychiatric-count">0</span></div>
                                        <div style="margin-bottom: 8px;"><strong>Tratamientos Anteriores:</strong> <span id="past-psychiatric-count">0</span></div>
                                        <div id="psychiatric-treatments-list" style="max-height: 100px; overflow-y: auto; font-size: 11px;">
                                            <p style="font-style: italic; color: #666; text-align: center;">Sin tratamientos registrados</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Nueva fila: Deportes y Hábitos Saludables -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 15px; border-radius: 8px; border: 1px solid #a5d6a7;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <h4 style="color: #2e7d32; margin: 0;">⚽ Actividades Deportivas</h4>
                                        <button class="btn btn-sm btn-success" onclick="addSportsActivity('${userId}')">+ Agregar</button>
                                    </div>
                                    <div id="sports-activities-summary" style="font-size: 13px;">
                                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                                            <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px; text-align: center;">
                                                <div style="font-size: 20px; font-weight: bold; color: #2e7d32;" id="total-sports">0</div>
                                                <div style="font-size: 10px; color: #666;">Deportes</div>
                                            </div>
                                            <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px; text-align: center;">
                                                <div style="font-size: 20px; font-weight: bold; color: #1565c0;" id="weekly-hours">0</div>
                                                <div style="font-size: 10px; color: #666;">Hrs/Semana</div>
                                            </div>
                                            <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px; text-align: center;">
                                                <div style="font-size: 20px; font-weight: bold; color: #f57c00;" id="competition-level">-</div>
                                                <div style="font-size: 10px; color: #666;">Nivel</div>
                                            </div>
                                        </div>
                                        <div id="sports-list" style="max-height: 100px; overflow-y: auto;">
                                            <p style="font-style: italic; color: #666; font-size: 12px; text-align: center;">Sin actividades deportivas</p>
                                        </div>
                                    </div>
                                </div>

                                <div style="background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); padding: 15px; border-radius: 8px; border: 1px solid #ffd54f;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <h4 style="color: #f57c00; margin: 0;">🌿 Hábitos Saludables</h4>
                                        <button class="btn btn-sm btn-warning" onclick="editHealthyHabits('${userId}')">✏️ Editar</button>
                                    </div>
                                    <div id="healthy-habits-info" style="font-size: 13px;">
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                            <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px;">
                                                <div style="font-size: 11px; color: #666;">🚬 Tabaco</div>
                                                <div id="smoking-status" style="font-weight: bold;">No fuma</div>
                                            </div>
                                            <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px;">
                                                <div style="font-size: 11px; color: #666;">🍺 Alcohol</div>
                                                <div id="alcohol-status" style="font-weight: bold;">Ocasional</div>
                                            </div>
                                            <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px;">
                                                <div style="font-size: 11px; color: #666;">😴 Sueño</div>
                                                <div id="sleep-hours" style="font-weight: bold;">-- hrs</div>
                                            </div>
                                            <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px;">
                                                <div style="font-size: 11px; color: #666;">🥗 Dieta</div>
                                                <div id="diet-type" style="font-weight: bold;">--</div>
                                            </div>
                                        </div>
                                        <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 6px; margin-top: 8px;">
                                            <div style="font-size: 11px; color: #666;">⚠️ Deportes Extremos</div>
                                            <div id="extreme-sports" style="font-weight: bold; color: #d32f2f;">Ninguno declarado</div>
                                        </div>
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

                    <!-- Tab: Calendario Personal -->
                    <div id="calendar-tab" class="file-tab-content" style="display: none;">
                        <h3>📆 Calendario de Trabajo Personal</h3>
                        <div id="user-calendar-container">
                            <div style="text-align: center; padding: 40px; color: #666;">
                                <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
                                <p>Cargando calendario...</p>
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

                        <!-- Nueva sección: Documentos de Identidad -->
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">🆔 Documentos de Identidad</h4>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                                <button class="btn btn-primary" onclick="openDniPhotosModal('${userId}')">
                                    📄 DNI (Frente y Dorso)
                                </button>
                                <button class="btn btn-primary" onclick="openPassportModal('${userId}')">
                                    🛂 Pasaporte
                                </button>
                                <button class="btn btn-primary" onclick="openWorkVisaModal('${userId}')">
                                    🌍 Visa de Trabajo
                                </button>
                                <button class="btn btn-primary" onclick="openNationalLicenseModal('${userId}')">
                                    🚗 Licencia de Conducir
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: Notificaciones del Empleado -->
                    <div id="notifications-tab" class="file-tab-content" style="display: none;">
                        <h3>🔔 Notificaciones del Empleado</h3>
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px 0; background: #f8f9fa;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: #333;">📬 Bandeja de Notificaciones</h4>
                                <button class="btn btn-primary btn-sm" onclick="loadEmployeeNotifications('${userId}')">
                                    🔄 Actualizar
                                </button>
                            </div>
                            <div id="employee-notifications-container" style="max-height: 500px; overflow-y: auto;">
                                <div style="text-align: center; padding: 40px; color: #666;">
                                    <i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i>
                                    <p>Cargando notificaciones...</p>
                                </div>
                            </div>
                        </div>

                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">📊 Resumen de Notificaciones</h4>
                            <div id="employee-notifications-stats" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 24px; font-weight: bold; color: #2196f3;" id="notif-stat-total">-</div>
                                    <div style="font-size: 12px; color: #666;">Total</div>
                                </div>
                                <div style="background: #fdecea; padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 24px; font-weight: bold; color: #f44336;" id="notif-stat-unread">-</div>
                                    <div style="font-size: 12px; color: #666;">Sin Leer</div>
                                </div>
                                <div style="background: #fff8e1; padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 24px; font-weight: bold; color: #ff9800;" id="notif-stat-pending">-</div>
                                    <div style="font-size: 12px; color: #666;">Pendientes</div>
                                </div>
                                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 24px; font-weight: bold; color: #4caf50;" id="notif-stat-resolved">-</div>
                                    <div style="font-size: 12px; color: #666;">Resueltas</div>
                                </div>
                            </div>
                        </div>
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
                    <button class="btn btn-secondary" onclick="generateAllUsersReportSimple()" style="margin: 5px;">
                        📋 Generar reporte simple (consola)
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
// ✅ RENOMBRADA para evitar conflicto con generateUserReport(userId) de línea 8205
function generateAllUsersReportSimple() {
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

// User filtering functions - EXTENDIDO con todos los filtros
function filterUsers() {
    const dniSearch = document.getElementById('searchDNI')?.value.trim().toLowerCase() || '';
    const nameSearch = document.getElementById('searchName')?.value.trim().toLowerCase() || '';
    const legajoSearch = document.getElementById('searchLegajo')?.value.trim().toLowerCase() || '';
    const deptFilter = document.getElementById('filterDepartment')?.value || '';
    const roleFilter = document.getElementById('filterRole')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const gpsFilter = document.getElementById('filterGPS')?.value || '';
    const bioFilter = document.getElementById('filterBiometric')?.value || '';

    const hasAnyFilter = dniSearch || nameSearch || legajoSearch || deptFilter || roleFilter || statusFilter || gpsFilter || bioFilter;

    if (!hasAnyFilter) {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(user => {
            // Filtro DNI
            const matchesDNI = !dniSearch || (user.dni && user.dni.toLowerCase().includes(dniSearch));

            // Filtro Nombre
            const matchesName = !nameSearch || (
                (user.name && user.name.toLowerCase().includes(nameSearch)) ||
                (user.firstName && user.firstName.toLowerCase().includes(nameSearch)) ||
                (user.lastName && user.lastName.toLowerCase().includes(nameSearch)) ||
                (user.email && user.email.toLowerCase().includes(nameSearch))
            );

            // Filtro Legajo
            const matchesLegajo = !legajoSearch || (user.legajo && user.legajo.toLowerCase().includes(legajoSearch));

            // Filtro Departamento
            const matchesDept = !deptFilter || (user.department && user.department === deptFilter);

            // Filtro Rol
            const matchesRole = !roleFilter || (user.role && user.role.toLowerCase() === roleFilter.toLowerCase());

            // Filtro Estado
            const matchesStatus = !statusFilter || (user.status && user.status === statusFilter);

            // Filtro GPS
            const matchesGPS = !gpsFilter || (
                (gpsFilter === 'true' && user.allowOutsideRadius === true) ||
                (gpsFilter === 'false' && user.allowOutsideRadius === false)
            );

            // Filtro Biometría
            const matchesBio = !bioFilter || (user.biometric && user.biometric === bioFilter);

            return matchesDNI && matchesName && matchesLegajo && matchesDept && matchesRole && matchesStatus && matchesGPS && matchesBio;
        });
    }

    // 📄 Reset pagination to first page when filtering
    currentPage = 1;

    displayUsersTable(filteredUsers);
    updateFilterResults();
}

function clearFilters() {
    const searchDNI = document.getElementById('searchDNI');
    const searchName = document.getElementById('searchName');
    const searchLegajo = document.getElementById('searchLegajo');
    const filterDept = document.getElementById('filterDepartment');
    const filterRole = document.getElementById('filterRole');
    const filterStatus = document.getElementById('filterStatus');
    const filterGPS = document.getElementById('filterGPS');
    const filterBio = document.getElementById('filterBiometric');

    if (searchDNI) searchDNI.value = '';
    if (searchName) searchName.value = '';
    if (searchLegajo) searchLegajo.value = '';
    if (filterDept) filterDept.value = '';
    if (filterRole) filterRole.value = '';
    if (filterStatus) filterStatus.value = '';
    if (filterGPS) filterGPS.value = '';
    if (filterBio) filterBio.value = '';

    filteredUsers = [...allUsers];

    // 📄 Reset pagination to first page when clearing filters
    currentPage = 1;

    displayUsersTable(filteredUsers);
    updateFilterResults();
}

// Función para poblar el select de departamentos
function populateDepartmentFilter() {
    const select = document.getElementById('filterDepartment');
    if (!select || !allUsers.length) return;

    // Extraer departamentos únicos
    const departments = [...new Set(allUsers.map(u => u.department).filter(Boolean))].sort();

    // Limpiar opciones existentes excepto la primera
    select.innerHTML = '<option value="">Departamento</option>';

    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
    });
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
function assignUserShifts(userId, userName, userBranchId = null) {
    console.log('🕐 [USERS] Asignando turnos para usuario:', userId, userName, 'Branch:', userBranchId);

    // Crear modal específico para asignación de turnos de un usuario
    const modal = document.createElement('div');
    modal.id = 'assignUserShiftsModal';
    modal.dataset.userId = userId;
    modal.dataset.userName = userName;
    modal.dataset.branchId = userBranchId || '';
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
        <div style="background: white; border-radius: 12px; max-width: 600px; width: 90%; max-height: 85vh; overflow-y: auto;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                    🕐 Asignar Turno: ${userName}
                    <button onclick="closeUserShiftsModal()" style="margin-left: auto; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">✕</button>
                </h3>
            </div>
            <div style="padding: 20px;">
                <!-- Turno actual -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0;">🕐 Turno Actual</h4>
                    <div id="currentUserShiftInfo" style="padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                        Cargando...
                    </div>
                </div>

                <!-- Selección de nuevo turno -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0;">📋 Seleccionar Turno</h4>
                    <select id="shiftSelector" style="width: 100%; padding: 12px; border: 2px solid #28a745; border-radius: 8px; font-size: 14px; background: white;" onchange="onShiftSelected()">
                        <option value="">-- Cargando turnos disponibles... --</option>
                    </select>
                    <div id="shiftDetails" style="margin-top: 10px; padding: 10px; background: #e8f5e9; border-radius: 6px; display: none;"></div>
                </div>

                <!-- Fase para turnos rotativos -->
                <div id="phaseContainer" style="margin-bottom: 20px; display: none;">
                    <h4 style="margin: 0 0 10px 0;">🔄 Fase del Turno Rotativo</h4>
                    <select id="phaseSelector" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                        <option value="">-- Seleccionar fase --</option>
                    </select>
                    <p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">
                        El empleado trabajará cuando el turno global esté en esta fase
                    </p>
                </div>

                <!-- Fecha de acoplamiento -->
                <div style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
                    <h4 style="margin: 0 0 10px 0; color: #1565c0;">📅 Fecha de Acoplamiento</h4>
                    <p style="margin: 0 0 10px 0; font-size: 12px; color: #555;">
                        El empleado se "acopla" al turno en marcha desde esta fecha.
                    </p>
                    <input type="date" id="shiftJoinDate" value="${new Date().toISOString().split('T')[0]}"
                           style="padding: 10px 12px; border: 1px solid #90caf9; border-radius: 4px; font-size: 14px; width: 100%; box-sizing: border-box;">
                </div>

                <!-- Botones -->
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="assignShiftBtn" class="btn btn-success" onclick="performUserShiftAssignment('${userId}', '${userName}')" style="flex: 1; padding: 12px;" disabled>
                        ✅ Asignar Turno
                    </button>
                    <button class="btn btn-secondary" onclick="closeUserShiftsModal()" style="flex: 1; padding: 12px;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Cargar datos de turnos con branch_id
    loadShiftsForUser(userId, userBranchId);
}

// Callback cuando se selecciona un turno
function onShiftSelected() {
    const selector = document.getElementById('shiftSelector');
    const phaseContainer = document.getElementById('phaseContainer');
    const phaseSelector = document.getElementById('phaseSelector');
    const shiftDetails = document.getElementById('shiftDetails');
    const assignBtn = document.getElementById('assignShiftBtn');

    if (!selector.value) {
        phaseContainer.style.display = 'none';
        shiftDetails.style.display = 'none';
        assignBtn.disabled = true;
        return;
    }

    // Buscar el turno seleccionado
    const option = selector.options[selector.selectedIndex];
    const shiftType = option.dataset.shiftType;
    const phases = option.dataset.phases ? JSON.parse(option.dataset.phases) : [];
    const startTime = option.dataset.startTime || '';
    const endTime = option.dataset.endTime || '';
    const branchName = option.dataset.branchName || 'Sin sucursal';

    // Mostrar detalles del turno
    shiftDetails.innerHTML = `
        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <span>⏰ <strong>Horario:</strong> ${startTime} - ${endTime}</span>
            <span>🏢 <strong>Sucursal:</strong> ${branchName}</span>
            <span>📊 <strong>Tipo:</strong> ${shiftType === 'rotative' ? '🔄 Rotativo' : '📋 Estándar'}</span>
        </div>
    `;
    shiftDetails.style.display = 'block';

    // Mostrar selector de fase solo para turnos rotativos
    if (shiftType === 'rotative' && phases.length > 0) {
        phaseSelector.innerHTML = '<option value="">-- Seleccionar fase --</option>' +
            phases.filter(p => p.name !== 'descanso' && p.name !== 'franco' && p.name !== 'rest')
                  .map(p => `<option value="${p.name}">${p.name.charAt(0).toUpperCase() + p.name.slice(1)} (${p.duration || '?'} días)</option>`)
                  .join('');
        phaseContainer.style.display = 'block';
        assignBtn.disabled = true; // Requiere seleccionar fase
        phaseSelector.onchange = () => {
            assignBtn.disabled = !phaseSelector.value;
        };
    } else {
        phaseContainer.style.display = 'none';
        assignBtn.disabled = false;
    }
}

// Función para cargar turnos disponibles y actuales del usuario
async function loadShiftsForUser(userId, branchId = null) {
    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        // 1. Obtener datos del usuario (incluyendo asignación de turno actual desde user_shift_assignments)
        const userResponse = await fetch(window.progressiveAdmin.getApiUrl(`/api/v1/users/${userId}`), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let userBranchId = branchId;
        let currentAssignment = null;

        if (userResponse.ok) {
            const userData = await userResponse.json();
            const user = userData.user || userData;

            // Obtener branch_id del usuario si no se proporcionó
            if (!userBranchId && user.branch_id) {
                userBranchId = user.branch_id;
            }

            // Mostrar turno actual (de user_shift_assignments si existe)
            currentAssignment = user.shiftAssignment || (user.shifts && user.shifts[0]);
            renderCurrentUserShiftInfo(currentAssignment);
        } else {
            console.error('Error al obtener usuario:', userResponse.status);
            document.getElementById('currentUserShiftInfo').innerHTML = '❌ Error cargando datos del usuario';
        }

        // 2. Cargar turnos disponibles (filtrados por empresa, opcionalmente por sucursal)
        let shiftsUrl = '/api/v1/shifts?isActive=true';
        if (userBranchId) {
            shiftsUrl += `&branchId=${userBranchId}`;
        }

        const shiftsResponse = await fetch(window.progressiveAdmin.getApiUrl(shiftsUrl), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (shiftsResponse.ok) {
            const shiftsData = await shiftsResponse.json();
            const allShifts = shiftsData.shifts || shiftsData || [];
            renderShiftDropdown(allShifts, currentAssignment);
        } else {
            console.error('Error al obtener shifts:', shiftsResponse.status);
            document.getElementById('shiftSelector').innerHTML = '<option value="">❌ Error cargando turnos</option>';
        }

    } catch (error) {
        console.error('Error cargando turnos:', error);
        document.getElementById('shiftSelector').innerHTML = `<option value="">❌ Error: ${error.message}</option>`;
    }
}

// Renderizar información del turno actual
function renderCurrentUserShiftInfo(assignment) {
    const container = document.getElementById('currentUserShiftInfo');
    if (!container) return;

    if (!assignment) {
        container.innerHTML = '<span style="color: #666;">⚠️ Sin turno asignado actualmente</span>';
        return;
    }

    const shiftName = assignment.name || assignment.shift?.name || 'Turno sin nombre';
    const phase = assignment.assigned_phase || assignment.phase || '';
    const joinDate = assignment.join_date || '';

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">🕐</span>
            <div>
                <strong>${shiftName}</strong>
                ${phase ? `<span style="margin-left: 8px; background: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${phase}</span>` : ''}
                ${joinDate ? `<br><small style="color: #666;">Acoplado desde: ${joinDate}</small>` : ''}
            </div>
        </div>
    `;
}

// Renderizar dropdown de turnos disponibles
function renderShiftDropdown(shifts, currentAssignment) {
    const selector = document.getElementById('shiftSelector');
    if (!selector) return;

    if (shifts.length === 0) {
        selector.innerHTML = '<option value="">⚠️ No hay turnos disponibles para esta sucursal</option>';
        return;
    }

    const currentShiftId = currentAssignment?.shift_id || currentAssignment?.id || '';

    selector.innerHTML = '<option value="">-- Seleccionar turno --</option>' +
        shifts.map(shift => {
            const branchName = shift.Branch?.name || 'Sin sucursal';
            const isRotative = shift.shiftType === 'rotative';
            const phasesJson = shift.phases ? JSON.stringify(shift.phases) : '[]';

            return `
                <option value="${shift.id}"
                        data-shift-type="${shift.shiftType || 'standard'}"
                        data-phases='${phasesJson}'
                        data-start-time="${shift.startTime || shift.start_time || ''}"
                        data-end-time="${shift.endTime || shift.end_time || ''}"
                        data-branch-name="${branchName}"
                        ${shift.id === currentShiftId ? 'selected' : ''}>
                    ${shift.name} ${isRotative ? '🔄' : ''} (${shift.startTime || shift.start_time} - ${shift.endTime || shift.end_time})
                </option>
            `;
        }).join('');

    // Si hay turno actual seleccionado, disparar evento change
    if (currentShiftId && selector.value) {
        onShiftSelected();
    }
}

// Renderizar turnos disponibles para selección
function renderAvailableShiftsForUser(shifts, currentUserShifts = []) {
    const container = document.getElementById('availableShiftsForUser');
    if (!container) return;

    if (shifts.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">No hay turnos disponibles</p>';
        return;
    }

    // Crear array de IDs de turnos asignados (pueden ser string o number)
    const assignedShiftIds = currentUserShifts.map(s => String(s.id));

    container.innerHTML = shifts.map(shift => {
        const isAssigned = assignedShiftIds.includes(String(shift.id));
        return `
        <div style="border: 1px solid ${isAssigned ? '#28a745' : '#e9ecef'}; border-radius: 6px; padding: 10px; margin-bottom: 8px; background: ${isAssigned ? '#d4edda' : 'white'};">
            <label style="display: flex; align-items: center; cursor: pointer; margin: 0;">
                <input type="checkbox" value="${shift.id}" class="shift-checkbox" style="margin-right: 10px;" ${isAssigned ? 'checked' : ''}>
                <div style="flex: 1;">
                    <strong>${shift.name}</strong>
                    ${isAssigned ? '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px;">✓ ASIGNADO</span>' : ''}
                    <br>
                    <small style="color: #666;">${shift.start_time} - ${shift.end_time}</small>
                    ${shift.description ? `<br><small style="color: #888;">${shift.description}</small>` : ''}
                </div>
            </label>
        </div>
        `;
    }).join('');
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

// Realizar asignación de turno seleccionado (dropdown único)
async function performUserShiftAssignment(userId, userName) {
    const shiftSelector = document.getElementById('shiftSelector');
    const phaseSelector = document.getElementById('phaseSelector');
    const joinDateInput = document.getElementById('shiftJoinDate');

    if (!shiftSelector || !shiftSelector.value) {
        alert('⚠️ Debe seleccionar un turno para asignar');
        return;
    }

    const shiftId = shiftSelector.value;
    const shiftName = shiftSelector.options[shiftSelector.selectedIndex].text;
    const assignedPhase = phaseSelector ? phaseSelector.value : null;
    const joinDate = joinDateInput ? joinDateInput.value : new Date().toISOString().split('T')[0];

    // Validar fase para turnos rotativos
    const shiftType = shiftSelector.options[shiftSelector.selectedIndex].dataset.shiftType;
    if (shiftType === 'rotative' && !assignedPhase) {
        alert('⚠️ Debe seleccionar una fase para el turno rotativo');
        return;
    }

    let confirmMsg = `¿Desea asignar el turno "${shiftName}" a ${userName}?\n`;
    confirmMsg += `\n📅 Fecha de acoplamiento: ${joinDate}`;
    if (assignedPhase) {
        confirmMsg += `\n🔄 Fase asignada: ${assignedPhase}`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    try {
        const response = await fetch('/api/v1/shifts/bulk-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                userIds: [userId],
                shiftIds: [shiftId],
                joinDate: joinDate,
                assignedPhase: assignedPhase || 'default'
            })
        });

        if (response.ok) {
            const result = await response.json();
            showUserMessage(`✅ Turno asignado exitosamente a ${userName}. Acoplamiento: ${result.joinDate}`, 'success');
            closeUserShiftsModal();

            // Reabrir el modal Ver Usuario para mostrar los cambios
            setTimeout(() => {
                viewUser(userId);
            }, 300);
        } else {
            const error = await response.json();
            showUserMessage(`❌ Error: ${error.message || error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error asignando turno:', error);
        showUserMessage('❌ Error al asignar turno', 'error');
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
    // Restaurar scroll del body
    document.body.style.overflow = 'auto';
}

// Iniciar captura biométrica del empleado
async function startBiometricCapture(userId, employeeId) {
    console.log('📸 [BIOMETRIC] Iniciando captura biométrica para:', { userId, employeeId });

    try {
        // Verificar que el módulo biometric-simple esté cargado
        if (!window.BiometricSimple || !window.BiometricSimple.startProfessionalFaceCapture) {
            throw new Error('Módulo BiometricSimple no disponible');
        }

        // Iniciar la captura profesional con feedback en tiempo real
        await window.BiometricSimple.startProfessionalFaceCapture({
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
        console.error('❌ [BIOMETRIC] Error al iniciar captura:', error);
        showUserMessage('❌ Error al iniciar captura biométrica. Verifique que el módulo esté disponible.', 'error');
    }
}

// Exponer función globalmente para onclick del botón
window.startBiometricCapture = startBiometricCapture;

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

        // Si es el tab de calendario, cargar el calendario
        if (tabName === 'calendar' && !window.userCalendarLoaded) {
            console.log('📅 [CALENDAR] Cargando calendario personal del usuario...');
            loadUserCalendar();
            window.userCalendarLoaded = true;
        }

        // Si es el tab médico, cargar datos médicos avanzados
        if (tabName === 'medical') {
            console.log('🏥 [MEDICAL] Cargando datos médicos avanzados...');
            const userId = window.currentViewUserId;
            if (userId && typeof loadMedicalAdvancedData === 'function') {
                loadMedicalAdvancedData(userId);
            } else if (!userId) {
                console.warn('⚠️ [MEDICAL] No hay userId disponible');
            } else {
                console.warn('⚠️ [MEDICAL] Función loadMedicalAdvancedData no disponible');
            }
        }

        // Si es el tab laboral, cargar datos salariales avanzados e historial de liquidaciones
        if (tabName === 'work') {
            console.log('💼 [SALARY] Cargando datos salariales avanzados...');
            const userId = window.currentViewUserId;
            if (userId && typeof loadSalaryAdvancedData === 'function') {
                loadSalaryAdvancedData(userId);
            } else {
                // Fallback visible: mostrar mensaje en la sección de salario
                const salaryAmount = document.getElementById('salary-base-amount');
                if (salaryAmount && salaryAmount.textContent === '$--') {
                    salaryAmount.innerHTML = '<span style="color: #999; font-size: 14px;">Sin configuración</span>';
                }
                console.warn('⚠️ [SALARY] No se pudo cargar configuración salarial');
            }
            // Cargar historial de liquidaciones dinámico
            if (userId && typeof loadUserPayrollHistory === 'function') {
                console.log('📊 [PAYROLL] Cargando historial de liquidaciones...');
                loadUserPayrollHistory(userId);
            } else {
                // Fallback: mostrar mensaje en lista de historial
                const historyList = document.getElementById('payroll-history-list');
                if (historyList) {
                    historyList.innerHTML = '<p style="text-align: center; color: #999; font-style: italic;">Historial no disponible</p>';
                }
            }
            // Cargar juicios y mediaciones desde SSOT (sección está en tab work)
            if (typeof loadLegalIssuesFromSSOT === 'function') {
                console.log('⚖️ [LEGAL-ISSUES] Cargando juicios/mediaciones...');
                loadLegalIssuesFromSSOT(userId);
            }
        }

        // Si es el tab familiar, cargar documentos familiares
        if (tabName === 'family') {
            console.log('👨‍👩‍👧‍👦 [FAMILY] Cargando documentos familiares...');
            const userId = window.currentViewUserId;
            if (userId && typeof loadFamilyDocuments === 'function') {
                loadFamilyDocuments(userId);
            } else {
                console.warn('⚠️ [FAMILY] No se pudo cargar documentos familiares');
            }
        }

        // Si es el tab de asistencias, cargar historial de ausencias médicas
        if (tabName === 'attendance') {
            console.log('📅 [ATTENDANCE] Cargando historial de ausencias...');
            const userId = window.currentViewUserId;
            if (userId && typeof loadAttendanceHistory === 'function') {
                loadAttendanceHistory(userId);
            } else {
                console.warn('⚠️ [ATTENDANCE] No se pudo cargar historial de asistencias');
            }
        }

        // Si es el tab de notificaciones, cargar notificaciones del empleado
        if (tabName === 'notifications') {
            console.log('🔔 [NOTIFICATIONS] Cargando notificaciones del empleado...');
            const userId = window.currentViewUserId;
            if (userId && typeof loadEmployeeNotifications === 'function') {
                loadEmployeeNotifications(userId);
            } else {
                console.warn('⚠️ [NOTIFICATIONS] No se pudo cargar notificaciones');
                const container = document.getElementById('employee-notifications-container');
                if (container) {
                    container.innerHTML = '<p style="text-align: center; color: #999; font-style: italic;">Notificaciones no disponibles</p>';
                }
            }
        }

        // Si es el tab disciplinario, cargar datos desde SSOT (legal_communications + user_legal_issues)
        if (tabName === 'disciplinary') {
            console.log('⚖️ [DISCIPLINARY] Cargando datos legales desde SSOT...');
            const userId = window.currentViewUserId;
            if (userId) {
                // Cargar historial disciplinario desde SSOT (legal_communications)
                if (typeof loadDisciplinaryFromSSOT === 'function') {
                    loadDisciplinaryFromSSOT(userId);
                } else {
                    console.warn('⚠️ [DISCIPLINARY] Función loadDisciplinaryFromSSOT no disponible');
                }
                // Cargar juicios y mediaciones desde SSOT (user_legal_issues)
                if (typeof loadLegalIssuesFromSSOT === 'function') {
                    loadLegalIssuesFromSSOT(userId);
                } else {
                    console.warn('⚠️ [LEGAL-ISSUES] Función loadLegalIssuesFromSSOT no disponible');
                }
            }
        }
    } else {
        console.error(`❌ [TABS] No se encontró el tab con ID: ${tabName}-tab`);
    }
};

// Cargar calendario personal del usuario
async function loadUserCalendar() {
    console.log('📅 [USER-CALENDAR] Iniciando carga del calendario...');

    try {
        // Obtener userId del modal actual
        const modal = document.getElementById('employeeFileModal');
        if (!modal) {
            console.error('❌ [USER-CALENDAR] Modal no encontrado');
            return;
        }

        // Extraer userId del header del modal
        const headerText = modal.querySelector('h2').textContent;
        console.log('📋 [USER-CALENDAR] Header:', headerText);

        // El userId está guardado en window.currentViewUserId (se setea en viewUser)
        const userId = window.currentViewUserId;
        if (!userId) {
            console.error('❌ [USER-CALENDAR] No se pudo obtener userId');
            return;
        }

        console.log('👤 [USER-CALENDAR] userId:', userId);

        // Cargar el script del calendario si no está cargado
        if (!window.UserCalendarTab) {
            console.log('📦 [USER-CALENDAR] Cargando script user-calendar-tab.js...');
            await loadScript('/js/modules/user-calendar-tab.js');
            console.log('✅ [USER-CALENDAR] Script cargado');
        }

        // Inicializar y renderizar el calendario
        const container = document.getElementById('user-calendar-container');
        if (!container) {
            console.error('❌ [USER-CALENDAR] Container no encontrado');
            return;
        }

        console.log('🎨 [USER-CALENDAR] Renderizando calendario...');

        // Crear instancia del calendario
        const calendar = new UserCalendarTab();
        const html = calendar.render(userId);

        // Insertar HTML
        container.innerHTML = html;

        // Cargar datos
        setTimeout(async () => {
            await calendar.loadCalendarData();
        }, 100);

        console.log('✅ [USER-CALENDAR] Calendario cargado exitosamente');
    } catch (error) {
        console.error('❌ [USER-CALENDAR] Error cargando calendario:', error);
        const container = document.getElementById('user-calendar-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #d32f2f;">
                    <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
                    <p><strong>Error al cargar el calendario</strong></p>
                    <p style="font-size: 14px; color: #666;">${error.message}</p>
                </div>
            `;
        }
    }
}

// Helper para cargar scripts dinámicamente
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Verificar si ya está cargado
        if (document.querySelector(`script[src="${src}"]`)) {
            console.log(`📦 Script ${src} ya estaba cargado`);
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`✅ Script ${src} cargado`);
            resolve();
        };
        script.onerror = () => {
            console.error(`❌ Error cargando script ${src}`);
            reject(new Error(`No se pudo cargar ${src}`));
        };
        document.head.appendChild(script);
    });
}

// =================== FUNCIONES SSOT - DATOS LEGALES ===================

/**
 * Cargar historial disciplinario desde SSOT (legal_communications)
 * Fuente única de verdad: tabla legal_communications con tipo disciplinario
 */
async function loadDisciplinaryFromSSOT(userId) {
    console.log('⚖️ [DISCIPLINARY-SSOT] Cargando historial disciplinario para:', userId);

    const container = document.getElementById('disciplinary-history');
    if (!container) {
        console.warn('⚠️ [DISCIPLINARY-SSOT] Container disciplinary-history no encontrado');
        return;
    }

    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '<p style="color: #999; text-align: center; font-style: italic;">No autenticado</p>';
            return;
        }

        // Llamar al endpoint SSOT de comunicaciones legales (disciplinarias)
        const response = await fetch(`/api/v1/legal/communications?employee_id=${userId}&category=disciplinary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            // Si el endpoint no existe, intentar fallback
            console.warn('⚠️ [DISCIPLINARY-SSOT] Endpoint SSOT no disponible, usando fallback');
            const fallbackResponse = await fetch(`/api/v1/user-admin/${userId}/disciplinary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json();
                renderDisciplinaryHistory(container, fallbackData.data || []);
                return;
            }
            throw new Error('Error al cargar historial disciplinario');
        }

        const data = await response.json();
        const communications = data.data || data.communications || [];

        // Filtrar solo las comunicaciones disciplinarias
        const disciplinaryRecords = communications.filter(c =>
            c.communication_type === 'warning' ||
            c.communication_type === 'reprimand' ||
            c.communication_type === 'suspension' ||
            c.category === 'disciplinary'
        );

        renderDisciplinaryHistory(container, disciplinaryRecords);

        // Actualizar estadísticas si existen los elementos
        updateDisciplinaryStats(disciplinaryRecords);

    } catch (error) {
        console.error('❌ [DISCIPLINARY-SSOT] Error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 15px; color: #dc3545;">
                <p>Error al cargar historial disciplinario</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

/**
 * Renderizar historial disciplinario
 */
function renderDisciplinaryHistory(container, records) {
    if (!records || records.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">No hay acciones disciplinarias registradas</p>';
        return;
    }

    const TYPE_CONFIG = {
        warning: { icon: '⚠️', label: 'Amonestación', color: '#ffc107' },
        reprimand: { icon: '📝', label: 'Apercibimiento', color: '#fd7e14' },
        suspension: { icon: '🚫', label: 'Suspensión', color: '#dc3545' }
    };

    let html = '<div style="max-height: 300px; overflow-y: auto;">';

    records.forEach(record => {
        const type = record.communication_type || record.action_type || 'warning';
        const config = TYPE_CONFIG[type] || TYPE_CONFIG.warning;
        const date = record.sent_at || record.date_occurred || record.created_at;
        const formattedDate = date ? new Date(date).toLocaleDateString('es-ES') : 'Sin fecha';

        html += `
            <div style="background: #fff; border-left: 4px solid ${config.color}; padding: 12px; margin-bottom: 10px; border-radius: 0 6px 6px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-weight: bold; color: ${config.color};">
                        ${config.icon} ${config.label}
                    </span>
                    <span style="font-size: 12px; color: #666;">${formattedDate}</span>
                </div>
                <div style="font-size: 13px; color: #333;">
                    <strong>Motivo:</strong> ${record.subject || record.action_taken || record.reason || 'No especificado'}
                </div>
                ${record.body || record.description ? `
                    <div style="font-size: 12px; color: #666; margin-top: 5px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                        ${record.body || record.description}
                    </div>
                ` : ''}
                ${record.suspension_days || record.days ? `
                    <div style="font-size: 12px; color: #dc3545; margin-top: 5px;">
                        <strong>Días de suspensión:</strong> ${record.suspension_days || record.days}
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Actualizar estadísticas disciplinarias
 */
function updateDisciplinaryStats(records) {
    const warnings = records.filter(r => r.communication_type === 'warning' || r.action_type === 'warning').length;
    const reprimands = records.filter(r => r.communication_type === 'reprimand' || r.action_type === 'reprimand').length;
    const suspensions = records.filter(r => r.communication_type === 'suspension' || r.action_type === 'suspension').length;
    const totalDays = records.reduce((sum, r) => sum + (parseInt(r.suspension_days || r.days || 0)), 0);

    // Actualizar elementos si existen (están en la sección de estadísticas del tab)
    const statsContainer = document.querySelector('#disciplinary-tab .disciplinary-stats');
    if (statsContainer) {
        const statDivs = statsContainer.querySelectorAll('div > strong');
        if (statDivs[0]) statDivs[0].textContent = warnings;
        if (statDivs[1]) statDivs[1].textContent = reprimands;
        if (statDivs[2]) statDivs[2].textContent = suspensions;
        if (statDivs[3]) statDivs[3].textContent = totalDays;
    }
}

/**
 * Cargar juicios y mediaciones desde SSOT (user_legal_issues)
 * Fuente única de verdad: tabla user_legal_issues
 */
async function loadLegalIssuesFromSSOT(userId) {
    console.log('⚖️ [LEGAL-ISSUES-SSOT] Cargando juicios/mediaciones para:', userId);

    const container = document.getElementById('legal-issues-list');
    if (!container) {
        console.warn('⚠️ [LEGAL-ISSUES-SSOT] Container legal-issues-list no encontrado');
        return;
    }

    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '<p style="color: #999; text-align: center; font-style: italic; font-size: 12px;">No autenticado</p>';
            return;
        }

        // Llamar al endpoint SSOT de juicios laborales
        const response = await fetch(`/api/v1/legal/issues?user_id=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.warn('⚠️ [LEGAL-ISSUES-SSOT] Endpoint no disponible');
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic; font-size: 12px;">Sin antecedentes judiciales</p>';
            return;
        }

        const data = await response.json();
        const issues = data.data || data.issues || [];

        renderLegalIssues(container, issues);

    } catch (error) {
        console.error('❌ [LEGAL-ISSUES-SSOT] Error:', error);
        container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic; font-size: 12px;">Sin antecedentes judiciales</p>';
    }
}

/**
 * Renderizar lista de juicios y mediaciones
 */
function renderLegalIssues(container, issues) {
    if (!issues || issues.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic; font-size: 12px;">Sin antecedentes judiciales</p>';
        return;
    }

    const TYPE_CONFIG = {
        lawsuit: { icon: '⚖️', label: 'Juicio', color: '#dc3545' },
        mediation: { icon: '🤝', label: 'Mediación', color: '#17a2b8' },
        arbitration: { icon: '👨‍⚖️', label: 'Arbitraje', color: '#6f42c1' },
        complaint: { icon: '📋', label: 'Denuncia', color: '#fd7e14' }
    };

    const STATUS_CONFIG = {
        active: { label: 'Activo', color: '#dc3545', bg: '#f8d7da' },
        resolved: { label: 'Resuelto', color: '#28a745', bg: '#d4edda' },
        dismissed: { label: 'Desestimado', color: '#6c757d', bg: '#e2e3e5' }
    };

    let html = '<div style="max-height: 200px; overflow-y: auto;">';

    issues.forEach(issue => {
        const type = issue.issue_type || 'lawsuit';
        const typeConfig = TYPE_CONFIG[type] || TYPE_CONFIG.lawsuit;
        const status = issue.status || 'active';
        const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active;
        const startDate = issue.start_date ? new Date(issue.start_date).toLocaleDateString('es-ES') : 'Sin fecha';

        html += `
            <div style="background: #fff; border-left: 3px solid ${typeConfig.color}; padding: 10px; margin-bottom: 8px; border-radius: 0 4px 4px 0; font-size: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold;">${typeConfig.icon} ${typeConfig.label}</span>
                    <span style="background: ${statusConfig.bg}; color: ${statusConfig.color}; padding: 2px 8px; border-radius: 10px; font-size: 10px;">
                        ${statusConfig.label}
                    </span>
                </div>
                <div style="color: #666; font-size: 11px;">
                    <div><strong>Demandante:</strong> ${issue.plaintiff || 'No especificado'}</div>
                    <div><strong>Inicio:</strong> ${startDate}</div>
                    ${issue.description ? `<div style="margin-top: 4px;">${issue.description.substring(0, 100)}${issue.description.length > 100 ? '...' : ''}</div>` : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Exponer funciones SSOT globalmente
window.loadDisciplinaryFromSSOT = loadDisciplinaryFromSSOT;
window.loadLegalIssuesFromSSOT = loadLegalIssuesFromSSOT;

// Cargar notificaciones del empleado (para ficha de usuario)
async function loadEmployeeNotifications(userId) {
    console.log('🔔 [NOTIFICATIONS] Cargando notificaciones para empleado:', userId);

    const container = document.getElementById('employee-notifications-container');
    if (!container) return;

    try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '<p style="color: #999; text-align: center;">No autenticado</p>';
            return;
        }

        // Llamar al endpoint de notificaciones del empleado
        const response = await fetch(`/api/inbox/employee/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Error al cargar notificaciones');
        }

        const data = await response.json();
        const notifications = data.notifications || [];

        // Actualizar estadísticas
        const total = notifications.length;
        const unread = notifications.filter(n => parseInt(n.unread_count) > 0).length;
        const pending = notifications.filter(n => n.status === 'pending').length;
        const resolved = notifications.filter(n => n.status === 'closed').length;

        document.getElementById('notif-stat-total').textContent = total;
        document.getElementById('notif-stat-unread').textContent = unread;
        document.getElementById('notif-stat-pending').textContent = pending;
        document.getElementById('notif-stat-resolved').textContent = resolved;

        // Renderizar lista de notificaciones
        if (notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-bell-slash" style="font-size: 48px; opacity: 0.5;"></i>
                    <p style="margin-top: 15px;">No hay notificaciones para este empleado</p>
                </div>
            `;
            return;
        }

        const GROUP_TYPE_CONFIG = {
            proactive_vacation_expiry: { icon: '🏖️', label: 'Vacaciones por Vencer', color: '#3498db' },
            proactive_overtime_limit: { icon: '⏰', label: 'Límite Horas Extra', color: '#e74c3c' },
            proactive_rest_violation: { icon: '😴', label: 'Violación Descanso', color: '#9b59b6' },
            proactive_document_expiry: { icon: '📄', label: 'Documentos por Vencer', color: '#f39c12' },
            proactive_certificate_expiry: { icon: '🏥', label: 'Certificados Médicos', color: '#1abc9c' },
            proactive_consent_renewal: { icon: '🔐', label: 'Renovar Consentimiento', color: '#34495e' },
            vacation_request: { icon: '🌴', label: 'Solicitud Vacaciones', color: '#27ae60' },
            leave_request: { icon: '📝', label: 'Solicitud Licencia', color: '#2980b9' },
            overtime_request: { icon: '💼', label: 'Solicitud Horas Extra', color: '#8e44ad' },
            late_arrival: { icon: '🕐', label: 'Llegada Tarde', color: '#e67e22' },
            shift_swap: { icon: '🔄', label: 'Cambio de Turno', color: '#16a085' },
            training_mandatory: { icon: '📚', label: 'Capacitación', color: '#2c3e50' },
            system_alert: { icon: '⚠️', label: 'Alerta Sistema', color: '#c0392b' },
            announcement: { icon: '📢', label: 'Anuncio', color: '#16a085' },
            default: { icon: '🔔', label: 'Notificación', color: '#95a5a6' }
        };

        const PRIORITY_COLORS = {
            critical: '#c0392b',
            high: '#e67e22',
            medium: '#f1c40f',
            normal: '#27ae60',
            low: '#95a5a6'
        };

        container.innerHTML = notifications.map(notif => {
            const config = GROUP_TYPE_CONFIG[notif.group_type] || GROUP_TYPE_CONFIG.default;
            const priorityColor = PRIORITY_COLORS[notif.priority] || PRIORITY_COLORS.normal;
            const isUnread = parseInt(notif.unread_count) > 0;
            const date = new Date(notif.last_message_at || notif.created_at);
            const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

            return `
                <div style="padding: 15px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;
                            ${isUnread ? 'background: #fff8e1; border-left: 3px solid #ff9800;' : ''}"
                     onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='${isUnread ? '#fff8e1' : 'white'}'">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: ${config.color}20;
                                    display: flex; align-items: center; justify-content: center; font-size: 18px;">
                            ${config.icon}
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <strong style="color: #333;">${notif.subject || 'Sin asunto'}</strong>
                                <span style="font-size: 11px; color: #999;">${dateStr}</span>
                            </div>
                            <p style="margin: 5px 0; font-size: 13px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${notif.last_message || 'Sin mensajes'}
                            </p>
                            <div style="display: flex; gap: 8px; margin-top: 8px;">
                                <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${config.color}20; color: ${config.color};">
                                    ${config.label}
                                </span>
                                <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${priorityColor}20; color: ${priorityColor};">
                                    ${notif.priority}
                                </span>
                                ${isUnread ? `<span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #f44336; color: white;">${notif.unread_count} nuevos</span>` : ''}
                                <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #eee; color: #666;">
                                    💬 ${notif.message_count || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ [NOTIFICATIONS] Error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px;"></i>
                <p style="margin-top: 15px;">Error al cargar notificaciones</p>
                <p style="font-size: 12px; color: #666;">${error.message}</p>
                <button onclick="loadEmployeeNotifications('${userId}')" class="btn btn-outline-primary btn-sm" style="margin-top: 10px;">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

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
            font-weight: normal;
            transition: all 0.2s;
        }

        .file-tab:hover {
            background: #e9ecef;
        }

        .file-tab.active {
            background: white;
            border-bottom: 1px solid white;
            transform: translateY(1px);
            font-weight: normal;
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

async function loadAttendanceHistory(userId) {
    console.log('📊 [ATTENDANCE] Cargando historial de asistencias:', userId);

    const container = document.getElementById('attendance-history');
    if (!container) return;

    container.innerHTML = '<p style="text-align: center; color: #666;"><i class="fas fa-spinner fa-spin"></i> Cargando historial...</p>';

    try {
        const response = await fetch(`/api/medical-cases/employee/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar historial de ausencias');
        }

        const data = await response.json();
        const cases = data.cases || [];

        if (cases.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">No hay ausencias registradas</p>';
            return;
        }

        // Generate table
        let html = `
            <table class="table table-hover" style="font-size: 13px;">
                <thead style="background: #f8f9fa;">
                    <tr>
                        <th style="width: 15%;">Fecha Inicio</th>
                        <th style="width: 15%;">Tipo de Ausencia</th>
                        <th style="width: 10%;">Días</th>
                        <th style="width: 20%;">Estado</th>
                        <th style="width: 20%;">Médico Asignado</th>
                        <th style="width: 10%;">Mensajes</th>
                        <th style="width: 10%;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cases.forEach(c => {
            const statusBadge = getAbsenceCaseStatusBadge(c.case_status);
            const typeBadge = getAbsenceTypeBadge(c.absence_type);
            const doctorName = c.doctor_name || 'Sin asignar';
            const unreadCount = c.unread_messages || 0;
            const messagesBadge = unreadCount > 0
                ? `<span class="badge badge-danger">${unreadCount} nuevos</span>`
                : `<span class="badge badge-secondary">${c.total_messages || 0}</span>`;

            html += `
                <tr>
                    <td>${formatDateShort(c.start_date)}</td>
                    <td>${typeBadge}</td>
                    <td>${c.requested_days} días</td>
                    <td>${statusBadge}</td>
                    <td style="font-size: 12px;">${doctorName}</td>
                    <td>${messagesBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="viewAbsenceCase('${c.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        console.error('❌ [ATTENDANCE] Error:', error);
        container.innerHTML = `<p style="text-align: center; color: #dc3545;">❌ Error al cargar historial: ${error.message}</p>`;
    }
}

// Helper functions for badges
function getAbsenceCaseStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge badge-warning">⏳ Pendiente</span>',
        'under_review': '<span class="badge badge-info">🔍 En Revisión</span>',
        'awaiting_docs': '<span class="badge badge-warning">📄 Esperando Docs</span>',
        'needs_follow_up': '<span class="badge badge-primary">🩺 Seguimiento</span>',
        'justified': '<span class="badge badge-success">✅ Justificada</span>',
        'not_justified': '<span class="badge badge-danger">❌ No Justificada</span>',
        'closed': '<span class="badge badge-secondary">🔒 Cerrada</span>'
    };
    return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
}

function getAbsenceTypeBadge(type) {
    const types = {
        'medical_illness': '<span class="badge badge-info">🩺 Enfermedad Común</span>',
        'work_accident': '<span class="badge badge-danger">🚑 Accidente Laboral</span>',
        'non_work_accident': '<span class="badge badge-warning">🤕 Accidente No Laboral</span>',
        'occupational_disease': '<span class="badge badge-danger">⚠️ Enfermedad Profesional</span>',
        'maternity': '<span class="badge badge-primary">🤱 Maternidad</span>',
        'family_care': '<span class="badge badge-info">👨‍👩‍👧 Cuidado Familiar</span>',
        'authorized_leave': '<span class="badge badge-success">✅ Licencia Autorizada</span>',
        'unauthorized': '<span class="badge badge-secondary">❌ Injustificada</span>'
    };
    return types[type] || `<span class="badge badge-secondary">${type}</span>`;
}

function formatDateShort(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function addPermissionRequest(userId) {
    console.log('📅 [PERMISSIONS] Agregando solicitud de ausencia:', userId);

    const modal = document.createElement('div');
    modal.id = 'permissionRequestModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 700px; max-height: 90vh; overflow-y: auto;">
            <h4>🩺 Registrar Ausencia Médica</h4>
            <form id="permissionRequestForm" enctype="multipart/form-data">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label><strong>Tipo de Ausencia:</strong></label>
                        <select id="absenceType" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="medical_illness">🩺 Enfermedad Común</option>
                            <option value="work_accident">🚑 Accidente Laboral</option>
                            <option value="non_work_accident">🤕 Accidente No Laboral</option>
                            <option value="occupational_disease">⚠️ Enfermedad Profesional</option>
                            <option value="maternity">🤱 Maternidad</option>
                            <option value="family_care">👨‍👩‍👧 Cuidado Familiar</option>
                            <option value="authorized_leave">✅ Licencia Autorizada</option>
                            <option value="unauthorized">❌ Ausencia Injustificada</option>
                        </select>
                    </div>
                    <div style="margin: 10px 0;">
                        <label><strong>Días Solicitados:</strong></label>
                        <input type="number" id="requestedDays" class="form-control" min="1" required>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="margin: 10px 0;">
                        <label><strong>Fecha Inicio:</strong></label>
                        <input type="date" id="startDate" class="form-control" required>
                    </div>
                    <div style="margin: 10px 0;">
                        <label><strong>Fecha Fin (opcional):</strong></label>
                        <input type="date" id="endDate" class="form-control">
                    </div>
                </div>
                <div style="margin: 10px 0;">
                    <label><strong>Descripción del Empleado:</strong></label>
                    <textarea id="employeeDescription" class="form-control" rows="4" placeholder="Describa los síntomas, motivo de la ausencia, etc." required></textarea>
                </div>
                <div style="margin: 10px 0;">
                    <label><strong>Adjuntar Documentos (opcional):</strong></label>
                    <input type="file" id="attachments" class="form-control" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
                    <small style="color: #666; font-size: 11px;">Certificados médicos, fotos, etc. (máx. 5 archivos, 10MB cada uno)</small>
                </div>
                <div style="text-align: right; margin-top: 15px;">
                    <button type="button" onclick="closeModal('permissionRequestModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">📤 Registrar Ausencia</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Auto-calculate days
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    const daysInput = document.getElementById('requestedDays');

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
            const formData = new FormData();
            formData.append('employee_id', userId);
            formData.append('absence_type', document.getElementById('absenceType').value);
            formData.append('start_date', document.getElementById('startDate').value);

            const endDate = document.getElementById('endDate').value;
            if (endDate) {
                formData.append('end_date', endDate);
            }

            formData.append('requested_days', parseInt(document.getElementById('requestedDays').value));
            formData.append('employee_description', document.getElementById('employeeDescription').value);

            // Add attachments
            const attachmentsInput = document.getElementById('attachments');
            if (attachmentsInput.files.length > 0) {
                for (let i = 0; i < attachmentsInput.files.length; i++) {
                    formData.append('attachments', attachmentsInput.files[i]);
                }
            }

            const response = await fetch('/api/medical-cases', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al registrar ausencia');
            }

            const result = await response.json();
            closeModal('permissionRequestModal');
            showUserMessage('✅ Ausencia registrada exitosamente. Se notificó al médico asignado.', 'success');

            // Reload attendance history
            loadAttendanceHistory(userId);
        } catch (error) {
            console.error('❌ [MEDICAL-CASES] Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

// View absence case details
async function viewAbsenceCase(caseId) {
    console.log('👁️ [MEDICAL-CASES] Viewing case:', caseId);

    const modal = document.createElement('div');
    modal.id = 'absenceCaseModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 900px; max-height: 90vh; overflow-y: auto;">
            <h4>🩺 Detalles del Expediente Médico</h4>
            <div id="caseDetailsContent" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #666;"></i>
                <p style="margin-top: 15px; color: #666;">Cargando detalles...</p>
            </div>
            <div style="text-align: right; margin-top: 15px;">
                <button type="button" onclick="closeModal('absenceCaseModal')" class="btn btn-secondary">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    try {
        const response = await fetch(`/api/medical-cases/${caseId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar detalles del expediente');
        }

        const data = await response.json();
        const caseData = data.case;
        const messages = data.messages || [];

        let html = `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 13px;">
                    <div>
                        <strong>Tipo:</strong><br>
                        ${getAbsenceTypeBadge(caseData.absence_type)}
                    </div>
                    <div>
                        <strong>Estado:</strong><br>
                        ${getAbsenceCaseStatusBadge(caseData.case_status)}
                    </div>
                    <div>
                        <strong>Fecha Inicio:</strong><br>
                        ${formatDateShort(caseData.start_date)}
                    </div>
                    <div>
                        <strong>Días Solicitados:</strong><br>
                        ${caseData.requested_days} días
                    </div>
                    <div>
                        <strong>Días Aprobados:</strong><br>
                        ${caseData.approved_days || 'Pendiente'}
                    </div>
                    <div>
                        <strong>Médico Asignado:</strong><br>
                        ${caseData.doctor_name || 'Sin asignar'}
                    </div>
                </div>
            </div>

            ${caseData.employee_description ? `
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h5 style="margin-top: 0;">📝 Descripción del Empleado:</h5>
                    <p style="margin: 0; white-space: pre-wrap;">${caseData.employee_description}</p>
                </div>
            ` : ''}

            ${caseData.final_diagnosis ? `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h5 style="margin-top: 0;">🩺 Diagnóstico Médico:</h5>
                    <p style="margin: 0; white-space: pre-wrap;">${caseData.final_diagnosis}</p>
                    ${caseData.is_justified !== null ? `
                        <div style="margin-top: 10px;">
                            <strong>Justificación:</strong>
                            <span class="badge ${caseData.is_justified ? 'badge-success' : 'badge-danger'}">
                                ${caseData.is_justified ? '✅ Justificada' : '❌ No Justificada'}
                            </span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <div style="background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px;">
                <h5 style="margin-top: 0;">💬 Comunicaciones (${messages.length})</h5>
                <div style="max-height: 400px; overflow-y: auto;">
        `;

        if (messages.length === 0) {
            html += '<p style="text-align: center; color: #666; font-style: italic; padding: 20px;">No hay mensajes aún</p>';
        } else {
            messages.forEach(msg => {
                const isDoctor = msg.sender_type === 'doctor';
                const isSystem = msg.sender_type === 'system';
                const bgColor = isSystem ? '#f5f5f5' : (isDoctor ? '#e3f2fd' : '#fff3cd');
                const icon = isSystem ? '🤖' : (isDoctor ? '👨‍⚕️' : '👤');
                const sender = msg.sender_name || msg.sender_type;

                html += `
                    <div style="background: ${bgColor}; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid ${isDoctor ? '#2196f3' : (isSystem ? '#999' : '#ffc107')};">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <strong>${icon} ${sender}</strong>
                            <span style="font-size: 11px; color: #666;">${formatDateShort(msg.created_at)}</span>
                        </div>
                        <p style="margin: 0; white-space: pre-wrap; font-size: 13px;">${msg.message}</p>
                        ${msg.attachments && msg.attachments.length > 0 ? `
                            <div style="margin-top: 8px; font-size: 12px;">
                                <strong>📎 Adjuntos:</strong>
                                ${msg.attachments.map(att => `
                                    <a href="${att.url}" target="_blank" style="display: inline-block; margin-right: 10px;">
                                        ${att.filename}
                                    </a>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        document.getElementById('caseDetailsContent').innerHTML = html;

    } catch (error) {
        console.error('❌ [MEDICAL-CASES] Error:', error);
        document.getElementById('caseDetailsContent').innerHTML = `
            <p style="text-align: center; color: #dc3545;">❌ Error al cargar detalles: ${error.message}</p>
        `;
    }
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

    document.getElementById('legalIssueForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
                user_id: userId,
                issue_type: document.getElementById('legalType').value || 'lawsuit',
                status: document.getElementById('legalStatus').value || 'active',
                plaintiff: document.getElementById('plaintiff').value || null,
                start_date: document.getElementById('startDate').value || null,
                resolution_date: document.getElementById('resolutionDate').value || null,
                description: document.getElementById('description').value || null,
                resolution: document.getElementById('resolution').value || null
            };

            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('token');

            // Usar endpoint SSOT para guardar en user_legal_issues
            const response = await fetch('/api/v1/legal/issues', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al registrar antecedente judicial');
            }

            closeModal('legalIssueModal');
            showUserMessage('✅ Antecedente judicial registrado exitosamente', 'success');

            // Recargar lista de juicios desde SSOT
            if (typeof loadLegalIssuesFromSSOT === 'function') {
                loadLegalIssuesFromSSOT(userId);
            }
        } catch (error) {
            console.error('❌ [LEGAL-ISSUE] Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
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

// ═══════════════════════════════════════════════════════════════════
// EDITAR DATOS BÁSICOS DEL USUARIO
// ═══════════════════════════════════════════════════════════════════
async function editBasicData(userId) {
    console.log('📝 [BASIC DATA] Editando datos básicos:', userId);

    // Eliminar modal anterior si existe
    const existingModal = document.getElementById('basicDataModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Obtener datos actuales del usuario
    let userData = {};
    try {
        const response = await fetch(`/api/v1/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            const data = await response.json();
            userData = data.user || data;
        }
    } catch (e) {
        console.error('Error obteniendo datos:', e);
    }

    const modal = document.createElement('div');
    modal.id = 'basicDataModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
                <h4 style="margin: 0; color: #1e40af;">📝 Editar Datos Básicos</h4>
                <button onclick="closeModal('basicDataModal')" style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: #666;">×</button>
            </div>
            <form id="basicDataForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 5px;">Nombre:</label>
                        <input type="text" id="edit-firstName" class="form-control" value="${userData.firstName || ''}" required style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; width: 100%;">
                    </div>
                    <div>
                        <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 5px;">Apellido:</label>
                        <input type="text" id="edit-lastName" class="form-control" value="${userData.lastName || ''}" required style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; width: 100%;">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 5px;">Email:</label>
                        <input type="email" id="edit-email" class="form-control" value="${userData.email || ''}" required style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; width: 100%;">
                    </div>
                    <div>
                        <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 5px;">Teléfono:</label>
                        <input type="text" id="edit-phone" class="form-control" value="${userData.phone || ''}" placeholder="+54 11 9999-9999" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; width: 100%;">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div>
                        <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 5px;">Fecha de Nacimiento:</label>
                        <input type="date" id="edit-birthDate" class="form-control" value="${userData.birthDate ? userData.birthDate.split('T')[0] : ''}" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; width: 100%;">
                    </div>
                    <div>
                        <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 5px;">Fecha de Ingreso:</label>
                        <input type="date" id="edit-hireDate" class="form-control" value="${userData.hireDate ? userData.hireDate.split('T')[0] : ''}" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; width: 100%;">
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="font-weight: 600; color: #374151; display: block; margin-bottom: 5px;">Dirección:</label>
                    <input type="text" id="edit-address" class="form-control" value="${userData.address || ''}" placeholder="Calle, número, ciudad, provincia" style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; width: 100%;">
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <button type="button" onclick="closeModal('basicDataModal')" class="btn btn-secondary" style="padding: 10px 20px; border-radius: 6px;">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="padding: 10px 25px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; color: white; border-radius: 6px; cursor: pointer;">💾 Guardar Cambios</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('basicDataForm').onsubmit = async (e) => {
        e.preventDefault();

        const updateData = {
            firstName: document.getElementById('edit-firstName').value,
            lastName: document.getElementById('edit-lastName').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value || null,
            birthDate: document.getElementById('edit-birthDate').value || null,
            hireDate: document.getElementById('edit-hireDate').value || null,
            address: document.getElementById('edit-address').value || null
        };

        try {
            const response = await fetch(`/api/v1/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error al actualizar datos');
            }

            closeModal('basicDataModal');
            showUserMessage('✅ Datos básicos actualizados correctamente', 'success');

            // Recargar el modal de usuario para reflejar cambios
            setTimeout(() => {
                viewUser(userId);
            }, 500);

        } catch (error) {
            console.error('Error guardando datos básicos:', error);
            showUserMessage('❌ Error al guardar: ' + error.message, 'danger');
        }
    };
}
window.editBasicData = editBasicData;

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

// ============================================================================
// FUNCIONES DE DOCUMENTOS FAMILIARES - Certificados, dependencias de conceptos
// ============================================================================

// Variable global para almacenar las dependencias disponibles
let availableDependencies = [];

/**
 * Cargar tipos de dependencias disponibles de la empresa
 */
async function loadAvailableDependencies() {
    try {
        const response = await fetch('/api/v1/concept-dependencies/company', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            const data = await response.json();
            availableDependencies = data.success ? data.data : [];
        }
    } catch (error) {
        console.error('[FAMILY-DOCS] Error loading dependencies:', error);
        availableDependencies = [];
    }
}

/**
 * Agregar un documento/certificado familiar
 */
async function addFamilyDocument(userId) {
    console.log('[FAMILY-DOCS] Agregando documento para usuario:', userId);

    // Cargar dependencias disponibles si no están cargadas
    if (availableDependencies.length === 0) {
        await loadAvailableDependencies();
    }

    const modal = document.createElement('div');
    modal.id = 'familyDocumentModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    const dependencyOptions = availableDependencies.map(dep =>
        `<option value="${dep.id}">${dep.dependency_name} (${dep.dependency_code})</option>`
    ).join('');

    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 8px; width: 650px; max-height: 90vh; overflow-y: auto;">
            <h4 style="color: #e65100; margin-bottom: 20px;">📄 Cargar Documento / Certificado Familiar</h4>
            <form id="familyDocumentForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold;">Tipo de Documento *</label>
                        <select id="docDependencyId" class="form-control" required>
                            <option value="">Seleccionar tipo...</option>
                            ${dependencyOptions}
                        </select>
                        <small style="color: #666;">Define qué tipo de certificado/documento es</small>
                    </div>
                    <div>
                        <label style="font-weight: bold;">Miembro Familiar</label>
                        <select id="docFamilyMemberType" class="form-control">
                            <option value="">Empleado directo</option>
                            <option value="CHILD">Hijo/a</option>
                            <option value="SPOUSE">Cónyuge</option>
                            <option value="PARENT">Padre/Madre</option>
                            <option value="SIBLING">Hermano/a</option>
                            <option value="OTHER">Otro familiar</option>
                        </select>
                    </div>
                </div>

                <div id="familyMemberNameSection" style="display: none; margin-bottom: 15px;">
                    <label style="font-weight: bold;">Nombre del Familiar</label>
                    <input type="text" id="docFamilyMemberName" class="form-control" placeholder="Nombre completo del familiar">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold;">Fecha de Emisión *</label>
                        <input type="date" id="docIssueDate" class="form-control" required>
                    </div>
                    <div>
                        <label style="font-weight: bold;">Fecha de Vencimiento</label>
                        <input type="date" id="docExpirationDate" class="form-control">
                        <small style="color: #666;">Dejar vacío si no vence</small>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">Número de Documento/Referencia</label>
                    <input type="text" id="docDocumentNumber" class="form-control" placeholder="Ej: CERT-2024-00123">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">Entidad Emisora</label>
                    <input type="text" id="docIssuer" class="form-control" placeholder="Ej: Ministerio de Educación, Colegio San Martín">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">Archivo del Documento</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="file" id="docFile" class="form-control" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style="flex: 1;">
                        <button type="button" id="uploadDocBtn" class="btn btn-info btn-sm" style="white-space: nowrap;">
                            <i class="fa fa-upload"></i> Subir
                        </button>
                    </div>
                    <div id="uploadStatus" style="margin-top: 5px; font-size: 11px;"></div>
                    <input type="hidden" id="docFileUrl" value="">
                    <small style="color: #666;">Formatos: PDF, JPG, PNG, DOC (max 5MB)</small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">Notas Adicionales</label>
                    <textarea id="docNotes" class="form-control" rows="2" placeholder="Observaciones sobre el documento..."></textarea>
                </div>

                <div style="text-align: right; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <button type="button" onclick="closeModal('familyDocumentModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-warning" style="background: #ff9800; border: none;">Guardar Documento</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Mostrar/ocultar nombre de familiar según selección
    document.getElementById('docFamilyMemberType').onchange = function() {
        const nameSection = document.getElementById('familyMemberNameSection');
        nameSection.style.display = this.value ? 'block' : 'none';
    };

    // Handler para upload de archivo
    document.getElementById('uploadDocBtn').onclick = async function() {
        const fileInput = document.getElementById('docFile');
        const statusDiv = document.getElementById('uploadStatus');
        const fileUrlInput = document.getElementById('docFileUrl');

        if (!fileInput.files || fileInput.files.length === 0) {
            statusDiv.innerHTML = '<span style="color: #dc3545;">Selecciona un archivo primero</span>';
            return;
        }

        const file = fileInput.files[0];

        // Validar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            statusDiv.innerHTML = '<span style="color: #dc3545;">El archivo excede 5MB</span>';
            return;
        }

        // Mostrar estado de carga
        this.disabled = true;
        statusDiv.innerHTML = '<span style="color: #17a2b8;"><i class="fa fa-spinner fa-spin"></i> Subiendo archivo...</span>';

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/v1/upload/single', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Error al subir archivo');
            }

            // Guardar URL del archivo
            fileUrlInput.value = result.file.url;
            statusDiv.innerHTML = `<span style="color: #28a745;"><i class="fa fa-check"></i> Archivo subido: ${result.file.filename}</span>`;
            console.log('[FAMILY-DOCS] Archivo subido:', result.file.url);

        } catch (error) {
            console.error('[FAMILY-DOCS] Error upload:', error);
            statusDiv.innerHTML = `<span style="color: #dc3545;"><i class="fa fa-times"></i> ${error.message}</span>`;
        } finally {
            this.disabled = false;
        }
    };

    // Form submit handler
    document.getElementById('familyDocumentForm').onsubmit = async (e) => {
        e.preventDefault();

        try {
            const formData = {
                dependency_id: parseInt(document.getElementById('docDependencyId').value),
                family_member_type: document.getElementById('docFamilyMemberType').value || null,
                family_member_name: document.getElementById('docFamilyMemberName').value || null,
                issue_date: document.getElementById('docIssueDate').value,
                expiration_date: document.getElementById('docExpirationDate').value || null,
                document_number: document.getElementById('docDocumentNumber').value || null,
                issuer: document.getElementById('docIssuer').value || null,
                file_url: document.getElementById('docFileUrl').value || null,
                notes: document.getElementById('docNotes').value || null
            };

            const response = await fetch(`/api/v1/concept-dependencies/documents/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al guardar documento');
            }

            closeModal('familyDocumentModal');
            showUserMessage('Documento guardado exitosamente', 'success');
            await loadFamilyDocuments(userId);

        } catch (error) {
            console.error('[FAMILY-DOCS] Error:', error);
            showUserMessage(`Error: ${error.message}`, 'error');
        }
    };
}

/**
 * Cargar documentos familiares del usuario
 */
async function loadFamilyDocuments(userId) {
    console.log('[FAMILY-DOCS] Cargando documentos para:', userId);

    const listContainer = document.getElementById('family-documents-list');
    const statsContainer = document.getElementById('family-documents-stats');

    if (!listContainer) {
        console.warn('[FAMILY-DOCS] Container no encontrado');
        return;
    }

    try {
        listContainer.innerHTML = '<p style="text-align: center; color: #666;">Cargando documentos...</p>';

        const response = await fetch(`/api/v1/concept-dependencies/documents/${userId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) {
            throw new Error('Error al cargar documentos');
        }

        const result = await response.json();
        const documents = result.success ? result.data : [];

        renderFamilyDocuments(documents, userId);

    } catch (error) {
        console.error('[FAMILY-DOCS] Error cargando:', error);
        listContainer.innerHTML = '<p style="text-align: center; color: #dc3545;">Error al cargar documentos</p>';
    }
}

/**
 * Renderizar documentos familiares en la UI
 */
function renderFamilyDocuments(documents, userId) {
    const listContainer = document.getElementById('family-documents-list');
    const statsContainer = document.getElementById('family-documents-stats');

    if (!documents || documents.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #666; font-style: italic; font-size: 12px;">No hay documentos cargados</p>';
        if (statsContainer) statsContainer.style.display = 'none';
        return;
    }

    // Calcular estadísticas
    const stats = {
        valid: documents.filter(d => d.status === 'VALID').length,
        expiring: documents.filter(d => d.status === 'EXPIRING_SOON').length,
        expired: documents.filter(d => d.status === 'EXPIRED').length,
        total: documents.length
    };

    // Actualizar stats
    if (statsContainer) {
        statsContainer.style.display = 'block';
        document.getElementById('docs-valid-count').textContent = stats.valid;
        document.getElementById('docs-expiring-count').textContent = stats.expiring;
        document.getElementById('docs-expired-count').textContent = stats.expired;
        document.getElementById('docs-total-count').textContent = stats.total;
    }

    // Renderizar lista de documentos
    const getStatusBadge = (status) => {
        const badges = {
            'VALID': '<span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Vigente</span>',
            'EXPIRING_SOON': '<span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Por Vencer</span>',
            'EXPIRED': '<span style="background: #f44336; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Vencido</span>',
            'PENDING_REVIEW': '<span style="background: #2196f3; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">En Revisión</span>'
        };
        return badges[status] || badges['PENDING_REVIEW'];
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-AR');
    };

    listContainer.innerHTML = documents.map(doc => `
        <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; margin-bottom: 10px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 4px;">
                        ${doc.dependency?.dependency_name || 'Documento'} ${getStatusBadge(doc.status)}
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        ${doc.family_member_type ? `<strong>Familiar:</strong> ${doc.family_member_name || doc.family_member_type} | ` : ''}
                        <strong>Emisión:</strong> ${formatDate(doc.issue_date)}
                        ${doc.expiration_date ? ` | <strong>Vence:</strong> ${formatDate(doc.expiration_date)}` : ' | <em>Sin vencimiento</em>'}
                    </div>
                    ${doc.document_number ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">Ref: ${doc.document_number}</div>` : ''}
                    ${doc.issuer ? `<div style="font-size: 11px; color: #888;">Emisor: ${doc.issuer}</div>` : ''}
                </div>
                <div style="display: flex; gap: 5px;">
                    ${doc.file_url ? `<a href="${doc.file_url}" target="_blank" class="btn btn-sm btn-outline-primary" title="Ver documento">📄</a>` : ''}
                    <button onclick="editFamilyDocument(${doc.id}, '${userId}')" class="btn btn-sm btn-outline-secondary" title="Editar">✏️</button>
                    <button onclick="deleteFamilyDocument(${doc.id}, '${userId}')" class="btn btn-sm btn-outline-danger" title="Eliminar">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Eliminar documento familiar
 */
async function deleteFamilyDocument(documentId, userId) {
    if (!confirm('¿Está seguro de eliminar este documento?')) return;

    try {
        const response = await fetch(`/api/v1/concept-dependencies/documents/${documentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Error al eliminar');
        }

        showUserMessage('Documento eliminado', 'success');
        await loadFamilyDocuments(userId);

    } catch (error) {
        console.error('[FAMILY-DOCS] Error eliminando:', error);
        showUserMessage(`Error: ${error.message}`, 'error');
    }
}

/**
 * Editar documento familiar
 */
async function editFamilyDocument(documentId, userId) {
    console.log('[FAMILY-DOCS] Editando documento:', documentId);

    // Cargar dependencias si no están cargadas
    if (availableDependencies.length === 0) {
        await loadAvailableDependencies();
    }

    // Obtener datos actuales del documento
    try {
        const response = await fetch(`/api/v1/concept-dependencies/documents/${userId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Error al cargar documento');

        const result = await response.json();
        const doc = result.data?.find(d => d.id === documentId);

        if (!doc) throw new Error('Documento no encontrado');

        const modal = document.createElement('div');
        modal.id = 'editFamilyDocumentModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; justify-content: center;
            align-items: center; z-index: 10001;
        `;

        const dependencyOptions = availableDependencies.map(dep =>
            `<option value="${dep.id}" ${dep.id === doc.dependency_id ? 'selected' : ''}>${dep.dependency_name}</option>`
        ).join('');

        modal.innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; width: 650px; max-height: 90vh; overflow-y: auto;">
                <h4 style="color: #e65100; margin-bottom: 20px;">📄 Editar Documento</h4>
                <form id="editFamilyDocumentForm">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="font-weight: bold;">Tipo de Documento *</label>
                            <select id="editDocDependencyId" class="form-control" required>
                                ${dependencyOptions}
                            </select>
                        </div>
                        <div>
                            <label style="font-weight: bold;">Miembro Familiar</label>
                            <select id="editDocFamilyMemberType" class="form-control">
                                <option value="" ${!doc.family_member_type ? 'selected' : ''}>Empleado directo</option>
                                <option value="CHILD" ${doc.family_member_type === 'CHILD' ? 'selected' : ''}>Hijo/a</option>
                                <option value="SPOUSE" ${doc.family_member_type === 'SPOUSE' ? 'selected' : ''}>Cónyuge</option>
                                <option value="PARENT" ${doc.family_member_type === 'PARENT' ? 'selected' : ''}>Padre/Madre</option>
                                <option value="SIBLING" ${doc.family_member_type === 'SIBLING' ? 'selected' : ''}>Hermano/a</option>
                                <option value="OTHER" ${doc.family_member_type === 'OTHER' ? 'selected' : ''}>Otro familiar</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px; ${doc.family_member_type ? '' : 'display: none;'}" id="editFamilyMemberNameSection">
                        <label style="font-weight: bold;">Nombre del Familiar</label>
                        <input type="text" id="editDocFamilyMemberName" class="form-control" value="${doc.family_member_name || ''}">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <label style="font-weight: bold;">Fecha de Emisión *</label>
                            <input type="date" id="editDocIssueDate" class="form-control" value="${doc.issue_date?.split('T')[0] || ''}" required>
                        </div>
                        <div>
                            <label style="font-weight: bold;">Fecha de Vencimiento</label>
                            <input type="date" id="editDocExpirationDate" class="form-control" value="${doc.expiration_date?.split('T')[0] || ''}">
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold;">Número de Documento/Referencia</label>
                        <input type="text" id="editDocDocumentNumber" class="form-control" value="${doc.document_number || ''}">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold;">Entidad Emisora</label>
                        <input type="text" id="editDocIssuer" class="form-control" value="${doc.issuer || ''}">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold;">URL del Archivo</label>
                        <input type="url" id="editDocFileUrl" class="form-control" value="${doc.file_url || ''}">
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold;">Notas</label>
                        <textarea id="editDocNotes" class="form-control" rows="2">${doc.notes || ''}</textarea>
                    </div>

                    <div style="text-align: right; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                        <button type="button" onclick="closeModal('editFamilyDocumentModal')" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-warning" style="background: #ff9800; border: none;">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('editDocFamilyMemberType').onchange = function() {
            document.getElementById('editFamilyMemberNameSection').style.display = this.value ? 'block' : 'none';
        };

        document.getElementById('editFamilyDocumentForm').onsubmit = async (e) => {
            e.preventDefault();

            try {
                const formData = {
                    dependency_id: parseInt(document.getElementById('editDocDependencyId').value),
                    family_member_type: document.getElementById('editDocFamilyMemberType').value || null,
                    family_member_name: document.getElementById('editDocFamilyMemberName').value || null,
                    issue_date: document.getElementById('editDocIssueDate').value,
                    expiration_date: document.getElementById('editDocExpirationDate').value || null,
                    document_number: document.getElementById('editDocDocumentNumber').value || null,
                    issuer: document.getElementById('editDocIssuer').value || null,
                    file_url: document.getElementById('editDocFileUrl').value || null,
                    notes: document.getElementById('editDocNotes').value || null
                };

                const updateResponse = await fetch(`/api/v1/concept-dependencies/documents/${documentId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(formData)
                });

                if (!updateResponse.ok) {
                    const result = await updateResponse.json();
                    throw new Error(result.error || 'Error al actualizar');
                }

                closeModal('editFamilyDocumentModal');
                showUserMessage('Documento actualizado', 'success');
                await loadFamilyDocuments(userId);

            } catch (error) {
                console.error('[FAMILY-DOCS] Error actualizando:', error);
                showUserMessage(`Error: ${error.message}`, 'error');
            }
        };

    } catch (error) {
        console.error('[FAMILY-DOCS] Error:', error);
        showUserMessage(`Error: ${error.message}`, 'error');
    }
}

// ============================================================================
// FUNCIONES MÉDICAS AVANZADAS - Antropométricos, Cirugías, Psiquiatría, Deportes
// ============================================================================

function editAnthropometricData(userId) {
    console.log('📊 [MEDICAL-ADV] Editando datos antropométricos:', userId);

    const modal = document.createElement('div');
    modal.id = 'anthropometricModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; width: 550px; max-height: 90vh; overflow-y: auto;">
            <h4 style="color: #1565c0; margin-bottom: 20px;">📊 Datos Antropométricos</h4>
            <form id="anthropometricForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold; color: #333;">Peso (kg) *</label>
                        <input type="number" id="anthroWeight" class="form-control" step="0.1" min="20" max="300" placeholder="Ej: 75.5" required>
                    </div>
                    <div>
                        <label style="font-weight: bold; color: #333;">Altura (cm) *</label>
                        <input type="number" id="anthroHeight" class="form-control" step="0.1" min="100" max="250" placeholder="Ej: 175" required>
                    </div>
                </div>

                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="text-align: center;">
                        <span style="font-size: 12px; color: #666;">IMC Calculado</span>
                        <div style="font-size: 32px; font-weight: bold; color: #1565c0;" id="calculatedBMI">--</div>
                        <div id="bmiClassification" style="padding: 5px 15px; border-radius: 20px; display: inline-block; margin-top: 5px;">--</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 12px; color: #666;">Circunf. Cintura (cm)</label>
                        <input type="number" id="anthroWaist" class="form-control" step="0.1" min="40" max="200" placeholder="Opcional">
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Circunf. Cadera (cm)</label>
                        <input type="number" id="anthroHip" class="form-control" step="0.1" min="50" max="200" placeholder="Opcional">
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Circunf. Cuello (cm)</label>
                        <input type="number" id="anthroNeck" class="form-control" step="0.1" min="20" max="80" placeholder="Opcional">
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; color: #666;">Fecha de Medición</label>
                    <input type="date" id="anthroDate" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; color: #666;">Observaciones</label>
                    <textarea id="anthroNotes" class="form-control" rows="2" placeholder="Notas adicionales..."></textarea>
                </div>

                <div style="text-align: right; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <button type="button" onclick="closeModal('anthropometricModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">💾 Guardar Medición</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Calcular IMC automáticamente
    const calcBMI = () => {
        const weight = parseFloat(document.getElementById('anthroWeight').value);
        const height = parseFloat(document.getElementById('anthroHeight').value);
        if (weight && height) {
            const heightM = height / 100;
            const bmi = (weight / (heightM * heightM)).toFixed(1);
            document.getElementById('calculatedBMI').textContent = bmi;

            let classification, bgColor, textColor;
            if (bmi < 18.5) { classification = 'Bajo peso'; bgColor = '#fff3cd'; textColor = '#856404'; }
            else if (bmi < 25) { classification = 'Normal'; bgColor = '#d4edda'; textColor = '#155724'; }
            else if (bmi < 30) { classification = 'Sobrepeso'; bgColor = '#fff3cd'; textColor = '#856404'; }
            else { classification = 'Obesidad'; bgColor = '#f8d7da'; textColor = '#721c24'; }

            const classEl = document.getElementById('bmiClassification');
            classEl.textContent = classification;
            classEl.style.background = bgColor;
            classEl.style.color = textColor;
        }
    };
    document.getElementById('anthroWeight').addEventListener('input', calcBMI);
    document.getElementById('anthroHeight').addEventListener('input', calcBMI);

    document.getElementById('anthropometricForm').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = {
                weight_kg: parseFloat(document.getElementById('anthroWeight').value),
                height_cm: parseFloat(document.getElementById('anthroHeight').value),
                waist_cm: document.getElementById('anthroWaist').value ? parseFloat(document.getElementById('anthroWaist').value) : null,
                hip_cm: document.getElementById('anthroHip').value ? parseFloat(document.getElementById('anthroHip').value) : null,
                neck_cm: document.getElementById('anthroNeck').value ? parseFloat(document.getElementById('anthroNeck').value) : null,
                measurement_date: document.getElementById('anthroDate').value || new Date().toISOString().split('T')[0],
                notes: document.getElementById('anthroNotes').value || null
            };

            const response = await fetch(`/api/medical-advanced/anthropometric/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error al guardar');

            closeModal('anthropometricModal');
            showUserMessage('✅ Datos antropométricos guardados', 'success');
            loadMedicalAdvancedData(userId);
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function addSurgery(userId) {
    console.log('🔪 [MEDICAL-ADV] Agregando cirugía:', userId);

    const modal = document.createElement('div');
    modal.id = 'surgeryModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; width: 600px; max-height: 90vh; overflow-y: auto;">
            <h4 style="color: #c2185b; margin-bottom: 20px;">🔪 Registrar Cirugía</h4>
            <form id="surgeryForm">
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #333;">Tipo de Cirugía *</label>
                    <select id="surgeryType" class="form-control" required>
                        <option value="">Seleccionar...</option>
                        <option value="appendectomy">Apendicectomía</option>
                        <option value="cholecystectomy">Colecistectomía (vesícula)</option>
                        <option value="hernia">Hernia (inguinal/umbilical)</option>
                        <option value="cesarean">Cesárea</option>
                        <option value="knee">Rodilla (menisco/ligamentos)</option>
                        <option value="shoulder">Hombro (manguito rotador)</option>
                        <option value="spine">Columna vertebral</option>
                        <option value="cardiac">Cirugía cardíaca</option>
                        <option value="bariatric">Bariátrica (bypass/manga)</option>
                        <option value="cosmetic">Estética</option>
                        <option value="dental">Dental/maxilofacial</option>
                        <option value="eye">Ocular (cataratas/láser)</option>
                        <option value="other">Otra</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #333;">Nombre/Descripción de la Cirugía *</label>
                    <input type="text" id="surgeryName" class="form-control" placeholder="Ej: Artroscopia de rodilla derecha" required>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 12px; color: #666;">Fecha de la Cirugía *</label>
                        <input type="date" id="surgeryDate" class="form-control" required>
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Hospital/Clínica</label>
                        <input type="text" id="surgeryHospital" class="form-control" placeholder="Nombre del centro médico">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 12px; color: #666;">Cirujano</label>
                        <input type="text" id="surgerySurgeon" class="form-control" placeholder="Dr./Dra.">
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Resultado</label>
                        <select id="surgeryOutcome" class="form-control">
                            <option value="successful">✅ Exitosa</option>
                            <option value="partial">⚠️ Parcialmente exitosa</option>
                            <option value="complications">❌ Con complicaciones</option>
                            <option value="pending">⏳ En recuperación</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; color: #666;">Complicaciones/Secuelas</label>
                    <textarea id="surgeryComplications" class="form-control" rows="2" placeholder="Describir si hubo complicaciones o secuelas..."></textarea>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; color: #666;">Observaciones</label>
                    <textarea id="surgeryNotes" class="form-control" rows="2" placeholder="Información adicional..."></textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="surgeryHasImplant"> Tiene implante/prótesis
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="surgeryWorkRestriction"> Genera restricción laboral
                    </label>
                </div>

                <div style="text-align: right; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <button type="button" onclick="closeModal('surgeryModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-danger">🔪 Registrar Cirugía</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('surgeryForm').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = {
                surgery_type: document.getElementById('surgeryType').value,
                surgery_name: document.getElementById('surgeryName').value,
                surgery_date: document.getElementById('surgeryDate').value,
                hospital_name: document.getElementById('surgeryHospital').value || null,
                surgeon_name: document.getElementById('surgerySurgeon').value || null,
                outcome: document.getElementById('surgeryOutcome').value,
                complications: document.getElementById('surgeryComplications').value || null,
                notes: document.getElementById('surgeryNotes').value || null,
                has_implant: document.getElementById('surgeryHasImplant').checked,
                causes_work_restriction: document.getElementById('surgeryWorkRestriction').checked
            };

            const response = await fetch(`/api/medical-advanced/surgeries/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error al guardar');

            closeModal('surgeryModal');
            showUserMessage('✅ Cirugía registrada correctamente', 'success');
            loadMedicalAdvancedData(userId);
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function addPsychiatricTreatment(userId) {
    console.log('🧠 [MEDICAL-ADV] Agregando tratamiento psiquiátrico:', userId);

    const modal = document.createElement('div');
    modal.id = 'psychiatricModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; width: 650px; max-height: 90vh; overflow-y: auto;">
            <h4 style="color: #7b1fa2; margin-bottom: 20px;">🧠 Tratamiento Psiquiátrico/Psicológico</h4>
            <form id="psychiatricForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold; color: #333;">Tipo de Tratamiento *</label>
                        <select id="treatmentType" class="form-control" required>
                            <option value="">Seleccionar...</option>
                            <option value="psychiatry">Psiquiatría</option>
                            <option value="psychology">Psicología/Terapia</option>
                            <option value="both">Ambos (psiquiatría + psicología)</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight: bold; color: #333;">Estado *</label>
                        <select id="treatmentStatus" class="form-control" required>
                            <option value="active">🟢 Activo (en curso)</option>
                            <option value="completed">✅ Completado</option>
                            <option value="abandoned">❌ Abandonado</option>
                            <option value="paused">⏸️ Pausado</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #333;">Diagnóstico/Condición *</label>
                    <select id="psychiatricCondition" class="form-control" required>
                        <option value="">Seleccionar...</option>
                        <option value="depression">Depresión</option>
                        <option value="anxiety">Ansiedad generalizada</option>
                        <option value="panic">Trastorno de pánico</option>
                        <option value="bipolar">Trastorno bipolar</option>
                        <option value="ocd">TOC (Trastorno obsesivo compulsivo)</option>
                        <option value="ptsd">TEPT (Estrés post-traumático)</option>
                        <option value="adhd">TDAH</option>
                        <option value="eating">Trastorno alimentario</option>
                        <option value="addiction">Adicciones</option>
                        <option value="burnout">Burnout laboral</option>
                        <option value="grief">Duelo</option>
                        <option value="other">Otro</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 12px; color: #666;">Fecha de Inicio *</label>
                        <input type="date" id="treatmentStartDate" class="form-control" required>
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Fecha de Fin (si terminó)</label>
                        <input type="date" id="treatmentEndDate" class="form-control">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 12px; color: #666;">Profesional Tratante</label>
                        <input type="text" id="therapistName" class="form-control" placeholder="Lic./Dr.">
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Frecuencia de Sesiones</label>
                        <select id="sessionFrequency" class="form-control">
                            <option value="">No especificada</option>
                            <option value="weekly">Semanal</option>
                            <option value="biweekly">Quincenal</option>
                            <option value="monthly">Mensual</option>
                            <option value="asneeded">Según necesidad</option>
                        </select>
                    </div>
                </div>

                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #e65100;">💊 Medicación Psiquiátrica</label>
                    <div style="margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <input type="checkbox" id="hasMedication" onchange="document.getElementById('medicationDetails').style.display = this.checked ? 'block' : 'none'">
                            Actualmente toma medicación
                        </label>
                        <div id="medicationDetails" style="display: none;">
                            <textarea id="medicationList" class="form-control" rows="2" placeholder="Listar medicamentos, dosis y frecuencia..."></textarea>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; color: #666;">Observaciones (confidencial)</label>
                    <textarea id="treatmentNotes" class="form-control" rows="2" placeholder="Información adicional relevante..."></textarea>
                </div>

                <div style="background: #fce4ec; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 8px; color: #c2185b;">
                        <input type="checkbox" id="affectsWork"> ⚠️ Afecta capacidad laboral
                    </label>
                </div>

                <div style="text-align: right; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <button type="button" onclick="closeModal('psychiatricModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-purple" style="background: #7b1fa2; color: white;">🧠 Guardar Tratamiento</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('psychiatricForm').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = {
                treatment_type: document.getElementById('treatmentType').value,
                condition: document.getElementById('psychiatricCondition').value,
                status: document.getElementById('treatmentStatus').value,
                start_date: document.getElementById('treatmentStartDate').value,
                end_date: document.getElementById('treatmentEndDate').value || null,
                therapist_name: document.getElementById('therapistName').value || null,
                session_frequency: document.getElementById('sessionFrequency').value || null,
                has_medication: document.getElementById('hasMedication').checked,
                medication_details: document.getElementById('medicationList')?.value || null,
                notes: document.getElementById('treatmentNotes').value || null,
                affects_work_capacity: document.getElementById('affectsWork').checked
            };

            const response = await fetch(`/api/medical-advanced/psychiatric/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error al guardar');

            closeModal('psychiatricModal');
            showUserMessage('✅ Tratamiento psiquiátrico registrado', 'success');
            loadMedicalAdvancedData(userId);
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function addSportsActivity(userId) {
    console.log('⚽ [MEDICAL-ADV] Agregando actividad deportiva:', userId);

    const modal = document.createElement('div');
    modal.id = 'sportsModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; width: 600px; max-height: 90vh; overflow-y: auto;">
            <h4 style="color: #2e7d32; margin-bottom: 20px;">⚽ Actividad Deportiva</h4>
            <form id="sportsForm">
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #333;">Deporte *</label>
                    <select id="sportType" class="form-control" required>
                        <option value="">Seleccionar...</option>
                        <optgroup label="🏃 Individuales">
                            <option value="running">Running/Atletismo</option>
                            <option value="swimming">Natación</option>
                            <option value="cycling">Ciclismo</option>
                            <option value="gym">Gimnasio/Musculación</option>
                            <option value="yoga">Yoga/Pilates</option>
                            <option value="martial_arts">Artes Marciales</option>
                            <option value="tennis">Tenis</option>
                            <option value="golf">Golf</option>
                        </optgroup>
                        <optgroup label="⚽ Colectivos">
                            <option value="football">Fútbol</option>
                            <option value="basketball">Básquetbol</option>
                            <option value="volleyball">Vóleibol</option>
                            <option value="rugby">Rugby</option>
                            <option value="hockey">Hockey</option>
                            <option value="handball">Handball</option>
                        </optgroup>
                        <optgroup label="⚠️ Extremos/Riesgo">
                            <option value="mountaineering">Montañismo/Escalada</option>
                            <option value="skydiving">Paracaidismo</option>
                            <option value="paragliding">Parapente</option>
                            <option value="diving">Buceo</option>
                            <option value="motorsport">Deportes de Motor</option>
                            <option value="combat">Deportes de Combate</option>
                        </optgroup>
                        <option value="other">Otro</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold; color: #333;">Nivel *</label>
                        <select id="sportLevel" class="form-control" required>
                            <option value="recreational">🏠 Recreativo</option>
                            <option value="amateur">🎯 Amateur</option>
                            <option value="federated">🏅 Federado</option>
                            <option value="professional">🏆 Profesional</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight: bold; color: #333;">Frecuencia *</label>
                        <select id="sportFrequency" class="form-control" required>
                            <option value="occasional">Ocasional (1-2/mes)</option>
                            <option value="weekly">Semanal (1-2/semana)</option>
                            <option value="regular">Regular (3-4/semana)</option>
                            <option value="daily">Diario</option>
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-size: 12px; color: #666;">Horas por Semana</label>
                        <input type="number" id="sportHours" class="form-control" min="0" max="50" step="0.5" placeholder="Ej: 5">
                    </div>
                    <div>
                        <label style="font-size: 12px; color: #666;">Años de Práctica</label>
                        <input type="number" id="sportYears" class="form-control" min="0" max="60" placeholder="Ej: 3">
                    </div>
                </div>

                <div style="background: #fff8e1; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #f57c00;">🏆 Competencias</label>
                    <div style="margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <input type="checkbox" id="hasCompetitions" onchange="document.getElementById('competitionDetails').style.display = this.checked ? 'block' : 'none'">
                            Participa en competencias
                        </label>
                        <div id="competitionDetails" style="display: none;">
                            <input type="text" id="competitionLevel" class="form-control" placeholder="Nivel de competencias (ej: torneos locales, ligas, campeonatos)">
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; color: #666;">Club/Institución</label>
                    <input type="text" id="sportClub" class="form-control" placeholder="Nombre del club o institución donde practica">
                </div>

                <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; gap: 8px; color: #c62828;">
                        <input type="checkbox" id="isExtremeSport"> ⚠️ Deporte de alto riesgo (requiere declaración especial)
                    </label>
                </div>

                <div style="text-align: right; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <button type="button" onclick="closeModal('sportsModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">⚽ Agregar Deporte</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('sportsForm').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = {
                sport_type: document.getElementById('sportType').value,
                level: document.getElementById('sportLevel').value,
                frequency: document.getElementById('sportFrequency').value,
                hours_per_week: document.getElementById('sportHours').value ? parseFloat(document.getElementById('sportHours').value) : null,
                years_practicing: document.getElementById('sportYears').value ? parseInt(document.getElementById('sportYears').value) : null,
                participates_competitions: document.getElementById('hasCompetitions').checked,
                competition_level: document.getElementById('competitionLevel')?.value || null,
                club_name: document.getElementById('sportClub').value || null,
                is_extreme: document.getElementById('isExtremeSport').checked
            };

            const response = await fetch(`/api/medical-advanced/sports/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error al guardar');

            closeModal('sportsModal');
            showUserMessage('✅ Actividad deportiva agregada', 'success');
            loadMedicalAdvancedData(userId);
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function editHealthyHabits(userId) {
    console.log('🌿 [MEDICAL-ADV] Editando hábitos saludables:', userId);

    const modal = document.createElement('div');
    modal.id = 'habitsModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; width: 600px; max-height: 90vh; overflow-y: auto;">
            <h4 style="color: #f57c00; margin-bottom: 20px;">🌿 Hábitos de Vida</h4>
            <form id="habitsForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
                        <label style="font-weight: bold; color: #e65100;">🚬 Tabaco</label>
                        <select id="smokingStatus" class="form-control" style="margin-top: 8px;">
                            <option value="never">Nunca fumó</option>
                            <option value="former">Ex fumador</option>
                            <option value="occasional">Fumador ocasional</option>
                            <option value="regular">Fumador regular</option>
                            <option value="heavy">Fumador intenso (+20/día)</option>
                        </select>
                        <div id="smokingDetails" style="margin-top: 8px;">
                            <input type="number" id="cigarettesPerDay" class="form-control" placeholder="Cigarrillos/día" min="0" max="100">
                        </div>
                    </div>

                    <div style="background: #fff8e1; padding: 15px; border-radius: 8px;">
                        <label style="font-weight: bold; color: #f9a825;">🍺 Alcohol</label>
                        <select id="alcoholStatus" class="form-control" style="margin-top: 8px;">
                            <option value="never">No consume</option>
                            <option value="occasional">Ocasional (eventos)</option>
                            <option value="moderate">Moderado (1-2/semana)</option>
                            <option value="frequent">Frecuente (3+/semana)</option>
                            <option value="daily">Diario</option>
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px;">
                        <label style="font-weight: bold; color: #2e7d32;">😴 Sueño</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                            <div>
                                <label style="font-size: 11px; color: #666;">Horas/noche</label>
                                <input type="number" id="sleepHours" class="form-control" min="3" max="14" step="0.5" placeholder="7">
                            </div>
                            <div>
                                <label style="font-size: 11px; color: #666;">Calidad</label>
                                <select id="sleepQuality" class="form-control">
                                    <option value="good">Buena</option>
                                    <option value="regular">Regular</option>
                                    <option value="poor">Mala</option>
                                    <option value="insomnia">Insomnio</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                        <label style="font-weight: bold; color: #1565c0;">🥗 Alimentación</label>
                        <select id="dietType" class="form-control" style="margin-top: 8px;">
                            <option value="regular">Regular/Balanceada</option>
                            <option value="vegetarian">Vegetariana</option>
                            <option value="vegan">Vegana</option>
                            <option value="keto">Keto/Low carb</option>
                            <option value="mediterranean">Mediterránea</option>
                            <option value="celiac">Sin gluten (celiaquía)</option>
                            <option value="diabetic">Diabética</option>
                            <option value="poor">Desordenada/Mala</option>
                        </select>
                    </div>
                </div>

                <div style="background: #fce4ec; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #c2185b;">💊 Otras Sustancias</label>
                    <div style="margin-top: 10px;">
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
                            <input type="checkbox" id="usesCaffeine"> ☕ Consumo alto de cafeína (+4 cafés/día)
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; margin-top: 5px;">
                            <input type="checkbox" id="usesSupplements"> 💊 Usa suplementos/vitaminas
                        </label>
                    </div>
                </div>

                <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #c62828;">⚠️ Deportes Extremos Declarados</label>
                    <textarea id="extremeSportsDeclaration" class="form-control" rows="2" style="margin-top: 8px;"
                              placeholder="Listar deportes de riesgo que practica (paracaidismo, escalada, buceo, etc.)"></textarea>
                </div>

                <div style="text-align: right; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <button type="button" onclick="closeModal('habitsModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-warning">🌿 Guardar Hábitos</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('habitsForm').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = {
                smoking_status: document.getElementById('smokingStatus').value,
                cigarettes_per_day: document.getElementById('cigarettesPerDay').value ? parseInt(document.getElementById('cigarettesPerDay').value) : null,
                alcohol_consumption: document.getElementById('alcoholStatus').value,
                sleep_hours: document.getElementById('sleepHours').value ? parseFloat(document.getElementById('sleepHours').value) : null,
                sleep_quality: document.getElementById('sleepQuality').value,
                diet_type: document.getElementById('dietType').value,
                high_caffeine: document.getElementById('usesCaffeine').checked,
                uses_supplements: document.getElementById('usesSupplements').checked,
                extreme_sports_declaration: document.getElementById('extremeSportsDeclaration').value || null
            };

            const response = await fetch(`/api/medical-advanced/healthy-habits/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error al guardar');

            closeModal('habitsModal');
            showUserMessage('✅ Hábitos saludables actualizados', 'success');
            loadMedicalAdvancedData(userId);
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

// Función para cargar todos los datos médicos avanzados
async function loadMedicalAdvancedData(userId) {
    console.log('📊 [MEDICAL-ADV] Cargando datos médicos avanzados para:', userId);

    try {
        const response = await fetch(`/api/medical-advanced/complete/${userId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();

        if (!result.success) {
            console.warn('⚠️ No se pudieron cargar datos médicos avanzados');
            return;
        }

        const data = result.data;

        // Actualizar datos antropométricos
        if (data.anthropometric) {
            const a = data.anthropometric;
            document.getElementById('user-weight').textContent = a.weight_kg ? a.weight_kg.toFixed(1) : '--';
            document.getElementById('user-height').textContent = a.height_cm ? a.height_cm.toFixed(0) : '--';
            document.getElementById('user-bmi').textContent = a.bmi ? a.bmi.toFixed(1) : '--';

            const bmiEl = document.getElementById('bmi-indicator');
            if (a.bmi) {
                if (a.bmi < 18.5) { bmiEl.textContent = 'Bajo peso'; bmiEl.style.background = '#fff3cd'; bmiEl.style.color = '#856404'; }
                else if (a.bmi < 25) { bmiEl.textContent = 'Normal'; bmiEl.style.background = '#d4edda'; bmiEl.style.color = '#155724'; }
                else if (a.bmi < 30) { bmiEl.textContent = 'Sobrepeso'; bmiEl.style.background = '#fff3cd'; bmiEl.style.color = '#856404'; }
                else { bmiEl.textContent = 'Obesidad'; bmiEl.style.background = '#f8d7da'; bmiEl.style.color = '#721c24'; }
            }

            if (a.measurement_date) {
                document.getElementById('anthropometric-date').textContent = new Date(a.measurement_date).toLocaleDateString('es-AR');
            }
        }

        // Actualizar lista de cirugías
        const surgeriesList = document.getElementById('surgeries-list');
        if (data.surgeries && data.surgeries.length > 0) {
            surgeriesList.innerHTML = data.surgeries.map(s => `
                <div style="background: rgba(255,255,255,0.7); padding: 8px; border-radius: 4px; margin-bottom: 5px; font-size: 12px;">
                    <div style="font-weight: bold;">🔪 ${s.surgery_name}</div>
                    <div style="color: #666;">${new Date(s.surgery_date).toLocaleDateString('es-AR')} - ${s.outcome === 'successful' ? '✅' : s.outcome === 'complications' ? '❌' : '⚠️'}</div>
                </div>
            `).join('');
        }

        // Actualizar tratamientos psiquiátricos
        if (data.psychiatric && data.psychiatric.length > 0) {
            const active = data.psychiatric.filter(t => t.status === 'active').length;
            const past = data.psychiatric.filter(t => t.status !== 'active').length;
            document.getElementById('active-psychiatric-count').textContent = active;
            document.getElementById('past-psychiatric-count').textContent = past;

            const statusEl = document.getElementById('mental-health-status');
            if (active > 0) {
                statusEl.textContent = 'En tratamiento';
                statusEl.style.background = '#fff3cd';
                statusEl.style.color = '#856404';
            }

            const listEl = document.getElementById('psychiatric-treatments-list');
            listEl.innerHTML = data.psychiatric.slice(0, 3).map(t => `
                <div style="background: rgba(255,255,255,0.5); padding: 5px; border-radius: 4px; margin-bottom: 3px;">
                    ${t.status === 'active' ? '🟢' : '⚪'} ${t.condition} (${t.treatment_type})
                </div>
            `).join('');
        }

        // Actualizar deportes
        if (data.sports && data.sports.length > 0) {
            document.getElementById('total-sports').textContent = data.sports.length;
            const totalHours = data.sports.reduce((sum, s) => sum + (s.hours_per_week || 0), 0);
            document.getElementById('weekly-hours').textContent = totalHours.toFixed(1);

            const levels = { recreational: 1, amateur: 2, federated: 3, professional: 4 };
            const maxLevel = Math.max(...data.sports.map(s => levels[s.level] || 0));
            const levelNames = { 1: 'Rec', 2: 'Ama', 3: 'Fed', 4: 'Pro' };
            document.getElementById('competition-level').textContent = levelNames[maxLevel] || '-';

            const sportsList = document.getElementById('sports-list');
            sportsList.innerHTML = data.sports.map(s => `
                <div style="display: inline-block; background: #e8f5e9; padding: 3px 8px; border-radius: 12px; margin: 2px; font-size: 11px;">
                    ${s.sport_type}${s.is_extreme ? ' ⚠️' : ''}
                </div>
            `).join('');
        }

        // Actualizar hábitos saludables
        if (data.habits) {
            const h = data.habits;
            const smokingLabels = { never: 'No fuma', former: 'Ex fumador', occasional: 'Ocasional', regular: 'Regular', heavy: 'Intenso' };
            const alcoholLabels = { never: 'No consume', occasional: 'Ocasional', moderate: 'Moderado', frequent: 'Frecuente', daily: 'Diario' };
            const dietLabels = { regular: 'Balanceada', vegetarian: 'Vegetariana', vegan: 'Vegana', keto: 'Keto', mediterranean: 'Mediterránea', celiac: 'Sin gluten', diabetic: 'Diabética', poor: 'Desordenada' };

            document.getElementById('smoking-status').textContent = smokingLabels[h.smoking_status] || '--';
            document.getElementById('alcohol-status').textContent = alcoholLabels[h.alcohol_consumption] || '--';
            document.getElementById('sleep-hours').textContent = h.sleep_hours ? `${h.sleep_hours} hrs` : '-- hrs';
            document.getElementById('diet-type').textContent = dietLabels[h.diet_type] || '--';

            if (h.extreme_sports_declaration) {
                document.getElementById('extreme-sports').textContent = h.extreme_sports_declaration;
                document.getElementById('extreme-sports').style.color = '#d32f2f';
            }
        }

        console.log('✅ [MEDICAL-ADV] Datos médicos avanzados cargados');

    } catch (error) {
        console.error('❌ Error cargando datos médicos avanzados:', error);
    }
}

// ============================================================================
// FIN FUNCIONES MÉDICAS AVANZADAS
// ============================================================================

// ============================================================================
// FUNCIONES SALARIALES AVANZADAS - Convenios, Categorías, Liquidaciones
// ============================================================================

async function editSalaryConfig(userId) {
    console.log('💰 [SALARY] Editando configuración salarial:', userId);

    // Cargar catálogos de convenios
    let agreements = [];
    let categories = [];
    try {
        const agreementsRes = await fetch('/api/salary-advanced/labor-agreements', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const agreementsData = await agreementsRes.json();
        if (agreementsData.success) agreements = agreementsData.data;
    } catch (e) { console.warn('No se pudieron cargar convenios'); }

    const modal = document.createElement('div');
    modal.id = 'salaryConfigModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    const agreementOptions = agreements.map(a => `<option value="${a.id}">${a.code} - ${a.name}</option>`).join('');

    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; width: 650px; max-height: 90vh; overflow-y: auto;">
            <h4 style="color: #2e7d32; margin-bottom: 20px;">💰 Configuración Salarial</h4>
            <form id="salaryConfigForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold; color: #333;">Convenio Laboral *</label>
                        <select id="laborAgreement" class="form-control" onchange="loadCategories(this.value)" required>
                            <option value="">Seleccionar convenio...</option>
                            ${agreementOptions}
                            <option value="none">Sin convenio (Fuera de convenio)</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight: bold; color: #333;">Categoría Salarial *</label>
                        <select id="salaryCategory" class="form-control" required>
                            <option value="">Primero seleccione convenio...</option>
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold; color: #333;">Tipo de Salario *</label>
                        <select id="salaryType" class="form-control" required>
                            <option value="monthly">Mensual</option>
                            <option value="biweekly">Quincenal</option>
                            <option value="weekly">Semanal</option>
                            <option value="daily">Jornal (diario)</option>
                            <option value="hourly">Por hora</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight: bold; color: #333;">Modalidad de Contrato</label>
                        <select id="contractType" class="form-control">
                            <option value="permanent">Permanente</option>
                            <option value="temporary">Temporario</option>
                            <option value="seasonal">De temporada</option>
                            <option value="parttime">Part-time</option>
                        </select>
                    </div>
                </div>

                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h5 style="color: #2e7d32; margin: 0 0 12px 0;">💵 Valores Salariales</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="font-size: 12px; color: #666;">Salario Base Bruto *</label>
                            <input type="number" id="baseSalary" class="form-control" step="0.01" min="0" placeholder="$850000" required>
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #666;">Adicional por Presentismo (%)</label>
                            <input type="number" id="attendanceBonus" class="form-control" step="0.1" min="0" max="100" value="8.33" placeholder="8.33">
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #666;">Adicional por Antigüedad (%/año)</label>
                            <input type="number" id="seniorityBonus" class="form-control" step="0.1" min="0" max="10" value="1" placeholder="1">
                        </div>
                    </div>
                </div>

                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <h5 style="color: #e65100; margin: 0 0 12px 0;">⏰ Configuración Jornada</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="font-size: 12px; color: #666;">Horas Mensuales</label>
                            <input type="number" id="monthlyHours" class="form-control" min="0" max="300" value="176" placeholder="176">
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #666;">Días por Semana</label>
                            <select id="workDays" class="form-control">
                                <option value="5">5 días (Lun-Vie)</option>
                                <option value="6">6 días (Lun-Sáb)</option>
                                <option value="4">4 días</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #666;">Turno</label>
                            <select id="workShift" class="form-control">
                                <option value="day">Diurno</option>
                                <option value="night">Nocturno (+30%)</option>
                                <option value="mixed">Mixto</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; color: #666;">Fecha de Vigencia</label>
                    <input type="date" id="effectiveFrom" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>

                <div style="text-align: right; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <button type="button" onclick="closeModal('salaryConfigModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">💾 Guardar Configuración</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Cargar categorías cuando se selecciona convenio
    window.loadCategories = async function(agreementId) {
        const categorySelect = document.getElementById('salaryCategory');
        if (!agreementId || agreementId === 'none') {
            categorySelect.innerHTML = '<option value="none">Sin categoría (fuera de convenio)</option>';
            return;
        }
        try {
            const res = await fetch(`/api/salary-advanced/labor-agreements/${agreementId}/categories`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) {
                categorySelect.innerHTML = data.data.map(c =>
                    `<option value="${c.id}" data-base="${c.base_salary}">${c.category_code} - ${c.description} ($${c.base_salary?.toLocaleString() || '--'})</option>`
                ).join('');
            }
        } catch (e) { console.error('Error cargando categorías:', e); }
    };

    document.getElementById('salaryConfigForm').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = {
                user_id: userId,
                labor_agreement_id: document.getElementById('laborAgreement').value !== 'none' ? document.getElementById('laborAgreement').value : null,
                salary_category_id: document.getElementById('salaryCategory').value !== 'none' ? document.getElementById('salaryCategory').value : null,
                salary_type: document.getElementById('salaryType').value,
                contract_type: document.getElementById('contractType').value,
                base_salary: parseFloat(document.getElementById('baseSalary').value),
                attendance_bonus_pct: parseFloat(document.getElementById('attendanceBonus').value) || 0,
                seniority_bonus_pct: parseFloat(document.getElementById('seniorityBonus').value) || 0,
                monthly_hours: parseInt(document.getElementById('monthlyHours').value) || 176,
                work_days_per_week: parseInt(document.getElementById('workDays').value) || 5,
                work_shift: document.getElementById('workShift').value,
                effective_from: document.getElementById('effectiveFrom').value,
                is_current: true
            };

            const response = await fetch('/api/salary-advanced/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error al guardar');

            closeModal('salaryConfigModal');
            showUserMessage('✅ Configuración salarial guardada', 'success');
            loadSalaryAdvancedData(userId);
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

function addSalaryIncrease(userId) {
    console.log('📈 [SALARY] Registrando aumento salarial:', userId);

    const modal = document.createElement('div');
    modal.id = 'salaryIncreaseModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 12px; width: 500px;">
            <h4 style="color: #2e7d32; margin-bottom: 20px;">📈 Registrar Aumento Salarial</h4>
            <form id="salaryIncreaseForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="font-weight: bold; color: #333;">Nuevo Salario Base *</label>
                        <input type="number" id="newSalary" class="form-control" step="0.01" min="0" required>
                    </div>
                    <div>
                        <label style="font-weight: bold; color: #333;">% de Aumento</label>
                        <input type="number" id="increasePercent" class="form-control" step="0.1" readonly style="background: #e8f5e9;">
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; color: #333;">Motivo del Aumento *</label>
                    <select id="increaseReason" class="form-control" required>
                        <option value="">Seleccionar...</option>
                        <option value="paritarias">Paritarias/Actualización CCT</option>
                        <option value="promotion">Promoción/Ascenso</option>
                        <option value="merit">Mérito/Desempeño</option>
                        <option value="category">Cambio de Categoría</option>
                        <option value="inflation">Ajuste por Inflación</option>
                        <option value="market">Ajuste de Mercado</option>
                        <option value="other">Otro</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; color: #666;">Fecha de Vigencia *</label>
                    <input type="date" id="increaseDate" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-size: 12px; color: #666;">Observaciones</label>
                    <textarea id="increaseNotes" class="form-control" rows="2" placeholder="Detalles adicionales..."></textarea>
                </div>

                <div style="text-align: right; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <button type="button" onclick="closeModal('salaryIncreaseModal')" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">📈 Registrar Aumento</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('salaryIncreaseForm').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = {
                newBaseSalary: parseFloat(document.getElementById('newSalary').value),
                increasePercentage: parseFloat(document.getElementById('increasePercent').value) || null,
                reason: document.getElementById('increaseReason').value,
                effectiveFrom: document.getElementById('increaseDate').value,
                notes: document.getElementById('increaseNotes').value || null
            };

            const response = await fetch(`/api/salary-advanced/config/${userId}/update-salary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Error al registrar');

            closeModal('salaryIncreaseModal');
            showUserMessage(`✅ Aumento registrado. Salario anterior: $${result.previousSalary?.toLocaleString() || '--'}`, 'success');
            loadSalaryAdvancedData(userId);
        } catch (error) {
            console.error('❌ Error:', error);
            showUserMessage(`❌ Error: ${error.message}`, 'error');
        }
    };
}

// ============================================================================
// HISTORIAL DE LIQUIDACIONES - Sistema Dinámico Multi-País
// ============================================================================

// Estado global para paginación de liquidaciones
const payrollHistoryState = {};

/**
 * Carga el historial de liquidaciones de un usuario
 * @param {string|number} userId - ID del usuario
 * @param {boolean} append - Si es true, agrega a la lista existente (paginación)
 */
async function loadUserPayrollHistory(userId, append = false) {
    console.log('📊 [PAYROLL] Cargando historial de liquidaciones para:', userId);

    // Inicializar estado si no existe
    if (!payrollHistoryState[userId]) {
        payrollHistoryState[userId] = { offset: 0, limit: 12, total: 0, data: [] };
    }

    const state = payrollHistoryState[userId];
    if (!append) {
        state.offset = 0;
        state.data = [];
    }

    const tableBody = document.getElementById(`payroll-history-table-${userId}`);
    const loadingSpan = document.getElementById(`payroll-loading-${userId}`);

    if (!append && tableBody) {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #666;">⏳ Cargando historial...</td></tr>`;
    }

    try {
        const companyId = window.progressiveAdmin?.currentUser?.company_id || window.progressiveAdmin?.currentUser?.companyId || 11;
        const response = await fetch(`/api/payroll/user/${userId}/history?limit=${state.limit}&offset=${state.offset}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'x-company-id': companyId.toString()
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error al cargar historial');
        }

        const { history, ytd, pagination } = result.data;
        state.total = pagination.total;
        state.data = append ? [...state.data, ...history] : history;

        // Actualizar KPIs
        updatePayrollKPIs(userId, history, ytd, pagination);

        // Renderizar tabla
        renderPayrollHistoryTable(userId, state.data);

        // Mostrar/ocultar botón de cargar más
        const paginationDiv = document.getElementById(`payroll-pagination-${userId}`);
        if (paginationDiv) {
            paginationDiv.style.display = state.data.length < state.total ? 'block' : 'none';
        }

        console.log(`✅ [PAYROLL] Cargadas ${history.length} liquidaciones (total: ${pagination.total})`);

    } catch (error) {
        console.error('❌ [PAYROLL] Error:', error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #dc3545;">
                ❌ ${error.message}<br>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadUserPayrollHistory('${userId}')">Reintentar</button>
            </td></tr>`;
        }
    }
}

/**
 * Carga más liquidaciones (paginación)
 */
function loadMorePayrollHistory(userId) {
    const state = payrollHistoryState[userId];
    if (state) {
        state.offset += state.limit;
        loadUserPayrollHistory(userId, true);
    }
}

/**
 * Actualiza los KPIs de liquidaciones
 */
function updatePayrollKPIs(userId, history, ytd, pagination) {
    // Última liquidación
    const lastNetEl = document.getElementById(`payroll-last-net-${userId}`);
    const lastPeriodEl = document.getElementById(`payroll-last-period-${userId}`);

    if (history.length > 0) {
        const last = history[0];
        if (lastNetEl) lastNetEl.textContent = `${last.currency.symbol}${last.amounts.net.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        if (lastPeriodEl) lastPeriodEl.textContent = last.period.label;
    } else {
        if (lastNetEl) lastNetEl.textContent = '--';
        if (lastPeriodEl) lastPeriodEl.textContent = 'Sin liquidaciones';
    }

    // Total liquidaciones
    const totalCountEl = document.getElementById(`payroll-total-count-${userId}`);
    if (totalCountEl) totalCountEl.textContent = pagination.total;

    // YTD
    const ytdYearEl = document.getElementById(`payroll-ytd-year-${userId}`);
    const ytdNetEl = document.getElementById(`payroll-ytd-net-${userId}`);
    const ytdMonthsEl = document.getElementById(`payroll-ytd-months-${userId}`);

    if (ytdYearEl) ytdYearEl.textContent = `Acumulado ${ytd.year}`;
    if (ytdNetEl) {
        const symbol = history.length > 0 ? history[0].currency.symbol : '$';
        ytdNetEl.textContent = `${symbol}${ytd.net.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    }
    if (ytdMonthsEl) ytdMonthsEl.textContent = `${ytd.months_processed} meses procesados`;
}

/**
 * Renderiza la tabla de historial de liquidaciones
 */
function renderPayrollHistoryTable(userId, data) {
    const tableBody = document.getElementById(`payroll-history-table-${userId}`);
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #666;">
            📭 No hay liquidaciones registradas para este empleado
        </td></tr>`;
        return;
    }

    const statusConfig = {
        completed: { label: 'Calculada', color: '#ffc107', bg: '#fff3cd' },
        approved: { label: 'Aprobada', color: '#17a2b8', bg: '#d1ecf1' },
        paid: { label: 'Pagada', color: '#28a745', bg: '#d4edda' }
    };

    tableBody.innerHTML = data.map((item, index) => {
        const status = statusConfig[item.status] || { label: item.status, color: '#6c757d', bg: '#e9ecef' };
        const rowBg = index % 2 === 0 ? '#f8f9fa' : '#ffffff';

        return `
            <tr style="background: ${rowBg}; border-bottom: 1px solid #dee2e6;">
                <td style="padding: 10px;">
                    <strong>${item.period.label}</strong>
                    ${item.template.name ? `<br><small style="color: #666;">${item.template.name}</small>` : ''}
                </td>
                <td style="padding: 10px; text-align: right; color: #28a745;">
                    ${item.currency.symbol}${item.amounts.gross.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
                <td style="padding: 10px; text-align: right; color: #dc3545;">
                    -${item.currency.symbol}${item.amounts.deductions.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
                <td style="padding: 10px; text-align: right; font-weight: bold; color: #1565c0;">
                    ${item.currency.symbol}${item.amounts.net.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
                <td style="padding: 10px; text-align: center;">
                    <span style="background: ${status.bg}; color: ${status.color}; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">
                        ${status.label}
                    </span>
                </td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn btn-sm btn-outline-info" onclick="viewPayrollDetail('${userId}', ${item.detail_id})" title="Ver detalle">
                        👁️
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="exportPayrollToPDF('${userId}', ${item.detail_id})" title="Descargar PDF">
                        📄
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Muestra el modal con el detalle de una liquidación
 */
async function viewPayrollDetail(userId, detailId) {
    console.log('👁️ [PAYROLL] Viendo detalle de liquidación:', { userId, detailId });

    // Crear modal si no existe
    let modal = document.getElementById('payrollDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'payrollDetailModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #1565c0, #0d47a1); color: white;">
                    <h3 id="payroll-detail-title">📋 Detalle de Liquidación</h3>
                    <span class="close-btn" onclick="closeModal('payrollDetailModal')">&times;</span>
                </div>
                <div class="modal-body" id="payroll-detail-body" style="padding: 20px;">
                    <div style="text-align: center; padding: 40px;">⏳ Cargando detalle...</div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; padding: 15px; background: #f8f9fa;">
                    <button class="btn btn-primary" onclick="exportPayrollToPDF('${userId}', ${detailId})">
                        📄 Descargar PDF
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('payrollDetailModal')">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Mostrar modal
    modal.style.display = 'flex';

    const bodyEl = document.getElementById('payroll-detail-body');
    bodyEl.innerHTML = `<div style="text-align: center; padding: 40px;">⏳ Cargando detalle...</div>`;

    try {
        const companyId = window.progressiveAdmin?.currentUser?.company_id || window.progressiveAdmin?.currentUser?.companyId || 11;
        const response = await fetch(`/api/payroll/user/${userId}/history/${detailId}/concepts`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'x-company-id': companyId.toString()
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error al cargar detalle');
        }

        const { header, concepts, totals, hours } = result.data;

        // Actualizar título
        document.getElementById('payroll-detail-title').textContent =
            `📋 Recibo de Sueldo - ${header.period.label}`;

        // Renderizar contenido
        bodyEl.innerHTML = renderPayrollDetailContent(header, concepts, totals, hours);

    } catch (error) {
        console.error('❌ [PAYROLL] Error:', error);
        bodyEl.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc3545;">
            ❌ Error: ${error.message}<br>
            <button class="btn btn-sm btn-outline-primary mt-3" onclick="viewPayrollDetail('${userId}', ${detailId})">Reintentar</button>
        </div>`;
    }
}

/**
 * Renderiza el contenido del detalle de liquidación
 */
function renderPayrollDetailContent(header, concepts, totals, hours) {
    const sym = header.currency.symbol;

    // Función helper para formatear montos
    const fmt = (amount) => `${sym}${parseFloat(amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

    return `
        <!-- Header del recibo -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div>
                <h5 style="margin: 0 0 10px 0; color: #1565c0;">👤 Empleado</h5>
                <div><strong>${header.employee.full_name}</strong></div>
                <div style="font-size: 12px; color: #666;">DNI/ID: ${header.employee.dni || '--'}</div>
                <div style="font-size: 12px; color: #666;">Departamento: ${header.employee.department || '--'}</div>
            </div>
            <div style="text-align: right;">
                <h5 style="margin: 0 0 10px 0; color: #1565c0;">📅 Período</h5>
                <div><strong>${header.period.label}</strong></div>
                <div style="font-size: 12px; color: #666;">${header.period.start || ''} - ${header.period.end || ''}</div>
                <div style="font-size: 12px; color: #666;">Plantilla: ${header.template.name || 'N/A'}</div>
            </div>
        </div>

        <!-- Horas trabajadas -->
        ${hours.worked_days || hours.worked_hours ? `
        <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
            ${hours.worked_days ? `<span style="background: #e3f2fd; padding: 5px 12px; border-radius: 15px; font-size: 12px;">📅 ${hours.worked_days} días trabajados</span>` : ''}
            ${hours.worked_hours ? `<span style="background: #e8f5e9; padding: 5px 12px; border-radius: 15px; font-size: 12px;">⏱️ ${hours.worked_hours}hs normales</span>` : ''}
            ${hours.overtime_50 ? `<span style="background: #fff3e0; padding: 5px 12px; border-radius: 15px; font-size: 12px;">⏰ ${hours.overtime_50}hs extra 50%</span>` : ''}
            ${hours.overtime_100 ? `<span style="background: #fce4ec; padding: 5px 12px; border-radius: 15px; font-size: 12px;">⏰ ${hours.overtime_100}hs extra 100%</span>` : ''}
        </div>
        ` : ''}

        <!-- Conceptos: Haberes -->
        <div style="margin-bottom: 20px;">
            <h5 style="color: #2e7d32; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #2e7d32;">
                ➕ Haberes (Remunerativos)
            </h5>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #e8f5e9;">
                        <th style="padding: 8px; text-align: left;">Concepto</th>
                        <th style="padding: 8px; text-align: right;">Cant.</th>
                        <th style="padding: 8px; text-align: right;">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${concepts.earnings.length > 0 ? concepts.earnings.map(c => `
                        <tr style="border-bottom: 1px solid #dee2e6;">
                            <td style="padding: 8px;">${c.name} <small style="color:#888;">(${c.code})</small></td>
                            <td style="padding: 8px; text-align: right;">${c.quantity || c.rate ? (c.rate ? `${c.rate}%` : c.quantity) : '-'}</td>
                            <td style="padding: 8px; text-align: right; color: #2e7d32; font-weight: 500;">${fmt(c.amount)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="3" style="padding: 8px; color: #666; text-align: center;">Sin haberes registrados</td></tr>'}
                </tbody>
                <tfoot>
                    <tr style="background: #c8e6c9; font-weight: bold;">
                        <td colspan="2" style="padding: 8px;">TOTAL BRUTO</td>
                        <td style="padding: 8px; text-align: right;">${fmt(totals.gross)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Conceptos: Deducciones -->
        <div style="margin-bottom: 20px;">
            <h5 style="color: #c62828; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #c62828;">
                ➖ Deducciones
            </h5>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #ffebee;">
                        <th style="padding: 8px; text-align: left;">Concepto</th>
                        <th style="padding: 8px; text-align: left;">Destino</th>
                        <th style="padding: 8px; text-align: right;">Tasa</th>
                        <th style="padding: 8px; text-align: right;">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${concepts.deductions.length > 0 ? concepts.deductions.map(c => `
                        <tr style="border-bottom: 1px solid #dee2e6;">
                            <td style="padding: 8px;">${c.name} <small style="color:#888;">(${c.code})</small></td>
                            <td style="padding: 8px; font-size: 11px; color: #666;">${c.entity || '-'}</td>
                            <td style="padding: 8px; text-align: right;">${c.rate ? `${c.rate}%` : '-'}</td>
                            <td style="padding: 8px; text-align: right; color: #c62828; font-weight: 500;">-${fmt(c.amount)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="padding: 8px; color: #666; text-align: center;">Sin deducciones</td></tr>'}
                </tbody>
                <tfoot>
                    <tr style="background: #ffcdd2; font-weight: bold;">
                        <td colspan="3" style="padding: 8px;">TOTAL DEDUCCIONES</td>
                        <td style="padding: 8px; text-align: right;">-${fmt(totals.deductions)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Neto a cobrar -->
        <div style="background: linear-gradient(135deg, #1565c0, #0d47a1); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <div style="font-size: 14px; margin-bottom: 5px;">NETO A COBRAR</div>
            <div style="font-size: 32px; font-weight: bold;">${fmt(totals.net)}</div>
        </div>

        <!-- Aportes patronales (informativo) -->
        ${concepts.employer_contributions.length > 0 ? `
        <div style="margin-bottom: 10px;">
            <h5 style="color: #6c757d; margin: 0 0 10px 0; padding-bottom: 5px; border-bottom: 1px solid #6c757d; font-size: 13px;">
                ℹ️ Contribuciones Patronales (Informativo)
            </h5>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #666;">
                <tbody>
                    ${concepts.employer_contributions.map(c => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 6px;">${c.name}</td>
                            <td style="padding: 6px;">${c.entity || '-'}</td>
                            <td style="padding: 6px; text-align: right;">${c.rate ? `${c.rate}%` : '-'}</td>
                            <td style="padding: 6px; text-align: right;">${fmt(c.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background: #f8f9fa; font-weight: bold;">
                        <td colspan="3" style="padding: 6px;">Costo Empleador Total</td>
                        <td style="padding: 6px; text-align: right;">${fmt(totals.employer_cost)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        ` : ''}

        <!-- Footer con estado -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #dee2e6; font-size: 11px; color: #666;">
            <span>Estado: <strong style="color: ${header.status === 'paid' ? '#28a745' : '#ffc107'}">${header.status === 'paid' ? 'PAGADO' : header.status === 'approved' ? 'APROBADO' : 'CALCULADO'}</strong></span>
            ${header.pay_date ? `<span>Fecha de pago: ${new Date(header.pay_date).toLocaleDateString('es-AR')}</span>` : ''}
            <span>País: ${header.country || 'N/A'} | Moneda: ${header.currency.code}</span>
        </div>
    `;
}

/**
 * Exporta una liquidación a PDF
 */
async function exportPayrollToPDF(userId, detailId) {
    console.log('📄 [PAYROLL] Exportando a PDF:', { userId, detailId });
    showUserMessage('📄 Generando PDF...', 'info');

    try {
        // Cargar datos del detalle
        const response = await fetch(`/api/payroll/user/${userId}/history/${detailId}/concepts`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        const { header, concepts, totals, hours } = result.data;

        // Crear contenido HTML para el PDF
        const pdfContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Recibo de Sueldo - ${header.period.label}</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #1565c0; padding-bottom: 15px; margin-bottom: 20px; }
                    .header h1 { color: #1565c0; margin: 0; }
                    .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    .info-box { flex: 1; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background: #f5f5f5; }
                    .earnings th { background: #e8f5e9; }
                    .deductions th { background: #ffebee; }
                    .total-row { font-weight: bold; background: #f5f5f5; }
                    .net-box { background: #1565c0; color: white; padding: 20px; text-align: center; margin: 20px 0; }
                    .net-amount { font-size: 28px; font-weight: bold; }
                    .footer { font-size: 10px; color: #666; text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>RECIBO DE SUELDO</h1>
                    <div>${header.period.label}</div>
                </div>

                <div class="info-grid">
                    <div class="info-box">
                        <strong>Empleado:</strong> ${header.employee.full_name}<br>
                        <strong>DNI:</strong> ${header.employee.dni || 'N/A'}<br>
                        <strong>Departamento:</strong> ${header.employee.department || 'N/A'}
                    </div>
                    <div class="info-box" style="text-align: right;">
                        <strong>Período:</strong> ${header.period.start} - ${header.period.end}<br>
                        <strong>Plantilla:</strong> ${header.template.name || 'N/A'}<br>
                        <strong>País:</strong> ${header.country || 'N/A'}
                    </div>
                </div>

                <h3 style="color: #2e7d32;">Haberes</h3>
                <table class="earnings">
                    <thead><tr><th>Concepto</th><th style="text-align:right;">Importe</th></tr></thead>
                    <tbody>
                        ${concepts.earnings.map(c => `<tr><td>${c.name}</td><td style="text-align:right;">${header.currency.symbol}${c.amount.toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                    <tfoot><tr class="total-row"><td>TOTAL BRUTO</td><td style="text-align:right;">${header.currency.symbol}${totals.gross.toFixed(2)}</td></tr></tfoot>
                </table>

                <h3 style="color: #c62828;">Deducciones</h3>
                <table class="deductions">
                    <thead><tr><th>Concepto</th><th>Destino</th><th style="text-align:right;">Importe</th></tr></thead>
                    <tbody>
                        ${concepts.deductions.map(c => `<tr><td>${c.name}</td><td>${c.entity || '-'}</td><td style="text-align:right;">-${header.currency.symbol}${c.amount.toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                    <tfoot><tr class="total-row"><td colspan="2">TOTAL DEDUCCIONES</td><td style="text-align:right;">-${header.currency.symbol}${totals.deductions.toFixed(2)}</td></tr></tfoot>
                </table>

                <div class="net-box">
                    <div>NETO A COBRAR</div>
                    <div class="net-amount">${header.currency.symbol}${totals.net.toFixed(2)}</div>
                </div>

                <div class="footer">
                    <p>Generado el ${new Date().toLocaleDateString('es-AR')} | Sistema de Asistencia Biométrico</p>
                    ${header.receipt_footer || ''}
                </div>
            </body>
            </html>
        `;

        // Abrir en nueva ventana para imprimir/guardar como PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(pdfContent);
        printWindow.document.close();
        printWindow.print();

        showUserMessage('✅ PDF generado correctamente', 'success');

    } catch (error) {
        console.error('❌ [PAYROLL] Error exportando PDF:', error);
        showUserMessage(`❌ Error: ${error.message}`, 'error');
    }
}

// Función para cargar todos los datos salariales avanzados
async function loadSalaryAdvancedData(userId) {
    console.log('💰 [SALARY] Cargando datos salariales avanzados para:', userId);

    try {
        const response = await fetch(`/api/salary-advanced/summary/${userId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();

        if (!result.success) {
            console.warn('⚠️ No se pudieron cargar datos salariales');
            return;
        }

        const data = result.data;

        // Actualizar configuración salarial
        if (data.currentConfig) {
            const c = data.currentConfig;
            document.getElementById('salary-agreement').textContent = c.laborAgreement?.name || 'Sin convenio';
            document.getElementById('salary-category').textContent = c.salaryCategory?.description || 'Sin categoría';

            const salaryTypes = { monthly: 'Mensual', biweekly: 'Quincenal', weekly: 'Semanal', daily: 'Jornal', hourly: 'Por hora' };
            document.getElementById('salary-type').textContent = salaryTypes[c.salary_type] || '--';

            document.getElementById('salary-base-amount').textContent = c.base_salary ? `$${c.base_salary.toLocaleString()}` : '$--';

            // Calcular valor hora
            const monthlyHours = c.monthly_hours || 176;
            const hourlyRate = c.base_salary ? (c.base_salary / monthlyHours) : 0;
            document.getElementById('salary-hourly-rate').textContent = `$${hourlyRate.toFixed(0)}`;
            document.getElementById('salary-overtime-rate').textContent = `$${(hourlyRate * 1.5).toFixed(0)}`;

            // Datos de último aumento
            if (c.previous_base_salary) {
                document.getElementById('salary-last-increase').textContent = `$${(c.base_salary - c.previous_base_salary).toLocaleString()}`;
            }
            if (c.salary_increase_percentage) {
                document.getElementById('salary-increase-pct').textContent = `${c.salary_increase_percentage.toFixed(1)}%`;
            }
            if (c.last_salary_update) {
                document.getElementById('salary-update-date').textContent = new Date(c.last_salary_update).toLocaleDateString('es-AR');
            }
        }

        // Actualizar historial de salarios
        if (data.salaryHistory && data.salaryHistory.length > 0) {
            const historyList = document.getElementById('salary-history-list');
            historyList.innerHTML = data.salaryHistory.map(h => `
                <div style="display: flex; justify-content: space-between; padding: 5px; background: ${h.is_current ? '#e8f5e9' : '#f5f5f5'}; border-radius: 4px; margin-bottom: 3px;">
                    <span>${new Date(h.effective_from).toLocaleDateString('es-AR')}</span>
                    <span style="font-weight: bold;">$${h.base_salary?.toLocaleString() || '--'}</span>
                    <span style="color: #2e7d32;">${h.salary_increase_percentage ? `+${h.salary_increase_percentage.toFixed(1)}%` : ''}</span>
                </div>
            `).join('');
        }

        // Actualizar resumen de liquidaciones
        if (data.yearSummary) {
            const y = data.yearSummary;
            document.getElementById('payroll-ytd').textContent = `$${y.netTotal?.toLocaleString() || '--'}`;
            document.getElementById('payroll-months-processed').textContent = `${y.monthsProcessed} meses procesados`;
        }

        // Actualizar última liquidación
        if (data.payrollRecords && data.payrollRecords.length > 0) {
            const latest = data.payrollRecords[0];
            document.getElementById('payroll-current').textContent = `$${latest.net_salary?.toLocaleString() || '--'}`;
            document.getElementById('payroll-current-status').textContent = latest.status === 'paid' ? '✅ Pagado' : latest.status === 'approved' ? '✔️ Aprobado' : '⏳ Borrador';

            // Desglose
            document.getElementById('payroll-basic').textContent = `$${latest.base_salary?.toLocaleString() || '--'}`;
            document.getElementById('payroll-overtime').textContent = `$${((latest.overtime_50_amount || 0) + (latest.overtime_100_amount || 0)).toLocaleString()}`;
            document.getElementById('payroll-attendance').textContent = `$${latest.attendance_bonus?.toLocaleString() || '--'}`;
            document.getElementById('payroll-additionals').textContent = `$${latest.other_additions?.toLocaleString() || '0'}`;
            document.getElementById('payroll-gross').textContent = `$${latest.gross_total?.toLocaleString() || '--'}`;
            document.getElementById('payroll-retirement').textContent = `$${latest.retirement_deduction?.toLocaleString() || '--'}`;
            document.getElementById('payroll-health').textContent = `$${latest.social_work_deduction?.toLocaleString() || '--'}`;
            document.getElementById('payroll-pami').textContent = `$${latest.pami_deduction?.toLocaleString() || '--'}`;
            document.getElementById('payroll-union').textContent = `$${latest.union_deduction?.toLocaleString() || '0'}`;
            document.getElementById('payroll-net').textContent = `$${latest.net_salary?.toLocaleString() || '--'}`;

            // Mes anterior
            if (data.payrollRecords.length > 1) {
                const prev = data.payrollRecords[1];
                document.getElementById('payroll-previous').textContent = `$${prev.net_salary?.toLocaleString() || '--'}`;
                document.getElementById('payroll-previous-status').textContent = prev.status === 'paid' ? '✅ Pagado' : '--';
            }
        }

        console.log('✅ [SALARY] Datos salariales cargados');

    } catch (error) {
        console.error('❌ Error cargando datos salariales:', error);
    }
}

// ============================================================================
// FIN FUNCIONES SALARIALES AVANZADAS
// ============================================================================

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
                            <option value="preocupacional">Preocupacional</option>
                            <option value="periodico">Chequeo Periódico</option>
                            <option value="reingreso">Reingreso</option>
                            <option value="retiro">Retiro</option>
                            <option value="especial">Especial</option>
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
                            <option value="apto">Apto</option>
                            <option value="apto_con_observaciones">Apto con observaciones</option>
                            <option value="no_apto">No apto</option>
                            <option value="pendiente">Pendiente</option>
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
            performed_by: document.getElementById('examDoctor').value || null,  // ✅ FIX: era performedBy
            facility_name: document.getElementById('medicalCenter').value || null,  // ✅ FIX: era facilityName
            next_exam_date: document.getElementById('nextControl').value || null,  // ✅ FIX: era nextExamDate
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

// ═══════════════════════════════════════════════════════════════
// FUNCIONES DE MODALES DE DOCUMENTOS BIOMÉTRICOS
// ═══════════════════════════════════════════════════════════════

function openDniPhotosModal(userId) {
    const modal = document.createElement('div');
    modal.id = 'dniPhotosModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10002;';

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 8px; width: 600px; max-height: 90vh; overflow-y: auto;">
            <h3>📄 DNI - Frente y Dorso</h3>
            <form id="dniPhotosForm">
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px;">DNI Frente:</label>
                    <input type="file" id="dniFront" accept="image/*" class="form-control" required>
                </div>
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px;">DNI Dorso:</label>
                    <input type="file" id="dniBack" accept="image/*" class="form-control" required>
                </div>
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px;">Número de DNI:</label>
                    <input type="text" id="dniNumber" class="form-control" placeholder="12345678" required>
                </div>
                <div style="margin: 20px 0;">
                    <label style="display: block; margin-bottom: 10px;">Fecha de Vencimiento:</label>
                    <input type="date" id="dniExpiry" class="form-control" required>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="document.getElementById('dniPhotosModal').remove()" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Guardar DNI</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('dniPhotosForm').onsubmit = async (e) => {
        e.preventDefault();
        showUserMessage('✅ DNI guardado exitosamente', 'success');
        modal.remove();
    };
}

function openPassportModal(userId) {
    const modal = document.createElement('div');
    modal.id = 'passportModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10002;';

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 8px; width: 600px; max-height: 90vh; overflow-y: auto;">
            <h3>🛂 Pasaporte</h3>
            <form id="passportForm">
                <div style="margin: 20px 0;">
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" id="hasPassport" style="margin-right: 10px;">
                        Tiene Pasaporte
                    </label>
                </div>
                <div id="passportFields" style="display: none;">
                    <div style="margin: 20px 0;">
                        <label>Número de Pasaporte:</label>
                        <input type="text" id="passportNumber" class="form-control" placeholder="AAA123456">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>País Emisor:</label>
                        <input type="text" id="issuingCountry" class="form-control" placeholder="Argentina">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Fecha de Emisión:</label>
                        <input type="date" id="passportIssueDate" class="form-control">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Fecha de Vencimiento:</label>
                        <input type="date" id="passportExpiry" class="form-control">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Página 1 (foto):</label>
                        <input type="file" id="passportPage1" accept="image/*" class="form-control">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Página 2 (sellos):</label>
                        <input type="file" id="passportPage2" accept="image/*" class="form-control">
                    </div>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="document.getElementById('passportModal').remove()" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Guardar Pasaporte</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('hasPassport').onchange = (e) => {
        document.getElementById('passportFields').style.display = e.target.checked ? 'block' : 'none';
    };

    document.getElementById('passportForm').onsubmit = async (e) => {
        e.preventDefault();
        showUserMessage('✅ Pasaporte guardado exitosamente', 'success');
        modal.remove();
    };
}

function openWorkVisaModal(userId) {
    const modal = document.createElement('div');
    modal.id = 'workVisaModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10002;';

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 8px; width: 600px; max-height: 90vh; overflow-y: auto;">
            <h3>🌍 Visa de Trabajo</h3>
            <form id="workVisaForm">
                <div style="margin: 20px 0;">
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" id="hasWorkVisa" style="margin-right: 10px;">
                        Tiene Visa de Trabajo
                    </label>
                </div>
                <div id="visaFields" style="display: none;">
                    <div style="margin: 20px 0;">
                        <label>País Destino:</label>
                        <input type="text" id="destinationCountry" class="form-control" placeholder="USA">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Tipo de Visa:</label>
                        <input type="text" id="visaType" class="form-control" placeholder="H1B">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Fecha de Emisión:</label>
                        <input type="date" id="visaIssueDate" class="form-control">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Fecha de Vencimiento:</label>
                        <input type="date" id="visaExpiry" class="form-control">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Número de Visa:</label>
                        <input type="text" id="visaNumber" class="form-control" placeholder="VISA123456">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Empresa Patrocinadora:</label>
                        <input type="text" id="sponsorCompany" class="form-control" placeholder="Empresa Inc.">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Documento de Visa:</label>
                        <input type="file" id="visaDocument" accept="image/*,application/pdf" class="form-control">
                    </div>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="document.getElementById('workVisaModal').remove()" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Guardar Visa</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('hasWorkVisa').onchange = (e) => {
        document.getElementById('visaFields').style.display = e.target.checked ? 'block' : 'none';
    };

    document.getElementById('workVisaForm').onsubmit = async (e) => {
        e.preventDefault();
        showUserMessage('✅ Visa de trabajo guardada exitosamente', 'success');
        modal.remove();
    };
}

function openNationalLicenseModal(userId) {
    const modal = document.createElement('div');
    modal.id = 'nationalLicenseModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10002;';

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 8px; width: 600px; max-height: 90vh; overflow-y: auto;">
            <h3>🚗 Licencia de Conducir Nacional</h3>
            <form id="nationalLicenseForm">
                <div style="margin: 20px 0;">
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" id="hasNationalLicense" style="margin-right: 10px;">
                        Tiene Licencia de Conducir
                    </label>
                </div>
                <div id="licenseFields" style="display: none;">
                    <div style="margin: 20px 0;">
                        <label>Número de Licencia:</label>
                        <input type="text" id="licenseNumber" class="form-control" placeholder="LIC-12345678">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Fecha de Vencimiento:</label>
                        <input type="date" id="licenseExpiry" class="form-control">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Autoridad Emisora:</label>
                        <input type="text" id="issuingAuthority" class="form-control" placeholder="Municipalidad">
                    </div>
                    <div style="margin: 20px 0;">
                        <label>Fotos de Licencia (Frente/Dorso):</label>
                        <input type="file" id="licensePhotos" accept="image/*" class="form-control" multiple>
                    </div>
                </div>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" onclick="document.getElementById('nationalLicenseModal').remove()" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-success">Guardar Licencia</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('hasNationalLicense').onchange = (e) => {
        document.getElementById('licenseFields').style.display = e.target.checked ? 'block' : 'none';
    };

    document.getElementById('nationalLicenseForm').onsubmit = async (e) => {
        e.preventDefault();
        showUserMessage('✅ Licencia de conducir guardada exitosamente', 'success');
        modal.remove();
    };
}

// Exponer funciones globalmente para onclick handlers
window.viewUser = viewUser;
window.deleteUser = deleteUser;
window.resetPassword = resetPassword;
window.assignUserShifts = assignUserShifts;
window.openDniPhotosModal = openDniPhotosModal;
window.openPassportModal = openPassportModal;
window.openWorkVisaModal = openWorkVisaModal;
window.openNationalLicenseModal = openNationalLicenseModal;
// window.uploadUserPhoto = uploadUserPhoto; // COMMENTED: Function not defined, causing errors
// window.removeUserPhoto = removeUserPhoto; // COMMENTED: Function not defined, causing errors

// Family Documents - Benefits Engine
window.addFamilyDocument = addFamilyDocument;
window.loadFamilyDocuments = loadFamilyDocuments;
window.renderFamilyDocuments = renderFamilyDocuments;

} // Cierre del bloque else - previene re-ejecución en doble carga del módulo
