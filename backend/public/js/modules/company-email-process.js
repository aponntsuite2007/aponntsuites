/**
 * ============================================================================
 * COMPANY EMAIL PROCESS MODULE - Asignación de Emails a Procesos de Notificación
 * ============================================================================
 *
 * Sistema multi-tenant para que cada empresa asigne sus emails configurados
 * a procesos específicos de notificación.
 *
 * LÓGICA ESPECIAL:
 * - Primer email → Auto-asigna TODOS los procesos 'company' automáticamente
 * - Emails siguientes → Asignación manual por el administrador
 *
 * ============================================================================
 */

const CompanyEmailProcessModule = (function() {
    'use strict';

    // =========================================================================
    // ESTADO DEL MÓDULO
    // =========================================================================

    let state = {
        emailConfigs: [],      // Emails configurados de la empresa
        mappings: [],          // Mapeos email→proceso actuales
        unassigned: [],        // Procesos sin asignar
        stats: null,           // Estadísticas de cobertura
        isFirstEmail: false,   // ¿Es el primer email de la empresa?
        loading: false,
        error: null
    };

    // =========================================================================
    // API CALLS
    // =========================================================================

    async function apiCall(url, options = {}) {
        const token = localStorage.getItem('token');
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

    /**
     * Cargar emails de la empresa (desde company_email_config)
     */
    async function loadCompanyEmails() {
        try {
            console.log('[COMPANY-EMAIL-PROCESS] Cargando emails de la empresa...');
            const response = await apiCall('/api/company-email-config');

            state.emailConfigs = response.configs || [];
            console.log(`✅ ${state.emailConfigs.length} emails cargados`);
        } catch (error) {
            console.error('❌ Error cargando emails:', error);
            state.error = error.message;
            throw error;
        }
    }

    /**
     * Cargar mapeos actuales (qué email está asignado a qué proceso)
     */
    async function loadMappings() {
        try {
            console.log('[COMPANY-EMAIL-PROCESS] Cargando mapeos...');
            const response = await apiCall('/api/company-email-process/mappings');

            state.mappings = response.mappings || [];
            console.log(`✅ ${state.mappings.length} mapeos cargados`);
        } catch (error) {
            console.error('❌ Error cargando mapeos:', error);
            state.error = error.message;
            throw error;
        }
    }

    /**
     * Cargar procesos sin asignar
     */
    async function loadUnassigned() {
        try {
            console.log('[COMPANY-EMAIL-PROCESS] Cargando procesos sin asignar...');
            const response = await apiCall('/api/company-email-process/unassigned');

            state.unassigned = response.unassigned || [];
            console.log(`✅ ${state.unassigned.length} procesos sin asignar`);
        } catch (error) {
            console.error('❌ Error cargando procesos sin asignar:', error);
            state.error = error.message;
            throw error;
        }
    }

    /**
     * Cargar estadísticas de cobertura
     */
    async function loadStats() {
        try {
            console.log('[COMPANY-EMAIL-PROCESS] Cargando estadísticas...');
            const response = await apiCall('/api/company-email-process/stats');

            state.stats = response.stats || null;
            console.log(`✅ Estadísticas: ${state.stats.assigned}/${state.stats.total_processes} asignados`);
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            state.error = error.message;
            throw error;
        }
    }

    /**
     * Verificar si es el primer email de la empresa
     */
    async function checkFirstEmail() {
        try {
            console.log('[COMPANY-EMAIL-PROCESS] Verificando si es primer email...');
            const response = await apiCall('/api/company-email-process/check-first-email');

            state.isFirstEmail = response.isFirstEmail || false;
            console.log(`✅ Es primer email: ${state.isFirstEmail}`);
        } catch (error) {
            console.error('❌ Error verificando primer email:', error);
            state.error = error.message;
            throw error;
        }
    }

    /**
     * Asignar un email a un proceso específico
     */
    async function assignEmailToProcess(emailConfigId, processKey) {
        try {
            console.log(`[COMPANY-EMAIL-PROCESS] Asignando ${processKey} → ${emailConfigId}...`);

            const response = await apiCall('/api/company-email-process/assign', {
                method: 'POST',
                body: JSON.stringify({ emailConfigId, processKey })
            });

            console.log(`✅ ${response.message}`);
            return response;
        } catch (error) {
            console.error('❌ Error asignando proceso:', error);
            throw error;
        }
    }

    /**
     * Auto-asignar TODOS los procesos al primer email
     */
    async function autoAssignAll(emailConfigId) {
        try {
            console.log(`[COMPANY-EMAIL-PROCESS] Auto-asignando todos los procesos a ${emailConfigId}...`);

            const response = await apiCall('/api/company-email-process/auto-assign', {
                method: 'POST',
                body: JSON.stringify({ emailConfigId })
            });

            console.log(`✅ ${response.message}`);
            return response;
        } catch (error) {
            console.error('❌ Error en auto-asignación:', error);
            throw error;
        }
    }

    /**
     * Des-asignar un proceso (marcar como inactivo)
     */
    async function unassignProcess(processKey) {
        try {
            console.log(`[COMPANY-EMAIL-PROCESS] Des-asignando ${processKey}...`);

            const response = await apiCall('/api/company-email-process/unassign', {
                method: 'DELETE',
                body: JSON.stringify({ processKey })
            });

            console.log(`✅ ${response.message}`);
            return response;
        } catch (error) {
            console.error('❌ Error des-asignando proceso:', error);
            throw error;
        }
    }

    // =========================================================================
    // CARGA DE DATOS
    // =========================================================================

    async function loadAllData() {
        state.loading = true;
        state.error = null;
        render();

        try {
            await Promise.all([
                loadCompanyEmails(),
                loadMappings(),
                loadUnassigned(),
                loadStats(),
                checkFirstEmail()
            ]);

            state.loading = false;
            render();

        } catch (error) {
            state.loading = false;
            state.error = error.message;
            render();
        }
    }

    // =========================================================================
    // RENDERIZADO
    // =========================================================================

    function render() {
        const container = document.getElementById('company-email-process-module');
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
            <div class="email-process-module">
                ${renderHeader()}
                ${renderStats()}
                ${renderEmailConfigs()}
                ${renderMappings()}
                ${renderUnassigned()}
            </div>

            <style>
                .email-process-module {
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
                    border-bottom: 2px solid #374151;
                }

                .module-header h1 {
                    font-size: 2rem;
                    color: #f9fafb;
                    margin-bottom: 0.5rem;
                }

                .module-subtitle {
                    font-size: 1rem;
                    color: #9ca3af;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    background: #1f2937;
                    border: 1px solid #374151;
                    border-radius: 12px;
                    padding: 1.5rem;
                    text-align: center;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #3b82f6;
                    margin-bottom: 0.5rem;
                }

                .stat-label {
                    font-size: 0.875rem;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .section {
                    background: #1f2937;
                    border: 1px solid #374151;
                    border-radius: 12px;
                    padding: 2rem;
                    margin-bottom: 2rem;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #374151;
                }

                .section-title {
                    font-size: 1.25rem;
                    color: #f9fafb;
                    font-weight: 600;
                }

                .email-card {
                    background: #374151;
                    border: 1px solid #4b5563;
                    border-radius: 8px;
                    padding: 1.5rem;
                    margin-bottom: 1rem;
                    transition: all 0.2s;
                }

                .email-card:hover {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .email-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .email-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #f9fafb;
                }

                .email-address {
                    font-size: 0.9rem;
                    color: #60a5fa;
                    margin-top: 0.25rem;
                }

                .badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .badge-success {
                    background: #065f46;
                    color: #d1fae5;
                }

                .badge-warning {
                    background: #92400e;
                    color: #fef3c7;
                }

                .badge-info {
                    background: #1e3a8a;
                    color: #dbeafe;
                }

                .process-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1rem;
                    margin-top: 1rem;
                }

                .process-item {
                    background: #1f2937;
                    border: 1px solid #374151;
                    border-radius: 8px;
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .process-info {
                    flex: 1;
                }

                .process-name {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #f9fafb;
                    margin-bottom: 0.25rem;
                }

                .process-module {
                    font-size: 0.75rem;
                    color: #9ca3af;
                }

                .process-actions {
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

                .btn-danger {
                    background: #ef4444;
                    color: white;
                }

                .btn-danger:hover {
                    background: #dc2626;
                }

                .btn-secondary {
                    background: #6b7280;
                    color: white;
                }

                .btn-secondary:hover {
                    background: #4b5563;
                }

                .btn-sm {
                    padding: 0.25rem 0.75rem;
                    font-size: 0.75rem;
                }

                .empty-state {
                    text-align: center;
                    padding: 3rem;
                }

                .empty-state-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state-text {
                    color: #9ca3af;
                    font-size: 1rem;
                }

                .alert {
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .alert-info {
                    background: #1e3a8a;
                    border: 1px solid #1e40af;
                    color: #dbeafe;
                }

                .alert-warning {
                    background: #92400e;
                    border: 1px solid #b45309;
                    color: #fef3c7;
                }

                .alert-success {
                    background: #065f46;
                    border: 1px solid #047857;
                    color: #d1fae5;
                }

                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: #374151;
                    border-radius: 9999px;
                    overflow: hidden;
                    margin-top: 0.5rem;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6, #60a5fa);
                    transition: width 0.3s;
                }

                select.form-select {
                    width: 100%;
                    padding: 0.5rem;
                    background: #374151;
                    border: 1px solid #4b5563;
                    border-radius: 6px;
                    color: #f9fafb;
                    font-size: 0.875rem;
                }

                select.form-select:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                }

                .loading-spinner {
                    display: inline-block;
                    width: 1rem;
                    height: 1rem;
                    border: 2px solid #374151;
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
    }

    function renderHeader() {
        return `
            <div class="module-header">
                <div>
                    <h1>📧 Asignación de Emails a Procesos</h1>
                    <p class="module-subtitle">Configure qué email se usa para cada tipo de notificación</p>
                </div>
            </div>
        `;
    }

    function renderStats() {
        if (!state.stats) return '';

        const coverage = state.stats.coverage_percentage || 0;

        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${state.stats.total_processes || 0}</div>
                    <div class="stat-label">Total Procesos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${state.stats.assigned || 0}</div>
                    <div class="stat-label">Asignados</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${state.stats.unassigned || 0}</div>
                    <div class="stat-label">Sin Asignar</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${coverage.toFixed(0)}%</div>
                    <div class="stat-label">Cobertura</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${coverage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderEmailConfigs() {
        if (state.emailConfigs.length === 0) {
            return `
                <div class="section">
                    <div class="section-header">
                        <h2 class="section-title">📬 Emails Configurados</h2>
                    </div>
                    <div class="empty-state">
                        <div class="empty-state-icon">📧</div>
                        <p class="empty-state-text">No hay emails configurados</p>
                        <p class="empty-state-text" style="font-size: 0.875rem;">Primero configure un email en la sección de Configuración de Emails</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">📬 Emails Configurados (${state.emailConfigs.length})</h2>
                </div>

                ${state.isFirstEmail && state.emailConfigs.length === 1 ? `
                    <div class="alert alert-info">
                        <span>ℹ️</span>
                        <div>
                            <strong>Primer Email Detectado</strong>
                            <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem;">
                                Este es su primer email. Puede auto-asignar TODOS los procesos a este email con un click.
                            </p>
                        </div>
                    </div>
                ` : ''}

                ${state.emailConfigs.map(email => `
                    <div class="email-card">
                        <div class="email-header">
                            <div>
                                <div class="email-name">${email.smtp_from_name || 'Sin nombre'}</div>
                                <div class="email-address">${email.smtp_from_email || 'Sin email configurado'}</div>
                            </div>
                            ${email.is_active ? `
                                <span class="badge badge-success">✓ Activo</span>
                            ` : `
                                <span class="badge badge-warning">⚠ Inactivo</span>
                            `}
                        </div>

                        ${state.isFirstEmail && state.emailConfigs.length === 1 ? `
                            <button
                                class="btn btn-success"
                                onclick="CompanyEmailProcessModule.handleAutoAssign('${email.id}')"
                                style="width: 100%;"
                            >
                                🤖 Auto-Asignar TODOS los Procesos a Este Email
                            </button>
                        ` : ''}

                        ${renderProcessesForEmail(email.id)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderProcessesForEmail(emailConfigId) {
        const processesForThisEmail = state.mappings.filter(m => m.email_config_id === emailConfigId);

        if (processesForThisEmail.length === 0) {
            return `
                <div style="margin-top: 1rem; padding: 1rem; background: #374151; border-radius: 6px; text-align: center; color: #9ca3af;">
                    No hay procesos asignados a este email
                </div>
            `;
        }

        return `
            <div style="margin-top: 1rem;">
                <strong style="color: #e5e7eb; font-size: 0.875rem;">Procesos asignados (${processesForThisEmail.length}):</strong>
                <div class="process-list">
                    ${processesForThisEmail.map(mapping => `
                        <div class="process-item">
                            <div class="process-info">
                                <div class="process-name">${mapping.process_name || mapping.process_key}</div>
                                <div class="process-module">📦 ${mapping.module || 'general'}</div>
                            </div>
                            <button
                                class="btn btn-danger btn-sm"
                                onclick="CompanyEmailProcessModule.handleUnassign('${mapping.process_key}')"
                                title="Des-asignar proceso"
                            >
                                ✖
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderMappings() {
        if (state.mappings.length === 0) return '';

        return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">🔗 Mapeo Actual (${state.mappings.length} procesos asignados)</h2>
                </div>

                <div class="process-list">
                    ${state.mappings.map(mapping => {
                        const email = state.emailConfigs.find(e => e.id === mapping.email_config_id);
                        return `
                            <div class="process-item">
                                <div class="process-info">
                                    <div class="process-name">${mapping.process_name || mapping.process_key}</div>
                                    <div class="process-module">
                                        📦 ${mapping.module || 'general'} → 📧 ${email?.smtp_from_email || 'Email desconocido'}
                                    </div>
                                </div>
                                <button
                                    class="btn btn-danger btn-sm"
                                    onclick="CompanyEmailProcessModule.handleUnassign('${mapping.process_key}')"
                                >
                                    Des-asignar
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    function renderUnassigned() {
        if (state.unassigned.length === 0) {
            return `
                <div class="section">
                    <div class="section-header">
                        <h2 class="section-title">✅ Sin Procesos Pendientes</h2>
                    </div>
                    <div class="alert alert-success">
                        <span>✓</span>
                        <div>
                            <strong>¡Excelente!</strong> Todos los procesos de notificación tienen un email asignado.
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="section">
                <div class="section-header">
                    <h2 class="section-title">⚠️ Procesos Sin Asignar (${state.unassigned.length})</h2>
                </div>

                <div class="alert alert-warning">
                    <span>⚠️</span>
                    <div>
                        <strong>Atención:</strong> Los siguientes procesos NO tienen un email asignado y no podrán enviar notificaciones.
                    </div>
                </div>

                <div class="process-list">
                    ${state.unassigned.map(process => `
                        <div class="process-item">
                            <div class="process-info">
                                <div class="process-name">${process.process_name || process.process_key}</div>
                                <div class="process-module">📦 ${process.module || 'general'}</div>
                                ${process.description ? `
                                    <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">
                                        ${process.description}
                                    </div>
                                ` : ''}
                            </div>
                            <div>
                                <select
                                    class="form-select"
                                    onchange="CompanyEmailProcessModule.handleAssign(this.value, '${process.process_key}')"
                                    style="min-width: 200px;"
                                >
                                    <option value="">Asignar a...</option>
                                    ${state.emailConfigs.filter(e => e.is_active).map(email => `
                                        <option value="${email.id}">
                                            ${email.smtp_from_name || email.smtp_from_email}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderLoading() {
        return `
            <div style="display: flex; align-items: center; justify-content: center; padding: 4rem;">
                <div class="loading-spinner" style="width: 2rem; height: 2rem; border-width: 3px;"></div>
                <span style="margin-left: 1rem; color: #9ca3af;">Cargando datos...</span>
            </div>
        `;
    }

    function renderError() {
        return `
            <div class="alert alert-warning" style="margin: 2rem;">
                <span>⚠️</span>
                <div>
                    <strong>Error al cargar datos:</strong> ${state.error}
                </div>
            </div>
        `;
    }

    // =========================================================================
    // HANDLERS
    // =========================================================================

    async function handleAutoAssign(emailConfigId) {
        if (!confirm('¿Auto-asignar TODOS los procesos de notificación a este email?\n\nEsta acción asignará automáticamente todos los procesos "company" disponibles.')) {
            return;
        }

        try {
            const result = await autoAssignAll(emailConfigId);
            alert(`✅ ${result.message}\n\n${result.assigned} procesos asignados.`);

            // Recargar datos
            await loadAllData();
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    }

    async function handleAssign(emailConfigId, processKey) {
        if (!emailConfigId) return;

        try {
            const result = await assignEmailToProcess(emailConfigId, processKey);
            alert(`✅ ${result.message}`);

            // Recargar datos
            await loadAllData();
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    }

    async function handleUnassign(processKey) {
        if (!confirm(`¿Des-asignar el proceso "${processKey}"?\n\nEste proceso no podrá enviar notificaciones hasta que se le asigne un nuevo email.`)) {
            return;
        }

        try {
            const result = await unassignProcess(processKey);
            alert(`✅ ${result.message}`);

            // Recargar datos
            await loadAllData();
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    }

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    function init() {
        console.log('🔌 [COMPANY-EMAIL-PROCESS] Inicializando módulo...');
        loadAllData();
    }

    // =========================================================================
    // API PÚBLICA
    // =========================================================================

    return {
        init,
        handleAutoAssign,
        handleAssign,
        handleUnassign
    };
})();

// Auto-inicializar si el contenedor existe
if (document.getElementById('company-email-process-module')) {
    CompanyEmailProcessModule.init();
}
