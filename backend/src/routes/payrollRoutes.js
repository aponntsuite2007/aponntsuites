/**
 * API Routes - Sistema de Liquidación Parametrizable v3.0
 * Multi-tenant, Multi-país, Multi-sucursal
 *
 * Endpoints:
 * - /api/payroll/countries - Gestión de países
 * - /api/payroll/branches - Gestión de sucursales
 * - /api/payroll/agreements - Gestión de convenios
 * - /api/payroll/concept-types - Tipos de conceptos
 * - /api/payroll/templates - Plantillas de liquidación
 * - /api/payroll/assignments - Asignaciones usuario-plantilla
 * - /api/payroll/bonuses - Bonificaciones adicionales
 * - /api/payroll/runs - Ejecuciones de liquidación
 * - /api/payroll/calculate - Cálculo de liquidación
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
    PayrollCountry,
    CompanyBranch,
    LaborAgreementV2,
    PayrollConceptType,
    PayrollTemplate,
    PayrollTemplateConcept,
    SalaryCategoryV2,
    UserPayrollAssignment,
    UserPayrollConceptOverride,
    UserPayrollBonus,
    PayrollRun,
    PayrollRunDetail,
    PayrollRunConceptDetail,
    Company,
    User,
    sequelize
} = require('../config/database');

const PayrollCalculatorService = require('../services/PayrollCalculatorService');

// Middleware para verificar autenticación
const verifyAuth = (req, res, next) => {
    // Por ahora simplificado - en producción verificar JWT
    const companyId = req.headers['x-company-id'] || req.query.company_id;
    const userId = req.headers['x-user-id'] || req.query.user_id;

    if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID required' });
    }

    req.companyId = parseInt(companyId);
    req.userId = userId;
    next();
};

router.use(verifyAuth);

// ============================================================================
// PAÍSES - /api/payroll/countries
// ============================================================================

/**
 * GET /api/payroll/countries
 * Lista todos los países disponibles
 */
