/**
 * 🧪 TESTING REALTIME ROUTES
 * ==========================
 * Endpoints para probar el sistema de tiempo real sin necesidad de la app Android
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { sequelize } = require('../config/database');

// Variable global para almacenar referencia al AdminPanelWebSocketServer
let adminPanelWsServer = null;

/**
 * Configurar referencia al AdminPanelWebSocketServer
 */
function setAdminPanelWsServer(server) {
    adminPanelWsServer = server;
    console.log('✅ [TESTING] AdminPanelWebSocketServer conectado');
}

/**
 * POST /api/test/simulate-attendance
 * Simular un fichaje para probar notificaciones en tiempo real
 */
router.post('/simulate-attendance', auth, async (req, res) => {
    try {
        const {
            employee_id,
            company_id,
            action = 'entrada',
            kiosk_id = 'TEST-KIOSK-1'
        } = req.body;

        console.log('🧪 [TESTING] Simulando fichaje:', { employee_id, company_id, action });

        // Validar datos
        if (!employee_id || !company_id) {
            return res.status(400).json({
                success: false,
                error: 'employee_id y company_id son requeridos'
            });
        }

        // Obtener datos del empleado
        const [employees] = await sequelize.query(`
            SELECT
                u.user_id as id,
                u."firstName" as "firstName",
                u."lastName" as "lastName",
                u."employeeId" as legajo,
                u.email
            FROM users u
            WHERE u.user_id = :employee_id
                AND u.is_active = true
                AND u.company_id = :company_id
        `, {
            replacements: { employee_id, company_id }
        });

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Empleado no encontrado'
            });
        }

        const employee = employees[0];

        // Registrar asistencia simulada en BD (opcional)
        const timestamp = new Date();
        try {
            await sequelize.query(`
                INSERT INTO attendances
                (id, user_id, company_id, action, timestamp, method, location, notes, created_at)
                VALUES (gen_random_uuid(), :user_id, :company_id, :action, :timestamp, 'biometric_test', 'Testing', 'Fichaje de prueba', NOW())
            `, {
                replacements: {
                    user_id: employee_id,
                    company_id,
                    action,
                    timestamp
                }
            });
        } catch (dbError) {
            console.warn('⚠️ [TESTING] No se pudo guardar en BD (tabla attendances puede no existir):', dbError.message);
        }

        // Preparar datos del evento
        const attendanceData = {
            employee_id,
            employee_name: `${employee.firstName} ${employee.lastName}`,
            employee_legajo: employee.legajo,
            action,
            timestamp: timestamp.toISOString(),
            kiosk_id,
            method: 'biometric_test',
            confidence: 0.95
        };

        // Notificar al panel administrativo via WebSocket
        if (adminPanelWsServer) {
            adminPanelWsServer.notifyNewAttendance(company_id, attendanceData);
            console.log('✅ [TESTING] Notificación enviada via WebSocket');
        } else {
            console.warn('⚠️ [TESTING] AdminPanelWebSocketServer no disponible');
        }

        res.json({
            success: true,
            message: 'Fichaje simulado exitosamente',
            data: attendanceData,
            websocket_notified: !!adminPanelWsServer
        });

    } catch (error) {
        console.error('❌ [TESTING] Error simulando fichaje:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * POST /api/test/simulate-detection
 * Simular una detección facial para probar notificaciones
 */
router.post('/simulate-detection', auth, async (req, res) => {
    try {
        const {
            employee_id,
            company_id,
            confidence = 0.95,
            kiosk_id = 'TEST-KIOSK-1'
        } = req.body;

        console.log('🧪 [TESTING] Simulando detección facial:', { employee_id, company_id });

        if (!employee_id || !company_id) {
            return res.status(400).json({
                success: false,
                error: 'employee_id y company_id son requeridos'
            });
        }

        // Obtener datos del empleado
        const [employees] = await sequelize.query(`
            SELECT
                u.user_id as id,
                u."firstName" as "firstName",
                u."lastName" as "lastName",
                u."employeeId" as legajo
            FROM users u
            WHERE u.user_id = :employee_id
                AND u.is_active = true
                AND u.company_id = :company_id
        `, {
            replacements: { employee_id, company_id }
        });

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Empleado no encontrado'
            });
        }

        const employee = employees[0];

        // Preparar datos del evento de detección
        const detectionData = {
            employee_id,
            employee_name: `${employee.firstName} ${employee.lastName}`,
            employee_legajo: employee.legajo,
            kiosk_id,
            confidence,
            quality_score: 0.92,
            processing_time: Math.floor(Math.random() * 300) + 100, // 100-400ms
            timestamp: Date.now()
        };

        // Notificar al panel administrativo
        if (adminPanelWsServer) {
            adminPanelWsServer.notifyEmployeeDetected(company_id, detectionData);
            console.log('✅ [TESTING] Detección notificada via WebSocket');
        } else {
            console.warn('⚠️ [TESTING] AdminPanelWebSocketServer no disponible');
        }

        res.json({
            success: true,
            message: 'Detección simulada exitosamente',
            data: detectionData,
            websocket_notified: !!adminPanelWsServer
        });

    } catch (error) {
        console.error('❌ [TESTING] Error simulando detección:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * POST /api/test/simulate-kiosk-status
 * Simular cambio de estado de kiosk
 */
router.post('/simulate-kiosk-status', auth, async (req, res) => {
    try {
        const {
            company_id,
            kiosk_id = 'TEST-KIOSK-1',
            status = 'online' // 'online' o 'offline'
        } = req.body;

        console.log('🧪 [TESTING] Simulando cambio estado kiosk:', { kiosk_id, status });

        if (!company_id) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        if (!['online', 'offline'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'status debe ser "online" o "offline"'
            });
        }

        // Notificar al panel administrativo
        if (adminPanelWsServer) {
            adminPanelWsServer.notifyKioskStatusChange(company_id, kiosk_id, status);
            console.log('✅ [TESTING] Cambio de estado notificado via WebSocket');
        } else {
            console.warn('⚠️ [TESTING] AdminPanelWebSocketServer no disponible');
        }

        res.json({
            success: true,
            message: 'Cambio de estado simulado exitosamente',
            data: {
                kiosk_id,
                status,
                timestamp: Date.now()
            },
            websocket_notified: !!adminPanelWsServer
        });

    } catch (error) {
        console.error('❌ [TESTING] Error simulando cambio de estado:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/test/employees
 * Obtener lista de empleados para usar en pruebas
 */
router.get('/employees', auth, async (req, res) => {
    try {
        const company_id = req.user.companyId || req.query.company_id;

        if (!company_id) {
            return res.status(400).json({
                success: false,
                error: 'company_id es requerido'
            });
        }

        const [employees] = await sequelize.query(`
            SELECT
                u.user_id,
                u."firstName",
                u."lastName",
                u."employeeId",
                u.email,
                u.role
            FROM users u
            WHERE u.company_id = :company_id
                AND u.is_active = true
            ORDER BY u."firstName", u."lastName"
            LIMIT 20
        `, {
            replacements: { company_id }
        });

        res.json({
            success: true,
            employees,
            count: employees.length
        });

    } catch (error) {
        console.error('❌ [TESTING] Error obteniendo empleados:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/test/status
 * Verificar estado del sistema de tiempo real
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        testing_endpoints_available: true,
        websocket_server_connected: !!adminPanelWsServer,
        timestamp: new Date().toISOString(),
        endpoints: [
            'POST /api/test/simulate-attendance',
            'POST /api/test/simulate-detection',
            'POST /api/test/simulate-kiosk-status',
            'GET /api/test/employees',
            'GET /api/test/status'
        ]
    });
});

module.exports = {
    router,
    setAdminPanelWsServer
};
