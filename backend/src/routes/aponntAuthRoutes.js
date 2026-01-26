/**
 * =====================================================================
 * RUTAS: Autenticación de Personal Aponnt (Staff + Partners)
 * =====================================================================
 *
 * Endpoints:
 * - POST /api/v1/auth/aponnt/staff/login - Login de staff (admin, supervisor, vendor, etc.)
 * - POST /api/v1/auth/aponnt/partner/login - Login de partners (médicos, abogados, etc.)
 * - POST /api/v1/auth/aponnt/staff/change-password - Cambio de contraseña staff
 * - POST /api/v1/auth/aponnt/partner/change-password - Cambio de contraseña partner
 * - GET  /api/v1/auth/aponnt/staff/me - Obtener datos del staff autenticado
 * - GET  /api/v1/auth/aponnt/partner/me - Obtener datos del partner autenticado
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { AponntStaff, AponntStaffCompany, Partner, Company, sequelize } = require('../config/database');
const { Op } = require('sequelize');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Demasiados intentos. Intente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔐 SEGURIDAD: JWT_SECRET debe venir de .env
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * =====================================================================
 * STAFF LOGIN
 * =====================================================================
 */
router.post('/staff/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 [STAFF-LOGIN] Intento de login:', { username });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    // Buscar staff por username o email
    const staff = await AponntStaff.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username }
        ],
        is_active: true
      }
    });

    if (!staff) {
      console.log('❌ [STAFF-LOGIN] Usuario no encontrado:', username);
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, staff.password);

    if (!isMatch) {
      console.log('❌ [STAFF-LOGIN] Contraseña incorrecta para:', username);
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Obtener empresas asignadas (si es vendor, leader, etc.)
    let assignedCompanies = [];
    if (['vendor', 'soporte', 'leader'].includes(staff.role)) {
      const assignments = await AponntStaffCompany.findAll({
        where: {
          staff_id: staff.id,
          is_active: true
        },
        include: [{
          model: Company,
          as: 'company',
          attributes: ['company_id', 'name', 'slug']
        }]
      });

      assignedCompanies = assignments.map(a => ({
        company_id: a.company.company_id,
        name: a.company.name,
        slug: a.company.slug,
        assigned_at: a.assigned_at
      }));
    }

    // Generar token
    const tokenPayload = {
      id: staff.id,
      type: 'aponnt_staff', // CRITICAL: Identificar tipo de usuario
      role: staff.role,
      username: staff.username,
      email: staff.email
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

    // Actualizar last_login
    await staff.update({
      last_login_at: new Date(),
      first_login: false
    });

    console.log('✅ [STAFF-LOGIN] Login exitoso:', {
      id: staff.id,
      username: staff.username,
      role: staff.role
    });

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      refreshToken,
      staff: {
        id: staff.id,
        first_name: staff.first_name,
        last_name: staff.last_name,
        dni: staff.dni,
        email: staff.email,
        username: staff.username,
        role: staff.role,
        biometric_enabled: staff.biometric_enabled,
        first_login: staff.first_login
      },
      assigned_companies: assignedCompanies,
      permissions: {
        can_view_all_companies: ['admin', 'supervisor'].includes(staff.role),
        can_manage_staff: ['admin', 'supervisor', 'leader'].includes(staff.role),
        can_approve_partners: ['admin', 'supervisor'].includes(staff.role)
      }
    });

  } catch (error) {
    console.error('❌ [STAFF-LOGIN] Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * =====================================================================
 * PARTNER LOGIN
 * =====================================================================
 */
router.post('/partner/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🤝 [PARTNER-LOGIN] Intento de login:', { username });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    // =============================================================================
    // LOGIN NORMAL (partner registrado en base de datos)
    // =============================================================================

    // Buscar partner por username (DNI) o email
    const partner = await Partner.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username },
          { dni: username }
        ],
        is_active: true,
        approval_status: 'approved' // CRITICAL: Solo partners aprobados
      }
    });

    if (!partner) {
      console.log('❌ [PARTNER-LOGIN] Partner no encontrado o no aprobado:', username);
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas o cuenta no aprobada'
      });
    }

    // Verificar si tiene contraseña configurada
    if (!partner.password) {
      console.log('⚠️ [PARTNER-LOGIN] Partner sin contraseña configurada:', username);
      return res.status(401).json({
        success: false,
        error: 'Cuenta pendiente de activación. Contacte al administrador.'
      });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, partner.password);

    if (!isMatch) {
      console.log('❌ [PARTNER-LOGIN] Contraseña incorrecta para:', username);
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Generar token
    const tokenPayload = {
      id: partner.id,
      type: 'partner', // CRITICAL: Identificar tipo de usuario
      username: partner.username,
      email: partner.email,
      partner_role_id: partner.partner_role_id
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

    // Actualizar last_login
    await partner.update({
      last_login_at: new Date(),
      first_login: false
    });

    console.log('✅ [PARTNER-LOGIN] Login exitoso:', {
      id: partner.id,
      username: partner.username,
      email: partner.email
    });

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      refreshToken,
      partner: {
        id: partner.id,
        first_name: partner.first_name,
        last_name: partner.last_name,
        dni: partner.dni,
        email: partner.email,
        username: partner.username,
        phone: partner.phone,
        biometric_enabled: partner.biometric_enabled,
        first_login: partner.first_login
      }
    });

  } catch (error) {
    console.error('❌ [PARTNER-LOGIN] Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * =====================================================================
 * STAFF CHANGE PASSWORD
 * =====================================================================
 */
router.post('/staff/change-password', async (req, res) => {
  try {
    const { username, current_password, new_password } = req.body;

    if (!username || !current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    const staff = await AponntStaff.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username }
        ],
        is_active: true
      }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(current_password, staff.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    // Hash de nueva contraseña
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Actualizar contraseña
    await staff.update({
      password: hashedPassword,
      password_changed_at: new Date(),
      first_login: false
    });

    console.log('✅ [STAFF] Contraseña cambiada exitosamente:', staff.username);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ [STAFF] Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * =====================================================================
 * PARTNER CHANGE PASSWORD
 * =====================================================================
 */
router.post('/partner/change-password', async (req, res) => {
  try {
    const { username, current_password, new_password } = req.body;

    if (!username || !current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    const partner = await Partner.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username },
          { dni: username }
        ],
        is_active: true
      }
    });

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(current_password, partner.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    // Hash de nueva contraseña
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Actualizar contraseña
    await partner.update({
      password: hashedPassword,
      password_changed_at: new Date(),
      first_login: false
    });

    console.log('✅ [PARTNER] Contraseña cambiada exitosamente:', partner.username);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ [PARTNER] Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * =====================================================================
 * GET STAFF INFO (requiere token)
 * =====================================================================
 */
router.get('/staff/me', async (req, res) => {
  try {
    // Obtener token del header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'aponnt_staff') {
      return res.status(403).json({
        success: false,
        error: 'Token inválido para este tipo de usuario'
      });
    }

    const staff = await AponntStaff.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!staff || !staff.is_active) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado o inactivo'
      });
    }

    res.json({
      success: true,
      staff
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
    }

    console.error('❌ [STAFF] Error obteniendo info:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * =====================================================================
 * GET PARTNER INFO (requiere token)
 * =====================================================================
 */
router.get('/partner/me', async (req, res) => {
  try {
    // Obtener token del header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token no proporcionado'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'partner') {
      return res.status(403).json({
        success: false,
        error: 'Token inválido para este tipo de usuario'
      });
    }

    const partner = await Partner.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!partner || !partner.is_active) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado o inactivo'
      });
    }

    res.json({
      success: true,
      partner
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
    }

    console.error('❌ [PARTNER] Error obteniendo info:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;
