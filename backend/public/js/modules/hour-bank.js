/**
 * ============================================================================
 * HOUR BANK MODULE - Modulo de Banco de Horas
 * ============================================================================
 *
 * Interfaz completa para gestion de banco de horas:
 * - Configuracion de plantillas por sucursal (Admin)
 * - Estado de cuenta del empleado (Mi Espacio)
 * - Solicitudes de uso
 * - Decisiones pendientes (cobrar vs banco)
 * - Aprobaciones (Supervisor)
 *
 * @version 1.0.0
 * @date 2025-12-15
 * ============================================================================
 */

const HourBankModule = {
    currentView: 'dashboard',
    templates: [],
    balance: null,
    pendingDecisions: [],
    transactions: [],
    config: null,
    fieldDefinitions: null,

    // =========================================================================
    // INICIALIZACION
    // =========================================================================

    async init() {
        console.log('🏦 [HourBank] Inicializando modulo...');

        // Inyectar estilos
        this.injectStyles();

        // Cargar configuracion aplicable al usuario
        await this.loadConfig();

        // Cargar datos segun rol
        if (this.isAdmin()) {
            await this.loadTemplates();
        }

        await this.loadBalance();
        await this.loadPendingDecisions();

        console.log('🏦 [HourBank] Modulo inicializado');
    },

    isAdmin() {
        return window.AuthState?.user?.role === 'admin' ||
               window.AuthState?.user?.role === 'hr';
    },

    isSupervisor() {
        return window.AuthState?.user?.role === 'supervisor' || this.isAdmin();
    },

    // =========================================================================
    // API
    // =========================================================================

    async api(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/hour-bank${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });
        return response.json();
    },

    async loadConfig() {
        try {
            const result = await this.api('/config');
            if (result.success) {
                this.config = result.config;
            }
        } catch (error) {
            console.error('[HourBank] Error loading config:', error);
        }
    },

    async loadTemplates() {
        try {
            const result = await this.api('/templates');
            if (result.success) {
                this.templates = result.templates || [];
            }
        } catch (error) {
            console.error('[HourBank] Error loading templates:', error);
        }
    },

    async loadFieldDefinitions() {
        try {
            const result = await this.api('/templates/defaults');
            if (result.success) {
                this.fieldDefinitions = result.fields;
                this.fieldCategories = result.categories;
            }
        } catch (error) {
            console.error('[HourBank] Error loading field definitions:', error);
        }
    },

    async loadBalance() {
        try {
            const result = await this.api('/balance');
            if (result.success) {
                this.balance = result.balance;
                this.expiring = result.expiring;
            }
        } catch (error) {
            console.error('[HourBank] Error loading balance:', error);
        }
    },

    async loadPendingDecisions() {
        try {
            const result = await this.api('/decisions/pending');
            if (result.success) {
                this.pendingDecisions = result.decisions || [];
            }
        } catch (error) {
            console.error('[HourBank] Error loading pending decisions:', error);
        }
    },

    async loadTransactions(options = {}) {
        try {
            const params = new URLSearchParams(options);
            const result = await this.api(`/transactions?${params}`);
            if (result.success) {
                this.transactions = result.transactions || [];
            }
        } catch (error) {
            console.error('[HourBank] Error loading transactions:', error);
        }
    },

    // =========================================================================
    // RENDER PRINCIPAL
    // =========================================================================

    render(container) {
        if (!container) {
            container = document.getElementById('hour-bank-container') ||
                        document.getElementById('module-content');
        }
        if (!container) return;

        const html = `
            <div class="hb-module">
                <div class="hb-header">
                    <div class="hb-header-left">
                        <span class="hb-icon">🏦</span>
                        <div class="hb-header-text">
                            <h2>Banco de Horas</h2>
                            <p>${this.config?.enabled ? 'Sistema activo' : 'No configurado'}</p>
                        </div>
                    </div>
                    <div class="hb-header-right">
                        ${this.renderQuickBalance()}
                    </div>
                </div>

                ${this.pendingDecisions.length > 0 ? this.renderPendingDecisionsAlert() : ''}

                <div class="hb-tabs">
                    <button class="hb-tab ${this.currentView === 'dashboard' ? 'active' : ''}"
                            onclick="HourBankModule.showView('dashboard')">
                        📊 Mi Saldo
                    </button>
                    <button class="hb-tab ${this.currentView === 'transactions' ? 'active' : ''}"
                            onclick="HourBankModule.showView('transactions')">
                        📜 Movimientos
                    </button>
                    <button class="hb-tab ${this.currentView === 'requests' ? 'active' : ''}"
                            onclick="HourBankModule.showView('requests')">
                        📝 Solicitar Uso
                    </button>
                    ${this.isSupervisor() ? `
                    <button class="hb-tab ${this.currentView === 'approvals' ? 'active' : ''}"
                            onclick="HourBankModule.showView('approvals')">
                        ✅ Aprobaciones
                    </button>
                    ` : ''}
                    ${this.isAdmin() ? `
                    <button class="hb-tab ${this.currentView === 'templates' ? 'active' : ''}"
                            onclick="HourBankModule.showView('templates')">
                        ⚙️ Configuracion
                    </button>
                    ` : ''}
                </div>

                <div class="hb-content">
                    ${this.renderCurrentView()}
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    renderCurrentView() {
        switch (this.currentView) {
            case 'dashboard': return this.renderDashboard();
            case 'transactions': return this.renderTransactions();
            case 'requests': return this.renderRequests();
            case 'approvals': return this.renderApprovals();
            case 'templates': return this.renderTemplates();
            default: return this.renderDashboard();
        }
    },

    showView(view) {
        this.currentView = view;
        this.render();
    },

    // =========================================================================
    // DASHBOARD (MI SALDO)
    // =========================================================================

    renderQuickBalance() {
        if (!this.balance) return '';
        return `
            <div class="hb-quick-balance">
                <span class="hb-balance-label">Mi Saldo</span>
                <span class="hb-balance-value">${this.balance.current.toLocaleString('es-AR', {minimumFractionDigits: 1})}h</span>
            </div>
        `;
    },

    renderDashboard() {
        if (!this.config?.enabled) {
            return `
                <div class="hb-not-enabled">
                    <span class="hb-icon-large">⚠️</span>
                    <h3>Banco de Horas no disponible</h3>
                    <p>El banco de horas no esta habilitado para tu sucursal.</p>
                </div>
            `;
        }

        return `
            <div class="hb-dashboard">
                <div class="hb-balance-card">
                    <div class="hb-balance-main">
                        <div class="hb-balance-icon">💰</div>
                        <div class="hb-balance-info">
                            <span class="hb-balance-title">Saldo Disponible</span>
                            <span class="hb-balance-big">${this.balance?.current?.toLocaleString('es-AR', {minimumFractionDigits: 1}) || '0,0'}h</span>
                        </div>
                    </div>
                    ${this.expiring ? `
                    <div class="hb-expiring-warning">
                        <span>⏰</span>
                        <span>${this.expiring.hours}h vencen el ${new Date(this.expiring.date).toLocaleDateString('es-AR')}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="hb-stats-grid">
                    <div class="hb-stat-card">
                        <span class="hb-stat-icon">📥</span>
                        <span class="hb-stat-value">${this.balance?.totalAccrued?.toLocaleString('es-AR', {minimumFractionDigits: 1}) || '0'}h</span>
                        <span class="hb-stat-label">Total Acumulado</span>
                    </div>
                    <div class="hb-stat-card">
                        <span class="hb-stat-icon">📤</span>
                        <span class="hb-stat-value">${this.balance?.totalUsed?.toLocaleString('es-AR', {minimumFractionDigits: 1}) || '0'}h</span>
                        <span class="hb-stat-label">Total Usado</span>
                    </div>
                    <div class="hb-stat-card">
                        <span class="hb-stat-icon">⌛</span>
                        <span class="hb-stat-value">${this.balance?.totalExpired?.toLocaleString('es-AR', {minimumFractionDigits: 1}) || '0'}h</span>
                        <span class="hb-stat-label">Vencidas</span>
                    </div>
                </div>

                <div class="hb-config-summary">
                    <h4>📋 Configuracion Aplicable</h4>
                    <div class="hb-config-grid">
                        <div class="hb-config-item">
                            <span class="hb-config-label">Plantilla</span>
                            <span class="hb-config-value">${this.config?.templateName || 'N/A'}</span>
                        </div>
                        <div class="hb-config-item">
                            <span class="hb-config-label">Conversion HE Normal</span>
                            <span class="hb-config-value">${this.config?.conversionRates?.normal || 1}x</span>
                        </div>
                        <div class="hb-config-item">
                            <span class="hb-config-label">Conversion HE Feriado</span>
                            <span class="hb-config-value">${this.config?.conversionRates?.holiday || 2}x</span>
                        </div>
                        <div class="hb-config-item">
                            <span class="hb-config-label">Max Acumulable</span>
                            <span class="hb-config-value">${this.config?.limits?.maxAccumulation || 120}h</span>
                        </div>
                        <div class="hb-config-item">
                            <span class="hb-config-label">Vencimiento</span>
                            <span class="hb-config-value">${this.config?.expiration?.enabled ? `${this.config.expiration.months} meses` : 'No vence'}</span>
                        </div>
                        <div class="hb-config-item">
                            <span class="hb-config-label">Anticipo Minimo</span>
                            <span class="hb-config-value">${this.config?.advanceNoticeDays || 0} dias</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderPendingDecisionsAlert() {
        return `
            <div class="hb-alert hb-alert-warning">
                <span class="hb-alert-icon">⚡</span>
                <div class="hb-alert-content">
                    <strong>Tienes ${this.pendingDecisions.length} decision(es) pendiente(s)</strong>
                    <p>Debes elegir si cobrar o acumular tus horas extras.</p>
                </div>
                <button class="hb-btn hb-btn-warning" onclick="HourBankModule.showDecisionsModal()">
                    Decidir Ahora
                </button>
            </div>
        `;
    },

    // =========================================================================
    // TRANSACCIONES
    // =========================================================================

    renderTransactions() {
        return `
            <div class="hb-transactions">
                <div class="hb-section-header">
                    <h3>📜 Historial de Movimientos</h3>
                    <div class="hb-filters">
                        <select id="hb-tx-type" onchange="HourBankModule.filterTransactions()">
                            <option value="">Todos</option>
                            <option value="accrual">Acumulaciones</option>
                            <option value="usage">Usos</option>
                            <option value="expiry">Vencimientos</option>
                        </select>
                        <button class="hb-btn hb-btn-secondary" onclick="HourBankModule.refreshTransactions()">
                            🔄 Actualizar
                        </button>
                    </div>
                </div>

                <div class="hb-tx-list">
                    ${this.transactions.length > 0 ? this.transactions.map(tx => this.renderTransaction(tx)).join('') : `
                        <div class="hb-empty">
                            <span>📭</span>
                            <p>No hay movimientos registrados</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderTransaction(tx) {
        const isCredit = tx.hours_final > 0;
        const typeLabels = {
            'accrual': '📥 Acumulacion',
            'usage': '📤 Uso',
            'expiry': '⌛ Vencimiento',
            'payout': '💵 Pago',
            'adjustment': '✏️ Ajuste'
        };
        return `
            <div class="hb-tx-item ${isCredit ? 'hb-tx-credit' : 'hb-tx-debit'}">
                <div class="hb-tx-left">
                    <span class="hb-tx-type">${typeLabels[tx.transaction_type] || tx.transaction_type}</span>
                    <span class="hb-tx-date">${new Date(tx.created_at).toLocaleDateString('es-AR')}</span>
                    <span class="hb-tx-desc">${tx.description || ''}</span>
                </div>
                <div class="hb-tx-right">
                    <span class="hb-tx-hours ${isCredit ? 'positive' : 'negative'}">
                        ${isCredit ? '+' : ''}${tx.hours_final.toLocaleString('es-AR', {minimumFractionDigits: 1})}h
                    </span>
                    <span class="hb-tx-balance">Saldo: ${tx.balance_after?.toLocaleString('es-AR', {minimumFractionDigits: 1})}h</span>
                </div>
            </div>
        `;
    },

    async refreshTransactions() {
        await this.loadTransactions();
        this.render();
    },

    async filterTransactions() {
        const type = document.getElementById('hb-tx-type')?.value;
        await this.loadTransactions({ type });
        this.render();
    },

    // =========================================================================
    // SOLICITUDES
    // =========================================================================

    renderRequests() {
        return `
            <div class="hb-requests">
                <div class="hb-section-header">
                    <h3>📝 Solicitar Uso de Horas</h3>
                </div>

                <form class="hb-request-form" onsubmit="return HourBankModule.submitRequest(event)">
                    <div class="hb-form-group">
                        <label>Tipo de Uso</label>
                        <select name="requestType" required>
                            ${this.config?.allowedUsage?.earlyDeparture ? '<option value="early_departure">Salida Anticipada</option>' : ''}
                            ${this.config?.allowedUsage?.lateCompensation ? '<option value="late_arrival">Compensar Tardanza</option>' : ''}
                            ${this.config?.allowedUsage?.partialDay ? '<option value="partial_day">Horas Sueltas</option>' : ''}
                            ${this.config?.allowedUsage?.fullDay ? '<option value="full_day">Dia Completo</option>' : ''}
                        </select>
                    </div>

                    <div class="hb-form-group">
                        <label>Fecha</label>
                        <input type="date" name="requestedDate" required
                               min="${this.getMinRequestDate()}" />
                    </div>

                    <div class="hb-form-group">
                        <label>Horas a Usar</label>
                        <input type="number" name="hoursRequested" required
                               min="${this.config?.minUsageHours || 0.5}"
                               max="${Math.min(this.balance?.current || 0, this.config?.maxUsagePerDay || 8)}"
                               step="0.5"
                               placeholder="Ej: 2.5" />
                        <small>Disponible: ${this.balance?.current?.toLocaleString('es-AR', {minimumFractionDigits: 1}) || 0}h</small>
                    </div>

                    <div class="hb-form-group">
                        <label>Motivo (opcional)</label>
                        <textarea name="reason" rows="2" placeholder="Motivo de la solicitud..."></textarea>
                    </div>

                    <div class="hb-form-actions">
                        <button type="submit" class="hb-btn hb-btn-primary" ${!this.balance?.current ? 'disabled' : ''}>
                            Enviar Solicitud
                        </button>
                    </div>
                </form>
            </div>
        `;
    },

    getMinRequestDate() {
        const days = this.config?.advanceNoticeDays || 0;
        const min = new Date();
        min.setDate(min.getDate() + days);
        return min.toISOString().split('T')[0];
    },

    async submitRequest(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const result = await this.api('/requests', {
            method: 'POST',
            body: JSON.stringify({
                requestType: formData.get('requestType'),
                requestedDate: formData.get('requestedDate'),
                hoursRequested: parseFloat(formData.get('hoursRequested')),
                reason: formData.get('reason')
            })
        });

        if (result.success) {
            alert(result.message || 'Solicitud enviada correctamente');
            await this.loadBalance();
            this.render();
        } else {
            alert('Error: ' + (result.error || 'No se pudo enviar la solicitud'));
        }

        return false;
    },

    // =========================================================================
    // DECISIONES PENDIENTES
    // =========================================================================

    showDecisionsModal() {
        const modal = document.createElement('div');
        modal.className = 'hb-modal-overlay';
        modal.innerHTML = `
            <div class="hb-modal">
                <div class="hb-modal-header">
                    <h3>⚡ Decisiones Pendientes</h3>
                    <button class="hb-modal-close" onclick="this.closest('.hb-modal-overlay').remove()">×</button>
                </div>
                <div class="hb-modal-body">
                    ${this.pendingDecisions.map(d => this.renderDecisionCard(d)).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    renderDecisionCard(decision) {
        const expiresAt = new Date(decision.expires_at);
        const hoursLeft = Math.max(0, Math.floor((expiresAt - new Date()) / (1000 * 60 * 60)));

        return `
            <div class="hb-decision-card" data-id="${decision.id}">
                <div class="hb-decision-header">
                    <span class="hb-decision-date">${new Date(decision.overtime_date).toLocaleDateString('es-AR')}</span>
                    <span class="hb-decision-type">${decision.overtime_type}</span>
                    <span class="hb-decision-timer">⏱️ ${hoursLeft}h para decidir</span>
                </div>
                <div class="hb-decision-body">
                    <div class="hb-decision-hours">
                        <span class="hb-hours-value">${decision.overtime_hours}h</span>
                        <span class="hb-hours-label">extra</span>
                    </div>
                    <div class="hb-decision-options">
                        <button class="hb-btn hb-btn-pay" onclick="HourBankModule.makeDecision('${decision.id}', 'pay')">
                            💵 Cobrar
                            ${decision.if_paid_amount ? `<small>$${decision.if_paid_amount.toLocaleString('es-AR')}</small>` : ''}
                        </button>
                        <button class="hb-btn hb-btn-bank" onclick="HourBankModule.makeDecision('${decision.id}', 'bank')">
                            🏦 Acumular
                            <small>${decision.if_banked_hours}h al banco</small>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async makeDecision(decisionId, choice) {
        const result = await this.api(`/decisions/${decisionId}`, {
            method: 'POST',
            body: JSON.stringify({ choice })
        });

        if (result.success) {
            alert(choice === 'bank' ? 'Horas acumuladas en tu banco' : 'Hora extra sera pagada en liquidacion');
            await this.loadPendingDecisions();
            await this.loadBalance();
            document.querySelector('.hb-modal-overlay')?.remove();
            this.render();
        } else {
            alert('Error: ' + (result.error || 'No se pudo procesar la decision'));
        }
    },

    // =========================================================================
    // APROBACIONES (SUPERVISOR)
    // =========================================================================

    renderApprovals() {
        return `
            <div class="hb-approvals">
                <div class="hb-section-header">
                    <h3>✅ Solicitudes Pendientes de Aprobacion</h3>
                </div>
                <div class="hb-approvals-list" id="hb-approvals-list">
                    <div class="hb-loading">Cargando...</div>
                </div>
            </div>
        `;
    },

    // =========================================================================
    // TEMPLATES (ADMIN)
    // =========================================================================

    renderTemplates() {
        return `
            <div class="hb-templates">
                <div class="hb-section-header">
                    <h3>⚙️ Plantillas de Banco de Horas</h3>
                    <div class="hb-actions">
                        <button class="hb-btn hb-btn-secondary" onclick="HourBankModule.initDefaults()">
                            🌍 Cargar Predefinidas
                        </button>
                        <button class="hb-btn hb-btn-primary" onclick="HourBankModule.showTemplateEditor()">
                            ➕ Nueva Plantilla
                        </button>
                    </div>
                </div>

                <div class="hb-templates-list">
                    ${this.templates.length > 0 ? this.templates.map(t => this.renderTemplateCard(t)).join('') : `
                        <div class="hb-empty">
                            <span>📋</span>
                            <p>No hay plantillas configuradas</p>
                            <button class="hb-btn hb-btn-primary" onclick="HourBankModule.initDefaults()">
                                Cargar plantillas predefinidas por pais
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderTemplateCard(template) {
        return `
            <div class="hb-template-card ${template.is_enabled ? '' : 'disabled'}">
                <div class="hb-template-header">
                    <span class="hb-template-code">${template.template_code}</span>
                    <span class="hb-template-country">${template.country_code || 'N/A'}</span>
                    ${template.branch_name ? `<span class="hb-template-branch">📍 ${template.branch_name}</span>` : '<span class="hb-template-branch">🌐 Todas las sucursales</span>'}
                </div>
                <div class="hb-template-body">
                    <h4>${template.template_name}</h4>
                    <p>${template.description || 'Sin descripcion'}</p>
                    <div class="hb-template-rates">
                        <span>Normal: ${template.conversion_rate_normal}x</span>
                        <span>Feriado: ${template.conversion_rate_holiday}x</span>
                        <span>Vencimiento: ${template.expiration_months || 'No'}${template.expiration_months ? 'm' : ''}</span>
                    </div>
                </div>
                <div class="hb-template-footer">
                    <span class="hb-template-status ${template.is_enabled ? 'active' : 'inactive'}">
                        ${template.is_enabled ? '✅ Activa' : '❌ Inactiva'}
                    </span>
                    <button class="hb-btn hb-btn-sm" onclick="HourBankModule.editTemplate(${template.id})">
                        ✏️ Editar
                    </button>
                </div>
            </div>
        `;
    },

    async initDefaults() {
        if (!confirm('Esto creara plantillas predefinidas para Argentina, Brasil, Uruguay, Chile, Mexico, Espana y Alemania. ¿Continuar?')) {
            return;
        }

        const result = await this.api('/templates/init-defaults', { method: 'POST' });

        if (result.success) {
            alert('Plantillas predefinidas creadas');
            await this.loadTemplates();
            this.render();
        } else {
            alert('Error: ' + (result.error || 'No se pudieron crear las plantillas'));
        }
    },

    async showTemplateEditor(templateId = null) {
        // Cargar definiciones de campos si no estan cargadas
        if (!this.fieldDefinitions) {
            await this.loadFieldDefinitions();
        }

        let template = {};
        if (templateId) {
            const result = await this.api(`/templates/${templateId}`);
            if (result.success) {
                template = result.template;
            }
        }

        const modal = document.createElement('div');
        modal.className = 'hb-modal-overlay';
        modal.innerHTML = `
            <div class="hb-modal hb-modal-large">
                <div class="hb-modal-header">
                    <h3>${templateId ? 'Editar' : 'Nueva'} Plantilla de Banco de Horas</h3>
                    <button class="hb-modal-close" onclick="this.closest('.hb-modal-overlay').remove()">×</button>
                </div>
                <div class="hb-modal-body">
                    <form id="hb-template-form" onsubmit="return HourBankModule.saveTemplate(event, ${templateId || 'null'})">
                        <div class="hb-form-section">
                            <h4>Identificacion</h4>
                            <div class="hb-form-grid">
                                <div class="hb-form-group">
                                    <label>Codigo *</label>
                                    <input type="text" name="template_code" required
                                           value="${template.template_code || ''}"
                                           placeholder="ARG-COMERCIO-2024" />
                                </div>
                                <div class="hb-form-group">
                                    <label>Nombre *</label>
                                    <input type="text" name="template_name" required
                                           value="${template.template_name || ''}"
                                           placeholder="Argentina - Comercio" />
                                </div>
                                <div class="hb-form-group">
                                    <label>Pais</label>
                                    <select name="country_code">
                                        <option value="">-- Sin especificar --</option>
                                        <option value="ARG" ${template.country_code === 'ARG' ? 'selected' : ''}>Argentina</option>
                                        <option value="BRA" ${template.country_code === 'BRA' ? 'selected' : ''}>Brasil</option>
                                        <option value="URY" ${template.country_code === 'URY' ? 'selected' : ''}>Uruguay</option>
                                        <option value="CHL" ${template.country_code === 'CHL' ? 'selected' : ''}>Chile</option>
                                        <option value="MEX" ${template.country_code === 'MEX' ? 'selected' : ''}>Mexico</option>
                                        <option value="ESP" ${template.country_code === 'ESP' ? 'selected' : ''}>Espana</option>
                                        <option value="DEU" ${template.country_code === 'DEU' ? 'selected' : ''}>Alemania</option>
                                    </select>
                                </div>
                                <div class="hb-form-group">
                                    <label>Sucursal</label>
                                    <select name="branch_id">
                                        <option value="">-- Todas las sucursales --</option>
                                    </select>
                                </div>
                            </div>
                            <div class="hb-form-group">
                                <label>Descripcion</label>
                                <textarea name="description" rows="2">${template.description || ''}</textarea>
                            </div>
                        </div>

                        ${this.fieldCategories ? this.fieldCategories.map(cat => `
                            <div class="hb-form-section">
                                <h4>${cat.label}</h4>
                                <div class="hb-form-grid">
                                    ${cat.fields.map(fieldKey => this.renderFieldInput(fieldKey, template)).join('')}
                                </div>
                            </div>
                        `).join('') : ''}

                        <div class="hb-form-actions">
                            <button type="button" class="hb-btn hb-btn-secondary"
                                    onclick="this.closest('.hb-modal-overlay').remove()">
                                Cancelar
                            </button>
                            <button type="submit" class="hb-btn hb-btn-primary">
                                💾 Guardar Plantilla
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    renderFieldInput(fieldKey, template) {
        const field = this.fieldDefinitions?.[fieldKey];
        if (!field) return '';

        const value = template[fieldKey] !== undefined ? template[fieldKey] : field.value;

        let input = '';
        if (field.type === 'boolean') {
            input = `
                <select name="${fieldKey}">
                    <option value="true" ${value === true ? 'selected' : ''}>Si</option>
                    <option value="false" ${value === false ? 'selected' : ''}>No</option>
                </select>
            `;
        } else if (field.type === 'select') {
            input = `
                <select name="${fieldKey}">
                    ${field.options.map(opt => `
                        <option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>
                    `).join('')}
                </select>
            `;
        } else if (field.type === 'decimal') {
            input = `
                <input type="number" name="${fieldKey}"
                       value="${value}"
                       min="${field.min || 0}"
                       max="${field.max || 999}"
                       step="${field.step || 0.1}" />
            `;
        } else if (field.type === 'number') {
            input = `
                <input type="number" name="${fieldKey}"
                       value="${value}"
                       min="${field.min || 0}"
                       max="${field.max || 999}" />
            `;
        } else {
            input = `<input type="text" name="${fieldKey}" value="${value || ''}" />`;
        }

        return `
            <div class="hb-form-group" title="${field.description}">
                <label>${field.label}</label>
                ${input}
                <small>${field.description}</small>
            </div>
        `;
    },

    async editTemplate(templateId) {
        await this.showTemplateEditor(templateId);
    },

    async saveTemplate(event, templateId) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        const data = {};
        for (const [key, value] of formData.entries()) {
            // Convertir tipos
            if (value === 'true') data[key] = true;
            else if (value === 'false') data[key] = false;
            else if (!isNaN(value) && value !== '') data[key] = parseFloat(value);
            else if (value !== '') data[key] = value;
        }

        const endpoint = templateId ? `/templates/${templateId}` : '/templates';
        const method = templateId ? 'PUT' : 'POST';

        const result = await this.api(endpoint, {
            method,
            body: JSON.stringify(data)
        });

        if (result.success) {
            alert('Plantilla guardada correctamente');
            document.querySelector('.hb-modal-overlay')?.remove();
            await this.loadTemplates();
            this.render();
        } else {
            alert('Error: ' + (result.error || 'No se pudo guardar la plantilla'));
        }

        return false;
    },

    // =========================================================================
    // ESTILOS
    // =========================================================================

    injectStyles() {
        if (document.getElementById('hour-bank-styles')) return;

        const style = document.createElement('style');
        style.id = 'hour-bank-styles';
        style.textContent = `
            .hb-module { background: #1a1a2e; border-radius: 16px; padding: 24px; color: #e0e0e0; }
            .hb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .hb-header-left { display: flex; align-items: center; gap: 16px; }
            .hb-icon { font-size: 2.5em; }
            .hb-header-text h2 { margin: 0; font-size: 1.5em; }
            .hb-header-text p { margin: 4px 0 0 0; color: #888; font-size: 0.9em; }

            .hb-quick-balance { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 12px 20px; border-radius: 12px; text-align: center; }
            .hb-balance-label { display: block; font-size: 0.75em; color: rgba(255,255,255,0.8); }
            .hb-balance-value { display: block; font-size: 1.5em; font-weight: 700; color: #fff; }

            .hb-alert { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px; }
            .hb-alert-warning { background: rgba(251,191,36,0.15); border: 1px solid rgba(251,191,36,0.3); }
            .hb-alert-icon { font-size: 2em; }
            .hb-alert-content { flex: 1; }
            .hb-alert-content strong { display: block; color: #fbbf24; }
            .hb-alert-content p { margin: 4px 0 0 0; color: #d4a019; font-size: 0.9em; }

            .hb-tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }
            .hb-tab { background: transparent; border: none; color: #888; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 0.9em; transition: all 0.2s; }
            .hb-tab:hover { background: rgba(255,255,255,0.05); color: #e0e0e0; }
            .hb-tab.active { background: rgba(99,102,241,0.2); color: #818cf8; }

            .hb-content { min-height: 300px; }

            .hb-dashboard { }
            .hb-balance-card { background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,182,212,0.1) 100%); border: 1px solid rgba(16,185,129,0.3); border-radius: 16px; padding: 24px; margin-bottom: 20px; }
            .hb-balance-main { display: flex; align-items: center; gap: 20px; }
            .hb-balance-icon { font-size: 3em; }
            .hb-balance-title { display: block; color: #888; font-size: 0.9em; }
            .hb-balance-big { display: block; font-size: 3em; font-weight: 700; color: #10b981; }
            .hb-expiring-warning { margin-top: 16px; padding: 12px; background: rgba(251,191,36,0.1); border-radius: 8px; display: flex; align-items: center; gap: 8px; color: #fbbf24; font-size: 0.9em; }

            .hb-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px; }
            .hb-stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; text-align: center; }
            .hb-stat-icon { display: block; font-size: 1.5em; margin-bottom: 8px; }
            .hb-stat-value { display: block; font-size: 1.5em; font-weight: 600; color: #fff; }
            .hb-stat-label { display: block; font-size: 0.8em; color: #888; margin-top: 4px; }

            .hb-config-summary { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; }
            .hb-config-summary h4 { margin: 0 0 16px 0; color: #a0a0a0; }
            .hb-config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
            .hb-config-item { display: flex; flex-direction: column; }
            .hb-config-label { font-size: 0.75em; color: #888; }
            .hb-config-value { font-weight: 600; color: #e0e0e0; }

            .hb-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .hb-section-header h3 { margin: 0; }

            .hb-tx-list { display: flex; flex-direction: column; gap: 8px; }
            .hb-tx-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 10px; border-left: 4px solid #666; }
            .hb-tx-credit { border-left-color: #10b981; }
            .hb-tx-debit { border-left-color: #ef4444; }
            .hb-tx-type { font-weight: 600; margin-right: 12px; }
            .hb-tx-date { color: #888; font-size: 0.85em; margin-right: 12px; }
            .hb-tx-desc { color: #a0a0a0; font-size: 0.85em; }
            .hb-tx-hours { font-size: 1.2em; font-weight: 700; }
            .hb-tx-hours.positive { color: #10b981; }
            .hb-tx-hours.negative { color: #ef4444; }
            .hb-tx-balance { display: block; font-size: 0.75em; color: #888; }

            .hb-request-form { max-width: 500px; }
            .hb-form-group { margin-bottom: 16px; }
            .hb-form-group label { display: block; margin-bottom: 6px; color: #a0a0a0; font-size: 0.9em; }
            .hb-form-group input, .hb-form-group select, .hb-form-group textarea { width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e0e0e0; font-size: 1em; }
            .hb-form-group input:focus, .hb-form-group select:focus, .hb-form-group textarea:focus { border-color: #6366f1; outline: none; }
            .hb-form-group small { display: block; margin-top: 4px; color: #666; font-size: 0.8em; }
            .hb-form-actions { margin-top: 24px; }

            .hb-btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9em; font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
            .hb-btn-primary { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #fff; }
            .hb-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
            .hb-btn-secondary { background: rgba(255,255,255,0.1); color: #e0e0e0; }
            .hb-btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; }
            .hb-btn-sm { padding: 6px 12px; font-size: 0.8em; }
            .hb-btn-pay { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #fff; flex-direction: column; padding: 16px 24px; }
            .hb-btn-bank { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #fff; flex-direction: column; padding: 16px 24px; }

            .hb-templates-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
            .hb-template-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; }
            .hb-template-card.disabled { opacity: 0.6; }
            .hb-template-header { display: flex; gap: 8px; padding: 12px 16px; background: rgba(99,102,241,0.1); font-size: 0.85em; }
            .hb-template-code { font-weight: 600; color: #818cf8; }
            .hb-template-country { background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; }
            .hb-template-branch { color: #888; }
            .hb-template-body { padding: 16px; }
            .hb-template-body h4 { margin: 0 0 8px 0; }
            .hb-template-body p { margin: 0 0 12px 0; color: #888; font-size: 0.9em; }
            .hb-template-rates { display: flex; gap: 12px; font-size: 0.8em; color: #a0a0a0; }
            .hb-template-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(0,0,0,0.2); }
            .hb-template-status { font-size: 0.85em; }
            .hb-template-status.active { color: #10b981; }
            .hb-template-status.inactive { color: #ef4444; }

            .hb-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; }
            .hb-modal { background: #1a1a2e; border-radius: 16px; width: 90%; max-width: 600px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
            .hb-modal-large { max-width: 900px; }
            .hb-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: rgba(99,102,241,0.1); }
            .hb-modal-header h3 { margin: 0; }
            .hb-modal-close { background: none; border: none; color: #888; font-size: 1.5em; cursor: pointer; }
            .hb-modal-body { padding: 20px; overflow-y: auto; flex: 1; }

            .hb-form-section { margin-bottom: 24px; }
            .hb-form-section h4 { margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #a0a0a0; }
            .hb-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }

            .hb-decision-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
            .hb-decision-header { display: flex; justify-content: space-between; padding: 12px 16px; background: rgba(251,191,36,0.1); font-size: 0.85em; }
            .hb-decision-timer { color: #fbbf24; }
            .hb-decision-body { padding: 20px; display: flex; align-items: center; gap: 24px; }
            .hb-decision-hours { text-align: center; }
            .hb-hours-value { display: block; font-size: 2.5em; font-weight: 700; color: #fff; }
            .hb-hours-label { color: #888; }
            .hb-decision-options { display: flex; gap: 16px; flex: 1; justify-content: center; }

            .hb-empty { text-align: center; padding: 40px 20px; }
            .hb-empty span { font-size: 3em; display: block; margin-bottom: 12px; opacity: 0.5; }
            .hb-empty p { color: #888; margin: 0 0 16px 0; }

            .hb-not-enabled { text-align: center; padding: 60px 20px; }
            .hb-icon-large { font-size: 4em; display: block; margin-bottom: 16px; }
            .hb-not-enabled h3 { margin: 0 0 8px 0; }
            .hb-not-enabled p { color: #888; margin: 0; }

            .hb-loading { text-align: center; padding: 40px; color: #888; }

            .hb-filters { display: flex; gap: 8px; }
            .hb-filters select { padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #e0e0e0; }

            @media (max-width: 768px) {
                .hb-header { flex-direction: column; gap: 16px; text-align: center; }
                .hb-tabs { flex-wrap: wrap; justify-content: center; }
                .hb-decision-body { flex-direction: column; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Exportar para uso global
window.HourBankModule = HourBankModule;

/**
 * Funcion de entrada para panel-empresa.html
 * Se llama cuando se selecciona el modulo de Banco de Horas
 * Rutea a Dashboard Admin o Vista Empleado segun el rol
 */
async function showHourBankContent() {
    console.log('🏦 [HourBank] showHourBankContent() llamado');

    const container = document.getElementById('module-content');
    if (!container) {
        console.error('[HourBank] Container module-content no encontrado');
        return;
    }

    // Verificar rol del usuario - Admin/HR ven Dashboard, otros ven Vista Empleado
    const userRole = window.AuthState?.user?.role || localStorage.getItem('userRole');
    const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'rrhh';

    if (isAdmin && typeof window.HourBankDashboard !== 'undefined') {
        console.log('🏦 [HourBank] Usuario Admin/HR - Cargando Dashboard');
        container.innerHTML = '<div id="mainContent" style="padding:0;"></div>';
        window.HourBankDashboard.init('mainContent');
        return;
    }

    console.log('🏦 [HourBank] Usuario Empleado/Supervisor - Cargando Vista Empleado');

    // Mostrar loading
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 3em; margin-bottom: 16px;">🏦</div>
            <p style="color: #888;">Cargando Banco de Horas...</p>
        </div>
    `;

    try {
        // Inicializar modulo
        await HourBankModule.init();

        // Renderizar
        HourBankModule.render(container);

        console.log('🏦 [HourBank] Modulo renderizado exitosamente');
    } catch (error) {
        console.error('[HourBank] Error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #ef4444;">
                <div style="font-size: 3em; margin-bottom: 16px;">⚠️</div>
                <h3>Error al cargar Banco de Horas</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Exponer globalmente
window.showHourBankContent = showHourBankContent;
