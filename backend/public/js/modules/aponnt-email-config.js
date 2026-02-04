/**
 * ============================================================================
 * APONNT EMAIL CONFIG MODULE - Configuracion de Emails de Aponnt
 * ============================================================================
 *
 * Modulo para gestionar las configuraciones SMTP de todos los emails de Aponnt.
 *
 * ACCESO:
 * - SIN RESTRICCIONES - Acceso libre para administradores
 *
 * FEATURES:
 * - CRUD de configuraciones de email
 * - Test de conexion SMTP
 * - Passwords encriptados
 * - Historial de auditoria
 * - Estadisticas
 *
 * ============================================================================
 */

const AponntEmailConfigModule = (() => {
    let currentConfig = null;
    let allConfigs = [];
    let stats = null;
    let allProcesses = [];
    let processStats = null;
    let filteredProcesses = [];
    let searchTerm = '';
    let selectedModule = 'all';
    let allWorkflows = [];
    let workflowStats = null;
    let filteredWorkflows = [];

    // Mapeo de email types a info visual (SE CARGA DINÁMICAMENTE desde BD)
    let EMAIL_INFO = {};

    /**
     * Cargar EMAIL_INFO dinámicamente desde la base de datos
     */
    async function loadEmailInfo() {
        try {
            console.log('[EMAIL-CONFIG] Cargando EMAIL_INFO desde BD...');

            const staffToken = window.getMultiKeyToken();
            const normalToken = localStorage.getItem('token') || sessionStorage.getItem('token');
            const token = staffToken || normalToken;

            const response = await fetch('/api/email-config', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Transformar configs array a objeto EMAIL_INFO
            EMAIL_INFO = {};
            data.configs.forEach(config => {
                EMAIL_INFO[config.email_type] = {
                    icon: config.icon || '📧',
                    color: config.color || '#6b7280',
                    description: config.description || 'Email de Aponnt'
                };
            });

            console.log(`[EMAIL-CONFIG] ✅ EMAIL_INFO cargado: ${Object.keys(EMAIL_INFO).length} tipos de email`);

        } catch (error) {
            console.error('[EMAIL-CONFIG] ❌ Error cargando EMAIL_INFO:', error);

            // Fallback - EMAIL_INFO vacío si falla
            EMAIL_INFO = {
                default: {
                    icon: '📧',
                    color: '#6b7280',
                    description: 'Email de Aponnt'
                }
            };
        }
    }

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    async function init() {
        console.log('[EMAIL-CONFIG] Inicializando modulo de configuracion de emails...');

        try {
            // MODULO SIN RESTRICCIONES - Acceso libre para todos los admins
            // Buscar token en localStorage Y sessionStorage (como admin-panel-controller)
            const staffToken = window.getMultiKeyToken();
            const normalToken = localStorage.getItem('token') || sessionStorage.getItem('token');
            const token = staffToken || normalToken;

            console.log('[EMAIL-CONFIG] Staff token presente:', !!staffToken);
            console.log('[EMAIL-CONFIG] Normal token presente:', !!normalToken);
            console.log('[EMAIL-CONFIG] Token final:', token ? 'SI' : 'NO');

            if (!token) {
                throw new Error('No hay token de autenticacion. Inicia sesion primero.');
            }

            console.log('[EMAIL-CONFIG] Acceso permitido - Modulo publico');

            // Primero cargar EMAIL_INFO dinámicamente desde BD
            await loadEmailInfo();

            await loadAllData();
            render();
            attachEventListeners();

            console.log('✅ [EMAIL-CONFIG] Módulo inicializado correctamente');
        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error inicializando:', error);
            renderError(error.message);
            throw error; // Re-throw para que AdminPanelController lo maneje
        }
    }

    async function loadAllData() {
        try {
            // Cargar configs, stats, procesos, workflows y stats en paralelo
            const [configsRes, statsRes, processesRes, processStatsRes, workflowsRes, workflowStatsRes] = await Promise.all([
                apiCall('/api/email-config'),
                apiCall('/api/email-config/stats'),
                apiCall('/api/email-config/processes/all'),
                apiCall('/api/email-config/processes/stats'),
                apiCall('/api/notifications/workflows?scope=all'),
                apiCall('/api/notifications/workflows/stats')
            ]);

            allConfigs = configsRes.configs || [];
            stats = statsRes.stats || {};
            allProcesses = processesRes.processes || [];
            processStats = processStatsRes.stats || {};
            filteredProcesses = [...allProcesses];
            allWorkflows = workflowsRes.workflows || [];
            workflowStats = workflowStatsRes.stats || {};
            filteredWorkflows = [...allWorkflows];

            console.log(`✅ [EMAIL-CONFIG] Cargadas ${allConfigs.length} configuraciones`);
            console.log(`✅ [EMAIL-CONFIG] Cargados ${allProcesses.length} procesos`);
            console.log(`✅ [EMAIL-CONFIG] Cargados ${allWorkflows.length} workflows`);
        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error cargando datos:', error);
            throw error;
        }
    }

    // =========================================================================
    // RENDER
    // =========================================================================

    function render() {
        const container = document.getElementById('email-config-container');
        if (!container) {
            console.error('❌ [EMAIL-CONFIG] Container #email-config-container no encontrado');
            return;
        }

        container.innerHTML = `
            <div class="email-config-module">
                <!-- Header -->
                <div class="module-header">
                    <div>
                        <h1>
                            Configuracion de Emails Aponnt
                        </h1>
                        <p class="text-muted">
                            Gestion centralizada de credenciales SMTP y configuracion de emails institucionales
                        </p>
                    </div>
                    <div>
                        ${renderStats()}
                    </div>
                </div>

                <!-- Tabs -->
                <div class="tabs-container">
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="configs">
                            📋 Configuraciones (${allConfigs.length})
                        </button>
                        <button class="tab-btn" data-tab="processes">
                            🔗 Asignación de Procesos
                            ${processStats && processStats.critical_unmapped > 0 ? `<span class="badge badge-danger">${processStats.critical_unmapped}</span>` : ''}
                        </button>
                        <button class="tab-btn" data-tab="workflows">
                            🔔 Workflows de Notificaciones (${allWorkflows.length})
                        </button>
                        <button class="tab-btn" data-tab="audit">
                            📜 Auditoría
                        </button>
                        <button class="tab-btn" data-tab="help">
                            ❓ Ayuda
                        </button>
                    </div>
                </div>

                <!-- Tab: Configuraciones -->
                <div class="tab-content active" data-tab="configs">
                    ${renderConfigsList()}
                </div>

                <!-- Tab: Asignación de Procesos -->
                <div class="tab-content" data-tab="processes">
                    <div id="processes-container"></div>
                </div>

                <!-- Tab: Workflows de Notificaciones -->
                <div class="tab-content" data-tab="workflows">
                    <div id="workflows-container"></div>
                </div>

                <!-- Tab: Auditoría -->
                <div class="tab-content" data-tab="audit">
                    <div id="audit-container"></div>
                </div>

                <!-- Tab: Ayuda -->
                <div class="tab-content" data-tab="help">
                    ${renderHelp()}
                </div>
            </div>

            <!-- Modal de edición -->
            <div id="edit-config-modal" class="modal" style="display: none;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Editar Configuración de Email</h3>
                            <button class="close-btn" onclick="AponntEmailConfigModule.closeEditModal()">×</button>
                        </div>
                        <div class="modal-body" id="edit-config-form-container"></div>
                    </div>
                </div>
            </div>

            <!-- Modal de creación -->
            <div id="create-config-modal" class="modal" style="display: none;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>➕ Crear Nuevo Tipo de Email</h3>
                            <button class="close-btn" onclick="AponntEmailConfigModule.closeCreateModal()">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-section">
                                <h4>Información Básica</h4>

                                <div class="form-group">
                                    <label>Tipo de Email (ID único) <span style="color: red;">*</span></label>
                                    <input type="text" id="create-email-type" class="form-control" placeholder="Ej: marketing, soporte-nivel2, facturas-online">
                                    <small style="color: #6b7280;">Usa minúsculas y guiones. No se puede cambiar después.</small>
                                </div>

                                <div class="form-group">
                                    <label>Nombre para Mostrar <span style="color: red;">*</span></label>
                                    <input type="text" id="create-display-name" class="form-control" placeholder="Ej: Marketing Campaigns, Soporte Nivel 2">
                                </div>

                                <div class="form-group">
                                    <label>Icono (Emoji)</label>
                                    <input type="text" id="create-icon" class="form-control" placeholder="📧" maxlength="2" value="📧">
                                    <small style="color: #6b7280;">Copia/pega un emoji desde <a href="https://emojipedia.org" target="_blank">Emojipedia</a></small>
                                </div>

                                <div class="form-group">
                                    <label>Color (Hexadecimal)</label>
                                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                                        <input type="color" id="create-color-picker" value="#6b7280">
                                        <input type="text" id="create-color" class="form-control" placeholder="#6b7280" value="#6b7280" style="flex: 1;">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Descripción</label>
                                    <textarea id="create-description" class="form-control" rows="2" placeholder="Ej: Emails de campañas de marketing y promociones"></textarea>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4>Configuración SMTP (Opcional)</h4>
                                <p style="color: #6b7280; font-size: 0.875rem;">Puedes configurar estos datos ahora o más tarde.</p>

                                <div class="form-group">
                                    <label>Email Remitente</label>
                                    <input type="email" id="create-from-email" class="form-control" placeholder="marketing@aponnt.com">
                                </div>

                                <div class="form-group">
                                    <label>Nombre del Remitente</label>
                                    <input type="text" id="create-from-name" class="form-control" placeholder="Aponnt Marketing">
                                </div>

                                <div class="form-group">
                                    <label>🏢 Proveedor de Email</label>
                                    <select class="form-control" id="create-smtp-provider" onchange="AponntEmailConfigModule.onCreateProviderChange(this.value)">
                                        <option value="gmail">📧 Gmail / Google Workspace</option>
                                        <option value="outlook">📨 Outlook.com / Hotmail</option>
                                        <option value="office365">🏢 Microsoft 365 / Office 365</option>
                                        <option value="yahoo">💌 Yahoo Mail</option>
                                        <option value="custom">⚙️ Servidor SMTP Personalizado</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>🖥️ Servidor SMTP (Host)</label>
                                    <input type="text" class="form-control" id="create-smtp-host" placeholder="smtp.gmail.com" value="smtp.gmail.com">
                                </div>

                                <div class="form-group">
                                    <label>🔌 Puerto SMTP</label>
                                    <input type="number" class="form-control" id="create-smtp-port" value="587">
                                    <small style="color: #6b7280;">Común: 587 (TLS), 465 (SSL), 25 (sin encriptación)</small>
                                </div>

                                <div class="form-group">
                                    <label>👤 Usuario SMTP</label>
                                    <input type="text" class="form-control" id="create-smtp-user" placeholder="tu-email@gmail.com">
                                    <small style="color: #6b7280;">Generalmente es la dirección de email completa</small>
                                </div>

                                <!-- Sección de password para Gmail (App Password) -->
                                <div id="create-gmail-password-section">
                                    <div class="form-group">
                                        <label>🔑 App Password (Gmail)</label>
                                        <input type="password" class="form-control" id="create-app-password" placeholder="•••• •••• •••• ••••">
                                        <small style="color: #6b7280;">
                                            Contraseña de aplicación de Gmail (16 caracteres).
                                            <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color: #3b82f6;">Generar aquí</a>
                                        </small>
                                    </div>
                                </div>

                                <!-- Sección de password estándar (otros proveedores) -->
                                <div id="create-standard-password-section" style="display: none;">
                                    <div class="form-group">
                                        <label>🔒 Contraseña SMTP</label>
                                        <input type="password" class="form-control" id="create-smtp-password" placeholder="••••••••">
                                        <small style="color: #6b7280;">Contraseña de la cuenta de email</small>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                                        <input type="checkbox" id="create-smtp-secure" checked style="width: auto;">
                                        <span>🔐 Usar conexión segura (TLS/SSL)</span>
                                    </label>
                                    <small style="color: #6b7280; display: block; margin-left: 1.5rem;">Recomendado para mayor seguridad</small>
                                </div>
                            </div>

                            <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                                <button class="btn btn-secondary" onclick="AponntEmailConfigModule.closeCreateModal()">
                                    Cancelar
                                </button>
                                <button class="btn btn-primary" onclick="AponntEmailConfigModule.submitCreate()">
                                    Crear Tipo de Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .email-config-module {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .module-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid #e5e7eb;
                }

                .module-header h1 {
                    font-size: 2rem;
                    color: #1f2937;
                    margin-bottom: 0.5rem;
                }

                .badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    margin-left: 0.5rem;
                }

                .badge-danger {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    min-width: 300px;
                }

                .stat-card {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 0.75rem;
                    text-align: center;
                }

                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #1f2937;
                }

                .stat-label {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 0.25rem;
                }

                .tabs-container {
                    margin-bottom: 2rem;
                }

                .tabs {
                    display: flex;
                    gap: 0.5rem;
                    border-bottom: 2px solid #e5e7eb;
                }

                .tab-btn {
                    padding: 0.75rem 1.5rem;
                    background: none;
                    border: none;
                    border-bottom: 3px solid transparent;
                    cursor: pointer;
                    font-size: 0.95rem;
                    color: #6b7280;
                    transition: all 0.2s;
                }

                .tab-btn:hover {
                    color: #1f2937;
                    background: #f9fafb;
                }

                .tab-btn.active {
                    color: #2563eb;
                    border-bottom-color: #2563eb;
                    font-weight: 600;
                }

                .tab-content {
                    display: none;
                }

                .tab-content.active {
                    display: block;
                }

                .configs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 1.5rem;
                }

                .config-card {
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 1.5rem;
                    transition: all 0.2s;
                }

                .config-card:hover {
                    border-color: #3b82f6;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
                }

                .config-card-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .config-icon {
                    font-size: 2rem;
                }

                .config-info h3 {
                    font-size: 1.1rem;
                    color: #1f2937;
                    margin-bottom: 0.25rem;
                }

                .config-email {
                    font-size: 0.9rem;
                    color: #3b82f6;
                    font-weight: 500;
                }

                .config-description {
                    font-size: 0.85rem;
                    color: #6b7280;
                    margin-bottom: 1rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .config-details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .config-detail-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.85rem;
                }

                .config-detail-label {
                    color: #6b7280;
                }

                .config-detail-value {
                    color: #1f2937;
                    font-weight: 500;
                }

                .config-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .config-status.success {
                    background: #d1fae5;
                    color: #065f46;
                }

                .config-status.failed {
                    background: #fee2e2;
                    color: #991b1b;
                }

                .config-status.pending {
                    background: #fef3c7;
                    color: #92400e;
                }

                .config-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .btn {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-primary {
                    background: #3b82f6;
                    color: white;
                }

                .btn-primary:hover {
                    background: #2563eb;
                }

                .btn-success {
                    background: #10b981;
                    color: white;
                }

                .btn-success:hover {
                    background: #059669;
                }

                .btn-secondary {
                    background: #6b7280;
                    color: white;
                }

                .btn-secondary:hover {
                    background: #4b5563;
                }

                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }

                .modal-dialog {
                    background: white;
                    border-radius: 12px;
                    max-width: 800px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-body {
                    padding: 1.5rem;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 2rem;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 0;
                    width: 2rem;
                    height: 2rem;
                }

                .close-btn:hover {
                    color: #1f2937;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 0.5rem;
                }

                .form-input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 0.875rem;
                }

                .form-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .help-section {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 2rem;
                }

                .help-section h3 {
                    color: #1f2937;
                    margin-bottom: 1rem;
                }

                .help-section ul {
                    margin-left: 1.5rem;
                }

                .help-section li {
                    margin-bottom: 0.5rem;
                    color: #4b5563;
                }

                .no-access {
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .no-access-icon {
                    font-size: 5rem;
                    margin-bottom: 1rem;
                }

                .spinner {
                    display: inline-block;
                    width: 1rem;
                    height: 1rem;
                    border: 2px solid #fff;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Dark Theme para Modal de Creación */
                #create-config-modal .modal-dialog {
                    background: #1f2937;
                    border: 1px solid #374151;
                }

                #create-config-modal .modal-header {
                    border-bottom: 1px solid #374151;
                }

                #create-config-modal .modal-header h3 {
                    color: #f9fafb;
                }

                #create-config-modal .close-btn {
                    color: #9ca3af;
                }

                #create-config-modal .close-btn:hover {
                    color: #f9fafb;
                }

                #create-config-modal .form-section h4 {
                    color: #f3f4f6;
                    border-bottom: 1px solid #374151;
                    padding-bottom: 0.5rem;
                    margin-bottom: 1rem;
                }

                #create-config-modal .form-section p {
                    color: #9ca3af;
                }

                #create-config-modal label {
                    color: #e5e7eb;
                    font-weight: 500;
                }

                #create-config-modal .form-control {
                    background: #374151;
                    border: 1px solid #4b5563;
                    color: #f9fafb;
                }

                #create-config-modal .form-control:focus {
                    background: #374151;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                    outline: none;
                }

                #create-config-modal .form-control::placeholder {
                    color: #6b7280;
                }

                #create-config-modal small {
                    color: #9ca3af;
                }

                #create-config-modal small a {
                    color: #60a5fa;
                    text-decoration: none;
                }

                #create-config-modal small a:hover {
                    color: #93c5fd;
                    text-decoration: underline;
                }

                #create-config-modal input[type="color"] {
                    background: #374151;
                    border: 1px solid #4b5563;
                    border-radius: 6px;
                    height: 2.5rem;
                    cursor: pointer;
                }

                /* Dark Theme para Modal de Edición */
                #edit-config-modal .modal-dialog {
                    background: #1f2937;
                    border: 1px solid #374151;
                }

                #edit-config-modal .modal-header {
                    border-bottom: 1px solid #374151;
                }

                #edit-config-modal .modal-header h3 {
                    color: #f9fafb;
                }

                #edit-config-modal .close-btn {
                    color: #9ca3af;
                }

                #edit-config-modal .close-btn:hover {
                    color: #f9fafb;
                }

                #edit-config-modal h3 {
                    color: #f9fafb;
                }

                #edit-config-modal h4 {
                    color: #f3f4f6 !important;
                    border-bottom: 1px solid #374151 !important;
                }

                #edit-config-modal p {
                    color: #9ca3af;
                }

                #edit-config-modal .form-label {
                    color: #e5e7eb;
                }

                #edit-config-modal .form-input {
                    background: #374151;
                    border: 1px solid #4b5563;
                    color: #f9fafb;
                }

                #edit-config-modal .form-input:focus {
                    background: #374151;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                }

                #edit-config-modal .form-input::placeholder {
                    color: #6b7280;
                }

                #edit-config-modal small {
                    color: #9ca3af !important;
                }

                #edit-config-modal small a {
                    color: #60a5fa;
                    text-decoration: none;
                }

                #edit-config-modal small a:hover {
                    color: #93c5fd;
                    text-decoration: underline;
                }

                #edit-config-modal select.form-input {
                    background: #374151;
                    border: 1px solid #4b5563;
                    color: #f9fafb;
                }

                #edit-config-modal select.form-input option {
                    background: #374151;
                    color: #f9fafb;
                }

                #edit-config-modal textarea.form-input {
                    background: #374151;
                    border: 1px solid #4b5563;
                    color: #f9fafb;
                }

                #edit-config-modal .btn-secondary {
                    background: #4b5563;
                    color: #f9fafb;
                    border: 1px solid #6b7280;
                }

                #edit-config-modal .btn-secondary:hover {
                    background: #6b7280;
                }
            </style>
        `;

        attachEventListeners();
    }

    function renderStats() {
        if (!stats) return '';

        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.total_configs || 0}</div>
                    <div class="stat-label">Total Emails</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.configs_with_credentials || 0}</div>
                    <div class="stat-label">Configurados</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.successful_tests || 0}</div>
                    <div class="stat-label">Tests OK</div>
                </div>
            </div>
        `;
    }

    function renderConfigsList() {
        return `
            <div style="margin-bottom: 2rem; display: flex; justify-content: flex-end;">
                <button class="btn btn-primary" onclick="AponntEmailConfigModule.openCreateModal()" style="display: flex; align-items: center; gap: 0.5rem;">
                    ➕ Crear Nuevo Tipo de Email
                </button>
            </div>
            ${allConfigs.length === 0 ? `
                <div style="text-align: center; padding: 3rem;">
                    <p style="color: #6b7280;">No hay configuraciones disponibles</p>
                    <p style="color: #9ca3af; font-size: 0.875rem;">Haz clic en "Crear Nuevo Tipo de Email" para comenzar</p>
                </div>
            ` : `
                <div class="configs-grid">
                    ${allConfigs.map(config => renderConfigCard(config)).join('')}
                </div>
            `}
        `;
    }

    function renderConfigCard(config) {
        const info = EMAIL_INFO[config.email_type] || { icon: '📧', color: '#6b7280', description: 'Email genérico' };

        let testStatus = 'pending';
        let testLabel = 'Sin probar';
        if (config.test_status === 'success') {
            testStatus = 'success';
            testLabel = '✅ Test OK';
        } else if (config.test_status === 'failed') {
            testStatus = 'failed';
            testLabel = '❌ Test falló';
        }

        const hasCredentials = config.smtp_password_masked || config.app_password_masked;

        return `
            <div class="config-card">
                <div class="config-card-header">
                    <div class="config-icon" style="color: ${info.color}">${info.icon}</div>
                    <div class="config-info">
                        <h3>${config.display_name}</h3>
                        <div class="config-email">${config.email_address}</div>
                    </div>
                </div>

                <div class="config-description">${info.description}</div>

                <div class="config-details">
                    <div class="config-detail-row">
                        <span class="config-detail-label">Servidor SMTP:</span>
                        <span class="config-detail-value">${config.smtp_host || 'No configurado'}:${config.smtp_port || 587}</span>
                    </div>
                    <div class="config-detail-row">
                        <span class="config-detail-label">Credenciales:</span>
                        <span class="config-detail-value">${hasCredentials ? '🔐 Configuradas' : '⚠️ No configuradas'}</span>
                    </div>
                    <div class="config-detail-row">
                        <span class="config-detail-label">Estado test:</span>
                        <span class="config-status ${testStatus}">${testLabel}</span>
                    </div>
                </div>

                <div class="config-actions">
                    <button class="btn btn-primary" onclick="AponntEmailConfigModule.editConfig('${config.email_type}')">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-success" onclick="AponntEmailConfigModule.testConnection('${config.email_type}')" ${!hasCredentials ? 'disabled' : ''}>
                        ✅ Test
                    </button>
                </div>
            </div>
        `;
    }

    function renderHelp() {
        return `
            <div class="help-section">
                <h3>📧 Guía de Configuración de Emails Gmail</h3>

                <h4>🔐 Paso 1: Habilitar Verificación en 2 Pasos</h4>
                <ol>
                    <li>Ir a <a href="https://myaccount.google.com/security" target="_blank">Configuración de seguridad de Google</a></li>
                    <li>Clic en "Verificación en 2 pasos"</li>
                    <li>Seguir las instrucciones para activarla</li>
                </ol>

                <h4>🔑 Paso 2: Generar Contraseña de Aplicación</h4>
                <ol>
                    <li>Ir a <a href="https://myaccount.google.com/apppasswords" target="_blank">Contraseñas de aplicaciones</a></li>
                    <li>Seleccionar "Correo" como app</li>
                    <li>Seleccionar "Otro (nombre personalizado)" como dispositivo</li>
                    <li>Escribir "Sistema Aponnt - [Nombre del email]"</li>
                    <li>Copiar la contraseña generada (16 caracteres sin espacios)</li>
                </ol>

                <h4>⚙️ Paso 3: Configurar en este Sistema</h4>
                <ol>
                    <li>Clic en "Editar" en la tarjeta del email</li>
                    <li>Ingresar la contraseña de aplicación en el campo "App Password"</li>
                    <li>Completar campos opcionales (teléfono, email de respaldo)</li>
                    <li>Clic en "Guardar"</li>
                    <li>Clic en "Test" para verificar la conexión</li>
                </ol>

                <h4>❓ Campos Importantes</h4>
                <ul>
                    <li><strong>App Password:</strong> Contraseña de aplicación de Gmail (16 caracteres)</li>
                    <li><strong>Recovery Phone:</strong> Teléfono para recuperación (opcional pero recomendado)</li>
                    <li><strong>Backup Email:</strong> Email alternativo de recuperación</li>
                    <li><strong>Notes:</strong> Notas adicionales sobre la configuración</li>
                </ul>

                <h4>Seguridad</h4>
                <ul>
                    <li>Todas las contrasenas se encriptan antes de guardarse en la base de datos</li>
                    <li>Todos los cambios quedan registrados en el historial de auditoria</li>
                    <li>Se recomienda cambiar las contrasenas cada 6 meses</li>
                </ul>
            </div>
        `;
    }

    function renderNoAccess() {
        // FUNCION OBSOLETA - Modulo ya no tiene restricciones
        console.log('[EMAIL-CONFIG] renderNoAccess llamado pero modulo es publico');
    }

    function renderError(message) {
        const container = document.getElementById('email-config-container');
        if (!container) return;
        container.innerHTML = `
            <div class="error-container" style="text-align: center; padding: 4rem 2rem;">
                <div class="error-icon" style="font-size: 5rem; margin-bottom: 1rem;">❌</div>
                <h2 style="color: #dc2626; margin-bottom: 1rem;">Error al cargar el módulo</h2>
                <p style="color: #6b7280; font-size: 1.1rem; margin-bottom: 1rem;">${message}</p>
                <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: #2563eb; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">
                    Recargar página
                </button>
            </div>
        `;
    }

    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================

    function attachEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                switchTab(tab);
            });
        });
    }

    function switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });

        // Load tab-specific data
        if (tabName === 'audit') {
            loadAuditLog();
        } else if (tabName === 'processes') {
            renderProcessesTable();
        } else if (tabName === 'workflows') {
            renderWorkflowsTable();
        }
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================

    async function editConfig(emailType) {
        try {
            showLoading('Cargando configuración...');

            const res = await apiCall(`/api/email-config/${emailType}`);
            currentConfig = res.config;

            renderEditModal();
            hideLoading();

        } catch (error) {
            hideLoading();
            showError('Error cargando configuración: ' + error.message);
        }
    }

    function renderEditModal() {
        if (!currentConfig) return;

        const info = EMAIL_INFO[currentConfig.email_type] || {};

        const modal = document.getElementById('edit-config-modal');
        const formContainer = document.getElementById('edit-config-form-container');

        // Detectar proveedor actual
        const currentProvider = detectProvider(currentConfig.smtp_host);

        formContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="font-size: 3rem; color: ${info.color}">${info.icon}</div>
                <div>
                    <h3>${currentConfig.display_name}</h3>
                    <p style="color: #6b7280; margin-top: 0.25rem;">${currentConfig.email_address}</p>
                </div>
            </div>

            <form id="edit-config-form">
                <!-- Información Básica -->
                <h4 style="color: #1f2937; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">📋 Información Básica</h4>

                <div class="form-group">
                    <label class="form-label">📧 Email Remitente (From Email)</label>
                    <input type="email" class="form-input" name="from_email" value="${currentConfig.from_email || ''}" required>
                    <small style="color: #6b7280;">Dirección de email que aparecerá como remitente</small>
                </div>

                <div class="form-group">
                    <label class="form-label">👤 Nombre Remitente (From Name)</label>
                    <input type="text" class="form-input" name="from_name" value="${currentConfig.from_name || ''}" required>
                    <small style="color: #6b7280;">Nombre que aparecerá como remitente (ej: "Aponnt Soporte")</small>
                </div>

                <div class="form-group">
                    <label class="form-label">↩️ Email de Respuesta (Reply-To) - Opcional</label>
                    <input type="email" class="form-input" name="reply_to" value="${currentConfig.reply_to || ''}" placeholder="respuestas@aponnt.com">
                    <small style="color: #6b7280;">Email donde llegarán las respuestas (dejar vacío para usar el mismo From Email)</small>
                </div>

                <div class="form-group">
                    <label class="form-label">📋 Copia Oculta (BCC) - Opcional</label>
                    <input type="email" class="form-input" name="bcc_email" value="${currentConfig.bcc_email || ''}" placeholder="copias@aponnt.com">
                    <small style="color: #6b7280;">Email que recibirá copia oculta de TODOS los emails enviados con esta configuración (para control/archivo)</small>
                </div>

                <!-- Configuración SMTP -->
                <h4 style="color: #1f2937; margin: 1.5rem 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">🔧 Configuración SMTP</h4>

                <div class="form-group">
                    <label class="form-label">🏢 Proveedor de Email</label>
                    <select class="form-input" id="smtp-provider-select" name="smtp_provider" onchange="AponntEmailConfigModule.onProviderChange(this.value)">
                        <option value="gmail" ${currentProvider === 'gmail' ? 'selected' : ''}>📧 Gmail / Google Workspace</option>
                        <option value="outlook" ${currentProvider === 'outlook' ? 'selected' : ''}>📨 Outlook.com / Hotmail</option>
                        <option value="office365" ${currentProvider === 'office365' ? 'selected' : ''}>🏢 Microsoft 365 / Office 365</option>
                        <option value="yahoo" ${currentProvider === 'yahoo' ? 'selected' : ''}>💌 Yahoo Mail</option>
                        <option value="custom" ${currentProvider === 'custom' ? 'selected' : ''}>⚙️ Servidor SMTP Personalizado</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">🖥️ Servidor SMTP (Host)</label>
                    <input type="text" class="form-input" id="smtp-host-input" name="smtp_host" value="${currentConfig.smtp_host || ''}" placeholder="smtp.gmail.com" required>
                </div>

                <div class="form-group">
                    <label class="form-label">🔌 Puerto SMTP</label>
                    <input type="number" class="form-input" id="smtp-port-input" name="smtp_port" value="${currentConfig.smtp_port || 587}" required>
                    <small style="color: #6b7280;">Común: 587 (TLS), 465 (SSL), 25 (sin encriptación)</small>
                </div>

                <div class="form-group">
                    <label class="form-label">🔐 Conexión Segura</label>
                    <select class="form-input" name="smtp_secure">
                        <option value="true" ${currentConfig.smtp_secure === true ? 'selected' : ''}>✅ TLS/SSL (Recomendado)</option>
                        <option value="false" ${currentConfig.smtp_secure === false ? 'selected' : ''}>⚠️ Sin encriptación</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">👤 Usuario SMTP</label>
                    <input type="text" class="form-input" name="smtp_user" value="${currentConfig.smtp_user || currentConfig.from_email || ''}" placeholder="usuario@gmail.com">
                    <small style="color: #6b7280;">Usuario para autenticación SMTP (generalmente el email completo)</small>
                </div>

                <!-- Contraseñas -->
                <h4 style="color: #1f2937; margin: 1.5rem 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">🔑 Credenciales</h4>

                <div id="gmail-password-section" style="${currentProvider === 'gmail' ? '' : 'display: none;'}">
                    <div class="form-group">
                        <label class="form-label">🔑 App Password (Gmail)</label>
                        <input type="password" class="form-input" name="app_password" placeholder="•••• •••• •••• ••••">
                        <small style="color: #6b7280;">
                            Contraseña de aplicación de Gmail (16 caracteres).
                            <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color: #3b82f6;">Generar aquí</a>
                        </small>
                        ${currentConfig.app_password_masked ? '<small style="display: block; color: #10b981; margin-top: 0.25rem;">✅ Contraseña configurada (dejar vacío para mantener)</small>' : ''}
                    </div>
                </div>

                <div id="standard-password-section" style="${currentProvider !== 'gmail' ? '' : 'display: none;'}">
                    <div class="form-group">
                        <label class="form-label">🔒 Contraseña SMTP</label>
                        <input type="password" class="form-input" name="smtp_password" placeholder="••••••••">
                        <small style="color: #6b7280;">Contraseña de la cuenta de email</small>
                        ${currentConfig.smtp_password_masked ? '<small style="display: block; color: #10b981; margin-top: 0.25rem;">✅ Contraseña configurada (dejar vacío para mantener)</small>' : ''}
                    </div>
                </div>

                <!-- Recuperación (Opcional) -->
                <h4 style="color: #1f2937; margin: 1.5rem 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb;">📞 Recuperación (Opcional)</h4>

                <div class="form-group">
                    <label class="form-label">📱 Teléfono de Recuperación</label>
                    <input type="tel" class="form-input" name="recovery_phone" value="${currentConfig.recovery_phone || ''}" placeholder="+54 9 11 1234-5678">
                </div>

                <div class="form-group">
                    <label class="form-label">📧 Email de Respaldo</label>
                    <input type="email" class="form-input" name="backup_email" value="${currentConfig.backup_email || ''}" placeholder="backup@example.com">
                </div>

                <div class="form-group">
                    <label class="form-label">📝 Notas</label>
                    <textarea class="form-input" name="notes" rows="3" placeholder="Notas adicionales sobre esta configuración...">${currentConfig.notes || ''}</textarea>
                </div>

                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="AponntEmailConfigModule.closeEditModal()">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        💾 Guardar Cambios
                    </button>
                </div>
            </form>
        `;

        // Attach form submit handler
        document.getElementById('edit-config-form').addEventListener('submit', handleSaveConfig);

        modal.style.display = 'flex';
    }

    function detectProvider(smtpHost) {
        if (!smtpHost) return 'gmail'; // Default
        if (smtpHost.includes('gmail.com') || smtpHost.includes('google.com')) return 'gmail';
        if (smtpHost.includes('outlook.com') || smtpHost.includes('hotmail.com')) return 'outlook';
        if (smtpHost.includes('office365.com') || smtpHost.includes('outlook.office365.com')) return 'office365';
        if (smtpHost.includes('yahoo.com')) return 'yahoo';
        return 'custom';
    }

    function onProviderChange(provider) {
        const hostInput = document.getElementById('smtp-host-input');
        const portInput = document.getElementById('smtp-port-input');
        const gmailSection = document.getElementById('gmail-password-section');
        const standardSection = document.getElementById('standard-password-section');

        const providers = {
            gmail: { host: 'smtp.gmail.com', port: 587 },
            outlook: { host: 'smtp-mail.outlook.com', port: 587 },
            office365: { host: 'smtp.office365.com', port: 587 },
            yahoo: { host: 'smtp.mail.yahoo.com', port: 587 },
            custom: { host: '', port: 587 }
        };

        if (providers[provider]) {
            hostInput.value = providers[provider].host;
            portInput.value = providers[provider].port;
        }

        // Mostrar/ocultar secciones de contraseña
        if (provider === 'gmail') {
            gmailSection.style.display = 'block';
            standardSection.style.display = 'none';
        } else {
            gmailSection.style.display = 'none';
            standardSection.style.display = 'block';
        }
    }

    function onCreateProviderChange(provider) {
        const hostInput = document.getElementById('create-smtp-host');
        const portInput = document.getElementById('create-smtp-port');
        const gmailSection = document.getElementById('create-gmail-password-section');
        const standardSection = document.getElementById('create-standard-password-section');

        const providers = {
            gmail: { host: 'smtp.gmail.com', port: 587 },
            outlook: { host: 'smtp-mail.outlook.com', port: 587 },
            office365: { host: 'smtp.office365.com', port: 587 },
            yahoo: { host: 'smtp.mail.yahoo.com', port: 587 },
            custom: { host: '', port: 587 }
        };

        if (providers[provider]) {
            hostInput.value = providers[provider].host;
            portInput.value = providers[provider].port;
        }

        // Mostrar/ocultar secciones de contraseña
        if (provider === 'gmail') {
            gmailSection.style.display = 'block';
            standardSection.style.display = 'none';
        } else {
            gmailSection.style.display = 'none';
            standardSection.style.display = 'block';
        }
    }

    function closeEditModal() {
        const modal = document.getElementById('edit-config-modal');
        modal.style.display = 'none';
        currentConfig = null;
    }

    async function handleSaveConfig(e) {
        e.preventDefault();

        try {
            const formData = new FormData(e.target);
            const updates = {};

            for (const [key, value] of formData.entries()) {
                if (value && value !== '') {
                    updates[key] = value;
                }
            }

            showLoading('Guardando configuración...');

            await apiCall(`/api/email-config/${currentConfig.email_type}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });

            hideLoading();
            showSuccess('Configuración actualizada exitosamente');

            closeEditModal();
            await loadAllData();
            render();

        } catch (error) {
            hideLoading();
            showError('Error guardando configuración: ' + error.message);
        }
    }

    async function testConnection(emailType) {
        try {
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Testeando...';

            const res = await apiCall(`/api/email-config/${emailType}/test`, {
                method: 'POST'
            });

            if (res.success) {
                showSuccess('✅ Test exitoso. Email de prueba enviado.');
            } else {
                showError('❌ Test falló: ' + res.message);
            }

            // Recargar datos para actualizar estado de test
            await loadAllData();
            render();

        } catch (error) {
            showError('Error testeando conexión: ' + error.message);
        }
    }

    async function loadAuditLog() {
        try {
            const container = document.getElementById('audit-container');
            container.innerHTML = '<p style="text-align: center; padding: 2rem;">Cargando historial...</p>';

            const res = await apiCall('/api/email-config/audit/all?limit=100');
            const logs = res.logs || [];

            if (logs.length === 0) {
                container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6b7280;">No hay registros de auditoría</p>';
                return;
            }

            container.innerHTML = `
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f9fafb;">
                            <tr>
                                <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Fecha</th>
                                <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Email</th>
                                <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Acción</th>
                                <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Usuario</th>
                                <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb;">Cambios</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr style="border-bottom: 1px solid #f3f4f6;">
                                    <td style="padding: 1rem; font-size: 0.85rem;">${formatDate(log.changed_at)}</td>
                                    <td style="padding: 1rem; font-size: 0.85rem; color: #3b82f6;">${log.email_type}</td>
                                    <td style="padding: 1rem; font-size: 0.85rem;">${log.action}</td>
                                    <td style="padding: 1rem; font-size: 0.85rem;">${log.changed_by_name || 'Sistema'}</td>
                                    <td style="padding: 1rem; font-size: 0.75rem; color: #6b7280; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${JSON.stringify(log.changes || {})}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error cargando audit log:', error);
            const container = document.getElementById('audit-container');
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #dc2626;">Error cargando historial</p>';
        }
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    async function apiCall(url, options = {}) {
        // Buscar token de staff de Aponnt (panel-administrativo) o token normal (panel-empresa)
        // Buscar en localStorage Y sessionStorage (como admin-panel-controller)
        const token = window.getMultiKeyToken() || localStorage.getItem('token') || sessionStorage.getItem('token');

        // VALIDACIÓN DE TOKEN DESHABILITADA - Módulo público
        // if (!token) {
        //     throw new Error('No hay sesión activa. Por favor, inicie sesión como staff de Aponnt.');
        // }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Error en la petición');
        }

        return data;
    }

    function showLoading(message = 'Cargando...') {
        // Implementar según tu sistema de loading global
        console.log('⏳', message);
    }

    function hideLoading() {
        // Implementar según tu sistema de loading global
        console.log('✅ Loading oculto');
    }

    function showSuccess(message) {
        alert('✅ ' + message);
    }

    function showError(message) {
        alert('❌ ' + message);
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // =========================================================================
    // ASIGNACIÓN DE PROCESOS
    // =========================================================================

    function renderProcessesTable() {
        const container = document.getElementById('processes-container');
        if (!container) return;

        container.innerHTML = `
            <div class="processes-section">
                <!-- Header con stats -->
                <div class="processes-header">
                    <div>
                        <h2>Asignación de Emails a Procesos del Sistema</h2>
                        <p class="text-muted">Configura qué email gestiona cada tipo de notificación/proceso</p>
                    </div>
                    ${renderProcessStats()}
                </div>

                <!-- Buscador y filtros -->
                <div class="processes-filters">
                    <input
                        type="text"
                        id="process-search"
                        class="search-input"
                        placeholder="🔍 Buscar proceso..."
                        value="${searchTerm}"
                    />
                    <select id="module-filter" class="filter-select">
                        <option value="all">Todos los módulos</option>
                        ${getUniqueModules().map(module => `
                            <option value="${module}" ${selectedModule === module ? 'selected' : ''}>
                                ${formatModuleName(module)}
                            </option>
                        `).join('')}
                    </select>
                    <button class="btn btn-primary" onclick="AponntEmailConfigModule.saveAllMappings()">
                        💾 Guardar Cambios
                    </button>
                </div>

                <!-- Tabla de procesos -->
                <div class="processes-table-container">
                    ${renderProcessesTableContent()}
                </div>
            </div>

            <style>
                .processes-section {
                    padding: 1rem;
                }

                .processes-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid #e5e7eb;
                }

                .processes-header h2 {
                    font-size: 1.5rem;
                    color: #1f2937;
                    margin-bottom: 0.25rem;
                }

                .processes-filters {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    align-items: center;
                }

                .search-input {
                    flex: 1;
                    padding: 0.75rem 1rem;
                    border: 2px solid #d1d5db;
                    border-radius: 0.5rem;
                    font-size: 0.95rem;
                }

                .search-input:focus {
                    outline: none;
                    border-color: #2563eb;
                }

                .filter-select {
                    padding: 0.75rem 1rem;
                    border: 2px solid #d1d5db;
                    border-radius: 0.5rem;
                    font-size: 0.95rem;
                    min-width: 200px;
                }

                .processes-table-container {
                    background: white;
                    border-radius: 0.5rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    overflow: hidden;
                }

                .processes-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .processes-table th {
                    background: #f9fafb;
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: #374151;
                    border-bottom: 2px solid #e5e7eb;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .processes-table td {
                    padding: 1rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .processes-table tr:hover {
                    background: #f9fafb;
                }

                .process-name {
                    font-weight: 500;
                    color: #1f2937;
                }

                .process-module {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    background: #e0e7ff;
                    color: #3730a3;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .process-priority {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .priority-critical {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .priority-high {
                    background: #fed7aa;
                    color: #ea580c;
                }

                .priority-medium {
                    background: #fef3c7;
                    color: #d97706;
                }

                .priority-low {
                    background: #dbeafe;
                    color: #2563eb;
                }

                .email-select {
                    padding: 0.5rem;
                    border: 2px solid #d1d5db;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    width: 100%;
                    max-width: 250px;
                }

                .email-select:focus {
                    outline: none;
                    border-color: #2563eb;
                }

                .email-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .status-tested {
                    color: #16a34a;
                }

                .status-untested {
                    color: #ea580c;
                }

                .status-missing {
                    color: #dc2626;
                }

                .process-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                }

                .stat-card-small {
                    background: white;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    border-left: 4px solid;
                }

                .stat-card-small.success {
                    border-color: #16a34a;
                }

                .stat-card-small.warning {
                    border-color: #ea580c;
                }

                .stat-card-small.danger {
                    border-color: #dc2626;
                }

                .stat-card-small .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                }

                .stat-card-small .stat-label {
                    font-size: 0.75rem;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .no-results {
                    padding: 3rem;
                    text-align: center;
                    color: #6b7280;
                }
            </style>
        `;

        // Attach event listeners
        document.getElementById('process-search')?.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            filterProcesses();
        });

        document.getElementById('module-filter')?.addEventListener('change', (e) => {
            selectedModule = e.target.value;
            filterProcesses();
        });
    }

    function renderProcessStats() {
        if (!processStats) return '';

        const total = parseInt(processStats.total_processes) || 0;
        const mapped = parseInt(processStats.processes_with_email) || 0;
        const unmapped = parseInt(processStats.processes_without_email) || 0;
        const critical = parseInt(processStats.critical_unmapped) || 0;

        const percentage = total > 0 ? Math.round((mapped / total) * 100) : 0;

        return `
            <div class="process-stats-grid">
                <div class="stat-card-small success">
                    <div class="stat-value">${mapped}/${total}</div>
                    <div class="stat-label">Procesos configurados (${percentage}%)</div>
                </div>
                <div class="stat-card-small ${unmapped > 0 ? 'warning' : 'success'}">
                    <div class="stat-value">${unmapped}</div>
                    <div class="stat-label">Pendientes de asignar</div>
                </div>
                <div class="stat-card-small ${critical > 0 ? 'danger' : 'success'}">
                    <div class="stat-value">${critical}</div>
                    <div class="stat-label">Críticos sin email</div>
                </div>
            </div>
        `;
    }

    function renderProcessesTableContent() {
        if (filteredProcesses.length === 0) {
            return `
                <div class="no-results">
                    <p>No se encontraron procesos con los filtros aplicados</p>
                </div>
            `;
        }

        return `
            <table class="processes-table">
                <thead>
                    <tr>
                        <th style="width: 35%">Proceso</th>
                        <th style="width: 15%">Módulo</th>
                        <th style="width: 10%">Prioridad</th>
                        <th style="width: 25%">Email Asignado</th>
                        <th style="width: 15%">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredProcesses.map(process => renderProcessRow(process)).join('')}
                </tbody>
            </table>
        `;
    }

    function renderProcessRow(process) {
        const priorityClass = `priority-${process.priority}`;
        const emailOptions = getEmailOptions(process.email_type);
        const status = getProcessStatus(process);

        return `
            <tr>
                <td>
                    <div class="process-name">${process.process_name}</div>
                    ${process.description ? `<div class="text-muted" style="font-size: 0.75rem; margin-top: 0.25rem;">${process.description}</div>` : ''}
                </td>
                <td>
                    <span class="process-module">${formatModuleName(process.module)}</span>
                </td>
                <td>
                    <span class="process-priority ${priorityClass}">${formatPriority(process.priority)}</span>
                </td>
                <td>
                    <select
                        class="email-select"
                        data-process-key="${process.process_key}"
                        onchange="AponntEmailConfigModule.onEmailChange(this)"
                    >
                        <option value="">-- Sin asignar --</option>
                        ${emailOptions}
                    </select>
                </td>
                <td>
                    <div class="email-status ${status.class}">
                        ${status.icon} ${status.label}
                    </div>
                </td>
            </tr>
        `;
    }

    function getEmailOptions(currentEmailType) {
        return allConfigs.map(config => {
            const selected = config.email_type === currentEmailType ? 'selected' : '';
            const disabled = config.test_status !== 'success' ? 'disabled' : '';
            const info = EMAIL_INFO[config.email_type] || {};

            return `
                <option value="${config.email_type}" ${selected} ${disabled}>
                    ${info.icon || '📧'} ${config.display_name}
                    ${config.test_status !== 'success' ? ' (Sin probar)' : ''}
                </option>
            `;
        }).join('');
    }

    function getProcessStatus(process) {
        if (!process.email_type) {
            return {
                class: 'status-missing',
                icon: '❌',
                label: 'Sin asignar'
            };
        }

        if (process.email_test_status === 'success') {
            return {
                class: 'status-tested',
                icon: '✅',
                label: 'Probado'
            };
        }

        if (process.email_test_status === 'failed') {
            return {
                class: 'status-untested',
                icon: '⚠️',
                label: 'Test falló'
            };
        }

        return {
            class: 'status-untested',
            icon: '⚠️',
            label: 'Sin probar'
        };
    }

    function getUniqueModules() {
        const modules = new Set(allProcesses.map(p => p.module));
        return Array.from(modules).sort();
    }

    function formatModuleName(module) {
        const names = {
            'support': '🎧 Soporte',
            'medical': '🏥 Médico',
            'legal': '⚖️ Legal',
            'hse': '🦺 HSE',
            'commercial': '💼 Comercial',
            'onboarding': '🎉 Onboarding',
            'billing': '💰 Facturación',
            'attendance': '📋 Asistencia',
            'vacation': '🏖️ Vacaciones',
            'payroll': '💵 Liquidaciones',
            'staff': '👥 Staff Interno',
            'engineering': '🔧 Ingeniería',
            'platform': '📢 Plataforma',
            'security': '🔐 Seguridad',
            'alerts': '🚨 Alertas'
        };
        return names[module] || module;
    }

    function formatPriority(priority) {
        const names = {
            'critical': '🔴 Crítico',
            'high': '🟠 Alto',
            'medium': '🟡 Medio',
            'low': '🔵 Bajo'
        };
        return names[priority] || priority;
    }

    function filterProcesses() {
        filteredProcesses = allProcesses.filter(process => {
            // Filtro por búsqueda
            const matchesSearch = !searchTerm ||
                process.process_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                process.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                process.process_key.toLowerCase().includes(searchTerm.toLowerCase());

            // Filtro por módulo
            const matchesModule = selectedModule === 'all' || process.module === selectedModule;

            return matchesSearch && matchesModule;
        });

        renderProcessesTable();
    }

    function onEmailChange(selectElement) {
        console.log('[EMAIL-CONFIG] Email cambiado:', selectElement.dataset.processKey, '→', selectElement.value);
        // Los cambios se guardan en batch al hacer click en "Guardar Cambios"
    }

    async function saveAllMappings() {
        try {
            showLoading('Guardando asignaciones...');

            // Obtener todos los selects
            const selects = document.querySelectorAll('.email-select');
            const mappings = [];

            selects.forEach(select => {
                const processKey = select.dataset.processKey;
                const emailType = select.value || null;

                // Solo incluir si cambió
                const original = allProcesses.find(p => p.process_key === processKey);
                if (original && original.email_type !== emailType) {
                    mappings.push({ processKey, emailType });
                }
            });

            if (mappings.length === 0) {
                hideLoading();
                showInfo('No hay cambios para guardar');
                return;
            }

            console.log(`[EMAIL-CONFIG] Guardando ${mappings.length} cambios...`);

            const result = await apiCall('/api/email-config/processes/batch', 'POST', { mappings });

            hideLoading();

            if (result.success) {
                showSuccess(`✅ ${result.result.success} mapeos actualizados correctamente`);

                if (result.result.failed > 0) {
                    console.error('[EMAIL-CONFIG] Errores:', result.result.errors);
                    showError(`⚠️ ${result.result.failed} mapeos fallaron`);
                }

                // Recargar datos
                await loadAllData();
                renderProcessesTable();
            } else {
                throw new Error(result.message || 'Error desconocido');
            }

        } catch (error) {
            hideLoading();
            showError('Error guardando asignaciones: ' + error.message);
        }
    }

    // =========================================================================
    // WORKFLOWS DE NOTIFICACIONES
    // =========================================================================

    function renderWorkflowsTable() {
        const container = document.getElementById('workflows-container');
        if (!container) return;

        const scopeCounts = {
            aponnt: allWorkflows.filter(w => w.scope === 'aponnt').length,
            company: allWorkflows.filter(w => w.scope === 'company').length
        };

        const moduleCounts = {};
        allWorkflows.forEach(w => {
            if (!moduleCounts[w.module]) moduleCounts[w.module] = 0;
            moduleCounts[w.module]++;
        });

        container.innerHTML = `
            <div class="workflows-section">
                <!-- Header -->
                <div class="workflows-header">
                    <div>
                        <h2>🔔 Workflows de Notificaciones Multi-Canal</h2>
                        <p class="text-muted">Sistema SSOT para gestionar todos los workflows de notificación (Email, WhatsApp, SMS, Push)</p>
                    </div>
                    <div class="workflows-stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${allWorkflows.length}</div>
                            <div class="stat-label">Total Workflows</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${scopeCounts.aponnt}</div>
                            <div class="stat-label">Aponnt (Global)</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${scopeCounts.company}</div>
                            <div class="stat-label">Empresas (Multi-tenant)</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${allWorkflows.filter(w => w.requires_response).length}</div>
                            <div class="stat-label">Con Respuesta</div>
                        </div>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="workflows-filters">
                    <select id="workflow-scope-filter" class="filter-select">
                        <option value="all">Todos los Scopes</option>
                        <option value="aponnt">🌐 Aponnt (Global) - ${scopeCounts.aponnt}</option>
                        <option value="company">🏢 Empresa (Multi-tenant) - ${scopeCounts.company}</option>
                    </select>
                    <select id="workflow-module-filter" class="filter-select">
                        <option value="all">Todos los Módulos</option>
                        ${Object.keys(moduleCounts).sort().map(module => `
                            <option value="${module}">${module} (${moduleCounts[module]})</option>
                        `).join('')}
                    </select>
                    <input
                        type="text"
                        id="workflow-search"
                        class="search-input"
                        placeholder="🔍 Buscar workflow..."
                    />
                </div>

                <!-- Tabla de workflows -->
                <div class="workflows-table-wrapper">
                    <table class="workflows-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Proceso</th>
                                <th>Módulo</th>
                                <th>Scope</th>
                                <th>Prioridad</th>
                                <th>Canales</th>
                                <th>Respuesta</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="workflows-table-body">
                            ${renderWorkflowsTableBody(allWorkflows)}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>
                .workflows-section {
                    padding: 1.5rem;
                }

                .workflows-header {
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 2px solid #e5e7eb;
                }

                .workflows-header h2 {
                    font-size: 1.75rem;
                    color: #1f2937;
                    margin-bottom: 0.5rem;
                }

                .workflows-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .workflows-filters {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }

                .workflows-filters .search-input {
                    flex: 1;
                }

                .workflows-table-wrapper {
                    background: white;
                    border-radius: 0.5rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    overflow-x: auto;
                }

                .workflows-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .workflows-table thead {
                    background: #f9fafb;
                }

                .workflows-table th {
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: #374151;
                    border-bottom: 2px solid #e5e7eb;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .workflows-table tbody tr {
                    border-bottom: 1px solid #f3f4f6;
                    transition: background 0.15s;
                }

                .workflows-table tbody tr:hover {
                    background: #f9fafb;
                }

                .workflows-table td {
                    padding: 1rem;
                    color: #1f2937;
                }

                .workflow-name {
                    font-weight: 600;
                    color: #1f2937;
                }

                .workflow-key {
                    font-size: 0.75rem;
                    color: #6b7280;
                    font-family: monospace;
                }

                .scope-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .scope-badge.aponnt {
                    background: #dbeafe;
                    color: #1e40af;
                }

                .scope-badge.company {
                    background: #dcfce7;
                    color: #166534;
                }

                .priority-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .priority-badge.critical {
                    background: #fee2e2;
                    color: #991b1b;
                }

                .priority-badge.high {
                    background: #fed7aa;
                    color: #9a3412;
                }

                .priority-badge.medium {
                    background: #fef3c7;
                    color: #92400e;
                }

                .priority-badge.low {
                    background: #e0e7ff;
                    color: #3730a3;
                }

                .channels-list {
                    display: flex;
                    gap: 0.25rem;
                    flex-wrap: wrap;
                }

                .channel-badge {
                    padding: 0.15rem 0.5rem;
                    background: #f3f4f6;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                }

                .response-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .btn-view {
                    padding: 0.4rem 0.8rem;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: background 0.15s;
                }

                .btn-view:hover {
                    background: #1d4ed8;
                }
            </style>
        `;

        // Agregar event listeners de filtros
        document.getElementById('workflow-scope-filter')?.addEventListener('change', filterWorkflows);
        document.getElementById('workflow-module-filter')?.addEventListener('change', filterWorkflows);
        document.getElementById('workflow-search')?.addEventListener('input', filterWorkflows);
    }

    function renderWorkflowsTableBody(workflows) {
        if (workflows.length === 0) {
            return `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 3rem; color: #6b7280;">
                        No hay workflows que coincidan con los filtros
                    </td>
                </tr>
            `;
        }

        return workflows.map(w => {
            const channels = Array.isArray(w.channels) ? w.channels : JSON.parse(w.channels || '[]');

            return `
                <tr>
                    <td style="font-family: monospace; font-size: 0.875rem;">#${w.id}</td>
                    <td>
                        <div class="workflow-name">${w.process_name}</div>
                        <div class="workflow-key">${w.process_key}</div>
                    </td>
                    <td><span style="font-weight: 500; color: #4b5563;">${w.module}</span></td>
                    <td><span class="scope-badge ${w.scope}">${w.scope === 'aponnt' ? '🌐 Aponnt' : '🏢 Empresa'}</span></td>
                    <td><span class="priority-badge ${w.priority}">${w.priority || 'medium'}</span></td>
                    <td>
                        <div class="channels-list">
                            ${channels.map(ch => `<span class="channel-badge">${ch}</span>`).join('')}
                        </div>
                    </td>
                    <td>
                        <div class="response-indicator">
                            ${w.requires_response ?
                                `<span style="color: #059669;">✓ ${w.response_type || 'SI/NO'}</span>` :
                                `<span style="color: #6b7280;">-</span>`
                            }
                        </div>
                    </td>
                    <td>${w.is_active ? '<span style="color: #059669;">●</span> Activo' : '<span style="color: #dc2626;">●</span> Inactivo'}</td>
                    <td>
                        <button class="btn-view" onclick="alert('Ver detalles workflow #${w.id}')">Ver</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function filterWorkflows() {
        const scopeFilter = document.getElementById('workflow-scope-filter')?.value || 'all';
        const moduleFilter = document.getElementById('workflow-module-filter')?.value || 'all';
        const searchTerm = document.getElementById('workflow-search')?.value.toLowerCase() || '';

        filteredWorkflows = allWorkflows.filter(w => {
            const matchesScope = scopeFilter === 'all' || w.scope === scopeFilter;
            const matchesModule = moduleFilter === 'all' || w.module === moduleFilter;
            const matchesSearch = !searchTerm ||
                w.process_name.toLowerCase().includes(searchTerm) ||
                w.process_key.toLowerCase().includes(searchTerm) ||
                w.module.toLowerCase().includes(searchTerm);

            return matchesScope && matchesModule && matchesSearch;
        });

        // Re-render table body
        const tbody = document.getElementById('workflows-table-body');
        if (tbody) {
            tbody.innerHTML = renderWorkflowsTableBody(filteredWorkflows);
        }
    }

    // =========================================================================
    // MODAL DE CREACIÓN
    // =========================================================================

    function openCreateModal() {
        const modal = document.getElementById('create-config-modal');
        if (modal) {
            modal.style.display = 'flex';

            // Sincronizar color picker con input
            const colorPicker = document.getElementById('create-color-picker');
            const colorInput = document.getElementById('create-color');

            colorPicker.addEventListener('input', (e) => {
                colorInput.value = e.target.value;
            });

            colorInput.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    colorPicker.value = e.target.value;
                }
            });
        }
    }

    function closeCreateModal() {
        const modal = document.getElementById('create-config-modal');
        if (modal) {
            modal.style.display = 'none';

            // Limpiar formulario
            document.getElementById('create-email-type').value = '';
            document.getElementById('create-display-name').value = '';
            document.getElementById('create-icon').value = '📧';
            document.getElementById('create-color').value = '#6b7280';
            document.getElementById('create-color-picker').value = '#6b7280';
            document.getElementById('create-description').value = '';
            document.getElementById('create-from-email').value = '';
            document.getElementById('create-from-name').value = '';
        }
    }

    async function submitCreate() {
        try {
            // Obtener valores del formulario
            const emailType = document.getElementById('create-email-type').value.trim().toLowerCase();
            const displayName = document.getElementById('create-display-name').value.trim();
            const icon = document.getElementById('create-icon').value.trim() || '📧';
            const color = document.getElementById('create-color').value.trim() || '#6b7280';
            const description = document.getElementById('create-description').value.trim();
            const fromEmail = document.getElementById('create-from-email').value.trim();
            const fromName = document.getElementById('create-from-name').value.trim();

            // Validación
            if (!emailType) {
                alert('El tipo de email es requerido');
                return;
            }

            if (!displayName) {
                alert('El nombre para mostrar es requerido');
                return;
            }

            // Validar formato de emailType (solo minúsculas, números y guiones)
            if (!/^[a-z0-9-]+$/.test(emailType)) {
                alert('El tipo de email solo puede contener minúsculas, números y guiones');
                return;
            }

            // Confirmar
            if (!confirm(`¿Crear nuevo tipo de email "${displayName}" con ID "${emailType}"?`)) {
                return;
            }

            // Enviar al backend
            const response = await apiCall('/api/email-config', {
                method: 'POST',
                body: JSON.stringify({
                    emailType,
                    displayName,
                    icon,
                    color,
                    description,
                    fromEmail: fromEmail || null,
                    fromName: fromName || null
                })
            });

            if (response.success) {
                alert(`✅ Tipo de email "${displayName}" creado exitosamente`);
                closeCreateModal();

                // Recargar datos
                await loadAllData();
                render();
            } else {
                alert(`❌ Error: ${response.message || response.error}`);
            }

        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error creando email type:', error);
            alert(`❌ Error creando tipo de email: ${error.message}`);
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        init,
        editConfig,
        closeEditModal,
        testConnection,
        onEmailChange,
        saveAllMappings,
        // Funciones del modal de creación
        openCreateModal,
        closeCreateModal,
        submitCreate,
        // Funciones de cambio de proveedor SMTP
        onProviderChange,
        onCreateProviderChange
    };
})();

// Exportar explícitamente al objeto window
window.AponntEmailConfigModule = AponntEmailConfigModule;

console.log('✅ [EMAIL-CONFIG] Módulo cargado y exportado a window');

// Auto-init si estamos en la página correcta
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.hash === '#aponnt-email-config' ||
            window.location.pathname.includes('aponnt-email-config')) {
            AponntEmailConfigModule.init();
        }
    });
} else {
    if (window.location.hash === '#aponnt-email-config' ||
        window.location.pathname.includes('aponnt-email-config')) {
        AponntEmailConfigModule.init();
    }
}
