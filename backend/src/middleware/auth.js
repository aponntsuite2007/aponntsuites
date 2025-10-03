const jwt = require('jsonwebtoken');
const { User } = require('../config/database');

/**
 * Middleware de autenticación JWT
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Acceso denegado. Token no proporcionado.' 
      });
    }

    // Verificar formato del token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Formato de token inválido.' 
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
      isActive: user.isActive
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
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Permisos insuficientes.' 
      });
    }

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