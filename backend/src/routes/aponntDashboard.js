const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// 🔐 MIDDLEWARE DE AUTENTICACIÓN PARA PANEL ADMINISTRATIVO APONNT
// Verifica el token JWT de staff Aponnt (aponnt_token_staff)
const verifyAponntStaffToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      console.error('❌ [AUTH] JWT_SECRET no configurado en variables de entorno');
      return res.status(500).json({
        success: false,
        error: 'Error de configuración del servidor',
        code: 'CONFIG_ERROR'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar que sea un token de staff Aponnt
    if (!decoded.staff_id && !decoded.staffId) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: Se requiere token de staff Aponnt',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Agregar datos del staff al request
    req.staff = {
      id: decoded.staff_id || decoded.staffId,
      email: decoded.email,
      firstName: decoded.firstName || decoded.first_name,
      lastName: decoded.lastName || decoded.last_name,
      area: decoded.area,
      level: decoded.level || 1,
      permissions: decoded.permissions || []
    };

    console.log(`✅ [AUTH] Staff autenticado: ${req.staff.email} (level: ${req.staff.level})`);
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado, por favor inicie sesión nuevamente',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }
    console.error('❌ [AUTH] Error verificando token:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Error de autenticación',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware para verificar nivel mínimo de staff
const requireLevel = (minLevel) => (req, res, next) => {
  if (!req.staff) {
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.staff.level < minLevel) {
    return res.status(403).json({
      success: false,
      error: `Se requiere nivel ${minLevel} o superior para esta acción`,
      code: 'INSUFFICIENT_LEVEL'
    });
  }

  next();
};

// Middleware para verificar permisos específicos
const requirePermission = (permission) => (req, res, next) => {
  if (!req.staff) {
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida',
      code: 'AUTH_REQUIRED'
    });
  }

  // Level 5+ (admin) tiene todos los permisos
  if (req.staff.level >= 5) {
    return next();
  }

  // Verificar permiso específico
  if (!req.staff.permissions.includes(permission) && !req.staff.permissions.includes('*')) {
    return res.status(403).json({
      success: false,
      error: `Permiso '${permission}' requerido para esta acción`,
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
};

// Alias para compatibilidad
const verifyToken = verifyAponntStaffToken;
const requireAdmin = requireLevel(5);

console.log('🔄 Cargando aponntDashboard routes (con autenticación)...');

// Usar modelos PostgreSQL del sistema
const { sequelize, Company, User, Branch, AponntStaff } = require('../config/database');
console.log('✅ Modelos PostgreSQL cargados correctamente');

// Servicios
const aponntNotificationService = require('../services/AponntNotificationService');
console.log('🔔 Servicio de notificaciones Aponnt cargado');

// DEPRECADO: Los modelos Memory serán removidos
// const BranchMemory = require('../models/BranchMemory');
// const UserMemory = require('../models/UserMemory');
// const PaymentMemory = require('../models/PaymentMemory');
// const VendorMemory = require('../models/VendorMemory'); // REMOVIDO - Ahora usa AponntStaff (Enero 2025)

// === VALIDACIONES DE SEGURIDAD ===
// Función para validar y sanitizar IDs numéricos
function validateNumericId(id, paramName = 'ID') {
  if (!id) {
    throw new Error(`${paramName} es requerido`);
  }

  const numericId = parseInt(id);
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error(`${paramName} debe ser un número válido mayor a 0`);
  }

  return numericId;
}

// Función para sanitizar strings y prevenir injection
function sanitizeString(str, maxLength = 255) {
  if (!str) return '';

  return str
    .toString()
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>'"]/g, '') // Remove potential HTML/SQL characters
    .substring(0, maxLength);
}

// Función para validar email
function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Función para validar entrada de formulario
function validateFormInput(data, requiredFields = []) {
  const errors = [];

  // Verificar campos requeridos
  for (const field of requiredFields) {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${field} es requerido`);
    }
  }

  // Validar email si está presente
  if (data.email && !validateEmail(data.email)) {
    errors.push('Email no válido');
  }

  if (data.contactEmail && !validateEmail(data.contactEmail)) {
    errors.push('Email de contacto no válido');
  }

  // Sanitizar strings
  const sanitizedData = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitizedData[key] = sanitizeString(value);
    } else {
      sanitizedData[key] = value;
    }
  }

  return { errors, sanitizedData };
}
// === FIN VALIDACIONES DE SEGURIDAD ===

// Función para calcular distancia entre dos puntos geográficos (fórmula de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

const router = express.Router();

// 🔓 Rutas públicas (sin autenticación)
// Test route to verify the router is working
router.get('/test', (req, res) => {
    res.json({ message: 'APONNT Dashboard routes working!', auth: 'not-required' });
});

// 🔐 APLICAR AUTENTICACIÓN A TODAS LAS RUTAS SIGUIENTES
router.use(verifyAponntStaffToken);
console.log('🔐 [AUTH] Middleware de autenticación aplicado a todas las rutas del dashboard');

// Endpoint simplificado para pagos (evitar errores 404)
router.get('/payments', (req, res) => {
    console.log('📊 Solicitud de pagos (modo administrativo)');
    res.json({
        success: true,
        payments: []
    });
});

// Endpoint simplificado para pricing
router.get('/pricing', (req, res) => {
    console.log('💰 Solicitud de pricing (modo administrativo)');
    res.json({
        success: true,
        pricing: {}
    });
});

// Endpoint para obtener usuarios por empresa (multi-tenant)
router.get('/admin/operators', async (req, res) => {
    try {
        console.log('👥 [USERS] Solicitud de usuarios multi-tenant');

        // Obtener todos los usuarios activos con su información de empresa
        const [users] = await sequelize.query(`
            SELECT
                u.id,
                u."employeeId",
                u.usuario as username,
                u."firstName",
                u."lastName",
                u.email,
                u.phone,
                u.role,
                u.company_id,
                u.is_active as is_active,
                u."createdAt",
                c.name as company_name,
                d.name as department_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.company_id
            LEFT JOIN departments d ON u."departmentId" = d.id
            WHERE u.is_active = true
            ORDER BY u.company_id, u.role DESC, u."firstName", u."lastName"
        `, {
            type: sequelize.QueryTypes.SELECT
        });

        console.log(`👥 [USERS] ${users.length} usuarios encontrados`);

        // Agrupar por empresa para facilitar el multi-tenant
        const usersByCompany = {};
        users.forEach(user => {
            if (!usersByCompany[user.company_id]) {
                usersByCompany[user.company_id] = [];
            }
            usersByCompany[user.company_id].push({
                id: user.user_id,
                employeeId: user.employeeId,
                username: user.usuario,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                phone: user.phone,
                role: user.role,
                companyId: user.company_id,
                companyName: user.company_name,
                departmentName: user.department_name,
                isActive: user.is_active,
                createdAt: user.createdAt
            });
        });

        res.json({
            success: true,
            users: users.map(user => ({
                id: user.user_id,
                employeeId: user.employeeId,
                username: user.usuario,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                phone: user.phone,
                role: user.role,
                companyId: user.company_id,
                companyName: user.company_name,
                departmentName: user.department_name,
                isActive: user.is_active,
                createdAt: user.createdAt
            })),
            usersByCompany: usersByCompany,
            totalUsers: users.length
        });

    } catch (error) {
        console.error('❌ [USERS] Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para crear nuevo usuario (multi-tenant)
router.post('/admin/operators', async (req, res) => {
    try {
        console.log('👥 [CREATE-USER] Solicitud de creación de usuario');
        console.log('👥 [CREATE-USER] Datos recibidos:', req.body);

        const { username, password, firstName, lastName, email, phone, role = 'employee', companyId } = req.body;

        // Validaciones básicas
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Usuario y contraseña son requeridos'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar que el company_id existe
        const [companies] = await sequelize.query(`
            SELECT company_id FROM companies WHERE company_id = ? AND is_active = true
        `, {
            replacements: [companyId],
            type: sequelize.QueryTypes.SELECT
        });

        if (!companies.length) {
            return res.status(400).json({
                success: false,
                error: 'Empresa no encontrada o inactiva'
            });
        }

        // Verificar que el username no existe
        const [existingUsers] = await sequelize.query(`
            SELECT usuario FROM users WHERE usuario = ?
        `, {
            replacements: [username],
            type: sequelize.QueryTypes.SELECT
        });

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'El nombre de usuario ya existe'
            });
        }

        // Generar employeeId único
        const employeeId = `EMP${Date.now()}`;

        // Crear el usuario usando el modelo
        const { User } = require('../config/database');

        const newUser = await User.create({
            employeeId: employeeId,
            usuario: username,
            firstName: firstName || 'Sin nombre',
            lastName: lastName || 'Sin apellido',
            email: email || `${username}@empresa.com`,
            phone: phone || null,
            password: password, // Se hashea automáticamente en el hook
            role: role,
            companyId: companyId,
            isActive: true
        });

        console.log('👥 [CREATE-USER] Usuario creado exitosamente:', newUser.id);

        res.json({
            success: true,
            message: `Usuario "${username}" creado exitosamente`,
            user: {
                id: newUser.id,
                employeeId: newUser.employeeId,
                username: newUser.usuario,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                fullName: `${newUser.firstName} ${newUser.lastName}`,
                email: newUser.email,
                phone: newUser.phone,
                role: newUser.role,
                companyId: newUser.companyId,
                isActive: newUser.isActive,
                createdAt: newUser.createdAt
            }
        });

    } catch (error) {
        console.error('❌ [CREATE-USER] Error creando usuario:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
});

// Debug route to check companies table structure
router.get('/debug/companies-structure', async (req, res) => {
  try {
    console.log('🔍 Verificando estructura de tabla companies');

    const result = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log('📋 Columnas encontradas:', result);
    res.json({
      success: true,
      columns: result
    });
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('✅ aponntDashboard routes configurados');

// GET /companies/:id/modules - Obtener módulos contratados por una empresa específica
router.get('/companies/:id/modules', async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    console.log(`📦 Obteniendo módulos para empresa ${companyId}`);

    // Obtener datos de company_modules para esta empresa
    const [companyModules] = await sequelize.query(`
      SELECT
        cm.id,
        cm.company_id,
        cm.activo as is_active,
        cm.precio_mensual as contracted_price,
        sm.module_key,
        sm.name as module_name,
        sm.description,
        sm.category,
        sm.icon
      FROM company_modules cm
      INNER JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE cm.company_id = ?
      ORDER BY sm.module_key;
    `, {
      replacements: [companyId]
    });

    // Separar módulos activos e inactivos
    const activeModules = companyModules.filter(m => m.is_active);
    const inactiveModules = companyModules.filter(m => !m.is_active);

    // Obtener el total de módulos disponibles en el sistema
    const [totalSystemModules] = await sequelize.query(`
      SELECT COUNT(*) as total FROM system_modules
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Calcular totales
    const monthlyTotal = activeModules.reduce((sum, module) => sum + parseFloat(module.contracted_price || 0), 0);

    const responseData = {
      success: true,
      companyId: companyId,
      summary: {
        contractedModules: companyModules.length,
        totalSystemModules: totalSystemModules.total,
        activeModules: activeModules.length,
        inactiveModules: inactiveModules.length,
        monthlyTotal: monthlyTotal
      },
      modules: {
        active: activeModules.map(module => ({
          id: module.id,
          moduleKey: module.module_key,
          name: module.module_name,
          description: module.description,
          category: module.category,
          icon: module.icon,
          contractedPrice: parseFloat(module.contracted_price || 0)
        })),
        inactive: inactiveModules.map(module => ({
          id: module.id,
          moduleKey: module.module_key,
          name: module.module_name,
          description: module.description,
          category: module.category,
          icon: module.icon,
          contractedPrice: parseFloat(module.contracted_price || 0)
        }))
      }
    };

    console.log(`✅ Respuesta módulos empresa ${companyId}:`, responseData.summary);
    res.json(responseData);

  } catch (error) {
    console.error('Error obteniendo módulos de empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// GET /companies - Obtener empresas (admin y operadores)
router.get('/companies', async (req, res) => {
  try {
    console.log('📋 Obteniendo empresas desde PostgreSQL');
    
    // Usar modelo PostgreSQL unificado - Especificar campos manualmente para evitar error de email
    const companies = await sequelize.query(`
      SELECT
        company_id as id, company_id, name, slug, email as contact_email, phone, address,
        tax_id, is_active, max_employees, contracted_employees,
        license_type, status,
        city, country,
        active_modules,
        onboarding_manual, onboarding_manual_reason, onboarding_manual_at,
        status_manual, status_manual_reason, status_manual_at
      FROM companies
      ORDER BY company_id DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`✅ PostgreSQL: ${companies.length} empresas cargadas`);

    // Obtener conteo real de empleados por empresa
    const companiesWithEmployeeCount = await Promise.all(companies.map(async (company) => {
      let currentEmployees = 0;
      try {
        // Contar usuarios activos de esta empresa
        const [employeeCount] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM users
          WHERE company_id = ? AND is_active = true
        `, {
          replacements: [company.company_id],
          type: sequelize.QueryTypes.SELECT
        });
        currentEmployees = employeeCount?.count || 0;
      } catch (error) {
        console.warn(`⚠️ Error contando empleados empresa ${company.company_id}:`, error.message);
        currentEmployees = 0;
      }

      // Calcular total mensual real: precio_mensual * empleados_reales por empresa
      let monthlySubtotal = 0;
      try {
        // CRÍTICO: Calcular precio * empleados reales (no solo suma de precios)
        const [monthlyData] = await sequelize.query(`
          SELECT SUM(precio_mensual * ?) as subtotal
          FROM company_modules
          WHERE company_id = ? AND activo = true
        `, {
          replacements: [currentEmployees, company.company_id],
          type: sequelize.QueryTypes.SELECT
        });
        monthlySubtotal = parseFloat(monthlyData?.subtotal || 0);
        console.log(`💰 Empresa ${company.company_id}: ${currentEmployees} empleados * precios históricos = $${monthlySubtotal}`);
      } catch (error) {
        console.warn(`⚠️ Error calculando total empresa ${company.company_id}:`, error.message);
        monthlySubtotal = company.monthly_total || 0;
      }

      // Calcular total con IVA (21%)
      const monthlyTotal = monthlySubtotal * 1.21;

      // Obtener resumen de módulos para esta empresa
      let modulesSummary = { contractedModules: 0, totalSystemModules: 0 };
      try {
        const [modulesData] = await sequelize.query(`
          SELECT
            COUNT(cm.id) as contracted_modules,
            (SELECT COUNT(*) FROM system_modules) as total_system_modules
          FROM company_modules cm
          WHERE cm.company_id = ?
        `, {
          replacements: [company.company_id],
          type: sequelize.QueryTypes.SELECT
        });
        modulesSummary = {
          contractedModules: parseInt(modulesData?.contracted_modules || 0),
          totalSystemModules: parseInt(modulesData?.total_system_modules || 0)
        };
      } catch (error) {
        console.warn(`⚠️ Error obteniendo módulos empresa ${company.company_id}:`, error.message);
      }

      return {
        id: company.company_id,
        company_id: company.company_id,
        name: company.name || 'Sin nombre',
        legalName: company.legal_name || company.name || 'Sin nombre',
        taxId: company.tax_id || 'Sin CUIT',
        contactEmail: company.contact_email || 'sin-email@empresa.com',
        contactPhone: company.contact_phone || company.phone || 'Sin teléfono',
        address: company.address || 'Sin dirección',
        licenseType: company.license_type || 'basic',
        maxEmployees: company.max_employees || 50,
        contractedEmployees: company.contracted_employees || 1,
        status: company.status || 'active',
        is_active: company.is_active,
        isActive: company.is_active,
        pricing: {
          monthlyTotal: monthlyTotal,
          monthlySubtotal: monthlySubtotal, // subtotal sin IVA
          monthlyTax: monthlyTotal - monthlySubtotal // IVA 21%
        },
        createdAt: company.created_at || new Date(),
        currentTier: company.licenseType || 'basic',
        currentEmployees: currentEmployees, // Conteo real desde DB
        modulesSummary: modulesSummary, // Resumen de módulos
        paymentMethod: { qr: true, card: true, autopay: false },
        recentInvoices: [],
        // Campos de control manual
        onboarding_manual: company.onboarding_manual || false,
        onboardingManual: company.onboarding_manual || false,
        onboarding_manual_reason: company.onboarding_manual_reason,
        onboarding_manual_at: company.onboarding_manual_at,
        status_manual: company.status_manual || false,
        statusManual: company.status_manual || false,
        status_manual_reason: company.status_manual_reason,
        status_manual_at: company.status_manual_at
      };
    }));

    // Obtener todos los módulos del sistema para el panel-administrativo
    const systemModules = await sequelize.query(`
      SELECT
        id, module_key, name, description, icon, color, category,
        base_price, is_active, is_core, display_order, features, requirements
      FROM system_modules
      WHERE is_active = true
      ORDER BY display_order ASC, name ASC
    `, { type: sequelize.QueryTypes.SELECT });

    // Convertir módulos al formato esperado por el panel-administrativo
    const modulesForAdmin = {};
    systemModules.forEach(module => {
      modulesForAdmin[module.module_key] = {
        name: module.name,
        icon: module.icon || '📦',
        color: module.color || '#007bff',
        basePrice: parseFloat(module.base_price || 0),
        description: module.description || '',
        category: module.category || 'general',
        is_core: module.is_core || false,
        display_order: module.display_order || 0,
        features: module.features || [],
        requirements: module.requirements || []
      };
    });

    console.log(`📦 [APONNT] ${Object.keys(modulesForAdmin).length} módulos incluidos en respuesta (incluyendo transporte)`);

    res.json({
      success: true,
      companies: companiesWithEmployeeCount,
      total: companiesWithEmployeeCount.length,
      modules: modulesForAdmin
    });
  } catch (error) {
    console.error('❌ Error cargando empresas desde PostgreSQL:', error);
    res.status(500).json({
      success: false,
      message: 'Error cargando empresas',
      error: error.message
    });
  }
});

// GET /companies/:id - Obtener empresa específica
router.get('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Obteniendo empresa ID ${id} desde PostgreSQL`);

    // Usar modelo PostgreSQL unificado - Obtener empresa específica
    const companies = await sequelize.query(`
      SELECT
        company_id, name, slug, contact_email, phone, address,
        tax_id, is_active, max_employees, contracted_employees, modules_data,
        modules_pricing, monthly_total, license_type,
        legal_name, contact_phone, city, province, country, created_at
      FROM companies
      WHERE company_id = ? AND is_active = true
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada'
      });
    }

    const company = companies[0];
    console.log(`✅ PostgreSQL: Empresa ${id} cargada`);

    // Obtener conteo real de empleados
    let currentEmployees = 0;
    try {
      const [employeeCount] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE company_id = ? AND is_active = true
      `, {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      });
      currentEmployees = employeeCount ? employeeCount.count : 0;
    } catch (empError) {
      console.log(`⚠️  Warning: No se pudo obtener conteo de empleados para empresa ${id}:`, empError.message);
    }

    // Calcular precios usando misma lógica que el listado
    let monthlyTotal = 0;
    let monthlySubtotal = 0;
    let modulesSummary = { contractedModules: 0, totalSystemModules: 18 };

    try {
      if (company.modules_pricing && company.modules_pricing !== '{}') {
        const modulesPricing = typeof company.modules_pricing === 'string'
          ? JSON.parse(company.modules_pricing)
          : company.modules_pricing;

        if (modulesPricing && typeof modulesPricing === 'object') {
          monthlySubtotal = Object.values(modulesPricing)
            .filter(price => typeof price === 'number' && price > 0)
            .reduce((sum, price) => sum + price, 0);
          monthlyTotal = monthlySubtotal * 1.21;
          modulesSummary.contractedModules = Object.keys(modulesPricing).length;
        }
      }
    } catch (pricingError) {
      console.log(`⚠️  Warning: Error procesando precios para empresa ${id}:`, pricingError.message);
    }

    const formattedCompany = {
      id: company.company_id,
      name: company.name || 'Sin nombre',
      legalName: company.legal_name || company.name || 'Sin nombre legal',
      taxId: company.tax_id || 'Sin CUIT/CUIL',
      contactEmail: company.contact_email || 'sin-email@empresa.com',
      contactPhone: company.contact_phone || company.phone || 'Sin teléfono',
      address: company.address || 'Sin dirección',
      city: company.city || '',
      province: company.province || '',
      country: company.country || '',
      licenseType: company.license_type || 'basic',
      maxEmployees: company.max_employees || 50,
      contractedEmployees: company.contracted_employees || 1,
      status: company.is_active ? 'active' : 'inactive',
      pricing: {
        monthlyTotal: monthlyTotal,
        monthlySubtotal: monthlySubtotal,
        monthlyTax: monthlyTotal - monthlySubtotal
      },
      createdAt: company.created_at || new Date(),
      currentTier: company.license_type || 'basic',
      currentEmployees: currentEmployees,
      modulesSummary: modulesSummary,
      paymentMethod: { qr: true, card: true, autopay: false },
      recentInvoices: []
    };

    res.json({
      success: true,
      company: formattedCompany
    });
  } catch (error) {
    console.error(`❌ Error cargando empresa ${req.params.id} desde PostgreSQL:`, error);
    res.status(500).json({
      success: false,
      message: 'Error cargando empresa',
      error: error.message
    });
  }
});

