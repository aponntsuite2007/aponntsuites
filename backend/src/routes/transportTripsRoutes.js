/**
 * RUTAS DE GESTIÓN DE VIAJES
 * Planificación, seguimiento y control de viajes de transporte ganadero
 */

const express = require('express');
const router = express.Router();

// ========================================
// RUTAS DE VIAJES
// ========================================

// Listar todos los viajes
router.get('/', async (req, res) => {
    try {
        const { companyId, status, page = 1, limit = 10 } = req.query;

        // Simulación de datos de viajes
        const tripsData = [
            {
                id: 1,
                tripNumber: 'VJ-2024-001',
                status: 'en_progreso',
                driver: {
                    id: 101,
                    name: 'Carlos Mendez',
                    license: 'A123456',
                    phone: '+54-9-387-123456'
                },
                vehicle: {
                    id: 2,
                    plate: 'DEF456',
                    type: 'Doble Jaula'
                },
                route: {
                    origin: 'Salta, Salta',
                    destination: 'Santa Fe, Santa Fe',
                    distance: 850,
                    estimatedTime: '12 horas'
                },
                cargo: {
                    type: 'Ganado Bovino',
                    quantity: 25,
                    weight: '12,500 kg',
                    client: 'Estancia La Esperanza'
                },
                schedule: {
                    departureTime: '2024-09-23T06:00:00Z',
                    arrivalTime: '2024-09-23T18:00:00Z',
                    actualDeparture: '2024-09-23T06:15:00Z',
                    estimatedArrival: '2024-09-23T18:30:00Z'
                },
                financials: {
                    basePrice: 45000,
                    fuelCost: 12000,
                    totalCost: 57000,
                    clientPayment: 62000,
                    profit: 5000
                },
                gps: {
                    currentLat: -24.7859,
                    currentLng: -65.4117,
                    lastUpdate: new Date()
                }
            },
            {
                id: 2,
                tripNumber: 'VJ-2024-002',
                status: 'planificado',
                driver: {
                    id: 102,
                    name: 'Roberto Silva',
                    license: 'B789012',
                    phone: '+54-9-387-234567'
                },
                vehicle: {
                    id: 1,
                    plate: 'ABC123',
                    type: 'Camión Simple'
                },
                route: {
                    origin: 'Tucumán, Tucumán',
                    destination: 'Córdoba, Córdoba',
                    distance: 320,
                    estimatedTime: '5 horas'
                },
                cargo: {
                    type: 'Ganado Ovino',
                    quantity: 50,
                    weight: '2,500 kg',
                    client: 'Frigorífico San Miguel'
                },
                schedule: {
                    departureTime: '2024-09-24T08:00:00Z',
                    arrivalTime: '2024-09-24T13:00:00Z'
                },
                financials: {
                    basePrice: 25000,
                    fuelCost: 6500,
                    totalCost: 31500,
                    clientPayment: 35000,
                    profit: 3500
                }
            }
        ];

        // Filtrar por estado si se especifica
        let filteredTrips = tripsData;
        if (status) {
            filteredTrips = tripsData.filter(trip => trip.status === status);
        }

        // Simulación de paginación
        const total = filteredTrips.length;
        const startIndex = (page - 1) * limit;
        const paginatedTrips = filteredTrips.slice(startIndex, startIndex + limit);

        res.json({
            success: true,
            data: {
                trips: paginatedTrips,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                },
                summary: {
                    total: tripsData.length,
                    planificado: tripsData.filter(t => t.status === 'planificado').length,
                    en_progreso: tripsData.filter(t => t.status === 'en_progreso').length,
                    completado: tripsData.filter(t => t.status === 'completado').length,
                    cancelado: tripsData.filter(t => t.status === 'cancelado').length
                }
            },
            message: 'Viajes cargados exitosamente'
        });

    } catch (error) {
        console.error('❌ [TRIPS] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cargando viajes',
            error: error.message
        });
    }
});

