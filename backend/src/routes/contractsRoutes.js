/**
 * ROUTES: Contracts (Contratos)
 *
 * Endpoints REST para gestión de contratos de servicio
 */

const express = require('express');
const router = express.Router();
const { Contract, Company, Partner, Quote } = require('../config/database');
const { auth: authMiddleware } = require('../middleware/auth');

/**
 * GET /api/contracts/company/:companyId
 * Obtiene todos los contratos de una empresa
 */
router.get('/company/:companyId', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status } = req.query;

    const where = { company_id: companyId };
    if (status) where.status = status;

    const contracts = await Contract.findAll({
      where,
      include: [
        { model: Quote, as: 'quote' },
        { model: Partner, as: 'seller', attributes: ['id', 'name', 'email'] },
        { model: Partner, as: 'supportPartner', attributes: ['id', 'name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      contracts,
      count: contracts.length
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error obteniendo contratos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/company/:companyId/active
 * Obtiene el contrato activo de una empresa
 */
router.get('/company/:companyId/active', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params;

    const contract = await Contract.getActiveContract(companyId);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'No hay contrato activo para esta empresa'
      });
    }

    res.json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error obteniendo contrato activo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/:id
 * Obtiene un contrato por ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await Contract.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: Quote, as: 'quote' },
        { model: Partner, as: 'seller' },
        { model: Partner, as: 'supportPartner' }
      ]
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: `Contrato ${id} no encontrado`
      });
    }

    res.json({
      success: true,
      contract
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error obteniendo contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contracts/:id/suspend
 * Suspende un contrato (por mora u otras razones)
 *
 * Body:
 * {
 *   reason: string (optional)
 * }
 */
router.post('/:id/suspend', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await Contract.findByPk(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: `Contrato ${id} no encontrado`
      });
    }

    await contract.suspend(reason);

    res.json({
      success: true,
      contract,
      message: `Contrato ${contract.contract_number} suspendido`
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error suspendiendo contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contracts/:id/reactivate
 * Reactiva un contrato suspendido
 */
router.post('/:id/reactivate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await Contract.findByPk(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: `Contrato ${id} no encontrado`
      });
    }

    await contract.reactivate();

    res.json({
      success: true,
      contract,
      message: `Contrato ${contract.contract_number} reactivado`
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error reactivando contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contracts/:id/terminate
 * Termina un contrato (cancelación definitiva)
 *
 * Body:
 * {
 *   reason: string (optional)
 * }
 */
router.post('/:id/terminate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await Contract.findByPk(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: `Contrato ${id} no encontrado`
      });
    }

    await contract.terminate(reason);

    res.json({
      success: true,
      contract,
      message: `Contrato ${contract.contract_number} terminado`
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error terminando contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contracts/:id/cancel
 * Cancela un contrato (por solicitud del cliente)
 *
 * Body:
 * {
 *   reason: string (optional)
 * }
 */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await Contract.findByPk(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: `Contrato ${id} no encontrado`
      });
    }

    await contract.cancel(reason);

    res.json({
      success: true,
      contract,
      message: `Contrato ${contract.contract_number} cancelado`
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error cancelando contrato:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/contracts/:id/modules
 * Actualiza los módulos de un contrato (modificación de servicios)
 *
 * Body:
 * {
 *   modules_data: [{module_key, module_name, price, quantity}]
 * }
 */
router.put('/:id/modules', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { modules_data } = req.body;

    if (!Array.isArray(modules_data)) {
      return res.status(400).json({
        success: false,
        error: 'modules_data debe ser un array'
      });
    }

    const contract = await Contract.findByPk(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: `Contrato ${id} no encontrado`
      });
    }

    await contract.updateModules(modules_data);

    res.json({
      success: true,
      contract,
      message: `Módulos del contrato ${contract.contract_number} actualizados`
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error actualizando módulos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/stats/mrr
 * Obtiene el MRR (Monthly Recurring Revenue) global
 */
router.get('/stats/mrr', authMiddleware, async (req, res) => {
  try {
    const mrr = await Contract.getMRR();

    res.json({
      success: true,
      mrr,
      currency: 'USD'
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error obteniendo MRR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/stats/global
 * Obtiene estadísticas globales de contratos
 */
router.get('/stats/global', authMiddleware, async (req, res) => {
  try {
    const stats = await Contract.getGlobalStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/seller/:sellerId/stats
 * Obtiene estadísticas de contratos por vendedor
 */
router.get('/seller/:sellerId/stats', authMiddleware, async (req, res) => {
  try {
    const { sellerId } = req.params;

    const stats = await Contract.getSellerStats(sellerId);

    res.json({
      success: true,
      seller_id: sellerId,
      stats
    });

  } catch (error) {
    console.error('❌ [CONTRACTS API] Error obteniendo estadísticas de vendedor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
