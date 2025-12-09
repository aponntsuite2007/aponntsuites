/**
 * associate-workflow-panel.js
 *
 * Panel de Workflow de Asociados para Aponnt Admin
 * Vista de actividad de asociados SIN informacion confidencial
 *
 * Solo muestra: estados de workflow, facturacion agregada, estadisticas
 * NO muestra: detalles de casos, diagnosticos, comunicaciones privadas
 *
 * @version 1.0
 * @date 2025-12-08
 */

class AssociateWorkflowPanel {
    constructor() {
        this.apiBase = `${window.API_BASE_URL || ''}/api/associates/admin/workflow`;
        this.currentPeriod = '30d';
        this.workflowData = {
            overview: null,
            billing: null,
            stats: null,
            companies: []
        };
        this.init();
    }

    async init() {
        console.log('📊 Initializing Associate Workflow Panel...');
        await this.loadAllData();
        this.render();
        this.setupEventListeners();
    }

    async loadAllData() {
        try {
            const token = localStorage.getItem('adminToken');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Load all data in parallel
            const [overview, billing, stats, companies] = await Promise.all([
                fetch(`${this.apiBase}/overview?period=${this.currentPeriod}`, { headers }).then(r => r.json()),
                fetch(`${this.apiBase}/billing-summary?period=${this.currentPeriod}`, { headers }).then(r => r.json()),
                fetch(`${this.apiBase}/stats`, { headers }).then(r => r.json()),
                fetch(`${this.apiBase}/companies`, { headers }).then(r => r.json())
            ]);

            this.workflowData = {
                overview: overview.success ? overview : null,
                billing: billing.success ? billing : null,
                stats: stats.success ? stats.stats : null,
                companies: companies.success ? companies.companies : []
            };

            console.log('✅ Workflow data loaded:', this.workflowData);
        } catch (error) {
            console.error('Error loading workflow data:', error);
        }
    }

