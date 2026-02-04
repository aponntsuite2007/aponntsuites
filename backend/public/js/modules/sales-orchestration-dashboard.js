/**
 * ============================================================================
 * SALES ORCHESTRATION DASHBOARD - Orquestador de Ventas
 * ============================================================================
 *
 * Dashboard para vendedores APONNT que gestiona:
 * - Agenda de reuniones con prospectos
 * - Envío de encuestas pre-reunión
 * - Generación de pitches personalizados con Brain
 * - Visor de roadmap visual con miniaturas de módulos
 * - Feedback post-reunión
 * - Estadísticas de ventas
 *
 * ============================================================================
 */

console.log('✅ [SALES-ORCH] Módulo sales-orchestration-dashboard.js cargado');

const SalesOrchestrationDashboard = {
    // Estado
    meetings: [],
    currentMeeting: null,
    modules: [],
    vendors: [],
    stats: null,
    currentView: 'list', // list, create, detail, pitch
    isLoading: false,

    // =========================================================================
    // ESTILOS CSS
    // =========================================================================
    getStyles() {
        return `
        <style>
            /* Container principal */
            .sales-orch-container {
                font-family: 'Segoe UI', system-ui, sans-serif;
                background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
                min-height: 100vh;
                padding: 30px;
                color: #e5e5e5;
            }

            /* Header */
            .sales-orch-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .sales-orch-title {
                font-size: 28px;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin: 0;
            }

            .sales-orch-subtitle {
                color: rgba(255,255,255,0.6);
                font-size: 14px;
                margin-top: 5px;
            }

            /* Stats Cards */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .stat-card {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                padding: 20px;
                text-align: center;
                transition: all 0.3s ease;
            }

            .stat-card:hover {
                transform: translateY(-2px);
                border-color: rgba(102, 126, 234, 0.5);
            }

            .stat-value {
                font-size: 36px;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .stat-label {
                font-size: 12px;
                color: rgba(255,255,255,0.5);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-top: 5px;
            }

            /* Buttons */
            .btn-primary-gradient {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 30px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 10px;
            }

            .btn-primary-gradient:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            }

            .btn-outline {
                background: transparent;
                color: #667eea;
                border: 2px solid #667eea;
                padding: 10px 25px;
                border-radius: 30px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-outline:hover {
                background: rgba(102, 126, 234, 0.1);
            }

            /* Meeting Cards */
            .meetings-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 20px;
            }

            .meeting-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 20px;
                padding: 25px;
                transition: all 0.3s ease;
                cursor: pointer;
            }

            .meeting-card:hover {
                border-color: rgba(102, 126, 234, 0.5);
                transform: translateY(-3px);
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            }

            .meeting-card-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
            }

            .meeting-company {
                font-size: 18px;
                font-weight: 600;
                color: white;
            }

            .meeting-status {
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .status-draft { background: rgba(107, 114, 128, 0.3); color: #9ca3af; }
            .status-scheduled { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
            .status-survey_sent { background: rgba(245, 158, 11, 0.3); color: #fcd34d; }
            .status-survey_completed { background: rgba(16, 185, 129, 0.3); color: #6ee7b7; }
            .status-pitch_ready { background: rgba(139, 92, 246, 0.3); color: #c4b5fd; }
            .status-in_progress { background: rgba(236, 72, 153, 0.3); color: #f9a8d4; }
            .status-completed { background: rgba(34, 197, 94, 0.3); color: #86efac; }

            .meeting-date {
                display: flex;
                align-items: center;
                gap: 8px;
                color: rgba(255,255,255,0.7);
                font-size: 14px;
                margin-bottom: 10px;
            }

            .meeting-attendees {
                display: flex;
                align-items: center;
                gap: 8px;
                color: rgba(255,255,255,0.5);
                font-size: 13px;
            }

            /* Forms */
            .form-group {
                margin-bottom: 20px;
            }

            .form-label {
                display: block;
                color: rgba(255,255,255,0.7);
                font-size: 13px;
                font-weight: 500;
                margin-bottom: 8px;
            }

            .form-input {
                width: 100%;
                padding: 12px 16px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                color: white;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .form-input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
            }

            .form-input::placeholder {
                color: rgba(255,255,255,0.3);
            }

            .form-select {
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23fff' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
                background-size: 12px;
                padding-right: 40px;
            }

            /* Opciones del dropdown con fondo oscuro y texto claro */
            .form-select option {
                background: #1a1a2e;
                color: white;
                padding: 10px;
            }

            .form-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
            }

            /* Pitch Viewer */
            .pitch-container {
                background: white;
                color: #1f2937;
                border-radius: 20px;
                overflow: hidden;
            }

            .pitch-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px;
                color: white;
                text-align: center;
            }

            .pitch-header h1 {
                font-size: 32px;
                margin: 0 0 10px 0;
            }

            .pitch-header p {
                opacity: 0.9;
                margin: 0;
            }

            .pitch-roadmap {
                padding: 40px;
            }

            .pitch-section {
                margin-bottom: 40px;
            }

            .pitch-section-title {
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            /* Module Cards en Pitch */
            .module-pitch-card {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 20px;
                display: grid;
                grid-template-columns: 200px 1fr;
                gap: 24px;
                transition: all 0.3s ease;
            }

            .module-pitch-card:hover {
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                transform: translateY(-2px);
            }

            .module-screenshot {
                width: 200px;
                height: 140px;
                background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
            }

            .module-screenshot img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .module-screenshot-placeholder {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                color: #9ca3af;
            }

            .module-screenshot-placeholder i {
                font-size: 36px;
            }

            .module-info {
                display: flex;
                flex-direction: column;
            }

            .module-info-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 12px;
            }

            .module-name {
                font-size: 18px;
                font-weight: 700;
                color: #1f2937;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .module-name i {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }

            .module-interested-by {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                color: #92400e;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }

            .module-description {
                color: #6b7280;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 12px;
            }

            .module-benefits {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .module-benefit {
                background: #ecfdf5;
                color: #059669;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
            }

            .module-time-allocation {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                align-items: center;
                gap: 20px;
                font-size: 13px;
                color: #6b7280;
            }

            .time-badge {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-weight: 600;
            }

            /* Timeline Roadmap */
            .roadmap-timeline {
                position: relative;
                padding-left: 40px;
            }

            .roadmap-timeline::before {
                content: '';
                position: absolute;
                left: 15px;
                top: 0;
                bottom: 0;
                width: 2px;
                background: linear-gradient(180deg, #667eea, #764ba2);
            }

            .timeline-item {
                position: relative;
                margin-bottom: 30px;
            }

            .timeline-item::before {
                content: '';
                position: absolute;
                left: -33px;
                top: 8px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: white;
                border: 3px solid #667eea;
            }

            .timeline-item.intro::before { border-color: #22c55e; }
            .timeline-item.closing::before { border-color: #f59e0b; }

            /* Empty State */
            .empty-state {
                text-align: center;
                padding: 60px;
                color: rgba(255,255,255,0.5);
            }

            .empty-state i {
                font-size: 64px;
                margin-bottom: 20px;
                opacity: 0.3;
            }

            /* Loading */
            .loading-spinner {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 60px;
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(102, 126, 234, 0.2);
                border-top-color: #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Attendees List */
            .attendees-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .attendee-item {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .attendee-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .attendee-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea, #764ba2);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 600;
            }

            .attendee-name {
                font-weight: 600;
                color: white;
            }

            .attendee-role {
                font-size: 12px;
                color: rgba(255,255,255,0.5);
            }

            .btn-remove {
                background: rgba(239, 68, 68, 0.2);
                color: #fca5a5;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-remove:hover {
                background: rgba(239, 68, 68, 0.4);
            }

            /* Industry Select */
            .industry-options {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 10px;
            }

            .industry-option {
                background: rgba(255,255,255,0.03);
                border: 2px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 15px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .industry-option:hover {
                border-color: rgba(102, 126, 234, 0.5);
            }

            .industry-option.selected {
                border-color: #667eea;
                background: rgba(102, 126, 234, 0.1);
            }

            .industry-option i {
                font-size: 24px;
                margin-bottom: 8px;
                display: block;
            }

            .industry-option span {
                font-size: 12px;
                color: rgba(255,255,255,0.7);
            }

            /* Print Styles */
            @media print {
                .sales-orch-container { background: white; color: #1f2937; }
                .btn-primary-gradient, .btn-outline { display: none; }
            }
        </style>
        `;
    },

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    async init(containerId = 'sales-orchestration-container') {
        console.log('🚀 [SALES-ORCH] Inicializando dashboard...');

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('❌ [SALES-ORCH] Container no encontrado');
            return;
        }

        // Cargar datos iniciales
        await this.loadInitialData();

        // Renderizar
        this.render();
    },

    async loadInitialData() {
        this.isLoading = true;
        this.render();

        try {
            // Cargar en paralelo
            const [meetingsRes, modulesRes, vendorsRes, statsRes] = await Promise.all([
                this.fetchAPI('/api/sales-orchestration/meetings'),
                this.fetchAPI('/api/sales-orchestration/modules'),
                this.fetchAPI('/api/sales-orchestration/vendors'),
                this.fetchAPI('/api/sales-orchestration/stats')
            ]);

            this.meetings = meetingsRes?.data || [];
            this.modules = modulesRes?.data || [];
            this.vendors = vendorsRes?.data || [];
            this.stats = statsRes?.data || {};

            console.log('✅ [SALES-ORCH] Datos cargados:', {
                meetings: this.meetings.length,
                modules: this.modules.length,
                vendors: this.vendors.length
            });
        } catch (error) {
            console.error('❌ [SALES-ORCH] Error cargando datos:', error);
        }

        this.isLoading = false;
    },

    // =========================================================================
    // RENDER PRINCIPAL
    // =========================================================================

    render() {
        if (!this.container) return;

        let content = '';

        switch (this.currentView) {
            case 'create':
                content = this.renderCreateForm();
                break;
            case 'detail':
                content = this.renderMeetingDetail();
                break;
            case 'pitch':
                content = this.renderPitchViewer();
                break;
            default:
                content = this.renderMeetingsList();
        }

        this.container.innerHTML = `
            ${this.getStyles()}
            <div class="sales-orch-container">
                ${content}
            </div>
        `;

        this.attachEventListeners();
    },

    // =========================================================================
    // VISTA: LISTA DE REUNIONES
    // =========================================================================

    renderMeetingsList() {
        return `
            <!-- Header -->
            <div class="sales-orch-header">
                <div>
                    <h1 class="sales-orch-title">🧠 Sales Orchestration Brain</h1>
                    <p class="sales-orch-subtitle">Orquestación inteligente de ventas</p>
                </div>
                <button class="btn-primary-gradient" onclick="SalesOrchestrationDashboard.showCreateForm()">
                    <i class="fas fa-plus"></i> Nueva Reunión
                </button>
            </div>

            <!-- Stats -->
            ${this.renderStats()}

            <!-- Meetings List -->
            ${this.isLoading ? this.renderLoading() : this.renderMeetingsGrid()}
        `;
    },

    renderStats() {
        const s = this.stats || {};
        // Calcular total excluyendo canceladas
        const activeTotal = (parseInt(s.draft) || 0) + (parseInt(s.scheduled) || 0) +
                           (parseInt(s.pending_surveys) || 0) + (parseInt(s.ready) || 0) +
                           (parseInt(s.in_progress) || 0) + (parseInt(s.quoted) || 0);
        return `
            <div class="stats-grid">
                <div class="stat-card" style="border-left: 4px solid #6b7280;" onclick="SalesOrchestrationDashboard.filterByStatus('draft')">
                    <div class="stat-value">${s.draft || 0}</div>
                    <div class="stat-label">📝 Nuevas</div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #3b82f6;" onclick="SalesOrchestrationDashboard.filterByStatus('scheduled')">
                    <div class="stat-value">${s.scheduled || 0}</div>
                    <div class="stat-label">📅 Agendadas</div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #f59e0b;" onclick="SalesOrchestrationDashboard.filterByStatus('survey_sent')">
                    <div class="stat-value">${s.pending_surveys || 0}</div>
                    <div class="stat-label">📋 Esperando Encuestas</div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #8b5cf6;" onclick="SalesOrchestrationDashboard.filterByStatus('pitch_ready')">
                    <div class="stat-value">${s.ready || 0}</div>
                    <div class="stat-label">🎯 Pitch Listo</div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #ec4899;" onclick="SalesOrchestrationDashboard.filterByStatus('in_progress')">
                    <div class="stat-value">${s.in_progress || 0}</div>
                    <div class="stat-label">🔄 En Progreso</div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #22c55e;" onclick="SalesOrchestrationDashboard.filterByStatus('completed')">
                    <div class="stat-value">${s.completed || 0}</div>
                    <div class="stat-label">✅ Completadas</div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #10b981;" onclick="SalesOrchestrationDashboard.filterByStatus('quoted')">
                    <div class="stat-value">${s.quoted || 0}</div>
                    <div class="stat-label">💰 Presupuestadas</div>
                </div>
                <div class="stat-card" style="border-left: 4px solid #ef4444;" onclick="SalesOrchestrationDashboard.filterByStatus('cancelled')">
                    <div class="stat-value">${s.cancelled || 0}</div>
                    <div class="stat-label">❌ Canceladas</div>
                </div>
            </div>
            <div style="text-align: right; margin-bottom: 20px; color: rgba(255,255,255,0.5); font-size: 12px;">
                Total activas: ${activeTotal} | Total general: ${s.total || 0}
            </div>
        `;
    },

    // Filtrar reuniones por estado
    filterByStatus(status) {
        this.currentFilter = status;
        this.render();
    },

    clearFilter() {
        this.currentFilter = null;
        this.render();
    },

    renderMeetingsGrid() {
        if (this.meetings.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <h3>No hay reuniones agendadas</h3>
                    <p>Crea tu primera reunión para comenzar a usar el orquestador</p>
                    <button class="btn-primary-gradient" onclick="SalesOrchestrationDashboard.showCreateForm()" style="margin-top: 20px;">
                        <i class="fas fa-plus"></i> Nueva Reunión
                    </button>
                </div>
            `;
        }

        return `
            <div class="meetings-grid">
                ${this.meetings.map(m => this.renderMeetingCard(m)).join('')}
            </div>
        `;
    },

    renderMeetingCard(meeting) {
        const statusLabels = {
            draft: 'Borrador',
            scheduled: 'Agendada',
            survey_sent: 'Encuesta Enviada',
            survey_completed: 'Encuestas Completas',
            pitch_ready: 'Pitch Listo',
            reminder_sent: 'Recordatorio Enviado',
            in_progress: 'En Progreso',
            completed: 'Completada',
            feedback_pending: 'Pendiente Feedback',
            closed: 'Cerrada',
            cancelled: 'Cancelada'
        };

        const date = new Date(meeting.meeting_date);
        const formattedDate = date.toLocaleDateString('es-AR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });

        return `
            <div class="meeting-card" onclick="SalesOrchestrationDashboard.showMeetingDetail('${meeting.id}')">
                <div class="meeting-card-header">
                    <div class="meeting-company">${meeting.prospect_company_name}</div>
                    <span class="meeting-status status-${meeting.status}">
                        ${statusLabels[meeting.status] || meeting.status}
                    </span>
                </div>
                <div class="meeting-date">
                    <i class="far fa-calendar"></i>
                    ${formattedDate} - ${meeting.meeting_time?.slice(0, 5) || ''}
                </div>
                <div class="meeting-attendees">
                    <i class="fas fa-users"></i>
                    ${meeting.attendee_count || 0} asistentes
                </div>
                ${meeting.status === 'pitch_ready' ? `
                    <button class="btn-outline" style="margin-top: 15px; width: 100%;"
                            onclick="event.stopPropagation(); SalesOrchestrationDashboard.showPitch('${meeting.id}')">
                        <i class="fas fa-presentation"></i> Ver Pitch
                    </button>
                ` : ''}
            </div>
        `;
    },

    renderLoading() {
        return `
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
        `;
    },

    // =========================================================================
    // VISTA: CREAR REUNIÓN
    // =========================================================================

    renderCreateForm() {
        const industries = [
            { value: 'industria', icon: 'fa-industry', label: 'Industria' },
            { value: 'gobierno', icon: 'fa-landmark', label: 'Gobierno' },
            { value: 'universidad', icon: 'fa-university', label: 'Universidad' },
            { value: 'salud', icon: 'fa-hospital', label: 'Salud' },
            { value: 'retail', icon: 'fa-shopping-cart', label: 'Retail' },
            { value: 'servicios', icon: 'fa-concierge-bell', label: 'Servicios' },
            { value: 'tecnologia', icon: 'fa-laptop-code', label: 'Tecnología' },
            { value: 'finanzas', icon: 'fa-chart-line', label: 'Finanzas' },
            { value: 'construccion', icon: 'fa-hard-hat', label: 'Construcción' },
            { value: 'logistica', icon: 'fa-truck', label: 'Logística' },
            { value: 'educacion', icon: 'fa-graduation-cap', label: 'Educación' },
            { value: 'otro', icon: 'fa-building', label: 'Otro' }
        ];

        return `
            <!-- Header -->
            <div class="sales-orch-header">
                <div>
                    <h1 class="sales-orch-title">📅 Nueva Reunión</h1>
                    <p class="sales-orch-subtitle">Agenda una reunión con un prospecto</p>
                </div>
                <button class="btn-outline" onclick="SalesOrchestrationDashboard.showList()">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
            </div>

            <form id="meeting-form" onsubmit="SalesOrchestrationDashboard.handleCreateMeeting(event)">
                <!-- Datos de la Empresa -->
                <div class="pitch-section">
                    <h3 class="pitch-section-title"><i class="fas fa-building"></i> Datos del Prospecto</h3>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Nombre de la Empresa *</label>
                            <input type="text" name="prospectCompanyName" class="form-input" required
                                   placeholder="Ej: Acme Corporation">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cantidad de Empleados (aprox)</label>
                            <input type="number" name="prospectEmployeeCount" class="form-input"
                                   placeholder="Ej: 150">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Industria/Rubro</label>
                        <div class="industry-options">
                            ${industries.map(ind => `
                                <div class="industry-option" data-value="${ind.value}"
                                     onclick="SalesOrchestrationDashboard.selectIndustry('${ind.value}')">
                                    <i class="fas ${ind.icon}"></i>
                                    <span>${ind.label}</span>
                                </div>
                            `).join('')}
                        </div>
                        <input type="hidden" name="prospectCompanyType" id="industry-input" value="otro">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">País</label>
                            <input type="text" name="prospectCountry" class="form-input" value="Argentina">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Provincia</label>
                            <input type="text" name="prospectProvince" class="form-input"
                                   placeholder="Ej: Buenos Aires">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ciudad</label>
                            <input type="text" name="prospectCity" class="form-input"
                                   placeholder="Ej: CABA">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Teléfono de contacto</label>
                            <input type="tel" name="prospectPhone" class="form-input"
                                   placeholder="+54 11 1234-5678">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email de contacto</label>
                            <input type="email" name="prospectEmail" class="form-input"
                                   placeholder="contacto@empresa.com">
                        </div>
                    </div>
                </div>

                <!-- Datos de la Reunión -->
                <div class="pitch-section">
                    <h3 class="pitch-section-title"><i class="fas fa-calendar-alt"></i> Datos de la Reunión</h3>

                    <!-- Tipo de Reunión -->
                    <div class="form-group">
                        <label class="form-label">Tipo de Interacción *</label>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                            <div class="meeting-type-option" data-type="presencial" onclick="SalesOrchestrationDashboard.selectMeetingType('presencial')"
                                 style="background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s;">
                                <i class="fas fa-handshake" style="font-size: 32px; color: #22c55e; margin-bottom: 10px; display: block;"></i>
                                <div style="font-weight: 600; color: white; margin-bottom: 5px;">Presencial</div>
                                <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Reunión cara a cara en oficina</div>
                            </div>
                            <div class="meeting-type-option selected" data-type="virtual" onclick="SalesOrchestrationDashboard.selectMeetingType('virtual')"
                                 style="background: rgba(102, 126, 234, 0.1); border: 2px solid #667eea; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s;">
                                <i class="fas fa-video" style="font-size: 32px; color: #3b82f6; margin-bottom: 10px; display: block;"></i>
                                <div style="font-weight: 600; color: white; margin-bottom: 5px;">Virtual</div>
                                <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Videollamada (Meet/Zoom/Teams)</div>
                            </div>
                            <div class="meeting-type-option" data-type="demo_only" onclick="SalesOrchestrationDashboard.selectMeetingType('demo_only')"
                                 style="background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s;">
                                <i class="fas fa-play-circle" style="font-size: 32px; color: #f59e0b; margin-bottom: 10px; display: block;"></i>
                                <div style="font-weight: 600; color: white; margin-bottom: 5px;">Solo DEMO</div>
                                <div style="font-size: 11px; color: rgba(255,255,255,0.5);">Acceso a demo sin reunión</div>
                            </div>
                        </div>
                        <input type="hidden" name="meetingType" id="meeting-type-input" value="virtual">
                    </div>

                    <!-- Info DEMO (solo visible si elige demo_only) -->
                    <div id="demo-only-info" style="display: none; background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <h4 style="color: #92400e; margin: 0 0 10px 0;"><i class="fas fa-info-circle"></i> Modo Solo DEMO</h4>
                        <p style="color: #78350f; margin: 0; font-size: 14px;">
                            El prospecto recibirá un email con acceso a la plataforma APONNT para explorar por su cuenta:
                        </p>
                        <ul style="color: #78350f; margin: 10px 0 0 0; padding-left: 20px; font-size: 13px;">
                            <li>🌐 Enlace a <strong>www.aponnt.com</strong></li>
                            <li>🔐 Credenciales de acceso a empresa DEMO</li>
                            <li>📋 Lista de módulos recomendados según sus intereses</li>
                            <li>📧 Contacto del vendedor para consultas</li>
                        </ul>
                    </div>

                    <!-- Fecha y hora (oculto en demo_only) -->
                    <div id="meeting-datetime-section">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Fecha *</label>
                                <input type="date" name="meetingDate" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Hora *</label>
                                <input type="time" name="meetingTime" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Duración (minutos)</label>
                                <select name="meetingDurationMinutes" class="form-input form-select">
                                    <option value="30">30 minutos</option>
                                    <option value="45">45 minutos</option>
                                    <option value="60" selected>1 hora</option>
                                    <option value="90">1.5 horas</option>
                                    <option value="120">2 horas</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Opciones para PRESENCIAL -->
                    <div id="presencial-options" style="display: none;">
                        <div class="form-group">
                            <label class="form-label">Dirección de la reunión *</label>
                            <input type="text" name="meetingLocation" class="form-input"
                                   placeholder="Ej: Av. Corrientes 1234, Piso 5, CABA">
                        </div>
                    </div>

                    <!-- Opciones para VIRTUAL -->
                    <div id="virtual-options">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Plataforma</label>
                                <select name="meetingPlatform" class="form-input form-select" onchange="SalesOrchestrationDashboard.onPlatformChange(this.value)">
                                    <option value="Google Meet">Google Meet</option>
                                    <option value="Zoom">Zoom</option>
                                    <option value="Microsoft Teams">Microsoft Teams</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Link de la reunión</label>
                                <input type="url" name="meetingLink" class="form-input"
                                       placeholder="https://meet.google.com/xxx-xxxx-xxx">
                            </div>
                        </div>
                        <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: -10px;">
                            <i class="fas fa-lightbulb"></i> Tip: Crea la reunión en tu calendario y pega el link aquí
                        </p>
                    </div>

                    ${this.vendors.length > 1 ? `
                        <div class="form-group">
                            <label class="form-label">Asignar a Vendedor</label>
                            <select name="assignedVendorId" class="form-input form-select" required>
                                ${this.vendors.map(v => `
                                    <option value="${v.staff_id}">${v.full_name}</option>
                                `).join('')}
                            </select>
                        </div>
                    ` : ''}
                </div>

                <!-- Asistentes -->
                <div class="pitch-section">
                    <h3 class="pitch-section-title"><i class="fas fa-users"></i> Asistentes</h3>

                    <div id="attendees-list" class="attendees-list">
                        <!-- Se agregan dinámicamente -->
                    </div>

                    <button type="button" class="btn-outline" style="margin-top: 15px;"
                            onclick="SalesOrchestrationDashboard.addAttendeeField()">
                        <i class="fas fa-plus"></i> Agregar Asistente
                    </button>
                </div>

                <!-- Opciones -->
                <div class="pitch-section">
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" name="sendReminder24h" checked style="width: 20px; height: 20px;">
                            <span class="form-label" style="margin: 0;">Enviar recordatorio 24h antes</span>
                        </label>
                    </div>
                </div>

                <!-- Submit -->
                <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px;">
                    <button type="button" class="btn-outline" onclick="SalesOrchestrationDashboard.showList()">
                        Cancelar
                    </button>
                    <button type="submit" class="btn-primary-gradient">
                        <i class="fas fa-save"></i> Crear Reunión
                    </button>
                </div>
            </form>
        `;
    },

    // =========================================================================
    // VISTA: PITCH VIEWER (Lo más importante - con miniaturas)
    // =========================================================================

    renderPitchViewer() {
        if (!this.currentMeeting?.vendorPitch) {
            return `
                <div class="sales-orch-header">
                    <button class="btn-outline" onclick="SalesOrchestrationDashboard.showList()">
                        <i class="fas fa-arrow-left"></i> Volver
                    </button>
                </div>
                <div class="empty-state">
                    <i class="fas fa-file-powerpoint"></i>
                    <h3>Pitch no disponible</h3>
                    <p>Las encuestas aún no fueron completadas o el pitch no fue generado</p>
                </div>
            `;
        }

        const pitch = this.currentMeeting.vendorPitch;
        const meeting = pitch.meeting;
        const vendor = this.currentMeeting.vendor || {};
        const attendees = this.currentMeeting.attendees || [];

        // Contar encuestas completadas
        const completedSurveys = attendees.filter(a => a.survey_completed_at).length;
        const totalAttendees = attendees.length;

        return `
            <!-- Header con acciones -->
            <div class="sales-orch-header" style="margin-bottom: 0;">
                <button class="btn-outline" onclick="SalesOrchestrationDashboard.showList()">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-outline" onclick="window.print()">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                    <button class="btn-outline" style="border-color: #8b5cf6; color: #8b5cf6;"
                            onclick="SalesOrchestrationDashboard.sendPitchToAll('${this.currentMeeting.id}')">
                        <i class="fas fa-paper-plane"></i> Enviar Pitch a Todos
                    </button>
                    <button class="btn-primary-gradient" onclick="SalesOrchestrationDashboard.startMeeting('${this.currentMeeting.id}')">
                        <i class="fas fa-play"></i> Iniciar Reunión
                    </button>
                </div>
            </div>

            <!-- Pitch Container -->
            <div class="pitch-container" style="margin-top: 20px;">
                <!-- Header del Pitch con Logo APONNT -->
                <div class="pitch-header" style="position: relative;">
                    <!-- Logo APONNT -->
                    <div style="position: absolute; top: 20px; left: 20px; display: flex; align-items: center; gap: 10px;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <span style="color: white; font-size: 24px; font-weight: bold;">A</span>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: #f59e0b;">APONNT 360º</div>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.7);">Ecosistema Inteligente</div>
                        </div>
                    </div>

                    <!-- Info del Vendedor -->
                    <div style="position: absolute; top: 20px; right: 20px; text-align: right;">
                        <div style="display: flex; align-items: center; gap: 10px; justify-content: flex-end;">
                            <div>
                                <div style="font-size: 14px; font-weight: 600; color: white;">${vendor.full_name || 'Ejecutivo Comercial'}</div>
                                <div style="font-size: 12px; color: rgba(255,255,255,0.7);">${vendor.email || ''}</div>
                                ${vendor.phone ? `<div style="font-size: 12px; color: rgba(255,255,255,0.7);">${vendor.phone}</div>` : ''}
                            </div>
                            <div style="width: 45px; height: 45px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: white;">
                                ${(vendor.full_name || 'E').charAt(0)}
                            </div>
                        </div>
                    </div>

                    <h1 style="padding-top: 60px;">🚀 ${meeting.company}</h1>
                    <p>Roadmap Personalizado | ${new Date(meeting.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} - ${meeting.time?.slice(0,5) || ''}</p>
                    <p style="margin-top: 10px; opacity: 0.8;">
                        <i class="fas fa-clock"></i> ${meeting.duration} minutos |
                        <i class="fas fa-map-marker-alt"></i> ${meeting.location || 'Virtual'}
                    </p>

                    <!-- Estado de encuestas -->
                    <div style="margin-top: 15px; background: rgba(255,255,255,0.1); border-radius: 20px; padding: 8px 16px; display: inline-block;">
                        <span style="color: ${completedSurveys === totalAttendees ? '#22c55e' : '#f59e0b'};">
                            <i class="fas fa-poll"></i> Encuestas: ${completedSurveys}/${totalAttendees} completadas
                        </span>
                    </div>
                </div>

                <div class="pitch-roadmap">
                    <!-- Asistentes con botones de envío -->
                    <div class="pitch-section">
                        <h3 class="pitch-section-title">
                            <i class="fas fa-users" style="color: #667eea;"></i>
                            Participantes
                            <span style="font-size: 12px; font-weight: normal; color: #6b7280; margin-left: 10px;">
                                (click en <i class="fas fa-paper-plane"></i> para enviar pitch individual)
                            </span>
                        </h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                            ${attendees.map(a => {
                                const pitchAttendee = pitch.attendees?.find(pa => pa.name === a.full_name) || {};
                                const hasSurvey = !!a.survey_completed_at;
                                return `
                                <div style="background: #f3f4f6; padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px; position: relative;">
                                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, ${hasSurvey ? '#22c55e, #16a34a' : '#9ca3af, #6b7280'}); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                                        ${a.full_name.charAt(0)}
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600; color: #1f2937;">${a.full_name}</div>
                                        <div style="font-size: 12px; color: #6b7280;">${a.role || 'Participante'}</div>
                                        <div style="font-size: 11px; color: ${hasSurvey ? '#22c55e' : '#f59e0b'};">
                                            ${hasSurvey ? '✅ Encuesta completada' : '⏳ Pendiente encuesta'}
                                        </div>
                                    </div>
                                    ${a.is_decision_maker ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;">Decision Maker</span>' : ''}
                                    ${hasSurvey ? `
                                        <button onclick="event.stopPropagation(); SalesOrchestrationDashboard.sendPitchToAttendee('${this.currentMeeting.id}', '${a.id}')"
                                                style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;"
                                                title="Enviar pitch a ${a.full_name}">
                                            <i class="fas fa-paper-plane"></i>
                                        </button>
                                    ` : ''}
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Resumen Consolidado para el Vendedor -->
                    <div class="pitch-section" style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border-radius: 16px; padding: 25px; margin-bottom: 30px;">
                        <h3 style="color: #92400e; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-lightbulb"></i>
                            Resumen Ejecutivo para ${vendor.full_name || 'Vendedor'}
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div style="background: white; border-radius: 12px; padding: 15px; text-align: center;">
                                <div style="font-size: 28px; font-weight: bold; color: #1f2937;">${pitch.modules?.length || 0}</div>
                                <div style="font-size: 12px; color: #6b7280;">Módulos de Interés</div>
                            </div>
                            <div style="background: white; border-radius: 12px; padding: 15px; text-align: center;">
                                <div style="font-size: 28px; font-weight: bold; color: #1f2937;">${meeting.duration}</div>
                                <div style="font-size: 12px; color: #6b7280;">Minutos Totales</div>
                            </div>
                            <div style="background: white; border-radius: 12px; padding: 15px; text-align: center;">
                                <div style="font-size: 28px; font-weight: bold; color: ${completedSurveys === totalAttendees ? '#22c55e' : '#f59e0b'};">${completedSurveys}/${totalAttendees}</div>
                                <div style="font-size: 12px; color: #6b7280;">Encuestas Completadas</div>
                            </div>
                        </div>
                        ${pitch.modules?.filter(m => m.maxInterest === 'critical').length > 0 ? `
                            <div style="margin-top: 15px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 10px; padding: 12px 15px; color: white;">
                                <strong>🔥 Módulos CRÍTICOS:</strong>
                                ${pitch.modules.filter(m => m.maxInterest === 'critical').map(m => m.name).join(', ')}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Mapa de Intereses: Participantes por Módulo -->
                    <div class="pitch-section">
                        <h3 class="pitch-section-title">
                            <i class="fas fa-project-diagram" style="color: #8b5cf6;"></i>
                            Mapa de Intereses por Módulo
                            <span style="font-size: 12px; font-weight: normal; color: #6b7280; margin-left: 10px;">
                                (quién está interesado en qué)
                            </span>
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-bottom: 30px;">
                            ${(pitch.modules || []).map(m => `
                                <div style="background: white; border: 2px solid ${m.color || '#e5e7eb'}; border-radius: 12px; padding: 15px; position: relative; overflow: hidden;">
                                    <div style="position: absolute; top: 0; right: 0; background: ${m.maxInterest === 'critical' ? '#ef4444' : m.maxInterest === 'high' ? '#f59e0b' : '#3b82f6'}; color: white; padding: 4px 12px; font-size: 10px; font-weight: 600; border-bottom-left-radius: 8px;">
                                        ${m.maxInterest === 'critical' ? '🔥 CRÍTICO' : m.maxInterest === 'high' ? '⭐ ALTO' : '📌 MEDIO'}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; margin-top: 20px;">
                                        <div style="width: 40px; height: 40px; background: ${m.color || '#667eea'}; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                            <i class="fas ${m.icon || 'fa-cube'}" style="color: white;"></i>
                                        </div>
                                        <div>
                                            <div style="font-weight: 600; color: #1f2937;">${m.name || m.key}</div>
                                        </div>
                                    </div>
                                    <div style="border-top: 1px solid #e5e7eb; padding-top: 10px;">
                                        <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px;">👥 INTERESADOS:</div>
                                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                            ${(m.interestedAttendees || []).map(name => `
                                                <span style="background: linear-gradient(135deg, ${m.color || '#667eea'}20, ${m.color || '#667eea'}10); color: ${m.color || '#667eea'}; padding: 3px 10px; border-radius: 15px; font-size: 11px; font-weight: 500; border: 1px solid ${m.color || '#667eea'}30;">
                                                    ${name}
                                                </span>
                                            `).join('')}
                                            ${(!m.interestedAttendees || m.interestedAttendees.length === 0) ? '<span style="color: #9ca3af; font-size: 11px;">Sin datos de interés</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Timeline -->
                    <div class="pitch-section">
                        <h3 class="pitch-section-title">
                            <i class="fas fa-route" style="color: #22c55e;"></i>
                            Roadmap de la Reunión
                        </h3>

                        <div class="roadmap-timeline">
                            <!-- Intro -->
                            <div class="timeline-item intro">
                                <div style="background: #ecfdf5; padding: 15px 20px; border-radius: 12px; border-left: 4px solid #22c55e;">
                                    <strong style="color: #166534;">🎯 Apertura</strong>
                                    <span style="float: right; color: #22c55e; font-weight: 600;">${pitch.roadmap.intro.minutes} min</span>
                                    <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">${pitch.roadmap.intro.notes}</p>
                                </div>
                            </div>

                            <!-- Módulos -->
                            ${pitch.roadmap.modules.map((rm, idx) => {
                                const moduleData = pitch.modules.find(m => m.key === rm.module) || {};
                                const interestBadge = moduleData.maxInterest === 'critical' ? '🔥' : moduleData.maxInterest === 'high' ? '⭐' : '📌';
                                return `
                                    <div class="timeline-item">
                                        <div class="module-pitch-card" style="border: 2px solid ${moduleData.color || '#e5e7eb'};">
                                            <div class="module-screenshot">
                                                ${this.getModuleScreenshot(moduleData)}
                                            </div>
                                            <div class="module-info">
                                                <div class="module-info-header">
                                                    <div class="module-name">
                                                        <i class="fas ${moduleData.icon || 'fa-cube'}" style="background: ${moduleData.color || '#667eea'};"></i>
                                                        ${rm.name || rm.module}
                                                        <span style="font-size: 16px;">${interestBadge}</span>
                                                    </div>
                                                </div>
                                                <div style="background: #fef3c7; color: #92400e; padding: 8px 12px; border-radius: 8px; margin-bottom: 10px; font-size: 13px;">
                                                    <strong>👥 Dirigirse a:</strong> ${rm.targetAttendees?.join(', ') || 'Todos los participantes'}
                                                </div>
                                                <p class="module-description">${moduleData.description || 'Módulo del sistema APONNT'}</p>
                                                ${moduleData.benefits?.length ? `
                                                    <div class="module-benefits">
                                                        ${(moduleData.benefits || []).slice(0, 3).map(b => `
                                                            <span class="module-benefit">✓ ${b}</span>
                                                        `).join('')}
                                                    </div>
                                                ` : ''}
                                                <div class="module-time-allocation">
                                                    <span class="time-badge">${rm.minutes} min</span>
                                                    <span>Profundidad: ${rm.depth === 'detailed' ? '🎯 Detallada' : rm.depth === 'brief' ? '⚡ Breve' : '📋 Estándar'}</span>
                                                    <span style="margin-left: auto; color: #6b7280;">Paso ${idx + 1}/${pitch.roadmap.modules.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}

                            <!-- Cierre -->
                            <div class="timeline-item closing">
                                <div style="background: #fef3c7; padding: 15px 20px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                                    <strong style="color: #92400e;">🎬 Cierre</strong>
                                    <span style="float: right; color: #f59e0b; font-weight: 600;">${pitch.roadmap.closing.minutes} min</span>
                                    <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">${pitch.roadmap.closing.notes}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer del Pitch con datos del vendedor -->
                    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; margin-top: 30px; padding: 30px; color: white;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                            <!-- Logo y slogan -->
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-size: 28px; font-weight: bold;">A</span>
                                </div>
                                <div>
                                    <div style="font-size: 22px; font-weight: bold; color: #f59e0b;">APONNT 360º</div>
                                    <div style="font-size: 13px; color: rgba(255,255,255,0.7);">Ecosistema Inteligente de Gestión Empresarial</div>
                                </div>
                            </div>

                            <!-- Datos del vendedor -->
                            <div style="text-align: right;">
                                <div style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">
                                    ${vendor.full_name || 'Equipo Comercial APONNT'}
                                </div>
                                ${vendor.email ? `<div style="font-size: 13px; color: rgba(255,255,255,0.8);"><i class="fas fa-envelope" style="margin-right: 5px;"></i>${vendor.email}</div>` : ''}
                                ${vendor.phone ? `<div style="font-size: 13px; color: rgba(255,255,255,0.8);"><i class="fas fa-phone" style="margin-right: 5px;"></i>${vendor.phone}</div>` : ''}
                            </div>
                        </div>

                        <div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 20px; padding-top: 15px; text-align: center;">
                            <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0;">
                                Pitch generado automáticamente por <strong style="color: #f59e0b;">Sales Orchestration Brain</strong> |
                                ${new Date(pitch.generatedAt).toLocaleString('es-AR')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generar miniatura/screenshot del módulo
     */
    getModuleScreenshot(module) {
        // Mapa de screenshots por módulo (URLs reales o placeholders SVG)
        const screenshots = {
            'auth': this.generateModulePreviewSVG('Autenticación', '#f59e0b', 'fa-shield-alt', ['Login Seguro', 'SSO / 2FA', 'Roles']),
            'users': this.generateModulePreviewSVG('Usuarios', '#3b82f6', 'fa-users', ['Perfiles 360°', 'Documentos', 'Historial']),
            'attendance': this.generateModulePreviewSVG('Asistencia', '#22c55e', 'fa-fingerprint', ['Biométrico', 'Reportes', 'Alertas']),
            'shifts': this.generateModulePreviewSVG('Turnos', '#8b5cf6', 'fa-calendar-alt', ['Rotativos', 'Plantillas', 'Conflictos']),
            'departments': this.generateModulePreviewSVG('Departamentos', '#ec4899', 'fa-sitemap', ['Organigrama', 'Jerarquías', 'Sucursales']),
            'vacations': this.generateModulePreviewSVG('Vacaciones', '#06b6d4', 'fa-umbrella-beach', ['Solicitudes', 'Aprobaciones', 'Calendario']),
            'medical-leave': this.generateModulePreviewSVG('Licencias', '#ef4444', 'fa-notes-medical', ['Adjuntos', 'Seguimiento', 'Alertas']),
            'overtime': this.generateModulePreviewSVG('Horas Extra', '#f97316', 'fa-clock', ['Autorización', 'Cálculo', 'Nómina']),
            'sanctions': this.generateModulePreviewSVG('Sanciones', '#dc2626', 'fa-gavel', ['Workflow', 'Historial', 'Notificaciones']),
            'payroll': this.generateModulePreviewSVG('Nómina', '#16a34a', 'fa-money-bill-wave', ['Liquidación', 'Conceptos', 'Exportación']),
            'kiosks': this.generateModulePreviewSVG('Kiosks', '#6366f1', 'fa-tablet-alt', ['Dispositivos', 'Monitoreo', 'Offline']),
            'reports': this.generateModulePreviewSVG('Reportes', '#0ea5e9', 'fa-chart-bar', ['Dashboards', 'Excel/PDF', 'Programados']),
            'notifications': this.generateModulePreviewSVG('Notificaciones', '#eab308', 'fa-bell', ['Multi-canal', 'Reglas', 'Escalamiento']),
            'employee-360': this.generateModulePreviewSVG('Employee 360', '#8b5cf6', 'fa-user-circle', ['Métricas', 'OKR', 'Feedback']),
            'wellness': this.generateModulePreviewSVG('Bienestar', '#ec4899', 'fa-heart', ['Clima', 'Salud', 'Métricas']),
            'ai-assistant': this.generateModulePreviewSVG('IA Assistant', '#7c3aed', 'fa-robot', ['Contextual', 'Acciones', 'Aprendizaje']),
            'documents': this.generateModulePreviewSVG('Documentos', '#0891b2', 'fa-folder-open', ['Vencimientos', 'Firma Digital', 'Versiones']),
            'hour-bank': this.generateModulePreviewSVG('Banco Horas', '#059669', 'fa-piggy-bank', ['Acumulación', 'Políticas', 'Workflow']),
            'predictive': this.generateModulePreviewSVG('Predictivo', '#7c3aed', 'fa-brain', ['Rotación', 'Alertas', 'ML'])
        };

        if (module.screenshotUrl) {
            return `<img src="${module.screenshotUrl}" alt="${module.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }

        return screenshots[module.key] || this.generateModulePreviewSVG(
            module.name || 'Módulo',
            module.color || '#667eea',
            module.icon || 'fa-cube',
            ['Funcionalidad 1', 'Funcionalidad 2', 'Funcionalidad 3']
        );
    },

    /**
     * Generar SVG de preview del módulo (miniatura profesional)
     */
    generateModulePreviewSVG(title, color, icon, features) {
        const iconChar = this.getIconUnicode(icon);

        return `
            <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
                <defs>
                    <linearGradient id="grad-${title.replace(/\s/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${this.darkenColor(color, 20)};stop-opacity:1" />
                    </linearGradient>
                </defs>

                <!-- Background -->
                <rect width="200" height="140" fill="url(#grad-${title.replace(/\s/g, '')})" rx="8"/>

                <!-- Header simulado -->
                <rect x="10" y="10" width="180" height="25" fill="rgba(255,255,255,0.15)" rx="4"/>
                <text x="20" y="27" font-family="Arial, sans-serif" font-size="10" fill="white" font-weight="bold">${title}</text>

                <!-- Content area -->
                <rect x="10" y="40" width="180" height="90" fill="rgba(255,255,255,0.1)" rx="4"/>

                <!-- Icon grande -->
                <text x="30" y="85" font-family="Font Awesome 5 Free" font-size="28" fill="rgba(255,255,255,0.3)">${iconChar}</text>

                <!-- Mini cards simuladas -->
                <rect x="70" y="50" width="110" height="20" fill="rgba(255,255,255,0.2)" rx="3"/>
                <rect x="70" y="75" width="90" height="20" fill="rgba(255,255,255,0.15)" rx="3"/>
                <rect x="70" y="100" width="100" height="20" fill="rgba(255,255,255,0.1)" rx="3"/>

                <!-- Feature texts -->
                <text x="78" y="64" font-family="Arial, sans-serif" font-size="8" fill="white">${features[0] || ''}</text>
                <text x="78" y="89" font-family="Arial, sans-serif" font-size="8" fill="rgba(255,255,255,0.8)">${features[1] || ''}</text>
                <text x="78" y="114" font-family="Arial, sans-serif" font-size="8" fill="rgba(255,255,255,0.6)">${features[2] || ''}</text>
            </svg>
        `;
    },

    getIconUnicode(iconClass) {
        // Mapeo simplificado de iconos FA a unicode
        const iconMap = {
            'fa-shield-alt': '\uf3ed',
            'fa-users': '\uf0c0',
            'fa-fingerprint': '\uf577',
            'fa-calendar-alt': '\uf073',
            'fa-sitemap': '\uf0e8',
            'fa-umbrella-beach': '\uf5ca',
            'fa-notes-medical': '\uf481',
            'fa-clock': '\uf017',
            'fa-gavel': '\uf0e3',
            'fa-money-bill-wave': '\uf53a',
            'fa-tablet-alt': '\uf3fa',
            'fa-chart-bar': '\uf080',
            'fa-bell': '\uf0f3',
            'fa-user-circle': '\uf2bd',
            'fa-heart': '\uf004',
            'fa-robot': '\uf544',
            'fa-folder-open': '\uf07c',
            'fa-piggy-bank': '\uf4d3',
            'fa-brain': '\uf5dc',
            'fa-cube': '\uf1b2'
        };
        return iconMap[iconClass] || '\uf1b2';
    },

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max((num >> 16) - amt, 0);
        const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
        const B = Math.max((num & 0x0000FF) - amt, 0);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    },

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    attachEventListeners() {
        // Form submit ya está en el HTML inline
    },

    showList() {
        this.currentView = 'list';
        this.currentMeeting = null;
        this.render();
    },

    showCreateForm() {
        this.currentView = 'create';
        this.render();
        // Agregar un asistente inicial
        setTimeout(() => this.addAttendeeField(), 100);
    },

    async showMeetingDetail(meetingId) {
        console.log('📋 [SALES-ORCH] showMeetingDetail llamado con:', meetingId);
        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}`);
            console.log('📋 [SALES-ORCH] Respuesta del servidor:', res);
            if (res?.success) {
                this.currentMeeting = res.data;
                this.currentView = 'detail';
                this.render();
            } else {
                console.error('❌ [SALES-ORCH] Error del servidor:', res?.error);
                alert('Error cargando reunión: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('❌ [SALES-ORCH] Error cargando detalle:', error);
            alert('Error cargando reunión: ' + error.message);
        }
    },

    async showPitch(meetingId) {
        try {
            // Cargar meeting detail y pitch
            const [meetingRes, pitchRes] = await Promise.all([
                this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}`),
                this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/pitch`)
            ]);

            if (meetingRes?.success) {
                this.currentMeeting = meetingRes.data;
                if (pitchRes?.success) {
                    this.currentMeeting.vendorPitch = pitchRes.data;
                }
                this.currentView = 'pitch';
                this.render();
            }
        } catch (error) {
            console.error('Error cargando pitch:', error);
            alert('Error cargando pitch');
        }
    },

    selectIndustry(value) {
        document.querySelectorAll('.industry-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.querySelector(`.industry-option[data-value="${value}"]`)?.classList.add('selected');
        document.getElementById('industry-input').value = value;
    },

    attendeeCounter: 0,

    addAttendeeField() {
        const container = document.getElementById('attendees-list');
        if (!container) return;

        this.attendeeCounter++;
        const id = this.attendeeCounter;

        const html = `
            <div class="attendee-item" id="attendee-${id}">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 10px; flex: 1;">
                    <input type="text" name="attendees[${id}][fullName]" class="form-input" placeholder="Nombre completo *" required>
                    <input type="email" name="attendees[${id}][email]" class="form-input" placeholder="Email *" required>
                    <input type="text" name="attendees[${id}][jobTitle]" class="form-input" placeholder="Cargo">
                    <button type="button" class="btn-remove" onclick="SalesOrchestrationDashboard.removeAttendee(${id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    },

    removeAttendee(id) {
        document.getElementById(`attendee-${id}`)?.remove();
    },

    async handleCreateMeeting(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        // Construir objeto de datos
        const data = {
            prospectCompanyName: formData.get('prospectCompanyName'),
            prospectCompanyType: formData.get('prospectCompanyType'),
            prospectCountry: formData.get('prospectCountry'),
            prospectProvince: formData.get('prospectProvince'),
            prospectCity: formData.get('prospectCity'),
            prospectEmployeeCount: parseInt(formData.get('prospectEmployeeCount')) || null,
            prospectPhone: formData.get('prospectPhone'),
            prospectEmail: formData.get('prospectEmail'),
            meetingDate: formData.get('meetingDate'),
            meetingTime: formData.get('meetingTime'),
            meetingDurationMinutes: parseInt(formData.get('meetingDurationMinutes')),
            meetingPlatform: formData.get('meetingPlatform'),
            meetingLocation: formData.get('meetingLocation'),
            assignedVendorId: formData.get('assignedVendorId') || this.vendors[0]?.staff_id,
            sendReminder24h: formData.get('sendReminder24h') === 'on',
            attendees: []
        };

        // Extraer asistentes
        const attendeeItems = document.querySelectorAll('.attendee-item');
        attendeeItems.forEach(item => {
            const inputs = item.querySelectorAll('input');
            if (inputs[0]?.value && inputs[1]?.value) {
                data.attendees.push({
                    fullName: inputs[0].value,
                    email: inputs[1].value,
                    jobTitle: inputs[2]?.value || ''
                });
            }
        });

        if (data.attendees.length === 0) {
            alert('Debe agregar al menos un asistente');
            return;
        }

        try {
            const res = await this.fetchAPI('/api/sales-orchestration/meetings', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (res?.success) {
                alert('Reunión creada exitosamente');
                await this.loadInitialData();
                this.showList();
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error creando reunión:', error);
            alert('Error creando reunión');
        }
    },

    async startMeeting(meetingId) {
        if (!confirm('¿Iniciar la reunión? Se enviará mensaje de bienvenida a los participantes.')) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/start`, {
                method: 'POST'
            });

            if (res?.success) {
                alert('Reunión iniciada. Mensaje de bienvenida enviado.');
                await this.loadInitialData();
                this.showList();
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error iniciando reunión:', error);
            alert('Error iniciando reunión');
        }
    },

    // =========================================================================
    // API HELPER
    // =========================================================================

    async fetchAPI(url, options = {}) {
        const token = window.getMultiKeyToken();

        if (!token) {
            console.error('❌ [SALES-ORCH] No se encontró token de autenticación');
            return { success: false, error: 'No autenticado' };
        }

        try {
            console.log(`📡 [SALES-ORCH] Fetching: ${url}`);
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                ...options
            });

            console.log(`📨 [SALES-ORCH] Response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ [SALES-ORCH] HTTP Error ${response.status}:`, errorText);
                return { success: false, error: `Error HTTP ${response.status}: ${errorText}` };
            }

            const data = await response.json();
            console.log(`✅ [SALES-ORCH] Response data:`, data);
            return data;
        } catch (error) {
            console.error('❌ [SALES-ORCH] Fetch error:', error);
            return { success: false, error: error.message };
        }
    },

    // =========================================================================
    // DETAIL VIEW (completo con todas las acciones)
    // =========================================================================

    renderMeetingDetail() {
        if (!this.currentMeeting) {
            return this.renderLoading();
        }

        const m = this.currentMeeting;
        const attendees = m.attendees || [];
        const completedSurveys = attendees.filter(a => a.survey_completed_at).length;
        const totalAttendees = attendees.length;
        const vendor = m.vendor || {};

        const statusLabels = {
            draft: 'Borrador',
            scheduled: 'Agendada',
            survey_sent: 'Encuesta Enviada',
            survey_completed: 'Encuestas Completas',
            pitch_ready: 'Pitch Listo',
            in_progress: 'En Progreso',
            completed: 'Completada',
            feedback_pending: 'Pendiente Feedback',
            closed: 'Cerrada',
            cancelled: 'Cancelada'
        };

        // Determinar si el usuario puede eliminar (solo gerentes - simular con check de rol)
        const canDelete = true; // TODO: Verificar rol real del usuario

        return `
            <div class="sales-orch-header">
                <div>
                    <h1 class="sales-orch-title">${m.prospect_company_name}</h1>
                    <p class="sales-orch-subtitle">
                        <span class="meeting-status status-${m.status}" style="display: inline-block;">
                            ${statusLabels[m.status] || m.status}
                        </span>
                        ${m.rescheduled_at ? `
                            <span style="margin-left: 10px; color: #f59e0b; font-size: 12px;">
                                <i class="fas fa-clock"></i> Reprogramada
                            </span>
                        ` : ''}
                    </p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-outline" onclick="SalesOrchestrationDashboard.showList()">
                        <i class="fas fa-arrow-left"></i> Volver
                    </button>
                </div>
            </div>

            <!-- Barra de estado de encuestas -->
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="color: rgba(255,255,255,0.7);">Estado de Encuestas</span>
                    <span style="color: ${completedSurveys === totalAttendees ? '#22c55e' : '#f59e0b'}; font-weight: 600;">
                        ${completedSurveys}/${totalAttendees} completadas
                    </span>
                </div>
                <div style="background: rgba(255,255,255,0.1); border-radius: 10px; height: 10px; overflow: hidden;">
                    <div style="width: ${totalAttendees > 0 ? (completedSurveys/totalAttendees)*100 : 0}%; height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); transition: width 0.3s;"></div>
                </div>
                ${completedSurveys > 0 && m.status !== 'pitch_ready' && m.status !== 'in_progress' ? `
                    <div style="margin-top: 10px; text-align: center;">
                        <span style="color: #8b5cf6; font-size: 13px;">
                            <i class="fas fa-magic"></i> El pitch está disponible con las ${completedSurveys} respuesta(s) recibida(s)
                        </span>
                    </div>
                ` : ''}
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
                <!-- Info principal -->
                <div>
                    <!-- Datos de la reunión -->
                    <div class="pitch-section" style="background: rgba(255,255,255,0.03); border-radius: 16px; padding: 25px; margin-bottom: 20px;">
                        <h3 class="pitch-section-title">
                            <i class="fas fa-calendar-alt" style="color: #3b82f6;"></i>
                            Datos de la Reunión
                            <button class="btn-outline" style="margin-left: auto; padding: 6px 12px; font-size: 12px;"
                                    onclick="SalesOrchestrationDashboard.showRescheduleModal('${m.id}')">
                                <i class="fas fa-edit"></i> Reprogramar
                            </button>
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 15px;">
                            <div style="background: rgba(59,130,246,0.1); padding: 15px; border-radius: 10px; text-align: center;">
                                <div style="font-size: 24px; margin-bottom: 5px;"><i class="far fa-calendar" style="color: #3b82f6;"></i></div>
                                <div style="font-size: 18px; font-weight: 600; color: white;">${new Date(m.meeting_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</div>
                                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">Fecha</div>
                            </div>
                            <div style="background: rgba(139,92,246,0.1); padding: 15px; border-radius: 10px; text-align: center;">
                                <div style="font-size: 24px; margin-bottom: 5px;"><i class="far fa-clock" style="color: #8b5cf6;"></i></div>
                                <div style="font-size: 18px; font-weight: 600; color: white;">${m.meeting_time?.slice(0, 5) || '--:--'}</div>
                                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">Hora</div>
                            </div>
                            <div style="background: rgba(34,197,94,0.1); padding: 15px; border-radius: 10px; text-align: center;">
                                <div style="font-size: 24px; margin-bottom: 5px;"><i class="fas fa-hourglass-half" style="color: #22c55e;"></i></div>
                                <div style="font-size: 18px; font-weight: 600; color: white;">${m.meeting_duration_minutes || 60} min</div>
                                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">Duración</div>
                            </div>
                        </div>
                        <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.7);">
                                <i class="fas fa-map-marker-alt" style="color: #f59e0b;"></i>
                                <span><strong>Lugar:</strong> ${m.meeting_location || m.meeting_platform || 'No especificado'}</span>
                            </div>
                            ${m.meeting_link ? `
                                <div style="display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.7); margin-top: 10px;">
                                    <i class="fas fa-link" style="color: #3b82f6;"></i>
                                    <a href="${m.meeting_link}" target="_blank" style="color: #3b82f6;">${m.meeting_link}</a>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Asistentes con gestión -->
                    <div class="pitch-section" style="background: rgba(255,255,255,0.03); border-radius: 16px; padding: 25px;">
                        <h3 class="pitch-section-title">
                            <i class="fas fa-users" style="color: #ec4899;"></i>
                            Participantes (${totalAttendees})
                            <button class="btn-outline" style="margin-left: auto; padding: 6px 12px; font-size: 12px;"
                                    onclick="SalesOrchestrationDashboard.showAddAttendeeModal('${m.id}')">
                                <i class="fas fa-user-plus"></i> Agregar
                            </button>
                        </h3>
                        <div class="attendees-list" style="margin-top: 15px;">
                            ${attendees.map(a => `
                                <div class="attendee-item" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);">
                                    <div class="attendee-info">
                                        <div class="attendee-avatar" style="background: ${a.survey_completed_at ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #6b7280, #4b5563)'};">
                                            ${a.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div style="flex: 1;">
                                            <div class="attendee-name">
                                                ${a.full_name}
                                                ${a.is_decision_maker ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-left: 8px;">Decision Maker</span>' : ''}
                                            </div>
                                            <div class="attendee-role">${a.email}</div>
                                            ${a.job_title ? `<div style="font-size: 11px; color: rgba(255,255,255,0.4);">${a.job_title}</div>` : ''}
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        ${a.survey_completed_at ? `
                                            <span style="color: #22c55e; font-size: 13px;"><i class="fas fa-check-circle"></i> Completada</span>
                                        ` : `
                                            <span style="color: #f59e0b; font-size: 13px;"><i class="fas fa-clock"></i> Pendiente</span>
                                        `}
                                        <button class="btn-outline" style="padding: 6px 10px; font-size: 11px;"
                                                onclick="SalesOrchestrationDashboard.showEditAttendeeModal('${a.id}', '${m.id}')"
                                                title="Editar participante">
                                            <i class="fas fa-pen"></i>
                                        </button>
                                        <button class="btn-remove" onclick="SalesOrchestrationDashboard.removeAttendeeFromMeeting('${a.id}', '${m.id}')" title="Quitar participante">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                            ${attendees.length === 0 ? `
                                <div style="text-align: center; color: rgba(255,255,255,0.4); padding: 30px;">
                                    <i class="fas fa-user-slash" style="font-size: 32px; margin-bottom: 10px;"></i>
                                    <p>No hay participantes. Agrega al menos uno.</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Panel lateral de acciones -->
                <div>
                    <!-- Vendedor asignado -->
                    <div class="pitch-section" style="background: rgba(255,255,255,0.03); border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                        <h4 style="color: rgba(255,255,255,0.6); font-size: 12px; text-transform: uppercase; margin: 0 0 15px 0;">Vendedor Asignado</h4>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                                ${(vendor.full_name || 'V').charAt(0)}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: white;">${vendor.full_name || 'No asignado'}</div>
                                ${vendor.email ? `<div style="font-size: 12px; color: rgba(255,255,255,0.5);">${vendor.email}</div>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Acciones principales -->
                    <div class="pitch-section" style="background: rgba(255,255,255,0.03); border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                        <h4 style="color: rgba(255,255,255,0.6); font-size: 12px; text-transform: uppercase; margin: 0 0 15px 0;">
                            <i class="fas fa-bolt" style="color: #f59e0b;"></i> Acciones
                        </h4>

                        ${m.status === 'draft' || m.status === 'scheduled' ? `
                            ${m.meeting_type === 'demo_only' ? `
                                <button class="btn-primary-gradient" style="width: 100%; margin-bottom: 10px; background: linear-gradient(135deg, #f59e0b, #d97706);"
                                        onclick="SalesOrchestrationDashboard.sendDemoAccess('${m.id}')">
                                    <i class="fas fa-play-circle"></i> Enviar Acceso DEMO
                                </button>
                            ` : `
                                <button class="btn-primary-gradient" style="width: 100%; margin-bottom: 10px;"
                                        onclick="SalesOrchestrationDashboard.confirmMeeting('${m.id}')">
                                    <i class="fas fa-paper-plane"></i> Confirmar y Enviar Encuesta
                                </button>
                            `}
                        ` : ''}

                        ${m.meeting_type === 'demo_only' && m.status === 'demo_sent' ? `
                            <div style="background: rgba(34,197,94,0.1); border: 1px solid #22c55e; border-radius: 10px; padding: 15px; text-align: center; margin-bottom: 10px;">
                                <i class="fas fa-check-circle" style="color: #22c55e; font-size: 24px;"></i>
                                <p style="color: #22c55e; margin: 10px 0 0 0; font-size: 14px;">
                                    Acceso DEMO enviado correctamente
                                </p>
                            </div>
                            <button class="btn-outline" style="width: 100%; margin-bottom: 10px;"
                                    onclick="SalesOrchestrationDashboard.sendDemoAccess('${m.id}')">
                                <i class="fas fa-redo"></i> Reenviar Acceso DEMO
                            </button>
                        ` : ''}

                        ${m.status === 'survey_sent' || (completedSurveys > 0 && completedSurveys < totalAttendees) ? `
                            <button class="btn-outline" style="width: 100%; margin-bottom: 10px;"
                                    onclick="SalesOrchestrationDashboard.resendSurveys('${m.id}')">
                                <i class="fas fa-redo"></i> Reenviar Pendientes
                            </button>
                        ` : ''}

                        ${completedSurveys > 0 ? `
                            <button class="btn-primary-gradient" style="width: 100%; margin-bottom: 10px;"
                                    onclick="SalesOrchestrationDashboard.showPitch('${m.id}')">
                                <i class="fas fa-eye"></i> Ver Pitch (${completedSurveys} respuestas)
                            </button>
                        ` : ''}

                        ${m.status === 'pitch_ready' ? `
                            <button class="btn-outline" style="width: 100%; margin-bottom: 10px; border-color: #22c55e; color: #22c55e;"
                                    onclick="SalesOrchestrationDashboard.startMeeting('${m.id}')">
                                <i class="fas fa-play"></i> Iniciar Reunión
                            </button>
                        ` : ''}

                        ${m.status === 'in_progress' ? `
                            <button class="btn-primary-gradient" style="width: 100%; margin-bottom: 10px; background: linear-gradient(135deg, #22c55e, #16a34a);"
                                    onclick="SalesOrchestrationDashboard.endMeeting('${m.id}')">
                                <i class="fas fa-flag-checkered"></i> Finalizar Reunión
                            </button>
                        ` : ''}

                        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 15px 0;">

                        <!-- Acciones secundarias -->
                        <button class="btn-outline" style="width: 100%; margin-bottom: 10px; border-color: #f59e0b; color: #f59e0b;"
                                onclick="SalesOrchestrationDashboard.showRescheduleModal('${m.id}')">
                            <i class="fas fa-calendar-alt"></i> Reprogramar
                        </button>

                        ${m.status !== 'cancelled' && m.status !== 'completed' ? `
                            <button class="btn-outline" style="width: 100%; margin-bottom: 10px; border-color: #ef4444; color: #ef4444;"
                                    onclick="SalesOrchestrationDashboard.cancelMeeting('${m.id}')">
                                <i class="fas fa-ban"></i> Cancelar Reunión
                            </button>
                        ` : ''}

                        ${canDelete ? `
                            <button class="btn-outline" style="width: 100%; border-color: #dc2626; color: #dc2626;"
                                    onclick="SalesOrchestrationDashboard.deleteMeeting('${m.id}')">
                                <i class="fas fa-trash"></i> Eliminar (Gerente)
                            </button>
                        ` : ''}
                    </div>

                    <!-- Info adicional -->
                    <div style="background: rgba(255,255,255,0.02); border-radius: 12px; padding: 15px; font-size: 12px; color: rgba(255,255,255,0.4);">
                        <div><i class="fas fa-industry"></i> ${m.prospect_company_type || 'Sin rubro'}</div>
                        <div style="margin-top: 5px;"><i class="fas fa-users"></i> ${m.prospect_employee_count || '?'} empleados</div>
                        <div style="margin-top: 5px;"><i class="fas fa-map-marker-alt"></i> ${m.prospect_city || ''}, ${m.prospect_province || ''}</div>
                        <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                            <div>Creada: ${new Date(m.created_at).toLocaleDateString('es-AR')}</div>
                            ${m.updated_at !== m.created_at ? `<div>Actualizada: ${new Date(m.updated_at).toLocaleDateString('es-AR')}</div>` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal de reprogramación (hidden) -->
            <div id="reschedule-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center;">
                <div style="background: #1a1a2e; border-radius: 20px; padding: 30px; max-width: 500px; width: 90%;">
                    <h3 style="color: white; margin: 0 0 20px 0;"><i class="fas fa-calendar-alt" style="color: #f59e0b;"></i> Reprogramar Reunión</h3>
                    <form id="reschedule-form" onsubmit="SalesOrchestrationDashboard.handleReschedule(event, '${m.id}')">
                        <div class="form-group">
                            <label class="form-label">Nueva Fecha</label>
                            <input type="date" name="meetingDate" class="form-input" value="${m.meeting_date?.split('T')[0] || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Nueva Hora</label>
                            <input type="time" name="meetingTime" class="form-input" value="${m.meeting_time?.slice(0,5) || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Lugar / Link</label>
                            <input type="text" name="meetingLocation" class="form-input" value="${m.meeting_location || ''}" placeholder="Dirección o link de videollamada">
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                            <button type="button" class="btn-outline" onclick="SalesOrchestrationDashboard.hideRescheduleModal()">Cancelar</button>
                            <button type="submit" class="btn-primary-gradient"><i class="fas fa-save"></i> Guardar y Notificar</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal de agregar asistente (hidden) -->
            <div id="add-attendee-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center;">
                <div style="background: #1a1a2e; border-radius: 20px; padding: 30px; max-width: 500px; width: 90%;">
                    <h3 style="color: white; margin: 0 0 20px 0;"><i class="fas fa-user-plus" style="color: #22c55e;"></i> Agregar Participante</h3>
                    <form id="add-attendee-form" onsubmit="SalesOrchestrationDashboard.handleAddAttendee(event, '${m.id}')">
                        <div class="form-group">
                            <label class="form-label">Nombre Completo *</label>
                            <input type="text" name="fullName" class="form-input" required placeholder="Ej: Juan Pérez">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email *</label>
                            <input type="email" name="email" class="form-input" required placeholder="juan@empresa.com">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Cargo</label>
                                <input type="text" name="jobTitle" class="form-input" placeholder="Ej: Gerente de RRHH">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Teléfono</label>
                                <input type="tel" name="phone" class="form-input" placeholder="+54...">
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" name="isDecisionMaker" style="width: 18px; height: 18px;">
                                <span class="form-label" style="margin: 0;">Es Decision Maker</span>
                            </label>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                            <button type="button" class="btn-outline" onclick="SalesOrchestrationDashboard.hideAddAttendeeModal()">Cancelar</button>
                            <button type="submit" class="btn-primary-gradient"><i class="fas fa-plus"></i> Agregar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    async confirmMeeting(meetingId) {
        if (!confirm('¿Confirmar reunión y enviar encuesta a los asistentes?')) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/confirm`, {
                method: 'POST'
            });

            if (res?.success) {
                alert(`Encuesta enviada a ${res.emailsSent} asistentes`);
                await this.showMeetingDetail(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error confirmando:', error);
            alert('Error confirmando reunión');
        }
    },

    async endMeeting(meetingId) {
        if (!confirm('¿Finalizar la reunión?')) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/end`, {
                method: 'POST'
            });

            if (res?.success) {
                alert('Reunión finalizada. Recuerde cargar el feedback dentro de 24h.');
                await this.loadInitialData();
                this.showList();
            }
        } catch (error) {
            console.error('Error finalizando:', error);
            alert('Error finalizando reunión');
        }
    },

    async resendSurveys(meetingId, toAll = false) {
        const confirmMsg = toAll
            ? '¿Reenviar encuestas a TODOS los asistentes?'
            : '¿Reenviar encuestas a asistentes que no han respondido?';

        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/resend-survey`, {
                method: 'POST',
                body: JSON.stringify({ toAll })
            });

            if (res?.success) {
                alert(res.message);
                // Refrescar datos y vista
                await this.loadInitialData();
                await this.showMeetingDetail(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error reenviando encuestas:', error);
            alert('Error reenviando encuestas: ' + error.message);
        }
    },

    /**
     * Enviar pitch a un asistente específico
     */
    async sendPitchToAttendee(meetingId, attendeeId) {
        if (!confirm('¿Enviar pitch personalizado a este participante?')) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/send-pitch`, {
                method: 'POST',
                body: JSON.stringify({ attendeeId })
            });

            if (res?.success) {
                alert(`✅ Pitch enviado a ${res.attendeeName || 'participante'}`);
                await this.showPitch(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error enviando pitch:', error);
            alert('Error enviando pitch: ' + error.message);
        }
    },

    /**
     * Enviar pitch a todos los asistentes que completaron encuesta
     */
    async sendPitchToAll(meetingId) {
        if (!confirm('¿Enviar pitch personalizado a TODOS los participantes que completaron la encuesta?')) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/send-pitch`, {
                method: 'POST',
                body: JSON.stringify({ toAll: true })
            });

            if (res?.success) {
                alert(`✅ Pitch enviado a ${res.sentCount || 0} participantes`);
                await this.showPitch(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error enviando pitches:', error);
            alert('Error enviando pitches: ' + error.message);
        }
    },

    async generatePitch(meetingId) {
        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/generate-pitch`, {
                method: 'POST'
            });

            if (res?.success) {
                alert('Pitch generado exitosamente');
                await this.showPitch(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error generando pitch:', error);
            alert('Error generando pitch');
        }
    },

    // =========================================================================
    // SELECCIÓN DE TIPO DE REUNIÓN
    // =========================================================================

    selectMeetingType(type) {
        // Actualizar input hidden
        const input = document.getElementById('meeting-type-input');
        if (input) input.value = type;

        // Actualizar visual de opciones
        document.querySelectorAll('.meeting-type-option').forEach(opt => {
            const isSelected = opt.dataset.type === type;
            opt.style.background = isSelected ? 'rgba(102, 126, 234, 0.1)' : 'rgba(255,255,255,0.03)';
            opt.style.borderColor = isSelected ? '#667eea' : 'rgba(255,255,255,0.1)';
            opt.classList.toggle('selected', isSelected);
        });

        // Mostrar/ocultar secciones según tipo
        const demoInfo = document.getElementById('demo-only-info');
        const datetimeSection = document.getElementById('meeting-datetime-section');
        const presencialOptions = document.getElementById('presencial-options');
        const virtualOptions = document.getElementById('virtual-options');

        // Resetear displays
        if (demoInfo) demoInfo.style.display = 'none';
        if (datetimeSection) datetimeSection.style.display = 'block';
        if (presencialOptions) presencialOptions.style.display = 'none';
        if (virtualOptions) virtualOptions.style.display = 'none';

        // Actualizar required de campos
        const dateInput = document.querySelector('input[name="meetingDate"]');
        const timeInput = document.querySelector('input[name="meetingTime"]');

        switch (type) {
            case 'presencial':
                if (presencialOptions) presencialOptions.style.display = 'block';
                if (dateInput) dateInput.required = true;
                if (timeInput) timeInput.required = true;
                break;
            case 'virtual':
                if (virtualOptions) virtualOptions.style.display = 'block';
                if (dateInput) dateInput.required = true;
                if (timeInput) timeInput.required = true;
                break;
            case 'demo_only':
                if (demoInfo) demoInfo.style.display = 'block';
                if (datetimeSection) datetimeSection.style.display = 'none';
                if (dateInput) dateInput.required = false;
                if (timeInput) timeInput.required = false;
                break;
        }
    },

    onPlatformChange(platform) {
        const linkInput = document.querySelector('input[name="meetingLink"]');
        if (!linkInput) return;

        switch (platform) {
            case 'Google Meet':
                linkInput.placeholder = 'https://meet.google.com/xxx-xxxx-xxx';
                break;
            case 'Zoom':
                linkInput.placeholder = 'https://zoom.us/j/xxxxxxxxx';
                break;
            case 'Microsoft Teams':
                linkInput.placeholder = 'https://teams.microsoft.com/l/meetup-join/...';
                break;
            default:
                linkInput.placeholder = 'URL de la videollamada';
        }
    },

    // =========================================================================
    // MODALES Y ACCIONES DE GESTIÓN
    // =========================================================================

    showRescheduleModal(meetingId) {
        const modal = document.getElementById('reschedule-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    hideRescheduleModal() {
        const modal = document.getElementById('reschedule-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    async handleReschedule(event, meetingId) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        const data = {
            meetingDate: formData.get('meetingDate'),
            meetingTime: formData.get('meetingTime'),
            meetingLocation: formData.get('meetingLocation')
        };

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/reschedule`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (res?.success) {
                this.hideRescheduleModal();
                alert(res.message || 'Reunión reprogramada. Notificaciones enviadas.');
                await this.showMeetingDetail(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error reprogramando:', error);
            alert('Error reprogramando: ' + error.message);
        }
    },

    showAddAttendeeModal(meetingId) {
        const modal = document.getElementById('add-attendee-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    hideAddAttendeeModal() {
        const modal = document.getElementById('add-attendee-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    async handleAddAttendee(event, meetingId) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            jobTitle: formData.get('jobTitle'),
            phone: formData.get('phone'),
            isDecisionMaker: formData.get('isDecisionMaker') === 'on'
        };

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/attendees`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (res?.success) {
                this.hideAddAttendeeModal();
                alert('Participante agregado exitosamente');
                await this.showMeetingDetail(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error agregando participante:', error);
            alert('Error: ' + error.message);
        }
    },

    showEditAttendeeModal(attendeeId, meetingId) {
        // Por simplicidad, usar prompt para edición rápida
        const attendee = this.currentMeeting?.attendees?.find(a => a.id === attendeeId);
        if (!attendee) return;

        const newName = prompt('Nombre completo:', attendee.full_name);
        if (newName === null) return;

        const newEmail = prompt('Email:', attendee.email);
        if (newEmail === null) return;

        const newJobTitle = prompt('Cargo:', attendee.job_title || '');
        if (newJobTitle === null) return;

        this.updateAttendee(attendeeId, meetingId, {
            fullName: newName,
            email: newEmail,
            jobTitle: newJobTitle
        });
    },

    async updateAttendee(attendeeId, meetingId, data) {
        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/attendees/${attendeeId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            if (res?.success) {
                alert('Participante actualizado');
                await this.showMeetingDetail(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error actualizando:', error);
            alert('Error: ' + error.message);
        }
    },

    async removeAttendeeFromMeeting(attendeeId, meetingId) {
        if (!confirm('¿Eliminar este participante de la reunión?')) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/attendees/${attendeeId}`, {
                method: 'DELETE'
            });

            if (res?.success) {
                alert('Participante eliminado');
                await this.showMeetingDetail(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error eliminando:', error);
            alert('Error: ' + error.message);
        }
    },

    async cancelMeeting(meetingId) {
        const reason = prompt('Motivo de cancelación (opcional):');
        if (reason === null) return; // Canceló el prompt

        if (!confirm('¿Cancelar esta reunión? Se notificará a los participantes.')) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'cancelled',
                    cancellation_reason: reason
                })
            });

            if (res?.success) {
                alert('Reunión cancelada');
                await this.loadInitialData();
                this.showList();
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error cancelando:', error);
            alert('Error: ' + error.message);
        }
    },

    async deleteMeeting(meetingId) {
        if (!confirm('⚠️ ATENCIÓN: Esto eliminará permanentemente la reunión y todos sus datos.\n\n¿Está seguro?')) {
            return;
        }

        if (!confirm('Esta acción NO se puede deshacer. ¿Confirmar eliminación?')) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}`, {
                method: 'DELETE'
            });

            if (res?.success) {
                alert('Reunión eliminada permanentemente');
                await this.loadInitialData();
                this.showList();
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error eliminando:', error);
            alert('Error: ' + error.message);
        }
    },

    /**
     * Enviar acceso a DEMO a los participantes
     */
    async sendDemoAccess(meetingId) {
        if (!confirm('¿Enviar acceso a la DEMO a todos los participantes?')) {
            return;
        }

        try {
            const res = await this.fetchAPI(`/api/sales-orchestration/meetings/${meetingId}/send-demo-access`, {
                method: 'POST'
            });

            if (res?.success) {
                alert(`✅ Acceso DEMO enviado a ${res.sentCount || 0} participante(s)`);
                await this.showMeetingDetail(meetingId);
            } else {
                alert('Error: ' + (res?.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error enviando acceso DEMO:', error);
            alert('Error: ' + error.message);
        }
    }
};

// NO auto-inicializar - se inicializa desde vendor-dashboard.js cuando el usuario selecciona el tab
// El container no existe hasta que vendor-dashboard renderiza

// Exportar para uso desde vendor-dashboard
window.SalesOrchestrationDashboard = SalesOrchestrationDashboard;
