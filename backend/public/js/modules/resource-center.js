/**
 * RESOURCE CENTER MODULE
 * Centro de Recursos - Tracking de horas trabajadas y utilización
 *
 * @version 1.0
 * @date 2025-10-16
 */

const ResourceCenter = {
    currentData: null,
    chartInstances: {},

    init() {
        console.log('📦 Iniciando Resource Center...');
        this.injectStyles();
        this.renderDashboard();
        this.attachEventListeners();
        this.loadDashboard();
    },

    injectStyles() {
        // Remove existing styles if any
        const existingStyle = document.getElementById('resource-center-styles');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'resource-center-styles';
        style.textContent = `
            .resource-center {
                padding: 20px;
            }

            .resource-center .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 2px solid #e0e0e0;
            }

            .resource-center .header-actions {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .resource-center .summary-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .resource-center .summary-card {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                text-align: center;
            }

            .resource-center .summary-card h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #666;
                text-transform: uppercase;
            }

            .resource-center .summary-card .value {
                font-size: 36px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 5px;
            }

            .resource-center .summary-card .unit {
                font-size: 14px;
                color: #999;
            }

            .resource-center .charts-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .resource-center .chart-container {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .resource-center .overload-section,
            .resource-center .employees-section,
            .resource-center .budget-section,
            .resource-center .comparison-section {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .resource-center .overload-card {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 4px;
            }

            .resource-center .overload-card.critical {
                background: #f8d7da;
                border-left-color: #dc3545;
            }

            .resource-center .overload-card.high {
                background: #f8d7da;
                border-left-color: #fd7e14;
            }

            .resource-center .overload-card.medium {
                background: #fff3cd;
                border-left-color: #ffc107;
            }

            .resource-center .overload-card.low {
                background: #d1ecf1;
                border-left-color: #17a2b8;
            }

            .resource-center .employees-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }

            .resource-center .employees-table th {
                background: #f8f9fa;
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #dee2e6;
            }

            .resource-center .employees-table td {
                padding: 12px;
                border-bottom: 1px solid #dee2e6;
            }

            .resource-center .employees-table tr:hover {
                background: #f8f9fa;
            }

            .resource-center .budget-card {
                background: #d1ecf1;
                border-left: 4px solid #17a2b8;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 4px;
            }

            .resource-center .budget-card.exceeded {
                background: #f8d7da;
                border-left-color: #dc3545;
            }

            .resource-center .comparison-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-top: 20px;
            }

            .resource-center .comparison-card {
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
        `;
        document.head.appendChild(style);
    },

    renderDashboard() {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="resource-center">
                <div class="header">
                    <h2>
                        <i class="fas fa-box"></i>
                        Centro de Recursos - Utilización de Horas
                    </h2>
                    <div class="header-actions">
                        <input type="date" id="resourceStartDate" class="form-control" />
                        <input type="date" id="resourceEndDate" class="form-control" />
                        <button class="btn btn-primary" id="loadResourceData">
                            <i class="fas fa-search"></i> Cargar Período
                        </button>
                        <button class="btn btn-success" id="recordTransaction">
                            <i class="fas fa-plus"></i> Registrar Horas
                        </button>
                    </div>
                </div>

                <div id="resourceLoading" class="loading-overlay" style="display: none;">
                    <div class="spinner"></div>
                    <p>Cargando datos de recursos...</p>
                </div>

                <!-- Summary -->
                <div id="resourceSummary" class="summary-section"></div>

                <!-- Charts -->
                <div class="charts-section">
                    <div class="chart-container">
                        <h3>Distribución de Horas por Categoría</h3>
                        <canvas id="hoursByCategory"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3>Utilización por Departamento</h3>
                        <canvas id="hoursByDepartment"></canvas>
                    </div>
                </div>

                <!-- Overload Alerts -->
                <div class="overload-section">
                    <h3>⚠️ Alertas de Sobrecarga de Trabajo</h3>
                    <div id="overloadAlerts"></div>
                </div>

                <!-- Top Employees -->
                <div class="employees-section">
                    <h3>Top Empleados por Utilización</h3>
                    <div id="employeesTable"></div>
                </div>

                <!-- Budget Alerts -->
                <div class="budget-section">
                    <h3>Alertas de Presupuesto (Horas)</h3>
                    <div id="budgetAlerts"></div>
                </div>

                <!-- Comparison -->
                <div class="comparison-section">
                    <h3>Comparación de Períodos</h3>
                    <button class="btn btn-secondary" id="loadResourceComparison">
                        <i class="fas fa-chart-line"></i> Comparar con Período Anterior
                    </button>
                    <div id="resourceComparisonContent"></div>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        document.getElementById('loadResourceData').addEventListener('click', () => {
            const start = document.getElementById('resourceStartDate').value;
            const end = document.getElementById('resourceEndDate').value;
            if (start && end) {
                this.loadSummary(start, end);
            } else {
                alert('Seleccione ambas fechas');
            }
        });

        document.getElementById('recordTransaction').addEventListener('click', () => {
            this.showRecordTransactionModal();
        });

        document.getElementById('loadResourceComparison').addEventListener('click', () => {
            this.loadComparison();
        });
    },

    async loadDashboard() {
        this.showLoading();

        try {
            const response = await fetch('/api/resources/dashboard', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar dashboard');

            const data = await response.json();
            this.currentData = data.dashboard;

            this.renderSummary(data.dashboard.summary);
            this.renderCharts(data.dashboard.by_category, data.dashboard.department_utilization);
            this.renderOverloadAlerts(data.dashboard.overload_alerts);
            this.renderEmployeesTable(data.dashboard.top_employees);
            this.renderBudgetAlerts(data.dashboard.budget_alerts);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar el dashboard de recursos');
        } finally {
            this.hideLoading();
        }
    },

    async loadSummary(startDate, endDate) {
        this.showLoading();

        try {
            const response = await fetch(`/api/resources/summary?start_date=${startDate}&end_date=${endDate}`, {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar resumen');

            const data = await response.json();
            this.renderSummary(data.summary);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar el resumen');
        } finally {
            this.hideLoading();
        }
    },

    renderSummary(summary) {
        const container = document.getElementById('resourceSummary');
        container.innerHTML = `
            <div class="summary-card">
                <h4>Total de Horas</h4>
                <div class="value">${(summary.total_hours || 0).toFixed(1)}</div>
                <div class="unit">horas registradas</div>
            </div>

            <div class="summary-card">
                <h4>Transacciones</h4>
                <div class="value">${summary.total_transactions || 0}</div>
                <div class="unit">registros</div>
            </div>

            <div class="summary-card">
                <h4>Categorías</h4>
                <div class="value">${(summary.by_category || []).length}</div>
                <div class="unit">categorías activas</div>
            </div>
        `;
    },

    renderCharts(byCategory, byDepartment) {
        // Chart 1: Hours by Category
        const ctx1 = document.getElementById('hoursByCategory').getContext('2d');
        if (this.chartInstances.category) this.chartInstances.category.destroy();

        const categories = byCategory || [];
        const categoryLabels = categories.map(c => this.translateCategory(c.category));
        const categoryData = categories.map(c => c.hours);
        const categoryColors = this.generateColors(categories.length);

        this.chartInstances.category = new Chart(ctx1, {
            type: 'pie',
            data: {
                labels: categoryLabels,
                datasets: [{
                    data: categoryData,
                    backgroundColor: categoryColors
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // Chart 2: Hours by Department
        const ctx2 = document.getElementById('hoursByDepartment').getContext('2d');
        if (this.chartInstances.department) this.chartInstances.department.destroy();

        const departments = byDepartment || [];
        const deptLabels = departments.map(d => d.department_name || 'Dept ' + d.department_id);
        const deptData = departments.map(d => d.total_hours);

        this.chartInstances.department = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: deptLabels,
                datasets: [{
                    label: 'Horas Totales',
                    data: deptData,
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },

    renderOverloadAlerts(alerts) {
        const container = document.getElementById('overloadAlerts');

        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<div class="no-data">✅ No se detectaron empleados con sobrecarga</div>';
            return;
        }

        let html = '';
        alerts.forEach(alert => {
            html += `
                <div class="overload-card ${alert.risk_level}">
                    <strong>${alert.employee_id}</strong> - Riesgo: ${alert.risk_level.toUpperCase()}<br>
                    Horas extra: ${alert.overtime_hours.toFixed(1)} horas<br>
                    Threshold: ${alert.threshold} horas
                </div>
            `;
        });

        container.innerHTML = html;
    },

    renderEmployeesTable(employees) {
        const container = document.getElementById('employeesTable');

        if (!employees || employees.length === 0) {
            container.innerHTML = '<div class="no-data">No hay datos de empleados</div>';
            return;
        }

        let html = `
            <table class="employees-table">
                <thead>
                    <tr>
                        <th>Empleado</th>
                        <th>Total Horas</th>
                        <th>Horas Extra</th>
                        <th>Transacciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        employees.forEach(emp => {
            html += `
                <tr>
                    <td><strong>${emp.employee_id}</strong></td>
                    <td>${emp.total_hours.toFixed(1)}h</td>
                    <td>${emp.overtime_hours.toFixed(1)}h</td>
                    <td>${emp.transaction_count}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    },

    renderBudgetAlerts(alerts) {
        const container = document.getElementById('budgetAlerts');

        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<div class="no-data">✅ No hay alertas de presupuesto</div>';
            return;
        }

        let html = '';
        alerts.forEach(alert => {
            const isExceeded = alert.current_hours > alert.budget_hours;
            html += `
                <div class="budget-card ${isExceeded ? 'exceeded' : ''}">
                    <strong>${alert.category}</strong><br>
                    Horas usadas: ${alert.current_hours.toFixed(1)} / ${alert.budget_hours} horas<br>
                    ${isExceeded ? '❌ Presupuesto excedido' : '✅ Dentro del presupuesto'}
                </div>
            `;
        });

        container.innerHTML = html;
    },

    async loadComparison() {
        this.showLoading();

        try {
            const response = await fetch('/api/resources/comparison', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar comparación');

            const data = await response.json();
            this.renderComparison(data.comparison);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar la comparación');
        } finally {
            this.hideLoading();
        }
    },

    renderComparison(comparison) {
        const container = document.getElementById('resourceComparisonContent');

        const current = comparison.current_period;
        const previous = comparison.previous_period;
        const change = comparison.change;

        container.innerHTML = `
            <div class="comparison-grid">
                <div class="comparison-card">
                    <h4>Período Actual</h4>
                    <p><strong>Total Horas:</strong> ${current.total_hours.toFixed(1)}h</p>
                    <p><strong>Transacciones:</strong> ${current.total_transactions}</p>
                </div>

                <div class="comparison-card">
                    <h4>Período Anterior</h4>
                    <p><strong>Total Horas:</strong> ${previous.total_hours.toFixed(1)}h</p>
                    <p><strong>Transacciones:</strong> ${previous.total_transactions}</p>
                </div>
            </div>

            <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 8px;">
                <h4>Cambios</h4>
                <p>
                    <strong>Horas:</strong> ${change.total_hours > 0 ? '+' : ''}${change.total_hours.toFixed(1)}h
                    (${change.total_hours_percent.toFixed(1)}%)
                </p>
                <p>
                    <strong>Transacciones:</strong> ${change.total_transactions > 0 ? '+' : ''}${change.total_transactions}
                    (${change.total_transactions_percent.toFixed(1)}%)
                </p>
            </div>
        `;
    },

    showRecordTransactionModal() {
        const employeeId = prompt('ID del empleado:');
        if (!employeeId) return;

        const category = prompt('Categoría (overtime, leave, training, medical_leave, shift_swaps):');
        if (!category) return;

        const hours = parseFloat(prompt('Cantidad de horas:'));
        if (!hours || hours <= 0) return;

        const description = prompt('Descripción:');
        if (!description) return;

        this.recordTransaction(employeeId, category, hours, description);
    },

    async recordTransaction(employeeId, category, hours, description) {
        this.showLoading();

        try {
            const response = await fetch('/api/resources/record', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                },
                body: JSON.stringify({
                    employee_id: employeeId,
                    category: category,
                    hours: hours,
                    description: description
                })
            });

            if (!response.ok) throw new Error('Error al registrar transacción');

            alert('✅ Transacción registrada exitosamente');
            this.loadDashboard();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al registrar la transacción');
        } finally {
            this.hideLoading();
        }
    },

    translateCategory(category) {
        const translations = {
            'overtime': 'Horas Extra',
            'leave': 'Licencias',
            'training': 'Capacitaciones',
            'medical_leave': 'Licencias Médicas',
            'shift_swaps': 'Cambios de Turno'
        };
        return translations[category] || category;
    },

    generateColors(count) {
        const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6c757d', '#fd7e14'];
        return Array(count).fill().map((_, i) => colors[i % colors.length]);
    },

    showLoading() {
        document.getElementById('resourceLoading').style.display = 'flex';
    },

    hideLoading() {
        document.getElementById('resourceLoading').style.display = 'none';
    },

    showError(message) {
        alert('❌ ' + message);
    }
};

window.ResourceCenter = ResourceCenter;
