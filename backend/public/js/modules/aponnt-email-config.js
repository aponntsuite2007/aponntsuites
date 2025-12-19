/**
 * ============================================================================
 * APONNT EMAIL CONFIG MODULE - Configuración de Emails de Aponnt
 * ============================================================================
 *
 * Módulo para gestionar las configuraciones SMTP de todos los emails de Aponnt.
 *
 * ACCESO:
 * - Solo GG (Gerente General) y SUPERADMIN
 *
 * FEATURES:
 * - CRUD de configuraciones de email
 * - Test de conexión SMTP
 * - Passwords encriptados
 * - Historial de auditoría
 * - Estadísticas
 *
 * ============================================================================
 */

const AponntEmailConfigModule = (() => {
    let currentConfig = null;
    let allConfigs = [];
    let stats = null;

    // Mapeo de email types a info visual
    const EMAIL_INFO = {
        commercial: {
            icon: '💼',
            color: '#2563eb',
            description: 'Ventas, leads, reuniones comerciales'
        },
        partners: {
            icon: '🤝',
            color: '#7c3aed',
            description: 'Partners externos (médicos, legales, HSE)'
        },
        staff: {
            icon: '👥',
            color: '#059669',
            description: 'Comunicaciones internas staff Aponnt'
        },
        support: {
            icon: '🎧',
            color: '#dc2626',
            description: 'Soporte técnico a empresas'
        },
        engineering: {
            icon: '🔧',
            color: '#ea580c',
            description: 'Ingeniería y desarrollo'
        },
        executive: {
            icon: '👔',
            color: '#4f46e5',
            description: 'Suite ejecutiva (jefes/gerentes)'
        },
        institutional: {
            icon: '🏢',
            color: '#0891b2',
            description: 'Institucional público'
        },
        billing: {
            icon: '💰',
            color: '#16a34a',
            description: 'Facturación y cobranzas'
        },
        onboarding: {
            icon: '🎉',
            color: '#c026d3',
            description: 'Alta de empresas (bienvenida)'
        },
        transactional: {
            icon: '📧',
            color: '#64748b',
            description: 'Emails transaccionales generales'
        },
        escalation: {
            icon: '🚨',
            color: '#dc2626',
            description: 'Escalamientos críticos'
        }
    };

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    async function init() {
        console.log('📧 [EMAIL-CONFIG] Inicializando módulo de configuración de emails...');

        try {
            // Validar permisos (solo GG/SUPERADMIN)
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const staffRole = user.role_code || user.role || user.roleCode;

            if (staffRole !== 'GG' && staffRole !== 'SUPERADMIN') {
                showError('Acceso denegado: solo GG/SUPERADMIN puede acceder a este módulo');
                return renderNoAccess();
            }

            await loadAllData();
            render();

            console.log('✅ [EMAIL-CONFIG] Módulo inicializado correctamente');
        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error inicializando:', error);
            showError('Error inicializando módulo: ' + error.message);
        }
    }

    async function loadAllData() {
        try {
            // Cargar configs y stats en paralelo
            const [configsRes, statsRes] = await Promise.all([
                apiCall('/api/email-config'),
                apiCall('/api/email-config/stats')
            ]);

            allConfigs = configsRes.configs || [];
            stats = statsRes.stats || {};

            console.log(`✅ [EMAIL-CONFIG] Cargadas ${allConfigs.length} configuraciones`);
        } catch (error) {
            console.error('❌ [EMAIL-CONFIG] Error cargando datos:', error);
            throw error;
        }
    }

    // =========================================================================
    // RENDER
    // =========================================================================

    function render() {
        const container = document.getElementById('content-area');
        if (!container) {
            console.error('❌ [EMAIL-CONFIG] Container #content-area no encontrado');
            return;
        }

        container.innerHTML = `
            <div class="email-config-module">
                <!-- Header -->
                <div class="module-header">
                    <div>
                        <h1>
                            📧 Configuración de Emails Aponnt
                            <span class="badge badge-danger">SOLO GG/SUPERADMIN</span>
                        </h1>
                        <p class="text-muted">
                            Gestión centralizada de credenciales SMTP y configuración de emails institucionales
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
        if (allConfigs.length === 0) {
            return `
                <div style="text-align: center; padding: 3rem;">
                    <p style="color: #6b7280;">No hay configuraciones disponibles</p>
                </div>
            `;
        }

        return `
            <div class="configs-grid">
                ${allConfigs.map(config => renderConfigCard(config)).join('')}
            </div>
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

                <h4>🔒 Seguridad</h4>
                <ul>
                    <li>Todas las contraseñas se encriptan antes de guardarse en la base de datos</li>
                    <li>Solo GG y SUPERADMIN pueden ver y modificar estas configuraciones</li>
                    <li>Todos los cambios quedan registrados en el historial de auditoría</li>
                    <li>Se recomienda cambiar las contraseñas cada 6 meses</li>
                </ul>
            </div>
        `;
    }

    function renderNoAccess() {
        const container = document.getElementById('content-area');
        container.innerHTML = `
            <div class="no-access">
                <div class="no-access-icon">🔒</div>
                <h2>Acceso Denegado</h2>
                <p>Solo Gerente General (GG) y SUPERADMIN pueden acceder a este módulo.</p>
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

        formContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="font-size: 3rem; color: ${info.color}">${info.icon}</div>
                <div>
                    <h3>${currentConfig.display_name}</h3>
                    <p style="color: #6b7280; margin-top: 0.25rem;">${currentConfig.email_address}</p>
                </div>
            </div>

            <form id="edit-config-form">
                <div class="form-group">
                    <label class="form-label">📧 Email Address</label>
                    <input type="email" class="form-input" name="email_address" value="${currentConfig.email_address || ''}" required>
                </div>

                <div class="form-group">
                    <label class="form-label">👤 Display Name</label>
                    <input type="text" class="form-input" name="display_name" value="${currentConfig.display_name || ''}" required>
                </div>

                <div class="form-group">
                    <label class="form-label">🔑 App Password (Gmail)</label>
                    <input type="password" class="form-input" name="app_password" placeholder="••••••••" value="${currentConfig.app_password_masked === '••••••••' ? '' : ''}">
                    <small style="color: #6b7280;">Contraseña de aplicación de Gmail (dejar vacío para no cambiar)</small>
                </div>

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
        const token = localStorage.getItem('token');

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
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
    // PUBLIC API
    // =========================================================================

    return {
        init,
        editConfig,
        closeEditModal,
        testConnection
    };
})();

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
