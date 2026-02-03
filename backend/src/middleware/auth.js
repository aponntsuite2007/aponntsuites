const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../config/database');

// =====================================================================
// TOKEN BLACKLIST - In-memory revocation list
// =====================================================================
const tokenBlacklist = new Map(); // hash -> expiryTimestamp

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
}

function blacklistToken(token, expiresInMs = 24 * 60 * 60 * 1000) {
  const hash = hashToken(token);
  tokenBlacklist.set(hash, Date.now() + expiresInMs);
  console.log(`🚫 [BLACKLIST] Token revocado (${tokenBlacklist.size} tokens en blacklist)`);
}

function isTokenBlacklisted(token) {
  const hash = hashToken(token);
  return tokenBlacklist.has(hash);
}

// Cleanup expired entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [hash, expiry] of tokenBlacklist.entries()) {
    if (expiry < now) {
      tokenBlacklist.delete(hash);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 [BLACKLIST] Limpiados ${cleaned} tokens expirados (quedan ${tokenBlacklist.size})`);
  }
}, 30 * 60 * 1000);

/**
 * Middleware de autenticación JWT
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization') || req.headers['authorization'];

    console.log('🔍 [AUTH] Headers recibidos:', Object.keys(req.headers));
    console.log('🔍 [AUTH] Authorization header:', authHeader);

    if (!authHeader) {
      console.log('❌ [AUTH] No se encontró header Authorization');
      return res.status(401).json({
        error: 'Acceso denegado. Token no proporcionado.'
      });
    }

    // Verificar formato del token (case insensitive)
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      console.log('❌ [AUTH] Formato de token inválido. Header:', authHeader);
      return res.status(401).json({
        error: 'Formato de token inválido.',
        received: authHeader.substring(0, 20) + '...'
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    // Verificar si el token fue revocado (logout)
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({
        error: 'Sesion cerrada. Inicie sesion nuevamente.'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // SOPORTE PARA TOKENS DE STAFF APONNT
    if (decoded.type === 'aponnt_staff') {
      console.log('🔍 [AUTH] Token de staff Aponnt detectado:', decoded.staff_id);

      // Para staff de Aponnt, crear un objeto user compatible
      req.user = {
        id: decoded.staff_id,
        user_id: decoded.staff_id,
        staff_id: decoded.staff_id,
        email: decoded.email,
        role: 'admin', // Staff Aponnt siempre tiene rol admin para el sistema
        isActive: true,
        is_staff: true,
        is_aponnt_staff: true,
        company_id: null, // Staff no pertenece a una empresa específica
        level: decoded.level || 0,
        area: decoded.area,
        country: decoded.country,
        staff_role: decoded.role,
        staff_role_name: decoded.role_name
      };

      console.log('✅ [AUTH] Staff Aponnt autenticado:', {
        staff_id: decoded.staff_id,
        email: decoded.email,
        role: decoded.role
      });
      return next();
    }

    // Verificar si el usuario existe y está activo (usuarios de empresa)
    console.log('🔍 [AUTH] Buscando usuario con ID:', decoded.id);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    console.log('🔍 [AUTH] Usuario encontrado:', user ? {
      id: user.user_id,
      email: user.email,
      company_id: user.company_id,
      companyId: user.companyId,
      isActive: user.isActive,
      role: user.role
    } : 'NULL');

    if (!user) {
      return res.status(401).json({
        error: 'Token inválido. Usuario no encontrado.'
      });
    }

    if (!user.isActive) {
      console.log('❌ [AUTH] Usuario inactivo:', user.isActive);
      return res.status(401).json({
        error: 'Usuario inactivo.'
      });
    }

    // Agregar usuario al request - incluir alias 'id' para compatibilidad
    req.user = user.toJSON();
    req.user.id = req.user.user_id; // Alias para compatibilidad con código que usa 'id'
    console.log('✅ [AUTH] Usuario autenticado correctamente:', {
      id: req.user.user_id,
      email: req.user.email,
      company_id: req.user.company_id
    });
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido.' 
      });
    }

    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor.' 
    });
  }
};

/**
 * Middleware para verificar roles específicos
 */
const authorize = (...roles) => {
  // Aplanar si se pasa un array como primer argumento
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    console.log('🔐 [AUTHORIZE] Verificando permisos...');
    console.log('🔐 [AUTHORIZE] Roles permitidos:', allowedRoles);
    console.log('🔐 [AUTHORIZE] Usuario:', {
      user_id: req.user?.user_id,
      email: req.user?.email,
      role: req.user?.role
    });

    if (!req.user) {
      console.error('❌ [AUTHORIZE] req.user no definido');
      return res.status(401).json({
        error: 'Usuario no autenticado.'
      });
    }

    // Obtener rol del usuario (puede estar en user.role o user.dataValues.role)
    const userRole = req.user.role || req.user.dataValues?.role;

    console.log('🔐 [AUTHORIZE] Rol del usuario:', userRole);

    if (!userRole) {
      console.error('❌ [AUTHORIZE] Usuario sin rol asignado');
      return res.status(403).json({
        error: 'Usuario sin rol asignado. Contacte al administrador.',
        details: {
          userId: req.user.user_id,
          email: req.user.email
        }
      });
    }

    if (!allowedRoles.includes(userRole)) {
      console.warn(`⚠️ [AUTHORIZE] Acceso denegado. Rol "${userRole}" no está en ${JSON.stringify(allowedRoles)}`);
      return res.status(403).json({
        error: 'Acceso denegado. Permisos insuficientes.',
        required: allowedRoles,
        current: userRole
      });
    }

    console.log('✅ [AUTHORIZE] Acceso permitido');
    next();
  };
};

/**
 * Middleware para verificar si es admin
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Usuario no autenticado.' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Solo administradores.' 
    });
  }

  next();
};

/**
 * Middleware para verificar si es admin o supervisor
 */
const supervisorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Usuario no autenticado.'
    });
  }

  if (!['admin', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Acceso denegado. Requiere permisos de supervisor o administrador.'
    });
  }

  next();
};

/**
 * Middleware Enterprise de Control de Acceso Granular (RBAC)
 *
 * Verifica permisos por módulo y acción usando el sistema SSOT
 * Integra con AccessControlService para verificación contra BD
 *
 * @param {string} moduleKey - Clave del módulo (ej: 'users', 'attendance')
 * @param {string} action - Acción requerida: 'read', 'create', 'update', 'delete'
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.checkScope - Verificar scope (departamentos, sucursales)
 * @param {boolean} options.checkDependencies - Verificar dependencias del módulo
 *
 * @example
 * router.get('/', auth, authorizeModule('users', 'read'), handler)
 * router.post('/', auth, authorizeModule('users', 'create'), handler)
 * router.put('/:id', auth, authorizeModule('users', 'update'), handler)
 * router.delete('/:id', auth, authorizeModule('users', 'delete'), handler)
 */
const authorizeModule = (moduleKey, action = 'read', options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        console.error('❌ [AUTHORIZE-MODULE] req.user no definido');
        return res.status(401).json({
          error: 'Usuario no autenticado.'
        });
      }

      const userId = req.user.user_id;
      const companyId = req.user.company_id;
      const userRole = req.user.role;

      console.log(`🔐 [AUTHORIZE-MODULE] Verificando: ${moduleKey}:${action}`);
      console.log(`🔐 [AUTHORIZE-MODULE] Usuario: ${userId}, Empresa: ${companyId}, Rol: ${userRole}`);

      // Super admin bypass
      if (userRole === 'super_admin') {
        console.log('✅ [AUTHORIZE-MODULE] Super admin - acceso directo');
        return next();
      }

      // Cargar AccessControlService dinámicamente para evitar circular deps
      let AccessControlService;
      try {
        AccessControlService = require('../services/AccessControlService');
      } catch (err) {
        console.warn('⚠️ [AUTHORIZE-MODULE] AccessControlService no disponible, usando fallback');
        // Fallback al sistema básico de roles
        return fallbackRoleCheck(req, res, next, moduleKey, action, userRole);
      }

      // Verificar acceso usando el servicio SSOT
      const accessResult = await AccessControlService.checkAccess(
        userId,
        companyId,
        moduleKey,
        action
      );

      if (!accessResult.hasAccess) {
        console.warn(`⚠️ [AUTHORIZE-MODULE] Acceso denegado: ${accessResult.reason}`);
        return res.status(403).json({
          error: 'Acceso denegado.',
          reason: accessResult.reason || 'Permisos insuficientes',
          required: { module: moduleKey, action },
          current: { role: userRole }
        });
      }

      // Guardar scope efectivo en el request para uso posterior
      req.accessScope = accessResult.scope;
      req.accessScopeValue = accessResult.scopeValue;

      // Si se requiere verificar dependencias del módulo
      if (options.checkDependencies) {
        const depsResult = await AccessControlService.checkModuleDependencies(moduleKey, companyId);
        if (!depsResult.canUse) {
          console.warn(`⚠️ [AUTHORIZE-MODULE] Dependencias faltantes para ${moduleKey}`);
          return res.status(412).json({
            error: 'El módulo tiene dependencias sin configurar.',
            missingDependencies: depsResult.missing,
            message: 'Configure primero los módulos requeridos antes de usar este.'
          });
        }
      }

      console.log(`✅ [AUTHORIZE-MODULE] Acceso permitido: ${moduleKey}:${action} (scope: ${accessResult.scope})`);
      next();

    } catch (error) {
      console.error('❌ [AUTHORIZE-MODULE] Error verificando permisos:', error);

      // En caso de error, usar fallback al sistema básico
      const userRole = req.user?.role;
      return fallbackRoleCheck(req, res, next, moduleKey, action, userRole);
    }
  };
};

/**
 * Fallback al sistema básico de roles cuando AccessControlService no está disponible
 */
function fallbackRoleCheck(req, res, next, moduleKey, action, userRole) {
  console.log('🔄 [AUTHORIZE-MODULE] Usando fallback de roles básico');

  // Mapeo básico de roles a acciones permitidas
  const rolePermissions = {
    'admin': ['read', 'create', 'update', 'delete'],
    'rrhh': ['read', 'create', 'update'],
    'supervisor': ['read', 'create', 'update'],
    'manager': ['read', 'create', 'update'],
    'employee': ['read'],
    'associate_medical': ['read', 'create', 'update'],
    'associate_legal': ['read', 'create', 'update'],
    'associate_safety': ['read', 'create', 'update']
  };

  const allowedActions = rolePermissions[userRole] || ['read'];

  if (allowedActions.includes(action)) {
    console.log(`✅ [AUTHORIZE-MODULE] Fallback permitido: ${action}`);
    return next();
  }

  console.warn(`⚠️ [AUTHORIZE-MODULE] Fallback denegado: ${action} no en ${allowedActions}`);
  return res.status(403).json({
    error: 'Acceso denegado.',
    reason: 'Permisos insuficientes (modo fallback)',
    required: { module: moduleKey, action },
    current: { role: userRole }
  });
}

/**
 * Middleware para verificar si el usuario puede ver un empleado específico
 * Útil para asociados eventuales que solo ven empleados asignados
 */
const canViewEmployee = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    const employeeId = req.params.employeeId || req.params.userId || req.params.id;

    if (!employeeId) {
      return next(); // No hay employeeId que verificar
    }

    const userId = req.user.user_id;
    const companyId = req.user.company_id;
    const userRole = req.user.role;

    // Admins y RRHH pueden ver todos
    if (['admin', 'rrhh', 'super_admin'].includes(userRole)) {
      return next();
    }

    // El usuario puede verse a sí mismo
    if (userId === employeeId) {
      return next();
    }

    // Cargar AccessControlService
    let AccessControlService;
    try {
      AccessControlService = require('../services/AccessControlService');
    } catch (err) {
      // Sin servicio, permitir para supervisores
      if (['supervisor', 'manager'].includes(userRole)) {
        return next();
      }
      return res.status(403).json({ error: 'No puede ver este empleado.' });
    }

    const canView = await AccessControlService.canViewEmployee(userId, companyId, employeeId);

    if (!canView) {
      console.warn(`⚠️ [CAN-VIEW-EMPLOYEE] Usuario ${userId} no puede ver empleado ${employeeId}`);
      return res.status(403).json({
        error: 'No tiene permisos para ver este empleado.',
        reason: 'El empleado no está en su scope de visibilidad'
      });
    }

    next();

  } catch (error) {
    console.error('❌ [CAN-VIEW-EMPLOYEE] Error:', error);
    next(); // En caso de error, permitir (fail-open para no bloquear)
  }
};

module.exports = {
  auth,
  authorize,
  adminOnly,
  supervisorOrAdmin,
  authorizeModule,
  canViewEmployee,
  blacklistToken,
  // Aliases para compatibilidad
  authenticateJWT: auth,
  requireRole: authorize
};
