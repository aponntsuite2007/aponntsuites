/**
 * ============================================================================
 * INBOX - BANDEJA DE NOTIFICACIONES DARK THEME + NUEVA NOTIFICACIÓN
 * ============================================================================
 * Sistema de notificaciones del empleado con categorías:
 * - Llegada tarde → RRHH
 * - Inasistencia → RRHH
 * - Enfermedad → Dashboard Médico + RRHH + Médico asignado
 * - Fuerza Mayor → RRHH
 *
 * Integración con Dashboard Médico para casos de enfermedad.
 * FUENTE ÚNICA DE VERDAD para APK médico y flujo médico.
 *
 * @version 3.0 - Dark Theme + Self-Service Notifications
 * @date 2025-12-07
 * ============================================================================
 */

const InboxModule = {
    currentGroupId: null,
    notifications: [],
    filters: {
        status: 'all',
        priority: 'all',
        groupType: 'all',
        search: ''
    },
    stats: {},
    stylesInjected: false,
    companyHasMedicalModule: false,

    // Categorías de notificación del empleado
    EMPLOYEE_NOTIFICATION_CATEGORIES: {
        late_arrival: {
            id: 'late_arrival',
            icon: '🕐',
            faIcon: 'fas fa-clock',
            label: 'Llegada Tarde',
            color: '#f39c12',
            target: 'rrhh',
            requiresDate: true,
            requiresTime: true,
            requiresReason: true
        },
        absence: {
            id: 'absence',
            icon: '📅',
            faIcon: 'fas fa-calendar-times',
            label: 'Inasistencia',
            color: '#e74c3c',
            target: 'rrhh',
            requiresDate: true,
            requiresReason: true
        },
        illness: {
            id: 'illness',
            icon: '🏥',
            faIcon: 'fas fa-hospital',
            label: 'Enfermedad',
            color: '#9b59b6',
            target: 'medical', // Si hay módulo médico, sino a RRHH
            requiresDate: true,
            requiresMedicalInfo: true,
            initiatesMedicalCase: true
        },
        force_majeure: {
            id: 'force_majeure',
            icon: '⚡',
            faIcon: 'fas fa-bolt',
            label: 'Fuerza Mayor',
            color: '#3498db',
            target: 'rrhh',
            requiresDate: true,
            requiresReason: true,
            requiresEvidence: true
        },
        permission_request: {
            id: 'permission_request',
            icon: '🙋',
            faIcon: 'fas fa-hand-paper',
            label: 'Solicitud de Permiso',
            color: '#1abc9c',
            target: 'rrhh',
            requiresDate: true,
            requiresReason: true
        }
    },

    GROUP_TYPE_CONFIG: {
        proactive_vacation_expiry: { icon: '🏖️', label: 'Vacaciones', color: '#3498db' },
        proactive_overtime_limit: { icon: '⏰', label: 'Horas Extra', color: '#e74c3c' },
        proactive_rest_violation: { icon: '😴', label: 'Descanso', color: '#9b59b6' },
        proactive_document_expiry: { icon: '📄', label: 'Documentos', color: '#f39c12' },
        proactive_certificate_expiry: { icon: '🏥', label: 'Certificados', color: '#1abc9c' },
        proactive_consent_renewal: { icon: '🔐', label: 'Consentimientos', color: '#34495e' },
        vacation_request: { icon: '🌴', label: 'Solicitud Vacaciones', color: '#27ae60' },
        leave_request: { icon: '📝', label: 'Solicitud Licencia', color: '#2980b9' },
        overtime_request: { icon: '💼', label: 'Horas Extra', color: '#8e44ad' },
        late_arrival: { icon: '🕐', label: 'Llegada Tarde', color: '#f39c12' },
        absence: { icon: '📅', label: 'Inasistencia', color: '#e74c3c' },
        illness: { icon: '🏥', label: 'Enfermedad', color: '#9b59b6' },
        force_majeure: { icon: '⚡', label: 'Fuerza Mayor', color: '#3498db' },
        system_alert: { icon: '⚠️', label: 'Alerta Sistema', color: '#c0392b' },
        announcement: { icon: '📢', label: 'Anuncio', color: '#16a085' },
        default: { icon: '🔔', label: 'Notificación', color: '#95a5a6' }
    },

    PRIORITY_CONFIG: {
        critical: { icon: '🔴', label: 'Crítica', class: 'priority-critical' },
        high: { icon: '🟠', label: 'Alta', class: 'priority-high' },
        medium: { icon: '🟡', label: 'Media', class: 'priority-medium' },
        normal: { icon: '🟢', label: 'Normal', class: 'priority-normal' },
        low: { icon: '⚪', label: 'Baja', class: 'priority-low' }
    },

    init() {
        console.log('📬 [INBOX] Inicializando módulo Bandeja de Notificaciones v3.0 Dark Theme');
        this.injectStyles();
        this.checkMedicalModule();
        this.loadStats();
        this.loadInbox();
        if (typeof InboxAIIndicator !== 'undefined') {
            InboxAIIndicator.init();
        }
    },

    async checkMedicalModule() {
        try {
            const companyModules = window.companyModules || [];
            this.companyHasMedicalModule = companyModules.some(m =>
                m.module_key === 'medical-dashboard' ||
                m.module_key === 'medical' ||
                m.module_key === 'occupational-health'
            );
            console.log('🏥 [INBOX] Módulo médico disponible:', this.companyHasMedicalModule);
        } catch (e) {
            console.log('⚠️ [INBOX] No se pudo verificar módulo médico');
            this.companyHasMedicalModule = false;
        }
    },

    injectStyles() {
        if (this.stylesInjected) return;
        if (document.getElementById('inbox-module-styles')) {
            this.stylesInjected = true;
            return;
        }

        const style = document.createElement('style');
        style.id = 'inbox-module-styles';
        style.textContent = `
            /* ========== DARK THEME BASE ========== */
            .inbox-module {
                min-height: 100vh;
                background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
                color: #e0e0e0;
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                padding: 25px;
            }

            /* ========== HEADER ========== */
            .inbox-header {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin-bottom: 25px;
                padding: 25px;
                background: rgba(15, 15, 30, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
            }

            .inbox-header-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 15px;
            }

            .inbox-title h2 {
                margin: 0;
                font-size: 1.8rem;
                background: linear-gradient(135deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .inbox-subtitle {
                color: rgba(255, 255, 255, 0.6);
                font-size: 0.9rem;
            }

            .inbox-header-actions {
                display: flex;
                gap: 12px;
            }

            .btn-new-notification {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            }

            .btn-new-notification:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }

            /* ========== STATS BAR ========== */
            .inbox-stats-bar {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }

            .stat-card {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                padding: 15px 25px;
                border-radius: 12px;
                text-align: center;
                min-width: 100px;
            }

            .stat-card.unread {
                background: rgba(231, 76, 60, 0.2);
                border-color: rgba(231, 76, 60, 0.4);
            }
            .stat-card.pending {
                background: rgba(241, 196, 15, 0.2);
                border-color: rgba(241, 196, 15, 0.4);
            }
            .stat-card.overdue {
                background: rgba(192, 57, 43, 0.2);
                border-color: rgba(192, 57, 43, 0.4);
            }

            .stat-number {
                display: block;
                font-size: 1.8rem;
                font-weight: 700;
                color: #667eea;
            }

            .stat-label {
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.5);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* ========== FILTERS ========== */
            .inbox-filters {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                padding: 20px;
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                flex-wrap: wrap;
                align-items: flex-end;
            }

            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .filter-group label {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.6);
                font-weight: 500;
            }

            .filter-group select,
            .filter-group input {
                padding: 10px 14px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 8px;
                font-size: 14px;
                color: #e0e0e0;
                min-width: 150px;
            }

            .filter-group select:focus,
            .filter-group input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 10px rgba(102, 126, 234, 0.2);
            }

            .filter-group input {
                min-width: 250px;
            }

            .filter-group select option {
                background: #1a1a2e;
                color: #e0e0e0;
            }

            .btn-refresh {
                padding: 12px 20px;
                background: rgba(102, 126, 234, 0.2);
                border: 1px solid rgba(102, 126, 234, 0.4);
                color: #667eea;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s;
            }

            .btn-refresh:hover {
                background: rgba(102, 126, 234, 0.3);
                transform: translateY(-1px);
            }

            /* ========== CONTENT GRID ========== */
            .inbox-content {
                display: grid;
                grid-template-columns: 420px 1fr;
                gap: 20px;
                min-height: 500px;
            }

            .inbox-list {
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                overflow-y: auto;
                max-height: 70vh;
            }

            .inbox-detail {
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 25px;
                overflow-y: auto;
            }

            /* ========== EMPTY STATE ========== */
            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: rgba(255, 255, 255, 0.5);
                text-align: center;
                padding: 40px;
            }

            .empty-icon {
                font-size: 4rem;
                margin-bottom: 20px;
            }

            .empty-state h3 {
                color: #e0e0e0;
                margin: 0 0 10px;
            }

            /* ========== GROUP ITEMS ========== */
            .group-item {
                padding: 18px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                gap: 15px;
            }

            .group-item:hover {
                background: rgba(255, 255, 255, 0.03);
            }

            .group-item.unread {
                background: linear-gradient(90deg, rgba(243, 156, 18, 0.1) 0%, transparent 100%);
                border-left: 4px solid #f39c12;
            }

            .group-item.active {
                background: linear-gradient(90deg, rgba(102, 126, 234, 0.15) 0%, transparent 100%);
                border-left: 4px solid #667eea;
            }

            .group-icon {
                width: 50px;
                height: 50px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.6rem;
                flex-shrink: 0;
                background: rgba(255, 255, 255, 0.05);
            }

            .group-content {
                flex: 1;
                min-width: 0;
            }

            .group-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 6px;
            }

            .group-title {
                font-weight: 600;
                font-size: 14px;
                color: #ffffff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 220px;
            }

            .group-time {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.4);
                white-space: nowrap;
            }

            .group-preview {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.6);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                margin-bottom: 10px;
            }

            .group-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .group-badges {
                display: flex;
                gap: 6px;
            }

            .badge {
                padding: 3px 10px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 500;
            }

            .badge-priority-critical { background: rgba(198, 40, 40, 0.3); color: #ff6b6b; }
            .badge-priority-high { background: rgba(230, 81, 0, 0.3); color: #ffa500; }
            .badge-priority-medium { background: rgba(249, 168, 37, 0.3); color: #ffd93d; }
            .badge-priority-normal { background: rgba(46, 125, 50, 0.3); color: #6bcf6b; }
            .badge-type { background: rgba(102, 126, 234, 0.2); color: #667eea; }
            .badge-unread { background: #e74c3c; color: white; }
            .badge-count { background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.6); }

            /* ========== MESSAGES ========== */
            .message-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .message-item {
                padding: 18px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 12px;
                border-left: 4px solid #667eea;
            }

            .message-item.system {
                border-left-color: #9b59b6;
                background: rgba(155, 89, 182, 0.08);
            }

            .message-item.proactive {
                border-left-color: #e74c3c;
                background: rgba(231, 76, 60, 0.08);
            }

            .message-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .message-sender {
                font-weight: 600;
                color: #667eea;
            }

            .message-time {
                font-size: 12px;
                color: rgba(255, 255, 255, 0.4);
            }

            .message-content {
                font-size: 14px;
                line-height: 1.6;
                color: #e0e0e0;
                white-space: pre-wrap;
            }

            .conversation-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                margin-bottom: 20px;
            }

            .conversation-title {
                font-size: 1.3rem;
                font-weight: 600;
                color: #ffffff;
            }

            .conversation-actions {
                display: flex;
                gap: 10px;
            }

            .btn-action {
                padding: 10px 18px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
            }

            .btn-action.primary {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
            }

            .btn-action.secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #e0e0e0;
                border: 1px solid rgba(255, 255, 255, 0.15);
            }

            .btn-action:hover {
                transform: translateY(-1px);
            }

            /* ========== MODAL NUEVA NOTIFICACIÓN ========== */
            .notification-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }

            .notification-modal {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                width: 90%;
                max-width: 700px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px 30px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .modal-header h3 {
                margin: 0;
                color: #ffffff;
                font-size: 1.4rem;
            }

            .modal-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
            }

            .modal-close:hover {
                color: #e74c3c;
            }

            .modal-body {
                padding: 30px;
            }

            /* ========== CATEGORY SELECTOR ========== */
            .category-selector {
                margin-bottom: 25px;
            }

            .category-selector label {
                display: block;
                margin-bottom: 12px;
                color: rgba(255, 255, 255, 0.8);
                font-weight: 600;
            }

            .category-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 12px;
            }

            .category-card {
                background: rgba(255, 255, 255, 0.03);
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 18px 12px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .category-card:hover {
                background: rgba(255, 255, 255, 0.08);
                transform: translateY(-3px);
            }

            .category-card.selected {
                border-color: var(--cat-color, #667eea);
                background: rgba(102, 126, 234, 0.1);
                box-shadow: 0 0 20px rgba(102, 126, 234, 0.2);
            }

            .category-card .cat-icon {
                font-size: 2rem;
                margin-bottom: 10px;
                display: block;
            }

            .category-card .cat-label {
                font-size: 0.85rem;
                font-weight: 600;
                color: #e0e0e0;
            }

            /* ========== FORM FIELDS ========== */
            .form-group {
                margin-bottom: 20px;
            }

            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: rgba(255, 255, 255, 0.8);
                font-weight: 500;
            }

            .form-group input,
            .form-group textarea,
            .form-group select {
                width: 100%;
                padding: 14px 16px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 10px;
                color: #e0e0e0;
                font-size: 14px;
                font-family: inherit;
            }

            .form-group textarea {
                min-height: 100px;
                resize: vertical;
            }

            .form-group input:focus,
            .form-group textarea:focus,
            .form-group select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 15px rgba(102, 126, 234, 0.2);
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }

            .medical-info-box {
                background: rgba(155, 89, 182, 0.1);
                border: 1px solid rgba(155, 89, 182, 0.3);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
            }

            .medical-info-box h4 {
                margin: 0 0 10px;
                color: #9b59b6;
                font-size: 14px;
            }

            .medical-info-box p {
                margin: 0;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.7);
            }

            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                padding: 25px 30px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .btn-submit {
                padding: 14px 30px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-submit:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }

            .btn-submit:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }

            .btn-cancel {
                padding: 14px 30px;
                background: rgba(255, 255, 255, 0.1);
                color: #e0e0e0;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            }

            /* ========== RESPONSIVE ========== */
            @media (max-width: 900px) {
                .inbox-content {
                    grid-template-columns: 1fr;
                }
                .inbox-detail {
                    display: none;
                }
                .inbox-detail.active {
                    display: block;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 1000;
                    border-radius: 0;
                }
                .form-row {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
        this.stylesInjected = true;
        console.log('✅ [INBOX] Estilos dark theme inyectados');
    },

    async loadStats() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/inbox/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats || {};
            }
        } catch (error) {
            console.error('❌ [INBOX] Error cargando stats:', error);
        }
    },

    async loadInbox() {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                status: this.filters.status,
                priority: this.filters.priority,
                limit: 100,
                offset: 0
            });

            const response = await fetch(`/api/inbox?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Error cargando bandeja de notificaciones');
            }

            const data = await response.json();
            this.notifications = data.inbox?.groups || [];
            this.render();
        } catch (error) {
            console.error('❌ [INBOX] Error:', error);
            this.renderError(error.message);
        }
    },

    applyFilters() {
        let filtered = [...this.notifications];

        if (this.filters.groupType !== 'all') {
            filtered = filtered.filter(g => g.group_type === this.filters.groupType);
        }

        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(g =>
                (g.subject || '').toLowerCase().includes(search) ||
                (g.last_message || '').toLowerCase().includes(search)
            );
        }

        return filtered;
    },

    render() {
        const mainContent = document.getElementById('mainContent');
        const filteredNotifications = this.applyFilters();
        const groupTypes = [...new Set(this.notifications.map(g => g.group_type))];

        mainContent.innerHTML = `
            <div class="inbox-module">
                <!-- Header con estadísticas -->
                <div class="inbox-header">
                    <div class="inbox-header-top">
                        <div class="inbox-title">
                            <h2><i class="fas fa-envelope-open-text"></i> Mis Notificaciones</h2>
                            <span class="inbox-subtitle">Centro de comunicaciones y solicitudes</span>
                        </div>
                        <div class="inbox-header-actions">
                            <button class="btn-new-notification" onclick="InboxModule.showNewNotificationModal()">
                                <i class="fas fa-plus"></i> Nueva Notificación
                            </button>
                        </div>
                    </div>
                    <div class="inbox-stats-bar">
                        <div class="stat-card">
                            <span class="stat-number">${this.notifications.length}</span>
                            <span class="stat-label">Conversaciones</span>
                        </div>
                        <div class="stat-card unread">
                            <span class="stat-number">${this.notifications.filter(g => parseInt(g.unread_count) > 0).length}</span>
                            <span class="stat-label">Sin leer</span>
                        </div>
                        <div class="stat-card pending">
                            <span class="stat-number">${this.stats.pending_responses || 0}</span>
                            <span class="stat-label">Pendientes</span>
                        </div>
                        <div class="stat-card overdue">
                            <span class="stat-number">${this.stats.overdue_messages || 0}</span>
                            <span class="stat-label">Vencidas</span>
                        </div>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="inbox-filters">
                    <div class="filter-group">
                        <label>Buscar:</label>
                        <input type="text" id="inboxSearch" placeholder="Buscar en conversaciones..."
                               value="${this.filters.search}" onchange="InboxModule.setFilter('search', this.value)">
                    </div>
                    <div class="filter-group">
                        <label>Tipo:</label>
                        <select id="filterGroupType" onchange="InboxModule.setFilter('groupType', this.value)">
                            <option value="all">Todos los tipos</option>
                            ${groupTypes.map(type => {
                                const config = this.GROUP_TYPE_CONFIG[type] || this.GROUP_TYPE_CONFIG.default;
                                return `<option value="${type}" ${this.filters.groupType === type ? 'selected' : ''}>
                                    ${config.icon} ${config.label}
                                </option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Prioridad:</label>
                        <select id="filterPriority" onchange="InboxModule.setFilter('priority', this.value)">
                            <option value="all">Todas</option>
                            <option value="critical" ${this.filters.priority === 'critical' ? 'selected' : ''}>🔴 Crítica</option>
                            <option value="high" ${this.filters.priority === 'high' ? 'selected' : ''}>🟠 Alta</option>
                            <option value="medium" ${this.filters.priority === 'medium' ? 'selected' : ''}>🟡 Media</option>
                            <option value="normal" ${this.filters.priority === 'normal' ? 'selected' : ''}>🟢 Normal</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Estado:</label>
                        <select id="filterStatus" onchange="InboxModule.setFilter('status', this.value)">
                            <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>Todos</option>
                            <option value="open" ${this.filters.status === 'open' ? 'selected' : ''}>Abiertos</option>
                            <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>Pendientes</option>
                            <option value="closed" ${this.filters.status === 'closed' ? 'selected' : ''}>Cerrados</option>
                        </select>
                    </div>
                    <button class="btn-refresh" onclick="InboxModule.loadInbox()">
                        <i class="fas fa-sync-alt"></i> Actualizar
                    </button>
                </div>

                <!-- Contenido principal -->
                <div class="inbox-content">
                    <div class="inbox-list">
                        ${this.renderGroupList(filteredNotifications)}
                    </div>
                    <div class="inbox-detail" id="inboxDetail">
                        <div class="empty-state">
                            <div class="empty-icon">📥</div>
                            <h3>Selecciona una conversación</h3>
                            <p>Haz clic en un hilo de la izquierda para ver los mensajes</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    renderGroupList(groups) {
        if (groups.length === 0) {
            return `
                <div class="empty-state" style="padding: 60px 20px;">
                    <div class="empty-icon">📭</div>
                    <h3>No hay notificaciones</h3>
                    <p>Tu bandeja está vacía. ¡Usa el botón "Nueva Notificación" para comunicarte!</p>
                </div>
            `;
        }

        return groups.map(group => {
            const config = this.GROUP_TYPE_CONFIG[group.group_type] || this.GROUP_TYPE_CONFIG.default;
            const priorityConfig = this.PRIORITY_CONFIG[group.priority] || this.PRIORITY_CONFIG.normal;
            const isUnread = parseInt(group.unread_count) > 0;
            const isActive = this.currentGroupId === group.id;

            return `
                <div class="group-item ${isUnread ? 'unread' : ''} ${isActive ? 'active' : ''}"
                     data-group-id="${group.id}"
                     onclick="InboxModule.loadGroupMessages('${group.id}')">
                    <div class="group-icon" style="background: ${config.color}20; color: ${config.color}">
                        ${config.icon}
                    </div>
                    <div class="group-content">
                        <div class="group-header">
                            <span class="group-title">${this.escapeHtml(group.subject || 'Sin asunto')}</span>
                            <span class="group-time">${this.formatDate(group.last_message_at || group.created_at)}</span>
                        </div>
                        <div class="group-preview">
                            ${this.escapeHtml(group.last_message || 'No hay mensajes')}
                        </div>
                        <div class="group-meta">
                            <div class="group-badges">
                                <span class="badge badge-type">${config.label}</span>
                                <span class="badge badge-priority-${group.priority}">${priorityConfig.icon} ${priorityConfig.label}</span>
                                ${isUnread ? `<span class="badge badge-unread">${group.unread_count} nuevos</span>` : ''}
                            </div>
                            <span class="badge badge-count">💬 ${group.message_count || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ============================================================================
    // MODAL NUEVA NOTIFICACIÓN
    // ============================================================================

    showNewNotificationModal() {
        console.log('📝 [INBOX] Abriendo modal de nueva notificación');

        const overlay = document.createElement('div');
        overlay.className = 'notification-modal-overlay';
        overlay.id = 'newNotificationModal';

        overlay.innerHTML = `
            <div class="notification-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Nueva Notificación</h3>
                    <button class="modal-close" onclick="InboxModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="category-selector">
                        <label>¿Qué deseas notificar?</label>
                        <div class="category-grid">
                            ${Object.values(this.EMPLOYEE_NOTIFICATION_CATEGORIES).map(cat => `
                                <div class="category-card"
                                     style="--cat-color: ${cat.color}"
                                     data-category="${cat.id}"
                                     onclick="InboxModule.selectCategory('${cat.id}')">
                                    <span class="cat-icon">${cat.icon}</span>
                                    <span class="cat-label">${cat.label}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div id="notificationFormFields" style="display: none;">
                        <!-- Campos dinámicos según categoría -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="InboxModule.closeModal()">Cancelar</button>
                    <button class="btn-submit" id="btnSubmitNotification" disabled onclick="InboxModule.submitNotification()">
                        <i class="fas fa-paper-plane"></i> Enviar Notificación
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    },

    selectCategory(categoryId) {
        const category = this.EMPLOYEE_NOTIFICATION_CATEGORIES[categoryId];
        if (!category) return;

        // Marcar seleccionado
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-category="${categoryId}"]`).classList.add('selected');

        // Mostrar formulario
        const formContainer = document.getElementById('notificationFormFields');
        formContainer.style.display = 'block';

        // Generar campos según categoría
        let formHTML = '';

        // Info médica si es enfermedad y hay módulo médico
        if (categoryId === 'illness' && this.companyHasMedicalModule) {
            formHTML += `
                <div class="medical-info-box">
                    <h4><i class="fas fa-info-circle"></i> Se iniciará un caso médico</h4>
                    <p>Al enviar esta notificación, se abrirá automáticamente una carpeta médica.
                    RRHH y el médico asignado a tu sucursal serán notificados.</p>
                </div>
            `;
        }

        // Fecha
        if (category.requiresDate) {
            const today = new Date().toISOString().split('T')[0];
            formHTML += `
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha de inicio *</label>
                        <input type="date" id="notifStartDate" value="${today}" required>
                    </div>
                    ${categoryId !== 'late_arrival' ? `
                    <div class="form-group">
                        <label>Fecha de fin (opcional)</label>
                        <input type="date" id="notifEndDate">
                    </div>
                    ` : ''}
                </div>
            `;
        }

        // Hora (para llegada tarde)
        if (category.requiresTime) {
            formHTML += `
                <div class="form-row">
                    <div class="form-group">
                        <label>Hora de llegada estimada *</label>
                        <input type="time" id="notifTime" required>
                    </div>
                    <div class="form-group">
                        <label>Minutos de retraso estimados</label>
                        <input type="number" id="notifDelayMinutes" min="1" max="480" placeholder="ej: 30">
                    </div>
                </div>
            `;
        }

        // Info médica específica
        if (category.requiresMedicalInfo) {
            formHTML += `
                <div class="form-group">
                    <label>Síntomas / Motivo médico *</label>
                    <textarea id="notifMedicalSymptoms" placeholder="Describe brevemente los síntomas o el motivo de la ausencia médica..." required></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>¿Tienes certificado médico?</label>
                        <select id="notifHasCertificate">
                            <option value="no">No, aún no</option>
                            <option value="pending">Lo presentaré luego</option>
                            <option value="yes">Sí, lo adjuntaré</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Días estimados de reposo</label>
                        <input type="number" id="notifRestDays" min="1" max="365" placeholder="ej: 3">
                    </div>
                </div>
            `;
        }

        // Razón/Descripción
        if (category.requiresReason) {
            formHTML += `
                <div class="form-group">
                    <label>Descripción / Motivo *</label>
                    <textarea id="notifReason" placeholder="Explica brevemente el motivo de esta notificación..." required></textarea>
                </div>
            `;
        }

        // Evidencia (para fuerza mayor)
        if (category.requiresEvidence) {
            formHTML += `
                <div class="form-group">
                    <label>Documentación de respaldo (opcional)</label>
                    <input type="file" id="notifEvidence" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
                    <small style="color: rgba(255,255,255,0.5); display: block; margin-top: 5px;">
                        Puedes adjuntar fotos, PDFs o documentos que respalden tu solicitud
                    </small>
                </div>
            `;
        }

        // Guardar categoría seleccionada
        formHTML += `<input type="hidden" id="notifCategory" value="${categoryId}">`;

        formContainer.innerHTML = formHTML;

        // Habilitar botón submit
        document.getElementById('btnSubmitNotification').disabled = false;
    },

    async submitNotification() {
        const categoryId = document.getElementById('notifCategory')?.value;
        const category = this.EMPLOYEE_NOTIFICATION_CATEGORIES[categoryId];

        if (!category) {
            alert('Por favor selecciona una categoría');
            return;
        }

        const btn = document.getElementById('btnSubmitNotification');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            const token = localStorage.getItem('token');
            const currentUser = window.currentUser || {};

            // Construir payload
            const payload = {
                category: categoryId,
                start_date: document.getElementById('notifStartDate')?.value,
                end_date: document.getElementById('notifEndDate')?.value || null,
                arrival_time: document.getElementById('notifTime')?.value || null,
                delay_minutes: document.getElementById('notifDelayMinutes')?.value || null,
                medical_symptoms: document.getElementById('notifMedicalSymptoms')?.value || null,
                has_certificate: document.getElementById('notifHasCertificate')?.value || 'no',
                rest_days: document.getElementById('notifRestDays')?.value || null,
                reason: document.getElementById('notifReason')?.value || null,
                initiate_medical_case: category.initiatesMedicalCase && this.companyHasMedicalModule
            };

            console.log('📤 [INBOX] Enviando notificación:', payload);

            const response = await fetch('/api/inbox/employee-notification', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al enviar notificación');
            }

            // Éxito
            this.closeModal();
            this.loadInbox();

            // Mostrar mensaje de éxito
            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Notificación enviada',
                    text: data.message || 'Tu notificación ha sido enviada correctamente',
                    confirmButtonColor: '#667eea'
                });
            } else {
                alert('Notificación enviada correctamente');
            }

        } catch (error) {
            console.error('❌ [INBOX] Error:', error);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Notificación';

            if (window.Swal) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message,
                    confirmButtonColor: '#667eea'
                });
            } else {
                alert('Error: ' + error.message);
            }
        }
    },

    closeModal() {
        const modal = document.getElementById('newNotificationModal');
        if (modal) modal.remove();
    },

    // ============================================================================
    // CARGAR MENSAJES DE GRUPO
    // ============================================================================

    async loadGroupMessages(groupId) {
        try {
            this.currentGroupId = groupId;

            document.querySelectorAll('.group-item').forEach(item => {
                item.classList.remove('active');
            });
            const activeItem = document.querySelector(`[data-group-id="${groupId}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
                activeItem.classList.remove('unread');
            }

            const token = localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Error cargando mensajes');
            }

            const data = await response.json();
            this.renderMessages(data.conversation?.group, data.conversation?.messages || []);

        } catch (error) {
            console.error('❌ [INBOX] Error cargando mensajes:', error);
            this.renderDetailError(error.message);
        }
    },

    renderMessages(group, messages) {
        const detailContainer = document.getElementById('inboxDetail');
        const config = this.GROUP_TYPE_CONFIG[group?.group_type] || this.GROUP_TYPE_CONFIG.default;

        if (messages.length === 0) {
            detailContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>Sin mensajes</h3>
                    <p>Esta conversación no tiene mensajes aún</p>
                </div>
            `;
            return;
        }

        detailContainer.innerHTML = `
            <div class="conversation-header">
                <div>
                    <span style="font-size: 1.5em; margin-right: 10px;">${config.icon}</span>
                    <span class="conversation-title">${this.escapeHtml(group?.subject || 'Conversación')}</span>
                </div>
                <div class="conversation-actions">
                    <button class="btn-action secondary" onclick="InboxModule.markAsRead('${group?.id}')">
                        <i class="fas fa-check"></i> Marcar leído
                    </button>
                    <button class="btn-action secondary" onclick="InboxModule.closeConversation('${group?.id}')">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </div>

            <div class="message-list">
                ${messages.map(msg => this.renderMessage(msg)).join('')}
            </div>
        `;
    },

    renderMessage(msg) {
        const isSystem = msg.sender_type === 'system';
        const isProactive = msg.message_type === 'proactive_detection';

        return `
            <div class="message-item ${isSystem ? 'system' : ''} ${isProactive ? 'proactive' : ''}">
                <div class="message-header">
                    <span class="message-sender">${this.escapeHtml(msg.sender_name || 'Sistema')}</span>
                    <span class="message-time">${this.formatDate(msg.created_at)}</span>
                </div>
                <div class="message-content">${this.formatMessageContent(msg.content)}</div>
                ${msg.requires_response ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.1);">
                        <span style="color: #e74c3c; font-size: 12px;"><i class="fas fa-exclamation-triangle"></i> Requiere respuesta</span>
                        ${msg.deadline_at ? `<span style="color: rgba(255,255,255,0.5); font-size: 12px; margin-left: 10px;">Fecha límite: ${this.formatDate(msg.deadline_at)}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    },

    formatMessageContent(content) {
        if (!content) return '';
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    },

    async markAsRead(groupId) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/inbox/group/${groupId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.loadInbox();
        } catch (error) {
            console.error('❌ Error marcando como leído:', error);
        }
    },

    async closeConversation(groupId) {
        if (!confirm('¿Cerrar esta conversación?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/inbox/group/${groupId}/close`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.currentGroupId = null;
            this.loadInbox();
        } catch (error) {
            console.error('❌ Error cerrando conversación:', error);
        }
    },

    setFilter(key, value) {
        this.filters[key] = value;
        if (key === 'status' || key === 'priority') {
            this.loadInbox();
        } else {
            this.render();
        }
    },

    renderError(message) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="inbox-module">
                <div style="padding: 60px; text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
                    <h3 style="color: #e74c3c;">Error al cargar bandeja</h3>
                    <p style="color: rgba(255,255,255,0.6);">${this.escapeHtml(message)}</p>
                    <button onclick="InboxModule.init()" style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            </div>
        `;
    },

    renderDetailError(message) {
        const detailContainer = document.getElementById('inboxDetail');
        detailContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error</h3>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;

        return date.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    attachEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('newNotificationModal')) {
                    this.closeModal();
                } else if (this.currentGroupId) {
                    this.currentGroupId = null;
                    this.render();
                }
            }
        });

        console.log('✅ [INBOX] Event listeners configurados');
    }
};

// Función global para compatibilidad
function showInboxContent() {
    InboxModule.init();
}

if (typeof window !== 'undefined') {
    window.InboxModule = InboxModule;
    window.showInboxContent = showInboxContent;
}
