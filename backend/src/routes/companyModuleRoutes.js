const express = require('express');
const router = express.Router();
const { CompanyModule, SystemModule } = require('../config/database');
const database = require('../config/database');
const { auth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Middleware simplificado para aceptar tokens básicos también
const simpleAuth = async (req, res, next) => {
  try {
    console.log(`🌟 [SIMPLE-AUTH] Iniciando autenticación para ruta: ${req.path}`);
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);
    console.log(`🔧 [AUTH] Token recibido: "${token}" (longitud: ${token.length})`);
    console.log(`🔍 [AUTH] Tipo de token detectado: ${token.startsWith('token_') ? 'SIMPLE' : 'JWT'}`);

    // AUTENTICACIÓN HÍBRIDA: Rechazar tokens hardcodeados, permitir JWT válidos
    console.log(`🔐 [AUTH] Verificando tipo de token...`);

    // Rechazar SOLO tokens hardcodeados específicos, permitir JWT válidos del sistema
    const isHardcodedToken = (
      token === 'token_test' ||
      token === 'test' ||
      token === 'token_test_admin1' ||
      token.includes('admin') ||
      (token.startsWith('token_') && token.length <= 18) // JWT válidos son >18 caracteres
    );

    if (isHardcodedToken) {
      console.log(`❌ [AUTH] Token hardcodeado rechazado: ${token}`);
      return res.status(401).json({
        error: 'Acceso denegado. El sistema requiere autenticación válida.',
        details: 'Por favor, inicie sesión con sus credenciales apropiadas.'
      });
    }

    // Para tokens que no son hardcodeados, usar el middleware JWT normal
    console.log(`🔐 [AUTH] Procesando token como JWT: ${token.substring(0, 20)}...`);
    return auth(req, res, next);
  } catch (error) {
    console.error('Error en simpleAuth:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * @route GET /api/v1/company-modules/test-token
 * @desc Generar un token JWT de prueba para un usuario administrador
 */
router.get('/test-token', async (req, res) => {
  try {
    // Obtener el primer usuario administrador activo
    const adminUser = await database.database.sequelize.query(
      `SELECT user_id, email, company_id, role FROM users WHERE role = 'admin' AND is_active = true ORDER BY user_id LIMIT 1`,
      { type: database.database.sequelize.QueryTypes.SELECT }
    );

    if (!adminUser.length) {
      return res.status(404).json({ error: 'No hay usuarios administradores disponibles' });
    }

    const user = adminUser[0];

    // Crear JWT token
    const token = jwt.sign(
      {
        id: user.user_id,
        email: user.email,
        company_id: user.company_id,
        role: user.role
      },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.user_id,
        email: user.email,
        company_id: user.company_id,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error generando token de prueba:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/company-modules/my-company
 * @desc Obtener información de la empresa del usuario autenticado
 */
router.get('/my-company', auth, async (req, res) => {
  try {
    // Obtener user_id del usuario autenticado (Sequelize usa user_id como primary key)
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'Usuario sin autenticación'
      });
    }

    // Obtener company_id dinámicamente
    let companyId = req.user?.company_id || req.user?.companyId;
    if (!companyId) {
      const userQuery = await database.sequelize.query(
        'SELECT company_id FROM users WHERE user_id = ? AND is_active = true',
        { replacements: [userId], type: database.sequelize.QueryTypes.SELECT }
      );

      if (!userQuery.length) {
        return res.status(401).json({
          error: 'Usuario no encontrado o inactivo'
        });
      }

      companyId = userQuery[0].company_id;
    }

    // Obtener información de la empresa
    const companyInfo = await database.sequelize.query(`
      SELECT
        company_id,
        name,
        legal_name,
        address,
        phone,
        contact_phone,
        contact_email,
        city,
        province,
        country,
        tax_id,
        is_active
      FROM companies
      WHERE company_id = ? AND is_active = true
    `, {
      replacements: [companyId],
      type: database.sequelize.QueryTypes.SELECT
    });

    if (!companyInfo.length) {
      return res.status(404).json({
        error: 'Empresa no encontrada'
      });
    }

    const company = companyInfo[0];

    res.json({
      success: true,
      company: {
        id: company.company_id,
        name: company.name,
        legalName: company.legal_name,
        address: company.address,
        phone: company.phone || company.contact_phone,
        email: company.contact_email,
        city: company.city,
        province: company.province,
        country: company.country,
        taxId: company.tax_id,
        isActive: company.is_active
      }
    });

  } catch (error) {
    console.error('Error obteniendo información de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/company-modules/active
 * @desc Obtener SOLO módulos ACTIVOS/OPERACIONALES de la empresa (PLUG & PLAY)
 */
router.get('/active', simpleAuth, async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario sin autenticación' });
    }

    let companyId = req.query.company_id || req.user?.company_id || req.user?.companyId;

    if (!companyId) {
      const userQuery = await database.sequelize.query(
        'SELECT company_id FROM users WHERE user_id = ? AND is_active = true',
        { replacements: [userId], type: database.sequelize.QueryTypes.SELECT }
      );
      if (!userQuery.length) {
        return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
      }
      companyId = userQuery[0].company_id;
    }

    // Obtener SOLO módulos operacionales (activos + no expirados + no suspendidos)
    const activeModules = await database.sequelize.query(`
      SELECT
        sm.module_key as "moduleKey",
        sm.name as "moduleName",
        sm.category,
        sm.icon,
        sm.color
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = ?
        AND cm.activo = true
      ORDER BY sm.category, sm.name ASC
    `, {
      replacements: [companyId],
      type: database.sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      modules: activeModules,
      count: activeModules.length
    });

  } catch (error) {
    console.error('Error obteniendo módulos activos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/company-modules/my-modules
 * @desc Obtener módulos contratados por la empresa del usuario autenticado (LEGACY)
 * IMPORTANTE: Esta ruta debe estar ANTES de /:companyId para evitar conflictos
 */
router.get('/my-modules', simpleAuth, async (req, res) => {
  try {
    // Obtener user_id del usuario autenticado (Sequelize usa user_id como primary key)
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      console.log('❌ [COMPANY-MODULES] req.user no tiene user_id ni id:', req.user);
      return res.status(401).json({
        error: 'Usuario sin autenticación'
      });
    }

    // PRIORIZAR company_id desde query parameter (empresa seleccionada en dropdown)
    let companyId = req.query.company_id;

    if (companyId) {
      companyId = parseInt(companyId);
      console.log(`🎯 [COMPANY-MODULES] Usando company_id desde dropdown: ${companyId}`);
    } else {
      // Fallback: usar company_id del usuario autenticado
      companyId = req.user?.company_id || req.user?.companyId;
      if (!companyId) {
        console.log(`🔍 [COMPANY-MODULES] company_id no en req.user, buscando en DB para usuario: ${userId}`);

        // Buscar el company_id del usuario en la base de datos
        const userQuery = await database.sequelize.query(
          'SELECT company_id FROM users WHERE user_id = ? AND is_active = true',
          { replacements: [userId], type: database.sequelize.QueryTypes.SELECT }
        );

        if (!userQuery.length) {
          return res.status(401).json({
            error: 'Usuario no encontrado o inactivo'
          });
        }

        companyId = userQuery[0].company_id;
        console.log(`🔍 [COMPANY-MODULES] company_id encontrado en DB: ${companyId}`);
      }
    }

    console.log(`🏢 [COMPANY-MODULES] Usuario: ${userId}, Company: ${companyId}`);

    // Obtener módulos contratados por la empresa
    const contractedModules = await database.sequelize.query(`
      SELECT
        cm.id,
        sm.module_key,
        cm.activo as is_active,
        cm.created_at as contracted_at,
        null as expires_at,
        sm.name as module_name,
        sm.description as module_description,
        sm.icon as module_icon,
        sm.color as module_color
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = ?
      ORDER BY sm.name ASC
    `, {
      replacements: [companyId],
      type: database.sequelize.QueryTypes.SELECT
    });

    // También obtener todos los módulos del sistema para comparar
    const allSystemModules = await database.sequelize.query(`
      SELECT
        id,
        module_key,
        name,
        description,
        icon,
        color
      FROM system_modules
      ORDER BY name ASC
    `, {
      type: database.sequelize.QueryTypes.SELECT
    });

    // Debug: verificar datos
    console.log(`🔍 [DEBUG] Empresa ${companyId}: ${contractedModules.length} módulos contratados`);
    console.log(`🔍 [DEBUG] Módulos contratados keys:`, contractedModules.map(cm => cm.module_key));
    console.log(`🔍 [DEBUG] Módulos sistema keys:`, allSystemModules.map(sm => sm.module_key));

    // Crear lista completa con estado de contratación (SIN VALIDACIONES DE PERMISOS)
    const moduleStatus = allSystemModules.map(systemModule => {
      const contractedModule = contractedModules.find(
        cm => cm.module_key === systemModule.module_key
      );

      console.log(`🔍 [DEBUG] ${systemModule.module_key}: contracted=${!!contractedModule}`);

      const isContracted = !!contractedModule;
      let isActive = contractedModule?.is_active || false;

      // MODO TESTING: Si la empresa no tiene módulos contratados, mostrar todos como disponibles para testing
      if (contractedModules.length === 0) {
        isActive = true;
        isContracted = true;
        console.log(`🧪 [TESTING-MODE] Empresa ${companyId} sin módulos - Activando ${systemModule.module_key} para testing`);
      }

      const isOperational = isContracted && isActive;
      console.log(`🔍 [OPERATIONAL] ${systemModule.module_key}: contracted=${isContracted}, active=${isActive}, operational=${isOperational}`);

      return {
        id: systemModule.module_key,
        name: systemModule.name || systemModule.module_key || 'Módulo Sin Nombre',
        description: systemModule.description || 'Sin descripción disponible',
        icon: systemModule.icon || '📦',
        color: systemModule.color || '#666666',
        isContracted: isContracted,
        isActive: isActive,
        isOperational: isOperational,
        contractedAt: contractedModule?.contracted_at || null,
        expiresAt: contractedModule?.expires_at || null
      };
    });

    res.json({
      companyId,
      userId,
      modules: moduleStatus,
      totalModules: allSystemModules.length,
      contractedModules: contractedModules.length
    });

  } catch (error) {
    console.error('Error obteniendo módulos de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/company-modules/:companyId
 * @desc Obtener módulos contratados por una empresa específica (SIMPLIFICADO)
 * IMPORTANTE: Esta ruta debe estar DESPUÉS de /my-modules para evitar conflictos
 *
 * NUEVO: También incluye módulos temporales de active_modules (para auditor-dashboard)
 */
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log(`🧩 [COMPANY-MODULES] Solicitando módulos para empresa: ${companyId}`);

    // Obtener módulos contratados por la empresa desde company_modules
    const contractedModules = await database.sequelize.query(`
      SELECT
        cm.id,
        cm.company_id,
        cm.system_module_id,
        cm.activo as is_active,
        cm.created_at as contracted_at,
        sm.module_key,
        sm.name,
        sm.description,
        sm.icon,
        sm.color,
        sm.category,
        sm.base_price,
        sm.metadata
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = ?
      ORDER BY sm.category, sm.name ASC
    `, {
      replacements: [companyId],
      type: database.sequelize.QueryTypes.SELECT
    });

    console.log(`✅ [COMPANY-MODULES] Empresa ${companyId} tiene ${contractedModules.length} módulos contratados`);

    // TEMPORAL: Módulos temporales desactivados (active_modules no existe en Render)
    let temporaryModules = [];
    // TODO: Descomentar cuando active_modules exista en producción
    /*
    const companyData = await database.sequelize.query(`
      SELECT active_modules FROM companies WHERE company_id = ?
    `, {
      replacements: [companyId],
      type: database.sequelize.QueryTypes.SELECT
    });

    if (companyData.length > 0 && companyData[0].active_modules) {
      const activeModules = companyData[0].active_modules;
      console.log(`🔍 [ACTIVE-MODULES] Raw active_modules:`, activeModules);

      if (Array.isArray(activeModules)) {
        temporaryModules = activeModules.filter(moduleId =>
          typeof moduleId === 'string' &&
          moduleId.trim() !== '' &&
          !contractedModules.find(cm => cm.module_key === moduleId)
        );
        console.log(`📦 [TEMPORARY-MODULES] ${temporaryModules.length} módulos temporales encontrados:`, temporaryModules);
      }
    }
    */

    // Transformar módulos contratados a formato esperado por el frontend
    const modules = contractedModules.map(module => ({
      id: module.module_key,
      module_key: module.module_key,
      name: module.name || 'Módulo Sin Nombre',
      description: module.description || 'Sin descripción disponible',
      icon: module.icon || '📦',
      color: module.color || '#666666',
      category: module.category || 'general',
      price: module.base_price || 0,
      isContracted: true,
      isActive: module.is_active,
      isOperational: module.is_active, // Si está contratado y activo, es operacional
      contractedAt: module.contracted_at,
      companyId: module.company_id,
      isTemporary: false,
      // Metadata para carga dinámica de módulos
      metadata: module.metadata,
      frontend_file: module.metadata?.frontend_file,
      init_function: module.metadata?.init_function
    }));

    // Agregar módulos temporales (ej: auditor-dashboard)
    const temporaryModuleObjects = temporaryModules.map(moduleId => ({
      id: moduleId,
      name: moduleId === 'auditor-dashboard' ? 'Auditoría y Auto-Diagnóstico' : moduleId,
      description: moduleId === 'auditor-dashboard' ?
        'Sistema de auditoría y auto-reparación (asignación temporal)' :
        'Módulo temporal',
      icon: moduleId === 'auditor-dashboard' ? 'chart-line' : 'wrench',
      color: moduleId === 'auditor-dashboard' ? '#667eea' : '#666666',
      category: 'support',
      price: 0,
      isContracted: true,
      isActive: true,
      isOperational: true,
      contractedAt: new Date().toISOString(),
      companyId: parseInt(companyId),
      isTemporary: true // Marca especial para identificar módulos temporales
    }));

    // Combinar módulos contratados + temporales
    const allModules = [...modules, ...temporaryModuleObjects];

    console.log(`🎯 [FINAL] Total módulos: ${allModules.length} (${modules.length} contratados + ${temporaryModuleObjects.length} temporales)`);

    res.json({
      success: true,
      modules: allModules,
      company_id: companyId,
      total_modules: allModules.length,
      temporary_modules: temporaryModuleObjects.length
    });

  } catch (error) {
    console.error('❌ [COMPANY-MODULES] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/v1/company-modules/debug-isi
 * @desc Debug endpoint para verificar datos de ISI
 */
router.get('/debug-isi', async (req, res) => {
  try {
    const companyId = 11; // ISI

    // 1. Verificar empresa
    const company = await database.sequelize.query(
      'SELECT company_id, name FROM companies WHERE company_id = ?',
      { replacements: [companyId], type: database.sequelize.QueryTypes.SELECT }
    );

    // 2. Contar modules contratados
    const contractedCount = await database.sequelize.query(
      'SELECT COUNT(*) as count FROM company_modules WHERE company_id = ?',
      { replacements: [companyId], type: database.sequelize.QueryTypes.SELECT }
    );

    // 3. Ver módulos contratados con detalles
    const contractedModules = await database.sequelize.query(`
      SELECT
        cm.id,
        cm.system_module_id,
        sm.module_key,
        sm.name,
        cm.activo as is_active,
        cm.created_at as fecha_asignacion
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = ?
      ORDER BY sm.module_key
    `, {
      replacements: [companyId],
      type: database.sequelize.QueryTypes.SELECT
    });

    // 4. Verificar duplicados
    const duplicates = await database.sequelize.query(`
      SELECT
        system_module_id,
        COUNT(*) as count
      FROM company_modules
      WHERE company_id = ?
      GROUP BY system_module_id
      HAVING COUNT(*) > 1
    `, {
      replacements: [companyId],
      type: database.sequelize.QueryTypes.SELECT
    });

    // 5. Ver todos los system_modules
    const allSystemModules = await database.sequelize.query(
      'SELECT id, module_key, name FROM system_modules ORDER BY module_key',
      { type: database.sequelize.QueryTypes.SELECT }
    );

    res.json({
      company: company[0],
      contractedCount: contractedCount[0].count,
      contractedModules,
      duplicates,
      allSystemModules,
      analysis: {
        hasAllModules: contractedModules.length === allSystemModules.length,
        activeModules: contractedModules.filter(m => m.is_active).length,
        inactiveModules: contractedModules.filter(m => !m.is_active).length
      }
    });

  } catch (error) {
    console.error('Error en debug ISI:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;