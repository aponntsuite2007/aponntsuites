/**
 * SANCTIONS MANAGEMENT v2.0 - Enterprise Dark Theme
 * Sistema completo de Gestión de Sanciones con Workflow Multi-Etapa
 *
 * @version 2.0
 * @date 2025-12-03
 *
 * Features:
 * - Dark theme matching sistema enterprise
 * - Workflow multi-etapa: Draft → Lawyer → HR → Active
 * - Bloqueo de fichaje por suspensión
 * - Integración con notificaciones enterprise
 * - Historial SSOT disciplinario
 */

console.log('🚨 [SANCTIONS-v2] Cargando módulo de gestión de sanciones enterprise...');

// ============================================================================
// DARK THEME STYLES
// ============================================================================
const DARK_STYLES = `
<style id="sanctions-dark-styles">
    .sanctions-container {
        background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%) !important;
        min-height: calc(100vh - 60px);
        padding: 25px;
        color: #e0e0e0 !important;
        position: relative;
        z-index: 1;
    }

    /* Override any parent light backgrounds */
    #mainContent:has(.sanctions-container) {
        background: transparent !important;
    }

    .sanctions-header {
        background: linear-gradient(135deg, rgba(231,76,60,0.2) 0%, rgba(192,57,43,0.1) 100%);
        border: 1px solid rgba(231,76,60,0.3);
        border-radius: 16px;
        padding: 25px 30px;
        margin-bottom: 25px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .sanctions-header h2 {
        margin: 0;
        font-size: 28px;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .sanctions-header p {
        margin: 8px 0 0 0;
        color: rgba(255,255,255,0.7);
        font-size: 14px;
    }

    .btn-new-sanction {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
        border: none;
        padding: 14px 28px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(231,76,60,0.3);
    }

    .btn-new-sanction:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(231,76,60,0.5);
    }

    /* Stats Cards */
    .sanctions-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 20px;
        margin-bottom: 25px;
    }

    .stat-card {
        background: rgba(20,20,40,0.8) !important;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }

    .stat-card:hover {
        background: rgba(30,30,60,0.9) !important;
        transform: translateY(-3px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    }

    .stat-card .stat-value {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 5px;
    }

    .stat-card .stat-label {
        font-size: 13px;
        color: rgba(255,255,255,0.6);
        font-weight: 500;
    }

    .stat-card.draft { border-left: 4px solid #95a5a6; }
    .stat-card.draft .stat-value { color: #95a5a6; }

    .stat-card.pending-lawyer { border-left: 4px solid #9b59b6; }
    .stat-card.pending-lawyer .stat-value { color: #9b59b6; }

    .stat-card.pending-hr { border-left: 4px solid #f39c12; }
    .stat-card.pending-hr .stat-value { color: #f39c12; }

    .stat-card.active { border-left: 4px solid #e74c3c; }
    .stat-card.active .stat-value { color: #e74c3c; }

    .stat-card.suspended { border-left: 4px solid #8e44ad; }
    .stat-card.suspended .stat-value { color: #8e44ad; }

    .stat-card.total { border-left: 4px solid #3498db; }
    .stat-card.total .stat-value { color: #3498db; }

    /* Tabs */
    .sanctions-tabs {
        display: flex;
        gap: 5px;
        background: rgba(20,20,40,0.7) !important;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 6px;
        margin-bottom: 25px;
        flex-wrap: wrap;
    }

    .sanctions-tab {
        padding: 12px 20px;
        border: none;
        background: transparent;
        color: rgba(255,255,255,0.6);
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .sanctions-tab:hover {
        background: rgba(255,255,255,0.05);
        color: #fff;
    }

    .sanctions-tab.active {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
    }

    .sanctions-tab .badge {
        background: rgba(255,255,255,0.2);
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
    }

    /* Content Card */
    .sanctions-content-card {
        background: rgba(15,15,30,0.9) !important;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }

    /* Table */
    .sanctions-table {
        width: 100%;
        border-collapse: collapse;
    }

    .sanctions-table th {
        background: rgba(231,76,60,0.15) !important;
        padding: 15px;
        text-align: left;
        font-weight: 600;
        color: #ffffff !important;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid rgba(231,76,60,0.3);
    }

    .sanctions-table td {
        padding: 15px;
        border-top: 1px solid rgba(255,255,255,0.08);
        vertical-align: middle;
        color: #e0e0e0 !important;
    }

    .sanctions-table tr:hover td {
        background: rgba(231,76,60,0.08) !important;
    }

    /* Badges */
    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }

    .status-badge.draft {
        background: rgba(149,165,166,0.2);
        color: #bdc3c7;
        border: 1px solid rgba(149,165,166,0.3);
    }

    .status-badge.pending_lawyer {
        background: rgba(155,89,182,0.2);
        color: #bb8fce;
        border: 1px solid rgba(155,89,182,0.3);
    }

    .status-badge.pending_hr {
        background: rgba(243,156,18,0.2);
        color: #f5b041;
        border: 1px solid rgba(243,156,18,0.3);
    }

    .status-badge.active {
        background: rgba(231,76,60,0.2);
        color: #ec7063;
        border: 1px solid rgba(231,76,60,0.3);
    }

    .status-badge.rejected {
        background: rgba(52,73,94,0.2);
        color: #85929e;
        border: 1px solid rgba(52,73,94,0.3);
    }

    .status-badge.appealed {
        background: rgba(52,152,219,0.2);
        color: #5dade2;
        border: 1px solid rgba(52,152,219,0.3);
    }

    .status-badge.closed {
        background: rgba(39,174,96,0.2);
        color: #58d68d;
        border: 1px solid rgba(39,174,96,0.3);
    }

    .severity-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
    }

    .severity-badge.warning {
        background: rgba(241,196,15,0.2);
        color: #f4d03f;
    }

    .severity-badge.minor {
        background: rgba(230,126,34,0.2);
        color: #eb984e;
    }

    .severity-badge.major {
        background: rgba(231,76,60,0.2);
        color: #ec7063;
    }

    .severity-badge.suspension {
        background: rgba(142,68,173,0.2);
        color: #af7ac5;
    }

    .severity-badge.termination {
        background: rgba(44,62,80,0.3);
        color: #e74c3c;
        border: 1px solid rgba(231,76,60,0.3);
    }

    .category-badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
    }

    .category-badge.attendance { background: rgba(231,76,60,0.15); color: #e74c3c; }
    .category-badge.training { background: rgba(243,156,18,0.15); color: #f39c12; }
    .category-badge.behavior { background: rgba(142,68,173,0.15); color: #9b59b6; }
    .category-badge.performance { background: rgba(230,126,34,0.15); color: #e67e22; }
    .category-badge.safety { background: rgba(192,57,43,0.15); color: #c0392b; }
    .category-badge.other { background: rgba(127,140,141,0.15); color: #7f8c8d; }

    /* Action Buttons */
    .action-btn {
        padding: 8px 14px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    .action-btn.primary {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        color: white;
    }

    .action-btn.success {
        background: linear-gradient(135deg, #27ae60 0%, #219a52 100%);
        color: white;
    }

    .action-btn.warning {
        background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
        color: white;
    }

    .action-btn.danger {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        color: white;
    }

    .action-btn.secondary {
        background: rgba(255,255,255,0.1);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.2);
    }

    .action-btn:hover {
        transform: translateY(-1px);
        filter: brightness(1.1);
    }

    /* Modal Dark Theme */
    .sanctions-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        z-index: 10000;
        justify-content: center;
        align-items: flex-start;
        padding: 30px;
        overflow-y: auto;
    }

    .sanctions-modal.active {
        display: flex;
    }

    .sanctions-modal-content {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        width: 100%;
        max-width: 900px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }

    .sanctions-modal-header {
        background: linear-gradient(135deg, rgba(231,76,60,0.3) 0%, rgba(192,57,43,0.2) 100%);
        padding: 20px 25px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .sanctions-modal-header h3 {
        margin: 0;
        color: #fff;
        font-size: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .sanctions-modal-close {
        background: none;
        border: none;
        color: rgba(255,255,255,0.7);
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }

    .sanctions-modal-close:hover {
        color: #e74c3c;
    }

    .sanctions-modal-body {
        padding: 25px;
    }

    /* Form Elements */
    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        color: rgba(255,255,255,0.8);
        font-weight: 500;
        margin-bottom: 8px;
        font-size: 14px;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 12px 15px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
        transition: all 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #e74c3c;
        background: rgba(255,255,255,0.08);
    }

    .form-group select option {
        background: #1a1a2e;
        color: #fff;
    }

    .form-group textarea {
        min-height: 100px;
        resize: vertical;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    /* Workflow Progress */
    .workflow-progress {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: rgba(255,255,255,0.03);
        border-radius: 12px;
        margin-bottom: 25px;
        position: relative;
    }

    .workflow-progress::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 60px;
        right: 60px;
        height: 3px;
        background: rgba(255,255,255,0.1);
        transform: translateY(-50%);
        z-index: 0;
    }

    .workflow-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 1;
        position: relative;
    }

    .workflow-step .step-icon {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(255,255,255,0.1);
        border: 2px solid rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        margin-bottom: 8px;
        transition: all 0.3s ease;
    }

    .workflow-step.completed .step-icon {
        background: rgba(39,174,96,0.3);
        border-color: #27ae60;
    }

    .workflow-step.current .step-icon {
        background: rgba(231,76,60,0.3);
        border-color: #e74c3c;
        box-shadow: 0 0 20px rgba(231,76,60,0.4);
    }

    .workflow-step.pending .step-icon {
        opacity: 0.5;
    }

    .workflow-step .step-label {
        font-size: 12px;
        color: rgba(255,255,255,0.6);
        text-align: center;
        max-width: 80px;
    }

    .workflow-step.current .step-label {
        color: #e74c3c;
        font-weight: 600;
    }

    /* Tooltips */
    .tooltip-container {
        position: relative;
        display: inline-block;
    }

    .tooltip-icon {
        width: 18px;
        height: 18px;
        background: rgba(255,255,255,0.1);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: rgba(255,255,255,0.6);
        cursor: help;
        margin-left: 5px;
    }

    .tooltip-text {
        visibility: hidden;
        position: absolute;
        z-index: 100;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        background: #2c3e50;
        color: #fff;
        padding: 10px 15px;
        border-radius: 8px;
        font-size: 12px;
        white-space: nowrap;
        max-width: 300px;
        white-space: normal;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        opacity: 0;
        transition: all 0.3s ease;
    }

    .tooltip-container:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
    }

    /* History Timeline */
    .history-timeline {
        position: relative;
        padding-left: 30px;
    }

    .history-timeline::before {
        content: '';
        position: absolute;
        left: 10px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: rgba(255,255,255,0.1);
    }

    .history-item {
        position: relative;
        padding: 15px;
        margin-bottom: 15px;
        background: rgba(255,255,255,0.03);
        border-radius: 8px;
        border-left: 3px solid #3498db;
    }

    .history-item::before {
        content: '';
        position: absolute;
        left: -24px;
        top: 20px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #3498db;
    }

    .history-item .history-date {
        font-size: 11px;
        color: rgba(255,255,255,0.5);
    }

    .history-item .history-action {
        font-weight: 600;
        color: #fff;
        margin: 5px 0;
    }

    .history-item .history-actor {
        font-size: 12px;
        color: rgba(255,255,255,0.6);
    }

    /* Info Boxes */
    .info-box {
        padding: 15px 20px;
        border-radius: 10px;
        margin-bottom: 20px;
        display: flex;
        align-items: flex-start;
        gap: 15px;
    }

    .info-box.warning {
        background: rgba(243,156,18,0.1);
        border: 1px solid rgba(243,156,18,0.3);
    }

    .info-box.info {
        background: rgba(52,152,219,0.1);
        border: 1px solid rgba(52,152,219,0.3);
    }

    .info-box.success {
        background: rgba(39,174,96,0.1);
        border: 1px solid rgba(39,174,96,0.3);
    }

    .info-box.error {
        background: rgba(231,76,60,0.1);
        border: 1px solid rgba(231,76,60,0.3);
    }

    .info-box .info-icon {
        font-size: 24px;
        flex-shrink: 0;
    }

    .info-box .info-content h4 {
        margin: 0 0 5px 0;
        color: #fff;
        font-size: 15px;
    }

    .info-box .info-content p {
        margin: 0;
        color: rgba(255,255,255,0.7);
        font-size: 13px;
    }

    /* Empty State */
    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: rgba(255,255,255,0.5);
    }

    .empty-state .empty-icon {
        font-size: 60px;
        margin-bottom: 20px;
        opacity: 0.3;
    }

    .empty-state h3 {
        color: rgba(255,255,255,0.7);
        margin-bottom: 10px;
    }

    /* Loading */
    .loading-container {
        text-align: center;
        padding: 60px;
    }

    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(255,255,255,0.1);
        border-top-color: #e74c3c;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* Suspension Block Alert */
    .suspension-alert {
        background: linear-gradient(135deg, rgba(142,68,173,0.2) 0%, rgba(155,89,182,0.1) 100%);
        border: 2px solid rgba(142,68,173,0.4);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .suspension-alert h4 {
        color: #bb8fce;
        margin: 0 0 10px 0;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .suspension-alert .suspension-dates {
        display: flex;
        gap: 30px;
        margin-top: 15px;
    }

    .suspension-alert .date-item {
        text-align: center;
    }

    .suspension-alert .date-item .date-label {
        font-size: 11px;
        color: rgba(255,255,255,0.5);
        text-transform: uppercase;
    }

    .suspension-alert .date-item .date-value {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
        }

        .sanctions-stats {
            grid-template-columns: repeat(2, 1fr);
        }

        .workflow-progress {
            flex-direction: column;
            gap: 20px;
        }

        .workflow-progress::before {
            display: none;
        }
    }
</style>
`;