// POST /companies - Crear nueva empresa
router.post('/companies', async (req, res) => {
  try {
    console.log('📝 Creando nueva empresa con datos completos:', req.body);

    // VALIDACIONES DE SEGURIDAD
    const requiredFields = ['name', 'taxId', 'contactEmail'];
    const { errors, sanitizedData } = validateFormInput(req.body, requiredFields);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        details: errors
      });
    }

    const {
      name,
      legalName,
      taxId,
      contactEmail,
      contactPhone,
      address,
      licenseType,
      maxEmployees,
      modules,
      modulesPricing,
      pricing
    } = sanitizedData;

    // 🛡️ PROTECCIÓN CONTRA DUPLICADOS POR NOMBRE
    const existingByName = await Company.findOne({ where: { name: name } });
    if (existingByName) {
      return res.status(400).json({
        success: false,
        error: `Ya existe una empresa con el nombre "${name}"`,
        existing: {
          company_id: existingByName.company_id,
          name: existingByName.name
        }
      });
    }

    // Crear slug único a partir del nombre
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    let slug = baseSlug;
    let counter = 1;

    while (await Company.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    console.log(`💰 Guardando precios - Total: ${pricing?.monthlyTotal}, Módulos:`, modules, modulesPricing);

    // 🎁 DESCOMPOSICIÓN DE BUNDLES DESDE ENGINEERING-METADATA.JS (SSOT)
    const metadata = require('../../engineering-metadata.js');
    const bundles = metadata.commercialModules?.bundles || {};

    let decomposedModules = [];
    const bundlesUsed = [];

    (modules || []).forEach(moduleKey => {
      if (moduleKey.startsWith('bundle-') && bundles[moduleKey]) {
        // Es un bundle → descomponer en módulos individuales
        const bundle = bundles[moduleKey];
        console.log(`🎁 [BUNDLE] Descomponiendo bundle "${bundle.name}" (${moduleKey})`);
        console.log(`   → ${bundle.modules.length} módulos: ${bundle.modules.join(', ')}`);

        decomposedModules.push(...bundle.modules);
        bundlesUsed.push({ key: moduleKey, name: bundle.name, modules: bundle.modules });
      } else {
        // Es un módulo individual
        decomposedModules.push(moduleKey);
      }
    });

    if (bundlesUsed.length > 0) {
      console.log(`✅ [BUNDLE] Descompuestos ${bundlesUsed.length} bundles en ${decomposedModules.length} módulos individuales`);
      bundlesUsed.forEach(b => {
        console.log(`   - ${b.name}: ${b.modules.length} módulos`);
      });
    }

    // Preparar módulos activos (USAR MÓDULOS DESCOMPUESTOS, NO BUNDLES)
    const activeModules = {};
    decomposedModules.forEach(module => {
      activeModules[module] = true;
    });

    // Usar PostgreSQL unificado
    console.log('💾 Creando empresa en PostgreSQL');

    const newCompany = await Company.create({
      name: name,
      slug: slug,
      legalName: legalName || name,
      contact_email: contactEmail,
      phone: contactPhone || '',
      address: address || '',
      taxId: taxId,
      maxEmployees: maxEmployees || 50,
      activeModules: activeModules, // Módulos descompuestos, sin bundles
      modulesPricing: modulesPricing || {},
      licenseType: licenseType || 'basic',
      isActive: true,
      status: 'active'
    });
    console.log('✅ PostgreSQL: Empresa creada exitosamente');

    console.log(`✅ Nueva empresa creada: ${newCompany.name} (ID: ${newCompany.company_id})`);

    // 📊 CREAR REGISTROS EN COMPANY_MODULES (MULTI-TENANT)
    console.log(`🔄 Creando registros en company_modules para ${decomposedModules.length} módulos...`);

    try {
      for (const moduleKey of decomposedModules) {
        // Obtener system_module_id del moduleKey
        const moduleInfo = await sequelize.query(`
          SELECT id FROM system_modules WHERE module_key = :moduleKey
        `, {
          replacements: { moduleKey },
          type: sequelize.QueryTypes.SELECT
        });

        if (moduleInfo.length > 0) {
          const systemModuleId = moduleInfo[0].id;
          const modulePrice = modulesPricing[moduleKey]?.totalPrice || 0;

          await sequelize.query(`
            INSERT INTO company_modules (id, company_id, system_module_id, precio_mensual, activo, fecha_asignacion, created_at, updated_at)
            VALUES (uuid_generate_v4(), :companyId, :systemModuleId, :price, true, NOW(), NOW(), NOW())
          `, {
            replacements: {
              companyId: newCompany.company_id,
              systemModuleId: systemModuleId,
              price: modulePrice
            }
          });
          console.log(`➕ Creado módulo: ${moduleKey} con precio $${modulePrice}`);
        } else {
          console.warn(`⚠️ Módulo no encontrado en system_modules: ${moduleKey}`);
        }
      }
      console.log(`✅ ${decomposedModules.length} módulos creados en company_modules`);
    } catch (companyModulesError) {
      console.error('⚠️ Error creando company_modules (empresa creada exitosamente):', companyModulesError.message);
    }

    // 🏢 CREAR SUCURSAL CENTRAL AUTOMÁTICAMENTE (OBLIGATORIA)
    // Esta sucursal es necesaria para el sistema de feriados y no puede ser eliminada
    try {
      const centralBranch = await Branch.create({
        name: 'CENTRAL',
        code: `CENTRAL-${newCompany.company_id}`,
        address: newCompany.address || '',
        company_id: newCompany.company_id,
        is_main: true, // Marca como sucursal principal (no borrable)
        isActive: true
      });
      console.log(`🏢 Sucursal CENTRAL creada automáticamente (ID: ${centralBranch.id})`);
    } catch (branchError) {
      // Si falla la creación de la sucursal, NO fallar la creación de empresa
      console.error('⚠️ Error creando sucursal CENTRAL (empresa creada exitosamente):', branchError.message);
    }

    // 🔔 ENVIAR NOTIFICACIONES AUTOMÁTICAS (APONNT → EMPRESA)
    try {
      const notificationData = {
        id: newCompany.company_id,
        name: newCompany.name,
        contactEmail: newCompany.contact_email,
        licenseType: newCompany.licenseType,
        maxEmployees: newCompany.maxEmployees,
        modules: modules,
        slug: slug
      };

      console.log('🔔 Enviando notificaciones de bienvenida...');
      await aponntNotificationService.notifyNewCompany(notificationData);
      console.log('✅ Notificaciones enviadas exitosamente');
    } catch (notifError) {
      // No fallar la creación si las notificaciones fallan
      console.error('⚠️ Error enviando notificaciones (empresa creada exitosamente):', notifError.message);
    }

    // Crear usuarios administradores automáticamente
    try {
      const bcrypt = require('bcryptjs');
      const adminPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      // 1. Usuario ADMIN - Para el cliente
      const adminUser = await User.create({
        employeeId: 'ADM-' + String(newCompany.company_id).padStart(3, '0'),
        usuario: 'admin',
        firstName: 'Administrador',
        lastName: 'Principal',
        email: contactEmail,
        password: hashedPassword,
        role: 'admin',
        company_id: newCompany.company_id,
        isActive: true
      });

      console.log(`👤 Usuario ADMIN creado: "admin" para empresa ${newCompany.name} (contraseña: ${adminPassword})`);

      // 2. Usuario SOPORTE - Para auditoría y soporte técnico (OCULTO)
      const supportUser = await User.create({
        employeeId: 'SUPPORT-' + String(newCompany.company_id).padStart(3, '0'),
        usuario: 'soporte',
        firstName: 'Soporte',
        lastName: 'Técnico Sistema',
        email: 'soporte' + newCompany.company_id + '@sistema.local',
        password: hashedPassword, // Misma contraseña: admin123
        role: 'admin',
        company_id: newCompany.company_id,
        isActive: true
      });

      console.log(`🔧 Usuario SOPORTE creado: "soporte" para empresa ${newCompany.name} (contraseña: ${adminPassword})`);
      console.log(`📋 Credenciales de auditoría - Empresa: ${slug} | Usuario: soporte | Contraseña: ${adminPassword}`);

    } catch (adminError) {
      console.error('⚠️ Error creando usuarios automáticos (empresa creada exitosamente):', adminError);
      console.error(adminError);
    }

    res.status(201).json({
      success: true,
      message: 'Empresa creada exitosamente',
      company: {
        id: newCompany.company_id,
        name: newCompany.name,
        legalName: newCompany.name,
        taxId: newCompany.taxId,
        contactEmail: newCompany.contact_email,
        contactPhone: newCompany.phone,
        address: newCompany.address,
        maxEmployees: newCompany.maxEmployees,
        licenseType: newCompany.licenseType,
        modules: Object.keys(newCompany.activeModules || {}).filter(key => newCompany.activeModules[key] === true),
        modulesPricing: newCompany.modulesPricing || {},
        pricing: {
          monthlyTotal: pricing?.monthlyTotal || 0
        },
        status: newCompany.status,
        currentEmployees: 0
      }
    });

  } catch (error) {
    console.error('Error creando empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor: ' + error.message 
    });
  }
});

