/**
 * ============================================================================
 * LEADS PIPELINE DASHBOARD
 * Panel visual de gestión de leads con scoring y lifecycle
 * ============================================================================
 *
 * Características:
 * - Vista Kanban por temperatura (Hot/Warm/Cold/Dead)
 * - Vista Funnel por lifecycle stage
 * - Detalle de lead con BANT editable
 * - Timeline de actividades
 * - Explicación visual del flujo de scoring
 *
 * ============================================================================
 */

const LeadsPipelineDashboard = (function() {
    'use strict';

    // Estado interno
    let _leads = [];
    let _pipeline = null;
    let _currentFilter = { temperature: 'all', lifecycle: 'all', vendor: 'all' };
    let _currentView = 'kanban'; // 'kanban' | 'funnel' | 'list'
    let _selectedLead = null;
    let _staffInfo = null;
    let _isManager = false;

    // Configuración de colores
    const TEMPERATURE_CONFIG = {
        hot: { icon: '🔥', label: 'HOT', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', action: 'Llamar HOY' },
        warm: { icon: '🟡', label: 'WARM', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', action: 'Seguimiento semanal' },
        cold: { icon: '🔵', label: 'COLD', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', action: 'Nurturing' },
        dead: { icon: '⚫', label: 'DEAD', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)', action: 'Revisar descalificar' }
    };

    const LIFECYCLE_CONFIG = {
        subscriber: { icon: '📧', label: 'Subscriber', order: 1 },
        lead: { icon: '👤', label: 'Lead', order: 2 },
        mql: { icon: '🎯', label: 'MQL', order: 3 },
        sal: { icon: '🤝', label: 'SAL', order: 4 },
        sql: { icon: '💼', label: 'SQL', order: 5 },
        opportunity: { icon: '💰', label: 'Opportunity', order: 6 },
        customer: { icon: '✅', label: 'Customer', order: 7 },
        evangelist: { icon: '⭐', label: 'Evangelist', order: 8 },
        disqualified: { icon: '❌', label: 'Descalificado', order: 9 },
        lost: { icon: '😔', label: 'Perdido', order: 10 }
    };

    const BANT_OPTIONS = {
        budget: [
            { value: 0, label: 'No sabe' },
            { value: 5, label: 'No tiene' },
            { value: 10, label: 'Buscando' },
            { value: 15, label: 'Pendiente' },
            { value: 20, label: 'Asignado' },
            { value: 25, label: 'Aprobado' }
        ],
        authority: [
            { value: 0, label: 'Desconocido' },
            { value: 5, label: 'Usuario final' },
            { value: 10, label: 'Influenciador' },
            { value: 15, label: 'Recomienda' },
            { value: 20, label: 'Co-decide' },
            { value: 25, label: 'Decide solo' }
        ],
        need: [
            { value: 0, label: 'No tiene' },
            { value: 5, label: 'Mínima' },
            { value: 10, label: 'Leve' },
            { value: 15, label: 'Moderada' },
            { value: 20, label: 'Importante' },
            { value: 25, label: 'Crítica' }
        ],
        timeline: [
            { value: 0, label: 'Indefinido' },
            { value: 5, label: '+1 año' },
            { value: 10, label: 'Este año' },
            { value: 15, label: 'Este semestre' },
            { value: 20, label: 'Este quarter' },
            { value: 25, label: 'Inmediato' }
        ]
    };

    const DISQUALIFICATION_REASONS = [
        { code: 'budget_too_low', label: 'Sin presupuesto' },
        { code: 'not_decision_maker', label: 'No es decisor' },
        { code: 'no_need', label: 'No tiene necesidad' },
        { code: 'bad_timing', label: 'Timing incorrecto' },
        { code: 'competitor_chosen', label: 'Eligió competencia' },
        { code: 'company_too_small', label: 'Empresa muy chica' },
        { code: 'unresponsive', label: 'No responde' },
        { code: 'fake_spam', label: 'Datos falsos/Spam' }
    ];

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    async function init(container, staffInfo) {
        _staffInfo = staffInfo;
        _isManager = ['GG', 'GR', 'LV', 'SV'].includes(staffInfo?.role_code);

        container.innerHTML = `
            <div class="leads-dashboard">
                <div class="leads-header">
                    <h2><span class="header-icon">🎯</span> Pipeline de Ventas</h2>
                    <div class="header-actions">
                        <button class="btn-help" onclick="LeadsPipelineDashboard.showHelp()">
                            <i class="fas fa-question-circle"></i> Cómo funciona
                        </button>
                    </div>
                </div>

                <div class="leads-filters">
                    <div class="filter-group">
                        <label>Temperatura:</label>
                        <select id="filter-temperature" onchange="LeadsPipelineDashboard.applyFilters()">
                            <option value="all">Todas</option>
                            <option value="hot">🔥 Hot</option>
                            <option value="warm">🟡 Warm</option>
                            <option value="cold">🔵 Cold</option>
                            <option value="dead">⚫ Dead</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Etapa:</label>
                        <select id="filter-lifecycle" onchange="LeadsPipelineDashboard.applyFilters()">
                            <option value="all">Todas</option>
                            <option value="lead">Lead</option>
                            <option value="mql">MQL</option>
                            <option value="sql">SQL</option>
                            <option value="opportunity">Opportunity</option>
                        </select>
                    </div>
                    ${_isManager ? `
                    <div class="filter-group">
                        <label>Vendedor:</label>
                        <select id="filter-vendor" onchange="LeadsPipelineDashboard.applyFilters()">
                            <option value="all">Todos</option>
                        </select>
                    </div>
                    ` : ''}
                    <div class="filter-group view-toggle">
                        <button class="view-btn active" data-view="kanban" onclick="LeadsPipelineDashboard.setView('kanban')">
                            <i class="fas fa-columns"></i> Kanban
                        </button>
                        <button class="view-btn" data-view="funnel" onclick="LeadsPipelineDashboard.setView('funnel')">
                            <i class="fas fa-filter"></i> Funnel
                        </button>
                        <button class="view-btn" data-view="list" onclick="LeadsPipelineDashboard.setView('list')">
                            <i class="fas fa-list"></i> Lista
                        </button>
                    </div>
                    <div class="filter-group">
                        <input type="text" id="search-leads" placeholder="🔍 Buscar empresa..."
                               onkeyup="LeadsPipelineDashboard.searchLeads(this.value)">
                    </div>
                </div>

                <div class="leads-summary" id="leads-summary">
                    <!-- Se llena dinámicamente -->
                </div>

                <div class="leads-content" id="leads-content">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i> Cargando leads...
                    </div>
                </div>

                <!-- Modal de ayuda se crea dinámicamente -->
            </div>
        `;

        // Agregar estilos
        addStyles();

        // Cargar datos
        await loadLeads();
    }

    // =========================================================================
    // CARGA DE DATOS
    // =========================================================================

    async function loadLeads() {
        try {
            const token = localStorage.getItem('aponnt_token_staff');
            const params = new URLSearchParams();

            if (_isManager) {
                params.append('all', 'true');
            }
            if (_currentFilter.temperature !== 'all') {
                params.append('temperature', _currentFilter.temperature);
            }
            if (_currentFilter.lifecycle !== 'all') {
                params.append('lifecycle', _currentFilter.lifecycle);
            }

            const response = await fetch(`/api/aponnt/leads?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando leads');

            const data = await response.json();
            _leads = data.leads || [];

            // Cargar pipeline summary
            const pipelineResponse = await fetch('/api/aponnt/leads/pipeline/summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (pipelineResponse.ok) {
                const pipelineData = await pipelineResponse.json();
                _pipeline = pipelineData;
            }

            renderDashboard();

        } catch (error) {
            console.error('[LEADS] Error:', error);
            document.getElementById('leads-content').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error cargando leads: ${error.message}</p>
                    <button onclick="LeadsPipelineDashboard.loadLeads()">Reintentar</button>
                </div>
            `;
        }
    }

    // =========================================================================
    // RENDERIZADO
    // =========================================================================

    function renderDashboard() {
        renderSummary();

        switch (_currentView) {
            case 'kanban':
                renderKanbanView();
                break;
            case 'funnel':
                renderFunnelView();
                break;
            case 'list':
                renderListView();
                break;
        }
    }

    function renderSummary() {
        const totals = _pipeline?.totals || {};
        const container = document.getElementById('leads-summary');

        container.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card total">
                    <div class="card-value">${totals.total || _leads.length}</div>
                    <div class="card-label">Total Leads</div>
                </div>
                <div class="summary-card hot">
                    <div class="card-icon">🔥</div>
                    <div class="card-value">${totals.hot || 0}</div>
                    <div class="card-label">Hot</div>
                </div>
                <div class="summary-card warm">
                    <div class="card-icon">🟡</div>
                    <div class="card-value">${totals.warm || 0}</div>
                    <div class="card-label">Warm</div>
                </div>
                <div class="summary-card cold">
                    <div class="card-icon">🔵</div>
                    <div class="card-value">${totals.cold || 0}</div>
                    <div class="card-label">Cold</div>
                </div>
                <div class="summary-card mql">
                    <div class="card-value">${totals.mql || 0}</div>
                    <div class="card-label">MQL</div>
                </div>
                <div class="summary-card sql">
                    <div class="card-value">${totals.sql || 0}</div>
                    <div class="card-label">SQL</div>
                </div>
                <div class="summary-card opportunity">
                    <div class="card-value">${totals.opportunities || 0}</div>
                    <div class="card-label">Opportunities</div>
                </div>
                <div class="summary-card score">
                    <div class="card-value">${totals.avg_score || 0}</div>
                    <div class="card-label">Score Promedio</div>
                </div>
            </div>
        `;
    }

    function renderKanbanView() {
        const container = document.getElementById('leads-content');

        // Agrupar por temperatura
        const byTemp = {
            hot: _leads.filter(l => l.temperature === 'hot'),
            warm: _leads.filter(l => l.temperature === 'warm'),
            cold: _leads.filter(l => l.temperature === 'cold'),
            dead: _leads.filter(l => l.temperature === 'dead')
        };

        container.innerHTML = `
            <div class="kanban-board">
                ${Object.entries(byTemp).map(([temp, leads]) => `
                    <div class="kanban-column" data-temperature="${temp}">
                        <div class="column-header" style="background: ${TEMPERATURE_CONFIG[temp].bgColor}; border-left: 4px solid ${TEMPERATURE_CONFIG[temp].color}">
                            <span class="column-icon">${TEMPERATURE_CONFIG[temp].icon}</span>
                            <span class="column-title">${TEMPERATURE_CONFIG[temp].label}</span>
                            <span class="column-count">${leads.length}</span>
                        </div>
                        <div class="column-cards">
                            ${leads.length === 0 ? '<div class="empty-column">Sin leads</div>' :
                              leads.map(lead => renderLeadCard(lead)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderFunnelView() {
        const container = document.getElementById('leads-content');

        // Agrupar por lifecycle
        const byLifecycle = {};
        Object.keys(LIFECYCLE_CONFIG).forEach(stage => {
            byLifecycle[stage] = _leads.filter(l => l.lifecycle_stage === stage);
        });

        // Calcular máximo para barras
        const maxCount = Math.max(...Object.values(byLifecycle).map(arr => arr.length), 1);

        container.innerHTML = `
            <div class="funnel-view">
                <div class="funnel-chart">
                    ${['lead', 'mql', 'sql', 'opportunity', 'customer'].map(stage => {
                        const count = byLifecycle[stage]?.length || 0;
                        const width = Math.max((count / maxCount) * 100, 5);
                        const config = LIFECYCLE_CONFIG[stage];
                        return `
                            <div class="funnel-row" onclick="LeadsPipelineDashboard.filterByLifecycle('${stage}')">
                                <div class="funnel-label">
                                    ${config.icon} ${config.label}
                                </div>
                                <div class="funnel-bar-container">
                                    <div class="funnel-bar" style="width: ${width}%">
                                        <span class="funnel-count">${count}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="funnel-leads">
                    <h3>Leads en etapa: ${LIFECYCLE_CONFIG[_currentFilter.lifecycle]?.label || 'Todas'}</h3>
                    <div class="leads-grid">
                        ${_leads.slice(0, 20).map(lead => renderLeadCard(lead)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function renderListView() {
        const container = document.getElementById('leads-content');

        container.innerHTML = `
            <div class="list-view">
                <table class="leads-table">
                    <thead>
                        <tr>
                            <th>Empresa</th>
                            <th>Contacto</th>
                            <th>Temp</th>
                            <th>Etapa</th>
                            <th>Score</th>
                            <th>BANT</th>
                            <th>Última Actividad</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${_leads.map(lead => `
                            <tr class="lead-row" onclick="LeadsPipelineDashboard.showLeadDetail('${lead.id}')">
                                <td>
                                    <strong>${lead.company_name}</strong>
                                    <br><small>${lead.company_industry || ''}</small>
                                </td>
                                <td>
                                    ${lead.contact_name}
                                    <br><small>${lead.contact_email}</small>
                                </td>
                                <td>
                                    <span class="temp-badge temp-${lead.temperature}">
                                        ${TEMPERATURE_CONFIG[lead.temperature]?.icon} ${TEMPERATURE_CONFIG[lead.temperature]?.label}
                                    </span>
                                </td>
                                <td>
                                    <span class="lifecycle-badge">
                                        ${LIFECYCLE_CONFIG[lead.lifecycle_stage]?.icon} ${LIFECYCLE_CONFIG[lead.lifecycle_stage]?.label}
                                    </span>
                                </td>
                                <td>
                                    <div class="score-cell">
                                        <strong>${lead.total_score}</strong>
                                        <div class="score-mini-bar">
                                            <div class="score-fill" style="width: ${Math.min(lead.total_score, 100)}%"></div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="bant-mini">
                                        B:${lead.bant_budget} A:${lead.bant_authority} N:${lead.bant_need} T:${lead.bant_timeline}
                                    </div>
                                </td>
                                <td>
                                    ${lead.days_since_last_activity || 0} días
                                    ${lead.days_since_last_activity > 30 ? '⚠️' : ''}
                                </td>
                                <td>
                                    <button class="btn-action" onclick="event.stopPropagation(); LeadsPipelineDashboard.showLeadDetail('${lead.id}')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderLeadCard(lead) {
        const tempConfig = TEMPERATURE_CONFIG[lead.temperature] || TEMPERATURE_CONFIG.cold;
        const lifecycleConfig = LIFECYCLE_CONFIG[lead.lifecycle_stage] || LIFECYCLE_CONFIG.lead;
        const bantTotal = (lead.bant_budget || 0) + (lead.bant_authority || 0) + (lead.bant_need || 0) + (lead.bant_timeline || 0);

        return `
            <div class="lead-card"
                 style="border-left: 4px solid ${tempConfig.color}"
                 onclick="LeadsPipelineDashboard.showLeadDetail('${lead.id}')">
                <div class="card-header">
                    <span class="company-name">${lead.company_name}</span>
                    <span class="lifecycle-tag">${lifecycleConfig.icon} ${lifecycleConfig.label}</span>
                </div>
                <div class="card-contact">
                    <i class="fas fa-user"></i> ${lead.contact_name || 'Sin contacto'}
                </div>
                <div class="card-score">
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${Math.min(lead.total_score, 100)}%; background: ${tempConfig.color}"></div>
                    </div>
                    <span class="score-value">${lead.total_score} pts</span>
                </div>
                <div class="card-bant">
                    <span title="Budget">B:${lead.bant_budget || 0}</span>
                    <span title="Authority">A:${lead.bant_authority || 0}</span>
                    <span title="Need">N:${lead.bant_need || 0}</span>
                    <span title="Timeline">T:${lead.bant_timeline || 0}</span>
                </div>
                <div class="card-footer">
                    <span class="last-activity">
                        ${lead.days_since_last_activity > 0 ? `${lead.days_since_last_activity}d sin actividad` : 'Activo hoy'}
                        ${lead.days_since_last_activity > 30 ? '⚠️' : ''}
                    </span>
                    <span class="action-hint">${tempConfig.action}</span>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // DETALLE DE LEAD (MODAL)
    // =========================================================================

    async function showLeadDetail(leadId) {
        const lead = _leads.find(l => l.id === leadId);
        if (!lead) return;

        _selectedLead = lead;
        const tempConfig = TEMPERATURE_CONFIG[lead.temperature] || TEMPERATURE_CONFIG.cold;
        const lifecycleConfig = LIFECYCLE_CONFIG[lead.lifecycle_stage] || LIFECYCLE_CONFIG.lead;
        const bantTotal = (lead.bant_budget || 0) + (lead.bant_authority || 0) + (lead.bant_need || 0) + (lead.bant_timeline || 0);

        // Cargar actividades
        let activities = [];
        try {
            const token = localStorage.getItem('aponnt_token_staff');
            const response = await fetch(`/api/aponnt/leads/${leadId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                activities = data.activities || [];
            }
        } catch (e) {
            console.warn('No se pudieron cargar actividades');
        }

        const modal = document.createElement('div');
        modal.className = 'lead-modal-overlay';
        modal.innerHTML = `
            <div class="lead-modal">
                <div class="modal-header" style="background: linear-gradient(135deg, ${tempConfig.color}22, ${tempConfig.color}44)">
                    <div class="header-info">
                        <h2>${lead.company_name}</h2>
                        <div class="header-badges">
                            <span class="temp-badge" style="background: ${tempConfig.color}">${tempConfig.icon} ${tempConfig.label}</span>
                            <span class="lifecycle-badge">${lifecycleConfig.icon} ${lifecycleConfig.label}</span>
                        </div>
                    </div>
                    <button class="modal-close" onclick="this.closest('.lead-modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body">
                    <!-- Sección Score -->
                    <div class="detail-section score-section">
                        <h3>📊 Score Total</h3>
                        <div class="score-display">
                            <div class="score-number">${lead.total_score}</div>
                            <div class="score-bar-large">
                                <div class="score-fill" style="width: ${Math.min(lead.total_score / 2, 100)}%; background: ${tempConfig.color}"></div>
                            </div>
                        </div>
                        <div class="score-breakdown">
                            <div class="breakdown-item">
                                <span>BANT</span>
                                <strong>${bantTotal}/100</strong>
                            </div>
                            <div class="breakdown-item">
                                <span>Behavioral</span>
                                <strong>${lead.behavioral_score || 0}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- Sección Lifecycle -->
                    <div class="detail-section lifecycle-section">
                        <h3>🔄 Lifecycle</h3>
                        <div class="lifecycle-track">
                            ${['lead', 'mql', 'sql', 'opportunity', 'customer'].map(stage => {
                                const isActive = stage === lead.lifecycle_stage;
                                const isPast = LIFECYCLE_CONFIG[stage].order < LIFECYCLE_CONFIG[lead.lifecycle_stage].order;
                                return `
                                    <div class="lifecycle-step ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}">
                                        <div class="step-dot"></div>
                                        <span class="step-label">${LIFECYCLE_CONFIG[stage].label}</span>
                                    </div>
                                `;
                            }).join('<div class="lifecycle-line"></div>')}
                        </div>
                        <div class="lifecycle-actions">
                            <button class="btn-secondary" onclick="LeadsPipelineDashboard.changeLifecycle('${leadId}', 'advance')">
                                ▲ Avanzar etapa
                            </button>
                            <button class="btn-danger" onclick="LeadsPipelineDashboard.showDisqualifyModal('${leadId}')">
                                ✗ Descalificar
                            </button>
                        </div>
                    </div>

                    <!-- Sección BANT -->
                    <div class="detail-section bant-section">
                        <h3>🎯 BANT Score</h3>
                        <div class="bant-grid">
                            ${['budget', 'authority', 'need', 'timeline'].map(key => `
                                <div class="bant-item">
                                    <label>${key.charAt(0).toUpperCase() + key.slice(1)}</label>
                                    <select id="bant-${key}" data-key="${key}">
                                        ${BANT_OPTIONS[key].map(opt => `
                                            <option value="${opt.value}" ${lead[`bant_${key}`] === opt.value ? 'selected' : ''}>
                                                ${opt.value} - ${opt.label}
                                            </option>
                                        `).join('')}
                                    </select>
                                    <div class="bant-bar">
                                        <div class="bant-fill" style="width: ${(lead[`bant_${key}`] || 0) * 4}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-primary" onclick="LeadsPipelineDashboard.saveBANT('${leadId}')">
                            💾 Guardar BANT
                        </button>
                    </div>

                    <!-- Sección Contacto -->
                    <div class="detail-section contact-section">
                        <h3>👤 Contacto</h3>
                        <div class="contact-info">
                            <p><strong>${lead.contact_name}</strong> ${lead.contact_is_decision_maker ? '👑 Decisor' : ''}</p>
                            <p><i class="fas fa-envelope"></i> ${lead.contact_email}</p>
                            <p><i class="fas fa-phone"></i> ${lead.contact_phone || 'Sin teléfono'}</p>
                            <p><i class="fas fa-briefcase"></i> ${lead.contact_job_title || 'Sin cargo'}</p>
                        </div>
                        <div class="contact-actions">
                            <button class="btn-action" onclick="window.location.href='mailto:${lead.contact_email}'">
                                <i class="fas fa-envelope"></i> Email
                            </button>
                            ${lead.contact_phone ? `
                                <button class="btn-action" onclick="window.location.href='tel:${lead.contact_phone}'">
                                    <i class="fas fa-phone"></i> Llamar
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Sección Presupuesto -->
                    ${lead.quote_id ? `
                    <div class="detail-section" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3);">
                        <h3>📋 Presupuesto Asociado</h3>
                        <p style="margin-bottom: 12px; color: rgba(255,255,255,0.7);">Este lead tiene un presupuesto generado.</p>
                        <button class="btn-primary" onclick="LeadsPipelineDashboard.goToQuote('${lead.quote_id}')">
                            📋 Ver Presupuesto
                        </button>
                    </div>
                    ` : `
                    <div class="detail-section">
                        <h3>📋 Presupuesto</h3>
                        <p style="color: rgba(255,255,255,0.5);">Sin presupuesto asociado a este lead.</p>
                    </div>
                    `}

                    <!-- Sección Timeline -->
                    <div class="detail-section timeline-section">
                        <h3>📅 Actividades Recientes</h3>
                        <div class="activity-timeline">
                            ${activities.length === 0 ? '<p class="no-activities">Sin actividades registradas</p>' :
                              activities.slice(0, 10).map(act => `
                                <div class="timeline-item ${act.score_change > 0 ? 'positive' : act.score_change < 0 ? 'negative' : ''}">
                                    <div class="timeline-dot"></div>
                                    <div class="timeline-content">
                                        <span class="timeline-date">${new Date(act.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                        <span class="timeline-action">${act.activity_description || act.activity_type}</span>
                                        <span class="timeline-score ${act.score_change > 0 ? 'positive' : 'negative'}">
                                            ${act.score_change > 0 ? '+' : ''}${act.score_change} pts
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Cerrar al hacer click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // =========================================================================
    // ACCIONES
    // =========================================================================

    async function saveBANT(leadId) {
        const budget = parseInt(document.getElementById('bant-budget').value);
        const authority = parseInt(document.getElementById('bant-authority').value);
        const need = parseInt(document.getElementById('bant-need').value);
        const timeline = parseInt(document.getElementById('bant-timeline').value);

        try {
            const token = localStorage.getItem('aponnt_token_staff');
            const response = await fetch(`/api/aponnt/leads/${leadId}/bant`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ budget, authority, need, timeline })
            });

            if (!response.ok) throw new Error('Error guardando BANT');

            const data = await response.json();
            showToast('BANT actualizado. Nuevo score: ' + data.totalScore, 'success');

            // Recargar leads
            await loadLeads();

            // Cerrar modal
            document.querySelector('.lead-modal-overlay')?.remove();

        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        }
    }

    async function changeLifecycle(leadId, action) {
        const lead = _leads.find(l => l.id === leadId);
        if (!lead) return;

        const stages = ['lead', 'mql', 'sql', 'opportunity', 'customer'];
        const currentIndex = stages.indexOf(lead.lifecycle_stage);

        let newStage;
        if (action === 'advance' && currentIndex < stages.length - 1) {
            newStage = stages[currentIndex + 1];
        } else {
            return;
        }

        try {
            const token = localStorage.getItem('aponnt_token_staff');
            const response = await fetch(`/api/aponnt/leads/${leadId}/lifecycle`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newStage, reason: 'Avance manual' })
            });

            if (!response.ok) throw new Error('Error cambiando etapa');

            showToast(`Lead avanzado a ${LIFECYCLE_CONFIG[newStage].label}`, 'success');
            await loadLeads();
            document.querySelector('.lead-modal-overlay')?.remove();

        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        }
    }

    function showDisqualifyModal(leadId) {
        const modal = document.createElement('div');
        modal.className = 'disqualify-modal-overlay';
        modal.innerHTML = `
            <div class="disqualify-modal">
                <h3>❌ Descalificar Lead</h3>
                <div class="form-group">
                    <label>Razón:</label>
                    <select id="disqualify-reason">
                        ${DISQUALIFICATION_REASONS.map(r => `
                            <option value="${r.code}">${r.label}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Notas:</label>
                    <textarea id="disqualify-notes" rows="3" placeholder="Detalles adicionales..."></textarea>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="can-reactivate" checked>
                        Se puede reactivar en el futuro
                    </label>
                </div>
                <div class="form-group">
                    <label>Recontactar después de:</label>
                    <input type="date" id="reactivate-date">
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.disqualify-modal-overlay').remove()">Cancelar</button>
                    <button class="btn-danger" onclick="LeadsPipelineDashboard.confirmDisqualify('${leadId}')">Descalificar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function confirmDisqualify(leadId) {
        const reason = document.getElementById('disqualify-reason').value;
        const notes = document.getElementById('disqualify-notes').value;
        const canReactivate = document.getElementById('can-reactivate').checked;
        const reactivateAfter = document.getElementById('reactivate-date').value || null;

        try {
            const token = localStorage.getItem('aponnt_token_staff');
            const response = await fetch(`/api/aponnt/leads/${leadId}/disqualify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason, notes, canReactivate, reactivateAfter })
            });

            if (!response.ok) throw new Error('Error descalificando');

            showToast('Lead descalificado', 'success');
            document.querySelector('.disqualify-modal-overlay')?.remove();
            document.querySelector('.lead-modal-overlay')?.remove();
            await loadLeads();

        } catch (error) {
            showToast('Error: ' + error.message, 'error');
        }
    }

    // =========================================================================
    // FILTROS Y VISTAS
    // =========================================================================

    function setView(view) {
        _currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        renderDashboard();
    }

    function applyFilters() {
        _currentFilter.temperature = document.getElementById('filter-temperature')?.value || 'all';
        _currentFilter.lifecycle = document.getElementById('filter-lifecycle')?.value || 'all';
        _currentFilter.vendor = document.getElementById('filter-vendor')?.value || 'all';
        loadLeads();
    }

    function filterByLifecycle(stage) {
        document.getElementById('filter-lifecycle').value = stage;
        _currentFilter.lifecycle = stage;
        loadLeads();
    }

    function searchLeads(query) {
        if (!query) {
            renderDashboard();
            return;
        }
        const filtered = _leads.filter(l =>
            l.company_name.toLowerCase().includes(query.toLowerCase()) ||
            l.contact_name?.toLowerCase().includes(query.toLowerCase()) ||
            l.contact_email?.toLowerCase().includes(query.toLowerCase())
        );
        _leads = filtered;
        renderDashboard();
    }

    // =========================================================================
    // PANEL DE AYUDA
    // =========================================================================

    function renderHelpPanel() {
        return `
            <div class="help-content">
                <div class="help-section">
                    <h4>📈 Flujo de Scoring</h4>
                    <div class="scoring-flow">
                        <div class="flow-step">
                            <span class="step-icon">📅</span>
                            <span class="step-name">Reunión Agendada</span>
                            <span class="step-points">+35 pts</span>
                        </div>
                        <div class="flow-arrow">→</div>
                        <div class="flow-step">
                            <span class="step-icon">📋</span>
                            <span class="step-name">Encuesta</span>
                            <span class="step-points">+20 pts</span>
                        </div>
                        <div class="flow-arrow">→</div>
                        <div class="flow-step">
                            <span class="step-icon">🤝</span>
                            <span class="step-name">Reunión Asistida</span>
                            <span class="step-points">+50 pts</span>
                        </div>
                        <div class="flow-arrow">→</div>
                        <div class="flow-step">
                            <span class="step-icon">📄</span>
                            <span class="step-name">Presupuesto</span>
                            <span class="step-points">+60 pts</span>
                        </div>
                    </div>
                </div>

                <div class="help-section">
                    <h4>🌡️ Temperatura</h4>
                    <div class="temp-legend">
                        <div class="legend-item"><span class="temp-dot hot"></span> <strong>HOT (80+)</strong> - Llamar HOY</div>
                        <div class="legend-item"><span class="temp-dot warm"></span> <strong>WARM (40-79)</strong> - Seguimiento semanal</div>
                        <div class="legend-item"><span class="temp-dot cold"></span> <strong>COLD (1-39)</strong> - Nurturing con emails</div>
                        <div class="legend-item"><span class="temp-dot dead"></span> <strong>DEAD (0)</strong> - Revisar descalificar</div>
                    </div>
                </div>

                <div class="help-section">
                    <h4>🎯 BANT (0-100 puntos)</h4>
                    <div class="bant-legend">
                        <div class="legend-item"><strong>B</strong>udget (0-25) - ¿Tiene presupuesto?</div>
                        <div class="legend-item"><strong>A</strong>uthority (0-25) - ¿Es quien decide?</div>
                        <div class="legend-item"><strong>N</strong>eed (0-25) - ¿Tiene el problema?</div>
                        <div class="legend-item"><strong>T</strong>imeline (0-25) - ¿Cuándo quiere comprar?</div>
                    </div>
                </div>

                <div class="help-section">
                    <h4>⚠️ Decay por Inactividad</h4>
                    <div class="decay-legend">
                        <div class="legend-item">30 días sin actividad: <strong>-10 pts</strong></div>
                        <div class="legend-item">60 días sin actividad: <strong>-20 pts</strong></div>
                        <div class="legend-item">90 días sin actividad: <strong>-30 pts</strong> + move to COLD</div>
                    </div>
                </div>
            </div>
        `;
    }

    function showHelp() {
        // Remover modal anterior si existe
        const existing = document.getElementById('leads-help-modal');
        if (existing) {
            existing.remove();
            return;
        }

        // Crear modal de ayuda
        const modal = document.createElement('div');
        modal.id = 'leads-help-modal';
        modal.className = 'help-modal-overlay';
        modal.innerHTML = `
            <div class="help-modal">
                <div class="help-modal-header">
                    <h3>🎯 Cómo funciona el Pipeline de Ventas</h3>
                    <button class="modal-close" onclick="LeadsPipelineDashboard.closeHelp()">&times;</button>
                </div>
                <div class="help-modal-body">
                    ${renderHelpPanel()}
                </div>
            </div>
        `;

        // Cerrar al hacer click en el overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
    }

    function closeHelp() {
        const modal = document.getElementById('leads-help-modal');
        if (modal) modal.remove();
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    function goToQuote(quoteId) {
        // Close lead modal
        document.querySelector('.lead-modal-overlay')?.remove();
        // Navigate to Presupuestos tab in admin panel
        if (typeof window.navigateToModule === 'function') {
            window.navigateToModule('quotes');
        } else if (typeof window.loadModule === 'function') {
            window.loadModule('quotes');
        }
        // After module loads, open the quote detail
        setTimeout(function() {
            if (window.QuotesManagement && typeof window.QuotesManagement.viewQuote === 'function') {
                window.QuotesManagement.viewQuote(parseInt(quoteId));
            }
        }, 800);
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function addStyles() {
        if (document.getElementById('leads-dashboard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'leads-dashboard-styles';
        styles.textContent = `
            /* ========================================
               DARK THEME - LEADS PIPELINE DASHBOARD
               ======================================== */

            .leads-dashboard {
                padding: 20px;
                background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
                min-height: calc(100vh - 60px);
                color: #e6edf3;
            }

            .leads-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .leads-header h2 {
                margin: 0;
                font-size: 24px;
                color: #e6edf3;
                text-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
            }

            .header-icon {
                margin-right: 10px;
            }

            .btn-help {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #0d1117;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
            }

            .btn-help:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
            }

            .leads-filters {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                margin-bottom: 20px;
                padding: 15px;
                background: rgba(30, 41, 59, 0.8);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
            }

            .filter-group {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .filter-group label {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
            }

            .filter-group select, .filter-group input {
                padding: 8px 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                font-size: 14px;
                background: rgba(15, 15, 30, 0.8);
                color: #e6edf3;
            }

            .filter-group select:focus, .filter-group input:focus {
                border-color: #f59e0b;
                outline: none;
                box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
            }

            .view-toggle {
                margin-left: auto;
            }

            .view-btn {
                padding: 8px 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(15, 15, 30, 0.8);
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                transition: all 0.2s;
            }

            .view-btn:first-child { border-radius: 6px 0 0 6px; }
            .view-btn:last-child { border-radius: 0 6px 6px 0; }

            .view-btn.active {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #0d1117;
                border-color: #f59e0b;
                font-weight: 600;
            }

            .summary-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .summary-card {
                background: rgba(30, 41, 59, 0.8);
                padding: 15px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                transition: all 0.3s;
            }

            .summary-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }

            .summary-card.hot { border-top: 3px solid #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.2); }
            .summary-card.warm { border-top: 3px solid #f59e0b; box-shadow: 0 0 20px rgba(245, 158, 11, 0.2); }
            .summary-card.cold { border-top: 3px solid #3b82f6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.2); }

            .card-icon { font-size: 24px; }
            .card-value { font-size: 28px; font-weight: bold; color: #e6edf3; }
            .card-label { font-size: 12px; color: rgba(255, 255, 255, 0.6); }

            /* Kanban Board */
            .kanban-board {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
            }

            .kanban-column {
                background: rgba(30, 41, 59, 0.6);
                border-radius: 12px;
                min-height: 400px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .column-header {
                padding: 15px;
                border-radius: 12px 12px 0 0;
                display: flex;
                align-items: center;
                gap: 10px;
                color: #e6edf3;
            }

            .column-icon { font-size: 20px; }
            .column-title { font-weight: 600; flex: 1; }
            .column-count {
                background: rgba(255, 255, 255, 0.15);
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 12px;
            }

            .column-cards {
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .lead-card {
                background: rgba(15, 15, 30, 0.9);
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.3s;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .lead-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 20px rgba(245, 158, 11, 0.2);
                border-color: rgba(245, 158, 11, 0.3);
            }

            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }

            .company-name {
                font-weight: 600;
                font-size: 14px;
                color: #e6edf3;
            }

            .lifecycle-tag {
                font-size: 11px;
                background: rgba(99, 102, 241, 0.3);
                padding: 2px 6px;
                border-radius: 4px;
                color: #a5b4fc;
            }

            .card-contact {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
                margin-bottom: 8px;
            }

            .card-score {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .score-bar {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
            }

            .score-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.3s;
            }

            .score-value {
                font-size: 12px;
                font-weight: 600;
                color: #e6edf3;
            }

            .card-bant {
                display: flex;
                gap: 8px;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.5);
            }

            .card-footer {
                display: flex;
                justify-content: space-between;
                margin-top: 8px;
                font-size: 11px;
            }

            .last-activity { color: rgba(255, 255, 255, 0.4); }
            .action-hint { color: #f59e0b; font-weight: 500; }

            /* Modal */
            .lead-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                backdrop-filter: blur(5px);
            }

            .lead-modal {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                border-radius: 16px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            }

            .modal-header {
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .modal-header h2 {
                margin: 0 0 10px 0;
                color: #e6edf3;
            }

            .header-badges {
                display: flex;
                gap: 10px;
            }

            .temp-badge, .lifecycle-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                color: white;
            }

            .lifecycle-badge {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: rgba(255, 255, 255, 0.6);
                transition: color 0.2s;
            }

            .modal-close:hover {
                color: #ef4444;
            }

            .modal-body {
                padding: 20px;
                overflow-y: auto;
            }

            .detail-section {
                background: rgba(15, 15, 30, 0.6);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .detail-section h3 {
                margin: 0 0 15px 0;
                font-size: 16px;
                color: #f59e0b;
            }

            .score-display {
                display: flex;
                align-items: center;
                gap: 20px;
            }

            .score-number {
                font-size: 48px;
                font-weight: bold;
                color: #e6edf3;
                text-shadow: 0 0 30px rgba(245, 158, 11, 0.5);
            }

            .score-bar-large {
                flex: 1;
                height: 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                overflow: hidden;
            }

            .score-breakdown {
                display: flex;
                gap: 30px;
                margin-top: 15px;
            }

            .breakdown-item {
                display: flex;
                flex-direction: column;
            }

            .breakdown-item span { font-size: 12px; color: rgba(255, 255, 255, 0.6); }
            .breakdown-item strong { font-size: 20px; color: #e6edf3; }

            .lifecycle-track {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
            }

            .lifecycle-step {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }

            .step-dot {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                border: 3px solid rgba(255, 255, 255, 0.2);
            }

            .lifecycle-step.past .step-dot {
                background: #22c55e;
                border-color: #22c55e;
                box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
            }

            .lifecycle-step.active .step-dot {
                background: #f59e0b;
                border-color: #f59e0b;
                box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3);
            }

            .step-label {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
            }

            .lifecycle-line {
                flex: 1;
                height: 3px;
                background: rgba(255, 255, 255, 0.1);
            }

            .lifecycle-actions {
                display: flex;
                gap: 10px;
            }

            .bant-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-bottom: 15px;
            }

            .bant-item label {
                display: block;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.6);
                margin-bottom: 5px;
            }

            .bant-item select {
                width: 100%;
                padding: 8px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                margin-bottom: 5px;
                background: rgba(15, 15, 30, 0.8);
                color: #e6edf3;
            }

            .bant-bar {
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
            }

            .bant-fill {
                height: 100%;
                background: linear-gradient(90deg, #f59e0b 0%, #22c55e 100%);
                border-radius: 3px;
            }

            .activity-timeline {
                max-height: 300px;
                overflow-y: auto;
            }

            .timeline-item {
                display: flex;
                gap: 15px;
                padding: 10px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .timeline-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #f59e0b;
                margin-top: 4px;
            }

            .timeline-item.positive .timeline-dot { background: #22c55e; }
            .timeline-item.negative .timeline-dot { background: #ef4444; }

            .timeline-content {
                flex: 1;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }

            .timeline-date {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
            }

            .timeline-action {
                flex: 1;
                font-size: 14px;
                color: #e6edf3;
            }

            .timeline-score {
                font-size: 12px;
                font-weight: 600;
            }

            .timeline-score.positive { color: #22c55e; }
            .timeline-score.negative { color: #ef4444; }

            /* Buttons */
            .btn-primary {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #0d1117;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
            }

            .btn-secondary {
                background: rgba(30, 41, 59, 0.8);
                color: #e6edf3;
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-secondary:hover {
                background: rgba(45, 55, 72, 0.8);
                border-color: rgba(255, 255, 255, 0.3);
            }

            .btn-danger {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            }

            .btn-danger:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
            }

            .btn-action {
                background: rgba(30, 41, 59, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 8px 12px;
                border-radius: 6px;
                cursor: pointer;
                color: #e6edf3;
                transition: all 0.2s;
            }

            .btn-action:hover {
                background: rgba(45, 55, 72, 0.8);
                border-color: #f59e0b;
            }

            /* Help Modal */
            .help-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                backdrop-filter: blur(8px);
                animation: fadeIn 0.2s ease-out;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .help-modal {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                width: 90%;
                max-width: 700px;
                max-height: 85vh;
                border-radius: 16px;
                border: 1px solid rgba(245, 158, 11, 0.3);
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.1);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: scaleIn 0.2s ease-out;
            }

            @keyframes scaleIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            .help-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 25px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(0, 0, 0, 0.2);
            }

            .help-modal-header h3 {
                margin: 0;
                color: #f59e0b;
                font-size: 20px;
            }

            .help-modal-body {
                padding: 25px;
                overflow-y: auto;
                flex: 1;
            }

            .help-modal-body h3 {
                display: none;
            }

            .help-section {
                margin-bottom: 20px;
            }

            .help-section h4 {
                margin: 0 0 10px 0;
                color: #f59e0b;
            }

            .scoring-flow {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            .flow-step {
                background: rgba(15, 15, 30, 0.8);
                padding: 10px 15px;
                border-radius: 8px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .step-icon { display: block; font-size: 24px; }
            .step-name { display: block; font-size: 12px; color: rgba(255, 255, 255, 0.6); }
            .step-points { display: block; font-size: 14px; font-weight: 600; color: #22c55e; }

            .flow-arrow {
                font-size: 20px;
                color: rgba(255, 255, 255, 0.3);
            }

            .temp-legend, .bant-legend, .decay-legend {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .legend-item {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.8);
            }

            .temp-dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
            }

            .temp-dot.hot { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
            .temp-dot.warm { background: #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.5); }
            .temp-dot.cold { background: #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
            .temp-dot.dead { background: #6b7280; }

            /* Toast */
            .toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 2000;
                animation: slideIn 0.3s;
                backdrop-filter: blur(10px);
            }

            .toast-success { background: rgba(34, 197, 94, 0.9); box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4); }
            .toast-error { background: rgba(239, 68, 68, 0.9); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4); }
            .toast-info { background: rgba(59, 130, 246, 0.9); box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4); }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            /* Disqualify Modal */
            .disqualify-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1100;
                backdrop-filter: blur(5px);
            }

            .disqualify-modal {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                padding: 30px;
                border-radius: 16px;
                width: 400px;
                border: 1px solid rgba(239, 68, 68, 0.3);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            }

            .disqualify-modal h3 {
                margin: 0 0 20px 0;
                color: #ef4444;
            }

            .disqualify-modal .form-group {
                margin-bottom: 15px;
            }

            .disqualify-modal label {
                display: block;
                margin-bottom: 5px;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.7);
            }

            .disqualify-modal select,
            .disqualify-modal textarea,
            .disqualify-modal input[type="date"] {
                width: 100%;
                padding: 10px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                background: rgba(15, 15, 30, 0.8);
                color: #e6edf3;
            }

            .modal-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 20px;
            }

            /* Responsive */
            @media (max-width: 1024px) {
                .kanban-board {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (max-width: 768px) {
                .kanban-board {
                    grid-template-columns: 1fr;
                }

                .leads-filters {
                    flex-direction: column;
                }

                .view-toggle {
                    margin-left: 0;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // =========================================================================
    // API PÚBLICA
    // =========================================================================

    return {
        init,
        loadLeads,
        setView,
        applyFilters,
        filterByLifecycle,
        searchLeads,
        showLeadDetail,
        saveBANT,
        changeLifecycle,
        showDisqualifyModal,
        confirmDisqualify,
        showHelp,
        closeHelp,
        goToQuote
    };

})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LeadsPipelineDashboard = LeadsPipelineDashboard;
}
