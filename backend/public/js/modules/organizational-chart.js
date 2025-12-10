/**
 * ============================================================================
 * ORGANIZATIONAL CHART - Visualización de Organigrama Empresarial
 * ============================================================================
 *
 * Módulo para visualizar la estructura jerárquica de la organización
 * en forma de diagrama de flujo interactivo.
 *
 * Features:
 * - Visualización SVG del organigrama
 * - Zoom y pan interactivo
 * - Click en nodos para ver detalles
 * - Exportar como imagen
 * - Vista de escalamiento (quién aprueba qué)
 *
 * @version 1.0.0
 * @date 2025-12-09
 */

class OrganizationalChartModule {
    constructor() {
        this.container = null;
        this.positions = [];
        this.flowchartData = null;
        this.stats = null;
        this.selectedNode = null;
        this.viewMode = 'orgchart'; // 'orgchart', 'escalation', 'list'
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };

        // Colores por nivel
        this.levelColors = {
            0: '#1E40AF', // CEO - Azul oscuro
            1: '#3B82F6', // Gerentes - Azul
            2: '#10B981', // Jefes - Verde
            3: '#F59E0B', // Supervisores - Amarillo
            4: '#6B7280', // Operativos - Gris
            99: '#9CA3AF' // Sin asignar - Gris claro
        };