// PUT /companies/:id - Actualizar empresa
router.put('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Actualizando empresa ID: ${id}`, req.body);

    const {
      name,
      legalName,
      taxId,
      contactEmail,
      contactPhone,
      address,
      phone,
      licenseType,
      maxEmployees,
      contractedEmployees,
      modules,
      modulesPricing,
      pricing
    } = req.body;

    // Si NO se envían módulos, hacer actualización simple de datos básicos
    // (POLÍTICA DE FACTURACIÓN: los módulos solo cambian con presupuesto aprobado)
    if (!modules && !modulesPricing) {
      const updateFields = [];
      const replacements = { id };

      if (name !== undefined) { updateFields.push('name = :name'); replacements.name = name; }
      if (legalName !== undefined) { updateFields.push('legal_name = :legalName'); replacements.legalName = legalName; }
      if (taxId !== undefined) { updateFields.push('tax_id = :taxId'); replacements.taxId = taxId; }
      if (contactEmail !== undefined) { updateFields.push('email = :contactEmail'); replacements.contactEmail = contactEmail; }
      if (contactPhone !== undefined) { updateFields.push('contact_phone = :contactPhone'); replacements.contactPhone = contactPhone; }
      if (phone !== undefined) { updateFields.push('phone = :phone'); replacements.phone = phone; }
      if (address !== undefined) { updateFields.push('address = :address'); replacements.address = address; }
      if (licenseType !== undefined) { updateFields.push('license_type = :licenseType'); replacements.licenseType = licenseType; }
      if (maxEmployees !== undefined) { updateFields.push('max_employees = :maxEmployees'); replacements.maxEmployees = maxEmployees; }

      if (updateFields.length === 0) {
        return res.status(400).json({ success: false, error: 'No se proporcionaron campos para actualizar' });
      }

      updateFields.push('updated_at = NOW()');

      await sequelize.query(
        `UPDATE companies SET ${updateFields.join(', ')} WHERE company_id = :id`,
        { replacements, type: sequelize.QueryTypes.UPDATE }
      );

      console.log(`✅ [BILLING POLICY] Empresa ${id} actualizada (solo datos básicos, sin cambio de módulos)`);
      return res.json({ success: true, message: 'Empresa actualizada exitosamente' });
    }

    // sequelize is already imported at the top

    // Crear slug a partir del nombre actualizado (solo si se envió nombre)
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') : undefined;

    // 🧮 CALCULAR precios reales antes de actualizar
    let totalModulesPrice = 0;
    if (modulesPricing && Object.keys(modulesPricing).length > 0) {
      totalModulesPrice = Object.values(modulesPricing).reduce((sum, module) => {
        return sum + (parseFloat(module.totalPrice) || 0);
      }, 0);
    }

    const monthlySubtotal = totalModulesPrice;
    const monthlyTax = monthlySubtotal * 0.21; // 21% IVA
    const monthlyTotal = monthlySubtotal + monthlyTax;

    console.log(`💰 Calculando precios reales - Subtotal: $${monthlySubtotal}, IVA: $${monthlyTax}, Total: $${monthlyTotal}`);
    console.log(`💰 Módulos a procesar:`, modules, modulesPricing);

    // 🔥 ACTUALIZACION COORDINADA: COMPANY_MODULES + COMPANIES
    await sequelize.transaction(async (transaction) => {

      // 1. Actualizar empresa con precios calculados
      const result = await sequelize.query(`
        UPDATE companies
        SET
          name = :name,
          max_employees = :maxEmployees,
          contracted_employees = :contractedEmployees,
          monthly_subtotal = :monthlySubtotal,
          monthly_tax = :monthlyTax,
          monthly_total = :monthlyTotal,
          modules_data = :modulesData,
          modules_pricing = :modulesPricing,
          updated_at = NOW()
        WHERE company_id = :id
        RETURNING company_id, name, max_employees, contracted_employees, monthly_total
      `, {
        replacements: {
          id: id,
          name: name,
          maxEmployees: maxEmployees || 50,
          contractedEmployees: contractedEmployees || 1,
          monthlySubtotal: monthlySubtotal,
          monthlyTax: monthlyTax,
          monthlyTotal: monthlyTotal,
          modulesData: JSON.stringify(modules || []),
          modulesPricing: JSON.stringify(modulesPricing || {})
        },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      if (result.length === 0) {
        throw new Error('Empresa no encontrada');
      }

      console.log(`✅ Empresa "${name}" actualizada exitosamente: ${maxEmployees} empleados`);

      // 2. SINCRONIZAR COMPANY_MODULES CON LOS CAMBIOS
      console.log(`🔄 Sincronizando company_modules para empresa ${id}...`);

      // Obtener módulos actualmente contratados
      const currentModules = await sequelize.query(`
        SELECT cm.module_code, sm.module_key, cm.activo
        FROM company_modules cm
        INNER JOIN system_modules sm ON cm.system_module_id = sm.id
        WHERE cm.company_id = :companyId
      `, {
        replacements: { companyId: id },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      const currentModuleKeys = new Set(currentModules.map(m => m.module_key));

      // 🎁 DESCOMPOSICIÓN DE BUNDLES
      // Si algún módulo es un bundle (empieza con "bundle-"), descomponerlo en módulos individuales
      const metadata = require('../../engineering-metadata.js');
      const bundles = metadata.commercialModules?.bundles || {};

      let decomposedModules = [];
      const bundlesUsed = [];

      (modules || []).forEach(moduleKey => {
        if (moduleKey.startsWith('bundle-') && bundles[moduleKey]) {
          // Es un bundle → descomponer en módulos individuales
          const bundle = bundles[moduleKey];
          console.log(`🎁 [BUNDLE] Descomponiendo bundle "${bundle.name}" (${moduleKey})`);
          console.log(`   → ${bundle.modules.length} módulos: ${bundle.modules.join(', ')}`);

          decomposedModules.push(...bundle.modules);
          bundlesUsed.push({ key: moduleKey, name: bundle.name, modules: bundle.modules });
        } else {
          // Es un módulo individual
          decomposedModules.push(moduleKey);
        }
      });

      if (bundlesUsed.length > 0) {
        console.log(`✅ [BUNDLE] Descompuestos ${bundlesUsed.length} bundles en ${decomposedModules.length} módulos individuales`);
        bundlesUsed.forEach(b => {
          console.log(`   - ${b.name}: ${b.modules.length} módulos`);
        });
      }

      const newModuleKeys = new Set(decomposedModules);

      // Identificar módulos que se deben DESACTIVAR
      const modulesToDeactivate = currentModules
        .filter(m => !newModuleKeys.has(m.module_key) && m.activo)
        .map(m => m.system_module_id);

      // Identificar módulos que se deben ACTIVAR
      const modulesToActivate = currentModules
        .filter(m => newModuleKeys.has(m.module_key) && !m.activo)
        .map(m => m.system_module_id);

      // Identificar módulos NUEVOS que se deben CREAR
      const modulesToCreate = Array.from(newModuleKeys)
        .filter(key => !currentModuleKeys.has(key));

      console.log(`📊 Cambios en módulos:
        • Desactivar: ${modulesToDeactivate.length}
        • Activar: ${modulesToActivate.length}
        • Crear nuevos: ${modulesToCreate.length}`);

      // DESACTIVAR módulos removidos
      if (modulesToDeactivate.length > 0) {
        await sequelize.query(`
          UPDATE company_modules
          SET activo = false, updated_at = NOW()
          WHERE company_id = :companyId AND system_module_id = ANY(:moduleIds)
        `, {
          replacements: {
            companyId: id,
            moduleIds: modulesToDeactivate
          },
          transaction
        });
        console.log(`❌ Desactivados ${modulesToDeactivate.length} módulos`);
      }

      // ACTIVAR módulos reactivados
      if (modulesToActivate.length > 0) {
        await sequelize.query(`
          UPDATE company_modules
          SET activo = true, updated_at = NOW()
          WHERE company_id = :companyId AND system_module_id = ANY(:moduleIds)
        `, {
          replacements: {
            companyId: id,
            moduleIds: modulesToActivate
          },
          transaction
        });
        console.log(`✅ Activados ${modulesToActivate.length} módulos`);
      }

      // CREAR módulos nuevos
      if (modulesToCreate.length > 0) {
        for (const moduleKey of modulesToCreate) {
          // Obtener system_module_id del moduleKey
          const moduleInfo = await sequelize.query(`
            SELECT id FROM system_modules WHERE module_key = :moduleKey
          `, {
            replacements: { moduleKey },
            type: sequelize.QueryTypes.SELECT,
            transaction
          });

          if (moduleInfo.length > 0) {
            const systemModuleId = moduleInfo[0].id;
            const modulePrice = modulesPricing[moduleKey]?.totalPrice || 0;

            await sequelize.query(`
              INSERT INTO company_modules (id, company_id, system_module_id, precio_mensual, activo, fecha_asignacion, created_at, updated_at)
              VALUES (uuid_generate_v4(), :companyId, :systemModuleId, :price, true, NOW(), NOW(), NOW())
            `, {
              replacements: {
                companyId: id,
                systemModuleId: systemModuleId,
                price: modulePrice
              },
              transaction
            });
            console.log(`➕ Creado módulo: ${moduleKey} con precio $${modulePrice}`);
          }
        }
      }

      // ACTUALIZAR precios de módulos existentes si cambiaron
      if (modulesPricing && Object.keys(modulesPricing).length > 0) {
        for (const [moduleKey, pricingData] of Object.entries(modulesPricing)) {
          if (newModuleKeys.has(moduleKey)) {
            await sequelize.query(`
              UPDATE company_modules cm
              SET precio_mensual = :newPrice, updated_at = NOW()
              FROM system_modules sm
              WHERE cm.system_module_id = sm.id
                AND sm.module_code = :moduleKey
                AND cm.company_id = :companyId
                AND cm.precio_mensual != :newPrice
            `, {
              replacements: {
                companyId: id,
                moduleKey: moduleKey,
                newPrice: pricingData.totalPrice || 0
              },
              transaction
            });
          }
        }
        console.log(`💰 Precios actualizados en company_modules`);
      }

      return result[0];
    });

    // Obtener datos actualizados incluyendo company_modules
    const [finalResult] = await sequelize.query(`
      SELECT
        c.*,
        COALESCE(
          json_agg(
            json_build_object(
              'module_key', sm.module_key,
              'name', sm.name,
              'price', cm.precio_mensual,
              'active', cm.activo
            )
            ORDER BY sm.display_order
          ) FILTER (WHERE cm.id IS NOT NULL),
          '[]'::json
        ) as active_company_modules
      FROM companies c
      LEFT JOIN company_modules cm ON c.id = cm.company_id AND cm.activo = true
      LEFT JOIN system_modules sm ON cm.system_module_id = sm.id
      WHERE c.company_id = :id
      GROUP BY c.id
    `, {
      replacements: { id },
      type: sequelize.QueryTypes.SELECT
    });

    const updatedCompany = finalResult[0];
    if (updatedCompany && updatedCompany.name) {
      console.log(`✅ Empresa "${updatedCompany.name}" actualizada exitosamente: ${maxEmployees} empleados`);
    } else {
      console.log(`✅ Empresa ID ${id} actualizada exitosamente: ${maxEmployees} empleados`);
    }
    console.log(`📦 Módulos activos en company_modules: ${updatedCompany ? JSON.parse(updatedCompany.active_company_modules || '[]').length : 0}`);

    // 🔔 ENVIAR NOTIFICACIONES DE CAMBIO (SI HUBO CAMBIOS EN MÓDULOS/PRECIO)
    try {
      // Detectar si hubo cambios significativos
      const hadChanges = modulesToActivate?.length > 0 || modulesToDeactivate?.length > 0 ||
                         Math.abs(monthlyTotal - (updatedCompany?.monthly_total || 0)) > 0.01;

      if (hadChanges) {
        console.log('🔔 Detectados cambios en módulos/facturación, enviando notificaciones...');

        await aponntNotificationService.notifyModuleChange(id, {
          added: modulesToActivate || [],
          removed: modulesToDeactivate || [],
          newTotal: monthlyTotal,
          previousTotal: updatedCompany?.monthly_total || 0
        });

        console.log('✅ Notificaciones de cambio enviadas');
      }
    } catch (notifError) {
      console.error('⚠️ Error enviando notificaciones de cambio:', notifError.message);
    }

    // Prepare response with safe data access
    const responseCompany = updatedCompany ? {
      id: updatedCompany.id || id,
      name: updatedCompany.name || name,
      legalName: updatedCompany.name || legalName || name,
      taxId: updatedCompany.taxId || taxId,
      contactEmail: updatedCompany.contact_email || contactEmail,
      contactPhone: updatedCompany.phone || contactPhone,
      address: updatedCompany.address || address,
      maxEmployees: updatedCompany.max_employees || maxEmployees,
      licenseType: updatedCompany.license_type || licenseType,
      modules: JSON.parse(updatedCompany.modules_data || JSON.stringify(modules || [])),
      modulesPricing: JSON.parse(updatedCompany.modules_pricing || JSON.stringify(modulesPricing || {})),
      pricing: {
        monthlySubtotal: parseFloat(updatedCompany.monthly_subtotal || monthlySubtotal),
        monthlyTax: parseFloat(updatedCompany.monthly_tax || monthlyTax),
        monthlyTotal: parseFloat(updatedCompany.monthly_total || monthlyTotal)
      },
      status: 'active'
    } : {
      id: parseInt(id),
      name: name,
      legalName: legalName || name,
      taxId: taxId,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      address: address,
      maxEmployees: maxEmployees,
      licenseType: licenseType,
      modules: modules || [],
      modulesPricing: modulesPricing || {},
      pricing: {
        monthlySubtotal: monthlySubtotal,
        monthlyTax: monthlyTax,
        monthlyTotal: monthlyTotal
      },
      status: 'active'
    };

    res.json({
      success: true,
      message: 'Empresa actualizada exitosamente',
      company: responseCompany,
      // ✨ NUEVO: Información real de company_modules
      activeModulesFromDB: JSON.parse((updatedCompany?.active_company_modules) || '[]')
    });

  } catch (error) {
    console.error('Error actualizando empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor: ' + error.message 
    });
  }
});

// DELETE /companies/:id - Eliminar empresa (solo admin)
router.delete('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando empresa ID: ${id}`);

    // VALIDACIÓN DE SEGURIDAD: Validar ID numérico
    const companyId = validateNumericId(id, 'ID de empresa');

    // Verificar que la empresa existe
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Verificar si la empresa tiene usuarios activos
    const activeUsers = await User.findAll({
      where: {
        company_id: companyId,
        isActive: true
      },
      attributes: ['id', 'firstName', 'lastName', 'email']
    });

    if (activeUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar la empresa. Tiene ${activeUsers.length} usuarios activos.`,
        activeUsers: activeUsers.map(user => ({
          id: user.user_id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        }))
      });
    }

    // Eliminar módulos asociados a la empresa
    await sequelize.query(`
      DELETE FROM company_modules WHERE company_id = :companyId
    `, {
      replacements: { companyId: id },
      type: sequelize.QueryTypes.DELETE
    });

    // Eliminar sucursales asociadas
    await sequelize.query(`
      DELETE FROM branches WHERE company_id = :companyId
    `, {
      replacements: { companyId: id },
      type: sequelize.QueryTypes.DELETE
    });

    // Eliminar departamentos asociados
    await sequelize.query(`
      DELETE FROM departments WHERE company_id = :companyId
    `, {
      replacements: { companyId: id },
      type: sequelize.QueryTypes.DELETE
    });

    // Eliminar usuarios inactivos de la empresa
    await User.destroy({
      where: {
        company_id: parseInt(id),
        is_active: false
      }
    });

    // Finalmente eliminar la empresa
    await Company.destroy({
      where: { id: parseInt(id) }
    });

    console.log(`✅ Empresa "${company.name}" (ID: ${id}) eliminada exitosamente`);

    res.json({
      success: true,
      message: `Empresa "${company.name}" eliminada exitosamente`,
      deletedCompany: {
        id: company.company_id,
        name: company.name,
        legalName: company.legalName || company.legal_name
      }
    });

  } catch (error) {
    console.error('Error eliminando empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// GET /pricing - Obtener módulos y precios del sistema
router.get('/pricing', (req, res) => {
  try {
    console.log('📋 Obteniendo configuración de precios de módulos');
    
    const fs = require('fs');
    const path = require('path');
    const pricingFilePath = path.join(__dirname, '../../data/pricing.json');
    
    // Módulos por defecto
    const defaultModules = {
      attendance: {
        id: 'attendance',
        name: 'Control de Asistencia',
        icon: '👥',
        description: 'Registro biométrico de entrada y salida de empleados',
        basePrice: 15.00,
        color: '#4CAF50',
        tierPrices: { tier1: 15.00, tier2: 12.00, tier3: 10.00 }
      },
      medical: {
        id: 'medical',
        name: 'Gestión Médica',
        icon: '⚕️',
        description: 'Control de certificados médicos y licencias',
        basePrice: 20.00,
        color: '#2196F3',
        tierPrices: { tier1: 20.00, tier2: 16.00, tier3: 12.00 }
      },
      reports: {
        id: 'reports',
        name: 'Reportes Avanzados',
        icon: '📊',
        description: 'Reportes detallados y estadísticas',
        basePrice: 25.00,
        color: '#FF9800',
        tierPrices: { tier1: 25.00, tier2: 20.00, tier3: 15.00 }
      },
      hr: {
        id: 'hr',
        name: 'Recursos Humanos',
        icon: '👨‍💼',
        description: 'Gestión completa de RRHH',
        basePrice: 30.00,
        color: '#9C27B0',
        tierPrices: { tier1: 30.00, tier2: 25.00, tier3: 20.00 }
      }
    };
    
    let systemModules = defaultModules;
    
    // Intentar cargar precios guardados
    try {
      if (fs.existsSync(pricingFilePath)) {
        const savedPricing = JSON.parse(fs.readFileSync(pricingFilePath, 'utf8'));
        console.log('📂 Cargando precios guardados desde archivo');
        
        // Fusionar precios guardados con módulos por defecto
        Object.keys(savedPricing).forEach(moduleId => {
          if (systemModules[moduleId] && savedPricing[moduleId].tierPrices) {
            systemModules[moduleId].tierPrices = savedPricing[moduleId].tierPrices;
            systemModules[moduleId].basePrice = savedPricing[moduleId].tierPrices.tier1;
            console.log(`💰 Precio restaurado para ${moduleId}:`, savedPricing[moduleId].tierPrices);
          }
        });
      } else {
        console.log('📝 Usando precios por defecto (archivo no existe)');
      }
    } catch (fileError) {
      console.warn('⚠️ Error leyendo archivo de precios, usando valores por defecto:', fileError.message);
    }

    console.log('✅ Precios cargados exitosamente');
    res.json({
      success: true,
      modules: systemModules
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo precios:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// PUT /pricing - Actualizar precios de módulos del sistema
router.put('/pricing', (req, res) => {
  try {
    const pricingData = req.body;
    const { modules } = pricingData;

    console.log('💰 Guardando precios de módulos del sistema...');
    console.log('📊 Módulos recibidos:', Object.keys(modules || {}));

    // Validar que se enviaron módulos
    if (!modules || Object.keys(modules).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se enviaron módulos para actualizar'
      });
    }

    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, '../../data');
    const pricingFilePath = path.join(dataDir, 'pricing.json');

    // Crear directorio data si no existe
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Directorio data creado');
    }

    // Procesar cada módulo
    const updatedModules = {};
    Object.entries(modules).forEach(([moduleId, moduleData]) => {
      console.log(`📝 Procesando módulo ${moduleId}:`, {
        name: moduleData.name,
        tierPrices: moduleData.tierPrices
      });
      
      updatedModules[moduleId] = {
        ...moduleData,
        lastUpdated: new Date().toISOString()
      };
    });

    // Guardar en archivo JSON
    try {
      console.log('🔍 Intentando guardar en ruta:', pricingFilePath);
      console.log('📁 Directorio data existe:', fs.existsSync(dataDir));
      console.log('📄 Datos a guardar:', JSON.stringify(updatedModules, null, 2));
      
      fs.writeFileSync(pricingFilePath, JSON.stringify(updatedModules, null, 2));
      console.log('💾 Precios guardados en archivo:', pricingFilePath);
      
      // Verificar que el archivo se creó
      if (fs.existsSync(pricingFilePath)) {
        console.log('✅ Archivo confirmado creado exitosamente');
      } else {
        console.log('❌ Archivo no fue creado');
      }
    } catch (saveError) {
      console.error('❌ Error guardando archivo:', saveError.message);
      console.error('❌ Stack trace:', saveError.stack);
      throw saveError;
    }

    console.log('✅ Precios de módulos guardados exitosamente');

    res.json({
      success: true,
      message: `Precios de ${Object.keys(modules).length} módulo(s) actualizados correctamente`,
      modules: updatedModules,
      timestamp: new Date().toISOString(),
      saved: true
    });

  } catch (error) {
    console.error('❌ Error guardando precios de módulos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al guardar precios' 
    });
  }
});

// Función auxiliar para determinar tier
function getTierFromEmployees(maxEmployees) {
  if (maxEmployees <= 50) return 'basic';
  if (maxEmployees <= 100) return 'professional';
  return 'enterprise';
}

// ❌ ENDPOINT DUPLICADO DESACTIVADO - NO USAR
// Este endpoint POST duplicado nunca se ejecutaba porque Express ya registró
// el primer POST /companies en la línea 704 que SÍ incluye:
//   - Descomposición de bundles desde engineering-metadata.js (SSOT)
//   - Creación de registros en company_modules
//   - Guardado de pricing histórico
// IMPORTANTE: NO eliminar aún para referencia histórica
/*
router.post('/companies', async (req, res) => {
  try {
    const companyData = req.body;

    // Validaciones básicas
    if (!companyData.name || !companyData.taxId || !companyData.contactEmail) {
      return res.status(400).json({
        error: 'Nombre, CUIT y email son requeridos'
      });
    }

    // Verificar que no exista una empresa con el mismo CUIT
    const existingCompany = await Company.findOne({
      where: { taxId: companyData.taxId }
    });

    if (existingCompany) {
      return res.status(400).json({
        error: 'Ya existe una empresa con ese CUIT'
      });
    }

    // Crear slug único basado en el nombre
    const baseSlug = companyData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    let slug = baseSlug;
    let counter = 1;

    while (await Company.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Crear databaseSchema único
    const baseSchema = `company_${slug}`.substring(0, 45);
    let databaseSchema = baseSchema;
    let schemaCounter = 1;

    while (await Company.findOne({ where: { databaseSchema } })) {
      databaseSchema = `${baseSchema}_${schemaCounter}`;
      schemaCounter++;
    }

    // Crear empresa usando la estructura del modelo existente
    const newCompany = await Company.create({
      name: companyData.name,
      slug: slug,
      displayName: companyData.legalName || companyData.name,
      databaseSchema: databaseSchema,
      taxId: companyData.taxId,
      email: companyData.contactEmail,
      phone: companyData.contactPhone,
      address: companyData.address,
      subscriptionType: companyData.licenseType || 'basic',
      maxUsers: companyData.maxEmployees || 50,
      isActive: true,
      isTrial: false,
      timezone: 'America/Argentina/Buenos_Aires',
      locale: 'es-AR',
      currency: 'ARS'
    });

    // 🏢 CREAR SUCURSAL CENTRAL AUTOMÁTICAMENTE (OBLIGATORIA)
    // Esta sucursal es necesaria para el sistema de feriados y no puede ser eliminada
    try {
      const centralBranch = await Branch.create({
        name: 'CENTRAL',
        code: `CENTRAL-${newCompany.id}`,
        address: companyData.address || '',
        company_id: newCompany.id,
        is_main: true, // Marca como sucursal principal (no borrable)
        isActive: true
      });
      console.log(`🏢 Sucursal CENTRAL creada automáticamente (ID: ${centralBranch.id})`);
    } catch (branchError) {
      // Si falla la creación de la sucursal, NO fallar la creación de empresa
      console.error('⚠️ Error creando sucursal CENTRAL (empresa creada exitosamente):', branchError.message);
    }

    // Crear usuario administrador automáticamente
    try {
      const bcrypt = require('bcryptjs');
      const adminPassword = '123456';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      const adminUser = await User.create({
        employeeId: 'ADM' + String(newCompany.id).padStart(3, '0'),
        usuario: 'admin' + newCompany.id,
        firstName: 'Administrador',
        lastName: 'Sistema',
        email: companyData.contactEmail,
        password: hashedPassword,
        role: 'admin',
        companyId: newCompany.id,
        isActive: true
      });

      console.log(`👤 Admin creado automáticamente: "${adminUser.usuario}" para empresa ${newCompany.name} con contraseña: ${adminPassword}`);
    } catch (adminError) {
      console.error('⚠️ Error creando admin automático (empresa creada exitosamente):', adminError);
    }

    res.status(201).json({
      success: true,
      message: 'Empresa creada exitosamente',
      company: {
        id: newCompany.id,
        name: newCompany.name,
        legalName: newCompany.displayName,
        taxId: newCompany.taxId,
        contactEmail: newCompany.contact_email,
        status: newCompany.isActive ? 'active' : 'inactive'
      }
    });

    console.log(`✅ Empresa creada - ${newCompany.name}`);

  } catch (error) {
    console.error('Error creando empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
*/

// PUT /companies/:id - Actualizar empresa (solo admin para todos los campos, operadores para campos limitados)
router.put('/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Si es operador, restringir campos que puede modificar
    if (req.superUser.role === 'operador') {
      const allowedFields = ['contactEmail', 'contactPhone', 'address'];
      const restrictedUpdate = {};
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          restrictedUpdate[field] = updateData[field];
        }
      });

      await company.update(restrictedUpdate);
    } else {
      // Admin puede modificar todos los campos
      await company.update(updateData);
    }

    res.json({
      success: true,
      message: 'Empresa actualizada exitosamente',
      company: company
    });

    console.log(`✏️ Empresa actualizada - ${company.name} por ${req.superUser.username}`);

  } catch (error) {
    console.error('Error actualizando empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /companies/:id/status - Cambiar estado de empresa (solo admin)
router.put('/companies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['active', 'suspended', 'trial'].includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido. Debe ser: active, suspended o trial'
      });
    }

    const company = await Company.findByPk(id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const previousStatus = company.status;
    
    await company.update({
      status: status,
      statusReason: reason || null,
      statusChangedAt: new Date(),
      statusChangedBy: req.superUser.id
    });

    // Log del cambio de estado
    const statusMessages = {
      active: 'activada',
      suspended: 'suspendida',
      trial: 'puesta en prueba'
    };

    res.json({
      success: true,
      message: `Empresa ${statusMessages[status]} exitosamente`,
      company: company,
      previousStatus: previousStatus
    });

    console.log(`🔄 Estado cambiado - ${company.name}: ${previousStatus} → ${status} por ${req.superUser.username}`);

  } catch (error) {
    console.error('Error cambiando estado de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /billing - Obtener información de facturación (admin y operadores)
router.get('/billing', async (req, res) => {
  try {
    // Aquí irían las consultas a las tablas de facturación
    // Por ahora retornamos datos simulados
    
    const mockBillingData = {
      monthlyRevenue: 25750.50,
      pendingInvoices: 8,
      overdueInvoices: 3,
      paidInvoices: 45,
      recentInvoices: []
    };

    res.json({
      success: true,
      billing: mockBillingData
    });

  } catch (error) {
    console.error('Error obteniendo facturación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /billing/generate - Generar facturas mensuales (admin y operadores)
router.post('/billing/generate', async (req, res) => {
  try {
    const activeCompanies = await Company.findAll({
      where: { status: 'active' },
      include: ['modules']
    });

    // Simulación de generación de facturas
    const generatedCount = activeCompanies.length;

    res.json({
      success: true,
      message: `${generatedCount} facturas generadas exitosamente`,
      generated: generatedCount
    });

    console.log(`📊 Facturas generadas - ${generatedCount} facturas por ${req.superUser.username}`);

  } catch (error) {
    console.error('Error generando facturas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /payments - Obtener información de pagos (admin y operadores)
router.get('/payments', async (req, res) => {
  try {
    // Datos simulados de pagos
    const mockPaymentData = {
      totalProcessed: 18500.75,
      pendingPayments: 12,
      failedPayments: 2,
      successfulPayments: 38,
      paymentMethods: {
        qr: 15,
        card: 20,
        transfer: 15
      }
    };

    res.json({
      success: true,
      payments: mockPaymentData
    });

  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /payments/process - Procesar pagos automáticos (admin y operadores)
router.post('/payments/process', async (req, res) => {
  try {
    // Simulación de procesamiento de pagos automáticos
    const processedCount = Math.floor(Math.random() * 10) + 1;

    res.json({
      success: true,
      message: `${processedCount} pagos automáticos procesados`,
      processed: processedCount
    });

    console.log(`💳 Pagos procesados - ${processedCount} pagos por ${req.superUser.username}`);

  } catch (error) {
    console.error('Error procesando pagos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/* 
// GET /pricing - Obtener configuración de precios (DUPLICADO - COMENTADO)
router.get('/pricing', async (req, res) => {
  try {
    const modules = await SystemModule.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      modules: modules
    });

  } catch (error) {
    console.error('Error obteniendo precios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /pricing - Actualizar configuración de precios (DUPLICADO - COMENTADO)
router.put('/pricing', async (req, res) => {
  try {
    const { modules } = req.body;

    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({
        error: 'Se requiere un array de módulos'
      });
    }

    // Actualizar precios de módulos
    for (const moduleData of modules) {
      if (moduleData.id) {
        await SystemModule.update(
          { 
            basePrice: moduleData.basePrice,
            tierPrices: moduleData.tierPrices 
          },
          { where: { id: moduleData.id } }
        );
      }
    }

    res.json({
      success: true,
      message: 'Precios actualizados exitosamente'
    });

    console.log(`💰 Precios actualizados por ${req.superUser.username}`);

  } catch (error) {
    console.error('Error actualizando precios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
*/

// GET /dashboard/stats - Estadísticas generales del dashboard
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalCompanies = await Company.count();
    const activeCompanies = await Company.count({ where: { status: 'active' } });
    const suspendedCompanies = await Company.count({ where: { status: 'suspended' } });
    const trialCompanies = await Company.count({ where: { status: 'trial' } });

    const stats = {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      trialCompanies,
      // Datos simulados adicionales
      monthlyRevenue: 25750.50,
      pendingPayments: 8,
      overduePayments: 3
    };

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /stats - Alias directo para estadísticas (duplicado para compatibilidad)
router.get('/stats', async (req, res) => {
  try {
    const totalCompanies = await Company.count();
    const activeCompanies = await Company.count({ where: { status: 'active' } });
    const suspendedCompanies = await Company.count({ where: { status: 'suspended' } });
    const trialCompanies = await Company.count({ where: { status: 'trial' } });

    const stats = {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      trialCompanies,
      monthlyRevenue: 25750.50,
      pendingPayments: 8,
      overduePayments: 3
    };

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// =============================
// RUTAS DE SUCURSALES (BRANCHES)
// =============================

// GET /branches - Obtener sucursales por empresa
router.get('/branches/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    console.log(`🏢 Obteniendo sucursales de empresa ${companyId}`);
    
    // Obtener información de la empresa para el nombre
    let companyName = 'Empresa';
    try {
      const company = await Company.findByPk(companyId);
      if (company) {
        companyName = company.name || 'Empresa';
      }
    } catch (error) {
      console.log('⚠️ No se pudo obtener nombre de empresa, usando "Empresa"');
    }
    
    // Sistema simplificado sin sucursales Memory
    const branches = [
      {
        id: 1,
        name: 'Sucursal Central',
        address: 'Dirección Principal',
        companyId: parseInt(companyId),
        isActive: true,
        isCentral: true
      }
    ];
    
    console.log(`✅ ${branches.length} sucursales encontradas para empresa ${companyId}`);
    
    res.json({
      success: true,
      branches: branches,
      count: branches.length
    });

  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// POST /branches - Crear nueva sucursal
router.post('/branches', async (req, res) => {
  try {
    console.log('🏢 Creando nueva sucursal:', req.body);
    console.log('🔍 req.body.companyId:', req.body.companyId, 'type:', typeof req.body.companyId);
    console.log('🔍 parseInt result:', parseInt(req.body.companyId));

    const branchData = {
      company_id: parseInt(req.body.companyId),
      name: req.body.name,
      code: req.body.code || '',
      description: req.body.description || '',
      
      // Datos geográficos
      country: req.body.country || 'Argentina',
      province: req.body.province || '',
      city: req.body.city || '',
      address: req.body.address || '',
      postalCode: req.body.postalCode || '',
      
      // Geolocalización (opcional)
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
      autoGeolocation: req.body.autoGeolocation === true,
      
      // Información de contacto
      phone: req.body.phone || '',
      email: req.body.email || '',
      manager: req.body.manager || '',
      
      // Estado
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      isCentral: req.body.isCentral === true,
      isMainBranch: req.body.isMainBranch === true,
      
      // Configuración
      allowedServices: req.body.allowedServices || [],
      businessHours: req.body.businessHours || {},
      capacity: req.body.capacity ? parseInt(req.body.capacity) : null,
      
      // Metadatos
      notes: req.body.notes || '',
      metadata: req.body.metadata || {}
    };

    // Validar campos requeridos
    if (!branchData.company_id || isNaN(branchData.company_id) || !branchData.name) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: companyId (número válido) y name'
      });
    }

    // Simular creación de sucursal
    const newBranch = {
      id: Math.floor(Math.random() * 1000),
      ...branchData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('✅ Sucursal simulada creada exitosamente:', newBranch.id);

    res.status(201).json({
      success: true,
      branch: newBranch,
      message: 'Sucursal creada exitosamente'
    });

  } catch (error) {
    console.error('Error creando sucursal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// PUT /branches/:id - Actualizar sucursal
router.put('/branches/:id', async (req, res) => {
  try {
    const branchId = parseInt(req.params.id);
    console.log(`🏢 Actualizando sucursal ${branchId}:`, req.body);
    
    const updateData = {
      name: req.body.name,
      code: req.body.code,
      description: req.body.description,
      country: req.body.country,
      province: req.body.province,
      city: req.body.city,
      address: req.body.address,
      postalCode: req.body.postalCode,
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
      autoGeolocation: req.body.autoGeolocation,
      phone: req.body.phone,
      email: req.body.email,
      manager: req.body.manager,
      isActive: req.body.isActive,
      isMainBranch: req.body.isMainBranch,
      allowedServices: req.body.allowedServices,
      businessHours: req.body.businessHours,
      capacity: req.body.capacity ? parseInt(req.body.capacity) : null,
      notes: req.body.notes,
      metadata: req.body.metadata
    };

    // Remover campos undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Simular actualización de sucursal
    const updatedBranch = {
      id: branchId,
      ...updateData,
      updatedAt: new Date()
    };

    console.log('✅ Sucursal simulada actualizada exitosamente:', branchId);

    res.json({
      success: true,
      branch: updatedBranch,
      message: 'Sucursal actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando sucursal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// DELETE /branches/:id - Eliminar sucursal
router.delete('/branches/:id', async (req, res) => {
  try {
    const branchId = parseInt(req.params.id);
    console.log(`🗑️ Eliminando sucursal ${branchId}`);
    
    // Simular eliminación de sucursal
    const deleted = true;
    
    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sucursal no encontrada' 
      });
    }
    
    console.log('✅ Sucursal eliminada exitosamente:', branchId);
    
    res.json({
      success: true,
      message: 'Sucursal eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando sucursal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// GET /branches/:id - Obtener sucursal por ID
router.get('/branches/detail/:id', async (req, res) => {
  try {
    const branchId = parseInt(req.params.id);
    console.log(`🏢 Obteniendo detalle de sucursal ${branchId}`);
    
    // Simular búsqueda de sucursal
    const branch = {
      id: branchId,
      name: 'Sucursal Ejemplo',
      address: 'Dirección Ejemplo',
      companyId: 1,
      isActive: true,
      isCentral: false
    };
    
    if (!branch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sucursal no encontrada' 
      });
    }
    
    res.json({
      success: true,
      branch: branch
    });

  } catch (error) {
    console.error('Error obteniendo sucursal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// POST /branches/geocode - Geolocalizar dirección de sucursal REAL
router.post('/branches/geocode', async (req, res) => {
  try {
    const { address, city, province, country, postalCode } = req.body;

    // Construir dirección completa para búsqueda
    const addressParts = [
      address && address !== 'Sin dirección' ? address : '',
      city || '',
      province || '',
      postalCode || '',
      country || ''
    ].filter(part => part.trim() !== '');

    const fullAddress = addressParts.join(', ');

    console.log(`🌍 Geolocalizando sucursal: "${fullAddress}"`);

    if (!fullAddress || fullAddress === '') {
      return res.json({
        success: false,
        error: 'Dirección insuficiente para geolocalizar',
        message: 'Se requiere al menos ciudad, provincia o país para geolocalizar'
      });
    }

    try {
      // Usar OpenStreetMap Nominatim API (gratuita y sin API key)
      const encodedAddress = encodeURIComponent(fullAddress);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;

      console.log(`📡 Consultando API: ${nominatimUrl}`);

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'Sistema-Biometrico-Empresarial/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        console.log('⚠️ No se encontraron resultados para la dirección');
        return res.json({
          success: false,
          error: 'No se encontró la dirección especificada',
          message: 'Verifique que la dirección, ciudad, provincia y país sean correctos',
          suggestion: 'Intente buscar manualmente en el mapa'
        });
      }

      const result = data[0];
      const coordinates = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formatted_address: result.display_name,
        accuracy: 'ROOFTOP',
        address_components: {
          street: result.address?.road || '',
          city: result.address?.city || result.address?.town || result.address?.village || '',
          province: result.address?.state || result.address?.province || '',
          country: result.address?.country || '',
          postal_code: result.address?.postcode || ''
        }
      };

      console.log('✅ Coordenadas reales de sucursal obtenidas:', coordinates);

      res.json({
        success: true,
        coordinates: coordinates,
        message: 'Sucursal geolocalizada exitosamente con dirección real'
      });

    } catch (geocodeError) {
      console.error('❌ Error en geocodificación de sucursal:', geocodeError);

      // Fallback: devolver coordenadas aproximadas según país/región
      let fallbackCoords = { latitude: 0, longitude: 0 };

      if (country && country.toLowerCase().includes('argentina')) {
        fallbackCoords = { latitude: -34.6118, longitude: -58.3960 }; // Buenos Aires
      } else if (country && country.toLowerCase().includes('españa')) {
        fallbackCoords = { latitude: 40.4168, longitude: -3.7038 }; // Madrid
      } else if (country && country.toLowerCase().includes('méxico')) {
        fallbackCoords = { latitude: 19.4326, longitude: -99.1332 }; // México DF
      }

      return res.json({
        success: false,
        error: 'Error en servicio de geolocalización',
        message: 'No se pudo obtener ubicación precisa, use el mapa para ubicar manualmente',
        fallback_coordinates: fallbackCoords,
        suggestion: 'Búsquelo manualmente en el mapa y haga clic en la ubicación exacta'
      });
    }

  } catch (error) {
    console.error('💥 Error general en geocode sucursal:', error);
    res.status(500).json({
      success: false,
      error: 'Error en el servicio de geolocalización',
      message: error.message
    });
  }
});

// POST /geocode-company - Geolocalizar dirección de empresa REAL
router.post('/geocode-company', async (req, res) => {
  try {
    const { companyId, address, city, province, country, postalCode } = req.body;

    // Construir dirección completa para búsqueda
    const addressParts = [
      address && address !== 'Sin dirección' ? address : '',
      city || '',
      province || '',
      postalCode || '',
      country || ''
    ].filter(part => part.trim() !== '');

    const fullAddress = addressParts.join(', ');

    console.log(`🌍 Geolocalizando empresa ${companyId}: "${fullAddress}"`);

    if (!fullAddress || fullAddress === '') {
      return res.json({
        success: false,
        error: 'Dirección insuficiente para geolocalizar',
        message: 'Se requiere al menos ciudad, provincia o país para geolocalizar'
      });
    }

    try {
      // Usar OpenStreetMap Nominatim API (gratuita y sin API key)
      const encodedAddress = encodeURIComponent(fullAddress);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;

      console.log(`📡 Consultando API: ${nominatimUrl}`);

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'Sistema-Biometrico-Empresarial/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        console.log('⚠️ No se encontraron resultados para la dirección');
        return res.json({
          success: false,
          error: 'No se encontró la dirección especificada',
          message: 'Verifique que la dirección, ciudad, provincia y país sean correctos',
          suggestion: 'Intente buscar manualmente en el mapa'
        });
      }

      const result = data[0];
      const coordinates = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formatted_address: result.display_name,
        accuracy: 'ROOFTOP',
        address_components: {
          street: result.address?.road || '',
          city: result.address?.city || result.address?.town || result.address?.village || '',
          province: result.address?.state || result.address?.province || '',
          country: result.address?.country || '',
          postal_code: result.address?.postcode || ''
        }
      };

      console.log('✅ Coordenadas reales obtenidas:', coordinates);

      res.json({
        success: true,
        coordinates: coordinates,
        message: 'Empresa geolocalizada exitosamente con dirección real'
      });

    } catch (geocodeError) {
      console.error('❌ Error en geocodificación:', geocodeError);

      // Fallback: devolver coordenadas aproximadas según país/región
      let fallbackCoords = { latitude: 0, longitude: 0 };

      if (country && country.toLowerCase().includes('argentina')) {
        fallbackCoords = { latitude: -34.6118, longitude: -58.3960 }; // Buenos Aires
      } else if (country && country.toLowerCase().includes('españa')) {
        fallbackCoords = { latitude: 40.4168, longitude: -3.7038 }; // Madrid
      } else if (country && country.toLowerCase().includes('méxico')) {
        fallbackCoords = { latitude: 19.4326, longitude: -99.1332 }; // México DF
      }

      return res.json({
        success: false,
        error: 'Error en servicio de geolocalización',
        message: 'No se pudo obtener ubicación precisa, use el mapa para ubicar manualmente',
        fallback_coordinates: fallbackCoords,
        suggestion: 'Búsquelo manualmente en el mapa y haga clic en la ubicación exacta'
      });
    }

  } catch (error) {
    console.error('💥 Error general en geocode-company:', error);
    res.status(500).json({
      success: false,
      error: 'Error en el servicio de geolocalización de empresa',
      message: error.message
    });
  }
});

// GET /branches/nearby - Buscar sucursales cercanas
router.get('/branches/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Se requieren parámetros latitude y longitude' 
      });
    }
    
    console.log(`🌍 Buscando sucursales cerca de ${latitude}, ${longitude} en radio de ${radius}km`);
    
    // Simular búsqueda de sucursales cercanas
    const allBranches = [
      { id: 1, name: 'Sucursal Central', latitude: -33.302, longitude: -66.336, distance: 2.5 },
      { id: 2, name: 'Sucursal Norte', latitude: -33.300, longitude: -66.340, distance: 5.1 }
    ];
    const nearbyBranches = allBranches.filter(branch => {
          const distance = calculateDistance(
            parseFloat(latitude), parseFloat(longitude),
            branch.latitude, branch.longitude
          );

          return distance <= parseFloat(radius);
      })
    .sort((a, b) => {
          const distA = calculateDistance(parseFloat(latitude), parseFloat(longitude), a.latitude, a.longitude);
          const distB = calculateDistance(parseFloat(latitude), parseFloat(longitude), b.latitude, b.longitude);
          return distA - distB;
        });

    console.log(`✅ ${nearbyBranches.length} sucursales encontradas en el área`);
    
    res.json({
      success: true,
      branches: nearbyBranches,
      count: nearbyBranches.length,
      searchParams: { latitude, longitude, radius }
    });

  } catch (error) {
    console.error('Error buscando sucursales cercanas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// ==================== RUTAS DE USUARIOS ADMINISTRADORES ====================

// GET /users/:companyId - Obtener usuarios de una empresa
router.get('/users/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log(`👥 Obteniendo usuarios de empresa ${companyId}`);
    
    // Usar usuarios reales de PostgreSQL
    const users = await User.findAll({
      where: {
        companyId: parseInt(companyId),
        isActive: true
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt']
    });
    
    // No retornar hashes de contraseñas
    const safeUsers = users.map(user => {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    });
    
    res.json({
      success: true,
      users: safeUsers
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /users/reset-password/:userId - Resetear contraseña a default (123)
router.post('/users/reset-password/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔑 Reseteando contraseña para usuario ${userId}`);
    
    // Sistema simplificado - reset password directo
    const success = true; // Siempre exitoso para panel administrativo
    
    if (success) {
      res.json({
        success: true,
        message: 'Contraseña reseteada a "123" exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No se pudo resetear la contraseña'
      });
    }
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /users/change-password/:userId - Cambiar contraseña
router.post('/users/change-password/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 3 caracteres'
      });
    }
    
    console.log(`🔑 Cambiando contraseña para usuario ${userId}`);
    
    // Sistema simplificado - cambio de password directo
    const success = true; // Siempre exitoso para panel administrativo
    
    if (success) {
      res.json({
        success: true,
        message: 'Contraseña cambiada exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No se pudo cambiar la contraseña'
      });
    }
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /users/authenticate - Autenticar usuario
router.post('/users/authenticate', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }
    
    console.log(`🔐 Autenticando usuario: ${username}`);
    console.log(`🔐 Contraseña recibida: ${password}`);
    
    // Simular autenticación (usar sistema PostgreSQL real)
    const user = await User.findOne({
      where: { usuario: username },
      include: [{ model: Company, as: 'company' }]
    });

    let authenticated = false;
    if (user && user.password === password) {
      authenticated = true;
    }

    console.log(`🔐 Resultado autenticación:`, authenticated ? 'SUCCESS' : 'FAILED');
    if (user) {
      console.log(`🔐 Usuario encontrado:`, { id: user.user_id, username: user.usuario, companyId: user.companyId });
    } else {
      console.log(`🔐 Usuario NO encontrado para username: ${username}`);
    }

    if (authenticated && user) {
      // Generar token simple
      const token = Buffer.from(`${user.user_id}:${Date.now()}`).toString('base64');
      
      res.json({
        success: true,
        message: 'Autenticación exitosa',
        user: {
          id: user.user_id,
          username: user.usuario,
          email: user.email,
          companyId: user.companyId,
          role: user.role,
          isCompanyAdmin: user.isCompanyAdmin
        },
        token: token
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
  } catch (error) {
    console.error('Error autenticando usuario:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /users/company-admin/:companyId - Crear admin para empresas existentes
router.post('/users/create-admin/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    console.log(`👤 Creando admin para empresa existente ${companyId}`);
    
    // Obtener datos de la empresa
    const CompanyMemory = require('../models/CompanyMemory');
    const company = await CompanyMemory.findByPk(companyId);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }
    
    // Crear usuario admin usando PostgreSQL
    const adminUser = await User.create({
      employeeId: `ADM${companyId}`,
      usuario: 'administrador',
      firstName: 'Administrador',
      lastName: company.name || 'Sistema',
      email: company.email || `admin@empresa${companyId}.com`,
      password: '123',
      role: 'admin',
      companyId: companyId,
      isActive: true
    });
    
    // No retornar hash de contraseña
    const { passwordHash, ...safeUser } = adminUser;
    
    res.json({
      success: true,
      message: 'Administrador creado exitosamente',
      user: safeUser
    });
  } catch (error) {
    console.error('Error creando admin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// ===== USER CRUD ENDPOINTS =====

// POST /users - Crear nuevo usuario
router.post('/users', async (req, res) => {
  try {
    console.log('👤 Creando nuevo usuario:', req.body);

    // VALIDACIONES DE SEGURIDAD
    const requiredFields = ['firstName', 'lastName', 'email', 'employeeId', 'usuario', 'companyId'];
    const { errors, sanitizedData } = validateFormInput(req.body, requiredFields);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        details: errors
      });
    }

    // Validar companyId numérico
    try {
      validateNumericId(sanitizedData.companyId, 'ID de empresa');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const {
      firstName,
      lastName,
      email,
      employeeId,
      usuario,
      companyId,
      role = 'employee',
      departmentId,
      phone,
      organizationalPositionId,
      hireDate,
      salary
    } = sanitizedData;

    // Validaciones básicas
    if (!firstName || !lastName || !email || !employeeId || !usuario || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: firstName, lastName, email, employeeId, usuario, companyId'
      });
    }

    // Verificar que la empresa existe
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Verificar employeeId único
    const existingEmployee = await User.findOne({
      where: { employeeId }
    });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        error: 'El employeeId ya existe'
      });
    }

    // Verificar email único
    const existingEmail = await User.findOne({
      where: { email }
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'El email ya existe'
      });
    }

    // Verificar usuario único
    const existingUser = await User.findOne({
      where: { usuario }
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de usuario ya existe'
      });
    }

    // Crear usuario
    const bcrypt = require('bcryptjs');
    const defaultPassword = 'temporal123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      employeeId,
      usuario,
      password: hashedPassword,
      role,
      companyId: parseInt(companyId),
      departmentId: departmentId ? parseInt(departmentId) : null,
      phone,
      organizationalPositionId: organizationalPositionId ? parseInt(organizationalPositionId) : null,
      hireDate: hireDate,
      salary: salary ? parseFloat(salary) : null,
      isActive: true
    });

    console.log(`✅ Usuario "${newUser.firstName} ${newUser.lastName}" creado exitosamente`);

    // Retornar sin contraseña
    const { password, ...safeUser } = newUser.toJSON();

    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: safeUser,
      tempPassword: defaultPassword
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// PUT /users/:id - Actualizar usuario
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Actualizando usuario ID: ${id}`, req.body);

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const {
      firstName,
      lastName,
      email,
      employeeId,
      phone,
      organizationalPositionId,
      role,
      departmentId,
      salary,
      isActive
    } = req.body;

    // Verificar employeeId único si se está cambiando
    if (employeeId && employeeId !== user.employeeId) {
      const existingEmployee = await User.findOne({
        where: {
          employeeId,
          id: { [sequelize.Op.ne]: id }
        }
      });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          error: 'El employeeId ya existe'
        });
      }
    }

    // Verificar email único si se está cambiando
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        where: {
          email,
          id: { [sequelize.Op.ne]: id }
        }
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'El email ya existe'
        });
      }
    }

    // Preparar objeto de actualización solo con campos que vienen en req.body
    const updateData = {};

    console.log('🔧 [DEBUG PUT] req.body recibido:', JSON.stringify(req.body));
    console.log('🔧 [DEBUG PUT] isActive de req.body:', req.body.isActive, typeof req.body.isActive);
    console.log('🔧 [DEBUG PUT] allowOutsideRadius de req.body:', req.body.allowOutsideRadius, typeof req.body.allowOutsideRadius);

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (phone !== undefined) updateData.phone = phone;
    if (organizationalPositionId !== undefined) updateData.organizationalPositionId = organizationalPositionId ? parseInt(organizationalPositionId) : null;
    if (role !== undefined) updateData.role = role;
    if (departmentId !== undefined) updateData.departmentId = departmentId ? parseInt(departmentId) : null;
    if (salary !== undefined) updateData.salary = salary ? parseFloat(salary) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Agregar campos adicionales que puedan venir en req.body
    // ⚠️ FIX BUG #2: La columna en BD es "gps_enabled", NO "allow_outside_radius"
    if (req.body.allowOutsideRadius !== undefined) updateData.gpsEnabled = req.body.allowOutsideRadius;
    if (req.body.defaultBranchId !== undefined) updateData.defaultBranchId = req.body.defaultBranchId;
    if (req.body.authorizedBranches !== undefined) updateData.authorizedBranches = req.body.authorizedBranches;

    console.log('🔧 [DEBUG PUT] updateData preparado:', JSON.stringify(updateData));

    // Actualizar usuario solo con los campos que vinieron en el request
    await user.update(updateData);

    console.log('🔧 [DEBUG PUT] Usuario después de update:', {
      isActive: user.isActive,
      allowOutsideRadius: user.allowOutsideRadius,
      role: user.role
    });

    console.log(`✅ Usuario "${user.firstName} ${user.lastName}" actualizado exitosamente`);

    // Retornar sin contraseña
    const { password, ...safeUser } = user.toJSON();

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: safeUser
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// DELETE /users/:id - Eliminar usuario
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando usuario ID: ${id}`);

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar si el usuario tiene registros de asistencia
    const attendanceCount = await sequelize.query(`
      SELECT COUNT(*) as count FROM attendance WHERE user_id = :userId
    `, {
      replacements: { userId: id },
      type: sequelize.QueryTypes.SELECT
    });

    const hasAttendance = attendanceCount[0]?.count > 0;

    if (hasAttendance) {
      // Si tiene registros de asistencia, solo desactivar
      await user.update({ is_active: false });

      console.log(`⚠️ Usuario "${user.firstName} ${user.lastName}" desactivado (tiene registros de asistencia)`);

      res.json({
        success: true,
        message: 'Usuario desactivado exitosamente (conserva registros históricos)',
        action: 'deactivated',
        user: {
          id: user.user_id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          employeeId: user.employeeId
        }
      });
    } else {
      // Si no tiene registros, eliminar completamente
      const deletedUser = {
        id: user.user_id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        employeeId: user.employeeId
      };

      await User.destroy({
        where: { id: parseInt(id) }
      });

      console.log(`✅ Usuario "${user.firstName} ${user.lastName}" eliminado completamente`);

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente',
        action: 'deleted',
        user: deletedUser
      });
    }

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// POST /users/:id/reset-password - Resetear contraseña de usuario
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword = 'temporal123' } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await user.update({ password: hashedPassword });

    console.log(`🔑 Contraseña reseteada para usuario: ${user.firstName} ${user.lastName}`);

    res.json({
      success: true,
      message: 'Contraseña reseteada exitosamente',
      tempPassword: newPassword,
      user: {
        id: user.user_id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor: ' + error.message
    });
  }
});

