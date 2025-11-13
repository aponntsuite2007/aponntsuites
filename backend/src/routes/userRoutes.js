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
const { User, Branch, BiometricData, sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { auth, adminOnly, supervisorOrAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const EmailVerificationService = require('../services/EmailVerificationService');
const ConsentService = require('../services/ConsentService');

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
    const companyId = req.user?.company_id || company_id || 1;
    where.company_id = companyId;

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

    // Format user for frontend
    const formattedUser = formatUserForFrontend(user);

    // DEBUG: Log formatted values before sending
    console.log('🔍 [GET /:id] FORMATTED user:');
    console.log('   formattedUser.isActive:', formattedUser.isActive);
    console.log('   formattedUser.gpsEnabled:', formattedUser.gpsEnabled);
    console.log('   formattedUser.allowOutsideRadius:', formattedUser.allowOutsideRadius);
    console.log('   formattedUser.departmentId:', formattedUser.departmentId);
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

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

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

    await user.update(updateData);

    console.log('🔧 [DEBUG-GPS] Datos guardados en BD:', updateData);

    // Obtener usuario actualizado sin password
    const updatedUser = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

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
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    // Soft delete
    await user.update({ isActive: false });

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

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    await user.update({ profilePhoto: photoUrl });

    res.json({
      message: 'Foto de perfil subida exitosamente',
      photoUrl
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
    const user = await User.findByPk(req.params.id);

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
    const userAfterUpdate = await User.findByPk(req.params.id);
    console.log('🔑 [RESET-PASSWORD] Verificación - Hash después del update:', userAfterUpdate.password.substring(0, 30) + '...');
    console.log('🔑 [RESET-PASSWORD] Verificación - updatedAt:', userAfterUpdate.updatedAt);

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

module.exports = router;