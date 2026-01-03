/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏭 WAREHOUSE MANAGEMENT SYSTEM (WMS) - DARK THEME
 * Sistema de Gestión de Almacenes y Depósitos
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Módulo principal para gestión multi-tenant de:
 * - Sucursales y Depósitos (ilimitados)
 * - Padrón de Artículos (Tab Principal)
 * - Categorías (Rubros, SubRubros, Familias)
 * - Listas de Precios con sistema de espejos
 * - Promociones y Bonificaciones
 * - Stock y Movimientos
 * - Ubicaciones y Planogramas
 *
 * @version 2.0.0
 * @author Claude Code
 * @theme Dark Professional
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ESTILOS CSS - DARK THEME
// ═══════════════════════════════════════════════════════════════════════════════
const WMS_STYLES = `
<style id="wms-dark-theme-styles">
/* ═══════════════════════════════════════════════════════════════════════════════
   VARIABLES CSS - DARK THEME PALETTE
   ═══════════════════════════════════════════════════════════════════════════════ */
:root {
    --wms-bg-primary: #0f0f0f;
    --wms-bg-secondary: #1a1a1a;
    --wms-bg-tertiary: #242424;
    --wms-bg-card: #1e1e1e;
    --wms-bg-hover: #2a2a2a;
    --wms-bg-active: #333333;

    --wms-border-color: #333333;
    --wms-border-light: #444444;

    --wms-text-primary: #ffffff;
    --wms-text-secondary: #b0b0b0;
    --wms-text-muted: #808080;
    --wms-text-placeholder: #666666;

    --wms-accent-primary: #6366f1;
    --wms-accent-secondary: #8b5cf6;
    --wms-accent-hover: #7c7fff;

    --wms-success: #22c55e;
    --wms-warning: #f59e0b;
    --wms-danger: #ef4444;
    --wms-info: #3b82f6;

    --wms-gradient-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    --wms-gradient-success: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    --wms-gradient-warning: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    --wms-gradient-danger: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);

    --wms-shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
    --wms-shadow-md: 0 4px 6px rgba(0,0,0,0.4);
    --wms-shadow-lg: 0 10px 25px rgba(0,0,0,0.5);
    --wms-shadow-glow: 0 0 20px rgba(99, 102, 241, 0.3);

    --wms-radius-sm: 6px;
    --wms-radius-md: 10px;
    --wms-radius-lg: 16px;
    --wms-radius-xl: 20px;

    --wms-transition: all 0.2s ease;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CONTENEDOR PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-container {
    background: var(--wms-bg-primary);
    min-height: 100vh;
    color: var(--wms-text-primary);
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HEADER DEL MÓDULO
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-header {
    background: var(--wms-bg-secondary);
    border-bottom: 1px solid var(--wms-border-color);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.wms-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.wms-header-title h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    background: var(--wms-gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.wms-header-title .wms-icon {
    font-size: 1.8rem;
}

.wms-header-selectors {
    display: flex;
    gap: 16px;
    align-items: center;
}

.wms-selector-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.wms-selector-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: var(--wms-text-muted);
    letter-spacing: 0.5px;
}

.wms-selector {
    background: var(--wms-bg-tertiary);
    border: 1px solid var(--wms-border-color);
    border-radius: var(--wms-radius-sm);
    padding: 8px 32px 8px 12px;
    color: var(--wms-text-primary);
    font-size: 0.9rem;
    cursor: pointer;
    min-width: 180px;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23808080' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    transition: var(--wms-transition);
}

.wms-selector:hover {
    border-color: var(--wms-accent-primary);
}

.wms-selector:focus {
    outline: none;
    border-color: var(--wms-accent-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SISTEMA DE TABS
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-tabs-container {
    background: var(--wms-bg-secondary);
    border-bottom: 1px solid var(--wms-border-color);
    padding: 0 24px;
}

.wms-tabs {
    display: flex;
    gap: 0;
    overflow-x: auto;
    scrollbar-width: none;
}

.wms-tabs::-webkit-scrollbar {
    display: none;
}

.wms-tab {
    padding: 14px 24px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--wms-text-secondary);
    border: none;
    background: transparent;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: var(--wms-transition);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 8px;
}

.wms-tab:hover {
    color: var(--wms-text-primary);
    background: var(--wms-bg-hover);
}

.wms-tab.active {
    color: var(--wms-accent-primary);
    border-bottom-color: var(--wms-accent-primary);
    background: var(--wms-bg-tertiary);
}

.wms-tab-icon {
    font-size: 1.1rem;
}

.wms-tab-badge {
    background: var(--wms-accent-primary);
    color: white;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 600;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOOLBAR DE ACCIONES
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-toolbar {
    background: var(--wms-bg-secondary);
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--wms-border-color);
}

.wms-toolbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.wms-toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.wms-search-box {
    position: relative;
    width: 320px;
}

.wms-search-input {
    width: 100%;
    background: var(--wms-bg-tertiary);
    border: 1px solid var(--wms-border-color);
    border-radius: var(--wms-radius-md);
    padding: 10px 16px 10px 42px;
    color: var(--wms-text-primary);
    font-size: 0.9rem;
    transition: var(--wms-transition);
}

.wms-search-input::placeholder {
    color: var(--wms-text-placeholder);
}

.wms-search-input:focus {
    outline: none;
    border-color: var(--wms-accent-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.wms-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--wms-text-muted);
    font-size: 1rem;
}

.wms-filter-btn {
    background: var(--wms-bg-tertiary);
    border: 1px solid var(--wms-border-color);
    border-radius: var(--wms-radius-sm);
    padding: 10px 16px;
    color: var(--wms-text-secondary);
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: var(--wms-transition);
}

.wms-filter-btn:hover {
    border-color: var(--wms-accent-primary);
    color: var(--wms-text-primary);
}

.wms-filter-btn.active {
    background: var(--wms-accent-primary);
    border-color: var(--wms-accent-primary);
    color: white;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BOTONES
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 20px;
    font-size: 0.9rem;
    font-weight: 600;
    border: none;
    border-radius: var(--wms-radius-sm);
    cursor: pointer;
    transition: var(--wms-transition);
    white-space: nowrap;
}

.wms-btn-primary {
    background: var(--wms-gradient-primary);
    color: white;
    box-shadow: var(--wms-shadow-md);
}

.wms-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: var(--wms-shadow-lg), var(--wms-shadow-glow);
}

.wms-btn-secondary {
    background: var(--wms-bg-tertiary);
    border: 1px solid var(--wms-border-color);
    color: var(--wms-text-primary);
}

.wms-btn-secondary:hover {
    background: var(--wms-bg-hover);
    border-color: var(--wms-accent-primary);
}

.wms-btn-success {
    background: var(--wms-gradient-success);
    color: white;
}

.wms-btn-danger {
    background: var(--wms-gradient-danger);
    color: white;
}

.wms-btn-icon {
    padding: 10px;
    border-radius: var(--wms-radius-sm);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ÁREA DE CONTENIDO
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-content {
    padding: 24px;
    background: var(--wms-bg-primary);
    min-height: calc(100vh - 200px);
}

.wms-tab-content {
    display: none;
}

.wms-tab-content.active {
    display: block;
    animation: wms-fadeIn 0.3s ease;
}

@keyframes wms-fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TARJETAS DE ESTADÍSTICAS
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.wms-stat-card {
    background: var(--wms-bg-card);
    border: 1px solid var(--wms-border-color);
    border-radius: var(--wms-radius-md);
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: var(--wms-transition);
}

.wms-stat-card:hover {
    border-color: var(--wms-accent-primary);
    box-shadow: var(--wms-shadow-md);
}

.wms-stat-icon {
    width: 50px;
    height: 50px;
    border-radius: var(--wms-radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
}

.wms-stat-icon.products { background: rgba(99, 102, 241, 0.15); color: var(--wms-accent-primary); }
.wms-stat-icon.stock { background: rgba(34, 197, 94, 0.15); color: var(--wms-success); }
.wms-stat-icon.alerts { background: rgba(239, 68, 68, 0.15); color: var(--wms-danger); }
.wms-stat-icon.value { background: rgba(245, 158, 11, 0.15); color: var(--wms-warning); }

.wms-stat-info h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 4px 0;
}

.wms-stat-info p {
    font-size: 0.8rem;
    color: var(--wms-text-muted);
    margin: 0;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TABLA DE DATOS
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-table-container {
    background: var(--wms-bg-card);
    border: 1px solid var(--wms-border-color);
    border-radius: var(--wms-radius-lg);
    overflow: hidden;
}

.wms-table-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--wms-border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.wms-table-title {
    font-size: 1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
}

.wms-table {
    width: 100%;
    border-collapse: collapse;
}

.wms-table th {
    background: var(--wms-bg-tertiary);
    padding: 14px 16px;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--wms-text-muted);
    border-bottom: 1px solid var(--wms-border-color);
}

.wms-table th.sortable {
    cursor: pointer;
    user-select: none;
}

.wms-table th.sortable:hover {
    color: var(--wms-text-primary);
}

.wms-table td {
    padding: 14px 16px;
    border-bottom: 1px solid var(--wms-border-color);
    font-size: 0.9rem;
    vertical-align: middle;
}

.wms-table tr:last-child td {
    border-bottom: none;
}

.wms-table tr:hover {
    background: var(--wms-bg-hover);
}

.wms-table-checkbox {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    accent-color: var(--wms-accent-primary);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PRODUCTO EN TABLA
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-product-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.wms-product-image {
    width: 44px;
    height: 44px;
    border-radius: var(--wms-radius-sm);
    background: var(--wms-bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--wms-text-muted);
    font-size: 1.2rem;
    overflow: hidden;
}

.wms-product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.wms-product-info h4 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 4px 0;
    color: var(--wms-text-primary);
}

.wms-product-info .wms-product-sku {
    font-size: 0.75rem;
    color: var(--wms-text-muted);
    font-family: 'Monaco', 'Consolas', monospace;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BADGES Y TAGS
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}

.wms-badge-success { background: rgba(34, 197, 94, 0.15); color: var(--wms-success); }
.wms-badge-warning { background: rgba(245, 158, 11, 0.15); color: var(--wms-warning); }
.wms-badge-danger { background: rgba(239, 68, 68, 0.15); color: var(--wms-danger); }
.wms-badge-info { background: rgba(59, 130, 246, 0.15); color: var(--wms-info); }
.wms-badge-neutral { background: var(--wms-bg-tertiary); color: var(--wms-text-secondary); }

.wms-stock-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
}

.wms-stock-bar {
    width: 60px;
    height: 6px;
    background: var(--wms-bg-tertiary);
    border-radius: 3px;
    overflow: hidden;
}

.wms-stock-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: var(--wms-transition);
}

.wms-stock-bar-fill.high { background: var(--wms-success); }
.wms-stock-bar-fill.medium { background: var(--wms-warning); }
.wms-stock-bar-fill.low { background: var(--wms-danger); }

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGINACIÓN
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-top: 1px solid var(--wms-border-color);
    background: var(--wms-bg-tertiary);
}

.wms-pagination-info {
    font-size: 0.85rem;
    color: var(--wms-text-muted);
}

.wms-pagination-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}

.wms-pagination-btn {
    background: var(--wms-bg-secondary);
    border: 1px solid var(--wms-border-color);
    border-radius: var(--wms-radius-sm);
    padding: 8px 12px;
    color: var(--wms-text-secondary);
    cursor: pointer;
    transition: var(--wms-transition);
    font-size: 0.85rem;
}

.wms-pagination-btn:hover:not(:disabled) {
    border-color: var(--wms-accent-primary);
    color: var(--wms-text-primary);
}

.wms-pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.wms-pagination-btn.active {
    background: var(--wms-accent-primary);
    border-color: var(--wms-accent-primary);
    color: white;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MODALES
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    visibility: hidden;
    transition: var(--wms-transition);
}

.wms-modal-overlay.active {
    opacity: 1;
    visibility: visible;
}

.wms-modal {
    background: var(--wms-bg-secondary);
    border: 1px solid var(--wms-border-color);
    border-radius: var(--wms-radius-xl);
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    overflow: hidden;
    transform: scale(0.9) translateY(20px);
    transition: var(--wms-transition);
    box-shadow: var(--wms-shadow-lg);
}

.wms-modal-overlay.active .wms-modal {
    transform: scale(1) translateY(0);
}

.wms-modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--wms-border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.wms-modal-title {
    font-size: 1.2rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 10px;
}

.wms-modal-close {
    background: var(--wms-bg-tertiary);
    border: 1px solid var(--wms-border-color);
    border-radius: var(--wms-radius-sm);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--wms-text-secondary);
    transition: var(--wms-transition);
}

.wms-modal-close:hover {
    background: var(--wms-danger);
    border-color: var(--wms-danger);
    color: white;
}

.wms-modal-body {
    padding: 24px;
    max-height: calc(90vh - 160px);
    overflow-y: auto;
}

.wms-modal-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--wms-border-color);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    background: var(--wms-bg-tertiary);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FORMULARIOS
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
}

.wms-form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.wms-form-group.full-width {
    grid-column: 1 / -1;
}

.wms-form-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--wms-text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
}

.wms-form-label .required {
    color: var(--wms-danger);
}

.wms-form-input,
.wms-form-select,
.wms-form-textarea {
    background: var(--wms-bg-tertiary);
    border: 1px solid var(--wms-border-color);
    border-radius: var(--wms-radius-sm);
    padding: 12px 16px;
    color: var(--wms-text-primary);
    font-size: 0.9rem;
    transition: var(--wms-transition);
}

.wms-form-input:focus,
.wms-form-select:focus,
.wms-form-textarea:focus {
    outline: none;
    border-color: var(--wms-accent-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.wms-form-input::placeholder {
    color: var(--wms-text-placeholder);
}

.wms-form-textarea {
    min-height: 100px;
    resize: vertical;
}

.wms-form-hint {
    font-size: 0.75rem;
    color: var(--wms-text-muted);
}

.wms-form-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--wms-border-color);
}

.wms-form-section-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--wms-accent-primary);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ALERTAS Y MENSAJES
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-alert {
    padding: 16px 20px;
    border-radius: var(--wms-radius-md);
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
}

.wms-alert-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
}

.wms-alert-content h4 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 4px 0;
}

.wms-alert-content p {
    font-size: 0.85rem;
    margin: 0;
    opacity: 0.9;
}

.wms-alert-success { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); color: var(--wms-success); }
.wms-alert-warning { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: var(--wms-warning); }
.wms-alert-danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--wms-danger); }
.wms-alert-info { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: var(--wms-info); }

/* ═══════════════════════════════════════════════════════════════════════════════
   LOADING SPINNER
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: var(--wms-text-muted);
}

.wms-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--wms-border-color);
    border-top-color: var(--wms-accent-primary);
    border-radius: 50%;
    animation: wms-spin 0.8s linear infinite;
}

@keyframes wms-spin {
    to { transform: rotate(360deg); }
}

.wms-loading-text {
    margin-top: 16px;
    font-size: 0.9rem;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════════════════════ */
.wms-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 40px;
    text-align: center;
}

.wms-empty-icon {
    font-size: 4rem;
    color: var(--wms-text-muted);
    margin-bottom: 20px;
}

.wms-empty h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0 0 10px 0;
}

.wms-empty p {
    color: var(--wms-text-muted);
    margin: 0 0 24px 0;
    max-width: 400px;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
    .wms-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .wms-header-selectors {
        width: 100%;
        flex-wrap: wrap;
    }

    .wms-selector {
        flex: 1;
        min-width: 140px;
    }

    .wms-toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .wms-toolbar-left,
    .wms-toolbar-right {
        width: 100%;
    }

    .wms-search-box {
        width: 100%;
    }

    .wms-tabs {
        gap: 0;
    }

    .wms-tab {
        padding: 12px 16px;
        font-size: 0.8rem;
    }

    .wms-content {
        padding: 16px;
    }

    .wms-stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .wms-modal {
        width: 95%;
        max-height: 95vh;
    }

    .wms-form-grid {
        grid-template-columns: 1fr;
    }
}
</style>
`;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
const WarehouseManagement = {
    // Estado del módulo
    state: {
        companyId: null,
        currentBranch: null,
        currentWarehouse: null,
        branches: [],
        warehouses: [],
        products: [],
        categories: [],
        priceLists: [],
        promotions: [],
        brands: [],
        suppliers: [],
        currentTab: 'padron',
        filters: {
            search: '',
            category: null,
            brand: null,
            supplier: null,
            status: 'active',
            stockStatus: null
        },
        pagination: {
            page: 1,
            limit: 50,
            total: 0
        },
        selectedProducts: [],
        isLoading: false,
        stats: {
            totalProducts: 0,
            totalStock: 0,
            lowStockAlerts: 0,
            totalValue: 0
        }
    },

    // Definición de Tabs
    tabs: [
        { id: 'padron', label: 'Padrón Artículos', icon: '📦' },
        { id: 'categorias', label: 'Categorías', icon: '🏷️' },
        { id: 'precios', label: 'Listas de Precios', icon: '💰' },
        { id: 'promociones', label: 'Promociones', icon: '🎯' },
        { id: 'stock', label: 'Stock', icon: '📊' },
        { id: 'ubicaciones', label: 'Ubicaciones', icon: '📍' },
        { id: 'config', label: 'Configuración', icon: '⚙️' }
    ],

    // ═══════════════════════════════════════════════════════════════════════
    // INICIALIZACIÓN
    // ═══════════════════════════════════════════════════════════════════════
    async init(containerId = 'module-content') {
        console.log('🏭 [WMS] Inicializando módulo Warehouse Management - Dark Theme...');

        // Inyectar estilos
        if (!document.getElementById('wms-dark-theme-styles')) {
            document.head.insertAdjacentHTML('beforeend', WMS_STYLES);
        }

        // Buscar contenedor: primero el especificado, luego mainContent como fallback
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.log('[WMS] Contenedor', containerId, 'no encontrado, usando mainContent');
            this.container = document.getElementById('mainContent');
        }

        if (!this.container) {
            console.error('[WMS] No se encontró ningún contenedor válido');
            return;
        }

        // Limpiar contenedor
        this.container.innerHTML = '';

        // Obtener datos del usuario/empresa
        this.state.companyId = window.currentCompany?.id || localStorage.getItem('company_id');

        // Renderizar estructura inicial
        this.render();

        // Cargar datos iniciales
        await this.loadInitialData();

        // Configurar eventos
        this.setupEventListeners();

        console.log('✅ [WMS] Módulo inicializado correctamente');
    },

    // ═══════════════════════════════════════════════════════════════════════
    // RENDERIZADO PRINCIPAL
    // ═══════════════════════════════════════════════════════════════════════
    render() {
        this.container.innerHTML = `
            <div class="wms-container">
                <!-- Header -->
                <div class="wms-header">
                    <div class="wms-header-title">
                        <span class="wms-icon">🏭</span>
                        <h1>Gestión de Almacenes</h1>
                    </div>
                    <div class="wms-header-selectors">
                        <div class="wms-selector-group">
                            <span class="wms-selector-label">Sucursal</span>
                            <select id="wms-branch-selector" class="wms-selector">
                                <option value="">Cargando...</option>
                            </select>
                        </div>
                        <div class="wms-selector-group">
                            <span class="wms-selector-label">Depósito</span>
                            <select id="wms-warehouse-selector" class="wms-selector">
                                <option value="">Selecciona sucursal</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="wms-tabs-container">
                    <div class="wms-tabs" id="wms-tabs">
                        ${this.tabs.map(tab => `
                            <button class="wms-tab ${tab.id === this.state.currentTab ? 'active' : ''}"
                                    data-tab="${tab.id}">
                                <span class="wms-tab-icon">${tab.icon}</span>
                                <span>${tab.label}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="wms-toolbar" id="wms-toolbar">
                    ${this.renderToolbar()}
                </div>

                <!-- Content -->
                <div class="wms-content" id="wms-content">
                    <div class="wms-loading">
                        <div class="wms-spinner"></div>
                        <div class="wms-loading-text">Cargando datos...</div>
                    </div>
                </div>
            </div>

            <!-- Modal Container -->
            <div id="wms-modal-container"></div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // RENDERIZADO DE TOOLBAR
    // ═══════════════════════════════════════════════════════════════════════
    renderToolbar() {
        const tab = this.state.currentTab;

        if (tab === 'padron') {
            return `
                <div class="wms-toolbar-left">
                    <div class="wms-search-box">
                        <span class="wms-search-icon">🔍</span>
                        <input type="text" class="wms-search-input" id="wms-search"
                               placeholder="Buscar por código, descripción, código de barras...">
                    </div>
                    <button class="wms-filter-btn" id="wms-filter-toggle">
                        <span>⚡</span> Filtros
                    </button>
                </div>
                <div class="wms-toolbar-right">
                    <button class="wms-btn wms-btn-secondary" id="wms-import-btn">
                        <span>📥</span> Importar
                    </button>
                    <button class="wms-btn wms-btn-secondary" id="wms-export-btn">
                        <span>📤</span> Exportar
                    </button>
                    <button class="wms-btn wms-btn-primary" id="wms-new-product-btn">
                        <span>➕</span> Nuevo Artículo
                    </button>
                </div>
            `;
        } else if (tab === 'categorias') {
            return `
                <div class="wms-toolbar-left">
                    <div class="wms-search-box">
                        <span class="wms-search-icon">🔍</span>
                        <input type="text" class="wms-search-input" id="wms-search"
                               placeholder="Buscar categoría...">
                    </div>
                </div>
                <div class="wms-toolbar-right">
                    <button class="wms-btn wms-btn-primary" id="wms-new-category-btn">
                        <span>➕</span> Nueva Categoría
                    </button>
                </div>
            `;
        } else if (tab === 'precios') {
            return `
                <div class="wms-toolbar-left">
                    <span style="color: var(--wms-text-muted);">Gestión de listas de precios y márgenes</span>
                </div>
                <div class="wms-toolbar-right">
                    <button class="wms-btn wms-btn-secondary" id="wms-bulk-update-btn">
                        <span>📊</span> Actualización Masiva
                    </button>
                    <button class="wms-btn wms-btn-primary" id="wms-new-pricelist-btn">
                        <span>➕</span> Nueva Lista
                    </button>
                </div>
            `;
        } else if (tab === 'promociones') {
            return `
                <div class="wms-toolbar-left">
                    <span style="color: var(--wms-text-muted);">Promociones activas y programadas</span>
                </div>
                <div class="wms-toolbar-right">
                    <button class="wms-btn wms-btn-primary" id="wms-new-promo-btn">
                        <span>➕</span> Nueva Promoción
                    </button>
                </div>
            `;
        } else if (tab === 'stock') {
            return `
                <div class="wms-toolbar-left">
                    <div class="wms-search-box">
                        <span class="wms-search-icon">🔍</span>
                        <input type="text" class="wms-search-input" id="wms-search"
                               placeholder="Buscar producto...">
                    </div>
                    <button class="wms-filter-btn ${this.state.filters.stockStatus === 'low' ? 'active' : ''}"
                            data-filter="low">
                        <span>⚠️</span> Stock Bajo
                    </button>
                </div>
                <div class="wms-toolbar-right">
                    <button class="wms-btn wms-btn-primary" id="wms-stock-movement-btn">
                        <span>↔️</span> Movimiento de Stock
                    </button>
                </div>
            `;
        } else if (tab === 'ubicaciones') {
            return `
                <div class="wms-toolbar-left">
                    <span style="color: var(--wms-text-muted);">Planograma y ubicaciones del depósito</span>
                </div>
                <div class="wms-toolbar-right">
                    <button class="wms-btn wms-btn-secondary" id="wms-new-zone-btn">
                        <span>📍</span> Nueva Zona
                    </button>
                    <button class="wms-btn wms-btn-primary" id="wms-new-location-btn">
                        <span>➕</span> Nueva Ubicación
                    </button>
                </div>
            `;
        } else if (tab === 'config') {
            return `
                <div class="wms-toolbar-left">
                    <span style="color: var(--wms-text-muted);">Configuración del módulo de almacenes</span>
                </div>
                <div class="wms-toolbar-right"></div>
            `;
        }

        return '';
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CARGA DE DATOS INICIALES
    // ═══════════════════════════════════════════════════════════════════════
    async loadInitialData() {
        try {
            this.state.isLoading = true;

            // Cargar sucursales
            const branchesResponse = await this.api('/branches');
            this.state.branches = branchesResponse.data || [];

            // Actualizar selector de sucursales
            this.updateBranchSelector();

            // Si hay sucursales, seleccionar la primera
            if (this.state.branches.length > 0) {
                await this.selectBranch(this.state.branches[0].id);
            } else {
                this.renderContent();
            }

        } catch (error) {
            console.error('[WMS] Error cargando datos iniciales:', error);
            this.showError('Error al cargar datos iniciales');
        } finally {
            this.state.isLoading = false;
        }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // API HELPER
    // ═══════════════════════════════════════════════════════════════════════
    async api(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const baseUrl = '/api/warehouse';

        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en la solicitud');
        }

        return response.json();
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SELECTORES DE SUCURSAL/DEPÓSITO
    // ═══════════════════════════════════════════════════════════════════════
    updateBranchSelector() {
        const selector = document.getElementById('wms-branch-selector');
        if (!selector) return;

        if (this.state.branches.length === 0) {
            selector.innerHTML = '<option value="">Sin sucursales</option>';
            return;
        }

        selector.innerHTML = this.state.branches.map(b =>
            `<option value="${b.id}">${b.name}</option>`
        ).join('');
    },

    async selectBranch(branchId) {
        this.state.currentBranch = branchId;

        // Cargar depósitos de la sucursal
        const warehousesResponse = await this.api(`/warehouses?branch_id=${branchId}`);
        this.state.warehouses = warehousesResponse.data || [];

        // Actualizar selector de depósitos
        const selector = document.getElementById('wms-warehouse-selector');
        if (selector) {
            if (this.state.warehouses.length === 0) {
                selector.innerHTML = '<option value="">Sin depósitos</option>';
            } else {
                selector.innerHTML = this.state.warehouses.map(w =>
                    `<option value="${w.id}">${w.name}</option>`
                ).join('');
            }
        }

        // Seleccionar primer depósito si existe
        if (this.state.warehouses.length > 0) {
            await this.selectWarehouse(this.state.warehouses[0].id);
        } else {
            this.renderContent();
        }
    },

    async selectWarehouse(warehouseId) {
        this.state.currentWarehouse = warehouseId;
        await this.loadTabData();
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CARGAR DATOS DEL TAB ACTUAL
    // ═══════════════════════════════════════════════════════════════════════
    async loadTabData() {
        if (!this.state.currentWarehouse && this.state.currentTab !== 'config') {
            this.renderContent();
            return;
        }

        const contentEl = document.getElementById('wms-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="wms-loading">
                    <div class="wms-spinner"></div>
                    <div class="wms-loading-text">Cargando datos...</div>
                </div>
            `;
        }

        try {
            switch (this.state.currentTab) {
                case 'padron':
                    await this.loadProducts();
                    break;
                case 'categorias':
                    await this.loadCategories();
                    break;
                case 'precios':
                    await this.loadPriceLists();
                    break;
                case 'promociones':
                    await this.loadPromotions();
                    break;
                case 'stock':
                    await this.loadStock();
                    break;
                case 'ubicaciones':
                    await this.loadLocations();
                    break;
                case 'config':
                    await this.loadConfig();
                    break;
            }
        } catch (error) {
            console.error('[WMS] Error cargando datos del tab:', error);
            this.showError('Error al cargar los datos');
        }

        this.renderContent();
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CARGAR PRODUCTOS (PADRÓN)
    // ═══════════════════════════════════════════════════════════════════════
    async loadProducts() {
        const params = new URLSearchParams({
            branch_id: this.state.currentBranch,
            page: this.state.pagination.page,
            limit: this.state.pagination.limit
        });

        if (this.state.filters.search) params.append('search', this.state.filters.search);
        if (this.state.filters.category) params.append('category_id', this.state.filters.category);
        if (this.state.filters.brand) params.append('brand_id', this.state.filters.brand);

        const response = await this.api(`/products?${params}`);
        this.state.products = response.data || [];
        this.state.pagination.total = response.pagination?.total || 0;

        // Cargar estadísticas
        const statsResponse = await this.api(`/dashboard/stats?branch_id=${this.state.currentBranch}`);
        if (statsResponse.data) {
            this.state.stats = statsResponse.data;
        }

        // Cargar categorías, marcas y proveedores para filtros
        const [catResponse, brandResponse, supplierResponse] = await Promise.all([
            this.api(`/categories?branch_id=${this.state.currentBranch}`),
            this.api(`/brands`),
            this.api(`/suppliers`)
        ]);

        this.state.categories = catResponse.data || [];
        this.state.brands = brandResponse.data || [];
        this.state.suppliers = supplierResponse.data || [];
    },

    async loadCategories() {
        const response = await this.api(`/categories?branch_id=${this.state.currentBranch}`);
        this.state.categories = response.data || [];
    },

    async loadPriceLists() {
        const response = await this.api(`/price-lists?branch_id=${this.state.currentBranch}`);
        this.state.priceLists = response.data || [];
    },

    async loadPromotions() {
        const response = await this.api(`/promotions?branch_id=${this.state.currentBranch}`);
        this.state.promotions = response.data || [];
    },

    async loadStock() {
        // Stock ya viene con productos, solo filtramos
        await this.loadProducts();
    },

    async loadLocations() {
        // Cargar zonas y ubicaciones del depósito actual
        if (this.state.currentWarehouse) {
            const response = await this.api(`/warehouses/${this.state.currentWarehouse}/planogram`);
            this.state.planogram = response.data || [];
        }
    },

    async loadConfig() {
        // Cargar configuración
        this.state.configLoaded = true;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // RENDERIZAR CONTENIDO
    // ═══════════════════════════════════════════════════════════════════════
    renderContent() {
        const contentEl = document.getElementById('wms-content');
        if (!contentEl) return;

        if (!this.state.currentBranch || !this.state.currentWarehouse) {
            contentEl.innerHTML = this.renderEmptyState(
                '🏭',
                'Selecciona una sucursal y depósito',
                'Para comenzar, selecciona una sucursal y un depósito en los selectores superiores.'
            );
            return;
        }

        switch (this.state.currentTab) {
            case 'padron':
                contentEl.innerHTML = this.renderProductsTab();
                break;
            case 'categorias':
                contentEl.innerHTML = this.renderCategoriesTab();
                break;
            case 'precios':
                contentEl.innerHTML = this.renderPriceListsTab();
                break;
            case 'promociones':
                contentEl.innerHTML = this.renderPromotionsTab();
                break;
            case 'stock':
                contentEl.innerHTML = this.renderStockTab();
                break;
            case 'ubicaciones':
                contentEl.innerHTML = this.renderLocationsTab();
                break;
            case 'config':
                contentEl.innerHTML = this.renderConfigTab();
                break;
            default:
                contentEl.innerHTML = this.renderProductsTab();
        }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TAB: PADRÓN DE ARTÍCULOS
    // ═══════════════════════════════════════════════════════════════════════
    renderProductsTab() {
        const { products, stats, pagination } = this.state;

        return `
            <!-- Stats Cards -->
            <div class="wms-stats-grid">
                <div class="wms-stat-card">
                    <div class="wms-stat-icon products">📦</div>
                    <div class="wms-stat-info">
                        <h3>${this.formatNumber(stats.products || products.length)}</h3>
                        <p>Artículos Registrados</p>
                    </div>
                </div>
                <div class="wms-stat-card">
                    <div class="wms-stat-icon stock">📊</div>
                    <div class="wms-stat-info">
                        <h3>${this.formatNumber(stats.warehouses || 0)}</h3>
                        <p>Depósitos Activos</p>
                    </div>
                </div>
                <div class="wms-stat-card">
                    <div class="wms-stat-icon alerts">⚠️</div>
                    <div class="wms-stat-info">
                        <h3>${this.formatNumber(stats.low_stock_alerts || 0)}</h3>
                        <p>Alertas Stock Bajo</p>
                    </div>
                </div>
                <div class="wms-stat-card">
                    <div class="wms-stat-icon value">💰</div>
                    <div class="wms-stat-info">
                        <h3>$${this.formatNumber(stats.stock_value || 0)}</h3>
                        <p>Valor en Stock</p>
                    </div>
                </div>
            </div>

            <!-- Products Table -->
            <div class="wms-table-container">
                <div class="wms-table-header">
                    <div class="wms-table-title">
                        <span>📦</span>
                        <span>Padrón de Artículos</span>
                    </div>
                    <div>
                        <span style="color: var(--wms-text-muted); font-size: 0.85rem;">
                            ${products.length} artículos
                        </span>
                    </div>
                </div>

                ${products.length === 0 ? `
                    <div class="wms-empty">
                        <div class="wms-empty-icon">📦</div>
                        <h3>No hay artículos</h3>
                        <p>Comienza agregando tu primer artículo al padrón.</p>
                        <button class="wms-btn wms-btn-primary" onclick="WarehouseManagement.openProductModal()">
                            <span>➕</span> Agregar Artículo
                        </button>
                    </div>
                ` : `
                    <table class="wms-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" class="wms-table-checkbox" id="wms-select-all">
                                </th>
                                <th class="sortable">Código</th>
                                <th class="sortable">Descripción</th>
                                <th>Categoría</th>
                                <th>Marca</th>
                                <th class="sortable">Stock</th>
                                <th>Precio</th>
                                <th>Estado</th>
                                <th style="width: 100px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(p => this.renderProductRow(p)).join('')}
                        </tbody>
                    </table>

                    ${this.renderPagination()}
                `}
            </div>
        `;
    },

    renderProductRow(product) {
        const stockPercent = product.max_stock ?
            Math.min(100, (product.total_stock / product.max_stock) * 100) : 50;
        const stockClass = stockPercent > 50 ? 'high' : stockPercent > 20 ? 'medium' : 'low';

        return `
            <tr data-product-id="${product.id}">
                <td>
                    <input type="checkbox" class="wms-table-checkbox wms-product-checkbox"
                           value="${product.id}">
                </td>
                <td>
                    <code style="color: var(--wms-accent-primary);">${product.internal_code}</code>
                </td>
                <td>
                    <div class="wms-product-cell">
                        <div class="wms-product-image">
                            ${product.image_url ?
                                `<img src="${product.image_url}" alt="">` :
                                '📦'}
                        </div>
                        <div class="wms-product-info">
                            <h4>${product.description}</h4>
                            <span class="wms-product-sku">${product.primary_barcode || 'Sin código de barras'}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="wms-badge wms-badge-neutral">
                        ${product.category_name || 'Sin categoría'}
                    </span>
                </td>
                <td>${product.brand_name || '-'}</td>
                <td>
                    <div class="wms-stock-indicator">
                        <span>${this.formatNumber(product.total_stock || 0)}</span>
                        <div class="wms-stock-bar">
                            <div class="wms-stock-bar-fill ${stockClass}"
                                 style="width: ${stockPercent}%"></div>
                        </div>
                    </div>
                </td>
                <td>
                    <strong>$${this.formatNumber(product.final_price || 0)}</strong>
                </td>
                <td>
                    ${product.is_active ?
                        '<span class="wms-badge wms-badge-success">Activo</span>' :
                        '<span class="wms-badge wms-badge-danger">Inactivo</span>'}
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="wms-btn wms-btn-icon wms-btn-secondary"
                                onclick="WarehouseManagement.viewProduct('${product.id}')"
                                title="Ver detalles">
                            👁️
                        </button>
                        <button class="wms-btn wms-btn-icon wms-btn-secondary"
                                onclick="WarehouseManagement.editProduct('${product.id}')"
                                title="Editar">
                            ✏️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TAB: CATEGORÍAS
    // ═══════════════════════════════════════════════════════════════════════
    renderCategoriesTab() {
        const { categories } = this.state;

        return `
            <div class="wms-table-container">
                <div class="wms-table-header">
                    <div class="wms-table-title">
                        <span>🏷️</span>
                        <span>Árbol de Categorías</span>
                    </div>
                </div>

                ${categories.length === 0 ? `
                    <div class="wms-empty">
                        <div class="wms-empty-icon">🏷️</div>
                        <h3>No hay categorías</h3>
                        <p>Crea tu primera categoría para organizar tus productos.</p>
                        <button class="wms-btn wms-btn-primary" onclick="WarehouseManagement.openCategoryModal()">
                            <span>➕</span> Nueva Categoría
                        </button>
                    </div>
                ` : `
                    <div style="padding: 20px;">
                        ${this.renderCategoryTree(categories.filter(c => !c.parent_id))}
                    </div>
                `}
            </div>
        `;
    },

    renderCategoryTree(categories, level = 0) {
        return categories.map(cat => {
            const children = this.state.categories.filter(c => c.parent_id === cat.id);
            return `
                <div class="wms-category-item" style="margin-left: ${level * 24}px; padding: 12px;
                     border-left: 2px solid ${level === 0 ? 'var(--wms-accent-primary)' : 'var(--wms-border-color)'};
                     margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.2rem;">${level === 0 ? '📁' : '📂'}</span>
                            <div>
                                <strong>${cat.name}</strong>
                                <code style="color: var(--wms-text-muted); margin-left: 8px;">${cat.code}</code>
                            </div>
                            <span class="wms-badge wms-badge-neutral">${cat.product_count || 0} productos</span>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button class="wms-btn wms-btn-icon wms-btn-secondary"
                                    onclick="WarehouseManagement.editCategory('${cat.id}')" title="Editar">
                                ✏️
                            </button>
                            <button class="wms-btn wms-btn-icon wms-btn-secondary"
                                    onclick="WarehouseManagement.openCategoryModal('${cat.id}')" title="Subcategoría">
                                ➕
                            </button>
                        </div>
                    </div>
                    ${children.length > 0 ? this.renderCategoryTree(children, level + 1) : ''}
                </div>
            `;
        }).join('');
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TAB: LISTAS DE PRECIOS
    // ═══════════════════════════════════════════════════════════════════════
    renderPriceListsTab() {
        const { priceLists } = this.state;

        return `
            <div class="wms-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
                ${priceLists.length === 0 ? `
                    <div class="wms-empty" style="grid-column: 1 / -1;">
                        <div class="wms-empty-icon">💰</div>
                        <h3>No hay listas de precios</h3>
                        <p>Crea tu primera lista de precios para comenzar.</p>
                        <button class="wms-btn wms-btn-primary" onclick="WarehouseManagement.openPriceListModal()">
                            <span>➕</span> Nueva Lista de Precios
                        </button>
                    </div>
                ` : priceLists.map(pl => `
                    <div class="wms-stat-card" style="flex-direction: column; align-items: flex-start; gap: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 1.5rem;">${pl.is_mirror ? '🔗' : '💰'}</span>
                                <div>
                                    <h4 style="margin: 0;">${pl.name}</h4>
                                    <code style="color: var(--wms-text-muted);">${pl.code}</code>
                                </div>
                            </div>
                            ${pl.is_default ? '<span class="wms-badge wms-badge-success">Principal</span>' : ''}
                        </div>

                        ${pl.is_mirror ? `
                            <div class="wms-alert wms-alert-info" style="margin: 0; padding: 10px; width: 100%;">
                                <span>🔗</span>
                                <div>
                                    <strong>Lista Espejo</strong>
                                    <p style="margin: 0; font-size: 0.8rem;">
                                        ${pl.mirror_parent_name} ${pl.mirror_adjustment_type === 'percent' ?
                                            `${pl.mirror_adjustment_value > 0 ? '+' : ''}${pl.mirror_adjustment_value}%` :
                                            `${pl.mirror_adjustment_value > 0 ? '+' : ''}$${pl.mirror_adjustment_value}`}
                                    </p>
                                </div>
                            </div>
                        ` : ''}

                        <div style="display: flex; align-items: center; gap: 12px; color: var(--wms-text-muted); font-size: 0.85rem;">
                            <span>📦 ${pl.product_count || 0} productos</span>
                        </div>

                        <div style="display: flex; gap: 8px; margin-top: auto; width: 100%;">
                            <button class="wms-btn wms-btn-secondary" style="flex: 1;"
                                    onclick="WarehouseManagement.editPriceList('${pl.id}')">
                                ✏️ Editar
                            </button>
                            <button class="wms-btn wms-btn-secondary" style="flex: 1;"
                                    onclick="WarehouseManagement.viewPriceListProducts('${pl.id}')">
                                📦 Ver Precios
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TAB: PROMOCIONES
    // ═══════════════════════════════════════════════════════════════════════
    renderPromotionsTab() {
        const { promotions } = this.state;

        const promoTypeIcons = {
            'percent_discount': '🏷️',
            'fixed_discount': '💵',
            'buy_x_get_y': '🎁',
            'bundle': '📦',
            'quantity_discount': '📊'
        };

        return `
            <div class="wms-table-container">
                <div class="wms-table-header">
                    <div class="wms-table-title">
                        <span>🎯</span>
                        <span>Promociones</span>
                    </div>
                </div>

                ${promotions.length === 0 ? `
                    <div class="wms-empty">
                        <div class="wms-empty-icon">🎯</div>
                        <h3>No hay promociones</h3>
                        <p>Crea promociones para impulsar tus ventas.</p>
                        <button class="wms-btn wms-btn-primary" onclick="WarehouseManagement.openPromotionModal()">
                            <span>➕</span> Nueva Promoción
                        </button>
                    </div>
                ` : `
                    <table class="wms-table">
                        <thead>
                            <tr>
                                <th>Promoción</th>
                                <th>Tipo</th>
                                <th>Descuento</th>
                                <th>Vigencia</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${promotions.map(p => `
                                <tr>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-size: 1.5rem;">${promoTypeIcons[p.promotion_type] || '🎯'}</span>
                                            <div>
                                                <strong>${p.name}</strong>
                                                <div style="color: var(--wms-text-muted); font-size: 0.8rem;">
                                                    ${p.code}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="wms-badge wms-badge-info">${p.promotion_type}</span>
                                    </td>
                                    <td>
                                        ${p.discount_type === 'percent' ?
                                            `<strong>${p.discount_value}%</strong>` :
                                            `<strong>$${p.discount_value}</strong>`}
                                    </td>
                                    <td>
                                        <div style="font-size: 0.85rem;">
                                            ${new Date(p.start_date).toLocaleDateString()}
                                            ${p.end_date ? ` - ${new Date(p.end_date).toLocaleDateString()}` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        ${p.is_active ?
                                            '<span class="wms-badge wms-badge-success">Activa</span>' :
                                            '<span class="wms-badge wms-badge-danger">Inactiva</span>'}
                                    </td>
                                    <td>
                                        <div style="display: flex; gap: 6px;">
                                            <button class="wms-btn wms-btn-icon wms-btn-secondary"
                                                    onclick="WarehouseManagement.editPromotion('${p.id}')" title="Editar">
                                                ✏️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TAB: STOCK
    // ═══════════════════════════════════════════════════════════════════════
    renderStockTab() {
        const { products, stats } = this.state;

        return `
            <!-- Alertas de Stock -->
            ${stats.low_stock_alerts > 0 ? `
                <div class="wms-alert wms-alert-warning">
                    <span class="wms-alert-icon">⚠️</span>
                    <div class="wms-alert-content">
                        <h4>Alertas de Stock Bajo</h4>
                        <p>Hay ${stats.low_stock_alerts} productos con stock por debajo del punto de pedido.</p>
                    </div>
                </div>
            ` : ''}

            <div class="wms-table-container">
                <div class="wms-table-header">
                    <div class="wms-table-title">
                        <span>📊</span>
                        <span>Stock por Producto</span>
                    </div>
                </div>

                <table class="wms-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Stock Actual</th>
                            <th>Mínimo</th>
                            <th>Máximo</th>
                            <th>Punto Pedido</th>
                            <th>Costo Unit.</th>
                            <th>Valor Total</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(p => {
                            const isLow = p.reorder_point && p.total_stock <= p.reorder_point;
                            return `
                                <tr>
                                    <td>
                                        <div class="wms-product-info">
                                            <h4>${p.description}</h4>
                                            <span class="wms-product-sku">${p.internal_code}</span>
                                        </div>
                                    </td>
                                    <td><strong>${this.formatNumber(p.total_stock || 0)}</strong></td>
                                    <td>${p.min_stock || '-'}</td>
                                    <td>${p.max_stock || '-'}</td>
                                    <td>${p.reorder_point || '-'}</td>
                                    <td>$${this.formatNumber(p.unit_cost || 0)}</td>
                                    <td><strong>$${this.formatNumber((p.total_stock || 0) * (p.unit_cost || 0))}</strong></td>
                                    <td>
                                        ${isLow ?
                                            '<span class="wms-badge wms-badge-danger">Stock Bajo</span>' :
                                            '<span class="wms-badge wms-badge-success">OK</span>'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TAB: UBICACIONES
    // ═══════════════════════════════════════════════════════════════════════
    renderLocationsTab() {
        const planogram = this.state.planogram || [];

        return `
            <div class="wms-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
                ${planogram.length === 0 ? `
                    <div class="wms-empty" style="grid-column: 1 / -1;">
                        <div class="wms-empty-icon">📍</div>
                        <h3>No hay zonas configuradas</h3>
                        <p>Define zonas y ubicaciones para organizar tu depósito.</p>
                        <button class="wms-btn wms-btn-primary" onclick="WarehouseManagement.openZoneModal()">
                            <span>➕</span> Nueva Zona
                        </button>
                    </div>
                ` : planogram.map(zone => `
                    <div class="wms-stat-card" style="flex-direction: column; align-items: flex-start;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                            <span style="font-size: 1.5rem;">📍</span>
                            <div>
                                <h4 style="margin: 0;">${zone.name}</h4>
                                <code style="color: var(--wms-text-muted);">${zone.code}</code>
                            </div>
                            <span class="wms-badge wms-badge-info">${zone.zone_type}</span>
                        </div>

                        <div style="width: 100%; max-height: 200px; overflow-y: auto;">
                            ${zone.locations && zone.locations.length > 0 ? zone.locations.map(loc => `
                                <div style="padding: 8px; border: 1px solid var(--wms-border-color);
                                     border-radius: var(--wms-radius-sm); margin-bottom: 6px;
                                     display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <strong>${loc.code}</strong>
                                        <span style="color: var(--wms-text-muted); font-size: 0.8rem;">
                                            ${loc.aisle ? `P${loc.aisle}` : ''}
                                            ${loc.rack ? `E${loc.rack}` : ''}
                                            ${loc.shelf ? `N${loc.shelf}` : ''}
                                        </span>
                                    </div>
                                    ${loc.product ? `
                                        <span class="wms-badge wms-badge-success">${loc.product.internal_code}</span>
                                    ` : `
                                        <span class="wms-badge wms-badge-neutral">Vacía</span>
                                    `}
                                </div>
                            `).join('') : '<p style="color: var(--wms-text-muted);">Sin ubicaciones</p>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TAB: CONFIGURACIÓN
    // ═══════════════════════════════════════════════════════════════════════
    renderConfigTab() {
        return `
            <div class="wms-form-grid">
                <!-- Configuración de Códigos de Barras -->
                <div class="wms-table-container" style="grid-column: 1 / -1;">
                    <div class="wms-table-header">
                        <div class="wms-table-title">
                            <span>📊</span>
                            <span>Configuración de Códigos de Barras Compuestos</span>
                        </div>
                    </div>
                    <div style="padding: 20px;">
                        <div class="wms-form-grid">
                            <div class="wms-form-group">
                                <label class="wms-form-label">Prefijo Código Compuesto</label>
                                <input type="text" class="wms-form-input" value="2" maxlength="2">
                                <span class="wms-form-hint">Prefijo que identifica códigos de balanza</span>
                            </div>
                            <div class="wms-form-group">
                                <label class="wms-form-label">Dígitos del Artículo</label>
                                <input type="number" class="wms-form-input" value="5" min="3" max="8">
                            </div>
                            <div class="wms-form-group">
                                <label class="wms-form-label">Dígitos del Peso/Precio</label>
                                <input type="number" class="wms-form-input" value="5" min="4" max="7">
                            </div>
                            <div class="wms-form-group">
                                <label class="wms-form-label">Posición Dígito Verificador</label>
                                <input type="number" class="wms-form-input" value="13" min="12" max="14">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Plantillas Fiscales -->
                <div class="wms-table-container">
                    <div class="wms-table-header">
                        <div class="wms-table-title">
                            <span>🏛️</span>
                            <span>Plantilla Fiscal Activa</span>
                        </div>
                    </div>
                    <div style="padding: 20px;">
                        <div class="wms-form-group">
                            <label class="wms-form-label">País</label>
                            <select class="wms-form-select">
                                <option value="AR">Argentina</option>
                                <option value="CL">Chile</option>
                                <option value="MX">México</option>
                                <option value="CO">Colombia</option>
                            </select>
                        </div>
                        <div class="wms-form-group">
                            <label class="wms-form-label">Plantilla</label>
                            <select class="wms-form-select">
                                <option value="1">Argentina - IVA General (21%)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Monedas -->
                <div class="wms-table-container">
                    <div class="wms-table-header">
                        <div class="wms-table-title">
                            <span>💱</span>
                            <span>Monedas y Tipos de Cambio</span>
                        </div>
                    </div>
                    <div style="padding: 20px;">
                        <div class="wms-form-group">
                            <label class="wms-form-label">Moneda Principal</label>
                            <select class="wms-form-select">
                                <option value="ARS">Peso Argentino (ARS)</option>
                                <option value="USD">Dólar Estadounidense (USD)</option>
                            </select>
                        </div>
                        <div class="wms-form-group">
                            <label class="wms-form-label">Tipo de Cambio USD</label>
                            <input type="number" class="wms-form-input" value="850.00" step="0.01">
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
                <button class="wms-btn wms-btn-primary">
                    <span>💾</span> Guardar Configuración
                </button>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PAGINACIÓN
    // ═══════════════════════════════════════════════════════════════════════
    renderPagination() {
        const { page, limit, total } = this.state.pagination;
        const totalPages = Math.ceil(total / limit);
        const from = (page - 1) * limit + 1;
        const to = Math.min(page * limit, total);

        return `
            <div class="wms-pagination">
                <div class="wms-pagination-info">
                    Mostrando ${from} a ${to} de ${total} artículos
                </div>
                <div class="wms-pagination-controls">
                    <button class="wms-pagination-btn" ${page === 1 ? 'disabled' : ''}
                            onclick="WarehouseManagement.goToPage(1)">
                        ⟪
                    </button>
                    <button class="wms-pagination-btn" ${page === 1 ? 'disabled' : ''}
                            onclick="WarehouseManagement.goToPage(${page - 1})">
                        ⟨
                    </button>
                    <span style="padding: 8px 12px; color: var(--wms-text-secondary);">
                        Página ${page} de ${totalPages}
                    </span>
                    <button class="wms-pagination-btn" ${page >= totalPages ? 'disabled' : ''}
                            onclick="WarehouseManagement.goToPage(${page + 1})">
                        ⟩
                    </button>
                    <button class="wms-pagination-btn" ${page >= totalPages ? 'disabled' : ''}
                            onclick="WarehouseManagement.goToPage(${totalPages})">
                        ⟫
                    </button>
                </div>
            </div>
        `;
    },

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════
    renderEmptyState(icon, title, message) {
        return `
            <div class="wms-empty">
                <div class="wms-empty-icon">${icon}</div>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    },

    formatNumber(num) {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(num || 0);
    },

    showError(message) {
        console.error('[WMS]', message);
        // TODO: Implementar toast notifications
    },

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════════════
    setupEventListeners() {
        // Cambio de tab
        document.querySelectorAll('.wms-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Cambio de sucursal
        const branchSelector = document.getElementById('wms-branch-selector');
        if (branchSelector) {
            branchSelector.addEventListener('change', (e) => {
                this.selectBranch(e.target.value);
            });
        }

        // Cambio de depósito
        const warehouseSelector = document.getElementById('wms-warehouse-selector');
        if (warehouseSelector) {
            warehouseSelector.addEventListener('change', (e) => {
                this.selectWarehouse(e.target.value);
            });
        }

        // Búsqueda
        const searchInput = document.getElementById('wms-search');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.state.filters.search = e.target.value;
                    this.state.pagination.page = 1;
                    this.loadTabData();
                }, 300);
            });
        }

        // Botón nuevo producto
        const newProductBtn = document.getElementById('wms-new-product-btn');
        if (newProductBtn) {
            newProductBtn.addEventListener('click', () => this.openProductModal());
        }
    },

    switchTab(tabId) {
        this.state.currentTab = tabId;

        // Update tab UI
        document.querySelectorAll('.wms-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update toolbar
        const toolbar = document.getElementById('wms-toolbar');
        if (toolbar) {
            toolbar.innerHTML = this.renderToolbar();
        }

        // Load tab data
        this.loadTabData();

        // Re-setup event listeners for dynamic elements
        this.setupEventListeners();
    },

    goToPage(page) {
        this.state.pagination.page = page;
        this.loadTabData();
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MODALES
    // ═══════════════════════════════════════════════════════════════════════
    openProductModal(productId = null) {
        const isEdit = !!productId;
        const modalContainer = document.getElementById('wms-modal-container');

        modalContainer.innerHTML = `
            <div class="wms-modal-overlay active" onclick="WarehouseManagement.closeModal(event)">
                <div class="wms-modal" onclick="event.stopPropagation()">
                    <div class="wms-modal-header">
                        <div class="wms-modal-title">
                            <span>📦</span>
                            <span>${isEdit ? 'Editar Artículo' : 'Nuevo Artículo'}</span>
                        </div>
                        <button class="wms-modal-close" onclick="WarehouseManagement.closeModal()">
                            ✕
                        </button>
                    </div>
                    <div class="wms-modal-body">
                        <div class="wms-form-grid">
                            <!-- Identificación -->
                            <div class="wms-form-section-title" style="grid-column: 1 / -1;">
                                📋 Identificación del Artículo
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">
                                    Código Interno <span class="required">*</span>
                                </label>
                                <input type="text" class="wms-form-input" id="product-code"
                                       placeholder="SKU001" required>
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">
                                    Descripción <span class="required">*</span>
                                </label>
                                <input type="text" class="wms-form-input" id="product-description"
                                       placeholder="Nombre del producto" required>
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Descripción Alternativa</label>
                                <input type="text" class="wms-form-input" id="product-description-alt"
                                       placeholder="Nombre secundario">
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Código de Barras (EAN/UPC)</label>
                                <input type="text" class="wms-form-input" id="product-barcode"
                                       placeholder="7790001234567">
                            </div>

                            <!-- Clasificación -->
                            <div class="wms-form-section-title" style="grid-column: 1 / -1; margin-top: 24px;">
                                🏷️ Clasificación
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Categoría</label>
                                <select class="wms-form-select" id="product-category">
                                    <option value="">Seleccionar categoría</option>
                                    ${this.state.categories.map(c =>
                                        `<option value="${c.id}">${c.name}</option>`
                                    ).join('')}
                                </select>
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Marca</label>
                                <select class="wms-form-select" id="product-brand">
                                    <option value="">Seleccionar marca</option>
                                    ${this.state.brands.map(b =>
                                        `<option value="${b.id}">${b.name}</option>`
                                    ).join('')}
                                </select>
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Proveedor</label>
                                <select class="wms-form-select" id="product-supplier">
                                    <option value="">Seleccionar proveedor</option>
                                    ${this.state.suppliers.map(s =>
                                        `<option value="${s.id}">${s.name}</option>`
                                    ).join('')}
                                </select>
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Tipo de Producto</label>
                                <select class="wms-form-select" id="product-type">
                                    <option value="resale">Reventa</option>
                                    <option value="manufacture">Fabricación</option>
                                    <option value="service">Servicio</option>
                                    <option value="raw_material">Materia Prima</option>
                                </select>
                            </div>

                            <!-- Unidades -->
                            <div class="wms-form-section-title" style="grid-column: 1 / -1; margin-top: 24px;">
                                📏 Unidades y Presentación
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Unidad de Medida</label>
                                <select class="wms-form-select" id="product-unit">
                                    <option value="UNIT">Unidad</option>
                                    <option value="KG">Kilogramo</option>
                                    <option value="LT">Litro</option>
                                    <option value="MT">Metro</option>
                                    <option value="M2">Metro²</option>
                                </select>
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Unidades por Pack</label>
                                <input type="number" class="wms-form-input" id="product-pack"
                                       value="1" min="1">
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">
                                    <input type="checkbox" id="product-bulk"> Es producto a granel
                                </label>
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">
                                    <input type="checkbox" id="product-perishable"> Es perecedero
                                </label>
                            </div>

                            <!-- Stock -->
                            <div class="wms-form-section-title" style="grid-column: 1 / -1; margin-top: 24px;">
                                📊 Control de Stock
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Stock Mínimo</label>
                                <input type="number" class="wms-form-input" id="product-min-stock"
                                       value="0" min="0">
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Stock Máximo</label>
                                <input type="number" class="wms-form-input" id="product-max-stock"
                                       placeholder="Sin límite" min="0">
                            </div>

                            <div class="wms-form-group">
                                <label class="wms-form-label">Punto de Pedido</label>
                                <input type="number" class="wms-form-input" id="product-reorder"
                                       placeholder="Alerta stock bajo" min="0">
                            </div>
                        </div>
                    </div>
                    <div class="wms-modal-footer">
                        <button class="wms-btn wms-btn-secondary" onclick="WarehouseManagement.closeModal()">
                            Cancelar
                        </button>
                        <button class="wms-btn wms-btn-primary" onclick="WarehouseManagement.saveProduct()">
                            <span>💾</span> Guardar Artículo
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    closeModal(event) {
        if (event && event.target !== event.currentTarget) return;
        const modalContainer = document.getElementById('wms-modal-container');
        modalContainer.innerHTML = '';
    },

    async saveProduct() {
        const productData = {
            internal_code: document.getElementById('product-code').value,
            description: document.getElementById('product-description').value,
            description_alt: document.getElementById('product-description-alt').value,
            category_id: document.getElementById('product-category').value || null,
            brand_id: document.getElementById('product-brand').value || null,
            supplier_id: document.getElementById('product-supplier').value || null,
            product_type: document.getElementById('product-type').value,
            unit_measure: document.getElementById('product-unit').value,
            pack_quantity: parseInt(document.getElementById('product-pack').value) || 1,
            is_bulk: document.getElementById('product-bulk').checked,
            is_perishable: document.getElementById('product-perishable').checked,
            min_stock: parseInt(document.getElementById('product-min-stock').value) || 0,
            max_stock: parseInt(document.getElementById('product-max-stock').value) || null,
            reorder_point: parseInt(document.getElementById('product-reorder').value) || null,
            branch_id: this.state.currentBranch,
            barcodes: []
        };

        const barcode = document.getElementById('product-barcode').value;
        if (barcode) {
            productData.barcodes.push({ barcode, barcode_type: 'EAN13', is_primary: true });
        }

        try {
            await this.api('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });

            this.closeModal();
            await this.loadTabData();
            // TODO: Show success toast
        } catch (error) {
            console.error('[WMS] Error guardando producto:', error);
            alert('Error al guardar el producto: ' + error.message);
        }
    },

    // Placeholders para otras funciones de modales
    openCategoryModal(parentId = null) {
        console.log('[WMS] Abrir modal de categoría', parentId);
        alert('Modal de categoría - Próximamente');
    },

    openPriceListModal() {
        console.log('[WMS] Abrir modal de lista de precios');
        alert('Modal de lista de precios - Próximamente');
    },

    openPromotionModal() {
        console.log('[WMS] Abrir modal de promoción');
        alert('Modal de promoción - Próximamente');
    },

    openZoneModal() {
        console.log('[WMS] Abrir modal de zona');
        alert('Modal de zona - Próximamente');
    },

    viewProduct(productId) {
        console.log('[WMS] Ver producto', productId);
    },

    editProduct(productId) {
        this.openProductModal(productId);
    },

    editCategory(categoryId) {
        console.log('[WMS] Editar categoría', categoryId);
    },

    editPriceList(priceListId) {
        console.log('[WMS] Editar lista de precios', priceListId);
    },

    viewPriceListProducts(priceListId) {
        console.log('[WMS] Ver productos de lista', priceListId);
    },

    editPromotion(promotionId) {
        console.log('[WMS] Editar promoción', promotionId);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN GLOBAL PARA CARGAR EL MÓDULO
// ═══════════════════════════════════════════════════════════════════════════════
function showWarehouseManagementContent(containerId) {
    WarehouseManagement.init(containerId);
}

// Exportar al scope global
window.WarehouseManagement = WarehouseManagement;
window.showWarehouseManagementContent = showWarehouseManagementContent;

console.log('🏭 [WMS] Módulo Warehouse Management cargado - Dark Theme v2.0');
