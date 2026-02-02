const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

// multiTenantDB es opcional - puede no existir en todas las instalaciones
let multiTenantDB = null;
try {
  multiTenantDB = require('../config/multiTenantDatabase').multiTenantDB;
} catch (e) {
  console.log('⚠️ [COMPANY-ROUTES] multiTenantDatabase no disponible - endpoints multi-tenant deshabilitados');
}

/**
 * Company Management Routes
 * Handles multi-tenant company operations
 */

// =====================================================
// 📱 ENDPOINTS PÚBLICOS (Sin autenticación - Para APK Kiosko)
// =====================================================

/**
 * @route GET /api/v1/companies/public-list
 * @desc Lista empresas activas para dropdown en APK Kiosko (SIN AUTH)
 * @access Public
 */
router.get('/public-list', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');

    console.log('📱 [COMPANIES] APK solicitando lista de empresas disponibles');

    // Obtener empresas activas con información mínima
    const [companies] = await sequelize.query(`
      SELECT
        company_id as id,
        name,
        slug,
        COALESCE(contact_email, '') as email,
        COALESCE(city, '') as city,
        COALESCE(province, '') as province
      FROM companies
      WHERE is_active = true
      ORDER BY name ASC
    `);

    console.log(`✅ [COMPANIES] ${companies.length} empresas disponibles para kiosko`);

    res.json({
      success: true,
      companies: companies,
      count: companies.length
    });

  } catch (error) {
    console.error('❌ [COMPANIES] Error obteniendo lista pública:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo empresas',
      companies: []
    });
  }
});

