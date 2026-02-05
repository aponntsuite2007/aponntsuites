const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const NCE = require('../services/NotificationCentralExchange');

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

    // Create default "Casa Matriz" branch for the company
    try {
      const companyConn = await multiTenantDB.getCompanyConnection(company.company_id);
      const { Pool } = require('pg');

      // Get database config for this company
      const dbConfig = {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
      };

      const pool = new Pool(dbConfig);

      await pool.query(`
        INSERT INTO branches (
          id,
          company_id,
          name,
          code,
          address,
          is_main,
          is_active,
          country,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          'Casa Matriz',
          'CM-001',
          'Dirección de casa matriz',
          true,
          true,
          'Argentina',
          NOW(),
          NOW()
        )
      `, [company.company_id]);

      await pool.end();

      console.log(`✅ Casa Matriz creada para empresa ${name}`);
    } catch (branchError) {
      console.error('⚠️ Error creando Casa Matriz (no crítico):', branchError.message);
      // No hacemos rollback porque la empresa y schema ya están creados
      // La sucursal se puede crear manualmente después
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

// 🔄 Cambiar estado de empresa (con motivo) - Dashboard
router.put('/:id/status', auth, requireRole(['admin', 'super_admin', 'gerente_general', 'director', 'GG', 'DIR']), async (req, res) => {
  console.log('📍 [COMPANY-STATUS] PUT /:id/status llamado');
  console.log('📍 [COMPANY-STATUS] Params:', req.params);
  console.log('📍 [COMPANY-STATUS] Body:', req.body);
  console.log('📍 [COMPANY-STATUS] User:', req.user?.email, req.user?.role);

  try {
    const { id } = req.params;
    const { is_active, reason } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_active debe ser booleano' });
    }
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Debe indicar un motivo de al menos 10 caracteres' });
    }

    const staffId = req.user.id || req.user.staff_id;
    const { sequelize } = require('../config/database');

    // Actualizar empresa con motivo
    await sequelize.query(`
      UPDATE companies SET
        is_active = :isActive,
        status_manual = TRUE,
        status_manual_reason = :reason,
        status_manual_by = :staffId,
        status_manual_at = NOW(),
        updated_at = NOW()
      WHERE company_id = :id
    `, {
      replacements: { id, isActive: is_active, reason: reason.trim(), staffId },
      type: sequelize.QueryTypes.UPDATE
    });

    // Obtener empresa actualizada
    const [company] = await sequelize.query(`
      SELECT company_id, name, is_active, status_manual_reason FROM companies WHERE company_id = :id
    `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      message: `Empresa ${is_active ? 'activada' : 'desactivada'} correctamente`,
      company
    });

  } catch (error) {
    console.error('Error changing company status:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// 🔄 Activate/Deactivate company (legacy toggle)
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

    // ════════════════════════════════════════════════════════════════════════════
    // 📦 ASIGNAR MÓDULOS: CORE + CONTRATADOS
    // ════════════════════════════════════════════════════════════════════════════

    // 1. Obtener módulos CORE (obligatorios para todas las empresas)
    const coreModulesResult = await client.query(
      "SELECT module_key FROM system_modules WHERE is_core = true"
    );
    const coreModules = coreModulesResult.rows.map(r => r.module_key);

    // 2. Obtener módulos del presupuesto más reciente (contratados o trial)
    const quoteModulesResult = await client.query(`
      SELECT modules_data, trial_modules
      FROM quotes
      WHERE company_id = $1 AND status IN ('active', 'accepted', 'in_trial')
      ORDER BY created_at DESC LIMIT 1
    `, [id]);

    let contractedModules = [];
    if (quoteModulesResult.rows.length > 0) {
      const quote = quoteModulesResult.rows[0];
      // modules_data es un JSON con los módulos contratados
      if (quote.modules_data && Array.isArray(quote.modules_data)) {
        contractedModules = quote.modules_data.map(m => m.key || m.module_key || m);
      }
      // trial_modules son módulos en período de prueba
      if (quote.trial_modules && Array.isArray(quote.trial_modules)) {
        contractedModules = [...contractedModules, ...quote.trial_modules];
      }
    }

    // 3. Combinar CORE + contratados (sin duplicados)
    const allModules = [...new Set([...coreModules, ...contractedModules])];

    console.log(`📦 [ACTIVATION] Asignando ${allModules.length} módulos: ${coreModules.length} CORE + ${contractedModules.length} contratados`);

    // Activar empresa CON módulos asignados (LEGACY field para compatibilidad)
    await client.query(
      `UPDATE companies
       SET is_active = TRUE,
           activated_at = CURRENT_TIMESTAMP,
           onboarding_status = 'ACTIVE',
           active_modules = $2
       WHERE company_id = $1`,
      [id, JSON.stringify(allModules)]
    );

    // ════════════════════════════════════════════════════════════════════════════
    // 📦 INSERT INTO company_modules (FUENTE DE VERDAD)
    // ════════════════════════════════════════════════════════════════════════════
    // Primero eliminar registros existentes para evitar duplicados
    await client.query(
      `DELETE FROM company_modules WHERE company_id = $1`,
      [id]
    );

    // Insertar todos los módulos (CORE + contratados) en company_modules
    if (allModules.length > 0) {
      const insertResult = await client.query(`
        INSERT INTO company_modules (company_id, system_module_id, activo, created_at, updated_at)
        SELECT $1, sm.id, true, NOW(), NOW()
        FROM system_modules sm
        WHERE sm.module_key = ANY($2::varchar[])
        ON CONFLICT (company_id, system_module_id) DO UPDATE SET activo = true, updated_at = NOW()
        RETURNING id
      `, [id, allModules]);

      console.log(`📦 [ACTIVATION] Insertados ${insertResult.rowCount} registros en company_modules`);
    }

    await client.query("COMMIT");

    // ════════════════════════════════════════════════════════════════════════════
    // 📧 ENVIAR EMAIL DE ACTIVACIÓN VIA NCE (igual que presupuesto/contrato)
    // ════════════════════════════════════════════════════════════════════════════
    try {
      const activationEmailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f8f9fa;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
            <img src="https://aponnt.com/images/logo-aponnt-white.png" alt="APONNT" style="height: 50px; margin-bottom: 15px;" />
            <h1 style="color: white; margin: 0; font-size: 24px;">¡Bienvenido a APONNT!</h1>
            <p style="color: #a8d4f5; margin: 10px 0 0 0; font-size: 16px;">Su empresa ha sido activada exitosamente</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px; background: white;">

            <!-- Company Info -->
            <div style="background: #e8f4fd; border-radius: 10px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #1e3a5f;">
              <h2 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 18px;">📋 Datos de su Empresa</h2>
              <p style="margin: 5px 0; color: #333;"><strong>Empresa:</strong> ${company.name}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Identificador (slug):</strong> <code style="background: #1e3a5f; color: white; padding: 2px 8px; border-radius: 4px;">${company.slug}</code></p>
            </div>

            <!-- Login Instructions with Graphic -->
            <div style="background: #fff3cd; border-radius: 10px; padding: 25px; margin-bottom: 25px; border: 2px solid #ffc107;">
              <h2 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">🔐 Cómo Ingresar al Sistema</h2>

              <p style="color: #333; margin-bottom: 20px;">Siga estos <strong>3 pasos simples</strong> para acceder:</p>

              <!-- Visual Login Steps -->
              <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                <!-- Step 1 -->
                <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #ddd;">
                  <div style="background: #1e3a5f; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">1</div>
                  <div style="flex: 1;">
                    <p style="margin: 0; font-weight: bold; color: #1e3a5f;">Seleccione su empresa</p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">En el primer campo, escriba: <code style="background: #e8f4fd; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${company.slug}</code></p>
                  </div>
                </div>

                <!-- Step 2 -->
                <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #ddd;">
                  <div style="background: #1e3a5f; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">2</div>
                  <div style="flex: 1;">
                    <p style="margin: 0; font-weight: bold; color: #1e3a5f;">Ingrese su usuario</p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">En el campo usuario escriba: <code style="background: #e8f4fd; padding: 2px 6px; border-radius: 3px; font-weight: bold;">administrador</code></p>
                  </div>
                </div>

                <!-- Step 3 -->
                <div style="display: flex; align-items: center;">
                  <div style="background: #1e3a5f; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">3</div>
                  <div style="flex: 1;">
                    <p style="margin: 0; font-weight: bold; color: #1e3a5f;">Ingrese su contraseña</p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">En el campo contraseña escriba: <code style="background: #e8f4fd; padding: 2px 6px; border-radius: 3px; font-weight: bold;">admin123</code></p>
                  </div>
                </div>
              </div>

              <!-- Warning to change password -->
              <div style="background: #f8d7da; border-radius: 6px; padding: 12px; border-left: 4px solid #dc3545;">
                <p style="margin: 0; color: #721c24; font-size: 14px;">
                  ⚠️ <strong>IMPORTANTE:</strong> Por seguridad, debe cambiar su contraseña inmediatamente después del primer ingreso.
                </p>
              </div>
            </div>

            <!-- Where to change password -->
            <div style="background: #d4edda; border-radius: 10px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #28a745;">
              <h2 style="color: #155724; margin: 0 0 10px 0; font-size: 18px;">🔄 ¿Dónde cambiar la contraseña?</h2>
              <p style="color: #333; margin: 5px 0;">Una vez dentro del sistema, tiene <strong>dos opciones</strong>:</p>
              <ul style="color: #333; margin: 10px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;"><strong>Opción 1:</strong> Menú lateral → <em>"Gestión de Usuarios"</em> → Editar su usuario</li>
                <li><strong>Opción 2:</strong> Esquina superior derecha → <em>"Mi Espacio"</em> → Cambiar contraseña</li>
              </ul>
            </div>

            <!-- Access URLs -->
            <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
              <h2 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 18px;">🌐 Accesos Disponibles</h2>

              <p style="color: #333; margin-bottom: 15px;">Ingrese a <a href="https://www.aponnt.com" style="color: #1e3a5f; font-weight: bold;">www.aponnt.com</a> y seleccione su tipo de acceso:</p>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                    <strong style="color: #1e3a5f;">🏢 Panel Empresa</strong>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Gestión completa de su empresa, empleados y asistencia</p>
                  </td>
                  <td style="padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right;">
                    <a href="https://aponnt.com/panel-empresa.html" style="background: #1e3a5f; color: white; padding: 6px 15px; border-radius: 5px; text-decoration: none; font-size: 13px;">Ingresar →</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                    <strong style="color: #1e3a5f;">🖥️ Panel Administrativo</strong>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Configuración avanzada y reportes gerenciales</p>
                  </td>
                  <td style="padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right;">
                    <a href="https://aponnt.com/panel-administrativo.html" style="background: #6c757d; color: white; padding: 6px 15px; border-radius: 5px; text-decoration: none; font-size: 13px;">Ingresar →</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
                    <strong style="color: #1e3a5f;">🤝 Portal Asociados</strong>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Acceso para socios comerciales</p>
                  </td>
                  <td style="padding: 10px; border-bottom: 1px solid #dee2e6; text-align: right;">
                    <a href="https://aponnt.com/panel-asociados.html" style="background: #6c757d; color: white; padding: 6px 15px; border-radius: 5px; text-decoration: none; font-size: 13px;">Ingresar →</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px;">
                    <strong style="color: #1e3a5f;">📦 Portal Proveedores</strong>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Acceso para proveedores registrados</p>
                  </td>
                  <td style="padding: 10px; text-align: right;">
                    <a href="https://aponnt.com/panel-proveedores.html" style="background: #6c757d; color: white; padding: 6px 15px; border-radius: 5px; text-decoration: none; font-size: 13px;">Ingresar →</a>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Mobile Apps -->
            <div style="background: #e8f4fd; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
              <h2 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 18px;">📱 Aplicaciones Móviles</h2>
              <p style="color: #333; margin-bottom: 15px;">APONNT cuenta con aplicaciones móviles para facilitar el registro de asistencia:</p>

              <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px; background: white; border-radius: 8px; padding: 15px; text-align: center;">
                  <div style="font-size: 40px; margin-bottom: 10px;">🏪</div>
                  <h3 style="color: #1e3a5f; margin: 0 0 5px 0; font-size: 14px;">APK Kiosko</h3>
                  <p style="color: #666; font-size: 12px; margin: 0;">Registro biométrico en tablets fijas</p>
                </div>
                <div style="flex: 1; min-width: 200px; background: white; border-radius: 8px; padding: 15px; text-align: center;">
                  <div style="font-size: 40px; margin-bottom: 10px;">👤</div>
                  <h3 style="color: #1e3a5f; margin: 0 0 5px 0; font-size: 14px;">APK Empleados</h3>
                  <p style="color: #666; font-size: 12px; margin: 0;">Autogestión desde el celular</p>
                </div>
              </div>

              <p style="color: #666; font-size: 13px; margin-top: 15px; text-align: center;">
                Solicite las APKs a su ejecutivo de cuenta o descárguelas desde el Panel Empresa.
              </p>
            </div>

            <!-- Support -->
            <div style="text-align: center; padding: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">¿Necesita ayuda? Estamos para asistirlo</p>
              <p style="margin: 0;">
                <a href="mailto:soporte@aponnt.com" style="color: #1e3a5f; text-decoration: none; margin: 0 15px;">📧 soporte@aponnt.com</a>
                <span style="color: #ccc;">|</span>
                <a href="https://wa.me/5491112345678" style="color: #25d366; text-decoration: none; margin: 0 15px;">💬 WhatsApp</a>
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #1e3a5f; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0 0 5px 0; font-size: 14px;">APONNT S.A.S. - Sistema de Gestión de Asistencia Biométrica</p>
            <p style="margin: 0; font-size: 12px; color: #a8d4f5;">
              <a href="https://www.aponnt.com" style="color: #a8d4f5;">www.aponnt.com</a> |
              soporte@aponnt.com
            </p>
          </div>

        </div>
      `;

      // Enviar email de activación usando NCE (con tracking, BCC automático, etc.)
      await NCE.send({
        companyId: null, // Es un email de onboarding, no pertenece a una empresa activa aún
        module: 'onboarding',
        workflowKey: 'onboarding.company_activated',
        originType: 'company',
        originId: String(id),
        recipientType: 'external',
        recipientEmail: company.contact_email,
        title: `🎉 ¡Bienvenido a APONNT! - ${company.name} activada exitosamente`,
        message: `La empresa ${company.name} ha sido activada. Usuario: administrador / Contraseña: admin123`,
        metadata: {
          company_id: id,
          company_name: company.name,
          company_slug: company.slug,
          htmlContent: activationEmailHtml
        },
        priority: 'high',
        channels: ['email']
      });

      console.log(`✅ [COMPANY ACTIVATION] Email de activación enviado via NCE a: ${company.contact_email}`);

    } catch (emailError) {
      // No romper el flujo si falla el email (la empresa ya está activada)
      console.error('⚠️ [COMPANY ACTIVATION] Error enviando email de activación (no bloqueante):', emailError.message);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 🏛️ VERIFICAR Y CREAR "CASA MATRIZ" SI NO EXISTE
    // ════════════════════════════════════════════════════════════════════════════
    try {
      const branchCheckResult = await client.query(
        `SELECT id FROM branches
         WHERE company_id = $1 AND (is_main = true OR LOWER(name) LIKE '%casa matriz%')
         LIMIT 1`,
        [id]
      );

      if (branchCheckResult.rows.length === 0) {
        await client.query(`
          INSERT INTO branches (
            id, company_id, name, code, address, is_main, is_active, country, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(), $1, 'Casa Matriz', 'CM-001', 'Dirección de casa matriz',
            true, true, 'Argentina', NOW(), NOW()
          )
        `, [id]);

        console.log(`✅ [ACTIVATION] Casa Matriz creada para empresa ${company.name}`);
      } else {
        console.log(`✅ [ACTIVATION] Casa Matriz ya existe para empresa ${company.name}`);
      }
    } catch (branchError) {
      console.error('⚠️ [ACTIVATION] Error verificando/creando Casa Matriz (no crítico):', branchError.message);
    }

    res.json({
      success: true,
      message: "Empresa activada exitosamente",
      core_user_id: coreUserId,
      credentials: {
        username: "administrador",
        password: "admin123",
        force_change: true
      },
      email_sent: true
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
    const staffRole = req.user?.staff_role || req.staff?.role || req.user?.role || '';

    // Validar rol (acepta variantes: GG, GERENTE_GENERAL, SUPERADMIN, o minúsculas)
    const allowedRoles = ['GG', 'GERENTE_GENERAL', 'SUPERADMIN', 'superadmin', 'gerente_general', 'DIR', 'DIRECTOR'];
    if (!allowedRoles.includes(staffRole)) {
      return res.status(403).json({
        success: false,
        error: `Solo roles de alta gerencia pueden realizar cambios manuales de onboarding. Tu rol: ${staffRole}`
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
        SELECT user_id FROM users WHERE company_id = :id AND role = 'admin' LIMIT 1
      `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

      let adminCreated = false;
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        // Generar employeeId y dni únicos
        const timestamp = Date.now().toString().slice(-6);
        const employeeId = 'ADM-' + id + '-' + timestamp;
        const dni = 'ADMIN' + id + timestamp;  // DNI único por empresa
        await sequelize.query(`
          INSERT INTO users (user_id, company_id, usuario, password, email, "firstName", "lastName", "employeeId", dni, role, is_active, is_core_user, force_password_change, "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), :id, 'administrador', :password, :email, 'Administrador', 'Principal', :employeeId, :dni, 'admin', true, true, true, NOW(), NOW())
        `, {
          replacements: {
            id,
            password: hashedPassword,
            email: company.contact_email || `admin@${company.slug}.com`,
            employeeId,
            dni
          },
          type: sequelize.QueryTypes.INSERT
        });
        adminCreated = true;
      }

      // 📧 ENVIAR EMAIL DE BIENVENIDA
      try {
        const AponntNotificationService = require('../services/AponntNotificationService');

        // Obtener datos completos de la empresa para el email
        const [companyFull] = await sequelize.query(`
          SELECT company_id as id, name, slug, contact_email as "contactEmail",
                 license_type as "licenseType", max_employees as "maxEmployees",
                 active_modules as modules, legal_name as "legalName"
          FROM companies WHERE company_id = :id
        `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

        if (companyFull && companyFull.contactEmail) {
          await AponntNotificationService.notifyNewCompany(companyFull);
          console.log(`📧 [MANUAL] Email de bienvenida enviado a ${companyFull.contactEmail}`);
        }
      } catch (notifError) {
        console.error('⚠️ [MANUAL] Error enviando email de bienvenida:', notifError.message);
        // No fallar el alta por error en notificación
      }

      // 🏛️ VERIFICAR Y CREAR "CASA MATRIZ" SI NO EXISTE
      try {
        const [existingBranch] = await sequelize.query(`
          SELECT id FROM branches
          WHERE company_id = :id AND (is_main = true OR LOWER(name) LIKE '%casa matriz%')
          LIMIT 1
        `, { replacements: { id }, type: sequelize.QueryTypes.SELECT });

        if (!existingBranch) {
          await sequelize.query(`
            INSERT INTO branches (
              id, company_id, name, code, address, is_main, is_active, country, created_at, updated_at
            )
            VALUES (
              gen_random_uuid(), :id, 'Casa Matriz', 'CM-001', 'Dirección de casa matriz',
              true, true, 'Argentina', NOW(), NOW()
            )
          `, { replacements: { id }, type: sequelize.QueryTypes.INSERT });

          console.log(`✅ [MANUAL] Casa Matriz creada para empresa ${company.name}`);
        } else {
          console.log(`✅ [MANUAL] Casa Matriz ya existe para empresa ${company.name}`);
        }
      } catch (branchError) {
        console.error('⚠️ [MANUAL] Error verificando/creando Casa Matriz (no crítico):', branchError.message);
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
    const staffRole = req.user?.staff_role || req.staff?.role || req.user?.role || '';

    // Validar rol (acepta variantes: GG, GERENTE_GENERAL, SUPERADMIN, o minúsculas)
    const allowedRoles = ['GG', 'GERENTE_GENERAL', 'SUPERADMIN', 'superadmin', 'gerente_general', 'DIR', 'DIRECTOR'];
    if (!allowedRoles.includes(staffRole)) {
      return res.status(403).json({
        success: false,
        error: `Solo roles de alta gerencia pueden cambiar el estado manualmente. Tu rol: ${staffRole}`
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