router.get('/countries', async (req, res) => {
    try {
        const countries = await PayrollCountry.findAll({
            where: { is_active: true },
            order: [['country_name', 'ASC']]
        });

        res.json({
            success: true,
            data: countries
        });
    } catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/countries/:id
 * Obtiene detalles de un país
 */
router.get('/countries/:id', async (req, res) => {
    try {
        const country = await PayrollCountry.findByPk(req.params.id, {
            include: [
                { model: LaborAgreementV2, as: 'laborAgreements', where: { is_active: true }, required: false }
            ]
        });

        if (!country) {
            return res.status(404).json({ success: false, error: 'País no encontrado' });
        }

        res.json({ success: true, data: country });
    } catch (error) {
        console.error('Error fetching country:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SUCURSALES - /api/payroll/branches
// ============================================================================

/**
 * GET /api/payroll/branches
 * Lista sucursales de la empresa
 */
router.get('/branches', async (req, res) => {
    try {
        const branches = await CompanyBranch.findAll({
            where: {
                company_id: req.companyId,
                is_active: true
            },
            include: [
                { model: PayrollCountry, as: 'country' },
                { model: PayrollTemplate, as: 'defaultTemplate' }
            ],
            order: [['branch_name', 'ASC']]
        });

        res.json({ success: true, data: branches });
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/branches
 * Crea una nueva sucursal
 */
router.post('/branches', async (req, res) => {
    try {
        const branch = await CompanyBranch.create({
            ...req.body,
            company_id: req.companyId
        });

        res.status(201).json({ success: true, data: branch });
    } catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/payroll/branches/:id
 * Actualiza una sucursal
 */
router.put('/branches/:id', async (req, res) => {
    try {
        const branch = await CompanyBranch.findOne({
            where: { branch_id: req.params.id, company_id: req.companyId }
        });

        if (!branch) {
            return res.status(404).json({ success: false, error: 'Sucursal no encontrada' });
        }

        await branch.update(req.body);
        res.json({ success: true, data: branch });
    } catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CONVENIOS COLECTIVOS - /api/payroll/agreements
// ============================================================================

/**
 * GET /api/payroll/agreements
 * Lista convenios disponibles (filtrado por país)
 */
router.get('/agreements', async (req, res) => {
    try {
        const { country_id } = req.query;
        const where = { is_active: true };

        if (country_id) {
            where.country_id = country_id;
        }

        const agreements = await LaborAgreementV2.findAll({
            where,
            include: [
                { model: PayrollCountry, as: 'country' },
                { model: SalaryCategoryV2, as: 'categories', where: { is_active: true }, required: false }
            ],
            order: [['agreement_name', 'ASC']]
        });

        res.json({ success: true, data: agreements });
    } catch (error) {
        console.error('Error fetching agreements:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/agreements
 * Crea un nuevo convenio
 */
router.post('/agreements', async (req, res) => {
    try {
        const agreement = await LaborAgreementV2.create(req.body);
        res.status(201).json({ success: true, data: agreement });
    } catch (error) {
        console.error('Error creating agreement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// TIPOS DE CONCEPTOS - /api/payroll/concept-types
// ============================================================================

/**
 * GET /api/payroll/concept-types
 * Lista todos los tipos de conceptos de nómina
 */
router.get('/concept-types', async (req, res) => {
    try {
        const conceptTypes = await PayrollConceptType.findAll({
            order: [['display_order', 'ASC']]
        });

        res.json({ success: true, data: conceptTypes });
    } catch (error) {
        console.error('Error fetching concept types:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PLANTILLAS DE LIQUIDACIÓN - /api/payroll/templates
// ============================================================================

/**
 * GET /api/payroll/templates
 * Lista plantillas de la empresa
 */
router.get('/templates', async (req, res) => {
    try {
        const { country_id, branch_id, include_concepts } = req.query;
        const where = {
            company_id: req.companyId,
            is_active: true
        };

        if (country_id) where.country_id = country_id;

        const include = [
            { model: PayrollCountry, as: 'country' },
            { model: LaborAgreementV2, as: 'laborAgreement' }
        ];

        if (include_concepts === 'true') {
            include.push({
                model: PayrollTemplateConcept,
                as: 'concepts',
                where: { is_active: true },
                required: false,
                include: [{ model: PayrollConceptType, as: 'conceptType' }],
                order: [['display_order', 'ASC']]
            });
        }

        const templates = await PayrollTemplate.findAll({
            where,
            include,
            order: [['template_name', 'ASC']]
        });

        res.json({ success: true, data: templates });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/templates/:id
 * Obtiene detalle de una plantilla con sus conceptos
 */
router.get('/templates/:id', async (req, res) => {
    try {
        const template = await PayrollTemplate.findOne({
            where: {
                template_id: req.params.id,
                company_id: req.companyId
            },
            include: [
                { model: PayrollCountry, as: 'country' },
                { model: LaborAgreementV2, as: 'laborAgreement' },
                {
                    model: PayrollTemplateConcept,
                    as: 'concepts',
                    include: [{ model: PayrollConceptType, as: 'conceptType' }],
                    order: [['display_order', 'ASC']]
                }
            ]
        });

        if (!template) {
            return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/templates
 * Crea una nueva plantilla
 */
router.post('/templates', async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { concepts, ...templateData } = req.body;

        // Crear plantilla
        const template = await PayrollTemplate.create({
            ...templateData,
            company_id: req.companyId,
            created_by: req.userId
        }, { transaction });

        // Crear conceptos si se proporcionan
        if (concepts && concepts.length > 0) {
            const conceptsWithTemplateId = concepts.map((c, index) => ({
                ...c,
                template_id: template.template_id,
                display_order: c.display_order || (index + 1) * 10
            }));

            await PayrollTemplateConcept.bulkCreate(conceptsWithTemplateId, { transaction });
        }

        await transaction.commit();

        // Recargar con asociaciones
        const createdTemplate = await PayrollTemplate.findByPk(template.template_id, {
            include: [
                { model: PayrollCountry, as: 'country' },
                { model: PayrollTemplateConcept, as: 'concepts' }
            ]
        });

        res.status(201).json({ success: true, data: createdTemplate });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/payroll/templates/:id
 * Actualiza una plantilla
 */
router.put('/templates/:id', async (req, res) => {
    try {
        const template = await PayrollTemplate.findOne({
            where: { template_id: req.params.id, company_id: req.companyId }
        });

        if (!template) {
            return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
        }

        await template.update(req.body);
        res.json({ success: true, data: template });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/templates/:id/duplicate
 * Duplica una plantilla (para otra sucursal/país)
 */
router.post('/templates/:id/duplicate', async (req, res) => {
    try {
        const { new_name, new_country_id, new_branch_id } = req.body;

        // Usar función de PostgreSQL
        const [result] = await sequelize.query(
            'SELECT duplicate_payroll_template($1, $2, $3)',
            {
                bind: [req.params.id, req.companyId, new_name || null],
                type: sequelize.QueryTypes.SELECT
            }
        );

        const newTemplateId = result.duplicate_payroll_template;

        // Si se especifica nuevo país, actualizar
        if (new_country_id) {
            await PayrollTemplate.update(
                { country_id: new_country_id },
                { where: { template_id: newTemplateId } }
            );
        }

        const newTemplate = await PayrollTemplate.findByPk(newTemplateId, {
            include: [
                { model: PayrollCountry, as: 'country' },
                { model: PayrollTemplateConcept, as: 'concepts' }
            ]
        });

        res.status(201).json({ success: true, data: newTemplate });
    } catch (error) {
        console.error('Error duplicating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CONCEPTOS DE PLANTILLA - /api/payroll/templates/:id/concepts
// ============================================================================

/**
 * POST /api/payroll/templates/:templateId/concepts
 * Agrega un concepto a una plantilla
 */
router.post('/templates/:templateId/concepts', async (req, res) => {
    try {
        const template = await PayrollTemplate.findOne({
            where: { template_id: req.params.templateId, company_id: req.companyId }
        });

        if (!template) {
            return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
        }

        const concept = await PayrollTemplateConcept.create({
            ...req.body,
            template_id: req.params.templateId
        });

        res.status(201).json({ success: true, data: concept });
    } catch (error) {
        console.error('Error creating concept:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/payroll/concepts/:id
 * Actualiza un concepto
 */
router.put('/concepts/:id', async (req, res) => {
    try {
        const concept = await PayrollTemplateConcept.findByPk(req.params.id, {
            include: [{
                model: PayrollTemplate,
                as: 'template',
                where: { company_id: req.companyId }
            }]
        });

        if (!concept) {
            return res.status(404).json({ success: false, error: 'Concepto no encontrado' });
        }

        await concept.update(req.body);
        res.json({ success: true, data: concept });
    } catch (error) {
        console.error('Error updating concept:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/payroll/concepts/:id
 * Desactiva un concepto (soft delete)
 */
router.delete('/concepts/:id', async (req, res) => {
    try {
        const concept = await PayrollTemplateConcept.findByPk(req.params.id, {
            include: [{
                model: PayrollTemplate,
                as: 'template',
                where: { company_id: req.companyId }
            }]
        });

        if (!concept) {
            return res.status(404).json({ success: false, error: 'Concepto no encontrado' });
        }

        await concept.update({ is_active: false });
        res.json({ success: true, message: 'Concepto desactivado' });
    } catch (error) {
        console.error('Error deleting concept:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ASIGNACIONES USUARIO-PLANTILLA - /api/payroll/assignments
// ============================================================================

/**
 * GET /api/payroll/assignments
 * Lista asignaciones de usuarios a plantillas
 */
router.get('/assignments', async (req, res) => {
    try {
        const { user_id, branch_id, template_id } = req.query;
        const where = { is_active: true };

        if (user_id) where.user_id = user_id;
        if (branch_id) where.branch_id = branch_id;
        if (template_id) where.template_id = template_id;

        const assignments = await UserPayrollAssignment.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    where: { company_id: req.companyId },
                    attributes: ['user_id', 'firstName', 'lastName', 'email']
                },
                { model: PayrollTemplate, as: 'template' },
                { model: SalaryCategoryV2, as: 'category' },
                { model: CompanyBranch, as: 'branch' }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, data: assignments });
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/assignments
 * Asigna un usuario a una plantilla
 */
router.post('/assignments', async (req, res) => {
    try {
        // Verificar que el usuario pertenece a la empresa
        const user = await User.findOne({
            where: { user_id: req.body.user_id, company_id: req.companyId }
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        // Desactivar asignación anterior si existe
        await UserPayrollAssignment.update(
            { is_active: false, effective_to: new Date() },
            { where: { user_id: req.body.user_id, is_active: true } }
        );

        const assignment = await UserPayrollAssignment.create(req.body);

        res.status(201).json({ success: true, data: assignment });
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/payroll/assignments/:id
 * Actualiza asignación de usuario
 */
router.put('/assignments/:id', async (req, res) => {
    try {
        const assignment = await UserPayrollAssignment.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'user',
                where: { company_id: req.companyId }
            }]
        });

        if (!assignment) {
            return res.status(404).json({ success: false, error: 'Asignación no encontrada' });
        }

        await assignment.update(req.body);
        res.json({ success: true, data: assignment });
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// OVERRIDES DE CONCEPTOS - /api/payroll/overrides
// ============================================================================

/**
 * GET /api/payroll/overrides
 * Lista overrides de un usuario
 */
router.get('/overrides', async (req, res) => {
    try {
        const { assignment_id, user_id } = req.query;
        const where = { is_active: true };

        if (assignment_id) where.assignment_id = assignment_id;

        let include = [
            { model: PayrollTemplateConcept, as: 'concept' }
        ];

        // Si se pasa user_id, filtrar por usuario
        if (user_id) {
            include.push({
                model: UserPayrollAssignment,
                as: 'assignment',
                where: { user_id },
                include: [{
                    model: User,
                    as: 'user',
                    where: { company_id: req.companyId }
                }]
            });
        }

        const overrides = await UserPayrollConceptOverride.findAll({
            where,
            include
        });

        res.json({ success: true, data: overrides });
    } catch (error) {
        console.error('Error fetching overrides:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/overrides
 * Crea un override de concepto para un usuario
 */
router.post('/overrides', async (req, res) => {
    try {
        const override = await UserPayrollConceptOverride.create({
            ...req.body,
            approved_by: req.userId,
            approved_at: new Date()
        });

        res.status(201).json({ success: true, data: override });
    } catch (error) {
        console.error('Error creating override:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// BONIFICACIONES ADICIONALES - /api/payroll/bonuses
// ============================================================================

/**
 * GET /api/payroll/bonuses
 * Lista bonificaciones
 */
router.get('/bonuses', async (req, res) => {
    try {
        const { user_id, frequency } = req.query;
        const where = {
            company_id: req.companyId,
            is_active: true
        };

        if (user_id) where.user_id = user_id;
        if (frequency) where.frequency = frequency;

        const bonuses = await UserPayrollBonus.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['user_id', 'firstName', 'lastName']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, data: bonuses });
    } catch (error) {
        console.error('Error fetching bonuses:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/bonuses
 * Crea una bonificación
 */
router.post('/bonuses', async (req, res) => {
    try {
        const bonus = await UserPayrollBonus.create({
            ...req.body,
            company_id: req.companyId,
            approved_by: req.userId,
            approved_at: new Date()
        });

        res.status(201).json({ success: true, data: bonus });
    } catch (error) {
        console.error('Error creating bonus:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/payroll/bonuses/:id
 * Actualiza bonificación
 */
router.put('/bonuses/:id', async (req, res) => {
    try {
        const bonus = await UserPayrollBonus.findOne({
            where: { bonus_id: req.params.id, company_id: req.companyId }
        });

        if (!bonus) {
            return res.status(404).json({ success: false, error: 'Bonificación no encontrada' });
        }

        await bonus.update(req.body);
        res.json({ success: true, data: bonus });
    } catch (error) {
        console.error('Error updating bonus:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CÁLCULO DE LIQUIDACIÓN - /api/payroll/calculate
// ============================================================================

/**
 * POST /api/payroll/calculate/preview
 * Previsualización de liquidación (sin guardar)
 */
router.post('/calculate/preview', async (req, res) => {
    try {
        const { user_id, year, month } = req.body;

        if (!user_id || !year || !month) {
            return res.status(400).json({
                success: false,
                error: 'user_id, year y month son requeridos'
            });
        }

        const calculator = new PayrollCalculatorService();
        const result = await calculator.calculatePayroll(
            user_id,
            req.companyId,
            year,
            month,
            { preview: true }
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error calculating preview:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/calculate/single
 * Calcula y guarda liquidación de un empleado
 */
router.post('/calculate/single', async (req, res) => {
    try {
        const { user_id, year, month, branch_id } = req.body;

        if (!user_id || !year || !month) {
            return res.status(400).json({
                success: false,
                error: 'user_id, year y month son requeridos'
            });
        }

        const calculator = new PayrollCalculatorService();
        const result = await calculator.calculatePayroll(
            user_id,
            req.companyId,
            year,
            month,
            { preview: false }
        );

        // Guardar en PayrollRun
        const savedRun = await calculator.savePayrollRun(
            result,
            req.companyId,
            branch_id,
            req.userId
        );

        res.json({ success: true, data: { calculation: result, run: savedRun } });
    } catch (error) {
        console.error('Error calculating single payroll:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/calculate/bulk
 * Calcula liquidación masiva de todos los empleados
 */
router.post('/calculate/bulk', async (req, res) => {
    try {
        const { year, month, branch_id } = req.body;

        if (!year || !month) {
            return res.status(400).json({
                success: false,
                error: 'year y month son requeridos'
            });
        }

        const calculator = new PayrollCalculatorService();
        const result = await calculator.calculateBulkPayroll(
            req.companyId,
            branch_id,
            year,
            month,
            req.userId
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error calculating bulk payroll:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// EJECUCIONES DE LIQUIDACIÓN - /api/payroll/runs
// ============================================================================

/**
 * GET /api/payroll/runs
 * Lista ejecuciones de liquidación
 */
router.get('/runs', async (req, res) => {
    try {
        const { year, month, status, branch_id } = req.query;
        const where = { company_id: req.companyId };

        if (year) where.period_year = year;
        if (month) where.period_month = month;
        if (status) where.status = status;
        if (branch_id) where.branch_id = branch_id;

        const runs = await PayrollRun.findAll({
            where,
            include: [
                { model: CompanyBranch, as: 'branch' },
                { model: PayrollTemplate, as: 'template' },
                { model: User, as: 'creator', attributes: ['firstName', 'lastName'] },
                { model: User, as: 'approver', attributes: ['firstName', 'lastName'] }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, data: runs });
    } catch (error) {
        console.error('Error fetching runs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/runs/:id
 * Obtiene detalle de una ejecución con todos los empleados
 */
router.get('/runs/:id', async (req, res) => {
    try {
        const run = await PayrollRun.findOne({
            where: { run_id: req.params.id, company_id: req.companyId },
            include: [
                { model: CompanyBranch, as: 'branch' },
                { model: PayrollTemplate, as: 'template' },
                {
                    model: PayrollRunDetail,
                    as: 'details',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['user_id', 'firstName', 'lastName', 'email']
                        },
                        {
                            model: PayrollRunConceptDetail,
                            as: 'concepts',
                            order: [['display_order', 'ASC']]
                        }
                    ]
                }
            ]
        });

        if (!run) {
            return res.status(404).json({ success: false, error: 'Ejecución no encontrada' });
        }

        res.json({ success: true, data: run });
    } catch (error) {
        console.error('Error fetching run:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/payroll/runs/:id/approve
 * Aprueba una ejecución de liquidación
 */
router.put('/runs/:id/approve', async (req, res) => {
    try {
        const run = await PayrollRun.findOne({
            where: { run_id: req.params.id, company_id: req.companyId }
        });

        if (!run) {
            return res.status(404).json({ success: false, error: 'Ejecución no encontrada' });
        }

        if (run.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden aprobar liquidaciones completadas'
            });
        }

        await run.update({
            status: 'approved',
            approved_by: req.userId,
            approved_at: new Date()
        });

        res.json({ success: true, data: run });
    } catch (error) {
        console.error('Error approving run:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/payroll/runs/:id/pay
 * Marca como pagada una ejecución
 */
router.put('/runs/:id/pay', async (req, res) => {
    try {
        const run = await PayrollRun.findOne({
            where: { run_id: req.params.id, company_id: req.companyId }
        });

        if (!run) {
            return res.status(404).json({ success: false, error: 'Ejecución no encontrada' });
        }

        if (run.status !== 'approved') {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden pagar liquidaciones aprobadas'
            });
        }

        await run.update({
            status: 'paid',
            pay_date: req.body.pay_date || new Date()
        });

        res.json({ success: true, data: run });
    } catch (error) {
        console.error('Error marking as paid:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/runs/:runId/details/:userId
 * Obtiene recibo de sueldo de un empleado
 */
router.get('/runs/:runId/details/:userId', async (req, res) => {
    try {
        const detail = await PayrollRunDetail.findOne({
            where: {
                run_id: req.params.runId,
                user_id: req.params.userId
            },
            include: [
                {
                    model: PayrollRun,
                    as: 'payrollRun',
                    where: { company_id: req.companyId },
                    include: [
                        { model: CompanyBranch, as: 'branch' },
                        { model: PayrollTemplate, as: 'template' }
                    ]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['user_id', 'firstName', 'lastName', 'email', 'dni']
                },
                {
                    model: PayrollRunConceptDetail,
                    as: 'concepts',
                    order: [['display_order', 'ASC']]
                }
            ]
        });

        if (!detail) {
            return res.status(404).json({ success: false, error: 'Detalle no encontrado' });
        }

        res.json({ success: true, data: detail });
    } catch (error) {
        console.error('Error fetching detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CATEGORÍAS SALARIALES - /api/payroll/categories
// ============================================================================

/**
 * GET /api/payroll/categories
 * Lista categorías salariales por convenio
 */
router.get('/categories', async (req, res) => {
    try {
        const { agreement_id } = req.query;
        const where = { is_active: true };

        if (agreement_id) where.agreement_id = agreement_id;

        const categories = await SalaryCategoryV2.findAll({
            where,
            include: [
                { model: LaborAgreementV2, as: 'laborAgreement' }
            ],
            order: [['category_code', 'ASC']]
        });

        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/categories
 * Crea categoría salarial
 */
router.post('/categories', async (req, res) => {
    try {
        const category = await SalaryCategoryV2.create(req.body);
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// REPORTES Y ESTADÍSTICAS - /api/payroll/reports
// ============================================================================

/**
 * GET /api/payroll/reports/summary
 * Resumen de liquidaciones por período
 */
router.get('/reports/summary', async (req, res) => {
    try {
        const { year, month } = req.query;

        const [summary] = await sequelize.query(`
            SELECT
                COUNT(DISTINCT pr.run_id) as total_runs,
                COUNT(DISTINCT prd.user_id) as total_employees,
                SUM(prd.gross_salary) as total_gross,
                SUM(prd.total_deductions) as total_deductions,
                SUM(prd.net_salary) as total_net,
                SUM(prd.employer_cost) as total_employer_cost,
                pr.status
            FROM payroll_runs pr
            LEFT JOIN payroll_run_details prd ON pr.run_id = prd.run_id
            WHERE pr.company_id = :companyId
            ${year ? 'AND pr.period_year = :year' : ''}
            ${month ? 'AND pr.period_month = :month' : ''}
            GROUP BY pr.status
        `, {
            replacements: { companyId: req.companyId, year, month },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/reports/by-concept
 * Reporte por concepto
 */
router.get('/reports/by-concept', async (req, res) => {
    try {
        const { run_id, year, month } = req.query;

        let whereClause = 'pr.company_id = :companyId';
        if (run_id) whereClause += ' AND pr.run_id = :runId';
        if (year) whereClause += ' AND pr.period_year = :year';
        if (month) whereClause += ' AND pr.period_month = :month';

        const [report] = await sequelize.query(`
            SELECT
                prcd.concept_code,
                prcd.concept_name,
                prcd.concept_type,
                COUNT(*) as employee_count,
                SUM(prcd.calculated_amount) as total_amount,
                AVG(prcd.calculated_amount) as avg_amount,
                MIN(prcd.calculated_amount) as min_amount,
                MAX(prcd.calculated_amount) as max_amount
            FROM payroll_run_concept_details prcd
            JOIN payroll_run_details prd ON prcd.detail_id = prd.detail_id
            JOIN payroll_runs pr ON prd.run_id = pr.run_id
            WHERE ${whereClause}
            GROUP BY prcd.concept_code, prcd.concept_name, prcd.concept_type
            ORDER BY prcd.concept_type, total_amount DESC
        `, {
            replacements: { companyId: req.companyId, runId: run_id, year, month },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Error fetching concept report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENTIDADES Y LIQUIDACIONES CONSOLIDADAS
// ============================================================================

// GET /entities - Listar entidades (por pais o company)
router.get('/entities', async (req, res) => {
    try {
        const { country_id, entity_type, include_global = 'true' } = req.query;

        let whereClause = 'WHERE 1=1';
        const replacements = { companyId: req.companyId };

        if (country_id) {
            whereClause += ' AND pe.country_id = :countryId';
            replacements.countryId = country_id;
        }

        if (entity_type) {
            whereClause += ' AND pe.entity_type = :entityType';
            replacements.entityType = entity_type;
        }

        if (include_global === 'true') {
            whereClause += ' AND (pe.company_id IS NULL OR pe.company_id = :companyId)';
        } else {
            whereClause += ' AND pe.company_id = :companyId';
        }

        whereClause += ' AND pe.is_active = true';

        const entities = await sequelize.query(`
            SELECT pe.*, pc.country_code, pc.country_name
            FROM payroll_entities pe
            LEFT JOIN payroll_countries pc ON pe.country_id = pc.id
            ${whereClause}
            ORDER BY pc.country_code, pe.entity_type, pe.entity_name
        `, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: entities });
    } catch (error) {
        console.error('Error fetching entities:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /entities/:id - Obtener entidad por ID
router.get('/entities/:id', async (req, res) => {
    try {
        const { PayrollEntity } = require('../config/database');
        const entity = await PayrollEntity.findByPk(req.params.id);
        if (!entity) {
            return res.status(404).json({ success: false, error: 'Entidad no encontrada' });
        }
        res.json({ success: true, data: entity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /entities - Crear entidad custom de la empresa
router.post('/entities', async (req, res) => {
    try {
        const { PayrollEntity } = require('../config/database');
        const entity = await PayrollEntity.create({
            ...req.body,
            company_id: req.companyId
        });
        res.status(201).json({ success: true, data: entity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /entities/:id - Actualizar entidad
router.put('/entities/:id', async (req, res) => {
    try {
        const { PayrollEntity } = require('../config/database');
        const entity = await PayrollEntity.findOne({
            where: { entity_id: req.params.id, company_id: req.companyId }
        });
        if (!entity) {
            return res.status(404).json({ success: false, error: 'Entidad no encontrada o no pertenece a su empresa' });
        }
        await entity.update(req.body);
        res.json({ success: true, data: entity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// LIQUIDACIONES CONSOLIDADAS POR ENTIDAD
// ============================================================================

// POST /entity-settlements/generate - Generar liquidacion consolidada
router.post('/entity-settlements/generate', async (req, res) => {
    try {
        const { run_id, entity_ids } = req.body;

        if (!run_id || !entity_ids || !entity_ids.length) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere run_id y al menos una entity_id'
            });
        }

        const settlements = [];
        for (const entity_id of entity_ids) {
            const [[result]] = await sequelize.query(`
                SELECT generate_entity_settlement(:companyId, :entityId, :runId, :userId) as settlement_id
            `, {
                replacements: {
                    companyId: req.companyId,
                    entityId: entity_id,
                    runId: run_id,
                    userId: req.userId
                }
            });

            if (result && result.settlement_id) {
                const [settlement] = await sequelize.query(`
                    SELECT * FROM v_entity_settlements_summary WHERE settlement_id = :settlementId
                `, { replacements: { settlementId: result.settlement_id }, type: sequelize.QueryTypes.SELECT });
                settlements.push(settlement);
            }
        }

        res.json({ success: true, data: settlements });
    } catch (error) {
        console.error('Error generating entity settlements:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /entity-settlements - Listar liquidaciones consolidadas
router.get('/entity-settlements', async (req, res) => {
    try {
        const { year, month, entity_id, status } = req.query;

        let whereClause = 'WHERE company_id = :companyId';
        const replacements = { companyId: req.companyId };

        if (year) {
            whereClause += ' AND period_year = :year';
            replacements.year = year;
        }
        if (month) {
            whereClause += ' AND period_month = :month';
            replacements.month = month;
        }
        if (entity_id) {
            whereClause += ' AND entity_id = :entityId';
            replacements.entityId = entity_id;
        }
        if (status) {
            whereClause += ' AND status = :status';
            replacements.status = status;
        }

        const settlements = await sequelize.query(`
            SELECT * FROM v_entity_settlements_summary
            ${whereClause}
            ORDER BY period_year DESC, period_month DESC, entity_name
        `, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: settlements });
    } catch (error) {
        console.error('Error fetching entity settlements:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /entity-settlements/:id - Obtener detalle de liquidacion
router.get('/entity-settlements/:id', async (req, res) => {
    try {
        const { PayrollEntitySettlement, PayrollEntitySettlementDetail, PayrollEntity, User } = require('../config/database');

        const settlement = await PayrollEntitySettlement.findOne({
            where: { settlement_id: req.params.id, company_id: req.companyId },
            include: [
                { model: PayrollEntity, as: 'entity' },
                {
                    model: PayrollEntitySettlementDetail,
                    as: 'details',
                    include: [{ model: User, as: 'user', attributes: ['user_id', 'firstName', 'lastName', 'dni', 'employee_code'] }]
                }
            ]
        });

        if (!settlement) {
            return res.status(404).json({ success: false, error: 'Liquidacion no encontrada' });
        }

        res.json({ success: true, data: settlement });
    } catch (error) {
        console.error('Error fetching settlement detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /entity-settlements/:id/status - Actualizar estado
router.put('/entity-settlements/:id/status', async (req, res) => {
    try {
        const { PayrollEntitySettlement } = require('../config/database');
        const { status, notes, payment_reference, payment_date, payment_method } = req.body;

        const settlement = await PayrollEntitySettlement.findOne({
            where: { settlement_id: req.params.id, company_id: req.companyId }
        });

        if (!settlement) {
            return res.status(404).json({ success: false, error: 'Liquidacion no encontrada' });
        }

        const updateData = { status };
        const now = new Date();

        switch (status) {
            case 'reviewed':
                updateData.reviewed_at = now;
                updateData.reviewed_by = req.userId;
                break;
            case 'approved':
                updateData.approved_at = now;
                updateData.approved_by = req.userId;
                break;
            case 'submitted':
                updateData.submitted_at = now;
                break;
            case 'paid':
                updateData.paid_at = now;
                updateData.payment_reference = payment_reference;
                updateData.payment_date = payment_date;
                updateData.payment_method = payment_method;
                break;
        }

        if (notes) updateData.notes = notes;

        await settlement.update(updateData);
        res.json({ success: true, data: settlement });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PLANTILLAS DE RECIBOS DE SUELDO
// ============================================================================

// GET /payslip-templates - Listar plantillas
router.get('/payslip-templates', async (req, res) => {
    try {
        const { PayrollPayslipTemplate } = require('../config/database');
        const { Op } = require('sequelize');

        const templates = await PayrollPayslipTemplate.findAll({
            where: {
                [Op.or]: [
                    { company_id: null },
                    { company_id: req.companyId }
                ]
            },
            order: [['is_default', 'DESC'], ['template_name', 'ASC']]
        });

        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /payslip-templates/:id
router.get('/payslip-templates/:id', async (req, res) => {
    try {
        const { PayrollPayslipTemplate } = require('../config/database');
        const template = await PayrollPayslipTemplate.findByPk(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
        }
        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /payslip-templates
router.post('/payslip-templates', async (req, res) => {
    try {
        const { PayrollPayslipTemplate } = require('../config/database');
        const template = await PayrollPayslipTemplate.create({
            ...req.body,
            company_id: req.companyId,
            created_by: req.userId,
            is_default: false
        });
        res.status(201).json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /payslip-templates/:id
router.put('/payslip-templates/:id', async (req, res) => {
    try {
        const { PayrollPayslipTemplate } = require('../config/database');
        const template = await PayrollPayslipTemplate.findOne({
            where: { template_id: req.params.id, company_id: req.companyId }
        });
        if (!template) {
            return res.status(404).json({ success: false, error: 'Plantilla no encontrada o no pertenece a su empresa' });
        }
        await template.update(req.body);
        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /payslip/generate - Generar recibo de sueldo HTML
router.post('/payslip/generate', async (req, res) => {
    try {
        const { run_detail_id, template_id } = req.body;

        // Obtener datos del detalle
        const [runDetail] = await sequelize.query(`
            SELECT
                prd.*,
                pr.period_year, pr.period_month, pr.period_start, pr.period_end, pr.payment_date,
                u."firstName", u."lastName", u.dni, u.employee_code, u.hire_date,
                d.name as department_name,
                c.name as company_name, c.legal_name as company_legal_name, c.tax_id as company_tax_id,
                c.address as company_address, c.logo_url as company_logo_url
            FROM payroll_run_details prd
            JOIN payroll_runs pr ON prd.run_id = pr.id
            JOIN users u ON prd.user_id = u.user_id
            LEFT JOIN departments d ON u."departmentId" = d.id
            JOIN companies c ON pr.company_id = c.company_id
            WHERE prd.id = :runDetailId AND pr.company_id = :companyId
        `, {
            replacements: { runDetailId: run_detail_id, companyId: req.companyId },
            type: sequelize.QueryTypes.SELECT
        });

        if (!runDetail.length) {
            return res.status(404).json({ success: false, error: 'Detalle de nomina no encontrado' });
        }

        // Obtener plantilla
        const { PayrollPayslipTemplate } = require('../config/database');
        let template;
        if (template_id) {
            template = await PayrollPayslipTemplate.findByPk(template_id);
        } else {
            template = await PayrollPayslipTemplate.findOne({ where: { is_default: true, is_active: true } });
        }

        if (!template) {
            return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
        }

        // Obtener conceptos
        const concepts = await sequelize.query(`
            SELECT prcd.*, pct.affects_gross, pct.is_deduction, pct.is_employer_cost
            FROM payroll_run_concept_details prcd
            JOIN payroll_concept_types pct ON prcd.concept_type_id = pct.id
            WHERE prcd.run_detail_id = :runDetailId
            ORDER BY pct.display_order, prcd.concept_name
        `, {
            replacements: { runDetailId: run_detail_id },
            type: sequelize.QueryTypes.SELECT
        });

        const detail = runDetail[0];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const payslipData = {
            company: {
                name: detail.company_name,
                legal_name: detail.company_legal_name,
                tax_id: detail.company_tax_id,
                address: detail.company_address,
                logo_url: detail.company_logo_url
            },
            period: {
                year: detail.period_year,
                month: detail.period_month,
                month_name: monthNames[detail.period_month - 1],
                start: detail.period_start,
                end: detail.period_end
            },
            employee: {
                full_name: `${detail.firstName} ${detail.lastName}`,
                tax_id: detail.dni,
                code: detail.employee_code,
                hire_date: detail.hire_date,
                department: detail.department_name
            },
            concepts: concepts.map(c => ({
                code: c.concept_code,
                name: c.concept_name,
                quantity: c.quantity || '',
                amount: parseFloat(c.calculated_amount || 0).toFixed(2),
                is_earning: !c.is_deduction && !c.is_employer_cost,
                is_deduction: c.is_deduction && !c.is_employer_cost
            })),
            totals: {
                gross_remunerative: parseFloat(detail.gross_earnings || 0).toFixed(2),
                non_remunerative: parseFloat(detail.non_remunerative || 0).toFixed(2),
                deductions: parseFloat(detail.total_deductions || 0).toFixed(2),
                net_salary: parseFloat(detail.net_salary || 0).toFixed(2),
                employer_cost: parseFloat(detail.employer_contributions || 0).toFixed(2)
            },
            legal_disclaimer: template.legal_disclaimer,
            generation_date: new Date().toLocaleDateString('es-AR')
        };

        res.json({ success: true, data: payslipData, template_html: {
            header: template.header_html,
            body: template.body_html,
            footer: template.footer_html,
            css: template.styles_css
        }});
    } catch (error) {
        console.error('Error generating payslip:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
