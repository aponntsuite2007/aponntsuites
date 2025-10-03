/**
 * RUTAS DE GESTIÓN DE FLOTA
 * Control de vehículos especializados en transporte ganadero
 */

const express = require('express');
const router = express.Router();

// ========================================
// RUTAS DE FLOTA
// ========================================

// Listar todos los vehículos
router.get('/', async (req, res) => {
    try {
        const { companyId } = req.query;

        // Simulación de datos de flota
        const fleetData = [
            {
                id: 1,
                plate: 'ABC123',
                type: 'Camión Simple',
                brand: 'Mercedes-Benz',
                model: 'Accelo 815',
                year: 2020,
                capacity: '3 toneladas',
                status: 'disponible',
                driver: null,
                location: 'Base Central',
                lastMaintenance: '2024-08-15',
                nextMaintenance: '2024-11-15'
            },
            {
                id: 2,
                plate: 'DEF456',
                type: 'Doble Jaula',
                brand: 'Volkswagen',
                model: 'Delivery 11.180',
                year: 2021,
                capacity: '5 toneladas',
                status: 'en_viaje',
                driver: 'Carlos Mendez',
                location: 'Ruta 9 - Km 45',
                lastMaintenance: '2024-09-01',
                nextMaintenance: '2024-12-01'
            }
        ];

        res.json({
            success: true,
            data: {
                vehicles: fleetData,
                summary: {
                    total: fleetData.length,
                    available: fleetData.filter(v => v.status === 'disponible').length,
                    inTrip: fleetData.filter(v => v.status === 'en_viaje').length,
                    maintenance: fleetData.filter(v => v.status === 'mantenimiento').length
                }
            },
            message: 'Flota cargada exitosamente'
        });

    } catch (error) {
        console.error('❌ [FLEET] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cargando flota',
            error: error.message
        });
    }
});

// Obtener vehículo específico
router.get('/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;

        // Simulación de datos detallados del vehículo
        const vehicleData = {
            id: parseInt(vehicleId),
            plate: 'ABC123',
            type: 'Camión Simple',
            brand: 'Mercedes-Benz',
            model: 'Accelo 815',
            year: 2020,
            capacity: '3 toneladas',
            status: 'disponible',
            documents: {
                license: { expires: '2025-06-15', status: 'vigente' },
                insurance: { expires: '2025-03-20', status: 'vigente' },
                inspection: { expires: '2025-01-10', status: 'vigente' }
            },
            maintenance: {
                lastService: '2024-08-15',
                nextService: '2024-11-15',
                kmCurrent: 85420,
                kmNextService: 90000
            },
            specifications: {
                engine: 'OM924LA 4 cilindros',
                fuel: 'Diesel',
                transmission: 'Manual 6 velocidades',
                specialFeatures: ['Aire acondicionado', 'GPS', 'Cámara reversa']
            }
        };

        res.json({
            success: true,
            data: vehicleData,
            message: 'Información del vehículo cargada'
        });

    } catch (error) {
        console.error('❌ [FLEET] Error en vehículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error cargando información del vehículo',
            error: error.message
        });
    }
});

// Crear nuevo vehículo
router.post('/', async (req, res) => {
    try {
        const vehicleData = req.body;

        // Validación básica
        if (!vehicleData.plate || !vehicleData.type) {
            return res.status(400).json({
                success: false,
                message: 'Patente y tipo de vehículo son requeridos'
            });
        }

        // Simulación de creación
        const newVehicle = {
            id: Date.now(), // ID temporal
            ...vehicleData,
            status: 'disponible',
            createdAt: new Date()
        };

        res.status(201).json({
            success: true,
            data: newVehicle,
            message: 'Vehículo registrado exitosamente'
        });

    } catch (error) {
        console.error('❌ [FLEET] Error creando vehículo:', error);
        res.status(500).json({
            success: false,
            message: 'Error registrando vehículo',
            error: error.message
        });
    }
});

// Actualizar estado del vehículo
router.patch('/:vehicleId/status', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { status, location, driver } = req.body;

        // Validar estados permitidos
        const validStatuses = ['disponible', 'en_viaje', 'mantenimiento', 'fuera_servicio'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Estado no válido'
            });
        }

        // Simulación de actualización
        const updatedVehicle = {
            id: parseInt(vehicleId),
            status,
            location,
            driver,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: updatedVehicle,
            message: 'Estado del vehículo actualizado'
        });

    } catch (error) {
        console.error('❌ [FLEET] Error actualizando estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando estado del vehículo',
            error: error.message
        });
    }
});

// Programar mantenimiento
router.post('/:vehicleId/maintenance', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { type, scheduledDate, description } = req.body;

        // Simulación de programación de mantenimiento
        const maintenanceRecord = {
            id: Date.now(),
            vehicleId: parseInt(vehicleId),
            type,
            scheduledDate,
            description,
            status: 'programado',
            createdAt: new Date()
        };

        res.status(201).json({
            success: true,
            data: maintenanceRecord,
            message: 'Mantenimiento programado exitosamente'
        });

    } catch (error) {
        console.error('❌ [FLEET] Error programando mantenimiento:', error);
        res.status(500).json({
            success: false,
            message: 'Error programando mantenimiento',
            error: error.message
        });
    }
});

module.exports = router;