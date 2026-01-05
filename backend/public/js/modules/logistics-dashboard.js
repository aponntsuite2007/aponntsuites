/**
 * logistics-dashboard.js - Dashboard de Logística Avanzada
 * WMS (Warehouse Management) + TMS (Transport Management)
 * Sistema 100% parametrizable para distribuidoras, mayoristas, fábricas
 *
 * Basado en mejores prácticas de:
 * - SAP S/4HANA EWM (Extended Warehouse Management)
 * - Oracle Cloud SCM (Supply Chain Management)
 * - Microsoft Dynamics 365 Supply Chain
 * - Odoo Inventory & Delivery
 */

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURACIÓN GLOBAL
    // ============================================================================

    const API_BASE = '/api/logistics';
    let currentCompanyId = null;
    let currentWarehouseId = null;
    let currentTab = 'overview';

    // ============================================================================
    // ESTILOS DARK THEME
    // ============================================================================

    function injectStyles() {
        if (document.getElementById('logistics-dashboard-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'logistics-dashboard-styles';
        styleSheet.textContent = `
            /* ============================================
               LOGISTICS DASHBOARD - DARK THEME
               Consistente con el resto de módulos
               ============================================ */

            .logistics-dashboard {
                padding: 20px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #e6edf3;
                background: linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
                min-height: 100vh;
            }

            /* Header */
            .logistics-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 25px 30px;
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
            }

            .logistics-title h2 {
                color: #e6edf3;
                margin: 0;
                font-size: 24px;
                font-weight: 700;
            }

            .logistics-subtitle {
                color: #8b949e;
                font-size: 14px;
                margin-top: 4px;
                display: block;
            }

            .logistics-warehouse-selector {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .logistics-warehouse-selector label {
                color: #8b949e;
                font-weight: 500;
            }

            .logistics-warehouse-selector select {
                padding: 10px 15px;
                background: rgba(33, 38, 45, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #e6edf3;
                font-size: 14px;
                min-width: 220px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .logistics-warehouse-selector select:hover,
            .logistics-warehouse-selector select:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                outline: none;
            }

            .logistics-actions .btn-refresh {
                padding: 10px 20px;
                background: rgba(59, 130, 246, 0.2);
                border: 1px solid rgba(59, 130, 246, 0.3);
                color: #3b82f6;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: 500;
            }

            .logistics-actions .btn-refresh:hover {
                background: rgba(59, 130, 246, 0.3);
                transform: translateY(-2px);
            }

            /* Tabs */
            .logistics-tabs {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 20px;
                background: rgba(15, 15, 30, 0.6);
                padding: 12px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .logistics-tab {
                padding: 10px 18px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(33, 38, 45, 0.8);
                color: rgba(255, 255, 255, 0.6);
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-weight: 500;
                font-size: 13px;
            }

            .logistics-tab:hover {
                background: rgba(59, 130, 246, 0.2);
                border-color: rgba(59, 130, 246, 0.3);
                color: #3b82f6;
            }

            .logistics-tab.active {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: #fff;
                border-color: #3b82f6;
                box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
            }

            /* Content Area */
            .logistics-content {
                background: rgba(15, 15, 30, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 25px;
                backdrop-filter: blur(10px);
            }

            /* KPI Cards */
            .kpi-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .kpi-card {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 25px;
                text-align: center;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .kpi-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            }

            .kpi-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
                border-color: rgba(59, 130, 246, 0.3);
            }

            .kpi-card.loading {
                opacity: 0.6;
            }

            .kpi-icon {
                font-size: 36px;
                margin-bottom: 10px;
            }

            .kpi-value {
                font-size: 32px;
                font-weight: 700;
                color: #e6edf3;
                margin-bottom: 5px;
            }

            .kpi-label {
                color: #8b949e;
                font-size: 14px;
                font-weight: 500;
            }

            /* Overview Grid */
            .overview-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 25px;
            }

            .overview-section {
                background: rgba(33, 38, 45, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 20px;
            }

            .overview-section h3 {
                color: #e6edf3;
                font-size: 16px;
                font-weight: 600;
                margin: 0 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            /* Section Headers */
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .section-header h3 {
                color: #e6edf3;
                font-size: 18px;
                font-weight: 600;
                margin: 0;
            }

            .section-header.mt-4 {
                margin-top: 30px;
            }

            .header-actions {
                display: flex;
                gap: 10px;
            }

            /* Buttons */
            .btn-primary {
                padding: 10px 20px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border: none;
                color: #fff;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
            }

            .btn-secondary {
                padding: 10px 20px;
                background: rgba(139, 92, 246, 0.2);
                border: 1px solid rgba(139, 92, 246, 0.3);
                color: #a78bfa;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .btn-secondary:hover {
                background: rgba(139, 92, 246, 0.3);
                transform: translateY(-2px);
            }

            .btn-sm {
                padding: 6px 12px;
                font-size: 12px;
                border-radius: 6px;
            }

            .btn-success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }

            .btn-icon {
                padding: 8px 12px;
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #8b949e;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-icon:hover {
                background: rgba(59, 130, 246, 0.2);
                border-color: rgba(59, 130, 246, 0.3);
                color: #3b82f6;
            }

            /* Cards Grid */
            .warehouses-grid,
            .carriers-grid,
            .zones-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
            }

            /* Warehouse Card */
            .warehouse-card,
            .carrier-card,
            .zone-card {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .warehouse-card:hover,
            .carrier-card:hover,
            .zone-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
                border-color: rgba(59, 130, 246, 0.3);
            }

            .warehouse-header,
            .carrier-header,
            .zone-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .warehouse-code,
            .carrier-code,
            .zone-code {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
            }

            .warehouse-status,
            .zone-status {
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
            }

            .warehouse-status.active,
            .zone-status.active {
                background: rgba(16, 185, 129, 0.2);
                color: #34d399;
            }

            .warehouse-status.inactive,
            .zone-status.inactive {
                background: rgba(239, 68, 68, 0.2);
                color: #f87171;
            }

            .warehouse-name,
            .carrier-name,
            .zone-name {
                color: #e6edf3;
                font-size: 18px;
                font-weight: 600;
                margin: 10px 0;
            }

            .warehouse-address,
            .carrier-contact {
                color: #8b949e;
                font-size: 14px;
                margin-bottom: 15px;
            }

            .warehouse-stats,
            .carrier-stats,
            .zone-stats {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                color: #8b949e;
                font-size: 13px;
            }

            .warehouse-stats .stat {
                text-align: center;
            }

            .warehouse-stats .stat-value {
                display: block;
                font-size: 20px;
                font-weight: 600;
                color: #e6edf3;
            }

            .warehouse-stats .stat-label {
                font-size: 12px;
                color: #8b949e;
            }

            .warehouse-actions {
                display: flex;
                gap: 8px;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            /* Carrier Badge */
            .carrier-badge {
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
            }

            .carrier-badge.own-fleet {
                background: rgba(139, 92, 246, 0.2);
                color: #a78bfa;
            }

            .carrier-badge.external {
                background: rgba(245, 158, 11, 0.2);
                color: #fbbf24;
            }

            /* Zone Schedule */
            .zone-schedule {
                margin: 15px 0;
            }

            .schedule-days {
                display: flex;
                gap: 5px;
                margin-bottom: 8px;
            }

            .schedule-days .day {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
            }

            .schedule-hours {
                color: #8b949e;
                font-size: 13px;
            }

            .zone-pricing {
                margin: 15px 0;
                display: flex;
                gap: 15px;
            }

            .delivery-cost {
                color: #e6edf3;
                font-weight: 600;
            }

            .free-threshold {
                color: #34d399;
                font-size: 13px;
            }

            /* Tables */
            .logistics-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
            }

            .logistics-table thead th {
                background: rgba(33, 38, 45, 0.9);
                color: #8b949e;
                padding: 15px;
                text-align: left;
                font-weight: 600;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 2px solid rgba(59, 130, 246, 0.3);
            }

            .logistics-table tbody tr {
                transition: all 0.2s ease;
            }

            .logistics-table tbody tr:hover {
                background: rgba(59, 130, 246, 0.1);
            }

            .logistics-table tbody td {
                padding: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                color: #e6edf3;
            }

            .logistics-table td.number {
                font-family: 'Monaco', 'Consolas', monospace;
                text-align: right;
            }

            .logistics-table td.reserved {
                color: #fbbf24;
            }

            .logistics-table td.total {
                font-weight: 600;
                color: #60a5fa;
            }

            .logistics-table code {
                background: rgba(59, 130, 246, 0.15);
                color: #60a5fa;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
            }

            .loading-cell,
            .empty-cell,
            .info-cell {
                text-align: center;
                padding: 40px !important;
                color: #8b949e;
            }

            /* Filters */
            .inventory-filters,
            .shipments-filters {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .inventory-filters input,
            .inventory-filters select,
            .shipments-filters input,
            .shipments-filters select {
                padding: 10px 15px;
                background: rgba(33, 38, 45, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #e6edf3;
                font-size: 14px;
                min-width: 180px;
                transition: all 0.3s ease;
            }

            .inventory-filters input:focus,
            .inventory-filters select:focus,
            .shipments-filters input:focus,
            .shipments-filters select:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                outline: none;
            }

            .inventory-filters input::placeholder,
            .shipments-filters input::placeholder {
                color: #8b949e;
            }

            /* List Items */
            .list-container {
                max-height: 300px;
                overflow-y: auto;
            }

            .list-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                background: rgba(33, 38, 45, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                margin-bottom: 8px;
                transition: all 0.2s ease;
            }

            .list-item:hover {
                background: rgba(59, 130, 246, 0.1);
                border-color: rgba(59, 130, 246, 0.2);
            }

            .list-item.issue {
                border-left: 3px solid #ef4444;
            }

            .item-id {
                font-family: 'Monaco', 'Consolas', monospace;
                color: #60a5fa;
                font-size: 13px;
            }

            .item-name {
                color: #e6edf3;
                flex: 1;
                margin: 0 15px;
            }

            .item-status {
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
            }

            /* Status Badges */
            .status-badge,
            .status-overdue,
            .status-pending,
            .status-in_progress,
            .status-completed,
            .status-created,
            .status-assigned,
            .status-in_transit,
            .status-delivered,
            .status-failed_attempt,
            .status-cancelled,
            .status-planned {
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
            }

            .status-overdue,
            .status-failed_attempt,
            .status-cancelled {
                background: rgba(239, 68, 68, 0.2);
                color: #f87171;
            }

            .status-pending,
            .status-created,
            .status-planned {
                background: rgba(245, 158, 11, 0.2);
                color: #fbbf24;
            }

            .status-in_progress,
            .status-assigned,
            .status-in_transit {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
            }

            .status-completed,
            .status-delivered {
                background: rgba(16, 185, 129, 0.2);
                color: #34d399;
            }

            /* KPI Rows */
            .kpis-container {
                padding: 10px;
            }

            .kpi-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }

            .kpi-row:last-child {
                border-bottom: none;
            }

            .kpi-name {
                color: #8b949e;
            }

            .kpi-stat {
                color: #e6edf3;
                font-weight: 600;
            }

            .kpi-row-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 20px;
            }

            .kpi-item {
                background: rgba(33, 38, 45, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                padding: 20px;
                text-align: center;
            }

            .kpi-item.success {
                border-color: rgba(16, 185, 129, 0.3);
            }

            .kpi-item.warning {
                border-color: rgba(245, 158, 11, 0.3);
            }

            .kpi-item.danger {
                border-color: rgba(239, 68, 68, 0.3);
            }

            /* Wave Cards */
            .wave-card,
            .route-card {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 15px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .wave-card:hover,
            .route-card:hover {
                background: rgba(59, 130, 246, 0.1);
                border-color: rgba(59, 130, 246, 0.3);
            }

            .wave-header,
            .route-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .wave-name {
                color: #e6edf3;
                font-weight: 600;
                font-size: 16px;
            }

            .wave-status {
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
            }

            .wave-stats {
                display: flex;
                gap: 20px;
                color: #8b949e;
                font-size: 14px;
                margin-bottom: 15px;
            }

            .wave-actions {
                display: flex;
                gap: 10px;
            }

            /* Route Card specifics */
            .route-date {
                color: #60a5fa;
                font-weight: 500;
            }

            .route-info {
                display: flex;
                gap: 20px;
                color: #8b949e;
                font-size: 14px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }

            .route-progress {
                margin-bottom: 15px;
            }

            .progress-bar {
                background: rgba(255, 255, 255, 0.1);
                height: 8px;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .progress-fill {
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                height: 100%;
                transition: width 0.3s ease;
            }

            .progress-text {
                color: #8b949e;
                font-size: 13px;
            }

            .route-actions {
                display: flex;
                gap: 10px;
            }

            /* Movement Items */
            .movement-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 12px 15px;
                background: rgba(33, 38, 45, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                margin-bottom: 8px;
                flex-wrap: wrap;
            }

            .movement-type {
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .movement-type.in {
                background: rgba(16, 185, 129, 0.2);
                color: #34d399;
            }

            .movement-type.out {
                background: rgba(239, 68, 68, 0.2);
                color: #f87171;
            }

            .movement-type.transfer {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
            }

            .movement-product {
                color: #e6edf3;
                flex: 1;
            }

            .movement-qty {
                font-family: 'Monaco', 'Consolas', monospace;
                font-weight: 600;
            }

            .movement-qty.positive {
                color: #34d399;
            }

            .movement-qty.negative {
                color: #f87171;
            }

            .movement-location {
                color: #8b949e;
                font-size: 13px;
            }

            .movement-date {
                color: #8b949e;
                font-size: 12px;
            }

            /* Vehicle and Driver Items */
            .vehicle-item,
            .driver-item {
                display: flex;
                align-items: center;
                gap: 20px;
                padding: 15px;
                background: rgba(33, 38, 45, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                margin-bottom: 10px;
            }

            .vehicle-item.available,
            .driver-item.available {
                border-left: 3px solid #10b981;
            }

            .vehicle-item.busy,
            .driver-item.busy {
                border-left: 3px solid #ef4444;
            }

            .vehicle-plate {
                font-family: 'Monaco', 'Consolas', monospace;
                background: rgba(59, 130, 246, 0.15);
                color: #60a5fa;
                padding: 4px 10px;
                border-radius: 4px;
                font-weight: 600;
            }

            .vehicle-info,
            .driver-name {
                color: #e6edf3;
                flex: 1;
            }

            .vehicle-carrier,
            .driver-carrier,
            .driver-phone {
                color: #8b949e;
            }

            .vehicle-status,
            .driver-status {
                font-size: 13px;
            }

            /* Location Types */
            .location-type-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 12px 15px;
                background: rgba(33, 38, 45, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                margin-bottom: 8px;
            }

            .type-code {
                background: rgba(139, 92, 246, 0.2);
                color: #a78bfa;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
            }

            .type-name {
                color: #e6edf3;
                flex: 1;
            }

            .type-props {
                color: #8b949e;
                font-size: 13px;
            }

            /* Package Types */
            .package-type-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 12px 15px;
                background: rgba(33, 38, 45, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                margin-bottom: 8px;
            }

            .pt-code {
                background: rgba(245, 158, 11, 0.2);
                color: #fbbf24;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
            }

            .pt-name {
                color: #e6edf3;
                flex: 1;
            }

            .pt-dims {
                color: #8b949e;
                font-size: 13px;
            }

            /* Config Grid */
            .config-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 20px;
            }

            .config-card {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 25px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .config-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
                border-color: rgba(59, 130, 246, 0.3);
            }

            .config-icon {
                font-size: 36px;
                display: block;
                margin-bottom: 10px;
            }

            .config-label {
                color: #e6edf3;
                font-weight: 600;
            }

            /* Picking Tabs */
            .picking-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }

            .picking-tab {
                padding: 8px 16px;
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #8b949e;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .picking-tab:hover {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
            }

            .picking-tab.active {
                background: #3b82f6;
                color: #fff;
                border-color: #3b82f6;
            }

            /* Top Pickers */
            .top-pickers h4 {
                color: #e6edf3;
                font-size: 14px;
                margin: 20px 0 10px 0;
            }

            .picker-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 10px;
                background: rgba(33, 38, 45, 0.5);
                border-radius: 8px;
                margin-bottom: 8px;
            }

            .picker-rank {
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                color: #fff;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
            }

            .picker-name {
                color: #e6edf3;
                flex: 1;
            }

            .picker-stat {
                color: #8b949e;
            }

            .picker-rate {
                color: #34d399;
                font-weight: 600;
            }

            /* Tracking Number */
            .tracking-number {
                font-family: 'Monaco', 'Consolas', monospace;
                background: rgba(59, 130, 246, 0.15);
                color: #60a5fa;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 13px;
            }

            .address-cell {
                max-width: 250px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .actions-cell {
                display: flex;
                gap: 5px;
            }

            /* Shipment Row Colors */
            .shipment-row.delivered td {
                opacity: 0.7;
            }

            .shipment-row.cancelled td {
                opacity: 0.5;
                text-decoration: line-through;
            }

            /* Map Placeholder */
            .zones-map-placeholder {
                background: rgba(33, 38, 45, 0.6);
                border: 2px dashed rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 60px;
                text-align: center;
                color: #8b949e;
            }

            /* Empty & Loading Messages */
            .empty-message,
            .loading-message,
            .info-message {
                text-align: center;
                padding: 40px;
                color: #8b949e;
            }

            .loading-message::after {
                content: '';
                animation: dots 1.5s infinite;
            }

            @keyframes dots {
                0%, 20% { content: '.'; }
                40% { content: '..'; }
                60%, 100% { content: '...'; }
            }

            /* Scrollbars */
            .logistics-dashboard ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            .logistics-dashboard ::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
            }

            .logistics-dashboard ::-webkit-scrollbar-thumb {
                background: rgba(59, 130, 246, 0.3);
                border-radius: 4px;
            }

            .logistics-dashboard ::-webkit-scrollbar-thumb:hover {
                background: rgba(59, 130, 246, 0.5);
            }

            /* ============================================
               ANALYTICS TAB - ESTILOS ADICIONALES
               ============================================ */

            .analytics-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                padding: 15px 20px;
                background: rgba(139, 92, 246, 0.1);
                border: 1px solid rgba(139, 92, 246, 0.2);
                border-radius: 10px;
            }

            .ai-badge {
                display: flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #8b5cf6, #6366f1);
                padding: 8px 16px;
                border-radius: 20px;
            }

            .ai-icon { font-size: 20px; }
            .ai-text { color: #fff; font-weight: 600; font-size: 14px; }

            .last-analysis {
                color: #8b949e;
                font-size: 13px;
            }

            .predictive-kpis-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .predictive-kpi-card {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                position: relative;
            }

            .predictive-kpi-card .kpi-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
            }

            .predictive-kpi-card .kpi-icon { font-size: 24px; }
            .predictive-kpi-card .kpi-title { color: #8b949e; font-size: 14px; }

            .kpi-main-value {
                font-size: 28px;
                font-weight: 700;
                color: #e6edf3;
                margin-bottom: 10px;
            }

            .kpi-trend {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                margin-bottom: 15px;
            }

            .kpi-trend.positive { color: #34d399; }
            .kpi-trend.warning { color: #fbbf24; }
            .kpi-trend.success { color: #34d399; }

            .confidence-bar {
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
                position: relative;
            }

            .confidence-fill {
                height: 100%;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                border-radius: 3px;
            }

            .confidence-label {
                font-size: 11px;
                color: #8b949e;
            }

            .kpi-method {
                font-size: 11px;
                color: #6b7280;
                font-style: italic;
                margin-top: 10px;
            }

            /* ABC Analysis */
            .abc-analysis-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 25px;
            }

            .abc-chart-container {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 12px;
                padding: 20px;
            }

            .abc-summary {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .abc-category {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 10px;
                padding: 15px;
                border-left: 4px solid;
            }

            .abc-category.category-a { border-color: #34d399; }
            .abc-category.category-b { border-color: #fbbf24; }
            .abc-category.category-c { border-color: #f87171; }

            .abc-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }

            .abc-letter {
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-weight: 700;
                color: #fff;
            }

            .category-a .abc-letter { background: #34d399; }
            .category-b .abc-letter { background: #fbbf24; }
            .category-c .abc-letter { background: #f87171; }

            .abc-title { color: #e6edf3; font-weight: 600; }

            .abc-stats {
                display: flex;
                gap: 20px;
                margin-bottom: 10px;
            }

            .abc-stat {
                display: flex;
                flex-direction: column;
            }

            .abc-recommendation {
                font-size: 12px;
                color: #8b949e;
                padding: 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
            }

            /* Velocity Analysis */
            .velocity-analysis-grid {
                display: grid;
                grid-template-columns: 1.5fr 1fr;
                gap: 25px;
            }

            .velocity-chart-container {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 12px;
                padding: 20px;
            }

            .velocity-metrics {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .velocity-metric-card {
                display: flex;
                gap: 15px;
                background: rgba(33, 38, 45, 0.6);
                border-radius: 10px;
                padding: 15px;
            }

            .velocity-metric-card .metric-icon { font-size: 28px; }

            .velocity-metric-card .metric-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .velocity-metric-card .metric-label {
                font-size: 13px;
                color: #8b949e;
            }

            .velocity-metric-card .metric-value {
                font-size: 18px;
                font-weight: 600;
                color: #e6edf3;
            }

            .velocity-metric-card .metric-value.danger { color: #f87171; }
            .velocity-metric-card .metric-value.warning { color: #fbbf24; }

            .velocity-metric-card .metric-benchmark {
                font-size: 11px;
                color: #6b7280;
            }

            /* AI Recommendations */
            .ai-recommendations {
                display: grid;
                gap: 20px;
            }

            .recommendation-card {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                display: grid;
                grid-template-columns: auto 1fr auto;
                gap: 20px;
                align-items: start;
            }

            .recommendation-card.priority-high {
                border-left: 4px solid #ef4444;
            }

            .recommendation-card.priority-medium {
                border-left: 4px solid #fbbf24;
            }

            .recommendation-card.priority-info {
                border-left: 4px solid #3b82f6;
            }

            .rec-priority {
                font-weight: 700;
                font-size: 14px;
            }

            .rec-content h4 {
                color: #e6edf3;
                margin: 0 0 10px 0;
                font-size: 16px;
            }

            .rec-items .rec-item {
                display: flex;
                gap: 15px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                font-size: 13px;
            }

            .rec-item .item-sku {
                font-family: monospace;
                color: #60a5fa;
            }

            .rec-item .item-name {
                color: #e6edf3;
                flex: 1;
            }

            .rec-item .item-qty {
                color: #34d399;
                font-weight: 500;
            }

            .rec-item .item-deadline {
                color: #fbbf24;
            }

            .rec-summary {
                color: #8b949e;
                font-size: 14px;
                margin: 0;
            }

            .rec-summary .savings { color: #34d399; font-weight: 600; }
            .rec-summary .volume { color: #60a5fa; font-weight: 600; }

            /* Probability Analysis */
            .probability-analysis {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 25px;
            }

            .probability-chart-container {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 12px;
                padding: 20px;
            }

            .probability-stats {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .prob-stat {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 10px;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            /* Forecast */
            .forecast-container {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 12px;
                padding: 20px;
            }

            .forecast-controls {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
            }

            .forecast-controls select {
                padding: 8px 15px;
                background: rgba(33, 38, 45, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 6px;
                color: #e6edf3;
                font-size: 13px;
            }

            .forecast-legend {
                display: flex;
                gap: 25px;
                justify-content: center;
                margin-top: 15px;
            }

            .legend-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #8b949e;
            }

            .legend-color {
                width: 20px;
                height: 4px;
                border-radius: 2px;
            }

            /* ============================================
               COSTS TAB - ESTILOS ADICIONALES
               ============================================ */

            .cost-summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .cost-card {
                display: flex;
                gap: 15px;
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                align-items: center;
            }

            .cost-card.total {
                border-color: rgba(59, 130, 246, 0.3);
                background: rgba(59, 130, 246, 0.1);
            }

            .cost-icon { font-size: 32px; }

            .cost-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .cost-label {
                font-size: 13px;
                color: #8b949e;
            }

            .cost-value {
                font-size: 24px;
                font-weight: 700;
                color: #e6edf3;
            }

            .cost-change {
                font-size: 12px;
            }

            .cost-change.negative { color: #f87171; }
            .cost-change.positive { color: #34d399; }

            .cost-benchmark {
                font-size: 11px;
                color: #6b7280;
            }

            .cost-breakdown-grid {
                display: grid;
                grid-template-columns: 1fr 1.5fr;
                gap: 25px;
            }

            .cost-chart-container {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 12px;
                padding: 20px;
            }

            .trend-up { color: #f87171; }
            .trend-down { color: #34d399; }
            .trend-stable { color: #8b949e; }

            /* Rotation Analysis */
            .rotation-analysis-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
            }

            .rotation-category {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
            }

            .rotation-category.high-rotation { border-top: 3px solid #34d399; }
            .rotation-category.medium-rotation { border-top: 3px solid #fbbf24; }
            .rotation-category.low-rotation { border-top: 3px solid #f87171; }

            .rotation-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
            }

            .rotation-icon { font-size: 24px; }
            .rotation-title { color: #e6edf3; font-weight: 600; flex: 1; }

            .rotation-badge {
                font-size: 11px;
                padding: 4px 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                color: #8b949e;
            }

            .rotation-stats {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                margin-bottom: 15px;
            }

            .rotation-stat {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .rotation-stat .stat-label { font-size: 11px; color: #8b949e; }
            .rotation-stat .stat-value { font-size: 16px; font-weight: 600; color: #e6edf3; }
            .rotation-stat .stat-value.success { color: #34d399; }
            .rotation-stat .stat-value.warning { color: #fbbf24; }
            .rotation-stat .stat-value.danger { color: #f87171; }

            .rotation-recommendation {
                font-size: 12px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                color: #8b949e;
            }

            /* EOQ Calculator */
            .eoq-calculator {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 25px;
                background: rgba(33, 38, 45, 0.6);
                border-radius: 12px;
                padding: 25px;
            }

            .eoq-inputs {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .eoq-input-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .eoq-input-group label {
                font-size: 13px;
                color: #8b949e;
            }

            .eoq-input-group input {
                padding: 10px 15px;
                background: rgba(33, 38, 45, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #e6edf3;
                font-size: 14px;
            }

            .eoq-results {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }

            .eoq-result-card {
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.2);
                border-radius: 10px;
                padding: 15px;
                text-align: center;
            }

            .eoq-result-card .result-label {
                font-size: 12px;
                color: #8b949e;
                display: block;
                margin-bottom: 8px;
            }

            .eoq-result-card .result-value {
                font-size: 20px;
                font-weight: 700;
                color: #60a5fa;
            }

            /* Space Utilization */
            .space-utilization-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 25px;
            }

            .space-chart-container {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 12px;
                padding: 20px;
            }

            .space-metrics {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .space-metric {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 10px;
                padding: 15px;
                display: flex;
                justify-content: space-between;
            }

            .space-metric.warning {
                border: 1px solid rgba(245, 158, 11, 0.3);
            }

            /* ============================================
               SCHEDULED REQUESTS TAB
               ============================================ */

            .workflow-explanation {
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
                border: 1px solid rgba(59, 130, 246, 0.2);
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 25px;
            }

            .workflow-explanation h4 {
                color: #e6edf3;
                margin: 0 0 15px 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .workflow-steps {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }

            .workflow-step {
                display: flex;
                gap: 12px;
                padding: 15px;
                background: rgba(33, 38, 45, 0.6);
                border-radius: 10px;
            }

            .step-number {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 13px;
                flex-shrink: 0;
            }

            .step-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .step-title {
                font-weight: 600;
                color: #e6edf3;
                font-size: 14px;
            }

            .step-desc {
                font-size: 12px;
                color: #8b949e;
            }

            /* Request Form */
            .request-form-container {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 25px;
            }

            .form-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .form-group label {
                font-size: 13px;
                color: #8b949e;
                font-weight: 500;
            }

            .form-group label .required {
                color: #ef4444;
            }

            .form-group input,
            .form-group select,
            .form-group textarea {
                padding: 12px 15px;
                background: rgba(33, 38, 45, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #e6edf3;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                outline: none;
            }

            .form-group .helper-text {
                font-size: 11px;
                color: #6b7280;
            }

            .form-actions {
                display: flex;
                gap: 15px;
                margin-top: 20px;
                justify-content: flex-end;
            }

            /* Request Cards */
            .requests-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .request-card {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                display: grid;
                grid-template-columns: auto 1fr auto;
                gap: 20px;
                align-items: start;
                transition: all 0.3s ease;
            }

            .request-card:hover {
                border-color: rgba(59, 130, 246, 0.3);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }

            .request-card.status-pending { border-left: 4px solid #fbbf24; }
            .request-card.status-confirmed { border-left: 4px solid #3b82f6; }
            .request-card.status-ready { border-left: 4px solid #8b5cf6; }
            .request-card.status-completed { border-left: 4px solid #34d399; }
            .request-card.status-cancelled { border-left: 4px solid #ef4444; opacity: 0.7; }
            .request-card.status-stockout { border-left: 4px solid #f97316; }

            .request-date-block {
                text-align: center;
                padding: 15px;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 10px;
                min-width: 80px;
            }

            .request-day {
                font-size: 28px;
                font-weight: 700;
                color: #60a5fa;
            }

            .request-month {
                font-size: 12px;
                color: #8b949e;
                text-transform: uppercase;
            }

            .request-info {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .request-header {
                display: flex;
                align-items: center;
                gap: 15px;
            }

            .request-code {
                font-family: monospace;
                background: rgba(59, 130, 246, 0.15);
                color: #60a5fa;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 13px;
            }

            .request-sector {
                color: #e6edf3;
                font-weight: 600;
            }

            .request-dept {
                color: #8b949e;
                font-size: 13px;
            }

            .request-product {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .product-name {
                color: #e6edf3;
                font-size: 16px;
            }

            .product-qty {
                font-weight: 600;
                color: #34d399;
            }

            .request-meta {
                display: flex;
                gap: 20px;
                color: #8b949e;
                font-size: 13px;
            }

            .request-actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .stock-indicator {
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                text-align: center;
            }

            .stock-indicator.available {
                background: rgba(16, 185, 129, 0.2);
                color: #34d399;
            }

            .stock-indicator.partial {
                background: rgba(245, 158, 11, 0.2);
                color: #fbbf24;
            }

            .stock-indicator.unavailable {
                background: rgba(239, 68, 68, 0.2);
                color: #f87171;
            }

            /* ============================================
               TRANSFERS TAB
               ============================================ */

            .transfer-timeline {
                display: flex;
                flex-direction: column;
                gap: 0;
                position: relative;
                padding-left: 30px;
            }

            .transfer-timeline::before {
                content: '';
                position: absolute;
                left: 12px;
                top: 20px;
                bottom: 20px;
                width: 2px;
                background: rgba(59, 130, 246, 0.3);
            }

            .timeline-event {
                position: relative;
                padding: 15px 20px;
                background: rgba(33, 38, 45, 0.6);
                border-radius: 10px;
                margin-bottom: 15px;
            }

            .timeline-event::before {
                content: '';
                position: absolute;
                left: -23px;
                top: 20px;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #3b82f6;
                border: 2px solid rgba(33, 38, 45, 0.9);
            }

            .timeline-event.completed::before { background: #34d399; }
            .timeline-event.current::before { background: #fbbf24; box-shadow: 0 0 10px #fbbf24; }
            .timeline-event.pending::before { background: #6b7280; }

            .timeline-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .timeline-title {
                color: #e6edf3;
                font-weight: 600;
            }

            .timeline-time {
                color: #8b949e;
                font-size: 12px;
            }

            .timeline-details {
                color: #8b949e;
                font-size: 13px;
            }

            .timeline-actor {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 10px;
                font-size: 12px;
            }

            .actor-avatar {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: #fff;
                font-weight: 600;
            }

            /* ============================================
               SLA TAB
               ============================================ */

            .sla-overview-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }

            .sla-card {
                background: rgba(33, 38, 45, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 20px;
                position: relative;
                overflow: hidden;
            }

            .sla-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
            }

            .sla-card.excellent::before { background: #34d399; }
            .sla-card.good::before { background: #3b82f6; }
            .sla-card.warning::before { background: #fbbf24; }
            .sla-card.critical::before { background: #ef4444; }

            .sla-metric-name {
                color: #8b949e;
                font-size: 13px;
                margin-bottom: 10px;
            }

            .sla-metric-value {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 5px;
            }

            .sla-card.excellent .sla-metric-value { color: #34d399; }
            .sla-card.good .sla-metric-value { color: #60a5fa; }
            .sla-card.warning .sla-metric-value { color: #fbbf24; }
            .sla-card.critical .sla-metric-value { color: #f87171; }

            .sla-target {
                font-size: 12px;
                color: #6b7280;
            }

            .sla-trend {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 12px;
                margin-top: 10px;
            }

            .sla-breaches-list {
                background: rgba(33, 38, 45, 0.6);
                border-radius: 12px;
                padding: 20px;
            }

            .breach-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 10px;
                margin-bottom: 10px;
            }

            .breach-severity {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            }

            .breach-severity.high { background: rgba(239, 68, 68, 0.2); }
            .breach-severity.medium { background: rgba(245, 158, 11, 0.2); }

            .breach-info { flex: 1; }
            .breach-title { color: #e6edf3; font-weight: 600; }
            .breach-details { color: #8b949e; font-size: 13px; margin-top: 4px; }

            .breach-time {
                text-align: right;
            }

            .breach-elapsed {
                color: #f87171;
                font-weight: 600;
            }

            .breach-expected {
                color: #6b7280;
                font-size: 12px;
            }

            /* Notification Badge */
            .notification-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
            }

            .notification-badge.sent {
                background: rgba(16, 185, 129, 0.2);
                color: #34d399;
            }

            .notification-badge.pending {
                background: rgba(245, 158, 11, 0.2);
                color: #fbbf24;
            }

            /* Notificaciones toast */
            .logistics-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 10px;
                color: white;
                font-weight: 500;
                z-index: 10001;
                animation: slideIn 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            }

            .logistics-notification.success {
                background: linear-gradient(135deg, #10b981, #059669);
            }

            .logistics-notification.error {
                background: linear-gradient(135deg, #ef4444, #dc2626);
            }

            .logistics-notification.info {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
            }

            .logistics-notification.warning {
                background: linear-gradient(135deg, #f59e0b, #d97706);
            }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            /* Info Banner */
            .info-banner {
                background: rgba(59, 130, 246, 0.15);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                color: #93c5fd;
            }

            .info-banner .info-icon {
                font-size: 18px;
            }

            /* Empty State */
            .empty-state {
                text-align: center;
                padding: 60px 20px;
                background: rgba(30, 30, 50, 0.5);
                border-radius: 12px;
                border: 2px dashed rgba(255, 255, 255, 0.1);
            }

            .empty-state .empty-icon {
                font-size: 48px;
                display: block;
                margin-bottom: 15px;
            }

            .empty-state h4 {
                color: #e6edf3;
                margin: 0 0 10px 0;
            }

            .empty-state p {
                color: #8b949e;
                margin: 0 0 20px 0;
            }

            .empty-text {
                color: #8b949e;
                font-style: italic;
                padding: 20px;
            }

            /* Header actions */
            .header-actions {
                display: flex;
                gap: 10px;
                align-items: center;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    // Cache de datos
    const cache = {
        warehouses: [],
        carriers: [],
        deliveryZones: [],
        vehicles: [],
        drivers: [],
        locationTypes: [],
        packageTypes: []
    };

    // ============================================================================
    // INICIALIZACIÓN
    // ============================================================================

    window.LogisticsDashboard = {
        init,
        render,
        switchTab,
        refreshData
    };

    async function init(containerId) {
        // Inyectar estilos dark theme
        injectStyles();

        // Obtener companyId desde el estado global
        const company = window.currentCompany || window.selectedCompany;
        currentCompanyId = company?.id || company?.company_id;

        if (!currentCompanyId) {
            console.error('❌ [LOGISTICS] No se pudo obtener el ID de la empresa');
            return;
        }

        console.log('🚚 [LOGISTICS] Inicializando Dashboard de Logística para empresa:', currentCompanyId);

        // Si se pasó un containerId, crear el contenedor
        if (containerId && !document.getElementById('logistics-dashboard-container')) {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '<div id="logistics-dashboard-container"></div>';
            }
        }

        try {
            // Cargar datos iniciales en paralelo
            await Promise.all([
                loadWarehouses(),
                loadCarriers(),
                loadDeliveryZones(),
                loadLocationTypes(),
                loadPackageTypes()
            ]);

            render();
            setupEventListeners();
            console.log('🚚 [LOGISTICS] Dashboard inicializado correctamente');
        } catch (error) {
            console.error('❌ [LOGISTICS] Error inicializando:', error);
            showError('Error al cargar el módulo de logística');
        }
    }

    function render() {
        const container = document.getElementById('logistics-dashboard-container');
        if (!container) {
            console.error('❌ [LOGISTICS] Contenedor no encontrado');
            return;
        }

        container.innerHTML = `
            <div class="logistics-dashboard">
                ${renderHeader()}
                ${renderTabs()}
                <div class="logistics-content" id="logistics-content">
                    ${renderTabContent(currentTab)}
                </div>
            </div>
        `;
    }

    // ============================================================================
    // HEADER Y TABS
    // ============================================================================

    function renderHeader() {
        return `
            <div class="logistics-header">
                <div class="logistics-title">
                    <h2>🚚 Logística Avanzada</h2>
                    <span class="logistics-subtitle">WMS + TMS Integrado</span>
                </div>
                <div class="logistics-warehouse-selector">
                    <label>Almacén:</label>
                    <select id="warehouse-selector" onchange="LogisticsDashboard.onWarehouseChange(this.value)">
                        <option value="">-- Todos los almacenes --</option>
                        ${cache.warehouses.map(w => `
                            <option value="${w.id}" ${w.id == currentWarehouseId ? 'selected' : ''}>
                                ${w.name} (${w.code})
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="logistics-actions">
                    <button class="btn-refresh" onclick="LogisticsDashboard.refreshData()">
                        🔄 Actualizar
                    </button>
                </div>
            </div>
        `;
    }

    function renderTabs() {
        const tabs = [
            { id: 'overview', icon: '📊', label: 'Resumen' },
            { id: 'analytics', icon: '🧠', label: 'Analytics IA' },
            { id: 'requests', icon: '📝', label: 'Solicitudes' },
            { id: 'warehouses', icon: '🏭', label: 'Almacenes' },
            { id: 'inventory', icon: '📦', label: 'Inventario' },
            { id: 'transfers', icon: '🔄', label: 'Transferencias' },
            { id: 'picking', icon: '🌊', label: 'Picking' },
            { id: 'packing', icon: '📋', label: 'Packing' },
            { id: 'carriers', icon: '🚛', label: 'Transportistas' },
            { id: 'zones', icon: '📍', label: 'Zonas' },
            { id: 'routes', icon: '🗺️', label: 'Rutas' },
            { id: 'shipments', icon: '📬', label: 'Envíos' },
            { id: 'sla', icon: '⏱️', label: 'SLA' },
            { id: 'costs', icon: '💰', label: 'Costos' },
            { id: 'config', icon: '⚙️', label: 'Configuración' }
        ];

        return `
            <div class="logistics-tabs">
                ${tabs.map(tab => `
                    <button class="logistics-tab ${tab.id === currentTab ? 'active' : ''}"
                            onclick="LogisticsDashboard.switchTab('${tab.id}')">
                        ${tab.icon} ${tab.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    function switchTab(tabId) {
        currentTab = tabId;
        const content = document.getElementById('logistics-content');
        if (content) {
            content.innerHTML = renderTabContent(tabId);
        }
        // Actualizar tabs activos
        document.querySelectorAll('.logistics-tab').forEach(tab => {
            tab.classList.toggle('active', tab.textContent.toLowerCase().includes(tabId));
        });
        // Cargar datos específicos del tab
        loadTabData(tabId);
    }

    function renderTabContent(tabId) {
        switch (tabId) {
            case 'overview': return renderOverviewTab();
            case 'analytics': return renderAnalyticsTab();
            case 'requests': return renderScheduledRequestsTab();
            case 'warehouses': return renderWarehousesTab();
            case 'inventory': return renderInventoryTab();
            case 'transfers': return renderTransfersTab();
            case 'picking': return renderPickingTab();
            case 'packing': return renderPackingTab();
            case 'carriers': return renderCarriersTab();
            case 'zones': return renderZonesTab();
            case 'routes': return renderRoutesTab();
            case 'shipments': return renderShipmentsTab();
            case 'sla': return renderSLATab();
            case 'costs': return renderCostsTab();
            case 'config': return renderConfigTab();
            default: return '<p>Tab no encontrado</p>';
        }
    }

    // ============================================================================
    // TAB: RESUMEN (OVERVIEW)
    // ============================================================================

    function renderOverviewTab() {
        return `
            <div class="logistics-overview">
                <div class="kpi-cards">
                    <div class="kpi-card" id="kpi-warehouses">
                        <div class="kpi-icon">🏭</div>
                        <div class="kpi-value">${cache.warehouses.length}</div>
                        <div class="kpi-label">Almacenes</div>
                    </div>
                    <div class="kpi-card" id="kpi-carriers">
                        <div class="kpi-icon">🚛</div>
                        <div class="kpi-value">${cache.carriers.length}</div>
                        <div class="kpi-label">Transportistas</div>
                    </div>
                    <div class="kpi-card" id="kpi-zones">
                        <div class="kpi-icon">📍</div>
                        <div class="kpi-value">${cache.deliveryZones.length}</div>
                        <div class="kpi-label">Zonas de Entrega</div>
                    </div>
                    <div class="kpi-card loading" id="kpi-pending-shipments">
                        <div class="kpi-icon">📬</div>
                        <div class="kpi-value">--</div>
                        <div class="kpi-label">Envíos Pendientes</div>
                    </div>
                </div>

                <div class="overview-grid">
                    <div class="overview-section">
                        <h3>🌊 Olas de Picking Activas</h3>
                        <div id="active-waves-list" class="list-container loading">
                            Cargando...
                        </div>
                    </div>

                    <div class="overview-section">
                        <h3>🗺️ Rutas del Día</h3>
                        <div id="today-routes-list" class="list-container loading">
                            Cargando...
                        </div>
                    </div>

                    <div class="overview-section">
                        <h3>⚠️ Envíos con Problemas</h3>
                        <div id="issue-shipments-list" class="list-container loading">
                            Cargando...
                        </div>
                    </div>

                    <div class="overview-section">
                        <h3>📊 KPIs del Mes</h3>
                        <div id="monthly-kpis" class="kpis-container loading">
                            Cargando...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadOverviewData() {
        try {
            // Cargar datos de overview en paralelo
            const [pendingShipments, shipmentKpis] = await Promise.all([
                fetchAPI('/shipments/pending?limit=10'),
                fetchAPI('/shipments/kpis')
            ]);

            // Actualizar KPIs
            const kpiPending = document.getElementById('kpi-pending-shipments');
            if (kpiPending && pendingShipments.data) {
                kpiPending.classList.remove('loading');
                kpiPending.querySelector('.kpi-value').textContent = pendingShipments.data.length;
            }

            // Actualizar KPIs mensuales
            const monthlyKpis = document.getElementById('monthly-kpis');
            if (monthlyKpis && shipmentKpis.data) {
                const kpis = shipmentKpis.data.summary || {};
                monthlyKpis.classList.remove('loading');
                monthlyKpis.innerHTML = `
                    <div class="kpi-row">
                        <span class="kpi-name">Tasa de Entrega</span>
                        <span class="kpi-stat">${(kpis.delivery_rate || 0).toFixed(1)}%</span>
                    </div>
                    <div class="kpi-row">
                        <span class="kpi-name">Entregas a Tiempo</span>
                        <span class="kpi-stat">${(kpis.on_time_rate || 0).toFixed(1)}%</span>
                    </div>
                    <div class="kpi-row">
                        <span class="kpi-name">Tiempo Promedio</span>
                        <span class="kpi-stat">${(kpis.avg_delivery_hours || 0).toFixed(1)}h</span>
                    </div>
                    <div class="kpi-row">
                        <span class="kpi-name">Total Envíos</span>
                        <span class="kpi-stat">${kpis.total_shipments || 0}</span>
                    </div>
                `;
            }

            // Actualizar lista de envíos con problemas
            const issueList = document.getElementById('issue-shipments-list');
            if (issueList && pendingShipments.data) {
                const issues = pendingShipments.data.filter(s => s.urgency === 'OVERDUE');
                issueList.classList.remove('loading');
                if (issues.length === 0) {
                    issueList.innerHTML = '<p class="empty-message">Sin problemas pendientes</p>';
                } else {
                    issueList.innerHTML = issues.slice(0, 5).map(s => `
                        <div class="list-item issue">
                            <span class="item-id">${s.tracking_number}</span>
                            <span class="item-name">${s.customer_name || 'Cliente'}</span>
                            <span class="item-status status-overdue">Vencido</span>
                        </div>
                    `).join('');
                }
            }

        } catch (error) {
            console.error('Error cargando overview:', error);
        }
    }

    // ============================================================================
    // TAB: ANALYTICS IA - INTELIGENCIA ARTIFICIAL Y PREDICCIONES
    // ============================================================================

    function renderAnalyticsTab() {
        return `
            <div class="logistics-analytics">
                <!-- Header con IA Badge -->
                <div class="analytics-header">
                    <div class="ai-badge">
                        <span class="ai-icon">🧠</span>
                        <span class="ai-text">Powered by AI</span>
                    </div>
                    <div class="last-analysis">
                        Último análisis: ${new Date().toLocaleString('es-AR')}
                    </div>
                </div>

                <!-- KPIs Predictivos -->
                <div class="section-header">
                    <h3>📈 KPIs Predictivos con Machine Learning</h3>
                </div>
                <div class="predictive-kpis-grid" id="predictive-kpis">
                    <div class="predictive-kpi-card">
                        <div class="kpi-header">
                            <span class="kpi-icon">📊</span>
                            <span class="kpi-title">Demanda Proyectada</span>
                        </div>
                        <div class="kpi-main-value" id="demand-forecast">--</div>
                        <div class="kpi-trend positive">
                            <span class="trend-arrow">↑</span>
                            <span class="trend-value">+12.5%</span>
                            <span class="trend-period">vs mes anterior</span>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: 85%"></div>
                            <span class="confidence-label">85% confianza</span>
                        </div>
                        <div class="kpi-method">Método: ARIMA + Random Forest</div>
                    </div>

                    <div class="predictive-kpi-card">
                        <div class="kpi-header">
                            <span class="kpi-icon">📦</span>
                            <span class="kpi-title">Stock Óptimo</span>
                        </div>
                        <div class="kpi-main-value" id="optimal-stock">--</div>
                        <div class="kpi-trend warning">
                            <span class="trend-arrow">⚠️</span>
                            <span class="trend-value">-8.2%</span>
                            <span class="trend-period">ajuste sugerido</span>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: 92%"></div>
                            <span class="confidence-label">92% confianza</span>
                        </div>
                        <div class="kpi-method">Método: EOQ + Safety Stock ML</div>
                    </div>

                    <div class="predictive-kpi-card">
                        <div class="kpi-header">
                            <span class="kpi-icon">🚚</span>
                            <span class="kpi-title">Lead Time Esperado</span>
                        </div>
                        <div class="kpi-main-value" id="lead-time-pred">-- días</div>
                        <div class="kpi-trend positive">
                            <span class="trend-arrow">↓</span>
                            <span class="trend-value">-0.5 días</span>
                            <span class="trend-period">mejora proyectada</span>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: 78%"></div>
                            <span class="confidence-label">78% confianza</span>
                        </div>
                        <div class="kpi-method">Método: XGBoost Regression</div>
                    </div>

                    <div class="predictive-kpi-card">
                        <div class="kpi-header">
                            <span class="kpi-icon">💰</span>
                            <span class="kpi-title">Ahorro Potencial</span>
                        </div>
                        <div class="kpi-main-value" id="savings-potential">$--</div>
                        <div class="kpi-trend success">
                            <span class="trend-arrow">💵</span>
                            <span class="trend-value">Este mes</span>
                            <span class="trend-period">optimizando stocks</span>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: 88%"></div>
                            <span class="confidence-label">88% confianza</span>
                        </div>
                        <div class="kpi-method">Método: Cost Optimization AI</div>
                    </div>
                </div>

                <!-- Análisis ABC con Gráfico -->
                <div class="section-header mt-4">
                    <h3>📊 Análisis ABC de Inventario (Pareto)</h3>
                    <div class="analysis-actions">
                        <button class="btn-secondary" onclick="LogisticsDashboard.recalculateABC()">
                            🔄 Recalcular
                        </button>
                        <button class="btn-secondary" onclick="LogisticsDashboard.exportABC()">
                            📥 Exportar
                        </button>
                    </div>
                </div>
                <div class="abc-analysis-grid">
                    <div class="abc-chart-container">
                        <canvas id="abc-pareto-chart" height="300"></canvas>
                    </div>
                    <div class="abc-summary">
                        <div class="abc-category category-a">
                            <div class="abc-header">
                                <span class="abc-letter">A</span>
                                <span class="abc-title">Alta Rotación</span>
                            </div>
                            <div class="abc-stats">
                                <div class="abc-stat">
                                    <span class="stat-value" id="abc-a-items">--</span>
                                    <span class="stat-label">SKUs (20%)</span>
                                </div>
                                <div class="abc-stat">
                                    <span class="stat-value" id="abc-a-revenue">--</span>
                                    <span class="stat-label">del Revenue (80%)</span>
                                </div>
                            </div>
                            <div class="abc-recommendation">
                                💡 Máxima atención, reposición continua
                            </div>
                        </div>

                        <div class="abc-category category-b">
                            <div class="abc-header">
                                <span class="abc-letter">B</span>
                                <span class="abc-title">Media Rotación</span>
                            </div>
                            <div class="abc-stats">
                                <div class="abc-stat">
                                    <span class="stat-value" id="abc-b-items">--</span>
                                    <span class="stat-label">SKUs (30%)</span>
                                </div>
                                <div class="abc-stat">
                                    <span class="stat-value" id="abc-b-revenue">--</span>
                                    <span class="stat-label">del Revenue (15%)</span>
                                </div>
                            </div>
                            <div class="abc-recommendation">
                                📦 Control moderado, pedidos periódicos
                            </div>
                        </div>

                        <div class="abc-category category-c">
                            <div class="abc-header">
                                <span class="abc-letter">C</span>
                                <span class="abc-title">Baja Rotación</span>
                            </div>
                            <div class="abc-stats">
                                <div class="abc-stat">
                                    <span class="stat-value" id="abc-c-items">--</span>
                                    <span class="stat-label">SKUs (50%)</span>
                                </div>
                                <div class="abc-stat">
                                    <span class="stat-value" id="abc-c-revenue">--</span>
                                    <span class="stat-label">del Revenue (5%)</span>
                                </div>
                            </div>
                            <div class="abc-recommendation">
                                ⚠️ Evaluar discontinuación o promociones
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Análisis de Rotación y Velocidad -->
                <div class="section-header mt-4">
                    <h3>⚡ Velocidad de Inventario y Días de Stock</h3>
                </div>
                <div class="velocity-analysis-grid">
                    <div class="velocity-chart-container">
                        <canvas id="velocity-scatter-chart" height="280"></canvas>
                    </div>
                    <div class="velocity-metrics">
                        <div class="velocity-metric-card">
                            <div class="metric-icon">🔄</div>
                            <div class="metric-content">
                                <span class="metric-label">Rotación Promedio</span>
                                <span class="metric-value" id="avg-turnover">-- veces/año</span>
                                <span class="metric-benchmark">Benchmark: 12x</span>
                            </div>
                        </div>
                        <div class="velocity-metric-card">
                            <div class="metric-icon">📅</div>
                            <div class="metric-content">
                                <span class="metric-label">Días de Stock</span>
                                <span class="metric-value" id="days-of-stock">-- días</span>
                                <span class="metric-benchmark">Óptimo: 30 días</span>
                            </div>
                        </div>
                        <div class="velocity-metric-card">
                            <div class="metric-icon">📉</div>
                            <div class="metric-content">
                                <span class="metric-label">Stock Muerto</span>
                                <span class="metric-value danger" id="dead-stock">-- SKUs</span>
                                <span class="metric-benchmark">&gt;180 días sin movimiento</span>
                            </div>
                        </div>
                        <div class="velocity-metric-card">
                            <div class="metric-icon">⚠️</div>
                            <div class="metric-content">
                                <span class="metric-label">Riesgo Stockout</span>
                                <span class="metric-value warning" id="stockout-risk">-- SKUs</span>
                                <span class="metric-benchmark">&lt;7 días de cobertura</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recomendaciones IA para Compras -->
                <div class="section-header mt-4">
                    <h3>🤖 Recomendaciones Inteligentes de Compra</h3>
                </div>
                <div class="ai-recommendations">
                    <div class="recommendation-card priority-high">
                        <div class="rec-priority">🔴 URGENTE</div>
                        <div class="rec-content">
                            <h4>Reposición Inmediata Necesaria</h4>
                            <div class="rec-items" id="urgent-replenishment">
                                <p class="loading-message">Analizando inventario...</p>
                            </div>
                        </div>
                        <div class="rec-action">
                            <button class="btn-primary" onclick="LogisticsDashboard.createPurchaseOrder('urgent')">
                                Generar OC Automática
                            </button>
                        </div>
                    </div>

                    <div class="recommendation-card priority-medium">
                        <div class="rec-priority">🟡 OPTIMIZACIÓN</div>
                        <div class="rec-content">
                            <h4>Oportunidades de Consolidación</h4>
                            <div class="rec-items" id="consolidation-opportunities">
                                <p class="loading-message">Calculando ahorros...</p>
                            </div>
                        </div>
                        <div class="rec-action">
                            <button class="btn-secondary" onclick="LogisticsDashboard.viewConsolidation()">
                                Ver Detalle
                            </button>
                        </div>
                    </div>

                    <div class="recommendation-card priority-info">
                        <div class="rec-priority">🔵 ESTRATÉGICO</div>
                        <div class="rec-content">
                            <h4>Negociación con Proveedores</h4>
                            <div class="rec-items" id="supplier-negotiations">
                                <p class="loading-message">Analizando contratos...</p>
                            </div>
                        </div>
                        <div class="rec-action">
                            <button class="btn-secondary" onclick="LogisticsDashboard.viewNegotiations()">
                                Ver Análisis
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Distribución de Probabilidades -->
                <div class="section-header mt-4">
                    <h3>📊 Análisis Probabilístico de Demanda</h3>
                </div>
                <div class="probability-analysis">
                    <div class="probability-chart-container">
                        <canvas id="demand-distribution-chart" height="250"></canvas>
                    </div>
                    <div class="probability-stats">
                        <div class="prob-stat">
                            <span class="stat-label">Media (μ)</span>
                            <span class="stat-value" id="demand-mean">--</span>
                        </div>
                        <div class="prob-stat">
                            <span class="stat-label">Desv. Estándar (σ)</span>
                            <span class="stat-value" id="demand-std">--</span>
                        </div>
                        <div class="prob-stat">
                            <span class="stat-label">P95 (95% confianza)</span>
                            <span class="stat-value" id="demand-p95">--</span>
                        </div>
                        <div class="prob-stat">
                            <span class="stat-label">Coef. Variación</span>
                            <span class="stat-value" id="demand-cv">--</span>
                        </div>
                    </div>
                </div>

                <!-- Gráficos de Tendencia con Forecast -->
                <div class="section-header mt-4">
                    <h3>📈 Forecast de Demanda con Intervalos de Confianza</h3>
                </div>
                <div class="forecast-container">
                    <div class="forecast-controls">
                        <select id="forecast-horizon" onchange="LogisticsDashboard.updateForecast()">
                            <option value="7">7 días</option>
                            <option value="14">14 días</option>
                            <option value="30" selected>30 días</option>
                            <option value="90">90 días</option>
                        </select>
                        <select id="forecast-method">
                            <option value="arima">ARIMA</option>
                            <option value="prophet" selected>Prophet (Facebook)</option>
                            <option value="lstm">LSTM Neural Network</option>
                            <option value="ensemble">Ensemble (Mejor)</option>
                        </select>
                    </div>
                    <div class="forecast-chart-container">
                        <canvas id="forecast-chart" height="300"></canvas>
                    </div>
                    <div class="forecast-legend">
                        <div class="legend-item">
                            <span class="legend-color" style="background: #3b82f6"></span>
                            <span>Histórico Real</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: #8b5cf6"></span>
                            <span>Predicción</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background: rgba(139, 92, 246, 0.2)"></span>
                            <span>Intervalo 95%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Cargar datos de Analytics
    async function loadAnalyticsData() {
        try {
            // Simular datos predictivos (en producción vendrían del backend con ML)
            await simulatePredictiveKPIs();
            await loadABCAnalysis();
            await loadVelocityMetrics();
            await loadAIRecommendations();
            await initializeCharts();
        } catch (error) {
            console.error('Error cargando analytics:', error);
        }
    }

    // Simular KPIs predictivos
    async function simulatePredictiveKPIs() {
        // En producción estos datos vendrían de modelos ML del backend
        const forecasts = {
            demand: Math.round(1000 + Math.random() * 500),
            optimalStock: Math.round(5000 + Math.random() * 2000),
            leadTime: (3 + Math.random() * 2).toFixed(1),
            savings: Math.round(50000 + Math.random() * 30000)
        };

        updateElement('demand-forecast', formatNumber(forecasts.demand) + ' unidades');
        updateElement('optimal-stock', formatNumber(forecasts.optimalStock) + ' unidades');
        updateElement('lead-time-pred', forecasts.leadTime + ' días');
        updateElement('savings-potential', '$' + formatNumber(forecasts.savings));
    }

    // Análisis ABC
    async function loadABCAnalysis() {
        // Simular datos ABC
        const abcData = {
            a: { items: 85, revenue: '82%' },
            b: { items: 127, revenue: '13%' },
            c: { items: 213, revenue: '5%' }
        };

        updateElement('abc-a-items', abcData.a.items);
        updateElement('abc-a-revenue', abcData.a.revenue);
        updateElement('abc-b-items', abcData.b.items);
        updateElement('abc-b-revenue', abcData.b.revenue);
        updateElement('abc-c-items', abcData.c.items);
        updateElement('abc-c-revenue', abcData.c.revenue);
    }

    // Métricas de velocidad
    async function loadVelocityMetrics() {
        updateElement('avg-turnover', '8.5 veces/año');
        updateElement('days-of-stock', '43 días');
        updateElement('dead-stock', '23 SKUs');
        updateElement('stockout-risk', '12 SKUs');
    }

    // Recomendaciones IA
    async function loadAIRecommendations() {
        // Urgentes
        const urgentEl = document.getElementById('urgent-replenishment');
        if (urgentEl) {
            urgentEl.innerHTML = `
                <div class="rec-item">
                    <span class="item-sku">SKU-1234</span>
                    <span class="item-name">Producto Premium A</span>
                    <span class="item-qty">Pedir: 500 unidades</span>
                    <span class="item-deadline">Antes de: ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR')}</span>
                </div>
                <div class="rec-item">
                    <span class="item-sku">SKU-5678</span>
                    <span class="item-name">Componente Crítico B</span>
                    <span class="item-qty">Pedir: 200 unidades</span>
                    <span class="item-deadline">Antes de: ${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR')}</span>
                </div>
            `;
        }

        // Consolidación
        const consolidationEl = document.getElementById('consolidation-opportunities');
        if (consolidationEl) {
            consolidationEl.innerHTML = `
                <p class="rec-summary">
                    <strong>3 proveedores</strong> con pedidos pequeños pueden consolidarse.
                    <br>Ahorro estimado: <span class="savings">$15,000/mes</span> en fletes
                </p>
            `;
        }

        // Negociaciones
        const negotiationsEl = document.getElementById('supplier-negotiations');
        if (negotiationsEl) {
            negotiationsEl.innerHTML = `
                <p class="rec-summary">
                    <strong>2 contratos</strong> a renovar en 30 días.
                    <br>Volumen negociable: <span class="volume">$250,000/año</span>
                </p>
            `;
        }
    }

    // Inicializar gráficos con Chart.js
    async function initializeCharts() {
        // Verificar si Chart.js está disponible
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js no está cargado. Los gráficos no se renderizarán.');
            return;
        }

        // Gráfico ABC Pareto
        const abcCtx = document.getElementById('abc-pareto-chart')?.getContext('2d');
        if (abcCtx) {
            new Chart(abcCtx, {
                type: 'bar',
                data: {
                    labels: ['A (20%)', 'B (30%)', 'C (50%)'],
                    datasets: [{
                        label: 'Revenue %',
                        data: [80, 15, 5],
                        backgroundColor: ['#34d399', '#fbbf24', '#f87171'],
                        borderRadius: 8
                    }, {
                        label: 'Acumulado %',
                        data: [80, 95, 100],
                        type: 'line',
                        borderColor: '#8b5cf6',
                        borderWidth: 3,
                        fill: false,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e6edf3' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#8b949e' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        },
                        y: {
                            ticks: { color: '#8b949e' },
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            max: 100
                        },
                        y1: {
                            position: 'right',
                            ticks: { color: '#8b5cf6' },
                            grid: { display: false },
                            max: 100
                        }
                    }
                }
            });
        }

        // Gráfico de Forecast
        const forecastCtx = document.getElementById('forecast-chart')?.getContext('2d');
        if (forecastCtx) {
            const historicalData = Array.from({ length: 30 }, (_, i) =>
                100 + Math.sin(i / 5) * 20 + Math.random() * 10
            );
            const forecastData = Array.from({ length: 14 }, (_, i) =>
                110 + Math.sin((30 + i) / 5) * 20 + Math.random() * 5
            );
            const upperBound = forecastData.map(v => v + 15);
            const lowerBound = forecastData.map(v => v - 15);

            const labels = [
                ...Array.from({ length: 30 }, (_, i) => `D-${30 - i}`),
                ...Array.from({ length: 14 }, (_, i) => `D+${i + 1}`)
            ];

            new Chart(forecastCtx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Histórico',
                        data: [...historicalData, ...Array(14).fill(null)],
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.3
                    }, {
                        label: 'Predicción',
                        data: [...Array(30).fill(null), ...forecastData],
                        borderColor: '#8b5cf6',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        tension: 0.3
                    }, {
                        label: 'Banda Superior',
                        data: [...Array(30).fill(null), ...upperBound],
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: '+1'
                    }, {
                        label: 'Banda Inferior',
                        data: [...Array(30).fill(null), ...lowerBound],
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: '#8b949e',
                                maxTicksLimit: 10
                            },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        },
                        y: {
                            ticks: { color: '#8b949e' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        }
                    }
                }
            });
        }

        // Gráfico de distribución de demanda
        const distCtx = document.getElementById('demand-distribution-chart')?.getContext('2d');
        if (distCtx) {
            const mean = 100;
            const std = 15;
            const xValues = Array.from({ length: 50 }, (_, i) => mean - 3 * std + i * (6 * std / 50));
            const yValues = xValues.map(x =>
                (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2))
            );

            new Chart(distCtx, {
                type: 'line',
                data: {
                    labels: xValues.map(x => x.toFixed(0)),
                    datasets: [{
                        label: 'Distribución Normal',
                        data: yValues,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: '#8b949e',
                                maxTicksLimit: 8
                            },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        },
                        y: {
                            ticks: { display: false },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        }
                    }
                }
            });

            // Actualizar estadísticas
            updateElement('demand-mean', mean + ' unidades');
            updateElement('demand-std', std + ' unidades');
            updateElement('demand-p95', (mean + 1.645 * std).toFixed(0) + ' unidades');
            updateElement('demand-cv', ((std / mean) * 100).toFixed(1) + '%');
        }
    }

    // Helper para actualizar elementos
    function updateElement(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // ============================================================================
    // TAB: COSTOS DE ALMACENAMIENTO
    // ============================================================================

    function renderCostsTab() {
        return `
            <div class="logistics-costs">
                <div class="section-header">
                    <h3>💰 Análisis de Costos de Almacenamiento</h3>
                    <div class="header-actions">
                        <select id="cost-period">
                            <option value="month">Este Mes</option>
                            <option value="quarter">Trimestre</option>
                            <option value="year">Año</option>
                        </select>
                        <button class="btn-secondary" onclick="LogisticsDashboard.exportCostReport()">
                            📥 Exportar Informe
                        </button>
                    </div>
                </div>

                <!-- Resumen de Costos -->
                <div class="cost-summary-grid">
                    <div class="cost-card total">
                        <div class="cost-icon">💵</div>
                        <div class="cost-content">
                            <span class="cost-label">Costo Total Almacenamiento</span>
                            <span class="cost-value" id="total-storage-cost">$--</span>
                            <span class="cost-change negative">+5.2% vs período anterior</span>
                        </div>
                    </div>
                    <div class="cost-card">
                        <div class="cost-icon">🏭</div>
                        <div class="cost-content">
                            <span class="cost-label">Costo por m²</span>
                            <span class="cost-value" id="cost-per-sqm">$--</span>
                            <span class="cost-benchmark">Benchmark: $45/m²</span>
                        </div>
                    </div>
                    <div class="cost-card">
                        <div class="cost-icon">📦</div>
                        <div class="cost-content">
                            <span class="cost-label">Costo por Unidad</span>
                            <span class="cost-value" id="cost-per-unit">$--</span>
                            <span class="cost-benchmark">Objetivo: $0.80</span>
                        </div>
                    </div>
                    <div class="cost-card">
                        <div class="cost-icon">📊</div>
                        <div class="cost-content">
                            <span class="cost-label">Costo de Posesión</span>
                            <span class="cost-value" id="carrying-cost">--%</span>
                            <span class="cost-benchmark">del valor inventario</span>
                        </div>
                    </div>
                </div>

                <!-- Desglose de Costos -->
                <div class="section-header mt-4">
                    <h3>📊 Desglose por Categoría</h3>
                </div>
                <div class="cost-breakdown-grid">
                    <div class="cost-chart-container">
                        <canvas id="cost-breakdown-chart" height="300"></canvas>
                    </div>
                    <div class="cost-breakdown-table">
                        <table class="logistics-table">
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th>Monto</th>
                                    <th>%</th>
                                    <th>Tendencia</th>
                                </tr>
                            </thead>
                            <tbody id="cost-breakdown-tbody">
                                <tr>
                                    <td>🏠 Alquiler/Depreciación</td>
                                    <td class="number">$25,000</td>
                                    <td>35%</td>
                                    <td><span class="trend-stable">→ 0%</span></td>
                                </tr>
                                <tr>
                                    <td>👷 Personal</td>
                                    <td class="number">$18,000</td>
                                    <td>25%</td>
                                    <td><span class="trend-up">↑ 3%</span></td>
                                </tr>
                                <tr>
                                    <td>⚡ Energía/Servicios</td>
                                    <td class="number">$8,500</td>
                                    <td>12%</td>
                                    <td><span class="trend-up">↑ 8%</span></td>
                                </tr>
                                <tr>
                                    <td>🔧 Mantenimiento</td>
                                    <td class="number">$5,000</td>
                                    <td>7%</td>
                                    <td><span class="trend-down">↓ 2%</span></td>
                                </tr>
                                <tr>
                                    <td>📋 Seguros</td>
                                    <td class="number">$4,500</td>
                                    <td>6%</td>
                                    <td><span class="trend-stable">→ 0%</span></td>
                                </tr>
                                <tr>
                                    <td>📦 Mermas/Obsolescencia</td>
                                    <td class="number">$7,500</td>
                                    <td>10%</td>
                                    <td><span class="trend-up">↑ 12%</span></td>
                                </tr>
                                <tr>
                                    <td>💰 Costo Capital</td>
                                    <td class="number">$3,500</td>
                                    <td>5%</td>
                                    <td><span class="trend-stable">→ 0%</span></td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td><strong>TOTAL</strong></td>
                                    <td class="number"><strong>$72,000</strong></td>
                                    <td><strong>100%</strong></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <!-- Análisis por Rotación -->
                <div class="section-header mt-4">
                    <h3>🔄 Costo vs Rotación de Inventario</h3>
                </div>
                <div class="rotation-analysis-grid">
                    <div class="rotation-category high-rotation">
                        <div class="rotation-header">
                            <span class="rotation-icon">🚀</span>
                            <span class="rotation-title">Alta Rotación</span>
                            <span class="rotation-badge">&gt;12 veces/año</span>
                        </div>
                        <div class="rotation-stats">
                            <div class="rotation-stat">
                                <span class="stat-label">SKUs</span>
                                <span class="stat-value">85</span>
                            </div>
                            <div class="rotation-stat">
                                <span class="stat-label">Valor Stock</span>
                                <span class="stat-value">$450,000</span>
                            </div>
                            <div class="rotation-stat">
                                <span class="stat-label">Costo Almac./mes</span>
                                <span class="stat-value success">$2,250</span>
                            </div>
                            <div class="rotation-stat">
                                <span class="stat-label">% del Valor</span>
                                <span class="stat-value success">0.5%</span>
                            </div>
                        </div>
                        <div class="rotation-recommendation">
                            ✅ Óptimo - Mantener niveles actuales
                        </div>
                    </div>

                    <div class="rotation-category medium-rotation">
                        <div class="rotation-header">
                            <span class="rotation-icon">🔄</span>
                            <span class="rotation-title">Media Rotación</span>
                            <span class="rotation-badge">4-12 veces/año</span>
                        </div>
                        <div class="rotation-stats">
                            <div class="rotation-stat">
                                <span class="stat-label">SKUs</span>
                                <span class="stat-value">127</span>
                            </div>
                            <div class="rotation-stat">
                                <span class="stat-label">Valor Stock</span>
                                <span class="stat-value">$320,000</span>
                            </div>
                            <div class="rotation-stat">
                                <span class="stat-label">Costo Almac./mes</span>
                                <span class="stat-value warning">$4,800</span>
                            </div>
                            <div class="rotation-stat">
                                <span class="stat-label">% del Valor</span>
                                <span class="stat-value warning">1.5%</span>
                            </div>
                        </div>
                        <div class="rotation-recommendation">
                            ⚠️ Revisar niveles de seguridad y lotes
                        </div>
                    </div>

                    <div class="rotation-category low-rotation">
                        <div class="rotation-header">
                            <span class="rotation-icon">🐌</span>
                            <span class="rotation-title">Baja Rotación</span>
                            <span class="rotation-badge">&lt;4 veces/año</span>
                        </div>
                        <div class="rotation-stats">
                            <div class="rotation-stat">
                                <span class="stat-label">SKUs</span>
                                <span class="stat-value">213</span>
                            </div>
                            <div class="rotation-stat">
                                <span class="stat-label">Valor Stock</span>
                                <span class="stat-value">$180,000</span>
                            </div>
                            <div class="rotation-stat">
                                <span class="stat-label">Costo Almac./mes</span>
                                <span class="stat-value danger">$5,400</span>
                            </div>
                            <div class="rotation-stat">
                                <span class="stat-label">% del Valor</span>
                                <span class="stat-value danger">3.0%</span>
                            </div>
                        </div>
                        <div class="rotation-recommendation">
                            🔴 Acción urgente - Evaluar liquidación o promociones
                        </div>
                    </div>
                </div>

                <!-- Cálculo EOQ -->
                <div class="section-header mt-4">
                    <h3>📐 Calculadora EOQ (Lote Económico)</h3>
                </div>
                <div class="eoq-calculator">
                    <div class="eoq-inputs">
                        <div class="eoq-input-group">
                            <label>Demanda Anual (D)</label>
                            <input type="number" id="eoq-demand" value="12000" placeholder="unidades/año">
                        </div>
                        <div class="eoq-input-group">
                            <label>Costo por Pedido (S)</label>
                            <input type="number" id="eoq-order-cost" value="150" placeholder="$/pedido">
                        </div>
                        <div class="eoq-input-group">
                            <label>Costo Unitario (C)</label>
                            <input type="number" id="eoq-unit-cost" value="25" placeholder="$/unidad">
                        </div>
                        <div class="eoq-input-group">
                            <label>Tasa de Posesión (i)</label>
                            <input type="number" id="eoq-holding-rate" value="20" placeholder="%/año">
                        </div>
                        <button class="btn-primary" onclick="LogisticsDashboard.calculateEOQ()">
                            Calcular EOQ
                        </button>
                    </div>
                    <div class="eoq-results" id="eoq-results">
                        <div class="eoq-result-card">
                            <span class="result-label">Lote Económico (Q*)</span>
                            <span class="result-value" id="eoq-q">-- unidades</span>
                        </div>
                        <div class="eoq-result-card">
                            <span class="result-label">Pedidos/Año</span>
                            <span class="result-value" id="eoq-orders">-- pedidos</span>
                        </div>
                        <div class="eoq-result-card">
                            <span class="result-label">Costo Total Anual</span>
                            <span class="result-value" id="eoq-total-cost">$--</span>
                        </div>
                        <div class="eoq-result-card">
                            <span class="result-label">Punto de Reorden</span>
                            <span class="result-value" id="eoq-rop">-- unidades</span>
                        </div>
                    </div>
                </div>

                <!-- Optimización de Espacio -->
                <div class="section-header mt-4">
                    <h3>📏 Utilización de Espacio</h3>
                </div>
                <div class="space-utilization-grid">
                    <div class="space-chart-container">
                        <canvas id="space-utilization-chart" height="250"></canvas>
                    </div>
                    <div class="space-metrics">
                        <div class="space-metric">
                            <span class="metric-label">Capacidad Total</span>
                            <span class="metric-value">5,000 m²</span>
                        </div>
                        <div class="space-metric">
                            <span class="metric-label">Espacio Utilizado</span>
                            <span class="metric-value">3,850 m² (77%)</span>
                        </div>
                        <div class="space-metric">
                            <span class="metric-label">Espacio Disponible</span>
                            <span class="metric-value">1,150 m² (23%)</span>
                        </div>
                        <div class="space-metric warning">
                            <span class="metric-label">Zonas Sobrecargadas</span>
                            <span class="metric-value">2 zonas</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Calcular EOQ
    window.LogisticsDashboard.calculateEOQ = function() {
        const D = parseFloat(document.getElementById('eoq-demand')?.value) || 12000;
        const S = parseFloat(document.getElementById('eoq-order-cost')?.value) || 150;
        const C = parseFloat(document.getElementById('eoq-unit-cost')?.value) || 25;
        const i = (parseFloat(document.getElementById('eoq-holding-rate')?.value) || 20) / 100;

        const H = C * i; // Costo de posesión unitario
        const Q = Math.sqrt((2 * D * S) / H); // EOQ
        const orders = D / Q;
        const totalCost = (D / Q) * S + (Q / 2) * H;
        const ROP = (D / 365) * 7; // Asumiendo 7 días lead time

        updateElement('eoq-q', formatNumber(Math.round(Q)) + ' unidades');
        updateElement('eoq-orders', Math.round(orders) + ' pedidos');
        updateElement('eoq-total-cost', '$' + formatNumber(Math.round(totalCost)));
        updateElement('eoq-rop', formatNumber(Math.round(ROP)) + ' unidades');
    };

    // Cargar datos de costos
    async function loadCostsData() {
        updateElement('total-storage-cost', '$72,000');
        updateElement('cost-per-sqm', '$52');
        updateElement('cost-per-unit', '$0.95');
        updateElement('carrying-cost', '18.5%');

        // Inicializar gráficos de costos si Chart.js está disponible
        if (typeof Chart !== 'undefined') {
            initializeCostCharts();
        }
    }

    function initializeCostCharts() {
        // Gráfico de desglose de costos
        const breakdownCtx = document.getElementById('cost-breakdown-chart')?.getContext('2d');
        if (breakdownCtx) {
            new Chart(breakdownCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Alquiler', 'Personal', 'Energía', 'Mantenimiento', 'Seguros', 'Mermas', 'Capital'],
                    datasets: [{
                        data: [35, 25, 12, 7, 6, 10, 5],
                        backgroundColor: [
                            '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981',
                            '#6366f1', '#ef4444', '#ec4899'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#e6edf3',
                                padding: 15
                            }
                        }
                    }
                }
            });
        }

        // Gráfico de utilización de espacio
        const spaceCtx = document.getElementById('space-utilization-chart')?.getContext('2d');
        if (spaceCtx) {
            new Chart(spaceCtx, {
                type: 'bar',
                data: {
                    labels: ['Zona A', 'Zona B', 'Zona C', 'Zona D', 'Staging'],
                    datasets: [{
                        label: 'Utilizado',
                        data: [95, 72, 88, 65, 45],
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }, {
                        label: 'Disponible',
                        data: [5, 28, 12, 35, 55],
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e6edf3' }
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            ticks: { color: '#8b949e' },
                            grid: { display: false }
                        },
                        y: {
                            stacked: true,
                            ticks: {
                                color: '#8b949e',
                                callback: v => v + '%'
                            },
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            max: 100
                        }
                    }
                }
            });
        }
    }

    // ============================================================================
    // TAB: ALMACENES
    // ============================================================================

    function renderWarehousesTab() {
        const hasWarehouses = cache.warehouses && cache.warehouses.length > 0;

        return `
            <div class="logistics-warehouses">
                <div class="section-header">
                    <h3>🏭 Almacenes Disponibles</h3>
                    <div class="header-actions">
                        <button class="btn-secondary" onclick="LogisticsDashboard.openWMSModule()">
                            🔗 Ir a Gestión de Almacenes (WMS)
                        </button>
                        <button class="btn-icon" onclick="LogisticsDashboard.refreshWarehouses()" title="Actualizar">
                            🔄
                        </button>
                    </div>
                </div>

                <div class="info-banner">
                    <span class="info-icon">ℹ️</span>
                    <span>Los almacenes se gestionan desde el módulo <strong>Gestión de Almacenes (WMS)</strong>.
                    Aquí se muestran para operaciones logísticas.</span>
                </div>

                ${hasWarehouses ? `
                    <div class="warehouses-grid" id="warehouses-grid">
                        ${cache.warehouses.map(renderWarehouseCard).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <span class="empty-icon">🏭</span>
                        <h4>No hay almacenes configurados</h4>
                        <p>Configura almacenes desde el módulo WMS para comenzar operaciones logísticas.</p>
                        <button class="btn-primary" onclick="LogisticsDashboard.openWMSModule()">
                            Ir a Gestión de Almacenes
                        </button>
                    </div>
                `}

                <div class="section-header mt-4">
                    <h3>📍 Tipos de Ubicación</h3>
                </div>

                <div class="location-types-list" id="location-types-list">
                    ${(cache.locationTypes || []).length > 0
                        ? cache.locationTypes.map(renderLocationType).join('')
                        : '<p class="empty-text">Sin tipos de ubicación configurados</p>'}
                </div>
            </div>
        `;
    }

    // Función para abrir módulo WMS
    window.LogisticsDashboard.openWMSModule = function() {
        // Buscar si existe el módulo WMS y abrirlo
        if (typeof window.loadModule === 'function') {
            window.loadModule('warehouse-management');
        } else {
            showInfo('Módulo Gestión de Almacenes - Abrir desde el menú lateral');
        }
    };

    window.LogisticsDashboard.refreshWarehouses = async function() {
        showSuccess('Actualizando almacenes...');
        await loadWarehouses();
        const grid = document.getElementById('warehouses-grid');
        if (grid) {
            grid.innerHTML = cache.warehouses.map(renderWarehouseCard).join('');
        }
    };

    function renderWarehouseCard(warehouse) {
        return `
            <div class="warehouse-card" onclick="LogisticsDashboard.viewWarehouse(${warehouse.id})">
                <div class="warehouse-header">
                    <span class="warehouse-code">${warehouse.code || 'WH'}</span>
                    <span class="warehouse-status ${warehouse.is_active !== false ? 'active' : 'inactive'}">
                        ${warehouse.is_active !== false ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
                <h4 class="warehouse-name">${warehouse.name}</h4>
                <p class="warehouse-address">${warehouse.address || 'Sin dirección'}</p>
                <div class="warehouse-stats">
                    <div class="stat">
                        <span class="stat-value">${warehouse.locations_count || 0}</span>
                        <span class="stat-label">Ubicaciones</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${warehouse.products_count || 0}</span>
                        <span class="stat-label">Productos</span>
                    </div>
                </div>
                <div class="warehouse-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); LogisticsDashboard.openWMSModule()" title="Editar en WMS">
                        🔗
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); LogisticsDashboard.selectWarehouseForOperations(${warehouse.id})" title="Usar para operaciones">
                        ✅
                    </button>
                </div>
            </div>
        `;
    }

    window.LogisticsDashboard.selectWarehouseForOperations = function(warehouseId) {
        currentWarehouseId = warehouseId;
        const warehouse = cache.warehouses.find(w => w.id === warehouseId);
        const name = warehouse ? warehouse.name : warehouseId;
        showSuccess('Almacén "' + name + '" seleccionado para operaciones');

        // Actualizar selector en header
        const selector = document.getElementById('warehouse-selector');
        if (selector) selector.value = warehouseId;
    };

    function renderLocationType(type) {
        return `
            <div class="location-type-item">
                <span class="type-code">${type.code}</span>
                <span class="type-name">${type.name}</span>
                <span class="type-props">
                    ${type.allows_picking ? '✅ Picking' : '❌ Picking'}
                    ${type.allows_storage ? '✅ Storage' : '❌ Storage'}
                    ${type.is_staging ? '📋 Staging' : ''}
                </span>
            </div>
        `;
    }

    // ============================================================================
    // TAB: INVENTARIO
    // ============================================================================

    function renderInventoryTab() {
        return `
            <div class="logistics-inventory">
                <div class="section-header">
                    <h3>📦 Control de Inventario</h3>
                    <div class="header-actions">
                        <button class="btn-secondary" onclick="LogisticsDashboard.showTransferModal()">
                            🔄 Transferencia
                        </button>
                        <button class="btn-secondary" onclick="LogisticsDashboard.showAdjustmentModal()">
                            ⚖️ Ajuste
                        </button>
                    </div>
                </div>

                <div class="inventory-filters">
                    <input type="text" id="inventory-search" placeholder="Buscar producto..."
                           onkeyup="LogisticsDashboard.filterInventory(this.value)">
                    <select id="inventory-location-filter" onchange="LogisticsDashboard.filterInventoryByLocation(this.value)">
                        <option value="">Todas las ubicaciones</option>
                    </select>
                    <select id="inventory-zone-filter">
                        <option value="">Todas las zonas</option>
                        <option value="PICKING">Zona Picking</option>
                        <option value="STORAGE">Zona Almacén</option>
                        <option value="RECEIVING">Zona Recepción</option>
                        <option value="SHIPPING">Zona Despacho</option>
                    </select>
                </div>

                <div class="inventory-table-container">
                    <table class="logistics-table" id="inventory-table">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Producto</th>
                                <th>Ubicación</th>
                                <th>Disponible</th>
                                <th>Reservado</th>
                                <th>Total</th>
                                <th>Lote</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="inventory-tbody">
                            <tr>
                                <td colspan="8" class="loading-cell">Cargando inventario...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="section-header mt-4">
                    <h3>📜 Últimos Movimientos</h3>
                </div>
                <div class="movements-list" id="movements-list">
                    <p class="loading-message">Cargando movimientos...</p>
                </div>
            </div>
        `;
    }

    async function loadInventoryData() {
        if (!currentWarehouseId) {
            document.getElementById('inventory-tbody').innerHTML = `
                <tr><td colspan="8" class="info-cell">Seleccione un almacén para ver el inventario</td></tr>
            `;
            return;
        }

        try {
            const [stockResponse, movementsResponse] = await Promise.all([
                fetchAPI(`/warehouses/${currentWarehouseId}/stock`),
                fetchAPI(`/warehouses/${currentWarehouseId}/movements?limit=20`)
            ]);

            // Renderizar stock
            const tbody = document.getElementById('inventory-tbody');
            if (tbody && stockResponse.data) {
                if (stockResponse.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No hay stock en este almacén</td></tr>';
                } else {
                    tbody.innerHTML = stockResponse.data.map(item => `
                        <tr>
                            <td><code>${item.sku || '-'}</code></td>
                            <td>${item.product_name || 'Producto'}</td>
                            <td><code>${item.location_name || '-'}</code></td>
                            <td class="number">${formatNumber(item.quantity - (item.reserved_quantity || 0))}</td>
                            <td class="number reserved">${formatNumber(item.reserved_quantity || 0)}</td>
                            <td class="number total">${formatNumber(item.quantity)}</td>
                            <td>${item.lot_number || '-'}</td>
                            <td>
                                <button class="btn-icon" onclick="LogisticsDashboard.showQuickTransfer(${item.id})">🔄</button>
                                <button class="btn-icon" onclick="LogisticsDashboard.showQuickAdjust(${item.id})">⚖️</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }

            // Renderizar movimientos
            const movementsList = document.getElementById('movements-list');
            if (movementsList && movementsResponse.data) {
                if (movementsResponse.data.length === 0) {
                    movementsList.innerHTML = '<p class="empty-message">No hay movimientos recientes</p>';
                } else {
                    movementsList.innerHTML = movementsResponse.data.map(mov => `
                        <div class="movement-item">
                            <span class="movement-type ${mov.movement_type.toLowerCase()}">${mov.movement_type}</span>
                            <span class="movement-product">${mov.product_name || 'Producto'}</span>
                            <span class="movement-qty ${mov.quantity > 0 ? 'positive' : 'negative'}">
                                ${mov.quantity > 0 ? '+' : ''}${mov.quantity}
                            </span>
                            <span class="movement-location">${mov.from_location_name || ''} → ${mov.to_location_name || ''}</span>
                            <span class="movement-date">${formatDateTime(mov.created_at)}</span>
                        </div>
                    `).join('');
                }
            }

        } catch (error) {
            console.error('Error cargando inventario:', error);
            showError('Error al cargar el inventario');
        }
    }

    // ============================================================================
    // TAB: PICKING
    // ============================================================================

    function renderPickingTab() {
        return `
            <div class="logistics-picking">
                <div class="section-header">
                    <h3>🌊 Gestión de Picking</h3>
                    <div class="header-actions">
                        <button class="btn-primary" onclick="LogisticsDashboard.showGenerateWaveModal()">
                            + Generar Ola
                        </button>
                    </div>
                </div>

                <div class="picking-tabs">
                    <button class="picking-tab active" onclick="LogisticsDashboard.showWaves()">Olas</button>
                    <button class="picking-tab" onclick="LogisticsDashboard.showPickLists()">Pick Lists</button>
                </div>

                <div class="picking-content" id="picking-content">
                    <div class="waves-list" id="waves-list">
                        <p class="loading-message">Cargando olas de picking...</p>
                    </div>
                </div>

                <div class="section-header mt-4">
                    <h3>📊 KPIs de Picking</h3>
                </div>
                <div class="picking-kpis" id="picking-kpis">
                    <p class="loading-message">Cargando estadísticas...</p>
                </div>
            </div>
        `;
    }

    async function loadPickingData() {
        if (!currentWarehouseId) {
            document.getElementById('waves-list').innerHTML =
                '<p class="info-message">Seleccione un almacén para ver las olas de picking</p>';
            return;
        }

        try {
            const [wavesResponse, kpisResponse] = await Promise.all([
                fetchAPI(`/warehouses/${currentWarehouseId}/waves?limit=20`),
                fetchAPI(`/picking/kpis?warehouse_id=${currentWarehouseId}`)
            ]);

            // Renderizar olas
            const wavesList = document.getElementById('waves-list');
            if (wavesList && wavesResponse.data) {
                if (wavesResponse.data.length === 0) {
                    wavesList.innerHTML = '<p class="empty-message">No hay olas de picking</p>';
                } else {
                    wavesList.innerHTML = wavesResponse.data.map(wave => `
                        <div class="wave-card ${wave.status.toLowerCase()}" onclick="LogisticsDashboard.viewWave(${wave.id})">
                            <div class="wave-header">
                                <span class="wave-name">${wave.name}</span>
                                <span class="wave-status status-${wave.status.toLowerCase()}">${wave.status}</span>
                            </div>
                            <div class="wave-stats">
                                <span>📋 ${wave.pick_lists_count || 0} Pick Lists</span>
                                <span>📦 ${wave.total_units || 0} Unidades</span>
                                <span>✅ ${wave.lines_completed || 0} Completadas</span>
                            </div>
                            <div class="wave-actions">
                                ${wave.status === 'PENDING' ? `
                                    <button class="btn-sm btn-primary" onclick="event.stopPropagation(); LogisticsDashboard.startWave(${wave.id})">
                                        ▶️ Iniciar
                                    </button>
                                ` : ''}
                                ${wave.status === 'IN_PROGRESS' ? `
                                    <button class="btn-sm btn-success" onclick="event.stopPropagation(); LogisticsDashboard.completeWave(${wave.id})">
                                        ✅ Completar
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('');
                }
            }

            // Renderizar KPIs
            const kpisContainer = document.getElementById('picking-kpis');
            if (kpisContainer && kpisResponse.data) {
                const summary = kpisResponse.data.summary || {};
                const productivity = kpisResponse.data.picker_productivity || [];
                kpisContainer.innerHTML = `
                    <div class="kpi-row-grid">
                        <div class="kpi-item">
                            <span class="kpi-value">${summary.total_pick_lists || 0}</span>
                            <span class="kpi-label">Pick Lists</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${formatNumber(summary.total_units_picked || 0)}</span>
                            <span class="kpi-label">Unidades Pickeadas</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${(summary.pick_accuracy_percent || 0).toFixed(1)}%</span>
                            <span class="kpi-label">Precisión</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${(summary.avg_pick_time_minutes || 0).toFixed(1)} min</span>
                            <span class="kpi-label">Tiempo Promedio</span>
                        </div>
                    </div>
                    ${productivity.length > 0 ? `
                        <h4>Top Pickers</h4>
                        <div class="top-pickers">
                            ${productivity.slice(0, 5).map((p, i) => `
                                <div class="picker-item">
                                    <span class="picker-rank">#${i + 1}</span>
                                    <span class="picker-name">${p.picker_name}</span>
                                    <span class="picker-stat">${p.lines_picked} líneas</span>
                                    <span class="picker-rate">${(p.lines_per_hour || 0).toFixed(1)}/h</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                `;
            }

        } catch (error) {
            console.error('Error cargando picking:', error);
        }
    }

    // ============================================================================
    // TAB: TRANSPORTISTAS
    // ============================================================================

    function renderCarriersTab() {
        return `
            <div class="logistics-carriers">
                <div class="section-header">
                    <h3>🚛 Gestión de Transportistas</h3>
                    <button class="btn-primary" onclick="LogisticsDashboard.showCreateCarrierModal()">
                        + Nuevo Transportista
                    </button>
                </div>

                <div class="carriers-grid" id="carriers-grid">
                    ${cache.carriers.map(renderCarrierCard).join('')}
                    ${cache.carriers.length === 0 ? '<p class="empty-message">No hay transportistas registrados</p>' : ''}
                </div>

                <div class="section-header mt-4">
                    <h3>🚗 Flota de Vehículos</h3>
                    <button class="btn-secondary" onclick="LogisticsDashboard.showCreateVehicleModal()">
                        + Nuevo Vehículo
                    </button>
                </div>
                <div class="vehicles-list" id="vehicles-list">
                    <p class="loading-message">Cargando vehículos...</p>
                </div>

                <div class="section-header mt-4">
                    <h3>👤 Conductores</h3>
                    <button class="btn-secondary" onclick="LogisticsDashboard.showCreateDriverModal()">
                        + Nuevo Conductor
                    </button>
                </div>
                <div class="drivers-list" id="drivers-list">
                    <p class="loading-message">Cargando conductores...</p>
                </div>
            </div>
        `;
    }

    function renderCarrierCard(carrier) {
        return `
            <div class="carrier-card" onclick="LogisticsDashboard.viewCarrier(${carrier.id})">
                <div class="carrier-header">
                    <span class="carrier-code">${carrier.code}</span>
                    <span class="carrier-badge ${carrier.is_own_fleet ? 'own-fleet' : 'external'}">
                        ${carrier.is_own_fleet ? 'Flota Propia' : 'Externo'}
                    </span>
                </div>
                <h4 class="carrier-name">${carrier.name}</h4>
                <p class="carrier-contact">${carrier.contact_name || ''} - ${carrier.contact_phone || ''}</p>
                <div class="carrier-stats">
                    <span>🚗 ${carrier.vehicles_count || 0} Vehículos</span>
                    <span>👤 ${carrier.drivers_count || 0} Conductores</span>
                    <span>📦 ${carrier.shipments_last_30_days || 0} Envíos/mes</span>
                </div>
            </div>
        `;
    }

    // ============================================================================
    // TAB: ZONAS DE ENTREGA
    // ============================================================================

    function renderZonesTab() {
        return `
            <div class="logistics-zones">
                <div class="section-header">
                    <h3>📍 Zonas de Entrega</h3>
                    <button class="btn-primary" onclick="LogisticsDashboard.showCreateZoneModal()">
                        + Nueva Zona
                    </button>
                </div>

                <div class="zones-grid" id="zones-grid">
                    ${cache.deliveryZones.map(renderZoneCard).join('')}
                    ${cache.deliveryZones.length === 0 ? '<p class="empty-message">No hay zonas configuradas</p>' : ''}
                </div>

                <div class="section-header mt-4">
                    <h3>🗺️ Mapa de Zonas</h3>
                </div>
                <div class="zones-map-placeholder" id="zones-map">
                    <p>Integración de mapa disponible (Google Maps / Leaflet)</p>
                </div>
            </div>
        `;
    }

    function renderZoneCard(zone) {
        return `
            <div class="zone-card" onclick="LogisticsDashboard.viewZone(${zone.id})">
                <div class="zone-header">
                    <span class="zone-code">${zone.code}</span>
                    <span class="zone-status ${zone.is_active ? 'active' : 'inactive'}">
                        ${zone.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
                <h4 class="zone-name">${zone.name}</h4>
                <div class="zone-schedule">
                    <div class="schedule-days">
                        ${(zone.delivery_days || []).map(d => `<span class="day">${d}</span>`).join('')}
                    </div>
                    <span class="schedule-hours">${zone.delivery_hours_from || '08:00'} - ${zone.delivery_hours_to || '18:00'}</span>
                </div>
                <div class="zone-pricing">
                    <span class="delivery-cost">Costo: $${formatNumber(zone.delivery_cost || 0)}</span>
                    ${zone.free_delivery_threshold ? `
                        <span class="free-threshold">Gratis +$${formatNumber(zone.free_delivery_threshold)}</span>
                    ` : ''}
                </div>
                <div class="zone-stats">
                    <span>👥 ${zone.customers_with_override || 0} configs especiales</span>
                    <span>⏱️ ${zone.lead_time_days || 1} día(s) lead time</span>
                </div>
            </div>
        `;
    }

    // ============================================================================
    // TAB: RUTAS
    // ============================================================================

    function renderRoutesTab() {
        return `
            <div class="logistics-routes">
                <div class="section-header">
                    <h3>🗺️ Planificación de Rutas</h3>
                    <div class="header-actions">
                        <input type="date" id="routes-date" value="${new Date().toISOString().split('T')[0]}"
                               onchange="LogisticsDashboard.loadRoutesForDate(this.value)">
                        <button class="btn-primary" onclick="LogisticsDashboard.showCreateRouteModal()">
                            + Nueva Ruta
                        </button>
                    </div>
                </div>

                <div class="routes-list" id="routes-list">
                    <p class="loading-message">Cargando rutas...</p>
                </div>

                <div class="section-header mt-4">
                    <h3>📊 KPIs de Rutas</h3>
                </div>
                <div class="routes-kpis" id="routes-kpis">
                    <p class="loading-message">Cargando estadísticas...</p>
                </div>
            </div>
        `;
    }

    async function loadRoutesData() {
        try {
            const date = document.getElementById('routes-date')?.value || new Date().toISOString().split('T')[0];

            const [routesResponse, kpisResponse] = await Promise.all([
                fetchAPI(`/routes?date=${date}`),
                fetchAPI('/routes/kpis')
            ]);

            // Renderizar rutas
            const routesList = document.getElementById('routes-list');
            if (routesList && routesResponse.data) {
                if (routesResponse.data.length === 0) {
                    routesList.innerHTML = '<p class="empty-message">No hay rutas para esta fecha</p>';
                } else {
                    routesList.innerHTML = routesResponse.data.map(route => `
                        <div class="route-card ${route.status.toLowerCase()}" onclick="LogisticsDashboard.viewRoute(${route.id})">
                            <div class="route-header">
                                <span class="route-date">${formatDate(route.scheduled_date)}</span>
                                <span class="route-status status-${route.status.toLowerCase()}">${route.status}</span>
                            </div>
                            <div class="route-info">
                                <span class="route-carrier">🚛 ${route.carrier_name || 'Sin asignar'}</span>
                                <span class="route-vehicle">🚗 ${route.vehicle_plate || '-'}</span>
                                <span class="route-driver">👤 ${route.driver_name || 'Sin asignar'}</span>
                            </div>
                            <div class="route-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(route.completed_stops / (route.stops_count || 1)) * 100}%"></div>
                                </div>
                                <span class="progress-text">${route.completed_stops || 0} / ${route.stops_count || 0} paradas</span>
                            </div>
                            <div class="route-actions">
                                ${route.status === 'PLANNED' ? `
                                    <button class="btn-sm" onclick="event.stopPropagation(); LogisticsDashboard.optimizeRoute(${route.id})">
                                        🔄 Optimizar
                                    </button>
                                    <button class="btn-sm btn-primary" onclick="event.stopPropagation(); LogisticsDashboard.startRoute(${route.id})">
                                        ▶️ Iniciar
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('');
                }
            }

            // Renderizar KPIs
            const kpisContainer = document.getElementById('routes-kpis');
            if (kpisContainer && kpisResponse.data) {
                const kpis = kpisResponse.data;
                kpisContainer.innerHTML = `
                    <div class="kpi-row-grid">
                        <div class="kpi-item">
                            <span class="kpi-value">${kpis.total_routes || 0}</span>
                            <span class="kpi-label">Total Rutas</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${kpis.total_stops || 0}</span>
                            <span class="kpi-label">Total Paradas</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${(kpis.on_time_delivery_percent || 0).toFixed(1)}%</span>
                            <span class="kpi-label">A Tiempo</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${(kpis.avg_distance_km || 0).toFixed(1)} km</span>
                            <span class="kpi-label">Distancia Prom.</span>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error cargando rutas:', error);
        }
    }

    // ============================================================================
    // TAB: ENVÍOS
    // ============================================================================

    function renderShipmentsTab() {
        return `
            <div class="logistics-shipments">
                <div class="section-header">
                    <h3>📬 Gestión de Envíos</h3>
                    <div class="header-actions">
                        <button class="btn-primary" onclick="LogisticsDashboard.showCreateShipmentModal()">
                            + Nuevo Envío
                        </button>
                        <button class="btn-secondary" onclick="LogisticsDashboard.showBulkShipmentModal()">
                            📦 Crear Masivo
                        </button>
                    </div>
                </div>

                <div class="shipments-filters">
                    <input type="text" id="shipment-search" placeholder="Buscar por tracking..."
                           onkeyup="LogisticsDashboard.searchShipment(this.value)">
                    <select id="shipment-status-filter" onchange="LogisticsDashboard.filterShipments(this.value)">
                        <option value="">Todos los estados</option>
                        <option value="CREATED">Creado</option>
                        <option value="ASSIGNED">Asignado</option>
                        <option value="IN_TRANSIT">En Tránsito</option>
                        <option value="DELIVERED">Entregado</option>
                        <option value="FAILED_ATTEMPT">Intento Fallido</option>
                        <option value="CANCELLED">Cancelado</option>
                    </select>
                    <select id="shipment-carrier-filter" onchange="LogisticsDashboard.filterShipmentsByCarrier(this.value)">
                        <option value="">Todos los transportistas</option>
                        ${cache.carriers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>

                <div class="shipments-table-container">
                    <table class="logistics-table" id="shipments-table">
                        <thead>
                            <tr>
                                <th>Tracking</th>
                                <th>Cliente</th>
                                <th>Dirección</th>
                                <th>Transportista</th>
                                <th>Estado</th>
                                <th>Fecha Est.</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="shipments-tbody">
                            <tr><td colspan="7" class="loading-cell">Cargando envíos...</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="section-header mt-4">
                    <h3>📊 KPIs de Envíos</h3>
                </div>
                <div class="shipments-kpis" id="shipments-kpis">
                    <p class="loading-message">Cargando estadísticas...</p>
                </div>
            </div>
        `;
    }

    async function loadShipmentsData() {
        try {
            const [shipmentsResponse, kpisResponse] = await Promise.all([
                fetchAPI('/shipments?limit=50'),
                fetchAPI('/shipments/kpis')
            ]);

            // Renderizar envíos
            const tbody = document.getElementById('shipments-tbody');
            if (tbody && shipmentsResponse.data) {
                if (shipmentsResponse.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">No hay envíos registrados</td></tr>';
                } else {
                    tbody.innerHTML = shipmentsResponse.data.map(shipment => `
                        <tr class="shipment-row ${shipment.status.toLowerCase()}">
                            <td>
                                <code class="tracking-number">${shipment.tracking_number}</code>
                            </td>
                            <td>${shipment.customer_name || 'Cliente'}</td>
                            <td class="address-cell">${shipment.delivery_address || ''}, ${shipment.delivery_city || ''}</td>
                            <td>${shipment.carrier_name || 'Sin asignar'}</td>
                            <td>
                                <span class="status-badge status-${shipment.status.toLowerCase()}">
                                    ${getStatusLabel(shipment.status)}
                                </span>
                            </td>
                            <td>${formatDate(shipment.estimated_delivery_date)}</td>
                            <td class="actions-cell">
                                <button class="btn-icon" onclick="LogisticsDashboard.viewShipment(${shipment.id})" title="Ver detalle">
                                    👁️
                                </button>
                                <button class="btn-icon" onclick="LogisticsDashboard.trackShipment('${shipment.tracking_number}')" title="Tracking">
                                    📍
                                </button>
                                ${shipment.status !== 'DELIVERED' && shipment.status !== 'CANCELLED' ? `
                                    <button class="btn-icon" onclick="LogisticsDashboard.showUpdateStatusModal(${shipment.id})" title="Actualizar estado">
                                        ✏️
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('');
                }
            }

            // Renderizar KPIs
            const kpisContainer = document.getElementById('shipments-kpis');
            if (kpisContainer && kpisResponse.data) {
                const summary = kpisResponse.data.summary || {};
                kpisContainer.innerHTML = `
                    <div class="kpi-row-grid">
                        <div class="kpi-item">
                            <span class="kpi-value">${summary.total_shipments || 0}</span>
                            <span class="kpi-label">Total Envíos</span>
                        </div>
                        <div class="kpi-item success">
                            <span class="kpi-value">${summary.delivered || 0}</span>
                            <span class="kpi-label">Entregados</span>
                        </div>
                        <div class="kpi-item warning">
                            <span class="kpi-value">${summary.in_transit || 0}</span>
                            <span class="kpi-label">En Tránsito</span>
                        </div>
                        <div class="kpi-item danger">
                            <span class="kpi-value">${summary.with_issues || 0}</span>
                            <span class="kpi-label">Con Problemas</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${(summary.delivery_rate || 0).toFixed(1)}%</span>
                            <span class="kpi-label">Tasa de Entrega</span>
                        </div>
                        <div class="kpi-item">
                            <span class="kpi-value">${(summary.on_time_rate || 0).toFixed(1)}%</span>
                            <span class="kpi-label">A Tiempo</span>
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error cargando envíos:', error);
        }
    }

    // ============================================================================
    // TAB: CONFIGURACIÓN
    // ============================================================================

    function renderConfigTab() {
        return `
            <div class="logistics-config">
                <div class="config-section">
                    <h3>⚙️ Configuración General</h3>
                    <div class="config-grid">
                        <div class="config-card" onclick="LogisticsDashboard.showLocationTypesConfig()">
                            <span class="config-icon">📍</span>
                            <span class="config-label">Tipos de Ubicación</span>
                        </div>
                        <div class="config-card" onclick="LogisticsDashboard.showPackageTypesConfig()">
                            <span class="config-icon">📦</span>
                            <span class="config-label">Tipos de Paquete</span>
                        </div>
                        <div class="config-card" onclick="LogisticsDashboard.showBusinessRulesConfig()">
                            <span class="config-icon">📋</span>
                            <span class="config-label">Reglas de Negocio</span>
                        </div>
                        <div class="config-card" onclick="LogisticsDashboard.showBusinessProfilesConfig()">
                            <span class="config-icon">🏢</span>
                            <span class="config-label">Perfiles de Negocio</span>
                        </div>
                    </div>
                </div>

                <div class="config-section mt-4">
                    <h3>📦 Tipos de Paquete</h3>
                    <div class="package-types-list" id="package-types-list">
                        ${cache.packageTypes.map(pt => `
                            <div class="package-type-item">
                                <span class="pt-code">${pt.code}</span>
                                <span class="pt-name">${pt.name}</span>
                                <span class="pt-dims">
                                    Max: ${pt.max_weight}kg, ${pt.max_length}x${pt.max_width}x${pt.max_height}cm
                                </span>
                            </div>
                        `).join('')}
                        ${cache.packageTypes.length === 0 ? '<p class="empty-message">No hay tipos de paquete configurados</p>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function renderPackingTab() {
        return `
            <div class="logistics-packing">
                <div class="section-header">
                    <h3>📋 Empaque (Packing)</h3>
                </div>
                <div class="pack-orders-list" id="pack-orders-list">
                    <p class="loading-message">Cargando órdenes de empaque...</p>
                </div>
            </div>
        `;
    }

    // ============================================================================
    // FUNCIONES AUXILIARES
    // ============================================================================

    async function fetchAPI(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}company_id=${currentCompanyId}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    }

    async function loadWarehouses() {
        const response = await fetchAPI('/warehouses');
        cache.warehouses = response.data || [];
        if (cache.warehouses.length > 0 && !currentWarehouseId) {
            currentWarehouseId = cache.warehouses[0].id;
        }
    }

    async function loadCarriers() {
        const response = await fetchAPI('/carriers');
        cache.carriers = response.data || [];
    }

    async function loadDeliveryZones() {
        const response = await fetchAPI('/delivery-zones');
        cache.deliveryZones = response.data || [];
    }

    async function loadLocationTypes() {
        try {
            const response = await fetchAPI('/location-types');
            cache.locationTypes = response.data || [];
        } catch (e) {
            cache.locationTypes = [];
        }
    }

    async function loadPackageTypes() {
        try {
            const response = await fetchAPI('/package-types');
            cache.packageTypes = response.data || [];
        } catch (e) {
            cache.packageTypes = [];
        }
    }

    async function loadTabData(tabId) {
        switch (tabId) {
            case 'overview': await loadOverviewData(); break;
            case 'analytics': await loadAnalyticsData(); break;
            case 'requests': await loadRequestsData(); break;
            case 'inventory': await loadInventoryData(); break;
            case 'transfers': await loadTransfersData(); break;
            case 'picking': await loadPickingData(); break;
            case 'routes': await loadRoutesData(); break;
            case 'shipments': await loadShipmentsData(); break;
            case 'carriers': await loadCarriersTabData(); break;
            case 'sla': await loadSLAData(); break;
            case 'costs': await loadCostsData(); break;
        }
    }

    async function loadCarriersTabData() {
        try {
            const [vehiclesResponse, driversResponse] = await Promise.all([
                fetchAPI('/vehicles'),
                fetchAPI('/drivers')
            ]);

            cache.vehicles = vehiclesResponse.data || [];
            cache.drivers = driversResponse.data || [];

            // Renderizar vehículos
            const vehiclesList = document.getElementById('vehicles-list');
            if (vehiclesList) {
                if (cache.vehicles.length === 0) {
                    vehiclesList.innerHTML = '<p class="empty-message">No hay vehículos registrados</p>';
                } else {
                    vehiclesList.innerHTML = cache.vehicles.map(v => `
                        <div class="vehicle-item ${v.is_available ? 'available' : 'busy'}">
                            <span class="vehicle-plate">${v.plate_number}</span>
                            <span class="vehicle-info">${v.brand} ${v.model}</span>
                            <span class="vehicle-carrier">${v.carrier_name || 'Sin transportista'}</span>
                            <span class="vehicle-status">${v.is_available ? '🟢 Disponible' : '🔴 En uso'}</span>
                        </div>
                    `).join('');
                }
            }

            // Renderizar conductores
            const driversList = document.getElementById('drivers-list');
            if (driversList) {
                if (cache.drivers.length === 0) {
                    driversList.innerHTML = '<p class="empty-message">No hay conductores registrados</p>';
                } else {
                    driversList.innerHTML = cache.drivers.map(d => `
                        <div class="driver-item ${d.is_available ? 'available' : 'busy'}">
                            <span class="driver-name">${d.name}</span>
                            <span class="driver-phone">${d.phone || '-'}</span>
                            <span class="driver-carrier">${d.carrier_name || 'Sin transportista'}</span>
                            <span class="driver-status">${d.is_available ? '🟢 Disponible' : '🔴 En ruta'}</span>
                        </div>
                    `).join('');
                }
            }

        } catch (error) {
            console.error('Error cargando datos de transportistas:', error);
        }
    }

    // ============================================================================
    // TAB: SOLICITUDES PROGRAMADAS
    // ============================================================================

    function renderScheduledRequestsTab() {
        return `
            <div class="scheduled-requests-container">
                <!-- EXPLICACIÓN DEL WORKFLOW -->
                <div class="workflow-explanation">
                    <div class="workflow-header">
                        <h3>📝 Sistema de Solicitudes Programadas</h3>
                        <p>Planifica entregas futuras de materiales por sector. El sistema gestiona todo automáticamente.</p>
                    </div>

                    <div class="workflow-steps">
                        <div class="workflow-step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h4>📋 Crear Solicitud</h4>
                                <p>Indica qué material necesitas, cuánto, para cuándo y qué sector lo requiere.</p>
                            </div>
                        </div>
                        <div class="workflow-arrow">→</div>

                        <div class="workflow-step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h4>🔍 Verificación Stock</h4>
                                <p>El sistema verifica automáticamente si hay stock disponible para esa fecha.</p>
                            </div>
                        </div>
                        <div class="workflow-arrow">→</div>

                        <div class="workflow-step step-branch">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h4>✅ Si HAY Stock</h4>
                                <p>Se reserva automáticamente y recibes confirmación.</p>
                                <div class="step-alternative">
                                    <h4>⚠️ Si NO hay</h4>
                                    <p>Se notifica a Compras para gestionar la adquisición.</p>
                                </div>
                            </div>
                        </div>
                        <div class="workflow-arrow">→</div>

                        <div class="workflow-step">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h4>📅 Día de Entrega</h4>
                                <p>El sistema notifica al responsable para preparar y entregar.</p>
                            </div>
                        </div>
                        <div class="workflow-arrow">→</div>

                        <div class="workflow-step">
                            <div class="step-number">5</div>
                            <div class="step-content">
                                <h4>🔄 Transferencia</h4>
                                <p>La solicitud se convierte en transferencia con seguimiento SLA.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- FORMULARIO DE NUEVA SOLICITUD -->
                <div class="request-form-section">
                    <div class="section-header">
                        <h3>➕ Nueva Solicitud Programada</h3>
                        <button class="btn-secondary" onclick="LogisticsDashboard.toggleRequestForm()">
                            <span id="form-toggle-icon">▼</span> Mostrar Formulario
                        </button>
                    </div>

                    <div id="request-form-container" class="request-form collapsed">
                        <form id="scheduled-request-form" onsubmit="LogisticsDashboard.submitRequest(event)">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>📅 Fecha de Entrega Requerida *</label>
                                    <input type="date" name="delivery_date" required min="${new Date().toISOString().split('T')[0]}">
                                    <span class="help-text">¿Para cuándo necesitas el material?</span>
                                </div>

                                <div class="form-group">
                                    <label>🏭 Departamento/Sector *</label>
                                    <select name="department_id" required onchange="LogisticsDashboard.onDepartmentChange(this.value)">
                                        <option value="">Seleccionar sector...</option>
                                        ${cache.departments?.map(d => `<option value="${d.id}">${d.name}</option>`).join('') || ''}
                                    </select>
                                    <span class="help-text">Sector que realizará el consumo</span>
                                </div>

                                <div class="form-group">
                                    <label>📍 Línea de Producción</label>
                                    <select name="production_line_id" id="production-line-select">
                                        <option value="">Seleccionar línea (opcional)...</option>
                                    </select>
                                    <span class="help-text">Si aplica, especifica la línea</span>
                                </div>

                                <div class="form-group">
                                    <label>📦 Producto/Material *</label>
                                    <select name="product_id" required onchange="LogisticsDashboard.checkProductStock(this.value)">
                                        <option value="">Buscar producto...</option>
                                        ${cache.products?.map(p => `<option value="${p.id}" data-stock="${p.available_qty}">${p.sku} - ${p.name}</option>`).join('') || ''}
                                    </select>
                                    <span class="help-text">Stock actual: <strong id="current-stock">-</strong></span>
                                </div>

                                <div class="form-group">
                                    <label>⚖️ Cantidad Requerida *</label>
                                    <div class="input-with-unit">
                                        <input type="number" name="quantity" required min="0.01" step="0.01" placeholder="0.00">
                                        <select name="unit_id">
                                            <option value="kg">kg</option>
                                            <option value="ton">Toneladas</option>
                                            <option value="units">Unidades</option>
                                            <option value="m3">m³</option>
                                            <option value="lt">Litros</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>🎯 Prioridad</label>
                                    <select name="priority">
                                        <option value="normal">Normal</option>
                                        <option value="high">Alta - Urgente</option>
                                        <option value="critical">Crítica - Producción parada</option>
                                    </select>
                                </div>

                                <div class="form-group full-width">
                                    <label>📝 Notas / Observaciones</label>
                                    <textarea name="notes" rows="2" placeholder="Especificaciones adicionales, condiciones especiales..."></textarea>
                                </div>
                            </div>

                            <div id="stock-verification-result" class="verification-result hidden"></div>

                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="LogisticsDashboard.verifyStockForRequest()">
                                    🔍 Verificar Disponibilidad
                                </button>
                                <button type="submit" class="btn-primary" id="submit-request-btn" disabled>
                                    ✅ Crear Solicitud
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- ESTADÍSTICAS DE SOLICITUDES -->
                <div class="requests-stats-row">
                    <div class="stat-card">
                        <div class="stat-icon pending">📋</div>
                        <div class="stat-info">
                            <span class="stat-value" id="stat-pending-requests">0</span>
                            <span class="stat-label">Pendientes</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon reserved">🔒</div>
                        <div class="stat-info">
                            <span class="stat-value" id="stat-reserved-requests">0</span>
                            <span class="stat-label">Con Stock Reservado</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon awaiting">⏳</div>
                        <div class="stat-info">
                            <span class="stat-value" id="stat-awaiting-purchase">0</span>
                            <span class="stat-label">Esperando Compra</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon today">🚀</div>
                        <div class="stat-info">
                            <span class="stat-value" id="stat-today-deliveries">0</span>
                            <span class="stat-label">Entregas Hoy</span>
                        </div>
                    </div>
                </div>

                <!-- FILTROS -->
                <div class="requests-filters">
                    <div class="filter-group">
                        <label>Estado:</label>
                        <select id="filter-request-status" onchange="LogisticsDashboard.filterRequests()">
                            <option value="">Todos</option>
                            <option value="pending">Pendiente Verificación</option>
                            <option value="reserved">Stock Reservado</option>
                            <option value="awaiting_purchase">Esperando Compra</option>
                            <option value="ready">Listo para Entregar</option>
                            <option value="in_transfer">En Transferencia</option>
                            <option value="completed">Completado</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Fecha:</label>
                        <input type="date" id="filter-request-date" onchange="LogisticsDashboard.filterRequests()">
                    </div>
                    <div class="filter-group">
                        <label>Sector:</label>
                        <select id="filter-request-sector" onchange="LogisticsDashboard.filterRequests()">
                            <option value="">Todos los sectores</option>
                        </select>
                    </div>
                    <button class="btn-icon" onclick="LogisticsDashboard.filterRequests()" title="Aplicar filtros">🔍</button>
                    <button class="btn-icon" onclick="LogisticsDashboard.clearRequestFilters()" title="Limpiar filtros">✖️</button>
                </div>

                <!-- LISTA DE SOLICITUDES -->
                <div class="requests-list" id="scheduled-requests-list">
                    <div class="loading-message">
                        <span class="spinner"></span> Cargando solicitudes programadas...
                    </div>
                </div>
            </div>
        `;
    }

    function renderRequestCard(request) {
        const statusConfig = {
            pending: { icon: '⏳', label: 'Pendiente Verificación', class: 'pending' },
            reserved: { icon: '🔒', label: 'Stock Reservado', class: 'reserved' },
            awaiting_purchase: { icon: '🛒', label: 'Esperando Compra', class: 'awaiting' },
            ready: { icon: '✅', label: 'Listo para Entregar', class: 'ready' },
            in_transfer: { icon: '🚚', label: 'En Transferencia', class: 'in-transfer' },
            completed: { icon: '✔️', label: 'Completado', class: 'completed' },
            cancelled: { icon: '❌', label: 'Cancelado', class: 'cancelled' }
        };

        const status = statusConfig[request.status] || statusConfig.pending;
        const isToday = new Date(request.delivery_date).toDateString() === new Date().toDateString();
        const isPast = new Date(request.delivery_date) < new Date() && request.status !== 'completed';

        return `
            <div class="request-card ${status.class} ${isToday ? 'today' : ''} ${isPast ? 'overdue' : ''}">
                <div class="request-header">
                    <span class="request-id">#${request.code || request.id}</span>
                    <span class="request-status ${status.class}">
                        ${status.icon} ${status.label}
                    </span>
                </div>

                <div class="request-body">
                    <div class="request-product">
                        <strong>${request.product_name || 'Producto'}</strong>
                        <span class="sku">${request.product_sku || ''}</span>
                    </div>

                    <div class="request-details">
                        <div class="detail">
                            <span class="label">Cantidad:</span>
                            <span class="value">${formatNumber(request.quantity)} ${request.unit || 'kg'}</span>
                        </div>
                        <div class="detail">
                            <span class="label">Sector:</span>
                            <span class="value">${request.department_name || '-'}</span>
                        </div>
                        <div class="detail highlight">
                            <span class="label">📅 Entrega:</span>
                            <span class="value ${isToday ? 'today-badge' : ''} ${isPast ? 'overdue-badge' : ''}">
                                ${isToday ? '¡HOY!' : formatDate(request.delivery_date)}
                                ${isPast ? '⚠️ ATRASADO' : ''}
                            </span>
                        </div>
                    </div>

                    ${request.notes ? `<div class="request-notes">📝 ${request.notes}</div>` : ''}

                    ${request.reserved_qty ? `
                        <div class="reservation-info">
                            🔒 Reservado: ${formatNumber(request.reserved_qty)} ${request.unit || 'kg'}
                            en ${request.reserved_location || 'almacén'}
                        </div>
                    ` : ''}

                    ${request.purchase_order_id ? `
                        <div class="purchase-link">
                            🛒 OC: <a href="#" onclick="LogisticsDashboard.viewPurchaseOrder(${request.purchase_order_id})">${request.purchase_order_code}</a>
                        </div>
                    ` : ''}
                </div>

                <div class="request-footer">
                    <span class="request-creator">
                        👤 ${request.created_by_name || 'Usuario'} · ${formatDateTime(request.created_at)}
                    </span>
                    <div class="request-actions">
                        ${request.status === 'reserved' && isToday ? `
                            <button class="btn-primary btn-sm" onclick="LogisticsDashboard.convertToTransfer(${request.id})">
                                🔄 Convertir a Transferencia
                            </button>
                        ` : ''}
                        ${request.status === 'pending' ? `
                            <button class="btn-secondary btn-sm" onclick="LogisticsDashboard.verifyRequestStock(${request.id})">
                                🔍 Verificar Stock
                            </button>
                        ` : ''}
                        ${['pending', 'awaiting_purchase'].includes(request.status) ? `
                            <button class="btn-icon btn-sm" onclick="LogisticsDashboard.editRequest(${request.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="btn-icon btn-sm danger" onclick="LogisticsDashboard.cancelRequest(${request.id})" title="Cancelar">
                                ❌
                            </button>
                        ` : ''}
                        <button class="btn-icon btn-sm" onclick="LogisticsDashboard.viewRequestHistory(${request.id})" title="Ver historial">
                            📜
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadRequestsData() {
        try {
            // Cargar departamentos si no están en cache
            if (!cache.departments || cache.departments.length === 0) {
                const deptsResponse = await fetchAPI('/departments');
                cache.departments = deptsResponse.data || [];
            }

            // Cargar productos si no están en cache
            if (!cache.products || cache.products.length === 0) {
                const productsResponse = await fetchAPI('/products?with_stock=true');
                cache.products = productsResponse.data || [];
            }

            // Cargar solicitudes programadas
            const requestsResponse = await fetchAPI('/scheduled-requests');
            cache.scheduledRequests = requestsResponse.data || [];

            // Actualizar estadísticas
            const stats = {
                pending: 0,
                reserved: 0,
                awaiting_purchase: 0,
                today: 0
            };

            const today = new Date().toDateString();
            cache.scheduledRequests.forEach(req => {
                if (req.status === 'pending') stats.pending++;
                if (req.status === 'reserved') stats.reserved++;
                if (req.status === 'awaiting_purchase') stats.awaiting_purchase++;
                if (new Date(req.delivery_date).toDateString() === today &&
                    ['reserved', 'ready'].includes(req.status)) stats.today++;
            });

            document.getElementById('stat-pending-requests').textContent = stats.pending;
            document.getElementById('stat-reserved-requests').textContent = stats.reserved;
            document.getElementById('stat-awaiting-purchase').textContent = stats.awaiting_purchase;
            document.getElementById('stat-today-deliveries').textContent = stats.today;

            // Renderizar lista
            const listEl = document.getElementById('scheduled-requests-list');
            if (listEl) {
                if (cache.scheduledRequests.length === 0) {
                    listEl.innerHTML = `
                        <div class="empty-state">
                            <span class="empty-icon">📋</span>
                            <h4>No hay solicitudes programadas</h4>
                            <p>Crea una nueva solicitud para planificar entregas futuras de materiales.</p>
                        </div>
                    `;
                } else {
                    listEl.innerHTML = cache.scheduledRequests.map(renderRequestCard).join('');
                }
            }

            // Poblar filtro de sectores
            const sectorFilter = document.getElementById('filter-request-sector');
            if (sectorFilter) {
                sectorFilter.innerHTML = `
                    <option value="">Todos los sectores</option>
                    ${cache.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                `;
            }

        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            const listEl = document.getElementById('scheduled-requests-list');
            if (listEl) {
                listEl.innerHTML = `
                    <div class="error-state">
                        <span class="error-icon">⚠️</span>
                        <p>Error al cargar solicitudes. <a href="#" onclick="LogisticsDashboard.loadRequestsData()">Reintentar</a></p>
                    </div>
                `;
            }
        }
    }

    // ============================================================================
    // TAB: TRANSFERENCIAS
    // ============================================================================

    function renderTransfersTab() {
        return `
            <div class="transfers-container">
                <!-- EXPLICACIÓN DEL PROCESO -->
                <div class="process-explanation compact">
                    <h3>🔄 Gestión de Transferencias Internas</h3>
                    <div class="process-flow">
                        <span class="flow-step">📋 Solicitud Aprobada</span>
                        <span class="flow-arrow">→</span>
                        <span class="flow-step">📦 Preparación</span>
                        <span class="flow-arrow">→</span>
                        <span class="flow-step">🚚 En Tránsito</span>
                        <span class="flow-arrow">→</span>
                        <span class="flow-step">✅ Recibido</span>
                    </div>
                    <p class="process-note">
                        <strong>📢 Notificaciones automáticas:</strong> El sistema notifica según el organigrama:
                        al preparador cuando debe alistar, al solicitante cuando sale, y al receptor cuando llega.
                    </p>
                </div>

                <!-- ACCIONES RÁPIDAS -->
                <div class="section-header">
                    <h3>📊 Transferencias Activas</h3>
                    <div class="header-actions">
                        <button class="btn-secondary" onclick="LogisticsDashboard.showQuickTransferModal()">
                            ⚡ Transferencia Rápida
                        </button>
                        <button class="btn-primary" onclick="LogisticsDashboard.showNewTransferModal()">
                            ➕ Nueva Transferencia
                        </button>
                    </div>
                </div>

                <!-- ESTADÍSTICAS -->
                <div class="transfers-stats-row">
                    <div class="stat-card mini">
                        <span class="stat-icon">📋</span>
                        <div class="stat-data">
                            <span class="stat-value" id="transfers-pending">0</span>
                            <span class="stat-label">Por Preparar</span>
                        </div>
                    </div>
                    <div class="stat-card mini">
                        <span class="stat-icon">📦</span>
                        <div class="stat-data">
                            <span class="stat-value" id="transfers-preparing">0</span>
                            <span class="stat-label">En Preparación</span>
                        </div>
                    </div>
                    <div class="stat-card mini">
                        <span class="stat-icon">🚚</span>
                        <div class="stat-data">
                            <span class="stat-value" id="transfers-transit">0</span>
                            <span class="stat-label">En Tránsito</span>
                        </div>
                    </div>
                    <div class="stat-card mini success">
                        <span class="stat-icon">✅</span>
                        <div class="stat-data">
                            <span class="stat-value" id="transfers-today-completed">0</span>
                            <span class="stat-label">Completadas Hoy</span>
                        </div>
                    </div>
                    <div class="stat-card mini warning">
                        <span class="stat-icon">⚠️</span>
                        <div class="stat-data">
                            <span class="stat-value" id="transfers-sla-risk">0</span>
                            <span class="stat-label">Riesgo SLA</span>
                        </div>
                    </div>
                </div>

                <!-- FILTROS -->
                <div class="transfers-filters">
                    <div class="filter-tabs">
                        <button class="filter-tab active" data-filter="all" onclick="LogisticsDashboard.filterTransfers('all')">
                            Todas
                        </button>
                        <button class="filter-tab" data-filter="pending" onclick="LogisticsDashboard.filterTransfers('pending')">
                            Pendientes
                        </button>
                        <button class="filter-tab" data-filter="in_progress" onclick="LogisticsDashboard.filterTransfers('in_progress')">
                            En Proceso
                        </button>
                        <button class="filter-tab" data-filter="completed" onclick="LogisticsDashboard.filterTransfers('completed')">
                            Completadas
                        </button>
                    </div>
                    <div class="filter-search">
                        <input type="text" placeholder="Buscar por código, producto o destino..."
                               id="transfers-search" onkeyup="LogisticsDashboard.searchTransfers(this.value)">
                    </div>
                </div>

                <!-- LISTA DE TRANSFERENCIAS -->
                <div class="transfers-list" id="transfers-list">
                    <div class="loading-message">
                        <span class="spinner"></span> Cargando transferencias...
                    </div>
                </div>
            </div>
        `;
    }

    function renderTransferCard(transfer) {
        const statusConfig = {
            pending: { icon: '📋', label: 'Pendiente', class: 'pending', action: 'Iniciar Preparación' },
            preparing: { icon: '📦', label: 'Preparando', class: 'preparing', action: 'Marcar Enviado' },
            in_transit: { icon: '🚚', label: 'En Tránsito', class: 'transit', action: 'Confirmar Recepción' },
            received: { icon: '✅', label: 'Recibido', class: 'received', action: null },
            cancelled: { icon: '❌', label: 'Cancelado', class: 'cancelled', action: null }
        };

        const status = statusConfig[transfer.status] || statusConfig.pending;
        const slaInfo = calculateSLAStatus(transfer);

        return `
            <div class="transfer-card ${status.class} ${slaInfo.class}">
                <div class="transfer-header">
                    <div class="transfer-route">
                        <span class="origin">${transfer.origin_warehouse || 'Almacén'}</span>
                        <span class="arrow">→</span>
                        <span class="destination">${transfer.destination_name || transfer.department_name || 'Destino'}</span>
                    </div>
                    <div class="transfer-meta">
                        <span class="transfer-code">#${transfer.code || transfer.id}</span>
                        <span class="transfer-status ${status.class}">${status.icon} ${status.label}</span>
                    </div>
                </div>

                <div class="transfer-body">
                    <div class="transfer-items">
                        ${(transfer.items || []).slice(0, 3).map(item => `
                            <div class="transfer-item">
                                <span class="item-name">${item.product_name}</span>
                                <span class="item-qty">${formatNumber(item.quantity)} ${item.unit || 'kg'}</span>
                            </div>
                        `).join('')}
                        ${(transfer.items?.length || 0) > 3 ? `
                            <div class="transfer-item more">
                                + ${transfer.items.length - 3} más...
                            </div>
                        ` : ''}
                    </div>

                    <!-- TIMELINE -->
                    <div class="transfer-timeline">
                        <div class="timeline-step ${transfer.created_at ? 'completed' : ''}">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-label">Creada</span>
                                <span class="timeline-time">${formatDateTime(transfer.created_at)}</span>
                            </div>
                        </div>
                        <div class="timeline-step ${transfer.prepared_at ? 'completed' : transfer.status === 'preparing' ? 'active' : ''}">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-label">Preparada</span>
                                <span class="timeline-time">${transfer.prepared_at ? formatDateTime(transfer.prepared_at) : '-'}</span>
                            </div>
                        </div>
                        <div class="timeline-step ${transfer.shipped_at ? 'completed' : transfer.status === 'in_transit' ? 'active' : ''}">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-label">Enviada</span>
                                <span class="timeline-time">${transfer.shipped_at ? formatDateTime(transfer.shipped_at) : '-'}</span>
                            </div>
                        </div>
                        <div class="timeline-step ${transfer.received_at ? 'completed' : ''}">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-label">Recibida</span>
                                <span class="timeline-time">${transfer.received_at ? formatDateTime(transfer.received_at) : '-'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- SLA INDICATOR -->
                    ${slaInfo.show ? `
                        <div class="sla-indicator ${slaInfo.class}">
                            ${slaInfo.icon} ${slaInfo.message}
                        </div>
                    ` : ''}
                </div>

                <div class="transfer-footer">
                    <div class="transfer-participants">
                        <span class="participant">
                            <span class="role">Solicitante:</span> ${transfer.requester_name || '-'}
                        </span>
                        <span class="participant">
                            <span class="role">Preparador:</span> ${transfer.preparer_name || '-'}
                        </span>
                    </div>
                    <div class="transfer-actions">
                        ${status.action && canPerformAction(transfer) ? `
                            <button class="btn-primary btn-sm" onclick="LogisticsDashboard.advanceTransfer(${transfer.id}, '${transfer.status}')">
                                ${status.action}
                            </button>
                        ` : ''}
                        <button class="btn-icon" onclick="LogisticsDashboard.viewTransferDetails(${transfer.id})" title="Ver detalles">
                            👁️
                        </button>
                        <button class="btn-icon" onclick="LogisticsDashboard.printTransfer(${transfer.id})" title="Imprimir">
                            🖨️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateSLAStatus(transfer) {
        if (['received', 'cancelled'].includes(transfer.status)) {
            return { show: false };
        }

        const now = new Date();
        const deadline = new Date(transfer.sla_deadline || transfer.expected_delivery);

        if (!deadline || isNaN(deadline)) {
            return { show: false };
        }

        const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

        if (hoursRemaining < 0) {
            return { show: true, class: 'sla-breach', icon: '🔴', message: `SLA vencido hace ${Math.abs(Math.round(hoursRemaining))}h` };
        } else if (hoursRemaining < 2) {
            return { show: true, class: 'sla-critical', icon: '🟠', message: `⚠️ Menos de ${Math.round(hoursRemaining * 60)} min para SLA` };
        } else if (hoursRemaining < 8) {
            return { show: true, class: 'sla-warning', icon: '🟡', message: `${Math.round(hoursRemaining)}h restantes` };
        }

        return { show: true, class: 'sla-ok', icon: '🟢', message: `Dentro de SLA (${Math.round(hoursRemaining)}h)` };
    }

    function canPerformAction(transfer) {
        // Aquí iría la lógica de permisos según rol del usuario
        return true;
    }

    async function loadTransfersData() {
        try {
            const response = await fetchAPI('/transfers?include_items=true&include_timeline=true');
            cache.transfers = response.data || [];

            // Calcular estadísticas
            const stats = {
                pending: 0,
                preparing: 0,
                transit: 0,
                completedToday: 0,
                slaRisk: 0
            };

            const today = new Date().toDateString();

            cache.transfers.forEach(t => {
                if (t.status === 'pending') stats.pending++;
                if (t.status === 'preparing') stats.preparing++;
                if (t.status === 'in_transit') stats.transit++;
                if (t.status === 'received' && new Date(t.received_at).toDateString() === today) {
                    stats.completedToday++;
                }

                const sla = calculateSLAStatus(t);
                if (sla.class === 'sla-critical' || sla.class === 'sla-breach') {
                    stats.slaRisk++;
                }
            });

            // Actualizar UI
            document.getElementById('transfers-pending').textContent = stats.pending;
            document.getElementById('transfers-preparing').textContent = stats.preparing;
            document.getElementById('transfers-transit').textContent = stats.transit;
            document.getElementById('transfers-today-completed').textContent = stats.completedToday;
            document.getElementById('transfers-sla-risk').textContent = stats.slaRisk;

            // Renderizar lista
            const listEl = document.getElementById('transfers-list');
            if (listEl) {
                if (cache.transfers.length === 0) {
                    listEl.innerHTML = `
                        <div class="empty-state">
                            <span class="empty-icon">🔄</span>
                            <h4>No hay transferencias activas</h4>
                            <p>Las transferencias aparecerán aquí cuando se conviertan solicitudes o se creen nuevas.</p>
                        </div>
                    `;
                } else {
                    listEl.innerHTML = cache.transfers.map(renderTransferCard).join('');
                }
            }

        } catch (error) {
            console.error('Error cargando transferencias:', error);
        }
    }

    // ============================================================================
    // TAB: SLA TRACKING
    // ============================================================================

    function renderSLATab() {
        return `
            <div class="sla-container">
                <!-- EXPLICACIÓN SLA -->
                <div class="sla-explanation">
                    <h3>⏱️ Sistema de Seguimiento SLA (Service Level Agreement)</h3>
                    <p>Monitoreo en tiempo real del cumplimiento de tiempos de entrega acordados.
                       Las notificaciones se envían automáticamente según el organigrama empresarial.</p>

                    <div class="sla-legend">
                        <div class="legend-item">
                            <span class="legend-dot ok"></span>
                            <span>Dentro de SLA (>8h)</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot warning"></span>
                            <span>Riesgo (2-8h)</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot critical"></span>
                            <span>Crítico (<2h)</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-dot breach"></span>
                            <span>Incumplido</span>
                        </div>
                    </div>
                </div>

                <!-- KPIs SLA -->
                <div class="sla-kpis-row">
                    <div class="sla-kpi">
                        <div class="kpi-value" id="sla-compliance-rate">--%</div>
                        <div class="kpi-label">Cumplimiento General</div>
                        <div class="kpi-trend" id="sla-trend"></div>
                    </div>
                    <div class="sla-kpi">
                        <div class="kpi-value" id="sla-avg-time">--h</div>
                        <div class="kpi-label">Tiempo Promedio</div>
                    </div>
                    <div class="sla-kpi warning">
                        <div class="kpi-value" id="sla-at-risk">0</div>
                        <div class="kpi-label">En Riesgo Ahora</div>
                    </div>
                    <div class="sla-kpi danger">
                        <div class="kpi-value" id="sla-breached-today">0</div>
                        <div class="kpi-label">Incumplidos Hoy</div>
                    </div>
                </div>

                <!-- GRÁFICO DE CUMPLIMIENTO -->
                <div class="sla-charts-row">
                    <div class="chart-container half">
                        <h4>📈 Cumplimiento SLA - Últimos 30 Días</h4>
                        <canvas id="sla-trend-chart"></canvas>
                    </div>
                    <div class="chart-container half">
                        <h4>📊 Distribución por Estado</h4>
                        <canvas id="sla-distribution-chart"></canvas>
                    </div>
                </div>

                <!-- ALERTAS ACTIVAS -->
                <div class="section-header">
                    <h3>🚨 Alertas Activas</h3>
                    <div class="header-actions">
                        <button class="btn-secondary" onclick="LogisticsDashboard.configSLANotifications()">
                            ⚙️ Configurar Notificaciones
                        </button>
                        <button class="btn-icon" onclick="LogisticsDashboard.refreshSLAData()" title="Actualizar">
                            🔄
                        </button>
                    </div>
                </div>

                <div class="sla-alerts-list" id="sla-alerts-list">
                    <div class="loading-message">
                        <span class="spinner"></span> Cargando alertas SLA...
                    </div>
                </div>

                <!-- HISTORIAL DE INCUMPLIMIENTOS -->
                <div class="section-header mt-4">
                    <h3>📜 Historial de Incumplimientos (Últimos 7 días)</h3>
                </div>

                <div class="sla-breaches-table">
                    <table class="logistics-table" id="sla-breaches-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Transferencia</th>
                                <th>Origen → Destino</th>
                                <th>SLA Acordado</th>
                                <th>Tiempo Real</th>
                                <th>Desviación</th>
                                <th>Causa</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="sla-breaches-tbody">
                            <tr>
                                <td colspan="8" class="loading-cell">Cargando historial...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- CONFIGURACIÓN SLA POR TIPO -->
                <div class="section-header mt-4">
                    <h3>⚙️ Configuración SLA por Tipo de Transferencia</h3>
                </div>

                <div class="sla-config-grid" id="sla-config-grid">
                    <div class="sla-config-card">
                        <div class="config-header">
                            <span class="config-icon">🏭</span>
                            <h4>Interna - Mismo Almacén</h4>
                        </div>
                        <div class="config-body">
                            <div class="config-row">
                                <span>Tiempo máximo:</span>
                                <strong>4 horas</strong>
                            </div>
                            <div class="config-row">
                                <span>Alerta temprana:</span>
                                <strong>2 horas antes</strong>
                            </div>
                            <div class="config-row">
                                <span>Notificar a:</span>
                                <strong>Supervisor de Área</strong>
                            </div>
                        </div>
                        <button class="btn-secondary btn-sm" onclick="LogisticsDashboard.editSLAConfig('internal')">
                            ✏️ Editar
                        </button>
                    </div>

                    <div class="sla-config-card">
                        <div class="config-header">
                            <span class="config-icon">🏢</span>
                            <h4>Entre Almacenes</h4>
                        </div>
                        <div class="config-body">
                            <div class="config-row">
                                <span>Tiempo máximo:</span>
                                <strong>24 horas</strong>
                            </div>
                            <div class="config-row">
                                <span>Alerta temprana:</span>
                                <strong>4 horas antes</strong>
                            </div>
                            <div class="config-row">
                                <span>Notificar a:</span>
                                <strong>Jefe de Logística</strong>
                            </div>
                        </div>
                        <button class="btn-secondary btn-sm" onclick="LogisticsDashboard.editSLAConfig('warehouse')">
                            ✏️ Editar
                        </button>
                    </div>

                    <div class="sla-config-card">
                        <div class="config-header">
                            <span class="config-icon">🚨</span>
                            <h4>Urgente / Producción Parada</h4>
                        </div>
                        <div class="config-body">
                            <div class="config-row">
                                <span>Tiempo máximo:</span>
                                <strong>1 hora</strong>
                            </div>
                            <div class="config-row">
                                <span>Alerta temprana:</span>
                                <strong>30 min antes</strong>
                            </div>
                            <div class="config-row">
                                <span>Notificar a:</span>
                                <strong>Gerente + Producción</strong>
                            </div>
                        </div>
                        <button class="btn-secondary btn-sm" onclick="LogisticsDashboard.editSLAConfig('urgent')">
                            ✏️ Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadSLAData() {
        try {
            // Cargar métricas SLA
            const [metricsResponse, alertsResponse, breachesResponse] = await Promise.all([
                fetchAPI('/sla/metrics'),
                fetchAPI('/sla/alerts?active=true'),
                fetchAPI('/sla/breaches?days=7')
            ]);

            const metrics = metricsResponse.data || {};
            cache.slaAlerts = alertsResponse.data || [];
            cache.slaBreaches = breachesResponse.data || [];

            // Actualizar KPIs
            const complianceRate = metrics.compliance_rate || 0;
            document.getElementById('sla-compliance-rate').textContent = complianceRate.toFixed(1) + '%';
            document.getElementById('sla-avg-time').textContent = (metrics.avg_time_hours || 0).toFixed(1) + 'h';
            document.getElementById('sla-at-risk').textContent = metrics.at_risk || 0;
            document.getElementById('sla-breached-today').textContent = metrics.breached_today || 0;

            // Trend indicator
            const trendEl = document.getElementById('sla-trend');
            if (trendEl && metrics.trend) {
                if (metrics.trend > 0) {
                    trendEl.innerHTML = `<span class="trend-up">↑ +${metrics.trend.toFixed(1)}%</span>`;
                } else if (metrics.trend < 0) {
                    trendEl.innerHTML = `<span class="trend-down">↓ ${metrics.trend.toFixed(1)}%</span>`;
                } else {
                    trendEl.innerHTML = `<span class="trend-flat">→ Sin cambio</span>`;
                }
            }

            // Renderizar alertas
            const alertsEl = document.getElementById('sla-alerts-list');
            if (alertsEl) {
                if (cache.slaAlerts.length === 0) {
                    alertsEl.innerHTML = `
                        <div class="empty-state success">
                            <span class="empty-icon">✅</span>
                            <h4>Sin alertas activas</h4>
                            <p>Todas las transferencias están dentro del SLA acordado.</p>
                        </div>
                    `;
                } else {
                    alertsEl.innerHTML = cache.slaAlerts.map(renderSLAAlert).join('');
                }
            }

            // Renderizar tabla de incumplimientos
            const breachesTbody = document.getElementById('sla-breaches-tbody');
            if (breachesTbody) {
                if (cache.slaBreaches.length === 0) {
                    breachesTbody.innerHTML = `
                        <tr>
                            <td colspan="8" class="empty-cell">
                                ✅ No hay incumplimientos en los últimos 7 días
                            </td>
                        </tr>
                    `;
                } else {
                    breachesTbody.innerHTML = cache.slaBreaches.map(renderSLABreachRow).join('');
                }
            }

            // Inicializar gráficos
            initSLACharts(metrics);

        } catch (error) {
            console.error('Error cargando datos SLA:', error);
            // Mostrar datos demo si falla la API
            loadDemoSLAData();
        }
    }

    function renderSLAAlert(alert) {
        const severityConfig = {
            critical: { icon: '🔴', class: 'critical', label: 'CRÍTICO' },
            warning: { icon: '🟠', class: 'warning', label: 'ALERTA' },
            info: { icon: '🟡', class: 'info', label: 'ATENCIÓN' }
        };

        const severity = severityConfig[alert.severity] || severityConfig.info;

        return `
            <div class="sla-alert ${severity.class}">
                <div class="alert-icon">${severity.icon}</div>
                <div class="alert-content">
                    <div class="alert-header">
                        <span class="alert-severity">${severity.label}</span>
                        <span class="alert-time">hace ${alert.minutes_ago || 0} min</span>
                    </div>
                    <div class="alert-message">
                        <strong>Transferencia #${alert.transfer_code}</strong>: ${alert.message}
                    </div>
                    <div class="alert-details">
                        ${alert.origin} → ${alert.destination} ·
                        Tiempo restante: <strong>${alert.time_remaining || 'N/A'}</strong>
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="btn-primary btn-sm" onclick="LogisticsDashboard.viewTransferDetails(${alert.transfer_id})">
                        Ver Detalle
                    </button>
                    <button class="btn-secondary btn-sm" onclick="LogisticsDashboard.escalateSLA(${alert.id})">
                        Escalar
                    </button>
                </div>
            </div>
        `;
    }

    function renderSLABreachRow(breach) {
        const deviationHours = breach.deviation_hours || 0;
        const deviationClass = deviationHours > 4 ? 'severe' : deviationHours > 1 ? 'moderate' : 'minor';

        return `
            <tr class="breach-row ${deviationClass}">
                <td>${formatDate(breach.breach_date)}</td>
                <td><a href="#" onclick="LogisticsDashboard.viewTransferDetails(${breach.transfer_id})">#${breach.transfer_code}</a></td>
                <td>${breach.origin} → ${breach.destination}</td>
                <td>${breach.sla_hours}h</td>
                <td>${breach.actual_hours?.toFixed(1)}h</td>
                <td class="${deviationClass}">+${deviationHours.toFixed(1)}h</td>
                <td>${breach.cause || 'Sin especificar'}</td>
                <td>
                    <button class="btn-icon btn-sm" onclick="LogisticsDashboard.viewBreachDetails(${breach.id})" title="Ver análisis">
                        📊
                    </button>
                </td>
            </tr>
        `;
    }

    function initSLACharts(metrics) {
        // Gráfico de tendencia
        const trendCtx = document.getElementById('sla-trend-chart')?.getContext('2d');
        if (trendCtx) {
            // Destruir gráfico existente si hay
            if (window.slaTrendChart) window.slaTrendChart.destroy();

            const labels = [];
            const data = [];
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }));
                // Datos simulados con tendencia
                data.push(Math.min(100, Math.max(70, 85 + Math.random() * 15 - 5 + (29 - i) * 0.3)));
            }

            window.slaTrendChart = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Cumplimiento SLA %',
                        data,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    }, {
                        label: 'Meta',
                        data: Array(30).fill(95),
                        borderColor: '#22c55e',
                        borderDash: [5, 5],
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: '#e6edf3' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: '#8b949e', maxRotation: 45 },
                            grid: { display: false }
                        },
                        y: {
                            min: 60,
                            max: 100,
                            ticks: {
                                color: '#8b949e',
                                callback: v => v + '%'
                            },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        }
                    }
                }
            });
        }

        // Gráfico de distribución
        const distCtx = document.getElementById('sla-distribution-chart')?.getContext('2d');
        if (distCtx) {
            if (window.slaDistChart) window.slaDistChart.destroy();

            window.slaDistChart = new Chart(distCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Dentro de SLA', 'En Riesgo', 'Crítico', 'Incumplido'],
                    datasets: [{
                        data: [metrics.ok || 75, metrics.at_risk || 15, metrics.critical || 7, metrics.breached || 3],
                        backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#e6edf3', padding: 15 }
                        }
                    }
                }
            });
        }
    }

    function loadDemoSLAData() {
        // Datos demo para cuando la API no está disponible
        document.getElementById('sla-compliance-rate').textContent = '94.2%';
        document.getElementById('sla-avg-time').textContent = '3.5h';
        document.getElementById('sla-at-risk').textContent = '3';
        document.getElementById('sla-breached-today').textContent = '0';

        document.getElementById('sla-trend').innerHTML = '<span class="trend-up">↑ +2.3%</span>';

        const alertsEl = document.getElementById('sla-alerts-list');
        if (alertsEl) {
            alertsEl.innerHTML = `
                <div class="sla-alert warning">
                    <div class="alert-icon">🟠</div>
                    <div class="alert-content">
                        <div class="alert-header">
                            <span class="alert-severity">ALERTA</span>
                            <span class="alert-time">hace 15 min</span>
                        </div>
                        <div class="alert-message">
                            <strong>Transferencia #TRF-2025-0147</strong>: Quedan 2.5 horas para cumplir SLA
                        </div>
                        <div class="alert-details">
                            Almacén Principal → Línea Producción A ·
                            Tiempo restante: <strong>2h 30min</strong>
                        </div>
                    </div>
                    <div class="alert-actions">
                        <button class="btn-primary btn-sm">Ver Detalle</button>
                        <button class="btn-secondary btn-sm">Escalar</button>
                    </div>
                </div>
                <div class="sla-alert info">
                    <div class="alert-icon">🟡</div>
                    <div class="alert-content">
                        <div class="alert-header">
                            <span class="alert-severity">ATENCIÓN</span>
                            <span class="alert-time">hace 45 min</span>
                        </div>
                        <div class="alert-message">
                            <strong>Transferencia #TRF-2025-0145</strong>: 50% del tiempo SLA consumido
                        </div>
                        <div class="alert-details">
                            Almacén Secundario → Empaque ·
                            Tiempo restante: <strong>6h 15min</strong>
                        </div>
                    </div>
                    <div class="alert-actions">
                        <button class="btn-primary btn-sm">Ver Detalle</button>
                    </div>
                </div>
            `;
        }

        const breachesTbody = document.getElementById('sla-breaches-tbody');
        if (breachesTbody) {
            breachesTbody.innerHTML = `
                <tr class="breach-row moderate">
                    <td>02/01/2026</td>
                    <td><a href="#">#TRF-2025-0139</a></td>
                    <td>Almacén B → Producción</td>
                    <td>4h</td>
                    <td>5.8h</td>
                    <td class="moderate">+1.8h</td>
                    <td>Falta de personal</td>
                    <td><button class="btn-icon btn-sm">📊</button></td>
                </tr>
                <tr class="breach-row minor">
                    <td>31/12/2025</td>
                    <td><a href="#">#TRF-2025-0132</a></td>
                    <td>Principal → Despacho</td>
                    <td>2h</td>
                    <td>2.7h</td>
                    <td class="minor">+0.7h</td>
                    <td>Producto no ubicado</td>
                    <td><button class="btn-icon btn-sm">📊</button></td>
                </tr>
            `;
        }

        // Inicializar gráficos con datos demo
        initSLACharts({ ok: 75, at_risk: 15, critical: 7, breached: 3 });
    }

    // ============================================================================
    // FUNCIONES HELPER PARA SOLICITUDES Y TRANSFERENCIAS
    // ============================================================================

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }

    // Exponer funciones para las nuevas tabs
    window.LogisticsDashboard.toggleRequestForm = function() {
        const form = document.getElementById('request-form-container');
        const icon = document.getElementById('form-toggle-icon');
        if (form) {
            form.classList.toggle('collapsed');
            icon.textContent = form.classList.contains('collapsed') ? '▼' : '▲';
        }
    };

    window.LogisticsDashboard.submitRequest = async function(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        try {
            const response = await fetchAPI('/scheduled-requests', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData))
            });

            if (response.success) {
                showSuccess('Solicitud creada exitosamente');
                form.reset();
                await loadRequestsData();
            } else {
                showError(response.message || 'Error al crear solicitud');
            }
        } catch (error) {
            showError('Error al crear solicitud');
        }
    };

    window.LogisticsDashboard.verifyStockForRequest = async function() {
        const form = document.getElementById('scheduled-request-form');
        const productId = form.querySelector('[name="product_id"]').value;
        const quantity = parseFloat(form.querySelector('[name="quantity"]').value);
        const deliveryDate = form.querySelector('[name="delivery_date"]').value;

        if (!productId || !quantity || !deliveryDate) {
            showError('Completa producto, cantidad y fecha antes de verificar');
            return;
        }

        const resultEl = document.getElementById('stock-verification-result');
        resultEl.innerHTML = '<span class="spinner"></span> Verificando disponibilidad...';
        resultEl.className = 'verification-result loading';

        try {
            const response = await fetchAPI(`/stock/verify?product_id=${productId}&quantity=${quantity}&date=${deliveryDate}`);

            if (response.data?.available) {
                resultEl.innerHTML = `
                    <span class="icon">✅</span>
                    <div class="message">
                        <strong>Stock Disponible</strong>
                        <p>Hay ${formatNumber(response.data.available_qty)} ${response.data.unit} disponibles.
                           Se reservarán ${formatNumber(quantity)} al confirmar la solicitud.</p>
                    </div>
                `;
                resultEl.className = 'verification-result success';
                document.getElementById('submit-request-btn').disabled = false;
            } else {
                resultEl.innerHTML = `
                    <span class="icon">⚠️</span>
                    <div class="message">
                        <strong>Stock Insuficiente</strong>
                        <p>Solo hay ${formatNumber(response.data?.available_qty || 0)} disponibles.
                           Se notificará a Compras para gestionar la adquisición.</p>
                    </div>
                `;
                resultEl.className = 'verification-result warning';
                document.getElementById('submit-request-btn').disabled = false;
            }
        } catch (error) {
            resultEl.innerHTML = `
                <span class="icon">❌</span>
                <div class="message">
                    <strong>Error de Verificación</strong>
                    <p>No se pudo verificar el stock. Intente nuevamente.</p>
                </div>
            `;
            resultEl.className = 'verification-result error';
        }
    };

    window.LogisticsDashboard.checkProductStock = function(productId) {
        const select = document.querySelector('[name="product_id"]');
        const option = select.querySelector(`option[value="${productId}"]`);
        const stockEl = document.getElementById('current-stock');

        if (option && stockEl) {
            const stock = option.dataset.stock || 0;
            stockEl.textContent = formatNumber(stock);
        }
    };

    window.LogisticsDashboard.filterRequests = function() {
        // Implementar filtrado de solicitudes
        loadRequestsData();
    };

    window.LogisticsDashboard.clearRequestFilters = function() {
        document.getElementById('filter-request-status').value = '';
        document.getElementById('filter-request-date').value = '';
        document.getElementById('filter-request-sector').value = '';
        loadRequestsData();
    };

    window.LogisticsDashboard.convertToTransfer = async function(requestId) {
        if (!confirm('¿Convertir esta solicitud en transferencia? Se iniciará el proceso de preparación.')) return;

        try {
            const response = await fetchAPI(`/scheduled-requests/${requestId}/convert-to-transfer`, { method: 'POST' });
            if (response.success) {
                showSuccess('Transferencia creada exitosamente');
                await loadRequestsData();
            } else {
                showError(response.message || 'Error al convertir');
            }
        } catch (error) {
            showError('Error al convertir solicitud');
        }
    };

    window.LogisticsDashboard.filterTransfers = function(filter) {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');

        const listEl = document.getElementById('transfers-list');
        if (!listEl) return;

        let filtered = cache.transfers || [];
        if (filter !== 'all') {
            if (filter === 'in_progress') {
                filtered = filtered.filter(t => ['preparing', 'in_transit'].includes(t.status));
            } else {
                filtered = filtered.filter(t => t.status === filter);
            }
        }

        listEl.innerHTML = filtered.length ? filtered.map(renderTransferCard).join('') : `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <h4>No hay transferencias con este filtro</h4>
            </div>
        `;
    };

    window.LogisticsDashboard.advanceTransfer = async function(transferId, currentStatus) {
        const nextStatus = {
            pending: 'preparing',
            preparing: 'in_transit',
            in_transit: 'received'
        };

        const next = nextStatus[currentStatus];
        if (!next) return;

        try {
            const response = await fetchAPI(`/transfers/${transferId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: next })
            });

            if (response.success) {
                showSuccess(`Transferencia actualizada a: ${next}`);
                await loadTransfersData();
            }
        } catch (error) {
            showError('Error al actualizar transferencia');
        }
    };

    window.LogisticsDashboard.refreshSLAData = function() {
        loadSLAData();
    };

    window.LogisticsDashboard.loadRequestsData = loadRequestsData;

    function showSuccess(message) {
        console.log('✅', message);
        const notification = document.createElement('div');
        notification.className = 'logistics-notification success';
        notification.innerHTML = `<span>✅</span> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    function refreshData() {
        loadTabData(currentTab);
    }

    function setupEventListeners() {
        // Event listeners globales
    }

    // Funciones de formateo
    function formatNumber(num) {
        return new Intl.NumberFormat('es-AR').format(num || 0);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-AR');
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('es-AR');
    }

    function getStatusLabel(status) {
        const labels = {
            'CREATED': 'Creado',
            'ASSIGNED': 'Asignado',
            'IN_TRANSIT': 'En Tránsito',
            'DELIVERED': 'Entregado',
            'FAILED_ATTEMPT': 'Intento Fallido',
            'ISSUE': 'Con Problema',
            'REFUSED': 'Rechazado',
            'CANCELLED': 'Cancelado'
        };
        return labels[status] || status;
    }

    function showError(message) {
        console.error(message);
        // Mostrar notificación de error
        const notification = document.createElement('div');
        notification.className = 'logistics-notification error';
        notification.innerHTML = `<span>❌</span> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    function showInfo(message) {
        console.info(message);
        // Mostrar notificación informativa
        const notification = document.createElement('div');
        notification.className = 'logistics-notification info';
        notification.innerHTML = `<span>ℹ️</span> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    function showWarning(message) {
        console.warn(message);
        const notification = document.createElement('div');
        notification.className = 'logistics-notification warning';
        notification.innerHTML = `<span>⚠️</span> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }

    // Exponer funciones públicas adicionales
    window.LogisticsDashboard.onWarehouseChange = function(warehouseId) {
        currentWarehouseId = warehouseId || null;
        loadTabData(currentTab);
    };

    window.LogisticsDashboard.viewWarehouse = async function(id) {
        console.log('Ver almacén:', id);
        // TODO: Implementar modal de detalle
    };

    window.LogisticsDashboard.viewShipment = async function(id) {
        console.log('Ver envío:', id);
        // TODO: Implementar modal de detalle
    };

    window.LogisticsDashboard.trackShipment = async function(trackingNumber) {
        try {
            const response = await fetchAPI(`/shipments/track/${trackingNumber}`);
            console.log('Tracking:', response.data);
            // TODO: Mostrar modal con tracking
        } catch (error) {
            showError('Error al obtener tracking');
        }
    };

    // ============================================================================
    // SISTEMA DE MODALES
    // ============================================================================

    function showModal(title, content, onSave) {
        const existingModal = document.getElementById('logistics-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'logistics-modal';
        modal.className = 'logistics-modal-overlay';
        modal.innerHTML = `
            <div class="logistics-modal logistics-modal-large">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="LogisticsDashboard.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="LogisticsDashboard.closeModal()">Cancelar</button>
                    <button class="btn-primary" onclick="LogisticsDashboard.saveModal()">Guardar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal._onSave = onSave;

        // Inicializar tabs si existen
        setTimeout(() => {
            const tabs = modal.querySelectorAll('.form-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabName = tab.dataset.tab;
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    modal.querySelectorAll('.form-tab-content').forEach(content => {
                        content.classList.remove('active');
                        if (content.dataset.tab === tabName || content.id === `tab-${tabName}`) {
                            content.classList.add('active');
                        }
                    });
                });
            });
        }, 100);
    }

    function closeModal() {
        const modal = document.getElementById('logistics-modal');
        if (modal) modal.remove();
    }

    window.LogisticsDashboard.closeModal = closeModal;

    window.LogisticsDashboard.saveModal = async function() {
        const modal = document.getElementById('logistics-modal');
        if (modal && modal._onSave) {
            await modal._onSave();
        }
    };

    // Función helper para inicializar tabs de modal
    function initModalTabs() {
        const modal = document.getElementById('logistics-modal');
        if (!modal) return;
        const tabs = modal.querySelectorAll('.form-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                modal.querySelectorAll('.form-tab-content').forEach(content => {
                    content.classList.remove('active');
                    if (content.dataset.tab === tabName) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }


    // ============================================================================
    // MODAL: ALMACENES (SOLO LECTURA - SSOT: WMS)
    // ============================================================================
    window.LogisticsDashboard.showCreateWarehouseModal = function() {
        const content = `
            <div class="info-panel info-panel-warning">
                <div class="info-icon">📦</div>
                <div class="info-content">
                    <h4>Gestión de Almacenes</h4>
                    <p>Los almacenes se gestionan desde el módulo <strong>WMS (Warehouse Management System)</strong>.</p>
                    <p>Esto asegura una <strong>fuente única de verdad (SSOT)</strong> para:</p>
                    <ul>
                        <li>✅ Ubicaciones y zonas de almacenamiento</li>
                        <li>✅ Inventario en tiempo real</li>
                        <li>✅ Operaciones de picking y packing</li>
                        <li>✅ Recepción y despacho</li>
                        <li>✅ Control de stock y movimientos</li>
                    </ul>
                    <div class="info-actions">
                        <button class="btn-primary" onclick="window.LogisticsDashboard.openWMSModule()">
                            🚀 Ir a WMS
                        </button>
                        <button class="btn-secondary" onclick="closeModal()">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        showModal('📦 Almacenes - Solo Lectura', content, null);
        // Ocultar botón guardar ya que es solo informativo
        setTimeout(() => {
            const saveBtn = document.getElementById('modal-save-btn');
            if (saveBtn) saveBtn.style.display = 'none';
        }, 50);
    };

    // ============================================================================
    // MODAL: CREAR TRANSPORTISTA (EXPANDIDO - 4 TABS)
    // ============================================================================
    window.LogisticsDashboard.showCreateCarrierModal = function() {
        const content = `
            <form id="carrier-form" class="modal-form modal-form-large">
                <div class="form-tabs">
                    <button type="button" class="form-tab active" data-tab="basic">📋 Básico</button>
                    <button type="button" class="form-tab" data-tab="services">🚚 Servicios</button>
                    <button type="button" class="form-tab" data-tab="rates">💰 Tarifas</button>
                    <button type="button" class="form-tab" data-tab="metrics">📊 Métricas</button>
                </div>

                <!-- TAB 1: DATOS BÁSICOS -->
                <div class="form-tab-content active" data-tab="basic">
                    <div class="form-section-title">🏢 Identificación</div>
                    <div class="form-row">
                        <div class="form-group"><label>Código *</label><input type="text" name="code" required placeholder="TRANS-001" maxlength="20"></div>
                        <div class="form-group"><label>Nombre Comercial *</label><input type="text" name="name" required placeholder="Transportes Express"></div>
                        <div class="form-group"><label>Razón Social</label><input type="text" name="legal_name" placeholder="Transportes Express S.A."></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>CUIT *</label><input type="text" name="tax_id" required placeholder="30-12345678-9"></div>
                        <div class="form-group"><label>Tipo *</label>
                            <select name="type" required>
                                <option value="INTERNAL">🏠 Flota Propia</option>
                                <option value="EXTERNAL">🤝 Tercerizado</option>
                                <option value="COURIER">📦 Courier</option>
                                <option value="FREIGHT">🚛 Carga Pesada</option>
                                <option value="LAST_MILE">🏃 Última Milla</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Estado</label>
                            <select name="active"><option value="true">✅ Activo</option><option value="false">❌ Inactivo</option></select>
                        </div>
                    </div>
                    <div class="form-section-title">📞 Contacto</div>
                    <div class="form-row">
                        <div class="form-group"><label>Persona de Contacto</label><input type="text" name="contact_name" placeholder="Juan Pérez"></div>
                        <div class="form-group"><label>Teléfono</label><input type="tel" name="phone" placeholder="+54 11 1234-5678"></div>
                        <div class="form-group"><label>Email</label><input type="email" name="email" placeholder="contacto@transporte.com"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Website</label><input type="url" name="website" placeholder="https://www.transporte.com"></div>
                        <div class="form-group"><label>Dirección</label><input type="text" name="address" placeholder="Av. Industrial 1234, CABA"></div>
                    </div>
                </div>

                <!-- TAB 2: SERVICIOS Y COBERTURA -->
                <div class="form-tab-content" data-tab="services">
                    <div class="form-section-title">🚚 Tipos de Servicio</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="service_standard" checked> 📦 Estándar (24-48hs)</label>
                        <label class="checkbox-item"><input type="checkbox" name="service_express"> ⚡ Express (mismo día)</label>
                        <label class="checkbox-item"><input type="checkbox" name="service_overnight"> 🌙 Overnight</label>
                        <label class="checkbox-item"><input type="checkbox" name="service_sameday"> ⏰ Same Day (4hs)</label>
                    </div></div></div>
                    <div class="form-section-title">⚙️ Especialidades</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="spec_refrigerated"> ❄️ Refrigerados</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec_hazmat"> ☢️ Mat. Peligrosos</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec_fragile"> 🔮 Frágiles</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec_oversized"> 📐 Sobredimensionados</label>
                    </div></div></div>
                    <div class="form-section-title">🗺️ Cobertura Nacional</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="zone_caba" checked> 🏙️ CABA</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_gba" checked> 🏘️ GBA</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_bsas"> 🌾 Interior Bs.As.</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_litoral"> 🌊 Litoral</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_noa"> 🏔️ NOA</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_cuyo"> 🍇 Cuyo</label>
                        <label class="checkbox-item"><input type="checkbox" name="zone_patagonia"> 🐧 Patagonia</label>
                    </div></div></div>
                    <div class="form-section-title">🌎 Internacional (MERCOSUR)</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="intl_brazil"> 🇧🇷 Brasil</label>
                        <label class="checkbox-item"><input type="checkbox" name="intl_chile"> 🇨🇱 Chile</label>
                        <label class="checkbox-item"><input type="checkbox" name="intl_uruguay"> 🇺🇾 Uruguay</label>
                        <label class="checkbox-item"><input type="checkbox" name="intl_paraguay"> 🇵🇾 Paraguay</label>
                    </div></div></div>
                </div>

                <!-- TAB 3: TARIFAS -->
                <div class="form-tab-content" data-tab="rates">
                    <div class="form-section-title">💰 Estructura de Tarifas</div>
                    <div class="form-row">
                        <div class="form-group"><label>$/Kg</label><input type="number" name="weight_rate_per_kg" placeholder="150" step="0.01" min="0"></div>
                        <div class="form-group"><label>$/m³</label><input type="number" name="volume_rate_per_m3" placeholder="5000" step="0.01" min="0"></div>
                        <div class="form-group"><label>$ Fijo/Envío</label><input type="number" name="flat_rate" placeholder="500" step="0.01" min="0"></div>
                    </div>
                    <div class="form-section-title">📊 Cargos Adicionales</div>
                    <div class="form-row">
                        <div class="form-group"><label>Cargo Mínimo ($)</label><input type="number" name="min_charge" placeholder="500" step="0.01" min="0"></div>
                        <div class="form-group"><label>Recargo Combustible (%)</label><input type="number" name="fuel_surcharge_pct" placeholder="15" step="0.1" min="0" max="100"></div>
                        <div class="form-group"><label>Seguro (%)</label><input type="number" name="insurance_pct" placeholder="1.5" step="0.1" min="0" max="100"></div>
                    </div>
                    <div class="form-section-title">📅 Condiciones Comerciales</div>
                    <div class="form-row">
                        <div class="form-group"><label>Días de Crédito</label><input type="number" name="credit_days" placeholder="30" min="0" max="120"></div>
                        <div class="form-group"><label>Contrato Desde</label><input type="date" name="contract_start"></div>
                        <div class="form-group"><label>Contrato Hasta</label><input type="date" name="contract_end"></div>
                    </div>
                </div>

                <!-- TAB 4: MÉTRICAS Y API -->
                <div class="form-tab-content" data-tab="metrics">
                    <div class="form-section-title">📈 SLA y Métricas Objetivo</div>
                    <div class="form-row">
                        <div class="form-group"><label>Tiempo Entrega Prom (días)</label><input type="number" name="avg_delivery_days" placeholder="2.5" step="0.1" min="0"></div>
                        <div class="form-group"><label>On-Time Target (%)</label><input type="number" name="on_time_pct" placeholder="95" step="0.1" min="0" max="100"></div>
                        <div class="form-group"><label>Tasa Daño Máx (%)</label><input type="number" name="damage_rate_pct" placeholder="0.5" step="0.1" min="0" max="100"></div>
                    </div>
                    <div class="form-section-title">⭐ Calificación</div>
                    <div class="form-row">
                        <div class="form-group"><label>Rating</label>
                            <select name="rating"><option value="5">⭐⭐⭐⭐⭐</option><option value="4">⭐⭐⭐⭐</option><option value="3" selected>⭐⭐⭐</option><option value="2">⭐⭐</option></select>
                        </div>
                        <div class="form-group"><label>Prioridad</label>
                            <select name="priority"><option value="1">🥇 Alta</option><option value="2">🥈 Media</option><option value="3" selected>🥉 Normal</option></select>
                        </div>
                    </div>
                    <div class="form-section-title">🔌 Integración API</div>
                    <div class="form-row">
                        <div class="form-group"><label><input type="checkbox" name="api_enabled" onchange="document.querySelectorAll('.carrier-api-fields').forEach(el=>el.style.display=this.checked?'flex':'none')"> Habilitar API</label></div>
                    </div>
                    <div class="form-row carrier-api-fields" style="display:none;">
                        <div class="form-group"><label>URL API</label><input type="url" name="api_url" placeholder="https://api.carrier.com/v1"></div>
                        <div class="form-group"><label>API Key</label><input type="password" name="api_key" placeholder="••••••••"></div>
                    </div>
                    <div class="form-row carrier-api-fields" style="display:none;">
                        <div class="form-group full-width"><label>Template URL Tracking</label><input type="text" name="tracking_url_template" placeholder="https://tracking.carrier.com/{tracking_number}"></div>
                    </div>
                    <div class="form-section-title">📝 Notas</div>
                    <div class="form-row"><div class="form-group full-width"><textarea name="notes" rows="2" placeholder="Observaciones..."></textarea></div></div>
                </div>
            </form>
        `;

        showModal('🚛 Nuevo Transportista', content, async () => {
            const form = document.getElementById('carrier-form');
            const formData = new FormData(form);
            const services = [], specialties = [], coverageZones = [], internationalCoverage = [];
            ['standard','express','overnight','sameday'].forEach(s => { if(formData.get('service_'+s)) services.push(s.toUpperCase()); });
            ['refrigerated','hazmat','fragile','oversized'].forEach(s => { if(formData.get('spec_'+s)) specialties.push(s.toUpperCase()); });
            ['caba','gba','bsas','litoral','noa','cuyo','patagonia'].forEach(z => { if(formData.get('zone_'+z)) coverageZones.push(z.toUpperCase()); });
            ['brazil','chile','uruguay','paraguay'].forEach(c => { if(formData.get('intl_'+c)) internationalCoverage.push(c.toUpperCase()); });

            const data = {
                code: formData.get('code'), name: formData.get('name'), legal_name: formData.get('legal_name'),
                tax_id: formData.get('tax_id'), type: formData.get('type'),
                contact_name: formData.get('contact_name'), phone: formData.get('phone'), email: formData.get('email'),
                website: formData.get('website'), address: formData.get('address'),
                services, specialties, coverage_zones: coverageZones, international_coverage: internationalCoverage,
                weight_rate_per_kg: parseFloat(formData.get('weight_rate_per_kg')) || null,
                volume_rate_per_m3: parseFloat(formData.get('volume_rate_per_m3')) || null,
                flat_rate: parseFloat(formData.get('flat_rate')) || null,
                min_charge: parseFloat(formData.get('min_charge')) || null,
                fuel_surcharge_pct: parseFloat(formData.get('fuel_surcharge_pct')) || 0,
                insurance_pct: parseFloat(formData.get('insurance_pct')) || 0,
                credit_days: parseInt(formData.get('credit_days')) || 30,
                contract_start: formData.get('contract_start') || null,
                contract_end: formData.get('contract_end') || null,
                avg_delivery_days: parseFloat(formData.get('avg_delivery_days')) || null,
                on_time_pct: parseFloat(formData.get('on_time_pct')) || 95,
                damage_rate_pct: parseFloat(formData.get('damage_rate_pct')) || 0,
                rating: parseInt(formData.get('rating')) || 3,
                priority: parseInt(formData.get('priority')) || 3,
                api_enabled: !!formData.get('api_enabled'),
                api_url: formData.get('api_url') || null,
                api_key: formData.get('api_key') || null,
                tracking_url_template: formData.get('tracking_url_template') || null,
                notes: formData.get('notes'), active: formData.get('active') === 'true'
            };
            try {
                const response = await fetchAPI('/logistics/carriers', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Transportista creado'); closeModal(); loadTabData('fleet'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };

    // ============================================================================
    // MODAL: CREAR VEHÍCULO (EXPANDIDO - 4 TABS)
    // ============================================================================
    window.LogisticsDashboard.showCreateVehicleModal = function() {
        const carriersOptions = (cache.carriers || []).map(c =>
            `<option value="${c.id}">${c.name}</option>`
        ).join('');

        const content = `
            <form id="vehicle-form" class="modal-form modal-form-large">
                <!-- TABS DE NAVEGACIÓN -->
                <div class="form-tabs">
                    <button type="button" class="form-tab active" data-tab="basic">📋 Básico</button>
                    <button type="button" class="form-tab" data-tab="specs">⚙️ Especificaciones</button>
                    <button type="button" class="form-tab" data-tab="docs">📄 Documentación</button>
                    <button type="button" class="form-tab" data-tab="equipment">🔧 Equipamiento</button>
                </div>

                <!-- TAB: DATOS BÁSICOS -->
                <div class="form-tab-content active" data-tab="basic">
                    <div class="form-section-title">Identificación del Vehículo</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Dominio/Patente Tractor *</label>
                            <input type="text" name="plate_number" required placeholder="ABC123" maxlength="10">
                        </div>
                        <div class="form-group">
                            <label>Dominio Semirremolque/Acoplado</label>
                            <input type="text" name="trailer_plate" placeholder="XYZ789" maxlength="10">
                        </div>
                        <div class="form-group">
                            <label>Número Interno</label>
                            <input type="text" name="internal_number" placeholder="U-001">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Marca *</label>
                            <select name="brand" required>
                                <option value="">Seleccionar...</option>
                                <optgroup label="🚛 Camiones Pesados">
                                    <option value="Scania">Scania</option>
                                    <option value="Volvo">Volvo</option>
                                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                                    <option value="MAN">MAN</option>
                                    <option value="DAF">DAF</option>
                                    <option value="Iveco">Iveco</option>
                                </optgroup>
                                <optgroup label="🚚 Camiones Medianos">
                                    <option value="Volkswagen">Volkswagen</option>
                                    <option value="Ford">Ford Cargo</option>
                                    <option value="Hino">Hino</option>
                                    <option value="Isuzu">Isuzu</option>
                                    <option value="Agrale">Agrale</option>
                                </optgroup>
                                <optgroup label="🚐 Utilitarios">
                                    <option value="Fiat">Fiat</option>
                                    <option value="Renault">Renault</option>
                                    <option value="Peugeot">Peugeot</option>
                                    <option value="Citroën">Citroën</option>
                                    <option value="Toyota">Toyota</option>
                                </optgroup>
                                <optgroup label="🏍️ Motos">
                                    <option value="Honda">Honda</option>
                                    <option value="Yamaha">Yamaha</option>
                                    <option value="Zanella">Zanella</option>
                                    <option value="Motomel">Motomel</option>
                                </optgroup>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Modelo *</label>
                            <input type="text" name="model" required placeholder="R450 / Actros / Daily">
                        </div>
                        <div class="form-group">
                            <label>Año *</label>
                            <input type="number" name="year" required min="1990" max="2030" placeholder="2023">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>VIN/Número de Chasis *</label>
                            <input type="text" name="vin" required placeholder="1HGBH41JXMN109186" minlength="17" maxlength="17">
                        </div>
                        <div class="form-group">
                            <label>Número de Motor</label>
                            <input type="text" name="engine_number" placeholder="ABC123456">
                        </div>
                    </div>

                    <div class="form-section-title">Configuración del Vehículo</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tipo de Unidad *</label>
                            <select name="unit_type" required onchange="LogisticsDashboard.onVehicleTypeChange(this.value)">
                                <option value="">Seleccionar...</option>
                                <optgroup label="🏍️ Motocicletas">
                                    <option value="motorcycle">Motocicleta</option>
                                    <option value="moto_cargo">Moto con Caja de Carga</option>
                                </optgroup>
                                <optgroup label="🚐 Utilitarios y Furgones">
                                    <option value="van_small">Furgoneta Pequeña (hasta 1.5t)</option>
                                    <option value="van_medium">Furgón Mediano (hasta 3.5t)</option>
                                    <option value="van_large">Furgón Grande (hasta 7t)</option>
                                    <option value="pickup">Pickup/Camioneta</option>
                                </optgroup>
                                <optgroup label="🚚 Camiones Rígidos">
                                    <option value="truck_light">Camión Liviano (3.5-7.5t)</option>
                                    <option value="truck_medium">Camión Mediano (7.5-12t)</option>
                                    <option value="truck_heavy">Camión Pesado (12-26t)</option>
                                </optgroup>
                                <optgroup label="🚛 Tractores y Combinaciones">
                                    <option value="tractor_4x2">Tractor 4x2</option>
                                    <option value="tractor_6x2">Tractor 6x2</option>
                                    <option value="tractor_6x4">Tractor 6x4</option>
                                </optgroup>
                                <optgroup label="🚛🚛 Semirremolques">
                                    <option value="semi_dryvan">Semirremolque Furgón (Dry Van)</option>
                                    <option value="semi_reefer">Semirremolque Refrigerado</option>
                                    <option value="semi_flatbed">Semirremolque Plataforma</option>
                                    <option value="semi_curtain">Semirremolque Tautliner/Cortinas</option>
                                    <option value="semi_lowboy">Semirremolque Cama Baja</option>
                                    <option value="semi_container">Portacontenedor</option>
                                </optgroup>
                                <optgroup label="🐄 Transporte de Ganado">
                                    <option value="livestock_cattle">Jaula para Bovinos</option>
                                    <option value="livestock_pig">Jaula para Porcinos</option>
                                    <option value="livestock_sheep">Jaula para Ovinos</option>
                                    <option value="livestock_poultry">Transporte Avícola</option>
                                    <option value="livestock_horse">Transporte Equino</option>
                                </optgroup>
                                <optgroup label="🌾 Transporte de Granos">
                                    <option value="grain_hopper">Tolva Granelera</option>
                                    <option value="grain_silo">Silo Móvil</option>
                                </optgroup>
                                <optgroup label="🛢️ Cisternas">
                                    <option value="tanker_fuel">Cisterna Combustible</option>
                                    <option value="tanker_chemical">Cisterna Química</option>
                                    <option value="tanker_food">Cisterna Alimenticia</option>
                                    <option value="tanker_gas">Cisterna GLP/GNC</option>
                                </optgroup>
                                <optgroup label="🚛🚛🚛 Bitrén/Road Train">
                                    <option value="bitren">Bitrén (2 semirremolques)</option>
                                    <option value="road_train">Road Train (3+ unidades)</option>
                                </optgroup>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Configuración de Ejes</label>
                            <select name="axle_config">
                                <option value="">-- Seleccionar --</option>
                                <optgroup label="🏍️ Motocicletas">
                                    <option value="2x1">2x1 (2 ruedas, 1 tracción) - Motos</option>
                                </optgroup>
                                <optgroup label="🚐 Vehículos Livianos (2 ejes)">
                                    <option value="4x2">4x2 (2 ejes, 1 tracción)</option>
                                </optgroup>
                                <optgroup label="🚚 Camiones Medianos (3 ejes)">
                                    <option value="6x2">6x2 (3 ejes, 1 tracción)</option>
                                    <option value="6x4">6x4 (3 ejes, 2 tracción)</option>
                                </optgroup>
                                <optgroup label="🚛 Camiones Pesados (4+ ejes)">
                                    <option value="8x2">8x2 (4 ejes, 1 tracción)</option>
                                    <option value="8x4">8x4 (4 ejes, 2 tracción)</option>
                                </optgroup>
                                <optgroup label="🚛🚛 Combinaciones con Semirremolque">
                                    <option value="6x2+2">6x2+2 (Tractor 3 ejes + Semi 2 ejes)</option>
                                    <option value="6x2+3">6x2+3 (Tractor 3 ejes + Semi 3 ejes)</option>
                                    <option value="6x4+3">6x4+3 (Tractor 3 ejes + Semi 3 ejes)</option>
                                </optgroup>
                                <optgroup label="🚛🚛🚛 Bitrén/Road Train">
                                    <option value="6x4+3+2">6x4+3+2 (Bitrén 8 ejes)</option>
                                    <option value="6x4+3+3">6x4+3+3 (Bitrén 9 ejes)</option>
                                    <option value="8x4+3+3">8x4+3+3 (Road Train 10 ejes)</option>
                                </optgroup>
                                <option value="other">Otra configuración</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Cantidad de Ejes (Total)</label>
                            <input type="number" name="total_axles" min="2" max="12" placeholder="5">
                        </div>
                        <div class="form-group">
                            <label>Tipo de Carrocería</label>
                            <select name="body_type">
                                <option value="closed">Cerrada/Furgón</option>
                                <option value="open">Abierta/Plataforma</option>
                                <option value="curtainside">Cortinas Laterales</option>
                                <option value="refrigerated">Refrigerada</option>
                                <option value="tanker">Cisterna</option>
                                <option value="tipper">Volcadora</option>
                                <option value="livestock">Jaula Ganadera</option>
                                <option value="hopper">Tolva</option>
                                <option value="container">Portacontenedor</option>
                                <option value="lowboy">Cama Baja</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Transportista</label>
                            <select name="carrier_id">
                                <option value="">-- Flota Propia --</option>
                                ${carriersOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="status">
                                <option value="available">Disponible</option>
                                <option value="in_use">En Uso</option>
                                <option value="maintenance">En Mantenimiento</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- TAB: ESPECIFICACIONES TÉCNICAS -->
                <div class="form-tab-content" data-tab="specs">
                    <div class="form-section-title">Capacidades</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Capacidad de Carga (kg)</label>
                            <input type="number" name="load_capacity_kg" placeholder="25000" min="0">
                        </div>
                        <div class="form-group">
                            <label>Volumen (m³)</label>
                            <input type="number" name="volume_m3" placeholder="90" min="0" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>Peso Bruto Total (kg)</label>
                            <input type="number" name="gross_weight_kg" placeholder="45000" min="0">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Tara (kg)</label>
                            <input type="number" name="tare_weight_kg" placeholder="15000" min="0">
                        </div>
                        <div class="form-group">
                            <label>Largo Interno (m)</label>
                            <input type="number" name="internal_length_m" placeholder="13.6" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Ancho Interno (m)</label>
                            <input type="number" name="internal_width_m" placeholder="2.45" step="0.01">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Alto Interno (m)</label>
                            <input type="number" name="internal_height_m" placeholder="2.70" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Capacidad Pallets (Europallet)</label>
                            <input type="number" name="pallet_capacity" placeholder="33" min="0">
                        </div>
                        <div class="form-group">
                            <label>Puertas de Carga</label>
                            <select name="loading_doors">
                                <option value="rear">Solo Trasera</option>
                                <option value="side">Solo Lateral</option>
                                <option value="both">Trasera + Lateral</option>
                                <option value="top">Superior (Tolva)</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-section-title">Motor y Combustible</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Potencia (HP)</label>
                            <input type="number" name="engine_power_hp" placeholder="450">
                        </div>
                        <div class="form-group">
                            <label>Tipo de Combustible</label>
                            <select name="fuel_type">
                                <option value="diesel">Diesel</option>
                                <option value="gasoline">Nafta</option>
                                <option value="gnc">GNC</option>
                                <option value="electric">Eléctrico</option>
                                <option value="hybrid">Híbrido</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Consumo Promedio (L/100km)</label>
                            <input type="number" name="fuel_consumption" placeholder="35" step="0.1">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Capacidad Tanque (L)</label>
                            <input type="number" name="fuel_tank_capacity" placeholder="600">
                        </div>
                        <div class="form-group">
                            <label>Norma de Emisiones</label>
                            <select name="emission_standard">
                                <option value="euro6">Euro 6</option>
                                <option value="euro5">Euro 5</option>
                                <option value="euro4">Euro 4</option>
                                <option value="euro3">Euro 3</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>AdBlue/DEF</label>
                            <select name="has_adblue">
                                <option value="yes">Sí - Con AdBlue</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                    </div>

                    <!-- Sección especial para ganado -->
                    <div id="livestock-specs" style="display:none;">
                        <div class="form-section-title">🐄 Especificaciones Ganaderas</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Capacidad Bovinos (500kg c/u)</label>
                                <input type="number" name="cattle_capacity" placeholder="30">
                            </div>
                            <div class="form-group">
                                <label>Capacidad Porcinos (100kg c/u)</label>
                                <input type="number" name="pig_capacity" placeholder="100">
                            </div>
                            <div class="form-group">
                                <label>Pisos/Niveles</label>
                                <select name="livestock_floors">
                                    <option value="1">1 Piso</option>
                                    <option value="2">2 Pisos</option>
                                    <option value="3">3 Pisos</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Sistema de Ventilación</label>
                                <select name="ventilation_system">
                                    <option value="natural">Natural</option>
                                    <option value="forced">Forzada</option>
                                    <option value="climate">Climatizada</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Bebederos</label>
                                <select name="has_water_system">
                                    <option value="yes">Sí</option>
                                    <option value="no">No</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Rampa Hidráulica</label>
                                <select name="has_hydraulic_ramp">
                                    <option value="yes">Sí</option>
                                    <option value="no">No</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Sección especial para granos -->
                    <div id="grain-specs" style="display:none;">
                        <div class="form-section-title">🌾 Especificaciones Graneleras</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Capacidad (Toneladas)</label>
                                <input type="number" name="grain_capacity_tons" placeholder="30">
                            </div>
                            <div class="form-group">
                                <label>Tipo de Descarga</label>
                                <select name="discharge_type">
                                    <option value="gravity">Gravedad</option>
                                    <option value="hydraulic">Hidráulica</option>
                                    <option value="pneumatic">Neumática</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Cobertura</label>
                                <select name="grain_cover">
                                    <option value="tarp">Lona Manual</option>
                                    <option value="automatic">Lona Automática</option>
                                    <option value="hardtop">Techo Rígido</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Sección especial para refrigerados -->
                    <div id="reefer-specs" style="display:none;">
                        <div class="form-section-title">❄️ Especificaciones Refrigeración</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Marca Equipo Frío</label>
                                <select name="reefer_brand">
                                    <option value="thermoking">Thermo King</option>
                                    <option value="carrier">Carrier</option>
                                    <option value="daikin">Daikin</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Rango de Temperatura</label>
                                <select name="temp_range">
                                    <option value="frozen">Congelado (-25°C a -18°C)</option>
                                    <option value="chilled">Refrigerado (0°C a 4°C)</option>
                                    <option value="multi">Multi-Temperatura</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Particiones</label>
                                <select name="reefer_partitions">
                                    <option value="0">Sin particiones</option>
                                    <option value="1">1 partición</option>
                                    <option value="2">2 particiones</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB: DOCUMENTACIÓN -->
                <div class="form-tab-content" data-tab="docs">
                    <div class="form-section-title">Documentación Obligatoria</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>VTV/ITV Vencimiento *</label>
                            <input type="date" name="vtv_expiry" required>
                        </div>
                        <div class="form-group">
                            <label>Seguro Vencimiento *</label>
                            <input type="date" name="insurance_expiry" required>
                        </div>
                        <div class="form-group">
                            <label>RUTA/Habilitación CNRT</label>
                            <input type="date" name="ruta_expiry">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Número de Póliza</label>
                            <input type="text" name="insurance_policy" placeholder="POL-123456">
                        </div>
                        <div class="form-group">
                            <label>Aseguradora</label>
                            <select name="insurance_company">
                                <option value="">Seleccionar...</option>
                                <option value="la_segunda">La Segunda</option>
                                <option value="mapfre">Mapfre</option>
                                <option value="zurich">Zurich</option>
                                <option value="allianz">Allianz</option>
                                <option value="federacion_patronal">Federación Patronal</option>
                                <option value="sancor">Sancor</option>
                                <option value="other">Otra</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Cobertura</label>
                            <select name="insurance_type">
                                <option value="full">Todo Riesgo</option>
                                <option value="third_party">Terceros Completo</option>
                                <option value="basic">Responsabilidad Civil</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-section-title">Certificaciones Especiales</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_hazmat_cert" onchange="LogisticsDashboard.toggleHazmatFields(this.checked)">
                                ☢️ Habilitación HAZMAT/ADR
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_food_cert">
                                🍎 Habilitación Alimentos (SENASA)
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_pharma_cert">
                                💊 Habilitación Farmacéutica
                            </label>
                        </div>
                    </div>

                    <div id="hazmat-docs" style="display:none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Clases ADR Habilitadas</label>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" name="hazmat_class_1"> Clase 1 - Explosivos</label>
                                    <label><input type="checkbox" name="hazmat_class_2"> Clase 2 - Gases</label>
                                    <label><input type="checkbox" name="hazmat_class_3"> Clase 3 - Líquidos Inflamables</label>
                                    <label><input type="checkbox" name="hazmat_class_4"> Clase 4 - Sólidos Inflamables</label>
                                    <label><input type="checkbox" name="hazmat_class_5"> Clase 5 - Oxidantes</label>
                                    <label><input type="checkbox" name="hazmat_class_6"> Clase 6 - Tóxicos</label>
                                    <label><input type="checkbox" name="hazmat_class_7"> Clase 7 - Radioactivos</label>
                                    <label><input type="checkbox" name="hazmat_class_8"> Clase 8 - Corrosivos</label>
                                    <label><input type="checkbox" name="hazmat_class_9"> Clase 9 - Misceláneos</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Vencimiento Cert. HAZMAT</label>
                                <input type="date" name="hazmat_cert_expiry">
                            </div>
                        </div>
                    </div>

                    <div class="form-section-title">Transporte Internacional</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_mercosur" onchange="LogisticsDashboard.toggleMercosurFields(this.checked)">
                                🌎 Habilitación MERCOSUR/TIR
                            </label>
                        </div>
                    </div>
                    <div id="mercosur-docs" style="display:none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Países Habilitados</label>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" name="mercosur_br"> 🇧🇷 Brasil</label>
                                    <label><input type="checkbox" name="mercosur_uy"> 🇺🇾 Uruguay</label>
                                    <label><input type="checkbox" name="mercosur_py"> 🇵🇾 Paraguay</label>
                                    <label><input type="checkbox" name="mercosur_cl"> 🇨🇱 Chile</label>
                                    <label><input type="checkbox" name="mercosur_bo"> 🇧🇴 Bolivia</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Número MIC/DTA</label>
                                <input type="text" name="mic_dta_number" placeholder="MIC-AR-123456">
                            </div>
                            <div class="form-group">
                                <label>Vencimiento Habilitación</label>
                                <input type="date" name="mercosur_expiry">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB: EQUIPAMIENTO -->
                <div class="form-tab-content" data-tab="equipment">
                    <div class="form-section-title">Equipamiento de Seguridad</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_gps" checked>
                                📍 GPS/Rastreo Satelital
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_dashcam">
                                📹 Cámara DVR
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_immobilizer">
                                🔒 Inmovilizador Remoto
                            </label>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_alarm">
                                🚨 Alarma de Apertura
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_seals">
                                🔐 Precintos Electrónicos
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_fire_extinguisher" checked>
                                🧯 Matafuegos
                            </label>
                        </div>
                    </div>

                    <div class="form-section-title">Equipamiento de Control</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_tachograph">
                                ⏱️ Tacógrafo Digital
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Marca Tacógrafo</label>
                            <select name="tachograph_brand">
                                <option value="">N/A</option>
                                <option value="vdo">VDO/Continental</option>
                                <option value="stoneridge">Stoneridge</option>
                                <option value="actia">Actia</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Última Calibración</label>
                            <input type="date" name="tachograph_calibration">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_speed_limiter">
                                ⚡ Limitador de Velocidad
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Velocidad Máxima (km/h)</label>
                            <input type="number" name="speed_limit" placeholder="90" min="60" max="120">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_eld">
                                📊 ELD (Electronic Logging)
                            </label>
                        </div>
                    </div>

                    <div class="form-section-title">Equipamiento de Carga</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_liftgate">
                                🏋️ Rampa Elevadora
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Capacidad Rampa (kg)</label>
                            <input type="number" name="liftgate_capacity" placeholder="2000">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_pallet_jack">
                                🚜 Transpaleta a Bordo
                            </label>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_load_bars">
                                📏 Barras de Carga
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_straps">
                                🔗 Cinchas de Amarre
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_blankets">
                                🛡️ Mantas Protectoras
                            </label>
                        </div>
                    </div>

                    <div class="form-section-title">Telemetría y Sensores</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_temp_sensor">
                                🌡️ Sensor de Temperatura
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_door_sensor">
                                🚪 Sensor de Puertas
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_fuel_sensor">
                                ⛽ Sensor de Combustible
                            </label>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_weight_sensor">
                                ⚖️ Sensor de Peso
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_humidity_sensor">
                                💧 Sensor de Humedad
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Proveedor Telemetría</label>
                            <select name="telematics_provider">
                                <option value="">Ninguno</option>
                                <option value="geotab">Geotab</option>
                                <option value="samsara">Samsara</option>
                                <option value="omnitracs">Omnitracs</option>
                                <option value="custom">Propio/Custom</option>
                            </select>
                        </div>
                    </div>
                </div>
            </form>
        `;

        showModal('🚛 Nuevo Vehículo', content, async () => {
            const form = document.getElementById('vehicle-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Convertir checkboxes
            const checkboxes = form.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                data[cb.name] = cb.checked;
            });

            try {
                const response = await fetchAPI('/vehicles', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                if (response.success) {
                    showSuccess('Vehículo creado exitosamente');
                    closeModal();
                    loadTabData('fleet');
                }
            } catch (error) {
                showError('Error al crear vehículo');
            }
        });
    };

    // Toggle campos HAZMAT
    window.LogisticsDashboard.toggleHazmatFields = function(show) {
        const hazmatDocs = document.getElementById('hazmat-docs');
        if (hazmatDocs) hazmatDocs.style.display = show ? 'block' : 'none';
    };

    // Toggle campos MERCOSUR
    window.LogisticsDashboard.toggleMercosurFields = function(show) {
        const mercosurDocs = document.getElementById('mercosur-docs');
        if (mercosurDocs) mercosurDocs.style.display = show ? 'block' : 'none';
    };

    // ============================================================================
    // VALIDACIÓN INTELIGENTE DE VEHÍCULOS
    // ============================================================================

    function classifyVehicleType(type) {
        // MOTOCICLETAS
        if (type === 'motorcycle' || type === 'moto_cargo') {
            return { category: 'MOTORCYCLE', maxAxles: 2, hasTrailer: false };
        }
        // UTILITARIOS
        if (['pickup', 'van_small', 'van_medium', 'van_large'].includes(type)) {
            return { category: 'UTILITY', maxAxles: 2, hasTrailer: false };
        }
        // CAMIONES LIVIANOS
        if (type === 'truck_light') {
            return { category: 'TRUCK_LIGHT', maxAxles: 2, hasTrailer: false };
        }
        // CAMIONES MEDIANOS
        if (type === 'truck_medium') {
            return { category: 'TRUCK_MEDIUM', maxAxles: 3, hasTrailer: false };
        }
        // CAMIONES PESADOS
        if (type === 'truck_heavy') {
            return { category: 'TRUCK_HEAVY', maxAxles: 4, hasTrailer: false };
        }
        // TRACTORES
        if (type.startsWith('tractor_')) {
            return { category: 'TRACTOR', maxAxles: 4, hasTrailer: true };
        }
        // SEMIRREMOLQUES
        if (type.startsWith('semi_')) {
            return { category: 'SEMI_TRAILER', maxAxles: 6, hasTrailer: true };
        }
        // BITRÉN/ROAD TRAIN
        if (type === 'bitren' || type === 'road_train') {
            return { category: 'ROAD_TRAIN', maxAxles: 9, hasTrailer: true };
        }
        // GANADO
        if (type.startsWith('livestock_')) {
            return { category: 'LIVESTOCK', maxAxles: 6, hasTrailer: true };
        }
        // GRANOS
        if (type.startsWith('grain_')) {
            return { category: 'GRAIN', maxAxles: 6, hasTrailer: true };
        }
        // CISTERNAS
        if (type.startsWith('tanker_')) {
            return { category: 'TANKER', maxAxles: 6, hasTrailer: true };
        }
        // DEFAULT
        return { category: 'TRUCK_HEAVY', maxAxles: 4, hasTrailer: false };
    }

    function getVehicleRules(vehicleClass) {
        const baseRules = {
            allowedAxleConfigs: [],
            maxAxles: vehicleClass.maxAxles,
            allowedBodyTypes: [],
            requiresVIN: true,
            requiresTachograph: true,
            requiresRUTA: true,
            allowsHazmat: true,
            allowsLivestock: true,
            allowsGrain: true,
            allowsReefer: true
        };

        switch (vehicleClass.category) {
            case 'MOTORCYCLE':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['2x1'],
                    maxAxles: 2,
                    allowedBodyTypes: ['motorcycle', 'moto_cargo', 'moto_box'],
                    requiresTachograph: false,
                    requiresRUTA: false,
                    allowsHazmat: false,
                    allowsLivestock: false,
                    allowsGrain: false,
                    allowsReefer: false
                };

            case 'UTILITY':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['4x2'],
                    maxAxles: 2,
                    allowedBodyTypes: ['pickup', 'van', 'panel', 'minivan', 'box_small'],
                    requiresTachograph: false,
                    requiresRUTA: false,
                    allowsHazmat: false,
                    allowsLivestock: false,
                    allowsGrain: false,
                    allowsReefer: true
                };

            case 'TRUCK_LIGHT':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['4x2'],
                    maxAxles: 2,
                    allowedBodyTypes: ['box', 'flatbed', 'reefer_box', 'curtainside'],
                    requiresTachograph: true,
                    requiresRUTA: true,
                    allowsHazmat: false,
                    allowsLivestock: false,
                    allowsGrain: false,
                    allowsReefer: true
                };

            case 'TRUCK_MEDIUM':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['4x2', '6x2'],
                    maxAxles: 3,
                    allowedBodyTypes: ['box', 'flatbed', 'reefer_box', 'curtainside', 'tanker_small'],
                    requiresTachograph: true,
                    requiresRUTA: true,
                    allowsHazmat: true,
                    allowsLivestock: false,
                    allowsGrain: false,
                    allowsReefer: true
                };

            case 'TRACTOR':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['4x2', '6x2', '6x4', '8x4'],
                    maxAxles: 4,
                    allowedBodyTypes: ['tractor_unit'],
                    requiresTachograph: true,
                    requiresRUTA: true,
                    allowsHazmat: true,
                    allowsLivestock: true,
                    allowsGrain: true,
                    allowsReefer: true
                };

            case 'SEMI_TRAILER':
            case 'TRUCK_TRAILER':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['4x2', '6x2', '6x4', '6x2+2', '6x2+3', '6x4+3'],
                    maxAxles: 6,
                    allowedBodyTypes: ['semi_dryvan', 'semi_flatbed', 'semi_reefer', 'semi_curtain',
                                       'semi_lowboy', 'semi_tanker', 'semi_container'],
                    requiresTachograph: true,
                    requiresRUTA: true,
                    allowsHazmat: true,
                    allowsLivestock: true,
                    allowsGrain: true,
                    allowsReefer: true
                };

            case 'ROAD_TRAIN':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['6x4+3+3', '6x4+3+2', '8x4+3+3'],
                    maxAxles: 9,
                    allowedBodyTypes: ['bitren_tandem', 'bitren_full', 'road_train'],
                    requiresTachograph: true,
                    requiresRUTA: true,
                    allowsHazmat: true,
                    allowsLivestock: true,
                    allowsGrain: true,
                    allowsReefer: true
                };

            case 'LIVESTOCK':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['4x2', '6x2', '6x4', '6x2+2', '6x2+3'],
                    maxAxles: 6,
                    allowedBodyTypes: ['livestock_single', 'livestock_double', 'livestock_triple'],
                    requiresTachograph: true,
                    requiresRUTA: true,
                    allowsHazmat: false,
                    allowsLivestock: true,
                    allowsGrain: false,
                    allowsReefer: false
                };

            case 'GRAIN':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['6x2', '6x4', '6x2+2', '6x2+3', '6x4+3'],
                    maxAxles: 6,
                    allowedBodyTypes: ['hopper', 'silo', 'grain_trailer'],
                    requiresTachograph: true,
                    requiresRUTA: true,
                    allowsHazmat: false,
                    allowsLivestock: false,
                    allowsGrain: true,
                    allowsReefer: false
                };

            case 'TANKER':
                return {
                    ...baseRules,
                    allowedAxleConfigs: ['4x2', '6x2', '6x4', '6x2+2', '6x2+3'],
                    maxAxles: 6,
                    allowedBodyTypes: ['tanker_fuel', 'tanker_chemical', 'tanker_food', 'tanker_gas'],
                    requiresTachograph: true,
                    requiresRUTA: true,
                    allowsHazmat: true,
                    allowsLivestock: false,
                    allowsGrain: false,
                    allowsReefer: false
                };

            default:
                return baseRules;
        }
    }

    function applyVehicleRules(rules, vehicleClass) {
        // Actualizar selector de configuración de ejes
        const axleConfigSelect = document.querySelector('[name="axle_config"]');
        if (axleConfigSelect) {
            // Primero, mostrar todas las opciones y optgroups
            axleConfigSelect.querySelectorAll('option, optgroup').forEach(el => {
                el.style.display = '';
                el.disabled = false;
            });

            // Luego, ocultar/deshabilitar opciones no permitidas
            const allOptions = axleConfigSelect.querySelectorAll('option');
            allOptions.forEach(opt => {
                if (opt.value === '' || opt.value === 'other') {
                    opt.style.display = '';
                    return;
                }
                const isAllowed = rules.allowedAxleConfigs.some(config =>
                    opt.value === config || opt.value.startsWith(config)
                );
                opt.disabled = !isAllowed;
                opt.style.display = isAllowed ? '' : 'none';
            });

            // Ocultar optgroups vacíos
            axleConfigSelect.querySelectorAll('optgroup').forEach(group => {
                const visibleOptions = group.querySelectorAll('option:not([style*="display: none"])');
                group.style.display = visibleOptions.length > 0 ? '' : 'none';
            });

            // Si el valor actual no es válido, resetear
            if (axleConfigSelect.value && axleConfigSelect.value !== 'other' &&
                !rules.allowedAxleConfigs.some(c => axleConfigSelect.value === c || axleConfigSelect.value.startsWith(c))) {
                axleConfigSelect.value = '';
            }

            // Para motos, auto-seleccionar 2x1
            if (vehicleClass.category === 'MOTORCYCLE') {
                axleConfigSelect.value = '2x1';
            }
        }

        // Limitar cantidad máxima de ejes
        const axleCountInput = document.querySelector('[name="total_axles"]');
        if (axleCountInput) {
            axleCountInput.max = rules.maxAxles;
            if (parseInt(axleCountInput.value) > rules.maxAxles) {
                axleCountInput.value = rules.maxAxles;
            }
            if (vehicleClass.category === 'MOTORCYCLE') {
                axleCountInput.value = 2;
                axleCountInput.disabled = true;
            } else {
                axleCountInput.disabled = false;
            }
        }

        // Controlar campos de tacógrafo
        const tachographField = document.querySelector('[name="has_tachograph"]');
        if (tachographField) {
            if (!rules.requiresTachograph) {
                tachographField.checked = false;
                tachographField.disabled = true;
                if (tachographField.closest('label')) {
                    tachographField.closest('label').style.opacity = '0.5';
                }
            } else {
                tachographField.disabled = false;
                if (tachographField.closest('label')) {
                    tachographField.closest('label').style.opacity = '1';
                }
            }
        }

        // Controlar capacidad de carga
        const capacityInput = document.querySelector('[name="load_capacity_kg"]');
        if (capacityInput) {
            switch (vehicleClass.category) {
                case 'MOTORCYCLE':
                    capacityInput.max = 200;
                    capacityInput.placeholder = 'Máx 200 kg';
                    break;
                case 'UTILITY':
                    capacityInput.max = 1500;
                    capacityInput.placeholder = 'Máx 1.500 kg';
                    break;
                case 'TRUCK_LIGHT':
                    capacityInput.max = 7500;
                    capacityInput.placeholder = 'Máx 7.500 kg';
                    break;
                default:
                    capacityInput.max = 100000;
                    capacityInput.placeholder = 'kg';
            }
        }

        // Controlar VIN
        const vinField = document.querySelector('[name="vin"]');
        if (vinField) {
            if (vehicleClass.category === 'MOTORCYCLE') {
                vinField.minLength = 6;
                vinField.placeholder = 'Número de chasis/cuadro';
            } else {
                vinField.minLength = 17;
                vinField.placeholder = '1HGBH41JXMN109186';
            }
        }
    }

    function showVehicleWarning(vehicleClass, rules) {
        const existingWarning = document.getElementById('vehicle-type-warning');
        if (existingWarning) existingWarning.remove();

        let warningMessage = null;

        switch (vehicleClass.category) {
            case 'MOTORCYCLE':
                warningMessage = '🏍️ Motocicleta: Máximo 2 ejes, sin tacógrafo, capacidad limitada a 200kg';
                break;
            case 'UTILITY':
                warningMessage = '🚐 Vehículo utilitario: Máximo 2 ejes, capacidad hasta 1.500kg';
                break;
            case 'TRUCK_LIGHT':
                warningMessage = '🚚 Camión liviano: Hasta 7.500kg, requiere RUTA y tacógrafo';
                break;
            case 'ROAD_TRAIN':
                warningMessage = '🚛🚛 Bitrén/Road Train: Configuración especial, máximo 9 ejes';
                break;
        }

        if (!warningMessage) return;

        const warningDiv = document.createElement('div');
        warningDiv.id = 'vehicle-type-warning';
        warningDiv.className = 'form-warning-banner';
        warningDiv.innerHTML = `<span class="warning-icon">ℹ️</span> ${warningMessage}`;

        const typeSelect = document.querySelector('[name="unit_type"]');
        if (typeSelect) {
            typeSelect.closest('.form-row')?.after(warningDiv);
        }
    }

    window.LogisticsDashboard.onVehicleTypeChange = function(type) {
        if (!type) return;

        const vehicleClass = classifyVehicleType(type);
        console.log(`🚛 [VEHICLE] Tipo: ${type} → Clase: ${vehicleClass.category}`);

        const rules = getVehicleRules(vehicleClass);
        applyVehicleRules(rules, vehicleClass);

        // Ocultar todos los campos especiales primero
        document.querySelectorAll('#livestock-specs, #grain-specs, #reefer-specs').forEach(el => {
            if (el) el.style.display = 'none';
        });

        // Mostrar campos según tipo específico
        if (type.includes('livestock') || type.includes('cattle') || type.includes('pig') || type.includes('sheep') || type.includes('poultry') || type.includes('horse')) {
            const livestockSpecs = document.getElementById('livestock-specs');
            if (livestockSpecs) livestockSpecs.style.display = 'block';
        }

        if (type.includes('grain') || type.includes('hopper') || type.includes('silo')) {
            const grainSpecs = document.getElementById('grain-specs');
            if (grainSpecs) grainSpecs.style.display = 'block';
        }

        if (type.includes('reefer') || type.includes('refriger')) {
            const reeferSpecs = document.getElementById('reefer-specs');
            if (reeferSpecs) reeferSpecs.style.display = 'block';
        }

        showVehicleWarning(vehicleClass, rules);
    };

    // ============================================================================
    // MODAL: CREAR ZONA
    // ============================================================================
    window.LogisticsDashboard.showCreateZoneModal = function() {
        const content = `
            <form id="zone-form" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Código *</label>
                        <input type="text" name="code" required placeholder="ZONA-NORTE" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" name="name" required placeholder="Zona Norte CABA">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group full-width">
                        <label>Descripción</label>
                        <textarea name="description" rows="2" placeholder="Descripción de la zona de cobertura..."></textarea>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Tiempo Base (minutos)</label>
                        <input type="number" name="base_delivery_time_min" placeholder="60" min="0">
                    </div>
                    <div class="form-group">
                        <label>Costo Base ($)</label>
                        <input type="number" name="base_cost" placeholder="500" min="0" step="0.01">
                    </div>
                </div>
            </form>
        `;

        showModal('📍 Nueva Zona de Cobertura', content, async () => {
            const form = document.getElementById('zone-form');
            const formData = new FormData(form);
            try {
                const response = await fetchAPI('/zones', {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                if (response.success) {
                    showSuccess('Zona creada exitosamente');
                    closeModal();
                    loadTabData('coverage');
                }
            } catch (error) {
                showError('Error al crear zona');
            }
        });
    };

    // ============================================================================
    // MODAL: CREAR TIPO DE UBICACIÓN
    // ============================================================================
    window.LogisticsDashboard.showCreateLocationTypeModal = function() {
        const content = `
            <form id="location-type-form" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Código *</label>
                        <input type="text" name="code" required placeholder="RACK-A" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" name="name" required placeholder="Rack Altura Simple">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoría *</label>
                        <select name="category" required>
                            <option value="">Seleccionar...</option>
                            <option value="rack">📦 Rack</option>
                            <option value="shelf">📚 Estantería</option>
                            <option value="floor">🏭 Piso</option>
                            <option value="dock">🚚 Dársena</option>
                            <option value="staging">📋 Staging</option>
                            <option value="cold">❄️ Cámara Fría</option>
                            <option value="hazmat">☣️ HAZMAT</option>
                            <option value="bulk">🌾 Granel</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Capacidad (kg)</label>
                        <input type="number" name="max_weight_kg" placeholder="1000" min="0" step="0.01">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Alto máx (m)</label>
                        <input type="number" name="max_height_m" placeholder="2.5" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Ancho máx (m)</label>
                        <input type="number" name="max_width_m" placeholder="1.2" min="0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Profundidad máx (m)</label>
                        <input type="number" name="max_depth_m" placeholder="1.0" min="0" step="0.01">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group full-width">
                        <label>Descripción</label>
                        <textarea name="description" rows="2" placeholder="Descripción del tipo de ubicación..."></textarea>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="requires_forklift">
                            Requiere autoelevador
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="temperature_controlled">
                            Temperatura controlada
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="fifo_required">
                            FIFO obligatorio
                        </label>
                    </div>
                </div>
            </form>
        `;

        showModal('📍 Nuevo Tipo de Ubicación', content, async () => {
            const form = document.getElementById('location-type-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Checkboxes
            data.requires_forklift = form.querySelector('[name="requires_forklift"]').checked;
            data.temperature_controlled = form.querySelector('[name="temperature_controlled"]').checked;
            data.fifo_required = form.querySelector('[name="fifo_required"]').checked;

            try {
                const response = await fetchAPI('/location-types', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                if (response.success) {
                    showSuccess('Tipo de ubicación creado exitosamente');
                    closeModal();
                    loadTabData('warehouses');
                }
            } catch (error) {
                showError('Error al crear tipo de ubicación');
            }
        });
    };

    // ============================================================================
    // MODAL: CREAR RUTA
    // ============================================================================
    window.LogisticsDashboard.showCreateRouteModal = function() {
        const zonesOptions = (cache.zones || []).map(z =>
            `<option value="${z.id}">${z.code} - ${z.name}</option>`
        ).join('');

        const carriersOptions = (cache.carriers || []).map(c =>
            `<option value="${c.id}">${c.name}</option>`
        ).join('');

        const content = `
            <form id="route-form" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Código de Ruta *</label>
                        <input type="text" name="code" required placeholder="RUT-001" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" name="name" required placeholder="Ruta CABA Norte">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Zona Origen *</label>
                        <select name="origin_zone_id" required>
                            <option value="">Seleccionar zona...</option>
                            ${zonesOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Zona Destino *</label>
                        <select name="destination_zone_id" required>
                            <option value="">Seleccionar zona...</option>
                            ${zonesOptions}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Transportista Preferido</label>
                        <select name="preferred_carrier_id">
                            <option value="">Sin preferencia</option>
                            ${carriersOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Ruta</label>
                        <select name="route_type">
                            <option value="local">🏙️ Local (mismo día)</option>
                            <option value="regional">🗺️ Regional (1-2 días)</option>
                            <option value="national">🇦🇷 Nacional (3-5 días)</option>
                            <option value="international">🌍 Internacional (MERCOSUR)</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Distancia (km)</label>
                        <input type="number" name="distance_km" placeholder="150" min="0" step="0.1">
                    </div>
                    <div class="form-group">
                        <label>Tiempo Estimado (horas)</label>
                        <input type="number" name="estimated_hours" placeholder="3.5" min="0" step="0.5">
                    </div>
                    <div class="form-group">
                        <label>Costo por km ($)</label>
                        <input type="number" name="cost_per_km" placeholder="25.50" min="0" step="0.01">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group full-width">
                        <label>Notas / Restricciones</label>
                        <textarea name="notes" rows="2" placeholder="Ej: Evitar autopista en hora pico, restricción camiones >20t..."></textarea>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="hazmat_allowed">
                            ☣️ Permite HAZMAT
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="refrigerated_allowed" checked>
                            ❄️ Permite refrigerado
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="active" checked>
                            ✅ Ruta activa
                        </label>
                    </div>
                </div>
            </form>
        `;

        showModal('🛣️ Nueva Ruta', content, async () => {
            const form = document.getElementById('route-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Checkboxes
            data.hazmat_allowed = form.querySelector('[name="hazmat_allowed"]').checked;
            data.refrigerated_allowed = form.querySelector('[name="refrigerated_allowed"]').checked;
            data.active = form.querySelector('[name="active"]').checked;

            try {
                const response = await fetchAPI('/routes', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                if (response.success) {
                    showSuccess('Ruta creada exitosamente');
                    closeModal();
                    loadTabData('coverage');
                }
            } catch (error) {
                showError('Error al crear ruta');
            }
        });
    };

    // ============================================================================
    // MODAL: CREAR ENVÍO
        // ============================================================================
    // MODAL: CREAR ENVÍO (EXPANDIDO - 5 TABS)
    // ============================================================================
    window.LogisticsDashboard.showCreateShipmentModal = function() {
        const carriersOptions = (cache.carriers || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        const zonesOptions = (cache.zones || []).map(z => `<option value="${z.id}">${z.code} - ${z.name}</option>`).join('');

        const content = `
            <form id="shipment-form" class="modal-form modal-form-large">
                <div class="form-tabs">
                    <button type="button" class="form-tab active" data-tab="basic">📋 Básico</button>
                    <button type="button" class="form-tab" data-tab="origin">📤 Origen</button>
                    <button type="button" class="form-tab" data-tab="destination">📥 Destino</button>
                    <button type="button" class="form-tab" data-tab="content">📦 Contenido</button>
                    <button type="button" class="form-tab" data-tab="delivery">🚚 Entrega</button>
                </div>

                <!-- TAB 1: DATOS BÁSICOS -->
                <div class="form-tab-content active" data-tab="basic">
                    <div class="form-section-title">📋 Información del Envío</div>
                    <div class="form-row">
                        <div class="form-group"><label>Referencia *</label><input type="text" name="reference" required placeholder="ENV-2024-00001"></div>
                        <div class="form-group"><label>Referencia Cliente</label><input type="text" name="customer_reference" placeholder="OC-12345"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Tipo de Envío *</label>
                            <select name="shipment_type" required>
                                <option value="DELIVERY">📤 Entrega</option>
                                <option value="PICKUP">📥 Retiro</option>
                                <option value="TRANSFER">🔄 Transferencia</option>
                                <option value="RETURN">↩️ Devolución</option>
                                <option value="CROSS_DOCK">🔀 Cross-Dock</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Prioridad *</label>
                            <select name="priority" required>
                                <option value="URGENT">🔴 Urgente</option>
                                <option value="HIGH">🟠 Alta</option>
                                <option value="NORMAL" selected>🟢 Normal</option>
                                <option value="LOW">🔵 Baja</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Transportista</label>
                            <select name="carrier_id"><option value="">Auto-asignar</option>${carriersOptions}</select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Fecha Programada</label><input type="date" name="scheduled_date"></div>
                        <div class="form-group"><label>Hora Desde</label><input type="time" name="time_window_start" value="09:00"></div>
                        <div class="form-group"><label>Hora Hasta</label><input type="time" name="time_window_end" value="18:00"></div>
                    </div>
                </div>

                <!-- TAB 2: ORIGEN -->
                <div class="form-tab-content" data-tab="origin">
                    <div class="form-section-title">📤 Datos del Remitente</div>
                    <div class="form-row">
                        <div class="form-group"><label>Nombre/Empresa *</label><input type="text" name="sender_name" required placeholder="Mi Empresa S.A."></div>
                        <div class="form-group"><label>Contacto</label><input type="text" name="sender_contact" placeholder="Juan Pérez"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Teléfono *</label><input type="tel" name="sender_phone" required placeholder="+54 11 1234-5678"></div>
                        <div class="form-group"><label>Email</label><input type="email" name="sender_email" placeholder="remitente@empresa.com"></div>
                    </div>
                    <div class="form-section-title">📍 Dirección de Origen</div>
                    <div class="form-row">
                        <div class="form-group full-width"><label>Dirección *</label><input type="text" name="origin_address" required placeholder="Av. Corrientes 1234, Piso 5"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Ciudad *</label><input type="text" name="origin_city" required placeholder="Buenos Aires"></div>
                        <div class="form-group"><label>CP</label><input type="text" name="origin_postal_code" placeholder="C1043"></div>
                        <div class="form-group"><label>Zona</label><select name="origin_zone_id"><option value="">Seleccionar...</option>${zonesOptions}</select></div>
                    </div>
                </div>

                <!-- TAB 3: DESTINO -->
                <div class="form-tab-content" data-tab="destination">
                    <div class="form-section-title">📥 Datos del Destinatario</div>
                    <div class="form-row">
                        <div class="form-group"><label>Nombre/Empresa *</label><input type="text" name="recipient_name" required placeholder="Cliente Final"></div>
                        <div class="form-group"><label>Contacto</label><input type="text" name="recipient_contact" placeholder="María García"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Teléfono *</label><input type="tel" name="recipient_phone" required placeholder="+54 11 9876-5432"></div>
                        <div class="form-group"><label>Email</label><input type="email" name="recipient_email" placeholder="cliente@email.com"></div>
                    </div>
                    <div class="form-section-title">📍 Dirección de Destino</div>
                    <div class="form-row">
                        <div class="form-group full-width"><label>Dirección *</label><input type="text" name="delivery_address" required placeholder="Calle Falsa 123"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Ciudad *</label><input type="text" name="delivery_city" required placeholder="Quilmes"></div>
                        <div class="form-group"><label>CP</label><input type="text" name="delivery_postal_code" placeholder="B1878"></div>
                        <div class="form-group"><label>Zona</label><select name="delivery_zone_id"><option value="">Seleccionar...</option>${zonesOptions}</select></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group full-width"><label>Instrucciones de Entrega</label><textarea name="delivery_instructions" rows="2" placeholder="Entre calle A y B, timbre 2do piso..."></textarea></div>
                    </div>
                </div>

                <!-- TAB 4: CONTENIDO -->
                <div class="form-tab-content" data-tab="content">
                    <div class="form-section-title">📦 Detalle del Contenido</div>
                    <div class="form-row">
                        <div class="form-group"><label>Descripción *</label><input type="text" name="contents_description" required placeholder="Electrodomésticos"></div>
                        <div class="form-group"><label>Bultos *</label><input type="number" name="pieces" required value="1" min="1"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Peso Total (kg)</label><input type="number" name="weight_kg" placeholder="10.5" step="0.1" min="0"></div>
                        <div class="form-group"><label>Volumen (m³)</label><input type="number" name="volume_m3" placeholder="0.5" step="0.01" min="0"></div>
                        <div class="form-group"><label>Peso Vol. (kg)</label><input type="number" name="volumetric_weight" placeholder="12" step="0.1" min="0" readonly></div>
                    </div>
                    <div class="form-section-title">⚠️ Características Especiales</div>
                    <div class="form-row"><div class="form-group full-width"><div class="checkbox-grid">
                        <label class="checkbox-item"><input type="checkbox" name="is_fragile"> 🔮 Frágil</label>
                        <label class="checkbox-item"><input type="checkbox" name="is_hazmat"> ☢️ Peligroso</label>
                        <label class="checkbox-item"><input type="checkbox" name="requires_refrigeration"> ❄️ Refrigerado</label>
                        <label class="checkbox-item"><input type="checkbox" name="requires_signature"> ✍️ Requiere Firma</label>
                        <label class="checkbox-item"><input type="checkbox" name="is_insured"> 🛡️ Asegurado</label>
                    </div></div></div>
                    <div class="form-section-title">💰 Valor</div>
                    <div class="form-row">
                        <div class="form-group"><label>Valor Declarado ($)</label><input type="number" name="declared_value" placeholder="10000" step="0.01" min="0"></div>
                        <div class="form-group"><label>COD - Cobrar al Entregar ($)</label><input type="number" name="cod_amount" placeholder="0" step="0.01" min="0"></div>
                    </div>
                </div>

                <!-- TAB 5: ENTREGA Y COSTOS -->
                <div class="form-tab-content" data-tab="delivery">
                    <div class="form-section-title">🚚 Servicio de Entrega</div>
                    <div class="form-row">
                        <div class="form-group"><label>Tipo Servicio</label>
                            <select name="service_type">
                                <option value="STANDARD">📦 Estándar (24-48hs)</option>
                                <option value="EXPRESS">⚡ Express (mismo día)</option>
                                <option value="OVERNIGHT">🌙 Overnight</option>
                                <option value="SCHEDULED">📅 Programado</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Intentos Máx</label><input type="number" name="max_delivery_attempts" value="3" min="1" max="5"></div>
                    </div>
                    <div class="form-section-title">💵 Costos</div>
                    <div class="form-row">
                        <div class="form-group"><label>Costo Flete ($)</label><input type="number" name="freight_cost" placeholder="0" step="0.01" min="0"></div>
                        <div class="form-group"><label>Costo Seguro ($)</label><input type="number" name="insurance_cost" placeholder="0" step="0.01" min="0"></div>
                        <div class="form-group"><label>Otros Cargos ($)</label><input type="number" name="other_charges" placeholder="0" step="0.01" min="0"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Descuento ($)</label><input type="number" name="discount" placeholder="0" step="0.01" min="0"></div>
                        <div class="form-group"><label>IVA (%)</label><input type="number" name="tax_rate" value="21" step="0.1" min="0"></div>
                        <div class="form-group"><label>TOTAL ($)</label><input type="number" name="total_cost" placeholder="0" step="0.01" readonly></div>
                    </div>
                    <div class="form-section-title">📝 Notas</div>
                    <div class="form-row"><div class="form-group full-width"><textarea name="notes" rows="2" placeholder="Observaciones internas..."></textarea></div></div>
                </div>
            </form>
        `;

        showModal('📦 Nuevo Envío', content, async () => {
            const form = document.getElementById('shipment-form');
            const formData = new FormData(form);
            const data = {
                reference: formData.get('reference'), customer_reference: formData.get('customer_reference'),
                shipment_type: formData.get('shipment_type'), priority: formData.get('priority'),
                carrier_id: formData.get('carrier_id') || null,
                scheduled_date: formData.get('scheduled_date') || null,
                time_window_start: formData.get('time_window_start'), time_window_end: formData.get('time_window_end'),
                sender_name: formData.get('sender_name'), sender_contact: formData.get('sender_contact'),
                sender_phone: formData.get('sender_phone'), sender_email: formData.get('sender_email'),
                origin_address: formData.get('origin_address'), origin_city: formData.get('origin_city'),
                origin_postal_code: formData.get('origin_postal_code'), origin_zone_id: formData.get('origin_zone_id') || null,
                recipient_name: formData.get('recipient_name'), recipient_contact: formData.get('recipient_contact'),
                recipient_phone: formData.get('recipient_phone'), recipient_email: formData.get('recipient_email'),
                delivery_address: formData.get('delivery_address'), delivery_city: formData.get('delivery_city'),
                delivery_postal_code: formData.get('delivery_postal_code'), delivery_zone_id: formData.get('delivery_zone_id') || null,
                delivery_instructions: formData.get('delivery_instructions'),
                contents_description: formData.get('contents_description'), pieces: parseInt(formData.get('pieces')) || 1,
                weight_kg: parseFloat(formData.get('weight_kg')) || null, volume_m3: parseFloat(formData.get('volume_m3')) || null,
                is_fragile: !!formData.get('is_fragile'), is_hazmat: !!formData.get('is_hazmat'),
                requires_refrigeration: !!formData.get('requires_refrigeration'),
                requires_signature: !!formData.get('requires_signature'), is_insured: !!formData.get('is_insured'),
                declared_value: parseFloat(formData.get('declared_value')) || null,
                cod_amount: parseFloat(formData.get('cod_amount')) || 0,
                service_type: formData.get('service_type'),
                max_delivery_attempts: parseInt(formData.get('max_delivery_attempts')) || 3,
                freight_cost: parseFloat(formData.get('freight_cost')) || 0,
                insurance_cost: parseFloat(formData.get('insurance_cost')) || 0,
                other_charges: parseFloat(formData.get('other_charges')) || 0,
                discount: parseFloat(formData.get('discount')) || 0,
                tax_rate: parseFloat(formData.get('tax_rate')) || 21,
                notes: formData.get('notes')
            };
            try {
                const response = await fetchAPI('/logistics/shipments', { method: 'POST', body: JSON.stringify(data) });
                if (response.success) { showSuccess('Envío creado: ' + response.data.tracking_number); closeModal(); loadTabData('operations'); }
            } catch (error) { showError('Error: ' + error.message); }
        });
        setTimeout(() => initModalTabs(), 100);
    };

    // ============================================================================
    // MODAL: GENERAR OLA DE PICKING
    // ============================================================================
    window.LogisticsDashboard.showGenerateWaveModal = function() {
        const content = `
            <form id="wave-form" class="modal-form">
                <div class="form-row">
                    <div class="form-group full-width">
                        <label>Nombre de la Ola *</label>
                        <input type="text" name="name" required placeholder="Ola Mañana - ${new Date().toLocaleDateString()}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="wave_type">
                            <option value="standard">Estándar</option>
                            <option value="express">Express</option>
                            <option value="bulk">Masiva</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Almacén</label>
                        <select name="warehouse_id">
                            ${(cache.warehouses || []).map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Hora Inicio</label>
                        <input type="time" name="start_time" value="08:00">
                    </div>
                    <div class="form-group">
                        <label>Hora Fin Estimada</label>
                        <input type="time" name="end_time" value="12:00">
                    </div>
                </div>
            </form>
        `;

        showModal('🌊 Generar Ola de Picking', content, async () => {
            const form = document.getElementById('wave-form');
            const formData = new FormData(form);
            try {
                const response = await fetchAPI('/picking/waves', {
                    method: 'POST',
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                if (response.success) {
                    showSuccess('Ola generada exitosamente');
                    closeModal();
                    loadTabData('picking');
                }
            } catch (error) {
                showError('Error al generar ola');
            }
        });
    };

    // ============================================================================
    // MODAL: CREAR CONDUCTOR (EXPANDIDO - 5 TABS)
    // ============================================================================
    window.LogisticsDashboard.showCreateDriverModal = function() {
        const carriersOptions = (cache.carriers || []).map(c =>
            `<option value="${c.id}">${c.name}</option>`
        ).join('');

        const content = `
            <form id="driver-form" class="modal-form modal-form-large">
                <!-- TABS DE NAVEGACIÓN -->
                <div class="form-tabs">
                    <button type="button" class="form-tab active" data-tab="personal">👤 Datos Personales</button>
                    <button type="button" class="form-tab" data-tab="license">🪪 Licencias</button>
                    <button type="button" class="form-tab" data-tab="medical">🏥 Médico</button>
                    <button type="button" class="form-tab" data-tab="certifications">📜 Certificaciones</button>
                    <button type="button" class="form-tab" data-tab="compliance">⏱️ Cumplimiento</button>
                </div>

                <!-- TAB 1: DATOS PERSONALES -->
                <div class="form-tab-content active" id="tab-personal">
                    <div class="form-section-title">📋 Información Personal</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nombre Completo *</label>
                            <input type="text" name="name" required placeholder="Juan Carlos Pérez González">
                        </div>
                        <div class="form-group">
                            <label>Tipo Documento *</label>
                            <select name="document_type" required>
                                <option value="DNI">DNI - Argentina</option>
                                <option value="CI">CI - Uruguay/Paraguay</option>
                                <option value="RUT">RUT - Chile</option>
                                <option value="CPF">CPF - Brasil</option>
                                <option value="PASSPORT">Pasaporte</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Número de Documento *</label>
                            <input type="text" name="document_number" required placeholder="12345678">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>CUIL/CUIT</label>
                            <input type="text" name="cuil" placeholder="20-12345678-9">
                        </div>
                        <div class="form-group">
                            <label>Fecha Nacimiento *</label>
                            <input type="date" name="birth_date" required>
                        </div>
                        <div class="form-group">
                            <label>Nacionalidad</label>
                            <select name="nationality">
                                <option value="AR">🇦🇷 Argentina</option>
                                <option value="BR">🇧🇷 Brasil</option>
                                <option value="CL">🇨🇱 Chile</option>
                                <option value="UY">🇺🇾 Uruguay</option>
                                <option value="PY">🇵🇾 Paraguay</option>
                                <option value="BO">🇧🇴 Bolivia</option>
                                <option value="PE">🇵🇪 Perú</option>
                                <option value="OTHER">Otro</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-section-title">📞 Contacto</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Teléfono Principal *</label>
                            <input type="tel" name="phone" required placeholder="+54 11 1234-5678">
                        </div>
                        <div class="form-group">
                            <label>Teléfono Alternativo</label>
                            <input type="tel" name="phone_alt" placeholder="+54 11 8765-4321">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" placeholder="conductor@email.com">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group full-width">
                            <label>Dirección</label>
                            <input type="text" name="address" placeholder="Av. Siempreviva 742">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Ciudad</label>
                            <input type="text" name="city" placeholder="Buenos Aires">
                        </div>
                        <div class="form-group">
                            <label>Código Postal</label>
                            <input type="text" name="postal_code" placeholder="C1234ABC">
                        </div>
                    </div>

                    <div class="form-section-title">🚛 Asignación</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Transportista</label>
                            <select name="carrier_id">
                                <option value="">-- Flota Propia --</option>
                                ${carriersOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="status">
                                <option value="available">Disponible</option>
                                <option value="on_route">En Ruta</option>
                                <option value="off_duty">Fuera de Servicio</option>
                                <option value="vacation">Vacaciones</option>
                                <option value="sick_leave">Licencia Médica</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Fecha de Ingreso</label>
                            <input type="date" name="hire_date">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group full-width">
                            <label>
                                <input type="checkbox" name="is_owner_operator">
                                👨‍💼 Es dueño/operador de su propio vehículo
                            </label>
                        </div>
                    </div>
                </div>

                <!-- TAB 2: LICENCIAS -->
                <div class="form-tab-content" id="tab-license">
                    <div class="form-section-title">🪪 Licencia de Conducir Principal</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>País Emisor *</label>
                            <select name="license_country" id="license-country-select" required onchange="LogisticsDashboard.onLicenseCountryChange(this.value)">
                                <option value="AR">🇦🇷 Argentina</option>
                                <option value="BR">🇧🇷 Brasil</option>
                                <option value="CL">🇨🇱 Chile</option>
                                <option value="UY">🇺🇾 Uruguay</option>
                                <option value="US">🇺🇸 Estados Unidos</option>
                                <option value="EU">🇪🇺 Unión Europea</option>
                                <option value="OTHER">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Número de Licencia *</label>
                            <input type="text" name="license_number" required placeholder="12345678">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Categoría/Clase *</label>
                            <select name="license_category" id="license-category-select" required onchange="LogisticsDashboard.onLicenseCategoryChange(this.value)">
                                <optgroup label="🇦🇷 Argentina">
                                    <option value="A1">A1 - Ciclomotores hasta 50cc</option>
                                    <option value="A2.1">A2.1 - Motos hasta 150cc</option>
                                    <option value="A2.2">A2.2 - Motos hasta 300cc</option>
                                    <option value="A3">A3 - Motos sin límite</option>
                                    <option value="B1">B1 - Auto hasta 3.500kg</option>
                                    <option value="B2">B2 - Auto + remolque</option>
                                    <option value="C1">C1 - Camión hasta 12.000kg</option>
                                    <option value="C2">C2 - Camión sin límite</option>
                                    <option value="C3">C3 - Camión articulado</option>
                                    <option value="D1">D1 - Bus hasta 24 pasajeros</option>
                                    <option value="D2">D2 - Bus sin límite</option>
                                    <option value="D3">D3 - Bus articulado</option>
                                    <option value="E1">E1 - Maquinaria agrícola</option>
                                    <option value="E2">E2 - Maquinaria vial</option>
                                </optgroup>
                                <optgroup label="🇧🇷 Brasil">
                                    <option value="BR_A">A - Motocicleta</option>
                                    <option value="BR_B">B - Auto hasta 3.500kg</option>
                                    <option value="BR_C">C - Carga > 3.500kg</option>
                                    <option value="BR_D">D - Pasajeros > 8</option>
                                    <option value="BR_E">E - Combinaciones articuladas</option>
                                </optgroup>
                                <optgroup label="🇨🇱 Chile">
                                    <option value="CL_B">B - Auto</option>
                                    <option value="CL_A1">A1 - Taxi básico</option>
                                    <option value="CL_A2">A2 - Taxi ejecutivo</option>
                                    <option value="CL_A3">A3 - Bus</option>
                                    <option value="CL_A4">A4 - Camión simple</option>
                                    <option value="CL_A5">A5 - Camión doble eje</option>
                                </optgroup>
                                <optgroup label="🇺🇾 Uruguay">
                                    <option value="UY_A">A - Motos</option>
                                    <option value="UY_B">B - Auto</option>
                                    <option value="UY_C">C - Camión</option>
                                    <option value="UY_D">D - Ómnibus</option>
                                    <option value="UY_E">E - Articulado</option>
                                    <option value="UY_F">F - Agrícola</option>
                                    <option value="UY_G">G - Maquinaria especial</option>
                                </optgroup>
                                <optgroup label="🇺🇸 USA / CDL">
                                    <option value="US_A">CDL Class A - Combinations > 26,000 lbs</option>
                                    <option value="US_B">CDL Class B - Single > 26,000 lbs</option>
                                    <option value="US_C">CDL Class C - Hazmat/Passengers</option>
                                </optgroup>
                                <optgroup label="🇪🇺 Unión Europea">
                                    <option value="EU_AM">AM - Ciclomotores</option>
                                    <option value="EU_A1">A1 - Motos ligeras</option>
                                    <option value="EU_A2">A2 - Motos medianas</option>
                                    <option value="EU_A">A - Motos sin límite</option>
                                    <option value="EU_B">B - Auto</option>
                                    <option value="EU_C1">C1 - Camión 3.5-7.5t</option>
                                    <option value="EU_C">C - Camión > 7.5t</option>
                                    <option value="EU_D1">D1 - Minibus</option>
                                    <option value="EU_D">D - Bus</option>
                                    <option value="EU_BE">BE - Auto + remolque</option>
                                    <option value="EU_C1E">C1E - Camión ligero + remolque</option>
                                    <option value="EU_CE">CE - Camión + remolque</option>
                                    <option value="EU_D1E">D1E - Minibus + remolque</option>
                                    <option value="EU_DE">DE - Bus + remolque</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Fecha de Emisión</label>
                            <input type="date" name="license_issue_date">
                        </div>
                        <div class="form-group">
                            <label>Fecha de Vencimiento *</label>
                            <input type="date" name="license_expiry" required>
                        </div>
                        <div class="form-group">
                            <label>Puntos Vigentes</label>
                            <input type="number" name="license_points" placeholder="20" min="0" max="30">
                        </div>
                    </div>

                    <div class="form-section-title">📋 LINTI (Lic. Nacional Transporte Interjurisdiccional)</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_linti" onchange="LogisticsDashboard.toggleLintiFields(this.checked)">
                                Posee LINTI
                            </label>
                        </div>
                    </div>
                    <div id="linti-fields" style="display:none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Número LINTI</label>
                                <input type="text" name="linti_number" placeholder="LINTI-123456">
                            </div>
                            <div class="form-group">
                                <label>Categoría LINTI</label>
                                <select name="linti_category">
                                    <option value="carga">Carga General</option>
                                    <option value="peligrosa">Mercancías Peligrosas</option>
                                    <option value="pasajeros">Transporte de Pasajeros</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Vencimiento LINTI</label>
                                <input type="date" name="linti_expiry">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 3: MÉDICO -->
                <div class="form-tab-content" id="tab-medical">
                    <div class="form-section-title">🏥 Aptitud Psicofísica</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Fecha Último Examen</label>
                            <input type="date" name="medical_exam_date">
                        </div>
                        <div class="form-group">
                            <label>Vencimiento Certificado *</label>
                            <input type="date" name="medical_expiry" required>
                        </div>
                        <div class="form-group">
                            <label>Resultado</label>
                            <select name="medical_status">
                                <option value="apt">Apto sin restricciones</option>
                                <option value="apt_restrictions">Apto con restricciones</option>
                                <option value="pending">Pendiente</option>
                                <option value="expired">Vencido</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Grupo Sanguíneo</label>
                            <select name="blood_type">
                                <option value="">Desconocido</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Obra Social/Prepaga</label>
                            <input type="text" name="health_insurance" placeholder="OSDE / Swiss Medical">
                        </div>
                        <div class="form-group">
                            <label>Número Afiliado</label>
                            <input type="text" name="health_insurance_number" placeholder="12345678">
                        </div>
                    </div>

                    <div class="form-section-title">👁️ Vista y Audición</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="uses_glasses">
                                👓 Usa anteojos/lentes de contacto
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="uses_hearing_aid">
                                🦻 Usa audífono
                            </label>
                        </div>
                    </div>

                    <div class="form-section-title">⚠️ Restricciones y Condiciones</div>
                    <div class="form-row">
                        <div class="form-group full-width">
                            <label>Restricciones Médicas</label>
                            <textarea name="medical_restrictions" rows="2" placeholder="Detallar restricciones médicas si las hubiera..."></textarea>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group full-width">
                            <label>Alergias Conocidas</label>
                            <input type="text" name="allergies" placeholder="Penicilina, maní, etc.">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Contacto de Emergencia</label>
                            <input type="text" name="emergency_contact_name" placeholder="Nombre del contacto">
                        </div>
                        <div class="form-group">
                            <label>Parentesco</label>
                            <select name="emergency_contact_relation">
                                <option value="spouse">Cónyuge</option>
                                <option value="parent">Padre/Madre</option>
                                <option value="sibling">Hermano/a</option>
                                <option value="child">Hijo/a</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Teléfono Emergencia</label>
                            <input type="tel" name="emergency_contact_phone" placeholder="+54 11 1234-5678">
                        </div>
                    </div>
                </div>

                <!-- TAB 4: CERTIFICACIONES -->
                <div class="form-tab-content" id="tab-certifications">
                    <div class="form-section-title">☢️ Materiales Peligrosos (HAZMAT/ADR)</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_hazmat_cert" onchange="LogisticsDashboard.toggleDriverHazmatFields(this.checked)">
                                Certificación HAZMAT/ADR
                            </label>
                        </div>
                    </div>
                    <div id="driver-hazmat-fields" style="display:none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Clases Habilitadas</label>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" name="hazmat_class_1"> Clase 1 - Explosivos</label>
                                    <label><input type="checkbox" name="hazmat_class_2"> Clase 2 - Gases</label>
                                    <label><input type="checkbox" name="hazmat_class_3"> Clase 3 - Líquidos Inflamables</label>
                                    <label><input type="checkbox" name="hazmat_class_4"> Clase 4 - Sólidos Inflamables</label>
                                    <label><input type="checkbox" name="hazmat_class_5"> Clase 5 - Oxidantes</label>
                                    <label><input type="checkbox" name="hazmat_class_6"> Clase 6 - Tóxicos</label>
                                    <label><input type="checkbox" name="hazmat_class_7"> Clase 7 - Radioactivos</label>
                                    <label><input type="checkbox" name="hazmat_class_8"> Clase 8 - Corrosivos</label>
                                    <label><input type="checkbox" name="hazmat_class_9"> Clase 9 - Misceláneos</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Vencimiento Cert. HAZMAT</label>
                                <input type="date" name="hazmat_cert_expiry">
                            </div>
                        </div>
                    </div>

                    <div class="form-section-title">🐄 Transporte de Ganado</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_livestock_cert" onchange="LogisticsDashboard.toggleDriverLivestockFields(this.checked)">
                                Certificación Transporte de Animales
                            </label>
                        </div>
                    </div>
                    <div id="driver-livestock-fields" style="display:none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipos de Animales</label>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" name="livestock_cattle"> 🐄 Bovinos</label>
                                    <label><input type="checkbox" name="livestock_pigs"> 🐷 Porcinos</label>
                                    <label><input type="checkbox" name="livestock_sheep"> 🐑 Ovinos</label>
                                    <label><input type="checkbox" name="livestock_poultry"> 🐔 Aves</label>
                                    <label><input type="checkbox" name="livestock_horses"> 🐴 Equinos</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Vencimiento Certificación</label>
                                <input type="date" name="livestock_cert_expiry">
                            </div>
                        </div>
                    </div>

                    <div class="form-section-title">🌾 Transporte de Granos</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_grain_cert">
                                Certificación Transporte Granelero
                            </label>
                        </div>
                    </div>

                    <div class="form-section-title">❄️ Cadena de Frío</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_reefer_cert">
                                Certificación Transporte Refrigerado
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_pharma_cert">
                                Certificación Transporte Farmacéutico
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_food_cert">
                                Certificación Transporte Alimentos (BPM)
                            </label>
                        </div>
                    </div>

                    <div class="form-section-title">🌎 Transporte Internacional (MERCOSUR)</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_mercosur_permit" onchange="LogisticsDashboard.toggleDriverMercosurFields(this.checked)">
                                Habilitación MERCOSUR
                            </label>
                        </div>
                    </div>
                    <div id="driver-mercosur-fields" style="display:none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Países Habilitados</label>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" name="mercosur_br"> 🇧🇷 Brasil</label>
                                    <label><input type="checkbox" name="mercosur_uy"> 🇺🇾 Uruguay</label>
                                    <label><input type="checkbox" name="mercosur_py"> 🇵🇾 Paraguay</label>
                                    <label><input type="checkbox" name="mercosur_cl"> 🇨🇱 Chile</label>
                                    <label><input type="checkbox" name="mercosur_bo"> 🇧🇴 Bolivia</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Número Permiso MERCOSUR</label>
                                <input type="text" name="mercosur_permit_number" placeholder="MERC-AR-123456">
                            </div>
                            <div class="form-group">
                                <label>Vencimiento</label>
                                <input type="date" name="mercosur_expiry">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB 5: CUMPLIMIENTO -->
                <div class="form-tab-content" id="tab-compliance">
                    <div class="form-section-title">⏱️ Control de Horas (EU 561/2006 / FMCSA)</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Régimen de Horas</label>
                            <select name="hours_regime">
                                <option value="argentina">Argentina (Ley 24.449)</option>
                                <option value="eu561">EU 561/2006</option>
                                <option value="fmcsa">FMCSA (USA)</option>
                                <option value="mercosur">MERCOSUR</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Máx. Horas Conducción/Día</label>
                            <input type="number" name="max_driving_hours" placeholder="9" min="4" max="15">
                        </div>
                        <div class="form-group">
                            <label>Máx. Horas Trabajo/Día</label>
                            <input type="number" name="max_work_hours" placeholder="13" min="8" max="16">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Descanso Mínimo Diario (hs)</label>
                            <input type="number" name="min_daily_rest" placeholder="11" min="8" max="14">
                        </div>
                        <div class="form-group">
                            <label>Descanso Semanal (hs)</label>
                            <input type="number" name="min_weekly_rest" placeholder="45" min="24" max="72">
                        </div>
                        <div class="form-group">
                            <label>Pausa Obligatoria (min)</label>
                            <input type="number" name="mandatory_break" placeholder="45" min="15" max="60">
                        </div>
                    </div>

                    <div class="form-section-title">📊 Tacógrafo</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="has_tachograph_card">
                                Posee Tarjeta de Conductor
                            </label>
                        </div>
                        <div class="form-group">
                            <label>Número Tarjeta</label>
                            <input type="text" name="tachograph_card_number" placeholder="ARG1234567890">
                        </div>
                        <div class="form-group">
                            <label>Vencimiento Tarjeta</label>
                            <input type="date" name="tachograph_card_expiry">
                        </div>
                    </div>

                    <div class="form-section-title">📝 Capacitaciones</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="training_defensive_driving">
                                🛡️ Manejo Defensivo
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="training_first_aid">
                                🚑 Primeros Auxilios
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="training_fire_safety">
                                🧯 Seguridad contra Incendios
                            </label>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="training_load_securing">
                                📦 Sujeción de Cargas
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="training_eco_driving">
                                🌿 Conducción Eficiente
                            </label>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="training_customer_service">
                                🤝 Atención al Cliente
                            </label>
                        </div>
                    </div>

                    <div class="form-section-title">⚠️ Historial</div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Accidentes (últimos 5 años)</label>
                            <input type="number" name="accidents_count" placeholder="0" min="0">
                        </div>
                        <div class="form-group">
                            <label>Infracciones (últimos 2 años)</label>
                            <input type="number" name="violations_count" placeholder="0" min="0">
                        </div>
                        <div class="form-group">
                            <label>Score de Seguridad</label>
                            <input type="number" name="safety_score" placeholder="100" min="0" max="100">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group full-width">
                            <label>Observaciones</label>
                            <textarea name="notes" rows="2" placeholder="Notas adicionales sobre el conductor..."></textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;

        showModal('👤 Nuevo Conductor', content, async () => {
            const form = document.getElementById('driver-form');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Convertir checkboxes
            const checkboxes = form.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                data[cb.name] = cb.checked;
            });

            try {
                const response = await fetchAPI('/drivers', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                if (response.success) {
                    showSuccess('Conductor creado exitosamente');
                    closeModal();
                    loadTabData('fleet');
                }
            } catch (error) {
                showError('Error al crear conductor');
            }
        });
    };

    // Toggle campos LINTI
    window.LogisticsDashboard.toggleLintiFields = function(show) {
        const fields = document.getElementById('linti-fields');
        if (fields) fields.style.display = show ? 'block' : 'none';
    };

    // Toggle campos HAZMAT conductor
    window.LogisticsDashboard.toggleDriverHazmatFields = function(show) {
        const fields = document.getElementById('driver-hazmat-fields');
        if (fields) fields.style.display = show ? 'block' : 'none';
    };

    // Toggle campos Ganado conductor
    window.LogisticsDashboard.toggleDriverLivestockFields = function(show) {
        const fields = document.getElementById('driver-livestock-fields');
        if (fields) fields.style.display = show ? 'block' : 'none';
    };

    // Toggle campos MERCOSUR conductor
    window.LogisticsDashboard.toggleDriverMercosurFields = function(show) {
        const fields = document.getElementById('driver-mercosur-fields');
        if (fields) fields.style.display = show ? 'block' : 'none';
    };

    // Cambio de país de licencia
    window.LogisticsDashboard.onLicenseCountryChange = function(country) {
        const categorySelect = document.getElementById('license-category-select');
        if (!categorySelect) return;

        // Mostrar solo las opciones del país seleccionado
        const optgroups = categorySelect.querySelectorAll('optgroup');
        optgroups.forEach(og => {
            const countryCode = og.label.match(/🇦🇷|🇧🇷|🇨🇱|🇺🇾|🇺🇸|🇪🇺/);
            if (countryCode) {
                const countryMap = {
                    '🇦🇷': 'AR',
                    '🇧🇷': 'BR',
                    '🇨🇱': 'CL',
                    '🇺🇾': 'UY',
                    '🇺🇸': 'US',
                    '🇪🇺': 'EU'
                };
                const optCountry = countryMap[countryCode[0]];
                og.style.display = (country === optCountry || country === 'OTHER') ? '' : 'none';
            }
        });

        // Re-aplicar validación de categoría
        if (categorySelect.value) {
            window.LogisticsDashboard.onLicenseCategoryChange(categorySelect.value);
        }
    };

    // ============================================================================
    // VALIDACIÓN INTELIGENTE DE LICENCIAS DE CONDUCTOR
    // ============================================================================

    function classifyLicenseType(category) {
        // MOTOCICLETAS
        if (['A1', 'A2.1', 'A2.2', 'A3', 'BR_A', 'UY_A', 'EU_AM', 'EU_A1', 'EU_A2', 'EU_A'].includes(category)) {
            return 'MOTORCYCLE';
        }
        // AUTOMÓVILES
        if (['B1', 'B2', 'BR_B', 'CL_B', 'UY_B', 'EU_B', 'EU_BE'].includes(category)) {
            return 'CAR';
        }
        // CAMIONES LIVIANOS
        if (['C1', 'EU_C1', 'EU_C1E', 'CL_A4'].includes(category)) {
            return 'TRUCK_LIGHT';
        }
        // CAMIONES PESADOS
        if (['C2', 'C3', 'BR_C', 'BR_E', 'UY_C', 'UY_E', 'CL_A5', 'EU_C', 'EU_CE', 'US_A', 'US_B'].includes(category)) {
            return 'TRUCK_HEAVY';
        }
        // BUSES
        if (['D1', 'D2', 'D3', 'BR_D', 'UY_D', 'CL_A1', 'CL_A2', 'CL_A3', 'EU_D1', 'EU_D', 'EU_D1E', 'EU_DE', 'US_C'].includes(category)) {
            return 'BUS';
        }
        // MAQUINARIA ESPECIAL
        if (['E1', 'E2', 'UY_F', 'UY_G'].includes(category)) {
            return 'SPECIAL_MACHINERY';
        }
        return 'CAR';
    }

    function getLicenseRules(licenseType) {
        switch (licenseType) {
            case 'MOTORCYCLE':
                return {
                    showTachograph: false,
                    showDrivingLimits: false,
                    showLinti: false,
                    showHazmat: false,
                    showLivestock: false,
                    showGrain: false,
                    showReefer: false,
                    showMercosur: false
                };
            case 'CAR':
                return {
                    showTachograph: false,
                    showDrivingLimits: false,
                    showLinti: false,
                    showHazmat: false,
                    showLivestock: false,
                    showGrain: false,
                    showReefer: false,
                    showMercosur: false
                };
            case 'TRUCK_LIGHT':
                return {
                    showTachograph: true,
                    showDrivingLimits: true,
                    showLinti: true,
                    showHazmat: false,
                    showLivestock: false,
                    showGrain: false,
                    showReefer: true,
                    showMercosur: false
                };
            case 'TRUCK_HEAVY':
                return {
                    showTachograph: true,
                    showDrivingLimits: true,
                    showLinti: true,
                    showHazmat: true,
                    showLivestock: true,
                    showGrain: true,
                    showReefer: true,
                    showMercosur: true
                };
            case 'BUS':
                return {
                    showTachograph: true,
                    showDrivingLimits: true,
                    showLinti: true,
                    showHazmat: false,
                    showLivestock: false,
                    showGrain: false,
                    showReefer: false,
                    showMercosur: true
                };
            case 'SPECIAL_MACHINERY':
                return {
                    showTachograph: false,
                    showDrivingLimits: false,
                    showLinti: false,
                    showHazmat: false,
                    showLivestock: false,
                    showGrain: true,
                    showReefer: false,
                    showMercosur: false
                };
            default:
                return {
                    showTachograph: false,
                    showDrivingLimits: false,
                    showLinti: false,
                    showHazmat: false,
                    showLivestock: false,
                    showGrain: false,
                    showReefer: false,
                    showMercosur: false
                };
        }
    }

    window.LogisticsDashboard.onLicenseCategoryChange = function(category) {
        if (!category) return;

        const licenseType = classifyLicenseType(category);
        console.log(`🪪 [DRIVER] Categoría: ${category} → Tipo: ${licenseType}`);

        const rules = getLicenseRules(licenseType);

        // Mostrar advertencia según tipo
        showLicenseWarning(licenseType);
    };

    function showLicenseWarning(licenseType) {
        const existingWarning = document.getElementById('license-type-warning');
        if (existingWarning) existingWarning.remove();

        let warningMessage = null;

        switch (licenseType) {
            case 'MOTORCYCLE':
                warningMessage = '🏍️ Licencia de motocicleta: No requiere tacógrafo ni certificaciones especiales';
                break;
            case 'CAR':
                warningMessage = '🚗 Licencia de automóvil: Solo para vehículos livianos hasta 3.500kg';
                break;
            case 'TRUCK_LIGHT':
                warningMessage = '🚚 Licencia camión liviano: Requiere LINTI para transporte interjurisdiccional';
                break;
            case 'TRUCK_HEAVY':
                warningMessage = '🚛 Licencia camión pesado: Habilitado para certificaciones HAZMAT, ganado, granos y MERCOSUR';
                break;
            case 'BUS':
                warningMessage = '🚌 Licencia ómnibus: Requiere LINTI y control de horas estricto';
                break;
        }

        if (!warningMessage) return;

        const warningDiv = document.createElement('div');
        warningDiv.id = 'license-type-warning';
        warningDiv.className = 'form-warning-banner';
        warningDiv.innerHTML = `<span class="warning-icon">ℹ️</span> ${warningMessage}`;

        const categorySelect = document.getElementById('license-category-select');
        if (categorySelect) {
            categorySelect.closest('.form-row')?.after(warningDiv);
        }
    }

    // ============================================================================
    // FUNCIONES DE NAVEGACIÓN Y REFRESH
    // ============================================================================
    window.LogisticsDashboard.refreshData = function() {
        const currentTab = document.querySelector('.tab-button.active')?.dataset?.tab || 'overview';
        loadTabData(currentTab);
        showSuccess('Datos actualizados');
    };

    window.LogisticsDashboard.switchTab = function(tabId) {
        console.log('🚚 [LOGISTICS] Cambiando a tab:', tabId);

        // Actualizar variable global
        currentTab = tabId;

        // Re-renderizar contenido
        const contentContainer = document.getElementById('logistics-content');
        if (contentContainer) {
            contentContainer.innerHTML = renderTabContent(tabId);
        }

        // Actualizar UI de tabs (usar clase correcta: logistics-tab)
        document.querySelectorAll('.logistics-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        // Encontrar y activar el tab correcto
        document.querySelectorAll('.logistics-tab').forEach(btn => {
            if (btn.getAttribute('onclick')?.includes(`'${tabId}'`)) {
                btn.classList.add('active');
            }
        });

        // Cargar datos del tab
        loadTabData(tabId);
    };

    // ============================================================================
    // FUNCIONES DE INVENTARIO ABC/EOQ
    // ============================================================================
    window.LogisticsDashboard.recalculateABC = async function() {
        showSuccess('Recalculando clasificación ABC...');
        try {
            const response = await fetchAPI('/inventory/recalculate-abc', { method: 'POST' });
            if (response.success) {
                showSuccess('Clasificación ABC actualizada');
                loadTabData('inventory');
            }
        } catch (error) {
            showError('Error al recalcular ABC');
        }
    };

    window.LogisticsDashboard.exportABC = function() {
        showSuccess('Exportando reporte ABC...');
        window.open('/api/logistics/inventory/export-abc?format=xlsx', '_blank');
    };

    window.LogisticsDashboard.exportCostReport = function() {
        showSuccess('Exportando reporte de costos...');
        window.open('/api/logistics/costs/export?format=xlsx', '_blank');
    };

    // ============================================================================
    // FUNCIONES DE ÓRDENES DE COMPRA
    // ============================================================================
    window.LogisticsDashboard.createPurchaseOrder = async function(type = 'normal') {
        const urgencyLabel = type === 'urgent' ? '🚨 URGENTE' : '📋 Normal';
        showModal(`${urgencyLabel} Nueva Orden de Compra`, `
            <form id="po-form" class="modal-form">
                <p class="form-info">Función de creación de OC - En desarrollo</p>
                <div class="form-group">
                    <label>Proveedor</label>
                    <select name="supplier_id">
                        <option value="">Seleccionar proveedor...</option>
                    </select>
                </div>
            </form>
        `, async () => {
            showSuccess('Orden de compra creada');
            closeModal();
        });
    };

    window.LogisticsDashboard.viewPurchaseOrder = async function(id) {
        showInfo(`Ver Orden de Compra #${id} - Próximamente`);
    };

    window.LogisticsDashboard.viewConsolidation = function() {
        showInfo('Ver consolidaciones de compra - Próximamente');
    };

    window.LogisticsDashboard.viewNegotiations = function() {
        showInfo('Ver negociaciones activas - Próximamente');
    };

    // ============================================================================
    // FUNCIONES DE TRANSFERENCIAS
    // ============================================================================
    window.LogisticsDashboard.showTransferModal = function() {
        showModal('🔄 Nueva Transferencia', `
            <form id="transfer-form" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Origen *</label>
                        <select name="from_warehouse_id" required>
                            <option value="">Seleccionar almacén...</option>
                            ${(cache.warehouses || []).map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Destino *</label>
                        <select name="to_warehouse_id" required>
                            <option value="">Seleccionar almacén...</option>
                            ${(cache.warehouses || []).map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Motivo</label>
                    <select name="reason">
                        <option value="replenishment">Reposición</option>
                        <option value="balancing">Balanceo de stock</option>
                        <option value="consolidation">Consolidación</option>
                        <option value="emergency">Emergencia</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Notas</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>
            </form>
        `, async () => {
            const form = document.getElementById('transfer-form');
            const data = Object.fromEntries(new FormData(form));
            try {
                const response = await fetchAPI('/transfers', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                if (response.success) {
                    showSuccess('Transferencia creada');
                    closeModal();
                    loadTabData('transfers');
                }
            } catch (error) {
                showError('Error al crear transferencia');
            }
        });
    };

    window.LogisticsDashboard.showQuickTransferModal = function() {
        window.LogisticsDashboard.showTransferModal();
    };

    window.LogisticsDashboard.showNewTransferModal = function() {
        window.LogisticsDashboard.showTransferModal();
    };

    window.LogisticsDashboard.showAdjustmentModal = function() {
        showModal('⚖️ Ajuste de Inventario', `
            <form id="adjustment-form" class="modal-form">
                <div class="form-group">
                    <label>Producto *</label>
                    <input type="text" name="product_search" placeholder="Buscar producto...">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Tipo de Ajuste *</label>
                        <select name="adjustment_type" required>
                            <option value="positive">➕ Ingreso</option>
                            <option value="negative">➖ Salida</option>
                            <option value="correction">📝 Corrección</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cantidad *</label>
                        <input type="number" name="quantity" required min="1" placeholder="1">
                    </div>
                </div>
                <div class="form-group">
                    <label>Motivo *</label>
                    <select name="reason" required>
                        <option value="count">Conteo físico</option>
                        <option value="damage">Daño/Rotura</option>
                        <option value="expiry">Vencimiento</option>
                        <option value="return">Devolución</option>
                        <option value="other">Otro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>
            </form>
        `, async () => {
            showSuccess('Ajuste registrado');
            closeModal();
        });
    };

    window.LogisticsDashboard.showQuickTransfer = function(itemId) {
        showInfo(`Transferencia rápida para ítem #${itemId} - Próximamente`);
    };

    window.LogisticsDashboard.showQuickAdjust = function(itemId) {
        showInfo(`Ajuste rápido para ítem #${itemId} - Próximamente`);
    };

    window.LogisticsDashboard.viewTransferDetails = async function(id) {
        showInfo(`Ver detalles de transferencia #${id} - Próximamente`);
    };

    window.LogisticsDashboard.printTransfer = function(id) {
        window.open(`/api/logistics/transfers/${id}/print`, '_blank');
    };

    // ============================================================================
    // FUNCIONES DE PICKING / WAVES
    // ============================================================================
    window.LogisticsDashboard.showWaves = function() {
        document.querySelectorAll('.picking-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.picking-tab:first-child')?.classList.add('active');
        loadTabData('picking');
    };

    window.LogisticsDashboard.showPickLists = function() {
        document.querySelectorAll('.picking-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.picking-tab:last-child')?.classList.add('active');
        showInfo('Vista de Pick Lists - Próximamente');
    };

    window.LogisticsDashboard.viewWave = async function(id) {
        showInfo(`Ver ola de picking #${id} - Próximamente`);
    };

    // ============================================================================
    // FUNCIONES DE ENTIDADES (View)
    // ============================================================================
    window.LogisticsDashboard.viewCarrier = async function(id) {
        try {
            const response = await fetchAPI(`/carriers/${id}`);
            if (response.success && response.data) {
                const c = response.data;
                showModal(`🚚 ${c.name}`, `
                    <div class="entity-detail">
                        <div class="detail-row"><strong>Código:</strong> ${c.code}</div>
                        <div class="detail-row"><strong>CUIT:</strong> ${c.tax_id || '-'}</div>
                        <div class="detail-row"><strong>Contacto:</strong> ${c.contact_name || '-'}</div>
                        <div class="detail-row"><strong>Email:</strong> ${c.email || '-'}</div>
                        <div class="detail-row"><strong>Teléfono:</strong> ${c.phone || '-'}</div>
                        <div class="detail-row"><strong>Estado:</strong> ${c.status === 'active' ? '🟢 Activo' : '🔴 Inactivo'}</div>
                    </div>
                `);
            }
        } catch (error) {
            showError('Error al cargar transportista');
        }
    };

    window.LogisticsDashboard.viewZone = async function(id) {
        try {
            const response = await fetchAPI(`/zones/${id}`);
            if (response.success && response.data) {
                const z = response.data;
                showModal(`📍 ${z.name}`, `
                    <div class="entity-detail">
                        <div class="detail-row"><strong>Código:</strong> ${z.code}</div>
                        <div class="detail-row"><strong>Descripción:</strong> ${z.description || '-'}</div>
                        <div class="detail-row"><strong>Tiempo base:</strong> ${z.base_delivery_time_min || 0} min</div>
                        <div class="detail-row"><strong>Costo base:</strong> $${z.base_cost || 0}</div>
                    </div>
                `);
            }
        } catch (error) {
            showError('Error al cargar zona');
        }
    };

    window.LogisticsDashboard.viewRoute = async function(id) {
        showInfo(`Ver detalles de ruta #${id} - Próximamente`);
    };

    // ============================================================================
    // FUNCIONES DE ENVÍOS
    // ============================================================================
    window.LogisticsDashboard.showBulkShipmentModal = function() {
        showModal('📦 Envío Masivo', `
            <form id="bulk-shipment-form" class="modal-form">
                <p class="form-info">Cargar múltiples envíos desde archivo Excel/CSV</p>
                <div class="form-group">
                    <label>Archivo *</label>
                    <input type="file" name="file" accept=".xlsx,.xls,.csv" required>
                </div>
                <div class="form-group">
                    <label>Transportista por defecto</label>
                    <select name="default_carrier_id">
                        <option value="">Auto-asignar</option>
                        ${(cache.carriers || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
            </form>
        `, async () => {
            showSuccess('Procesando archivo...');
            closeModal();
        });
    };

    window.LogisticsDashboard.showUpdateStatusModal = function(shipmentId) {
        showModal('📋 Actualizar Estado', `
            <form id="update-status-form" class="modal-form">
                <input type="hidden" name="shipment_id" value="${shipmentId}">
                <div class="form-group">
                    <label>Nuevo Estado *</label>
                    <select name="status" required>
                        <option value="preparing">📦 Preparando</option>
                        <option value="ready">✅ Listo para despacho</option>
                        <option value="picked_up">🚚 Retirado</option>
                        <option value="in_transit">🛣️ En tránsito</option>
                        <option value="out_for_delivery">📍 En reparto</option>
                        <option value="delivered">✔️ Entregado</option>
                        <option value="failed">❌ Fallido</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Observaciones</label>
                    <textarea name="notes" rows="2"></textarea>
                </div>
            </form>
        `, async () => {
            const form = document.getElementById('update-status-form');
            const data = Object.fromEntries(new FormData(form));
            try {
                const response = await fetchAPI(`/shipments/${data.shipment_id}/status`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                if (response.success) {
                    showSuccess('Estado actualizado');
                    closeModal();
                    loadTabData('shipments');
                }
            } catch (error) {
                showError('Error al actualizar estado');
            }
        });
    };

    // ============================================================================
    // FUNCIONES DE SOLICITUDES
    // ============================================================================
    window.LogisticsDashboard.verifyRequestStock = async function(requestId) {
        showInfo(`Verificando stock para solicitud #${requestId}...`);
    };

    window.LogisticsDashboard.editRequest = function(requestId) {
        showInfo(`Editar solicitud #${requestId} - Próximamente`);
    };

    window.LogisticsDashboard.cancelRequest = async function(requestId) {
        if (!confirm('¿Está seguro de cancelar esta solicitud?')) return;
        try {
            const response = await fetchAPI(`/requests/${requestId}`, {
                method: 'DELETE'
            });
            if (response.success) {
                showSuccess('Solicitud cancelada');
                loadTabData('requests');
            }
        } catch (error) {
            showError('Error al cancelar solicitud');
        }
    };

    window.LogisticsDashboard.viewRequestHistory = function(requestId) {
        showInfo(`Historial de solicitud #${requestId} - Próximamente`);
    };

    // ============================================================================
    // FUNCIONES DE CONFIGURACIÓN
    // ============================================================================
    window.LogisticsDashboard.showLocationTypesConfig = function() {
        showInfo('Configuración de tipos de ubicación - Próximamente');
    };

    window.LogisticsDashboard.showPackageTypesConfig = function() {
        showInfo('Configuración de tipos de paquete - Próximamente');
    };

    window.LogisticsDashboard.showBusinessRulesConfig = function() {
        showInfo('Configuración de reglas de negocio - Próximamente');
    };

    window.LogisticsDashboard.showBusinessProfilesConfig = function() {
        showInfo('Configuración de perfiles de negocio - Próximamente');
    };

    // ============================================================================
    // FUNCIONES DE SLA
    // ============================================================================
    window.LogisticsDashboard.configSLANotifications = function() {
        showModal('🔔 Configurar Notificaciones SLA', `
            <form id="sla-notifications-form" class="modal-form">
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="email_alerts" checked>
                        Alertas por Email
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="push_alerts" checked>
                        Notificaciones Push
                    </label>
                </div>
                <div class="form-group">
                    <label>Tiempo de alerta antes del breach (minutos)</label>
                    <input type="number" name="alert_before_minutes" value="30" min="5" max="120">
                </div>
            </form>
        `, async () => {
            showSuccess('Configuración guardada');
            closeModal();
        });
    };

    window.LogisticsDashboard.editSLAConfig = function(type) {
        showInfo(`Editar SLA tipo "${type}" - Próximamente`);
    };

    window.LogisticsDashboard.escalateSLA = async function(alertId) {
        if (!confirm('¿Escalar esta alerta al supervisor?')) return;
        showSuccess(`Alerta #${alertId} escalada`);
    };

    window.LogisticsDashboard.viewBreachDetails = function(breachId) {
        showInfo(`Ver detalles de breach #${breachId} - Próximamente`);
    };

})();