    render() {
        const container = document.getElementById('associateWorkflowContainer');
        if (!container) {
            console.warn('Associate workflow container not found');
            return;
        }

        container.innerHTML = `
            <div class="workflow-panel">
                <!-- Header with Period Selector -->
                <div class="workflow-header">
                    <h3>📊 Workflow de Asociados</h3>
                    <div class="period-selector">
                        <select id="workflowPeriodSelect" class="form-select form-select-sm">
                            <option value="7d" ${this.currentPeriod === '7d' ? 'selected' : ''}>Ultimos 7 dias</option>
                            <option value="30d" ${this.currentPeriod === '30d' ? 'selected' : ''}>Ultimos 30 dias</option>
                            <option value="90d" ${this.currentPeriod === '90d' ? 'selected' : ''}>Ultimos 90 dias</option>
                        </select>
                        <button id="refreshWorkflowBtn" class="btn btn-sm btn-outline-primary ms-2">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                </div>

                <!-- KPIs Row -->
                ${this.renderKPIs()}

                <!-- Main Content Grid -->
                <div class="workflow-grid">
                    <!-- Left Column: Stats & Billing -->
                    <div class="workflow-left">
                        ${this.renderBillingSection()}
                        ${this.renderCasesBreakdown()}
                    </div>

                    <!-- Right Column: Activity & Companies -->
                    <div class="workflow-right">
                        ${this.renderCompaniesSection()}
                        ${this.renderRecentActivity()}
                    </div>
                </div>
            </div>

            <style>
                .workflow-panel {
                    background: var(--bg-secondary, #1a1a2e);
                    border-radius: 12px;
                    padding: 20px;
                }
                .workflow-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border-color, #333);
                }
                .workflow-header h3 {
                    margin: 0;
                    color: var(--text-primary, #fff);
                }
                .period-selector {
                    display: flex;
                    align-items: center;
                }
                .workflow-kpis {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 15px;
                    margin-bottom: 25px;
                }
                .kpi-card {
                    background: var(--bg-tertiary, #252540);
                    border-radius: 10px;
                    padding: 15px;
                    text-align: center;
                    border: 1px solid var(--border-color, #333);
                }
                .kpi-value {
                    font-size: 2em;
                    font-weight: bold;
                    color: var(--accent-color, #00d4ff);
                }
                .kpi-label {
                    font-size: 0.85em;
                    color: var(--text-secondary, #aaa);
                    margin-top: 5px;
                }
                .kpi-trend {
                    font-size: 0.8em;
                    margin-top: 5px;
                }
                .kpi-trend.positive { color: #28a745; }
                .kpi-trend.negative { color: #dc3545; }
                .kpi-trend.neutral { color: #6c757d; }
                .workflow-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                @media (max-width: 992px) {
                    .workflow-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .workflow-section {
                    background: var(--bg-tertiary, #252540);
                    border-radius: 10px;
                    padding: 15px;
                    margin-bottom: 15px;
                    border: 1px solid var(--border-color, #333);
                }
                .workflow-section h4 {
                    margin: 0 0 15px 0;
                    font-size: 1em;
                    color: var(--text-primary, #fff);
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--border-color, #333);
                }
                .billing-summary-table {
                    width: 100%;
                    font-size: 0.9em;
                }
                .billing-summary-table th,
                .billing-summary-table td {
                    padding: 8px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color, #333);
                }
                .billing-summary-table th {
                    color: var(--text-secondary, #aaa);
                    font-weight: 500;
                }
                .billing-totals {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 2px solid var(--accent-color, #00d4ff);
                }
                .billing-total-item {
                    text-align: center;
                }
                .billing-total-value {
                    font-size: 1.3em;
                    font-weight: bold;
                    color: var(--accent-color, #00d4ff);
                }
                .billing-total-label {
                    font-size: 0.8em;
                    color: var(--text-secondary, #aaa);
                }
                .cases-breakdown {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .case-status-badge {
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-size: 0.85em;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .case-status-badge.pending { background: #ffc10733; color: #ffc107; }
                .case-status-badge.in-progress { background: #17a2b833; color: #17a2b8; }
                .case-status-badge.completed { background: #28a74533; color: #28a745; }
                .company-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 0;
                    border-bottom: 1px solid var(--border-color, #333);
                }
                .company-item:last-child {
                    border-bottom: none;
                }
                .company-name {
                    font-weight: 500;
                }
                .company-stats {
                    display: flex;
                    gap: 15px;
                    font-size: 0.85em;
                    color: var(--text-secondary, #aaa);
                }
                .activity-item {
                    display: flex;
                    align-items: flex-start;
                    padding: 10px 0;
                    border-bottom: 1px solid var(--border-color, #333);
                }
                .activity-item:last-child {
                    border-bottom: none;
                }
                .activity-icon {
                    width: 35px;
                    height: 35px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 12px;
                    flex-shrink: 0;
                }
                .activity-icon.pending { background: #ffc10722; color: #ffc107; }
                .activity-icon.in_progress { background: #17a2b822; color: #17a2b8; }
                .activity-icon.completed { background: #28a74522; color: #28a745; }
                .activity-content {
                    flex: 1;
                }
                .activity-title {
                    font-weight: 500;
                    font-size: 0.9em;
                }
                .activity-meta {
                    font-size: 0.8em;
                    color: var(--text-secondary, #aaa);
                    margin-top: 3px;
                }
                .empty-state {
                    text-align: center;
                    padding: 20px;
                    color: var(--text-secondary, #aaa);
                }
            </style>
        `;
    }

