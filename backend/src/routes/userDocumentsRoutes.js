/**
 * ========================================================================
 * RUTAS: Documentos Vencibles de Usuarios
 * ========================================================================
 * API REST completa para gestión de documentos personales con vencimiento
 * Integrado con sistema de notificaciones automáticas
 * ========================================================================
 */

const express = require('express');
const router = express.Router();
const { auth: authenticateToken } = require('../middleware/auth');
const UserDocuments = require('../models/UserDocuments');
const { User } = require('../config/database');
const { Op } = require('sequelize');

/**
 * GET /api/v1/users/:userId/documents
 * Obtener todos los documentos de un usuario
 */
router.get('/users/:userId/documents', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user;

        // Verificar que el usuario pertenece a la empresa
        const user = await User.findOne({
            where: {
                user_id: userId,
                company_id: companyId
            }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        const documents = await UserDocuments.findAll({
            where: {
                user_id: userId,
                company_id: companyId
            },
            order: [['expiration_date', 'ASC NULLS LAST']]
        });

        res.json(documents);

    } catch (error) {
        console.error('❌ Error obteniendo documentos:', error);
        res.status(500).json({
            error: 'Error al obtener documentos',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/users/:userId/documents/:documentId
 * Obtener un documento específico
 */
router.get('/users/:userId/documents/:documentId', authenticateToken, async (req, res) => {
    try {
        const { userId, documentId } = req.params;
        const { companyId } = req.user;

        const document = await UserDocuments.findOne({
            where: {
                id: documentId,
                user_id: userId,
                company_id: companyId
            }
        });

        if (!document) {
            return res.status(404).json({
                error: 'Documento no encontrado'
            });
        }

        res.json(document);

    } catch (error) {
        console.error('❌ Error obteniendo documento:', error);
        res.status(500).json({
            error: 'Error al obtener documento',
            details: error.message
        });
    }
});

/**
 * POST /api/v1/users/:userId/documents
 * Crear nuevo documento
 */
router.post('/users/:userId/documents', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user;

        // Verificar que el usuario existe y pertenece a la empresa
        const user = await User.findOne({
            where: {
                user_id: userId,
                company_id: companyId
            }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Validación básica
        const { document_type } = req.body;
        if (!document_type) {
            return res.status(400).json({
                error: 'El tipo de documento es obligatorio'
            });
        }

        // Crear documento
        const document = await UserDocuments.create({
            user_id: userId,
            company_id: companyId,
            document_type: req.body.document_type,
            document_number: req.body.document_number || null,
            issue_date: req.body.issue_date || null,
            expiration_date: req.body.expiration_date || null,
            issuing_authority: req.body.issuing_authority || null,
            file_url: req.body.file_url || null,
            notes: req.body.notes || null,
            is_verified: req.body.is_verified || false
        });

        console.log(`📄 [DOCUMENTS] Nuevo documento creado: ${document.document_type} para user ${userId}`);

        res.status(201).json(document);

    } catch (error) {
        console.error('❌ Error creando documento:', error);
        res.status(500).json({
            error: 'Error al crear documento',
            details: error.message
        });
    }
});

/**
 * PUT /api/v1/users/:userId/documents/:documentId
 * Actualizar documento existente
 */
router.put('/users/:userId/documents/:documentId', authenticateToken, async (req, res) => {
    try {
        const { userId, documentId } = req.params;
        const { companyId } = req.user;

        const document = await UserDocuments.findOne({
            where: {
                id: documentId,
                user_id: userId,
                company_id: companyId
            }
        });

        if (!document) {
            return res.status(404).json({
                error: 'Documento no encontrado'
            });
        }

        // Actualizar campos permitidos
        const updateFields = [
            'document_type', 'document_number', 'issue_date', 'expiration_date',
            'issuing_authority', 'file_url', 'notes', 'is_verified'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                document[field] = req.body[field];
            }
        });

        await document.save();

        console.log(`📄 [DOCUMENTS] Documento actualizado: ${documentId}`);

        res.json(document);

    } catch (error) {
        console.error('❌ Error actualizando documento:', error);
        res.status(500).json({
            error: 'Error al actualizar documento',
            details: error.message
        });
    }
});

/**
 * DELETE /api/v1/users/:userId/documents/:documentId
 * Eliminar documento
 */
router.delete('/users/:userId/documents/:documentId', authenticateToken, async (req, res) => {
    try {
        const { userId, documentId } = req.params;
        const { companyId } = req.user;

        const document = await UserDocuments.findOne({
            where: {
                id: documentId,
                user_id: userId,
                company_id: companyId
            }
        });

        if (!document) {
            return res.status(404).json({
                error: 'Documento no encontrado'
            });
        }

        await document.destroy();

        console.log(`📄 [DOCUMENTS] Documento eliminado: ${documentId}`);

        res.json({
            success: true,
            message: 'Documento eliminado correctamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando documento:', error);
        res.status(500).json({
            error: 'Error al eliminar documento',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/documents/expiring
 * Obtener documentos que vencen pronto (para dashboard)
 */
router.get('/documents/expiring', authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const days = parseInt(req.query.days) || 30;

        const expiringDocuments = await UserDocuments.findAll({
            where: {
                company_id: companyId,
                expiration_date: {
                    [Op.and]: [
                        { [Op.ne]: null },
                        { [Op.lte]: new Date(Date.now() + days * 24 * 60 * 60 * 1000) },
                        { [Op.gt]: new Date() }
                    ]
                }
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['user_id', 'usuario', 'firstName', 'lastName', 'email']
            }],
            order: [['expiration_date', 'ASC']]
        });

        res.json(expiringDocuments);

    } catch (error) {
        console.error('❌ Error obteniendo documentos vencibles:', error);
        res.status(500).json({
            error: 'Error al obtener documentos vencibles',
            details: error.message
        });
    }
});

module.exports = router;