// ============================================================================
// CONSTANTS
// ============================================================================
const WORKFLOW_STATUS = {
    DRAFT: 'draft',
    PENDING_LAWYER: 'pending_lawyer',
    PENDING_HR: 'pending_hr',
    ACTIVE: 'active',
    REJECTED: 'rejected',
    APPEALED: 'appealed',
    CLOSED: 'closed'
};

const WORKFLOW_STATUS_CONFIG = {
    draft: { label: 'Borrador', icon: '📝', color: '#95a5a6' },
    pending_lawyer: { label: 'Revisión Legal', icon: '⚖️', color: '#9b59b6' },
    pending_hr: { label: 'Confirmación RRHH', icon: '👥', color: '#f39c12' },
    active: { label: 'Activa', icon: '🚨', color: '#e74c3c' },
    rejected: { label: 'Rechazada', icon: '❌', color: '#7f8c8d' },
    appealed: { label: 'En Apelación', icon: '📨', color: '#3498db' },
    closed: { label: 'Cerrada', icon: '✅', color: '#27ae60' }
};

const SEVERITY_CONFIG = {
    warning: { label: 'Advertencia', icon: '⚠️', color: '#f1c40f', points: -5 },
    minor: { label: 'Sanción Menor', icon: '🔸', color: '#e67e22', points: -10 },
    major: { label: 'Sanción Mayor', icon: '🔴', color: '#e74c3c', points: -20 },
    suspension: { label: 'Suspensión', icon: '⛔', color: '#8e44ad', points: -30 },
    termination: { label: 'Despido', icon: '🚫', color: '#2c3e50', points: -100 }
};

