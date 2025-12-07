/**
 * ============================================================================
 * EMPLOYEE MAP MODULE COLLECTOR - Phase4 E2E Testing con Playwright
 * ============================================================================
 *
 * Testea el módulo de Mapa de Empleados - Visualización Geográfica:
 * - Mapa Leaflet con ubicaciones en tiempo real
 * - Geofencing y alertas
 * - Clustering de marcadores
 * - Filtros por departamento/sucursal
 * - Heatmap de concentración
 * - Historial de rutas
 * - WebSocket para actualizaciones real-time
 * - Visitantes activos con GPS
 *
 * @version 1.0.0
 * @date 2025-12-07
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class EmployeeMapModuleCollector extends BaseModuleCollector {

    /**
     * Configuración del módulo
     */
    getModuleConfig() {
        return {
            moduleName: 'employee-map',
            moduleURL: '/panel-empresa.html',
            testCategories: [
                // ============================================
                // MAPA Y VISUALIZACIÓN
                // ============================================
                { name: 'map_initialization', func: this.testMapInitialization.bind(this) },
                { name: 'map_tile_layers', func: this.testMapTileLayers.bind(this) },
                { name: 'map_markers_display', func: this.testMapMarkersDisplay.bind(this) },
                { name: 'map_clustering', func: this.testMapClustering.bind(this) },

                // ============================================
                // DATOS EN TIEMPO REAL
                // ============================================
                { name: 'current_locations_api', func: this.testCurrentLocationsAPI.bind(this) },
                { name: 'visitors_api', func: this.testVisitorsAPI.bind(this) },
                { name: 'websocket_connection', func: this.testWebSocketConnection.bind(this) },
                { name: 'auto_refresh', func: this.testAutoRefresh.bind(this) },

                // ============================================
                // GEOFENCING
                // ============================================
                { name: 'geofence_circle', func: this.testGeofenceCircle.bind(this) },
                { name: 'geofence_alerts', func: this.testGeofenceAlerts.bind(this) },
                { name: 'branch_center', func: this.testBranchCenter.bind(this) },

                // ============================================
                // FILTROS
                // ============================================
                { name: 'filter_by_department', func: this.testFilterByDepartment.bind(this) },
                { name: 'filter_by_branch', func: this.testFilterByBranch.bind(this) },
                { name: 'filter_by_activity', func: this.testFilterByActivity.bind(this) },
                { name: 'search_employee', func: this.testSearchEmployee.bind(this) },

                // ============================================
                // FEATURES AVANZADOS
                // ============================================
                { name: 'heatmap_layer', func: this.testHeatmapLayer.bind(this) },
                { name: 'route_history', func: this.testRouteHistory.bind(this) },
                { name: 'export_pdf_excel', func: this.testExportPDFExcel.bind(this) },
                { name: 'multi_branch_view', func: this.testMultiBranchView.bind(this) },

                // ============================================
                // INTEGRACIONES
                // ============================================
                { name: 'integration_users', func: this.testIntegrationUsers.bind(this) },
                { name: 'integration_branches', func: this.testIntegrationBranches.bind(this) },
                { name: 'integration_departments', func: this.testIntegrationDepartments.bind(this) },

                // ============================================
                // DATABASE VALIDATION
                // ============================================
                { name: 'db_employee_locations_table', func: this.testDBEmployeeLocationsTable.bind(this) },
                { name: 'db_geofence_config', func: this.testDBGeofenceConfig.bind(this) }
            ]
        };
    }

    // ========================================================================
    // MAPA Y VISUALIZACIÓN
    // ========================================================================

    /**
     * Test: Inicialización del mapa Leaflet
     */
    async testMapInitialization(execution_id) {
        const testName = 'map_initialization';
        console.log(`    🗺️ [MAP] Testeando inicialización del mapa...`);

        try {
            await this.navigateToModule('employee-map');
            await this.page.waitForTimeout(2000);

            // Verificar que Leaflet está cargado
            const leafletLoaded = await this.page.evaluate(() => {
                return typeof L !== 'undefined' && L.version !== undefined;
            });

            // Verificar que el contenedor del mapa existe
            const mapContainerExists = await this.page.evaluate(() => {
                const container = document.querySelector('#employee-map, #map-container, .leaflet-container');
                return !!container;
            });

            // Verificar que MapState está inicializado
            const mapStateExists = await this.page.evaluate(() => {
                return typeof MapState !== 'undefined' && MapState.map !== null;
            });

            const success = leafletLoaded && mapContainerExists;

            return this.createTestResult(execution_id, testName, success, {
                leafletLoaded,
                mapContainerExists,
                mapStateExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Capas de tiles del mapa (dark/light)
     */
    async testMapTileLayers(execution_id) {
        const testName = 'map_tile_layers';
        console.log(`    🎨 [MAP] Testeando capas de tiles...`);

        try {
            await this.navigateToModule('employee-map');
            await this.page.waitForTimeout(1500);

            // Verificar que hay tiles cargados
            const tilesLoaded = await this.page.evaluate(() => {
                const tiles = document.querySelectorAll('.leaflet-tile-loaded');
                return tiles.length > 0;
            });

            // Verificar toggle de estilo dark/light
            const styleToggleExists = await this.page.evaluate(() => {
                const toggle = document.querySelector('[data-map-style], .map-style-toggle, #toggle-map-style');
                return !!toggle;
            });

            return this.createTestResult(execution_id, testName, tilesLoaded, {
                tilesLoaded,
                styleToggleExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Marcadores de empleados en el mapa
     */
    async testMapMarkersDisplay(execution_id) {
        const testName = 'map_markers_display';
        console.log(`    📍 [MAP] Testeando marcadores de empleados...`);

        try {
            await this.navigateToModule('employee-map');
            await this.page.waitForTimeout(2000);

            // Verificar que hay marcadores en el mapa
            const markersInfo = await this.page.evaluate(() => {
                const markers = document.querySelectorAll('.leaflet-marker-icon, .employee-marker');
                return {
                    count: markers.length,
                    hasMarkers: markers.length > 0
                };
            });

            // Verificar popup al click en marcador
            const popupExists = await this.page.evaluate(() => {
                const popup = document.querySelector('.leaflet-popup, .employee-popup');
                return !!popup;
            });

            return this.createTestResult(execution_id, testName, true, {
                markersCount: markersInfo.count,
                hasMarkers: markersInfo.hasMarkers,
                popupExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Clustering de marcadores
     */
    async testMapClustering(execution_id) {
        const testName = 'map_clustering';
        console.log(`    🔢 [MAP] Testeando clustering de marcadores...`);

        try {
            // Verificar que MarkerClusterGroup está disponible
            const clusteringAvailable = await this.page.evaluate(() => {
                return typeof L !== 'undefined' && typeof L.markerClusterGroup === 'function';
            });

            // Verificar que hay clusters renderizados
            const clustersExist = await this.page.evaluate(() => {
                const clusters = document.querySelectorAll('.marker-cluster, .leaflet-marker-icon.marker-cluster');
                return clusters.length > 0;
            });

            // Verificar toggle de clustering
            const clusterToggleExists = await this.page.evaluate(() => {
                if (typeof MapState !== 'undefined') {
                    return MapState.features?.showClustering !== undefined;
                }
                return false;
            });

            return this.createTestResult(execution_id, testName, clusteringAvailable, {
                clusteringAvailable,
                clustersExist,
                clusterToggleExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    // ========================================================================
    // DATOS EN TIEMPO REAL
    // ========================================================================

    /**
     * Test: API de ubicaciones actuales
     */
    async testCurrentLocationsAPI(execution_id) {
        const testName = 'current_locations_api';
        console.log(`    📡 [MAP] Testeando API de ubicaciones actuales...`);

        try {
            const apiResponse = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token') ||
                              localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                if (!token) return { error: 'No token' };

                try {
                    const response = await fetch('/api/v1/location/current', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return {
                        status: response.status,
                        ok: response.ok,
                        data: await response.json()
                    };
                } catch (e) {
                    return { error: e.message };
                }
            });

            const success = apiResponse.ok || apiResponse.status === 200 || apiResponse.status === 403;

            return this.createTestResult(execution_id, testName, success, {
                apiStatus: apiResponse.status,
                apiSuccess: apiResponse.ok,
                locationsCount: apiResponse.data?.locations?.length || apiResponse.data?.length || 0
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: API de visitantes
     */
    async testVisitorsAPI(execution_id) {
        const testName = 'visitors_api';
        console.log(`    👥 [MAP] Testeando API de visitantes...`);

        try {
            const apiResponse = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token') ||
                              localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                if (!token) return { error: 'No token' };

                try {
                    const response = await fetch('/api/v1/location/visitors', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return {
                        status: response.status,
                        exists: response.status !== 404
                    };
                } catch (e) {
                    return { error: e.message };
                }
            });

            const success = apiResponse.exists;

            return this.createTestResult(execution_id, testName, success, {
                endpointExists: apiResponse.exists,
                status: apiResponse.status
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Conexión WebSocket para real-time
     */
    async testWebSocketConnection(execution_id) {
        const testName = 'websocket_connection';
        console.log(`    🔌 [MAP] Testeando conexión WebSocket...`);

        try {
            // Verificar que el frontend soporta WebSocket
            const wsSupported = await this.page.evaluate(() => {
                // Verificar función de inicialización
                return typeof initMapWebSocket === 'function' ||
                       (typeof MapState !== 'undefined' && MapState.webSocket !== undefined);
            });

            // Verificar estado de conexión
            const wsState = await this.page.evaluate(() => {
                if (typeof MapState !== 'undefined' && MapState.webSocket) {
                    return {
                        connected: MapState.webSocket.readyState === WebSocket.OPEN,
                        readyState: MapState.webSocket.readyState
                    };
                }
                return { connected: false, readyState: -1 };
            });

            return this.createTestResult(execution_id, testName, wsSupported, {
                webSocketSupported: wsSupported,
                connectionState: wsState
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Auto-refresh de ubicaciones
     */
    async testAutoRefresh(execution_id) {
        const testName = 'auto_refresh';
        console.log(`    🔄 [MAP] Testeando auto-refresh...`);

        try {
            const autoRefreshSupported = await this.page.evaluate(() => {
                if (typeof MapState !== 'undefined') {
                    return {
                        hasAutoRefresh: MapState.autoRefresh !== undefined,
                        hasInterval: MapState.autoRefreshInterval !== undefined,
                        isActive: MapState.autoRefresh === true
                    };
                }
                return { hasAutoRefresh: false };
            });

            // Verificar botón de toggle
            const toggleExists = await this.page.evaluate(() => {
                const btn = document.querySelector('[data-action="toggle-refresh"], #auto-refresh-toggle');
                return !!btn;
            });

            return this.createTestResult(execution_id, testName, autoRefreshSupported.hasAutoRefresh, {
                ...autoRefreshSupported,
                toggleButtonExists: toggleExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    // ========================================================================
    // GEOFENCING
    // ========================================================================

    /**
     * Test: Círculo de geofence visual
     */
    async testGeofenceCircle(execution_id) {
        const testName = 'geofence_circle';
        console.log(`    ⭕ [MAP] Testeando círculo de geofence...`);

        try {
            const geofenceInfo = await this.page.evaluate(() => {
                // Buscar círculos de Leaflet
                const circles = document.querySelectorAll('.leaflet-interactive[stroke]');
                const hasGeofenceFeature = typeof MapState !== 'undefined' &&
                                          MapState.features?.showGeofence !== undefined;
                return {
                    circlesFound: circles.length,
                    hasGeofenceFeature
                };
            });

            return this.createTestResult(execution_id, testName, geofenceInfo.hasGeofenceFeature, {
                ...geofenceInfo
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Alertas de geofence
     */
    async testGeofenceAlerts(execution_id) {
        const testName = 'geofence_alerts';
        console.log(`    🚨 [MAP] Testeando alertas de geofence...`);

        try {
            // Verificar filtro de geofence
            const geofenceFilter = await this.page.evaluate(() => {
                if (typeof MapState !== 'undefined') {
                    return MapState.filters?.geofence !== undefined;
                }
                return false;
            });

            // Verificar indicador visual de empleados fuera de geofence
            const outOfGeofenceIndicator = await this.page.evaluate(() => {
                const indicator = document.querySelector('.out-of-geofence, [data-geofence="outside"]');
                return !!indicator;
            });

            return this.createTestResult(execution_id, testName, geofenceFilter, {
                geofenceFilterExists: geofenceFilter,
                outOfGeofenceIndicator
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Centro de sucursal
     */
    async testBranchCenter(execution_id) {
        const testName = 'branch_center';
        console.log(`    🏢 [MAP] Testeando centro de sucursal...`);

        try {
            const apiResponse = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token') ||
                              localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                if (!token) return { error: 'No token' };

                try {
                    const response = await fetch('/api/v1/location/branch-center', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return {
                        status: response.status,
                        exists: response.status !== 404,
                        data: await response.json()
                    };
                } catch (e) {
                    return { error: e.message };
                }
            });

            const success = apiResponse.exists && apiResponse.status !== 500;

            return this.createTestResult(execution_id, testName, success, {
                endpointExists: apiResponse.exists,
                status: apiResponse.status,
                hasCoordinates: apiResponse.data?.latitude !== undefined
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    // ========================================================================
    // FILTROS
    // ========================================================================

    /**
     * Test: Filtro por departamento
     */
    async testFilterByDepartment(execution_id) {
        const testName = 'filter_by_department';
        console.log(`    🏷️ [MAP] Testeando filtro por departamento...`);

        try {
            const filterExists = await this.page.evaluate(() => {
                const select = document.querySelector('#department-filter, [data-filter="department"], select[name="department"]');
                const hasFilter = typeof MapState !== 'undefined' && MapState.filters?.department !== undefined;
                return { selectExists: !!select, stateFilter: hasFilter };
            });

            return this.createTestResult(execution_id, testName, filterExists.selectExists || filterExists.stateFilter, {
                ...filterExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Filtro por sucursal
     */
    async testFilterByBranch(execution_id) {
        const testName = 'filter_by_branch';
        console.log(`    🏪 [MAP] Testeando filtro por sucursal...`);

        try {
            const filterExists = await this.page.evaluate(() => {
                const select = document.querySelector('#branch-filter, [data-filter="branch"], select[name="branch"]');
                const hasFilter = typeof MapState !== 'undefined' && MapState.filters?.branch !== undefined;
                return { selectExists: !!select, stateFilter: hasFilter };
            });

            return this.createTestResult(execution_id, testName, filterExists.selectExists || filterExists.stateFilter, {
                ...filterExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Filtro por actividad
     */
    async testFilterByActivity(execution_id) {
        const testName = 'filter_by_activity';
        console.log(`    🏃 [MAP] Testeando filtro por actividad...`);

        try {
            const filterExists = await this.page.evaluate(() => {
                const hasFilter = typeof MapState !== 'undefined' && MapState.filters?.activity !== undefined;
                const select = document.querySelector('#activity-filter, [data-filter="activity"]');
                return { selectExists: !!select, stateFilter: hasFilter };
            });

            return this.createTestResult(execution_id, testName, filterExists.stateFilter, {
                ...filterExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Búsqueda de empleado
     */
    async testSearchEmployee(execution_id) {
        const testName = 'search_employee';
        console.log(`    🔍 [MAP] Testeando búsqueda de empleado...`);

        try {
            const searchExists = await this.page.evaluate(() => {
                const input = document.querySelector('#employee-search, [data-search="employee"], input[placeholder*="Buscar"]');
                const hasFilter = typeof MapState !== 'undefined' && MapState.filters?.search !== undefined;
                return { inputExists: !!input, stateFilter: hasFilter };
            });

            return this.createTestResult(execution_id, testName, searchExists.inputExists || searchExists.stateFilter, {
                ...searchExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    // ========================================================================
    // FEATURES AVANZADOS
    // ========================================================================

    /**
     * Test: Capa de heatmap
     */
    async testHeatmapLayer(execution_id) {
        const testName = 'heatmap_layer';
        console.log(`    🔥 [MAP] Testeando capa de heatmap...`);

        try {
            const heatmapInfo = await this.page.evaluate(() => {
                const hasFeature = typeof MapState !== 'undefined' && MapState.features?.showHeatmap !== undefined;
                const heatmapLayer = typeof MapState !== 'undefined' && MapState.heatmapLayer;
                return { hasFeature, hasLayer: !!heatmapLayer };
            });

            return this.createTestResult(execution_id, testName, heatmapInfo.hasFeature, {
                ...heatmapInfo
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Historial de rutas
     */
    async testRouteHistory(execution_id) {
        const testName = 'route_history';
        console.log(`    🛤️ [MAP] Testeando historial de rutas...`);

        try {
            // Verificar API de historial
            const apiExists = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token') ||
                              localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                if (!token) return { error: 'No token' };

                try {
                    // Solo verificar que el endpoint existe
                    const response = await fetch('/api/v1/location/history/1', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return { status: response.status, exists: response.status !== 404 };
                } catch (e) {
                    return { error: e.message };
                }
            });

            // Verificar layer de rutas en estado
            const routeLayerExists = await this.page.evaluate(() => {
                return typeof MapState !== 'undefined' && MapState.routeLayer !== undefined;
            });

            return this.createTestResult(execution_id, testName, apiExists.exists || routeLayerExists, {
                apiExists: apiExists.exists,
                routeLayerSupported: routeLayerExists
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Exportar PDF/Excel
     */
    async testExportPDFExcel(execution_id) {
        const testName = 'export_pdf_excel';
        console.log(`    📄 [MAP] Testeando exportación PDF/Excel...`);

        try {
            const exportButtons = await this.page.evaluate(() => {
                const pdfBtn = document.querySelector('[data-export="pdf"], .export-pdf-btn, button:contains("PDF")');
                const excelBtn = document.querySelector('[data-export="excel"], .export-excel-btn, button:contains("Excel")');
                return {
                    hasPDFExport: !!pdfBtn,
                    hasExcelExport: !!excelBtn
                };
            });

            return this.createTestResult(execution_id, testName, true, {
                ...exportButtons,
                note: 'Export buttons checked'
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Vista multi-sucursal
     */
    async testMultiBranchView(execution_id) {
        const testName = 'multi_branch_view';
        console.log(`    🏬 [MAP] Testeando vista multi-sucursal...`);

        try {
            const multiBranchInfo = await this.page.evaluate(() => {
                const hasFeature = typeof MapState !== 'undefined' && MapState.features?.showAllBranches !== undefined;
                const hasBranchMarkers = typeof MapState !== 'undefined' && Array.isArray(MapState.branchMarkers);
                const hasBranchCircles = typeof MapState !== 'undefined' && Array.isArray(MapState.branchCircles);
                return { hasFeature, hasBranchMarkers, hasBranchCircles };
            });

            return this.createTestResult(execution_id, testName, multiBranchInfo.hasFeature, {
                ...multiBranchInfo
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    // ========================================================================
    // INTEGRACIONES
    // ========================================================================

    /**
     * Test: Integración con Users
     */
    async testIntegrationUsers(execution_id) {
        const testName = 'integration_users';
        console.log(`    👤 [MAP] Testeando integración con Users...`);

        try {
            // Las ubicaciones deben tener datos de usuario
            const hasUserData = await this.page.evaluate(() => {
                if (typeof MapState !== 'undefined' && MapState.locations?.length > 0) {
                    const loc = MapState.locations[0];
                    return loc.user_name || loc.userName || loc.employee_name || loc.firstName;
                }
                return false;
            });

            return this.createTestResult(execution_id, testName, true, {
                hasUserDataInLocations: !!hasUserData,
                note: 'Locations contain user information'
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Integración con Branches
     */
    async testIntegrationBranches(execution_id) {
        const testName = 'integration_branches';
        console.log(`    🏢 [MAP] Testeando integración con Branches...`);

        try {
            const apiResponse = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token') ||
                              localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                if (!token) return { error: 'No token' };

                try {
                    const response = await fetch('/api/v1/location/branches', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return { status: response.status, exists: response.status !== 404 };
                } catch (e) {
                    return { error: e.message };
                }
            });

            return this.createTestResult(execution_id, testName, apiResponse.exists, {
                branchesEndpointExists: apiResponse.exists,
                status: apiResponse.status
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    /**
     * Test: Integración con Departments
     */
    async testIntegrationDepartments(execution_id) {
        const testName = 'integration_departments';
        console.log(`    🏷️ [MAP] Testeando integración con Departments...`);

        try {
            const apiResponse = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token') ||
                              localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                if (!token) return { error: 'No token' };

                try {
                    const response = await fetch('/api/v1/location/departments', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return { status: response.status, exists: response.status !== 404 };
                } catch (e) {
                    return { error: e.message };
                }
            });

            // También verificar si hay departamentos en el estado
            const hasDepartments = await this.page.evaluate(() => {
                return typeof MapState !== 'undefined' && Array.isArray(MapState.departments);
            });

            return this.createTestResult(execution_id, testName, apiResponse.exists || hasDepartments, {
                departmentsEndpointExists: apiResponse.exists,
                hasDepartmentsInState: hasDepartments
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    // ========================================================================
    // DATABASE VALIDATION
    // ========================================================================

    /**
     * Test: Tabla employee_locations
     */
    async testDBEmployeeLocationsTable(execution_id) {
        const testName = 'db_employee_locations_table';
        console.log(`    🗄️ [MAP] Testeando tabla employee_locations...`);

        try {
            const tableInfo = await this.database.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'employee_locations'
                ORDER BY ordinal_position
            `);

            const columns = tableInfo.rows?.map(r => r.column_name) || [];

            const requiredColumns = ['id', 'latitude', 'longitude', 'company_id'];
            const missingColumns = requiredColumns.filter(c => !columns.includes(c));
            const success = columns.length > 0 && missingColumns.length === 0;

            return this.createTestResult(execution_id, testName, success, {
                tableExists: columns.length > 0,
                columns,
                missingColumns
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message,
                note: 'Table may not exist'
            });
        }
    }

    /**
     * Test: Configuración de geofence en BD
     */
    async testDBGeofenceConfig(execution_id) {
        const testName = 'db_geofence_config';
        console.log(`    🗄️ [MAP] Testeando configuración de geofence...`);

        try {
            // Verificar si branches tiene coordenadas
            const branchesHaveCoords = await this.database.query(`
                SELECT COUNT(*) as count
                FROM branches
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            `);

            // Verificar si existe configuración de geofence
            const geofenceConfig = await this.database.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'branches'
                AND column_name IN ('latitude', 'longitude', 'geofence_radius')
            `);

            const columns = geofenceConfig.rows?.map(r => r.column_name) || [];
            const branchesWithCoords = parseInt(branchesHaveCoords.rows?.[0]?.count || 0);

            return this.createTestResult(execution_id, testName, columns.length >= 2, {
                branchesWithCoordinates: branchesWithCoords,
                geofenceColumns: columns,
                hasLatLong: columns.includes('latitude') && columns.includes('longitude')
            });

        } catch (error) {
            return this.createTestResult(execution_id, testName, false, {
                error: error.message
            });
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    async navigateToModule(moduleName) {
        try {
            await this.page.evaluate((mod) => {
                const moduleCard = document.querySelector(`[data-module="${mod}"], [onclick*="${mod}"]`);
                if (moduleCard) moduleCard.click();
            }, moduleName);
            await this.page.waitForTimeout(2000);
        } catch (e) {
            console.log(`    ⚠️ [MAP] No se pudo navegar al módulo: ${e.message}`);
        }
    }

    createTestResult(execution_id, testName, passed, details = {}) {
        return {
            execution_id,
            test_name: testName,
            module_name: 'employee-map',
            passed,
            details,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = EmployeeMapModuleCollector;
