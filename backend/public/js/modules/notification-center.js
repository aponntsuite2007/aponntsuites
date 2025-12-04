/**
 * NOTIFICATION CENTER - Sistema Unificado Profesional
 *
 * Fusión de:
 * - notifications-complete.js (dark theme, sidebar, estructura)
 * - notifications-enterprise.js (workflows, SLA, approve/reject, AI indicator)
 *
 * Features:
 * - Dark theme profesional
 * - Sidebar con categorías
 * - AI Indicator flotante
 * - Deadline countdown con urgencia
 * - Approve/Reject workflow
 * - Modal de detalle con historial
 * - Loading states profesionales
 *
 * @version 3.0 - Unified Professional
 * @date 2025-12-03
 */

const NotificationCenter = {
    currentGroupId: null,
    notifications: [],
    selectedNotification: null,
    welcomeTipClosed: localStorage.getItem('nc_welcome_closed') === 'true',
    filters: {
        status: 'all',
        priority: 'all',
        groupType: 'all',
        search: '',
        categoryFilter: null
    },
    stats: {},
    refreshInterval: null,

    // Configuración de tipos de grupos con iconos y colores
    GROUP_TYPE_CONFIG: {
        // Notificaciones proactivas
        proactive_vacation_expiry: { icon: '🏖️', label: 'Vacaciones por Vencer', color: '#3498db', category: 'proactive' },
        proactive_overtime_limit: { icon: '⏰', label: 'Límite Horas Extra', color: '#e74c3c', category: 'proactive' },
        proactive_rest_violation: { icon: '😴', label: 'Violación Descanso', color: '#9b59b6', category: 'proactive' },
        proactive_document_expiry: { icon: '📄', label: 'Documentos por Vencer', color: '#f39c12', category: 'proactive' },
        proactive_certificate_expiry: { icon: '🏥', label: 'Certificados Médicos', color: '#1abc9c', category: 'proactive' },
        proactive_consent_renewal: { icon: '🔐', label: 'Renovar Consentimiento', color: '#34495e', category: 'proactive' },
        // Solicitudes
        vacation_request: { icon: '🌴', label: 'Solicitud Vacaciones', color: '#27ae60', category: 'request' },
        leave_request: { icon: '📝', label: 'Solicitud Licencia', color: '#2980b9', category: 'request' },
        overtime_request: { icon: '💼', label: 'Solicitud Horas Extra', color: '#8e44ad', category: 'request' },
        late_arrival: { icon: '🕐', label: 'Llegada Tarde', color: '#e67e22', category: 'attendance' },
        shift_swap: { icon: '🔄', label: 'Cambio de Turno', color: '#16a085', category: 'request' },
        training_mandatory: { icon: '📚', label: 'Capacitación', color: '#2c3e50', category: 'training' },
        // Sistema
        system_alert: { icon: '⚠️', label: 'Alerta Sistema', color: '#c0392b', category: 'system' },
        announcement: { icon: '📢', label: 'Anuncio', color: '#16a085', category: 'system' },
        // Default
        default: { icon: '🔔', label: 'Notificación', color: '#95a5a6', category: 'other' }
    },

    PRIORITY_CONFIG: {
        critical: { icon: '🔴', label: 'Crítica', class: 'priority-critical', color: '#c0392b' },
        urgent: { icon: '🔴', label: 'Urgente', class: 'priority-urgent', color: '#c0392b' },
        high: { icon: '🟠', label: 'Alta', class: 'priority-high', color: '#e67e22' },
        medium: { icon: '🟡', label: 'Media', class: 'priority-medium', color: '#f1c40f' },
        normal: { icon: '🟢', label: 'Normal', class: 'priority-normal', color: '#27ae60' },
        low: { icon: '⚪', label: 'Baja', class: 'priority-low', color: '#95a5a6' }
    },

    CATEGORY_CONFIG: {
        proactive: { label: 'Alertas Proactivas', icon: '🔮' },
        request: { label: 'Solicitudes', icon: '📋' },
        attendance: { label: 'Asistencia', icon: '⏱️' },
        training: { label: 'Capacitación', icon: '📚' },
        system: { label: 'Sistema', icon: '⚙️' },
        other: { label: 'Otros', icon: '📌' }
    },

    // ========== INICIALIZACIÓN ==========

    init() {
        console.log('🔔 [NOTIFICATION-CENTER] Iniciando Sistema Unificado Profesional v3.0...');
        this.injectStyles();
        this.render();
        this.loadStats();
        this.loadInbox();
        this.startAutoRefresh();
    },

    // ========== ESTILOS PROFESIONALES (DARK THEME) ==========

    injectStyles() {
        if (document.getElementById('nc-styles')) return;
        const style = document.createElement('style');
        style.id = 'nc-styles';
        style.textContent = `
            /* ========== LAYOUT PRINCIPAL (DARK THEME) ========== */
            .notification-center {
                padding: 20px;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: #0a0a0f;
                color: #e0e0e0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                position: relative;
            }

            /* ========== AI INDICATOR INLINE (EN HEADER) ========== */
            .nc-ai-inline {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 14px;
                background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,255,136,0.1));
                border-radius: 20px;
                border: 1px solid rgba(0,212,255,0.3);
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 12px;
                color: #00ff88;
                font-weight: 600;
            }
            .nc-ai-inline:hover {
                background: linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,255,136,0.2));
                transform: scale(1.02);
                box-shadow: 0 0 15px rgba(0,212,255,0.3);
            }

            .nc-ai-dot-small {
                width: 8px;
                height: 8px;
                background: linear-gradient(135deg, #00ff88, #00d4ff);
                border-radius: 50%;
                animation: ncAiPulse 2s infinite;
                box-shadow: 0 0 8px rgba(0,255,136,0.6);
            }

            .nc-ai-live-small {
                padding: 2px 6px;
                background: rgba(0,212,255,0.2);
                border-radius: 8px;
                font-size: 9px;
                color: #00d4ff;
                font-weight: 600;
            }

            /* ========== HEADER ========== */
            .nc-header {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                padding: 25px 30px;
                margin-bottom: 20px;
                border: 1px solid rgba(102, 126, 234, 0.3);
                animation: ncFadeInDown 0.4s ease;
            }
            .nc-header-content { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
            .nc-title h1 { margin: 0; font-size: 1.8em; color: #fff; display: flex; align-items: center; gap: 12px; }
            .nc-subtitle { color: #888; font-size: 0.9em; }

            /* ========== QUICK STATS ========== */
            .nc-quick-stats { display: flex; gap: 15px; flex-wrap: wrap; }
            .qs-item {
                background: rgba(255,255,255,0.05);
                padding: 12px 20px;
                border-radius: 12px;
                text-align: center;
                min-width: 80px;
                border: 1px solid rgba(255,255,255,0.1);
                transition: all 0.3s ease;
                cursor: pointer;
            }
            .qs-item:hover { transform: translateY(-2px); background: rgba(255,255,255,0.08); }
            .qs-item.unread { border-color: #e74c3c; background: rgba(231, 76, 60, 0.1); }
            .qs-item.pending { border-color: #f1c40f; background: rgba(241, 196, 15, 0.1); }
            .qs-item.overdue { border-color: #c0392b; background: rgba(192, 57, 43, 0.1); }
            .qs-item.actions { border-color: #fd7e14; background: rgba(253, 126, 20, 0.1); }
            .qs-number { display: block; font-size: 1.5em; font-weight: bold; color: #fff; }
            .qs-label { font-size: 0.75em; color: #888; }

            /* ========== FILTROS ========== */
            .nc-filters { background: #12121a; padding: 15px 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); }
            .filter-row { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
            .filter-item { position: relative; }
            .filter-item.search { flex: 1; min-width: 200px; }
            .filter-item.search i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #666; }
            .filter-item input, .filter-item select {
                padding: 10px 15px;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                background: #1a1a2e;
                color: #fff;
                font-size: 14px;
                width: 100%;
                transition: all 0.2s ease;
            }
            .filter-item input:focus, .filter-item select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
            }
            .filter-item select { padding-left: 15px; min-width: 180px; }
            .btn-refresh {
                padding: 10px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            }
            .btn-refresh:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }

            /* ========== LAYOUT GRID ========== */
            .nc-layout { display: grid; grid-template-columns: 200px 1fr 400px; gap: 15px; flex: 1; min-height: 0; }

            /* ========== SIDEBAR ========== */
            .nc-sidebar { background: #12121a; border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.1); overflow-y: auto; }
            .sidebar-section h3 { font-size: 0.8em; text-transform: uppercase; color: #666; margin: 0 0 10px 0; letter-spacing: 1px; }
            .category-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                margin-bottom: 5px;
            }
            .category-item:hover { background: rgba(102, 126, 234, 0.1); }
            .category-item.empty { opacity: 0.5; }
            .category-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .category-item.active .cat-count { background: rgba(255,255,255,0.2); color: white; }
            .cat-icon { font-size: 1.2em; }
            .cat-label { flex: 1; font-size: 0.9em; }
            .cat-count { background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px; font-size: 0.75em; }
            .cat-unread { background: #e74c3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7em; font-weight: bold; }

            /* ========== LISTA ========== */
            .nc-list { background: #12121a; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); overflow-y: auto; }

            /* ========== DETAIL PANEL ========== */
            .nc-detail { background: #12121a; border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.1); overflow-y: auto; }

            /* ========== EMPTY STATE ========== */
            .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 40px; }
            .empty-icon { font-size: 4em; margin-bottom: 15px; opacity: 0.5; }

            /* ========== GROUP ITEMS ========== */
            .group-item {
                padding: 15px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                gap: 12px;
                animation: ncFadeInUp 0.3s ease;
            }
            .group-item:hover { background: rgba(102, 126, 234, 0.05); }
            .group-item.unread { background: rgba(231, 76, 60, 0.05); border-left: 3px solid #e74c3c; }
            .group-item.active { background: rgba(102, 126, 234, 0.1); border-left: 3px solid #667eea; }
            .group-icon {
                width: 42px;
                height: 42px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.3em;
                flex-shrink: 0;
            }
            .group-content { flex: 1; min-width: 0; }
            .group-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
            .group-title { font-weight: 600; font-size: 14px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .group-time { font-size: 11px; color: #666; white-space: nowrap; }
            .group-preview { font-size: 12px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 6px; }
            .group-badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

            /* ========== BADGES ========== */
            .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 500; }
            .badge-priority-critical, .badge-priority-urgent { background: rgba(192, 57, 43, 0.2); color: #e74c3c; animation: ncPulse 2s infinite; }
            .badge-priority-high { background: rgba(230, 126, 34, 0.2); color: #e67e22; }
            .badge-priority-medium { background: rgba(241, 196, 15, 0.2); color: #f1c40f; }
            .badge-priority-normal { background: rgba(39, 174, 96, 0.2); color: #27ae60; }
            .badge-type { background: rgba(102, 126, 234, 0.2); color: #667eea; }
            .badge-unread { background: #e74c3c; color: white; }
            .badge-count { background: rgba(255,255,255,0.1); color: #888; }
            .badge-action { background: rgba(253, 126, 20, 0.2); color: #fd7e14; }

            /* ========== DEADLINE COUNTDOWN ========== */
            .nc-deadline {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
            }
            .nc-deadline-critical {
                background: rgba(220, 53, 69, 0.2);
                color: #ff6b6b;
                border: 1px solid rgba(220, 53, 69, 0.4);
                animation: ncBlink 1.5s infinite;
            }
            .nc-deadline-high {
                background: rgba(253, 126, 20, 0.2);
                color: #fd7e14;
                border: 1px solid rgba(253, 126, 20, 0.4);
            }
            .nc-deadline-medium {
                background: rgba(255, 193, 7, 0.2);
                color: #ffc107;
                border: 1px solid rgba(255, 193, 7, 0.4);
            }
            .nc-deadline-normal {
                background: rgba(23, 162, 184, 0.2);
                color: #17a2b8;
                border: 1px solid rgba(23, 162, 184, 0.4);
            }

            /* ========== MESSAGES ========== */
            .message-list { display: flex; flex-direction: column; gap: 12px; }
            .message-item { padding: 15px; background: rgba(255,255,255,0.02); border-radius: 10px; border-left: 3px solid #667eea; }
            .message-item.system { border-left-color: #9b59b6; }
            .message-item.proactive { border-left-color: #e74c3c; }
            .message-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .message-sender { font-weight: 600; color: #667eea; }
            .message-time { font-size: 12px; color: #666; }
            .message-content { font-size: 14px; line-height: 1.6; color: #ccc; }

            /* ========== CONVERSATION HEADER ========== */
            .conversation-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px; }
            .conversation-title { font-size: 1.1em; font-weight: 600; color: #fff; }
            .conversation-actions { display: flex; gap: 10px; flex-wrap: wrap; }

            /* ========== BOTONES ========== */
            .btn-action {
                padding: 8px 15px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-weight: 500;
            }
            .btn-action.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .btn-action.secondary { background: rgba(255,255,255,0.1); color: #ccc; }
            .btn-action.success { background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; }
            .btn-action.danger { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; }
            .btn-action:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }

            /* ========== MODAL ========== */
            .nc-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                animation: ncFadeIn 0.3s ease;
            }
            .nc-modal-content {
                background: #1a1a2e;
                border-radius: 20px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: ncSlideUp 0.4s ease;
                border: 1px solid rgba(102, 126, 234, 0.3);
            }
            .nc-modal-header {
                padding: 25px 30px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            .nc-modal-title {
                font-size: 22px;
                font-weight: 700;
                color: #fff;
                margin-bottom: 10px;
            }
            .nc-modal-close {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(255,255,255,0.1);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: #888;
                transition: all 0.2s ease;
            }
            .nc-modal-close:hover {
                background: rgba(255,255,255,0.2);
                transform: rotate(90deg);
            }
            .nc-modal-body { padding: 25px 30px; }
            .nc-modal-footer {
                padding: 20px 30px;
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }

            /* ========== DETAIL SECTIONS ========== */
            .nc-detail-section { margin-bottom: 20px; }
            .nc-detail-label {
                font-size: 12px;
                font-weight: 600;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
            }
            .nc-detail-value {
                font-size: 14px;
                color: #e0e0e0;
                line-height: 1.6;
            }

            /* ========== RESPONSE FORM ========== */
            .nc-response-form {
                margin-top: 20px;
                padding: 20px;
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.1);
            }
            .nc-response-textarea {
                width: 100%;
                padding: 15px;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                font-size: 14px;
                font-family: inherit;
                resize: vertical;
                min-height: 100px;
                background: #12121a;
                color: #e0e0e0;
                transition: all 0.2s ease;
            }
            .nc-response-textarea:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
            }

            /* ========== ACTIONS HISTORY ========== */
            .nc-actions-log {
                margin-top: 25px;
                padding-top: 25px;
                border-top: 1px solid rgba(255,255,255,0.1);
            }
            .nc-actions-log-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 15px;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .nc-action-item {
                padding: 12px 15px;
                background: rgba(255,255,255,0.03);
                border-radius: 10px;
                margin-bottom: 10px;
                border-left: 3px solid var(--action-color, #667eea);
            }
            .nc-action-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }
            .nc-action-type {
                font-weight: 600;
                color: #fff;
                text-transform: uppercase;
                font-size: 12px;
            }
            .nc-action-time {
                font-size: 11px;
                color: #888;
            }
            .nc-action-notes {
                font-size: 13px;
                color: #aaa;
            }

            /* ========== LOADING ========== */
            .nc-loading {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(10, 10, 15, 0.95);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 20px;
            }
            .nc-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid rgba(102, 126, 234, 0.2);
                border-top: 3px solid #667eea;
                border-radius: 50%;
                animation: ncSpin 1s linear infinite;
            }

            /* ========== TOOLTIPS ========== */
            .nc-tooltip {
                position: relative;
                cursor: help;
            }
            .nc-tooltip::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                color: #fff;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 11px;
                white-space: nowrap;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
                z-index: 1000;
                border: 1px solid rgba(102, 126, 234, 0.3);
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                pointer-events: none;
            }
            .nc-tooltip::before {
                content: '';
                position: absolute;
                bottom: calc(100% + 2px);
                left: 50%;
                transform: translateX(-50%);
                border: 6px solid transparent;
                border-top-color: #1a1a2e;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease;
                z-index: 1001;
            }
            .nc-tooltip:hover::after,
            .nc-tooltip:hover::before {
                opacity: 1;
                visibility: visible;
            }

            /* ========== HELP BUBBLES ========== */
            .nc-help-bubble {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                background: rgba(102, 126, 234, 0.2);
                color: #667eea;
                border-radius: 50%;
                font-size: 11px;
                font-weight: bold;
                cursor: help;
                margin-left: 6px;
                transition: all 0.2s ease;
            }
            .nc-help-bubble:hover {
                background: #667eea;
                color: white;
                transform: scale(1.1);
            }

            /* ========== TECH STACK BADGE ========== */
            .nc-tech-stack {
                display: flex;
                gap: 8px;
                align-items: center;
                padding: 6px 12px;
                background: rgba(255,255,255,0.03);
                border-radius: 20px;
                border: 1px solid rgba(255,255,255,0.08);
                margin-left: auto;
            }
            .nc-tech-item {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 10px;
                color: #888;
                padding: 2px 8px;
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
                transition: all 0.2s ease;
            }
            .nc-tech-item:hover {
                background: rgba(102, 126, 234, 0.2);
                color: #667eea;
            }
            .nc-tech-item i { font-size: 12px; }

            /* ========== WELCOME TIP ========== */
            .nc-welcome-tip {
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
                border: 1px solid rgba(102, 126, 234, 0.2);
                border-radius: 12px;
                padding: 15px 20px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 15px;
                animation: ncFadeInUp 0.5s ease;
            }
            .nc-welcome-tip-icon {
                font-size: 24px;
                flex-shrink: 0;
            }
            .nc-welcome-tip-content {
                flex: 1;
            }
            .nc-welcome-tip-title {
                font-weight: 600;
                color: #fff;
                margin-bottom: 4px;
                font-size: 14px;
            }
            .nc-welcome-tip-text {
                font-size: 12px;
                color: #aaa;
                line-height: 1.4;
            }
            .nc-welcome-tip-close {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                padding: 5px;
                font-size: 16px;
                transition: color 0.2s;
            }
            .nc-welcome-tip-close:hover { color: #fff; }

            /* ========== FEATURE LABELS ========== */
            .nc-feature-label {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 9px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 600;
            }
            .nc-feature-label.ai { background: rgba(0, 212, 255, 0.15); color: #00d4ff; }
            .nc-feature-label.realtime { background: rgba(0, 255, 136, 0.15); color: #00ff88; }
            .nc-feature-label.workflow { background: rgba(253, 126, 20, 0.15); color: #fd7e14; }
            .nc-feature-label.sla { background: rgba(220, 53, 69, 0.15); color: #dc3545; }

            /* ========== CONTEXTUAL HINTS ========== */
            .nc-hint {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 14px;
                background: rgba(255, 193, 7, 0.08);
                border-left: 3px solid #ffc107;
                border-radius: 0 8px 8px 0;
                font-size: 12px;
                color: #ccc;
                margin: 10px 0;
            }
            .nc-hint-icon { color: #ffc107; }

            /* ========== ANIMATIONS ========== */
            @keyframes ncFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes ncFadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes ncFadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes ncSlideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes ncSlideInRight { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes ncSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes ncPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
            @keyframes ncBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            @keyframes ncAiPulse {
                0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 15px rgba(0,255,136,0.6); }
                50% { opacity: 0.7; transform: scale(1.15); box-shadow: 0 0 25px rgba(0,255,136,0.9); }
            }

            /* ========== RESPONSIVE ========== */
            @media (max-width: 1200px) { .nc-layout { grid-template-columns: 1fr 350px; } .nc-sidebar { display: none; } }
            @media (max-width: 800px) { .nc-layout { grid-template-columns: 1fr; } .nc-detail { display: none; } }
        `;
        document.head.appendChild(style);
    },

    // ========== RENDER PRINCIPAL ==========

    render() {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) {
            console.error('[NOTIFICATION-CENTER] No se encontro mainContent');
            return;
        }

        const filteredNotifications = this.applyFilters();
        const groupTypes = [...new Set(this.notifications.map(g => g.group_type))];
        const groupsByCategory = this.getGroupsByCategory();
        const totalUnread = this.notifications.filter(g => parseInt(g.unread_count) > 0).length;

        mainContent.innerHTML = `
            <div class="notification-center">
                <!-- Header -->
                <div class="nc-header">
                    <div class="nc-header-content">
                        <div class="nc-title">
                            <h1>🔔 Centro de Notificaciones</h1>
                            <span class="nc-subtitle">
                                Sistema Unificado Profesional v3.0
                                <span class="nc-feature-label ai">🧠 IA</span>
                                <span class="nc-feature-label workflow">⚡ Workflows</span>
                                <span class="nc-feature-label sla">⏱️ SLA</span>
                            </span>
                        </div>
                        <!-- AI Indicator integrado en header -->
                        <div class="nc-ai-inline" title="Click para ver cómo funciona la IA" onclick="NotificationCenter.showAIInfo()">
                            <div class="nc-ai-dot-small"></div>
                            <span>🤖 IA Activa</span>
                            <span class="nc-ai-live-small">LIVE</span>
                            <span style="font-size: 10px; opacity: 0.7; margin-left: 4px;">ℹ️</span>
                        </div>
                        <div class="nc-quick-stats">
                            <div class="qs-item total nc-tooltip" data-tooltip="Click para ver todas" onclick="NotificationCenter.showAllNotifications()">
                                <span class="qs-number">${this.notifications.length}</span>
                                <span class="qs-label">Total</span>
                            </div>
                            <div class="qs-item unread nc-tooltip" data-tooltip="Requieren tu atención" onclick="NotificationCenter.showUnreadOnly()">
                                <span class="qs-number">${totalUnread}</span>
                                <span class="qs-label">Sin leer</span>
                            </div>
                            <div class="qs-item actions nc-tooltip" data-tooltip="Esperando aprobación/rechazo" onclick="NotificationCenter.showPendingActions()">
                                <span class="qs-number">${this.stats.pending_responses || 0}</span>
                                <span class="qs-label">Pendientes</span>
                            </div>
                            <div class="qs-item overdue nc-tooltip" data-tooltip="Pasaron el plazo límite">
                                <span class="qs-number">${this.stats.overdue_messages || 0}</span>
                                <span class="qs-label">Vencidas</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Welcome Tip (solo si no se ha cerrado) -->
                ${!this.welcomeTipClosed ? `
                <div class="nc-welcome-tip" id="ncWelcomeTip">
                    <div class="nc-welcome-tip-icon">💡</div>
                    <div class="nc-welcome-tip-content">
                        <div class="nc-welcome-tip-title">Bienvenido al Centro de Notificaciones Inteligente</div>
                        <div class="nc-welcome-tip-text">
                            Usa el <strong>sidebar izquierdo</strong> para filtrar por categoría •
                            Haz <strong>click en una notificación</strong> para ver detalles •
                            Las solicitudes pendientes tienen botones de <strong>Aprobar/Rechazar</strong>
                        </div>
                    </div>
                    <button class="nc-welcome-tip-close" onclick="NotificationCenter.closeWelcomeTip()">✕</button>
                </div>
                ` : ''}

                <!-- Filtros -->
                <div class="nc-filters">
                    <div class="filter-row">
                        <div class="filter-item search nc-tooltip" data-tooltip="Busca por asunto o contenido">
                            <i class="fas fa-search"></i>
                            <input type="text" id="ncSearch" placeholder="🔍 Buscar por asunto, empleado, contenido..."
                                   value="${this.filters.search}"
                                   oninput="NotificationCenter.setFilter('search', this.value)">
                        </div>
                        <div class="filter-item nc-tooltip" data-tooltip="Filtra por tipo de notificación">
                            <select id="filterGroupType" onchange="NotificationCenter.setFilter('groupType', this.value)">
                                <option value="all">📁 Todos los tipos</option>
                                ${groupTypes.map(type => {
                                    const config = this.GROUP_TYPE_CONFIG[type] || this.GROUP_TYPE_CONFIG.default;
                                    return `<option value="${type}" ${this.filters.groupType === type ? 'selected' : ''}>
                                        ${config.icon} ${config.label}
                                    </option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div class="filter-item nc-tooltip" data-tooltip="Crítica > Alta > Media > Normal">
                            <select id="filterPriority" onchange="NotificationCenter.setFilter('priority', this.value)">
                                <option value="all">🎯 Todas las prioridades</option>
                                <option value="critical" ${this.filters.priority === 'critical' ? 'selected' : ''}>🔴 Crítica</option>
                                <option value="high" ${this.filters.priority === 'high' ? 'selected' : ''}>🟠 Alta</option>
                                <option value="medium" ${this.filters.priority === 'medium' ? 'selected' : ''}>🟡 Media</option>
                                <option value="normal" ${this.filters.priority === 'normal' ? 'selected' : ''}>🟢 Normal</option>
                            </select>
                        </div>
                        <div class="filter-item nc-tooltip" data-tooltip="Pendientes = requieren tu acción">
                            <select id="filterStatus" onchange="NotificationCenter.setFilter('status', this.value)">
                                <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>📊 Todos</option>
                                <option value="open" ${this.filters.status === 'open' ? 'selected' : ''}>🟢 Abiertos</option>
                                <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>🟡 Pendientes</option>
                                <option value="closed" ${this.filters.status === 'closed' ? 'selected' : ''}>⚫ Cerrados</option>
                            </select>
                        </div>
                        <button class="btn-refresh nc-tooltip" data-tooltip="Recargar notificaciones (auto cada 60s)" onclick="NotificationCenter.loadInbox()">
                            <i class="fas fa-sync-alt"></i> Actualizar
                        </button>
                    </div>
                </div>

                <!-- Layout principal -->
                <div class="nc-layout">
                    <!-- Sidebar con categorías -->
                    <div class="nc-sidebar">
                        <div class="sidebar-section">
                            <h3>Categorías <span class="nc-help-bubble nc-tooltip" data-tooltip="Filtra notificaciones por tipo">?</span></h3>
                            <div class="category-item ${!this.filters.categoryFilter ? 'active' : ''}"
                                 onclick="NotificationCenter.clearCategoryFilter()">
                                <span class="cat-icon">📋</span>
                                <span class="cat-label">Todos</span>
                                <span class="cat-count">${this.notifications.length}</span>
                            </div>
                            ${Object.entries(this.CATEGORY_CONFIG).map(([key, cat]) => {
                                const count = (groupsByCategory[key] || []).length;
                                const unreadCount = (groupsByCategory[key] || []).filter(g => parseInt(g.unread_count) > 0).length;
                                const isActive = this.filters.categoryFilter === key;
                                const tooltips = {
                                    proactive: 'Alertas generadas automáticamente por el sistema',
                                    request: 'Solicitudes que requieren tu aprobación',
                                    attendance: 'Notificaciones de control de asistencia',
                                    training: 'Capacitaciones y entrenamientos',
                                    system: 'Alertas y anuncios del sistema',
                                    other: 'Otras notificaciones'
                                };
                                return `
                                    <div class="category-item nc-tooltip ${count === 0 ? 'empty' : ''} ${isActive ? 'active' : ''}"
                                         data-tooltip="${tooltips[key] || ''}"
                                         onclick="NotificationCenter.filterByCategory('${key}')">
                                        <span class="cat-icon">${cat.icon}</span>
                                        <span class="cat-label">${cat.label}</span>
                                        <span class="cat-count">${count}</span>
                                        ${unreadCount > 0 ? `<span class="cat-unread">${unreadCount}</span>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- Mini guía -->
                        <div style="margin-top: 20px; padding: 12px; background: rgba(102,126,234,0.08); border-radius: 10px; border: 1px solid rgba(102,126,234,0.15);">
                            <div style="font-size: 11px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Atajos</div>
                            <div style="font-size: 11px; color: #aaa; line-height: 1.8;">
                                <div>🖱️ Click = Ver detalles</div>
                                <div>⌨️ ESC = Cerrar modal</div>
                                <div>🔄 Auto-refresh 60s</div>
                            </div>
                        </div>

                        <!-- Leyenda de tiempos/urgencia -->
                        <div style="margin-top: 15px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
                            <div style="font-size: 11px; color: #888; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">⏱️ Plazos</div>
                            <div style="font-size: 10px; line-height: 2.2;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 10px; height: 10px; background: #ff6b6b; border-radius: 3px; animation: ncBlink 1.5s infinite;"></span>
                                    <span style="color: #ff6b6b;">Crítico</span>
                                    <span style="color: #666; margin-left: auto;">< 4h / Vencido</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 10px; height: 10px; background: #fd7e14; border-radius: 3px;"></span>
                                    <span style="color: #fd7e14;">Urgente</span>
                                    <span style="color: #666; margin-left: auto;">< 24h</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 10px; height: 10px; background: #ffc107; border-radius: 3px;"></span>
                                    <span style="color: #ffc107;">Medio</span>
                                    <span style="color: #666; margin-left: auto;">< 3 días</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 10px; height: 10px; background: #17a2b8; border-radius: 3px;"></span>
                                    <span style="color: #17a2b8;">Normal</span>
                                    <span style="color: #666; margin-left: auto;">> 3 días</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Lista de notificaciones -->
                    <div class="nc-list">
                        ${this.renderGroupList(filteredNotifications)}
                    </div>

                    <!-- Panel de detalle -->
                    <div class="nc-detail" id="ncDetail">
                        <div class="empty-state">
                            <div class="empty-icon">📬</div>
                            <h3>Selecciona una notificación</h3>
                            <p style="margin-bottom: 20px;">Haz clic en un elemento de la lista para ver los detalles</p>

                            <!-- Mini guía de características -->
                            <div style="text-align: left; background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; max-width: 300px;">
                                <div style="font-size: 12px; font-weight: 600; color: #fff; margin-bottom: 12px;">✨ Características del módulo</div>
                                <div style="font-size: 11px; color: #aaa; line-height: 2;">
                                    <div>🧠 <span style="color: #00d4ff;">IA integrada</span> - Análisis inteligente</div>
                                    <div>⏱️ <span style="color: #fd7e14;">SLA tracking</span> - Deadlines visibles</div>
                                    <div>✅ <span style="color: #27ae60;">Workflows</span> - Aprobar/Rechazar</div>
                                    <div>📜 <span style="color: #667eea;">Historial</span> - Trazabilidad completa</div>
                                    <div>🔔 <span style="color: #e74c3c;">Real-time</span> - Auto-actualización</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    // ========== RENDER LISTA ==========

    renderGroupList(groups) {
        if (groups.length === 0) {
            const hasFilters = this.filters.status !== 'all' || this.filters.priority !== 'all' ||
                              this.filters.groupType !== 'all' || this.filters.search || this.filters.categoryFilter;
            return `
                <div class="empty-state" style="padding: 60px 20px;">
                    <div class="empty-icon">${hasFilters ? '🔍' : '✨'}</div>
                    <h3>${hasFilters ? 'Sin resultados' : '¡Todo al día!'}</h3>
                    <p style="margin-bottom: 15px;">${hasFilters ?
                        'No hay notificaciones que coincidan con los filtros actuales' :
                        'No tienes notificaciones pendientes. Buen trabajo.'}</p>
                    ${hasFilters ? `
                        <button class="btn-action secondary" onclick="NotificationCenter.showAllNotifications()" style="margin-top: 10px;">
                            🔄 Limpiar filtros
                        </button>
                    ` : `
                        <div style="font-size: 12px; color: #666; margin-top: 15px;">
                            <div>💡 Las notificaciones aparecerán aquí cuando:</div>
                            <div style="margin-top: 8px; line-height: 1.8; color: #888;">
                                • Lleguen solicitudes de vacaciones o permisos<br>
                                • El sistema detecte alertas proactivas<br>
                                • Haya documentos por vencer
                            </div>
                        </div>
                    `}
                </div>
            `;
        }

        return groups.map(group => {
            const config = this.GROUP_TYPE_CONFIG[group.group_type] || this.GROUP_TYPE_CONFIG.default;
            const priorityConfig = this.PRIORITY_CONFIG[group.priority] || this.PRIORITY_CONFIG.normal;
            const isUnread = parseInt(group.unread_count) > 0;
            const isActive = this.currentGroupId === group.id;
            const requiresAction = group.requires_response || group.requires_action;
            const deadlineHtml = this.renderDeadline(group);

            return `
                <div class="group-item ${isUnread ? 'unread' : ''} ${isActive ? 'active' : ''}"
                     data-group-id="${group.id}"
                     onclick="NotificationCenter.loadGroupMessages('${group.id}')">
                    <div class="group-icon" style="background: ${config.color}20; color: ${config.color}">
                        ${config.icon}
                    </div>
                    <div class="group-content">
                        <div class="group-header">
                            <span class="group-title">${this.escapeHtml(group.subject || 'Sin asunto')}</span>
                            <span class="group-time">${this.formatDate(group.last_message_at || group.created_at)}</span>
                        </div>
                        <div class="group-preview">
                            ${this.escapeHtml(group.last_message || 'Sin mensajes')}
                        </div>
                        <div class="group-badges">
                            <span class="badge badge-type">${config.label}</span>
                            <span class="badge badge-priority-${group.priority}">${priorityConfig.icon}</span>
                            ${isUnread ? `<span class="badge badge-unread">${group.unread_count}</span>` : ''}
                            ${requiresAction ? `<span class="badge badge-action">⚡ Requiere acción</span>` : ''}
                            ${deadlineHtml}
                            <span class="badge badge-count">💬 ${group.message_count || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ========== RENDER DEADLINE ==========

    renderDeadline(notification) {
        if (!notification.deadline && !notification.response_deadline) {
            return '';
        }

        const deadline = notification.deadline || notification.response_deadline;
        const deadlineDate = new Date(deadline);
        const now = new Date();
        const diffMs = deadlineDate - now;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        let urgency = 'normal';
        let timeText = '';

        if (diffMs < 0) {
            urgency = 'critical';
            timeText = '⚠️ VENCIDO';
        } else if (diffHours < 4) {
            urgency = 'critical';
            timeText = `${diffHours}h restantes`;
        } else if (diffHours < 24) {
            urgency = 'high';
            timeText = `${diffHours}h restantes`;
        } else if (diffDays < 3) {
            urgency = 'medium';
            timeText = `${diffDays}d restantes`;
        } else {
            urgency = 'normal';
            timeText = `${diffDays}d restantes`;
        }

        return `<span class="nc-deadline nc-deadline-${urgency}">⏱️ ${timeText}</span>`;
    },

    // ========== CARGAR DATOS ==========

    async loadStats() {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch('/api/inbox/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats || {};
            }
        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error cargando stats:', error);
        }
    },

    async loadInbox() {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
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
                throw new Error('Error cargando notificaciones');
            }

            const data = await response.json();
            this.notifications = data.inbox?.groups || [];
            this.render();
        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error:', error);
            this.renderError(error.message);
        }
    },

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

            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error cargando mensajes');

            const data = await response.json();
            this.selectedNotification = data.conversation?.group;
            this.renderMessages(data.conversation?.group, data.conversation?.messages || []);

        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error cargando mensajes:', error);
            this.renderDetailError(error.message);
        }
    },

    // ========== RENDER MENSAJES ==========

    renderMessages(group, messages) {
        const detailContainer = document.getElementById('ncDetail');
        const config = this.GROUP_TYPE_CONFIG[group?.group_type] || this.GROUP_TYPE_CONFIG.default;
        const requiresAction = group?.requires_response || group?.requires_action;
        const actionStatus = group?.action_status || group?.status;

        if (messages.length === 0) {
            detailContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>Sin mensajes</h3>
                    <p>Esta conversación no tiene mensajes</p>
                </div>
            `;
            return;
        }

        detailContainer.innerHTML = `
            <div class="conversation-header">
                <div>
                    <span style="font-size: 1.3em; margin-right: 10px;">${config.icon}</span>
                    <span class="conversation-title">${this.escapeHtml(group?.subject || 'Conversación')}</span>
                </div>
                <div class="conversation-actions">
                    ${requiresAction && actionStatus === 'pending' ? `
                        <button class="btn-action success nc-tooltip" data-tooltip="Aprobar esta solicitud" onclick="NotificationCenter.approveNotification('${group?.id}')">
                            ✓ Aprobar
                        </button>
                        <button class="btn-action danger nc-tooltip" data-tooltip="Rechazar con motivo" onclick="NotificationCenter.rejectNotification('${group?.id}')">
                            ✕ Rechazar
                        </button>
                    ` : ''}
                    <button class="btn-action secondary nc-tooltip" data-tooltip="Marcar como leído" onclick="NotificationCenter.markAsRead('${group?.id}')">
                        ✓ Leído
                    </button>
                    <button class="btn-action primary nc-tooltip" data-tooltip="Ver modal con historial completo" onclick="NotificationCenter.showDetailModal('${group?.id}')">
                        🔍 Ver detalle
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
                <div class="message-content">${this.formatContent(msg.content)}</div>
                ${msg.requires_response ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1);">
                        <span style="color: #e74c3c; font-size: 12px;">⚠️ Requiere respuesta</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // ========== MODAL DE DETALLE ==========

    async showDetailModal(groupId) {
        try {
            this.showLoading();

            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al cargar detalle');

            const data = await response.json();
            const group = data.conversation?.group;
            const messages = data.conversation?.messages || [];

            this.renderDetailModal(group, messages);

        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error:', error);
            alert('Error al cargar el detalle: ' + error.message);
        } finally {
            this.hideLoading();
        }
    },

    renderDetailModal(group, messages) {
        const config = this.GROUP_TYPE_CONFIG[group?.group_type] || this.GROUP_TYPE_CONFIG.default;
        const priorityConfig = this.PRIORITY_CONFIG[group?.priority] || this.PRIORITY_CONFIG.normal;
        const requiresAction = group?.requires_response || group?.requires_action;
        const actionStatus = group?.action_status || group?.status;

        const modalHtml = `
            <div class="nc-modal" onclick="if(event.target === this) NotificationCenter.closeModal()">
                <div class="nc-modal-content">
                    <div class="nc-modal-header">
                        <div style="flex: 1;">
                            <div class="nc-modal-title">${config.icon} ${this.escapeHtml(group?.subject || 'Notificación')}</div>
                            <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                                <span class="badge badge-priority-${group?.priority}">${priorityConfig.icon} ${priorityConfig.label}</span>
                                <span class="badge badge-type">${config.label}</span>
                                ${requiresAction ? '<span class="badge badge-action">⚡ Requiere acción</span>' : ''}
                            </div>
                        </div>
                        <button class="nc-modal-close" onclick="NotificationCenter.closeModal()">✕</button>
                    </div>

                    <div class="nc-modal-body">
                        <!-- Mensajes -->
                        <div class="nc-detail-section">
                            <div class="nc-detail-label">Mensajes</div>
                            <div class="message-list">
                                ${messages.map(msg => this.renderMessage(msg)).join('')}
                            </div>
                        </div>

                        <!-- Info adicional -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                            <div class="nc-detail-section">
                                <div class="nc-detail-label">Creada</div>
                                <div class="nc-detail-value">${this.formatDateTime(group?.created_at)}</div>
                            </div>
                            ${group?.response_deadline ? `
                                <div class="nc-detail-section">
                                    <div class="nc-detail-label">Plazo Límite</div>
                                    <div class="nc-detail-value">${this.formatDateTime(group.response_deadline)}</div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Formulario de respuesta -->
                        ${requiresAction && actionStatus === 'pending' ? `
                            <div class="nc-response-form">
                                <div class="nc-detail-label" style="margin-bottom: 10px;">Respuesta / Notas</div>
                                <textarea id="ncResponseText" class="nc-response-textarea"
                                          placeholder="Ingrese sus comentarios o notas sobre esta decisión..."></textarea>
                            </div>
                        ` : ''}

                        <!-- Historial de acciones -->
                        <div class="nc-actions-log">
                            <div class="nc-actions-log-title">📜 Historial de Acciones</div>
                            <div id="ncActionsHistory">
                                <div style="text-align: center; padding: 20px; color: #888;">
                                    <i class="fas fa-spinner fa-spin"></i> Cargando historial...
                                </div>
                            </div>
                        </div>
                    </div>

                    ${requiresAction && actionStatus === 'pending' ? `
                        <div class="nc-modal-footer">
                            <button class="btn-action secondary" onclick="NotificationCenter.closeModal()">Cerrar</button>
                            <button class="btn-action danger" onclick="NotificationCenter.rejectFromModal('${group?.id}')">
                                ✕ Rechazar
                            </button>
                            <button class="btn-action success" onclick="NotificationCenter.approveFromModal('${group?.id}')">
                                ✓ Aprobar
                            </button>
                        </div>
                    ` : `
                        <div class="nc-modal-footer">
                            <button class="btn-action primary" onclick="NotificationCenter.closeModal()">Cerrar</button>
                        </div>
                    `}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.loadActionsHistory(group?.id);
    },

    async loadActionsHistory(groupId) {
        const container = document.getElementById('ncActionsHistory');
        if (!container) return;

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('No hay historial disponible');
            }

            const data = await response.json();
            const history = data.history || [];

            if (history.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #888;">
                        <p>No hay acciones registradas todavía</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = history.map(action => {
                const actionColor = this.getActionColor(action.action || action.type);
                return `
                    <div class="nc-action-item" style="--action-color: ${actionColor}">
                        <div class="nc-action-header">
                            <div class="nc-action-type">${this.translateAction(action.action || action.type)}</div>
                            <div class="nc-action-time">${this.formatDateTime(action.created_at)}</div>
                        </div>
                        ${action.notes || action.comment ? `<div class="nc-action-notes">${action.notes || action.comment}</div>` : ''}
                    </div>
                `;
            }).join('');

        } catch (error) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #888;">
                    <p>No hay historial disponible</p>
                </div>
            `;
        }
    },

    // ========== ACCIONES ==========

    async approveNotification(groupId) {
        if (!confirm('¿Está seguro de que desea aprobar esta solicitud?')) return;

        try {
            this.showLoading();
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}/action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'approve', notes: 'Aprobado' })
            });

            if (!response.ok) throw new Error('Error al aprobar');

            alert('✅ Notificación aprobada exitosamente');
            this.loadInbox();

        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error:', error);
            alert('Error al aprobar: ' + error.message);
        } finally {
            this.hideLoading();
        }
    },

    async rejectNotification(groupId) {
        const reason = prompt('Ingrese el motivo del rechazo:');
        if (!reason) return;

        try {
            this.showLoading();
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}/action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'reject', notes: reason })
            });

            if (!response.ok) throw new Error('Error al rechazar');

            alert('❌ Notificación rechazada');
            this.loadInbox();

        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error:', error);
            alert('Error al rechazar: ' + error.message);
        } finally {
            this.hideLoading();
        }
    },

    async approveFromModal(groupId) {
        const notes = document.getElementById('ncResponseText')?.value || 'Aprobado';

        try {
            this.closeModal();
            this.showLoading();

            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}/action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'approve', notes })
            });

            if (!response.ok) throw new Error('Error al aprobar');

            alert('✅ Notificación aprobada exitosamente');
            this.loadInbox();

        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error:', error);
            alert('Error al aprobar: ' + error.message);
        } finally {
            this.hideLoading();
        }
    },

    async rejectFromModal(groupId) {
        const notes = document.getElementById('ncResponseText')?.value || '';

        if (!notes.trim()) {
            alert('Por favor ingrese un motivo para el rechazo');
            return;
        }

        try {
            this.closeModal();
            this.showLoading();

            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await fetch(`/api/inbox/group/${groupId}/action`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'reject', notes })
            });

            if (!response.ok) throw new Error('Error al rechazar');

            alert('❌ Notificación rechazada');
            this.loadInbox();

        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error:', error);
            alert('Error al rechazar: ' + error.message);
        } finally {
            this.hideLoading();
        }
    },

    async markAsRead(groupId) {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            await fetch(`/api/inbox/group/${groupId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.loadInbox();
        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error:', error);
        }
    },

    async closeConversation(groupId) {
        if (!confirm('¿Cerrar esta conversación?')) return;
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            await fetch(`/api/inbox/group/${groupId}/close`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.currentGroupId = null;
            this.loadInbox();
        } catch (error) {
            console.error('[NOTIFICATION-CENTER] Error:', error);
        }
    },

    // ========== FILTROS ==========

    applyFilters() {
        let filtered = [...this.notifications];

        if (this.filters.groupType !== 'all') {
            filtered = filtered.filter(g => g.group_type === this.filters.groupType);
        }

        if (this.filters.categoryFilter) {
            const categoryTypes = Object.entries(this.GROUP_TYPE_CONFIG)
                .filter(([key, config]) => config.category === this.filters.categoryFilter)
                .map(([key]) => key);
            filtered = filtered.filter(g => categoryTypes.includes(g.group_type));
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

    getGroupsByCategory() {
        const categories = {};
        const groups = this.notifications;

        groups.forEach(group => {
            const config = this.GROUP_TYPE_CONFIG[group.group_type] || this.GROUP_TYPE_CONFIG.default;
            const category = config.category || 'other';

            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(group);
        });

        return categories;
    },

    filterByCategory(category) {
        if (this.filters.categoryFilter === category) {
            this.clearCategoryFilter();
            return;
        }
        this.filters.categoryFilter = category;
        this.render();
    },

    clearCategoryFilter() {
        this.filters.categoryFilter = null;
        this.render();
    },

    setFilter(key, value) {
        this.filters[key] = value;
        if (key === 'status' || key === 'priority') {
            this.loadInbox();
        } else {
            this.render();
        }
    },

    showAllNotifications() {
        this.filters = {
            status: 'all',
            priority: 'all',
            groupType: 'all',
            search: '',
            categoryFilter: null
        };
        this.loadInbox();
    },

    showUnreadOnly() {
        this.filters.status = 'open';
        this.loadInbox();
    },

    showPendingActions() {
        this.filters.status = 'pending';
        this.loadInbox();
    },

    closeWelcomeTip() {
        this.welcomeTipClosed = true;
        localStorage.setItem('nc_welcome_closed', 'true');
        const tip = document.getElementById('ncWelcomeTip');
        if (tip) {
            tip.style.animation = 'ncFadeIn 0.3s ease reverse';
            setTimeout(() => tip.remove(), 300);
        }
    },

    showAIInfo() {
        const modalHtml = `
            <div class="nc-modal" onclick="if(event.target === this) NotificationCenter.closeModal()">
                <div class="nc-modal-content" style="max-width: 750px; max-height: 90vh; overflow-y: auto;">
                    <div class="nc-modal-header">
                        <div style="flex: 1;">
                            <div class="nc-modal-title">🧠 Sistema de Inteligencia Artificial</div>
                            <div style="display: flex; gap: 8px; margin-top: 10px;">
                                <span class="nc-feature-label ai">LOCAL</span>
                                <span class="nc-feature-label realtime">PRIVADO</span>
                                <span class="nc-feature-label workflow">$0/MES</span>
                            </div>
                        </div>
                        <button class="nc-modal-close" onclick="NotificationCenter.closeModal()">✕</button>
                    </div>
                    <div class="nc-modal-body">

                        <!-- SECCIÓN: ¿CUÁNDO INTERVIENE LA IA? -->
                        <div class="nc-detail-section">
                            <div class="nc-detail-label" style="font-size: 16px; color: #00ff88;">🤖 ¿Cuándo Interviene la IA?</div>
                            <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 15px;">

                                <!-- Motor 1: Proactivo -->
                                <div style="background: linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1)); padding: 18px; border-radius: 12px; border: 1px solid rgba(102,126,234,0.3);">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                        <span style="font-size: 24px;">🔮</span>
                                        <div>
                                            <div style="font-weight: 700; color: #fff; font-size: 14px;">Motor Proactivo</div>
                                            <div style="font-size: 11px; color: #888;">Detecta problemas ANTES de que ocurran</div>
                                        </div>
                                    </div>
                                    <div style="font-size: 12px; color: #bbb; line-height: 1.8;">
                                        <div style="margin-bottom: 8px;"><strong style="color: #fff;">Se ejecuta:</strong> Automáticamente según reglas configuradas</div>
                                        <div><strong style="color: #fff;">Detecta y genera alertas de:</strong></div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 5px; padding-left: 10px;">
                                            <div>🏖️ Vacaciones por vencer</div>
                                            <div>⏰ Límite horas extra</div>
                                            <div>😴 Violación período descanso</div>
                                            <div>📄 Documentos por vencer</div>
                                            <div>🏥 Certificados médicos</div>
                                            <div>🔐 Consentimientos biométricos</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Motor 2: Analizador -->
                                <div style="background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,255,136,0.1)); padding: 18px; border-radius: 12px; border: 1px solid rgba(0,212,255,0.3);">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                        <span style="font-size: 24px;">🧠</span>
                                        <div>
                                            <div style="font-weight: 700; color: #fff; font-size: 14px;">Motor Analizador (Ollama + Llama 3.1)</div>
                                            <div style="font-size: 11px; color: #888;">Analiza mensajes y sugiere respuestas</div>
                                        </div>
                                    </div>
                                    <div style="font-size: 12px; color: #bbb; line-height: 1.8;">
                                        <div style="margin-bottom: 8px;"><strong style="color: #fff;">Se ejecuta:</strong> Cada 5 minutos automáticamente</div>
                                        <div><strong style="color: #fff;">¿Qué hace?</strong></div>
                                        <div style="padding-left: 10px; margin-top: 5px;">
                                            <div>📨 Analiza mensajes nuevos (últimas 24h)</div>
                                            <div>❓ Detecta si son preguntas</div>
                                            <div>🔍 Busca respuestas similares en la base de conocimiento</div>
                                            <div>💡 Si encuentra coincidencia >60%, <strong style="color: #f1c40f;">sugiere respuesta</strong></div>
                                            <div>⚡ Si coincidencia >85% y verificada, <strong style="color: #00ff88;">auto-responde</strong></div>
                                            <div>📚 Aprende de conversaciones resueltas</div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <!-- SECCIÓN: CÓMO IDENTIFICAR INTERVENCIÓN IA -->
                        <div class="nc-detail-section" style="margin-top: 25px;">
                            <div class="nc-detail-label">👀 ¿Cómo Identificar Intervención de la IA?</div>
                            <div style="margin-top: 12px; font-size: 13px; color: #aaa;">
                                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                                    <div style="color: #00ff88; font-weight: 600; margin-bottom: 5px;">🔮 Notificaciones Proactivas</div>
                                    <div>Tienen categoría "Alertas Proactivas" en el sidebar izquierdo. Icono 🔮</div>
                                </div>
                                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                                    <div style="color: #00d4ff; font-weight: 600; margin-bottom: 5px;">🤖 Auto-respuestas</div>
                                    <div>Mensajes del "Asistente IA" con badge de confianza (ej: 87%)</div>
                                </div>
                                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
                                    <div style="color: #f1c40f; font-weight: 600; margin-bottom: 5px;">💡 Sugerencias</div>
                                    <div>Aparecen como opciones sugeridas antes de responder</div>
                                </div>
                            </div>
                        </div>

                        <!-- SECCIÓN: STACK TECNOLÓGICO -->
                        <div class="nc-detail-section" style="margin-top: 25px;">
                            <div class="nc-detail-label">Stack Tecnológico</div>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 10px;">
                                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px; border-left: 3px solid #667eea;">
                                    <div style="font-weight: 600; color: #fff; margin-bottom: 5px;">🧠 Ollama</div>
                                    <div style="font-size: 12px; color: #888;">Motor de IA local, sin conexión a internet</div>
                                </div>
                                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px; border-left: 3px solid #00ff88;">
                                    <div style="font-weight: 600; color: #fff; margin-bottom: 5px;">🦙 Llama 3.1 (8B)</div>
                                    <div style="font-size: 12px; color: #888;">Modelo Meta AI, 8 billones de parámetros</div>
                                </div>
                                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px; border-left: 3px solid #fd7e14;">
                                    <div style="font-weight: 600; color: #fff; margin-bottom: 5px;">📚 RAG</div>
                                    <div style="font-size: 12px; color: #888;">Retrieval Augmented Generation</div>
                                </div>
                                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 10px; border-left: 3px solid #e74c3c;">
                                    <div style="font-weight: 600; color: #fff; margin-bottom: 5px;">🐘 PostgreSQL</div>
                                    <div style="font-size: 12px; color: #888;">Base de conocimiento persistente</div>
                                </div>
                            </div>
                        </div>

                        <!-- SECCIÓN: EJEMPLO PRÁCTICO -->
                        <div class="nc-detail-section" style="margin-top: 25px;">
                            <div class="nc-detail-label">📝 Ejemplo Práctico</div>
                            <div style="background: linear-gradient(135deg, rgba(39,174,96,0.1), rgba(46,204,113,0.1)); padding: 15px; border-radius: 12px; border: 1px solid rgba(39,174,96,0.3); margin-top: 10px; font-size: 12px; color: #bbb; line-height: 1.8;">
                                <div><strong style="color: #2ecc71;">1.</strong> José pregunta: "¿Hasta cuándo tengo tiempo de presentar el certificado de escolaridad?"</div>
                                <div><strong style="color: #2ecc71;">2.</strong> RRHH responde: "Hasta el 15 de marzo"</div>
                                <div><strong style="color: #2ecc71;">3.</strong> La IA <em>aprende</em> esta respuesta</div>
                                <div style="margin-top: 8px;"><strong style="color: #f1c40f;">Luego...</strong></div>
                                <div><strong style="color: #2ecc71;">4.</strong> Pedro pregunta: "¿El certificado de escolaridad me lo dan el 10 de abril, estoy a tiempo?"</div>
                                <div><strong style="color: #2ecc71;">5.</strong> La IA detecta la pregunta similar y sugiere respuesta automáticamente</div>
                            </div>
                        </div>

                        <div class="nc-hint" style="margin-top: 20px;">
                            <span class="nc-hint-icon">🔒</span>
                            <span><strong>100% Privado</strong> - Todos los datos y procesamiento permanecen en tu servidor. Sin APIs externas. $0/mes.</span>
                        </div>
                    </div>
                    <div class="nc-modal-footer">
                        <button class="btn-action primary" onclick="NotificationCenter.closeModal()">Entendido</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // ========== UTILIDADES ==========

    closeModal() {
        const modal = document.querySelector('.nc-modal');
        if (modal) modal.remove();
    },

    showLoading() {
        if (document.getElementById('ncLoading')) return;
        const loading = document.createElement('div');
        loading.id = 'ncLoading';
        loading.className = 'nc-loading';
        loading.innerHTML = `
            <div class="nc-spinner"></div>
            <p style="color: #888; font-weight: 500;">Cargando...</p>
        `;
        document.body.appendChild(loading);
    },

    hideLoading() {
        const loading = document.getElementById('ncLoading');
        if (loading) loading.remove();
    },

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => {
            this.loadStats();
        }, 60000);
    },

    formatContent(content) {
        if (!content) return '';
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
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
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;

        return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    },

    formatDateTime(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
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

    translateAction(action) {
        const translations = {
            created: 'Creada',
            approve: 'Aprobada',
            approved: 'Aprobada',
            reject: 'Rechazada',
            rejected: 'Rechazada',
            escalate: 'Escalada',
            read: 'Leída',
            completed: 'Completada',
            closed: 'Cerrada'
        };
        return translations[action] || action;
    },

    getActionColor(action) {
        const colors = {
            created: '#667eea',
            approve: '#56ab2f',
            approved: '#56ab2f',
            reject: '#eb3349',
            rejected: '#eb3349',
            escalate: '#fd7e14',
            read: '#17a2b8',
            completed: '#6c757d',
            closed: '#6c757d'
        };
        return colors[action] || '#6c757d';
    },

    renderError(message) {
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="notification-center">
                <div style="padding: 60px; text-align: center;">
                    <div style="font-size: 4em; margin-bottom: 20px;">⚠️</div>
                    <h3 style="color: #e74c3c;">Error al cargar notificaciones</h3>
                    <p style="color: #888;">${this.escapeHtml(message)}</p>
                    <button onclick="NotificationCenter.init()"
                            style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Reintentar
                    </button>
                </div>
            </div>
        `;
    },

    renderDetailError(message) {
        const detailContainer = document.getElementById('ncDetail');
        detailContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Error</h3>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    },

    attachEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.querySelector('.nc-modal')) {
                    this.closeModal();
                } else if (this.currentGroupId) {
                    this.currentGroupId = null;
                    this.render();
                }
            }
        });
    }
};

// ========== EXPORTACIONES ==========

// Objeto global principal
window.NotificationCenter = NotificationCenter;

// Alias para compatibilidad
window.NotificationsComplete = NotificationCenter;

// Función global para panel-empresa.html
function showNotificationCenterContent(container) {
    if (!container) {
        container = document.getElementById('mainContent') ||
                   document.getElementById('content-area') ||
                   document.querySelector('.content');
    }
    NotificationCenter.init();
}

// Registrar en sistema de módulos
window.Modules = window.Modules || {};
window.Modules['notification-center'] = {
    init: () => NotificationCenter.init(),
    show: showNotificationCenterContent,
    cleanup: () => {
        if (NotificationCenter.refreshInterval) {
            clearInterval(NotificationCenter.refreshInterval);
        }
    }
};

// Alias para compatibilidad con nombres antiguos
window.Modules['notifications-complete'] = window.Modules['notification-center'];
window.Modules['notifications-enterprise'] = window.Modules['notification-center'];

// Funciones globales
window.showNotificationCenterContent = showNotificationCenterContent;
window.showNotificationsCompleteContent = showNotificationCenterContent;
window.showNotificationsEnterpriseContent = showNotificationCenterContent;

console.log('🔔 [NOTIFICATION-CENTER] Módulo Unificado Profesional v3.0 cargado');
