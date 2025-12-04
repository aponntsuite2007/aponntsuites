/**
 * Medical Templates Routes
 * API para gestión de plantillas de exámenes médicos
 *
 * Endpoints:
 * - GET /api/medical-templates - Listar plantillas
 * - POST /api/medical-templates - Crear plantilla
 * - GET /api/medical-templates/:id - Obtener plantilla
 * - PUT /api/medical-templates/:id - Actualizar plantilla
 * - DELETE /api/medical-templates/:id - Desactivar plantilla
 * - GET /api/medical-templates/type/:examType - Por tipo de examen
 * - POST /api/medical-templates/:id/clone - Clonar plantilla global
 * - GET /api/medical-templates/global - Plantillas globales
 */

const express = require('express');
const router = express.Router();
const { auth: authMiddleware } = require('../middleware/auth');
const {
    MedicalExamTemplate,
    MedicalRecord,
    User,
    Company,
    sequelize
} = require('../config/database');
const { Op } = require('sequelize');

// Middleware de autenticación
router.use(authMiddleware);

// Helper para construir contexto
const buildContext = (req) => ({
    userId: req.user?.user_id || req.user?.id,
    companyId: req.user?.company_id,
    userName: req.user?.name || req.user?.username,
    userRole: req.user?.role
});

/**
 * GET /api/medical-templates
 * Listar todas las plantillas disponibles (empresa + globales)
 */
router.get('/', async (req, res) => {
    try {
        const context = buildContext(req);
        const { exam_type, active_only, include_global } = req.query;

        const where = {
            [Op.or]: [
                { company_id: context.companyId },
                { company_id: null } // Plantillas globales
            ]
        };

        if (active_only === 'true') {
            where.is_active = true;
        }

        if (exam_type) {
            where.exam_type = exam_type;
        }

        if (include_global === 'false') {
            where[Op.or] = [{ company_id: context.companyId }];
        }

        const templates = await MedicalExamTemplate.findAll({
            where,
            include: [{
                model: User,
                as: 'creator',
                attributes: ['user_id', 'firstName', 'lastName']
            }],
            order: [
                ['company_id', 'DESC NULLS LAST'], // Prioridad a plantillas de empresa
                ['exam_type', 'ASC'],
                ['template_name', 'ASC']
            ]
        });

        // Agregar conteo de registros por plantilla
        const templatesWithCounts = await Promise.all(
            templates.map(async (template) => {
                const recordCount = await MedicalRecord.count({
                    where: {
                        template_id: template.id,
                        company_id: context.companyId,
                        is_deleted: false
                    }
                });
                return {
                    ...template.toJSON(),
                    recordCount,
                    isGlobal: template.company_id === null
                };
            })
        );

        res.json({
            success: true,
            templates: templatesWithCounts,
            count: templates.length
        });

    } catch (error) {
        console.error('❌ [MEDICAL-TEMPLATES] Error en GET /:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al listar plantillas'
        });
    }
});

/**
 * GET /api/medical-templates/global
 * Obtener solo plantillas globales (base del sistema)
 */
router.get('/global', async (req, res) => {
    try {
        const templates = await MedicalExamTemplate.findAll({
            where: {
                company_id: null,
                is_active: true
            },
            order: [['exam_type', 'ASC'], ['template_name', 'ASC']]
        });

        res.json({
            success: true,
            templates: templates,
            count: templates.length
        });

    } catch (error) {
        console.error('❌ [MEDICAL-TEMPLATES] Error en GET /global:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener plantillas globales'
        });
    }
});

/**
 * GET /api/medical-templates/type/:examType
 * Obtener plantillas por tipo de examen
 */
router.get('/type/:examType', async (req, res) => {
    try {
        const context = buildContext(req);
        const { examType } = req.params;

        const validTypes = ['preocupacional', 'periodico', 'reingreso', 'retiro', 'especial'];
        if (!validTypes.includes(examType)) {
            return res.status(400).json({
                success: false,
                error: `Tipo de examen inválido. Válidos: ${validTypes.join(', ')}`
            });
        }

        const templates = await MedicalExamTemplate.findAll({
            where: {
                exam_type: examType,
                is_active: true,
                [Op.or]: [
                    { company_id: context.companyId },
                    { company_id: null }
                ]
            },
            order: [
                ['company_id', 'DESC NULLS LAST'],
                ['is_default', 'DESC'],
                ['template_name', 'ASC']
            ]
        });

        // Obtener default para este tipo
        const defaultTemplate = await MedicalExamTemplate.getDefaultForType(
            context.companyId,
            examType
        );

        res.json({
            success: true,
            examType,
            templates: templates,
            defaultTemplate: defaultTemplate,
            count: templates.length
        });

    } catch (error) {
        console.error('❌ [MEDICAL-TEMPLATES] Error en GET /type/:examType:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener plantillas por tipo'
        });
    }
});

