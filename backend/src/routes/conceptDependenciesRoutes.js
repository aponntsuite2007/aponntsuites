/**
 * conceptDependenciesRoutes.js
 * API REST para gestión del sistema de dependencias de conceptos
 * Multi-tenant: todas las rutas están aisladas por company_id del token JWT
 */

require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const dependencyService = require('../services/ConceptDependencyService');

// JWT_SECRET para autenticación (usar el mismo que authRoutes)
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// =========================================================================
// MIDDLEWARE DE AUTENTICACIÓN
// =========================================================================

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Token requerido' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;
        req.companyId = decoded.company_id;
        req.userId = decoded.id;

        if (!req.companyId) {
            return res.status(400).json({ success: false, error: 'company_id no encontrado en token' });
        }

        next();
    } catch (error) {
        console.error('[AUTH] Error:', error.message);
        return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }
};

// Middleware para verificar rol admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Acceso denegado. Se requiere rol admin.' });
    }
    next();
};

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// =========================================================================
// DEPENDENCY TYPES (Sistema - Solo lectura)
// =========================================================================

/**
 * GET /api/v1/concept-dependencies/types
 * Obtener todos los tipos de dependencia del sistema
 */
router.get('/types', async (req, res) => {
    try {
        const result = await dependencyService.getDependencyTypes();
        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error getting types:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// COMPANY DEPENDENCIES (CRUD Multi-tenant)
// =========================================================================

/**
 * GET /api/v1/concept-dependencies/company
 * Obtener todas las dependencias de la empresa
 * Query params: is_active, dependency_type_id, search
 */
router.get('/company', async (req, res) => {
    try {
        const filters = {
            is_active: req.query.is_active === 'true' ? true :
                       req.query.is_active === 'false' ? false : undefined,
            dependency_type_id: req.query.dependency_type_id,
            search: req.query.search
        };

        const result = await dependencyService.getCompanyDependencies(req.companyId, filters);
        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error getting company dependencies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/concept-dependencies/company/:id
 * Obtener una dependencia específica
 */
router.get('/company/:id', async (req, res) => {
    try {
        const result = await dependencyService.getCompanyDependencyById(
            req.companyId,
            parseInt(req.params.id)
        );

        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error getting dependency:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/concept-dependencies/company
 * Crear nueva dependencia para la empresa
 * Body: { dependency_code, dependency_name, dependency_type_id, description?, config?, icon?, color_hex? }
 */
router.post('/company', requireAdmin, async (req, res) => {
    try {
        const { dependency_code, dependency_name, dependency_type_id } = req.body;

        if (!dependency_code || !dependency_name || !dependency_type_id) {
            return res.status(400).json({
                success: false,
                error: 'dependency_code, dependency_name y dependency_type_id son requeridos'
            });
        }

        const result = await dependencyService.createCompanyDependency(
            req.companyId,
            req.body,
            req.userId
        );

        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error creating dependency:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/v1/concept-dependencies/company/:id
 * Actualizar dependencia existente
 */
router.put('/company/:id', requireAdmin, async (req, res) => {
    try {
        const result = await dependencyService.updateCompanyDependency(
            req.companyId,
            parseInt(req.params.id),
            req.body
        );

        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error updating dependency:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/v1/concept-dependencies/company/:id
 * Eliminar dependencia (soft delete por defecto)
 * Query: hard=true para eliminación permanente
 */
router.delete('/company/:id', requireAdmin, async (req, res) => {
    try {
        const hardDelete = req.query.hard === 'true';
        const result = await dependencyService.deleteCompanyDependency(
            req.companyId,
            parseInt(req.params.id),
            hardDelete
        );

        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error deleting dependency:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// CONCEPT DEPENDENCIES (Vincular conceptos a dependencias)
// =========================================================================

/**
 * POST /api/v1/concept-dependencies/link
 * Vincular una dependencia a un concepto de liquidación
 * Body: { concept_id, dependency_id, on_failure?, failure_message?, multiplier_mode?, evaluation_order? }
 */
router.post('/link', requireAdmin, async (req, res) => {
    try {
        const { concept_id, dependency_id } = req.body;

        if (!concept_id || !dependency_id) {
            return res.status(400).json({
                success: false,
                error: 'concept_id y dependency_id son requeridos'
            });
        }

        const result = await dependencyService.linkDependencyToConcept(req.companyId, req.body);

        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error linking dependency:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/v1/concept-dependencies/link/:conceptId/:dependencyId
 * Desvincular una dependencia de un concepto
 */
router.delete('/link/:conceptId/:dependencyId', requireAdmin, async (req, res) => {
    try {
        const result = await dependencyService.unlinkDependencyFromConcept(
            req.companyId,
            parseInt(req.params.conceptId),
            parseInt(req.params.dependencyId)
        );

        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error unlinking dependency:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/concept-dependencies/concept/:conceptId
 * Obtener dependencias de un concepto
 */
router.get('/concept/:conceptId', async (req, res) => {
    try {
        const result = await dependencyService.getConceptDependencies(
            req.companyId,
            parseInt(req.params.conceptId)
        );
        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error getting concept dependencies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// EMPLOYEE DOCUMENTS
// =========================================================================

/**
 * GET /api/v1/concept-dependencies/documents/:userId
 * Obtener documentos de un empleado
 * Query: dependency_id?, status?, is_current?, family_member_type?
 */
router.get('/documents/:userId', async (req, res) => {
    try {
        const filters = {
            dependency_id: req.query.dependency_id ? parseInt(req.query.dependency_id) : undefined,
            status: req.query.status,
            is_current: req.query.is_current === 'true' ? true :
                        req.query.is_current === 'false' ? false : undefined,
            family_member_type: req.query.family_member_type
        };

        const result = await dependencyService.getEmployeeDocuments(
            req.companyId,
            req.params.userId,
            filters
        );
        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error getting employee documents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/concept-dependencies/my-documents
 * Obtener documentos del usuario autenticado
 */
router.get('/my-documents', async (req, res) => {
    try {
        const filters = {
            dependency_id: req.query.dependency_id ? parseInt(req.query.dependency_id) : undefined,
            status: req.query.status,
            is_current: req.query.is_current !== 'false', // Default: solo vigentes
            family_member_type: req.query.family_member_type
        };

        const result = await dependencyService.getEmployeeDocuments(
            req.companyId,
            req.userId,
            filters
        );
        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error getting my documents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/concept-dependencies/documents/:userId
 * Crear documento para un empleado
 * Body: { dependency_id, family_member_type?, family_member_id?, family_member_name?, issue_date, expiration_date?, file_url?, ... }
 */
router.post('/documents/:userId', async (req, res) => {
    try {
        const { dependency_id, issue_date } = req.body;

        if (!dependency_id || !issue_date) {
            return res.status(400).json({
                success: false,
                error: 'dependency_id e issue_date son requeridos'
            });
        }

        const result = await dependencyService.createEmployeeDocument(
            req.companyId,
            req.params.userId,
            req.body,
            req.userId
        );

        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error creating document:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/v1/concept-dependencies/documents/:documentId
 * Actualizar documento
 */
router.put('/documents/:documentId', async (req, res) => {
    try {
        const result = await dependencyService.updateEmployeeDocument(
            req.companyId,
            parseInt(req.params.documentId),
            req.body,
            req.user.role === 'admin' ? req.userId : null
        );

        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error updating document:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/v1/concept-dependencies/documents/:documentId
 * Eliminar documento
 */
router.delete('/documents/:documentId', requireAdmin, async (req, res) => {
    try {
        const result = await dependencyService.deleteEmployeeDocument(
            req.companyId,
            parseInt(req.params.documentId)
        );

        if (!result.success) {
            return res.status(result.status || 500).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error deleting document:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// EVALUACIÓN DE DEPENDENCIAS
// =========================================================================

/**
 * POST /api/v1/concept-dependencies/evaluate
 * Evaluar si un empleado cumple las dependencias de un concepto
 * Body: { user_id, concept_id, amount, payroll_period? }
 */
router.post('/evaluate', async (req, res) => {
    try {
        const { user_id, concept_id, amount, payroll_period } = req.body;

        if (!user_id || !concept_id || amount === undefined) {
            return res.status(400).json({
                success: false,
                error: 'user_id, concept_id y amount son requeridos'
            });
        }

        const result = await dependencyService.evaluateConceptDependencies(
            req.companyId,
            user_id,
            concept_id,
            parseFloat(amount),
            payroll_period
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error evaluating dependencies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// REPORTES Y ESTADÍSTICAS
// =========================================================================

/**
 * GET /api/v1/concept-dependencies/expiring
 * Obtener documentos próximos a vencer
 * Query: days? (default 30)
 */
router.get('/expiring', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const result = await dependencyService.getExpiringDocuments(req.companyId, days);
        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error getting expiring documents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/concept-dependencies/stats
 * Obtener estadísticas de dependencias de la empresa
 */
router.get('/stats', async (req, res) => {
    try {
        const result = await dependencyService.getDependencyStats(req.companyId);
        res.json(result);
    } catch (error) {
        console.error('[DEPENDENCY-ROUTES] Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
