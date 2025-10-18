/**
 * COMPLIANCE DASHBOARD MODULE
 * Dashboard de Cumplimiento Legal - Detección automática de violaciones
 *
 * @version 1.0
 * @date 2025-10-16
 */

const ComplianceDashboard = {
    currentData: null,
    currentViolations: [],
    currentFilters: {
        severity: 'all',
        status: 'all',
        rule_type: 'all'
    },

    /**
     * Inicializar módulo
     */
    init() {
        console.log('🔍 Iniciando Compliance Dashboard...');
        this.injectStyles();
        this.renderDashboard();
        this.attachEventListeners();
        this.loadDashboard();
    },

    injectStyles() {
        // Remove existing styles if any
        const existingStyle = document.getElementById('compliance-dashboard-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'compliance-dashboard-styles';
        style.textContent = `
            .compliance-dashboard {
                padding: 20px;
            }

            .compliance-dashboard .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 2px solid #e0e0e0;
            }

            .compliance-dashboard .header h2 {
                margin: 0;
                color: #333;
            }

            .compliance-dashboard .header-actions {
                display: flex;
                gap: 10px;
            }

            .compliance-dashboard .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .compliance-dashboard .stat-card {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                border-left: 4px solid #007bff;
            }

            .compliance-dashboard .stat-card.critical { border-left-color: #dc3545; }
            .compliance-dashboard .stat-card.high { border-left-color: #fd7e14; }
            .compliance-dashboard .stat-card.warning { border-left-color: #ffc107; }
            .compliance-dashboard .stat-card.success { border-left-color: #28a745; }

            .compliance-dashboard .stat-card h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #666;
                text-transform: uppercase;
            }

            .compliance-dashboard .stat-card .value {
                font-size: 36px;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }

            .compliance-dashboard .stat-card .label {
                font-size: 14px;
                color: #999;
            }

            .compliance-dashboard .filters-section {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .compliance-dashboard .filters-row {
                display: flex;
                gap: 15px;
                align-items: flex-end;
                flex-wrap: wrap;
            }

            .compliance-dashboard .filter-group {
                flex: 1;
                min-width: 200px;
            }

            .compliance-dashboard .filter-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #555;
            }

            .compliance-dashboard .violations-section, .compliance-dashboard .rules-section {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .compliance-dashboard .violations-table, .compliance-dashboard .rules-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }

            .compliance-dashboard .violations-table th, .compliance-dashboard .rules-table th {
                background: #f8f9fa;
                padding: 12px;
                text-align: left;
                font-weight: 600;
                color: #333;
                border-bottom: 2px solid #dee2e6;
            }

            .compliance-dashboard .violations-table td, .compliance-dashboard .rules-table td {
                padding: 12px;
                border-bottom: 1px solid #dee2e6;
            }

            .compliance-dashboard .violations-table tr:hover, .compliance-dashboard .rules-table tr:hover {
                background: #f8f9fa;
            }

            .compliance-dashboard .badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }

            .compliance-dashboard .badge-critical { background: #dc3545; color: white; }
            .compliance-dashboard .badge-high { background: #fd7e14; color: white; }
            .compliance-dashboard .badge-warning { background: #ffc107; color: #333; }
            .compliance-dashboard .badge-info { background: #17a2b8; color: white; }
            .compliance-dashboard .badge-active { background: #dc3545; color: white; }
            .compliance-dashboard .badge-resolved { background: #28a745; color: white; }

            .compliance-dashboard .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.9);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            }

            .compliance-dashboard .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .compliance-dashboard .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s;
            }

            .compliance-dashboard .btn-primary {
                background: #007bff;
                color: white;
            }

            .compliance-dashboard .btn-primary:hover {
                background: #0056b3;
            }

            .compliance-dashboard .btn-secondary {
                background: #6c757d;
                color: white;
            }

            .compliance-dashboard .btn-secondary:hover {
                background: #5a6268;
            }

            .compliance-dashboard .btn-info {
                background: #17a2b8;
                color: white;
            }

            .compliance-dashboard .btn-info:hover {
                background: #138496;
            }

            .compliance-dashboard .btn-success {
                background: #28a745;
                color: white;
            }

            .compliance-dashboard .btn-success:hover {
                background: #218838;
            }

            .compliance-dashboard .btn-danger {
                background: #dc3545;
                color: white;
            }

            .compliance-dashboard .btn-danger:hover {
                background: #c82333;
            }

            .compliance-dashboard .btn-sm {
                padding: 5px 10px;
                font-size: 12px;
            }

            .compliance-dashboard .no-data {
                text-align: center;
                padding: 40px;
                color: #999;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Renderizar interfaz
     */
    renderDashboard() {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="compliance-dashboard">
                <div class="header">
                    <h2>
                        <i class="fas fa-balance-scale"></i>
                        Dashboard de Cumplimiento Legal
                    </h2>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="validateCompliance">
                            <i class="fas fa-check-circle"></i> Validar Cumplimiento
                        </button>
                        <button class="btn btn-secondary" id="scheduleValidation">
                            <i class="fas fa-clock"></i> Programar Validación
                        </button>
                        <button class="btn btn-info" id="refreshDashboard">
                            <i class="fas fa-sync"></i> Actualizar
                        </button>
                    </div>
                </div>

                <!-- Loading -->
                <div id="complianceLoading" class="loading-overlay" style="display: none;">
                    <div class="spinner"></div>
                    <p>Cargando datos de cumplimiento...</p>
                </div>

                <!-- Statistics Cards -->
                <div id="complianceStats" class="stats-grid" style="display: none;"></div>

                <!-- Filters -->
                <div class="filters-section">
                    <h3>Filtros</h3>
                    <div class="filters-row">
                        <div class="filter-group">
                            <label>Severidad:</label>
                            <select id="filterSeverity" class="form-control">
                                <option value="all">Todas</option>
                                <option value="critical">Críticas</option>
                                <option value="high">Altas</option>
                                <option value="warning">Advertencias</option>
                                <option value="info">Informativas</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Estado:</label>
                            <select id="filterStatus" class="form-control">
                                <option value="all">Todos</option>
                                <option value="active">Activas</option>
                                <option value="resolved">Resueltas</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Tipo de Regla:</label>
                            <select id="filterRuleType" class="form-control">
                                <option value="all">Todos</option>
                                <option value="rest_period">Período de Descanso</option>
                                <option value="overtime_limit">Límite Horas Extra</option>
                                <option value="vacation_expiry">Vencimiento Vacaciones</option>
                                <option value="working_hours">Horas de Trabajo</option>
                                <option value="documentation">Documentación</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <button id="applyFilters" class="btn btn-primary">
                                <i class="fas fa-filter"></i> Aplicar Filtros
                            </button>
                            <button id="clearFilters" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Limpiar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Violations Table -->
                <div class="violations-section">
                    <h3>Violaciones Detectadas</h3>
                    <div id="violationsTable"></div>
                </div>

                <!-- Active Rules -->
                <div class="rules-section">
                    <h3>Reglas de Cumplimiento Activas</h3>
                    <div id="rulesTable"></div>
                </div>
            </div>
        `;
    },

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        // Validar cumplimiento
        document.getElementById('validateCompliance').addEventListener('click', () => {
            this.validateCompliance();
        });

        // Actualizar dashboard
        document.getElementById('refreshDashboard').addEventListener('click', () => {
            this.loadDashboard();
        });

        // Programar validación
        document.getElementById('scheduleValidation').addEventListener('click', () => {
            this.scheduleValidation();
        });

        // Aplicar filtros
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
        });

        // Limpiar filtros
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });
    },

    /**
     * Cargar dashboard
     */
    async loadDashboard() {
        this.showLoading();

        try {
            const response = await fetch('/api/compliance/dashboard', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar dashboard');

            const data = await response.json();
            this.currentData = data.dashboard;
            this.renderStats(data.dashboard);
            this.loadViolations();
            this.loadRules();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar el dashboard de cumplimiento');
        } finally {
            this.hideLoading();
        }
    },

    /**
     * Renderizar estadísticas
     */
    renderStats(dashboard) {
        const statsContainer = document.getElementById('complianceStats');
        statsContainer.style.display = 'grid';

        statsContainer.innerHTML = `
            <div class="stat-card">
                <h4>Total de Reglas</h4>
                <div class="value">${dashboard.total_rules || 0}</div>
                <div class="label">Reglas activas de validación</div>
            </div>

            <div class="stat-card critical">
                <h4>Violaciones Activas</h4>
                <div class="value">${dashboard.total_violations || 0}</div>
                <div class="label">Requieren atención</div>
            </div>

            <div class="stat-card warning">
                <h4>Violaciones Críticas</h4>
                <div class="value">${dashboard.critical_violations || 0}</div>
                <div class="label">Prioridad alta</div>
            </div>

            <div class="stat-card success">
                <h4>Cumplimiento</h4>
                <div class="value">${dashboard.compliance_percent || 0}%</div>
                <div class="label">Porcentaje de cumplimiento</div>
            </div>

            <div class="stat-card">
                <h4>Empleados Afectados</h4>
                <div class="value">${dashboard.affected_employees || 0}</div>
                <div class="label">Con al menos una violación</div>
            </div>

            <div class="stat-card high">
                <h4>Última Validación</h4>
                <div class="value" style="font-size: 18px;">${this.formatDate(dashboard.last_check)}</div>
                <div class="label">Última ejecución de reglas</div>
            </div>
        `;
    },

    /**
     * Cargar violaciones
     */
    async loadViolations() {
        try {
            const response = await fetch('/api/compliance/violations?limit=100', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar violaciones');

            const data = await response.json();
            this.currentViolations = data.violations || [];
            this.renderViolations(this.currentViolations);
        } catch (error) {
            console.error('Error:', error);
        }
    },

    /**
     * Renderizar tabla de violaciones
     */
    renderViolations(violations) {
        const container = document.getElementById('violationsTable');

        if (!violations || violations.length === 0) {
            container.innerHTML = '<div class="no-data">✅ No se encontraron violaciones activas</div>';
            return;
        }

        let html = `
            <table class="violations-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Referencia Legal</th>
                        <th>Empleado</th>
                        <th>Fecha</th>
                        <th>Severidad</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        violations.forEach(v => {
            html += `
                <tr>
                    <td><strong>${v.rule_code}</strong></td>
                    <td>${v.legal_reference || 'N/A'}</td>
                    <td>${v.employee_id || 'N/A'}</td>
                    <td>${this.formatDate(v.violation_date)}</td>
                    <td><span class="badge badge-${v.severity}">${this.translateSeverity(v.severity)}</span></td>
                    <td><span class="badge badge-${v.status}">${this.translateStatus(v.status)}</span></td>
                    <td>
                        ${v.status === 'active' ? `
                            <button class="btn btn-success btn-sm" onclick="ComplianceDashboard.resolveViolation(${v.id})">
                                <i class="fas fa-check"></i> Resolver
                            </button>
                        ` : `
                            <button class="btn btn-info btn-sm" onclick="ComplianceDashboard.viewViolationDetails(${v.id})">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    },

    /**
     * Cargar reglas activas
     */
    async loadRules() {
        try {
            const response = await fetch('/api/compliance/rules', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar reglas');

            const data = await response.json();
            this.renderRules(data.rules || []);
        } catch (error) {
            console.error('Error:', error);
        }
    },

    /**
     * Renderizar tabla de reglas
     */
    renderRules(rules) {
        const container = document.getElementById('rulesTable');

        if (!rules || rules.length === 0) {
            container.innerHTML = '<div class="no-data">No hay reglas configuradas</div>';
            return;
        }

        let html = `
            <table class="rules-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Referencia Legal</th>
                        <th>Tipo</th>
                        <th>Severidad</th>
                        <th>Frecuencia</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
        `;

        rules.forEach(r => {
            html += `
                <tr>
                    <td><strong>${r.rule_code}</strong></td>
                    <td>${r.legal_reference || 'N/A'}</td>
                    <td>${r.rule_type || 'N/A'}</td>
                    <td><span class="badge badge-${r.severity}">${this.translateSeverity(r.severity)}</span></td>
                    <td>${r.check_frequency || 'N/A'}</td>
                    <td>${r.active ? '✅ Activa' : '❌ Inactiva'}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    },

    /**
     * Validar cumplimiento manualmente
     */
    async validateCompliance() {
        if (!confirm('¿Ejecutar validación de cumplimiento ahora?')) return;

        this.showLoading();

        try {
            const response = await fetch('/api/compliance/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al validar cumplimiento');

            const data = await response.json();

            alert(`✅ Validación completada:\n\n` +
                  `Total de reglas: ${data.result.total_rules}\n` +
                  `Violaciones encontradas: ${data.result.violations.length}\n` +
                  `Reglas aprobadas: ${data.result.passed.length}\n` +
                  `Cumplimiento: ${data.result.compliance_percent}%`);

            this.loadDashboard();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al ejecutar la validación');
        } finally {
            this.hideLoading();
        }
    },

    /**
     * Resolver violación
     */
    async resolveViolation(violationId) {
        const notes = prompt('Ingrese notas de resolución:');
        if (!notes) return;

        try {
            const response = await fetch(`/api/compliance/violations/${violationId}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                },
                body: JSON.stringify({ resolution_notes: notes })
            });

            if (!response.ok) throw new Error('Error al resolver violación');

            alert('✅ Violación resuelta exitosamente');
            this.loadViolations();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al resolver la violación');
        }
    },

    /**
     * Ver detalles de violación
     */
    viewViolationDetails(violationId) {
        const violation = this.currentViolations.find(v => v.id === violationId);
        if (!violation) return;

        alert(`Detalles de Violación\n\n` +
              `Código: ${violation.rule_code}\n` +
              `Referencia Legal: ${violation.legal_reference}\n` +
              `Empleado: ${violation.employee_id}\n` +
              `Fecha: ${this.formatDate(violation.violation_date)}\n` +
              `Severidad: ${this.translateSeverity(violation.severity)}\n` +
              `Estado: ${this.translateStatus(violation.status)}\n` +
              `Notas: ${violation.resolution_notes || 'Sin notas'}`);
    },

    /**
     * Programar validación
     */
    async scheduleValidation() {
        const frequency = prompt('Ingrese frecuencia (realtime, daily, weekly):');
        if (!frequency) return;

        try {
            const response = await fetch('/api/compliance/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                },
                body: JSON.stringify({ frequency })
            });

            if (!response.ok) throw new Error('Error al programar validación');

            alert('✅ Validación programada exitosamente');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al programar la validación');
        }
    },

    /**
     * Aplicar filtros
     */
    applyFilters() {
        this.currentFilters = {
            severity: document.getElementById('filterSeverity').value,
            status: document.getElementById('filterStatus').value,
            rule_type: document.getElementById('filterRuleType').value
        };

        let filtered = [...this.currentViolations];

        if (this.currentFilters.severity !== 'all') {
            filtered = filtered.filter(v => v.severity === this.currentFilters.severity);
        }

        if (this.currentFilters.status !== 'all') {
            filtered = filtered.filter(v => v.status === this.currentFilters.status);
        }

        if (this.currentFilters.rule_type !== 'all') {
            filtered = filtered.filter(v => v.rule_type === this.currentFilters.rule_type);
        }

        this.renderViolations(filtered);
    },

    /**
     * Limpiar filtros
     */
    clearFilters() {
        document.getElementById('filterSeverity').value = 'all';
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('filterRuleType').value = 'all';
        this.currentFilters = { severity: 'all', status: 'all', rule_type: 'all' };
        this.renderViolations(this.currentViolations);
    },

    /**
     * Utilidades
     */
    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('es-AR');
    },

    translateSeverity(severity) {
        const translations = {
            'critical': 'Crítica',
            'high': 'Alta',
            'warning': 'Advertencia',
            'info': 'Informativa'
        };
        return translations[severity] || severity;
    },

    translateStatus(status) {
        const translations = {
            'active': 'Activa',
            'resolved': 'Resuelta',
            'exempted': 'Exenta'
        };
        return translations[status] || status;
    },

    showLoading() {
        document.getElementById('complianceLoading').style.display = 'flex';
    },

    hideLoading() {
        document.getElementById('complianceLoading').style.display = 'none';
    },

    showError(message) {
        alert('❌ ' + message);
    }
};

// Exportar para uso global
window.ComplianceDashboard = ComplianceDashboard;

// Función wrapper para integración con panel-empresa.html
function showComplianceDashboardContent() {
    console.log('🔄 [MODULE] Ejecutando showComplianceDashboardContent()');
    ComplianceDashboard.init();
}

// Exportar función wrapper
window.showComplianceDashboardContent = showComplianceDashboardContent;
