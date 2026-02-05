/**
 * ============================================================================
 * COMPANY EMAIL SMTP CONFIG MODULE - Configuración SMTP para Empresas
 * ============================================================================
 *
 * Permite a las empresas configurar sus credenciales SMTP para envío de emails
 * con soporte UNIVERSAL para cualquier proveedor (Gmail, Outlook, Office365,
 * Yahoo, servidores personalizados, etc.)
 *
 * ============================================================================
 */

var CompanyEmailSMTPConfigModule = window.CompanyEmailSMTPConfigModule || (function() {
    'use strict';

    // =========================================================================
    // ESTADO DEL MÓDULO
    // =========================================================================

    let state = {
        config: null,          // Configuración SMTP actual
        loading: false,
        error: null,
        isEditing: false
    };

    let currentProvider = 'gmail'; // Proveedor por defecto

    // =========================================================================
    // PROVEEDORES SMTP
    // =========================================================================

    const SMTP_PROVIDERS = {
        gmail: {
            name: '📧 Gmail / Google Workspace',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            help: 'Requiere App Password. Generar en: https://myaccount.google.com/apppasswords'
        },
        outlook: {
            name: '📨 Outlook.com / Hotmail',
            host: 'smtp-mail.outlook.com',
            port: 587,
            secure: false,
            help: 'Usa la contraseña de tu cuenta de Outlook'
        },
        office365: {
            name: '🏢 Microsoft 365 / Office 365',
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            help: 'Usa las credenciales de tu cuenta corporativa'
        },
        yahoo: {
            name: '💌 Yahoo Mail',
            host: 'smtp.mail.yahoo.com',
            port: 587,
            secure: false,
            help: 'Requiere App Password. Generar en configuración de seguridad'
        },
        custom: {
            name: '⚙️ Servidor SMTP Personalizado',
            host: '',
            port: 587,
            secure: false,
            help: 'Configuración manual para cualquier servidor SMTP'
        }
    };

    // =========================================================================
    // API CALLS
    // =========================================================================

    async function apiCall(url, options = {}) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) {
            throw new Error('No hay sesión activa');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Error en la petición');
        }

        return data;
    }

    async function loadConfig() {
        try {
            state.loading = true;
            state.error = null;
            render();

            // Obtener company_id del token decodificado
            const token = localStorage.getItem('authToken') || localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!token) {
                throw new Error('No hay sesión activa. Por favor inicie sesión nuevamente.');
            }
            const payload = JSON.parse(atob(token.split('.')[1]));
            const companyId = payload.company_id;

            const response = await apiCall(`/api/email/config/company/${companyId}`);

            state.config = response.data || response.config || null;
            state.loading = false;
            render();

            // Si no hay configuración, abrir el modal de configuración automáticamente
            if (!state.config) {
                console.log('📧 [SMTP] Sin configuración existente, abriendo formulario...');
                setTimeout(() => openConfigModal(), 300);
            }

        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
            state.loading = false;
            // Si es un 404 o "no hay configuración", no es un error real
            if (error.message && error.message.includes('No hay configuración')) {
                state.config = null;
                render();
                setTimeout(() => openConfigModal(), 300);
            } else {
                state.error = error.message;
                render();
            }
        }
    }

    async function saveConfig(formData) {
        try {
            state.loading = true;
            render();

            // Obtener company_id del token
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const payload = JSON.parse(atob(token.split('.')[1]));
            const companyId = payload.company_id;

            const data = {
                company_id: companyId,
                institutional_email: formData.get('institutional_email'),
                display_name: formData.get('display_name'),
                smtp_host: formData.get('smtp_host'),
                smtp_port: parseInt(formData.get('smtp_port')),
                smtp_user: formData.get('smtp_user'),
                smtp_password: formData.get('smtp_password') || formData.get('app_password'),
                smtp_secure: formData.get('smtp_secure') === 'on',
                daily_limit: parseInt(formData.get('daily_limit')) || 500,
                monthly_limit: parseInt(formData.get('monthly_limit')) || 10000
            };

            await apiCall('/api/email/config/company', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            state.loading = false;
            closeConfigModal();
            loadConfig(); // Recargar

            showNotification('✅ Configuración SMTP guardada exitosamente', 'success');

        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
            state.loading = false;
            closeConfigModal();
            showNotification(`❌ Error: ${error.message}`, 'error');
        }
    }

    async function testSMTP() {
        try {
            const form = document.getElementById('smtp-config-form');
            const formData = new FormData(form);

            showNotification('🔄 Probando conexión SMTP...', 'info');

            const data = {
                smtp_host: formData.get('smtp_host'),
                smtp_port: parseInt(formData.get('smtp_port')),
                smtp_user: formData.get('smtp_user'),
                smtp_password: formData.get('smtp_password') || formData.get('app_password'),
                from_email: formData.get('institutional_email'),
                display_name: formData.get('display_name'),
                test_recipient_email: formData.get('test_email')
            };

            const response = await apiCall('/api/email/config/validate', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                showNotification('✅ Conexión SMTP exitosa! Email de prueba enviado.', 'success');
            }

        } catch (error) {
            console.error('❌ Error probando SMTP:', error);
            showNotification(`❌ Error en prueba SMTP: ${error.message}`, 'error');
        }
    }

    // =========================================================================
    // FUNCIONES DE UI
    // =========================================================================

    function openConfigModal() {
        state.isEditing = true;

        // Detectar proveedor actual si hay config
        if (state.config) {
            currentProvider = detectProvider(state.config.smtp_host);
        }

        renderModal();

        const modal = document.getElementById('smtp-config-modal');
        modal.style.display = 'flex';
    }

    function closeConfigModal() {
        state.isEditing = false;
        const modal = document.getElementById('smtp-config-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function detectProvider(smtpHost) {
        if (!smtpHost) return 'gmail';
        if (smtpHost.includes('gmail.com') || smtpHost.includes('google.com')) return 'gmail';
        if (smtpHost.includes('outlook.com') || smtpHost.includes('hotmail.com')) return 'outlook';
        if (smtpHost.includes('office365.com')) return 'office365';
        if (smtpHost.includes('yahoo.com')) return 'yahoo';
        return 'custom';
    }

    function onProviderChange(provider) {
        currentProvider = provider;
        const providerConfig = SMTP_PROVIDERS[provider];

        // Auto-fill campos
        document.getElementById('smtp-host').value = providerConfig.host;
        document.getElementById('smtp-port').value = providerConfig.port;
        document.getElementById('smtp-secure').checked = providerConfig.secure;

        // Mostrar/ocultar secciones de password
        const gmailSection = document.getElementById('gmail-password-section');
        const standardSection = document.getElementById('standard-password-section');
        const helpText = document.getElementById('provider-help-text');

        if (provider === 'gmail') {
            gmailSection.style.display = 'block';
            standardSection.style.display = 'none';
        } else {
            gmailSection.style.display = 'none';
            standardSection.style.display = 'block';
        }

        helpText.textContent = providerConfig.help;
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // =========================================================================
    // RENDERIZADO
    // =========================================================================

    function render() {
        const container = document.getElementById('company-email-smtp-config-module');
        if (!container) return;

        if (state.loading) {
            container.innerHTML = renderLoading();
            return;
        }

        if (state.error) {
            container.innerHTML = renderError();
            return;
        }

        container.innerHTML = `
            <div class="smtp-config-module">
                ${renderHeader()}
                ${renderCurrentConfig()}
                ${renderModal()}
            </div>

            ${renderStyles()}
        `;
    }

    function renderLoading() {
        return `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Cargando configuración SMTP...</p>
            </div>
        `;
    }

    function renderError() {
        return `
            <div class="error-container">
                <div class="error-icon">❌</div>
                <h3>Error al cargar configuración</h3>
                <p>${state.error}</p>
                <button class="btn btn-primary" onclick="CompanyEmailSMTPConfigModule.init()">
                    Reintentar
                </button>
            </div>
        `;
    }

    function renderHeader() {
        return `
            <div class="module-header">
                <div>
                    <h1>📧 Configuración SMTP de Empresa</h1>
                    <p class="module-subtitle">Configure sus credenciales para envío de emails</p>
                </div>
                <button class="btn btn-primary" onclick="CompanyEmailSMTPConfigModule.openConfigModal()">
                    ${state.config ? '✏️ Editar Configuración' : '➕ Configurar Email'}
                </button>
            </div>
        `;
    }

    function renderCurrentConfig() {
        if (!state.config) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📧</div>
                    <h3>Sin configuración SMTP</h3>
                    <p>Configure las credenciales SMTP de su empresa para comenzar a enviar emails.</p>
                    <button class="btn btn-primary" onclick="CompanyEmailSMTPConfigModule.openConfigModal()">
                        Configurar Ahora
                    </button>
                </div>
            `;
        }

        const provider = detectProvider(state.config.smtp_host);
        const providerName = SMTP_PROVIDERS[provider]?.name || 'Personalizado';

        return `
            <div class="current-config-card">
                <div class="config-header">
                    <div>
                        <h3>Configuración Actual</h3>
                        <div class="status-badge status-active">✅ Activo</div>
                    </div>
                    <button class="btn btn-secondary" onclick="CompanyEmailSMTPConfigModule.testExistingConfig()">
                        🔍 Probar Conexión
                    </button>
                </div>

                <div class="config-details">
                    <div class="config-row">
                        <span class="config-label">Email Institucional:</span>
                        <span class="config-value">${state.config.institutional_email}</span>
                    </div>
                    <div class="config-row">
                        <span class="config-label">Nombre para Mostrar:</span>
                        <span class="config-value">${state.config.display_name}</span>
                    </div>
                    <div class="config-row">
                        <span class="config-label">Proveedor:</span>
                        <span class="config-value">${providerName}</span>
                    </div>
                    <div class="config-row">
                        <span class="config-label">Servidor SMTP:</span>
                        <span class="config-value">${state.config.smtp_host}:${state.config.smtp_port}</span>
                    </div>
                    <div class="config-row">
                        <span class="config-label">Usuario SMTP:</span>
                        <span class="config-value">${state.config.smtp_user}</span>
                    </div>
                    <div class="config-row">
                        <span class="config-label">Conexión Segura:</span>
                        <span class="config-value">${state.config.smtp_secure ? '🔐 Sí (TLS/SSL)' : '⚠️ No'}</span>
                    </div>
                    <div class="config-row">
                        <span class="config-label">Límite Diario:</span>
                        <span class="config-value">${state.config.daily_limit || 500} emails</span>
                    </div>
                    <div class="config-row">
                        <span class="config-label">Límite Mensual:</span>
                        <span class="config-value">${state.config.monthly_limit || 10000} emails</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderModal() {
        const isGmail = currentProvider === 'gmail';
        const config = state.config || {};

        return `
            <div id="smtp-config-modal" class="modal" style="display: none;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>${config.institutional_email ? '✏️ Editar' : '➕ Crear'} Configuración SMTP</h3>
                            <button class="close-btn" onclick="CompanyEmailSMTPConfigModule.closeConfigModal()">×</button>
                        </div>
                        <div class="modal-body">
                            <form id="smtp-config-form" onsubmit="CompanyEmailSMTPConfigModule.handleSubmit(event); return false;">

                                <!-- Información Básica -->
                                <div class="form-section">
                                    <h4>📧 Información del Email</h4>

                                    <div class="form-group">
                                        <label>Email Institucional <span class="required">*</span></label>
                                        <input type="email" name="institutional_email" id="institutional-email" class="form-control"
                                               value="${config.institutional_email || ''}"
                                               placeholder="contacto@miempresa.com" required>
                                    </div>

                                    <div class="form-group">
                                        <label>Nombre para Mostrar <span class="required">*</span></label>
                                        <input type="text" name="display_name" class="form-control"
                                               value="${config.display_name || ''}"
                                               placeholder="Mi Empresa - Sistema de Asistencia" required>
                                    </div>
                                </div>

                                <!-- Configuración SMTP -->
                                <div class="form-section">
                                    <h4>🏢 Proveedor de Email</h4>

                                    <div class="form-group">
                                        <label>Seleccione su Proveedor</label>
                                        <select class="form-control" id="smtp-provider" onchange="CompanyEmailSMTPConfigModule.onProviderChange(this.value)" style="background:#1e293b;color:#e2e8f0;">
                                            ${Object.keys(SMTP_PROVIDERS).map(key => `
                                                <option value="${key}" ${currentProvider === key ? 'selected' : ''} style="background:#1e293b;color:#e2e8f0;">
                                                    ${SMTP_PROVIDERS[key].name}
                                                </option>
                                            `).join('')}
                                        </select>
                                        <small id="provider-help-text" class="help-text">${SMTP_PROVIDERS[currentProvider].help}</small>
                                    </div>

                                    <div class="form-row">
                                        <div class="form-group form-col-70">
                                            <label>🖥️ Servidor SMTP (Host) <span class="required">*</span></label>
                                            <input type="text" name="smtp_host" id="smtp-host" class="form-control"
                                                   value="${config.smtp_host || SMTP_PROVIDERS[currentProvider].host}" required>
                                        </div>
                                        <div class="form-group form-col-30">
                                            <label>🔌 Puerto <span class="required">*</span></label>
                                            <input type="number" name="smtp_port" id="smtp-port" class="form-control"
                                                   value="${config.smtp_port || SMTP_PROVIDERS[currentProvider].port}" required>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label>👤 Usuario SMTP <span class="required">*</span></label>
                                        <input type="text" name="smtp_user" class="form-control"
                                               value="${config.smtp_user || ''}"
                                               placeholder="usuario@gmail.com" required>
                                        <small class="help-text">Generalmente es la dirección de email completa</small>
                                    </div>

                                    <!-- Password para Gmail (App Password) -->
                                    <div id="gmail-password-section" style="${isGmail ? '' : 'display: none;'}">
                                        <div class="form-group">
                                            <label>🔑 App Password (Gmail) <span class="required">*</span></label>
                                            <input type="password" name="app_password" class="form-control"
                                                   placeholder="•••• •••• •••• ••••">
                                            <small class="help-text">
                                                Contraseña de aplicación de Gmail (16 caracteres).
                                                <a href="https://myaccount.google.com/apppasswords" target="_blank">Generar aquí</a>
                                            </small>
                                        </div>
                                    </div>

                                    <!-- Password estándar (otros proveedores) -->
                                    <div id="standard-password-section" style="${!isGmail ? '' : 'display: none;'}">
                                        <div class="form-group">
                                            <label>🔒 Contraseña SMTP <span class="required">*</span></label>
                                            <input type="password" name="smtp_password" class="form-control"
                                                   placeholder="••••••••">
                                            <small class="help-text">Contraseña de la cuenta de email</small>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" name="smtp_secure" id="smtp-secure"
                                                   ${config.smtp_secure !== false ? 'checked' : ''}>
                                            <span>🔐 Usar conexión segura (TLS/SSL)</span>
                                        </label>
                                        <small class="help-text">Recomendado para mayor seguridad</small>
                                    </div>
                                </div>

                                <!-- Límites -->
                                <div class="form-section">
                                    <h4>📊 Límites de Envío</h4>

                                    <div class="form-row">
                                        <div class="form-group form-col-50">
                                            <label>Límite Diario</label>
                                            <input type="number" name="daily_limit" class="form-control"
                                                   value="${config.daily_limit || 500}" min="1">
                                        </div>
                                        <div class="form-group form-col-50">
                                            <label>Límite Mensual</label>
                                            <input type="number" name="monthly_limit" class="form-control"
                                                   value="${config.monthly_limit || 10000}" min="1">
                                        </div>
                                    </div>
                                </div>

                                <!-- Email de Prueba -->
                                <div class="form-section">
                                    <h4>🔍 Prueba de Conexión (Opcional)</h4>

                                    <div class="form-group">
                                        <label>Email de Prueba</label>
                                        <input type="email" name="test_email" class="form-control"
                                               placeholder="tu-email@example.com">
                                        <small class="help-text">Se enviará un email de prueba a esta dirección</small>
                                    </div>
                                </div>

                                <!-- Botones -->
                                <div class="form-actions">
                                    <button type="button" class="btn btn-secondary" onclick="CompanyEmailSMTPConfigModule.closeConfigModal()">
                                        Cancelar
                                    </button>
                                    <button type="button" class="btn btn-info" onclick="CompanyEmailSMTPConfigModule.testSMTP()">
                                        🔍 Probar Conexión
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        💾 Guardar Configuración
                                    </button>
                                </div>

                                <!-- Guía detallada de App Passwords -->
                                <div style="margin-top: 2rem; padding: 20px; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 10px;">
                                    <h4 style="color: #c4b5fd; margin: 0 0 15px 0; font-size: 1rem;">📖 Guía: Cómo obtener App Password / Contraseña de Aplicación</h4>
                                    <p style="color: #94a3b8; font-size: 12px; margin-bottom: 15px;">La mayoría de proveedores requieren una <strong style="color:#e2e8f0;">contraseña de aplicación</strong> en vez de tu contraseña normal. Seguí estos pasos según tu proveedor:</p>

                                    <!-- Gmail -->
                                    <div style="margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border-left: 3px solid #ea4335;">
                                        <h5 style="color: #fca5a5; margin: 0 0 8px 0; font-size: 13px;">📧 Gmail / Google Workspace</h5>
                                        <ol style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 12px; line-height: 1.8;">
                                            <li>Ingresá a <a href="https://myaccount.google.com/security" target="_blank" style="color:#60a5fa;">myaccount.google.com/security</a></li>
                                            <li>Activá la <strong style="color:#e2e8f0;">Verificación en 2 pasos</strong> (obligatorio)</li>
                                            <li>Volvé a Seguridad → buscá <strong style="color:#e2e8f0;">"Contraseñas de aplicación"</strong></li>
                                            <li>O ingresá directo a: <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:#60a5fa;">myaccount.google.com/apppasswords</a></li>
                                            <li>Seleccioná "Otro" → escribí "Aponnt SMTP" → click "Generar"</li>
                                            <li>Copiá la contraseña de 16 caracteres (ej: <code style="color:#a78bfa;background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px;">abcd efgh ijkl mnop</code>)</li>
                                            <li>Pegala en el campo "App Password" de arriba (sin espacios)</li>
                                        </ol>
                                        <p style="color:#6b7280; font-size: 11px; margin: 6px 0 0 0;">SMTP: smtp.gmail.com | Puerto: 587 | TLS: Sí</p>
                                    </div>

                                    <!-- Outlook / Hotmail -->
                                    <div style="margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border-left: 3px solid #0078d4;">
                                        <h5 style="color: #93c5fd; margin: 0 0 8px 0; font-size: 13px;">📨 Outlook.com / Hotmail</h5>
                                        <ol style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 12px; line-height: 1.8;">
                                            <li>Ingresá a <a href="https://account.live.com/proofs/Manage" target="_blank" style="color:#60a5fa;">account.live.com/proofs/Manage</a></li>
                                            <li>Activá la <strong style="color:#e2e8f0;">Verificación en 2 pasos</strong></li>
                                            <li>Volvé a Seguridad → <strong style="color:#e2e8f0;">"Contraseñas de aplicación"</strong></li>
                                            <li>Click en "Crear una nueva contraseña de aplicación"</li>
                                            <li>Copiá la contraseña generada y usala en el campo de arriba</li>
                                        </ol>
                                        <p style="color:#6b7280; font-size: 11px; margin: 6px 0 0 0;">SMTP: smtp-mail.outlook.com | Puerto: 587 | TLS: Sí</p>
                                    </div>

                                    <!-- Office 365 -->
                                    <div style="margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border-left: 3px solid #d83b01;">
                                        <h5 style="color: #fdba74; margin: 0 0 8px 0; font-size: 13px;">🏢 Microsoft 365 / Office 365</h5>
                                        <ol style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 12px; line-height: 1.8;">
                                            <li>Ingresá a <a href="https://portal.office.com/account" target="_blank" style="color:#60a5fa;">portal.office.com/account</a></li>
                                            <li>Ir a <strong style="color:#e2e8f0;">Seguridad → Contraseñas de aplicación</strong></li>
                                            <li>Si no aparece, tu admin debe habilitar "App Passwords" en Azure AD</li>
                                            <li>Creá una nueva contraseña y usala en el campo SMTP Password</li>
                                        </ol>
                                        <p style="color:#6b7280; font-size: 11px; margin: 6px 0 0 0;">SMTP: smtp.office365.com | Puerto: 587 | TLS: Sí</p>
                                    </div>

                                    <!-- Yahoo -->
                                    <div style="margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border-left: 3px solid #720e9e;">
                                        <h5 style="color: #d8b4fe; margin: 0 0 8px 0; font-size: 13px;">💌 Yahoo Mail</h5>
                                        <ol style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 12px; line-height: 1.8;">
                                            <li>Ingresá a <a href="https://login.yahoo.com/account/security" target="_blank" style="color:#60a5fa;">login.yahoo.com/account/security</a></li>
                                            <li>Activá la <strong style="color:#e2e8f0;">Verificación en 2 pasos</strong></li>
                                            <li>Luego volvé y buscá <strong style="color:#e2e8f0;">"Generar contraseña de aplicación"</strong></li>
                                            <li>Seleccioná "Otra app" → escribí "Aponnt" → Generar</li>
                                            <li>Copiá la contraseña y usala en el campo de arriba</li>
                                        </ol>
                                        <p style="color:#6b7280; font-size: 11px; margin: 6px 0 0 0;">SMTP: smtp.mail.yahoo.com | Puerto: 587 | TLS: Sí</p>
                                    </div>

                                    <!-- Zoho -->
                                    <div style="margin-bottom: 15px; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border-left: 3px solid #e8443a;">
                                        <h5 style="color: #fca5a5; margin: 0 0 8px 0; font-size: 13px;">🔷 Zoho Mail</h5>
                                        <ol style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 12px; line-height: 1.8;">
                                            <li>Ingresá a <a href="https://accounts.zoho.com/home#security/security_pwd" target="_blank" style="color:#60a5fa;">accounts.zoho.com → Seguridad</a></li>
                                            <li>Buscá <strong style="color:#e2e8f0;">"Contraseñas específicas de aplicación"</strong></li>
                                            <li>Generá una nueva con nombre "Aponnt SMTP"</li>
                                            <li>Copiá y pegá en el campo de contraseña</li>
                                        </ol>
                                        <p style="color:#6b7280; font-size: 11px; margin: 6px 0 0 0;">SMTP: smtp.zoho.com | Puerto: 587 | TLS: Sí</p>
                                    </div>

                                    <!-- Custom -->
                                    <div style="padding: 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border-left: 3px solid #10b981;">
                                        <h5 style="color: #6ee7b7; margin: 0 0 8px 0; font-size: 13px;">⚙️ Servidor SMTP Personalizado (GoDaddy, cPanel, etc.)</h5>
                                        <ul style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 12px; line-height: 1.8;">
                                            <li>Consultá con tu proveedor de hosting por los datos SMTP</li>
                                            <li>Generalmente: <code style="color:#a78bfa;background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px;">mail.tudominio.com</code> o <code style="color:#a78bfa;background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px;">smtp.tudominio.com</code></li>
                                            <li>Puerto habitual: <strong style="color:#e2e8f0;">587</strong> (TLS) o <strong style="color:#e2e8f0;">465</strong> (SSL)</li>
                                            <li>Usuario: tu email completo (ej: <code style="color:#a78bfa;background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px;">info@tuempresa.com</code>)</li>
                                            <li>Contraseña: la misma del webmail o la que configuraste en cPanel</li>
                                        </ul>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderStyles() {
        return `
            <style>
                .smtp-config-module {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .module-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid rgba(99,102,241,0.2);
                }

                .module-header h1 {
                    font-size: 2rem;
                    color: #e2e8f0;
                    margin-bottom: 0.5rem;
                }

                .module-subtitle {
                    font-size: 1rem;
                    color: #94a3b8;
                }

                .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: rgba(255,255,255,0.03);
                    border: 1px dashed rgba(99,102,241,0.3);
                    border-radius: 12px;
                }

                .empty-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }

                .empty-state h3 {
                    font-size: 1.5rem;
                    color: #e2e8f0;
                    margin-bottom: 0.5rem;
                }

                .empty-state p {
                    color: #94a3b8;
                    margin-bottom: 1.5rem;
                }

                .current-config-card {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(99,102,241,0.2);
                    border-radius: 12px;
                    padding: 2rem;
                }

                .config-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }

                .config-header h3 {
                    font-size: 1.25rem;
                    color: #e2e8f0;
                    margin-bottom: 0.5rem;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .status-active {
                    background: #d1fae5;
                    color: #065f46;
                }

                .config-details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .config-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }

                .config-label {
                    color: #94a3b8;
                    font-size: 0.875rem;
                }

                .config-value {
                    color: #e2e8f0;
                    font-weight: 500;
                }

                /* Modal */
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    overflow-y: auto;
                }

                .modal-dialog {
                    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
                    border: 1px solid rgba(99,102,241,0.3);
                    border-radius: 12px;
                    max-width: 800px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    margin: 2rem auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                }

                .modal-content {
                    color: #f9fafb;
                }

                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid rgba(99,102,241,0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1));
                }

                .modal-header h3 {
                    font-size: 1.5rem;
                    color: #e2e8f0;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 2rem;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 0;
                    width: 2rem;
                    height: 2rem;
                    line-height: 1;
                }

                .close-btn:hover {
                    color: #f9fafb;
                }

                .modal-body {
                    padding: 1.5rem;
                }

                /* Forms */
                .form-section {
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }

                .form-section:last-of-type {
                    border-bottom: none;
                }

                .form-section h4 {
                    font-size: 1.125rem;
                    color: #c4b5fd;
                    margin-bottom: 1rem;
                }

                .form-group {
                    margin-bottom: 1rem;
                }

                .form-group label {
                    display: block;
                    font-size: 0.875rem;
                    color: #e5e7eb;
                    margin-bottom: 0.5rem;
                }

                .required {
                    color: #ef4444;
                }

                .form-control {
                    width: 100%;
                    padding: 0.75rem;
                    background: #1e293b;
                    border: 1px solid #4b5563;
                    border-radius: 6px;
                    color: #e2e8f0;
                    font-size: 0.875rem;
                }

                .smtp-config-module select.form-control,
                .modal select.form-control {
                    background: #1e293b;
                    color: #e2e8f0;
                }

                .smtp-config-module select.form-control option,
                .modal select.form-control option {
                    background: #1e293b;
                    color: #e2e8f0;
                }

                .form-control:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                }

                .form-control::placeholder {
                    color: #6b7280;
                }

                .help-text {
                    display: block;
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 0.25rem;
                }

                .help-text a {
                    color: #3b82f6;
                    text-decoration: none;
                }

                .help-text a:hover {
                    text-decoration: underline;
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                }

                .checkbox-label input[type="checkbox"] {
                    width: 1.25rem;
                    height: 1.25rem;
                    cursor: pointer;
                }

                .form-row {
                    display: flex;
                    gap: 1rem;
                }

                .form-col-30 {
                    flex: 0 0 30%;
                }

                .form-col-50 {
                    flex: 0 0 50%;
                }

                .form-col-70 {
                    flex: 0 0 70%;
                }

                .form-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    margin-top: 2rem;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255,255,255,0.08);
                }

                /* Buttons */
                .btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #4f46e5, #6366f1);
                    color: white;
                    border: 1px solid rgba(99,102,241,0.5);
                }

                .btn-primary:hover {
                    background: linear-gradient(135deg, #4338ca, #4f46e5);
                    box-shadow: 0 4px 15px rgba(99,102,241,0.3);
                }

                .btn-secondary {
                    background: rgba(255,255,255,0.1);
                    color: #e2e8f0;
                    border: 1px solid rgba(255,255,255,0.15);
                }

                .btn-secondary:hover {
                    background: rgba(255,255,255,0.15);
                }

                .btn-info {
                    background: linear-gradient(135deg, #0891b2, #06b6d4);
                    color: white;
                    border: 1px solid rgba(6,182,212,0.5);
                }

                .btn-info:hover {
                    background: linear-gradient(135deg, #0e7490, #0891b2);
                    box-shadow: 0 4px 15px rgba(6,182,212,0.3);
                }

                /* Loading */
                .loading-container {
                    text-align: center;
                    padding: 4rem;
                    color: #e2e8f0;
                }

                .spinner {
                    width: 3rem;
                    height: 3rem;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-top-color: #6366f1;
                    border-radius: 50%;
                    margin: 0 auto 1rem;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                /* Error */
                .error-container {
                    text-align: center;
                    padding: 4rem;
                    background: rgba(239,68,68,0.05);
                    border: 1px solid rgba(239,68,68,0.2);
                    border-radius: 12px;
                }

                .error-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }

                .error-container h3 {
                    font-size: 1.5rem;
                    color: #fca5a5;
                    margin-bottom: 0.5rem;
                }

                .error-container p {
                    color: #94a3b8;
                    margin-bottom: 1.5rem;
                }
            </style>
        `;
    }

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    function handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        saveConfig(formData);
    }

    async function testExistingConfig() {
        if (!state.config) return;

        showNotification('🔄 Probando conexión con configuración actual...', 'info');

        try {
            const data = {
                smtp_host: state.config.smtp_host,
                smtp_port: state.config.smtp_port,
                smtp_user: state.config.smtp_user,
                smtp_password: state.config.smtp_password,
                from_email: state.config.institutional_email,
                display_name: state.config.display_name
            };

            const response = await apiCall('/api/email/config/validate', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                showNotification('✅ Conexión SMTP exitosa!', 'success');
            }
        } catch (error) {
            showNotification(`❌ Error: ${error.message}`, 'error');
        }
    }

    // =========================================================================
    // INIT
    // =========================================================================

    function init() {
        console.log('[COMPANY-EMAIL-SMTP-CONFIG] Inicializando módulo...');

        const container = document.getElementById('company-email-smtp-config-module');
        if (!container) {
            console.error('❌ No se encontró el contenedor del módulo');
            return;
        }

        loadConfig();
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        init,
        openConfigModal,
        closeConfigModal,
        onProviderChange,
        handleSubmit,
        testSMTP,
        testExistingConfig
    };

})();

// Exportar al objeto window
window.CompanyEmailSMTPConfigModule = CompanyEmailSMTPConfigModule;

console.log('✅ [COMPANY-EMAIL-SMTP-CONFIG] Módulo cargado y exportado a window');
