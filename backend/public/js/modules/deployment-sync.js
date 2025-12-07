/**
 * Deployment Sync Module - Sistema de Deploy y Sincronización
 * Gestión de Backend, Frontend y APKs con Git Push a Render
 */

window.DeploymentSync = {
    adminKey: null,
    status: null,
    gitDiff: null,
    apkVersions: null,
    isLoading: false,
    currentSubTab: 'backend', // backend, frontend, apk

    // ========================================================================
    // INICIALIZACIÓN
    // ========================================================================
    init() {
        console.log('🚀 [DEPLOYMENT-SYNC] Módulo inicializado');
    },

    // ========================================================================
    // RENDERIZAR UI PRINCIPAL
    // ========================================================================
    render(container, subTab = 'backend') {
        this.currentSubTab = subTab;

        container.innerHTML = `
            <div class="deploy-sync-container">
                <!-- Header con autenticación -->
                <div class="deploy-sync-auth-section">
                    <div class="deploy-sync-card">
                        <div class="deploy-sync-card-header">
                            <span>🔐 Autorización de Administrador</span>
                        </div>
                        <div class="deploy-sync-card-body">
                            <div class="deploy-sync-auth-form">
                                <input type="password"
                                       id="deployAdminKey"
                                       class="deploy-sync-input"
                                       placeholder="Ingrese contraseña de administrador"
                                       ${this.adminKey ? 'value="••••••••••••"' : ''}>
                                <button class="deploy-sync-btn deploy-sync-btn-primary" onclick="DeploymentSync.authenticate()">
                                    ${this.adminKey ? '✅ Autenticado' : '🔓 Autenticar'}
                                </button>
                            </div>
                            ${this.adminKey ? '<p class="deploy-sync-success">✅ Sesión activa - Puede ejecutar operaciones de deploy</p>' : ''}
                        </div>
                    </div>
                </div>

                <!-- Sub-tabs -->
                <div class="deploy-sync-tabs">
                    <button class="deploy-sync-tab ${this.currentSubTab === 'backend' ? 'active' : ''}"
                            onclick="DeploymentSync.switchSubTab('backend')">
                        ⚙️ Backend Deploy
                    </button>
                    <button class="deploy-sync-tab ${this.currentSubTab === 'frontend' ? 'active' : ''}"
                            onclick="DeploymentSync.switchSubTab('frontend')">
                        🎨 Frontend Status
                    </button>
                    <button class="deploy-sync-tab ${this.currentSubTab === 'apk' ? 'active' : ''}"
                            onclick="DeploymentSync.switchSubTab('apk')">
                        📱 APK Management
                    </button>
                </div>

                <!-- Contenido dinámico -->
                <div id="deploySubTabContent">
                    ${this.renderSubTabContent()}
                </div>
            </div>
        `;

        this.injectStyles();
    },

    // ========================================================================
    // RENDER SUBTAB CONTENT
    // ========================================================================
    renderSubTabContent() {
        switch (this.currentSubTab) {
            case 'backend':
                return this.renderBackendDeploy();
            case 'frontend':
                return this.renderFrontendStatus();
            case 'apk':
                return this.renderApkManagement();
            default:
                return '<p>Sub-tab no encontrada</p>';
        }
    },

    switchSubTab(tabId) {
        this.currentSubTab = tabId;
        const container = document.querySelector('.deploy-sync-container')?.parentElement;
        if (container) {
            this.render(container, tabId);
        }
    },

    // ========================================================================
    // BACKEND DEPLOY TAB
    // ========================================================================
    renderBackendDeploy() {
        return `
            <div class="deploy-sync-card">
                <div class="deploy-sync-card-header">
                    <span>⚡ Acciones de Deploy</span>
                </div>
                <div class="deploy-sync-card-body">
                    <div class="deploy-sync-btn-group">
                        <button class="deploy-sync-btn deploy-sync-btn-info" onclick="DeploymentSync.getStatus()" ${!this.adminKey ? 'disabled' : ''}>
                            📊 Ver Estado
                        </button>
                        <button class="deploy-sync-btn deploy-sync-btn-warning" onclick="DeploymentSync.getGitDiff()" ${!this.adminKey ? 'disabled' : ''}>
                            🔍 Ver Git Diff
                        </button>
                        <button class="deploy-sync-btn deploy-sync-btn-success" onclick="DeploymentSync.pushToRender()" ${!this.adminKey ? 'disabled' : ''}>
                            🚀 Push a Render
                        </button>
                    </div>
                </div>
            </div>

            <!-- Área de resultados -->
            <div class="deploy-sync-card">
                <div class="deploy-sync-card-header">
                    <span>📊 Estado del Sistema</span>
                    <span id="deployTimestamp" class="deploy-sync-timestamp"></span>
                </div>
                <div class="deploy-sync-card-body">
                    <div id="deployResults" class="deploy-sync-results">
                        <p class="deploy-sync-placeholder">
                            Autentíquese y haga clic en "Ver Estado" para comenzar
                        </p>
                    </div>
                </div>
            </div>

            <!-- Git Diff Section -->
            <div id="deployGitDiff" class="deploy-sync-card" style="display: none;">
                <div class="deploy-sync-card-header">
                    <span>🔄 Diferencias Git (Local vs Remoto)</span>
                </div>
                <div class="deploy-sync-card-body">
                    <div id="deployGitDiffContent"></div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // FRONTEND STATUS TAB
    // ========================================================================
    renderFrontendStatus() {
        return `
            <div class="deploy-sync-card">
                <div class="deploy-sync-card-header">
                    <span>🎨 Estado del Frontend</span>
                </div>
                <div class="deploy-sync-card-body">
                    <div class="deploy-sync-btn-group">
                        <button class="deploy-sync-btn deploy-sync-btn-info" onclick="DeploymentSync.getFrontendStatus()" ${!this.adminKey ? 'disabled' : ''}>
                            📊 Verificar Estado
                        </button>
                    </div>
                </div>
            </div>

            <div class="deploy-sync-card">
                <div class="deploy-sync-card-header">
                    <span>📂 Información del Frontend</span>
                </div>
                <div class="deploy-sync-card-body">
                    <div id="frontendStatusResults" class="deploy-sync-results">
                        <p class="deploy-sync-placeholder">
                            Haga clic en "Verificar Estado" para ver información del frontend
                        </p>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // APK MANAGEMENT TAB
    // ========================================================================
    renderApkManagement() {
        return `
            <div class="deploy-sync-card">
                <div class="deploy-sync-card-header">
                    <span>📱 Gestión de APKs</span>
                </div>
                <div class="deploy-sync-card-body">
                    <div class="deploy-sync-btn-group">
                        <button class="deploy-sync-btn deploy-sync-btn-info" onclick="DeploymentSync.getApkVersions()">
                            📋 Ver Versiones
                        </button>
                        <button class="deploy-sync-btn deploy-sync-btn-success" onclick="DeploymentSync.buildApk('release')" ${!this.adminKey ? 'disabled' : ''}>
                            🔨 Build Release
                        </button>
                        <button class="deploy-sync-btn deploy-sync-btn-warning" onclick="DeploymentSync.buildApk('debug')" ${!this.adminKey ? 'disabled' : ''}>
                            🧪 Build Debug
                        </button>
                    </div>
                </div>
            </div>

            <div class="deploy-sync-card">
                <div class="deploy-sync-card-header">
                    <span>📦 APKs Disponibles</span>
                </div>
                <div class="deploy-sync-card-body">
                    <div id="apkVersionsResults" class="deploy-sync-results">
                        <p class="deploy-sync-placeholder">
                            Haga clic en "Ver Versiones" para listar APKs disponibles
                        </p>
                    </div>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // AUTENTICACIÓN
    // ========================================================================
    authenticate() {
        const input = document.getElementById('deployAdminKey');
        const key = input.value;

        if (!key || key === '••••••••••••') {
            this.showNotification('Ingrese la contraseña de administrador', 'warning');
            return;
        }

        this.adminKey = key;
        this.showNotification('✅ Autenticado correctamente', 'success');

        // Re-render para habilitar botones
        const container = document.querySelector('.deploy-sync-container')?.parentElement;
        if (container) {
            this.render(container, this.currentSubTab);
        }
    },

    // ========================================================================
    // GET STATUS
    // ========================================================================
    async getStatus() {
        if (!this.adminKey) {
            this.showNotification('Debe autenticarse primero', 'error');
            return;
        }

        this.setLoading(true, 'Obteniendo estado del sistema...');

        try {
            const response = await fetch('/api/deployment/status', {
                headers: {
                    'x-deploy-admin-password': this.adminKey
                }
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error obteniendo estado');
            }

            this.status = data.status;
            this.renderStatusResults(data.status);
            this.showNotification('Estado obtenido correctamente', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message);
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // GET GIT DIFF
    // ========================================================================
    async getGitDiff() {
        if (!this.adminKey) {
            this.showNotification('Debe autenticarse primero', 'error');
            return;
        }

        this.setLoading(true, 'Analizando diferencias Git...');

        try {
            const response = await fetch('/api/deployment/git-diff', {
                headers: {
                    'x-deploy-admin-password': this.adminKey
                }
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error obteniendo Git diff');
            }

            this.gitDiff = data.diff;
            this.renderGitDiffResults(data.diff);
            this.showNotification('Git diff obtenido', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message);
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // PUSH TO RENDER
    // ========================================================================
    async pushToRender() {
        if (!this.adminKey) {
            this.showNotification('Debe autenticarse primero', 'error');
            return;
        }

        // Pedir mensaje de commit
        const commitMessage = prompt(
            '📝 Ingrese el mensaje del commit:\n\n' +
            '(Ejemplo: "Fix: corrección de errores en módulo X")',
            'Sync from Engineering Dashboard'
        );

        if (!commitMessage) {
            this.showNotification('Push cancelado', 'info');
            return;
        }

        // Confirmación
        const confirmed = confirm(
            '⚠️ ADVERTENCIA ⚠️\n\n' +
            'Está a punto de hacer PUSH a GitHub.\n\n' +
            'Esto activará el deploy automático en Render.\n\n' +
            `Mensaje: "${commitMessage}"\n\n` +
            '¿Está seguro de continuar?'
        );

        if (!confirmed) {
            this.showNotification('Push cancelado', 'info');
            return;
        }

        this.setLoading(true, 'Haciendo push a Render...');

        try {
            const response = await fetch('/api/deployment/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-deploy-admin-password': this.adminKey
                },
                body: JSON.stringify({ commitMessage })
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error en push');
            }

            this.renderPushResults(data);
            this.showNotification(data.message || 'Push completado', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message);
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // GET FRONTEND STATUS
    // ========================================================================
    async getFrontendStatus() {
        if (!this.adminKey) {
            this.showNotification('Debe autenticarse primero', 'error');
            return;
        }

        this.setLoading(true, 'Verificando frontend...', 'frontendStatusResults');

        try {
            const response = await fetch('/api/deployment/status', {
                headers: {
                    'x-deploy-admin-password': this.adminKey
                }
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error obteniendo estado');
            }

            this.renderFrontendStatusResults(data.status.components.frontend);
            this.showNotification('Estado frontend obtenido', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message, 'frontendStatusResults');
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // GET APK VERSIONS
    // ========================================================================
    async getApkVersions() {
        this.setLoading(true, 'Obteniendo versiones APK...', 'apkVersionsResults');

        try {
            const response = await fetch('/api/deployment/apk/versions');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error obteniendo versiones');
            }

            this.apkVersions = data.versions;
            this.renderApkVersionsResults(data);
            this.showNotification(`${data.count} APKs encontradas`, 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message, 'apkVersionsResults');
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // BUILD APK
    // ========================================================================
    async buildApk(buildType) {
        if (!this.adminKey) {
            this.showNotification('Debe autenticarse primero', 'error');
            return;
        }

        const confirmed = confirm(
            `¿Iniciar build de APK ${buildType.toUpperCase()}?\n\n` +
            'Nota: Requiere Flutter SDK instalado en el servidor.'
        );

        if (!confirmed) return;

        this.setLoading(true, `Iniciando build ${buildType}...`, 'apkVersionsResults');

        try {
            const response = await fetch('/api/deployment/apk/build', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-deploy-admin-password': this.adminKey
                },
                body: JSON.stringify({ buildType })
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error iniciando build');
            }

            this.renderBuildResults(data);
            this.showNotification(data.message || 'Build iniciado', 'info');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message, 'apkVersionsResults');
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // RENDER RESULTS
    // ========================================================================
    renderStatusResults(status) {
        const resultsDiv = document.getElementById('deployResults');
        const timestampSpan = document.getElementById('deployTimestamp');

        if (timestampSpan) {
            timestampSpan.textContent = new Date(status.timestamp).toLocaleString();
        }

        const { backend, frontend, database, apk } = status.components;
        const git = status.git;

        resultsDiv.innerHTML = `
            <div class="deploy-sync-status-grid">
                <!-- Backend -->
                <div class="deploy-sync-status-card ${backend.status === 'running' ? 'success' : 'warning'}">
                    <div class="deploy-sync-status-icon">⚙️</div>
                    <div class="deploy-sync-status-title">Backend</div>
                    <div class="deploy-sync-status-value">${backend.status}</div>
                    <div class="deploy-sync-status-details">
                        <span>Env: ${backend.environment}</span>
                        <span>Puerto: ${backend.port}</span>
                        <span>Node: ${backend.nodeVersion}</span>
                        <span>Uptime: ${Math.floor(backend.uptime / 60)}m</span>
                    </div>
                </div>

                <!-- Frontend -->
                <div class="deploy-sync-status-card ${frontend.status === 'ready' ? 'success' : 'warning'}">
                    <div class="deploy-sync-status-icon">🎨</div>
                    <div class="deploy-sync-status-title">Frontend</div>
                    <div class="deploy-sync-status-value">${frontend.status}</div>
                    <div class="deploy-sync-status-details">
                        <span>Panel Empresa: ${frontend.panelEmpresa ? '✅' : '❌'}</span>
                        <span>Panel Admin: ${frontend.panelAdmin ? '✅' : '❌'}</span>
                        <span>JS Modules: ${frontend.jsModulesCount}</span>
                    </div>
                </div>

                <!-- Database -->
                <div class="deploy-sync-status-card ${database.status === 'connected' ? 'success' : 'danger'}">
                    <div class="deploy-sync-status-icon">🗄️</div>
                    <div class="deploy-sync-status-title">Database</div>
                    <div class="deploy-sync-status-value">${database.status}</div>
                    <div class="deploy-sync-status-details">
                        <span>Tablas: ${database.tables || 'N/A'}</span>
                        <span>Dialect: ${database.dialect || 'N/A'}</span>
                    </div>
                </div>

                <!-- APK -->
                <div class="deploy-sync-status-card ${apk.status === 'available' ? 'success' : 'info'}">
                    <div class="deploy-sync-status-icon">📱</div>
                    <div class="deploy-sync-status-title">APK</div>
                    <div class="deploy-sync-status-value">${apk.status}</div>
                    <div class="deploy-sync-status-details">
                        <span>Builds: ${apk.count}</span>
                        ${apk.latestVersion ? `<span>Última: ${apk.latestVersion.version}</span>` : ''}
                    </div>
                </div>

                <!-- Git -->
                <div class="deploy-sync-status-card ${git.hasChanges ? 'warning' : 'success'}">
                    <div class="deploy-sync-status-icon">🔀</div>
                    <div class="deploy-sync-status-title">Git</div>
                    <div class="deploy-sync-status-value">${git.branch}</div>
                    <div class="deploy-sync-status-details">
                        <span>${git.lastCommit}</span>
                        <span>Cambios: ${git.modifiedFiles}</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderGitDiffResults(diff) {
        const diffDiv = document.getElementById('deployGitDiff');
        const contentDiv = document.getElementById('deployGitDiffContent');

        diffDiv.style.display = 'block';

        contentDiv.innerHTML = `
            <div class="deploy-sync-diff-summary">
                <div class="deploy-sync-diff-stat ${diff.inSync ? 'success' : 'warning'}">
                    <span class="deploy-sync-diff-icon">${diff.inSync ? '✅' : '⚠️'}</span>
                    <span>${diff.inSync ? 'Sincronizado con remoto' : 'Hay diferencias'}</span>
                </div>
                <div class="deploy-sync-diff-info">
                    <span>Local: <code>${diff.localCommit?.substring(0, 8)}</code></span>
                    <span>Remoto: <code>${diff.remoteCommit?.substring(0, 8)}</code></span>
                    <span>Adelante: ${diff.aheadOfRemote}</span>
                    <span>Atrás: ${diff.behindRemote}</span>
                </div>
            </div>

            ${diff.modifiedFiles?.length > 0 ? `
                <div class="deploy-sync-files-list">
                    <h4>📝 Archivos Modificados (${diff.totalModified})</h4>
                    <div class="deploy-sync-files-scroll">
                        ${diff.modifiedFiles.map(f => `
                            <div class="deploy-sync-file-item ${this.getFileStatusClass(f.status)}">
                                <span class="deploy-sync-file-status">${f.status}</span>
                                <span class="deploy-sync-file-name">${f.file}</span>
                            </div>
                        `).join('')}
                        ${diff.totalModified > 50 ? `<p class="deploy-sync-more">... y ${diff.totalModified - 50} archivos más</p>` : ''}
                    </div>
                </div>
            ` : '<p class="deploy-sync-success">✅ No hay archivos modificados</p>'}
        `;
    },

    renderPushResults(data) {
        const resultsDiv = document.getElementById('deployResults');

        resultsDiv.innerHTML = `
            <div class="deploy-sync-push-results">
                <div class="deploy-sync-push-header ${data.success ? 'success' : 'danger'}">
                    <span class="deploy-sync-push-icon">${data.success ? '🚀' : '❌'}</span>
                    <span>${data.message}</span>
                </div>
                <div class="deploy-sync-push-steps">
                    ${data.results.map(r => `
                        <div class="deploy-sync-push-step ${r.success ? 'success' : 'danger'}">
                            <span class="deploy-sync-step-icon">${r.success ? '✅' : '❌'}</span>
                            <span class="deploy-sync-step-name">${r.step}</span>
                            ${r.note ? `<span class="deploy-sync-step-note">${r.note}</span>` : ''}
                            ${r.error ? `<span class="deploy-sync-step-error">${r.error}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderFrontendStatusResults(frontend) {
        const resultsDiv = document.getElementById('frontendStatusResults');

        resultsDiv.innerHTML = `
            <div class="deploy-sync-frontend-status">
                <div class="deploy-sync-status-card large ${frontend.status === 'ready' ? 'success' : 'warning'}">
                    <div class="deploy-sync-status-icon">🎨</div>
                    <div class="deploy-sync-status-title">Estado Frontend</div>
                    <div class="deploy-sync-status-value">${frontend.status === 'ready' ? 'LISTO' : 'INCOMPLETO'}</div>
                </div>

                <div class="deploy-sync-frontend-details">
                    <div class="deploy-sync-detail-item ${frontend.panelEmpresa ? 'success' : 'danger'}">
                        <span class="icon">${frontend.panelEmpresa ? '✅' : '❌'}</span>
                        <span>panel-empresa.html</span>
                    </div>
                    <div class="deploy-sync-detail-item ${frontend.panelAdmin ? 'success' : 'danger'}">
                        <span class="icon">${frontend.panelAdmin ? '✅' : '❌'}</span>
                        <span>panel-administrativo.html</span>
                    </div>
                    <div class="deploy-sync-detail-item info">
                        <span class="icon">📦</span>
                        <span>JS Modules: ${frontend.jsModulesCount} archivos</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderApkVersionsResults(data) {
        const resultsDiv = document.getElementById('apkVersionsResults');

        if (data.versions.length === 0) {
            resultsDiv.innerHTML = `
                <div class="deploy-sync-no-apks">
                    <span class="icon">📭</span>
                    <p>No hay APKs disponibles</p>
                    <p class="hint">Use "Build Release" o "Build Debug" para crear uno</p>
                </div>
            `;
            return;
        }

        resultsDiv.innerHTML = `
            ${data.latestVersion ? `
                <div class="deploy-sync-latest-version">
                    <h4>📦 Última Versión</h4>
                    <div class="deploy-sync-version-info">
                        <span>Versión: <strong>${data.latestVersion.version}</strong></span>
                        <span>Tipo: ${data.latestVersion.buildType}</span>
                        <span>Fecha: ${new Date(data.latestVersion.buildDate).toLocaleString()}</span>
                        <a href="${data.latestVersion.downloadUrl}" class="deploy-sync-btn deploy-sync-btn-primary" download>
                            ⬇️ Descargar
                        </a>
                    </div>
                </div>
            ` : ''}

            <div class="deploy-sync-apk-list">
                <h4>📋 Todas las versiones (${data.count})</h4>
                <table class="deploy-sync-table">
                    <thead>
                        <tr>
                            <th>Archivo</th>
                            <th>Tamaño</th>
                            <th>Fecha</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.versions.map(v => `
                            <tr>
                                <td><code>${v.filename}</code></td>
                                <td>${v.size}</td>
                                <td>${new Date(v.created).toLocaleString()}</td>
                                <td>
                                    <a href="${v.downloadUrl}" class="deploy-sync-btn deploy-sync-btn-small" download>
                                        ⬇️
                                    </a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderBuildResults(data) {
        const resultsDiv = document.getElementById('apkVersionsResults');

        resultsDiv.innerHTML = `
            <div class="deploy-sync-build-result info">
                <div class="deploy-sync-build-icon">🔨</div>
                <div class="deploy-sync-build-text">
                    <h4>${data.message}</h4>
                    <p>Tipo de build: ${data.buildType}</p>
                    ${data.note ? `<p class="hint">${data.note}</p>` : ''}
                </div>
            </div>
        `;
    },

    // ========================================================================
    // HELPERS
    // ========================================================================
    getFileStatusClass(status) {
        switch (status) {
            case 'M': return 'modified';
            case 'A': return 'added';
            case 'D': return 'deleted';
            case '??': return 'untracked';
            default: return '';
        }
    },

    renderError(message, containerId = 'deployResults') {
        const resultsDiv = document.getElementById(containerId);
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="deploy-sync-error">
                    <div class="deploy-sync-error-icon">❌</div>
                    <div class="deploy-sync-error-text">${this.escapeHtml(message)}</div>
                </div>
            `;
        }
    },

    setLoading(loading, message = 'Cargando...', containerId = 'deployResults') {
        this.isLoading = loading;
        const resultsDiv = document.getElementById(containerId);

        if (loading && resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="deploy-sync-loading">
                    <div class="deploy-sync-spinner"></div>
                    <div>${message}</div>
                </div>
            `;
        }
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `deploy-sync-notification deploy-sync-notification-${type}`;
        notification.innerHTML = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ========================================================================
    // ESTILOS
    // ========================================================================
    injectStyles() {
        if (document.getElementById('deploy-sync-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'deploy-sync-styles';
        styles.textContent = `
            .deploy-sync-container {
                padding: 20px;
                max-width: 1400px;
                margin: 0 auto;
            }

            .deploy-sync-card {
                background: rgba(30, 30, 46, 0.95);
                border-radius: 12px;
                margin-bottom: 20px;
                border: 1px solid rgba(139, 92, 246, 0.2);
                overflow: hidden;
            }

            .deploy-sync-card-header {
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
                padding: 15px 20px;
                font-weight: 600;
                font-size: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #fff;
            }

            .deploy-sync-card-body {
                padding: 20px;
            }

            .deploy-sync-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }

            .deploy-sync-tab {
                padding: 12px 24px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 8px;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
            }

            .deploy-sync-tab:hover {
                background: rgba(255, 255, 255, 0.15);
                color: #fff;
            }

            .deploy-sync-tab.active {
                background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                color: #fff;
            }

            .deploy-sync-auth-form {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .deploy-sync-input {
                flex: 1;
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
            }

            .deploy-sync-input:focus {
                outline: none;
                border-color: #8b5cf6;
            }

            .deploy-sync-btn {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
                text-decoration: none;
                display: inline-block;
            }

            .deploy-sync-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .deploy-sync-btn-primary { background: #8b5cf6; color: #fff; }
            .deploy-sync-btn-primary:hover:not(:disabled) { background: #7c3aed; }

            .deploy-sync-btn-info { background: #3b82f6; color: #fff; }
            .deploy-sync-btn-info:hover:not(:disabled) { background: #2563eb; }

            .deploy-sync-btn-warning { background: #f59e0b; color: #000; }
            .deploy-sync-btn-warning:hover:not(:disabled) { background: #d97706; }

            .deploy-sync-btn-success { background: #10b981; color: #fff; }
            .deploy-sync-btn-success:hover:not(:disabled) { background: #059669; }

            .deploy-sync-btn-small {
                padding: 6px 12px;
                font-size: 12px;
            }

            .deploy-sync-btn-group {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .deploy-sync-success { color: #10b981; margin-top: 10px; }

            .deploy-sync-results {
                min-height: 100px;
            }

            .deploy-sync-placeholder {
                color: rgba(255,255,255,0.5);
                text-align: center;
                padding: 40px;
            }

            .deploy-sync-status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }

            .deploy-sync-status-card {
                background: rgba(0, 0, 0, 0.3);
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                border-left: 4px solid #6b7280;
            }

            .deploy-sync-status-card.success { border-left-color: #10b981; }
            .deploy-sync-status-card.warning { border-left-color: #f59e0b; }
            .deploy-sync-status-card.danger { border-left-color: #ef4444; }
            .deploy-sync-status-card.info { border-left-color: #3b82f6; }

            .deploy-sync-status-card.large {
                padding: 30px;
                grid-column: span 2;
            }

            .deploy-sync-status-icon { font-size: 32px; margin-bottom: 10px; }
            .deploy-sync-status-title { font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 5px; }
            .deploy-sync-status-value { font-size: 24px; font-weight: bold; color: #fff; }
            .deploy-sync-status-details {
                margin-top: 15px;
                font-size: 12px;
                color: rgba(255,255,255,0.5);
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .deploy-sync-diff-summary {
                background: rgba(0, 0, 0, 0.2);
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 20px;
            }

            .deploy-sync-diff-stat {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
            }

            .deploy-sync-diff-stat.success { color: #10b981; }
            .deploy-sync-diff-stat.warning { color: #f59e0b; }

            .deploy-sync-diff-info {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
                font-size: 13px;
                color: rgba(255,255,255,0.7);
            }

            .deploy-sync-files-list h4 {
                color: #8b5cf6;
                margin-bottom: 10px;
            }

            .deploy-sync-files-scroll {
                max-height: 300px;
                overflow-y: auto;
            }

            .deploy-sync-file-item {
                display: flex;
                gap: 10px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.2);
                margin-bottom: 4px;
                border-radius: 6px;
                font-size: 13px;
            }

            .deploy-sync-file-status {
                font-weight: bold;
                min-width: 30px;
            }

            .deploy-sync-file-item.modified .deploy-sync-file-status { color: #f59e0b; }
            .deploy-sync-file-item.added .deploy-sync-file-status { color: #10b981; }
            .deploy-sync-file-item.deleted .deploy-sync-file-status { color: #ef4444; }
            .deploy-sync-file-item.untracked .deploy-sync-file-status { color: #3b82f6; }

            .deploy-sync-file-name {
                color: rgba(255,255,255,0.8);
                word-break: break-all;
            }

            .deploy-sync-more {
                color: rgba(255,255,255,0.5);
                font-style: italic;
                padding: 10px;
            }

            .deploy-sync-push-results {
                padding: 20px;
            }

            .deploy-sync-push-header {
                display: flex;
                align-items: center;
                gap: 15px;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 20px;
                padding: 15px;
                border-radius: 10px;
            }

            .deploy-sync-push-header.success { background: rgba(16, 185, 129, 0.2); color: #10b981; }
            .deploy-sync-push-header.danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

            .deploy-sync-push-steps {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .deploy-sync-push-step {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 15px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
            }

            .deploy-sync-step-icon { font-size: 20px; }
            .deploy-sync-step-name { font-weight: 500; }
            .deploy-sync-step-note { color: rgba(255,255,255,0.5); font-size: 12px; margin-left: auto; }
            .deploy-sync-step-error { color: #ef4444; font-size: 12px; margin-left: auto; }

            .deploy-sync-frontend-status {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 20px;
            }

            .deploy-sync-frontend-details {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .deploy-sync-detail-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 15px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
            }

            .deploy-sync-detail-item.success { border-left: 3px solid #10b981; }
            .deploy-sync-detail-item.danger { border-left: 3px solid #ef4444; }
            .deploy-sync-detail-item.info { border-left: 3px solid #3b82f6; }

            .deploy-sync-no-apks {
                text-align: center;
                padding: 40px;
                color: rgba(255,255,255,0.5);
            }

            .deploy-sync-no-apks .icon { font-size: 48px; margin-bottom: 15px; display: block; }
            .deploy-sync-no-apks .hint { font-size: 12px; margin-top: 10px; }

            .deploy-sync-latest-version {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2));
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 20px;
            }

            .deploy-sync-latest-version h4 {
                color: #10b981;
                margin-bottom: 15px;
            }

            .deploy-sync-version-info {
                display: flex;
                gap: 20px;
                align-items: center;
                flex-wrap: wrap;
            }

            .deploy-sync-apk-list h4 {
                color: #8b5cf6;
                margin-bottom: 15px;
            }

            .deploy-sync-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }

            .deploy-sync-table th,
            .deploy-sync-table td {
                padding: 12px 15px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .deploy-sync-table th {
                background: rgba(139, 92, 246, 0.2);
                font-weight: 600;
            }

            .deploy-sync-table tr:hover {
                background: rgba(255,255,255,0.05);
            }

            .deploy-sync-build-result {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 25px;
                border-radius: 12px;
            }

            .deploy-sync-build-result.info {
                background: rgba(59, 130, 246, 0.2);
                border: 1px solid #3b82f6;
            }

            .deploy-sync-build-icon { font-size: 48px; }
            .deploy-sync-build-text h4 { color: #fff; margin-bottom: 10px; }
            .deploy-sync-build-text p { color: rgba(255,255,255,0.7); margin: 5px 0; }
            .deploy-sync-build-text .hint { font-size: 12px; color: rgba(255,255,255,0.5); }

            .deploy-sync-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                padding: 40px;
                color: rgba(255,255,255,0.7);
            }

            .deploy-sync-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(139, 92, 246, 0.3);
                border-top-color: #8b5cf6;
                border-radius: 50%;
                animation: deploy-sync-spin 1s linear infinite;
            }

            @keyframes deploy-sync-spin {
                to { transform: rotate(360deg); }
            }

            .deploy-sync-error {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 20px;
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid #ef4444;
                border-radius: 10px;
            }

            .deploy-sync-error-icon { font-size: 32px; }
            .deploy-sync-error-text { color: #fca5a5; }

            .deploy-sync-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 10px;
                color: #fff;
                font-weight: 500;
                z-index: 10000;
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s;
            }

            .deploy-sync-notification.show {
                transform: translateY(0);
                opacity: 1;
            }

            .deploy-sync-notification-success { background: #10b981; }
            .deploy-sync-notification-error { background: #ef4444; }
            .deploy-sync-notification-warning { background: #f59e0b; color: #000; }
            .deploy-sync-notification-info { background: #3b82f6; }

            .deploy-sync-timestamp {
                font-size: 12px;
                color: rgba(255,255,255,0.5);
            }

            code {
                background: rgba(0,0,0,0.3);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Monaco', 'Consolas', monospace;
            }

            @media (max-width: 768px) {
                .deploy-sync-tabs {
                    flex-direction: column;
                }

                .deploy-sync-status-grid {
                    grid-template-columns: 1fr;
                }

                .deploy-sync-frontend-status {
                    grid-template-columns: 1fr;
                }

                .deploy-sync-status-card.large {
                    grid-column: span 1;
                }
            }
        `;

        document.head.appendChild(styles);
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => DeploymentSync.init());
