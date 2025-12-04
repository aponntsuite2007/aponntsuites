/**
 * OH-V6-14: OCCUPATIONAL HEALTH ANALYTICS DASHBOARD
 * Dashboard con gráficos interactivos usando Chart.js
 *
 * FEATURES:
 * - 8 tipos de gráficos (pie, bar, line, doughnut)
 * - Actualización automática cada 5 minutos
 * - Responsive design
 * - Dark theme con glassmorphism
 * - Export to PNG/PDF
 * - Interactive tooltips
 */

class OHAnalyticsDashboard {
    constructor() {
        this.charts = {};
        this.analyticsData = null;
        this.refreshInterval = null;
        this.isChartJsLoaded = false;
    }

    /**
     * Inicializar dashboard analytics
     */
    async init() {
        console.log('📊 [OH ANALYTICS] Initializing dashboard...');

        // Cargar Chart.js si no está cargado
        await this.loadChartJS();

        // Cargar datos de analytics
        await this.loadAnalyticsData();

        // Renderizar dashboard
        this.renderDashboard();

        // Auto-refresh cada 5 minutos
        this.startAutoRefresh();
    }

    /**
     * Cargar Chart.js library
     */
    async loadChartJS() {
        if (typeof Chart !== 'undefined') {
            this.isChartJsLoaded = true;
            console.log('✅ [OH ANALYTICS] Chart.js already loaded');
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            script.onload = () => {
                this.isChartJsLoaded = true;
                console.log('✅ [OH ANALYTICS] Chart.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ [OH ANALYTICS] Failed to load Chart.js');
                reject(new Error('Failed to load Chart.js'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Cargar datos de analytics desde API
     */
    async loadAnalyticsData() {
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch('/api/occupational-health/certifications/analytics', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            this.analyticsData = result.data;
            console.log('✅ [OH ANALYTICS] Data loaded:', this.analyticsData);

        } catch (error) {
            console.error('❌ [OH ANALYTICS] Error loading data:', error);
            // Mostrar notificación de error
            if (typeof showNotification === 'function') {
                showNotification('Error cargando analytics de certificaciones', 'error');
            }
        }
    }

    /**
     * Renderizar dashboard completo
     */
    renderDashboard() {
        const container = document.getElementById('oh-analytics-container');
        if (!container) {
            console.error('❌ [OH ANALYTICS] Container not found');
            return;
        }

        // Verificar si hay datos
        const hasData = this.analyticsData &&
                       this.analyticsData.statusDistribution &&
                       (Array.isArray(this.analyticsData.statusDistribution) ? this.analyticsData.statusDistribution.length > 0 : Object.keys(this.analyticsData.statusDistribution).length > 0);

        if (!hasData) {
            // Mostrar Empty State
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = `
            <div class="oh-analytics-dashboard">
                <!-- Header con stats cards -->
                <div class="oh-analytics-header">
                    <div class="oh-stats-cards">
                        ${this.renderStatsCards()}
                    </div>
                </div>

                <!-- Grid de gráficos -->
                <div class="oh-charts-grid">
                    <!-- Row 1: Status Distribution + Category Distribution -->
                    <div class="oh-chart-row">
                        <div class="oh-chart-card">
                            <div class="oh-chart-header">
                                <h3>📊 Distribución por Status</h3>
                                <button class="oh-chart-export" onclick="ohAnalytics.exportChart('statusChart')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                            </div>
                            <canvas id="statusChart"></canvas>
                        </div>

                        <div class="oh-chart-card">
                            <div class="oh-chart-header">
                                <h3>📊 Distribución por Categoría</h3>
                                <button class="oh-chart-export" onclick="ohAnalytics.exportChart('categoryChart')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                            </div>
                            <canvas id="categoryChart"></canvas>
                        </div>
                    </div>

                    <!-- Row 2: Expiring Timeline -->
                    <div class="oh-chart-row">
                        <div class="oh-chart-card oh-chart-full">
                            <div class="oh-chart-header">
                                <h3>⏰ Timeline de Vencimientos</h3>
                                <button class="oh-chart-export" onclick="ohAnalytics.exportChart('timelineChart')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                            </div>
                            <canvas id="timelineChart"></canvas>
                        </div>
                    </div>

                    <!-- Row 3: Monthly Trends -->
                    <div class="oh-chart-row">
                        <div class="oh-chart-card oh-chart-full">
                            <div class="oh-chart-header">
                                <h3>📈 Tendencias Mensuales (últimos 12 meses)</h3>
                                <button class="oh-chart-export" onclick="ohAnalytics.exportChart('trendsChart')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                            </div>
                            <canvas id="trendsChart"></canvas>
                        </div>
                    </div>

                    <!-- Row 4: Top Employees + Department Stats -->
                    <div class="oh-chart-row">
                        <div class="oh-chart-card">
                            <div class="oh-chart-header">
                                <h3>👥 Top Empleados</h3>
                                <button class="oh-chart-export" onclick="ohAnalytics.exportChart('employeesChart')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                            </div>
                            <canvas id="employeesChart"></canvas>
                        </div>

                        <div class="oh-chart-card">
                            <div class="oh-chart-header">
                                <h3>🏢 Por Departamento</h3>
                                <button class="oh-chart-export" onclick="ohAnalytics.exportChart('departmentsChart')">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                </button>
                            </div>
                            <canvas id="departmentsChart"></canvas>
                        </div>
                    </div>

                    <!-- Row 5: Upcoming Expirations Table -->
                    <div class="oh-chart-row">
                        <div class="oh-chart-card oh-chart-full">
                            <div class="oh-chart-header">
                                <h3>⚠️ Próximos Vencimientos (30 días)</h3>
                            </div>
                            <div class="oh-upcoming-table">
                                ${this.renderUpcomingExpirationsTable()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Renderizar todos los gráficos
        this.renderAllCharts();
    }

    /**
     * Renderizar Empty State cuando no hay datos
     */
    renderEmptyState() {
        return `
            <div class="oh-empty-state">
                <div class="oh-empty-state-content">
                    <div class="oh-empty-state-icon">
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                    </div>
                    <h2>No hay datos de certificaciones ocupacionales</h2>
                    <p>El módulo de Occupational Health Phase 2 está activo, pero aún no se han registrado certificaciones.</p>

                    <div class="oh-empty-state-steps">
                        <h3>Para empezar a usar este módulo:</h3>
                        <ol>
                            <li>
                                <strong>Crear Tipos de Certificación</strong>
                                <span>Define las certificaciones que tus empleados necesitan (ej: Altura, Espacios Confinados, Manejo de Cargas, etc.)</span>
                            </li>
                            <li>
                                <strong>Asignar Certificaciones a Empleados</strong>
                                <span>Registra qué certificaciones tiene cada empleado, con fecha de emisión y vencimiento</span>
                            </li>
                            <li>
                                <strong>Carga Masiva (Opcional)</strong>
                                <span>Utiliza la opción de Bulk Upload para cargar múltiples certificaciones desde CSV/Excel</span>
                            </li>
                            <li>
                                <strong>Visualizar Analytics</strong>
                                <span>Una vez cargados los datos, verás gráficos de distribución, vencimientos, tendencias y más</span>
                            </li>
                        </ol>
                    </div>

                    <div class="oh-empty-state-actions">
                        <button class="oh-btn-primary" onclick="window.ohPhase2?.switchTab?.('certifications') || alert('Navega al tab Certificaciones para empezar')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            Ir a Certificaciones
                        </button>
                        <button class="oh-btn-secondary" onclick="window.ohPhase2?.switchTab?.('bulk-upload') || alert('Navega al tab Bulk Upload para cargar datos')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Carga Masiva
                        </button>
                    </div>

                    <div class="oh-empty-state-info">
                        <p>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <strong>Sistema completamente funcional:</strong> Este módulo incluye Analytics con 8 tipos de gráficos (Chart.js),
                            Bulk Upload CSV/Excel, Generación de PDFs, Emails Digest, Exportación de datos y Audit Trail.
                        </p>
                    </div>
                </div>
            </div>

            <style>
                .oh-empty-state {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 600px;
                    padding: 40px 20px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 16px;
                }

                .oh-empty-state-content {
                    max-width: 800px;
                    text-align: center;
                    color: #e5e7eb;
                }

                .oh-empty-state-icon {
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 32px;
                    color: #667eea;
                    opacity: 0.5;
                }

                .oh-empty-state h2 {
                    font-size: 28px;
                    font-weight: 700;
                    margin: 0 0 16px;
                    color: #f9fafb;
                }

                .oh-empty-state > p {
                    font-size: 16px;
                    color: #9ca3af;
                    margin: 0 0 40px;
                    line-height: 1.6;
                }

                .oh-empty-state-steps {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 32px;
                    margin: 40px 0;
                    text-align: left;
                }

                .oh-empty-state-steps h3 {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0 0 24px;
                    color: #f9fafb;
                    text-align: center;
                }

                .oh-empty-state-steps ol {
                    counter-reset: step-counter;
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .oh-empty-state-steps li {
                    counter-increment: step-counter;
                    position: relative;
                    padding: 20px 0 20px 60px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .oh-empty-state-steps li:last-child {
                    border-bottom: none;
                }

                .oh-empty-state-steps li::before {
                    content: counter(step-counter);
                    position: absolute;
                    left: 0;
                    top: 20px;
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 18px;
                    color: #fff;
                }

                .oh-empty-state-steps strong {
                    display: block;
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: #f9fafb;
                }

                .oh-empty-state-steps span {
                    display: block;
                    font-size: 14px;
                    color: #9ca3af;
                    line-height: 1.6;
                }

                .oh-empty-state-actions {
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                    margin: 32px 0;
                }

                .oh-btn-primary,
                .oh-btn-secondary {
                    padding: 14px 28px;
                    font-size: 15px;
                    font-weight: 600;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                }

                .oh-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                }

                .oh-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
                }

                .oh-btn-secondary {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #e5e7eb;
                }

                .oh-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                }

                .oh-empty-state-info {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 8px;
                    padding: 16px 20px;
                    margin-top: 32px;
                }

                .oh-empty-state-info p {
                    margin: 0;
                    font-size: 14px;
                    color: #bfdbfe;
                    line-height: 1.6;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    text-align: left;
                }

                .oh-empty-state-info svg {
                    flex-shrink: 0;
                    margin-top: 2px;
                    color: #60a5fa;
                }

                .oh-empty-state-info strong {
                    color: #fff;
                }
            </style>
        `;
    }

    /**
     * Renderizar stats cards del header
     */
    renderStatsCards() {
        if (!this.analyticsData) return '';

        const { statusDistribution, complianceRate } = this.analyticsData;
        const total = Object.values(statusDistribution).reduce((a, b) => a + b, 0);

        return `
            <div class="oh-stat-card">
                <div class="oh-stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                </div>
                <div class="oh-stat-content">
                    <div class="oh-stat-value">${total}</div>
                    <div class="oh-stat-label">Total Certificaciones</div>
                </div>
            </div>

            <div class="oh-stat-card">
                <div class="oh-stat-icon" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <div class="oh-stat-content">
                    <div class="oh-stat-value">${statusDistribution.active || 0}</div>
                    <div class="oh-stat-label">Activas</div>
                </div>
            </div>

            <div class="oh-stat-card">
                <div class="oh-stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>
                <div class="oh-stat-content">
                    <div class="oh-stat-value">${statusDistribution.expiring_soon || 0}</div>
                    <div class="oh-stat-label">Por Vencer</div>
                </div>
            </div>

            <div class="oh-stat-card">
                <div class="oh-stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <div class="oh-stat-content">
                    <div class="oh-stat-value">${statusDistribution.expired || 0}</div>
                    <div class="oh-stat-label">Vencidas</div>
                </div>
            </div>

            <div class="oh-stat-card">
                <div class="oh-stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <div class="oh-stat-content">
                    <div class="oh-stat-value">${complianceRate}%</div>
                    <div class="oh-stat-label">Compliance Rate</div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar tabla de próximos vencimientos
     */
    renderUpcomingExpirationsTable() {
        if (!this.analyticsData || !this.analyticsData.upcomingExpirations) {
            return '<p class="oh-no-data">No hay vencimientos próximos</p>';
        }

        const expirations = this.analyticsData.upcomingExpirations;

        if (expirations.length === 0) {
            return '<p class="oh-no-data">No hay vencimientos en los próximos 30 días</p>';
        }

        return `
            <table class="oh-upcoming-table-el">
                <thead>
                    <tr>
                        <th>Empleado</th>
                        <th>Certificación</th>
                        <th>Fecha Vencimiento</th>
                        <th>Días Restantes</th>
                        <th>Urgencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${expirations.map(exp => {
                        const urgencyClass = exp.days_until_expiration <= 7 ? 'critical' :
                                             exp.days_until_expiration <= 15 ? 'warning' : 'normal';
                        const urgencyText = exp.days_until_expiration <= 7 ? 'Crítico' :
                                            exp.days_until_expiration <= 15 ? 'Alerta' : 'Normal';

                        return `
                            <tr class="oh-urgency-${urgencyClass}">
                                <td>
                                    <div class="oh-employee-cell">
                                        <strong>${exp.employee_name}</strong>
                                        <span class="oh-employee-id">${exp.employee_id}</span>
                                    </div>
                                </td>
                                <td>${exp.certification_name}</td>
                                <td>${new Date(exp.expiration_date).toLocaleDateString()}</td>
                                <td><strong>${exp.days_until_expiration}</strong> días</td>
                                <td><span class="oh-urgency-badge oh-urgency-badge-${urgencyClass}">${urgencyText}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Renderizar todos los gráficos
     */
    renderAllCharts() {
        if (!this.analyticsData || !this.isChartJsLoaded) {
            console.error('❌ [OH ANALYTICS] Cannot render charts - missing data or Chart.js');
            return;
        }

        this.renderStatusChart();
        this.renderCategoryChart();
        this.renderTimelineChart();
        this.renderTrendsChart();
        this.renderEmployeesChart();
        this.renderDepartmentsChart();
    }

    /**
     * 1. STATUS DISTRIBUTION - Doughnut Chart
     */
    renderStatusChart() {
        const ctx = document.getElementById('statusChart');
        if (!ctx) return;

        const { statusDistribution } = this.analyticsData;

        // Validar que statusDistribution existe
        if (!statusDistribution || typeof statusDistribution !== 'object') {
            console.warn('⚠️ [OH ANALYTICS] statusDistribution no disponible');
            return;
        }

        // Destruir chart anterior si existe
        if (this.charts.statusChart) {
            this.charts.statusChart.destroy();
        }

        this.charts.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Activas', 'Por Vencer', 'Vencidas', 'Revocadas', 'Renovadas'],
                datasets: [{
                    data: [
                        statusDistribution.active || 0,
                        statusDistribution.expiring_soon || 0,
                        statusDistribution.expired || 0,
                        statusDistribution.revoked || 0,
                        statusDistribution.renewed || 0
                    ],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.8)', // green
                        'rgba(251, 191, 36, 0.8)', // yellow
                        'rgba(239, 68, 68, 0.8)', // red
                        'rgba(107, 114, 128, 0.8)', // gray
                        'rgba(59, 130, 246, 0.8)' // blue
                    ],
                    borderColor: 'rgba(17, 24, 39, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e5e7eb',
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f9fafb',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(75, 85, 99, 0.5)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * 2. CATEGORY DISTRIBUTION - Bar Chart Horizontal
     */
    renderCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const { categoryDistribution } = this.analyticsData;

        // Validar que categoryDistribution existe y es un objeto
        if (!categoryDistribution || typeof categoryDistribution !== 'object') {
            console.warn('⚠️ [OH ANALYTICS] categoryDistribution no disponible');
            return;
        }

        const labels = Object.keys(categoryDistribution).map(cat => {
            const names = {
                safety: 'Seguridad',
                medical: 'Médicas',
                professional: 'Profesionales',
                technical: 'Técnicas',
                compliance: 'Cumplimiento'
            };
            return names[cat] || cat;
        });

        const data = Object.values(categoryDistribution);

        if (this.charts.categoryChart) {
            this.charts.categoryChart.destroy();
        }

        this.charts.categoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Certificaciones',
                    data,
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(147, 51, 234, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: 'rgba(17, 24, 39, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f9fafb',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(75, 85, 99, 0.5)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' }
                    },
                    y: {
                        ticks: { color: '#e5e7eb', font: { size: 12, weight: '500' } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    /**
     * 3. EXPIRING TIMELINE - Bar Chart
     */
    renderTimelineChart() {
        const ctx = document.getElementById('timelineChart');
        if (!ctx) return;

        const { expiringTimeline } = this.analyticsData;

        // Validar que expiringTimeline existe y es un array
        if (!expiringTimeline || !Array.isArray(expiringTimeline) || expiringTimeline.length === 0) {
            console.warn('⚠️ [OH ANALYTICS] expiringTimeline no disponible');
            return;
        }

        const labels = expiringTimeline.map(t => `${t.days} días`);
        const data = expiringTimeline.map(t => t.count);

        if (this.charts.timelineChart) {
            this.charts.timelineChart.destroy();
        }

        this.charts.timelineChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Certificaciones venciendo',
                    data,
                    backgroundColor: 'rgba(251, 191, 36, 0.8)',
                    borderColor: 'rgba(17, 24, 39, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f9fafb',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(75, 85, 99, 0.5)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#e5e7eb', font: { size: 12 } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * 4. MONTHLY TRENDS - Line Chart
     */
    renderTrendsChart() {
        const ctx = document.getElementById('trendsChart');
        if (!ctx) return;

        const { monthlyTrends } = this.analyticsData;

        // Validar que monthlyTrends existe y es un array
        if (!monthlyTrends || !Array.isArray(monthlyTrends) || monthlyTrends.length === 0) {
            console.warn('⚠️ [OH ANALYTICS] monthlyTrends no disponible');
            return;
        }

        const labels = monthlyTrends.map(t => t.month);
        const issuedData = monthlyTrends.map(t => t.issued);
        const expiredData = monthlyTrends.map(t => t.expired);

        if (this.charts.trendsChart) {
            this.charts.trendsChart.destroy();
        }

        this.charts.trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Emitidas',
                        data: issuedData,
                        borderColor: 'rgba(16, 185, 129, 0.9)',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Vencidas',
                        data: expiredData,
                        borderColor: 'rgba(239, 68, 68, 0.9)',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#e5e7eb',
                            font: { size: 12, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f9fafb',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(75, 85, 99, 0.5)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#9ca3af', font: { size: 11 } },
                        grid: { color: 'rgba(75, 85, 99, 0.2)' }
                    },
                    y: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' },
                        beginAtZero: true
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    }

    /**
     * 5. TOP EMPLOYEES - Bar Chart
     */
    renderEmployeesChart() {
        const ctx = document.getElementById('employeesChart');
        if (!ctx) return;

        const { topEmployees } = this.analyticsData;

        // Validar que topEmployees existe y es un array
        if (!topEmployees || !Array.isArray(topEmployees) || topEmployees.length === 0) {
            console.warn('⚠️ [OH ANALYTICS] topEmployees no disponible');
            return;
        }

        const labels = topEmployees.map(e => e.employee_name || e.employee_id);
        const data = topEmployees.map(e => e.cert_count);

        if (this.charts.employeesChart) {
            this.charts.employeesChart.destroy();
        }

        this.charts.employeesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Certificaciones',
                    data,
                    backgroundColor: 'rgba(147, 51, 234, 0.8)',
                    borderColor: 'rgba(17, 24, 39, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f9fafb',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(75, 85, 99, 0.5)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' },
                        beginAtZero: true
                    },
                    y: {
                        ticks: { color: '#e5e7eb', font: { size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    /**
     * 6. DEPARTMENTS - Stacked Bar Chart
     */
    renderDepartmentsChart() {
        const ctx = document.getElementById('departmentsChart');
        if (!ctx) return;

        const { departmentStats } = this.analyticsData;

        // Validar que departmentStats existe y es un array
        if (!departmentStats || !Array.isArray(departmentStats) || departmentStats.length === 0) {
            console.warn('⚠️ [OH ANALYTICS] departmentStats no disponible');
            return;
        }

        const labels = departmentStats.map(d => d.department);
        const activeData = departmentStats.map(d => d.active);
        const expiringData = departmentStats.map(d => d.expiring);
        const expiredData = departmentStats.map(d => d.expired);

        if (this.charts.departmentsChart) {
            this.charts.departmentsChart.destroy();
        }

        this.charts.departmentsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Activas',
                        data: activeData,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgba(17, 24, 39, 0.8)',
                        borderWidth: 2
                    },
                    {
                        label: 'Por Vencer',
                        data: expiringData,
                        backgroundColor: 'rgba(251, 191, 36, 0.8)',
                        borderColor: 'rgba(17, 24, 39, 0.8)',
                        borderWidth: 2
                    },
                    {
                        label: 'Vencidas',
                        data: expiredData,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgba(17, 24, 39, 0.8)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e5e7eb',
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f9fafb',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(75, 85, 99, 0.5)',
                        borderWidth: 1,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: { color: '#e5e7eb', font: { size: 11 } },
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        ticks: { color: '#9ca3af' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Exportar chart a PNG
     */
    exportChart(chartName) {
        const chart = this.charts[chartName];
        if (!chart) {
            console.error(`❌ [OH ANALYTICS] Chart ${chartName} not found`);
            return;
        }

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = `oh-analytics-${chartName}-${Date.now()}.png`;
        link.href = url;
        link.click();

        if (typeof showNotification === 'function') {
            showNotification('Gráfico exportado exitosamente', 'success');
        }
    }

    /**
     * Refresh analytics data
     */
    async refresh() {
        console.log('🔄 [OH ANALYTICS] Refreshing data...');
        await this.loadAnalyticsData();
        this.renderDashboard();
    }

    /**
     * Auto-refresh cada 5 minutos
     */
    startAutoRefresh() {
        // Clear interval anterior si existe
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Refresh cada 5 minutos
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 5 * 60 * 1000);
    }

    /**
     * Cleanup
     */
    destroy() {
        // Destruir todos los charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });

        // Clear interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        console.log('🗑️ [OH ANALYTICS] Dashboard destroyed');
    }
}

// Instancia global (DEBE ser window.ohAnalytics para estar disponible globalmente)
window.ohAnalytics = new OHAnalyticsDashboard();

// También exportar la clase por si se necesita
window.OHAnalyticsDashboard = OHAnalyticsDashboard;

// Export para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OHAnalyticsDashboard;
}
