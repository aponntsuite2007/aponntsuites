/**
 * Database Sync Module - Sistema de Sincronización de BD
 * Interfaz visual para comparar y sincronizar esquema de BD
 */

window.DatabaseSync = {
    adminKey: null,
    comparison: null,
    isLoading: false,

    // ========================================================================
    // INICIALIZACIÓN
    // ========================================================================
    init() {
        console.log('🗄️ [DATABASE-SYNC] Módulo inicializado');
    },

    // ========================================================================
    // RENDERIZAR UI PRINCIPAL
    // ========================================================================
    render(container) {
        container.innerHTML = `
            <div class="db-sync-container">
                <!-- Header con autenticación -->
                <div class="db-sync-auth-section">
                    <div class="db-sync-card">
                        <div class="db-sync-card-header">
                            <span>🔐 Autorización de Administrador</span>
                        </div>
                        <div class="db-sync-card-body">
                            <div class="db-sync-auth-form">
                                <input type="password"
                                       id="dbAdminKey"
                                       class="db-sync-input"
                                       placeholder="Ingrese contraseña de administrador"
                                       ${this.adminKey ? 'value="••••••••••••"' : ''}>
                                <button class="db-sync-btn db-sync-btn-primary" onclick="DatabaseSync.authenticate()">
                                    ${this.adminKey ? '✅ Autenticado' : '🔓 Autenticar'}
                                </button>
                            </div>
                            ${this.adminKey ? '<p class="db-sync-success">✅ Sesión activa - Puede ejecutar operaciones</p>' : ''}
                        </div>
                    </div>
                </div>

                <!-- Acciones principales -->
                <div class="db-sync-actions-section">
                    <div class="db-sync-card">
                        <div class="db-sync-card-header">
                            <span>⚡ Acciones Rápidas</span>
                        </div>
                        <div class="db-sync-card-body">
                            <div class="db-sync-btn-group">
                                <button class="db-sync-btn db-sync-btn-info" onclick="DatabaseSync.compareSchema()" ${!this.adminKey ? 'disabled' : ''}>
                                    🔍 Comparar Esquema
                                </button>
                                <button class="db-sync-btn db-sync-btn-warning" onclick="DatabaseSync.dryRunSync()" ${!this.adminKey ? 'disabled' : ''}>
                                    🧪 Simular Sync (Dry Run)
                                </button>
                                <button class="db-sync-btn db-sync-btn-success" onclick="DatabaseSync.executeSync()" ${!this.adminKey ? 'disabled' : ''}>
                                    🚀 Ejecutar Sincronización
                                </button>
                                <button class="db-sync-btn db-sync-btn-secondary" onclick="DatabaseSync.listTables()" ${!this.adminKey ? 'disabled' : ''}>
                                    📋 Ver Tablas
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Área de resultados -->
                <div class="db-sync-results-section">
                    <div class="db-sync-card">
                        <div class="db-sync-card-header">
                            <span>📊 Resultados</span>
                            <span id="dbSyncTimestamp" class="db-sync-timestamp"></span>
                        </div>
                        <div class="db-sync-card-body">
                            <div id="dbSyncResults" class="db-sync-results">
                                <p class="db-sync-placeholder">
                                    Autentíquese y haga clic en "Comparar Esquema" para comenzar
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Resumen de diferencias -->
                <div id="dbSyncSummary" class="db-sync-summary-section" style="display: none;">
                    <div class="db-sync-card">
                        <div class="db-sync-card-header">
                            <span>📈 Resumen de Diferencias</span>
                        </div>
                        <div class="db-sync-card-body">
                            <div class="db-sync-summary-grid" id="dbSyncSummaryGrid"></div>
                        </div>
                    </div>
                </div>

                <!-- Detalles de cambios -->
                <div id="dbSyncDetails" class="db-sync-details-section" style="display: none;">
                    <div class="db-sync-card">
                        <div class="db-sync-card-header">
                            <span>📝 Detalle de Cambios Requeridos</span>
                        </div>
                        <div class="db-sync-card-body">
                            <div id="dbSyncDetailsContent"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.injectStyles();
    },

    // ========================================================================
    // AUTENTICACIÓN
    // ========================================================================
    authenticate() {
        const input = document.getElementById('dbAdminKey');
        const key = input.value;

        if (!key || key === '••••••••••••') {
            this.showNotification('Ingrese la contraseña de administrador', 'warning');
            return;
        }

        this.adminKey = key;
        this.showNotification('✅ Autenticado correctamente', 'success');

        // Re-render para habilitar botones
        const container = document.querySelector('.db-sync-container')?.parentElement;
        if (container) {
            this.render(container);
        }
    },

    // ========================================================================
    // COMPARAR ESQUEMA
    // ========================================================================
    async compareSchema() {
        if (!this.adminKey) {
            this.showNotification('Debe autenticarse primero', 'error');
            return;
        }

        this.setLoading(true, 'Comparando esquema...');

        try {
            const response = await fetch(`/api/database/compare-schema?adminKey=${encodeURIComponent(this.adminKey)}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error en la comparación');
            }

            this.comparison = data.comparison;
            this.renderComparisonResults(data.comparison);
            this.showNotification('Comparación completada', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message);
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // SIMULAR SYNC (DRY RUN)
    // ========================================================================
    async dryRunSync() {
        if (!this.adminKey) {
            this.showNotification('Debe autenticarse primero', 'error');
            return;
        }

        this.setLoading(true, 'Simulando sincronización...');

        try {
            const response = await fetch('/api/database/sync-schema', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-db-admin-password': this.adminKey
                },
                body: JSON.stringify({ dryRun: true })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error en simulación');
            }

            this.renderSyncResults(data.results, true);
            this.showNotification('Simulación completada - Revise los cambios propuestos', 'info');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message);
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // EJECUTAR SINCRONIZACIÓN
    // ========================================================================
    async executeSync() {
        if (!this.adminKey) {
            this.showNotification('Debe autenticarse primero', 'error');
            return;
        }

        // Confirmación doble
        const confirmed = confirm(
            '⚠️ ADVERTENCIA ⚠️\n\n' +
            'Está a punto de modificar la estructura de la base de datos.\n\n' +
            'Esta acción:\n' +
            '• Creará tablas faltantes\n' +
            '• Agregará columnas faltantes\n\n' +
            '¿Está seguro de continuar?'
        );

        if (!confirmed) {
            this.showNotification('Operación cancelada', 'info');
            return;
        }

        this.setLoading(true, 'Ejecutando sincronización...');

        try {
            const response = await fetch('/api/database/sync-schema', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-db-admin-password': this.adminKey
                },
                body: JSON.stringify({ dryRun: false })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error en sincronización');
            }

            this.renderSyncResults(data.results, false);
            this.showNotification(
                `✅ Sincronización completada: ${data.results.summary.tablesCreated} tablas, ${data.results.summary.columnsAdded} columnas`,
                'success'
            );

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message);
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // LISTAR TABLAS
    // ========================================================================
    async listTables() {
        if (!this.adminKey) {
            this.showNotification('Debe autenticarse primero', 'error');
            return;
        }

        this.setLoading(true, 'Obteniendo tablas...');

        try {
            const response = await fetch(`/api/database/tables?adminKey=${encodeURIComponent(this.adminKey)}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Error obteniendo tablas');
            }

            this.renderTablesList(data.tables);
            this.showNotification(`${data.count} tablas encontradas`, 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message, 'error');
            this.renderError(error.message);
        } finally {
            this.setLoading(false);
        }
    },

    // ========================================================================
    // RENDERIZAR RESULTADOS DE COMPARACIÓN
    // ========================================================================
    renderComparisonResults(comparison) {
        const resultsDiv = document.getElementById('dbSyncResults');
        const summaryDiv = document.getElementById('dbSyncSummary');
        const detailsDiv = document.getElementById('dbSyncDetails');
        const timestampSpan = document.getElementById('dbSyncTimestamp');

        timestampSpan.textContent = new Date(comparison.timestamp).toLocaleString();

        // Resumen
        summaryDiv.style.display = 'block';
        const summaryGrid = document.getElementById('dbSyncSummaryGrid');
        summaryGrid.innerHTML = `
            <div class="db-sync-stat ${comparison.summary.syncRequired ? 'warning' : 'success'}">
                <div class="db-sync-stat-value">${comparison.summary.syncRequired ? '⚠️' : '✅'}</div>
                <div class="db-sync-stat-label">Estado</div>
                <div class="db-sync-stat-desc">${comparison.summary.syncRequired ? 'Sync Requerido' : 'Sincronizado'}</div>
            </div>
            <div class="db-sync-stat">
                <div class="db-sync-stat-value">${comparison.summary.totalModels}</div>
                <div class="db-sync-stat-label">Modelos</div>
            </div>
            <div class="db-sync-stat">
                <div class="db-sync-stat-value">${comparison.summary.totalDbTables}</div>
                <div class="db-sync-stat-label">Tablas BD</div>
            </div>
            <div class="db-sync-stat ${comparison.summary.missingTables > 0 ? 'danger' : ''}">
                <div class="db-sync-stat-value">${comparison.summary.missingTables}</div>
                <div class="db-sync-stat-label">Tablas Faltantes</div>
            </div>
            <div class="db-sync-stat ${comparison.summary.missingColumns > 0 ? 'warning' : ''}">
                <div class="db-sync-stat-value">${comparison.summary.missingColumns}</div>
                <div class="db-sync-stat-label">Columnas Faltantes</div>
            </div>
            <div class="db-sync-stat ${comparison.summary.typeMismatches > 0 ? 'info' : ''}">
                <div class="db-sync-stat-value">${comparison.summary.typeMismatches}</div>
                <div class="db-sync-stat-label">Tipos Diferentes</div>
            </div>
        `;

        // Detalles
        if (comparison.missingTables.length > 0 || comparison.missingColumns.length > 0) {
            detailsDiv.style.display = 'block';
            const detailsContent = document.getElementById('dbSyncDetailsContent');

            let html = '';

            if (comparison.missingTables.length > 0) {
                html += `
                    <div class="db-sync-detail-section">
                        <h4>🗃️ Tablas Faltantes (${comparison.missingTables.length})</h4>
                        <ul class="db-sync-list">
                            ${comparison.missingTables.map(t => `
                                <li class="db-sync-list-item danger">
                                    <strong>${t.model}</strong> → <code>${t.table}</code>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }

            if (comparison.missingColumns.length > 0) {
                html += `
                    <div class="db-sync-detail-section">
                        <h4>📝 Columnas Faltantes (${comparison.missingColumns.length})</h4>
                        <div class="db-sync-table-wrapper">
                            <table class="db-sync-table">
                                <thead>
                                    <tr>
                                        <th>Tabla</th>
                                        <th>Columna</th>
                                        <th>Tipo Sequelize</th>
                                        <th>SQL Sugerido</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${comparison.missingColumns.map(c => `
                                        <tr>
                                            <td><code>${c.table}</code></td>
                                            <td><strong>${c.column}</strong></td>
                                            <td>${c.sequelizeType}</td>
                                            <td><code class="db-sync-sql">${this.escapeHtml(c.suggestedSql)}</code></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            if (comparison.typeMismatches.length > 0) {
                html += `
                    <div class="db-sync-detail-section">
                        <h4>⚠️ Diferencias de Tipo (${comparison.typeMismatches.length})</h4>
                        <div class="db-sync-table-wrapper">
                            <table class="db-sync-table">
                                <thead>
                                    <tr>
                                        <th>Tabla</th>
                                        <th>Columna</th>
                                        <th>Esperado</th>
                                        <th>Actual</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${comparison.typeMismatches.map(t => `
                                        <tr>
                                            <td><code>${t.table}</code></td>
                                            <td><strong>${t.column}</strong></td>
                                            <td class="db-sync-type-expected">${t.expected}</td>
                                            <td class="db-sync-type-actual">${t.actual}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            detailsContent.innerHTML = html;
        } else {
            detailsDiv.style.display = 'none';
        }

        // Resultado principal
        resultsDiv.innerHTML = `
            <div class="db-sync-result-main ${comparison.summary.syncRequired ? 'needs-sync' : 'synced'}">
                <div class="db-sync-result-icon">${comparison.summary.syncRequired ? '🔄' : '✅'}</div>
                <div class="db-sync-result-text">
                    ${comparison.summary.syncRequired
                        ? 'Se detectaron diferencias entre los modelos y la BD. Use "Ejecutar Sincronización" para aplicar cambios.'
                        : 'La base de datos está sincronizada con los modelos Sequelize.'
                    }
                </div>
            </div>
        `;
    },

    // ========================================================================
    // RENDERIZAR RESULTADOS DE SYNC
    // ========================================================================
    renderSyncResults(results, isDryRun) {
        const resultsDiv = document.getElementById('dbSyncResults');
        const summaryDiv = document.getElementById('dbSyncSummary');
        const detailsDiv = document.getElementById('dbSyncDetails');

        summaryDiv.style.display = 'block';
        detailsDiv.style.display = 'block';

        const summaryGrid = document.getElementById('dbSyncSummaryGrid');
        summaryGrid.innerHTML = `
            <div class="db-sync-stat ${isDryRun ? 'info' : 'success'}">
                <div class="db-sync-stat-value">${isDryRun ? '🧪' : '✅'}</div>
                <div class="db-sync-stat-label">Modo</div>
                <div class="db-sync-stat-desc">${isDryRun ? 'Simulación' : 'Ejecutado'}</div>
            </div>
            <div class="db-sync-stat">
                <div class="db-sync-stat-value">${results.summary.tablesCreated}</div>
                <div class="db-sync-stat-label">Tablas Creadas</div>
            </div>
            <div class="db-sync-stat">
                <div class="db-sync-stat-value">${results.summary.columnsAdded}</div>
                <div class="db-sync-stat-label">Columnas Agregadas</div>
            </div>
            <div class="db-sync-stat ${results.summary.errors > 0 ? 'danger' : ''}">
                <div class="db-sync-stat-value">${results.summary.errors}</div>
                <div class="db-sync-stat-label">Errores</div>
            </div>
        `;

        const detailsContent = document.getElementById('dbSyncDetailsContent');
        let html = '';

        if (results.executed.length > 0) {
            html += `
                <div class="db-sync-detail-section">
                    <h4>${isDryRun ? '📋 Cambios Propuestos' : '✅ Cambios Aplicados'} (${results.executed.length})</h4>
                    <ul class="db-sync-list">
                        ${results.executed.map(e => `
                            <li class="db-sync-list-item ${e.success || isDryRun ? 'success' : 'warning'}">
                                <strong>${e.type}</strong>:
                                ${e.table ? `<code>${e.table}</code>` : ''}
                                ${e.column ? `.<code>${e.column}</code>` : ''}
                                ${e.sql ? `<br><code class="db-sync-sql">${this.escapeHtml(e.sql)}</code>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        if (results.skipped.length > 0) {
            html += `
                <div class="db-sync-detail-section">
                    <h4>⏭️ Omitidos (${results.skipped.length})</h4>
                    <ul class="db-sync-list">
                        ${results.skipped.map(s => `
                            <li class="db-sync-list-item info">
                                ${s.table}.${s.column}: ${s.reason}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        if (results.errors.length > 0) {
            html += `
                <div class="db-sync-detail-section">
                    <h4>❌ Errores (${results.errors.length})</h4>
                    <ul class="db-sync-list">
                        ${results.errors.map(e => `
                            <li class="db-sync-list-item danger">
                                ${e.table}.${e.column}: ${e.error}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        detailsContent.innerHTML = html || '<p>No hay cambios pendientes</p>';

        resultsDiv.innerHTML = `
            <div class="db-sync-result-main ${isDryRun ? 'dry-run' : 'executed'}">
                <div class="db-sync-result-icon">${isDryRun ? '🧪' : '🚀'}</div>
                <div class="db-sync-result-text">
                    ${isDryRun
                        ? 'Simulación completada. Revise los cambios propuestos arriba.'
                        : `Sincronización ejecutada: ${results.summary.tablesCreated} tablas creadas, ${results.summary.columnsAdded} columnas agregadas.`
                    }
                </div>
            </div>
        `;
    },

    // ========================================================================
    // RENDERIZAR LISTA DE TABLAS
    // ========================================================================
    renderTablesList(tables) {
        const resultsDiv = document.getElementById('dbSyncResults');
        const summaryDiv = document.getElementById('dbSyncSummary');
        const detailsDiv = document.getElementById('dbSyncDetails');

        summaryDiv.style.display = 'none';
        detailsDiv.style.display = 'none';

        resultsDiv.innerHTML = `
            <div class="db-sync-tables-list">
                <h4>📋 Tablas en la Base de Datos (${tables.length})</h4>
                <div class="db-sync-table-wrapper">
                    <table class="db-sync-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Tabla</th>
                                <th>Columnas</th>
                                <th>Filas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tables.map((t, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td><code>${t.table_name}</code></td>
                                    <td>${t.column_count || '-'}</td>
                                    <td>${t.row_count || '0'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // ========================================================================
    // HELPERS
    // ========================================================================
    renderError(message) {
        const resultsDiv = document.getElementById('dbSyncResults');
        resultsDiv.innerHTML = `
            <div class="db-sync-error">
                <div class="db-sync-error-icon">❌</div>
                <div class="db-sync-error-text">${this.escapeHtml(message)}</div>
            </div>
        `;
    },

    setLoading(loading, message = 'Cargando...') {
        this.isLoading = loading;
        const resultsDiv = document.getElementById('dbSyncResults');

        if (loading) {
            resultsDiv.innerHTML = `
                <div class="db-sync-loading">
                    <div class="db-sync-spinner"></div>
                    <div>${message}</div>
                </div>
            `;
        }
    },

    showNotification(message, type = 'info') {
        // Usar sistema de notificaciones existente o crear uno simple
        const notification = document.createElement('div');
        notification.className = `db-sync-notification db-sync-notification-${type}`;
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
        if (document.getElementById('db-sync-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'db-sync-styles';
        styles.textContent = `
            .db-sync-container {
                padding: 20px;
                max-width: 1400px;
                margin: 0 auto;
            }

            .db-sync-card {
                background: rgba(30, 30, 46, 0.95);
                border-radius: 12px;
                margin-bottom: 20px;
                border: 1px solid rgba(139, 92, 246, 0.2);
                overflow: hidden;
            }

            .db-sync-card-header {
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
                padding: 15px 20px;
                font-weight: 600;
                font-size: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #fff;
            }

            .db-sync-card-body {
                padding: 20px;
            }

            .db-sync-auth-form {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .db-sync-input {
                flex: 1;
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
            }

            .db-sync-input:focus {
                outline: none;
                border-color: #8b5cf6;
            }

            .db-sync-btn {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
            }

            .db-sync-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .db-sync-btn-primary { background: #8b5cf6; color: #fff; }
            .db-sync-btn-primary:hover:not(:disabled) { background: #7c3aed; }

            .db-sync-btn-info { background: #3b82f6; color: #fff; }
            .db-sync-btn-info:hover:not(:disabled) { background: #2563eb; }

            .db-sync-btn-warning { background: #f59e0b; color: #000; }
            .db-sync-btn-warning:hover:not(:disabled) { background: #d97706; }

            .db-sync-btn-success { background: #10b981; color: #fff; }
            .db-sync-btn-success:hover:not(:disabled) { background: #059669; }

            .db-sync-btn-secondary { background: rgba(255,255,255,0.1); color: #fff; }
            .db-sync-btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.2); }

            .db-sync-btn-group {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .db-sync-success { color: #10b981; margin-top: 10px; }

            .db-sync-results {
                min-height: 100px;
            }

            .db-sync-placeholder {
                color: rgba(255,255,255,0.5);
                text-align: center;
                padding: 40px;
            }

            .db-sync-summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }

            .db-sync-stat {
                background: rgba(0, 0, 0, 0.3);
                padding: 20px;
                border-radius: 10px;
                text-align: center;
            }

            .db-sync-stat.danger { border-left: 4px solid #ef4444; }
            .db-sync-stat.warning { border-left: 4px solid #f59e0b; }
            .db-sync-stat.success { border-left: 4px solid #10b981; }
            .db-sync-stat.info { border-left: 4px solid #3b82f6; }

            .db-sync-stat-value {
                font-size: 32px;
                font-weight: bold;
                color: #fff;
            }

            .db-sync-stat-label {
                font-size: 12px;
                color: rgba(255,255,255,0.6);
                margin-top: 5px;
            }

            .db-sync-stat-desc {
                font-size: 11px;
                color: rgba(255,255,255,0.4);
            }

            .db-sync-detail-section {
                margin-bottom: 20px;
            }

            .db-sync-detail-section h4 {
                color: #8b5cf6;
                margin-bottom: 10px;
            }

            .db-sync-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .db-sync-list-item {
                padding: 10px 15px;
                background: rgba(0, 0, 0, 0.2);
                margin-bottom: 5px;
                border-radius: 6px;
                border-left: 3px solid transparent;
            }

            .db-sync-list-item.danger { border-left-color: #ef4444; }
            .db-sync-list-item.warning { border-left-color: #f59e0b; }
            .db-sync-list-item.success { border-left-color: #10b981; }
            .db-sync-list-item.info { border-left-color: #3b82f6; }

            .db-sync-table-wrapper {
                overflow-x: auto;
            }

            .db-sync-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }

            .db-sync-table th,
            .db-sync-table td {
                padding: 10px 12px;
                text-align: left;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .db-sync-table th {
                background: rgba(139, 92, 246, 0.2);
                font-weight: 600;
            }

            .db-sync-table tr:hover {
                background: rgba(255,255,255,0.05);
            }

            .db-sync-sql {
                font-size: 11px;
                background: rgba(0,0,0,0.4);
                padding: 2px 6px;
                border-radius: 4px;
                word-break: break-all;
            }

            .db-sync-type-expected { color: #10b981; }
            .db-sync-type-actual { color: #f59e0b; }

            .db-sync-result-main {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 20px;
                border-radius: 10px;
                background: rgba(0, 0, 0, 0.3);
            }

            .db-sync-result-main.needs-sync { border: 2px solid #f59e0b; }
            .db-sync-result-main.synced { border: 2px solid #10b981; }
            .db-sync-result-main.dry-run { border: 2px solid #3b82f6; }
            .db-sync-result-main.executed { border: 2px solid #10b981; }

            .db-sync-result-icon { font-size: 32px; }
            .db-sync-result-text { font-size: 14px; color: rgba(255,255,255,0.9); }

            .db-sync-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                padding: 40px;
                color: rgba(255,255,255,0.7);
            }

            .db-sync-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(139, 92, 246, 0.3);
                border-top-color: #8b5cf6;
                border-radius: 50%;
                animation: db-sync-spin 1s linear infinite;
            }

            @keyframes db-sync-spin {
                to { transform: rotate(360deg); }
            }

            .db-sync-error {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 20px;
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid #ef4444;
                border-radius: 10px;
            }

            .db-sync-error-icon { font-size: 32px; }
            .db-sync-error-text { color: #fca5a5; }

            .db-sync-notification {
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

            .db-sync-notification.show {
                transform: translateY(0);
                opacity: 1;
            }

            .db-sync-notification-success { background: #10b981; }
            .db-sync-notification-error { background: #ef4444; }
            .db-sync-notification-warning { background: #f59e0b; color: #000; }
            .db-sync-notification-info { background: #3b82f6; }

            .db-sync-timestamp {
                font-size: 12px;
                color: rgba(255,255,255,0.5);
            }

            code {
                background: rgba(0,0,0,0.3);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Monaco', 'Consolas', monospace;
            }
        `;

        document.head.appendChild(styles);
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => DatabaseSync.init());
