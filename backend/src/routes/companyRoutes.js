const express = require('express');
const router = express.Router();
const { multiTenantDB } = require('../config/multiTenantDatabase');
const { auth, requireRole } = require('../middleware/auth');

/**
 * Company Management Routes
 * Handles multi-tenant company operations
 */

// 📋 Get all companies (Super Admin only)
router.get('/', auth, requireRole(['super_admin']), async (req, res) => {
  try {
    const masterConn = await multiTenantDB.getMasterConnection();
    const Company = require('../models/Company')(masterConn);
    
    const companies = await Company.findAll({
      attributes: [
        'id', 'name', 'slug', 'displayName', 'email', 'phone',
        'subscriptionType', 'maxUsers', 'isActive', 'isTrial',
        'trialExpiresAt', 'createdAt', 'updatedAt'
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      companies: companies,
      total: companies.length
    });
    
  } catch (error) {
    console.error('Error getting companies:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 🏢 Get company by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const company = await multiTenantDB.getCompanyBySlug(slug);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }
    
    // Remove sensitive information for public access
    const publicInfo = {
      id: company.company_id,
      name: company.name,
      slug: company.slug,
      displayName: company.displayName,
      logo: company.logo,
      primaryColor: company.primaryColor,
      secondaryColor: company.secondaryColor,
      timezone: company.timezone,
      locale: company.locale,
      currency: company.currency,
      features: company.features,
      isActive: company.isActive
    };
    
    res.json({
      success: true,
      company: publicInfo
    });
    
  } catch (error) {
    console.error('Error getting company:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ➕ Create new company
router.post('/', auth, requireRole(['super_admin']), async (req, res) => {
  try {
    const {
      name,
      slug,
      displayName,
      description,
      email,
      phone,
      address,
      website,
      taxId,
      registrationNumber,
      primaryColor,
      secondaryColor,
      timezone,
      locale,
      currency,
      subscriptionType,
      maxUsers,
      features,
      passwordPolicy,
      twoFactorRequired,
      sessionTimeout
    } = req.body;
    
    // Validation
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y slug son requeridos'
      });
    }
    
    const masterConn = await multiTenantDB.getMasterConnection();
    const Company = require('../models/Company')(masterConn);
    
    // Check if slug already exists
    const existingCompany = await Company.findOne({ where: { slug } });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una empresa con ese slug'
      });
    }
    
    // Generate database schema name
    const databaseSchema = `tenant_${slug.toLowerCase()}`;
    
    // Create company record
    const company = await Company.create({
      name,
      slug,
      displayName: displayName || name,
      description,
      databaseSchema,
      email,
      phone,
      address,
      website,
      taxId,
      registrationNumber,
      primaryColor: primaryColor || '#0066CC',
      secondaryColor: secondaryColor || '#666666',
      timezone: timezone || 'America/Argentina/Buenos_Aires',
      locale: locale || 'es-AR',
      currency: currency || 'ARS',
      subscriptionType: subscriptionType || 'basic',
      maxUsers: maxUsers || 50,
      features: features || {
        biometric: true,
        attendance: true,
        medical: true,
        reports: true,
        departments: true,
        gpsTracking: true,
        multiuser: true,
        realTimeSync: true
      },
      passwordPolicy: passwordPolicy || {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSymbols: false
      },
      twoFactorRequired: twoFactorRequired || false,
      sessionTimeout: sessionTimeout || 480,
      isActive: true,
      createdBy: req.user.user_id
    });
    
    // Create company schema and tables
    try {
      await multiTenantDB.createCompanySchema(company.toJSON());
      console.log(`✅ Company ${name} created with schema ${databaseSchema}`);
    } catch (schemaError) {
      console.error('Error creating company schema:', schemaError);
      
      // Rollback: delete company record
      await company.destroy();
      
      return res.status(500).json({
        success: false,
        error: 'Error creando esquema de base de datos para la empresa'
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Empresa creada exitosamente',
      company: {
        id: company.company_id,
        name: company.name,
        slug: company.slug,
        displayName: company.displayName,
        databaseSchema: company.databaseSchema,
        subscriptionType: company.subscriptionType,
        maxUsers: company.maxUsers,
        isActive: company.isActive
      }
    });
    
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ✏️ Update company
router.put('/:id', auth, requireRole(['super_admin', 'company_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const masterConn = await multiTenantDB.getMasterConnection();
    const Company = require('../models/Company')(masterConn);
    
    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }
    
    // Restrict fields that company admins can update
    if (req.user.role === 'company_admin') {
      // Company admins can only update their own company and limited fields
      const allowedFields = [
        'displayName', 'description', 'email', 'phone', 'address', 
        'website', 'logo', 'primaryColor', 'secondaryColor',
        'timezone', 'locale', 'currency', 'passwordPolicy',
        'twoFactorRequired', 'sessionTimeout'
      ];
      
      updateData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {});
    }
    
    // Update company
    await company.update({
      ...updateData,
      lastConfigUpdate: new Date()
    });
    
    res.json({
      success: true,
      message: 'Empresa actualizada exitosamente',
      company: {
        id: company.company_id,
        name: company.name,
        slug: company.slug,
        displayName: company.displayName,
        isActive: company.isActive,
        lastConfigUpdate: company.lastConfigUpdate
      }
    });
    
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 🗑️ Delete/Deactivate company
router.delete('/:id', auth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    const masterConn = await multiTenantDB.getMasterConnection();
    const Company = require('../models/Company')(masterConn);
    
    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }
    
    if (permanent === 'true') {
      // Permanent deletion - drop schema and delete record
      try {
        await masterConn.query(`DROP SCHEMA IF EXISTS "${company.databaseSchema}" CASCADE`);
        await company.destroy();
        
        console.log(`🗑️ Company ${company.name} permanently deleted`);
        
        res.json({
          success: true,
          message: 'Empresa eliminada permanentemente'
        });
      } catch (error) {
        console.error('Error permanently deleting company:', error);
        res.status(500).json({
          success: false,
          error: 'Error eliminando empresa permanentemente'
        });
      }
    } else {
      // Soft delete - just deactivate
      await company.update({ isActive: false });
      
      res.json({
        success: true,
        message: 'Empresa desactivada exitosamente'
      });
    }
    
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 🔄 Activate/Deactivate company
router.patch('/:id/toggle-status', auth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const masterConn = await multiTenantDB.getMasterConnection();
    const Company = require('../models/Company')(masterConn);
    
    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }
    
    const newStatus = !company.isActive;
    await company.update({ isActive: newStatus });
    
    res.json({
      success: true,
      message: `Empresa ${newStatus ? 'activada' : 'desactivada'} exitosamente`,
      company: {
        id: company.company_id,
        name: company.name,
        isActive: company.isActive
      }
    });
    
  } catch (error) {
    console.error('Error toggling company status:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 📊 Get company statistics
router.get('/:slug/stats', auth, async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get company info
    const company = await multiTenantDB.getCompanyBySlug(slug);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }
    
    // Get company connection
    const companyConn = await multiTenantDB.getCompanyConnection(slug);
    const models = await multiTenantDB.setupCompanyModels(companyConn);
    
    // Get statistics
    const stats = {
      users: {
        total: await models.User.count(),
        active: await models.User.count({ where: { isActive: true } }),
        admins: await models.User.count({ where: { role: 'admin' } })
      },
      departments: {
        total: await models.Department.count(),
        active: await models.Department.count({ where: { is_active: true } })
      },
      attendance: {
        today: await models.Attendance.count({
          where: {
            createdAt: {
              [require('sequelize').Op.gte]: new Date().setHours(0, 0, 0, 0)
            }
          }
        })
      },
      biometric: {
        registered: await models.FacialBiometricData.count(),
        active: await models.FacialBiometricData.count({ where: { isActive: true } })
      }
    };
    
    res.json({
      success: true,
      company: {
        name: company.name,
        slug: company.slug,
        subscriptionType: company.subscriptionType,
        maxUsers: company.maxUsers
      },
      stats: stats
    });
    
  } catch (error) {
    console.error('Error getting company stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});
n/**
 * POST /api/companies/:id/onboarding/activate
 * Activar empresa al finalizar onboarding (FASE 4)
 * Crea usuario CORE inmutable "administrador"
 */
router.post("/:id/onboarding/activate", async (req, res) => {
  const { Pool } = require("pg");
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB || "attendance_system",
    port: 5432
  });
  
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { invoice_confirmed } = req.body;
    
    if (!invoice_confirmed) {
      return res.status(400).json({
        success: false,
        error: "Debe confirmar el pago de la factura antes de activar"
      });
    }
    
    await client.query("BEGIN");
    
    // Verificar estado de onboarding
    const companyResult = await client.query(
      "SELECT * FROM companies WHERE company_id = $1",
      [id]
    );
    
    if (companyResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Empresa no encontrada"
      });
    }
    
    const company = companyResult.rows[0];
    
    // Crear usuario CORE usando la función PostgreSQL
    const coreUserResult = await client.query(
      "SELECT create_core_user_for_company($1, $2, $3) AS user_id",
      [id, company.onboarding_trace_id, req.user?.staff_id || null]
    );
    
    const coreUserId = coreUserResult.rows[0].user_id;
    
    // Activar empresa
    await client.query(
      `UPDATE companies 
       SET is_active = TRUE,
           activated_at = CURRENT_TIMESTAMP,
           onboarding_status = "ACTIVE"
       WHERE company_id = $1`,
      [id]
    );
    
    await client.query("COMMIT");
    
    res.json({
      success: true,
      message: "Empresa activada exitosamente",
      core_user_id: coreUserId,
      credentials: {
        username: "administrador",
        password: "admin123",
        force_change: true
      }
    });
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ [COMPANY ACTIVATION] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
    await pool.end();
  }
});


module.exports = router;