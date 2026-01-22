/**
 * VENDOR DASHBOARD - Portal del Vendedor APONNT
 * DARK THEME EDITION
 *
 * Dashboard personal del vendedor con acceso a:
 * - Mis Empresas (clientes asignados)
 * - Mis Comisiones
 * - Mis Notificaciones Comerciales
 * - Presupuestos
 * - Contratos
 * - Métricas de Facturación
 *
 * Para Admins/Gerentes:
 * - Vista global con filtros por vendedor
 * - Métricas consolidadas
 * - Rankings de vendedores
 *
 * @version 1.0.0
 * @date 2025-12-16
 */

(function() {
    'use strict';

    const MODULE_ID = 'vendor-dashboard';

    // Estado del módulo
    const state = {
        staff: null,           // Datos del vendedor/staff actual
        isAdmin: false,        // true si es admin/gerente
        vendors: [],           // Lista de vendedores (para admin)
        selectedVendorId: null,// Vendedor seleccionado (para filtro admin)
        companies: [],         // Empresas del vendedor
        commissions: [],       // Comisiones
        notifications: [],     // Notificaciones comerciales
        budgets: [],           // Presupuestos
        contracts: [],         // Contratos
        metrics: {},           // Métricas calculadas
        currentTab: 'overview',
        initialized: false,
        // Permisos del usuario actual
        permissions: {
            dataScope: 'own',
            canEdit: false,
            canAddModules: false,
            canCreateBudgets: false,
            canPayCommissions: false,
            hasFullAccess: false
        },
        roleType: null,
        roleName: null
    };

    // Estilos CSS Dark Theme
    const styles = `
        /* ========== CONTENEDOR PRINCIPAL ========== */
        .vendor-dashboard {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
            color: #e0e0e0;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            padding: 25px;
        }

        /* ========== HEADER DEL VENDEDOR ========== */
        .vendor-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
            padding: 25px 30px;
            background: rgba(15, 15, 30, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
            flex-wrap: wrap;
        }

        .vendor-user-info {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .vendor-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            color: white;
            box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
        }

        .vendor-greeting h2 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, #ffffff, #f59e0b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .vendor-greeting p {
            margin: 5px 0 0;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.95rem;
        }

        .vendor-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-left: 10px;
        }

        .vendor-badge.admin {
            background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        }

        /* ========== FILTRO ADMIN ========== */
        .vendor-admin-filter {
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 12px;
            padding: 15px 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;
        }

        .vendor-admin-filter label {
            color: #a78bfa;
            font-weight: 600;
            font-size: 0.9rem;
        }

        .vendor-admin-filter select,
        .vendor-admin-filter input {
            background: rgba(15, 15, 30, 0.8);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 8px;
            color: #e0e0e0;
            padding: 8px 12px;
            font-size: 0.9rem;
            min-width: 200px;
        }

        .vendor-admin-filter select:focus,
        .vendor-admin-filter input:focus {
            outline: none;
            border-color: #8b5cf6;
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }

        /* ========== STATS BAR ========== */
        .vendor-stats {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .vendor-stat {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 18px;
            text-align: center;
            min-width: 100px;
            transition: all 0.3s ease;
        }

        .vendor-stat:hover {
            background: rgba(245, 158, 11, 0.1);
            border-color: rgba(245, 158, 11, 0.3);
        }

        .vendor-stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #f59e0b;
        }

        .vendor-stat-value.positive { color: #22c55e; }
        .vendor-stat-value.negative { color: #ef4444; }

        .vendor-stat-label {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* ========== TABS DE NAVEGACIÓN ========== */
        .vendor-tabs {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-bottom: 25px;
            background: rgba(15, 15, 30, 0.5);
            padding: 8px;
            border-radius: 12px;
            overflow-x: auto;
        }

        .vendor-tab {
            padding: 10px 16px;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.85rem;
            font-weight: 500;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.3s ease;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .vendor-tab:hover {
            background: rgba(245, 158, 11, 0.1);
            color: #f59e0b;
        }

        .vendor-tab.active {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }

        .vendor-tab-badge {
            background: rgba(255, 255, 255, 0.2);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 700;
        }

        .vendor-tab.active .vendor-tab-badge {
            background: rgba(255, 255, 255, 0.3);
        }

        /* ========== PANEL DE CONTENIDO ========== */
        .vendor-panel {
            display: none;
            animation: fadeIn 0.3s ease;
        }

        .vendor-panel.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* ========== SECCIÓN TÍTULO ========== */
        .vendor-section-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            font-size: 1.3rem;
            font-weight: 600;
            color: #ffffff;
        }

        .vendor-section-title i,
        .vendor-section-title span.icon {
            color: #f59e0b;
        }

        /* ========== GRID DE MÉTRICAS ========== */
        .vendor-metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        /* ========== TARJETA DE MÉTRICA ========== */
        .vendor-metric-card {
            background: rgba(15, 15, 30, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 25px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .vendor-metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--card-accent, #f59e0b);
            opacity: 0.8;
        }

        .vendor-metric-card:hover {
            transform: translateY(-3px);
            border-color: rgba(245, 158, 11, 0.3);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .vendor-metric-card .metric-icon {
            font-size: 2rem;
            margin-bottom: 15px;
            color: var(--card-accent, #f59e0b);
        }

        .vendor-metric-card .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 5px;
        }

        .vendor-metric-card .metric-label {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .vendor-metric-card .metric-change {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 10px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .vendor-metric-card .metric-change.positive {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }

        .vendor-metric-card .metric-change.negative {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }

        /* ========== TABLA ========== */
        .vendor-table-container {
            background: rgba(15, 15, 30, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            overflow: hidden;
            margin-bottom: 25px;
        }

        .vendor-table {
            width: 100%;
            border-collapse: collapse;
        }

        .vendor-table th {
            background: rgba(245, 158, 11, 0.1);
            padding: 15px 20px;
            text-align: left;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #f59e0b;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .vendor-table td {
            padding: 15px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            color: #e0e0e0;
            font-size: 0.9rem;
        }

        .vendor-table tr:hover td {
            background: rgba(245, 158, 11, 0.05);
        }

        .vendor-table tr:last-child td {
            border-bottom: none;
        }

        /* ========== STATUS BADGES ========== */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .status-badge.active { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .status-badge.pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .status-badge.inactive { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
        .status-badge.paid { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .status-badge.overdue { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .status-badge.sent { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        .status-badge.signed { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }

        /* ========== BOTONES ========== */
        .vendor-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .vendor-btn-primary {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
        }

        .vendor-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(245, 158, 11, 0.4);
        }

        .vendor-btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: #e0e0e0;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .vendor-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }

        /* ========== NOTIFICACIONES ========== */
        .vendor-notification-item {
            background: rgba(15, 15, 30, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 15px 20px;
            margin-bottom: 12px;
            display: flex;
            gap: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .vendor-notification-item:hover {
            background: rgba(245, 158, 11, 0.05);
            border-color: rgba(245, 158, 11, 0.2);
        }

        .vendor-notification-item.unread {
            border-left: 3px solid #f59e0b;
            background: rgba(245, 158, 11, 0.05);
        }

        .vendor-notification-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
        }

        .vendor-notification-content {
            flex: 1;
        }

        .vendor-notification-title {
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 4px;
        }

        .vendor-notification-message {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.9rem;
            margin-bottom: 8px;
        }

        .vendor-notification-meta {
            display: flex;
            gap: 15px;
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.4);
        }

        /* ========== EMPTY STATE ========== */
        .vendor-empty {
            text-align: center;
            padding: 60px 20px;
            color: rgba(255, 255, 255, 0.4);
        }

        .vendor-empty-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.5;
        }

        .vendor-empty h3 {
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 10px;
        }

        /* ========== LOADING ========== */
        .vendor-loading {
            text-align: center;
            padding: 60px 20px;
        }

        .vendor-loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: #f59e0b;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 768px) {
            .vendor-dashboard { padding: 15px; }
            .vendor-header { padding: 20px; flex-direction: column; text-align: center; }
            .vendor-user-info { flex-direction: column; }
            .vendor-stats { justify-content: center; }
            .vendor-tabs { justify-content: flex-start; }
            .vendor-metrics-grid { grid-template-columns: 1fr; }
        }

        /* ========== MODAL EMPRESA/PRESUPUESTO ========== */
        .vendor-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }

        .vendor-modal {
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            width: 100%;
            max-width: 900px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .vendor-modal-header {
            padding: 20px 25px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(245, 158, 11, 0.1);
        }

        .vendor-modal-header h3 {
            margin: 0;
            font-size: 1.3rem;
            color: #f59e0b;
        }

        .vendor-modal-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 1.5rem;
            cursor: pointer;
            padding: 5px 10px;
            border-radius: 8px;
            transition: all 0.2s;
        }

        .vendor-modal-close:hover {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
        }

        .vendor-modal-body {
            padding: 25px;
            overflow-y: auto;
            flex: 1;
        }

        .vendor-modal-footer {
            padding: 15px 25px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            background: rgba(0, 0, 0, 0.2);
        }

        /* ========== FORMULARIO ========== */
        .vendor-form-section {
            margin-bottom: 25px;
        }

        .vendor-form-section h4 {
            color: #f59e0b;
            margin: 0 0 15px;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .vendor-form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .vendor-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .vendor-form-group label {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.85rem;
            font-weight: 500;
        }

        .vendor-form-group input,
        .vendor-form-group select,
        .vendor-form-group textarea {
            background: rgba(15, 15, 30, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: #e0e0e0;
            padding: 10px 12px;
            font-size: 0.9rem;
            transition: all 0.2s;
        }

        .vendor-form-group input:focus,
        .vendor-form-group select:focus,
        .vendor-form-group textarea:focus {
            outline: none;
            border-color: #f59e0b;
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
        }

        .vendor-form-group.full-width {
            grid-column: 1 / -1;
        }

        /* ========== SELECTOR DE MÓDULOS ========== */
        .vendor-modules-selector {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 12px;
            max-height: 350px;
            overflow-y: auto;
            padding: 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 12px;
        }

        .vendor-module-card {
            background: rgba(15, 15, 30, 0.6);
            border: 2px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .vendor-module-card:hover {
            border-color: rgba(245, 158, 11, 0.3);
            background: rgba(245, 158, 11, 0.05);
        }

        .vendor-module-card.selected {
            border-color: #22c55e;
            background: rgba(34, 197, 94, 0.1);
        }

        .vendor-module-card.is-core {
            border-color: rgba(139, 92, 246, 0.3);
            background: rgba(139, 92, 246, 0.05);
        }

        .vendor-module-card.is-core.selected {
            border-color: #8b5cf6;
            background: rgba(139, 92, 246, 0.15);
        }

        .vendor-module-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .vendor-module-name {
            font-weight: 600;
            color: #fff;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .vendor-module-price {
            color: #22c55e;
            font-weight: 700;
            font-size: 0.9rem;
            white-space: nowrap;
        }

        .vendor-module-desc {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.8rem;
            line-height: 1.4;
        }

        .vendor-module-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 600;
        }

        .vendor-module-badge.core {
            background: rgba(139, 92, 246, 0.3);
            color: #a78bfa;
        }

        .vendor-module-badge.category {
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
        }

        /* ========== RESUMEN DE PRESUPUESTO ========== */
        .vendor-budget-summary {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
        }

        .vendor-budget-summary h4 {
            color: #22c55e;
            margin: 0 0 15px;
        }

        .vendor-budget-line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .vendor-budget-line:last-child {
            border-bottom: none;
        }

        .vendor-budget-total {
            font-size: 1.5rem;
            font-weight: 700;
            color: #22c55e;
            padding-top: 15px;
            margin-top: 10px;
            border-top: 2px solid rgba(34, 197, 94, 0.3);
            display: flex;
            justify-content: space-between;
        }

        /* ========== HISTORIAL ========== */
        .vendor-history-item {
            background: rgba(15, 15, 30, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .vendor-history-item.vigente {
            border-color: rgba(34, 197, 94, 0.3);
            background: rgba(34, 197, 94, 0.05);
        }

        .vendor-history-item.caducado {
            opacity: 0.6;
        }

        /* ========== WORKFLOW STATUS ========== */
        .vendor-workflow-status {
            display: flex;
            gap: 5px;
            align-items: center;
            flex-wrap: wrap;
        }

        .vendor-workflow-step {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .vendor-workflow-step.active {
            background: rgba(245, 158, 11, 0.2);
            color: #f59e0b;
        }

        .vendor-workflow-step.completed {
            background: rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }

        .vendor-workflow-step.pending {
            background: rgba(107, 114, 128, 0.2);
            color: #9ca3af;
        }

        .vendor-workflow-arrow {
            color: rgba(255, 255, 255, 0.3);
        }

        /* ========== BOTONES PEQUEÑOS ========== */
        .vendor-btn-sm {
            padding: 6px 12px;
            background: rgba(245, 158, 11, 0.2);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 6px;
            color: #f59e0b;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.2s;
        }

        .vendor-btn-sm:hover {
            background: rgba(245, 158, 11, 0.3);
            border-color: #f59e0b;
        }
    `;

    // API del Vendedor
    const VendorAPI = {
        baseUrl: '/api/aponnt/dashboard',

        getHeaders() {
            const token = localStorage.getItem('aponntToken') ||
                         localStorage.getItem('authToken') ||
                         localStorage.getItem('token') || '';
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
        },

        async getCurrentStaff() {
            try {
                const staffData = localStorage.getItem('aponntStaff') || localStorage.getItem('currentStaff');
                if (staffData) {
                    return JSON.parse(staffData);
                }
                // Intentar obtener del servidor
                const res = await fetch(`${this.baseUrl}/current-staff`, { headers: this.getHeaders() });
                if (res.ok) return await res.json();
                return null;
            } catch (e) {
                console.error('[VENDOR] Error getting current staff:', e);
                return null;
            }
        },

        async getVendors() {
            try {
                const res = await fetch(`${this.baseUrl}/vendors`, { headers: this.getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch vendors');
                return await res.json();
            } catch (e) {
                console.error('[VENDOR] Error getting vendors:', e);
                return [];
            }
        },

        async getVendorCompanies(vendorId) {
            try {
                const url = vendorId
                    ? `${this.baseUrl}/vendor-companies/${vendorId}`
                    : `${this.baseUrl}/companies?vendor_only=true`;
                const res = await fetch(url, { headers: this.getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch companies');
                const data = await res.json();
                return data.data || data;
            } catch (e) {
                console.error('[VENDOR] Error getting companies:', e);
                return [];
            }
        },

        async getVendorCommissions(vendorId, period) {
            try {
                let url = `${this.baseUrl}/vendor-commissions`;
                const params = new URLSearchParams();
                if (vendorId) params.append('vendor_id', vendorId);
                if (period) params.append('period', period);
                if (params.toString()) url += `?${params.toString()}`;

                const res = await fetch(url, { headers: this.getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch commissions');
                const data = await res.json();
                return data.data || data;
            } catch (e) {
                console.error('[VENDOR] Error getting commissions:', e);
                return [];
            }
        },

        async getVendorNotifications(vendorId) {
            try {
                const url = vendorId
                    ? `${this.baseUrl}/vendor-notifications/${vendorId}`
                    : `${this.baseUrl}/commercial-notifications`;
                const res = await fetch(url, { headers: this.getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch notifications');
                const data = await res.json();
                return data.data || data;
            } catch (e) {
                console.error('[VENDOR] Error getting notifications:', e);
                return [];
            }
        },

        async getVendorBudgets(vendorId) {
            try {
                let url = `${this.baseUrl}/budgets`;
                if (vendorId) url += `?vendor_id=${vendorId}`;
                const res = await fetch(url, { headers: this.getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch budgets');
                const data = await res.json();
                return data.data || data;
            } catch (e) {
                console.error('[VENDOR] Error getting budgets:', e);
                return [];
            }
        },

        async getVendorContracts(vendorId) {
            try {
                let url = `${this.baseUrl}/contracts`;
                if (vendorId) url += `?vendor_id=${vendorId}`;
                const res = await fetch(url, { headers: this.getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch contracts');
                const data = await res.json();
                return data.data || data;
            } catch (e) {
                console.error('[VENDOR] Error getting contracts:', e);
                return [];
            }
        },

        async getVendorMetrics(vendorId) {
            try {
                let url = `${this.baseUrl}/vendor-metrics`;
                if (vendorId) url += `?vendor_id=${vendorId}`;
                const res = await fetch(url, { headers: this.getHeaders() });
                if (!res.ok) return this.calculateLocalMetrics();
                return await res.json();
            } catch (e) {
                console.error('[VENDOR] Error getting metrics:', e);
                return this.calculateLocalMetrics();
            }
        },

        // ========== MÉTODOS PARA CARGAR TODOS LOS DATOS (SUPERADMIN/GERENTES) ==========

        async getAllCompanies() {
            try {
                // Usa el endpoint /companies que devuelve TODAS las empresas
                const res = await fetch(`${this.baseUrl}/companies`, { headers: this.getHeaders() });
                if (!res.ok) throw new Error('Failed to fetch all companies');
                const data = await res.json();
                // El endpoint puede devolver { companies: [...] } o directamente el array
                return data.companies || data.data || data || [];
            } catch (e) {
                console.error('[VENDOR] Error getting all companies:', e);
                return [];
            }
        },

        async getAllCommissions() {
            try {
                // Sin filtro de vendor_id para obtener todas
                const res = await fetch(`${this.baseUrl}/vendor-commissions`, { headers: this.getHeaders() });
                if (!res.ok) return [];
                const data = await res.json();
                return data.data || data || [];
            } catch (e) {
                console.error('[VENDOR] Error getting all commissions:', e);
                return [];
            }
        },

        async getAllNotifications() {
            try {
                const res = await fetch(`${this.baseUrl}/commercial-notifications`, { headers: this.getHeaders() });
                if (!res.ok) return [];
                const data = await res.json();
                return data.data || data || [];
            } catch (e) {
                console.error('[VENDOR] Error getting all notifications:', e);
                return [];
            }
        },

        async getAllBudgets() {
            try {
                // Sin filtro para obtener todos los presupuestos
                const res = await fetch(`${this.baseUrl}/budgets`, { headers: this.getHeaders() });
                if (!res.ok) return [];
                const data = await res.json();
                return data.data || data || [];
            } catch (e) {
                console.error('[VENDOR] Error getting all budgets:', e);
                return [];
            }
        },

        async getAllContracts() {
            try {
                // Sin filtro para obtener todos los contratos
                const res = await fetch(`${this.baseUrl}/contracts`, { headers: this.getHeaders() });
                if (!res.ok) return [];
                const data = await res.json();
                return data.data || data || [];
            } catch (e) {
                console.error('[VENDOR] Error getting all contracts:', e);
                return [];
            }
        },

        calculateLocalMetrics() {
            // Calcular métricas localmente si el endpoint no existe
            // Usar arrays vacíos por defecto para evitar errores
            const companies = Array.isArray(state.companies) ? state.companies : [];
            const commissions = Array.isArray(state.commissions) ? state.commissions : [];
            const budgets = Array.isArray(state.budgets) ? state.budgets : [];

            return {
                totalCompanies: companies.length,
                activeCompanies: companies.filter(c => c && (c.is_active || c.isActive)).length,
                totalBilling: companies.reduce((sum, c) => sum + (parseFloat(c?.monthly_total || c?.monthlyTotal) || 0), 0),
                pendingCommissions: commissions.filter(c => c?.status === 'pending').reduce((sum, c) => sum + (parseFloat(c?.amount) || 0), 0),
                pendingBudgets: budgets.filter(b => b?.status === 'PENDING').length,
                acceptedBudgets: budgets.filter(b => b?.status === 'ACCEPTED').length
            };
        },

        async markNotificationRead(notifId) {
            try {
                const res = await fetch(`${this.baseUrl}/commercial-notifications/${notifId}/read`, {
                    method: 'PUT',
                    headers: this.getHeaders()
                });
                return res.ok;
            } catch (e) {
                console.error('[VENDOR] Error marking notification read:', e);
                return false;
            }
        }
    };

    // Utilidades
    function formatCurrency(amount) {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount || 0);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    }

    function getRoleColor() {
        if (typeof RolePermissions !== 'undefined' && state.roleType) {
            return RolePermissions.getRoleColor(state.roleType);
        }
        return state.isAdmin ? '#8b5cf6' : '#22c55e';
    }

    function getRoleIcon() {
        const icons = {
            'VENDEDOR': '💼',
            'SUPERVISOR_VENTAS': '📊',
            'SUPERVISOR_SOPORTE': '🎫',
            'ADMINISTRACION': '🧾',
            'INGENIERIA': '🔧',
            'GERENCIA': '👔',
            'GERENTE_GENERAL': '🏆',
            'SUPERADMIN': '⚡'
        };
        return icons[state.roleType] || '👤';
    }

    function injectStyles() {
        if (document.getElementById('vendor-dashboard-styles')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'vendor-dashboard-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }

    function getContainer() {
        // Priorizar el contenedor específico del Vendor Dashboard
        const selectors = ['#vendor-dashboard-container', '#my-vendor-dashboard',
                          '#vendorsContainer', '#vendors-list', '.vendors-grid',
                          '#module-content', '.main-content'];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    // Motor principal
    const VendorDashboard = {
        async init(staffData = null) {
            console.log('[VENDOR-DASHBOARD] Inicializando...');

            // Inicializar todos los arrays del state para evitar errores
            state.companies = [];
            state.commissions = [];
            state.notifications = [];
            state.budgets = [];
            state.contracts = [];
            state.vendors = [];
            state.metrics = { totalBilling: 0, activeCompanies: 0, pendingCommissions: 0 };

            injectStyles();

            // Inicializar el workflow de empresas si está disponible
            if (typeof CompanyWorkflow !== 'undefined') {
                CompanyWorkflow.init();
            }

            const container = getContainer();
            if (!container) {
                console.error('[VENDOR-DASHBOARD] No se encontró contenedor');
                return;
            }

            this.renderLoading(container);

            try {
                // Usar staff proporcionado o intentar obtener de la API
                if (staffData) {
                    state.staff = staffData;
                    console.log('[VENDOR-DASHBOARD] Usando staff proporcionado:', staffData.full_name || staffData.email);
                } else {
                    try {
                        state.staff = await VendorAPI.getCurrentStaff();
                    } catch (e) {
                        console.warn('[VENDOR-DASHBOARD] No se pudo obtener staff de API, usando datos vacíos');
                        state.staff = { staff_id: 'unknown', role: 'vendedor', area: 'ventas' };
                    }
                }

                // Obtener permisos del sistema de roles
                if (typeof RolePermissions !== 'undefined') {
                    state.roleType = RolePermissions.getRoleType(state.staff);
                    state.roleName = RolePermissions.getRoleTypeName(state.roleType);
                    state.permissions = RolePermissions.getPermissions(state.staff);
                    console.log('[VENDOR-DASHBOARD] Rol:', state.roleType, 'Permisos:', state.permissions);
                } else {
                    console.warn('[VENDOR-DASHBOARD] RolePermissions no disponible, usando defaults');
                }

                // Determinar si puede ver todos los datos o solo los propios
                const level = state.staff?.level || state.staff?.role?.level || 4;
                state.isAdmin = state.permissions.dataScope === 'all' ||
                               state.permissions.hasFullAccess ||
                               level <= 1;

                // Si es admin, cargar lista de vendedores
                if (state.isAdmin) {
                    try {
                        state.vendors = await VendorAPI.getVendors();
                    } catch (e) {
                        console.warn('[VENDOR-DASHBOARD] No se pudo cargar lista de vendedores');
                        state.vendors = [];
                    }
                }

                // Cargar datos
                await this.loadData();

                // Renderizar
                this.render(container);
                this.attachEvents();

                state.initialized = true;
                console.log('[VENDOR-DASHBOARD] Inicializado correctamente');
            } catch (error) {
                console.error('[VENDOR-DASHBOARD] Error:', error);
                this.renderError(container, error);
            }
        },

        async loadData() {
            // Determinar qué datos cargar según el scope de permisos
            const dataScope = state.permissions.dataScope;
            const hasFullAccess = state.permissions.hasFullAccess;

            // Si tiene acceso total (SUPERADMIN, GERENTE_GENERAL) y no hay filtro seleccionado → cargar TODO
            // Si tiene acceso total pero seleccionó un vendedor específico → filtrar por ese vendedor
            // Si es vendedor normal → solo sus datos
            const shouldLoadAll = (hasFullAccess || dataScope === 'all') && !state.selectedVendorId;
            const vendorId = shouldLoadAll ? null : (state.selectedVendorId || state.staff?.staff_id);

            console.log('[VENDOR-DASHBOARD] Cargando datos:', {
                dataScope,
                hasFullAccess,
                shouldLoadAll,
                vendorId,
                roleType: state.roleType
            });

            try {
                let companies, commissions, notifications, budgets, contracts;

                if (shouldLoadAll) {
                    // SUPERADMIN/GERENTE: Cargar TODAS las empresas
                    [companies, commissions, notifications, budgets, contracts] = await Promise.all([
                        VendorAPI.getAllCompanies(),       // TODAS las empresas
                        VendorAPI.getAllCommissions(),    // TODAS las comisiones
                        VendorAPI.getAllNotifications(),  // TODAS las notificaciones
                        VendorAPI.getAllBudgets(),        // TODOS los presupuestos
                        VendorAPI.getAllContracts()       // TODOS los contratos
                    ]);
                } else {
                    // VENDEDOR: Solo sus datos filtrados
                    [companies, commissions, notifications, budgets, contracts] = await Promise.all([
                        VendorAPI.getVendorCompanies(vendorId),
                        VendorAPI.getVendorCommissions(vendorId),
                        VendorAPI.getVendorNotifications(vendorId),
                        VendorAPI.getVendorBudgets(vendorId),
                        VendorAPI.getVendorContracts(vendorId)
                    ]);
                }

                // Asegurar que siempre sean arrays
                state.companies = Array.isArray(companies) ? companies : [];
                state.commissions = Array.isArray(commissions) ? commissions : [];
                state.notifications = Array.isArray(notifications) ? notifications : [];
                state.budgets = Array.isArray(budgets) ? budgets : [];
                state.contracts = Array.isArray(contracts) ? contracts : [];

                console.log('[VENDOR-DASHBOARD] Datos cargados:', {
                    companies: state.companies.length,
                    commissions: state.commissions.length,
                    budgets: state.budgets.length
                });

                try {
                    const metrics = await VendorAPI.getVendorMetrics(vendorId);
                    state.metrics = metrics && typeof metrics === 'object' ? metrics : {};
                } catch (e) {
                    state.metrics = {};
                }
            } catch (error) {
                console.warn('[VENDOR-DASHBOARD] Error cargando datos:', error);
                // Mantener arrays vacíos ya inicializados
            }
        },

        renderLoading(container) {
            container.innerHTML = `
                <div class="vendor-dashboard">
                    <div class="vendor-loading">
                        <div class="vendor-loading-spinner"></div>
                        <p>Cargando dashboard del vendedor...</p>
                    </div>
                </div>
            `;
        },

        renderError(container, error) {
            container.innerHTML = `
                <div class="vendor-dashboard">
                    <div class="vendor-empty">
                        <div class="vendor-empty-icon">⚠️</div>
                        <h3>Error al cargar</h3>
                        <p>${error?.message || 'Error desconocido'}</p>
                        <button class="vendor-btn vendor-btn-primary" onclick="VendorDashboard.init()">
                            🔄 Reintentar
                        </button>
                    </div>
                </div>
            `;
        },

        render(container = null) {
            container = container || getContainer();
            if (!container) {
                console.error('[VENDOR-DASHBOARD] No container para render');
                return;
            }
            const staffName = state.staff?.first_name || state.staff?.name || 'Vendedor';
            const notifications = Array.isArray(state.notifications) ? state.notifications : [];
            const budgets = Array.isArray(state.budgets) ? state.budgets : [];
            const companies = Array.isArray(state.companies) ? state.companies : [];
            const unreadNotifs = notifications.filter(n => !n.is_read && !n.read_at).length;
            const pendingBudgets = budgets.filter(b => b.status === 'PENDING').length;

            container.innerHTML = `
                <div class="vendor-dashboard">
                    <!-- Header -->
                    <div class="vendor-header">
                        <div class="vendor-user-info">
                            <div class="vendor-avatar">👤</div>
                            <div class="vendor-greeting">
                                <h2>
                                    ${getGreeting()}, ${staffName}
                                    <span class="vendor-badge" style="background: linear-gradient(135deg, ${getRoleColor()}, ${getRoleColor()}cc);">
                                        ${getRoleIcon()} ${state.roleName || 'Usuario'}
                                    </span>
                                    ${!state.permissions.canEdit ? '<span class="vendor-badge" style="background: rgba(107, 114, 128, 0.5);">👁️ Solo Lectura</span>' : ''}
                                </h2>
                                <p>📊 Portal Comercial APONNT ${state.permissions.dataScope === 'all' ? '(Vista Global)' : state.permissions.dataScope === 'team' ? '(Mi Equipo)' : '(Mis Datos)'}</p>
                            </div>
                        </div>
                        <div class="vendor-stats">
                            <div class="vendor-stat">
                                <div class="vendor-stat-value">${companies.length}</div>
                                <div class="vendor-stat-label">Empresas</div>
                            </div>
                            <div class="vendor-stat">
                                <div class="vendor-stat-value positive">${formatCurrency(state.metrics.totalBilling || 0)}</div>
                                <div class="vendor-stat-label">Fact. Mensual</div>
                            </div>
                            <div class="vendor-stat">
                                <div class="vendor-stat-value">${unreadNotifs}</div>
                                <div class="vendor-stat-label">Notificaciones</div>
                            </div>
                        </div>
                    </div>

                    ${state.isAdmin ? this.renderAdminFilter() : ''}

                    <!-- Tabs -->
                    <div class="vendor-tabs">
                        <button class="vendor-tab ${state.currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
                            📊 Resumen
                        </button>
                        <button class="vendor-tab ${state.currentTab === 'companies' ? 'active' : ''}" data-tab="companies">
                            🏢 Empresas
                            <span class="vendor-tab-badge">${companies.length}</span>
                        </button>
                        <button class="vendor-tab ${state.currentTab === 'budgets' ? 'active' : ''}" data-tab="budgets">
                            📝 Presupuestos
                            ${pendingBudgets > 0 ? `<span class="vendor-tab-badge">${pendingBudgets}</span>` : ''}
                        </button>
                        <button class="vendor-tab ${state.currentTab === 'commissions' ? 'active' : ''}" data-tab="commissions">
                            💰 Comisiones
                        </button>
                        <button class="vendor-tab ${state.currentTab === 'notifications' ? 'active' : ''}" data-tab="notifications">
                            🔔 Notificaciones
                            ${unreadNotifs > 0 ? `<span class="vendor-tab-badge">${unreadNotifs}</span>` : ''}
                        </button>
                        <button class="vendor-tab ${state.currentTab === 'metrics' ? 'active' : ''}" data-tab="metrics">
                            📈 Métricas
                        </button>
                        <button class="vendor-tab ${state.currentTab === 'meetings' ? 'active' : ''}" data-tab="meetings">
                            🎯 Reuniones
                        </button>
                    </div>

                    <!-- Paneles -->
                    <div class="vendor-panel ${state.currentTab === 'overview' ? 'active' : ''}" id="panel-overview">
                        ${this.renderOverview()}
                    </div>
                    <div class="vendor-panel ${state.currentTab === 'companies' ? 'active' : ''}" id="panel-companies">
                        ${this.renderCompanies()}
                    </div>
                    <div class="vendor-panel ${state.currentTab === 'budgets' ? 'active' : ''}" id="panel-budgets">
                        ${this.renderBudgets()}
                    </div>
                    <div class="vendor-panel ${state.currentTab === 'commissions' ? 'active' : ''}" id="panel-commissions">
                        ${this.renderCommissions()}
                    </div>
                    <div class="vendor-panel ${state.currentTab === 'notifications' ? 'active' : ''}" id="panel-notifications">
                        ${this.renderNotifications()}
                    </div>
                    <div class="vendor-panel ${state.currentTab === 'metrics' ? 'active' : ''}" id="panel-metrics">
                        ${this.renderMetrics()}
                    </div>
                    <div class="vendor-panel ${state.currentTab === 'meetings' ? 'active' : ''}" id="panel-meetings">
                        <div id="sales-orchestration-container"></div>
                    </div>
                </div>
            `;
        },

        renderAdminFilter() {
            const vendors = Array.isArray(state.vendors) ? state.vendors : [];
            return `
                <div class="vendor-admin-filter">
                    <label>👔 Vista Admin - Filtrar por:</label>
                    <select id="vendor-filter-select" onchange="VendorDashboard.onVendorFilterChange(this.value)">
                        <option value="">Todos los vendedores</option>
                        ${vendors.map(v => `
                            <option value="${v.staff_id || v.id}" ${state.selectedVendorId === (v.staff_id || v.id) ? 'selected' : ''}>
                                ${v.first_name || v.name} ${v.last_name || ''}
                                (${v.companies_count || 0} empresas)
                            </option>
                        `).join('')}
                    </select>
                    <input type="text" placeholder="🔍 Buscar empresa..." id="vendor-search-company"
                           onkeyup="VendorDashboard.onSearchCompany(this.value)">
                </div>
            `;
        },

        renderOverview() {
            const companies = Array.isArray(state.companies) ? state.companies : [];
            const commissions = Array.isArray(state.commissions) ? state.commissions : [];
            const budgets = Array.isArray(state.budgets) ? state.budgets : [];

            const activeCompanies = companies.filter(c => c && (c.is_active || c.isActive)).length;
            const totalBilling = companies.reduce((sum, c) => sum + (parseFloat(c?.monthly_total || c?.monthlyTotal) || 0), 0);
            const pendingCommissions = commissions.filter(c => c?.status === 'pending').reduce((sum, c) => sum + (parseFloat(c?.amount) || 0), 0);
            const acceptedBudgets = budgets.filter(b => b?.status === 'ACCEPTED').length;
            const pendingBudgets = budgets.filter(b => b?.status === 'PENDING').length;

            // Botones de acción según permisos - Solo mostrar los relevantes para el Dashboard
            // Nueva Empresa va en tab Empresas, Pagar Comisiones va aquí en Dashboard
            const actionButtons = [];
            if (state.permissions.canPayCommissions) {
                actionButtons.push('<button class="vendor-btn vendor-btn-secondary" onclick="VendorDashboard.showPayCommissions()">💳 Pagar Comisiones</button>');
            }

            return `
                <div class="vendor-section-title">
                    <span class="icon">📊</span> Resumen General
                    ${actionButtons.length > 0 ? `<div style="margin-left: auto; display: flex; gap: 10px;">${actionButtons.join('')}</div>` : ''}
                </div>

                <div class="vendor-metrics-grid">
                    <div class="vendor-metric-card" style="--card-accent: #22c55e;">
                        <div class="metric-icon">🏢</div>
                        <div class="metric-value">${activeCompanies} / ${companies.length}</div>
                        <div class="metric-label">Empresas Activas</div>
                    </div>

                    <div class="vendor-metric-card" style="--card-accent: #f59e0b;">
                        <div class="metric-icon">💰</div>
                        <div class="metric-value">${formatCurrency(totalBilling)}</div>
                        <div class="metric-label">Facturación Mensual</div>
                    </div>

                    <div class="vendor-metric-card" style="--card-accent: #8b5cf6;">
                        <div class="metric-icon">💵</div>
                        <div class="metric-value">${formatCurrency(pendingCommissions)}</div>
                        <div class="metric-label">Comisiones Pendientes</div>
                    </div>

                    <div class="vendor-metric-card" style="--card-accent: #3b82f6;">
                        <div class="metric-icon">📝</div>
                        <div class="metric-value">${acceptedBudgets} / ${budgets.length}</div>
                        <div class="metric-label">Presupuestos Aceptados</div>
                        ${pendingBudgets > 0 ? `<div class="metric-change negative">${pendingBudgets} pendientes</div>` : ''}
                    </div>
                </div>

                <!-- Últimas empresas -->
                <div class="vendor-section-title">
                    <span class="icon">🆕</span> Empresas Recientes
                </div>
                ${this.renderRecentCompanies()}

                <!-- Últimas notificaciones -->
                <div class="vendor-section-title" style="margin-top: 30px;">
                    <span class="icon">🔔</span> Notificaciones Recientes
                </div>
                ${this.renderRecentNotifications()}
            `;
        },

        renderRecentCompanies() {
            const companies = Array.isArray(state.companies) ? state.companies : [];
            const recent = [...companies]
                .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
                .slice(0, 5);

            if (recent.length === 0) {
                return `<div class="vendor-empty"><p>No hay empresas asignadas</p></div>`;
            }

            return `
                <div class="vendor-table-container">
                    <table class="vendor-table">
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>Fecha Alta</th>
                                <th>Fact. Mensual</th>
                                <th>Módulos</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recent.map(c => `
                                <tr>
                                    <td><strong>${c.name || c.company_name}</strong></td>
                                    <td>${formatDate(c.created_at || c.createdAt)}</td>
                                    <td>${formatCurrency(c.monthly_total || c.monthlyTotal || 0)}</td>
                                    <td>${(c.active_modules || c.activeModules || []).length || 0}</td>
                                    <td>
                                        <span class="status-badge ${(c.is_active || c.isActive) ? 'active' : 'inactive'}">
                                            ${(c.is_active || c.isActive) ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        },

        renderRecentNotifications() {
            const notifications = Array.isArray(state.notifications) ? state.notifications : [];
            const recent = notifications.slice(0, 5);

            if (recent.length === 0) {
                return `<div class="vendor-empty"><p>No hay notificaciones</p></div>`;
            }

            return recent.map(n => this.renderNotificationItem(n)).join('');
        },

        renderCompanies() {
            const companies = Array.isArray(state.companies) ? state.companies : [];

            if (companies.length === 0) {
                return `
                    <div class="vendor-empty">
                        <div class="vendor-empty-icon">🏢</div>
                        <h3>Sin empresas asignadas</h3>
                        <p>No tienes empresas asignadas actualmente</p>
                    </div>
                `;
            }

            // Ordenar por facturación (mayor a menor)
            const sorted = [...companies].sort((a, b) =>
                (parseFloat(b.monthly_total || b.monthlyTotal) || 0) -
                (parseFloat(a.monthly_total || a.monthlyTotal) || 0)
            );

            // Verificar si puede editar
            const canEdit = state.permissions.canEdit || state.permissions.hasFullAccess;
            const canCreateBudget = state.permissions.canCreateBudgets || state.permissions.hasFullAccess;

            return `
                <div class="vendor-section-title">
                    <span class="icon">🏢</span> Empresas (${companies.length})
                    ${canCreateBudget ? '<button class="vendor-btn vendor-btn-primary" style="margin-left: auto;" onclick="VendorDashboard.showNewCompany()">➕ Nueva Empresa</button>' : ''}
                </div>
                <div class="vendor-table-container">
                    <table class="vendor-table">
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>Contacto</th>
                                <th>Fact. Mensual</th>
                                <th>Módulos</th>
                                <th>Estado</th>
                                <th style="width: 150px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sorted.map(c => {
                                const companyId = c.company_id || c.id;
                                return `
                                    <tr>
                                        <td>
                                            <strong>${c.name || c.company_name}</strong>
                                            <br><small style="color: rgba(255,255,255,0.4)">${c.slug || ''}</small>
                                        </td>
                                        <td>
                                            ${c.contact_email || c.contactEmail || '-'}
                                            <br><small>${c.phone || c.contact_phone || ''}</small>
                                        </td>
                                        <td><strong>${formatCurrency(c.monthly_total || c.monthlyTotal || 0)}</strong></td>
                                        <td>${(c.active_modules || c.activeModules || []).length || 0}</td>
                                        <td>
                                            <span class="status-badge ${(c.is_active || c.isActive) ? 'active' : 'inactive'}">
                                                ${(c.is_active || c.isActive) ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style="display: flex; gap: 5px;">
                                                ${canCreateBudget ? `
                                                    <button class="vendor-btn-sm" onclick="VendorDashboard.showCompanyDetail(${companyId})" title="Ver/Editar">
                                                        ✏️
                                                    </button>
                                                ` : `
                                                    <button class="vendor-btn-sm" onclick="VendorDashboard.showCompanyDetail(${companyId})" title="Ver">
                                                        👁️
                                                    </button>
                                                `}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        },

        renderBudgets() {
            const budgets = Array.isArray(state.budgets) ? state.budgets : [];

            if (budgets.length === 0) {
                return `
                    <div class="vendor-empty">
                        <div class="vendor-empty-icon">📝</div>
                        <h3>Sin presupuestos</h3>
                        <p>No hay presupuestos registrados</p>
                    </div>
                `;
            }

            return `
                <div class="vendor-section-title">
                    <span class="icon">📝</span> Presupuestos (${budgets.length})
                </div>
                <div class="vendor-table-container">
                    <table class="vendor-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Empresa</th>
                                <th>Fecha</th>
                                <th>Válido Hasta</th>
                                <th>Total Mensual</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${budgets.map(b => `
                                <tr>
                                    <td><strong>${b.budget_code || b.id}</strong></td>
                                    <td>${b.company_name || b.companyName || '-'}</td>
                                    <td>${formatDate(b.created_at || b.createdAt)}</td>
                                    <td>${formatDate(b.valid_until || b.validUntil)}</td>
                                    <td>${formatCurrency(b.total_monthly || b.totalMonthly || 0)}</td>
                                    <td>
                                        <span class="status-badge ${b.status?.toLowerCase() || 'pending'}">
                                            ${b.status || 'Pendiente'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        },

        renderCommissions() {
            const commissions = Array.isArray(state.commissions) ? state.commissions : [];
            const totalPending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
            const totalPaid = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

            return `
                <div class="vendor-section-title">
                    <span class="icon">💰</span> Mis Comisiones
                </div>

                <div class="vendor-metrics-grid" style="margin-bottom: 30px;">
                    <div class="vendor-metric-card" style="--card-accent: #f59e0b;">
                        <div class="metric-icon">⏳</div>
                        <div class="metric-value">${formatCurrency(totalPending)}</div>
                        <div class="metric-label">Pendientes de Cobro</div>
                    </div>
                    <div class="vendor-metric-card" style="--card-accent: #22c55e;">
                        <div class="metric-icon">✅</div>
                        <div class="metric-value">${formatCurrency(totalPaid)}</div>
                        <div class="metric-label">Cobradas</div>
                    </div>
                </div>

                ${commissions.length === 0 ? `
                    <div class="vendor-empty">
                        <div class="vendor-empty-icon">💵</div>
                        <h3>Sin comisiones</h3>
                        <p>No hay comisiones registradas</p>
                    </div>
                ` : `
                    <div class="vendor-table-container">
                        <table class="vendor-table">
                            <thead>
                                <tr>
                                    <th>Empresa</th>
                                    <th>Período</th>
                                    <th>Base Facturada</th>
                                    <th>% Comisión</th>
                                    <th>Monto</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${commissions.map(c => `
                                    <tr>
                                        <td>${c.company_name || c.companyName || '-'}</td>
                                        <td>${c.period || '-'}</td>
                                        <td>${formatCurrency(c.billing_base || c.billingBase || 0)}</td>
                                        <td>${c.percentage || 10}%</td>
                                        <td><strong>${formatCurrency(c.amount || 0)}</strong></td>
                                        <td>
                                            <span class="status-badge ${c.status || 'pending'}">
                                                ${c.status === 'paid' ? 'Pagada' : 'Pendiente'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            `;
        },

        renderNotifications() {
            const notifications = Array.isArray(state.notifications) ? state.notifications : [];
            const unread = notifications.filter(n => !n.is_read && !n.read_at);
            const read = notifications.filter(n => n.is_read || n.read_at);

            return `
                <div class="vendor-section-title">
                    <span class="icon">🔔</span> Notificaciones Comerciales
                    ${unread.length > 0 ? `<span class="vendor-tab-badge" style="background: #ef4444;">${unread.length} nuevas</span>` : ''}
                </div>

                ${notifications.length === 0 ? `
                    <div class="vendor-empty">
                        <div class="vendor-empty-icon">🔔</div>
                        <h3>Sin notificaciones</h3>
                        <p>No hay notificaciones comerciales</p>
                    </div>
                ` : `
                    ${unread.length > 0 ? `
                        <div style="margin-bottom: 30px;">
                            <h4 style="color: #f59e0b; margin-bottom: 15px;">📬 No Leídas (${unread.length})</h4>
                            ${unread.map(n => this.renderNotificationItem(n)).join('')}
                        </div>
                    ` : ''}

                    ${read.length > 0 ? `
                        <div>
                            <h4 style="color: rgba(255,255,255,0.5); margin-bottom: 15px;">📭 Anteriores (${read.length})</h4>
                            ${read.slice(0, 20).map(n => this.renderNotificationItem(n)).join('')}
                        </div>
                    ` : ''}
                `}
            `;
        },

        renderNotificationItem(n) {
            const isUnread = !n.is_read && !n.read_at;
            const icon = this.getNotificationIcon(n.notification_type || n.type);
            const direction = n.direction === 'inbound' ? '← Recibido' : n.direction === 'outbound' ? '→ Enviado' : '';

            return `
                <div class="vendor-notification-item ${isUnread ? 'unread' : ''}"
                     onclick="VendorDashboard.onNotificationClick(${n.id})">
                    <div class="vendor-notification-icon">${icon}</div>
                    <div class="vendor-notification-content">
                        <div class="vendor-notification-title">
                            ${n.title || 'Notificación'}
                            ${isUnread ? '<span style="color: #f59e0b; font-size: 0.8rem;"> ● Nueva</span>' : ''}
                        </div>
                        <div class="vendor-notification-message">${n.message || ''}</div>
                        <div class="vendor-notification-meta">
                            <span>🏢 ${n.company_name || 'N/A'}</span>
                            <span>📅 ${formatDateTime(n.created_at)}</span>
                            ${direction ? `<span>${direction}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        },

        getNotificationIcon(type) {
            const icons = {
                'budget_created': '📝',
                'budget_accepted': '✅',
                'contract_signed': '📄',
                'invoice_generated': '💳',
                'payment_confirmed': '💵',
                'company_activated': '🏢',
                'commercial_reply': '💬',
                'commission': '💰'
            };
            return icons[type] || '🔔';
        },

        renderMetrics() {
            const companies = Array.isArray(state.companies) ? state.companies : [];
            const totalBilling = companies.reduce((sum, c) => sum + (parseFloat(c.monthly_total || c.monthlyTotal) || 0), 0);
            const avgBilling = companies.length > 0 ? totalBilling / companies.length : 0;
            const totalModules = companies.reduce((sum, c) => sum + ((c.active_modules || c.activeModules || []).length || 0), 0);
            const avgModules = companies.length > 0 ? totalModules / companies.length : 0;

            // Calcular antigüedad promedio
            const avgMonths = companies.length > 0
                ? companies.reduce((sum, c) => {
                    const created = new Date(c.created_at || c.createdAt);
                    return sum + Math.floor((Date.now() - created) / (30 * 24 * 60 * 60 * 1000));
                }, 0) / companies.length
                : 0;

            // Conversión presupuestos
            const conversionRate = state.budgets.length > 0
                ? (state.budgets.filter(b => b.status === 'ACCEPTED').length / state.budgets.length * 100).toFixed(1)
                : 0;

            return `
                <div class="vendor-section-title">
                    <span class="icon">📈</span> Métricas de Rendimiento
                </div>

                <div class="vendor-metrics-grid">
                    <div class="vendor-metric-card" style="--card-accent: #22c55e;">
                        <div class="metric-icon">📊</div>
                        <div class="metric-value">${formatCurrency(totalBilling)}</div>
                        <div class="metric-label">Facturación Total Mensual</div>
                    </div>

                    <div class="vendor-metric-card" style="--card-accent: #3b82f6;">
                        <div class="metric-icon">📈</div>
                        <div class="metric-value">${formatCurrency(avgBilling)}</div>
                        <div class="metric-label">Promedio por Empresa</div>
                    </div>

                    <div class="vendor-metric-card" style="--card-accent: #8b5cf6;">
                        <div class="metric-icon">📦</div>
                        <div class="metric-value">${avgModules.toFixed(1)}</div>
                        <div class="metric-label">Módulos Promedio/Empresa</div>
                    </div>

                    <div class="vendor-metric-card" style="--card-accent: #f59e0b;">
                        <div class="metric-icon">⏱️</div>
                        <div class="metric-value">${avgMonths.toFixed(0)} meses</div>
                        <div class="metric-label">Antigüedad Promedio</div>
                    </div>

                    <div class="vendor-metric-card" style="--card-accent: #ec4899;">
                        <div class="metric-icon">🎯</div>
                        <div class="metric-value">${conversionRate}%</div>
                        <div class="metric-label">Tasa Conversión Presupuestos</div>
                    </div>

                    <div class="vendor-metric-card" style="--card-accent: #14b8a6;">
                        <div class="metric-icon">🏆</div>
                        <div class="metric-value">${state.budgets.filter(b => b.status === 'ACCEPTED').length}</div>
                        <div class="metric-label">Presupuestos Ganados</div>
                    </div>
                </div>

                <!-- Top empresas por facturación -->
                <div class="vendor-section-title" style="margin-top: 30px;">
                    <span class="icon">🏆</span> Top 5 Empresas por Facturación
                </div>
                ${this.renderTopCompanies()}
            `;
        },

        renderTopCompanies() {
            const companies = Array.isArray(state.companies) ? state.companies : [];
            const top5 = [...companies]
                .sort((a, b) => (parseFloat(b.monthly_total || b.monthlyTotal) || 0) - (parseFloat(a.monthly_total || a.monthlyTotal) || 0))
                .slice(0, 5);

            if (top5.length === 0) {
                return `<div class="vendor-empty"><p>Sin datos</p></div>`;
            }

            const maxBilling = parseFloat(top5[0]?.monthly_total || top5[0]?.monthlyTotal) || 1;

            return `
                <div style="background: rgba(15, 15, 30, 0.8); border-radius: 16px; padding: 20px;">
                    ${top5.map((c, i) => {
                        const billing = parseFloat(c.monthly_total || c.monthlyTotal) || 0;
                        const percentage = (billing / maxBilling * 100).toFixed(0);
                        return `
                            <div style="margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span style="font-weight: 600;">
                                        ${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]} ${c.name || c.company_name}
                                    </span>
                                    <span style="color: #22c55e; font-weight: 700;">${formatCurrency(billing)}</span>
                                </div>
                                <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                                    <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #f59e0b, #22c55e); border-radius: 4px;"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        },

        attachEvents() {
            // Tabs
            document.querySelectorAll('.vendor-tab').forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });
        },

        switchTab(tabId) {
            state.currentTab = tabId;

            document.querySelectorAll('.vendor-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.tab === tabId);
            });

            document.querySelectorAll('.vendor-panel').forEach(p => {
                p.classList.toggle('active', p.id === `panel-${tabId}`);
            });

            // Inicializar Sales Orchestration cuando se selecciona el tab de reuniones
            if (tabId === 'meetings' && typeof SalesOrchestrationDashboard !== 'undefined') {
                const container = document.getElementById('sales-orchestration-container');
                if (container && !container.dataset.initialized) {
                    // init() espera el ID del container (string), no el elemento
                    SalesOrchestrationDashboard.init('sales-orchestration-container');
                    container.dataset.initialized = 'true';
                }
            }
        },

        async onVendorFilterChange(vendorId) {
            state.selectedVendorId = vendorId || null;
            const container = getContainer();
            this.renderLoading(container);
            await this.loadData();
            this.render(container);
            this.attachEvents();
        },

        onSearchCompany(query) {
            // Filtrar tabla de empresas en cliente
            const rows = document.querySelectorAll('#panel-companies tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
            });
        },

        async onNotificationClick(notifId) {
            await VendorAPI.markNotificationRead(notifId);
            // Actualizar estado local
            const notif = state.notifications.find(n => n.id === notifId);
            if (notif) {
                notif.is_read = true;
                notif.read_at = new Date().toISOString();
            }
            // Re-renderizar notificaciones
            const panel = document.getElementById('panel-notifications');
            if (panel) {
                panel.innerHTML = this.renderNotifications();
            }
        },

        // ========== ACCIONES (según permisos) ==========

        showNewCompany() {
            if (!state.permissions.canCreateBudgets && !state.permissions.hasFullAccess) {
                alert('No tienes permisos para crear empresas');
                return;
            }
            if (typeof CompanyWorkflow !== 'undefined') {
                CompanyWorkflow.showNewCompanyModal();
            } else {
                alert('Error: Módulo de workflow no cargado');
            }
        },

        showNewBudget(company = null) {
            if (!state.permissions.canCreateBudgets && !state.permissions.hasFullAccess) {
                alert('No tienes permisos para crear presupuestos');
                return;
            }
            if (typeof CompanyWorkflow !== 'undefined') {
                if (company) {
                    CompanyWorkflow.showEditCompanyModal(company);
                } else {
                    // Si no hay empresa, mostrar modal de nueva empresa
                    CompanyWorkflow.showNewCompanyModal();
                }
            } else {
                alert('Error: Módulo de workflow no cargado');
            }
        },

        showAddModules(company = null) {
            if (!state.permissions.canAddModules && !state.permissions.hasFullAccess) {
                alert('No tienes permisos para gestionar módulos');
                return;
            }
            if (typeof CompanyWorkflow !== 'undefined' && company) {
                CompanyWorkflow.showEditCompanyModal(company);
            } else {
                alert('Selecciona una empresa para gestionar sus módulos');
            }
        },

        showPayCommissions() {
            if (!state.permissions.canPayCommissions) {
                alert('No tienes permisos para pagar comisiones');
                return;
            }
            // TODO: Modal de pago de comisiones
            alert('Pagar Comisiones - Funcionalidad próximamente');
        },

        showCompanyDetail(companyId) {
            const company = state.companies.find(c => (c.company_id || c.id) == companyId);
            if (company && typeof CompanyWorkflow !== 'undefined') {
                CompanyWorkflow.showEditCompanyModal(company);
            }
        },

        async refresh() {
            console.log('[VENDOR-DASHBOARD] Refrescando datos...');
            await this.loadData();
            const container = getContainer();
            if (container) {
                this.render(container);
                this.attachEvents();
            }
        },

        // Exponer permisos para otros módulos
        getPermissions() {
            return { ...state.permissions };
        },

        getRoleType() {
            return state.roleType;
        },

        // ========== GESTIÓN DE FACTURAS ==========

        /**
         * Muestra modal para gestionar una factura (subir PDF, enviar email)
         */
        async showInvoiceManager(invoiceId) {
            try {
                const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
                const response = await fetch(`/api/invoicing/invoices/${invoiceId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();

                if (!result.success || !result.invoice) {
                    alert('Error cargando factura');
                    return;
                }

                const inv = result.invoice;

                const modalHtml = `
                    <div id="invoiceManagerModal" style="
                        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.8); z-index: 10000;
                        display: flex; align-items: center; justify-content: center;
                    ">
                        <div style="
                            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                            border-radius: 16px; padding: 30px; width: 90%; max-width: 600px;
                            border: 1px solid rgba(245,158,11,0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                                <h3 style="margin: 0; color: #f59e0b;">🧾 Gestión de Factura</h3>
                                <button onclick="VendorDashboard.closeInvoiceManager()" style="
                                    background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;
                                ">&times;</button>
                            </div>

                            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <div>
                                        <label style="color: rgba(255,255,255,0.6); font-size: 12px;">NÚMERO</label>
                                        <div style="color: #fff; font-weight: 600;">${inv.invoice_number}</div>
                                    </div>
                                    <div>
                                        <label style="color: rgba(255,255,255,0.6); font-size: 12px;">TOTAL</label>
                                        <div style="color: #22c55e; font-weight: 700; font-size: 1.2em;">${inv.currency || 'USD'} ${parseFloat(inv.total_amount).toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <label style="color: rgba(255,255,255,0.6); font-size: 12px;">EMPRESA</label>
                                        <div style="color: #fff;">${inv.company_name || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <label style="color: rgba(255,255,255,0.6); font-size: 12px;">ESTADO</label>
                                        <div style="color: ${inv.status === 'PAID' ? '#22c55e' : '#f59e0b'};">${inv.status}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- PDF Section -->
                            <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="color: #fff; font-weight: 500;">📄 PDF de Factura</div>
                                        <div style="color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 5px;">
                                            ${inv.invoice_pdf_path ? '✅ PDF adjunto: ' + inv.invoice_pdf_path : '❌ Sin PDF adjunto'}
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: 10px;">
                                        ${inv.invoice_pdf_path ? `
                                            <button onclick="VendorDashboard.downloadInvoicePdf(${inv.id})" style="
                                                background: #3b82f6; color: white; border: none; padding: 8px 16px;
                                                border-radius: 8px; cursor: pointer; font-size: 13px;
                                            ">⬇️ Descargar</button>
                                        ` : ''}
                                        <label style="
                                            background: #f59e0b; color: white; padding: 8px 16px;
                                            border-radius: 8px; cursor: pointer; font-size: 13px;
                                        ">
                                            ⬆️ ${inv.invoice_pdf_path ? 'Reemplazar' : 'Subir'} PDF
                                            <input type="file" id="invoicePdfFile" accept=".pdf" style="display: none;"
                                                onchange="VendorDashboard.uploadInvoicePdf(${inv.id})">
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- Email Section -->
                            <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                                <div style="color: #fff; font-weight: 500; margin-bottom: 15px;">📧 Enviar por Email</div>

                                <div style="margin-bottom: 15px;">
                                    <label style="color: rgba(255,255,255,0.6); font-size: 12px; display: block; margin-bottom: 5px;">EMAIL DESTINO</label>
                                    <input type="email" id="invoiceEmailTo" value="${inv.contact_email || ''}" style="
                                        width: 100%; padding: 10px; border: 1px solid rgba(255,255,255,0.2);
                                        background: rgba(0,0,0,0.3); color: #fff; border-radius: 8px;
                                    " placeholder="ejemplo@empresa.com">
                                </div>

                                ${inv.sent_at ? `
                                    <div style="color: #22c55e; font-size: 13px; margin-bottom: 10px;">
                                        ✅ Enviada el ${new Date(inv.sent_at).toLocaleString()} a ${inv.sent_to_email}
                                    </div>
                                ` : ''}

                                <button onclick="VendorDashboard.sendInvoiceEmail(${inv.id})" ${!inv.invoice_pdf_path ? 'disabled' : ''} style="
                                    background: ${inv.invoice_pdf_path ? '#22c55e' : '#666'}; color: white;
                                    border: none; padding: 12px 24px; border-radius: 8px;
                                    cursor: ${inv.invoice_pdf_path ? 'pointer' : 'not-allowed'};
                                    width: 100%; font-weight: 600;
                                ">
                                    ${inv.invoice_pdf_path ? '📤 Enviar Factura por Email' : '⚠️ Sube el PDF primero'}
                                </button>
                            </div>

                            <button onclick="VendorDashboard.closeInvoiceManager()" style="
                                background: rgba(255,255,255,0.1); color: #fff; border: none;
                                padding: 12px 24px; border-radius: 8px; cursor: pointer; width: 100%;
                            ">Cerrar</button>
                        </div>
                    </div>
                `;

                document.body.insertAdjacentHTML('beforeend', modalHtml);

            } catch (error) {
                console.error('[VENDOR-DASHBOARD] Error en showInvoiceManager:', error);
                alert('Error al cargar factura: ' + error.message);
            }
        },

        closeInvoiceManager() {
            const modal = document.getElementById('invoiceManagerModal');
            if (modal) modal.remove();
        },

        async uploadInvoicePdf(invoiceId) {
            const fileInput = document.getElementById('invoicePdfFile');
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                alert('Selecciona un archivo PDF');
                return;
            }

            const formData = new FormData();
            formData.append('invoice_pdf', fileInput.files[0]);

            try {
                const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
                const response = await fetch(`/api/invoicing/invoices/${invoiceId}/upload-pdf`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    alert('✅ PDF subido exitosamente');
                    this.closeInvoiceManager();
                    this.showInvoiceManager(invoiceId); // Recargar modal
                } else {
                    alert('❌ Error: ' + (result.message || 'Error subiendo PDF'));
                }
            } catch (error) {
                console.error('[VENDOR-DASHBOARD] Error uploading PDF:', error);
                alert('❌ Error de conexión');
            }
        },

        async sendInvoiceEmail(invoiceId) {
            const emailInput = document.getElementById('invoiceEmailTo');
            const toEmail = emailInput?.value?.trim();

            if (!toEmail) {
                alert('Ingresa un email de destino');
                return;
            }

            if (!confirm(`¿Enviar factura a ${toEmail}?`)) return;

            try {
                const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
                const response = await fetch(`/api/invoicing/invoices/${invoiceId}/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ to_email: toEmail })
                });

                const result = await response.json();

                if (result.success) {
                    alert(`✅ Factura enviada exitosamente a ${toEmail}`);
                    this.closeInvoiceManager();
                    this.showInvoiceManager(invoiceId); // Recargar modal
                } else {
                    alert('❌ Error: ' + (result.message || 'Error enviando email'));
                }
            } catch (error) {
                console.error('[VENDOR-DASHBOARD] Error sending email:', error);
                alert('❌ Error de conexión');
            }
        },

        async downloadInvoicePdf(invoiceId) {
            try {
                const token = localStorage.getItem('aponnt_token_staff') || sessionStorage.getItem('aponnt_token_staff');
                const response = await fetch(`/api/invoicing/invoices/${invoiceId}/pdf`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `factura-${invoiceId}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                } else {
                    alert('❌ Error descargando PDF');
                }
            } catch (error) {
                console.error('[VENDOR-DASHBOARD] Error downloading PDF:', error);
                alert('❌ Error de conexión');
            }
        }
    };

    // Exportar
    window.VendorDashboard = VendorDashboard;

    // Registrar módulo
    window.Modules = window.Modules || {};
    window.Modules['vendor-dashboard'] = {
        init: () => VendorDashboard.init(),
        showContent: () => VendorDashboard.init()
    };

    // Alias
    window.initVendorDashboard = () => VendorDashboard.init();
    window.showVendorDashboardContent = () => VendorDashboard.init();

    console.log('[VENDOR-DASHBOARD] Módulo cargado');
})();