    renderKPIs() {
        const stats = this.workflowData.stats || {};
        const associates = stats.associates || {};
        const cases = stats.cases || {};
        const billing = stats.billing || {};

        const variation = cases.variation || 0;
        const trendClass = variation > 0 ? 'positive' : variation < 0 ? 'negative' : 'neutral';
        const trendIcon = variation > 0 ? '↑' : variation < 0 ? '↓' : '→';

        return `
            <div class="workflow-kpis">
                <div class="kpi-card">
                    <div class="kpi-value">${associates.total || 0}</div>
                    <div class="kpi-label">Asociados Activos</div>
                    ${associates.newThisMonth ? `<div class="kpi-trend positive">+${associates.newThisMonth} este mes</div>` : ''}
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${associates.pending || 0}</div>
                    <div class="kpi-label">Pendientes Aprobacion</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${cases.thisMonth || 0}</div>
                    <div class="kpi-label">Casos Este Mes</div>
                    <div class="kpi-trend ${trendClass}">${trendIcon} ${Math.abs(variation)}% vs mes anterior</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${cases.completedThisMonth || 0}</div>
                    <div class="kpi-label">Casos Completados</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">$${this.formatNumber(billing.estimatedThisMonth || 0)}</div>
                    <div class="kpi-label">Facturacion Estimada</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value" style="color: #28a745;">$${this.formatNumber(billing.commissionThisMonth || 0)}</div>
                    <div class="kpi-label">Comision Aponnt (15%)</div>
                </div>
            </div>
        `;
    }