/**
 * GET /api/medical-templates/:id
 * Obtener plantilla por ID
 */
router.get('/:id', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;

        const template = await MedicalExamTemplate.findOne({
            where: {
                id,
                [Op.or]: [
                    { company_id: context.companyId },
                    { company_id: null }
                ]
            },
            include: [{
                model: User,
                as: 'creator',
                attributes: ['user_id', 'firstName', 'lastName']
            }]
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla no encontrada'
            });
        }

        // Contar registros que usan esta plantilla
        const recordCount = await MedicalRecord.count({
            where: {
                template_id: template.id,
                company_id: context.companyId,
                is_deleted: false
            }
        });

        res.json({
            success: true,
            template: {
                ...template.toJSON(),
                recordCount,
                isGlobal: template.company_id === null
            }
        });

    } catch (error) {
        console.error('❌ [MEDICAL-TEMPLATES] Error en GET /:id:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener plantilla'
        });
    }
});

/**
 * POST /api/medical-templates
 * Crear nueva plantilla para la empresa
 */
router.post('/', async (req, res) => {
    try {
        const context = buildContext(req);
        const data = req.body;

        // Validaciones
        if (!data.template_name) {
            return res.status(400).json({
                success: false,
                error: 'template_name es requerido'
            });
        }

        if (!data.exam_type) {
            return res.status(400).json({
                success: false,
                error: 'exam_type es requerido'
            });
        }

        const validTypes = ['preocupacional', 'periodico', 'reingreso', 'retiro', 'especial'];
        if (!validTypes.includes(data.exam_type)) {
            return res.status(400).json({
                success: false,
                error: `exam_type debe ser uno de: ${validTypes.join(', ')}`
            });
        }

        // Si es default, quitar default de otras plantillas del mismo tipo
        if (data.is_default) {
            await MedicalExamTemplate.update(
                { is_default: false },
                {
                    where: {
                        company_id: context.companyId,
                        exam_type: data.exam_type,
                        is_default: true
                    }
                }
            );
        }

        const template = await MedicalExamTemplate.create({
            company_id: context.companyId,
            template_name: data.template_name,
            template_code: data.template_code || null,
            exam_type: data.exam_type,
            description: data.description,
            required_studies: data.required_studies || [],
            required_documents: data.required_documents || [],
            validity_days: data.validity_days || 365,
            reminder_days_before: data.reminder_days_before || 30,
            is_active: data.is_active !== false,
            is_default: data.is_default || false,
            created_by: context.userId
        });

        console.log(`✅ [MEDICAL-TEMPLATES] Plantilla creada: ID=${template.id}, Tipo=${data.exam_type}`);

        res.status(201).json({
            success: true,
            template: template,
            message: 'Plantilla creada exitosamente'
        });

    } catch (error) {
        console.error('❌ [MEDICAL-TEMPLATES] Error en POST /:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al crear plantilla'
        });
    }
});

/**
 * PUT /api/medical-templates/:id
 * Actualizar plantilla (solo las de la empresa)
 */
router.put('/:id', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const updates = req.body;

        const template = await MedicalExamTemplate.findOne({
            where: {
                id,
                company_id: context.companyId // Solo editable si es de la empresa
            }
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla no encontrada o no es editable (plantilla global)'
            });
        }

        // Campos actualizables
        const allowedFields = [
            'template_name', 'template_code', 'description',
            'required_studies', 'required_documents',
            'validity_days', 'reminder_days_before',
            'is_active', 'is_default'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                template[field] = updates[field];
            }
        }

        // Si se marca como default, quitar default de otras
        if (updates.is_default) {
            await MedicalExamTemplate.update(
                { is_default: false },
                {
                    where: {
                        company_id: context.companyId,
                        exam_type: template.exam_type,
                        id: { [Op.ne]: template.id },
                        is_default: true
                    }
                }
            );
        }

        await template.save();

        console.log(`✅ [MEDICAL-TEMPLATES] Plantilla actualizada: ID=${template.id}`);

        res.json({
            success: true,
            template: template,
            message: 'Plantilla actualizada exitosamente'
        });

    } catch (error) {
        console.error('❌ [MEDICAL-TEMPLATES] Error en PUT /:id:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar plantilla'
        });
    }
});

