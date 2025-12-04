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
    OrganizationalPosition,
    PayrollPayslipTemplate,
    sequelize
} = require('../config/database');

const PayrollCalculatorService = require('../services/PayrollCalculatorService');
const jwt = require('jsonwebtoken');

// Middleware para verificar autenticación (soporta JWT y headers x-company-id)
const verifyAuth = (req, res, next) => {
    let companyId = req.headers['x-company-id'] || req.query.company_id;
    let userId = req.headers['x-user-id'] || req.query.user_id;

    // También soportar JWT en Authorization header
    const authHeader = req.headers['authorization'];
    if (!companyId && authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            companyId = decoded.companyId || decoded.company_id;
            userId = decoded.id || decoded.userId;
        } catch (err) {
            // Token inválido - continuar sin él
        }
    }

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
                { model: PayrollCountry, as: 'country' }
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
 * Lista todos los tipos de conceptos de nómina con clasificación y ayuda contextual
 *
 * Query params:
 *   - locale: Idioma para nombres localizados (es, en, pt) default: es
 *   - country_id: Filtrar por país
 *   - classification: Filtrar por clasificación (GROSS_EARNING, EMPLOYEE_DEDUCTION, etc.)
 *   - include_rates: Incluir tasas por país (true/false)
 */
router.get('/concept-types', async (req, res) => {
    try {
        const { locale = 'es', country_id, classification, include_rates } = req.query;

        // Query con clasificación y toda la info de ayuda
        const conceptTypes = await sequelize.query(`
            SELECT
                pct.id,
                pct.type_code,
                pct.type_name,
                COALESCE(pct.names_by_locale->>:locale, pct.type_name) as display_name,
                pct.description,
                pct.classification_id,
                pcc.classification_code,
                pcc.classification_name,
                COALESCE(pcc.descriptions->>:locale, pcc.descriptions->>'en') as classification_description,
                pcc.sign as monetary_sign,
                pcc.affects_employee_net,
                pcc.affects_employer_cost,

                -- Comportamiento
                pct.is_remunerative,
                pct.is_taxable,
                pct.is_pre_tax,
                pct.is_mandatory,
                pct.is_social_security_base,
                pct.is_proportional_to_time,
                pct.is_one_time,

                -- Legacy (para compatibilidad)
                pct.is_deduction,
                pct.is_employer_cost,
                pct.affects_gross,
                pct.affects_net,

                -- Tasas por defecto
                pct.default_employee_rate,
                pct.default_employer_rate,
                pct.rate_ceiling,
                pct.calculation_base_type,

                -- Ayuda contextual
                pct.help_tooltip,
                pct.help_detailed,
                pct.legal_reference,
                pct.examples_by_country,

                -- UI
                pct.icon_name,
                pct.color_hex,
                pct.names_by_locale,
                pct.display_order,
                pct.is_active

            FROM payroll_concept_types pct
            LEFT JOIN payroll_concept_classifications pcc ON pct.classification_id = pcc.id
            WHERE pct.is_active = true
            ${country_id ? 'AND (pct.country_id IS NULL OR pct.country_id = :countryId)' : ''}
            ${classification ? 'AND pcc.classification_code = :classification' : ''}
            ORDER BY pcc.calculation_order, pct.display_order
        `, {
            replacements: { locale, countryId: country_id, classification },
            type: sequelize.QueryTypes.SELECT
        });

        // Si se piden tasas por país, agregarlas
        let ratesByCountry = null;
        if (include_rates === 'true' && country_id) {
            const rates = await sequelize.query(`
                SELECT
                    pctr.concept_type_id,
                    pctr.employee_rate,
                    pctr.employer_rate,
                    pctr.rate_ceiling,
                    pctr.calculation_base,
                    pctr.help_text as country_help,
                    pctr.legal_reference as country_legal_reference
                FROM payroll_concept_type_rates pctr
                WHERE pctr.country_id = :countryId
                AND pctr.is_active = true
                AND CURRENT_DATE BETWEEN pctr.effective_from AND COALESCE(pctr.effective_to, '9999-12-31')
            `, {
                replacements: { countryId: country_id },
                type: sequelize.QueryTypes.SELECT
            });

            ratesByCountry = {};
            rates.forEach(r => {
                ratesByCountry[r.concept_type_id] = r;
            });
        }

        // Enriquecer con tasas si están disponibles
        const enrichedTypes = conceptTypes.map(ct => {
            const type = { ...ct };
            if (ratesByCountry && ratesByCountry[ct.id]) {
                const countryRate = ratesByCountry[ct.id];
                type.employee_rate = countryRate.employee_rate || type.default_employee_rate;
                type.employer_rate = countryRate.employer_rate || type.default_employer_rate;
                type.country_help = countryRate.country_help;
                type.country_legal_reference = countryRate.country_legal_reference;
            } else {
                type.employee_rate = type.default_employee_rate;
                type.employer_rate = type.default_employer_rate;
            }
            return type;
        });

        res.json({
            success: true,
            data: enrichedTypes,
            meta: {
                locale,
                country_id: country_id || null,
                total: enrichedTypes.length
            }
        });
    } catch (error) {
        console.error('Error fetching concept types:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/concept-classifications
 * Lista las 4 clasificaciones base universales
 */
router.get('/concept-classifications', async (req, res) => {
    try {
        const { locale = 'es' } = req.query;

        const classifications = await sequelize.query(`
            SELECT
                id,
                classification_code,
                classification_name,
                COALESCE(descriptions->>:locale, descriptions->>'en') as description,
                sign,
                affects_employee_net,
                affects_employer_cost,
                calculation_order,
                is_system
            FROM payroll_concept_classifications
            ORDER BY calculation_order
        `, {
            replacements: { locale },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: classifications,
            help: {
                GROSS_EARNING: 'Conceptos que suman al bruto del empleado (salario, bonos, etc.)',
                EMPLOYEE_DEDUCTION: 'Descuentos del sueldo del empleado (jubilación, salud, impuestos)',
                EMPLOYER_CONTRIBUTION: 'Aportes del empleador (no afectan el sueldo del empleado)',
                INFORMATIVE: 'Conceptos informativos sin efecto monetario'
            }
        });
    } catch (error) {
        console.error('Error fetching classifications:', error);
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
            // RESTAURADO: FK correcto es labor_agreement_id
            { model: LaborAgreementV2, as: 'laborAgreement', required: false }
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
                id: req.params.id,
                company_id: req.companyId
            },
            include: [
                { model: PayrollCountry, as: 'country' },
                { model: LaborAgreementV2, as: 'laborAgreement', required: false },
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
                template_id: template.id,
                display_order: c.display_order || (index + 1) * 10
            }));

            await PayrollTemplateConcept.bulkCreate(conceptsWithTemplateId, { transaction });
        }

        await transaction.commit();

        // Recargar con asociaciones
        const createdTemplate = await PayrollTemplate.findByPk(template.id, {
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
            where: { id: req.params.id, company_id: req.companyId }
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
            where: { id: req.params.templateId, company_id: req.companyId }
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
 * GET /api/payroll/runs/summary
 * Resumen de liquidaciones para el dashboard (KPIs)
 */
router.get('/runs/summary', async (req, res) => {
    try {
        const { year, month, branch_id } = req.query;
        const currentYear = year || new Date().getFullYear();
        const currentMonth = month || new Date().getMonth() + 1;

        // Obtener datos de payroll_runs para el periodo
        const runData = await sequelize.query(`
            SELECT
                COALESCE(SUM(total_employees), 0) as total_employees,
                COALESCE(SUM(total_gross), 0) as total_gross,
                COALESCE(SUM(total_net), 0) as total_net,
                COALESCE(SUM(total_deductions), 0) as total_deductions,
                COALESCE(SUM(total_employer_cost), 0) as total_employer_cost,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as pending,
                COUNT(CASE WHEN status IN ('completed', 'approved', 'paid') THEN 1 END) as processed,
                COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
            FROM payroll_runs
            WHERE company_id = :companyId
            AND period_year = :year
            AND period_month = :month
            ${branch_id ? 'AND branch_id = :branchId' : ''}
        `, {
            replacements: {
                companyId: req.companyId,
                year: currentYear,
                month: currentMonth,
                branchId: branch_id
            },
            type: sequelize.QueryTypes.SELECT
        });

        // Si no hay payroll_runs o total_employees es 0, obtener datos de user_salary_config_v2
        if (!runData || !runData.length || parseInt(runData[0].total_employees) === 0) {
            const salaryData = await sequelize.query(`
                SELECT
                    COUNT(*) as total_employees,
                    COALESCE(SUM(base_salary::numeric), 0) as total_gross,
                    COALESCE(SUM(base_salary::numeric * 0.83), 0) as total_net
                FROM user_salary_config_v2
                WHERE company_id = :companyId AND is_current = true
            `, {
                replacements: { companyId: req.companyId },
                type: sequelize.QueryTypes.SELECT
            });

            return res.json({
                success: true,
                data: {
                    total_employees: parseInt(salaryData[0]?.total_employees || 0),
                    processed: 0,
                    pending: parseInt(salaryData[0]?.total_employees || 0),
                    errors: 0,
                    total_gross: parseFloat(salaryData[0]?.total_gross || 0),
                    total_net: parseFloat(salaryData[0]?.total_net || 0),
                    period: { year: currentYear, month: currentMonth }
                }
            });
        }

        res.json({
            success: true,
            data: {
                total_employees: parseInt(runData[0].total_employees || 0),
                processed: parseInt(runData[0].processed || 0),
                pending: parseInt(runData[0].pending || 0),
                errors: parseInt(runData[0].errors || 0),
                total_gross: parseFloat(runData[0].total_gross || 0),
                total_net: parseFloat(runData[0].total_net || 0),
                total_deductions: parseFloat(runData[0].total_deductions || 0),
                total_employer_cost: parseFloat(runData[0].total_employer_cost || 0),
                period: { year: currentYear, month: currentMonth }
            }
        });
    } catch (error) {
        console.error('Error fetching runs summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/runs/details
 * Detalle de empleados para una liquidación (usado por la tabla de empleados)
 */
router.get('/runs/details', async (req, res) => {
    try {
        const { year, month, branch_id } = req.query;
        const currentYear = year || new Date().getFullYear();
        const currentMonth = month || new Date().getMonth() + 1;

        // Obtener empleados con sus configuraciones salariales
        const employees = await sequelize.query(`
            SELECT
                u.user_id as id,
                u."firstName",
                u."lastName",
                u.dni as employee_code,
                d.name as department_name,
                pt.template_name,
                usc.base_salary as gross_earnings,
                usc.base_salary * 0.17 as total_deductions,
                usc.base_salary * 0.83 as net_salary,
                CASE
                    WHEN pr.id IS NOT NULL AND pr.status = 'paid' THEN 'paid'
                    WHEN pr.id IS NOT NULL AND pr.status = 'approved' THEN 'approved'
                    WHEN pr.id IS NOT NULL THEN 'calculated'
                    ELSE 'pending'
                END as status
            FROM users u
            LEFT JOIN user_salary_config_v2 usc ON u.user_id = usc.user_id AND usc.is_current = true
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN payroll_templates pt ON pt.company_id = u.company_id AND pt.is_active = true
            LEFT JOIN payroll_runs pr ON pr.company_id = u.company_id
                AND pr.period_year = :year AND pr.period_month = :month
            WHERE u.company_id = :companyId
            AND u.is_active = true
            ORDER BY u."lastName", u."firstName"
            LIMIT 100
        `, {
            replacements: {
                companyId: req.companyId,
                year: currentYear,
                month: currentMonth
            },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: employees });
    } catch (error) {
        console.error('Error fetching runs details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

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
                { model: CompanyBranch, as: 'branch', required: false }
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
            where: { id: req.params.id, company_id: req.companyId },
            include: [
                { model: CompanyBranch, as: 'branch' },
                {
                    model: PayrollRunDetail,
                    as: 'details',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['user_id', 'firstName', 'lastName', 'email']
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
            where: { id: req.params.id, company_id: req.companyId }
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
            where: { id: req.params.id, company_id: req.companyId }
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
// CATEGORÍAS DE ENTIDADES (Parametrizable)
// ============================================================================

// GET /entity-categories - Listar categorías disponibles
router.get('/entity-categories', async (req, res) => {
    try {
        const { country_id, flow_direction, include_global = 'true' } = req.query;

        let whereClause = 'WHERE is_active = true';
        const replacements = { companyId: req.companyId };

        // Incluir categorías globales, del país y de la empresa
        if (include_global === 'true') {
            whereClause += ` AND (
                (country_id IS NULL AND company_id IS NULL)
                OR country_id = :countryId
                OR company_id = :companyId
            )`;
            if (country_id) {
                replacements.countryId = parseInt(country_id);
            } else {
                replacements.countryId = null;
            }
        } else {
            whereClause += ' AND company_id = :companyId';
        }

        if (flow_direction) {
            whereClause += ' AND flow_direction = :flowDirection';
            replacements.flowDirection = flow_direction;
        }

        const categories = await sequelize.query(`
            SELECT
                id,
                country_id,
                company_id,
                category_code,
                category_name,
                category_name_short,
                description,
                flow_direction,
                icon_name,
                color_hex,
                consolidation_group,
                requires_tax_id,
                requires_bank_info,
                default_presentation_format,
                display_order,
                is_system,
                (company_id IS NULL AND country_id IS NULL) as is_global
            FROM payroll_entity_categories
            ${whereClause}
            ORDER BY display_order, category_name
        `, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching entity categories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /entity-categories/:id - Obtener categoría por ID
router.get('/entity-categories/:id', async (req, res) => {
    try {
        const { PayrollEntityCategory } = require('../config/database');
        const category = await PayrollEntityCategory.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Categoría no encontrada' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /entity-categories - Crear categoría custom de la empresa
router.post('/entity-categories', async (req, res) => {
    try {
        const { PayrollEntityCategory } = require('../config/database');
        const category = await PayrollEntityCategory.create({
            ...req.body,
            company_id: req.companyId,
            is_system: false  // Las categorías creadas por empresa no son del sistema
        });
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Error creating entity category:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /entity-categories/:id - Actualizar categoría
router.put('/entity-categories/:id', async (req, res) => {
    try {
        const { PayrollEntityCategory } = require('../config/database');
        const category = await PayrollEntityCategory.findOne({
            where: {
                id: req.params.id,
                company_id: req.companyId,
                is_system: false  // Solo se pueden editar categorías no del sistema
            }
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Categoría no encontrada o no editable (categorías del sistema no se pueden modificar)'
            });
        }
        await category.update(req.body);
        res.json({ success: true, data: category });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /entity-categories/:id - Eliminar categoría
router.delete('/entity-categories/:id', async (req, res) => {
    try {
        const { PayrollEntityCategory, PayrollEntity } = require('../config/database');

        // Verificar que la categoría existe y es de la empresa
        const category = await PayrollEntityCategory.findOne({
            where: {
                id: req.params.id,
                company_id: req.companyId,
                is_system: false
            }
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Categoría no encontrada o no eliminable'
            });
        }

        // Verificar que no hay entidades usando esta categoría
        const entitiesCount = await PayrollEntity.count({ where: { category_id: req.params.id } });
        if (entitiesCount > 0) {
            return res.status(400).json({
                success: false,
                error: `No se puede eliminar: ${entitiesCount} entidades usan esta categoría`
            });
        }

        await category.destroy();
        res.json({ success: true, message: 'Categoría eliminada' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ENTIDADES DE DESTINO (100% Parametrizable)
// ============================================================================

// GET /entities - Listar entidades filtradas por país de SUCURSAL (con fallback a empresa)
router.get('/entities', async (req, res) => {
    try {
        const { branch_id, country_id, category_id, flow_direction, include_global = 'true' } = req.query;

        let whereClause = 'WHERE pe.is_active = true';
        const replacements = { companyId: req.companyId };

        // PRIORIDAD DE PAÍS:
        // 1. Si se pasa branch_id → obtener country_id de la sucursal
        // 2. Si se pasa country_id directamente → usar ese
        // 3. Si no hay ninguno → fallback al país de la empresa (si tiene)
        let effectiveCountryId = null;

        if (branch_id) {
            // Obtener país de la sucursal
            const [branchData] = await sequelize.query(`
                SELECT cb.country_id, pc.country_name
                FROM company_branches cb
                LEFT JOIN payroll_countries pc ON cb.country_id = pc.id
                WHERE cb.id = :branchId AND cb.company_id = :companyId
            `, {
                replacements: { branchId: parseInt(branch_id), companyId: req.companyId },
                type: sequelize.QueryTypes.SELECT
            });

            if (branchData && branchData.country_id) {
                effectiveCountryId = branchData.country_id;
                console.log(`🌍 [ENTITIES] Usando país de sucursal ${branch_id}: ${branchData.country_name}`);
            }
        }

        if (!effectiveCountryId && country_id) {
            effectiveCountryId = parseInt(country_id);
        }

        // Fallback: país de la empresa (si tiene configurado)
        // Nota: companies tiene 'country' (texto) no 'country_id', así que hacemos join
        if (!effectiveCountryId) {
            const [companyData] = await sequelize.query(`
                SELECT pc.id as country_id, pc.country_name
                FROM companies c
                LEFT JOIN payroll_countries pc ON (
                    LOWER(c.country) = LOWER(pc.country_name)
                    OR LOWER(c.country) = LOWER(pc.country_code)
                )
                WHERE c.company_id = :companyId AND pc.id IS NOT NULL
            `, {
                replacements: { companyId: req.companyId },
                type: sequelize.QueryTypes.SELECT
            });

            if (companyData && companyData.country_id) {
                effectiveCountryId = companyData.country_id;
                console.log(`🌍 [ENTITIES] Fallback a país de empresa: ${companyData.country_name}`);
            }
        }

        // Filtrar por país efectivo (si se determinó uno)
        if (effectiveCountryId) {
            // Incluir entidades del país + entidades sin país (globales)
            whereClause += ' AND (pe.country_id = :countryId OR pe.country_id IS NULL)';
            replacements.countryId = effectiveCountryId;
        }

        if (category_id) {
            whereClause += ' AND pe.category_id = :categoryId';
            replacements.categoryId = parseInt(category_id);
        }

        if (flow_direction) {
            whereClause += ' AND pec.flow_direction = :flowDirection';
            replacements.flowDirection = flow_direction;
        }

        if (include_global === 'true') {
            whereClause += ' AND (pe.company_id IS NULL OR pe.company_id = :companyId)';
        } else {
            whereClause += ' AND pe.company_id = :companyId';
        }

        const entities = await sequelize.query(`
            SELECT
                pe.entity_id,
                pe.company_id,
                pe.country_id,
                pe.category_id,
                pe.entity_code,
                pe.entity_name,
                pe.entity_short_name,
                pe.entity_type,
                pe.tax_id,
                pe.legal_name,
                pe.address,
                pe.phone,
                pe.email,
                pe.website,
                pe.bank_name,
                pe.bank_cbu,
                pe.bank_alias,
                pe.presentation_format,
                pe.is_government,
                pe.is_mandatory,
                pe.requires_employee_affiliation,
                pe.affiliation_id_name,
                pe.calculation_notes,
                pe.legal_reference,
                pe.settings,
                pe.is_active,
                pc.country_code,
                pc.country_name,
                pec.category_code,
                pec.category_name,
                pec.category_name_short,
                pec.flow_direction,
                pec.icon_name,
                pec.color_hex,
                pec.consolidation_group,
                (pe.company_id IS NULL) as is_global
            FROM payroll_entities pe
            LEFT JOIN payroll_countries pc ON pe.country_id = pc.id
            LEFT JOIN payroll_entity_categories pec ON pe.category_id = pec.id
            ${whereClause}
            ORDER BY pec.display_order, pc.country_code, pe.entity_name
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

// GET /payslip-block-types - Tipos de bloques disponibles para el editor
router.get('/payslip-block-types', async (req, res) => {
    try {
        const result = await sequelize.query(`
            SELECT id, block_type, block_name, description, icon,
                   configurable_fields, html_template, suggested_order
            FROM payroll_payslip_block_types
            WHERE is_active = true
            ORDER BY suggested_order ASC
        `, { type: sequelize.QueryTypes.SELECT });

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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
            where: { id: req.params.id, company_id: req.companyId }
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

// ============================================================================
// EXPORTACION MULTI-PLATAFORMA (SAP, Workday, ADP, Oracle, Bancos, Contabilidad)
// ============================================================================

const PayrollExportService = require('../services/PayrollExportService');

// GET /export/formats - Obtener formatos de exportacion disponibles
router.get('/export/formats', async (req, res) => {
    try {
        const formats = await PayrollExportService.getAvailableFormats(req.companyId);
        res.json({ success: true, data: formats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /export/formats/erp - Obtener solo formatos ERP
router.get('/export/formats/erp', (req, res) => {
    const erpFormats = Object.values(PayrollExportService.EXPORT_FORMATS)
        .filter(f => f.type === 'ERP');
    res.json({ success: true, data: erpFormats });
});

// POST /export/payroll-run/:runId - Exportar corrida de nomina
router.post('/export/payroll-run/:runId', async (req, res) => {
    try {
        const { runId } = req.params;
        const { format, options } = req.body;

        const result = await PayrollExportService.exportPayrollRun(runId, format, options || {});

        if (req.query.download === 'true') {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
        } else {
            res.json({ success: true, data: result });
        }
    } catch (error) {
        console.error('Error exporting payroll run:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /export/entity-settlement/:settlementId - Exportar consolidacion por entidad
router.post('/export/entity-settlement/:settlementId', async (req, res) => {
    try {
        const { settlementId } = req.params;
        const { format, options } = req.body;

        const result = await PayrollExportService.exportEntitySettlement(settlementId, format, options || {});

        if (req.query.download === 'true') {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
        } else {
            res.json({ success: true, data: result });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /export/bank-transfer/:runId - Exportar archivo bancario (ISO 20022 o CSV)
router.post('/export/bank-transfer/:runId', async (req, res) => {
    try {
        const { runId } = req.params;
        const { format = 'BANK_TRANSFER_CSV', options } = req.body;

        const result = await PayrollExportService.exportPayrollRun(runId, format, options || {});

        if (req.query.download === 'true') {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
        } else {
            res.json({ success: true, data: result });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /export/accounting/:runId - Exportar asiento contable
router.post('/export/accounting/:runId', async (req, res) => {
    try {
        const { runId } = req.params;
        const { options } = req.body;

        const result = await PayrollExportService.exportPayrollRun(runId, 'ACCOUNTING_JOURNAL', options || {});

        if (req.query.download === 'true') {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
        } else {
            res.json({ success: true, data: result });
        }
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

// POST /payslip/generate-pdf - Generar recibo de sueldo en PDF usando Puppeteer
router.post('/payslip/generate-pdf', async (req, res) => {
    try {
        const { run_detail_id, template_id } = req.body;
        const payslipPDFService = require('../services/PayslipPDFService');
        const { PayrollPayslipTemplate } = require('../config/database');

        // Obtener datos del detalle
        const [runDetails] = await sequelize.query(`
            SELECT
                prd.*,
                pr.period_year, pr.period_month, pr.period_start, pr.period_end, pr.payment_date,
                u."firstName", u."lastName", u.dni, u.employee_code, u.hire_date, u.position,
                u.bank_name, u.bank_account, u.cbu,
                d.name as department_name,
                c.name as company_name, c.legal_name as company_legal_name, c.tax_id as company_tax_id,
                c.address as company_address, c.logo as company_logo, c.currency
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

        if (!runDetails || runDetails.length === 0) {
            return res.status(404).json({ success: false, error: 'Detalle de nomina no encontrado' });
        }

        const detail = runDetails[0];

        // Obtener plantilla
        let template;
        if (template_id) {
            template = await PayrollPayslipTemplate.findByPk(template_id);
        } else {
            template = await PayrollPayslipTemplate.findOne({ where: { is_default: true, is_active: true } });
        }

        if (!template) {
            return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
        }

        // Obtener tipos de bloques para renderizar
        const blockTypes = await sequelize.query(`
            SELECT * FROM payroll_payslip_block_types WHERE is_active = true
        `, { type: sequelize.QueryTypes.SELECT });

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

        // Preparar datos para el servicio de PDF
        const payslipData = {
            company: {
                name: detail.company_name,
                display_name: detail.company_name,
                legal_name: detail.company_legal_name,
                tax_id: detail.company_tax_id,
                tax_id_label: 'CUIT',
                address: detail.company_address,
                logo: detail.company_logo
            },
            period: {
                year: detail.period_year,
                month: detail.period_month
            },
            employee: {
                full_name: `${detail.firstName} ${detail.lastName}`,
                tax_id: detail.dni,
                hire_date: detail.hire_date,
                position: detail.position || 'Sin cargo',
                department: detail.department_name || 'Sin departamento',
                bank_name: detail.bank_name,
                bank_account: detail.bank_account,
                cbu: detail.cbu
            },
            concepts: concepts.map(c => ({
                concept_code: c.concept_code,
                concept_name: c.concept_name,
                quantity: c.quantity,
                rate: c.unit_value,
                amount: parseFloat(c.calculated_amount || 0),
                is_deduction: c.is_deduction,
                classification: c.is_deduction ? 'deduction' : 'earning'
            })),
            totals: {
                gross: parseFloat(detail.gross_earnings || 0),
                deductions: parseFloat(detail.total_deductions || 0),
                net: parseFloat(detail.net_salary || 0)
            },
            currency: detail.currency || 'ARS'
        };

        // Agregar blockTypes al template
        const templateWithTypes = { ...template.toJSON(), blockTypes };

        // Generar PDF
        const pdfBuffer = await payslipPDFService.generatePayslip(templateWithTypes, payslipData);

        // Enviar PDF
        const fileName = `recibo_${detail.firstName}_${detail.lastName}_${detail.period_year}_${detail.period_month}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating payslip PDF:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /payslip/preview-pdf - Vista previa de un template con datos de ejemplo
router.post('/payslip/preview-pdf', async (req, res) => {
    try {
        const { template_id } = req.body;
        const payslipPDFService = require('../services/PayslipPDFService');
        const { PayrollPayslipTemplate } = require('../config/database');

        // Obtener plantilla
        const template = await PayrollPayslipTemplate.findByPk(template_id);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Plantilla no encontrada' });
        }

        // Obtener tipos de bloques
        const blockTypes = await sequelize.query(`
            SELECT * FROM payroll_payslip_block_types WHERE is_active = true
        `, { type: sequelize.QueryTypes.SELECT });

        // Datos de ejemplo para vista previa
        const previewData = {
            company: {
                name: 'Empresa Demo S.A.',
                display_name: 'Empresa Demo S.A.',
                tax_id: '30-12345678-9',
                tax_id_label: 'CUIT',
                address: 'Av. Ejemplo 1234, Buenos Aires'
            },
            period: {
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1
            },
            employee: {
                full_name: 'Juan Pérez García',
                tax_id: '20-12345678-9',
                hire_date: '2020-03-15',
                position: 'Analista Senior',
                department: 'Sistemas',
                category: 'Fuera de convenio',
                bank_name: 'Banco Nación',
                bank_account: '1234567890',
                cbu: '0110012340000012345678'
            },
            concepts: [
                { concept_code: '001', concept_name: 'Sueldo Básico', amount: 500000, is_deduction: false },
                { concept_code: '002', concept_name: 'Antigüedad', amount: 25000, is_deduction: false },
                { concept_code: '003', concept_name: 'Presentismo', amount: 40000, is_deduction: false },
                { concept_code: '101', concept_name: 'Jubilación 11%', amount: 62150, is_deduction: true },
                { concept_code: '102', concept_name: 'Obra Social 3%', amount: 16950, is_deduction: true },
                { concept_code: '103', concept_name: 'Ley 19032 3%', amount: 16950, is_deduction: true },
                { concept_code: '104', concept_name: 'Sindicato 2%', amount: 11300, is_deduction: true }
            ],
            totals: {
                gross: 565000,
                deductions: 107350,
                net: 457650
            },
            currency: 'ARS'
        };

        // Agregar blockTypes al template
        const templateWithTypes = { ...template.toJSON(), blockTypes };

        // Generar PDF
        const pdfBuffer = await payslipPDFService.generatePayslip(templateWithTypes, previewData);

        // Enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating preview PDF:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// HISTORIAL DE LIQUIDACIONES POR USUARIO - /api/payroll/user/:userId/history
// ============================================================================

/**
 * GET /api/payroll/user/:userId/history
 * Obtiene historial completo de liquidaciones de un empleado
 * Usado en el módulo Usuarios → Antecedentes Laborales
 */
router.get('/user/:userId/history', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 24, offset = 0 } = req.query; // Default: últimos 2 años

        // Verificar que el usuario pertenece a la empresa
        const user = await User.findOne({
            where: { user_id: userId, company_id: req.companyId },
            attributes: ['user_id', 'firstName', 'lastName', 'dni']
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        // Obtener todas las liquidaciones del usuario ordenadas por fecha (más reciente primero)
        const history = await sequelize.query(`
            SELECT
                prd.id as detail_id,
                pr.id as run_id,
                pr.period_year,
                pr.period_month,
                pr.period_start,
                pr.period_end,
                pr.status as run_status,
                pr.approved_at,
                pr.pay_date,
                pt.template_name,
                pt.template_code,
                pc.currency_code,
                pc.currency_symbol,
                prd.gross_earnings,
                prd.non_remunerative,
                prd.total_deductions,
                prd.net_salary,
                prd.employer_contributions,
                prd.worked_days,
                prd.worked_hours,
                prd.overtime_50_hours,
                prd.overtime_100_hours
            FROM payroll_run_details prd
            INNER JOIN payroll_runs pr ON prd.run_id = pr.id
            LEFT JOIN payroll_templates pt ON pr.template_id = pt.id
            LEFT JOIN payroll_countries pc ON pt.country_id = pc.id
            WHERE prd.user_id = :userId
            AND pr.company_id = :companyId
            AND pr.status IN ('completed', 'approved', 'paid')
            ORDER BY pr.period_year DESC, pr.period_month DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements: {
                userId: parseInt(userId),
                companyId: req.companyId,
                limit: parseInt(limit),
                offset: parseInt(offset)
            },
            type: sequelize.QueryTypes.SELECT
        });

        // Obtener totales acumulados (año actual)
        const currentYear = new Date().getFullYear();
        const [ytdTotals] = await sequelize.query(`
            SELECT
                COALESCE(SUM(prd.gross_earnings), 0) as ytd_gross,
                COALESCE(SUM(prd.net_salary), 0) as ytd_net,
                COALESCE(SUM(prd.total_deductions), 0) as ytd_deductions,
                COUNT(*) as months_processed
            FROM payroll_run_details prd
            INNER JOIN payroll_runs pr ON prd.run_id = pr.id
            WHERE prd.user_id = :userId
            AND pr.company_id = :companyId
            AND pr.period_year = :year
            AND pr.status IN ('completed', 'approved', 'paid')
        `, {
            replacements: {
                userId: parseInt(userId),
                companyId: req.companyId,
                year: currentYear
            },
            type: sequelize.QueryTypes.SELECT
        });

        // Obtener total de registros para paginación
        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total
            FROM payroll_run_details prd
            INNER JOIN payroll_runs pr ON prd.run_id = pr.id
            WHERE prd.user_id = :userId
            AND pr.company_id = :companyId
            AND pr.status IN ('completed', 'approved', 'paid')
        `, {
            replacements: { userId: parseInt(userId), companyId: req.companyId },
            type: sequelize.QueryTypes.SELECT
        });

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        res.json({
            success: true,
            data: {
                employee: {
                    id: user.user_id,
                    full_name: `${user.firstName} ${user.lastName}`,
                    dni: user.dni
                },
                history: history.map(h => ({
                    detail_id: h.detail_id,
                    run_id: h.run_id,
                    period: {
                        year: h.period_year,
                        month: h.period_month,
                        month_name: monthNames[h.period_month - 1],
                        label: `${monthNames[h.period_month - 1]} ${h.period_year}`,
                        start: h.period_start,
                        end: h.period_end
                    },
                    template: {
                        name: h.template_name,
                        code: h.template_code
                    },
                    currency: {
                        code: h.currency_code || 'ARS',
                        symbol: h.currency_symbol || '$'
                    },
                    amounts: {
                        gross: parseFloat(h.gross_earnings || 0),
                        non_remunerative: parseFloat(h.non_remunerative || 0),
                        deductions: parseFloat(h.total_deductions || 0),
                        net: parseFloat(h.net_salary || 0),
                        employer_cost: parseFloat(h.employer_contributions || 0)
                    },
                    hours: {
                        worked_days: h.worked_days,
                        worked_hours: parseFloat(h.worked_hours || 0),
                        overtime_50: parseFloat(h.overtime_50_hours || 0),
                        overtime_100: parseFloat(h.overtime_100_hours || 0)
                    },
                    status: h.run_status,
                    approved_at: h.approved_at,
                    pay_date: h.pay_date
                })),
                ytd: {
                    year: currentYear,
                    gross: parseFloat(ytdTotals?.ytd_gross || 0),
                    net: parseFloat(ytdTotals?.ytd_net || 0),
                    deductions: parseFloat(ytdTotals?.ytd_deductions || 0),
                    months_processed: parseInt(ytdTotals?.months_processed || 0)
                },
                pagination: {
                    total: parseInt(countResult?.total || 0),
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user payroll history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/user/:userId/history/:detailId/concepts
 * Obtiene los conceptos detallados de una liquidación específica
 * Para mostrar en modal o generar PDF
 */
router.get('/user/:userId/history/:detailId/concepts', async (req, res) => {
    try {
        const { userId, detailId } = req.params;

        // Verificar permisos
        const detail = await sequelize.query(`
            SELECT
                prd.*,
                pr.period_year, pr.period_month, pr.period_start, pr.period_end,
                pr.status as run_status, pr.approved_at, pr.pay_date,
                pt.template_name, pt.template_code,
                pt.receipt_header, pt.receipt_footer,
                pc.currency_code, pc.currency_symbol, pc.country_name,
                u."firstName", u."lastName", u.dni, u.email,
                d.name as department_name,
                cb.branch_name
            FROM payroll_run_details prd
            INNER JOIN payroll_runs pr ON prd.run_id = pr.id
            LEFT JOIN payroll_templates pt ON pr.template_id = pt.id
            LEFT JOIN payroll_countries pc ON pt.country_id = pc.id
            LEFT JOIN users u ON prd.user_id = u.user_id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN company_branches cb ON pr.branch_id = cb.id
            WHERE prd.id = :detailId
            AND prd.user_id = :userId
            AND pr.company_id = :companyId
        `, {
            replacements: {
                detailId: parseInt(detailId),
                userId: parseInt(userId),
                companyId: req.companyId
            },
            type: sequelize.QueryTypes.SELECT
        });

        if (!detail || detail.length === 0) {
            return res.status(404).json({ success: false, error: 'Liquidación no encontrada' });
        }

        const liquidacion = detail[0];

        // Obtener conceptos detallados
        const concepts = await sequelize.query(`
            SELECT
                prcd.concept_code,
                prcd.concept_name,
                prcd.calculation_type,
                prcd.base_value,
                prcd.applied_rate,
                prcd.quantity,
                prcd.calculated_amount,
                prcd.is_deduction,
                prcd.is_employer_cost,
                prcd.entity_name,
                pcc.classification_code,
                pcc.classification_name,
                pcc.sign
            FROM payroll_run_concept_details prcd
            LEFT JOIN payroll_concept_classifications pcc ON prcd.classification_id = pcc.id
            WHERE prcd.detail_id = :detailId
            ORDER BY
                CASE
                    WHEN prcd.is_employer_cost THEN 3
                    WHEN prcd.is_deduction THEN 2
                    ELSE 1
                END,
                prcd.concept_code
        `, {
            replacements: { detailId: parseInt(detailId) },
            type: sequelize.QueryTypes.SELECT
        });

        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Agrupar conceptos por clasificación
        const groupedConcepts = {
            earnings: concepts.filter(c => !c.is_deduction && !c.is_employer_cost),
            deductions: concepts.filter(c => c.is_deduction && !c.is_employer_cost),
            employer_contributions: concepts.filter(c => c.is_employer_cost)
        };

        res.json({
            success: true,
            data: {
                header: {
                    period: {
                        year: liquidacion.period_year,
                        month: liquidacion.period_month,
                        month_name: monthNames[liquidacion.period_month - 1],
                        label: `${monthNames[liquidacion.period_month - 1]} ${liquidacion.period_year}`,
                        start: liquidacion.period_start,
                        end: liquidacion.period_end
                    },
                    employee: {
                        full_name: `${liquidacion.firstName} ${liquidacion.lastName}`,
                        dni: liquidacion.dni,
                        email: liquidacion.email,
                        department: liquidacion.department_name
                    },
                    template: {
                        name: liquidacion.template_name,
                        code: liquidacion.template_code
                    },
                    branch: liquidacion.branch_name,
                    country: liquidacion.country_name,
                    currency: {
                        code: liquidacion.currency_code || 'ARS',
                        symbol: liquidacion.currency_symbol || '$'
                    },
                    status: liquidacion.run_status,
                    approved_at: liquidacion.approved_at,
                    pay_date: liquidacion.pay_date,
                    receipt_header: liquidacion.receipt_header,
                    receipt_footer: liquidacion.receipt_footer
                },
                concepts: {
                    earnings: groupedConcepts.earnings.map(c => ({
                        code: c.concept_code,
                        name: c.concept_name,
                        calculation_type: c.calculation_type,
                        base: parseFloat(c.base_value || 0),
                        rate: c.applied_rate,
                        quantity: c.quantity,
                        amount: parseFloat(c.calculated_amount || 0)
                    })),
                    deductions: groupedConcepts.deductions.map(c => ({
                        code: c.concept_code,
                        name: c.concept_name,
                        calculation_type: c.calculation_type,
                        base: parseFloat(c.base_value || 0),
                        rate: c.applied_rate,
                        quantity: c.quantity,
                        amount: parseFloat(c.calculated_amount || 0),
                        entity: c.entity_name
                    })),
                    employer_contributions: groupedConcepts.employer_contributions.map(c => ({
                        code: c.concept_code,
                        name: c.concept_name,
                        calculation_type: c.calculation_type,
                        base: parseFloat(c.base_value || 0),
                        rate: c.applied_rate,
                        amount: parseFloat(c.calculated_amount || 0),
                        entity: c.entity_name
                    }))
                },
                totals: {
                    gross: parseFloat(liquidacion.gross_earnings || 0),
                    non_remunerative: parseFloat(liquidacion.non_remunerative || 0),
                    deductions: parseFloat(liquidacion.total_deductions || 0),
                    net: parseFloat(liquidacion.net_salary || 0),
                    employer_cost: parseFloat(liquidacion.employer_contributions || 0)
                },
                hours: {
                    worked_days: liquidacion.worked_days,
                    worked_hours: parseFloat(liquidacion.worked_hours || 0),
                    overtime_50: parseFloat(liquidacion.overtime_50_hours || 0),
                    overtime_100: parseFloat(liquidacion.overtime_100_hours || 0)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching payroll detail concepts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// POSICIONES ORGANIZACIONALES - /api/payroll/positions
// Empleado → Posición → Template de Recibo
// ============================================================================

/**
 * GET /api/payroll/positions
 * Lista posiciones de la empresa con sus templates asignados
 */
router.get('/positions', async (req, res) => {
    try {
        const positions = await OrganizationalPosition.findAll({
            where: {
                company_id: req.companyId,
                is_active: true
            },
            include: [
                {
                    model: PayrollPayslipTemplate,
                    as: 'payslipTemplate',
                    attributes: ['id', 'template_code', 'template_name']
                },
                {
                    model: PayrollTemplate,
                    as: 'payrollTemplate',
                    attributes: ['id', 'template_code', 'template_name']
                },
                {
                    model: OrganizationalPosition,
                    as: 'parentPosition',
                    attributes: ['id', 'position_code', 'position_name']
                }
            ],
            order: [['level_order', 'DESC'], ['position_name', 'ASC']]
        });

        // Contar empleados por posición
        const positionsWithCount = await Promise.all(positions.map(async (pos) => {
            const employeeCount = await User.count({
                where: { organizational_position_id: pos.id }
            });
            return {
                ...pos.toJSON(),
                employee_count: employeeCount
            };
        }));

        res.json({
            success: true,
            data: positionsWithCount
        });
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/positions/:id
 * Obtiene una posición con sus empleados
 */
router.get('/positions/:id', async (req, res) => {
    try {
        const position = await OrganizationalPosition.findOne({
            where: {
                id: req.params.id,
                company_id: req.companyId
            },
            include: [
                {
                    model: PayrollPayslipTemplate,
                    as: 'payslipTemplate'
                },
                {
                    model: PayrollTemplate,
                    as: 'payrollTemplate'
                },
                {
                    model: OrganizationalPosition,
                    as: 'parentPosition'
                },
                {
                    model: OrganizationalPosition,
                    as: 'childPositions'
                },
                {
                    model: User,
                    as: 'employees',
                    attributes: ['user_id', 'firstName', 'lastName', 'email', 'employeeId']
                }
            ]
        });

        if (!position) {
            return res.status(404).json({ success: false, error: 'Posición no encontrada' });
        }

        res.json({
            success: true,
            data: position
        });
    } catch (error) {
        console.error('Error fetching position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/positions
 * Crea una nueva posición organizacional
 */
router.post('/positions', async (req, res) => {
    try {
        const {
            position_code,
            position_name,
            description,
            parent_position_id,
            level_order,
            salary_category_id,
            payslip_template_id,
            payroll_template_id,
            department_id
        } = req.body;

        // Verificar código único
        const existing = await OrganizationalPosition.findOne({
            where: {
                company_id: req.companyId,
                position_code
            }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                error: `Ya existe una posición con código ${position_code}`
            });
        }

        const position = await OrganizationalPosition.create({
            company_id: req.companyId,
            position_code,
            position_name,
            description,
            parent_position_id,
            level_order: level_order || 1,
            salary_category_id,
            payslip_template_id,
            payroll_template_id,
            department_id
        });

        res.status(201).json({
            success: true,
            data: position,
            message: 'Posición creada exitosamente'
        });
    } catch (error) {
        console.error('Error creating position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/payroll/positions/:id
 * Actualiza una posición organizacional
 */
router.put('/positions/:id', async (req, res) => {
    try {
        const position = await OrganizationalPosition.findOne({
            where: {
                id: req.params.id,
                company_id: req.companyId
            }
        });

        if (!position) {
            return res.status(404).json({ success: false, error: 'Posición no encontrada' });
        }

        const {
            position_code,
            position_name,
            description,
            parent_position_id,
            level_order,
            salary_category_id,
            payslip_template_id,
            payroll_template_id,
            department_id,
            is_active
        } = req.body;

        // Verificar código único si cambió
        if (position_code && position_code !== position.position_code) {
            const existing = await OrganizationalPosition.findOne({
                where: {
                    company_id: req.companyId,
                    position_code,
                    id: { [Op.ne]: position.id }
                }
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: `Ya existe una posición con código ${position_code}`
                });
            }
        }

        // Obtener conteo de empleados afectados ANTES de actualizar
        const affectedEmployees = await User.findAll({
            where: { organizational_position_id: position.id },
            attributes: ['user_id', 'firstName', 'lastName', 'email', 'employeeId']
        });

        // Obtener posiciones subordinadas
        const childPositions = await OrganizationalPosition.findAll({
            where: { parent_position_id: position.id, is_active: true },
            attributes: ['id', 'position_code', 'position_name']
        });

        await position.update({
            position_code: position_code || position.position_code,
            position_name: position_name || position.position_name,
            description: description !== undefined ? description : position.description,
            parent_position_id: parent_position_id !== undefined ? parent_position_id : position.parent_position_id,
            level_order: level_order || position.level_order,
            salary_category_id: salary_category_id !== undefined ? salary_category_id : position.salary_category_id,
            payslip_template_id: payslip_template_id !== undefined ? payslip_template_id : position.payslip_template_id,
            payroll_template_id: payroll_template_id !== undefined ? payroll_template_id : position.payroll_template_id,
            department_id: department_id !== undefined ? department_id : position.department_id,
            is_active: is_active !== undefined ? is_active : position.is_active
        });

        res.json({
            success: true,
            data: position,
            message: 'Posición actualizada exitosamente',
            impact: {
                employees_affected: affectedEmployees.length,
                employees: affectedEmployees.map(e => ({
                    user_id: e.user_id,
                    name: `${e.firstName} ${e.lastName}`,
                    email: e.email
                })),
                child_positions_affected: childPositions.length,
                child_positions: childPositions.map(p => ({
                    id: p.id,
                    code: p.position_code,
                    name: p.position_name
                }))
            }
        });
    } catch (error) {
        console.error('Error updating position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/positions/:id/impact
 * Consulta el impacto de modificar/eliminar una posición
 */
router.get('/positions/:id/impact', async (req, res) => {
    try {
        const position = await OrganizationalPosition.findOne({
            where: {
                id: req.params.id,
                company_id: req.companyId
            }
        });

        if (!position) {
            return res.status(404).json({ success: false, error: 'Posición no encontrada' });
        }

        // Empleados asignados
        const employees = await User.findAll({
            where: { organizational_position_id: position.id },
            attributes: ['user_id', 'firstName', 'lastName', 'email', 'employeeId']
        });

        // Posiciones subordinadas
        const childPositions = await OrganizationalPosition.findAll({
            where: { parent_position_id: position.id, is_active: true },
            attributes: ['id', 'position_code', 'position_name']
        });

        // Otras posiciones disponibles para reasignación
        const alternativePositions = await OrganizationalPosition.findAll({
            where: {
                company_id: req.companyId,
                is_active: true,
                id: { [Op.ne]: position.id }
            },
            attributes: ['id', 'position_code', 'position_name', 'level_order'],
            order: [['level_order', 'DESC'], ['position_name', 'ASC']]
        });

        res.json({
            success: true,
            data: {
                position: {
                    id: position.id,
                    code: position.position_code,
                    name: position.position_name
                },
                impact: {
                    employees_count: employees.length,
                    employees: employees.map(e => ({
                        user_id: e.user_id,
                        name: `${e.firstName} ${e.lastName}`,
                        email: e.email,
                        employee_id: e.employeeId
                    })),
                    child_positions_count: childPositions.length,
                    child_positions: childPositions.map(p => ({
                        id: p.id,
                        code: p.position_code,
                        name: p.position_name
                    })),
                    can_delete_directly: employees.length === 0 && childPositions.length === 0
                },
                alternatives: alternativePositions.map(p => ({
                    id: p.id,
                    code: p.position_code,
                    name: p.position_name,
                    level: p.level_order
                }))
            }
        });
    } catch (error) {
        console.error('Error getting position impact:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/positions/:id/reassign-all
 * Reasigna TODOS los empleados de una posición a otra
 */
router.post('/positions/:id/reassign-all', async (req, res) => {
    try {
        const { target_position_id, include_subordinates } = req.body;

        if (!target_position_id) {
            return res.status(400).json({ success: false, error: 'Se requiere target_position_id' });
        }

        const sourcePosition = await OrganizationalPosition.findOne({
            where: { id: req.params.id, company_id: req.companyId }
        });

        if (!sourcePosition) {
            return res.status(404).json({ success: false, error: 'Posición origen no encontrada' });
        }

        const targetPosition = await OrganizationalPosition.findOne({
            where: { id: target_position_id, company_id: req.companyId, is_active: true }
        });

        if (!targetPosition) {
            return res.status(404).json({ success: false, error: 'Posición destino no encontrada o inactiva' });
        }

        // Reasignar empleados
        const [employeesUpdated] = await User.update(
            { organizational_position_id: target_position_id },
            { where: { organizational_position_id: sourcePosition.id, company_id: req.companyId } }
        );

        let childPositionsUpdated = 0;
        if (include_subordinates) {
            // Reasignar posiciones subordinadas al nuevo padre
            const [updated] = await OrganizationalPosition.update(
                { parent_position_id: target_position_id },
                { where: { parent_position_id: sourcePosition.id, company_id: req.companyId } }
            );
            childPositionsUpdated = updated;
        }

        res.json({
            success: true,
            message: `Reasignación completada`,
            data: {
                employees_reassigned: employeesUpdated,
                child_positions_reassigned: childPositionsUpdated,
                from_position: { id: sourcePosition.id, name: sourcePosition.position_name },
                to_position: { id: targetPosition.id, name: targetPosition.position_name }
            }
        });
    } catch (error) {
        console.error('Error reassigning from position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/payroll/positions/:id
 * Elimina (soft delete) una posición organizacional
 * Requiere: force=true si hay empleados/subordinados, o reasignarlos primero
 */
router.delete('/positions/:id', async (req, res) => {
    try {
        const { force } = req.query;

        const position = await OrganizationalPosition.findOne({
            where: {
                id: req.params.id,
                company_id: req.companyId
            }
        });

        if (!position) {
            return res.status(404).json({ success: false, error: 'Posición no encontrada' });
        }

        // Verificar si hay empleados asignados
        const employees = await User.findAll({
            where: { organizational_position_id: position.id },
            attributes: ['user_id', 'firstName', 'lastName', 'email']
        });

        // Verificar si hay posiciones hijas
        const childPositions = await OrganizationalPosition.findAll({
            where: { parent_position_id: position.id, is_active: true },
            attributes: ['id', 'position_code', 'position_name']
        });

        // Si hay dependencias y no se forzó
        if ((employees.length > 0 || childPositions.length > 0) && force !== 'true') {
            return res.status(409).json({
                success: false,
                error: 'La posición tiene dependencias. Use force=true o reasigne primero.',
                requires_action: true,
                impact: {
                    employees_count: employees.length,
                    employees: employees.map(e => ({
                        user_id: e.user_id,
                        name: `${e.firstName} ${e.lastName}`,
                        email: e.email
                    })),
                    child_positions_count: childPositions.length,
                    child_positions: childPositions.map(p => ({
                        id: p.id,
                        code: p.position_code,
                        name: p.position_name
                    }))
                },
                actions: {
                    reassign_url: `/api/payroll/positions/${position.id}/reassign-all`,
                    force_delete_url: `/api/payroll/positions/${position.id}?force=true`,
                    message: 'Reasigne los empleados/subordinados o use force=true para desvincular'
                }
            });
        }

        // Si forzamos, desvinculamos empleados y subordinados
        if (force === 'true') {
            // Desasignar empleados (poner position_id en null)
            await User.update(
                { organizational_position_id: null },
                { where: { organizational_position_id: position.id } }
            );
            // Desasignar subordinados
            await OrganizationalPosition.update(
                { parent_position_id: null },
                { where: { parent_position_id: position.id } }
            );
        }

        // Soft delete
        await position.update({ is_active: false });

        res.json({
            success: true,
            message: 'Posición eliminada exitosamente',
            data: {
                position_id: position.id,
                position_name: position.position_name,
                employees_unassigned: force === 'true' ? employees.length : 0,
                subordinates_unassigned: force === 'true' ? childPositions.length : 0
            }
        });
    } catch (error) {
        console.error('Error deleting position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/positions/:id/assign-user
 * Asigna una posición a un usuario
 */
router.post('/positions/:id/assign-user', async (req, res) => {
    try {
        const { user_id } = req.body;

        const position = await OrganizationalPosition.findOne({
            where: {
                id: req.params.id,
                company_id: req.companyId,
                is_active: true
            }
        });

        if (!position) {
            return res.status(404).json({ success: false, error: 'Posición no encontrada' });
        }

        const user = await User.findOne({
            where: {
                user_id,
                company_id: req.companyId
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        await user.update({ organizational_position_id: position.id });

        res.json({
            success: true,
            message: `Usuario ${user.firstName} ${user.lastName} asignado a ${position.position_name}`,
            data: {
                user_id: user.user_id,
                position_id: position.id,
                position_name: position.position_name,
                payslip_template_id: position.payslip_template_id,
                payroll_template_id: position.payroll_template_id
            }
        });
    } catch (error) {
        console.error('Error assigning user to position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/payroll/positions/:id/assign-users
 * Asigna una posición a múltiples usuarios
 */
router.post('/positions/:id/assign-users', async (req, res) => {
    try {
        const { user_ids } = req.body;

        if (!Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({ success: false, error: 'Se requiere un array de user_ids' });
        }

        const position = await OrganizationalPosition.findOne({
            where: {
                id: req.params.id,
                company_id: req.companyId,
                is_active: true
            }
        });

        if (!position) {
            return res.status(404).json({ success: false, error: 'Posición no encontrada' });
        }

        const [updatedCount] = await User.update(
            { organizational_position_id: position.id },
            {
                where: {
                    user_id: { [Op.in]: user_ids },
                    company_id: req.companyId
                }
            }
        );

        res.json({
            success: true,
            message: `${updatedCount} usuario(s) asignado(s) a ${position.position_name}`,
            data: {
                position_id: position.id,
                assigned_count: updatedCount
            }
        });
    } catch (error) {
        console.error('Error bulk assigning users to position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/payroll/positions/:id/unassign-user/:userId
 * Quita la posición de un usuario
 */
router.delete('/positions/:id/unassign-user/:userId', async (req, res) => {
    try {
        const user = await User.findOne({
            where: {
                user_id: req.params.userId,
                company_id: req.companyId,
                organizational_position_id: req.params.id
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado o no está asignado a esta posición'
            });
        }

        await user.update({ organizational_position_id: null });

        res.json({
            success: true,
            message: `Usuario ${user.firstName} ${user.lastName} removido de la posición`
        });
    } catch (error) {
        console.error('Error unassigning user from position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/positions/hierarchy
 * Obtiene la jerarquía completa de posiciones
 */
router.get('/positions-hierarchy', async (req, res) => {
    try {
        const positions = await OrganizationalPosition.findAll({
            where: {
                company_id: req.companyId,
                is_active: true
            },
            include: [
                {
                    model: PayrollPayslipTemplate,
                    as: 'payslipTemplate',
                    attributes: ['id', 'template_code', 'template_name']
                }
            ],
            order: [['level_order', 'DESC'], ['position_name', 'ASC']]
        });

        // Construir árbol jerárquico
        const buildTree = (items, parentId = null) => {
            return items
                .filter(item => item.parent_position_id === parentId)
                .map(item => ({
                    ...item.toJSON(),
                    children: buildTree(items, item.id)
                }));
        };

        const hierarchy = buildTree(positions);

        res.json({
            success: true,
            data: hierarchy
        });
    } catch (error) {
        console.error('Error fetching positions hierarchy:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/payroll/user/:userId/position
 * Obtiene la posición y templates de un usuario
 */
router.get('/user/:userId/position', async (req, res) => {
    try {
        const user = await User.findOne({
            where: {
                user_id: req.params.userId,
                company_id: req.companyId
            },
            attributes: ['user_id', 'firstName', 'lastName', 'email', 'organizational_position_id'],
            include: [{
                model: OrganizationalPosition,
                as: 'organizationalPosition',
                include: [
                    {
                        model: PayrollPayslipTemplate,
                        as: 'payslipTemplate'
                    },
                    {
                        model: PayrollTemplate,
                        as: 'payrollTemplate'
                    }
                ]
            }]
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            data: {
                user_id: user.user_id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                position: user.organizationalPosition ? {
                    id: user.organizationalPosition.id,
                    code: user.organizationalPosition.position_code,
                    name: user.organizationalPosition.position_name,
                    level: user.organizationalPosition.level_order,
                    payslip_template: user.organizationalPosition.payslipTemplate,
                    payroll_template: user.organizationalPosition.payrollTemplate
                } : null
            }
        });
    } catch (error) {
        console.error('Error fetching user position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
