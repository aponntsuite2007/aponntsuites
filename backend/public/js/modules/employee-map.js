/**
 * EMPLOYEE LOCATION MAP v5.0 - ENTERPRISE COMPLETE
 * Sistema de Ubicacion de Empleados - Estilo Enterprise
 *
 * FEATURES:
 * 1. Circulo de geofence visual
 * 2. Clustering de marcadores
 * 3. Panel de leyenda
 * 4. Filtro por departamento
 * 5. Filtro por sucursal
 * 6. Busqueda de empleado
 * 7. Exportar PDF/Excel
 * 8. Historial de rutas
 * 9. Alertas de geofence
 * 10. Heatmap de concentracion
 * 11. Vista multi-sucursal
 *
 * @author Sistema Biometrico Enterprise
 * @version 5.0.0
 */

// Evitar doble carga del modulo
if (window.EmployeeMapEngine) {
    console.log('[EMPLOYEE-MAP] Modulo ya cargado');
    throw new Error('EmployeeMapModule already loaded');
}

console.log('%c EMPLOYEE MAP v5.0 ENTERPRISE ', 'background: linear-gradient(90deg, #1a5f2a 0%, #2e7d32 100%); color: #fff; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;');

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const MapState = {
    locations: [],
    visitors: [], // Visitantes activos con GPS
    visitorMarkers: [], // Marcadores de visitantes
    markers: [],
    markerClusterGroup: null,
    map: null,
    mapType: 'leaflet',
    mapStyle: 'dark',
    currentTileLayer: null,
    branchLocation: null,
    allBranches: [],
    branchMarkers: [],
    branchCircles: [],
    departments: [],
    heatmapLayer: null,
    routeLayer: null,
    isLoading: false,
    autoRefresh: false,
    autoRefreshInterval: null,
    webSocket: null,
    photosCache: new Map(),
    filters: {
        activity: 'all',
        department: 'all',
        branch: 'all',
        geofence: 'all',
        personType: 'all', // 'all', 'employees', 'visitors'
        search: ''
    },
    features: {
        showGeofence: true,
        showHeatmap: false,
        showClustering: true,
        showLegend: true,
        showAllBranches: false,
        showVisitors: true // Mostrar visitantes en el mapa
    }
};

// Tile layers disponibles
const MAP_TILES = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© OpenStreetMap © CARTO',
        name: 'Oscuro'
    },
    light: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        name: 'Claro'
    }
};

// ============================================================================
// API SERVICE
// ============================================================================
const MapAPI = {
    baseUrl: '/api/v1/location',

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const url = window.progressiveAdmin?.getApiUrl
                ? window.progressiveAdmin.getApiUrl(`${this.baseUrl}${endpoint}`)
                : `${this.baseUrl}${endpoint}`;
            const response = await fetch(url, config);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'API Error');
            return data;
        } catch (error) {
            console.error(`[MapAPI] ${endpoint}:`, error);
            throw error;
        }
    },

    getCurrentLocations: () => MapAPI.request('/current'),
    getVisitors: () => MapAPI.request('/visitors'), // Visitantes activos
    getLocationHistory: (userId, params = '') => MapAPI.request(`/history/${userId}${params}`),
    getStats: () => MapAPI.request('/stats'),
    getBranchCenter: () => MapAPI.request('/branch-center'),
    getAllBranches: () => MapAPI.request('/branches'),
    getDepartments: () => MapAPI.request('/departments'),
    getTrack: (userId, date) => MapAPI.request(`/track/${userId}?date=${date || ''}`)
};

// ============================================================================
// WEBSOCKET - Real-time Updates
// ============================================================================
let wsReconnectEnabled = true; // Flag para controlar reconexión

