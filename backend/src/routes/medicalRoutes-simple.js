const express = require('express');
const router = express.Router();

// Mock auth middleware simple
const auth = (req, res, next) => {
  req.user = { id: 'admin', role: 'admin', companyId: 'test' };
  next();
};

// Ruta básica para comprobar que el módulo médico funciona
router.get('/health', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Módulo médico funcionando',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error en health médico:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener certificados médicos del usuario
router.get('/certificates', auth, async (req, res) => {
  try {
    const { MedicalCertificate } = require('../config/database');
    
    const certificates = await MedicalCertificate.findAll({
      where: { userId: req.user.user_id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    console.error('Error obteniendo certificados:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Crear certificado médico básico
router.post('/certificates', auth, async (req, res) => {
  try {
    const { MedicalCertificate } = require('../config/database');
    
    const certificateData = {
      ...req.body,
      userId: req.user.user_id,
      status: 'pending'
    };

    const certificate = await MedicalCertificate.create(certificateData);

    res.status(201).json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Error creando certificado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Rutas adicionales que necesita admin-simple.html

// Mock data
const mockData = {
  certificates: [
    { id: '1', userId: 'user1', symptoms: 'Gripe', status: 'pending', requestedDays: 3, createdAt: new Date() },
    { id: '2', userId: 'user2', symptoms: 'Fiebre', status: 'approved', requestedDays: 5, createdAt: new Date() }
  ],
  employees: [
    { id: 'user1', firstName: 'Juan', lastName: 'Pérez', dni: '12345678' },
    { id: 'user2', firstName: 'María', lastName: 'González', dni: '87654321' }
  ]
};

// Estadísticas médicas
router.get('/statistics', auth, async (req, res) => {
  res.json({
    success: true,
    data: {
      totalCertificates: mockData.certificates.length,
      pendingCertificates: mockData.certificates.filter(c => c.status === 'pending').length,
      approvedCertificates: mockData.certificates.filter(c => c.status === 'approved').length,
      totalEmployees: mockData.employees.length
    }
  });
});

// Empleados con registros médicos
router.get('/employees-with-records', auth, async (req, res) => {
  const { employeeId } = req.query;
  
  if (employeeId) {
    const employee = mockData.employees.find(emp => emp.id === employeeId);
    res.json({
      success: true,
      data: employee || null
    });
  } else {
    res.json({
      success: true,
      data: mockData.employees
    });
  }
});

// Solicitudes de fotos
router.get('/photo-requests', auth, async (req, res) => {
  res.json({
    success: true,
    data: [{ id: '1', userId: 'user1', status: 'pending', type: 'profile' }]
  });
});

router.post('/photo-requests', auth, async (req, res) => {
  res.json({ success: true, message: 'Solicitud de foto enviada' });
});

// Solicitudes de estudios
router.get('/study-requests', auth, async (req, res) => {
  res.json({
    success: true,
    data: [{ id: '1', userId: 'user1', studyType: 'Sangre', status: 'pending' }]
  });
});

router.post('/study-requests', auth, async (req, res) => {
  res.json({ success: true, message: 'Solicitud de estudio enviada' });
});

// Solicitudes de recetas
router.post('/recipe-requests', auth, async (req, res) => {
  res.json({ success: true, message: 'Solicitud de receta enviada' });
});

// Notificaciones
router.get('/notifications', auth, async (req, res) => {
  res.json({
    success: true,
    data: [{ id: '1', message: 'Test notification', type: 'info' }]
  });
});

router.post('/notifications', auth, async (req, res) => {
  res.json({ success: true, message: 'Notificación enviada' });
});

// WhatsApp
router.post('/whatsapp', auth, async (req, res) => {
  res.json({ success: true, message: 'Mensaje WhatsApp enviado' });
});

// Revisión de certificados
router.put('/certificates/:id/review', auth, async (req, res) => {
  res.json({ success: true, message: 'Certificado revisado' });
});

router.post('/certificates/:id/request-info', auth, async (req, res) => {
  res.json({ success: true, message: 'Información solicitada' });
});

// Documentos de empleados
router.get('/employee-documents/:employeeId/:documentType', auth, async (req, res) => {
  res.json({ success: true, data: { documents: [] } });
});

router.get('/employee-timeline/:employeeId', auth, async (req, res) => {
  res.json({ success: true, data: [] });
});

// Solicitudes pendientes
router.get('/pending-requests/:employeeId', auth, async (req, res) => {
  res.json({ success: true, data: [] });
});

router.put('/pending-requests/:requestId/status', auth, async (req, res) => {
  res.json({ success: true, message: 'Estado actualizado' });
});

// Solicitudes automáticas
router.post('/request-document-auto', auth, async (req, res) => {
  res.json({ success: true, message: 'Documento solicitado' });
});

router.post('/request-document-update', auth, async (req, res) => {
  res.json({ success: true, message: 'Actualización solicitada' });
});

// Rutas de empleados específicos
router.get('/employee-requests/:employeeId', auth, async (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/update-request-status', auth, async (req, res) => {
  res.json({ success: true, message: 'Estado actualizado' });
});

// Crear rutas de admin que necesita la página
const adminRouter = express.Router();

// Estadísticas RRHH
adminRouter.get('/statistics/hr-cube', auth, async (req, res) => {
  res.json({
    success: true,
    data: {
      totalEmployees: 120,
      totalAbsences: 45,
      totalDaysAbsent: 180,
      averageAbsenceDuration: 4,
      workRelatedCases: 8,
      accidentCases: 3,
      occupationalDiseases: 2,
      employeeBreakdown: [
        { userId: 'user1', employeeName: 'Juan Pérez', totalAbsences: 5, totalDaysAbsent: 15, riskLevel: 'low' },
        { userId: 'user2', employeeName: 'María González', totalAbsences: 8, totalDaysAbsent: 25, riskLevel: 'medium' }
      ],
      diagnosisDistribution: {
        'Gripe': 15,
        'Gastroenteritis': 8,
        'Dolor de espalda': 12
      },
      monthlyTrends: {
        '2025-01': { certificates: 12, episodes: 8, totalDays: 35, employees: 15 },
        '2024-12': { certificates: 10, episodes: 6, totalDays: 28, employees: 12 }
      }
    }
  });
});

// Configuración médica
adminRouter.get('/medical-config', auth, async (req, res) => {
  res.json({
    success: true,
    data: {
      toleranceMinutes: 10,
      maxOvertimeHours: 3,
      requireApproval: true,
      notifications: true
    }
  });
});

adminRouter.post('/medical-config', auth, async (req, res) => {
  res.json({ success: true, message: 'Configuración médica actualizada' });
});

// Configuración ART
adminRouter.get('/art-config', auth, async (req, res) => {
  res.json({
    success: true,
    data: {
      artNumber: '12345',
      contactPhone: '123456789',
      emergencyProtocol: true
    }
  });
});

adminRouter.post('/art-config', auth, async (req, res) => {
  res.json({ success: true, message: 'Configuración ART actualizada' });
});

// Cuestionarios
adminRouter.get('/questionnaires', auth, async (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', title: 'Cuestionario de salud general', questions: 5, active: true }
    ]
  });
});

adminRouter.post('/questionnaires', auth, async (req, res) => {
  res.json({ success: true, message: 'Cuestionario creado' });
});

// Endpoint para contar registros biométricos
router.get('/biometric-count', auth, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');

    // Consultar cantidad de templates biométricos
    const result = await sequelize.query(
      'SELECT COUNT(*) as total FROM biometric_templates WHERE company_id = 11',
      { type: sequelize.QueryTypes.SELECT }
    );

    const total = result[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalRegistros: parseInt(total),
        tabla: 'biometric_templates',
        empresa: 11,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error contando registros biométricos:', error);
    res.status(500).json({
      success: false,
      error: 'Error consultando base de datos',
      details: error.message
    });
  }
});

// Endpoint para listar usuarios de la empresa ISI
router.get('/users-isi', auth, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');

    // Consultar usuarios de la empresa ISI (company_id = 11)
    const users = await sequelize.query(`
      SELECT
        u.user_id as id,
        u."employeeId",
        u."firstName",
        u."lastName",
        u.email,
        u.phone,
        u.role,
        u.company_id,
        u.is_active,
        u."createdAt",
        bt.id as template_id,
        bt.created_at as biometric_registered
      FROM users u
      LEFT JOIN biometric_templates bt ON u.user_id::text = bt.employee_id AND bt.company_id = u.company_id
      WHERE u.company_id = 11 AND u.is_active = true
      ORDER BY u."firstName", u."lastName"
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        empresa: 'ISI (company_id: 11)',
        totalUsuarios: users.length,
        usuarios: users.map(user => ({
          id: user.id,
          employeeId: user.employeeId,
          nombre: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          tieneBiometrico: !!user.template_id,
          fechaRegistroBiometrico: user.biometric_registered,
          createdAt: user.createdAt
        })),
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error consultando usuarios ISI:', error);
    res.status(500).json({
      success: false,
      error: 'Error consultando base de datos',
      details: error.message
    });
  }
});

module.exports = { medicalRouter: router, adminRouter };