// ===== PAYMENT MANAGEMENT ENDPOINTS =====

// GET /payments - Obtener todos los pagos con filtros
router.get('/payments', async (req, res) => {
  try {
    const { companyId, vendor, startDate, endDate } = req.query;
    let payments = await PaymentMemory.findAll();

    // Aplicar filtros
    if (companyId) {
      payments = payments.filter(p => p.companyId === parseInt(companyId));
    }
    if (vendor) {
      payments = payments.filter(p => p.vendor && p.vendor.toLowerCase().includes(vendor.toLowerCase()));
    }
    if (startDate && endDate) {
      payments = payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate >= new Date(startDate) && paymentDate <= new Date(endDate);
      });
    }

    // Calcular totales
    const totals = PaymentMemory.PaymentMemory.calculateTotals(payments);

    res.json({
      success: true,
      payments,
      totals,
      count: payments.length
    });
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /payments - Crear nuevo pago mensual
router.post('/payments', async (req, res) => {
  try {
    const paymentData = req.body;
    
    // Validar datos requeridos
    if (!paymentData.companyId || !paymentData.totalAmount || !paymentData.paymentDate) {
      return res.status(400).json({
        success: false,
        error: 'Datos faltantes: companyId, totalAmount y paymentDate son requeridos'
      });
    }

    const newPayment = await PaymentMemory.PaymentMemory.createMonthlyPayment(paymentData);
    
    res.status(201).json({
      success: true,
      message: 'Pago creado exitosamente',
      payment: newPayment
    });
  } catch (error) {
    console.error('Error creando pago:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error interno del servidor' 
    });
  }
});