        // Nombres de niveles
        this.levelNames = {
            0: 'Dirección General',
            1: 'Gerencia',
            2: 'Jefatura',
            3: 'Supervisión',
            4: 'Operativo',
            99: 'Sin clasificar'
        };
    }

    /**
     * Inicializar el módulo
     */
    async init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('[ORGCHART] Container not found:', containerId);
            return;
        }

        this.injectStyles();
        this.render();
        await this.loadData();
    }

    /**
     * Inyectar estilos CSS para el módulo
     */
    injectStyles() {
        if (document.getElementById('orgchart-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'orgchart-modal-styles';
        style.textContent = `
            /* ============================================
               ORGANIZATIONAL CHART - Modal Styles
               ============================================ */
            :root {
                --org-bg-primary: #0d1117;
                --org-bg-secondary: #161b22;
                --org-bg-tertiary: #21262d;
                --org-border: #30363d;
                --org-text-primary: #e6edf3;
                --org-text-secondary: #8b949e;
                --org-accent-blue: #238636;
                --org-accent-green: #238636;
            }

            /* Modal overlay */
            .org-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }

            /* Modal container */
            .org-modal {
                background: var(--org-bg-secondary);
                border: 1px solid var(--org-border);
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            /* Modal header */
            .org-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--org-border);
            }

            .org-modal-title {
                font-size: 18px;
                font-weight: 600;
                margin: 0;
                color: var(--org-text-primary);
            }

            .org-modal-close {
                background: transparent;
                border: none;
                color: var(--org-text-secondary);
                font-size: 24px;
                cursor: pointer;
                padding: 4px;
                line-height: 1;
            }

            .org-modal-close:hover {
                color: var(--org-text-primary);
            }

            /* Modal body */
            .org-modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }

            /* Modal footer */
            .org-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 16px 20px;
                border-top: 1px solid var(--org-border);
            }

            /* Form elements */
            .org-form-group {
                margin-bottom: 16px;
            }

            .org-form-label {
                display: block;
                margin-bottom: 6px;
                font-size: 13px;
                font-weight: 500;
                color: var(--org-text-secondary);
            }

            .org-form-input,
            .org-form-select,
            .org-form-textarea {
                width: 100%;
                padding: 10px 12px;
                background: var(--org-bg-tertiary);
                border: 1px solid var(--org-border);
                border-radius: 6px;
                color: var(--org-text-primary);
                font-size: 14px;
            }

            .org-form-input:focus,
            .org-form-select:focus,
            .org-form-textarea:focus {
                outline: none;
                border-color: var(--org-accent-blue);
                box-shadow: 0 0 0 3px rgba(35, 134, 54, 0.2);
            }

            .org-form-input::placeholder,
            .org-form-textarea::placeholder {
                color: var(--org-text-secondary);
                opacity: 0.6;
            }

            .org-form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }

            /* Form switches - better contrast */
            .org-modal .form-check-label {
                color: var(--org-text-secondary);
            }

            .org-modal .form-check-input {
                background-color: var(--org-bg-tertiary);
                border: 1px solid var(--org-border);
            }

            .org-modal .form-check-input:checked {
                background-color: var(--org-accent-green);
                border-color: var(--org-accent-green);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Renderizar estructura inicial
     */
    render() {
        this.container.innerHTML = `
            <div class="orgchart-module">
                <!-- Header -->
                <div class="orgchart-header">
                    <div class="orgchart-title">
                        <i class="fas fa-sitemap"></i>
                        <h2>Organigrama Empresarial</h2>
                        <span class="badge bg-primary" id="orgchart-position-count">0 posiciones</span>
                    </div>
                    <div class="orgchart-actions">
                        <div class="btn-group me-2">
                            <button class="btn btn-outline-primary btn-sm active" data-view="orgchart" title="Vista Organigrama">
                                <i class="fas fa-sitemap"></i>
                            </button>
                            <button class="btn btn-outline-primary btn-sm" data-view="escalation" title="Vista Escalamiento">
                                <i class="fas fa-level-up-alt"></i>
                            </button>
                            <button class="btn btn-outline-primary btn-sm" data-view="list" title="Vista Lista">
                                <i class="fas fa-list"></i>
                            </button>
                        </div>
                        <div class="btn-group me-2">
                            <button class="btn btn-outline-secondary btn-sm" id="btn-zoom-in" title="Acercar">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" id="btn-zoom-reset" title="Restablecer">
                                <i class="fas fa-compress-arrows-alt"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" id="btn-zoom-out" title="Alejar">
                                <i class="fas fa-search-minus"></i>
                            </button>
                        </div>
                        <button class="btn btn-outline-success btn-sm me-2" id="btn-export-chart" title="Exportar imagen">
                            <i class="fas fa-download"></i> Exportar
                        </button>
                        <button class="btn btn-primary btn-sm" id="btn-add-position" title="Nueva posición">
                            <i class="fas fa-plus"></i> Nueva Posición
                        </button>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="orgchart-stats row g-3 mb-3" id="orgchart-stats">
                    <div class="col-md-2">
                        <div class="stat-card">
                            <div class="stat-icon bg-primary"><i class="fas fa-boxes"></i></div>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-positions">0</span>
                                <span class="stat-label">Posiciones</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="stat-card">
                            <div class="stat-icon bg-info"><i class="fas fa-layer-group"></i></div>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-levels">0</span>
                                <span class="stat-label">Niveles</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="stat-card">
                            <div class="stat-icon bg-success"><i class="fas fa-code-branch"></i></div>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-branches">0</span>
                                <span class="stat-label">Ramas</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="stat-card">
                            <div class="stat-icon bg-warning"><i class="fas fa-check-double"></i></div>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-approvers">0</span>
                                <span class="stat-label">Aprobadores</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="stat-card">
                            <div class="stat-icon bg-secondary"><i class="fas fa-users"></i></div>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-with-position">0</span>
                                <span class="stat-label">Con posición</span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="stat-card">
                            <div class="stat-icon bg-danger"><i class="fas fa-user-slash"></i></div>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-without-position">0</span>
                                <span class="stat-label">Sin posición</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart Container -->
                <div class="orgchart-viewport" id="orgchart-viewport">
                    <div class="orgchart-canvas" id="orgchart-canvas">
                        <svg id="orgchart-svg" width="100%" height="100%">
                            <defs>
                                <!-- Marcador de flecha -->
                                <marker id="arrowhead" markerWidth="10" markerHeight="7"
                                    refX="10" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8"/>
                                </marker>
                                <!-- Sombra para nodos -->
                                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#00000030"/>
                                </filter>
                            </defs>
                            <g id="orgchart-edges"></g>
                            <g id="orgchart-nodes"></g>
                        </svg>
                    </div>
                </div>

                <!-- Legend -->
                <div class="orgchart-legend">
                    <span class="legend-title">Niveles:</span>
                    <div class="legend-items" id="orgchart-legend-items"></div>
                    <span class="legend-separator">|</span>
                    <span class="legend-item">
                        <span class="legend-icon" style="border: 2px solid #F59E0B;">⚡</span>
                        Punto de escalamiento
                    </span>
                    <span class="legend-item">
                        <span class="legend-icon" style="background: #10B981;">✓</span>
                        Puede aprobar
                    </span>
                </div>

                <!-- Detail Panel (sidebar) -->
                <div class="orgchart-detail-panel" id="orgchart-detail-panel" style="display: none;">
                    <div class="detail-header">
                        <h5 id="detail-position-name">Posición</h5>
                        <button class="btn-close" id="btn-close-detail"></button>
                    </div>
                    <div class="detail-body" id="detail-body">
                        <!-- Se llena dinámicamente -->
                    </div>
                </div>
            </div>

            <style>
                .orgchart-module {
                    background: var(--card-bg, #1e1e2d);
                    border-radius: 12px;
                    padding: 20px;
                    position: relative;
                }

                .orgchart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .orgchart-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .orgchart-title h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    color: var(--text-primary, #fff);
                }

                .orgchart-title i {
                    font-size: 1.5rem;
                    color: #3B82F6;
                }

                .orgchart-stats {
                    margin-bottom: 20px;
                }

                .stat-card {
                    background: var(--card-bg-secondary, #2a2a3d);
                    border-radius: 10px;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .stat-icon {
                    width: 45px;
                    height: 45px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    color: white;
                }

                .stat-info {
                    display: flex;
                    flex-direction: column;
                }

                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary, #fff);
                }

                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-secondary, #9CA3AF);
                    text-transform: uppercase;
                }

                .orgchart-viewport {
                    background: var(--card-bg-secondary, #2a2a3d);
                    border-radius: 10px;
                    overflow: hidden;
                    position: relative;
                    height: 500px;
                    cursor: grab;
                }

                .orgchart-viewport:active {
                    cursor: grabbing;
                }

                .orgchart-canvas {
                    width: 100%;
                    height: 100%;
                    transform-origin: center center;
                }

                #orgchart-svg {
                    width: 100%;
                    height: 100%;
                }

                .org-node {
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .org-node:hover {
                    transform: scale(1.05);
                }

                .org-node-rect {
                    rx: 8;
                    ry: 8;
                    filter: url(#shadow);
                }

                .org-node-title {
                    font-weight: 600;
                    fill: white;
                    font-size: 12px;
                }

                .org-node-code {
                    fill: rgba(255,255,255,0.7);
                    font-size: 10px;
                }

                .org-node-count {
                    fill: rgba(255,255,255,0.9);
                    font-size: 10px;
                }

                .org-edge {
                    stroke: #94A3B8;
                    stroke-width: 2;
                    fill: none;
                }

                .orgchart-legend {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 15px;
                    background: var(--card-bg-secondary, #2a2a3d);
                    border-radius: 10px;
                    margin-top: 15px;
                    flex-wrap: wrap;
                }

                .legend-title {
                    font-weight: 600;
                    color: var(--text-primary, #fff);
                }

                .legend-items {
                    display: flex;
                    gap: 15px;
                    flex-wrap: wrap;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                    color: var(--text-secondary, #9CA3AF);
                }

                .legend-icon {
                    width: 20px;
                    height: 20px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: white;
                }

                .legend-separator {
                    color: var(--text-secondary, #9CA3AF);
                }

                .orgchart-detail-panel {
                    position: absolute;
                    right: 20px;
                    top: 80px;
                    width: 320px;
                    background: var(--card-bg, #1e1e2d);
                    border: 1px solid var(--border-color, #3a3a4d);
                    border-radius: 12px;
                    box-shadow: -4px 0 20px rgba(0,0,0,0.3);
                    z-index: 100;
                    max-height: calc(100% - 100px);
                    overflow-y: auto;
                }

                .detail-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    border-bottom: 1px solid var(--border-color, #3a3a4d);
                }

                .detail-header h5 {
                    margin: 0;
                    color: var(--text-primary, #fff);
                }

                .detail-body {
                    padding: 15px;
                }

                .detail-section {
                    margin-bottom: 15px;
                }

                .detail-section-title {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: var(--text-secondary, #9CA3AF);
                    margin-bottom: 8px;
                }

                .detail-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid var(--border-color, #3a3a4d);
                }

                .detail-item:last-child {
                    border-bottom: none;
                }

                .detail-label {
                    color: var(--text-secondary, #9CA3AF);
                    font-size: 0.9rem;
                }

                .detail-value {
                    color: var(--text-primary, #fff);
                    font-weight: 500;
                }

                .detail-badge {
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .detail-employees-list {
                    max-height: 200px;
                    overflow-y: auto;
                }

                .detail-employee {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px;
                    background: var(--card-bg-secondary, #2a2a3d);
                    border-radius: 8px;
                    margin-bottom: 8px;
                }

                .detail-employee-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #3B82F6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                }

                .detail-employee-info {
                    flex: 1;
                }

                .detail-employee-name {
                    color: var(--text-primary, #fff);
                    font-size: 0.9rem;
                }

                .detail-employee-email {
                    color: var(--text-secondary, #9CA3AF);
                    font-size: 0.75rem;
                }

                /* Lista view */
                .orgchart-list-view {
                    background: var(--card-bg-secondary, #2a2a3d);
                    border-radius: 10px;
                    overflow: hidden;
                }

                .orgchart-list-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 15px;
                    border-bottom: 1px solid var(--border-color, #3a3a4d);
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .orgchart-list-item:hover {
                    background: rgba(59, 130, 246, 0.1);
                }

                .list-item-level {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    margin-right: 15px;
                }

                .list-item-info {
                    flex: 1;
                }

                .list-item-name {
                    color: var(--text-primary, #fff);
                    font-weight: 500;
                }

                .list-item-meta {
                    color: var(--text-secondary, #9CA3AF);
                    font-size: 0.85rem;
                }

                .list-item-badges {
                    display: flex;
                    gap: 8px;
                }

                .list-item-indent {
                    width: 20px;
                    display: inline-block;
                }

                @media (max-width: 768px) {
                    .orgchart-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .orgchart-detail-panel {
                        position: fixed;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        top: auto;
                        width: 100%;
                        max-height: 60vh;
                        border-radius: 20px 20px 0 0;
                    }

                    .orgchart-viewport {
                        height: 350px;
                    }
                }
            </style>
        `;

        this.bindEvents();
        this.renderLegend();
    }

    /**
     * Vincular eventos
     */
    bindEvents() {
        // Botones de vista
        this.container.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setViewMode(e.currentTarget.dataset.view);
            });
        });

        // Zoom
        document.getElementById('btn-zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('btn-zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('btn-zoom-reset')?.addEventListener('click', () => this.zoomReset());

        // Export
        document.getElementById('btn-export-chart')?.addEventListener('click', () => this.exportChart());

        // Nueva posición
        document.getElementById('btn-add-position')?.addEventListener('click', () => this.showPositionModal());

        // Cerrar panel de detalles
        document.getElementById('btn-close-detail')?.addEventListener('click', () => this.hideDetailPanel());

        // Pan en el viewport
        const viewport = document.getElementById('orgchart-viewport');
        if (viewport) {
            viewport.addEventListener('mousedown', (e) => this.startDrag(e));
            viewport.addEventListener('mousemove', (e) => this.drag(e));
            viewport.addEventListener('mouseup', () => this.endDrag());
            viewport.addEventListener('mouseleave', () => this.endDrag());
            viewport.addEventListener('wheel', (e) => this.handleWheel(e));
        }
    }

    /**
     * Cargar datos
     */
    async loadData() {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Cargar en paralelo
            const [flowchartRes, statsRes, positionsRes] = await Promise.all([
                fetch('/api/v1/organizational/hierarchy/flowchart', { headers }),
                fetch('/api/v1/organizational/hierarchy/stats', { headers }),
                fetch('/api/v1/organizational/positions?include_employees=true', { headers })
            ]);

            const [flowchartData, statsData, positionsData] = await Promise.all([
                flowchartRes.json(),
                statsRes.json(),
                positionsRes.json()
            ]);

            if (flowchartData.success) {
                this.flowchartData = flowchartData.data;
            }

            if (statsData.success) {
                this.stats = statsData.data;
                this.updateStats();
            }

            if (positionsData.success) {
                this.positions = positionsData.data;
                document.getElementById('orgchart-position-count').textContent =
                    `${this.positions.length} posiciones`;
            }

            this.renderChart();

        } catch (error) {
            console.error('[ORGCHART] Error loading data:', error);
            this.showError('Error cargando organigrama');
        }
    }

    /**
     * Actualizar estadísticas
     */
    updateStats() {
        if (!this.stats) return;

        const pos = this.stats.positions || {};
        const emp = this.stats.employees || {};

        document.getElementById('stat-positions').textContent = pos.total_positions || 0;
        document.getElementById('stat-levels').textContent = pos.total_levels || 0;
        document.getElementById('stat-branches').textContent = pos.total_branches || 0;
        document.getElementById('stat-approvers').textContent = pos.approver_positions || 0;
        document.getElementById('stat-with-position').textContent = emp.with_position || 0;
        document.getElementById('stat-without-position').textContent = emp.without_position || 0;
    }

    /**
     * Renderizar leyenda
     */
    renderLegend() {
        const container = document.getElementById('orgchart-legend-items');
        if (!container) return;

        let html = '';
        for (const [level, color] of Object.entries(this.levelColors)) {
            if (level === '99') continue;
            html += `
                <span class="legend-item">
                    <span class="legend-icon" style="background: ${color};">${level}</span>
                    ${this.levelNames[level]}
                </span>
            `;
        }
        container.innerHTML = html;
    }

    /**
     * Renderizar el gráfico según el modo actual
     */
    renderChart() {
        switch (this.viewMode) {
            case 'orgchart':
                this.renderOrgChart();
                break;
            case 'escalation':
                this.renderEscalationView();
                break;
            case 'list':
                this.renderListView();
                break;
        }
    }

    /**
     * Renderizar organigrama SVG
     */
    renderOrgChart() {
        if (!this.flowchartData) {
            console.warn('[ORGCHART] No flowchart data available');
            return;
        }

        const svgNS = 'http://www.w3.org/2000/svg';
        const nodesGroup = document.getElementById('orgchart-nodes');
        const edgesGroup = document.getElementById('orgchart-edges');

        if (!nodesGroup || !edgesGroup) return;

        // Limpiar
        nodesGroup.innerHTML = '';
        edgesGroup.innerHTML = '';

        const { nodes, edges } = this.flowchartData;

        // Calcular dimensiones y centrar
        const nodeWidth = 180;
        const nodeHeight = 70;
        const viewportWidth = document.getElementById('orgchart-viewport').clientWidth;
        const viewportHeight = document.getElementById('orgchart-viewport').clientHeight;

        // Agrupar nodos por nivel para calcular posiciones
        const levelGroups = {};
        nodes.forEach(node => {
            const level = node.data.level || 99;
            if (!levelGroups[level]) levelGroups[level] = [];
            levelGroups[level].push(node);
        });

        // Calcular posiciones
        const levelSpacing = 120;
        const nodeSpacing = 200;
        let maxWidth = 0;

        Object.keys(levelGroups).sort((a, b) => a - b).forEach((level, levelIndex) => {
            const nodesInLevel = levelGroups[level];
            const levelWidth = nodesInLevel.length * nodeSpacing;
            maxWidth = Math.max(maxWidth, levelWidth);

            nodesInLevel.forEach((node, nodeIndex) => {
                const x = (nodeIndex - (nodesInLevel.length - 1) / 2) * nodeSpacing + viewportWidth / 2;
                const y = levelIndex * levelSpacing + 50;
                node.calculatedPosition = { x, y };
            });
        });

        // Renderizar edges primero (para que queden debajo)
        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (sourceNode?.calculatedPosition && targetNode?.calculatedPosition) {
                const path = document.createElementNS(svgNS, 'path');

                const sx = sourceNode.calculatedPosition.x;
                const sy = sourceNode.calculatedPosition.y + nodeHeight;
                const tx = targetNode.calculatedPosition.x;
                const ty = targetNode.calculatedPosition.y;

                // Curva Bezier para conexión suave
                const midY = (sy + ty) / 2;
                const d = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;

                path.setAttribute('d', d);
                path.setAttribute('class', 'org-edge');
                path.setAttribute('marker-end', 'url(#arrowhead)');

                edgesGroup.appendChild(path);
            }
        });

        // Renderizar nodos
        nodes.forEach(node => {
            if (!node.calculatedPosition) return;

            const g = document.createElementNS(svgNS, 'g');
            g.setAttribute('class', 'org-node');
            g.setAttribute('transform', `translate(${node.calculatedPosition.x - nodeWidth/2}, ${node.calculatedPosition.y})`);
            g.setAttribute('data-id', node.data.id);

            // Rectángulo principal
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('class', 'org-node-rect');
            rect.setAttribute('width', nodeWidth);
            rect.setAttribute('height', nodeHeight);
            rect.setAttribute('fill', node.data.color || this.levelColors[node.data.level] || '#6B7280');

            // Borde especial si es punto de escalamiento
            if (node.data.isEscalation) {
                rect.setAttribute('stroke', '#F59E0B');
                rect.setAttribute('stroke-width', '3');
            }

            // Nombre de la posición
            const title = document.createElementNS(svgNS, 'text');
            title.setAttribute('class', 'org-node-title');
            title.setAttribute('x', nodeWidth / 2);
            title.setAttribute('y', 25);
            title.setAttribute('text-anchor', 'middle');
            title.textContent = this.truncateText(node.data.label, 20);

            // Código
            const code = document.createElementNS(svgNS, 'text');
            code.setAttribute('class', 'org-node-code');
            code.setAttribute('x', nodeWidth / 2);
            code.setAttribute('y', 42);
            code.setAttribute('text-anchor', 'middle');
            code.textContent = node.data.code || '';

            // Contador de empleados
            const count = document.createElementNS(svgNS, 'text');
            count.setAttribute('class', 'org-node-count');
            count.setAttribute('x', nodeWidth / 2);
            count.setAttribute('y', 58);
            count.setAttribute('text-anchor', 'middle');
            count.textContent = `👤 ${node.data.employeeCount || 0}`;

            // Indicador de aprobación
            if (node.data.canApprove) {
                const approveIcon = document.createElementNS(svgNS, 'text');
                approveIcon.setAttribute('x', nodeWidth - 15);
                approveIcon.setAttribute('y', 18);
                approveIcon.setAttribute('font-size', '14');
                approveIcon.textContent = '✓';
                approveIcon.setAttribute('fill', '#10B981');
                g.appendChild(approveIcon);
            }

            g.appendChild(rect);
            g.appendChild(title);
            g.appendChild(code);
            g.appendChild(count);

            // Evento click
            g.addEventListener('click', () => this.showNodeDetail(node.data.id));

            nodesGroup.appendChild(g);
        });

        // Aplicar zoom/pan actual
        this.applyTransform();
    }

    /**
     * Renderizar vista de lista
     */
    renderListView() {
        const viewport = document.getElementById('orgchart-viewport');
        if (!viewport) return;

        let html = '<div class="orgchart-list-view">';

        // Ordenar por nivel y rama
        const sorted = [...this.positions].sort((a, b) => {
            if (a.hierarchy_level !== b.hierarchy_level) {
                return (a.hierarchy_level || 99) - (b.hierarchy_level || 99);
            }
            return (a.branch_code || '').localeCompare(b.branch_code || '');
        });

        sorted.forEach(pos => {
            const level = pos.hierarchy_level ?? 99;
            const color = this.levelColors[level] || '#6B7280';
            const indent = level * 20;

            html += `
                <div class="orgchart-list-item" data-id="${pos.id}" style="padding-left: ${indent + 15}px;">
                    <div class="list-item-level" style="background: ${color};">
                        ${level}
                    </div>
                    <div class="list-item-info">
                        <div class="list-item-name">${pos.position_name}</div>
                        <div class="list-item-meta">
                            ${pos.position_code}
                            ${pos.branch_code ? `• Rama: ${pos.branch_code}` : ''}
                            • ${pos.employee_count || 0} empleado(s)
                        </div>
                    </div>
                    <div class="list-item-badges">
                        ${pos.can_approve_permissions ? '<span class="badge bg-success">Aprobador</span>' : ''}
                        ${pos.is_escalation_point ? '<span class="badge bg-warning">Escalamiento</span>' : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        viewport.innerHTML = html;

        // Agregar eventos de click
        viewport.querySelectorAll('.orgchart-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                this.showNodeDetail(parseInt(id));
            });
        });
    }

    /**
     * Renderizar vista de escalamiento
     */
    renderEscalationView() {
        const viewport = document.getElementById('orgchart-viewport');
        if (!viewport) return;

        // Filtrar solo posiciones aprobadoras
        const approvers = this.positions.filter(p => p.can_approve_permissions);

        let html = `
            <div class="orgchart-list-view">
                <div class="p-3 border-bottom" style="background: var(--card-bg);">
                    <h5 class="mb-2"><i class="fas fa-level-up-alt"></i> Cadena de Escalamiento</h5>
                    <p class="text-muted mb-0">Posiciones con capacidad de aprobar solicitudes</p>
                </div>
        `;

        // Ordenar por nivel jerárquico
        approvers.sort((a, b) => (a.hierarchy_level || 99) - (b.hierarchy_level || 99));

        approvers.forEach((pos, index) => {
            const level = pos.hierarchy_level ?? 99;
            const color = this.levelColors[level] || '#6B7280';
            const maxDays = pos.max_approval_days || 'Sin límite';

            html += `
                <div class="orgchart-list-item" data-id="${pos.id}">
                    <div class="list-item-level" style="background: ${color};">
                        ${index + 1}
                    </div>
                    <div class="list-item-info">
                        <div class="list-item-name">${pos.position_name}</div>
                        <div class="list-item-meta">
                            Nivel ${level} • Máx. días: ${maxDays}
                        </div>
                    </div>
                    <div class="list-item-badges">
                        <span class="badge bg-info">${pos.employee_count || 0} empleados</span>
                    </div>
                </div>
                ${index < approvers.length - 1 ? '<div class="text-center py-2"><i class="fas fa-arrow-down text-muted"></i></div>' : ''}
            `;
        });

        html += '</div>';
        viewport.innerHTML = html;

        // Agregar eventos
        viewport.querySelectorAll('.orgchart-list-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showNodeDetail(parseInt(item.dataset.id));
            });
        });
    }

    /**
     * Mostrar detalle de un nodo
     */
    async showNodeDetail(positionId) {
        const panel = document.getElementById('orgchart-detail-panel');
        const body = document.getElementById('detail-body');
        const titleEl = document.getElementById('detail-position-name');

        if (!panel || !body) return;

        // Buscar posición
        const position = this.positions.find(p => p.id === positionId);
        if (!position) {
            console.warn('[ORGCHART] Position not found:', positionId);
            return;
        }

        titleEl.textContent = position.position_name;

        const level = position.hierarchy_level ?? 99;
        const levelColor = this.levelColors[level] || '#6B7280';

        body.innerHTML = `
            <div class="detail-section">
                <div class="detail-section-title">Información General</div>
                <div class="detail-item">
                    <span class="detail-label">Código</span>
                    <span class="detail-value">${position.position_code}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Nivel</span>
                    <span class="detail-badge" style="background: ${levelColor}; color: white;">
                        ${level} - ${this.levelNames[level] || 'Sin clasificar'}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Rama</span>
                    <span class="detail-value">${position.branch_code || 'No asignada'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Posición Superior</span>
                    <span class="detail-value">${position.parent_position_name || 'Ninguna (raíz)'}</span>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Capacidades de Aprobación</div>
                <div class="detail-item">
                    <span class="detail-label">Puede aprobar</span>
                    <span class="detail-badge ${position.can_approve_permissions ? 'bg-success' : 'bg-secondary'}">
                        ${position.can_approve_permissions ? 'Sí' : 'No'}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Máx. días</span>
                    <span class="detail-value">${position.max_approval_days || 'Sin límite'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Punto de escalamiento</span>
                    <span class="detail-badge ${position.is_escalation_point ? 'bg-warning' : 'bg-secondary'}">
                        ${position.is_escalation_point ? 'Sí' : 'No'}
                    </span>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Clasificación Laboral</div>
                <div class="detail-item">
                    <span class="detail-label">Categoría</span>
                    <span class="detail-value">${position.work_category || 'administrativo'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Ambiente</span>
                    <span class="detail-value">${position.work_environment || 'oficina'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Demanda física</span>
                    <span class="detail-value">${position.physical_demand_level || 1}/5</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Riesgo</span>
                    <span class="detail-value">${position.risk_exposure_level || 1}/5</span>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-section-title">Empleados (${position.employees?.length || 0})</div>
                <div class="detail-employees-list">
                    ${this.renderEmployeesList(position.employees || [])}
                </div>
            </div>

            <div class="detail-section">
                <button class="btn btn-primary btn-sm w-100 mb-2" onclick="orgchartModule.editPosition(${position.id})">
                    <i class="fas fa-edit"></i> Editar Posición
                </button>
                <button class="btn btn-outline-danger btn-sm w-100" onclick="orgchartModule.deletePosition(${position.id})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;

        panel.style.display = 'block';
        this.selectedNode = positionId;
    }

    /**
     * Renderizar lista de empleados
     */
    renderEmployeesList(employees) {
        if (!employees.length) {
            return '<p class="text-muted text-center py-3">Sin empleados asignados</p>';
        }

        return employees.map(emp => {
            const initials = `${(emp.firstName || emp.first_name || '?')[0]}${(emp.lastName || emp.last_name || '?')[0]}`;
            return `
                <div class="detail-employee">
                    <div class="detail-employee-avatar">${initials.toUpperCase()}</div>
                    <div class="detail-employee-info">
                        <div class="detail-employee-name">${emp.firstName || emp.first_name} ${emp.lastName || emp.last_name}</div>
                        <div class="detail-employee-email">${emp.email}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Ocultar panel de detalles
     */
    hideDetailPanel() {
        const panel = document.getElementById('orgchart-detail-panel');
        if (panel) panel.style.display = 'none';
        this.selectedNode = null;
    }

    /**
     * Cambiar modo de vista
     */
    setViewMode(mode) {
        this.viewMode = mode;

        // Actualizar botones activos
        this.container.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });

        // Mostrar/ocultar controles de zoom según vista
        const zoomControls = this.container.querySelector('.btn-group:has(#btn-zoom-in)');
        if (zoomControls) {
            zoomControls.style.display = mode === 'orgchart' ? 'flex' : 'none';
        }

        this.renderChart();
    }

    /**
     * Funciones de zoom
     */
    zoomIn() {
        this.zoom = Math.min(this.zoom + 0.1, 2);
        this.applyTransform();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom - 0.1, 0.5);
        this.applyTransform();
    }

    zoomReset() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        this.zoom = Math.max(0.5, Math.min(2, this.zoom + delta));
        this.applyTransform();
    }

    /**
     * Funciones de pan (arrastrar)
     */
    startDrag(e) {
        if (this.viewMode !== 'orgchart') return;
        this.isDragging = true;
        this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
    }

    drag(e) {
        if (!this.isDragging) return;
        this.panX = e.clientX - this.dragStart.x;
        this.panY = e.clientY - this.dragStart.y;
        this.applyTransform();
    }

    endDrag() {
        this.isDragging = false;
    }

    /**
     * Aplicar transformación
     */
    applyTransform() {
        const canvas = document.getElementById('orgchart-canvas');
        if (canvas) {
            canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        }
    }

    /**
     * Exportar como imagen
     */
    async exportChart() {
        const svg = document.getElementById('orgchart-svg');
        if (!svg) return;

        try {
            // Clonar SVG
            const clone = svg.cloneNode(true);
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            // Convertir a data URL
            const data = new XMLSerializer().serializeToString(clone);
            const blob = new Blob([data], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            // Descargar
            const a = document.createElement('a');
            a.href = url;
            a.download = `organigrama_${new Date().toISOString().split('T')[0]}.svg`;
            a.click();

            URL.revokeObjectURL(url);

            this.showSuccess('Organigrama exportado correctamente');
        } catch (error) {
            console.error('[ORGCHART] Export error:', error);
            this.showError('Error exportando organigrama');
        }
    }

    /**
     * Mostrar modal de nueva posición
     */
    showPositionModal(positionId = null) {
        const isEdit = !!positionId;
        const position = isEdit ? this.positions.find(p => p.id === positionId) : null;

        const modal = document.createElement('div');
        modal.className = 'org-modal-overlay';
        modal.style.display = 'flex';
        modal.id = 'position-modal';

        // Construir opciones de posición padre
        const parentOptions = this.positions
            .filter(p => !isEdit || p.id !== positionId)
            .map(p => `<option value="${p.id}" ${position?.parent_position_id === p.id ? 'selected' : ''}>${p.position_name} (Nivel ${p.hierarchy_level})</option>`)
            .join('');

        modal.innerHTML = `
            <div class="org-modal" style="max-width: 800px;">
                <div class="org-modal-header">
                    <h3 class="org-modal-title">
                        <i class="fas fa-${isEdit ? 'edit' : 'plus'}"></i>
                        ${isEdit ? 'Editar' : 'Nueva'} Posición Organizacional
                    </h3>
                    <button type="button" class="org-modal-close" id="btn-close-modal">&times;</button>
                </div>
                <div class="org-modal-body">
                    <form id="position-form">
                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Código *</label>
                                <input type="text" class="org-form-input" name="position_code"
                                       value="${position?.position_code || ''}" required
                                       placeholder="Ej: GER-001">
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Nombre *</label>
                                <input type="text" class="org-form-input" name="position_name"
                                       value="${position?.position_name || ''}" required
                                       placeholder="Ej: Gerente General">
                            </div>
                        </div>
                        <div class="org-form-group">
                            <label class="org-form-label">Descripción</label>
                            <textarea class="org-form-textarea" name="description" rows="2"
                                      placeholder="Descripción de la posición">${position?.description || ''}</textarea>
                        </div>
                        <div class="org-form-row">
                            <div class="org-form-group">
                                <label class="org-form-label">Posición Superior</label>
                                <select class="org-form-select" name="parent_position_id">
                                    <option value="">-- Ninguna (raíz) --</option>
                                    ${parentOptions}
                                </select>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Nivel Jerárquico *</label>
                                <select class="org-form-select" name="hierarchy_level" required>
                                    <option value="0" ${position?.hierarchy_level === 0 ? 'selected' : ''}>0 - Dirección</option>
                                    <option value="1" ${position?.hierarchy_level === 1 ? 'selected' : ''}>1 - Gerencia</option>
                                    <option value="2" ${position?.hierarchy_level === 2 ? 'selected' : ''}>2 - Jefatura</option>
                                    <option value="3" ${position?.hierarchy_level === 3 ? 'selected' : ''}>3 - Supervisión</option>
                                    <option value="4" ${position?.hierarchy_level === 4 ? 'selected' : ''}>4 - Operativo</option>
                                </select>
                            </div>
                        </div>
                        <div class="org-form-group">
                            <label class="org-form-label">Código de Rama</label>
                            <input type="text" class="org-form-input" name="branch_code"
                                   value="${position?.branch_code || ''}"
                                   placeholder="Ej: ADM, PROD">
                        </div>
                        <div class="org-form-row" style="grid-template-columns: 1fr 1fr 1fr;">
                            <div class="org-form-group">
                                <label class="org-form-label">Color</label>
                                <input type="color" class="org-form-input" style="height: 42px; padding: 4px;"
                                       name="color_hex" value="${position?.color_hex || '#3B82F6'}">
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Categoría Trabajo</label>
                                <select class="org-form-select" name="work_category">
                                    <option value="administrativo" ${position?.work_category === 'administrativo' ? 'selected' : ''}>Administrativo</option>
                                    <option value="operativo" ${position?.work_category === 'operativo' ? 'selected' : ''}>Operativo</option>
                                    <option value="tecnico" ${position?.work_category === 'tecnico' ? 'selected' : ''}>Técnico</option>
                                    <option value="comercial" ${position?.work_category === 'comercial' ? 'selected' : ''}>Comercial</option>
                                    <option value="gerencial" ${position?.work_category === 'gerencial' ? 'selected' : ''}>Gerencial</option>
                                    <option value="mixto" ${position?.work_category === 'mixto' ? 'selected' : ''}>Mixto</option>
                                </select>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Ambiente Trabajo</label>
                                <select class="org-form-select" name="work_environment">
                                    <option value="oficina" ${position?.work_environment === 'oficina' ? 'selected' : ''}>Oficina</option>
                                    <option value="planta" ${position?.work_environment === 'planta' ? 'selected' : ''}>Planta</option>
                                    <option value="exterior" ${position?.work_environment === 'exterior' ? 'selected' : ''}>Exterior</option>
                                    <option value="remoto" ${position?.work_environment === 'remoto' ? 'selected' : ''}>Remoto</option>
                                    <option value="mixto" ${position?.work_environment === 'mixto' ? 'selected' : ''}>Mixto</option>
                                </select>
                            </div>
                        </div>

                        <div class="org-form-group" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--org-border);">
                            <h6 style="margin-bottom: 16px; color: var(--org-text-primary);"><i class="fas fa-check-circle"></i> Capacidades de Aprobación</h6>
                        </div>
                        <div class="org-form-row" style="grid-template-columns: 1fr 1fr 1fr;">
                            <div class="org-form-group">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" name="can_approve_permissions"
                                           ${position?.can_approve_permissions ? 'checked' : ''}>
                                    <label class="form-check-label" style="color: var(--org-text-secondary);">Puede aprobar solicitudes</label>
                                </div>
                            </div>
                            <div class="org-form-group">
                                <label class="org-form-label">Máx. días aprobación</label>
                                <input type="number" class="org-form-input" name="max_approval_days"
                                       value="${position?.max_approval_days || 0}" min="0"
                                       placeholder="0 = sin límite">
                            </div>
                            <div class="org-form-group">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" name="is_escalation_point"
                                           ${position?.is_escalation_point ? 'checked' : ''}>
                                    <label class="form-check-label" style="color: var(--org-text-secondary);">Punto de escalamiento</label>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="org-modal-footer">
                    <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="btn-save-position">
                        <i class="fas fa-save"></i> ${isEdit ? 'Actualizar' : 'Crear'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Eventos
        document.getElementById('btn-close-modal')?.addEventListener('click', () => modal.remove());
        document.getElementById('btn-cancel-modal')?.addEventListener('click', () => modal.remove());
        document.getElementById('btn-save-position')?.addEventListener('click', () => this.savePosition(positionId));

        // Cerrar con click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Guardar posición
     */
    async savePosition(positionId = null) {
        const form = document.getElementById('position-form');
        const formData = new FormData(form);

        const data = {
            position_code: formData.get('position_code'),
            position_name: formData.get('position_name'),
            description: formData.get('description'),
            parent_position_id: formData.get('parent_position_id') || null,
            hierarchy_level: parseInt(formData.get('hierarchy_level')),
            branch_code: formData.get('branch_code') || null,
            color_hex: formData.get('color_hex'),
            work_category: formData.get('work_category'),
            work_environment: formData.get('work_environment'),
            can_approve_permissions: formData.get('can_approve_permissions') === 'on',
            max_approval_days: parseInt(formData.get('max_approval_days')) || 0,
            is_escalation_point: formData.get('is_escalation_point') === 'on'
        };

        try {
            const token = localStorage.getItem('token');
            const url = positionId
                ? `/api/v1/organizational/positions/${positionId}`
                : '/api/v1/organizational/positions';

            const response = await fetch(url, {
                method: positionId ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                document.getElementById('position-modal')?.remove();
                this.showSuccess(positionId ? 'Posición actualizada' : 'Posición creada');
                await this.loadData();
            } else {
                this.showError(result.message || 'Error guardando posición');
            }
        } catch (error) {
            console.error('[ORGCHART] Save error:', error);
            this.showError('Error de conexión');
        }
    }

    /**
     * Editar posición
     */
    editPosition(positionId) {
        this.hideDetailPanel();
        this.showPositionModal(positionId);
    }

    /**
     * Eliminar posición
     */
    async deletePosition(positionId) {
        const position = this.positions.find(p => p.id === positionId);
        if (!position) return;

        if (!confirm(`¿Eliminar la posición "${position.position_name}"?`)) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/organizational/positions/${positionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (result.success) {
                this.hideDetailPanel();
                this.showSuccess('Posición eliminada');
                await this.loadData();
            } else {
                this.showError(result.message || 'Error eliminando posición');
            }
        } catch (error) {
            console.error('[ORGCHART] Delete error:', error);
            this.showError('Error de conexión');
        }
    }

    /**
     * Truncar texto
     */
    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    /**
     * Mostrar mensaje de éxito
     */
    showSuccess(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            alert(message);
        }
    }

    /**
     * Mostrar mensaje de error
     */
    showError(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: message
            });
        } else {
            alert('Error: ' + message);
        }
    }
}

// Instancia global - asignada a window para acceso desde otros módulos
window.orgchartModule = new OrganizationalChartModule();
console.log('📊 [ORGCHART] Módulo cargado y asignado a window.orgchartModule');

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrganizationalChartModule;
}
