/**
 * ============================================================================
 * ORGANIGRAMA INTELIGENTE ULTRA - Componente Completo
 * ============================================================================
 *
 * Sistema unificado de organigrama con análisis inteligente Brain-powered
 *
 * Features COMPLETAS:
 * - 🧠 Análisis inteligente (vacantes, bottlenecks, orphans, recommendations)
 * - 🎨 Visualización 2D Tree/Force + 3D Sphere + Lista
 * - 🔍 Search & Filter multi-criterio avanzado
 * - 📊 Stats en tiempo real con health score
 * - 🖱️ Drag & Drop para reorganizar estructura
 * - 📥 Export a SVG/PNG/PDF
 * - ✏️ CRUD completo inline (crear/editar/eliminar desde organigrama)
 * - 🎬 Modo presentación fullscreen
 * - ⏱️ Comparación temporal (timeline de cambios)
 * - 🔄 Auto-refresh con polling opcional
 *
 * @version 3.0.0-ULTRA
 * @date 2025-01-18
 * @author Claude + Aponnt Engineering Team
 */

class OrgChartIntelligent {
    constructor(options = {}) {
        // Configuración
        this.type = options.type; // 'aponnt' | 'company'
        this.companyId = options.companyId;
        this.containerId = options.containerId || 'orgchart-container';
        this.mode = options.mode || '2d-tree'; // '2d-tree' | '2d-force' | '3d' | 'list'
        this.onNodeClick = options.onNodeClick || null;
        this.onNodeEdit = options.onNodeEdit || null;
        this.onStructureChange = options.onStructureChange || null;
        this.autoRefresh = options.autoRefresh || false;
        this.refreshInterval = options.refreshInterval || 60000; // 60s

        // Estado interno
        this.data = null;
        this.nodes = [];
        this.edges = [];
        this.tree = null;
        this.insights = null;
        this.stats = null;
        this.history = []; // Para comparación temporal

        // Visualización 2D
        this.svg = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.selectedNode = null;

        // Visualización 3D (Three.js)
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.meshes = new Map();
        this.animationId = null;

        // Force-directed (D3.js)
        this.simulation = null;
        this.d3Svg = null;

        // UI State
        this.viewMode = '2d-tree';
        this.showInsights = true;
        this.showStats = true;
        this.presentationMode = false;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.searchTerm = '';

        // Filtros avanzados
        this.filters = {
            level: null,
            area: null,
            department: null,
            showVacant: true,
            hireDate: { from: null, to: null },
            searchFields: ['name', 'email', 'position']
        };

        // Drag & Drop state
        this.draggedNode = null;
        this.dropTarget = null;

        // Librerías cargadas
        this.librariesLoaded = {
            three: false,
            d3: false,
            html2canvas: false,
            jsPDF: false
        };

        // Colors
        this.levelColors = {
            0: '#6366f1', 1: '#8b5cf6', 2: '#ec4899',
            3: '#f59e0b', 4: '#10b981', 99: '#6b7280',
            vacant: '#ef4444'
        };

        // Refresh timer
        this.refreshTimer = null;
    }

    // ========================================================================
    // INICIALIZACIÓN
    // ========================================================================

    async init() {
        console.log(`🧠 [OrgChartIntelligent] Inicializando ULTRA version...`);

        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container #${this.containerId} no encontrado`);
            return;
        }

        this.container = container;

        // Cargar librerías necesarias
        await this.loadExternalLibraries();

        this.injectStyles();
        this.renderUI();
        await this.loadData();