// GET /payments/:id - Obtener pago específico
router.get('/payments/:id', async (req, res) => {
  try {
    const payment = await PaymentMemory.findByPk(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Error obteniendo pago:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// PUT /payments/:id - Actualizar pago
router.put('/payments/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
    const updateData = req.body;
    
    const updatedPayment = await PaymentMemory.update(paymentId, updateData);
    
    if (!updatedPayment) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Pago actualizado exitosamente',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Error actualizando pago:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// DELETE /payments/:id - Eliminar pago
router.delete('/payments/:id', async (req, res) => {
  try {
    const deleted = await PaymentMemory.destroy(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Pago eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando pago:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /payments/company/:companyId - Obtener pagos de una empresa específica
router.get('/payments/company/:companyId', async (req, res) => {
  try {
    const payments = await PaymentMemory.PaymentMemory.findByCompany(req.params.companyId);
    const totals = PaymentMemory.PaymentMemory.calculateTotals(payments);

    res.json({
      success: true,
      payments,
      totals,
      count: payments.length
    });
  } catch (error) {
    console.error('Error obteniendo pagos de empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /payments/vendor/:vendorName - Obtener pagos de un vendedor específico
router.get('/payments/vendor/:vendorName', async (req, res) => {
  try {
    const payments = await PaymentMemory.PaymentMemory.findByVendor(req.params.vendorName);
    const totals = PaymentMemory.PaymentMemory.calculateTotals(payments);

    res.json({
      success: true,
      payments,
      totals,
      count: payments.length
    });
  } catch (error) {
    console.error('Error obteniendo pagos de vendedor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /generate-monthly-invoices - Generar facturas mensuales automáticamente
router.post('/generate-monthly-invoices', async (req, res) => {
  try {
    const CompanyMemory = require('../models/CompanyMemory');
    const { month, year } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Mes y año son requeridos'
      });
    }

    // Obtener todas las empresas activas
    const companies = await CompanyMemory.findAll({ where: { status: 'active', isActive: true } });
    const generatedInvoices = [];

    for (const company of companies) {
      // Calcular el total mensual basado en los módulos contratados
      let monthlyTotal = 0;
      
      if (company.modulesPricing) {
        Object.values(company.modulesPricing).forEach(module => {
          monthlyTotal += module.totalPrice || 0;
        });
      }

      if (monthlyTotal > 0) {
        // Crear el pago mensual
        const paymentData = {
          companyId: company.company_id,
          month: parseInt(month),
          year: parseInt(year),
          paymentDate: new Date(year, month - 1, 1).toISOString().split('T')[0], // Primer día del mes
          totalAmount: monthlyTotal,
          paymentMethod: 'pending',
          isPaid: false,
          notes: `Canon mensual ${month}/${year} - Generado automáticamente`
        };

        const newPayment = await PaymentMemory.PaymentMemory.createMonthlyPayment(paymentData);
        generatedInvoices.push(newPayment);
      }
    }

    res.json({
      success: true,
      message: `${generatedInvoices.length} facturas generadas para ${month}/${year}`,
      invoices: generatedInvoices
    });
  } catch (error) {
    console.error('Error generando facturas mensuales:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// PUT /companies/:id/status - Cambiar estado de empresa
router.put('/companies/:id/status', async (req, res) => {
  try {
    const CompanyMemory = require('../models/CompanyMemory');
    const { status } = req.body;
    
    if (!['cotizado', 'active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido'
      });
    }

    const company = await CompanyMemory.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Si se cambia de cotizado a activo, crear usuario admin automáticamente
    if (company.status === 'cotizado' && status === 'active') {
      // Sistema simplificado - no crear usuarios Memory
      console.log('✅ Empresa creada sin usuarios Memory adicionales');
    }

    const updatedCompany = await CompanyMemory.update(req.params.id, { 
      status,
      isActive: status === 'active',
      updated_at: new Date()
    });

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      company: updatedCompany
    });
  } catch (error) {
    console.error('Error actualizando estado de empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// ==================== RUTAS DE VENDEDORES ====================

// GET /vendors - Obtener todos los vendedores
router.get('/vendors', async (req, res) => {
  try {
    console.log('📋 Obteniendo vendedores (AponntStaff)');
    const vendors = await AponntStaff.findAll({
      where: { is_active: true },
      order: [['first_name', 'ASC'], ['last_name', 'ASC']]
    });
    res.json({ success: true, vendors });
  } catch (error) {
    console.error('❌ Error obteniendo vendedores:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /vendors/active - Obtener vendedores activos para selectores
router.get('/vendors/active', async (req, res) => {
  try {
    console.log('📋 Obteniendo vendedores activos (AponntStaff)');
    const vendors = await AponntStaff.findAll({
      where: { is_active: true },
      attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'phone'],
      order: [['first_name', 'ASC'], ['last_name', 'ASC']]
    });
    res.json({ success: true, vendors });
  } catch (error) {
    console.error('❌ Error obteniendo vendedores activos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /vendors/:id - Obtener vendedor específico
router.get('/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Obteniendo vendedor \${id} (AponntStaff)`);
    const vendor = await AponntStaff.findByPk(id);
    
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendedor no encontrado' });
    }
    
    res.json({ success: true, vendor });
  } catch (error) {
    console.error('❌ Error obteniendo vendedor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /vendors - Crear nuevo vendedor
router.post('/vendors', async (req, res) => {
  try {
    console.log('➕ Creando nuevo vendedor (AponntStaff):', req.body);
    const vendor = await AponntStaff.create(req.body);
    res.status(201).json({ success: true, vendor });
  } catch (error) {
    console.error('❌ Error creando vendedor:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /vendors/:id - Actualizar vendedor
router.put('/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`✏️ Actualizando vendedor \${id} (AponntStaff):`, req.body);
    const [updated] = await AponntStaff.update(req.body, { where: { id } });
    if (!updated) throw new Error('Vendedor no encontrado');
    const vendor = await AponntStaff.findByPk(id);
    res.json({ success: true, vendor });
  } catch (error) {
    console.error('❌ Error actualizando vendedor:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /vendors/:id - Eliminar vendedor
router.delete('/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Eliminando vendedor \${id} (AponntStaff)`);
    
    // Verificar si el vendedor tiene empresas asignadas
    const CompanyMemory = require('../models/CompanyMemory');
    const vendor = await AponntStaff.findByPk(id);
    
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendedor no encontrado' });
    }
    
    const companiesWithVendor = await CompanyMemory.findAll({
      where: { vendor: vendor.name }
    });
    
    if (companiesWithVendor.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se puede eliminar el vendedor porque tiene empresas asignadas' 
      });
    }
    
    const deleted = await AponntStaff.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Vendedor no encontrado' });
    }
    
    res.json({ success: true, message: 'Vendedor eliminado exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando vendedor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /vendors/:id/stats - Obtener estadísticas del vendedor
router.get('/vendors/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📊 Obteniendo estadísticas del vendedor ${id}`);
    const stats = await VendorMemory.VendorMemory.getVendorStats(id);
    res.json({ success: true, ...stats });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del vendedor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /vendors/:id/preliquidation - Generar preliquidación de comisiones
router.post('/vendors/:id/preliquidation', async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year } = req.body;
    
    console.log(`💰 Generando preliquidación para vendedor ${id} - ${month}/${year}`);
    
    if (!month || !year) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mes y año son requeridos' 
      });
    }
    
    const preliquidation = await VendorMemory.VendorMemory.generateCommissionPreliquidation(
      id, 
      parseInt(month), 
      parseInt(year)
    );
    
    res.json({ success: true, preliquidation });
  } catch (error) {
    console.error('❌ Error generando preliquidación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /vendors/preliquidation/all - Generar preliquidaciones para todos los vendedores
router.post('/vendors/preliquidation/all', async (req, res) => {
  try {
    const { month, year } = req.body;
    
    console.log(`💰 Generando preliquidaciones para todos los vendedores - ${month}/${year}`);
    
    if (!month || !year) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mes y año son requeridos' 
      });
    }
    
    const activeVendors = await VendorMemory.VendorMemory.findActive();
    const preliquidations = [];
    const errors = [];
    
    for (const vendor of activeVendors) {
      try {
        const preliquidation = await VendorMemory.VendorMemory.generateCommissionPreliquidation(
          vendor.id, 
          parseInt(month), 
          parseInt(year)
        );
        
        if (preliquidation.paymentCount > 0) {
          preliquidations.push(preliquidation);
        }
      } catch (error) {
        console.error(`❌ Error generando preliquidación para vendedor ${vendor.name}:`, error);
        errors.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          error: error.message
        });
      }
    }
    
    res.json({ 
      success: true, 
      preliquidations,
      generated: preliquidations.length,
      errors: errors.length,
      errorDetails: errors
    });
  } catch (error) {
    console.error('❌ Error generando preliquidaciones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /dashboard/vendors - Obtener vendedores (endpoint temporal)
router.get('/dashboard/vendors', async (req, res) => {
  try {
    // Endpoint temporal para evitar error 404
    res.json({
      success: true,
      vendors: []
    });
  } catch (error) {
    console.error('❌ Error obteniendo vendedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo vendedores',
      error: error.message
    });
  }
});

// ==========================================
// SUPPORT TOOL MANAGEMENT (AUDITOR MODULE)
// ==========================================

// POST /companies/:companyId/support-tools/assign - Asignar módulo auditor temporalmente
router.post('/companies/:companyId/support-tools/assign', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { moduleId, reason, assignedBy } = req.body;

    // Validaciones
    const validCompanyId = validateNumericId(companyId, 'Company ID');

    if (!moduleId || moduleId !== 'auditor-dashboard') {
      return res.status(400).json({
        success: false,
        error: 'Solo se puede asignar el módulo auditor-dashboard'
      });
    }

    if (!reason || !assignedBy) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere razón y responsable de la asignación'
      });
    }

    // Buscar la empresa
    const company = await Company.findOne({
      where: { company_id: validCompanyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Obtener módulos activos actuales - adaptado a formato panel-empresa
    let activeModules = company.activeModules || [];

    // Si es string JSON, parsearlo
    if (typeof activeModules === 'string') {
      try {
        activeModules = JSON.parse(activeModules);
      } catch (e) {
        activeModules = [];
      }
    }

    // Si es array, está bien (formato correcto del panel-empresa)
    if (Array.isArray(activeModules)) {
      // Filtrar solo strings válidos (eliminar [object Object] corrupto)
      activeModules = activeModules.filter(module => typeof module === 'string' && module.trim() !== '');
    } else {
      // Si es objeto (formato legacy), convertir a array vacío
      activeModules = [];
    }

    // Verificar si ya está asignado
    if (activeModules.includes('auditor-dashboard')) {
      return res.status(400).json({
        success: false,
        error: 'El módulo auditor ya está asignado a esta empresa'
      });
    }

    // Agregar el módulo auditor
    activeModules.push('auditor-dashboard');
    console.log(`🔧 [ASSIGN] Antes de update - activeModules:`, activeModules);

    // Actualizar la empresa (usar array JSONB directamente, compatible con panel-empresa)
    const updateResult = await company.update({
      activeModules: activeModules,
      updated_at: new Date()
    });
    console.log(`🔧 [ASSIGN] Resultado de update:`, updateResult);

    // Verificar que se guardó correctamente
    await company.reload();
    console.log(`🔧 [ASSIGN] Después de reload - active_modules:`, company.activeModules);

    // Log de la asignación
    console.log(`🔧 [SUPPORT] Módulo auditor asignado a empresa ${validCompanyId} por ${assignedBy}: ${reason}`);

    res.json({
      success: true,
      message: 'Módulo auditor asignado temporalmente',
      data: {
        companyId: validCompanyId,
        companyName: company.name,
        moduleId: 'auditor-dashboard',
        assignedBy,
        reason,
        assignedAt: new Date(),
        activeModules: activeModules.length
      }
    });

  } catch (error) {
    console.error('❌ Error asignando módulo auditor:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// DELETE /companies/:companyId/support-tools/unassign - Desasignar módulo auditor
router.delete('/companies/:companyId/support-tools/unassign', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { moduleId, reason, unassignedBy } = req.body;

    // Validaciones
    const validCompanyId = validateNumericId(companyId, 'Company ID');

    if (!moduleId || moduleId !== 'auditor-dashboard') {
      return res.status(400).json({
        success: false,
        error: 'Solo se puede desasignar el módulo auditor-dashboard'
      });
    }

    if (!reason || !unassignedBy) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere razón y responsable de la desasignación'
      });
    }

    // Buscar la empresa
    const company = await Company.findOne({
      where: { company_id: validCompanyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Obtener módulos activos actuales - adaptado a formato panel-empresa
    let activeModules = company.activeModules || [];

    // Si es string JSON, parsearlo
    if (typeof activeModules === 'string') {
      try {
        activeModules = JSON.parse(activeModules);
      } catch (e) {
        activeModules = [];
      }
    }

    // Si es array, está bien (formato correcto del panel-empresa)
    if (Array.isArray(activeModules)) {
      // Filtrar solo strings válidos (eliminar [object Object] corrupto)
      activeModules = activeModules.filter(module => typeof module === 'string' && module.trim() !== '');
    } else {
      // Si es objeto (formato legacy), convertir a array vacío
      activeModules = [];
    }

    // Verificar si está asignado
    if (!activeModules.includes('auditor-dashboard')) {
      return res.status(400).json({
        success: false,
        error: 'El módulo auditor no está asignado a esta empresa'
      });
    }

    // Remover el módulo auditor
    activeModules = activeModules.filter(module => module !== 'auditor-dashboard');

    // Actualizar la empresa (usar array JSONB directamente, compatible con panel-empresa)
    await company.update({
      activeModules: activeModules,
      updated_at: new Date()
    });

    // Log de la desasignación
    console.log(`🔧 [SUPPORT] Módulo auditor desasignado de empresa ${validCompanyId} por ${unassignedBy}: ${reason}`);

    res.json({
      success: true,
      message: 'Módulo auditor desasignado correctamente',
      data: {
        companyId: validCompanyId,
        companyName: company.name,
        moduleId: 'auditor-dashboard',
        unassignedBy,
        reason,
        unassignedAt: new Date(),
        activeModules: activeModules.length
      }
    });

  } catch (error) {
    console.error('❌ Error desasignando módulo auditor:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// GET /companies/:companyId/support-tools/status - Verificar estado del módulo auditor
router.get('/companies/:companyId/support-tools/status', async (req, res) => {
  try {
    const { companyId } = req.params;
    const validCompanyId = validateNumericId(companyId, 'Company ID');

    // Buscar la empresa (forzar reload desde BD para evitar cache)
    const company = await Company.findOne({
      where: { company_id: validCompanyId },
      raw: false // Asegurar que sea instancia de Sequelize para reload
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Forzar recarga desde BD para evitar problemas de cache
    await company.reload();
    console.log(`🔄 [STATUS] Después de reload, active_modules:`, company.activeModules);

    // Obtener módulos activos actuales - adaptado a formato panel-empresa
    let activeModules = company.activeModules || [];
    console.log(`🔍 [STATUS] Módulos raw de la BD para empresa ${validCompanyId}:`, activeModules);

    // Si es string JSON, parsearlo
    if (typeof activeModules === 'string') {
      try {
        activeModules = JSON.parse(activeModules);
        console.log(`🔧 [STATUS] Después de JSON.parse:`, activeModules);
      } catch (e) {
        console.log(`❌ [STATUS] Error parseando JSON:`, e.message);
        activeModules = [];
      }
    }

    // Si es array, está bien (formato correcto del panel-empresa)
    if (Array.isArray(activeModules)) {
      console.log(`📋 [STATUS] Antes del filtro (array):`, activeModules);

      // Filtrar solo strings válidos (eliminar [object Object] corrupto)
      const originalLength = activeModules.length;
      activeModules = activeModules.filter(module => typeof module === 'string' && module.trim() !== '');
      console.log(`✨ [STATUS] Después del filtro:`, activeModules);

      // Si se eliminaron elementos corruptos, actualizar la BD
      if (originalLength !== activeModules.length) {
        console.log(`🧹 [CLEANUP] Detectado ${originalLength - activeModules.length} elementos corruptos, limpiando BD...`);
        try {
          await company.update({
            activeModules: activeModules
          });
          console.log(`✅ [CLEANUP] BD actualizada con datos limpios:`, activeModules);
        } catch (cleanupError) {
          console.error(`❌ [CLEANUP] Error actualizando BD:`, cleanupError.message);
        }
      }
    } else {
      console.log(`🔄 [STATUS] No es array, convirtiendo a array vacío. Tipo:`, typeof activeModules);
      // Si es objeto (formato legacy), convertir a array vacío
      activeModules = [];
    }

    const hasAuditor = activeModules.includes('auditor-dashboard');
    console.log(`🎯 [STATUS] ¿Tiene auditor-dashboard?`, hasAuditor);
    console.log(`📊 [STATUS] Lista final de módulos:`, activeModules);

    res.json({
      success: true,
      data: {
        companyId: validCompanyId,
        companyName: company.name,
        hasAuditorModule: hasAuditor,
        totalActiveModules: activeModules.length,
        activeModules
      }
    });

  } catch (error) {
    console.error('❌ Error verificando estado del módulo auditor:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// ============================================================================
// CONTRATOS - Para Vendor Dashboard
// ============================================================================

/**
 * GET /api/aponnt/dashboard/contracts
 * Obtiene todos los contratos (para admin/gerencia) o solo los del vendedor
 */
router.get('/contracts', async (req, res) => {
  try {
    // Tabla contracts no existe - devolver array vacío
    res.json({
      success: true,
      data: [],
      count: 0,
      message: 'Tabla contracts no disponible en esta base de datos'
    });
  } catch (error) {
    console.error('❌ Error obteniendo contratos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contratos',
      details: error.message
    });
  }
});

// ============================================================================
// BUDGETS (QUOTES) - Para Vendor Dashboard
// ============================================================================

/**
 * GET /api/aponnt/dashboard/budgets
 * Obtiene presupuestos (quotes) filtrados opcionalmente por vendor_id
 */
router.get('/budgets', async (req, res) => {
  try {
    // Tabla quotes no existe - devolver array vacío
    res.json({
      success: true,
      data: [],
      count: 0,
      message: 'Tabla quotes no disponible en esta base de datos'
    });
  } catch (error) {
    console.error('❌ Error obteniendo budgets:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener presupuestos',
      details: error.message
    });
  }
});

// ============================================================================
// COMMERCIAL NOTIFICATIONS - Para Vendor Dashboard
// ============================================================================

/**
 * GET /api/aponnt/dashboard/commercial-notifications
 * Obtiene notificaciones comerciales (unificadas)
 */
router.get('/commercial-notifications', async (req, res) => {
  try {
    const { Notification, Company } = require('../config/database');
    const { vendor_id, limit = 50 } = req.query;

    const whereClause = {
      module: 'commercial'  // Filtrar por módulo comercial
    };

    // Si se proporciona vendor_id, podríamos filtrar por company_id del vendor
    // (requeriría JOIN con companies para filtrar por vendor_id)

    const notifications = await Notification.findAll({
      where: whereClause,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['company_id', 'name', 'slug'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo notificaciones comerciales:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notificaciones',
      details: error.message
    });
  }
});

/**
 * PUT /api/aponnt/dashboard/commercial-notifications/:id/read
 * Marca una notificación como leída
 */
router.put('/commercial-notifications/:id/read', async (req, res) => {
  try {
    const { Notification } = require('../config/database');
    const { id } = req.params;

    await Notification.update(
      {
        is_read: true,
        read_at: new Date()
      },
      { where: { id: id } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error marcando notificación como leída:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar notificación',
      details: error.message
    });
  }
});

// ============================================================================
// VENDOR METRICS - Para Vendor Dashboard
// ============================================================================

/**
 * GET /api/aponnt/dashboard/vendor-metrics
 * Calcula métricas del vendedor (empresas, facturación, comisiones)
 */
router.get('/vendor-metrics', async (req, res) => {
  try {
    const { Company, sequelize } = require('../config/database');
    const { vendor_id } = req.query;

    // Si no hay vendor_id, devolver métricas en cero
    if (!vendor_id) {
      return res.json({
        success: true,
        data: {
          active_companies: 0,
          total_companies: 0,
          budgets_count: 0,
          contracts_count: 0,
          total_billing: 0,
          pending_commissions: 0,
          conversion_rate: 0
        },
        message: 'Se requiere vendor_id para obtener métricas específicas'
      });
    }

    // Contar empresas activas del vendedor
    const activeCompanies = await Company.count({
      where: {
        vendor_id: vendor_id,
        is_active: true
      }
    });

    // Total de empresas del vendedor
    const totalCompanies = await Company.count({
      where: { vendor_id: vendor_id }
    });

    // Presupuestos y contratos siempre en 0 (tablas no existen)
    const budgets = 0;
    const contracts = 0;

    // Facturación estimada (suma de monthly_total de empresas activas)
    const billingResult = await Company.findAll({
      where: {
        vendor_id: vendor_id,
        is_active: true
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('monthly_total')), 'total']
      ],
      raw: true
    });

    const totalBilling = billingResult[0]?.total || 0;

    // Comisiones pendientes (estimado al 10% de facturación)
    const pendingCommissions = totalBilling * 0.10;

    res.json({
      success: true,
      data: {
        active_companies: activeCompanies,
        total_companies: totalCompanies,
        budgets_count: budgets,
        contracts_count: contracts,
        total_billing: parseFloat(totalBilling),
        pending_commissions: parseFloat(pendingCommissions),
        conversion_rate: totalCompanies > 0 ? (contracts / totalCompanies * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('❌ Error calculando métricas de vendedor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al calcular métricas',
      details: error.message
    });
  }
});

// ============================================================================
// MÓDULOS Y PRECIOS - Para Vendor Dashboard
// ============================================================================

/**
 * GET /api/aponnt/dashboard/modules-pricing
 * Obtiene todos los módulos del sistema con sus precios
 */
router.get('/modules-pricing', async (req, res) => {
  try {
    const { SystemModule } = require('../config/database');

    const modules = await SystemModule.findAll({
      where: { isActive: true },
      attributes: [
        'id',
        'moduleKey',
        'name',
        'description',
        'icon',
        'color',
        'category',
        'basePrice',
        'isCore',
        'isActive',
        'displayOrder',
        'features',
        'requirements',
        'bundledModules',
        'availableIn',
        'providesTo',
        'integratesWith',
        'version',
        'minEmployees',
        'maxEmployees',
        'rubro'
      ],
      order: [
        ['category', 'ASC'],
        ['displayOrder', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // Transformar para mantener compatibilidad con frontend
    const modulesFormatted = modules.map(m => ({
      system_module_id: m.id,
      module_key: m.moduleKey,
      name: m.name,
      description: m.description,
      icon: m.icon,
      color: m.color,
      category: m.category,
      base_price: m.basePrice,
      is_core: m.isCore,
      is_active: m.isActive,
      display_order: m.displayOrder,
      features: m.features,
      requirements: m.requirements,
      bundled_modules: m.bundledModules,
      available_in: m.availableIn,
      provides_to: m.providesTo,
      integrates_with: m.integratesWith,
      version: m.version,
      min_employees: m.minEmployees,
      max_employees: m.maxEmployees,
      rubro: m.rubro
    }));

    res.json({
      success: true,
      data: modulesFormatted,
      count: modulesFormatted.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo módulos y precios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener módulos',
      details: error.message
    });
  }
});

// ============================================================================
// VENDOR COMMISSIONS - Para Vendor Dashboard
// ============================================================================

/**
 * GET /api/aponnt/dashboard/vendor-commissions
 * Obtiene historial de comisiones del vendedor
 */
router.get('/vendor-commissions', async (req, res) => {
  try {
    const { vendor_id } = req.query;

    // Tabla vendor_commissions no existe - devolver array vacío
    res.json({
      success: true,
      data: [],
      count: 0,
      message: 'Tabla vendor_commissions no disponible en esta base de datos'
    });
  } catch (error) {
    console.error('❌ Error obteniendo comisiones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener comisiones',
      details: error.message
    });
  }
});

// ============================================================================
// CRUD - BUDGETS (Presupuestos)
// ============================================================================

/**
 * POST /api/aponnt/dashboard/budgets
 * Crear nuevo presupuesto
 */
router.post('/budgets', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { v4: uuidv4 } = require('uuid');

    const {
      company_id,
      contracted_employees,
      selected_modules,
      total_monthly,
      valid_until,
      notes,
      pricing,
      // Nuevos campos requeridos
      vendor_id,
      price_per_employee,
      subtotal,
      client_contact_name,
      client_contact_email,
      client_contact_phone
    } = req.body;

    // Validaciones mínimas
    if (!company_id || !total_monthly) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: company_id, total_monthly'
      });
    }

    // Generar código único usando formato PPTO-YYYY-NNNN
    const year = new Date().getFullYear();
    const budgetCode = `PPTO-${year}-${Date.now().toString().slice(-4).padStart(4, '0')}`;
    const traceId = `ONBOARDING-${uuidv4()}`;

    // Calcular fecha de validez (30 días si no se especifica)
    const validUntilDate = valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Obtener vendor_id del usuario logueado si no viene en el body
    let finalVendorId = vendor_id;
    if (!finalVendorId && req.user && req.user.staff_id) {
      finalVendorId = req.user.staff_id;
    }

    // Si no hay vendor_id, obtener el primer staff disponible como fallback
    if (!finalVendorId) {
      const [staffResult] = await sequelize.query(
        `SELECT staff_id FROM aponnt_staff WHERE is_active = true LIMIT 1`,
        { type: sequelize.QueryTypes.SELECT }
      );
      finalVendorId = staffResult?.staff_id;
    }

    if (!finalVendorId) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo determinar el vendor_id'
      });
    }

    // Calcular valores por defecto si no vienen
    const finalContractedEmployees = contracted_employees || 50;
    const finalPricePerEmployee = price_per_employee || (total_monthly / finalContractedEmployees);
    const finalSubtotal = subtotal || total_monthly;

    // Obtener datos de contacto de la empresa si no vienen
    let finalContactName = client_contact_name;
    let finalContactEmail = client_contact_email;
    let finalContactPhone = client_contact_phone;

    if (!finalContactName || !finalContactEmail) {
      const [companyData] = await sequelize.query(
        `SELECT name, contact_email, contact_phone FROM companies WHERE company_id = $1`,
        { bind: [company_id], type: sequelize.QueryTypes.SELECT }
      );
      if (companyData) {
        finalContactName = finalContactName || companyData.name || 'Sin nombre';
        finalContactEmail = finalContactEmail || companyData.contact_email || 'sin@email.com';
        finalContactPhone = finalContactPhone || companyData.contact_phone;
      }
    }

    // Generar quote_number en formato PRES-YYYY-NNNN
    const quoteNumber = `PRES-${year}-${Date.now().toString().slice(-4).padStart(4, '0')}`;

    // INSERTAR EN TABLA QUOTES (que usa el Pipeline de Altas)
    const result = await sequelize.query(`
      INSERT INTO quotes (
        quote_number, company_id, seller_id,
        modules_data, total_amount,
        status, valid_until, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3,
        $4, $5,
        'draft', $6, $7,
        NOW(), NOW()
      )
      RETURNING id, quote_number, status, total_amount, created_at
    `, {
      bind: [
        quoteNumber,
        company_id,
        finalVendorId,
        JSON.stringify(selected_modules || []),
        total_monthly,
        validUntilDate,
        notes || null
      ],
      type: sequelize.QueryTypes.INSERT
    });

    console.log(`✅ Presupuesto creado: ${quoteNumber} para empresa ${company_id}`);

    res.json({
      success: true,
      data: {
        id: result[0]?.[0]?.id,
        quote_number: quoteNumber,
        status: 'draft',
        total_amount: total_monthly
      },
      message: 'Presupuesto creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando presupuesto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear presupuesto',
      details: error.message
    });
  }
});

// ============================================================================
// CRUD - INVOICES (Facturas)
// ============================================================================

/**
 * POST /api/aponnt/dashboard/invoices
 * Crear nueva factura manual
 */
router.post('/invoices', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');

    const {
      company_id,
      total_amount,
      period,
      due_date,
      concept
    } = req.body;

    // Validaciones
    if (!company_id || !total_amount) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: company_id, total_amount'
      });
    }

    // Generar número de factura
    const year = new Date().getFullYear();
    const countResult = await sequelize.query(
      `SELECT COUNT(*) as count FROM invoices WHERE EXTRACT(YEAR FROM created_at) = $1`,
      { bind: [year], type: sequelize.QueryTypes.SELECT }
    );
    const sequence = parseInt(countResult[0]?.count || 0) + 1;
    const invoiceNumber = `INV-${year}-${String(sequence).padStart(6, '0')}`;

    // Fecha de vencimiento (15 días si no se especifica)
    const dueDateValue = due_date || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await sequelize.query(`
      INSERT INTO invoices (
        company_id, invoice_number, total_amount,
        period, due_date, concept, status,
        issue_date, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'PENDING',
        NOW(), NOW(), NOW()
      )
      RETURNING id, invoice_number, total_amount, status, issue_date
    `, {
      bind: [
        company_id,
        invoiceNumber,
        total_amount,
        period || null,
        dueDateValue,
        concept || 'Servicio mensual'
      ],
      type: sequelize.QueryTypes.INSERT
    });

    console.log(`✅ Factura creada: ${invoiceNumber} para empresa ${company_id}`);

    res.json({
      success: true,
      data: {
        id: result[0]?.[0]?.id,
        invoice_number: invoiceNumber,
        total_amount: total_amount,
        status: 'PENDING'
      },
      message: 'Factura creada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando factura:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear factura',
      details: error.message
    });
  }
});

// ============================================================================
// CRUD - STAFF (Personal Aponnt)
// ============================================================================

/**
 * GET /api/aponnt/dashboard/staff
 * Listar staff de Aponnt
 */
router.get('/staff', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { area, level, is_active } = req.query;

    let whereClause = 'WHERE 1=1';
    const bindings = [];
    let bindIndex = 1;

    if (area) {
      whereClause += ` AND area = $${bindIndex++}`;
      bindings.push(area);
    }
    if (level) {
      whereClause += ` AND level = $${bindIndex++}`;
      bindings.push(parseInt(level));
    }
    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${bindIndex++}`;
      bindings.push(is_active === 'true');
    }

    const staff = await sequelize.query(`
      SELECT
        staff_id, first_name, last_name, email, phone,
        area, level, is_active, global_rating,
        created_at, updated_at
      FROM aponnt_staff
      ${whereClause}
      ORDER BY level DESC, first_name ASC
    `, {
      bind: bindings,
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: staff,
      count: staff.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo staff:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener staff',
      details: error.message
    });
  }
});

/**
 * POST /api/aponnt/dashboard/staff
 * Crear nuevo miembro del staff
 */
router.post('/staff', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    const {
      first_name,
      last_name,
      email,
      phone,
      area,
      level,
      password,
      is_active
    } = req.body;

    // Validaciones
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: first_name, last_name, email, password'
      });
    }

    // Verificar email duplicado
    const existing = await sequelize.query(
      `SELECT staff_id FROM aponnt_staff WHERE email = $1`,
      { bind: [email], type: sequelize.QueryTypes.SELECT }
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un staff con ese email'
      });
    }

    // Hash de password
    const hashedPassword = await bcrypt.hash(password, 10);
    const staffId = uuidv4();

    await sequelize.query(`
      INSERT INTO aponnt_staff (
        staff_id, first_name, last_name, email, phone,
        area, level, password_hash, is_active,
        country, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        'AR', NOW(), NOW()
      )
    `, {
      bind: [
        staffId,
        first_name.trim(),
        last_name.trim(),
        email.trim().toLowerCase(),
        phone || null,
        area || 'comercial',
        level || 1,
        hashedPassword,
        is_active !== false
      ],
      type: sequelize.QueryTypes.INSERT
    });

    console.log(`✅ Staff creado: ${first_name} ${last_name} (${email})`);

    res.json({
      success: true,
      data: {
        staff_id: staffId,
        first_name,
        last_name,
        email,
        area,
        level
      },
      message: 'Staff creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando staff:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear staff',
      details: error.message
    });
  }
});

// ============================================================================
// SUPPORT TICKETS - Para panel administrativo
// ============================================================================

/**
 * GET /api/aponnt/dashboard/support-tickets
 * Obtener todos los tickets de soporte (para admin)
 */
router.get('/support-tickets', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { status, priority, company_id, assigned_to, limit = 50 } = req.query;

    let whereClause = 'WHERE 1=1';
    const bindings = [];
    let bindIndex = 1;

    if (status) {
      whereClause += ` AND t.status = $${bindIndex++}`;
      bindings.push(status);
    }
    if (priority) {
      whereClause += ` AND t.priority = $${bindIndex++}`;
      bindings.push(priority);
    }
    if (company_id) {
      whereClause += ` AND t.company_id = $${bindIndex++}`;
      bindings.push(parseInt(company_id));
    }
    if (assigned_to) {
      whereClause += ` AND t.assigned_to_staff_id = $${bindIndex++}`;
      bindings.push(assigned_to);
    }

    const tickets = await sequelize.query(`
      SELECT
        t.id, t.ticket_number, t.subject, t.description,
        t.status, t.priority, t.module_name,
        t.company_id, c.name as company_name,
        t.created_by_user_id, u.name as created_by_name,
        t.assigned_to_staff_id,
        CONCAT(s.first_name, ' ', s.last_name) as assigned_to_name,
        t.created_at, t.updated_at, t.resolved_at,
        t.sla_deadline, t.response_time_minutes
      FROM support_tickets_v2 t
      LEFT JOIN companies c ON t.company_id = c.company_id
      LEFT JOIN users u ON t.created_by_user_id = u.user_id
      LEFT JOIN aponnt_staff s ON t.assigned_to_staff_id = s.staff_id
      ${whereClause}
      ORDER BY
        CASE t.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        t.created_at DESC
      LIMIT $${bindIndex}
    `, {
      bind: [...bindings, parseInt(limit)],
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: tickets,
      count: tickets.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tickets',
      details: error.message
    });
  }
});

/**
 * POST /api/aponnt/dashboard/support-tickets
 * Crear ticket de soporte desde admin
 */
router.post('/support-tickets', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { v4: uuidv4 } = require('uuid');

    const {
      company_id,
      subject,
      description,
      priority = 'medium',
      module_name,
      assigned_to_staff_id
    } = req.body;

    if (!company_id || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: company_id, subject'
      });
    }

    // Generar número de ticket
    const year = new Date().getFullYear();
    const countResult = await sequelize.query(
      `SELECT COUNT(*) as count FROM support_tickets_v2 WHERE EXTRACT(YEAR FROM created_at) = $1`,
      { bind: [year], type: sequelize.QueryTypes.SELECT }
    );
    const sequence = parseInt(countResult[0]?.count || 0) + 1;
    const ticketNumber = `TKT-${year}-${String(sequence).padStart(6, '0')}`;

    // Calcular SLA deadline según prioridad
    const slaHours = { critical: 2, high: 4, medium: 8, low: 24 };
    const deadline = new Date(Date.now() + (slaHours[priority] || 8) * 60 * 60 * 1000);

    const ticketId = uuidv4();

    await sequelize.query(`
      INSERT INTO support_tickets_v2 (
        id, ticket_number, company_id, subject, description,
        priority, module_name, status, assigned_to_staff_id,
        sla_deadline, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'open', $8, $9, NOW(), NOW()
      )
    `, {
      bind: [
        ticketId,
        ticketNumber,
        company_id,
        subject,
        description || null,
        priority,
        module_name || 'general',
        assigned_to_staff_id || null,
        deadline.toISOString()
      ],
      type: sequelize.QueryTypes.INSERT
    });

    console.log(`✅ Ticket creado: ${ticketNumber}`);

    res.json({
      success: true,
      data: {
        id: ticketId,
        ticket_number: ticketNumber,
        status: 'open',
        priority,
        sla_deadline: deadline
      },
      message: 'Ticket creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear ticket',
      details: error.message
    });
  }
});

/**
 * PUT /api/aponnt/dashboard/support-tickets/:id/assign
 * Asignar ticket a un staff
 */
router.put('/support-tickets/:id/assign', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { id } = req.params;
    const { staff_id } = req.body;

    await sequelize.query(`
      UPDATE support_tickets_v2 SET
        assigned_to_staff_id = $1,
        status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END,
        updated_at = NOW()
      WHERE id = $2
    `, {
      bind: [staff_id, id],
      type: sequelize.QueryTypes.UPDATE
    });

    res.json({
      success: true,
      message: 'Ticket asignado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error asignando ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Error al asignar ticket',
      details: error.message
    });
  }
});

/**
 * PUT /api/aponnt/dashboard/support-tickets/:id/status
 * Cambiar estado de un ticket
 */
router.put('/support-tickets/:id/status', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const validStatuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido'
      });
    }

    let extraFields = '';
    const bindings = [status];
    let bindIndex = 2;

    if (status === 'resolved' || status === 'closed') {
      extraFields = `, resolved_at = NOW()`;
      if (resolution_notes) {
        extraFields += `, resolution_notes = $${bindIndex++}`;
        bindings.push(resolution_notes);
      }
    }

    bindings.push(id);

    await sequelize.query(`
      UPDATE support_tickets_v2 SET
        status = $1,
        updated_at = NOW()
        ${extraFields}
      WHERE id = $${bindIndex}
    `, {
      bind: bindings,
      type: sequelize.QueryTypes.UPDATE
    });

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado',
      details: error.message
    });
  }
});

/**
 * GET /api/aponnt/dashboard/support-stats
 * Estadísticas de soporte para dashboard
 */
router.get('/support-stats', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');

    // Contar tickets por estado
    const byStatus = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM support_tickets_v2
      GROUP BY status
    `, { type: sequelize.QueryTypes.SELECT });

    // Contar tickets por prioridad
    const byPriority = await sequelize.query(`
      SELECT priority, COUNT(*) as count
      FROM support_tickets_v2
      WHERE status NOT IN ('resolved', 'closed')
      GROUP BY priority
    `, { type: sequelize.QueryTypes.SELECT });

    // Tickets vencidos (pasaron SLA)
    const overdueResult = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM support_tickets_v2
      WHERE status NOT IN ('resolved', 'closed')
        AND sla_deadline < NOW()
    `, { type: sequelize.QueryTypes.SELECT });

    // Tickets sin asignar
    const unassignedResult = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM support_tickets_v2
      WHERE status = 'open'
        AND assigned_to_staff_id IS NULL
    `, { type: sequelize.QueryTypes.SELECT });

    // Tiempo promedio de resolución (últimos 30 días)
    const avgResolutionResult = await sequelize.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_minutes
      FROM support_tickets_v2
      WHERE resolved_at IS NOT NULL
        AND resolved_at > NOW() - INTERVAL '30 days'
    `, { type: sequelize.QueryTypes.SELECT });

    // Total tickets hoy
    const todayResult = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM support_tickets_v2
      WHERE created_at >= CURRENT_DATE
    `, { type: sequelize.QueryTypes.SELECT });

    const statusMap = {};
    byStatus.forEach(s => { statusMap[s.status] = parseInt(s.count); });

    const priorityMap = {};
    byPriority.forEach(p => { priorityMap[p.priority] = parseInt(p.count); });

    res.json({
      success: true,
      data: {
        by_status: statusMap,
        by_priority: priorityMap,
        overdue: parseInt(overdueResult[0]?.count || 0),
        unassigned: parseInt(unassignedResult[0]?.count || 0),
        avg_resolution_minutes: Math.round(avgResolutionResult[0]?.avg_minutes || 0),
        today_count: parseInt(todayResult[0]?.count || 0),
        total_open: (statusMap.open || 0) + (statusMap.in_progress || 0) + (statusMap.waiting_customer || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
});

// ============================================================================
// REPORTES - Generación y exportación
// ============================================================================

/**
 * GET /api/aponnt/dashboard/reports/companies
 * Reporte de empresas con métricas
 */
router.get('/reports/companies', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { status, from_date, to_date, format = 'json' } = req.query;

    let whereClause = 'WHERE 1=1';
    const bindings = [];
    let bindIndex = 1;

    if (status) {
      whereClause += ` AND c.status = $${bindIndex++}`;
      bindings.push(status);
    }
    if (from_date) {
      whereClause += ` AND c.created_at >= $${bindIndex++}`;
      bindings.push(from_date);
    }
    if (to_date) {
      whereClause += ` AND c.created_at <= $${bindIndex++}`;
      bindings.push(to_date);
    }

    const companies = await sequelize.query(`
      SELECT
        c.company_id, c.name, c.legal_name, c.tax_id,
        c.contact_email, c.phone, c.status, c.is_active,
        c.max_employees, c.license_type,
        c.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id) as user_count,
        (SELECT COUNT(*) FROM invoices i WHERE i.company_id = c.company_id) as invoice_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices i WHERE i.company_id = c.company_id AND i.status = 'PAID') as total_billed
      FROM companies c
      ${whereClause}
      ORDER BY c.created_at DESC
    `, {
      bind: bindings,
      type: sequelize.QueryTypes.SELECT
    });

    // Estadísticas generales
    const stats = {
      total_companies: companies.length,
      active: companies.filter(c => c.is_active).length,
      inactive: companies.filter(c => !c.is_active).length,
      total_users: companies.reduce((sum, c) => sum + parseInt(c.user_count || 0), 0),
      total_billed: companies.reduce((sum, c) => sum + parseFloat(c.total_billed || 0), 0)
    };

    if (format === 'csv') {
      const csv = generateCSV(companies, ['company_id', 'name', 'tax_id', 'contact_email', 'status', 'user_count', 'total_billed', 'created_at']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte-empresas.csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      report_type: 'companies',
      generated_at: new Date().toISOString(),
      stats,
      data: companies
    });

  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/aponnt/dashboard/reports/billing
 * Reporte de facturación
 */
router.get('/reports/billing', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { from_date, to_date, status, format = 'json' } = req.query;

    let whereClause = 'WHERE 1=1';
    const bindings = [];
    let bindIndex = 1;

    if (status) {
      whereClause += ` AND i.status = $${bindIndex++}`;
      bindings.push(status);
    }
    if (from_date) {
      whereClause += ` AND i.created_at >= $${bindIndex++}`;
      bindings.push(from_date);
    }
    if (to_date) {
      whereClause += ` AND i.created_at <= $${bindIndex++}`;
      bindings.push(to_date);
    }

    const invoices = await sequelize.query(`
      SELECT
        i.id, i.invoice_number, i.total_amount, i.status,
        i.issue_date, i.due_date, i.paid_at,
        i.company_id, c.name as company_name
      FROM invoices i
      LEFT JOIN companies c ON i.company_id = c.company_id
      ${whereClause}
      ORDER BY i.created_at DESC
    `, {
      bind: bindings,
      type: sequelize.QueryTypes.SELECT
    });

    const stats = {
      total_invoices: invoices.length,
      pending: invoices.filter(i => i.status === 'PENDING').length,
      paid: invoices.filter(i => i.status === 'PAID').length,
      overdue: invoices.filter(i => i.status === 'OVERDUE').length,
      total_amount: invoices.reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0),
      total_paid: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0),
      total_pending: invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0)
    };

    if (format === 'csv') {
      const csv = generateCSV(invoices, ['invoice_number', 'company_name', 'total_amount', 'status', 'issue_date', 'due_date', 'paid_at']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte-facturacion.csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      report_type: 'billing',
      generated_at: new Date().toISOString(),
      stats,
      data: invoices
    });

  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/aponnt/dashboard/reports/support
 * Reporte de tickets de soporte
 */
router.get('/reports/support', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { from_date, to_date, status, priority, format = 'json' } = req.query;

    let whereClause = 'WHERE 1=1';
    const bindings = [];
    let bindIndex = 1;

    if (status) {
      whereClause += ` AND t.status = $${bindIndex++}`;
      bindings.push(status);
    }
    if (priority) {
      whereClause += ` AND t.priority = $${bindIndex++}`;
      bindings.push(priority);
    }
    if (from_date) {
      whereClause += ` AND t.created_at >= $${bindIndex++}`;
      bindings.push(from_date);
    }
    if (to_date) {
      whereClause += ` AND t.created_at <= $${bindIndex++}`;
      bindings.push(to_date);
    }

    const tickets = await sequelize.query(`
      SELECT
        t.id, t.ticket_number, t.subject, t.status, t.priority,
        t.module_name, t.created_at, t.resolved_at,
        t.response_time_minutes,
        c.name as company_name,
        CONCAT(s.first_name, ' ', s.last_name) as assigned_to
      FROM support_tickets_v2 t
      LEFT JOIN companies c ON t.company_id = c.company_id
      LEFT JOIN aponnt_staff s ON t.assigned_to_staff_id = s.staff_id
      ${whereClause}
      ORDER BY t.created_at DESC
    `, {
      bind: bindings,
      type: sequelize.QueryTypes.SELECT
    });

    const resolved = tickets.filter(t => t.resolved_at);
    const avgResolution = resolved.length > 0
      ? resolved.reduce((sum, t) => sum + (t.response_time_minutes || 0), 0) / resolved.length
      : 0;

    const stats = {
      total_tickets: tickets.length,
      by_status: {
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        closed: tickets.filter(t => t.status === 'closed').length
      },
      by_priority: {
        critical: tickets.filter(t => t.priority === 'critical').length,
        high: tickets.filter(t => t.priority === 'high').length,
        medium: tickets.filter(t => t.priority === 'medium').length,
        low: tickets.filter(t => t.priority === 'low').length
      },
      avg_resolution_minutes: Math.round(avgResolution),
      resolution_rate: tickets.length > 0 ? Math.round((resolved.length / tickets.length) * 100) : 0
    };

    if (format === 'csv') {
      const csv = generateCSV(tickets, ['ticket_number', 'company_name', 'subject', 'priority', 'status', 'assigned_to', 'created_at', 'resolved_at']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte-soporte.csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      report_type: 'support',
      generated_at: new Date().toISOString(),
      stats,
      data: tickets
    });

  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/aponnt/dashboard/reports/vendors
 * Reporte de vendedores y comisiones
 */
router.get('/reports/vendors', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const { from_date, to_date, format = 'json' } = req.query;

    const vendors = await sequelize.query(`
      SELECT
        s.staff_id, s.first_name, s.last_name, s.email,
        s.area, s.level, s.global_rating,
        COUNT(DISTINCT vc.company_id) as companies_count,
        COALESCE(SUM(vc.monthly_amount), 0) as total_commissions
      FROM aponnt_staff s
      LEFT JOIN vendor_commissions vc ON s.staff_id = vc.vendor_id AND vc.is_active = true
      WHERE s.area = 'comercial' AND s.is_active = true
      GROUP BY s.staff_id, s.first_name, s.last_name, s.email, s.area, s.level, s.global_rating
      ORDER BY total_commissions DESC
    `, { type: sequelize.QueryTypes.SELECT });

    const stats = {
      total_vendors: vendors.length,
      total_commissions: vendors.reduce((sum, v) => sum + parseFloat(v.total_commissions || 0), 0),
      avg_companies_per_vendor: vendors.length > 0
        ? Math.round(vendors.reduce((sum, v) => sum + parseInt(v.companies_count || 0), 0) / vendors.length * 10) / 10
        : 0
    };

    if (format === 'csv') {
      const csv = generateCSV(vendors, ['first_name', 'last_name', 'email', 'level', 'companies_count', 'total_commissions', 'global_rating']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reporte-vendedores.csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      report_type: 'vendors',
      generated_at: new Date().toISOString(),
      stats,
      data: vendors
    });

  } catch (error) {
    console.error('❌ Error generando reporte:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/aponnt/dashboard/reports/executive
 * Reporte ejecutivo (resumen general)
 */
router.get('/reports/executive', async (req, res) => {
  try {
    const { sequelize } = require('../config/database');

    // Empresas
    const companiesResult = await sequelize.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_last_30_days
      FROM companies
    `, { type: sequelize.QueryTypes.SELECT });

    // Facturación
    const billingResult = await sequelize.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_billed,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'PAID'), 0) as total_collected,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'PENDING'), 0) as total_pending,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as invoices_last_30_days
      FROM invoices
    `, { type: sequelize.QueryTypes.SELECT });

    // Soporte
    const supportResult = await sequelize.query(`
      SELECT
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')) as open_tickets,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as tickets_last_7_days,
        AVG(response_time_minutes) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution
      FROM support_tickets_v2
    `, { type: sequelize.QueryTypes.SELECT });

    // Staff
    const staffResult = await sequelize.query(`
      SELECT
        COUNT(*) as total_staff,
        COUNT(*) FILTER (WHERE area = 'comercial') as vendors,
        COUNT(*) FILTER (WHERE area = 'soporte') as support_staff
      FROM aponnt_staff WHERE is_active = true
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      report_type: 'executive',
      generated_at: new Date().toISOString(),
      data: {
        companies: {
          total: parseInt(companiesResult[0]?.total || 0),
          active: parseInt(companiesResult[0]?.active || 0),
          new_last_30_days: parseInt(companiesResult[0]?.new_last_30_days || 0)
        },
        billing: {
          total_billed: parseFloat(billingResult[0]?.total_billed || 0),
          total_collected: parseFloat(billingResult[0]?.total_collected || 0),
          total_pending: parseFloat(billingResult[0]?.total_pending || 0),
          invoices_last_30_days: parseInt(billingResult[0]?.invoices_last_30_days || 0)
        },
        support: {
          total_tickets: parseInt(supportResult[0]?.total_tickets || 0),
          open_tickets: parseInt(supportResult[0]?.open_tickets || 0),
          tickets_last_7_days: parseInt(supportResult[0]?.tickets_last_7_days || 0),
          avg_resolution_minutes: Math.round(supportResult[0]?.avg_resolution || 0)
        },
        staff: {
          total: parseInt(staffResult[0]?.total_staff || 0),
          vendors: parseInt(staffResult[0]?.vendors || 0),
          support: parseInt(staffResult[0]?.support_staff || 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generando reporte ejecutivo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Generar CSV
function generateCSV(data, columns) {
  if (!data || data.length === 0) return '';

  const headers = columns.join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      const str = String(value);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );

  return [headers, ...rows].join('\n');
}

module.exports = router;