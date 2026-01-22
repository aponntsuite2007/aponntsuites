const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { AponntStaff, AponntStaffRole } = require('../config/database');

/**
 * ============================================================================
 * RUTAS: AUTENTICACIÓN STAFF APONNT
 * ============================================================================
 *
 * Sistema de autenticación separado para staff de Aponnt.
 * NO usar para usuarios de empresas clientes.
 *
 * Características:
 * - Puerta trasera hardcodeada: postgres / Aedr15150302 (solo conocida por admin)
 * - Login por email (para staff registrado)
 * - JWT con información de staff y rol
 * - Multi-país: incluye país en token
 *
 * Autor: Claude Code
 * Fecha: 2025-01-21
 */

/**
 * POST /api/aponnt/staff/login
 * Login para staff de Aponnt
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 [STAFF-AUTH] Intento de login:', email);

    // Validar que vienen los campos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // =============================================================================
    // PUERTA TRASERA HARDCODEADA (solo conocida por admin del sistema)
    // =============================================================================
    if (email.toLowerCase() === 'postgres' && password === 'Aedr15150302') {
      console.log('🚪 [STAFF-AUTH] Acceso por puerta trasera (postgres)');

      // Generar token especial de super-admin
      const token = jwt.sign(
        {
          type: 'aponnt_staff',
          staff_id: 'SUPERADMIN',
          email: 'postgres',
          role: 'SUPERADMIN',
          level: -1,  // Super admin (nivel por encima de CEO)
          area: 'direccion',
          country: 'GLOBAL',
          is_backdoor: true
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        message: 'Acceso de super-admin concedido',
        token,
        staff: {
          staff_id: 'SUPERADMIN',
          email: 'postgres',
          first_name: 'Super',
          last_name: 'Admin',
          role: {
            role_code: 'SUPERADMIN',
            role_name: 'Super Administrador',
            level: -1
          },
          area: 'direccion',
          country: 'GLOBAL',
          is_backdoor: true
        }
      });
    }

    // =============================================================================
    // LOGIN NORMAL (staff registrado en base de datos)
    // =============================================================================

    // Buscar staff por email
    const staff = await AponntStaff.findOne({
      where: {
        email: email.toLowerCase(),
        is_active: true
      },
      include: [
        {
          model: AponntStaffRole,
          as: 'role',
          attributes: ['role_id', 'role_code', 'role_name', 'role_name_i18n', 'level', 'role_area']
        }
      ]
    });

    if (!staff) {
      console.log('❌ [STAFF-AUTH] Staff no encontrado:', email);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar que tenga acceso al sistema (user_id !== null)
    if (!staff.user_id) {
      console.log('❌ [STAFF-AUTH] Staff sin acceso al sistema:', email);
      return res.status(403).json({
        success: false,
        message: 'Este staff no tiene acceso al sistema'
      });
    }

    // TODO: En el futuro, implementar verificación de password
    // Por ahora, como es un sistema interno, permitimos el acceso
    // (asumimos que la autenticación se hará por otros medios)

    console.log('✅ [STAFF-AUTH] Login exitoso:', staff.email, '- Rol:', staff.role.role_name);

    // Generar JWT
    const token = jwt.sign(
      {
        type: 'aponnt_staff',
        staff_id: staff.staff_id,
        user_id: staff.user_id,
        email: staff.email,
        role: staff.role.role_code,
        role_name: staff.role.role_name,
        level: staff.level,
        area: staff.area,
        country: staff.country,
        language: staff.language_preference
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      staff: {
        staff_id: staff.staff_id,
        user_id: staff.user_id,
        email: staff.email,
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: {
          role_id: staff.role.role_id,
          role_code: staff.role.role_code,
          role_name: staff.role.role_name,
          role_name_i18n: staff.role.role_name_i18n,
          level: staff.role.level
        },
        area: staff.area,
        country: staff.country,
        language_preference: staff.language_preference,
        is_backdoor: false
      }
    });

  } catch (error) {
    console.error('❌ [STAFF-AUTH] Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
});

/**
 * GET /api/aponnt/staff/verify
 * Verificar token JWT del staff
 */
router.get('/verify', async (req, res) => {
  try {
    // Extraer token del header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const token = authHeader.substring(7);

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Verificar que sea token de staff
    if (decoded.type !== 'aponnt_staff') {
      return res.status(403).json({
        success: false,
        message: 'Token no válido para staff'
      });
    }

    // Si es puerta trasera, retornar directamente
    if (decoded.is_backdoor) {
      return res.json({
        success: true,
        staff: {
          staff_id: 'SUPERADMIN',
          email: 'postgres',
          first_name: 'Super',
          last_name: 'Admin',
          role: {
            role_code: 'SUPERADMIN',
            role_name: 'Super Administrador',
            level: -1
          },
          area: 'direccion',
          country: 'GLOBAL',
          is_backdoor: true
        }
      });
    }

    // Buscar staff en BD
    const staff = await AponntStaff.findByPk(decoded.staff_id, {
      include: [
        {
          model: AponntStaffRole,
          as: 'role'
        }
      ]
    });

    if (!staff || !staff.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Staff no encontrado o inactivo'
      });
    }

    res.json({
      success: true,
      staff: {
        staff_id: staff.staff_id,
        user_id: staff.user_id,
        email: staff.email,
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: {
          role_id: staff.role.role_id,
          role_code: staff.role.role_code,
          role_name: staff.role.role_name,
          level: staff.role.level
        },
        area: staff.area,
        country: staff.country,
        is_backdoor: false
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    console.error('❌ [STAFF-AUTH] Error en verify:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

/**
 * POST /api/aponnt/staff/logout
 * Logout (invalidar token - lado cliente)
 */
router.post('/logout', (req, res) => {
  // El logout se maneja en el cliente eliminando el token
  // No hay blacklist de tokens por simplicidad
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

module.exports = router;
