const express = require('express');
const router = express.Router();
const { sequelize, User, Department } = require('../config/database');
const jwt = require('jsonwebtoken');
// const pdfGenerator = require('../utils/pdfGenerator'); // DESHABILITADO - Sin Puppeteer
const fs = require('fs').promises;
const path = require('path');
const { checkPermission } = require('../middleware/permissions');

// Importar servicio de notificaciones enterprise
const NotificationWorkflowService = require('../services/NotificationWorkflowService');

// Importar sistema modular Plug & Play
const { useModuleIfAvailable } = require('../utils/moduleHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_aqui';

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
}

// GET /api/v1/legal/communication-types - Obtener tipos de comunicaciones legales
router.get('/communication-types', authenticateToken, checkPermission('legal-communications', 'view'), async (req, res) => {
    try {
        const [types] = await sequelize.query(`
            SELECT * FROM legal_communication_types 
            ORDER BY category, severity DESC, name
        `);
        
        res.json({
            success: true,
            data: types
        });
        
    } catch (error) {
        console.error('Error obteniendo tipos de comunicación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/v1/legal/communications - Obtener comunicaciones legales
router.get('/communications', authenticateToken, checkPermission('legal-communications', 'view'), async (req, res) => {
    try {
        const { employee_id, type_id, status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = '1=1';
        let replacements = [];
        
        if (employee_id) {
            whereClause += ' AND lc.employee_id = ?';
            replacements.push(employee_id);
        }
        
        if (type_id) {
            whereClause += ' AND lc.type_id = ?';
            replacements.push(type_id);
        }
        
        if (status) {
            whereClause += ' AND lc.status = ?';
            replacements.push(status);
        }
        
        const [communications] = await sequelize.query(`
            SELECT 
                lc.*,
                lct.name as type_name,
                lct.category,
                lct.severity,
                lct.legal_basis,
                u.firstName as employee_first_name,
                u.lastName as employee_last_name,
                u.employeeId as employee_code,
                creator.firstName as created_by_name
            FROM legal_communications lc
            JOIN legal_communication_types lct ON lc.type_id = lct.id
            JOIN users u ON lc.employee_id = u.id
            JOIN users creator ON lc.created_by = creator.id
            WHERE ${whereClause}
            ORDER BY lc.created_at DESC
            LIMIT ? OFFSET ?
        `, { replacements: [...replacements, parseInt(limit), offset] });
        
        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total
            FROM legal_communications lc
            WHERE ${whereClause}
        `, { replacements });
        
        res.json({
            success: true,
            data: communications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo comunicaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// POST /api/v1/legal/communications - Crear nueva comunicación legal
router.post('/communications', authenticateToken, checkPermission('legal-communications', 'create'), async (req, res) => {
    try {
        const {
            employee_id,
            type_id,
            subject,
            description,
            facts_description,
            scheduled_date,
            generate_pdf = true
        } = req.body;

        if (!employee_id || !type_id || !subject) {
            return res.status(400).json({
                success: false,
                error: 'Faltan campos requeridos: employee_id, type_id, subject'
            });
        }

        // Verificar que el empleado existe
        const [employee] = await sequelize.query(`
            SELECT id, firstName, lastName, employeeId, email 
            FROM users WHERE user_id = ? AND isActive = 1
        `, { replacements: [employee_id] });

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Empleado no encontrado'
            });
        }

        // Verificar que el tipo de comunicación existe
        const [communicationType] = await sequelize.query(`
            SELECT * FROM legal_communication_types WHERE id = ?
        `, { replacements: [type_id] });

        if (communicationType.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Tipo de comunicación no encontrado'
            });
        }

        const referenceNumber = `DOC-${type_id.toUpperCase()}-${Date.now()}`;
        
        // Crear la comunicación legal
        const [result] = await sequelize.query(`
            INSERT INTO legal_communications 
            (id, employee_id, type_id, reference_number, subject, description, facts_description, 
             scheduled_date, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NOW())
        `, { 
            replacements: [
                `legal-${Date.now()}`,
                employee_id,
                type_id,
                referenceNumber,
                subject,
                description,
                facts_description,
                scheduled_date || null,
                req.user.user_id
            ]
        });

        const communicationId = `legal-${Date.now()}`;

        // Generar PDF si se solicita
        let pdfPath = null;
        if (generate_pdf) {
            console.log('⚠️ Generación de PDF deshabilitada (sin Puppeteer). Se continuará sin PDF.');
            // PDF generation disabled to avoid Puppeteer dependency
            // TODO: Implementar generación de PDF con alternativas como html-pdf-node o pdfkit
        }

        // Registrar en auditoría
        await sequelize.query(`
            INSERT INTO audit_logs (userId, action, moduleId, entityType, entityId, details, success, createdAt)
            VALUES (?, 'create_legal_communication', 'legal-communications', 'legal_communication', ?, ?, 1, NOW())
        `, {
            replacements: [
                req.user.user_id,
                communicationId,
                JSON.stringify({ type_id, employee_id, subject })
            ]
        });

        // 🔔 GENERAR NOTIFICACIÓN AUTOMÁTICA AL EMPLEADO
        await sendLegalCommunicationNotification(
            communicationId,
            employee[0],
            communicationType[0],
            { subject, description, reference_number: referenceNumber }
        );

        res.status(201).json({
            success: true,
            data: {
                id: communicationId,
                reference_number: referenceNumber,
                pdf_generated: !!pdfPath,
                pdf_path: pdfPath
            },
            message: 'Comunicación legal creada exitosamente'
        });

    } catch (error) {
        console.error('Error creando comunicación legal:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/v1/legal/communications/:id - Obtener una comunicación específica
router.get('/communications/:id', authenticateToken, checkPermission('legal-communications', 'view'), async (req, res) => {
    try {
        const { id } = req.params;

        const [communication] = await sequelize.query(`
            SELECT 
                lc.*,
                lct.name as type_name,
                lct.category,
                lct.severity,
                lct.legal_basis,
                lct.template_content,
                u.firstName as employee_first_name,
                u.lastName as employee_last_name,
                u.employeeId as employee_code,
                u.email as employee_email,
                creator.firstName as created_by_name
            FROM legal_communications lc
            JOIN legal_communication_types lct ON lc.type_id = lct.id
            JOIN users u ON lc.employee_id = u.id
            JOIN users creator ON lc.created_by = creator.id
            WHERE lc.id = ?
        `, { replacements: [id] });

        if (communication.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Comunicación legal no encontrada'
            });
        }

        res.json({
            success: true,
            data: communication[0]
        });

    } catch (error) {
        console.error('Error obteniendo comunicación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/v1/legal/communications/:id/pdf - Descargar PDF
router.get('/communications/:id/pdf', authenticateToken, checkPermission('legal-communications', 'view'), async (req, res) => {
    try {
        const { id } = req.params;

        const [communication] = await sequelize.query(`
            SELECT pdf_path, reference_number FROM legal_communications WHERE id = ?
        `, { replacements: [id] });

        if (communication.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Comunicación legal no encontrada'
            });
        }

        const pdfPath = communication[0].pdf_path;
        if (!pdfPath) {
            return res.status(404).json({
                success: false,
                error: 'PDF no disponible para esta comunicación'
            });
        }

        try {
            await fs.access(pdfPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${communication[0].reference_number}.pdf"`);
            
            const pdfBuffer = await fs.readFile(pdfPath);
            res.send(pdfBuffer);
            
        } catch (fileError) {
            return res.status(404).json({
                success: false,
                error: 'Archivo PDF no encontrado en el sistema'
            });
        }

    } catch (error) {
        console.error('Error descargando PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// PUT /api/v1/legal/communications/:id/status - Cambiar estado de comunicación
router.put('/communications/:id/status', authenticateToken, checkPermission('legal-communications', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ['draft', 'generated', 'sent', 'delivered', 'responded', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Estado inválido'
            });
        }

        await sequelize.query(`
            UPDATE legal_communications
            SET status = ?, notes = ?, updated_at = NOW()
            WHERE id = ?
        `, { replacements: [status, notes, id] });

        // Registrar en auditoría
        await sequelize.query(`
            INSERT INTO audit_logs (userId, action, moduleId, entityType, entityId, details, success, createdAt)
            VALUES (?, 'update_legal_communication_status', 'legal-communications', 'legal_communication', ?, ?, 1, NOW())
        `, {
            replacements: [
                req.user.user_id,
                id,
                JSON.stringify({ new_status: status, notes })
            ]
        });

        // 🔔 GENERAR NOTIFICACIÓN AL EMPLEADO SEGÚN EL ESTADO
        if (['sent', 'delivered'].includes(status)) {
            await sendLegalStatusChangeNotification(id, status, notes);
        }

        res.json({
            success: true,
            message: 'Estado actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando estado:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/v1/legal/dashboard/stats - Estadísticas para dashboard legal
router.get('/dashboard/stats', authenticateToken, checkPermission('legal-dashboard', 'view'), async (req, res) => {
    try {
        // Estadísticas generales
        const [generalStats] = await sequelize.query(`
            SELECT 
                COUNT(*) as total_communications,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
                COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
                COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded_count,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as last_30_days,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as last_7_days
            FROM legal_communications
        `);

        // Por tipo de comunicación
        const [typeStats] = await sequelize.query(`
            SELECT 
                lct.name,
                lct.category,
                lct.severity,
                COUNT(lc.id) as count
            FROM legal_communication_types lct
            LEFT JOIN legal_communications lc ON lct.id = lc.type_id
            GROUP BY lct.id, lct.name, lct.category, lct.severity
            ORDER BY count DESC
        `);

        // Por empleado (top 10)
        const [employeeStats] = await sequelize.query(`
            SELECT 
                u.firstName,
                u.lastName,
                u.employeeId,
                COUNT(lc.id) as communication_count,
                COUNT(CASE WHEN lc.status = 'responded' THEN 1 END) as responded_count
            FROM users u
            LEFT JOIN legal_communications lc ON u.id = lc.employee_id
            WHERE u.isActive = 1
            GROUP BY u.id, u.firstName, u.lastName, u.employeeId
            HAVING communication_count > 0
            ORDER BY communication_count DESC
            LIMIT 10
        `);

        // Tendencia mensual (últimos 6 meses)
        const [monthlyStats] = await sequelize.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count,
                COUNT(CASE WHEN status IN ('delivered', 'responded', 'closed') THEN 1 END) as completed_count
            FROM legal_communications
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
        `);

        res.json({
            success: true,
            data: {
                general: generalStats[0],
                by_type: typeStats,
                by_employee: employeeStats,
                monthly_trend: monthlyStats
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ======== FUNCIONES AUXILIARES PARA NOTIFICACIONES ========

// Enviar notificación de nueva comunicación legal al empleado
async function sendLegalCommunicationNotification(communicationId, employee, communicationType, details) {
    try {
        // Obtener datos completos del empleado
        const employeeData = await User.findOne({
            where: { user_id: employee.id },
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!employeeData) {
            console.error('[sendLegalCommunicationNotification] Empleado no encontrado');
            return;
        }

        // Determinar prioridad según severidad
        const priorityMap = {
            'critical': 'urgent',
            'high': 'high',
            'medium': 'medium',
            'low': 'normal'
        };
        const priority = priorityMap[communicationType.severity] || 'high';

        // Determinar si requiere acción (respuesta)
        const requiresAction = communicationType.requires_response || false;

        console.log(`🔔 [LEGAL] Generando notificación de comunicación legal: ${employeeData.firstName} ${employeeData.lastName} - ${communicationType.category}`);

        // 🔔 GENERAR NOTIFICACIÓN CON WORKFLOW SI REQUIERE RESPUESTA
        // 🔌 PLUG & PLAY: Solo se envía si el módulo 'notifications-enterprise' está activo
        await useModuleIfAvailable(employeeData.company_id, 'notifications-enterprise', async () => {
            return await NotificationWorkflowService.createNotification({
                module: 'legal',
                notificationType: 'legal_communication_received',
                companyId: employeeData.company_id,
                category: requiresAction ? 'action_required' : 'informational',
                priority: priority,
                templateKey: 'legal_communication_received',
                variables: {
                    employee_name: `${employeeData.firstName} ${employeeData.lastName}`,
                    employee_id: employeeData.employeeId || employeeData.user_id.substring(0, 8),
                    department: employeeData.department?.name || 'Sin departamento',
                    communication_type: communicationType.name,
                    communication_category: communicationType.category,
                    severity: communicationType.severity,
                    subject: details.subject,
                    description: details.description || 'Ver detalles completos en el sistema',
                    reference_number: details.reference_number,
                    legal_basis: communicationType.legal_basis || 'No especificado',
                    requires_response: requiresAction ? 'Sí' : 'No',
                    response_deadline: requiresAction ? '5 días hábiles' : 'N/A'
                },
                relatedEntityType: 'legal_communication',
                relatedEntityId: communicationId,
                relatedUserId: employeeData.user_id,
                relatedDepartmentId: employeeData.department?.id,
                recipientRole: 'employee', // Va directo al empleado
                recipientUserId: employeeData.user_id,
                entity: {
                    communication_type: communicationType.category,
                    severity: communicationType.severity,
                    requires_response: requiresAction
                },
                sendEmail: true, // Siempre enviar email para comunicaciones legales
                metadata: {
                    communication_id: communicationId,
                    type_id: communicationType.id,
                    category: communicationType.category,
                    severity: communicationType.severity,
                    auto_generated: true
                }
            });
        }, () => {
            // Fallback: Módulo no activo, comunicación registrada sin notificar
            console.log('⏭️  [LEGAL] Módulo notificaciones no activo - Comunicación registrada sin notificar');
            return null;
        });

        console.log(`✅ [LEGAL] Notificación generada para comunicación ${communicationId}`);

    } catch (error) {
        console.error('[sendLegalCommunicationNotification] Error:', error);
    }
}

// Enviar notificación de cambio de estado de comunicación legal
async function sendLegalStatusChangeNotification(communicationId, newStatus, notes) {
    try {
        // Obtener datos de la comunicación
        const [communication] = await sequelize.query(`
            SELECT
                lc.*,
                lct.name as type_name,
                lct.category,
                lct.severity,
                u.user_id as employee_user_id,
                u.firstName as employee_first_name,
                u.lastName as employee_last_name,
                u.employeeId,
                u.company_id
            FROM legal_communications lc
            JOIN legal_communication_types lct ON lc.type_id = lct.id
            JOIN users u ON lc.employee_id = u.id
            WHERE lc.id = ?
        `, { replacements: [communicationId] });

        if (communication.length === 0) {
            console.error('[sendLegalStatusChangeNotification] Comunicación no encontrada');
            return;
        }

        const comm = communication[0];

        // Obtener empleado con departamento
        const employeeData = await User.findOne({
            where: { user_id: comm.employee_user_id },
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!employeeData) {
            console.error('[sendLegalStatusChangeNotification] Empleado no encontrado');
            return;
        }

        const statusTexts = {
            'sent': 'ENVIADA',
            'delivered': 'ENTREGADA',
            'responded': 'RESPONDIDA',
            'closed': 'CERRADA'
        };
        const statusText = statusTexts[newStatus] || newStatus.toUpperCase();

        console.log(`🔔 [LEGAL] Generando notificación de cambio de estado: ${employeeData.firstName} ${employeeData.lastName} - ${statusText}`);

        // 🔔 GENERAR NOTIFICACIÓN INFORMATIVA
        // 🔌 PLUG & PLAY: Solo se envía si el módulo 'notifications-enterprise' está activo
        await useModuleIfAvailable(employeeData.company_id, 'notifications-enterprise', async () => {
            return await NotificationWorkflowService.createNotification({
                module: 'legal',
                notificationType: 'legal_communication_status_change',
                companyId: employeeData.company_id,
                category: 'informational',
                priority: newStatus === 'sent' ? 'urgent' : 'high',
                templateKey: 'legal_communication_status_change',
                variables: {
                    employee_name: `${employeeData.firstName} ${employeeData.lastName}`,
                    employee_id: employeeData.employeeId || employeeData.user_id.substring(0, 8),
                    communication_type: comm.type_name,
                    reference_number: comm.reference_number,
                    subject: comm.subject,
                    status: statusText,
                    status_color: newStatus === 'delivered' ? 'warning' : 'info',
                    notes: notes || 'Sin notas adicionales',
                    update_date: new Date().toLocaleDateString('es-AR')
                },
                relatedEntityType: 'legal_communication',
                relatedEntityId: communicationId,
                relatedUserId: employeeData.user_id,
                relatedDepartmentId: employeeData.department?.id,
                recipientRole: 'employee',
                recipientUserId: employeeData.user_id,
                entity: {
                    status: newStatus,
                    communication_id: communicationId
                },
                sendEmail: ['sent', 'delivered'].includes(newStatus), // Email solo en estados importantes
                metadata: {
                    communication_id: communicationId,
                    previous_status: comm.status,
                    new_status: newStatus,
                    auto_generated: true
                }
            });
        }, () => {
            // Fallback: Módulo no activo, cambio de estado registrado sin notificar
            console.log('⏭️  [LEGAL] Módulo notificaciones no activo - Cambio de estado registrado sin notificar');
            return null;
        });

        console.log(`✅ [LEGAL] Notificación de cambio de estado generada para comunicación ${communicationId}`);

    } catch (error) {
        console.error('[sendLegalStatusChangeNotification] Error:', error);
    }
}

module.exports = router;