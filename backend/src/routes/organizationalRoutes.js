/**
 * ORGANIZATIONAL STRUCTURE API ROUTES
 * Sistema de Estructura Organizacional Enterprise
 *
 * Endpoints para:
 * - Sectores (CRUD)
 * - Convenios/Acuerdos Laborales (CRUD)
 * - Categorías Salariales (CRUD)
 * - Roles Adicionales (CRUD)
 * - Vista unificada de estructura
 *
 * Multi-tenant: Todos los endpoints filtran por company_id
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

// Importar modelos desde database.js
const {
    Sector,
    Department,
    User,
    LaborAgreementV2,
    SalaryCategoryV2,
    PayrollCountry,
    Shift,
    Branch,
    Holiday,
    sequelize
} = require('../config/database');

// ============================================================================
// SECTORES
// ============================================================================

// GET /api/v1/organizational/sectors - Listar sectores
router.get('/sectors', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { department_id, include_employees } = req.query;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'company_id requerido' });
        }

        const where = { company_id: companyId, is_active: true };
        if (department_id) where.department_id = department_id;

        const include = [
            {
                model: Department,
                as: 'department',
                attributes: ['id', 'name']
            },
            {
                model: User,
                as: 'supervisor',
                attributes: ['user_id', 'firstName', 'lastName', 'email']
            }
        ];

        if (include_employees === 'true') {
            include.push({
                model: User,
                as: 'employees',
                attributes: ['user_id', 'firstName', 'lastName', 'email', 'position'],
                where: { is_active: true },
                required: false
            });
        }

        const sectors = await Sector.findAll({
            where,
            include,
            order: [['display_order', 'ASC'], ['name', 'ASC']]
        });

        res.json({
            success: true,
            data: sectors,
            count: sectors.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo sectores:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/organizational/sectors - Crear sector
router.post('/sectors', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;
        const { department_id, name, code, description, supervisor_id, max_employees } = req.body;

        if (!companyId || !department_id || !name) {
            return res.status(400).json({
                success: false,
                message: 'company_id, department_id y name son requeridos'
            });
        }

        const sector = await Sector.create({
            company_id: companyId,
            department_id,
            name,
            code,
            description,
            supervisor_id,
            max_employees,
            is_active: true
        });

        res.status(201).json({
            success: true,
            data: sector,
            message: 'Sector creado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error creando sector:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/organizational/sectors/:id - Actualizar sector
router.put('/sectors/:id', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;
        const sector = await Sector.findOne({
            where: { id: req.params.id, company_id: companyId }
        });

        if (!sector) {
            return res.status(404).json({ success: false, message: 'Sector no encontrado' });
        }

        await sector.update(req.body);

        res.json({
            success: true,
            data: sector,
            message: 'Sector actualizado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error actualizando sector:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/v1/organizational/sectors/:id - Eliminar sector (soft delete)
router.delete('/sectors/:id', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const sector = await Sector.findOne({
            where: { id: req.params.id, company_id: companyId }
        });

        if (!sector) {
            return res.status(404).json({ success: false, message: 'Sector no encontrado' });
        }

        await sector.update({ is_active: false });

        res.json({
            success: true,
            message: 'Sector eliminado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error eliminando sector:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// CONVENIOS / ACUERDOS LABORALES
// ============================================================================

// GET /api/v1/organizational/agreements - Listar convenios
router.get('/agreements', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const { country_id, include_categories } = req.query;

        // Usar SQL raw porque el modelo SalaryCategoryV2 no coincide con el schema real
        // El modelo usa 'agreement_id' pero la tabla real usa 'labor_agreement_id'
        let query = `
            SELECT a.*
            FROM labor_agreements_v2 a
            WHERE a.is_active = true
              AND (a.company_id IS NULL ${companyId ? `OR a.company_id = :companyId` : ''})
        `;
        const replacements = {};
        if (companyId) replacements.companyId = companyId;

        if (country_id) {
            query += ' AND a.country_id = :country_id';
            replacements.country_id = country_id;
        }

        query += ' ORDER BY a.name ASC';

        const [agreements] = await sequelize.query(query, { replacements });

        // Si se solicitan categorías, cargarlas con SQL raw usando labor_agreement_id
        if (include_categories === 'true' && agreements.length > 0) {
            const agreementIds = agreements.map(a => a.id);
            const [categories] = await sequelize.query(`
                SELECT * FROM salary_categories_v2
                WHERE is_active = true AND labor_agreement_id IN (:agreementIds)
                ORDER BY seniority_level ASC, category_name ASC
            `, { replacements: { agreementIds } });

            // Mapear categorías a convenios
            agreements.forEach(a => {
                a.categories = categories.filter(c => c.labor_agreement_id === a.id);
            });
        }

        res.json({
            success: true,
            data: agreements,
            count: agreements.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo convenios:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/organizational/agreements - Crear convenio
router.post('/agreements', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;
        const {
            code, name, short_name, industry, country_id,
            base_work_hours_weekly, base_work_hours_daily,
            overtime_50_multiplier, overtime_100_multiplier,
            night_shift_multiplier, vacation_days_by_seniority
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del convenio es requerido'
            });
        }

        const agreement = await LaborAgreementV2.create({
            company_id: companyId,
            country_id,
            code,
            name,
            short_name,
            industry,
            base_work_hours_weekly: base_work_hours_weekly || 40,
            base_work_hours_daily: base_work_hours_daily || 8,
            overtime_50_multiplier: overtime_50_multiplier || 1.5,
            overtime_100_multiplier: overtime_100_multiplier || 2.0,
            night_shift_multiplier: night_shift_multiplier || 1.0,
            vacation_days_by_seniority: vacation_days_by_seniority || {},
            is_active: true
        });

        res.status(201).json({
            success: true,
            data: agreement,
            message: 'Convenio creado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error creando convenio:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/organizational/agreements/:id - Actualizar convenio
router.put('/agreements/:id', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;

        // Usar SQL raw para verificar el convenio
        const [agreements] = await sequelize.query(`
            SELECT * FROM labor_agreements_v2
            WHERE id = :id AND (company_id IS NULL ${companyId ? `OR company_id = :companyId` : ''})
        `, { replacements: { id: req.params.id, companyId } });

        if (agreements.length === 0) {
            return res.status(404).json({ success: false, message: 'Convenio no encontrado' });
        }

        const agreement = agreements[0];

        // Solo actualizar si es de la empresa (no globales)
        if (agreement.company_id === null && companyId) {
            return res.status(403).json({
                success: false,
                message: 'No puede modificar convenios globales. Cree una copia personalizada.'
            });
        }

        // Actualizar con SQL raw
        const {
            code, name, short_name, industry, country_id,
            base_work_hours_weekly, base_work_hours_daily,
            overtime_50_multiplier, overtime_100_multiplier,
            night_shift_multiplier
        } = req.body;

        await sequelize.query(`
            UPDATE labor_agreements_v2
            SET code = COALESCE(:code, code),
                name = COALESCE(:name, name),
                short_name = COALESCE(:short_name, short_name),
                industry = COALESCE(:industry, industry),
                country_id = COALESCE(:country_id, country_id),
                base_work_hours_weekly = COALESCE(:base_work_hours_weekly, base_work_hours_weekly),
                base_work_hours_daily = COALESCE(:base_work_hours_daily, base_work_hours_daily),
                overtime_50_multiplier = COALESCE(:overtime_50_multiplier, overtime_50_multiplier),
                overtime_100_multiplier = COALESCE(:overtime_100_multiplier, overtime_100_multiplier),
                night_shift_multiplier = COALESCE(:night_shift_multiplier, night_shift_multiplier),
                updated_at = NOW()
            WHERE id = :id
        `, {
            replacements: {
                id: req.params.id,
                code, name, short_name, industry, country_id,
                base_work_hours_weekly, base_work_hours_daily,
                overtime_50_multiplier, overtime_100_multiplier,
                night_shift_multiplier
            }
        });

        res.json({
            success: true,
            message: 'Convenio actualizado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error actualizando convenio:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// CATEGORÍAS SALARIALES
// ============================================================================

// GET /api/v1/organizational/categories - Listar categorías
router.get('/categories', async (req, res) => {
    try {
        const { agreement_id } = req.query;

        // Usar SQL raw porque el modelo no coincide con el schema real
        let query = `
            SELECT
                c.id, c.labor_agreement_id, c.company_id,
                c.category_code, c.category_name, c.description,
                c.base_salary_min, c.base_salary_max,
                c.hourly_rate_min, c.hourly_rate_max,
                c.recommended_base_salary, c.recommended_hourly_rate,
                c.seniority_level, c.is_active,
                c.effective_from, c.effective_to,
                a.code as agreement_code, a.name as agreement_name
            FROM salary_categories_v2 c
            LEFT JOIN labor_agreements_v2 a ON c.labor_agreement_id = a.id
            WHERE c.is_active = true
        `;
        const replacements = {};

        if (agreement_id) {
            query += ' AND c.labor_agreement_id = :agreement_id';
            replacements.agreement_id = agreement_id;
        }

        query += ' ORDER BY c.seniority_level ASC, c.category_name ASC';

        const [categories] = await sequelize.query(query, { replacements });

        res.json({
            success: true,
            data: categories,
            count: categories.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo categorías:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/organizational/categories - Crear categoría
router.post('/categories', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;
        const {
            labor_agreement_id, category_code, category_name, description,
            base_salary_min, base_salary_max, hourly_rate_min, hourly_rate_max,
            recommended_base_salary, recommended_hourly_rate, seniority_level
        } = req.body;

        if (!labor_agreement_id || !category_code || !category_name) {
            return res.status(400).json({
                success: false,
                message: 'labor_agreement_id, category_code y category_name son requeridos'
            });
        }

        const [result] = await sequelize.query(`
            INSERT INTO salary_categories_v2 (
                labor_agreement_id, company_id, category_code, category_name, description,
                base_salary_min, base_salary_max, hourly_rate_min, hourly_rate_max,
                recommended_base_salary, recommended_hourly_rate, seniority_level,
                is_active, created_at, updated_at
            ) VALUES (
                :labor_agreement_id, :company_id, :category_code, :category_name, :description,
                :base_salary_min, :base_salary_max, :hourly_rate_min, :hourly_rate_max,
                :recommended_base_salary, :recommended_hourly_rate, :seniority_level,
                true, NOW(), NOW()
            )
            RETURNING *
        `, {
            replacements: {
                labor_agreement_id,
                company_id: companyId,
                category_code,
                category_name,
                description: description || null,
                base_salary_min: base_salary_min || 0,
                base_salary_max: base_salary_max || 0,
                hourly_rate_min: hourly_rate_min || 0,
                hourly_rate_max: hourly_rate_max || 0,
                recommended_base_salary: recommended_base_salary || 0,
                recommended_hourly_rate: recommended_hourly_rate || 0,
                seniority_level: seniority_level || 1
            }
        });

        res.status(201).json({
            success: true,
            data: result[0],
            message: 'Categoría salarial creada exitosamente'
        });
    } catch (error) {
        console.error('❌ Error creando categoría:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/organizational/categories/:id - Actualizar categoría
router.put('/categories/:id', async (req, res) => {
    try {
        const {
            category_code, category_name, description,
            base_salary_min, base_salary_max, hourly_rate_min, hourly_rate_max,
            recommended_base_salary, recommended_hourly_rate, seniority_level
        } = req.body;

        await sequelize.query(`
            UPDATE salary_categories_v2
            SET category_code = COALESCE(:category_code, category_code),
                category_name = COALESCE(:category_name, category_name),
                description = COALESCE(:description, description),
                base_salary_min = COALESCE(:base_salary_min, base_salary_min),
                base_salary_max = COALESCE(:base_salary_max, base_salary_max),
                hourly_rate_min = COALESCE(:hourly_rate_min, hourly_rate_min),
                hourly_rate_max = COALESCE(:hourly_rate_max, hourly_rate_max),
                recommended_base_salary = COALESCE(:recommended_base_salary, recommended_base_salary),
                recommended_hourly_rate = COALESCE(:recommended_hourly_rate, recommended_hourly_rate),
                seniority_level = COALESCE(:seniority_level, seniority_level),
                updated_at = NOW()
            WHERE id = :id
        `, {
            replacements: {
                id: req.params.id,
                category_code,
                category_name,
                description,
                base_salary_min,
                base_salary_max,
                hourly_rate_min,
                hourly_rate_max,
                recommended_base_salary,
                recommended_hourly_rate,
                seniority_level
            }
        });

        res.json({
            success: true,
            message: 'Categoría actualizada exitosamente'
        });
    } catch (error) {
        console.error('❌ Error actualizando categoría:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/v1/organizational/categories/:id - Eliminar categoría
router.delete('/categories/:id', async (req, res) => {
    try {
        await sequelize.query(`
            UPDATE salary_categories_v2 SET is_active = false, updated_at = NOW() WHERE id = :id
        `, {
            replacements: { id: req.params.id }
        });

        res.json({
            success: true,
            message: 'Categoría eliminada exitosamente'
        });
    } catch (error) {
        console.error('❌ Error eliminando categoría:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// ROLES ADICIONALES
// ============================================================================

// GET /api/v1/organizational/roles - Listar roles adicionales
router.get('/roles', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        // Roles globales + roles de la empresa
        // La tabla puede no existir en algunas instalaciones
        let result = [];
        try {
            result = await sequelize.query(`
                SELECT
                    id, role_key, role_name, description, category,
                    icon, color, requires_certification,
                    certification_validity_months, scoring_bonus,
                    responsibilities, required_training,
                    company_id, is_active
                FROM additional_role_types
                WHERE is_active = true
                  AND (company_id IS NULL OR company_id = :companyId)
                ORDER BY category, role_name
            `, {
                replacements: { companyId },
                type: sequelize.QueryTypes.SELECT
            });
        } catch (tableError) {
            console.log('⚠️ additional_role_types table not found');
        }

        res.json({
            success: true,
            data: result,
            count: result.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo roles:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/organizational/roles - Crear rol adicional
router.post('/roles', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;
        const {
            role_key, role_name, description, category,
            icon, color, requires_certification,
            certification_validity_months, scoring_bonus,
            responsibilities, required_training
        } = req.body;

        if (!role_key || !role_name) {
            return res.status(400).json({
                success: false,
                message: 'role_key y role_name son requeridos'
            });
        }

        const [result] = await sequelize.query(`
            INSERT INTO additional_role_types (
                role_key, role_name, description, category,
                icon, color, requires_certification,
                certification_validity_months, scoring_bonus,
                responsibilities, required_training,
                company_id, is_active, created_at, updated_at
            ) VALUES (
                :role_key, :role_name, :description, :category,
                :icon, :color, :requires_certification,
                :certification_validity_months, :scoring_bonus,
                :responsibilities, :required_training,
                :company_id, true, NOW(), NOW()
            )
            RETURNING *
        `, {
            replacements: {
                role_key,
                role_name,
                description: description || null,
                category: category || 'otros',
                icon: icon || '🏷️',
                color: color || '#6c757d',
                requires_certification: requires_certification || false,
                certification_validity_months: certification_validity_months || 12,
                scoring_bonus: scoring_bonus || 0.05,
                responsibilities: JSON.stringify(responsibilities || []),
                required_training: JSON.stringify(required_training || []),
                company_id: companyId
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.status(201).json({
            success: true,
            data: result[0],
            message: 'Rol adicional creado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error creando rol:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/organizational/roles/:id - Actualizar rol
router.put('/roles/:id', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;
        const { role_name, description, category, icon, color,
                requires_certification, certification_validity_months,
                scoring_bonus, responsibilities, required_training } = req.body;

        await sequelize.query(`
            UPDATE additional_role_types
            SET role_name = COALESCE(:role_name, role_name),
                description = COALESCE(:description, description),
                category = COALESCE(:category, category),
                icon = COALESCE(:icon, icon),
                color = COALESCE(:color, color),
                requires_certification = COALESCE(:requires_certification, requires_certification),
                certification_validity_months = COALESCE(:certification_validity_months, certification_validity_months),
                scoring_bonus = COALESCE(:scoring_bonus, scoring_bonus),
                responsibilities = COALESCE(:responsibilities, responsibilities),
                required_training = COALESCE(:required_training, required_training),
                updated_at = NOW()
            WHERE id = :id AND (company_id IS NULL OR company_id = :companyId)
        `, {
            replacements: {
                id: req.params.id,
                companyId,
                role_name,
                description,
                category,
                icon,
                color,
                requires_certification,
                certification_validity_months,
                scoring_bonus,
                responsibilities: responsibilities ? JSON.stringify(responsibilities) : null,
                required_training: required_training ? JSON.stringify(required_training) : null
            }
        });

        res.json({
            success: true,
            message: 'Rol actualizado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error actualizando rol:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/v1/organizational/roles/:id - Eliminar rol (soft delete)
router.delete('/roles/:id', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;
        const roleId = req.params.id;

        // Verificar que el rol existe y pertenece a la empresa (o es global null)
        const [existingRoles] = await sequelize.query(`
            SELECT id, company_id, role_name FROM additional_role_types
            WHERE id = :roleId AND (company_id IS NULL OR company_id = :companyId)
        `, { replacements: { roleId, companyId } });

        if (existingRoles.length === 0) {
            return res.status(404).json({ success: false, message: 'Rol no encontrado' });
        }

        const role = existingRoles[0];

        // No permitir eliminar roles globales (company_id = null) desde empresa
        if (role.company_id === null && companyId) {
            return res.status(403).json({
                success: false,
                message: 'No puede eliminar roles predefinidos del sistema'
            });
        }

        // Soft delete
        await sequelize.query(`
            UPDATE additional_role_types
            SET is_active = false, "updatedAt" = NOW()
            WHERE id = :roleId
        `, { replacements: { roleId } });

        res.json({
            success: true,
            message: `Rol "${role.role_name}" eliminado exitosamente`
        });
    } catch (error) {
        console.error('❌ Error eliminando rol:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// ESTRUCTURA COMPLETA
// ============================================================================

// GET /api/v1/organizational/structure - Vista completa de estructura
router.get('/structure', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.query.company_id;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'company_id requerido' });
        }

        // Obtener departamentos con sectores
        const departments = await Department.findAll({
            where: { company_id: companyId, is_active: true },
            include: [{
                model: Sector,
                as: 'sectors',
                where: { is_active: true },
                required: false
            }],
            order: [['name', 'ASC']]
        });

        // Obtener convenios (sin include de SalaryCategoryV2 porque el modelo no coincide con el schema)
        const agreements = await LaborAgreementV2.findAll({
            where: {
                is_active: true,
                [Op.or]: [{ company_id: null }, { company_id: companyId }]
            }
        });

        // Cargar categorías por convenio usando SQL raw
        const [categoriesRaw] = await sequelize.query(`
            SELECT * FROM salary_categories_v2
            WHERE is_active = true AND labor_agreement_id IN (
                SELECT id FROM labor_agreements_v2
                WHERE is_active = true AND (company_id IS NULL OR company_id = :companyId)
            )
            ORDER BY seniority_level ASC, category_name ASC
        `, { replacements: { companyId } });

        // Mapear categorías a convenios
        const agreementsWithCategories = agreements.map(a => ({
            ...a.toJSON(),
            categories: categoriesRaw.filter(c => c.labor_agreement_id === a.id)
        }));

        // Obtener turnos (isActive en camelCase porque así está en la BD)
        const shifts = await Shift.findAll({
            where: { company_id: companyId, isActive: true }
        });

        // Obtener roles (tabla puede no existir en todas las instalaciones)
        let roles = [];
        try {
            const [rolesResult] = await sequelize.query(`
                SELECT * FROM additional_role_types
                WHERE is_active = true AND (company_id IS NULL OR company_id = :companyId)
                ORDER BY category, role_name
            `, { replacements: { companyId } });
            roles = rolesResult;
        } catch (rolesError) {
            console.log('⚠️ additional_role_types table not found, roles will be empty');
        }

        // Estadísticas
        const [stats] = await sequelize.query(`
            SELECT
                (SELECT COUNT(*) FROM departments WHERE company_id = :companyId AND is_active = true) AS total_departments,
                (SELECT COUNT(*) FROM sectors WHERE company_id = :companyId AND is_active = true) AS total_sectors,
                (SELECT COUNT(*) FROM shifts WHERE company_id = :companyId AND "isActive" = true) AS total_shifts,
                (SELECT COUNT(*) FROM users WHERE company_id = :companyId AND is_active = true) AS total_employees,
                (SELECT COUNT(DISTINCT salary_category_id) FROM users WHERE company_id = :companyId AND is_active = true AND salary_category_id IS NOT NULL) AS employees_with_category
        `, { replacements: { companyId } });

        res.json({
            success: true,
            data: {
                departments,
                agreements: agreementsWithCategories,
                shifts,
                roles,
                stats: stats[0]
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo estructura:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/organizational/countries - Listar países configurados
router.get('/countries', async (req, res) => {
    try {
        const countries = await PayrollCountry.findAll({
            where: { is_active: true },
            attributes: ['id', 'country_code', 'country_name', 'currency_code', 'currency_symbol',
                        'labor_law_name', 'default_pay_frequency'],
            order: [['country_name', 'ASC']]
        });

        res.json({
            success: true,
            data: countries,
            count: countries.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo países:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// ASIGNACIÓN DE CATEGORÍA A EMPLEADO
// ============================================================================

// PUT /api/v1/organizational/employees/:userId/category - Asignar categoría salarial
router.put('/employees/:userId/category', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;
        const { salary_category_id } = req.body;

        const user = await User.findOne({
            where: { user_id: req.params.userId, company_id: companyId }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }

        await user.update({ salary_category_id });

        res.json({
            success: true,
            message: 'Categoría salarial asignada exitosamente'
        });
    } catch (error) {
        console.error('❌ Error asignando categoría:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/organizational/employees/:userId/sector - Asignar sector
router.put('/employees/:userId/sector', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;
        const { sector_id } = req.body;

        const user = await User.findOne({
            where: { user_id: req.params.userId, company_id: companyId }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }

        await user.update({ sector_id });

        res.json({
            success: true,
            message: 'Sector asignado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error asignando sector:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/organizational/employees/:userId/roles - Asignar roles adicionales
router.put('/employees/:userId/roles', async (req, res) => {
    try {
        const companyId = req.user?.company_id || req.body.company_id;
        const { additional_roles } = req.body;

        const user = await User.findOne({
            where: { user_id: req.params.userId, company_id: companyId }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }

        await user.update({ additional_roles: additional_roles || [] });

        res.json({
            success: true,
            message: 'Roles adicionales asignados exitosamente'
        });
    } catch (error) {
        console.error('❌ Error asignando roles:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================================
// FERIADOS Y CALENDARIOS DE TURNOS
// ============================================================================

// GET /api/v1/organizational/shifts/:shiftId/holidays - Obtener feriados del turno según país de sucursal
router.get('/shifts/:shiftId/holidays', async (req, res) => {
    try {
        const { shiftId } = req.params;
        const { year } = req.query;
        const currentYear = year || new Date().getFullYear();

        // Obtener el turno con su sucursal usando SQL raw para evitar problemas con asociaciones
        const [shifts] = await sequelize.query(`
            SELECT s.id, s.name, s."startTime", s."endTime", s.branch_id, s.respect_national_holidays, s.respect_provincial_holidays, s.custom_non_working_days,
                   b.id as "branch_id_val", b.name as "branch_name", b.country as "branch_country", b.state_province as "branch_state_province"
            FROM shifts s
            LEFT JOIN branches b ON b.id = s.branch_id
            WHERE s.id = :shiftId
        `, { replacements: { shiftId } });

        if (shifts.length === 0) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        const shift = shifts[0];
        const branch = shift.branch_id_val ? {
            id: shift.branch_id_val,
            name: shift.branch_name,
            country: shift.branch_country,
            state_province: shift.branch_state_province
        } : null;
        if (!branch || !branch.country) {
            return res.json({
                success: true,
                data: {
                    shift: { id: shift.id, name: shift.name },
                    branch: null,
                    holidays: [],
                    custom_non_working_days: shift.custom_non_working_days || [],
                    settings: {
                        respect_national_holidays: shift.respect_national_holidays,
                        respect_provincial_holidays: shift.respect_provincial_holidays
                    },
                    message: 'El turno no tiene sucursal asignada o la sucursal no tiene país configurado'
                }
            });
        }

        // Mapear código de país corto a nombre completo (AR -> Argentina)
        const countryMap = {
            'AR': 'Argentina',
            'CL': 'Chile',
            'BO': 'Bolivia',
            'PE': 'Peru',
            'UY': 'Uruguay',
            'PY': 'Paraguay',
            'BR': 'Brasil',
            'CO': 'Colombia',
            'EC': 'Ecuador',
            'MX': 'Mexico',
            'VE': 'Venezuela'
        };
        const countryName = countryMap[branch.country] || branch.country;

        // Construir query para feriados
        const startDate = `${currentYear}-01-01`;
        const endDate = `${currentYear}-12-31`;

        let holidays = [];

        // Si respeta feriados nacionales, obtenerlos
        if (shift.respect_national_holidays) {
            const nationalHolidays = await Holiday.findAll({
                where: {
                    country: countryName,
                    is_national: true,
                    date: { [Op.between]: [startDate, endDate] }
                },
                order: [['date', 'ASC']]
            });
            holidays = holidays.concat(nationalHolidays.map(h => ({
                ...h.toJSON(),
                type: 'national'
            })));
        }

        // Si respeta feriados provinciales y la sucursal tiene provincia
        if (shift.respect_provincial_holidays && branch.state_province) {
            const provincialHolidays = await Holiday.findAll({
                where: {
                    country: countryName,
                    state_province: branch.state_province,
                    is_provincial: true,
                    date: { [Op.between]: [startDate, endDate] }
                },
                order: [['date', 'ASC']]
            });
            holidays = holidays.concat(provincialHolidays.map(h => ({
                ...h.toJSON(),
                type: 'provincial'
            })));
        }

        // Ordenar por fecha
        holidays.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            success: true,
            data: {
                shift: {
                    id: shift.id,
                    name: shift.name,
                    start_time: shift.start_time,
                    end_time: shift.end_time
                },
                branch: {
                    id: branch.id,
                    name: branch.name,
                    country: branch.country,
                    country_name: countryName,
                    state_province: branch.state_province
                },
                holidays,
                custom_non_working_days: shift.custom_non_working_days || [],
                settings: {
                    respect_national_holidays: shift.respect_national_holidays,
                    respect_provincial_holidays: shift.respect_provincial_holidays
                },
                year: currentYear,
                total_holidays: holidays.length
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo feriados del turno:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/organizational/shifts/:shiftId/calendar - Calendario completo del turno
router.get('/shifts/:shiftId/calendar', async (req, res) => {
    try {
        const { shiftId } = req.params;
        const { year, month } = req.query;
        const currentYear = parseInt(year) || new Date().getFullYear();
        const currentMonth = month ? parseInt(month) : null; // null = todo el año

        // Obtener el turno con su sucursal
        const shift = await Shift.findByPk(shiftId, {
            include: [{
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name', 'country', 'state_province']
            }]
        });

        if (!shift) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        const branch = shift.branch;
        const countryMap = {
            'AR': 'Argentina', 'CL': 'Chile', 'BO': 'Bolivia', 'PE': 'Peru',
            'UY': 'Uruguay', 'PY': 'Paraguay', 'BR': 'Brasil', 'CO': 'Colombia',
            'EC': 'Ecuador', 'MX': 'Mexico', 'VE': 'Venezuela'
        };
        const countryName = branch ? (countryMap[branch.country] || branch.country) : null;

        // Definir rango de fechas
        let startDate, endDate;
        if (currentMonth) {
            startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(currentYear, currentMonth, 0).getDate();
            endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;
        } else {
            startDate = `${currentYear}-01-01`;
            endDate = `${currentYear}-12-31`;
        }

        // Obtener feriados
        let holidays = [];
        if (countryName && shift.respect_national_holidays) {
            const nationalHolidays = await Holiday.findAll({
                where: {
                    country: countryName,
                    is_national: true,
                    date: { [Op.between]: [startDate, endDate] }
                }
            });
            holidays = holidays.concat(nationalHolidays.map(h => h.toJSON()));
        }

        if (countryName && shift.respect_provincial_holidays && branch?.state_province) {
            const provincialHolidays = await Holiday.findAll({
                where: {
                    country: countryName,
                    state_province: branch.state_province,
                    is_provincial: true,
                    date: { [Op.between]: [startDate, endDate] }
                }
            });
            holidays = holidays.concat(provincialHolidays.map(h => h.toJSON()));
        }

        // Crear mapa de feriados por fecha
        const holidayMap = {};
        holidays.forEach(h => {
            holidayMap[h.date] = h;
        });

        // Crear mapa de días no laborables personalizados
        const customDaysMap = {};
        (shift.custom_non_working_days || []).forEach(d => {
            customDaysMap[d.date] = d;
        });

        // Días de trabajo del turno (0=Domingo, 1=Lunes, ..., 6=Sábado)
        const workDays = shift.days || shift.work_days || [1, 2, 3, 4, 5]; // Por defecto L-V

        // Generar calendario
        const calendar = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayOfWeek = d.getDay();
            const isWorkDay = workDays.includes(dayOfWeek) || workDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek);
            const holiday = holidayMap[dateStr];
            const customDay = customDaysMap[dateStr];

            let status = 'working'; // Por defecto día laboral
            let reason = null;

            if (!isWorkDay) {
                status = 'rest';
                reason = 'Día de descanso';
            } else if (holiday) {
                status = 'holiday';
                reason = holiday.name;
            } else if (customDay) {
                status = 'custom_non_working';
                reason = customDay.reason || 'Día no laborable';
            }

            calendar.push({
                date: dateStr,
                day_of_week: dayOfWeek,
                day_name: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek],
                status,
                reason,
                holiday: holiday ? { name: holiday.name, is_national: holiday.is_national } : null,
                custom_day: customDay || null
            });
        }

        res.json({
            success: true,
            data: {
                shift: {
                    id: shift.id,
                    name: shift.name,
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    work_days: workDays
                },
                branch: branch ? {
                    id: branch.id,
                    name: branch.name,
                    country: branch.country,
                    country_name: countryName
                } : null,
                year: currentYear,
                month: currentMonth,
                calendar,
                summary: {
                    total_days: calendar.length,
                    working_days: calendar.filter(d => d.status === 'working').length,
                    rest_days: calendar.filter(d => d.status === 'rest').length,
                    holidays: calendar.filter(d => d.status === 'holiday').length,
                    custom_non_working: calendar.filter(d => d.status === 'custom_non_working').length
                }
            }
        });
    } catch (error) {
        console.error('❌ Error generando calendario:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/organizational/shifts/:shiftId/custom-days - Actualizar días no laborables personalizados
router.put('/shifts/:shiftId/custom-days', async (req, res) => {
    try {
        const { shiftId } = req.params;
        const { custom_non_working_days, action, day } = req.body;

        const shift = await Shift.findByPk(shiftId);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        let updatedDays = shift.custom_non_working_days || [];

        if (action === 'add' && day) {
            // Agregar un día específico
            const exists = updatedDays.some(d => d.date === day.date);
            if (!exists) {
                updatedDays.push({
                    date: day.date,
                    reason: day.reason || 'Día no laborable',
                    created_at: new Date().toISOString()
                });
            }
        } else if (action === 'remove' && day) {
            // Eliminar un día específico
            updatedDays = updatedDays.filter(d => d.date !== day.date);
        } else if (custom_non_working_days) {
            // Reemplazar todo el array
            updatedDays = custom_non_working_days;
        }

        await shift.update({ custom_non_working_days: updatedDays });

        res.json({
            success: true,
            message: 'Días no laborables actualizados',
            data: {
                shift_id: shift.id,
                custom_non_working_days: updatedDays,
                total: updatedDays.length
            }
        });
    } catch (error) {
        console.error('❌ Error actualizando días personalizados:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/organizational/shifts/:shiftId/holiday-settings - Actualizar configuración de feriados
router.put('/shifts/:shiftId/holiday-settings', async (req, res) => {
    try {
        const { shiftId } = req.params;
        const { respect_national_holidays, respect_provincial_holidays } = req.body;

        const shift = await Shift.findByPk(shiftId);
        if (!shift) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        const updates = {};
        if (typeof respect_national_holidays === 'boolean') {
            updates.respect_national_holidays = respect_national_holidays;
        }
        if (typeof respect_provincial_holidays === 'boolean') {
            updates.respect_provincial_holidays = respect_provincial_holidays;
        }

        await shift.update(updates);

        res.json({
            success: true,
            message: 'Configuración de feriados actualizada',
            data: {
                shift_id: shift.id,
                respect_national_holidays: shift.respect_national_holidays,
                respect_provincial_holidays: shift.respect_provincial_holidays
            }
        });
    } catch (error) {
        console.error('❌ Error actualizando configuración de feriados:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/organizational/holidays - Obtener todos los feriados (por país y año)
router.get('/holidays', async (req, res) => {
    try {
        const { country, year, include_provincial } = req.query;
        const currentYear = year || new Date().getFullYear();

        const where = {
            year: currentYear
        };

        if (country) {
            // Mapear código a nombre
            const countryMap = {
                'AR': 'Argentina', 'CL': 'Chile', 'BO': 'Bolivia', 'PE': 'Peru',
                'UY': 'Uruguay', 'PY': 'Paraguay', 'BR': 'Brasil', 'CO': 'Colombia',
                'EC': 'Ecuador', 'MX': 'Mexico', 'VE': 'Venezuela'
            };
            where.country = countryMap[country] || country;
        }

        if (include_provincial !== 'true') {
            where.is_national = true;
        }

        const holidays = await Holiday.findAll({
            where,
            order: [['country', 'ASC'], ['date', 'ASC']]
        });

        // Agrupar por país
        const grouped = {};
        holidays.forEach(h => {
            if (!grouped[h.country]) grouped[h.country] = [];
            grouped[h.country].push(h);
        });

        res.json({
            success: true,
            data: grouped,
            total: holidays.length,
            year: currentYear
        });
    } catch (error) {
        console.error('❌ Error obteniendo feriados:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
