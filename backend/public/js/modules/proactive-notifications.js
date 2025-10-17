/**
 * PROACTIVE NOTIFICATIONS MODULE
 * Notificaciones Proactivas - Detección preventiva de problemas
 *
 * @version 1.0
 * @date 2025-10-16
 */

const ProactiveNotifications = {
    currentRules: [],
    currentDashboard: null,

    init() {
        console.log('🔔 Iniciando Proactive Notifications...');
        this.injectStyles();
        this.renderDashboard();
        this.attachEventListeners();
        this.loadDashboard();
    },

    injectStyles() {
        // Remove existing styles if any
        const existingStyle = document.getElementById('proactive-notifications-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'proactive-notifications-styles';
        style.textContent = `
            .proactive-notifications { padding: 20px; }

            .proactive-notifications .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 2px solid #e0e0e0;
            }

            .proactive-notifications .header-actions {
                display: flex;
                gap: 10px;
            }

            .proactive-notifications .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .proactive-notifications .stat-card {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                text-align: center;
            }

            .proactive-notifications .stat-card .value {
                font-size: 32px;
                font-weight: bold;
                color: #007bff;
            }

            .proactive-notifications .rules-list,
            .proactive-notifications .execution-history {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .proactive-notifications .rule-card {
                background: #f8f9fa;
                border-left: 4px solid #007bff;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 4px;
            }

            .proactive-notifications .rule-card.critical {
                border-left-color: #dc3545;
            }

            .proactive-notifications .rule-card.high {
                border-left-color: #fd7e14;
            }

            .proactive-notifications .rule-card h4 {
                margin: 0 0 10px 0;
            }

            .proactive-notifications .rule-actions {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
        `;
        document.head.appendChild(style);
    },

    renderDashboard() {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="proactive-notifications">
                <div class="header">
                    <h2><i class="fas fa-bell"></i> Notificaciones Proactivas</h2>
                    <div class="header-actions">
                        <button class="btn btn-success" id="createRule"><i class="fas fa-plus"></i> Nueva Regla</button>
                        <button class="btn btn-primary" id="executeAll"><i class="fas fa-play"></i> Ejecutar Todas</button>
                        <button class="btn btn-info" id="refreshProactive"><i class="fas fa-sync"></i> Actualizar</button>
                    </div>
                </div>

                <div id="proactiveLoading" class="loading-overlay" style="display: none;">
                    <div class="spinner"></div>
                    <p>Ejecutando reglas proactivas...</p>
                </div>

                <div id="dashboardStats" class="stats-grid"></div>

                <div class="rules-list">
                    <h3>Reglas Activas</h3>
                    <div id="rulesTable"></div>
                </div>

                <div class="execution-history">
                    <h3>Historial de Ejecuciones</h3>
                    <div id="historyContent"></div>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        document.getElementById('createRule').addEventListener('click', () => this.createRule());
        document.getElementById('executeAll').addEventListener('click', () => this.executeAll());
        document.getElementById('refreshProactive').addEventListener('click', () => this.loadDashboard());
    },

    async loadDashboard() {
        this.showLoading();
        try {
            const response = await fetch('/api/proactive/dashboard', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar dashboard');

            const data = await response.json();
            this.currentDashboard = data.dashboard;
            this.renderStats(data.dashboard);
            this.loadRules();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar el dashboard');
        } finally {
            this.hideLoading();
        }
    },

    renderStats(dashboard) {
        document.getElementById('dashboardStats').innerHTML = `
            <div class="stat-card"><h4>Total Reglas</h4><div class="value">${dashboard.total_rules || 0}</div></div>
            <div class="stat-card"><h4>Reglas Activas</h4><div class="value">${dashboard.active_rules || 0}</div></div>
            <div class="stat-card"><h4>Última Ejecución</h4><div class="value" style="font-size: 16px;">${this.formatDate(dashboard.last_execution)}</div></div>
            <div class="stat-card"><h4>Detecciones Hoy</h4><div class="value">${dashboard.today_detections || 0}</div></div>
        `;
    },

    async loadRules() {
        try {
            const response = await fetch('/api/proactive/rules', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar reglas');

            const data = await response.json();
            this.currentRules = data.rules || [];
            this.renderRules(this.currentRules);
        } catch (error) {
            console.error('Error:', error);
        }
    },

    renderRules(rules) {
        const container = document.getElementById('rulesTable');
        if (!rules || rules.length === 0) {
            container.innerHTML = '<div class="no-data">No hay reglas configuradas</div>';
            return;
        }

        let html = '';
        rules.forEach(rule => {
            html += `
                <div class="rule-card ${rule.priority}">
                    <h4>${rule.rule_name}</h4>
                    <p><strong>Tipo:</strong> ${rule.rule_type} | <strong>Prioridad:</strong> ${rule.priority} | <strong>Frecuencia:</strong> ${rule.check_frequency}</p>
                    <p><strong>Acción:</strong> ${rule.auto_action}</p>
                    <div class="rule-actions">
                        <button class="btn btn-sm btn-primary" onclick="ProactiveNotifications.executeRule(${rule.id})">
                            <i class="fas fa-play"></i> Ejecutar
                        </button>
                        <button class="btn btn-sm btn-info" onclick="ProactiveNotifications.viewHistory(${rule.id})">
                            <i class="fas fa-history"></i> Historial
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="ProactiveNotifications.editRule(${rule.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="ProactiveNotifications.deleteRule(${rule.id})">
                            <i class="fas fa-trash"></i> Desactivar
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    async executeAll() {
        if (!confirm('¿Ejecutar todas las reglas proactivas ahora?')) return;
        this.showLoading();

        try {
            const response = await fetch('/api/proactive/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al ejecutar reglas');

            const data = await response.json();
            const totalMatches = data.results.reduce((sum, r) => sum + r.matched_count, 0);
            alert(`✅ Ejecución completada\n\nReglas ejecutadas: ${data.results.length}\nCasos detectados: ${totalMatches}`);
            this.loadDashboard();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al ejecutar las reglas');
        } finally {
            this.hideLoading();
        }
    },

    async executeRule(ruleId) {
        this.showLoading();

        try {
            const response = await fetch(`/api/proactive/rules/${ruleId}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al ejecutar regla');

            const data = await response.json();
            alert(`✅ Regla ejecutada\n\nCasos detectados: ${data.result.matched_count}`);
            this.loadDashboard();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al ejecutar la regla');
        } finally {
            this.hideLoading();
        }
    },

    async viewHistory(ruleId) {
        try {
            const response = await fetch(`/api/proactive/rules/${ruleId}/history`, {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar historial');

            const data = await response.json();
            this.showHistoryModal(data.history);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar el historial');
        }
    },

    showHistoryModal(history) {
        let message = 'Historial de Ejecuciones\n\n';
        history.slice(0, 10).forEach(h => {
            message += `${this.formatDate(h.execution_time)}\nDetecciones: ${h.matched_count}\nAcciones: ${h.actions_taken}\n\n`;
        });
        alert(message);
    },

    createRule() {
        const ruleName = prompt('Nombre de la regla:');
        if (!ruleName) return;

        const ruleType = prompt('Tipo (vacation_expiry, overtime_limit, rest_violation, document_expiry, certificate_expiry):');
        if (!ruleType) return;

        const priority = prompt('Prioridad (low, medium, high, critical):');
        if (!priority) return;

        const frequency = prompt('Frecuencia (realtime, hourly, daily, weekly):');
        if (!frequency) return;

        const autoAction = prompt('Acción automática (create_notification, send_alert, block_action):');
        if (!autoAction) return;

        const threshold = prompt('Threshold (JSON):');
        if (!threshold) return;

        this.saveRule({
            rule_name: ruleName,
            rule_type: ruleType,
            priority: priority,
            check_frequency: frequency,
            auto_action: autoAction,
            trigger_threshold: JSON.parse(threshold),
            notification_recipients: ['employee', 'rrhh']
        });
    },

    async saveRule(ruleData) {
        this.showLoading();

        try {
            const response = await fetch('/api/proactive/rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                },
                body: JSON.stringify(ruleData)
            });

            if (!response.ok) throw new Error('Error al crear regla');

            alert('✅ Regla creada exitosamente');
            this.loadDashboard();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al crear la regla');
        } finally {
            this.hideLoading();
        }
    },

    async editRule(ruleId) {
        const rule = this.currentRules.find(r => r.id === ruleId);
        if (!rule) return;

        // Simplificado: solo permitir cambiar prioridad y frecuencia
        const priority = prompt('Nueva prioridad:', rule.priority);
        if (!priority) return;

        const frequency = prompt('Nueva frecuencia:', rule.check_frequency);
        if (!frequency) return;

        this.updateRule(ruleId, { priority, check_frequency: frequency });
    },

    async updateRule(ruleId, updates) {
        this.showLoading();

        try {
            const response = await fetch(`/api/proactive/rules/${ruleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Error al actualizar regla');

            alert('✅ Regla actualizada exitosamente');
            this.loadDashboard();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al actualizar la regla');
        } finally {
            this.hideLoading();
        }
    },

    async deleteRule(ruleId) {
        if (!confirm('¿Desactivar esta regla?')) return;

        this.showLoading();

        try {
            const response = await fetch(`/api/proactive/rules/${ruleId}`, {
                method: 'DELETE',
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al desactivar regla');

            alert('✅ Regla desactivada exitosamente');
            this.loadDashboard();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al desactivar la regla');
        } finally {
            this.hideLoading();
        }
    },

    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('es-AR');
    },

    showLoading() {
        document.getElementById('proactiveLoading').style.display = 'flex';
    },

    hideLoading() {
        document.getElementById('proactiveLoading').style.display = 'none';
    },

    showError(message) {
        alert('❌ ' + message);
    }
};

window.ProactiveNotifications = ProactiveNotifications;
