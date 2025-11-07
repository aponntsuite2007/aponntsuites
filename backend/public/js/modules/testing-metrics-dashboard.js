/**
 * TESTING METRICS DASHBOARD
 * Dashboard de métricas históricas para sistema de testing
 */

const TestingMetricsDashboard = (function() {
    'use strict';

    let charts = {
        successRate: null,
        duration: null,
        byModule: null
    };

    function init() {
        console.log('📊 [METRICS-DASHBOARD] Inicializando...');

        // Event listeners
        document.getElementById('btnLoadMetrics')?.addEventListener('click', loadMetrics);

        // Cargar empresas en filtro
        loadCompaniesFilter();

        console.log('✅ [METRICS-DASHBOARD] Inicializado');
    }

    async function loadCompaniesFilter() {
        try {
            const response = await fetch('/api/aponnt/dashboard/companies');
            const data = await response.json();

            const select = document.getElementById('metricsCompanyFilter');
            if (select && data.success && data.companies) {
                data.companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.id;
                    option.textContent = company.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar empresas:', error);
        }
    }

    async function loadMetrics() {
        const companyId = document.getElementById('metricsCompanyFilter')?.value;
        const environment = document.getElementById('metricsEnvironmentFilter')?.value;
        const module = document.getElementById('metricsModuleFilter')?.value;
        const days = document.getElementById('metricsDaysFilter')?.value;

        try {
            // Cargar métricas
            const params = new URLSearchParams();
            if (companyId) params.append('company_id', companyId);
            if (environment) params.append('environment', environment);
            if (module) params.append('module', module);
            if (days) params.append('days', days);

            const [metricsRes, historyRes] = await Promise.all([
                fetch(`/api/testing/metrics?${params}`),
                fetch(`/api/testing/history?${params}&limit=50`)
            ]);

            const metricsData = await metricsRes.json();
            const historyData = await historyRes.json();

            if (metricsData.success) {
                updateMetricCards(metricsData.metrics);
                updateCharts(historyData.executions || []);
            }

            if (historyData.success) {
                updateHistoryTable(historyData.executions || []);
            }

        } catch (error) {
            console.error('Error al cargar métricas:', error);
            alert('Error al cargar métricas: ' + error.message);
        }
    }

    function updateMetricCards(metrics) {
        document.getElementById('metricTotalExecutions').textContent = metrics.total_executions || 0;
        document.getElementById('metricSuccessRate').textContent = `${(metrics.avg_success_rate || 0).toFixed(1)}%`;
        document.getElementById('metricAvgDuration').textContent = `${(metrics.avg_duration || 0).toFixed(1)}s`;
        document.getElementById('metricTotalTickets').textContent = metrics.total_tickets || 0;
    }

    function updateCharts(executions) {
        if (!executions || executions.length === 0) return;

        // Preparar datos
        const sortedExecs = executions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Chart: Success Rate Over Time
        const successRateData = {
            labels: sortedExecs.map(e => new Date(e.created_at).toLocaleDateString()),
            datasets: [{
                label: 'Success Rate (%)',
                data: sortedExecs.map(e => parseFloat(e.success_rate) || 0),
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
            }]
        };

        if (charts.successRate) charts.successRate.destroy();
        const ctx1 = document.getElementById('chartSuccessRate');
        if (ctx1) {
            charts.successRate = new Chart(ctx1, {
                type: 'line',
                data: successRateData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, max: 100 }
                    }
                }
            });
        }

        // Chart: Duration
        const durationData = {
            labels: sortedExecs.map(e => new Date(e.created_at).toLocaleDateString()),
            datasets: [{
                label: 'Duración (segundos)',
                data: sortedExecs.map(e => parseFloat(e.duration_seconds) || 0),
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4
            }]
        };

        if (charts.duration) charts.duration.destroy();
        const ctx2 = document.getElementById('chartDuration');
        if (ctx2) {
            charts.duration = new Chart(ctx2, {
                type: 'line',
                data: durationData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // Chart: By Module
        const moduleStats = executions.reduce((acc, e) => {
            acc[e.module] = (acc[e.module] || 0) + 1;
            return acc;
        }, {});

        const moduleData = {
            labels: Object.keys(moduleStats),
            datasets: [{
                label: 'Tests por Módulo',
                data: Object.values(moduleStats),
                backgroundColor: [
                    '#4caf50', '#2196f3', '#ff9800', '#f44336',
                    '#9c27b0', '#00bcd4', '#ffeb3b'
                ]
            }]
        };

        if (charts.byModule) charts.byModule.destroy();
        const ctx3 = document.getElementById('chartByModule');
        if (ctx3) {
            charts.byModule = new Chart(ctx3, {
                type: 'bar',
                data: moduleData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }

    function updateHistoryTable(executions) {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;

        if (executions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay ejecuciones para mostrar</td></tr>';
            return;
        }

        tbody.innerHTML = executions.map(exec => {
            const date = new Date(exec.created_at).toLocaleString();
            const statusBadge = getStatusBadge(exec.status, exec.success_rate);

            return `
                <tr>
                    <td><small>${date}</small></td>
                    <td><span class="badge badge-secondary">${exec.environment.toUpperCase()}</span></td>
                    <td>${exec.module}</td>
                    <td><small>${exec.company_name || exec.company_id}</small></td>
                    <td>${exec.total_tests || 0}</td>
                    <td><strong>${(exec.success_rate || 0).toFixed(1)}%</strong></td>
                    <td>${(exec.duration_seconds || 0).toFixed(1)}s</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');
    }

    function getStatusBadge(status, successRate) {
        if (status === 'completed' && successRate >= 80) {
            return '<span class="badge badge-success">✅ OK</span>';
        } else if (status === 'completed') {
            return '<span class="badge badge-warning">⚠️ Warnings</span>';
        } else if (status === 'failed') {
            return '<span class="badge badge-danger">❌ Failed</span>';
        } else if (status === 'running') {
            return '<span class="badge badge-primary">⏳ Running</span>';
        } else {
            return `<span class="badge badge-secondary">${status}</span>`;
        }
    }

    return {
        init,
        loadMetrics
    };
})();

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', TestingMetricsDashboard.init);
} else {
    TestingMetricsDashboard.init();
}

window.TestingMetricsDashboard = TestingMetricsDashboard;
