/**
 * Rutas para sistema de vacaciones y licencias
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
  VacationConfiguration,
  VacationScale,
  ExtraordinaryLicense,
  VacationRequest,
  TaskCompatibility,
  User,
  Department
} = require('../config/database');

// Importar servicio de notificaciones enterprise
const NotificationWorkflowService = require('../services/NotificationWorkflowService');

// Importar sistema modular Plug & Play
const { useModuleIfAvailable } = require('../utils/moduleHelper');

// ======== CONFIGURACIÓN DE VACACIONES ========

// Obtener configuración actual de vacaciones
router.get('/config', async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.query.company_id || 1;

    const config = await VacationConfiguration.findOne({
      where: { isActive: true, company_id: companyId }
    });

    const scales = await VacationScale.findAll({
      where: { isActive: true, company_id: companyId },
      order: [['priority', 'ASC'], ['yearsFrom', 'ASC']]
    });

    const extraordinaryLicenses = await ExtraordinaryLicense.findAll({
      where: { isActive: true, company_id: companyId },
      order: [['type', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        configuration: config || {
          vacationInterruptible: true,
          minContinuousDays: 7,
          maxFractions: 3,
          autoSchedulingEnabled: true,
          minAdvanceNoticeDays: 15,
          maxSimultaneousPercentage: 30
        },
        vacationScales: scales,
        extraordinaryLicenses: extraordinaryLicenses
      },
      message: 'Configuración de vacaciones obtenida exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo configuración de vacaciones',
      error: error.message
    });
  }
});

// Guardar configuración de vacaciones
router.post('/config', async (req, res) => {
  try {
    const {
      vacationInterruptible,
      minContinuousDays,
      maxFractions,
      autoSchedulingEnabled,
      minAdvanceNoticeDays,
      maxSimultaneousPercentage
    } = req.body;

    // Desactivar configuración anterior
    await VacationConfiguration.update(
      { isActive: false },
      { where: { isActive: true } }
    );

    // Crear nueva configuración
    const newConfig = await VacationConfiguration.create({
      vacationInterruptible,
      minContinuousDays,
      maxFractions,
      autoSchedulingEnabled,
      minAdvanceNoticeDays,
      maxSimultaneousPercentage,
      isActive: true
    });

    res.json({
      success: true,
      data: newConfig,
      message: 'Configuración de vacaciones guardada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error guardando configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error guardando configuración de vacaciones',
      error: error.message
    });
  }
});

// ======== ESCALAS DE VACACIONES ========

// Crear nueva escala de vacaciones
router.post('/scales', async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.body.company_id || 1;
    const { yearsFrom, yearsTo, rangeDescription, vacationDays, priority } = req.body;

    if (!yearsFrom || !vacationDays || !rangeDescription) {
      return res.status(400).json({
        success: false,
        message: 'yearsFrom, vacationDays y rangeDescription son requeridos'
      });
    }

    const newScale = await VacationScale.create({
      company_id: companyId,
      yearsFrom,
      yearsTo,
      rangeDescription,
      vacationDays,
      priority: priority || 0,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: newScale,
      message: 'Escala de vacaciones creada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando escala:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando escala de vacaciones',
      error: error.message
    });
  }
});

// Actualizar escala de vacaciones
router.put('/scales/:id', async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.body.company_id || 1;
    const scale = await VacationScale.findOne({
      where: { id: req.params.id, company_id: companyId, isActive: true }
    });

    if (!scale) {
      return res.status(404).json({
        success: false,
        message: 'Escala de vacaciones no encontrada'
      });
    }

    await scale.update(req.body);

    res.json({
      success: true,
      data: scale,
      message: 'Escala de vacaciones actualizada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando escala:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando escala de vacaciones',
      error: error.message
    });
  }
});

// ======== LICENCIAS EXTRAORDINARIAS ========

// Crear nueva licencia extraordinaria
router.post('/extraordinary-licenses', async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.body.company_id || 1;
    const {
      type,
      description,
      days,
      dayType,
      requiresApproval,
      requiresDocumentation,
      maxPerYear,
      advanceNoticeDays,
      legalBasis
    } = req.body;

    if (!type || !days) {
      return res.status(400).json({
        success: false,
        message: 'Tipo y días son requeridos'
      });
    }

    const newLicense = await ExtraordinaryLicense.create({
      company_id: companyId,
      type,
      description,
      days,
      dayType: dayType || 'habil',
      requiresApproval: requiresApproval !== undefined ? requiresApproval : true,
      requiresDocumentation: requiresDocumentation || false,
      maxPerYear,
      advanceNoticeDays: advanceNoticeDays || 0,
      legalBasis,
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: newLicense,
      message: 'Licencia extraordinaria creada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando licencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando licencia extraordinaria',
      error: error.message
    });
  }
});

// Actualizar licencia extraordinaria
router.put('/extraordinary-licenses/:id', async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.body.company_id || 1;
    const license = await ExtraordinaryLicense.findOne({
      where: { id: req.params.id, company_id: companyId }
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licencia extraordinaria no encontrada'
      });
    }

    await license.update(req.body);

    res.json({
      success: true,
      data: license,
      message: 'Licencia extraordinaria actualizada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando licencia:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando licencia extraordinaria',
      error: error.message
    });
  }
});

// ======== SOLICITUDES DE VACACIONES ========

// Obtener solicitudes de vacaciones - Optimizado para móvil
router.get('/requests', async (req, res) => {
  try {
    const { userId, status, year, month, limit, offset, source } = req.query;
    const companyId = req.user?.company_id || req.query.company_id || 1;

    let whereClause = { company_id: companyId };

    if (userId) {
      whereClause.userId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31`);
      whereClause.startDate = {
        [Op.between]: [startOfYear, endOfYear]
      };
    }

    if (month && year) {
      const startOfMonth = new Date(`${year}-${month}-01`);
      const endOfMonth = new Date(year, month, 0); // último día del mes
      whereClause.startDate = {
        [Op.between]: [startOfMonth, endOfMonth]
      };
    }

    // Filtrar por fuente (mobile-apk, panel-empresa, etc.)
    if (source) {
      whereClause.source = source;
    }

    // Configuración de paginación para móvil
    const paginationOptions = {};
    if (limit) {
      paginationOptions.limit = parseInt(limit);
    }
    if (offset) {
      paginationOptions.offset = parseInt(offset);
    }

    const requests = await VacationRequest.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['user_id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: ExtraordinaryLicense,
          as: 'licenseType',
          required: false
        }
      ],
      order: [['startDate', 'DESC']],
      ...paginationOptions
    });

    res.json({
      success: true,
      data: requests,
      message: 'Solicitudes de vacaciones obtenidas exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo solicitudes:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo solicitudes de vacaciones',
      error: error.message
    });
  }
});

// Crear nueva solicitud de vacaciones
router.post('/requests', async (req, res) => {
  try {
    const {
      userId,
      requestType,
      extraordinaryLicenseId,
      startDate,
      endDate,
      reason
    } = req.body;

    if (!userId || !requestType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'userId, requestType, startDate y endDate son requeridos'
      });
    }

    // Calcular días totales
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Verificar conflictos con otras solicitudes
    const conflicts = await VacationRequest.findAll({
      where: {
        userId,
        status: ['pending', 'approved', 'active'],
        [Op.or]: [
          {
            startDate: { [Op.between]: [startDate, endDate] }
          },
          {
            endDate: { [Op.between]: [startDate, endDate] }
          },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } }
            ]
          }
        ]
      }
    });

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una solicitud de vacaciones en este período',
        conflicts
      });
    }

    const newRequest = await VacationRequest.create({
      userId,
      requestType,
      extraordinaryLicenseId,
      startDate,
      endDate,
      totalDays,
      reason,
      status: 'pending',
      company_id: req.user?.company_id || req.body.company_id || 1
    });

    // 🔔 GENERAR NOTIFICACIÓN AUTOMÁTICA
    await sendVacationRequestNotification(newRequest);

    res.status(201).json({
      success: true,
      data: newRequest,
      message: 'Solicitud de vacaciones creada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando solicitud de vacaciones',
      error: error.message
    });
  }
});

// Aprobar/Rechazar solicitud
router.put('/requests/:id/approval', async (req, res) => {
  try {
    const { status, approvalComments, approvedBy } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado debe ser "approved" o "rejected"'
      });
    }

    const request = await VacationRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden aprobar/rechazar solicitudes pendientes'
      });
    }

    await request.update({
      status,
      approvedBy,
      approvalDate: new Date(),
      approvalComments
    });

    // 🔔 GENERAR NOTIFICACIÓN DE RESPUESTA AL EMPLEADO
    await sendVacationResponseNotification(request, approvedBy, status);

    res.json({
      success: true,
      data: request,
      message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`
    });
  } catch (error) {
    console.error('❌ Error procesando aprobación:', error);
    res.status(500).json({
      success: false,
      message: 'Error procesando aprobación',
      error: error.message
    });
  }
});

// ======== ALGORITMO DE PROGRAMACIÓN AUTOMÁTICA ========

// Generar cronograma automático
router.post('/generate-schedule', async (req, res) => {
  try {
    const { year } = req.body;
    const companyId = req.user?.company_id || req.body.company_id || 1;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Año es requerido'
      });
    }

    // Obtener todos los usuarios activos de la empresa
    const users = await User.findAll({
      where: { isActive: true, company_id: companyId },
      attributes: ['user_id', 'firstName', 'lastName', 'email', 'createdAt', 'departmentId']
    });

    // Obtener escalas de vacaciones
    const scales = await VacationScale.findAll({
      where: { isActive: true, company_id: companyId },
      order: [['yearsFrom', 'ASC']]
    });

    // Obtener configuración
    const config = await VacationConfiguration.findOne({
      where: { isActive: true, company_id: companyId }
    });

    // Algoritmo de programación automática
    const schedule = [];
    const currentYear = new Date().getFullYear();
    
    for (const user of users) {
      // Calcular antigüedad
      const startDate = new Date(user.createdAt);
      const yearsOfService = (new Date(`${year}-01-01`) - startDate) / (365.25 * 24 * 60 * 60 * 1000);
      
      // Encontrar escala aplicable
      let vacationDays = 14; // Por defecto
      for (const scale of scales) {
        if (yearsOfService >= scale.yearsFrom && (!scale.yearsTo || yearsOfService <= scale.yearsTo)) {
          vacationDays = scale.vacationDays;
          break;
        }
      }
      
      // Generar períodos sugeridos (lógica simplificada)
      const suggestedPeriods = generateOptimalPeriods(user.user_id, vacationDays, year, config);
      
      schedule.push({
        userId: user.user_id,
        userName: user.name,
        vacationDays,
        yearsOfService: Math.round(yearsOfService * 100) / 100,
        suggestedPeriods,
        compatibilityScore: Math.random() * 30 + 70 // Score simulado
      });
    }

    res.json({
      success: true,
      data: {
        year,
        totalEmployees: users.length,
        schedule: schedule.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      },
      message: 'Cronograma automático generado exitosamente'
    });
  } catch (error) {
    console.error('❌ Error generando cronograma:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando cronograma automático',
      error: error.message
    });
  }
});

// Función auxiliar para generar períodos óptimos
function generateOptimalPeriods(userId, totalDays, year, config) {
  const periods = [];
  let remainingDays = totalDays;
  const minDays = config?.minContinuousDays || 7;
  const maxFractions = config?.maxFractions || 3;
  
  // Generar períodos respetando configuración
  let fractionCount = 0;
  while (remainingDays > 0 && fractionCount < maxFractions) {
    const daysForThisPeriod = Math.min(
      remainingDays,
      Math.max(minDays, Math.ceil(remainingDays / (maxFractions - fractionCount)))
    );
    
    // Generar fecha aleatoria (simplificado)
    const monthStart = Math.floor(Math.random() * 10) + 1; // Evitar diciembre
    const dayStart = Math.floor(Math.random() * 20) + 1;
    const startDate = new Date(year, monthStart - 1, dayStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysForThisPeriod - 1);
    
    periods.push({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days: daysForThisPeriod,
      type: 'vacation'
    });
    
    remainingDays -= daysForThisPeriod;
    fractionCount++;
  }
  
  return periods;
}

// ======== MATRIZ DE COMPATIBILIDAD ========

// Obtener matriz de compatibilidad
router.get('/compatibility-matrix', async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.query.company_id || 1;

    const matrix = await TaskCompatibility.findAll({
      where: { isActive: true, company_id: companyId },
      include: [
        {
          model: User,
          as: 'primaryUser',
          attributes: ['user_id', 'firstName', 'lastName', 'email'],
          where: { company_id: companyId }
        },
        {
          model: User,
          as: 'coverUser',
          attributes: ['user_id', 'firstName', 'lastName', 'email'],
          where: { company_id: companyId }
        }
      ],
      order: [['compatibilityScore', 'DESC']]
    });

    res.json({
      success: true,
      data: matrix,
      message: 'Matriz de compatibilidad obtenida exitosamente'
    });
  } catch (error) {
    console.error('❌ Error obteniendo matriz:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo matriz de compatibilidad',
      error: error.message
    });
  }
});

// Crear regla de compatibilidad
router.post('/compatibility-matrix', async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.body.company_id || 1;
    const { primaryUserId, coverUserId, compatibilityScore, coverableTasks, maxCoverageHours, maxConcurrentTasks, manualNotes } = req.body;

    // Validaciones
    if (!primaryUserId || !coverUserId) {
      return res.status(400).json({
        success: false,
        message: 'primaryUserId y coverUserId son requeridos'
      });
    }

    if (primaryUserId === coverUserId) {
      return res.status(400).json({
        success: false,
        message: 'Un empleado no puede cubrirse a sí mismo'
      });
    }

    // Verificar que ambos usuarios existan y pertenezcan a la empresa
    const [primaryUser, coverUser] = await Promise.all([
      User.findByPk(primaryUserId),
      User.findByPk(coverUserId)
    ]);

    if (!primaryUser || !coverUser) {
      return res.status(404).json({
        success: false,
        message: 'Uno o ambos empleados no fueron encontrados'
      });
    }

    // Verificar que pertenezcan a la misma empresa
    if (primaryUser.company_id !== companyId || coverUser.company_id !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'Los empleados no pertenecen a esta empresa'
      });
    }

    // Verificar que no exista ya esta regla
    const existing = await TaskCompatibility.findOne({
      where: {
        company_id: companyId,
        primaryUserId,
        coverUserId
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una regla de compatibilidad entre estos empleados'
      });
    }

    // Crear regla
    const rule = await TaskCompatibility.create({
      company_id: companyId,
      primaryUserId,
      coverUserId,
      compatibilityScore: compatibilityScore || 0,
      coverableTasks: coverableTasks || [],
      maxCoverageHours: maxCoverageHours || null,
      maxConcurrentTasks: maxConcurrentTasks || 3,
      isActive: true,
      isAutoCalculated: false,
      lastCalculationDate: new Date(),
      manualNotes: manualNotes || null
    });

    // Cargar con datos de usuarios
    const ruleWithUsers = await TaskCompatibility.findByPk(rule.id, {
      include: [
        {
          model: User,
          as: 'primaryUser',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'coverUser',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: ruleWithUsers,
      message: 'Regla de compatibilidad creada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error creando regla de compatibilidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando regla de compatibilidad',
      error: error.message
    });
  }
});

// Actualizar regla de compatibilidad
router.put('/compatibility-matrix/:id', async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.body.company_id || 1;
    const { compatibilityScore, coverableTasks, maxCoverageHours, maxConcurrentTasks, manualNotes, isActive } = req.body;

    const rule = await TaskCompatibility.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Regla de compatibilidad no encontrada'
      });
    }

    // Actualizar campos
    if (compatibilityScore !== undefined) rule.compatibilityScore = compatibilityScore;
    if (coverableTasks !== undefined) rule.coverableTasks = coverableTasks;
    if (maxCoverageHours !== undefined) rule.maxCoverageHours = maxCoverageHours;
    if (maxConcurrentTasks !== undefined) rule.maxConcurrentTasks = maxConcurrentTasks;
    if (manualNotes !== undefined) rule.manualNotes = manualNotes;
    if (isActive !== undefined) rule.isActive = isActive;

    await rule.save();

    // Cargar con datos de usuarios
    const ruleWithUsers = await TaskCompatibility.findByPk(rule.id, {
      include: [
        {
          model: User,
          as: 'primaryUser',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'coverUser',
          attributes: ['user_id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      success: true,
      data: ruleWithUsers,
      message: 'Regla de compatibilidad actualizada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error actualizando regla:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando regla de compatibilidad',
      error: error.message
    });
  }
});

// Eliminar regla de compatibilidad
router.delete('/compatibility-matrix/:id', async (req, res) => {
  try {
    const companyId = req.user?.company_id || req.query.company_id || 1;

    const rule = await TaskCompatibility.findOne({
      where: {
        id: req.params.id,
        company_id: companyId
      }
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Regla de compatibilidad no encontrada'
      });
    }

    await rule.destroy();

    res.json({
      success: true,
      message: 'Regla de compatibilidad eliminada exitosamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando regla:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando regla de compatibilidad',
      error: error.message
    });
  }
});

// Calcular días de vacaciones para un empleado
router.get('/calculate-days/:userId', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const startDate = new Date(user.createdAt);
    const currentDate = new Date();
    const yearsOfService = (currentDate - startDate) / (365.25 * 24 * 60 * 60 * 1000);

    // Obtener escala aplicable
    const scales = await VacationScale.findAll({
      where: { isActive: true },
      order: [['yearsFrom', 'ASC']]
    });

    let vacationDays = 14;
    let applicableScale = null;

    for (const scale of scales) {
      if (yearsOfService >= scale.yearsFrom && (!scale.yearsTo || yearsOfService <= scale.yearsTo)) {
        vacationDays = scale.vacationDays;
        applicableScale = scale;
        break;
      }
    }

    // Calcular días usados este año
    const currentYear = currentDate.getFullYear();
    const usedDays = await VacationRequest.sum('totalDays', {
      where: {
        userId: req.params.userId,
        status: ['approved', 'active', 'completed'],
        startDate: {
          [Op.between]: [
            new Date(`${currentYear}-01-01`),
            new Date(`${currentYear}-12-31`)
          ]
        }
      }
    }) || 0;

    res.json({
      success: true,
      data: {
        userId: user.user_id,
        userName: user.name,
        yearsOfService: Math.round(yearsOfService * 100) / 100,
        applicableScale,
        totalVacationDays: vacationDays,
        usedDays,
        remainingDays: Math.max(0, vacationDays - usedDays),
        currentYear
      },
      message: 'Días de vacaciones calculados exitosamente'
    });
  } catch (error) {
    console.error('❌ Error calculando días:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculando días de vacaciones',
      error: error.message
    });
  }
});

// ======== FUNCIONES AUXILIARES PARA NOTIFICACIONES ========

// Enviar notificación de nueva solicitud de vacaciones
async function sendVacationRequestNotification(vacationRequest) {
  try {
    // Obtener datos completos del empleado y departamento
    const employee = await User.findByPk(vacationRequest.userId, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'supervisor_id']
        }
      ]
    });

    if (!employee) {
      console.error('[sendVacationRequestNotification] Empleado no encontrado');
      return;
    }

    // Obtener tipo de licencia si es extraordinaria
    let licenseTypeText = 'Vacaciones';
    if (vacationRequest.requestType === 'extraordinary' && vacationRequest.extraordinaryLicenseId) {
      const licenseType = await ExtraordinaryLicense.findByPk(vacationRequest.extraordinaryLicenseId);
      if (licenseType) {
        licenseTypeText = licenseType.type;
      }
    }

    // Determinar prioridad según días solicitados
    const priority = vacationRequest.totalDays > 14 ? 'high' :
                     vacationRequest.totalDays > 7 ? 'medium' : 'normal';

    console.log(`🔔 [VACATION] Generando notificación de solicitud: ${employee.firstName} ${employee.lastName} - ${vacationRequest.totalDays} días`);

    // 🔔 GENERAR NOTIFICACIÓN CON WORKFLOW AUTOMÁTICO
    // 🔌 PLUG & PLAY: Solo se envía si el módulo 'notifications-enterprise' está activo
    await useModuleIfAvailable(employee.company_id, 'notifications-enterprise', async () => {
      return await NotificationWorkflowService.createNotification({
        module: 'vacation',
        notificationType: 'vacation_request_approval',
        companyId: employee.company_id,
        category: 'approval_request',
        priority: priority,
        templateKey: 'vacation_request_approval',
        variables: {
          employee_name: `${employee.firstName} ${employee.lastName}`,
          employee_id: employee.employeeId || employee.user_id.substring(0, 8),
          department: employee.department?.name || 'Sin departamento',
          total_days: vacationRequest.totalDays,
          start_date: new Date(vacationRequest.startDate).toLocaleDateString('es-AR'),
          end_date: new Date(vacationRequest.endDate).toLocaleDateString('es-AR'),
          request_type: vacationRequest.requestType,
          license_type: licenseTypeText,
          reason: vacationRequest.reason || 'Sin motivo especificado',
          request_date: new Date().toLocaleDateString('es-AR')
        },
        relatedEntityType: 'vacation_request',
        relatedEntityId: vacationRequest.id,
      relatedUserId: employee.user_id,
      relatedDepartmentId: employee.department?.id,
      entity: {
        request_type: vacationRequest.requestType,
        total_days: vacationRequest.totalDays
      },
        sendEmail: vacationRequest.totalDays > 14, // Email si son más de 14 días
        metadata: {
          vacation_request_id: vacationRequest.id,
          request_type: vacationRequest.requestType,
          license_id: vacationRequest.extraordinaryLicenseId,
          auto_generated: true
        }
      });
    }, () => {
      // Fallback: Módulo no activo, solicitud guardada sin notificar
      console.log('⏭️  [VACATION] Módulo notificaciones no activo - Solicitud guardada sin notificar');
      return null;
    });

    console.log(`✅ [VACATION] Notificación generada para solicitud ${vacationRequest.id}`);

  } catch (error) {
    console.error('[sendVacationRequestNotification] Error:', error);
  }
}

// Enviar notificación de respuesta a solicitud de vacaciones
async function sendVacationResponseNotification(vacationRequest, approvedBy, status) {
  try {
    const employee = await User.findByPk(vacationRequest.userId, {
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!employee) {
      console.error('[sendVacationResponseNotification] Empleado no encontrado');
      return;
    }

    const approver = await User.findByPk(approvedBy);
    if (!approver) {
      console.error('[sendVacationResponseNotification] Aprobador no encontrado');
      return;
    }

    const statusText = status === 'approved' ? 'APROBADA' : 'RECHAZADA';

    console.log(`🔔 [VACATION] Generando notificación de respuesta: ${employee.firstName} ${employee.lastName} - ${statusText}`);

    // 🔔 GENERAR NOTIFICACIÓN INFORMATIVA (NO REQUIERE ACCIÓN)
    // 🔌 PLUG & PLAY: Solo se envía si el módulo 'notifications-enterprise' está activo
    await useModuleIfAvailable(employee.company_id, 'notifications-enterprise', async () => {
      return await NotificationWorkflowService.createNotification({
        module: 'vacation',
        notificationType: 'vacation_response',
        companyId: employee.company_id,
        category: 'informational',
        priority: 'high',
        templateKey: 'vacation_request_response',
        variables: {
          employee_name: `${employee.firstName} ${employee.lastName}`,
          employee_id: employee.employeeId || employee.user_id.substring(0, 8),
          status: statusText,
          status_color: status === 'approved' ? 'success' : 'danger',
          total_days: vacationRequest.totalDays,
          start_date: new Date(vacationRequest.startDate).toLocaleDateString('es-AR'),
          end_date: new Date(vacationRequest.endDate).toLocaleDateString('es-AR'),
          approver_name: `${approver.firstName} ${approver.lastName}`,
          approval_comments: vacationRequest.approvalComments || 'Sin comentarios',
          approval_date: new Date().toLocaleDateString('es-AR')
        },
        relatedEntityType: 'vacation_request',
        relatedEntityId: vacationRequest.id,
      relatedUserId: employee.user_id,
      relatedDepartmentId: employee.department?.id,
      recipientRole: 'employee', // Esta notificación va al empleado directamente
      recipientUserId: employee.user_id,
      entity: {
        status: status,
        total_days: vacationRequest.totalDays
      },
        sendEmail: true, // Siempre enviar email en respuestas
        metadata: {
          vacation_request_id: vacationRequest.id,
          approver_id: approvedBy,
          approval_date: new Date(),
          final_decision: status,
          auto_generated: true
        }
      });
    }, () => {
      // Fallback: Módulo no activo, respuesta registrada sin notificar
      console.log('⏭️  [VACATION] Módulo notificaciones no activo - Respuesta registrada sin notificar');
      return null;
    });

    console.log(`✅ [VACATION] Notificación de respuesta generada para solicitud ${vacationRequest.id}`);

  } catch (error) {
    console.error('[sendVacationResponseNotification] Error:', error);
  }
}

module.exports = router;