const CATEGORY_CONFIG = {
    attendance: { label: 'Asistencia', icon: '⏰' },
    training: { label: 'Capacitación', icon: '📚' },
    behavior: { label: 'Comportamiento', icon: '🤝' },
    performance: { label: 'Desempeño', icon: '📊' },
    safety: { label: 'Seguridad', icon: '🦺' },
    other: { label: 'Otro', icon: '📋' }
};

const DELIVERY_METHODS = {
    system: { label: 'Sistema', icon: '💻' },
    email: { label: 'Email', icon: '📧' },
    carta_documento: { label: 'Carta Documento', icon: '📜' },
    presencial: { label: 'Presencial', icon: '🤝' }
};

// ============================================================================
// STATE
// ============================================================================
let state = {
    sanctions: [],
    sanctionTypes: [],
    employees: [],
    stats: {},
    currentTab: 'pending-review',
    selectedSanction: null,
    loading: false,
    userRole: null,
    companyHasLegal: true
};

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================
function showSanctionsManagementContent() {
    console.log('🚨 [SANCTIONS-v2] Renderizando módulo de sanciones...');

    const content = document.getElementById('mainContent');
    if (!content) {
        console.error('❌ [SANCTIONS-v2] mainContent no encontrado');
        return;
    }

    // Inject dark styles
    if (!document.getElementById('sanctions-dark-styles')) {
        document.head.insertAdjacentHTML('beforeend', DARK_STYLES);
    }

    // Detect user role
    state.userRole = detectUserRole();

    content.innerHTML = `
        <div class="sanctions-container">
            <!-- Header -->
            <div class="sanctions-header">
                <div>
                    <h2>🚨 Gestión de Sanciones Enterprise</h2>
                    <p>Sistema de sanciones con workflow multi-etapa, revisión legal y bloqueo de fichaje</p>
                </div>
                <button class="btn-new-sanction" onclick="SanctionsManagement.showCreateModal()">
                    <span>➕</span> Nueva Solicitud
                </button>
            </div>

            <!-- Stats -->
            <div class="sanctions-stats" id="sanctions-stats">
                ${renderStatsLoading()}
            </div>

            <!-- Tabs -->
            <div class="sanctions-tabs" id="sanctions-tabs">
                ${renderTabs()}
            </div>

            <!-- Content -->
            <div class="sanctions-content-card">
                <div id="sanctions-list-container">
                    ${renderLoading()}
                </div>
            </div>
        </div>

        <!-- Modals - Se crean dinámicamente cuando se necesitan -->
        <div id="create-modal-container"></div>
        <div id="detail-modal-container"></div>
        <div id="workflow-action-modal-container"></div>
    `;

    // Load initial data
    loadInitialData();
}

// ============================================================================
// RENDER FUNCTIONS
// ============================================================================
function renderStatsLoading() {
    return `
        <div class="stat-card draft"><div class="stat-value">-</div><div class="stat-label">Borradores</div></div>
        <div class="stat-card pending-lawyer"><div class="stat-value">-</div><div class="stat-label">Rev. Legal</div></div>
        <div class="stat-card pending-hr"><div class="stat-value">-</div><div class="stat-label">Conf. RRHH</div></div>
        <div class="stat-card active"><div class="stat-value">-</div><div class="stat-label">Activas</div></div>
        <div class="stat-card suspended"><div class="stat-value">-</div><div class="stat-label">Suspensiones</div></div>
        <div class="stat-card total"><div class="stat-value">-</div><div class="stat-label">Total</div></div>
    `;
}

function renderStats() {
    const stats = state.stats;
    return `
        <div class="stat-card draft">
            <div class="stat-value">${stats.draft || 0}</div>
            <div class="stat-label">Borradores</div>
        </div>
        <div class="stat-card pending-lawyer">
            <div class="stat-value">${stats.pending_lawyer || 0}</div>
            <div class="stat-label">Rev. Legal</div>
        </div>
        <div class="stat-card pending-hr">
            <div class="stat-value">${stats.pending_hr || 0}</div>
            <div class="stat-label">Conf. RRHH</div>
        </div>
        <div class="stat-card active">
            <div class="stat-value">${stats.active || 0}</div>
            <div class="stat-label">Activas</div>
        </div>
        <div class="stat-card suspended">
            <div class="stat-value">${stats.suspended || 0}</div>
            <div class="stat-label">Suspensiones</div>
        </div>
        <div class="stat-card total">
            <div class="stat-value">${stats.total || 0}</div>
            <div class="stat-label">Total</div>
        </div>
    `;
}

function renderTabs() {
    const tabs = [
        { id: 'pending-review', label: 'Mis Pendientes', icon: '📥' },
        { id: 'all', label: 'Todas', icon: '📋' },
        { id: 'active', label: 'Activas', icon: '🚨' },
        { id: 'suspensions', label: 'Suspensiones', icon: '⛔' },
        { id: 'history', label: 'Historial', icon: '📜' },
        { id: 'types', label: 'Catálogo', icon: '📂' }
    ];

    return tabs.map(tab => `
        <button class="sanctions-tab ${state.currentTab === tab.id ? 'active' : ''}"
                onclick="SanctionsManagement.switchTab('${tab.id}')">
            ${tab.icon} ${tab.label}
        </button>
    `).join('');
}

