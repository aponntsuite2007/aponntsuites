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

        // Determinar si fue manual o automático
        const isManualOnboarding = company.onboarding_manual || company.onboardingManual;
        const isManualStatus = company.status_manual || company.statusManual;
        const manualIndicator = (isManualOnboarding || isManualStatus)
            ? `<div class="enterprise-badge" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-size:10px;" title="${isManualOnboarding ? 'Alta Manual' : 'Estado Manual'}">✋ Manual</div>`
            : `<div class="enterprise-badge" style="background:linear-gradient(135deg,#10b981,#059669);color:white;font-size:10px;" title="Alta automática">⚡ Auto</div>`;

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
                            ${company.status === 'active' ? '✓ Active' : company.status === 'trial' ? '⏱ Trial' : company.status === 'suspended' ? '⏸ Suspended' : '🚫 Inactive'}
                        </div>
                        ${manualIndicator}
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
                    ${this.renderStatusControls(company)}
                </div>
            </div>
        `;
    },

    /**
     * Renderiza controles de estado para superadmin/gerente_general
     */
    renderStatusControls(company) {
        // Obtener rol del staff actual
        let staffRole = '';
        try {
            // Primero: decodificar JWT (más confiable)
            const token = sessionStorage.getItem('aponnt_token_staff') || localStorage.getItem('aponnt_token_staff');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                staffRole = payload.role || '';
            }
            // Fallback: AdminPanelController
            if (!staffRole && window.AdminPanelController && AdminPanelController._currentStaff) {
                const staff = AdminPanelController._currentStaff;
                staffRole = staff.role_code || (staff.role && staff.role.role_code) || '';
            }
        } catch (e) { console.warn('[GRID] Error obteniendo rol:', e); }

        // Solo mostrar para roles de alta gerencia
        const allowedRoles = ['GG', 'GERENTE_GENERAL', 'SUPERADMIN', 'superadmin', 'gerente_general', 'DIR', 'DIRECTOR'];
        if (!allowedRoles.includes(staffRole)) {
            return '';
        }

        const companyId = company.company_id || company.id;
        const currentStatus = company.status || 'active';

        let html = '<div class="enterprise-status-controls" style="display:flex;gap:4px;margin-left:auto;">';

        if (currentStatus === 'active') {
            // Si está activa, mostrar botón para suspender
            html += `<button class="enterprise-btn enterprise-btn-icon" onclick="EnterpriseCompaniesGrid.showStatusChangeModal(${companyId}, 'suspended', '${company.name}')" title="SUSPENDER: Desactiva temporalmente el acceso. La empresa no podrá usar el sistema pero se mantienen sus datos." style="background:#f59e0b;color:white;">⏸</button>`;
            html += `<button class="enterprise-btn enterprise-btn-icon" onclick="EnterpriseCompaniesGrid.showStatusChangeModal(${companyId}, 'cancelled', '${company.name}')" title="DAR DE BAJA: Desactiva permanentemente la empresa. Usar solo para cancelaciones definitivas." style="background:#dc2626;color:white;">🚫</button>`;
        } else if (currentStatus === 'suspended') {
            // Si está suspendida, mostrar botón para reactivar o dar de baja
            html += `<button class="enterprise-btn enterprise-btn-icon" onclick="EnterpriseCompaniesGrid.showStatusChangeModal(${companyId}, 'active', '${company.name}')" title="REACTIVAR: Restaura el acceso de la empresa al sistema." style="background:#059669;color:white;">✓</button>`;
            html += `<button class="enterprise-btn enterprise-btn-icon" onclick="EnterpriseCompaniesGrid.showStatusChangeModal(${companyId}, 'cancelled', '${company.name}')" title="DAR DE BAJA: Desactiva permanentemente la empresa." style="background:#dc2626;color:white;">🚫</button>`;
        } else {
            // Si está cancelada/inactiva, mostrar botón para reactivar
            html += `<button class="enterprise-btn enterprise-btn-icon" onclick="EnterpriseCompaniesGrid.showStatusChangeModal(${companyId}, 'active', '${company.name}')" title="REACTIVAR: Restaura el acceso de la empresa al sistema." style="background:#059669;color:white;">✓</button>`;
        }

        html += '</div>';
        return html;
    },

    /**
     * Mostrar modal para cambiar estado
     */
    showStatusChangeModal(companyId, newStatus, companyName) {
        const statusLabels = {
            'active': 'Reactivar',
            'suspended': 'Suspender',
            'cancelled': 'Dar de Baja'
        };
        const statusColors = {
            'active': '#059669',
            'suspended': '#f59e0b',
            'cancelled': '#dc2626'
        };
        const statusDescriptions = {
            'active': {
                title: '¿Qué significa reactivar?',
                desc: 'La empresa podrá acceder nuevamente al sistema. Todos sus datos, usuarios y configuraciones se mantienen intactos.',
                examples: 'Ej: Renovación de contrato, pago de deuda regularizado, fin de suspensión temporal.'
            },
            'suspended': {
                title: '¿Qué significa suspender?',
                desc: 'La empresa NO podrá acceder al sistema temporalmente, pero sus datos se conservan. Ideal para situaciones que pueden resolverse.',
                examples: 'Ej: Falta de pago, revisión de contrato, solicitud del cliente, investigación interna.'
            },
            'cancelled': {
                title: '¿Qué significa dar de baja?',
                desc: 'La empresa queda desactivada permanentemente. Los datos se conservan por requisitos legales pero no podrá operar.',
                examples: 'Ej: Cancelación de contrato, cierre de empresa, solicitud formal de baja.'
            }
        };

        const info = statusDescriptions[newStatus];

        const html = `
            <div class="enterprise-modal-overlay" onclick="EnterpriseCompaniesGrid.closeStatusModal(event)" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;">
                <div onclick="event.stopPropagation()" style="background:white;border-radius:12px;max-width:500px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                    <div style="padding:20px;border-bottom:1px solid #e5e7eb;background:${statusColors[newStatus]};border-radius:12px 12px 0 0;">
                        <h3 style="margin:0;color:white;font-size:18px;">${statusLabels[newStatus]} Empresa</h3>
                    </div>
                    <div style="padding:20px;">
                        <p style="margin:0 0 15px;color:#374151;font-size:16px;"><strong>${companyName}</strong></p>

                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:15px;">
                            <strong style="color:#334155;font-size:13px;">${info.title}</strong>
                            <p style="margin:8px 0 0;color:#64748b;font-size:13px;">${info.desc}</p>
                            <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;font-style:italic;">${info.examples}</p>
                        </div>

                        <label style="display:block;font-weight:600;margin-bottom:8px;color:#374151;">Motivo del cambio *</label>
                        <textarea id="status-change-reason" rows="3" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:none;box-sizing:border-box;" placeholder="Describe el motivo (mínimo 10 caracteres)..."></textarea>
                        <p style="margin:5px 0 0;color:#9ca3af;font-size:11px;">Este motivo quedará registrado junto con tu usuario y fecha/hora.</p>
                    </div>
                    <div style="padding:15px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;">
                        <button onclick="EnterpriseCompaniesGrid.closeStatusModal()" style="padding:10px 20px;border:1px solid #d1d5db;background:white;border-radius:8px;cursor:pointer;font-size:14px;">Cancelar</button>
                        <button onclick="EnterpriseCompaniesGrid.confirmStatusChange(${companyId}, '${newStatus}')" style="padding:10px 20px;border:none;background:${statusColors[newStatus]};color:white;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">${statusLabels[newStatus]}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    },

    /**
     * Cerrar modal de cambio de estado
     */
    closeStatusModal(event) {
        if (event && event.target.className.indexOf('enterprise-modal-overlay') === -1) return;
        const modal = document.querySelector('.enterprise-modal-overlay');
        if (modal) modal.remove();
    },

    /**
     * Confirmar cambio de estado
     */
    async confirmStatusChange(companyId, newStatus) {
        const reason = document.getElementById('status-change-reason')?.value?.trim();
        if (!reason || reason.length < 10) {
            alert('Debe indicar un motivo de al menos 10 caracteres');
            return;
        }

        try {
            const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
            const resp = await fetch(`/api/v1/companies/${companyId}/manual-status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus, reason })
            });

            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.error || 'Error al cambiar estado');
            }

            this.closeStatusModal();
            alert(data.message || 'Estado actualizado correctamente');

            // Recargar la sección de empresas
            if (window.AdminPanelController) {
                AdminPanelController.loadSection('empresas');
            }
        } catch (error) {
            console.error('[ENTERPRISE GRID] Error:', error);
            alert('Error: ' + error.message);
        }
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
