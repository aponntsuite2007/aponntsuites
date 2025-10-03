const express = require('express');
const router = express.Router();
const { Company, SystemModule, CompanyModule, User, sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * @route GET /api/v1/company-pricing/modules
 * @desc Obtener todos los módulos del sistema con precios
 * @access Public (para mostrar en dashboard)
 */
router.get('/modules', async (req, res) => {
  try {
    const { employeeCount = 50 } = req.query;
    
    const modules = await SystemModule.findAll({
      where: { isActive: true },
      order: [['category', 'ASC'], ['displayOrder', 'ASC']]
    });

    // Determinar tier y calcular precios
    const getTier = (employees) => {
      if (employees <= 50) return '1-50';
      if (employees <= 100) return '51-100';
      return '101+';
    };

    const tier = getTier(parseInt(employeeCount));
    
    const modulesWithPricing = modules.map(module => {
      const price = module.getPriceForTier(tier);
      return {
        ...module.toJSON(),
        calculatedPrice: price,
        tier: tier
      };
    });

    res.json({
      success: true,
      data: modulesWithPricing,
      tier: tier,
      employeeCount: parseInt(employeeCount)
    });

  } catch (error) {
    console.error('Error obteniendo módulos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/v1/company-pricing/calculate
 * @desc Calcular precio total para una selección de módulos
 * @access Public
 */
router.post('/calculate', async (req, res) => {
  try {
    const { modules = [], employeeCount = 50 } = req.body;

    if (modules.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe seleccionar al menos un módulo'
      });
    }

    // Obtener módulos del sistema
    const systemModules = await SystemModule.findAll({
      where: {
        moduleKey: { [Op.in]: modules },
        isActive: true
      }
    });

    // Determinar tier
    const getTier = (employees) => {
      if (employees <= 50) return '1-50';
      if (employees <= 100) return '51-100';
      return '101+';
    };

    const tier = getTier(employeeCount);
    
    // Calcular precios
    let subtotal = 0;
    const moduleDetails = [];

    systemModules.forEach(module => {
      const pricePerEmployee = module.getPriceForTier(tier);
      const totalModulePrice = pricePerEmployee * employeeCount;
      
      subtotal += totalModulePrice;
      
      moduleDetails.push({
        moduleKey: module.moduleKey,
        name: module.name,
        pricePerEmployee: pricePerEmployee,
        totalPrice: totalModulePrice,
        icon: module.icon,
        color: module.color
      });
    });

    // Calcular impuestos (IVA 21%)
    const tax = subtotal * 0.21;
    const total = subtotal + tax;

    res.json({
      success: true,
      data: {
        employeeCount,
        tier,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        moduleDetails,
        taxRate: 0.21
      }
    });

  } catch (error) {
    console.error('Error calculando precio:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/v1/company-pricing/companies
 * @desc Obtener empresas con información de precios (mock data)
 * @access Public
 */
router.get('/companies', async (req, res) => {
  try {
    // Mock company data for demonstration
    const mockCompanies = [
      {
        id: 1,
        name: 'Empresa Demo',
        displayName: 'Empresa Demo S.A.',
        taxId: '20-12345678-9',
        email: 'admin@demo.com',
        phone: '+54 11 1234-5678',
        address: 'Av. Principal 123, CABA',
        website: 'https://demo.com',
        isActive: true,
        subscriptionType: 'premium',
        maxUsers: 100,
        createdAt: '2024-01-15',
        modules: [],
        pricing: {
          employeeCount: 100,
          moduleCount: 8,
          monthlySubtotal: 8075.00,
          monthlyTax: 1695.75,
          monthlyTotal: 9770.75,
          tier: '51-100'
        }
      }
    ];

    res.json({
      success: true,
      data: mockCompanies,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 10
      }
    });

  } catch (error) {
    console.error('Error obteniendo empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/v1/company-pricing/companies
 * @desc Crear nueva empresa con módulos y precios
 * @access Private (Super Admin)
 */
router.post('/companies', async (req, res) => {
  try {
    const {
      name,
      displayName,
      taxId,
      email,
      phone,
      address,
      website,
      subscriptionType = 'basic',
      maxUsers = 50,
      modules = []
    } = req.body;

    // Validaciones básicas
    if (!name || !taxId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, CUIT y email son obligatorios'
      });
    }

    if (modules.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe seleccionar al menos un módulo'
      });
    }

    // Mock creation - skip database operations for compatibility
    console.log(`✅ Mock company creation: ${name} with CUIT: ${taxId}`);

    // Determinar tier de precios
    const getTier = (employees) => {
      if (employees <= 50) return '1-50';
      if (employees <= 100) return '51-100';
      return '101+';
    };

    const tier = getTier(maxUsers);

    // Obtener módulos del sistema
    const systemModules = await SystemModule.findAll({
      where: {
        moduleKey: { [Op.in]: modules },
        isActive: true
      }
    });

    // Calcular precios para response mock
    let subtotal = 0;
    const moduleDetails = [];

    systemModules.forEach(module => {
      const pricePerEmployee = module.getPriceForTier(tier);
      const totalModulePrice = pricePerEmployee * maxUsers;
      
      subtotal += totalModulePrice;
      
      moduleDetails.push({
        moduleKey: module.moduleKey,
        name: module.name,
        pricePerEmployee: pricePerEmployee,
        totalPrice: totalModulePrice
      });
    });

    const tax = subtotal * 0.21;
    const total = subtotal + tax;

    // Mock company response
    const mockCompany = {
      id: Math.floor(Math.random() * 1000),
      name,
      displayName: displayName || name,
      taxId,
      email,
      phone,
      address,
      website,
      subscriptionType,
      maxUsers,
      isActive: true,
      createdAt: new Date().toISOString(),
      modules: moduleDetails,
      pricing: {
        employeeCount: maxUsers,
        tier,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        moduleCount: modules.length
      }
    };

    res.status(201).json({
      success: true,
      data: mockCompany,
      message: 'Empresa creada exitosamente (demo)'
    });

  } catch (error) {
    console.error('Error creando empresa:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route PUT /api/v1/company-pricing/companies/:id/modules
 * @desc Actualizar módulos de una empresa
 * @access Private (Super Admin)
 */
router.put('/companies/:id/modules', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { modules = [] } = req.body;
    const companyId = req.params.id;

    if (modules.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe seleccionar al menos un módulo'
      });
    }

    const company = await Company.findByPk(companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Determinar tier actual
    const getTier = (employees) => {
      if (employees <= 50) return '1-50';
      if (employees <= 100) return '51-100';
      return '101+';
    };

    const tier = getTier(company.maxUsers);

    // Desactivar módulos actuales
    await CompanyModule.update(
      { isActive: false },
      {
        where: { companyId },
        transaction
      }
    );

    // Obtener nuevos módulos
    const systemModules = await SystemModule.findAll({
      where: {
        moduleKey: { [Op.in]: modules },
        isActive: true
      }
    });

    // Crear o reactivar módulos
    for (const systemModule of systemModules) {
      const existingModule = await CompanyModule.findOne({
        where: {
          companyId,
          systemModuleId: systemModule.id
        },
        transaction
      });

      const price = systemModule.getPriceForTier(tier);

      if (existingModule) {
        // Reactivar y actualizar precio
        await existingModule.update({
          isActive: true,
          contractedPrice: price,
          employeeTier: tier,
          suspendedAt: null,
          suspendedReason: null
        }, { transaction });
      } else {
        // Crear nuevo módulo
        await CompanyModule.create({
          companyId,
          systemModuleId: systemModule.id,
          contractedPrice: price,
          employeeTier: tier,
          contractedAt: new Date(),
          nextBillingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }, { transaction });
      }
    }

    await transaction.commit();

    // Cargar empresa actualizada
    const updatedCompany = await Company.findByPk(companyId, {
      include: [
        {
          model: CompanyModule,
          as: 'modules',
          where: { isActive: true },
          required: false,
          include: [
            {
              model: SystemModule,
              as: 'systemModule'
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: updatedCompany,
      message: 'Módulos actualizados exitosamente'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error actualizando módulos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;