function renderLoading() {
    return `
        <div class="loading-container" style="background: rgba(15,15,30,0.9); padding: 60px;">
            <div class="loading-spinner"></div>
            <p style="color: #ffffff; font-size: 16px; font-weight: 500;">Cargando sanciones...</p>
        </div>
    `;
}

function renderEmptyState(message = 'No hay sanciones para mostrar') {
    return `
        <div class="empty-state" style="background: rgba(15,15,30,0.9); padding: 60px 20px;">
            <div class="empty-icon" style="font-size: 80px;">📭</div>
            <h3 style="color: #ffffff; font-size: 20px;">${message}</h3>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px;">Las sanciones aparecerán aquí cuando se creen</p>
        </div>
    `;
}

function renderSanctionsList() {
    if (state.loading) return renderLoading();
    if (!state.sanctions || state.sanctions.length === 0) return renderEmptyState();

    return `
        <table class="sanctions-table">
            <thead>
                <tr>
                    <th>Empleado</th>
                    <th>Tipo</th>
                    <th>Severidad</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${state.sanctions.map(s => renderSanctionRow(s)).join('')}
            </tbody>
        </table>
    `;
}

function renderSanctionRow(sanction) {
    const statusConfig = WORKFLOW_STATUS_CONFIG[sanction.workflow_status] || WORKFLOW_STATUS_CONFIG.draft;
    const severityConfig = SEVERITY_CONFIG[sanction.severity] || SEVERITY_CONFIG.warning;
    const categoryConfig = CATEGORY_CONFIG[sanction.category] || CATEGORY_CONFIG.other;

    const date = sanction.created_at ? new Date(sanction.created_at).toLocaleDateString('es-AR') : '-';

    return `
        <tr>
            <td>
                <div style="font-weight: 600; color: #fff;">${sanction.employee_name || 'N/A'}</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.5);">${sanction.employee_code || ''}</div>
            </td>
            <td>
                <span class="category-badge ${sanction.category || 'other'}">
                    ${categoryConfig.icon} ${categoryConfig.label}
                </span>
                <div style="font-size: 12px; margin-top: 4px; color: rgba(255,255,255,0.7);">
                    ${sanction.title || 'Sin título'}
                </div>
            </td>
            <td>
                <span class="severity-badge ${sanction.severity || 'warning'}">
                    ${severityConfig.icon} ${severityConfig.label}
                </span>
                ${sanction.suspension_days > 0 ? `
                    <div style="font-size: 11px; margin-top: 4px; color: #af7ac5;">
                        ⏱️ ${sanction.suspension_days} días
                    </div>
                ` : ''}
            </td>
            <td>
                <span class="status-badge ${sanction.workflow_status || 'draft'}">
                    ${statusConfig.icon} ${statusConfig.label}
                </span>
            </td>
            <td style="color: rgba(255,255,255,0.6); font-size: 13px;">
                ${date}
            </td>
            <td>
                ${renderRowActions(sanction)}
            </td>
        </tr>
    `;
}

function renderRowActions(sanction) {
    const status = sanction.workflow_status || 'draft';
    let actions = [];

    // Ver detalle siempre disponible
    actions.push(`
        <button class="action-btn primary" onclick="SanctionsManagement.showDetail(${sanction.id})">
            👁️ Ver
        </button>
    `);

    // Acciones según estado y rol
    switch (status) {
        case 'draft':
            actions.push(`
                <button class="action-btn warning" onclick="SanctionsManagement.submitForReview(${sanction.id})">
                    📤 Enviar
                </button>
            `);
            break;

        case 'pending_lawyer':
            if (state.userRole === 'legal' || state.userRole === 'admin') {
                actions.push(`
                    <button class="action-btn success" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'lawyer_approve')">
                        ✅ Aprobar
                    </button>
                    <button class="action-btn danger" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'lawyer_reject')">
                        ❌ Rechazar
                    </button>
                `);
            }
            break;

        case 'pending_hr':
            if (state.userRole === 'rrhh' || state.userRole === 'admin') {
                actions.push(`
                    <button class="action-btn success" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'hr_confirm')">
                        ✅ Confirmar
                    </button>
                `);
            }
            break;

        case 'active':
            actions.push(`
                <button class="action-btn secondary" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'close')">
                    📁 Cerrar
                </button>
            `);
            break;

        case 'appealed':
            if (state.userRole === 'rrhh' || state.userRole === 'legal' || state.userRole === 'admin') {
                actions.push(`
                    <button class="action-btn warning" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'resolve_appeal')">
                        ⚖️ Resolver
                    </button>
                `);
            }
            break;
    }

    return actions.join('');
}