function initMapWebSocket() {
    if (!wsReconnectEnabled) return; // No reconectar si el módulo no está activo

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/employee-location-ws`;

    try {
        MapState.webSocket = new WebSocket(wsUrl);

        MapState.webSocket.onopen = () => {
            console.log('[MAP] WebSocket conectado');
            updateConnectionStatus(true);
            const companyId = window.currentCompany?.id || localStorage.getItem('company_id');
            if (companyId) {
                MapState.webSocket.send(JSON.stringify({ type: 'subscribe', company_id: companyId }));
            }
        };

        MapState.webSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'location_update') {
                    handleLocationUpdate(data.payload);
                }
            } catch (e) {
                console.error('[MAP] Error WS:', e);
            }
        };

        MapState.webSocket.onclose = () => {
            console.log('[MAP] WebSocket desconectado');
            updateConnectionStatus(false);
            // Solo reconectar si el módulo sigue activo
            if (wsReconnectEnabled) {
                setTimeout(initMapWebSocket, 5000);
            }
        };

        MapState.webSocket.onerror = () => {
            console.warn('[MAP] WebSocket no disponible');
        };
    } catch (e) {
        console.warn('[MAP] WebSocket no soportado');
    }
}

// Función de cleanup para llamar cuando se navega fuera del módulo
function cleanupEmployeeMap() {
    console.log('[MAP] Cleanup - Cerrando WebSocket y limpiando recursos');
    wsReconnectEnabled = false;

    if (MapState.webSocket) {
        MapState.webSocket.close();
        MapState.webSocket = null;
    }

    if (MapState.autoRefreshInterval) {
        clearInterval(MapState.autoRefreshInterval);
        MapState.autoRefreshInterval = null;
    }

    if (MapState.map) {
        MapState.map.remove();
        MapState.map = null;
    }
}

// Exportar cleanup para uso externo
window.cleanupEmployeeMap = cleanupEmployeeMap;

function handleLocationUpdate(update) {
    const idx = MapState.locations.findIndex(l => l.employee?.id === update.employee?.id);
    if (idx >= 0) {
        MapState.locations[idx] = update;
    } else {
        MapState.locations.push(update);
    }
    updateMapMarkers();
    updateEmployeeList();
    updateStats();
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('em-connection-status');
    if (statusEl) {
        statusEl.innerHTML = connected
            ? '<span class="em-status-dot em-status-online"></span> En linea'
            : '<span class="em-status-dot em-status-offline"></span> Desconectado';
    }
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================
function showEmployeeMapContent() {
    const content = document.getElementById('mainContent');
    if (!content) return;

    content.innerHTML = `
        <div id="employee-map-enterprise" class="em-enterprise">
            <!-- Header Enterprise -->
            <header class="em-header">
                <div class="em-header-left">
                    <div class="em-logo">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                    </div>
                    <div class="em-title-block">
                        <h1 class="em-title">EMPLOYEE MAP</h1>
                        <span class="em-subtitle">Real-Time Location System v5.0</span>
                    </div>
                </div>
                <div class="em-header-center">
                    <div class="em-tech-badges">
                        <span class="em-badge em-badge-gps" title="GPS Tracking">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
                            GPS
                        </span>
                        <span class="em-badge em-badge-leaflet" title="Leaflet Maps">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>
                            Leaflet
                        </span>
                        <span class="em-badge em-badge-ws" title="WebSocket Real-Time">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            Real-Time
                        </span>
                    </div>
                </div>
                <div class="em-header-right">
                    <div id="em-connection-status" class="em-connection">
                        <span class="em-status-dot em-status-offline"></span> Conectando...
                    </div>
                    <button onclick="EmployeeMapEngine.toggleMapStyle()" class="em-btn em-btn-style" title="Cambiar estilo del mapa">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="em-style-icon-dark">
                            <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                        </svg>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" id="em-style-icon-light" style="display: none;">
                            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                        </svg>
                    </button>
                    <button onclick="EmployeeMapEngine.refresh()" class="em-btn em-btn-icon" title="Actualizar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    </button>
                    <button onclick="EmployeeMapEngine.toggleAutoRefresh()" class="em-btn em-btn-icon" id="em-auto-refresh-btn" title="Auto-actualizar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </button>
                    <button onclick="EmployeeMapEngine.exportData('pdf')" class="em-btn em-btn-icon" title="Exportar PDF">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                    </button>
                    <button onclick="EmployeeMapEngine.exportData('excel')" class="em-btn em-btn-icon" title="Exportar Excel">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18M3 15h18"/></svg>
                    </button>
                </div>
            </header>

            <!-- Stats Bar -->
            <div class="em-stats-bar">
                <div class="em-stat-item">
                    <div class="em-stat-value" id="em-stat-total">0</div>
                    <div class="em-stat-label">Empleados Activos</div>
                </div>
                <div class="em-stat-item">
                    <div class="em-stat-value em-stat-working" id="em-stat-working">0</div>
                    <div class="em-stat-label">Trabajando</div>
                </div>
                <div class="em-stat-item">
                    <div class="em-stat-value em-stat-break" id="em-stat-break">0</div>
                    <div class="em-stat-label">En Descanso</div>
                </div>
                <div class="em-stat-item">
                    <div class="em-stat-value em-stat-geofence" id="em-stat-geofence">0</div>
                    <div class="em-stat-label">En Zona</div>
                </div>
                <div class="em-stat-item">
                    <div class="em-stat-value em-stat-outside" id="em-stat-outside">0</div>
                    <div class="em-stat-label">Fuera de Zona</div>
                </div>
            </div>

            <!-- Toolbar -->
            <div class="em-toolbar">
                <div class="em-toolbar-left">
                    <div class="em-search-box">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input type="text" id="em-search-input" placeholder="Buscar empleado..." oninput="EmployeeMapEngine.searchEmployee(this.value)">
                    </div>
                    <select id="em-filter-department" class="em-select" onchange="EmployeeMapEngine.filterByDepartment()">
                        <option value="all">Todos los departamentos</option>
                    </select>
                    <select id="em-filter-branch" class="em-select" onchange="EmployeeMapEngine.filterByBranch()">
                        <option value="all">Todas las sucursales</option>
                    </select>
                    <select id="em-filter-activity" class="em-select" onchange="EmployeeMapEngine.filterByActivity()">
                        <option value="all">Todos los estados</option>
                        <option value="working">Trabajando</option>
                        <option value="break">Descanso</option>
                        <option value="travel">En transito</option>
                    </select>
                    <select id="em-filter-person-type" class="em-select" onchange="EmployeeMapEngine.filterByPersonType()">
                        <option value="all">Empleados y Visitantes</option>
                        <option value="employees">Solo Empleados</option>
                        <option value="visitors">Solo Visitantes</option>
                    </select>
                </div>
                <div class="em-toolbar-right">
                    <button onclick="EmployeeMapEngine.toggleFeature('showGeofence')" class="em-btn em-btn-sm em-btn-active" id="em-btn-geofence" title="Mostrar geofence">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                        Geofence
                    </button>
                    <button onclick="EmployeeMapEngine.toggleFeature('showHeatmap')" class="em-btn em-btn-sm" id="em-btn-heatmap" title="Mapa de calor">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        Heatmap
                    </button>
                    <button onclick="EmployeeMapEngine.toggleFeature('showAllBranches')" class="em-btn em-btn-sm" id="em-btn-branches" title="Todas las sucursales">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 3v15"/></svg>
                        Multi-Sucursal
                    </button>
                    <button onclick="EmployeeMapEngine.toggleFeature('showClustering')" class="em-btn em-btn-sm em-btn-active" id="em-btn-cluster" title="Agrupar marcadores">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/></svg>
                        Cluster
                    </button>
                    <button onclick="EmployeeMapEngine.toggleFeature('showVisitors')" class="em-btn em-btn-sm em-btn-active" id="em-btn-visitors" title="Mostrar visitantes">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Visitantes
                    </button>
                </div>
            </div>

            <!-- Main Content -->
            <div class="em-main">
                <!-- Map Container -->
                <div class="em-map-container">
                    <div id="em-leaflet-map" class="em-map"></div>
                    <div class="em-map-overlay" id="em-map-message" style="display: none;"></div>

                    <!-- Legend Panel -->
                    <div class="em-legend" id="em-legend">
                        <div class="em-legend-title">Leyenda</div>
                        <div class="em-legend-subtitle">Empleados</div>
                        <div class="em-legend-item"><span class="em-legend-dot" style="background: #4caf50;"></span> Trabajando</div>
                        <div class="em-legend-item"><span class="em-legend-dot" style="background: #ff9800;"></span> Descanso</div>
                        <div class="em-legend-item"><span class="em-legend-dot" style="background: #9c27b0;"></span> En transito</div>
                        <div class="em-legend-item"><span class="em-legend-dot" style="background: #757575;"></span> Inactivo</div>
                        <div class="em-legend-divider"></div>
                        <div class="em-legend-subtitle">Visitantes</div>
                        <div class="em-legend-item"><span class="em-legend-dot" style="background: #00bcd4;"></span> Visitante OK</div>
                        <div class="em-legend-item"><span class="em-legend-dot" style="background: #e91e63;"></span> Tiempo excedido</div>
                        <div class="em-legend-item"><span class="em-legend-dot em-legend-alert-dot" style="background: #f44336;"></span> Fuera de zona</div>
                        <div class="em-legend-divider"></div>
                        <div class="em-legend-item"><span class="em-legend-icon em-legend-branch"></span> Sucursal</div>
                        <div class="em-legend-item"><span class="em-legend-icon em-legend-geofence"></span> Area permitida</div>
                        <div class="em-legend-item"><span class="em-legend-icon em-legend-alert"></span> Fuera de zona</div>
                    </div>

                    <!-- Route Modal -->
                    <div class="em-route-panel" id="em-route-panel" style="display: none;">
                        <div class="em-route-header">
                            <h4>Historial de Rutas</h4>
                            <button onclick="EmployeeMapEngine.closeRoutePanel()" class="em-btn em-btn-icon em-btn-sm">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div class="em-route-content">
                            <div class="em-route-employee" id="em-route-employee"></div>
                            <input type="date" id="em-route-date" class="em-input" onchange="EmployeeMapEngine.loadRoute()">
                            <div class="em-route-points" id="em-route-points"></div>
                        </div>
                    </div>
                </div>

                <!-- Employee List Sidebar -->
                <div class="em-sidebar">
                    <div class="em-sidebar-header">
                        <h3>Empleados <span id="em-filtered-count"></span></h3>
                    </div>
                    <div class="em-employee-list" id="em-employee-list">
                        <div class="em-loading">
                            <div class="em-spinner"></div>
                            <span>Cargando...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    injectMapStyles();
    EmployeeMapEngine.init();
}

