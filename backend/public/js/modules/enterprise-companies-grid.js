/**
 * ENTERPRISE COMPANIES GRID - Bloomberg/SAP Fiori Style
 *
 * Rediseño profesional de la grilla de empresas con estilo enterprise internacional
 * - Dark theme profesional
 * - Cards modernas con glassmorphism
 * - Micro-animaciones sutiles
 * - Badges de tecnología (IA/Ollama)
 * - Progress bars visuales
 * - Icon buttons compactos
 */

const EnterpriseCompaniesGrid = {

    /**
     * Renderiza la grilla enterprise de empresas
     * @param {Array} companies - Array de empresas
     * @param {HTMLElement} container - Contenedor DOM
     */
    render(companies, container) {
        console.log('🎨 [ENTERPRISE GRID] Renderizando con estilo Bloomberg/SAP Fiori');

        if (!companies || companies.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = `
            <style>
                ${this.getEnterpriseStyles()}
            </style>
            <div class="enterprise-grid-container">
                ${this.renderHeader(companies.length)}
                <div class="enterprise-companies-grid">
                    ${companies.map(company => this.renderCompanyCard(company)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Estilos CSS enterprise (Bloomberg/SAP Fiori inspired)
     */
    getEnterpriseStyles() {
        return `
            .enterprise-grid-container {
                background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
                border-radius: 16px;
                padding: 2rem;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }

            .enterprise-grid-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .enterprise-grid-title {
                font-size: 1.75rem;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: -0.5px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .enterprise-grid-title .icon {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
            }

            .enterprise-grid-stats {
                display: flex;
                gap: 24px;
            }

            .enterprise-stat {
                text-align: center;
            }

            .enterprise-stat-value {
                font-size: 2rem;
                font-weight: 700;
                color: #00d4ff;
                line-height: 1;
            }

            .enterprise-stat-label {
                font-size: 0.75rem;
                color: rgba(255,255,255,0.6);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-top: 4px;
            }

            .enterprise-companies-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
                gap: 24px;
            }

            .enterprise-company-card {
                background: rgba(255,255,255,0.05);
                backdrop-filter: blur(10px);
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.1);
                padding: 24px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .enterprise-company-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .enterprise-company-card:hover {
                transform: translateY(-4px);
                background: rgba(255,255,255,0.08);
                border-color: rgba(255,255,255,0.2);
                box-shadow: 0 12px 40px rgba(0,0,0,0.3);
            }

            .enterprise-company-card:hover::before {
                opacity: 1;
            }

            .enterprise-card-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 20px;
            }

            .enterprise-company-info {
                flex: 1;
            }

            .enterprise-company-name {
                font-size: 1.25rem;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 4px;
                line-height: 1.3;
            }

            .enterprise-company-legal {
                font-size: 0.85rem;
                color: rgba(255,255,255,0.6);
                margin-bottom: 2px;
            }

            .enterprise-company-email {
                font-size: 0.75rem;
                color: rgba(255,255,255,0.4);
                font-family: 'Courier New', monospace;
            }

            .enterprise-card-badges {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                align-items: flex-start;
            }

            .enterprise-badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }

            .enterprise-badge-status-active {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: #ffffff;
            }

            .enterprise-badge-status-trial {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: #ffffff;
            }

            .enterprise-badge-ai {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff;
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }

            .enterprise-card-metrics {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin-top: 20px;
            }

            .enterprise-metric {
                background: rgba(0,0,0,0.2);
                border-radius: 12px;
                padding: 12px;
                border: 1px solid rgba(255,255,255,0.05);
            }

            .enterprise-metric-label {
                font-size: 0.7rem;
                color: rgba(255,255,255,0.5);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .enterprise-metric-value {
                font-size: 1.5rem;
                font-weight: 700;
                color: #00d4ff;
                line-height: 1;
            }

            .enterprise-metric-sublabel {
                font-size: 0.7rem;
                color: rgba(255,255,255,0.4);
                margin-top: 4px;
            }

            .enterprise-modules-progress {
                margin-top: 16px;
            }

            .enterprise-modules-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .enterprise-modules-label {
                font-size: 0.75rem;
                color: rgba(255,255,255,0.6);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .enterprise-modules-count {
                font-size: 0.9rem;
                font-weight: 700;
                color: #ffffff;
            }

            .enterprise-progress-bar {
                height: 6px;
                background: rgba(0,0,0,0.3);
                border-radius: 3px;
                overflow: hidden;
                position: relative;
            }

            .enterprise-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                border-radius: 3px;
                transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .enterprise-progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: shimmer 2s infinite;
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            .enterprise-pricing {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }

            .enterprise-pricing-label {
                font-size: 0.7rem;
                color: rgba(255,255,255,0.5);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
            }

            .enterprise-pricing-amount {
                font-size: 2rem;
                font-weight: 700;
                color: #00d4ff;
                line-height: 1;
                font-family: 'Courier New', monospace;
            }

            .enterprise-pricing-period {
                font-size: 0.85rem;
                color: rgba(255,255,255,0.4);
                margin-top: 2px;
            }

            .enterprise-card-actions {
                display: flex;
                gap: 8px;
                margin-top: 16px;
            }

            .enterprise-btn {
                flex: 1;
                padding: 10px 16px;
                border-radius: 8px;
                border: none;
                font-weight: 600;
                font-size: 0.85rem;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .enterprise-btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff;
            }

            .enterprise-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
            }

            .enterprise-btn-icon {
                width: 36px;
                height: 36px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.1);
                color: #ffffff;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.2);
                transition: all 0.2s ease;
            }

            .enterprise-btn-icon:hover {
                background: rgba(255,255,255,0.2);
                transform: translateY(-2px);
            }

            .enterprise-empty-state {
                text-align: center;
                padding: 4rem 2rem;
                color: rgba(255,255,255,0.6);
            }

            .enterprise-empty-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                opacity: 0.5;
            }

            .enterprise-empty-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: #ffffff;
                margin-bottom: 0.5rem;
            }

            .enterprise-empty-subtitle {
                font-size: 1rem;
                color: rgba(255,255,255,0.5);
            }

            @media (max-width: 768px) {
                .enterprise-companies-grid {
                    grid-template-columns: 1fr;
                }

                .enterprise-grid-stats {
                    flex-direction: column;
                    gap: 12px;
                }

                .enterprise-card-metrics {
                    grid-template-columns: 1fr;
                }
            }
        `;
    },

    /**
     * Renderiza el header de la grilla
     */
    renderHeader(count) {
        const total = count;
        const active = count; // TODO: Calcular activas reales

        return `
            <div class="enterprise-grid-header">
                <div class="enterprise-grid-title">
                    <div class="icon">🏢</div>
                    <div>
                        <div>Companies Portfolio</div>
                        <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); font-weight: 400; letter-spacing: 0;">
                            Enterprise Management Dashboard
                        </div>
                    </div>
                </div>
                <div class="enterprise-grid-stats">
                    <div class="enterprise-stat">
                        <div class="enterprise-stat-value">${total}</div>
                        <div class="enterprise-stat-label">Total</div>
                    </div>
                    <div class="enterprise-stat">
                        <div class="enterprise-stat-value" style="color: #38ef7d;">${active}</div>
                        <div class="enterprise-stat-label">Active</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza una card de empresa
     */
    renderCompanyCard(company) {
        const modulesProgress = company.modulesSummary
            ? (company.modulesSummary.contractedModules / company.modulesSummary.totalSystemModules * 100).toFixed(0)
            : 0;

        const hasAI = company.modulesSummary && company.modulesSummary.contractedModules > 0; // Simplificado

        return `
            <div class="enterprise-company-card">
                <div class="enterprise-card-header">
                    <div class="enterprise-company-info">
                        <div class="enterprise-company-name">${company.name || 'Sin nombre'}</div>
                        <div class="enterprise-company-legal">${company.legalName || company.name || 'N/A'}</div>
                        <div class="enterprise-company-email">${company.contactEmail || 'sin-email@empresa.com'}</div>
                    </div>
                    <div class="enterprise-card-badges">
                        <div class="enterprise-badge enterprise-badge-status-${company.status || 'active'}">
                            ${company.status === 'active' ? '✓ Active' : company.status === 'trial' ? '⏱ Trial' : '⏸ Suspended'}
                        </div>
                        ${hasAI ? '<div class="enterprise-badge enterprise-badge-ai">🤖 AI</div>' : ''}
                    </div>
                </div>

                <div class="enterprise-card-metrics">
                    <div class="enterprise-metric">
                        <div class="enterprise-metric-label">👥 Employees</div>
                        <div class="enterprise-metric-value">${company.currentEmployees || 0}</div>
                        <div class="enterprise-metric-sublabel">${company.contractedEmployees || company.maxEmployees || 1} licensed</div>
                    </div>

                    <div class="enterprise-metric">
                        <div class="enterprise-metric-label">📦 Plan</div>
                        <div class="enterprise-metric-value" style="font-size: 1rem;">${company.licenseType || 'Basic'}</div>
                        <div class="enterprise-metric-sublabel">Max ${company.maxEmployees} users</div>
                    </div>
                </div>

                <div class="enterprise-modules-progress">
                    <div class="enterprise-modules-info">
                        <div class="enterprise-modules-label">📊 Modules</div>
                        <div class="enterprise-modules-count">
                            ${company.modulesSummary ? `${company.modulesSummary.contractedModules}/${company.modulesSummary.totalSystemModules}` : 'N/A'}
                        </div>
                    </div>
                    <div class="enterprise-progress-bar">
                        <div class="enterprise-progress-fill" style="width: ${modulesProgress}%"></div>
                    </div>
                </div>

                <div class="enterprise-pricing">
                    <div class="enterprise-pricing-label">💰 Monthly Revenue</div>
                    <div class="enterprise-pricing-amount">
                        $${Math.floor(company.pricing?.monthlyTotal || 0).toLocaleString('en-US')}
                    </div>
                    <div class="enterprise-pricing-period">per month (incl. taxes)</div>
                </div>

                <div class="enterprise-card-actions">
                    <button class="enterprise-btn enterprise-btn-primary" onclick="editCompany(${company.company_id || company.id})">
                        ✏️ Edit
                    </button>
                    <button class="enterprise-btn enterprise-btn-icon" onclick="viewCompanyDetails(${company.company_id || company.id})" title="View Details">
                        👁️
                    </button>
                    <button class="enterprise-btn enterprise-btn-icon" onclick="showCompanyStats(${company.company_id || company.id})" title="Statistics">
                        📊
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza estado vacío
     */
    renderEmptyState() {
        return `
            <div class="enterprise-empty-state">
                <div class="enterprise-empty-icon">🏢</div>
                <div class="enterprise-empty-title">No Companies Found</div>
                <div class="enterprise-empty-subtitle">Start by creating your first enterprise client</div>
            </div>
        `;
    }
};

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnterpriseCompaniesGrid;
} else {
    window.EnterpriseCompaniesGrid = EnterpriseCompaniesGrid;
}