/**
 * DELETE /api/medical-templates/:id
 * Desactivar plantilla (soft delete)
 */
router.delete('/:id', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;

        const template = await MedicalExamTemplate.findOne({
            where: {
                id,
                company_id: context.companyId // Solo eliminable si es de la empresa
            }
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla no encontrada o no es eliminable (plantilla global)'
            });
        }

        // Verificar si hay registros usando esta plantilla
        const recordCount = await MedicalRecord.count({
            where: {
                template_id: template.id,
                is_deleted: false
            }
        });

        if (recordCount > 0) {
            // Solo desactivar, no eliminar
            template.is_active = false;
            template.is_default = false;
            await template.save();

            return res.json({
                success: true,
                message: `Plantilla desactivada (tiene ${recordCount} registros asociados)`,
                deactivated: true
            });
        }

        // Si no tiene registros, eliminar físicamente
        await template.destroy();

        console.log(`✅ [MEDICAL-TEMPLATES] Plantilla eliminada: ID=${id}`);

        res.json({
            success: true,
            message: 'Plantilla eliminada exitosamente'
        });

    } catch (error) {
        console.error('❌ [MEDICAL-TEMPLATES] Error en DELETE /:id:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al eliminar plantilla'
        });
    }
});

/**
 * POST /api/medical-templates/:id/clone
 * Clonar plantilla global para personalizarla
 */
router.post('/:id/clone', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const { new_name } = req.body;

        const original = await MedicalExamTemplate.findByPk(id);

        if (!original) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla original no encontrada'
            });
        }

        // Verificar si ya existe una clonación de esta plantilla
        const existingClone = await MedicalExamTemplate.findOne({
            where: {
                company_id: context.companyId,
                exam_type: original.exam_type,
                template_name: { [Op.like]: `%${original.template_name}%` }
            }
        });

        if (existingClone) {
            return res.status(400).json({
                success: false,
                error: 'Ya existe una plantilla personalizada para este tipo de examen',
                existingId: existingClone.id
            });
        }

        const cloned = await MedicalExamTemplate.create({
            company_id: context.companyId,
            template_name: new_name || `${original.template_name} (Personalizada)`,
            template_code: original.template_code ? `${original.template_code}-${context.companyId}` : null,
            exam_type: original.exam_type,
            description: original.description,
            required_studies: original.required_studies,
            required_documents: original.required_documents,
            validity_days: original.validity_days,
            reminder_days_before: original.reminder_days_before,
            is_active: true,
            is_default: false,
            created_by: context.userId
        });

        console.log(`✅ [MEDICAL-TEMPLATES] Plantilla clonada: Original=${id}, Nueva=${cloned.id}`);

        res.status(201).json({
            success: true,
            template: cloned,
            originalId: id,
            message: 'Plantilla clonada exitosamente. Ahora puede personalizarla.'
        });

    } catch (error) {
        console.error('❌ [MEDICAL-TEMPLATES] Error en POST /:id/clone:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al clonar plantilla'
        });
    }
});

/**
 * GET /api/medical-templates/:id/studies
 * Obtener estudios requeridos de una plantilla
 */
router.get('/:id/studies', async (req, res) => {
    try {
        const context = buildContext(req);
        const { id } = req.params;
        const { required_only } = req.query;

        const template = await MedicalExamTemplate.findOne({
            where: {
                id,
                [Op.or]: [
                    { company_id: context.companyId },
                    { company_id: null }
                ]
            }
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Plantilla no encontrada'
            });
        }

        let studies = template.required_studies || [];

        if (required_only === 'true') {
            studies = studies.filter(s => s.required === true);
        }

        res.json({
            success: true,
            templateId: parseInt(id),
            templateName: template.template_name,
            examType: template.exam_type,
            studies: studies,
            documents: template.required_documents || [],
            validityDays: template.validity_days
        });

    } catch (error) {
        console.error('❌ [MEDICAL-TEMPLATES] Error en GET /:id/studies:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener estudios'
        });
    }
});

module.exports = router;