// ============================================================================
// MAP INITIALIZATION
// ============================================================================
async function initLeafletMap() {
    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }

    // Load MarkerCluster CSS
    if (!document.querySelector('link[href*="MarkerCluster"]')) {
        const clusterCss = document.createElement('link');
        clusterCss.rel = 'stylesheet';
        clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
        document.head.appendChild(clusterCss);

        const clusterDefaultCss = document.createElement('link');
        clusterDefaultCss.rel = 'stylesheet';
        clusterDefaultCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
        document.head.appendChild(clusterDefaultCss);
    }

    // Load Leaflet JS
    if (!window.L) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load MarkerCluster plugin
    if (!window.L?.MarkerClusterGroup) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Load Leaflet.heat for heatmap
    if (!window.L?.heatLayer) {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
            script.onload = resolve;
            script.onerror = resolve; // Continue even if fails
            document.head.appendChild(script);
        });
    }

    const mapContainer = document.getElementById('em-leaflet-map');
    if (!mapContainer || !window.L) return;

    // Obtener ubicacion de la sucursal principal
    let centerLat = -34.6037;
    let centerLng = -58.3816;

    try {
        const branchResponse = await MapAPI.getBranchCenter();
        if (branchResponse.success && branchResponse.data) {
            MapState.branchLocation = branchResponse.data;
            centerLat = branchResponse.data.latitude;
            centerLng = branchResponse.data.longitude;
            console.log(`[MAP] Centrando en sucursal: ${branchResponse.data.name}`);
        }
    } catch (error) {
        console.warn('[MAP] No se pudo obtener ubicacion de sucursal:', error.message);
    }

    // Initialize map
    MapState.map = L.map('em-leaflet-map', {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: true
    });

    // Add tile layer
    const tileConfig = MAP_TILES[MapState.mapStyle];
    MapState.currentTileLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: 19
    }).addTo(MapState.map);

    // Initialize marker cluster group
    if (window.L?.MarkerClusterGroup) {
        MapState.markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            iconCreateFunction: function(cluster) {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count > 10) size = 'medium';
                if (count > 50) size = 'large';
                return L.divIcon({
                    html: `<div class="em-cluster em-cluster-${size}"><span>${count}</span></div>`,
                    className: 'em-cluster-container',
                    iconSize: L.point(40, 40)
                });
            }
        });
        MapState.map.addLayer(MapState.markerClusterGroup);
    }

    // Add branch marker and geofence circle
    if (MapState.branchLocation) {
        addBranchMarker(MapState.branchLocation, true);
    }

    // Load all branches for multi-branch view
    await loadAllBranches();
    await loadDepartments();

    console.log('[MAP] Leaflet inicializado con estilo:', MapState.mapStyle);
}