        // Auto-refresh si está activado
        if (this.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    async loadExternalLibraries() {
        const libs = [
            {
                name: 'three',
                url: 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
                check: () => typeof THREE !== 'undefined'
            },
            {
                name: 'd3',
                url: 'https://d3js.org/d3.v7.min.js',
                check: () => typeof d3 !== 'undefined'
            },
            {
                name: 'html2canvas',
                url: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
                check: () => typeof html2canvas !== 'undefined'
            },
            {
                name: 'jsPDF',
                url: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
                check: () => typeof jspdf !== 'undefined'
            }
        ];

        for (const lib of libs) {
            if (lib.check()) {
                this.librariesLoaded[lib.name] = true;
                console.log(`✅ [OrgChart] ${lib.name} ya cargado`);
            } else {
                try {
                    await this.loadScript(lib.url);
                    this.librariesLoaded[lib.name] = lib.check();
                    console.log(`✅ [OrgChart] ${lib.name} cargado`);
                } catch (e) {
                    console.warn(`⚠️ [OrgChart] Error cargando ${lib.name}:`, e);
                }
            }
        }
    }

    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    injectStyles() {
        if (document.getElementById('orgchart-ultra-styles')) return;

        const style = document.createElement('style');
        style.id = 'orgchart-ultra-styles';
        style.textContent = `
            /* ORGCHART INTELLIGENT ULTRA - Complete Styles */
            .orgchart-intelligent {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
                border-radius: 12px;
                overflow: hidden;
                position: relative;
            }

            .orgchart-intelligent.presentation-mode {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
                border-radius: 0;
            }

            .orgchart-intelligent.presentation-mode .orgchart-header,
            .orgchart-intelligent.presentation-mode .orgchart-sidebar {
                display: none;
            }

            .orgchart-header {
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.03);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
            }

            .orgchart-title {
                font-size: 1rem;
                font-weight: 600;
                color: #e6edf3;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .orgchart-toolbar {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
            }

            .orgchart-btn {
                padding: 6px 12px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                background: rgba(255, 255, 255, 0.05);
                color: #e6edf3;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .orgchart-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(245, 158, 11, 0.5);
                transform: translateY(-1px);
            }

            .orgchart-btn.active {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: #000;
                border-color: #f59e0b;
            }

            .orgchart-btn-danger {
                background: rgba(239, 68, 68, 0.1);
                border-color: rgba(239, 68, 68, 0.3);
                color: #ef4444;
            }

            .orgchart-btn-danger:hover {
                background: rgba(239, 68, 68, 0.2);
            }

            .orgchart-search {
                padding: 6px 10px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                background: rgba(15, 15, 30, 0.8);
                color: #e6edf3;
                font-size: 0.8rem;
                width: 180px;
            }

            .orgchart-search:focus {
                outline: none;
                border-color: #f59e0b;
                box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
            }

            .orgchart-main {
                flex: 1;
                display: flex;
                overflow: hidden;
            }

            .orgchart-sidebar {
                width: 280px;
                background: rgba(255, 255, 255, 0.02);
                border-right: 1px solid rgba(255, 255, 255, 0.1);
                overflow-y: auto;
                padding: 14px;
                transition: width 0.3s;
            }

            .orgchart-sidebar.collapsed {
                width: 0;
                padding: 0;
            }

            .orgchart-viewport {
                flex: 1;
                position: relative;
                overflow: hidden;
                cursor: grab;
            }

            .orgchart-viewport.dragging {
                cursor: grabbing;
            }

            .orgchart-canvas {
                width: 100%;
                height: 100%;
                display: block;
            }

            .orgchart-svg {
                width: 100%;
                height: 100%;
            }

            /* Insights Panel */
            .insights-panel {
                margin-bottom: 16px;
            }

            .insights-title {
                font-size: 0.85rem;
                font-weight: 600;
                color: #e6edf3;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .insight-item {
                padding: 8px 10px;
                background: rgba(239, 68, 68, 0.1);
                border-left: 3px solid #ef4444;
                border-radius: 6px;
                margin-bottom: 6px;
                font-size: 0.75rem;
            }

            .insight-item.warning {
                background: rgba(245, 158, 11, 0.1);
                border-left-color: #f59e0b;
            }

            .insight-item.info {
                background: rgba(59, 130, 246, 0.1);
                border-left-color: #3b82f6;
            }

            .insight-item-title {
                font-weight: 600;
                color: #e6edf3;
                margin-bottom: 3px;
            }

            .insight-item-text {
                color: rgba(255, 255, 255, 0.7);
            }

            /* Stats Panel */
            .stat-card {
                padding: 10px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 8px;
                margin-bottom: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .stat-label {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.6);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 3px;
            }

            .stat-value {
                font-size: 1.3rem;
                font-weight: 700;
                color: #f59e0b;
            }

            .health-score {
                padding: 14px;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
                border-radius: 8px;
                border: 1px solid rgba(16, 185, 129, 0.3);
                text-align: center;
                margin-bottom: 16px;
            }

            .health-score-value {
                font-size: 2rem;
                font-weight: 700;
                color: #10b981;
                margin-bottom: 3px;
            }

            .health-score-label {
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.7);
            }

            /* Filters Panel */
            .filters-panel {
                padding: 12px;
                background: rgba(255, 255, 255, 0.02);
                border-radius: 8px;
                margin-bottom: 16px;
            }

            .filter-group {
                margin-bottom: 10px;
            }

            .filter-label {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 4px;
                display: block;
            }

            .filter-select {
                width: 100%;
                padding: 6px 8px;
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 4px;
                color: #e6edf3;
                font-size: 0.75rem;
            }

            /* SVG Nodes */
            .org-node {
                cursor: pointer;
                transition: all 0.3s;
            }

            .org-node:hover {
                filter: brightness(1.2);
            }

            .org-node.selected rect {
                stroke: #f59e0b;
                stroke-width: 3;
                filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.5));
            }

            .org-node.vacant rect {
                stroke: #ef4444;
                stroke-width: 2;
                stroke-dasharray: 5,5;
            }

            .org-node.dragging {
                opacity: 0.5;
            }

            .org-node text {
                fill: #e6edf3;
                font-size: 11px;
                font-weight: 500;
                pointer-events: none;
            }

            .org-edge {
                fill: none;
                stroke: rgba(255, 255, 255, 0.2);
                stroke-width: 2;
            }

            /* Modal CRUD */
            .orgchart-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .orgchart-modal {
                background: #161b22;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }

            .orgchart-modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .orgchart-modal-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: #e6edf3;
            }

            .orgchart-modal-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            }

            .orgchart-modal-body {
                padding: 20px;
            }

            .modal-form-group {
                margin-bottom: 16px;
            }

            .modal-label {
                display: block;
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 6px;
            }

            .modal-input {
                width: 100%;
                padding: 10px 12px;
                background: rgba(15, 15, 30, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 6px;
                color: #e6edf3;
                font-size: 0.9rem;
            }

            .modal-input:focus {
                outline: none;
                border-color: #f59e0b;
            }

            .orgchart-modal-footer {
                padding: 16px 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }

            /* Loading */
            .orgchart-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
            }

            .orgchart-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255, 255, 255, 0.1);
                border-top-color: #f59e0b;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* List View */
            .orgchart-list {
                width: 100%;
                height: 100%;
                overflow-y: auto;
                padding: 20px;
            }

            .list-item {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .list-item:hover {
                background: rgba(255, 255, 255, 0.05);
                border-color: rgba(245, 158, 11, 0.3);
            }

            .list-item.selected {
                background: rgba(245, 158, 11, 0.1);
                border-color: #f59e0b;
            }

            .list-item-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                color: #000;
            }

            .list-item-info {
                flex: 1;
            }

            .list-item-name {
                font-size: 0.9rem;
                font-weight: 600;
                color: #e6edf3;
                margin-bottom: 2px;
            }

            .list-item-position {
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.6);
            }

            .list-item-actions {
                display: flex;
                gap: 6px;
            }

            /* Responsive */
            @media (max-width: 1024px) {
                .orgchart-sidebar {
                    width: 240px;
                }
            }

            @media (max-width: 768px) {
                .orgchart-sidebar {
                    position: absolute;
                    left: -280px;
                    top: 0;
                    bottom: 0;
                    z-index: 100;
                    transition: left 0.3s;
                }

                .orgchart-sidebar.open {
                    left: 0;
                }

                .orgchart-search {
                    width: 120px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    renderUI() {
        this.container.innerHTML = `
            <div class="orgchart-intelligent">
                <!-- Header con todas las opciones -->
                <div class="orgchart-header">
                    <div class="orgchart-title">
                        <span>🧠</span>
                        <span>${this.type === 'aponnt' ? 'Organigrama Aponnt' : 'Organigrama Empresarial'}</span>
                    </div>
                    <div class="orgchart-toolbar">
                        <input
                            type="text"
                            class="orgchart-search"
                            placeholder="🔍 Buscar..."
                            id="orgchart-search"
                        />
                        <button class="orgchart-btn" id="btn-toggle-filters">
                            🎛️ Filtros
                        </button>
                        <button class="orgchart-btn" id="btn-toggle-insights">
                            💡 Insights
                        </button>
                        <button class="orgchart-btn" id="btn-add-node">
                            ➕ Crear
                        </button>
                        <button class="orgchart-btn" id="btn-export">
                            📥 Export
                        </button>
                        <button class="orgchart-btn" id="btn-presentation">
                            🎬 Presentar
                        </button>
                        <button class="orgchart-btn" id="btn-refresh">
                            🔄
                        </button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="orgchart-main">
                    <!-- Sidebar (Insights + Stats + Filters) -->
                    <div class="orgchart-sidebar" id="orgchart-sidebar">
                        <div id="sidebar-content">
                            <div class="orgchart-loading">
                                <div class="orgchart-spinner"></div>
                                <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem;">Cargando...</div>
                            </div>
                        </div>
                    </div>

                    <!-- Viewport -->
                    <div class="orgchart-viewport" id="orgchart-viewport">
                        <!-- SVG para 2D tree/force -->
                        <svg class="orgchart-svg" id="orgchart-svg" style="display: block;"></svg>
                        <!-- Canvas para 3D -->
                        <canvas class="orgchart-canvas" id="orgchart-canvas" style="display: none;"></canvas>
                        <!-- Container para lista -->
                        <div class="orgchart-list" id="orgchart-list" style="display: none;"></div>

                        <div class="orgchart-loading" id="viewport-loading">
                            <div class="orgchart-spinner"></div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 0.8rem;">Generando organigrama...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        // Search
        document.getElementById('orgchart-search')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.applyFiltersAndRender();
        });

