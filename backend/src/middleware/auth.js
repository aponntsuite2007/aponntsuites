const jwt = require('jsonwebtoken');
const { User } = require('../config/database');

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

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar si el usuario existe y está activo
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

    // Agregar usuario al request
    req.user = user;
    console.log('✅ [AUTH] Usuario autenticado correctamente:', {
      id: user.user_id,
      email: user.email,
      company_id: user.company_id
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
  return (req, res, next) => {
    console.log('🔐 [AUTHORIZE] Verificando permisos...');
    console.log('🔐 [AUTHORIZE] Roles permitidos:', roles);
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
          userId: req.user.user_id || req.user.id,
          email: req.user.email
        }
      });
    }

    if (!roles.includes(userRole)) {
      console.warn(`⚠️ [AUTHORIZE] Acceso denegado. Rol "${userRole}" no está en ${JSON.stringify(roles)}`);
      return res.status(403).json({
        error: 'Acceso denegado. Permisos insuficientes.',
        required: roles,
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

module.exports = {
  auth,
  authorize,
  adminOnly,
  supervisorOrAdmin
};