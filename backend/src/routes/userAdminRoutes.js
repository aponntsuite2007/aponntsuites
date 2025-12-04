/**
 * RUTAS: DOCUMENTOS, PERMISOS Y DISCIPLINARIOS
 * Endpoints CRUD para gestión administrativa del empleado
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
}



// Importar modelos
const UserDocuments = require('../models/UserDocuments');
const UserPermissionRequests = require('../models/UserPermissionRequests');
const UserDisciplinaryActions = require('../models/UserDisciplinaryActions');

// Middleware
const verifyCompanyAccess = (req, res, next) => {
    if (!req.user || !req.user.company_id) {
        return res.status(403).json({ error: 'No se pudo verificar la empresa del usuario' });
    }
    next();
};

// ============================================================================
// 1. DOCUMENTOS PERSONALES (Personal Documents)
// ============================================================================

router.get('/:userId/documents', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const documents = await UserDocuments.findAll({
            where: { user_id: userId, company_id: companyId }
        });

        res.json(documents);
    } catch (error) {
        console.error('Error al obtener documentos:', error);
        res.status(500).json({ error: 'Error al obtener documentos' });
    }
});

router.post('/:userId/documents', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const document = await UserDocuments.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(document);
    } catch (error) {
        console.error('Error al agregar documento:', error);
        res.status(500).json({ error: 'Error al agregar documento' });
    }
});

router.put('/:userId/documents/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const document = await UserDocuments.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!document) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        await document.update(req.body);
        res.json(document);
    } catch (error) {
        console.error('Error al actualizar documento:', error);
        res.status(500).json({ error: 'Error al actualizar documento' });
    }
});

router.delete('/:userId/documents/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserDocuments.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }

        res.json({ message: 'Documento eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar documento:', error);
        res.status(500).json({ error: 'Error al eliminar documento' });
    }
});

// ============================================================================
// 2. SOLICITUDES DE PERMISOS (Permission Requests)
// ============================================================================

router.get('/:userId/permissions', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const permissions = await UserPermissionRequests.findAll({
            where: { user_id: userId, company_id: companyId },
            order: [['requested_date', 'DESC']]
        });

        res.json(permissions);
    } catch (error) {
        console.error('Error al obtener permisos:', error);
        res.status(500).json({ error: 'Error al obtener permisos' });
    }
});

router.post('/:userId/permissions', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const permission = await UserPermissionRequests.create({
            user_id: userId,
            company_id: companyId,
            ...req.body
        });

        res.status(201).json(permission);
    } catch (error) {
        console.error('Error al crear solicitud de permiso:', error);
        res.status(500).json({ error: 'Error al crear solicitud de permiso' });
    }
});

router.put('/:userId/permissions/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const permission = await UserPermissionRequests.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!permission) {
            return res.status(404).json({ error: 'Permiso no encontrado' });
        }

        await permission.update(req.body);
        res.json(permission);
    } catch (error) {
        console.error('Error al actualizar permiso:', error);
        res.status(500).json({ error: 'Error al actualizar permiso' });
    }
});

// Aprobar/Rechazar permiso (endpoint especial)
router.post('/:userId/permissions/:id/approve', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;
        const { status, rejection_reason } = req.body; // status: 'aprobado' | 'rechazado'

        const permission = await UserPermissionRequests.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!permission) {
            return res.status(404).json({ error: 'Permiso no encontrado' });
        }

        await permission.update({
            status,
            approved_by: req.user.user_id,
            approval_date: new Date(),
            rejection_reason: status === 'rechazado' ? rejection_reason : null
        });

        res.json(permission);
    } catch (error) {
        console.error('Error al aprobar/rechazar permiso:', error);
        res.status(500).json({ error: 'Error al aprobar/rechazar permiso' });
    }
});

router.delete('/:userId/permissions/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserPermissionRequests.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Permiso no encontrado' });
        }

        res.json({ message: 'Permiso eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar permiso:', error);
        res.status(500).json({ error: 'Error al eliminar permiso' });
    }
});

// ============================================================================
// 3. ACCIONES DISCIPLINARIAS (Disciplinary Actions)
// ============================================================================

router.get('/:userId/disciplinary', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const actions = await UserDisciplinaryActions.findAll({
            where: { user_id: userId, company_id: companyId },
            order: [['date_occurred', 'DESC']]
        });

        res.json(actions);
    } catch (error) {
        console.error('Error al obtener acciones disciplinarias:', error);
        res.status(500).json({ error: 'Error al obtener acciones disciplinarias' });
    }
});

router.post('/:userId/disciplinary', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId } = req.params;
        const companyId = req.user.company_id;

        const action = await UserDisciplinaryActions.create({
            user_id: userId,
            company_id: companyId,
            issued_by: req.user.user_id, // Usuario que crea la acción
            ...req.body
        });

        res.status(201).json(action);
    } catch (error) {
        console.error('Error al crear acción disciplinaria:', error);
        res.status(500).json({ error: 'Error al crear acción disciplinaria' });
    }
});

router.put('/:userId/disciplinary/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const action = await UserDisciplinaryActions.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!action) {
            return res.status(404).json({ error: 'Acción disciplinaria no encontrada' });
        }

        await action.update(req.body);
        res.json(action);
    } catch (error) {
        console.error('Error al actualizar acción disciplinaria:', error);
        res.status(500).json({ error: 'Error al actualizar acción disciplinaria' });
    }
});

// Registrar reconocimiento del empleado (endpoint especial)
router.post('/:userId/disciplinary/:id/acknowledge', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;
        const { employee_comments } = req.body;

        const action = await UserDisciplinaryActions.findOne({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!action) {
            return res.status(404).json({ error: 'Acción disciplinaria no encontrada' });
        }

        await action.update({
            employee_acknowledgement: true,
            employee_comments
        });

        res.json(action);
    } catch (error) {
        console.error('Error al registrar reconocimiento:', error);
        res.status(500).json({ error: 'Error al registrar reconocimiento' });
    }
});

router.delete('/:userId/disciplinary/:id', authenticateToken, verifyCompanyAccess, async (req, res) => {
    try {
        const { userId, id } = req.params;
        const companyId = req.user.company_id;

        const deleted = await UserDisciplinaryActions.destroy({
            where: { id, user_id: userId, company_id: companyId }
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Acción disciplinaria no encontrada' });
        }

        res.json({ message: 'Acción disciplinaria eliminada exitosamente' });
    } catch (error) {
        console.error('Error al eliminar acción disciplinaria:', error);
        res.status(500).json({ error: 'Error al eliminar acción disciplinaria' });
    }
});

module.exports = router;
