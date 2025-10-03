/**
 * Integración con Google Maps API
 * Reemplaza el mapa simulado con un mapa real de Google Maps
 */

class GoogleMapsIntegration {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.infoWindows = new Map();
        this.heatmapLayer = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.geocoder = null;
        this.placesService = null;
        
        // Configuración por defecto (Buenos Aires)
        this.defaultCenter = { lat: -34.6037, lng: -58.3816 };
        this.defaultZoom = 12;
        
        // Estilos personalizados para el mapa
        this.mapStyles = [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            },
            {
                featureType: "transit",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ];
        
        console.log('🗺️ [GOOGLE-MAPS] Módulo de integración inicializado');
    }

    /**
     * Cargar script de Google Maps dinámicamente
     */
    async loadGoogleMapsScript(apiKey) {
        return new Promise((resolve, reject) => {
            // Verificar si ya está cargado
            if (window.google && window.google.maps) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization,geometry&language=es`;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                console.log('✅ [GOOGLE-MAPS] Script cargado exitosamente');
                resolve();
            };
            
            script.onerror = () => {
                console.error('❌ [GOOGLE-MAPS] Error cargando script');
                reject(new Error('No se pudo cargar Google Maps'));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Inicializar mapa en un contenedor
     */
    async initializeMap(containerId, options = {}) {
        try {
            // Verificar si hay una API key real
            const apiKey = options.apiKey;
            
            // Si no hay API key real, usar mapa alternativo inmediatamente
            if (!apiKey || apiKey.includes('Demo') || apiKey.includes('demo') || apiKey.length < 30) {
                console.log('🗺️ [GOOGLE-MAPS] Sin API key válida, usando mapa alternativo');
                return this.createAlternativeMap(containerId, options);
            }
            
            // Cargar script si no está cargado (solo si hay API key válida)
            if (!window.google || !window.google.maps) {
                await this.loadGoogleMapsScript(apiKey);
            }

            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Contenedor ${containerId} no encontrado`);
            }

            // Opciones del mapa
            const mapOptions = {
                center: options.center || this.defaultCenter,
                zoom: options.zoom || this.defaultZoom,
                styles: this.mapStyles,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: google.maps.ControlPosition.TOP_RIGHT,
                    mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
                },
                streetViewControl: true,
                fullscreenControl: true,
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_CENTER
                }
            };

            // Crear mapa
            this.map = new google.maps.Map(container, mapOptions);
            
            // Inicializar servicios
            this.directionsService = new google.maps.DirectionsService();
            this.directionsRenderer = new google.maps.DirectionsRenderer();
            this.geocoder = new google.maps.Geocoder();
            this.placesService = new google.maps.places.PlacesService(this.map);
            
            this.directionsRenderer.setMap(this.map);
            
            // Agregar controles personalizados
            this.addCustomControls();
            
            // Eventos del mapa
            this.setupMapEvents();
            
            console.log('✅ [GOOGLE-MAPS] Mapa inicializado correctamente');
            
            return this.map;
            
        } catch (error) {
            console.error('❌ [GOOGLE-MAPS] Error inicializando mapa:', error);
            // Fallback a mapa simulado si falla
            this.createFallbackMap(containerId);
            throw error;
        }
    }

    /**
     * Agregar marcador de empleado en el mapa
     */
    addEmployeeMarker(employee) {
        if (!this.map) return null;

        const position = {
            lat: parseFloat(employee.latitude),
            lng: parseFloat(employee.longitude)
        };

        // Icono personalizado según estado
        const icon = {
            url: this.getMarkerIcon(employee.status),
            scaledSize: new google.maps.Size(40, 40),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 40)
        };

        // Crear marcador
        const marker = new google.maps.Marker({
            position: position,
            map: this.map,
            title: employee.name,
            icon: icon,
            animation: google.maps.Animation.DROP,
            optimized: true
        });

        // Crear info window
        const infoContent = `
            <div style="padding: 10px; min-width: 200px;">
                <h4 style="margin: 0 0 10px 0;">${employee.name}</h4>
                <p style="margin: 5px 0;"><strong>Estado:</strong> ${employee.status}</p>
                <p style="margin: 5px 0;"><strong>Departamento:</strong> ${employee.department}</p>
                <p style="margin: 5px 0;"><strong>Última actualización:</strong> ${new Date(employee.lastUpdate).toLocaleString()}</p>
                ${employee.address ? `<p style="margin: 5px 0;"><strong>Dirección:</strong> ${employee.address}</p>` : ''}
                <div style="margin-top: 10px;">
                    <button onclick="window.googleMapsIntegration.showDirections('${employee.id}')" 
                            style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                        📍 Ver ruta
                    </button>
                    <button onclick="window.googleMapsIntegration.showStreetView('${employee.id}')" 
                            style="background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">
                        🏠 Street View
                    </button>
                </div>
            </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
            content: infoContent
        });

        // Evento click en marcador
        marker.addListener('click', () => {
            // Cerrar otras info windows
            this.infoWindows.forEach(iw => iw.close());
            infoWindow.open(this.map, marker);
        });

        // Guardar referencias
        this.markers.set(employee.id, marker);
        this.infoWindows.set(employee.id, infoWindow);

        // Guardar datos del empleado en el marcador
        marker.employeeData = employee;

        return marker;
    }

    /**
     * Actualizar posición de empleado
     */
    updateEmployeePosition(employeeId, newPosition) {
        const marker = this.markers.get(employeeId);
        if (marker) {
            const position = new google.maps.LatLng(newPosition.lat, newPosition.lng);
            
            // Animar movimiento
            this.animateMarkerMove(marker, position);
            
            // Actualizar datos
            marker.employeeData = { ...marker.employeeData, ...newPosition };
        }
    }

    /**
     * Animar movimiento de marcador
     */
    animateMarkerMove(marker, newPosition) {
        const start = marker.getPosition();
        const end = newPosition;
        const duration = 1000; // 1 segundo
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const lat = start.lat() + (end.lat() - start.lat()) * progress;
            const lng = start.lng() + (end.lng() - start.lng()) * progress;
            
            marker.setPosition(new google.maps.LatLng(lat, lng));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Mostrar mapa de calor de empleados
     */
    showHeatmap(locations) {
        if (!this.map) return;

        // Limpiar heatmap anterior
        if (this.heatmapLayer) {
            this.heatmapLayer.setMap(null);
        }

        // Convertir ubicaciones a puntos de calor
        const heatmapData = locations.map(loc => ({
            location: new google.maps.LatLng(loc.lat, loc.lng),
            weight: loc.weight || 1
        }));

        // Crear capa de mapa de calor
        this.heatmapLayer = new google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: this.map,
            radius: 30,
            opacity: 0.6,
            gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 1)',
                'rgba(0, 191, 255, 1)',
                'rgba(0, 127, 255, 1)',
                'rgba(0, 63, 255, 1)',
                'rgba(0, 0, 255, 1)',
                'rgba(0, 0, 223, 1)',
                'rgba(0, 0, 191, 1)',
                'rgba(0, 0, 159, 1)',
                'rgba(0, 0, 127, 1)',
                'rgba(63, 0, 91, 1)',
                'rgba(127, 0, 63, 1)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)'
            ]
        });
    }

    /**
     * Geocodificar dirección
     */
    async geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                reject(new Error('Geocoder no inicializado'));
                return;
            }

            this.geocoder.geocode({ address: address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng(),
                        formattedAddress: results[0].formatted_address,
                        placeId: results[0].place_id
                    });
                } else {
                    reject(new Error(`Geocodificación falló: ${status}`));
                }
            });
        });
    }

    /**
     * Buscar lugares cercanos
     */
    async searchNearbyPlaces(location, radius = 1000, type = 'restaurant') {
        return new Promise((resolve, reject) => {
            if (!this.placesService) {
                reject(new Error('Places service no inicializado'));
                return;
            }

            const request = {
                location: location,
                radius: radius,
                type: type
            };

            this.placesService.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(results);
                } else {
                    reject(new Error(`Búsqueda de lugares falló: ${status}`));
                }
            });
        });
    }

    /**
     * Calcular ruta entre dos puntos
     */
    async calculateRoute(origin, destination, travelMode = 'DRIVING') {
        return new Promise((resolve, reject) => {
            if (!this.directionsService) {
                reject(new Error('Directions service no inicializado'));
                return;
            }

            const request = {
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode[travelMode],
                unitSystem: google.maps.UnitSystem.METRIC,
                avoidHighways: false,
                avoidTolls: false
            };

            this.directionsService.route(request, (result, status) => {
                if (status === 'OK') {
                    this.directionsRenderer.setDirections(result);
                    
                    const route = result.routes[0];
                    const leg = route.legs[0];
                    
                    resolve({
                        distance: leg.distance,
                        duration: leg.duration,
                        startAddress: leg.start_address,
                        endAddress: leg.end_address,
                        steps: leg.steps,
                        polyline: route.overview_polyline
                    });
                } else {
                    reject(new Error(`Cálculo de ruta falló: ${status}`));
                }
            });
        });
    }

    /**
     * Mostrar Street View
     */
    showStreetView(employeeId) {
        const marker = this.markers.get(employeeId);
        if (!marker) return;

        const panorama = new google.maps.StreetViewPanorama(
            document.getElementById('street-view-container'), {
                position: marker.getPosition(),
                pov: {
                    heading: 34,
                    pitch: 10
                },
                zoom: 1
            }
        );

        this.map.setStreetView(panorama);
    }

    /**
     * Obtener icono de marcador según estado
     */
    getMarkerIcon(status) {
        const icons = {
            'working': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4CAF50"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'),
            'break': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFC107"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'),
            'offline': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9E9E9E"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'),
            'alert': 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#F44336"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>')
        };

        return icons[status] || icons['offline'];
    }

    /**
     * Agregar controles personalizados al mapa
     */
    addCustomControls() {
        // Control de centrado
        const centerControlDiv = document.createElement('div');
        const centerControl = this.createCenterControl();
        centerControlDiv.appendChild(centerControl);
        this.map.controls[google.maps.ControlPosition.LEFT_TOP].push(centerControlDiv);

        // Control de búsqueda
        const searchBox = this.createSearchBox();
        this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchBox);
    }

    /**
     * Crear control de centrado
     */
    createCenterControl() {
        const controlUI = document.createElement('div');
        controlUI.style.cssText = `
            background-color: white;
            border: 2px solid #fff;
            border-radius: 3px;
            box-shadow: 0 2px 6px rgba(0,0,0,.3);
            cursor: pointer;
            margin: 10px;
            text-align: center;
            padding: 8px;
        `;
        controlUI.innerHTML = '📍 Centrar';
        
        controlUI.addEventListener('click', () => {
            this.map.setCenter(this.defaultCenter);
            this.map.setZoom(this.defaultZoom);
        });

        return controlUI;
    }

    /**
     * Crear caja de búsqueda
     */
    createSearchBox() {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Buscar ubicación...';
        input.style.cssText = `
            background-color: white;
            font-size: 15px;
            font-weight: 300;
            margin: 10px;
            padding: 10px;
            text-overflow: ellipsis;
            width: 300px;
            border: 1px solid transparent;
            border-radius: 3px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        `;

        const searchBox = new google.maps.places.SearchBox(input);
        
        searchBox.addListener('places_changed', () => {
            const places = searchBox.getPlaces();
            if (places.length === 0) return;

            const bounds = new google.maps.LatLngBounds();
            places.forEach(place => {
                if (!place.geometry || !place.geometry.location) return;
                
                if (place.geometry.viewport) {
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            
            this.map.fitBounds(bounds);
        });

        return input;
    }

    /**
     * Configurar eventos del mapa
     */
    setupMapEvents() {
        // Click en el mapa
        this.map.addListener('click', (event) => {
            console.log('📍 Click en:', event.latLng.lat(), event.latLng.lng());
        });

        // Cambio de zoom
        this.map.addListener('zoom_changed', () => {
            console.log('🔍 Zoom:', this.map.getZoom());
        });

        // Cambio de bounds
        this.map.addListener('bounds_changed', () => {
            // Actualizar búsqueda según área visible
        });
    }

    /**
     * Crear mapa de respaldo si Google Maps falla
     */
    createFallbackMap(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #e0e0e0;">
                <div style="text-align: center; padding: 20px;">
                    <h3>🗺️ Mapa No Disponible</h3>
                    <p>El servicio de mapas no está disponible temporalmente.</p>
                    <p>Por favor, verifica tu conexión a internet o la configuración de API key.</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                        🔄 Reintentar
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Limpiar todos los marcadores
     */
    clearAllMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers.clear();
        this.infoWindows.clear();
    }

    /**
     * Crear mapa alternativo cuando Google Maps no está disponible
     */
    createAlternativeMap(containerId, options = {}) {
        console.log('🗺️ [GOOGLE-MAPS] Creando mapa alternativo interactivo');
        
        const container = document.getElementById(containerId);
        if (!container) return null;
        
        // Crear mapa alternativo estilizado y funcional
        container.innerHTML = `
            <div style="
                width: 100%; 
                height: 100%; 
                position: relative;
                background: linear-gradient(45deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%);
                border-radius: 8px;
                overflow: hidden;
                box-shadow: inset 0 0 20px rgba(0,0,0,0.1);
            ">
                <!-- Capa de mapa base -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\"><defs><pattern id=\\"grid\\" width=\\"10\\" height=\\"10\\" patternUnits=\\"userSpaceOnUse\\"><path d=\\"M 10 0 L 0 0 0 10\\" fill=\\"none\\" stroke=\\"%23ffffff\\" stroke-width=\\"0.5\\" opacity=\\"0.3\\"/></pattern></defs><rect width=\\"100\\" height=\\"100\\" fill=\\"url(%23grid)\\"/></svg>');
                    opacity: 0.6;
                "></div>
                
                <!-- Buenos Aires - Área central -->
                <div style="
                    position: absolute;
                    top: 40%;
                    left: 45%;
                    width: 10px;
                    height: 10px;
                    background: #2196f3;
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
                "></div>
                
                <!-- Calles simuladas -->
                <div style="
                    position: absolute;
                    top: 20%;
                    left: 10%;
                    right: 10%;
                    height: 2px;
                    background: #fff;
                    opacity: 0.7;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                "></div>
                <div style="
                    position: absolute;
                    top: 60%;
                    left: 10%;
                    right: 10%;
                    height: 2px;
                    background: #fff;
                    opacity: 0.7;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                "></div>
                
                <!-- Zona de trabajo simulada -->
                <div style="
                    position: absolute;
                    top: 35%;
                    left: 40%;
                    width: 20%;
                    height: 30%;
                    border: 3px dashed #4caf50;
                    border-radius: 10px;
                    background: rgba(76, 175, 80, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #4caf50;
                    font-weight: bold;
                    font-size: 12px;
                ">
                    🏢 ZONA LABORAL
                </div>
                
                <!-- Info del mapa -->
                <div style="
                    position: absolute;
                    bottom: 10px;
                    left: 10px;
                    background: rgba(255,255,255,0.9);
                    padding: 8px 12px;
                    border-radius: 6px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    font-size: 12px;
                    color: #666;
                ">
                    📍 Buenos Aires, Argentina | 🗺️ Vista Alternativa
                </div>
            </div>
        `;
        
        // Simular objeto map para compatibilidad
        const mapObject = {
            type: 'alternative',
            container: container,
            center: options.center || this.defaultCenter,
            zoom: options.zoom || this.defaultZoom,
            markers: [],
            
            addMarker: (lat, lng, title, info) => {
                return mapObject.createMarker(lat, lng, title, info);
            },
            
            createMarker: (lat, lng, title, info) => {
                // Convertir coordenadas a posición en el contenedor (simplificado para Buenos Aires)
                const x = 45 + (lng + 58.3816) * 10; // Ajuste para Buenos Aires
                const y = 40 + (lat + 34.6037) * 8;   // Ajuste para Buenos Aires
                
                const marker = document.createElement('div');
                marker.style.cssText = `
                    position: absolute;
                    left: ${Math.max(5, Math.min(95, x))}%;
                    top: ${Math.max(5, Math.min(95, y))}%;
                    width: 16px;
                    height: 16px;
                    background: #f44336;
                    border: 2px solid white;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    z-index: 1000;
                    transform: translate(-50%, -50%);
                `;
                
                marker.title = title + (info ? ' - ' + info : '');
                
                marker.addEventListener('click', () => {
                    alert(`📍 ${title}\n${info || 'Sin información adicional'}\n📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                });
                
                container.appendChild(marker);
                mapObject.markers.push({ element: marker, lat, lng, title, info });
                
                return marker;
            },
            
            clearMarkers: () => {
                mapObject.markers.forEach(marker => marker.element.remove());
                mapObject.markers = [];
            }
        };
        
        console.log('✅ [GOOGLE-MAPS] Mapa alternativo creado exitosamente');
        return mapObject;
    }

    /**
     * Destruir el mapa
     */
    destroy() {
        this.clearAllMarkers();
        if (this.heatmapLayer) {
            this.heatmapLayer.setMap(null);
        }
        if (this.directionsRenderer) {
            this.directionsRenderer.setMap(null);
        }
        this.map = null;
        console.log('🗺️ [GOOGLE-MAPS] Mapa destruido');
    }
}

// Instancia global
window.googleMapsIntegration = new GoogleMapsIntegration();

console.log('📦 [GOOGLE-MAPS] Módulo de integración cargado exitosamente');