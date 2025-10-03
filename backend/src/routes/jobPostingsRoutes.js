const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult, param, query } = require('express-validator');
const { Op } = require('sequelize');

// Middleware de autenticación
const auth = require('../middleware/auth');

// Importar modelos desde database.js
const {
  User,
  Company,
  JobPosting,
  JobApplication,
  sequelize
} = require('../config/database');

// Configurar multer para subida de CVs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/cvs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `cv-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF, DOC y DOCX'));
    }
  }
});

// ============= ENDPOINTS PARA OFERTAS LABORALES =============

// GET /api/job-postings/offers - Obtener todas las ofertas
router.get('/offers', async (req, res) => {
  try {
    console.log('📋 [JOB-POSTINGS] Obteniendo ofertas laborales...');

    const { status, department, location, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Construir filtros
    const where = {
      isActive: true
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (department && department !== 'all') {
      where.department = department;
    }

    if (location && location !== 'all') {
      where.location = location;
    }

    // Mock data temporal hasta crear modelo JobPosting
    const mockOffers = [
      {
        id: 1,
        title: 'Desarrollador Full Stack',
        department: 'IT',
        location: 'Buenos Aires',
        type: 'full-time',
        status: 'active',
        description: 'Se busca desarrollador Full Stack con experiencia en Node.js y React.',
        requirements: 'Mínimo 2 años de experiencia, conocimientos en PostgreSQL',
        salary: '$80,000 - $120,000',
        postedDate: '2025-09-01',
        applications: 15,
        companyId: req.user?.companyId || 1
      },
      {
        id: 2,
        title: 'Analista de RRHH',
        department: 'RRHH',
        location: 'Córdoba',
        type: 'full-time',
        status: 'active',
        description: 'Analista para gestión de recursos humanos y procesos de selección.',
        requirements: 'Carrera en RRHH o afines, experiencia en selección',
        salary: '$60,000 - $90,000',
        postedDate: '2025-08-28',
        applications: 8,
        companyId: req.user?.companyId || 1
      },
      {
        id: 3,
        title: 'Técnico en Soporte',
        department: 'IT',
        location: 'Remoto',
        type: 'part-time',
        status: 'closed',
        description: 'Soporte técnico nivel 1 y 2 para sistemas empresariales.',
        requirements: 'Conocimientos en Windows, Linux, redes',
        salary: '$40,000 - $60,000',
        postedDate: '2025-08-15',
        applications: 25,
        companyId: req.user?.companyId || 1
      }
    ];

    // Filtrar mock data
    let filteredOffers = mockOffers;

    if (status && status !== 'all') {
      filteredOffers = filteredOffers.filter(offer => offer.status === status);
    }

    if (department && department !== 'all') {
      filteredOffers = filteredOffers.filter(offer => offer.department === department);
    }

    if (location && location !== 'all') {
      filteredOffers = filteredOffers.filter(offer => offer.location === location);
    }

    // Paginación
    const paginatedOffers = filteredOffers.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: paginatedOffers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredOffers.length,
        pages: Math.ceil(filteredOffers.length / limit)
      }
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo ofertas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/job-postings/offers - Crear nueva oferta
router.post('/offers', [
  body('title').notEmpty().withMessage('El título es requerido'),
  body('department').notEmpty().withMessage('El departamento es requerido'),
  body('description').notEmpty().withMessage('La descripción es requerida'),
  body('location').notEmpty().withMessage('La ubicación es requerida')
], async (req, res) => {
  try {
    console.log('➕ [JOB-POSTINGS] Creando nueva oferta laboral...');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const {
      title,
      department,
      location,
      type,
      description,
      requirements,
      salary,
      benefits,
      tags
    } = req.body;

    // Mock response - aquí se crearía en base de datos
    const newOffer = {
      id: Date.now(),
      title,
      department,
      location,
      type: type || 'full-time',
      status: 'active',
      description,
      requirements: requirements || '',
      salary: salary || '',
      benefits: benefits || '',
      tags: tags || [],
      postedDate: new Date().toISOString().split('T')[0],
      applications: 0,
      companyId: req.user?.companyId || 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('✅ [JOB-POSTINGS] Oferta creada exitosamente:', newOffer.id);

    res.status(201).json({
      success: true,
      data: newOffer,
      message: 'Oferta laboral creada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error creando oferta:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /api/job-postings/offers/:id - Actualizar oferta
router.put('/offers/:id', [
  param('id').isInt().withMessage('ID debe ser un número válido')
], async (req, res) => {
  try {
    console.log('📝 [JOB-POSTINGS] Actualizando oferta ID:', req.params.id);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Mock response - aquí se actualizaría en base de datos
    res.json({
      success: true,
      data: { id: parseInt(id), ...updateData, updatedAt: new Date() },
      message: 'Oferta actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error actualizando oferta:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// DELETE /api/job-postings/offers/:id - Eliminar oferta
router.delete('/offers/:id', [
  param('id').isInt().withMessage('ID debe ser un número válido')
], async (req, res) => {
  try {
    console.log('🗑️ [JOB-POSTINGS] Eliminando oferta ID:', req.params.id);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const { id } = req.params;

    // Mock response - aquí se eliminaría de base de datos
    res.json({
      success: true,
      message: 'Oferta eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error eliminando oferta:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// ============= ENDPOINTS PARA POSTULACIONES =============

// GET /api/job-postings/applications - Obtener postulaciones
router.get('/applications', async (req, res) => {
  try {
    console.log('👥 [JOB-POSTINGS] Obteniendo postulaciones...');

    const { jobId, status, page = 1, limit = 10 } = req.query;

    // Mock data temporal
    const mockApplications = [
      {
        id: 1,
        jobId: 1,
        jobTitle: 'Desarrollador Full Stack',
        candidateName: 'Juan Pérez',
        candidateEmail: 'juan.perez@email.com',
        candidatePhone: '+54 11 1234-5678',
        status: 'pending',
        appliedDate: '2025-09-10',
        cvFileName: 'cv-juan-perez.pdf',
        coverLetter: 'Me interesa mucho la posición...',
        experience: '3 años'
      },
      {
        id: 2,
        jobId: 1,
        jobTitle: 'Desarrollador Full Stack',
        candidateName: 'María García',
        candidateEmail: 'maria.garcia@email.com',
        candidatePhone: '+54 11 9876-5432',
        status: 'reviewed',
        appliedDate: '2025-09-08',
        cvFileName: 'cv-maria-garcia.pdf',
        coverLetter: 'Tengo experiencia en React y Node.js...',
        experience: '5 años'
      },
      {
        id: 3,
        jobId: 2,
        jobTitle: 'Analista de RRHH',
        candidateName: 'Carlos López',
        candidateEmail: 'carlos.lopez@email.com',
        candidatePhone: '+54 11 5555-4444',
        status: 'accepted',
        appliedDate: '2025-09-05',
        cvFileName: 'cv-carlos-lopez.pdf',
        coverLetter: 'Soy Licenciado en RRHH...',
        experience: '4 años'
      }
    ];

    let filteredApplications = mockApplications;

    if (jobId) {
      filteredApplications = filteredApplications.filter(app => app.jobId == jobId);
    }

    if (status && status !== 'all') {
      filteredApplications = filteredApplications.filter(app => app.status === status);
    }

    res.json({
      success: true,
      data: filteredApplications,
      total: filteredApplications.length
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo postulaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// POST /api/job-postings/applications - Crear postulación
router.post('/applications', upload.single('cv'), [
  body('jobId').isInt().withMessage('ID de trabajo debe ser un número válido'),
  body('candidateName').notEmpty().withMessage('El nombre es requerido'),
  body('candidateEmail').isEmail().withMessage('Email debe ser válido'),
  body('candidatePhone').notEmpty().withMessage('El teléfono es requerido')
], async (req, res) => {
  try {
    console.log('📝 [JOB-POSTINGS] Creando nueva postulación...');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const {
      jobId,
      candidateName,
      candidateEmail,
      candidatePhone,
      coverLetter,
      experience
    } = req.body;

    const cvFile = req.file;

    if (!cvFile) {
      return res.status(400).json({
        success: false,
        error: 'El CV es requerido'
      });
    }

    // Mock response - aquí se crearía en base de datos
    const newApplication = {
      id: Date.now(),
      jobId: parseInt(jobId),
      candidateName,
      candidateEmail,
      candidatePhone,
      status: 'pending',
      appliedDate: new Date().toISOString().split('T')[0],
      cvFileName: cvFile.filename,
      coverLetter: coverLetter || '',
      experience: experience || '',
      createdAt: new Date()
    };

    console.log('✅ [JOB-POSTINGS] Postulación creada exitosamente:', newApplication.id);

    res.status(201).json({
      success: true,
      data: newApplication,
      message: 'Postulación enviada exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error creando postulación:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// PUT /api/job-postings/applications/:id/status - Actualizar estado de postulación
router.put('/applications/:id/status', [
  param('id').isInt().withMessage('ID debe ser un número válido'),
  body('status').isIn(['pending', 'reviewed', 'accepted', 'rejected']).withMessage('Estado inválido')
], async (req, res) => {
  try {
    console.log('🔄 [JOB-POSTINGS] Actualizando estado postulación ID:', req.params.id);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    // Mock response - aquí se actualizaría en base de datos
    res.json({
      success: true,
      data: {
        id: parseInt(id),
        status,
        notes: notes || '',
        updatedAt: new Date()
      },
      message: 'Estado de postulación actualizado exitosamente'
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/job-postings/applications/:id/cv - Descargar CV
router.get('/applications/:id/cv', [
  param('id').isInt().withMessage('ID debe ser un número válido')
], async (req, res) => {
  try {
    console.log('📥 [JOB-POSTINGS] Descargando CV para postulación ID:', req.params.id);

    const { id } = req.params;

    // Mock - en implementación real se buscaría el archivo en base de datos
    const mockCvPath = path.join(__dirname, '../../uploads/cvs/cv-mock.pdf');

    if (fs.existsSync(mockCvPath)) {
      res.download(mockCvPath, `cv-postulacion-${id}.pdf`);
    } else {
      res.status(404).json({
        success: false,
        error: 'CV no encontrado'
      });
    }

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error descargando CV:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// ============= ENDPOINTS PARA ANALYTICS =============

// GET /api/job-postings/analytics - Obtener estadísticas
router.get('/analytics', async (req, res) => {
  try {
    console.log('📊 [JOB-POSTINGS] Obteniendo analytics...');

    // Mock analytics data
    const analytics = {
      totalOffers: 25,
      activeOffers: 18,
      totalApplications: 156,
      pendingApplications: 45,
      acceptedApplications: 23,
      rejectedApplications: 88,
      averageApplicationsPerOffer: 6.2,
      topDepartments: [
        { name: 'IT', offers: 8, applications: 67 },
        { name: 'Ventas', offers: 5, applications: 34 },
        { name: 'RRHH', offers: 3, applications: 21 },
        { name: 'Marketing', offers: 4, applications: 19 },
        { name: 'Finanzas', offers: 5, applications: 15 }
      ],
      applicationTrends: [
        { month: 'Jul', applications: 42 },
        { month: 'Ago', applications: 58 },
        { month: 'Sep', applications: 56 }
      ],
      conversionRate: 14.7 // (accepted / total) * 100
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ [JOB-POSTINGS] Error obteniendo analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;