    renderBillingSection() {
        const billing = this.workflowData.billing || {};
        const summary = billing.summary || [];
        const totals = billing.totals || { totalCases: 0, totalBilling: 0, totalCommission: 0 };

        return `
            <div class="workflow-section">
                <h4>💰 Resumen de Facturacion (${this.getPeriodLabel()})</h4>
                ${summary.length > 0 ? `
                    <table class="billing-summary-table">
                        <thead>
                            <tr>
                                <th>Asociado</th>
                                <th>Especialidad</th>
                                <th>Casos</th>
                                <th>Facturado</th>
                                <th>Comision</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${summary.map(item => `
                                <tr>
                                    <td>${item.associateName || 'N/A'}</td>
                                    <td>${item.specialty || 'N/A'}</td>
                                    <td>${item.casesCompleted}</td>
                                    <td>$${this.formatNumber(item.estimatedBilling)}</td>
                                    <td>$${this.formatNumber(item.aponntCommission)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="billing-totals">
                        <div class="billing-total-item">
                            <div class="billing-total-value">${totals.totalCases}</div>
                            <div class="billing-total-label">Total Casos</div>
                        </div>
                        <div class="billing-total-item">
                            <div class="billing-total-value">$${this.formatNumber(totals.totalBilling)}</div>
                            <div class="billing-total-label">Total Facturado</div>
                        </div>
                        <div class="billing-total-item">
                            <div class="billing-total-value" style="color: #28a745;">$${this.formatNumber(totals.totalCommission)}</div>
                            <div class="billing-total-label">Total Comision</div>
                        </div>
                    </div>
                ` : `
                    <div class="empty-state">
                        <p>No hay facturacion en este periodo</p>
                        <small>Los casos completados generaran facturacion automaticamente</small>
                    </div>
                `}
            </div>
        `;
    }

    renderCasesBreakdown() {
        const overview = this.workflowData.overview || {};
        const casesByStatus = overview.casesByStatus || [];

        // Map status to readable labels and styles
        const statusMap = {
            'pending': { label: 'Pendientes', class: 'pending' },
            'under_review': { label: 'En Revision', class: 'in-progress' },
            'awaiting_docs': { label: 'Esperando Docs', class: 'in-progress' },
            'needs_follow_up': { label: 'Seguimiento', class: 'in-progress' },
            'justified': { label: 'Justificados', class: 'completed' },
            'not_justified': { label: 'No Justificados', class: 'completed' },
            'closed': { label: 'Cerrados', class: 'completed' }
        };

        return `
            <div class="workflow-section">
                <h4>📋 Estado de Casos</h4>
                <div class="cases-breakdown">
                    ${casesByStatus.length > 0 ? casesByStatus.map(item => {
                        const statusInfo = statusMap[item.status] || { label: item.status, class: 'pending' };
                        return `
                            <div class="case-status-badge ${statusInfo.class}">
                                <span>${item.count}</span>
                                <span>${statusInfo.label}</span>
                            </div>
                        `;
                    }).join('') : `
                        <div class="empty-state">
                            <p>No hay casos en este periodo</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderCompaniesSection() {
        const companies = this.workflowData.companies || [];

        return `
            <div class="workflow-section">
                <h4>🏢 Empresas con Asociados</h4>
                ${companies.length > 0 ? companies.slice(0, 10).map(company => `
                    <div class="company-item">
                        <div class="company-name">${company.name}</div>
                        <div class="company-stats">
                            <span title="Asociados contratados">👤 ${company.associatesCount}</span>
                            <span title="Casos activos">📋 ${company.activeCases}</span>
                            <span title="Casos completados">✅ ${company.completedCases}</span>
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <p>No hay empresas con asociados contratados</p>
                    </div>
                `}
            </div>
        `;
    }

    renderRecentActivity() {
        const overview = this.workflowData.overview || {};
        const activity = overview.recentActivity || [];

        // Map workflow stage to icons
        const stageIcons = {
            'pending': '⏳',
            'in_progress': '🔄',
            'completed': '✅'
        };

        return `
            <div class="workflow-section">
                <h4>🕐 Actividad Reciente</h4>
                ${activity.length > 0 ? activity.slice(0, 10).map(item => `
                    <div class="activity-item">
                        <div class="activity-icon ${item.workflowStage}">
                            ${stageIcons[item.workflowStage] || '📋'}
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">
                                ${this.getActivityTitle(item)}
                            </div>
                            <div class="activity-meta">
                                ${item.companyName} ${item.associateName ? `• ${item.associateName}` : ''} • ${this.formatDate(item.updatedAt)}
                            </div>
                        </div>
                    </div>
                `).join('') : `
                    <div class="empty-state">
                        <p>No hay actividad reciente</p>
                    </div>
                `}
            </div>
        `;
    }

    getActivityTitle(item) {
        const typeLabels = {
            'medical_illness': 'Caso medico',
            'unjustified': 'Ausencia injustificada',
            'justified': 'Ausencia justificada',
            'vacation': 'Vacaciones',
            'personal': 'Permiso personal',
            'other': 'Otro tipo'
        };

        const statusLabels = {
            'pending': 'pendiente',
            'under_review': 'en revision',
            'awaiting_docs': 'esperando documentos',
            'needs_follow_up': 'requiere seguimiento',
            'justified': 'justificado',
            'not_justified': 'no justificado',
            'closed': 'cerrado'
        };

        const type = typeLabels[item.type] || item.type;
        const status = statusLabels[item.status] || item.status;

        return `${type} - ${status}`;
    }

    setupEventListeners() {
        // Period selector
        document.getElementById('workflowPeriodSelect')?.addEventListener('change', async (e) => {
            this.currentPeriod = e.target.value;
            await this.loadAllData();
            this.render();
            this.setupEventListeners();
        });

        // Refresh button
        document.getElementById('refreshWorkflowBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('refreshWorkflowBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="bi bi-arrow-clockwise spin"></i>';

            await this.loadAllData();
            this.render();
            this.setupEventListeners();

            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
        });
    }

    // Helper methods
    formatNumber(num) {
        return new Intl.NumberFormat('es-AR').format(num);
    }

    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getPeriodLabel() {
        const labels = {
            '7d': 'Ultimos 7 dias',
            '30d': 'Ultimos 30 dias',
            '90d': 'Ultimos 90 dias'
        };
        return labels[this.currentPeriod] || this.currentPeriod;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssociateWorkflowPanel;
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're in the admin panel with the workflow container
    if (document.getElementById('associateWorkflowContainer')) {
        window.associateWorkflowPanel = new AssociateWorkflowPanel();
    }
});
