const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, BiometricData, sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { auth } = require('../middleware/auth');
/**
 * @route GET /api/v1/auth/companies
 * @desc Obtener lista de empresas activas
 */
router.get('/companies', async (req, res) => {
  try {
    const [companies] = await sequelize.query(`
      SELECT company_id, name, slug, legal_name
      FROM companies
      WHERE is_active = true
      ORDER BY name
    `);
    
    res.json({
      success: true,
      companies
    });
  } catch (error) {
    console.error('Error obteniendo empresas:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/v1/auth/login
 * @desc Login de usuario con email/legajo y contraseña
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, companyId } = req.body;
    console.log('🔐 [DEBUG] Login attempt:', { identifier, companyId });

    if (!identifier || !password || !companyId) {
      return res.status(400).json({
        error: 'Usuario, contraseña y empresa son requeridos'
      });
    }

    // Buscar usuario por email o usuario
    const user = await sequelize.query(
      'SELECT * FROM users WHERE (email = ? OR usuario = ?) AND is_active = true AND company_id = ?',
      {
        replacements: [identifier, identifier, companyId],
        type: sequelize.QueryTypes.SELECT,
        plain: true
      }
    );

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Verificación de cuenta bloqueada removida por simplicidad

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }

    // Login exitoso - (lastLogin field removed for compatibility)

    // Generar tokens
    const tokenPayload = {
      id: user.user_id,
      role: user.role,
      employeeId: user.employeeId
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
    });

    res.json({
      message: 'Login exitoso',
      token,
      refreshToken,
      user: {
        id: user.user_id,
        employeeId: user.employeeId,
        employeeid: user.employeeId, // backward compatibility
        firstName: user.firstName,
        lastName: user.lastName,
        firstname: user.firstName, // backward compatibility
        lastname: user.lastName, // backward compatibility
        email: user.email,
        role: user.role,
        username: user.usuario
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/auth/biometric-login
 * @desc Login biométrico
 */
router.post('/biometric-login', async (req, res) => {
  try {
    const { template, type, userId } = req.body;

    if (!template || !type) {
      return res.status(400).json({
        error: 'Template biométrico y tipo son requeridos'
      });
    }

    // Si se proporciona userId, verificar directamente
    let user;
    if (userId) {
      user = await User.findByPk(userId, {
        where: { isactive: true }
      });
      
      if (!user) {
        return res.status(401).json({
          error: 'Usuario no encontrado'
        });
      }
    }

    // Buscar template biométrico
    const biometricData = await BiometricData.findOne({
      where: {
        template: template,
        type: type,
        isactive: true,
        ...(userId && { UserId: userId })
      },
      include: [{
        model: User,
        where: { isactive: true }
      }]
    });

    if (!biometricData) {
      return res.status(401).json({
        error: 'Datos biométricos no válidos'
      });
    }

    user = biometricData.User;

    // Actualizar último uso
    biometricData.lastUsed = new Date();
    biometricData.usageCount += 1;
    await biometricData.save();

    // Actualizar login del usuario
    user.lastLogin = new Date();
    await user.save();

    // Generar tokens
    const tokenPayload = {
      id: user.user_id,
      role: user.role,
      employeeId: user.employeeId
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    res.json({
      message: 'Login biométrico exitoso',
      token,
      user: {
        id: user.user_id,
        employeeId: user.employeeId,
        employeeid: user.employeeId, // backward compatibility
        firstName: user.firstName,
        lastName: user.lastName,
        firstname: user.firstName, // backward compatibility
        lastname: user.lastName, // backward compatibility
        email: user.email,
        role: user.role,
        username: user.usuario
      }
    });

  } catch (error) {
    console.error('Error en login biométrico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refrescar token de autenticación
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token requerido'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id, {
      where: { isactive: true }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Usuario no válido'
      });
    }

    const tokenPayload = {
      id: user.user_id,
      role: user.role,
      employeeId: user.employeeId
    };

    const newToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    res.json({
      token: newToken
    });

  } catch (error) {
    console.error('Error refrescando token:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
});

/**
 * @route POST /api/v1/auth/logout
 * @desc Cerrar sesión
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // En un sistema más avanzado, aquí se invalidaría el token
    // Por ahora solo enviamos confirmación
    
    res.json({
      message: 'Sesión cerrada exitosamente'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/auth/me
 * @desc Obtener información del usuario autenticado
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json(user);

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/auth/change-password
 * @desc Cambiar contraseña del usuario autenticado (para APK)
 */
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener usuario con contraseña
    const user = await User.findByPk(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        error: 'Contraseña actual incorrecta'
      });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Actualizar contraseña
    await user.update({
      password: hashedPassword
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route GET /api/v1/auth/companies/:companyId/users
 * @desc Obtener usuarios activos de una empresa específica
 */
router.get('/companies/:companyId/users', async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'ID de empresa requerido'
      });
    }

    const [users] = await sequelize.query(`
      SELECT user_id, usuario, "firstName", "lastName", email, role
      FROM users
      WHERE company_id = ? AND is_active = true
      ORDER BY "firstName", "lastName"
    `, {
      replacements: [parseInt(companyId)]
    });

    res.json({
      success: true,
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Error obteniendo usuarios de empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;