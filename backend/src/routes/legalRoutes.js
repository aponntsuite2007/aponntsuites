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

// Importar servicios de jurisdicción y expediente legal 360
const LegalJurisdictionService = require('../services/LegalJurisdictionService');
const EmployeeLegal360Service = require('../services/EmployeeLegal360Service');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

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
// NOTA: checkPermission removido temporalmente - sistema de permisos tiene bugs con PostgreSQL
router.get('/communication-types', authenticateToken, async (req, res) => {
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
router.get('/communications', authenticateToken, async (req, res) => {
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
router.post('/communications', authenticateToken, async (req, res) => {
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
router.get('/communications/:id', authenticateToken, async (req, res) => {
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
router.get('/communications/:id/pdf', authenticateToken, async (req, res) => {
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
router.put('/communications/:id/status', authenticateToken, async (req, res) => {
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
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
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

// ============================================================================
// ENDPOINTS DE JURISDICCIÓN (Multi-País)
// ============================================================================

// GET /api/v1/legal/jurisdiction - Obtener jurisdicción de la empresa actual
router.get('/jurisdiction', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const jurisdiction = await LegalJurisdictionService.getJurisdictionForCompany(sequelize, companyId);

        res.json({
            success: true,
            data: jurisdiction
        });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo jurisdicción:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// GET /api/v1/legal/jurisdiction/employee/:employeeId - Jurisdicción de un empleado específico
router.get('/jurisdiction/employee/:employeeId', authenticateToken, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const jurisdiction = await LegalJurisdictionService.getJurisdictionForEmployee(sequelize, employeeId);

        res.json({
            success: true,
            data: jurisdiction
        });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo jurisdicción del empleado:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// GET /api/v1/legal/jurisdiction/all - Lista todas las jurisdicciones disponibles (admin)
router.get('/jurisdiction/all', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                laborLaws: LegalJurisdictionService.getAllLaborLaws(),
                countriesByRegion: LegalJurisdictionService.getCountriesByRegion()
            }
        });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo jurisdicciones:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// ============================================================================
// ENDPOINTS DE EXPEDIENTE LEGAL 360°
// ============================================================================

// GET /api/v1/legal/employee/:employeeId/legal-360 - Expediente legal completo del empleado
router.get('/employee/:employeeId/legal-360', authenticateToken, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const companyId = req.user.company_id;

        console.log(`⚖️ [LEGAL-360] Solicitado expediente para empleado ${employeeId}`);

        const report = await EmployeeLegal360Service.getFullLegalReport(employeeId, companyId);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('[LEGAL-360] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error generando expediente legal 360'
        });
    }
});

// ============================================================================
// ENDPOINTS DE USER LEGAL ISSUES (Juicios y Mediaciones) - SSOT
// ============================================================================

// GET /api/v1/legal/issues - Obtener issues legales (juicios/mediaciones)
router.get('/issues', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { user_id, status, issue_type, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'company_id = :companyId';
        const replacements = { companyId, limit: parseInt(limit), offset };

        if (user_id) {
            whereClause += ' AND user_id = :userId';
            replacements.userId = user_id;
        }
        if (status) {
            whereClause += ' AND status = :status';
            replacements.status = status;
        }
        if (issue_type) {
            whereClause += ' AND issue_type = :issueType';
            replacements.issueType = issue_type;
        }

        const issues = await sequelize.query(`
            SELECT
                uli.*,
                u.first_name || ' ' || u.last_name as employee_name,
                u.employee_id as employee_code
            FROM user_legal_issues uli
            JOIN users u ON u.user_id = uli.user_id
            WHERE ${whereClause}
            ORDER BY uli.created_at DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        const countResult = await sequelize.query(`
            SELECT COUNT(*) as total FROM user_legal_issues WHERE ${whereClause}
        `, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: issues,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult[0].total),
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo issues:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// POST /api/v1/legal/issues - Crear nuevo issue legal (juicio/mediación)
router.post('/issues', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const {
            user_id,
            issue_type,
            issue_subtype,
            case_number,
            court,
            jurisdiction,
            filing_date,
            status = 'activo',
            description,
            plaintiff,
            defendant,
            affects_employment = false,
            employment_restriction_details,
            notes,
            is_confidential = false
        } = req.body;

        if (!user_id || !issue_type) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: user_id, issue_type'
            });
        }

        const result = await sequelize.query(`
            INSERT INTO user_legal_issues
            (user_id, company_id, issue_type, issue_subtype, case_number, court, jurisdiction,
             filing_date, status, description, plaintiff, defendant, affects_employment,
             employment_restriction_details, notes, is_confidential, created_at, updated_at)
            VALUES (:userId, :companyId, :issueType, :issueSubtype, :caseNumber, :court, :jurisdiction,
                    :filingDate, :status, :description, :plaintiff, :defendant, :affectsEmployment,
                    :employmentRestriction, :notes, :isConfidential, NOW(), NOW())
            RETURNING id
        `, {
            replacements: {
                userId: user_id,
                companyId,
                issueType: issue_type,
                issueSubtype: issue_subtype || null,
                caseNumber: case_number || null,
                court: court || null,
                jurisdiction: jurisdiction || null,
                filingDate: filing_date || null,
                status,
                description: description || null,
                plaintiff: plaintiff || null,
                defendant: defendant || null,
                affectsEmployment: affects_employment,
                employmentRestriction: employment_restriction_details || null,
                notes: notes || null,
                isConfidential: is_confidential
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.status(201).json({
            success: true,
            data: { id: result[0]?.id || result[0][0]?.id },
            message: 'Issue legal creado exitosamente'
        });
    } catch (error) {
        console.error('[LEGAL] Error creando issue:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// PUT /api/v1/legal/issues/:id - Actualizar issue legal
router.put('/issues/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company_id;
        const updateFields = req.body;

        // Construir SET dinámico
        const allowedFields = [
            'issue_type', 'issue_subtype', 'case_number', 'court', 'jurisdiction',
            'filing_date', 'resolution_date', 'last_hearing_date', 'next_hearing_date',
            'status', 'description', 'plaintiff', 'defendant', 'outcome', 'sentence_details',
            'fine_amount', 'affects_employment', 'employment_restriction_details',
            'document_url', 'notes', 'is_confidential'
        ];

        const setClauses = [];
        const replacements = { id, companyId };

        for (const field of allowedFields) {
            if (updateFields[field] !== undefined) {
                setClauses.push(`${field} = :${field}`);
                replacements[field] = updateFields[field];
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
        }

        setClauses.push('updated_at = NOW()');

        await sequelize.query(`
            UPDATE user_legal_issues
            SET ${setClauses.join(', ')}
            WHERE id = :id AND company_id = :companyId
        `, { replacements, type: sequelize.QueryTypes.UPDATE });

        res.json({ success: true, message: 'Issue actualizado exitosamente' });
    } catch (error) {
        console.error('[LEGAL] Error actualizando issue:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// DELETE /api/v1/legal/issues/:id - Eliminar issue legal
router.delete('/issues/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company_id;

        await sequelize.query(`
            DELETE FROM user_legal_issues WHERE id = :id AND company_id = :companyId
        `, {
            replacements: { id, companyId },
            type: sequelize.QueryTypes.DELETE
        });

        res.json({ success: true, message: 'Issue eliminado exitosamente' });
    } catch (error) {
        console.error('[LEGAL] Error eliminando issue:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// =====================================================
// SISTEMA DE INMUTABILIDAD Y AUTORIZACIONES
// Patrón copiado de módulo médico (MedicalImmutabilityService)
// =====================================================

// Importar servicio de inmutabilidad
let LegalImmutabilityService;
try {
    LegalImmutabilityService = require('../services/LegalImmutabilityService');
} catch (e) {
    console.warn('⚠️ [LEGAL] LegalImmutabilityService no disponible:', e.message);
}

// GET /api/v1/legal/editability/:table/:recordId - Verificar editabilidad de registro
router.get('/editability/:table/:recordId', authenticateToken, async (req, res) => {
    try {
        const { table, recordId } = req.params;
        const userId = req.user.id;

        if (!['legal_communications', 'user_legal_issues'].includes(table)) {
            return res.status(400).json({
                success: false,
                error: 'Tabla inválida. Use: legal_communications o user_legal_issues'
            });
        }

        if (!LegalImmutabilityService) {
            // Fallback: siempre editable si el servicio no está disponible
            return res.json({
                success: true,
                editable: true,
                reason: 'Servicio de inmutabilidad no configurado',
                code: 'SERVICE_UNAVAILABLE'
            });
        }

        const editability = await LegalImmutabilityService.checkEditability(table, recordId, userId);

        res.json({
            success: true,
            ...editability
        });
    } catch (error) {
        console.error('[LEGAL] Error verificando editabilidad:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// POST /api/v1/legal/authorization/request - Solicitar autorización para editar/eliminar
router.post('/authorization/request', authenticateToken, async (req, res) => {
    try {
        const { table, record_id, reason, action_type, proposed_changes, priority } = req.body;

        if (!table || !record_id || !reason) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: table, record_id, reason'
            });
        }

        if (!['legal_communications', 'user_legal_issues'].includes(table)) {
            return res.status(400).json({
                success: false,
                error: 'Tabla inválida'
            });
        }

        if (!LegalImmutabilityService) {
            return res.status(503).json({
                success: false,
                error: 'Servicio de inmutabilidad no disponible'
            });
        }

        const context = {
            userId: req.user.id,
            userName: req.user.name || req.user.firstName,
            userRole: req.user.role,
            companyId: req.user.company_id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        const result = await LegalImmutabilityService.requestAuthorization(
            table,
            record_id,
            { reason, action_type: action_type || 'edit', proposed_changes, priority },
            context
        );

        res.json(result);
    } catch (error) {
        console.error('[LEGAL] Error solicitando autorización:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno' });
    }
});

// POST /api/v1/legal/authorization/:id/approve - Aprobar autorización
router.post('/authorization/:id/approve', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body;

        // Verificar rol (solo RRHH, admin, legal_manager)
        if (!['admin', 'rrhh', 'hr_manager', 'legal', 'legal_manager', 'supervisor'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permisos para aprobar autorizaciones'
            });
        }

        if (!LegalImmutabilityService) {
            return res.status(503).json({
                success: false,
                error: 'Servicio de inmutabilidad no disponible'
            });
        }

        const context = {
            userId: req.user.id,
            userName: req.user.name || req.user.firstName,
            userRole: req.user.role,
            companyId: req.user.company_id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        const result = await LegalImmutabilityService.approveAuthorization(id, { response }, context);
        res.json(result);
    } catch (error) {
        console.error('[LEGAL] Error aprobando autorización:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno' });
    }
});

// POST /api/v1/legal/authorization/:id/reject - Rechazar autorización
router.post('/authorization/:id/reject', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { response } = req.body;

        // Verificar rol
        if (!['admin', 'rrhh', 'hr_manager', 'legal', 'legal_manager', 'supervisor'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permisos para rechazar autorizaciones'
            });
        }

        if (!LegalImmutabilityService) {
            return res.status(503).json({
                success: false,
                error: 'Servicio de inmutabilidad no disponible'
            });
        }

        const context = {
            userId: req.user.id,
            userName: req.user.name || req.user.firstName,
            userRole: req.user.role,
            companyId: req.user.company_id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        const result = await LegalImmutabilityService.rejectAuthorization(id, { response }, context);
        res.json(result);
    } catch (error) {
        console.error('[LEGAL] Error rechazando autorización:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno' });
    }
});

// GET /api/v1/legal/authorizations/pending - Listar autorizaciones pendientes (para RRHH)
router.get('/authorizations/pending', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userRole = req.user.role;

        if (!LegalImmutabilityService) {
            return res.json({ success: true, data: [], message: 'Servicio no disponible' });
        }

        const pending = await LegalImmutabilityService.getPendingAuthorizations(companyId, userRole);

        res.json({
            success: true,
            data: pending,
            count: pending.length
        });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo autorizaciones pendientes:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// GET /api/v1/legal/authorizations/my-requests - Mis solicitudes de autorización
router.get('/authorizations/my-requests', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.id;
        const { status } = req.query;

        if (!LegalImmutabilityService) {
            return res.json({ success: true, data: [], message: 'Servicio no disponible' });
        }

        const requests = await LegalImmutabilityService.getMyAuthorizationRequests(companyId, userId, status);

        res.json({
            success: true,
            data: requests,
            count: requests.length
        });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo mis solicitudes:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// PUT /api/v1/legal/record/:table/:id - Actualizar registro con verificación de editabilidad
router.put('/record/:table/:id', authenticateToken, async (req, res) => {
    try {
        const { table, id } = req.params;
        const updates = req.body;

        if (!['legal_communications', 'user_legal_issues'].includes(table)) {
            return res.status(400).json({ success: false, error: 'Tabla inválida' });
        }

        if (!LegalImmutabilityService) {
            // Fallback: actualizar directamente si el servicio no está disponible
            return res.status(503).json({
                success: false,
                error: 'Servicio de inmutabilidad no disponible'
            });
        }

        const context = {
            userId: req.user.id,
            userName: req.user.name || req.user.firstName,
            userRole: req.user.role,
            companyId: req.user.company_id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        const result = await LegalImmutabilityService.updateRecord(table, id, updates, context);
        res.json(result);
    } catch (error) {
        console.error('[LEGAL] Error actualizando registro:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno' });
    }
});

// DELETE /api/v1/legal/record/:table/:id - Eliminar registro con verificación de editabilidad
router.delete('/record/:table/:id', authenticateToken, async (req, res) => {
    try {
        const { table, id } = req.params;
        const { reason } = req.body;

        if (!['legal_communications', 'user_legal_issues'].includes(table)) {
            return res.status(400).json({ success: false, error: 'Tabla inválida' });
        }

        if (!reason || reason.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar un motivo de eliminación (mínimo 10 caracteres)'
            });
        }

        if (!LegalImmutabilityService) {
            return res.status(503).json({
                success: false,
                error: 'Servicio de inmutabilidad no disponible'
            });
        }

        const context = {
            userId: req.user.id,
            userName: req.user.name || req.user.firstName,
            userRole: req.user.role,
            companyId: req.user.company_id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        const result = await LegalImmutabilityService.deleteRecord(table, id, { reason }, context);
        res.json(result);
    } catch (error) {
        console.error('[LEGAL] Error eliminando registro:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno' });
    }
});

// ==============================================================
// WORKFLOW LEGAL COMPLETO - EXPEDIENTES Y CASOS
// ==============================================================

// Importar nuevos servicios
const LegalCase360Service = require('../services/LegalCase360Service');
const LegalWorkflowService = require('../services/LegalWorkflowService');
const LegalOllamaService = require('../services/LegalOllamaService');

// ========== CASOS LEGALES ==========

// GET /api/v1/legal/cases - Listar casos legales
router.get('/cases', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { stage, case_type, is_active, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'company_id = :companyId';
        const replacements = { companyId, limit: parseInt(limit), offset: parseInt(offset) };

        if (stage) {
            whereClause += ' AND current_stage = :stage';
            replacements.stage = stage;
        }
        if (case_type) {
            whereClause += ' AND case_type = :caseType';
            replacements.caseType = case_type;
        }
        if (is_active !== undefined) {
            whereClause += ' AND is_active = :isActive';
            replacements.isActive = is_active === 'true';
        }

        const cases = await sequelize.query(`
            SELECT lc.*,
                   u.name as assigned_to_name,
                   (SELECT COUNT(*) FROM legal_deadlines ld
                    WHERE ld.case_id = lc.id AND ld.status = 'pending') as pending_deadlines
            FROM legal_cases lc
            LEFT JOIN users u ON lc.assigned_to = u.user_id
            WHERE ${whereClause}
            ORDER BY
                CASE lc.priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'normal' THEN 3
                    WHEN 'low' THEN 4
                END,
                lc.created_at DESC
            LIMIT :limit OFFSET :offset
        `, { replacements, type: sequelize.QueryTypes.SELECT });

        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total FROM legal_cases WHERE ${whereClause}
        `, { replacements, type: sequelize.QueryTypes.SELECT });

        res.json({
            success: true,
            data: cases,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.total),
                pages: Math.ceil(countResult.total / limit)
            }
        });
    } catch (error) {
        console.error('[LEGAL] Error listando casos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/cases - Crear nuevo caso legal
router.post('/cases', authenticateToken, async (req, res) => {
    try {
        const context = {
            companyId: req.user.company_id,
            userId: req.user.id
        };

        const result = await LegalWorkflowService.createCase(req.body, context);
        res.status(201).json(result);
    } catch (error) {
        console.error('[LEGAL] Error creando caso:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/cases/:id - Obtener caso por ID
router.get('/cases/:id', authenticateToken, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const caseId = req.params.id;

        const legalCase = await LegalWorkflowService.getCaseById(caseId, companyId);
        if (!legalCase) {
            return res.status(404).json({ success: false, error: 'Caso no encontrado' });
        }

        res.json({ success: true, data: legalCase });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo caso:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/v1/legal/cases/:id/advance-stage - Avanzar etapa del caso
router.put('/cases/:id/advance-stage', authenticateToken, async (req, res) => {
    try {
        const context = {
            companyId: req.user.company_id,
            userId: req.user.id
        };

        const { new_stage, sub_status, ...data } = req.body;
        const result = await LegalWorkflowService.advanceStage(
            req.params.id, new_stage, sub_status, data, context
        );
        res.json(result);
    } catch (error) {
        console.error('[LEGAL] Error avanzando etapa:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/v1/legal/cases/:id/sub-status - Actualizar sub-estado
router.put('/cases/:id/sub-status', authenticateToken, async (req, res) => {
    try {
        const context = {
            companyId: req.user.company_id,
            userId: req.user.id
        };

        const { sub_status, ...data } = req.body;
        const result = await LegalWorkflowService.updateSubStatus(
            req.params.id, sub_status, data, context
        );
        res.json(result);
    } catch (error) {
        console.error('[LEGAL] Error actualizando sub-estado:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/v1/legal/cases/:id/close - Cerrar caso
router.put('/cases/:id/close', authenticateToken, async (req, res) => {
    try {
        const context = {
            companyId: req.user.company_id,
            userId: req.user.id
        };

        const result = await LegalWorkflowService.closeCase(req.params.id, req.body, context);
        res.json(result);
    } catch (error) {
        console.error('[LEGAL] Error cerrando caso:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/cases/:id/timeline - Obtener timeline del caso
router.get('/cases/:id/timeline', authenticateToken, async (req, res) => {
    try {
        const timeline = await LegalWorkflowService.getCaseTimeline(
            req.params.id, req.user.company_id
        );
        res.json({ success: true, data: timeline });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo timeline:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/cases/:id/timeline - Agregar evento al timeline
router.post('/cases/:id/timeline', authenticateToken, async (req, res) => {
    try {
        const eventId = await LegalWorkflowService.addTimelineEvent(req.params.id, {
            ...req.body,
            created_by: req.user.id
        });
        res.status(201).json({ success: true, event_id: eventId });
    } catch (error) {
        console.error('[LEGAL] Error agregando evento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/cases/:id/documents - Obtener documentos del caso
router.get('/cases/:id/documents', authenticateToken, async (req, res) => {
    try {
        const documents = await LegalWorkflowService.getCaseDocuments(
            req.params.id, req.user.company_id
        );
        res.json({ success: true, data: documents });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo documentos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/cases/:id/documents - Agregar documento al caso
router.post('/cases/:id/documents', authenticateToken, async (req, res) => {
    try {
        const context = {
            companyId: req.user.company_id,
            userId: req.user.id
        };

        const result = await LegalWorkflowService.addDocument(req.params.id, req.body, context);
        res.status(201).json(result);
    } catch (error) {
        console.error('[LEGAL] Error agregando documento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// POST /api/v1/legal/documents/:docId/response - Registrar respuesta/acuse
router.post('/documents/:docId/response', authenticateToken, async (req, res) => {
    try {
        const { docId } = req.params;
        const { response_date, notes } = req.body;
        const result = await pool.query(`UPDATE legal_case_documents SET response_received = true, response_received_at = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [response_date ? new Date(response_date) : new Date(), docId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Documento no encontrado' });
        await pool.query(`UPDATE legal_document_alerts SET is_resolved = true, resolved_at = NOW() WHERE document_id = $1 AND is_resolved = false`, [docId]);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('[LEGAL] Error registrando respuesta:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/documents/alerts - Alertas pendientes
router.get('/documents/alerts', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`SELECT a.*, d.title as document_title FROM legal_document_alerts a LEFT JOIN legal_case_documents d ON a.document_id = d.id WHERE a.company_id = $1 AND a.is_resolved = false ORDER BY a.due_date`, [req.user.company_id]);
        res.json({ success: true, data: result.rows });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// GET /api/v1/legal/cases/:id/deadlines - Obtener vencimientos del caso
router.get('/cases/:id/deadlines', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;
        const deadlines = await LegalWorkflowService.getCaseDeadlines(
            req.params.id, req.user.company_id, status
        );
        res.json({ success: true, data: deadlines });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo vencimientos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/cases/:id/deadlines - Crear vencimiento
router.post('/cases/:id/deadlines', authenticateToken, async (req, res) => {
    try {
        const context = {
            companyId: req.user.company_id,
            userId: req.user.id
        };

        const result = await LegalWorkflowService.createDeadline(req.params.id, req.body, context);
        res.status(201).json(result);
    } catch (error) {
        console.error('[LEGAL] Error creando vencimiento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/workflow/stages - Obtener definición de etapas del workflow
router.get('/workflow/stages', authenticateToken, async (req, res) => {
    res.json({
        success: true,
        data: LegalWorkflowService.STAGES
    });
});

// GET /api/v1/legal/dashboard/stats - Estadísticas del dashboard legal
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await LegalWorkflowService.getDashboardStats(req.user.company_id);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== EXPEDIENTE 360 ==========

// GET /api/v1/legal/employee/:id/360 - Obtener expediente 360 completo
router.get('/employee/:id/360', authenticateToken, async (req, res) => {
    try {
        const dossier = await LegalCase360Service.generateFullDossier(
            req.params.id,
            req.user.company_id
        );
        res.json({ success: true, data: dossier });
    } catch (error) {
        console.error('[LEGAL] Error generando expediente 360:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/cases/:id/employee-360 - Obtener expediente 360 guardado del caso
router.get('/cases/:id/employee-360', authenticateToken, async (req, res) => {
    try {
        const legalCase = await LegalWorkflowService.getCaseById(
            req.params.id, req.user.company_id
        );

        if (!legalCase) {
            return res.status(404).json({ success: false, error: 'Caso no encontrado' });
        }

        // Devolver snapshot guardado o generar nuevo
        if (legalCase.employee_360_snapshot) {
            res.json({
                success: true,
                data: legalCase.employee_360_snapshot,
                source: 'snapshot',
                snapshot_date: legalCase.created_at
            });
        } else {
            const dossier = await LegalCase360Service.generateFullDossier(
                legalCase.employee_id,
                req.user.company_id
            );
            res.json({ success: true, data: dossier, source: 'generated' });
        }
    } catch (error) {
        console.error('[LEGAL] Error obteniendo expediente 360 del caso:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== INTELIGENCIA ARTIFICIAL (OLLAMA) ==========

// GET /api/v1/legal/ai/status - Verificar disponibilidad de Ollama
router.get('/ai/status', authenticateToken, async (req, res) => {
    try {
        const isAvailable = await LegalOllamaService.isAvailable();
        res.json({
            success: true,
            available: isAvailable,
            model: process.env.OLLAMA_MODEL || 'llama3.1:8b'
        });
    } catch (error) {
        res.json({ success: true, available: false, error: error.message });
    }
});

// POST /api/v1/legal/ai/analyze-risk - Analizar riesgo del caso
router.post('/ai/analyze-risk', authenticateToken, async (req, res) => {
    try {
        const { case_id } = req.body;
        const companyId = req.user.company_id;

        const legalCase = await LegalWorkflowService.getCaseById(case_id, companyId);
        if (!legalCase) {
            return res.status(404).json({ success: false, error: 'Caso no encontrado' });
        }

        const employee360 = legalCase.employee_360_snapshot ||
            await LegalCase360Service.generateFullDossier(legalCase.employee_id, companyId);

        const analysis = await LegalOllamaService.analyzeRisk(legalCase, employee360);
        res.json({ success: true, data: analysis });
    } catch (error) {
        console.error('[LEGAL] Error en análisis de riesgo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/ai/case-summary - Generar resumen del caso
router.post('/ai/case-summary', authenticateToken, async (req, res) => {
    try {
        const { case_id } = req.body;
        const companyId = req.user.company_id;

        const legalCase = await LegalWorkflowService.getCaseById(case_id, companyId);
        if (!legalCase) {
            return res.status(404).json({ success: false, error: 'Caso no encontrado' });
        }

        const timeline = await LegalWorkflowService.getCaseTimeline(case_id, companyId);
        const documents = await LegalWorkflowService.getCaseDocuments(case_id, companyId);

        const summary = await LegalOllamaService.generateCaseSummary(legalCase, timeline, documents);
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('[LEGAL] Error generando resumen:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/ai/analyze-employee - Analizar historial del empleado
router.post('/ai/analyze-employee', authenticateToken, async (req, res) => {
    try {
        const { employee_id } = req.body;
        const companyId = req.user.company_id;

        const employee360 = await LegalCase360Service.generateFullDossier(employee_id, companyId);
        employee360.company_id = companyId;

        const analysis = await LegalOllamaService.analyzeEmployeeHistory(employee360);
        res.json({ success: true, data: analysis });
    } catch (error) {
        console.error('[LEGAL] Error analizando empleado:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/ai/calculate-exposure - Calcular exposición económica
router.post('/ai/calculate-exposure', authenticateToken, async (req, res) => {
    try {
        const { case_id } = req.body;
        const companyId = req.user.company_id;

        const legalCase = await LegalWorkflowService.getCaseById(case_id, companyId);
        if (!legalCase) {
            return res.status(404).json({ success: false, error: 'Caso no encontrado' });
        }

        const employee360 = legalCase.employee_360_snapshot ||
            await LegalCase360Service.generateFullDossier(legalCase.employee_id, companyId);

        const exposure = await LegalOllamaService.calculateExposure(legalCase, employee360);
        res.json({ success: true, data: exposure });
    } catch (error) {
        console.error('[LEGAL] Error calculando exposición:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/ai/suggest-documents - Sugerir documentos a recopilar
router.post('/ai/suggest-documents', authenticateToken, async (req, res) => {
    try {
        const { case_type, current_documents } = req.body;
        const suggestions = await LegalOllamaService.suggestDocuments(case_type, current_documents || []);
        res.json({ success: true, data: suggestions });
    } catch (error) {
        console.error('[LEGAL] Error sugiriendo documentos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/ai/assist - Asistente de consultas
router.post('/ai/assist', authenticateToken, async (req, res) => {
    try {
        const { question, context } = req.body;
        const response = await LegalOllamaService.assistLawyer(question, context || {});
        res.json({ success: true, data: response });
    } catch (error) {
        console.error('[LEGAL] Error en asistente:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/v1/legal/ai/analyze-timeline - Analizar timeline y sugerir próximos pasos
router.post('/ai/analyze-timeline', authenticateToken, async (req, res) => {
    try {
        const { case_id } = req.body;
        const companyId = req.user.company_id;

        const legalCase = await LegalWorkflowService.getCaseById(case_id, companyId);
        if (!legalCase) {
            return res.status(404).json({ success: false, error: 'Caso no encontrado' });
        }

        const timeline = await LegalWorkflowService.getCaseTimeline(case_id, companyId);
        const analysis = await LegalOllamaService.analyzeTimelineAndSuggest(legalCase, timeline);
        res.json({ success: true, data: analysis });
    } catch (error) {
        console.error('[LEGAL] Error analizando timeline:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/ai/recommendations - Obtener recomendaciones proactivas
router.get('/ai/recommendations', authenticateToken, async (req, res) => {
    try {
        const recommendations = await LegalOllamaService.generateProactiveRecommendations(
            req.user.company_id
        );
        res.json({ success: true, data: recommendations });
    } catch (error) {
        console.error('[LEGAL] Error generando recomendaciones:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/v1/legal/ai/previous-analyses/:caseId - Obtener análisis previos
router.get('/ai/previous-analyses/:caseId', authenticateToken, async (req, res) => {
    try {
        const { type } = req.query;
        const analyses = await LegalOllamaService.getPreviousAnalyses(req.params.caseId, type);
        res.json({ success: true, data: analyses });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo análisis previos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== VENCIMIENTOS GLOBALES ==========

// GET /api/v1/legal/deadlines/upcoming - Obtener vencimientos próximos (todos los casos)
router.get('/deadlines/upcoming', authenticateToken, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const companyId = req.user.company_id;
        const userId = req.user.id;

        const deadlines = await sequelize.query(`
            SELECT * FROM get_upcoming_legal_deadlines(:companyId, :days, :userId)
        `, {
            replacements: { companyId, days: parseInt(days), userId },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: deadlines });
    } catch (error) {
        console.error('[LEGAL] Error obteniendo vencimientos próximos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/v1/legal/deadlines/:id/complete - Marcar vencimiento como completado
router.put('/deadlines/:id/complete', authenticateToken, async (req, res) => {
    try {
        await sequelize.query(`
            UPDATE legal_deadlines
            SET status = 'completed',
                completed_at = NOW(),
                completed_by = :userId,
                updated_at = NOW()
            WHERE id = :deadlineId AND company_id = :companyId
        `, {
            replacements: {
                deadlineId: req.params.id,
                companyId: req.user.company_id,
                userId: req.user.id
            },
            type: sequelize.QueryTypes.UPDATE
        });

        res.json({ success: true, message: 'Vencimiento marcado como completado' });
    } catch (error) {
        console.error('[LEGAL] Error completando vencimiento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;