// Obtener viaje específico
router.get('/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;

        // Simulación de datos detallados del viaje
        const tripData = {
            id: parseInt(tripId),
            tripNumber: 'VJ-2024-001',
            status: 'en_progreso',
            driver: {
                id: 101,
                name: 'Carlos Mendez',
                license: 'A123456',
                phone: '+54-9-387-123456',
                scoring: 8.5,
                experience: '5 años'
            },
            vehicle: {
                id: 2,
                plate: 'DEF456',
                type: 'Doble Jaula',
                brand: 'Volkswagen',
                model: 'Delivery 11.180'
            },
            route: {
                origin: {
                    address: 'Salta, Salta',
                    lat: -24.7859,
                    lng: -65.4117
                },
                destination: {
                    address: 'Santa Fe, Santa Fe',
                    lat: -31.6333,
                    lng: -60.7000
                },
                waypoints: [
                    { name: 'Santiago del Estero', lat: -27.7951, lng: -64.2615 },
                    { name: 'Resistencia', lat: -27.4511, lng: -58.9831 }
                ],
                distance: 850,
                estimatedTime: '12 horas'
            },
            cargo: {
                type: 'Ganado Bovino',
                quantity: 25,
                weight: '12,500 kg',
                client: {
                    name: 'Estancia La Esperanza',
                    contact: 'Juan Pérez',
                    phone: '+54-9-342-123456'
                },
                documentation: {
                    guiaTransito: 'GT-2024-5678',
                    senasa: 'SENASA-987654',
                    seguro: 'SEG-445566'
                }
            },
            schedule: {
                planned: {
                    departureTime: '2024-09-23T06:00:00Z',
                    arrivalTime: '2024-09-23T18:00:00Z'
                },
                actual: {
                    departureTime: '2024-09-23T06:15:00Z',
                    estimatedArrival: '2024-09-23T18:30:00Z'
                }
            },
            financials: {
                pricing: {
                    basePrice: 45000,
                    distanceRate: 52.94, // por km
                    additionalCharges: 0
                },
                costs: {
                    fuel: 12000,
                    tolls: 2500,
                    driver: 8000,
                    maintenance: 1500,
                    total: 24000
                },
                revenue: {
                    clientPayment: 62000,
                    netProfit: 38000,
                    profitMargin: 61.3
                }
            },
            tracking: {
                currentPosition: {
                    lat: -24.7859,
                    lng: -65.4117,
                    address: 'Ruta 9, Km 45',
                    speed: 85,
                    lastUpdate: new Date()
                },
                history: [
                    {
                        timestamp: '2024-09-23T06:15:00Z',
                        lat: -24.7859,
                        lng: -65.4117,
                        event: 'Salida de base'
                    }
                ]
            },
            alerts: [
                {
                    type: 'info',
                    message: 'Viaje dentro del horario programado',
                    timestamp: new Date()
                }
            ]
        };

        res.json({
            success: true,
            data: tripData,
            message: 'Información del viaje cargada'
        });

    } catch (error) {
        console.error('❌ [TRIPS] Error en viaje:', error);
        res.status(500).json({
            success: false,
            message: 'Error cargando información del viaje',
            error: error.message
        });
    }
});

// Crear nuevo viaje
router.post('/', async (req, res) => {
    try {
        const tripData = req.body;

        // Validación básica
        const requiredFields = ['driverId', 'vehicleId', 'origin', 'destination', 'cargoType'];
        const missingFields = requiredFields.filter(field => !tripData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
            });
        }

        // Simulación de creación
        const newTrip = {
            id: Date.now(),
            tripNumber: `VJ-2024-${String(Date.now()).slice(-3)}`,
            status: 'planificado',
            ...tripData,
            createdAt: new Date()
        };

        res.status(201).json({
            success: true,
            data: newTrip,
            message: 'Viaje creado exitosamente'
        });

    } catch (error) {
        console.error('❌ [TRIPS] Error creando viaje:', error);
        res.status(500).json({
            success: false,
            message: 'Error creando viaje',
            error: error.message
        });
    }
});

// Actualizar estado del viaje
router.patch('/:tripId/status', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { status, position, notes } = req.body;

        // Validar estados permitidos
        const validStatuses = ['planificado', 'en_progreso', 'en_pausa', 'completado', 'cancelado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }

        // Simulación de actualización
        const updatedTrip = {
            id: parseInt(tripId),
            status,
            position,
            notes,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: updatedTrip,
            message: 'Estado del viaje actualizado'
        });

    } catch (error) {
        console.error('❌ [TRIPS] Error actualizando estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando estado del viaje',
            error: error.message
        });
    }
});

// Actualizar posición GPS
router.post('/:tripId/position', async (req, res) => {
    try {
        const { tripId } = req.params;
        const { lat, lng, speed, timestamp } = req.body;

        // Validación de coordenadas
        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitud y longitud son requeridas'
            });
        }

        // Simulación de actualización de posición
        const positionUpdate = {
            tripId: parseInt(tripId),
            position: { lat, lng, speed },
            timestamp: timestamp || new Date(),
            address: 'Dirección estimada' // En producción se geocodificaría
        };

        res.json({
            success: true,
            data: positionUpdate,
            message: 'Posición actualizada'
        });

    } catch (error) {
        console.error('❌ [TRIPS] Error actualizando posición:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando posición',
            error: error.message
        });
    }
});

module.exports = router;