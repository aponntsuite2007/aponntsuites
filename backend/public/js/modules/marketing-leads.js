/**
 * Marketing Leads Module - Sistema de captaci\u00f3n y env\u00edo de flyers
 * Permite a todo el staff de APONNT registrar potenciales clientes
 * y enviarles el flyer "Preguntale a tu IA"
 *
 * @author Claude AI (Dic 2025)
 * @version 1.0.0
 */

const MarketingLeadsModule = {
    // Estado del m\u00f3dulo
    state: {
        leads: [],
        currentLead: null,
        stats: null,
        pagination: { page: 1, limit: 50, total: 0 },
        filters: { status: '', search: '' },
        view: 'list' // list, form, stats
    },

    // Token de autenticación
    getToken() {
        return localStorage.getItem('aponnt_token_staff') ||
               localStorage.getItem('token') ||
               sessionStorage.getItem('aponnt_token_staff');
    },

    // Idiomas disponibles
    languages: [
        { code: 'es', name: 'Espa\u00f1ol', flag: '\ud83c\uddea\ud83c\uddf8' },
        { code: 'en', name: 'English', flag: '\ud83c\uddec\ud83c\udde7' },
        { code: 'pt', name: 'Portugu\u00eas', flag: '\ud83c\udde7\ud83c\uddf7' },
        { code: 'it', name: 'Italiano', flag: '\ud83c\uddee\ud83c\uddf9' },
        { code: 'de', name: 'Deutsch', flag: '\ud83c\udde9\ud83c\uddea' },
        { code: 'fr', name: 'Fran\u00e7ais', flag: '\ud83c\uddeb\ud83c\uddf7' }
    ],

    // Estados de leads
    statuses: [
        { code: 'new', name: 'Nuevo', color: '#3b82f6', icon: '\ud83c\udd95' },
        { code: 'contacted', name: 'Contactado', color: '#8b5cf6', icon: '\ud83d\udce7' },
        { code: 'interested', name: 'Interesado', color: '#22c55e', icon: '\u2705' },
        { code: 'not_interested', name: 'No Interesado', color: '#ef4444', icon: '\u274c' },
        { code: 'converted', name: 'Convertido', color: '#f59e0b', icon: '\ud83c\udf1f' }
    ],

    // Rubros comunes
    industries: [
        'Tecnolog\u00eda', 'Manufactura', 'Retail', 'Servicios', 'Salud',
        'Educaci\u00f3n', 'Construcci\u00f3n', 'Gastronom\u00eda', 'Log\u00edstica',
        'Finanzas', 'Agro', 'Automotriz', 'Textil', 'Otro'
    ],

    /**
     * Inicializa el m\u00f3dulo
     */
    async init(container) {
        console.log('\ud83d\udce2 [MARKETING] Inicializando m\u00f3dulo de leads...');
        // Debug: verificar token
        const token = this.getToken();
        console.log('[MARKETING] Token:', token ? 'SI (' + token.substring(0, 15) + '...)' : 'NO HAY TOKEN');
        console.log('[MARKETING] Keys:', Object.keys(localStorage).filter(k => k.includes('aponnt')));

        this.container = container;
        await this.loadLeads();
        await this.loadStats();
        this.render();
    },

    /**
     * Carga los leads desde la API
     */
    async loadLeads() {
        try {
            const params = new URLSearchParams({
                page: this.state.pagination.page,
                limit: this.state.pagination.limit,
                ...(this.state.filters.status && { status: this.state.filters.status }),
                ...(this.state.filters.search && { search: this.state.filters.search })
            });

            console.log('[MARKETING] loadLeads() - Fetching with params:', params.toString());
            console.log('[MARKETING] loadLeads() - Active search filter:', this.state.filters.search);

            const response = await fetch(`/api/marketing/leads?${params}`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });

            console.log('[MARKETING] loadLeads() - Response status:', response.status);

            const data = await response.json();
            console.log('[MARKETING] loadLeads() - Response success:', data.success, '- Leads count:', data.data?.length);

            if (data.success) {
                // Log first lead to see if it has updated name
                if (data.data?.length > 0) {
                    console.log('[MARKETING] loadLeads() - First lead name:', data.data[0].full_name);
                }
                this.state.leads = data.data;
                this.state.pagination = data.pagination;
                console.log('[MARKETING] loadLeads() - State updated with', this.state.leads.length, 'leads');
            } else {
                console.error('[MARKETING] loadLeads() - Server returned error:', data.error);
            }
        } catch (error) {
            console.error('[MARKETING] Error loading leads:', error);
        }
    },

    /**
     * Carga estad\u00edsticas
     */
    async loadStats() {
        try {
            console.log('[MARKETING] loadStats() - Fetching stats...');
            const response = await fetch('/api/marketing/stats', {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });

            console.log('[MARKETING] loadStats() - Response status:', response.status);
            const data = await response.json();
            console.log('[MARKETING] loadStats() - Response success:', data.success);

            if (data.success) {
                this.state.stats = data.data;
            } else {
                console.error('[MARKETING] loadStats() - Server returned error:', data.error);
            }
        } catch (error) {
            console.error('[MARKETING] Error loading stats:', error);
        }
    },

    /**
     * Renderiza el m\u00f3dulo completo
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="marketing-leads-container">
                ${this.renderStyles()}
                ${this.renderHeader()}
                ${this.renderContent()}
            </div>
        `;

        this.attachEventListeners();
    },

    /**
     * Estilos CSS del m\u00f3dulo
     */
    renderStyles() {
        return `
            <style>
                .marketing-leads-container {
                    padding: 20px;
                    background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);
                    min-height: 100vh;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                }

                .marketing-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .marketing-title {
                    color: #f59e0b;
                    font-size: 28px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .marketing-subtitle {
                    color: rgba(255,255,255,0.6);
                    font-size: 14px;
                    margin-top: 4px;
                }

                .marketing-actions {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .btn-marketing {
                    padding: 12px 24px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
                }

                .btn-secondary {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                }

                .btn-secondary:hover {
                    background: rgba(255,255,255,0.15);
                }

                .btn-success {
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    color: white;
                }

                .btn-whatsapp {
                    background: linear-gradient(135deg, #25d366, #128c7e);
                    color: white;
                }

                /* Stats Cards */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .stat-card {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                }

                .stat-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #f59e0b;
                }

                .stat-label {
                    color: rgba(255,255,255,0.6);
                    font-size: 13px;
                    margin-top: 4px;
                }

                /* Filters */
                .filters-bar {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }

                .filter-input {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 10px 16px;
                    color: white;
                    font-size: 14px;
                    min-width: 200px;
                }

                .filter-input::placeholder {
                    color: rgba(255,255,255,0.4);
                }

                .filter-input:focus {
                    outline: none;
                    border-color: #f59e0b;
                }

                /* Table */
                .leads-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: rgba(255,255,255,0.02);
                    border-radius: 12px;
                    overflow: hidden;
                }

                .leads-table th {
                    background: rgba(245, 158, 11, 0.2);
                    color: #f59e0b;
                    padding: 14px 16px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 13px;
                    text-transform: uppercase;
                }

                .leads-table td {
                    padding: 14px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    color: white;
                    font-size: 14px;
                }

                .leads-table tr:hover td {
                    background: rgba(255,255,255,0.03);
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .language-badge {
                    font-size: 18px;
                }

                .action-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .action-btn:hover {
                    background: rgba(255,255,255,0.1);
                }

                /* Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal-content {
                    background: #1a1a2e;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }

                .modal-title {
                    color: #f59e0b;
                    font-size: 20px;
                    font-weight: 600;
                }

                .modal-close {
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.6);
                    font-size: 24px;
                    cursor: pointer;
                }

                .modal-body {
                    padding: 24px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-label {
                    display: block;
                    color: rgba(255,255,255,0.8);
                    font-size: 13px;
                    margin-bottom: 6px;
                    font-weight: 500;
                }

                .form-label .required {
                    color: #ef4444;
                }

                .form-input {
                    width: 100%;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 12px 16px;
                    color: white;
                    font-size: 14px;
                    box-sizing: border-box;
                }

                .form-input:focus {
                    outline: none;
                    border-color: #f59e0b;
                }

                /* Fix dropdown options - texto negro en fondo blanco del browser */
                select.form-input option {
                    background: #fff;
                    color: #333;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                /* Send options */
                .send-options {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-top: 20px;
                }

                .send-option {
                    background: rgba(255,255,255,0.05);
                    border: 2px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .send-option:hover {
                    border-color: #f59e0b;
                    background: rgba(245, 158, 11, 0.1);
                }

                .send-option-icon {
                    font-size: 36px;
                    margin-bottom: 8px;
                }

                .send-option-label {
                    color: white;
                    font-weight: 500;
                }

                .send-option-desc {
                    color: rgba(255,255,255,0.5);
                    font-size: 12px;
                    margin-top: 4px;
                }

                /* WhatsApp modal */
                .whatsapp-text-box {
                    background: rgba(37, 211, 102, 0.1);
                    border: 1px solid rgba(37, 211, 102, 0.3);
                    border-radius: 12px;
                    padding: 16px;
                    margin: 16px 0;
                    white-space: pre-wrap;
                    color: white;
                    font-size: 13px;
                    max-height: 300px;
                    overflow-y: auto;
                }

                .copy-btn {
                    background: #25d366;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 12px;
                }

                /* Empty state */
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: rgba(255,255,255,0.5);
                }

                .empty-state-icon {
                    font-size: 64px;
                    margin-bottom: 16px;
                }

                .empty-state-title {
                    font-size: 20px;
                    color: white;
                    margin-bottom: 8px;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                    .send-options {
                        grid-template-columns: 1fr;
                    }
                    .leads-table {
                        font-size: 12px;
                    }
                    .leads-table th, .leads-table td {
                        padding: 10px 8px;
                    }
                }
            </style>
        `;
    },

    /**
     * Renderiza el header con t\u00edtulo y acciones
     */
    renderHeader() {
        return `
            <div class="marketing-header">
                <div>
                    <h1 class="marketing-title">
                        \ud83d\udce2 Marketing Leads
                    </h1>
                    <p class="marketing-subtitle">
                        Registra potenciales clientes y env\u00edales el flyer "Preguntale a tu IA"
                    </p>
                </div>
                <div class="marketing-actions">
                    <button class="btn-marketing btn-secondary" onclick="MarketingLeadsModule.showStats()">
                        \ud83d\udcca Estad\u00edsticas
                    </button>
                    <button class="btn-marketing btn-secondary" onclick="MarketingLeadsModule.previewFlyer()">
                        \ud83d\udc41\ufe0f Preview Flyer
                    </button>
                    <button class="btn-marketing btn-primary" onclick="MarketingLeadsModule.showCreateForm()">
                        \u2795 Nuevo Lead
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza el contenido principal
     */
    renderContent() {
        const stats = this.state.stats?.general || {};

        // Calcular tasa de apertura
        const openRate = stats.flyers_sent > 0
            ? Math.round((stats.emails_opened || 0) / stats.flyers_sent * 100)
            : 0;

        return `
            <!-- Stats Cards - Principales -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.total_leads || 0}</div>
                    <div class="stat-label">Total Leads</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.flyers_sent || 0}</div>
                    <div class="stat-label">Flyers Enviados</div>
                </div>
                <div class="stat-card" style="border-color: ${openRate > 30 ? '#22c55e' : openRate > 15 ? '#f59e0b' : '#ef4444'}40">
                    <div class="stat-value" style="color: ${openRate > 30 ? '#22c55e' : openRate > 15 ? '#f59e0b' : '#ef4444'}">
                        ${stats.emails_opened || 0}
                        <small style="font-size: 14px; opacity: 0.7">(${openRate}%)</small>
                    </div>
                    <div class="stat-label">📧 Emails Abiertos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #3b82f6">${stats.page_visits || 0}</div>
                    <div class="stat-label">👁️ Visitas Página</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #22c55e">${stats.converted || 0}</div>
                    <div class="stat-label">🌟 Convertidos</div>
                </div>
            </div>

            <!-- Filters -->
            <div class="filters-bar">
                <input type="text" class="filter-input" id="searchInput"
                       placeholder="\ud83d\udd0d Buscar por nombre, email o empresa..."
                       value="${this.state.filters.search}">
                <select class="filter-input" id="statusFilter">
                    <option value="">Todos los estados</option>
                    ${this.statuses.map(s => `
                        <option value="${s.code}" ${this.state.filters.status === s.code ? 'selected' : ''}>
                            ${s.icon} ${s.name}
                        </option>
                    `).join('')}
                </select>
                <button class="btn-marketing btn-secondary" onclick="MarketingLeadsModule.applyFilters()">
                    Filtrar
                </button>
            </div>

            <!-- Leads Table -->
            ${this.renderLeadsTable()}
        `;
    },

    /**
     * Renderiza la tabla de leads
     */
    renderLeadsTable() {
        if (this.state.leads.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">\ud83d\udccb</div>
                    <div class="empty-state-title">No hay leads registrados</div>
                    <p>Haz clic en "Nuevo Lead" para agregar tu primer potencial cliente</p>
                </div>
            `;
        }

        return `
            <table class="leads-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Idioma</th>
                        <th>Empresa / Rubro</th>
                        <th>Estado</th>
                        <th>Engagement</th>
                        <th>Vendedor</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.state.leads.map(lead => this.renderLeadRow(lead)).join('')}
                </tbody>
            </table>
            ${this.renderPagination()}
        `;
    },

    /**
     * Renderiza una fila de lead
     */
    renderLeadRow(lead) {
        if (!lead) return '';
        const lang = this.languages.find(l => l.code === (lead.language || 'es')) || this.languages[0];
        const status = this.statuses.find(s => s.code === (lead.status || 'new')) || this.statuses[0];

        // Engagement indicators
        const engagementIcons = [];
        if (lead.flyer_sent_at) {
            engagementIcons.push(`<span title="Flyer enviado ${new Date(lead.flyer_sent_at).toLocaleDateString()}" style="opacity: 1">📤</span>`);
        }
        if (lead.flyer_opened_at) {
            engagementIcons.push(`<span title="Email abierto ${new Date(lead.flyer_opened_at).toLocaleDateString()}" style="color: #22c55e">📧✓</span>`);
        } else if (lead.flyer_sent_at) {
            engagementIcons.push(`<span title="Email no abierto aún" style="opacity: 0.4">📧</span>`);
        }
        if (lead.page_visit_count > 0) {
            engagementIcons.push(`<span title="${lead.page_visit_count} visita(s) a la página" style="color: #3b82f6">👁️${lead.page_visit_count}</span>`);
        }
        if (lead.demo_accessed_at) {
            engagementIcons.push(`<span title="Accedió al demo" style="color: #f59e0b">🎯</span>`);
        }
        if (lead.interaction_count > 0) {
            engagementIcons.push(`<span title="${lead.interaction_count} interacción(es)" style="color: #8b5cf6">💬${lead.interaction_count}</span>`);
        }

        const engagementHtml = engagementIcons.length > 0
            ? `<div style="display: flex; gap: 6px; font-size: 14px;">${engagementIcons.join('')}</div>`
            : '<span style="opacity: 0.4">—</span>';

        // Vendedor asignado
        const sellerHtml = lead.assigned_seller_name
            ? `<span title="Vendedor asignado" style="color: #22c55e; font-size: 12px;">👤 ${lead.assigned_seller_name}</span>`
            : '<span style="opacity: 0.4; font-size: 11px;">Sin asignar</span>';

        return `
            <tr>
                <td><strong>${lead.full_name}</strong></td>
                <td>${lead.email}</td>
                <td><span class="language-badge">${lang.flag}</span></td>
                <td>
                    ${lead.company_name || '—'}
                    ${lead.industry ? `<br><small style="color: rgba(255,255,255,0.5)">${lead.industry}</small>` : ''}
                </td>
                <td>
                    <span class="status-badge" style="background: ${status.color}20; color: ${status.color}">
                        ${status.icon} ${status.name}
                    </span>
                </td>
                <td>${engagementHtml}</td>
                <td>${sellerHtml}</td>
                <td>
                    <button class="action-btn" onclick="MarketingLeadsModule.showSendOptions('${lead.id}')" title="Enviar Flyer">
                        📤
                    </button>
                    <button class="action-btn" onclick="MarketingLeadsModule.createQuoteFromLead('${lead.id}')" title="Crear Presupuesto" style="color: #22c55e;">
                        📝
                    </button>
                    <button class="action-btn" onclick="MarketingLeadsModule.editLead('${lead.id}')" title="Editar">
                        ✏️
                    </button>
                    <button class="action-btn" onclick="MarketingLeadsModule.deleteLead('${lead.id}')" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    },

    /**
     * Renderiza la paginaci\u00f3n
     */
    renderPagination() {
        const { page, pages, total } = this.state.pagination;
        if (pages <= 1) return '';

        return `
            <div style="display: flex; justify-content: center; gap: 8px; margin-top: 20px;">
                <button class="btn-marketing btn-secondary"
                        onclick="MarketingLeadsModule.goToPage(${page - 1})"
                        ${page <= 1 ? 'disabled' : ''}>
                    \u25c0 Anterior
                </button>
                <span style="color: white; padding: 12px;">
                    P\u00e1gina ${page} de ${pages} (${total} leads)
                </span>
                <button class="btn-marketing btn-secondary"
                        onclick="MarketingLeadsModule.goToPage(${page + 1})"
                        ${page >= pages ? 'disabled' : ''}>
                    Siguiente \u25b6
                </button>
            </div>
        `;
    },

    /**
     * Muestra el formulario de creaci\u00f3n de lead
     */
    showCreateForm() {
        this.state.currentLead = null;
        this.showLeadModal();
    },

    /**
     * Edita un lead existente
     */
    async editLead(id) {
        const lead = this.state.leads.find(l => l.id === id);
        if (lead) {
            this.state.currentLead = lead;
            this.showLeadModal();
        }
    },

    /**
     * Muestra el modal de lead (crear/editar)
     */
    showLeadModal() {
        const lead = this.state.currentLead || {};
        const isEdit = !!lead.id;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'leadModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${isEdit ? '\u270f\ufe0f Editar Lead' : '\u2795 Nuevo Lead'}</h3>
                    <button class="modal-close" onclick="MarketingLeadsModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="leadForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Nombre Completo <span class="required">*</span></label>
                                <input type="text" class="form-input" name="full_name"
                                       value="${lead.full_name || ''}" required
                                       placeholder="Ej: Juan P\u00e9rez">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email <span class="required">*</span></label>
                                <input type="email" class="form-input" name="email"
                                       value="${lead.email || ''}" required
                                       placeholder="Ej: juan@empresa.com">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Idioma <span class="required">*</span></label>
                                <select class="form-input" name="language" required>
                                    ${this.languages.map(l => `
                                        <option value="${l.code}" ${(lead.language || 'es') === l.code ? 'selected' : ''}>
                                            ${l.flag} ${l.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Rubro</label>
                                <select class="form-input" name="industry">
                                    <option value="">Seleccionar...</option>
                                    ${this.industries.map(i => `
                                        <option value="${i}" ${lead.industry === i ? 'selected' : ''}>${i}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Empresa</label>
                            <input type="text" class="form-input" name="company_name"
                                   value="${lead.company_name || ''}"
                                   placeholder="Nombre de la empresa (opcional)">
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Tel\u00e9fono</label>
                                <input type="tel" class="form-input" name="phone"
                                       value="${lead.phone || ''}"
                                       placeholder="+54 11 1234-5678">
                            </div>
                            <div class="form-group">
                                <label class="form-label">WhatsApp</label>
                                <input type="tel" class="form-input" name="whatsapp"
                                       value="${lead.whatsapp || ''}"
                                       placeholder="+54 9 11 1234-5678">
                            </div>
                        </div>

                        ${isEdit ? `
                            <div class="form-group">
                                <label class="form-label">Estado</label>
                                <select class="form-input" name="status">
                                    ${this.statuses.map(s => `
                                        <option value="${s.code}" ${lead.status === s.code ? 'selected' : ''}>
                                            ${s.icon} ${s.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        ` : ''}

                        <div class="form-group">
                            <label class="form-label">Notas</label>
                            <textarea class="form-input" name="notes" rows="3"
                                      placeholder="Notas adicionales...">${lead.notes || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-marketing btn-secondary" onclick="MarketingLeadsModule.closeModal()">
                        Cancelar
                    </button>
                    <button class="btn-marketing btn-primary" onclick="MarketingLeadsModule.saveLead()">
                        ${isEdit ? 'Guardar Cambios' : 'Registrar Lead'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Guarda el lead (crear o actualizar)
     */
    async saveLead() {
        const form = document.getElementById('leadForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // DEBUG: Log de datos antes de enviar
        console.log('[MARKETING] saveLead() - currentLead:', this.state.currentLead);
        console.log('[MARKETING] saveLead() - Form data:', data);

        // Validaci\u00f3n
        if (!data.full_name || !data.email) {
            alert('Nombre y email son obligatorios');
            return;
        }

        try {
            const isEdit = !!this.state.currentLead?.id;
            console.log('[MARKETING] saveLead() - isEdit:', isEdit, '- ID:', this.state.currentLead?.id);
            const url = isEdit
                ? `/api/marketing/leads/${this.state.currentLead.id}`
                : '/api/marketing/leads';
            console.log('[MARKETING] saveLead() - URL:', url, '- Method:', isEdit ? 'PUT' : 'POST');

            const token = this.getToken();
            console.log('[MARKETING] saveLead() - Token used:', token ? token.substring(0, 50) + '...' : 'NULL');

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('[MARKETING] saveLead() - Response status:', response.status);
            const result = await response.json();
            console.log('[MARKETING] saveLead() - Response body:', JSON.stringify(result).substring(0, 200));

            if (result.success) {
                this.closeModal();
                await this.loadLeads();
                await this.loadStats();
                this.render();

                // Si es nuevo lead, preguntar si enviar flyer
                if (!isEdit) {
                    const sendFlyer = confirm('\u00bfDeseas enviar el flyer "Preguntale a tu IA" ahora?');
                    if (sendFlyer) {
                        this.showSendOptions(result.data.id);
                    }
                }
            } else {
                alert(result.error || 'Error al guardar');
            }
        } catch (error) {
            console.error('[MARKETING] Error saving lead:', error);
            alert('Error de conexi\u00f3n');
        }
    },

    /**
     * Elimina un lead
     */
    async deleteLead(id) {
        if (!confirm('\u00bfEst\u00e1s seguro de eliminar este lead?')) return;

        try {
            const response = await fetch(`/api/marketing/leads/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });

            const result = await response.json();

            if (result.success) {
                await this.loadLeads();
                await this.loadStats();
                this.render();
            } else {
                alert(result.error || 'Error al eliminar');
            }
        } catch (error) {
            console.error('[MARKETING] Error deleting lead:', error);
            alert('Error de conexi\u00f3n');
        }
    },

    /**
     * Muestra opciones de env\u00edo de flyer
     */
    showSendOptions(leadId) {
        const lead = this.state.leads.find(l => l.id === leadId);
        if (!lead) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'sendModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">\ud83d\udce4 Enviar Flyer</h3>
                    <button class="modal-close" onclick="MarketingLeadsModule.closeModal('sendModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: rgba(255,255,255,0.7); margin-bottom: 8px;">
                        Enviando a: <strong style="color: white">${lead.full_name}</strong>
                    </p>
                    <p style="color: rgba(255,255,255,0.5); margin-bottom: 20px;">
                        ${lead.email}
                    </p>

                    <div class="send-options">
                        <div class="send-option" onclick="MarketingLeadsModule.sendFlyer('${leadId}', 'email')">
                            <div class="send-option-icon">\ud83d\udce7</div>
                            <div class="send-option-label">Email</div>
                            <div class="send-option-desc">Env\u00edo autom\u00e1tico</div>
                        </div>
                        <div class="send-option" onclick="MarketingLeadsModule.sendFlyer('${leadId}', 'whatsapp')">
                            <div class="send-option-icon">\ud83d\udcf1</div>
                            <div class="send-option-label">WhatsApp</div>
                            <div class="send-option-desc">Copiar texto</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Env\u00eda el flyer al lead
     */
    async sendFlyer(leadId, via) {
        try {
            const response = await fetch(`/api/marketing/leads/${leadId}/send-flyer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ via })
            });

            const result = await response.json();

            this.closeModal('sendModal');

            if (result.success) {
                if (via === 'whatsapp' && result.whatsappText) {
                    // Mostrar modal con texto para copiar
                    this.showWhatsAppModal(result.whatsappText, result.whatsappUrl);
                } else {
                    alert('\u2705 Flyer enviado exitosamente por email');
                    await this.loadLeads();
                    this.render();
                }
            } else {
                alert('\u274c ' + (result.error || 'Error al enviar'));
            }
        } catch (error) {
            console.error('[MARKETING] Error sending flyer:', error);
            alert('Error de conexi\u00f3n');
        }
    },

    /**
     * Muestra modal de WhatsApp con texto para copiar
     */
    showWhatsAppModal(text, url) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'whatsappModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h3 class="modal-title">\ud83d\udcf1 Texto para WhatsApp</h3>
                    <button class="modal-close" onclick="MarketingLeadsModule.closeModal('whatsappModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: rgba(255,255,255,0.7); margin-bottom: 12px;">
                        Copia este texto y p\u00e9galo en WhatsApp:
                    </p>
                    <div class="whatsapp-text-box" id="whatsappText">${text}</div>

                    <button class="copy-btn" onclick="MarketingLeadsModule.copyWhatsAppText()">
                        \ud83d\udccb Copiar Texto
                    </button>

                    ${url ? `
                        <p style="color: rgba(255,255,255,0.5); margin-top: 16px; font-size: 13px;">
                            O abre WhatsApp directamente:
                        </p>
                        <a href="${url}" target="_blank" class="btn-marketing btn-whatsapp" style="display: inline-flex; text-decoration: none; margin-top: 8px;">
                            \ud83d\udce9 Abrir WhatsApp Web
                        </a>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Copia el texto de WhatsApp al portapapeles
     */
    copyWhatsAppText() {
        const textBox = document.getElementById('whatsappText');
        navigator.clipboard.writeText(textBox.innerText).then(() => {
            alert('\u2705 Texto copiado al portapapeles');
        }).catch(err => {
            console.error('Error copying:', err);
            // Fallback
            const range = document.createRange();
            range.selectNode(textBox);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand('copy');
            alert('\u2705 Texto copiado');
        });
    },

    /**
     * Preview del flyer
     */
    async previewFlyer() {
        try {
            const response = await fetch('/api/marketing/flyer-preview?format=email', {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });

            const result = await response.json();

            if (result.success) {
                // Abrir en nueva ventana
                const win = window.open('', '_blank', 'width=800,height=600');
                win.document.write(result.content);
                win.document.close();
            }
        } catch (error) {
            console.error('[MARKETING] Error previewing flyer:', error);
        }
    },

    /**
     * Muestra estad\u00edsticas detalladas
     */
    showStats() {
        const stats = this.state.stats;
        if (!stats) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'statsModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 class="modal-title">\ud83d\udcca Estad\u00edsticas de Marketing</h3>
                    <button class="modal-close" onclick="MarketingLeadsModule.closeModal('statsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <h4 style="color: #f59e0b; margin-bottom: 12px;">General</h4>
                    <div class="stats-grid" style="margin-bottom: 24px;">
                        <div class="stat-card">
                            <div class="stat-value">${stats.general?.total_leads || 0}</div>
                            <div class="stat-label">Total Leads</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.general?.flyers_sent || 0}</div>
                            <div class="stat-label">Flyers Enviados</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.general?.sent_by_email || 0}</div>
                            <div class="stat-label">Por Email</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.general?.sent_by_whatsapp || 0}</div>
                            <div class="stat-label">Por WhatsApp</div>
                        </div>
                    </div>

                    <h4 style="color: #f59e0b; margin-bottom: 12px;">Top Staff</h4>
                    <table class="leads-table" style="margin-bottom: 24px;">
                        <thead>
                            <tr>
                                <th>Staff</th>
                                <th>Leads</th>
                                <th>Flyers</th>
                                <th>Conversiones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(stats.byStaff || []).map(s => `
                                <tr>
                                    <td>${s.staff_name}</td>
                                    <td>${s.leads_created}</td>
                                    <td>${s.flyers_sent}</td>
                                    <td>${s.conversions}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" style="text-align:center">Sin datos</td></tr>'}
                        </tbody>
                    </table>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <h4 style="color: #f59e0b; margin-bottom: 12px;">Por Idioma</h4>
                            ${(stats.byLanguage || []).map(l => {
                                const lang = this.languages.find(x => x.code === l.language);
                                return `<p style="color: white;">${lang?.flag || '\ud83c\udf10'} ${lang?.name || l.language}: <strong>${l.count}</strong></p>`;
                            }).join('') || '<p style="color: rgba(255,255,255,0.5)">Sin datos</p>'}
                        </div>
                        <div>
                            <h4 style="color: #f59e0b; margin-bottom: 12px;">Por Rubro</h4>
                            ${(stats.byIndustry || []).slice(0, 5).map(i =>
                                `<p style="color: white;">${i.industry || 'Sin rubro'}: <strong>${i.count}</strong></p>`
                            ).join('') || '<p style="color: rgba(255,255,255,0.5)">Sin datos</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Cierra un modal
     */
    closeModal(modalId = 'leadModal') {
        const modal = document.getElementById(modalId);
        if (modal) modal.remove();
    },

    /**
     * Aplica filtros
     */
    async applyFilters() {
        this.state.filters.search = document.getElementById('searchInput')?.value || '';
        this.state.filters.status = document.getElementById('statusFilter')?.value || '';
        this.state.pagination.page = 1;
        await this.loadLeads();
        this.render();
    },

    /**
     * Navega a una p\u00e1gina
     */
    async goToPage(page) {
        if (page < 1 || page > this.state.pagination.pages) return;
        this.state.pagination.page = page;
        await this.loadLeads();
        this.render();
    },

    // ═══════════════════════════════════════════════════════════
    // CREACIÓN DE PRESUPUESTO DESDE LEAD
    // ═══════════════════════════════════════════════════════════

    // Módulos cargados desde API (se llena en loadCommercialModules)
    coreModules: [],      // Paquete base (siempre incluido)
    optionalModules: [],  // Módulos opcionales (se pueden agregar)
    commercialModulesLoaded: false,

    // Precio base del paquete CORE por empleado
    corePricePerEmployee: 15.00, // USD

    // Estado del presupuesto en creación
    quoteState: {
        lead: null,
        selectedModules: [],
        companyData: {},
        includeCore: true
    },

    /**
     * Carga módulos comerciales desde API (SSOT)
     */
    async loadCommercialModules() {
        if (this.commercialModulesLoaded) return;

        try {
            console.log('[QUOTE] Cargando catálogo comercial...');
            const response = await fetch('/api/engineering/commercial-modules');
            const result = await response.json();

            if (result.success) {
                this.coreModules = result.data.coreModules || [];
                this.optionalModules = result.data.optionalModules || [];
                // Actualizar precio CORE desde API
                if (result.data.corePricePerEmployee) {
                    this.corePricePerEmployee = parseFloat(result.data.corePricePerEmployee);
                }
                this.commercialModulesLoaded = true;
                console.log('[QUOTE] Catálogo cargado:', this.coreModules.length, 'CORE,', this.optionalModules.length, 'OPCIONALES, Precio CORE: $' + this.corePricePerEmployee);
            } else {
                console.error('[QUOTE] Error cargando catálogo:', result.error);
            }
        } catch (error) {
            console.error('[QUOTE] Error de conexión:', error);
        }
    },

    /**
     * Inicia creación de presupuesto desde un lead
     */
    async createQuoteFromLead(leadId) {
        const lead = this.state.leads.find(l => l.id === leadId);
        if (!lead) {
            alert('Lead no encontrado');
            return;
        }

        // Cargar módulos comerciales si no están cargados
        await this.loadCommercialModules();

        // Inicializar estado del presupuesto
        this.quoteState = {
            lead: lead,
            selectedModules: [],
            includeCore: true,
            companyData: {
                name: lead.company_name || '',
                contact_email: lead.email || '',
                contact_phone: lead.phone || lead.whatsapp || '',
                contact_name: lead.full_name || '',
                industry: lead.industry || ''
            }
        };

        this.showQuoteModal();
    },

    /**
     * Muestra el modal de creación de presupuesto
     */
    showQuoteModal() {
        const lead = this.quoteState.lead;
        const companyData = this.quoteState.companyData;

        // Agrupar módulos OPCIONALES por categoría
        const modulesByCategory = {};
        this.optionalModules.forEach(mod => {
            const cat = mod.category || 'general';
            if (!modulesByCategory[cat]) {
                modulesByCategory[cat] = [];
            }
            modulesByCategory[cat].push({
                key: mod.key,
                name: mod.name,
                price: parseFloat(mod.basePrice) || 0,
                category: cat,
                icon: mod.icon
            });
        });

        // Generar HTML de industrias
        const industriesOptions = this.industries.map(i =>
            '<option value="' + i + '"' + (companyData.industry === i ? ' selected' : '') + '>' + i + '</option>'
        ).join('');

        // Generar HTML de módulos
        let modulesHtml = '';
        Object.entries(modulesByCategory).forEach(([category, modules]) => {
            modulesHtml += '<div style="grid-column: 1 / -1;">';
            modulesHtml += '<p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 8px 0 4px 0; text-transform: uppercase;">' + category + '</p>';
            modulesHtml += '</div>';

            modules.forEach(mod => {
                // Detectar si el icono es emoji o clase FontAwesome
                const iconHtml = mod.icon
                    ? (mod.icon.startsWith('fa')
                        ? '<i class="' + mod.icon + '" style="font-size: 20px; color: #10b981; width: 28px; text-align: center;"></i>'
                        : '<span style="font-size: 20px; width: 28px; text-align: center;">' + mod.icon + '</span>')
                    : '<span style="font-size: 20px; width: 28px; text-align: center;">📦</span>';

                modulesHtml += '<label class="module-card" style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s;">';
                modulesHtml += '<input type="checkbox" class="module-checkbox" data-key="' + mod.key + '" data-name="' + mod.name + '" data-price="' + mod.price + '" onchange="MarketingLeadsModule.updateQuoteTotal()" style="width: 18px; height: 18px;">';
                modulesHtml += iconHtml;
                modulesHtml += '<div style="flex: 1;">';
                modulesHtml += '<span style="color: white; font-weight: 500;">' + mod.name + '</span>';
                modulesHtml += '<span style="color: #22c55e; font-size: 13px; display: block;">USD $' + mod.price.toFixed(2) + '/emp</span>';
                modulesHtml += '</div></label>';
            });
        });

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'quoteModal';
        modal.innerHTML =
            '<div class="modal-content" style="max-width: 800px;">' +
                '<div class="modal-header">' +
                    '<h3 class="modal-title">📝 Crear Presupuesto desde Lead</h3>' +
                    '<button class="modal-close" onclick="MarketingLeadsModule.closeModal(\'quoteModal\')">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 20px;">' +
                        '<p style="color: #f59e0b; font-weight: 600; margin-bottom: 4px;">👤 Lead de origen</p>' +
                        '<p style="color: white; margin: 0;">' + lead.full_name + ' - ' + lead.email + '</p>' +
                        (lead.company_name ? '<p style="color: rgba(255,255,255,0.6); margin: 4px 0 0 0; font-size: 13px;">🏢 ' + lead.company_name + '</p>' : '') +
                    '</div>' +
                    '<h4 style="color: #f59e0b; margin-bottom: 12px;">🏢 Datos de la Empresa</h4>' +
                    '<form id="quoteCompanyForm">' +
                        '<div class="form-row">' +
                            '<div class="form-group">' +
                                '<label class="form-label">Nombre de Empresa <span class="required">*</span></label>' +
                                '<input type="text" class="form-input" name="company_name" value="' + (companyData.name || '') + '" required placeholder="Razón social o nombre comercial">' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="form-label">CUIT/Tax ID</label>' +
                                '<input type="text" class="form-input" name="tax_id" placeholder="30-12345678-9">' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-row">' +
                            '<div class="form-group">' +
                                '<label class="form-label">Email Contacto</label>' +
                                '<input type="email" class="form-input" name="contact_email" value="' + (companyData.contact_email || '') + '">' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="form-label">Teléfono</label>' +
                                '<input type="tel" class="form-input" name="contact_phone" value="' + (companyData.contact_phone || '') + '">' +
                            '</div>' +
                        '</div>' +
                        '<div class="form-row">' +
                            '<div class="form-group">' +
                                '<label class="form-label">Cantidad de Empleados <span class="required">*</span></label>' +
                                '<input type="number" class="form-input" name="max_employees" id="quoteEmployees" min="1" value="10" required oninput="MarketingLeadsModule.updateQuoteTotal()" onchange="MarketingLeadsModule.updateQuoteTotal()">' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label class="form-label">Rubro</label>' +
                                '<select class="form-input" name="industry"><option value="">Seleccionar...</option>' + industriesOptions + '</select>' +
                            '</div>' +
                        '</div>' +
                    '</form>' +

                    // === PAQUETE CORE (siempre incluido) ===
                    '<div style="background: rgba(59, 130, 246, 0.1); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 16px; margin: 24px 0 16px 0;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">' +
                            '<div>' +
                                '<h4 style="color: #3b82f6; margin: 0;">🔵 Paquete Base (CORE)</h4>' +
                                '<p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 4px 0 0 0;">Siempre incluido en todas las suscripciones</p>' +
                            '</div>' +
                            '<div style="text-align: right;">' +
                                '<span style="color: #3b82f6; font-size: 20px; font-weight: 700;">$' + this.corePricePerEmployee.toFixed(2) + '</span>' +
                                '<span style="color: rgba(255,255,255,0.5); font-size: 12px;">/empleado/mes</span>' +
                            '</div>' +
                        '</div>' +
                        '<div style="display: flex; flex-wrap: wrap; gap: 8px;">' +
                            this.coreModules.map(m => '<span style="background: rgba(59, 130, 246, 0.2); color: #93c5fd; padding: 4px 10px; border-radius: 6px; font-size: 11px;">' + (m.icon || '📦') + ' ' + m.name + '</span>').join('') +
                        '</div>' +
                    '</div>' +

                    // === MÓDULOS OPCIONALES ===
                    '<h4 style="color: #10b981; margin: 24px 0 12px 0;">🟢 Módulos Opcionales</h4>' +
                    '<p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0 0 12px 0;">Selecciona los módulos adicionales que desea contratar</p>' +
                    '<div id="modulesContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">' + modulesHtml + '</div>' +

                    // === TRIAL OPTIONS ===
                    '<div style="background: rgba(168, 85, 247, 0.1); border: 2px solid rgba(168, 85, 247, 0.3); border-radius: 8px; padding: 16px; margin-top: 20px;">' +
                        '<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">' +
                            '<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">' +
                                '<input type="checkbox" id="offerTrial" checked onchange="MarketingLeadsModule.toggleTrialDisplay()" style="width: 20px; height: 20px;">' +
                                '<span style="color: #a855f7; font-weight: 600; font-size: 16px;">🎁 Ofrecer Período de Prueba (Trial)</span>' +
                            '</label>' +
                        '</div>' +
                        '<div id="trialOptions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">' +
                            '<div>' +
                                '<label style="color: rgba(255,255,255,0.7); font-size: 12px; display: block; margin-bottom: 6px;">Duración del Trial</label>' +
                                '<select id="trialDays" class="form-input" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(168, 85, 247, 0.5); color: white;" onchange="MarketingLeadsModule.updateQuoteTotal()">' +
                                    '<option value="7">7 días</option>' +
                                    '<option value="14">14 días</option>' +
                                    '<option value="30" selected>30 días (1 mes)</option>' +
                                    '<option value="60">60 días (2 meses)</option>' +
                                '</select>' +
                            '</div>' +
                            '<div>' +
                                '<label style="color: rgba(255,255,255,0.7); font-size: 12px; display: block; margin-bottom: 6px;">Bonificación</label>' +
                                '<select id="trialDiscount" class="form-input" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(168, 85, 247, 0.5); color: white;" onchange="MarketingLeadsModule.updateQuoteTotal()">' +
                                    '<option value="50">50% de descuento</option>' +
                                    '<option value="75">75% de descuento</option>' +
                                    '<option value="100" selected>100% gratis</option>' +
                                '</select>' +
                            '</div>' +
                        '</div>' +
                        '<div id="trialSummary" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(168, 85, 247, 0.3);">' +
                            '<p style="color: #a855f7; font-weight: 600; margin: 0;">📅 Primer mes: <span id="trialFirstMonth">$0 (100% bonificado)</span></p>' +
                            '<p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 4px 0 0 0;">Después del trial: precio regular mensual</p>' +
                        '</div>' +
                    '</div>' +

                    // === RESUMEN TOTAL ===
                    '<div id="quoteSummary" style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 16px; margin-top: 16px;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                            '<div>' +
                                '<p style="color: rgba(255,255,255,0.6); margin: 0; font-size: 13px;">' +
                                    'Paquete CORE + <span id="moduleCount">0</span> módulos opcionales' +
                                '</p>' +
                                '<p style="color: white; font-size: 24px; font-weight: 700; margin: 4px 0 0 0;">USD $<span id="quoteTotal">0</span>/mes</p>' +
                                '<p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 4px 0 0 0;">' +
                                    '($<span id="quotePricePerEmployee">0</span>/empleado × <span id="quoteEmployeeCount">10</span> empleados)' +
                                '</p>' +
                            '</div>' +
                            '<div style="text-align: right;">' +
                                '<p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0;">Precio mensual regular</p>' +
                                '<p style="color: #22c55e; font-weight: 600; font-size: 18px; margin: 0;" id="regularPriceLabel">después del trial</p>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-group" style="margin-top: 16px;">' +
                        '<label class="form-label">Notas del Presupuesto</label>' +
                        '<textarea class="form-input" id="quoteNotes" rows="2" placeholder="Observaciones internas..."></textarea>' +
                    '</div>' +
                '</div>' +
                '<div class="modal-footer">' +
                    '<button class="btn-marketing btn-secondary" onclick="MarketingLeadsModule.closeModal(\'quoteModal\')">Cancelar</button>' +
                    '<button class="btn-marketing btn-success" onclick="MarketingLeadsModule.saveQuoteFromLead()">💾 Crear Presupuesto</button>' +
                '</div>' +
            '</div>' +
            '<style>' +
                '.module-card:has(input:checked) { border-color: #22c55e; background: rgba(34, 197, 94, 0.15); }' +
                '.module-card:hover { border-color: #f59e0b; }' +
            '</style>';

        document.body.appendChild(modal);

        // Calcular total inicial (solo CORE, sin opcionales seleccionados)
        setTimeout(() => MarketingLeadsModule.updateQuoteTotal(), 100);
    },

    /**
     * Actualiza el total del presupuesto (CORE + opcionales × empleados)
     * NOTA: Usa MarketingLeadsModule explícitamente porque cuando se llama desde
     * event handlers inline (oninput, onchange), 'this' apunta a window, no al módulo.
     */
    updateQuoteTotal() {
        const checkboxes = document.querySelectorAll('.module-checkbox:checked');
        const employeesInput = document.getElementById('quoteEmployees');
        const employees = parseInt(employeesInput?.value) || 10;

        // Precio del paquete CORE (siempre incluido)
        const corePrice = MarketingLeadsModule.corePricePerEmployee || 15.00;

        // Calcular precio de módulos opcionales seleccionados
        let optionalPricePerEmployee = 0;
        const selectedModules = [];

        checkboxes.forEach(cb => {
            const price = parseFloat(cb.dataset.price) || 0;
            optionalPricePerEmployee += price;
            selectedModules.push({
                module_key: cb.dataset.key,
                module_name: cb.dataset.name,
                price_per_employee: price,
                price: price * employees,
                quantity: employees
            });
        });

        // Total = (CORE + opcionales) × empleados
        const totalPricePerEmployee = corePrice + optionalPricePerEmployee;
        const total = totalPricePerEmployee * employees;

        // Guardar en estado
        MarketingLeadsModule.quoteState.selectedModules = selectedModules;
        MarketingLeadsModule.quoteState.employees = employees;
        MarketingLeadsModule.quoteState.pricePerEmployee = totalPricePerEmployee;
        MarketingLeadsModule.quoteState.corePrice = corePrice;
        MarketingLeadsModule.quoteState.optionalPrice = optionalPricePerEmployee;

        // Actualizar elementos del DOM
        const moduleCountEl = document.getElementById('moduleCount');
        const quoteTotalEl = document.getElementById('quoteTotal');
        const pricePerEmpEl = document.getElementById('quotePricePerEmployee');
        const empCountEl = document.getElementById('quoteEmployeeCount');

        if (moduleCountEl) moduleCountEl.textContent = selectedModules.length;
        if (quoteTotalEl) quoteTotalEl.textContent = total.toFixed(2);
        if (pricePerEmpEl) pricePerEmpEl.textContent = totalPricePerEmployee.toFixed(2);
        if (empCountEl) empCountEl.textContent = employees;

        // === Cálculo del Trial ===
        const offerTrial = document.getElementById('offerTrial')?.checked ?? true;
        const trialDaysEl = document.getElementById('trialDays');
        const trialDiscountEl = document.getElementById('trialDiscount');
        const trialFirstMonthEl = document.getElementById('trialFirstMonth');

        const trialDays = parseInt(trialDaysEl?.value) || 30;
        const trialDiscount = parseInt(trialDiscountEl?.value) || 100;

        // Guardar trial en estado
        MarketingLeadsModule.quoteState.offerTrial = offerTrial;
        MarketingLeadsModule.quoteState.trialDays = trialDays;
        MarketingLeadsModule.quoteState.trialDiscount = trialDiscount;

        if (trialFirstMonthEl && offerTrial) {
            const firstMonthPrice = total * (1 - trialDiscount / 100);
            const savings = total - firstMonthPrice;
            if (trialDiscount === 100) {
                trialFirstMonthEl.innerHTML = '<span style="color: #22c55e; font-weight: 700;">$0 GRATIS</span> <span style="color: rgba(255,255,255,0.5);">(ahorro: $' + savings.toFixed(2) + ')</span>';
            } else {
                trialFirstMonthEl.innerHTML = '<span style="color: #22c55e; font-weight: 700;">$' + firstMonthPrice.toFixed(2) + '</span> <span style="color: rgba(255,255,255,0.5);">(' + trialDiscount + '% descuento, ahorro: $' + savings.toFixed(2) + ')</span>';
            }
        }

        console.log('[QUOTE] Updated:', {
            employees,
            corePrice,
            optionalPrice: optionalPricePerEmployee,
            totalPerEmployee: totalPricePerEmployee,
            total,
            optionalModules: selectedModules.length,
            trial: { offerTrial, trialDays, trialDiscount }
        });
    },

    /**
     * Toggle para mostrar/ocultar el label de Trial
     */
    toggleTrialDisplay() {
        const checkbox = document.getElementById('offerTrial');
        const trialOptions = document.getElementById('trialOptions');
        const trialSummary = document.getElementById('trialSummary');
        const regularPriceLabel = document.getElementById('regularPriceLabel');

        if (trialOptions) {
            trialOptions.style.opacity = checkbox?.checked ? '1' : '0.4';
            trialOptions.style.pointerEvents = checkbox?.checked ? 'auto' : 'none';
        }
        if (trialSummary) {
            trialSummary.style.display = checkbox?.checked ? 'block' : 'none';
        }
        if (regularPriceLabel) {
            regularPriceLabel.textContent = checkbox?.checked ? 'después del trial' : 'sin trial';
        }

        // Actualizar cálculos
        this.updateQuoteTotal();
    },

    /**
     * Guarda el presupuesto desde el lead
     */
    async saveQuoteFromLead() {
        // Nota: No validamos módulos opcionales porque el paquete CORE siempre está incluido

        // Obtener datos del formulario
        const form = document.getElementById('quoteCompanyForm');
        const formData = new FormData(form);
        const companyData = Object.fromEntries(formData);

        if (!companyData.company_name) {
            alert('El nombre de la empresa es obligatorio');
            return;
        }

        if (!companyData.max_employees || companyData.max_employees < 1) {
            alert('La cantidad de empleados es obligatoria');
            return;
        }

        const notes = document.getElementById('quoteNotes')?.value || '';
        const offerTrial = document.getElementById('offerTrial')?.checked ?? true;
        const trialDays = parseInt(document.getElementById('trialDays')?.value) || 30;
        const trialDiscount = parseInt(document.getElementById('trialDiscount')?.value) || 100;

        try {
            // Llamar al endpoint para crear presupuesto desde lead
            const response = await fetch('/api/marketing/leads/' + this.quoteState.lead.id + '/create-quote', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + this.getToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    company_data: companyData,
                    modules_data: this.quoteState.selectedModules,
                    notes: notes,
                    offer_trial: offerTrial,
                    trial_days: offerTrial ? trialDays : 0,
                    trial_discount_percent: offerTrial ? trialDiscount : 0,
                    employees: this.quoteState.employees || parseInt(companyData.max_employees) || 10,
                    price_per_employee: this.quoteState.pricePerEmployee || 0,
                    core_price: this.quoteState.corePrice || this.corePricePerEmployee || 15.00,
                    optional_price: this.quoteState.optionalPrice || 0
                })
            });

            const result = await response.json();

            if (result.success) {
                this.closeModal('quoteModal');

                // Actualizar estado del lead a "interested" si estaba en "new"
                if (this.quoteState.lead.status === 'new') {
                    await fetch('/api/marketing/leads/' + this.quoteState.lead.id, {
                        method: 'PUT',
                        headers: {
                            'Authorization': 'Bearer ' + this.getToken(),
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: 'interested' })
                    });
                }

                await this.loadLeads();
                await this.loadStats();
                this.render();

                alert('✅ Presupuesto ' + (result.quote?.quote_number || '') + ' creado exitosamente!\n\nEmpresa: ' + (result.company?.name || companyData.company_name) + '\nTotal: USD $' + (result.quote?.total_amount || '0') + '/mes');
            } else {
                alert('❌ Error: ' + (result.error || 'No se pudo crear el presupuesto'));
            }
        } catch (error) {
            console.error('[MARKETING] Error creating quote from lead:', error);
            alert('Error de conexión al crear el presupuesto');
        }
    },

    /**
     * Agrega event listeners
     */
    attachEventListeners() {
        // Enter en búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.applyFilters();
            });
        }
    }
};

// Exportar para uso global
window.MarketingLeadsModule = MarketingLeadsModule;
