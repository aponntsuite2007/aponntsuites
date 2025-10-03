const jwt = require('jsonwebtoken');
const { multiTenantDB } = require('../config/multiTenantDatabase');

/**
 * Multi-Tenant Authentication Middleware
 * Handles company-specific authentication and database routing
 */

/**
 * Extract company slug from request
 */
function extractCompanySlug(req) {
  // Try subdomain first (company.sistema.com)
  const host = req.get('host');
  if (host) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
      return subdomain;
    }
  }
  
  // Try path parameter (/api/v1/company/:slug/...)
  if (req.params.companySlug) {
    return req.params.companySlug;
  }
  
  // Try header
  if (req.headers['x-company-slug']) {
    return req.headers['x-company-slug'];
  }
  
  // Try query parameter
  if (req.query.company) {
    return req.query.company;
  }
  
  return null;
}

/**
 * Multi-tenant middleware that sets up company context
 */
const multiTenant = async (req, res, next) => {
  try {
    const companySlug = extractCompanySlug(req);
    
    if (!companySlug) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo identificar la empresa',
        message: 'Provide company via subdomain, path, header, or query parameter'
      });
    }
    
    // Get company information
    const company = await multiTenantDB.getCompanyBySlug(companySlug);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada',
        companySlug: companySlug
      });
    }
    
    if (!company.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Empresa desactivada',
        companySlug: companySlug
      });
    }
    
    // Get company database connection
    const companyConnection = await multiTenantDB.getCompanyConnection(companySlug);
    
    // Add to request context
    req.company = company;
    req.companySlug = companySlug;
    req.companyConnection = companyConnection;
    req.companyModels = await multiTenantDB.setupCompanyModels(companyConnection);
    
    next();
  } catch (error) {
    console.error('Multi-tenant middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Error de configuración multi-tenant'
    });
  }
};

/**
 * Multi-tenant authentication middleware
 */
const multiTenantAuth = async (req, res, next) => {
  try {
    // First apply multi-tenant context
    await multiTenant(req, res, () => {});
    
    // Extract token
    let token = null;
    
    // Try Authorization header
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    // Try cookie
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }
    
    // Try query parameter (for development)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado'
      });
    }
    
    // Get user from company database
    const { User } = req.companyModels;
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'employeeId', 'firstName', 'lastName', 'email', 'role', 'isActive']
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado o desactivado'
      });
    }
    
    // Check if user belongs to this company (additional security)
    if (decoded.companySlug && decoded.companySlug !== req.companySlug) {
      return res.status(403).json({
        success: false,
        error: 'Token no válido para esta empresa'
      });
    }
    
    // Add user to request
    req.user = user.toJSON();
    req.user.companySlug = req.companySlug;
    
    // Check session in Redis if available
    const redisClient = multiTenantDB.getRedisClient();
    if (redisClient) {
      try {
        const sessionKey = `session:${req.companySlug}:${user.user_id}`;
        const sessionData = await redisClient.get(sessionKey);
        
        if (sessionData) {
          const session = JSON.parse(sessionData);
          req.user.lastActivity = session.lastActivity;
          
          // Update last activity
          session.lastActivity = new Date().toISOString();
          await redisClient.setEx(sessionKey, req.company.sessionTimeout * 60, JSON.stringify(session));
        }
      } catch (redisError) {
        console.warn('Redis session error:', redisError.message);
      }
    }
    
    next();
  } catch (error) {
    console.error('Multi-tenant auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Error de autenticación'
    });
  }
};

/**
 * Role-based access control for multi-tenant
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }
    
    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }
    
    next();
  };
};

/**
 * Company admin or super admin check
 */
const requireCompanyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Usuario no autenticado'
    });
  }
  
  const allowedRoles = ['admin', 'super_admin', 'company_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Se requieren permisos de administrador'
    });
  }
  
  next();
};

/**
 * Login for multi-tenant system
 */
const multiTenantLogin = async (req, res) => {
  try {
    const { identifier, password, companySlug } = req.body;
    
    if (!identifier || !password || !companySlug) {
      return res.status(400).json({
        success: false,
        error: 'Email/ID, contraseña y empresa son requeridos'
      });
    }
    
    // Get company
    const company = await multiTenantDB.getCompanyBySlug(companySlug);
    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada o desactivada'
      });
    }
    
    // Get company connection
    const companyConnection = await multiTenantDB.getCompanyConnection(companySlug);
    const models = await multiTenantDB.setupCompanyModels(companyConnection);
    
    // Find user
    const user = await models.User.findOne({
      where: {
        [models.User.sequelize.Sequelize.Op.or]: [
          { email: identifier },
          { employeeId: identifier }
        ],
        isActive: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    // Verify password (in production, use proper hashing)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    // Generate JWT token
    const tokenPayload = {
      userId: user.user_id,
      companySlug: companySlug,
      role: user.role
    };
    
    const token = jwt.sign(
      tokenPayload, 
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: `${company.sessionTimeout}m` }
    );
    
    // Store session in Redis if available
    const redisClient = multiTenantDB.getRedisClient();
    if (redisClient) {
      try {
        const sessionKey = `session:${companySlug}:${user.user_id}`;
        const sessionData = {
          userId: user.user_id,
          companySlug: companySlug,
          loginTime: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          userAgent: req.headers['user-agent'] || '',
          ip: req.ip
        };
        
        await redisClient.setEx(sessionKey, company.sessionTimeout * 60, JSON.stringify(sessionData));
      } catch (redisError) {
        console.warn('Redis session storage error:', redisError.message);
      }
    }
    
    // Set HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: company.sessionTimeout * 60 * 1000,
      sameSite: 'strict'
    });
    
    res.json({
      success: true,
      message: 'Login exitoso',
      token: token,
      user: {
        id: user.user_id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        companySlug: companySlug,
        companyName: company.name
      },
      company: {
        name: company.name,
        slug: company.slug,
        displayName: company.displayName,
        logo: company.logo,
        primaryColor: company.primaryColor,
        features: company.features
      }
    });
    
  } catch (error) {
    console.error('Multi-tenant login error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  multiTenant,
  multiTenantAuth,
  requireRole,
  requireCompanyAdmin,
  multiTenantLogin,
  extractCompanySlug
};