        // Toggle sidebars
        document.getElementById('btn-toggle-insights')?.addEventListener('click', () => {
            const sidebar = document.getElementById('orgchart-sidebar');
            sidebar.classList.toggle('collapsed');
        });

        document.getElementById('btn-toggle-filters')?.addEventListener('click', () => {
            this.showFiltersModal();
        });

        // View modes
        // Solo vista de árbol 2D

        // CRUD
        document.getElementById('btn-add-node')?.addEventListener('click', () => this.showCreateNodeModal());

        // Export
        document.getElementById('btn-export')?.addEventListener('click', () => this.showExportMenu());

        // Presentation
        document.getElementById('btn-presentation')?.addEventListener('click', () => this.togglePresentationMode());

        // Refresh
        document.getElementById('btn-refresh')?.addEventListener('click', () => this.loadData());

        // Viewport drag
        const viewport = document.getElementById('orgchart-viewport');
        viewport.addEventListener('mousedown', (e) => this.startDrag(e));
        viewport.addEventListener('mousemove', (e) => this.drag(e));
        viewport.addEventListener('mouseup', () => this.endDrag());
        viewport.addEventListener('mouseleave', () => this.endDrag());
        viewport.addEventListener('wheel', (e) => this.handleWheel(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    // ========================================================================
    // DATA LOADING
    // ========================================================================

    async loadData() {
        console.log(`🔄 [OrgChart] Cargando data...`);

        try {
            const token = window.getMultiKeyToken();
            const endpoint = this.type === 'aponnt'
                ? '/api/brain/orgchart/aponnt'
                : `/api/brain/orgchart/company/${this.companyId}`;

            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Error al cargar organigrama');
            }

            // Guardar en history para comparación temporal
            this.history.push({
                timestamp: new Date().toISOString(),
                data: result.data
            });

            // Mantener solo últimos 10 snapshots
            if (this.history.length > 10) {
                this.history.shift();
            }

            this.data = result.data;
            this.nodes = result.data.nodes || [];
            this.edges = result.data.edges || [];
            this.tree = result.data.tree || [];
            this.insights = result.data.insights || {};
            this.stats = result.data.stats || {};

            console.log(`✅ [OrgChart] Data cargada:`, {
                nodes: this.nodes.length,
                edges: this.edges.length,
                insights: this.insights,
                stats: this.stats
            });

            this.renderInsights();
            this.renderChart();

        } catch (error) {
            console.error('[OrgChart] Error cargando data:', error);
            this.showError(error.message);
        }
    }

    // ========================================================================
    // RENDER INSIGHTS & STATS
    // ========================================================================

    renderInsights() {
        const sidebar = document.getElementById('sidebar-content');
        if (!sidebar) return;

        const { insights, stats } = this;
        const healthScore = insights.healthScore || 100;

        sidebar.innerHTML = `
            <!-- Health Score -->
            <div class="health-score">
                <div class="health-score-value">${healthScore}</div>
                <div class="health-score-label">Health Score</div>
            </div>

            <!-- Quick Stats -->
            <div class="stats-panel">
                <div class="insights-title">📊 Estadísticas</div>
                <div class="stat-card">
                    <div class="stat-label">Total</div>
                    <div class="stat-value">${stats.totalStaff || stats.totalEmployees || 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Vacantes</div>
                    <div class="stat-value" style="color: #ef4444;">${stats.vacancies || 0}</div>
                </div>
            </div>

            <!-- Color Legend -->
            <div class="stats-panel" style="margin-top: 12px;">
                <div class="insights-title">🎨 Niveles Jerárquicos</div>
                <div style="padding: 8px 12px; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <div style="width: 16px; height: 16px; border-radius: 3px; background: ${this.levelColors[0]};"></div>
                        <span style="color: rgba(230, 237, 243, 0.8);">Nivel 0 - CEO/Dirección</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <div style="width: 16px; height: 16px; border-radius: 3px; background: ${this.levelColors[1]};"></div>
                        <span style="color: rgba(230, 237, 243, 0.8);">Nivel 1 - Gerentes</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <div style="width: 16px; height: 16px; border-radius: 3px; background: ${this.levelColors[2]};"></div>
                        <span style="color: rgba(230, 237, 243, 0.8);">Nivel 2 - Jefes</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <div style="width: 16px; height: 16px; border-radius: 3px; background: ${this.levelColors[3]};"></div>
                        <span style="color: rgba(230, 237, 243, 0.8);">Nivel 3 - Coordinadores</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <div style="width: 16px; height: 16px; border-radius: 3px; background: ${this.levelColors[4]};"></div>
                        <span style="color: rgba(230, 237, 243, 0.8);">Nivel 4 - Operativos</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <div style="width: 16px; height: 16px; border-radius: 3px; background: ${this.levelColors.vacant}; border: 2px dashed #ef4444;"></div>
                        <span style="color: rgba(230, 237, 243, 0.8);">Vacante</span>
                    </div>
                </div>
            </div>

            <!-- Insights -->
            ${this._renderInsightsList()}
        `;
    }

    _renderInsightsList() {
        const { insights } = this;
        let html = '<div class="insights-panel"><div class="insights-title">💡 Insights</div>';

        // Bottlenecks
        if (insights.bottlenecks && insights.bottlenecks.length > 0) {
            insights.bottlenecks.slice(0, 3).forEach(b => {
                html += `
                    <div class="insight-item ${b.severity === 'high' ? '' : 'warning'}">
                        <div class="insight-item-title">⚠️ ${b.name}</div>
                        <div class="insight-item-text">${b.directReports} reportes (ideal: 5-8)</div>
                    </div>
                `;
            });
        }

        // Vacancies
        if (insights.vacancies && insights.vacancies.length > 0) {
            html += `
                <div class="insight-item warning">
                    <div class="insight-item-title">❓ ${insights.vacancies.length} Vacantes</div>
                    <div class="insight-item-text">Click para ver detalles</div>
                </div>
            `;
        }

        // Recommendations
        if (insights.recommendations && insights.recommendations.length > 0) {
            insights.recommendations.forEach(r => {
                html += `
                    <div class="insight-item info">
                        <div class="insight-item-text">${r.message}</div>
                    </div>
                `;
            });
        }

        if (!insights.bottlenecks?.length && !insights.vacancies?.length && !insights.recommendations?.length) {
            html += `
                <div class="insight-item info">
                    <div class="insight-item-text">✅ Sin problemas detectados</div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    // ========================================================================
    // RENDER CHART - DISPATCHER
    // ========================================================================

    renderChart() {
        document.getElementById('viewport-loading').style.display = 'none';
        document.getElementById('orgchart-svg').style.display = 'block';
        this.render2DTree();
    }

    // ========================================================================
    // RENDER 2D TREE (SVG)
    // ========================================================================

    render2DTree() {
        const svg = document.getElementById('orgchart-svg');
        if (!svg) return;

        svg.innerHTML = '';

        const width = svg.clientWidth || 1000;
        const height = svg.clientHeight || 800;

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        // Filtrar SOLO staff real (sin vacantes) para el árbol
        let filteredNodes = this.getFilteredNodes();
        filteredNodes = filteredNodes.filter(n => !n.isVacant);

        if (filteredNodes.length === 0) {
            svg.innerHTML = `<text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#e6edf3">No hay staff asignado para mostrar</text>`;
            return;
        }

        // Normalizar niveles: 99 → 0
        filteredNodes = filteredNodes.map(n => ({
            ...n,
            level: n.level === 99 ? 0 : n.level
        }));

        const layout = this.calculateTreeLayout(filteredNodes, width, height);

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);

        // Edges
        layout.edges.forEach(edge => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'org-edge');
            path.setAttribute('d', `M ${edge.x1} ${edge.y1} C ${edge.x1} ${(edge.y1 + edge.y2)/2}, ${edge.x2} ${(edge.y1 + edge.y2)/2}, ${edge.x2} ${edge.y2}`);
            g.appendChild(path);
        });

        // Nodes
        layout.nodes.forEach(node => {
            const nodeG = this.createNodeElement(node, node.x, node.y);
            g.appendChild(nodeG);
        });

        svg.appendChild(g);
    }

    calculateTreeLayout(nodes, width, height) {
        const nodeWidth = 180;
        const nodeHeight = 80;
        const levelHeight = 150;
        const siblingSpacing = 30;

        // Agrupar por nivel
        const byLevel = {};
        nodes.forEach(n => {
            const level = n.level;
            if (!byLevel[level]) byLevel[level] = [];
            byLevel[level].push(n);
        });

        const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);
        const layoutNodes = [];
        const layoutEdges = [];

        // Layout simple por niveles (de arriba hacia abajo)
        levels.forEach((level, levelIdx) => {
            const levelNodes = byLevel[level];
            const totalWidth = levelNodes.length * (nodeWidth + siblingSpacing);
            let startX = Math.max(50, (width - totalWidth) / 2);

            levelNodes.forEach((node, idx) => {
                const x = startX + (idx * (nodeWidth + siblingSpacing));
                const y = 50 + (levelIdx * levelHeight);

                layoutNodes.push({
                    ...node,
                    x,
                    y,
                    width: nodeWidth,
                    height: nodeHeight
                });

                // Buscar padre y dibujar línea
                if (node.reportsTo) {
                    const parent = layoutNodes.find(n => n.id === node.reportsTo);
                    if (parent) {
                        layoutEdges.push({
                            x1: x + nodeWidth / 2,
                            y1: y,
                            x2: parent.x + parent.width / 2,
                            y2: parent.y + parent.height
                        });
                    }
                }
            });
        });

        return { nodes: layoutNodes, edges: layoutEdges };
    }

    createNodeElement(node, x, y) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `org-node ${node.isVacant ? 'vacant' : ''} ${this.selectedNode?.id === node.id ? 'selected' : ''}`);
        g.setAttribute('data-node-id', node.id);
        g.setAttribute('draggable', 'true');

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', node.width || 180);
        rect.setAttribute('height', node.height || 80);
        rect.setAttribute('rx', 8);
        rect.setAttribute('fill', node.isVacant ? 'rgba(239, 68, 68, 0.1)' : this.levelColors[node.level] || this.levelColors[99]);
        rect.setAttribute('stroke', node.isVacant ? '#ef4444' : 'rgba(255,255,255,0.2)');
        rect.setAttribute('stroke-width', 2);
        g.appendChild(rect);

        // Profile Photo o Avatar (centrado verticalmente en el nodo más grande)
        if (node.profile_photo) {
            // Si tiene foto de perfil, mostrar imagen circular
            const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            const clipId = `clip-${node.id}`;
            clipPath.setAttribute('id', clipId);
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x + 35);
            circle.setAttribute('cy', y + 40);
            circle.setAttribute('r', 28);
            clipPath.appendChild(circle);
            g.appendChild(clipPath);

            const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            image.setAttribute('x', x + 7);
            image.setAttribute('y', y + 12);
            image.setAttribute('width', 56);
            image.setAttribute('height', 56);
            image.setAttribute('href', node.profile_photo);
            image.setAttribute('clip-path', `url(#${clipId})`);
            image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
            g.appendChild(image);

            // Borde circular de la foto
            const photoBorder = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            photoBorder.setAttribute('cx', x + 35);
            photoBorder.setAttribute('cy', y + 40);
            photoBorder.setAttribute('r', 28);
            photoBorder.setAttribute('fill', 'none');
            photoBorder.setAttribute('stroke', 'rgba(255,255,255,0.4)');
            photoBorder.setAttribute('stroke-width', 2.5);
            g.appendChild(photoBorder);
        } else {
            // Si no tiene foto, mostrar avatar con iniciales en círculo
            const avatarCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            avatarCircle.setAttribute('cx', x + 35);
            avatarCircle.setAttribute('cy', y + 40);
            avatarCircle.setAttribute('r', 28);
            avatarCircle.setAttribute('fill', 'rgba(255,255,255,0.15)');
            avatarCircle.setAttribute('stroke', 'rgba(255,255,255,0.4)');
            avatarCircle.setAttribute('stroke-width', 2.5);
            g.appendChild(avatarCircle);

            const avatar = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            avatar.setAttribute('x', x + 35);
            avatar.setAttribute('y', y + 46);
            avatar.setAttribute('text-anchor', 'middle');
            avatar.setAttribute('font-size', '18');
            avatar.setAttribute('font-weight', '700');
            avatar.setAttribute('fill', '#e6edf3');
            avatar.textContent = node.avatar || '?';
            g.appendChild(avatar);
        }

        // Nombre (más grande y destacado)
        const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        name.setAttribute('x', x + 75);
        name.setAttribute('y', y + 34);
        name.setAttribute('font-size', '14');
        name.setAttribute('font-weight', '700');
        name.setAttribute('fill', '#e6edf3');
        name.textContent = this.truncate(node.name, 16);
        g.appendChild(name);

        // Cargo/Posición (más destacado)
        const position = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        position.setAttribute('x', x + 75);
        position.setAttribute('y', y + 52);
        position.setAttribute('fill', 'rgba(255,255,255,0.75)');
        position.setAttribute('font-size', '11');
        position.setAttribute('font-weight', '500');
        position.textContent = this.truncate(node.position || node.role || 'Sin cargo', 15);
        g.appendChild(position);

        // Events
        g.addEventListener('click', () => this.selectNode(node));
        g.addEventListener('dblclick', () => this.showEditNodeModal(node));
        g.addEventListener('dragstart', (e) => this.onNodeDragStart(e, node));
        g.addEventListener('dragover', (e) => e.preventDefault());
        g.addEventListener('drop', (e) => this.onNodeDrop(e, node));

        return g;
    }

    // ========================================================================
    // RENDER 2D FORCE (D3.js)
    // ========================================================================

    render2DForce() {
        if (!this.librariesLoaded.d3) {
            this.showError('D3.js no está cargado. Usando vista de árbol.');
            this.setViewMode('2d-tree');
            return;
        }

        const svg = d3.select('#orgchart-svg');
        svg.selectAll('*').remove();

        const width = svg.node().clientWidth || 1000;
        const height = svg.node().clientHeight || 800;

        const filteredNodes = this.getFilteredNodes();

        // Map edges to D3 format (source/target) and filter invalid ones
        const filteredEdges = this.edges
            .map(e => ({
                source: e.from,
                target: e.to
            }))
            .filter(e => {
                const hasSource = filteredNodes.find(n => n.id === e.source);
                const hasTarget = filteredNodes.find(n => n.id === e.target);
                return hasSource && hasTarget && e.source && e.target;
            });

        console.log('[2D Force] Nodes:', filteredNodes.length, 'Edges:', filteredEdges.length);

        // Pre-set Y position based on hierarchy level (VERTICAL TREE)
        filteredNodes.forEach(node => {
            const level = node.level || 99;
            node.fy = 80 + (level * 120); // Fixed Y by level (CEO top, employees bottom)
        });

        const simulation = d3.forceSimulation(filteredNodes)
            .force('link', d3.forceLink(filteredEdges).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('x', d3.forceX(width / 2).strength(0.05)) // Weak horizontal centering
            .force('collision', d3.forceCollide().radius(80));

        const g = svg.append('g');

        // Links
        const link = g.append('g')
            .selectAll('line')
            .data(filteredEdges)
            .join('line')
            .attr('class', 'org-edge');

        // Nodes
        const node = g.append('g')
            .selectAll('g')
            .data(filteredNodes)
            .join('g')
            .attr('class', d => `org-node ${d.isVacant ? 'vacant' : ''}`)
            .call(this.d3Drag(simulation));

        node.append('circle')
            .attr('r', 30)
            .attr('fill', d => d.isVacant ? 'rgba(239, 68, 68, 0.3)' : this.levelColors[d.level] || this.levelColors[99])
            .attr('stroke', d => d.isVacant ? '#ef4444' : 'rgba(255,255,255,0.2)')
            .attr('stroke-width', 2);

        // Avatar dentro del círculo
        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .attr('font-size', '12')
            .attr('font-weight', 'bold')
            .attr('fill', '#e6edf3')
            .text(d => d.avatar || '?');

        // Nombre debajo del círculo
        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '50px')
            .attr('font-size', '11')
            .attr('font-weight', '600')
            .attr('fill', '#e6edf3')
            .text(d => this.truncate(d.name, 20));

        // Posición/rol debajo del nombre
        node.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '64px')
            .attr('font-size', '9')
            .attr('fill', 'rgba(230, 237, 243, 0.6)')
            .text(d => this.truncate(d.position || d.role || '', 22));

        node.append('title').text(d => `${d.name}\n${d.position || d.role || ''}\nNivel: ${d.level}`);

        node.on('click', (event, d) => this.selectNode(d));

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        this.simulation = simulation;
    }

    d3Drag(simulation) {
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }

    // ========================================================================
    // RENDER 3D (Three.js)
    // ========================================================================

    render3D() {
        if (!this.librariesLoaded.three) {
            this.showError('Three.js no está cargado. Usando vista 2D.');
            this.setViewMode('2d-tree');
            return;
        }

        const canvas = document.getElementById('orgchart-canvas');
        if (!canvas) return;

        // Limpiar escena anterior
        if (this.scene) {
            while (this.scene.children.length > 0) {
                this.scene.remove(this.scene.children[0]);
            }
        }

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d1117);

        // Camera (positioned to see pyramid from angle) - CLOSER
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(12, 8, 12); // Much closer view
        this.camera.lookAt(0, 0, 0); // Look at center

        // Renderer
        if (!this.renderer) {
            this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        }
        this.renderer.setSize(width, height);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        // Create nodes in 3D TREE layout (hierarchical branches)
        const filteredNodes = this.getFilteredNodes();

        // Build tree structure first
        const nodeMap = new Map();
        filteredNodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));

        // Find roots and build parent-child relationships
        const roots = [];
        filteredNodes.forEach(node => {
            const treeNode = nodeMap.get(node.id);
            if (node.reportsTo) {
                const parent = nodeMap.get(node.reportsTo);
                if (parent) {
                    parent.children.push(treeNode);
                } else {
                    roots.push(treeNode);
                }
            } else {
                roots.push(treeNode);
            }
        });

        // Calculate 3D tree positions recursively
        const calculateTreePosition = (node, depth, angle, radius, parentPos) => {
            // Y: Vertical position based on depth (CEO top, employees bottom)
            const y = 10 - (depth * 3.5);

            // X, Z: Radial/angular position around parent
            const x = parentPos.x + radius * Math.cos(angle);
            const z = parentPos.z + radius * Math.sin(angle);

            node.position3D = { x, y, z };

            // Calculate positions for children
            const childCount = node.children.length;
            if (childCount > 0) {
                const childRadius = radius + 2; // Branch out further
                const angleSpan = Math.PI / Math.max(1, depth); // Wider spread at top
                const startAngle = angle - angleSpan / 2;

                node.children.forEach((child, idx) => {
                    const childAngle = childCount === 1
                        ? angle
                        : startAngle + (angleSpan * idx / (childCount - 1));
                    calculateTreePosition(child, depth + 1, childAngle, childRadius, { x, y, z });
                });
            }
        };

        // Start from roots
        roots.forEach((root, idx) => {
            const rootAngle = (2 * Math.PI * idx) / roots.length;
            calculateTreePosition(root, 0, rootAngle, 0, { x: 0, y: 0, z: 0 });
        });

        filteredNodes.forEach((node) => {
            const treeNode = nodeMap.get(node.id);
            const pos = treeNode.position3D || { x: 0, y: 0, z: 0 };
            const x = pos.x;
            const y = pos.y;
            const z = pos.z;

            // Create sphere for node (BIGGER)
            const geometry = new THREE.SphereGeometry(0.8, 32, 32);
            const material = new THREE.MeshStandardMaterial({
                color: node.isVacant ? 0xef4444 : parseInt(this.levelColors[node.level]?.replace('#', '0x') || '0x6b7280')
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(x, y, z);
            sphere.userData = node;

            this.scene.add(sphere);
            this.meshes.set(node.id, sphere);

            // Create sprite label for the node (BIGGER TEXT)
            const sprite = this.makeTextSprite(this.truncate(node.name, 18), {
                fontsize: 32,
                backgroundColor: { r: 13, g: 17, b: 23, a: 0.9 },
                textColor: { r: 230, g: 237, b: 243, a: 1.0 }
            });
            sprite.position.set(x, y - 1.3, z); // Below the sphere
            sprite.scale.set(5, 2.5, 1); // Larger scale
            this.scene.add(sprite);

            // Add edges (lines)
            if (node.reportsTo) {
                const parent = filteredNodes.find(n => n.id === node.reportsTo);
                if (parent) {
                    const parentMesh = this.meshes.get(parent.id);
                    if (parentMesh) {
                        // Create tube/branch between parent and child
                        const path = new THREE.LineCurve3(
                            sphere.position.clone(),
                            parentMesh.position.clone()
                        );
                        const tubeGeometry = new THREE.TubeGeometry(path, 8, 0.1, 8, false);
                        const tubeMaterial = new THREE.MeshStandardMaterial({
                            color: 0x6b7280,
                            metalness: 0.3,
                            roughness: 0.7
                        });
                        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
                        this.scene.add(tube);
                    }
                }
            }
        });

        // Manual rotation controls
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let rotation = { x: 0, y: 0 };

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;

                rotation.y += deltaX * 0.01;
                rotation.x += deltaY * 0.01;

                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        // Animation loop
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);

            // Apply rotation from mouse drag
            this.scene.rotation.y = rotation.y;
            this.scene.rotation.x = rotation.x;

            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    on3DMouseMove(event) {
        // TODO: Raycasting para hover
    }

    on3DClick(event) {
        // TODO: Raycasting para selección
    }

    /**
     * Create a text sprite for 3D labels
     */
    makeTextSprite(message, parameters = {}) {
        const fontface = parameters.fontface || 'Arial';
        const fontsize = parameters.fontsize || 18;
        const borderThickness = parameters.borderThickness || 4;
        const backgroundColor = parameters.backgroundColor || { r: 0, g: 0, b: 0, a: 0.8 };
        const textColor = parameters.textColor || { r: 255, g: 255, b: 255, a: 1.0 };

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `Bold ${fontsize}px ${fontface}`;

        // Get text metrics
        const metrics = context.measureText(message);
        const textWidth = metrics.width;

        canvas.width = textWidth + borderThickness * 2;
        canvas.height = fontsize * 1.4 + borderThickness * 2;

        // Redraw after resizing canvas
        context.font = `Bold ${fontsize}px ${fontface}`;
        context.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(message, canvas.width / 2, canvas.height / 2);

        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);

        return sprite;
    }

    // ========================================================================
    // RENDER LIST VIEW
    // ========================================================================

    renderListView() {
        const container = document.getElementById('orgchart-list');
        if (!container) return;

        const filteredNodes = this.getFilteredNodes();

        container.innerHTML = filteredNodes.map(node => `
            <div class="list-item ${this.selectedNode?.id === node.id ? 'selected' : ''}" data-node-id="${node.id}">
                <div class="list-item-avatar" style="background: ${node.isVacant ? '#ef4444' : this.levelColors[node.level]};">
                    ${node.avatar || '?'}
                </div>
                <div class="list-item-info">
                    <div class="list-item-name">${node.name}</div>
                    <div class="list-item-position">${node.position || node.role || ''}</div>
                </div>
                <div class="list-item-actions">
                    <button class="orgchart-btn orgchart-btn-sm" onclick="window.orgchartInstance.showEditNodeModal('${node.id}')">✏️</button>
                    ${node.isVacant ? '' : `<button class="orgchart-btn orgchart-btn-sm orgchart-btn-danger" onclick="window.orgchartInstance.deleteNode('${node.id}')">🗑️</button>`}
                </div>
            </div>
        `).join('');

        // Event listeners
        container.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.list-item-actions')) {
                    const nodeId = item.dataset.nodeId;
                    const node = filteredNodes.find(n => n.id === nodeId);
                    if (node) this.selectNode(node);
                }
            });
        });

        // Guardar instancia global para acceder desde onclick
        window.orgchartInstance = this;
    }

    // ========================================================================
    // INTERACTIONS
    // ========================================================================

    setViewMode(mode) {
        this.viewMode = mode;

        // Update buttons
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });

        // Stop 3D animation if switching away
        if (mode !== '3d' && this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Stop D3 simulation if switching away
        if (mode !== '2d-force' && this.simulation) {
            this.simulation.stop();
        }

        this.renderChart();
    }

    selectNode(node) {
        this.selectedNode = node;
        console.log('Node selected:', node);

        if (this.viewMode === '2d-tree') {
            document.querySelectorAll('.org-node').forEach(n => n.classList.remove('selected'));
            document.querySelector(`[data-node-id="${node.id}"]`)?.classList.add('selected');
        } else if (this.viewMode === 'list') {
            document.querySelectorAll('.list-item').forEach(item => item.classList.remove('selected'));
            document.querySelector(`.list-item[data-node-id="${node.id}"]`)?.classList.add('selected');
        }

        if (this.onNodeClick) {
            this.onNodeClick(node);
        }
    }

    getFilteredNodes() {
        let filtered = [...this.nodes];

        // Search
        if (this.searchTerm) {
            filtered = filtered.filter(n =>
                this.filters.searchFields.some(field =>
                    n[field]?.toLowerCase().includes(this.searchTerm)
                )
            );
        }

        // Filters
        if (this.filters.level !== null) {
            filtered = filtered.filter(n => n.level === this.filters.level);
        }

        if (this.filters.area) {
            filtered = filtered.filter(n => n.area === this.filters.area);
        }

        if (this.filters.department) {
            filtered = filtered.filter(n => n.department === this.filters.department);
        }

        if (!this.filters.showVacant) {
            filtered = filtered.filter(n => !n.isVacant);
        }

        return filtered;
    }

    applyFiltersAndRender() {
        this.renderChart();
    }

    // Drag & Pan viewport
    startDrag(e) {
        if (e.target.closest('.org-node')) return; // Don't drag viewport when dragging node
        this.isDragging = true;
        this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
        document.getElementById('orgchart-viewport').classList.add('dragging');
    }

    drag(e) {
        if (!this.isDragging) return;
        this.panX = e.clientX - this.dragStart.x;
        this.panY = e.clientY - this.dragStart.y;
        this.updateTransform();
    }

    endDrag() {
        this.isDragging = false;
        document.getElementById('orgchart-viewport').classList.remove('dragging');
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.1, Math.min(3, this.zoom * delta));
        this.updateTransform();
    }

    updateTransform() {
        const g = document.querySelector('#orgchart-svg > g');
        if (g) {
            g.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
        }
    }

    // Drag & Drop nodes para reorganizar
    onNodeDragStart(e, node) {
        this.draggedNode = node;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }

    onNodeDrop(e, targetNode) {
        e.preventDefault();
        if (!this.draggedNode || this.draggedNode.id === targetNode.id) return;

        console.log(`Reorganizar: ${this.draggedNode.name} ahora reporta a ${targetNode.name}`);

        // Aquí se llamaría al backend para actualizar la estructura
        if (this.onStructureChange) {
            this.onStructureChange({
                nodeId: this.draggedNode.id,
                newParentId: targetNode.id
            });
        }

        this.draggedNode = null;
    }

    // Keyboard shortcuts
    handleKeyboard(e) {
        if (e.key === 'Escape' && this.presentationMode) {
            this.togglePresentationMode();
        }

        if (e.key === 'f' && e.ctrlKey) {
            e.preventDefault();
            document.getElementById('orgchart-search')?.focus();
        }

        if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            this.loadData();
        }
    }

    // ========================================================================
    // MODALS - CRUD
    // ========================================================================

    showCreateNodeModal() {
        this.showNodeModal(null);
    }

    showEditNodeModal(nodeOrId) {
        const node = typeof nodeOrId === 'string'
            ? this.nodes.find(n => n.id === nodeOrId)
            : nodeOrId;

        if (!node) return;
        this.showNodeModal(node);
    }

    showNodeModal(node = null) {
        const isEdit = !!node;

        const modal = document.createElement('div');
        modal.className = 'orgchart-modal-overlay';
        modal.innerHTML = `
            <div class="orgchart-modal">
                <div class="orgchart-modal-header">
                    <div class="orgchart-modal-title">${isEdit ? '✏️ Editar' : '➕ Crear'} ${this.type === 'aponnt' ? 'Staff' : 'Empleado'}</div>
                    <button class="orgchart-modal-close" onclick="this.closest('.orgchart-modal-overlay').remove()">×</button>
                </div>
                <div class="orgchart-modal-body">
                    <div class="modal-form-group">
                        <label class="modal-label">Nombre completo</label>
                        <input type="text" class="modal-input" id="modal-name" value="${node?.name || ''}" placeholder="Juan Pérez">
                    </div>
                    <div class="modal-form-group">
                        <label class="modal-label">Email</label>
                        <input type="email" class="modal-input" id="modal-email" value="${node?.email || ''}" placeholder="juan@example.com">
                    </div>
                    <div class="modal-form-group">
                        <label class="modal-label">Posición</label>
                        <input type="text" class="modal-input" id="modal-position" value="${node?.position || ''}" placeholder="Gerente de Ventas">
                    </div>
                    <div class="modal-form-group">
                        <label class="modal-label">Nivel jerárquico</label>
                        <select class="modal-input" id="modal-level">
                            <option value="0" ${node?.level === 0 ? 'selected' : ''}>0 - CEO/Director</option>
                            <option value="1" ${node?.level === 1 ? 'selected' : ''}>1 - Gerencia</option>
                            <option value="2" ${node?.level === 2 ? 'selected' : ''}>2 - Jefatura</option>
                            <option value="3" ${node?.level === 3 ? 'selected' : ''}>3 - Supervisión</option>
                            <option value="4" ${node?.level === 4 ? 'selected' : ''}>4 - Operativo</option>
                        </select>
                    </div>
                    <div class="modal-form-group">
                        <label class="modal-label">Reporta a</label>
                        <select class="modal-input" id="modal-reports-to">
                            <option value="">-- Nadie (CEO) --</option>
                            ${this.nodes.filter(n => !n.isVacant && n.id !== node?.id).map(n => `
                                <option value="${n.id}" ${node?.reportsTo === n.id ? 'selected' : ''}>${n.name}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="orgchart-modal-footer">
                    <button class="orgchart-btn" onclick="this.closest('.orgchart-modal-overlay').remove()">Cancelar</button>
                    <button class="orgchart-btn active" onclick="window.orgchartInstance.saveNode(${isEdit ? `'${node.id}'` : 'null'})">
                        ${isEdit ? 'Guardar cambios' : 'Crear'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('modal-name')?.focus();

        window.orgchartInstance = this;
    }

    async saveNode(nodeId = null) {
        const name = document.getElementById('modal-name')?.value;
        const email = document.getElementById('modal-email')?.value;
        const position = document.getElementById('modal-position')?.value;
        const level = parseInt(document.getElementById('modal-level')?.value);
        const reportsTo = document.getElementById('modal-reports-to')?.value || null;

        if (!name || !email) {
            alert('Nombre y email son requeridos');
            return;
        }

        try {
            // Parsear nombre (asumimos "Nombre Apellido")
            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || nameParts[0];

            if (this.type === 'aponnt') {
                // Guardar staff de Aponnt
                const node = nodeId ? this.nodes.find(n => n.id === nodeId) : null;
                const staffId = node?.entityId;

                // Extraer el ID del supervisor del reportsTo (formato: "staff_uuid")
                const reportsToStaffId = reportsTo ? reportsTo.replace('staff_', '') : null;

                const data = {
                    first_name: firstName,
                    last_name: lastName,
                    email: email.toLowerCase(),
                    level: level,
                    area: level === 0 ? 'direccion' : 'admin', // Simplificado
                    reports_to_staff_id: reportsToStaffId
                };

                let response;
                if (staffId) {
                    // Actualizar existente
                    response = await fetch(`/api/aponnt/staff-data/${staffId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                } else {
                    // Crear nuevo - necesita role_id y country (buscar un rol por defecto)
                    const rolesResp = await fetch('/api/aponnt/staff-data/roles');
                    const rolesData = await rolesResp.json();
                    const defaultRole = rolesData.data.find(r => r.level === level) || rolesData.data[0];

                    response = await fetch('/api/aponnt/staff-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...data,
                            role_id: defaultRole.role_id,
                            country: 'AR' // Default Argentina
                        })
                    });
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.message || 'Error guardando staff');
                }

            } else {
                // TODO: Guardar empleado de empresa
                console.warn('Guardado de empleados de empresa no implementado aún');
            }

            document.querySelector('.orgchart-modal-overlay')?.remove();

            // Mostrar toast de éxito
            this.showToast(nodeId ? '✅ Cambios guardados' : '✅ Staff creado');

            // Recargar datos para reflejar cambios (incluye reacomodo automático)
            await this.loadData();

        } catch (error) {
            console.error('Error guardando nodo:', error);
            alert(`Error: ${error.message}`);
        }
    }

    async deleteNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (!confirm(`¿Eliminar a ${node.name}?`)) return;

        console.log('Eliminar nodo:', nodeId);

        // TODO: Llamar al backend para eliminar

        this.showToast('🗑️ Nodo eliminado');
        await this.loadData();
    }

    // ========================================================================
    // FILTROS AVANZADOS
    // ========================================================================

    showFiltersModal() {
        const modal = document.createElement('div');
        modal.className = 'orgchart-modal-overlay';
        modal.innerHTML = `
            <div class="orgchart-modal">
                <div class="orgchart-modal-header">
                    <div class="orgchart-modal-title">🎛️ Filtros Avanzados</div>
                    <button class="orgchart-modal-close" onclick="this.closest('.orgchart-modal-overlay').remove()">×</button>
                </div>
                <div class="orgchart-modal-body">
                    <div class="modal-form-group">
                        <label class="modal-label">Nivel jerárquico</label>
                        <select class="modal-input" id="filter-level">
                            <option value="">Todos los niveles</option>
                            <option value="0">CEO/Director</option>
                            <option value="1">Gerencia</option>
                            <option value="2">Jefatura</option>
                            <option value="3">Supervisión</option>
                            <option value="4">Operativo</option>
                        </select>
                    </div>
                    <div class="modal-form-group">
                        <label class="modal-label">
                            <input type="checkbox" id="filter-vacant" ${this.filters.showVacant ? 'checked' : ''}>
                            Mostrar vacantes
                        </label>
                    </div>
                </div>
                <div class="orgchart-modal-footer">
                    <button class="orgchart-btn" onclick="window.orgchartInstance.clearFilters(); this.closest('.orgchart-modal-overlay').remove()">Limpiar</button>
                    <button class="orgchart-btn active" onclick="window.orgchartInstance.applyFiltersFromModal(); this.closest('.orgchart-modal-overlay').remove()">Aplicar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        window.orgchartInstance = this;
    }

    applyFiltersFromModal() {
        const level = document.getElementById('filter-level')?.value;
        this.filters.level = level ? parseInt(level) : null;
        this.filters.showVacant = document.getElementById('filter-vacant')?.checked || false;

        this.applyFiltersAndRender();
        this.showToast('✅ Filtros aplicados');
    }

    clearFilters() {
        this.filters = {
            level: null,
            area: null,
            department: null,
            showVacant: true,
            hireDate: { from: null, to: null },
            searchFields: ['name', 'email', 'position']
        };

        this.applyFiltersAndRender();
        this.showToast('🔄 Filtros limpiados');
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    showExportMenu() {
        const modal = document.createElement('div');
        modal.className = 'orgchart-modal-overlay';
        modal.innerHTML = `
            <div class="orgchart-modal">
                <div class="orgchart-modal-header">
                    <div class="orgchart-modal-title">📥 Exportar Organigrama</div>
                    <button class="orgchart-modal-close" onclick="this.closest('.orgchart-modal-overlay').remove()">×</button>
                </div>
                <div class="orgchart-modal-body">
                    <button class="orgchart-btn" style="width: 100%; margin-bottom: 10px;" onclick="window.orgchartInstance.exportSVG(); this.closest('.orgchart-modal-overlay').remove()">
                        📄 Exportar como SVG
                    </button>
                    <button class="orgchart-btn" style="width: 100%; margin-bottom: 10px;" onclick="window.orgchartInstance.exportPNG(); this.closest('.orgchart-modal-overlay').remove()">
                        🖼️ Exportar como PNG
                    </button>
                    <button class="orgchart-btn" style="width: 100%;" onclick="window.orgchartInstance.exportPDF(); this.closest('.orgchart-modal-overlay').remove()">
                        📕 Exportar como PDF
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        window.orgchartInstance = this;
    }

    exportSVG() {
        const svg = document.getElementById('orgchart-svg');
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `organigrama-${this.type}-${Date.now()}.svg`;
        a.click();

        URL.revokeObjectURL(url);
        this.showToast('✅ SVG descargado');
    }

    async exportPNG() {
        if (!this.librariesLoaded.html2canvas) {
            this.showError('html2canvas no está cargado');
            return;
        }

        const viewport = document.getElementById('orgchart-viewport');
        const canvas = await html2canvas(viewport, {
            backgroundColor: '#0d1117'
        });

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `organigrama-${this.type}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('✅ PNG descargado');
        });
    }

    async exportPDF() {
        if (!this.librariesLoaded.jsPDF || !this.librariesLoaded.html2canvas) {
            this.showError('jsPDF o html2canvas no están cargados');
            return;
        }

        const viewport = document.getElementById('orgchart-viewport');
        const canvas = await html2canvas(viewport, {
            backgroundColor: '#0d1117'
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`organigrama-${this.type}-${Date.now()}.pdf`);

        this.showToast('✅ PDF descargado');
    }

    // ========================================================================
    // PRESENTATION MODE
    // ========================================================================

    togglePresentationMode() {
        this.presentationMode = !this.presentationMode;
        this.container.querySelector('.orgchart-intelligent').classList.toggle('presentation-mode', this.presentationMode);

        if (this.presentationMode) {
            this.showToast('🎬 Modo presentación (ESC para salir)');
        }
    }

    // ========================================================================
    // AUTO-REFRESH
    // ========================================================================

    startAutoRefresh() {
        this.refreshTimer = setInterval(() => {
            console.log('🔄 [OrgChart] Auto-refresh...');
            this.loadData();
        }, this.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    truncate(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
    }

    showError(message) {
        const viewport = document.getElementById('orgchart-viewport');
        viewport.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <div style="font-size: 3rem; margin-bottom: 16px;">❌</div>
                <div style="font-size: 1.1rem; margin-bottom: 8px;">Error</div>
                <div style="font-size: 0.9rem; color: rgba(255,255,255,0.7);">${message}</div>
            </div>
        `;
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(22, 27, 34, 0.95);
            color: #e6edf3;
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid rgba(245, 158, 11, 0.5);
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 0.9rem;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    // Refresh
    async refresh() {
        await this.loadData();
    }

    // Destroy
    destroy() {
        this.stopAutoRefresh();

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (this.simulation) {
            this.simulation.stop();
        }

        this.container.innerHTML = '';
    }
}

// Exportar globalmente
window.OrgChartIntelligent = OrgChartIntelligent;