// =====================================================
// 🔐 ENDPOINTS PROTEGIDOS (Requieren autenticación)
// =====================================================

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
    let company = null;

    // Intentar con multiTenantDB si está disponible
    if (multiTenantDB && typeof multiTenantDB.getCompanyBySlug === 'function') {
      company = await multiTenantDB.getCompanyBySlug(slug);
    } else {
      // Fallback: buscar directamente en la base de datos
      const { sequelize } = require('../config/database');
      const results = await sequelize.query(
        `SELECT company_id, name, slug, logo, is_active as "isActive",
                contact_email, phone, address, city, province, country,
                timezone, locale, currency, features, primary_color, secondary_color,
                modules_data, license_type as "licenseType"
         FROM companies WHERE slug = $1 AND is_active = true LIMIT 1`,
        { bind: [slug], type: sequelize.QueryTypes.SELECT }
      );
      company = Array.isArray(results) && results.length > 0 ? results[0] : null;
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Remove sensitive information for public access
    const publicInfo = {
      id: company.company_id || company.id,
      name: company.name,
      slug: company.slug,
      displayName: company.displayName || company.name,
      logo: company.logo,
      primaryColor: company.primaryColor || '#1976d2',
      secondaryColor: company.secondaryColor || '#424242',
      timezone: company.timezone || 'America/Argentina/Buenos_Aires',
      locale: company.locale || 'es-AR',
      currency: company.currency || 'ARS',
      features: company.features,
      isActive: company.isActive
    };

    res.json({
      success: true,
      company: publicInfo
    });

  } catch (error) {
    console.error('Error getting company by slug:', slug);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
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

/**
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

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 CONTROL MANUAL DE ESTADO (Solo superadmin / gerente_general)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/companies/:id/manual-onboarding
 * Alta o Baja manual de empresa
 * Solo superadmin y gerente_general
 * Body: { action: 'alta' | 'baja', reason: string }
 */
router.post('/:id/manual-onboarding', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    const staffId = req.staff?.staff_id || req.user?.staff_id || req.user?.id;
    const staffRole = req.staff?.role || req.user?.role;

    // Validar rol
    if (!['superadmin', 'gerente_general'].includes(staffRole)) {
      return res.status(403).json({
        success: false,
        error: 'Solo superadmin y gerente_general pueden realizar cambios manuales de onboarding'
      });
    }

    // Validar action
    if (!['alta', 'baja'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Acción inválida. Debe ser "alta" o "baja"'
      });
    }

    // Validar reason
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar un motivo de al menos 10 caracteres'
      });
    }

    const { sequelize } = require('../config/database');
    const bcrypt = require('bcryptjs');

    // Obtener empresa
    const [company] = await sequelize.query(`
      SELECT company_id, name, slug, is_active, status, onboarding_status, contact_email
      FROM companies WHERE company_id = :id
    `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

    if (!company) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }

    if (action === 'alta') {
      // Dar de ALTA manual
      await sequelize.query(`
        UPDATE companies SET
          is_active = TRUE,
          status = 'active',
          onboarding_status = 'ACTIVE',
          activated_at = NOW(),
          onboarding_manual = TRUE,
          onboarding_manual_reason = :reason,
          onboarding_manual_by = :staffId,
          onboarding_manual_at = NOW(),
          updated_at = NOW()
        WHERE company_id = :id
      `, { replacements: { id, reason, staffId }, type: sequelize.QueryTypes.UPDATE });

      // Crear usuario admin si no existe
      const [existingAdmin] = await sequelize.query(`
        SELECT id FROM users WHERE company_id = :id AND role = 'admin' LIMIT 1
      `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

      let adminCreated = false;
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        await sequelize.query(`
          INSERT INTO users (company_id, username, password, email, first_name, last_name, role, is_active, is_core_user, force_password_change, created_at, updated_at)
          VALUES (:id, 'administrador', :password, :email, 'Administrador', 'Principal', 'admin', true, true, true, NOW(), NOW())
        `, {
          replacements: {
            id,
            password: hashedPassword,
            email: company.contact_email || `admin@${company.slug}.com`
          },
          type: sequelize.QueryTypes.INSERT
        });
        adminCreated = true;
      }

      console.log(`✅ [MANUAL] Alta de empresa "${company.name}" por staff ${staffId}. Motivo: ${reason}`);

      res.json({
        success: true,
        message: `Empresa "${company.name}" dada de ALTA manualmente`,
        action: 'alta',
        manual: true,
        reason,
        admin_created: adminCreated,
        credentials: adminCreated ? { username: 'administrador', password: 'admin123', force_change: true } : null
      });

    } else {
      // Dar de BAJA manual
      await sequelize.query(`
        UPDATE companies SET
          is_active = FALSE,
          status = 'cancelled',
          onboarding_status = 'CANCELLED',
          onboarding_manual = TRUE,
          onboarding_manual_reason = :reason,
          onboarding_manual_by = :staffId,
          onboarding_manual_at = NOW(),
          updated_at = NOW()
        WHERE company_id = :id
      `, { replacements: { id, reason, staffId }, type: sequelize.QueryTypes.UPDATE });

      console.log(`⛔ [MANUAL] Baja de empresa "${company.name}" por staff ${staffId}. Motivo: ${reason}`);

      res.json({
        success: true,
        message: `Empresa "${company.name}" dada de BAJA manualmente`,
        action: 'baja',
        manual: true,
        reason
      });
    }

  } catch (error) {
    console.error('❌ [MANUAL ONBOARDING] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/companies/:id/manual-status
 * Cambiar estado operativo manual (activar, suspender, desactivar)
 * Solo superadmin y gerente_general
 * Body: { status: 'active' | 'suspended' | 'cancelled', reason: string }
 */
router.post('/:id/manual-status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const staffId = req.staff?.staff_id || req.user?.staff_id || req.user?.id;
    const staffRole = req.staff?.role || req.user?.role;

    // Validar rol
    if (!['superadmin', 'gerente_general'].includes(staffRole)) {
      return res.status(403).json({
        success: false,
        error: 'Solo superadmin y gerente_general pueden cambiar el estado manualmente'
      });
    }

    // Validar status
    const validStatuses = ['active', 'suspended', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Estado inválido. Debe ser: ${validStatuses.join(', ')}`
      });
    }

    // Validar reason
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar un motivo de al menos 10 caracteres'
      });
    }

    const { sequelize } = require('../config/database');

    // Obtener empresa
    const [company] = await sequelize.query(`
      SELECT company_id, name, status as current_status FROM companies WHERE company_id = :id
    `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

    if (!company) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }

    // Determinar is_active según el nuevo status
    const isActive = status === 'active';

    await sequelize.query(`
      UPDATE companies SET
        status = :status,
        is_active = :isActive,
        status_manual = TRUE,
        status_manual_reason = :reason,
        status_manual_by = :staffId,
        status_manual_at = NOW(),
        updated_at = NOW()
      WHERE company_id = :id
    `, { replacements: { id, status, isActive, reason, staffId }, type: sequelize.QueryTypes.UPDATE });

    const statusLabels = {
      'active': 'ACTIVADA',
      'suspended': 'SUSPENDIDA',
      'cancelled': 'DESACTIVADA'
    };

    console.log(`🔧 [MANUAL] Estado de "${company.name}" cambiado a ${status} por staff ${staffId}. Motivo: ${reason}`);

    res.json({
      success: true,
      message: `Empresa "${company.name}" ${statusLabels[status]} manualmente`,
      previous_status: company.current_status,
      new_status: status,
      manual: true,
      reason
    });

  } catch (error) {
    console.error('❌ [MANUAL STATUS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/companies/:id/manual-history
 * Ver historial de cambios manuales de una empresa
 */
router.get('/:id/manual-history', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { sequelize } = require('../config/database');

    const [company] = await sequelize.query(`
      SELECT
        company_id, name,
        onboarding_manual, onboarding_manual_reason, onboarding_manual_by, onboarding_manual_at,
        status_manual, status_manual_reason, status_manual_by, status_manual_at,
        status, is_active, onboarding_status
      FROM companies WHERE company_id = :id
    `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

    if (!company) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }

    res.json({
      success: true,
      company: company.name,
      current_state: {
        status: company.status,
        is_active: company.is_active,
        onboarding_status: company.onboarding_status
      },
      manual_changes: {
        onboarding: company.onboarding_manual ? {
          was_manual: true,
          reason: company.onboarding_manual_reason,
          changed_by: company.onboarding_manual_by,
          changed_at: company.onboarding_manual_at
        } : { was_manual: false },
        status: company.status_manual ? {
          was_manual: true,
          reason: company.status_manual_reason,
          changed_by: company.status_manual_by,
          changed_at: company.status_manual_at
        } : { was_manual: false }
      }
    });

  } catch (error) {
    console.error('❌ [MANUAL HISTORY] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;