// ============================================================================
// MODAL RENDERS
// ============================================================================
function renderCreateModal() {
    return `
        <div class="sanctions-modal" id="create-sanction-modal" style="display: flex;">
            <div class="sanctions-modal-content" style="max-width: 1000px;">
                <div class="sanctions-modal-header">
                    <h3>📝 Nueva Solicitud de Sanción</h3>
                    <button class="sanctions-modal-close" onclick="SanctionsManagement.closeModals()">&times;</button>
                </div>
                <div class="sanctions-modal-body">
                    <div class="info-box info">
                        <div class="info-icon">ℹ️</div>
                        <div class="info-content">
                            <h4>Flujo de Aprobación</h4>
                            <p>La sanción pasará por revisión legal (si aplica) y confirmación de RRHH antes de activarse. El empleado será notificado en cada etapa.</p>
                        </div>
                    </div>

                    <form id="create-sanction-form" onsubmit="SanctionsManagement.submitCreate(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>👤 Empleado *</label>
                                <select name="employee_id" id="sanction-employee" required>
                                    <option value="">Seleccionar empleado...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>📂 Tipo de Sanción *</label>
                                <select name="sanction_type_id" id="sanction-type" required onchange="SanctionsManagement.onTypeChange(this)">
                                    <option value="">Seleccionar tipo...</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>
                                    ⚠️ Severidad *
                                    <span class="tooltip-container">
                                        <span class="tooltip-icon">?</span>
                                        <span class="tooltip-text">La severidad determina el impacto en el scoring del empleado y las acciones a tomar.</span>
                                    </span>
                                </label>
                                <select name="severity" id="sanction-severity" required>
                                    <option value="warning">⚠️ Advertencia (-5 pts)</option>
                                    <option value="minor">🔸 Sanción Menor (-10 pts)</option>
                                    <option value="major">🔴 Sanción Mayor (-20 pts)</option>
                                    <option value="suspension">⛔ Suspensión (-30 pts)</option>
                                    <option value="termination">🚫 Despido (-100 pts)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>📌 Categoría</label>
                                <select name="category" id="sanction-category">
                                    <option value="attendance">⏰ Asistencia</option>
                                    <option value="training">📚 Capacitación</option>
                                    <option value="behavior">🤝 Comportamiento</option>
                                    <option value="performance">📊 Desempeño</option>
                                    <option value="safety">🦺 Seguridad</option>
                                    <option value="other">📋 Otro</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>📋 Título *</label>
                            <input type="text" name="title" required placeholder="Ej: Llegadas tardías reiteradas" maxlength="200">
                        </div>

                        <div class="form-group">
                            <label>📝 Descripción Detallada *</label>
                            <textarea name="description" required placeholder="Describa detalladamente el motivo de la sanción, incluyendo fechas, hechos y cualquier evidencia relevante..." rows="4"></textarea>
                        </div>

                        <div id="suspension-fields" style="display: none;">
                            <div class="suspension-alert">
                                <h4>⛔ Configuración de Suspensión</h4>
                                <p style="color: rgba(255,255,255,0.7); font-size: 13px;">
                                    Los días de suspensión se calculan según el calendario del turno asignado al empleado (días laborables).
                                </p>
                                <div class="form-row" style="margin-top: 15px;">
                                    <div class="form-group">
                                        <label>📅 Fecha de Inicio</label>
                                        <input type="date" name="suspension_start_date" id="suspension-start">
                                    </div>
                                    <div class="form-group">
                                        <label>⏱️ Días Laborables de Suspensión</label>
                                        <input type="number" name="suspension_days" id="suspension-days" min="1" max="30" placeholder="Ej: 3">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>📬 Método de Notificación</label>
                                <select name="delivery_method">
                                    <option value="system">💻 Sistema (notificación interna)</option>
                                    <option value="email">📧 Email</option>
                                    <option value="carta_documento">📜 Carta Documento</option>
                                    <option value="presencial">🤝 Presencial</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>📎 Evidencia (Referencias)</label>
                                <input type="text" name="evidence_notes" placeholder="IDs de documentos, testigos, registros...">
                            </div>
                        </div>

                        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 10px; display: flex; justify-content: flex-end; gap: 15px;">
                            <button type="button" class="action-btn secondary" onclick="SanctionsManagement.closeModals()">
                                Cancelar
                            </button>
                            <button type="submit" class="action-btn danger">
                                📝 Crear como Borrador
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function renderDetailModal() {
    return `
        <div class="sanctions-modal" id="detail-sanction-modal" style="display: none;">
            <div class="sanctions-modal-content">
                <div class="sanctions-modal-header">
                    <h3>📋 Detalle de Sanción</h3>
                    <button class="sanctions-modal-close" onclick="SanctionsManagement.closeModals()">&times;</button>
                </div>
                <div class="sanctions-modal-body" id="detail-modal-content">
                    <!-- Content loaded dynamically -->
                </div>
            </div>
        </div>
    `;
}

function renderWorkflowActionModal() {
    // Este modal empieza OCULTO y solo se muestra cuando se llama showWorkflowAction
    return `
        <div class="sanctions-modal" id="workflow-action-modal" style="display: none;">
            <div class="sanctions-modal-content" style="max-width: 600px;">
                <div class="sanctions-modal-header">
                    <h3 id="workflow-action-title">⚙️ Acción de Workflow</h3>
                    <button class="sanctions-modal-close" onclick="SanctionsManagement.closeModals()">&times;</button>
                </div>
                <div class="sanctions-modal-body" id="workflow-action-content">
                    <p style="color: rgba(255,255,255,0.6); text-align: center;">Cargando...</p>
                </div>
            </div>
        </div>
    `;
}

function renderDetailContent(sanction) {
    if (!sanction) return '<p>Sanción no encontrada</p>';

    const statusConfig = WORKFLOW_STATUS_CONFIG[sanction.workflow_status] || WORKFLOW_STATUS_CONFIG.draft;
    const severityConfig = SEVERITY_CONFIG[sanction.severity] || SEVERITY_CONFIG.warning;

    return `
        <!-- Workflow Progress -->
        ${renderWorkflowProgress(sanction.workflow_status)}

        <!-- Employee Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px;">
            <div>
                <h4 style="color: #e74c3c; margin: 0 0 15px 0;">👤 Empleado Sancionado</h4>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px;">
                    <p style="margin: 0 0 8px 0;"><strong>Nombre:</strong> ${sanction.employee_name || 'N/A'}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Código:</strong> ${sanction.employee_code || 'N/A'}</p>
                    <p style="margin: 0;"><strong>Departamento:</strong> ${sanction.department_name || 'N/A'}</p>
                </div>
            </div>
            <div>
                <h4 style="color: #e74c3c; margin: 0 0 15px 0;">📋 Información de Sanción</h4>
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px;">
                    <p style="margin: 0 0 8px 0;">
                        <strong>Estado:</strong>
                        <span class="status-badge ${sanction.workflow_status}">${statusConfig.icon} ${statusConfig.label}</span>
                    </p>
                    <p style="margin: 0 0 8px 0;">
                        <strong>Severidad:</strong>
                        <span class="severity-badge ${sanction.severity}">${severityConfig.icon} ${severityConfig.label}</span>
                    </p>
                    <p style="margin: 0;"><strong>Puntos:</strong> ${sanction.points_deducted || severityConfig.points}</p>
                </div>
            </div>
        </div>

        <!-- Sanction Details -->
        <div style="margin-bottom: 25px;">
            <h4 style="color: #e74c3c; margin: 0 0 15px 0;">📝 Detalles</h4>
            <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px;">
                <p style="margin: 0 0 10px 0;"><strong>Título:</strong> ${sanction.title || 'Sin título'}</p>
                <p style="margin: 0 0 10px 0;"><strong>Descripción:</strong></p>
                <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; color: rgba(255,255,255,0.8);">
                    ${sanction.description || 'Sin descripción'}
                </div>
                ${sanction.lawyer_modified_description ? `
                    <p style="margin: 15px 0 10px 0;"><strong>Descripción modificada por Legal:</strong></p>
                    <div style="background: rgba(155,89,182,0.1); padding: 12px; border-radius: 6px; border-left: 3px solid #9b59b6;">
                        ${sanction.lawyer_modified_description}
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- Suspension Info (if applicable) -->
        ${sanction.suspension_days > 0 ? `
            <div class="suspension-alert">
                <h4>⛔ Suspensión Activa</h4>
                <p style="color: rgba(255,255,255,0.7); font-size: 13px;">
                    El empleado tiene bloqueado el fichaje biométrico durante el período de suspensión.
                </p>
                <div class="suspension-dates">
                    <div class="date-item">
                        <div class="date-label">Inicio</div>
                        <div class="date-value">${sanction.suspension_start_date ? new Date(sanction.suspension_start_date).toLocaleDateString('es-AR') : 'N/A'}</div>
                    </div>
                    <div class="date-item">
                        <div class="date-label">Días</div>
                        <div class="date-value">${sanction.suspension_days}</div>
                    </div>
                    <div class="date-item">
                        <div class="date-label">Servidos</div>
                        <div class="date-value">${sanction.days_served || 0}</div>
                    </div>
                </div>
            </div>
        ` : ''}

        <!-- History -->
        <div>
            <h4 style="color: #e74c3c; margin: 0 0 15px 0;">📜 Historial de Cambios</h4>
            <div class="history-timeline" id="sanction-history-${sanction.id}">
                <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">
                    Cargando historial...
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 20px; display: flex; justify-content: flex-end; gap: 15px;">
            ${renderDetailActions(sanction)}
        </div>
    `;
}

function renderWorkflowProgress(currentStatus) {
    const steps = [
        { id: 'draft', label: 'Borrador', icon: '📝' },
        { id: 'pending_lawyer', label: 'Rev. Legal', icon: '⚖️' },
        { id: 'pending_hr', label: 'Conf. RRHH', icon: '👥' },
        { id: 'active', label: 'Activa', icon: '🚨' }
    ];

    const statusOrder = ['draft', 'pending_lawyer', 'pending_hr', 'active'];
    const currentIndex = statusOrder.indexOf(currentStatus);

    // Handle rejected/appealed/closed states
    if (currentStatus === 'rejected') {
        return `
            <div class="workflow-progress" style="background: rgba(231,76,60,0.1);">
                <div style="text-align: center; width: 100%;">
                    <div style="font-size: 40px; margin-bottom: 10px;">❌</div>
                    <div style="color: #e74c3c; font-weight: 600;">Sanción Rechazada</div>
                </div>
            </div>
        `;
    }

    if (currentStatus === 'closed') {
        return `
            <div class="workflow-progress" style="background: rgba(39,174,96,0.1);">
                <div style="text-align: center; width: 100%;">
                    <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
                    <div style="color: #27ae60; font-weight: 600;">Sanción Cerrada</div>
                </div>
            </div>
        `;
    }

    return `
        <div class="workflow-progress">
            ${steps.map((step, index) => {
                let stepClass = 'pending';
                if (index < currentIndex) stepClass = 'completed';
                else if (index === currentIndex) stepClass = 'current';

                return `
                    <div class="workflow-step ${stepClass}">
                        <div class="step-icon">${step.icon}</div>
                        <div class="step-label">${step.label}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderDetailActions(sanction) {
    const status = sanction.workflow_status || 'draft';
    let actions = [];

    actions.push(`
        <button class="action-btn secondary" onclick="SanctionsManagement.closeModals()">
            Cerrar
        </button>
    `);

    switch (status) {
        case 'draft':
            actions.push(`
                <button class="action-btn warning" onclick="SanctionsManagement.submitForReview(${sanction.id})">
                    📤 Enviar a Revisión
                </button>
            `);
            break;

        case 'pending_lawyer':
            if (state.userRole === 'legal' || state.userRole === 'admin') {
                actions.push(`
                    <button class="action-btn danger" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'lawyer_reject')">
                        ❌ Rechazar
                    </button>
                    <button class="action-btn success" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'lawyer_approve')">
                        ✅ Aprobar
                    </button>
                `);
            }
            break;

        case 'pending_hr':
            if (state.userRole === 'rrhh' || state.userRole === 'admin') {
                actions.push(`
                    <button class="action-btn success" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'hr_confirm')">
                        ✅ Confirmar y Activar
                    </button>
                `);
            }
            break;

        case 'active':
            actions.push(`
                <button class="action-btn secondary" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'close')">
                    📁 Cerrar Sanción
                </button>
            `);
            break;

        case 'appealed':
            if (state.userRole === 'rrhh' || state.userRole === 'legal' || state.userRole === 'admin') {
                actions.push(`
                    <button class="action-btn warning" onclick="SanctionsManagement.showWorkflowAction(${sanction.id}, 'resolve_appeal')">
                        ⚖️ Resolver Apelación
                    </button>
                `);
            }
            break;
    }

    return actions.join('');
}

function renderWorkflowActionContent(sanctionId, action) {
    const actionConfigs = {
        lawyer_approve: {
            title: '✅ Aprobar Sanción (Legal)',
            description: 'Al aprobar, la sanción pasará a RRHH para confirmación final.',
            fields: `
                <div class="form-group">
                    <label>📝 Notas de Revisión (opcional)</label>
                    <textarea name="lawyer_notes" placeholder="Observaciones legales, recomendaciones..." rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>✏️ Modificar Descripción (opcional)</label>
                    <textarea name="modified_description" placeholder="Si desea modificar la descripción original..." rows="3"></textarea>
                </div>
            `,
            buttonText: '✅ Aprobar',
            buttonClass: 'success'
        },
        lawyer_reject: {
            title: '❌ Rechazar Sanción (Legal)',
            description: 'Al rechazar, la sanción será cancelada y se notificará al solicitante.',
            fields: `
                <div class="form-group">
                    <label>📝 Motivo del Rechazo *</label>
                    <textarea name="rejection_reason" required placeholder="Explique el motivo del rechazo..." rows="4"></textarea>
                </div>
            `,
            buttonText: '❌ Rechazar',
            buttonClass: 'danger'
        },
        hr_confirm: {
            title: '✅ Confirmar Sanción (RRHH)',
            description: 'Al confirmar, la sanción se activará y el empleado será notificado. Si es suspensión, se bloqueará el fichaje.',
            fields: `
                <div class="form-group">
                    <label>📝 Notas de RRHH (opcional)</label>
                    <textarea name="hr_notes" placeholder="Observaciones adicionales..." rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>📅 Fecha de Inicio de Suspensión (si aplica)</label>
                    <input type="date" name="suspension_start_date">
                </div>
            `,
            buttonText: '✅ Confirmar y Activar',
            buttonClass: 'success'
        },
        close: {
            title: '📁 Cerrar Sanción',
            description: 'Marcar la sanción como completada/cerrada.',
            fields: `
                <div class="form-group">
                    <label>📝 Notas de Cierre (opcional)</label>
                    <textarea name="close_notes" placeholder="Motivo del cierre..." rows="3"></textarea>
                </div>
            `,
            buttonText: '📁 Cerrar',
            buttonClass: 'secondary'
        },
        resolve_appeal: {
            title: '⚖️ Resolver Apelación',
            description: 'Decidir sobre la apelación presentada por el empleado.',
            fields: `
                <div class="form-group">
                    <label>📋 Decisión *</label>
                    <select name="appeal_resolution" required>
                        <option value="">Seleccionar...</option>
                        <option value="upheld">✅ Mantener Sanción (rechazar apelación)</option>
                        <option value="reduced">🔽 Reducir Severidad</option>
                        <option value="revoked">❌ Revocar Sanción (aceptar apelación)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>📝 Justificación *</label>
                    <textarea name="appeal_notes" required placeholder="Fundamentos de la decisión..." rows="4"></textarea>
                </div>
            `,
            buttonText: '⚖️ Resolver',
            buttonClass: 'warning'
        }
    };

    const config = actionConfigs[action];
    if (!config) return '<p>Acción no válida</p>';

    document.getElementById('workflow-action-title').textContent = config.title;

    return `
        <div class="info-box info">
            <div class="info-icon">ℹ️</div>
            <div class="info-content">
                <p style="margin: 0;">${config.description}</p>
            </div>
        </div>

        <form onsubmit="SanctionsManagement.executeWorkflowAction(event, ${sanctionId}, '${action}')">
            ${config.fields}

            <div style="display: flex; justify-content: flex-end; gap: 15px; margin-top: 25px;">
                <button type="button" class="action-btn secondary" onclick="SanctionsManagement.closeModals()">
                    Cancelar
                </button>
                <button type="submit" class="action-btn ${config.buttonClass}">
                    ${config.buttonText}
                </button>
            </div>
        </form>
    `;
}

function renderHistoryTimeline(history) {
    if (!history || history.length === 0) {
        return '<p style="text-align: center; color: rgba(255,255,255,0.5);">Sin historial registrado</p>';
    }

    return history.map(item => {
        const date = new Date(item.created_at).toLocaleString('es-AR');
        return `
            <div class="history-item" style="border-left-color: ${getActionColor(item.action)};">
                <div class="history-date">${date}</div>
                <div class="history-action">${getActionLabel(item.action)}</div>
                <div class="history-actor">Por: ${item.actor_name || 'Sistema'}</div>
                ${item.notes ? `<div style="margin-top: 8px; font-size: 13px; color: rgba(255,255,255,0.6);">${item.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ============================================================================
// API FUNCTIONS
// ============================================================================
async function loadInitialData() {
    state.loading = true;
    updateUI(); // Show loading state

    try {
        const token = getAuthToken();

        if (!token) {
            console.error('❌ [SANCTIONS-v2] No auth token found');
            showError('Sesión no válida. Por favor recargue la página.');
            state.loading = false;
            updateUI();
            return;
        }

        // Load in parallel with error handling for each
        const results = await Promise.allSettled([
            loadSanctions(),
            loadSanctionTypes(),
            loadEmployees(),
            loadStats()
        ]);

        // Log individual errors but don't fail completely
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const names = ['sanctions', 'types', 'employees', 'stats'];
                console.warn(`⚠️ [SANCTIONS-v2] Error loading ${names[index]}:`, result.reason);
            }
        });

        console.log('✅ [SANCTIONS-v2] Data loaded:', {
            sanctions: state.sanctions.length,
            types: state.sanctionTypes.length,
            employees: state.employees.length,
            stats: state.stats
        });

    } catch (error) {
        console.error('❌ [SANCTIONS-v2] Error loading data:', error);
        showError('Error cargando datos: ' + error.message);
    }

    state.loading = false;
    updateUI();
}

async function loadSanctions() {
    const token = getAuthToken();

    let endpoint = '/api/v1/sanctions';

    // Adjust endpoint based on current tab
    switch (state.currentTab) {
        case 'pending-review':
            endpoint = '/api/v1/sanctions/pending-review';
            break;
        case 'active':
            endpoint = '/api/v1/sanctions?status=active';
            break;
        case 'suspensions':
            endpoint = '/api/v1/sanctions/blocks';
            break;
        case 'history':
            endpoint = '/api/v1/sanctions?status=closed,rejected';
            break;
    }

    const response = await fetch(endpoint, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    state.sanctions = data.sanctions || data.blocks || [];

    console.log('✅ [SANCTIONS-v2] Sanciones cargadas:', state.sanctions.length);
}

async function loadSanctionTypes() {
    const token = getAuthToken();

    try {
        const response = await fetch('/api/v1/sanctions/types', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            state.sanctionTypes = data.types || [];
        }
    } catch (error) {
        console.warn('⚠️ [SANCTIONS-v2] Could not load types:', error);
        // Use default types
        state.sanctionTypes = [];
    }
}

async function loadEmployees() {
    const token = getAuthToken();

    try {
        const response = await fetch('/api/v1/users?role=employee&limit=1000', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            state.employees = data.users || [];
        }
    } catch (error) {
        console.warn('⚠️ [SANCTIONS-v2] Could not load employees:', error);
    }
}

async function loadStats() {
    const token = getAuthToken();

    try {
        const response = await fetch('/api/v1/sanctions/stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            state.stats = data.stats || {};
        }
    } catch (error) {
        console.warn('⚠️ [SANCTIONS-v2] Could not load stats:', error);
    }
}

async function loadSanctionHistory(sanctionId) {
    const token = getAuthToken();

    try {
        const response = await fetch(`/api/v1/sanctions/${sanctionId}/history`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const container = document.getElementById(`sanction-history-${sanctionId}`);
            if (container) {
                container.innerHTML = renderHistoryTimeline(data.history || []);
            }
        }
    } catch (error) {
        console.warn('⚠️ [SANCTIONS-v2] Could not load history:', error);
    }
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================
async function submitCreate(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Validate
    if (!data.employee_id || !data.title || !data.description) {
        showError('Por favor complete todos los campos requeridos');
        return;
    }

    try {
        const token = getAuthToken();

        const response = await fetch('/api/v1/sanctions/request', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error creando sanción');
        }

        const result = await response.json();

        showSuccess('Sanción creada como borrador');
        closeModals();
        loadInitialData();

    } catch (error) {
        console.error('❌ [SANCTIONS-v2] Error creating:', error);
        showError(error.message);
    }
}

async function submitForReview(sanctionId) {
    if (!confirm('¿Enviar esta sanción a revisión legal?')) return;

    try {
        const token = getAuthToken();

        const response = await fetch(`/api/v1/sanctions/${sanctionId}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error enviando sanción');
        }

        showSuccess('Sanción enviada a revisión');
        closeModals();
        loadInitialData();

    } catch (error) {
        console.error('❌ [SANCTIONS-v2] Error submitting:', error);
        showError(error.message);
    }
}

async function executeWorkflowAction(event, sanctionId, action) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const endpoints = {
        lawyer_approve: `/api/v1/sanctions/${sanctionId}/lawyer-approve`,
        lawyer_reject: `/api/v1/sanctions/${sanctionId}/lawyer-reject`,
        hr_confirm: `/api/v1/sanctions/${sanctionId}/hr-confirm`,
        close: `/api/v1/sanctions/${sanctionId}/close`,
        resolve_appeal: `/api/v1/sanctions/${sanctionId}/resolve-appeal`
    };

    try {
        const token = getAuthToken();

        const response = await fetch(endpoints[action], {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error ejecutando acción');
        }

        showSuccess('Acción completada exitosamente');
        closeModals();
        loadInitialData();

    } catch (error) {
        console.error('❌ [SANCTIONS-v2] Error executing action:', error);
        showError(error.message);
    }
}

// ============================================================================
// UI HELPERS
// ============================================================================
function updateUI() {
    // Update stats
    const statsContainer = document.getElementById('sanctions-stats');
    if (statsContainer) {
        statsContainer.innerHTML = renderStats();
    }

    // Update tabs
    const tabsContainer = document.getElementById('sanctions-tabs');
    if (tabsContainer) {
        tabsContainer.innerHTML = renderTabs();
    }

    // Update list
    const listContainer = document.getElementById('sanctions-list-container');
    if (listContainer) {
        listContainer.innerHTML = renderSanctionsList();
    }
}

function switchTab(tabId) {
    state.currentTab = tabId;
    state.loading = true;
    updateUI();
    loadSanctions().then(() => {
        state.loading = false;
        updateUI();
    });
}

function showCreateModal() {
    const container = document.getElementById('create-modal-container');
    if (!container) return;

    container.innerHTML = renderCreateModal();
    const modal = document.getElementById('create-sanction-modal');
    if (modal) {
        modal.style.display = 'flex';
        populateEmployeeSelect();
        populateTypeSelect();
    }
}

async function showDetail(sanctionId) {
    const container = document.getElementById('detail-modal-container');
    if (!container) return;

    // Crear modal con loading
    container.innerHTML = `
        <div class="sanctions-modal" id="detail-sanction-modal" style="display: flex;">
            <div class="sanctions-modal-content">
                <div class="sanctions-modal-header">
                    <h3>📋 Detalle de Sanción</h3>
                    <button class="sanctions-modal-close" onclick="SanctionsManagement.closeModals()">&times;</button>
                </div>
                <div class="sanctions-modal-body" id="detail-modal-content">
                    ${renderLoading()}
                </div>
            </div>
        </div>
    `;

    try {
        const token = getAuthToken();
        const response = await fetch(`/api/v1/sanctions/${sanctionId}/detail`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error loading sanction');

        const data = await response.json();
        state.selectedSanction = data.sanction;

        const content = document.getElementById('detail-modal-content');
        if (content) {
            content.innerHTML = renderDetailContent(data.sanction);
        }

        // Load history
        loadSanctionHistory(sanctionId);

    } catch (error) {
        console.error('❌ [SANCTIONS-v2] Error loading detail:', error);
        const content = document.getElementById('detail-modal-content');
        if (content) {
            content.innerHTML = `<div class="info-box error"><div class="info-icon">❌</div><div class="info-content"><p>Error cargando detalles: ${error.message}</p></div></div>`;
        }
    }
}

function showWorkflowAction(sanctionId, action) {
    // Crear modal dinámicamente solo cuando se necesita
    const container = document.getElementById('workflow-action-modal-container');
    if (!container) return;

    // Renderizar el modal completo
    container.innerHTML = `
        <div class="sanctions-modal" id="workflow-action-modal" style="display: flex;">
            <div class="sanctions-modal-content" style="max-width: 600px;">
                <div class="sanctions-modal-header">
                    <h3 id="workflow-action-title">⚙️ Acción de Workflow</h3>
                    <button class="sanctions-modal-close" onclick="SanctionsManagement.closeModals()">&times;</button>
                </div>
                <div class="sanctions-modal-body" id="workflow-action-content">
                    ${renderWorkflowActionContent(sanctionId, action)}
                </div>
            </div>
        </div>
    `;
}

function closeModals() {
    // Limpiar todos los contenedores de modales
    ['create-modal-container', 'detail-modal-container', 'workflow-action-modal-container'].forEach(id => {
        const container = document.getElementById(id);
        if (container) container.innerHTML = '';
    });
}

function populateEmployeeSelect() {
    const select = document.getElementById('sanction-employee');
    if (select && state.employees.length > 0) {
        select.innerHTML = '<option value="">Seleccionar empleado...</option>' +
            state.employees.map(e => `
                <option value="${e.user_id}">${e.firstName} ${e.lastName} - ${e.employeeId || 'N/A'}</option>
            `).join('');
    }
}

function populateTypeSelect() {
    const select = document.getElementById('sanction-type');
    if (select && state.sanctionTypes.length > 0) {
        select.innerHTML = '<option value="">Seleccionar tipo...</option>' +
            state.sanctionTypes.map(t => `
                <option value="${t.id}" data-severity="${t.default_severity}" data-category="${t.category}">
                    ${t.name}
                </option>
            `).join('');
    }
}

function onTypeChange(select) {
    const option = select.options[select.selectedIndex];
    if (option) {
        const severity = option.dataset.severity;
        const category = option.dataset.category;

        if (severity) {
            const severitySelect = document.getElementById('sanction-severity');
            if (severitySelect) severitySelect.value = severity;
        }

        if (category) {
            const categorySelect = document.getElementById('sanction-category');
            if (categorySelect) categorySelect.value = category;
        }
    }
}

function onSeverityChange(select) {
    const suspensionFields = document.getElementById('suspension-fields');
    if (suspensionFields) {
        suspensionFields.style.display = select.value === 'suspension' ? 'block' : 'none';
    }
}

// Watch for severity changes
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'sanction-severity') {
        onSeverityChange(e.target);
    }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function getAuthToken() {
    return localStorage.getItem('authToken') ||
           sessionStorage.getItem('authToken') ||
           window.authToken;
}

function detectUserRole() {
    try {
        const token = getAuthToken();
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role || 'employee';
        }
    } catch (e) {}
    return 'employee';
}

function showSuccess(message) {
    // Use existing notification system if available
    if (window.showNotification) {
        window.showNotification(message, 'success');
    } else {
        alert('✅ ' + message);
    }
}

function showError(message) {
    if (window.showNotification) {
        window.showNotification(message, 'error');
    } else {
        alert('❌ ' + message);
    }
}

function getActionColor(action) {
    const colors = {
        created: '#3498db',
        submitted: '#f39c12',
        lawyer_approved: '#27ae60',
        lawyer_rejected: '#e74c3c',
        lawyer_modified: '#9b59b6',
        hr_confirmed: '#27ae60',
        activated: '#e74c3c',
        appealed: '#3498db',
        appeal_resolved: '#f39c12',
        closed: '#95a5a6'
    };
    return colors[action] || '#95a5a6';
}

function getActionLabel(action) {
    const labels = {
        created: '📝 Sanción creada',
        submitted: '📤 Enviada a revisión',
        lawyer_approved: '✅ Aprobada por Legal',
        lawyer_rejected: '❌ Rechazada por Legal',
        lawyer_modified: '✏️ Modificada por Legal',
        hr_confirmed: '✅ Confirmada por RRHH',
        activated: '🚨 Sanción activada',
        appealed: '📨 Apelación registrada',
        appeal_resolved: '⚖️ Apelación resuelta',
        closed: '📁 Sanción cerrada'
    };
    return labels[action] || action;
}

// ============================================================================
// PUBLIC API
// ============================================================================
window.SanctionsManagement = {
    init: showSanctionsManagementContent,
    switchTab,
    showCreateModal,
    showDetail,
    showWorkflowAction,
    closeModals,
    submitCreate,
    submitForReview,
    executeWorkflowAction,
    onTypeChange,
    onSeverityChange
};

// Legacy support
window.showSanctionsManagementContent = showSanctionsManagementContent;

// Module registration
window.Modules = window.Modules || {};
window.Modules['sanctions-management'] = {
    init: showSanctionsManagementContent
};

console.log('✅ [SANCTIONS-v2] Módulo de sanciones enterprise cargado');
