/**
 * ASSOCIATE ROUTES v1.0
 * API para gestión de asociados APONNT y contratos
 *
 * @version 1.0
 * @date 2025-12-06
 */

const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const AssociateService = require('../services/AssociateService');

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
