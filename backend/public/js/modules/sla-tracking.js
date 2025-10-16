/**
 * SLA TRACKING MODULE
 * Tracking de SLA - Métricas de tiempos de respuesta y rankings
 *
 * @version 1.0
 * @date 2025-10-16
 */

const SLATracking = {
    currentData: null,
    currentPeriod: null,

    init() {
        console.log('⏱️ Iniciando SLA Tracking...');
        this.renderDashboard();
        this.attachEventListeners();
        this.loadDashboard();
    },

    renderDashboard() {
        const container = document.getElementById('mainContent');
        container.innerHTML = `
            <div class="sla-tracking">
                <div class="header">
                    <h2>
                        <i class="fas fa-stopwatch"></i>
                        SLA Tracking - Tiempos de Respuesta
                    </h2>
                    <div class="header-actions">
                        <input type="date" id="slaStartDate" class="form-control" />
                        <input type="date" id="slaEndDate" class="form-control" />
                        <button class="btn btn-primary" id="loadSLAData">
                            <i class="fas fa-search"></i> Cargar Período
                        </button>
                        <button class="btn btn-info" id="refreshSLA">
                            <i class="fas fa-sync"></i> Actualizar
                        </button>
                    </div>
                </div>

                <div id="slaLoading" class="loading-overlay" style="display: none;">
                    <div class="spinner"></div>
                    <p>Calculando métricas SLA...</p>
                </div>

                <!-- Global Metrics -->
                <div id="globalMetrics" class="metrics-section"></div>

                <!-- Rankings -->
                <div class="rankings-section">
                    <h3>Rankings de Aprobadores</h3>
                    <div class="tabs">
                        <button class="tab-btn active" data-tab="fastest">⚡ Más Rápidos</button>
                        <button class="tab-btn" data-tab="slowest">🐌 Más Lentos</button>
                        <button class="tab-btn" data-tab="all">📊 Todos</button>
                    </div>
                    <div id="rankingsTable"></div>
                </div>

                <!-- Bottlenecks -->
                <div class="bottlenecks-section">
                    <h3>Cuellos de Botella Detectados</h3>
                    <div id="bottlenecksContent"></div>
                </div>

                <!-- Comparison -->
                <div class="comparison-section">
                    <h3>Comparación de Períodos</h3>
                    <button class="btn btn-secondary" id="loadComparison">
                        <i class="fas fa-chart-line"></i> Comparar con Período Anterior
                    </button>
                    <div id="comparisonContent"></div>
                </div>
            </div>

            <style>
                .sla-tracking {
                    padding: 20px;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #e0e0e0;
                }

                .header-actions {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .metrics-section {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .metric-card {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    text-align: center;
                }

                .metric-card h4 {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    color: #666;
                    text-transform: uppercase;
                }

                .metric-card .value {
                    font-size: 32px;
                    font-weight: bold;
                    color: #007bff;
                    margin-bottom: 5px;
                }

                .metric-card .unit {
                    font-size: 14px;
                    color: #999;
                }

                .rankings-section, .bottlenecks-section, .comparison-section {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }

                .tab-btn {
                    padding: 10px 20px;
                    border: none;
                    background: #f8f9fa;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .tab-btn.active {
                    background: #007bff;
                    color: white;
                }

                .tab-btn:hover {
                    background: #e9ecef;
                }

                .tab-btn.active:hover {
                    background: #0056b3;
                }

                .ranking-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .ranking-table th {
                    background: #f8f9fa;
                    padding: 12px;
                    text-align: left;
                    border-bottom: 2px solid #dee2e6;
                }

                .ranking-table td {
                    padding: 12px;
                    border-bottom: 1px solid #dee2e6;
                }

                .ranking-table tr:hover {
                    background: #f8f9fa;
                }

                .rank-badge {
                    display: inline-block;
                    width: 30px;
                    height: 30px;
                    line-height: 30px;
                    text-align: center;
                    border-radius: 50%;
                    font-weight: bold;
                    color: white;
                }

                .rank-badge.gold { background: #ffd700; color: #333; }
                .rank-badge.silver { background: #c0c0c0; color: #333; }
                .rank-badge.bronze { background: #cd7f32; color: white; }
                .rank-badge.other { background: #6c757d; color: white; }

                .progress-bar {
                    height: 20px;
                    background: #e9ecef;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: #28a745;
                    transition: width 0.3s;
                }

                .progress-fill.low { background: #dc3545; }
                .progress-fill.medium { background: #ffc107; }
                .progress-fill.high { background: #28a745; }

                .bottleneck-card {
                    background: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                }

                .bottleneck-card.critical {
                    background: #f8d7da;
                    border-left-color: #dc3545;
                }

                .comparison-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-top: 20px;
                }

                .comparison-card {
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }

                .comparison-card h4 {
                    margin: 0 0 15px 0;
                }

                .trend-indicator {
                    display: inline-block;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                }

                .trend-indicator.up {
                    background: #d4edda;
                    color: #155724;
                }

                .trend-indicator.down {
                    background: #f8d7da;
                    color: #721c24;
                }
            </style>
        `;
    },

    attachEventListeners() {
        // Load SLA data
        document.getElementById('loadSLAData').addEventListener('click', () => {
            const start = document.getElementById('slaStartDate').value;
            const end = document.getElementById('slaEndDate').value;
            if (start && end) {
                this.loadMetrics(start, end);
            } else {
                alert('Seleccione ambas fechas');
            }
        });

        // Refresh
        document.getElementById('refreshSLA').addEventListener('click', () => {
            this.loadDashboard();
        });

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadRankings(e.target.dataset.tab);
            });
        });

        // Comparison
        document.getElementById('loadComparison').addEventListener('click', () => {
            this.loadComparison();
        });
    },

    async loadDashboard() {
        this.showLoading();

        try {
            const response = await fetch('/api/sla/dashboard', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar dashboard');

            const data = await response.json();
            this.currentData = data.dashboard;
            this.currentPeriod = data.dashboard.period;

            this.renderGlobalMetrics(data.dashboard.global_metrics);
            this.loadRankings('fastest');
            this.loadBottlenecks();
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar el dashboard de SLA');
        } finally {
            this.hideLoading();
        }
    },

    async loadMetrics(startDate, endDate) {
        this.showLoading();

        try {
            const response = await fetch(`/api/sla/metrics?start_date=${startDate}&end_date=${endDate}`, {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar métricas');

            const data = await response.json();
            this.currentData = data;
            this.currentPeriod = { start_date: startDate, end_date: endDate };

            this.renderGlobalMetrics(data.global_metrics);
            this.loadRankings('fastest');
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al cargar las métricas');
        } finally {
            this.hideLoading();
        }
    },

    renderGlobalMetrics(metrics) {
        const container = document.getElementById('globalMetrics');
        container.innerHTML = `
            <div class="metric-card">
                <h4>Total Solicitudes</h4>
                <div class="value">${metrics.total_requests || 0}</div>
                <div class="unit">en el período</div>
            </div>

            <div class="metric-card">
                <h4>Tiempo Promedio</h4>
                <div class="value">${(metrics.avg_response_hours || 0).toFixed(1)}</div>
                <div class="unit">horas</div>
            </div>

            <div class="metric-card">
                <h4>Tiempo Mediano</h4>
                <div class="value">${(metrics.median_response_hours || 0).toFixed(1)}</div>
                <div class="unit">horas</div>
            </div>

            <div class="metric-card">
                <h4>Tiempo Mínimo</h4>
                <div class="value">${(metrics.min_response_hours || 0).toFixed(1)}</div>
                <div class="unit">horas</div>
            </div>

            <div class="metric-card">
                <h4>Tiempo Máximo</h4>
                <div class="value">${(metrics.max_response_hours || 0).toFixed(1)}</div>
                <div class="unit">horas</div>
            </div>

            <div class="metric-card">
                <h4>Cumplimiento SLA</h4>
                <div class="value">${(metrics.sla_compliance_percent || 0).toFixed(1)}%</div>
                <div class="unit">dentro de target</div>
            </div>
        `;
    },

    async loadRankings(type) {
        try {
            let url = '/api/sla/ranking';
            if (type === 'fastest') url += '?sort_by=avg&order=asc';
            if (type === 'slowest') url += '?sort_by=avg&order=desc';

            const response = await fetch(url, {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar rankings');

            const data = await response.json();
            this.renderRankings(data.ranking, type);
        } catch (error) {
            console.error('Error:', error);
        }
    },

    renderRankings(ranking, type) {
        const container = document.getElementById('rankingsTable');

        if (!ranking || ranking.length === 0) {
            container.innerHTML = '<div class="no-data">No hay datos de rankings disponibles</div>';
            return;
        }

        let html = `
            <table class="ranking-table">
                <thead>
                    <tr>
                        <th>Posición</th>
                        <th>Aprobador</th>
                        <th>Solicitudes</th>
                        <th>Promedio</th>
                        <th>Mediana</th>
                        <th>SLA Compliance</th>
                    </tr>
                </thead>
                <tbody>
        `;

        ranking.forEach((r, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'other';
            const slaPercent = r.sla_compliance_percent || 0;
            const progressClass = slaPercent >= 90 ? 'high' : slaPercent >= 70 ? 'medium' : 'low';

            html += `
                <tr>
                    <td><span class="rank-badge ${rankClass}">${r.position}</span></td>
                    <td><strong>${r.approver_id}</strong></td>
                    <td>${r.total_requests}</td>
                    <td>${r.avg_response_hours.toFixed(1)}h</td>
                    <td>${r.median_response_hours.toFixed(1)}h</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass}" style="width: ${slaPercent}%"></div>
                        </div>
                        ${slaPercent.toFixed(1)}%
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

    async loadBottlenecks() {
        try {
            const response = await fetch('/api/sla/bottlenecks', {
                headers: {
                    'x-company-id': sessionStorage.getItem('company_id') || '11',
                    'x-role': sessionStorage.getItem('role') || 'rrhh'
                }
            });

            if (!response.ok) throw new Error('Error al cargar bottlenecks');

            const data = await response.json();
            this.renderBottlenecks(data.bottlenecks);
        } catch (error) {
            console.error('Error:', error);
        }
    },

    renderBottlenecks(bottlenecks) {
        const container = document.getElementById('bottlenecksContent');

        const slowApprovers = bottlenecks.slow_approvers || [];
        const highViolations = bottlenecks.high_sla_violations || [];

        if (slowApprovers.length === 0 && highViolations.length === 0) {
            container.innerHTML = '<div class="no-data">✅ No se detectaron cuellos de botella</div>';
            return;
        }

        let html = '';

        if (slowApprovers.length > 0) {
            html += '<h4>Aprobadores Lentos</h4>';
            slowApprovers.forEach(approver => {
                html += `
                    <div class="bottleneck-card">
                        <strong>${approver.approver_id}</strong><br>
                        Tiempo promedio: ${approver.avg_response_hours.toFixed(1)} horas<br>
                        Solicitudes: ${approver.total_requests}
                    </div>
                `;
            });
        }

        if (highViolations.length > 0) {
            html += '<h4 style="margin-top: 20px;">Tipos de Solicitud con Alta Violación de SLA</h4>';
            highViolations.forEach(type => {
                html += `
                    <div class="bottleneck-card critical">
                        <strong>${type.request_type}</strong><br>
                        SLA Compliance: ${type.sla_compliance_percent.toFixed(1)}%<br>
                        Violaciones: ${type.outside_sla_count} de ${type.total_requests}
                    </div>
                `;
            });
        }

        container.innerHTML = html;
    },

    async loadComparison() {
        this.showLoading();

        try {
            const response = await fetch('/api/sla/comparison', {
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
        const container = document.getElementById('comparisonContent');

        const current = comparison.current_period;
        const previous = comparison.previous_period;
        const change = comparison.change;

        container.innerHTML = `
            <div class="comparison-grid">
                <div class="comparison-card">
                    <h4>Período Actual</h4>
                    <p><strong>Solicitudes:</strong> ${current.total_requests}</p>
                    <p><strong>Promedio:</strong> ${current.avg_response_hours.toFixed(1)}h</p>
                    <p><strong>SLA Compliance:</strong> ${current.sla_compliance_percent.toFixed(1)}%</p>
                </div>

                <div class="comparison-card">
                    <h4>Período Anterior</h4>
                    <p><strong>Solicitudes:</strong> ${previous.total_requests}</p>
                    <p><strong>Promedio:</strong> ${previous.avg_response_hours.toFixed(1)}h</p>
                    <p><strong>SLA Compliance:</strong> ${previous.sla_compliance_percent.toFixed(1)}%</p>
                </div>
            </div>

            <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 8px;">
                <h4>Cambios</h4>
                <p>
                    <strong>Tiempo de Respuesta:</strong>
                    <span class="trend-indicator ${change.avg_response_hours < 0 ? 'up' : 'down'}">
                        ${change.avg_response_hours > 0 ? '+' : ''}${change.avg_response_hours.toFixed(1)}h
                        ${change.avg_response_hours < 0 ? '(Mejoró ✅)' : '(Empeoró ❌)'}
                    </span>
                </p>
                <p>
                    <strong>SLA Compliance:</strong>
                    <span class="trend-indicator ${change.sla_compliance_percent > 0 ? 'up' : 'down'}">
                        ${change.sla_compliance_percent > 0 ? '+' : ''}${change.sla_compliance_percent.toFixed(1)}%
                        ${change.sla_compliance_percent > 0 ? '(Mejoró ✅)' : '(Empeoró ❌)'}
                    </span>
                </p>
            </div>
        `;
    },

    showLoading() {
        document.getElementById('slaLoading').style.display = 'flex';
    },

    hideLoading() {
        document.getElementById('slaLoading').style.display = 'none';
    },

    showError(message) {
        alert('❌ ' + message);
    }
};

window.SLATracking = SLATracking;
