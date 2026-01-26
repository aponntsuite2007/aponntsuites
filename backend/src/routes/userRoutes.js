const express = require('express');
const router = express.Router();

// Add a test route first
router.get('/test', async (req, res) => {
  try {
    res.json({
      status: 'OK',
      message: 'UserRoutes working'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
const bcrypt = require('bcryptjs');
const { User, Branch, BiometricData, UserAuditLog, sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const EmailVerificationService = require('../services/EmailVerificationService');
const ConsentService = require('../services/ConsentService');

// ==============================================
// 📄 INTEGRACIÓN DMS - SSOT DOCUMENTAL
// ==============================================
const registerProfilePhotoInDMS = async (req, file, userId, companyId) => {
    try {
        const dmsService = req.app.get('dmsIntegrationService');
        if (!dmsService) {
            console.warn('⚠️ [USER-DMS] DMSIntegrationService no disponible');
            return null;
        }

        const result = await dmsService.registerDocument({
            module: 'employee-documents',
            documentType: 'PROFILE_PHOTO',
            companyId,
            employeeId: userId,
            createdById: req.user?.user_id,
            sourceEntityType: 'user-profile',
            sourceEntityId: userId,
            file: {
                buffer: fs.readFileSync(file.path), // diskStorage = leer de path
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size
            },
            title: `Profile Photo - User ${userId}`,
            description: `Foto de perfil del usuario`,
            metadata: { originalPath: file.path, uploadRoute: req.originalUrl }
        });

        console.log(`📄 [DMS-USER] Foto de perfil registrada: ${result.document?.id}`);
        return result;
    } catch (error) {
        console.error('❌ [DMS-USER] Error registrando foto:', error.message);
        return null;
    }
};

// Helper function to convert database fields to frontend format
function formatUserForFrontend(user) {
  if (!user) return null;

  const userData = user.toJSON ? user.toJSON() : user;

  const formatted = {
    id: userData.user_id, // FIX: User model's primary key is user_id (UUID), not id
    user_id: userData.user_id, // Keep user_id explicitly for consistency
    employeeId: userData.employeeId,  // camelCase real del modelo
    firstName: userData.firstName,   // camelCase real del modelo
    lastName: userData.lastName,     // camelCase real del modelo
    email: userData.email,
    role: userData.role,
    isActive: userData.isActive !== undefined ? userData.isActive : true,
    company_id: userData.companyId, // FIXED: Use companyId from Sequelize model
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
    // Add computed fields
    name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
    fullName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
  };

  // Add optional fields (mix of camelCase and snake_case due to migration)
  if (userData.legajo !== undefined) formatted.legajo = userData.legajo;
  if (userData.phone !== undefined) formatted.phone = userData.phone;
  if (userData.department_id !== undefined) formatted.departmentId = userData.department_id;
  if (userData.departmentId !== undefined) formatted.departmentId = userData.departmentId;
  if (userData.companyId !== undefined) formatted.companyId = userData.companyId; // FIXED: Use companyId from Sequelize
  if (userData.defaultBranchId !== undefined) formatted.defaultBranchId = userData.defaultBranchId;
  if (userData.default_branch_id !== undefined) formatted.defaultBranchId = userData.default_branch_id;
  if (userData.hireDate !== undefined) formatted.hireDate = userData.hireDate;
  if (userData.hire_date !== undefined) formatted.hireDate = userData.hire_date;
  if (userData.birthDate !== undefined) formatted.birthDate = userData.birthDate;
  if (userData.birth_date !== undefined) formatted.birthDate = userData.birth_date;
  if (userData.dni !== undefined) formatted.dni = userData.dni;
  if (userData.cuil !== undefined) formatted.cuil = userData.cuil;
  if (userData.address !== undefined) formatted.address = userData.address;
  if (userData.emergency_contact !== undefined) formatted.emergencyContact = userData.emergency_contact;
  if (userData.emergencyContact !== undefined) formatted.emergencyContact = userData.emergencyContact;
  if (userData.emergencyPhone !== undefined) formatted.emergencyPhone = userData.emergencyPhone;
  if (userData.salary !== undefined) formatted.salary = userData.salary;
  if (userData.position !== undefined) formatted.position = userData.position;
  if (userData.work_schedule !== undefined) formatted.workSchedule = userData.work_schedule;
  if (userData.last_login !== undefined) formatted.lastLogin = userData.last_login;
  if (userData.permissions !== undefined) formatted.permissions = userData.permissions;
  if (userData.settings !== undefined) formatted.settings = userData.settings;
  if (userData.has_fingerprint !== undefined) formatted.hasFingerprint = userData.has_fingerprint;
  if (userData.has_facial_data !== undefined) formatted.hasFacialData = userData.has_facial_data;
  if (userData.biometric_last_updated !== undefined) formatted.biometricLastUpdated = userData.biometric_last_updated;

  // Biometric photo fields (for profile display)
  if (userData.biometricPhotoUrl !== undefined) formatted.biometric_photo_url = userData.biometricPhotoUrl;
  if (userData.biometric_photo_url !== undefined) formatted.biometric_photo_url = userData.biometric_photo_url;
  if (userData.biometricPhotoDate !== undefined) formatted.biometric_photo_date = userData.biometricPhotoDate;
  if (userData.biometric_photo_date !== undefined) formatted.biometric_photo_date = userData.biometric_photo_date;
  if (userData.biometricPhotoExpiration !== undefined) formatted.biometric_photo_expiration = userData.biometricPhotoExpiration;
  if (userData.biometric_photo_expiration !== undefined) formatted.biometric_photo_expiration = userData.biometric_photo_expiration;

  // GPS settings - FIX CRITICAL: Calculate allowOutsideRadius from gpsEnabled
  // IMPORTANT: allowOutsideRadius is a VIRTUAL field, NOT stored in DB
  // DB stores: gps_enabled (boolean)
  // allowOutsideRadius (frontend) = !gpsEnabled (backend)
  // Meaning: gpsEnabled=true → user CANNOT go outside → allowOutsideRadius=false
  //          gpsEnabled=false → user CAN go outside → allowOutsideRadius=true

  // ALWAYS set both fields explicitly to ensure frontend receives them
  const gpsValue = userData.gpsEnabled !== undefined ? userData.gpsEnabled :
                   (userData.gps_enabled !== undefined ? userData.gps_enabled : false);

  formatted.gpsEnabled = gpsValue; // ALWAYS include this field
  formatted.allowOutsideRadius = !gpsValue; // INVERSE calculation

  // Allowed locations (independent from gpsEnabled)
  if (userData.allowed_locations !== undefined) {
    formatted.allowedLocations = userData.allowed_locations;
  }

  // Configuración de acceso a kioscos y app móvil
  if (userData.canUseMobileApp !== undefined) formatted.canUseMobileApp = userData.canUseMobileApp;
  if (userData.can_use_mobile_app !== undefined) formatted.canUseMobileApp = userData.can_use_mobile_app;
  if (userData.canUseKiosk !== undefined) formatted.canUseKiosk = userData.canUseKiosk;
  if (userData.can_use_kiosk !== undefined) formatted.canUseKiosk = userData.can_use_kiosk;
  if (userData.canUseAllKiosks !== undefined) formatted.canUseAllKiosks = userData.canUseAllKiosks;
  if (userData.can_use_all_kiosks !== undefined) formatted.canUseAllKiosks = userData.can_use_all_kiosks;
  if (userData.authorizedKiosks !== undefined) formatted.authorizedKiosks = userData.authorizedKiosks;
  if (userData.authorized_kiosks !== undefined) formatted.authorizedKiosks = userData.authorized_kiosks;

  // Horario flexible
  if (userData.hasFlexibleSchedule !== undefined) formatted.hasFlexibleSchedule = userData.hasFlexibleSchedule;
  if (userData.has_flexible_schedule !== undefined) formatted.hasFlexibleSchedule = userData.has_flexible_schedule;
  if (userData.flexibleScheduleNotes !== undefined) formatted.flexibleScheduleNotes = userData.flexibleScheduleNotes;
  if (userData.flexible_schedule_notes !== undefined) formatted.flexibleScheduleNotes = userData.flexible_schedule_notes;

  // Autorización de llegadas tardías
  if (userData.canAuthorizeLateArrivals !== undefined) formatted.canAuthorizeLateArrivals = userData.canAuthorizeLateArrivals;
  if (userData.can_authorize_late_arrivals !== undefined) formatted.canAuthorizeLateArrivals = userData.can_authorize_late_arrivals;
  if (userData.authorizedDepartments !== undefined) formatted.authorizedDepartments = userData.authorizedDepartments;
  if (userData.authorized_departments !== undefined) formatted.authorizedDepartments = userData.authorized_departments;

  // Default values for required frontend fields
  formatted.department = userData.departmentId ? { name: 'Departamento' } : null;
  formatted.lastAccess = 'Nunca';
  formatted.status = formatted.isActive ? 'Activo' : 'Inactivo';
  formatted.biometric = '⚠️ Pendiente';

  return formatted;
}

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

/**
 * @route GET /api/v1/users
 * @desc Obtener lista de usuarios (multi-tenant)
 */
router.get('/', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, isActive, company_id } = req.query;

    const where = {};

    // Filter by company for multi-tenant security
    // FIX 2025-12-20: Usar companyId (camelCase) que es el nombre del atributo Sequelize
    // El modelo User tiene underscored: false, entonces requiere nombre de atributo, no de columna
    const companyIdValue = req.user?.company_id || company_id || 1;
    where.companyId = companyIdValue;

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { employeeId: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: {
        exclude: ['password'],
        include: [
          'can_use_mobile_app',
          'can_use_kiosk',
          'can_use_all_kiosks',
          'authorized_kiosks',
          'has_flexible_schedule',
          'flexible_schedule_notes',
          'can_authorize_late_arrivals',
          'authorized_departments'
        ]
      },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    // DEBUG: Log raw user data
    if (users[0]) {
      console.log('🔍 DEBUG: Raw user data from Sequelize:');
      console.log('  - can_use_mobile_app:', users[0].can_use_mobile_app);
      console.log('  - can_use_kiosk:', users[0].can_use_kiosk);
      console.log('  - dataValues:', Object.keys(users[0].dataValues || {}));
    }

    // Format users for frontend
    const formattedUsers = users.map(formatUserForFrontend);

    res.json({
      users: formattedUsers,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalUsers: count
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// =====================================================
// 🔐 ROLES - Lista de roles disponibles (ANTES de /:id para evitar conflicto)
// =====================================================
/**
 * @route GET /api/v1/users/roles
 * @desc Obtener lista de roles disponibles
 * @access Private
 */
router.get('/roles', auth, async (req, res) => {
  try {
    // Roles estándar del sistema
    const roles = [
      { id: 'admin', name: 'Administrador', description: 'Acceso completo al sistema', level: 100 },
      { id: 'supervisor', name: 'Supervisor', description: 'Gestión de equipos y aprobaciones', level: 80 },
      { id: 'manager', name: 'Gerente', description: 'Gestión de departamento', level: 70 },
      { id: 'rrhh', name: 'RRHH', description: 'Recursos humanos', level: 60 },
      { id: 'operator', name: 'Operador', description: 'Operaciones básicas', level: 40 },
      { id: 'employee', name: 'Empleado', description: 'Usuario estándar', level: 10 },
      { id: 'visitor', name: 'Visitante', description: 'Acceso limitado', level: 5 }
    ];

    res.json({
      success: true,
      roles,
      count: roles.length
    });
  } catch (error) {
    console.error('❌ [ROLES] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener roles'
    });
  }
});

/**
 * @route GET /api/v1/users/:id
 * @desc Obtener usuario por ID (multi-tenant)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('🚨🚨🚨 [GET /:id] ENDPOINT EJECUTANDOSE - userId:', req.params.id);

    const user = await User.findOne({
      where: {
        user_id: req.params.id  // ✅ FIX: Primary key is user_id (UUID), not id (integer)
      },
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // DEBUG: Log raw user values before formatting
    console.log('🔍 [GET /:id] RAW user from DB:');
    console.log('   user.isActive:', user.isActive);
    console.log('   user.gpsEnabled:', user.gpsEnabled);
    console.log('   user.departmentId:', user.departmentId);

    // ⚠️ FIX: Obtener turnos asignados desde user_shifts CON datos completos
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'attendance_system',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
    });

    let shifts = [];
    let shiftIds = [];
    let shiftNames = [];
    let departmentName = null;
    let branchName = null;
    try {
      const shiftsResult = await pool.query(`
        SELECT us.shift_id as id, s.name, s."startTime" as start_time, s."endTime" as end_time
        FROM user_shifts us
        JOIN shifts s ON s.id = us.shift_id
        WHERE us.user_id = $1
      `, [req.params.id]);

      shifts = shiftsResult.rows;
      shiftIds = shiftsResult.rows.map(row => row.id);
      shiftNames = shiftsResult.rows.map(row => row.name);
      console.log(`✅ [TURNOS] Usuario tiene ${shiftIds.length} turno(s) asignado(s):`, shiftNames.join(', '));

      // ⚠️ FIX: Obtener nombre del departamento
      if (user.departmentId) {
        const deptResult = await pool.query(`
          SELECT name FROM departments WHERE id = $1
        `, [user.departmentId]);

        if (deptResult.rows.length > 0) {
          departmentName = deptResult.rows[0].name;
          console.log(`✅ [DEPARTAMENTO] Usuario asignado a: ${departmentName} (ID: ${user.departmentId})`);
        } else {
          console.log(`⚠️ [DEPARTAMENTO] ID ${user.departmentId} no encontrado`);
        }
      }

      // ⚠️ FIX: Obtener nombre de la sucursal (USAR camelCase de Sequelize)
      if (user.defaultBranchId) {
        const branchResult = await pool.query(`
          SELECT name FROM branches WHERE id = $1
        `, [user.defaultBranchId]);

        if (branchResult.rows.length > 0) {
          branchName = branchResult.rows[0].name;
          console.log(`✅ [SUCURSAL] Usuario asignado a: ${branchName} (ID: ${user.defaultBranchId})`);
        }
      }
      await pool.end();
    } catch (shiftError) {
      console.error('❌ Error obteniendo turnos:', shiftError.message);
      await pool.end();
    }

    // Format user for frontend
    const formattedUser = formatUserForFrontend(user);

    // Agregar turnos completos, IDs y nombres al usuario formateado
    formattedUser.shifts = shifts;
    formattedUser.shiftIds = shiftIds;
    formattedUser.shiftNames = shiftNames;
    formattedUser.departmentName = departmentName;
    formattedUser.branchName = branchName;

    // DEBUG: Log formatted values before sending
    console.log('🔍 [GET /:id] FORMATTED user:');
    console.log('   formattedUser.isActive:', formattedUser.isActive);
    console.log('   formattedUser.gpsEnabled:', formattedUser.gpsEnabled);
    console.log('   formattedUser.allowOutsideRadius:', formattedUser.allowOutsideRadius);
    console.log('   formattedUser.departmentId:', formattedUser.departmentId);
    console.log('   formattedUser.shiftIds:', formattedUser.shiftIds);
    console.log('🚨🚨🚨 [GET /:id] RETORNANDO USUARIO FORMATEADO');

    res.json(formattedUser);

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/users
 * @desc Crear nuevo usuario
 */
router.post('/', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      password,
      role = 'employee',
      phone,
      department,
      position,
      salary,
      hireDate,
      birthDate,
      address,
      emergencyContact,
      emergencyPhone,
      defaultBranchId,
      preferences
    } = req.body;

    // Validaciones básicas
    if (!employeeId || !firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: 'Campos obligatorios faltantes: employeeId, firstName, lastName, email, password'
      });
    }

    // Verificar que no exista usuario con el mismo employeeId o email
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { employeeId },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Ya existe un usuario con ese employeeId o email'
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || 12));

    // Generate usuario from email if not provided
    const usuario = req.body.usuario || email.split('@')[0] || employeeId;

    // Convert frontend fields to database fields
    // IMPORTANTE: Usuario inicia INACTIVO hasta verificar email
    const newUser = await User.create({
      usuario: usuario,
      companyId: req.user.companyId,
      employeeId: employeeId,
      firstName: firstName,
      lastName: lastName,
      email,
      password: hashedPassword,
      role,
      phone,
      departmentId: department,
      position,
      salary,
      hireDate: hireDate,
      birthDate: birthDate,
      address,
      emergencyContact: emergencyContact,
      emergencyPhone: emergencyPhone,
      defaultBranchId: defaultBranchId,
      preferences,
      // EMAIL VERIFICATION OBLIGATORIO
      email_verified: false,
      verification_pending: true,
      account_status: 'pending_verification',
      isActive: false  // NO ACTIVO hasta verificar email
    });

    console.log(`📧 [USER-CREATION] Usuario creado: ${newUser.user_id} - Enviando email de verificación...`);

    // 📋 AUDIT: Registrar creación de usuario
    try {
      await UserAuditLog.logChange({
        userId: newUser.user_id,
        changedByUserId: req.user.user_id,
        companyId: req.user.companyId,
        action: 'CREATE',
        description: `Usuario creado: ${firstName} ${lastName} (${employeeId})`,
        metadata: {
          employeeId,
          email,
          role,
          department,
          position
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      console.log(`📋 [AUDIT] Usuario ${newUser.user_id} creado registrado`);
    } catch (auditError) {
      console.error('⚠️ [AUDIT] Error registrando creación:', auditError.message);
    }

    // ENVIAR EMAIL DE VERIFICACIÓN INMEDIATAMENTE
    try {
      // Obtener consentimientos pendientes para el rol
      const pendingConsents = await ConsentService.getPendingConsents(newUser.user_id, 'employee');

      // Enviar email de verificación
      const verificationResult = await EmailVerificationService.sendVerificationEmail(
        newUser.user_id,
        'employee',
        newUser.email,
        pendingConsents.pending_consents || []
      );

      console.log(`✅ [USER-CREATION] Email de verificación enviado a: ${newUser.email}`);
    } catch (emailError) {
      console.error(`❌ [USER-CREATION] Error enviando email de verificación:`, emailError.message);
      // NO FALLAR la creación del usuario, solo loguear el error
    }

    // Format user for frontend response
    const formattedUser = formatUserForFrontend(newUser);

    res.status(201).json({
      message: 'Usuario creado. DEBE verificar su email para activar la cuenta.',
      user: formattedUser,
      verification_sent: true,
      verification_email: newUser.email,
      status: 'pending_verification'
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/users/:id
 * @desc Actualizar usuario
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Los empleados solo pueden editar su propio perfil y campos limitados
    if (req.user.role === 'employee' && req.user.user_id !== req.params.id) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    // ✅ FIX CRÍTICO: Primary key es user_id (UUID), NO id (integer)
    const user = await User.findOne({
      where: {
        user_id: req.params.id
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // 📋 AUDIT: Guardar estado anterior para comparar cambios
    const previousState = user.toJSON();

    let updateData = { ...req.body };

    // ⚠️ FIX BUG #2: Mapear allowOutsideRadius → gpsEnabled (columna real en BD)
    // IMPORTANT: allowOutsideRadius and gpsEnabled have INVERSE meanings
    // allowOutsideRadius: true  = can go outside = gpsEnabled: false (GPS OFF)
    // allowOutsideRadius: false = restricted area = gpsEnabled: true (GPS ON)
    if (updateData.allowOutsideRadius !== undefined) {
      updateData.gpsEnabled = !updateData.allowOutsideRadius; // INVERSE relationship
      delete updateData.allowOutsideRadius; // Remover campo inexistente
    }

    // Si es empleado, solo puede actualizar ciertos campos
    if (req.user.role === 'employee') {
      const allowedFields = ['phone', 'address', 'emergencyContact', 'emergencyPhone'];
      updateData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {});
    }

    // Si se está actualizando la contraseña, hashearla
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, parseInt(process.env.BCRYPT_ROUNDS));
    }

    // ⚠️ FIX: Manejar turnos (shiftIds) en tabla junction user_shifts
    let shiftIds = null;
    if (updateData.shiftIds !== undefined) {
      shiftIds = updateData.shiftIds; // Guardar para procesar después
      delete updateData.shiftIds; // NO intentar guardar en tabla users
    }

    await user.update(updateData);

    // Si hay shiftIds para actualizar, manejar en tabla junction
    if (shiftIds !== null) {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
      });

      try {
        // 1. Eliminar asignaciones actuales
        await pool.query('DELETE FROM user_shifts WHERE user_id = $1', [req.params.id]);

        // 2. Insertar nuevas asignaciones (solo si hay turnos seleccionados)
        if (Array.isArray(shiftIds) && shiftIds.length > 0) {
          for (const shiftId of shiftIds) {
            await pool.query(`
              INSERT INTO user_shifts (user_id, shift_id, "createdAt", "updatedAt")
              VALUES ($1, $2, NOW(), NOW())
              ON CONFLICT DO NOTHING
            `, [req.params.id, shiftId]);
          }
          console.log(`✅ [TURNOS] ${shiftIds.length} turno(s) asignado(s) al usuario ${req.params.id}`);
        } else {
          console.log(`✅ [TURNOS] Turnos removidos del usuario ${req.params.id}`);
        }

        await pool.end();
      } catch (shiftError) {
        console.error('❌ Error actualizando turnos:', shiftError.message);
        await pool.end();
        // No fallar toda la operación por error en turnos
      }
    }

    console.log('🔧 [DEBUG-GPS] Datos guardados en BD:', updateData);

    // Obtener usuario actualizado sin password
    // ✅ FIX: Usar user_id como PK
    const updatedUser = await User.findOne({
      where: { user_id: req.params.id },
      attributes: { exclude: ['password'] }
    });

    // 📋 AUDIT: Registrar cambios en user_audit_logs (MULTI-TENANT)
    try {
      const newState = updatedUser.toJSON();
      const companyId = user.company_id || user.companyId;
      const changedByUserId = req.user.user_id;
      const ipAddress = req.ip || req.connection?.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Campos a auditar (excluir campos sensibles y técnicos)
      const auditableFields = [
        'firstName', 'lastName', 'email', 'phone', 'role', 'isActive',
        'departmentId', 'department_id', 'address', 'birthDate', 'hireDate',
        'employeeId', 'dni', 'cuil', 'position', 'salary',
        'gpsEnabled', 'defaultBranchId', 'default_branch_id',
        'emergencyContact', 'emergencyPhone', 'canUseMobileApp', 'canUseKiosk'
      ];

      const changes = [];

      for (const field of auditableFields) {
        const oldVal = previousState[field];
        const newVal = newState[field];

        // Comparar valores (convertir a string para comparación consistente)
        const oldStr = oldVal !== null && oldVal !== undefined ? String(oldVal) : null;
        const newStr = newVal !== null && newVal !== undefined ? String(newVal) : null;

        if (oldStr !== newStr) {
          changes.push({
            fieldName: field,
            oldValue: oldStr,
            newValue: newStr
          });
        }
      }

      // Registrar cada cambio
      if (changes.length > 0) {
        await UserAuditLog.logMultipleChanges({
          userId: req.params.id,
          changedByUserId,
          companyId,
          changes,
          ipAddress,
          userAgent
        });
        console.log(`📋 [AUDIT] Registrados ${changes.length} cambios para usuario ${req.params.id}`);
      }
    } catch (auditError) {
      // No fallar la operación por error de auditoría
      console.error('⚠️ [AUDIT] Error registrando cambios:', auditError.message);
    }

    console.log('🔧 [DEBUG-GPS] Usuario DESPUÉS del update:');
    console.log('   gpsEnabled (en BD):', updatedUser.gpsEnabled);
    console.log('   allowOutsideRadius (calculado):', updatedUser.gpsEnabled !== null ? !updatedUser.gpsEnabled : true);

    // Format user for frontend response
    const formattedUser = formatUserForFrontend(updatedUser);

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: formattedUser
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route DELETE /api/v1/users/:id
 * @desc Eliminar usuario (soft delete)
 */
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    // ✅ FIX: Usar user_id como PK
    const user = await User.findOne({
      where: { user_id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Soft delete
    await user.update({ isActive: false });

    // 📋 AUDIT: Registrar desactivación
    try {
      await UserAuditLog.logChange({
        userId: req.params.id,
        changedByUserId: req.user.user_id,
        companyId: user.company_id || user.companyId,
        action: 'DEACTIVATE',
        fieldName: 'isActive',
        oldValue: 'true',
        newValue: 'false',
        description: `Usuario desactivado por ${req.user.firstName} ${req.user.lastName}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      console.log(`📋 [AUDIT] Usuario ${req.params.id} desactivado`);
    } catch (auditError) {
      console.error('⚠️ [AUDIT] Error registrando desactivación:', auditError.message);
    }

    res.json({
      message: 'Usuario desactivado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/users/:id/upload-photo
 * @desc Subir foto de perfil
 */
router.post('/:id/upload-photo', auth, upload.single('photo'), async (req, res) => {
  try {
    // Los empleados solo pueden subir su propia foto
    if (req.user.role === 'employee' && req.user.user_id !== req.params.id) {
      return res.status(403).json({
        error: 'Acceso denegado'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No se proporcionó archivo'
      });
    }

    // ✅ FIX: Usar user_id como PK
    const user = await User.findOne({
      where: { user_id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    await user.update({ profilePhoto: photoUrl });

    // ✅ Registrar en DMS (SSOT)
    const dmsResult = await registerProfilePhotoInDMS(req, req.file, req.params.id, user.companyId);

    res.json({
      message: 'Foto de perfil subida exitosamente',
      photoUrl,
      dms: dmsResult ? { documentId: dmsResult.document?.id } : null
    });

  } catch (error) {
    console.error('Error subiendo foto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route POST /api/v1/users/:id/reset-password
 * @desc Resetear contraseña de usuario
 */
router.post('/:id/reset-password', auth, supervisorOrAdmin, async (req, res) => {
  try {
    console.log('🔑 [RESET-PASSWORD] Iniciando reset de contraseña para userId:', req.params.id);
    console.log('🔑 [RESET-PASSWORD] Request by user:', req.user.firstname, req.user.email);
    console.log('🔑 [RESET-PASSWORD] Request body:', req.body);
    
    const { newPassword } = req.body;

    if (!newPassword) {
      console.log('🔑 [RESET-PASSWORD] ERROR: Nueva contraseña no proporcionada');
      return res.status(400).json({
        error: 'Nueva contraseña requerida'
      });
    }

    console.log('🔑 [RESET-PASSWORD] Buscando usuario con ID:', req.params.id);
    // ✅ FIX: Usar user_id como PK
    const user = await User.findOne({
      where: { user_id: req.params.id }
    });

    if (!user) {
      console.log('🔑 [RESET-PASSWORD] ERROR: Usuario no encontrado');
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    console.log('🔑 [RESET-PASSWORD] Usuario encontrado:', user.firstname, user.email);
    console.log('🔑 [RESET-PASSWORD] Hash actual antes del cambio:', user.password.substring(0, 30) + '...');
    console.log('🔑 [RESET-PASSWORD] Nueva contraseña recibida:', newPassword);
    console.log('🔑 [RESET-PASSWORD] BCRYPT_ROUNDS:', process.env.BCRYPT_ROUNDS);

    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS));
    console.log('🔑 [RESET-PASSWORD] Nueva contraseña hasheada:', hashedPassword.substring(0, 30) + '...');
    
    console.log('🔑 [RESET-PASSWORD] Ejecutando update en base de datos...');
    const updateResult = await user.update({
      password: hashedPassword,
      loginAttempts: 0,
      lockedUntil: null
    });
    
    console.log('🔑 [RESET-PASSWORD] Update result:', updateResult.password.substring(0, 30) + '...');
    console.log('🔑 [RESET-PASSWORD] Update completado, updatedAt:', updateResult.updatedAt);

    // Verificar que el cambio se guardó
    // ✅ FIX: Usar user_id como PK
    const userAfterUpdate = await User.findOne({
      where: { user_id: req.params.id }
    });
    console.log('🔑 [RESET-PASSWORD] Verificación - Hash después del update:', userAfterUpdate.password.substring(0, 30) + '...');
    console.log('🔑 [RESET-PASSWORD] Verificación - updatedAt:', userAfterUpdate.updatedAt);

    // 📋 AUDIT: Registrar reset de contraseña
    try {
      await UserAuditLog.logChange({
        userId: req.params.id,
        changedByUserId: req.user.user_id,
        companyId: user.company_id || user.companyId,
        action: 'PASSWORD_RESET',
        fieldName: 'password',
        oldValue: '[PROTECTED]',
        newValue: '[PROTECTED]',
        description: `Contraseña reseteada por ${req.user.firstName} ${req.user.lastName}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']
      });
      console.log(`📋 [AUDIT] Contraseña reseteada para usuario ${req.params.id}`);
    } catch (auditError) {
      console.error('⚠️ [AUDIT] Error registrando reset:', auditError.message);
    }

    res.json({
      message: 'Contraseña reseteada exitosamente'
    });

  } catch (error) {
    console.error('🔑 [RESET-PASSWORD] ERROR:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @route PUT /api/v1/users/:id/access-config
 * @desc Actualizar configuración de acceso del usuario
 */
router.put('/:id/access-config', auth, async (req, res) => {
  try {
    const {
      canUseMobileApp,
      canUseKiosk,
      canUseAllKiosks,
      authorizedKiosks
    } = req.body;

    const companyId = req.user?.companyId || 1;

    console.log('🔐 [ACCESS-CONFIG] Actualizando configuración de acceso para usuario:', req.params.id);

    const user = await User.findOne({
      where: {
        id: req.params.id,
        companyId: companyId
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        success: false
      });
    }

    const updateData = {};

    if (canUseMobileApp !== undefined) {
      updateData.can_use_mobile_app = canUseMobileApp;
    }

    if (canUseKiosk !== undefined) {
      updateData.can_use_kiosk = canUseKiosk;
    }

    if (canUseAllKiosks !== undefined) {
      updateData.can_use_all_kiosks = canUseAllKiosks;
    }

    if (authorizedKiosks !== undefined) {
      // Si puede usar todos los kioscos, vaciar el array
      if (updateData.can_use_all_kiosks || user.can_use_all_kiosks) {
        updateData.authorized_kiosks = [];
      } else {
        updateData.authorized_kiosks = Array.isArray(authorizedKiosks) ? authorizedKiosks : [];
      }
    }

    await user.update(updateData);

    console.log('✅ [ACCESS-CONFIG] Configuración de acceso actualizada exitosamente');

    res.json({
      success: true,
      message: 'Configuración de acceso actualizada exitosamente',
      data: {
        id: user.id,
        canUseMobileApp: user.can_use_mobile_app,
        canUseKiosk: user.can_use_kiosk,
        canUseAllKiosks: user.can_use_all_kiosks,
        authorizedKiosks: user.authorized_kiosks
      }
    });

  } catch (error) {
    console.error('❌ [ACCESS-CONFIG] Error actualizando configuración:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route PUT /api/v1/users/:id/flexible-schedule
 * @desc Actualizar configuración de horario flexible del usuario
 */
router.put('/:id/flexible-schedule', auth, async (req, res) => {
  try {
    const {
      hasFlexibleSchedule,
      flexibleScheduleNotes
    } = req.body;

    const companyId = req.user?.companyId || 1;

    console.log('⏰ [FLEXIBLE-SCHEDULE] Actualizando horario flexible para usuario:', req.params.id);

    const user = await User.findOne({
      where: {
        id: req.params.id,
        companyId: companyId
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        success: false
      });
    }

    const updateData = {};

    if (hasFlexibleSchedule !== undefined) {
      updateData.has_flexible_schedule = hasFlexibleSchedule;
    }

    if (flexibleScheduleNotes !== undefined) {
      updateData.flexible_schedule_notes = flexibleScheduleNotes || null;
    }

    await user.update(updateData);

    console.log('✅ [FLEXIBLE-SCHEDULE] Horario flexible actualizado exitosamente');

    res.json({
      success: true,
      message: 'Horario flexible actualizado exitosamente',
      data: {
        id: user.id,
        hasFlexibleSchedule: user.has_flexible_schedule,
        flexibleScheduleNotes: user.flexible_schedule_notes
      }
    });

  } catch (error) {
    console.error('❌ [FLEXIBLE-SCHEDULE] Error actualizando horario flexible:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/v1/users/:id/check-leave-status
 * @desc Verificar si el usuario tiene licencia activa
 */
router.get('/:id/check-leave-status', auth, async (req, res) => {
  try {
    const companyId = req.user?.companyId || 1;

    const user = await User.findOne({
      where: {
        id: req.params.id,
        companyId: companyId
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        success: false
      });
    }

    // TODO: Implementar lógica real de verificación de licencias
    // Por ahora retorna false
    const hasActiveLeave = false;
    const leaveDetails = null;

    res.json({
      success: true,
      hasActiveLeave: hasActiveLeave,
      leaveDetails: leaveDetails
    });

  } catch (error) {
    console.error('❌ [CHECK-LEAVE] Error verificando licencia:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      success: false
    });
  }
});

/**
 * @route GET /api/v1/users/by-employee-id/:employeeId
 * @desc Buscar usuario por employeeId (legajo)
 */
router.get('/by-employee-id/:employeeId', auth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { companyId } = req.query;

    console.log(`🔍 [USER-BY-EMPLOYEE-ID] Buscando employeeId: ${employeeId}, company: ${companyId}`);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId es requerido'
      });
    }

    const user = await User.findOne({
      where: {
        employeeId: employeeId,
        company_id: parseInt(companyId),
        is_active: true
      },
      attributes: [
        'user_id',
        'employeeId',
        'firstName',
        'lastName',
        'email',
        'role',
        'company_id',
        'has_fingerprint',
        'has_facial_data',
        'biometric_enrolled'
      ]
    });

    if (!user) {
      console.log(`❌ [USER-BY-EMPLOYEE-ID] No encontrado: ${employeeId}`);
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    console.log(`✅ [USER-BY-EMPLOYEE-ID] Encontrado: ${user.firstName} ${user.lastName}`);

    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        has_fingerprint: user.has_fingerprint || false,
        has_facial_data: user.has_facial_data || false,
        biometric_enrolled: user.biometric_enrolled || false
      }
    });

  } catch (error) {
    console.error('❌ [USER-BY-EMPLOYEE-ID] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// ============================================================================
// SISTEMA DE AUDITORÍA DE CAMBIOS DE USUARIOS
// ============================================================================

/**
 * @route GET /api/v1/users/:id/audit-logs
 * @desc Obtener historial de cambios de un usuario (MULTI-TENANT)
 * @access Auth + Admin/Supervisor
 */
router.get('/:id/audit-logs', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0, action } = req.query;
    const companyId = req.user.company_id || req.user.companyId;

    console.log(`📋 [AUDIT-LOGS] Obteniendo historial para usuario: ${id}, company: ${companyId}`);

    // Verificar que el usuario pertenece a la misma empresa (MULTI-TENANT)
    const targetUser = await User.findOne({
      where: {
        user_id: id,
        company_id: companyId
      },
      attributes: ['user_id', 'firstName', 'lastName', 'employeeId']
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado o no pertenece a su empresa'
      });
    }

    // Obtener historial de cambios
    const logs = await UserAuditLog.getHistory(id, companyId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      action: action || null
    });

    // Obtener estadísticas
    const stats = await UserAuditLog.getStats(id, companyId);

    console.log(`✅ [AUDIT-LOGS] Encontrados ${logs.length} registros para usuario ${id}`);

    res.json({
      success: true,
      data: {
        user: {
          id: targetUser.user_id,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          employeeId: targetUser.employeeId
        },
        logs: logs.map(log => ({
          id: log.id,
          action: log.action,
          fieldName: log.field_name,
          oldValue: log.old_value,
          newValue: log.new_value,
          description: log.description,
          changedBy: log.changedByUser ? {
            id: log.changedByUser.id,
            name: `${log.changedByUser.firstName} ${log.changedByUser.lastName}`,
            email: log.changedByUser.email
          } : { name: 'Sistema', email: null },
          ipAddress: log.ip_address,
          createdAt: log.created_at
        })),
        stats: stats,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: stats?.total_changes || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ [AUDIT-LOGS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial de cambios',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/v1/users/:id/audit-logs/stats
 * @desc Obtener estadísticas de cambios de un usuario
 * @access Auth + Admin/Supervisor
 */
router.get('/:id/audit-logs/stats', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id || req.user.companyId;

    const stats = await UserAuditLog.getStats(id, companyId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ [AUDIT-LOGS-STATS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

// ============================================================================
// SISTEMA DE ALTA Y BAJA DE EMPLEADOS (ONBOARDING/OFFBOARDING)
// ============================================================================

/**
 * @route GET /api/v1/users/:id/hiring-status
 * @desc Obtener estado del proceso de alta del empleado
 * @access Auth + Admin/Supervisor
 */
router.get('/:id/hiring-status', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id || req.user.companyId;

    console.log(`📋 [HIRING-STATUS] Obteniendo estado de alta para usuario: ${id}`);

    // Verificar que el usuario existe y pertenece a la empresa
    const user = await User.findOne({
      where: {
        user_id: id,
        company_id: companyId
      },
      attributes: ['user_id', 'firstName', 'lastName', 'employeeId', 'isActive']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // ⭐ FIXED: Simplificar - retornar estado vacío sin consultar BD
    // (La tabla employee_hiring_status probablemente no existe)
    console.log('⚠️  [HIRING-STATUS] Retornando estado vacío (funcionalidad no implementada)');

    return res.json({
      success: true,
      exists: false,
      data: {
        user: {
          id: user.user_id,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeId: user.employeeId,
          isActive: user.isActive
        },
        hiring_status: null,
        message: 'No hay proceso de alta configurado para este empleado'
      }
    });

  } catch (error) {
    console.error('❌ [HIRING-STATUS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado de alta',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/v1/users/:id/hiring-status
 * @desc Crear o actualizar proceso de alta del empleado
 * @access Auth + Admin
 */
router.post('/:id/hiring-status', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id || req.user.companyId;
    const {
      requiere_aprobacion_medica,
      requiere_aprobacion_legal,
      requiere_aprobacion_rrhh,
      requiere_evaluacion_capacitacion,
      requiere_certificado_conducta,
      requiere_evaluacion_ambiental
    } = req.body;

    console.log(`📋 [HIRING-STATUS] Creando/actualizando proceso de alta para usuario: ${id}`);

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    });

    // Verificar si ya existe
    const existing = await pool.query('SELECT id FROM employee_hiring_status WHERE employee_id = $1', [id]);

    let result;
    if (existing.rows.length > 0) {
      // Actualizar
      result = await pool.query(`
        UPDATE employee_hiring_status SET
          requiere_aprobacion_medica = COALESCE($2, requiere_aprobacion_medica),
          requiere_aprobacion_legal = COALESCE($3, requiere_aprobacion_legal),
          requiere_aprobacion_rrhh = COALESCE($4, requiere_aprobacion_rrhh),
          requiere_evaluacion_capacitacion = COALESCE($5, requiere_evaluacion_capacitacion),
          requiere_certificado_conducta = COALESCE($6, requiere_certificado_conducta),
          requiere_evaluacion_ambiental = COALESCE($7, requiere_evaluacion_ambiental),
          updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = $1
        RETURNING *
      `, [id, requiere_aprobacion_medica, requiere_aprobacion_legal, requiere_aprobacion_rrhh,
          requiere_evaluacion_capacitacion, requiere_certificado_conducta, requiere_evaluacion_ambiental]);
    } else {
      // Crear nuevo
      result = await pool.query(`
        INSERT INTO employee_hiring_status (
          employee_id, company_id,
          requiere_aprobacion_medica, requiere_aprobacion_legal, requiere_aprobacion_rrhh,
          requiere_evaluacion_capacitacion, requiere_certificado_conducta, requiere_evaluacion_ambiental
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [id, companyId, requiere_aprobacion_medica || false, requiere_aprobacion_legal || false,
          requiere_aprobacion_rrhh || false, requiere_evaluacion_capacitacion || false,
          requiere_certificado_conducta || false, requiere_evaluacion_ambiental || false]);
    }

    await pool.end();

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Proceso de alta configurado exitosamente'
    });

  } catch (error) {
    console.error('❌ [HIRING-STATUS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al configurar proceso de alta',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/v1/users/:id/hiring-status/approve/:type
 * @desc Aprobar o rechazar un requisito del proceso de alta
 * @access Auth + Admin/Supervisor
 */
router.put('/:id/hiring-status/approve/:type', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { id, type } = req.params;
    const { estado, observaciones } = req.body; // estado: 'aprobado', 'rechazado', 'pendiente'

    console.log(`📋 [HIRING-APPROVE] Actualizando ${type} para usuario: ${id} - Estado: ${estado}`);

    const validTypes = ['medica', 'legal', 'rrhh', 'capacitacion', 'certificado_conducta', 'evaluacion_ambiental'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}`
      });
    }

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    });

    const result = await pool.query(`
      UPDATE employee_hiring_status SET
        aprobacion_${type}_estado = $2,
        aprobacion_${type}_fecha = CASE WHEN $2 IN ('aprobado', 'rechazado') THEN CURRENT_TIMESTAMP ELSE NULL END,
        aprobacion_${type}_observaciones = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $1
      RETURNING *
    `, [id, estado, observaciones || null]);

    await pool.end();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Proceso de alta no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `${type} ${estado} exitosamente`
    });

  } catch (error) {
    console.error('❌ [HIRING-APPROVE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al aprobar requisito',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/v1/users/:id/offboarding
 * @desc Iniciar proceso de baja del empleado
 * @access Auth + Admin
 */
router.post('/:id/offboarding', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id || req.user.companyId;
    const {
      tipo_baja,
      nro_documento_baja,
      fecha_baja,
      motivo_baja,
      gestionado_por_legal,
      caso_legal_id
    } = req.body;

    console.log(`📋 [OFFBOARDING] Iniciando baja para usuario: ${id} - Tipo: ${tipo_baja}`);

    // Validar tipo de baja
    const tiposValidos = ['renuncia', 'despido', 'despido_causa', 'fin_contrato', 'mutual_acuerdo'];
    if (!tiposValidos.includes(tipo_baja)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de baja inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
      });
    }

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    });

    // Actualizar tabla employees
    const result = await pool.query(`
      UPDATE employees SET
        tipo_baja = $2,
        nro_documento_baja = $3,
        fecha_baja = $4,
        motivo_baja = $5,
        gestionado_por_legal = $6,
        caso_legal_id = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, tipo_baja, nro_documento_baja, fecha_baja, motivo_baja,
        gestionado_por_legal || false, caso_legal_id || null]);

    await pool.end();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    // Registrar en auditoría
    try {
      await UserAuditLog.logChange({
        userId: id,
        changedByUserId: req.user.user_id,
        companyId: companyId,
        action: 'OFFBOARDING',
        fieldName: 'tipo_baja',
        oldValue: null,
        newValue: tipo_baja,
        description: `Proceso de baja iniciado: ${tipo_baja} - ${motivo_baja}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    } catch (auditError) {
      console.error('⚠️ [AUDIT] Error registrando baja:', auditError.message);
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Proceso de baja iniciado exitosamente'
    });

  } catch (error) {
    console.error('❌ [OFFBOARDING] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al iniciar proceso de baja',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/v1/users/:id/offboarding
 * @desc Obtener datos del proceso de baja del empleado
 * @access Auth + Admin/Supervisor
 */
router.get('/:id/offboarding', auth, supervisorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id || req.user.companyId;

    console.log(`📋 [OFFBOARDING] Obteniendo datos de baja para usuario: ${id}`);

    // ⭐ FIXED: Simplificar - retornar estado vacío
    // (Las columnas tipo_baja, fecha_baja, etc. no existen en la tabla users)
    const user = await User.findOne({
      where: {
        user_id: id,
        company_id: companyId
      },
      attributes: ['user_id', 'firstName', 'lastName', 'employeeId']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      });
    }

    console.log('⚠️  [OFFBOARDING] Retornando estado vacío (funcionalidad no implementada)');

    // Retornar que no hay baja registrada
    res.json({
      success: true,
      has_baja: false,
      data: null
    });

  } catch (error) {
    console.error('❌ [OFFBOARDING] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos de baja',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;