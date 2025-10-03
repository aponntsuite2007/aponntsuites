/**
 * RUTAS PRINCIPALES DE TRANSPORTE
 * Sistema Integral de Logística Ganadera
 * Integrado con sistema biométrico Aponnt
 */

const express = require('express');
const router = express.Router();

// Importar controladores (se crearán después)
// const transportController = require('../controllers/transportController');

// ========================================
// RUTAS PRINCIPALES DE TRANSPORTE
// ========================================

// Dashboard principal
router.get('/dashboard', async (req, res) => {
    try {
        // Simulación de datos para testing
        const dashboardData = {
            stats: {
                activeTrips: 12,
                availableFleet: { available: 8, total: 10 },
                activeDrivers: 15,
                monthlyRevenue: 485230
            },
            recentActivity: [
                { id: 1, type: 'trip', description: 'Viaje a Santa Fe completado', timestamp: new Date() },
                { id: 2, type: 'fleet', description: 'Mantenimiento programado vehículo #45', timestamp: new Date() }
            ]
        };

        res.json({
            success: true,
            data: dashboardData,
            message: 'Dashboard de transporte cargado exitosamente'
        });

    } catch (error) {
        console.error('❌ [TRANSPORT] Error en dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error cargando dashboard de transporte',
            error: error.message
        });
    }
});

// Información de la empresa de transporte
router.get('/company/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        // Simulación de datos de empresa
        const companyData = {
            id: parseInt(companyId),
            name: 'Empresa de Transporte',
            modules: [
                'transport-dashboard',
                'transport-trips',
                'transport-fleet',
                'transport-drivers'
            ],
            subscription: 'enterprise',
            stats: {
                totalVehicles: 10,
                totalDrivers: 15,
                monthlyTrips: 45
            }
        };

        res.json({
            success: true,
            data: companyData,
            message: 'Información de empresa cargada'
        });

    } catch (error) {
        console.error('❌ [TRANSPORT] Error en empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error cargando información de empresa',
            error: error.message
        });
    }
});

// Verificación de módulos asignados
router.get('/modules/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        // Query real a la base de datos para obtener módulos
        const { database } = require('../config/database');

        const moduleQuery = `
            SELECT
                sm.module_key,
                sm.name,
                sm.description,
                cm.precio_mensual,
                cm.activo
            FROM company_modules cm
            JOIN system_modules sm ON cm.system_module_id = sm.id
            WHERE cm.company_id = $1
            AND sm.module_key LIKE 'transport-%'
            AND cm.activo = true
            ORDER BY sm.display_order
        `;

        const modules = await database.query(moduleQuery, [companyId]);

        res.json({
            success: true,
            data: {
                companyId: parseInt(companyId),
                modules: modules.rows || [],
                totalModules: modules.rows?.length || 0
            },
            message: 'Módulos de transporte cargados'
        });

    } catch (error) {
        console.error('❌ [TRANSPORT] Error en módulos:', error);
        res.status(500).json({
            success: false,
            message: 'Error cargando módulos de transporte',
            error: error.message
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'transport-api',
        status: 'operational',
        timestamp: new Date(),
        version: '1.0.0'
    });
});

// ========================================
// MIDDLEWARE DE LOGGING
// ========================================
router.use((req, res, next) => {
    console.log(`🚛 [TRANSPORT] ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

module.exports = router;