// ============================================================================
// BRANCH & GEOFENCE FUNCTIONS
// ============================================================================
function addBranchMarker(branch, isMain = false) {
    if (!MapState.map || !window.L) return;

    const branchIcon = L.divIcon({
        className: 'em-branch-marker-container',
        html: `
            <div class="em-branch-marker ${isMain ? 'em-branch-main' : ''}">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="${isMain ? '#2196f3' : '#607d8b'}" stroke="#fff" stroke-width="2">
                    <path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 3v15M9 21v-4h4v4"/>
                </svg>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    const marker = L.marker([branch.latitude, branch.longitude], { icon: branchIcon })
        .bindPopup(`
            <div class="em-popup">
                <strong>${isMain ? '🏢' : '🏬'} ${branch.name}</strong><br/>
                <small>${branch.address || 'Sucursal'}</small><br/>
                <span style="color: #2196f3;">Radio: ${branch.radius || 50}m</span>
            </div>
        `);

    if (isMain || MapState.features.showAllBranches) {
        marker.addTo(MapState.map);
    }
    MapState.branchMarkers.push({ marker, branch, isMain });

    // Add geofence circle
    if (MapState.features.showGeofence) {
        const circle = L.circle([branch.latitude, branch.longitude], {
            radius: branch.radius || 50,
            color: isMain ? '#2196f3' : '#607d8b',
            fillColor: isMain ? '#2196f3' : '#607d8b',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: isMain ? null : '5, 5'
        });

        if (isMain || MapState.features.showAllBranches) {
            circle.addTo(MapState.map);
        }
        MapState.branchCircles.push({ circle, branch, isMain });
    }
}

async function loadAllBranches() {
    try {
        const response = await MapAPI.getAllBranches();
        if (response.success && response.data) {
            MapState.allBranches = response.data;

            // Populate branch filter dropdown
            const branchSelect = document.getElementById('em-filter-branch');
            if (branchSelect) {
                response.data.forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.id;
                    option.textContent = branch.name + (branch.isMain ? ' (Principal)' : '');
                    branchSelect.appendChild(option);
                });
            }

            // Add non-main branch markers (hidden by default)
            response.data.filter(b => !b.isMain).forEach(branch => {
                addBranchMarker(branch, false);
            });
        }
    } catch (error) {
        console.warn('[MAP] Error cargando sucursales:', error);
    }
}

async function loadDepartments() {
    try {
        const response = await MapAPI.getDepartments();
        if (response.success && response.data) {
            MapState.departments = response.data;

            // Populate department filter dropdown
            const deptSelect = document.getElementById('em-filter-department');
            if (deptSelect) {
                response.data.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.name;
                    deptSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.warn('[MAP] Error cargando departamentos:', error);
    }
}

// ============================================================================
// TOGGLE MAP STYLE
// ============================================================================
function toggleMapStyle() {
    if (!MapState.map || !window.L) return;

    MapState.mapStyle = MapState.mapStyle === 'dark' ? 'light' : 'dark';
    const tileConfig = MAP_TILES[MapState.mapStyle];

    if (MapState.currentTileLayer) {
        MapState.map.removeLayer(MapState.currentTileLayer);
    }

    MapState.currentTileLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: 19
    }).addTo(MapState.map);

    const darkIcon = document.getElementById('em-style-icon-dark');
    const lightIcon = document.getElementById('em-style-icon-light');
    if (darkIcon && lightIcon) {
        darkIcon.style.display = MapState.mapStyle === 'dark' ? 'block' : 'none';
        lightIcon.style.display = MapState.mapStyle === 'light' ? 'block' : 'none';
    }

    showMessage(`Mapa: ${tileConfig.name}`, 'info');
}

// ============================================================================
// LOAD & UPDATE LOCATIONS
// ============================================================================
async function loadLocations() {
    const listEl = document.getElementById('em-employee-list');
    if (listEl) {
        listEl.innerHTML = '<div class="em-loading"><div class="em-spinner"></div><span>Cargando ubicaciones...</span></div>';
    }

    try {
        // Cargar empleados y visitantes en paralelo
        const [employeeResponse, visitorResponse] = await Promise.all([
            MapAPI.getCurrentLocations(),
            MapAPI.getVisitors().catch(() => ({ data: [] })) // Si falla, array vacio
        ]);

        MapState.locations = employeeResponse.data || [];
        MapState.visitors = visitorResponse.data || [];

        // Calculate geofence status for each location
        MapState.locations = MapState.locations.map(loc => {
            loc.isOutsideGeofence = !isInsideAnyGeofence(loc.location?.latitude, loc.location?.longitude);
            return loc;
        });

        // Calculate geofence status for visitors
        MapState.visitors = MapState.visitors.map(v => {
            v.isOutsideGeofence = !isInsideAnyGeofence(v.location?.latitude, v.location?.longitude);
            return v;
        });

        updateMapMarkers();
        updateVisitorMarkers();
        updateEmployeeList();
        updateStats();
        updateHeatmap();

        const totalCount = MapState.locations.length + MapState.visitors.length;
        if (totalCount > 0) {
            const msg = MapState.visitors.length > 0
                ? `${MapState.locations.length} empleados y ${MapState.visitors.length} visitantes activos`
                : `${MapState.locations.length} empleados con turno activo`;
            showMessage(msg, 'success');
        } else {
            showNoEmployeesMessage();
        }
    } catch (error) {
        console.error('[MAP] Error:', error);
        showErrorMessage(error.message);
    }
}

function isInsideAnyGeofence(lat, lng) {
    if (!lat || !lng) return true;

    const allBranches = MapState.branchLocation
        ? [MapState.branchLocation, ...MapState.allBranches.filter(b => !b.isMain)]
        : MapState.allBranches;

    for (const branch of allBranches) {
        const distance = calculateDistance(lat, lng, branch.latitude, branch.longitude);
        if (distance <= (branch.radius || 50)) {
            return true;
        }
    }
    return false;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function updateMapMarkers() {
    if (!MapState.map || !window.L) return;

    // Clear existing markers
    MapState.markers.forEach(m => {
        if (MapState.markerClusterGroup) {
            MapState.markerClusterGroup.removeLayer(m);
        } else {
            MapState.map.removeLayer(m);
        }
    });
    MapState.markers = [];

    // Apply filters
    const filtered = getFilteredLocations();
    const bounds = [];

    filtered.forEach(loc => {
        const { employee, location, status } = loc;
        if (!employee || !location?.latitude || !location?.longitude) return;

        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);
        bounds.push([lat, lng]);

        const photoUrl = employee.photoUrl || employee.photo_url || employee.biometric_photo_url;
        const initials = getInitials(employee.name);
        const activityColor = getActivityColor(status?.activity);
        const isOutside = loc.isOutsideGeofence;

        const markerHtml = `
            <div class="em-marker ${isOutside ? 'em-marker-alert' : ''}" style="border-color: ${activityColor};">
                ${photoUrl
                    ? `<img src="${photoUrl}" alt="${employee.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="em-marker-initials" style="display:none; background: ${activityColor};">${initials}</div>`
                    : `<div class="em-marker-initials" style="background: ${activityColor};">${initials}</div>`
                }
                ${isOutside ? '<div class="em-marker-alert-badge">!</div>' : ''}
            </div>
        `;

        const icon = L.divIcon({
            className: 'em-marker-container',
            html: markerHtml,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
        });

        const marker = L.marker([lat, lng], { icon })
            .bindPopup(`
                <div class="em-popup">
                    <strong>${employee.name}</strong><br/>
                    <small>${employee.employeeId || ''}</small><br/>
                    <span class="em-popup-status" style="color: ${activityColor};">● ${translateActivity(status?.activity)}</span>
                    ${isOutside ? '<br/><span style="color: #f44336;">⚠ Fuera del area permitida</span>' : ''}
                    <br/><small>${location.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</small>
                    <br/><button class="em-popup-btn" onclick="EmployeeMapEngine.showRoute('${employee.id}', '${employee.name}')">Ver historial</button>
                </div>
            `);

        marker.employeeId = employee.id;
        marker.employeeData = { ...employee, location, status, isOutside };
        MapState.markers.push(marker);

        if (MapState.features.showClustering && MapState.markerClusterGroup) {
            MapState.markerClusterGroup.addLayer(marker);
        } else {
            marker.addTo(MapState.map);
        }
    });

    // Fit bounds if we have markers (but don't override current view if user is zoomed)
    if (bounds.length > 0 && !MapState.map._userMoved) {
        MapState.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
}

// ============================================================================
// VISITOR MARKERS - Marcadores para visitantes
// ============================================================================
function updateVisitorMarkers() {
    if (!MapState.map || !window.L) return;

    // Si visitantes desactivados, ocultar y salir
    if (!MapState.features.showVisitors) {
        MapState.visitorMarkers.forEach(m => MapState.map.removeLayer(m));
        MapState.visitorMarkers = [];
        return;
    }

    // Clear existing visitor markers
    MapState.visitorMarkers.forEach(m => MapState.map.removeLayer(m));
    MapState.visitorMarkers = [];

    // Apply personType filter
    if (MapState.filters.personType === 'employees') {
        return; // Solo empleados, no mostrar visitantes
    }

    MapState.visitors.forEach(v => {
        const { visitor, visit, location, status } = v;
        if (!location?.latitude || !location?.longitude) return;

        const lat = parseFloat(location.latitude);
        const lng = parseFloat(location.longitude);

        // Determinar color segun estado
        let visitorColor = '#00bcd4'; // Cyan - visitante OK
        let statusText = 'En instalaciones';

        if (status?.isOverdue) {
            visitorColor = '#e91e63'; // Pink - tiempo excedido
            statusText = 'Tiempo excedido';
        }
        if (!status?.isInsideFacility || v.isOutsideGeofence) {
            visitorColor = '#f44336'; // Red - fuera de zona
            statusText = 'Fuera de zona';
        }
        if (status?.hasAlert) {
            visitorColor = '#f44336';
            statusText = `Alerta: ${status.alertType}`;
        }

        const photoUrl = visitor.photoUrl;
        const initials = getInitials(visitor.name);
        const isAlert = status?.isOverdue || !status?.isInsideFacility || status?.hasAlert;

        const markerHtml = `
            <div class="em-marker em-marker-visitor ${isAlert ? 'em-marker-alert' : ''}" style="border-color: ${visitorColor}; border-style: dashed;">
                ${photoUrl
                    ? `<img src="${photoUrl}" alt="${visitor.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="em-marker-initials" style="display:none; background: ${visitorColor};">${initials}</div>`
                    : `<div class="em-marker-initials" style="background: ${visitorColor};">${initials}</div>`
                }
                <div class="em-marker-visitor-badge">V</div>
                ${isAlert ? '<div class="em-marker-alert-badge">!</div>' : ''}
            </div>
        `;

        const icon = L.divIcon({
            className: 'em-marker-container em-marker-visitor-container',
            html: markerHtml,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
        });

        const checkInTime = new Date(visit.checkIn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

        const marker = L.marker([lat, lng], { icon })
            .bindPopup(`
                <div class="em-popup em-popup-visitor">
                    <div class="em-popup-header" style="background: ${visitorColor}; color: white; padding: 8px; margin: -10px -10px 10px -10px; border-radius: 4px 4px 0 0;">
                        <strong>VISITANTE</strong>
                    </div>
                    <strong>${visitor.name}</strong><br/>
                    <small>DNI: ${visitor.dni}</small><br/>
                    <span class="em-popup-status" style="color: ${visitorColor};">● ${statusText}</span>
                    <br/><small><b>Motivo:</b> ${visit.reason || 'No especificado'}</small>
                    <br/><small><b>Responsable:</b> ${visit.responsibleName || 'N/A'}</small>
                    <br/><small><b>Departamento:</b> ${visit.department || 'N/A'}</small>
                    <br/><small><b>Ingreso:</b> ${checkInTime}</small>
                    <br/><small><b>Tiempo:</b> ${v.minutesInside || 0} min</small>
                    ${visitor.keyringId ? `<br/><small><b>Llavero:</b> ${visitor.keyringId}</small>` : ''}
                    ${isAlert ? `<br/><span style="color: #f44336;">⚠ ${statusText}</span>` : ''}
                </div>
            `);

        marker.visitorId = visitor.id;
        marker.visitorData = v;
        MapState.visitorMarkers.push(marker);
        marker.addTo(MapState.map);
    });

    console.log(`[MAP] ${MapState.visitorMarkers.length} visitantes en mapa`);
}

function getFilteredLocations() {
    // Si personType es 'visitors', no mostrar empleados
    if (MapState.filters.personType === 'visitors') {
        return [];
    }

    let filtered = [...MapState.locations];

    // Filter by search
    if (MapState.filters.search) {
        const search = MapState.filters.search.toLowerCase();
        filtered = filtered.filter(l =>
            l.employee?.name?.toLowerCase().includes(search) ||
            l.employee?.employeeId?.toLowerCase().includes(search)
        );
    }

    // Filter by activity
    if (MapState.filters.activity !== 'all') {
        filtered = filtered.filter(l => l.status?.activity === MapState.filters.activity);
    }

    // Filter by department
    if (MapState.filters.department !== 'all') {
        filtered = filtered.filter(l => l.employee?.department_id == MapState.filters.department);
    }

    // Filter by geofence status
    if (MapState.filters.geofence === 'inside') {
        filtered = filtered.filter(l => !l.isOutsideGeofence);
    } else if (MapState.filters.geofence === 'outside') {
        filtered = filtered.filter(l => l.isOutsideGeofence);
    }

    return filtered;
}

function updateEmployeeList() {
    const listEl = document.getElementById('em-employee-list');
    const countEl = document.getElementById('em-filtered-count');
    if (!listEl) return;

    const filtered = getFilteredLocations();

    if (countEl) {
        countEl.textContent = filtered.length !== MapState.locations.length
            ? `(${filtered.length}/${MapState.locations.length})`
            : `(${filtered.length})`;
    }

    if (filtered.length === 0) {
        listEl.innerHTML = MapState.locations.length === 0
            ? showNoEmployeesMessageHTML()
            : '<div class="em-empty-state"><p>No hay empleados que coincidan con los filtros</p></div>';
        return;
    }

    listEl.innerHTML = filtered
        .filter(loc => loc.employee) // Filtrar empleados válidos
        .map(loc => {
        const { employee, location, status, minutesWorking, isOutsideGeofence } = loc;
        const photoUrl = employee.photoUrl || employee.photo_url || employee.biometric_photo_url;
        const initials = getInitials(employee.name);
        const activityColor = getActivityColor(status?.activity);

        return `
            <div class="em-employee-card ${isOutsideGeofence ? 'em-card-alert' : ''}" onclick="EmployeeMapEngine.focusEmployee('${employee.id}')">
                <div class="em-employee-photo" style="border-color: ${activityColor};">
                    ${photoUrl
                        ? `<img src="${photoUrl}" alt="${employee.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="em-initials" style="display:none;">${initials}</div>`
                        : `<div class="em-initials">${initials}</div>`
                    }
                    ${isOutsideGeofence ? '<div class="em-card-alert-badge">!</div>' : ''}
                </div>
                <div class="em-employee-info">
                    <div class="em-employee-name">${employee.name}</div>
                    <div class="em-employee-role">${employee.position || employee.role || ''}</div>
                    <div class="em-employee-status">
                        <span style="color: ${activityColor};">●</span> ${translateActivity(status?.activity)}
                        ${minutesWorking ? ` · ${minutesWorking} min` : ''}
                    </div>
                    ${isOutsideGeofence ? '<div class="em-employee-alert">⚠ Fuera de zona</div>' : ''}
                </div>
                <div class="em-employee-actions">
                    <button onclick="event.stopPropagation(); EmployeeMapEngine.showRoute('${employee.id}', '${employee.name}')" class="em-btn em-btn-xs" title="Ver ruta">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateStats() {
    const total = MapState.locations.length;
    const working = MapState.locations.filter(l => l.status?.activity === 'working').length;
    const onBreak = MapState.locations.filter(l => l.status?.isOnBreak || l.status?.activity === 'break').length;
    const inGeofence = MapState.locations.filter(l => !l.isOutsideGeofence).length;
    const outside = MapState.locations.filter(l => l.isOutsideGeofence).length;

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setEl('em-stat-total', total);
    setEl('em-stat-working', working);
    setEl('em-stat-break', onBreak);
    setEl('em-stat-geofence', inGeofence);
    setEl('em-stat-outside', outside);
}

function updateHeatmap() {
    if (!MapState.map || !window.L?.heatLayer) return;

    // Remove existing heatmap
    if (MapState.heatmapLayer) {
        MapState.map.removeLayer(MapState.heatmapLayer);
        MapState.heatmapLayer = null;
    }

    if (!MapState.features.showHeatmap || MapState.locations.length === 0) return;

    const heatData = MapState.locations
        .filter(l => l.location?.latitude && l.location?.longitude)
        .map(l => [parseFloat(l.location.latitude), parseFloat(l.location.longitude), 1]);

    if (heatData.length > 0) {
        MapState.heatmapLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: {0.4: '#4caf50', 0.6: '#ffeb3b', 0.8: '#ff9800', 1: '#f44336'}
        }).addTo(MapState.map);
    }
}

// ============================================================================
// ROUTE TRACKING
// ============================================================================
function showRoutePanel(employeeId, employeeName) {
    const panel = document.getElementById('em-route-panel');
    const employeeEl = document.getElementById('em-route-employee');
    const dateEl = document.getElementById('em-route-date');

    if (panel && employeeEl && dateEl) {
        panel.style.display = 'block';
        employeeEl.innerHTML = `<strong>${employeeName}</strong>`;
        employeeEl.dataset.employeeId = employeeId;
        dateEl.value = new Date().toISOString().split('T')[0];
        loadRouteData(employeeId, dateEl.value);
    }
}

async function loadRouteData(employeeId, date) {
    const pointsEl = document.getElementById('em-route-points');
    if (!pointsEl) return;

    pointsEl.innerHTML = '<div class="em-loading"><div class="em-spinner"></div></div>';

    try {
        const response = await MapAPI.getTrack(employeeId, date);

        // Clear existing route
        if (MapState.routeLayer) {
            MapState.map.removeLayer(MapState.routeLayer);
            MapState.routeLayer = null;
        }

        if (response.success && response.data && response.data.length > 0) {
            const points = response.data;

            // Draw route line
            const latLngs = points.map(p => [p.latitude, p.longitude]);
            MapState.routeLayer = L.polyline(latLngs, {
                color: '#9c27b0',
                weight: 3,
                opacity: 0.8,
                dashArray: '10, 5'
            }).addTo(MapState.map);

            // Add markers for each point
            points.forEach((p, idx) => {
                const isStart = idx === 0;
                const isEnd = idx === points.length - 1;
                const color = p.eventType === 'check_in' ? '#4caf50' : '#f44336';

                L.circleMarker([p.latitude, p.longitude], {
                    radius: isStart || isEnd ? 8 : 5,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.8
                }).bindPopup(`
                    <strong>${p.eventType === 'check_in' ? 'Entrada' : 'Salida'}</strong><br/>
                    ${new Date(p.timestamp).toLocaleTimeString()}
                `).addTo(MapState.map);
            });

            // Fit map to route
            MapState.map.fitBounds(latLngs, { padding: [50, 50] });

            // Update points list
            pointsEl.innerHTML = points.map(p => `
                <div class="em-route-point">
                    <span class="em-route-point-type" style="color: ${p.eventType === 'check_in' ? '#4caf50' : '#f44336'}">
                        ${p.eventType === 'check_in' ? '▶' : '◼'}
                    </span>
                    <span class="em-route-point-time">${new Date(p.timestamp).toLocaleTimeString()}</span>
                    <span class="em-route-point-label">${p.eventType === 'check_in' ? 'Entrada' : 'Salida'}</span>
                </div>
            `).join('');
        } else {
            pointsEl.innerHTML = '<p class="em-text-muted">Sin registros para esta fecha</p>';
        }
    } catch (error) {
        pointsEl.innerHTML = `<p class="em-text-error">Error: ${error.message}</p>`;
    }
}

// ============================================================================
// FEATURE TOGGLES
// ============================================================================
function toggleFeature(feature) {
    MapState.features[feature] = !MapState.features[feature];

    const btnId = {
        showGeofence: 'em-btn-geofence',
        showHeatmap: 'em-btn-heatmap',
        showAllBranches: 'em-btn-branches',
        showClustering: 'em-btn-cluster',
        showVisitors: 'em-btn-visitors'
    }[feature];

    const btn = document.getElementById(btnId);
    if (btn) {
        btn.classList.toggle('em-btn-active', MapState.features[feature]);
    }

    // Apply feature changes
    switch(feature) {
        case 'showGeofence':
            MapState.branchCircles.forEach(({ circle, isMain }) => {
                if (MapState.features.showGeofence && (isMain || MapState.features.showAllBranches)) {
                    circle.addTo(MapState.map);
                } else {
                    MapState.map.removeLayer(circle);
                }
            });
            break;
        case 'showHeatmap':
            updateHeatmap();
            break;
        case 'showAllBranches':
            MapState.branchMarkers.forEach(({ marker, isMain }) => {
                if (!isMain) {
                    if (MapState.features.showAllBranches) {
                        marker.addTo(MapState.map);
                    } else {
                        MapState.map.removeLayer(marker);
                    }
                }
            });
            MapState.branchCircles.forEach(({ circle, isMain }) => {
                if (!isMain && MapState.features.showGeofence) {
                    if (MapState.features.showAllBranches) {
                        circle.addTo(MapState.map);
                    } else {
                        MapState.map.removeLayer(circle);
                    }
                }
            });
            break;
        case 'showClustering':
            updateMapMarkers();
            break;
        case 'showVisitors':
            updateVisitorMarkers();
            break;
    }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================
function exportData(format) {
    const filtered = getFilteredLocations();

    if (filtered.length === 0) {
        showMessage('No hay datos para exportar', 'error');
        return;
    }

    const data = filtered.map(loc => ({
        Nombre: loc.employee?.name || '',
        Legajo: loc.employee?.employeeId || '',
        Departamento: loc.employee?.department || '',
        Estado: translateActivity(loc.status?.activity),
        Latitud: loc.location?.latitude || '',
        Longitud: loc.location?.longitude || '',
        EnZona: loc.isOutsideGeofence ? 'No' : 'Si',
        UltimaActualizacion: loc.reportedAt || ''
    }));

    if (format === 'excel') {
        exportToCSV(data, 'empleados_ubicacion');
    } else if (format === 'pdf') {
        exportToPDF(data, 'Reporte de Ubicaciones');
    }

    showMessage(`Exportando ${filtered.length} registros...`, 'success');
}

function exportToCSV(data, filename) {
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function exportToPDF(data, title) {
    // Create printable HTML
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #1a5f2a; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                th { background: #1a5f2a; color: white; }
                tr:nth-child(even) { background: #f9f9f9; }
                .alert { color: #f44336; font-weight: bold; }
                .footer { margin-top: 20px; font-size: 10px; color: #666; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <p>Fecha: ${new Date().toLocaleString()}</p>
            <p>Total empleados: ${data.length}</p>
            <table>
                <thead>
                    <tr>${Object.keys(data[0]).map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr class="${row.EnZona === 'No' ? 'alert' : ''}">
                            ${Object.values(row).map(v => `<td>${v}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">Generado por Sistema Biometrico Enterprise</div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
}

// ============================================================================
// UI HELPERS
// ============================================================================
function showNoEmployeesMessageHTML() {
    return `
        <div class="em-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
            </svg>
            <h4>Sin empleados activos</h4>
            <p>Los empleados apareceran cuando fichen entrada con GPS habilitado</p>
            <button class="em-btn em-btn-primary" onclick="EmployeeMapEngine.refresh()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                Actualizar
            </button>
        </div>
    `;
}

function showNoEmployeesMessage() {
    const listEl = document.getElementById('em-employee-list');
    if (listEl) {
        listEl.innerHTML = showNoEmployeesMessageHTML();
    }
}

function showErrorMessage(msg) {
    const listEl = document.getElementById('em-employee-list');
    if (listEl) {
        listEl.innerHTML = `
            <div class="em-empty-state em-error">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h4>Error de conexion</h4>
                <p>${msg}</p>
                <button class="em-btn em-btn-primary" onclick="EmployeeMapEngine.refresh()">Reintentar</button>
            </div>
        `;
    }
}

function showMessage(text, type = 'info') {
    const msgEl = document.getElementById('em-map-message');
    if (msgEl) {
        msgEl.className = `em-map-overlay em-msg-${type}`;
        msgEl.textContent = text;
        msgEl.style.display = 'block';
        setTimeout(() => { msgEl.style.display = 'none'; }, 3000);
    }
}

function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getActivityColor(activity) {
    const colors = {
        working: '#4caf50',
        break: '#ff9800',
        lunch: '#ff9800',
        meeting: '#2196f3',
        travel: '#9c27b0',
        idle: '#757575'
    };
    return colors[activity] || '#4caf50';
}

function translateActivity(activity) {
    const translations = {
        working: 'Trabajando',
        break: 'Descanso',
        lunch: 'Almuerzo',
        meeting: 'Reunion',
        travel: 'En transito',
        idle: 'Inactivo'
    };
    return translations[activity] || 'Activo';
}

// ============================================================================
// ENGINE OBJECT
// ============================================================================
const EmployeeMapEngine = {
    async init() {
        console.log('[MAP] Inicializando v5.0...');
        wsReconnectEnabled = true; // Habilitar reconexión cuando se inicia el módulo
        await initLeafletMap();
        initMapWebSocket();
        await loadLocations();
    },

    async refresh() {
        showMessage('Actualizando...', 'info');
        await loadLocations();
    },

    toggleAutoRefresh() {
        MapState.autoRefresh = !MapState.autoRefresh;
        const btn = document.getElementById('em-auto-refresh-btn');

        if (MapState.autoRefresh) {
            MapState.autoRefreshInterval = setInterval(() => loadLocations(), 30000);
            if (btn) btn.classList.add('em-btn-active');
            showMessage('Auto-actualizacion activada (30s)', 'success');
        } else {
            clearInterval(MapState.autoRefreshInterval);
            if (btn) btn.classList.remove('em-btn-active');
            showMessage('Auto-actualizacion desactivada', 'info');
        }
    },

    toggleMapStyle() {
        toggleMapStyle();
    },

    toggleFeature(feature) {
        toggleFeature(feature);
    },

    filterByActivity() {
        MapState.filters.activity = document.getElementById('em-filter-activity')?.value || 'all';
        updateMapMarkers();
        updateEmployeeList();
    },

    filterByDepartment() {
        MapState.filters.department = document.getElementById('em-filter-department')?.value || 'all';
        updateMapMarkers();
        updateEmployeeList();
    },

    filterByBranch() {
        MapState.filters.branch = document.getElementById('em-filter-branch')?.value || 'all';
        // Focus on selected branch
        if (MapState.filters.branch !== 'all') {
            const branch = MapState.allBranches.find(b => b.id === MapState.filters.branch);
            if (branch && MapState.map) {
                MapState.map.setView([branch.latitude, branch.longitude], 15);
            }
        }
        updateMapMarkers();
        updateEmployeeList();
    },

    filterByPersonType() {
        MapState.filters.personType = document.getElementById('em-filter-person-type')?.value || 'all';
        updateMapMarkers();
        updateVisitorMarkers();
        updateEmployeeList();
    },

    searchEmployee(query) {
        MapState.filters.search = query;
        updateMapMarkers();
        updateEmployeeList();
    },

    focusEmployee(employeeId) {
        const marker = MapState.markers.find(m => m.employeeId === employeeId);
        if (marker && MapState.map) {
            if (MapState.features.showClustering && MapState.markerClusterGroup) {
                MapState.markerClusterGroup.zoomToShowLayer(marker, () => {
                    marker.openPopup();
                });
            } else {
                MapState.map.setView(marker.getLatLng(), 17);
                marker.openPopup();
            }
        }
    },

    centerOnBranch() {
        if (MapState.branchLocation && MapState.map) {
            MapState.map.setView([MapState.branchLocation.latitude, MapState.branchLocation.longitude], 14);
            showMessage(`Centrado en: ${MapState.branchLocation.name}`, 'info');
        }
    },

    showRoute(employeeId, employeeName) {
        showRoutePanel(employeeId, employeeName);
    },

    loadRoute() {
        const employeeId = document.getElementById('em-route-employee')?.dataset?.employeeId;
        const date = document.getElementById('em-route-date')?.value;
        if (employeeId && date) {
            loadRouteData(employeeId, date);
        }
    },

    closeRoutePanel() {
        const panel = document.getElementById('em-route-panel');
        if (panel) panel.style.display = 'none';

        // Clear route layer
        if (MapState.routeLayer) {
            MapState.map.removeLayer(MapState.routeLayer);
            MapState.routeLayer = null;
        }
    },

    exportData(format) {
        exportData(format);
    }
};

// ============================================================================
// INJECT STYLES
// ============================================================================
function injectMapStyles() {
    if (document.getElementById('em-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'em-styles';
    styles.textContent = `
        /* CSS Variables - Dark Enterprise Theme */
        .em-enterprise {
            --em-bg-primary: #0f0f1a;
            --em-bg-secondary: #1a1a2e;
            --em-bg-card: #1e1e35;
            --em-border: #2d2d4a;
            --em-text-primary: #e8e8f0;
            --em-text-secondary: #a0a0b8;
            --em-text-muted: #6b6b80;
            --em-accent: #4caf50;
            --em-accent-blue: #2196f3;
            --em-accent-orange: #ff9800;
            --em-danger: #f44336;

            background: var(--em-bg-primary);
            min-height: 100vh;
            color: var(--em-text-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Header */
        .em-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: var(--em-bg-secondary);
            border-bottom: 1px solid var(--em-border);
        }

        .em-header-left, .em-header-right { display: flex; align-items: center; gap: 10px; }

        .em-logo {
            width: 36px; height: 36px;
            background: linear-gradient(135deg, #2e7d32, #4caf50);
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            color: white;
        }

        .em-title {
            font-size: 16px; font-weight: 700; letter-spacing: 1px; margin: 0;
            background: linear-gradient(90deg, #4caf50, #81c784);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .em-subtitle { font-size: 10px; color: var(--em-text-muted); text-transform: uppercase; }

        .em-tech-badges { display: flex; gap: 6px; }
        .em-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 500;
        }
        .em-badge-gps { background: rgba(76, 175, 80, 0.15); color: #4caf50; border: 1px solid rgba(76, 175, 80, 0.3); }
        .em-badge-leaflet { background: rgba(33, 150, 243, 0.15); color: #2196f3; border: 1px solid rgba(33, 150, 243, 0.3); }
        .em-badge-ws { background: rgba(255, 152, 0, 0.15); color: #ff9800; border: 1px solid rgba(255, 152, 0, 0.3); }

        .em-connection { font-size: 11px; display: flex; align-items: center; gap: 5px; }
        .em-status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .em-status-online { background: #4caf50; box-shadow: 0 0 6px #4caf50; }
        .em-status-offline { background: #f44336; }

        .em-btn { background: transparent; border: 1px solid var(--em-border); border-radius: 6px; color: var(--em-text-primary); cursor: pointer; transition: all 0.2s; }
        .em-btn:hover { background: var(--em-bg-card); border-color: var(--em-accent); }
        .em-btn-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
        .em-btn-sm { padding: 4px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; }
        .em-btn-xs { width: 24px; height: 24px; padding: 0; display: flex; align-items: center; justify-content: center; }
        .em-btn-active { background: var(--em-accent) !important; border-color: var(--em-accent) !important; color: white !important; }
        .em-btn-primary { background: var(--em-accent); border-color: var(--em-accent); padding: 8px 14px; display: inline-flex; align-items: center; gap: 5px; }
        .em-btn-style { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }

        /* Stats Bar */
        .em-stats-bar {
            display: flex; justify-content: center; gap: 30px;
            padding: 12px 20px; background: var(--em-bg-secondary);
            border-bottom: 1px solid var(--em-border);
        }
        .em-stat-item { text-align: center; }
        .em-stat-value { font-size: 22px; font-weight: 700; color: var(--em-text-primary); }
        .em-stat-working { color: #4caf50; }
        .em-stat-break { color: #ff9800; }
        .em-stat-geofence { color: #2196f3; }
        .em-stat-outside { color: #f44336; }
        .em-stat-label { font-size: 10px; color: var(--em-text-muted); text-transform: uppercase; margin-top: 2px; }

        /* Toolbar */
        .em-toolbar {
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 20px; background: var(--em-bg-secondary);
            border-bottom: 1px solid var(--em-border); gap: 12px;
        }
        .em-toolbar-left, .em-toolbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        .em-search-box {
            display: flex; align-items: center; gap: 8px;
            background: var(--em-bg-card); border: 1px solid var(--em-border);
            border-radius: 6px; padding: 0 10px;
        }
        .em-search-box input {
            background: transparent; border: none; color: var(--em-text-primary);
            padding: 6px 0; font-size: 12px; width: 150px; outline: none;
        }
        .em-search-box input::placeholder { color: var(--em-text-muted); }
        .em-search-box svg { color: var(--em-text-muted); }

        .em-select {
            background: var(--em-bg-card); border: 1px solid var(--em-border);
            color: var(--em-text-primary); padding: 6px 10px; border-radius: 6px; font-size: 11px;
        }
        .em-input {
            background: var(--em-bg-card); border: 1px solid var(--em-border);
            color: var(--em-text-primary); padding: 6px 10px; border-radius: 6px; font-size: 12px;
        }

        /* Main Layout */
        .em-main { display: flex; height: calc(100vh - 180px); }
        .em-map-container { flex: 1; position: relative; }
        .em-map { width: 100%; height: 100%; background: var(--em-bg-primary); }
        .em-map-overlay {
            position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
            padding: 6px 14px; border-radius: 6px; font-size: 12px; z-index: 1000;
        }
        .em-msg-success { background: rgba(76, 175, 80, 0.9); color: white; }
        .em-msg-error { background: rgba(244, 67, 54, 0.9); color: white; }
        .em-msg-info { background: rgba(33, 150, 243, 0.9); color: white; }

        /* Legend */
        .em-legend {
            position: absolute; bottom: 20px; left: 20px;
            background: var(--em-bg-secondary); border: 1px solid var(--em-border);
            border-radius: 8px; padding: 12px; z-index: 1000; min-width: 140px;
        }
        .em-legend-title { font-size: 11px; font-weight: 600; margin-bottom: 8px; color: var(--em-text-secondary); }
        .em-legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 4px; }
        .em-legend-dot { width: 10px; height: 10px; border-radius: 50%; }
        .em-legend-icon { width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; }
        .em-legend-branch { background: #2196f3; border-radius: 3px; }
        .em-legend-geofence { border: 2px solid #2196f3; border-radius: 50%; }
        .em-legend-alert { background: #f44336; border-radius: 50%; }
        .em-legend-divider { height: 1px; background: var(--em-border); margin: 8px 0; }

        /* Route Panel */
        .em-route-panel {
            position: absolute; top: 20px; right: 20px;
            background: var(--em-bg-secondary); border: 1px solid var(--em-border);
            border-radius: 8px; width: 280px; z-index: 1001;
        }
        .em-route-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px; border-bottom: 1px solid var(--em-border);
        }
        .em-route-header h4 { margin: 0; font-size: 13px; }
        .em-route-content { padding: 12px; }
        .em-route-employee { margin-bottom: 10px; font-size: 13px; }
        .em-route-points { margin-top: 10px; max-height: 200px; overflow-y: auto; }
        .em-route-point { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 12px; border-bottom: 1px solid var(--em-border); }
        .em-route-point-type { font-size: 10px; }
        .em-route-point-time { font-weight: 500; }
        .em-route-point-label { color: var(--em-text-muted); }

        /* Sidebar */
        .em-sidebar {
            width: 300px; background: var(--em-bg-secondary);
            border-left: 1px solid var(--em-border); display: flex; flex-direction: column;
        }
        .em-sidebar-header {
            padding: 12px; border-bottom: 1px solid var(--em-border);
            display: flex; justify-content: space-between; align-items: center;
        }
        .em-sidebar-header h3 { margin: 0; font-size: 13px; font-weight: 600; }
        .em-sidebar-header span { color: var(--em-text-muted); font-size: 11px; }
        .em-employee-list { flex: 1; overflow-y: auto; padding: 6px; }

        /* Employee Card */
        .em-employee-card {
            display: flex; align-items: center; gap: 10px;
            padding: 10px; background: var(--em-bg-card);
            border-radius: 8px; margin-bottom: 6px; cursor: pointer;
            border: 1px solid transparent; transition: all 0.2s;
        }
        .em-employee-card:hover { border-color: var(--em-accent); transform: translateX(3px); }
        .em-card-alert { border-color: var(--em-danger) !important; background: rgba(244, 67, 54, 0.1); }
        .em-employee-photo {
            width: 40px; height: 40px; border-radius: 50%;
            border: 2px solid var(--em-accent); overflow: hidden;
            display: flex; align-items: center; justify-content: center;
            background: var(--em-bg-primary); position: relative;
        }
        .em-employee-photo img { width: 100%; height: 100%; object-fit: cover; }
        .em-initials { font-size: 12px; font-weight: 600; color: var(--em-text-primary); }
        .em-card-alert-badge {
            position: absolute; top: -2px; right: -2px;
            width: 14px; height: 14px; background: var(--em-danger);
            border-radius: 50%; font-size: 10px; font-weight: bold;
            display: flex; align-items: center; justify-content: center; color: white;
        }
        .em-employee-info { flex: 1; min-width: 0; }
        .em-employee-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .em-employee-role { font-size: 10px; color: var(--em-text-muted); }
        .em-employee-status { font-size: 11px; color: var(--em-text-secondary); margin-top: 2px; }
        .em-employee-alert { font-size: 10px; color: var(--em-danger); margin-top: 2px; }
        .em-employee-actions { display: flex; gap: 4px; }

        /* Empty State */
        .em-empty-state {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; height: 100%; text-align: center;
            color: var(--em-text-muted); padding: 20px;
        }
        .em-empty-state svg { margin-bottom: 12px; opacity: 0.5; }
        .em-empty-state h4 { margin: 0 0 6px; color: var(--em-text-secondary); font-size: 14px; }
        .em-empty-state p { margin: 0 0 12px; font-size: 12px; }
        .em-error svg { stroke: #f44336; }
        .em-text-muted { color: var(--em-text-muted); font-size: 12px; }
        .em-text-error { color: var(--em-danger); font-size: 12px; }

        /* Loading */
        .em-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; }
        .em-spinner {
            width: 28px; height: 28px; border: 3px solid var(--em-border);
            border-top-color: var(--em-accent); border-radius: 50%;
            animation: em-spin 1s linear infinite;
        }
        @keyframes em-spin { to { transform: rotate(360deg); } }

        /* Custom Markers */
        .em-marker-container { background: transparent !important; border: none !important; }
        .em-marker {
            width: 40px; height: 40px; border-radius: 50%;
            border: 3px solid #4caf50; background: var(--em-bg-card);
            display: flex; align-items: center; justify-content: center;
            overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            position: relative;
        }
        .em-marker img { width: 100%; height: 100%; object-fit: cover; }
        .em-marker-initials {
            width: 100%; height: 100%; display: flex;
            align-items: center; justify-content: center;
            font-size: 12px; font-weight: 700; color: white;
        }
        .em-marker-alert { border-color: #f44336 !important; animation: em-alert-pulse 1s infinite; }
        .em-marker-alert-badge {
            position: absolute; top: -4px; right: -4px;
            width: 16px; height: 16px; background: #f44336;
            border-radius: 50%; font-size: 11px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            color: white; border: 2px solid var(--em-bg-card);
        }
        @keyframes em-alert-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(244, 67, 54, 0); }
        }

        /* Visitor Markers */
        .em-marker-visitor { border-style: dashed !important; }
        .em-marker-visitor-badge {
            position: absolute; bottom: -4px; right: -4px;
            width: 18px; height: 18px; background: #00bcd4;
            border-radius: 50%; font-size: 10px; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            color: white; border: 2px solid var(--em-bg-card);
        }
        .em-popup-visitor { min-width: 200px; }
        .em-legend-subtitle {
            font-size: 10px; font-weight: 600; color: var(--em-text-muted);
            text-transform: uppercase; letter-spacing: 0.5px;
            margin: 8px 0 4px 0; padding-top: 4px;
        }
        .em-legend-alert-dot { animation: em-alert-pulse 1s infinite; }

        /* Cluster Markers */
        .em-cluster-container { background: transparent !important; border: none !important; }
        .em-cluster {
            width: 40px; height: 40px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; color: white;
        }
        .em-cluster-small { background: rgba(76, 175, 80, 0.8); font-size: 12px; }
        .em-cluster-medium { background: rgba(255, 152, 0, 0.8); font-size: 14px; }
        .em-cluster-large { background: rgba(244, 67, 54, 0.8); font-size: 16px; }

        /* Branch Marker */
        .em-branch-marker-container { background: transparent !important; border: none !important; }
        .em-branch-marker {
            width: 32px; height: 32px;
            background: rgba(33, 150, 243, 0.2);
            border: 2px solid #607d8b;
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .em-branch-main {
            border-color: #2196f3;
            animation: em-branch-pulse 2s ease-in-out infinite;
        }
        @keyframes em-branch-pulse {
            0%, 100% { box-shadow: 0 2px 6px rgba(33, 150, 243, 0.4); }
            50% { box-shadow: 0 2px 12px rgba(33, 150, 243, 0.7); }
        }

        /* Popup */
        .em-popup { font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1.4; }
        .em-popup strong { font-size: 13px; }
        .em-popup-status { font-weight: 500; }
        .em-popup-btn {
            margin-top: 8px; padding: 4px 10px;
            background: var(--em-accent); color: white;
            border: none; border-radius: 4px; cursor: pointer;
            font-size: 11px;
        }

        /* Leaflet overrides for dark theme */
        .leaflet-popup-content-wrapper { background: #1e1e35; color: #e8e8f0; border-radius: 8px; }
        .leaflet-popup-tip { background: #1e1e35; }
        .leaflet-control-zoom a { background: #1a1a2e !important; color: #e8e8f0 !important; border-color: #2d2d4a !important; }
        .leaflet-control-zoom a:hover { background: #1e1e35 !important; }
    `;
    document.head.appendChild(styles);
}

// ============================================================================
// EXPORTS
// ============================================================================
window.EmployeeMapEngine = EmployeeMapEngine;
window.showEmployeeMapContent = showEmployeeMapContent;

// Auto-init if module loaded directly
if (document.getElementById('mainContent')) {
    setTimeout(() => {
        if (document.getElementById('employee-map') || document.querySelector('[data-module="employee-map"]')) {
            showEmployeeMapContent();
        }
    }, 100);
}
